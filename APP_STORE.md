# App Store 提出用の情報

App Store Connect に入力する内容をまとめたもの。
初回提出：2026-10-20

---

## 基本

| 項目 | 内容 |
|---|---|
| アプリ名 | カーケアセンター |
| サブタイトル | 洗車・コーティングのご予約 |
| Bundle ID | `jp.co.carcarecenter.app` |
| バージョン | 1.0.0 |
| プライマリカテゴリ | ライフスタイル |
| セカンダリカテゴリ | ユーティリティ |
| 年齢制限 | 4+ |
| 価格 | 無料 |
| 提供国 | 日本のみ |

**提供国を日本のみにする理由**：店舗が国内5店舗のみで、日本語のみの対応のため。
海外で配信しても使えず、審査で「対象地域で利用できない」と見なされる余地を減らす。

---

## 説明文

```
カーケアセンター公式アプリ

洗車・コーティング専門店「カーケアセンター」のご予約アプリです。
横浜・東京の5店舗で、ご予約からご利用状況の確認までご利用いただけます。

■ かんたんご予約
お車・メニュー・店舗・日時を選ぶだけ。空いている時間だけが表示されるので、
電話でのやりとりなしにご予約いただけます。
メニューがお決まりでない場合は、ご予約枠だけお押さえいただくこともできます。

■ 回数券の残高をいつでも確認
お手持ちの回数券の残高と、ご利用の履歴をアプリで確認できます。
ご来店時は、店舗で残高からお支払いいただけます。

■ 来店スタンプ・クーポン
ご来店のたびにスタンプが貯まり、規定回数で特典クーポンをお届けします。
お持ちのクーポンは、ご予約時にお選びいただけます。

■ ご予約の確認
現在のご予約内容、これまでのご利用履歴をいつでもご確認いただけます。
作業が完了したら、通知でお知らせします。

■ 店舗
・横浜ランドマークタワー店
・そごう横浜店
・東戸塚オーロラシティ店
・六本木ヒルズ店
・銀座店

※ コーティングのご予約はお電話で承っております。
※ ご利用には会員登録（お名前とご連絡先）が必要です。パスワードは不要です。
```

## キーワード（100文字以内・カンマ区切り）

```
洗車,コーティング,カーケア,予約,車,カーコーティング,洗車予約,横浜,六本木,銀座,回数券
```

## サポートURL

```
https://carcare-center.co.jp/
```

## プライバシーポリシーURL

```
https://reserve.carcare-center.co.jp/privacy-app.html
```

---

## App Privacy（データ収集の申告）

**「このアプリはデータを収集します」を選ぶ。** 以下を申告する。

| データ種別 | 用途 | 個人に紐づくか | トラッキング |
|---|---|---|---|
| 氏名 | アプリの機能 | **はい** | いいえ |
| メールアドレス | アプリの機能 | **はい** | いいえ |
| 電話番号 | アプリの機能 | **はい** | いいえ |
| 購入履歴（ご利用・回数券） | アプリの機能 | **はい** | いいえ |
| ユーザーID | アプリの機能 | **はい** | いいえ |
| 製品操作（利用状況） | アプリの機能・分析 | **はい** | いいえ |
| 診断データ（クラッシュ等） | アプリの機能 | いいえ | いいえ |

**トラッキングは「していない」。** 広告・行動ターゲティングのための情報取得・第三者提供は
一切行っていない（App Tracking Transparency の許可ダイアログも不要）。

収集していないもの：位置情報、連絡先、写真、カメラ、マイク、健康、金融情報、
検索履歴、閲覧履歴、センサー情報。

---

## 審査担当者向けのメモ（App Review Information → Notes）

★ 2026-10-22 全面改訂。
  以前の版は「パスワードは使用しません」と書いてあったが、
  Microsoft Entra External ID へ移行してパスワード必須になったため、
  そのまま出すと審査で事実と食い違う。

```
This app is the official booking app for CAR CARE CENTER, a car wash and
coating service with five locations in Japan (Yokohama, Tokyo).
The app is in Japanese only.

SIGN-IN IS REQUIRED
Please use the demo account provided in the fields above.
Accounts are managed by Microsoft Entra External ID. Sign-in requires an
email address and a password. New sign-ups also require a verification
code sent by email, so please use the demo account rather than creating
a new one.

WHAT YOU CAN DO WITH THE DEMO ACCOUNT
- Home: booking status, registered vehicles, store list
- Booking flow (4 steps): vehicle category, menu, store and date/time,
  confirmation
- Announcements, coupons, visit history
- Settings: profile, notifications, account deletion

ABOUT CREATING A BOOKING
Bookings made in the app are written to the live store system.
You may create one to verify the flow; we will delete it afterwards.
There is no payment step in the app. All payments are made in store.

ACCOUNT DELETION
Settings tab -> "アカウントを削除" (Delete account).
This satisfies App Store Review Guideline 5.1.1(v).

ABOUT THE COATING MENU
Coating work requires an in-person consultation, so the app only shows
the menu contents; those bookings are taken by phone.
```

