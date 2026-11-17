/* =========================================================================
   js/attendance-only.js — children on the roll for ATTENDANCE only, not assessed
   -------------------------------------------------------------------------
   e.g. new admissions not yet on the Assessment list. They are marked on the
   register as normal; on the Assessment tabs they are NOT evaluated:
     • their rows in the grading lists are greyed: "Attendance only — not assessed"
     • the figures, the not-active note, the Catch-up list (assess-inactive.js)
       and the Reports (assessment-reports.js) leave them out
   ⚑ Flagged where the child's record is seen: My Class (beside the name, and a
   line above the table), the Child Record and the Family & Parents profile
   ("attendance is marked, but assessment is not evaluated").
   Set on the Assessment tabs, in the 👥 Attendance only card (add / remove a
   child). Saved on the server (backend/pupils/attendance_only.php), so it is the
   same on every device. Removing a child from the card brings them back into
   assessment. Loads after the part files, before assess-inactive.js.
   ========================================================================= */
(function(){
  'use strict';
  const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const API = 'backend/pupils/attendance_only.php';
  const cid = () => (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_id) || null;
  const roll = () => Array.isArray(realPupilsCache) ? realPupilsCache : [];
  window.attendanceOnlyIds = new Set();
  let loadedFor = null, loading = false, msg = '';
  window.isAttendanceOnly = p => !!p && window.attendanceOnlyIds.has(+p.id);
  window.assessmentRoll = () => roll().filter(p => !window.isAttendanceOnly(p));   // the children who are assessed

  let redraw = function(){ try { if(typeof monthlyAssessmentTargetEl !== 'undefined' && monthlyAssessmentTargetEl && typeof renderMonthlyAssessment === 'function') renderMonthlyAssessment(monthlyAssessmentTargetEl); } catch(e){} };
  function load(){
    const c = cid(); if(!c || loading || loadedFor === c) return;
    loading = true;
    fetch(API + '?class_id=' + encodeURIComponent(c) + (window.location.search ? '&' + window.location.search.slice(1) : ''), { cache: 'no-store' })
      .then(r => r.json()).then(d => { if(d.status === 'success'){ window.attendanceOnlyIds = new Set((d.ids || []).map(Number)); loadedFor = c; redraw(); } })
      .catch(() => {}).finally(() => { loading = false; });
  }
  async function set(pid, on){
    try {
      const r = await fetch(API + window.location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pupil_id: pid, on, class_id: cid() }) });
      const d = await r.json();
      if(d.status !== 'success') throw new Error(d.message || 'Not saved.');
      on ? window.attendanceOnlyIds.add(+pid) : window.attendanceOnlyIds.delete(+pid);
      const p = roll().find(x => +x.id === +pid);
      msg = (p ? p.name : 'The child') + (on ? ' is now attendance only — not assessed.' : ' is assessed again.');
    } catch(e){ msg = '⚠ ' + (e.message || e); }
    redraw();
  }
  window.attendanceOnlyAdd = () => { const s = document.getElementById('aoPick'); if(s && s.value) set(+s.value, true); };
  window.attendanceOnlyRemove = pid => set(+pid, false);

  // grey the grading-list rows of attendance-only children
  function greyRows(el){
    const ao = roll().filter(window.isAttendanceOnly); if(!ao.length) return;
    const names = new Set(ao.map(p => String(p.name).trim()));
    el.querySelectorAll('td, th, div, span, b, strong, label').forEach(n => {
      if(n.children.length > 1 || !names.has(n.textContent.trim())) return;
      const row = n.closest('tr') || n.parentElement; if(!row || row.dataset.attendanceOnly) return;
      if(row.closest('[data-ao-card], [data-catchup], [data-adt], [data-inactive-note]')) return;
      row.dataset.attendanceOnly = '1'; row.style.opacity = '.5';
      row.querySelectorAll('button, select, input').forEach(b => { b.disabled = true; b.title = 'Attendance only — not assessed'; });
      n.insertAdjacentHTML('beforeend', ' <span style="display:inline-block; margin-left:6px; padding:1px 7px; border-radius:999px; font-size:11px; font-weight:700; background:#EEF1EE; color:#5B6B62; white-space:nowrap;">Attendance only — not assessed</span>');
    });
  }
  // the card
  function card(el){
    const old = el.querySelector('[data-ao-card]'); if(old) old.remove();
    const all = roll(); if(!all.length) return;
    const ao = all.filter(window.isAttendanceOnly), rest = all.filter(p => !window.isAttendanceOnly(p));
    const c = document.createElement('div'); c.className = 'card'; c.setAttribute('data-ao-card', '');
    c.style.cssText = 'margin-top:16px; padding:14px 18px; border:1px solid var(--border, #D6DCD7);';
    c.innerHTML = `<div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:baseline;">
        <b style="font-size:15px;">👥 Attendance only — not assessed</b>
        <span class="cap" style="margin:0;">${ao.length} of ${all.length} children</span></div>
      <p class="cap" style="margin:6px 0 10px;">Children on the register for attendance who are not evaluated (e.g. new admissions not yet on the Assessment list). They are left out of every assessment, figure and report. Remove a child here to assess them again.</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">${ao.length ? ao.map(p => `<span style="display:inline-flex; align-items:center; gap:6px; padding:5px 6px 5px 12px; border-radius:999px; background:#F2F4F3; border:1px solid #DDE3DF; font-size:13px;"><b>${h(p.name)}</b><button type="button" onclick="attendanceOnlyRemove(${+p.id})" title="Assess this child again" style="border:none; background:#fff; border-radius:999px; padding:2px 8px; cursor:pointer; font:inherit; font-size:12px;">✕ remove</button></span>`).join('') : '<span class="cap" style="margin:0;">Nobody — every child on the roll is assessed.</span>'}</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <select id="aoPick" style="padding:7px 10px; border:1px solid var(--border, #D6DCD7); border-radius:8px; font:inherit; min-width:220px;"><option value="">Choose a child…</option>${rest.map(p => `<option value="${+p.id}">${h(p.name)}${p.register_no ? ' (' + h(p.register_no) + ')' : ''}</option>`).join('')}</select>
        <button type="button" class="btn" style="width:auto; padding:7px 14px;" onclick="attendanceOnlyAdd()">Add as attendance only</button>
        ${msg ? `<span role="status" style="font-size:13px; ${/^⚠/.test(msg) ? 'color:#9B1C1C;' : 'color:#1E6B46;'}">${h(msg)}</span>` : ''}</div>`;
    el.appendChild(c);
  }

  if(typeof renderMonthlyAssessment === 'function'){
    const base = renderMonthlyAssessment;
    renderMonthlyAssessment = function(targetEl){
      load();
      const out = base.apply(this, arguments);
      try {
        const type = typeof assessmentEntryType !== 'undefined' ? assessmentEntryType : '';
        if(targetEl && ['pretest', 'observation', 'workbook', 'motor'].includes(type)){ greyRows(targetEl); card(targetEl); }
      } catch(e){ console.error('attendance-only', e); }
      return out;
    };
  }

  // ---- ⚑ the flag where a child's record is seen: My Class · Child Record · Family & Parents ----
  const FLAG = 'Attendance only — not assessed';
  const tag = () => `<span data-ao-flag style="display:inline-block; margin-left:8px; padding:2px 8px; border-radius:999px; font-size:11.5px; font-weight:800; background:#FFF1CC; color:#7A5300; border:1px solid #F2D27A; white-space:nowrap;">⚑ ${FLAG}</span>`;
  const banner = p => `<div data-ao-flag style="margin:0 0 12px; padding:10px 14px; border-radius:10px; background:#FFF8E1; border:1px solid #F2D27A; font-size:13.5px;"><b>⚑ ${h(p.name)}: attendance is marked, but assessment is not evaluated.</b> This child is on the register for attendance only (for example a new admission not yet on the Assessment list), so they are left out of every assessment, figure and report. To assess them, remove them from the 👥 Attendance only card on the Assessment tabs.</div>`;
  const visible = id => { const el = document.getElementById(id); return el && !el.classList.contains('hidden') ? el : null; };
  function flagMyClass(){
    const el = visible('myclass-body'); if(!el) return;
    el.querySelectorAll('[data-ao-flag]').forEach(x => x.remove());
    const ao = roll().filter(window.isAttendanceOnly); if(!ao.length) return;
    const names = new Set(ao.map(p => String(p.name).trim()));
    let first = null;
    el.querySelectorAll('table tbody tr').forEach(tr => tr.querySelectorAll('td b').forEach(b => { if(names.has(b.textContent.trim())){ b.insertAdjacentHTML('afterend', tag()); first = first || tr.closest('table'); } }));
    const table = first || el.querySelector('table');
    if(table){ const wrap = table.closest('.report-table-wrap') || table;
      wrap.insertAdjacentHTML('beforebegin', `<p data-ao-flag style="margin:0 0 8px; padding:8px 12px; border-radius:8px; background:#FFF8E1; border:1px solid #F2D27A; font-size:13px;"><b>⚑ ${ao.length} child${ao.length === 1 ? '' : 'ren'}: attendance marked, assessment not evaluated</b> — ${h(ao.map(p => p.name).join(', '))}.</p>`); }
  }
  function flagChildRecord(){
    const el = visible('childrecord-body'); if(!el) return;
    el.querySelectorAll('[data-ao-flag]').forEach(x => x.remove());
    const p = roll().find(x => x.name === (typeof childRecordName !== 'undefined' ? childRecordName : ''));
    el.querySelectorAll('option').forEach(o => { const q = roll().find(x => x.name === o.value || x.name === o.textContent.trim()); if(q && window.isAttendanceOnly(q) && !/⚑/.test(o.textContent)) o.textContent = o.textContent + '  ⚑ attendance only'; });
    if(p && window.isAttendanceOnly(p)) el.insertAdjacentHTML('afterbegin', banner(p));
  }
  function flagFamily(){
    const el = visible('familyparents-body'); if(!el) return;
    el.querySelectorAll('[data-ao-flag]').forEach(x => x.remove());
    const p = roll().find(x => x.name === (typeof selectedFamilyChildName !== 'undefined' ? selectedFamilyChildName : ''));
    if(!p || !window.isAttendanceOnly(p)) return;
    const bar = el.firstElementChild; if(bar) bar.insertAdjacentHTML('afterend', banner(p)); else el.insertAdjacentHTML('afterbegin', banner(p));
  }
  window.attendanceOnlyCardInto = function(el){ try { card(el); } catch(e){ console.error('attendance-only card', e); } };
  const wrapFn = (name, after) => { try { const f = eval(name); if(typeof f !== 'function') return;
    const w = function(){ load(); const out = f.apply(this, arguments); try { after(); } catch(e){ console.error('attendance-only flag', e); } return out; };
    eval(name + ' = w'); } catch(e){} };
  wrapFn('renderMyClassFamilies', flagMyClass);
  wrapFn('renderChildRecordReal', flagChildRecord);
  wrapFn('renderFamilyParents', flagFamily);
  // when the list arrives, flag whatever is on screen
  const baseRedraw = redraw;
  redraw = function(){ baseRedraw(); try { flagMyClass(); flagChildRecord(); flagFamily(); } catch(e){} };
})();