/* =========================================================================
   js/pretest-absent.js — "no mark = absent" in the Pre-Test list
   -------------------------------------------------------------------------
   Assessment → Pre-Test → Add data. A child with no B / P / A for the
   activity shown was ABSENT for it and has not completed it. There is no
   separate button: the row simply says

        Absent — not evaluated

   until the teacher taps B, P or A. Absences are never counted as B, P or
   A, nor in DSI, SRI, Avg or the child's % (see preTestDone() in part 19).
   The line under the list reads "Absent n (not evaluated)" instead of
   "Not assessed n". Reports (Child Record, the Pre-Test PDF, Assessment
   records) list the activities each child was absent for and count the
   activities completed.

   An "AB" mark saved earlier (the old Absent button) reads the same way.
   Loads after the part files and js/pretest-db.js (teacher.html).
   ========================================================================= */
(function(){
  'use strict';
  if(typeof renderMonthlyAssessment !== 'function' || typeof preTestAssessmentEntries === 'undefined') return;
  const done = v => v === 'B' || v === 'P' || v === 'A';

  const baseRender = renderMonthlyAssessment;
  renderMonthlyAssessment = function(targetEl){
    const out = baseRender.apply(this, arguments);
    try {
      if(typeof assessmentEntryType === 'undefined' || assessmentEntryType !== 'pretest' || !targetEl) return out;
      const idx = (typeof preTestSelectedActivityIdx === 'number') ? preTestSelectedActivityIdx : 0;
      const table = [...targetEl.querySelectorAll('table.report-table')].find(t => /B\s*·\s*P\s*·\s*A/.test((t.querySelector('thead') || {}).textContent || ''));
      if(!table || table.dataset.absentReady) return out;
      table.dataset.absentReady = '1';
      let absent = 0;
      table.querySelectorAll('tbody tr').forEach(tr => {
        const nameCell = tr.querySelector('td b'), cell = tr.lastElementChild;
        if(!nameCell || !cell) return;
        if(done((preTestAssessmentEntries[nameCell.textContent] || {})[String(idx)])) return;
        absent++;
        const note = document.createElement('div');
        note.className = 'cap';
        note.style.cssText = 'margin:6px 0 0; color:#4a5560; font-weight:600; white-space:normal;';
        note.textContent = 'Absent — not evaluated';
        cell.appendChild(note);
      });
      // "This activity: B n · P n · A n · Not assessed n" → "… · Absent n (not evaluated)"
      const sumLine = [...targetEl.querySelectorAll('span.cap')].find(s => /^\s*Not assessed \d+/.test(s.textContent));
      if(sumLine) sumLine.textContent = 'Absent ' + absent + ' (not evaluated)';
    } catch(e){ /* the list still works without the note */ }
    return out;
  };
})();
