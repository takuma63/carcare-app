/* ============================================================
   i18n.tsx  ―  アプリの英語表示（2026-11-20）
   ------------------------------------------------------------
   ・画面の文言は t("日本語") で書く。英語モードのときだけ
     i18n-en.ts の英訳表から英語を返し、見つからなければ日本語のまま出す。
     （日本語の文言そのものを英訳表の引き当て名にしているので、
       コードを読むときは今までどおり日本語で読める）
   ・差し込みは t("残り{n}回", { n }) のように {名前} で書く
   ・サーバーから届いた文言（エラー・カテゴリー名など）も t() / tServer() で訳す
   ・言語を切り替えると、ルートの画面をまるごと組み直して全体に反映する
     （_layout.tsx の key={lang}）
   ・初回は端末の言語（日本語以外なら英語）。設定画面とログイン画面で切り替えられる
============================================================ */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EN, EN_PATTERNS } from "./i18n-en";

export type Lang = "ja" | "en";
const LANG_KEY = "ccc_lang";

let current: Lang = "ja";

export function getLang(): Lang {
  return current;
}
export function isEn(): boolean {
  return current === "en";
}

function fill(s: string, vars?: Record<string, string | number | null | undefined>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars && vars[k] != null ? String(vars[k]) : m));
}

/** 画面の文言。英語モードで英訳があれば英語、なければ日本語 */
export function t(ja: string, vars?: Record<string, string | number | null | undefined>): string {
  if (current === "en") {
    const en = EN[ja];
    if (en != null) return fill(en, vars);
  }
  return fill(ja, vars);
}

/** サーバーから届いた文言（エラーなど）。完全一致 → 決まった形（正規表現）の順で探す */
export function tServer(msg: string | null | undefined): string {
  if (!msg) return "";
  if (current !== "en") return msg;
  if (EN[msg] != null) return EN[msg];
  // 「1時間 ＋ 1泊2日（お預かり）」のようにつないだものは、1つずつ訳す
  if (msg.includes(" ＋ ")) return msg.split(" ＋ ").map((x) => tServer(x)).join(" + ");
  for (const [re, fn] of EN_PATTERNS) {
    const m = msg.match(re);
    if (m) return fn(m);
  }
  return msg;
}

/** サーバーが「・」でつないで返す一覧（クーポンの対象メニューなど）を1つずつ訳す */
export function tList(label: string | null | undefined): string {
  if (!label) return "";
  if (current !== "en") return label;
  return label.split("・").map((x) => t(x)).join(", ");
}

/** 予約に記録された選択肢名（「2列」「シート 1脚（2脚）」など）を訳す */
export function tOption(opt: string | null | undefined): string {
  if (!opt) return "";
  if (current !== "en") return opt;
  if (EN[opt] != null) return EN[opt];
  const m = opt.match(/^(.+)（(\d+)[^）]*）$/);
  if (m && EN[m[1]] != null) return `${EN[m[1]]} (×${m[2]})`;
  return opt;
}

/** 英語の別欄があれば英語モードでそちらを使う（メニュー名など） */
export function pick(ja: string, en?: string | null): string;
export function pick(ja: string | null | undefined, en?: string | null): string | null | undefined;
export function pick(ja: string | null | undefined, en?: string | null) {
  if (current === "en") return en || (ja ? t(ja) : ja);
  return ja;
}

/* ---------- 日付・時刻 ---------- */
const WEEK_JA = ["日", "月", "火", "水", "木", "金", "土"];
const WEEK_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function weekday(n: number): string {
  return (current === "en" ? WEEK_EN : WEEK_JA)[n] ?? "";
}

/** 「2026年11月26日（木）」／「Thu, Nov 26, 2026」。
 *  year=false で年を省く。time に "10:00" などを渡すと後ろに付ける */
export function fmtDate(d: Date, opts: { year?: boolean; weekday?: boolean; time?: string | null } = {}): string {
  const { year = true, weekday: wd = true, time = null } = opts;
  if (current === "en") {
    let s = `${MONTH_EN[d.getMonth()]} ${d.getDate()}`;
    if (year) s += `, ${d.getFullYear()}`;
    if (wd) s = `${WEEK_EN[d.getDay()]}, ` + s;
    return time ? `${s} ${time}` : s;
  }
  let s = `${d.getMonth() + 1}月${d.getDate()}日`;
  if (year) s = `${d.getFullYear()}年` + s;
  if (wd) s += `（${WEEK_JA[d.getDay()]}）`;
  return time ? `${s}${time}` : s;
}

/** YYYY-MM-DD の文字列を、タイムゾーンでずらさずに Date にする */
export function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

/* ---------- 言語の保存と切り替え ---------- */
function deviceLang(): Lang {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || "";
    return /^ja\b/i.test(loc) ? "ja" : "en";
  } catch {
    return "ja";
  }
}

interface LangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}
const LangContext = createContext<LangValue>({ lang: "ja", setLang: () => {} });

/* 切り替えたときに呼ぶ処理（プッシュ通知の言語をサーバーに伝えるなど） */
const changeListeners = new Set<(l: Lang) => void>();
export function onLangChange(fn: (l: Lang) => void): () => void {
  changeListeners.add(fn);
  return () => {
    changeListeners.delete(fn);
  };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);

  useEffect(() => {
    (async () => {
      let l: Lang = deviceLang();
      try {
        const saved = await AsyncStorage.getItem(LANG_KEY);
        if (saved === "ja" || saved === "en") l = saved;
      } catch {
        // 読めなくても端末の言語で続ける
      }
      current = l;
      setLangState(l);
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    current = l;
    setLangState(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
    changeListeners.forEach((fn) => fn(l));
  }, []);

  if (!lang) return null; // 起動画面が出ている間に読み終わる
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  return useContext(LangContext);
}
