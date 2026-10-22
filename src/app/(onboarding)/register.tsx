/* ============================================================
   register.tsx  ―  新規登録
   ------------------------------------------------------------
   STEP 1／4  お名前（お名前・フリガナ）
   STEP 2／4  ログインに使う情報（メールアドレス・パスワード）
   STEP 3／4  お客様のこと（電話番号・誕生月／どちらも任意）
   STEP 4／4  確認コード（Microsoft がメールに送る6桁）
   （＋）     ご本人の確認（電話番号が台帳と一致した方だけ）

   ★ なぜ段階に分けたか（2026-10-22 発注者の指示）
     以前は1画面に7項目と同意文が縦に並び、実機で2画面半ぶん
     スクロールしていた。必須と任意が混ざっていて「全部埋めないと
     進めない」と感じさせてしまうため、意味のまとまりで分けた。

   ★ 入力はすべて確認コードより前に置く
     コードを入れた時点で Microsoft 側のアカウントができる。
     そのあとに入力画面を置くと、離脱したときに
     「アカウントはあるが当社に記録がない」状態になるため。

   ★ ご本人の確認だけは前倒しできない
     台帳の照合（lookupByPhone）は本人確認済みトークンを要求する
     （いたずら照会で顧客名簿を引かれないようにするため）。
     したがってコードの検証後にしか呼べない。

   ★ パスワードは当社のサーバーを通らない
     Microsoft Entra External ID と直接やり取りし、
     当社が受け取るのは検証済みのトークンだけ（entra.ts 冒頭を参照）。

   ★ なぜ1つの画面の中で段階を進めるのか
     Entra のやり取りは continuation_token で状態を引き継ぐ。
     画面（ルート）を分けるとトークンを受け渡すことになり、
     取り違えや戻る操作での不整合が起きやすい。

   ★ アニメーションは React Native 標準の Animated だけで作る
     ビルド前に新しい依存を増やさないため。端末の「視差効果を減らす」が
     ONの方には動きを出さない。
============================================================ */

import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { GoldButton } from "@/components/GoldButton";
import { useAuth } from "@/lib/auth-context";
import { ApiError, loginWithEntra, lookupByPhone } from "@/lib/api";
import * as entra from "@/lib/entra";
import { registerForPushNotifications } from "@/lib/push";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";

/* ★ 個人情報保護法 第21条第2項：本人から直接（この入力フォームを含む）
   個人情報を取得するときは、あらかじめ利用目的を明示しなければならない。
   「公表」だけでは足りないため、最初の入力の前（STEP 1）に利用目的と
   ポリシーへの導線を置き、送信の直前（STEP 3）でもう一度示す。
   設定画面のリンクと同じURL。 */
const PRIVACY_URL = "https://reserve.carcare-center.co.jp/privacy-app.html";

type Step = "name" | "login" | "info" | "code" | "confirm" | "done";

/** 進捗バーに数える段階。confirm と done は「おまけ」なので数えない */
const FLOW: Step[] = ["name", "login", "info", "code"];
const CODE_LENGTH = 6;

