/* ============================================================
   pricing.ts  ―  予約フローの金額・作業時間の計算（クライアント側表示用）
   ------------------------------------------------------------
   carcare-reservation/reserve.js の itemPrice()/recalc()/currentOrder() と
   同一挙動になるように実装している（IMPLEMENTATION_PLAN.md Phase3の指示：
   「carcare-reservation/reserve.js の計算ロジックを読み、挙動を一致させる」）。
   実際の金額確定はサーバー側 _pricing.js が行うため、ここはあくまで
   確認画面・メニュー選択画面の表示用。
============================================================ */

import type { MenuGroup, MenuItem } from "./types";

export interface Selection {
  optionIndex?: number;
  qty?: number;
}

export type Selections = Record<string, Selection>;

export interface OrderLine {
  id: string;
  label: string;
  price: number | null; // null = 未確定（要見積り／カテゴリー未判定）
  isQuote: boolean;
}

export interface OrderSummary {
  lines: OrderLine[];
  total: number;
  hasQuote: boolean;
  durationText: string;
  isEmpty: boolean;
}

export interface OrderPayload {
  car_input: string;
  car_official: string;
  category: string;
  total_price: number;
  duration_text: string;
  items: { id: string; name: string; option: string | null; price: number | null }[];
}

function minutesToText(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}時間${m}分`;
  if (h) return `${h}時間`;
  return `${m}分`;
}

export function findMenuItem(groups: MenuGroup[], itemId: string): MenuItem | null {
  for (const group of groups) {
    const found = group.items.find((it) => it.id === itemId);
    if (found) return found;
  }
  return null;
}

export function itemGroupId(groups: MenuGroup[], itemId: string): string | null {
  for (const group of groups) {
    if (group.items.some((it) => it.id === itemId)) return group.id;
  }
  return null;
}

/* 1メニューの料金（円）／ null=未確定（車種未判定や要見積り） */
export function itemPrice(item: MenuItem, sel: Selection, category: string): number | null {
  if (item.priceType === "quote") return null;
  if (item.priceType === "options") {
    const opt = (item.options ?? [])[sel.optionIndex ?? 0];
    if (!opt) return null;
    return opt.perUnit ? opt.price * (sel.qty ?? 1) : opt.price;
  }
  if (item.priceType === "category") {
    if (!category || !item.prices) return null;
    return item.prices[category] ?? null;
  }
  return null;
}

function optionLabel(item: MenuItem, sel: Selection): string | null {
  if (item.priceType !== "options") return null;
  const opt = (item.options ?? [])[sel.optionIndex ?? 0];
  if (!opt) return null;
  return opt.perUnit ? `${opt.label}（${sel.qty ?? 1}${opt.unitLabel ?? ""}）` : opt.label;
}

export function needsCategory(groups: MenuGroup[], selections: Selections, category: string): boolean {
  if (category) return false;
  return Object.keys(selections).some((id) => {
    const item = findMenuItem(groups, id);
    return item?.priceType === "category";
  });
}

/* 合計金額・作業時間目安・明細行を計算する（reserve.jsのrecalc()相当） */
export function summarizeOrder(groups: MenuGroup[], selections: Selections, category: string): OrderSummary {
  let total = 0;
  let hasQuote = false;
  let totalMin = 0;
  let numericCount = 0;
  const timedParts: string[] = [];
  const lines: OrderLine[] = [];

  Object.keys(selections).forEach((id) => {
    const item = findMenuItem(groups, id);
    if (!item) return;
    const sel = selections[id];
    const price = itemPrice(item, sel, category);
    const opt = optionLabel(item, sel);
    const label = opt ? `${item.name}（${opt}）` : item.name;
    const isQuote = item.priceType === "quote";

    if (price == null) {
      if (isQuote) hasQuote = true;
    } else {
      total += price;
    }
    lines.push({ id, label, price, isQuote });

    if (item.durationText) {
      timedParts.push(item.durationText);
    } else if (item.durationMin != null) {
      totalMin += item.durationMin;
      numericCount++;
    }
  });

  const isEmpty = Object.keys(selections).length === 0;
  let durationText = "—";
  if (!isEmpty) {
    if (numericCount === 0 && timedParts.length === 0) {
      durationText = "オプションのみ（待ち時間ほぼなし）";
    } else {
      const parts: string[] = [];
      if (numericCount > 0) parts.push(minutesToText(totalMin));
      timedParts.forEach((t) => parts.push(t));
      durationText = parts.join(" ＋ ");
    }
  }

  return { lines, total, hasQuote, durationText, isEmpty };
}

/* 送信用の注文オブジェクトを組み立てる（reserve.jsのcurrentOrder()相当） */
export function buildOrderPayload(
  groups: MenuGroup[],
  selections: Selections,
  category: string,
  carInput: string,
  official: string
): OrderPayload {
  const summary = summarizeOrder(groups, selections, category);
  return {
    car_input: carInput,
    car_official: official,
    category,
    total_price: summary.total,
    duration_text: summary.durationText,
    items: Object.keys(selections).map((id) => {
      const item = findMenuItem(groups, id);
      const sel = selections[id];
      return {
        id,
        name: item?.name ?? id,
        option: item ? optionLabel(item, sel) : null,
        price: item ? itemPrice(item, sel, category) : null,
      };
    }),
  };
}
