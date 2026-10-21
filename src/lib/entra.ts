/* ============================================================
   entra.ts  ―  Microsoft Entra External ID（ネイティブ認証）
   ------------------------------------------------------------
   新規登録・ログイン・パスワード再設定を、アプリの画面のまま行う。
   ブラウザは開かない（ネイティブ認証API）。

   ★ パスワードは当社のサーバーを通らない
     この画面から Microsoft へ直接送られ、Microsoft が保管する。
     当社が受け取るのは、Microsoft が発行した検証済みのトークンだけ。

   ★ SDK を使わず REST を直接叩いている理由
     Entra のネイティブ認証SDKは iOS(Swift)/Android(Kotlin)/Web 向けで、
     React Native 版が無い。Microsoft は「SDKの無いプラットフォームは
     ネイティブ認証APIを使うこと」と案内しており、素のHTTPSとJSONなので
     fetch だけで扱える。「CORS非対応」という注意はブラウザの話で、
     React Native には当てはまらない。

   ★ やり取りの形
     どの操作も複数回のリクエストに分かれ、continuation_token で
     状態を引き継ぐ。トークンは短命なので、画面を開きっぱなしにすると
     expired_token になる（その場合は最初からやり直していただく）。

   設定値は app.json の extra（ENTRA-SETUP.md 参照）。
============================================================ */

import Constants from "expo-constants";

const SUBDOMAIN = (Constants.expoConfig?.extra?.ENTRA_SUBDOMAIN as string | undefined) ?? "";
const CLIENT_ID = (Constants.expoConfig?.extra?.ENTRA_CLIENT_ID as string | undefined) ?? "";

const BASE = `https://${SUBDOMAIN}.ciamlogin.com/${SUBDOMAIN}.onmicrosoft.com`;

/* redirect は「アプリが対応できない要求が来たらブラウザに逃がす」ための
   予備手段。Microsoftの仕様で必ず含める決まりになっている。 */
const CHALLENGE_SIGNUP = "oob password redirect";
const CHALLENGE_SIGNIN = "password redirect";
const CHALLENGE_RESET = "oob redirect";
/* profile と email を入れないと、トークンに利用者の識別子（oid）や
   メールアドレス（preferred_username）が入らない。
   サーバー側はこの2つで顧客台帳に紐づけるため必須。
   ※ メールは email クレームではなく preferred_username に入る
     （_entra.js は両方を見るようにしてある）。 */
const SCOPE = "openid profile email offline_access";

export class EntraError extends Error {
  /** Microsoftが返した細かい理由。画面の出し分けに使う */
  readonly suberror: string;
  constructor(message: string, suberror = "") {
    super(message);
    this.suberror = suberror;
  }
}

export interface Tokens {
  idToken: string;
  refreshToken: string | null;
  expiresIn: number;
}

/** 確認コードの送り先（画面に「u***@example.com に送りました」と出す） */
export interface CodeSent {
  continuationToken: string;
  target: string;
  codeLength: number;
}

export function isConfigured(): boolean {
  return !!(SUBDOMAIN && CLIENT_ID);
}

/* ---------- 低レベル：1回のリクエスト ---------- */

interface Raw {
  continuation_token?: string;
  challenge_target_label?: string;
  code_length?: number;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  suberror?: string;
  error_description?: string;
}

async function post(path: string, params: Record<string, string>): Promise<Raw> {
  const body = new URLSearchParams({ client_id: CLIENT_ID, ...params }).toString();

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    throw new EntraError("通信に失敗しました。電波の良い場所で再度お試しください。", "network");
  }

  let json: Raw;
  try {
    json = (await res.json()) as Raw;
  } catch {
    throw new EntraError("予期しない応答がありました。時間をおいて再度お試しください。", "parse");
  }

  if (json.error) throw new EntraError(messageFor(json), json.suberror || json.error);
  return json;
}

/* Microsoftの英語メッセージはそのままお客様に出せないので日本語にする。
   想定外のものは汎用の文言にし、原文はログにだけ残す。 */
function messageFor(r: Raw): string {
  const sub = r.suberror || "";
  const err = r.error || "";

  switch (sub) {
    case "password_too_short":
    case "password_too_weak":
      return "パスワードが短すぎます。8文字以上で、英字と数字を組み合わせてご設定ください。";
    case "password_too_long":
      return "パスワードが長すぎます。256文字以内でご設定ください。";
    case "password_banned":
      return "よく使われているパスワードのため、ご利用いただけません。別のものをご設定ください。";
    case "password_recently_used":
      return "以前お使いだったパスワードは再度ご利用いただけません。";
    case "invalid_oob_value":
      return "確認コードが正しくありません。メールをご確認のうえ、もう一度ご入力ください。";
    case "attributes_required":
      return "入力が不足しています。お手数ですが、最初からやり直してください。";
    default:
      break;
  }

  switch (err) {
    case "user_already_exists":
      return "このメールアドレスは既にご登録済みです。ログインしてお進みください。";
    case "user_not_found":
      return "ご登録が見つかりませんでした。メールアドレスをご確認ください。";
    case "invalid_grant":
      // パスワード違いはここに来る（どちらが違うかは伝えない）
      return "メールアドレスまたはパスワードが正しくありません。";
    case "expired_token":
      return "時間が経過したため、手続きをやり直してください。";
    case "invalid_request":
      console.warn("[entra] invalid_request:", r.error_description);
      return "入力内容をご確認ください。";
    default:
      console.warn("[entra] 未分類のエラー:", err, sub, r.error_description);
      return "処理できませんでした。時間をおいて再度お試しください。";
  }
}

