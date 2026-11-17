/* =========================================================================
   js/attendance-clear-month.js — "Delete all attendance marks of a month"
   -------------------------------------------------------------------------
   Class Attendance → Mark attendance gets, at the foot of the register:

     🗑 Delete all attendance marks — September 2026
        For a month imported wrongly. Children, holidays, assessments and
        other months are not touched.            [Delete all marks of September 2026]
        (after deleting)                          [↶ Undo — put back 312 marks]

   The month is the one the register is showing (the month arrows). The
   teacher sees how many marks will go and types the month to confirm.
   Undo saves the deleted marks back (save_attendance.php) — it is kept on
   this device until it is used or another month is cleared.

   A second button deletes EVERY month at once ("Delete ALL attendance
   marks", type DELETE ALL) — still only attendance, still with Undo.

   Server: backend/attendance/clear_attendance_month.php (own class only).
   Loads after the part files (teacher.html); wraps renderAttendanceBody.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof renderAttendanceBody !== 'function') return;
  const UNDO_KEY = 'aarambhAttendanceClearUndo';
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const shown = () => {
    const y = (typeof markAttYear === 'number') ? markAttYear : new Date().getFullYear();
    const m = (typeof markAttMonth === 'number') ? markAttMonth : new Date().getMonth();
    return { y, m, key: y + '-' + String(m + 1).padStart(2, '0'), label: MONTHS[m] + ' ' + y };
  };
  const api = async body => {
    const res = await fetch('backend/attendance/clear_attendance_month.php' + window.location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ class_id: myClassInfo.class_id }, body)) });
    try { return await res.json(); } catch(e){ throw new Error(res.status === 404 ? 'backend/attendance/clear_attendance_month.php is not on the server yet.' : 'The server did not answer properly (HTTP ' + res.status + ').'); }
  };
  const undoFor = key => { try { const u = JSON.parse(localStorage.getItem(UNDO_KEY) || 'null'); return u && (u.month === key || u.month === 'all') && String(u.class_id) === String(myClassInfo.class_id) ? u : null; } catch(e){ return null; } };
  // forget this month's marks on screen, so the register shows it empty straight away
  function dropFromScreen(key){ // key: one month like 2026-09, or 'all'
    const ids = new Set((Array.isArray(realPupilsCache) ? realPupilsCache : []).map(p => String(p.id)));
    Object.keys(attendanceRecords || {}).forEach(d => { if(key !== 'all' && d.slice(0, 7) !== key) return; Object.keys(attendanceRecords[d]).forEach(pid => { if(ids.has(String(pid))) delete attendanceRecords[d][pid]; }); });
  }

  window.attClearMonth = async function(){
    const s = shown();
    try {
      const c = await api({ action: 'count', month: s.key });
      if(c.status !== 'success') throw new Error(c.message);
      if(!c.total){ alert('There are no attendance marks for ' + s.label + ' in ' + (myClassInfo.class_name || 'this class') + '.'); return; }
      const typed = prompt(`Delete ALL ${c.total} attendance marks of ${s.label} for ${myClassInfo.class_name || 'this class'}?\n(${c.present} present, ${c.absent} absent)\n\nChildren, holidays, assessments and other months are not touched. You can undo it straight after.\n\nType ${s.label} to confirm.`);
      if(typed === null) return;
      if(typed.trim().replace(/\s+/g, ' ').toLowerCase() !== s.label.toLowerCase()){ alert('Nothing was deleted (' + s.label + ' was not typed).'); return; }
      const d = await api({ action: 'delete', month: s.key, confirm: s.label });
      if(d.status !== 'success') throw new Error(d.message);
      try { localStorage.setItem(UNDO_KEY, JSON.stringify({ class_id: myClassInfo.class_id, month: s.key, label: s.label, marks: d.marks })); } catch(e){}
      dropFromScreen(s.key);
      renderAttendanceBody();
      alert(d.deleted + ' attendance marks of ' + s.label + ' were deleted. Use Undo at the foot of the register to put them back.');
    } catch(e){ alert('Nothing was deleted: ' + (e.message || e)); }
  };
  // every month at once
  window.attClearAll = async function(){
    try {
      const c = await api({ action: 'count', month: 'all' });
      if(c.status !== 'success') throw new Error(c.message);
      if(!c.total){ alert('There are no attendance marks for ' + (myClassInfo.class_name || 'this class') + '.'); return; }
      const list = (c.months || []).map(x => '• ' + x.label + ': ' + x.marks + ' marks').join('\n');
      const typed = prompt(`Delete ALL ${c.total} attendance marks of ${myClassInfo.class_name || 'this class'} — every month?\n(${c.present} present, ${c.absent} absent)\n\n${list}\n\nOnly attendance is deleted: the children, holidays and assessments stay. You can undo it straight after.\n\nType DELETE ALL to confirm.`);
      if(typed === null) return;
      if(typed.trim().replace(/\s+/g, ' ').toUpperCase() !== 'DELETE ALL'){ alert('Nothing was deleted (DELETE ALL was not typed).'); return; }
      const d = await api({ action: 'delete', month: 'all', confirm: 'DELETE ALL' });
      if(d.status !== 'success') throw new Error(d.message);
      let kept = true;
      try { localStorage.setItem(UNDO_KEY, JSON.stringify({ class_id: myClassInfo.class_id, month: 'all', label: 'all months', marks: d.marks })); } catch(e){ kept = false; }
      dropFromScreen('all');
      renderAttendanceBody();
      alert(d.deleted + ' attendance marks were deleted (every month).' + (kept ? ' Use Undo at the foot of the register to put them back.' : ' (This browser could not keep a copy for Undo.)'));
    } catch(e){ alert('Nothing was deleted: ' + (e.message || e)); }
  };
  window.attClearMonthUndo = async function(){
    const s = shown(), u = undoFor(s.key); if(!u) return;
    try {
      let back = 0;
      for(let i = 0; i < u.marks.length; i += 1000){
        const res = await fetch('backend/attendance/save_attendance.php' + window.location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class_id: myClassInfo.class_id, marks: u.marks.slice(i, i + 1000) }) });
        const d = await res.json(); if(d.status !== 'success') throw new Error((d.message || 'Could not save.') + ' (' + back + ' were put back before this.)');
        back += d.saved || 0;
      }
      try { localStorage.removeItem(UNDO_KEY); } catch(e){}
      if(u.month === 'all' && typeof attendanceMonthStatus !== 'undefined') Object.keys(attendanceMonthStatus).forEach(k => { delete attendanceMonthStatus[k]; }); // every month comes back
      if(typeof fetchAttendanceMonth === 'function') await fetchAttendanceMonth(s.y, s.m); else renderAttendanceBody();
      alert(back + ' attendance marks of ' + u.label + ' are back.');
    } catch(e){ alert('Could not undo: ' + (e.message || e)); }
  };

  const base = renderAttendanceBody;
  renderAttendanceBody = function(){
    const out = base.apply(this, arguments);
    try {
      const container = document.getElementById(window.attendanceEntryTargetId || 'attendance-body');
      if(!container || container.id !== 'attendance-body' || !Array.isArray(realPupilsCache) || !realPupilsCache.length) return out;
      if(container.querySelector('[data-att-clear]')) return out;
      const s = shown(), u = undoFor(s.key), card = document.createElement('div');
      card.className = 'card'; card.setAttribute('data-att-clear', ''); card.setAttribute('data-no-export', '1');
      card.style.cssText = 'margin-top:22px; padding:16px 18px;';
      card.innerHTML = `<h3 style="margin:0 0 4px; font-family:var(--disp); font-size:14px; font-weight:700;">🗑 Delete attendance marks</h3>
        <p class="cap" style="margin:0 0 10px;">For attendance that was imported or marked wrongly, so you can import the right register again. Delete one month (the month shown above), or every month of ${esc(myClassInfo.class_name || 'this class')} at once. Only attendance marks are removed — the children, holidays and assessments are not touched — and Undo puts them back.</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${u ? `<button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="attClearMonthUndo()">↶ Undo — put back ${u.marks.length} marks${u.month === 'all' ? ' (every month)' : ''}</button>` : ''}
          <button class="btn" style="color:var(--crit,#d03b3b);" onclick="attClearMonth()">Delete all marks of ${esc(s.label)}</button>
          <button class="btn" style="color:#fff; background:var(--crit,#d03b3b); border-color:var(--crit,#d03b3b);" onclick="attClearAll()">Delete ALL attendance marks (every month)</button>
        </div>`;
      container.appendChild(card);
    } catch(e){ /* the register still works without it */ }
    return out;
  };
})();
