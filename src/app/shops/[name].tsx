/* ============================================================
   shops/[name].tsx  ―  店舗のご案内（1店舗）
   ------------------------------------------------------------
   2026-10-26 発注者の要望。ホームの店舗一覧から開く。
   地図（予約画面の店舗選びと同じ埋め込み）・住所・入口の目印・
   営業時間・電話番号を出し、その下に「電話する」「経路を調べる」を置く。
   ★ 店舗はどこも商業施設の駐車場内にあるので、入口の目印（access）を
     住所と同じ大きさで出す。地図だけでは入口が分からないため。
============================================================ */

import React, { useEffect } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ShopMap } from "@/components/ShopMap";
import { GoldButton } from "@/components/GoldButton";
import { findShop, shopMapLinkUrl } from "@/lib/shops";
import { track } from "@/lib/analytics";
import { colors, fonts, fontSize, spacing } from "@/theme";

const HOURS = "10:00〜19:00（平日・土日祝）";

export default function ShopScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const shop = findShop(name ? decodeURIComponent(String(name)) : null);

  useEffect(() => {
    track("screen_view", { screen: "shop", shop: shop?.name ?? "" });
  }, [shop?.name]);

  if (!shop) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>店舗が見つかりませんでした。</Text>
      </View>
    );
  }

  const call = () => Linking.openURL(`tel:${shop.tel.replace(/-/g, "")}`).catch(() => {});
  const route = () => Linking.openURL(shopMapLinkUrl(shop.name)).catch(() => {});

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Store</Text>
      <Text style={styles.name}>{shop.name}</Text>

      <View style={styles.map}>
        <ShopMap shopName={shop.name} mapOnly />
      </View>

      <View style={styles.info}>
        <Row label="住所" value={`${shop.zip}\n${shop.address}`} />
        <Row label="入口の目印" value={shop.access} />
        <Row label="営業時間" value={HOURS} />
        <Row label="電話番号" value={shop.tel} num />
      </View>

      <View style={styles.actions}>
        <GoldButton title={`電話する（${shop.tel}）`} icon="phone" onPress={call} />
        <GoldButton title="経路を調べる" icon="map-pin" variant="secondary" onPress={route} />
      </View>
    </ScrollView>
  );
}

function Row({ label, value, num }: { label: string; value: string; num?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, num && styles.rowNum]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  missing: { fontFamily: fonts.sans, fontSize: fontSize.body, color: colors.textLight },
  eyebrow: {
    fontFamily: fonts.serifEn,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.goldDeep,
    textTransform: "uppercase",
  },
  name: {
    fontFamily: fonts.serifJp,
    fontSize: fontSize.h2,
    color: colors.text,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  map: { marginBottom: spacing.md },
  info: { borderTopWidth: 1, borderTopColor: colors.border },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    width: 84,
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    lineHeight: 22,
  },
  rowValue: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSize.body,
    color: colors.text,
    lineHeight: 22,
  },
  rowNum: { fontFamily: fonts.num, fontVariant: ["tabular-nums"] },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
