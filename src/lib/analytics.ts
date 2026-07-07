/* ============================================================
   analytics.ts  ―  アプリ利用イベントの計測（SPEC.md §13.2）
   ------------------------------------------------------------
   ・イベントは即時送信せず、10件たまるか30秒ごとにまとめて track.js へ送る
   ・オフライン時は AsyncStorage に退避し、次回のフラッシュで再送する
   ・送信失敗はすべて握りつぶす（計測のためにUXを止めない）
   ・個人を特定する内容（氏名・電話等）を properties に入れないこと
============================================================ */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { getToken } from "./api";

const API_BASE = (Constants.expoConfig?.extra?.API_BASE as string | undefined) ?? "";
const QUEUE_KEY = "ccc_analytics_queue";
const FLUSH_INTERVAL_MS = 30000;
const FLUSH_THRESHOLD = 10;
const BATCH_MAX = 50;

interface QueuedEvent {
  event: string;
  properties?: Record<string, unknown>;
  at: string;
}

let queue: QueuedEvent[] = [];
let restored = false;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let flushing = false;

async function restoreQueue() {
  if (restored) return;
  restored = true;
  try {
    const saved = await AsyncStorage.getItem(QUEUE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as QueuedEvent[];
      queue = [...parsed, ...queue];
    }
  } catch {
    // noop：復元できなくても計測を止めない
  }
}

async function persistQueue() {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // noop
  }
}

async function flush() {
  if (flushing || !queue.length) return;
  const token = await getToken();
  if (!token) return; // 未登録中は送らずに貯めておく

  flushing = true;
  const batch = queue.slice(0, BATCH_MAX);
  try {
    const res = await fetch(`${API_BASE}/track`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ events: batch }),
    });
    if (res.ok) {
      queue = queue.slice(batch.length);
      await persistQueue();
    }
  } catch {
    // 通信失敗は握りつぶし、次回のフラッシュで再送する
  } finally {
    flushing = false;
  }
}

/** イベントを記録する（画面遷移・予約開始等）。SPEC §13.2 のホワイトリストに
 *  ない event 名を送ってもサーバー側で無視されるだけなので、ここでは検証しない。 */
export function track(event: string, properties?: Record<string, unknown>): void {
  restoreQueue().then(function () {
    queue.push({ event, properties, at: new Date().toISOString() });
    persistQueue();
    if (queue.length >= FLUSH_THRESHOLD) flush();
  });
}

/** アプリ起動時に一度だけ呼ぶ（_layout.tsx）。定期フラッシュを開始する。 */
export function startAnalytics(): void {
  restoreQueue();
  if (flushTimer) return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
}

export function stopAnalytics(): void {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
}
