/* ============================================================
   reserve/confirm.tsx  ―  S6 確認・クーポン・決済方法（4/4。SPEC.md §4.2）
   ------------------------------------------------------------
   決済方法：店頭払い（デフォルト） / 今すぐ決済（Stripe PaymentSheet）。
   事前決済は payment-intent API → PaymentSheet → 成功後に booking API
   （payment_intent_id付き）。決済成功後のbooking失敗は自動リトライ3回、
   それでも失敗なら決済番号を表示して店舗連絡を案内（SPEC §4.2 S6）。
   クーポンは Phase 6 で追加する。
============================================================ */

import React, { useEffect, useState } from "react";
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
import { useStripe } from "@/lib/stripe";
import { StepIndicator } from "@/components/StepIndicator";
import { ReserveHeader } from "@/components/ReserveHeader";
import { GoldButton } from "@/components/GoldButton";
import { Card } from "@/components/Card";
import { useReservation } from "@/lib/reservation-context";
import { createPaymentIntent, submitBooking, fetchMyCoupons, ApiError, type SubmitBookingResult } from "@/lib/api";
import type { Coupon } from "@/lib/types";
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
  const { menu, category, shop, preferredDate, preferredTime, nominatedStaffId, note, setNote, summary, buildOrder, reset } =
    useReservation();

  const [payMethod, setPayMethod] = useState<"store" | "online">("store");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const order = buildOrder();
  const categoryLabel = menu?.categories[category] ?? category;

  // 指名：対象店舗＋対象時刻＋スタッフを1名選んでいれば指名料が加算される
  const nom = menu?.nomination?.enabled ? menu.nomination : null;
  const nominatedStaff = nom?.staff?.find((s) => s.id === nominatedStaffId) ?? null;
  const isNominated = !!(nom && !!shop && (nom.shop == null || shop === nom.shop) && preferredTime === nom.slotTime && nominatedStaff);
  const nominationFee = isNominated && nom ? nom.fee : 0;

  // クーポン：利用できるものだけ出す。対象メニューを含まない予約では選べない。
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponId, setCouponId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMyCoupons()
      .then((r) => { if (alive) setCoupons(r.coupons.filter((c) => c.status === "available")); })
      .catch((e) => console.error("[confirm] クーポン取得に失敗:", e));
    return () => { alive = false; };
  }, []);

  /* そのクーポンが対象にしている明細の合計（対象外なら0） */
  const eligibleAmountOf = (c: Coupon) => {
    const groups = c.target_groups;
    return order.items.reduce((sum, it) => {
      if (it.price == null) return sum;                       // 要見積りは対象外
      if (groups && groups.length) {
        const gid = menu?.groups.find((g) => g.items.some((mi) => mi.id === it.id))?.id;
        if (!gid || !groups.includes(gid)) return sum;
      }
      return sum + it.price;
    }, 0);
  };
  const discountOf = (c: Coupon) => {
    const eligible = eligibleAmountOf(c);
    if (eligible <= 0) return 0;
    return c.discount_type === "percent"
      ? Math.min(Math.floor((eligible * c.discount_value) / 100), eligible)
      : Math.min(c.discount_value, eligible);
  };

  const usableCoupons = coupons.filter((c) => eligibleAmountOf(c) > 0);
  const selectedCoupon = usableCoupons.find((c) => c.grant_id === couponId) ?? null;
  const discount = selectedCoupon ? discountOf(selectedCoupon) : 0;

  const grandTotal = summary.total + nominationFee - discount;

  // 要見積りのみ（確定金額0円）の予約は事前決済の対象外
  const onlineAvailable = STRIPE_ENABLED && grandTotal > 0;

  const preferredAtIso = () =>
    preferredDate && preferredTime ? new Date(`${preferredDate}T${preferredTime}:00`).toISOString() : null;

  const bookingParams = (paymentIntentId?: string) => ({
    order,
    shop: shop ?? null,
    preferred_at: preferredAtIso(),
    note: note.trim() || null,
    payment_intent_id: paymentIntentId,
    nominated: isNominated,
    nominated_staff_id: isNominated && nominatedStaff ? nominatedStaff.id : null,
    coupon_grant_id: selectedCoupon ? selectedCoupon.grant_id : null,
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
    const { client_secret, amount } = await createPaymentIntent(order.items, order.category, {
      nominated: isNominated,
      shop: shop ?? null,
      slot_time: preferredTime ?? null,
      staff_id: isNominated && nominatedStaff ? nominatedStaff.id : null,
    });

    const init = await initPaymentSheet({
      paymentIntentClientSecret: client_secret,
      merchantDisplayName: "カーケアセンター",
      returnURL: "carcarecenter://stripe-redirect",
      // Apple Pay / Google Pay はEASビルド＋Merchant ID登録後に有効になる
      // （Expo Goではカード入力のみ表示される）。本番切替時は testEnv を false に
      applePay: { merchantCountryCode: "JP" },
      googlePay: { merchantCountryCode: "JP", testEnv: true, currencyCode: "JPY" },
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
          {isNominated && nominatedStaff && (
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>指名料（{nominatedStaff.name}指名）</Text>
              <Text style={styles.itemPrice}>{yen(nominationFee)}</Text>
            </View>
          )}
          {selectedCoupon && discount > 0 && (
            <View style={styles.itemRow}>
              <Text style={styles.discountName}>クーポン（{selectedCoupon.title}）</Text>
              <Text style={styles.discountPrice}>−{yen(discount)}</Text>
            </View>
          )}
          <View style={[styles.itemRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{isNominated || discount > 0 ? "お支払い合計（税込）" : "合計（税込）"}</Text>
            <Text style={styles.totalPrice}>
              {yen(grandTotal)}
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
          <Text style={styles.rowValue}>
            {formatDateTime(preferredDate, preferredTime)}
            {isNominated && nominatedStaff ? `　（${nominatedStaff.name}指名）` : ""}
          </Text>
        </Card>

        <Card style={styles.card}>
          {usableCoupons.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>クーポン</Text>
              <TouchableOpacity
                style={[styles.couponRow, !couponId && styles.couponRowOn]}
                onPress={() => setCouponId(null)}
              >
                <Feather
                  name={!couponId ? "check-circle" : "circle"}
                  size={18}
                  color={!couponId ? colors.gold : colors.border}
                />
                <Text style={styles.couponNone}>使用しない</Text>
              </TouchableOpacity>
              {usableCoupons.map((c) => {
                const on = couponId === c.grant_id;
                return (
                  <TouchableOpacity
                    key={c.grant_id}
                    style={[styles.couponRow, on && styles.couponRowOn]}
                    onPress={() => setCouponId(on ? null : c.grant_id)}
                  >
                    <Feather
                      name={on ? "check-circle" : "circle"}
                      size={18}
                      color={on ? colors.gold : colors.border}
                    />
                    <View style={styles.couponInfo}>
                      <Text style={styles.couponTitle}>{c.title}</Text>
                      <Text style={styles.couponMeta}>{c.target_label}に利用できます</Text>
                    </View>
                    <Text style={styles.couponOff}>−{yen(discountOf(c))}</Text>
                  </TouchableOpacity>
                );
              })}
              <Text style={styles.couponNote}>クーポンは1回のご予約につき1枚までご利用いただけます。</Text>
            </>
          )}

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
  discountName: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.goldDeep,
    flex: 1,
  },
  discountPrice: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.goldDeep,
  },
  couponRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    marginBottom: spacing.sm,
  },
  couponRowOn: { borderColor: colors.gold, backgroundColor: "#fdfbf6" },
  couponInfo: { flex: 1, gap: 2 },
  couponTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.text,
  },
  couponMeta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textLight,
  },
  couponOff: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.goldDeep,
  },
  couponNone: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    flex: 1,
  },
  couponNote: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textLight,
    marginBottom: spacing.md,
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
