/* ============================================================
   アプリアイコンを作る（輪郭を直線にしてから描き直す版）
   ------------------------------------------------------------
   元のロゴ（src/assets/logo.png）は写真から起こしたもので 248px しかなく、
   縁がギザギザで色にもムラがある。App Store のアイコンは 1024px で
   表示されるため、ただ拡大すると粗が出る。

   マークは8枚の羽が45°ずつ回った形なので、
     ① 8方向に重ねて平均を取る（羽1枚ぶんの形を8枚で均す）
     ② ぼかして 0.5 でしきい値を取り、輪郭を1本の線として取り出す
     ③ その輪郭を直線で近似する（＝手描きのガタつきを落とす）
     ④ 多角形として、ちょうど45°ずつ8枚描く
   という手順で、形は元のまま、輪郭だけをまっすぐにする。
   文字（CARCARECENTER）はアイコンの大きさでは読めないので入れない。
============================================================ */
const { PNG } = require("/Users/takuma/projects/carcare-app/app/node_modules/pngjs");
const fs = require("fs");

const SRC = "/Users/takuma/projects/carcare-app/app/src/assets/logo.png";
const MARK = { x: 266, y: 8, w: 248, h: 246 };
/* 「CARCARECENTER」の文字。罫線と「Membership Car Wash Lounge」は
   アイコンの大きさでは読めないので入れない（2026-10-24 発注者の要望で文字入りに）。 */
const WORD = { x: 66, y: 284, w: 650, h: 40 };
const INK = [0x1a, 0x1a, 0x1a];          // theme.ts の colors.text
const UP = 8;                            // 輪郭を取るときの拡大率
const EPS = 1.1;                         // 直線近似の許容ずれ（元画素）

const src = PNG.sync.read(fs.readFileSync(SRC));
const A = new Float64Array(MARK.w * MARK.h);
for (let y = 0; y < MARK.h; y++) for (let x = 0; x < MARK.w; x++) {
  A[y * MARK.w + x] = src.data[((y + MARK.y) * src.width + (x + MARK.x)) * 4 + 3] / 255;
}
let sx = 0, sy = 0, sw = 0;
for (let y = 0; y < MARK.h; y++) for (let x = 0; x < MARK.w; x++) {
  const a = A[y * MARK.w + x]; sx += x * a; sy += y * a; sw += a;
}
const CX = sx / sw, CY = sy / sw;

function sample(x, y) {
  if (x < 0 || y < 0 || x > MARK.w - 1 || y > MARK.h - 1) return 0;
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const g = (px, py) => (px < 0 || py < 0 || px >= MARK.w || py >= MARK.h) ? 0 : A[py * MARK.w + px];
  return g(x0,y0)*(1-fx)*(1-fy) + g(x0+1,y0)*fx*(1-fy) + g(x0,y0+1)*(1-fx)*fy + g(x0+1,y0+1)*fx*fy;
}

/* ① 8方向の平均 → ② ぼかして二値化（UP倍の解像度） */
const N = MARK.w * UP;
const avg = new Float64Array(N * N);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const px = (x + 0.5) / UP, py = (y + 0.5) / UP;
  const dx = px - CX, dy = py - CY;
  let s = 0;
  for (let i = 0; i < 8; i++) {
    const t = -i * Math.PI / 4;
    s += sample(CX + dx * Math.cos(t) - dy * Math.sin(t), CY + dx * Math.sin(t) + dy * Math.cos(t));
  }
  avg[y * N + x] = s / 8;
}
const r = Math.round(UP * 1.2);
const tmp = new Float64Array(N * N);
const blur1 = (inp, outp, horiz) => {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let s = 0, c = 0;
    for (let k = -r; k <= r; k++) {
      const xx = horiz ? x + k : x, yy = horiz ? y : y + k;
      if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
      s += inp[yy * N + xx]; c++;
    }
    outp[y * N + x] = s / c;
  }
};
blur1(avg, tmp, true); blur1(tmp, avg, false);
const bin = new Uint8Array(N * N);
for (let i = 0; i < N * N; i++) bin[i] = avg[i] >= 0.5 ? 1 : 0;

/* 羽を1枚取り出す（中心から見て上向きの羽） */
const lab = new Int32Array(N * N).fill(-1);
const comps = [];
for (let i = 0; i < N * N; i++) {
  if (!bin[i] || lab[i] >= 0) continue;
  const id = comps.length, q = [i]; lab[i] = id; let c = 0, ax = 0, ay = 0;
  while (q.length) {
    const p = q.pop(); const x = p % N, y = (p / N) | 0; c++; ax += x; ay += y;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const j = ny * N + nx;
      if (bin[j] && lab[j] < 0) { lab[j] = id; q.push(j); }
    }
  }
  comps.push({ id, c, cx: ax / c, cy: ay / c });
}
comps.sort((a, b) => b.c - a.c);
const blade = comps[0];
console.log("羽の数:", comps.filter(c => c.c > blade.c * 0.5).length, "／採用した羽の画素数:", blade.c);

