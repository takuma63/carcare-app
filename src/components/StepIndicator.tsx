/* ============================================================
   StepIndicator.tsx  ―  予約フロー上部のステップ表示（1/4〜4/4）
   SPEC.md §4.2 S3「ステップインジケーター（1/4〜4/4）を
   予約フロー全画面上部に表示」
============================================================ */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, fontSize, spacing } from "@/theme";

const STEP_LABELS = ["お車", "メニュー", "店舗・日時", "確認"];

export function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <View>
      <View style={styles.row}>
        {STEP_LABELS.map((label, idx) => {
          const step = idx + 1;
          const active = step <= current;
          return (
            <React.Fragment key={label}>
              <View style={styles.dotWrap}>
                <View style={[styles.dot, active && styles.dotActive]}>
                  <Text style={[styles.dotText, active && styles.dotTextActive]}>{step}</Text>
                </View>
                <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
              </View>
              {step < STEP_LABELS.length && <View style={[styles.line, step < current && styles.lineActive]} />}
            </React.Fragment>
          );
        })}
      </View>
      <Text style={styles.counter}>
        STEP {current}/{STEP_LABELS.length}
      </Text>
    </View>
  );
}

const DOT_SIZE = 26;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.md,
  },
  dotWrap: {
    alignItems: "center",
    width: 64,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  dotText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textLight,
  },
  dotTextActive: {
    color: colors.white,
  },
  label: {
    marginTop: 4,
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    textAlign: "center",
  },
  labelActive: {
    color: colors.text,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    marginTop: DOT_SIZE / 2,
  },
  lineActive: {
    backgroundColor: colors.gold,
  },
  counter: {
    marginTop: spacing.sm,
    textAlign: "center",
    fontFamily: fonts.serifEn,
    fontSize: fontSize.caption,
    letterSpacing: 1,
    color: colors.gold,
  },
});
