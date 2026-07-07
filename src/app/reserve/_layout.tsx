/* ============================================================
   reserve/_layout.tsx  ―  予約フロー（S3〜S7）のスタック
   ------------------------------------------------------------
   ReservationProvider でスタック全体を包み、5画面間で
   車種・メニュー選択・店舗日時の状態を保持する。
============================================================ */

import { Stack } from "expo-router";
import { ReservationProvider } from "@/lib/reservation-context";

export default function ReserveLayout() {
  return (
    <ReservationProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ReservationProvider>
  );
}
