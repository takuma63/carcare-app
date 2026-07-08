/* ============================================================
   Toast.tsx  ―  フォアグラウンド通知受信時のアプリ内トースト（SPEC.md §4.3）
   上からスライドインし、タップで該当画面（予約詳細等）へ遷移できる。
============================================================ */

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, fontSize, radius, shadow, spacing } from "@/theme";

interface Props {
  title: string;
  body: string;
  onPress?: () => void;
}

export function Toast({ title, body, onPress }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }).start();
  }, [anim]);

  return (
    <SafeAreaView style={styles.wrap} pointerEvents="box-none">
      <Animated.View
        style={{
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
        }}
      >
        <TouchableOpacity style={styles.card} onPress={onPress} disabled={!onPress} activeOpacity={0.85}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {body}
          </Text>
          {onPress && <Text style={styles.hint}>タップして詳細を見る</Text>}
        </TouchableOpacity>
      </Animated.View>
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
    color: colors.goldDeep,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.text,
    marginTop: 2,
    lineHeight: 19,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textLight,
    marginTop: 6,
  },
});
