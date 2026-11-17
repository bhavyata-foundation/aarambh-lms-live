/* =========================================================================
   js/data/attendance.js — shared state + backend calls, split out of
   teacher.js so rendering code and data/API code aren't all in one
   giant file.

   HOW THIS STAYS COMPATIBLE WITH teacher.js's PLAIN <script> TAGS:
   teacher.html loads this as a classic script (no type="module"), same
   as teacher.js. In that setup, a top-level `function` declaration is
   automatically global (attached to window) no matter which <script>
   tag defined it — so every function below is already callable from
   teacher.js with zero extra work.

   Top-level `let`/`const`, however, are NOT shared across separate
   <script> tags — each script tag gets its own top-level scope for
   those. The handful of data objects below that teacher.js's rendering
   code still needs to read/write directly are declared with `var`
   instead: a top-level `var` in a classic script genuinely becomes a
   property of `window`, so it's visible from teacher.js exactly as if
   it were declared there. This is the ONLY reason `var` appears below
   instead of `let`/`const` — every other rule in the app still prefers
   let/const.

   PILOT MODULE: Teacher Attendance only, for now. Moved verbatim from
   teacher.js (SECTION 2), no logic changes. If this works cleanly,
   more modules move here the same way, one at a time.
   ========================================================================= */

// ---------------------------------------------------------
// REAL DATABASE-BACKED TEACHER ATTENDANCE — replaces the old
// localStorage-only version. Same lazy-fetch-then-cache-then-
// re-render pattern as attendanceRecords/attendanceMonthStatus
// (pupil attendance) in teacher.js: reads are synchronous against this
// in-memory cache (so every existing call site — gate check,
// computeComplianceStatsForMonth, the Monthly Effective calendar —
// keeps working unchanged), while a background fetch fills the
// cache from the real teacher_attendance table.
// ---------------------------------------------------------
var teacherAttendanceRecords = {}; // 'YYYY-MM-DD' -> {status, marked_at} — real rows, once fetched
var teacherAttendanceMonthStatus = {}; // 'YYYY-M' -> 'loading' | 'loaded' | 'error:<message>'

// A tiny local echo of TODAY's mark only — purely so the attendance
// gate can make its synchronous yes/no decision the instant this page
// loads, before the real network fetch below has had a chance to
// resolve. It's corrected against the server as soon as that fetch
// returns (see fetchTeacherAttendanceMonth) and is never treated as a
// substitute for the real record once that happens. A stale echo from
// a previous day never counts.
function getTodayAttendanceLocalEcho(){
  try{
    const raw = localStorage.getItem('teacherAttendanceLocalToday');
    if(!raw) return null;
    const rec = JSON.parse(raw);
    return (rec && rec.date === todayDateKey()) ? rec : null;
  } catch(e){ return null; }
}
function setTodayAttendanceLocalEcho(record){
  try{ localStorage.setItem('teacherAttendanceLocalToday', JSON.stringify(record)); }
  catch(e){ /* best-effort only — the real save already went to the server */ }
}

async function saveTeacherAttendanceRecord(status){
  const date = todayDateKey();
  // Optimistic local echo first, so the gate unlocks instantly rather
  // than waiting on the network — corrected below once the real save
  // confirms (or fails).
  setTodayAttendanceLocalEcho({ date, status, markedAt: new Date().toISOString() });
  try{
    const res = await fetch('backend/mark_teacher_attendance.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ date, status })
    });
    const data = await res.json();
    if(data.status === 'success' && data.record){
      teacherAttendanceRecords[date] = { status: data.record.status, markedAt: data.record.marked_at };
      return { status: data.record.status, markedAt: data.record.marked_at };
    }
    alert(data.message || 'Could not save your attendance — try again.');
    return null;
  } catch(err){
    alert('Could not reach the server to save your attendance.');
    return null;
  }
}

