/* ============================================================
   ShopMap.tsx  ―  店舗の場所（地図つき）
   ------------------------------------------------------------
   2026-10-02 社長要望「店舗を選ぶ画面にGoogleマップを埋め込みたい」。
   ------------------------------------------------------------
   ★ 地図はAPIキーの要らない output=embed をWebViewで表示する。
     react-native-maps を使うとiOSではAppleマップになってしまうため、
     Web予約・公式サイトと見え方を揃える意味でもこちらを採る。
   ★ 埋め込みURLをWebViewで直接開いてはいけない（2026-10-23 実機で発覚）。
     Google側が「The Google Maps Embed API must be used in an iframe.」と
     返して地図が出ない。iframeを1枚だけ置いたHTMLを読ませる。
   ★ PCでの確認用（npx expo start --web）は ShopMap.web.tsx が使われる。
   ★ 店舗はどこも商業施設の駐車場内にある。地図だけでは入口が分からないので
     access（階・棟）を店舗カード側に出している（二重に出さない）。
============================================================ */

import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { findShop, shopMapEmbedUrl, shopMapLinkUrl } from "@/lib/shops";
import { colors, fonts, fontSize, radius, spacing } from "@/theme";

/* 埋め込み地図を入れるだけのHTML。iframeの中でないとGoogleが描画しない。 */
function mapHtml(src: string): string {
  return `<!doctype html><html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#f5f5f5}
iframe{display:block;border:0;width:100%;height:100%}</style>
</head><body>
<iframe src="${src}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
  allowfullscreen></iframe>
</body></html>`;
}

/* mapOnly：地図だけを出す（店舗ページ用。住所・電話・経路はページ側で大きく出すため） */
export function ShopMap({ shopName, mapOnly = false }: { shopName: string | null; mapOnly?: boolean }) {
  const shop = findShop(shopName);
  if (!shop) return null;

  const openMaps = () => {
    const url = shopMapLinkUrl(shop.name);
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={mapOnly ? styles.bare : styles.box}>
      <View style={styles.map}>
        <WebView
          source={{ html: mapHtml(shopMapEmbedUrl(shop.name)), baseUrl: "https://www.google.com" }}
          style={styles.webview}
          scrollEnabled={false}
          originWhitelist={["https://*"]}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>地図を読み込んでいます…</Text>
            </View>
          )}
        />
      </View>

      {mapOnly ? null : (
      <>
      <Text style={styles.address}>
        {shop.zip} {shop.address}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={openMaps}>
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
  map: {
    height: 200,
    borderRadius: radius,
    overflow: "hidden",
    backgroundColor: colors.border,
  },
  webview: { flex: 1, backgroundColor: colors.border },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  loadingText: { fontFamily: fonts.sans, fontSize: fontSize.caption, color: colors.textLight },
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
