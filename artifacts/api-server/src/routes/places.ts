/**
 * Google Places / Geocoding API proxy — keeps GOOGLE_MAPS_API_KEY server-side.
 *
 * GET /places/autocomplete
 *   ?q=<query>  &lat=<lat>  &lon=<lon>  &token=<sessiontoken>
 *   Restricted to Israel (components=country:il), Hebrew, types=address.
 *   Returns: { predictions: SimplePrediction[] }
 *
 * GET /places/details
 *   ?place_id=<id>  &token=<sessiontoken>
 *   Places Details — geometry + address_components.
 *   Returns: { lat, lon, shortName, address }
 *
 * GET /places/reverse
 *   ?lat=<lat>  &lon=<lon>
 *   Google Geocoding reverse lookup — returns the exact street address with
 *   house number for the given GPS coordinates.
 *   Returns: { label, street, number, city }
 */
import { Router } from "express";

const router = Router();

// ── Shared types ──────────────────────────────────────────────────────────────
interface AutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
}

interface AutocompleteResponse {
  status: string;
  predictions: AutocompletePrediction[];
  error_message?: string;
}

interface AddressComponent {
  long_name: string;
  types: string[];
}

interface DetailsResponse {
  status: string;
  result?: {
    geometry: { location: { lat: number; lng: number } };
    address_components?: AddressComponent[];
    formatted_address?: string;
  };
  error_message?: string;
}

interface GeocodeResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    address_components: AddressComponent[];
    geometry: { location: { lat: number; lng: number }; location_type?: string };
    types: string[];
  }>;
  error_message?: string;
}

// ── Helper: extract named components from address_components array ────────────
function extractComponents(components: AddressComponent[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of components) {
    for (const t of c.types) {
      if (!map[t]) map[t] = c.long_name;
    }
  }
  return map;
}

