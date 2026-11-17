/* =========================================================================
   js/ai-photo-reader.js — "🤖 AI scan": a photo of a register or marksheet,
   read by AI (Claude), into an Excel sheet and the portal's import
   -------------------------------------------------------------------------
   Next to 📷 Scan a photo on every Import card (Class Attendance and the
   assessment tabs: Pre-Test, Observation, Workbook, Fine & Gross Motor):
     1. the teacher takes / chooses a photo; it is made smaller in the browser
        (about 2,000 px — enough to read, quicker and cheaper);
     2. backend/ai/read_photo.php sends it to Claude with the class list and,
        for assessments, the exact column headings; Claude returns the table;
     3. a preview shows what was read, with any note about unclear parts:
          ⬇ Download Excel  ·  ✓ Import this  ·  Cancel
     4. "Import this" goes into the SAME import as an uploaded file — the
        children are matched and the teacher checks the preview before
        anything is saved.
   The API key is only on the server (backend/ai/ai_config.php).
   Loads after the part files (teacher.html).
   ========================================================================= */
(function(){
  'use strict';
  if(typeof importButtonsHtml !== 'function') return;
  const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const KIND_LABEL = { attendance: 'attendance register', pretest: 'Pre-Test marksheet', observation: 'Classroom Observation marksheet', workbook: 'Workbook marksheet', motor: 'Fine & Gross Motor marksheet' };

  // ---- the button, next to 📷 Scan a photo ----
  const baseButtons = importButtonsHtml;
  importButtonsHtml = function(photoCall){
    const html = baseButtons.apply(this, arguments);
    const m = String(photoCall || '').match(/smartImportPhoto\('attendance'\)|assessSmartChoose\('([a-z]+)'/);
    if(!m) return html;                                   // the class-list card: no AI scan (yet)
    const kind = m[1] || 'attendance';
    if(!KIND_LABEL[kind]) return html;
    const btn = `<button type="button" class="imp-btn" title="A photo of the ${KIND_LABEL[kind]}, read by AI into an Excel sheet" onclick="impSetActive(this); aiScanPhoto('${kind}')">🤖 AI scan</button>`;
    return html.replace(/(<button[^>]*>📷 Scan a photo<\/button>)/, '$1' + btn);
  };

  // ---- a smaller JPG of the photo (longest side 2,000 px) ----
  function shrink(file){
    return new Promise((ok, no) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 2000, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.onerror = () => { URL.revokeObjectURL(url); no(new Error('This photo could not be opened. HEIC photos (iPhone) — save or share it as a JPG and try again.')); };
      img.src = url;
    });
  }
  function pickPhoto(){
    return new Promise(ok => {
      const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.setAttribute('capture', 'environment');
      input.onchange = () => ok(input.files[0] || null); input.click();
    });
  }

  // ---- what the AI is told about this class / sheet ----
  function context(kind){
    const kids = (Array.isArray(realPupilsCache) ? realPupilsCache : []).map(p => ({ reg: p.register_no || '', name: p.name }));
    if(kind === 'attendance'){
      const y = typeof markAttYear === 'number' ? markAttYear : new Date().getFullYear(), m = typeof markAttMonth === 'number' ? markAttMonth : new Date().getMonth();
      return { children: kids, month: MONTHS[m], year: y, days: new Date(y, m + 1, 0).getDate() };
    }
    const targets = typeof assessTargets === 'function' ? (assessTargets(kind) || []) : [];
    return { children: kids, columns: targets.map(t => t.label) };
  }

  // ---- the window that shows what was read ----
  function modal(){
    let m = document.getElementById('aiScanModal');
    if(!m){
      m = document.createElement('div'); m.id = 'aiScanModal';
      m.style.cssText = 'position:fixed; inset:0; z-index:9000; background:rgba(20,30,25,.45); display:flex; align-items:center; justify-content:center; padding:16px;';
      document.body.appendChild(m);
    }
    m.innerHTML = '<div role="dialog" aria-modal="true" style="background:var(--surface, #fff); border-radius:14px; width:min(1100px, 100%); max-height:92vh; overflow:auto; padding:18px 20px; box-shadow:0 12px 40px rgba(0,0,0,.25);"></div>';
    m.style.display = 'flex';
    return m.firstChild;
  }
  window.aiScanClose = () => { const m = document.getElementById('aiScanModal'); if(m) m.style.display = 'none'; };

  let last = null;   // { kind, grid, name }
  window.aiScanPhoto = async function(kind, givenFile){
    const file = givenFile || await pickPhoto(); if(!file) return;
    const box = modal();
    box.innerHTML = `<h3 style="margin:0 0 6px;">🤖 Reading the ${h(KIND_LABEL[kind])}…</h3><p class="cap" style="margin:0;">The AI is reading the photo. This takes about 10–40 seconds — keep this page open.</p>`;
    try {
      const image = await shrink(file).catch(() => new Promise((ok, no) => {   // no canvas: send it as it is
        if(file.size > 5 * 1024 * 1024) return no(new Error('This photo is too large — take it again at a lower resolution.'));
        const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => no(new Error('The photo could not be read.')); r.readAsDataURL(file); }));
      const res = await fetch('backend/ai/read_photo.php' + window.location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, image, media_type: 'image/jpeg', context: context(kind) }) });
      const d = await res.json().catch(() => ({ status: 'error', message: 'The server did not answer (HTTP ' + res.status + ').' }));
      if(d.status !== 'success') throw new Error(d.message || 'The photo could not be read.');
      last = { kind, grid: d.grid, name: (file.name || 'photo').replace(/\.[a-z0-9]+$/i, '') };
      show(box, d);
    } catch(e){
      box.innerHTML = `<h3 style="margin:0 0 6px;">The photo could not be read</h3><div class="au-error" style="margin:8px 0;">${h(e.message || e)}</div>
        <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;"><button type="button" class="imp-btn" onclick="aiScanClose()">Close</button><button type="button" class="imp-btn" onclick="aiScanClose(); aiScanPhoto('${kind}')">Try another photo</button></div>`;
    }
  };

  function show(box, d){
    const g = last.grid, head = g[0] || [], rows = g.slice(1);
    // colours: register P green · A (absent) red · H grey;  marksheet B red · P yellow · A (Advanced) green;  motor R · Y · G
    const COL = last.kind === 'attendance' ? { P: '#DDF2E5', A: '#FCE3E1', H: '#EEF1EE' }
              : last.kind === 'motor' ? { R: '#FCE3E1', Y: '#FFF1CC', G: '#DDF2E5', AB: '#EEF1EE' }
              : { B: '#FCE3E1', P: '#FFF1CC', A: '#DDF2E5', AB: '#EEF1EE' };
    const mark = v => COL[String(v || '').trim().toUpperCase()] || '';
    const table = `<div style="overflow:auto; max-height:52vh; border:1px solid #E3E7E3; border-radius:10px;"><table class="report-table" style="width:100%; font-size:12px;"><thead><tr>${head.map(c => `<th style="white-space:nowrap; position:sticky; top:0; background:var(--surface, #fff);">${h(c)}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(r => `<tr>${head.map((_, i) => { const v = r[i] == null ? '' : r[i], bg = i > 1 ? mark(v) : ''; return `<td style="${i < 2 ? 'text-align:left; white-space:nowrap;' : 'text-align:center;'}${bg ? ' background:' + bg + ';' : ''}">${h(v)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    const empty = rows.reduce((n, r) => n + head.slice(2).filter((_, i) => !String(r[i + 2] || '').trim()).length, 0);
    box.innerHTML = `<div style="display:flex; justify-content:space-between; gap:10px; align-items:baseline; flex-wrap:wrap;"><h3 style="margin:0;">🤖 Read from the photo — ${h(KIND_LABEL[last.kind])}</h3><span class="cap" style="margin:0;">${rows.length} children · ${Math.max(0, head.length - 2)} columns${empty ? ' · ' + empty + ' empty cells' : ''}</span></div>
      ${d.notes ? `<p style="margin:8px 0; padding:8px 12px; border-radius:8px; background:#FFF7D6; font-size:13px;"><b>The AI noted:</b> ${h(d.notes)}</p>` : ''}
      <p class="cap" style="margin:6px 0 10px;">Check it against the paper. Nothing is saved yet: <b>Import this</b> opens the usual import preview, where the children are matched and you confirm. Or download it as Excel to correct it first, then use <b>📥 Import a file</b>.</p>
      ${table}
      <div style="display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; margin-top:14px;">
        <button type="button" class="imp-btn" onclick="aiScanClose()">Cancel</button>
        <button type="button" class="imp-btn" onclick="aiScanDownload()">⬇ Download Excel</button>
        <button type="button" class="imp-btn" style="background:var(--primary); color:#fff; border-color:var(--primary);" onclick="aiScanImport()">✓ Import this</button></div>`;
  }

  function workbook(){
    if(typeof XLSX === 'undefined') throw new Error('The spreadsheet tool did not load — check the internet and try again.');
    const wb = XLSX.utils.book_new(), g = last.grid.slice();
    if(last.kind === 'attendance'){ const c = context('attendance'); g.unshift(['Attendance ' + c.month + ' ' + c.year]); }   // the month, as a register has it
    const ws = XLSX.utils.aoa_to_sheet(g);
    ws['!cols'] = (last.grid[0] || []).map((_, i) => ({ wch: i === 1 ? 26 : i === 0 ? 12 : 6 }));
    XLSX.utils.book_append_sheet(wb, ws, last.kind === 'attendance' ? 'Attendance' : 'Marks');
    return wb;
  }
  const fileName = () => 'AI-scan_' + last.kind + '_' + (typeof myClassInfo !== 'undefined' && myClassInfo.class_name ? myClassInfo.class_name.replace(/\s+/g, '-') : 'class') + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
  window.aiScanDownload = () => { try { XLSX.writeFile(workbook(), fileName()); } catch(e){ alert(e.message || e); } };
  window.aiScanImport = async () => {
    try {
      if(last.kind === 'attendance'){
        if(typeof smartImportFromFile !== 'function') throw new Error('The attendance import is not available on this page.');
        const buf = XLSX.write(workbook(), { type: 'array', bookType: 'xlsx' });
        const file = new File([buf], fileName(), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        if(typeof file.arrayBuffer !== 'function') file.arrayBuffer = () => Promise.resolve(buf);   // older browsers
        aiScanClose();
        await smartImportFromFile('attendance', file);
      } else {
        if(typeof assessAnalyse !== 'function' || typeof renderAssessSmartPreview !== 'function') throw new Error('The assessment import is not available on this page.');
        aiScanClose();
        assessSmart = assessAnalyse(last.kind, last.grid, fileName(), 'photo');
        renderAssessSmartPreview();
        const p = typeof assessPanel === 'function' ? assessPanel() : null; if(p && p.scrollIntoView) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch(e){ alert(e.message || e); }
  };
})();
