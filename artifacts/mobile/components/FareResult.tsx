import React, { useCallback } from "react";
import {
  Alert,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { FareResult } from "@/constants/tariff";
import { useTranslation } from "@/contexts/LanguageContext";
import type { Translations } from "@/constants/translations";

interface Coords {
  latitude: number;
  longitude: number;
}

interface FareResultProps {
  result: FareResult;
  origin: string;
  destination: string;
  destCoords?: Coords | null;
  onReset: () => void;
}

function buildShareMessage(
  result: FareResult,
  origin: string,
  destination: string,
  t: Translations,
  tariffName: string,
): string {
  const lines = [
    `🚕 ${t.shareTitle}`,
    ``,
    `📍 ${t.shareFrom}: ${origin}`,
    `🏁 ${t.shareTo}: ${destination}`,
    ``,
    `${tariffName} | ${result.distanceKm.toFixed(1)} ${t.km} | ${Math.round(result.durationMinutes)} ${t.minutes}`,
    ``,
    `💰 ${t.total}: ₪${result.total.toFixed(2)}`,
    ``,
    `${t.fareDisclaimer}`,
  ];
  return lines.join("\n");
}

function Row({
  label,
  value,
  highlight,
  isRTL,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  isRTL: boolean;
}) {
  return (
    <View style={[row.container, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
      <Text style={[row.value, highlight && row.valueHighlight]}>{value}</Text>
      <Text style={row.label}>{label}</Text>
    </View>
  );
}

const row = StyleSheet.create({
  container: { justifyContent: "space-between", alignItems: "center", paddingVertical: 9 },
  label: { color: "#A0A0A0", fontSize: 14, fontFamily: "Inter_400Regular" },
  value: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_500Medium" },
  valueHighlight: { color: "#FFD60A" },
});

// ── Waze icon rendered as styled text ──────────────────────────────────────
function WazeIcon({ size = 18 }: { size?: number }) {
  return (
    <View style={[waze.iconWrap, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }]}>
      <Text style={[waze.iconText, { fontSize: size - 2 }]}>W</Text>
    </View>
  );
}

const waze = StyleSheet.create({
  iconWrap: {
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    lineHeight: undefined,
  },
});

export function FareResultCard({ result, origin, destination, destCoords, onReset }: FareResultProps) {
  const { t, isRTL } = useTranslation();
  const tariffName = t.tariffNames[result.tariff - 1];
  const message = buildShareMessage(result, origin, destination, t, tariffName);
  const align = isRTL ? "right" : "left" as const;

  // ── Waze navigation ────────────────────────────────────────────────────
  const handleWaze = useCallback(async () => {
    let wazeUrl: string;
    let fallbackUrl: string;

    if (destCoords) {
      const { latitude: lat, longitude: lng } = destCoords;
      wazeUrl = `waze://?ll=${lat},${lng}&navigate=yes`;
      fallbackUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    } else if (destination) {
      const q = encodeURIComponent(destination);
      wazeUrl = `waze://?q=${q}&navigate=yes`;
      fallbackUrl = `https://waze.com/ul?q=${q}&navigate=yes`;
    } else {
      return;
    }

    if (Platform.OS === "web") {
      await Linking.openURL(fallbackUrl);
      return;
    }

    const supported = await Linking.canOpenURL(wazeUrl);
    if (supported) {
      await Linking.openURL(wazeUrl);
    } else {
      // Waze not installed — open web fallback silently
      Alert.alert("", t.wazeNotInstalled);
      await Linking.openURL(fallbackUrl);
    }
  }, [destCoords, destination, t]);

  // ── WhatsApp share ─────────────────────────────────────────────────────
  const handleWhatsApp = useCallback(async () => {
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert("", t.whatsappNotInstalled);
  }, [message, t]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message, title: t.shareTitle }, { dialogTitle: t.shareTitle });
    } catch { /* user cancelled */ }
  }, [message, t]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
        <View style={styles.tariffBadge}>
          <Feather name="zap" size={13} color="#FFD60A" />
          <Text style={styles.tariffBadgeText}>{tariffName}</Text>
        </View>
        <Text style={[styles.headerTitle, { textAlign: align }]}>{t.estimatedFare}</Text>
      </View>

      {/* Route */}
      <View style={[styles.routeRow, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
        <Text style={[styles.routeText, { textAlign: align }]} numberOfLines={1}>{destination}</Text>
        <Feather name={isRTL ? "arrow-left" : "arrow-right"} size={14} color="#505050" />
        <Text style={[styles.routeText, { textAlign: align }]} numberOfLines={1}>{origin}</Text>
      </View>

      {/* Total */}
      <View style={[styles.totalRow, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
        <Text style={styles.totalValue}>₪{result.total.toFixed(2)}</Text>
        <Text style={styles.totalLabel}>{t.total}</Text>
      </View>

      <View style={styles.divider} />

      {/* Distance / Duration */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Feather name="map" size={22} color="#FFD60A" />
          <Text style={styles.statValue}>{result.distanceKm.toFixed(1)}</Text>
          <Text style={styles.statUnit}>{t.km}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Feather name="clock" size={22} color="#FFD60A" />
          <Text style={styles.statValue}>{Math.round(result.durationMinutes)}</Text>
          <Text style={styles.statUnit}>{t.minutes}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Breakdown */}
      <View style={styles.breakdown}>
        <Row label={t.baseFare}     value={`₪${result.baseFare.toFixed(2)}`}     isRTL={isRTL} />
        <View style={styles.rowDivider} />
        <Row label={t.distanceFare} value={`₪${result.distanceFare.toFixed(2)}`} isRTL={isRTL} />
        <View style={styles.rowDivider} />
        <Row label={t.timeFare}     value={`₪${result.timeFare.toFixed(2)}`}     isRTL={isRTL} />

        {result.vehicleSurcharge > 0 && (
          <>
            <View style={styles.rowDivider} />
            <Row label={t.largeVehicleSurcharge} value={`₪${result.vehicleSurcharge.toFixed(2)}`} isRTL={isRTL} />
          </>
        )}
        {result.bookingFee > 0 && (
          <>
            <View style={styles.rowDivider} />
            <Row label={t.bookingFee} value={`₪${result.bookingFee.toFixed(2)}`} isRTL={isRTL} />
          </>
        )}

        {result.extraSurcharges.map((s, i) => (
          <React.Fragment key={i}>
            <View style={styles.rowDivider} />
            <Row
              label={t.surchargeLabels[s.key as keyof typeof t.surchargeLabels] ?? s.key}
              value={`₪${s.amount.toFixed(2)}`}
              highlight
              isRTL={isRTL}
            />
          </React.Fragment>
        ))}
      </View>

      <Text style={[styles.disclaimer, { textAlign: align }]}>{t.fareDisclaimer}</Text>

      {/* ── Waze navigation button ── */}
      <TouchableOpacity
        style={styles.wazeBtn}
        onPress={handleWaze}
        activeOpacity={0.84}
      >
        <WazeIcon size={20} />
        <Text style={styles.wazeBtnText}>{t.navigateWaze}</Text>
        <Feather name="navigation" size={16} color="#FFFFFF" style={styles.wazeArrow} />
      </TouchableOpacity>

      {/* ── Share actions ── */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp} activeOpacity={0.82}>
          <Text style={styles.waIcon}>W</Text>
          <Text style={styles.whatsappText}>{t.shareWhatsApp}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.82}>
          <Feather name="share-2" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.8}>
        <Feather name="rotate-ccw" size={16} color="#808080" />
        <Text style={styles.resetText}>{t.newCalculation}</Text>
      </TouchableOpacity>
    </View>
  );
}

