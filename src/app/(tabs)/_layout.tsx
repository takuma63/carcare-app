/* ============================================================
   (tabs)/_layout.tsx  ―  タブ構成（SPEC.md §4.1）
   タブは4つ：ホーム / お知らせ / クーポン / 設定

   ★ 利用履歴ではなくお知らせをタブに置いている（2026-10-22）
     利用履歴は「見たいときに見に行くもの」で、常駐させる必要がない。
     お知らせは「気づいてもらう」のが仕事なので、タブに置いて
     未読バッジを出す。リピーター施策の効き方が変わるため。
     利用履歴はホーム画面に1行の導線を置いてある。
   デザイン提案05適用：上ボーダーを消して上向きの淡い影で浮かせ、
   アクティブタブに金の小さなドットを添える。
============================================================ */

import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { fetchMyAnnouncements } from "@/lib/api";
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
  const [unread, setUnread] = useState(0);

  /* 未読の件数。タブを切り替えるたびに取り直す（配信は不定期なため）。
     取れなくてもタブは出す（バッジが出ないだけ）。 */
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      fetchMyAnnouncements()
        .then((r) => { if (alive) setUnread(r.unread); })
        .catch(() => {});
      return () => { alive = false; };
    }, [])
  );

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
        name="announcements"
        options={{
          title: "お知らせ",
          tabBarIcon: ({ color, focused }) => <TabIcon name="bell" color={color} focused={focused} />,
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.gold, fontSize: 10 },
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
