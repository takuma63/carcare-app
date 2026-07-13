/* ============================================================
   reserve/confirm.tsx  ―  S6 確認・クーポン・決済方法（4/4。SPEC.md §4.2）
   ------------------------------------------------------------
   決済方法：店頭払い（デフォルト） / 今すぐ決済（Stripe PaymentSheet）。
   事前決済は payment-intent API → PaymentSheet → 成功後に booking API
   （payment_intent_id付き）。決済成功後のbooking失敗は自動リトライ3回、
   それでも失敗なら決済番号を表示して店舗連絡を案内（SPEC §4.2 S6）。
   クーポンは Phase 6 で追加する。
============================================================ */

import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { Feather } from "@expo/vector-icons";
import { useStripe } from "@stripe/stripe-react-native";
import { StepIndicator } from "@/components/StepIndicator";
import { ReserveHeader } from "@/components/ReserveHeader";
import { GoldButton } from "@/components/GoldButton";
import { Card } from "@/components/Card";
import { useReservation } from "@/lib/reservation-context";
import { createPaymentIntent, submitBooking, ApiError, type SubmitBookingResult } from "@/lib/api";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";

const STRIPE_ENABLED = !!(Constants.expoConfig?.extra?.STRIPE_PUBLISHABLE_KEY as string | undefined);

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDateTime(date: string | null, time: string | null): string {
  if (!date || !time) return "店頭にて調整";
  const d = new Date(`${date}T${time}:00`);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${wd}）${time}〜`;
}

export default function ConfirmScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { menu, category, shop, preferredDate, preferredTime, note, setNote, summary, buildOrder, reset } =
    useReservation();

  const [payMethod, setPayMethod] = useState<"store" | "online">("store");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const order = buildOrder();
  const categoryLabel = menu?.categories[category] ?? category;
  // 要見積りのみ（確定金額0円）の予約は事前決済の対象外
  const onlineAvailable = STRIPE_ENABLED && summary.total > 0;

  const preferredAtIso = () =>
    preferredDate && preferredTime ? new Date(`${preferredDate}T${preferredTime}:00`).toISOString() : null;

  const bookingParams = (paymentIntentId?: string) => ({
    order,
    shop: shop ?? null,
    preferred_at: preferredAtIso(),
    note: note.trim() || null,
    payment_intent_id: paymentIntentId,
  });

  const finish = (result: SubmitBookingResult, paidAmount: number | null) => {
    track("booking_completed", { total: order.total_price, paid: paidAmount != null });
    const token = result.token;
    reset();
    router.replace({
      pathname: "/reserve/done",
      params: paidAmount != null ? { token, paid: String(paidAmount) } : { token },
    });
  };

  /* 店頭払い：booking APIを直接呼ぶ */
  const submitPayAtStore = async () => {
    const result = await submitBooking(bookingParams());
    finish(result, null);
  };

  /* 今すぐ決済：payment-intent → PaymentSheet → booking（リトライ3回） */
  const submitPayOnline = async () => {
    const { client_secret, amount } = await createPaymentIntent(order.items, order.category);

    const init = await initPaymentSheet({
      paymentIntentClientSecret: client_secret,
      merchantDisplayName: "カーケアセンター",
      returnURL: "carcarecenter://stripe-redirect",
    });
    if (init.error) {
      throw new ApiError("決済画面の準備に失敗しました。時間をおいて再度お試しください。");
    }

    const present = await presentPaymentSheet();
    if (present.error) {
      if (present.error.code === "Canceled") return; // ユーザーが決済画面を閉じた（エラー表示しない）
      throw new ApiError(present.error.localizedMessage || "決済に失敗しました。カード情報をご確認ください。");
    }

    // 決済成功。以降は予約登録に失敗してもお金は動いているため、自動リトライで救済する
    const paymentIntentId = client_secret.split("_secret")[0];
    let lastMessage = "";
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await submitBooking(bookingParams(paymentIntentId));
        finish(result, amount);
        return;
      } catch (e) {
        lastMessage = e instanceof ApiError ? e.message : "通信エラー";
        if (attempt < 3) await wait(1500);
      }
    }
    throw new ApiError(
      `お支払いは完了しましたが、ご予約の登録に失敗しました（${lastMessage}）。\n` +
        `お手数ですが店舗（06-6267-8288）にご連絡ください。\n決済番号：${paymentIntentId}`
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (payMethod === "online") {
        await submitPayOnline();
      } else {
        await submitPayAtStore();
      }
      setSubmitting(false);
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
          <TouchableOpacity style={styles.paymentRow} onPress={() => setPayMethod("store")}>
            <View style={[styles.radio, payMethod === "store" && styles.radioOn]}>
              {payMethod === "store" && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.paymentText}>店頭でお支払い</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paymentRow, !onlineAvailable && styles.paymentDisabled]}
            onPress={() => onlineAvailable && setPayMethod("online")}
            disabled={!onlineAvailable}
          >
            <View style={[styles.radio, payMethod === "online" && styles.radioOn]}>
              {payMethod === "online" && <View style={styles.radioDot} />}
            </View>
            <Text style={[styles.paymentText, !onlineAvailable && styles.paymentTextDisabled]}>
              今すぐ決済（クレジットカード / Apple Pay / Google Pay）
            </Text>
            {!onlineAvailable && (
              <Text style={styles.comingSoon}>{STRIPE_ENABLED ? "店頭払いのみ" : "近日対応"}</Text>
            )}
          </TouchableOpacity>
          {payMethod === "online" && (
            <Text style={styles.paymentNote}>
              「予約を確定する」を押すと決済画面が開きます。決済完了と同時にご予約が確定します。
            </Text>
          )}
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
    lineHeight: 20,
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
    lineHeight: 20,
  },
  paymentTextDisabled: {
    color: colors.textLight,
  },
  comingSoon: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textLight,
  },
  paymentNote: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.goldDeep,
    lineHeight: 20,
    marginTop: spacing.xs,
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
    lineHeight: 20,
  },
  bottomBar: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
});
