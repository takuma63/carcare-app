# カーケアセンター 公式アプリ

Expo (React Native) 製。仕様は上位フォルダの `SPEC.md` / `IMPLEMENTATION_PLAN.md` を参照。

## 開発の始め方

```bash
npm install --legacy-peer-deps
npx expo start            # 同一Wi-Fi内ならこれでOK
npx expo start --tunnel   # 会社Wi-Fi等で端末に繋がらない場合
```

実機の Expo Go（対応SDKは Expo Go の設定画面で確認。現在SDK 54）で開く。

## 決済（Stripe）の設定

### 開発（テストモード）

1. https://dashboard.stripe.com で無料アカウントを作成
2. テストAPIキーを取得（ダッシュボード › 開発者 › APIキー）
   - **シークレットキー（sk_test_...）** → Netlify の環境変数 `STRIPE_SECRET_KEY` に設定
   - **公開可能キー（pk_test_...）** → このリポジトリの `app.json` › `extra.STRIPE_PUBLISHABLE_KEY` に設定
3. Webhook（任意・記録の補強用）：ダッシュボード › 開発者 › Webhook で
   `https://carcare-reservation.netlify.app/.netlify/functions/stripe-webhook` を登録し、
   イベント `payment_intent.succeeded` を選択。表示される `whsec_...` を
   Netlify の `STRIPE_WEBHOOK_SECRET` に設定
4. テストカード：`4242 4242 4242 4242`（有効期限は未来の任意日付・CVCは任意の3桁）

`STRIPE_PUBLISHABLE_KEY` が空の間は、アプリの決済方法選択で「今すぐ決済」が
非活性（近日対応表示）になり、店頭払いのみで動作する。

### 本番公開時

- Stripe本番アカウントの有効化（会社情報・**入金先の銀行口座**の登録と審査）
- 本番キー（sk_live / pk_live）への差し替え＋Webhookの本番URL登録
- **Apple Pay**: Apple Developer で Merchant ID `merchant.jp.co.carcarecenter.app` を作成
  → Stripeダッシュボード › 設定 › Apple Pay に証明書を登録
  → `app.json` の `ios.entitlements` に `com.apple.developer.in-app-payments` を追加
  （実機検証は EAS ビルドが必要。Expo Go では Apple Pay は動かないがカード決済は動く）
- **Google Pay**: Stripeダッシュボードで有効化のみ（追加実装不要）

## プッシュ通知の検証

Expo Go ではプッシュトークンが取得できないため、実受信の確認は
EAS development build（Apple Developer Program 契約後）で行う。
