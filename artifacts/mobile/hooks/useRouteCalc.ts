import { useCallback, useState } from "react";

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
}

export function useRouteCalc() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(
    async (
      origin: { latitude: number; longitude: number },
      destination: { latitude: number; longitude: number },
    ): Promise<RouteResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=false`;
        const res = await fetch(url);
        const data = (await res.json()) as {
          routes?: { distance: number; duration: number }[];
          code?: string;
        };
        if (data.code !== "Ok" || !data.routes?.[0]) {
          setError("לא נמצא מסלול");
          return null;
        }
        const route = data.routes[0];
        return {
          distanceKm: route.distance / 1000,
          durationMinutes: route.duration / 60,
        };
      } catch {
        setError("שגיאה בחישוב המסלול");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { calculate, loading, error };
}