/* ② 輪郭を1周たどる（Mooreの近傍追跡） */
function trace(id) {
  let start = -1;
  for (let i = 0; i < N * N; i++) if (lab[i] === id) { start = i; break; }
  const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N && lab[y * N + x] === id;
  const dirs = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
  let x = start % N, y = (start / N) | 0, d = 6;
  const out = [[x, y]];
  for (let step = 0; step < N * N * 4; step++) {
    let moved = false;
    for (let k = 0; k < 8; k++) {
      const nd = (d + 6 + k) % 8;
      const nx = x + dirs[nd][0], ny = y + dirs[nd][1];
      if (inside(nx, ny)) { x = nx; y = ny; d = nd; moved = true; break; }
    }
    if (!moved) break;
    if (x === (start % N) && y === ((start / N) | 0) && out.length > 8) break;
    out.push([x, y]);
  }
  return out;
}
const contour = trace(blade.id);

/* ③ 直線で近似（Ramer–Douglas–Peucker。輪が閉じているので2点から始める） */
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let maxD = -1, idx = 0;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const L = Math.hypot(bx - ax, by - ay) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]];
  return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
}
// いちばん遠い2点で輪を割ってから近似すると、角が落ちにくい
let fa = 0, fb = 0, best = -1;
for (let i = 0; i < contour.length; i += 4) {
  const d = Math.hypot(contour[i][0] - contour[0][0], contour[i][1] - contour[0][1]);
  if (d > best) { best = d; fb = i; }
}
const half1 = contour.slice(fa, fb + 1), half2 = contour.slice(fb).concat([contour[0]]);
const poly = rdp(half1, EPS * UP).slice(0, -1).concat(rdp(half2, EPS * UP).slice(0, -1));
console.log("輪郭の点:", contour.length, "→ 直線近似後の頂点:", poly.length);

/* 元画像の座標系（中心を原点）に直す */
const P = poly.map(([x, y]) => [ (x + 0.5) / UP - CX, (y + 0.5) / UP - CY ]);

/* 文字の部分を、拡大→ぼかし→二値化で取り出す（縁のガタつきを均す）。
   マークと違って回転対称が使えないので、こちらは素直に均すだけ。 */
function wordMask(outW, outH) {
  const SS = 3;
  const W = outW * SS, H = outH * SS;
  const a = new Float64Array(W * H);
  const at = (x, y) => {
    if (x < 0 || y < 0 || x > src.width - 1 || y > src.height - 1) return 0;
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const g = (px, py) => (px < 0 || py < 0 || px >= src.width || py >= src.height)
      ? 0 : src.data[(py * src.width + px) * 4 + 3] / 255;
    return g(x0,y0)*(1-fx)*(1-fy) + g(x0+1,y0)*fx*(1-fy) + g(x0,y0+1)*(1-fx)*fy + g(x0+1,y0+1)*fx*fy;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    a[y * W + x] = at(WORD.x + (x + 0.5) * WORD.w / W, WORD.y + (y + 0.5) * WORD.h / H);
  }
  const r = Math.max(1, Math.round(0.55 * SS));
  const t = new Float64Array(W * H);
  const blur = (inp, outp, horiz) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let s2 = 0, c = 0;
      for (let k = -r; k <= r; k++) {
        const xx = horiz ? x + k : x, yy = horiz ? y : y + k;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        s2 += inp[yy * W + xx]; c++;
      }
      outp[y * W + x] = s2 / c;
    }
  };
  blur(a, t, true); blur(t, a, false);
  const out = new Float64Array(outW * outH);
  for (let y = 0; y < outH; y++) for (let x = 0; x < outW; x++) {
    let s2 = 0;
    for (let j = 0; j < SS; j++) for (let k = 0; k < SS; k++) s2 += a[(y*SS+j)*W + (x*SS+k)] >= 0.5 ? 1 : 0;
    out[y * outW + x] = s2 / (SS * SS);
  }
  return out;
}

