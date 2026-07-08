/* ============================================================
   reserve/menu.tsx  ―  S4 メニュー選択（2/4。SPEC.md §4.2）
   ------------------------------------------------------------
   menu API（24hキャッシュ）から取得したMENU_GROUPSをアコーディオン表示。
   single:true のグループは排他選択（既存Webと同じルール）。
   合計金額・作業時間の計算は src/lib/pricing.ts（reserve.js準拠）を使う。
============================================================ */

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { StepIndicator } from "@/components/StepIndicator";
import { ReserveHeader } from "@/components/ReserveHeader";
import { GoldButton } from "@/components/GoldButton";
import { useReservation } from "@/lib/reservation-context";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";
import type { MenuGroup, MenuItem } from "@/lib/types";

/* オンライン予約では扱わないグループ（法人向け・要見積りのみ。reserve.jsのEXCLUDED_GROUP_IDSと同一） */
const EXCLUDED_GROUP_IDS = ["mobile-wash"];
/* メインメニューは常時展開（reserve.jsのMAIN_GROUP_IDSと同一） */
const MAIN_GROUP_IDS = ["wash", "wash-special", "wash-wax", "coating-feynlab", "coating-gzox", "coating-other"];

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function MenuSelectScreen() {
  const router = useRouter();
  const { menu, category, selections, toggleItem, setOptionIndex, setQty, summary } = useReservation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const groups = (menu?.groups ?? []).filter((g) => !EXCLUDED_GROUP_IDS.includes(g.id));
  const mainGroups = groups.filter((g) => MAIN_GROUP_IDS.includes(g.id));
  const subGroups = groups.filter((g) => !MAIN_GROUP_IDS.includes(g.id));

  const toggleOpen = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const renderPriceLabel = (item: MenuItem): string => {
    if (item.priceType === "quote") return "要お見積り";
    if (item.priceType === "options") {
      const first = item.options?.[0];
      return first ? `${yen(first.price)}〜` : "";
    }
    if (item.priceType === "category") {
      return category && item.prices ? yen(item.prices[category]) : "車種判定後に表示";
    }
    return "";
  };

  const renderItem = (item: MenuItem, group: MenuGroup) => {
    const sel = selections[item.id];
    const isSelected = !!sel;
    const selectedOption = item.options?.[sel?.optionIndex ?? 0];
    const showQty = isSelected && item.priceType === "options" && selectedOption?.perUnit;

    return (
      <View key={item.id} style={styles.itemBlock}>
        <TouchableOpacity style={styles.itemRow} onPress={() => toggleItem(item, group.id)} activeOpacity={0.7}>
          <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
            {isSelected && <Feather name="check" size={14} color={colors.white} />}
          </View>
          <View style={styles.itemBody}>
            <Text style={styles.itemName}>
              {item.name}
              {item.note ? <Text style={styles.itemNote}> {item.note}</Text> : null}
            </Text>
          </View>
          <Text style={styles.itemPrice}>{renderPriceLabel(item)}</Text>
        </TouchableOpacity>

        {isSelected && item.priceType === "options" && item.options && (
          <View style={styles.optionRow}>
            {item.options.map((opt, idx) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.optionChip, sel.optionIndex === idx && styles.optionChipOn]}
                onPress={() => setOptionIndex(item.id, idx)}
              >
                <Text style={[styles.optionChipText, sel.optionIndex === idx && styles.optionChipTextOn]}>
                  {opt.label}（{yen(opt.price)}
                  {item.priceFrom ? "〜" : ""}）
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {showQty && (
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQty(item.id, Math.max(1, (sel.qty ?? 1) - 1))}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyVal}>{sel.qty ?? 1}</Text>
            <Text style={styles.qtyUnit}>{selectedOption?.unitLabel ?? ""}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQty(item.id, Math.min(10, (sel.qty ?? 1) + 1))}
            >
              <Text style={styles.qtyBtnText}>＋</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderGroup = (group: MenuGroup) => (
    <View key={group.id} style={styles.groupBlock}>
      <Text style={styles.groupTitle}>{group.name}</Text>
      {group.note && <Text style={styles.groupNote}>{group.note}</Text>}
      {group.items.map((item) => renderItem(item, group))}
    </View>
  );

  const renderAccordionGroup = (group: MenuGroup) => {
    const isOpen = !!openGroups[group.id];
    const hasSelection = group.items.some((it) => !!selections[it.id]);
    return (
      <View key={group.id} style={styles.accGroup}>
        <TouchableOpacity style={styles.accHeader} onPress={() => toggleOpen(group.id)}>
          <Feather name={isOpen ? "chevron-down" : "chevron-right"} size={18} color={colors.text} />
          <Text style={styles.accTitle}>{group.name}</Text>
          {hasSelection && <View style={styles.accDot} />}
          <Text style={styles.accCount}>{group.items.length}メニュー</Text>
        </TouchableOpacity>
        {isOpen && (
          <View style={styles.accBody}>
            {group.note && <Text style={styles.groupNote}>{group.note}</Text>}
            {group.items.map((item) => renderItem(item, group))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.flex}>
      <ReserveHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <StepIndicator current={2} />
        <Text style={styles.heading}>メニューを選択</Text>

        {mainGroups.map(renderGroup)}

        <Text style={styles.optionsLabel}>オプション（複数選択可）</Text>
        {subGroups.map(renderAccordionGroup)}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInfo}>
          <Text style={styles.bottomBarPrice}>
            {summary.total > 0 ? yen(summary.total) + (summary.hasQuote ? " ＋ 要見積り" : "") : summary.hasQuote ? "要見積り" : "¥0"}
          </Text>
          <Text style={styles.bottomBarTime}>作業時間目安：{summary.durationText}</Text>
        </View>
        <GoldButton
          title="次へ"
          onPress={() => router.push("/reserve/datetime")}
          disabled={summary.isEmpty}
          style={styles.bottomBarButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl, gap: spacing.md },
  heading: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h2,
    color: colors.text,
    marginTop: spacing.sm,
  },
  groupBlock: {
    gap: spacing.xs,
  },
  groupTitle: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
    marginTop: spacing.sm,
  },
  groupNote: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    marginBottom: 4,
  },
  itemBlock: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.text,
  },
  itemNote: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  itemPrice: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.goldDeep,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginLeft: 32,
  },
  optionChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
  },
  optionChipOn: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  optionChipText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.text,
  },
  optionChipTextOn: {
    color: colors.white,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginLeft: 32,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.body,
    color: colors.text,
  },
  qtyVal: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.text,
    minWidth: 20,
    textAlign: "center",
  },
  qtyUnit: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  optionsLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  accGroup: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    overflow: "hidden",
  },
  accHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgSub,
  },
  accTitle: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.text,
  },
  accDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  accCount: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textLight,
  },
  accBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  bottomBarInfo: {
    flex: 1,
  },
  bottomBarPrice: {
    fontFamily: fonts.serifEn,
    fontSize: fontSize.h3,
    color: colors.text,
  },
  bottomBarTime: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textLight,
  },
  bottomBarButton: {
    minWidth: 120,
  },
});
