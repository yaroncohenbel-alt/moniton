import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useTranslation } from "@/contexts/LanguageContext";

export default function TabLayout() {
  const isIOS = Platform.OS === "ios";
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#FFD60A",
        tabBarInactiveTintColor: "#404040",
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#0A0A0A",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: "#1E1E1E",
          elevation: 0,
          height: Platform.OS === "web" ? 72 : 62,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0A0A0A" }]} />
          ),
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.calculate.split(" ")[0],
          tabBarIcon: ({ color }) => <Feather name="dollar-sign" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="meter"
        options={{
          tabBarLabel: "הפעלת מונה",
          tabBarActiveTintColor: "#0D0D0D",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tab.meterWrap : tab.meterWrapInactive}>
              {/* FontAwesome5 clock — taxi meter / timer icon */}
              <FontAwesome5
                name="clock"
                solid
                size={focused ? 20 : 22}
                color={focused ? "#0D0D0D" : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="info"
        options={{
          title: t.tariff,
          tabBarIcon: ({ color }) => <Feather name="info" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="subscribe"
        options={{
          title: t.language === "שפה" ? "מנוי" : "Plan",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tab.activeWrap : undefined}>
              <Feather name="credit-card" size={22} color={focused ? "#0D0D0D" : color} />
            </View>
          ),
          tabBarActiveTintColor: "#0D0D0D",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.settings,
          tabBarIcon: ({ color }) => <Feather name="settings" size={22} color={color} />,
        }}
      />
      {/* Admin tab hidden from bar — accessible via /admin route */}
      <Tabs.Screen
        name="admin"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const tab = StyleSheet.create({
  activeWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFD60A",
    alignItems: "center",
    justifyContent: "center",
  },
  meterWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFD60A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    ...Platform.select({
      ios: { shadowColor: "#FFD60A", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.55, shadowRadius: 10 },
      android: { elevation: 6 },
      web: { boxShadow: "0 3px 14px #FFD60A77" },
    }),
  },
  meterWrapInactive: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
