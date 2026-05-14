import React, { useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "@/contexts/LanguageContext";

interface DateTimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const { t, isRTL } = useTranslation();
  const align = isRTL ? "right" : "left" as const;

  const [modalVisible, setModalVisible] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return d;
  });

  const isNow = value === null;

  function formatDateTime(date: Date | null) {
    if (!date) return t.now;
    const d = date;
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openModal() {
    const d = value ?? new Date();
    d.setMinutes(d.getMinutes() + (value ? 0 : 30));
    setTempDate(d);
    setModalVisible(true);
  }

  function confirm() {
    onChange(tempDate);
    setModalVisible(false);
  }

  function setNow() {
    onChange(null);
    setModalVisible(false);
  }

  function adjustField(field: "day" | "hour" | "minute", delta: number) {
    setTempDate((prev) => {
      const d = new Date(prev);
      if (field === "day") d.setDate(d.getDate() + delta);
      if (field === "hour") d.setHours((d.getHours() + delta + 24) % 24);
      if (field === "minute") d.setMinutes((d.getMinutes() + delta + 60) % 60);
      return d;
    });
  }

  const dayDisplay = `${t.days[tempDate.getDay()]} ${pad(tempDate.getDate())}/${pad(tempDate.getMonth() + 1)}`;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { textAlign: align }]}>{t.dateTime}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.nowBtn, isNow && styles.nowBtnActive]}
          onPress={() => onChange(null)}
          activeOpacity={0.8}
        >
          <Feather name="clock" size={16} color={isNow ? "#0D0D0D" : "#A0A0A0"} />
          <Text style={[styles.nowText, isNow && styles.nowTextActive]}>{t.now}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scheduleBtn, !isNow && styles.scheduleBtnActive]}
          onPress={openModal}
          activeOpacity={0.8}
        >
          <Feather name="calendar" size={16} color={!isNow ? "#FFD60A" : "#A0A0A0"} />
          <Text style={[styles.scheduleText, !isNow && styles.scheduleTextActive]}>
            {isNow ? t.schedule : formatDateTime(value)}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t.pickDateTime}</Text>

            <View style={styles.pickerRow}>
              <SpinnerField
                label={t.dayLabel}
                display={dayDisplay}
                onUp={() => adjustField("day", 1)}
                onDown={() => adjustField("day", -1)}
              />
              <Text style={styles.colon}>:</Text>
              <SpinnerField
                label={t.hourLabel}
                display={pad(tempDate.getHours())}
                onUp={() => adjustField("hour", 1)}
                onDown={() => adjustField("hour", -1)}
              />
              <Text style={styles.colon}>:</Text>
              <SpinnerField
                label={t.minuteLabel}
                display={pad(tempDate.getMinutes())}
                onUp={() => adjustField("minute", 5)}
                onDown={() => adjustField("minute", -5)}
              />
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={confirm} activeOpacity={0.8}>
              <Text style={styles.confirmText}>{t.confirm}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nowModalBtn} onPress={setNow} activeOpacity={0.8}>
              <Feather name="clock" size={16} color="#FFD60A" />
              <Text style={styles.nowModalText}>{t.rideNow}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SpinnerField({
  label,
  display,
  onUp,
  onDown,
}: {
  label: string;
  display: string;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <View style={spinner.col}>
      <Text style={spinner.label}>{label}</Text>
      <TouchableOpacity onPress={onUp} style={spinner.btn} activeOpacity={0.7}>
        <Feather name="chevron-up" size={22} color="#FFD60A" />
      </TouchableOpacity>
      <View style={spinner.valueBox}>
        <Text style={spinner.value}>{display}</Text>
      </View>
      <TouchableOpacity onPress={onDown} style={spinner.btn} activeOpacity={0.7}>
        <Feather name="chevron-down" size={22} color="#FFD60A" />
      </TouchableOpacity>
    </View>
  );
}

const spinner = StyleSheet.create({
  col: { alignItems: "center", flex: 1 },
  label: { color: "#606060", fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8 },
  btn: { padding: 8 },
  valueBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    minWidth: 64,
    alignItems: "center",
  },
  value: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
});

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: {
    color: "#A0A0A0",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  row: { flexDirection: "row", gap: 10 },
  nowBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#2A2A2A",
    backgroundColor: "#1E1E1E",
  },
  nowBtnActive: {
    backgroundColor: "#FFD60A",
    borderColor: "#FFD60A",
  },
  nowText: {
    color: "#A0A0A0",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  nowTextActive: {
    color: "#0D0D0D",
  },
  scheduleBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#2A2A2A",
    backgroundColor: "#1E1E1E",
  },
  scheduleBtnActive: {
    borderColor: "#FFD60A55",
    backgroundColor: "#FFD60A12",
  },
  scheduleText: {
    color: "#A0A0A0",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  scheduleTextActive: {
    color: "#FFD60A",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  sheet: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: "#2A2A2A",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#2A2A2A",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 24,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 28,
  },
  colon: {
    color: "#606060",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    alignSelf: "center",
    paddingTop: 24,
  },
  confirmBtn: {
    backgroundColor: "#FFD60A",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  confirmText: {
    color: "#0D0D0D",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  nowModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  nowModalText: {
    color: "#FFD60A",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
