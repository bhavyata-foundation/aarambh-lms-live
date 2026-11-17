/* =========================================================================
   js/pretest-db.js — Pre-Test saved in the DATABASE (not only the browser)
   -------------------------------------------------------------------------
   Loads after the part files and pretest-levels.js (teacher.html).
   • When the Pre-Test tab opens, the class's marks for the chosen term are
     loaded from the database and shown (the database wins over the browser).
   • Every change — a tap, a clear, an import — is saved to the database
     (backend/assessment/pretest/save_pretest_marks.php), with the activity's
     own name, CG and page, so Jr KG and Sr KG are each stored correctly.
   • Marks that exist ONLY in this browser (entered before this file was
     installed) are offered with one button: "Save them to the database".
   • The browser copy is kept as a back-up, so nothing is lost if the
     internet drops; a failed save is retried.
   Tables: backend/sql/pretest_assessments.sql.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof savePreTestAssessmentEntries !== 'function' || typeof preTestAssessmentEntries === 'undefined') return;
  const API = 'backend/assessment/pretest/';
  const st = { key: null, loading: false, error: '', errorKey: null, errorAt: 0, synced: {}, rescue: new Set(), rescueAccepted: false, saving: false, lastSaved: null, failed: false };
  const term = () => 'TERM_' + (typeof currentAssessTerm === 'function' ? currentAssessTerm() : 1);
  const classId = () => (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_id) || null;
  const kids = () => (Array.isArray(realPupilsCache) ? realPupilsCache : []);
  const qs = () => (window.location.search ? '&' + window.location.search.slice(1) : '');
  const nAct = () => WEEKLY_ASSESSMENT_ACTIVITIES.length;
  const redraw = () => { try { if(typeof monthlyAssessmentTargetEl !== 'undefined' && monthlyAssessmentTargetEl) renderMonthlyAssessment(monthlyAssessmentTargetEl); } catch(e){} };

  // The marks that differ between this browser and the database (this class's children only).
  function differences(){
    const out = [];
    kids().forEach(p => {
      const b = preTestAssessmentEntries[p.name] || {}, d = st.synced[p.id] || {};
      for(let i = 1; i <= nAct(); i++){ const g = b[String(i - 1)] || null, dg = d[i] || null; if(g !== dg) out.push({ p, act: i, g }); }
    });
    return out;
  }

  // Load this class + term from the database.
  async function load(){
    const cid = classId(); if(!cid || !kids().length) return;
    const key = cid + '|' + term();
    if(st.key === key || st.loading) return;
    if(st.errorKey === key && Date.now() - st.errorAt < 30000) return; // a failed load waits 30 s before trying again (no endless retry loop)
    if(st.key && differences().some(x => !st.rescue.has(x.p.id + '|' + x.act))) await push(); // finish saving the term we are leaving
    st.loading = true; st.error = '';
    try {
      const res = await fetch(API + 'get_pretest_assessment.php?class_id=' + encodeURIComponent(cid) + '&term=' + term() + qs());
      const data = await res.json();
      if(data.status !== 'success') throw new Error(data.message || 'Could not load Pre-Test from the database.');
      const prev = st.key ? st.synced : null; // the term we are leaving (already saved)
      const same = (e, d) => { e = e || {}; d = d || {}; const ka = Object.keys(e).filter(k => e[k]); return ka.length === Object.keys(d).length && ka.every(k => d[+k + 1] === e[k]); };
      const fresh = {};
      Object.entries(data.sessions || {}).forEach(([pid, s]) => { const m = {}; Object.entries(s.marks || {}).forEach(([a, g]) => { m[+a] = g; }); fresh[+pid] = m; });
      // The database wins: a child with marks in the database shows exactly those. A child whose
      // marks were all saved for the term we left starts this term from the database (empty if none).
      kids().forEach(p => {
        const d = fresh[p.id];
        if(d && Object.keys(d).length){ const e = {}; Object.entries(d).forEach(([a, g]) => { e[String(a - 1)] = g; }); preTestAssessmentEntries[p.name] = e; }
        else if(prev && same(preTestAssessmentEntries[p.name], prev[p.id])) preTestAssessmentEntries[p.name] = {};
      });
      st.synced = fresh;
      // Whatever is still different now exists only in this browser → offer to save it.
      st.rescue = new Set(differences().filter(x => x.g).map(x => x.p.id + '|' + x.act));
      st.rescueAccepted = false; st.key = key; st.failed = false;
      try { localStorage.setItem('preTestAssessmentEntries', JSON.stringify(preTestAssessmentEntries)); } catch(e){}
      if(typeof syncPreTestTallyFromChildEntries === 'function') syncPreTestTallyFromChildEntries();
      if(typeof window.cgSummaryRefresh === 'function') window.cgSummaryRefresh('pretest');   // the summary shows the saved marks
    } catch(err){ st.error = err.message || String(err); st.errorKey = key; st.errorAt = Date.now(); setTimeout(redraw, 30500); }
    finally { st.loading = false; redraw(); }
  }

  // Save the changes (not the browser-only ones, unless the teacher chose to).
  async function push(){
    if(!st.key || st.saving) return;
    const changes = differences().filter(x => st.rescueAccepted || !st.rescue.has(x.p.id + '|' + x.act));
    if(!changes.length) return;
    st.saving = true; redraw();
    const marks = changes.map(x => { const a = WEEKLY_ASSESSMENT_ACTIVITIES[x.act - 1] || {};
      return { pupil_id: x.p.id, activity_no: x.act, level_mark: x.g, activity_type: a.type || '', activity_name: a.activity || '', cg_code: a.cg || '', page_no: a.page || '' }; });
    try {
      const res = await fetch(API + 'save_pretest_marks.php' + window.location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class_id: classId(), term: term(), marks }) });
      const data = await res.json();
      if(data.status !== 'success') throw new Error(data.message || 'Not saved.');
      changes.forEach(x => { const d = st.synced[x.p.id] = st.synced[x.p.id] || {}; if(x.g) d[x.act] = x.g; else delete d[x.act]; st.rescue.delete(x.p.id + '|' + x.act); });
      st.failed = false; st.lastSaved = new Date();
    } catch(err){ st.failed = true; st.error = err.message || String(err); setTimeout(push, 30000); }
    finally { st.saving = false; redraw(); }
  }
  // Imported Pre-Test marks: saved straight to the database, then this class is reloaded from the database.
  // rows: [{ pupil_id, activity_no (1–26), level_mark: 'B'|'P'|'A' }]
  window.preTestSaveImport = async function(rows){
    const cid = classId(), term_ = term();
    if(!cid) throw new Error('The class is not loaded yet. Open the Pre-Test tab and try again.');
    // one row per child: register number, name and each activity's B / P / A (activity_1 … activity_26)
    const byPupil = {};
    rows.forEach(x => { (byPupil[x.pupil_id] = byPupil[x.pupil_id] || {})[x.activity_no] = x.level_mark; });
    const sent = [];
    kids().forEach(p => {
      const got = byPupil[p.id]; if(!got) return;
      const row = { register_no: String(p.register_no || '').trim(), student_name: p.name };
      Object.keys(got).forEach(a => { row['activity_' + a] = got[a]; });
      sent.push(row);
    });
    if(!sent.length) throw new Error('No Pre-Test marks were matched to this class\u2019s children.');
    const res = await fetch(API + 'import_pretest.php' + window.location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class_id: cid, term: term_, rows: sent }) });
    const text = await res.text();
    console.log('[pretest import] HTTP ' + res.status + ' | sent ' + sent.length + ' rows | reply: ' + text.slice(0, 600));
    let data; try { data = JSON.parse(text); } catch(e){ throw new Error('The server did not return a save result (HTTP ' + res.status + '). Check import_pretest.php on the server.'); }
    if(data.status !== 'success') throw new Error(data.message || 'The Pre-Test marks could not be saved.');
    st.key = null; await load();   // show what is now in the database
    return { imported: data.imported_marks || 0, skipped: data.skipped || [] };
  };
  window.preTestSaveBrowserMarks = function(){ st.rescueAccepted = true; push(); };

  // Every Pre-Test change already calls savePreTestAssessmentEntries → also save to the database.
  let timer = null;
  const baseSave = savePreTestAssessmentEntries;
  savePreTestAssessmentEntries = function(){ const r = baseSave.apply(this, arguments); clearTimeout(timer); timer = setTimeout(push, 500); return r; };

  // The Pre-Test tab: load from the database, and say where the marks are.
  const baseRender = renderMonthlyAssessment;
  renderMonthlyAssessment = function(targetEl){
    const out = baseRender.apply(this, arguments);
    try {
      if(typeof assessmentEntryType === 'undefined' || assessmentEntryType !== 'pretest' || !targetEl) return out;
      load();
      const title = targetEl.querySelector('.pt-level') || [...targetEl.querySelectorAll('h1,h2,h3,h4')].find(el => /^\s*Pre-Test\b/.test(el.textContent) && !/Import|Add data/.test(el.textContent));
      // The save bar said "on this device" — it now saves to the database.
      targetEl.querySelectorAll('.card p.cap').forEach(p => { if(/saves straight away on this device/.test(p.textContent)) p.textContent = p.textContent.replace('Each tap saves straight away on this device.', 'Each tap saves to the database.'); });
    } catch(e){}
    return out;
  };
})();