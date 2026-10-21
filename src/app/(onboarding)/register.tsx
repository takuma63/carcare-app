/* ============================================================
   register.tsx  ―  新規登録（3段階）
   ------------------------------------------------------------
   ① 入力     お名前・メールアドレス・パスワード・電話番号など
   ② 確認コード  Microsoft がメールに送るコードを入力
   ③ お客様の確認 電話番号から店舗の台帳を照合し「山田 太郎 様ですか？」

   ★ パスワードは当社のサーバーを通らない
     ①と②のやり取りは Microsoft Entra External ID と直接行い、
     当社が受け取るのは検証済みのトークンだけ（entra.ts 冒頭を参照）。

   ★ なぜ1つの画面で段階を進めるのか
     Entra のやり取りは continuation_token で状態を引き継ぐ。
     画面を分けるとトークンを受け渡すことになり、取り違えや
     戻る操作での不整合が起きやすいので、1画面の中で切り替える。
============================================================ */

import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { GoldButton } from "@/components/GoldButton";
import { useAuth } from "@/lib/auth-context";
import { ApiError, loginWithEntra, lookupByPhone } from "@/lib/api";
import * as entra from "@/lib/entra";
import { registerForPushNotifications } from "@/lib/push";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";

/* ★ 個人情報保護法 第21条第2項：本人から直接（この入力フォームを含む）
   個人情報を取得するときは、あらかじめ利用目的を明示しなければならない。
   「公表」だけでは足りないため、登録ボタンの直前に利用目的とポリシーへの
   導線を置いている。設定画面のリンクと同じURL。 */
const PRIVACY_URL = "https://reserve.carcare-center.co.jp/privacy-app.html";

type Step = "form" | "code" | "confirm";

