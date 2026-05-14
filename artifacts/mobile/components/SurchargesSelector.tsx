import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SURCHARGE_RATES, type SurchargeKey } from "@/constants/tariff";
import { useTranslation } from "@/contexts/LanguageContext";

interface Props {
  value: SurchargeKey;
  onChange: (updated: SurchargeKey) => void;
}

const KEYS = Object.keys(SURCHARGE_RATES) as (keyof SurchargeKey)[];

export function SurchargesSelector({ value, onChange }: Props) {
  const { t, isRTL } = useTranslation();
  const align = isRTL ? "right" : "left" as const;

  const toggle = (key: keyof SurchargeKey) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { textAlign: align }]}>{t.surchargesLabel}</Text>
      <View style={styles.grid}>
        {KEYS.map((key) => {
          const info = SURCHARGE_RATES[key];
          const active = value[key];
          const label = t.surchargeLabels[key as keyof typeof t.surchargeLabels] ?? info.labelHe;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(key)}
              activeOpacity={0.75}
            >
              <Text style={styles.chipIcon}>{info.icon}</Text>
              <View style={styles.chipText}>
                <Text style={[styles.chipLabel, active && styles.chipLabelActive, { textAlign: align }]}>
                  {label}
                </Text>
                <Text style={[styles.chipAmount, active && styles.chipAmountActive, { textAlign: align }]}>
                  +₪{info.amount.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.checkBox, active && styles.checkBoxActive]}>
                {active && <Text style={styles.checkMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  sectionLabel: {
    color: "#606060",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  grid: { gap: 7 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#242424",
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: "#FFD60A0E",
    borderColor: "#FFD60A55",
  },
  chipIcon: { fontSize: 18, width: 24, textAlign: "center" },
  chipText: { flex: 1 },
  chipLabel: {
    color: "#888888",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  chipLabelActive: { color: "#FFD60A" },
  chipAmount: {
    color: "#505050",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  chipAmountActive: { color: "#B09000" },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxActive: {
    backgroundColor: "#FFD60A",
    borderColor: "#FFD60A",
  },
  checkMark: {
    color: "#0D0D0D",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    lineHeight: 14,
  },
});
