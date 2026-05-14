/**
 * Returns a stable, unique device ID for this install.
 * On web: stored in localStorage (survives refreshes, cleared on ?reset=1).
 * On native: uses expo-application's installationId or a generated UUID.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";

const DEVICE_ID_KEY = "@taximeter_device_id_v1";

async function getOrCreateDeviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const id = Crypto.randomUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return "unknown-device";
  }
}

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId).catch(() => setDeviceId("unknown-device"));
  }, []);

  return deviceId;
}