function getTodayAttendanceRecord(){
  const key = todayDateKey();
  if(teacherAttendanceRecords[key]) return teacherAttendanceRecords[key];
  return getTodayAttendanceLocalEcho(); // instant fallback until the real fetch below resolves
}

async function fetchTeacherAttendanceMonth(year, month){
  const key = year + '-' + month;
  teacherAttendanceMonthStatus[key] = 'loading';
  try{
    const params = new URLSearchParams({ year, month });
    const res = await fetch('backend/get_teacher_attendance.php?' + params.toString() + (window.location.search ? '&' + window.location.search.slice(1) : ''));
    const data = await res.json();
    if(data.status === 'success'){
      Object.entries(data.records || {}).forEach(([dateStr, r]) => {
        teacherAttendanceRecords[dateStr] = { status: r.status, markedAt: r.marked_at };
      });
      teacherAttendanceMonthStatus[key] = 'loaded';
      // The real month is confirmed now — the temporary local echo has
      // served its purpose, so clear it before it can ever shadow real
      // server data on a later visit.
      try{ localStorage.removeItem('teacherAttendanceLocalToday'); }catch(e){}
    } else {
      teacherAttendanceMonthStatus[key] = 'error:' + (data.message || 'Could not load your attendance.');
    }
  } catch(err){
    teacherAttendanceMonthStatus[key] = 'error:Could not reach the server.';
  }
  // Re-render whichever real screen currently reads this data. These
  // render*/update* functions still live in teacher.js — calling them
  // from here works because a top-level `function` in that file is
  // just as global as one declared here.
  if(document.getElementById('myday-body') && !document.getElementById('myday-body').classList.contains('hidden')) renderMyDay();
  if(document.getElementById('monthlyeffective-body') && !document.getElementById('monthlyeffective-body').classList.contains('hidden')) renderMonthlyEffective();
  if(document.getElementById('calendar-body') && !document.getElementById('calendar-body').classList.contains('hidden')) renderAttendanceCalendar(calendarYear, calendarMonth);
  updateTermAttendanceTile(); // recompute the header's term-to-date % — may itself trigger fetches for any other academic months not yet cached, cascading until the whole term-so-far is loaded

  // Reconcile the attendance gate against the real answer, now that
  // it's known — the local echo above was only ever a best guess.
  const today = new Date();
  if(year === today.getFullYear() && month === today.getMonth()){
    const real = teacherAttendanceRecords[todayDateKey()] || null;
    const gateShowing = document.getElementById('view-attendance') && !document.getElementById('view-attendance').classList.contains('hidden');
    if(real && gateShowing){
      // The server confirms today was actually marked (e.g. from
      // another device) — unlock rather than leave the gate up.
      showDashboardAfterAttendance({ status: real.status, markedAt: real.markedAt });
    } else if(!real && !gateShowing && !getTodayAttendanceLocalEcho() && isPastGateTime()){
      // Neither the server nor a local echo has today marked, it's
      // already past gate time, and the dashboard is showing anyway
      // (started from a stale assumption) — put the gate back up.
      document.getElementById('view-dashboard').classList.add('hidden');
      document.getElementById('view-attendance').classList.remove('hidden');
    }
  }
}

// Synchronous read against the in-memory cache — every existing call
// site (computeComplianceStatsForMonth, the Monthly Effective
// calendar, etc.) keeps working exactly as before. Triggers a
// background fetch the first time a given month is asked for.
function getMonthAttendanceRecords(year, month){
  const key = year + '-' + month;
  if(teacherAttendanceMonthStatus[key] === undefined) fetchTeacherAttendanceMonth(year, month);
  const prefix = year + '-' + String(month + 1).padStart(2, '0');
  const records = {};
  Object.keys(teacherAttendanceRecords).forEach(dateStr => {
    if(dateStr.indexOf(prefix) === 0) records[dateStr] = teacherAttendanceRecords[dateStr];
  });
  return records;
}