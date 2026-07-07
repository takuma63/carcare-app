/* ============================================================
   Toast.tsx  ―  フォアグラウンド通知受信時のアプリ内トースト（SPEC.md §4.3）
============================================================ */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, fontSize, radius, shadow, spacing } from "@/theme";

export function Toast({ title, body }: { title: string; body: string }) {
  return (
    <SafeAreaView style={styles.wrap} pointerEvents="none">
      <View style={styles.card}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {body}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.caption,
    color: colors.gold,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.text,
    marginTop: 2,
  },
});
