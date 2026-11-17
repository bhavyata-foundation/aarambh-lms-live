/* =========================================================================
   ms-read.js — Marksheet scanner, part 2: reading each cell
   -------------------------------------------------------------------------
   Needs ms-core.js and ms-samples.js. Tesseract.js is optional (if it is
   on the page it adds a vote; if not, or offline, the scan still works).

   For every cell:
     1. blank or marked  — from the amount of ink (ms-core.js)
     2. B / P / A        — compared with 3,087 built-in handwritten marks
                           AND this teacher's own corrected marks (counted
                           3 times: they are her handwriting)
     3. a Tesseract vote — reading the single cleaned letter, B / P / A only
     4. "check"          — when the engine is less than 90 % sure
   Learning: after the teacher corrects and confirms a sheet, her marks are
   kept on THIS device (localStorage, at most 600) and used from then on.
   Nothing is sent anywhere.

   MarksheetOCR.scan(rgba, w, h, corners, options, onProgress) → result
     options: { rows, cols, skipFirstRow, skipFirstCol, useTesseract, maxWidth }
     result:  { rows, cols, grid, cells: [[{ mark, conf, check, why, thumb }]] , timeMs }
   ========================================================================= */
(function(root){
  'use strict';
  const MS = root.MarksheetOCR = root.MarksheetOCR || {};
  const L = ['B', 'P', 'A'], LEARN_KEY = 'aarambhMarksheetLearned', LEARN_MAX = 600, K = 7, CHECK_BELOW = 0.9;

  // ---- built-in samples (one byte per measurement) ----
  let base = null, stats = null;
  function decode(s){ if(typeof atob === 'function'){ const b = atob(s), u = new Uint8Array(b.length); for(let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; } return Uint8Array.from(Buffer.from(s, 'base64')); }
  function loadBase(){
    if(base) return;
    const S = MS.SAMPLES; if(!S) throw new Error('ms-samples.js is not loaded');
    const u = decode(S.data), n = S.n, rows = [];
    for(let i = 0; i < S.count; i++){ const f = new Float32Array(n); for(let j = 0; j < n; j++) f[j] = u[i * (n + 1) + 1 + j] / S.scale; rows.push({ f, y: u[i * (n + 1)], w: 1 }); }
    const mu = new Float32Array(n), sd = new Float32Array(n);
    rows.forEach(r => r.f.forEach((v, j) => { mu[j] += v / rows.length; }));
    rows.forEach(r => r.f.forEach((v, j) => { sd[j] += (v - mu[j]) ** 2 / rows.length; }));
    for(let j = 0; j < n; j++) sd[j] = Math.sqrt(sd[j]) || 1;
    stats = { mu, sd };
    rows.forEach(r => { r.z = z(r.f); });
    base = rows;
  }
  const z = f => { const o = new Float32Array(f.length); for(let j = 0; j < f.length; j++) o[j] = (f[j] - stats.mu[j]) / stats.sd[j]; return o; };

  // ---- this teacher's own marks, on this device ----
  function learned(){
    try { return (JSON.parse(localStorage.getItem(LEARN_KEY) || '[]') || []).map(s => ({ f: Float32Array.from(s.f), y: s.y, w: 3 })); } catch(e){ return []; }
  }
  MS.learnedCount = () => { try { return (JSON.parse(localStorage.getItem(LEARN_KEY) || '[]') || []).length; } catch(e){ return 0; } };
  MS.forgetLearned = () => { try { localStorage.removeItem(LEARN_KEY); } catch(e){} };
  // after the teacher has checked a sheet: keep every marked cell as an example of her handwriting
  MS.learn = function(result){
    let list = []; try { list = JSON.parse(localStorage.getItem(LEARN_KEY) || '[]') || []; } catch(e){}
    let added = 0;
    result.cells.forEach(row => row.forEach(c => { if(c.f && L.includes(c.mark)){ list.push({ f: Array.from(c.f, v => Math.round(v * 1000) / 1000), y: L.indexOf(c.mark) }); added++; } }));
    if(list.length > LEARN_MAX) list = list.slice(list.length - LEARN_MAX);
    try { localStorage.setItem(LEARN_KEY, JSON.stringify(list)); } catch(e){ return 0; }
    return added;
  };

  // ---- nearest examples ----
  function knn(f, mine){
    loadBase();
    const q = z(f), all = mine.length ? base.concat(mine.map(m => ({ z: m.z || (m.z = z(m.f)), y: m.y, w: m.w }))) : base;
    const best = []; // K nearest, kept sorted
    for(const r of all){
      let d = 0; for(let j = 0; j < q.length; j++){ const t = r.z[j] - q[j]; d += t * t; if(best.length === K && d > best[K - 1][0]) break; }
      if(best.length < K || d < best[K - 1][0]){ best.push([d, r.y, r.w]); best.sort((a, b) => a[0] - b[0]); if(best.length > K) best.pop(); }
    }
    const p = [0.02, 0.02, 0.02]; best.forEach(([, y, w]) => { p[y] += w; });
    const t = p[0] + p[1] + p[2]; return p.map(v => v / t);
  }

  // ---- Tesseract: one cleaned letter, ~100 px tall, thick pen, white margin ----
  function letterCanvas(glyph){
    if(typeof document === 'undefined') return null;
    const s = 100 / glyph.h, gw = Math.max(1, Math.round(glyph.w * s)), gh = 100, pad = 40;
    const cv = document.createElement('canvas'); cv.width = gw + pad * 2; cv.height = gh + pad * 2;
    const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.fillStyle = '#000';
    for(let y = 0; y < glyph.h; y++) for(let x = 0; x < glyph.w; x++) if(glyph.d[y * glyph.w + x]) cx.fillRect(pad + x * s, pad + y * s, s + 2, s + 2);
    return cv;
  }
  let worker = null;
  MS.tesseractReady = async function(){
    if(worker) return worker;
    if(typeof Tesseract === 'undefined') return null;
    try {
      worker = await Tesseract.createWorker('eng');
      await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM ? Tesseract.PSM.SINGLE_WORD : '8', tessedit_char_whitelist: 'BPA' });
      return worker;
    } catch(e){ worker = null; return null; } // offline, or blocked: the scan works without it
  };
  MS.tesseractStop = async function(){ if(worker){ try { await worker.terminate(); } catch(e){} worker = null; } };

  // a small picture of the cell, so the teacher sees the handwriting while checking
  function thumb(prep, box){
    if(typeof document === 'undefined') return '';
    const [x0, y0, x1, y1] = box.map(Math.round), w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), s = Math.min(1, 64 / h);
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * s)); cv.height = Math.max(1, Math.round(h * s));
    const cx = cv.getContext('2d'), id = cx.createImageData(cv.width, cv.height);
    for(let y = 0; y < cv.height; y++) for(let x = 0; x < cv.width; x++){ const v = prep.norm.d[Math.min(prep.h - 1, y0 + ((y / s) | 0)) * prep.w + Math.min(prep.w - 1, x0 + ((x / s) | 0))], i = (y * cv.width + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    cx.putImageData(id, 0, 0); return cv.toDataURL('image/png');
  }

  // ---- the whole scan ----
  MS.scan = async function(rgba, w, h, corners, opt, onProgress){
    const t0 = Date.now(); opt = opt || {};
    const say = (step, done, total) => { if(onProgress) try { onProgress(step, done, total); } catch(e){} };
    say('Straightening the photo', 0, 1);
    const grey = MS.fromRGBA(rgba, w, h);
    let used = corners || [[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]];
    let rect = MS.rectify(grey, used, opt.maxWidth || 1200);
    say('Evening out the light', 0, 1);
    let prep = MS.prepare(rect);
    // Rough corners (a finger, a quick guess) leave the grid a little tilted or cut.
    // Find the grid's real outer lines in this nearly-straight image, move the corners
    // onto them, and straighten once more.
    if(opt.refine === true){ // off: tested, it made rough corners worse, not better
      say('Lining up the grid', 0, 1);
      const a = MS.guessArea(prep);
      if(a){
        const bw = Math.hypot(a[1][0] - a[0][0], a[1][1] - a[0][1]), bh = Math.hypot(a[3][0] - a[0][0], a[3][1] - a[0][1]);
        if(bw > prep.w * 0.5 && bh > prep.h * 0.5){ // only a confident, large grid: never shrink to a part of it
          used = a.map(([x, y]) => MS.toPhoto(rect.H, x, y));
          rect = MS.rectify(grey, used, opt.maxWidth || 1200); prep = MS.prepare(rect);
        }
      }
    }
    say('Finding the grid', 0, 1);
    const R = opt.rows ? opt.rows + (opt.skipFirstRow ? 1 : 0) : 0, C = opt.cols ? opt.cols + (opt.skipFirstCol ? 1 : 0) : 0;
    const grid = MS.findGrid(prep, R || undefined, C || undefined);
    if(!grid.ys || !grid.xs) throw new Error('No grid lines were found. Enter the number of rows and columns and scan again.');
    const r0 = opt.skipFirstRow ? 1 : 0, c0 = opt.skipFirstCol ? 1 : 0, nR = grid.ys.length - 1 - r0, nC = grid.xs.length - 1 - c0;
    const mine = learned(), tw = opt.useTesseract === false ? null : await MS.tesseractReady();
    // If the printed lines don't confirm the grid (corners too rough, lines too faint), the
    // cell boundaries may be off: never let a mark through unchecked then.
    const gridSure = grid.rowsFound && grid.colsFound;
    const cells = [];
    for(let r = 0; r < nR; r++){
      if(typeof document !== 'undefined') await new Promise(res => setTimeout(res, 0)); // let the progress bar repaint
      const row = [];
      for(let c = 0; c < nC; c++){
        say('Reading the marks', r * nC + c, nR * nC);
        const k = MS.cellGlyph(prep, grid, r + r0, c + c0), cell = { r, c, thumb: thumb(prep, k.box) };
        if(k.blank){ Object.assign(cell, k.trace ? { mark: '', conf: 0.6, check: true, why: 'empty? a trace of ink — check' } : gridSure ? { mark: '', conf: 1, check: false, why: 'no mark' } : { mark: '', conf: 0.6, check: true, why: 'grid not confirmed' }); row.push(cell); continue; }
        const p = knn(k.f, mine), why = [];
        if(tw){
          try {
            const cv = letterCanvas(k.glyph), { data } = await tw.recognize(cv), ch = (data.text || '').replace(/\s/g, '').slice(0, 1);
            if(L.includes(ch)){ p[L.indexOf(ch)] += 2 * (data.confidence / 100); why.push('Tesseract read ' + ch); }
          } catch(e){}
        }
        const s = p[0] + p[1] + p[2], q = p.map(v => v / s), mark = L[q.indexOf(Math.max(...q))];
        let top = Math.max(...q);
        if(k.unclear){ top = Math.min(top, 0.6); why.unshift(k.faint ? 'faint mark' : 'mark in pieces'); } // never confident about a mark it can barely see
        if(!gridSure){ top = Math.min(top, 0.6); why.unshift('grid not confirmed'); }
        Object.assign(cell, { mark, conf: Math.round(top * 100) / 100, check: top < CHECK_BELOW, why: why.join('; ') || 'shape', f: k.f, probs: q });
        row.push(cell);
      }
      cells.push(row);
    }
    say('Done', 1, 1);
    return { rows: nR, cols: nC, corners: used, gridSure, grid: { ys: grid.ys, xs: grid.xs, fromLines: grid.rowsFound && grid.colsFound, width: prep.w, height: prep.h }, cells, learnedUsed: mine.length, tesseract: !!tw, timeMs: Date.now() - t0, image: prep };
  };

  // the result as plain data, for saving later: [{ row, marks: ['P','A','',…] }]
  MS.toRows = result => result.cells.map((row, i) => ({ row: i + 1, marks: row.map(c => c.mark) }));
  if(typeof module !== 'undefined') module.exports = MS;
})(typeof window !== 'undefined' ? window : globalThis);
