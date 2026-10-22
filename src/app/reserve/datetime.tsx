/* ============================================================
   reserve/datetime.tsx  ―  S5 店舗・日時選択（3/4。SPEC.md §4.2）
   ------------------------------------------------------------
   店舗5つから選択（必須）→ ご指名の有無 → 日付（今日から14日）→
   既存slots.js APIで空き時間を取得し、埋まっている枠（30分刻み・
   10:00〜18:00。reserve-form.jsと同一）を非活性にする。
   「日時は店頭で調整する」チェックでスキップ可（preferred_at = null）。

   ★ ご指名について（2026-10-22 発注者の要望。Web予約と同じ流れに揃えた）
     以前は「18:00の枠を選んで初めて指名欄が出る」形だったため、
     指名制度があることに気づかれなかった。店舗を選んだ直後に
     「指名しない／スタッフを指名する」を選んでいただく形にして、
     指名する場合はそのスタッフの出勤日だけを日付に出す。
     （出勤表＝/api/nomination-staff?from=&days=。入っているのは休みの日だけ）
============================================================ */

import React, { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { StepIndicator } from "@/components/StepIndicator";
import { ReserveHeader } from "@/components/ReserveHeader";
import { GoldButton } from "@/components/GoldButton";
import { useReservation } from "@/lib/reservation-context";
import { fetchSlots, fetchStaffShifts } from "@/lib/api";
import { staffPhoto } from "@/lib/staff-photos";
import { ShopMap } from "@/components/ShopMap";
import { SHOP_NAMES, findShop } from "@/lib/shops";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";

const STORE_NAMES = SHOP_NAMES;   // 大元は src/lib/shops.ts
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

  // 通常枠は全店 10:00〜18:00。ご指名は 18:00 の枠のみ
  // （nom.shop が null なら全店舗、店舗名なら当該店のみ）
  const nom = menu?.nomination?.enabled ? menu.nomination : null;
  const isNomShop = !!(nom && !!shop && (nom.shop == null || shop === nom.shop));
  const staffList = nom?.staff ?? [];
  const timeOptions = useMemo(() => buildTimeOptions(18 * 60), []);

  /* ご指名の有無。null＝まだ選んでいない（店舗を選んだ直後の状態）。
     戻ってきたときに選び直さなくて済むよう、スタッフが残っていれば「する」から始める。 */
  const [nomMode, setNomMode] = useState<"yes" | "no" | null>(nominatedStaffId ? "yes" : null);
  const [offDays, setOffDays] = useState<Record<string, boolean>>({});   // 選択中スタッフの休み
  const [loadingShifts, setLoadingShifts] = useState(false);

  // 指名を受け付けない店舗では、この選択自体を出さずに従来どおり進む
  useEffect(() => {
    if (!isNomShop && nomMode !== "no") {
      setNomMode(shop ? "no" : null);
      if (nominatedStaffId) setNominatedStaffId(null);
    }
  }, [isNomShop, shop]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* 選択中スタッフの出勤表を取る。入っているのは休みの日だけ。
     取れなかったときは休み無しとして扱い、ご指名が止まらないようにする
     （サーバー側 _staff-shifts.js と同じ考え方。最終的な可否は予約時に検証される）。 */
  useEffect(() => {
    if (nomMode !== "yes" || !nominatedStaffId) { setOffDays({}); return; }
    let cancelled = false;
    setLoadingShifts(true);
    const today = new Date();
    fetchStaffShifts(toDateKey(today), DAYS_AHEAD)
      .then((res) => { if (!cancelled) setOffDays(res.shifts?.[nominatedStaffId] ?? {}); })
      .catch(() => { if (!cancelled) setOffDays({}); })
      .finally(() => { if (!cancelled) setLoadingShifts(false); });
    return () => { cancelled = true; };
  }, [nomMode, nominatedStaffId]);

  const isOffDay = (key: string) => offDays[key] === false;

  /* ご指名のときは 18:00 に固定する（ご指名はその枠だけのため）。
     ただしその日の 18:00 が既に埋まっていれば選べないので外す。 */
  useEffect(() => {
    if (nomMode !== "yes" || !nom || !nominatedStaffId || !preferredDate || loadingSlots) return;
    const want = booked.includes(nom.slotTime) ? null : nom.slotTime;
    if (preferredTime !== want) setPreferredTime(want);
  }, [nomMode, nominatedStaffId, preferredDate, booked, loadingSlots, preferredTime, nom, setPreferredTime]);

  /* ご指名をやめたら、固定していた時間も外す */
  const chooseNomMode = (mode: "yes" | "no") => {
    setNomMode(mode);
    if (mode === "no") {
      setNominatedStaffId(null);
      setPreferredTime(null);
      setOffDays({});
    } else {
      setSkipDateTime(false);   // ご指名は日時が決まらないと成立しない
      setPreferredTime(null);
    }
  };

  /* 選んだスタッフが休みの日を選んでいたら、日付を外す（表示と選択を食い違わせない） */
  useEffect(() => {
    if (nomMode === "yes" && preferredDate && isOffDay(preferredDate)) setPreferredDate(null);
  }, [nomMode, preferredDate, offDays]);   // eslint-disable-line react-hooks/exhaustive-deps

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
              <View style={styles.storeBody}>
                <Text style={[styles.storeName, shop === name && styles.storeNameOn]}>{name}</Text>
                <Text style={styles.storePlace}>{findShop(name)?.access}</Text>
              </View>
              {shop === name && <Feather name="check" size={18} color={colors.gold} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* 選んだ店舗の場所（2026-10-02 社長要望でGoogleマップを埋め込み） */}
        <ShopMap shopName={shop} />

        {/* ご指名の有無。店舗の次に決めていただく（Web予約と同じ流れ） */}
        {!!shop && isNomShop && nom && (
          <>
            <Text style={styles.sectionLabel}>スタッフのご指名</Text>
            <View style={styles.nomChoice}>
              <TouchableOpacity
                style={[styles.nomCard, nomMode === "no" && styles.nomCardOn]}
                onPress={() => chooseNomMode("no")}
              >
                <Text style={[styles.nomCardTitle, nomMode === "no" && styles.nomCardTitleOn]}>指名しない</Text>
                <Text style={styles.nomCardDesc}>空いているお時間からお選びいただけます。</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nomCard, nomMode === "yes" && styles.nomCardOn]}
                onPress={() => chooseNomMode("yes")}
              >
                <Text style={[styles.nomCardTitle, nomMode === "yes" && styles.nomCardTitleOn]}>スタッフを指名する</Text>
                <Text style={styles.nomCardDesc}>指名料 ＋{yen(nom.fee)}／{nom.slotTime}〜の枠</Text>
              </TouchableOpacity>
            </View>

            {nomMode === "yes" && (
              <>
                <Text style={styles.nomPick}>ご指名のスタッフをお選びください。</Text>
                <View style={styles.staffGrid}>
                  {staffList.map((st) => {
                    const active = nominatedStaffId === st.id;
                    return (
                      <TouchableOpacity
                        key={st.id}
                        style={[styles.staffCard, active && styles.staffCardOn]}
                        onPress={() => setNominatedStaffId(st.id)}
                      >
                        <Image source={staffPhoto(st.id)} style={styles.staffPhoto} />
                        <Text style={styles.staffName} numberOfLines={1}>{st.name}</Text>
                        {!!st.role && <Text style={styles.staffRole} numberOfLines={1}>{st.role}</Text>}
                        {active && (
                          <View style={styles.staffCheck}>
                            <Feather name="check" size={12} color={colors.white} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        {/* 日時は、ご指名の有無が決まってから出す
            （ご指名の場合はスタッフが決まるまで出勤日が分からないため） */}
        {(nomMode === "no" || (nomMode === "yes" && !!nominatedStaffId)) && (
        <>
        {nomMode === "no" && (
          <TouchableOpacity style={styles.skipRow} onPress={handleToggleSkip}>
            <View style={[styles.checkbox, skipDateTime && styles.checkboxOn]}>
              {skipDateTime && <Feather name="check" size={14} color={colors.white} />}
            </View>
            <Text style={styles.skipText}>日時は店頭で調整する</Text>
          </TouchableOpacity>
        )}

        {!skipDateTime && (
          <>
            <Text style={styles.sectionLabel}>
              ご希望日
              {nomMode === "yes" ? "（ご指名スタッフの出勤日）" : ""}
              {loadingShifts ? "　確認中…" : ""}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
              {dateOptions.map((d, idx) => {
                const key = toDateKey(d);
                const active = preferredDate === key;
                // ご指名中、そのスタッフがお休みの日は選べない
                const off = nomMode === "yes" && isOffDay(key);
                // 月跨ぎで迷わないよう「今日」「明日」、月初と先頭チップには「◯月」を添える
                const topLabel = off
                  ? "休"
                  : idx === 0 ? "今日" : idx === 1 ? "明日" : d.getDate() === 1 || idx === 2 ? `${d.getMonth() + 1}月` : "";
                return (
                  <TouchableOpacity
                    key={key}
                    disabled={off}
                    style={[styles.dateChip, active && styles.dateChipOn, off && styles.dateChipOff]}
                    onPress={() => {
                      setPreferredDate(key);
                      setPreferredTime(null);
                    }}
                  >
                    <Text
                      style={[styles.dateChipTop, active && styles.dateChipTextOn, off && styles.dateChipTextOff]}
                    >
                      {topLabel || " "}
                    </Text>
                    <Text
                      style={[styles.dateChipDay, active && styles.dateChipTextOn, off && styles.dateChipTextOff]}
                    >
                      {d.getDate()}
                    </Text>
                    <Text
                      style={[
                        styles.dateChipWd,
                        d.getDay() === 0 && styles.dateChipSun,
                        active && styles.dateChipTextOn,
                        off && styles.dateChipTextOff,
                      ]}
                    >
                      {WEEKDAY[d.getDay()]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {preferredDate && nomMode === "yes" && nom && (
              <>
                <Text style={styles.sectionLabel}>ご希望時間{loadingSlots ? "　確認中…" : ""}</Text>
                {booked.includes(nom.slotTime) ? (
                  <Text style={styles.nomFull}>
                    この日の {nom.slotTime} は、ほかのご予約が入っております。別の日をお選びください。
                  </Text>
                ) : (
                  <View style={styles.nomFixed}>
                    <Feather name="clock" size={16} color={colors.gold} />
                    <Text style={styles.nomFixedText}>{nom.slotTime} 〜（ご指名の枠）</Text>
                  </View>
                )}
              </>
            )}

            {preferredDate && nomMode !== "yes" && (
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

              </>
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
  storeBody: { flex: 1, gap: 2 },
  storePlace: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 17,
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
    fontFamily: fonts.num,
    fontVariant: ["tabular-nums"],
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
  /* ご指名のスタッフがお休みの日 */
  dateChipOff: {
    backgroundColor: colors.bgSub,
    borderColor: colors.bgSub,
  },
  dateChipTextOff: {
    color: colors.textLight,
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
  /* ご指名の「する／しない」。同じ重さの2択なので同じ見た目の札を縦に並べる */
  nomChoice: {
    gap: spacing.sm,
  },
  nomCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.white,
    gap: 4,
  },
  nomCardOn: {
    borderColor: colors.gold,
    borderWidth: 2,
    padding: spacing.md - 1,
  },
  nomCardTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.text,
  },
  nomCardTitleOn: {
    color: colors.goldDeep,
  },
  nomCardDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    lineHeight: 18,
  },
  nomPick: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    marginTop: 4,
  },
  /* ご指名のときの時間表示（18:00で固定なので、選ばせずに知らせる） */
  nomFixed: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius,
    backgroundColor: colors.white,
  },
  nomFixedText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.text,
  },
  nomFull: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.danger,
    lineHeight: 20,
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
    // aspectRatio だと環境によって縦に伸びてしまうため、正方形を実寸で指定する
    width: 88,
    height: 88,
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
  bottomBar: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
});
