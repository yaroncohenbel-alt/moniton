/**
 * usePwaUpdate — PWA service worker auto-update mechanism
 *
 * - On mount: checks for a new SW immediately
 * - On visibilitychange (app foregrounded): re-checks for new SW
 * - When a new SW activates and sends SW_ACTIVATED: page reloads silently
 * - forceRefresh(): clears ALL caches then reloads (for the Settings button)
 */
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

export function usePwaUpdate() {
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!("serviceWorker" in navigator)) return;

    // ── When a new SW takes control, reload the page ─────────────────────────
    const handleControllerChange = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // ── When the SW sends SW_ACTIVATED, reload ───────────────────────────────
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_ACTIVATED") {
        if (reloadingRef.current) return;
        reloadingRef.current = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);

    // ── Check for new SW whenever tab becomes visible ────────────────────────
    const checkForUpdate = () => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.update().catch(() => {});
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // ── Check immediately on mount ────────────────────────────────────────────
    checkForUpdate();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  /** Clears all SW caches and hard-reloads — for the Settings "Force Refresh" button */
  const forceRefresh = useCallback(async () => {
    if (Platform.OS !== "web") {
      // On native, no SW — just a no-op (nothing to clear)
      return;
    }
    try {
      // Tell SW to clear its cache
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.active) {
        reg.active.postMessage({ type: "CLEAR_CACHE" });
      }
      // Also clear from the page side
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // Ignore errors — we reload regardless
    }
    reloadingRef.current = true;
    window.location.reload();
  }, []);

  return { forceRefresh };
}
