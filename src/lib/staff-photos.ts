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

// nomination-data.js の staff[].id と対応（仮枠4名分。実写真に差し替える）
const STAFF_PHOTOS: Record<string, ImageSourcePropType> = {
  staff1: require("@/assets/staff/staff1.jpg"),
  staff2: require("@/assets/staff/staff2.jpg"),
  staff3: require("@/assets/staff/staff3.jpg"),
  staff4: require("@/assets/staff/staff4.jpg"),
};

/** スタッフidに対応する顔写真を返す。未登録ならプレースホルダー。 */
export function staffPhoto(staffId: string | undefined | null): ImageSourcePropType {
  if (staffId && STAFF_PHOTOS[staffId]) return STAFF_PHOTOS[staffId];
  return PLACEHOLDER;
}
