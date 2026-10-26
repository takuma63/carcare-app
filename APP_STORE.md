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

## プロモーションテキスト（170文字以内・審査なしでいつでも変えられる）

```
空き状況を見て、そのままご予約。回数券の残高やクーポン、作業の進み具合もアプリでいつでもご確認いただけます。
```

## 説明文

★ 2026-10-26 全面改訂。以前の版は「パスワードは不要です」「お車→メニュー→店舗の順」など、
  今のアプリと食い違う記述が残っていた（Entra移行でパスワード必須、予約は店舗を最初に選ぶ形に変更）。

```
カーケアセンター公式アプリ

横浜・東京に5店舗を構える、洗車・コーティング専門店「カーケアセンター」の公式アプリです。
ご予約から回数券の残高確認まで、アプリひとつでお使いいただけます。

■ 空き状況を見て、そのままご予約
店舗を選ぶと、一週間の空き状況を ○△× でご案内します。
ご希望の時間を選び、お車とメニューを選ぶだけでご予約いただけます。
各店の店長をご指名いただくこともできます（指名料がかかります）。

■ 車種を入れるだけで、AIがサイズを判定
メーカー名と車種を入力すると、AIがお車のサイズ（カテゴリー）を判定し、それに合わせた料金を表示します。
車内除菌・ホイールコーティング・レザーコーティングなどのオプションも、写真を見てお選びいただけます。

■ ご予約と作業の進み具合をホームで確認
次のご予約をホームに表示します。作業中・完了の状況もアプリでわかり、作業が終わると通知でお知らせします。
店舗までの経路も、ご予約の画面からそのまま調べられます。

■ 回数券の残高をいつでも確認
お手持ちの回数券の残高と、ご利用の履歴をご確認いただけます。
ご予約時のお支払い方法に、回数券をお選びいただくこともできます。

■ 来店スタンプ・クーポン
ご来店のたびにスタンプが貯まり、規定の回数で特典クーポンをお届けします。
会員さま限定のクーポンは、ご予約の際にお選びいただけます。

■ お知らせ
営業のご案内や、メンテナンスの時期のお知らせなどを、プッシュ通知でお届けします。

■ 店舗
・横浜ランドマークタワー店
・そごう横浜店
・東戸塚オーロラシティ店
・六本木ヒルズ店
・銀座店
各店の地図と、駐車場の入口の目印をアプリでご確認いただけます。

※ コーティングは、お車の状態を確認したうえで日程を調整するため、お電話でご予約を承っております。
※ ご利用には会員登録（お名前・メールアドレス・電話番号・パスワード）が必要です。
```

## キーワード（100文字以内・カンマ区切り）

```
洗車,コーティング,予約,車,洗車予約,手洗い洗車,ガラスコーティング,車内クリーニング,横浜,みなとみらい,東戸塚,六本木,銀座,回数券
```

アプリ名（カーケアセンター）の語は名前だけで検索に当たるので、キーワードには入れない。

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
- Home: upcoming booking with work progress, registered vehicles,
  prepaid balance, visit stamps, store list (map, entrance, call)
- Booking flow (4 steps): store and date/time (weekly availability),
  vehicle size, menu, confirmation
- Announcements, coupons, prepaid balance history, visit history
- Settings: profile, notifications, account deletion

ABOUT CREATING A BOOKING
Bookings made in the app are written to the live store system.
You may create one to verify the flow; we will delete it afterwards.
There is no payment step in the app. All payments are made in store
(cash, card, e-money, or the store's prepaid balance). The prepaid balance
is sold only at the stores for car wash services performed in person,
so no in-app purchase is involved.

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

### 提出済み（2026-10-22）

| 項目 | 内容 |
|---|---|
| ビルド | 1.0.0 (8) |
| グループ | 公開テスト（外部・公開リンク有効） |
| **公開リンク** | https://testflight.apple.com/join/HjH3PUYU |
| 状態 | WAITING_FOR_REVIEW（審査待ち） |
| 連絡先 | 三宅 拓磨 / kanri_system@carcare-center.co.jp / +81-6-6267-8288 |
| デモアカウント | `appreview@carcarecenterapp.onmicrosoft.com`（パスワードはASCに保管） |

★ 公開リンクは**審査が通るまで開けない**。通ればこのURLで誰でも入れる。

★ App Store Connect API を使って提出した。鍵は作業用の一時領域に置いてあり、
  リポジトリには入れていない。**使い終わったら失効（Revoke）させること。**
  - Key ID: `2AR4296XNJ` ／ Issuer ID: `5dfb8b13-2078-4d46-b1f7-4182c601b1a6`
  - `~/Downloads/AuthKey_2AR4296XNJ.p8` にも残っている。削除しておく

---

## 手順（参考）


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

★ 2026-10-26 作り直し。`store/screenshots/` の8枚（1320×2868 / iPhone 6.9インチ）。
  6.9インチを入れておけば、小さい画面向けはApple側で縮小して使われる。
  作り方は `store/compose.cjs` の冒頭。画面はデモ用のお客様（山田 太郎 様）で撮っている。

| 順 | ファイル | 見出し |
|---|---|---|
| 1 | appstore-01.png | ご予約も、回数券も、ひと目で。 |
| 2 | appstore-02.png | 空き状況を見て、そのままご予約。 |
| 3 | appstore-03.png | 車種を入れるだけで、AIがサイズを判定。 |
| 4 | appstore-04.png | お車に合わせた料金が、すぐにわかる。 |
| 5 | appstore-05.png | オプションも、写真を見て選べる。 |
| 6 | appstore-06.png | 会員さまだけのクーポンとスタンプ。 |
| 7 | appstore-07.png | 回数券の残高を、いつでも確認。 |
| 8 | appstore-08.png | お店の場所と入口を、地図でご案内。 |

検索結果に出るのは最初の3枚なので、ホーム・空き状況・AI判定（目玉機能）を前に置いた。
App Store に載せられるのは1サイズにつき10枚まで。
AI判定の画面は、本番の判定（BMW 3シリーズ → カテゴリー2）をそのまま撮っている。

**iPad のスクリーンショットは不要**（`ios.supportsTablet: false` のため）。

---

## 輸出コンプライアンス

`ITSAppUsesNonExemptEncryption: false` を app.json に設定済み。
通信のHTTPS以外に暗号化を使用していないため、提出のたびの質問は表示されない。
