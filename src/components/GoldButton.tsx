/* ============================================================
   GoldButton.tsx  ―  主CTA（ゴールド背景）／副CTA（白背景×チャコール枠）
   SPEC.md §2「ボタンは『ゴールド背景×白文字』が主CTA、
   『白背景×チャコール枠』が副CTA」
============================================================ */

import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { colors, fonts, fontSize, radius } from "@/theme";

interface Props {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  style?: StyleProp<ViewStyle>;
}

export function GoldButton({ title, onPress, variant = "primary", disabled, loading, icon, style }: Props) {
  const isPrimary = variant === "primary";
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (!isDisabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
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
        <View style={styles.inner}>
          {icon && <Feather name={icon} size={17} color={isPrimary ? colors.white : colors.text} />}
          <Text style={[styles.text, isPrimary ? styles.textPrimary : styles.textSecondary]}>{title}</Text>
        </View>
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
    shadowColor: colors.gold,
    shadowOpacity: 0.32,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  secondary: {
    backgroundColor: colors.white,
    borderColor: colors.text,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
