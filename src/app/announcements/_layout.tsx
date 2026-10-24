/* ============================================================
   announcements/_layout.tsx  ―  お知らせの詳細
   ------------------------------------------------------------
   一覧はタブ（(tabs)/announcements.tsx）、本文はこちらの画面。
   以前は一覧の中で開閉していたが、何件も届くと境目が分かりにくく、
   本文も読みづらかった（2026-10-24 発注者の指摘）。

   ★ 戻るボタンは自前で置く。通知から直接この画面に飛んでくることが
     あり、そのときは一覧を経由していないので端末標準の戻るが出ない。
============================================================ */

import { Stack, useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function AnnouncementsLayout() {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/announcements");
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.sansMedium },
        headerShadowVisible: false,
        headerLeft: () => (
          <TouchableOpacity
            onPress={goBack}
            hitSlop={HIT_SLOP}
            style={styles.back}
            accessibilityLabel="お知らせの一覧に戻る"
          >
            <Feather name="chevron-left" size={26} color={colors.text} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="[id]" options={{ title: "お知らせ" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  /* 端末標準の戻る矢印と同じくらいの位置に寄せる */
  back: { paddingLeft: 6, paddingRight: 10, paddingVertical: 4 },
});
