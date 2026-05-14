/**
 * PaywallScreen — shown to users who are not yet active.
 * - Registers on the server (POST /api/taxi/register)
 * - Admin PIN long-press → TOTP verification
 * - Handles device_mismatch warning
 * - Stripe Checkout for card / Google Pay / Neema
 * - Bit / WhatsApp fallback
 */
import React, { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import { useAuth } from "@/hooks/useAuth";
import { useSubscription, ADMIN_PIN } from "@/contexts/SubscriptionContext";
import { AdminTotpSetup } from "@/components/AdminTotpSetup";

const ADMIN_PHONE = "972586789222";
const PLANS = {
  monthly: { label: "חודשי", price: "₪29", period: "לחודש", months: 1 },
  yearly:  { label: "שנתי",  price: "₪249", period: "לשנה",  months: 12, saving: "חסכון 30%" },
} as const;
type PlanKey = keyof typeof PLANS;

// ── Israeli ID validation ─────────────────────────────────────────────────────
function validateIsraeliId(id: string): boolean {
  const clean = id.trim().padStart(9, "0");
  if (!/^\d{9}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(clean[i]!, 10) * (i % 2 === 0 ? 1 : 2);
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  return sum % 10 === 0;
}

// ── PIN overlay → then TOTP ───────────────────────────────────────────────────
function PinOverlay({ onPinOk, onDismiss }: { onPinOk: () => void; onDismiss: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (next === ADMIN_PIN) { onPinOk(); }
      else { setTimeout(() => { setPin(""); setError(true); }, 300); }
    }
  };
  const DIGITS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <View style={ov.backdrop}>
      <View style={ov.sheet}>
        <View style={ov.lockIcon}><Feather name="lock" size={24} color="#FFD60A" /></View>
        <Text style={ov.title}>כניסת מנהל</Text>
        <Text style={ov.subtitle}>שלב 1: הזן קוד גישה</Text>
        <View style={ov.dots}>
          {[0,1,2,3].map((i) => (
            <View key={i} style={[ov.dot, pin.length > i && ov.dotFilled, error && ov.dotError]} />
          ))}
        </View>
        {error && <Text style={ov.errorText}>קוד שגוי</Text>}
        <View style={ov.grid}>
          {DIGITS.map((d, i) => (
            <TouchableOpacity key={i} style={[ov.key, !d && ov.keyEmpty]}
              onPress={() => { if (!d) return; if (d === "⌫") setPin((x) => x.slice(0,-1)); else handleDigit(d); }}
              disabled={!d} activeOpacity={0.7}>
              <Text style={ov.keyText}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={ov.cancelBtn} onPress={onDismiss}>
          <Text style={ov.cancelText}>ביטול</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ov = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", zIndex: 100 },
  sheet: { backgroundColor: "#111111", borderRadius: 24, borderWidth: 1, borderColor: "#1E1E1E", padding: 28, alignItems: "center", width: 300, gap: 10 },
  lockIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFD60A15", borderWidth: 1, borderColor: "#FFD60A44", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: { color: "#606060", fontSize: 13, fontFamily: "Inter_400Regular" },
  dots: { flexDirection: "row", gap: 12, marginVertical: 12 },
  dot: { width: 13, height: 13, borderRadius: 6.5, borderWidth: 1.5, borderColor: "#404040", backgroundColor: "transparent" },
  dotFilled: { backgroundColor: "#FFD60A", borderColor: "#FFD60A" },
  dotError: { backgroundColor: "#FF453A", borderColor: "#FF453A" },
  errorText: { color: "#FF453A", fontSize: 12, fontFamily: "Inter_500Medium", marginTop: -4 },
  grid: { flexDirection: "row", flexWrap: "wrap", width: 216, gap: 10, marginTop: 4 },
  key: { width: 62, height: 62, borderRadius: 31, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#282828", alignItems: "center", justifyContent: "center" },
  keyEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
  keyText: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_400Regular" },
  cancelBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24 },
  cancelText: { color: "#505050", fontSize: 14, fontFamily: "Inter_500Medium" },
});

// ── Registration form ────────────────────────────────────────────────────────
function RegisterForm({ onRegister }: { onRegister: (name: string, phone: string, israelId: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [israelId, setIsraelId] = useState("");
  const [busy, setBusy] = useState(false);
  const [idError, setIdError] = useState("");

  const handleIdChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 9);
    setIsraelId(digits);
    setIdError("");
  };

  const submit = async () => {
    if (!name.trim()) { Alert.alert("", "נא להזין שם מלא"); return; }
    if (phone.replace(/\D/g, "").length < 9) { Alert.alert("", "נא להזין מספר טלפון תקין"); return; }
    if (israelId.length < 5) { setIdError("נא להזין תעודת זהות"); return; }
    if (!validateIsraeliId(israelId)) { setIdError("תעודת הזהות אינה תקינה"); return; }
    setBusy(true);
    await onRegister(name.trim(), phone.trim(), israelId.trim());
    setBusy(false);
  };

  return (
    <View style={reg.container}>
      <View style={reg.iconWrap}><Feather name="user-plus" size={28} color="#FFD60A" /></View>
      <Text style={reg.title}>הרשמת נהג</Text>
      <Text style={reg.subtitle}>הרשם וקבל 7 ימי ניסיון חינמי מיידי, ללא תשלום</Text>
      <View style={reg.fields}>
        <View style={reg.inputRow}>
          <Feather name="user" size={16} color="#505050" />
          <TextInput style={reg.input} value={name} onChangeText={setName}
            placeholder="שם מלא" placeholderTextColor="#404040" textAlign="right" autoCorrect={false} />
        </View>
        <View style={reg.inputRow}>
          <Feather name="phone" size={16} color="#505050" />
          <TextInput style={reg.input} value={phone} onChangeText={setPhone}
            placeholder="מספר טלפון" placeholderTextColor="#404040" textAlign="right" keyboardType="phone-pad" />
        </View>
        <View style={[reg.inputRow, !!idError && reg.inputRowError]}>
          <Feather name="credit-card" size={16} color={idError ? "#FF453A" : "#505050"} />
          <TextInput
            style={reg.input}
            value={israelId}
            onChangeText={handleIdChange}
            placeholder="תעודת זהות (9 ספרות)"
            placeholderTextColor="#404040"
            textAlign="right"
            keyboardType="number-pad"
            maxLength={9}
          />
          {israelId.length === 9 && validateIsraeliId(israelId) && (
            <Feather name="check-circle" size={16} color="#34C759" />
          )}
        </View>
        {!!idError && <Text style={reg.idErrorText}>{idError}</Text>}
        <Text style={reg.idHint}>מספר ת"ז משמש למניעת שימוש כפול בתקופת הניסיון</Text>
      </View>
      <TouchableOpacity style={[reg.btn, busy && { opacity: 0.5 }]} onPress={submit} disabled={busy} activeOpacity={0.85}>
        <Text style={reg.btnText}>{busy ? "רושם..." : "הרשמה"}</Text>
        <Feather name="arrow-left" size={18} color="#0D0D0D" />
      </TouchableOpacity>
    </View>
  );
}

const reg = StyleSheet.create({
  container: { alignItems: "center", gap: 14, paddingVertical: 8 },
  iconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#FFD60A15", borderWidth: 1, borderColor: "#FFD60A44", alignItems: "center", justifyContent: "center" },
  title: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { color: "#606060", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  fields: { width: "100%", gap: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1A1A1A", borderRadius: 14, borderWidth: 1, borderColor: "#282828", paddingHorizontal: 14, paddingVertical: Platform.OS === "ios" ? 14 : 10 },
  inputRowError: { borderColor: "#FF453A44", backgroundColor: "#1F1414" },
  input: { flex: 1, color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  idErrorText: { color: "#FF453A", fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "right", marginTop: -4 },
  idHint: { color: "#404040", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 16 },
  btn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#FFD60A", borderRadius: 16, paddingVertical: 18,
    ...Platform.select({ ios: { shadowColor: "#FFD60A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }, android: { elevation: 6 }, web: { boxShadow: "0 4px 16px #FFD60A44" } }) },
  btnText: { color: "#0D0D0D", fontSize: 17, fontFamily: "Inter_700Bold" },
});

// ── Payment / pending view ────────────────────────────────────────────────────
type PayState = "idle" | "opening_gpay" | "opening_card" | "stripe_pending";
type PayMethod = "gpay" | "card";

function PayView({ name, phone, status, onLogout, onRefresh }: {
  name: string; phone: string;
  status: "pending" | "expired" | "not_found" | "device_mismatch" | "unknown";
  onLogout: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [plan, setPlan] = useState<PlanKey>("monthly");
  const [payState, setPayState] = useState<PayState>("idle");
  const [sending, setSending] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const cfg = status === "device_mismatch"
    ? { color: "#FF453A", label: "מכשיר לא מורשה", sub: "החשבון כבר כרוך למכשיר אחר. פנה למנהל לאיפוס." }
    : status === "expired"
      ? { color: "#FF453A", label: "תקופת הניסיון החינמי פגה", sub: "רכוש מנוי כדי להמשיך להשתמש באפליקציה" }
      : status === "pending"
        ? { color: "#FFD60A", label: "ניסיון חינמי פעיל", sub: "בחר מנוי להמשך השימוש לאחר תום הניסיון" }
        : { color: "#808080", label: "בחר תוכנית מנוי", sub: "גישה מלאה לכל התכונות" };

  const openStripeCheckout = async (method: PayMethod) => {
    setStripeError(null);
    setPayState(method === "gpay" ? "opening_gpay" : "opening_card");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, plan, method }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `שגיאת שרת (${res.status})`);
      }
      const { url } = (await res.json()) as { url: string };
      await Linking.openURL(url);
      setPayState("stripe_pending");
    } catch (err) {
      setPayState("idle");
      const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
      setStripeError(msg);
    }
  };

  const sendWhatsApp = async () => {
    setSending(true);
    setStripeError(null);
    const { label, price } = PLANS[plan];
    const text = `שלום, אני ${name} (${phone}).\nאני רוצה לשלם מנוי ${label} (${price}) ל-Moniton.\nנא לאשר. תודה!`;
    const url = `whatsapp://send?phone=${ADMIN_PHONE}&text=${encodeURIComponent(text)}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else await Linking.openURL(`https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(text)}`);
    } catch { Alert.alert("", "לא ניתן לפתוח וואטסאפ."); }
    finally { setSending(false); }
  };

  const handleRefresh = async () => {
    setPayState("idle");
    setStripeError(null);
    await onRefresh();
  };

  const isOpeningAny = payState === "opening_gpay" || payState === "opening_card";

  return (
    <View style={pay.container}>
      {/* Status badge */}
      <View style={[pay.statusCard, { borderColor: cfg.color + "44" }]}>
        <View style={[pay.dot, { backgroundColor: cfg.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={[pay.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={pay.statusSub}>{cfg.sub}</Text>
        </View>
      </View>

      <Text style={pay.greeting}>שלום, {name}</Text>

      {status !== "device_mismatch" && payState !== "stripe_pending" && (
        <>
          {/* Plan selector */}
          <View style={pay.planRow}>
            {(Object.keys(PLANS) as PlanKey[]).map((pk) => {
              const info = PLANS[pk];
              const sel = plan === pk;
              return (
                <TouchableOpacity key={pk} style={[pay.planCard, sel && pay.planCardSel]} onPress={() => setPlan(pk)} activeOpacity={0.8}>
                  {"saving" in info && <View style={pay.saveBadge}><Text style={pay.saveText}>{info.saving}</Text></View>}
                  <Text style={[pay.planLabel, sel && pay.planLabelSel]}>{info.label}</Text>
                  <Text style={[pay.planPrice, sel && pay.planPriceSel]}>{info.price}</Text>
                  <Text style={[pay.planPeriod, sel && pay.planPeriodSel]}>{info.period}</Text>
                  {sel && <View style={pay.check}><Text style={pay.checkMark}>✓</Text></View>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section title */}
          <Text style={pay.sectionTitle}>בחר אמצעי תשלום</Text>

          {/* ── Google Pay button ── */}
          <TouchableOpacity
            style={[pay.gpayBtn, isOpeningAny && { opacity: 0.6 }]}
            onPress={() => void openStripeCheckout("gpay")}
            disabled={isOpeningAny}
            activeOpacity={0.85}
          >
            <View style={pay.gpayLeft}>
              {/* Google "G" colored logo */}
              <View style={pay.gLogoRing}>
                <Text style={pay.gLogoText}>G</Text>
              </View>
              <View>
                <Text style={pay.gpayTitle}>
                  {payState === "opening_gpay" ? "פותח..." : "Google Pay"}
                </Text>
                <Text style={pay.gpaySub}>תשלום מהיר ומאובטח · ללא הקלדה</Text>
              </View>
            </View>
            <Feather name="arrow-left" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* ── Credit Card / Neema button ── */}
          <TouchableOpacity
            style={[pay.cardBtn, isOpeningAny && { opacity: 0.6 }]}
            onPress={() => void openStripeCheckout("card")}
            disabled={isOpeningAny}
            activeOpacity={0.85}
          >
            <View style={pay.cardBtnLeft}>
              <View style={pay.cardIconWrap}>
                <Feather name="credit-card" size={17} color="#FFFFFF" />
              </View>
              <View>
                <Text style={pay.cardBtnTitle}>
                  {payState === "opening_card" ? "פותח..." : "כרטיס אשראי / Neema"}
                </Text>
                <Text style={pay.cardBtnSub}>ויזה · מאסטרקארד · Neema · SSL</Text>
              </View>
            </View>
            <Feather name="arrow-left" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* ── Stripe error message ── */}
          {!!stripeError && (
            <View style={pay.errorBox}>
              <Feather name="alert-circle" size={14} color="#FF453A" />
              <Text style={pay.errorText}>
                {stripeError.includes("שרת") || stripeError.includes("500")
                  ? "שירות התשלום אינו זמין כרגע. נסה שוב מאוחר יותר, או שלם דרך Bit למטה."
                  : stripeError}
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={pay.divider}>
            <View style={pay.dividerLine} />
            <Text style={pay.dividerText}>או</Text>
            <View style={pay.dividerLine} />
          </View>

          {/* ── Bit / WhatsApp ── */}
          <TouchableOpacity
            style={[pay.bitBtn, sending && { opacity: 0.5 }]}
            onPress={sendWhatsApp}
            disabled={sending}
            activeOpacity={0.85}
          >
            <View style={pay.bitIcon}><Text style={pay.bitIconText}>bit</Text></View>
            <Text style={pay.bitBtnText}>{sending ? "שולח..." : "שלם עם Bit / וואטסאפ"}</Text>
            <Feather name="arrow-left" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={pay.note}>
            {plan === "yearly" ? "₪249 לשנה · " : "₪29 לחודש · "}
            תשלום מאובטח · אישור תוך דקות
          </Text>
        </>
      )}

      {/* ── After opening Stripe — waiting for webhook ── */}
      {payState === "stripe_pending" && (
        <View style={pay.pendingBox}>
          <View style={pay.pendingIconWrap}>
            <Feather name="clock" size={28} color="#FFD60A" />
          </View>
          <Text style={pay.pendingTitle}>ממתין לאישור תשלום</Text>
          <Text style={pay.pendingDesc}>
            לאחר השלמת התשלום, לחץ על "בדוק מנוי" כדי לאמת את הרכישה.
          </Text>
          <TouchableOpacity style={pay.refreshBtn} onPress={handleRefresh} activeOpacity={0.85}>
            <Feather name="refresh-cw" size={16} color="#0D0D0D" />
            <Text style={pay.refreshBtnText}>בדוק מנוי</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pay.backBtn} onPress={() => setPayState("idle")}>
            <Text style={pay.backBtnText}>חזור לבחירת תשלום</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={pay.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
        <Feather name="log-out" size={14} color="#505050" />
        <Text style={pay.logoutText}>החלף חשבון</Text>
      </TouchableOpacity>
    </View>
  );
}

const pay = StyleSheet.create({
  container: { gap: 12 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#161616", borderRadius: 14, padding: 14, borderWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  statusLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  statusSub: { color: "#606060", fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
  greeting: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "right" },

  // Plan cards
  planRow: { flexDirection: "row", gap: 10 },
  planCard: { flex: 1, backgroundColor: "#161616", borderRadius: 16, borderWidth: 1.5, borderColor: "#222222", padding: 16, alignItems: "center", gap: 3, position: "relative", overflow: "hidden" },
  planCardSel: { borderColor: "#FFD60A", backgroundColor: "#FFD60A0D" },
  saveBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "#34C759", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  saveText: { color: "#FFFFFF", fontSize: 9, fontFamily: "Inter_700Bold" },
  planLabel: { color: "#606060", fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  planLabelSel: { color: "#FFD60A" },
  planPrice: { color: "#FFFFFF", fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 2 },
  planPriceSel: { color: "#FFD60A" },
  planPeriod: { color: "#505050", fontSize: 12, fontFamily: "Inter_400Regular" },
  planPeriodSel: { color: "#A08000" },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFD60A", alignItems: "center", justifyContent: "center", marginTop: 6 },
  checkMark: { color: "#0D0D0D", fontSize: 13, fontFamily: "Inter_700Bold" },

  sectionTitle: { color: "#404040", fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 4 },

  // ── Google Pay button ──────────────────────────────────────────────────────
  gpayBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#1A73E8", borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18,
    ...Platform.select({
      ios: { shadowColor: "#1A73E8", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14 },
      android: { elevation: 8 },
      web: { boxShadow: "0 6px 20px #1A73E855" },
    }),
  },
  gpayLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  gLogoRing: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
  },
  gLogoText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#1A73E8" },
  gpayTitle: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  gpaySub: { color: "#FFFFFFBB", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },

  // ── Credit Card / Neema button ─────────────────────────────────────────────
  cardBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#1E1E2E", borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18,
    borderWidth: 1.5, borderColor: "#635BFF55",
    ...Platform.select({
      ios: { shadowColor: "#635BFF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: "0 4px 16px #635BFF33" },
    }),
  },
  cardBtnLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  cardIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: "#635BFF",
    alignItems: "center", justifyContent: "center",
  },
  cardBtnTitle: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  cardBtnSub: { color: "#AAAACC", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },

  // ── Error message ──────────────────────────────────────────────────────────
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#FF453A14", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#FF453A33",
  },
  errorText: { color: "#FF453A", fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18, textAlign: "right" },

  // ── Divider ────────────────────────────────────────────────────────────────
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 2 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#282828" },
  dividerText: { color: "#404040", fontSize: 12, fontFamily: "Inter_400Regular" },

  // ── Bit button ─────────────────────────────────────────────────────────────
  bitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#7B2FBE", borderRadius: 16, paddingVertical: 15,
    ...Platform.select({
      ios: { shadowColor: "#7B2FBE", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: "0 4px 16px #7B2FBE44" },
    }),
  },
  bitIcon: { backgroundColor: "#FFFFFF", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  bitIconText: { color: "#7B2FBE", fontSize: 12, fontFamily: "Inter_700Bold" },
  bitBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },

  note: { color: "#404040", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 17 },

  // ── Pending state ──────────────────────────────────────────────────────────
  pendingBox: { backgroundColor: "#131313", borderRadius: 18, borderWidth: 1, borderColor: "#FFD60A22", padding: 22, alignItems: "center", gap: 12 },
  pendingIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFD60A12", borderWidth: 1, borderColor: "#FFD60A33", alignItems: "center", justifyContent: "center" },
  pendingTitle: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  pendingDesc: { color: "#606060", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  refreshBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFD60A", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 4,
    ...Platform.select({ web: { boxShadow: "0 4px 14px #FFD60A44" } }),
  },
  refreshBtnText: { color: "#0D0D0D", fontSize: 16, fontFamily: "Inter_700Bold" },
  backBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  backBtnText: { color: "#505050", fontSize: 13, fontFamily: "Inter_400Regular" },

  // ── Logout ─────────────────────────────────────────────────────────────────
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: "#181818", borderRadius: 12, borderWidth: 1, borderColor: "#282828" },
  logoutText: { color: "#505050", fontSize: 14, fontFamily: "Inter_500Medium" },
});

// ── Main paywall screen ──────────────────────────────────────────────────────
type AdminFlow = "none" | "pin" | "totp";

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { driver, loading: authLoading, register, logout } = useAuth();
  const { activateAdminLifetime, registerOnServer, refreshSubscription, serverStatus, deviceMismatch } = useSubscription();
  const [adminFlow, setAdminFlow] = useState<AdminFlow>("none");

  const handleRegister = useCallback(async (name: string, phone: string, israelId: string) => {
    await register(name, phone, israelId);
    await registerOnServer(name, phone);
    await refreshSubscription();
  }, [register, registerOnServer, refreshSubscription]);

  const handleLogout = useCallback(() => {
    Alert.alert("התנתקות", "להתנתק מהחשבון?", [
      { text: "ביטול", style: "cancel" },
      { text: "התנתק", style: "destructive", onPress: () => void logout() },
    ]);
  }, [logout]);

  const handleTotpSuccess = useCallback(async () => {
    setAdminFlow("none");
    await activateAdminLifetime();
  }, [activateAdminLifetime]);

  if (authLoading) return <View style={s.loadingBg} />;

  const currentStatus = deviceMismatch ? "device_mismatch"
    : (serverStatus as "pending" | "expired" | "not_found" | "unknown") ?? "unknown";

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      {adminFlow === "pin" && (
        <PinOverlay
          onPinOk={() => setAdminFlow("totp")}
          onDismiss={() => setAdminFlow("none")}
        />
      )}
      {adminFlow === "totp" && (
        <AdminTotpSetup
          onSuccess={handleTotpSuccess}
          onDismiss={() => setAdminFlow("none")}
        />
      )}

      <View style={[s.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 16 }]}>
        <TouchableOpacity
          onLongPress={() => { Vibration.vibrate(40); setAdminFlow("pin"); }}
          delayLongPress={800}
          activeOpacity={1}
        >
          <Text style={s.appName}>Taxi Meter Pro</Text>
          <Text style={s.tagline}>מחשבון מונית חכם לישראל</Text>
        </TouchableOpacity>
        <View style={s.lockBadge}>
          <Feather name="lock" size={13} color="#808080" />
          <Text style={s.lockText}>מנוי נדרש</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={s.flex}
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 80 : 32) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.card}>
            {!driver ? (
              <RegisterForm onRegister={handleRegister} />
            ) : (
              <PayView
                name={driver.name}
                phone={driver.phone}
                status={currentStatus}
                onLogout={handleLogout}
                onRefresh={refreshSubscription}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  loadingBg: { flex: 1, backgroundColor: "#0D0D0D" },
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  flex: { flex: 1 },
  header: { paddingHorizontal: 22, paddingBottom: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#1E1E1E", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  appName: { color: "#FFD60A", fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tagline: { color: "#555555", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "right" },
  lockBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#1A1A1A", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#2A2A2A" },
  lockText: { color: "#606060", fontSize: 12, fontFamily: "Inter_500Medium" },
  content: { padding: 16 },
  card: { backgroundColor: "#111111", borderRadius: 20, borderWidth: 1, borderColor: "#1E1E1E", padding: 20 },
});
