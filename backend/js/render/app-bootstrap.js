/* =========================================================================
   js/render/app-bootstrap.js — the session entry flow (enterTeacherFlow),
   real class info (myClassInfo/loadMyClassInfo), the attendance-gate
   timing helpers, and the attendance calendar. Kept together as one
   file rather than split into data/render — everything here calls
   everything else here constantly (enterTeacherFlow → showDashboard
   AfterAttendance → switchSidebarSection, loadMyClassInfo → a dozen
   other screens' re-renders), so a data/render split would be
   artificial for this specific chunk. Extracted from teacher.js's old
   SECTION 1 remainder.

   Same cross-file-sharing rule as every other split file: classic
   <script>, so top-level `function` is global automatically, but
   top-level `let`/`const` isn't shared across <script> tags. `var`
   appears below (and was applied retroactively to a few things still
   declared in teacher.js, like effectiveApprovalCache/realPupilsCache/
   monthlyAssessmentTargetEl) only where something outside this file
   still needs to read or write it.
   ========================================================================= */

function setGateFromClassStartTimes(startTimesList){
  // startTimesList: array of "HH:MM:SS" strings, one per class this teacher owns
  if(!startTimesList || !startTimesList.length) return;
  const parsed = startTimesList.map(t => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  });
  const earliestMinutes = Math.min(...parsed);
  ATTENDANCE_GATE_HOUR = Math.floor(earliestMinutes / 60);
  ATTENDANCE_GATE_MINUTE = earliestMinutes % 60;
}

function todayDateKey(){ return new Date().toISOString().slice(0,10); }

function getGateTimeToday(){
  const d = new Date();
  d.setHours(ATTENDANCE_GATE_HOUR, ATTENDANCE_GATE_MINUTE, 0, 0);
  return d;
}

function isPastGateTime(){
  return new Date() >= getGateTimeToday();
}

var calendarYear = new Date().getFullYear();
var calendarMonth = new Date().getMonth();

var calendarSelectedDate = null; // dateStr, or null — the "circled" day, like day 9 in the reference

function renderAttendanceCalendar(year, month, targetId){
  targetId = targetId || 'calendar-body';
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = firstDay.toLocaleDateString([], {month:'long', year:'numeric'});
  const todayStr = todayDateKey();
  const records = getMonthAttendanceRecords(year, month);
  if(!calendarSelectedDate) calendarSelectedDate = todayStr;

  let present = 0, absent = 0, marked = 0, unmarkedPast = 0;
  let cellsHtml = '';

  for(let i = 0; i < startWeekday; i++) cellsHtml += '<div></div>';

  for(let d = 1; d <= daysInMonth; d++){
    const dateObj = new Date(year, month, d);
    const dayOfWeek = dateObj.getDay();
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const record = records[dateStr];
    const status = record ? record.status : undefined;
    const isSelected = dateStr === calendarSelectedDate;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPast = dateStr < todayStr;
    const holidayName = (typeof complianceHolidayName === 'function' ? complianceHolidayName(year, month, d) : null) || (typeof studentHolidays !== 'undefined' ? studentHolidays[dateStr] : null);

    let dotClass = '';
    if(status === 'present'){ dotClass = 'cal-dot-present'; present++; marked++; }
    else if(status === 'absent'){ dotClass = 'cal-dot-absent'; absent++; marked++; }
    else if(holidayName){ dotClass = 'cal-dot-noschool'; } // same colour the legend already calls "Holiday" — previously only ever applied to weekends, never to an actual holiday date
    else if(isWeekend){ dotClass = 'cal-dot-noschool'; }
    else if(isPast){ dotClass = 'cal-dot-unmarked'; unmarkedPast++; }

    const cellClass = 'cal-day-v2 ' + dotClass + (isSelected ? ' cal-dot-selected' : '');
    cellsHtml += `<div class="${cellClass}"${holidayName ? ' title="' + esc(holidayName) + '"' : ''} onclick="calendarSelectedDate='${dateStr}'; showAttendanceDayDetail('${dateStr}', '${targetId}'); renderAttendanceCalendar(${year}, ${month}, '${targetId}');">
      <span class="cal-day-num">${d}</span><span class="cal-dot"></span>
    </div>`;
  }

  const teachingDaysSoFar = present + absent + unmarkedPast;
  const isEmbedded = targetId !== 'calendar-body';
  const selectedDateNice = new Date(calendarSelectedDate + 'T00:00:00').toLocaleDateString([], {day:'2-digit', month:'long', year:'numeric'});

  document.getElementById(targetId).innerHTML = `
    <div class="cal-header">
      <div>
        ${isEmbedded ? '' : '<h1>My attendance</h1>'}
        <p class="sub">${selectedDateNice}</p>
      </div>
      <div class="cal-nav">
        <button onclick="shiftCalendarMonth(-1, '${targetId}')">‹</button>
        <button onclick="shiftCalendarMonth(1, '${targetId}')">›</button>
      </div>
    </div>
    <div class="cal-weekdays">
      <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
    </div>
    <div class="cal-grid" style="grid-auto-rows:minmax(30px,1fr);">${cellsHtml}</div>
    <div class="cal-legend-v2">
      <span><i style="background:#1D9E75;"></i>Present</span>
      <span><i style="background:#D4534A;"></i>Absent</span>
      <span><i style="background:#E0A429;"></i>Holiday</span>
      <span><i style="background:#8A8A85;"></i>Not marked</span>
    </div>
    <div id="cal-day-detail-${targetId}"></div>
    <div class="cal-summary-v2">
      <p style="font-weight:600; margin:10px 0 4px;">Attendance summary — ${monthName}</p>
      <div class="row"><span>Teaching days so far</span><b>${teachingDaysSoFar}</b></div>
      <div class="row"><span>Days present</span><b style="color:#1D9E75;">${present}</b></div>
      <div class="row"><span>Attendance not marked</span><b style="color:#8A8A85;">${unmarkedPast}</b></div>
      <div class="row"><span>Days absent</span><b style="color:#D4534A;">${absent}</b></div>
    </div>
  `;
}

