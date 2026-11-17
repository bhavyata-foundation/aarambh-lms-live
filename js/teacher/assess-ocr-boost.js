/* =========================================================================
   assess-ocr-boost.js — better photo reading for the assessment "Scan a photo"
   (Pre-Test, Observation, Workbook, Motor). Load it AFTER teacher-part-14.js:
     <script src="js/teacher/assess-ocr-boost.js" defer></script>
   It replaces / wraps functions of teacher-part-14.js by name, so nothing in
   that file has to be edited. What it changes:
     1. Cleaner image   — shadows evened out and table lines removed before reading.
     2. Table-aware     — reads the sheet as one block of rows (not as loose text).
     3. Names matched   — a near-match to a child on the roll is picked automatically
                          (marked "matched approximately" so it can be checked).
     4. Fix-up bar      — in the preview: use the class list in register order, untick
                          rows that could not be matched, or read again as
                          English / Marathi-Hindi / Gujarati.
   ========================================================================= */

var assessLastPhoto = null;      // the photo being read, so it can be read again
var assessOcrLangOnce = null;    // one-shot language choice for "read again"

// ---- 1. image clean-up (pure functions, easy to test) ----
// gray: Uint8ClampedArray (w*h). Returns 0 = ink, 255 = paper. A pixel is ink when it is clearly
// darker than the average of its neighbourhood, so uneven light and shadows do not matter.
function assessAdaptiveBinarize(gray, w, h){
  const W = w + 1, integral = new Float64Array(W * (h + 1));
  for(let y = 0; y < h; y++){
    let row = 0;
    for(let x = 0; x < w; x++){ row += gray[y * w + x]; integral[(y + 1) * W + x + 1] = integral[y * W + x + 1] + row; }
  }
  const half = Math.max(8, Math.round(Math.min(w, h) / 40)), out = new Uint8ClampedArray(w * h);
  for(let y = 0; y < h; y++){
    const y0 = Math.max(0, y - half), y1 = Math.min(h, y + half + 1);
    for(let x = 0; x < w; x++){
      const x0 = Math.max(0, x - half), x1 = Math.min(w, x + half + 1);
      const sum = integral[y1 * W + x1] - integral[y0 * W + x1] - integral[y1 * W + x0] + integral[y0 * W + x0];
      const mean = sum / ((x1 - x0) * (y1 - y0));
      out[y * w + x] = gray[y * w + x] < mean * 0.86 ? 0 : 255;
    }
  }
  return out;
}
// Wipes long straight ink runs (the lines of a table) so they are not read as characters.
function assessRemoveLines(bin, w, h, minRun){
  for(let y = 0; y < h; y++){
    let run = 0;
    for(let x = 0; x <= w; x++){
      if(x < w && bin[y * w + x] === 0) run++;
      else { if(run >= minRun) for(let k = x - run; k < x; k++) bin[y * w + k] = 255; run = 0; }
    }
  }
  for(let x = 0; x < w; x++){
    let run = 0;
    for(let y = 0; y <= h; y++){
      if(y < h && bin[y * w + x] === 0) run++;
      else { if(run >= minRun) for(let k = y - run; k < y; k++) bin[k * w + x] = 255; run = 0; }
    }
  }
  return bin;
}
async function assessPrepareImage(file){
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That photo could not be opened.')); i.src = url; });
  const scale = Math.min(3, Math.max(1, 2400 / Math.max(img.width, img.height)));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data, n = c.width * c.height;
  const gray = new Uint8ClampedArray(n);
  for(let i = 0, p = 0; i < n; i++, p += 4) gray[i] = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
  const bin = assessRemoveLines(assessAdaptiveBinarize(gray, c.width, c.height), c.width, c.height, Math.round(Math.min(c.width, c.height) * 0.06));
  for(let i = 0, p = 0; i < n; i++, p += 4){ px[p] = px[p + 1] = px[p + 2] = bin[i]; px[p + 3] = 255; }
  g.putImageData(d, 0, 0);
  URL.revokeObjectURL(url);
  return c;
}

