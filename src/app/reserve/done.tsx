/* ============================================================
   reserve/done.tsx  ―  S7 予約完了
   ------------------------------------------------------------
   予約完了を「受付チケット」風のカードで表示する。
   ※ 受付QRは廃止（作業中にかざす手間をなくすため）。ご来店時は
     お名前または予約番号をスタッフにお伝えいただく運用。
============================================================ */

import React, { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { GoldButton } from "@/components/GoldButton";
import { colors, fonts, fontSize, radius, shadow, spacing } from "@/theme";

export default function BookingDoneScreen() {
  const { token, paid } = useLocalSearchParams<{ token: string; paid?: string }>();
  const router = useRouter();
  const paidAmount = paid ? parseInt(paid, 10) : null;

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }).start();
  }, [anim]);

  const shortToken = (token ?? "").slice(0, 8).toUpperCase();

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Animated.View
        style={[
          styles.checkCircle,
          { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] },
        ]}
      >
        <Feather name="check" size={36} color={colors.white} />
      </Animated.View>

      <Text style={styles.title}>ご予約ありがとう{"\n"}ございました</Text>
      <Text style={styles.lead}>ご予約を承りました。確定のご連絡を改めて差し上げます。</Text>

      <View style={styles.ticket}>
        <Text style={styles.ticketLabel}>RECEPTION TICKET</Text>
        <Text style={styles.tokenLabel}>予約番号 {shortToken}</Text>
        {paidAmount != null && !isNaN(paidAmount) && (
          <View style={styles.paidBadge}>
            <Feather name="check-circle" size={14} color={colors.white} />
            <Text style={styles.paidBadgeText}>お支払い済み ¥{paidAmount.toLocaleString("ja-JP")}</Text>
          </View>
        )}
        <View style={styles.dashedLine} />
        <Text style={styles.hint}>ご来店時は、お名前または予約番号を{"\n"}スタッフにお伝えください</Text>
      </View>

      <Text style={styles.subHint}>ご予約内容は「予約履歴」からいつでもご確認いただけます。</Text>

      <GoldButton title="ホームへ戻る" onPress={() => router.replace("/")} style={styles.homeButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bgSub },
  content: {
    alignItems: "center",
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h2,
    color: colors.text,
    textAlign: "center",
    lineHeight: 36,
  },
  lead: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 20,
  },
  ticket: {
    alignSelf: "stretch",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.sm,
    ...shadow,
  },
  ticketLabel: {
    fontFamily: fonts.serifEn,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.goldDeep,
  },
  tokenLabel: {
    fontFamily: fonts.serifEn,
    fontSize: fontSize.h2,
    letterSpacing: 2,
    color: colors.text,
  },
  dashedLine: {
    alignSelf: "stretch",
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.success,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  paidBadgeText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.white,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 20,
  },
  subHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 20,
  },
  homeButton: {
    alignSelf: "stretch",
    marginTop: spacing.sm,
  },
});
