import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useSubscription, ADMIN_PIN } from "@/contexts/SubscriptionContext";
import { AdminTotpSetup, getAdminSessionToken } from "@/components/AdminTotpSetup";

const ADMIN_TOKEN_KEY = "@taximeter_admin_session_v1";

type UserStatus = "pending" | "active" | "expired";

interface ServerUser {
  id: string;
  name: string;
  phone: string;
  status: UserStatus;
  expiryDate: string | null;
  registeredAt: string;
  hasDevice: boolean;
}

const STATUS_COLORS: Record<UserStatus, string> = {
  active: "#34C759",
  pending: "#FF9F0A",
  expired: "#FF453A",
};
const STATUS_LABELS: Record<UserStatus, string> = {
  active: "פעיל",
  pending: "ממתין",
  expired: "פג תוקף",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── User card ────────────────────────────────────────────────────────────────
function UserCard({ user, adminToken, onRefresh }: { user: ServerUser; adminToken: string; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false);

  const activate = async (months: number) => {
    const label = months === 1 ? "חודש" : months === 12 ? "שנה" : `${months} חודשים`;
    Alert.alert("הפעל מנוי", `להוסיף ${label} ל-${user.name}?`, [
      { text: "ביטול", style: "cancel" },
      {
        text: "אישור", onPress: async () => {
          setBusy(true);
          try {
            await fetch(`/api/taxi/users/${user.id}/activate`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
              body: JSON.stringify({ months }),
            });
            onRefresh();
          } finally { setBusy(false); }
        },
      },
    ]);
  };

  const resetDevice = async () => {
    Alert.alert("איפוס מכשיר", `לאפס את כריכת המכשיר של ${user.name}?`, [
      { text: "ביטול", style: "cancel" },
      {
        text: "איפוס", style: "destructive", onPress: async () => {
          await fetch(`/api/taxi/users/${user.id}/reset-device`, {
            method: "POST",
            headers: { "x-admin-token": adminToken },
          });
          onRefresh();
        },
      },
    ]);
  };

  const del = async () => {
    Alert.alert("מחק משתמש", `למחוק את ${user.name}?`, [
      { text: "ביטול", style: "cancel" },
      {
        text: "מחק", style: "destructive", onPress: async () => {
          await fetch(`/api/taxi/users/${user.id}`, {
            method: "DELETE",
            headers: { "x-admin-token": adminToken },
          });
          onRefresh();
        },
      },
    ]);
  };

  const statusColor = STATUS_COLORS[user.status];

  return (
    <View style={card.container}>
      <View style={card.header}>
        <View style={card.statusRow}>
          <View style={[card.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[card.statusText, { color: statusColor }]}>{STATUS_LABELS[user.status]}</Text>
          {user.hasDevice && (
            <View style={card.deviceBadge}>
              <Feather name="smartphone" size={10} color="#34C759" />
              <Text style={card.deviceText}>כרוך</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={del} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="trash-2" size={15} color="#505050" />
        </TouchableOpacity>
      </View>

      <View style={card.infoRow}>
        <Text style={card.name}>{user.name}</Text>
        <Text style={card.phone}>{user.phone}</Text>
      </View>

      <View style={card.dateRow}>
        <Text style={card.dateLabel}>תוקף עד:</Text>
        <Text style={[card.dateValue, !user.expiryDate && { color: "#505050" }]}>
          {formatDate(user.expiryDate)}
        </Text>
      </View>

      {busy && <ActivityIndicator color="#FFD60A" size="small" />}

      <View style={card.actions}>
        <TouchableOpacity style={card.addMonthBtn} onPress={() => activate(1)} disabled={busy} activeOpacity={0.8}>
          <Feather name="plus" size={14} color="#FFD60A" />
          <Text style={card.addMonthText}>+חודש</Text>
        </TouchableOpacity>
        <TouchableOpacity style={card.addYearBtn} onPress={() => activate(12)} disabled={busy} activeOpacity={0.8}>
          <Feather name="plus" size={14} color="#0D0D0D" />
          <Text style={card.addYearText}>+שנה</Text>
        </TouchableOpacity>
        {user.hasDevice && (
          <TouchableOpacity style={card.resetBtn} onPress={resetDevice} activeOpacity={0.8}>
            <Feather name="smartphone" size={14} color="#808080" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  container: { backgroundColor: "#111111", borderRadius: 18, borderWidth: 1, borderColor: "#1E1E1E", padding: 16, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  deviceBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#34C75918", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: "#34C75933" },
  deviceText: { color: "#34C759", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  infoRow: { alignItems: "flex-end", gap: 2 },
  name: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "right" },
  phone: { color: "#808080", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  dateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#181818", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  dateLabel: { color: "#606060", fontSize: 12, fontFamily: "Inter_400Regular" },
  dateValue: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 8 },
  addMonthBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#FFD60A18", borderRadius: 12, paddingVertical: 11, borderWidth: 1, borderColor: "#FFD60A44" },
  addMonthText: { color: "#FFD60A", fontSize: 14, fontFamily: "Inter_700Bold" },
  addYearBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#FFD60A", borderRadius: 12, paddingVertical: 11 },
  addYearText: { color: "#0D0D0D", fontSize: 14, fontFamily: "Inter_700Bold" },
  resetBtn: { width: 44, alignItems: "center", justifyContent: "center", backgroundColor: "#1A1A1A", borderRadius: 12, borderWidth: 1, borderColor: "#282828" },
});

// ── PIN screen ────────────────────────────────────────────────────────────────
function PinScreen({ onPinOk }: { onPinOk: () => void }) {
  const insets = useSafeAreaInsets();
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
    <View style={[p.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />
      <View style={p.lockIcon}><Feather name="lock" size={28} color="#FFD60A" /></View>
      <Text style={p.title}>לוח ניהול</Text>
      <Text style={p.subtitle}>שלב 1: הזן קוד מנהל</Text>
      <View style={p.dots}>
        {[0,1,2,3].map((i) => (
          <View key={i} style={[p.dot, pin.length > i && p.dotFilled, error && p.dotError]} />
        ))}
      </View>
      {error && <Text style={p.errorText}>קוד שגוי</Text>}
      <View style={p.grid}>
        {DIGITS.map((d, i) => (
          <TouchableOpacity key={i} style={[p.key, !d && p.keyEmpty]}
            onPress={() => { if (!d) return; if (d === "⌫") setPin((x) => x.slice(0,-1)); else handleDigit(d); }}
            disabled={!d} activeOpacity={0.7}>
            <Text style={p.keyText}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const p = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center", gap: 12 },
  lockIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#FFD60A15", borderWidth: 1, borderColor: "#FFD60A44", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { color: "#606060", fontSize: 14, fontFamily: "Inter_400Regular" },
  dots: { flexDirection: "row", gap: 14, marginVertical: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: "#404040", backgroundColor: "transparent" },
  dotFilled: { backgroundColor: "#FFD60A", borderColor: "#FFD60A" },
  dotError: { backgroundColor: "#FF453A", borderColor: "#FF453A" },
  errorText: { color: "#FF453A", fontSize: 13, fontFamily: "Inter_500Medium", marginTop: -4 },
  grid: { flexDirection: "row", flexWrap: "wrap", width: 240, gap: 12, marginTop: 8 },
  key: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#282828", alignItems: "center", justifyContent: "center" },
  keyEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
  keyText: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_400Regular" },
});

// ── Main admin screen ─────────────────────────────────────────────────────────
type AuthStep = "pin" | "totp" | "unlocked";

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { activateAdminLifetime } = useSubscription();
  const [authStep, setAuthStep] = useState<AuthStep>("pin");
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [users, setUsers] = useState<ServerUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Check for existing valid session
  useEffect(() => {
    getAdminSessionToken().then((t) => {
      if (t) { setAdminToken(t); setAuthStep("unlocked"); }
    });
  }, []);

  const fetchUsers = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/taxi/users", { headers: { "x-admin-token": token } });
      if (!res.ok) { setAuthStep("pin"); setAdminToken(null); return; }
      setUsers(await res.json() as ServerUser[]);
    } finally { setLoading(false); }
  }, []);

  const handleTotpSuccess = useCallback(async () => {
    const token = await getAdminSessionToken();
    if (!token) return;
    setAdminToken(token);
    await activateAdminLifetime();
    setAuthStep("unlocked");
    await fetchUsers(token);
  }, [activateAdminLifetime, fetchUsers]);

  useEffect(() => {
    if (authStep === "unlocked" && adminToken) {
      void fetchUsers(adminToken);
    }
  }, [authStep, adminToken, fetchUsers]);

  if (authStep === "pin") {
    return <PinScreen onPinOk={() => setAuthStep("totp")} />;
  }

  if (authStep === "totp") {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
        <StatusBar style="light" />
        <AdminTotpSetup
          onSuccess={handleTotpSuccess}
          onDismiss={() => setAuthStep("pin")}
        />
      </View>
    );
  }

  const pending = users.filter((u) => u.status === "pending");
  const active = users.filter((u) => u.status === "active");
  const expired = users.filter((u) => u.status === "expired");
  const sorted = [...pending, ...active, ...expired];

  return (
    <View style={adm.container}>
      <StatusBar style="light" />
      <View style={[adm.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 6 }]}>
        <View style={adm.headerLeft}>
          <Feather name="shield" size={14} color="#FFD60A" />
          <Text style={adm.adminBadge}>מנהל</Text>
        </View>
        <Text style={adm.title}>לוח ניהול</Text>
      </View>

      <View style={adm.statsBar}>
        {[
          { n: pending.length, label: "ממתינים", color: "#FF9F0A" },
          { n: active.length, label: "פעילים", color: "#34C759" },
          { n: expired.length, label: "פג תוקף", color: "#FF453A" },
          { n: users.length, label: "סה״כ", color: "#FFFFFF" },
        ].map((s, i, arr) => (
          <React.Fragment key={s.label}>
            <View style={adm.stat}>
              <Text style={[adm.statNum, { color: s.color }]}>{s.n}</Text>
              <Text style={adm.statLabel}>{s.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={adm.statDiv} />}
          </React.Fragment>
        ))}
      </View>

      <ScrollView
        style={adm.flex}
        contentContainerStyle={[adm.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 80 : 24) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => adminToken && fetchUsers(adminToken)}
            tintColor="#FFD60A"
          />
        }
      >
        {sorted.length === 0 ? (
          <View style={adm.empty}>
            <Feather name="users" size={40} color="#303030" />
            <Text style={adm.emptyText}>אין משתמשים עדיין</Text>
            <Text style={adm.emptySubText}>משתמשים יופיעו כאן לאחר שישלחו בקשת מנוי</Text>
          </View>
        ) : (
          sorted.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              adminToken={adminToken!}
              onRefresh={() => adminToken && fetchUsers(adminToken)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const adm = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#222222", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFD60A18", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: "#FFD60A33" },
  adminBadge: { color: "#FFD60A", fontSize: 12, fontFamily: "Inter_700Bold" },
  title: { color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "right" },
  statsBar: { flexDirection: "row", backgroundColor: "#111111", borderBottomWidth: 1, borderBottomColor: "#1A1A1A", paddingVertical: 14, paddingHorizontal: 20, alignItems: "center", justifyContent: "space-between" },
  stat: { alignItems: "center", flex: 1 },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { color: "#505050", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  statDiv: { width: 1, height: 30, backgroundColor: "#222222" },
  content: { padding: 14, gap: 10 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { color: "#404040", fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubText: { color: "#303030", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
});
