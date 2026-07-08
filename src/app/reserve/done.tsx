/* ============================================================
   reserve/done.tsx  ―  S7 予約完了（SPEC.md §4.2）
   ------------------------------------------------------------
   受付QRコード（§7.2のURL形式。bookings/[id].tsxのS9と同一の組み立て方）を
   大きく表示し、来店時にスタッフへ見せてもらう。
============================================================ */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Constants from "expo-constants";
import QRCode from "react-native-qrcode-svg";
import { Card } from "@/components/Card";
import { GoldButton } from "@/components/GoldButton";
import { colors, fonts, fontSize, spacing } from "@/theme";

const STATUS_BASE_URL = (Constants.expoConfig?.extra?.STATUS_BASE_URL as string | undefined) ?? "";

export default function BookingDoneScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  const qrValue = `${STATUS_BASE_URL}/t/${token}`;
  const shortToken = (token ?? "").slice(0, 8).toUpperCase();

  return (
    <View style={styles.flex}>
      <View style={styles.content}>
        <Text style={styles.title}>ご予約ありがとう{"\n"}ございました</Text>
        <Text style={styles.tokenLabel}>予約番号 {shortToken}</Text>

        <Card style={styles.qrCard}>
          <QRCode value={qrValue} size={200} color={colors.text} backgroundColor={colors.white} />
          <Text style={styles.qrHint}>ご来店時にこの画面をスタッフにお見せください</Text>
        </Card>

        <GoldButton title="ホームへ戻る" onPress={() => router.replace("/")} style={styles.homeButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h1,
    color: colors.text,
    textAlign: "center",
    lineHeight: 38,
  },
  tokenLabel: {
    fontFamily: fonts.serifEn,
    fontSize: fontSize.caption,
    letterSpacing: 1,
    color: colors.goldDeep,
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
  homeButton: {
    minWidth: 200,
    marginTop: spacing.md,
  },
});
