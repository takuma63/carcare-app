/* ============================================================
   reset.tsx  ―  パスワードの再設定（2段階）
   ------------------------------------------------------------
   ① メールアドレスを入力 → Microsoft が確認コードを送る
   ② 確認コードと新しいパスワードを入力 → 変更して自動的にログイン

   ★ 当社はパスワードを受け取らない
     再設定も Microsoft Entra External ID が行う。
     変更の反映は非同期なので、完了するまで待ってからログインする
     （entra.ts の resetComplete を参照）。
============================================================ */

import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { GoldButton } from "@/components/GoldButton";
import { useAuth } from "@/lib/auth-context";
import { ApiError, loginWithEntra } from "@/lib/api";
import * as entra from "@/lib/entra";
import { registerForPushNotifications } from "@/lib/push";
import { spacing } from "@/theme";
import { Field, styles } from "./register";

type Step = "email" | "code";

export default function ResetScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [flowToken, setFlowToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* ---------- ① メールアドレス → 確認コードの送信 ---------- */
  const sendCode = async () => {
    setError(null);
    if (!email.trim()) return setError("メールアドレスを入力してください");

    setBusy(true);
    try {
      const sent = await entra.resetSendCode(email.trim());
      setFlowToken(sent.continuationToken);
      setSentTo(sent.target || email.trim());
      setStep("code");
    } catch (e) {
      setError(e instanceof entra.EntraError ? e.message : "確認コードを送れませんでした。");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- ② 確認コード＋新しいパスワード ---------- */
  const submitNewPassword = async () => {
    setError(null);
    if (!code.trim()) return setError("確認コードを入力してください");
    if (password.length < 8) return setError("パスワードは8文字以上でご設定ください");

    setBusy(true);
    try {
      const verified = await entra.resetVerify(flowToken, code.trim());
      const submitted = await entra.resetSubmit(verified, password);
      await entra.resetComplete(submitted);

      // 変更できたので、そのままログインしてホームへ
      const tokens = await entra.signIn(email.trim(), password);
      const result = await loginWithEntra({ id_token: tokens.idToken });
      await signIn(result.auth_token, result.customer);
      registerForPushNotifications();
    } catch (e) {
      if (e instanceof entra.EntraError || e instanceof ApiError) setError(e.message);
      else setError("パスワードを変更できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Image source={require("@/assets/logo.png")} style={styles.logo} resizeMode="contain" />

        {step === "email" && (
          <>
            <Text style={styles.title}>パスワードの再設定</Text>
            <Text style={styles.lead}>
              ご登録のメールアドレスをご入力ください。確認コードをお送りします。
            </Text>

            <View style={styles.form}>
              <Field
                label="メールアドレス"
                required
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                placeholder="例：you@example.com"
              />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <GoldButton title="確認コードを受け取る" onPress={sendCode} loading={busy} style={styles.button} />
            <TouchableOpacity onPress={() => router.back()} style={styles.linkRow}>
              <Text style={styles.link}>ログイン画面に戻る</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "code" && (
          <>
            <Text style={styles.title}>新しいパスワード</Text>
            <Text style={styles.lead}>
              {sentTo} 宛に確認コードをお送りしました。{"\n"}コードと、新しいパスワードをご入力ください。
            </Text>

            <View style={styles.form}>
              <Field
                label="確認コード"
                required
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                autoCapitalize="none"
                placeholder="メールに記載の数字"
              />
              <Field
                label="新しいパスワード"
                required
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                autoCapitalize="none"
                placeholder="8文字以上"
              />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <GoldButton
              title="変更してログイン"
              onPress={submitNewPassword}
              loading={busy}
              style={styles.button}
            />
            <TouchableOpacity
              onPress={() => {
                setStep("email");
                setCode("");
                setPassword("");
                setError(null);
              }}
              style={styles.linkRow}
            >
              <Text style={styles.link}>メールアドレスを入力し直す</Text>
            </TouchableOpacity>
            <Text style={styles.note}>
              メールが届かない場合は、迷惑メールフォルダをご確認ください。
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