// ---- 2. read the sheet as a block of rows, in the chosen language ----
// Recognised lines → [header, ...rows] (the same rules as before).
function assessLinesToGrid(text, type){
  const grid = [];
  text.forEach(line => {
    const clean = line.replace(/[|\[\]{}_]/g, ' ').replace(/\s+/g, ' ').trim();
    if(!clean) return;
    const toks = clean.split(' ');
    const nameAt = toks.findIndex(t => /^name$/i.test(t));
    if(!grid.length && nameAt >= 0){ grid.push(['Student Name', ...toks.slice(nameAt + 1)]); return; }
    if(!grid.length && assessIsTally(type) && toks.filter(t => /^(b|p|a|e|beginner|proficient|advanced|emerging)$/i.test(t)).length >= 2){
      grid.push(['Key', ...toks.filter(t => /^(b|p|a|e|beginner|proficient|advanced|emerging)$/i.test(t))]); return;
    }
    if(assessIsTally(type)){
      const nums = toks.filter(t => /^\d{1,3}$/.test(t));
      const key = toks.find(t => /cg|\d+\.\d+/i.test(t)) || toks[0];
      grid.push([key, ...nums.slice(-3)]);
      return;
    }
    let k = toks.length;
    while(k > 1 && /^[BPAEGYR8478✓✗xX-]{1,2}$/i.test(toks[k - 1])) k--;
    grid.push([toks.slice(0, k).join(' '), ...toks.slice(k)]);
  });
  return grid;
}
async function assessOcrGrid(file, type, out, lang){
  lang = lang || assessOcrLangOnce || 'eng'; assessOcrLangOnce = null;
  assessLastPhoto = { file, type, lang };
  out.innerHTML = '<p class="sub">Getting the photo reader ready…</p>';
  await assessLoadTesseract();
  const canvas = await assessPrepareImage(file);
  let worker;
  try{
    worker = await Tesseract.createWorker(lang, 1, {
      logger: m => { if(m.status === 'recognizing text' && out) out.innerHTML = `<p class="sub">Reading the photo… ${Math.round((m.progress || 0) * 100)}%</p>`; }
    });
    await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' }); // one uniform block of text rows
    const { data } = await worker.recognize(canvas);
    const lines = ((data && data.lines) || []).map(l => l.text).filter(t => t && t.trim());
    const text = lines.length ? lines : String((data && data.text) || '').split(/\n/);
    const grid = assessLinesToGrid(text, type);
    if(!grid.length) throw new Error('No writing could be read from this photo. Take it again in good light, straight on, with the whole sheet in view.');
    return grid;
  } finally { if(worker) try{ await worker.terminate(); }catch(e){} }
}

