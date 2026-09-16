/* ============================================================
   stripe.ts  ―  Stripe（実機用）
   ------------------------------------------------------------
   Web では stripe.web.ts が使われる（Metro が拡張子で自動的に選ぶ）。
   @stripe/stripe-react-native は Web 非対応で、直接 import すると
   Web ビルド（PCでの画面確認用）が丸ごと失敗するため分けている。
============================================================ */

export { StripeProvider, useStripe } from "@stripe/stripe-react-native";
