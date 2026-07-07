/* ============================================================
   api.ts  ―  バックエンドAPIクライアント（SPEC.md §6）
   ------------------------------------------------------------
   ・fetch のみ使用（axios等は入れない。SPEC §1.1）
   ・認証トークンは expo-secure-store に保存
   ・エラーは日本語メッセージの ApiError として投げる（呼び出し側は
     catch して e.message をそのまま画面に出せる）
============================================================ */

import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import type { Booking, Customer, MenuCategories, MenuGroup } from "./types";

const API_BASE = (Constants.expoConfig?.extra?.API_BASE as string | undefined) ?? "";
const TOKEN_KEY = "ccc_auth_token";

export class ApiError extends Error {}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // SecureStoreが使えない環境（一部Web等）でも致命的にはしない
  }
}

export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
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
    headers.authorization = `Bearer ${token}`;
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
    throw new ApiError(message);
  }
  return data as T;
}

/* ---------- app-register ---------- */
export interface RegisterParams {
  name: string;
  name_kana?: string;
  phone?: string;
  email?: string;
  existing_token?: string;
}
export interface RegisterResult {
  ok: true;
  auth_token: string;
  customer: Customer;
}
export function registerProfile(params: RegisterParams) {
  return request<RegisterResult>("app-register", { body: params, auth: false });
}

/* ---------- my-bookings ---------- */
export interface MyBookingsResult {
  ok: true;
  bookings: Booking[];
}
export function fetchMyBookings() {
  return request<MyBookingsResult>("my-bookings");
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
export interface MenuResult {
  ok: true;
  groups: MenuGroup[];
  categories: MenuCategories;
}
export function fetchMenu() {
  return request<MenuResult>("menu", { method: "GET", auth: false });
}

/* ---------- push-register（Phase 4 で利用開始） ---------- */
export function registerPushToken(expoPushToken: string, platform: "ios" | "android") {
  return request<{ ok: true }>("push-register", { body: { expo_push_token: expoPushToken, platform } });
}
