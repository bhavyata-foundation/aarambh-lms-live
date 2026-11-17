/* =========================================================================
   js/pretest-month.js — Pre-Test: a Month tab that shows what was saved that month
   -------------------------------------------------------------------------
   Pre-Test marks are stored once per child per term, but every saved mark
   carries the date it was last saved. This adds a Month dropdown right under
   the import card — the same look as the From / To months on Classroom
   Observation (a .fbar with a label and a select):

       MONTH  [ All months ▾ ]   (or June, July, August, September, October …)

   • All months  — everything saved this term (as before; the default).
   • A month     — only the marks last saved in that month: the tiles, the CG
                   summary and the activity table are worked out from them.
   The month view is READ-ONLY: marks are entered and changed under "All months"
   (a changed mark moves to the month it was changed in). Marks typed but not yet
   saved to the database have no date, so they show only under "All months".
   Nothing in the database or in the other screens (dashboard, records) changes.
   Loads after the part files, js/pretest-db.js and js/pretest-absent.js.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof renderPreTestClassSection !== 'function' || typeof preTestAssessmentEntries === 'undefined') return;
  if(window.__preTestMonthLoaded) return; // loaded twice (two script tags / a leftover copy)? only the first one runs
  window.__preTestMonthLoaded = true;
  window.preTestMonthFilter = window.preTestMonthFilter || '';
  const months = () => (typeof assessTermMonths === 'function' ? assessTermMonths() : []);
  const isPretest = () => typeof assessmentEntryType !== 'undefined' && assessmentEntryType === 'pretest';
  const redraw = () => { if(typeof renderMonthlyAssessment === 'function' && typeof monthlyAssessmentTargetEl !== 'undefined' && monthlyAssessmentTargetEl) renderMonthlyAssessment(monthlyAssessmentTargetEl); };

  window.preTestSetMonth = function(m){ window.preTestMonthFilter = m || ''; redraw(); };

  // 1) The Month dropdown — same markup and style as Classroom Observation's From / To.
  function addMonthBar(container){
    const ms = months(); if(window.preTestMonthFilter && !ms.includes(window.preTestMonthFilter)) window.preTestMonthFilter = '';
    const cur = window.preTestMonthFilter;
    const bar = document.createElement('div'); bar.className = 'fbar'; bar.style.cssText = 'margin-bottom:18px; display:flex; gap:16px; flex-wrap:wrap; align-items:flex-end;';
    bar.innerHTML = '<div class="ctl"><label>Month</label><select id="preTestMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">'
      + '<option value=""' + (cur === '' ? ' selected' : '') + '>All months</option>'
      + ms.map(m => '<option value="' + m + '"' + (m === cur ? ' selected' : '') + '>' + m + '</option>').join('') + '</select></div>';
    bar.querySelector('select').onchange = e => window.preTestSetMonth(e.target.value);
    container.appendChild(bar);
  }

  // 2) Changing term starts again at "All months".
  const baseSwitch = window.switchAssessTerm;
  if(typeof baseSwitch === 'function') window.switchAssessTerm = function(){ window.preTestMonthFilter = ''; return baseSwitch.apply(this, arguments); };

  // 3) The Pre-Test screen, worked out from only that month's marks (read-only).
  const baseSection = window.renderPreTestClassSection;
  window.renderPreTestClassSection = function(container){
    if(isPretest()){
      document.querySelectorAll('[data-pt-months]').forEach(el => el.remove()); // the old pill row from an earlier version of this file, if one is still loaded
      window.preTestMonthFilter = '';   // Pre-Test is a once-a-year baseline — no Month picker, it is always the whole term
    }
    const m = window.preTestMonthFilter;
    if(!m || !isPretest()) return baseSection.apply(this, arguments);
    const dated = window.preTestMarkMonths || {};
    const full = {}; Object.keys(preTestAssessmentEntries).forEach(n => { full[n] = Object.assign({}, preTestAssessmentEntries[n]); });
    const saveTally = window.savePreTestTallyEntries;
    const before = container.lastElementChild;
    try {
      // Show only this month's marks while drawing — put back exactly as it was in `finally`.
      Object.keys(preTestAssessmentEntries).forEach(n => delete preTestAssessmentEntries[n]);
      Object.keys(full).forEach(n => { const o = {}; Object.keys(full[n]).forEach(k => { if((dated[n] || {})[k] === m) o[k] = full[n][k]; }); preTestAssessmentEntries[n] = o; });
      window.savePreTestTallyEntries = function(){}; // the month view's counts must never be stored as the class tally
      const out = baseSection.apply(this, arguments);
      ['#preTestEntryList', '#preTestPickerBar'].forEach(sel => { const el = container.querySelector(sel); if(el) el.remove(); }); // read-only
      const note = document.createElement('div');
      note.className = 'card';
      note.style.cssText = 'padding:12px 16px; margin:0 0 16px; border-left:4px solid var(--primary);';
      note.innerHTML = `<b>${m}</b> — only the marks last saved in ${m}. Pick <b>All months</b> to enter or change marks.`;
      const first = before ? before.nextElementSibling : container.firstElementChild;
      if(first) container.insertBefore(note, first); else container.appendChild(note);
      return out;
    } finally {
      window.savePreTestTallyEntries = saveTally;
      Object.keys(preTestAssessmentEntries).forEach(n => delete preTestAssessmentEntries[n]);
      Object.keys(full).forEach(n => { preTestAssessmentEntries[n] = full[n]; });
      try { if(typeof syncPreTestTallyFromChildEntries === 'function') syncPreTestTallyFromChildEntries(); } catch(e){} // tally back to the real, whole-term counts
    }
  };

  // 4) "Enter manually" from the month view → go back to All months first (entering is not allowed in a month view).
  const baseGo = window.preTestGoToEntry;
  if(typeof baseGo === 'function') window.preTestGoToEntry = function(){ window.preTestMonthFilter = ''; return baseGo.apply(this, arguments); };
})();