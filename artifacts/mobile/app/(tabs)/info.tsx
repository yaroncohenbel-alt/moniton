import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { TARIFF_RATES } from "@/constants/tariff";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "@/contexts/LanguageContext";

function InfoRow({
  label,
  value,
  isRTL,
}: {
  label: string;
  value: string;
  isRTL: boolean;
}) {
  return (
    <View style={[info.row, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
      <Text style={info.value}>{value}</Text>
      <Text style={info.label}>{label}</Text>
    </View>
  );
}

const info = StyleSheet.create({
  row: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  label: {
    color: "#A0A0A0",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  value: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});

export default function InfoScreen() {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();
  const align = isRTL ? "right" : "left" as const;

  const tariffColors: Record<number, string> = {
    1: "#34C759",
    2: "#FF9F0A",
    3: "#FF453A",
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 60 : insets.top + 8 }]}>
        <Text style={[styles.title, { textAlign: align }]}>{t.surchargesTitle.replace("חיוב", "").trim() || t.tariff}</Text>
        <Text style={[styles.subtitle, { textAlign: align }]}>Israel 2026</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 80 : 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {([1, 2, 3] as const).map((num) => {
          const rates = TARIFF_RATES[num];
          const color = tariffColors[num];
          return (
            <View key={num} style={styles.card}>
              <View style={[styles.cardHeader, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
                <View style={[styles.tariffBadge, { backgroundColor: color + "22", borderColor: color + "55" }]}>
                  <Text style={[styles.tariffBadgeText, { color }]}>{t.tariffNames[num - 1]}</Text>
                </View>
                <Text style={[styles.cardDesc, { textAlign: align, marginLeft: isRTL ? 10 : 0, marginRight: isRTL ? 0 : 10 }]}>
                  {t.tariffDescs[num - 1]}
                </Text>
              </View>
              <View style={styles.divider} />
              <InfoRow label={t.baseFare}    value={`₪${rates.baseFare.toFixed(2)}`}   isRTL={isRTL} />
              <View style={styles.rowDivider} />
              <InfoRow label={`/${t.km}`}    value={`₪${rates.perKm.toFixed(2)}`}      isRTL={isRTL} />
              <View style={styles.rowDivider} />
              <InfoRow label={`/${t.minutes}`} value={`₪${rates.perMinute.toFixed(2)}`} isRTL={isRTL} />
            </View>
          );
        })}

        <View style={styles.card}>
          <View style={[styles.cardHeader, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
            <View style={[styles.tariffBadge, { backgroundColor: "#5856D622", borderColor: "#5856D655" }]}>
              <Feather name="box" size={13} color="#5856D6" />
              <Text style={[styles.tariffBadgeText, { color: "#5856D6" }]}>{t.large}</Text>
            </View>
            <Text style={[styles.cardDesc, { textAlign: align }]}>{t.largeSub}</Text>
          </View>
          <View style={styles.divider} />
          <InfoRow label={t.largeVehicleSurcharge} value="25%" isRTL={isRTL} />
        </View>

        <View style={styles.card}>
          <View style={[styles.cardHeader, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
            <View style={[styles.tariffBadge, { backgroundColor: "#FFD60A22", borderColor: "#FFD60A55" }]}>
              <Feather name="calendar" size={13} color="#FFD60A" />
              <Text style={[styles.tariffBadgeText, { color: "#FFD60A" }]}>{t.schedule}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <InfoRow label={t.bookingFee} value="₪5.90" isRTL={isRTL} />
        </View>

        <View style={styles.noteCard}>
          <Feather name="info" size={16} color="#606060" />
          <Text style={[styles.noteText, { textAlign: align }]}>
            {t.tariffNames[0]} — {t.tariffDescs[0]}{"\n"}
            {t.tariffNames[1]} — {t.tariffDescs[1]}{"\n"}
            {t.tariffNames[2]} — {t.tariffDescs[2]}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2A2A2A",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: "#606060",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#111111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 16,
  },
  cardHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  tariffBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  tariffBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  cardDesc: {
    color: "#606060",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#2A2A2A",
    marginVertical: 10,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1E1E1E",
  },
  noteCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#111111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 16,
    alignItems: "flex-start",
  },
  noteText: {
    color: "#606060",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
});
