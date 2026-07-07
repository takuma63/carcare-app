/* ============================================================
   bookings/[id].tsx  ―  S9 予約詳細（SPEC.md §4.2）
   全項目表示＋受付QR再表示。in_progress/doneは目立つ案内を表示する。
============================================================ */

import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";
import QRCode from "react-native-qrcode-svg";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchMyBookings, ApiError } from "@/lib/api";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, spacing } from "@/theme";
import type { Booking } from "@/lib/types";

const STATUS_BASE_URL = (Constants.expoConfig?.extra?.STATUS_BASE_URL as string | undefined) ?? "";

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track("screen_view", { screen: "booking_detail" });
    fetchMyBookings()
      .then(({ bookings }) => {
        const found = bookings.find((b) => b.id === id) ?? null;
        setBooking(found);
        if (!found) setError("予約が見つかりませんでした");
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "予約の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>読み込み中…</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "予約が見つかりませんでした"}</Text>
      </View>
    );
  }

  const qrValue = `${STATUS_BASE_URL}/t/${booking.public_token}`;
  const shortToken = booking.public_token.slice(0, 8).toUpperCase();

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.tokenLabel}>予約番号 {shortToken}</Text>
        <StatusBadge status={booking.status} />
      </View>

      {booking.status === "in_progress" && (
        <Card style={[styles.noticeCard, styles.noticeInProgress]}>
          <Text style={styles.noticeText}>作業中です。完了したら通知でお知らせします。</Text>
        </Card>
      )}
      {booking.status === "done" && (
        <Card style={[styles.noticeCard, styles.noticeDone]}>
          <Text style={styles.noticeText}>作業が完了しました。お車のお引き取りをお願いします。</Text>
        </Card>
      )}

      <Card style={styles.qrCard}>
        <QRCode value={qrValue} size={180} color={colors.text} backgroundColor={colors.white} />
        <Text style={styles.qrHint}>ご来店時にこの画面をスタッフにお見せください</Text>
      </Card>

      <Card style={styles.detailCard}>
        <DetailRow label="お車" value={booking.car_official ?? "未判定"} sub={booking.category ?? undefined} />
        <DetailRow label="店舗" value={booking.shop ?? "店頭にて調整"} />
        <DetailRow label="希望日時" value={formatDateTime(booking.preferred_at)} />
        <DetailRow label="作業時間目安" value={booking.duration_text ?? "店頭にて確定"} />
        {booking.payment_status === "paid" && <DetailRow label="お支払い" value="お支払い済み" />}
      </Card>

      <Card style={styles.itemsCard}>
        <Text style={styles.itemsTitle}>ご利用メニュー</Text>
        {booking.items.map((item, idx) => (
          <View key={`${item.id}-${idx}`} style={styles.itemRow}>
            <Text style={styles.itemName}>
              {item.name}
              {item.option ? `（${item.option}）` : ""}
            </Text>
            <Text style={styles.itemPrice}>{item.price != null ? yen(item.price) : "要見積り"}</Text>
          </View>
        ))}
        {booking.discount_amount > 0 && (
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>クーポン割引</Text>
            <Text style={styles.itemPrice}>-{yen(booking.discount_amount)}</Text>
          </View>
        )}
        <View style={[styles.itemRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>合計（税込）</Text>
          <Text style={styles.totalPrice}>{yen(booking.total_price - booking.discount_amount)}</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

function DetailRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>
        {value}
        {sub ? `（${sub}）` : ""}
      </Text>
    </View>
  );
}

function yen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "店頭にて調整";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "店頭にて調整";
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${wd}）${p(d.getHours())}:${p(d.getMinutes())}`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tokenLabel: {
    fontFamily: fonts.serifEn,
    fontSize: fontSize.caption,
    letterSpacing: 1,
    color: colors.textLight,
  },
  noticeCard: {
    alignItems: "center",
  },
  noticeInProgress: {
    backgroundColor: "#fdf6e8",
  },
  noticeDone: {
    backgroundColor: "#eef6ee",
  },
  noticeText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.text,
    textAlign: "center",
  },
  qrCard: {
    alignItems: "center",
    gap: spacing.sm,
  },
  qrHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    textAlign: "center",
  },
  detailCard: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  detailValue: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.text,
    flexShrink: 1,
    textAlign: "right",
  },
  itemsCard: {
    gap: spacing.xs,
  },
  itemsTitle: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.text,
    flexShrink: 1,
  },
  itemPrice: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.text,
  },
  totalPrice: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.h3,
    color: colors.gold,
  },
});
