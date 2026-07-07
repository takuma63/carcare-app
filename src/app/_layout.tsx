/* ============================================================
   _layout.tsx  ―  ルートレイアウト（SPEC.md §4.1）
   ------------------------------------------------------------
   ・フォント読込（HPと同じ3書体）
   ・ログイン状態で (tabs) / (onboarding) を出し分け（Stack.Protected）
   ・起動時のプッシュ登録、通知タップ時のdeep link、フォアグラウンド
     受信時のアプリ内トースト（SPEC.md §4.3）
============================================================ */

import React, { useEffect, useRef, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import * as Notifications from "expo-notifications";
import { useFonts as useCormorantFonts, CormorantGaramond_600SemiBold } from "@expo-google-fonts/cormorant-garamond";
import { useFonts as useNotoSerifFonts, NotoSerifJP_600SemiBold } from "@expo-google-fonts/noto-serif-jp";
import {
  useFonts as useNotoSansFonts,
  NotoSansJP_400Regular,
  NotoSansJP_500Medium,
  NotoSansJP_700Bold,
} from "@expo-google-fonts/noto-sans-jp";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { startAnalytics, track } from "@/lib/analytics";
import { registerForPushNotifications } from "@/lib/push";
import { Toast } from "@/components/Toast";
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
  const router = useRouter();
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 起動時（トークンが確定した時点）でプッシュ登録を再実行する
  // （初回登録時に拒否した後で端末設定から許可した場合の救済にもなる）
  useEffect(() => {
    if (token) registerForPushNotifications();
  }, [token]);

  // フォアグラウンド受信：アプリ内トースト表示（SPEC.md §4.3）
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ title: content.title ?? "カーケアセンター", body: content.body ?? "" });
      toastTimer.current = setTimeout(() => setToast(null), 4000);
    });
    return () => sub.remove();
  }, []);

  // 通知タップ：booking_idがあればS9へ、coupon_idがあればS10へ deep link（SPEC.md §4.3）
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { booking_id?: string; coupon_id?: string }
        | undefined;
      if (data?.booking_id) {
        track("push_opened", { kind: "booking_complete" });
        router.push(`/bookings/${data.booking_id}`);
      } else if (data?.coupon_id) {
        track("push_opened", { kind: "coupon" });
        router.push("/coupons");
      }
    });
    return () => sub.remove();
  }, [router]);

  if (isLoading) return <LoadingView />;

  return (
    <>
      {toast && <Toast title={toast.title} body={toast.body} />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!token}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="reserve" options={{ presentation: "modal" }} />
          <Stack.Screen name="scan" options={{ presentation: "modal" }} />
        </Stack.Protected>
        <Stack.Protected guard={!token}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
      </Stack>
    </>
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
