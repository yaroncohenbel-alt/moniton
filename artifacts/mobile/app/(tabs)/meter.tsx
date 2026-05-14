/**
 * Live Meter screen — מונה חי
 * Simulates a real taxi meter: tracks GPS distance + elapsed time in real time.
 */
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SURCHARGE_RATES, TARIFF_RATES, type TariffType, type VehicleType } from "@/constants/tariff";
import { useLiveMeter } from "@/hooks/useLiveMeter";

// ── Helpers ───────────────────────────────────────────────────────────────────
function padZ(n: number, len = 2) {
  return n.toString().padStart(len, "0");
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${padZ(h)}:${padZ(m)}:${padZ(sec)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function TariffBadge({ tariff, onPress }: { tariff: TariffType; onPress: () => void }) {
  const colors: Record<TariffType, string> = { 1: "#34C759", 2: "#FF9500", 3: "#FF453A" };
  return (
    <TouchableOpacity style={[badge.wrap, { borderColor: colors[tariff] + "66" }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[badge.dot, { backgroundColor: colors[tariff] }]} />
      <Text style={[badge.text, { color: colors[tariff] }]}>
        {TARIFF_RATES[tariff].nameHe}
      </Text>
      <Feather name="chevron-down" size={12} color={colors[tariff]} />
    </TouchableOpacity>
  );
}

const badge = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: "#161616" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});

function VehicleToggle({ vehicle, onChange, disabled }: { vehicle: VehicleType; onChange: (v: VehicleType) => void; disabled: boolean }) {
  return (
    <View style={vt.row}>
      {(["regular", "large"] as VehicleType[]).map((v) => (
        <TouchableOpacity
          key={v}
          style={[vt.btn, vehicle === v && vt.btnSel, disabled && vt.disabled]}
          onPress={() => !disabled && onChange(v)}
          activeOpacity={0.7}
        >
          <Feather name={v === "regular" ? "user" : "users"} size={15} color={vehicle === v ? "#0D0D0D" : "#505050"} />
          <Text style={[vt.label, vehicle === v && vt.labelSel]}>{v === "regular" ? "רגיל" : "גדול +6"}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const vt = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#1A1A1A", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#282828" },
  btnSel: { backgroundColor: "#FFD60A", borderColor: "#FFD60A" },
  disabled: { opacity: 0.5 },
  label: { color: "#505050", fontSize: 13, fontFamily: "Inter_500Medium" },
  labelSel: { color: "#0D0D0D" },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function MeterScreen() {
  const insets = useSafeAreaInsets();
  const { status, elapsedMs, distanceKm, fare, tariff, vehicle, gpsError, wakeLockActive, setTariff, setVehicle, start, stop, reset } = useLiveMeter();
  const [showTariffPicker, setShowTariffPicker] = useState(false);
  const pulseRef = useRef(false);

  // Gentle vibration pulse every 10 seconds while running (native only)
  useEffect(() => {
    if (status !== "running" || Platform.OS === "web") return;
    const id = setInterval(() => {
      if (!pulseRef.current) return;
      Vibration.vibrate(30);
    }, 10000);
    pulseRef.current = true;
    return () => { pulseRef.current = false; clearInterval(id); };
  }, [status]);

  const handleStart = useCallback(() => {
    Vibration.vibrate(40);
    start();
  }, [start]);

  const handleStop = useCallback(() => {
    if (Platform.OS !== "web") Vibration.vibrate([0, 40, 60, 40]);
    stop();
  }, [stop]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const totalFare = fare?.total ?? 0;
  const isRunning = status === "running";
  const isStopped = status === "stopped";
  const isIdle = status === "idle";

  return (
    <View style={[s.root, { paddingTop: Platform.OS === "web" ? 0 : insets.top }]}>
      <StatusBar style="light" />

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>מונה חי</Text>
          <Text style={s.subtitle}>
            {isIdle ? "מוכן להתחיל" : isRunning ? "נסיעה פעילה" : "נסיעה הסתיימה"}
          </Text>
        </View>
        <TariffBadge
          tariff={tariff}
          onPress={() => !isRunning && setShowTariffPicker((x) => !x)}
        />
      </View>

      {/* ── Tariff picker ───────────────────────────────────── */}
      {showTariffPicker && (
        <View style={s.tariffPicker}>
          {([1, 2, 3] as TariffType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.tariffRow, tariff === t && s.tariffRowSel]}
              onPress={() => { setTariff(t); setShowTariffPicker(false); }}
              activeOpacity={0.7}
            >
              <Text style={[s.tariffLabel, tariff === t && s.tariffLabelSel]}>
                {TARIFF_RATES[t].nameHe}
              </Text>
              <Text style={s.tariffDesc}>{TARIFF_RATES[t].description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 72 : 62) + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Main fare display ──────────────────────────────── */}
        <View style={[s.fareCard, isRunning && s.fareCardActive, isStopped && s.fareCardStopped]}>
          {/* Live indicator row */}
          <View style={s.fareCardTopRow}>
            {isRunning ? (
              <View style={s.liveDot}>
                <View style={s.liveDotInner} />
                <Text style={s.liveLabel}>LIVE</Text>
              </View>
            ) : <View />}
            {/* Wake Lock badge — screen is being kept on */}
            {wakeLockActive && (
              <View style={s.wakeBadge}>
                <Feather name="sun" size={11} color="#34C759" />
                <Text style={s.wakeBadgeText}>מסך פעיל</Text>
              </View>
            )}
          </View>

          <Text style={s.fareLabel}>סה"כ לתשלום</Text>
          <Text style={[s.fareAmount, isRunning && s.fareAmountActive]}>
            ₪{totalFare.toFixed(2)}
          </Text>

          {/* Stats row — two bordered boxes side by side */}
          <View style={{ flexDirection: "row", width: "100%", gap: 10, marginTop: 16 }}>
            {/* Distance box — מרחק */}
            <View style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#FFD60A55",
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 12,
              alignItems: "center",
              backgroundColor: "#0D0D0D",
            }}>
              <Text style={{ color: "#808060", fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 4 }}>מרחק</Text>
              <Text style={{ color: isRunning ? "#FFD60A" : "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold", includeFontPadding: false }}>
                {distanceKm.toFixed(2)}
              </Text>
              <Text style={{ color: "#606050", fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 }}>ק"מ</Text>
            </View>

            {/* Duration box — זמן */}
            <View style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#FFD60A55",
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 12,
              alignItems: "center",
              backgroundColor: "#0D0D0D",
            }}>
              <Text style={{ color: "#808060", fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 4 }}>זמן</Text>
              <Text style={{ color: isRunning ? "#FFD60A" : "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold", includeFontPadding: false }}>
                {formatElapsed(elapsedMs)}
              </Text>
              <Text style={{ color: "#606050", fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 }}>שע:דק:שנ</Text>
            </View>
          </View>
        </View>

        {/* ── GPS warning ────────────────────────────────────── */}
        {gpsError && (
          <View style={s.gpsBanner}>
            <Feather name="alert-triangle" size={14} color="#FF9500" />
            <Text style={s.gpsBannerText}>{gpsError}</Text>
          </View>
        )}

        {/* ── Background status banner ───────────────────────── */}
        {isRunning && (
          <View style={s.bgBanner}>
            <Feather name="shield" size={13} color="#34C759" />
            <Text style={s.bgBannerText}>
              {"GPS ומונה פועלים גם ברקע ועם מסך נעול · לסיים — לחץ על \"עצור\""}
            </Text>
          </View>
        )}

        {/* ── Fare breakdown ─────────────────────────────────── */}
        {fare && (status === "running" || status === "stopped") && (
          <View style={s.breakdown}>
            <Text style={s.breakdownTitle}>פירוט מחיר</Text>
            <BreakdownRow label="מינימום" amount={fare.baseFare} />
            <BreakdownRow label={`מרחק (${distanceKm.toFixed(2)} ק"מ)`} amount={fare.distanceFare} />
            <BreakdownRow label={`זמן (${Math.floor(elapsedMs / 60000)} דק')`} amount={fare.timeFare} />
            {fare.vehicleSurcharge > 0 && (
              <BreakdownRow label="תוספת רכב גדול" amount={fare.vehicleSurcharge} />
            )}
            {fare.extraSurcharges.map((x) => (
              <BreakdownRow
                key={x.key}
                label={SURCHARGE_RATES[x.key as keyof typeof SURCHARGE_RATES]?.labelHe ?? x.key}
                amount={x.amount}
              />
            ))}
            <View style={s.breakdownTotal}>
              <Text style={s.breakdownTotalLabel}>סה"כ</Text>
              <Text style={s.breakdownTotalAmount}>₪{fare.total.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* ── Vehicle selector (only when idle or stopped) ───── */}
        {!isRunning && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>סוג רכב</Text>
            <VehicleToggle vehicle={vehicle} onChange={setVehicle} disabled={isRunning} />
          </View>
        )}

        {/* ── Tariff info rows ───────────────────────────────── */}
        {isIdle && (
          <View style={s.tariffInfo}>
            <Feather name="zap" size={13} color="#FFD60A" />
            <Text style={s.tariffInfoText}>
              התעריף מזוהה אוטומטית לפי שעה ויום. ניתן לשנות ידנית למעלה.
            </Text>
          </View>
        )}

      </ScrollView>

      {/* ── Action buttons — floats above the tab bar ──────────── */}
      <View style={[s.actions, { bottom: Platform.OS === "web" ? 72 : 62 + insets.bottom }]}>
        {isIdle && (
          <TouchableOpacity style={s.startBtn} onPress={handleStart} activeOpacity={0.85}>
            <Feather name="play" size={22} color="#0D0D0D" />
            <Text style={s.startBtnText}>הפעל מונה</Text>
          </TouchableOpacity>
        )}

        {isRunning && (
          <TouchableOpacity style={s.stopBtn} onPress={handleStop} activeOpacity={0.85}>
            <Feather name="square" size={22} color="#FFFFFF" />
            <Text style={s.stopBtnText}>עצור וסיכום</Text>
          </TouchableOpacity>
        )}

        {isStopped && (
          <View style={s.doneRow}>
            <TouchableOpacity style={s.resetBtn} onPress={handleReset} activeOpacity={0.85}>
              <Feather name="refresh-cw" size={18} color="#FFD60A" />
              <Text style={s.resetBtnText}>נסיעה חדשה</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function BreakdownRow({ label, amount }: { label: string; amount: number }) {
  if (amount <= 0) return null;
  return (
    <View style={bd.row}>
      <Text style={bd.label}>{label}</Text>
      <Text style={bd.amount}>₪{amount.toFixed(2)}</Text>
    </View>
  );
}

const bd = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  label: { color: "#808080", fontSize: 14, fontFamily: "Inter_400Regular" },
  amount: { color: "#C0C0C0", fontSize: 14, fontFamily: "Inter_500Medium" },
});

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0D0D0D" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 56 : 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1E1E1E",
  },
  title: { color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "right" },
  subtitle: { color: "#505050", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "right" },

  tariffPicker: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#111111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    overflow: "hidden",
  },
  tariffRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#1E1E1E" },
  tariffRowSel: { backgroundColor: "#FFD60A0D" },
  tariffLabel: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tariffLabelSel: { color: "#FFD60A" },
  tariffDesc: { color: "#505050", fontSize: 12, fontFamily: "Inter_400Regular" },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 14 },

  fareCard: {
    backgroundColor: "#111111",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  fareCardActive: {
    borderColor: "#FFD60A44",
    backgroundColor: "#111111",
    ...Platform.select({
      ios: { shadowColor: "#FFD60A", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 8 },
      web: { boxShadow: "0 0 40px #FFD60A22" },
    }),
  },
  fareCardStopped: { borderColor: "#34C75944" },

  fareCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    minHeight: 24,
    marginBottom: 2,
  },

  liveDot: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B30" },
  liveLabel: { color: "#FF3B30", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },

  wakeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#34C75918",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#34C75940",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  wakeBadgeText: { color: "#34C759", fontSize: 11, fontFamily: "Inter_600SemiBold" },

  fareLabel: { color: "#606060", fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  fareAmount: {
    color: "#FFFFFF",
    fontSize: 64,
    fontFamily: "Inter_700Bold",
    letterSpacing: -2,
    textAlign: "center",
  },
  fareAmountActive: { color: "#FFD60A" },

  statsRow: { flexDirection: "row", alignItems: "center", gap: 32, marginTop: 16 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  statValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statValueActive: { color: "#FFD60A" },
  statUnit: { color: "#A0A0A0", fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  statUnitActive: { color: "#FFD60A" },
  statDivider: { width: 1, height: 48, backgroundColor: "#303030" },

  gpsBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FF950015",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF950030",
    padding: 12,
  },
  gpsBannerText: { flex: 1, color: "#FF9500", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },

  bgBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#34C75910",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#34C75930",
    padding: 12,
  },
  bgBannerText: { flex: 1, color: "#34C759", fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 18 },

  breakdown: {
    backgroundColor: "#111111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 16,
    gap: 2,
  },
  breakdownTitle: { color: "#606060", fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "right", marginBottom: 6, letterSpacing: 0.5 },
  breakdownTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#282828",
    paddingTop: 10,
    marginTop: 6,
  },
  breakdownTotalLabel: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  breakdownTotalAmount: { color: "#FFD60A", fontSize: 17, fontFamily: "Inter_700Bold" },

  section: { gap: 8 },
  sectionLabel: { color: "#606060", fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "right", letterSpacing: 0.5 },

  tariffInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFD60A08",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFD60A20",
    padding: 12,
  },
  tariffInfoText: { flex: 1, color: "#808060", fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 18 },

  actions: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#1E1E1E",
    backgroundColor: "#0D0D0D",
    zIndex: 10,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 10 },
      web: { boxShadow: "0 -4px 16px rgba(0,0,0,0.5)" },
    }),
  },

  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FFD60A",
    borderRadius: 18,
    paddingVertical: 20,
    ...Platform.select({
      ios: { shadowColor: "#FFD60A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14 },
      android: { elevation: 8 },
      web: { boxShadow: "0 6px 24px #FFD60A55" },
    }),
  },
  startBtnText: { color: "#0D0D0D", fontSize: 19, fontFamily: "Inter_700Bold" },

  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FF3B30",
    borderRadius: 18,
    paddingVertical: 20,
    ...Platform.select({
      ios: { shadowColor: "#FF3B30", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14 },
      android: { elevation: 8 },
      web: { boxShadow: "0 6px 24px #FF3B3055" },
    }),
  },
  stopBtnText: { color: "#FFFFFF", fontSize: 19, fontFamily: "Inter_700Bold" },

  doneRow: { gap: 10 },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#161616",
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#FFD60A44",
  },
  resetBtnText: { color: "#FFD60A", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
