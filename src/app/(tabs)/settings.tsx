/* ============================================================
   settings.tsx  ―  S11 設定（一部）
   ------------------------------------------------------------
   Phase 2 時点では、登録済みプロフィールの表示とログアウトのみ。
   プッシュ通知の許可状態・利用規約リンク・アプリバージョン等の
   残りの項目は Phase 7 で追加する（IMPLEMENTATION_PLAN.md参照）。
============================================================ */

import React from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { GoldButton } from "@/components/GoldButton";
import { Card } from "@/components/Card";
import { useAuth } from "@/lib/auth-context";
import { colors, fonts, fontSize, spacing } from "@/theme";

export default function SettingsScreen() {
  const { customer, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("ログアウトしますか？", "再度ご利用いただくには、お名前とご連絡先の再入力が必要です。", [
      { text: "キャンセル", style: "cancel" },
      { text: "ログアウト", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>プロフィール</Text>
      <Card style={styles.card}>
        <Row label="お名前" value={customer?.name ?? "—"} />
        <Row label="電話番号" value={customer?.phone ?? "未登録"} />
        <Row label="メールアドレス" value={customer?.email ?? "未登録"} />
      </Card>

      <View style={styles.footer}>
        <GoldButton title="ログアウト" variant="secondary" onPress={handleSignOut} />
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  value: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.text,
  },
  footer: {
    marginTop: spacing.xxl,
  },
});
