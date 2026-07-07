/* ============================================================
   bookings/index.tsx  ―  S8 予約履歴（SPEC.md §4.2）
   自分の予約を新しい順にカード表示：日時 / 店舗 / 主メニュー名 / 合計 / ステータス
============================================================ */

import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchMyBookings, ApiError } from "@/lib/api";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, spacing } from "@/theme";
import type { Booking } from "@/lib/types";

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { bookings: rows } = await fetchMyBookings();
      setBookings(rows);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "予約の取得に失敗しました");
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

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>読み込み中…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!bookings.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>まだご予約はありません。</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={bookings}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.gold} />}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => router.push(`/bookings/${item.id}`)}>
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.date}>{formatDateTime(item.preferred_at ?? item.created_at)}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.menu}>{primaryMenuName(item)}</Text>
            <View style={styles.row}>
              <Text style={styles.shop}>{item.shop ?? "店頭にて調整"}</Text>
              <Text style={styles.price}>{yen(item.total_price - item.discount_amount)}</Text>
            </View>
          </Card>
        </TouchableOpacity>
      )}
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

function formatDateTime(iso: string | null): string {
  if (!iso) return "日時未定";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "日時未定";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: spacing.lg,
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
  date: {
    fontFamily: fonts.serifEn,
    fontSize: fontSize.caption,
    color: colors.textLight,
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
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.gold,
  },
});
