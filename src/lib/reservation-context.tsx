/* ============================================================
   reservation-context.tsx  ―  予約フロー（S3〜S7）全体の状態管理
   ------------------------------------------------------------
   carcare-reservation/reserve.js の state オブジェクトと同じ役割。
   メニューマスター（menu API・24hキャッシュ）を一度だけ読み込み、
   車種判定結果・メニュー選択・店舗日時・備考を1画面ずつ積み上げていく。
============================================================ */

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { fetchMenu, type MenuResult } from "./api";
import { buildOrderPayload, itemGroupId, needsCategory, summarizeOrder, type Selection, type Selections } from "./pricing";
import type { MenuGroup } from "./types";

interface ReservationState {
  menu: MenuResult | null;
  menuLoading: boolean;
  menuError: string | null;
  loadMenu: () => Promise<void>;

  carInput: string;
  setCarInput: (v: string) => void;
  official: string;
  category: string;
  confidence: "high" | "low" | null;
  judgeNote: string | null;
  applyJudgedCategory: (official: string, category: string, confidence: "high" | "low") => void;
  applyManualCategory: (category: string) => void;
  setJudgeNote: (note: string | null) => void;

  selections: Selections;
  toggleItem: (item: { id: string; priceType: string }, groupId: string | null) => void;
  setOptionIndex: (itemId: string, optionIndex: number) => void;
  setQty: (itemId: string, qty: number) => void;

  shop: string | null;
  setShop: (shop: string | null) => void;
  preferredDate: string | null;
  setPreferredDate: (date: string | null) => void;
  preferredTime: string | null;
  setPreferredTime: (time: string | null) => void;
  skipDateTime: boolean;
  setSkipDateTime: (v: boolean) => void;
  note: string;
  setNote: (note: string) => void;

  needsCategory: boolean;
  summary: ReturnType<typeof summarizeOrder>;
  buildOrder: () => ReturnType<typeof buildOrderPayload>;
  reset: () => void;
}

const ReservationContext = createContext<ReservationState | null>(null);

export function ReservationProvider({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState<MenuResult | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  const [carInput, setCarInput] = useState("");
  const [official, setOfficial] = useState("");
  const [category, setCategory] = useState("");
  const [confidence, setConfidence] = useState<"high" | "low" | null>(null);
  const [judgeNote, setJudgeNote] = useState<string | null>(null);

  const [selections, setSelections] = useState<Selections>({});

  const [shop, setShop] = useState<string | null>(null);
  const [preferredDate, setPreferredDate] = useState<string | null>(null);
  const [preferredTime, setPreferredTime] = useState<string | null>(null);
  const [skipDateTime, setSkipDateTime] = useState(false);
  const [note, setNote] = useState("");

  const loadMenu = useCallback(async () => {
    if (menu) return;
    setMenuLoading(true);
    setMenuError(null);
    try {
      const result = await fetchMenu();
      setMenu(result);
    } catch (e) {
      setMenuError(e instanceof Error ? e.message : "メニューの取得に失敗しました");
    } finally {
      setMenuLoading(false);
    }
  }, [menu]);

  const applyJudgedCategory = useCallback((newOfficial: string, newCategory: string, newConfidence: "high" | "low") => {
    setOfficial(newOfficial);
    setCategory(newCategory);
    setConfidence(newConfidence);
    setJudgeNote(null);
  }, []);

  const applyManualCategory = useCallback((newCategory: string) => {
    setCategory(newCategory);
    setConfidence(null);
  }, []);

  const groups: MenuGroup[] = menu?.groups ?? [];

  /* single:true のグループ内は排他選択（既存Webと同じルール。reserve.jsのonItemChange相当） */
  const toggleItem = useCallback(
    (item: { id: string; priceType: string }, groupId: string | null) => {
      setSelections((prev) => {
        const next = { ...prev };
        const isSelected = !!next[item.id];
        if (isSelected) {
          delete next[item.id];
          return next;
        }
        if (groupId) {
          const group = groups.find((g) => g.id === groupId);
          if (group?.single) {
            group.items.forEach((it) => {
              delete next[it.id];
            });
          }
        }
        const initial: Selection = {};
        if (item.priceType === "options") {
          initial.optionIndex = 0;
          initial.qty = 1;
        }
        next[item.id] = initial;
        return next;
      });
    },
    [groups]
  );

  const setOptionIndex = useCallback((itemId: string, optionIndex: number) => {
    setSelections((prev) => (prev[itemId] ? { ...prev, [itemId]: { ...prev[itemId], optionIndex, qty: 1 } } : prev));
  }, []);

  const setQty = useCallback((itemId: string, qty: number) => {
    setSelections((prev) => (prev[itemId] ? { ...prev, [itemId]: { ...prev[itemId], qty } } : prev));
  }, []);

  const summary = useMemo(() => summarizeOrder(groups, selections, category), [groups, selections, category]);
  const needsCategoryValue = useMemo(() => needsCategory(groups, selections, category), [groups, selections, category]);

  const buildOrder = useCallback(
    () => buildOrderPayload(groups, selections, category, carInput, official),
    [groups, selections, category, carInput, official]
  );

  const reset = useCallback(() => {
    setCarInput("");
    setOfficial("");
    setCategory("");
    setConfidence(null);
    setJudgeNote(null);
    setSelections({});
    setShop(null);
    setPreferredDate(null);
    setPreferredTime(null);
    setSkipDateTime(false);
    setNote("");
  }, []);

  const value: ReservationState = {
    menu,
    menuLoading,
    menuError,
    loadMenu,
    carInput,
    setCarInput,
    official,
    category,
    confidence,
    judgeNote,
    applyJudgedCategory,
    applyManualCategory,
    setJudgeNote,
    selections,
    toggleItem,
    setOptionIndex,
    setQty,
    shop,
    setShop,
    preferredDate,
    setPreferredDate,
    preferredTime,
    setPreferredTime,
    skipDateTime,
    setSkipDateTime,
    note,
    setNote,
    needsCategory: needsCategoryValue,
    summary,
    buildOrder,
    reset,
  };

  return <ReservationContext.Provider value={value}>{children}</ReservationContext.Provider>;
}

export function useReservation(): ReservationState {
  const ctx = useContext(ReservationContext);
  if (!ctx) throw new Error("useReservation は ReservationProvider の内側で使ってください");
  return ctx;
}

export { itemGroupId };