/* ④ 多角形として45°ずつ8枚描く */
function pointIn(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const SS = 4;   // 1画素あたり4x4で判定して、なめらかな縁にする
function make(file, { canvas = 1024, markRatio, bg, ink = INK, wordRatio = 0, gapRatio = 0.05 }) {
  const markPx = canvas * markRatio;
  const scale = markPx / MARK.w;
  const png = new PNG({ width: canvas, height: canvas });
  for (let i = 0; i < canvas * canvas; i++) {
    png.data[i*4] = bg ? bg[0] : 0; png.data[i*4+1] = bg ? bg[1] : 0;
    png.data[i*4+2] = bg ? bg[2] : 0; png.data[i*4+3] = bg ? 255 : 0;
  }

  /* 文字を入れるときは、マークと文字を合わせた塊を中央に置く。
     マークだけのときは今までどおり画面の中心に描く。 */
  let markShiftY = 0;
  let wordTop = 0, wordW = 0, wordH = 0;
  if (wordRatio > 0) {
    wordW = Math.round(canvas * wordRatio);
    wordH = Math.round(wordW * WORD.h / WORD.w);
    const gap = Math.round(canvas * gapRatio);
    const markH = markPx * MARK.h / MARK.w;
    const total = markH + gap + wordH;
    const top = (canvas - total) / 2;
    markShiftY = top + markH / 2 - canvas / 2;   // マークの中心をどれだけ上げるか
    wordTop = Math.round(top + markH + gap);
  }

  if (markRatio > 0) {
    const polys = [];
    for (let i = 0; i < 8; i++) {
      const t = i * Math.PI / 4, cs = Math.cos(t), sn = Math.sin(t);
      polys.push(P.map(([x, y]) => [ (x * cs - y * sn) * scale + canvas / 2,
                                     (x * sn + y * cs) * scale + canvas / 2 + markShiftY ]));
    }
    // 描く範囲だけ回す
    let x0 = canvas, y0 = canvas, x1 = 0, y1 = 0;
    polys.forEach(p => p.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }));
    x0 = Math.max(0, Math.floor(x0) - 1); y0 = Math.max(0, Math.floor(y0) - 1);
    x1 = Math.min(canvas - 1, Math.ceil(x1) + 1); y1 = Math.min(canvas - 1, Math.ceil(y1) + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let hit = 0;
      for (let j = 0; j < SS; j++) for (let k = 0; k < SS; k++) {
        const px = x + (k + 0.5) / SS, py = y + (j + 0.5) / SS;
        if (polys.some(p => pointIn(p, px, py))) hit++;
      }
      if (!hit) continue;
      const a = hit / (SS * SS), i = (y * canvas + x) * 4;
      png.data[i]   = Math.round(ink[0] * a + png.data[i] * (1 - a));
      png.data[i+1] = Math.round(ink[1] * a + png.data[i+1] * (1 - a));
      png.data[i+2] = Math.round(ink[2] * a + png.data[i+2] * (1 - a));
      png.data[i+3] = bg ? 255 : Math.round(a * 255);
    }
  }
  if (wordRatio > 0) {
    const wm = wordMask(wordW, wordH);
    const ox = Math.round((canvas - wordW) / 2);
    for (let y = 0; y < wordH; y++) for (let x = 0; x < wordW; x++) {
      const al = wm[y * wordW + x];
      if (al <= 0.004) continue;
      const i = ((y + wordTop) * canvas + (x + ox)) * 4;
      for (let c = 0; c < 3; c++) png.data[i + c] = Math.round(ink[c] * al + png.data[i + c] * (1 - al));
      png.data[i + 3] = bg ? 255 : Math.round(al * 255);
    }
  }

  fs.writeFileSync(file, PNG.sync.write(png, bg ? { colorType: 2, inputHasAlpha: true } : {}));
  console.log("書き出し:", file.split("/").pop(), canvas + "px",
    "マーク" + Math.round(markRatio * 100) + "%" + (wordRatio ? " ＋文字" + Math.round(wordRatio * 100) + "%" : ""));
}

const D = process.env.OUTDIR || "/Users/takuma/projects/carcare-app/app/assets/";
const WHITE = [255, 255, 255];
/* ★ iOS・汎用。発注者の要望で文字入り（2026-10-24）。
   Androidのアダプティブと通知は外周が削られるので、文字は入れない。 */
make(D + "icon.png", { markRatio: 0.40, wordRatio: 0.80, bg: WHITE });
make(D + "favicon.png", { canvas: 196, markRatio: 0.66, bg: WHITE });
make(D + "android-icon-foreground.png", { markRatio: 0.42 });
make(D + "android-icon-background.png", { markRatio: 0, bg: WHITE });
make(D + "android-icon-monochrome.png", { markRatio: 0.42, ink: [0, 0, 0] });
// 登録完了のときに回すマーク単体（透過）。src/assets から require して使う
make("/Users/takuma/projects/carcare-app/app/src/assets/mark.png", { canvas: 512, markRatio: 1 });
