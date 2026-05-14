/**
 * useLiveMeter — real-time taxi meter hook
 *
 * ── Native (Android / iOS) ───────────────────────────────────────────────────
 *
 *   startLocationUpdatesAsync + Foreground Service (Android) / Background
 *   Location (iOS) is the ONLY GPS subscription on native.  This single
 *   subscription works in foreground AND background / screen-locked.
 *
 *   The background task (tasks/locationTask.ts) receives every GPS fix,
 *   accumulates distance in AsyncStorage, and keeps the persistent
 *   notification up-to-date.
 *
 *   The UI reads distance from AsyncStorage every second so the meter stays
 *   live while the app is visible.  The timer uses Date.now() − startTime so
 *   it is immune to JS-thread throttling regardless of app state.
 *
 * ── Web / PWA ────────────────────────────────────────────────────────────────
 *
 *   • Screen Wake Lock — prevents the display from sleeping, keeping the
 *     browser tab fully alive and GPS polling uninterrupted.
 *   • navigator.geolocation.watchPosition — standard browser GPS.
 *   • Date.now() wall-clock timer — immune to setInterval throttling.
 *   • localStorage persistence — trip survives a page refresh.
 *   • Web Notification — shown when the tab goes to background.
 *
 *   Note: browsers cannot access GPS when the tab is hidden (screen locked /
 *   app minimised).  The Wake Lock above is the best available mitigation.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import {
  calculateFare,
  detectTariff,
  type FareResult,
  type TariffType,
  type VehicleType,
} from "@/constants/tariff";
import {
  LOCATION_TASK_NAME,
  TRIP_STORAGE_KEY,
  dismissLiveNotification,
  updateLiveNotification,
} from "@/tasks/locationTask";
import { useKeepAliveAudio } from "@/hooks/useKeepAliveAudio";

// ── Haversine distance (web only — native uses the background task) ───────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Trip persistence ──────────────────────────────────────────────────────────
interface PersistedTrip {
  startTime: number;
  distanceKm: number;
  tariff: TariffType;
  vehicle: VehicleType;
}

function persistTripWeb(d: PersistedTrip): void {
  try {
    if (typeof localStorage !== "undefined")
      localStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(d));
  } catch { /* storage unavailable */ }
}

async function persistTripNative(d: PersistedTrip): Promise<void> {
  try { await AsyncStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(d)); }
  catch { /* ignore */ }
}

function loadPersistedTripWeb(): PersistedTrip | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(TRIP_STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as PersistedTrip;
    if (Date.now() - d.startTime > 12 * 3600 * 1000) {
      localStorage.removeItem(TRIP_STORAGE_KEY);
      return null;
    }
    return d;
  } catch { return null; }
}

function clearTripWeb(): void {
  try { if (typeof localStorage !== "undefined") localStorage.removeItem(TRIP_STORAGE_KEY); }
  catch {}
}

async function clearTripNative(): Promise<void> {
  try { await AsyncStorage.removeItem(TRIP_STORAGE_KEY); } catch {}
}

// ── Wake Lock sentinel (web only) ─────────────────────────────────────────────
interface WakeLockSentinel {
  readonly released: boolean;
  release(): Promise<void>;
}

// ── Web background notification ───────────────────────────────────────────────
function showWebTripNotification(distanceKm: number, elapsedMs: number): Notification | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  if (Notification.permission !== "granted") return null;
  const s = Math.floor(elapsedMs / 1000);
  const time = `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  try {
    return new Notification("Taxi Meter Pro — נסיעה פעילה 🚕", {
      body: `${distanceKm.toFixed(2)} ק"מ · ${time} · לחץ/י לחזרה לאפליקציה`,
      tag: "moniton-active-trip",
      silent: true,
    });
  } catch { return null; }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export type MeterStatus = "idle" | "running" | "stopped";

