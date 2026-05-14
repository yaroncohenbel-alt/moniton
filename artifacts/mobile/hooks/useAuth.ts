import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export interface DriverProfile {
  name: string;
  phone: string;
  israelId: string;
  registeredAt: string;
}

const STORAGE_KEY = "@moniton_driver";

export function useAuth() {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setDriver(raw ? (JSON.parse(raw) as DriverProfile) : null))
      .finally(() => setLoading(false));
  }, []);

  const register = useCallback(async (name: string, phone: string, israelId: string): Promise<DriverProfile> => {
    const profile: DriverProfile = {
      name: name.trim(),
      phone: phone.trim(),
      israelId: israelId.trim(),
      registeredAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setDriver(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setDriver(null);
  }, []);

  return { driver, loading, register, logout };
}
