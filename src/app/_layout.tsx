/* ============================================================
   _layout.tsx  ―  ルートレイアウト（SPEC.md §4.1）
   ------------------------------------------------------------
   ・フォント読込（HPと同じ3書体）
   ・ログイン状態で (tabs) / (onboarding) を出し分け（Stack.Protected）
   ・通知タップ時の deep link ハンドラは Phase 4 で追加する
============================================================ */

import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useFonts as useCormorantFonts, CormorantGaramond_600SemiBold } from "@expo-google-fonts/cormorant-garamond";
import { useFonts as useNotoSerifFonts, NotoSerifJP_600SemiBold } from "@expo-google-fonts/noto-serif-jp";
import {
  useFonts as useNotoSansFonts,
  NotoSansJP_400Regular,
  NotoSansJP_500Medium,
  NotoSansJP_700Bold,
} from "@expo-google-fonts/noto-sans-jp";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { startAnalytics } from "@/lib/analytics";
import { colors } from "@/theme";

function LoadingView() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.gold} size="large" />
    </View>
  );
}

function RootNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) return <LoadingView />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!token}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reserve" options={{ presentation: "modal" }} />
      </Stack.Protected>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [cormorantLoaded] = useCormorantFonts({ CormorantGaramond_600SemiBold });
  const [notoSerifLoaded] = useNotoSerifFonts({ NotoSerifJP_600SemiBold });
  const [notoSansLoaded] = useNotoSansFonts({ NotoSansJP_400Regular, NotoSansJP_500Medium, NotoSansJP_700Bold });
  const fontsReady = cormorantLoaded && notoSerifLoaded && notoSansLoaded;

  useEffect(() => {
    startAnalytics();
  }, []);

  if (!fontsReady) return <LoadingView />;

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
