/* ============================================================
   reserve/done.tsx  ―  S7 予約完了（SPEC.md §4.2）
   ------------------------------------------------------------
   受付QRコード（§7.2のURL形式）を「受付チケット」風のカードで大きく表示。
   来店時にスタッフへ見せてもらう画面なので、スクリーンショット保存も促す。
============================================================ */

import React, { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Constants from "expo-constants";
import QRCode from "react-native-qrcode-svg";
import { Feather } from "@expo/vector-icons";
import { GoldButton } from "@/components/GoldButton";
import { colors, fonts, fontSize, radius, shadow, spacing } from "@/theme";

const STATUS_BASE_URL = (Constants.expoConfig?.extra?.STATUS_BASE_URL as string | undefined) ?? "";

export default function BookingDoneScreen() {
  const { token, paid } = useLocalSearchParams<{ token: string; paid?: string }>();
  const router = useRouter();
  const paidAmount = paid ? parseInt(paid, 10) : null;

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }).start();
  }, [anim]);

  const qrValue = `${STATUS_BASE_URL}/t/${token}`;
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
        <QRCode value={qrValue} size={200} color={colors.text} backgroundColor={colors.white} />
        <View style={styles.dashedLine} />
        <Text style={styles.qrHint}>ご来店時にこの画面を{"\n"}スタッフにお見せください</Text>
      </View>

      <Text style={styles.screenshotHint}>スクリーンショットで保存しておくと安心です。</Text>

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
    fontSize: fontSize.h3,
    letterSpacing: 1,
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
  qrHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 20,
  },
  screenshotHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    lineHeight: 20,
  },
  homeButton: {
    alignSelf: "stretch",
    marginTop: spacing.sm,
  },
});
