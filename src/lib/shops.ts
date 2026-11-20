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

import { isEn } from "./i18n";

export type Shop = {
  name: string;
  /* 英語表示用（2026-11-20）。予約で送る店舗名は name（日本語）のまま */
  nameEn: string;
  addressEn: string;
  accessEn: string;
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
    nameEn: "Yokohama Landmark Tower",
    addressEn: "Landmark Tower Parking B1F, 2-2-1 Minatomirai, Nishi-ku, Yokohama, Kanagawa",
    accessEn: "Landmark Tower parking, B1F. Enter from the tower parking entrance and go down to B1.",
    zip: "〒220-8190",
    address: "神奈川県横浜市西区みなとみらい2-2-1 横浜ランドマークタワー駐車場B1F",
    tel: "045-225-0118",
    access: "ランドマークタワーの駐車場B1F。タワー駐車場入口から入って地下1階",
    mapQuery: "カーケアセンター 横浜ランドマークタワー店",
    area: "yokohama",
  },
  {
    name: "そごう横浜店",
    nameEn: "Sogo Yokohama",
    addressEn: "Sogo Parking Building 3F, 1-1 Kinkocho, Kanagawa-ku, Yokohama, Kanagawa",
    accessEn: "Sogo Parking Building, 3F. Sogo's own car park at the east exit of Yokohama Station.",
    zip: "〒221-0056",
    address: "神奈川県横浜市神奈川区金港町1-1 そごうパーキング館3F",
    tel: "045-465-5599",
    access: "そごうパーキング館3F。横浜駅東口のそごう専用駐車場",
    mapQuery: "カーケアセンター そごう横浜店",
    area: "yokohama",
  },
  {
    name: "東戸塚オーロラシティ店",
    nameEn: "Higashi-Totsuka Aurora City",
    addressEn: "Seibu-kan Aurora Mall P2 Parking, 537-1 Shinanocho, Totsuka-ku, Yokohama, Kanagawa",
    accessEn: "Seibu-kan Aurora Mall, P2 parking.",
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
    nameEn: "Roppongi Hills",
    addressEn: "Roppongi Hills P2 Parking B3F, 6-10-1 Roppongi, Minato-ku, Tokyo",
    accessEn: "Roppongi Hills P2 parking, B3F.",
    zip: "〒106-6190",
    address: "東京都港区六本木6-10-1 六本木ヒルズP2駐車場B3F",
    tel: "03-5772-0055",
    access: "六本木ヒルズP2駐車場の地下3階",
    mapQuery: "カーケアセンター 六本木ヒルズ店",
    area: "tokyo",
  },
  {
    name: "銀座店",
    nameEn: "Ginza",
    addressEn: "Nishi-Ginza Parking B2F, 8-3 Ginza, Chuo-ku, Tokyo",
    accessEn: "Nishi-Ginza Parking, B2F. Enter from the Sotobori-dori side.",
    zip: "〒104-0061",
    address: "東京都中央区銀座8丁目3番先 西銀座駐車場地下2F",
    tel: "03-3571-3581",
    access: "西銀座駐車場の地下2F。外堀通り沿いの入口から",
    mapQuery: "カーケアセンター 銀座店",
    area: "tokyo",
  },
];

export const SHOP_NAMES = SHOPS.map((s) => s.name);

/* ---------- アプリで予約できる店舗（2026-11-11 発注者の指示） ----------
   東京エリアから本格運用を始め、横浜エリアは東京で安定してから使う。
   それまで予約の店舗選びには六本木・銀座だけを出す（ホームの「店舗一覧」は全店舗のまま）。
   ★ Web予約の shop-data.js の ONLINE_BOOKING_SHOPS と同じ値にすること。
     横浜エリアを始めるときは両方とも null に戻す（null＝全店舗）。 */
// ★ 2026-11-16 横浜エリアも新システムで始めた → null（全店舗）
export const ONLINE_BOOKING_SHOPS: string[] | null = null;
export function isOnlineBookingShop(name: string | null | undefined): boolean {
  if (!findShop(name)) return false;
  return !ONLINE_BOOKING_SHOPS || ONLINE_BOOKING_SHOPS.includes(name as string);
}
export const ONLINE_SHOP_NAMES = SHOP_NAMES.filter((n) => isOnlineBookingShop(n));

/* 画面に出す店舗名・住所・目印。英語モードなら英語（2026-11-20）。
   知らない名前（そごう大宮店など管理画面だけの店舗）はそのまま返す */
export function shopLabel(name: string | null | undefined): string {
  if (!name) return "";
  const s = findShop(name);
  return s && isEn() ? s.nameEn : name;
}
export function shopAddress(s: Shop): string {
  return isEn() ? s.addressEn : s.address;
}
export function shopAccess(s: Shop): string {
  return isEn() ? s.accessEn : s.access;
}

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
    .filter((x) => x.area === base.area && x.name !== base.name && isOnlineBookingShop(x.name))
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
