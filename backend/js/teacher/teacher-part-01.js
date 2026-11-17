/* =========================================================================
   teacher-part-01.js — part 1 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */
/* =========================================================================
   AARAMBH BACKEND PATH FIX
   PASTE THIS AT THE VERY TOP OF:
   C:\xampp\htdocs\aarambh-lms\js\teacher.js

   KEEP THE REST OF teacher.js BELOW THIS CODE.
   DO NOT DELETE YOUR EXISTING FUNCTIONS.
   ========================================================================= */

(function setupAarambhBackendPaths() {

  const PATH_MAP = {

    /* =========================================================
       AUTH
       ========================================================= */
    'backend/session_check.php':
      'backend/auth/session_check.php',

    'backend/logout.php':
      'backend/auth/logout.php',

    'backend/return_to_admin.php':
      'backend/auth/return_to_admin.php',

    'backend/preview_as.php':
      'backend/auth/preview_as.php',


    /* =========================================================
       SCHOOL / CLASS
       ========================================================= */
    'backend/get_my_class.php':
      'backend/schools/get_my_class.php',

    'backend/get_my_school.php':
      'backend/schools/get_my_school.php',

    'backend/get_schools_list.php':
      'backend/schools/get_schools_list.php',

    'backend/get_unlinked_classes.php':
      'backend/schools/get_unlinked_classes.php',

    'backend/get_classes_for_Schools.php':
      'backend/schools/get_classes_for_Schools.php',


    /* =========================================================
       PUPILS
       ========================================================= */
    'backend/get_my_pupils.php':
      'backend/pupils/get_my_pupils.php',

    'backend/add_pupil.php':
      'backend/pupils/add_pupil.php',

    'backend/update_pupil.php':
      'backend/pupils/update_pupil.php',

    'backend/remove_pupil.php':
      'backend/pupils/remove_pupil.php',

    'backend/import_pupils.php':
      'backend/pupils/import_pupils.php',

    'backend/clear_pupil_receipt.php':
      'backend/pupils/clear_pupil_receipt.php',


    /* =========================================================
       CHILD ATTENDANCE
       ========================================================= */
    'backend/get_attendance.php':
      'backend/attendance/get_attendance.php',

    'backend/save_attendance.php':
      'backend/attendance/save_attendance.php',


    /* =========================================================
       EVENTS
       ========================================================= */
    'backend/get_events.php':
      'backend/events/get_events.php',


    /* =========================================================
       MATERIALS
       ========================================================= */
    'backend/get_materials.php':
      'backend/materials/get_materials.php',


    /* =========================================================
       CURRICULUM
       ========================================================= */
    'backend/get_curricular_goals.php':
      'backend/curriculum/get_curricular_goals.php',


    /* =========================================================
       MONTHLY EFFECTIVE
       ========================================================= */
    'backend/get_effective.php':
      'backend/effective/get_effective.php',

    'backend/submit_effective.php':
      'backend/effective/submit_effective.php',


    /* =========================================================
       WORKBOOK ASSESSMENT
       ========================================================= */
    'backend/get_workbook_pages.php':
      'backend/assessment/workbook/get_workbook_pages.php',

    'backend/get_workbook_assessment.php':
      'backend/assessment/workbook/get_workbook_assessment.php',

    'backend/save_workbook_assessment.php':
      'backend/assessment/workbook/save_workbook_assessment.php',

    'backend/get_workbook_competencies.php':
      'backend/assessment/workbook/get_workbook_competencies.php',

    'backend/add_workbook_competency.php':
      'backend/assessment/workbook/add_workbook_competency.php',

    'backend/get_workbook_competency_tally.php':
      'backend/assessment/workbook/get_workbook_competency_tally.php',

    'backend/save_workbook_competency_tally.php':
      'backend/assessment/workbook/save_workbook_competency_tally.php',

    'backend/get_workbook_tally_trend.php':
      'backend/assessment/workbook/get_workbook_tally_trend.php',


    /* =========================================================
       CLASSROOM OBSERVATION ASSESSMENT
       ========================================================= */
    'backend/get_observation_themes.php':
      'backend/assessment/observation/get_observation_themes.php',

    'backend/get_observation_assessment.php':
      'backend/assessment/observation/get_observation_assessment.php',

    'backend/save_observation_assessment.php':
      'backend/assessment/observation/save_observation_assessment.php',


    /* =========================================================
       GOOGLE DRIVE
       ========================================================= */
    'backend/check_drive_status.php':
      'backend/drive/check_drive_status.php',

    'backend/check_drive_files.php':
      'backend/drive/check_drive_files.php',

    'backend/check_activity.php':
      'backend/drive/check_activity.php',

    'backend/check_zip.php':
      'backend/drive/check_zip.php',

    'backend/upload_to_drive.php':
      'backend/drive/upload_to_drive.php',

    'backend/delete_from_drive.php':
      'backend/drive/delete_from_drive.php',

    'backend/google_oauth_start.php':
      'backend/drive/google_oauth_start.php',

    'backend/google_oauth_callback.php':
      'backend/drive/google_oauth_callback.php'
  };


  /* =========================================================
     CONVERT AN OLD BACKEND URL INTO THE NEW ORGANIZED URL
     ========================================================= */

  function fixBackendPath(url) {

    if (!url || typeof url !== 'string') {
      return url;
    }

    for (const oldPath in PATH_MAP) {

      if (
        url === oldPath ||
        url.startsWith(oldPath + '?')
      ) {

        return PATH_MAP[oldPath] + url.slice(oldPath.length);
      }
    }

    return url;
  }


  /* =========================================================
     EXPOSE HELPER FOR DEBUGGING
     ========================================================= */

  window.fixAarambhBackendPath = fixBackendPath;


  /* =========================================================
     PATCH FETCH()

     This fixes old paths not only inside teacher.js, but also calls
     coming from:

     js/render/app-bootstrap.js
     js/render/myday.js
     js/render/events-evidence.js
     js/render/materials.js
     js/render/classroom-state.js
     and other loaded teacher modules.
     ========================================================= */

  const originalFetch = window.fetch.bind(window);

  window.fetch = function(input, init) {

    try {

      if (typeof input === 'string') {

        return originalFetch(
          fixBackendPath(input),
          init
        );
      }

      if (input instanceof Request) {

        const originalUrl = input.url;

        const base =
          window.location.origin +
          window.location.pathname.substring(
            0,
            window.location.pathname.lastIndexOf('/') + 1
          );

        let relativeUrl = originalUrl;

        if (originalUrl.startsWith(base)) {
          relativeUrl = originalUrl.slice(base.length);
        }

        const fixedRelative =
          fixBackendPath(relativeUrl);

        if (fixedRelative !== relativeUrl) {

          const fixedUrl =
            new URL(
              fixedRelative,
              base
            ).href;

          const replacementRequest =
            new Request(
              fixedUrl,
              input
            );

          return originalFetch(
            replacementRequest,
            init
          );
        }
      }

    } catch (err) {

      console.warn(
        'Aarambh backend path correction failed:',
        err
      );
    }

    return originalFetch(
      input,
      init
    );
  };


  /* =========================================================
     PATCH XMLHttpRequest AS WELL
     ========================================================= */

  if (
    window.XMLHttpRequest &&
    XMLHttpRequest.prototype.open
  ) {

    const originalOpen =
      XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open =
      function(
        method,
        url,
        async,
        user,
        password
      ) {

        const fixedUrl =
          typeof url === 'string'
            ? fixBackendPath(url)
            : url;

        return originalOpen.call(
          this,
          method,
          fixedUrl,
          async,
          user,
          password
        );
      };
  }


  /* =========================================================
     FIX <a href=""> LINKS

     fetch() correction does not affect normal links such as
     Google OAuth buttons, so these are corrected separately.
     ========================================================= */

  function fixAnchor(anchor) {

    if (!anchor) {
      return;
    }

    const href =
      anchor.getAttribute('href');

    if (!href) {
      return;
    }

    const fixed =
      fixBackendPath(href);

    if (fixed !== href) {

      anchor.setAttribute(
        'href',
        fixed
      );
    }
  }


  function fixAllBackendLinks(root) {

    if (!root) {
      return;
    }

    if (
      root.matches &&
      root.matches('a[href]')
    ) {

      fixAnchor(root);
    }

    if (root.querySelectorAll) {

      root
        .querySelectorAll('a[href]')
        .forEach(fixAnchor);
    }
  }


  /* =========================================================
     FIX LINKS ALREADY ON PAGE
     ========================================================= */

  if (
    document.readyState === 'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      function() {

        fixAllBackendLinks(
          document
        );
      }
    );

  } else {

    fixAllBackendLinks(
      document
    );
  }


  /* =========================================================
     FIX LINKS CREATED LATER BY teacher.js
     ========================================================= */

  const backendLinkObserver =
    new MutationObserver(
      function(mutations) {

        mutations.forEach(
          function(mutation) {

            mutation.addedNodes.forEach(
              function(node) {

                if (
                  node.nodeType === 1
                ) {

                  fixAllBackendLinks(
                    node
                  );
                }
              }
            );
          }
        );
      }
    );


  function startBackendLinkObserver() {

    if (!document.documentElement) {
      return;
    }

    backendLinkObserver.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true
      }
    );
  }


  if (
    document.readyState === 'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      startBackendLinkObserver
    );

  } else {

    startBackendLinkObserver();
  }


  /* =========================================================
     DEBUG HELPER

     Run in browser Console:

     aarambhBackendPathTest()

     It prints all important corrected paths.
     ========================================================= */

  window.aarambhBackendPathTest =
    function() {

      const tests = [

        'backend/get_my_class.php',

        'backend/get_my_pupils.php',

        'backend/get_events.php',

        'backend/get_materials.php',

        'backend/get_curricular_goals.php',

        'backend/get_effective.php',

        'backend/get_workbook_competencies.php',

        'backend/get_workbook_competency_tally.php',

        'backend/get_workbook_tally_trend.php',

        'backend/get_observation_themes.php',

        'backend/get_observation_assessment.php',

        'backend/save_observation_assessment.php',

        'backend/check_drive_status.php',

        'backend/check_drive_files.php',

        'backend/upload_to_drive.php',

        'backend/delete_from_drive.php',

        'backend/google_oauth_start.php'
      ];

      console.table(
        tests.map(
          function(oldPath) {

            return {
              old_path: oldPath,
              corrected_path:
                fixBackendPath(
                  oldPath
                )
            };
          }
        )
      );
    };


  console.log(
    '✓ Aarambh backend folder-path compatibility loaded.'
  );

})();
function logout(){
  fetch('backend/auth/logout.php').catch(() => {});
  // Plain index.html would immediately re-trigger main.js's auto-dev-
  // bypass on localhost and bounce straight back into this dashboard —
  // making logout look broken. ?no_dev=1 shows the real login page.
  window.location.href = 'index.html?no_dev=1';
}

