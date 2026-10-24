/* ============================================================
   announcements.tsx  ―  お知らせ（タブ）
   ------------------------------------------------------------
   タブの1つ。未読があるとタブにバッジが出る。

   ★ この機能の位置づけ
     一度ご来店いただいた方を1回で終わらせず、次につなげるためのもの。
     「コーティングから1年」「前回の洗車から1ヶ月」といった案内が、
     店舗の管理画面から条件を指定して届く。
     年末年始の営業案内や臨時休業にも使う。

   ★ 本文は別の画面で読む（2026-10-24 発注者の指摘）
     以前はこの一覧の中で開閉していたが、何件も届くと1件ずつの境目が
     分かりにくく、本文も読みづらかった。押したら詳細へ移る形にして、
     一覧は「いつ・何が届いたか」を見渡すためのものにする。
     既読にするのは詳細側で行う。
============================================================ */

import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ApiError, fetchMyAnnouncements, type Announcement } from "@/lib/api";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();

  const router = useRouter();
  const [items, setItems] = useState<Announcement[]>([]);
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

  /* 詳細から戻ってきたら読み直す。既読の印を合わせるため。 */
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.headerTitle}>お知らせ</Text>
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
            const unread = !a.read_at;
            /* 本文の書き出し。改行は空白にして、一覧では1〜2行に収める */
            const excerpt = (a.body || "").replace(/\s+/g, " ").trim();
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => router.push(`/announcements/${a.id}`)}
                activeOpacity={0.85}
                style={[styles.card, unread && styles.cardUnread]}
                accessibilityLabel={`${a.title} を開く`}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.date}>{a.sent_on ?? ""}</Text>
                  {unread ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>未読</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={2}>
                  {a.title}
                </Text>

                {excerpt ? (
                  <Text style={styles.excerpt} numberOfLines={2}>
                    {excerpt}
                  </Text>
                ) : null}

                <View style={styles.more}>
                  <Text style={styles.moreText}>詳しく見る</Text>
                  <Feather name="chevron-right" size={16} color={colors.goldDeep} />
                </View>
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg,
  },
  headerTitle: { fontFamily: fonts.serifJp, fontSize: fontSize.h3, color: colors.text },
  /* 1件ずつの境目がはっきり分かるよう、枠で囲って間隔を空ける
     （2026-10-24 発注者の指摘。以前は境目が分かりにくかった） */
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  center: { paddingVertical: spacing.xxl, alignItems: "center", gap: spacing.sm },
  emptyTitle: { fontFamily: fonts.serifJp, fontSize: fontSize.h3, color: colors.text, marginTop: spacing.xs },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    lineHeight: 20,
    color: colors.textLight,
    textAlign: "center",
  },
  card: {
    padding: spacing.md,
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
  },
  /* 未読は左に金の帯を立てて、並んでいても目に入るようにする */
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    paddingLeft: spacing.md - 2,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: {
    fontFamily: fonts.num,
    fontVariant: ["tabular-nums"],
    fontSize: fontSize.caption,
    color: colors.textLight,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.gold,
  },
  badgeText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.white },
  title: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.bodyLarge,
    lineHeight: 26,
    color: colors.text,
  },
  titleUnread: { fontFamily: fonts.sansBold },
  excerpt: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    lineHeight: 20,
    color: colors.textLight,
  },
  more: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 2,
    marginTop: 2,
  },
  moreText: { fontFamily: fonts.sansMedium, fontSize: fontSize.caption, color: colors.goldDeep },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: "center",
  },
});
