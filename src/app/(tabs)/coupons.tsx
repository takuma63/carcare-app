/* ============================================================
   coupons.tsx  ―  S10 クーポン（プレースホルダー）
   クーポン配信機能はPhase 6（F4）で実装する。それまでは案内のみ表示。
============================================================ */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fonts, fontSize, spacing } from "@/theme";

export default function CouponsScreen() {
  return (
    <View style={styles.container}>
      <Feather name="gift" size={40} color={colors.gold} />
      <Text style={styles.title}>クーポン</Text>
      <Text style={styles.text}>クーポン機能は近日公開予定です。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
    marginTop: spacing.sm,
  },
  text: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
});