// Replaces the hardcoded "Mrs. Sharma" placeholder in three spots —
// the topbar avatar initials, the topbar name, and the dashboard
// heading — with the real logged-in teacher's name from
// session_check.php. The class name half of the heading is filled in
// separately by loadMyClassInfo() once that resolves; this only ever
// touches the name portion.
function applyRealTeacherName(name){
  if(!name) return;
  const nameEl = document.querySelector('.user-name');
  if(nameEl) nameEl.textContent = name;

  const avatarEl = document.querySelector('.user-avatar');
  if(avatarEl){
    const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    if(initials) avatarEl.textContent = initials;
  }

  const heading = document.querySelector('.dash h1');
  if(heading) updateDashHeading();
}

/* ===================== SECTION 1: CURRICULUM DATA & HELPERS ===================== */
  // Moved to js/curriculum-data.js — currentWeekNum, currentDay, DAYS,
  // DOMAINS, CG_LABELS, broadCompetencyFallback, pickLang,
  // alwaysEnglish, competencyFor, currentWeekKey, todaysActivity,
  // onLanguageChanged, SAMPLE_STUDENTS, RATING_LEVELS,
  // ATTENDANCE_GATE_HOUR/MINUTE all live there now.
  //
  // TEACHER ATTENDANCE — moved to js/data/attendance.js.
  //
  // Everything else that used to be here (gate-time helpers, the
  // attendance calendar, myClassInfo/loadMyClassInfo, enterTeacherFlow,
  // markAttendance, showDashboardAfterAttendance) moved to
  // js/render/app-bootstrap.js — nothing here calls any of it any
  // differently than before.

