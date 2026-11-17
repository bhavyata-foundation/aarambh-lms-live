/* =========================================================================
   js/assessment-data-tools.js — 🗂 Manage data, at the foot of each Assessment tab
   -------------------------------------------------------------------------
   Pre-Test · Classroom Observation · Workbook · Fine & Gross Motor each get:

     💾 Save to database — sends every mark on screen for the chosen month
        (Pre-Test: the term) through the tab's own save, then asks the
        database how many it now holds, so every screen and report can fetch
        them. Pre-Test also sends marks kept only in this browser.
     🗑 Delete <tab> marks — <month / term> — says how many marks will go,
        the teacher types the month (or term) to confirm, then ↶ Undo puts
        them back exactly (backend/assessment/clear_assessment.php keeps a
        copy). Only this class, this tab and this month/term are touched.

   Attendance has its own Delete (with Undo) under Class Attendance → Mark
   attendance (js/attendance-clear-month.js).
   Loads after the part files (teacher.html); wraps renderMonthlyAssessment.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof renderMonthlyAssessment !== 'function') return;
  const TYPES = { pretest: 'Pre-Test', observation: 'Classroom Observation', workbook: 'Workbook', motor: 'Fine & Gross Motor' };
  const API = 'backend/assessment/clear_assessment.php';
  const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = () => window.location.search;
  const cid = () => (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_id) || null;
  const term = () => 'TERM_' + (typeof currentAssessTerm === 'function' ? currentAssessTerm() : 1);
  const termName = () => (term() === 'TERM_2' ? 'Term 2' : 'Term 1');
  const months = () => (typeof assessTermMonths === 'function' ? assessTermMonths() : []);
  const T = { month: null, msg: '', busy: false, undo: {} };   // undo: { 'type|scope': { logId, rows } }
  const scopeOf = type => type === 'pretest' ? termName() : (T.month || (typeof currentWorkbookMonth !== 'undefined' && months().includes(currentWorkbookMonth) ? currentWorkbookMonth : months()[0]) || '');
  const post = (url, body) => fetch(url + qs(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async r => { const t = await r.text(); try { return JSON.parse(t); } catch(e){ return { status: 'error', message: r.status === 404 ? 'A server file is missing (' + url.split('/').pop() + ').' : 'The server did not answer properly.' }; } });
  const body = type => Object.assign({ type, class_id: cid() }, type === 'pretest' ? { term: term() } : { month: scopeOf(type) });
  function redraw(){ try { if(typeof monthlyAssessmentTargetEl !== 'undefined' && monthlyAssessmentTargetEl) renderMonthlyAssessment(monthlyAssessmentTargetEl); } catch(e){} }

  // forget what was loaded, so the tab reads the database again
  function reload(type, scope){
    try {
      if(type === 'observation' && typeof observationAssessmentCache !== 'undefined') delete observationAssessmentCache[scope];
      if(type === 'workbook' && typeof workbookChildMarksCache !== 'undefined') delete workbookChildMarksCache[scope];
      if(type === 'motor') motorAssessmentCache = null;
    } catch(e){}
    if(type === 'pretest'){ setTimeout(() => window.location.reload(), 900); return; }   // the Pre-Test keeps its own copy: start clean
    redraw();
  }

  // ---- 💾 Save to database ----
  async function saveAll(type){
    const scope = scopeOf(type), say = m => { T.msg = m; redraw(); };
    T.busy = true;
    try {
      let sent = 0, failed = 0;
      if(type === 'pretest'){
        if(typeof preTestSaveBrowserMarks !== 'function') throw new Error('The Pre-Test database file (pretest-db.js) is not loaded.');
        say('Saving the Pre-Test marks…'); preTestSaveBrowserMarks(); await new Promise(r => setTimeout(r, 2500));
      } else if(type === 'workbook'){
        const marks = []; const c = (typeof workbookChildMarksCache !== 'undefined' && workbookChildMarksCache[scope]) || {};
        // Only marks on a real workbook activity (a numeric page id). Marks that came from an import's sheet columns
        // are saved by that import's Confirm button, which sends the column details along with them.
        Object.entries(c).forEach(([pid, pages]) => Object.entries(pages || {}).forEach(([page, m]) => { if(m && /^\d+$/.test(String(page))) marks.push({ pupil_id: +pid, workbook_page_id: +page, level_mark: m === 'B' ? 'E' : m }); }));
        if(!marks.length) throw new Error('There are no saved Workbook marks to send for ' + scope + '. Marks from an import are saved when you confirm the import.');
        say('Saving ' + marks.length + ' Workbook marks…');
        const d = await post('backend/assessment/workbook/save_workbook_marks_batch.php', { marks });
        if(d.status !== 'success') throw new Error(d.message || 'Not saved.'); sent = marks.length;
      } else {
        const jobs = [];
        if(type === 'observation'){
          const c = (typeof observationAssessmentCache !== 'undefined' && observationAssessmentCache[scope]) || {};
          Object.entries(c).forEach(([pid, items]) => Object.entries(items || {}).forEach(([item, m]) => { if(m && /^\d+$/.test(String(item))) jobs.push(['backend/assessment/observation/save_observation_assessment.php', { pupil_id: +pid, observation_item_id: +item, level_mark: m === 'B' ? 'E' : m }]); }));
        } else {
          const r = (typeof motorAssessmentCache !== 'undefined' && motorAssessmentCache && motorAssessmentCache.ratings) || {};
          Object.entries(r).forEach(([pid, kinds]) => Object.entries(kinds || {}).forEach(([kind, byMonth]) => { const v = (byMonth || {})[scope]; if(v) jobs.push(['backend/assessment/motor/save_motor_rating.php', { class_id: cid(), pupil_id: +pid, skill_type: kind, month: scope, rating: v }]); }));
        }
        if(!jobs.length) throw new Error(type === 'observation' ? 'Nothing to send: the observation marks from an import are already saved in the database.' : 'There are no ' + TYPES[type] + ' marks on screen for ' + scope + '.');
        for(let i = 0; i < jobs.length; i += 4){            // four at a time
          say('Saving ' + TYPES[type] + ' marks… ' + Math.min(i + 4, jobs.length) + ' of ' + jobs.length);
          const res = await Promise.all(jobs.slice(i, i + 4).map(([u, b]) => post(u, b).catch(() => ({ status: 'error' }))));
          res.forEach(d => d.status === 'success' ? sent++ : failed++);
        }
      }
      const c = await post(API, Object.assign({ action: 'count' }, body(type)));
      T.msg = (type === 'pretest' ? 'Saved. ' : sent + ' mark' + (sent === 1 ? '' : 's') + ' sent' + (failed ? ', ' + failed + ' failed — press Save again' : '') + '. ')
        + (c.status === 'success' ? '✓ The database now holds ' + c.rows + ' ' + TYPES[type] + ' mark' + (c.rows === 1 ? '' : 's') + ' for ' + scope + ' — every screen and report reads these.' : '');
      reload(type, scope);
    } catch(e){ T.msg = '⚠ ' + (e.message || e); }
    finally { T.busy = false; redraw(); }
  }

  // ---- 🗑 Delete, with typed confirmation and Undo ----
  async function del(type){
    const scope = scopeOf(type);
    const c = await post(API, Object.assign({ action: 'count' }, body(type)));
    if(c.status !== 'success'){ T.msg = '⚠ ' + (c.message || 'Could not check.'); redraw(); return; }
    if(!c.rows){ T.msg = 'There are no ' + TYPES[type] + ' marks for ' + scope + ' in the database — nothing to delete.'; redraw(); return; }
    const typed = window.prompt(c.rows + ' ' + TYPES[type] + ' mark' + (c.rows === 1 ? '' : 's') + ' of ' + scope + ' will be deleted for this class.\n'
      + 'Other months, other assessments, attendance and the children are not touched, and you can undo it.\n\nType  ' + scope + '  to confirm:');
    if(typed === null) return;
    if(typed.trim().toLowerCase() !== scope.toLowerCase()){ T.msg = 'Not deleted — the word typed was not "' + scope + '".'; redraw(); return; }
    T.busy = true; redraw();
    const d = await post(API, Object.assign({ action: 'delete' }, body(type)));
    T.busy = false;
    if(d.status !== 'success'){ T.msg = '⚠ ' + (d.message || 'Not deleted.'); redraw(); return; }
    T.undo[type + '|' + scope] = { logId: d.log_id, rows: d.rows };
    try { localStorage.setItem('aarambhAssessUndo:' + cid(), JSON.stringify(T.undo)); } catch(e){}
    if(type === 'pretest') clearPreTestCopy();
    T.msg = '🗑 ' + d.rows + ' ' + TYPES[type] + ' mark' + (d.rows === 1 ? '' : 's') + ' of ' + scope + ' deleted.';
    reload(type, scope);
  }
  async function undo(type){
    const scope = scopeOf(type), u = T.undo[type + '|' + scope]; if(!u) return;
    T.busy = true; redraw();
    const d = await post(API, { action: 'undo', type, log_id: u.logId, class_id: cid() });
    T.busy = false;
    if(d.status === 'success' || /already undone/.test(d.message || '')){ delete T.undo[type + '|' + scope]; try { localStorage.setItem('aarambhAssessUndo:' + cid(), JSON.stringify(T.undo)); } catch(e){} }
    T.msg = d.status === 'success' ? '↶ ' + d.rows + ' mark' + (d.rows === 1 ? '' : 's') + ' put back.' : '⚠ ' + (d.message || 'Could not undo.');
    reload(type, scope);
  }
  // the Pre-Test also keeps marks in this browser: forget this class's copy, so they are not saved back
  function clearPreTestCopy(){
    try {
      if(typeof preTestAssessmentEntries === 'undefined' || !Array.isArray(realPupilsCache)) return;
      realPupilsCache.forEach(p => { delete preTestAssessmentEntries[p.name]; delete preTestAssessmentEntries[p.id]; });
      localStorage.setItem('preTestAssessmentEntries', JSON.stringify(preTestAssessmentEntries));
    } catch(e){}
  }

  window.adtSave = t => { if(!T.busy) saveAll(t); };
  window.adtDelete = t => { if(!T.busy) del(t); };
  window.adtUndo = t => { if(!T.busy) undo(t); };
  window.adtMonth = m => { T.month = m; T.msg = ''; redraw(); };

  // ---- the card ----
  const base = renderMonthlyAssessment;
  renderMonthlyAssessment = function(targetEl){
    const out = base.apply(this, arguments);
    try {
      const type = typeof assessmentEntryType !== 'undefined' ? assessmentEntryType : '';
      if(!TYPES[type] || type === 'motor' || type === 'pretest' || type === 'observation' || !targetEl || !cid()) return out; // Fine & Gross Motor and Pre-Test: no Manage data block
      if(!Object.keys(T.undo).length){ try { T.undo = JSON.parse(localStorage.getItem('aarambhAssessUndo:' + cid()) || '{}') || {}; } catch(e){ T.undo = {}; } }
      const old = targetEl.querySelector('[data-adt]'); if(old) old.remove();
      const scope = scopeOf(type), u = T.undo[type + '|' + scope];
      const card = document.createElement('div'); card.className = 'card'; card.setAttribute('data-adt', '');
      card.style.cssText = 'margin-top:18px; padding:16px 18px; border:1px solid var(--border, #D6DCD7);';
      const pick = type === 'pretest' ? `<b>${h(termName())}</b>`
        : `<select onchange="adtMonth(this.value)" style="padding:6px 10px; border:1px solid var(--border, #D6DCD7); border-radius:8px; font:inherit;">${months().map(m => `<option ${m === scope ? 'selected' : ''}>${h(m)}</option>`).join('')}</select>`;
      const btn = (label, fn, style) => `<button type="button" ${T.busy ? 'disabled' : ''} onclick="${fn}('${type}')" style="padding:9px 14px; border-radius:8px; font:inherit; font-size:13.5px; font-weight:700; cursor:pointer; ${style}">${label}</button>`;
      card.innerHTML = `<div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
          <b style="font-size:15px;">🗂 Manage data — ${h(TYPES[type])}</b><span style="font-size:13px;">${type === 'pretest' ? 'Term' : 'Month'}: ${pick}</span></div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
          ${btn('🗑 Delete ' + h(TYPES[type]) + ' marks — ' + h(scope), 'adtDelete', 'border:1px solid #E2A6A0; background:#fff; color:#9B1C1C;')}
          ${u ? btn('↶ Undo — put back ' + u.rows + ' mark' + (u.rows === 1 ? '' : 's'), 'adtUndo', 'border:1px solid #9FD3BB; background:#F3FAF6; color:#1E6B46;') : ''}</div>
        <p class="cap" style="margin:10px 0 0;">Delete removes only this class's ${h(TYPES[type])} marks for ${h(scope)} — you type ${type === 'pretest' ? 'the term' : 'the month'} to confirm, and can undo it.</p>
        ${T.msg ? `<p style="margin:10px 0 0; padding:8px 12px; border-radius:8px; background:${/^⚠/.test(T.msg) ? '#FCE3E1' : '#F3FAF6'}; font-size:13.5px;">${h(T.msg)}</p>` : ''}`;
      targetEl.appendChild(card);
    } catch(e){ console.error('assessment data tools', e); }
    return out;
  };
})();