interface Candidate {
  name: string;
  phoneMasked: string;
}

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ① 入力
  const [name, setName] = useState("");
  const [nameKana, setNameKana] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [birthMonth, setBirthMonth] = useState<number | null>(null);

  // ② 確認コード
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [flowToken, setFlowToken] = useState("");

  // ③ お客様の確認
  const [idToken, setIdToken] = useState("");
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  /* ---------- ① 入力 → 確認コードの送信 ---------- */
  const submitForm = async () => {
    setError(null);
    if (!name.trim()) return setError("お名前を入力してください");
    if (!email.trim()) return setError("メールアドレスを入力してください");
    if (password.length < 8) return setError("パスワードは8文字以上でご設定ください");

    setBusy(true);
    try {
      const started = await entra.signUpStart(email.trim(), password);
      const sent = await entra.signUpSendCode(started);
      setFlowToken(sent.continuationToken);
      setSentTo(sent.target || email.trim());
      setStep("code");
    } catch (e) {
      setError(e instanceof entra.EntraError ? e.message : "登録を開始できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- ② 確認コード → 本登録 ---------- */
  const submitCode = async () => {
    setError(null);
    if (!code.trim()) return setError("確認コードを入力してください");

    setBusy(true);
    try {
      const verified = await entra.signUpVerify(flowToken, code.trim());
      const tokens = await entra.signUpFinish(verified);
      setIdToken(tokens.idToken);

      /* 電話番号をお持ちなら、店舗の台帳に既にご登録があるか調べる。
         見つかればお名前を出して確認していただく。 */
      if (phone.trim()) {
        try {
          const hit = await lookupByPhone(tokens.idToken, phone.trim());
          if (hit.found && hit.name) {
            setCandidate({ name: hit.name, phoneMasked: hit.phone_masked ?? "" });
            setStep("confirm");
            return;
          }
        } catch {
          /* 照合できなくても登録は続けられる（新しいお客様として登録する） */
        }
      }
      await finish(tokens.idToken, phone.trim());
    } catch (e) {
      setError(e instanceof entra.EntraError ? e.message : "確認できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- ③ 確認のうえ、当社側の登録を完了する ---------- */
  const finish = async (token: string, phoneToSend: string) => {
    const result = await loginWithEntra({
      id_token: token,
      name: name.trim(),
      name_kana: nameKana.trim() || undefined,
      phone: phoneToSend || undefined,
      birth_month: birthMonth,
    });
    await signIn(result.auth_token, result.customer);
    // Stack.Protected が token の有無を見て自動的に (tabs) へ切り替える
    registerForPushNotifications();
  };

  const confirmCandidate = async (isMe: boolean) => {
    setError(null);
    setBusy(true);
    try {
      // 「いいえ」なら電話番号を送らない＝新しいお客様として登録する
      await finish(idToken, isMe ? phone.trim() : "");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "登録に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  /* ============================================================ */

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require("@/assets/logo.png")} style={styles.logo} resizeMode="contain" />

        {step === "form" && (
          <>
            <Text style={styles.title}>カーケアセンター{"\n"}公式アプリへようこそ</Text>
            <Text style={styles.lead}>
              メールアドレスとパスワードをご登録ください。次回からはログインするだけでご利用いただけます。
            </Text>

            <View style={styles.form}>
              <Field label="お名前" required value={name} onChangeText={setName} autoComplete="name" />
              <Field label="フリガナ" value={nameKana} onChangeText={setNameKana} />
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
                autoComplete="new-password"
                autoCapitalize="none"
                placeholder="8文字以上"
              />
              <Field
                label="電話番号"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="例：090-1234-5678"
              />
              <Text style={styles.fieldHint}>
                ご来店時にお伝えいただいている電話番号をご入力いただくと、これまでのご利用履歴が引き継がれます。
              </Text>

              {/* 誕生月（任意）。誕生日クーポンの配布に使う。日付は伺わない。 */}
              <Text style={styles.monthLabel}>誕生月（ご希望の方のみ）</Text>
              <Text style={styles.monthHint}>誕生月に使えるクーポンをお送りします。</Text>
              <View style={styles.monthRow}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthChip, birthMonth === m && styles.monthChipOn]}
                    onPress={() => setBirthMonth(birthMonth === m ? null : m)}
                  >
                    <Text style={[styles.monthChipText, birthMonth === m && styles.monthChipTextOn]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <Text style={styles.consent}>
              ご入力いただいた情報は、ご予約の受付・ご連絡、回数券やクーポンの管理に利用します。
              「確認コードを受け取る」を押すと、
              <Text style={styles.consentLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                プライバシーポリシー
              </Text>
              に同意いただいたものとします。
            </Text>

            <GoldButton
              title="確認コードを受け取る"
              onPress={submitForm}
              loading={busy}
              style={styles.button}
            />
            <TouchableOpacity onPress={() => router.push("/(onboarding)/login")} style={styles.linkRow}>
              <Text style={styles.link}>すでにご登録済みの方はこちら</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "code" && (
          <>
            <Text style={styles.title}>確認コードの入力</Text>
            <Text style={styles.lead}>
              {sentTo} 宛に確認コードをお送りしました。{"\n"}メールをご確認のうえ、ご入力ください。
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
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <GoldButton title="登録を完了する" onPress={submitCode} loading={busy} style={styles.button} />
            <TouchableOpacity
              onPress={() => {
                setStep("form");
                setCode("");
                setError(null);
              }}
              style={styles.linkRow}
            >
              <Text style={styles.link}>入力内容を修正する</Text>
            </TouchableOpacity>
            <Text style={styles.note}>
              メールが届かない場合は、迷惑メールフォルダをご確認ください。
            </Text>
          </>
        )}

        {step === "confirm" && candidate && (
          <>
            <Text style={styles.title}>ご本人の確認</Text>
            <Text style={styles.lead}>
              ご入力いただいた電話番号で、当店にご登録がございました。
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardName}>{candidate.name} 様</Text>
              {!!candidate.phoneMasked && <Text style={styles.cardPhone}>{candidate.phoneMasked}</Text>}
            </View>

            <Text style={styles.note}>
              「はい」を選ぶと、これまでのご来店履歴やお車の情報が引き継がれます。
            </Text>

            {error && <Text style={styles.error}>{error}</Text>}

            <GoldButton
              title="はい、私です"
              onPress={() => confirmCandidate(true)}
              loading={busy}
              style={styles.button}
            />
            <TouchableOpacity onPress={() => confirmCandidate(false)} style={styles.linkRow} disabled={busy}>
              <Text style={styles.link}>いいえ、違います（新規として登録）</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address" | "number-pad";
  autoComplete?: "name" | "tel" | "email" | "new-password" | "current-password" | "one-time-code";
  autoCapitalize?: "none" | "sentences";
  secureTextEntry?: boolean;
  placeholder?: string;
}

export function Field({
  label,
  value,
  onChangeText,
  required,
  keyboardType,
  autoComplete,
  autoCapitalize,
  secureTextEntry,
  placeholder,
}: FieldProps) {
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
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
      />
    </View>
  );
}

export const styles = StyleSheet.create({
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
  monthLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.text,
    marginTop: spacing.md,
  },
  monthHint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  monthRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthChip: {
    width: 44,
    height: 38,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  monthChipOn: { borderColor: colors.gold, backgroundColor: "#fdfbf6" },
  monthChipText: { fontFamily: fonts.sans, fontSize: fontSize.caption, color: colors.textLight },
  monthChipTextOn: { fontFamily: fonts.sansBold, color: colors.goldDeep },

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
  fieldHint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textLight,
    marginTop: -spacing.xs,
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
  consent: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.textLight,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  consentLink: {
    color: colors.goldDeep,
    textDecorationLine: "underline",
  },
  button: {
    marginTop: spacing.sm,
  },
  linkRow: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  link: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.goldDeep,
    textDecorationLine: "underline",
  },
  note: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textLight,
    textAlign: "center",
    marginTop: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.white,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  cardName: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
  },
  cardPhone: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
});