/* ===================== SECTION 4: SIDEBAR & TOPBAR CHROME ===================== */
  // Split into two: sidebar/topbar UI + the switchSidebarSection router
  // moved to js/render/chrome.js; pupil attendance (attendanceRecords,
  // fetchAttendanceMonth, etc.) and ad-hoc holidays moved to
  // js/data/pupil-attendance.js. toggleSidebar, closeSidebar,
  // toggleCardFullscreen, toggleUserMenu, closeUserMenu,
  // toggleEvidenceMenu, closeEvidenceMenu, todayKey, and
  // switchSidebarSection all live in chrome.js now — nothing here
  // calls them any differently than before.

  // These two stay here (not moved) — they belong to SECTION 10
  // (Attendance — Class Register), further down in this same file;
  // they were just declared up here originally, oddly.
  var attendanceSaved = false;
  var attendanceSearchTerm = '';

  // EVENT_TYPE_COLORS now lives in js/events-calendar.js, shared with
  // the supervisor and superadmin pages so all three stay visually
  // identical rather than three separate implementations drifting apart.

  // Moved to js/render/events-evidence.js — renderSchoolEvents,
  // PTM_YEAR_PLAN, ptmAgendaState, addPtmYearPlanItem, renderPTMExtras,
  // renderTeacherPTM (School Events / PTM Agenda Extras), and
  // uploadedEvidenceRecords, evidenceKey, removeSessionEvidence,
  // uploadSessionActivityPhoto (Activity Photo Upload) all live there
  // now — nothing here calls them any differently than before.

  // Moved to js/render/materials.js (TLM & Resources / Materials, plus
  // a few Family contact quick-edit helpers that were originally
  // colocated here) — nothing here calls any of it any differently
  // than before.

  // Moved to js/render/parent-volunteers.js — nothing here calls any
  // of it any differently than before.

  // Moved to js/render/myday.js (My Day screen itself), js/render/
  // myday-planning.js (daily plan editor, voice input, materials chips,
  // AI Assistance), and js/render/classroom-state.js (Classroom State
  // monthly record) — nothing here calls any of it any differently
  // than before.

  /* ===================== SECTION 10: ATTENDANCE — CLASS REGISTER ===================== */

  window.attendanceEntryTargetId =
  window.attendanceEntryTargetId ||
  'attendance-body'; // which element the mark-attendance UI currently renders into

  // "Class Attendance" — combines Mark Attendance and Admissions under
  // one sidebar tab, same internal-tab pattern as Attendance Records
  // below. Reuses renderAttendanceBody()/renderAdmissions() unchanged,
  // just shows/hides their existing target divs instead of duplicating
  // either one's logic.
  var classAttendanceTab = 'mark';
  function switchClassAttendanceTab(tab){
    classAttendanceTab = tab;
    renderClassAttendanceSection();
  }
  function renderClassAttendanceSection(){
    const container = document.getElementById('classattendance-body');
    container.innerHTML = '';
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex; gap:8px; margin:14px 0; overflow-x:auto; flex-wrap:wrap;';
    const tabStyle = (active) => `padding:8px 16px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:${active ? '600' : '400'}; white-space:nowrap;`;
    tabBar.innerHTML = `
      <button style="${tabStyle(classAttendanceTab === 'mark')}" onclick="switchClassAttendanceTab('mark')">✓ Mark Attendance</button>
      <button style="${tabStyle(classAttendanceTab === 'admissions')}" onclick="switchClassAttendanceTab('admissions')">➕ Admissions</button>
    `;
    container.appendChild(tabBar);

    document.getElementById('attendance-body').classList.toggle('hidden', classAttendanceTab !== 'mark');
    document.getElementById('admissions-body').classList.toggle('hidden', classAttendanceTab !== 'admissions');

    if(classAttendanceTab === 'mark'){
      window.attendanceEntryTargetId =
  'attendance-body';
      renderAttendanceBody();
    } else if(classAttendanceTab === 'admissions'){
      renderAdmissions();
    }
  }


  // ---------- MARK ATTENDANCE — day picker, per-day register (3-state
  // cycle: Present → Absent → Late), and a follow-up panel for
  // below-70%/consecutive absences. A teacher can now open any past
  // school day and mark or correct it, not just today.
  window.markAttYear =
  window.markAttYear ?? new Date().getFullYear();

