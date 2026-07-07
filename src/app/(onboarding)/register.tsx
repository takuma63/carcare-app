/* ============================================================
   register.tsx  ―  S1 プロフィール登録（初回のみ。SPEC.md §4.2）
   ------------------------------------------------------------
   氏名（必須）＋電話番号/メールアドレス（どちらか必須）を入力して
   app-register を呼び、成功したらホーム（(tabs)）へ。
   登録直後にプッシュ通知の許可ダイアログを出し、許可されたら
   push-register でトークンを送信する（SPEC.md §4.2 S1）。
============================================================ */

import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GoldButton } from "@/components/GoldButton";
import { useAuth } from "@/lib/auth-context";
import { registerProfile, ApiError } from "@/lib/api";
import { registerForPushNotifications } from "@/lib/push";
import { colors, fonts, fontSize, spacing } from "@/theme";

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [name, setName] = useState("");
  const [nameKana, setNameKana] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("お名前を入力してください");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError("電話番号またはメールアドレスのいずれかを入力してください");
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerProfile({
        name: trimmedName,
        name_kana: nameKana.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      await signIn(result.auth_token, result.customer);
      // Stack.Protected が token の有無を見て自動的に (tabs) へ切り替える
      registerForPushNotifications();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "登録に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require("@/assets/logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>カーケアセンター{"\n"}公式アプリへようこそ</Text>
        <Text style={styles.lead}>
          お名前と、電話番号またはメールアドレスをご入力ください。パスワードは不要です。
        </Text>

        <View style={styles.form}>
          <Field label="お名前" required value={name} onChangeText={setName} autoComplete="name" />
          <Field label="フリガナ" value={nameKana} onChangeText={setNameKana} />
          <Field
            label="電話番号"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="例：090-1234-5678"
          />
          <Field
            label="メールアドレス"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="例：you@example.com"
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <GoldButton title="はじめる" onPress={handleSubmit} loading={submitting} style={styles.button} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address";
  autoComplete?: "name" | "tel" | "email";
  autoCapitalize?: "none" | "sentences";
  placeholder?: string;
}

function Field({ label, value, onChangeText, required, keyboardType, autoComplete, autoCapitalize, placeholder }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={styles.required}> 必須</Text>}
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize ?? "sentences"}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  logo: {
    width: 140,
    height: 70,
    alignSelf: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h2,
    color: colors.text,
    textAlign: "center",
    lineHeight: 34,
    marginBottom: spacing.sm,
  },
  lead: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.text,
  },
  required: {
    color: colors.gold,
    fontSize: 11,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: fontSize.body,
    color: colors.text,
    backgroundColor: colors.white,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  button: {
    marginTop: spacing.sm,
  },
});
