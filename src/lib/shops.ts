/* ============================================================
   shops.ts  ―  店舗マスタ（アプリ側）
   ------------------------------------------------------------
   大元は予約システムの carcare-reservation/shop-data.js。
   アプリは別リポジトリなので同じ内容をここに持つ。
   ★ 住所・電話・目印を直すときは shop-data.js と必ず両方直すこと。
   ------------------------------------------------------------
   access（目印）は、店舗がどこも商業施設の駐車場内にあるため、
   地図だけでは入口が分からないという理由で入れている。
============================================================ */

export type Shop = {
  name: string;
  zip: string;
  address: string;
  tel: string;
  access: string;
  mapQuery: string;   // Googleマップで引く検索語（店舗の登録名）
  /* 「他店の空き案内」で使うエリア区分。横浜と東京は40〜60分離れているため、
     案内は同じエリア内に限る。areaFar は同じエリアでも少し遠い店。
     ★ Web予約の shop-data.js と同じ値にすること（片方だけ変えない）。 */
  area: "yokohama" | "tokyo";
  areaFar?: boolean;
};

export const SHOPS: Shop[] = [
  {
    name: "横浜ランドマークタワー店",
    zip: "〒220-8190",
    address: "神奈川県横浜市西区みなとみらい2-2-1 横浜ランドマークタワー駐車場B1F",
    tel: "045-225-0118",
    access: "ランドマークタワーの駐車場B1F。タワー駐車場入口から入って地下1階",
    mapQuery: "カーケアセンター 横浜ランドマークタワー店",
    area: "yokohama",
  },
  {
    name: "そごう横浜店",
    zip: "〒221-0056",
    address: "神奈川県横浜市神奈川区金港町1-1 そごうパーキング館3F",
    tel: "045-465-5599",
    access: "そごうパーキング館3F。横浜駅東口のそごう専用駐車場",
    mapQuery: "カーケアセンター そごう横浜店",
    area: "yokohama",
  },
  {
    name: "東戸塚オーロラシティ店",
    zip: "〒244-8530",
    address: "神奈川県横浜市戸塚区品濃町537-1 西武館オーロラモール P2駐車場",
    tel: "045-820-2855",
    access: "西武館オーロラモールのP2駐車場",
    mapQuery: "カーケアセンター 東戸塚オーロラシティ店",
    area: "yokohama",
    areaFar: true,
  },
  {
    name: "六本木ヒルズ店",
    zip: "〒106-6190",
    address: "東京都港区六本木6-10-1 六本木ヒルズP2駐車場B3F",
    tel: "03-5772-0055",
    access: "六本木ヒルズP2駐車場の地下3階",
    mapQuery: "カーケアセンター 六本木ヒルズ店",
    area: "tokyo",
  },
  {
    name: "銀座店",
    zip: "〒104-0061",
    address: "東京都中央区銀座8丁目3番先 西銀座駐車場地下2F",
    tel: "03-3571-3581",
    access: "西銀座駐車場の地下2F。外堀通り沿いの入口から",
    mapQuery: "カーケアセンター 銀座店",
    area: "tokyo",
  },
];

export const SHOP_NAMES = SHOPS.map((s) => s.name);

export function findShop(name: string | null | undefined): Shop | null {
  if (!name) return null;
  return SHOPS.find((s) => s.name === name) ?? null;
}

/* 画面に埋め込む地図のURL。APIキーの要らない output=embed 形式。
   公式サイトの店舗ページと同じ方式に揃えてある。 */
/* 同じエリアの他店（＝案内してよい近隣店）。遠い店は後ろに回す。
   Web予約の neighborShops と同じ考え方。 */
export function neighborShops(shopName: string | null | undefined): Shop[] {
  const base = findShop(shopName);
  if (!base) return [];
  return SHOPS
    .filter((x) => x.area === base.area && x.name !== base.name)
    .sort((a, b) => (a.areaFar ? 1 : 0) - (b.areaFar ? 1 : 0));
}

export function shopMapEmbedUrl(name: string): string {
  const s = findShop(name);
  return s ? `https://maps.google.com/maps?q=${encodeURIComponent(s.mapQuery)}&z=16&output=embed` : "";
}

/* Googleマップアプリを開くURL（経路案内に使う） */
export function shopMapLinkUrl(name: string): string {
  const s = findShop(name);
  return s ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.mapQuery)}` : "";
}
