/* ============================================================
   ReserveHeader.tsx  ―  予約フロー（S3〜S6）共通ヘッダー
   ------------------------------------------------------------
   ・← 戻る：1つ前のステップへ（S3では非表示）
   ・× 閉じる：予約フロー全体を破棄してホームへ。入力内容が消えるため
     確認ダイアログを挟む（誤タップ・誤スワイプでの喪失を防ぐ）
============================================================ */

import React from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, spacing } from "@/theme";

import { t } from "@/lib/i18n";
const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

export function ReserveHeader({ showBack = true }: { showBack?: boolean }) {
  const router = useRouter();

  const confirmClose = () => {
    Alert.alert(t("予約をやめますか？"), t("入力した内容は保存されません。"), [
      { text: t("続ける"), style: "cancel" },
      { text: t("やめる"), style: "destructive", onPress: () => router.replace("/") },
    ]);
  };

  return (
    <View style={styles.row}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} hitSlop={HIT_SLOP} accessibilityLabel={t("前の画面に戻る")}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
      <TouchableOpacity onPress={confirmClose} hitSlop={HIT_SLOP} accessibilityLabel={t("予約をやめる")}>
        <Feather name="x" size={24} color={colors.textLight} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  spacer: {
    width: 24,
    height: 24,
  },
});
