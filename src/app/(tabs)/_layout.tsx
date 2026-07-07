/* ============================================================
   (tabs)/_layout.tsx  ―  タブ構成（SPEC.md §4.1）
   タブは4つ：ホーム / 予約履歴 / クーポン / 設定
============================================================ */

import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: { fontFamily: fonts.sans, fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.white },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "予約履歴",
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="coupons"
        options={{
          title: "クーポン",
          tabBarIcon: ({ color, size }) => <Feather name="gift" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
