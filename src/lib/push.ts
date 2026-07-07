/* ============================================================
   push.ts  ―  プッシュ通知の許可要求＋トークン登録（SPEC.md §4.2 S1）
   ------------------------------------------------------------
   S1登録直後・アプリ起動時の両方から呼ばれる。
   ※ Expo Go では実機プッシュトークンが取得できない（development build /
     EAS ビルドが必要）ため、失敗は静かに無視する（IMPLEMENTATION_PLAN.md
     Phase4の注記どおり。Expo Goでの代替検証は許可ダイアログ表示までとする）。
============================================================ */

import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerPushToken } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** 許可を要求し、許可されればExpo Push Tokenをサーバーに登録する。
 *  権限が無い・実機でない・EASプロジェクト未設定などの理由で失敗しても
 *  例外を投げず、呼び出し側のUXを止めない。 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (!Device.isDevice) return; // シミュレータ/エミュレータはプッシュ非対応

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const platform = Platform.OS === "ios" ? "ios" : "android";
    await registerPushToken(tokenResult.data, platform);
  } catch (e) {
    console.warn("[push] 登録をスキップしました（Expo Go等の制約の可能性）:", e);
  }
}
