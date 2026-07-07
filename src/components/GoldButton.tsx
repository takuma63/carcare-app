/* ============================================================
   GoldButton.tsx  ―  主CTA（ゴールド背景）／副CTA（白背景×チャコール枠）
   SPEC.md §2「ボタンは『ゴールド背景×白文字』が主CTA、
   『白背景×チャコール枠』が副CTA」
============================================================ */

import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, fonts, fontSize, radius } from "@/theme";

interface Props {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GoldButton({ title, onPress, variant = "primary", disabled, loading, style }: Props) {
  const isPrimary = variant === "primary";
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.gold} />
      ) : (
        <Text style={[styles.text, isPrimary ? styles.textPrimary : styles.textSecondary]}>{title}</Text>
      )}
    </Pressable>
  );
}

/** ボタンを縦に並べて一定間隔を空けるための簡易ラッパー */
export function ButtonGroup({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.group, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  secondary: {
    backgroundColor: colors.white,
    borderColor: colors.text,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    letterSpacing: 0.5,
  },
  textPrimary: {
    color: colors.white,
  },
  textSecondary: {
    color: colors.text,
  },
  group: {
    gap: 12,
  },
});
