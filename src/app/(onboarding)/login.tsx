/* ============================================================
   login.tsx  ―  ログイン
   ------------------------------------------------------------
   メールアドレスとパスワードで Microsoft Entra External ID に
   問い合わせ、受け取ったトークンを当社サーバーに渡して
   セッションを開始する。

   ★ 一度ログインすれば、次回以降は自動的に開く
     当社のセッショントークンは iPhone のキーチェーン
     （expo-secure-store）に保存され、使うたびに期限が延びる。
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
import { useRouter } from "expo-router";
import { GoldButton } from "@/components/GoldButton";
import { useAuth } from "@/lib/auth-context";
import { ApiError, loginWithEntra } from "@/lib/api";
import * as entra from "@/lib/entra";
import { registerForPushNotifications } from "@/lib/push";
import { Field, styles } from "./register";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim()) return setError("メールアドレスを入力してください");
    if (!password) return setError("パスワードを入力してください");

    setBusy(true);
    try {
      const tokens = await entra.signIn(email.trim(), password);
      const result = await loginWithEntra({ id_token: tokens.idToken });
      await signIn(result.auth_token, result.customer);
      // Stack.Protected が token の有無を見て自動的に (tabs) へ切り替える
      registerForPushNotifications();
    } catch (e) {
      if (e instanceof entra.EntraError || e instanceof ApiError) setError(e.message);
      else setError("ログインできませんでした。時間をおいて再度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require("@/assets/logo.png")} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>ログイン</Text>
        <Text style={styles.lead}>ご登録のメールアドレスとパスワードをご入力ください。</Text>

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
          <Field
            label="パスワード"
            required
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            autoCapitalize="none"
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <GoldButton title="ログイン" onPress={submit} loading={busy} style={styles.button} />

        <TouchableOpacity onPress={() => router.push("/(onboarding)/reset")} style={styles.linkRow}>
          <Text style={styles.link}>パスワードをお忘れの方</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.linkRow}>
          <Text style={styles.link}>はじめてご利用の方はこちら</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
