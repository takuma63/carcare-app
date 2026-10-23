/* ============================================================
   api.ts  ―  バックエンドAPIクライアント（SPEC.md §6）
   ------------------------------------------------------------
   ・fetch のみ使用（axios等は入れない。SPEC §1.1）
   ・認証トークンは expo-secure-store に保存
   ・エラーは日本語メッセージの ApiError として投げる（呼び出し側は
     catch して e.message をそのまま画面に出せる）
============================================================ */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { Booking, Coupon, Customer, MenuCategories, MenuGroup, PrepaidEntry, StampCard } from "./types";

const API_BASE = (Constants.expoConfig?.extra?.API_BASE as string | undefined) ?? "";

/* ★ 車種判定だけ接続先が違う
   Anthropic が東アジア（予約システムが動いている地域）からのアクセスを
   拒否するため、この処理だけ日本東リージョンの別アプリに分けてある。
   経緯は carcare-reservation/ask-jp/README.md。
   Web予約側（reserve.js の ASK_ENDPOINT）も同じURLを見ている。 */
const ASK_URL = (Constants.expoConfig?.extra?.ASK_URL as string | undefined) ?? "";
const TOKEN_KEY = "ccc_auth_token";

export class ApiError extends Error {
  /** サーバーが返したHTTPステータス。401（ログインが切れた）の判定に使う */
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/* 保存先：実機は SecureStore（暗号化）。
   Web（PCでの動作確認用）は SecureStore が使えないため AsyncStorage を使う。
   ※Webはあくまで開発確認用。本番の配布は iOS/Android アプリのみ。 */
const useSecureStore = Platform.OS !== "web";

export async function getToken(): Promise<string | null> {
  try {
    return useSecureStore
      ? await SecureStore.getItemAsync(TOKEN_KEY)
      : await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    if (useSecureStore) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    // 保存できない環境でも致命的にはしない
  }
}

export async function clearToken(): Promise<void> {
  try {
    if (useSecureStore) await SecureStore.deleteItemAsync(TOKEN_KEY);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // noop
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  auth?: boolean; // false なら Authorization ヘッダーを付けない（app-register / menu 用）
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "POST", body, auth = true } = options;
  const headers: Record<string, string> = { "content-type": "application/json" };

  if (auth) {
    const token = await getToken();
    if (!token) {
      throw new ApiError("認証に失敗しました。アプリを再登録してください");
    }
    // Azure Static Web Apps は Authorization ヘッダーを自前のトークンで上書きするため、
    // 専用ヘッダーで送る（サーバー側のアダプタが Authorization に積み替える）
    headers["x-auth-token"] = token;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${path}`, {
      method,
      headers,
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError("通信エラーが発生しました。ネットワークをご確認ください。");
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    const message = typeof data.error === "string" ? data.error : "エラーが発生しました。時間をおいて再度お試しください。";
    /* ★ 401＝サーバーがこのトークンを認めなかった、ということ。
       期限切れ・端末を手放したあとの失効・退会など理由はいろいろあるが、
       いずれにせよ端末に残っているログイン状態は、もう正しくない。
       画面ごとに「ログインが必要です」と赤字で出しても、ホームには
       お名前が出たままで、お客様にはどうしようもない。
       ここで一度だけ知らせて、ログイン画面へお戻しする。 */
    if (res.status === 401 && auth) notifyUnauthorized();
    throw new ApiError(message, res.status);
  }
  return data as T;
}

/* 401 を受け取ったときに呼ぶ処理。auth-context が起動時に登録する。
   （api.ts から直接サインアウトすると、import が循環してしまう） */
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
let notifiedAt = 0;

export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  unauthorizedHandler = fn;
}

/* 画面がいくつも同時に読み込むため、401 も同時に何本も返ってくる。
   短い間に何度も呼ばれても1回だけ処理する。 */
function notifyUnauthorized() {
  const now = Date.now();
  if (now - notifiedAt < 3000) return;
  notifiedAt = now;
  unauthorizedHandler?.();
}

/* ---------- app-login（Entraで本人確認を終えた方の入口） ----------
   Entraが発行したIDトークンを送ると、サーバーが署名を検証して
   顧客台帳に紐づけ、以降のAPIで使うセッショントークンを返す。
   パスワードはここを通らない。 */
export interface LoginParams {
  id_token: string;
  /** 初回のみ。アプリの登録画面で入力・確認いただいた内容 */
  name?: string;
  name_kana?: string;
  phone?: string;
  birth_month?: number | null;
  /** 領収書のご宛名（会社名）。法人でご利用のお客様のみ */
  company_name?: string;
}
export interface LoginResult {
  ok: true;
  auth_token: string;
  customer: Customer;
}
export function loginWithEntra(params: LoginParams) {
  return request<LoginResult>("app-login", { body: params, auth: false });
}

/* ---------- app-link（電話番号で既存のお客様を照合） ----------
   「山田 太郎 様ですか？」の確認に使う。
   セッション発行前なのでEntraのIDトークンで本人確認する。 */
export interface LinkLookupResult {
  found: boolean;
  name?: string;
  name_kana?: string;
  phone_masked?: string;
}
export function lookupByPhone(idToken: string, phone: string) {
  return request<LinkLookupResult>("app-link", {
    body: { id_token: idToken, phone },
    auth: false,
  });
}

/* ---------- app-register（プロフィールの更新。新規登録には使わない） ---------- */
export interface RegisterParams {
  name: string;
  name_kana?: string;
  phone?: string;
  /** 誕生月（1〜12）。誕生日クーポンの配布に使う */
  birth_month?: number | null;
}
export interface RegisterResult {
  ok: true;
  customer: Customer;
}
export function updateProfile(params: RegisterParams) {
  return request<RegisterResult>("app-register", { body: params });
}

/* ---------- my-announcements（お知らせ） ----------
   リピーター施策の中心。コーティングから1年・洗車から1ヶ月などの
   条件で店舗から届く（サーバー側の _announcements.js 冒頭を参照）。 */
export interface Announcement {
  id: string;
  target_id: string;
  title: string;
  body: string;
  /** 配信日（YYYY-MM-DD） */
  sent_on: string | null;
  read_at: string | null;
}
export interface AnnouncementsResult {
  ok: true;
  announcements: Announcement[];
  unread: number;
}
export function fetchMyAnnouncements() {
  return request<AnnouncementsResult>("my-announcements", { body: { action: "list" } });
}
export function markAnnouncementRead(announcementId: string) {
  return request<AnnouncementsResult>("my-announcements", {
    body: { action: "read", announcement_id: announcementId },
  });
}

/* ---------- my-vehicles（お持ちの車両） ----------
   vehicles には店舗が記録してきた車が全部入っており、乗り換えた方も多い。
   お客様ご自身に選んでいただいたものだけを「所有している車両」として扱う
   （サーバー側の my-vehicles.js 冒頭を参照）。 */
export interface Vehicle {
  id: string;
  /** 「トヨタ ハリアー」のような表示用の名前 */
  title: string;
  maker: string | null;
  model: string | null;
  color: string | null;
  /** 「横浜 330 な 1234」のようにつないだナンバー */
  plate: string | null;
  selected: boolean;
  /** そのお車での最後のご来店日（YYYY-MM-DD） */
  last_visited_on: string | null;
}
export interface VehiclesResult {
  ok: true;
  /** 所有している車両（ホーム画面に出す） */
  selected: Vehicle[];
  /** 過去に記録のあるお車（履歴から選ぶときに出す） */
  history: Vehicle[];
}
export function fetchMyVehicles() {
  return request<VehiclesResult>("my-vehicles", { body: { action: "list" } });
}
export function selectVehicle(vehicleId: string) {
  return request<VehiclesResult>("my-vehicles", { body: { action: "select", vehicle_id: vehicleId } });
}
export function unselectVehicle(vehicleId: string) {
  return request<VehiclesResult>("my-vehicles", { body: { action: "unselect", vehicle_id: vehicleId } });
}
export interface AddVehicleParams {
  maker?: string;
  model?: string;
  color?: string;
  plate_area?: string;
  plate_class?: string;
  plate_hiragana?: string;
  plate_number?: string;
}
export function addVehicle(params: AddVehicleParams) {
  return request<VehiclesResult>("my-vehicles", { body: { action: "add", ...params } });
}

/* ---------- my-bookings（ご利用履歴：予約＋来店） ----------
   ★ visits は店舗が記録したご来店。予約（bookings）はアプリ・Webから
     予約したときだけ作られるため、長年の常連のお客様ほど予約が0件になる。
     両方を1つの履歴として見せる（サーバー側の my-bookings.js 冒頭を参照）。 */
export interface Visit {
  id: string;
  /** YYYY-MM-DD（タイムゾーンでずれないよう文字列で受け取る） */
  visited_on: string;
  shop: string;
  service_note: string | null;
}
export interface MyBookingsResult {
  ok: true;
  bookings: Booking[];
  visits: Visit[];
}
export function fetchMyBookings() {
  return request<MyBookingsResult>("my-bookings");
}

/* ---------- my-coupons ---------- */
export interface MyCouponsResult {
  ok: true;
  coupons: Coupon[];
  available_count: number;
}
export function fetchMyCoupons() {
  return request<MyCouponsResult>("my-coupons");
}

/* ---------- my-stamps ---------- */
export interface MyStampsResult {
  ok: true;
  /** スタンプ制度が設定されていなければ null */
  card: StampCard | null;
}
export function fetchMyStamps() {
  return request<MyStampsResult>("my-stamps");
}

/* ---------- my-prepaid（回数券の残高と履歴） ---------- */
export interface MyPrepaidResult {
  ok: true;
  balance: number;
  history: PrepaidEntry[];
}
export function fetchMyPrepaid() {
  return request<MyPrepaidResult>("my-prepaid");
}

/* ---------- my-delete-account（アカウントの削除） ---------- */
/** Appleのガイドライン 5.1.1(v) で必須。アプリのログイン情報だけを消し、
 *  顧客台帳・来店履歴・回数券の残高は店舗の業務記録として残る。 */
export function deleteMyAccount() {
  return request<{ ok: true }>("my-delete-account", { body: { confirm: "delete" } });
}

/* ---------- link-booking ---------- */
export interface LinkBookingResult {
  ok: true;
  booking: Booking;
}
export function linkBooking(publicToken: string) {
  return request<LinkBookingResult>("link-booking", { body: { public_token: publicToken } });
}

/* ---------- menu ---------- */
export interface NominationStaff {
  id: string;
  name: string;
  role?: string;
  photo?: string;
}
export interface Nomination {
  enabled: boolean;
  shop: string | null;   // null＝全店舗で指名可
  slotTime: string;
  fee: number;
  staffLabel: string;
  staff?: NominationStaff[];
}
export interface MenuResult {
  ok: true;
  groups: MenuGroup[];
  categories: MenuCategories;
  size_guide: string;
  nickname_guide: string;
  nomination?: Nomination;
}

const MENU_CACHE_KEY = "ccc_menu_cache";
const MENU_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // SPEC §5.2：24hキャッシュ

/** メニューマスターを取得する。ハードコードは禁止（SPEC §5.2）なので、
 *  必ずAPI経由で取得し、AsyncStorageに24hキャッシュする。オフライン時は
 *  期限切れでもキャッシュを使う（通信できないよりは古い情報の方がまし）。 */
export async function fetchMenu(): Promise<MenuResult> {
  try {
    const cached = await AsyncStorage.getItem(MENU_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as { savedAt: number; data: MenuResult };
      if (Date.now() - parsed.savedAt < MENU_CACHE_TTL_MS) {
        return parsed.data;
      }
    }
  } catch {
    // noop：キャッシュが壊れていても通常取得にフォールバック
  }

  try {
    const fresh = await request<MenuResult>("menu", { method: "GET", auth: false });
    AsyncStorage.setItem(MENU_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data: fresh })).catch(() => {});
    return fresh;
  } catch (e) {
    // 通信失敗時：期限切れでもキャッシュがあれば使う（オフライン救済）
    try {
      const cached = await AsyncStorage.getItem(MENU_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { savedAt: number; data: MenuResult };
        return parsed.data;
      }
    } catch {
      // noop
    }
    throw e;
  }
}

/* ---------- ask（S3 車種判定）----------
   ★ 他のAPIと違い API_BASE を使わない（上の ASK_URL の注記を参照）。
     request() を通さず、ここだけ個別に組み立てている。 */
export interface AskResult {
  content?: { text: string }[];
}
export async function askAI(system: string, userText: string): Promise<AskResult> {
  if (!ASK_URL) throw new ApiError("車種判定をご利用いただけません。お手数ですが車種をお選びください。");

  let res: Response;
  try {
    res = await fetch(ASK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ system, messages: [{ role: "user", content: userText }] }),
    });
  } catch {
    throw new ApiError("通信エラーが発生しました。ネットワークをご確認ください。");
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = typeof data.error === "string" ? data.error : "車種を判定できませんでした。";
    throw new ApiError(message);
  }
  return data as AskResult;
}

/* ---------- slots（既存 slots.js をそのまま流用。S5空き時間取得用） ---------- */
export interface SlotsResult {
  ok: true;
  booked: string[];
}
export function fetchSlots(shop: string, date: string) {
  return request<SlotsResult>("slots", { body: { shop, date }, auth: false });
}

/* ---------- 指名スタッフの出勤表 ----------
   ご指名の場合、そのスタッフが出ている日だけをお選びいただくために使う。
   返ってくる shifts に入っているのは「お休みの日」だけで、
   入っていない日は出勤（サーバー側 _staff-shifts.js と同じ決まり）。
   GET＋クエリなので request() は通さず、ここで組み立てる。 */
export interface StaffShiftsResult {
  ok: true;
  staff?: NominationStaff[];
  fee?: number;
  slot_time?: string;
  shifts?: Record<string, Record<string, boolean>>;
}
export async function fetchStaffShifts(from: string, days: number): Promise<StaffShiftsResult> {
  const url = `${API_BASE}/nomination-staff?from=${encodeURIComponent(from)}&days=${days}`;
  let res: Response;
  try {
    res = await fetch(url, { method: "GET" });
  } catch {
    throw new ApiError("通信エラーが発生しました。ネットワークをご確認ください。");
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    throw new ApiError(typeof data.error === "string" ? data.error : "出勤状況を取得できませんでした");
  }
  return data as unknown as StaffShiftsResult;
}

/* ---------- payment-intent（事前決済の決済枠を作成。金額はサーバー側で再計算） ---------- */
export interface PaymentIntentResult {
  ok: true;
  client_secret: string;
  amount: number;
}
export function createPaymentIntent(
  items: { id: string; name: string; option: string | null; price: number | null }[],
  category: string,
  nomination?: { nominated: boolean; shop: string | null; slot_time: string | null; staff_id: string | null }
) {
  return request<PaymentIntentResult>("payment-intent", {
    body: {
      items,
      category,
      nominated: nomination?.nominated ?? false,
      shop: nomination?.shop ?? null,
      slot_time: nomination?.slot_time ?? null,
      nominated_staff_id: nomination?.staff_id ?? null,
    },
  });
}

/* ---------- booking（既存 booking.js を拡張。auth_token+source:"app"で送信） ---------- */
export interface SubmitBookingParams {
  order: {
    car_input: string;
    car_official: string;
    category: string;
    total_price: number;
    duration_text: string;
    items: { id: string; name: string; option: string | null; price: number | null }[];
  };
  shop: string | null;
  preferred_at: string | null;
  note: string | null;
  payment_intent_id?: string;
  nominated?: boolean;
  nominated_staff_id?: string | null;
  /** 適用するクーポン（coupon_grants.id）。割引額はサーバーが計算する */
  coupon_grant_id?: string | null;
}
export interface SubmitBookingResult {
  ok: true;
  id: string;
  token: string;
}
export async function submitBooking(params: SubmitBookingParams) {
  const token = await getToken();
  return request<SubmitBookingResult>("booking", {
    body: { ...params, customer: {}, auth_token: token, source: "app" },
    auth: false,
  });
}

/* ---------- push-register（Phase 4 で利用開始） ---------- */
export function registerPushToken(expoPushToken: string, platform: "ios" | "android") {
  return request<{ ok: true }>("push-register", { body: { expo_push_token: expoPushToken, platform } });
}
