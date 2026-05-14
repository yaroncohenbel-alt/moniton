import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { VehicleType } from "@/constants/tariff";
import { useTranslation } from "@/contexts/LanguageContext";

interface VehicleSelectorProps {
  value: VehicleType;
  onChange: (v: VehicleType) => void;
}

export function VehicleSelector({ value, onChange }: VehicleSelectorProps) {
  const { t, isRTL } = useTranslation();
  const align = isRTL ? "right" : "left" as const;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { textAlign: align }]}>{t.vehicleType}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.option, value === "regular" && styles.optionSelected]}
          onPress={() => onChange("regular")}
          activeOpacity={0.8}
        >
          <Feather
            name="truck"
            size={22}
            color={value === "regular" ? "#0D0D0D" : "#A0A0A0"}
          />
          <Text style={[styles.optionLabel, value === "regular" && styles.optionLabelSelected]}>
            {t.regular}
          </Text>
          <Text style={[styles.optionSub, value === "regular" && styles.optionSubSelected]}>
            {t.regularSub}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, value === "large" && styles.optionSelected]}
          onPress={() => onChange("large")}
          activeOpacity={0.8}
        >
          <Feather
            name="box"
            size={22}
            color={value === "large" ? "#0D0D0D" : "#A0A0A0"}
          />
          <Text style={[styles.optionLabel, value === "large" && styles.optionLabelSelected]}>
            {t.large}
          </Text>
          <Text style={[styles.optionSub, value === "large" && styles.optionSubSelected]}>
            {t.largeSub}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: {
    color: "#A0A0A0",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#2A2A2A",
    backgroundColor: "#1E1E1E",
    gap: 6,
  },
  optionSelected: {
    backgroundColor: "#FFD60A",
    borderColor: "#FFD60A",
  },
  optionLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  optionLabelSelected: {
    color: "#0D0D0D",
  },
  optionSub: {
    color: "#606060",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  optionSubSelected: {
    color: "#0D0D0D99",
  },
});
