import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Admin lifetime view ────────────────────────────────────────────────────────
function AdminLifetimeView() {
  return (
    <View style={adm.container}>
      <View style={adm.badge}>
        <Feather name="shield" size={36} color="#FFD60A" />
      </View>
      <Text style={adm.title}>Admin</Text>
      <View style={adm.pill}>
        <View style={adm.dot} />
        <Text style={adm.pillText}>Lifetime Active</Text>
      </View>
      <View style={adm.features}>
        {["גישה מלאה לכל התכונות", "ללא מגבלת זמן", "פעיל לצמיתות"].map((f) => (
          <View key={f} style={adm.featureRow}>
            <Feather name="check" size={14} color="#FFD60A" />
            <Text style={adm.featureText}>{f}</Text>
          </View>
        ))}
      </View>
      <Text style={adm.note}>הפעלת מנהל אומתה באמצעות קוד הגישה.</Text>
    </View>
  );
}

const adm = StyleSheet.create({
  container: { alignItems: "center", gap: 14, paddingVertical: 16 },
  badge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#FFD60A15", borderWidth: 1, borderColor: "#FFD60A44",
    alignItems: "center", justifyContent: "center",
  },
  title: { color: "#FFFFFF", fontSize: 28, fontFamily: "Inter_700Bold" },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "#FFD60A15", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: "#FFD60A33",
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFD60A" },
  pillText: { color: "#FFD60A", fontSize: 14, fontFamily: "Inter_700Bold" },
  features: { width: "100%", gap: 8, marginTop: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  featureText: { color: "#808080", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "right" },
  note: { color: "#404040", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
});

// ── Active subscription view ───────────────────────────────────────────────────
function ActiveView({ name, expiry, onLogout }: { name: string; expiry: string | null; onLogout: () => void }) {
  return (
    <View style={active.container}>
      <View style={active.badge}>
        <Feather name="check-circle" size={36} color="#34C759" />
      </View>
      <Text style={active.label}>מנוי פעיל</Text>
      <Text style={active.name}>{name}</Text>
      <View style={active.expiryRow}>
        <Text style={active.expiryLabel}>תוקף עד:</Text>
        <Text style={active.expiryValue}>{formatDate(expiry)}</Text>
      </View>
      <View style={active.features}>
        {["גישה מלאה לכל התכונות", "חישוב מחיר מדויק", "שיתוף בוואטסאפ"].map((f) => (
          <View key={f} style={active.featureRow}>
            <Feather name="check" size={14} color="#34C759" />
            <Text style={active.featureText}>{f}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={active.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
        <Feather name="log-out" size={14} color="#505050" />
        <Text style={active.logoutText}>התנתק</Text>
      </TouchableOpacity>
    </View>
  );
}

const active = StyleSheet.create({
  container: { alignItems: "center", gap: 12, paddingVertical: 16 },
  badge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#34C75918", borderWidth: 1, borderColor: "#34C75944",
    alignItems: "center", justifyContent: "center",
  },
  label: { color: "#34C759", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  name: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  expiryRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#181818", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: "#242424",
  },
  expiryLabel: { color: "#606060", fontSize: 13, fontFamily: "Inter_400Regular" },
  expiryValue: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  features: { width: "100%", gap: 8, marginTop: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  featureText: { color: "#808080", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "right" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8,
    paddingVertical: 10, paddingHorizontal: 20,
    backgroundColor: "#181818", borderRadius: 12, borderWidth: 1, borderColor: "#282828",
  },
  logoutText: { color: "#505050", fontSize: 14, fontFamily: "Inter_500Medium" },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SubscribeScreen() {
  const insets = useSafeAreaInsets();
  const { isAdminLifetime } = useSubscription();
  const { driver, logout } = useAuth();
  const { users } = useUsers();

  const handleLogout = async () => {
    const { Alert } = await import("react-native");
    Alert.alert("התנתקות", "להתנתק מהחשבון?", [
      { text: "ביטול", style: "cancel" },
      { text: "התנתק", style: "destructive", onPress: () => void logout() },
    ]);
  };

  const userEntry = driver ? users.find((u) => u.phone === driver.phone) : null;

  return (
    <View style={s.container}>
      <StatusBar style="light" />
      <View style={[s.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 6 }]}>
        <Text style={s.title}>מנוי Taxi Meter Pro</Text>
        <Text style={s.subtitle}>ניהול מנוי לנהגים</Text>
      </View>

      <ScrollView
        style={s.flex}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 80 : 24) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          {isAdminLifetime ? (
            <AdminLifetimeView />
          ) : (
            <ActiveView
              name={driver?.name ?? ""}
              expiry={userEntry?.expiryDate ?? null}
              onLogout={handleLogout}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#222222",
  },
  title: { color: "#FFFFFF", fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "right" },
  subtitle: { color: "#555555", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
  content: { padding: 14 },
  card: {
    backgroundColor: "#111111", borderRadius: 20, borderWidth: 1, borderColor: "#1E1E1E", padding: 20,
  },
});
