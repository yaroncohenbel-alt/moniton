import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

interface Props {
  onAccept: () => Promise<void>;
}

const DISCLAIMER = {
  he: {
    title: "הבהרה משפטית",
    body: "אפליקציה זו נועדה למתן הערכת מחיר בלבד ואינה מהווה תחליף למונה המונית הרשמי. על פי הנחיות משרד התחבורה, חובה להפעיל מונה בכל נסיעה כנדרש על פי חוק. השימוש באפליקציה ובנתונים המוצגים בה הינו באחריות המשתמש בלבד. המפתח אינו נושא באחריות לכל אי-התאמה בין המחיר המשוער במחשבון לבין המחיר הסופי במונה.",
    checkbox: "אני מסכים/ה לתנאי השימוש",
    confirm: "אישור",
    lang: "עברית",
    dir: "rtl" as const,
  },
  ar: {
    title: "إخلاء مسؤولية قانوني",
    body: "تم تصميم هذا التطبيق لتقديم تقدير للسعر فقط، ولا يُعدّ بديلاً عن عداد التاكسي الرسمي. وفقاً لتعليمات وزارة النقل، يُلزَم بتشغيل العداد في كل رحلة كما يقتضي القانون. يتحمل المستخدم وحده مسؤولية استخدام التطبيق والبيانات المعروضة فيه. لا يتحمل المطور أي مسؤولية عن أي تفاوت بين السعر التقديري في الحاسبة والسعر النهائي على العداد.",
    checkbox: "أوافق على شروط الاستخدام",
    confirm: "تأكيد",
    lang: "العربية",
    dir: "rtl" as const,
  },
  ru: {
    title: "Правовая оговорка",
    body: "Настоящее приложение предназначено исключительно для оценки стоимости поездки и не является заменой официальному таксометру. Согласно указаниям Министерства транспорта, использование таксометра в каждой поездке обязательно по закону. Пользователь несёт единоличную ответственность за использование приложения и отображаемых в нём данных. Разработчик не несёт ответственности за любое расхождение между расчётной стоимостью в калькуляторе и итоговой стоимостью по таксометру.",
    checkbox: "Я согласен с условиями использования",
    confirm: "Подтвердить",
    lang: "Русский",
    dir: "ltr" as const,
  },
  en: {
    title: "Legal Disclaimer",
    body: "This app is designed to provide fare estimates only and does not replace the official taxi meter. According to Ministry of Transport guidelines, operating the meter on every ride is required by law. The user bears sole responsibility for using this app and the data displayed within it. The developer bears no responsibility for any discrepancy between the estimated fare shown in the calculator and the final fare shown on the meter.",
    checkbox: "I agree to the terms of use",
    confirm: "Confirm",
    lang: "English",
    dir: "ltr" as const,
  },
} as const;

type LangKey = keyof typeof DISCLAIMER;
const LANG_ORDER: LangKey[] = ["he", "ar", "ru", "en"];

export default function LegalDisclaimerScreen({ onAccept }: Props) {
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!checked) return;
    setConfirming(true);
    await onAccept();
    setConfirming(false);
  };

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={[s.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 16 }]}>
        <View style={s.iconWrap}>
          <Feather name="file-text" size={20} color="#FFD60A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.appName}>Taxi Meter Pro</Text>
          <Text style={s.headerSub}>יש לאשר לפני השימוש</Text>
        </View>
      </View>

      <ScrollView
        style={s.flex}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 100 : 40) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* One card per language */}
        {LANG_ORDER.map((lang) => {
          const d = DISCLAIMER[lang];
          const align = d.dir === "rtl" ? "right" : "left";
          return (
            <View key={lang} style={s.langCard}>
              <View style={[s.langHeader, { flexDirection: d.dir === "rtl" ? "row-reverse" : "row" }]}>
                <View style={s.langBadge}>
                  <Text style={s.langBadgeText}>{d.lang}</Text>
                </View>
                <Text style={[s.langTitle, { textAlign: align }]}>{d.title}</Text>
              </View>
              <View style={s.divider} />
              <Text style={[s.bodyText, { textAlign: align }]}>{d.body}</Text>
            </View>
          );
        })}

        {/* Checkbox */}
        <Pressable
          style={s.checkRow}
          onPress={() => setChecked((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
        >
          <View style={[s.checkbox, checked && s.checkboxChecked]}>
            {checked && <Feather name="check" size={14} color="#0D0D0D" />}
          </View>
          <Text style={s.checkLabel}>
            {DISCLAIMER.he.checkbox}
            {"\n"}
            <Text style={s.checkLabelSmall}>{DISCLAIMER.en.checkbox}</Text>
          </Text>
        </Pressable>

        {/* Confirm button */}
        <TouchableOpacity
          style={[s.confirmBtn, (!checked || confirming) && s.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!checked || confirming}
          activeOpacity={0.85}
        >
          <Feather name="check-circle" size={20} color="#0D0D0D" />
          <Text style={s.confirmText}>
            {confirming ? "..." : `${DISCLAIMER.he.confirm} / ${DISCLAIMER.en.confirm}`}
          </Text>
        </TouchableOpacity>

        <Text style={s.hint}>יש לגלול למעלה ולקרוא את כל תנאי השימוש לפני האישור.</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1E1E1E",
  },
  iconWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#FFD60A15", borderWidth: 1, borderColor: "#FFD60A44",
    alignItems: "center", justifyContent: "center",
  },
  appName: { color: "#FFD60A", fontSize: 20, fontFamily: "Inter_700Bold" },
  headerSub: { color: "#555555", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1, textAlign: "right" },
  scroll: { padding: 14, gap: 12 },
  langCard: {
    backgroundColor: "#111111", borderRadius: 16, borderWidth: 1, borderColor: "#1E1E1E", padding: 16, gap: 10,
  },
  langHeader: { alignItems: "center", gap: 10 },
  langBadge: {
    backgroundColor: "#1E1E1E", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "#2E2E2E",
  },
  langBadgeText: { color: "#808080", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  langTitle: { flex: 1, color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#1E1E1E" },
  bodyText: { color: "#A0A0A0", fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  checkRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#111111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 16,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: "#404040",
    backgroundColor: "transparent", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
  },
  checkboxChecked: { backgroundColor: "#FFD60A", borderColor: "#FFD60A" },
  checkLabel: { flex: 1, color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "right", lineHeight: 22 },
  checkLabelSmall: { color: "#606060", fontSize: 13, fontFamily: "Inter_400Regular" },
  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#FFD60A", borderRadius: 16, paddingVertical: 20,
    ...Platform.select({
      ios: { shadowColor: "#FFD60A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 18 },
      android: { elevation: 10 },
      web: { boxShadow: "0 6px 24px #FFD60A55" },
    }),
  },
  confirmBtnDisabled: {
    opacity: 0.3,
    ...Platform.select({ ios: { shadowOpacity: 0 }, web: { boxShadow: "none" } }),
  },
  confirmText: { color: "#0D0D0D", fontSize: 18, fontFamily: "Inter_700Bold" },
  hint: { color: "#353535", fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
