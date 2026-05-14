import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useTranslation } from "@/contexts/LanguageContext";
import { LANGUAGE_META, type LangCode } from "@/constants/translations";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";

const LANGS = Object.keys(LANGUAGE_META) as LangCode[];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang, setLang, isRTL } = useTranslation();
  const { forceRefresh } = usePwaUpdate();
  const [refreshing, setRefreshing] = useState(false);

  const align = isRTL ? "right" : "left" as const;
  const rowDir = isRTL ? "row-reverse" : "row" as const;

  const handleForceRefresh = async () => {
    setRefreshing(true);
    await forceRefresh();
    // If we're on native (no reload), reset the spinner after a moment
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 56 : insets.top + 6 },
        ]}
      >
        <Text style={[styles.title, { textAlign: align }]}>{t.settings}</Text>
        <Text style={[styles.subtitle, { textAlign: align }]}>{t.language} & {t.appearance}</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 100 : 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Language section */}
        <Text style={[styles.sectionLabel, { textAlign: align }]}>{t.language}</Text>
        <View style={styles.langGrid}>
          {LANGS.map((code) => {
            const meta = LANGUAGE_META[code];
            const active = lang === code;
            return (
              <TouchableOpacity
                key={code}
                style={[styles.langCard, active && styles.langCardActive]}
                onPress={() => void setLang(code)}
                activeOpacity={0.8}
              >
                <Text style={styles.langFlag}>{meta.flag}</Text>
                <Text style={[styles.langNative, active && styles.langNativeActive]}>
                  {meta.nativeName}
                </Text>
                <Text style={[styles.langLabel, active && styles.langLabelActive]}>
                  {meta.label}
                </Text>
                {active && (
                  <View style={styles.checkBadge}>
                    <Feather name="check" size={11} color="#0D0D0D" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Direction indicator */}
        <View style={[styles.dirCard, { flexDirection: rowDir }]}>
          <View style={styles.dirIconWrap}>
            <Feather
              name={isRTL ? "align-right" : "align-left"}
              size={16}
              color="#FFD60A"
            />
          </View>
          <Text style={[styles.dirText, { textAlign: align }]}>
            {isRTL ? "ימין לשמאל — Right-to-Left (RTL)" : "Left-to-Right — שמאל לימין (LTR)"}
          </Text>
        </View>

        {/* ── App Update section ──────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { textAlign: align, marginTop: 8 }]}>
          {isRTL ? "עדכון האפליקציה" : "App Update"}
        </Text>
        <View style={styles.updateCard}>
          <View style={[styles.updateRow, { flexDirection: rowDir }]}>
            <View style={styles.updateIconWrap}>
              <Feather name="refresh-cw" size={18} color="#FFD60A" />
            </View>
            <View style={styles.updateTextWrap}>
              <Text style={[styles.updateTitle, { textAlign: align }]}>
                {isRTL ? "עדכון אוטומטי" : "Auto-Update"}
              </Text>
              <Text style={[styles.updateDesc, { textAlign: align }]}>
                {isRTL
                  ? "האפליקציה בודקת ומורידה עדכונים ברקע בכל פתיחה"
                  : "The app checks and downloads updates in the background on every launch"}
              </Text>
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>{isRTL ? "פעיל" : "On"}</Text>
            </View>
          </View>

          <View style={styles.updateDivider} />

          <TouchableOpacity
            style={[styles.forceRefreshBtn, refreshing && styles.forceRefreshBtnDisabled]}
            onPress={handleForceRefresh}
            disabled={refreshing}
            activeOpacity={0.8}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFD60A" />
            ) : (
              <Feather name="download-cloud" size={18} color="#FFD60A" />
            )}
            <Text style={styles.forceRefreshText}>
              {refreshing
                ? (isRTL ? "מנקה ומרענן..." : "Clearing & reloading...")
                : (isRTL ? "רענון כפוי — נקה מטמון וטען מחדש" : "Force Refresh — Clear cache & reload")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* About section */}
        <Text style={[styles.sectionLabel, { textAlign: align, marginTop: 8 }]}>{t.aboutApp}</Text>
        <View style={styles.aboutCard}>
          <View style={[styles.aboutRow, { flexDirection: rowDir }]}>
            <Text style={styles.aboutValue}>1.0.0</Text>
            <Text style={[styles.aboutLabel, { textAlign: align }]}>{t.version}</Text>
          </View>
          <View style={styles.aboutDivider} />
          <View style={[styles.aboutRow, { flexDirection: rowDir }]}>
            <Text style={styles.aboutValue}>Taxi Meter Pro</Text>
            <Text style={[styles.aboutLabel, { textAlign: align }]}>{t.appName}</Text>
          </View>
          <View style={styles.aboutDivider} />
          <View style={[styles.aboutRow, { flexDirection: rowDir }]}>
            <Text style={styles.aboutValue}>🇮🇱 Israel 2026</Text>
            <Text style={[styles.aboutLabel, { textAlign: align }]}>Tariffs</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222222",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: "#555555",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  content: { padding: 14, gap: 10 },
  sectionLabel: {
    color: "#606060",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  langGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  langCard: {
    width: "47%",
    backgroundColor: "#111111",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#1E1E1E",
    padding: 18,
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  langCardActive: {
    borderColor: "#FFD60A",
    backgroundColor: "#FFD60A0D",
  },
  langFlag: { fontSize: 32 },
  langNative: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  langNativeActive: { color: "#FFD60A" },
  langLabel: {
    color: "#505050",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  langLabelActive: { color: "#A08000" },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFD60A",
    alignItems: "center",
    justifyContent: "center",
  },
  dirCard: {
    backgroundColor: "#111111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 14,
    alignItems: "center",
    gap: 10,
  },
  dirIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFD60A15",
    alignItems: "center",
    justifyContent: "center",
  },
  dirText: {
    flex: 1,
    color: "#808080",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  // ── Update card ────────────────────────────────────────────────────────────
  updateCard: {
    backgroundColor: "#111111",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    overflow: "hidden",
  },
  updateRow: {
    padding: 16,
    alignItems: "center",
    gap: 12,
  },
  updateIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFD60A12",
    borderWidth: 1,
    borderColor: "#FFD60A30",
    alignItems: "center",
    justifyContent: "center",
  },
  updateTextWrap: { flex: 1 },
  updateTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  updateDesc: {
    color: "#606060",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#34C75918",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34C759",
  },
  activeText: {
    color: "#34C759",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  updateDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1E1E1E",
    marginHorizontal: 0,
  },
  forceRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  forceRefreshBtnDisabled: { opacity: 0.5 },
  forceRefreshText: {
    color: "#FFD60A",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  // ── About card ─────────────────────────────────────────────────────────────
  aboutCard: {
    backgroundColor: "#111111",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 4,
  },
  aboutRow: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  aboutLabel: {
    color: "#606060",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  aboutValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  aboutDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1E1E1E",
    marginHorizontal: 16,
  },
});
