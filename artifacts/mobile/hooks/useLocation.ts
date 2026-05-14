/**
 * useLocation — GPS + Google Reverse Geocoding
 *
 * Calls the server-side /api/places/reverse endpoint (Google Geocoding API)
 * to resolve the current GPS coordinates into an exact street address with
 * house number: "[Street] [Number], [City]"
 *
 * Falls back to LocationIQ if the server proxy is unavailable.
 */
import * as Location from "expo-location";
import { Platform } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LangCode } from "@/constants/translations";

export interface LocationResult {
  coords: { latitude: number; longitude: number };
  address: string;
}

const API_BASE = "/api";

// ── Google Reverse Geocoding via server proxy ─────────────────────────────────
async function googleReverse(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/places/reverse?lat=${lat}&lon=${lon}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { label?: string; error?: string };
    return data.label ?? null;
  } catch {
    return null;
  }
}

// ── LocationIQ fallback ───────────────────────────────────────────────────────
const LOCATIONIQ_KEY =
  process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY || "pk.5b5f543666d98c21a4f0b2f9f1090538";

async function locationIQReverse(lat: number, lon: number): Promise<string | null> {
  try {
    const url =
      `https://us1.locationiq.com/v1/reverse` +
      `?key=${LOCATIONIQ_KEY}` +
      `&lat=${lat}&lon=${lon}` +
      `&format=json` +
      `&accept-language=he` +
      `&addressdetails=1` +
      `&zoom=18`;

    const res = await fetch(url, { headers: { "User-Agent": "Moniton-App/1.0" } });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      address?: {
        road?: string;
        pedestrian?: string;
        house_number?: string;
        building?: string;
        city?: string;
        town?: string;
        village?: string;
      };
    };

    const addr = data.address ?? {};
    const street = addr.road ?? addr.pedestrian ?? "";
    const number = addr.house_number ?? addr.building ?? "";
    const city = addr.city ?? addr.town ?? addr.village ?? "";
    const streetPart = number ? `${street} ${number}` : street;
    return streetPart ? `${streetPart}, ${city}` : city || null;
  } catch {
    return null;
  }
}

// ── Main reverse geocode ──────────────────────────────────────────────────────
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  // Primary: Google Reverse Geocoding (exact street + house number)
  const google = await googleReverse(lat, lon);
  if (google) return google;

  // Fallback: LocationIQ
  const liq = await locationIQReverse(lat, lon);
  if (liq) return liq;

  // Last resort: raw coordinates
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useLocation(_lang: LangCode = "he") {
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const handleCoords = useCallback(async (lat: number, lon: number) => {
    coordsRef.current = { latitude: lat, longitude: lon };
    const address = await reverseGeocode(lat, lon);
    setLocation({ coords: { latitude: lat, longitude: lon }, address });
  }, []);

  const fetchLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    if (Platform.OS === "web") {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setError("לא ניתן לאתר מיקום");
        setLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await handleCoords(pos.coords.latitude, pos.coords.longitude);
          setLoading(false);
        },
        () => { setError("לא ניתן לאתר מיקום"); setLoading(false); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
      );
    } else {
      void (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            setError("הרשאת מיקום נדחתה");
            return;
          }
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          });
          await handleCoords(pos.coords.latitude, pos.coords.longitude);
        } catch {
          setError("לא ניתן לאתר מיקום");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [handleCoords]);

  // Fetch once on mount
  useEffect(() => {
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { location, loading, error, refetch: fetchLocation };
}
