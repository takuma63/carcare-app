/* ============================================================
   coupons.tsx  ―  S10 クーポン
   ------------------------------------------------------------
   保有クーポンを「利用できる / 利用済み・期限切れ」に分けて表示する。
   デザインは紙のチケットを模した券面：左端に金の帯、上下に切り込み（ノッチ）、
   割引率を大きく見せる。使えないものは灰色に落として並べる。
   ------------------------------------------------------------
   期限が近いもの（7日以内）は赤字で注意を促す。
============================================================ */

import React, { useCallback, useState } from "react";
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { fetchMyCoupons } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { colors, fonts, fontSize, radius, shadow, spacing } from "@/theme";

/* 有効期限の表示。期限が近いかどうかも返す */
function expiryInfo(expiresAt: string | null) {
  if (!expiresAt) return { label: "期限なし", soon: false };
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return { label: "期限なし", soon: false };
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const label = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日まで`;
  return { label, soon: days >= 0 && days <= 7, days };
}

function DiscountBadge({ coupon, muted }: { coupon: Coupon; muted: boolean }) {
  const isPercent = coupon.discount_type === "percent";
  return (
    <View style={styles.badge}>
      <Text style={[styles.badgeValue, muted && styles.mutedText]}>
        {isPercent ? coupon.discount_value : coupon.discount_value.toLocaleString("ja-JP")}
      </Text>
      <Text style={[styles.badgeUnit, muted && styles.mutedText]}>
        {isPercent ? "%" : "円"}
      </Text>
      <Text style={[styles.badgeOff, muted && styles.mutedText]}>OFF</Text>
    </View>
  );
}

function CouponCard({ coupon }: { coupon: Coupon }) {
  const muted = coupon.status !== "available";
  const exp = expiryInfo(coupon.expires_at);

  return (
    <View style={[styles.card, muted && styles.cardMuted]}>
      {/* 左端の金の帯。使えないものは灰色にする */}
      <View style={[styles.stripe, muted && styles.stripeMuted]} />

      {/* チケットらしさを出す切り込み */}
      <View style={[styles.notch, styles.notchTop]} />
      <View style={[styles.notch, styles.notchBottom]} />

      <View style={styles.cardBody}>
        <DiscountBadge coupon={coupon} muted={muted} />

        <View style={styles.cardMain}>
          <Text style={[styles.title, muted && styles.mutedText]} numberOfLines={2}>
            {coupon.title}
          </Text>

          {coupon.description ? (
            <Text style={[styles.desc, muted && styles.mutedText]} numberOfLines={2}>
              {coupon.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <Feather name="tag" size={12} color={muted ? colors.textLight : colors.goldDeep} />
            <Text style={[styles.meta, muted && styles.mutedText]}>{coupon.target_label}</Text>
          </View>

          <View style={styles.metaRow}>
            <Feather name="clock" size={12} color={muted ? colors.textLight : colors.goldDeep} />
            <Text
              style={[
                styles.meta,
                muted && styles.mutedText,
                !muted && exp.soon && styles.metaUrgent,
              ]}
            >
              {exp.label}
              {!muted && exp.soon ? `（あと${exp.days}日）` : ""}
            </Text>
          </View>
        </View>
      </View>

      {/* 状態ラベル */}
      {coupon.status === "used" ? (
        <View style={styles.stamp}>
          <Text style={styles.stampText}>使用済み</Text>
        </View>
      ) : coupon.status === "expired" ? (
        <View style={styles.stamp}>
          <Text style={styles.stampText}>期限切れ</Text>
        </View>
      ) : (
        <View style={styles.useHint}>
          <Text style={styles.useHintText}>ご予約時に選択してご利用いただけます</Text>
        </View>
      )}
    </View>
  );
}

export default function CouponsScreen() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchMyCoupons();
      setCoupons(res.coupons);
    } catch (e) {
      console.error("[coupons] 取得に失敗:", e);
      setError(e instanceof Error ? e.message : "クーポンを取得できませんでした");
      setCoupons([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (coupons === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const available = coupons.filter((c) => c.status === "available");
  const past = coupons.filter((c) => c.status !== "available");

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {available.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>ご利用いただけるクーポン</Text>
          {available.map((c) => (
            <CouponCard key={c.grant_id} coupon={c} />
          ))}
        </>
      ) : (
        <View style={styles.empty}>
          <Feather name="gift" size={36} color={colors.gold} />
          <Text style={styles.emptyTitle}>ご利用いただけるクーポンはありません</Text>
          <Text style={styles.emptyText}>
            クーポンが届くとこちらに表示され、{"\n"}プッシュ通知でもお知らせします。
          </Text>
        </View>
      )}

      {past.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, styles.sectionTitlePast]}>
            使用済み・期限切れ
          </Text>
          {past.map((c) => (
            <CouponCard key={c.grant_id} coupon={c} />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const STRIPE_W = 6;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgSub },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgSub },

  sectionTitle: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.body,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitlePast: { marginTop: spacing.lg, color: colors.textLight },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius,
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadow,
  },
  cardMuted: { backgroundColor: "#fafafa", shadowOpacity: 0.03, elevation: 1 },

  stripe: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    width: STRIPE_W,
    backgroundColor: colors.gold,
  },
  stripeMuted: { backgroundColor: colors.border },

  // 券面の切り込み（背景色と同じ丸を重ねて切り欠きに見せる）
  notch: {
    position: "absolute",
    left: 88,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.bgSub,
  },
  notchTop: { top: -8 },
  notchBottom: { bottom: -8 },

  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingLeft: spacing.md + STRIPE_W,
    paddingRight: spacing.md,
    gap: spacing.md,
  },

  badge: {
    width: 76,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  badgeValue: {
    fontFamily: fonts.serifEn,
    fontSize: 40,
    lineHeight: 44,
    color: colors.gold,
  },
  badgeUnit: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.gold,
    marginLeft: 1,
  },
  badgeOff: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.goldDeep,
    width: "100%",
    textAlign: "center",
    marginTop: -4,
  },

  cardMain: { flex: 1, gap: 3 },
  title: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.bodyLarge,
    color: colors.text,
    lineHeight: 24,
  },
  desc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    lineHeight: 19,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  meta: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    flex: 1,
  },
  metaUrgent: { color: colors.danger, fontFamily: fonts.sansMedium },
  mutedText: { color: colors.textLight },

  useHint: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: "dashed",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md + STRIPE_W,
    backgroundColor: "#fdfbf6",
  },
  useHintText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.goldDeep,
    textAlign: "center",
  },

  stamp: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: "dashed",
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  stampText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.textLight,
  },

  empty: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.body,
    color: colors.text,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 21,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