const WAZE_BG = "#33CCFF";

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111111",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 18,
    ...Platform.select({
      ios: { shadowColor: "#FFD60A", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 8 },
      web: { boxShadow: "0 0 30px #FFD60A18" },
    }),
  },
  header: { alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  headerTitle: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  tariffBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FFD60A18", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "#FFD60A44",
  },
  tariffBadgeText: { color: "#FFD60A", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  routeRow: { alignItems: "center", justifyContent: "flex-end", gap: 6, marginBottom: 12, paddingHorizontal: 2 },
  routeText: { color: "#686868", fontSize: 12, fontFamily: "Inter_400Regular", flexShrink: 1 },
  totalRow: { alignItems: "baseline", justifyContent: "flex-end", gap: 10, marginBottom: 14 },
  totalLabel: { color: "#808080", fontSize: 17, fontFamily: "Inter_400Regular" },
  totalValue: { color: "#FFD60A", fontSize: 54, fontFamily: "Inter_700Bold", letterSpacing: -1.5 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#222222", marginVertical: 13 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    paddingVertical: 6,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  statValue: { color: "#FFD60A", fontSize: 27, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statUnit: { color: "#A0A0A0", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  statDivider: { width: 1, height: 32, backgroundColor: "#2A2A2A" },
  breakdown: { gap: 0 },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#1E1E1E" },
  disclaimer: { color: "#454545", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 12, lineHeight: 16 },
  // Waze
  wazeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: WAZE_BG,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 16,
    ...Platform.select({
      ios: { shadowColor: WAZE_BG, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 14 },
      android: { elevation: 6 },
      web: { boxShadow: `0 4px 18px ${WAZE_BG}55` },
    }),
  },
  wazeBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  wazeArrow: { position: "absolute", right: 18 },
  // Share
  actions: { flexDirection: "row", gap: 10, marginTop: 10 },
  whatsappBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9,
    backgroundColor: "#25D366", borderRadius: 14, paddingVertical: 16,
    ...Platform.select({
      ios: { shadowColor: "#25D366", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: "0 4px 16px #25D36644" },
    }),
  },
  waIcon: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold", backgroundColor: "#FFFFFF22", borderRadius: 5, width: 22, height: 22, textAlign: "center", lineHeight: 22 },
  whatsappText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  shareBtn: { width: 54, alignItems: "center", justifyContent: "center", backgroundColor: "#1E1E1E", borderRadius: 14, borderWidth: 1, borderColor: "#2A2A2A" },
  resetBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, paddingVertical: 14, borderRadius: 14, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#252525" },
  resetText: { color: "#686868", fontSize: 15, fontFamily: "Inter_500Medium" },
});
