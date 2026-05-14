import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

import { AddressInput } from "@/components/AddressInput";
import { SubscriptionCountdown } from "@/components/SubscriptionCountdown";
import { VehicleSelector } from "@/components/VehicleSelector";
import { TariffSelector } from "@/components/TariffSelector";
import { DateTimePicker } from "@/components/DateTimePicker";
import { FareResultCard } from "@/components/FareResult";
import { SurchargesSelector } from "@/components/SurchargesSelector";
import { useLocation } from "@/hooks/useLocation";
import { useAddressSearch, resolveGoogleCoords } from "@/hooks/useAddressSearch";
import { useRouteCalc } from "@/hooks/useRouteCalc";
import {
  calculateFare,
  detectTariff,
  DEFAULT_SURCHARGES,
  type SurchargeKey,
  type TariffType,
  type VehicleType,
} from "@/constants/tariff";
import type { FareResult } from "@/constants/tariff";
import { useTranslation } from "@/contexts/LanguageContext";
import type { AddressSuggestion } from "@/hooks/useAddressSearch";

export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL, lang } = useTranslation();
  const align = isRTL ? "right" : "left" as const;

  // Pass current language so reverse geocoding returns the address in that language
  const {
    location,
    loading: locationLoading,
    refetch: refetchLocation,
  } = useLocation(lang);

  const [originText, setOriginText] = useState("");
  const [originCoords, setOriginCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destText, setDestText] = useState("");
  const [destCoords, setDestCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [vehicle, setVehicle] = useState<VehicleType>("regular");
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [tariff, setTariff] = useState<TariffType>(() => detectTariff(new Date()));
  const [autoTariff, setAutoTariff] = useState(true);
  const [surcharges, setSurcharges] = useState<SurchargeKey>(DEFAULT_SURCHARGES);
  const [fareResult, setFareResult] = useState<FareResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  const originSearch = useAddressSearch(originCoords);
  const destSearch = useAddressSearch(originCoords);
  const { calculate: calcRoute, loading: routeLoading, error: routeError } = useRouteCalc();

  useEffect(() => {
    if (location) {
      setOriginText(location.address);
      setOriginCoords(location.coords);
      originSearch.clear();
    }
  }, [location]);

  useEffect(() => {
    const date = bookingDate ?? new Date();
    if (autoTariff) setTariff(detectTariff(date));
  }, [bookingDate, autoTariff]);

  const handleOriginChange = useCallback(
    (text: string) => { setOriginText(text); setOriginCoords(null); originSearch.search(text); },
    [originSearch],
  );
  const handleOriginSelect = useCallback(
    async (s: AddressSuggestion) => {
      setOriginText(s.short_name);
      originSearch.clear();
      const resolved = await resolveGoogleCoords(s);
      if (resolved) {
        setOriginText(resolved.label);
        setOriginCoords({ latitude: resolved.latitude, longitude: resolved.longitude });
      }
    },
    [originSearch],
  );
  const handleOriginClear = useCallback(() => { setOriginText(""); setOriginCoords(null); originSearch.clear(); }, [originSearch]);

  const handleDestChange = useCallback(
    (text: string) => { setDestText(text); setDestCoords(null); destSearch.search(text); },
    [destSearch],
  );
  const handleDestSelect = useCallback(
    async (s: AddressSuggestion) => {
      setDestText(s.short_name);
      destSearch.clear();
      const resolved = await resolveGoogleCoords(s);
      if (resolved) {
        setDestText(resolved.label);
        setDestCoords({ latitude: resolved.latitude, longitude: resolved.longitude });
      }
    },
    [destSearch],
  );
  const handleDestClear = useCallback(() => { setDestText(""); setDestCoords(null); destSearch.clear(); }, [destSearch]);

  const handleCalculate = useCallback(async () => {
    if (!originCoords || !destCoords) return;
    setCalculating(true);
    try {
      const route = await calcRoute(originCoords, destCoords);
      if (!route) return;
      const result = calculateFare(
        route.distanceKm,
        route.durationMinutes,
        tariff,
        vehicle,
        bookingDate !== null,
        surcharges,
      );
      setFareResult(result);
    } finally {
      setCalculating(false);
    }
  }, [originCoords, destCoords, tariff, vehicle, bookingDate, surcharges, calcRoute]);

  const handleReset = useCallback(() => {
    setFareResult(null);
    setDestText("");
    setDestCoords(null);
    setAutoTariff(true);
    setTariff(detectTariff(new Date()));
    setBookingDate(null);
    setSurcharges(DEFAULT_SURCHARGES);
  }, []);

  const canCalculate = !!originCoords && !!destCoords && !calculating && !routeLoading;
  const activeSurchargeCount = Object.values(surcharges).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[
        styles.header,
        { paddingTop: Platform.OS === "web" ? 56 : insets.top + 6 },
      ]}>
        <View style={[styles.headerRow, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
          <TouchableOpacity
            onLongPress={() => { Vibration.vibrate(40); router.push("/admin"); }}
            delayLongPress={800}
            activeOpacity={1}
          >
            <Text style={styles.appName}>{t.appName}</Text>
            <Text style={[styles.tagline, { textAlign: isRTL ? "right" : "left" }]}>{t.appTagline}</Text>
          </TouchableOpacity>
          <View style={[styles.tariffBadge, autoTariff && styles.tariffBadgeAuto]}>
            <Feather name="zap" size={12} color={autoTariff ? "#0D0D0D" : "#FFD60A"} />
            <Text style={[styles.tariffBadgeText, autoTariff && styles.tariffBadgeTextAuto]}>
              {`${t.tariff} ${tariff}`}
            </Text>
          </View>
        </View>
        <View style={[styles.countdownRow, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
          <SubscriptionCountdown />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : "padding"}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 80 : 20) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {fareResult ? (
            <FareResultCard
              result={fareResult}
              origin={originText}
              destination={destText}
              destCoords={destCoords}
              onReset={handleReset}
            />
          ) : (
            <>
              <View style={styles.card}>
                <AddressInput
                  label={t.origin}
                  value={locationLoading ? t.detectingLocation : originText}
                  onChange={handleOriginChange}
                  onSelect={handleOriginSelect}
                  onClear={handleOriginClear}
                  suggestions={originSearch.suggestions}
                  searching={originSearch.loading}
                  icon="navigation"
                  iconColor="#FFD60A"
                  placeholder={t.originPlaceholder}
                  editable={!locationLoading}
                  onIconPress={() => void refetchLocation()}
                  iconLoading={locationLoading}
                />
                <AddressInput
                  label={t.destination}
                  value={destText}
                  onChange={handleDestChange}
                  onSelect={handleDestSelect}
                  onClear={handleDestClear}
                  suggestions={destSearch.suggestions}
                  searching={destSearch.loading}
                  icon="map-pin"
                  iconColor="#808080"
                  placeholder={t.destinationPlaceholder}
                  dropdownAbove
                />
              </View>

              <View style={styles.card}>
                <VehicleSelector value={vehicle} onChange={setVehicle} />
              </View>

              <View style={styles.card}>
                <DateTimePicker value={bookingDate} onChange={setBookingDate} />
              </View>

              <View style={styles.card}>
                <TariffSelector
                  value={tariff}
                  autoDetected={autoTariff}
                  onChange={(v) => { setTariff(v); setAutoTariff(false); }}
                  onToggleAuto={() => { setAutoTariff(true); setTariff(detectTariff(bookingDate ?? new Date())); }}
                />
              </View>

              <View style={styles.card}>
                <View style={[styles.surchargeHeader, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
                  <Text style={[styles.sectionTitle, { textAlign: align }]}>{t.surchargesTitle}</Text>
                  {activeSurchargeCount > 0 && (
                    <View style={styles.surchargeBadge}>
                      <Text style={styles.surchargeBadgeText}>{activeSurchargeCount}</Text>
                    </View>
                  )}
                </View>
                <SurchargesSelector value={surcharges} onChange={setSurcharges} />
              </View>

              {routeError && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={15} color="#FF453A" />
                  <Text style={[styles.errorText, { textAlign: align }]}>{routeError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.calcBtn, !canCalculate && styles.calcBtnDisabled]}
                onPress={handleCalculate}
                disabled={!canCalculate}
                activeOpacity={0.85}
              >
                {calculating || routeLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#0D0D0D" />
                    <Text style={styles.calcBtnText}>{t.calculating}</Text>
                  </>
                ) : (
                  <>
                    <Feather name="dollar-sign" size={22} color="#0D0D0D" />
                    <Text style={styles.calcBtnText}>{t.calculate}</Text>
                  </>
                )}
              </TouchableOpacity>

              {!originCoords && !locationLoading && (
                <Text style={[styles.hint, { textAlign: align }]}>{t.useCurrentLocation}</Text>
              )}
              {originCoords && !destCoords && destText.length === 0 && (
                <Text style={[styles.hint, { textAlign: align }]}>{t.enterDestination}</Text>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222222",
  },
  headerRow: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  countdownRow: {
    minHeight: 0,
  },
  appName: { color: "#FFD60A", fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tagline: { color: "#555555", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  tariffBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFD60A44",
  },
  tariffBadgeAuto: { backgroundColor: "#FFD60A", borderColor: "#FFD60A" },
  tariffBadgeText: { color: "#FFD60A", fontSize: 13, fontFamily: "Inter_700Bold" },
  tariffBadgeTextAuto: { color: "#0D0D0D" },
  scrollContent: { padding: 14, gap: 10 },
  card: {
    backgroundColor: "#111111",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 14,
  },
  surchargeHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  surchargeBadge: {
    backgroundColor: "#FFD60A22",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#FFD60A44",
    minWidth: 22,
    alignItems: "center",
  },
  surchargeBadgeText: { color: "#FFD60A", fontSize: 11, fontFamily: "Inter_700Bold" },
  calcBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FFD60A",
    borderRadius: 18,
    paddingVertical: 20,
    marginTop: 2,
    ...Platform.select({
      ios: { shadowColor: "#FFD60A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 18 },
      android: { elevation: 10 },
      web: { boxShadow: "0 6px 24px #FFD60A55" },
    }),
  },
  calcBtnDisabled: {
    opacity: 0.35,
    ...Platform.select({ ios: { shadowOpacity: 0 }, web: { boxShadow: "none" } }),
  },
  calcBtnText: { color: "#0D0D0D", fontSize: 19, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FF453A14",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FF453A33",
  },
  errorText: { color: "#FF453A", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  hint: { color: "#454545", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
});
