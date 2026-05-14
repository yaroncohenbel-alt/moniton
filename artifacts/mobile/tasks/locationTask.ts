/**
 * locationTask — Expo background location task
 *
 * MUST be imported at the app root (_layout.tsx) so the task is registered
 * before the OS ever tries to launch it.
 *
 * Responsibilities:
 *   1. Receive GPS fixes while the app is backgrounded OR screen-locked
 *   2. Accumulate trip distance in AsyncStorage (single source of truth)
 *   3. Update the persistent foreground-service notification with live fare
 *
 * Platform note:
 *   expo-task-manager is a native-only package.  The defineTask() call is
 *   wrapped in a Platform.OS check so it is a strict no-op on web.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import {
  calculateFare,
  type TariffType,
  type VehicleType,
} from "@/constants/tariff";

// ── Shared constants ──────────────────────────────────────────────────────────
/** Task name — must match exactly between defineTask and startLocationUpdatesAsync */
export const LOCATION_TASK_NAME = "moniton-bg-location";

/** AsyncStorage key — single source of truth for trip state on native */
export const TRIP_STORAGE_KEY = "moniton_trip_v1";

/** Stable notification id so updates replace the previous notification */
export const LIVE_NOTIF_ID = "moniton-live-trip";

// ── In-memory last position (alive as long as JS context is alive) ────────────
let bgLastLat: number | null = null;
let bgLastLon: number | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ── Notification helpers — safe to call from hook or background task ───────────
export async function updateLiveNotification(
  distanceKm: number,
  elapsedMs: number,
  tariff: TariffType,
  vehicle: VehicleType,
): Promise<void> {
  try {
    const fare = calculateFare(distanceKm, elapsedMs / 60000, tariff, vehicle, false);
    const time = formatTime(elapsedMs);
    await Notifications.scheduleNotificationAsync({
      identifier: LIVE_NOTIF_ID,
      content: {
        title: `🚕 מוניטון — ₪${fare.total.toFixed(2)}`,
        body: `${distanceKm.toFixed(2)} ק"מ · ${time} · לחץ לחזרה לאפליקציה`,
        sticky: true,
        data: {},
      },
      trigger: null,
    });
  } catch { /* never crash the caller */ }
}

export async function dismissLiveNotification(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(LIVE_NOTIF_ID);
  } catch { /* ignore */ }
}

// ── Background task — native only ─────────────────────────────────────────────
// expo-task-manager is not available on web; the Platform guard is mandatory.
if (Platform.OS !== "web") {
  TaskManager.defineTask(
    LOCATION_TASK_NAME,
    async ({
      data,
      error,
    }: TaskManager.TaskManagerTaskBody<{
      locations: Location.LocationObject[];
    }>) => {
      if (error) return;

      const locations = (data as { locations: Location.LocationObject[] })?.locations;
      if (!locations?.length) return;

      // Use the most recent fix from the batch
      const loc = locations[locations.length - 1];
      const { latitude, longitude } = loc.coords;

      try {
        // Read shared trip state from AsyncStorage
        const raw = await AsyncStorage.getItem(TRIP_STORAGE_KEY);
        if (!raw) {
          // No active trip — reset in-memory position so we don't carry stale coords
          bgLastLat = null;
          bgLastLon = null;
          return;
        }

        const trip = JSON.parse(raw) as {
          startTime: number;
          distanceKm: number;
          tariff: TariffType;
          vehicle: VehicleType;
        };

        if (!trip.startTime) return;

        // ── Accumulate distance ─────────────────────────────────────────────
        if (bgLastLat !== null && bgLastLon !== null) {
          const d = haversineKm(bgLastLat, bgLastLon, latitude, longitude);
          // Reject GPS noise (<2 m) and teleport spikes (>300 m in one fix)
          if (d > 0.002 && d < 0.3) {
            trip.distanceKm += d;
            await AsyncStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(trip));
          }
        }
        bgLastLat = latitude;
        bgLastLon = longitude;

        // ── Update live notification ────────────────────────────────────────
        const elapsedMs = Date.now() - trip.startTime;
        await updateLiveNotification(
          trip.distanceKm,
          elapsedMs,
          trip.tariff,
          trip.vehicle,
        );
      } catch { /* never crash the background task */ }
    },
  );
}
