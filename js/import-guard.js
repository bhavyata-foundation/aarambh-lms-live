/* =========================================================================
   js/import-guard.js — safer imports: "already imported?" and "correct the name"
   -------------------------------------------------------------------------
   Loads AFTER assess-import-checks.js, workbook-import-fix.js, attendance-import-month.js
   and name-match.js (teacher.html). Wraps their functions by name; nothing else changes.

   1. SAME DATA IMPORTED AGAIN — every import that is saved leaves a small record in the
      database (class records, kind "import_log"): what it was, when, how many children and
      marks. The next time the SAME data is about to be saved again (a re-uploaded file, the
      same photo read twice, even a renamed copy — it compares the marks, not the file name):
        • a yellow warning is shown in the preview, and
        • pressing Confirm opens an alert: "This was already imported on 14 Oct 2026, 11:20 —
          24 children, 312 marks. Saving it again adds nothing new."
          [Cancel — don't import again]   [Import again anyway]
      Works for the attendance import and for every Assessment import (Pre-Test, Observation,
      Workbook, Motor, class counts).

   2. NAMES IN ASSESSMENT IMPORTS — (attendance already has this.) Where the spelling in the
      file differs from the roll:
        • "Correct the name on the roll to: [ … ]" — tick it and the child's name is changed
          in the database (backend/pupils/roll_tools.php, only the name), and the old spelling
          is remembered so files written the old way still match. Not ticked: the roll keeps
          its spelling and the file's spelling is remembered (as before).
        • a row that matches nobody gets "Type the correct name [ … ] [Find]".
   ========================================================================= */
