/* ============================================================
   bookings/index.tsx  ―  S8 ご利用履歴
   ------------------------------------------------------------
   ご予約（bookings）と、店舗が記録したご来店（visits）を
   1つの時系列にまとめて表示する。

   ★ なぜまとめるのか（2026-10-21 変更）
     以前は予約だけを出していた。予約はアプリ・Webから予約したときに
     しか作られないため、紙の回数券をお使いの常連のお客様は、
     長年ご来店いただいていても画面が真っ白になっていた
     （実例：ご来店39回・ご予約0件）。
     お客様から見れば「いつ、どの店で、何をしたか」は1つの履歴なので、
     予約由来か店舗記録かを分けて見せる意味がない。

   ★ 違いは見た目で分かるようにする
     ご予約はタップして詳細（QR・ステータス）へ進めるが、
     ご来店は記録のみで進む先がない。タップできるかどうかが
     見た目で分かるよう、ご予約には矢印を添える。
============================================================ */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { GoldButton } from "@/components/GoldButton";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchMyBookings, ApiError, type Visit } from "@/lib/api";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, spacing } from "@/theme";
import type { Booking } from "@/lib/types";

/* 画面に並べる1件。並べ替えのために共通の日時（sortAt）を持たせる */
type Entry =
  | { kind: "booking"; id: string; sortAt: number; booking: Booking }
  | { kind: "visit"; id: string; sortAt: number; visit: Visit };

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchMyBookings();
      setBookings(res.bookings ?? []);
      setVisits(res.visits ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "ご利用履歴の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    track("screen_view", { screen: "bookings" });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /* 予約と来店を1本の時系列にする（新しい順） */
  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = [];
    bookings.forEach((b) => {
      const at = b.preferred_at ?? b.created_at;
      list.push({ kind: "booking", id: `b-${b.id}`, sortAt: toTime(at), booking: b });
    });
    visits.forEach((v) => {
      list.push({ kind: "visit", id: `v-${v.id}`, sortAt: toTime(v.visited_on), visit: v });
    });
    return list.sort((a, b) => b.sortAt - a.sortAt);
  }, [bookings, visits]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>読み込み中…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!entries.length) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Feather name="calendar" size={40} color={colors.gold} />
        <Text style={styles.emptyTitle}>まだご利用の記録はありません</Text>
        <Text style={styles.emptyText}>手洗い洗車・コーティングのご予約は{"\n"}こちらからどうぞ。</Text>
        <GoldButton title="予約する" onPress={() => router.push("/reserve")} style={styles.emptyButton} />
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + spacing.lg }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.gold} />}
      renderItem={({ item }) =>
        item.kind === "booking" ? (
          <TouchableOpacity onPress={() => router.push(`/bookings/${item.booking.id}`)}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.date}>
                  {formatDateTime(item.booking.preferred_at ?? item.booking.created_at)}
                </Text>
                <StatusBadge status={item.booking.status} />
              </View>
              <Text style={styles.menu}>{primaryMenuName(item.booking)}</Text>
              <View style={styles.row}>
                <Text style={styles.shop}>{item.booking.shop ?? "店頭にて調整"}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>
                    {yen(item.booking.total_price - item.booking.discount_amount)}
                  </Text>
                  <Feather name="chevron-right" size={16} color={colors.textLight} />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ) : (
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.date}>{formatVisitDate(item.visit.visited_on)}</Text>
              <Text style={styles.visitTag}>ご来店</Text>
            </View>
            <Text style={styles.menu}>{item.visit.service_note ?? "ご来店"}</Text>
            <Text style={styles.shop}>{item.visit.shop || "―"}</Text>
          </Card>
        )
      }
    />
  );
}

function primaryMenuName(booking: Booking): string {
  const first = booking.items[0];
  if (!first) return "メニュー未定";
  const rest = booking.items.length - 1;
  return rest > 0 ? `${first.name} 他${rest}件` : first.name;
}

function yen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function toTime(value: string | null): number {
  if (!value) return 0;
  /* 来店は "YYYY-MM-DD"。そのまま Date に渡すとUTCの0時と解釈され、
     日本時間では前日になってしまうため、ローカルの日付として組み立てる。 */
  const ymd = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  if (ymd) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  const t = new Date(value).getTime();
  return isNaN(t) ? 0 : t;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "日時未定";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "日時未定";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatVisitDate(value: string): string {
  const t = toTime(value);
  if (!t) return value;
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    minWidth: 200,
    marginTop: spacing.md,
  },
  muted: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.danger,
    textAlign: "center",
  },
/* ★ 画面の上端は iPhone のステータスバー（時刻・電波・電池）の下に
   潜り込むため、安全領域のぶんだけ余白を足す。端末ごとに高さが違うので
   固定値では合わない（ノッチ有無・Dynamic Island で変わる）。 */
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  card: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  date: {
    fontFamily: fonts.num,
    fontVariant: ["tabular-nums"],
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  /* ご来店は過去の記録なので、ステータスバッジより控えめに置く */
  visitTag: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textLight,
    letterSpacing: 1,
  },
  menu: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
  },
  shop: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  price: {
    fontFamily: fonts.num,
    fontVariant: ["tabular-nums"],
    fontSize: fontSize.bodyLarge,
    color: colors.text,
  },
});
