/* ============================================================
   (tabs)/_layout.tsx  ―  タブ構成（SPEC.md §4.1）
   タブは4つ：ホーム / 予約履歴 / クーポン / 設定
   デザイン提案05適用：上ボーダーを消して上向きの淡い影で浮かせ、
   アクティブタブに金の小さなドットを添える。
============================================================ */

import React from "react";
import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";

function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      <Feather name={name} size={22} color={color} />
      <View style={[styles.dot, { opacity: focused ? 1 : 0 }]} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.goldDeep,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: { fontFamily: fonts.sans, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          shadowColor: "#000",
          shadowOpacity: 0.07,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 16,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "予約履歴",
          tabBarIcon: ({ color, focused }) => <TabIcon name="calendar" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="coupons"
        options={{
          title: "クーポン",
          tabBarIcon: ({ color, focused }) => <TabIcon name="gift" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
          tabBarIcon: ({ color, focused }) => <TabIcon name="settings" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gold,
    marginTop: 2,
  },
});
