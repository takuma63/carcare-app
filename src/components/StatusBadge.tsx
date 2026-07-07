/* ============================================================
   StatusBadge.tsx  ―  予約ステータスのバッジ（SPEC.md §4.2 S8）
   新規=textLight／確定=gold／作業中=gold(塗り)／完了=success／
   キャンセル=danger
============================================================ */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, statusColors, statusLabels } from "@/theme";
import type { BookingStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: BookingStatus }) {
  const filled = status === "in_progress" || status === "done" || status === "canceled";
  const tone = statusColors[status] ?? colors.textLight;

  return (
    <View
      style={[
        styles.base,
        filled ? { backgroundColor: tone } : { backgroundColor: colors.bgSub, borderWidth: 1, borderColor: tone },
      ]}
    >
      <Text style={[styles.text, { color: filled ? colors.white : tone }]}>{statusLabels[status] ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  text: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
  },
});
