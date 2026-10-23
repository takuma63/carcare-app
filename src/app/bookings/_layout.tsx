/* ============================================================
   bookings/_layout.tsx  ―  ご利用履歴（一覧・詳細）
   ------------------------------------------------------------
   ★ 2026-10-23、実機で「戻れない」との指摘。
     この画面はタブから外してホームから開く形にしたため、
     一覧はこの入れ子スタックの先頭にあたり、戻るボタンが出なかった。
     詳細も、通知から直接開いたときは先頭になるので同じことが起きる。
     どちらにも自前の戻るボタンを置き、戻り先が無いときは
     ホームへ戻す。
============================================================ */

import { Stack, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function BookingsLayout() {
  const router = useRouter();

  /* 戻る。履歴が無ければ（通知から直接来たときなど）ホームへ。 */
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  const backButton = () => (
    <TouchableOpacity onPress={goBack} hitSlop={HIT_SLOP} accessibilityLabel="前の画面に戻る">
      <Feather name="arrow-left" size={22} color={colors.text} />
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.sansMedium },
        headerShadowVisible: false,
        headerLeft: backButton,
      }}
    >
      <Stack.Screen name="index" options={{ title: "ご利用履歴" }} />
      <Stack.Screen name="[id]" options={{ title: "予約詳細" }} />
    </Stack>
  );
}
