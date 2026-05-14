/**
 * Version-based storage reset.
 * Bump CURRENT_VERSION whenever you want to force all users to start fresh
 * (clears AsyncStorage entirely, so everyone sees disclaimer + paywall again).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const CURRENT_VERSION = "3"; // ← bump to force a full reset for all users
const VERSION_KEY = "@taximeter_app_version";

export function useAppVersion() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Allow ?reset=1 in the URL on web to force a fresh start
        if (Platform.OS === "web") {
          const params = new URLSearchParams(window.location.search);
          if (params.get("reset") === "1") {
            await AsyncStorage.clear();
            // Remove the param so it doesn't keep resetting on reload
            const url = new URL(window.location.href);
            url.searchParams.delete("reset");
            window.history.replaceState({}, "", url.toString());
            setReady(true);
            return;
          }
        }

        const stored = await AsyncStorage.getItem(VERSION_KEY);
        if (stored !== CURRENT_VERSION) {
          await AsyncStorage.clear();
          await AsyncStorage.setItem(VERSION_KEY, CURRENT_VERSION);
        }
      } catch {
        // Silent fail — don't block app startup
      }
      setReady(true);
    })();
  }, []);

  return { ready };
}
