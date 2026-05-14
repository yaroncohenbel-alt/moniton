import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import PaywallScreen from "@/components/PaywallScreen";
import LegalDisclaimerScreen from "@/components/LegalDisclaimerScreen";
import { useDisclaimer } from "@/hooks/useDisclaimer";
import { useAppVersion } from "@/hooks/useAppVersion";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
// Register background location task at app startup — must be imported at the root level
import "@/tasks/locationTask";

SplashScreen.preventAutoHideAsync();

function Spinner() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#FFD60A" size="large" />
    </View>
  );
}

/**
 * GATEKEEPER — strict sequential flow:
 *   1. Version check / cache reset  (useAppVersion)
 *   2. Legal disclaimer             (useDisclaimer)
 *   3. Subscription / payment gate  (useSubscription → isActive)
 *   4. Full app                     (only if all three pass)
 *
 * There is NO way to reach the Stack (and therefore the calculator)
 * without passing every gate above it.
 */
function Gatekeeper() {
  // ── PWA auto-update (web only — no-op on native) ──────────────────────────
  usePwaUpdate();

  // ── Gate 1: version / storage reset ─────────────────────────────────────
  const { ready: versionReady } = useAppVersion();

  // ── Gate 2: legal disclaimer ─────────────────────────────────────────────
  const { isAccepted, loading: disclaimerLoading, accept } = useDisclaimer();

  // ── Gate 3: subscription / admin PIN ─────────────────────────────────────
  const { isActive, isLoading: subLoading } = useSubscription();

  // Still loading any gate state → show spinner
  if (!versionReady || disclaimerLoading || subLoading) {
    return <Spinner />;
  }

  // Gate 2: must accept legal disclaimer first
  if (!isAccepted) {
    return <LegalDisclaimerScreen onAccept={accept} />;
  }

  // Gate 3: must be subscribed / admin-activated
  if (!isActive) {
    return <PaywallScreen />;
  }

  // ── All gates passed → full app ──────────────────────────────────────────
  return (
    <Stack screenOptions={{ headerBackTitle: "חזור", headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <SubscriptionProvider>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <Gatekeeper />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </SubscriptionProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
