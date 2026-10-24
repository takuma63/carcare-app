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
import { StyleSheet } from "react-native";
import { colors, fonts } from "@/theme";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function BookingsLayout() {
  const router = useRouter();

  /* 戻る。履歴が無ければ（通知から直接来たときなど）ホームへ。 */
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  /* ★ 両方の画面に置く。詳細は通知から直接開かれることがあり、
     そのときは端末標準の戻るが出ないため（一覧を経由していないので）。
     位置は端末標準の矢印に合わせて寄せてある
     （2026-10-24「左にずれている」との指摘）。 */
  const backButton = () => (
    <TouchableOpacity
      onPress={goBack}
      hitSlop={HIT_SLOP}
      style={styles.back}
      accessibilityLabel="前の画面に戻る"
    >
      <Feather name="chevron-left" size={26} color={colors.text} />
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

const styles = StyleSheet.create({
  /* 端末標準の戻る矢印と同じくらいの位置に寄せる。
     素のまま置くと左端に貼り付いて、見出しとの釣り合いが悪い。 */
  back: {
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 4,
  },
});
