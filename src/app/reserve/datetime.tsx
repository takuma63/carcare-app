/* ============================================================
   reserve/datetime.tsx  ―  S5 店舗・日時選択（3/4。SPEC.md §4.2）
   ------------------------------------------------------------
   店舗5つから選択（必須）→ 日付（今日から14日）→ 既存slots.js APIで
   空き時間を取得し、埋まっている枠（30分刻み・10:00〜18:00。
   reserve-form.jsと同一）を非活性にする。
   「日時は店頭で調整する」チェックでスキップ可（preferred_at = null）。
============================================================ */

import React, { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { StepIndicator } from "@/components/StepIndicator";
import { ReserveHeader } from "@/components/ReserveHeader";
import { GoldButton } from "@/components/GoldButton";
import { useReservation } from "@/lib/reservation-context";
import { fetchSlots } from "@/lib/api";
import { staffPhoto } from "@/lib/staff-photos";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";

const STORE_NAMES = ["横浜ランドマークタワー店", "そごう横浜店", "東戸塚オーロラシティ店", "六本木ヒルズ店", "銀座店"];
const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];
const DAYS_AHEAD = 14;

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildTimeOptions(lastMinutes: number): string[] {
  const options: string[] = [];
  for (let m = 10 * 60; m <= lastMinutes; m += 30) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    options.push(`${hh}:${mm}`);
  }
  return options;
}

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function DateTimeScreen() {
  const router = useRouter();
  const {
    menu, shop, setShop, preferredDate, setPreferredDate, preferredTime, setPreferredTime,
    nominatedStaffId, setNominatedStaffId, skipDateTime, setSkipDateTime,
  } = useReservation();

  const [booked, setBooked] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // 通常枠は全店 10:00〜18:00。六本木ヒルズ店の18:00では任意でスタッフ指名を付けられる
  const nom = menu?.nomination?.enabled ? menu.nomination : null;
  const isNomShop = !!(nom && shop === nom.shop);
  const staffList = nom?.staff ?? [];
  const timeOptions = useMemo(() => buildTimeOptions(18 * 60), []);
  // 指名UIを出せる状態か（対象店＋18:00枠を選択中）
  const nominateEligible = !!(nom && isNomShop && preferredTime === nom.slotTime);

  // 18:00以外に移ったら指名を解除する（料金が残らないように）
  useEffect(() => {
    if (!nominateEligible && nominatedStaffId) setNominatedStaffId(null);
  }, [nominateEligible, nominatedStaffId, setNominatedStaffId]);

  const dateOptions = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  useEffect(() => {
    if (!shop || !preferredDate || skipDateTime) {
      setBooked([]);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    fetchSlots(shop, preferredDate)
      .then((res) => {
        if (!cancelled) setBooked(res.booked);
      })
      .catch(() => {
        if (!cancelled) setBooked([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shop, preferredDate, skipDateTime]);

  const handleToggleSkip = () => {
    const next = !skipDateTime;
    setSkipDateTime(next);
    if (next) {
      setPreferredDate(null);
      setPreferredTime(null);
    }
  };

  const canProceed = !!shop && (skipDateTime || (!!preferredDate && !!preferredTime));

  return (
    <View style={styles.flex}>
      <ReserveHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <StepIndicator current={3} />
        <Text style={styles.heading}>店舗・日時を選択</Text>

        <Text style={styles.sectionLabel}>ご希望店舗</Text>
        <View style={styles.storeList}>
          {STORE_NAMES.map((name) => (
            <TouchableOpacity
              key={name}
              style={[styles.storeRow, shop === name && styles.storeRowOn]}
              onPress={() => setShop(name)}
            >
              <Text style={[styles.storeName, shop === name && styles.storeNameOn]}>{name}</Text>
              {shop === name && <Feather name="check" size={18} color={colors.gold} />}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.skipRow} onPress={handleToggleSkip}>
          <View style={[styles.checkbox, skipDateTime && styles.checkboxOn]}>
            {skipDateTime && <Feather name="check" size={14} color={colors.white} />}
          </View>
          <Text style={styles.skipText}>日時は店頭で調整する</Text>
        </TouchableOpacity>

        {!skipDateTime && (
          <>
            <Text style={styles.sectionLabel}>ご希望日</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
              {dateOptions.map((d, idx) => {
                const key = toDateKey(d);
                const active = preferredDate === key;
                // 月跨ぎで迷わないよう「今日」「明日」、月初と先頭チップには「◯月」を添える
                const topLabel =
                  idx === 0 ? "今日" : idx === 1 ? "明日" : d.getDate() === 1 || idx === 2 ? `${d.getMonth() + 1}月` : "";
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.dateChip, active && styles.dateChipOn]}
                    onPress={() => {
                      setPreferredDate(key);
                      setPreferredTime(null);
                    }}
                  >
                    <Text style={[styles.dateChipTop, active && styles.dateChipTextOn]}>{topLabel || " "}</Text>
                    <Text style={[styles.dateChipDay, active && styles.dateChipTextOn]}>{d.getDate()}</Text>
                    <Text
                      style={[
                        styles.dateChipWd,
                        d.getDay() === 0 && styles.dateChipSun,
                        active && styles.dateChipTextOn,
                      ]}
                    >
                      {WEEKDAY[d.getDay()]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {preferredDate && (
              <>
                <Text style={styles.sectionLabel}>
                  ご希望時間（10:00〜18:00）{loadingSlots ? "　確認中…" : ""}
                </Text>
                <View style={styles.timeGrid}>
                  {timeOptions.map((t) => {
                    const isBooked = booked.includes(t);
                    const active = preferredTime === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        disabled={isBooked}
                        style={[styles.timeChip, active && styles.timeChipOn, isBooked && styles.timeChipDisabled]}
                        onPress={() => setPreferredTime(t)}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            active && styles.timeChipTextOn,
                            isBooked && styles.timeChipTextDisabled,
                          ]}
                        >
                          {isBooked ? `${t}（予約済）` : t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 指名オプション（六本木ヒルズ店・18:00枠を選択中のみ）。
                    スタッフを1名選ぶと確認画面で指名料が加算される（任意） */}
                {nominateEligible && nom && (
                  <View style={styles.nomBox}>
                    <View style={styles.nomHeadRow}>
                      <Feather name="award" size={18} color={colors.gold} />
                      <Text style={styles.nomHead}>スタッフを指名する（任意・＋{yen(nom.fee)}）</Text>
                    </View>
                    <Text style={styles.nomHint}>担当スタッフを1名お選びください。作業は指名スタッフが担当します。</Text>
                    <View style={styles.staffGrid}>
                      {staffList.map((s) => {
                        const active = nominatedStaffId === s.id;
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={[styles.staffCard, active && styles.staffCardOn]}
                            onPress={() => setNominatedStaffId(active ? null : s.id)}
                          >
                            <Image source={staffPhoto(s.id)} style={styles.staffPhoto} />
                            <Text style={styles.staffName} numberOfLines={1}>{s.name}</Text>
                            {!!s.role && <Text style={styles.staffRole} numberOfLines={1}>{s.role}</Text>}
                            {active && (
                              <View style={styles.staffCheck}>
                                <Feather name="check" size={12} color={colors.white} />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {nominatedStaffId && (
                      <TouchableOpacity onPress={() => setNominatedStaffId(null)}>
                        <Text style={styles.nomClear}>指名を解除する</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <GoldButton title="次へ" onPress={() => router.push("/reserve/confirm")} disabled={!canProceed} />
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
  sectionLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  storeList: {
    gap: spacing.xs,
  },
  storeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
  },
  storeRowOn: {
    borderColor: colors.gold,
    backgroundColor: "#fdf8ee",
  },
  storeName: {
    fontFamily: fonts.sans,
    fontSize: fontSize.body,
    color: colors.text,
  },
  storeNameOn: {
    fontFamily: fonts.sansMedium,
  },
  skipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
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
  skipText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.body,
    color: colors.text,
  },
  dateRow: {
    gap: spacing.xs,
  },
  dateChip: {
    width: 56,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
  },
  dateChipOn: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  dateChipTop: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.goldDeep,
    marginBottom: 2,
  },
  dateChipDay: {
    fontFamily: fonts.serifEn,
    fontSize: fontSize.h3,
    color: colors.text,
  },
  dateChipWd: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  dateChipSun: {
    color: colors.danger,
  },
  dateChipTextOn: {
    color: colors.white,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  timeChip: {
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
  },
  timeChipOn: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  timeChipDisabled: {
    backgroundColor: colors.bgSub,
    borderColor: colors.border,
  },
  timeChipText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.text,
  },
  timeChipTextOn: {
    color: colors.white,
  },
  timeChipTextDisabled: {
    color: colors.textLight,
  },
  nomBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 2,
    borderTopColor: colors.gold,
    borderRadius: radius,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  nomHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  nomHead: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.text,
    flexShrink: 1,
  },
  nomHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    lineHeight: 18,
  },
  staffGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  staffCard: {
    width: "30%",
    minWidth: 96,
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.bg,
  },
  staffCardOn: {
    borderColor: colors.gold,
    backgroundColor: "#fdf8ee",
  },
  staffPhoto: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius,
    backgroundColor: colors.bgSub,
    marginBottom: 6,
  },
  staffName: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.text,
  },
  staffRole: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textLight,
  },
  staffCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  nomClear: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.goldDeep,
    textDecorationLine: "underline",
    marginTop: 2,
  },
  bottomBar: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
});