function tokensFrom(r: Raw): Tokens {
  if (!r.id_token) throw new EntraError("ログイン情報を取得できませんでした。", "no_token");
  return {
    idToken: r.id_token,
    refreshToken: r.refresh_token ?? null,
    expiresIn: r.expires_in ?? 0,
  };
}

function continuationFrom(r: Raw): string {
  if (!r.continuation_token) throw new EntraError("手続きを続けられませんでした。", "no_continuation");
  return r.continuation_token;
}

/* ============================================================
   新規登録
     ① signUpStart     メールとパスワードを送る
     ② signUpSendCode  確認コードをメールで送らせる
     ③ signUpVerify    届いたコードを送る
     ④ signUpFinish    トークンを受け取る
   ============================================================ */

export async function signUpStart(email: string, password: string): Promise<string> {
  const r = await post("/signup/v1.0/start", {
    challenge_type: CHALLENGE_SIGNUP,
    username: email,
    password,
  });
  return continuationFrom(r);
}

export async function signUpSendCode(continuationToken: string): Promise<CodeSent> {
  const r = await post("/signup/v1.0/challenge", {
    challenge_type: CHALLENGE_SIGNUP,
    continuation_token: continuationToken,
  });
  return {
    continuationToken: continuationFrom(r),
    target: r.challenge_target_label ?? "",
    codeLength: r.code_length ?? 8,
  };
}

export async function signUpVerify(continuationToken: string, code: string): Promise<string> {
  const r = await post("/signup/v1.0/continue", {
    continuation_token: continuationToken,
    grant_type: "oob",
    oob: code,
  });
  return continuationFrom(r);
}

export async function signUpFinish(continuationToken: string): Promise<Tokens> {
  const r = await post("/oauth2/v2.0/token", {
    continuation_token: continuationToken,
    grant_type: "continuation_token",
    scope: SCOPE,
  });
  return tokensFrom(r);
}

/* ============================================================
   ログイン
     ① signInStart     メールアドレスを送る
     ② signInChallenge パスワードでの認証を要求する
     ③ signInPassword  パスワードを送ってトークンを受け取る
   ============================================================ */

export async function signIn(email: string, password: string): Promise<Tokens> {
  const started = await post("/oauth2/v2.0/initiate", {
    challenge_type: CHALLENGE_SIGNIN,
    username: email,
  });
  const challenged = await post("/oauth2/v2.0/challenge", {
    challenge_type: CHALLENGE_SIGNIN,
    continuation_token: continuationFrom(started),
  });
  const token = await post("/oauth2/v2.0/token", {
    continuation_token: continuationFrom(challenged),
    grant_type: "password",
    password,
    scope: SCOPE,
  });
  return tokensFrom(token);
}

/* 保存しておいた更新用トークンで、画面を出さずに入り直す */
export async function refresh(refreshToken: string): Promise<Tokens> {
  const r = await post("/oauth2/v2.0/token", {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: SCOPE,
  });
  return tokensFrom(r);
}

/* ============================================================
   パスワードの再設定
     ① resetSendCode   メールアドレスを送り、確認コードを送らせる
     ② resetVerify     届いたコードを送る
     ③ resetSubmit     新しいパスワードを送る
     ④ resetComplete   反映を待つ（Microsoft側の処理が非同期のため）
   ============================================================ */

export async function resetSendCode(email: string): Promise<CodeSent> {
  const started = await post("/resetpassword/v1.0/start", {
    challenge_type: CHALLENGE_RESET,
    username: email,
  });
  const r = await post("/resetpassword/v1.0/challenge", {
    challenge_type: CHALLENGE_RESET,
    continuation_token: continuationFrom(started),
  });
  return {
    continuationToken: continuationFrom(r),
    target: r.challenge_target_label ?? "",
    codeLength: r.code_length ?? 8,
  };
}

export async function resetVerify(continuationToken: string, code: string): Promise<string> {
  const r = await post("/resetpassword/v1.0/continue", {
    continuation_token: continuationToken,
    grant_type: "oob",
    oob: code,
  });
  return continuationFrom(r);
}

export async function resetSubmit(continuationToken: string, newPassword: string): Promise<string> {
  const r = await post("/resetpassword/v1.0/submit", {
    continuation_token: continuationToken,
    new_password: newPassword,
  });
  return continuationFrom(r);
}

/* 反映は非同期なので、完了するまで様子を見る。
   既定で最大約15秒（2秒間隔）。それ以上かかることは通常ない。 */
export async function resetComplete(continuationToken: string): Promise<void> {
  let token = continuationToken;
  for (let i = 0; i < 8; i++) {
    const r = await post("/resetpassword/v1.0/poll_completion", {
      continuation_token: token,
    });
    const status = (r as Raw & { status?: string }).status;
    if (status === "succeeded") return;
    if (status === "failed") {
      throw new EntraError("パスワードを変更できませんでした。もう一度お試しください。", "reset_failed");
    }
    if (r.continuation_token) token = r.continuation_token;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  /* 時間切れ。多くの場合は実際には変更できているので、
     「失敗」と言い切らずにログインを試していただく案内にする。 */
  throw new EntraError(
    "確認に時間がかかっています。新しいパスワードでログインをお試しください。",
    "reset_timeout"
  );
}