(function(){
  'use strict';
  const NOW = () => new Date().toISOString();
  const esc2 = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------- small helpers
  function hash(str){ // cyrb53 — a short, stable fingerprint of the marks
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for(let i = 0; i < str.length; i++){ const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  const when = iso => { try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch(e){ return iso; } };
  const plainName = s => (window.NameMatch ? NameMatch.plain(s) : String(s || '').toLowerCase().replace(/\s+/g, ' ').trim());

  // ---------------------------------------------------------------- the log of earlier imports (database)
  const store = {};            // key → { k: kind, what, n: children, m: marks, at }
  if(typeof classRecordsSync === 'function') classRecordsSync('import_log', store);
  const remember = (key, meta) => { store[key] = meta; if(typeof classRecordSave === 'function') classRecordSave('import_log', key, meta); };

  // ---------------------------------------------------------------- the alert (a real dialog, not a plain confirm)
  function dialog(title, bodyHtml, buttons){
    return new Promise(resolve => {
      const back = document.createElement('div');
      back.style.cssText = 'position:fixed; inset:0; background:rgba(20,30,25,.55); z-index:100000; display:flex; align-items:center; justify-content:center; padding:16px;';
      const box = document.createElement('div');
      box.setAttribute('role', 'alertdialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', title);
      box.style.cssText = 'background:#fff; color:#1d2b22; border-radius:14px; max-width:460px; width:100%; padding:20px 22px; box-shadow:0 12px 40px rgba(0,0,0,.3); font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;';
      box.innerHTML = `<div style="font-size:17px; font-weight:700; margin:0 0 8px;">⚠️ ${esc2(title)}</div><div>${bodyHtml}</div><div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap; margin-top:16px;"></div>`;
      const row = box.lastElementChild;
      const done = v => { document.removeEventListener('keydown', onKey, true); back.remove(); resolve(v); };
      buttons.forEach(b => {
        const el = document.createElement('button'); el.type = 'button'; el.textContent = b.label;
        el.style.cssText = 'padding:10px 16px; border-radius:9px; font:inherit; font-weight:600; cursor:pointer; min-height:42px; border:1px solid ' + (b.primary ? '#1e8f5e' : '#c9d4cd') + '; background:' + (b.primary ? '#1e8f5e' : '#fff') + '; color:' + (b.primary ? '#fff' : '#1d2b22') + ';';
        el.onclick = () => done(b.value); row.appendChild(el); b.el = el;
      });
      const onKey = e => { if(e.key === 'Escape'){ e.stopPropagation(); done(false); } };
      document.addEventListener('keydown', onKey, true);
      back.appendChild(box); document.body.appendChild(back);
      (buttons.find(b => b.focus) || buttons[0]).el.focus(); // the safe choice has focus, so Enter never re-imports by accident
    });
  }
  const repeatBody = hit => `<p style="margin:0 0 8px;"><b>This was already imported</b> on <b>${esc2(when(hit.at))}</b>:<br>${esc2(hit.what)} — ${hit.n} ${hit.n === 1 ? 'child' : 'children'}, ${hit.m} ${hit.m === 1 ? 'mark' : 'marks'}.</p>`
    + `<p style="margin:0;">The data in this file is exactly the same, so saving it again adds nothing new: the same marks are written over themselves. Import it again only if marks were changed by hand after that import and you want the file to put them back.</p>`;
  async function askRepeat(hit){
    return dialog('Same data imported before', repeatBody(hit), [
      { label: 'Cancel — don’t import again', value: false, primary: true, focus: true },
      { label: 'Import again anyway', value: true }
    ]);
  }
  const banner = hit => `<div data-ig-repeat style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:9px 11px; margin:0 0 10px; font-size:13px; line-height:1.45;"><b>⚠ Already imported.</b> This is the same data as the import on ${esc2(when(hit.at))} (${esc2(hit.what)}, ${hit.n} ${hit.n === 1 ? 'child' : 'children'}, ${hit.m} ${hit.m === 1 ? 'mark' : 'marks'}). Saving it again adds nothing new.</div>`;

  // ---------------------------------------------------------------- fingerprints
  // Attendance: who (child on the roll, else the typed name) · date · present/absent.
  function attFingerprint(){
    try {
      const c = smartImport && smartImport.collected; if(!c || !c.byName) return null;
      const typed = r => ((smartImport.nameEdit || {})[r.name]) || r.name;
      const lines = []; const kids = new Set(); const dates = [];
      Object.values(c.byName).forEach(r => {
        const who = r._pupil ? 'p' + r._pupil.id : 'n' + plainName(typed(r));
        Object.entries(r.attendance || {}).forEach(([d, m]) => { if(m === 'present' || m === 'absent'){ lines.push(who + '|' + d + '|' + m); kids.add(who); dates.push(d); } });
      });
      if(!lines.length) return null;
      dates.sort();
      const range = dates[0] === dates[dates.length - 1] ? dates[0] : dates[0] + ' to ' + dates[dates.length - 1];
      return { key: 'att-' + hash(lines.sort().join('\n')), meta: { k: 'attendance', what: 'Attendance, ' + range, n: kids.size, m: lines.length, at: NOW() } };
    } catch(e){ return null; }
  }
  // Assessments: child · column (activity / month / book page) · mark — or, for class counts, the counts.
  const TYPE_LABEL = { workbook: 'Workbook', observation: 'Classroom Observation', pretest: 'Pre-Test', motor: 'Fine & Gross Motor' };
  function assessFingerprint(s){
    try {
      if(!s) return null;
      const lines = []; const kids = new Set();
      if(s.tally){
        s.rows.forEach(r => { if(r.include && r.target) lines.push(['t', r.target, r.b, r.p, r.a].join('|')); });
      } else {
        s.rows.forEach(r => {
          if(!r.include || !r.pupilId) return;
          r.marks.forEach((m, j) => { const col = s.columns[j] && s.columns[j].target; if(col && m && m !== '?'){ lines.push(r.pupilId + '|' + col + '|' + m); kids.add(r.pupilId); } });
        });
      }
      if(!lines.length) return null;
      const month = (s.type === 'motor' || s.type === 'pretest') ? '' : (typeof currentWorkbookMonth === 'string' ? currentWorkbookMonth : '');
      const scope = [s.type, month, s.workbookName || ''].join('|');
      const what = (TYPE_LABEL[s.type] || s.type) + (month ? ', ' + month : '') + (s.workbookName ? ', ' + s.workbookName : '') + (s.tally ? ' (class counts)' : '');
      return { key: 'as-' + s.type + '-' + hash(scope + '\n' + lines.sort().join('\n')), meta: { k: s.type, what, n: s.tally ? lines.length : kids.size, m: lines.length, at: NOW() } };
    } catch(e){ return null; }
  }

  // ---------------------------------------------------------------- 1a. attendance import
  let attBusy = false;
  if(typeof confirmSmartImport === 'function'){
    const baseAtt = confirmSmartImport;
    window.confirmSmartImport = confirmSmartImport = async function(){
      if(attBusy) return; attBusy = true;
      try {
        const fp = attFingerprint();
        if(fp && store[fp.key] && !(await askRepeat(store[fp.key]))) return;
        await baseAtt.apply(this, arguments);
        if(fp && typeof smartImport !== 'undefined' && smartImport === null) remember(fp.key, fp.meta); // the import finished (it clears its own state)
      } finally { attBusy = false; }
    };
  }
  if(typeof renderSmartImportPreview === 'function'){
    const basePrev = renderSmartImportPreview;
    window.renderSmartImportPreview = renderSmartImportPreview = function(){
      const out = basePrev.apply(this, arguments);
      try {
        const fp = attFingerprint(), hit = fp && store[fp.key];
        const panel = document.querySelector('[data-si-panel]');
        if(hit && panel && !panel.querySelector('[data-ig-repeat]')) panel.insertAdjacentHTML('afterbegin', banner(hit));
      } catch(e){}
      return out;
    };
  }

  // ---------------------------------------------------------------- 1b + 2. assessment imports
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const rollPupil = id => (Array.isArray(realPupilsCache) ? realPupilsCache : []).find(p => String(p.id) === String(id));

  window.igFixToggle = function(i, on){ const r = assessSmart && assessSmart.rows[+i]; if(!r) return; r.fixRoll = !!on; if(on && !r.newName) r.newName = clean(r.raw); renderAssessSmartPreview(); };
  window.igFixName = function(i, v){ const r = assessSmart && assessSmart.rows[+i]; if(r){ r.newName = v; r.fixRoll = true; } };
  window.igFind = function(i){
    const s = assessSmart, r = s && s.rows[+i]; if(!r) return;
    const inp = document.getElementById('igType' + i), msg = document.getElementById('igMsg' + i);
    const typed = clean(inp && inp.value); if(!typed){ if(msg) msg.textContent = 'Type the child’s name first.'; return; }
    const taken = new Set(s.rows.filter((x, k) => k !== +i && x.include && x.pupilId).map(x => x.pupilId));
    const m = window.NameMatch ? NameMatch.find(typed, { taken }) : { pupil: null };
    if(m.pupil){ r.raw = r.raw || typed; r.pupilId = m.pupil.id; r.matchedHow = m.how === 'suggest' ? 'chosen' : m.how; r.typedName = typed; renderAssessSmartPreview(); return; }
    if(msg) msg.textContent = 'No child on the roll matches “' + typed + '”. Pick the child from the list, or add the child in Class Attendance → Admissions.';
  };

  if(typeof renderAssessSmartPreview === 'function'){
    const basePrev2 = renderAssessSmartPreview;
    window.renderAssessSmartPreview = renderAssessSmartPreview = function(){
      const out0 = basePrev2.apply(this, arguments);
      try {
        const s = assessSmart, panel = document.getElementById('assessSmartPanel'); if(!s || !panel) return out0;
        // a. the same data was imported before
        const fp = assessFingerprint(s), hit = fp && store[fp.key];
        if(hit && !panel.querySelector('[data-ig-repeat]')){ const inner = panel.firstElementChild; if(inner) inner.insertAdjacentHTML('afterbegin', banner(hit)); }
        // b. names: correct the roll, or type the right name
        if(!s.tally && s.source !== 'manual'){
          const trs = panel.querySelectorAll('table.report-table tbody tr');
          s.rows.forEach((r, i) => {
            const cell = trs[i] && trs[i].children[1]; if(!cell || !r.include || !clean(r.raw)) return;
            const p = r.pupilId ? rollPupil(r.pupilId) : null;
            const wrap = document.createElement('div'); wrap.setAttribute('data-ig-name', i); wrap.style.cssText = 'margin-top:6px; font-size:12px; line-height:1.4;';
            if(p && plainName(p.name) !== plainName(r.raw)){
              const on = !!r.fixRoll, val = r.newName != null ? r.newName : clean(r.raw);
              wrap.style.color = '#24507a';
              wrap.innerHTML = `Roll: <b>${esc2(p.name)}</b> · file: <b>${esc2(clean(r.raw))}</b><br>`
                + `<label style="display:inline-flex; gap:6px; align-items:center; cursor:pointer;"><input type="checkbox" ${on ? 'checked' : ''} onchange="igFixToggle(${i}, this.checked)"> Correct the name on the roll to:</label> `
                + `<input type="text" value="${esc2(val)}" ${on ? '' : 'disabled'} onchange="igFixName(${i}, this.value)" style="padding:3px 6px; border:1px solid var(--border,#ccc); border-radius:6px; font-size:12px; width:170px; max-width:100%;">`
                + `<div class="cap" style="margin-top:2px;">${on ? 'The name is changed in the database when you confirm; the old spelling is still remembered.' : 'Not ticked: the roll keeps “' + esc2(p.name) + '” and this spelling is remembered.'}</div>`;
              cell.appendChild(wrap);
            } else if(!r.pupilId){
              wrap.style.color = '#8a5a1c';
              wrap.innerHTML = `Not on the roll — type the correct name: <input id="igType${i}" type="text" value="${esc2(r.typedName || '')}" placeholder="e.g. Avani Shinde" style="padding:3px 6px; border:1px solid var(--border,#ccc); border-radius:6px; font-size:12px; width:150px; max-width:100%;"> `
                + `<button type="button" class="btn" onclick="igFind(${i})" style="padding:3px 10px; font-size:12px;">Find</button><span id="igMsg${i}" style="display:block; margin-top:2px;"></span>`;
              cell.appendChild(wrap);
            }
          });
        }
      } catch(e){ console.warn('import-guard preview:', e); }
      return out0;
    };
  }

  // Change the names on the roll the teacher asked for, BEFORE the marks are saved. Returns false to stop the import.
  async function applyRollFixes(s){
    const rows = s.rows.filter(r => !s.tally && r.include && r.pupilId && r.fixRoll && clean(r.newName));
    const panel = document.getElementById('assessSmartPanel');
    const fail = msg => { if(panel) panel.insertAdjacentHTML('beforeend', `<div class="au-error" data-assess-save-error>${esc2(msg)}</div>`); return false; };
    let renamed = 0;
    for(const r of rows){
      const p = rollPupil(r.pupilId); if(!p) continue;
      const name = clean(r.newName); if(plainName(name) === plainName(p.name)) continue;
      const call = confirmLook => fetch('backend/pupils/roll_tools.php' + window.location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', class_id: myClassInfo.class_id, pupil_id: p.id, name, confirm_lookalike: !!confirmLook }) }).then(res => res.json().catch(() => ({ status: 'error', message: 'The server did not answer properly.' })));
      let d = await call(false);
      if(d.code === 'lookalike'){ if(!window.confirm(d.message || 'This name sounds like another child. Rename anyway?')) return fail('Nothing was saved. The name “' + name + '” was not used.'); d = await call(true); }
      if(d.status !== 'success') return fail('Nothing was saved. The name could not be corrected (' + p.name + ' → ' + name + '): ' + (d.message || 'the server refused it') + '. Untick “Correct the name on the roll” for that row, or fix the name, and confirm again.');
      renamed++;
      if(window.NameMatch){ NameMatch.remember(p.name, { id: p.id, name }); }
      // Pre-Test marks on this screen are kept under the child's name: move them to the new name
      try { if(typeof preTestAssessmentEntries === 'object' && preTestAssessmentEntries[p.name] && !preTestAssessmentEntries[name]){ preTestAssessmentEntries[name] = preTestAssessmentEntries[p.name]; delete preTestAssessmentEntries[p.name]; } } catch(e){}
      r.fixRoll = false;
    }
    if(renamed){ realPupilsCache = null; await fetchMyPupils(); if(!Array.isArray(realPupilsCache)) return fail('The names were corrected, but the roll could not be reloaded — press Confirm again (nothing is changed twice).'); }
    return true;
  }

  let asBusy = false;
  if(typeof assessSmartConfirm === 'function'){
    const baseAs = assessSmartConfirm;
    window.assessSmartConfirm = assessSmartConfirm = async function(){
      if(asBusy) return; asBusy = true;
      try {
        const s = assessSmart; if(!s) return baseAs.apply(this, arguments);
        const fp = assessFingerprint(s);
        if(fp && store[fp.key] && !(await askRepeat(store[fp.key]))) return;      // 1. same data before → ask
        if(!(await applyRollFixes(s))) return;                                    // 2. names corrected in the database first
        const fp2 = assessFingerprint(assessSmart) || fp;                         // (the names may have changed, the marks have not)
        await baseAs.apply(this, arguments);
        if(fp2 && assessSmart === null) remember(fp2.key, fp2.meta);              // 3. it finished (it clears its own state) → keep a record
      } finally { asBusy = false; }
    };
  }

  window.ImportGuard = { hash, attFingerprint, assessFingerprint, log: store };
  if(typeof module !== 'undefined') module.exports = window.ImportGuard;
})();