/**
 * SubscriptionContext — single source of truth for access control.
 *
 * Priority order (highest wins):
 *   1. Admin lifetime flag (AsyncStorage — PIN 1809 + TOTP verified)
 *   2. Server-verified status (POST /api/taxi/verify-device)
 *   3. Default: inactive
 *
 * The server is queried on every launch. Local storage is never trusted
 * as "active" unless the server confirms it.
 *
 * IMPORTANT — registration race-condition fix:
 *   registerOnServer() calls register + verify-device itself using the phone
 *   it receives directly. It does NOT rely on driver?.phone from React state,
 *   which may not have updated yet due to React's batched rendering. After a
 *   successful verify it calls applyResult() to set the subscription state
 *   immediately, without waiting for a re-render cycle.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDeviceId } from "@/hooks/useDeviceId";
import { useServerSubscription, verifyWithServer } from "@/hooks/useServerSubscription";

export const ADMIN_LIFETIME_KEY = "@taximeter_admin_lifetime_v1";
export const ADMIN_PIN = "1809";

export type PlanType = "trial" | "paid" | null;

interface SubscriptionCtx {
  isActive: boolean;
  isLoading: boolean;
  isAdminLifetime: boolean;
  serverStatus: string | null;
  deviceMismatch: boolean;
  expiryDate: string | null;
  planType: PlanType;
  activateAdminLifetime: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  registerOnServer: (name: string, phone: string) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionCtx>({
  isActive: false,
  isLoading: true,
  isAdminLifetime: false,
  serverStatus: null,
  deviceMismatch: false,
  expiryDate: null,
  planType: null,
  activateAdminLifetime: async () => {},
  refreshSubscription: async () => {},
  registerOnServer: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { driver, loading: authLoading } = useAuth();
  const deviceId = useDeviceId();
  const [isAdminLifetime, setIsAdminLifetime] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ADMIN_LIFETIME_KEY)
      .then((v) => setIsAdminLifetime(v === "1"))
      .catch(() => {})
      .finally(() => setAdminLoading(false));
  }, []);

  const { result: serverResult, loading: serverLoading, refresh: refreshServer, applyResult } =
    useServerSubscription(driver?.phone ?? null, deviceId);

  const activateAdminLifetime = useCallback(async () => {
    await AsyncStorage.setItem(ADMIN_LIFETIME_KEY, "1");
    setIsAdminLifetime(true);
  }, []);

  /**
   * registerOnServer — registers the user then immediately verifies the device
   * using the phone passed directly (NOT driver?.phone, which may be stale due
   * to React's batched state updates). Calls applyResult() so that isActive
   * flips to true in the same tick, before any re-render has occurred.
   */
  const registerOnServer = useCallback(
    async (name: string, phone: string) => {
      if (!deviceId) return;

      // 1. Register (creates account with 7-day trial on the server)
      await fetch("/api/taxi/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, deviceId }),
      });

      // 2. Immediately verify — use phone directly, not driver?.phone (stale)
      try {
        const verifyResult = await verifyWithServer(phone, deviceId);
        // 3. Push result into state right now, bypassing React render cycle
        await applyResult(verifyResult);
      } catch {
        // Offline or server error — refresh will retry on next launch
      }
    },
    [deviceId, applyResult],
  );

  const refreshSubscription = useCallback(async () => {
    await refreshServer();
  }, [refreshServer]);

  const isLoading = authLoading || adminLoading || serverLoading || deviceId === null;

  let isActive = false;
  if (isAdminLifetime) {
    isActive = true;
  } else if (serverResult?.active === true) {
    isActive = true;
  }

  const deviceMismatch = serverResult?.status === "device_mismatch";

  const expiryDate = serverResult?.expiryDate ?? null;
  const rawStatus = serverResult?.status ?? null;
  const planType: PlanType =
    rawStatus === "pending" ? "trial" :
    rawStatus === "active" ? "paid" :
    null;

  return (
    <SubscriptionContext.Provider
      value={{
        isActive,
        isLoading,
        isAdminLifetime,
        serverStatus: rawStatus,
        deviceMismatch,
        expiryDate,
        planType,
        activateAdminLifetime,
        refreshSubscription,
        registerOnServer,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