### 審査担当者用のデモアカウント

| 項目 | 値 |
|---|---|
| Sign-in required | ✔ チェックを入れる |
| User Name | `appreview@carcarecenterapp.onmicrosoft.com` |
| Password | **この文書には書かない**（下記） |

★ パスワードをこのファイルに書かないこと。
  GitHubに上がるため。App Store Connect に入力したら、そこが保管場所になる。
  紛失したときは Microsoft Entra 管理センター（外部テナント
  carcarecenterapp）でリセットするか、Graph API で再設定する。

デモアカウントの素性（2026-10-22 作成）：
- Entra のオブジェクトID：`b6826efb-ae03-4fe0-b905-c619b1607f51`
- 当社側の顧客ID：`035fa5e9…`（お名前「App Review」）
- 実在のお客様ではない。来店履歴・回数券残高は持たせていない
- **公開後に削除する**（公開前チェックの項目に入れてある）

---

## TestFlight の外部公開（Beta App Review）

内部テストは審査なしで配信できるが、**外部公開には Beta App Review が要る**
（通常1営業日ほど）。App Store Connect での手順：

1. **TestFlight** タブ →「テスター とグループ」→ **＋** で外部グループを作る
   （名前の例：`公開テスト`）
2. 作ったグループに、処理の終わったビルドを **＋** で追加する
3. 追加した時点で「テスト情報」の入力を求められる。上の Notes と
   デモアカウントを入れる
4. 連絡先（氏名・メール・電話）を入れる。審査で連絡が要るときに使われる
5. **「何をテストすればよいか」**（What to Test）に、そのビルドで見てほしい点を書く
6. 提出すると審査に入る。通ると「公開リンク」を有効にでき、
   誰でもそのURLからインストールできるようになる

★ 公開リンクは **誰でもインストールできる**（最大10,000人）。
  社長や店舗の方に配るだけなら、メールで招待する形でも足りる。

### このビルド（1.0.0 / 8）の「何をテストすればよいか」

```
今回から、アイコンと起動画面が入りました。

ご確認いただきたいところ
・ホーム画面：下のタブが「ホーム／お知らせ／クーポン／設定」になっています
・ホーム画面：ご予約の当日、作業の進み具合（ご予約→作業中→完了）が出ます
・車両登録：ホームの「車両登録」から、メーカー・車種・ボディカラー・
　ナンバーを登録できます。ご来店の記録から選ぶこともできます
・ご予約：店舗を選んだ直後に「指名しない／スタッフを指名する」を選びます。
　指名する場合は、そのスタッフの出勤日だけが日付に出ます
・会員登録：4つの段階に分かれました（お名前／ログイン情報／お客様のこと／
　確認コード）
・お知らせ：管理画面から配信したお知らせが届きます

まだ入っていないもの
・英語対応（次のビルドで入ります）
```

### 必要な入力項目のまとめ（App Store Connect）

| 欄 | 入れるもの |
|---|---|
| ベータ版App説明 | 下の「説明文」の短い方を流用 |
| フィードバックメールアドレス | 発注者のメールアドレス |
| プライバシーポリシーURL | `https://reserve.carcare-center.co.jp/privacy-app.html` |
| Sign-in required | ✔ |
| User Name / Password | 上のデモアカウント |
| Review Notes | 上の英文 |
| 連絡先（氏名・メール・電話） | 発注者 |

---

## スクリーンショット

`~/Desktop/carcare-app-screenshots/` の9枚から使用（1170×2532 / iPhone 6.5インチ相当）。

提出に使う順番：
1. ホーム（残高・クーポン・スタンプ）
2. 回数券の残高
3. クーポンとスタンプ
4. 予約2 メニュー
5. 予約3 店舗と日時
6. 予約履歴

**iPad のスクリーンショットは不要**（`ios.supportsTablet: false` のため）。

---

## 輸出コンプライアンス

`ITSAppUsesNonExemptEncryption: false` を app.json に設定済み。
通信のHTTPS以外に暗号化を使用していないため、提出のたびの質問は表示されない。
