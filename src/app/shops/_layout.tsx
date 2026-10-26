/* ============================================================
   shops/_layout.tsx  ―  店舗のご案内
   ------------------------------------------------------------
   ホームの「店舗一覧」から開く（2026-10-26 発注者の要望）。
   以前は押すと直接電話がかかっていたが、場所を確かめたい方や、
   押し間違いで電話がかかってしまう方がいるため、店舗ページを挟む。
   戻る矢印は ご利用履歴（bookings/_layout.tsx）と同じ作り。
============================================================ */

import { Stack, useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function ShopsLayout() {
  const router = useRouter();

  /* 戻る。履歴が無ければホームへ。 */
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

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
      <Stack.Screen name="[name]" options={{ title: "店舗のご案内" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  back: {
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 4,
  },
});
