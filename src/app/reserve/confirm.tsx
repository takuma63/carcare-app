/* ============================================================
   reserve/confirm.tsx  ―  S6 確認・クーポン・決済方法（4/4。SPEC.md §4.2）
   ------------------------------------------------------------
   Phase3時点ではクーポン・事前決済はプレースホルダ（IMPLEMENTATION_PLAN.md
   Phase3の指示どおり）。店頭払いのみ選択可能で、既存 booking.js に
   source:"app" + auth_token で直接送信する。
============================================================ */

import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { StepIndicator } from "@/components/StepIndicator";
import { ReserveHeader } from "@/components/ReserveHeader";
import { GoldButton } from "@/components/GoldButton";
import { Card } from "@/components/Card";
import { useReservation } from "@/lib/reservation-context";
import { submitBooking, ApiError } from "@/lib/api";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function formatDateTime(date: string | null, time: string | null): string {
  if (!date || !time) return "店頭にて調整";
  const d = new Date(`${date}T${time}:00`);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${wd}）${time}〜`;
}

export default function ConfirmScreen() {
  const router = useRouter();
  const { menu, category, shop, preferredDate, preferredTime, note, setNote, summary, buildOrder, reset } =
    useReservation();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const order = buildOrder();
  const categoryLabel = menu?.categories[category] ?? category;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const preferredAt =
        preferredDate && preferredTime ? new Date(`${preferredDate}T${preferredTime}:00`).toISOString() : null;
      const result = await submitBooking({
        order,
        shop: shop ?? null,
        preferred_at: preferredAt,
        note: note.trim() || null,
      });
      track("booking_completed", { total: order.total_price, paid: false });
      const token = result.token;
      reset();
      router.replace({ pathname: "/reserve/done", params: { token } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "送信に失敗しました。時間をおいて再度お試しください。");
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.flex}>
      <ReserveHeader />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <StepIndicator current={4} />
        <Text style={styles.heading}>ご予約内容の確認</Text>

        <Card style={styles.card}>
          <Text style={styles.carLine}>
            お車：<Text style={styles.carStrong}>{order.car_official || order.car_input}</Text>
            {categoryLabel ? `（${categoryLabel}）` : ""}
          </Text>
          {order.items.map((item, idx) => (
            <View key={`${item.id}-${idx}`} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.name}
                {item.option ? `（${item.option}）` : ""}
              </Text>
              <Text style={styles.itemPrice}>{item.price != null ? yen(item.price) : "要見積り"}</Text>
            </View>
          ))}
          <View style={[styles.itemRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>合計（税込）</Text>
            <Text style={styles.totalPrice}>
              {yen(summary.total)}
              {summary.hasQuote ? " ＋ 要見積り" : ""}
            </Text>
          </View>
          {summary.hasQuote && <Text style={styles.quoteNote}>※ 見積り項目あり（店頭にて金額をご案内します）</Text>}
          <Text style={styles.durationText}>作業時間目安：{summary.durationText}</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.rowLabel}>店舗</Text>
          <Text style={styles.rowValue}>{shop ?? "未選択"}</Text>
          <Text style={[styles.rowLabel, styles.rowLabelSpaced]}>ご希望日時</Text>
          <Text style={styles.rowValue}>{formatDateTime(preferredDate, preferredTime)}</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>お支払い方法</Text>
          <View style={styles.paymentRow}>
            <View style={[styles.radio, styles.radioOn]}>
              <View style={styles.radioDot} />
            </View>
            <Text style={styles.paymentText}>店頭でお支払い</Text>
          </View>
          <View style={[styles.paymentRow, styles.paymentDisabled]}>
            <View style={styles.radio} />
            <Text style={[styles.paymentText, styles.paymentTextDisabled]}>
              今すぐ決済（クレジットカード / Apple Pay / Google Pay）
            </Text>
            <Text style={styles.comingSoon}>近日対応</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>備考（任意）</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="ご要望があればご記入ください"
            placeholderTextColor={colors.textLight}
            style={styles.noteInput}
            multiline
          />
        </Card>

        {error && (
          <View style={styles.errorRow}>
            <Feather name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <GoldButton title="予約を確定する" onPress={handleSubmit} loading={submitting} />
        </View>
      </KeyboardAvoidingView>
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
  card: {
    gap: spacing.xs,
  },
  carLine: {
    fontFamily: fonts.sans,
    fontSize: fontSize.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  carStrong: {
    fontFamily: fonts.sansBold,
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
    fontFamily: fonts.serifEn,
    fontSize: fontSize.h3,
    color: colors.text,
  },
  quoteNote: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textLight,
  },
  durationText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    marginTop: 2,
  },
  rowLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  rowLabelSpaced: {
    marginTop: spacing.sm,
  },
  rowValue: {
    fontFamily: fonts.sans,
    fontSize: fontSize.body,
    color: colors.text,
  },
  sectionLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
  },
  paymentDisabled: {
    opacity: 0.5,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: {
    borderColor: colors.gold,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gold,
  },
  paymentText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.text,
  },
  paymentTextDisabled: {
    color: colors.textLight,
  },
  comingSoon: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textLight,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: spacing.sm,
    minHeight: 72,
    textAlignVertical: "top",
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.text,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.danger,
  },
  bottomBar: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
});
