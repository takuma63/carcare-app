# 事前決済（Stripe）を v1.0 では止めている理由

2026-10-20

## 状況（2026-10-21 更新）

**`@stripe/stripe-react-native` を依存から外した。**

- `app.json` の `extra.STRIPE_PUBLISHABLE_KEY` は未設定
- `src/lib/stripe.ts` は**何もしないダミー実装**に置き換えた
  （型は本物と同じにしてあるので、呼び出し側は無改修）
- `src/lib/stripe.web.ts` は削除（stripe.ts が全プラットフォーム共通になったため）
- `app.json` の `NSCameraUsageDescription` も削除（参照元が無くなったため）

**決済の画面のコードは消していない。** `reserve/confirm.tsx` の処理は
そのまま残っており、パッケージと鍵を戻せば動く。

## なぜ外したか

1. **入っていたのはテスト用の鍵だった**（`pk_test_...`）。
   このまま出すと、審査担当者が「今すぐ決済」を押したときに
   決済が通らず、App Store Review Guideline 2.1（App Completeness）で
   差し戻される可能性が高い。

2. **決済の導入自体がまだ保留**。カード決済の手数料・入金サイクル・
   返金の運用を発注者側で検討中で、11/1 の導入には間に合わない。

3. **Apple Pay を有効にすると審査が重くなる**。
   `merchantIdentifier: "merchant.jp.co.carcarecenter.app"` を使うには
   Apple Merchant ID の登録と証明書が別途必要になる。
   鍵を外せば `StripeProvider` 自体が付かないので、この手続きが要らない。

4. **カメラの用途説明を求められた**（2026-10-21・パッケージを外した直接の理由）。
   build 3 が `ITMS-90683: Missing purpose string in Info.plist` で
   処理を拒否された。アプリはカメラを使わないが、
   `@stripe/stripe-react-native` がカード番号のカメラ読み取り機能を含み、
   カメラAPIを参照しているため。Appleは「実際に使っていなくても
   用途説明は必須」としている。
   使う予定のない機能のために、お客様に見える権限説明を置くのは
   筋が通らないため、パッケージごと外した。

なお、洗車・コーティングは**実際に提供される役務**なので、
Apple の App内課金（手数料30%）の対象ではない。
将来カード決済を入れる場合も Stripe で問題ない。

## 再開するとき

1. パッケージを入れ直す
   ```
   npx expo install @stripe/stripe-react-native
   ```
2. `src/lib/stripe.ts` を本物に戻す（1行）
   ```ts
   export { StripeProvider, useStripe } from "@stripe/stripe-react-native";
   ```
   Web での画面確認も行うなら、`src/lib/stripe.web.ts` に
   今のダミー実装を置く（Stripeは Web 非対応のため）
3. `app.json` の `ios.infoPlist` に `NSCameraUsageDescription` を戻す
   （無いと `ITMS-90683` で処理を拒否される）
4. Stripe の本番公開鍵（`pk_live_...`）を `app.json` の
   `extra.STRIPE_PUBLISHABLE_KEY` に入れる
5. Azure の環境変数に Stripe のシークレットキーを設定する
   （`server/functions/payment-intent.js` が使う）
6. Apple Pay も使うなら、Apple Developer で Merchant ID を登録し、
   `@stripe/stripe-react-native` の設定プラグインを `plugins` に足す

サーバー側（`payment-intent.js` / `stripe-webhook.js`）は触っていない。
そのまま残してある。

外したテスト鍵（公開しても差し支えのない種類のもの）：

```
pk_test_51TsYXDCPRIas4KkohAm8FrbKXQiQECIdh7G9dsBQj5B0ws1w2M0oKEuicgakhjWWhAmOGcKlX5eSof7aapwWeqpr00XQGCtpeR
```
