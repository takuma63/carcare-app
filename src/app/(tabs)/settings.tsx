/* ============================================================
   settings.tsx  ―  S11 設定（一部）
   ------------------------------------------------------------
   Phase 2 時点では、登録済みプロフィールの表示とログアウトのみ。
   プッシュ通知の許可状態・利用規約リンク・アプリバージョン等の
   残りの項目は Phase 7 で追加する（IMPLEMENTATION_PLAN.md参照）。
============================================================ */

import React, { useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GoldButton } from "@/components/GoldButton";
import { Card } from "@/components/Card";
import { useAuth } from "@/lib/auth-context";
import { deleteMyAccount, ApiError } from "@/lib/api";
import { colors, fonts, fontSize, spacing } from "@/theme";

const PRIVACY_URL = "https://carcare-center.co.jp/privacy/app/";

export default function SettingsScreen() {
  const { customer, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = () => {
    Alert.alert("ログアウトしますか？", "再度ご利用いただくには、お名前とご連絡先の再入力が必要です。", [
      { text: "キャンセル", style: "cancel" },
      { text: "ログアウト", style: "destructive", onPress: () => signOut() },
    ]);
  };

  /* アカウントの削除。
     ★ Appleのガイドライン 5.1.1(v) で、アプリ内から削除できることが必須。
       消えるのはアプリのログイン情報だけで、回数券の残高や来店履歴は
       店舗の取引記録として残る（同じ連絡先で登録し直せばまた見られる）。
       誤操作が起きないよう、確認を2段階にしている。 */
  const handleDelete = () => {
    Alert.alert(
      "アカウントを削除しますか？",
      "アプリのログイン情報を削除します。\n\n" +
        "回数券の残高・来店履歴・ご予約は、店舗のお取引記録として残ります。" +
        "同じご連絡先で登録し直すと、再びアプリでご確認いただけます。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除に進む",
          style: "destructive",
          onPress: () =>
            Alert.alert("本当に削除しますか？", "この操作は取り消せません。", [
              { text: "やめる", style: "cancel" },
              { text: "削除する", style: "destructive", onPress: runDelete },
            ]),
        },
      ]
    );
  };

  const runDelete = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      await signOut();
      Alert.alert("削除しました", "ご利用ありがとうございました。");
    } catch (e) {
      Alert.alert(
        "削除できませんでした",
        e instanceof ApiError ? e.message : "通信に失敗しました。時間をおいて再度お試しください。"
      );
    } finally {
      setDeleting(false);
    }
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

      <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>
        <Text style={styles.link}>プライバシーポリシー</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleDelete} disabled={deleting}>
        <Text style={[styles.danger, deleting && styles.dangerDisabled]}>
          {deleting ? "削除しています…" : "アカウントを削除"}
        </Text>
      </TouchableOpacity>
      <Text style={styles.dangerNote}>
        アプリのログイン情報のみを削除します。回数券の残高・来店履歴は店舗のお取引記録として残ります。
      </Text>
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
  link: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    textAlign: "center",
    textDecorationLine: "underline",
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  danger: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.danger,
    textAlign: "center",
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  dangerDisabled: { opacity: 0.5 },
  dangerNote: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 2,
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
