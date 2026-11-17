/* =========================================================================
   js/data/pupil-attendance.js — real pupil (class) attendance state +
   the backend fetch, plus ad-hoc teacher-declared holidays. Extracted
   from teacher.js's old SECTION 4 (which mixed this in with sidebar
   chrome — split apart here so data and rendering aren't tangled).

   Same cross-file-sharing rule as the other js/data/*.js files: loaded
   as a classic <script>, so top-level `function` is automatically
   global, but top-level `let`/`const` is not — hence `var` below for
   anything teacher.js's rendering code still reads/writes directly.
   ========================================================================= */

var attendanceRecords = {}; // key: date -> {studentName: 'present'|'absent'} — now populated from the real database, month by month, not localStorage

// Real attendance now lives in daily_attendance, fetched one month at
// a time (attendance spans the whole year — unlike pupils, loading
// everything upfront isn't practical). attendanceMonthStatus tracks
// which 'YYYY-M' months have been fetched already, so switching back
// to a month already seen doesn't re-fetch it.
var attendanceMonthStatus = {}; // 'YYYY-M' -> 'loading' | 'loaded' | 'error:<message>'

async function fetchAttendanceMonth(year, month){
  const key = year + '-' + month;
  if(!myClassInfo.class_id){
    attendanceMonthStatus[key] = 'error:Still loading your class info — try again in a moment.';
    return;
  }
  attendanceMonthStatus[key] = 'loading';
  try{
    const params = new URLSearchParams({ class_id: myClassInfo.class_id, year, month });
    const res = await fetch('backend/get_attendance.php?' + params.toString() + (window.location.search ? '&' + window.location.search.slice(1) : ''));
    const data = await res.json();
    if(data.status === 'success'){
      Object.assign(attendanceRecords, data.records); // merge this month's real marks into the shared store every read site already uses
      attendanceMonthStatus[key] = 'loaded';
    } else {
      attendanceMonthStatus[key] = 'error:' + (data.message || 'Could not load attendance.');
    }
  } catch(err){
    attendanceMonthStatus[key] = 'error:Could not reach the server.';
  }
  // Re-render whichever attendance screen is currently open, if any —
  // same pattern fetchMyPupils() uses. These render* functions still
  // live in teacher.js — safe to call from here since a top-level
  // function is global regardless of which file defines it.
  if(document.getElementById('classattendance-body') && !document.getElementById('classattendance-body').classList.contains('hidden')){
    if(classAttendanceTab === 'mark') renderAttendanceBody();
  }
  if(document.getElementById('attendancehub-body') && !document.getElementById('attendancehub-body').classList.contains('hidden')){
    renderAttendanceHub();
  }
  if(document.getElementById('myday-body') && !document.getElementById('myday-body').classList.contains('hidden')){
    renderMyDay();
  }
  if(document.getElementById('attendancedashboard-body') && !document.getElementById('attendancedashboard-body').classList.contains('hidden')){
    renderAttendanceDashboard();
  }
}

// Shared guard, same shape as ensurePupilsLoadedFor — call at the top
// of anything that needs a specific month's real attendance before
// it can render meaningfully.
function ensureAttendanceMonthLoadedFor(year, month, container, reRenderFn){
  const key = year + '-' + month;
  const status = attendanceMonthStatus[key];
  if(status === 'loaded') return true;
  if(status === undefined){
    fetchAttendanceMonth(year, month);
    if(container) container.innerHTML = '<p class="cap">Loading attendance…</p>';
    return false;
  }
  if(status === 'loading'){
    if(container) container.innerHTML = '<p class="cap">Loading attendance…</p>';
    return false;
  }
  if(typeof status === 'string' && status.startsWith('error:')){
    if(container) container.innerHTML = `<p class="cap" style="color:var(--danger, #c8433f);">${esc(status.slice(6))}</p>`;
    return false;
  }
  return false;
}

// Ad-hoc holidays a teacher declares for a specific date — separate
// from the fixed national-holiday list (complianceHolidayName), which
// covers only a handful of standing dates. This covers everything
// else: a local school closure, an unplanned day off, a festival not
// on the fixed list. Storing the reason alongside the date, not just
// a boolean, so REG-14 style registers can show why no attendance
// was taken that day rather than just a gap.
var studentHolidays = {}; // date -> holiday name

// Common holidays offered as a dropdown when declaring one, so the
// teacher doesn't have to type (or misspell) the usual ones. This is
// just a pick-list of NAMES — it doesn't try to guess which date a
// festival falls on (many are lunar/variable and shift every year),
// so "Other — type it myself" always stays available for anything
// not listed, or for a date-specific closure.
var COMMON_HOLIDAYS = [
  'Republic Day', 'Maharashtra Day', 'Independence Day', 'Gandhi Jayanti',
  'Chhatrapati Shivaji Maharaj Jayanti', 'Dr. Babasaheb Ambedkar Jayanti',
  'Ganesh Chaturthi', 'Dussehra / Vijayadashami', 'Diwali', 'Holi',
  'Eid-ul-Fitr', 'Eid-ul-Zuha (Bakri Eid)', 'Christmas', 'Good Friday',
  'Guru Nanak Jayanti', 'Mahavir Jayanti', 'Buddha Purnima'
];

// Preset chosen → fill the free-text input with it and hide the
// input (nothing left to type); "Other" → clear it and reveal the
// input for typing. declareStudentHoliday() only ever reads the text
// input either way, so this is the only place that needs to know a
// dropdown exists at all.
function handleHolidayPresetChange(dateStr){
  const select = document.getElementById('holidayPresetSelect-' + dateStr);
  const input = document.getElementById('holidayNameInput-' + dateStr);
  if(!select || !input) return;
  if(select.value === '__other__'){
    input.value = '';
    input.style.display = '';
    input.focus();
  } else if(select.value){
    input.value = select.value;
    input.style.display = 'none';
  } else {
    input.value = '';
    input.style.display = 'none';
  }
}

(function loadStudentHolidays(){
  try {
    const raw = localStorage.getItem('studentHolidays');
    if(raw) Object.assign(studentHolidays, JSON.parse(raw));
  } catch(e){ /* malformed or unavailable — start empty */ }
})();
function saveStudentHolidays(){
  try { localStorage.setItem('studentHolidays', JSON.stringify(studentHolidays)); }
  catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
}
function declareStudentHoliday(dateStr){
  const input = document.getElementById('holidayNameInput-' + dateStr);
  if(!input) return;
  const name = (input.value || '').trim();
  if(!name){ input.style.display = ''; input.focus(); return; }
  studentHolidays[dateStr] = name;
  saveStudentHolidays();
  renderAttendanceBody();
}
function removeStudentHoliday(dateStr){
  delete studentHolidays[dateStr];
  saveStudentHolidays();
  renderAttendanceBody();
}
function toggleHolidayForm(dateStr){
  const form = document.getElementById('holidayForm-' + dateStr);
  if(form) form.classList.toggle('hidden');
}c