interface Candidate {
  name: string;
  phoneMasked: string;
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("name");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // ① お名前
  const [name, setName] = useState("");
  const [nameKana, setNameKana] = useState("");
  // ② ログインに使う情報
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // ③ お客様のこと（任意）
  const [phone, setPhone] = useState("");
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  // ④ 確認コード
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [flowToken, setFlowToken] = useState("");
  // ⑤ ご本人の確認
  const [idToken, setIdToken] = useState("");
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  /* ---------- 動き ---------- */
  const progress = useRef(new Animated.Value(1 / FLOW.length)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const shift = useRef(new Animated.Value(0)).current;

  /* ★ 一度ログインしたことのある端末なら、ログイン画面へ回す。
     セッションが切れたとき（サーバーが401を返したとき）ここへ戻ってくるが、
     そのまま新規登録を始められるとアカウントを二重に作ってしまう。 */
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem("ccc_has_account")
      .then((seen) => { if (alive && seen) router.replace("/(onboarding)/login"); })
      .catch(() => { /* 読めないときは新規登録のまま */ });
    return () => { alive = false; };
  }, [router]);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => { if (alive) setReduceMotion(on); })
      .catch(() => { /* 取得できない環境では動きを出す */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const i = FLOW.indexOf(step);
    const to = i < 0 ? 1 : (i + 1) / FLOW.length;
    Animated.timing(progress, {
      toValue: to,
      duration: reduceMotion ? 0 : 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,   // 幅はネイティブドライバで動かせない
    }).start();
  }, [step, reduceMotion, progress]);

  /** 今の段階を外へ送り出し、次の段階を反対側から入れる。
   *  direction: 1 = 進む（左へ抜けて右から入る）／ -1 = 戻る
   *  ★ 入ってくる動きは下の useEffect が受け持つ。ここで続けて start すると、
   *    まだ差し替わっていない（これから消える）要素に動きが付いてしまい、
   *    中身が透明のまま残る。 */
  const go = (next: Step, direction: 1 | -1 = 1) => {
    setError(null);
    if (reduceMotion) {
      setStep(next);
      return;
    }
    Haptics.selectionAsync().catch(() => { /* 対応していない端末では何もしない */ });
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(shift, {
        toValue: -36 * direction, duration: 150,
        easing: Easing.in(Easing.quad), useNativeDriver: true,
      }),
    ]).start(() => {
      shift.setValue(36 * direction);   // 反対側に置いてから差し替える
      setStep(next);
    });
  };

  /* 段階が差し替わったら、反対側から定位置へ入ってくる */
  useEffect(() => {
    if (reduceMotion) {
      fade.setValue(1);
      shift.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(shift, {
        toValue: 0, duration: 240,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, [step, reduceMotion, fade, shift]);

  /* ---------- ① お名前 ---------- */
  const submitName = () => {
    if (!name.trim()) return setError("お名前を入力してください");
    go("login");
  };

  /* ---------- ② ログインに使う情報 ---------- */
  const submitLogin = () => {
    const mail = email.trim();
    if (!mail) return setError("メールアドレスを入力してください");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return setError("メールアドレスの形式をご確認ください");
    if (password.length < 8) return setError("パスワードは8文字以上でご設定ください");
    go("info");
  };

  /* ---------- ③ お客様のこと → 確認コードの送信 ---------- */
  const sendCode = async () => {
    setError(null);
    setBusy(true);
    try {
      const started = await entra.signUpStart(email.trim(), password);
      const sent = await entra.signUpSendCode(started);
      setFlowToken(sent.continuationToken);
      setSentTo(sent.target || email.trim());
      setCode("");
      go("code");
    } catch (e) {
      setError(e instanceof entra.EntraError ? e.message : "登録を開始できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const skipInfo = () => {
    setPhone("");
    setBirthMonth(null);
    sendCode();
  };

  /* ---------- ④ 確認コード → 本登録 ---------- */
  const submitCode = async (entered?: string) => {
    const value = (entered ?? code).trim();
    setError(null);
    if (value.length < CODE_LENGTH) return setError("確認コードを入力してください");

    setBusy(true);
    try {
      const verified = await entra.signUpVerify(flowToken, value);
      const tokens = await entra.signUpFinish(verified);
      setIdToken(tokens.idToken);

      /* 電話番号をお伺いしていれば、店舗の台帳に既にご登録があるか調べる。
         見つかればお名前を出して確認していただく。 */
      if (phone.trim()) {
        try {
          const hit = await lookupByPhone(tokens.idToken, phone.trim());
          if (hit.found && hit.name) {
            setCandidate({ name: hit.name, phoneMasked: hit.phone_masked ?? "" });
            go("confirm");
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

  /* ---------- 当社側の登録を完了する ---------- */
  const finish = async (token: string, phoneToSend: string) => {
    const result = await loginWithEntra({
      id_token: token,
      name: name.trim(),
      name_kana: nameKana.trim() || undefined,
      phone: phoneToSend || undefined,
      birth_month: birthMonth,
    });
    /* ★ signIn を呼ぶと Stack.Protected が即座に (tabs) へ切り替わるため、
       お礼の画面を見ていただく間だけ待ってから呼ぶ。 */
    setStep("done");
    await new Promise((r) => setTimeout(r, reduceMotion ? 250 : 1200));
    await signIn(result.auth_token, result.customer);
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

  const stepIndex = FLOW.indexOf(step);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Image source={require("@/assets/logo.png")} style={styles.logo} resizeMode="contain" />

        {/* 進捗。細い線が伸びるだけにして、上部を重くしない */}
        {step !== "done" && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {stepIndex >= 0 ? `STEP ${stepIndex + 1} / ${FLOW.length}` : "あと少しです"}
            </Text>
          </View>
        )}

        <Animated.View style={{ opacity: fade, transform: [{ translateX: shift }] }}>
        <View key={step}>
          {/* ---------- ① お名前 ---------- */}
          {step === "name" && (
            <>
              <Appear reduce={reduceMotion} index={0}>
                <Text style={styles.title}>カーケアセンター{"\n"}公式アプリへようこそ</Text>
                <Text style={styles.lead}>まずは、お名前を教えてください。</Text>
              </Appear>

              <View style={styles.form}>
                <Appear reduce={reduceMotion} index={1}>
                  <Field label="お名前" required value={name} onChangeText={setName} autoComplete="name" />
                </Appear>
                <Appear reduce={reduceMotion} index={2}>
                  <Field label="フリガナ" value={nameKana} onChangeText={setNameKana} placeholder="例：ヤマダ タロウ" />
                </Appear>
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <Appear reduce={reduceMotion} index={3}>
                <Text style={styles.consent}>
                  ご入力いただいた情報は、ご予約の受付・ご連絡、回数券やクーポンの管理に利用します。詳しくは
                  <Text style={styles.consentLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                    プライバシーポリシー
                  </Text>
                  をご覧ください。
                </Text>
                <GoldButton title="次へ" onPress={submitName} style={styles.button} />
                <TouchableOpacity onPress={() => router.push("/(onboarding)/login")} style={styles.linkRow}>
                  <Text style={styles.link}>すでにご登録済みの方はこちら</Text>
                </TouchableOpacity>
              </Appear>
            </>
          )}

          {/* ---------- ② ログインに使う情報 ---------- */}
          {step === "login" && (
            <>
              <Appear reduce={reduceMotion} index={0}>
                <Text style={styles.title}>ログインに使う情報</Text>
                <Text style={styles.lead}>
                  次回からは、このメールアドレスとパスワードでログインしていただけます。
                </Text>
              </Appear>

              <View style={styles.form}>
                <Appear reduce={reduceMotion} index={1}>
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
                </Appear>
                <Appear reduce={reduceMotion} index={2}>
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
                  <PasswordMeter password={password} reduce={reduceMotion} />
                </Appear>
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <Appear reduce={reduceMotion} index={3}>
                <GoldButton title="次へ" onPress={submitLogin} style={styles.button} />
                <TouchableOpacity onPress={() => go("name", -1)} style={styles.linkRow}>
                  <Text style={styles.link}>ひとつ前に戻る</Text>
                </TouchableOpacity>
              </Appear>
            </>
          )}

          {/* ---------- ③ お客様のこと（任意） ---------- */}
          {step === "info" && (
            <>
              <Appear reduce={reduceMotion} index={0}>
                <Text style={styles.title}>お客様のこと</Text>
                <Text style={styles.lead}>
                  どちらも任意です。ご入力いただくと、より便利にお使いいただけます。
                </Text>
              </Appear>

              <View style={styles.form}>
                <Appear reduce={reduceMotion} index={1}>
                  <Field
                    label="電話番号"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    placeholder="例：090-1234-5678"
                  />
                  <Text style={styles.fieldHint}>
                    ご来店時にお伝えいただいている電話番号をご入力いただくと、これまでのご利用履歴と回数券の残高が引き継がれます。
                  </Text>
                </Appear>

                {/* 誕生月（任意）。誕生日クーポンの配布に使う。日付は伺わない。 */}
                <Appear reduce={reduceMotion} index={2}>
                  <Text style={styles.monthLabel}>誕生月</Text>
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
                </Appear>
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <Appear reduce={reduceMotion} index={3}>
                <Text style={styles.consent}>
                  「確認コードを受け取る」を押すと、
                  <Text style={styles.consentLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                    プライバシーポリシー
                  </Text>
                  に同意いただいたものとします。
                </Text>
                <GoldButton title="確認コードを受け取る" onPress={sendCode} loading={busy} style={styles.button} />
                <TouchableOpacity onPress={skipInfo} style={styles.linkRow} disabled={busy}>
                  <Text style={styles.link}>入力せずに進む</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => go("login", -1)} style={styles.linkRowTight} disabled={busy}>
                  <Text style={styles.link}>ひとつ前に戻る</Text>
                </TouchableOpacity>
              </Appear>
            </>
          )}

          {/* ---------- ④ 確認コード ---------- */}
          {step === "code" && (
            <>
              <Appear reduce={reduceMotion} index={0}>
                <Text style={styles.title}>確認コードの入力</Text>
                <Text style={styles.lead}>
                  {sentTo} 宛に{CODE_LENGTH}桁の確認コードをお送りしました。{"\n"}メールをご確認のうえ、ご入力ください。
                </Text>
              </Appear>

              <Appear reduce={reduceMotion} index={1}>
                <CodeInput
                  value={code}
                  onChange={setCode}
                  onComplete={(v) => submitCode(v)}
                  disabled={busy}
                  reduce={reduceMotion}
                />
              </Appear>

              {error && <Text style={styles.error}>{error}</Text>}

              <Appear reduce={reduceMotion} index={2}>
                <GoldButton title="登録を完了する" onPress={() => submitCode()} loading={busy} style={styles.button} />
                <TouchableOpacity onPress={() => go("info", -1)} style={styles.linkRow} disabled={busy}>
                  <Text style={styles.link}>入力内容を修正する</Text>
                </TouchableOpacity>
                <Text style={styles.note}>メールが届かない場合は、迷惑メールフォルダをご確認ください。</Text>
              </Appear>
            </>
          )}

          {/* ---------- （＋）ご本人の確認 ---------- */}
          {step === "confirm" && candidate && (
            <>
              <Appear reduce={reduceMotion} index={0}>
                <Text style={styles.title}>ご本人の確認</Text>
                <Text style={styles.lead}>ご入力いただいた電話番号で、当店にご登録がございました。</Text>
              </Appear>

              <Appear reduce={reduceMotion} index={1}>
                <View style={styles.card}>
                  <Text style={styles.cardName}>{candidate.name} 様</Text>
                  {!!candidate.phoneMasked && <Text style={styles.cardPhone}>{candidate.phoneMasked}</Text>}
                </View>
                <Text style={styles.note}>
                  「はい」を選ぶと、これまでのご来店履歴やお車の情報が引き継がれます。
                </Text>
              </Appear>

              {error && <Text style={styles.error}>{error}</Text>}

              <Appear reduce={reduceMotion} index={2}>
                <GoldButton
                  title="はい、私です"
                  onPress={() => confirmCandidate(true)}
                  loading={busy}
                  style={styles.button}
                />
                <TouchableOpacity onPress={() => confirmCandidate(false)} style={styles.linkRow} disabled={busy}>
                  <Text style={styles.link}>いいえ、違います（新規として登録）</Text>
                </TouchableOpacity>
              </Appear>
            </>
          )}

          {/* ---------- 完了 ---------- */}
          {step === "done" && <DoneMark name={name.trim()} reduce={reduceMotion} />}
        </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ============================================================
   入力欄が下からふわっと現れる。index をずらして順に出す。
   ============================================================ */
function Appear({ index = 0, reduce, children }: { index?: number; reduce: boolean; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) { v.setValue(1); return; }
    Animated.timing(v, {
      toValue: 1,
      duration: 260,
      delay: 60 * index,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reduce, index, v]);
  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/* ============================================================
   パスワードの手応え。長さと文字の種類だけで測る簡単なもので、
   足切りには使わない（8文字以上かどうかは送信時に見る）。
   ============================================================ */
function PasswordMeter({ password, reduce }: { password: string; reduce: boolean }) {
  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[a-z]/.test(password) && /[A-Z0-9]/.test(password)) s++;
    if (/[^a-zA-Z0-9]/.test(password)) s++;
    return Math.min(s, 3);
  })();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: score / 3,
      duration: reduce ? 0 : 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [score, reduce, v]);
  if (!password) return null;
  const label = ["短すぎます", "もう少し長くできます", "よい強さです", "とても強いパスワードです"][score];
  return (
    <View style={styles.meterWrap}>
      <View style={styles.meterTrack}>
        <Animated.View
          style={[
            styles.meterFill,
            {
              width: v.interpolate({ inputRange: [0, 1], outputRange: ["8%", "100%"] }),
              backgroundColor: score >= 2 ? colors.gold : colors.border,
            },
          ]}
        />
      </View>
      <Text style={styles.meterText}>{label}</Text>
    </View>
  );
}

/* ============================================================
   確認コード。1文字ずつマスに出す。
   入力そのものは見えないTextInputが受け持ち、マスは表示だけ。
   6桁そろったら自動で送信する。
   ============================================================ */
function CodeInput({
  value, onChange, onComplete, disabled, reduce,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: (v: string) => void;
  disabled?: boolean;
  reduce: boolean;
}) {
  const ref = useRef<TextInput>(null);
  return (
    <TouchableOpacity activeOpacity={1} onPress={() => ref.current?.focus()} style={styles.codeWrap}>
      <View style={styles.codeRow}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => (
          <CodeBox key={i} char={value[i] ?? ""} active={i === value.length} reduce={reduce} />
        ))}
      </View>
      <TextInput
        ref={ref}
        style={styles.codeHidden}
        value={value}
        onChangeText={(t) => {
          const digits = t.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH);
          onChange(digits);
          if (digits.length === CODE_LENGTH) onComplete(digits);
        }}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={CODE_LENGTH}
        editable={!disabled}
        autoFocus
        caretHidden
      />
    </TouchableOpacity>
  );
}

function CodeBox({ char, active, reduce }: { char: string; active: boolean; reduce: boolean }) {
  const v = useRef(new Animated.Value(char ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) { v.setValue(char ? 1 : 0); return; }
    Animated.spring(v, { toValue: char ? 1 : 0, useNativeDriver: true, speed: 22, bounciness: 10 }).start();
  }, [char, reduce, v]);
  return (
    <Animated.View
      style={[
        styles.codeBox,
        (char || active) && styles.codeBoxOn,
        { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] },
      ]}
    >
      <Text style={styles.codeChar}>{char}</Text>
    </Animated.View>
  );
}

/* ============================================================
   完了。ロゴのマークが1回転して止まる。
   この間に当社側の登録は終わっていて、次の瞬間ホームへ切り替わる。
   ============================================================ */
function DoneMark({ name, reduce }: { name: string; reduce: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { spin.setValue(1); fade.setValue(1); return; }
    Animated.parallel([
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { /* 非対応端末 */ });
  }, [reduce, spin, fade]);
  return (
    <View style={styles.doneWrap}>
      <Animated.Image
        source={require("@/assets/mark.png")}
        style={[
          styles.doneMark,
          { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] },
        ]}
        resizeMode="contain"
      />
      <Animated.View style={{ opacity: fade }}>
        <Text style={styles.title}>ご登録ありがとうございます</Text>
        <Text style={styles.lead}>{name ? `${name} 様、` : ""}これからよろしくお願いいたします。</Text>
      </Animated.View>
    </View>
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
/* ★ 上端の余白は固定値ではなく安全領域から決める。
   ステータスバーの高さは端末によって違う（ノッチ有無・Dynamic Island）。 */
  content: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  logo: {
    width: 140,
    height: 70,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },

  /* 進捗。線1本ぶんの高さに収める */
  progressWrap: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  progressTrack: {
    height: 2,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.gold,
  },
  progressText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.goldDeep,
    textAlign: "center",
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
    marginTop: spacing.xs,
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

  /* パスワードの手応え */
  meterWrap: {
    marginTop: spacing.sm,
    gap: 6,
  },
  meterTrack: {
    height: 2,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  meterFill: {
    height: 2,
  },
  meterText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textLight,
  },

  /* 確認コードのマス */
  codeWrap: {
    marginBottom: spacing.lg,
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  codeBox: {
    width: 46,
    height: 58,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  codeBoxOn: {
    borderColor: colors.gold,
  },
  codeChar: {
    fontFamily: fonts.num,
    fontVariant: ["tabular-nums"],
    fontSize: fontSize.h2,
    color: colors.text,
  },
  codeHidden: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 58,
    opacity: 0,
    color: "transparent",
  },

  /* 完了 */
  doneWrap: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    gap: spacing.xl,
  },
  doneMark: {
    width: 96,
    height: 96,
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
    marginTop: spacing.md,
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
  linkRowTight: {
    marginTop: spacing.md,
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
