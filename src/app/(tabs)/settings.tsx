/* ============================================================
   settings.tsx  ―  S11 設定（一部）
   ------------------------------------------------------------
   Phase 2 時点では、登録済みプロフィールの表示とログアウトのみ。
   プッシュ通知の許可状態・利用規約リンク・アプリバージョン等の
   残りの項目は Phase 7 で追加する（IMPLEMENTATION_PLAN.md参照）。
============================================================ */

import React, { useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GoldButton } from "@/components/GoldButton";
import { Card } from "@/components/Card";
import { useAuth } from "@/lib/auth-context";
import { deleteMyAccount, ApiError } from "@/lib/api";
import { colors, fonts, fontSize, spacing } from "@/theme";

import { t } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
const PRIVACY_URL = "https://reserve.carcare-center.co.jp/privacy-app.html";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { customer, signOut, forgetAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = () => {
    Alert.alert(t("ログアウトしますか？"), t("再度ご利用いただくには、お名前とご連絡先の再入力が必要です。"), [
      { text: t("キャンセル"), style: "cancel" },
      { text: t("ログアウト"), style: "destructive", onPress: () => signOut() },
    ]);
  };

  /* アカウントの削除。
     ★ Appleのガイドライン 5.1.1(v) で、アプリ内から削除できることが必須。
       消えるのはアプリのログイン情報だけで、回数券の残高や来店履歴は
       店舗の取引記録として残る（同じ連絡先で登録し直せばまた見られる）。
       誤操作が起きないよう、確認を2段階にしている。 */
  const handleDelete = () => {
    Alert.alert(
      t("アカウントを削除しますか？"),
      t("アプリのログイン情報を削除します。\n\n") +
        t("回数券の残高・来店履歴・ご予約は、店舗のお取引記録として残ります。") +
        t("同じご連絡先で登録し直すと、再びアプリでご確認いただけます。"),
      [
        { text: t("キャンセル"), style: "cancel" },
        {
          text: t("削除に進む"),
          style: "destructive",
          onPress: () =>
            Alert.alert(t("本当に削除しますか？"), t("この操作は取り消せません。"), [
              { text: t("やめる"), style: "cancel" },
              { text: t("削除する"), style: "destructive", onPress: runDelete },
            ]),
        },
      ]
    );
  };

  const runDelete = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      await forgetAccount();
      Alert.alert(t("削除しました"), t("ご利用ありがとうございました。"));
    } catch (e) {
      Alert.alert(
        t("削除できませんでした"),
        e instanceof ApiError ? e.message : t("通信に失敗しました。時間をおいて再度お試しください。")
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.sectionTitle}>{t("プロフィール")}</Text>
      <Card style={styles.card}>
        <Row label={t("お名前")} value={customer?.name ?? "—"} />
        <Row label={t("電話番号")} value={customer?.phone ?? t("未登録")} />
        <Row label={t("メールアドレス")} value={customer?.email ?? t("未登録")} />
      </Card>

      {/* 表示言語（2026-11-20）。項目名は両方の言語で出す（読めない言語のまま迷わないように） */}
      <Card style={[styles.card, styles.langCard]}>
        <View style={styles.row}>
          <Text style={styles.label}>言語 / Language</Text>
          <LangToggle icon={false} />
        </View>
      </Card>

      <View style={styles.footer}>
        <GoldButton title={t("ログアウト")} variant="secondary" onPress={handleSignOut} />
      </View>

      <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>
        <Text style={styles.link}>{t("プライバシーポリシー")}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleDelete} disabled={deleting}>
        <Text style={[styles.danger, deleting && styles.dangerDisabled]}>
          {deleting ? t("削除しています…") : t("アカウントを削除")}
        </Text>
      </TouchableOpacity>
      <Text style={styles.dangerNote}>{t("アプリのログイン情報のみを削除します。回数券の残高・来店履歴は店舗のお取引記録として残ります。")}</Text>
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
/* ★ 画面の上端は iPhone のステータスバー（時刻・電波・電池）の下に
   潜り込むため、安全領域のぶんだけ余白を足す。端末ごとに高さが違うので
   固定値では合わない（ノッチ有無・Dynamic Island で変わる）。 */
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
  /* ★ 2026-11-25 幅の狭い Android で、長いメールアドレスが画面の外へはみ出した。
     見出しは縮めず、値の側を残りの幅に収めて右寄せで折り返す。 */
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 6,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    flexShrink: 0,
  },
  value: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.caption,
    color: colors.text,
    flexShrink: 1,
    textAlign: "right",
  },
  footer: {
    marginTop: spacing.xxl,
  },
  langCard: {
    marginTop: spacing.md,
  },
});
