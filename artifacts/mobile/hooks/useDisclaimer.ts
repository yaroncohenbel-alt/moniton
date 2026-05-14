import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const DISCLAIMER_KEY = "@taximeter_disclaimer_accepted_v1";

export function useDisclaimer() {
  const [isAccepted, setIsAccepted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(DISCLAIMER_KEY)
      .then((v) => setIsAccepted(v === "1"))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const accept = useCallback(async () => {
    await AsyncStorage.setItem(DISCLAIMER_KEY, "1");
    setIsAccepted(true);
  }, []);

  return { isAccepted, loading, accept };
}
