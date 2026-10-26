/* ============================================================
   ShopMap.web.tsx  ―  ShopMap のPC確認用（npx expo start --web）
   ------------------------------------------------------------
   react-native-webview はWebで動かないため、Webでは素の iframe を使う。
   stripe.ts / stripe.web.ts と同じ分け方。見た目は ShopMap.tsx に揃える。
============================================================ */

import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { findShop, shopMapEmbedUrl, shopMapLinkUrl } from "@/lib/shops";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";

/* mapOnly：地図だけを出す（店舗ページ用。住所・電話・経路はページ側で大きく出すため） */
export function ShopMap({ shopName, mapOnly = false }: { shopName: string | null; mapOnly?: boolean }) {
  const shop = findShop(shopName);
  if (!shop) return null;

  return (
    <View style={mapOnly ? styles.bare : styles.box}>
      <View style={styles.map}>
        {React.createElement("iframe", {
          src: shopMapEmbedUrl(shop.name),
          title: `${shop.name}の地図`,
          loading: "lazy",
          style: { width: "100%", height: "100%", border: 0 },
        })}
      </View>

      {mapOnly ? null : (
      <>
      <Text style={styles.address}>
        {shop.zip} {shop.address}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.action}
          onPress={() => Linking.openURL(shopMapLinkUrl(shop.name)).catch(() => {})}
        >
          <Feather name="map-pin" size={15} color={colors.goldDeep} />
          <Text style={styles.actionText}>経路を調べる</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.action}
          onPress={() => Linking.openURL(`tel:${shop.tel.replace(/-/g, "")}`).catch(() => {})}
        >
          <Feather name="phone" size={15} color={colors.goldDeep} />
          <Text style={styles.actionText}>{shop.tel}</Text>
        </TouchableOpacity>
      </View>
      </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bare: {},
  box: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bgSub,
    borderRadius: radius,
  },
  map: { height: 200, borderRadius: radius, overflow: "hidden", backgroundColor: colors.border },
  address: {
    fontFamily: fonts.sans,
    fontSize: fontSize.caption,
    color: colors.textLight,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm },
  action: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  actionText: { fontFamily: fonts.sansMedium, fontSize: fontSize.caption, color: colors.goldDeep },
});
