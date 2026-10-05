/* ============================================================
   prepaid.tsx  ―  回数券の残高と履歴（2026-10-05）
   ------------------------------------------------------------
   紙の回数券をアプリにしたもの。ホームの残高カードから開く。
   ------------------------------------------------------------
   ★ この画面は見るだけ。発行・利用は店頭（管理画面）でのみ行う。
   ★ 金額は fonts.sansBold を使う。細いセリフ体は 1 と I、0 と O が
     見分けにくく、クーポンの割引率で一度直した経緯があるため。
   ★ 取り消された記録も残す（打ち消し済みと分かる形で）。
     お客様から問い合わせがあったときに追えるようにするため。
============================================================ */

import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { fetchMyPrepaid, ApiError } from "@/lib/api";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";
import type { PrepaidEntry } from "@/lib/types";

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

function yen(n: number): string {
  return "¥" + Math.abs(n).toLocaleString("ja-JP");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function HistoryRow({ entry }: { entry: PrepaidEntry }) {
  const plus = entry.amount > 0;
  return (
    <View style={[styles.row, entry.voided && styles.rowVoided]}>
      <View style={styles.rowMain}>
        <Text style={styles.rowLabel}>{entry.label}</Text>
        <Text style={styles.rowSub}>
          {formatDate(entry.created_at)}
          {entry.shop ? `　${entry.shop}` : ""}
          {entry.voided ? "　取り消し済み" : ""}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, plus ? styles.rowPlus : styles.rowMinus]}>
          {plus ? "＋" : "−"}
          {yen(entry.amount)}
        </Text>
        <Text style={styles.rowBalance}>残高 {yen(entry.balance_after)}</Text>
      </View>
    </View>
  );
}

export default function PrepaidScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<PrepaidEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await fetchMyPrepaid();
      setBalance(d.balance);
      setHistory(d.history);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "残高を取得できませんでした");
    }
  }, []);

  useEffect(() => {
    track("screen_view", { screen: "prepaid" });
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={HIT_SLOP} accessibilityLabel="前の画面に戻る">
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>回数券</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>ご利用いただける残高</Text>
          <Text style={styles.balanceValue}>{loading ? "—" : yen(balance ?? 0)}</Text>
          <Text style={styles.balanceNote}>
            ご来店時に、店舗でこの残高からお支払いいただけます。
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>ご利用の履歴</Text>
        {loading ? (
          <Text style={styles.muted}>読み込み中…</Text>
        ) : history.length ? (
          <View style={styles.list}>
            {history.map((e) => (
              <HistoryRow key={e.id} entry={e} />
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>まだご利用の履歴はありません。</Text>
        )}

        <Text style={styles.footNote}>
          回数券のご購入は店舗で承っております。残高に有効期限はありません。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  headerTitle: { fontFamily: fonts.serifJp, fontSize: fontSize.h3, color: colors.text },
  headerSpacer: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  balanceCard: {
    padding: spacing.lg,
    backgroundColor: colors.bgSub,
    borderRadius: radius,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    marginBottom: spacing.lg,
  },
  balanceLabel: { fontFamily: fonts.sans, fontSize: fontSize.caption, color: colors.textLight },
  balanceValue: {
    fontFamily: fonts.sansBold,
    fontSize: 36,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  balanceNote: { fontFamily: fonts.sans, fontSize: fontSize.caption, color: colors.textLight, lineHeight: 20 },

  sectionTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  list: { gap: 1, backgroundColor: colors.border, borderRadius: radius, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bg,
  },
  rowVoided: { opacity: 0.5 },
  rowMain: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: fonts.sansMedium, fontSize: fontSize.caption + 1, color: colors.text, lineHeight: 20 },
  rowSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.textLight, lineHeight: 17 },
  rowRight: { alignItems: "flex-end", gap: 2 },
  rowAmount: { fontFamily: fonts.sansBold, fontSize: fontSize.body },
  rowPlus: { color: colors.success },
  rowMinus: { color: colors.text },
  rowBalance: { fontFamily: fonts.sans, fontSize: 12, color: colors.textLight },

  muted: { fontFamily: fonts.sans, fontSize: fontSize.caption, color: colors.textLight },
  error: { fontFamily: fonts.sans, fontSize: fontSize.caption, color: colors.danger, marginBottom: spacing.md },
  footNote: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 19,
    marginTop: spacing.lg,
  },
});
