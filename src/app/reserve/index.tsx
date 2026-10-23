/* ============================================================
   reserve/index.tsx  ―  予約の最初の画面：店舗・日時（1/4）
   ------------------------------------------------------------
   店舗5つから選択（必須）→ ご指名の有無 → 週間カレンダーで枠を選ぶ。
   「日時は店頭で調整する」チェックでスキップ可（preferred_at = null）。

   ★ Web予約と同じ形に揃えた（2026-10-23 発注者の指摘）
     営業会議（2026-09-09・A1）で「店舗を最初に選ぶ構造＋○×週間カレンダー
     （ホットペッパー型）」と決まっていたのに、Web（index.html）だけ直して
     アプリは「お車→メニュー→店舗・日時」の並びと日付チップのままだった。
     ・順番を 店舗・日時 → お車 → メニュー → 確認 に変更
     ・空き状況はWebと同じ /api/availability を使い、○△×− で出す
         ○ 予約できる  △ Web受付は締切（お電話で）  × 満席  − 受付時間外

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
import { fetchAvailabilityMany, fetchStaffShifts, type AvailabilityDay, type SlotState } from "@/lib/api";
import { staffPhoto } from "@/lib/staff-photos";
import { ShopMap } from "@/components/ShopMap";
import { SHOP_NAMES, findShop, neighborShops } from "@/lib/shops";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";

const STORE_NAMES = SHOP_NAMES;   // 大元は src/lib/shops.ts
const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];
const WEEK_DAYS = 7;
/* ご予約を承る先の限度。Web予約（shop-data.js の bookingHorizonDate）と揃える */
const HORIZON_MONTHS = 6;

