# 事前決済（Stripe）を v1.0 では止めている理由

2026-10-20

## 状況

`app.json` の `extra.STRIPE_PUBLISHABLE_KEY` を**外した**。
これにより `reserve/confirm.tsx` の `STRIPE_ENABLED` が false になり、
「今すぐ決済」は押せない状態（「近日対応」の表示）になる。
`_layout.tsx` も `StripeProvider` を付けずにアプリを起動する。

**コードは消していない。** 鍵を戻せば、そのまま決済が有効になる。

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

なお、洗車・コーティングは**実際に提供される役務**なので、
Apple の App内課金（手数料30%）の対象ではない。
将来カード決済を入れる場合も Stripe で問題ない。

## 再開するとき

1. Stripe の本番公開鍵（`pk_live_...`）を `app.json` の
   `extra.STRIPE_PUBLISHABLE_KEY` に入れる
2. Azure の環境変数に Stripe のシークレットキーを設定する
   （`netlify/functions/payment-intent.js` が使う）
3. Apple Pay も使うなら、Apple Developer で Merchant ID を登録し、
   `@stripe/stripe-react-native` の設定プラグインを `plugins` に足す

外したテスト鍵（公開しても差し支えのない種類のもの）：

```
pk_test_51TsYXDCPRIas4KkohAm8FrbKXQiQECIdh7G9dsBQj5B0ws1w2M0oKEuicgakhjWWhAmOGcKlX5eSof7aapwWeqpr00XQGCtpeR
```
