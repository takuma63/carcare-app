/* ============================================================
   App Store のスクリーンショットを作る（1320×2868 / iPhone 6.9インチ）
   ------------------------------------------------------------
   raw/ のアプリ画面（430×932 を3倍で撮影）に、見出しを付けて frame.html で組む。
   使い方：  node store/compose.cjs   （puppeteer-core と Google Chrome が要る）
   画面を撮り直したら raw/ を差し替えて、これを実行し直す。
   ★ 画面はデモ用のお客様（山田 太郎 様）とデモの内容で撮る。
     実在のお客様の名前・予約・残高を写さないこと。
============================================================ */
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");
const D = __dirname;
const SLIDES = [
  ["01", "Home", "ご予約も、回数券も、<br>ひと目で。", "次のご予約・回数券の残高・来店スタンプをホームにまとめました", "s1-home.png"],
  ["02", "Reservation", "空き状況を見て、<br>そのままご予約。", "5店舗の空きを ○△× でご案内。お電話なしでご予約いただけます", "s2-calendar.png"],
  ["03", "AI Size Check", "車種を入れるだけで、<br>AIがサイズを判定。", "メーカー名と車種から、お車に合ったカテゴリーをご案内します", "s2c-ai.png"],
  ["04", "Menu", "お車に合わせた料金が、<br>すぐにわかる。", "判定したサイズに合わせて、メニューの料金を表示します", "s3-menu.png"],
  ["05", "Option", "オプションも、<br>写真を見て選べる。", "車内除菌・ホイール・レザーコーティングまで", "s3b-options.png"],
  ["06", "Coupon", "会員さまだけの<br>クーポンとスタンプ。", "ご来店ごとにスタンプが貯まり、特典クーポンをお届けします", "s4-coupons.png"],
  ["07", "Prepaid", "回数券の残高を、<br>いつでも確認。", "ご利用の履歴もアプリでご覧いただけます", "s5-prepaid.png"],
  ["08", "Stores", "お店の場所と入口を、<br>地図でご案内。", "駐車場の入口の目印も。そのまま経路を調べられます", "s6-shop.png"],
];
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--no-sandbox", "--allow-file-access-from-files"] });
  const p = await b.newPage();
  await p.setViewport({ width: 440, height: 956, deviceScaleFactor: 3 });
  for (const [n, eb, h, s, img] of SLIDES) {
    const url = "file://" + D + "/frame.html?" + new URLSearchParams({ eb, h, s, img: "raw/" + img }).toString();
    await p.goto(url); await new Promise(r => setTimeout(r, 700));
    await p.screenshot({ path: D + "/screenshots/appstore-" + n + ".png" });
    console.log("作成:", "appstore-" + n + ".png");
  }
  await b.close();
})();
