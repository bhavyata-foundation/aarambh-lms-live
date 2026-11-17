/* =========================================================================
   ms-core.js — Marksheet scanner, part 1: the image work
   -------------------------------------------------------------------------
   Pure JavaScript (no canvas, no libraries), so the same code runs in the
   browser and in tests. Images are { w, h, d } with d = Uint8Array of grey
   values (0 black … 255 white).

     fromRGBA(rgba, w, h)          RGBA pixels → grey
     rectify(grey, corners, maxW)  the 4 corners the teacher placed → a
                                   straight, flat top-down image
     prepare(grey)                 even out the light, then black/white
     findGrid(bin, rows, cols)     the printed lines → cell boundaries
     cellGlyph(prep, grid, r, c)   one cell → its handwritten mark, cleaned,
                                   and the measurements the classifier uses
   ========================================================================= */
(function(root){
  'use strict';
  const MS = root.MarksheetOCR = root.MarksheetOCR || {};

  const img = (w, h, fill) => { const d = new Uint8Array(w * h); if(fill) d.fill(fill); return { w, h, d }; };

  MS.fromRGBA = function(rgba, w, h){
    const g = img(w, h);
    for(let i = 0, j = 0; i < g.d.length; i++, j += 4) g.d[i] = (rgba[j] * 299 + rgba[j + 1] * 587 + rgba[j + 2] * 114) / 1000;
    return g;
  };

  // ---- straighten: homography from the 4 corners (TL, TR, BR, BL) ----
  function solve(A, b){ // Gaussian elimination, 8x8
    const n = b.length;
    for(let i = 0; i < n; i++){
      let p = i; for(let r = i + 1; r < n; r++) if(Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
      for(let r = i + 1; r < n; r++){ const f = A[r][i] / A[i][i]; for(let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
    }
    const x = new Array(n).fill(0);
    for(let i = n - 1; i >= 0; i--){ let s = b[i]; for(let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
    return x;
  }
  function homography(from, to){ // maps from[i] → to[i]
    const A = [], b = [];
    for(let i = 0; i < 4; i++){
      const [x, y] = from[i], [u, v] = to[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    const h = solve(A, b); h.push(1); return h;
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  // Put any 4 corners in the order top-left, top-right, bottom-right, bottom-left, so a
  // swapped or mis-dragged handle can't turn or mirror the sheet.
  MS.orderCorners = function(pts){
    const cx = pts.reduce((s, p) => s + p[0], 0) / 4, cy = pts.reduce((s, p) => s + p[1], 0) / 4;
    const byAngle = pts.slice().sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx)); // clockwise on screen, from the left
    let k = 0; byAngle.forEach((p, i) => { if(p[0] + p[1] < byAngle[k][0] + byAngle[k][1]) k = i; });                  // top-left = smallest x + y
    return [0, 1, 2, 3].map(i => byAngle[(k + i) % 4]);
  };
  MS.rectify = function(g, corners, maxW){
    const [tl, tr, br, bl] = MS.orderCorners(corners);
    corners = [tl, tr, br, bl];
    let W = Math.max(dist(tl, tr), dist(bl, br)), H = Math.max(dist(tl, bl), dist(tr, br));
    const s = Math.min(1.6, (maxW || 1400) / W); W = Math.round(W * s); H = Math.round(H * s);
    const Hm = homography([[0, 0], [W - 1, 0], [W - 1, H - 1], [0, H - 1]], corners); // output → source
    const out = img(W, H);
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
      const z = Hm[6] * x + Hm[7] * y + 1, sx = (Hm[0] * x + Hm[1] * y + Hm[2]) / z, sy = (Hm[3] * x + Hm[4] * y + Hm[5]) / z;
      const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
      if(x0 < 0 || y0 < 0 || x0 + 1 >= g.w || y0 + 1 >= g.h){ out.d[y * W + x] = 255; continue; }
      const i = y0 * g.w + x0;
      out.d[y * W + x] = (g.d[i] * (1 - fx) + g.d[i + 1] * fx) * (1 - fy) + (g.d[i + g.w] * (1 - fx) + g.d[i + g.w + 1] * fx) * fy;
    }
    out.H = Hm; // output → photo, to move corners found in this image back onto the photo
    return out;
  };
  MS.toPhoto = (H, x, y) => { const z = H[6] * x + H[7] * y + 1; return [(H[0] * x + H[1] * y + H[2]) / z, (H[3] * x + H[4] * y + H[5]) / z]; };

  // ---- light: estimate the paper's brightness everywhere, divide it out ----
  function maxFilter(g, r){ // separable sliding max (rows then columns)
    const t = img(g.w, g.h), o = img(g.w, g.h), { w, h } = g;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ let m = 0; const a = Math.max(0, x - r), b = Math.min(w - 1, x + r); for(let k = a; k <= b; k++){ const v = g.d[y * w + k]; if(v > m) m = v; } t.d[y * w + x] = m; }
    for(let x = 0; x < w; x++) for(let y = 0; y < h; y++){ let m = 0; const a = Math.max(0, y - r), b = Math.min(h - 1, y + r); for(let k = a; k <= b; k++){ const v = t.d[k * w + x]; if(v > m) m = v; } o.d[y * w + x] = m; }
    return o;
  }
  function boxBlur(g, r){
    const { w, h } = g, I = new Float64Array((w + 1) * (h + 1)), o = img(w, h);
    for(let y = 0; y < h; y++){ let s = 0; for(let x = 0; x < w; x++){ s += g.d[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + s; } }
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
      o.d[y * w + x] = (I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0));
    }
    return o;
  }
  MS.prepare = function(g){
    const { w, h } = g;
    // work on a small copy for the light estimate (fast), then scale it back up
    const k = Math.max(1, Math.round(Math.max(w, h) / 300)), sw = Math.ceil(w / k), sh = Math.ceil(h / k), sm = img(sw, sh);
    for(let y = 0; y < sh; y++) for(let x = 0; x < sw; x++){ let m = 0; for(let yy = y * k; yy < Math.min(h, y * k + k); yy++) for(let xx = x * k; xx < Math.min(w, x * k + k); xx++){ const v = g.d[yy * w + xx]; if(v > m) m = v; } sm.d[y * sw + x] = m; }
    const bgS = boxBlur(maxFilter(sm, 6), 6);
    const norm = img(w, h);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
      const b = Math.max(40, bgS.d[Math.min(sh - 1, (y / k) | 0) * sw + Math.min(sw - 1, (x / k) | 0)]);
      norm.d[y * w + x] = Math.min(255, g.d[y * w + x] * 255 / b);
    }
    // contrast: stretch so the paper is white and the darkest 1 % is black
    const hist = new Uint32Array(256); for(const v of norm.d) hist[v]++;
    let lo = 0, acc = 0; while(lo < 255 && (acc += hist[lo]) < norm.d.length * 0.005) lo++;
    const span = Math.max(30, 245 - lo);
    for(let i = 0; i < norm.d.length; i++) norm.d[i] = Math.max(0, Math.min(255, (norm.d[i] - lo) * 255 / span));
    // black/white: Sauvola-style local threshold on the even-lit image
    const r = Math.max(8, Math.round(Math.min(w, h) / 60)), mean = boxBlur(norm, r), bin = img(w, h);
    const loose = img(w, h); // for finding faint printed lines only (long straight runs can't be letters)
    for(let i = 0; i < norm.d.length; i++){ bin.d[i] = norm.d[i] < Math.min(mean.d[i] * 0.80, 200) ? 1 : 0; loose.d[i] = norm.d[i] < Math.min(mean.d[i] * 0.93, 232) ? 1 : 0; }
    return { norm, bin, loose, w, h };
  };

  // ---- the printed grid: long straight runs of ink ----
  function longRuns(bin, horizontal, minLen){
    const { w, h, d } = bin, L = horizontal ? h : w, N = horizontal ? w : h, mask = img(w, h), prof = new Float64Array(L);
    for(let a = 0; a < L; a++){
      let run = 0;
      for(let b = 0; b <= N; b++){
        // tolerate a 1-pixel slope: a pixel counts if it, or the one above/below, is ink
        let on = 0;
        if(b < N){ for(let t = -1; t <= 1 && !on; t++){ const aa = a + t; if(aa < 0 || aa >= L) continue; on = horizontal ? d[aa * w + b] : d[b * w + aa]; } }
        if(on) run++;
        else { if(run >= minLen){ prof[a] += run; for(let k = b - run; k < b; k++){ if(horizontal) mask.d[a * w + k] = 1; else mask.d[k * w + a] = 1; } } run = 0; }
      }
    }
    return { prof, mask };
  }
  function peaks(prof, span, minFrac){
    const out = [], thr = span * minFrac;
    for(let i = 0; i < prof.length; i++){
      if(prof[i] < thr) continue;
      let j = i, best = i; while(j + 1 < prof.length && prof[j + 1] >= thr){ j++; if(prof[j] > prof[best]) best = j; }
      let s = 0, ws = 0; for(let k = i; k <= j; k++){ s += k * prof[k]; ws += prof[k]; }
      out.push({ at: s / ws, from: i, to: j, strength: prof[best] }); i = j;
    }
    return out;
  }
  // The grid = the longest run of evenly spaced lines. A page edge, the desk or a
  // ruled margin also look like lines, but they don't keep the grid's spacing.
  function regularRun(at){
    at = at.slice().sort((a, b) => a - b);
    if(at.length < 3) return at;
    // the grid's spacing: the most common gap (gaps within 25 % of each other count together)
    const gaps = at.slice(1).map((v, i) => v - at[i]).filter(g => g > 3);
    let step = 0, votes = -1;
    gaps.forEach(g => { const v = gaps.filter(h => Math.abs(h - g) <= g * 0.25).length; if(v > votes){ votes = v; step = g; } });
    // the longest stretch where each next line is about one (or two, a missed line) steps on
    let best = [at[0]], cur = [at[0]];
    for(let i = 1; i < at.length; i++){
      const g = at[i] - cur[cur.length - 1], k = Math.round(g / step);
      if(k >= 1 && k <= 2 && Math.abs(g - k * step) <= step * 0.3) cur.push(at[i]);
      else if(g < step * 0.3) continue;            // a double line: keep the first
      else { if(cur.length > best.length) best = cur; cur = [at[i]]; }
    }
    return cur.length > best.length ? cur : best;
  }
  MS.regularRun = regularRun;
  // choose n+1 boundaries. With a count: fit evenly spaced lines to the lines
  // found (missing, extra or cropped-off lines allowed), snapping to real ones.
  function boundaries(found, size, n){
    let at = found.map(p => p.at).sort((a, b) => a - b);
    if(!n){
      at = regularRun(at);
      if(at.length < 2) return { lines: null, detected: false };
      const gaps = at.slice(1).map((v, i) => v - at[i]).sort((a, b) => a - b), med = gaps[gaps.length >> 1], L = at.slice();
      if(L[0] > med * 0.6) L.unshift(0);
      if(size - 1 - L[L.length - 1] > med * 0.6) L.push(size - 1);
      return { lines: L, detected: true };
    }
    let best = null;
    const tryFit = (step, phase) => {
      // boundaries phase + k*step; choose the run of n+1 that best covers the image
      const k0 = Math.round((0 - phase) / step), k1 = Math.round((size - 1 - phase) / step) - n;
      for(let s0 = Math.min(k0, k1); s0 <= Math.max(k0, k1); s0++){
        const lines = Array.from({ length: n + 1 }, (_, i) => phase + (s0 + i) * step);
        if(lines[0] < -0.45 * step || lines[n] > size - 1 + 0.45 * step) continue;
        let hit = 0, err = 0;
        lines.forEach(v => { const d = at.reduce((m, a) => Math.min(m, Math.abs(a - v)), 1e9); if(d < 0.18 * step){ hit++; err += d; } });
        const score = hit - err / (step * (n + 1));
        if(!best || score > best.score) best = { score, hit, lines, step };
      }
    };
    const lo = size / (n * 1.5), hi = size / (n * 0.75);
    for(let i = 0; i < at.length; i++) for(let j = i + 1; j < at.length; j++) for(let g = 1; g <= n; g++){
      const step = (at[j] - at[i]) / g; if(step >= lo && step <= hi) tryFit(step, at[i]);
    }
    if(!best || best.hit < 2) return { lines: Array.from({ length: n + 1 }, (_, i) => (size - 1) * i / n), detected: false };
    const lines = best.lines.map(v => { const a = at.reduce((m, x) => Math.abs(x - v) < Math.abs(m - v) ? x : m, Infinity); return Math.abs(a - v) < 0.2 * best.step ? a : Math.max(0, Math.min(size - 1, v)); });
    return { lines, detected: best.hit >= Math.ceil((n + 1) * 0.5) };
  }
  MS.findGrid = function(prep, rows, cols){
    const { bin, w, h } = prep, L = prep.loose || bin;
    const H = longRuns(L, true, Math.round(w * 0.06)), V = longRuns(L, false, Math.round(h * 0.06));
    const hp = peaks(H.prof, w, 0.35), vp = peaks(V.prof, h, 0.35);
    const R = boundaries(hp, h, rows), C = boundaries(vp, w, cols);
    // ink without the printed lines. Only inside the narrow bands where a real grid
    // line was found — elsewhere a letter's stroke plus paper noise can look like a
    // long run, and must not be erased. Lines are thickened by 1 px so no edge is left.
    const rowBand = new Uint8Array(h), colBand = new Uint8Array(w);
    hp.forEach(p => { for(let y = Math.max(0, p.from - 2); y <= Math.min(h - 1, p.to + 2); y++) rowBand[y] = 1; });
    vp.forEach(p => { for(let x = Math.max(0, p.from - 2); x <= Math.min(w - 1, p.to + 2); x++) colBand[x] = 1; });
    const lineMask = img(w, h);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
      if(!((rowBand[y] && H.mask.d[y * w + x]) || (colBand[x] && V.mask.d[y * w + x]))) continue;
      for(let t = -1; t <= 1; t++){ if(y + t >= 0 && y + t < h) lineMask.d[(y + t) * w + x] = 1; if(x + t >= 0 && x + t < w) lineMask.d[y * w + x + t] = 1; }
    }
    const ink = img(w, h); for(let i = 0; i < ink.d.length; i++) ink.d[i] = bin.d[i] && !lineMask.d[i] ? 1 : 0;
    return { ys: R.lines, xs: C.lines, rowsFound: R.detected, colsFound: C.detected, ink, lineMask, hLines: hp.length, vLines: vp.length,
             hAt: hp.map(p => p.at), vAt: vp.map(p => p.at) };
  };

  // The marks area on a whole, unstraightened photo, as 4 corners (or null).
  // A phone photo is usually tilted a few degrees, so first find the tilt: the
  // angle at which the ink lines up into the sharpest stripes. Then the grid
  // lines along that angle, then the corners where the outer lines cross.
  MS.guessArea = function(prep){
    const { w, h } = prep, b = prep.loose || prep.bin, pts = [];
    for(let y = 0; y < h; y += 1) for(let x = 0; x < w; x += 1) if(b.d[y * w + x]) pts.push(x, y);
    if(pts.length < 200) return null;
    const N = Math.ceil(Math.hypot(w, h)) + 2;
    const profile = (deg, vertical) => { // ink per stripe at this angle
      const a = deg * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), hist = new Float64Array(N * 2);
      for(let i = 0; i < pts.length; i += 2){ const x = pts[i], y = pts[i + 1], t = vertical ? x * c + y * sn : y * c - x * sn; hist[Math.round(t) + N]++; }
      return hist;
    };
    const sharp = hist => { let s2 = 0; for(const v of hist) s2 += v * v; return s2; };
    const best = vertical => { let bd = 0, bs = -1; for(let d = -10; d <= 10; d += 0.5){ const sc = sharp(profile(d, vertical)); if(sc > bs){ bs = sc; bd = d; } } return bd; };
    const lines = (deg, vertical) => {
      const hist = profile(deg, vertical), span = vertical ? h : w, out = [];
      let top = 0; for(const v of hist) if(v > top) top = v;
      for(let i = 1; i < hist.length - 1; i++) if(hist[i] >= Math.max(span * 0.12, top * 0.35) && hist[i] >= hist[i - 1] && hist[i] >= hist[i + 1]){ if(!out.length || i - N - out[out.length - 1] > 3) out.push(i - N); }
      return regularRun(out);
    };
    const ah = best(false), av = best(true), H = lines(ah, false), V = lines(av, true);
    if(H.length < 3 || V.length < 2) return null;
    // corner = crossing of a horizontal stripe (y·cos − x·sin = p) and a vertical one (x·cos + y·sin = q)
    const cross = (p, q) => {
      const a1 = ah * Math.PI / 180, a2 = av * Math.PI / 180;
      const A = [[-Math.sin(a1), Math.cos(a1)], [Math.cos(a2), Math.sin(a2)]], det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      return [(p * A[1][1] - A[0][1] * q) / det, (A[0][0] * q - A[1][0] * p) / det];
    };
    const top = H[0], bot = H[H.length - 1], left = V[0], right = V[V.length - 1];
    const c = [cross(top, left), cross(top, right), cross(bot, right), cross(bot, left)];
    if(Math.abs(c[1][0] - c[0][0]) < w * 0.15 || Math.abs(c[3][1] - c[0][1]) < h * 0.15) return null;
    return c.map(([x, y]) => [Math.max(0, Math.min(w - 1, x)), Math.max(0, Math.min(h - 1, y))]);
  };

  // ---- connected pieces of ink ----
  function components(m, x0, y0, x1, y1){
    const { w } = m, seen = new Uint8Array((x1 - x0) * (y1 - y0)), out = [], cw = x1 - x0;
    for(let y = y0; y < y1; y++) for(let x = x0; x < x1; x++){
      if(!m.d[y * w + x] || seen[(y - y0) * cw + x - x0]) continue;
      const st = [[x, y]]; seen[(y - y0) * cw + x - x0] = 1;
      const c = { n: 0, minx: x, maxx: x, miny: y, maxy: y, px: [] };
      while(st.length){
        const [px, py] = st.pop(); c.n++; c.px.push(py * w + px);
        if(px < c.minx) c.minx = px; if(px > c.maxx) c.maxx = px; if(py < c.miny) c.miny = py; if(py > c.maxy) c.maxy = py;
        for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
          const nx = px + dx, ny = py + dy;
          if(nx < x0 || ny < y0 || nx >= x1 || ny >= y1) continue;
          const k = (ny - y0) * cw + nx - x0; if(seen[k] || !m.d[ny * w + nx]) continue; seen[k] = 1; st.push([nx, ny]);
        }
      }
      out.push(c);
    }
    return out;
  }

  // ---- one cell: find the mark, clean it, measure it ----
  MS.cellGlyph = function(prep, grid, r, c){
    const X0 = grid.xs[c], X1 = grid.xs[c + 1], Y0 = grid.ys[r], Y1 = grid.ys[r + 1];
    const cw = X1 - X0, ch = Y1 - Y0, mx = Math.max(2, cw * 0.05), my = Math.max(2, ch * 0.06);
    const x0 = Math.max(0, Math.round(X0 + mx)), x1 = Math.min(prep.w, Math.round(X1 - mx)), y0 = Math.max(0, Math.round(Y0 + my)), y1 = Math.min(prep.h, Math.round(Y1 - my));
    const W = Math.max(1, x1 - x0), H = Math.max(1, y1 - y0), area = W * H, base = { box: [X0, Y0, X1, Y1], ink: 0 };
    // this cell's own black/white level: its paper brightness minus a clear margin,
    // so a faint pencil mark counts and paper noise doesn't
    const vals = [];
    for(let y = y0; y < y1; y++) for(let x = x0; x < x1; x++) if(!grid.lineMask.d[y * prep.w + x]) vals.push(prep.norm.d[y * prep.w + x]);
    if(!vals.length) return Object.assign(base, { blank: true });
    vals.sort((a, b) => a - b);
    const paper = vals[Math.floor(vals.length * 0.6)], dark = vals[Math.floor(vals.length * 0.01)];
    const thr = paper - Math.max(34, (paper - dark) * 0.45);
    const m = img(W, H);
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){ const i = (y + y0) * prep.w + x + x0; m.d[y * W + x] = !grid.lineMask.d[i] && prep.norm.d[i] < thr ? 1 : 0; }
    let comps = components(m, 0, 0, W, H).filter(k => k.n >= Math.max(4, area * 0.0012));
    // drop pieces that hug the cell edge and look like leftover grid line
    comps = comps.filter(k => {
      const kw = k.maxx - k.minx + 1, kh = k.maxy - k.miny + 1, edge = k.minx <= 1 || k.maxx >= W - 2 || k.miny <= 1 || k.maxy >= H - 2;
      return !(edge && ((kw > W * 0.5 && kh < H * 0.12) || (kh > H * 0.5 && kw < W * 0.08)));
    });
    if(!comps.length) return Object.assign(base, { blank: true });
    // the mark = the biggest piece + pieces close to it (handwriting breaks into bits)
    comps.sort((a, b) => b.n - a.n);
    const main = comps[0], keep = [main], gx = cw * 0.18, gy = ch * 0.18;
    for(const k of comps.slice(1)){
      const near = k.minx < main.maxx + gx && k.maxx > main.minx - gx && k.miny < main.maxy + gy && k.maxy > main.miny - gy;
      if(near && k.n > main.n * 0.04) keep.push(k);
    }
    const bx0 = Math.min(...keep.map(k => k.minx)), bx1 = Math.max(...keep.map(k => k.maxx)), by0 = Math.min(...keep.map(k => k.miny)), by1 = Math.max(...keep.map(k => k.maxy));
    const gw = bx1 - bx0 + 1, gh = by1 - by0 + 1, n = keep.reduce((s, k) => s + k.n, 0);
    // blank: too little ink, or too small to be a letter (a dot, a dash)
    if(n < area * 0.003 || gh < ch * 0.13 || (gh < ch * 0.22 && gw < cw * 0.09)){
      // almost nothing — but a trace of ink the size of a faint letter is worth a look
      const trace = n >= area * 0.0012 && gh >= ch * 0.10;
      return Object.assign(base, { blank: true, ink: n, trace });
    }
    // how clear the mark is: in pieces (a dry pen) or faint (light pencil) → the teacher should check
    let inkSum = 0, inkCnt = 0; keep.forEach(k => k.px.forEach(p => { const x = p % W, y = (p / W) | 0; inkSum += prep.norm.d[(y + y0) * prep.w + x + x0]; inkCnt++; }));
    const faint = (paper - inkSum / Math.max(1, inkCnt)) < 70, pieces = keep.filter(k => k.n > n * 0.06).length;
    const bm = img(gw, gh); keep.forEach(k => k.px.forEach(p => { const x = p % W, y = (p / W) | 0; bm.d[(y - by0) * gw + x - bx0] = 1; }));
    return Object.assign(base, { blank: false, ink: n, unclear: faint || pieces >= 3, faint, pieces, glyphBox: [x0 + bx0, y0 + by0, x0 + bx1 + 1, y0 + by1 + 1], glyph: bm, f: MS.features(bm) });
  };

  // ---- measurements of one glyph (black = 1) ----
  function scaleTo(bm, S){ // keep the shape: fit into S x S, centred
    const s = (S - 2) / Math.max(bm.w, bm.h), out = img(S, S), ow = Math.max(1, Math.round(bm.w * s)), oh = Math.max(1, Math.round(bm.h * s)), ox = (S - ow) >> 1, oy = (S - oh) >> 1;
    for(let y = 0; y < oh; y++) for(let x = 0; x < ow; x++){
      const sx0 = Math.floor(x / s), sx1 = Math.max(sx0 + 1, Math.floor((x + 1) / s)), sy0 = Math.floor(y / s), sy1 = Math.max(sy0 + 1, Math.floor((y + 1) / s));
      let on = 0; for(let yy = sy0; yy < Math.min(bm.h, sy1) && !on; yy++) for(let xx = sx0; xx < Math.min(bm.w, sx1) && !on; xx++) on = bm.d[yy * bm.w + xx];
      out.d[(y + oy) * S + x + ox] = on;
    }
    return out;
  }
  function grow(bm, r){ const o = img(bm.w, bm.h); for(let y = 0; y < bm.h; y++) for(let x = 0; x < bm.w; x++){ if(!bm.d[y * bm.w + x]) continue; for(let dy = -r; dy <= r; dy++) for(let dx = -r; dx <= r; dx++){ const nx = x + dx, ny = y + dy; if(nx >= 0 && ny >= 0 && nx < bm.w && ny < bm.h) o.d[ny * bm.w + nx] = 1; } } return o; }
  function holes(bm){ // background pieces not reachable from the border = closed loops
    const { w, h } = bm, pad = img(w + 2, h + 2, 1); // the border is paper, so the outside of the letter is never a loop
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) pad.d[(y + 1) * (w + 2) + x + 1] = bm.d[y * w + x] ? 0 : 1;
    const comps = components(pad, 0, 0, w + 2, h + 2), out = [];
    for(const k of comps){ if(k.minx === 0 || k.miny === 0 || k.maxx === w + 1 || k.maxy === h + 1) continue; let sy = 0, sx = 0; k.px.forEach(p => { sy += (p / (w + 2)) | 0; sx += p % (w + 2); }); out.push({ n: k.n, cy: (sy / k.n - 1) / h, cx: (sx / k.n - 1) / w }); }
    return out.sort((a, b) => b.n - a.n);
  }
  function thin(bm){ // Zhang–Suen thinning → 1-pixel centre line
    const { w, h } = bm, a = Uint8Array.from(bm.d), at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : a[y * w + x];
    let changed = true;
    while(changed){
      changed = false;
      for(const pass of [0, 1]){
        const del = [];
        for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
          if(!a[y * w + x]) continue;
          const p = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
          const B = p.reduce((s, v) => s + v, 0); if(B < 2 || B > 6) continue;
          let A = 0; for(let i = 0; i < 8; i++) if(!p[i] && p[(i + 1) % 8]) A++; if(A !== 1) continue;
          if(pass === 0 ? (p[0] * p[2] * p[4] || p[2] * p[4] * p[6]) : (p[0] * p[2] * p[6] || p[0] * p[4] * p[6])) continue;
          del.push(y * w + x);
        }
        del.forEach(i => { a[i] = 0; }); if(del.length) changed = true;
      }
    }
    return { w, h, d: a };
  }
  MS.features = function(bm){
    const S = 32, z = scaleTo(bm, S), f = [];
    // 1. ink in an 8 x 8 grid of zones (the overall shape)
    for(let zy = 0; zy < 8; zy++) for(let zx = 0; zx < 8; zx++){ let s = 0; for(let y = zy * 4; y < zy * 4 + 4; y++) for(let x = zx * 4; x < zx * 4 + 4; x++) s += z.d[y * S + x]; f.push(s / 16); }
    // 2. closed loops (after closing small pen gaps): B has 2, P and A have 1
    // A real loop is a fair share of the letter; a second loop (B) must be comparable to the
    // first, so pockets where strokes cross, or a serif, don't count. Thin pens: close
    // small gaps first; thick pens: don't (it would fill the loops).
    // Tuned on 2,622 marks: shrink to 32 px, close 1-px pen gaps, keep loops of 0.4 % of
    // the square or more; a second loop counts only if ≥ 15 % of the first.
    const loopSet = (zz, S2) => { let hs = holes(zz).filter(k => k.n >= S2 * S2 * 0.004); if(hs[1] && hs[1].n < hs[0].n * 0.15) hs = [hs[0]]; return hs; };
    const hsA = loopSet(grow(z, 1), S), hsB = loopSet(scaleTo(bm, 48), 48);
    for(const hs of [hsA, hsB]){
      const nh = Math.min(2, hs.length);
      f.push(nh === 0 ? 1 : 0, nh === 1 ? 1 : 0, nh === 2 ? 1 : 0, hs[0] ? hs[0].cy : 0.5, hs[1] ? hs[1].cy : 0);
    }
    // 3. legs and stem: separate ink runs and width across the bottom, middle, top
    const band = (fy0, fy1) => { let runs = 0, rows = 0, minx = S, maxx = 0; for(let y = Math.floor(fy0 * S); y < Math.ceil(fy1 * S); y++){ let prev = 0, r = 0, any = 0; for(let x = 0; x < S; x++){ const v = z.d[y * S + x]; if(v && !prev) r++; if(v){ any = 1; if(x < minx) minx = x; if(x > maxx) maxx = x; } prev = v; } if(any){ runs += r; rows++; } } return [rows ? runs / rows / 2 : 0, maxx >= minx ? (maxx - minx) / S : 0]; };
    f.push(...band(0.82, 1), ...band(0.45, 0.6), ...band(0, 0.18));
    // 5. the same zones on the centre-line skeleton: the shape without the pen's thickness
    const sk = grow(thin(z), 1);
    for(let zy = 0; zy < 8; zy++) for(let zx = 0; zx < 8; zx++){ let s2 = 0; for(let y = zy * 4; y < zy * 4 + 4; y++) for(let x = zx * 4; x < zx * 4 + 4; x++) s2 += sk.d[y * S + x]; f.push(s2 / 16); }
    // 4. a straight stem on the left (P, B) and the aspect ratio
    let left = 0; for(let y = 0; y < S; y++){ let s = 0; for(let x = 0; x < S * 0.3; x++) s += z.d[y * S + x]; if(s) left++; } f.push(left / S);
    f.push(Math.min(2, bm.h / Math.max(1, bm.w)) / 2);
    return f;
  };

  if(typeof module !== 'undefined') module.exports = MS;
})(typeof window !== 'undefined' ? window : globalThis);