const MARK: Record<SlotState, string> = { open: "○", cutoff: "△", full: "×", closed: "−" };

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function horizonDate(): Date {
  const d = startOfToday();
  d.setMonth(d.getMonth() + HORIZON_MONTHS);
  return d;
}

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function DateTimeScreen() {
  const router = useRouter();
  const {
    menu, loadMenu, shop, setShop, preferredDate, setPreferredDate, preferredTime, setPreferredTime,
    nominatedStaffId, setNominatedStaffId, skipDateTime, setSkipDateTime,
  } = useReservation();

  /* ★ メニュー情報には指名の設定（対象店舗・指名料・スタッフ名簿）が入っている。
     以前はお車の画面が最初だったのでそちらで読んでいたが、店舗・日時を
     最初に持ってきたことで、この画面でも要るようになった。
     読み込み済みなら何もしない（loadMenu の中で判定している）。 */
  useEffect(() => { loadMenu(); }, [loadMenu]);

  /* 表示している一週間と、その空き状況（Webの index.html と同じ作り） */
  const [weekStart, setWeekStart] = useState<Date>(startOfToday());
  const [times, setTimes] = useState<string[]>([]);
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  /* 近隣店の空き（同じエリアの店だけ）。Web予約と同じご案内 */
  const [nearby, setNearby] = useState<{ shop: string; days: AvailabilityDay[]; far: boolean }[]>([]);
  const [nearbyOpen, setNearbyOpen] = useState(false);

  // 通常枠は全店 10:00〜18:00。ご指名は 18:00 の枠のみ
  // （nom.shop が null なら全店舗、店舗名なら当該店のみ）
  const nom = menu?.nomination?.enabled ? menu.nomination : null;
  const isNomShop = !!(nom && !!shop && (nom.shop == null || shop === nom.shop));
  const staffList = nom?.staff ?? [];

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
    fetchStaffShifts(toDateKey(weekStart), WEEK_DAYS)
      .then((res) => { if (!cancelled) setOffDays(res.shifts?.[nominatedStaffId] ?? {}); })
      .catch(() => { if (!cancelled) setOffDays({}); })
      .finally(() => { if (!cancelled) setLoadingShifts(false); });
    return () => { cancelled = true; };
  }, [nomMode, nominatedStaffId, weekStart]);

  const isOffDay = (key: string) => offDays[key] === false;

  /* 画面に出すご指名スタッフのお名前 */
  const nominatedStaffName = staffList.find((x) => x.id === nominatedStaffId)?.name ?? "";

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

  /* 表示している一週間の空き状況を取る（Webと同じ /api/availability） */
  useEffect(() => {
    if (!shop || skipDateTime) {
      setDays([]);
      setTimes([]);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSlotError(null);
    /* 自店と同じエリアの近隣店を1回のリクエストでまとめて取る
       （店舗ごとに呼ぶと関数の起動が増えて遅い。Webと同じ作り） */
    const neighbors = neighborShops(shop);
    fetchAvailabilityMany([shop, ...neighbors.map((n) => n.name)], toDateKey(weekStart), WEEK_DAYS)
      .then((res) => {
        if (cancelled) return;
        setTimes(res.times ?? []);
        const results = res.results ?? [];
        setDays(results[0]?.days ?? []);
        setNearby(
          results.slice(1).map((r, i) => ({
            shop: r.shop,
            days: r.days ?? [],
            far: !!neighbors[i]?.areaFar,
          }))
        );
      })
      .catch(() => {
        if (cancelled) return;
        setDays([]);
        setNearby([]);
        setSlotError("空き状況を取得できませんでした。通信をご確認ください。");
      })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [shop, weekStart, skipDateTime]);

  /* その一週間の「○」の数と、いちばん早い空き枠 */
  const summarize = (list: AvailabilityDay[]) => {
    let open = 0;
    let first: { date: string; time: string; weekday: number } | null = null;
    for (const d of list) {
      for (const t of Object.keys(d.slots)) {
        if (d.slots[t] !== "open") continue;
        open++;
        if (!first) first = { date: d.date, time: t, weekday: d.weekday };
      }
    }
    return { open, first };
  };

  const mine = summarize(days);
  const nearbyRows = nearby
    .map((n) => ({ ...n, sum: summarize(n.days) }))
    .filter((n) => n.sum.open > 0);
  /* 希望の店舗がこの一週間まったく空いていないときは、最初から開いて見せる */
  const nearbyAutoOpen = days.length > 0 && mine.open === 0;

  /* 店舗を変えたら今週に戻す（別の店の週を見たまま混乱しないように） */
  useEffect(() => { setWeekStart(startOfToday()); }, [shop]);

  const today0 = startOfToday();
  const limit = horizonDate();
  const canPrev = weekStart.getTime() > today0.getTime();
  const canNext = addDays(weekStart, WEEK_DAYS).getTime() <= limit.getTime();

  /* ご指名のときは、指名を承る枠（18:00）の行だけを出す */
  const shownTimes = (nomMode === "yes" && nom)
    ? times.filter((t) => t === nom.slotTime)
    : times;

  const pickSlot = (date: string, time: string) => {
    setPreferredDate(date);
    setPreferredTime(time);
  };

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
        <StepIndicator current={1} />
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
            {/* 週の送り。Web予約（index.html）と同じ操作にしてある */}
            <View style={styles.weekNav}>
              <TouchableOpacity
                style={[styles.weekNavBtn, !canPrev && styles.weekNavBtnOff]}
                disabled={!canPrev}
                onPress={() => setWeekStart((w) => {
                  const prev = addDays(w, -WEEK_DAYS);
                  return prev.getTime() < today0.getTime() ? today0 : prev;
                })}
              >
                <Feather name="chevron-left" size={18} color={canPrev ? colors.text : colors.border} />
              </TouchableOpacity>
              <Text style={styles.weekRange}>
                {weekStart.getMonth() + 1}/{weekStart.getDate()} 〜 {addDays(weekStart, 6).getMonth() + 1}/{addDays(weekStart, 6).getDate()}
              </Text>
              <TouchableOpacity
                style={[styles.weekNavBtn, !canNext && styles.weekNavBtnOff]}
                disabled={!canNext}
                onPress={() => setWeekStart((w) => addDays(w, WEEK_DAYS))}
              >
                <Feather name="chevron-right" size={18} color={canNext ? colors.text : colors.border} />
              </TouchableOpacity>
            </View>

            {nomMode === "yes" && nominatedStaffName ? (
              <Text style={styles.calLead}>
                {nominatedStaffName} のご指名（{nom?.slotTime}〜）。出勤日からお選びください。
              </Text>
            ) : null}

            {loadingSlots && !days.length ? (
              <Text style={styles.calMuted}>空き状況を読み込んでいます…</Text>
            ) : slotError ? (
              <Text style={styles.calError}>{slotError}</Text>
            ) : !shownTimes.length ? (
              <Text style={styles.calMuted}>
                {nomMode === "yes" && nom
                  ? `${shop}では ${nom.slotTime} の枠をお取り扱いしておりません。`
                  : "空き状況がありません。"}
              </Text>
            ) : (
              <View style={styles.cal}>
                {/* 曜日の見出し */}
                <View style={styles.calRow}>
                  <View style={styles.calTimeCell} />
                  {days.map((d) => {
                    const dd = Number(d.date.slice(8, 10));
                    return (
                      <View key={d.date} style={styles.calHeadCell}>
                        <Text style={[styles.calHeadDay,
                          d.weekday === 0 && styles.calSun, d.weekday === 6 && styles.calSat]}>{dd}</Text>
                        <Text style={[styles.calHeadWd,
                          d.weekday === 0 && styles.calSun, d.weekday === 6 && styles.calSat]}>{WEEKDAY[d.weekday]}</Text>
                      </View>
                    );
                  })}
                </View>

                {shownTimes.map((t) => (
                  <View key={t} style={styles.calRow}>
                    <View style={styles.calTimeCell}>
                      <Text style={styles.calTimeText}>{t}</Text>
                    </View>
                    {days.map((d) => {
                      // ご指名のとき、そのスタッフがお休みの日は選べない
                      if (nomMode === "yes" && isOffDay(d.date)) {
                        return (
                          <View key={d.date} style={styles.calCell}>
                            <Text style={styles.calOff}>休</Text>
                          </View>
                        );
                      }
                      const st: SlotState = d.slots[t] ?? "closed";
                      const within = new Date(d.date + "T00:00:00").getTime() <= limit.getTime();
                      const canPick = st === "open" && within;
                      const chosen = preferredDate === d.date && preferredTime === t;
                      if (!canPick) {
                        return (
                          <View key={d.date} style={styles.calCell}>
                            <Text style={[styles.calMark, styles[("mark_" + st) as "mark_open"]]}>{MARK[st]}</Text>
                          </View>
                        );
                      }
                      return (
                        <TouchableOpacity
                          key={d.date}
                          style={styles.calCell}
                          onPress={() => pickSlot(d.date, t)}
                          accessibilityLabel={`${d.date} ${t} を選ぶ`}
                        >
                          <Text style={[styles.calMark, styles.mark_open, chosen && styles.calMarkOn]}>○</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}

            {/* 記号の意味。Webの凡例と同じ */}
            <View style={styles.legend}>
              <Text style={styles.legendItem}><Text style={styles.mark_open}>○</Text> 予約できます</Text>
              <Text style={styles.legendItem}><Text style={styles.mark_cutoff}>△</Text> Web受付は終了（お電話でご相談ください）</Text>
              <Text style={styles.legendItem}><Text style={styles.mark_full}>×</Text> 満席</Text>
              <Text style={styles.legendItem}><Text style={styles.mark_closed}>−</Text> 受付時間外</Text>
              {nomMode === "yes" && nominatedStaffName ? (
                <Text style={styles.legendItem}>「休」は {nominatedStaffName} のお休みの日です</Text>
              ) : null}
            </View>

            {/* 近隣店の空き案内。同じエリアの店だけ（横浜と東京は40〜60分離れている）。
                ご指名のときは出さない。店を移るとスタッフも変わってしまうため。
                Web予約（reserve-step1.js の renderNearby）と同じ考え方。 */}
            {nomMode !== "yes" && nearbyRows.length > 0 ? (
              <View style={styles.nearby}>
                <TouchableOpacity
                  style={styles.nearbyHead}
                  onPress={() => setNearbyOpen((v) => !v)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nearbyHeadText}>
                    {mine.open === 0
                      ? `この一週間、${shop}は空きがありません。近くの店舗をご案内します`
                      : "近くの店舗の空き状況を見る"}
                  </Text>
                  <Feather
                    name={(nearbyOpen || nearbyAutoOpen) ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.textLight}
                  />
                </TouchableOpacity>

                {(nearbyOpen || nearbyAutoOpen) && (
                  <View style={styles.nearbyBody}>
                    {nearbyRows.map((n) => (
                      <TouchableOpacity
                        key={n.shop}
                        style={styles.nearbyShop}
                        onPress={() => setShop(n.shop)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.nearbyMain}>
                          <Text style={styles.nearbyName}>{n.shop}</Text>
                          {n.far ? <Text style={styles.nearbyFar}>横浜駅周辺から20〜30分</Text> : null}
                          <Text style={styles.nearbySub}>
                            この一週間の空き {n.sum.open} 枠
                            {n.sum.first
                              ? `　最短 ${Number(n.sum.first.date.slice(5, 7))}/${Number(n.sum.first.date.slice(8, 10))}（${WEEKDAY[n.sum.first.weekday]}）${n.sum.first.time}〜`
                              : ""}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={colors.gold} />
                      </TouchableOpacity>
                    ))}
                    <Text style={styles.nearbyNote}>
                      料金は店舗により異なる場合があります。お取り扱いのないメニューもございますので、次の画面でご確認ください。
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {preferredDate && preferredTime ? (
              <View style={styles.picked}>
                <Feather name="check-circle" size={16} color={colors.gold} />
                <Text style={styles.pickedText}>
                  {Number(preferredDate.slice(5, 7))}月{Number(preferredDate.slice(8, 10))}日 {preferredTime}〜 を選択中
                </Text>
              </View>
            ) : null}
          </>
        )}
        </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <GoldButton title="次へ" onPress={() => router.push("/reserve/car")} disabled={!canProceed} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },

  /* ---- 週間カレンダー（Web予約と同じ見せ方） ---- */
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  weekNavBtn: {
    width: 40,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
  },
  weekNavBtnOff: { borderColor: colors.bgSub },
  weekRange: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.text,
  },
  calLead: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    lineHeight: 19,
  },
  calMuted: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    paddingVertical: spacing.lg,
    textAlign: "center",
  },
  calError: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.danger,
    paddingVertical: spacing.lg,
    textAlign: "center",
  },
  cal: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    overflow: "hidden",
  },
  calRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  /* 時刻の列。残りを7日で分け合う */
  calTimeCell: {
    width: 52,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSub,
  },
  calTimeText: { fontFamily: fonts.sans, fontSize: 11, color: colors.textLight },
  calHeadCell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingVertical: 6,
    alignItems: "center",
    backgroundColor: colors.bgSub,
  },
  calHeadDay: { fontFamily: fonts.num, fontSize: 14, color: colors.text },
  calHeadWd: { fontFamily: fonts.sans, fontSize: 10, color: colors.textLight },
  calSun: { color: colors.danger },
  calSat: { color: "#2d6cdf" },
  calCell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  calMark: { fontFamily: fonts.sans, fontSize: 16 },
  /* 空き状況の色。Web（style.css）と同じ。記号の形が情報を運ぶので彩度は低め */
  mark_open: { color: "#5a7d52" },
  mark_cutoff: { color: "#b07d2a" },
  mark_full: { color: "#a8524a" },
  mark_closed: { color: colors.border },
  calMarkOn: {
    color: colors.white,
    backgroundColor: colors.gold,
    width: 28,
    height: 28,
    lineHeight: 28,
    textAlign: "center",
    overflow: "hidden",
    borderRadius: 14,
  },
  calOff: { fontFamily: fonts.sans, fontSize: 11, color: colors.textLight },
  legend: {
    gap: 2,
    marginTop: spacing.xs,
  },
  legendItem: { fontFamily: fonts.sans, fontSize: 11, color: colors.textLight },
  picked: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius,
    marginTop: spacing.sm,
  },
  pickedText: { fontFamily: fonts.sansMedium, fontSize: fontSize.body, color: colors.text },

  /* ---- 近隣店の空き案内 ---- */
  nearby: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.white,
  },
  nearbyHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  nearbyHeadText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    lineHeight: 19,
    color: colors.text,
  },
  nearbyBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  nearbyShop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.bgSub,
  },
  nearbyMain: { flex: 1, gap: 2 },
  nearbyName: { fontFamily: fonts.sansMedium, fontSize: fontSize.body, color: colors.text },
  nearbyFar: { fontFamily: fonts.sans, fontSize: 11, color: colors.textLight },
  nearbySub: { fontFamily: fonts.sans, fontSize: fontSize.caption, color: colors.textLight },
  nearbyNote: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 17, color: colors.textLight },

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
