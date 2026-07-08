/* ============================================================
   reserve/datetime.tsx  ―  S5 店舗・日時選択（3/4。SPEC.md §4.2）
   ------------------------------------------------------------
   店舗5つから選択（必須）→ 日付（今日から14日）→ 既存slots.js APIで
   空き時間を取得し、埋まっている枠（30分刻み・10:00〜18:00。
   reserve-form.jsと同一）を非活性にする。
   「日時は店頭で調整する」チェックでスキップ可（preferred_at = null）。
============================================================ */

import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { StepIndicator } from "@/components/StepIndicator";
import { ReserveHeader } from "@/components/ReserveHeader";
import { GoldButton } from "@/components/GoldButton";
import { useReservation } from "@/lib/reservation-context";
import { fetchSlots } from "@/lib/api";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";

const STORE_NAMES = ["横浜ランドマークタワー店", "そごう横浜店", "東戸塚オーロラシティ店", "六本木ヒルズ店", "銀座店"];
const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];
const DAYS_AHEAD = 14;

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildTimeOptions(): string[] {
  const options: string[] = [];
  for (let m = 10 * 60; m <= 18 * 60; m += 30) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    options.push(`${hh}:${mm}`);
  }
  return options;
}
const TIME_OPTIONS = buildTimeOptions();

export default function DateTimeScreen() {
  const router = useRouter();
  const { shop, setShop, preferredDate, setPreferredDate, preferredTime, setPreferredTime, skipDateTime, setSkipDateTime } =
    useReservation();

  const [booked, setBooked] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

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
              {dateOptions.map((d) => {
                const key = toDateKey(d);
                const active = preferredDate === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.dateChip, active && styles.dateChipOn]}
                    onPress={() => {
                      setPreferredDate(key);
                      setPreferredTime(null);
                    }}
                  >
                    <Text style={[styles.dateChipDay, active && styles.dateChipTextOn]}>{d.getDate()}</Text>
                    <Text style={[styles.dateChipWd, active && styles.dateChipTextOn]}>{WEEKDAY[d.getDay()]}</Text>
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
                  {TIME_OPTIONS.map((t) => {
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
    width: 48,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
  },
  dateChipOn: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
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
  bottomBar: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
});