// ── Autocomplete ──────────────────────────────────────────────────────────────
router.get("/places/autocomplete", async (req, res) => {
  const key = process.env["GOOGLE_MAPS_API_KEY"];
  if (!key) {
    res.status(503).json({ error: "Google Maps API key not configured" });
    return;
  }

  const { q, lat, lon, token } = req.query as {
    q?: string; lat?: string; lon?: string; token?: string;
  };

  if (!q || String(q).trim().length < 2) {
    res.json({ predictions: [] });
    return;
  }

  try {
    let url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(String(q).trim())}` +
      `&key=${key}` +
      `&language=he` +
      `&components=country:il` +
      `&types=address`;

    if (token) url += `&sessiontoken=${encodeURIComponent(String(token))}`;
    if (lat && lon) {
      const latF = parseFloat(String(lat));
      const lonF = parseFloat(String(lon));
      if (!isNaN(latF) && !isNaN(lonF)) {
        url += `&location=${latF},${lonF}&radius=50000`;
      }
    }

    const gRes = await fetch(url, { headers: { "User-Agent": "Moniton-Server/1.0" } });
    if (!gRes.ok) { res.status(502).json({ error: `Google returned ${gRes.status}` }); return; }

    const data = (await gRes.json()) as AutocompleteResponse;
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      req.log.warn({ status: data.status, msg: data.error_message }, "Places Autocomplete error");
      res.status(502).json({ error: data.status, message: data.error_message });
      return;
    }

    res.json({ predictions: data.predictions ?? [] });
  } catch (err) {
    req.log.error({ err }, "places/autocomplete error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Details (called once when user selects a prediction) ─────────────────────
router.get("/places/details", async (req, res) => {
  const key = process.env["GOOGLE_MAPS_API_KEY"];
  if (!key) { res.status(503).json({ error: "Google Maps API key not configured" }); return; }

  const { place_id, token } = req.query as { place_id?: string; token?: string };
  if (!place_id) { res.status(400).json({ error: "place_id is required" }); return; }

  try {
    let url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${encodeURIComponent(String(place_id))}` +
      `&key=${key}` +
      `&language=he` +
      `&fields=geometry,address_components,formatted_address`;

    if (token) url += `&sessiontoken=${encodeURIComponent(String(token))}`;

    const gRes = await fetch(url, { headers: { "User-Agent": "Moniton-Server/1.0" } });
    if (!gRes.ok) { res.status(502).json({ error: `Google returned ${gRes.status}` }); return; }

    const data = (await gRes.json()) as DetailsResponse;
    if (data.status !== "OK" || !data.result) {
      req.log.warn({ status: data.status, msg: data.error_message }, "Places Details error");
      res.status(502).json({ error: data.status, message: data.error_message });
      return;
    }

    const r = data.result;
    const comp = extractComponents(r.address_components ?? []);
    const street = comp["route"] ?? "";
    const number = comp["street_number"] ?? "";
    const city = comp["locality"] ?? comp["sublocality"] ?? comp["administrative_area_level_2"] ?? "";
    const streetPart = number ? `${street} ${number}` : street;
    const shortName = streetPart
      ? (city ? `${streetPart}, ${city}` : streetPart)
      : (city || (r.formatted_address ?? ""));

    res.json({
      lat: String(r.geometry.location.lat),
      lon: String(r.geometry.location.lng),
      shortName,
      address: {
        road: street || undefined,
        house_number: number || undefined,
        city: city || undefined,
      },
    });
  } catch (err) {
    req.log.error({ err }, "places/details error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reverse geocoding (called on GPS fix to get the street address of origin) ─
router.get("/places/reverse", async (req, res) => {
  const key = process.env["GOOGLE_MAPS_API_KEY"];
  if (!key) { res.status(503).json({ error: "Google Maps API key not configured" }); return; }

  const { lat, lon } = req.query as { lat?: string; lon?: string };
  if (!lat || !lon) { res.status(400).json({ error: "lat and lon are required" }); return; }

  const latF = parseFloat(String(lat));
  const lonF = parseFloat(String(lon));
  if (isNaN(latF) || isNaN(lonF)) { res.status(400).json({ error: "lat/lon must be numbers" }); return; }

  try {
    // result_type=street_address prioritises exact house-number results.
    // language=he returns Hebrew street names.
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${latF},${lonF}` +
      `&key=${key}` +
      `&language=he` +
      `&result_type=street_address`;

    const gRes = await fetch(url, { headers: { "User-Agent": "Moniton-Server/1.0" } });
    if (!gRes.ok) { res.status(502).json({ error: `Google returned ${gRes.status}` }); return; }

    const data = (await gRes.json()) as GeocodeResponse;

    if (data.status === "ZERO_RESULTS" || !data.results?.length) {
      // Widen: try without result_type filter to find any precise result
      const fallbackUrl =
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?latlng=${latF},${lonF}` +
        `&key=${key}` +
        `&language=he`;

      const fb = await fetch(fallbackUrl, { headers: { "User-Agent": "Moniton-Server/1.0" } });
      if (!fb.ok) { res.status(502).json({ error: `Google returned ${fb.status}` }); return; }
      const fbData = (await fb.json()) as GeocodeResponse;
      if (!fbData.results?.length) {
        res.status(404).json({ error: "No results" });
        return;
      }
      data.results = fbData.results;
    }

    // Helper: score a result by precision (street_address with number is best)
    function resultScore(r: typeof data.results[0]): number {
      const comp = extractComponents(r.address_components);
      const hasNumber = !!comp["street_number"];
      const hasStreet = !!comp["route"];
      const isStreetAddr = r.types.includes("street_address");
      const isRooftop = r.geometry.location_type === "ROOFTOP";
      return (isStreetAddr ? 8 : 0) + (isRooftop ? 4 : 0) + (hasNumber ? 2 : 0) + (hasStreet ? 1 : 0);
    }

    // Pick the best result: prefer street_address with house number, else highest score
    const sorted = [...data.results].sort((a, b) => resultScore(b) - resultScore(a));
    const best = sorted[0];

    // If the best result still has no house number, do one more targeted lookup
    // using location_type=ROOFTOP to see if Google can give us a house number.
    const bestComp = extractComponents(best?.address_components ?? []);
    if (!bestComp["street_number"] && best) {
      const rooftopUrl =
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?latlng=${latF},${lonF}` +
        `&key=${key}` +
        `&language=he` +
        `&location_type=ROOFTOP`;
      try {
        const rf = await fetch(rooftopUrl, { headers: { "User-Agent": "Moniton-Server/1.0" } });
        if (rf.ok) {
          const rfData = (await rf.json()) as GeocodeResponse;
          const rooftopBest = rfData.results?.find((r) => {
            const c = extractComponents(r.address_components);
            return !!c["street_number"] && !!c["route"];
          });
          if (rooftopBest) {
            // Use the rooftop result — it has an exact house number
            data.results = [rooftopBest, ...data.results];
          }
        }
      } catch { /* ignore — best-effort */ }
    }

    const finalBest =
      data.results.find((r) => {
        const c = extractComponents(r.address_components);
        return !!c["street_number"] && !!c["route"];
      }) ?? best;

    if (!finalBest) { res.status(404).json({ error: "No results" }); return; }

    const comp = extractComponents(finalBest.address_components);
    const street = comp["route"] ?? "";
    const number = comp["street_number"] ?? "";
    const city =
      comp["locality"] ??
      comp["sublocality_level_1"] ??
      comp["sublocality"] ??
      comp["administrative_area_level_2"] ??
      "";

    // Format: "רחוב הרצל 12, תל אביב-יפו"
    const streetPart = number ? `${street} ${number}` : street;
    const label = streetPart
      ? (city ? `${streetPart}, ${city}` : streetPart)
      : (city || finalBest.formatted_address);

    req.log.info({ label, street, number, city }, "reverse geocode");

    res.json({ label, street, number, city });
  } catch (err) {
    req.log.error({ err }, "places/reverse error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
