import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { TariffType } from "@/constants/tariff";
import { useTranslation } from "@/contexts/LanguageContext";

interface TariffSelectorProps {
  value: TariffType;
  autoDetected: boolean;
  onChange: (t: TariffType) => void;
  onToggleAuto: () => void;
}

const TARIFFS: TariffType[] = [1, 2, 3];

export function TariffSelector({ value, autoDetected, onChange, onToggleAuto }: TariffSelectorProps) {
  const { t, isRTL } = useTranslation();
  const align = isRTL ? "right" : "left" as const;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.headerRow, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
        <TouchableOpacity style={styles.autoBtn} onPress={onToggleAuto} activeOpacity={0.7}>
          <Feather
            name={autoDetected ? "zap" : "edit-2"}
            size={13}
            color={autoDetected ? "#FFD60A" : "#A0A0A0"}
          />
          <Text style={[styles.autoText, autoDetected && styles.autoTextActive]}>
            {autoDetected ? t.autoDetected : t.manualOverride}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.label, { textAlign: align }]}>{t.tariff}</Text>
      </View>
      <View style={styles.row}>
        {TARIFFS.map((num) => {
          const selected = value === num;
          return (
            <TouchableOpacity
              key={num}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => onChange(num)}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                {t.tariffNames[num - 1]}
              </Text>
              <Text style={[styles.optionDesc, selected && styles.optionDescSelected]} numberOfLines={2}>
                {t.tariffDescs[num - 1]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  headerRow: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    color: "#A0A0A0",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  autoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  autoText: {
    color: "#606060",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  autoTextActive: {
    color: "#FFD60A",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  option: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#2A2A2A",
    backgroundColor: "#1E1E1E",
    gap: 4,
  },
  optionSelected: {
    backgroundColor: "#FFD60A18",
    borderColor: "#FFD60A",
  },
  optionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  optionTitleSelected: {
    color: "#FFD60A",
  },
  optionDesc: {
    color: "#606060",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  optionDescSelected: {
    color: "#FFD60A99",
  },
});