// ---- 3. match a read name to a child on the roll, even when a few letters are wrong ----
function assessLetters(s){ return String(s == null ? '' : s).toLowerCase().replace(/[^a-z\u0900-\u097F\u0A80-\u0AFF]/g, ''); }
function assessBigrams(s){ const m = new Map(); for(let i = 0; i < s.length - 1; i++){ const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; }
function assessDice(a, b){
  if(a.length < 2 || b.length < 2) return a === b && a ? 1 : 0;
  const A = assessBigrams(a), B = assessBigrams(b); let hit = 0;
  A.forEach((n, g) => { hit += Math.min(n, B.get(g) || 0); });
  return 2 * hit / ((a.length - 1) + (b.length - 1));
}
// Best roll child for a name read from a photo, or null when nothing is close enough, two are about equally close,
// or the closest child is already used on another row.
function assessFuzzyPupil(name, roll, taken){
  const a = assessLetters(splitRegisterFromName(name).name);
  if(a.length < 4) return null;
  let best = null, second = 0;
  roll.forEach(p => {
    const score = assessDice(a, assessLetters(p.name));
    if(!best || score > best.score){ if(best) second = best.score; best = { pupil: p, score }; }
    else if(score > second) second = score;
  });
  if(!best || best.score < 0.72 || best.score - second < 0.08) return null;
  return taken && taken.has(best.pupil.id) ? null : best; // the closest child is already used on another row: do not guess a different one
}

// Wrap the analysis: pick near-matches, and remember the photo on the result.
if(typeof assessAnalyse === 'function' && !assessAnalyse.__boosted){
  var __aobAnalyse = assessAnalyse;
  assessAnalyse = function(type, grid, fileName, source){
    const S = __aobAnalyse(type, grid, fileName, source);
    if(S && !S.tally && Array.isArray(S.rows)){
      const roll = Array.isArray(realPupilsCache) ? realPupilsCache : [];
      const taken = new Set(S.rows.filter(r => r.pupilId).map(r => r.pupilId));
      S.rows.forEach(r => {
        if(r.pupilId) return;
        const m = assessFuzzyPupil(r.raw, roll, taken);
        if(!m) return;
        // With js/name-match.js on the page a guess is only a suggestion: the teacher confirms it
        // ("Did you mean …?"), so a wrong child is never filled in without her seeing it.
        if(window.NameMatch){ if(!r.suggest) r.suggest = { id: m.pupil.id, name: m.pupil.name }; return; }
        r.pupilId = m.pupil.id; r.fuzzy = Math.round(m.score * 100); taken.add(m.pupil.id);
      });
      if(source === 'photo') S.photo = assessLastPhoto;
    }
    return S;
  };
  assessAnalyse.__boosted = true;
}

// ---- 4. the fix-up bar in the photo preview ----
function assessHasMarks(r){ return Array.isArray(r.marks) && r.marks.some(m => m === 'B' || m === 'P' || m === 'A'); }
function assessUseRollOrder(){
  const s = assessSmart; if(!s || s.tally) return;
  const roll = Array.isArray(realPupilsCache) ? realPupilsCache : [];
  const data = s.rows.filter(assessHasMarks);
  if(!roll.length || !data.length) return;
  if(s.rows.some(r => r.pupilId) && !confirm('This replaces the child chosen on each row with the class list in register order, row by row. Continue?')) return;
  s.rows.forEach(r => { if(!assessHasMarks(r)) r.include = false; r.fuzzy = 0; });
  data.forEach((r, i) => { r.pupilId = roll[i] ? roll[i].id : ''; r.include = !!roll[i]; });
  if(data.length !== roll.length) alert('The photo has ' + data.length + ' rows with marks but the class list has ' + roll.length + ' children, so rows may be out of step. Please check every row before saving.');
  renderAssessSmartPreview();
}
function assessUntickUnmatched(){
  const s = assessSmart; if(!s || s.tally) return;
  s.rows.forEach(r => { if(!r.pupilId) r.include = false; });
  renderAssessSmartPreview();
}
async function assessReread(lang){
  const p = assessSmart && assessSmart.photo; if(!p || !p.file) return;
  const panel = assessPanel(); if(!panel) return;
  try{
    assessOcrLangOnce = lang;
    panel.innerHTML = '<p class="sub">Reading the photo again…</p>';
    const grid = await assessOcrGrid(p.file, p.type, panel);
    assessSmart = assessAnalyse(p.type, grid, p.file.name || 'photo', 'photo');
    renderAssessSmartPreview();
  }catch(err){ panel.innerHTML = `<div class="au-error">${esc((err && err.message) || err)}</div>`; }
}
if(typeof renderAssessSmartPreview === 'function' && !renderAssessSmartPreview.__boosted){
  var __aobPreview = renderAssessSmartPreview;
  renderAssessSmartPreview = function(){
    __aobPreview();
    const s = assessSmart, out = assessPanel();
    if(!s || !out || s.tally || s.source !== 'photo' || !Array.isArray(s.rows)) return;
    const box = out.firstElementChild; if(!box) return;
    // note under each approximately matched child
    s.rows.forEach((r, i) => {
      if(!r.fuzzy || !r.pupilId) return;
      const sel = Array.from(out.querySelectorAll('select')).find(x => (x.getAttribute('onchange') || '').startsWith("assessSmartSet('pupil:" + i + "'"));
      if(sel) sel.insertAdjacentHTML('afterend', `<div class="cap" style="color:#8a5a1c;">Matched approximately (${r.fuzzy}%) — please check</div>`);
    });
    const used = s.rows.filter(r => r.include && assessHasMarks(r)).length, matched = s.rows.filter(r => r.include && r.pupilId).length;
    const lang = s.photo && s.photo.lang || 'eng';
    const opt = (v, l) => `<option value="${v}" ${v === lang ? 'selected' : ''}>${l}</option>`;
    box.insertAdjacentHTML('afterbegin', `<div data-ocr-bar style="background:#eef6f1; border:1px solid var(--border); border-radius:8px; padding:10px 12px; margin:0 0 12px; font-size:12.5px;">
      <div style="margin-bottom:6px;"><b>${matched}</b> of <b>${s.rows.length}</b> rows are matched to a child on the class list${used ? ' (' + used + ' have marks)' : ''}. If names came out as nonsense, one of these usually fixes it:</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <button type="button" class="imp-btn" style="min-width:0; height:34px;" onclick="assessUseRollOrder()">📋 Use the class list in register order</button>
        <button type="button" class="imp-btn" style="min-width:0; height:34px;" onclick="assessUntickUnmatched()">☐ Untick rows I couldn’t match</button>
        <span style="display:inline-flex; gap:6px; align-items:center;">Read again as
          <select id="assessRereadLang" style="padding:5px 6px; border:1px solid var(--border); border-radius:6px; font-size:12.5px;">${opt('eng', 'English')}${opt('eng+hin+mar', 'Marathi / Hindi + English')}${opt('eng+guj', 'Gujarati + English')}</select>
          <button type="button" class="imp-btn" style="min-width:0; height:34px;" onclick="assessReread(document.getElementById('assessRereadLang').value)">🔄 Read again</button></span>
      </div></div>`);
  };
  renderAssessSmartPreview.__boosted = true;
}