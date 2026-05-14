import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = "/api";

// ── Address shape (minimal — only what we use) ────────────────────────────────
export interface PlaceAddress {
  road?: string;
  house_number?: string;
  city?: string;
}

// ── Suggestion returned to the UI ─────────────────────────────────────────────
export interface AddressSuggestion {
  /** Unique stable key for FlatList */
  place_id: string;
  /** Line 1: street + number, e.g. "שפירא 5" */
  short_name: string;
  /** Line 2: city + country, e.g. "רמת גן, ישראל" */
  secondary_text: string;
  /** Google Places place_id — used to fetch coordinates on selection */
  googlePlaceId: string;
  /** Session token passed to /api/places/details (billing grouping) */
  sessionToken: string;
}

// ── Resolved coordinates (returned by resolveGoogleCoords) ───────────────────
export interface ResolvedPlace {
  latitude: number;
  longitude: number;
  /** Display label to show in the input field after selection */
  label: string;
  address: PlaceAddress;
}

// ── Simple UUID ───────────────────────────────────────────────────────────────
function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────
/**
 * Address autocomplete using ONLY Google Places Autocomplete.
 * - Restricted to Israel: components=country:il
 * - Hebrew results: language=he
 * - Address type: includes house numbers
 * - Coordinates resolved via Places Details only on selection
 */
export function useAddressSearch(
  coords?: { latitude: number; longitude: number } | null
) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coordsRef = useRef(coords);
  useEffect(() => { coordsRef.current = coords; }, [coords]);

  // One session token per search session — groups Autocomplete + one Details
  // call into a single billable unit.
  const sessionTokenRef = useRef<string>(uuid());

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const c = coordsRef.current;
        const token = sessionTokenRef.current;

        let url =
          `${API_BASE}/places/autocomplete` +
          `?q=${encodeURIComponent(query.trim())}` +
          `&token=${encodeURIComponent(token)}`;
        if (c) url += `&lat=${c.latitude}&lon=${c.longitude}`;

        const res = await fetch(url);
        if (!res.ok) {
          setSuggestions([]);
          return;
        }

        const data = (await res.json()) as {
          predictions: Array<{
            place_id: string;
            description: string;
            structured_formatting?: {
              main_text: string;
              secondary_text?: string;
            };
          }>;
        };

        if (!Array.isArray(data.predictions)) {
          setSuggestions([]);
          return;
        }

        setSuggestions(
          data.predictions.map((p) => ({
            place_id: p.place_id,
            short_name:
              p.structured_formatting?.main_text ??
              p.description.split(", ")[0] ??
              p.description,
            secondary_text:
              p.structured_formatting?.secondary_text ??
              p.description.split(", ").slice(1).join(", "),
            googlePlaceId: p.place_id,
            sessionToken: token,
          }))
        );
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const clear = useCallback(() => {
    setSuggestions([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Rotate session token so the next search starts a fresh billing session
    sessionTokenRef.current = uuid();
  }, []);

  return { suggestions, loading, search, clear };
}

// ── Coordinate resolver (call once when the user taps a suggestion) ───────────
/**
 * Calls /api/places/details to get exact lat/lon for the selected place.
 * Returns null if the request fails — caller should handle gracefully.
 */
export async function resolveGoogleCoords(
  s: AddressSuggestion
): Promise<ResolvedPlace | null> {
  try {
    const url =
      `${API_BASE}/places/details` +
      `?place_id=${encodeURIComponent(s.googlePlaceId)}` +
      `&token=${encodeURIComponent(s.sessionToken)}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      lat: string;
      lon: string;
      shortName: string;
      address: PlaceAddress;
    };

    if (!data.lat || !data.lon) return null;

    return {
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
      label: data.shortName || s.short_name,
      address: data.address ?? {},
    };
  } catch {
    return null;
  }
}
