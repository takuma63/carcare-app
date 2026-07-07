/* ============================================================
   Card.tsx  ―  共通カード（角丸控えめ・淡い影。SPEC.md §2）
============================================================ */

import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, shadow, spacing } from "@/theme";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
}

export function Card({ children, style, noPadding }: Props) {
  return <View style={[styles.base, !noPadding && styles.padding, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.white,
    borderRadius: radius,
    ...shadow,
  },
  padding: {
    padding: spacing.lg,
  },
});
