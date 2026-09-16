/* ============================================================
   stripe.web.ts  ―  Stripe（Web用のダミー）
   ------------------------------------------------------------
   Web は開発中の画面確認専用。決済は実機でのみ動作する。
   ここではネイティブモジュールを一切読み込まない。
============================================================ */

import type React from "react";

const notAvailable = {
  error: { message: "Web版では決済をご利用いただけません（実機でご確認ください）" },
};

export function StripeProvider(props: { children?: React.ReactNode }) {
  return props.children as React.ReactElement;
}

export function useStripe() {
  return {
    async initPaymentSheet() { return notAvailable; },
    async presentPaymentSheet() { return notAvailable; },
  };
}
