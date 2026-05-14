import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const ADMIN_LIFETIME_KEY = "@taximeter_admin_lifetime_v1";

/**
 * Persists an "admin lifetime" flag in AsyncStorage.
 * Once set by entering PIN 1809, the flag survives DB resets and
 * app restarts — it can only be cleared by uninstalling the app.
 */
export function useAdminSubscription() {
  const [isAdminLifetime, setIsAdminLifetime] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ADMIN_LIFETIME_KEY)
      .then((v) => setIsAdminLifetime(v === "1"))
      .catch(() => setIsAdminLifetime(false))
      .finally(() => setLoading(false));
  }, []);

  const activateAdminLifetime = useCallback(async () => {
    await AsyncStorage.setItem(ADMIN_LIFETIME_KEY, "1");
    setIsAdminLifetime(true);
  }, []);

  return { isAdminLifetime, loading, activateAdminLifetime };
}
