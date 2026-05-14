import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSubscription, type PlanType } from "@/contexts/SubscriptionContext";
import { useTranslation } from "@/contexts/LanguageContext";

function daysRemaining(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const now = new Date();
  // Use start of today for cleaner day counts
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryStart = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const diffMs = expiryStart.getTime() - todayStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function buildLabel(
  days: number,
  planType: PlanType,
  t: {
    trialLabel: string;
    paidLabel: string;
    daysLeftPlural: string;
    dayLeftSingular: string;
    expiresToday: string;
  },
): string {
  const prefix = planType === "trial" ? t.trialLabel : t.paidLabel;
  if (days <= 0) return `${prefix}: ${t.expiresToday}`;
  if (days === 1) return `${prefix}: ${t.dayLeftSingular}`;
  return `${prefix}: ${days} ${t.daysLeftPlural}`;
}

export function SubscriptionCountdown() {
  const { expiryDate, planType, isAdminLifetime, isLoading } = useSubscription();
  const { t } = useTranslation();

  // Recalculate once per minute so the label stays fresh if the app is left open
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    if (!expiryDate) { setDays(null); return; }
    setDays(daysRemaining(expiryDate));
    const id = setInterval(() => setDays(daysRemaining(expiryDate)), 60_000);
    return () => clearInterval(id);
  }, [expiryDate]);

  // Admin lifetime has no expiry — hide the badge
  if (isAdminLifetime || isLoading || !expiryDate || !planType || days === null) {
    return null;
  }

  const isUrgent = days <= 1;
  const label = buildLabel(days, planType, t);

  return (
    <View style={[styles.pill, isUrgent && styles.pillUrgent]}>
      <Feather
        name={isUrgent ? "alert-circle" : "clock"}
        size={11}
        color={isUrgent ? "#FF3B30" : "#888888"}
      />
      <Text style={[styles.text, isUrgent && styles.textUrgent]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1A1A1A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  pillUrgent: {
    backgroundColor: "#FF3B3012",
    borderColor: "#FF3B3044",
  },
  text: {
    color: "#666666",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  textUrgent: {
    color: "#FF3B30",
  },
});