export function useLiveMeter() {
  const [status, setStatus] = useState<MeterStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [fare, setFare] = useState<FareResult | null>(null);
  const [tariff, setTariff] = useState<TariffType>(() => detectTariff(new Date()));
  const [vehicle, setVehicle] = useState<VehicleType>("regular");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // ── Silent audio keepalive (web only) ─────────────────────────────────────
  const { startAudio, stopAudio } = useKeepAliveAudio();

  const startTimeRef = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const elapsedRef = useRef(0);
  const tariffRef = useRef<TariffType>(tariff);
  const vehicleRef = useRef<VehicleType>(vehicle);
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null);  // web only
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);                          // web only
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const webNotifRef = useRef<Notification | null>(null);
  const statusRef = useRef<MeterStatus>("idle");
  const lastNotifUpdateRef = useRef<number>(0);

  useEffect(() => { tariffRef.current = tariff; }, [tariff]);
  useEffect(() => { vehicleRef.current = vehicle; }, [vehicle]);
  useEffect(() => { statusRef.current = status; }, [status]);

  // ── Wake Lock (web only) ──────────────────────────────────────────────────
  const acquireWakeLock = useCallback(async () => {
    if (Platform.OS !== "web") return;
    try {
      const nav = navigator as typeof navigator & {
        wakeLock?: { request(type: "screen"): Promise<WakeLockSentinel> };
      };
      if (!nav.wakeLock) return;
      const sentinel = await nav.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
    } catch { setWakeLockActive(false); }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    setWakeLockActive(false);
    if (sentinel && !sentinel.released) {
      try { await sentinel.release(); } catch {}
    }
  }, []);

  // ── Page-visibility handler (web only) ───────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handle = async () => {
      if (document.visibilityState === "visible") {
        webNotifRef.current?.close();
        webNotifRef.current = null;
        if (statusRef.current === "running") await acquireWakeLock();
      } else {
        setWakeLockActive(false);
        if (statusRef.current === "running") {
          webNotifRef.current?.close();
          webNotifRef.current = showWebTripNotification(distanceRef.current, elapsedRef.current);
        }
      }
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, [acquireWakeLock]);

  // ── Request Web Notification permission once on mount ────────────────────
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  // ── Native notification handler (suppresses alerts while app is open) ────
  useEffect(() => {
    if (Platform.OS === "web") return;
    const setup = async () => {
      const Notifications = await import("expo-notifications");
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        }),
      });
    };
    void setup();
  }, []);

  // ── Web GPS (watchPosition) ───────────────────────────────────────────────
  const startWebGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("GPS לא זמין בדפדפן זה");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const prev = lastPosRef.current;
        if (prev) {
          const d = haversineKm(prev.lat, prev.lon, latitude, longitude);
          if (d > 0.002 && d < 0.3) {
            distanceRef.current += d;
            setDistanceKm(distanceRef.current);
            if (startTimeRef.current) {
              persistTripWeb({
                startTime: startTimeRef.current,
                distanceKm: distanceRef.current,
                tariff: tariffRef.current,
                vehicle: vehicleRef.current,
              });
            }
          }
        }
        lastPosRef.current = { lat: latitude, lon: longitude };
      },
      () => setGpsError("שגיאת GPS — מרחק מחושב ב-0"),
      { enableHighAccuracy: true, maximumAge: 0 },
    );
  }, []);

  const stopWebGps = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // ── Native foreground service ─────────────────────────────────────────────
  // startLocationUpdatesAsync registers a Foreground Service on Android and
  // a Background Location task on iOS.  It handles ALL location events
  // (foreground and background) through the background task, which writes
  // distance to AsyncStorage.  The UI reads from AsyncStorage every second.
  // watchPositionAsync is intentionally NOT used on native to avoid
  // double-counting the same GPS events in two separate subscriptions.
  const startForegroundService = useCallback(async () => {
    try {
      const Location = await import("expo-location");
      const Notifications = await import("expo-notifications");

      // 1. Foreground permission (required before anything else)
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== "granted") {
        setGpsError("הרשאת מיקום נדחתה");
        return;
      }

      // 2. Background / always permission (advisory — continue even if denied)
      try { await Location.requestBackgroundPermissionsAsync(); } catch {}

      // 3. Notification permission for live updates
      await Notifications.requestPermissionsAsync();

      // 4. Android notification channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("trip-live", {
          name: "נסיעה פעילה",
          importance: Notifications.AndroidImportance.LOW,
          vibrationPattern: [],
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          enableLights: false,
          enableVibrate: false,
          showBadge: false,
        });
      }

      // 5. Stop any leftover instance from a previous trip / JS reload
      const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
      if (alreadyRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      // 6. Start the background location task / foreground service
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,      // fire at most every 2 s
        distanceInterval: 3,     // fire only when moved ≥ 3 m
        // Android: creates a Foreground Service that the OS cannot kill
        foregroundService: {
          notificationTitle: "Taxi Meter Pro — נסיעה פעילה",
          notificationBody: "GPS ומונה פועלים · לחץ לחזרה לאפליקציה",
          notificationColor: "#FFD60A",
          killServiceOnDestroy: false,
        },
        // iOS: background location with automotive activity type
        activityType: Location.ActivityType.AutomotiveNavigation,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      });
    } catch {
      setGpsError("שגיאת GPS — אנא בדוק הרשאות");
    }
  }, []);

  const stopForegroundService = useCallback(async () => {
    try {
      const Location = await import("expo-location");
      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
      if (isRunning) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    } catch { /* ignore */ }
    await dismissLiveNotification();
  }, []);

  // ── AsyncStorage → UI sync (native, every 1 s) ────────────────────────────
  // The background task is the single source of distance truth on native.
  // We read from AsyncStorage every second so the foreground UI stays current.
  useEffect(() => {
    if (Platform.OS === "web") return;

    const syncInterval = setInterval(async () => {
      if (statusRef.current !== "running") return;
      try {
        const raw = await AsyncStorage.getItem(TRIP_STORAGE_KEY);
        if (!raw) return;
        const trip = JSON.parse(raw) as PersistedTrip;
        if (!trip.startTime) return;
        // Always sync — background task is the sole writer on native
        if (trip.distanceKm !== distanceRef.current) {
          distanceRef.current = trip.distanceKm;
          setDistanceKm(trip.distanceKm);
        }
      } catch { /* ignore */ }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, []);

  // ── Restore an interrupted trip on mount (web) ────────────────────────────
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const saved = loadPersistedTripWeb();
    if (!saved) return;

    startTimeRef.current = saved.startTime;
    distanceRef.current = saved.distanceKm;
    lastPosRef.current = null;

    const initialElapsed = Date.now() - saved.startTime;
    elapsedRef.current = initialElapsed;
    tariffRef.current = saved.tariff;
    vehicleRef.current = saved.vehicle;

    setTariff(saved.tariff);
    setVehicle(saved.vehicle);
    setElapsedMs(initialElapsed);
    setDistanceKm(saved.distanceKm);
    setFare(calculateFare(saved.distanceKm, initialElapsed / 60000, saved.tariff, saved.vehicle, false));
    setStatus("running");
    statusRef.current = "running";
    setGpsError(null);

    intervalRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      elapsedRef.current = elapsed;
      setElapsedMs(elapsed);
      setFare(calculateFare(distanceRef.current, elapsed / 60000, tariffRef.current, vehicleRef.current, false));
    }, 1000);

    startWebGps();
    // NOTE: startAudio() is intentionally NOT called here — this useEffect runs
    // on mount (no user gesture), so audio.play() would be blocked by the browser.
    // Audio starts the next time the user explicitly taps the meter start button.
    void acquireWakeLock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Restore an interrupted trip on mount (native) ─────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") return;

    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(TRIP_STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as PersistedTrip;
        if (!saved.startTime) return;
        if (Date.now() - saved.startTime > 12 * 3600 * 1000) {
          await clearTripNative();
          return;
        }

        startTimeRef.current = saved.startTime;
        distanceRef.current = saved.distanceKm;
        const initialElapsed = Date.now() - saved.startTime;
        elapsedRef.current = initialElapsed;
        tariffRef.current = saved.tariff;
        vehicleRef.current = saved.vehicle;

        setTariff(saved.tariff);
        setVehicle(saved.vehicle);
        setElapsedMs(initialElapsed);
        setDistanceKm(saved.distanceKm);
        setFare(calculateFare(saved.distanceKm, initialElapsed / 60000, saved.tariff, saved.vehicle, false));
        setStatus("running");
        statusRef.current = "running";
        setGpsError(null);

        intervalRef.current = setInterval(() => {
          if (!startTimeRef.current) return;
          const elapsed = Date.now() - startTimeRef.current;
          elapsedRef.current = elapsed;
          setElapsedMs(elapsed);
          setFare(calculateFare(distanceRef.current, elapsed / 60000, tariffRef.current, vehicleRef.current, false));
        }, 1000);

        await startForegroundService();
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Start ─────────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    const now = Date.now();
    const autoTariff = detectTariff(new Date());

    tariffRef.current = autoTariff;
    startTimeRef.current = now;
    distanceRef.current = 0;
    elapsedRef.current = 0;
    lastPosRef.current = null;

    setTariff(autoTariff);
    setElapsedMs(0);
    setDistanceKm(0);
    setGpsError(null);
    setFare(calculateFare(0, 0, autoTariff, vehicleRef.current, false));
    setStatus("running");
    statusRef.current = "running";
    lastNotifUpdateRef.current = 0;

    // Persist initial state — background task reads this to know a trip is active
    const tripData = {
      startTime: now,
      distanceKm: 0,
      tariff: autoTariff,
      vehicle: vehicleRef.current,
    };
    if (Platform.OS === "web") {
      persistTripWeb(tripData);
    } else {
      void persistTripNative(tripData);
    }

    // Clock interval — wall-clock diff so background throttling has zero effect
    intervalRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      elapsedRef.current = elapsed;
      setElapsedMs(elapsed);
      setFare(calculateFare(distanceRef.current, elapsed / 60000, tariffRef.current, vehicleRef.current, false));

      // Push a notification update every 5 s on native (background task also does this)
      if (Platform.OS !== "web" && elapsed - lastNotifUpdateRef.current >= 5000) {
        lastNotifUpdateRef.current = elapsed;
        void updateLiveNotification(distanceRef.current, elapsed, tariffRef.current, vehicleRef.current);
      }
    }, 1000);

    if (Platform.OS === "web") {
      startWebGps();
      startAudio();
      void acquireWakeLock();
    } else {
      // Native: all GPS handled by the foreground service / background task
      void startForegroundService();
    }
  }, [startWebGps, acquireWakeLock, startForegroundService, startAudio]);

  // ── Stop ──────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    if (Platform.OS === "web") {
      stopWebGps();
      stopAudio();
      void releaseWakeLock();
      webNotifRef.current?.close();
      webNotifRef.current = null;
      clearTripWeb();
    } else {
      void stopForegroundService();
      void clearTripNative();
    }

    const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    setElapsedMs(elapsed);
    setFare(calculateFare(distanceRef.current, elapsed / 60000, tariffRef.current, vehicleRef.current, false));
    setStatus("stopped");
    statusRef.current = "stopped";
  }, [stopWebGps, releaseWakeLock, stopForegroundService, stopAudio]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    if (Platform.OS === "web") {
      stopWebGps();
      stopAudio();
      void releaseWakeLock();
      webNotifRef.current?.close();
      webNotifRef.current = null;
      clearTripWeb();
    } else {
      void stopForegroundService();
      void clearTripNative();
    }

    startTimeRef.current = null;
    distanceRef.current = 0;
    elapsedRef.current = 0;
    lastPosRef.current = null;

    setStatus("idle");
    statusRef.current = "idle";
    setElapsedMs(0);
    setDistanceKm(0);
    setFare(null);
    setGpsError(null);
  }, [stopWebGps, releaseWakeLock, stopForegroundService, stopAudio]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (Platform.OS === "web") {
        stopWebGps();
        stopAudio();
        void releaseWakeLock();
        webNotifRef.current?.close();
      }
      // Do NOT stop the foreground service on unmount — the meter screen
      // unmounting while a trip is running (e.g. user navigates to another tab)
      // should not kill the GPS.  The service only stops when stop() is called.
    };
  }, [stopWebGps, releaseWakeLock, stopAudio]);

  return {
    status,
    elapsedMs,
    distanceKm,
    fare,
    tariff,
    vehicle,
    gpsError,
    wakeLockActive,
    setTariff,
    setVehicle,
    start,
    stop,
    reset,
  };
}
