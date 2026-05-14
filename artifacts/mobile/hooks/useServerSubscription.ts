/**
 * Server-verified subscription check.
 * On every app launch, calls POST /api/taxi/verify-device with the user's
 * phone + device ID. The server is the single source of truth for isActive.
 *
 * Falls back to local AsyncStorage cache if the server is unreachable,
 * but never trusts the local cache as "active" if the server says otherwise.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const CACHE_KEY = "@taximeter_server_status_v1";
const API_BASE = "/api";

export type ServerStatus = "active" | "pending" | "expired" | "not_found" | "device_mismatch" | "unknown";

export interface VerifyResult {
  status: ServerStatus;
  active: boolean;
  expiryDate: string | null;
}

export async function verifyWithServer(phone: string, deviceId: string): Promise<VerifyResult> {
  const res = await fetch(`${API_BASE}/taxi/verify-device`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, deviceId }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return (await res.json()) as VerifyResult;
}

export function useServerSubscription(phone: string | null, deviceId: string | null) {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async () => {
    if (!phone || !deviceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await verifyWithServer(phone, deviceId);
      setResult(data);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      // Network error — use cached result but never upgrade to active
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as VerifyResult;
        setResult({ ...parsed, active: false, status: "unknown" });
        setError("offline");
      } else {
        setResult({ status: "unknown", active: false, expiryDate: null });
        setError("offline");
      }
    } finally {
      setLoading(false);
    }
  }, [phone, deviceId]);

  useEffect(() => {
    void verify();
  }, [verify]);

  // applyResult: lets callers bypass React state timing by setting the result
  // directly (e.g. immediately after registration before driver state updates)
  const applyResult = useCallback(async (data: VerifyResult) => {
    setResult(data);
    setLoading(false);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }, []);

  return { result, loading, error, refresh: verify, applyResult };
}