function showAttendanceDayDetail(dateStr, targetId){
  targetId = targetId || 'calendar-body';
  const [y, m] = dateStr.split('-').map(Number);
  const records = getMonthAttendanceRecords(y, m - 1);
  const record = records[dateStr];
  const dateObj = new Date(dateStr + 'T00:00:00');
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
  const niceDate = dateObj.toLocaleDateString([], {weekday:'long', day:'numeric', month:'long', year:'numeric'});

  let message;
  if(record){
    const time = new Date(record.markedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    message = record.status === 'present'
      ? `✓ Marked present at ${time}`
      : `Marked absent / on leave, at ${time}`;
  } else if(isWeekend){
    message = 'No school on this day';
  } else {
    message = 'Not marked yet';
  }

  document.getElementById('cal-day-detail-' + targetId).innerHTML =
    `<div class="cal-day-detail-box"><strong>${niceDate}</strong><br>${message}</div>`;
}

function shiftCalendarMonth(delta, targetId){
  calendarMonth += delta;
  if(calendarMonth > 11){ calendarMonth = 0; calendarYear++; }
  if(calendarMonth < 0){ calendarMonth = 11; calendarYear--; }
  renderAttendanceCalendar(calendarYear, calendarMonth, targetId);
}

let gateTimerId = null;

function scheduleAttendanceGate(){
  if(gateTimerId) clearTimeout(gateTimerId);
  const msUntilGate = getGateTimeToday() - new Date();
  if(msUntilGate <= 0) return; // already past 12:30 — handled at entry instead
  gateTimerId = setTimeout(function(){
    if(!getTodayAttendanceRecord()){
      document.getElementById('view-dashboard').classList.add('hidden');
      document.getElementById('view-attendance').classList.remove('hidden');
    }
  }, msUntilGate);
}

function updateAttendanceBannerPending(){
  const bannerEl = document.querySelector('.banner-success');
  const bannerTextEl = document.querySelector('.banner-success span:first-child');
  const timeEl = document.getElementById('attend-time');
  if(bannerEl) bannerEl.classList.add('pending');
  if(bannerTextEl) bannerTextEl.textContent = '🕐 Attendance opens at 12:30 PM — you can use the dashboard until then';
  if(timeEl) timeEl.textContent = '';
}

// ---------------------------------------------------------
// Fallback values, shown immediately while the real fetch below is
// in flight (or if it fails) — never leave the header blank.
// ---------------------------------------------------------
var myClassInfo = {
  school_name: 'Triveni Sangam Municipal School',
  class_name: 'Jr KG',
  school_id: null,
  class_id: null
};

function updateTopbarSchoolLine(){
  document.querySelectorAll('.topbar-brand-sub').forEach(el => {
    el.textContent = myClassInfo.school_name + ' · ' + myClassInfo.class_name;
  });
  updateDashHeading();
}

// The dashboard heading is "Teacher Name — Class Name" — two pieces
// that resolve independently (name from session_check.php, class
// from get_my_class.php, at different times, in either order). This
// rebuilds the whole heading from whatever's currently known,
// instead of one function guessing at what the other already wrote.
function updateDashHeading(){
  const heading = document.querySelector('.dash h1');
  if(!heading) return;
  const nameEl = document.querySelector('.user-name');
  const name = (nameEl && nameEl.textContent.trim()) || 'Teacher';
  heading.textContent = name + ' — ' + myClassInfo.class_name;
}

// The real per-teacher link: backend/get_my_class.php resolves the
// logged-in session (the email that was signed in with) to her
// actual school and class, so the header reflects who's actually
// logged in rather than a fixed placeholder. A teacher can have more
// than one class; this app is single-class throughout, so the first
// one returned is what's shown. If the request fails (offline,
// backend not reachable, no class linked yet), the fallback above
// stays on screen rather than showing nothing.
async function loadMyClassInfo(){
  try {
    const res = await fetch('backend/schools/get_my_class.php' + window.location.search);
    const data = await res.json();
    if(data.status === 'success' && data.classes && data.classes.length){
      const c = data.classes[0];
      myClassInfo.school_name = c.school_name;
      myClassInfo.class_name = c.class_name;
      // Field name for the IDs isn't confirmed yet (we haven't seen
      // get_my_class.php's actual response) — try the common
      // variants rather than assuming one, so this doesn't silently
      // stay null if the real key is e.g. classId instead of class_id.
      myClassInfo.school_id = c.school_id ?? c.schoolId ?? c.id ?? null;
      myClassInfo.class_id = c.class_id ?? c.classId ?? c.id ?? null;

      if(myClassInfo.class_id && typeof initializeProfileScopedLocalState === 'function'){
        initializeProfileScopedLocalState();
      }

      // Now that real IDs exist, throw away any cached data that was
      // fetched (or attempted) before they were known — those
      // requests would have gone out with class_id=undefined/null
      // and failed, cached as a permanent-looking error otherwise.
      if(myClassInfo.class_id){
        Object.keys(effectiveApprovalCache).forEach(k => delete effectiveApprovalCache[k]);
        if(document.getElementById('monthlyeffective-body') && !document.getElementById('monthlyeffective-body').classList.contains('hidden')){
          renderMonthlyEffective();
        }
        // Same reset for pupils and attendance — both guard on
        // class_id the same way effective approval does, and both
        // had the same race: this file loads and starts rendering
        // before get_my_class.php's response necessarily arrives.
        if(realPupilsCache === null || (typeof realPupilsCache === 'string' && realPupilsCache.startsWith('error:'))){
          realPupilsCache = null;
          fetchMyPupils();
        }
        Object.keys(attendanceMonthStatus).forEach(k => {
          if(typeof attendanceMonthStatus[k] === 'string' && attendanceMonthStatus[k].startsWith('error:')){
            delete attendanceMonthStatus[k];
          }
        });
        if(document.getElementById('classattendance-body') && !document.getElementById('classattendance-body').classList.contains('hidden')){
          if(classAttendanceTab === 'mark') renderAttendanceBody();
          else if(classAttendanceTab === 'admissions') renderAdmissions();
        }
        if(document.getElementById('assessment-body') && !document.getElementById('assessment-body').classList.contains('hidden')){
          renderMonthlyAssessment(monthlyAssessmentTargetEl);
        }
      }
    }
  } catch(e){ /* backend unreachable — fallback values stay as-is */ }
  updateTopbarSchoolLine();
}

function enterTeacherFlow(){
  const existing = getTodayAttendanceRecord();
  // Kick off the real fetch for this month regardless of which branch
  // below runs — this is what reconciles the instant local-echo guess
  // against the actual server record once it resolves (see
  // fetchTeacherAttendanceMonth), and warms the cache computeCompliance
  // StatsForMonth/Monthly Effective/the calendar all read synchronously.
  const today = new Date();
  fetchTeacherAttendanceMonth(today.getFullYear(), today.getMonth());

  if(existing){
    showDashboardAfterAttendance(existing);
    renderSidebar();
    switchSidebarSection('myday');
    return;
  }
  if(isPastGateTime()){
    document.getElementById('view-attendance').classList.remove('hidden');
  } else {
    document.getElementById('view-dashboard').classList.remove('hidden');
    updateAttendanceBannerPending();
    renderSidebar();
    switchSidebarSection('myday');
    scheduleAttendanceGate();
  }
}

async function markAttendance(status){
  const btnPresent = document.querySelector('.btn-present');
  const btnAbsent = document.querySelector('.btn-absent');
  if(btnPresent) btnPresent.disabled = true;
  if(btnAbsent) btnAbsent.disabled = true;
  const saved = await saveTeacherAttendanceRecord(status);
  if(btnPresent) btnPresent.disabled = false;
  if(btnAbsent) btnAbsent.disabled = false;
  if(!saved) return; // saveTeacherAttendanceRecord already alerted on failure — stay on the gate rather than fake success
  showDashboardAfterAttendance(saved);
}

function showDashboardAfterAttendance(record){
  document.getElementById('view-attendance').classList.add('hidden');
  document.getElementById('view-dashboard').classList.remove('hidden');

  const markedTime = new Date(record.markedAt);
  document.getElementById('attend-time').textContent =
    markedTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

  const bannerEl = document.querySelector('.banner-success');
  const bannerTextEl = document.querySelector('.banner-success span:first-child');
  if(bannerEl) bannerEl.classList.remove('pending');
  if(bannerTextEl){
    bannerTextEl.textContent = record.status === 'present'
      ? '✓ Attendance marked for today — Present'
      : '✓ Attendance marked for today — Absent';
  }

  renderSidebar();
  switchSidebarSection('myday');
}
