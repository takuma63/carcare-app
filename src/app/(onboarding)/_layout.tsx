/* ログイン前の画面（新規登録 / ログイン / パスワード再設定）。
   最初に出すのは新規登録。既にご登録の方は、そこからログインへ移る。 */
import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "register",
};

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