window.markAttMonth =
  window.markAttMonth ?? new Date().getMonth();

window.markAttSelectedDate =
  window.markAttSelectedDate ?? null;

  function ymd(year, month, day){
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Every real mark for one child, weekdays only, on or before a given
  // date within one month — used for the "month to date %" next to her
  // name, and for the Below-70% follow-up list.
  // Keyed by pupil ID, not name — two children who happen to share a
  // name must resolve to two different attendance records, never one.
  function childMonthToDatePct(pupilId, year, month, uptoDateStr){
    let present = 0, marked = 0;
    Object.keys(attendanceRecords).forEach(dateStr => {
      if(dateStr > uptoDateStr) return;
      const d = new Date(dateStr + 'T00:00:00');
      if(isNaN(d) || d.getFullYear() !== year || d.getMonth() !== month) return;
      const dow = d.getDay();
      if(dow === 0 || dow === 6) return;
      const status = (attendanceRecords[dateStr] || {})[pupilId];
      if(!status) return;
      marked++;
      if(status === 'present') present++;
    });
    return { pct: marked ? Math.round(present / marked * 1000) / 10 : 0, marked, present };
  }

  // Historical attendance import — wide format (one column per date),
  // matching the shape a real paper register naturally has (rows =
  // children, columns = days) rather than forcing one row per mark.
  // Reuses the same shared file parser the Family Profile and Pupils
  // imports already use. Two-step: previewAttendanceFile() parses and
  // shows what would happen without writing anything, then
  // confirmAttendanceImport() actually saves it — nothing hits the
  // server until the teacher explicitly confirms the preview.
  function renderAttendanceImportCard(){
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.cssText = 'margin-bottom:20px; padding:20px; overflow:hidden;';
    const monthOptions = ACADEMIC_MONTHS.map(m => {
      const label = new Date(calendarYear, m, 1).toLocaleDateString([], {month:'long', year:'numeric'});
      return `<option value="${calendarYear}-${String(m+1).padStart(2,'0')}"${m === calendarMonth ? ' selected' : ''}>${esc(label)}</option>`;
    }).join('');
    wrap.appendChild(renderRegisterWorkbookImport());
    const simple = document.createElement('div');
    wrap.appendChild(simple);
    simple.innerHTML = `
      <h3 style="margin:0 0 8px; font-size:14px;">Or: a simple file (one column per date)</h3>
      <p class="cap" style="margin:0 0 8px;">.csv or .xlsx — first column header must be exactly "name", every column after that is one date in YYYY-MM-DD format (e.g. name,2026-06-01,2026-06-02,...). Each cell under a date is P (present), A (absent), or left blank for not marked.</p>
      <div style="margin:0 0 10px;">
        <label style="font-size:12.5px; font-weight:600; display:block; margin-bottom:4px;">Which month is this file for?</label>
        <select id="attendanceImportMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${monthOptions}</select>
        <p class="cap" style="margin:4px 0 0;">Any date column outside this month will be flagged and skipped, rather than silently imported into the wrong month.</p>
      </div>
      <input type="file" id="attendanceImportInput" accept=".csv,.xlsx" style="max-width:100%;" />
      <div id="attendanceImportResult" style="margin-top:10px; word-break:break-word; overflow-wrap:anywhere;"></div>
      <button class="btn-primary" style="width:auto; padding:8px 14px; margin-top:10px;" onclick="previewAttendanceFile()">Preview import</button>
    `;
    return wrap;
  }


  // ---------------------------------------------------------------
  // IMPORT CHILDREN FOR THIS CLASS — Class Attendance → Mark
  // Attendance. The roll changes through the year, so a teacher can
  // bring in her class list from a file at any time. The file is
  // compared with the current roll first (nothing is saved until the
  // preview is confirmed):
  //   new names are added to THIS class only (the server takes the
  //   class from the login, never from the file);
  //   names already on the roll are left as they are;
  //   optionally, children missing from the file are taken off the
  //   roll (a soft remove — their past attendance is kept).
  // ---------------------------------------------------------------
  let classPupilImportOpen = false;
  let pendingPupilSync = null; // { add:[{name, admitted_date, dob, gender}], keep:[names], remove:[{id,name}], removeMissing }

  // Names are compared without a register/serial number in front, so
  // "1234 Avani Suryavanshi" and "Avani Suryavanshi" are the same child.
  function normPupilName(s){
    let name = splitRegisterFromName(s).name;
    if(name.normalize) name = name.normalize('NFKC');
    return name
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[\s\u00A0]+/g, ' ')
      .trim()
      .toLocaleLowerCase('en-IN');
  }

  // "1234 Avani Suryavanshi", "1234. Avani", "3) 1234 - Avani" →
  // { register_no: '1234', name: 'Avani …' }. A 3–5 digit number is the
  // register number; a 1–2 digit number in front is only a serial (Sr No)
  // and is dropped.
  function splitRegisterFromName(raw){
    let name = String(raw == null ? '' : raw).trim().replace(/\s+/g, ' ');
    let register_no = '';
    for(let k = 0; k < 2; k++){
      const m = name.match(/^(\d{1,5})\s*[.\-)\]:\/]?\s+(\S.*)$/) || name.match(/^(\d{1,5})[.\-)\]:\/]\s*(\S.*)$/);
      if(!m) break;
      if(m[1].length >= 3 && !register_no) register_no = m[1];
      name = m[2].trim();
    }
    return { register_no, name };
  }

  // Header words for a register-number column.
  const REGISTER_HEADER_WORDS = ['register no', 'register number', 'reg no', 'regno', 'register', 'gr no', 'gr number', 'grno', 'general register no', 'general register number',
    'admission no', 'admission number', 'adm no', 'min no', 'min number', 'mun no', 'nondani kramank',
    'नोंदणी क्रमांक', 'रजि नं', 'रजिस्टर नं', 'रजिस्टर क्रमांक', 'जीआर नं', 'जनरल रजिस्टर नं', 'प्रवेश क्रमांक'];
  function isRegisterHeader(h){ return REGISTER_HEADER_WORDS.includes(String(h || '').toLowerCase().replace(/\./g, '').replace(/[:#]/g, ' ').replace(/[_\s]+/g, ' ').trim()); }

  // Accepts 2026-06-15, 15-06-2026, 15/06/2026 or 15.06.2026 → 2026-06-15.
  function normaliseImportDate(raw){
    const v = String(raw || '').trim();
    if(!v) return '';
    let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
    m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/);
    if(m){ const y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); }
    return null; // not a date we can read
  }

  async function previewClassPupilImport(){
    const input = document.getElementById('classPupilImportInput');
    const resultEl = document.getElementById('classPupilImportResult');
    const removeMissing = !!(document.getElementById('classPupilRemoveMissing') || {}).checked;
    pendingPupilSync = null;
    if(!input || !input.files.length){ resultEl.innerHTML = '<div class="au-error">Choose a .xlsx or .csv file first.</div>'; return; }
    if(!Array.isArray(realPupilsCache)){ resultEl.innerHTML = '<div class="au-error">Still loading the roll — try again in a moment.</div>'; return; }
    resultEl.innerHTML = '<p class="sub">Reading file…</p>';
    let rows;
    try { rows = await readAssessmentFileRows(input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file is empty.</div>'; return; }

    const header = rows[0].map(h => h.trim().toLowerCase().replace(/[\s_]+/g, ' '));
    const col = n => header.findIndex(h => h === n);
    const nameCol = [col('name'), col('student name'), col('child name'), col('child')].find(i => i >= 0);
    if(nameCol === undefined){ resultEl.innerHTML = '<div class="au-error">The first row must be a header with a "name" column (e.g. name,admitted date,dob,gender).</div>'; return; }
    const admCol = [col('admitted date'), col('admission date'), col('date of admission')].find(i => i >= 0);
    const dobCol = [col('dob'), col('date of birth')].find(i => i >= 0);
    const genderCol = col('gender');
    const regCol = rows[0].findIndex(isRegisterHeader);

    const onRollByName = {}, onRollByRegister = {};
    realPupilsCache.forEach(p => {
      const nameKey = normPupilName(p.name);
      (onRollByName[nameKey] = onRollByName[nameKey] || []).push(p);
      const registerKey = String(p.register_no || '').trim().replace(/\.0+$/, '');
      if(registerKey) (onRollByRegister[registerKey] = onRollByRegister[registerKey] || []).push(p);
    });
    const seen = new Set(), matchedIds = new Set(), add = [], keep = [], problems = [], regUpdates = [];
    for(let i = 1; i < rows.length; i++){
      const r = rows[i];
      const split = splitRegisterFromName(r[nameCol]);
      const name = split.name;
      if(!name) continue;
      const regFromCol = regCol >= 0 ? String(r[regCol] || '').trim().replace(/\.0+$/, '') : '';
      const register_no = /^\d{1,6}$/.test(regFromCol) ? regFromCol : split.register_no;
      const key = normPupilName(name);
      const identityKey = register_no ? 'r:' + register_no : 'n:' + key;
      if(seen.has(identityKey)){ problems.push(`Row ${i + 1}: "${name}" appears twice in the file — kept once.`); continue; }
      seen.add(identityKey);
      const registerMatches = register_no ? (onRollByRegister[register_no] || []) : [];
      const nameMatches = onRollByName[key] || [];
      if(registerMatches.length > 1 || (!registerMatches.length && nameMatches.length > 1)){
        (registerMatches.length ? registerMatches : nameMatches).forEach(p => matchedIds.add(p.id));
        problems.push(`Row ${i + 1}: "${name}" matches more than one pupil — add the correct register number.`);
        continue;
      }
      const existing = registerMatches[0] || nameMatches[0] || null;
      if(existing){
        matchedIds.add(existing.id);
        keep.push(existing.name);
        if(register_no && String(existing.register_no || '') !== register_no) regUpdates.push({ id: existing.id, name: existing.name, register_no });
        continue;
      }
      const adm = admCol !== undefined ? normaliseImportDate(r[admCol]) : '';
      const dob = dobCol !== undefined ? normaliseImportDate(r[dobCol]) : '';
      if(adm === null){ problems.push(`Row ${i + 1} (${name}): admitted date "${r[admCol]}" isn't a date I can read — today's date will be used.`); }
      if(dob === null){ problems.push(`Row ${i + 1} (${name}): date of birth "${r[dobCol]}" isn't a date I can read — left blank.`); }
      let gender = genderCol >= 0 ? (r[genderCol] || '').trim() : '';
      if(/^f/i.test(gender)) gender = 'Female'; else if(/^m/i.test(gender)) gender = 'Male'; else gender = '';
      add.push({ name, register_no, admitted_date: adm || todayDateKey(), dob: dob || '', gender });
    }
    const remove = removeMissing ? realPupilsCache.filter(p => !matchedIds.has(p.id)).map(p => ({ id: p.id, name: p.name })) : [];

    if(!add.length && !remove.length && !regUpdates.length){
      resultEl.innerHTML = `<div class="au-success">Nothing to change — all ${keep.length} name${keep.length === 1 ? '' : 's'} in the file are already on the roll.</div>` + (problems.length ? `<div class="au-error" style="margin-top:6px;">${problems.map(esc).join('<br>')}</div>` : '');
      return;
    }
    pendingPupilSync = { add, keep, remove, removeMissing, regUpdates };
    const list = arr => arr.slice(0, 40).map(esc).join(', ') + (arr.length > 40 ? ' …and ' + (arr.length - 40) + ' more' : '');
    resultEl.innerHTML = `<div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
      <p style="margin:0 0 8px; font-weight:600;">Preview — nothing has been saved yet</p>
      ${add.length ? `<p style="margin:0 0 6px;"><b style="color:var(--good,#0a7a0a);">${add.length} to add</b> to ${esc(myClassInfo.class_name || 'this class')}: <span class="cap">${list(add.map(a => a.name))}</span></p>` : ''}
      <p style="margin:0 0 6px;"><b>${keep.length} already on the roll</b> — left as they are${regUpdates.length ? `, except <b>${regUpdates.length}</b> whose register number will be saved: <span class="cap">${regUpdates.slice(0, 30).map(u => esc(u.register_no + ' ' + u.name)).join(', ')}${regUpdates.length > 30 ? ' …' : ''}</span>` : ''}.</p>
      ${add.length ? `<p class="cap" style="margin:0 0 6px;">${add.filter(a => a.register_no).length} of the ${add.length} new children have a register number.</p>` : ''}
      ${remove.length ? `<p style="margin:0 0 6px;"><b style="color:var(--crit,#d03b3b);">${remove.length} to take off the roll</b> (not in the file): <span class="cap">${list(remove.map(r => r.name))}</span><br><span class="cap">Their past attendance and assessments are kept; they just stop appearing on new registers.</span></p>` : ''}
      ${problems.length ? `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:8px 10px; margin:8px 0; font-size:12.5px;">${problems.slice(0, 15).map(esc).join('<br>')}</div>` : ''}
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="confirmClassPupilImport()">Confirm — ${[add.length ? 'add ' + add.length : '', remove.length ? 'remove ' + remove.length : '', regUpdates.length ? 'save ' + regUpdates.length + ' register no.' : ''].filter(Boolean).join(', ')}</button>
        <button class="btn" onclick="pendingPupilSync = null; document.getElementById('classPupilImportResult').innerHTML = '<p class=&quot;cap&quot;>Import cancelled — nothing was saved.</p>';">Cancel</button>
      </div></div>`;
  }

  async function confirmClassPupilImport(){
    const resultEl = document.getElementById('classPupilImportResult');
    if(!pendingPupilSync){ resultEl.innerHTML = '<div class="au-error">Preview a file first.</div>'; return; }
    if(pendingPupilSync.remove.length && !confirm(pendingPupilSync.remove.length + ' child' + (pendingPupilSync.remove.length === 1 ? '' : 'ren') + ' will be taken off the roll. Continue?')) return;
    resultEl.innerHTML = '<p class="sub">Saving…</p>';
    try{
      const res = await fetch(pupilApiUrl('backend/pupils/sync_class_pupils.php'), {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, add: pendingPupilSync.add, remove_ids: pendingPupilSync.remove.map(r => r.id), register_updates: (pendingPupilSync.regUpdates || []).map(u => ({ id: u.id, register_no: u.register_no })) })
      });
      const data = await res.json();
      if(data.status !== 'success'){ resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`; return; }
      pendingPupilSync = null;
      alert('Roll synchronized: ' + data.added + ' added' + (data.reactivated ? ', ' + data.reactivated + ' restored with earlier records' : '') + (data.updated ? ', ' + data.updated + ' updated' : '') + (data.removed ? ', ' + data.removed + ' taken off the roll' : '') + (data.register_updated ? ', ' + data.register_updated + ' register numbers saved' : '') + (data.skipped && data.skipped.length ? ', ' + data.skipped.length + ' skipped' : '') + '.');
      if(Array.isArray(data.pupils)) applyCanonicalPupilRoster(data.pupils);
      else { realPupilsCache = null; await fetchMyPupils(); }
      renderAttendanceBody();
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }

  // A file with this class's current roll already in it, to edit and import back.
  function downloadClassRollTemplate(){
    if(typeof XLSX === 'undefined'){ alert('.xlsx support did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const rows = [['register_no', 'name', 'admitted_date', 'dob', 'gender']];
    (Array.isArray(realPupilsCache) ? realPupilsCache : []).forEach(p => rows.push([p.register_no || '', p.name, p.admitted_date || '', p.dob || '', p.gender || '']));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch: 12}, {wch: 28}, {wch: 14}, {wch: 14}, {wch: 10}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Class roll');
    XLSX.writeFile(wb, 'class-roll-' + (myClassInfo.class_name || 'class').replace(/\s+/g, '') + '.xlsx');
  }

  function renderClassPupilImportCard(){
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'padding:0; margin:0 0 20px; overflow:hidden;';
    card.innerHTML = `
      <div onclick="classPupilImportOpen = !classPupilImportOpen; this.nextElementSibling.classList.toggle('hidden', !classPupilImportOpen); this.querySelector('.chevron').style.transform = classPupilImportOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:16px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">👧 Import children for this class</h3>
          <p class="cap" style="margin:0;">Bring in ${esc(myClassInfo.class_name || 'this class')}'s list from a .xlsx or .csv file — new names are added, names already on the roll are left alone.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${classPupilImportOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${classPupilImportOpen ? '' : 'hidden'}" style="padding:0 18px 18px;">
        <p class="cap" style="margin:0 0 8px;">First row is the header. Only <b>name</b> is required; <b>register_no</b> (or the register number written before the name, e.g. "1234 Avani Suryavanshi"), <b>admitted_date</b>, <b>dob</b> and <b>gender</b> are optional — the class is listed in register-number order (dates like 2026-06-15 or 15/06/2026). Children are always added to <b>${esc(myClassInfo.class_name || 'this class')}</b> — the class you are logged in to.</p>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:10px 0;">
          <input type="file" id="classPupilImportInput" accept=".xlsx,.csv" style="max-width:100%;" />
          <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="previewClassPupilImport()">Preview import</button>
          <button class="btn" onclick="downloadClassRollTemplate()">⬇ Download current roll (.xlsx)</button>
        </div>
        <label style="display:flex; align-items:flex-start; gap:8px; font-size:13px; margin:4px 0 10px;">
          <input type="checkbox" id="classPupilRemoveMissing" style="margin-top:3px;" />
          <span>This file is the <b>complete</b> class list — take children who are not in it off the roll (their past records are kept).</span>
        </label>
        <div id="classPupilImportResult" style="word-break:break-word; overflow-wrap:anywhere;"></div>
      </div>`;
    return card;
  }


  // ---------------------------------------------------------------
  // IMPORT FROM THE ATTENDANCE REGISTER WORKBOOK (.xlsx) — uses the
  // register reader in backend/import/ (detect-format.php finds the
  // month sheets and header rows; convert.php reads each child's
  // P / A / H per day). Nothing is saved until the preview is
  // confirmed, and everything is saved to THIS class only:
  //   • children in the register but not on the roll can be added
  //     (backend/pupils/sync_class_pupils.php — selected class verified against the login);
  //   • P and A marks go through the same save_attendance.php the
  //     register itself uses; H (holiday) and blank cells are not marks.
  // ---------------------------------------------------------------
  let registerImportState = null; // { file, sheets:[…], selected:Set, preview:{…} }

  async function registerImportFetch(url, formData){
    const res = await fetch(url + window.location.search, { method: 'POST', body: formData });
    const text = await res.text();
    try { return JSON.parse(text); }
    catch(e){
      if(/autoload|PhpSpreadsheet|vendor/i.test(text)) throw new Error('The Excel reader library (PhpSpreadsheet) is not installed on the server — see the note under the card.');
      if(res.status === 404) throw new Error('backend/import/' + url.split('/').pop() + ' was not found on the server.');
      throw new Error('The server sent back something that is not data (status ' + res.status + ').');
    }
  }

  async function readRegisterWorkbook(){
    const input = document.getElementById('registerImportInput');
    const out = document.getElementById('registerImportResult');
    if(!input.files.length){ out.innerHTML = '<div class="au-error">Choose the register workbook (.xlsx) first.</div>'; return; }
    out.innerHTML = '<p class="sub">Reading the workbook…</p>';
    const fd = new FormData(); fd.append('file', input.files[0]);
    try{
      const data = await registerImportFetch('backend/import/detect-format.php', fd);
      if(data.status !== 'success') throw new Error(data.message + (data.detail ? ' — ' + data.detail : ''));
      const sheets = (data.sheets || []).filter(s => s.sections_found > 0);
      if(!sheets.length){ out.innerHTML = '<div class="au-error">No attendance sheet found — each month sheet needs a header row with "Student Name" and day numbers 1–31.</div>'; return; }
      registerImportState = { file: input.files[0], sheets, selected: new Set(sheets.filter(s => s.month).map(s => s.sheet)), preview: null };
      renderRegisterSheetPicker();
    } catch(err){ out.innerHTML = `<div class="au-error">${esc(err.message)}</div>`; }
  }

  function renderRegisterSheetPicker(){
    const out = document.getElementById('registerImportResult');
    const st = registerImportState;
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
      <p style="margin:0 0 8px; font-weight:600;">Month sheets found in ${esc(st.file.name)}</p>
      ${st.sheets.map(s => `<label style="display:flex; gap:8px; align-items:center; font-size:13px; margin:4px 0;">
        <input type="checkbox" ${st.selected.has(s.sheet) ? 'checked' : ''} ${s.month ? '' : 'disabled'} onchange="registerImportState.selected[this.checked ? 'add' : 'delete']('${esc(s.sheet).replace(/'/g, "\\'")}')" />
        <b>${esc(s.sheet)}</b> <span class="cap">${s.month ? new Date(s.month.year, s.month.month - 1, 1).toLocaleDateString([], {month:'long', year:'numeric'}) : 'month not recognised from the sheet name — skipped'} · ${s.sections_found} section${s.sections_found === 1 ? '' : 's'}</span></label>`).join('')}
      <label style="display:flex; gap:8px; align-items:flex-start; font-size:13px; margin:10px 0 4px;">
        <input type="checkbox" id="registerAddMissing" checked style="margin-top:3px;" />
        <span>Synchronize children who are in the register but not yet on ${esc(myClassInfo.class_name || 'this class')}'s roll</span></label>
      <button class="btn-primary" style="width:auto; padding:8px 14px; margin-top:8px;" onclick="previewRegisterImport()">Preview import</button>
    </div>`;
  }
