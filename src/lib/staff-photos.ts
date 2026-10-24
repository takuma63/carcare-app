/* ============================================================
   staff-photos.ts  ―  指名スタッフの顔写真（バンドル画像のマップ）
   ------------------------------------------------------------
   React Native では require() の引数に変数を使えず、画像は事前に
   バンドルする必要がある。そのため「スタッフid → 画像」を静的に
   ここへ登録する（nomination-data.js の staff[].id と対応させる）。
   ------------------------------------------------------------
   ★ 写真の差し込み口：
     1) src/assets/staff/ に実際の顔写真（staff1.jpg 等）を置く
     2) 下の STAFF_PHOTOS に id→require を追加/差し替える
   未登録の id は自動でプレースホルダー（placeholder.jpg）になる。
============================================================ */

import type { ImageSourcePropType } from "react-native";

const PLACEHOLDER = require("@/assets/staff/placeholder.jpg");

/* nomination-data.js の staff[].id と対応（各店の店長）。
   写真をいただいた方からここに足す。未登録はプレースホルダーのまま。 */
const STAFF_PHOTOS: Record<string, ImageSourcePropType> = {
  matsuzawa: require("@/assets/staff/matsuzawa.jpg"),   // 六本木ヒルズ店
  nishikawa: require("@/assets/staff/nishikawa.jpg"),   // 東戸塚オーロラシティ店
  ishikawa: require("@/assets/staff/ishikawa.jpg"),     // 横浜ランドマークタワー店・そごう横浜店
  // sato:    銀座店（写真待ち。いただいたら上と同じ形で足す）
};

/** スタッフidに対応する顔写真を返す。未登録ならプレースホルダー。 */
export function staffPhoto(staffId: string | undefined | null): ImageSourcePropType {
  if (staffId && STAFF_PHOTOS[staffId]) return STAFF_PHOTOS[staffId];
  return PLACEHOLDER;
}
