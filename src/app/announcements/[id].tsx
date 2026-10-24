/* ============================================================
   announcements/[id].tsx  ―  お知らせの本文
   ------------------------------------------------------------
   一覧（タブ）から押して開く。通知から直接開かれることもある。

   ★ 開いたら既読にする
     未読の印は「まだ読んでいない案内がある」ことを伝えるためのもの。
     本文を開いた時点で役目を終えるので、その場で既読にする。
     既読にできなくても本文は読めるようにする（通信が不安定なときに
     本文が開かないほうが困るため）。

   ★ 本文だけを取る口は用意していない
     お一人あたりの件数はたかが知れているので、一覧を取って
     その中から選ぶ。APIを1つ増やすほどの理由がない。
============================================================ */

import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ApiError, fetchMyAnnouncements, markAnnouncementRead, type Announcement } from "@/lib/api";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, spacing } from "@/theme";

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetchMyAnnouncements();
      const found = (r.announcements ?? []).find((x) => x.id === id) ?? null;
      if (!found) {
        setError("このお知らせは見つかりませんでした。");
        return;
      }
      setItem(found);
      if (!found.read_at) {
        try {
          await markAnnouncementRead(found.id);
        } catch {
          // 既読にできなくても読めてはいるので、画面は止めない
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "お知らせを取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    track("screen_view", { screen: "announcement_detail" });
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "お知らせが見つかりませんでした"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      {!!item.sent_on && <Text style={styles.date}>{item.sent_on}</Text>}
      <Text style={styles.title}>{item.title}</Text>
      <View style={styles.rule} />
      <Text style={styles.body}>{item.body}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  date: {
    fontFamily: fonts.num,
    fontVariant: ["tabular-nums"],
    fontSize: fontSize.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h3,
    lineHeight: 30,
    color: colors.text,
  },
  rule: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: fontSize.body,
    lineHeight: 28,
    color: colors.text,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.danger,
    textAlign: "center",
  },
});
