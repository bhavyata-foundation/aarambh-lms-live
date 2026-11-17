/* =========================================================================
   ms-ui.js — the screen of marksheet-scan.html
   -------------------------------------------------------------------------
   1. photo (camera or gallery)  2. four corner handles, with a magnifier
   3. rows / columns / skips      4. check-and-correct table, downloads
   Nothing is sent to the portal. Uses window.MarksheetOCR (ms-core.js,
   ms-read.js, ms-samples.js).
   ========================================================================= */
(function(){
  'use strict';
  const MS = window.MarksheetOCR, $ = id => document.getElementById(id);
  const MAX_SIDE = 2000; // big phone photos are scaled down to this first (faster, no loss for marks)
  let src = null;        // { rgba, w, h, canvas }
  let corners = null;    // [[x,y] × 4] in photo pixels: top-left, top-right, bottom-right, bottom-left
  let result = null, learnedFrom = null;
  const enable = (id, on) => $(id).setAttribute('aria-disabled', on ? 'false' : 'true');

  // ---------------- 1. the photo ----------------
  $('takeBtn').onclick = () => $('takeInput').click();
  $('pickBtn').onclick = () => $('pickInput').click();
  $('takeInput').onchange = e => openFile(e.target.files[0]);
  $('pickInput').onchange = e => openFile(e.target.files[0]);
  async function openFile(file){
    if(!file) return;
    try {
      const bmp = await (window.createImageBitmap ? createImageBitmap(file) : new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = URL.createObjectURL(file); }));
      const s = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
      src = { rgba: cv.getContext('2d').getImageData(0, 0, w, h).data, w, h, canvas: cv };
      corners = guessCorners();
      enable('s2', true); enable('s3', true); enable('s4', false); result = null;
      drawPhoto(); $('s2').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    } catch(err){ say('bad', 'This file could not be opened as a photo. Choose a JPG or PNG picture.'); }
  }
  // a first guess at the marks area: the outermost printed lines found, else a margin
  function guessCorners(){
    const { w, h } = src, k = Math.max(1, Math.round(Math.max(w, h) / 700)), sw = Math.round(w / k), sh = Math.round(h / k);
    const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh; cv.getContext('2d').drawImage(src.canvas, 0, 0, sw, sh);
    try {
      const prep = MS.prepare(MS.fromRGBA(cv.getContext('2d').getImageData(0, 0, sw, sh).data, sw, sh)), a = MS.guessArea(prep);
      if(a) return a.map(([x, y]) => [x * k, y * k]);
    } catch(e){}
    const mx = w * 0.06, my = h * 0.06; return [[mx, my], [w - mx, my], [w - mx, h - my], [mx, h - my]];
  }
  $('wholeBtn').onclick = () => { if(!src) return; corners = [[0, 0], [src.w - 1, 0], [src.w - 1, src.h - 1], [0, src.h - 1]]; drawPhoto(); };
  $('guessBtn').onclick = () => { if(!src) return; corners = guessCorners(); drawPhoto(); };

  // ---------------- 2. corners: drag, with a magnifier ----------------
  const photo = $('photo'), loupe = $('loupe');
  function view(){ const r = photo.getBoundingClientRect(); return { r, s: r.width / src.w }; }
  function drawPhoto(){
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = photo.parentElement.clientWidth;
    photo.width = Math.round(W * dpr); photo.height = Math.round(W * src.h / src.w * dpr);
    const cx = photo.getContext('2d'), s = photo.width / src.w;
    cx.drawImage(src.canvas, 0, 0, photo.width, photo.height);
    // dim outside the chosen area, outline it, draw the handles
    cx.save(); cx.fillStyle = 'rgba(0,0,0,.45)'; cx.beginPath(); cx.rect(0, 0, photo.width, photo.height);
    cx.moveTo(corners[0][0] * s, corners[0][1] * s); for(const p of [corners[3], corners[2], corners[1]]) cx.lineTo(p[0] * s, p[1] * s); cx.closePath(); cx.fill('evenodd'); cx.restore();
    cx.strokeStyle = '#3ddc84'; cx.lineWidth = 3 * dpr; cx.beginPath(); corners.forEach((p, i) => i ? cx.lineTo(p[0] * s, p[1] * s) : cx.moveTo(p[0] * s, p[1] * s)); cx.closePath(); cx.stroke();
    corners.forEach(p => { cx.beginPath(); cx.arc(p[0] * s, p[1] * s, 14 * dpr, 0, Math.PI * 2); cx.fillStyle = 'rgba(30,143,94,.85)'; cx.fill(); cx.lineWidth = 3 * dpr; cx.strokeStyle = '#fff'; cx.stroke(); });
  }
  let drag = -1;
  photo.addEventListener('pointerdown', e => {
    if(!src) return; const { r, s } = view(), x = (e.clientX - r.left) / s, y = (e.clientY - r.top) / s;
    let best = -1, bd = Infinity; corners.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if(d < bd){ bd = d; best = i; } });
    if(bd * s < 48){ drag = best; photo.setPointerCapture(e.pointerId); move(e); }
  });
  photo.addEventListener('pointermove', e => { if(drag >= 0) move(e); });
  const end = () => { drag = -1; loupe.style.display = 'none'; };
  photo.addEventListener('pointerup', end); photo.addEventListener('pointercancel', end);
  function move(e){
    const { r, s } = view();
    corners[drag] = [Math.max(0, Math.min(src.w - 1, (e.clientX - r.left) / s)), Math.max(0, Math.min(src.h - 1, (e.clientY - r.top) / s))];
    drawPhoto();
    // magnifier above the finger: 3× the photo around the corner, with a cross
    const [px, py] = corners[drag], lx = loupe.getContext('2d'), Z = 3, half = loupe.width / (2 * Z);
    lx.fillStyle = '#222'; lx.fillRect(0, 0, loupe.width, loupe.height);
    lx.drawImage(src.canvas, px - half, py - half, half * 2, half * 2, 0, 0, loupe.width, loupe.height);
    lx.strokeStyle = '#3ddc84'; lx.lineWidth = 2; lx.beginPath(); lx.moveTo(loupe.width / 2, 0); lx.lineTo(loupe.width / 2, loupe.height); lx.moveTo(0, loupe.height / 2); lx.lineTo(loupe.width, loupe.height / 2); lx.stroke();
    const sx = px * s, sy = py * s; loupe.style.display = 'block'; loupe.style.left = Math.max(0, Math.min(r.width - 120, sx - 60)) + 'px'; loupe.style.top = Math.max(0, sy - 150) + 'px';
  }
  window.addEventListener('resize', () => { if(src) drawPhoto(); });

  // ---------------- 3. read ----------------
  function say(kind, text){ $('status').innerHTML = text ? `<div class="msg ${kind}">${text}</div>` : ''; }
  $('readBtn').onclick = async () => {
    if(!src) return;
    const num = id => { const v = parseInt($(id).value, 10); return v > 0 ? v : undefined; };
    const opts = { rows: num('rows'), cols: num('cols'), skipFirstRow: $('skipRow').checked, skipFirstCol: $('skipCol').checked, useTesseract: $('useTess').checked };
    $('readBtn').disabled = true; $('prog').hidden = false; say('', '');
    const bar = $('prog').firstElementChild; bar.style.width = '0';
    try {
      result = await MS.scan(src.rgba, src.w, src.h, corners, opts, (step, done, total) => {
        bar.style.width = (total ? Math.round(done / total * 100) : 0) + '%';
        $('status').textContent = step + (total > 1 ? ` — ${done} of ${total}` : '') + '…';
      });
      learnedFrom = null;
      if(!result.gridSure) say('bad', 'The grid could not be matched to the printed lines, so every mark is marked to check. For a better read, go back to step 2 and place each handle exactly on a corner of the box of marks (use the magnifier), or type the number of rows and columns.');
      else if(opts.useTesseract && !result.tesseract) say('info', 'The second reader (Tesseract) could not be loaded — no internet? The marks were read without it; more boxes may need a look.');
      else say('', '');
      renderResult(); enable('s4', true); $('s4').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch(err){ say('bad', (err && err.message) || 'The marks could not be read.'); }
    finally { $('readBtn').disabled = false; $('prog').hidden = true; }
  };

  // ---------------- 4. check and correct ----------------
  const LABEL = { B: 'B', P: 'P', A: 'A', '': '–' };
  function renderResult(){
    const R = result, cols = R.cols;
    let h = '<table><thead><tr><th>Child</th>' + Array.from({ length: cols }, (_, c) => `<th>Mark ${c + 1}</th>`).join('') + '</tr></thead><tbody>';
    R.cells.forEach((row, r) => {
      h += `<tr class="${row.some(c => c.check) ? 'has-check' : 'no-check'}"><td class="who">Child ${r + 1}</td>`;
      row.forEach((cell, c) => {
        h += `<td><div class="cell${cell.check ? ' check' : ''}" data-r="${r}" data-c="${c}">`
          + (cell.thumb ? `<img src="${cell.thumb}" alt="Handwriting in row ${r + 1}, mark ${c + 1}">` : '')
          + '<div class="pick" role="group" aria-label="Mark">' + ['B', 'P', 'A', ''].map(v => `<button type="button" data-v="${v}" aria-pressed="${cell.mark === v}" title="${v ? v : 'No mark'}">${LABEL[v]}</button>`).join('') + '</div>'
          + (cell.check ? `<div class="why">${cell.why ? cell.why.replace(/</g, '&lt;') : 'not sure'} — check</div>` : '')
          + '</div></td>';
      });
      h += '</tr>';
    });
    $('tablewrap').innerHTML = h + '</tbody></table>';
    summary(); drawGrid(); learnedLine(); $('after').innerHTML = '';
  }
  $('tablewrap').addEventListener('click', e => {
    const b = e.target.closest('.pick button'); if(!b) return;
    const box = b.closest('.cell'), cell = result.cells[+box.dataset.r][+box.dataset.c];
    if(cell.original === undefined) cell.original = cell.mark;
    cell.mark = b.dataset.v;
    box.querySelectorAll('.pick button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === cell.mark)));
    box.classList.toggle('changed', cell.mark !== cell.original);
    if(cell.check){ cell.check = false; box.classList.remove('check'); const w = box.querySelector('.why'); if(w) w.remove(); } // looked at = checked
    summary(); learnedFrom = null;
  });
  $('onlyCheck').onchange = e => $('tablewrap').classList.toggle('only-check', e.target.checked);
  function summary(){
    const all = result.cells.flat(), n = v => all.filter(c => c.mark === v).length, toCheck = all.filter(c => c.check).length, changed = all.filter(c => c.original !== undefined && c.mark !== c.original).length;
    $('summary').innerHTML = `<span><b>${result.rows}</b> children × <b>${result.cols}</b> marks</span>`
      + `<span>B <b>${n('B')}</b> · P <b>${n('P')}</b> · A <b>${n('A')}</b> · no mark <b>${n('')}</b></span>`
      + `<span>${toCheck ? `<b style="color:#a36b00">${toCheck}</b> to check` : '<b>All checked</b>'}</span>`
      + (changed ? `<span><b>${changed}</b> corrected</span>` : '')
      + `<span style="color:var(--muted)">${result.grid.fromLines ? 'Grid from the printed lines' : 'Grid split evenly — check it below'} · ${(result.timeMs / 1000).toFixed(1)} s${result.tesseract ? ' · second reader on' : ''}</span>`;
  }
  function drawGrid(){
    const P = result.image, cv = $('gridview'); cv.width = P.w; cv.height = P.h;
    const cx = cv.getContext('2d'), id = cx.createImageData(P.w, P.h);
    for(let i = 0; i < P.w * P.h; i++){ const v = P.norm.d[i]; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    cx.putImageData(id, 0, 0); cx.strokeStyle = '#e03131'; cx.lineWidth = 2;
    result.grid.ys.forEach(y => { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(P.w, y); cx.stroke(); });
    result.grid.xs.forEach(x => { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, P.h); cx.stroke(); });
  }
  function learnedLine(){
    const n = MS.learnedCount();
    $('learnedLine').innerHTML = n ? `This device knows <b>${n}</b> of your handwritten marks and uses them when reading. <button type="button" id="forgetBtn">Forget them</button>` : 'When the marks are correct, tap the green button: this device will learn your handwriting and read it better next time.';
    const f = $('forgetBtn'); if(f) f.onclick = () => { MS.forgetLearned(); learnedLine(); };
  }
  $('confirmBtn').onclick = () => {
    if(!result) return;
    const left = result.cells.flat().filter(c => c.check).length;
    if(left && !confirm(left + ' mark' + (left === 1 ? ' is' : 's are') + ' still marked to check. Remember them as they are?')) return;
    if(learnedFrom === result){ $('after').innerHTML = '<div class="msg ok">Already remembered.</div>'; return; }
    const n = MS.learn(result); learnedFrom = result;
    $('after').innerHTML = `<div class="msg ok">Remembered ${n} of your marks on this device. Download the marks below to keep them — nothing has been saved to the portal.</div>`;
    learnedLine();
  };
  function download(name, text, type){ const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  $('csvBtn').onclick = () => {
    if(!result) return;
    const lines = [['Child', ...Array.from({ length: result.cols }, (_, c) => 'Mark ' + (c + 1))].join(',')].concat(result.cells.map((row, r) => ['Child ' + (r + 1), ...row.map(c => c.mark)].join(',')));
    download('marksheet-scan-' + stamp() + '.csv', '\ufeff' + lines.join('\r\n'), 'text/csv');
  };
  $('jsonBtn').onclick = () => {
    if(!result) return;
    download('marksheet-scan-' + stamp() + '.json', JSON.stringify({ scannedAt: new Date().toISOString(), rows: result.rows, cols: result.cols, toCheck: result.cells.flat().filter(c => c.check).length, marks: MS.toRows(result) }, null, 1), 'application/json');
  };
  learnedLine();
  window.__marksheetScanState = () => ({ corners, size: src && [src.w, src.h] }); // read-only, for checking the page
})();
