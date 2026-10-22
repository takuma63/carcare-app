/* ============================================================
   announcements.tsx  ―  お知らせ
   ------------------------------------------------------------
   ホーム画面のお知らせ欄から開く。

   ★ この機能の位置づけ
     一度ご来店いただいた方を1回で終わらせず、次につなげるためのもの。
     「コーティングから1年」「前回の洗車から1ヶ月」といった案内が、
     店舗の管理画面から条件を指定して届く。
     年末年始の営業案内や臨時休業にも使う。

   ★ 開いたら既読にする
     未読の印は「まだ読んでいない案内がある」ことを伝えるためのもの。
     本文を開いた時点で役目を終えるので、その場で既読にする。
============================================================ */

import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { ApiError, fetchMyAnnouncements, markAnnouncementRead, type Announcement } from "@/lib/api";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, spacing } from "@/theme";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [items, setItems] = useState<Announcement[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetchMyAnnouncements();
      setItems(r.announcements);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "お知らせを取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    track("screen_view", { screen: "announcements" });
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /* 開くと同時に既読にする。既読にできなくても本文は読めるようにする
     （通信が不安定なときに本文が開かないほうが困るため）。 */
  const toggle = async (a: Announcement) => {
    const opening = openId !== a.id;
    setOpenId(opening ? a.id : null);
    if (opening && !a.read_at) {
      setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, read_at: new Date().toISOString() } : x)));
      try {
        await markAnnouncementRead(a.id);
      } catch {
        // 既読にできなくても読めてはいるので、画面は止めない
      }
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={HIT_SLOP} accessibilityLabel="前の画面に戻る">
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>お知らせ</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Feather name="bell" size={40} color={colors.gold} />
            <Text style={styles.emptyTitle}>お知らせはありません</Text>
            <Text style={styles.emptyText}>
              キャンペーンや営業のご案内が届くと{"\n"}こちらに表示されます。
            </Text>
          </View>
        ) : (
          items.map((a) => {
            const open = openId === a.id;
            return (
              <TouchableOpacity key={a.id} onPress={() => toggle(a)} activeOpacity={0.85}>
                <Card style={styles.card}>
                  <View style={styles.row}>
                    {!a.read_at ? <View style={styles.dot} /> : null}
                    <Text style={[styles.title, !a.read_at && styles.titleUnread]}>{a.title}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.date}>{a.sent_on ?? ""}</Text>
                    <Feather name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.textLight} />
                  </View>
                  {open ? <Text style={styles.body}>{a.body}</Text> : null}
                </Card>
              </TouchableOpacity>
            );
          })
        )}
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
    paddingBottom: spacing.sm,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  headerTitle: { fontFamily: fonts.serifJp, fontSize: fontSize.h3, color: colors.text },
  headerSpacer: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { paddingVertical: spacing.xxl, alignItems: "center", gap: spacing.sm },
  emptyTitle: { fontFamily: fonts.serifJp, fontSize: fontSize.h3, color: colors.text, marginTop: spacing.xs },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    lineHeight: 20,
    color: colors.textLight,
    textAlign: "center",
  },
  card: { marginBottom: spacing.sm, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  /* 未読の印。金の点ひとつ。バッジより静かで、並べても騒がしくならない */
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },
  title: { flex: 1, fontFamily: fonts.sans, fontSize: fontSize.body, color: colors.text, lineHeight: 22 },
  titleUnread: { fontFamily: fonts.sansBold },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { fontFamily: fonts.num, fontSize: fontSize.caption, color: colors.textLight },
  body: {
    fontFamily: fonts.sans,
    fontSize: fontSize.body,
    lineHeight: 24,
    color: colors.text,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: "center",
  },
});
