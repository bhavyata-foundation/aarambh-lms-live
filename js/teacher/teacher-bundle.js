/* ===== teacher-part-01.js ===== */
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
       EXAM ASSESSMENT
       ========================================================= */
    'backend/get_exam_assessment.php':
      'backend/assessment/exam/get_exam_assessment.php',

    'backend/save_exam_assessment.php':
      'backend/assessment/exam/save_exam_assessment.php',


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
function applyRealTeacherName(name, email){
  if(!name) return;
  const nameEl = document.querySelector('.user-name');
  if(nameEl) nameEl.textContent = name;
  if(nameEl && email){ // the logged-in email (Gmail ID), under the name in the top-right corner
    let em = document.querySelector('.user-email');
    if(!em){ em = document.createElement('div'); em.className = 'user-email'; em.style.cssText = 'font-size:11px; font-weight:400; opacity:.9; line-height:1.3; word-break:break-all;'; nameEl.insertAdjacentElement('afterend', em); }
    em.textContent = email; nameEl.title = email;
  }

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
      <button style="${tabStyle(classAttendanceTab === 'reports')}" onclick="switchClassAttendanceTab('reports')">📊 Reports</button>
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
    } else if(classAttendanceTab === 'reports'){
      renderAttendanceReports(); // part 13
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
  function normPupilName(s){ return splitRegisterFromName(s).name.toLowerCase(); }

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

  // The register number is recognised by its VALUES, whatever the heading
  // says: a column headed Register / Reg / G.R. / Min / Sr. No. / S.No /
  // Roll / No. (or blank) whose values are mostly unique 3–5 digit numbers
  // (7101, 7102 …). A Roll No column of 1, 2, 3 … is not one.
  function looksLikeRegisterNumbers(values){
    const v = values.map(x => String(x == null ? '' : x).trim().replace(/\.0+$/, '')).filter(Boolean);
    if(v.length < 2) return false;
    const reg = v.filter(x => /^\d{3,5}$/.test(x));
    return reg.length >= v.length * 0.8 && new Set(reg).size === reg.length;
  }
  const SERIAL_HEADER_WORDS = ['sr no', 'sr', 'srno', 's no', 'sno', 'serial no', 'serial number', 'no', 'number', 'roll no', 'roll', 'roll number', 'min no', 'min number', 'mun no', 'id', 'student id', 'अ क्र', 'अक्र', 'क्रमांक', 'हजेरी क्रमांक'];
  function pickRegisterColumn(header, bodyRows, skipCols){
    const named = (header || []).findIndex(isRegisterHeader);
    if(named >= 0 && !skipCols.includes(named)) return named;            // a "Register No" heading always wins
    const norm = h => String(h || '').toLowerCase().replace(/\./g, '').replace(/[:#]/g, ' ').replace(/[_\s]+/g, ' ').trim();
    const width = Math.max((header || []).length, ...bodyRows.map(r => (r || []).length), 0);
    for(let c = 0; c < width; c++){
      if(skipCols.includes(c)) continue;
      const h = norm((header || [])[c]);
      if(h && !SERIAL_HEADER_WORDS.includes(h)) continue;
      if(looksLikeRegisterNumbers(bodyRows.map(r => (r || [])[c]))) return c;
    }
    return -1;
  }

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
    resultEl.innerHTML = '<p class="sub">Reading file…</p>';
    let rows;
    try { rows = await readAssessmentFileRows(input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    previewClassPupilImportRows(rows, resultEl, removeMissing); // part 13
  }

  async function confirmClassPupilImport(){
    const resultEl = document.getElementById('classPupilImportResult');
    if(!pendingPupilSync){ resultEl.innerHTML = '<div class="au-error">Preview a file first.</div>'; return; }
    if(pendingPupilSync.remove.length && !confirm(pendingPupilSync.remove.length + ' child' + (pendingPupilSync.remove.length === 1 ? '' : 'ren') + ' will be taken off the roll. Continue?')) return;
    resultEl.innerHTML = '<p class="sub">Saving…</p>';
    try{
      const res = await fetch('backend/pupils/sync_class_pupils.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ add: pendingPupilSync.add, remove_ids: pendingPupilSync.remove.map(r => r.id), register_updates: (pendingPupilSync.regUpdates || []).map(u => ({ id: u.id, register_no: u.register_no })) })
      });
      const data = await res.json();
      if(data.status !== 'success'){ resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`; return; }
      pendingPupilSync = null;
      alert('Roll updated: ' + data.added + ' added' + (data.removed ? ', ' + data.removed + ' taken off the roll' : '') + (data.register_updated ? ', ' + data.register_updated + ' register numbers saved' : '') + (data.skipped && data.skipped.length ? ', ' + data.skipped.length + ' skipped' : '') + '.');
      realPupilsCache = null; // reload the real roll everywhere
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
  //     (backend/pupils/sync_class_pupils.php — class taken from the login);
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
        <input type="checkbox" id="registerAddMissing" ${Array.isArray(realPupilsCache) && realPupilsCache.length ? '' : 'checked'} style="margin-top:3px;" />
        <span>Add children who are in the register but not yet on ${esc(myClassInfo.class_name || 'this class')}'s roll</span></label>
      <button class="btn-primary" style="width:auto; padding:8px 14px; margin-top:8px;" onclick="previewRegisterImport()">Preview import</button>
    </div>`;
  }


/* ===== teacher-part-02.js ===== */
/* =========================================================================
   teacher-part-02.js — part 2 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  async function previewRegisterImport(){
    const out = document.getElementById('registerImportResult');
    const st = registerImportState;
    if(!st || !st.selected.size){ out.insertAdjacentHTML('beforeend', '<div class="au-error">Tick at least one month sheet.</div>'); return; }
    st.addMissing = !!(document.getElementById('registerAddMissing') || {}).checked;
    out.innerHTML = '<p class="sub">Reading attendance…</p>';
    const byName = {}; // normalised name -> { name, roll, attendance:{date:'P'|'A'|'H'|null} }
    const perSheet = []; let warnings = 0;
    try{
      for(const sheet of st.sheets.filter(s => st.selected.has(s.sheet))){
        const fd = new FormData(); fd.append('file', st.file); fd.append('sheet', sheet.sheet);
        const data = await registerImportFetch('backend/import/convert.php', fd);
        if(data.status !== 'success') throw new Error(sheet.sheet + ': ' + data.message + (data.detail ? ' — ' + data.detail : ''));
        warnings += data.warning_count || 0;
        perSheet.push({ sheet: sheet.sheet, month: data.month, students: data.students_found, summary: data.attendance_summary });
        (data.students || []).forEach(s => {
          const key = normPupilName(s.name);
          const rec = byName[key] || (byName[key] = { name: s.name.trim().replace(/\s+/g, ' '), roll: s.roll_no, attendance: {} });
          Object.assign(rec.attendance, s.attendance || {});
        });
      }
    } catch(err){ out.innerHTML = `<div class="au-error">${esc(err.message)}</div>`; return; }

    const roll = {}; (realPupilsCache || []).forEach(p => { roll[normPupilName(p.name)] = p; });
    const matched = [], missing = [];
    Object.values(byName).forEach(r => (roll[normPupilName(r.name)] ? matched : missing).push(r));
    const today = todayDateKey();
    const count = list => { let p = 0, a = 0, h = 0, future = 0; list.forEach(r => Object.entries(r.attendance).forEach(([d, v]) => { if(d > today){ if(v) future++; return; } if(v === 'P') p++; else if(v === 'A') a++; else if(v === 'H') h++; })); return { p, a, h, future }; };
    const willSave = count(st.addMissing ? matched.concat(missing) : matched);
    st.preview = { byName, matched, missing, perSheet };

    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
      <p style="margin:0 0 8px; font-weight:600;">Preview — nothing has been saved yet</p>
      <ul style="margin:0 0 10px 18px; padding:0; font-size:13px;">${perSheet.map(s => `<li><b>${esc(s.sheet)}</b> — ${s.students} children · P ${s.summary.P} · A ${s.summary.A} · H ${s.summary.H} · blank ${s.summary.blank}</li>`).join('')}</ul>
      <p style="margin:0 0 6px;"><b>${matched.length}</b> child${matched.length === 1 ? ' is' : 'ren are'} already on the roll.</p>
      ${missing.length ? `<p style="margin:0 0 6px;"><b style="color:${st.addMissing ? 'var(--good,#0a7a0a)' : 'var(--crit,#d03b3b)'};">${missing.length} not on the roll</b> — ${st.addMissing ? 'will be added to ' + esc(myClassInfo.class_name || 'this class') : '<b>skipped</b> (tick "Add children…" to include them)'}: <span class="cap">${missing.slice(0, 40).map(r => esc(r.name)).join(', ')}${missing.length > 40 ? ' …' : ''}</span></p>` : ''}
      <p style="margin:0 0 6px;">Will save <b>${willSave.p}</b> present and <b>${willSave.a}</b> absent marks. Saved marks replace what is already there for that child and day.</p>
      <p class="cap" style="margin:0 0 6px;">${willSave.h ? willSave.h + ' holiday (H) cells are not saved as marks — mark those days as holidays on the register calendar if they aren\u2019t already. ' : ''}${willSave.future ? willSave.future + ' marks dated after today are skipped. ' : ''}${warnings ? warnings + ' cells had something other than P / A / H and were left out.' : ''}</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="confirmRegisterImport()" ${willSave.p + willSave.a || (st.addMissing && missing.length) ? '' : 'disabled'}>Confirm import</button>
        <button class="btn" onclick="renderRegisterSheetPicker()">Back</button>
      </div></div>`;
  }

  async function confirmRegisterImport(){
    const out = document.getElementById('registerImportResult');
    const st = registerImportState;
    if(!st || !st.preview) return;
    try{
      let added = 0;
      if(st.addMissing && st.preview.missing.length){
        out.innerHTML = '<p class="sub">Adding children to the roll…</p>';
        const earliest = r => Object.keys(r.attendance).filter(d => r.attendance[d]).sort()[0] || todayDateKey();
        const res = await fetch('backend/pupils/sync_class_pupils.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ add: st.preview.missing.map(r => ({ name: r.name, admitted_date: earliest(r) })), remove_ids: [] })
        });
        const data = await res.json();
        if(data.status !== 'success') throw new Error(data.message || 'Could not add the children.');
        added = data.added;
        realPupilsCache = null;
        await fetchMyPupils(); // the real roll, now including the new children
        if(!Array.isArray(realPupilsCache)) throw new Error('Children were added, but the roll could not be reloaded — press Confirm again.');
      }
      const roll = {}; realPupilsCache.forEach(p => { roll[normPupilName(p.name)] = p; });
      const today = todayDateKey();
      const marks = [];
      Object.values(st.preview.byName).forEach(r => {
        const pupil = roll[normPupilName(r.name)];
        if(!pupil) return;
        Object.entries(r.attendance).forEach(([date, v]) => {
          if(date > today) return;
          if(v === 'P') marks.push({ pupil_id: pupil.id, date, status: 'present' });
          else if(v === 'A') marks.push({ pupil_id: pupil.id, date, status: 'absent' });
        });
      });
      let saved = 0;
      for(let i = 0; i < marks.length; i += 400){
        out.innerHTML = `<p class="sub">Saving marks… ${Math.min(i + 400, marks.length)} of ${marks.length}</p>`;
        const res = await fetch('backend/attendance/save_attendance.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ marks: marks.slice(i, i + 400) })
        });
        const data = await res.json();
        if(data.status !== 'success') throw new Error((data.message || 'Could not save marks.') + ' (' + saved + ' saved before this.)');
        saved += data.saved || 0;
      }
      registerImportState = null;
      Object.keys(attendanceMonthStatus).forEach(k => delete attendanceMonthStatus[k]); // reload months from the database
      alert('Register imported: ' + (added ? added + ' children added, ' : '') + saved + ' attendance marks saved.');
      renderAttendanceBody();
    } catch(err){ out.innerHTML = `<div class="au-error">${esc(err.message)}</div>`; }
  }

  function renderRegisterWorkbookImport(){
    const box = document.createElement('div');
    box.style.cssText = 'border:1px solid var(--border); border-radius:10px; padding:16px; margin-bottom:18px; background:var(--bg);';
    box.innerHTML = `
      <h3 style="margin:0 0 6px; font-size:14px;">📘 From the class attendance register workbook (.xlsx)</h3>
      <p class="cap" style="margin:0 0 10px;">The register with one sheet per month (sheet names like "JUNE 2026"), a "Student Name" column, and day numbers 1–31 across the top with P / A / H in each cell. The workbook is read first and you see a preview — nothing is saved until you confirm, and it only ever goes into ${esc(myClassInfo.class_name || 'this class')}.</p>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <input type="file" id="registerImportInput" accept=".xlsx,.xls" style="max-width:100%;" />
        <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="readRegisterWorkbook()">Read workbook</button>
      </div>
      <div id="registerImportResult" style="margin-top:12px; word-break:break-word; overflow-wrap:anywhere;"></div>`;
    return box;
  }


  // =================================================================
  // SMART ATTENDANCE IMPORT — one button, any register file.
  //
  // Reads any .xlsx / .xls / .csv in the browser (the file never leaves
  // the teacher's computer until she confirms), then:
  //   1. finds the attendance grid on every sheet on its own — the
  //      name column, the header row(s) of dates or day numbers, the
  //      month/year (from the sheet name, a title cell or real dates),
  //      repeated sections, and "Total" rows to skip;
  //      it also understands a long list (one row per child per day);
  //   2. works out what each mark means (P/A/H, ✓/✗, 1/0, Present,
  //      हजर / गैरहजर …) and asks only about marks it doesn't know;
  //   3. shows that reading in plain words so the teacher can correct
  //      it, then a preview — nothing is saved before Confirm;
  //   4. saves to THIS class only (children added through
  //      sync_class_pupils.php, marks through save_attendance.php,
  //      holiday days through save_student_holiday.php);
  //   5. remembers the corrections for that file layout, so next
  //      month's register imports without questions.
  // =================================================================
  let smartImport = null; // { fileName, sheets:[analysis], step }

  const SI_NAME_WORDS = ['name', 'student name', 'name of student', 'students name', "student's name", 'child name', 'name of child', 'child', 'student', 'pupil', 'pupil name', 'full name',
    'नाव', 'नाम', 'विद्यार्थ्याचे नाव', 'विद्यार्थ्यांचे नाव', 'विद्यार्थी', 'छात्र का नाम', 'बालकाचे नाव'];
  const SI_ROLL_WORDS = ['roll', 'roll no', 'roll no.', 'roll number', 'sr', 'sr no', 'sr. no.', 'sr.no', 'sr no.', 's no', 's.no', 'sno', 'no', 'no.', 'अ.क्र', 'अ. क्र.', 'क्रमांक', 'हजेरी क्रमांक'];
  const SI_TOTAL_WORDS = /^(total|grand total|present|absent|total present|total absent|sum|average|avg|एकूण|एकूण हजर|एकूण गैरहजर|सरासरी|कुल)\b/i;
  const SI_MONTHS = { jan:0, january:0, feb:1, february:1, mar:2, march:2, apr:3, april:3, may:4, jun:5, june:5, jul:6, july:6, aug:7, august:7, sep:8, sept:8, september:8, oct:9, october:9, nov:10, november:10, dec:11, december:11,
    'जानेवारी':0, 'फेब्रुवारी':1, 'मार्च':2, 'एप्रिल':3, 'मे':4, 'जून':5, 'जुलै':6, 'ऑगस्ट':7, 'सप्टेंबर':8, 'ऑक्टोबर':9, 'नोव्हेंबर':10, 'डिसेंबर':11 };
  const SI_MARKS = {
    present: ['p', 'present', 'pr', '✓', '✔', '√', '1', 'y', 'yes', 'हजर', 'उपस्थित', 'उ', 'ह'],
    absent:  ['a', 'ab', 'abs', 'absent', 'x', '✗', '✘', '×', '0', 'n', 'no', 'गैरहजर', 'अनुपस्थित', 'गै', 'अ'],
    holiday: ['h', 'hol', 'holiday', 'hd', 'सुट्टी', 'सुटी', 'अवकाश', 'छुट्टी']
  };

  // Rows that are not children: a crossed-out / struck entry, or a note
  // written entirely in brackets, e.g. "(Crossed out in source)", "(left)".
  function siNotAChild(name){
    const t = String(name || '').trim();
    return /crossed\s*out|struck\s*off|strike\s*through|cancel+ed|^\s*[(\[{].*[)\]}]\s*$/i.test(t);
  }
  function siText(v){ return v instanceof Date ? '' : String(v == null ? '' : v).trim(); }
  function siNorm(v){ return siText(v).toLowerCase().replace(/\s+/g, ' ').replace(/[:.]$/, ''); }
  function siYmd(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  // A header cell → a full date, a bare day number, or nothing.
  function siReadDateCell(v){
    if(v instanceof Date && !isNaN(v)) return { date: new Date(v.getFullYear(), v.getMonth(), v.getDate()) };
    const t = siText(v);
    if(!t) return null;
    let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m) return { date: new Date(+m[1], +m[2] - 1, +m[3]) };
    m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/);
    if(m) return { date: new Date(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]) };
    m = t.match(/^(\d{1,2})[\s\-\/]*([a-z\u0900-\u097F]{3,})[\s\-\/,]*(\d{2}|\d{4})?$/i);
    if(m && SI_MONTHS[m[2].toLowerCase()] !== undefined){
      const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null;
      return y ? { date: new Date(y, SI_MONTHS[m[2].toLowerCase()], +m[1]) } : { day: +m[1], month: SI_MONTHS[m[2].toLowerCase()] };
    }
    m = t.match(/^([1-9]|[12]\d|3[01])(?:\s*[\r\n]+.*|\s+[a-z\u0900-\u097F]{2,}\.?)?$/is); // "5", "5 Wed", "5\nWed"
    if(m) return { day: +m[1] };
    return null;
  }

  // Month + year from text such as "JUNE 2026", "Jun-26", "जून २०२६".
  function siMonthYearFromText(text){
    const t = String(text || '').toLowerCase().replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d));
    let month = null;
    for(const [word, idx] of Object.entries(SI_MONTHS)){
      const re = new RegExp('(^|[^a-z\\u0900-\\u097F])' + word + '($|[^a-z\\u0900-\\u097F])', 'i');
      if(re.test(t)){ month = idx; break; }
    }
    if(month === null) return null;
    let year = null;
    const y4 = t.match(/(20\d{2})/); const y2 = t.match(/(?:^|[^\d])(\d{2})(?:$|[^\d])/);
    if(y4) year = +y4[1]; else if(y2) year = 2000 + +y2[1];
    return { month, year };
  }

  function siMarkMeaning(value, remembered){
    const v = siNorm(value);
    if(!v) return 'blank';
    if(remembered && remembered[v]) return remembered[v];
    for(const [meaning, words] of Object.entries(SI_MARKS)) if(words.includes(v)) return meaning;
    return 'unknown';
  }

  function siRememberedMaps(){ try { return JSON.parse(localStorage.getItem('smartImportMaps') || '{}'); } catch(e){ return {}; } }
  function siFingerprint(headerCells){ return headerCells.map(siNorm).filter(Boolean).filter(h => !/^\d+$/.test(h)).slice(0, 8).join('|'); }

  // ---- Find the grid(s) on one sheet ----
  function siAnalyseSheet(name, grid){
    const out = { sheet: name, include: true, sections: [], long: null, problems: [], monthGuess: siMonthYearFromText(name), valueCounts: {}, valueMap: {} };
    const maxCols = Math.min(400, Math.max(0, ...grid.slice(0, 60).map(r => r.length)));
    // Title text above the first header, for a month like "Attendance — June 2026".
    const titleText = grid.slice(0, 8).map(r => r.map(siText).join(' ')).join(' ');
    if(!out.monthGuess || out.monthGuess.year === null){
      const fromTitle = siMonthYearFromText(titleText);
      if(fromTitle){
        if(!out.monthGuess) out.monthGuess = fromTitle;
        else if(fromTitle.year !== null) out.monthGuess.year = fromTitle.year;
      }
    }

    // Header rows: a name-like cell, or at least five date/day cells in a row.
    for(let r = 0; r < grid.length; r++){
      const row = grid[r] || [];
      let nameCol = -1, rollCol = -1, regCol = -1; const dateCols = [];
      for(let c = 0; c < Math.min(row.length, maxCols); c++){
        const n = siNorm(row[c]);
        if(nameCol < 0 && SI_NAME_WORDS.includes(n)) nameCol = c;
        else if(regCol < 0 && isRegisterHeader(row[c])) regCol = c;
        else if(rollCol < 0 && SI_ROLL_WORDS.includes(n)) rollCol = c;
        const d = siReadDateCell(row[c]);
        if(d && c !== rollCol && c !== regCol) dateCols.push({ col: c, ...d });
      }
      // Bare day numbers must run upward, otherwise it's a data row of numbers.
      // A header needs five or more real dates, or five or more day
      // numbers that strictly go up (1, 2, 3 …) — a row of 1/0 marks
      // never does, so it can't be mistaken for a header.
      const days = dateCols.filter(d => d.day !== undefined);
      const fullDates = dateCols.filter(d => d.date);
      const increasing = days.length >= 5 && days.every((d, i) => i === 0 || d.day > days[i - 1].day);
      if(fullDates.length >= 5 || increasing){
        if(!increasing) for(let i = dateCols.length - 1; i >= 0; i--) if(!dateCols[i].date) dateCols.splice(i, 1);
        if(nameCol < 0){
          // No labelled name column: the text column just left of the dates.
          for(let c = dateCols[0].col - 1; c >= 0; c--){
            const sample = grid.slice(r + 1, r + 12).map(x => siText((x || [])[c])).filter(Boolean);
            if(sample.length >= 2 && sample.filter(s => /[a-z\u0900-\u097F]{2,}/i.test(s) && !/^\d+$/.test(s)).length >= sample.length * 0.6){ nameCol = c; break; }
          }
        }
        if(nameCol >= 0) out.sections.push({ headerRow: r, nameCol, rollCol, regCol, dateCols, headerCells: row });
      } else if(nameCol >= 0 && !out.long){
        // Long layout: name + a date column + a mark column, one row per day.
        const dateColIdx = row.findIndex(v => ['date', 'day', 'दिनांक', 'तारीख'].includes(siNorm(v)));
        const markColIdx = row.findIndex(v => ['status', 'attendance', 'mark', 'present/absent', 'p/a', 'हजेरी', 'उपस्थिती'].includes(siNorm(v)));
        if(dateColIdx >= 0 && markColIdx >= 0) out.long = { headerRow: r, nameCol, dateCol: dateColIdx, markCol: markColIdx, headerCells: row };
      }
    }
    if(!out.sections.length && !out.long){ out.include = false; out.problems.push('No attendance grid found on this sheet.'); return out; }

    const remembered = siRememberedMaps()[siFingerprint((out.sections[0] || out.long).headerCells)] || {};
    out.fingerprint = siFingerprint((out.sections[0] || out.long).headerCells);
    const countValue = v => { const k = siNorm(v); if(!k) return; out.valueCounts[k] = (out.valueCounts[k] || 0) + 1; };

    // Children rows under each section header, up to the next header.
    const headerRows = out.sections.map(s => s.headerRow);
    out.sections.forEach((s, i) => {
      s.rows = [];
      const end = i + 1 < out.sections.length ? headerRows[i + 1] : grid.length;
      const regPick = pickRegisterColumn(s.headerCells, grid.slice(s.headerRow + 1, end).map(r => (r || []).map(siText)), [s.nameCol, ...s.dateCols.map(d => d.col)]);
      if(regPick >= 0){ s.regCol = regPick; if(s.rollCol === regPick) s.rollCol = -1; }
      for(let r = s.headerRow + 1; r < end; r++){
        const row = grid[r] || [];
        // A register number may be in its own column, or written in front
        // of the name ("1234 Avani Suryavanshi") — either way it is kept.
        const split = splitRegisterFromName(siText(row[s.nameCol]));
        const name = split.name;
        const regCell = s.regCol >= 0 ? siText(row[s.regCol]).replace(/\.0+$/, '') : '';
        const reg = /^\d{1,6}$/.test(regCell) ? regCell : split.register_no;
        if(!name || SI_TOTAL_WORDS.test(name) || /^\d+([.,]\d+)?%?$/.test(name) || siNotAChild(name)) continue;
        if(s.rollCol >= 0 && siText(row[s.rollCol]) && !/^\d+$/.test(siText(row[s.rollCol]))) continue; // sub-headings in the roll column
        const marks = s.dateCols.map(d => { countValue(row[d.col]); return row[d.col]; });
        if(marks.every(m => !siText(m))) continue; // a child row with nothing marked adds nothing
        s.rows.push({ name, reg, marks });
      }
    });
    if(out.long){
      const L = out.long; L.rows = [];
      for(let r = L.headerRow + 1; r < grid.length; r++){
        const row = grid[r] || [];
        const lsplit = splitRegisterFromName(siText(row[L.nameCol]));
        const name = lsplit.name;
        const d = siReadDateCell(row[L.dateCol]);
        if(!name || !d || !d.date || siNotAChild(name)) continue;
        countValue(row[L.markCol]);
        L.rows.push({ name, reg: lsplit.register_no, date: siYmd(d.date), mark: row[L.markCol] });
      }
    }
    Object.keys(out.valueCounts).forEach(v => { out.valueMap[v] = siMarkMeaning(v, remembered.values); });
    out.needsMonth = out.sections.some(s => s.dateCols.some(d => !d.date && (d.month === undefined || !out.monthGuess || out.monthGuess.year === null))) && !(out.monthGuess && out.monthGuess.year !== null && out.monthGuess.month !== undefined);
    return out;
  }

  // ---- The dates for one section, once month/year are settled ----
  function siSectionDates(sheet, s){
    return s.dateCols.map(d => {
      if(d.date) return siYmd(d.date);
      const month = d.month !== undefined ? d.month : (sheet.monthGuess ? sheet.monthGuess.month : null);
      const year = sheet.monthGuess ? sheet.monthGuess.year : null;
      if(month === null || month === undefined || !year) return null;
      const dt = new Date(year, month, d.day);
      return dt.getMonth() === month ? siYmd(dt) : null; // 31 June is dropped
    });
  }

  // All sheets → { byName: {key: {name, attendance:{date:'present'|'absent'|'holiday'}}}, stats }
  function siCollect(){
    const byName = {}; const stats = { present: 0, absent: 0, holiday: 0, ignored: 0, unknown: 0, future: 0, noDate: 0 };
    const today = todayDateKey();
    const put = (sheet, name, date, raw, reg) => {
      const meaning = sheet.valueMap[siNorm(raw)] || (siText(raw) ? 'unknown' : 'blank');
      if(meaning === 'blank') return;
      if(!date){ stats.noDate++; return; }
      if(meaning === 'unknown'){ stats.unknown++; return; }
      if(meaning === 'ignore'){ stats.ignored++; return; }
      if(date > today){ stats.future++; return; }
      const key = normPupilName(name);
      const rec = byName[key] || (byName[key] = { name, register_no: '', attendance: {} });
      if(reg && !rec.register_no) rec.register_no = reg;
      rec.attendance[date] = meaning;
      stats[meaning]++;
    };
    smartImport.sheets.filter(s => s.include).forEach(sheet => {
      sheet.sections.forEach(s => { const dates = siSectionDates(sheet, s); s.rows.forEach(r => r.marks.forEach((m, i) => put(sheet, r.name, dates[i], m, r.reg))); });
      if(sheet.long) sheet.long.rows.forEach(r => put(sheet, r.name, r.date, r.mark, r.reg));
    });
    return { byName, stats };
  }

  async function smartImportChoose(mode){
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.xlsx,.xls,.csv';
    input.onchange = async () => {
      const file = input.files[0]; if(!file) return;
      if(!importFileTypeOk(file)) return;
      if(typeof XLSX === 'undefined'){ alert('The spreadsheet reader did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
      const out = siPanel();
      out.innerHTML = '<p class="sub">Reading ' + esc(file.name) + '…</p>';
      try{
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        if(mode === 'roll'){
          // Admissions: the file is read as a list of children only.
          const lists = wb.SheetNames.map(n => siClassListRows(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }))).filter(Boolean);
          if(!lists.length){ importRefuse(out, ['No column for the children\u2019s names was found (it must be headed Name or Student Name).']); return; }
          lists.sort((a, b) => b.names - a.names);
          if(lists[0].rows.length < 2){ importRefuse(out, ['There is a Name column, but no children are listed under it.']); return; }
          renderSmartClassListStep(file.name, lists[0].rows); return;
        }
        const sheets = wb.SheetNames.map(n => siAnalyseSheet(n, XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' })));
        if(!sheets.some(s => s.include)){
          // No attendance marks anywhere — is it a list of children instead?
          const lists = wb.SheetNames.map(n => siClassListRows(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }))).filter(Boolean);
          if(lists.length){ lists.sort((a, b) => b.names - a.names); renderSmartClassListStep(file.name, lists[0].rows); return; }
        }
        if(!sheets.some(s => s.include)){
          const hasNames = wb.SheetNames.some(n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }).slice(0, 20).some(r => r.some(c => SI_NAME_WORDS.includes(siNorm(c)))));
          importRefuse(out, hasNames ? ['There is a Name column, but no day columns (1, 2, 3 … 31 or dates) with P / A / H marks.'] : ['This doesn\u2019t look like an attendance register or a class list.', 'No column for the children\u2019s names (Name / Student Name) and no day columns (1 … 31) were found.']);
          return;
        }
        {
          // another class's register? (only checked when this class already has children)
          const names = sheets.filter(s => s.include).flatMap(s => s.sections.flatMap(x => x.rows.map(r => r.name)));
          if((realPupilsCache || []).length && names.length && importRollMatches(names) === 0){ importRefuse(out, ['None of the ' + names.length + ' names in this file match the children of ' + (myClassInfo.class_name || 'this class') + '.', 'Is this another class\u2019s register? Log in as that class to import it.']); return; }
        }
        if(!sheets.some(s => s.include)){ out.innerHTML = '<div class="au-error">I couldn\'t find an attendance grid in this file — it needs a column of children\'s names and a row of dates or day numbers (or a list with name, date and mark columns).</div>'; return; }
        smartImport = { fileName: file.name, sheets, addMissing: !(Array.isArray(realPupilsCache) && realPupilsCache.length), markHolidays: true };
        renderSmartImportMapping();
      } catch(err){ out.innerHTML = `<div class="au-error">Could not read this file: ${esc(err.message || err)}</div>`; }
    };
    input.click();
  }

  function renderSmartImportMapping(){
    const out = siPanel();
    const monthOpts = sel => Array.from({length: 12}, (_, i) => `<option value="${i}" ${sel === i ? 'selected' : ''}>${new Date(2000, i, 1).toLocaleDateString([], {month:'long'})}</option>`).join('');
    const meaningOpts = sel => [['present','Present'],['absent','Absent'],['holiday','Holiday'],['ignore','Ignore this mark'],['unknown','— choose —']].map(([v, l]) => `<option value="${v}" ${sel === v ? 'selected' : ''}>${l}</option>`).join('');
    let unknownLeft = 0;
    const cards = smartImport.sheets.map((sh, si) => {
      if(!sh.sections.length && !sh.long) return `<div class="cap" style="margin:6px 0;">Sheet <b>${esc(sh.sheet)}</b>: no attendance grid — skipped.</div>`;
      const children = sh.sections.reduce((a, s) => a + s.rows.length, 0) + (sh.long ? new Set(sh.long.rows.map(r => normPupilName(r.name))).size : 0);
      const dates = sh.sections.flatMap(s => siSectionDates(sh, s)).filter(Boolean).sort();
      const nameHeader = sh.sections[0] ? siText(sh.sections[0].headerCells[sh.sections[0].nameCol]) || 'column ' + XLSX.utils.encode_col(sh.sections[0].nameCol) : siText(sh.long.headerCells[sh.long.nameCol]);
      const layout = sh.long ? 'a list with one row per child per day'
        : `a grid${sh.sections.length > 1 ? ' in ' + sh.sections.length + ' sections' : ''} — names under “${esc(nameHeader)}”, ${sh.sections[0].dateCols.length} day columns`;
      const values = Object.keys(sh.valueCounts).sort((a, b) => sh.valueCounts[b] - sh.valueCounts[a]);
      values.forEach(v => { if(sh.include && sh.valueMap[v] === 'unknown') unknownLeft++; });
      const needMonth = sh.sections.some(s => s.dateCols.some(d => !d.date));
      return `<div style="border:1px solid var(--border); border-radius:10px; padding:12px 14px; margin:10px 0; ${sh.include ? '' : 'opacity:.6;'}">
        <label style="display:flex; gap:8px; align-items:center; font-weight:600;"><input type="checkbox" ${sh.include ? 'checked' : ''} onchange="smartImport.sheets[${si}].include = this.checked; renderSmartImportMapping();" /> Sheet “${esc(sh.sheet)}”</label>
        <p class="cap" style="margin:6px 0;">I read this as <b>${layout}</b>, with <b>${children}</b> children${dates.length ? ', from <b>' + esc(dates[0]) + '</b> to <b>' + esc(dates[dates.length - 1]) + '</b>' : ''}.</p>
        ${needMonth ? `<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin:6px 0;"><span class="cap">The days are numbers only, so which month is this?</span>
          <select onchange="smartImport.sheets[${si}].monthGuess = Object.assign({}, smartImport.sheets[${si}].monthGuess, {month: +this.value}); renderSmartImportMapping();" style="padding:5px 8px; border:1px solid var(--border); border-radius:6px;">${monthOpts(sh.monthGuess ? sh.monthGuess.month : null)}${sh.monthGuess && sh.monthGuess.month !== undefined && sh.monthGuess.month !== null ? '' : '<option selected disabled>Choose…</option>'}</select>
          <input type="number" min="2020" max="2035" value="${sh.monthGuess && sh.monthGuess.year ? sh.monthGuess.year : ''}" placeholder="Year" onchange="smartImport.sheets[${si}].monthGuess = Object.assign({}, smartImport.sheets[${si}].monthGuess, {year: +this.value}); renderSmartImportMapping();" style="width:90px; padding:5px 8px; border:1px solid var(--border); border-radius:6px;" />
          ${sh.monthGuess && sh.monthGuess.month != null && sh.monthGuess.year ? '<span class="pill good">from the sheet</span>' : '<span class="pill warn">please choose</span>'}</div>` : ''}
        <div class="cap" style="margin:8px 0 4px;">What the marks mean:</div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">${values.map(v => `<label style="display:flex; align-items:center; gap:6px; border:1px solid ${sh.valueMap[v] === 'unknown' ? 'var(--crit,#d03b3b)' : 'var(--border)'}; border-radius:8px; padding:4px 8px; font-size:12.5px;">
          <b>“${esc(v)}”</b> <span class="dim">×${sh.valueCounts[v]}</span>
          <select onchange="smartImport.sheets[${si}].valueMap['${esc(v).replace(/'/g, "\\'")}'] = this.value; renderSmartImportMapping();" style="padding:3px 6px; border:1px solid var(--border); border-radius:6px; font-size:12px;">${meaningOpts(sh.valueMap[v])}</select></label>`).join('') || '<span class="cap">No marks found.</span>'}</div>
      </div>`;
    }).join('');
    const monthsMissing = smartImport.sheets.some(sh => sh.include && sh.sections.some(s => s.dateCols.some(d => !d.date)) && !(sh.monthGuess && sh.monthGuess.month != null && sh.monthGuess.year));
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 4px; font-weight:600;">Step 1 of 2 — check how I read “${esc(smartImport.fileName)}”</p>
      <p class="cap" style="margin:0;">Correct anything that's wrong. Marks with a red border are ones I don't recognise — choose what they mean.</p>
      ${cards}
      <label style="display:flex; gap:8px; align-items:flex-start; font-size:13px; margin:8px 0;"><input type="checkbox" ${smartImport.addMissing ? 'checked' : ''} onchange="smartImport.addMissing = this.checked" style="margin-top:3px;" /> <span>Add children who are in the file but not yet on ${esc(myClassInfo.class_name || 'this class')}'s roll</span></label>
      <label style="display:flex; gap:8px; align-items:flex-start; font-size:13px; margin:8px 0;"><input type="checkbox" ${smartImport.markHolidays ? 'checked' : ''} onchange="smartImport.markHolidays = this.checked" style="margin-top:3px;" /> <span>Days marked as a holiday for the whole class become holidays on the register calendar</span></label>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn-primary" style="width:auto; padding:8px 16px;" onclick="renderSmartImportPreview()" ${unknownLeft || monthsMissing ? 'disabled title="Choose a meaning for every red mark and a month for every sheet first"' : ''}>Next — preview</button>
        <button class="btn" onclick="smartImport = null; siPanel().innerHTML = '';">Cancel</button>
        ${unknownLeft ? `<span class="cap" style="color:var(--crit,#d03b3b);">${unknownLeft} mark type${unknownLeft === 1 ? '' : 's'} still to choose</span>` : ''}${monthsMissing ? '<span class="cap" style="color:var(--crit,#d03b3b);"> Choose the month and year</span>' : ''}
      </div></div>`;
  }

  function renderSmartImportPreview(){
    const out = siPanel();
    const { byName, stats } = siCollect();
    const roll = {}; (realPupilsCache || []).forEach(p => { roll[normPupilName(p.name)] = p; });
    const all = Object.values(byName);
    const matched = all.filter(r => roll[normPupilName(r.name)]);
    const missing = all.filter(r => !roll[normPupilName(r.name)]);
    const regUpdates = matched.map(r => ({ p: roll[normPupilName(r.name)], reg: r.register_no })).filter(x => x.reg && String(x.p.register_no || '') !== x.reg).map(x => ({ id: x.p.id, name: x.p.name, register_no: x.reg }));
    // Whole-class holiday days: every child who has a mark that day has H.
    const dayMarks = {};
    all.forEach(r => Object.entries(r.attendance).forEach(([d, m]) => { (dayMarks[d] = dayMarks[d] || []).push(m); }));
    const holidayDays = Object.entries(dayMarks).filter(([d, ms]) => ms.length >= 2 && ms.every(m => m === 'holiday') && !studentHolidays[d]).map(([d]) => d).sort();
    const counted = list => list.reduce((a, r) => { Object.values(r.attendance).forEach(m => { if(m === 'present') a.p++; else if(m === 'absent') a.a++; }); return a; }, { p: 0, a: 0 });
    const saving = counted(smartImport.addMissing ? all : matched);
    smartImport.collected = { byName, matched, missing, holidayDays, regUpdates };
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 8px; font-weight:600;">Step 2 of 2 — preview. Nothing has been saved yet.</p>
      <p style="margin:0 0 6px;"><b>${matched.length}</b> child${matched.length === 1 ? ' is' : 'ren are'} already on ${esc(myClassInfo.class_name || 'this class')}'s roll.${regUpdates.length ? ` Their register numbers will be saved for <b>${regUpdates.length}</b>, so the class is listed in register order.` : ''}</p>
      ${all.some(r => r.register_no) ? '' : '<p class="cap" style="margin:0 0 6px;">No register numbers were found in this file (a "Register No" / "GR No" column, or a number written before each name). The class stays in its current order.</p>'}
      ${missing.length ? `<p style="margin:0 0 6px;"><b style="color:${smartImport.addMissing ? 'var(--good,#0a7a0a)' : 'var(--crit,#d03b3b)'};">${missing.length} not on the roll</b> — ${smartImport.addMissing ? 'will be added' : 'will be <b>skipped</b>'}: <span class="cap">${missing.slice(0, 40).map(r => esc(r.name)).join(', ')}${missing.length > 40 ? ' …' : ''}</span></p>` : ''}
      <p style="margin:0 0 6px;">Will save <b>${saving.p}</b> present and <b>${saving.a}</b> absent marks (they replace anything already saved for that child and day).</p>
      ${smartImport.markHolidays && holidayDays.length ? `<p style="margin:0 0 6px;"><b>${holidayDays.length}</b> day${holidayDays.length === 1 ? '' : 's'} will be marked as holidays: <span class="cap">${holidayDays.map(esc).join(', ')}</span></p>` : ''}
      <p class="cap" style="margin:0 0 6px;">${stats.future ? stats.future + ' marks dated after today are left out. ' : ''}${stats.ignored ? stats.ignored + ' marks set to "Ignore" are left out. ' : ''}${stats.noDate ? stats.noDate + ' marks had no readable date and are left out. ' : ''}</p>
      <label style="display:flex; gap:8px; align-items:center; font-size:13px; margin:8px 0;"><input type="checkbox" id="smartImportRemember" checked /> Remember my choices for files laid out like this one</label>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
        <button class="btn-primary" style="width:auto; padding:8px 16px;" onclick="confirmSmartImport()" ${saving.p + saving.a || (smartImport.addMissing && missing.length) || regUpdates.length ? '' : 'disabled'}>Confirm import</button>
        <button class="btn" onclick="renderSmartImportMapping()">Back</button>
      </div></div>`;
  }

  async function confirmSmartImport(){
    const out = siPanel();
    const c = smartImport && smartImport.collected;
    if(!c) return;
    const remember = !!(document.getElementById('smartImportRemember') || {}).checked;
    try{
      let added = 0;
      const toAdd = smartImport.addMissing ? c.missing : [];
      if(toAdd.length || (c.regUpdates && c.regUpdates.length)){
        out.innerHTML = '<p class="sub">Updating the roll…</p>';
        const res = await fetch('backend/pupils/sync_class_pupils.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ add: toAdd.map(r => ({ name: r.name, register_no: r.register_no || '', admitted_date: Object.keys(r.attendance).sort()[0] || todayDateKey() })), remove_ids: [],
            register_updates: (c.regUpdates || []).map(u => ({ id: u.id, register_no: u.register_no })) })
        });
        const data = await res.json();
        if(data.status !== 'success') throw new Error(data.message || 'Could not add the children.');
        added = data.added;
        realPupilsCache = null;
        await fetchMyPupils();
        if(!Array.isArray(realPupilsCache)) throw new Error('The children were added, but the roll could not be reloaded — press Confirm again (nothing will be added twice).');
      }
      const roll = {}; realPupilsCache.forEach(p => { roll[normPupilName(p.name)] = p; });
      const marks = [];
      Object.values(c.byName).forEach(r => {
        const pupil = roll[normPupilName(r.name)]; if(!pupil) return;
        Object.entries(r.attendance).forEach(([date, m]) => { if(m === 'present' || m === 'absent') marks.push({ pupil_id: pupil.id, date, status: m }); });
      });
      let saved = 0;
      for(let i = 0; i < marks.length; i += 400){
        const box = siPanel(); if(box) box.innerHTML = `<p class="sub">Saving marks… ${Math.min(i + 400, marks.length)} of ${marks.length}</p>`;
        const res = await fetch('backend/attendance/save_attendance.php' + window.location.search, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ marks: marks.slice(i, i + 400) }) });
        const data = await res.json();
        if(data.status !== 'success') throw new Error((data.message || 'Could not save marks.') + ' (' + saved + ' were saved before this.)');
        saved += data.saved || 0;
      }
      let holidays = 0;
      if(smartImport.markHolidays){
        for(const d of c.holidayDays){
          studentHolidays[d] = 'Holiday (from imported register)';
          await fetch('backend/daily_plan/save_student_holiday.php' + window.location.search, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ class_id: myClassInfo.class_id, holiday_date: d, holiday_name: 'Holiday (from imported register)' }) }).catch(() => {});
          holidays++;
        }
        if(holidays && typeof saveStudentHolidays === 'function') saveStudentHolidays();
      }
      if(remember){
        const maps = siRememberedMaps();
        smartImport.sheets.filter(s => s.include && s.fingerprint).forEach(s => {
          maps[s.fingerprint] = { values: Object.fromEntries(Object.entries(s.valueMap).filter(([, m]) => m !== 'unknown')) };
        });
        try { localStorage.setItem('smartImportMaps', JSON.stringify(maps)); } catch(e){}
      }
      smartImport = null;
      Object.keys(attendanceMonthStatus).forEach(k => delete attendanceMonthStatus[k]);
      alert('Import finished: ' + [added ? added + ' children added' : '', saved + ' attendance marks saved', holidays ? holidays + ' holidays marked' : ''].filter(Boolean).join(', ') + '.');
      renderAttendanceBody();
    } catch(err){
      const box = siPanel();
      if(box) box.innerHTML = `<div class="au-error">${esc(err.message)}</div><button class="btn" style="margin-top:8px;" onclick="renderSmartImportPreview()">Back to preview</button>`;
    }
  }

  function renderSmartImportCard(mode){
    const roll = mode === 'roll';
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'padding:18px 20px; margin:0 0 20px;';
    card.innerHTML = `
      <div class="imp-card">
        <div class="imp-text">
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">${roll ? '👧 Import children — class list' : '📥 Import attendance or a class list'}</h3>
          <p class="cap" style="margin:0;">${roll
            ? 'A list of the children in any layout — a file (.xlsx, .xls, .csv) or a photo of the list. New children are added, register numbers saved, and nobody already on the roll is duplicated.'
            : 'A register in any layout — a file (.xlsx, .xls, .csv) or a photo. P / A / H marks are saved as attendance; a list of names updates the roll.'} You check a preview first, and it only ever goes into ${esc(myClassInfo.class_name || 'this class')}.</p>
        </div>
        ${importButtonsHtml(`smartImportPhoto('${roll ? 'roll' : 'attendance'}')`, `showImportFormat('${roll ? 'roll' : 'attendance'}')`,roll ? 'admissionsManualSheet()' : 'goToAttendanceRegister()', roll ? 'downloadClassRollTemplate()' : 'downloadAttendanceSheetTemplate()', roll ? 'Download class list' : 'Download sheet')}
      </div>
      <div id="${roll ? 'smartImportPanelRoll' : 'smartImportPanel'}" data-si-panel="1" style="margin-top:14px; word-break:break-word; overflow-wrap:anywhere;"></div>`;
    return card;
  }

  // Holds the parsed, validated result of the last previewed file until
  // the teacher confirms or cancels — nothing is saved until then.
 window.pendingAttendanceImport =
  window.pendingAttendanceImport ?? null;

  async function previewAttendanceFile(){
    const input = document.getElementById('attendanceImportInput');
    const monthSelect = document.getElementById('attendanceImportMonthSelect');
    const expectedYearMonth = monthSelect ? monthSelect.value : null; // 'YYYY-MM'
    const resultEl = document.getElementById('attendanceImportResult');
    pendingAttendanceImport = null;
    if(!input.files.length){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    if(!Array.isArray(realPupilsCache)){
      resultEl.innerHTML = '<div class="au-error">Still loading pupils — try again in a moment.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Reading file…</p>';

    let rows;
    try{
      rows = await readAssessmentFileRows(input.files[0]);
    } catch(err){
      resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`;
      return;
    }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }

    const header = rows[0].map(h => h.trim());
    if(header[0].toLowerCase() !== 'name'){
      resultEl.innerHTML = '<div class="au-error">The first column header must be exactly "name".</div>';
      return;
    }
    const dateColumns = header.slice(1);
    const badDateCols = dateColumns.filter(d => !/^\d{4}-\d{2}-\d{2}$/.test(d));
    if(badDateCols.length){
      resultEl.innerHTML = `<div class="au-error">These column headers aren't valid YYYY-MM-DD dates: ${esc(badDateCols.join(', '))}</div>`;
      return;
    }
    if(!dateColumns.length){
      resultEl.innerHTML = '<div class="au-error">No date columns found after "name".</div>';
      return;
    }

    // Any date column outside the selected month is flagged and
    // excluded entirely, rather than silently imported into the wrong
    // month's records.
    const monthMismatchCols = expectedYearMonth ? dateColumns.filter(d => d.slice(0, 7) !== expectedYearMonth) : [];
    const validDateColumns = expectedYearMonth ? dateColumns.filter(d => d.slice(0, 7) === expectedYearMonth) : dateColumns;
    if(!validDateColumns.length){
      resultEl.innerHTML = `<div class="au-error">None of this file's date columns fall in the selected month (${esc(expectedYearMonth)}). Choose the correct month, or check the file.</div>`;
      return;
    }

    const marks = [];
    const skipped = [];
    if(monthMismatchCols.length){
      skipped.push(`${monthMismatchCols.length} date column(s) outside the selected month, excluded entirely: ${monthMismatchCols.join(', ')}`);
    }
    const perChild = {}; // name -> {present, absent}
    for(let i = 1; i < rows.length; i++){
      const rowNum = i + 1;
      const rawName = (rows[i][0] || '').trim();
      if(!rawName) continue;
      const pupil = realPupilsCache.find(p => p.name === rawName);
      if(!pupil){ skipped.push(`Row ${rowNum}: "${rawName}" is not a child currently on the roll — not imported`); continue; }
      validDateColumns.forEach(dateStr => {
        const colIdx = dateColumns.indexOf(dateStr);
        const cell = (rows[i][colIdx + 1] || '').trim().toUpperCase();
        if(!cell) return;
        if(cell !== 'P' && cell !== 'A'){ skipped.push(`Row ${rowNum}, ${dateStr}: "${cell}" isn't P or A — cell skipped`); return; }
        marks.push({ pupil_id: pupil.id, date: dateStr, status: cell === 'P' ? 'present' : 'absent' });
        if(!perChild[rawName]) perChild[rawName] = { present: 0, absent: 0 };
        perChild[rawName][cell === 'P' ? 'present' : 'absent']++;
      });
    }

    if(!marks.length){
      resultEl.innerHTML = `<div class="au-error">Nothing valid to import.${skipped.length ? '<br/>' + skipped.slice(0, 10).map(s => esc(s)).join('<br/>') : ''}</div>`;
      return;
    }

    pendingAttendanceImport = { marks, skipped, dateColumns: validDateColumns };
    const childNames = Object.keys(perChild);
    const dateRange = validDateColumns.length > 1 ? `${validDateColumns[0]} to ${validDateColumns[validDateColumns.length-1]}` : validDateColumns[0];

    let previewHtml = `<div style="border:1px solid var(--border); border-radius:8px; padding:14px; margin-top:4px;">
      <p style="margin:0 0 10px; font-weight:600;">Preview — nothing has been saved yet</p>
      <p class="cap" style="margin:0 0 10px;">${marks.length} marks ready, across ${childNames.length} children and ${validDateColumns.length} date(s) (${esc(dateRange)}).</p>`;

    previewHtml += '<div class="report-table-wrap" style="max-height:280px; overflow-y:auto;"><table class="report-table"><thead><tr><th>Child</th><th>Present</th><th>Absent</th></tr></thead><tbody>';
    childNames.slice(0, 30).forEach(name => {
      previewHtml += `<tr><td>${esc(name)}</td><td>${perChild[name].present}</td><td>${perChild[name].absent}</td></tr>`;
    });
    previewHtml += '</tbody></table></div>';
    if(childNames.length > 30) previewHtml += `<p class="cap" style="margin:6px 0 0;">…and ${childNames.length - 30} more children</p>`;

    if(skipped.length){
      previewHtml += `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:10px 12px; margin-top:10px; font-size:12.5px;">${skipped.length} row/cell(s) will be skipped:<br/>${skipped.slice(0, 15).map(s => esc(s)).join('<br/>')}${skipped.length > 15 ? '<br/>…and ' + (skipped.length - 15) + ' more' : ''}</div>`;
    }

    previewHtml += `<div style="display:flex; gap:8px; margin-top:14px;">
        <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="confirmAttendanceImport()">Confirm import — save ${marks.length} marks</button>
        <button style="padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer;" onclick="cancelAttendanceImport()">Cancel</button>
      </div>
    </div>`;
    resultEl.innerHTML = previewHtml;
  }

  function cancelAttendanceImport(){
    pendingAttendanceImport = null;
    const resultEl = document.getElementById('attendanceImportResult');
    if(resultEl) resultEl.innerHTML = '<p class="cap">Import cancelled — nothing was saved.</p>';
  }

  async function confirmAttendanceImport(){
    const resultEl = document.getElementById('attendanceImportResult');
    if(!pendingAttendanceImport){
      resultEl.innerHTML = '<div class="au-error">Nothing to confirm — preview a file first.</div>';
      return;
    }
    const { marks, skipped } = pendingAttendanceImport;
    resultEl.innerHTML = '<p class="sub">Saving ' + marks.length + ' marks…</p>';
    try{
      const res = await fetch('backend/attendance/save_attendance.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ marks })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`;
        return;
      }
      Object.keys(attendanceMonthStatus).forEach(k => delete attendanceMonthStatus[k]);
      let html = `<div class="au-success">Imported ${data.saved} of ${marks.length} marks.</div>`;
      if(skipped.length) html += `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:12px 14px; margin-top:6px; font-size:13px;">${skipped.length} skipped:<br/>${skipped.slice(0, 20).map(s => esc(s)).join('<br/>')}${skipped.length > 20 ? '<br/>…and ' + (skipped.length - 20) + ' more' : ''}</div>`;
      resultEl.innerHTML = html;
      alert(`Imported ${data.saved} of ${marks.length} attendance marks.` + (skipped.length ? ` ${skipped.length} skipped — see the details below.` : ''));
      pendingAttendanceImport = null;
      renderAttendanceBody();
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }

  // ---------- Month tabs (Class Attendance → Mark attendance) ----------
  // One strip of month tabs for the school year. The chosen month drives the
  // calendar, the register, the follow-up cards AND the "Month to import"
  // of the import card below it — one place to change the month.
  function attendanceYearMonths(){
    const now = new Date();
    const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;   // school year starts in June
    return ACADEMIC_MONTHS.map(m => ({ year: m >= 5 ? startYear : startYear + 1, month: m }));
  }
  function attMonthTabStyle(active, isNow){
    return 'flex:0 0 auto; min-width:64px; padding:8px 14px; border-radius:8px; cursor:pointer; text-align:center; line-height:1.15; font-family:inherit; '
      + 'border:1px solid ' + (active ? 'var(--primary)' : 'var(--border)') + '; '
      + 'background:' + (active ? 'var(--primary)' : '#fff') + '; '
      + 'color:' + (active ? '#fff' : 'var(--text)') + '; '
      + (active ? 'box-shadow:0 2px 6px rgba(0,0,0,.14); ' : '')
      + (isNow && !active ? 'border-style:dashed; ' : '');
  }
  function renderAttendanceMonthTabs(){
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'attMonthTabsCard';
    card.style.cssText = 'padding:14px 16px; margin:0 0 16px;';
    const now = new Date();
    const tabs = attendanceYearMonths().map(({year, month}) => {
      const active = year === markAttYear && month === markAttMonth;
      const isNow = year === now.getFullYear() && month === now.getMonth();
      const short = new Date(year, month, 1).toLocaleDateString([], {month:'short'});
      const key = year + '-' + String(month + 1).padStart(2, '0');
      return `<button type="button" data-ym="${key}" data-now="${isNow ? 1 : 0}" aria-pressed="${active}" onclick="setAttendanceMonth(${year}, ${month})" style="${attMonthTabStyle(active, isNow)}">
        <div style="font-size:14px; font-weight:700;">${esc(short)}</div>
        <div style="font-size:10.5px; opacity:.8; margin-top:2px;">${year}</div>
      </button>`;
    }).join('');
    const fullName = new Date(markAttYear, markAttMonth, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    card.innerHTML = `
      <div style="display:flex; align-items:baseline; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
        <h3 style="margin:0; font-family:var(--disp); font-size:14px; font-weight:700;">🗓️ Month</h3>
        <span class="cap" style="margin:0;">Showing <b>${esc(fullName)}</b> — the calendar, register and import below all follow this month.</span>
      </div>
      <div id="attMonthTabsRow" role="tablist" style="display:flex; gap:8px; overflow-x:auto; padding:2px 2px 6px; -webkit-overflow-scrolling:touch;">${tabs}</div>`;
    // bring the open month into view on narrow screens
    setTimeout(() => {
      const on = card.querySelector('button[aria-pressed="true"]');
      const row = card.querySelector('#attMonthTabsRow');
      if(on && row) row.scrollLeft = Math.max(0, on.offsetLeft - row.clientWidth / 2 + on.offsetWidth / 2);
    }, 0);
    return card;
  }
  // restyle the tabs in place (used when the import flow switches month without a full redraw)
  window.attHighlightMonthTab = function(key){
    document.querySelectorAll('#attMonthTabsRow button[data-ym]').forEach(b => {
      const on = b.dataset.ym === key;
      b.setAttribute('aria-pressed', on);
      b.style.cssText = attMonthTabStyle(on, b.dataset.now === '1');
    });
  };
  function setAttendanceMonth(year, month){
    markAttYear = year;
    markAttMonth = month;
    window.attImportMonth = year + '-' + String(month + 1).padStart(2, '0');   // "Month to import" follows the tab
    // keep the open day inside the chosen month: today if it is in it, else its first weekday
    const t = new Date();
    if(t.getFullYear() === year && t.getMonth() === month){
      markAttSelectedDate = todayDateKey();
    } else {
      let d = 1;
      while(d < 7 && [0, 6].includes(new Date(year, month, d).getDay())) d++;
      markAttSelectedDate = ymd(year, month, d);
    }
    classAttendancePickDayOpen = false;
    renderAttendanceBody();
  }
  window.setAttendanceMonth = setAttendanceMonth;

 function renderAttendanceBody(){

  if(!markAttSelectedDate){
    markAttSelectedDate =
      todayDateKey();
  }

  const container =
    document.getElementById(
      window.attendanceEntryTargetId ||
      'attendance-body'
    );

  if(!container){
    console.error(
      'Attendance container not found.'
    );
    return;
  }

  /*
    IMPORTANT:
    renderAttendanceBody() can be called repeatedly after
    pupils/attendance data finishes loading.

    Always clear the existing register before rebuilding it.
  */
  container.innerHTML = '';


  // Real pupils loading
  if(realPupilsCache === null){

    fetchMyPupils();

    container.innerHTML =
      '<p class="cap">Loading pupils…</p>';

    return;
  }


  if(realPupilsCache === 'loading'){

    container.innerHTML =
      '<p class="cap">Loading pupils…</p>';

    return;
  }


  if(
    typeof realPupilsCache === 'string' &&
    realPupilsCache.startsWith('error:')
  ){

    container.innerHTML =
      `<p class="cap"
          style="color:var(--danger,#c8433f);">
        ${esc(realPupilsCache.slice(6))}
      </p>`;

    return;
  }


  const year =
    markAttYear;

  const month =
    markAttMonth;


  if(
    !ensureAttendanceMonthLoadedFor(
      year,
      month,
      container,
      renderAttendanceBody
    )
  ){
    return;
  }


  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();


  const monthName =
    new Date(
      year,
      month,
      1
    ).toLocaleDateString(
      [],
      {
        month: 'long',
        year: 'numeric'
      }
    );


  const heading =
    document.createElement(
      'div'
    );


  heading.innerHTML = `
    <h1 style="margin:0 0 4px;">
      Mark attendance
    </h1>

    <p
      class="cap"
      style="margin-bottom:14px;"
    >
      Mark today's register below,
      or pick a different day from
      the calendar further down.
    </p>
  `;


  container.appendChild(
    heading
  );


  // ---- One import button for attendance files of any layout
  // (Smart Import). The older fixed-format importers are no longer
  // shown here — this one reads their layouts too. ----
  container.appendChild(renderAttendanceMonthTabs());   // month tabs — above the import card
  container.appendChild(renderSmartImportCard());
  container.appendChild(importDownloadCard('attendance')); // stays at the end of the page (data-dl-end)
  // (The separate children-import card is no longer shown — the one
  //  📥 Import a file button above also takes class lists.)

  renderAttendanceRegisterForDay(
    container,
    markAttSelectedDate
  );


  /* Everything below this point is administrative/reporting content,
     not the daily task itself — grouped into clearly labeled,
     collapsed-by-default sections (same convention as "See reports")
     instead of all showing inline, so this screen defaults to being
     short and each section is visually distinct rather than
     everything blending together on one long page. */

  // ---- Pick a different day (calendar) ----
  const pickDayToggleCard = document.createElement('div');
  pickDayToggleCard.className = 'card';
  pickDayToggleCard.style.cssText = 'padding:0; margin-top:16px; overflow:hidden; border:1px solid var(--border); border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,.05);';
  const openDayLabel = markAttSelectedDate === todayDateKey() ? 'Today' : esc(markAttSelectedDate);
  pickDayToggleCard.innerHTML = `
    <div role="button" tabindex="0" aria-expanded="${classAttendancePickDayOpen}"
         onclick="classAttendancePickDayOpen = !classAttendancePickDayOpen; this.setAttribute('aria-expanded', classAttendancePickDayOpen); this.nextElementSibling.classList.toggle('hidden', !classAttendancePickDayOpen); this.querySelector('.chevron').style.transform = classAttendancePickDayOpen ? 'rotate(180deg)' : 'rotate(0deg)'; this.style.background = classAttendancePickDayOpen ? 'var(--primary-light, #e8f5ef)' : '#fff';"
         onkeydown="if(event.key==='Enter'||event.key===' '){ event.preventDefault(); this.click(); }"
         style="display:flex; align-items:stretch; cursor:pointer; background:${classAttendancePickDayOpen ? 'var(--primary-light, #e8f5ef)' : '#fff'};">
      <div style="display:flex; align-items:center; gap:8px; padding:0 18px; background:var(--primary); color:#fff; font-family:var(--disp); font-size:14px; font-weight:700; letter-spacing:.02em; white-space:nowrap;">📅 Calendar</div>
      <div style="flex:1; min-width:0; padding:14px 16px;">
        <div style="font-size:14px; font-weight:700; font-family:var(--disp);">Pick a different day</div>
        <p class="cap" style="margin:2px 0 0;">Open or correct a past day's register — currently open: <b>${openDayLabel}</b>.</p>
      </div>
      <div style="display:flex; align-items:center; padding:0 18px; border-left:1px solid var(--border);">
        <span class="chevron" style="transition:transform .15s; font-size:13px; color:var(--text-muted); transform:${classAttendancePickDayOpen ? 'rotate(180deg)' : 'rotate(0deg)'};">▼</span>
      </div>
    </div>
    <div class="${classAttendancePickDayOpen ? '' : 'hidden'}" style="padding:16px 18px 18px; border-top:1px solid var(--border);"></div>
  `;
  container.appendChild(pickDayToggleCard);
  const pickDayBody = pickDayToggleCard.querySelector(':scope > div:last-child');

    // --- Pick a day (calendar), for opening or correcting another day ---
    const reqTag = document.createElement('p'); reqTag.className = 'cap'; reqTag.style.cssText = 'text-align:right; margin:0 0 6px;'; reqTag.innerHTML = '<span class="reqs">REG-02 · CAL-04</span>';
    pickDayBody.appendChild(reqTag);
    const nav = document.createElement('div');
    nav.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:10px;';
    nav.innerHTML = `<button onclick="shiftMarkAttMonth(-1)" style="padding:4px 10px; border:1px solid var(--border); border-radius:6px; background:#fff; cursor:pointer;">‹</button>
      <b>${esc(monthName)}</b>
      <button onclick="shiftMarkAttMonth(1)" style="padding:4px 10px; border:1px solid var(--border); border-radius:6px; background:#fff; cursor:pointer;">›</button>`;
    pickDayBody.appendChild(nav);

    const weekLabels = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:grid; grid-template-columns:repeat(7,1fr); gap:8px; margin-bottom:6px; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase;';
    headerRow.innerHTML = weekLabels.map(l => `<div>${l}</div>`).join('');
    pickDayBody.appendChild(headerRow);

    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Sun=0 -> Mon-first layout
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(7,1fr); gap:8px; margin-bottom:10px;';
    for(let i = 0; i < startWeekday; i++) grid.appendChild(document.createElement('div'));

    for(let d = 1; d <= daysInMonth; d++){
      const dateStr = ymd(year, month, d);
      const dow = new Date(year, month, d).getDay();
      const holidayName = complianceHolidayName(year, month, d) || studentHolidays[dateStr];
      const isSelected = dateStr === markAttSelectedDate;
      const dayRecords = attendanceRecords[dateStr] || null;
      // Present count specifically — NOT every marked child. A day
      // with 1 absence out of 5 shows 4/5, not 5/5 (5/5 would say
      // everyone was present, which isn't what happened).
      // Only counts pupils actually on roll by this date, same REG-14
      // rule the register itself enforces below.
      const onRollThisDay = realPupilsCache.filter(p => !p.admitted_date || p.admitted_date <= dateStr);
      const presentCount = dayRecords ? onRollThisDay.filter(p => dayRecords[p.id] === 'present').length : 0;
      const anyMarked = dayRecords ? onRollThisDay.some(p => dayRecords[p.id]) : false;

      let bg = '#fff', body = '', clickable = false;
      if(holidayName){
        bg = '#fdf1e3'; body = '🎉 ' + esc(holidayName);
        clickable = true; // still selectable, to view/remove the holiday for that day
      } else if(dow === 0){
        bg = '#f4f4f2'; body = 'Sunday';
      } else if(dow === 6 && isLastSaturday(year, month, d, daysInMonth)){
        bg = '#e8f1fb'; body = 'Last Saturday — monthly holiday';
      } else if(dow === 6){
        bg = '#e8f1fb'; body = 'Saturday — no children';
      } else {
        clickable = true;
        body = anyMarked
          ? `<span style="display:inline-block; padding:2px 8px; border-radius:6px; background:var(--success); color:#fff; font-weight:600;">${presentCount}/${onRollThisDay.length}</span>`
          : `<span class="cap">—</span>`;
      }

      const cell = document.createElement('div');
      cell.style.cssText = `background:${bg}; border:1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}; ${isSelected ? 'box-shadow:0 0 0 2px var(--primary-light);' : ''} border-radius:8px; padding:10px; min-height:64px; font-size:12px; ${clickable ? 'cursor:pointer;' : ''}`;
      if(clickable) cell.onclick = () => { markAttSelectedDate = dateStr; classAttendancePickDayOpen = true; renderAttendanceBody(); };
      cell.innerHTML = `<div style="font-weight:600; margin-bottom:4px;">${d}${dateStr === todayDateKey() ? ' · Today' : ''}</div><div>${body}</div>`;
      grid.appendChild(cell);
    }
    pickDayBody.appendChild(grid);

    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex; flex-wrap:wrap; gap:16px; font-size:12px; color:var(--text-muted);';
    legend.innerHTML = `
      <span><i style="display:inline-block; width:10px; height:10px; background:var(--success); margin-right:5px; border-radius:2px;"></i>Present count / roll</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#e8f1fb; margin-right:5px; border-radius:2px;"></i>Saturday — no children</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#f4f4f2; margin-right:5px; border-radius:2px;"></i>Sunday</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#fdf1e3; margin-right:5px; border-radius:2px;"></i>Holiday</span>
    `;
    pickDayBody.appendChild(legend);

  // ---- Who needs a follow-up — two square cards, always visible ----
  const followUpWrap = document.createElement('div');
  followUpWrap.style.marginTop = '22px';
  container.appendChild(followUpWrap);
  renderAttendanceFollowUp(followUpWrap, year, month, markAttSelectedDate);

    // The monthly register and reports now live in the 📊 Reports tab
    // (renderAttendanceReports, part 13), next to Admissions.

    // Keep the dashboard's "Class attendance today" tile in sync —
    // always TODAY specifically, regardless of which day is open above.
    const todaysRecords = attendanceRecords[todayDateKey()] || {};
    const todaysPresent = realPupilsCache.filter(p => todaysRecords[p.id] === 'present').length;
    const classAttendEl = document.getElementById('classAttendanceValue');
    if(classAttendEl) classAttendEl.textContent = todaysPresent + '/' + assessmentPupilNames().length;
  }

  function shiftMarkAttMonth(delta){
    markAttMonth += delta;
    if(markAttMonth > 11){ markAttMonth = 0; markAttYear++; }
    if(markAttMonth < 0){ markAttMonth = 11; markAttYear--; }
    renderAttendanceBody();
  }

/* ===== teacher-part-03.js ===== */
/* =========================================================================
   teacher-part-03.js — part 3 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  function renderAttendanceRegisterForDay(container, dateStr){
    if(!attendanceRecords[dateStr]) attendanceRecords[dateStr] = {};
    const records = attendanceRecords[dateStr];
    const [y, m] = dateStr.split('-').map(Number);
    const niceDate = new Date(dateStr + 'T00:00:00').toLocaleDateString([], {day:'2-digit', month:'short'});
    const declaredHoliday = studentHolidays[dateStr] || null;

    // Real pupils, filtered by each one's own real admitted_date —
    // REG-14 (a child admitted later isn't on an earlier register) is
    // now enforced against her actual database admission date, not a
    // separate localStorage admissionRecords guess keyed by name.
    let present = 0, absent = 0;
    const notYetAdmittedCount = realPupilsCache.length - realPupilsCache.filter(p => !p.admitted_date || p.admitted_date <= dateStr).length;
    const rows = realPupilsCache
      .filter(p => !p.admitted_date || p.admitted_date <= dateStr)
      .map((p, i) => {
        const status = records[p.id];
        if(status === 'present') present++;
        else if(status === 'absent') absent++;
        const mtd = childMonthToDatePct(p.id, y, m - 1, dateStr);
        return { id: p.id, name: p.name, admitted_date: p.admitted_date, roll: i + 1, register_no: p.register_no || '', status, pct: mtd.pct, marked: mtd.marked };
      });

    // Same-name disambiguation — two pupils sharing an exact name is
    // real and not rare (common first names repeat a lot). Storage is
    // already safe (keyed by id), but the display needs to make it
    // visually obvious which is which, or a teacher marking by eye
    // could still tap the wrong one even though the system wouldn't
    // actually mix up the data.
    const nameCounts = {};
    rows.forEach(r => { nameCounts[r.name] = (nameCounts[r.name] || 0) + 1; });
    const hasDuplicateNames = Object.values(nameCounts).some(c => c > 1);

    const regHead = mdSec('Register for ' + niceDate, '<span class="reqs">REG-14</span>'); regHead.id = 'attRegisterTop'; // "✍ Enter manually" scrolls here
    container.appendChild(regHead);
    container.appendChild((() => {
      const p = document.createElement('p'); p.className = 'cap'; p.style.marginBottom = '14px';
      p.innerHTML = 'REG-14 · the roll is the children admitted on or before this date, so a child admitted later simply isn\'t on an earlier register.'
        + (notYetAdmittedCount > 0 ? ` ${notYetAdmittedCount} child${notYetAdmittedCount === 1 ? '' : 'ren'} not yet admitted as of this date ${notYetAdmittedCount === 1 ? 'is' : 'are'} hidden from this register.` : '');
      return p;
    })());

    if(declaredHoliday){
      const banner = document.createElement('div');
      banner.className = 'card';
      banner.style.cssText = 'padding:16px 18px; margin-bottom:14px; background:#fdf1e3; border-color:#E0A429; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;';
      banner.innerHTML = `<div><b>🎉 Holiday for students: ${esc(declaredHoliday)}</b><p class="cap" style="margin:4px 0 0;">No attendance needed today.</p></div>
        <button onclick="removeStudentHoliday('${dateStr}')" style="padding:7px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12.5px; font-weight:600; cursor:pointer;">Remove holiday</button>`;
      container.appendChild(banner);
      return;
    }

    // Day summary — moved here from My Day's "Class present today" tile,
    // since it belongs with the register itself. Real counts only:
    // present / absent / not yet marked, out of the children admitted
    // on or before this date (the same roll shown below).
    const rollCount = rows.length;
    const unmarkedCount = Math.max(0, rollCount - present - absent);
    const isTodayView = dateStr === todayDateKey();
    const pctOf = n => rollCount ? (n / rollCount * 100) : 0;
    const summaryCard = document.createElement('div');
    summaryCard.className = 'att-summary';
    summaryCard.innerHTML = `
      <div class="att-summary-head">
        <div>
          <div class="att-summary-k">${isTodayView ? 'Class present today' : 'Class present on ' + esc(niceDate)}</div>
          <div class="att-summary-v">${present}<small> of ${rollCount}</small></div>
        </div>
        ${rollCount === 0 ? mdPill('No children on the roll', 'neu')
          : unmarkedCount === 0 ? mdPill('All ' + rollCount + ' marked', 'good')
          : mdPill(unmarkedCount + ' not marked yet', 'warn')}
      </div>
      <div class="att-summary-bar" aria-hidden="true">
        <i class="p" style="width:${pctOf(present)}%"></i><i class="a" style="width:${pctOf(absent)}%"></i>
      </div>
      <div class="att-summary-legend">
        <span><i class="p"></i>Present <b>${present}</b></span>
        <span><i class="a"></i>Absent <b>${absent}</b></span>
        <span><i class="u"></i>Not marked <b>${unmarkedCount}</b></span>
      </div>`;
        container.appendChild(summaryCard);
        
        const actionsRow = document.createElement('div');
        actionsRow.style.cssText = 'display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px;';
        actionsRow.innerHTML = `
      <button onclick="markAllPresentForDay('${dateStr}')" style="padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:13px; font-weight:600;">All present</button>
      ${(present + absent) > 0 ? `<button onclick="clearAllMarksForDay('${dateStr}')" style="padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:13px; font-weight:600;">↺ Clear all marks</button>` : ''}
      <button onclick="toggleHolidayForm('${dateStr}')" style="padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:13px; font-weight:600;">🎉 Mark as holiday</button>
      <span class="cap">Present ${present} · Absent ${absent} — tap Present or Absent for each name; tap the active one again to clear it.</span>
    `;
    container.appendChild(actionsRow);

    const holidayForm = document.createElement('div');
    holidayForm.id = 'holidayForm-' + dateStr;
    holidayForm.className = 'hidden';
    holidayForm.style.cssText = 'display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:14px; padding:12px 14px; border:1px dashed var(--border); border-radius:10px; background:var(--bg);';
    holidayForm.innerHTML = `
      <span class="cap">Which holiday?</span>
      <select id="holidayPresetSelect-${dateStr}" onchange="handleHolidayPresetChange('${dateStr}')" style="padding:7px 8px; border:1px solid var(--border); border-radius:8px; font-size:13px; background:#fff;">
        <option value="">Choose a common holiday…</option>
        ${COMMON_HOLIDAYS.map(h => `<option value="${esc(h)}">${esc(h)}</option>`).join('')}
        <option value="__other__">Other — type it myself</option>
      </select>
      <input id="holidayNameInput-${dateStr}" type="text" placeholder="e.g. School closed for elections" style="display:none; flex:1; min-width:220px; padding:7px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px;" />
      <button onclick="declareStudentHoliday('${dateStr}')" style="padding:7px 16px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Save</button>
    `;
    container.appendChild(holidayForm);

    const searchWrap = document.createElement('input');
    searchWrap.type = 'text';
    searchWrap.className = 'attendance-search';
    searchWrap.placeholder = 'Search student by name';
    searchWrap.value = attendanceSearchTerm;
    searchWrap.style.cssText = 'width:100%; padding:10px; margin-bottom:14px; border:1px solid var(--border); border-radius:8px; font-size:14px;';
    searchWrap.oninput = (e) => filterAttendance(e.target.value);
    container.appendChild(searchWrap);

    const visibleRows = attendanceSearchTerm
      ? rows.filter(r => r.name.toLowerCase().includes(attendanceSearchTerm.toLowerCase()))
      : rows;

    const colors = { present: 'var(--success)', absent: 'var(--danger,#c8433f)' };
    if(hasDuplicateNames){
      const warnEl = document.createElement('p');
      warnEl.className = 'cap';
      warnEl.style.cssText = 'margin:0 0 10px; color:var(--danger, #c8433f);';
      warnEl.textContent = '⚠ Two or more children on this roll share the exact same name — look at the admission date shown under each before marking, not just the name.';
      container.appendChild(warnEl);
    }
    const roster = document.createElement('div');
    roster.style.cssText = 'background:var(--card); border:1px solid var(--border); border-radius:10px; overflow:hidden;';
    roster.innerHTML = visibleRows.map(r => `<div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--border); flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-weight:bold; font-size:13px;">${esc(r.name)}${nameCounts[r.name] > 1 ? ` <span style="font-weight:normal; color:var(--danger, #c8433f);">· admitted ${esc(r.admitted_date || 'unknown date')}</span>` : ''}</div>
          <div class="cap">Roll ${r.roll}${r.register_no ? ' · Reg. no. ' + esc(r.register_no) : ''} · month to date ${r.marked ? r.pct + '%' : '—'}</div>
        </div>
        <div style="display:flex; gap:6px;">
          <button onclick="setAttendanceStatus('${dateStr}', ${r.id}, 'present')" style="min-width:84px; padding:8px 14px; border-radius:8px; border:${r.status === 'present' ? 'none' : '1px solid var(--border)'}; background:${r.status === 'present' ? colors.present : '#fff'}; color:${r.status === 'present' ? '#fff' : 'var(--text)'}; font-weight:600; font-size:13px; cursor:pointer;">Present</button>
          <button onclick="setAttendanceStatus('${dateStr}', ${r.id}, 'absent')" style="min-width:84px; padding:8px 14px; border-radius:8px; border:${r.status === 'absent' ? 'none' : '1px solid var(--border)'}; background:${r.status === 'absent' ? colors.absent : '#fff'}; color:${r.status === 'absent' ? '#fff' : 'var(--text)'}; font-weight:600; font-size:13px; cursor:pointer;">Absent</button>
          <button onclick="removePupilFromRoster(${r.id}, '${esc(r.name).replace(/'/g, "\\'")}')" title="Remove ${esc(r.name)} from the roster entirely" style="padding:8px 10px; border-radius:8px; border:1px solid var(--border); background:#fff; color:var(--danger, #c8433f); font-size:13px; cursor:pointer;">🗑</button>
        </div>
      </div>`).join('') || `<p class="cap" style="padding:16px;">No student matches "${esc(attendanceSearchTerm)}".</p>`;
    container.appendChild(roster);

    // Submit sits after the full list now — the natural last step once
    // every name has actually been looked at, not a button sitting
    // above names that haven't been marked yet.
    const submitRow = document.createElement('div');
    submitRow.style.cssText = 'margin-top:16px; display:flex; justify-content:flex-end;';
    submitRow.innerHTML = `<button onclick="submitRegisterForDay('${dateStr}')" style="padding:10px 22px; border-radius:8px; border:none; background:var(--primary); color:#fff; cursor:pointer; font-size:13.5px; font-weight:600;">${attendanceSaved ? 'Submitted ✓' : 'Submit register'}</button>`;
    container.appendChild(submitRow);
  }

  // Sets a specific status directly rather than cycling through
  // present → absent on repeated taps — Present and Absent are now two
  // separate buttons, so each one always means exactly what it says.
  // Tapping the already-active one clears back to "not marked".
  //
  // Optimistic: the screen updates immediately (same feel as before),
  // the real save happens in the background — an alert only appears
  // if that background save actually fails, so a slow connection
  // doesn't make marking attendance feel sluggish.
  //
  // Keyed by pupilId now, not name — attendanceRecords[date] is a
  // {pupilId: status} object, matching how the database and
  // get_attendance.php both key it. Two same-named children never
  // collide here, unlike the old name-keyed version.
  function setAttendanceStatus(dateStr, pupilId, status){
    if(!attendanceRecords[dateStr]) attendanceRecords[dateStr] = {};
    const newStatus = attendanceRecords[dateStr][pupilId] === status ? null : status;
    if(newStatus === null) delete attendanceRecords[dateStr][pupilId];
    else attendanceRecords[dateStr][pupilId] = newStatus;
    attendanceSaved = false;
    renderAttendanceBody();
    fetch('backend/attendance/save_attendance.php' + window.location.search, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ pupil_id: pupilId, date: dateStr, status: newStatus })
    }).catch(() => { alert('Could not save this mark — check your connection and try again.'); });
  }

  // Removes a pupil from the roster entirely (soft-delete — active=0
  // in the database, never a real DELETE) — not the same as marking
  // her absent for one day. Confirmed explicitly since this affects
  // every future register, not just today's.
  async function removePupilFromRoster(pupilId, name){
    if(!confirm(`Remove ${name} from the roster entirely? She'll stop appearing on every future register — this isn't the same as marking her absent today. Her past attendance history is kept, and this can be undone from the database if it was a mistake.`)) return;
    try{
      const res = await fetch('backend/pupils/remove_pupil.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pupil_id: pupilId })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        alert(data.message || 'Could not remove this pupil.');
        return;
      }
      realPupilsCache = null; // force a fresh fetch everywhere it's used, not just here
      renderAttendanceBody();
    } catch(err){
      alert('Could not reach the server.');
    }
  }

  async function markAllPresentForDay(dateStr){
    attendanceRecords[dateStr] = {};
    realPupilsCache.forEach(p => { attendanceRecords[dateStr][p.id] = 'present'; });
    attendanceSaved = false;
    renderAttendanceBody();
    try{
      await fetch('backend/attendance/save_attendance.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ marks: realPupilsCache.map(p => ({ pupil_id: p.id, date: dateStr, status: 'present' })) })
      });
    } catch(err){
      alert('Could not save to the server — check your connection and try again.');
    }
  }

  // Returns the day to genuinely unmarked — every student back to
  // "Not marked", not "Absent". This is the default state a fresh day
  // should start in; this button lets a teacher get back to it if a
  // register was started by mistake or needs a clean re-do.
  async function clearAllMarksForDay(dateStr){
    const previouslyMarkedIds = Object.keys(attendanceRecords[dateStr] || {}); // already pupil ids (as strings) — no name lookup needed
    attendanceRecords[dateStr] = {};
    attendanceSaved = false;
    renderAttendanceBody();
    if(!previouslyMarkedIds.length) return;
    try{
      await fetch('backend/attendance/save_attendance.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          marks: previouslyMarkedIds.map(id => ({ pupil_id: Number(id), date: dateStr, status: null }))
        })
      });
    } catch(err){
      alert('Could not clear marks on the server — check your connection and try again.');
    }
  }

  // Every mark already saves itself the moment it's tapped (see
  // setAttendanceStatus above) — this button is now just a local
  // "I've reviewed this day" confirmation, not a separate save step.
  function submitRegisterForDay(dateStr){
    attendanceSaved = true;
    renderAttendanceBody();
  }


  // ---------------------------------------------------------------
  // FOLLOW-UP ACTIONS — the "Action" and "Call home" buttons on
  // "Who needs a follow-up". Every action taken is saved to the
  // database (attendance_followups) against that child, so the card
  // shows what was last done and when, and nothing depends on memory.
  //   Call home — dials the primary guardian's number from the real
  //     Family Profile (never a sample one), then opens the form to
  //     record how the call went.
  //   Action — records any other follow-up (home visit, message,
  //     spoke at pickup, referred to supervisor …) with a note.
  // ---------------------------------------------------------------
  const FOLLOW_UP_ACTIONS = [
    'Called home — spoke to family',
    'Called home — no answer',
    'Home visit',
    'Spoke to parent at pickup / drop-off',
    'Sent a message to the family',
    'Referred to supervisor',
    'Other'
  ];
  var attendanceFollowupsCache = null;   // null | 'loading' | 'error:…' | { pupilId: [ {action_type, note, follow_up_date, reason} ] }
  var attendanceFollowUpFormFor = null;  // pupil id whose form is open
  var attendanceFollowUpFormType = '';
  var attendanceFollowUpFormReason = '';

  function ensureAttendanceFollowupsLoaded(){
    if(attendanceFollowupsCache !== null || !myClassInfo.class_id) return;
    attendanceFollowupsCache = 'loading';
    const params = new URLSearchParams(window.location.search);
    params.set('class_id', myClassInfo.class_id);
    fetch('backend/attendance/get_attendance_followups.php?' + params.toString())
      .then(r => r.json())
      .then(data => {
        if(data.status !== 'success'){ attendanceFollowupsCache = 'error:' + (data.message || 'Could not load follow-ups.'); return; }
        const byPupil = {};
        (data.followups || []).forEach(f => { (byPupil[f.pupil_id] = byPupil[f.pupil_id] || []).push(f); });
        attendanceFollowupsCache = byPupil;
      })
      .catch(() => { attendanceFollowupsCache = 'error:Could not reach the server.'; })
      .finally(() => {
        const body = document.getElementById('attendance-body');
        if(body && !body.classList.contains('hidden')) renderAttendanceBody();
        if(typeof classAttendanceTab !== 'undefined' && classAttendanceTab === 'reports' && typeof renderAttendanceReports === 'function') renderAttendanceReports();
      });
  }

  // Primary guardian's phone from the REAL imported/entered Family
  // Profile only — a sample household's number is never dialled.
  function guardianContactFor(pupilName){
    const rec = familyRecords[pupilName];
    if(!rec || !Array.isArray(rec.guardianNames)) return null;
    const g = rec.guardianNames.find(x => x.primary && x.phone) || rec.guardianNames.find(x => x.phone);
    return g ? { phone: String(g.phone).trim(), name: g.name || '', rel: g.rel || '' } : null;
  }

  function callHomeForPupil(pupilId, reason){
    const pupil = realPupilsCache.find(p => p.id === pupilId);
    if(!pupil) return;
    const g = guardianContactFor(pupil.name);
    if(!g){
      alert('No phone number is on file for ' + pupil.name + '\u2019s family.\n\nAdd it in Family & Parents \u2192 choose ' + pupil.name + ' \u2192 Edit this profile manually, or import the Family Profile sheet.');
      return;
    }
    // Opens the phone dialler (on a phone) or the calling app (on a computer).
    window.location.href = 'tel:' + g.phone.replace(/[^\d+]/g, '');
    attendanceFollowUpFormFor = pupilId;
    attendanceFollowUpFormType = 'Called home — spoke to family';
    attendanceFollowUpFormReason = reason;
    renderAttendanceBody();
  }

  function openFollowUpAction(pupilId, reason){
    const closing = attendanceFollowUpFormFor === pupilId;
    attendanceFollowUpFormFor = closing ? null : pupilId;
    attendanceFollowUpFormType = '';
    attendanceFollowUpFormReason = reason;
    renderAttendanceBody();
  }

  async function saveAttendanceFollowUp(pupilId){
    const typeEl = document.getElementById('fuType-' + pupilId);
    const noteEl = document.getElementById('fuNote-' + pupilId);
    const dateEl = document.getElementById('fuDate-' + pupilId);
    const btn = document.getElementById('fuSave-' + pupilId);
    if(!typeEl || !typeEl.value){ alert('Choose what was done.'); return; }
    if(btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
    try{
      const res = await fetch('backend/attendance/save_attendance_followup.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, pupil_id: pupilId, action_type: typeEl.value, note: (noteEl.value || '').trim(), follow_up_date: dateEl.value, reason: attendanceFollowUpFormReason })
      });
      const data = await res.json();
      if(data.status !== 'success'){ alert(data.message || 'Could not save.'); if(btn){ btn.disabled = false; btn.textContent = 'Save'; } return; }
      attendanceFollowUpFormFor = null;
      attendanceFollowupsCache = null; // reload the real saved list
      ensureAttendanceFollowupsLoaded();
      renderAttendanceBody();
    } catch(err){
      alert('Could not reach the server.');
      if(btn){ btn.disabled = false; btn.textContent = 'Save'; }
    }
  }

  // One child's row in a follow-up card: name, why, last action, the two
  // buttons, and (when open) the form to record what was done.
  function followUpChildRowHtml(pupilId, name, detail, reason){
    const g = guardianContactFor(name);
    const history = (attendanceFollowupsCache && typeof attendanceFollowupsCache === 'object' && attendanceFollowupsCache[pupilId]) || [];
    const last = history[0];
    const lastLine = last
      ? `<div class="cap" style="margin-top:3px; color:var(--good,#0a7a0a);">Last: ${esc(last.action_type)} · ${esc(new Date(last.follow_up_date + 'T00:00:00').toLocaleDateString([], {day:'numeric', month:'short'}))}${history.length > 1 ? ' · ' + history.length + ' actions so far' : ''}</div>`
      : `<div class="cap" style="margin-top:3px;">No follow-up recorded yet</div>`;
    const btn = 'padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12px; cursor:pointer; white-space:nowrap;';
    const open = attendanceFollowUpFormFor === pupilId;
    const today = todayDateKey();
    const form = open ? `
      <div style="margin-top:10px; padding:12px; border:1px dashed var(--border); border-radius:10px; background:var(--bg);">
        <label class="cap" style="display:block; margin-bottom:4px;">What was done</label>
        <select id="fuType-${pupilId}" style="width:100%; padding:7px 8px; border:1px solid var(--border); border-radius:8px; font-size:13px; background:#fff;">
          <option value="">Choose…</option>
          ${FOLLOW_UP_ACTIONS.map(a => `<option ${a === attendanceFollowUpFormType ? 'selected' : ''}>${esc(a)}</option>`).join('')}
        </select>
        <label class="cap" style="display:block; margin:8px 0 4px;">Date</label>
        <input id="fuDate-${pupilId}" type="date" value="${today}" max="${today}" style="padding:7px 8px; border:1px solid var(--border); border-radius:8px; font-size:13px;" />
        <label class="cap" style="display:block; margin:8px 0 4px;">Note (what the family said, next step)</label>
        <textarea id="fuNote-${pupilId}" rows="2" placeholder="e.g. Mother says she had fever, will return Monday" style="width:100%; padding:7px 8px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;"></textarea>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button id="fuSave-${pupilId}" onclick="saveAttendanceFollowUp(${pupilId})" style="padding:7px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;">Save</button>
          <button onclick="openFollowUpAction(${pupilId}, '${reason}')" style="${btn}">Cancel</button>
        </div>
        ${history.length ? `<div class="cap" style="margin-top:10px;"><b>Earlier:</b><br>${history.slice(0, 5).map(h => esc(h.follow_up_date) + ' — ' + esc(h.action_type) + (h.note ? ': ' + esc(h.note) : '')).join('<br>')}</div>` : ''}
      </div>` : '';
    return `<div style="padding:10px 0; border-bottom:1px solid var(--border);">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;">
        <div style="min-width:0;"><b>${esc(name)}</b><div class="cap">${detail}</div>${g ? `<div class="cap">📞 ${esc(g.phone)}${g.rel ? ' · ' + esc(g.rel) : ''}</div>` : ''}${lastLine}</div>
        <div style="display:flex; gap:6px; flex-shrink:0;">
          <button onclick="openFollowUpAction(${pupilId}, '${reason}')" style="${btn}${open ? ' background:var(--bg);' : ''}">Action</button>
          <button onclick="callHomeForPupil(${pupilId}, '${reason}')" title="${g ? 'Call ' + esc(g.phone) : 'No phone number on file'}" style="${btn}${g ? '' : ' color:var(--text-muted,#888);'}">Call home</button>
        </div>
      </div>${form}
    </div>`;
  }

  function renderAttendanceFollowUp(container, year, month, uptoDateStr){
    container.appendChild(mdSec('Who needs a follow-up', '<span class="reqs">REG-06/07 · PTC-09</span>'));
    ensureAttendanceFollowupsLoaded();
    if(!familyRecordsLoaded) ensureFamilyRecordsLoaded(renderAttendanceBody); // real guardian phone numbers for "Call home"

    // Square cards: same width and height, a big count at the top and
    // the names underneath (scrolls inside the card if the list is long).
    const SQUARE_CARD_STYLE = 'padding:20px; aspect-ratio:1 / 1; display:flex; flex-direction:column; overflow:hidden; min-width:0;';

    // Below 70% this month — at least 4 marked days, so a child admitted
    // a couple of days ago isn't judged on a handful of days.
    const belowList = [];
    realPupilsCache.forEach(p => {
      const mtd = childMonthToDatePct(p.id, year, month, uptoDateStr);
      if(mtd.marked >= 4 && mtd.pct < 70) belowList.push({ id: p.id, name: p.name, pct: mtd.pct, marked: mtd.marked, present: mtd.present });
    });
    const belowCard = document.createElement('div');
    belowCard.className = 'card'; belowCard.style.cssText = SQUARE_CARD_STYLE;
    const belowRows = belowList.length
      ? belowList.map(c => followUpChildRowHtml(c.id, c.name, c.present + ' of ' + c.marked + ' days · ' + c.pct + '%', 'below70')).join('')
      : `<p class="cap">No children below 70% with four or more days marked yet.</p>`;
    belowCard.innerHTML = `<h4 style="margin:0 0 6px;">Below 70% this month</h4>
      <div style="font-family:var(--disp); font-size:34px; font-weight:800; line-height:1; color:${belowList.length ? 'var(--crit,#d03b3b)' : 'var(--good,#0ca30c)'};">${belowList.length}<small style="font-size:14px; font-weight:700; color:var(--ink-2,#4f534d);"> of ${assessmentPupilNames().length}</small></div>
      <p class="cap" style="margin:6px 0 10px;">Children with four or more days marked. A child admitted last week isn't judged on three days.</p>
      <div style="flex:1; overflow-y:auto; min-height:0;">${belowRows}</div>`;

    // Three or more days in a row — the child's TRAILING streak of
    // consecutive absent marks, ending on or before the selected date.
    const streakList = [];
    realPupilsCache.forEach(p => {
      const markedDates = Object.keys(attendanceRecords)
        .filter(d => d <= uptoDateStr && attendanceRecords[d] && attendanceRecords[d][p.id])
        .sort();
      let streak = 0;
      markedDates.forEach(d => { streak = attendanceRecords[d][p.id] === 'absent' ? streak + 1 : 0; });
      if(streak >= 3) streakList.push({ id: p.id, name: p.name, streak });
    });
    const streakCard = document.createElement('div');
    streakCard.className = 'card'; streakCard.style.cssText = SQUARE_CARD_STYLE;
    const streakRows = streakList.length
      ? streakList.map(c => followUpChildRowHtml(c.id, c.name, c.streak + ' days absent in a row', 'streak')).join('')
      : `<p class="cap">No unbroken absence of three days or more.</p>`;
    streakCard.innerHTML = `<h4 style="margin:0 0 6px;">Three or more days in a row</h4>
      <div style="font-family:var(--disp); font-size:34px; font-weight:800; line-height:1; color:${streakList.length ? 'var(--crit,#d03b3b)' : 'var(--good,#0ca30c)'};">${streakList.length}<small style="font-size:14px; font-weight:700; color:var(--ink-2,#4f534d);"> ${streakList.length === 1 ? 'child' : 'children'}</small></div>
      <p class="cap" style="margin:6px 0 10px;">Unbroken absences ending on this date. REG-07 raises this to the supervisor automatically.</p>
      <div style="flex:1; overflow-y:auto; min-height:0;">${streakRows}</div>`;

    const twoCol = document.createElement('div');
    twoCol.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 340px)); gap:20px;';
    twoCol.appendChild(belowCard);
    twoCol.appendChild(streakCard);
    container.appendChild(twoCol);
  }

  function filterAttendance(term){
    attendanceSearchTerm = term;
    renderAttendanceBody();
    const input = document.querySelector('.attendance-search');
    if(input){ input.focus(); input.setSelectionRange(term.length, term.length); }
  }

  let expandedWeek = 1;
  const dayTopicDone = {}; // key: week-dayKey -> true/false (manual sidebar tick, separate from granular task tracking)

  /* ===================== SECTION 11: WEEKLY ACTIVITIES / CURRICULUM ===================== */

  function renderSidebar(){
    const list = document.getElementById('week-list');
    list.innerHTML = WEEKS.map(w => {
      const isExpanded = expandedWeek === w.w;
      let dropdownHtml = '';
      if(isExpanded && weeksWithContent.includes(w.w)){
        const weekTopics = WEEK_DAY_TOPICS['wk' + w.w] || {};
        dropdownHtml = `<div class="day-topic-list">
          <div class="day-topic-heading">Topic: ${w.theme}</div>` + DAYS.map(d => {
          const key = w.w + '-' + d.key;
          const checked = dayTopicDone[key] ? 'checked' : '';
          const doneClass = dayTopicDone[key] ? 'dt-done' : '';
          const activeClass = (w.w===currentWeekNum && d.key===currentDay) ? 'active-day' : '';
          const topic = weekTopics[d.key];
          const topicText = topic ? alwaysEnglish(topic.value) : 'Topic not yet added';
          return `<div class="day-topic-row ${activeClass}">
            <input type="checkbox" ${checked} onchange="toggleDayTopic(${w.w}, '${d.key}', this)" />
            <span class="dt-label ${doneClass}" onclick="event.stopPropagation(); selectWeekDay(${w.w}, '${d.key}')">${d.label} — ${topicText}</span>
          </div>`;
        }).join('') + `</div>`;
      } else if(isExpanded){
        dropdownHtml = `<div class="day-topic-list" style="color:var(--text-muted); font-size:11px;">No topics authored for this week yet.</div>`;
      }
      return `<div class="week-item ${w.w===currentWeekNum?'active':''} ${weeksWithContent.includes(w.w)?'has-content':''}" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; align-items:center; gap:10px;" onclick="toggleWeekExpand(${w.w})">
          <div class="week-num">${w.w}</div>
          <div class="week-info">
            <div class="week-title">WEEK-${w.w}</div>
            <div class="week-dates">${w.theme} · ${w.dates}</div>
          </div>
          <span class="chevron ${isExpanded?'open':''}">▶</span>
        </div>
        ${dropdownHtml}
      </div>`;
    }).join('');
  }

  function toggleWeekExpand(wnum){
    expandedWeek = (expandedWeek === wnum) ? null : wnum;
    if(weeksWithContent.includes(wnum)) openWeek(wnum);
    else renderSidebar();
  }

  function toggleDayTopic(wnum, dayKey, el){
    dayTopicDone[wnum + '-' + dayKey] = el.checked;
    renderSidebar();
  }

  function selectWeekDay(wnum, dayKey){
    expandedWeek = wnum;
    currentDay = dayKey;
    openWeek(wnum);
    closeSidebar();
  }

  function openWeek(wnum){
    currentWeekNum = wnum;
    renderSidebar();
    const w = WEEKS.find(x => x.w === wnum);
    document.getElementById('week-subheading').textContent = `Week ${w.w} · Term 1 · ${w.dates} · Theme: ${w.theme}`;
    const body = document.getElementById('week-body');
    if(weeksWithContent.includes(wnum)){
      renderWeekBody();
    } else {
      body.innerHTML = `<div class="empty-state">Content for "${w.theme}" hasn't been authored in this rough demo yet — only Week 1 ("My Classroom") has the full daily lesson plan wired up.</div>`;
    }
  }

  function renderWeekBody(){
    const body = document.getElementById('week-body');
    body.innerHTML = `
      <div class="value-banner" id="value-banner"></div>
      <div id="day-summary"></div>
      <div id="rating-panel-container"></div>
      <div class="domain-grid" id="domain-grid"></div>
    `;
    renderDailyView();
  }

  const domainDone = {};   // key: day-domain -> true/false
  const dayRatings = {};   // key: day-domain -> {studentName: rating}

  function renderDailyView(){
    const day = DAYS.find(d => d.key === currentDay);
    document.getElementById('value-banner').innerHTML = `<strong>Value:</strong> ${alwaysEnglish(day.value)} &nbsp;·&nbsp; <strong>Link:</strong> ${alwaysEnglish(day.link)}`;

    let doneCount = 0;
    let cardsHtml = '';

    // Only render a card for domains that actually have content for
    // this specific week — e.g. Week 2's real plan doesn't include
    // Tidy & Put Away at all, so it should disappear rather than
    // show an empty "Not planned yet" placeholder.
    const weekPlan = WEEKLY_PLAN['wk' + currentWeekNum];
    const trackedDomains = DOMAINS.filter(dom => weekPlan && weekPlan[dom.key] !== undefined);

    trackedDomains.forEach(dom => {
      const activity = todaysActivity(dom.key);
      const key = currentDay + '-' + dom.key;
      const done = !!domainDone[key];
      if(done) doneCount++;

      if(!dom.h5p){
        // Plain checklist item, no game, no proficiency rating
        cardsHtml += `<div class="stage-card ${done?'done':''}">
          <div class="stage-head">
            <span class="name">${pickLang(dom.label)} <span class="stage-time">${dom.time}</span></span>
            <span class="stage-tag ${done?'done':''}">${done ? 'Done' : 'Not done'}</span>
          </div>
          <div class="materials-line">Planned activity: ${activity}</div>
          <div class="competency-tag">Covers: ${competencyFor(dom.key)}</div>
          <div class="stage-foot">
            <label class="mark-taught">
              <input type="checkbox" ${done?'checked':''} onchange="toggleDomainDone('${dom.key}', this)" />
              Mark as done today
            </label>
          </div>
        </div>`;
        return;
      }

      cardsHtml += `<div class="stage-card ${done?'done':''}" id="stage-card-${key}">
        <div class="stage-head">
          <span class="name">${pickLang(dom.label)} <span class="stage-time">${dom.time}</span></span>
          <button class="fullscreen-btn" onclick="toggleCardFullscreen('stage-card-${key}')" title="View full screen" aria-label="View full screen">⛶</button>
          <span class="stage-tag ${done?'done':''}">${done ? 'Done today' : 'Pending'}</span>
        </div>
        <div class="materials-line">Planned activity: ${activity}</div>
        <div class="competency-tag">Covers: ${competencyFor(dom.key)}</div>
        <div class="h5p-block">
          <div class="h5p-frame" id="${mountId(key)}">${done ? '<div class="h5p-done-msg">✓ Practised — nice work!</div>' : ''}</div>
        </div>
        <div class="stage-foot">
          <label class="mark-taught">
            <input type="checkbox" ${done?'checked':''} onchange="toggleDomainDone('${dom.key}', this)" />
            Mark as done today
          </label>
          <button class="btn-rate-open small" onclick="openRatingPanel('${dom.key}')">Enter proficiency</button>
        </div>
      </div>`;
    });

    document.getElementById('domain-grid').innerHTML = cardsHtml;
    document.getElementById('day-summary').innerHTML =
      `<div class="topic-complete-banner ${doneCount<trackedDomains.length ? 'pending' : ''}">${doneCount===trackedDomains.length?'✓ ':''}${doneCount} of ${trackedDomains.length} domains done for ${day.label}</div>`;

    trackedDomains.forEach(dom => { if(dom.h5p) mountH5pIfNeeded(dom.key); });
    document.getElementById('pending-count').textContent = DOMAINS.length - doneCount;

    renderTodayOverview();
  }

  function toggleDomainDone(domainKey, el){
    domainDone[currentDay + '-' + domainKey] = el.checked;
    renderDailyView();
  }

  function renderTodayOverview(){
    const el = document.getElementById('today-overview');
    if(!el) return;
    const day = DAYS.find(d => d.key === currentDay);

    const rows = DOMAINS.map(dom => {
      const activity = todaysActivity(dom.key);
      const done = !!domainDone[currentDay + '-' + dom.key];
      return `<div class="overview-row ${done ? 'done' : ''}">
        <span class="overview-time">${dom.time}</span>
        <span class="overview-domain">${pickLang(dom.label)}</span>
        <span class="overview-activity">${activity}</span>
        <span class="overview-status">${done ? '✓' : '•'}</span>
      </div>`;
    }).join('');

    el.innerHTML = `
      <div class="overview-header">
        <span>Today's plan — ${day.label}</span>
        <span class="overview-toggle" onclick="toggleOverview()">${overviewCollapsed ? 'Show' : 'Hide'}</span>
      </div>
      <div class="overview-body ${overviewCollapsed ? 'hidden' : ''}">${rows}</div>
    `;
  }

  let overviewCollapsed = false;
  function toggleOverview(){
    overviewCollapsed = !overviewCollapsed;
    renderTodayOverview();
  }


  function mountId(key){ return 'h5p-mount-' + key.replace(/[^a-zA-Z0-9]/g,'_'); }

  function mountH5pIfNeeded(domainKey){
    const key = currentDay + '-' + domainKey;
    if(domainDone[key]) return; // already taught — done message is shown instead
    const el = document.getElementById(mountId(key));
    const renderer = ACTIVITY_RENDERERS[domainKey];
    if(el && renderer){
      renderer(el, function(){
        domainDone[key] = true;
        renderDailyView();
      });
    }
  }

  function openRatingPanel(domainKey){
    const key = currentDay + '-' + domainKey;
    const existing = dayRatings[key] || {};
    const domainLabel = DOMAINS.find(d=>d.key===domainKey).label;
    const dayLabel = DAYS.find(d=>d.key===currentDay).label;
    const competencyText = competencyFor(domainKey);

    let html = `<div class="rating-panel">
      <p class="rp-title">Enter proficiency — ${domainLabel}, ${dayLabel}</p>
      <p class="rp-competency"><strong>Covers:</strong> ${competencyText}</p>`;
    (Array.isArray(realPupilsCache) ? realPupilsCache.map(p => p.name) : []).forEach(name => {
      const current = existing[name] || '';
      html += `<div class="rp-row"><span>${name}</span>
        <select id="rate-${name.replace(/\s/g,'_')}">
          <option value="">— Select —</option>
          ${RATING_LEVELS.map(l => `<option value="${l}" ${current===l?'selected':''}>${l}</option>`).join('')}
        </select></div>`;
    });
    html += `<div class="rp-actions">
        <button class="btn-save" onclick="saveRatings('${domainKey}')">Save ratings</button>
        <button class="btn-cancel" onclick="closeRatingPanel()">Cancel</button>
      </div></div>`;
    document.getElementById('rating-panel-container').innerHTML = html;
    document.getElementById('rating-panel-container').scrollIntoView({behavior:'smooth', block:'center'});
  }

  function saveRatings(domainKey){
    const key = currentDay + '-' + domainKey;
    const ratings = {};
    (Array.isArray(realPupilsCache) ? realPupilsCache.map(p => p.name) : []).forEach(name => {
      const sel = document.getElementById(`rate-${name.replace(/\s/g,'_')}`);
      if(sel && sel.value) ratings[name] = sel.value;
    });
    dayRatings[key] = ratings;
    closeRatingPanel();
  }

  function closeRatingPanel(){
    document.getElementById('rating-panel-container').innerHTML = '';
  }

/* =========================================================
   SESSION RESUME — on page load, check whether there's already a
   real logged-in session (e.g. after clicking "Preview as Teacher"
   from Super Admin, or simply reloading this page while logged in)
   and skip straight to the dashboard instead of showing the login
   form again. If not logged in, the login form just stays visible,
   same as before this existed.

   Runs last, after every function/variable it calls is already
   defined — same ordering reason the old dev-bypass trigger used
   to need this position.
   ========================================================= */
  
// -------------------------------------------------------------------------
// PREVIEW BANNER — shown only when a superadmin is currently previewing
// the teacher role (see backend/preview_as.php). Lets them get back to
// their real superadmin session with one click, no re-login needed.
// -------------------------------------------------------------------------
  /* ===================== SECTION 12: REMAINING SIDEBAR SCREENS ===================== */
  // All 11 of these are deliberately frontend-only placeholder views —
  // sample/computed data, no new backend endpoints, same "frontend
  // first" pattern used everywhere else in this app so far. The 5
  // student-dependent ones (My Class, Class Progress, Attendance
  // Register, Admissions, Monthly Assessment, Child Record, Transition)
  // are blocked on a real `students` table — this reuses the existing
  // SAMPLE_STUDENTS list as a stand-in until that table exists.
  //
  // Deterministic pseudo-random helper — same purpose as the old
  // prototype's rng(): stable sample numbers that don't re-shuffle on
  // every render, without needing a real backend or true randomness.
  function sampleHash(str){
    let h = 2166136261;
    for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }
  function sampleRand(seed){ return (sampleHash(seed) % 1000) / 1000; }
  function samplePick(seed, arr){ return arr[Math.floor(sampleRand(seed) * arr.length)]; }

  // ---------- 1. MY CLASS ----------
  // Matches the real prototype's vTeacherClass exactly: same tiles, same
  // table columns, same wording/req codes — pulled directly from the
  // prototype's source rather than guessed at from a screenshot.
  const OCCUPATIONS = ['Daily wage labour','Auto / taxi driver','Domestic work','Tailoring','Homemaker','Unemployed','Self-employed / small trade','Salaried'];
  const LANGUAGES_AT_HOME = ['Hindi','Marathi','Telugu','Bhojpuri','Gujarati'];
  const INCOME_BANDS = ['Under ₹5,000','₹5,000–10,000','₹15,000–25,000','Prefer not to say'];

  // No invented family details: a child without a real family profile
  // gets an EMPTY record (every screen then shows "No data available").
  function sampleFamily(name){
    return { guardians: [], langs: [], reads: false, income: '', complete: 0, consent: false, photoConsent: false, noData: true };
  }
  function sampleHomeActStatus(name){
    return 'No data available'; // home activity is not tracked yet — never invented
  }

  // ---------- 1. MY CLASS — weekly activity performance ----------
  // One row per child, one column per session domain (each mapped to
  // its Curricular Goal). The teacher rates each child once per domain
  // per week on the same B / P / A scale used everywhere else in the
  // app. Real data only: ratings come from child_activity_ratings via
  // get_child_activity_ratings.php; "held" counts come from the real
  // session-done records (sessionDoneEntries). Nothing rated = "·".
  let myClassViewWeek = null;          // null = follow currentWeekNum
  let myClassRatingPopupKey = null;    // 'pupilId|domainKey' of the one open popup, or null
  let myClassRatingSaveError = '';     // shown above the table if a save fails
  let childActivityRatings = {};       // week -> { pupilId: { domainKey: 'E'|'P'|'A' } }
  let childActivityRatingsStatus = {}; // week -> 'loading' | 'loaded' | 'error'
  let myClassPlanFetchTried = {};      // week -> true once we've asked for that week's session records

  function myClassWeek(){
    return myClassViewWeek === null ? currentWeekNum : myClassViewWeek;
  }
  function shiftMyClassWeek(delta){
    const firstWeek = (typeof WEEKS !== 'undefined' && WEEKS.length) ? WEEKS[0].w : 1;
    const next = myClassWeek() + delta;
    if(next < firstWeek || next > currentWeekNum) return; // no rating future weeks
    myClassViewWeek = next;
    myClassRatingPopupKey = null;
    renderMyClass();
  }

  async function fetchChildActivityRatings(week){
    if(!myClassInfo.class_id) return;
    childActivityRatingsStatus[week] = 'loading';
    try{
      const params = new URLSearchParams(window.location.search);
      params.set('class_id', myClassInfo.class_id);
      params.set('week_number', week);
      const res = await fetch('backend/assessment/activity/get_child_activity_ratings.php?' + params.toString());
      const data = await res.json();
      if(data.status === 'success'){
        childActivityRatings[week] = data.ratings || {};
        childActivityRatingsStatus[week] = 'loaded';
      } else {
        childActivityRatingsStatus[week] = 'error';
      }
    } catch(err){
      childActivityRatingsStatus[week] = 'error';
    }
    renderMyClass();
    if(typeof assessmentRecordsRerender === 'function') assessmentRecordsRerender();
  }

  function toggleMyClassRatingPopup(pupilId, domainKey){
    const key = pupilId + '|' + domainKey;
    myClassRatingPopupKey = (myClassRatingPopupKey === key) ? null : key;
    renderMyClass();
  }

  async function setChildActivityRating(pupilId, domainKey, rating){
    const week = myClassWeek();
    if(!childActivityRatings[week]) childActivityRatings[week] = {};
    if(!childActivityRatings[week][pupilId]) childActivityRatings[week][pupilId] = {};
    const previous = childActivityRatings[week][pupilId][domainKey] || null;

    // Optimistic local update so the tap feels instant
    if(rating) childActivityRatings[week][pupilId][domainKey] = rating;
    else delete childActivityRatings[week][pupilId][domainKey];
    myClassRatingPopupKey = null;
    myClassRatingSaveError = '';
    renderMyClass();

    try{
      const res = await fetch('backend/assessment/activity/save_child_activity_rating.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, week_number: week, pupil_id: pupilId, domain_key: domainKey, rating: rating || null })
      });
      const data = await res.json();
      if(data.status !== 'success') throw new Error(data.message || 'Save failed');
    } catch(err){
      // Put back what the server actually has, and say so
      if(previous) childActivityRatings[week][pupilId][domainKey] = previous;
      else delete childActivityRatings[week][pupilId][domainKey];
      myClassRatingSaveError = 'Could not save that rating — it has been undone. Check your connection and try again.';
      renderMyClass();
    }
  }

  function myClassRatingCell(pupilId, domainKey, rating){
    const key = pupilId + '|' + domainKey;
    const isOpen = myClassRatingPopupKey === key;
    const badge = rating
      ? `<span onclick="toggleMyClassRatingPopup(${pupilId},'${domainKey}')" style="${gradeBtnStyle(rating, true, 26)}" title="${TIER_INFO[rating].n} — tap to change">${gradeBtnLabel(true, rating)}</span>`
      : `<span onclick="toggleMyClassRatingPopup(${pupilId},'${domainKey}')" class="dim" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; border:1px dashed #0b0b0b55;" title="Not rated — tap to rate">·</span>`;
    const popup = isOpen ? `
      <div style="position:absolute; top:30px; left:50%; transform:translateX(-50%); z-index:20; background:#fff; border:1px solid #0b0b0b33; border-radius:8px; padding:4px; display:flex; gap:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); white-space:nowrap;">
        ${['E','P','A'].map(t => `<span onclick="setChildActivityRating(${pupilId},'${domainKey}','${t}')" style="${gradeBtnStyle(t, t === rating, 26)}" title="${TIER_INFO[t].n}">${gradeBtnLabel(t === rating, t)}</span>`).join('')}
        ${rating ? `<span onclick="setChildActivityRating(${pupilId},'${domainKey}',null)" class="dim" style="cursor:pointer; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px; border:1px solid #0b0b0b22;" title="Clear rating">✕</span>` : ''}
      </div>` : '';
    return `<td style="text-align:center; position:relative;">${badge}${popup}</td>`;
  }

  // My Class now shows the families (renderMyClassFamilies, part 13).
  // The weekly activity grading below moved to Assessment → 🧒 Weekly
  // activities. Everything that refreshes it still calls renderMyClass(),
  // so this refreshes whichever of the two is on screen.
  function renderMyClass(){
    const mc = document.getElementById('myclass-body');
    if(mc && !mc.classList.contains('hidden')) renderMyClassFamilies();
    const ab = document.getElementById('assessment-body');
    if(ab && !ab.classList.contains('hidden') && assessmentEntryType === 'activity') renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  function renderWeeklyActivitySection(container){
    if(!ensurePupilsLoadedFor(container, renderMyClass)) return;

    const week = myClassWeek();
    const weekInfo = (typeof WEEKS !== 'undefined') ? WEEKS.find(w => w.w === week) : null;
    const firstWeek = (typeof WEEKS !== 'undefined' && WEEKS.length) ? WEEKS[0].w : 1;

    container.appendChild(mdSec('Weekly activity performance', '<span class="reqs">CG-3 · CG-4 · CG-8 · CG-9 · CG-10 · CG-11 · CG-12</span>'));

    // Week picker
    const picker = document.createElement('div');
    picker.style.cssText = 'display:flex; align-items:center; gap:10px; margin:0 0 12px; flex-wrap:wrap;';
    picker.innerHTML = `
      <button class="btn" ${week <= firstWeek ? 'disabled' : ''} onclick="shiftMyClassWeek(-1)">‹ Previous week</button>
      <div><b>Week ${week}</b>${weekInfo ? ` · ${esc(weekInfo.theme)} <span class="dim">(${esc(weekInfo.dates)})</span>` : ''}</div>
      <button class="btn" ${week >= currentWeekNum ? 'disabled' : ''} onclick="shiftMyClassWeek(1)">Next week ›</button>`;
    container.appendChild(picker);

    if(!myClassInfo.class_id){
      const msg = document.createElement('p'); msg.className = 'dim'; msg.textContent = 'Loading your class info…';
      container.appendChild(msg);
      return;
    }

    // Real session-done records for this week (for the "held" line under each domain)
    if(!myClassPlanFetchTried[week]){
      myClassPlanFetchTried[week] = true;
      Promise.resolve(ensureDailyPlanEntriesLoaded(false, week)).then(() => renderMyClass());
    }

    // Real ratings for this week
    const status = childActivityRatingsStatus[week];
    if(status === undefined){ fetchChildActivityRatings(week); }
    if(status === undefined || status === 'loading'){
      const msg = document.createElement('p'); msg.className = 'dim'; msg.textContent = 'Loading this week\'s ratings…';
      container.appendChild(msg);
      return;
    }
    if(status === 'error'){
      const wrap = document.createElement('div');
      wrap.innerHTML = '<p class="dim">Could not load this week\'s ratings from the server.</p><button class="btn">Retry</button>';
      wrap.querySelector('button').onclick = () => { delete childActivityRatingsStatus[week]; renderMyClass(); };
      container.appendChild(wrap);
      return;
    }

    if(myClassRatingSaveError){
      const err = document.createElement('p');
      err.style.cssText = 'color:#b42318; margin:0 0 8px;';
      err.textContent = myClassRatingSaveError;
      container.appendChild(err);
    }

    const weekRatings = childActivityRatings[week] || {};
    const heldDays = {};
    DOMAINS.forEach(d => {
      heldDays[d.key] = DAYS.filter(day => sessionDoneEntries[dailyPlanKey(week, day.key, d.key)]).length;
    });

    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th>' +
      DOMAINS.map(d => `<th style="text-align:center; white-space:normal; min-width:84px;" title="${esc(broadCompetencyFallback(d.key))}">
        ${esc(d.label)}<br><span class="dim" style="font-weight:400; font-size:11px;">${esc(d.cg)} · ${heldDays[d.key] ? 'held ' + heldDays[d.key] + '/' + DAYS.length + ' days' : 'not marked held'}</span></th>`).join('') +
      '<th style="text-align:center;">Rated</th><th style="text-align:center;">P or A</th></tr></thead><tbody>';

    realPupilsCache.forEach(pupil => {
      const r = weekRatings[pupil.id] || {};
      const ratedCount = DOMAINS.filter(d => r[d.key]).length;
      const paCount = DOMAINS.filter(d => r[d.key] === 'P' || r[d.key] === 'A').length;
      table += `<tr>
        <td style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(pupil.name)}')"><b>${esc(pupil.name)}</b></td>
        ${DOMAINS.map(d => myClassRatingCell(pupil.id, d.key, r[d.key] || null)).join('')}
        <td style="text-align:center;">${ratedCount ? ratedCount + ' / ' + DOMAINS.length : '<span class="dim">Not yet rated</span>'}</td>
        <td style="text-align:center;">${ratedCount ? '<b>' + paCount + '</b> of ' + ratedCount : '<span class="dim">—</span>'}</td>
      </tr>`;
    });
    table += '</tbody></table></div>';

    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Rate each child once per activity area for the week: B Beginner · P Proficient · A Advanced. Tap a cell to rate; tap a name to open that child\'s full record. "Held" counts come from sessions marked done in My Day.', wrap));
    container.appendChild(assessmentReportsLink('myclass'));
  }



  // ---------- 2. CLASS PROGRESS ----------
  // Matches the real prototype's vTeacherProgress structure — same
  // tile set and the same B/P/A tier grid per child per domain. The
  // underlying SRI/CPI/ARI formulas and dumbbell/stack charts from the
  // original are NOT reproduced (they depend on a full assessment
  // history this app doesn't have yet) — tile numbers here are sample
  // data shaped to look the same, not the real formula output.
  // Internal tier code stays 'E' (touched by dozens of calculations in
  // Dashboard/Transition/Child Record/PDF export) — only what's shown
  // to a person changes, via .letter/.n below. Renaming the storage
  // code itself would mean re-verifying every one of those call sites;
  // this way the display changes everywhere at once, safely.
  const TIER_INFO = { E: {n:'Beginner', c:'crit', letter:'B'}, P: {n:'Proficient', c:'warn', letter:'P'}, A: {n:'Advanced', c:'good', letter:'A'} };

/* ===== teacher-part-04.js ===== */
/* =========================================================================
   teacher-part-04.js — part 4 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */
  // The real assessment domains (ASM screens) — 10 developmental
  // domains, DIFFERENT from the app's existing DOMAINS array (which is
  // the 8 time-of-day session slots for My Day/Daily Plan). Matches
  // the prototype's own column headers exactly: HEAL PHYS SENS ENVI
  // EMOT PART LOGI MATH LANG ARTS.
  var ASSESSMENT_DOMAINS = [
    {key:'heal', label:'HEAL', full:'Health'},
    {key:'phys', label:'PHYS', full:'Physical'},
    {key:'sens', label:'SENS', full:'Sensory'},
    {key:'envi', label:'ENVI', full:'Environmental awareness'},
    {key:'emot', label:'EMOT', full:'Emotional'},
    {key:'part', label:'PART', full:'Participation'},
    {key:'logi', label:'LOGI', full:'Logical / cognitive'},
    {key:'math', label:'MATH', full:'Numeracy'},
    {key:'lang', label:'LANG', full:'Language'},
    {key:'arts', label:'ARTS', full:'Creative arts'}
  ];
  // Tap-to-open-popup grading: tapping a domain cell's badge opens a
  // small popup with 3 direct buttons (B/P/A) — 2 taps total, but the
  // cell itself stays compact (matters here since each row has 10 of
  // these). openAssessmentPopupKey tracks which single cell's popup is
  // open at a time; the whole table re-renders on every interaction,
  // same pattern as the rest of this screen.
  let openAssessmentPopupKey = null; // 'studentName|domainKey', or null
  function assessmentTierCell(name, domainKey, recorded, tier){
    const cellKey = name + '|' + domainKey;
    const isOpen = openAssessmentPopupKey === cellKey;
    const badgeHtml = recorded
      ? `<span onclick="toggleAssessmentPopup('${name}','${domainKey}')" style="${gradeBtnStyle(tier, true, 26)}" title="${TIER_INFO[tier].n} — tap to change">${gradeBtnLabel(true, tier)}</span>`
      : `<span onclick="toggleAssessmentPopup('${name}','${domainKey}')" class="dim" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; border:1px dashed #0b0b0b55;" title="Not observed — tap to record">·</span>`;
    const popupHtml = isOpen ? `
      <div style="position:absolute; top:30px; left:50%; transform:translateX(-50%); z-index:20; background:#fff; border:1px solid #0b0b0b33; border-radius:8px; padding:4px; display:flex; gap:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); white-space:nowrap;">
        ${['E','P','A'].map(t => `<span onclick="setAssessmentTier('${name}','${domainKey}','${t}')" style="${gradeBtnStyle(t, t === tier, 26)}" title="${TIER_INFO[t].n}">${gradeBtnLabel(t === tier, t)}</span>`).join('')}
      </div>` : '';
    return `<td style="text-align:center; position:relative;">${badgeHtml}${popupHtml}</td>`;
  }
  function toggleAssessmentPopup(name, domainKey){
    const cellKey = name + '|' + domainKey;
    openAssessmentPopupKey = (openAssessmentPopupKey === cellKey) ? null : cellKey;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  function setAssessmentTier(name, domainKey, tier){
    const store = getAssessmentStore();
    if(!store[name]) store[name] = {};
    store[name][domainKey] = tier;
    saveAssessmentStore();
    openAssessmentPopupKey = null;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  function sampleTier(seed){ return samplePick(seed, ['E','P','A']); }

  function renderClassProgress(){
    const container = document.getElementById('classprogress-body');
    container.innerHTML = '';
    renderTeacherFilterBar(container, renderClassProgress);

    const classSRI = Math.round((72 + sampleRand('sri') * 20) * 10) / 10;
    const classCPI = Math.round((110 + sampleRand('cpi') * 60) * 10) / 10;
    const advancedPct = Math.round((18 + sampleRand('ari') * 30) * 10) / 10;
    const epConversion = Math.round((30 + sampleRand('ep') * 40) * 10) / 10;
    const paConversion = Math.round((20 + sampleRand('pa') * 30) * 10) / 10;
    const assessmentComplete = Math.round(60 + sampleRand('asmc') * 35);

    container.appendChild(mdSec('Class Progress', '<span class="reqs">ASM-02…04 · WBK-02</span>'));
    container.appendChild(mdGrid('g5', [
      mdTile('Class SRI', classSRI, '%', mdPill(mdStatusBand(classSRI).l, mdStatusBand(classSRI).c), 'SRI = (P+A) ÷ N × 100', mdMeter(classSRI)),
      mdTile('Class CPI', classCPI, '/200', mdPill(mdStatusBand(classCPI/2).l, mdStatusBand(classCPI/2).c), 'Σ Domain DSI ÷ 10', mdMeter(classCPI/2)),
      mdTile('Advanced', advancedPct, '%', mdPill('sample', 'info'), 'ARI = A ÷ N × 100', mdMeter(advancedPct)),
      mdTile('E → P conversion', epConversion, '%', mdPill('P→A ' + paConversion + '%', 'neu'), 'x ÷ E(SEM I) × 100', mdMeter(epConversion)),
      mdTile('Assessment complete', assessmentComplete, '%', mdPill(mdStatusBand(assessmentComplete).l, mdStatusBand(assessmentComplete).c), 'ASM-03 · children × domains', mdMeter(assessmentComplete))
    ]));

    container.appendChild(mdSec('Child by domain', '<span class="reqs">ASM-02…04 · WBK-02</span>'));
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th>' +
      ASSESSMENT_DOMAINS.map(d => `<th title="${esc(d.full)}">${esc(d.label)}</th>`).join('') + '<th>P+A</th><th>Band</th></tr></thead><tbody>';
    SAMPLE_STUDENTS.forEach(name => {
      const tiers = ASSESSMENT_DOMAINS.map(d => sampleTier(name + d.key + 'tier'));
      const paCount = tiers.filter(t => t !== 'E').length;
      const cells = ASSESSMENT_DOMAINS.map((d, j) => {
        const tier = tiers[j];
        return `<td><span class="pill ${TIER_INFO[tier].c}" title="${TIER_INFO[tier].n}">${tier}</span></td>`;
      }).join('');
      table += `<tr><td><b>${esc(name)}</b></td>${cells}<td>${paCount}/${ASSESSMENT_DOMAINS.length}</td><td>${mdPill(mdStatusBand(paCount/ASSESSMENT_DOMAINS.length*100).l, mdStatusBand(paCount/ASSESSMENT_DOMAINS.length*100).c)}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'B Beginner · P Proficient · A Advanced. Sample data — the real dumbbell/stack charts from the prototype need a full assessment history this app doesn\'t track yet.', wrap));
  }


  // ---------- 3. ATTENDANCE REGISTER ----------
  // Matches the real prototype's vTeacherRegister: same 4 tiles, same
  // day-by-day register table (P/A marks + totals), same caption.
  // Sample data — real streak/threshold detection needs a real
  // attendance history this app doesn't store long-term yet.
  // ---------- ATTENDANCE HUB — Check/Audit and Child-wise Record as
  // tabs. Child-wise Record moved here from Assessment Dashboard —
  // it's attendance data, so it belongs with the other attendance
  // reports, not mixed into an assessment screen.
  function renderAttendanceHub(){
    const container = document.getElementById('attendancehub-body');
    container.innerHTML = '';
    container.appendChild(renderAttendanceTabBar('attendancehub'));

    if(!ensurePupilsLoadedFor(container, renderAttendanceHub)) return;
    // Non-blocking — this screen already has an honest "(sample)"
    // fallback for months with no real data, same pattern used
    // throughout the app, so we don't block rendering on this fetch,
    // just kick it off if it hasn't happened yet and let the screen
    // self-correct via re-render once it resolves.
    if(attendanceMonthStatus[calendarYear + '-' + calendarMonth] === undefined) fetchAttendanceMonth(calendarYear, calendarMonth);

    // Check/Audit removed entirely — Child-wise Record is the only
    // content this screen shows now, so the sub-tab bar that used to
    // switch between the two isn't needed either.
    const cwContainer = document.createElement('div');
    container.appendChild(cwContainer);
    renderAttendanceRegister(cwContainer);
    renderAttendanceAcrossYear(cwContainer, calendarYear, calendarMonth);
  }

  let registerViewMode = 'month'; // 'week' or 'month'
  let classAttendanceReportsOpen = false; // backs the "See reports" toggle in Class Attendance — survives re-renders from polling
  let classAttendanceImportOpen = false; // backs the "Import previous months' attendance" toggle
  let classAttendancePickDayOpen = false; // backs the "Pick a different day" toggle
  let classAttendanceFollowUpOpen = false; // backs the "Who needs a follow-up" toggle
  let admissionsReportsOpen = false; // backs the "See reports" toggle in Admissions — survives re-renders from polling
  let monthlyEffectiveActiveTab = 'signoff'; // 'monthbymonth' | 'signoff' — backs Monthly Effective's two section tabs
  let observationImportOpen = false; // backs the "Import from a file" toggle in Classroom Observation
  let observationDownloadOpen = false; // backs the "Download report" toggle in Classroom Observation
  let workbookImportOpen = false; // backs the "Import from a file" toggle in Workbook Assessment
  let workbookDownloadOpen = false; // backs the "Download report" toggle in Workbook Assessment — only ever usable once submitted

  // month -> null|'loading'|'error:...'|{submitted, submitted_at, submitted_by_name}
  var workbookMonthSubmissionCache = {};
  function ensureWorkbookMonthSubmissionLoaded(classId, month, reRenderFn){
    if(workbookMonthSubmissionCache[month] && typeof workbookMonthSubmissionCache[month] === 'object') return true;
    if(workbookMonthSubmissionCache[month] === 'loading') return false;
    if(typeof workbookMonthSubmissionCache[month] === 'string' && workbookMonthSubmissionCache[month].startsWith('error:')) return true;
    workbookMonthSubmissionCache[month] = 'loading';
    fetch('backend/assessment/workbook/get_workbook_month_submission.php?' + new URLSearchParams({ class_id: classId, month }) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(res => res.json())
      .then(data => {
        workbookMonthSubmissionCache[month] = data.status === 'success' ? data : 'error:' + (data.message || 'Could not load submission status.');
        reRenderFn();
      })
      .catch(() => { workbookMonthSubmissionCache[month] = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }

  async function submitWorkbookMonth(){
    if(!myClassInfo.class_id) return;
    const month = currentWorkbookMonth;
    try{
      const res = await fetch('backend/assessment/workbook/submit_workbook_month.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, month })
      });
      const data = await res.json();
      if(data.status !== 'success'){ alert(data.message || 'Could not submit.'); return; }
      delete workbookMonthSubmissionCache[month]; // force a real refetch rather than assume the shape of what we just sent
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
    } catch(err){ alert('Could not reach the server.'); }
  }

  async function unsubmitWorkbookMonth(){
    if(!myClassInfo.class_id) return;
    const month = currentWorkbookMonth;
    if(!confirm('Un-submit ' + month + '\u2019s Workbook Assessment? This only changes the submitted status \u2014 none of the actual grades are affected.')) return;
    try{
      const res = await fetch('backend/assessment/workbook/unsubmit_workbook_month.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, month })
      });
      const data = await res.json();
      if(data.status !== 'success'){ alert(data.message || 'Could not undo submission.'); return; }
      delete workbookMonthSubmissionCache[month];
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
    } catch(err){ alert('Could not reach the server.'); }
  }

  // Exports every workbook's competency tally for the month as one
  // PDF, one table per book — "every workbook at once" matches the
  // same scope the submission itself covers, not just whichever book
  // happens to be selected on screen right now.
  function downloadWorkbookMonthReportPdf(books, month){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const tally = workbookCompetencyTallyCache[month] || {};
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const nameEl = document.querySelector('.user-name');
    const teacherLabel = ((nameEl && nameEl.textContent.trim()) || 'Teacher') + ' — ' + myClassInfo.class_name;

    doc.setFontSize(14);
    doc.text('Workbook Assessment — ' + month, 14, 15);
    doc.setFontSize(9);
    doc.text(teacherLabel + ' · generated ' + new Date().toLocaleDateString(), 14, 21);

    let startY = 26;
    books.forEach((book, bi) => {
      if(bi > 0) startY = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : startY) + 12;
      doc.setFontSize(12);
      doc.text(book.name, 14, startY);
      doc.autoTable({
        startY: startY + 4,
        head: [['CG', 'Competency', 'Pages', 'B Beginner', 'P Proficient', 'A Advanced']],
        body: book.competencies.map(c => {
          const t = tally[c.id] || { count_e: 0, count_p: 0, count_a: 0 };
          return [c.cg_code, c.competency_text, c.page_numbers || '—', t.count_e, t.count_p, t.count_a];
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 60] }
      });
    });

    doc.save('workbook-assessment-' + month.toLowerCase() + '-' + todayKey() + '.pdf');
  }
  let preTestImportOpen = false; // backs the "Import from a file" toggle in Pre-Test
  let preTestDownloadOpen = false; // backs the "Download report" toggle in Pre-Test
  let preTestGlanceOpen = false; // backs the "Every activity, at a glance" toggle in Pre-Test
  let registerViewTargetEl = null; // remembers where to re-render when the toggle changes
  function setRegisterViewMode(mode){
    registerViewMode = mode;
    renderAttendanceRegister(registerViewTargetEl);
  }

  function renderAttendanceRegister(targetEl){
    registerViewTargetEl = targetEl || null;
    const container = targetEl || document.getElementById('attendanceregister-body');
    container.innerHTML = '';
    if(!ensurePupilsLoadedFor(container, () => renderAttendanceRegister(registerViewTargetEl))) return;
    // Every real school weekday this month (Mon-Fri) — holidays are no
    // longer skipped here; they become their own styled column instead
    // (REG-04 wants the register to visibly account for every day, not
    // silently omit ones that turned out to be holidays). Same combined
    // holiday check the Class Attendance day-picker calendar already
    // uses (fixed calendar + teacher-declared), so the two never
    // disagree about which day was a holiday.
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const teachingDates = []; // every weekday, holiday or not
    const holidayNameByDate = {};
    for(let d = 1; d <= daysInMonth; d++){
      const dow = new Date(calendarYear, calendarMonth, d).getDay();
      if(dow === 0 || dow === 6) continue; // children: Mon-Fri only
      const dateStr = calendarYear + '-' + String(calendarMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const holidayName = complianceHolidayName(calendarYear, calendarMonth, d) || studentHolidays[dateStr];
      if(holidayName) holidayNameByDate[dateStr] = holidayName;
      teachingDates.push(dateStr);
    }
    const realTeachingDays = teachingDates.filter(d => !holidayNameByDate[d]).length; // holidays excluded from the "teaching days" count itself
    const todaysDateKeyStr = todayDateKey();
    // Real marks only, from the same attendanceRecords store Class
    // Attendance's own Enter tab and every import writes to.
    // 'present'/'absent' are real explicit marks. A weekday that is a
    // holiday is its own type, never scored either way. A weekday that
    // is NOT a holiday and has no mark is treated as absent once its
    // date has actually arrived (REG-05 — an unmarked day is a missed
    // mark, not a neutral non-event) — but a day still in the future
    // simply hasn't happened yet, so it stays unscored rather than
    // being falsely counted against anyone.
    const rows = realPupilsCache.map(p => {
      const marks = teachingDates.map(dateStr => {
        if(holidayNameByDate[dateStr]) return { type: 'holiday', name: holidayNameByDate[dateStr] };
        const status = (attendanceRecords[dateStr] || {})[p.id];
        if(status === 'present') return { type: 'present' };
        if(status === 'absent') return { type: 'absent', inferred: false };
        if(dateStr <= todaysDateKeyStr) return { type: 'absent', inferred: true }; // never marked, and the day has already happened
        return { type: 'future' };
      });
      return { name: p.name, marks };
    });
    // Genuine "has anything real ever been recorded" check — kept
    // separate from the display logic above, so the empty state below
    // still reflects reality even though every past unmarked day now
    // visually shows as Absent rather than a neutral dot.
    const anyRealMark = teachingDates.some(dateStr => {
      const rec = attendanceRecords[dateStr];
      return rec && realPupilsCache.some(p => rec[p.id]);
    });

    // The dropdown below narrows both the stat tiles AND the table to
    // one specific teaching week of the month (Mon–Fri, 5 columns each
    // — the last week may run shorter), or the whole month — same
    // underlying marks either way, just a narrower window.
    const weekSize = 5;
    const weekCount = Math.ceil(teachingDates.length / weekSize) || 1;
    const monthName = new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], {month:'long'});

    let viewStart = 0, viewDays = teachingDates.length, scopeLabel = 'this month';
    if(registerViewMode !== 'month'){
      const wi = Math.min(parseInt(registerViewMode.replace('week', ''), 10) - 1, weekCount - 1);
      viewStart = wi * weekSize;
      viewDays = Math.min(weekSize, teachingDates.length - viewStart);
      scopeLabel = `Week ${wi + 1} of ${monthName}`;
    }

    const viewDates = teachingDates.slice(viewStart, viewStart + viewDays);
    const viewRows = rows.map(r => {
      const marks = r.marks.slice(viewStart, viewStart + viewDays);
      const scoredMarks = marks.filter(m => m.type === 'present' || m.type === 'absent');
      const pres = marks.filter(m => m.type === 'present').length;
      let run = 0, maxRun = 0;
      marks.forEach(m => { run = m.type === 'absent' ? run + 1 : 0; maxRun = Math.max(maxRun, run); });
      return { name: r.name, marks, pres, absentCount: scoredMarks.length - pres, pct: scoredMarks.length ? Math.round(pres / scoredMarks.length * 100) : 0, maxRun };
    });
    const classAvg = viewRows.length ? Math.round(viewRows.reduce((a, r) => a + r.pct, 0) / viewRows.length * 10) / 10 : 0;
    const below60 = viewRows.filter(r => r.pct < 60).length;
    const threeOrMore = viewRows.filter(r => r.maxRun >= 3).length;

    const weekOptions = Array.from({length: weekCount}, (_, wi) => {
      const start = wi * weekSize, days = Math.min(weekSize, teachingDates.length - start);
      const val = 'week' + (wi + 1);
      return `<option value="${val}" ${registerViewMode === val ? 'selected' : ''}>Week ${wi + 1} of ${esc(monthName)} (${days}d)</option>`;
    }).join('');

    const secWrap = document.createElement('div');
    secWrap.className = 'sec';
    secWrap.style.cssText = 'margin-bottom:18px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;';
    secWrap.innerHTML = `
      <h2 style="margin:0;">Attendance Register — ${esc(scopeLabel)}</h2>
      <select id="registerViewModeSelect" style="${SELECT_STYLE}" onchange="setRegisterViewMode(this.value)">
        <option value="month" ${registerViewMode === 'month' ? 'selected' : ''}>Full month</option>
        ${weekOptions}
      </select>
      <button id="attRegisterDownloadBtn" style="padding:7px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;">⬇ Download report (PDF)</button>
      <div class="hr"></div>
      <span class="reqs">REG-01…04 · printable</span>
    `;
    container.appendChild(secWrap);
    const regDlBtn = secWrap.querySelector('#attRegisterDownloadBtn');
    regDlBtn.onclick = () => downloadAttendanceRegisterPdf(scopeLabel, viewDates, viewRows, todaysDateKeyStr);
    const regDlBar = document.createElement('div');
    regDlBar.setAttribute('data-dl-end', '1'); regDlBar.setAttribute('data-no-export', '1');
    regDlBar.style.cssText = 'margin:18px 0 6px; padding-top:14px; border-top:1px solid var(--border);';
    regDlBar.appendChild(regDlBtn);
    container.appendChild(regDlBar);

    if(!anyRealMark){
      container.appendChild(mdCard(null, `No attendance has been recorded for ${esc(monthName)} yet — mark it in Class Attendance, or import previous months' attendance there. Nothing is fabricated here while real data is missing.`, null));
      return;
    }

    const statGrid = mdGrid('g4', [
      mdTile('Class attendance', classAvg, '%', mdPill(mdStatusBand(classAvg).l, mdStatusBand(classAvg).c), scopeLabel + ' average', mdMeter(classAvg)),
      mdTile('Teaching days', realTeachingDays, scopeLabel, mdPill('holidays excluded', 'info'), 'LPC-11 · holiday calendar'),
      mdTile('Children below 60%', below60, 'flagged', mdPill('follow-up required', 'warn'), 'REG-06'),
      mdTile('Three or more absences', threeOrMore, 'children', mdPill('consecutive', 'crit'), 'REG-06 · early warning')
    ]);
    statGrid.style.marginBottom = '22px';
    container.appendChild(statGrid);

    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th>' +
      viewDates.map(dateStr => `<th>${dateStr === todaysDateKeyStr ? 'Today' : parseInt(dateStr.slice(8), 10)}</th>`).join('') + '<th>P</th><th>A</th><th>%</th></tr></thead><tbody>';
    viewRows.forEach(r => {
      const cells = r.marks.map(m => {
        if(m.type === 'holiday') return `<td style="text-align:center; text-decoration:line-through; color:var(--text-muted); background:#fdf1e3;" title="Holiday: ${esc(m.name)}">H</td>`;
        if(m.type === 'future') return '<td style="text-align:center;" title="Not yet happened"><span class="dim">·</span></td>';
        if(m.type === 'present') return '<td style="text-align:center;"><span class="pill good">P</span></td>';
        // Absent — a real explicit mark looks the same as always; an
        // inferred one (never marked, day already happened) is shown
        // with the same red A but a lighter tint and a tooltip, so a
        // teacher can still tell the two apart on close inspection
        // without the table needing a whole separate legend entry.
        return m.inferred
          ? `<td style="text-align:center;" title="Not marked — counted as absent"><span class="pill crit" style="opacity:.65;">A*</span></td>`
          : '<td style="text-align:center;"><span class="pill crit">A</span></td>';
      }).join('');
      table += `<tr><td style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(r.name)}')"><b>${esc(r.name)}</b></td>${cells}<td>${r.pres}</td><td>${r.absentCount}</td><td><b>${r.pct}</b></td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Laid out as an education officer would expect: school, class, teacher, month and totals in the header when printed (REG-04). H is a holiday (struck through, never scored). A day that was never marked is now counted as absent once it\'s actually happened (shown as A*, slightly faded, on hover) — a day still in the future stays a dot (·), since it hasn\'t happened yet. Tap a child\'s name for her full record.', wrap));

    // --- Attendance trends: weekly + monthly, as two chart cards side
    // by side at 50% width each — same shared component Check
    // Attendance uses, so this styling is consistent app-wide instead
    // of a one-off full-width list just for this screen.
    // computeWeeklyAttendanceData (shared with Check Attendance) still
    // expects the older 'P'/'A'/'·' string-mark shape — converting to
    // that here, rather than changing the shared function, keeps Check
    // Attendance's own unrelated rows format working unchanged.
    const rowsForTrend = rows.map(r => ({ name: r.name, marks: r.marks.map(m => m.type === 'present' ? 'P' : (m.type === 'absent' ? 'A' : '·')) }));
    renderAttendanceTrendCards(container, computeWeeklyAttendanceData(rowsForTrend, realTeachingDays), computeMonthlyAttendanceData(calendarYear));
  }

  // Exports exactly what's currently shown in the register table above
  // — one row per child, one column per real weekday in view (H for
  // holiday, P/A/A* otherwise), plus the same P/A/% totals. Which
  // exact fields belong in this export can still change — this is a
  // straightforward starting point (the visible table, verbatim),
  // not a fixed final spec.
  function downloadAttendanceRegisterPdf(scopeLabel, viewDates, viewRows, todaysDateKeyStr){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const nameEl = document.querySelector('.user-name');
    const teacherLabel = ((nameEl && nameEl.textContent.trim()) || 'Teacher') + ' — ' + myClassInfo.class_name;

    doc.setFontSize(14);
    doc.text('Attendance Register — ' + scopeLabel, 14, 15);
    doc.setFontSize(9);
    doc.text(teacherLabel + ' · generated ' + new Date().toLocaleDateString(), 14, 21);

    const dayLabels = viewDates.map(dateStr => dateStr === todaysDateKeyStr ? 'Today' : String(parseInt(dateStr.slice(8), 10)));
    const markLabel = (m) => m.type === 'holiday' ? 'H' : m.type === 'future' ? '·' : m.type === 'present' ? 'P' : (m.inferred ? 'A*' : 'A');

    doc.autoTable({
      startY: 26,
      head: [['Child', ...dayLabels, 'P', 'A', '%']],
      body: viewRows.map(r => [r.name, ...r.marks.map(markLabel), r.pres, r.absentCount, r.pct + '%']),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [37, 99, 60] }
    });

    doc.save('attendance-register-' + scopeLabel.replace(/\s+/g, '-').toLowerCase() + '-' + todayKey() + '.pdf');
  }

  // ---------- 4. MY COMPLIANCE ----------
  // Matches vTeacherCompliance: the same ten compliance dimensions
  // shown separately (never combined into one score), plus data
  // freshness / training record / open supervisor actions cards.
  // The real chBars bar-chart widget isn't reproduced — shown as tiles
  // + a simple list instead, same numbers, simpler chrome.
  const COMPLIANCE_DIMENSIONS = ['Daily plan', 'TLM plan', 'Attendance register', 'Assessment', 'Home activity', 'PTM prep', 'Monthly Effective', 'Photo evidence', 'Materials logged', 'Teacher attendance'];
  /* =========================================================
     MY ATTENDANCE & PLAN COMPLIANCE — matches the reference: two
     denominators (student days vs teacher working days), 5 tiles,
     and a real day-by-day calendar for the selected month.

     "My attendance" and "On Saturdays" are computed from the SAME
     real teacher-attendance data the compact calendar already uses
     (getMonthAttendanceRecords) — not a separate dataset. "Plans
     submitted" and "Congruent with the week" are computed from the
     real dailyPlanEntries data, aggregated across every week that
     falls in the selected month. "Sessions confirmed (with evidence)"
     is the one honest gap: this app tracks photo UPLOADS (see Section
     6) but not a queryable "does this session have evidence" flag on
     the client, so it's approximated from the same plan data with a
     caption saying so — not invented as if it were separately real.
     ========================================================= */

  // Same fixed-holiday convention as ptm-view.js's calendar, kept
  // local here rather than importing it, since this file doesn't
  // otherwise depend on ptm-view.js's internals. Dates are the same
  // kind of representative placeholders the reference itself uses
  // (its own Independence Day/Raksha Bandhan dates don't match the
  // real calendar either) — not claimed as the real 2026-27 calendar.
  function complianceHolidayName(year, month, day){
    const key = month + '-' + day;
    const holidays = { '0-26':'Republic Day', '4-1':'Maharashtra Day', '7-15':'Independence Day', '9-2':'Gandhi Jayanti' };
    return holidays[key] || null;
  }

  function isLastSaturday(year, month, day, daysInMonth){
    const d = new Date(year, month, day);
    if(d.getDay() !== 6) return false;
    for(let later = day + 7; later <= daysInMonth; later += 7) return false;
    return true;
  }

  function teacherWorkingDaysInMonth(year, month){
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let count = 0;
    for(let d = 1; d <= daysInMonth; d++){
      const dow = new Date(year, month, d).getDay();
      if(complianceHolidayName(year, month, d)) continue;
      if(dow === 0) continue; // Sunday
      if(dow === 6 && isLastSaturday(year, month, d, daysInMonth)) continue; // last Saturday off
      count++; // Mon-Fri, and Saturdays except the last
    }
    return count;
  }

  // Academic year month order — Jun through Apr, skipping May (summer
  // break) — shared by every "month by month" report in this file so
  // they can never drift out of sync with each other.
  const ACADEMIC_MONTHS = [5,6,7,8,9,10,11,0,1,2,3];

  function studentDaysInMonth(year, month){
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let count = 0;
    for(let d = 1; d <= daysInMonth; d++){
      const dow = new Date(year, month, d).getDay();
      if(complianceHolidayName(year, month, d)) continue;
      if(dow === 0 || dow === 6) continue; // children: Mon-Fri only
      count++;
    }
    return count;
  }

  // Shared by the single-month tiles and the "Across the year" table below —
  // one formula, computed for whichever (year, month) is asked for, so the
  // two views can never drift apart.
  function computeComplianceStatsForMonth(year, month){
    const records = getMonthAttendanceRecords(year, month);
    const allEntries = Object.entries(records);
    const weekdayEntries = allEntries.filter(([dateStr]) => {
      const dow = new Date(dateStr + 'T00:00:00').getDay();
      return dow >= 1 && dow <= 6;
    });
    const presentCount = weekdayEntries.filter(([, r]) => r.status === 'present').length;
    // Approved leave (written as 'leave' by decide_leave.php once both
    // the supervisor and principal approve) is neither present nor
    // absent — it's left out of the denominator, not counted against her.
    const leaveCount = weekdayEntries.filter(([, r]) => r.status === 'leave').length;
    const markedCount = weekdayEntries.length - leaveCount;
    const myAttendancePct = markedCount ? Math.round(presentCount / markedCount * 1000) / 10 : 0;

    const saturdayEntries = allEntries.filter(([dateStr]) => new Date(dateStr + 'T00:00:00').getDay() === 6);
    const saturdayPresent = saturdayEntries.filter(([, r]) => r.status === 'present').length;
    const saturdayScored = saturdayEntries.filter(([, r]) => r.status !== 'leave').length;
    const saturdayPct = saturdayScored ? Math.round(saturdayPresent / saturdayScored * 1000) / 10 : 0;

        const weeksInMonth = WEEKS.filter(w => {
      const start = parseWeekStartDate(w.dates);
      return start.getFullYear() === year && start.getMonth() === month;
    });
    // Fire a background fetch for any week in this month that hasn't
    // actually been loaded from the server yet — without this, a week
    // never opened in My Day/Daily Plan reads as having zero plans here,
    // even when real ones exist in the database.
    if(typeof ensureDailyPlanEntriesLoaded === 'function'){
      weeksInMonth.forEach(w => {
        if(!dailyPlanEntriesLoadedWeeks[w.w]) ensureDailyPlanEntriesLoaded(false, w.w);
      });
    }
    let totalDueDays = 0, daysWithAnyPlan = 0, totalSessionSlots = 0, plannedSlots = 0;
    weeksInMonth.forEach(w => {
      ['mon','tue','wed','thu','fri'].forEach(dk => {
        totalDueDays++;
        const planned = countPlannedSessionsForDay(w.w, dk);
        if(planned > 0) daysWithAnyPlan++;
        totalSessionSlots += DOMAINS.length;
        plannedSlots += planned;
      });
    });
    const plansSubmittedPct = totalDueDays ? Math.round(daysWithAnyPlan / totalDueDays * 1000) / 10 : 0;
    const congruentPct = totalSessionSlots ? Math.round(plannedSlots / totalSessionSlots * 1000) / 10 : 0;

    // "Unmarked counts as absent" version — divides by every real
    // working day this month (teacherWorkingDaysInMonth), not just the
    // days she actually marked. A day she never marked at all is
    // treated exactly like an explicit absence here.
    const teacherWorkingDaysTotal = teacherWorkingDaysInMonth(year, month);
    const teacherDaysExLeave = Math.max(teacherWorkingDaysTotal - leaveCount, 0);
    const teacherClassWidePct = teacherDaysExLeave ? Math.round(presentCount / teacherDaysExLeave * 1000) / 10 : 0;

    return { myAttendancePct, saturdayPct, plansSubmittedPct, congruentPct, sessionsConfirmedPct: congruentPct,
      presentCount, markedCount, leaveCount, teacherClassWidePct, teacherWorkingDaysTotal, // raw counts, exposed so multi-month aggregates (e.g. computeTermAttendancePct) can weight correctly rather than averaging percentages
      hasAttendance: markedCount > 0, hasSaturday: saturdayEntries.length > 0,
      hasPlans: totalDueDays > 0, hasCongruency: totalSessionSlots > 0 };
  }

  // Term-to-date attendance % for the "My attendance (term)" tile at the
  // top of the dashboard (teacher.html's static header, not My Day's own
  // mdGrid tile). Weighted by raw present/marked counts across every
  // academic month so far this year — NOT an average of monthly
  // percentages, which would over-weight low-attendance months.
  // Same (single-year, ACADEMIC_MONTHS-up-to-now) convention already
  // used by the compliance calendar's month tabs.
  function computeTermAttendancePct(){
    const now = new Date();
    const curIdx = ACADEMIC_MONTHS.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS;
    let presentSum = 0, markedSum = 0;
    monthsSoFar.forEach(m => {
      const stats = computeComplianceStatsForMonth(now.getFullYear(), m);
      presentSum += stats.presentCount;
      markedSum += stats.markedCount;
    });
    return markedSum ? Math.round(presentSum / markedSum * 1000) / 10 : null; // null = nothing marked yet anywhere this term
  }

  function updateTermAttendanceTile(){
    const el = document.getElementById('myAttendanceTermValue');
    if(!el) return;
    const pct = computeTermAttendancePct();
    el.textContent = pct === null ? '—' : pct + '%';
  }

  // Small colored percentage bar, matching the reference design's
  // green/amber/red month-by-month table. Reuses the same var(--success)
  // and var(--danger) tokens already used for pills elsewhere in this file.
  // hasData=false renders a neutral dashed "no data" cell instead of a
  // false-alarm red 0 — a month nothing was recorded for isn't the same
  // as a month of genuine non-compliance.
  function pctBar(pct, good, warn, hasData){
    if(hasData === false){
      return `<div style="background:var(--bg); color:var(--text-muted); font-weight:600; font-size:12.5px; border:1px dashed var(--border); border-radius:6px; padding:4px 0; text-align:center; min-width:40px;" title="No data recorded yet">–</div>`;
    }
    good = good || 85; warn = warn || 70;
    const color = pct >= good ? 'var(--success)' : pct >= warn ? '#EE8F35' : 'var(--danger,#c8433f)';
    return `<div style="background:${color}; color:#fff; font-weight:600; font-size:12.5px; border-radius:6px; padding:5px 0; text-align:center; min-width:40px;">${pct}</div>`;
  }

  let complianceCalTargetEl = null; // remembers where to re-render when the month tabs inside this change
  let complianceCalActiveTab = 'workingdays'; // 'workingdays' | 'acrossyear' — backs My Compliance's section tabs

  function renderComplianceCal(targetEl){
    complianceCalTargetEl = targetEl || null;
    const container = targetEl || document.getElementById('compliancecal-body');
    container.innerHTML = '';
    if(!targetEl) renderTeacherFilterBar(container, renderComplianceCal);

    const year = calendarYear, month = calendarMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = new Date(year, month, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const teacherDays = teacherWorkingDaysInMonth(year, month);
    const studentDays = studentDaysInMonth(year, month);

    // Month picker — same academic year (Jun–Apr) convention used
    // elsewhere in this app. Selecting one jumps the shared calendar
    // state to that month and re-renders.
    const monthTabs = document.createElement('div');
    monthTabs.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin:14px 0;';
    const academicMonths = ACADEMIC_MONTHS;
    monthTabs.innerHTML = academicMonths.map(m => {
      const label = new Date(2000, m, 1).toLocaleDateString([], {month:'short'});
      const active = m === month;
      const sDays = studentDaysInMonth(year, m);
      const tDays = teacherWorkingDaysInMonth(year, m);
      return `<button onclick="calendarMonth=${m}; renderComplianceCal(complianceCalTargetEl);" style="padding:6px 12px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:12px; white-space:nowrap;">${label} · ${sDays}/${tDays}</button>`;
    }).join('');
    container.appendChild(monthTabs);

    const explainer = document.createElement('p');
    explainer.className = 'cap';
    explainer.style.marginBottom = '14px';
    explainer.innerHTML = `CAL-04/13 · each month shows <b>student days / teacher working days</b>. Children attend Monday to Friday; teachers also work Saturdays, less the last Saturday of the month. Curriculum and child attendance divide by the first; teacher attendance and planning compliance by the second.`;
    container.appendChild(explainer);

    // --- Real teacher attendance + plan compliance for this month ---
    const records = getMonthAttendanceRecords(year, month);
    const { myAttendancePct, saturdayPct, plansSubmittedPct, congruentPct } = computeComplianceStatsForMonth(year, month);

    // --- Plain-count summary (present/absent/not yet marked) for this
    // month, alongside the percentage tiles above — same Mon-Sat
    // "teacher working days" denominator as CAL-13, just expressed as
    // raw counts instead of a percentage.
    const markedThisMonth = Object.entries(records).filter(([dateStr]) => {
      const dow = new Date(dateStr + 'T00:00:00').getDay();
      return dow >= 1 && dow <= 6; // Mon-Sat, matches teacherWorkingDaysInMonth
    });
    const presentDays = markedThisMonth.filter(([, r]) => r.status === 'present').length;
    const absentDays = markedThisMonth.filter(([, r]) => r.status === 'absent').length;
    const markedDays = markedThisMonth.length;
    const notMarkedDays = Math.max(teacherDays - markedDays, 0);

    const statGrid5 = mdGrid('g5', [
      // % present of the days actually MARKED — and how many working days are marked,
      // so 1 day marked never reads as "100% of 25 working days".
      mdTile('My attendance', markedDays ? Math.round(presentDays / markedDays * 100) : '—',
        markedDays ? '% present · ' + markedDays + ' of ' + teacherDays + ' working days marked' : 'No data available — no day marked yet',
        markedDays ? (notMarkedDays ? mdPill(notMarkedDays + ' day' + (notMarkedDays === 1 ? '' : 's') + ' not marked', 'warn') : mdPill('All days marked', 'good')) : mdPill('No data available', 'neu'),
        'CAL-13', mdMeter(markedDays ? Math.round(presentDays / markedDays * 100) : 0)),
      mdTile('On Saturdays', saturdayPct, '% of teacher-only days',
        mdPill(mdStatusBand(saturdayPct, 85, 60).l, mdStatusBand(saturdayPct, 85, 60).c), 'GAP-48', mdMeter(saturdayPct)),
      mdTile('Plans submitted', plansSubmittedPct, '% of days due',
        mdPill(mdStatusBand(plansSubmittedPct).l, mdStatusBand(plansSubmittedPct).c), 'PLN-17', mdMeter(plansSubmittedPct)),
      mdTile('Congruent with the week', congruentPct, '% of sessions',
        mdPill(mdStatusBand(congruentPct).l, mdStatusBand(congruentPct).c), 'PLN-16', mdMeter(congruentPct)),
      (() => {
        // Real: sessions marked done on My Day, in this month's weeks.
        const wks = typeof complianceWeeksInMonth === 'function' ? complianceWeeksInMonth(year, month) : [];
        const due = wks.length * 5 * (typeof DOMAINS !== 'undefined' ? DOMAINS.length : 0);
        const done = typeof practiceForWeek === 'function' ? wks.reduce((a, w) => a + practiceForWeek(w.w).delivered, 0) : 0;
        return done
          ? mdTile('Sessions confirmed', Math.round(done / due * 100), '% · ' + done + ' of ' + due + ' sessions marked done', mdPill(mdStatusBand(Math.round(done / due * 100)).l, mdStatusBand(Math.round(done / due * 100)).c), 'EVD-03', mdMeter(Math.round(done / due * 100)))
          : mdTile('Sessions confirmed', '—', 'No data available — no session marked done yet', mdPill('No data available', 'neu'), 'EVD-03');
      })()
    ]);
    statGrid5.style.marginBottom = '22px';
    container.appendChild(statGrid5);

    const denomCard = mdCard('Two denominators on this page',
      `My attendance is the share of the days you have <b>marked</b> on which you were present, with how many of this month's <b>${teacherDays} teacher working days</b> (which include the Saturdays with no children) are marked so far — unmarked days are not counted as present or absent. Child attendance and session delivery divide by <b>${studentDays} student days</b>. "Sessions confirmed" counts the sessions marked done on My Day in this month's weeks.`, null);
    denomCard.style.marginBottom = '22px';
    container.appendChild(denomCard);

        // ---- Section tabs — My Working Days and Across the year used to
    // sit stacked on one long page; splitting them keeps each section
    // short and lets it stand on its own, same tab pattern as My Day
    // and Monthly Effective.
    const complianceTabBar = document.createElement('div');
    complianceTabBar.style.cssText = 'display:flex; gap:8px; margin:4px 0 20px; flex-wrap:wrap;';
    [
      { key: 'workingdays', label: '📅 My Working Days' },
      { key: 'acrossyear', label: '📊 Across the Year' }
    ].forEach(t => {
      const active = t.key === complianceCalActiveTab;
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.cssText = `padding:9px 18px; border-radius:20px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:13px; font-weight:600; cursor:pointer;`;
      btn.onclick = () => { complianceCalActiveTab = t.key; renderComplianceCal(complianceCalTargetEl); };
      complianceTabBar.appendChild(btn);
    });
    container.appendChild(complianceTabBar);

    if(complianceCalActiveTab === 'workingdays'){
      renderMyWorkingDaysCalendar(container, year, month, monthName, records, daysInMonth, teacherDays, presentDays, absentDays, markedDays, notMarkedDays);
    } else {
      renderComplianceAcrossYear(container, year, month, academicMonths);
    }
  }

  // ---- My Working Days — the day-by-day calendar and its summary,
  // split out of renderComplianceCal into its own function. Now
  // wrapped in its own card (calCard), matching the card boundary
  // "Across the year" already has below it — previously the grid sat
  // directly on the page background with no card around it. ----
  function renderMyWorkingDaysCalendar(container, year, month, monthName, records, daysInMonth, teacherDays, presentDays, absentDays, markedDays, notMarkedDays){
    const markedPct = teacherDays ? Math.round(markedDays / teacherDays * 100) : 0;

    const summaryBody = document.createElement('div');
    summaryBody.className = 'report-table-wrap';
    summaryBody.innerHTML = `
      <table class="report-table">
        <tbody>
          <tr><td>Present</td><td><b>${presentDays}</b> ${presentDays === 1 ? 'day' : 'days'} this month</td></tr>
          <tr><td>Absent</td><td><b>${absentDays}</b> ${absentDays === 1 ? 'day' : 'days'} this month</td></tr>
          <tr><td>On approved leave</td><td><b>${Object.values(records).filter(r => r.status === 'leave').length}</b> working days this month</td></tr>
          <tr><td>Not yet marked</td><td><b>${notMarkedDays}</b> of ${teacherDays} working days</td></tr>
          <tr><td>Marked so far</td><td><b>${markedDays} / ${teacherDays}</b> working days (${markedPct}%)</td></tr>
        </tbody>
      </table>`;

    container.appendChild(mdSec('My working month', '<span class="reqs">TCH-09 · CAL-11</span>'));

    // Today's own attendance — moved here from My Day's "My attendance"
    // tile, since it belongs with the teacher's working-days record.
    // Always TODAY, whichever month is being viewed below; the % is
    // this calendar month's present ÷ marked days, same figure My Day
    // used to show.
    const nowForMine = new Date();
    const myTodayRecord = getTodayAttendanceRecord();
    const myMonthStats = computeComplianceStatsForMonth(nowForMine.getFullYear(), nowForMine.getMonth());
    const myTodayStatus = myTodayRecord ? myTodayRecord.status : null;
    const myTodayTime = (myTodayRecord && myTodayRecord.markedAt) ? new Date(myTodayRecord.markedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
    const myTodayCard = document.createElement('div');
    myTodayCard.className = 'att-summary' + (myTodayStatus === 'present' ? '' : myTodayStatus === 'absent' ? ' is-absent' : ' is-unmarked');
    myTodayCard.innerHTML = `
      <div class="att-summary-head">
        <div>
          <div class="att-summary-k">My attendance today</div>
          <div class="att-summary-v">${myTodayStatus === 'present' ? 'Present' : myTodayStatus === 'absent' ? 'Absent' : 'Not marked'}</div>
        </div>
        ${myTodayStatus === 'present' ? mdPill('Marked present' + (myTodayTime ? ' ' + myTodayTime : ''), 'good')
          : myTodayStatus === 'absent' ? mdPill('Marked absent', 'crit')
          : mdPill('Not marked yet', 'warn')}
      </div>
      <div class="att-summary-legend">
        <span>This month <b>${myMonthStats.hasAttendance ? myMonthStats.myAttendancePct + '%' : '—'}</b> of marked days</span>
        <span>Gate at first class start</span>
      </div>`;
    container.appendChild(myTodayCard);

    // Apply for leave + every request and its approval status —
    // js/render/teacher-leave.js.
    // If teacher.html doesn't load js/render/teacher-leave.js, load it here
    // on first use, so the section appears either way.
    if(typeof renderMyLeaveSection === 'function'){
      renderMyLeaveSection(container);
    } else {
      const leaveSlot = document.createElement('div');
      leaveSlot.innerHTML = '<p class="cap" style="margin-top:22px;">Loading your leave section…</p>';
      container.appendChild(leaveSlot);
      const renderInto = () => {
        if(typeof renderMyLeaveSection !== 'function'){
          leaveSlot.innerHTML = '<p class="cap" style="margin-top:22px; color:var(--crit,#d03b3b);">Could not load js/render/teacher-leave.js — check the file is in the js/render folder.</p>';
          return;
        }
        leaveSlot.innerHTML = '';
        renderMyLeaveSection(leaveSlot);
      };
      let tag = document.getElementById('teacherLeaveScript');
      if(!tag){
        tag = document.createElement('script');
        tag.id = 'teacherLeaveScript';
        tag.src = 'js/render/teacher-leave.js?v=' + Date.now();
        document.head.appendChild(tag);
      }
      tag.addEventListener('load', renderInto);
      tag.addEventListener('error', renderInto);
    }

    const calCard = document.createElement('div');
    calCard.className = 'card';
    calCard.style.padding = '22px';

    const dbdHeader = document.createElement('div');
    dbdHeader.innerHTML = `<p style="font-weight:600; margin:4px 0 2px;">${esc(monthName)} — day by day</p><p class="cap" style="margin-bottom:10px;">A blue Saturday is a working day with no children. The last Saturday is my monthly holiday and is not counted.</p>`;
    calCard.appendChild(dbdHeader);

    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // convert Sun=0 to Mon-first layout
    const weekLabels = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:grid; grid-template-columns:repeat(7,1fr); gap:8px; margin-bottom:6px; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase;';
    headerRow.innerHTML = weekLabels.map(l => `<div>${l}</div>`).join('');
    calCard.appendChild(headerRow);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(7,1fr); gap:8px;';
    for(let i = 0; i < startWeekday; i++) grid.appendChild(document.createElement('div'));

    for(let d = 1; d <= daysInMonth; d++){
      const dateObj = new Date(year, month, d);
      const dow = dateObj.getDay();
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayShort = dateObj.toLocaleDateString([], {weekday:'short'});
      const holidayName = complianceHolidayName(year, month, d);
      const record = records[dateStr];
      const cell = document.createElement('div');

      let bg = '#fff', pillHtml = '', bodyHtml = '';
      if(holidayName){
        bg = '#fdf1e3';
        bodyHtml = esc(holidayName);
      } else if(dow === 0){
        bg = '#f4f4f2';
        bodyHtml = 'Sunday';
      } else if(dow === 6 && isLastSaturday(year, month, d, daysInMonth)){
        bg = '#e8f1fb';
        bodyHtml = 'Last Saturday — monthly teacher holiday';
      } else if(dow === 6){
        bg = '#e8f1fb';
        bodyHtml = 'Saturday — teachers only, no children';
        pillHtml = record ? `<span class="pill ${record.status === 'present' ? 'good' : record.status === 'leave' ? 'info' : 'crit'}" style="margin-top:6px; display:inline-block;">${record.status === 'present' ? 'Present' : record.status === 'leave' ? 'On leave' : 'Absent'}</span>` : '';
      } else {
        pillHtml = record ? `<span class="pill ${record.status === 'present' ? 'good' : record.status === 'leave' ? 'info' : 'crit'}" style="display:inline-block;">${record.status === 'present' ? 'Present' : record.status === 'leave' ? 'On leave' : 'Absent'}</span>` : '';
      }

      cell.style.cssText = `background:${bg}; border:1px solid var(--border); border-radius:8px; padding:10px; min-height:70px; font-size:12px;`;
      cell.innerHTML = `<div style="font-weight:600; margin-bottom:4px;">${d} ${dayShort}</div><div class="dim" style="margin-bottom:4px;">${bodyHtml}</div>${pillHtml}`;
      grid.appendChild(cell);
    }
    calCard.appendChild(grid);

    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex; flex-wrap:wrap; gap:16px; margin-top:12px; font-size:12px; color:var(--text-muted);';
    legend.innerHTML = `
      <span><i style="display:inline-block; width:10px; height:10px; background:#fff; border:1px solid var(--border); margin-right:5px; border-radius:2px;"></i>Children in school</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#e8f1fb; margin-right:5px; border-radius:2px;"></i>Saturday — teachers only, no children</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#f4f4f2; margin-right:5px; border-radius:2px;"></i>Sunday or monthly teacher holiday</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#fdf1e3; margin-right:5px; border-radius:2px;"></i>Declared holiday</span>
    `;
    calCard.appendChild(legend);
    container.appendChild(calCard);

    const summaryCard = mdCard(monthName + ' at a glance',
      'CAL-13 · counted against the same ' + teacherDays + ' teacher working days used above.',
      summaryBody);
    summaryCard.style.marginTop = '22px';
    container.appendChild(summaryCard);
  }

  // ---- Across the year — every month so far this academic year, side
  // by side, split out of renderComplianceCal into its own function. ----
  function renderComplianceAcrossYear(container, year, month, academicMonths){
    container.appendChild(mdSec('Across the year', '<span class="reqs">REP-10/11</span>'));

    const yearCard = document.createElement('div');
    yearCard.className = 'card';
    yearCard.style.padding = '22px';

    const now = new Date();
    const curIdx = academicMonths.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? academicMonths.slice(0, curIdx + 1) : academicMonths.slice(0, academicMonths.indexOf(month) + 1);

    let yearTable = `
      <h3 style="margin:0 0 6px;">Attendance and compliance month by month</h3>
      <p class="cap" style="margin:0 0 18px;">Every column names its denominator in the header, because two of the five use a different one.</p>
      <div class="report-table-wrap"><table class="report-table">
        <thead><tr>
          <th>Month</th><th>Student days</th><th>Teacher days</th>
          <th>My attendance % (teacher days)</th><th>Saturdays %</th>
          <th>Plans submitted % (student days)</th><th>Congruency %</th><th>Sessions confirmed %</th>
        </tr></thead><tbody>`;

    monthsSoFar.forEach(m => {
      const label = new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'});
      const sDays = studentDaysInMonth(year, m);
      const tDays = teacherWorkingDaysInMonth(year, m);
      const s = computeComplianceStatsForMonth(year, m);
      yearTable += `<tr>
        <td><b>${esc(label)}</b></td>
        <td>${sDays}</td>
        <td>${tDays}</td>
        <td>${pctBar(s.myAttendancePct, undefined, undefined, s.hasAttendance)}</td>
        <td>${pctBar(s.saturdayPct, 85, 60, s.hasSaturday)}</td>
        <td>${pctBar(s.plansSubmittedPct, undefined, undefined, s.hasPlans)}</td>
        <td>${pctBar(s.congruentPct, undefined, undefined, s.hasCongruency)}</td>
        <td>${pctBar(s.sessionsConfirmedPct, undefined, undefined, s.hasCongruency)}</td>
      </tr>`;
    });
    yearTable += '</tbody></table></div>';
    yearCard.innerHTML = yearTable;
    container.appendChild(yearCard);

    const yearNote = document.createElement('p');
    yearNote.className = 'cap';
    yearNote.style.cssText = 'margin-top:12px; border-left:3px solid var(--primary); padding-left:12px;';
    yearNote.innerHTML = `<b>What this page is not.</b> It is not a score. TCM-12 forbids these five being added together, and they are shown to the teacher first — before the supervisor sees them — because a compliance figure someone discovers on somebody else's screen is a figure they will start managing rather than acting on.`;
    container.appendChild(yearNote);
  }

  // ============================================================
  // ATTENDANCE DASHBOARD (Reports) — class-wide roll, attendance and
  // effective-strength reporting, month by month, plus a per-child
  // breakdown for the selected month. Built on the same real
  // attendanceRecords the Class Attendance → Attendance screen writes
  // to — now backed by the real daily_attendance table (fetched via
  // fetchAttendanceMonth, merged into the same in-memory object every
  // read site already uses) instead of localStorage, and the roster
  // itself reads the real pupils table (realPupilsCache) rather than
  // the old SAMPLE_STUDENTS placeholder.
  // ============================================================

  function countMarkedDatesInMonth(year, month){
    return Object.keys(attendanceRecords).filter(dateStr => {
      const d = new Date(dateStr + 'T00:00:00');
      if(isNaN(d) || d.getFullYear() !== year || d.getMonth() !== month) return false;
      const dow = d.getDay();
      if(dow === 0 || dow === 6) return false; // roll/attendance is weekday-only (children: Mon-Fri)
      const rec = attendanceRecords[dateStr];
      return rec && Object.keys(rec).length > 0;
    }).sort();
  }

  // Children actually on roll as of a given date — admitted on or
  // before it. Shared by the attendance dashboard's month-level roll
  // count and the admissions chart below, so both agree with the
  // day-level register filter above instead of three places computing
  // "who's enrolled" three different ways.
  function studentsOnRollAsOf(dateStr){
    if(!Array.isArray(realPupilsCache)) return [];
    return realPupilsCache.filter(p => !p.admitted_date || p.admitted_date <= dateStr).map(p => p.name);
  }

/* ===== teacher-part-05.js ===== */
/* =========================================================================
   teacher-part-05.js — part 5 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  
  function computeAttendanceDashboardStats(year, month){
    // Fire the real fetch for this month if it hasn't been loaded yet —
    // without this, a past month's real attendance was never asked
    // for, hasData came back false, and the table below silently
    // substituted fabricated "(sample)" numbers instead of the real
    // ones sitting in the database.
    if(attendanceMonthStatus[year + '-' + month] === undefined) fetchAttendanceMonth(year, month);
    if(!Array.isArray(realPupilsCache)){
      return { roll: 0, studentDays: studentDaysInMonth(year, month), daysMarked: 0, attendancePct: 0,
        effectiveStrength: 0, below70: 0, hasData: false, perChildMarked: {}, perChildPresent: {} };
    }
    const monthEndStr = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    const onRollThisMonth = realPupilsCache.filter(p => !p.admitted_date || p.admitted_date <= monthEndStr);
    const roll = onRollThisMonth.length;
    const studentDays = studentDaysInMonth(year, month);
    const markedDates = countMarkedDatesInMonth(year, month);
    const daysMarked = markedDates.length;

    let totalPresentSlots = 0, totalPossibleSlots = 0;
    // Counted by real pupil id internally (so two same-named children
    // are never confused mid-count), then attributed to her name for
    // the output shape every consumer of this function already expects.
    // Known remaining limitation: if two pupils share an exact name,
    // their totals still land in the same named bucket below — the
    // counting itself is correct, but the two would need a fuller
    // id-keyed rewrite of every consumer to display as separate rows.
    const perChildMarked = {}, perChildPresent = {};
    onRollThisMonth.forEach(p => { perChildMarked[p.name] = 0; perChildPresent[p.name] = 0; });

    markedDates.forEach(dateStr => {
      const rec = attendanceRecords[dateStr];
      onRollThisMonth.forEach(p => {
        if(rec[p.id]){
          totalPossibleSlots++;
          perChildMarked[p.name]++;
          if(rec[p.id] === 'present'){ totalPresentSlots++; perChildPresent[p.name]++; }
        }
      });
    });

    const attendancePct = totalPossibleSlots ? Math.round(totalPresentSlots / totalPossibleSlots * 1000) / 10 : 0;
    const effectiveStrength = daysMarked ? Math.round(totalPresentSlots / daysMarked * 10) / 10 : 0;
    const below70 = onRollThisMonth.filter(p => {
      if(!perChildMarked[p.name]) return false;
      return (perChildPresent[p.name] / perChildMarked[p.name] * 100) < 70;
    }).length;

    // Class-wide collective attendance — the whole class's real
    // present-count divided by every real working day this month
    // times the roll, whether or not that day was ever marked. An
    // unmarked day contributes zero present children here, unlike
    // attendancePct above (which only ever divides by marked slots).
    // This is what "class strength × working days" actually means.
    const classWidePresentSlots = totalPresentSlots;
    const classWidePossibleSlots = studentDays * roll;
    const classWidePct = classWidePossibleSlots ? Math.round(classWidePresentSlots / classWidePossibleSlots * 1000) / 10 : 0;

    return { roll, studentDays, daysMarked, attendancePct, effectiveStrength, below70,
      classWidePct, classWidePresentSlots, classWidePossibleSlots,
      hasData: daysMarked > 0, perChildMarked, perChildPresent };
  }

  function renderAttendanceDashboard(){
    const container = document.getElementById('attendancedashboard-body');
    container.innerHTML = '';

    if(!ensurePupilsLoadedFor(container, renderAttendanceDashboard)) return;
    const year = calendarYear, month = calendarMonth;
    // Same non-blocking pattern as renderAttendanceHub above.
    if(attendanceMonthStatus[year + '-' + month] === undefined) fetchAttendanceMonth(year, month);

    const monthName = new Date(year, month, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const teachingDays = studentDaysInMonth(year, month); // matches CAL-04/13's "student days" convention

    const heading = document.createElement('div');
    heading.style.cssText = 'display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:4px;';
    heading.innerHTML = `<h1 style="margin:0;">Attendance dashboard</h1>
      <span class="reqs">REP-08/09 · REG</span>
      <span class="cap" style="margin-left:auto;">Teacher · ${esc(monthName)} · ${teachingDays} teaching days · Term 1, 2026</span>`;
    container.appendChild(heading);

    // --- Month picker — dropdown (compact, easier on narrow screens)
    // alongside the existing pill row. Both control the same
    // calendarMonth state, so picking one keeps the other in sync. ---
    const pickerRow = document.createElement('div');
    pickerRow.style.cssText = 'display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:14px 0;';
    const monthDropdown = document.createElement('select');
    monthDropdown.style.cssText = 'padding:7px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; background:#fff;';
    monthDropdown.innerHTML = ACADEMIC_MONTHS.map(m => {
      const label = new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'});
      return `<option value="${m}"${m === month ? ' selected' : ''}>${esc(label)}</option>`;
    }).join('');
    monthDropdown.onchange = () => { calendarMonth = parseInt(monthDropdown.value, 10); renderAttendanceDashboard(); };
    pickerRow.appendChild(monthDropdown);

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇ Download report (PDF)';
    downloadBtn.style.cssText = 'padding:8px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
    downloadBtn.onclick = downloadAttendanceDashboardPdf;
    container.appendChild(pickerRow);
    const dashDlBar = document.createElement('div');
    dashDlBar.setAttribute('data-dl-end', '1'); dashDlBar.setAttribute('data-no-export', '1');
    dashDlBar.style.cssText = 'margin:18px 0 6px; padding-top:14px; border-top:1px solid var(--border);';
    dashDlBar.appendChild(downloadBtn);
    container.appendChild(dashDlBar);

    const monthTabs = document.createElement('div');
    monthTabs.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin:0 0 14px;';
    monthTabs.innerHTML = ACADEMIC_MONTHS.map(m => {
      const label = new Date(2000, m, 1).toLocaleDateString([], {month:'short'});
      const active = m === month;
      const sDays = studentDaysInMonth(year, m);
      const marked = countMarkedDatesInMonth(year, m).length;
      return `<button onclick="calendarMonth=${m}; renderAttendanceDashboard();" style="padding:6px 12px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:12px; white-space:nowrap;">${label} · ${marked}/${sDays}</button>`;
    }).join('');
    container.appendChild(monthTabs);

    const explainer = document.createElement('p');
    explainer.className = 'cap';
    explainer.style.marginBottom = '14px';
    explainer.innerHTML = `CAL-04/13 · each month shows <b>days marked / student days</b>. A day only counts as "marked" once at least one child has been marked present or absent that day.`;
    container.appendChild(explainer);

    // --- Stat cards ---
    const now = new Date();
    const curIdx = ACADEMIC_MONTHS.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS.slice(0, ACADEMIC_MONTHS.indexOf(month) + 1);
    const monthStats = monthsSoFar.map(m => ({ m, s: computeAttendanceDashboardStats(year, m) }));
    const thisMonth = computeAttendanceDashboardStats(year, month);

    let ytdPresent = 0, ytdPossible = 0, monthsWithData = 0;
    monthStats.forEach(({s}) => {
      if(s.hasData){
        monthsWithData++;
        ytdPresent += Math.round(s.attendancePct * s.daysMarked * assessmentPupilNames().length / 100);
        ytdPossible += s.daysMarked * assessmentPupilNames().length;
      }
    });
    const ytdPct = ytdPossible ? Math.round(ytdPresent / ytdPossible * 1000) / 10 : 0;
    const daysUnmarked = Math.max(0, thisMonth.studentDays - thisMonth.daysMarked);

    const statCards = document.createElement('div');
    statCards.className = 'stat-grid';
    statCards.style.marginBottom = '22px';
    statCards.innerHTML = `
      <div class="stat-card">
        <p class="label">This month</p>
        <p class="value notranslate">${thisMonth.hasData ? thisMonth.attendancePct : '—'}${thisMonth.hasData ? '% present' : ''}</p>
        ${thisMonth.hasData ? mdPill(mdStatusBand(thisMonth.attendancePct).l, mdStatusBand(thisMonth.attendancePct).c) : mdPill('No data yet', 'neu')}
        <p class="cap" style="margin-top:6px;">REG-05</p>
      </div>
      <div class="stat-card">
        <p class="label">Year to date</p>
        <p class="value notranslate">${monthsWithData ? ytdPct : '—'}${monthsWithData ? '% across ' + monthsWithData + ' month' + (monthsWithData === 1 ? '' : 's') : ''}</p>
        ${monthsWithData ? mdPill(mdStatusBand(ytdPct).l, mdStatusBand(ytdPct).c) : mdPill('No data yet', 'neu')}
        <p class="cap" style="margin-top:6px;">REP-08</p>
      </div>
      <div class="stat-card">
        <p class="label">Effective strength</p>
        <p class="value notranslate">${thisMonth.hasData ? thisMonth.effectiveStrength : '—'}${thisMonth.hasData ? ' children' : ''}</p>
        ${thisMonth.hasData ? mdPill('of ' + thisMonth.roll + ' on roll', 'info') : mdPill('No data yet', 'neu')}
        <p class="cap" style="margin-top:6px;">ADB-14</p>
      </div>
      <div class="stat-card">
        <p class="label">Below 70%</p>
        <p class="value notranslate" style="${thisMonth.below70 > 0 ? 'color:#c8433f;' : ''}">${thisMonth.hasData ? thisMonth.below70 : '—'}${thisMonth.hasData ? ' child' + (thisMonth.below70 === 1 ? '' : 'ren') + ' this month' : ''}</p>
        ${thisMonth.hasData ? mdPill(thisMonth.below70 > 0 ? 'Follow up' : 'None', thisMonth.below70 > 0 ? 'warn' : 'good') : mdPill('No data yet', 'neu')}
        <p class="cap" style="margin-top:6px;">REG-06</p>
      </div>
      <div class="stat-card">
        <p class="label">Days unmarked</p>
        <p class="value notranslate">${daysUnmarked}</p>
        ${mdPill(daysUnmarked > 0 ? 'Catch up' : 'Up to date', daysUnmarked > 0 ? 'warn' : 'good')}
        <p class="cap" style="margin-top:6px;">of ${thisMonth.studentDays} student days</p>
      </div>`;
    container.appendChild(statCards);

    // Attendance Register (day-by-day P/A grid) moved to Class
    // Attendance — attendance reporting belongs with attendance, not a
    // separate Reports group. See renderAttendanceBody().

    renderAttendanceAcrossYear(container, year, month);
  }

  // Shared: roll/attendance/effective-strength across the year, a trend
  // line, and a child-wise breakdown for one month. Used by both the
  // standalone Attendance Dashboard report (Reports group) and the
  // Child-wise Record tab under Class Attendance — one real
  // implementation instead of two copies that can drift apart.
  // Representative sample figures for a month with nothing real
  // recorded — same seeded-random convention used elsewhere in this
  // app (e.g. Monthly Effective's month-by-month table), so numbers
  // are stable across reloads rather than jumping around, and clearly
  // tagged as sample wherever they're shown.
  // (Removed: invented attendance for months with no marks.)
  function sampleAttendanceStatsForMonth(year, month){ return computeAttendanceDashboardStats(year, month); }

  function renderAttendanceAcrossYear(container, year, month){
    const monthName = new Date(year, month, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const now = new Date();
    const curIdx = ACADEMIC_MONTHS.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS.slice(0, ACADEMIC_MONTHS.indexOf(month) + 1);
    const monthStats = monthsSoFar.map(m => {
      const real = computeAttendanceDashboardStats(year, m);
      return { m, s: real }; // real marks only — a month with none says "No data available"
    });
    const thisMonthReal = computeAttendanceDashboardStats(year, month);
    const thisMonth = thisMonthReal;

    // --- Month by month table ---
    container.appendChild(mdSec('Month by month', ''));
    const mbmHead = document.createElement('div');
    mbmHead.innerHTML = `<p style="font-weight:600; margin:4px 0 2px;">Roll, attendance and effective strength</p>
      <p class="cap" style="margin-bottom:14px;">Attendance is real students marked present, divided by real marks taken. Months with nothing marked show "No data available" — nothing is estimated.</p>`;
    container.appendChild(mbmHead);

    let mbmTable = `<div class="report-table-wrap"><table class="report-table">
      <thead><tr><th>Month</th><th>Student days</th><th>On roll</th><th>Days marked</th>
      <th>Attendance %</th><th>Effective strength</th><th>Below 70%</th></tr></thead><tbody>`;
    monthStats.forEach(({m, s}) => {
      const label = new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'});
      if(!s.hasData){ mbmTable += `<tr><td><b>${esc(label)}</b></td><td colspan="6" class="dim" style="text-align:left;">No data available</td></tr>`; return; }
      mbmTable += `<tr>
        <td><b>${esc(label)}</b></td>
        <td>${s.studentDays}</td>
        <td>${s.roll}</td>
        <td>${s.daysMarked}</td>
        <td>${pctBar(s.attendancePct, undefined, undefined, true)}</td>
        <td>${s.effectiveStrength}</td>
        <td>${s.below70}</td>
      </tr>`;
    });
    mbmTable += '</tbody></table></div>';
    const mbmCard = document.createElement('div');
    mbmCard.className = 'card'; mbmCard.style.padding = '22px';
    mbmCard.innerHTML = mbmTable;
    container.appendChild(mbmCard);

    // --- Analysis — a short auto-generated summary, not just numbers.
    // Same monthStats already computed above; nothing here recomputes
    // anything, it just reads what's already there. ---
    const analysisCard = document.createElement('div');
    analysisCard.className = 'card'; analysisCard.style.cssText = 'padding:18px 22px; margin-top:14px; background:var(--bg);';
    analysisCard.innerHTML = `<h4 style="margin:0 0 6px; font-size:13px;">Analysis</h4><p style="margin:0; font-size:13.5px; line-height:1.6;">${esc(buildAttendanceAnalysisText(monthStats.filter(x => x.s.hasData)))}</p>`;
    container.appendChild(analysisCard);

    // --- Two-column: trend line + child-wise bars ---
    const twoCol = document.createElement('div');
    twoCol.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:22px;';
    twoCol.style.gridTemplateColumns = window.innerWidth < 900 ? '1fr' : '1fr 1fr';

    // Trend line — every month now has a real-or-sample value, so it
    // always plots once two months exist in the academic year so far.
    const plotted = monthStats.filter(x => x.s.hasData);
    const trendPanel = document.createElement('div');
    trendPanel.className = 'card'; trendPanel.style.padding = '22px';
    let trendSvg;
    if(plotted.length >= 2){
      const w = 460, h = 200, padL = 40, padR = 16, padT = 16, padB = 26;
      const vals = plotted.map(({s}) => s.attendancePct);
      const vMin = Math.max(0, Math.min(...vals) - 4), vMax = Math.min(100, Math.max(...vals) + 4);
      const xStep = (w - padL - padR) / (plotted.length - 1);
      const xy = plotted.map(({s}, i) => {
        const x = padL + i * xStep;
        const y = padT + (h - padT - padB) * (1 - (s.attendancePct - vMin) / Math.max(1, (vMax - vMin)));
        return {x, y, pct: s.attendancePct};
      });
      const pathD = xy.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
      const points = xy.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="var(--primary)"></circle><text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" font-size="11" text-anchor="middle" fill="var(--text)">${p.pct}</text>`).join('');
      const labels = plotted.map(({m}, i) => `<text x="${xy[i].x.toFixed(1)}" y="${h - 6}" font-size="10.5" text-anchor="middle" fill="var(--text-muted)">${new Date(2000, m, 1).toLocaleDateString([], {month:'short'})}</text>`).join('');
      trendSvg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="var(--border)"></line>
        <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="var(--border)"></line>
        <path d="${pathD}" fill="none" stroke="var(--primary)" stroke-width="2"></path>
        ${points}${labels}
      </svg>`;
    } else {
      trendSvg = `<p class="cap">Needs at least two months to plot a trend — only ${plotted.length} so far.</p>`;
    }
    trendPanel.innerHTML = `<h4 style="margin:0 0 4px;">Attendance across the year</h4>${trendSvg}`;
    twoCol.appendChild(trendPanel);

    // Child-wise, this month
    const childPanel = document.createElement('div');
    childPanel.className = 'card'; childPanel.style.padding = '22px';
    const childRows = assessmentPupilNames().map(name => {
      const marked = thisMonth.perChildMarked[name] || 0;
      const present = thisMonth.perChildPresent[name] || 0;
      const pct = marked ? present / marked * 100 : 0;
      const color = !marked ? 'var(--border)' : pct >= 85 ? 'var(--success)' : pct >= 70 ? '#EE8F35' : 'var(--danger,#c8433f)';
      const widthPct = marked ? Math.round(pct) : 0;
      return `<div class="hbar-row">
        <div class="hbar-row-label">${esc(name)}</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${widthPct}%; background:${color};"></div></div>
        <div class="hbar-count">${marked ? present + '/' + marked : 'no marks'}</div>
      </div>`;
    }).join('');
    childPanel.innerHTML = `<h4 style="margin:0 0 4px;">Child-wise, this month</h4>
      <p class="cap" style="margin:0 0 16px;">REP-09 · every child against her own denominator.${thisMonth.hasData ? '' : ' No data available — nothing marked yet for ' + esc(monthName) + '.'}</p>
      ${childRows}`;
    twoCol.appendChild(childPanel);

    container.appendChild(twoCol);

    // --- Effective strength across the year — same SVG-line convention
    // as the attendance trend above, second chart requested alongside
    // it. Own row, not squeezed into the two-column layout above, so
    // neither chart gets cramped. ---
    const effPanel = document.createElement('div');
    effPanel.className = 'card'; effPanel.style.cssText = 'padding:22px; margin-top:20px;';
    let effSvg;
    if(plotted.length >= 2){
      const w = 940, h = 200, padL = 40, padR = 16, padT = 16, padB = 26;
      const vals = plotted.map(({s}) => s.effectiveStrength);
      const vMin = Math.max(0, Math.min(...vals) - 1), vMax = Math.max(...vals) + 1;
      const xStep = (w - padL - padR) / (plotted.length - 1);
      const xy = plotted.map(({s}, i) => {
        const x = padL + i * xStep;
        const y = padT + (h - padT - padB) * (1 - (s.effectiveStrength - vMin) / Math.max(1, (vMax - vMin)));
        return {x, y, v: s.effectiveStrength};
      });
      const pathD = xy.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
      const points = xy.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#5c7cfa"></circle><text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" font-size="11" text-anchor="middle" fill="var(--text)">${p.v}</text>`).join('');
      const labels = plotted.map(({m}, i) => `<text x="${xy[i].x.toFixed(1)}" y="${h - 6}" font-size="10.5" text-anchor="middle" fill="var(--text-muted)">${new Date(2000, m, 1).toLocaleDateString([], {month:'short'})}</text>`).join('');
      effSvg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="var(--border)"></line>
        <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="var(--border)"></line>
        <path d="${pathD}" fill="none" stroke="#5c7cfa" stroke-width="2"></path>
        ${points}${labels}
      </svg>`;
    } else {
      effSvg = `<p class="cap">Needs at least two months to plot a trend — only ${plotted.length} so far.</p>`;
    }
    effPanel.innerHTML = `<h4 style="margin:0 0 4px;">Effective strength across the year</h4>${effSvg}`;
    container.appendChild(effPanel);
  }

  // Extracted out of renderAttendanceAcrossYear — admissions reporting
  // belongs with Admissions, not a separate Reports group. Sourced
  // directly from admissionRecords (the same store Class Attendance's
  // day-by-day register filters against), not a separate guess at
  // enrollment. A child's attendance is only ever counted from her own
  // admittedDate onward — enforced structurally by the register
  // filter, not by a separate formula here.
  //
  // Uses the FULL academic year (all of ACADEMIC_MONTHS), not just
  // monthsSoFar — unlike attendance/effective-strength, a future
  // month genuinely has zero admissions so far, which is real
  // information (not a gap needing a sample fallback), so there's no
  // reason to hide months that haven't happened yet.
  function renderAdmissionsAcrossYear(container, year){
    const fullYearMonths = ACADEMIC_MONTHS.slice();
    const admissionCountsAll = buildMonthlyAdmissionCounts(year, fullYearMonths, false);
    const admissionCountsMidYear = buildMonthlyAdmissionCounts(year, fullYearMonths, true);
    const totalEverAdmitted = Array.isArray(realPupilsCache) ? realPupilsCache.length : 0;
    const termStartDateForAnalysis = totalEverAdmitted ? realPupilsCache.reduce((min, p) => p.admitted_date < min ? p.admitted_date : min, realPupilsCache[0].admitted_date) : null;
    const startOfYearCount = totalEverAdmitted ? realPupilsCache.filter(p => p.admitted_date === termStartDateForAnalysis).length : 0;
    const midYearCount = totalEverAdmitted - startOfYearCount;
    let peakMonthLabel = '—', peakMonthCount = 0;
    const midYearEntries = fullYearMonths.map(m => [m, admissionCountsMidYear[m] || 0]).filter(([, c]) => c > 0);
    if(midYearEntries.length){
      const peak = midYearEntries.reduce((a, b) => b[1] > a[1] ? b : a);
      peakMonthLabel = new Date(2000, peak[0], 1).toLocaleDateString([], {month:'long'});
      peakMonthCount = peak[1];
    }
    // Cumulative on-roll count as of the end of each month — this is
    // the actual "trend of admission": a running total, not new joins
    // per month (that's what the bar chart already shows).
    const cumulativeOnRoll = fullYearMonths.map(m => {
      const monthEndStr = new Date(year, m + 1, 0).toISOString().slice(0, 10);
      return studentsOnRollAsOf(monthEndStr).length;
    });

    container.appendChild(mdSec('Admissions across the year', '<span class="reqs">ADB-11…16</span>'));
    const admStatGrid = mdGrid('g4', [
      mdTile('Admitted so far', totalEverAdmitted, 'children this year', mdPill('Jr KG', 'neu'), 'ADB-11'),
      mdTile('At term start', startOfYearCount, 'in June', mdPill(Math.round(startOfYearCount/totalEverAdmitted*100) + '% of the class', 'neu'), 'ADB-11'),
      mdTile('Mid-year admissions', midYearCount, 'after June', midYearCount ? mdPill('rolling admissions', 'info') : mdPill('None', 'good'), 'ADB-12'),
      mdTile('Peak mid-year month', peakMonthCount || '—', peakMonthCount ? 'in ' + peakMonthLabel : 'no mid-year admissions yet', peakMonthCount ? mdPill(peakMonthLabel, 'info') : mdPill('N/A', 'neu'), 'ADB-12')
    ]);
    admStatGrid.style.marginBottom = '18px';
    container.appendChild(admStatGrid);

    const admPanel = document.createElement('div');
    admPanel.className = 'card'; admPanel.style.cssText = 'padding:22px;';
    admPanel.innerHTML = `<h4 style="margin:0 0 4px;">New admissions by month</h4><p class="cap" style="margin:0 0 10px;">Full academic year, June through April — months not yet reached correctly show 0.</p>${buildAdmissionsBarSvg(fullYearMonths, admissionCountsAll)}`;
    container.appendChild(admPanel);

    const admTrendPanel = document.createElement('div');
    admTrendPanel.className = 'card'; admTrendPanel.style.cssText = 'padding:22px; margin-top:16px;';
    admTrendPanel.innerHTML = `<h4 style="margin:0 0 4px;">Total on roll — trend across the year</h4><p class="cap" style="margin:0 0 10px;">Running total, not new joins per month — the class-size line, step by step, as each admission lands.</p>${buildTrendLineSvg(fullYearMonths, cumulativeOnRoll, '#8b5cf6')}`;
    container.appendChild(admTrendPanel);

    const admAnalysisCard = document.createElement('div');
    admAnalysisCard.className = 'card'; admAnalysisCard.style.cssText = 'padding:18px 22px; margin-top:14px; background:var(--bg);';
    admAnalysisCard.innerHTML = `<h4 style="margin:0 0 6px; font-size:13px;">Analysis</h4><p style="margin:0; font-size:13.5px; line-height:1.6;">${esc(buildAdmissionsAnalysisText(totalEverAdmitted, startOfYearCount, midYearCount, peakMonthLabel, peakMonthCount))}</p>`;
    container.appendChild(admAnalysisCard);
  }

  // Counts NEW admissions per month (not cumulative on-roll) for the
  // academic year so far. midYearOnly=true excludes the term-start
  // bulk (all dated the same June admittedDate) so a genuine mid-year
  // admissions spike doesn't get drowned out by the June baseline —
  // used only for the "peak mid-year month" analysis line below, not
  // for the chart itself, which shows the full honest picture.
  function buildMonthlyAdmissionCounts(year, monthsSoFar, midYearOnly){
    const counts = {};
    monthsSoFar.forEach(m => counts[m] = 0);
    if(!Array.isArray(realPupilsCache) || !realPupilsCache.length) return counts;
    // "Term start" cohort = whoever shares the earliest admitted_date
    // in the roster, same convention Admissions uses — no separate
    // stored flag needed.
    const termStartDate = realPupilsCache.reduce((min, p) => p.admitted_date < min ? p.admitted_date : min, realPupilsCache[0].admitted_date);
    realPupilsCache.forEach(p => {
      if(!p.admitted_date) return;
      if(midYearOnly && p.admitted_date === termStartDate) return;
      const d = new Date(p.admitted_date + 'T00:00:00');
      if(isNaN(d) || d.getFullYear() !== year) return;
      const m = d.getMonth();
      if(counts[m] !== undefined) counts[m]++;
    });
    return counts;
  }

  // Generic line-chart builder — same visual convention as the
  // attendance% and effective-strength trend lines above, factored out
  // since this is now the third place drawing one (here: cumulative
  // on-roll count, a running total rather than a per-month figure).
  function buildTrendLineSvg(months, values, color){
    if(months.length < 2){
      return `<p class="cap">Needs at least two months to plot a trend — only ${months.length} so far.</p>`;
    }
    const w = 940, h = 200, padL = 40, padR = 16, padT = 16, padB = 26;
    const vMin = Math.max(0, Math.min(...values) - 1), vMax = Math.max(...values) + 1;
    const xStep = (w - padL - padR) / (months.length - 1);
    const xy = values.map((v, i) => {
      const x = padL + i * xStep;
      const y = padT + (h - padT - padB) * (1 - (v - vMin) / Math.max(1, (vMax - vMin)));
      return {x, y, v};
    });
    const pathD = xy.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    const points = xy.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${color}"></circle><text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" font-size="11" text-anchor="middle" fill="var(--text)">${p.v}</text>`).join('');
    const labels = months.map((m, i) => `<text x="${xy[i].x.toFixed(1)}" y="${h - 6}" font-size="10.5" text-anchor="middle" fill="var(--text-muted)">${new Date(2000, m, 1).toLocaleDateString([], {month:'short'})}</text>`).join('');
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="var(--border)"></line>
      <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="var(--border)"></line>
      <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2"></path>
      ${points}${labels}
    </svg>`;
  }

  function buildAdmissionsBarSvg(monthsSoFar, admissionCounts){
    const w = 940, h = 200, padL = 40, padR = 16, padT = 20, padB = 34;
    const max = Math.max(...monthsSoFar.map(m => admissionCounts[m] || 0), 1);
    const gap = (w - padL - padR) / monthsSoFar.length;
    const barW = gap * 0.6;
    let bars = '';
    monthsSoFar.forEach((m, i) => {
      const v = admissionCounts[m] || 0;
      const barH = (h - padT - padB) * (v / max);
      const x = padL + i * gap + (gap - barW) / 2;
      const y = h - padB - barH;
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="#e08e2b"></rect>`;
      bars += `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" font-size="11" text-anchor="middle" fill="var(--text)">${v}</text>`;
      bars += `<text x="${(x + barW / 2).toFixed(1)}" y="${h - padB + 14}" font-size="10.5" text-anchor="middle" fill="var(--text-muted)">${new Date(2000, m, 1).toLocaleDateString([], {month:'short'})}</text>`;
    });
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="var(--border)"></line>
      <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="var(--border)"></line>
      ${bars}
    </svg>`;
  }

  function buildAdmissionsAnalysisText(totalEverAdmitted, startOfYearCount, midYearCount, peakMonthLabel, peakMonthCount){
    const midYearNote = peakMonthCount > 0
      ? ` Of the ${midYearCount} admitted after term start, ${peakMonthLabel} saw the most — ${peakMonthCount} child${peakMonthCount === 1 ? '' : 'ren'}.`
      : (midYearCount > 0 ? ` ${midYearCount} admitted after term start, spread evenly with no single peak month.` : '');
    return `${totalEverAdmitted} children have been admitted so far this year — ${startOfYearCount} at term start and ${midYearCount} mid-year.${midYearNote}`
      + (midYearCount > 0 ? ' Each mid-year admission\'s attendance is calculated only from her own admission date onward — the day-by-day register above no longer lets her be marked (or counted) on dates before she actually joined, so early months are never averaged against days she wasn\'t yet enrolled for.' : '');
  }

  // Auto-generated written summary — average, best/worst month, count
  // of child-months below the 70% benchmark, and a first-half-vs-
  // second-half trend direction once there's enough data to say
  // anything meaningful about it (4+ months).
  function buildAttendanceAnalysisText(monthStats){
    if(!monthStats.length) return 'Not enough data yet to analyse.';
    const monthLabel = (m) => new Date(2000, m, 1).toLocaleDateString([], {month:'long'});
    const avgPct = Math.round(monthStats.reduce((sum, x) => sum + x.s.attendancePct, 0) / monthStats.length * 10) / 10;
    const best = monthStats.reduce((a, b) => b.s.attendancePct > a.s.attendancePct ? b : a);
    const worst = monthStats.reduce((a, b) => b.s.attendancePct < a.s.attendancePct ? b : a);
    const totalBelow70 = monthStats.reduce((sum, x) => sum + x.s.below70, 0);

    let trendNote = '';
    if(monthStats.length >= 4){
      const half = Math.floor(monthStats.length / 2);
      const firstHalfAvg = monthStats.slice(0, half).reduce((s, x) => s + x.s.attendancePct, 0) / half;
      const secondHalfAvg = monthStats.slice(half).reduce((s, x) => s + x.s.attendancePct, 0) / (monthStats.length - half);
      const diff = Math.round((secondHalfAvg - firstHalfAvg) * 10) / 10;
      trendNote = diff > 1 ? ` Attendance has been improving overall (+${diff} points comparing the first half of the year so far to the second).`
        : diff < -1 ? ` Attendance has been declining overall (${diff} points comparing the first half of the year so far to the second).`
        : ' Attendance has stayed roughly stable across the year so far.';
    }

    return `Average attendance across ${monthStats.length} month${monthStats.length === 1 ? '' : 's'} is ${avgPct}%. ${monthLabel(best.m)} was the strongest at ${best.s.attendancePct}%, while ${monthLabel(worst.m)} was the weakest at ${worst.s.attendancePct}%.`
      + (totalBelow70 > 0 ? ` ${totalBelow70} child-month${totalBelow70 === 1 ? '' : 's'} fell below the 70% benchmark and may need follow-up.` : ' No child fell below the 70% benchmark in any month.')
      + trendNote;
  }

  // Draws a simple bar chart to an offscreen canvas — used only for
  // the PDF export below. Deliberately separate from the on-screen SVG
  // trend lines above: jsPDF embeds raster images, not SVG, so this
  // avoids converting working SVG output and just draws fresh instead.
  function drawBarChartCanvas(labels, values, opts){
    const { width = 700, height = 260, color = '#25993c', suffix = '' } = opts || {};
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
    const padL = 40, padR = 16, padT = 20, padB = 34;
    const max = Math.max(...values, 1);
    const gap = (width - padL - padR) / values.length;
    const barW = gap * 0.6;
    ctx.strokeStyle = '#ccc';
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, height - padB); ctx.lineTo(width - padR, height - padB); ctx.stroke();
    values.forEach((v, i) => {
      const barH = (height - padT - padB) * (v / max);
      const x = padL + i * gap + (gap - barW) / 2;
      const y = height - padB - barH;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, barH);
      ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(v) + suffix, x + barW / 2, y - 4);
      ctx.fillText(labels[i], x + barW / 2, height - padB + 14);
    });
    return canvas;
  }

  // Same as drawBarChartCanvas above, but a connected line instead of
  // bars — used for the cumulative on-roll trend in the PDF, mirroring
  // buildTrendLineSvg's on-screen look.
  function drawLineChartCanvas(labels, values, opts){
    const { width = 940, height = 260, color = '#8b5cf6' } = opts || {};
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
    const padL = 40, padR = 16, padT = 20, padB = 34;
    const vMin = Math.max(0, Math.min(...values) - 1), vMax = Math.max(...values) + 1;
    const xStep = (width - padL - padR) / (values.length - 1 || 1);
    ctx.strokeStyle = '#ccc';
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, height - padB); ctx.lineTo(width - padR, height - padB); ctx.stroke();
    const pts = values.map((v, i) => {
      const x = padL + i * xStep;
      const y = padT + (height - padT - padB) * (1 - (v - vMin) / Math.max(1, (vMax - vMin)));
      return {x, y, v};
    });
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => { if(i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    pts.forEach((p, i) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(p.v), p.x, p.y - 8);
      ctx.fillText(labels[i], p.x, height - padB + 14);
    });
    return canvas;
  }

  function downloadAttendanceDashboardPdf(){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const year = calendarYear;
    const now = new Date();
    const curIdx = ACADEMIC_MONTHS.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS.slice(0, ACADEMIC_MONTHS.indexOf(calendarMonth) + 1);
    const monthStats = monthsSoFar.map(m => {
      const real = computeAttendanceDashboardStats(year, m);
      return { m, s: real }; // real marks only — a month with none says "No data available"
    });

    const labels = monthStats.map(({m}) => new Date(2000, m, 1).toLocaleDateString([], {month:'short'}));
    const attCanvas = drawBarChartCanvas(labels, monthStats.map(({s}) => s.attendancePct), { color: '#25993c', suffix: '%' });
    const effCanvas = drawBarChartCanvas(labels, monthStats.map(({s}) => s.effectiveStrength), { color: '#5c7cfa' });
    const admissionCountsAll = buildMonthlyAdmissionCounts(year, ACADEMIC_MONTHS, false);
    const admissionCountsMidYear = buildMonthlyAdmissionCounts(year, ACADEMIC_MONTHS, true);
    const admLabels = ACADEMIC_MONTHS.map(m => new Date(2000, m, 1).toLocaleDateString([], {month:'short'}));
    const admCanvas = drawBarChartCanvas(admLabels, ACADEMIC_MONTHS.map(m => admissionCountsAll[m] || 0), { color: '#e08e2b', width: 940 });
    const cumulativeOnRoll = ACADEMIC_MONTHS.map(m => {
      const monthEndStr = new Date(year, m + 1, 0).toISOString().slice(0, 10);
      return studentsOnRollAsOf(monthEndStr).length;
    });
    const admTrendCanvas = drawLineChartCanvas(admLabels, cumulativeOnRoll, { color: '#8b5cf6', width: 940 });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const nameEl = document.querySelector('.user-name');
    const teacherLabel = ((nameEl && nameEl.textContent.trim()) || 'Teacher') + ' — ' + myClassInfo.class_name;

    doc.setFontSize(14);
    doc.text('Attendance Dashboard — ' + year, 14, 15);
    doc.setFontSize(9);
    doc.text(teacherLabel + ' · generated ' + new Date().toLocaleDateString(), 14, 21);

    doc.setFontSize(10);
    const analysisLines = doc.splitTextToSize(buildAttendanceAnalysisText(monthStats.filter(x => x.s.hasData)), 265);
    doc.text(analysisLines, 14, 30);

    let y = 30 + analysisLines.length * 5 + 8;
    doc.setFontSize(11);
    doc.text('Attendance % by month', 14, y);
    doc.text('Effective strength by month', 150, y);
    doc.addImage(attCanvas.toDataURL('image/png'), 'PNG', 14, y + 4, 130, 48);
    doc.addImage(effCanvas.toDataURL('image/png'), 'PNG', 150, y + 4, 130, 48);

    const totalEverAdmitted = Array.isArray(realPupilsCache) ? realPupilsCache.length : 0;
    const termStartDateForAnalysis = totalEverAdmitted ? realPupilsCache.reduce((min, p) => p.admitted_date < min ? p.admitted_date : min, realPupilsCache[0].admitted_date) : null;
    const startOfYearCount = totalEverAdmitted ? realPupilsCache.filter(p => p.admitted_date === termStartDateForAnalysis).length : 0;
    const midYearCount = totalEverAdmitted - startOfYearCount;
    let peakMonthLabel = '—', peakMonthCount = 0;
    const midYearEntries = ACADEMIC_MONTHS.map(m => [m, admissionCountsMidYear[m] || 0]).filter(([, c]) => c > 0);
    if(midYearEntries.length){
      const peak = midYearEntries.reduce((a, b) => b[1] > a[1] ? b : a);
      peakMonthLabel = new Date(2000, peak[0], 1).toLocaleDateString([], {month:'long'});
      peakMonthCount = peak[1];
    }

    // Own page — bar chart + trend line + analysis together is enough
    // to crowd out the first page, and both charts deserve full width.
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Admissions — ' + year, 14, 15);
    doc.setFontSize(11);
    doc.text('New admissions by month (full academic year)', 14, 28);
    doc.addImage(admCanvas.toDataURL('image/png'), 'PNG', 14, 32, 266, 56);
    doc.text('Total on roll — trend across the year', 14, 96);
    doc.addImage(admTrendCanvas.toDataURL('image/png'), 'PNG', 14, 100, 266, 56);
    doc.setFontSize(9);
    const admAnalysisLines = doc.splitTextToSize(buildAdmissionsAnalysisText(totalEverAdmitted, startOfYearCount, midYearCount, peakMonthLabel, peakMonthCount), 265);
    doc.text(admAnalysisLines, 14, 164);

    doc.autoTable({
      startY: 164 + admAnalysisLines.length * 4 + 8,
      head: [['Month', 'Student days', 'On roll', 'Days marked', 'Attendance %', 'Effective strength', 'Below 70%']],
      body: monthStats.map(({m, s}) => s.hasData ? [
        new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'}),
        s.studentDays, s.roll, s.daysMarked, s.attendancePct + '%', s.effectiveStrength, s.below70
      ] : [new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'}), 'No data available', '', '', '', '', '']),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });

    doc.save('attendance-dashboard-' + year + '-' + todayKey() + '.pdf');
  }

  // ---------------------------------------------------------------
  // FLAGS & NOTIFICATIONS — what a supervisor has noted, what needs a
  // reply, and what's gone further up. Three named states (Observation
  // / Concern / For escalation), each with its own reply expectation
  // and visibility, matching the real SOP distinction: an escalation
  // is a person's decision, never an automatic threshold (ESC-04).
  // No real supervisor-side app exists yet to raise these for real, so
  // this starts genuinely empty rather than showing fabricated flags
  // against a teacher who's done nothing wrong — "Nothing raised this
  // month" is the honest default, not a placeholder to fill later.
  // ---------------------------------------------------------------
  const FLAG_STATES = {
    observation: { label: 'Observation', color: 'info', meaning: 'Noted at a visit. No action required, no reply expected. It exists so a pattern can be seen later.', reply: 'No', seenBy: 'Supervisor and me' },
    concern: { label: 'Concern', color: 'warn', meaning: 'Needs a response from the person flagged, within the stated days. Visible to the next level up but not actioned by them.', reply: 'Within 7 days', seenBy: 'Supervisor, me, programme lead (read only)' },
    escalation: { label: 'For escalation', color: 'crit', meaning: 'Raised to the next level with a named owner and a date. Applied by a person, never by a threshold — ESC-04.', reply: 'Within 3 days', seenBy: 'Supervisor, me, programme lead — with an owner and a date' }
  };

  // Real, database-backed now (teacher_flags table, backend/flags/).
  // A supervisor raises a flag from supervisor.html; the teacher sees it
  // here and replies. Nothing is kept in localStorage any more.
  // Shape kept the same as before so every reader of flagsRecords
  // (this screen and My Compliance's "Open actions") works unchanged.
  const flagsRecords = []; // {id, dateRaised, state, text, dueDate, status:'open'|'replied', replyText, replyDate, raisedByName}
  var flagsFetchStatus = 'idle'; // 'idle' | 'loading' | 'loaded' | 'error:<message>'

  async function fetchFlagsRecords(){
    flagsFetchStatus = 'loading';
    try{
      const res = await fetch('backend/flags/get_my_flags.php' + window.location.search);
      const data = await res.json();
      if(data.status === 'success'){
        flagsRecords.length = 0;
        (data.flags || []).forEach(f => flagsRecords.push({
          id: String(f.id),
          dateRaised: f.date_raised,
          state: f.state,
          text: f.text,
          dueDate: f.due_date || null,
          status: f.status,
          replyText: f.reply_text || '',
          replyDate: f.replied_at ? String(f.replied_at).slice(0, 10) : '',
          raisedByName: f.raised_by_name || ''
        }));
        flagsFetchStatus = 'loaded';
      } else {
        flagsFetchStatus = 'error:' + (data.message || 'Could not load flags.');
      }
    } catch(err){
      flagsFetchStatus = 'error:Could not reach the server.';
    }
    const flagsBody = document.getElementById('flagsnotifications-body');
    if(flagsBody && !flagsBody.classList.contains('hidden')) renderFlagsNotifications();
    const compBody = document.getElementById('mycompliance-body');
    if(compBody && !compBody.classList.contains('hidden') && typeof renderMyCompliance === 'function') renderMyCompliance();
  }
  function ensureFlagsLoaded(){
    if(flagsFetchStatus === 'idle') fetchFlagsRecords();
  }
  // Kept so any older call site doesn't throw — flags are saved on the server now.
  function saveFlagsRecords(){}

  async function submitFlagReply(flagId){
    const input = document.getElementById('flagReplyInput-' + flagId);
    if(!input) return;
    const text = (input.value || '').trim();
    if(!text){ input.focus(); return; }
    const btn = input.parentElement ? input.parentElement.querySelector('button') : null;
    if(btn){ btn.disabled = true; btn.textContent = 'Sending…'; }
    try{
      const res = await fetch('backend/flags/reply_flag.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ flag_id: parseInt(flagId, 10), reply_text: text })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        alert(data.message || 'Could not send the reply.');
        if(btn){ btn.disabled = false; btn.textContent = 'Send reply'; }
        return;
      }
      await fetchFlagsRecords(); // real saved row back from the server
    } catch(err){
      alert('Could not reach the server.');
      if(btn){ btn.disabled = false; btn.textContent = 'Send reply'; }
    }
  }

  // The old teacher-side "test flag" button was removed from the UI;
  // flags are raised by the supervisor (supervisor.html) now.
  function submitTestFlag(){}

  ensureFlagsLoaded(); // load once at startup so My Compliance's "Open actions" has real data

  function renderFlagsNotifications(){
    const container = document.getElementById('flagsnotifications-body');
    container.innerHTML = '';
    container.appendChild(renderEffectiveTabBar('flagsnotifications'));
    ensureFlagsLoaded();
    if(flagsFetchStatus === 'loading' || flagsFetchStatus === 'idle'){
      const p = document.createElement('p'); p.className = 'cap'; p.textContent = 'Loading flags…';
      container.appendChild(p);
      return;
    }
    if(typeof flagsFetchStatus === 'string' && flagsFetchStatus.startsWith('error:')){
      const wrap = document.createElement('div');
      wrap.innerHTML = '<p class="cap" style="color:var(--crit,#d03b3b);">' + esc(flagsFetchStatus.slice(6)) + '</p><button class="btn">Retry</button>';
      wrap.querySelector('button').onclick = () => { flagsFetchStatus = 'idle'; renderFlagsNotifications(); };
      container.appendChild(wrap);
      return;
    }
    const year = calendarYear, month = calendarMonth;
    const monthName = new Date(year, month, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
    const monthKey = year + '-' + month;
    const today = todayDateKey();

    const monthFlags = flagsRecords.filter(f => f.dateRaised && f.dateRaised.slice(0, 7) === (year + '-' + String(month + 1).padStart(2, '0')));
    const observations = monthFlags.filter(f => f.state === 'observation');
    const concerns = monthFlags.filter(f => f.state === 'concern');
    const escalations = monthFlags.filter(f => f.state === 'escalation');
    const overdue = monthFlags.filter(f => f.status === 'open' && f.dueDate && f.dueDate < today);

    container.appendChild(mdSec('Flags & Notifications', '<span class="reqs">ISS-04…10</span>'));
    (() => {
      const bar = document.createElement('div'); bar.setAttribute('data-dl-end', '1'); bar.setAttribute('data-no-export', '1');
      bar.style.cssText = 'margin:18px 0 6px; padding-top:14px; border-top:1px solid var(--border);';
      const b = document.createElement('button'); b.textContent = '⬇ Download report (PDF)';
      b.style.cssText = 'padding:8px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
      b.onclick = () => downloadFlagsPdf(year, month);
      bar.appendChild(b); container.appendChild(bar);
    })();

    const monthTabs = document.createElement('div');
    monthTabs.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin:14px 0;';
    monthTabs.innerHTML = ACADEMIC_MONTHS.map(m => {
      const label = new Date(2000, m, 1).toLocaleDateString([], { month: 'short' });
      const active = m === month;
      const count = flagsRecords.filter(f => f.dateRaised && f.dateRaised.slice(0, 7) === (year + '-' + String(m + 1).padStart(2, '0'))).length;
      return `<button onclick="calendarMonth=${m}; renderFlagsNotifications();" style="padding:6px 12px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:12px; white-space:nowrap;">${label} · ${count}</button>`;
    }).join('');
    container.appendChild(monthTabs);

    const statGrid = mdGrid('g5', [
      mdTile('Flags to me', monthFlags.length, 'in ' + new Date(2000, month, 1).toLocaleDateString([], { month: 'long' }), mdPill(monthFlags.length ? 'See below' : 'None', monthFlags.length ? 'warn' : 'good'), 'ISS-10'),
      mdTile('Observations', observations.length, 'no reply needed', mdPill('For the record', 'info'), 'ISS-04'),
      mdTile('Concerns', concerns.filter(f => f.status === 'open').length, 'reply expected', mdPill(concerns.filter(f => f.status === 'open').length ? 'Reply needed' : 'None', concerns.filter(f => f.status === 'open').length ? 'warn' : 'good'), 'ISS-05'),
      mdTile('For escalation', escalations.length, 'raised upward', mdPill(escalations.length ? 'Escalated' : 'None', escalations.length ? 'crit' : 'good'), 'ISS-06'),
      mdTile('Overdue', overdue.length, 'past the reply date', mdPill(overdue.length ? 'Reply now' : 'Up to date', overdue.length ? 'crit' : 'good'), 'ISS-08')
    ]);
    statGrid.style.marginBottom = '22px';
    container.appendChild(statGrid);

    container.appendChild(mdSec('The three states', '<span class="reqs">ISS-04…06</span>'));
    const statesBody = document.createElement('div');
    let statesTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>State</th><th>What it means</th><th>Reply</th><th>Seen by</th></tr></thead><tbody>';
    Object.values(FLAG_STATES).forEach(s => {
      statesTable += `<tr><td>${mdPill(s.label, s.color)}</td><td style="text-align:left; white-space:normal; min-width:280px;">${esc(s.meaning)}</td><td style="text-align:left; white-space:normal;">${esc(s.reply)}</td><td class="dim" style="text-align:left; white-space:normal; min-width:200px;">${esc(s.seenBy)}</td></tr>`;
    });
    statesTable += '</tbody></table></div>';
    statesBody.innerHTML = statesTable;
    const statesCard = mdCard('What each one means and what it asks of me', null, statesBody);
    statesCard.style.marginBottom = '22px';
    container.appendChild(statesCard);

    container.appendChild(mdSec('What has been raised with me', '<span class="reqs">ISS-10…14</span>'));
    if(!monthFlags.length){
      const noneCard = document.createElement('div');
      noneCard.className = 'card'; noneCard.style.padding = '22px';
      noneCard.innerHTML = `<p class="cap" style="margin:0;">Nothing raised this month.</p>`;
      container.appendChild(noneCard);
    } else {
      monthFlags.slice().sort((a, b) => b.dateRaised.localeCompare(a.dateRaised)).forEach(f => {
        const s = FLAG_STATES[f.state];
        const card = document.createElement('div');
        card.className = 'card'; card.style.padding = '18px'; card.style.marginBottom = '12px';
        const overdueNow = f.status === 'open' && f.dueDate && f.dueDate < today;
        card.innerHTML = `<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div>
              ${mdPill(s.label, s.color)} ${overdueNow ? mdPill('Overdue', 'crit') : ''}
              <p style="margin:8px 0 0;">${esc(f.text)}</p>
              <p class="cap" style="margin:6px 0 0;">Raised ${esc(f.dateRaised)}${f.raisedByName ? ' by ' + esc(f.raisedByName) : ''}${f.dueDate ? ' · reply due ' + esc(f.dueDate) : ''}</p>
            </div>
            <div>${f.status === 'replied' ? mdPill('Replied', 'good') : (f.state === 'observation' ? mdPill('No reply needed', 'neu') : mdPill('Awaiting reply', 'warn'))}</div>
          </div>
          ${f.status === 'replied'
            ? `<div class="cap" style="margin-top:10px; padding:10px; background:var(--bg); border-radius:8px;">My reply (${esc(f.replyDate)}): ${esc(f.replyText)}</div>`
            : (f.state !== 'observation'
              ? `<div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                  <input id="flagReplyInput-${f.id}" type="text" placeholder="Write a reply" style="flex:1; min-width:220px; padding:8px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px;" />
                  <button onclick="submitFlagReply('${f.id}')" style="padding:8px 16px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Send reply</button>
                </div>`
              : '')}`;
        container.appendChild(card);
      });
    }
  }

  let myComplianceTab = 'compliance';
  function switchMyComplianceTab(tab){
    myComplianceTab = tab;
    renderMyCompliance();
  }

  function renderMyCompliance(){
    const container = document.getElementById('mycompliance-body');
    container.innerHTML = '';
    container.appendChild(renderEffectiveTabBar('mycompliance'));
    renderTeacherFilterBar(container, renderMyCompliance);

    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex; gap:8px; margin:14px 0; overflow-x:auto; flex-wrap:wrap;';
    const tabStyle = (active) => `padding:8px 16px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:${active ? '600' : '400'}; white-space:nowrap;`;
    tabBar.innerHTML = `
      <button style="${tabStyle(myComplianceTab === 'compliance')}" onclick="switchMyComplianceTab('compliance')">⇧ My Compliance</button>
      <button style="${tabStyle(myComplianceTab === 'workingdays')}" onclick="switchMyComplianceTab('workingdays')">📅 My Working Days</button>
    `;
    container.appendChild(tabBar);

    container.appendChild(reportDownloadBar(() => document.getElementById('mycompliance-body'),
      myComplianceTab === 'compliance' ? 'My Compliance — ' + new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], {month:'long', year:'numeric'}) : 'My Working Days — ' + new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], {month:'long', year:'numeric'}),
      myComplianceTab === 'compliance' ? 'my-compliance' : 'my-working-days'));
    if(myComplianceTab === 'compliance'){
      renderMyComplianceOverview(container);
    } else if(myComplianceTab === 'workingdays'){
      // Same renderComplianceCal() that used to be its own sidebar
      // destination — one implementation, just rendered into a fresh
      // div under this tab bar instead of a second place to find it.
      const calWrap = document.createElement('div');
      container.appendChild(calWrap);
      renderComplianceCal(calWrap);
    }
  }

    // Pocket for dimensions whose real data source isn't wired in yet.
  // Each key is a function returning {v, hasData} — fill one in the
  // moment its real source is confirmed, and it switches from sample
  // to real with no other change needed anywhere else on this screen.
  // Empty for now: Photo evidence (uploadedEvidenceRecords — source
  // file/scope not yet confirmed), TLM plan, PTM prep, Home activity
  // (no tracked feature exists yet for these three).
   // ---- Real sources for the four dimensions that used to show sample
  // numbers. Each returns {v, hasData}; hasData:false shows "No data
  // yet" instead of a made-up %. Home activity has no tracked feature
  // yet, so it says "Not tracked yet" rather than inventing a figure.
  function complianceWeeksInMonth(year, month){
    return WEEKS.filter(w => {
      const s = parseWeekStartDate(w.dates);
      return s.getFullYear() === year && s.getMonth() === month;
    });
  }

  // PTM prep — the teacher's own checklist for the next scheduled PTM,
  // from the same ptm_meetings data the PTM screen shows.
  let ptmPrepComplianceCache = null; // null | 'loading' | 'none' | 'error' | {total, done, date}
  function ensurePtmPrepComplianceLoaded(){
    if(ptmPrepComplianceCache !== null) return;
    if(!myClassInfo.school_id) return; // class info not loaded yet — tried again on the next render
    ptmPrepComplianceCache = 'loading';
    const params = new URLSearchParams(window.location.search);
    params.set('school_id', myClassInfo.school_id);
    if(myClassInfo.class_id) params.set('class_id', myClassInfo.class_id);
    fetch('backend/ptm/get_ptm_meeting.php?' + params.toString())
      .then(r => r.json())
      .then(data => {
        const meeting = data.status === 'success' ? data.meeting : null;
        if(!meeting){ ptmPrepComplianceCache = 'none'; return; }
        const items = (meeting.prep_items || []).filter(p => p.for_role === 'teacher');
        ptmPrepComplianceCache = { total: items.length, done: items.filter(p => p.is_done == 1).length, date: meeting.meeting_date };
      })
      .catch(() => { ptmPrepComplianceCache = 'error'; })
      .finally(() => {
        const body = document.getElementById('mycompliance-body');
        if(body && !body.classList.contains('hidden') && myComplianceTab === 'compliance') renderMyCompliance();
      });
  }

  const realDimensionSources = {
    // Of the sessions marked done this month, how many have at least
    // one photo/video/audio/document uploaded against them.
    'Photo evidence': () => {
      let doneSessions = 0, withEvidence = 0;
      complianceWeeksInMonth(calendarYear, calendarMonth).forEach(w => {
        ['mon','tue','wed','thu','fri'].forEach(dk => {
          DOMAINS.forEach(d => {
            if(!sessionDoneEntries[dailyPlanKey(w.w, dk, d.key)]) return;
            doneSessions++;
            if((uploadedEvidenceRecords[evidenceKey(w.w, dk, d.key)] || []).length) withEvidence++;
          });
        });
      });
      return { v: doneSessions ? Math.round(withEvidence / doneSessions * 100) : 0, hasData: doneSessions > 0 };
    },
    // Weeks this month with materials recorded on My Day's activity cards.
    'TLM plan': () => {
      const weeks = complianceWeeksInMonth(calendarYear, calendarMonth);
      const planned = weeks.filter(w => typeof weekHasCardMaterials === 'function' && weekHasCardMaterials(w.w)).length;
      return { v: weeks.length ? Math.round(planned / weeks.length * 100) : 0, hasData: planned > 0 };
    },
    // Teacher prep items ticked for the next scheduled PTM.
    'PTM prep': () => {
      ensurePtmPrepComplianceLoaded();
      const c = ptmPrepComplianceCache;
      if(!c || typeof c !== 'object' || !c.total) return { v: 0, hasData: false };
      return { v: Math.round(c.done / c.total * 100), hasData: true };
    },
    // No real home-activity tracking exists yet (Family & Parents still
    // seeds it with sample values), so nothing is shown as a number.
    'Home activity': () => ({ v: 0, hasData: false, notTracked: true })
  };

/* ===== teacher-part-06.js ===== */
/* =========================================================================
   teacher-part-06.js — part 6 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  function renderMyComplianceOverview(container){
    const complianceStats = computeComplianceStatsForMonth(calendarYear, calendarMonth);
    const studentStats = computeAttendanceDashboardStats(calendarYear, calendarMonth);

    // Real, verified data sources — each one traced to an actual
    // store elsewhere in this app before being wired here, not
    // assumed. hasData:false means "genuinely nothing recorded yet",
    // shown as such below rather than a fabricated 0%.
    const dims = COMPLIANCE_DIMENSIONS.map(k => {
      if(k === 'Teacher attendance'){
        return { k, v: complianceStats.myAttendancePct, real: true, hasData: true };
      }
      if(k === 'Daily plan'){
        return { k, v: complianceStats.plansSubmittedPct, real: true, hasData: complianceStats.hasPlans };
      }
      if(k === 'Attendance register'){
        const hasData = studentStats.hasData;
        return { k, v: hasData ? Math.round(studentStats.daysMarked / studentStats.studentDays * 100) : 0, real: true, hasData };
      }
      if(k === 'Assessment'){
        // Real, coarse "has grading actually started this month"
        // signal across all three Assessment screens — not a
        // weighted score, just how many of the three have any real
        // count entered at all.
        const wbTally = workbookCompetencyTallyCache[currentWorkbookMonth];
        const wbAny = wbTally && typeof wbTally === 'object' && Object.values(wbTally).some(t => (t.count_e||0)+(t.count_p||0)+(t.count_a||0) > 0);
        ensurePreTestTallyForClass();
        const ptAny = Object.values(preTestTallyEntries).some(t => (t.count_e||0)+(t.count_p||0)+(t.count_a||0) > 0);
        const obsCache = observationAssessmentCache[currentWorkbookMonth];
        const obsAny = obsCache && typeof obsCache === 'object' && Object.keys(obsCache).some(pid => Object.keys(obsCache[pid] || {}).length > 0);
        const signals = [wbAny, ptAny, obsAny];
        return { k, v: Math.round(signals.filter(Boolean).length / signals.length * 100), real: true, hasData: true };
      }
      if(k === 'Monthly Effective'){
        const effRec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
        const stepsDone = [!!effRec.registerDriveLink, !!effRec.signatures.principal, !!effRec.signatures.ao, !!effRec.submittedToFoundation].filter(Boolean).length;
        return { k, v: Math.round(stepsDone / 4 * 100), real: true, hasData: true };
      }
      if(k === 'Materials logged'){
        // Sessions held this week that have materials recorded on their activity card.
        const pr = typeof practiceForWeek === 'function' ? practiceForWeek(currentWeekNum) : null;
        const hasData = !!(pr && pr.delivered);
        return { k, v: hasData ? Math.round(pr.withMaterials / pr.delivered * 100) : 0, real: true, hasData };
      }
      // Photo evidence / TLM plan / PTM prep / Home activity — real
      // sources live in realDimensionSources above.
      if(realDimensionSources[k]){
        const result = realDimensionSources[k]();
        return { k, v: result.v, real: !result.notTracked, hasData: result.hasData, notTracked: !!result.notTracked };
      }
      return { k, v: 0, real: false, hasData: false, notTracked: true }; // never a sample number
    });

    container.appendChild(mdSec('What my supervisor sees', '<span class="reqs">TCM-01…12</span>'));
    container.appendChild((() => {
      const p = document.createElement('p'); p.className = 'cap'; p.style.margin = '4px 0 16px';
      p.innerHTML = 'The same ten dimensions as the supervisor\u2019s view. Deliberately shown as dimensions, never combined into one ranked score \u2014 the dimensions are not equally within a teacher\u2019s control (RPT-15). <b>Teacher attendance</b> is computed from your real attendance record; every other dimension is computed from what is actually recorded in this portal, and shows "No data yet" or "Not tracked yet" rather than a made-up number when nothing is recorded.';
      return p;
    })());

    const dimBarsHtml = (list) => list.map(x => {
      if(x.notTracked){
        return `<div class="hbar-row">
          <div class="hbar-row-label">${esc(x.k)}</div>
          <div class="hbar-track"></div>
          <div class="hbar-count cap">Not tracked yet</div>
        </div>`;
      }
      if(x.real && !x.hasData){
        return `<div class="hbar-row">
          <div class="hbar-row-label">${esc(x.k)} <span class="pill info" style="font-size:9.5px; padding:1px 6px; vertical-align:middle;">real</span></div>
          <div class="hbar-track"></div>
          <div class="hbar-count cap">No data yet</div>
        </div>`;
      }
      const band = mdStatusBand(x.v);
      const color = band.c === 'good' ? 'var(--success)' : band.c === 'warn' ? '#EE8F35' : 'var(--danger,#c8433f)';
      return `<div class="hbar-row">
        <div class="hbar-row-label">${esc(x.k)}${x.real ? ' <span class="pill info" style="font-size:9.5px; padding:1px 6px; vertical-align:middle;">real</span>' : ''}</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${x.v}%; background:${color};"></div></div>
        <div class="hbar-count">${x.v}%</div>
      </div>`;
    }).join('');
    const half = Math.ceil(dims.length / 2);
    const dimGrid = document.createElement('div');
    dimGrid.style.cssText = 'display:grid; grid-template-columns:' + (window.innerWidth < 700 ? '1fr' : 'repeat(2,1fr)') + '; gap:16px; margin-bottom:22px;';
    const dimCardLeft = document.createElement('div'); dimCardLeft.className = 'card'; dimCardLeft.style.padding = '22px';
    dimCardLeft.innerHTML = dimBarsHtml(dims.slice(0, half));
    const dimCardRight = document.createElement('div'); dimCardRight.className = 'card'; dimCardRight.style.padding = '22px';
    dimCardRight.innerHTML = dimBarsHtml(dims.slice(half));
    dimGrid.appendChild(dimCardLeft);
    dimGrid.appendChild(dimCardRight);
    container.appendChild(dimGrid);

    const statGrid = mdGrid('g4', dims.slice(0, 4).map(d => d.hasData
      ? mdTile(d.k, d.v, '%', mdPill(mdStatusBand(d.v).l, mdStatusBand(d.v).c), '', mdMeter(d.v, mdStatusBand(d.v).c))
      : mdTile(d.k, '—', '', mdPill(d.notTracked ? 'Not tracked yet' : 'No data yet', 'neu'), '')));
    statGrid.style.marginBottom = '22px';
    container.appendChild(statGrid);

    // Data freshness — no real "last updated" timestamp is tracked
    // anywhere in this app for any of these (dailyPlanEntries, the
    // assessment tally caches, etc. store the latest value only, not
    // a history), so "updated 3 days ago" was always fabricated. Real
    // presence — has anything actually been recorded this month? —
    // is the honest signal available right now.
    const freshnessItems = [
      ['Daily plan', complianceStats.hasPlans],
      ['Assessment', dims.find(d => d.k === 'Assessment').v > 0],
      ['Workbooks', !!(workbookCompetencyTallyCache[currentWorkbookMonth] && typeof workbookCompetencyTallyCache[currentWorkbookMonth] === 'object')],
      ['Home activity', false] // no real data source exists yet for this
    ];

    // Open actions — real, from the same flagsRecords store Flags &
    // Notifications reads and writes. "Open" concerns/escalations
    // with a real due date, soonest first.
    const openActions = flagsRecords
      .filter(f => f.status === 'open' && f.dueDate)
      .sort((a, b) => a.dueDate < b.dueDate ? -1 : 1);
    const todayStr = todayDateKey();

    container.appendChild(mdGrid('g3', [
      mdCard('Data freshness', 'TCM-11 · an unrecorded value is never shown as a zero.',
        (() => { const d = document.createElement('div'); d.className = 'list';
          d.innerHTML = freshnessItems
            .map(([label, hasData]) => `<div class="row"><div class="t"><b>${esc(label)}</b></div><div>${hasData ? mdPill('Recorded this month', 'good') : mdPill('Nothing recorded yet', 'neu')}</div></div>`).join('');
          return d; })()),
      mdCard('My training record', 'TRN-08 · forms a professional development record.',
        (() => { const d = document.createElement('div'); d.className = 'cap';
          d.style.padding = '4px 0';
          d.textContent = 'No training record has been entered yet — this needs a real training-tracking feature to be built before anything real can show here.';
          return d; })()),
      mdCard('Open actions from my last visit', 'SVR-14 · reviewed at the next visit.',
        openActions.length
          ? (() => { const d = document.createElement('div'); d.className = 'list';
              d.innerHTML = openActions.map(f => {
                const daysLeft = Math.round((new Date(f.dueDate) - new Date(todayStr)) / 86400000);
                const dueLabel = daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : 'Due in ' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's');
                return `<div class="row"><div class="t"><b>${esc(f.text)}</b><span>${esc(dueLabel)}</span></div><div>${mdPill(daysLeft < 0 ? 'Overdue' : 'Open', daysLeft < 0 ? 'crit' : 'warn')}</div></div>`;
              }).join('');
              return d; })()
          : (() => { const d = document.createElement('div'); d.className = 'cap'; d.style.padding = '4px 0';
              d.textContent = 'No open actions right now.';
              return d; })())
    ]));
  }

  // ---------------------------------------------------------------
  // FAMILY RECORDS — real, persisted family/parent data, filled in via
  // the Google Forms import below. Falls back to sampleHousehold()
  // (clearly marked "(sample)") for any child whose family hasn't
  // been imported yet, same honesty convention used everywhere else
  // in this app (Monthly Effective's month-by-month table, Attendance
  // Dashboard, etc.) — never a red zero, never mistaken for real data.
  //
  // Deliberately has NO annual-income field at all, exact or
  // otherwise — only the income band (a controlled list, INCOME_BANDS
  // above) is ever collected or stored. That's a household's business,
  // and a band is what every downstream use of this data actually
  // needs.
  // ---------------------------------------------------------------
  var familyRecords = {}; // child_name -> real imported record, shape built by importFamilyProfileFile below
  let selectedFamilyChildName = null; // tracked so the import handler can refresh whichever child is currently being viewed

  (function loadFamilyRecords(){
    try {
      const raw = localStorage.getItem('familyRecords');
      if(raw) Object.assign(familyRecords, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty, sample fallback covers it */ }
  })();
  function saveFamilyRecords(){
    try { localStorage.setItem('familyRecords', JSON.stringify(familyRecords)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }

  var familyRecordsLoaded = false;
async function ensureFamilyRecordsLoaded(reRenderFn, force){
  if(familyRecordsLoaded && !force) return true;
  if(!myClassInfo.class_id) return false;
  familyRecordsLoaded = true;
  try{
    const params = new URLSearchParams({ class_id: myClassInfo.class_id });
    const res = await fetch('backend/pupils/get_family_profiles.php?' + params.toString() + (window.location.search ? '&' + window.location.search.slice(1) : ''));
    const data = await res.json();
    if(data.status === 'success'){
      Object.assign(familyRecords, data.profiles || {});
      saveFamilyRecords(); // keep localStorage as a same-tab cache, not the source of truth anymore
      if(reRenderFn) reRenderFn();
    }
  } catch(err){
    familyRecordsLoaded = false; // allow retry
  }
  return false;
}

  // Exact column order a teacher's Google Form export (or a manually
  // built spreadsheet) must match. guardian2_* columns may be left
  // blank for a single-guardian household. Multi-value cells
  // (languages_at_home, household_skills, home_resources,
  // workshop_skills) use a semicolon between values, NOT a comma — a
  // comma would be read as a new column and misalign everything after
  // it.
  //
  // workshop_skills / workshop_availability / willing_to_volunteer are
  // the fields Parent Volunteers filters on — this is now the ONE
  // real source for that screen too, not a separate applicant sheet.
  // workshop_skills is deliberately a different column from
  // household_skills above: that one is free-text ("what she's good
  // at" for the household profile), this one is a fixed picklist
  // matched against SKILL_OPTIONS specifically for workshop matching.
  const FAMILY_PROFILE_CSV_HEADER = [
    'child_name', 'guardian1_name', 'guardian1_relation', 'guardian1_occupation', 'guardian1_phone', 'guardian1_education',
    'guardian2_name', 'guardian2_relation', 'guardian2_occupation', 'guardian2_phone', 'guardian2_education',
    'locality', 'mother_tongue', 'languages_at_home', 'income_band', 'household_skills', 'home_resources',
    'siblings_in_programme', 'adult_reads_programme_language', 'photo_consent',
    'workshop_skills', 'workshop_availability', 'willing_to_volunteer'
  ];

  function renderFamilyProfileImportCard(){
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.cssText = 'margin-bottom:22px; overflow:hidden;';
    wrap.innerHTML = `
      <div class="hd"><div><h3>Import Family Profiles from Google Form</h3>
        <p class="cap" style="margin:0 0 8px;">.csv or .xlsx — header row must be exactly:</p>
        <p class="cap" style="margin:0 0 10px; word-break:break-word; overflow-wrap:anywhere; font-family:monospace; font-size:12px; background:var(--bg); border-radius:6px; padding:8px 10px;">${esc(FAMILY_PROFILE_CSV_HEADER.join(','))}</p>
        <p class="cap" style="margin:0; word-break:break-word; overflow-wrap:anywhere;">Leave guardian2_* blank for a single-guardian household. For languages_at_home, household_skills, home_resources and workshop_skills, separate multiple values with a semicolon ( ; ) — not a comma, or it'll be read as a new column.
        income_band should be one of: ${esc(INCOME_BANDS.join(' / '))}. adult_reads_programme_language, photo_consent and willing_to_volunteer should be yes/no.
        workshop_skills should be from: ${SKILL_OPTIONS.map(s=>s.label).join(', ')}. workshop_availability is semicolon-separated day:slot pairs, e.g. Mon:Morning;Wed:Afternoon (slots: ${TIME_SLOTS.map(t=>t.label).join(', ')}).</p></div></div>
      <input type="file" id="familyProfileImportInput" accept=".csv,.xlsx" style="margin-top:8px; max-width:100%;" />
      <div id="familyProfileImportResult" style="margin-top:10px; word-break:break-word; overflow-wrap:anywhere;"></div>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="btn-primary" style="width:auto; padding:9px 16px;" onclick="importFamilyProfileFile()">Import</button>
        <button style="width:auto; padding:9px 16px; border-radius:8px; border:1px solid var(--border); background:#fff; color:var(--danger,#c8433f); cursor:pointer;" onclick="clearImportedFamilyData()">Delete imported data</button>
      </div>
    `;
    return wrap;
  }

  // Wipes every real imported Family Profile record (from familyRecords,
  // including the willingToVolunteer/workshopSkills/teacherApproved
  // fields on it) so the whole class falls back to placeholder data
  // again — for re-testing an import from a clean slate, not a
  // per-household delete.
  function clearImportedFamilyData(){
    const importedCount = Object.keys(familyRecords).length;
    if(!importedCount){ alert('There is no imported Family Profile data to delete.'); return; }
    if(!confirm(`Delete all ${importedCount} imported Family Profile record(s)? This clears willingness, skills, availability, approvals, and scheduled workshops for every household — the whole class reverts to placeholder data until you import again. This cannot be undone.`)) return;
    Object.keys(familyRecords).forEach(name => delete familyRecords[name]);
        if(myClassInfo.class_id){
      fetch('backend/pupils/delete_family_profiles.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id })
      }).catch(() => {});
    }
    saveFamilyRecords();
    alert('Imported Family Profile data deleted. The class is back to placeholder data.');
    // Unconditional, not gated on a visibility check — "The whole
    // class" table (renderHouseholdProfilesSection) and Parent
    // Involvement both read familyRecords too, and a stale hidden-class
    // check here was exactly why this wasn't refreshing live before.
    // Re-rendering into a hidden container is harmless; it's just
    // ready and correct the moment that tab is opened.
    if(typeof renderFamilyParents === 'function') renderFamilyParents(selectedFamilyChildName);
    if(typeof renderParentVolunteers === 'function') renderParentVolunteers();
    if(typeof renderParentInvolvement === 'function') renderParentInvolvement();
  }

  function getFamilyRecordOrSample(name){
    if(familyRecords[name]) return { f: familyRecords[name], isSample: false };
    return { f: sampleHousehold(name), isSample: true };
  }

  const GUARDIAN_EDUCATION_LEVELS = ['No formal education', 'Primary school', 'Secondary school', 'Higher secondary or above'];
  let familyManualEditOpen = false; // reset whenever the child switches, in renderFamilyParents below

  function toggleFamilyManualEdit(){
    familyManualEditOpen = !familyManualEditOpen;
    renderFamilyParents(selectedFamilyChildName);
  }

  // Manual, in-app alternative to the CSV import above — same
  // familyRecords store, same shape importFamilyProfileFile builds,
  // just typed in directly for one child at a time instead of
  // uploaded in bulk. Pre-fills from whatever's currently showing
  // (real record if one exists, sample otherwise) so editing an
  // existing profile doesn't mean starting from a blank form.
  function renderFamilyManualEntryCard(name){
    const existing = familyRecords[name];
    const { f } = getFamilyRecordOrSample(name);
    const g1 = f.guardianNames[0] || {};
    const g1Occ = (f.guardians[0] || {}).occ || '';
    const hasG2 = f.guardianNames.length > 1;
    const g2 = hasG2 ? f.guardianNames[1] : {};
    const g2Occ = hasG2 ? ((f.guardians[1] || {}).occ || '') : '';

    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.cssText = 'margin-bottom:22px; padding:22px;';
    const fld = 'width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;';
    const lbl = 'font-size:10.5px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; display:block;';
    const checkboxRow = (options, selected, namePrefix) => options.map(o =>
      `<label style="display:inline-flex; align-items:center; gap:5px; margin:0 14px 6px 0; font-size:12.5px; font-weight:normal; text-transform:none;">
        <input type="checkbox" id="${namePrefix}-${esc(o)}" value="${esc(o)}" ${selected.includes(o) ? 'checked' : ''} /> ${esc(o)}
      </label>`).join('');

    wrap.innerHTML = `
      <h4 style="margin:0 0 4px;">${existing ? 'Edit' : 'Add'} ${esc(name)}'s family profile manually</h4>
      <p class="cap" style="margin:0 0 16px;">Same record the Google Form import writes to — fill this in directly instead, for one child at a time.</p>
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:16px 24px;">
        <div><label style="${lbl}">Guardian 1 name</label><input id="fme_g1name" type="text" value="${esc(g1.name || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Guardian 1 relation</label><input id="fme_g1rel" type="text" placeholder="Mother / Father / Guardian" value="${esc(g1.rel || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Guardian 1 occupation</label><select id="fme_g1occ" style="${fld}"><option value="">Select…</option>${OCCUPATIONS.map(o => `<option ${g1Occ === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <div><label style="${lbl}">Guardian 1 phone</label><input id="fme_g1phone" type="text" value="${esc(g1.phone || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Guardian 1 education</label><select id="fme_g1edu" style="${fld}"><option value="">Select…</option>${GUARDIAN_EDUCATION_LEVELS.map(o => `<option ${g1.edu === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <div></div>
      </div>

      <label style="display:flex; align-items:center; gap:8px; margin:18px 0 0; font-size:13px; font-weight:600; cursor:pointer;">
        <input type="checkbox" id="fme_hasG2" ${hasG2 ? 'checked' : ''} onchange="document.getElementById('fme_g2fields').style.display = this.checked ? 'grid' : 'none';" /> This child has a second guardian
      </label>
      <div id="fme_g2fields" style="display:${hasG2 ? 'grid' : 'none'}; grid-template-columns:repeat(2,1fr); gap:16px 24px; margin-top:12px;">
        <div><label style="${lbl}">Guardian 2 name</label><input id="fme_g2name" type="text" value="${esc(g2.name || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Guardian 2 relation</label><input id="fme_g2rel" type="text" placeholder="Mother / Father / Guardian" value="${esc(g2.rel || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Guardian 2 occupation</label><select id="fme_g2occ" style="${fld}"><option value="">Select…</option>${OCCUPATIONS.map(o => `<option ${g2Occ === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <div><label style="${lbl}">Guardian 2 phone</label><input id="fme_g2phone" type="text" value="${esc(g2.phone || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Guardian 2 education</label><select id="fme_g2edu" style="${fld}"><option value="">Select…</option>${GUARDIAN_EDUCATION_LEVELS.map(o => `<option ${g2.edu === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <div></div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:16px 24px; margin-top:18px;">
        <div><label style="${lbl}">Locality</label><input id="fme_locality" type="text" value="${esc(f.locality || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Mother tongue</label><select id="fme_mothertongue" style="${fld}"><option value="">Select…</option>${LANGUAGES_AT_HOME.map(o => `<option ${f.motherTongue === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <div><label style="${lbl}">Income band</label><select id="fme_income" style="${fld}"><option value="">Select…</option>${INCOME_BANDS.map(o => `<option ${f.income === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <div><label style="${lbl}">Siblings in programme</label><input id="fme_siblings" type="number" min="0" value="${f.siblings || 0}" style="${fld}" /></div>
      </div>

      <div style="margin-top:18px;"><label style="${lbl}">Languages at home</label>${checkboxRow(LANGUAGES_AT_HOME, f.langs || [], 'fme_lang')}</div>
      <div style="margin-top:10px;"><label style="${lbl}">Household skills</label>${checkboxRow(HOUSEHOLD_SKILLS, f.skills || [], 'fme_skill')}</div>
      <div style="margin-top:10px;"><label style="${lbl}">Home resources</label>${checkboxRow(HOME_RESOURCES, f.res || [], 'fme_res')}</div>

      <div style="display:flex; gap:24px; margin-top:16px; flex-wrap:wrap;">
        <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;"><input type="checkbox" id="fme_reads" ${f.reads ? 'checked' : ''} /> Adult reads the programme language</label>
        <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;"><input type="checkbox" id="fme_photoconsent" ${f.photoConsent ? 'checked' : ''} /> Photo consent given</label>
      </div>

      <div style="margin-top:20px; display:flex; gap:10px;">
        <button class="btn-primary" style="width:auto; padding:9px 18px;" onclick="saveFamilyManualEntry('${esc(name)}')">Save profile</button>
        <button style="padding:9px 18px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:13px; font-weight:600; cursor:pointer;" onclick="toggleFamilyManualEdit()">Cancel</button>
      </div>
    `;
    return wrap;
  }

  function checkedValues(options, namePrefix){
    return options.filter(o => {
      const el = document.getElementById(namePrefix + '-' + o);
      return el && el.checked;
    });
  }

  function saveFamilyManualEntry(name){
    const g1Name = document.getElementById('fme_g1name').value.trim();
    if(!g1Name){
      alert('Guardian 1 name is required.');
      return;
    }
    const guardianNames = [{
      name: g1Name,
      rel: document.getElementById('fme_g1rel').value.trim() || 'Guardian',
      edu: document.getElementById('fme_g1edu').value,
      phone: document.getElementById('fme_g1phone').value.trim(),
      smart: true, primary: true
    }];
    const guardians = [{ occ: document.getElementById('fme_g1occ').value }];

    if(document.getElementById('fme_hasG2').checked){
      const g2Name = document.getElementById('fme_g2name').value.trim();
      if(g2Name){
        guardianNames.push({
          name: g2Name,
          rel: document.getElementById('fme_g2rel').value.trim() || 'Guardian',
          edu: document.getElementById('fme_g2edu').value,
          phone: document.getElementById('fme_g2phone').value.trim(),
          smart: true, primary: false
        });
        guardians.push({ occ: document.getElementById('fme_g2occ').value });
      }
    }

    familyRecords[name] = {
      locality: document.getElementById('fme_locality').value.trim(),
      motherTongue: document.getElementById('fme_mothertongue').value,
      langs: checkedValues(LANGUAGES_AT_HOME, 'fme_lang'),
      income: document.getElementById('fme_income').value,
      skills: checkedValues(HOUSEHOLD_SKILLS, 'fme_skill'),
      res: checkedValues(HOME_RESOURCES, 'fme_res'),
      siblings: parseInt(document.getElementById('fme_siblings').value, 10) || 0,
      reads: document.getElementById('fme_reads').checked,
      photoConsent: document.getElementById('fme_photoconsent').checked,
      consent: true,
      guardianNames, guardians,
      importedAt: todayDateKey()
    };
    saveFamilyRecords();
    syncFamilyProfileToServer(name);
    familyManualEditOpen = false;
    renderFamilyParents(name);
  }

  async function importFamilyProfileFile(){
    const input = document.getElementById('familyProfileImportInput');
    const resultEl = document.getElementById('familyProfileImportResult');
    if(!input.files.length){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';
    let rows;
    try {
      rows = await readAssessmentFileRows(input.files[0]); // shared parser — genuinely generic despite the name, same one weekly/monthly assessment imports use
    } catch(err){
      resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`;
      return;
    }
    if(!rows.length){
      resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>';
      return;
    }
    const header = rows[0].map(h => h.toLowerCase().trim());
    if(header.join(',') !== FAMILY_PROFILE_CSV_HEADER.join(',')){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: ${esc(FAMILY_PROFILE_CSV_HEADER.join(','))} — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }

    let imported = 0;
    const skipped = [];
    const warnings = [];
    const updatedNames = [];
    for(let i = 1; i < rows.length; i++){
      const parts = rows[i];
      const rowNum = i + 1;
      if(parts.length !== FAMILY_PROFILE_CSV_HEADER.length){
        skipped.push(`Row ${rowNum}: expected ${FAMILY_PROFILE_CSV_HEADER.length} columns, got ${parts.length}`);
        continue;
      }
      const [
        childName, g1Name, g1Rel, g1Occ, g1Phone, g1Edu,
        g2Name, g2Rel, g2Occ, g2Phone, g2Edu,
        locality, motherTongue, languagesRaw, incomeBand, skillsRaw, resourcesRaw,
        siblingsRaw, readsRaw, photoConsentRaw,
        workshopSkillsRaw, workshopAvailabilityRaw, willingRaw
      ] = parts;

      if(!realPupilsCache.some(p => p.name === childName)){ skipped.push(`Row ${rowNum}: "${childName}" is not a child in this class`); continue; }
      if(!g1Name.trim()){ skipped.push(`Row ${rowNum}: guardian1_name is required`); continue; }

      if(!INCOME_BANDS.includes(incomeBand)){
        warnings.push(`Row ${rowNum} (${childName}): "${incomeBand}" isn't one of the standard income bands — saved as given, but check for a typo.`);
      }

      const guardianNames = [{ name: g1Name, rel: g1Rel || 'Guardian', edu: g1Edu || '', phone: g1Phone || '', smart: true, primary: true }];
      const guardians = [{ occ: g1Occ || '' }];
      if(g2Name && g2Name.trim()){
        guardianNames.push({ name: g2Name, rel: g2Rel || 'Guardian', edu: g2Edu || '', phone: g2Phone || '', smart: true, primary: false });
        guardians.push({ occ: g2Occ || '' });
      }

      const yesNo = (v) => /^y(es)?$/i.test((v || '').trim());
      const noYes = (v) => /^n(o)?$/i.test((v || '').trim());

      // workshop_skills: semicolon-separated labels matched against the
      // fixed SKILL_OPTIONS picklist — unrecognized labels are dropped
      // with a warning rather than silently kept as junk values.
      const workshopSkills = [];
      (workshopSkillsRaw || '').split(';').map(s => s.trim()).filter(Boolean).forEach(label => {
        const match = SKILL_OPTIONS.find(s => s.label.toLowerCase() === label.toLowerCase());
        if(match) workshopSkills.push(match.value);
        else warnings.push(`Row ${rowNum} (${childName}): "${label}" isn't a recognized workshop skill — skipped, check spelling against: ${SKILL_OPTIONS.map(s=>s.label).join(', ')}`);
      });

      // workshop_availability: semicolon-separated day:slot pairs.
      const workshopAvailability = [];
      (workshopAvailabilityRaw || '').split(';').map(s => s.trim()).filter(Boolean).forEach(pair => {
        const [dayPart, slotPart] = pair.split(':').map(s => (s || '').trim());
        const day = DAY_OPTIONS.find(d => d.label.toLowerCase() === (dayPart||'').toLowerCase() || d.value === (dayPart||'').toLowerCase());
        const slot = TIME_SLOTS.find(t => t.label.toLowerCase() === (slotPart||'').toLowerCase() || t.value === (slotPart||'').toLowerCase());
        if(day && slot) workshopAvailability.push({day: day.value, slot: slot.value});
        else warnings.push(`Row ${rowNum} (${childName}): "${pair}" isn't a recognized day:slot pair — skipped`);
      });

      const willingToVolunteer = yesNo(willingRaw) ? true : noYes(willingRaw) ? false : null;

      // Preserve any workshop already scheduled — and any teacher
      // approval already given — for this child before this import
      // overwrites the record. Re-importing the same sheet (e.g. to
      // fix a typo elsewhere) shouldn't silently un-approve someone or
      // wipe a schedule the teacher already set up.
      const existingScheduled = familyRecords[childName] ? familyRecords[childName].scheduledWorkshop : null;
      const existingApproved = familyRecords[childName] ? familyRecords[childName].teacherApproved : false;

      familyRecords[childName] = {
        locality: locality || '', motherTongue: motherTongue || '',
        langs: (languagesRaw || '').split(';').map(s => s.trim()).filter(Boolean),
        income: incomeBand,
        skills: (skillsRaw || '').split(';').map(s => s.trim()).filter(Boolean),
        res: (resourcesRaw || '').split(';').map(s => s.trim()).filter(Boolean),
        siblings: parseInt(siblingsRaw, 10) || 0,
        reads: yesNo(readsRaw),
        photoConsent: yesNo(photoConsentRaw),
        consent: true, // presence of a completed form response IS the consent record — FAM-related consent tracking beyond this is a separate, explicit step, not inferred further here
        guardianNames, guardians,
        workshopSkills, workshopAvailability, willingToVolunteer,
        scheduledWorkshop: existingScheduled,
        teacherApproved: existingApproved,
        importedAt: todayDateKey()
      };
      imported++;
      updatedNames.push(childName);
    }
    saveFamilyRecords();
    updatedNames.forEach(n => syncFamilyProfileToServer(n));

    async function syncFamilyProfileToServer(name){
  const pupil = realPupilsCache && realPupilsCache.find(p => p.name === name);
  const rec = familyRecords[name];
  if(!pupil || !rec) return;
  const guardians = (rec.guardianNames || []).map((g, i) => Object.assign({}, g, { occ: (rec.guardians[i] || {}).occ || '' }));
  try{
    await fetch('backend/pupils/save_family_profile.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        pupil_id: pupil.id,
        locality: rec.locality, mother_tongue: rec.motherTongue,
        languages_at_home: rec.langs, income_band: rec.income,
        household_skills: rec.skills, home_resources: rec.res,
        siblings_in_programme: rec.siblings, adult_reads_programme_language: rec.reads,
        photo_consent: rec.photoConsent, consent: rec.consent, guardians,
        workshop_skills: rec.workshopSkills, workshop_availability: rec.workshopAvailability,
        willing_to_volunteer: rec.willingToVolunteer, scheduled_workshop: rec.scheduledWorkshop,
        teacher_approved: rec.teacherApproved
      })
    });
  } catch(err){ /* offline — local copy stays authoritative until this succeeds later */ }
}

    // Explicit confirmation that this genuinely applied class-wide —
    // every child named in the sheet, not just whichever one happened
    // to be on screen — plus who's still left on sample data, so a
    // teacher can see at a glance whether the whole class is covered.
    const stillOnSample = realPupilsCache.map(p => p.name).filter(n => !familyRecords[n]);
    let html = `<div class="au-success">Imported ${imported} of ${rows.length - 1} rows.${updatedNames.length ? ' Updated: ' + esc(updatedNames.join(', ')) + '.' : ''}</div>`;
    if(stillOnSample.length) html += `<div class="cap" style="margin-top:6px;">Still showing sample data (not in this sheet): ${esc(stillOnSample.join(', '))}.</div>`;
    if(warnings.length) html += `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:12px 14px; margin-top:6px; font-size:13px;">${warnings.map(w => esc(w)).join('<br/>')}</div>`;
    if(skipped.length) html += `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<br/>${skipped.map(s => esc(s)).join('<br/>')}</div>`;
    resultEl.innerHTML = html;
    alert(`Imported ${imported} of ${rows.length - 1} rows from the Family Profile sheet.` + (skipped.length ? ` ${skipped.length} row(s) were skipped — see the details below.` : ''));
    if(typeof renderFamilyParents === 'function' && document.getElementById('familyparents-body') && !document.getElementById('familyparents-body').classList.contains('hidden')){
      renderFamilyParents(selectedFamilyChildName);
    }
  }


  // Matches vTeacherFamily: a child picker, a "Household" card (kv
  // list) and a "Parents and guardians" card, plus consent pills.
  const HOUSEHOLD_SKILLS = ['Tailoring', 'Cooking', 'Driving', 'Masonry', 'Farming'];
  const HOME_RESOURCES = ['Smartphone', 'Radio', 'Television', 'Books at home', 'None of these'];
  // No invented households — an empty record; screens say "No data available".
  function sampleHousehold(name){
    return Object.assign(sampleFamily(name), { locality: '', walk: null, skills: [], res: [], siblings: null, familyStructure: '', maritalStatus: '', motherTongue: '', annualIncome: null, guardianNames: [] });
  }
  // ---------------------------------------------------------------
  // FAMILY & HOME ACTIVITY — parent-teacher meeting record and home
  // activity tracking, per household, plus a class-wide engagement
  // view. Seeded with representative defaults (same seeded-random
  // convention as the rest of this file) so it isn't starting blank,
  // but every field is editable and persists like the rest of this
  // app's real records.
  // ---------------------------------------------------------------
  const HOME_ACTIVITY_POOL = [
    { name: 'Sort the buttons by colour', materials: 'buttons or bottle caps', time: '10 minutes', reading: false },
    { name: 'Name five things in the kitchen', materials: 'none', time: '5 minutes', reading: false },
    { name: 'Count the steps to the door', materials: 'none', time: '5 minutes', reading: false },
    { name: 'Draw your favourite animal', materials: 'paper, crayons', time: '15 minutes', reading: false },
    { name: 'Sing the rhyme learned this week', materials: 'none', time: '5 minutes', reading: false }
  ];
  const DELIVERY_CHANNELS = ['Message', 'Printed sheet', 'Verbal at pickup'];
  const ACTIVITY_STATUSES = ['not asked', 'issued', 'done'];

  const familyEngagementRecords = {}; // name -> {ptm:{attended,meetingLabel,feedback,actionsAgreed}, activity:{...,status,deliveryChannel,language,confirmedBy}}

  (function loadFamilyEngagementRecords(){
    try {
      const raw = localStorage.getItem('familyEngagementRecords');
      if(raw) Object.assign(familyEngagementRecords, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — re-seeded below as needed */ }
  })();

  function saveFamilyEngagementRecords(){
    try { localStorage.setItem('familyEngagementRecords', JSON.stringify(familyEngagementRecords)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }

  // PTM attendance and home activity start EMPTY (nothing invented) —
  // they fill in only when a teacher records them.
  function getFamilyEngagement(name){
    if(!familyEngagementRecords[name]){
      familyEngagementRecords[name] = {
        ptm: { attended: null, meetingLabel: '', feedback: '', actionsAgreed: [] },
        activity: { name: '', materials: '', time: '', reading: false, status: '', deliveryChannel: '', language: '', confirmedBy: '' }
      };
    }
    return familyEngagementRecords[name];
  }
  // Remove entries the old generator invented (every field exactly as it
  // would have made them, untouched since). Anything a teacher changed stays.
  (function removeInventedEngagement(){
    let removed = 0;
    Object.keys(familyEngagementRecords || {}).forEach(name => {
      const r = familyEngagementRecords[name]; if(!r || !r.ptm || !r.activity) return;
      const act = HOME_ACTIVITY_POOL[Math.floor(sampleRand(name + 'actidx') * HOME_ACTIVITY_POOL.length)];
      const untouched = r.ptm.meetingLabel === 'Monthly meeting, month 2' && !r.ptm.feedback && !(r.ptm.actionsAgreed || []).length
        && r.ptm.attended === (sampleRand(name + 'ptmatt') > 0.35)
        && act && r.activity.name === act.name
        && r.activity.status === samplePick(name + 'actstatus', ACTIVITY_STATUSES)
        && r.activity.deliveryChannel === samplePick(name + 'delch', DELIVERY_CHANNELS)
        && r.activity.language === samplePick(name + 'actlang', ['Telugu', 'Hindi', 'Marathi'])
        && !r.activity.confirmedBy;
      if(untouched){ delete familyEngagementRecords[name]; removed++; }
    });
    if(removed){ try { localStorage.setItem('familyEngagementRecords', JSON.stringify(familyEngagementRecords)); } catch(e){} }
  })();

  function updateFamilyEngagementField(name, group, field, value){
    const rec = getFamilyEngagement(name);
    rec[group][field] = value;
    saveFamilyEngagementRecords();
  }
  function togglePtmAttendance(name){
    const rec = getFamilyEngagement(name);
    rec.ptm.attended = !rec.ptm.attended;
    saveFamilyEngagementRecords();
    renderFamilyParents(name);
  }
  function cycleActivityStatus(name){
    const rec = getFamilyEngagement(name);
    const idx = ACTIVITY_STATUSES.indexOf(rec.activity.status);
    rec.activity.status = ACTIVITY_STATUSES[(idx + 1) % ACTIVITY_STATUSES.length];
    saveFamilyEngagementRecords();
    renderFamilyParents(name);
  }

  function renderFamilyParents(selectedName){
    const container = document.getElementById('familyparents-body');
    container.innerHTML = '';
    container.appendChild(renderParentsTabBar('familyparents'));
    if(!ensurePupilsLoadedFor(container, () => renderFamilyParents(selectedName))) return;
        if(!ensureFamilyRecordsLoaded(() => renderFamilyParents(selectedName))) return;
    const realStudentNames = realPupilsCache.map(p => p.name);
    if(!realStudentNames.length){
      container.appendChild(mdCard(null, 'No pupils loaded for this class yet.', null));
      return;
    }
    const name = (selectedName && realStudentNames.includes(selectedName)) ? selectedName : realStudentNames[0];
    selectedFamilyChildName = name;
    const { f, isSample } = getFamilyRecordOrSample(name);

    container.appendChild(renderFamilyProfileImportCard());

    const pick = document.createElement('div'); pick.className = 'fbar';
    pick.innerHTML = `<div class="ctl"><label>Child</label><select id="famChildSel" style="padding:6px 10px; border:1px solid #0b0b0b33; border-radius:6px;"></select></div>
      <div class="grow" style="flex:1;"></div>
      <div>${f.consent ? mdPill('Consent recorded', 'good') : mdPill('Consent not recorded', 'crit')}
      ${f.photoConsent ? mdPill('Photo consent', 'good') : mdPill('No photo consent', 'warn')}</div>`;
    container.appendChild(pick);
    const sel = pick.querySelector('#famChildSel');
    realStudentNames.forEach(n => {
      const opt = document.createElement('option'); opt.value = n; opt.textContent = n;
      if(n === name) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.onchange = () => { familyManualEditOpen = false; renderFamilyParents(sel.value); };

    const manualToggleRow = document.createElement('div');
    manualToggleRow.style.cssText = 'margin-bottom:16px;';
    const manualToggleBtn = document.createElement('button');
    manualToggleBtn.textContent = familyManualEditOpen ? 'Cancel manual entry' : (isSample ? '+ Add this family\'s profile manually' : '✎ Edit this profile manually');
    manualToggleBtn.style.cssText = 'padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
    manualToggleBtn.onclick = toggleFamilyManualEdit;
    manualToggleRow.appendChild(manualToggleBtn);
    container.appendChild(manualToggleRow);

    if(familyManualEditOpen){
      container.appendChild(renderFamilyManualEntryCard(name));
      return; // form replaces the read-only view below until saved or cancelled
    }
    if(isSample){
      container.appendChild(attNote('No data available — ' + name + ' has no family profile yet. Add it with "+ Add this family\u2019s profile manually" above, or import the Family Profile sheet.'));
      return;
    }

    const g = document.createElement('div'); g.className = 'g g2';
    const householdBody = document.createElement('dl'); householdBody.className = 'kv';
    // Primary guardian's phone/occupation, pulled up into this card too
    // — the same values shown per-guardian on the right, but visible
    // here as well for a quick-glance summary without needing to read
    // the second card.
    const primaryGuardian = f.guardianNames.find(gd => gd.primary) || f.guardianNames[0];
    const primaryGuardianIdx = f.guardianNames.indexOf(primaryGuardian);
    const primaryOccupation = (f.guardians[primaryGuardianIdx] || {}).occ || '';
    // Real imports don't collect "walk to school" or a computed family-
    // structure/marital-status pair — those rows just don't render for
    // a real record rather than showing a made-up value. Income is
    // ONLY ever the band — no exact-figure row exists here at all,
    // real or sample.
    householdBody.innerHTML = `
      <dt>Locality</dt><dd>${esc(f.locality)}</dd>
      ${f.walk !== undefined ? `<dt>Walk to school</dt><dd>${f.walk} minutes</dd>` : ''}
      ${f.familyStructure !== undefined ? `<dt>Family structure</dt><dd>${esc(f.familyStructure)}${f.familyStructure !== 'Guardian' ? ' · ' + esc(f.maritalStatus) : ''}</dd>` : ''}
      <dt>Mother tongue</dt><dd>${esc(f.motherTongue)}</dd>
      <dt>Phone</dt><dd>${esc(primaryGuardian.phone) || '<span class="cap">Not given</span>'}</dd>
      <dt>Occupation</dt><dd>${esc(primaryOccupation) || '<span class="cap">Not given</span>'}</dd>
      <dt>Income band</dt><dd>${esc(f.income)}</dd>
      <dt>Languages at home</dt><dd>${esc(f.langs.join(', '))}</dd>
      <dt>Adult reads programme language</dt><dd>${f.reads ? 'Yes' : '<b>No</b> — guidance must be audio or pictorial (PTC-05)'}</dd>
      <dt>Household skills</dt><dd>${f.skills.length ? esc(f.skills.join(', ')) : '<span class="cap">None given</span>'}</dd>
      <dt>Home resources</dt><dd>${f.res.length ? esc(f.res.join(', ')) : '<span class="cap">None given</span>'}</dd>
      <dt>Siblings in programme</dt><dd>${f.siblings}</dd>
      ${f.complete !== undefined ? `<dt>Profile completeness</dt><dd>${f.complete}%</dd>` : ''}`;
    g.appendChild(mdCard('Household — ' + name + (isSample ? ' (sample)' : ''), isSample ? 'FAM-01 · no Google Form response imported yet for this child — showing representative sample data.' : 'FAM-01 · imported ' + esc(f.importedAt || '') + ' from the Google Form response.', householdBody));

    const guardianList = document.createElement('div'); guardianList.className = 'list';
    guardianList.innerHTML = f.guardianNames.map((gd, i) => `<div class="row"><div class="t"><b>${esc(gd.name)} · ${esc(gd.rel)}</b><span>${esc(f.guardians[i].occ) || '<span class="cap">Occupation not given</span>'} · ${esc(gd.edu) || '<span class="cap">Education not given</span>'} · ${esc(gd.phone) || '<span class="cap">No phone given</span>'}</span></div>
      <div>${gd.smart ? mdPill('Smartphone', 'good') : mdPill('Basic phone', 'warn')} ${gd.primary ? mdPill('Primary', 'info') : ''}</div></div>`).join('');
    g.appendChild(mdCard('Parents and guardians', 'FAM-02…04 · occupation and education on controlled lists.', guardianList));
    container.appendChild(g);

    // --- Parent-teacher meeting + Home activities this week ---
    const eng = getFamilyEngagement(name);
    const g2 = document.createElement('div'); g2.className = 'g g2'; g2.style.marginTop = '22px';

    const ptmBody = document.createElement('div');
    ptmBody.innerHTML = `
      <div class="row"><div class="t"><b>Attendance</b><span>${esc(eng.ptm.meetingLabel)}</span></div>
        <button onclick="togglePtmAttendance('${esc(name)}')" style="border:none; cursor:pointer;">${eng.ptm.attended ? mdPill('Attended', 'good') : mdPill('Did not attend', 'crit')}</button></div>
      <div class="row" style="align-items:flex-start;"><div class="t" style="flex:1;"><b>Parent feedback</b>
        <textarea onchange="updateFamilyEngagementField('${esc(name)}','ptm','feedback',this.value)" placeholder="The parent's own words, in their language" style="width:100%; margin-top:6px; padding:8px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; min-height:50px; box-sizing:border-box;">${esc(eng.ptm.feedback)}</textarea></div>
        <div>${eng.ptm.feedback ? mdPill('Recorded', 'good') : mdPill('None', 'neu')}</div></div>
      <div class="row" style="align-items:flex-start;"><div class="t" style="flex:1;"><b>Actions agreed</b>
        <input type="text" value="${esc(eng.ptm.actionsAgreed.join(', '))}" onchange="updateFamilyEngagementField('${esc(name)}','ptm','actionsAgreed',this.value.split(',').map(s=>s.trim()).filter(Boolean))" placeholder="Comma-separated, e.g. Read together 10 min a day" style="width:100%; margin-top:6px; padding:8px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;" /></div>
        <div>${eng.ptm.actionsAgreed.length ? mdPill(eng.ptm.actionsAgreed.length, 'info') : mdPill('None', 'neu')}</div></div>`;
    const ptmCard = mdCard('Parent-teacher meeting', 'PTM-02…05 · the parent\'s own words are recorded in their language.', ptmBody);
    g2.appendChild(ptmCard);

    const actStatusColor = { 'not asked': 'neu', 'issued': 'info', 'done': 'good' };
    const actStatusLabel = { 'not asked': 'Not asked', 'issued': 'Issued', 'done': 'Done' };
    const activityBody = document.createElement('div');
    activityBody.innerHTML = `
      <div class="row"><div class="t"><b>${esc(eng.activity.name)}</b><span>Materials: ${esc(eng.activity.materials)} · ${esc(eng.activity.time)} · ${eng.activity.reading ? 'reading needed' : 'no reading needed'}</span></div>
        <button onclick="cycleActivityStatus('${esc(name)}')" style="border:none; cursor:pointer;">${mdPill(actStatusLabel[eng.activity.status], actStatusColor[eng.activity.status])}</button></div>
      <dl class="kv" style="margin-top:10px;">
        <dt>Delivery channel</dt><dd><select onchange="updateFamilyEngagementField('${esc(name)}','activity','deliveryChannel',this.value)" style="padding:4px 8px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${DELIVERY_CHANNELS.map(c => `<option ${eng.activity.deliveryChannel === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></dd>
        <dt>Language</dt><dd><b>${esc(eng.activity.language)}</b></dd>
        <dt>Confirmed by</dt><dd>${eng.activity.confirmedBy ? esc(eng.activity.confirmedBy) : '—'}</dd>
      </dl>
      <p class="cap" style="margin:12px 0 0;">Compliance is reported as where support is needed, never as a family ranking (PTC-09).</p>`;
    const activityCard = mdCard('Home activities this week', 'PTC-02…07 · channel chosen from what this household actually has.', activityBody);
    g2.appendChild(activityCard);
    container.appendChild(g2);

    // --- Class-wide family engagement ---
    const allEngagement = realStudentNames.map(n => ({ name: n, eng: getFamilyEngagement(n) }));
    const activityCompliancePct = Math.round(allEngagement.filter(x => x.eng.activity.status !== 'not asked').length / allEngagement.length * 100);
    const ptmAttendancePct = Math.round(allEngagement.filter(x => x.eng.ptm.attended).length / allEngagement.length * 100);
    const notEngaged = allEngagement.filter(x => !x.eng.ptm.attended && x.eng.activity.status !== 'done');

    container.appendChild(mdSec('Class-wide family engagement', '<span class="reqs">PTC-08/09 · PTM-07</span>'));
    const engGrid = document.createElement('div');
    engGrid.style.cssText = 'display:grid; grid-template-columns:' + (window.innerWidth < 900 ? '1fr' : 'repeat(3,1fr)') + '; gap:16px;';

    const donut = (pct, label, sub, color) => {
      const r = 42, c = 2 * Math.PI * r;
      const offset = c * (1 - pct / 100);
      return `<div class="card" style="padding:22px; text-align:center;">
        <h4 style="margin:0 0 14px; text-align:left;">${esc(label)}</h4>
        <svg viewBox="0 0 100 100" style="width:140px; height:140px;">
          <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--bg)" stroke-width="10"></circle>
          <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 50 50)"></circle>
          <text x="50" y="47" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text)">${pct}%</text>
          <text x="50" y="63" text-anchor="middle" font-size="8" fill="var(--text-muted)">${esc(sub)}</text>
        </svg>
      </div>`;
    };
    const donutWrap = document.createElement('div');
    donutWrap.innerHTML = donut(activityCompliancePct, 'Home activity compliance', 'households', 'var(--primary)') + donut(ptmAttendancePct, 'PTM attendance', 'this month', 'var(--success)');
    Array.from(donutWrap.children).forEach(c => engGrid.appendChild(c));

    const notEngagedCard = document.createElement('div');
    notEngagedCard.className = 'card'; notEngagedCard.style.padding = '22px';
    notEngagedCard.innerHTML = `<h4 style="margin:0 0 4px;">Households not engaged</h4>
      <p class="cap" style="margin:0 0 14px;">PTC-08 · did not attend the PTM and haven't completed a home activity.</p>
      ${notEngaged.length ? notEngaged.map(x => `<div class="row" style="cursor:pointer;" onclick="renderFamilyParents('${esc(x.name)}')">
          <div class="t"><b>${esc(x.name)}</b><span>${sampleHousehold(x.name).reads ? 'reads' : 'no literate adult'} · ${esc(x.eng.activity.deliveryChannel)}</span></div>
          <div>${x.eng.activity.status === 'not asked' ? mdPill('not asked', 'warn') : mdPill('not done', 'crit')}</div>
        </div>`).join('') : '<p class="cap">Every household is engaged on at least one front.</p>'}`;
    engGrid.appendChild(notEngagedCard);
    container.appendChild(engGrid);

    // --- Household Contacts — every household's contact details,
    // pulled up from real data where imported / sampleHousehold as a
    // fallback otherwise. Lives here specifically (not on Parent
    // Volunteers) — that tab is exclusively the willing-to-volunteer
    // filtered list, this tab is everyone.
    renderHouseholdProfilesSection(container);
  }

  // ---------- 6. CHECK ATTENDANCE ----------
  // Matches vTeacherAttCheck: a fuller monthly register than the plain
  // Attendance Register — distinguishes "not yet admitted" (dot) from
  // "no register taken yet" (dash) from actual P/A marks, plus a
  // footer row of daily present-of-roll totals.
  // Two small bar charts, side by side, each capped at 50% width —
  // weekly from THIS page's own data (so it can never disagree with
  // the day-by-day table below it), monthly from the real cross-month
  // attendanceRecords store (the only place multiple real months
  // actually exist — this page only ever shows one month at a time).
  // Shared "two chart cards, side by side, 50% each" building block —
  // used everywhere weekly/monthly attendance trends are shown, so
  // there's one real implementation of the layout, not a copy per
  // screen that can drift out of sync with the others.
  function renderSmallBarChart(data, title, note){
    const w = 320, h = 150, padL = 28, padR = 10, padT = 14, padB = 24;
    const gap = (w - padL - padR) / data.length;
    const barW = gap * 0.55;
    const bars = data.map((d, i) => {
      const x = padL + i * gap + (gap - barW) / 2;
      const val = d.pct === null ? 0 : d.pct;
      const barH = (h - padT - padB) * (val / 100);
      const y = h - padB - barH;
      const color = d.pct === null ? 'var(--border)' : val >= 85 ? 'var(--success)' : val >= 70 ? '#EE8F35' : 'var(--danger,#c8433f)';
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(barH, 1).toFixed(1)}" fill="${color}" rx="3"></rect>
        <text x="${(x + barW/2).toFixed(1)}" y="${(y - 5).toFixed(1)}" font-size="10" text-anchor="middle" fill="var(--text)">${d.pct === null ? '—' : d.pct}</text>
        <text x="${(x + barW/2).toFixed(1)}" y="${h - 6}" font-size="10" text-anchor="middle" fill="var(--text-muted)">${esc(d.label)}</text>`;
    }).join('');
    const card = document.createElement('div');
    card.className = 'card'; card.style.padding = '18px';
    card.innerHTML = `<h4 style="margin:0 0 4px; font-size:13px;">${esc(title)}</h4>
      <p class="cap" style="margin:0 0 10px;">${esc(note)}</p>
      <svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">
        <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="var(--border)"></line>
        ${bars}
      </svg>`;
    return card;
  }

  // Rolls a register's per-day marks (rows[].marks, teachingDays wide)
  // into Monday–Friday teaching weeks. Shared by every screen that
  // shows a weekly breakdown, so it can never disagree with whichever
  // day-by-day grid it was computed from.
  function computeWeeklyAttendanceData(rows, teachingDays){
    const weekSize = 5;
    const weekCount = Math.ceil(teachingDays / weekSize);
    return Array.from({length: weekCount}, (_, wi) => {
      const start = wi * weekSize, end = Math.min(start + weekSize, teachingDays);
      let present = 0, marked = 0;
      rows.forEach(r => {
        for(let i = start; i < end; i++){
          const m = r.marks[i];
          if(m === '·') continue;
          marked++;
          if(m === 'P') present++;
        }
      });
      return { label: 'Wk ' + (wi + 1), pct: marked ? Math.round(present / marked * 100) : null };
    });
  }

  // Real attendanceRecords, one point per academic month so far this
  // year — the only place multiple real months of data actually exist,
  // so every "monthly" chart app-wide pulls from here.
  function computeMonthlyAttendanceData(year){
    const now = new Date();
    const curIdx = ACADEMIC_MONTHS.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS.slice(0, ACADEMIC_MONTHS.indexOf(calendarMonth) + 1);
    return monthsSoFar.map(m => {
      const s = computeAttendanceDashboardStats(year, m);
      return { label: new Date(2000, m, 1).toLocaleDateString([], {month:'short'}), pct: s.hasData ? s.attendancePct : null };
    });
  }

  // The two cards together, at exactly 50% width each on desktop
  // (stacking to one column on narrow screens) — this is the layout
  // itself, reused wherever weekly + monthly attendance trends appear.
  function renderAttendanceTrendCards(container, weekData, monthData){
    container.appendChild(mdSec('Attendance trends', '<span class="reqs">REG-15 · REP-08/09</span>'));
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:' + (window.innerWidth < 700 ? '1fr' : 'repeat(2,1fr)') + '; gap:16px; margin-bottom:22px;';
    grid.appendChild(renderSmallBarChart(weekData, 'Weekly attendance', 'Rolled up Monday–Friday into teaching weeks.'));
    grid.appendChild(renderSmallBarChart(monthData, 'Monthly attendance', 'Real marked days, month by month this academic year.'));
    container.appendChild(grid);
  }

  function renderCheckAttendanceTrends(container, rows, teachingDays){
    renderAttendanceTrendCards(container, computeWeeklyAttendanceData(rows, teachingDays), computeMonthlyAttendanceData(calendarYear));
  }

  function renderCheckAttendance(targetEl){
    const container = targetEl || document.getElementById('checkattendance-body');
    if(!targetEl){ container.innerHTML = ''; renderTeacherFilterBar(container, renderCheckAttendance); }
    const teachingDays = 22;
    const enrolled = SAMPLE_STUDENTS.length;
    const todaysRecords = attendanceRecords[todayKey()] || {}; // same real data as the Register tab's "Today" column
    const rows = SAMPLE_STUDENTS.map((name, i) => {
      const admittedFrom = (i === SAMPLE_STUDENTS.length - 1) ? Math.floor(teachingDays * 0.4) : 0; // last child = a mid-month admission, for realism
      const marks = Array.from({length: teachingDays}, (_, d) => {
        if(d < admittedFrom) return '·';
        return sampleRand(name + 'chk' + d) > 0.1 ? 'P' : 'A';
      });
      const todayStatus = todaysRecords[name];
      marks[teachingDays - 1] = todayStatus === 'present' ? 'P' : todayStatus === 'absent' ? 'A' : '·';
      const markedDays = marks.filter(m => m !== '·').length;
      const pres = marks.filter(m => m === 'P').length;
      return { name, marks, pres, markedDays, pct: markedDays ? Math.round(pres / markedDays * 100) : null };
    });
    const ada = Math.round(rows.reduce((a, r) => a + r.pres, 0) / teachingDays * 10) / 10;
    const overallPct = Math.round(rows.reduce((a, r) => a + (r.pct || 0), 0) / rows.length);
    const below70 = rows.filter(r => r.pct !== null && r.pct < 70).length;

    container.appendChild(mdSec('Check Attendance — this month', '<span class="reqs">REG-15 · CAL-13</span>'));
    container.appendChild(mdGrid('g4', [
      mdTile('On roll', enrolled, 'end of month', mdPill('+1 this month', 'info'), 'ADB-12'),
      mdTile('Average daily attendance', ada, 'children', mdPill('the effective strength', 'good'), 'ADB-14', mdMeter(ada / enrolled * 100)),
      mdTile('Attendance', overallPct, '% present', mdPill(mdStatusBand(overallPct).l, mdStatusBand(overallPct).c), 'REG-05', mdMeter(overallPct)),
      mdTile('Below 70%', below70, 'children', mdPill('follow-up list', 'warn'), 'REG-06')
    ]));

    renderCheckAttendanceTrends(container, rows, teachingDays);

    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th>' +
      Array.from({length: teachingDays}, (_, i) => `<th>${i === teachingDays - 1 ? 'Today' : i+1}</th>`).join('') + '<th>%</th></tr></thead><tbody>';
    rows.forEach(r => {
      const cells = r.marks.map((m, i) => {
        if(m === '·') return `<td style="text-align:center;" title="${i === teachingDays - 1 ? 'not marked yet today' : 'not yet admitted'}"><span class="dim">·</span></td>`;
        return `<td style="text-align:center;">${m === 'P' ? '<span class="pill good">P</span>' : '<span class="pill crit">A</span>'}</td>`;
      }).join('');
      table += `<tr><td style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(r.name)}')"><b>${esc(r.name)}</b></td>${cells}<td><b>${r.pct === null ? '—' : r.pct + '%'}</b></td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'A dot is a day before that child was admitted, or today if it hasn\'t been marked yet — neither is an absence, and both are excluded from her denominator (ADB-13). The "Today" column is real — it\'s exactly what\'s been marked in Enter › Attendance. Tap a child\'s name for her full record.', wrap));
  }

  // ---------- 7. ADMISSIONS ----------
  // Matches vTeacherAdmissions: on-roll/June-start/mid-year/no-baseline
  // tiles, an explanatory note, and the every-admission table — now
  // backed by a real admissionRecords store instead of a fixed
  // juneStart/midYear split, so a teacher can actually add a child
  // through the form below and see her appear everywhere for real.
  function sampleAdmissionExtra(name){
    return {
      dob: samplePick(name + 'dob', ['2022-04-12', '2021-09-03', '2022-01-27', '2021-06-18', '2022-11-09']),
      gender: samplePick(name + 'gender', ['Female', 'Male']),
      address: samplePick(name + 'addr', ['Ambedkar Nagar, Sion', 'Kamgar Vasahat, Sion', 'Shanti Nagar, Wadala', 'Ganesh Nagar, Wadala']),
      speciallyAbled: sampleRand(name + 'sabled') > 0.92,
      previouslyStudied: sampleRand(name + 'prev') > 0.6 ? samplePick(name + 'prevwhere', ['Anganwadi', 'Private preschool']) : 'None'
    };
  }

  // name -> {address, dob, gender, speciallyAbled, prevStudied,
  //   prevSchool, prevStandard, prevBoard, prevReason, admittedDate,
  //   startOfYear, baseline}
  const admissionRecords = {};

  (function loadAdmissionRecords(){
    try {
      const raw = localStorage.getItem('admissionRecords');
      if(raw) Object.assign(admissionRecords, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — re-seeded below */ }
  })();

/* ===== teacher-part-07.js ===== */
/* =========================================================================
   teacher-part-07.js — part 7 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  function saveAdmissionRecords(){
    try { localStorage.setItem('admissionRecords', JSON.stringify(admissionRecords)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }

  function saveExtraAdmittedStudent(name){
    try {
      const raw = localStorage.getItem('extraAdmittedStudents');
      const list = raw ? JSON.parse(raw) : [];
      if(!list.includes(name)) list.push(name);
      localStorage.setItem('extraAdmittedStudents', JSON.stringify(list));
    } catch(e){ /* stays in-memory for this session only */ }
  }

  // The original 5 sample students get seeded, representative admission
  // details the first time this loads (same generator the old fake
  // juneStart/midYear split used), so "Every admission" has something
  // real-shaped even before a teacher has added anyone through the
  // form. Only fills in what's missing — never overwrites a real entry.
  // Prototype children (SAMPLE_STUDENTS) are no longer seeded into the
  // admission details; any seeded earlier are removed here. Real
  // entries (the teacher's own) are never touched.
  (typeof SAMPLE_STUDENTS !== 'undefined' ? SAMPLE_STUDENTS : []).forEach(name => {
    const r = admissionRecords[name];
    if(r && r.baseline && r.startOfYear && r.admittedDate === '2026-06-01') delete admissionRecords[name];
  });
  saveAdmissionRecords();

  function computeAgeFromDob(dobStr){
    if(!dobStr) return null;
    const dob = new Date(dobStr + 'T00:00:00');
    if(isNaN(dob)) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const hadBirthdayThisYear = (now.getMonth() > dob.getMonth()) || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
    if(!hadBirthdayThisYear) age--;
    return age;
  }

  let receiptPruneCheckedThisLoad = false;

  async function pruneDeletedReceipts(){
    if(receiptPruneCheckedThisLoad || !Array.isArray(realPupilsCache)) return;
    receiptPruneCheckedThisLoad = true;
    const withReceipts = realPupilsCache.filter(p => p.receipt_drive_file_id);
    if(!withReceipts.length) return;
    const existing = await checkDriveFilesStillExist(withReceipts.map(p => p.receipt_drive_file_id));
    if(existing === null) return;
    const gone = withReceipts.filter(p => !existing.has(p.receipt_drive_file_id));
    if(!gone.length) return;
    // Persisted server-side (not just local state) — receipts live on
    // the pupils table, so a stale reference needs clearing there too,
    // not just hidden from this one screen.
    await Promise.all(gone.map(p => fetch('backend/pupils/clear_pupil_receipt.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ pupil_id: p.id })
    }).catch(() => {})));
    realPupilsCache = null;
    if(document.getElementById('admissions-body') && !document.getElementById('admissions-body').classList.contains('hidden')) renderAdmissions();
  }

  function renderAdmissions(){
    const container = document.getElementById('admissions-body');
    container.innerHTML = '';

    if(!ensurePupilsLoadedFor(container, renderAdmissions)) return;
    pruneDeletedReceipts(); // background check — self-corrects via re-render above if any receipt's actually gone

    const total = realPupilsCache.length;
    // "Admitted at term start" = whoever shares the earliest admitted_date
    // in the roster, rather than a separate stored flag — the earliest
    // date IS the term-start cohort, by definition.
    const termStartDate = total ? realPupilsCache.reduce((min, p) => p.admitted_date < min ? p.admitted_date : min, realPupilsCache[0].admitted_date) : null;
    const startOfYearPupils = realPupilsCache.filter(p => p.admitted_date === termStartDate);
    const midYearPupils = realPupilsCache.filter(p => p.admitted_date !== termStartDate);

    container.appendChild(mdSec('Admissions', '<span class="reqs">ADB-11…16</span>'));
    const admTiles = mdGrid('g3', [
      mdTile('On roll now', total, 'children', mdPill(myClassInfo.class_name, 'neu'), 'ADB-11'),
      mdTile('Admitted at the start', startOfYearPupils.length, total ? new Date(termStartDate + 'T00:00:00').toLocaleDateString([], {month:'long', year:'numeric'}) : '', mdPill(total ? Math.round(startOfYearPupils.length/total*100) + '% of the class' : '—', 'neu'), 'ADB-11'),
      mdTile('Admitted during the year', midYearPupils.length, 'after term start', mdPill(total ? Math.round(midYearPupils.length/total*100) + '% of the class' : '—', 'info'), 'ADB-12')
    ]);
    admTiles.style.marginBottom = '0';
    container.appendChild(admTiles);

    // ---- Admissions month by month (from each child's real admission date) ----
    container.appendChild(admSpace(admMonthAnalysisCard(realPupilsCache)));

    // ---- Import children: photo · file · enter manually ----
    container.appendChild(admSpace(renderSmartImportCard('roll')));
    container.appendChild(importDownloadCard('roll')); // stays at the end of the page

    // ---- Edit an admission — shown only while editing a child (Edit in "Every admission").
    // New children are added from the import card above (✍ Enter manually). ----
    const editingPupil = editingPupilId ? realPupilsCache.find(p => p.id === editingPupilId) : null;
    if(editingPupil){
      const admFormEl = renderAddAdmissionForm(editingPupil);
      admFormEl.setAttribute('data-no-export', '1');
      admFormEl.style.margin = '0';
      container.appendChild(admSpace(admFold('form', '✏️ Edit admission — ' + editingPupil.name, 'Change this child\u2019s details and save.', admFormEl, true)));
    }

    // ---- Every admission — the full list, folded ----
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr>' +

      '<th>Child</th><th>Admitted</th><th>DOB (Age)</th><th>Gender</th><th>Address</th><th>Previously studied</th><th>Specially abled</th><th>Receipt</th><th></th></tr></thead><tbody>';

    realPupilsCache.forEach(p => {

      const age = computeAgeFromDob(p.dob);

      const how = p.admitted_date === termStartDate ? 'Start of year' : 'Mid-year admission';

      const prevText = p.prev_studied

        ? [p.prev_school, p.prev_standard, p.prev_board].filter(Boolean).join(', ') || 'Yes'

        : 'None';

      table += `<tr>

        <td style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(p.name)}')"><b>${esc(p.name)}</b></td>

        <td>${p.admitted_date ? esc(p.admitted_date) : '—'} · ${esc(how)}</td>

        <td>${p.dob ? esc(p.dob) + (age !== null ? ' (' + age + ')' : '') : '—'}</td>

        <td>${esc(p.gender || '—')}</td>

        <td class="dim">${esc(p.address || '—')}</td>

        <td>${esc(prevText)}${p.prev_studied && p.prev_reason ? ' — ' + esc(p.prev_reason) : ''}</td>

        <td>${p.specially_abled ? mdPill('Yes', 'info') : 'No'}</td>

        <td>${p.receipt_drive_link ? `<a href="${esc(p.receipt_drive_link)}" target="_blank" rel="noopener">View</a>` : '<span class="cap">None</span>'}</td>

        <td style="white-space:nowrap;">

          <button onclick="editAdmission(${p.id})" title="Edit ${esc(p.name)}'s details" style="padding:6px 10px; border-radius:6px; border:1px solid var(--border); background:#fff; font-size:12px; cursor:pointer; margin-right:4px;">✎</button>

          <button onclick="removePupilFromRoster(${p.id}, '${esc(p.name).replace(/'/g, "\\'")}')" title="Remove ${esc(p.name)} from the roster" style="padding:6px 10px; border-radius:6px; border:1px solid var(--border); background:#fff; color:var(--danger, #c8433f); font-size:12px; cursor:pointer;">🗑</button>

        </td>

      </tr>`;

    });

    table += '</tbody></table></div>';

    const wrap = document.createElement('div'); wrap.innerHTML = table;
    const listCard = mdCard(null, 'Workbooks and TLM entitlement follow the child\'s own admission date, not the June headcount.', wrap);
    listCard.style.margin = '0'; listCard.style.boxShadow = 'none'; listCard.style.border = 'none'; listCard.style.padding = '0';
    container.appendChild(admSpace(admFold('list', '📋 Every admission — ' + total + ' child' + (total === 1 ? '' : 'ren'), 'The full list with admission date, age, address, previous school and receipt — edit or remove from here.', listCard)));

    // ---- Why this screen exists — folded ----
    const whyBody = document.createElement('p'); whyBody.style.margin = '0'; whyBody.style.lineHeight = '1.55';
    whyBody.textContent = 'The roll is not a number set in June. Children arrive all year — families move into the area, a child turns four, an anganwadi refers one across. Every attendance, assessment and curriculum figure has a denominator that changes underneath it, and a portal that stores one enrolment count will report all of them wrongly for the rest of the year.', null;
    container.appendChild(admSpace(admFold('why', 'ℹ️ Why this screen exists', 'Why the roll is tracked child by child, all year.', whyBody)));

    // Collapsed by default — same "See reports" convention as Class
    // Attendance, so this screen doesn't default to being very long.
    const admReportsToggleCard = document.createElement('div');
    admReportsToggleCard.className = 'card'; admReportsToggleCard.style.cssText = 'padding:0; margin-top:22px; overflow:hidden;';
    admReportsToggleCard.innerHTML = `
      <div onclick="admissionsReportsOpen = !admissionsReportsOpen; this.nextElementSibling.classList.toggle('hidden', !admissionsReportsOpen); this.querySelector('.chevron').style.transform = admissionsReportsOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:16px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📊 See reports</h3>
          <p class="cap" style="margin:0;">Admissions trends across the year, generated from the real roster above.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${admissionsReportsOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${admissionsReportsOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    container.appendChild(admReportsToggleCard);
    const admReportsBody = admReportsToggleCard.querySelector('div:last-child');
    admReportsBody.appendChild(reportDownloadBar(() => document.getElementById('admissions-body'), 'Admissions — ' + (myClassInfo.class_name || ''), 'admissions', 'Every admission, the roll counts and admissions across the year.'));
    renderAdmissionsAcrossYear(admReportsBody, calendarYear);
  }

  // ---- Admissions screen helpers ----
  var admFoldOpen = { form: false, list: false, why: false };
  function admSpace(el){ el.style.marginTop = '22px'; return el; }
  function admFold(key, title, sub, bodyEl, forceOpen){
    const open = forceOpen || admFoldOpen[key];
    const card = document.createElement('div');
    card.className = 'card'; card.style.cssText = 'padding:0; overflow:hidden;';
    card.id = 'admFold-' + key;
    card.innerHTML = `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 20px; cursor:pointer;">
        <div><h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">${esc(title)}</h3><p class="cap" style="margin:0;">${esc(sub)}</p></div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; transform:rotate(${open ? 90 : 0}deg);">▶</span></div>
      <div class="${open ? '' : 'hidden'}" style="padding:4px 20px 20px;"></div>`;
    card.lastElementChild.appendChild(bodyEl);
    card.firstElementChild.onclick = () => {
      admFoldOpen[key] = !admFoldOpen[key];
      card.lastElementChild.classList.toggle('hidden', !admFoldOpen[key]);
      card.querySelector('.chevron').style.transform = 'rotate(' + (admFoldOpen[key] ? 90 : 0) + 'deg)';
    };
    return card;
  }
  // "✍ Enter manually" on the import card: open the form and go to it.
  function admOpenManualEntry(){
    editingPupilId = null;
    admFoldOpen.form = true;
    renderAdmissions();
    const f = document.getElementById('admFold-form');
    if(f && f.scrollIntoView) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // Admissions month by month, from each child's real admission date.
  function admMonthAnalysisCard(pupils){
    const byMonth = {};
    pupils.forEach(p => { if(!p.admitted_date) return; const k = String(p.admitted_date).slice(0, 7); (byMonth[k] = byMonth[k] || []).push(p); });
    const keys = Object.keys(byMonth).sort();
    const wrap = document.createElement('div');
    if(!keys.length){
      wrap.innerHTML = '<p class="cap" style="margin:0;">No data available — no admission dates have been recorded yet.</p>';
      return mdCard('📈 Admissions month by month', null, wrap);
    }
    // every month from the first admission up to this month, so gaps show as 0
    const months = []; const [fy, fm] = keys[0].split('-').map(Number); const now = new Date();
    for(let d = new Date(fy, fm - 1, 1); d <= now || months.length === 0; d.setMonth(d.getMonth() + 1)){ months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); if(months.length > 24) break; }
    keys.forEach(k => { if(!months.includes(k)) months.push(k); }); months.sort();
    const max = Math.max(...months.map(k => (byMonth[k] || []).length));
    const label = k => new Date(k + '-01T00:00:00').toLocaleDateString([], { month: 'long', year: 'numeric' });
    const top = months.filter(k => (byMonth[k] || []).length === max).map(label);
    const after = pupils.filter(p => p.admitted_date && String(p.admitted_date).slice(0, 7) !== keys[0]).length;
    const recent = months.slice(-3).reduce((a, k) => a + (byMonth[k] || []).length, 0);
    let rows = '';
    months.forEach(k => {
      const n = (byMonth[k] || []).length, isTop = n === max && n > 0;
      const names = (byMonth[k] || []).slice(0, 4).map(p => esc(p.name)).join(', ') + ((byMonth[k] || []).length > 4 ? ' …' : '');
      rows += `<tr${isTop ? ' style="background:var(--bg);"' : ''}><td style="text-align:left;"><b>${esc(label(k))}</b>${isTop ? ' ' + mdPill('Highest', 'good') : ''}</td><td>${n}</td>`
        + `<td style="text-align:left; min-width:160px;"><div style="height:10px; border-radius:5px; background:var(--primary); width:${max ? Math.max(n ? 6 : 0, Math.round(n / max * 100)) : 0}%;"></div></td>`
        + `<td style="text-align:left;" class="cap">${n ? names : '—'}</td></tr>`;
    });
    wrap.innerHTML = `<p style="margin:0 0 12px;"><b>Most admissions:</b> ${esc(top.join(', '))} (${max} child${max === 1 ? '' : 'ren'}). <b>${after}</b> admitted after the first month · <b>${recent}</b> in the last 3 months.</p>
      <div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Month</th><th>Admitted</th><th style="text-align:left;"></th><th style="text-align:left;">Children</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return mdCard('📈 Admissions month by month', 'From each child\u2019s admission date — months with no admissions show 0.', wrap);
  }

  let editingPupilId = null; // null = adding a new admission; a pupil id = editing that existing one
  let admReceiptDriveLink = null; // set once handleAdmReceiptSelected finishes uploading, read by submitAdmissionForm below
  let admReceiptDriveFileId = null;

  function renderAddAdmissionForm(editingPupil){
    const fld = 'width:100%; padding:11px 12px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;';
    const lbl = 'font-size:10.5px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px; display:block;';
    const p = editingPupil || {};
    const genderSel = (val) => `<option value="Female" ${val === 'Female' ? 'selected' : ''}>Female</option><option value="Male" ${val === 'Male' ? 'selected' : ''}>Male</option>`;
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.padding = '28px';
    wrap.innerHTML = `
      <div id="admFormError" class="cap" style="color:var(--danger,#c8433f); margin-bottom:18px; display:none;"></div>
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:24px 28px;">
        <div><label style="${lbl}">Name of the student</label><input id="admFormName" type="text" placeholder="Full name" value="${esc(p.name || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Address</label><input id="admFormAddress" type="text" placeholder="Locality, area" value="${esc(p.address || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Date of birth</label><input id="admFormDob" type="date" value="${esc(p.dob || '')}" oninput="updateAdmFormAge()" style="${fld}" /></div>
        <div><label style="${lbl}">Age</label><input id="admFormAge" type="text" readonly placeholder="Calculated from date of birth" value="${p.dob ? (computeAgeFromDob(p.dob) ?? '') + ' years' : ''}" style="${fld} background:var(--bg); color:var(--text-muted);" /></div>
        <div><label style="${lbl}">Gender</label><select id="admFormGender" style="${fld}">${genderSel(p.gender)}</select></div>
        <div><label style="${lbl}">Specially abled</label><select id="admFormSpeciallyAbled" style="${fld}"><option value="no" ${!p.specially_abled ? 'selected' : ''}>No</option><option value="yes" ${p.specially_abled ? 'selected' : ''}>Yes</option></select></div>
        <div><label style="${lbl}">Previously studied elsewhere</label><select id="admFormPrevStudied" onchange="toggleAdmFormPrevBlock()" style="${fld}"><option value="no" ${!p.prev_studied ? 'selected' : ''}>No</option><option value="yes" ${p.prev_studied ? 'selected' : ''}>Yes</option></select></div>
        <div><label style="${lbl}">Date of admission</label><input id="admFormAdmittedDate" type="date" value="${esc(p.admitted_date || todayDateKey())}" style="${fld}" /></div>
      </div>
      <div id="admFormPrevBlock" style="display:${p.prev_studied ? 'grid' : 'none'}; grid-template-columns:repeat(2,1fr); gap:24px 28px; margin-top:24px; padding-top:24px; border-top:1px solid var(--border);">
        <div><label style="${lbl}">Previous school</label><input id="admFormPrevSchool" type="text" placeholder="School name" value="${esc(p.prev_school || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Previous standard</label><input id="admFormPrevStandard" type="text" placeholder="e.g. Nursery, Jr KG" value="${esc(p.prev_standard || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Board</label><input id="admFormPrevBoard" type="text" placeholder="e.g. State board" value="${esc(p.prev_board || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Reason for leaving</label><input id="admFormPrevReason" type="text" placeholder="e.g. family relocated" value="${esc(p.prev_reason || '')}" style="${fld}" /></div>
      </div>
      <div style="margin-top:24px; padding-top:24px; border-top:1px solid var(--border);">
        <label style="${lbl}">Admission receipt</label>
        <p class="cap" style="margin:0 0 10px;">Photo or scan of the signed admission receipt, if one was issued — uploads straight to your connected Google Drive.</p>
        <label id="admReceiptBox" style="display:flex; align-items:center; gap:10px; padding:14px 16px; border:1.5px dashed var(--border); border-radius:10px; background:var(--bg); cursor:pointer; max-width:420px;">
          <span style="font-size:20px; line-height:1;">${admReceiptDriveLink ? '✓' : '+'}</span>
          <span id="admReceiptLabel" style="font-size:13px; font-weight:600;">${admReceiptDriveLink ? '✓ Receipt attached — tap to replace' : 'Add a photo or scan of the receipt'}</span>
          <input id="admFormReceipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style="display:none;" onchange="handleAdmReceiptSelected(this)" />
        </label>
        ${admReceiptDriveLink ? `<p class="cap" style="margin:6px 0 0;"><a href="${esc(admReceiptDriveLink)}" target="_blank" rel="noopener">View current receipt in Drive</a></p>` : ''}
      </div>
      <div style="margin-top:28px; padding-top:20px; border-top:1px solid var(--border); display:flex; gap:10px;">
        <button onclick="submitAdmissionForm()" class="btn-primary" style="width:auto; padding:11px 24px;">${editingPupil ? 'Save changes' : 'Add admission'}</button>
        ${editingPupil ? `<button onclick="cancelEditAdmission()" style="padding:11px 20px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:13px; font-weight:600; cursor:pointer;">Cancel</button>` : ''}
      </div>
    `;
    return wrap;
  }

  function editAdmission(pupilId){
    editingPupilId = pupilId;
    // Pre-fill from her existing record, if she already has a receipt
    // on file — so re-submitting the form (e.g. after fixing another
    // field) doesn't silently wipe it out.
    const pupil = realPupilsCache.find(p => p.id === pupilId);
    admReceiptDriveLink = (pupil && pupil.receipt_drive_link) || null;
    admReceiptDriveFileId = (pupil && pupil.receipt_drive_file_id) || null;
    renderAdmissions();
    // Scroll the form into view — it's mid-page, easy to miss otherwise.
    setTimeout(() => { const el = document.getElementById('admFormError'); if(el) el.closest('.card').scrollIntoView({behavior:'smooth', block:'center'}); }, 50);
  }
  function cancelEditAdmission(){
    editingPupilId = null;
    admReceiptDriveLink = null;
    admReceiptDriveFileId = null;
    renderAdmissions();
  }

  // Named after the child, same convention as materials/attendance
  // photos elsewhere in this app (renameFileTo) — several receipts
  // sitting in the same "Admissions" Drive folder are otherwise
  // indistinguishable by filename alone (e.g. every phone photo just
  // calls itself "IMG_2041.jpg"). compressImageFile is a no-op for a
  // PDF (it can't be decoded as an image, so it resolves unchanged) —
  // safe to run regardless of which file type was picked.
  async function handleAdmReceiptSelected(inputEl){
    const label = document.getElementById('admReceiptLabel');
    const file = inputEl.files && inputEl.files[0];
    if(!label || !file) return;

    const nameEl = document.getElementById('admFormName');
    const studentName = (nameEl && nameEl.value.trim()) || 'Admission Receipt';

    label.textContent = 'Uploading to Google Drive…';
    const compressedFile = renameFileTo(await compressImageFile(file), studentName);
    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('folder_path', 'Admissions');

    try{
      const res = await fetch('backend/drive/upload_to_drive.php' + window.location.search, { method: 'POST', body: formData });
      const data = await res.json();
      if(data.status === 'success'){
        admReceiptDriveLink = data.link;
        admReceiptDriveFileId = data.file_id;
        label.textContent = '✓ ' + compressedFile.name + ' — tap to replace';
      } else {
        label.textContent = data.message || 'Upload failed — tap to try again';
      }
    } catch(err){
      label.textContent = 'Could not reach the server — tap to try again';
    }
  }

  function updateAdmFormAge(){
    const dobEl = document.getElementById('admFormDob');
    const ageEl = document.getElementById('admFormAge');
    if(!dobEl || !ageEl) return;
    const age = computeAgeFromDob(dobEl.value);
    ageEl.value = age === null ? '' : age + (age === 1 ? ' year' : ' years');
  }

  function toggleAdmFormPrevBlock(){
    const sel = document.getElementById('admFormPrevStudied');
    const block = document.getElementById('admFormPrevBlock');
    if(sel && block) block.style.display = sel.value === 'yes' ? 'grid' : 'none';
  }

  async function submitAdmissionForm(){
    const val = id => (document.getElementById(id).value || '').trim();
    const name = val('admFormName');
    const address = val('admFormAddress');
    const dob = val('admFormDob');
    const gender = document.getElementById('admFormGender').value;
    const speciallyAbled = document.getElementById('admFormSpeciallyAbled').value === 'yes';
    const prevStudied = document.getElementById('admFormPrevStudied').value === 'yes';
    const prevSchool = val('admFormPrevSchool');
    const prevStandard = val('admFormPrevStandard');
    const prevBoard = val('admFormPrevBoard');
    const prevReason = val('admFormPrevReason');
    const admittedDate = val('admFormAdmittedDate') || todayDateKey();
    // Receipt is still client-side metadata only, same honest gap as
    // before this form wrote to the real pupils table — there's no
    // upload endpoint or storage column for it yet. Worth wiring to
    // the same upload_to_drive.php that photo evidence already uses,
    // if that's wanted next.

    const isEditing = !!editingPupilId;
    const errorEl = document.getElementById('admFormError');
    const showError = (msg) => { errorEl.textContent = msg; errorEl.style.display = 'block'; };
    errorEl.style.display = 'none';

    if(!name) return showError('Name of the student is required.');
    // When editing, her own current name obviously shouldn't count as
    // a duplicate — only check against everyone ELSE on the roster.
    const nameTaken = assessmentPupilNames().some((n, i) => n === name && (!isEditing || realPupilsCache[i].id !== editingPupilId));
    if(nameTaken) return showError('A student with this exact name is already on the roll.');
    if(!dob) return showError('Date of birth is required, to calculate age.');
    if(computeAgeFromDob(dob) === null) return showError('That date of birth doesn\'t look valid.');
    if(!myClassInfo.class_id) return showError('Still loading your class info — try again in a moment.');

    const submitBtn = document.querySelector('#admissions-body button[onclick="submitAdmissionForm()"]');
    if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Saving…'; }

    const endpoint = isEditing ? 'backend/update_pupil.php' : 'backend/add_pupil.php';
    const body = isEditing
      ? { pupil_id: editingPupilId, name, admitted_date: admittedDate, address, dob, gender, specially_abled: speciallyAbled, prev_studied: prevStudied, prev_school: prevSchool, prev_standard: prevStandard, prev_board: prevBoard, prev_reason: prevReason, receipt_drive_link: admReceiptDriveLink, receipt_drive_file_id: admReceiptDriveFileId }
      : { school_id: myClassInfo.school_id, class_id: myClassInfo.class_id, name, admitted_date: admittedDate, address, dob, gender, specially_abled: speciallyAbled, prev_studied: prevStudied, prev_school: prevSchool, prev_standard: prevStandard, prev_board: prevBoard, prev_reason: prevReason, receipt_drive_link: admReceiptDriveLink, receipt_drive_file_id: admReceiptDriveFileId };

    try{
      const res = await fetch(endpoint + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if(data.status !== 'success'){
        showError(data.message || 'Could not save this admission.');
        if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = isEditing ? 'Save changes' : 'Add admission'; }
        return;
      }
      // She's now a real row in the pupils table — Class Attendance and
      // Assessment already read from realPupilsCache directly, so
      // invalidating it here is the only thing needed for her to show
      // up everywhere else too.
      editingPupilId = null;
      admReceiptDriveLink = null;
      admReceiptDriveFileId = null;
      realPupilsCache = null;
      renderAdmissions();
    } catch(err){
      showError('Could not reach the server.');
      if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = isEditing ? 'Save changes' : 'Add admission'; }
    }
  }

  // ---------- 8. MONTHLY EFFECTIVE ----------
  // Matches vTeacherEffective: reporting-month tiles, an incomplete-
  // register warning, and "the return" as a computed line-item table
  // rather than a form to fill in by hand.
  //
  // EXTENDED: the return now carries real student attendance, real
  // teacher attendance, and real leave days (all computed from data
  // this app already tracks, same as the rest of the return), plus the
  // actual sign-off workflow — AO / HM / Principal signatures, a
  // scanned copy of the signed paper sheet, and a salary-disbursed
  // status that only unlocks once every signature is in, matching how
  // this really works: the sheet gets signed, then salary follows.
  const monthlyEffectiveRecords = {}; // key 'YYYY-M' -> {signatures:{principal,ao}, submittedToFoundation, scanDataUrl, scanFileName, salaryDisbursed}

  // Saved in the DATABASE (backend/records, kind 'effective') so it is
  // the same on every device and survives a cleared browser; this
  // browser keeps a copy for offline use. Photos stay in Drive — only
  // their link / file id / name are kept here.
  const monthlyEffectiveSent = {}; // key -> JSON last sent, so only changed months go up
  const cleanEffectiveForUpload = rec => { const r = Object.assign({}, rec); delete r.scanDataUrl; delete r.driveLink; return r; };
  function saveMonthlyEffectiveLocal(){
    try { localStorage.setItem('monthlyEffectiveRecords', JSON.stringify(monthlyEffectiveRecords)); } catch(e){ /* full/unavailable */ }
  }
  (function loadMonthlyEffectiveRecords(){
    try {
      const raw = localStorage.getItem('monthlyEffectiveRecords');
      if(raw) Object.assign(monthlyEffectiveRecords, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
    if(typeof classRecordsSync === 'function') classRecordsSync('effective', monthlyEffectiveRecords, () => {
      Object.keys(monthlyEffectiveRecords).forEach(k => { monthlyEffectiveSent[k] = JSON.stringify(cleanEffectiveForUpload(monthlyEffectiveRecords[k])); });
      saveMonthlyEffectiveLocal();
      const body = document.getElementById('monthlyeffective-body');
      if(body && !body.classList.contains('hidden') && typeof renderMonthlyEffective === 'function') renderMonthlyEffective();
    }, cleanEffectiveForUpload);
  })();

  function saveMonthlyEffectiveRecords(){
    saveMonthlyEffectiveLocal();
    if(typeof classRecordSave !== 'function') return;
    Object.keys(monthlyEffectiveRecords).forEach(k => {
      const json = JSON.stringify(cleanEffectiveForUpload(monthlyEffectiveRecords[k]));
      if(monthlyEffectiveSent[k] !== json){ monthlyEffectiveSent[k] = json; classRecordSave('effective', k, JSON.parse(json)); }
    });
  }

  function monthlyEffectiveKey(year, month){ return year + '-' + month; }

  // Real Supervisor-approval status, fetched from the new backend
  // endpoints — NOT a local toggle. Cached per (year, month) so the
  // screen doesn't re-fetch on every render, only when the viewed
  // month changes or after a submit/resubmit.
  var effectiveApprovalCache = {}; // key 'YYYY-M' -> {approval_status, teacher_attendance_pct, supervisor_note, submitted_at, decided_at} | 'loading'

  // ---------------------------------------------------------------
  // MY PUPILS — the real roster, fetched from get_my_pupils.php. This
  // is the actual database table; SAMPLE_STUDENTS elsewhere in this
  // file is still the hardcoded placeholder every other screen reads
  // from today. Rewiring attendance/assessment/family to read from
  // realPupilsCache instead of SAMPLE_STUDENTS is separate follow-up
  // work — this section only handles getting real pupils INTO the
  // database and letting a teacher see/manage them.
  // ---------------------------------------------------------------
  var realPupilsCache = null; // null = not yet fetched, 'loading', or an array of {id, school_id, class_id, name, admitted_date}

  // The class roll is kept in REGISTER NUMBER order (the 3–4 digit
  // General Register / admission number written before each child's
  // name in the school register), not alphabetically. Children without a
  // register number yet come after, in name order. Every list, report and
  // roll number in the portal follows this order, because they all read
  // realPupilsCache.
  function pupilRegisterOrder(a, b){
    const ra = String(a.register_no || '').trim(), rb = String(b.register_no || '').trim();
    if(ra && !rb) return -1;
    if(!ra && rb) return 1;
    if(ra && rb){
      const na = parseInt(ra, 10), nb = parseInt(rb, 10);
      if(!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
      if(ra !== rb) return ra.localeCompare(rb, undefined, { numeric: true });
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  }

  async function fetchMyPupils(){
    if(!myClassInfo.class_id){
      realPupilsCache = 'error:Still loading your class info — try again in a moment.';
      return;
    }
    realPupilsCache = 'loading';
    // A fluctuating connection can leave a request hanging indefinitely
    // (net::ERR_NETWORK_CHANGED in particular) rather than failing
    // cleanly — without a timeout, that leaves realPupilsCache stuck on
    // 'loading' forever with no way to recover short of a full page
    // reload. 12s is generous for a real response but short enough that
    // a genuinely hung request doesn't strand the screen.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try{
      const res = await fetch('backend/pupils/get_my_pupils.php' + window.location.search, { signal: controller.signal });
      const data = await res.json();
      realPupilsCache = data.status === 'success' ? (data.pupils || []).slice().sort(pupilRegisterOrder) : 'error:' + (data.message || 'Could not load pupils.');
    } catch(err){
      realPupilsCache = err.name === 'AbortError' ? 'error:Timed out — your connection may be unstable. Tap Retry to try again.' : 'error:Could not reach the server.';
    } finally {
      clearTimeout(timeoutId);
    }
    if(document.getElementById('classattendance-body') && !document.getElementById('classattendance-body').classList.contains('hidden')){
      renderAttendanceBody();
      if(classAttendanceTab === 'admissions') renderAdmissions();
    }
    // Any Assessment/Reports screen that asked to be re-rendered once
    // pupils are ready (via ensurePupilsLoadedFor) gets called now —
    // drained, not just read, so this only ever fires once per screen
    // that actually asked, not on every future fetch too.
    while(pupilsLoadedRerenderTargets.length){
      const fn = pupilsLoadedRerenderTargets.shift();
      try { fn(); } catch(e){ /* screen no longer visible/relevant — ignore */ }
    }
  }

  async function importPupilsFile(){
    const input = document.getElementById('pupilImportInput');
    const resultEl = document.getElementById('pupilImportResult');
    if(!input.files.length){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    if(!myClassInfo.class_id){
      resultEl.innerHTML = '<div class="au-error">Still loading your class info — try again in a moment.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';

    let rows;
    try{
      rows = await readAssessmentFileRows(input.files[0]); // shared parser, same one Family Profile import uses
    } catch(err){
      resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`;
      return;
    }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }

    const header = rows[0].map(h => h.toLowerCase().trim());
    if(header.join(',') !== 'name,admitted_date'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: name,admitted_date — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }

    const pupils = rows.slice(1).filter(r => r.length && r[0] && r[0].trim()).map(r => ({ name: r[0].trim(), admitted_date: (r[1] || '').trim() }));

    try{
      const res = await fetch('backend/pupils/import_pupils.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ school_id: myClassInfo.school_id, class_id: myClassInfo.class_id, pupils })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`;
        return;
      }
      let html = `<div class="au-success">Imported ${data.imported} of ${pupils.length} rows.</div>`;
      if(data.skipped && data.skipped.length) html += `<div class="au-error" style="margin-top:6px;">${data.skipped.length} row(s) skipped:<br/>${data.skipped.map(s => esc(s)).join('<br/>')}</div>`;
      resultEl.innerHTML = html;
      realPupilsCache = null;
      renderAdmissions();
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }

  async function fetchEffectiveApprovalStatus(year, month){
    const key = monthlyEffectiveKey(year, month);
    // Don't fire the request at all until we actually have a real
    // class_id — sending class_id=undefined just produces a 404 that
    // gets cached as a permanent-looking error. loadMyClassInfo()
    // clears this cache and retries once the real ID is known, so
    // this naturally resolves a moment later instead of getting stuck.
    if(!myClassInfo.class_id){
      effectiveApprovalCache[key] = { approval_status: 'error', message: 'Still loading your class info — this will update automatically in a moment.' };
      return;
    }
    effectiveApprovalCache[key] = 'loading';
    try {
      const params = new URLSearchParams({ class_id: myClassInfo.class_id, year, month });
      const res = await fetch('backend/effective/get_effective.php?' + params.toString() + (window.location.search ? '&' + window.location.search.slice(1) : ''));
      const data = await res.json();
      if(data.status === 'success'){
        effectiveApprovalCache[key] = data;
      } else {
        effectiveApprovalCache[key] = { approval_status: 'error', message: data.message };
      }
    } catch(err){
      effectiveApprovalCache[key] = { approval_status: 'error', message: 'Could not reach the server.' };
    }
    // Only re-render if the teacher is still looking at the month this
    // fetch was for — avoids clobbering a screen she's since navigated
    // away from.
    if(calendarYear === year && calendarMonth === month && document.getElementById('monthlyeffective-body') && !document.getElementById('monthlyeffective-body').classList.contains('hidden')){
      renderMonthlyEffective();
    }
  }

  async function submitEffectiveForApproval(){
    const year = calendarYear, month = calendarMonth;
    if(!myClassInfo.class_id){
      alert('Your class info is still loading — try again in a moment.');
      return;
    }
    // Defense-in-depth — the button itself is already disabled without
    // a photo, but this guards against it being triggered any other way.
    const effRec = getMonthlyEffectiveRecord(year, month);
    if(!effRec.registerDriveLink){
      alert('Attach a photo of the attendance register for this month before submitting.');
      return;
    }
    const complianceStats = computeComplianceStatsForMonth(year, month);
    const btn = document.getElementById('effSubmitApprovalBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Submitting…'; }
    try {
      const res = await fetch('backend/effective/submit_effective.php' + window.location.search, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: myClassInfo.school_id,
          class_id: myClassInfo.class_id,
          year, month,
          teacher_attendance_pct: complianceStats.myAttendancePct
        })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        alert(data.message || 'Could not submit for approval.');
        if(btn){ btn.disabled = false; btn.textContent = 'Submit for foundation approval'; }
        return;
      }
      await fetchEffectiveApprovalStatus(year, month);
    } catch(err){
      alert('Could not reach the server.');
      if(btn){ btn.disabled = false; btn.textContent = 'Submit for foundation approval'; }
    }
  }

  function getMonthlyEffectiveRecord(year, month){
    const key = monthlyEffectiveKey(year, month);
    if(!monthlyEffectiveRecords[key]){
      monthlyEffectiveRecords[key] = {
        // Step 2 & 3 of the 4-step process — Step 1 (attendance/data
        // check) lives in effectiveApprovalCache (backend-verified,
        // not a local toggle) and Step 4 is submittedToFoundation
        // below. HM is gone — the real process is Foundation check →
        // Principal → AO → submission, not three independent signs.
        signatures: { principal: null, ao: null },
        submittedToFoundation: null,
        registerDriveLink: null, registerDriveFileId: null, registerFileName: null,
        scanDriveLink: null, scanDriveFileId: null, scanFileName: null,
        salaryDisbursed: false
      };
    }
    const rec = monthlyEffectiveRecords[key];
    // Backfill for records saved under the old shape (driveLink didn't
    // exist yet, or it still has the old ao/hm/principal-in-parallel
    // signatures object from before this 4-step redesign, or the scan
    // was still a base64 blob / manually-pasted link from before real
    // Drive upload existed).
    if(rec.submittedToFoundation === undefined) rec.submittedToFoundation = null;
    if(!rec.signatures) rec.signatures = { principal: null, ao: null };
    if(rec.signatures.hm !== undefined) delete rec.signatures.hm; // old field, no longer used
    if(rec.scanDriveLink === undefined) rec.scanDriveLink = null;
    if(rec.scanDriveFileId === undefined) rec.scanDriveFileId = null;
    if(rec.registerDriveLink === undefined) rec.registerDriveLink = null;
    if(rec.registerDriveFileId === undefined) rec.registerDriveFileId = null;
    if(rec.registerFileName === undefined) rec.registerFileName = null;
    if(rec.scanDataUrl !== undefined) delete rec.scanDataUrl; // old base64 field, superseded by real Drive upload
    if(rec.driveLink !== undefined) delete rec.driveLink; // old manual-paste-link field, superseded by real Drive upload
    return rec;
  }

  const effectiveScanPruneChecked = {}; // 'YYYY-M' -> true once checked, so switching months doesn't skip checking a new one

  async function pruneDeletedEffectiveScan(year, month){
    const key = monthlyEffectiveKey(year, month);
    if(effectiveScanPruneChecked[key]) return;
    effectiveScanPruneChecked[key] = true;
    const rec = getMonthlyEffectiveRecord(year, month);
    const fileIds = [rec.scanDriveFileId, rec.registerDriveFileId].filter(Boolean);
    if(!fileIds.length) return;
    const existing = await checkDriveFilesStillExist(fileIds);
    if(existing === null) return;
    let changed = false;
    if(rec.scanDriveFileId && !existing.has(rec.scanDriveFileId)){
      rec.scanDriveLink = null; rec.scanDriveFileId = null; rec.scanFileName = null;
      changed = true;
    }
    if(rec.registerDriveFileId && !existing.has(rec.registerDriveFileId)){
      rec.registerDriveLink = null; rec.registerDriveFileId = null; rec.registerFileName = null;
      changed = true;
    }
    if(changed){
      saveMonthlyEffectiveRecords();
      if(document.getElementById('monthlyeffective-body') && !document.getElementById('monthlyeffective-body').classList.contains('hidden')) renderMonthlyEffective();
    }
  }

/* ===== teacher-part-08.js ===== */
/* =========================================================================
   teacher-part-08.js — part 8 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  function renderMonthlyEffective(){
    const container = document.getElementById('monthlyeffective-body');
    container.innerHTML = '';
    container.appendChild(renderEffectiveTabBar('monthlyeffective'));
    pruneDeletedEffectiveScan(calendarYear, calendarMonth); // background check — self-corrects via re-render above if the scan's actually gone

    // Non-blocking — pull in real pupils if they haven't loaded yet,
    // so the attendance % figure below self-corrects once they
    // arrive, instead of silently staying at 0% forever. The rest of
    // this page doesn't depend on pupils, so it still renders now
    // rather than waiting.
    if(realPupilsCache === null){
      if(!pupilsLoadedRerenderTargets.includes(renderMonthlyEffective)) pupilsLoadedRerenderTargets.push(renderMonthlyEffective);
      fetchMyPupils();
    }

    const year = calendarYear, month = calendarMonth;
    const monthName = new Date(year, month, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const dueDay = 25;
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const daysLeftToDue = isCurrentMonth ? dueDay - today.getDate() : null;

    // Real figures — same computations Attendance Dashboard and My
    // Compliance already use, so this return can never disagree with
    // what those screens show for the same month.
    const studentStats = computeAttendanceDashboardStats(year, month);
    const complianceStats = computeComplianceStatsForMonth(year, month);
    const studentDays = studentStats.studentDays;
    const registerMarked = studentStats.daysMarked;
    const unmarkedDays = Math.max(studentDays - registerMarked, 0);
    const enrolled = Array.isArray(realPupilsCache) ? realPupilsCache.length : 0;

    // Leave days taken — every real day this month the teacher marked
    // herself absent, whatever day of the week it fell on.
    const teacherMonthRecords = getMonthAttendanceRecords(year, month);
    const leaveDays = Object.values(teacherMonthRecords).filter(r => r.status === 'leave').length;

    container.appendChild(mdSec('Monthly Effective Return', '<span class="reqs">EFF-02…06</span>'));
    const effSubhead = document.createElement('p');
    effSubhead.className = 'cap'; effSubhead.style.margin = '4px 0 16px';
    effSubhead.textContent = `${sampleTeacherProfile().name} · ${myClassInfo.school_name} · ${myClassInfo.class_name}`;
    container.appendChild(effSubhead);

    const statGrid4 = mdGrid('g4', [
      mdTile('Reporting month', new Date(year, month, 1).toLocaleDateString([], {month:'long'}), year + ' · Jr KG', isCurrentMonth ? mdPill(daysLeftToDue > 0 ? 'Not yet due' : 'Overdue', daysLeftToDue > 0 ? 'neu' : 'crit') : mdPill('Past month', 'neu'), 'EFF-02'),
      mdTile('Due to my supervisor', isCurrentMonth ? (daysLeftToDue > 0 ? daysLeftToDue + ' days left' : 'Overdue') : '—', 'the 25th, or the last school day before it', isCurrentMonth ? mdPill(daysLeftToDue > 0 ? 'Not yet due' : 'Overdue', daysLeftToDue > 0 ? 'neu' : 'crit') : mdPill('N/A', 'neu'), 'EFF-03'),
      mdTile('Effective strength', studentStats.hasData ? studentStats.effectiveStrength : '—', studentStats.hasData ? 'of ' + enrolled + ' children' : '', studentStats.hasData ? mdPill(studentStats.effectiveStrength + ' of ' + enrolled + ' children', 'neu') : mdPill('No data yet', 'neu'), 'ADB-14', studentStats.hasData ? mdMeter(studentStats.effectiveStrength / enrolled * 100) : null),
      mdTile('Register complete', registerMarked, 'of ' + studentDays + ' days', unmarkedDays ? mdPill(unmarkedDays + ' days open', 'crit') : mdPill('Complete', 'good'), 'REG-04', mdMeter(studentDays ? registerMarked / studentDays * 100 : 0))
    ]);
    statGrid4.style.marginBottom = '22px';
    container.appendChild(statGrid4);

    if(unmarkedDays){
      const warnCard = mdCard('The register for this month is not complete',
        unmarkedDays + ' of ' + studentDays + ' student days have no register. EFF-06 will not let the Effective be submitted on an incomplete register — every figure below is computed on ' + registerMarked + ' days, and submitting it would put a number on the MCGM file that nobody can reproduce.', null);
      warnCard.style.marginBottom = '22px';
      container.appendChild(warnCard);
    }

    container.appendChild(mdSec('The return', '<span class="reqs">EFF-05</span>'));
    const linesWrap = document.createElement('div'); linesWrap.className = 'list';
    linesWrap.innerHTML = [
      ['Children on roll at month end', enrolled, ''],
      ['Student attendance', studentStats.hasData ? studentStats.attendancePct : '—', studentStats.hasData ? '%' : ''],
      ['Teacher attendance', complianceStats.myAttendancePct, '%'],
      ['Leave days taken', leaveDays, leaveDays === 1 ? 'day' : 'days'],
      ['Daily activities completed', complianceStats.plansSubmittedPct, '% of days due'],
      ['Congruent with the week', complianceStats.congruentPct, '% of sessions']
    ].map(([k, v, unit]) => `<div class="row"><div class="t"><b>${esc(k)}</b></div><div>${esc(String(v))} ${esc(unit)}</div></div>`).join('');

    const printCard = document.createElement('div');
    printCard.className = 'card'; printCard.style.padding = '0'; printCard.style.marginBottom = '22px'; printCard.style.overflow = 'hidden';
    printCard.innerHTML = `
      <div onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.chevron').style.transform = this.nextElementSibling.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:18px 22px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700; letter-spacing:-.005em;">What the portal will print</h3>
          <p class="cap" style="margin:0;">Every line is computed from what has already been entered this month — tap to see the detail.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px;">▶</span>
      </div>
      <div class="hidden" style="padding:0 22px 22px;"></div>
    `;
    printCard.querySelector('div.hidden').appendChild(linesWrap);
    const printCardExplainer = document.createElement('p');
    printCardExplainer.className = 'cap'; printCardExplainer.style.margin = '0 0 12px';
    printCardExplainer.textContent = 'Nothing here is typed twice — the point of the return is the signature, not the arithmetic. Student attendance, teacher attendance, leave days, and daily activity completion are all real, pulled from the same records used elsewhere in this app.';
    printCard.querySelector('div.hidden').insertBefore(printCardExplainer, linesWrap);
        container.appendChild(printCard);

    // ---- Section tabs — Month by Month and Sign-off & Submission
    // used to sit stacked on one long page; splitting them keeps the
    // overview above (stats, warning, print preview) short and lets
    // each section stand on its own instead of blending together.
    const effTabBar = document.createElement('div');
    effTabBar.style.cssText = 'display:flex; gap:8px; margin:4px 0 20px; flex-wrap:wrap;';
    [
      { key: 'monthbymonth', label: '📅 Month by Month' },
      { key: 'signoff', label: '✍️ Sign-off & Submission' }
    ].forEach(t => {
      const active = t.key === monthlyEffectiveActiveTab;
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.cssText = `padding:9px 18px; border-radius:20px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:13px; font-weight:600; cursor:pointer;`;
      btn.onclick = () => { monthlyEffectiveActiveTab = t.key; renderMonthlyEffective(); };
      effTabBar.appendChild(btn);
    });
    container.appendChild(effTabBar);

    const monthlyEffMonthByMonthPanel = document.createElement('div');
    monthlyEffMonthByMonthPanel.className = monthlyEffectiveActiveTab === 'monthbymonth' ? '' : 'hidden';
    container.appendChild(monthlyEffMonthByMonthPanel);
    const monthlyEffSignoffPanel = document.createElement('div');
    monthlyEffSignoffPanel.className = monthlyEffectiveActiveTab === 'signoff' ? '' : 'hidden';
    container.appendChild(monthlyEffSignoffPanel);

    // ---- Effective, month by month — every academic month so far,

    // ---- Effective, month by month — every academic month so far,
    // same real computations as above, one row each. ----
        monthlyEffMonthByMonthPanel.appendChild(reportDownloadBar(() => monthlyEffMonthByMonthPanel, 'Monthly Effective — month by month', 'monthly-effective'));
        monthlyEffMonthByMonthPanel.appendChild(mdSec('Effective — month by month', '<span class="reqs">EFF-05 · REP-10</span>'));
    const teacherName = sampleTeacherProfile().name;
    const mbmNote = document.createElement('p');
    mbmNote.className = 'cap'; mbmNote.style.margin = '4px 0 16px';
    mbmNote.innerHTML = `${esc(teacherName)} · ${esc(myClassInfo.school_name)} · ${esc(myClassInfo.class_name)} — every academic month so far this year, same figures as the return above.`;
    monthlyEffMonthByMonthPanel.appendChild(mbmNote);

    const curIdx = ACADEMIC_MONTHS.indexOf(today.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS.slice(0, ACADEMIC_MONTHS.indexOf(month) + 1);
    let mbmTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr>' +
      '<th>Month</th><th>Student attendance</th><th>Teacher attendance</th><th>Leave days</th><th>Daily activities</th><th>Register</th><th>Sign-off</th></tr></thead><tbody>';
    monthsSoFar.forEach(m => {
      const mLabel = new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'});
      const mStudent = computeAttendanceDashboardStats(year, m);
      const mCompliance = computeComplianceStatsForMonth(year, m);
      const mRecord = getMonthlyEffectiveRecord(year, m);
      const mSigned = !!(mRecord.submittedToFoundation);
      const mLeaveReal = Object.values(getMonthAttendanceRecords(year, m)).filter(r => r.status === 'leave').length;
      const mTeacherHasData = mCompliance.myAttendancePct > 0 || mLeaveReal > 0;

      // Past months this app was never actually used in have nothing
      // real to show — rather than a row of dashes, fall back to
      // representative sample figures (same seeded-random convention
      // used elsewhere in this app), clearly marked as sample so
      // they're never mistaken for the real thing.
      const isSample = !mStudent.hasData && !mTeacherHasData; // = nothing real recorded this month
      if(isSample){
        mbmTable += `<tr${m === month ? ' style="background:var(--bg);"' : ''}><td><b>${esc(mLabel)}</b></td><td colspan="5" class="dim" style="text-align:left;">No data available</td><td>${mSigned ? mdPill('Submitted', 'good') : (mRecord.salaryDisbursed ? mdPill('Disbursed', 'good') : mdPill('Pending', 'warn'))}</td></tr>`;
        return;
      }
      // Both percentages now use the "unmarked counts against you"
      // versions: student attendance is the whole class's real present
      // count divided by every real working day × roll (not just
      // marked days); teacher attendance is real present days divided
      // by every real teacher working day this month (not just marked
      // days).
      const sStudentPct = isSample ? Math.round(78 + sampleRand(m + 'effstud') * 20) : mStudent.classWidePct;
      const sTeacherPct = isSample ? Math.round(85 + sampleRand(m + 'effteach') * 15) : mCompliance.teacherClassWidePct;
      const sLeave = isSample ? Math.floor(sampleRand(m + 'effleave') * 3) : mLeaveReal;
      const sDaily = isSample ? Math.round(60 + sampleRand(m + 'effdaily') * 35) : mCompliance.plansSubmittedPct;
      const sRegisterMarked = isSample ? Math.round(mStudent.studentDays * (0.8 + sampleRand(m + 'effreg') * 0.2)) : mStudent.daysMarked;

      // Real counts under each percentage, so "%" is never a bare,
      // unverifiable number — this is what it's actually counting.
      const avgPresentPerDay = (!isSample && mStudent.studentDays) ? Math.round(mStudent.classWidePresentSlots / mStudent.studentDays * 10) / 10 : null;
      const studentCaption = isSample
        ? 'Sample figures'
        : `Avg ${avgPresentPerDay} of ${mStudent.roll} children present per working day, across ${mStudent.studentDays} working days (an unmarked day counts as none present)`;
      const teacherCaption = isSample
        ? 'Sample figures'
        : `Present ${mCompliance.presentCount} of ${mCompliance.teacherWorkingDaysTotal - mCompliance.leaveCount} working days${mCompliance.leaveCount ? ' (' + mCompliance.leaveCount + ' on approved leave, not counted)' : ''} — ${mCompliance.teacherWorkingDaysTotal - mCompliance.leaveCount - mCompliance.presentCount} absent or not marked`;

      mbmTable += `<tr${m === month ? ' style="background:var(--bg);"' : ''}>
        <td><b>${esc(mLabel)}</b>${isSample ? ' <span class="cap" style="font-weight:400;">(sample)</span>' : ''}</td>
        <td>${pctBar(sStudentPct, undefined, undefined, true)}<div class="cap" style="font-size:10px; margin-top:2px;">${studentCaption}</div></td>
        <td>${pctBar(sTeacherPct, undefined, undefined, true)}<div class="cap" style="font-size:10px; margin-top:2px;">${teacherCaption}</div></td>
        <td>${sLeave}</td>
        <td>${pctBar(sDaily, undefined, undefined, true)}</td>
        <td>${sRegisterMarked} / ${mStudent.studentDays}</td>
        <td>${mSigned ? mdPill('Submitted', 'good') : (mRecord.salaryDisbursed ? mdPill('Disbursed', 'good') : mdPill('Pending', 'warn'))}</td>
      </tr>`;
    });
    mbmTable += '</tbody></table></div>';
    const mbmWrap = document.createElement('div'); mbmWrap.innerHTML = mbmTable;
    const mbmCard = mdCard(null, 'The current month is highlighted. Months with nothing real recorded show "No data available" — nothing is estimated. Sign-off shows Signed once all three signatures are in for that month.', mbmWrap);
    mbmCard.style.marginBottom = '22px';
    monthlyEffMonthByMonthPanel.appendChild(mbmCard);

    // ---- The 4-step closing process ----
    // Foundation check → Principal sign → AO sign → submission to the
    // foundation office. Each step is strictly sequential — a locked
    // step shows why it's locked and cannot be actioned out of order.
    // No calendar here on purpose: sign-off is a monthly fact with a
    // due date (the 25th), not something that needs a day grid to
    // record.
    const effRecord = getMonthlyEffectiveRecord(year, month);

        monthlyEffSignoffPanel.appendChild(mdSec('Closing this month\'s return', '<span class="reqs">EFF-07…09</span>'));
    const monthNavRow = document.createElement('div');
    monthNavRow.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:4px;';
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '‹';
    prevBtn.style.cssText = 'width:32px; height:32px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:16px; cursor:pointer;';
    prevBtn.onclick = () => { calendarMonth--; if(calendarMonth < 0){ calendarMonth = 11; calendarYear--; } renderMonthlyEffective(); };
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '›';
    nextBtn.style.cssText = 'width:32px; height:32px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:16px; cursor:pointer;';
    nextBtn.onclick = () => { calendarMonth++; if(calendarMonth > 11){ calendarMonth = 0; calendarYear++; } renderMonthlyEffective(); };
    const monthNavLabel = document.createElement('span');
    monthNavLabel.style.cssText = 'font-weight:700; font-size:15px;';
    monthNavLabel.textContent = monthName;
    monthNavRow.appendChild(prevBtn); monthNavRow.appendChild(monthNavLabel); monthNavRow.appendChild(nextBtn);
    monthlyEffSignoffPanel.appendChild(monthNavRow);

    const dueNote = document.createElement('p');
    dueNote.className = 'cap'; dueNote.style.margin = '2px 0 16px';
    dueNote.textContent = 'Due to the foundation office by the ' + dueDay + 'th of the month.';
    monthlyEffSignoffPanel.appendChild(dueNote);

    // ---- TESTING ONLY — resets this month's entire closing workflow
    // (all 4 steps, both photos, and the real server-side approval row)
    // so the submit → supervisor-approve → sign-off loop can be run
    // through repeatedly while testing. Remove this button before
    // going live — it's not something a real teacher should have
    // access to, since it can undo a real supervisor's decision.
    const resetTestRow = document.createElement('div');
    resetTestRow.style.cssText = 'margin:0 0 16px;';
    const resetTestBtn = document.createElement('button');
    resetTestBtn.textContent = '↺ Reset this month (testing only)';
    resetTestBtn.style.cssText = 'padding:7px 14px; border-radius:8px; border:1px dashed var(--danger, #c8433f); background:#fff; color:var(--danger, #c8433f); font-size:12px; font-weight:600; cursor:pointer;';
    resetTestBtn.onclick = () => resetMonthlyEffectiveForTesting(year, month);
    resetTestRow.appendChild(resetTestBtn);
    monthlyEffSignoffPanel.appendChild(resetTestRow);

    // Real Supervisor-approval status — fetched from the backend, not
    // a local toggle. Everything else in this 4-step list is gated on
    // this coming back 'approved'.
    const approvalKey = monthlyEffectiveKey(year, month);
    let approval = effectiveApprovalCache[approvalKey];
    if(approval === undefined){ fetchEffectiveApprovalStatus(year, month); approval = 'loading'; }
    const step1Approved = (typeof approval === 'object') && approval.approval_status === 'approved';
    const step1Done = step1Approved; // Step 1 only counts as "done" once actually approved, not merely submitted
    const step1DoneDate = step1Approved ? (approval.decided_at || '').slice(0, 10) : null;

    const step2Sig = effRecord.signatures.principal;
    const step2Done = !!step2Sig;
    const step3Sig = effRecord.signatures.ao;
    const step3Done = !!step3Sig;
    const step4Done = !!effRecord.submittedToFoundation;

    function daysBetween(fromDateStr, toDateStr){
      if(!fromDateStr || !toDateStr) return null;
      const ms = new Date(toDateStr + 'T00:00:00') - new Date(fromDateStr + 'T00:00:00');
      return Math.round(ms / 86400000);
    }

    const stepsWrap = document.createElement('div');
    stepsWrap.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px; margin-bottom:22px;';

    // Square-style step card — badge sits above the title now (not
    // beside it), so each card reads as a compact tile rather than a
    // long horizontal row. photoWidget is only passed for Steps 2 & 3
    // (Principal/AO), since those are the ones with an actual paper
    // signature to photograph.
    function renderStep(num, title, done, doneDate, locked, lockedReason, bodyHtml, actionBtn, gapNote, photoWidget){
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'padding:16px; display:flex; flex-direction:column; gap:8px; min-height:150px;' + (locked ? ' opacity:.6;' : '');
      const badge = document.createElement('div');
      badge.style.cssText = 'flex-shrink:0; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; ' +
        (done ? 'background:var(--success); color:#fff;' : locked ? 'background:var(--bg); color:var(--text-muted); border:1px solid var(--border);' : 'background:var(--primary); color:#fff;');
      badge.textContent = done ? '✓' : String(num);
      card.appendChild(badge);
      const body = document.createElement('div');
      body.style.cssText = 'flex:1; min-width:0;';
      body.innerHTML = `<h4 style="margin:0 0 4px; font-size:13px;">Step ${num} · ${esc(title)}</h4>
        <span class="cap" style="margin:0; display:block; ${done ? 'color:var(--success);' : ''}">${done ? '✓ ' + esc(doneDate || 'Done') : locked ? '🔒 ' + esc(lockedReason) : 'Not yet done'}</span>` +
        (gapNote ? `<p class="cap" style="margin:4px 0 0; font-style:italic;">${esc(gapNote)}</p>` : '') +
        (bodyHtml || '');
      if(actionBtn || photoWidget){
        const actionRow = document.createElement('div');
        actionRow.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:8px;';
        if(actionBtn) actionRow.appendChild(actionBtn);
        if(photoWidget) actionRow.appendChild(photoWidget);
        body.appendChild(actionRow);
      }
      card.appendChild(body);
      stepsWrap.appendChild(card);
    }

    // Compact camera control for a signature step — shows a small
    // thumbnail once a photo's attached (tap to retake), otherwise a
    // single "📷 Photo of signature" button. Only meaningful once the
    // step itself is actually signed — no point photographing a
    // signature that hasn't happened yet.
    function buildSignaturePhotoWidget(role, sig){
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex; align-items:center; gap:6px;';
      const inputId = 'sigPhotoInput-' + role;
      const hasPhoto = sig && sig.photoDataUrl;
      wrap.innerHTML = (hasPhoto
        ? `<img src="${sig.photoDataUrl}" style="width:28px; height:28px; object-fit:cover; border-radius:6px; border:1px solid var(--border); cursor:pointer;" title="${esc(sig.photoFileName || 'Signature photo')}" onclick="document.getElementById('${inputId}').click()" />
           <span class="cap" style="color:var(--success);">✓ Photo attached</span>`
        : `<button type="button" onclick="document.getElementById('${inputId}').click()" style="padding:5px 9px; border-radius:6px; border:1px solid var(--border); background:#fff; font-size:11.5px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">📷 Photo of signature</button>`
        ) + `<input type="file" id="${inputId}" accept="image/*" capture="environment" style="display:none;" onchange="attachSignaturePhoto('${role}', this)" />`;
      return wrap;
    }

    // Step 1 — Foundation checks attendance + the Effective sheet data
    const effRecForStep1 = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
    const hasRegisterPhoto = !!effRecForStep1.registerDriveLink;

    // Photo of the physical attendance/leave register — required before
    // submission can even happen, same evidence-before-action gate now
    // used for Materials' Distribute button. The supervisor reviewing
    // Step 1's submission checks this photo against the figures above,
    // not just a self-reported number with nothing behind it.
    const registerPhotoWidget = document.createElement('div');
    registerPhotoWidget.style.cssText = 'margin:6px 0 10px;';
    registerPhotoWidget.innerHTML = hasRegisterPhoto
      ? `<a href="${esc(effRecForStep1.registerDriveLink)}" target="_blank" rel="noopener" style="font-weight:600; font-size:12.5px;">🖼 ${esc(effRecForStep1.registerFileName || 'Attendance register photo')}</a> <span class="cap">· saved to Drive</span>
         <button onclick="removeMonthlyEffectiveRegisterPhoto()" style="margin-left:8px; padding:4px 9px; border-radius:6px; border:1px solid var(--border); background:#fff; font-size:11.5px; cursor:pointer;">Remove</button>`
      : `<input type="file" id="effRegisterInput" accept="image/*" capture="environment" onchange="handleMonthlyEffectiveRegisterPhoto(this)" style="font-size:12.5px;" />
         <span id="effRegisterStatus" class="cap" style="margin-left:8px;"></span>
         <p class="cap" style="margin:4px 0 0;">Photo of the physical attendance/leave register page for this month — required before submitting for approval.</p>`;

    let step1Body = '';
    let step1Btn = null;
    if(approval === 'loading'){
      step1Body = '<p class="cap" style="margin:0;">Checking status…</p>';
    } else if((typeof approval === 'object') && approval.approval_status === 'error'){
      step1Body = `<p class="cap" style="margin:0; color:var(--danger, #c8433f);">${esc(approval.message || 'Could not check approval status.')}</p>`;
    } else if(!approval || approval === 'none' || (typeof approval === 'object' && approval.approval_status === 'none')){
      if(hasRegisterPhoto){
        step1Btn = document.createElement('button');
        step1Btn.id = 'effSubmitApprovalBtn';
        step1Btn.textContent = 'Submit for foundation approval';
        step1Btn.style.cssText = 'padding:7px 12px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
        step1Btn.onclick = submitEffectiveForApproval;
      } else {
        step1Btn = document.createElement('button');
        step1Btn.textContent = 'Submit for foundation approval';
        step1Btn.disabled = true;
        step1Btn.title = 'Attach a photo of the attendance register above first';
        step1Btn.style.cssText = 'padding:7px 12px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; opacity:0.5; cursor:not-allowed;';
      }
    } else if(typeof approval === 'object' && approval.approval_status === 'pending'){
      step1Body = `<p class="cap" style="margin:0;">Submitted ${esc((approval.submitted_at || '').slice(0,10))} — awaiting review.</p>`;
    } else if(typeof approval === 'object' && approval.approval_status === 'rejected'){
      step1Body = `<p class="cap" style="margin:0 0 4px; color:var(--danger, #c8433f);">Sent back${approval.supervisor_note ? ': ' + esc(approval.supervisor_note) : '.'} Correct the figure above and resubmit.</p>`;
      if(hasRegisterPhoto){
        step1Btn = document.createElement('button');
        step1Btn.id = 'effSubmitApprovalBtn';
        step1Btn.textContent = 'Resubmit for approval';
        step1Btn.style.cssText = 'padding:7px 12px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
        step1Btn.onclick = submitEffectiveForApproval;
      } else {
        step1Btn = document.createElement('button');
        step1Btn.textContent = 'Resubmit for approval';
        step1Btn.disabled = true;
        step1Btn.title = 'Attach a photo of the attendance register above first';
        step1Btn.style.cssText = 'padding:7px 12px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; opacity:0.5; cursor:not-allowed;';
      }
    }
    // The photo widget shows regardless of approval state — it's
    // useful context (and removable) even once approved, not just a
    // pre-submission gate that disappears afterward.
    step1Body = registerPhotoWidget.outerHTML + step1Body;
    renderStep(1, 'Attendance & Effective sheet checked', step1Done, step1DoneDate, false, '', step1Body, step1Btn, null);

    // Step 2 — Principal's sign, locked until Step 1 is approved
    let step2Btn = null;
    if(!step2Done && step1Done){
      step2Btn = document.createElement('button');
      step2Btn.textContent = 'Mark Principal sign as done';
      step2Btn.style.cssText = 'padding:7px 12px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
      step2Btn.onclick = () => toggleMonthlyEffectiveSignature('principal');
    } else if(step2Done){
      step2Btn = document.createElement('button');
      step2Btn.textContent = 'Undo';
      step2Btn.style.cssText = 'padding:5px 10px; border-radius:6px; border:1px solid var(--border); background:#fff; font-size:11.5px; cursor:pointer;';
      step2Btn.onclick = () => toggleMonthlyEffectiveSignature('principal');
    }
    const step2Gap = step2Done && step1DoneDate ? (() => {
      const d = daysBetween(step1DoneDate, step2Sig.date);
      return d === null ? null : d + ' day' + (d === 1 ? '' : 's') + ' after foundation approval';
    })() : null;
    renderStep(2, 'Principal\'s sign', step2Done, step2Done ? step2Sig.date : null, !step1Done, 'Unlocks once Step 1 is approved', '', step2Btn, step2Gap, step2Done ? buildSignaturePhotoWidget('principal', step2Sig) : null);

    // Step 3 — AO signature, locked until Step 2 (Principal) is done
    let step3Btn = null;
    if(!step3Done && step2Done){
      step3Btn = document.createElement('button');
      step3Btn.textContent = 'Mark AO sign as done';
      step3Btn.style.cssText = 'padding:7px 12px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
      step3Btn.onclick = () => toggleMonthlyEffectiveSignature('ao');
    } else if(step3Done){
      step3Btn = document.createElement('button');
      step3Btn.textContent = 'Undo';
      step3Btn.style.cssText = 'padding:5px 10px; border-radius:6px; border:1px solid var(--border); background:#fff; font-size:11.5px; cursor:pointer;';
      step3Btn.onclick = () => toggleMonthlyEffectiveSignature('ao');
    }
    const step3Gap = step3Done && step2Done ? (() => {
      const d = daysBetween(step2Sig.date, step3Sig.date);
      return d === null ? null : d + ' day' + (d === 1 ? '' : 's') + ' after Principal sign';
    })() : null;
    renderStep(3, 'AO signature', step3Done, step3Done ? step3Sig.date : null, !step2Done, 'Unlocks once Step 2 (Principal) is done', '', step3Btn, step3Gap, step3Done ? buildSignaturePhotoWidget('ao', step3Sig) : null);

    // Step 4 — Submission to the foundation office, locked until Step 3 (AO) is done
    let step4Btn = null;
    if(!step4Done && step3Done){
      step4Btn = document.createElement('button');
      step4Btn.textContent = 'Mark as submitted to the foundation office';
      step4Btn.style.cssText = 'padding:8px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:13px; font-weight:600; cursor:pointer;';
      step4Btn.onclick = () => toggleSubmittedToFoundation();
    } else if(step4Done){
      step4Btn = document.createElement('button');
      step4Btn.textContent = 'Undo';
      step4Btn.style.cssText = 'padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12.5px; cursor:pointer;';
      step4Btn.onclick = () => toggleSubmittedToFoundation();
    }
    const step4Gap = step4Done && step3Done ? (() => {
      const d = daysBetween(step3Sig.date, effRecord.submittedToFoundation.date);
      return d === null ? null : d + ' day' + (d === 1 ? '' : 's') + ' after AO sign';
    })() : null;
    renderStep(4, 'Submission to the foundation office', step4Done, step4Done ? effRecord.submittedToFoundation.date : null, !step3Done, 'Unlocks once Step 3 (AO) is done', '', step4Btn, step4Gap);

    monthlyEffSignoffPanel.appendChild(stepsWrap);

    // ---- Scan of the signed sheet ----
    monthlyEffSignoffPanel.appendChild(mdSec('Scan of the signed sheet', '<span class="reqs">EFF-10</span>'));
    const scanCard = document.createElement('div');
    scanCard.className = 'card'; scanCard.style.padding = '22px'; scanCard.style.marginBottom = '22px';
    const scanPreviewHtml = effRecord.scanDriveLink
      ? `<div style="margin-top:14px;">
           <a href="${esc(effRecord.scanDriveLink)}" target="_blank" rel="noopener" style="font-weight:600;">🖼 ${esc(effRecord.scanFileName || 'Attached file')}</a> <span class="cap">· saved to Drive</span>
           <br><button onclick="removeMonthlyEffectiveScan()" style="margin-top:10px; padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12px; cursor:pointer;">Remove</button>
         </div>`
      : `<p class="cap" style="margin:10px 0 0;">No file attached yet.</p>`;
    scanCard.innerHTML = `<p class="cap" style="margin:0 0 14px;">Once the Principal and AO signatures are on the printed sheet, photograph or scan it and attach it here — it uploads straight to your connected Google Drive.</p>
      <input type="file" id="effScanInput" accept="image/*,application/pdf" onchange="handleMonthlyEffectiveScan(this)" />
      <span id="effScanStatus" class="cap" style="margin-left:10px;"></span>
      ${scanPreviewHtml}`;
    monthlyEffSignoffPanel.appendChild(scanCard);
  }

    // Wipes this month's local sign-off state (Steps 2-4, both photos)
  // AND deletes the real server-side approval row for Step 1, so the
  // full submit → supervisor-approve → sign-off loop can be tested
  // repeatedly from a clean slate. Two calls because these two pieces
  // of state genuinely live in two different places — local storage
  // for the teacher-side steps, a real database row for the
  // supervisor-facing approval.
  async function resetMonthlyEffectiveForTesting(year, month){
    if(!confirm('Reset ALL of this month\'s closing workflow — every step, both photos, and the real approval record the supervisor would see? This is for testing only and can\'t be undone.')) return;
    const key = monthlyEffectiveKey(year, month);
    delete monthlyEffectiveRecords[key];
    saveMonthlyEffectiveRecords();
    delete effectiveApprovalCache[key];
    delete effectiveScanPruneChecked[key];
    if(myClassInfo.class_id){
      try{
        await fetch('backend/effective/reset_effective.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ class_id: myClassInfo.class_id, year, month })
        });
      } catch(err){ /* local state is already cleared regardless */ }
    }
    renderMonthlyEffective();
  }

  function toggleMonthlyEffectiveSignature(role){
    const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
    // Defensive guards, in addition to the disabled buttons — each
    // step can only be marked once the one before it is actually done,
    // matching the strict 4-step order (Steps 1-4). Undoing an earlier
    // step also undoes everything that came after it, since a later
    // step's date being "after" an earlier one no longer means
    // anything once the earlier one is retracted.
    if(role === 'principal' && !rec.signatures.principal){
      const approval = effectiveApprovalCache[monthlyEffectiveKey(calendarYear, calendarMonth)];
      if(!approval || typeof approval !== 'object' || approval.approval_status !== 'approved'){
        alert('Principal sign-off is locked until the foundation approves this month\'s attendance (Step 1).');
        return;
      }
    }
    if(role === 'ao' && !rec.signatures.ao && !rec.signatures.principal){
      alert('AO sign is locked until the Principal has signed (Step 2).');
      return;
    }
    if(rec.signatures[role]){
      rec.signatures[role] = null;
      if(role === 'principal'){
        // Retracting Principal also retracts everything downstream —
        // AO sign and submission no longer have a valid "after Step 2"
        // date to point back to.
        rec.signatures.ao = null;
        rec.submittedToFoundation = null;
      }
      if(role === 'ao'){
        rec.submittedToFoundation = null;
      }
      // Undoing a signature also undoes disbursement — the sign-off
      // it depended on no longer fully exists.
      rec.salaryDisbursed = false;
    } else {
      rec.signatures[role] = { date: todayDateKey() };
    }
    saveMonthlyEffectiveRecords();
    renderMonthlyEffective();
  }

  function toggleSubmittedToFoundation(){
    const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
    // Defensive guard — Step 4 can only be marked once Step 3 (AO) is done.
    if(!rec.submittedToFoundation && !rec.signatures.ao){
      alert('Submission to the foundation office is locked until the AO has signed (Step 3).');
      return;
    }
    if(rec.submittedToFoundation){
      rec.submittedToFoundation = null;
      rec.salaryDisbursed = false;
    } else {
      rec.submittedToFoundation = { date: todayDateKey() };
    }
    saveMonthlyEffectiveRecords();
    renderMonthlyEffective();
  }

  // Attaches a photo of the physical signature to Step 2 (Principal)
  // or Step 3 (AO) — only meaningful once that step is actually marked
  // done, since there's nothing to photograph before then. Stored the
  // same way the full sheet scan already is (base64 in localStorage) —
  // consistent with the existing pattern, not a new storage mechanism.
  function attachSignaturePhoto(role, inputEl){
    const file = inputEl.files && inputEl.files[0];
    if(!file) return;
    const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
    if(!rec.signatures[role]) return; // shouldn't happen — control only shown once signed
    const reader = new FileReader();
    reader.onload = (e) => {
      rec.signatures[role].photoDataUrl = e.target.result;
      rec.signatures[role].photoFileName = file.name;
      saveMonthlyEffectiveRecords();
      renderMonthlyEffective();
    };
    reader.readAsDataURL(file);
  }

  async function handleMonthlyEffectiveRegisterPhoto(inputEl){
    const file = inputEl.files && inputEl.files[0];
    if(!file) return;
    const statusEl = document.getElementById('effRegisterStatus');
    if(statusEl) statusEl.textContent = 'Compressing…';

    const compressedFile = renameFileTo(await compressImageFile(file), 'Attendance Register');
    if(statusEl) statusEl.textContent = 'Uploading to Google Drive…';

    const monthFolder = new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('folder_path', 'Monthly Effective/' + monthFolder);

    try{
      const res = await fetch('backend/drive/upload_to_drive.php' + window.location.search, { method: 'POST', body: formData });
      const data = await res.json();
      if(data.status === 'success'){
        const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
        rec.registerDriveLink = data.link;
        rec.registerDriveFileId = data.file_id;
        rec.registerFileName = compressedFile.name;
        saveMonthlyEffectiveRecords();
        renderMonthlyEffective();
      } else if(statusEl){
        statusEl.textContent = data.message || 'Upload failed.';
        statusEl.style.color = 'var(--danger, #c8433f)';
      }
    } catch(err){
      if(statusEl){ statusEl.textContent = 'Could not reach the server.'; statusEl.style.color = 'var(--danger, #c8433f)'; }
    }
  }

  async function removeMonthlyEffectiveRegisterPhoto(){
    const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
    if(!confirm('Remove this photo? This deletes the actual file from Google Drive, not just the reference here.')) return;
    if(rec.registerDriveFileId){
      try{
        const res = await fetch('backend/drive/delete_from_drive.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ file_id: rec.registerDriveFileId })
        });
        const data = await res.json();
        if(data.status !== 'success'){ alert(data.message || 'Could not delete the file from Drive.'); return; }
      } catch(err){ alert('Could not reach the server.'); return; }
    }
    rec.registerDriveLink = null;
    rec.registerDriveFileId = null;
    rec.registerFileName = null;
    saveMonthlyEffectiveRecords();
    renderMonthlyEffective();
  }

  async function handleMonthlyEffectiveScan(inputEl){
    const file = inputEl.files && inputEl.files[0];
    if(!file) return;
    const statusEl = document.getElementById('effScanStatus');
    if(statusEl) statusEl.textContent = 'Uploading to Google Drive…';

    const monthFolder = new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder_path', 'Monthly Effective/' + monthFolder);

    try{
      const res = await fetch('backend/drive/upload_to_drive.php' + window.location.search, { method: 'POST', body: formData });
      const data = await res.json();
      if(data.status === 'success'){
        const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
        rec.scanDriveLink = data.link;
        rec.scanDriveFileId = data.file_id;
        rec.scanFileName = file.name;
        saveMonthlyEffectiveRecords();
        renderMonthlyEffective();
      } else if(statusEl){
        statusEl.textContent = data.message || 'Upload failed.';
        statusEl.style.color = 'var(--danger, #c8433f)';
      }
    } catch(err){
      if(statusEl){ statusEl.textContent = 'Could not reach the server.'; statusEl.style.color = 'var(--danger, #c8433f)'; }
    }
  }

  async function removeMonthlyEffectiveScan(){
    const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
    if(!confirm('Remove this scan? This deletes the actual file from Google Drive, not just the reference here.')) return;
    if(rec.scanDriveFileId){
      try{
        const res = await fetch('backend/drive/delete_from_drive.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ file_id: rec.scanDriveFileId })
        });
        const data = await res.json();
        if(data.status !== 'success'){ alert(data.message || 'Could not delete the file from Drive.'); return; }
      } catch(err){ alert('Could not reach the server.'); return; }
    }
    rec.scanDriveLink = null;
    rec.scanDriveFileId = null;
    rec.scanFileName = null;
    saveMonthlyEffectiveRecords();
    renderMonthlyEffective();
  }

  // ---------- 9. MONTHLY ASSESSMENT ----------
  // Matches vClassAssess EXACTLY as screenshotted: Child / Att% / 10
  // domain columns (HEAL PHYS SENS ENVI EMOT PART LOGI MATH LANG ARTS)
  // / Rec (x of 10 recorded) / Moved (verdict pill). A blank cell means
  // "not observed this month" — shown as a dim dot, never as Beginner.
  var monthlyAssessmentEntries = {}; // studentName -> {domainKey: 'E'|'P'|'A'|null}

  // Persist REAL entries only (typed, imported) — not the representative
  // sample-seeded cells renderMonthlyAssessment fills gaps with. Same
  // reasoning as dailyPlanEntries/attendanceRecords above: without this,
  // nothing typed or imported here survives a reload, so an Excel import
  // would be pointless. Seeded placeholder values are deliberately never
  // written back, so localStorage only ever holds what someone actually
  // recorded.
  (function loadMonthlyAssessmentEntries(){
    try {
      const raw = localStorage.getItem('monthlyAssessmentEntries');
      if(raw) Object.assign(monthlyAssessmentEntries, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
  })();

  function saveMonthlyAssessmentEntries(){
    try { localStorage.setItem('monthlyAssessmentEntries', JSON.stringify(monthlyAssessmentEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }

  // ---------------------------------------------------------------
  // WEEKLY ASSESSMENT and CLASSROOM OBSERVATION — two more assessment
  // types alongside Monthly Assessment, each genuinely separate data
  // (not the same numbers relabeled). Weekly is additionally scoped
  // by week — weeklyAssessmentEntries[weekNum][studentName][domainKey]
  // — reusing the same currentWeekNum the rest of this app already
  // shares, so switching "Week" anywhere is consistent everywhere.
  // Classroom Observation has the same flat shape as Monthly (no time
  // scoping) since it's a running log, not a periodic return.
  // ---------------------------------------------------------------
  const weeklyAssessmentEntries = {}; // weekNum -> studentName -> {activityIndexAsString: 'E'|'P'|'A'}
  const classroomObservationEntries = {}; // studentName -> {domainKey: tier|null}

  (function loadWeeklyAndObservationEntries(){
    try {
      const rawW = localStorage.getItem('weeklyAssessmentEntries');
      if(rawW) Object.assign(weeklyAssessmentEntries, JSON.parse(rawW));
    } catch(e){ /* malformed or unavailable — start empty */ }
    try {
      const rawO = localStorage.getItem('classroomObservationEntries');
      if(rawO) Object.assign(classroomObservationEntries, JSON.parse(rawO));
    } catch(e){ /* malformed or unavailable — start empty */ }
  })();
  function saveWeeklyAssessmentEntries(){
    try { localStorage.setItem('weeklyAssessmentEntries', JSON.stringify(weeklyAssessmentEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }
  function saveClassroomObservationEntries(){
    try { localStorage.setItem('classroomObservationEntries', JSON.stringify(classroomObservationEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }

  // ---------------------------------------------------------------
  // WORKBOOK ASSESSMENT — a genuinely different instrument from the
  // three above: real, server-backed evidence (workbooks table + master
  // workbook_pages content list, seeded once from the actual Khelika/
  // Vaani/Sopanika/Uvach books) rather than a client-side domain grid.
  // Not localStorage — this is real DB from the start, same as pupils
  // and attendance, since it's new rather than a migration.
  //
  // Book set genuinely differs by class level (Jr KG: Khelika+Vaani.
  // Sr KG: Khelika+Sopanika+Uvach Phonics+Uvach Alphabets), and pages
  // accumulate month over month rather than resetting weekly — both
  // scoped server-side, not assumed client-side.
  //
  // KNOWN LIMITATION: myClassInfo only tracks one active class (same
  // constraint the rest of this app already has — see loadMyClassInfo's
  // own comment: "this app is single-class throughout"). A teacher with
  // both a Jr KG and a Sr KG class would only see the first one's
  // workbook set here, same as everywhere else in the app today. Worth
  // revisiting alongside a real multi-class UI, not solved locally here.
  // ---------------------------------------------------------------
  const WORKBOOK_MONTHS = ['June','July','August','September','October'];
  let currentWorkbookMonth = WORKBOOK_MONTHS[WORKBOOK_MONTHS.length - 1];

  function workbookLevelFromClassName(){
    const name = (myClassInfo.class_name || '');
    // "Senior KG" is how the database names it; also accepts Sr KG / SKG / UKG.
    return /\b(senior|sr\.?)\s*k\.?\s*g\b|\bskg\b|\bukg\b/i.test(name) ? 'Sr KG' : 'Jr KG'; // defaults to Jr KG if unrecognized, rather than showing nothing
  }


  // Shared error-display helper for the computed/server-backed Assessment
  // sections — errors are now "sticky" (the loaders above deliberately
  // stop auto-retrying once an error is cached, to prevent the
  // repeated-fetch loop that happened before this was added). A visible
  // Retry button is the only way back from an error short of a full page
  // reload, so every error display needs one.
  function renderRetryCard(container, message, clearFn){
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="card" style="padding:16px;"><p style="margin:0 0 10px;">${esc(message)}</p><button class="btn-primary" style="width:auto; padding:7px 14px;">Retry</button></div>`;
    wrap.querySelector('button').onclick = () => { clearFn(); renderMonthlyAssessment(monthlyAssessmentTargetEl); };
    container.appendChild(wrap);
  }

  // ---------------------------------------------------------------
  // WORKBOOK ASSESSMENT — rebuilt around the real grading unit
  // confirmed from "FINAL KHELIKA Part 1 ALL ACTIVITY BOOK JR 2026.pdf":
  // a COMPETENCY (one C-CODE row), not a physical page. A competency can
  // span several pages; page numbers are reference only, never the
  // grading key. Matches the real printed HPC record 1:1: pick a book,
  // pick a child, work through the CG-grouped competency table with
  // E/P/A per row — not month-scoped, since competencies aren't tied to
  // a monthly plan the way page schedules were.
  // ---------------------------------------------------------------
  const workbookCompetenciesCache = {}; // level -> null|'loading'|'error:...'|[{id,name,competencies:[{id,cg_code,competency_text,page_numbers,curricular_goal_id,goal_text}]}]
  function ensureWorkbookCompetenciesLoaded(level, month, reRenderFn){
    const key = level + '|' + month;
    if(Array.isArray(workbookCompetenciesCache[key])) return true;
    if(workbookCompetenciesCache[key] === 'loading') return false;
    if(typeof workbookCompetenciesCache[key] === 'string' && workbookCompetenciesCache[key].startsWith('error:')) return true;
    workbookCompetenciesCache[key] = 'loading';
    fetch('backend/assessment/workbook/get_workbook_competencies.php?' + new URLSearchParams({ level, month }) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(res => res.json())
      .then(data => {
        workbookCompetenciesCache[key] = data.status === 'success' ? data.workbooks : 'error:' + (data.message || 'Could not load workbook competencies.');
        reRenderFn();
      })
      .catch(() => { workbookCompetenciesCache[key] = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }

  // workbookCompetencyMarksCache = null|'loading'|'error:...'|{ [pupilId]: { [competencyId]: 'E'|'P'|'A' } }
  // A single shared cache, not per-level/month — competency marks aren't
  // scoped that way, same reasoning as the competencies themselves.
  let workbookCompetencyMarksCache = null;
  function ensureWorkbookCompetencyMarksLoaded(reRenderFn){
    if(workbookCompetencyMarksCache && typeof workbookCompetencyMarksCache === 'object') return true;
    if(workbookCompetencyMarksCache === 'loading') return false;
    if(typeof workbookCompetencyMarksCache === 'string' && workbookCompetencyMarksCache.startsWith('error:')) return true;
    workbookCompetencyMarksCache = 'loading';
    fetch('backend/assessment/workbook/get_workbook_competency_assessment.php' + window.location.search)
      .then(res => res.json())
      .then(data => {
        if(data.status !== 'success'){ workbookCompetencyMarksCache = 'error:' + (data.message || 'Could not load competency marks.'); reRenderFn(); return; }
        const byPupil = {};
        data.marks.forEach(m => {
          if(!byPupil[m.pupil_id]) byPupil[m.pupil_id] = {};
          byPupil[m.pupil_id][m.workbook_competency_id] = m.level_mark;
        });
        workbookCompetencyMarksCache = byPupil;
        reRenderFn();
      })
      .catch(() => { workbookCompetencyMarksCache = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }

  // Direct 3-button set, tap-again-to-clear — same pattern as everywhere
  // else in this app.
  function saveWorkbookCompetencyMark(pupilId, competencyId, currentMark, tier){
    const next = currentMark === tier ? null : tier;
    if(!workbookCompetencyMarksCache || typeof workbookCompetencyMarksCache !== 'object') return;
    if(!workbookCompetencyMarksCache[pupilId]) workbookCompetencyMarksCache[pupilId] = {};
    if(next === null) delete workbookCompetencyMarksCache[pupilId][competencyId];
    else workbookCompetencyMarksCache[pupilId][competencyId] = next;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);

    fetch('backend/assessment/workbook/save_workbook_competency_assessment.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ pupil_id: pupilId, workbook_competency_id: competencyId, level_mark: next })
    }).then(res => res.json()).then(data => {
      if(data.status !== 'success'){
        workbookCompetencyMarksCache[pupilId] = workbookCompetencyMarksCache[pupilId] || {};
        if(currentMark === null) delete workbookCompetencyMarksCache[pupilId][competencyId];
        else workbookCompetencyMarksCache[pupilId][competencyId] = currentMark;
        renderMonthlyAssessment(monthlyAssessmentTargetEl);
        alert('Could not save that grade — check your connection and try again.');
      }
    }).catch(() => { alert('Could not save that grade — check your connection and try again.'); });
  }

  let currentWorkbookCompetencyBookName = null;
  // Term filter for the Workbook picker below — "Part 1" books belong to
  // Term 1, "Part 2" books to Term 2 (matching how the school actually
  // splits the year). Any workbook whose name has neither "Part 1" nor
  // "Part 2" in it is shown in both terms rather than silently hidden.
  let currentWorkbookTerm = 'Term 1';
  function bookBelongsToTerm(bookName, term){
    const hasPart1 = /part\s*1\b/i.test(bookName);
    const hasPart2 = /part\s*2\b/i.test(bookName);
    if(!hasPart1 && !hasPart2) return true; // no part number at all — don't hide it from either term
    return term === 'Term 1' ? hasPart1 : hasPart2;
  }
  let currentWorkbookCompetencyPupilId = null;

  // --- Setup form: add new competency rows directly from the app,
  // instead of a SQL script every time a new book's real rubric comes
  // in. Separate from grading — this defines the content, grading
  // happens against whatever's been defined here. ---
  let curricularGoalsListCache = null; // null|'loading'|'error:...'|[{id,goal_text,area_name}]
  function ensureCurricularGoalsListLoaded(reRenderFn){
    if(Array.isArray(curricularGoalsListCache)) return true;
    if(curricularGoalsListCache === 'loading') return false;
    if(typeof curricularGoalsListCache === 'string' && curricularGoalsListCache.startsWith('error:')) return true;
    curricularGoalsListCache = 'loading';
    fetch('backend/curriculum/get_curricular_goals.php' + window.location.search)
      .then(res => res.json())
      .then(data => {
        curricularGoalsListCache = data.status === 'success' ? data.curricular_goals : 'error:' + (data.message || 'Could not load Curricular Goals.');
        reRenderFn();
      })
      .catch(() => { curricularGoalsListCache = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }

  function renderAddCompetencyForm(workbookId, workbookName){
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.marginBottom = '16px';

    if(typeof curricularGoalsListCache === 'string' && curricularGoalsListCache.startsWith('error:')){
      wrap.innerHTML = `<div style="padding:14px;"><p style="margin:0;">${esc(curricularGoalsListCache.slice(6))}</p><button class="btn-primary" style="width:auto; padding:6px 12px; margin-top:8px;" onclick="curricularGoalsListCache=null; renderMonthlyAssessment(monthlyAssessmentTargetEl);">Retry</button></div>`;
      return wrap;
    }
    if(!Array.isArray(curricularGoalsListCache)){
      wrap.innerHTML = '<div style="padding:14px;"><p class="cap" style="margin:0;">Loading Curricular Goals…</p></div>';
      return wrap;
    }

    const cgOptions = curricularGoalsListCache.map(cg => `<option value="${cg.id}">${esc(cg.goal_text)}</option>`).join('');
    wrap.innerHTML = `
      <div class="hd"><div><h3>Add a competency to ${esc(workbookName)}</h3><p class="cap">Define a new row here once, from the real rubric document — grading against it becomes available immediately below.</p></div></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
        <div><label style="font-size:12px; font-weight:600; display:block; margin-bottom:3px;">Curricular Goal</label>
          <select id="newCompCgSelect" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${cgOptions}</select></div>
        <div><label style="font-size:12px; font-weight:600; display:block; margin-bottom:3px;">C-Code</label>
          <input id="newCompCode" placeholder="e.g. C-8.3" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:13px;" /></div>
      </div>
      <div style="margin-top:10px;"><label style="font-size:12px; font-weight:600; display:block; margin-bottom:3px;">Competency</label>
        <textarea id="newCompText" rows="2" placeholder="e.g. Counts up to 99 both forwards and backwards and in groups of 10s and 20s" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:13px; font-family:inherit; resize:vertical;"></textarea></div>
      <div style="margin-top:10px;"><label style="font-size:12px; font-weight:600; display:block; margin-bottom:3px;">Page numbers (optional, reference only)</label>
        <input id="newCompPages" placeholder="e.g. 6, 9, 19, 20" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:13px;" /></div>
      <div id="newCompResult" style="margin-top:8px;"></div>
      <button class="btn-primary" style="width:auto; padding:8px 16px; margin-top:10px;" onclick="submitNewWorkbookCompetency(${workbookId})">Add competency</button>
    `;
    return wrap;
  }

  async function submitNewWorkbookCompetency(workbookId){
    const resultEl = document.getElementById('newCompResult');
    const cgId = parseInt(document.getElementById('newCompCgSelect').value, 10);
    const cgCode = document.getElementById('newCompCode').value.trim();
    const competencyText = document.getElementById('newCompText').value.trim();
    const pageNumbers = document.getElementById('newCompPages').value.trim();

    if(!cgCode || !competencyText){
      resultEl.innerHTML = '<div class="au-error">C-Code and Competency are both required.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Saving…</p>';

    try{
      const res = await fetch('backend/assessment/workbook/add_workbook_competency.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ workbook_id: workbookId, curricular_goal_id: cgId, cg_code: cgCode, competency_text: competencyText, page_numbers: pageNumbers })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Could not save.')}</div>`;
        return;
      }
      resultEl.innerHTML = '<div class="au-success">✓ Added.</div>';
      // Force a fresh reload of this level+month's competencies so the
      // new row shows up in the grading table right away.
      const level = workbookLevelFromClassName();
      delete workbookCompetenciesCache[level + '|' + currentWorkbookMonth];
      document.getElementById('newCompCode').value = '';
      document.getElementById('newCompText').value = '';
      document.getElementById('newCompPages').value = '';
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }

  // Tally cache: month -> null|'loading'|'error:...'|{ [competencyId]: {count_e,count_p,count_a} }
  const workbookCompetencyTallyCache = {};
  function ensureWorkbookCompetencyTallyLoaded(month, reRenderFn){
    if(workbookCompetencyTallyCache[month] && typeof workbookCompetencyTallyCache[month] === 'object') return true;
    if(workbookCompetencyTallyCache[month] === 'loading') return false;
    if(typeof workbookCompetencyTallyCache[month] === 'string' && workbookCompetencyTallyCache[month].startsWith('error:')) return true;
    workbookCompetencyTallyCache[month] = 'loading';
    fetch('backend/assessment/workbook/get_workbook_competency_tally.php?' + new URLSearchParams({ month }) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(res => res.json())
      .then(data => {
        if(data.status !== 'success'){ workbookCompetencyTallyCache[month] = 'error:' + (data.message || 'Could not load tally counts.'); reRenderFn(); return; }
        const byCompetency = {};
        data.tally.forEach(t => { byCompetency[t.workbook_competency_id] = { count_e: t.count_e, count_p: t.count_p, count_a: t.count_a }; });
        workbookCompetencyTallyCache[month] = byCompetency;
        reRenderFn();
      })
      .catch(() => { workbookCompetencyTallyCache[month] = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }

  function saveWorkbookCompetencyTally(competencyId, month, countE, countP, countA){
    if(countE < 0 || countP < 0 || countA < 0) return;
    if(!workbookCompetencyTallyCache[month] || typeof workbookCompetencyTallyCache[month] !== 'object') return;
    workbookCompetencyTallyCache[month][competencyId] = { count_e: countE, count_p: countP, count_a: countA };
    fetch('backend/assessment/workbook/save_workbook_competency_tally.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ workbook_competency_id: competencyId, month, count_e: countE, count_p: countP, count_a: countA })
    }).then(res => res.json()).then(data => {
      if(data.status !== 'success'){ alert('Could not save that count — check your connection and try again.'); }
    }).catch(() => { alert('Could not save that count — check your connection and try again.'); });
  }

/* ===== teacher-part-09.js ===== */
/* =========================================================================
   teacher-part-09.js — part 9 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  // Bulk-import variant — same write, but awaitable and silent (no
  // alert per row) so importWorkbookTallyFile can save one row at a
  // time and collect failures into its own summary, rather than firing
  // a dozen simultaneous requests at a local dev PHP server (which
  // serializes requests one at a time and can drop/timeout ones fired
  // concurrently) and popping an alert per failure.
  async function saveWorkbookCompetencyTallySilent(competencyId, month, countE, countP, countA){
    try{
      const res = await fetch('backend/assessment/workbook/save_workbook_competency_tally.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ workbook_competency_id: competencyId, month, count_e: countE, count_p: countP, count_a: countA })
      });
      const data = await res.json();
      if(data.status === 'success'){
        if(workbookCompetencyTallyCache[month] && typeof workbookCompetencyTallyCache[month] === 'object'){
          workbookCompetencyTallyCache[month][competencyId] = { count_e: countE, count_p: countP, count_a: countA };
        }
        return { ok: true };
      }
      return { ok: false, message: data.message || 'Server rejected this row.' };
    } catch(err){
      return { ok: false, message: 'Could not reach the server.' };
    }
  }

  // ---- Child-wise Workbook: each child's B / P / A on each workbook page
  // (each page is linked to its CG). Saved in workbook_assessment through
  // backend/assessment/workbook/get|save_workbook_assessment.php. ----
  const workbookPagesCache = {};      // level|month -> 'loading' | 'error:..' | [{id, name, pages:[{id, page_number, cg_code, activity_title}]}]
  const workbookTeacherNotesCache = {}; // month|bookId -> notes by pupil
  const workbookTeacherNotesInflight = {};
  function ensureWorkbookTeacherNotesLoaded(month, bookId, reRender){
    const key = month + '|' + bookId;
    if(workbookTeacherNotesCache[key] && typeof workbookTeacherNotesCache[key] === 'object') return true;
    if(workbookTeacherNotesInflight[key]) return false;
    const url = 'backend/assessment/get_assessment_notes.php?' + new URLSearchParams({assessment_type:'workbook', month, context_id:bookId}) + (window.location.search ? '&' + window.location.search.slice(1) : '');
    workbookTeacherNotesInflight[key] = fetch(url)
      .then(r => r.json())
      .then(d => {
        workbookTeacherNotesCache[key] = d.status === 'success' ? (d.notes || {}) : 'error:' + (d.message || 'Could not load teacher notes.');
      })
      .catch(() => { workbookTeacherNotesCache[key] = 'error:Could not reach the server.'; })
      .finally(() => {
        delete workbookTeacherNotesInflight[key];
        if (typeof reRender === 'function') reRender();
      });
    return false;
  }
  async function saveWorkbookTeacherNote(pupilId, month, bookId, note){
    const key = month + '|' + bookId, cache = workbookTeacherNotesCache[key];
    if(cache && typeof cache === 'object') cache[pupilId] = note;
    try{
      const res = await fetch('backend/assessment/save_assessment_note.php' + window.location.search, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assessment_type:'workbook',month,context_id:bookId,pupil_id:pupilId,note})});
      const d = await res.json(); if(d.status !== 'success') throw new Error(d.message || 'Not saved.');
    }catch(err){ alert('That note was not saved: ' + (err.message || err)); delete workbookTeacherNotesCache[key]; renderMonthlyAssessment(monthlyAssessmentTargetEl); }
  }
  const workbookChildMarksCache = {}; // month -> 'loading' | 'error:..' | { pupilId: { pageId: 'E'|'P'|'A' } }
  function ensureWorkbookPagesLoaded(level, month, reRender){
    const key = level + '|' + month, c = workbookPagesCache[key];
    if(c && c !== 'loading') return true;
    if(c === 'loading') return false;
    workbookPagesCache[key] = 'loading';
    fetch('backend/get_workbook_pages.php?level=' + encodeURIComponent(level) + '&month=' + encodeURIComponent(month) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(r => r.json()).then(d => { workbookPagesCache[key] = d.status === 'success' ? (d.workbooks || []) : 'error:' + (d.message || 'Could not load the workbook pages.'); reRender(); })
      .catch(() => { workbookPagesCache[key] = 'error:Could not reach the server.'; reRender(); });
    return false;
  }
  function ensureWorkbookChildMarksLoaded(month, reRender){
    const c = workbookChildMarksCache[month];
    if(c && c !== 'loading') return true;
    if(c === 'loading') return false;
    workbookChildMarksCache[month] = 'loading';
    fetch('backend/get_workbook_assessment.php?month=' + encodeURIComponent(month) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(r => r.json()).then(d => {
        if(d.status !== 'success'){ workbookChildMarksCache[month] = 'error:' + (d.message || 'Could not load the workbook marks.'); reRender(); return; }
        const by = {}; (d.marks || []).forEach(m => { (by[m.pupil_id] = by[m.pupil_id] || {})[m.workbook_page_id] = m.level_mark; });
        workbookChildMarksCache[month] = by; reRender();
      }).catch(() => { workbookChildMarksCache[month] = 'error:Could not reach the server.'; reRender(); });
    return false;
  }
  // Tap a letter: saves it; tapping the chosen letter again clears it (= not assessed).
  async function saveWorkbookChildMark(pupilId, pageId, tier){
    const month = currentWorkbookMonth, by = workbookChildMarksCache[month];
    if(!by || typeof by !== 'object') return;
    const before = (by[pupilId] || {})[pageId] || null;
    const next = before === tier ? null : tier;
    (by[pupilId] = by[pupilId] || {})[pageId] = next; if(!next) delete by[pupilId][pageId];
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
    try {
      const res = await fetch('backend/save_workbook_assessment.php' + window.location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pupil_id: pupilId, workbook_page_id: pageId, level_mark: next }) });
      const d = await res.json();
      if(d.status !== 'success') throw new Error(d.message || 'Not saved.');
    } catch(err){
      if(before) (by[pupilId] = by[pupilId] || {})[pageId] = before; else if(by[pupilId]) delete by[pupilId][pageId];
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
      alert('That mark was not saved: ' + (err.message || err) + '\nPlease try again.');
    }
  }

  function renderWorkbookAssessmentSection(container){
    const level = workbookLevelFromClassName();
    const reRender = () => renderMonthlyAssessment(monthlyAssessmentTargetEl);
    // The term comes from the Term 1 / Term 2 bar at the top of Assessment (part 14).
    currentWorkbookTerm = 'Term ' + (typeof currentAssessTerm === 'function' ? currentAssessTerm() : 1);

    const pagesKey = level + '|' + currentWorkbookMonth;
    const pagesLoaded = ensureWorkbookPagesLoaded(level, currentWorkbookMonth, reRender);
    const marksLoaded = ensureWorkbookChildMarksLoaded(currentWorkbookMonth, reRender);
    const pupilsLoaded = ensurePupilsLoadedFor(container, reRender);
    ensureWorkbookCompetenciesLoaded(level, currentWorkbookMonth, reRender); // only for the competency descriptions in the CG summary
    const err = [workbookPagesCache[pagesKey], workbookChildMarksCache[currentWorkbookMonth]].find(x => typeof x === 'string' && x.startsWith('error:'));
    if(err){ renderRetryCard(container, err.slice(6), () => { delete workbookPagesCache[pagesKey]; delete workbookChildMarksCache[currentWorkbookMonth]; }); return; }
    if(!pagesLoaded || !marksLoaded || !pupilsLoaded){ container.appendChild(mdCard(null, 'Loading workbooks…', null)); return; }

    const books = workbookPagesCache[pagesKey];
    if(!books.length){ container.appendChild(mdCard(null, 'No workbooks are set up for ' + esc(level) + ' yet.', null)); return; }

    // --- Compact filters: Month + Workbook share one bar to avoid unnecessary vertical scrolling ---
    const booksThisTerm = books.filter(b => bookBelongsToTerm(b.name, currentWorkbookTerm));
    if(!booksThisTerm.length){ container.appendChild(mdCard(null, 'No workbooks for ' + currentWorkbookTerm + ' are set up for ' + esc(level) + ' yet.', null)); return; }
    if(!currentWorkbookCompetencyBookName || !booksThisTerm.some(b => b.name === currentWorkbookCompetencyBookName)) currentWorkbookCompetencyBookName = booksThisTerm[0].name;

    const filterBar = document.createElement('div');
    filterBar.className = 'fbar';
    filterBar.style.marginBottom = '12px';
    filterBar.innerHTML = `
      <div class="ctl">
        <label>Month</label>
        <select id="workbookCompMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select>
      </div>
      <div class="ctl">
        <label>Workbook</label>
        <select id="workbookCompBookSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px; min-width:180px;"></select>
      </div>`;
    container.appendChild(filterBar);

    const monthSel = filterBar.querySelector('#workbookCompMonthSelect');
    assessTermMonths().forEach(m => {
      const opt = document.createElement('option'); opt.value = m; opt.textContent = m;
      if(m === currentWorkbookMonth) opt.selected = true;
      monthSel.appendChild(opt);
    });
    monthSel.onchange = () => { currentWorkbookMonth = monthSel.value; reRender(); };

    const bookSel = filterBar.querySelector('#workbookCompBookSelect');
    booksThisTerm.forEach(b => {
      const opt = document.createElement('option'); opt.value = b.name; opt.textContent = b.name;
      if(b.name === currentWorkbookCompetencyBookName) opt.selected = true;
      bookSel.appendChild(opt);
    });
    bookSel.onchange = () => { currentWorkbookCompetencyBookName = bookSel.value; reRender(); };

    const selectedBook = booksThisTerm.find(b => b.name === currentWorkbookCompetencyBookName);
    const pages = selectedBook.pages || [];
    ensureWorkbookTeacherNotesLoaded(currentWorkbookMonth, selectedBook.id, reRender);
    container.appendChild(mdSec(esc(selectedBook.name) + ' — ' + currentWorkbookMonth, '<span class="reqs">ASM-WB1…WB4</span>'));
    if(!pages.length){ container.appendChild(mdCard(null, 'No pages of ' + esc(selectedBook.name) + ' are scheduled for ' + esc(currentWorkbookMonth) + '.', null)); return; }

    const marks = workbookChildMarksCache[currentWorkbookMonth];
    const workbookNotes = (workbookTeacherNotesCache[currentWorkbookMonth + '|' + selectedBook.id] && typeof workbookTeacherNotesCache[currentWorkbookMonth + '|' + selectedBook.id] === 'object') ? workbookTeacherNotesCache[currentWorkbookMonth + '|' + selectedBook.id] : {};
    const kids = realPupilsCache || [];
    let wbRecorded = 0;
    const wbTot = { B: 0, P: 0, A: 0 };
    kids.forEach(k => pages.forEach(pg => {
      const m = (marks[k.id] || {})[pg.id];
      if(m === 'E' || m === 'B'){ wbTot.B++; wbRecorded++; }
      else if(m === 'P'){ wbTot.P++; wbRecorded++; }
      else if(m === 'A'){ wbTot.A++; wbRecorded++; }
    }));
    const wbTotalCells = kids.length * pages.length;
    const wbCompleteness = wbTotalCells ? Math.round(wbRecorded / wbTotalCells * 100) : 0;
    const wbDsi = wbRecorded ? Math.round(((wbTot.A*3 + wbTot.P*2 + wbTot.B) / (3 * wbRecorded) * 200) * 10) / 10 : 0;
    const wbSri = wbRecorded ? Math.round((wbTot.P + wbTot.A) / wbRecorded * 100) : 0;
    const wbNoMarks = kids.filter(k => pages.every(pg => { const m = (marks[k.id] || {})[pg.id]; return !m; })).length;
    const summaryGrid = mdGrid('g5', [
      mdTile('Scope', pages.length, 'activities this month', mdPill(selectedBook.name, 'info'), 'ASM-WB1'),
      mdTile('Recording complete', wbCompleteness, '% of child/activity cells', mdPill(mdStatusBand(wbCompleteness, 90, 70).l, mdStatusBand(wbCompleteness, 90, 70).c), 'ASM-WB2', mdMeter(wbCompleteness)),
      mdTile('At Proficient or above', wbSri, '% SRI', mdPill(mdStatusBand(wbSri).l, mdStatusBand(wbSri).c), 'SRI', mdMeter(wbSri)),
      mdTile('Children with no marks', wbNoMarks, 'of ' + kids.length, wbNoMarks > kids.length/3 ? mdPill('Needs follow-up', 'crit') : wbNoMarks ? mdPill('Some still open', 'warn') : mdPill('All assessed', 'good'), 'ASM-WB4')
    ]);
    summaryGrid.style.marginBottom = '24px';
    container.appendChild(summaryGrid);
    const onPage = {}; pages.forEach(pg => { onPage[pg.page_number] = (onPage[pg.page_number] || 0) + 1; });
    const pageLabel = pg => 'Page ' + String(pg.page_number).replace(/\.0$/, '') + (onPage[pg.page_number] > 1 ? ' · Act ' + (pg.activity_no || 1) : ''); // a page can hold up to 3 activities
    let done = 0;
    let table = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="min-width:' + Math.max(640, 220 + pages.length * 118) + 'px;"><thead><tr><th style="text-align:left;">Child</th>'
      + pages.map(pg => `<th style="text-align:center;" title="${esc(pg.activity_title || '')}">${esc(pageLabel(pg))}<div class="dim" style="font-weight:500;">${esc(pg.cg_code)}</div></th>`).join('') + '<th style="text-align:left; min-width:220px;">Teacher notes</th></tr></thead><tbody>';
    kids.forEach(p => {
      const mine = marks[p.id] || {};
      table += `<tr><td style="text-align:left;"><b>${esc(p.name)}</b>${p.register_no ? '<div class="cap">' + esc(p.register_no) + '</div>' : ''}</td>`;
      pages.forEach(pg => {
        const cur = mine[pg.id] || null; if(cur) done++;
        table += '<td style="text-align:center; white-space:nowrap;">' + ['E', 'P', 'A'].map(t => `<button onclick="saveWorkbookChildMark(${p.id},${pg.id},'${t}')" title="${esc(gradeLabel(t))}" style="${gradeBtnStyle(t, cur === t, 26)} margin:0 2px;">${gradeBtnLabel(cur === t, t)}</button>`).join('') + '</td>';
      });
      table += `<td style="min-width:220px;"><input type="text" class="assessment-note-input" data-pupil="${p.id}" value="${esc(workbookNotes[p.id] || '')}" placeholder="Add a note" style="width:100%; min-width:200px; padding:8px 10px; border:1px solid var(--border,#d9dcd5); border-radius:6px; font-size:12.5px; font-family:inherit; box-sizing:border-box;"></td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    const workbookChildCard = mdCard(null, 'Child-wise: tap B, P or A for each child on each page (B Beginner · P Proficient · A Advanced). Each tap saves straight away; tap the chosen letter again to clear it. Blank = not assessed yet — never counted as Beginner. '
      + done + ' of ' + (kids.length * pages.length) + ' marks entered for ' + currentWorkbookMonth + '.', wrap);
    workbookChildCard.style.marginTop = '24px';
    container.appendChild(workbookChildCard);
    workbookChildCard.querySelectorAll('.assessment-note-input').forEach(inp => { inp.addEventListener('change', () => saveWorkbookTeacherNote(parseInt(inp.getAttribute('data-pupil'),10), currentWorkbookMonth, selectedBook.id, inp.value.trim())); });

    // --- CG summary, worked out from the child marks above: pages on the same CG add up ---
    const byCg = {};
    pages.forEach(pg => { const g = byCg[pg.cg_code] = byCg[pg.cg_code] || { pages: [], b: 0, p: 0, a: 0 }; g.pages.push(pageLabel(pg).replace('Page ', ''));
      kids.forEach(k => { const m = (marks[k.id] || {})[pg.id]; if(m === 'E') g.b++; else if(m === 'P') g.p++; else if(m === 'A') g.a++; }); });
    const compText = cg => { const c = ((workbookCompetenciesCache[level + '|' + currentWorkbookMonth] || []).find ? (workbookCompetenciesCache[level + '|' + currentWorkbookMonth].find(b => b.name === selectedBook.name) || {}).competencies || [] : []).find(x => x.cg_code === cg); return c ? c.competency_text : ''; };
    let sum = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="min-width:620px;"><thead><tr><th style="text-align:left;">CG</th><th style="text-align:left;">Pages</th>' + gradeHeads() + '<th>Total</th><th style="text-align:left;">Class level</th></tr></thead><tbody>';
    Object.keys(byCg).sort((x, y) => x.localeCompare(y, undefined, { numeric: true })).forEach(cg => {
      const g = byCg[cg], n = g.b + g.p + g.a, L = n ? cgLevel(g.b, g.p, g.a) : null;
      sum += `<tr><td style="text-align:left;"><b>${esc(cg)}</b>${compText(cg) ? '<div class="cap">' + esc(compText(cg)) + '</div>' : ''}</td><td style="text-align:left;">${esc(g.pages.join(', '))}</td><td>${g.b}</td><td>${g.p}</td><td>${g.a}</td><td>${n}</td><td style="text-align:left;">${L ? gradePill(L.letter, 'average ' + L.avg) : '<span class="dim">Not assessed yet</span>'}</td></tr>`;
    });
    sum += '</tbody></table></div>';
    const sw = document.createElement('div'); sw.innerHTML = sum;
    container.appendChild(mdCard('CG summary — ' + currentWorkbookMonth, 'Worked out from the child marks above — nothing to enter here. When several pages cover the same CG, their B / P / A all add up.', sw));

    if(myClassInfo.class_id){
      ensureWorkbookMonthSubmissionLoaded(myClassInfo.class_id, currentWorkbookMonth, () => renderMonthlyAssessment(monthlyAssessmentTargetEl));
    }
    const submissionStatus = workbookMonthSubmissionCache[currentWorkbookMonth];
    const isSubmitted = submissionStatus && typeof submissionStatus === 'object' && submissionStatus.submitted;

    // ---- Submit marks for the month (covers every workbook at once,
    // not just the one currently selected) — a real, database-backed
    // status flag. Submitting does NOT lock the numbers: every cell
    // above stays editable regardless. Placed after the table so the
    // action follows actually entering the marks. The Download
    // section right after this one only unlocks once this month shows
    // as submitted. ----
    const submitCard = document.createElement('div');
    submitCard.className = 'card'; submitCard.style.cssText = 'padding:16px 18px; margin-top:20px; margin-bottom:14px;';
    if(!myClassInfo.class_id || submissionStatus === undefined || submissionStatus === 'loading'){
      submitCard.innerHTML = '<p class="cap" style="margin:0;">Checking submission status…</p>';
    } else if(typeof submissionStatus === 'string' && submissionStatus.startsWith('error:')){
      submitCard.innerHTML = `<p class="cap" style="margin:0 0 8px; color:var(--danger, #c8433f);">${esc(submissionStatus.slice(6))}</p><button class="chip" onclick="delete workbookMonthSubmissionCache['${currentWorkbookMonth}']; renderMonthlyAssessment(monthlyAssessmentTargetEl);">Retry</button>`;
    } else if(isSubmitted){
      const submittedDate = new Date(submissionStatus.submitted_at).toLocaleDateString([], {day:'numeric', month:'short', year:'numeric'});
      submitCard.innerHTML = `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div><b style="color:var(--success);">✓ ${esc(currentWorkbookMonth)} submitted</b><p class="cap" style="margin:4px 0 0;">${submissionStatus.submitted_by_name ? esc(submissionStatus.submitted_by_name) + ' · ' : ''}${esc(submittedDate)} — numbers above are still editable; submitting is a status flag, not a lock.</p></div>
        <button style="padding:7px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12.5px; cursor:pointer;" onclick="unsubmitWorkbookMonth()">Undo submission</button>
      </div>`;
    } else {
      submitCard.innerHTML = `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div><b>Not yet submitted</b><p class="cap" style="margin:4px 0 0;">Covers every workbook for ${esc(currentWorkbookMonth)}, not just ${esc(selectedBook.name)} — submit once all books' numbers for this month are ready.</p></div>
        <button class="btn-primary" style="width:auto; padding:9px 18px;" onclick="submitWorkbookMonth()">Submit marks for ${esc(currentWorkbookMonth)}</button>
      </div>`;
    }
    container.appendChild(submitCard);

    // Report download lives in Assessment Dashboard → Assessment records.
    container.appendChild(assessmentReportsLink('workbook'));
  }

  function renderWorkbookTallyImportCard(selectedBook){
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <p class="cap" style="margin:0 0 8px;">.csv or .xlsx — header row must be exactly: cg_code,count_b,count_p,count_a (B Beginner · P Proficient · A Advanced) — cg_code must match one of ${esc(selectedBook.name)}'s competencies (shown as the small grey code under each competency), counts are whole numbers ≥ 0. Applies to ${esc(currentWorkbookMonth)} — the month currently selected above. One row per competency, not per child.</p>
      <input type="file" id="workbookTallyImportInput" accept=".csv,.xlsx" />
      <div id="workbookTallyImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importWorkbookTallyFile()">Import</button>
    `;
    return wrap;
  }

  async function importWorkbookTallyFile(){
    const input = document.getElementById('workbookTallyImportInput');
    const resultEl = document.getElementById('workbookTallyImportResult');
    if(!smartAssessHandoffRows && (!input || !input.files.length)){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    const level = workbookLevelFromClassName();
    const booksKey = level + '|' + currentWorkbookMonth;
    const books = workbookCompetenciesCache[booksKey];
    if(!Array.isArray(books)){
      resultEl.innerHTML = '<div class="au-error">Workbooks for this month have not finished loading — wait a moment and try again.</div>';
      return;
    }
    const selectedBook = books.find(b => b.name === currentWorkbookCompetencyBookName);
    if(!selectedBook){
      resultEl.innerHTML = '<div class="au-error">No workbook is currently selected above.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';
    let rows;
    try { rows = await readAssessmentFileRows(input && input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }

    const header = rows[0].map(h => h.toLowerCase().trim().replace(/^count_b$/, 'count_e')); // count_b (Beginner) = count_e
    if(header.join(',') !== 'cg_code,count_e,count_p,count_a'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: cg_code,count_b,count_p,count_a — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }

    const byCgCode = {};
    selectedBook.competencies.forEach(c => { byCgCode[c.cg_code.trim().toLowerCase()] = c; });

    let imported = 0;
    const skipped = [];
    for(let i = 1; i < rows.length; i++){
      const parts = rows[i];
      const rowNum = i + 1;
      if(parts.length !== 4){ skipped.push(`Row ${rowNum}: expected 4 columns, got ${parts.length}`); continue; }
      const [cgCodeRaw, eRaw, pRaw, aRaw] = parts;
      const comp = byCgCode[(cgCodeRaw || '').trim().toLowerCase()];
      if(!comp){ skipped.push(`Row ${rowNum}: "${cgCodeRaw}" isn't a competency code in ${esc(selectedBook.name)}`); continue; }
      const e = parseInt(eRaw, 10), p = parseInt(pRaw, 10), a = parseInt(aRaw, 10);
      if(isNaN(e) || isNaN(p) || isNaN(a) || e < 0 || p < 0 || a < 0){
        skipped.push(`Row ${rowNum}: counts must be whole numbers ≥ 0 — got "${eRaw}, ${pRaw}, ${aRaw}"`);
        continue;
      }
      resultEl.innerHTML = `<p class="sub">Saving ${cgCodeRaw}… (${imported} of ${rows.length - 1} done)</p>`;
      const result = await saveWorkbookCompetencyTallySilent(comp.id, currentWorkbookMonth, e, p, a);
      if(!result.ok){ skipped.push(`Row ${rowNum} (${cgCodeRaw}): ${result.message}`); continue; }
      imported++;
    }

    let html = `<div class="au-success">✓ Filled in ${imported} competenc${imported === 1 ? 'y' : 'ies'} — saved.</div>`;
    if(skipped.length > 0){
      html += `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<ul style="margin:4px 0 0 18px;">${skipped.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`;
    }
    resultEl.innerHTML = html;
    alert(`Imported ${imported} competency tally row(s) for ${selectedBook.name} — ${currentWorkbookMonth}.` + (skipped.length ? ` ${skipped.length} skipped — see the details below.` : ''));
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }



  const ASSESSMENT_TYPE_INFO = {
    pretest: { label: 'Pre-Test', icon: '📋', reqs: 'ASM-PT1…3' },          // first: the baseline, before teaching starts
    observation: { label: 'Classroom Observation', icon: '👁️', reqs: 'ASM-O1…O3' },
    workbook: { label: 'Workbook Assessment', icon: '📘', reqs: 'ASM-WB1…WB4' },
    motor: { label: 'Fine & Gross Motor', icon: '🤸', reqs: 'ASM-M1…M2' }
  };
  // Weekly Assessment and Monthly Assessment were removed pending a
  // restructure — was previously a computed rollup (Weekly Review /
  // Monthly Review) over Workbook + Classroom Observation evidence.
  // WEEKLY_ASSESSMENT_ACTIVITIES and TIER_INFO below are NOT dead code —
  // Pre-Test still depends on both directly, since it shares the same
  // real 26-activity list.
  let assessmentEntryType = 'pretest'; // Assessment opens on Pre-Test
  function switchAssessmentEntryType(type){
    assessmentEntryType = type;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  // ---------------------------------------------------------------
  // WEEKLY ASSESSMENT — real activity-level structure, matching the
  // actual Bhavyata Foundation worksheet ("NEP 2020 Pre-Test Assessment
  // Sheet" / weekend worksheet pack): specific named activities (20
  // worksheet + 6 classroom = 26), each tied to a real Curricular Goal
  // code, rated Green/achieved · Yellow/developing · Red/needs support
  // — not the abstract 10-domain B/P/A grid Monthly and Classroom
  // Observation use. This is a genuinely different instrument, done
  // weekly (Saturdays), not a relabeled copy of the monthly one.
  // ---------------------------------------------------------------
  const WEEKLY_ASSESSMENT_ACTIVITIES = [
    { type: 'Worksheet', activity: 'Tick the good hygiene habits', cg: 'CG 1.2', page: '04' },
    { type: 'Worksheet', activity: 'Circle the organised classroom habits', cg: 'CG 1.3', page: '03' },
    { type: 'Worksheet', activity: 'Tick the safe tools', cg: 'CG 1.4', page: '04' },
    { type: 'Worksheet', activity: 'Circle soft things', cg: 'CG 2.5', page: '01' },
    { type: 'Worksheet', activity: 'Circle your family members', cg: 'CG 4.1', page: '04' },
    { type: 'Worksheet', activity: 'Circle how you feel today', cg: 'CG 4.2', page: '03' },
    { type: 'Worksheet', activity: 'Circle the kind actions', cg: 'CG 4.6', page: '04' },
    { type: 'Worksheet', activity: 'Tick the children respecting others', cg: 'CG 4.7', page: '03' },
    { type: 'Worksheet', activity: 'Put same time objects together', cg: 'CG 7.1', page: '02' },
    { type: 'Worksheet', activity: 'Circle all the traced circles', cg: 'CG 8.1', page: '03' },
    { type: 'Worksheet', activity: 'Circle what comes next', cg: 'CG 8.2', page: '01' },
    { type: 'Worksheet', activity: 'Match the shape to object', cg: 'CG 8.8', page: '02' },
    { type: 'Worksheet', activity: 'Circle the heavy object', cg: 'CG 8.9', page: '02' },
    { type: 'Worksheet', activity: 'Tick the boy who is singing', cg: 'CG 9.1', page: '01' },
    { type: 'Worksheet', activity: 'Tick after doing each action', cg: 'CG 9.4', page: '02' },
    { type: 'Worksheet', activity: 'Trace the dotted lines', cg: 'CG 10.8', page: '04' },
    { type: 'Worksheet', activity: 'Make an artwork using any material', cg: 'CG 12.1', page: '03' },
    { type: 'Worksheet', activity: 'Tick the children who is working alone', cg: 'CG 12.4', page: '02' },
    { type: 'Worksheet', activity: 'Tick the child who has not completed the task', cg: 'CG 13.1', page: '01' },
    { type: 'Worksheet', activity: 'Circle what you want to explore', cg: 'CG 13.3', page: '01' },
    { type: 'Classroom', activity: 'Move Safely Game', cg: 'CG 1.5', page: '—' },
    { type: 'Classroom', activity: 'Touch and Tell Bag', cg: 'CG 2.5', page: '—' },
    { type: 'Classroom', activity: 'Carry and Walk Task', cg: 'CG 3.4', page: '—' },
    { type: 'Classroom', activity: 'Take Turn Game', cg: 'CG 4.4', page: '—' },
    { type: 'Classroom', activity: 'Which Tool for What?', cg: 'CG 7.3', page: '—' },
    { type: 'Classroom', activity: 'Count and Give', cg: 'CG 8.3', page: '—' }
  ];
  // weeklyAssessmentEntries[weekNum][studentName][activityIndexAsString] = 'E'|'P'|'A'
  // Same shape as monthlyAssessmentEntries/classroomObservationEntries
  // (student-first, key-second) and the same B/P/A scale (via the
  // existing TIER_INFO/assessmentTierCell/toggleAssessmentPopup/
  // setAssessmentTier below) — deliberately not a separate G/Y/R system,
  // so every assessment type in this app reads the same way.
  let selectedWeeklyActivityIdx = 0;

  // Direct set (no popup step) for the compact grading grid — tapping
  // the already-active letter again clears it back to unmarked, same
  // "tap again to clear" behavior Attendance's Present/Absent uses.
  function setWeeklyActivityQuickTier(name, tier){
    const store = getAssessmentStore();
    if(!store[name]) store[name] = {};
    const key = String(selectedWeeklyActivityIdx);
    if(store[name][key] === tier) delete store[name][key];
    else store[name][key] = tier;
    saveAssessmentStore();
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  // Wipes every recorded grade for the currently selected week, for
  // every child and every activity — a genuine fresh start, not just
  // clearing the one activity on screen. Confirmed first since this
  // can't be undone.
  function clearWeeklyAssessmentWeek(){
    if(!confirm('Clear every recorded grade for Week ' + currentWeekNum + '? This removes all activities for all children this week — it can\'t be undone.')) return;
    weeklyAssessmentEntries[currentWeekNum] = {};
    saveWeeklyAssessmentEntries();
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  // Serves all three types now — Weekly, Monthly, and Classroom
  // Observation share the same shape (studentName -> key -> tier) and
  // the same B/P/A scale; only the key means something different
  // (activity index for Weekly, domain key for the other two).
  function getAssessmentStore(){
    if(assessmentEntryType === 'weekly'){
      if(!weeklyAssessmentEntries[currentWeekNum]) weeklyAssessmentEntries[currentWeekNum] = {};
      return weeklyAssessmentEntries[currentWeekNum];
    }
    if(assessmentEntryType === 'observation') return classroomObservationEntries;
    return monthlyAssessmentEntries;
  }
  function saveAssessmentStore(){
    if(assessmentEntryType === 'weekly') saveWeeklyAssessmentEntries();
    else if(assessmentEntryType === 'observation') saveClassroomObservationEntries();
    else saveMonthlyAssessmentEntries();
  }

  // Wipes every recorded grade for whichever type is currently active
  // (Monthly Assessment or Classroom Observation) — every child, every
  // domain. For Monthly this only clears real recorded entries; the
  // representative sample cells shown for anything never actually
  // graded are re-seeded fresh on the next render, same as always.
  // Confirmed first since this can't be undone.
  // Once the teacher explicitly clears Monthly Assessment to start
  // fresh, sample-seeding stops permanently (until real data exists
  // again) — otherwise every render would immediately re-fill the
  // just-cleared grid with new random sample values, making "clear and
  // start fresh" look like it did nothing.
  let monthlyAssessmentSeedingDisabled = false;
  (function loadMonthlyAssessmentSeedingDisabled(){
    try { monthlyAssessmentSeedingDisabled = localStorage.getItem('monthlyAssessmentSeedingDisabled') === 'true'; }
    catch(e){ /* malformed or unavailable — default to seeding enabled */ }
  })();
  // Real pupil names for the Assessment section — same realPupilsCache
  // My Pupils / Class Attendance already fetch and share. Returns an
  // empty array if pupils haven't loaded yet; callers guard on that
  // via ensurePupilsLoadedFor() below rather than each checking this
  // return value themselves.
  function assessmentPupilNames(){
    return Array.isArray(realPupilsCache) ? realPupilsCache.map(p => p.name) : [];
  }

  // Shared loading/error guard for any screen that needs real pupils
  // before it can render anything meaningful — fetches once, and
  // triggers reRenderFn again automatically once fetchMyPupils()
  // resolves (fetchMyPupils already knows to re-render Class
  // Attendance/My Pupils; this list is how it also learns about
  // whichever Assessment/Reports screen called this).
  const pupilsLoadedRerenderTargets = [];
  function ensurePupilsLoadedFor(container, reRenderFn){
    if(Array.isArray(realPupilsCache)) return true;
    if(realPupilsCache === null){
      if(!pupilsLoadedRerenderTargets.includes(reRenderFn)) pupilsLoadedRerenderTargets.push(reRenderFn);
      fetchMyPupils();
      container.innerHTML = '<p class="cap">Loading pupils…</p>';
    } else if(realPupilsCache === 'loading'){
      // A manual retry option alongside the spinner, not just after a
      // failure — with a fluctuating connection, a request can hang
      // well past the point a person is willing to wait. Retrying
      // doesn't cancel the original (the 12s timeout in fetchMyPupils
      // handles that); it just starts a fresh attempt and shows
      // whichever one resolves first.
      const wrap = document.createElement('div');
      wrap.innerHTML = '<p class="cap">Loading pupils…</p><button style="margin-top:6px; padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:12.5px;">Taking a while? Retry</button>';
      wrap.querySelector('button').onclick = () => { realPupilsCache = null; ensurePupilsLoadedFor(container, reRenderFn); };
      container.innerHTML = '';
      container.appendChild(wrap);
    } else if(typeof realPupilsCache === 'string' && realPupilsCache.startsWith('error:')){
      const wrap = document.createElement('div');
      wrap.innerHTML = `<p class="cap" style="color:var(--danger, #c8433f);">${esc(realPupilsCache.slice(6))}</p><button style="margin-top:6px; padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:12.5px;">Retry</button>`;
      wrap.querySelector('button').onclick = () => { realPupilsCache = null; ensurePupilsLoadedFor(container, reRenderFn); };
      container.innerHTML = '';
      container.appendChild(wrap);
    }
    return false;
  }

  function saveMonthlyAssessmentSeedingDisabled(){
    try { localStorage.setItem('monthlyAssessmentSeedingDisabled', String(monthlyAssessmentSeedingDisabled)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }

  function clearActiveAssessmentType(){
    const typeInfo = ASSESSMENT_TYPE_INFO[assessmentEntryType];
    if(!confirm('Clear every recorded grade for ' + typeInfo.label + '? This removes it for every child in every domain — it can\'t be undone.')) return;
    const store = getAssessmentStore();
    assessmentPupilNames().forEach(name => { store[name] = {}; });
    saveAssessmentStore();
    if(assessmentEntryType === 'monthly'){
      monthlyAssessmentSeedingDisabled = true;
      saveMonthlyAssessmentSeedingDisabled();
    }
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  // Fills any (child, domain) cell neither real data nor a previous seed
  // has touched with representative sample data — called by both Monthly
  // Assessment and the Assessment Dashboard so whichever loads first
  // doesn't matter. Never overwrites a real recorded value.
  // (Removed: invented monthly grades.) Every child gets an empty entry —
  // nothing recorded until a teacher records it.
  function ensureMonthlyAssessmentSeeded(){
    (Array.isArray(realPupilsCache) ? realPupilsCache.map(p => p.name) : []).forEach(name => {
      if(!monthlyAssessmentEntries[name]) monthlyAssessmentEntries[name] = {};
    });
  }
  // Same seeding idea, generalized for whichever store is currently
  // active — Weekly and Classroom Observation start genuinely empty
  // (no fabricated history), so this only ever touches monthlyAssessmentEntries.
  function ensureActiveAssessmentSeeded(){
    if(assessmentEntryType === 'monthly') ensureMonthlyAssessmentSeeded();
    else {
      const store = getAssessmentStore();
      assessmentPupilNames().forEach(name => { if(!store[name]) store[name] = {}; });
    }
  }
  var monthlyAssessmentTargetEl = null; // remembers where to re-render (embedded tab vs standalone section)
  // Real activity-level Weekly Assessment — one row per activity (not
  // per domain), G/Y/R per student, with the same auto-calculated
  // columns the real worksheet has: per-activity Green/Yellow/Red
  // counts, class avg score (max 3), % Green, plus a per-student
  // summary block mirroring "C. PER-STUDENT SUMMARY" on the real sheet.
  function renderWeeklyAssessmentSection(container){
    const weekStore = weeklyAssessmentEntries[currentWeekNum] || {};
    assessmentPupilNames().forEach(name => { if(!weekStore[name]) weekStore[name] = {}; });

    // --- Class-wide stats ---
    let totalCells = 0, recordedCells = 0;
    const tot = { E: 0, P: 0, A: 0 };
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      assessmentPupilNames().forEach(name => {
        totalCells++;
        const v = weekStore[name][String(idx)];
        if(v){ recordedCells++; tot[v]++; }
      });
    });
    const completeness = totalCells ? Math.round(recordedCells / totalCells * 100) : 0;
    const avgScore = recordedCells ? Math.round((tot.A*3 + tot.P*2 + tot.E*1) / recordedCells * 100) / 100 : 0;
    const pctAdvanced = recordedCells ? Math.round(tot.A / recordedCells * 100) : 0;

    container.appendChild(mdSec('Weekly Assessment — Week ' + currentWeekNum, '<span class="reqs">ASM-W1…W4</span>'));
    container.appendChild(mdGrid('g4', [
      mdTile('Activities', WEEKLY_ASSESSMENT_ACTIVITIES.length, '20 worksheet + 6 classroom', mdPill('Due Saturday', 'info'), 'ASM-W1'),
      mdTile('Recording complete', completeness, '% of cells', mdPill(mdStatusBand(completeness, 90, 70).l, mdStatusBand(completeness, 90, 70).c), 'ASM-W2', mdMeter(completeness)),
      mdTile('Class avg score', avgScore, 'of 3', mdPill(mdStatusBand(avgScore/3*100).l, mdStatusBand(avgScore/3*100).c), 'ASM-W3', mdMeter(avgScore/3*100)),
      mdTile('% Advanced', pctAdvanced, 'achieved', mdPill(mdStatusBand(pctAdvanced).l, mdStatusBand(pctAdvanced).c), 'ASM-W4', mdMeter(pctAdvanced))
    ]));

    // --- Add data: pick ONE activity, grade every child as a row.
    // Deliberately not a 26-activity × 40-child grid — at real class
    // sizes that grid becomes unusable (40+ tiny tappable columns).
    // Grading one activity at a time, with children as a scrollable
    // list, is the same shape Attendance already uses at this class
    // size and works the same way here regardless of roll count. ---
    container.appendChild(mdSec('Add data — Weekly Assessment', '<span class="reqs">' + 'ASM-W1…W4' + '</span>'));
    const totalGradedThisWeek = assessmentPupilNames().filter(n => Object.keys(weekStore[n]).length > 0).length;
    if(totalGradedThisWeek > 0){
      const resetRow = document.createElement('div'); resetRow.style.cssText = 'margin:4px 0 14px;';
      const resetBtn = document.createElement('button');
      resetBtn.textContent = '↺ Enter manually — clear all and start fresh';
      resetBtn.style.cssText = 'padding:7px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:12.5px; font-weight:600;';
      resetBtn.onclick = clearWeeklyAssessmentWeek;
      resetRow.appendChild(resetBtn);
      container.appendChild(resetRow);
    }
    const pickerBar = document.createElement('div'); pickerBar.className = 'fbar'; pickerBar.style.marginBottom = '16px';
    pickerBar.innerHTML = '<div class="ctl" style="flex:1; min-width:280px;"><label>Activity</label><select id="weeklyActivitySelect" style="width:100%; padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    container.appendChild(pickerBar);
    const actSel = pickerBar.querySelector('#weeklyActivitySelect');
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const opt = document.createElement('option'); opt.value = idx;
      opt.textContent = (idx + 1) + '. [' + a.type + '] ' + a.activity + ' — ' + a.cg;
      if(idx === selectedWeeklyActivityIdx) opt.selected = true;
      actSel.appendChild(opt);
    });
    actSel.onchange = () => { selectedWeeklyActivityIdx = parseInt(actSel.value, 10); renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    const activeActivity = WEEKLY_ASSESSMENT_ACTIVITIES[selectedWeeklyActivityIdx];
    const actMeta = document.createElement('p');
    actMeta.className = 'cap'; actMeta.style.margin = '0 0 14px';
    actMeta.textContent = activeActivity.type + ' · ' + activeActivity.cg + ' · Page ' + activeActivity.page;
    container.appendChild(actMeta);

    // Compact grid, not one full-width row per child — direct B/P/A
    // buttons (no tap-to-open-popup step) fit far more children per
    // screen, the same trade Attendance's Present/Absent redesign made.
    // At minmax(200px,1fr) this fits 4-6 children per row on desktop
    // and keeps working, just narrower, at 40 on the roll.
    const gradeGrid = document.createElement('div');
    gradeGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:8px; margin-bottom:16px;';
    const tierColors = { E: 'var(--danger,#c8433f)', P: '#EE8F35', A: 'var(--success)' };
    const observationNotes = (observationTeacherNotesCache[currentWorkbookMonth + '|' + selectedTheme.id] && typeof observationTeacherNotesCache[currentWorkbookMonth + '|' + selectedTheme.id] === 'object') ? observationTeacherNotesCache[currentWorkbookMonth + '|' + selectedTheme.id] : {};
    gradeGrid.innerHTML = assessmentPupilNames().map(name => {
      const tier = weekStore[name][String(selectedWeeklyActivityIdx)];
      const btns = ['E','P','A'].map(t => {
        const active = tier === t;
        const letter = TIER_INFO[t].letter;
        return `<button onclick="setWeeklyActivityQuickTier('${esc(name)}','${t}')" title="${TIER_INFO[t].n}" style="${gradeBtnStyle(t, active, 28)} margin:0 auto;">${gradeBtnLabel(active, t)}</button>`;
      }).join('');
      return `<div style="border:1px solid var(--border); border-radius:8px; padding:8px; background:var(--card);">
        <div style="font-weight:600; font-size:12px; margin-bottom:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(name)}">${esc(name)}</div>
        <div style="display:flex; gap:4px;">${btns}</div>
        <div style="font-size:10px; margin-top:5px; color:var(--success); font-weight:600; visibility:${tier ? 'visible' : 'hidden'};">✓ Saved</div>
      </div>`;
    }).join('');
    container.appendChild(mdCard(null, 'Tapping a rating saves it immediately — the "✓ Saved" mark under each name confirms it. This grid stays compact whether the class has 6 children or 40.', gradeGrid));

    container.appendChild(renderWeeklyImportCard());

    // --- Download report — Section 2: a standalone .pdf of this
    // week's data, separate from the entry section above. Only shown
    // once something has actually been recorded — an empty report
    // helps nobody. ---
    container.appendChild(mdSec('Download report — Week ' + currentWeekNum, '<span class="reqs">' + 'ASM-W1…W4' + '</span>'));
    if(totalGradedThisWeek > 0){
      const dlWrap = document.createElement('div'); dlWrap.style.cssText = 'margin-top:22px; margin-bottom:16px;';
      const dlBtn = document.createElement('button');
      dlBtn.className = 'btn-primary'; dlBtn.style.cssText = 'width:auto; padding:9px 16px;';
      dlBtn.textContent = '⬇ Download Week ' + currentWeekNum + ' report (PDF)';
      dlBtn.onclick = downloadWeeklyAssessmentPdf;
      dlWrap.appendChild(dlBtn);
      container.appendChild(dlWrap);
    } else {
      container.appendChild(mdCard(null, 'Nothing recorded for Week ' + currentWeekNum + ' yet — grade at least one activity above to enable the report.', null));
    }

    // --- Per-activity summary — aggregate counts only, no per-student
    // columns, so this table's width never depends on roll size. ---
    container.appendChild(mdSec('Every activity, at a glance', '<span class="reqs">ASM-W1…W4</span>'));
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>#</th><th>Type</th><th>Activity</th><th>CG</th><th>Page</th><th>Marked</th><th><span class="gd gd-B" style="width:20px; height:20px; font-size:10px;">B</span></th><th><span class="gd gd-P" style="width:20px; height:20px; font-size:10px;">P</span></th><th><span class="gd gd-A" style="width:20px; height:20px; font-size:10px;">A</span></th><th>Avg</th><th>% Advanced</th></tr></thead><tbody>';
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const rowTiers = assessmentPupilNames().map(name => weekStore[name][String(idx)] || null);
      const e = rowTiers.filter(t => t === 'E').length;
      const p = rowTiers.filter(t => t === 'P').length;
      const ac = rowTiers.filter(t => t === 'A').length;
      const marked = e + p + ac;
      const rowAvg = marked ? Math.round((ac*3 + p*2 + e*1) / marked * 100) / 100 : 0;
      const rowPctA = marked ? Math.round(ac / marked * 100) : 0;
      const isActive = idx === selectedWeeklyActivityIdx;
      table += `<tr style="cursor:pointer; ${isActive ? 'background:var(--bg);' : ''}" onclick="selectedWeeklyActivityIdx=${idx}; renderMonthlyAssessment(monthlyAssessmentTargetEl);">
        <td class="dim">${idx + 1}</td><td class="dim">${esc(a.type)}</td><td><b>${esc(a.activity)}</b></td><td class="dim">${esc(a.cg)}</td><td class="dim">${esc(a.page)}</td>
        <td>${marked}/${assessmentPupilNames().length}</td><td>${e}</td><td>${p}</td><td>${ac}</td><td>${rowAvg}</td><td>${marked ? rowPctA + '%' : '—'}</td>
      </tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Tap a row to grade that activity above.', wrap));

    // --- Per-student summary (matches the real sheet's "C. PER-STUDENT SUMMARY") ---
    container.appendChild(mdSec('Per-student summary', '<span class="reqs">ASM-W5</span>'));
    let sTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th><th>Activities assessed</th><th><span class="gd gd-B" style="width:20px; height:20px; font-size:10px;">B</span></th><th><span class="gd gd-P" style="width:20px; height:20px; font-size:10px;">P</span></th><th><span class="gd gd-A" style="width:20px; height:20px; font-size:10px;">A</span></th><th>Total score</th><th>Max possible</th><th>% Achievement</th><th>Band</th></tr></thead><tbody>';
    assessmentPupilNames().forEach(name => {
      let se = 0, sp = 0, sa = 0, assessed = 0;
      WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
        const v = weekStore[name][String(idx)];
        if(v === 'E') se++; else if(v === 'P') sp++; else if(v === 'A') sa++;
        if(v) assessed++;
      });
      const totalScore = sa*3 + sp*2 + se*1;
      const maxPossible = assessed * 3;
      const pctAchievement = maxPossible ? Math.round(totalScore / maxPossible * 100) : 0;
      const band = !assessed ? mdPill('Not started', 'neu') : pctAchievement >= 85 ? mdPill('Advanced', 'good') : pctAchievement >= 60 ? mdPill('Proficient', 'warn') : mdPill('Beginner', 'crit');
      sTable += `<tr style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(name)}')"><td><b>${esc(name)}</b></td><td>${assessed}/${WEEKLY_ASSESSMENT_ACTIVITIES.length}</td><td>${se}</td><td>${sp}</td><td>${sa}</td><td>${totalScore}</td><td>${maxPossible}</td><td>${assessed ? pctAchievement + '%' : '—'}</td><td>${band}</td></tr>`;
    });
    sTable += '</tbody></table></div>';
    const sWrap = document.createElement('div'); sWrap.innerHTML = sTable;
    container.appendChild(mdCard(null, 'Auto-calculated from the activities above — never entered separately, so it can\'t drift out of sync with them.', sWrap));
  }

  // Import specific to Weekly Assessment's real shape: rows reference
  // an activity number (1-26, matching the order above) rather than a
  // domain key — tier is B/P/A, same scale as Monthly and Classroom
  // Observation.
  function renderWeeklyImportCard(){
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.marginTop = '4px';
    wrap.innerHTML = `
      <div class="hd"><div><h3>Import Weekly Assessment from a file</h3><p class="cap">.csv or .xlsx — header row must be exactly: child_name,activity_no,tier — activity_no is 1-${WEEKLY_ASSESSMENT_ACTIVITIES.length} (matching the activity list above, in order), tier is B, P or A. Built for large rolls: one row per child per activity, so a 40-child class is 40 rows, not 40 columns.</p></div></div>
      <input type="file" id="weeklyImportInput" accept=".csv,.xlsx" style="margin-top:8px;" />
      <div id="weeklyImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importWeeklyAssessmentFile()">Import</button>
    `;
    return wrap;
  }

  async function importWeeklyAssessmentFile(){
    const input = document.getElementById('weeklyImportInput');
    const resultEl = document.getElementById('weeklyImportResult');
    if(!input.files.length){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';
    let rows;
    try {
      rows = await readAssessmentFileRows(input.files[0]);
    } catch(err){
      resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`;
      return;
    }
    if(!rows.length){
      resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>';
      return;
    }
    const header = rows[0].map(h => h.toLowerCase());
    if(header.join(',') !== 'child_name,activity_no,tier'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: child_name,activity_no,tier — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }
    if(!weeklyAssessmentEntries[currentWeekNum]) weeklyAssessmentEntries[currentWeekNum] = {};
    const weekStore = weeklyAssessmentEntries[currentWeekNum];
    let imported = 0;
    const skipped = [];
    for(let i = 1; i < rows.length; i++){
      const parts = rows[i];
      const rowNum = i + 1;
      if(parts.length !== 3){ skipped.push(`Row ${rowNum}: expected 3 columns, got ${parts.length}`); continue; }
      const [childName, activityNoRaw, tierRaw] = parts;
      const activityIdx = parseInt(activityNoRaw, 10) - 1;
      let tier = tierRaw.toUpperCase();
      if(tier === 'B') tier = 'E'; // accept the displayed letter (Beginner) as well as the internal code
      if(!assessmentPupilNames().includes(childName)){ skipped.push(`Row ${rowNum}: "${childName}" is not a child in this class`); continue; }
      if(isNaN(activityIdx) || activityIdx < 0 || activityIdx >= WEEKLY_ASSESSMENT_ACTIVITIES.length){ skipped.push(`Row ${rowNum}: "${activityNoRaw}" must be 1-${WEEKLY_ASSESSMENT_ACTIVITIES.length}`); continue; }
      if(!['E','P','A'].includes(tier)){ skipped.push(`Row ${rowNum}: "${tierRaw}" must be B, P, or A`); continue; }
      if(!weekStore[childName]) weekStore[childName] = {};
      weekStore[childName][String(activityIdx)] = tier;
      imported++;
    }
    if(imported > 0) saveWeeklyAssessmentEntries();
    let html = `<div class="au-success">✓ Filled in ${imported} cell${imported === 1 ? '' : 's'} — saved.</div>`;
    if(skipped.length > 0){
      html += `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<ul style="margin:4px 0 0 18px;">${skipped.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`;
    }
    resultEl.innerHTML = html;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  // Shared header line for every assessment PDF — reads the teacher's
  // name from the topbar DOM element (not hardcoded) and the real
  // class_name from myClassInfo, so these reports pick up the actual
  // logged-in teacher and class once GAP-topbar-name is fixed, rather
  // than baking in a placeholder the way the old TLM PDF export did.
  function assessmentPdfHeaderLine(){
    const nameEl = document.querySelector('.user-name');
    const teacherName = (nameEl && nameEl.textContent.trim()) || 'Teacher';
    return teacherName + ' — ' + myClassInfo.class_name;
  }

  // Section 2 of every assessment tab: a real .pdf of that assessment
  // window's data, generated client-side via jsPDF + autoTable (same
  // library already used for the TLM & Resources report). Weekly gets
  // its own export (activity-level, not domain-level) since its data
  // shape is genuinely different from Monthly/Observation.
  function downloadWeeklyAssessmentPdf(){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const weekStore = weeklyAssessmentEntries[currentWeekNum] || {};
    const weekTheme = (WEEKS.find(w => w.w === currentWeekNum) || {}).theme || '';
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Weekly Assessment — Week ' + currentWeekNum + (weekTheme ? ' · ' + weekTheme : ''), 14, 15);
    doc.setFontSize(9);
    doc.text(assessmentPdfHeaderLine() + ' · generated ' + new Date().toLocaleDateString(), 14, 21);

    doc.autoTable({
      startY: 26,
      head: [['#', 'Type', 'Activity', 'CG', 'Page', 'Marked', 'B Beginner', 'P Proficient', 'A Advanced', 'Avg', '% Advanced']],
      body: WEEKLY_ASSESSMENT_ACTIVITIES.map((a, idx) => {
        const rowTiers = assessmentPupilNames().map(name => (weekStore[name] && weekStore[name][String(idx)]) || null);
        const e = rowTiers.filter(t => t === 'E').length;
        const p = rowTiers.filter(t => t === 'P').length;
        const ac = rowTiers.filter(t => t === 'A').length;
        const marked = e + p + ac;
        const rowAvg = marked ? Math.round((ac*3 + p*2 + e*1) / marked * 100) / 100 : 0;
        const rowPctA = marked ? Math.round(ac / marked * 100) : 0;
        return [idx + 1, a.type, a.activity, a.cg, a.page, marked + '/' + assessmentPupilNames().length, e, p, ac, rowAvg, marked ? rowPctA + '%' : '—'];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });

    const secondTableY = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : 26) + 10;
    doc.setFontSize(12);
    doc.text('Per-student summary', 14, secondTableY);
    doc.autoTable({
      startY: secondTableY + 4,
      head: [['Child', 'Activities assessed', 'B Beginner', 'P Proficient', 'A Advanced', 'Total score', 'Max possible', '% Achievement', 'Band']],
      body: assessmentPupilNames().map(name => {
        let se = 0, sp = 0, sa = 0, assessed = 0;
        WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
          const v = weekStore[name] && weekStore[name][String(idx)];
          if(v === 'E') se++; else if(v === 'P') sp++; else if(v === 'A') sa++;
          if(v) assessed++;
        });
        const totalScore = sa*3 + sp*2 + se*1;
        const maxPossible = assessed * 3;
        const pctAchievement = maxPossible ? Math.round(totalScore / maxPossible * 100) : 0;
        const band = !assessed ? 'Not started' : pctAchievement >= 85 ? 'Advanced' : pctAchievement >= 60 ? 'Proficient' : 'Beginner';
        return [name, assessed + '/' + WEEKLY_ASSESSMENT_ACTIVITIES.length, se, sp, sa, totalScore, maxPossible, assessed ? pctAchievement + '%' : '—', band];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });

    doc.save('weekly-assessment-week' + currentWeekNum + '-' + todayKey() + '.pdf');
  }

  // ---------------------------------------------------------------
  // PRE-TEST — moved here from Reports > Assessment Dashboard > Child
  // Record, where it was mixed in with read-only analysis. Same real
  // 26-activity list as Weekly Assessment, but graded once per child
  // (baseline) rather than every week — so it reuses Weekly's exact
  // "pick one activity, grade every child as a row" pattern, just
  // without week-scoping. preTestAssessmentEntries/setPreTestTier
  // already existed for the old per-child form; this adds the
  // class-wide entry point on top of the same data.
  //
  // UPDATED: switched from per-child grading to a class-wide tally
  // (count of how many children scored E/P/A per activity), same
  // model as Workbook Assessment — entered directly as number boxes
  // in the CG-grouped table below, no separate per-child grid anymore.
  // preTestAssessmentEntries (per-child) still exists and still feeds
  // Child Record and the CSV import, but nothing on THIS screen writes
  // to it anymore — a deliberate, known tradeoff, not an oversight.
  // ---------------------------------------------------------------
  let preTestTypeFilter = 'Worksheet'; // 'Worksheet' | 'Classroom'
  let preTestSelectedActivityIdx = 0;

  // Kept per CLASS (storage key includes the class id), so two class
  // logins used on the same browser never see each other's counts.
  const preTestTallyEntries = {}; // activityIdx (string) -> {count_e, count_p, count_a}
  var preTestTallyLoadedFor = null;
  function ensurePreTestTallyForClass(){
    const cid = myClassInfo && myClassInfo.class_id;
    const term = typeof currentAssessTerm === 'function' ? currentAssessTerm() : 1;
    const loadKey = cid + '|' + term;
    if(!cid || preTestTallyLoadedFor === loadKey) return;
    Object.keys(preTestTallyEntries).forEach(k => delete preTestTallyEntries[k]);
    try {
      const raw = localStorage.getItem(preTestStorageKey(cid, term));
      if(raw) Object.assign(preTestTallyEntries, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
    // Child-wise Pre-Test records are the source of truth. Rebuild the
    // activity tallies from them whenever they exist, so class counts can
    // never drift away from individual child records.
    if(typeof preTestAssessmentEntries !== 'undefined' && typeof assessmentPupilNames === 'function'){
      Object.keys(preTestTallyEntries).forEach(k => delete preTestTallyEntries[k]);
      assessmentPupilNames().forEach(name => {
        const rec = preTestAssessmentEntries[name] || {};
        Object.keys(rec).forEach(k => {
          const v = rec[k] === 'E' ? 'B' : rec[k]; // migrate the old internal Beginner code once
          if(!preTestTallyEntries[k]) preTestTallyEntries[k] = {count_e:0,count_p:0,count_a:0};
          if(v === 'B') preTestTallyEntries[k].count_e++;
          else if(v === 'P') preTestTallyEntries[k].count_p++;
          else if(v === 'A') preTestTallyEntries[k].count_a++;
        });
      });
    }
    preTestTallyLoadedFor = loadKey;
  }
  // Term 1 keeps the original key (so tallies already entered stay where
  // they are); Term 2 has its own, so the two terms never overwrite each other.
  function preTestStorageKey(cid, term){ return 'preTestTallyEntries:' + cid + (term === 2 ? ':term2' : ''); }
  function savePreTestTallyEntries(){
    ensurePreTestTallyForClass();
    if(!myClassInfo || !myClassInfo.class_id) return;
    try { localStorage.setItem(preTestStorageKey(myClassInfo.class_id, typeof currentAssessTerm === 'function' ? currentAssessTerm() : 1), JSON.stringify(preTestTallyEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory only */ }
  }
  function setPreTestTallyCount(activityIdx, field, value){
    ensurePreTestTallyForClass();
    const key = String(activityIdx);
    if(!preTestTallyEntries[key]) preTestTallyEntries[key] = { count_e: 0, count_p: 0, count_a: 0 };
    preTestTallyEntries[key][field] = Math.max(0, parseInt(value, 10) || 0);
    savePreTestTallyEntries();
  }

/* ===== teacher-part-10.js ===== */
/* =========================================================================
   teacher-part-10.js — part 10 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  function renderPreTestClassSection(container){
    // Pre-Test keeps the existing activity/CG layout, but the source of truth
    // is child-wise: one BPA value per child per activity. The B/P/A numbers
    // shown in the activity table are calculated from those child records.
    ensurePreTestTallyForClass();
    if(typeof preTestAssessmentEntries !== 'undefined') syncPreTestTallyFromChildEntries();

    const pupils = assessmentPupilNames();
    const childStore = (typeof preTestAssessmentEntries !== 'undefined') ? preTestAssessmentEntries : {};
    let totalMarked = 0;
    const tot = { B: 0, P: 0, A: 0 };
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      pupils.forEach(name => {
        const v = childStore[name] && childStore[name][String(idx)];
        if(v === 'B'){ tot.B++; totalMarked++; }
        else if(v === 'P'){ tot.P++; totalMarked++; }
        else if(v === 'A'){ tot.A++; totalMarked++; }
      });
    });
    const totalCells = WEEKLY_ASSESSMENT_ACTIVITIES.length * pupils.length;
    const completeness = totalCells ? Math.round(totalMarked / totalCells * 100) : 0;
    const avgScore = totalMarked ? Math.round((tot.A*3 + tot.P*2 + tot.B*1) / totalMarked * 100) / 100 : 0;
    const pctAdvanced = totalMarked ? Math.round(tot.A / totalMarked * 100) : 0;

    container.appendChild(mdSec('Pre-Test', '<span class="reqs">ASM-PT1…3</span>'));
    const ptNote = document.createElement('p');
    ptNote.className = 'cap'; ptNote.style.margin = '4px 0 14px';
    container.appendChild(ptNote);

    const dsi = totalMarked ? Math.round(((tot.A*3 + tot.P*2 + tot.B) / (3 * totalMarked) * 200) * 10) / 10 : 0;
    const sriPct = totalMarked ? Math.round((tot.P + tot.A) / totalMarked * 100) : 0;
    const noMarks = pupils.filter(name => !childStore[name] || WEEKLY_ASSESSMENT_ACTIVITIES.every((a, idx) => !childStore[name][String(idx)])).length;

    const summaryGrid = mdGrid('g5', [
      mdTile('Scope', WEEKLY_ASSESSMENT_ACTIVITIES.length + ' activities', '20 worksheet + 6 classroom', mdPill('Baseline', 'info'), 'ASM-PT1'),
      mdTile('Recording complete', completeness, '% of child/activity cells', mdPill(mdStatusBand(completeness, 90, 70).l, mdStatusBand(completeness, 90, 70).c), 'ASM-PT2', mdMeter(completeness)),
      mdTile('Class DSI', dsi, 'of 200', mdPill(mdStatusBand(dsi/2).l, mdStatusBand(dsi/2).c), 'DSI', mdMeter(dsi/2)),
      mdTile('At Proficient or above', sriPct, '% SRI', mdPill(mdStatusBand(sriPct).l, mdStatusBand(sriPct).c), 'SRI', mdMeter(sriPct)),
      mdTile('Children with no marks', noMarks, 'of ' + pupils.length, noMarks > pupils.length/3 ? mdPill('Needs follow-up', 'crit') : noMarks ? mdPill('Some still open', 'warn') : mdPill('All assessed', 'good'), 'ASM-PT4')
    ]);
    summaryGrid.style.marginBottom = '24px';
    container.appendChild(summaryGrid);

    container.appendChild(mdSec('Add data — Pre-Test', '<span class="reqs">ASM-PT1…3</span>'));

    const typeBar = document.createElement('div'); typeBar.className = 'fbar card'; typeBar.style.cssText = 'margin-bottom:16px; padding:16px 18px; display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end;'; // one selector row: type + activity
    typeBar.innerHTML = '<div class="ctl"><label>Activity type</label><select id="preTestTypeSelect" style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    container.appendChild(typeBar);
    const typeSel = typeBar.querySelector('#preTestTypeSelect');
    ['Worksheet', 'Classroom'].forEach(t => {
      const opt = document.createElement('option'); opt.value = t; opt.textContent = t;
      if(t === preTestTypeFilter) opt.selected = true;
      typeSel.appendChild(opt);
    });
    typeSel.onchange = () => { preTestTypeFilter = typeSel.value; renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    const activeActivities = WEEKLY_ASSESSMENT_ACTIVITIES.map((a, idx) => Object.assign({}, a, {idx})).filter(a => a.type === preTestTypeFilter);
    const pickerBar = typeBar; // same row as Activity type
    pickerBar.insertAdjacentHTML('beforeend', '<div class="ctl" style="flex:1; min-width:280px;"><label>Activity</label><select id="preTestActivitySelect" style="width:100%; padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>');
    const actSel = pickerBar.querySelector('#preTestActivitySelect');
    activeActivities.forEach(a => {
      const opt = document.createElement('option'); opt.value = String(a.idx); opt.textContent = (a.idx + 1) + '. ' + a.activity + ' — ' + a.cg;
      if(a.idx === (typeof preTestSelectedActivityIdx === 'number' ? preTestSelectedActivityIdx : 0)) opt.selected = true;
      actSel.appendChild(opt);
    });
    if(activeActivities.length && !activeActivities.some(a => a.idx === preTestSelectedActivityIdx)) preTestSelectedActivityIdx = activeActivities[0].idx;
    actSel.value = String(preTestSelectedActivityIdx);
    actSel.onchange = () => { preTestSelectedActivityIdx = parseInt(actSel.value, 10); renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    const active = WEEKLY_ASSESSMENT_ACTIVITIES[preTestSelectedActivityIdx];
    if(active){
      const meta = document.createElement('p');
      meta.className = 'cap'; meta.style.margin = '0 0 12px';
      meta.textContent = active.type + ' · ' + active.cg + (active.page && active.page !== '—' ? ' · Page ' + active.page : '');
      container.appendChild(meta);

      const childGrid = document.createElement('div');
      childGrid.className = 'report-table-wrap';
      let html = '<table class="report-table" style="min-width:560px;"><thead><tr><th style="text-align:left;">Child</th><th>Register No.</th><th style="text-align:center;">B · P · A</th></tr></thead><tbody>';
      pupils.forEach(name => {
        const pupil = Array.isArray(realPupilsCache) ? realPupilsCache.find(p => p.name === name) : null;
        const reg = pupil && (pupil.register_no || pupil.register_number || pupil.roll_no || pupil.admission_no) ? (pupil.register_no || pupil.register_number || pupil.roll_no || pupil.admission_no) : '';
        const tier = childStore[name] && childStore[name][String(preTestSelectedActivityIdx)];
        // Tap B, P or A (saved as 1 under that grade, 0 under the others); tap the chosen one again = not assessed.
        const circles = ['B', 'P', 'A'].map(g => `<button type="button" title="${esc(gradeLabel(g))}" onclick="setPreTestChildCount('${esc(name).replace(/'/g, "\\'")}', ${preTestSelectedActivityIdx}, '${g}', ${tier === g ? 0 : 1})" style="${gradeBtnStyle(g, tier === g, 28)} margin:0 3px;">${gradeBtnLabel(tier === g, g)}</button>`).join('');
        html += `<tr><td style="text-align:left;"><b>${esc(name)}</b></td><td class="dim">${esc(String(reg))}</td><td style="text-align:center; white-space:nowrap;">${circles}</td></tr>`;
      });
      html += '</tbody></table>';
      childGrid.innerHTML = html;
      container.appendChild(childGrid);

      const t = (preTestTallyEntries[String(preTestSelectedActivityIdx)] || {count_e:0,count_p:0,count_a:0});
      const summary = document.createElement('div');
      summary.style.cssText = 'display:flex; gap:10px; flex-wrap:wrap; margin:12px 0 20px;';
      summary.innerHTML = `<span class="cap" style="align-self:center;">This activity:</span>${['B', 'P', 'A'].map(g => `<span class="gd-pill">${gradeDot(g, 18)}<span>${t[{ B: 'count_e', P: 'count_p', A: 'count_a' }[g]] || 0}</span></span>`).join('')}<span class="cap" style="align-self:center;">Not assessed ${Math.max(0, pupils.length - (t.count_e || 0) - (t.count_p || 0) - (t.count_a || 0))}</span>`;
      container.appendChild(summary);
    }

    const cgRows = {}; // CG summary, worked out from the child marks: activities on the same CG add up
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => { const t = preTestTallyEntries[String(idx)] || {}; const r = cgRows[cgCode(a.cg)] = cgRows[cgCode(a.cg)] || { code: cgCode(a.cg), tot: { b: 0, p: 0, a: 0 }, items: [] };
      r.tot.b += t.count_e || 0; r.tot.p += t.count_p || 0; r.tot.a += t.count_a || 0; r.items.push('Activity ' + (idx + 1)); });
    const cgList = Object.values(cgRows).sort((x, y) => cgMajor(x.code) - cgMajor(y.code) || parseFloat(x.code.slice(3)) - parseFloat(y.code.slice(3)));
    const cgWrap = document.createElement('div'); cgWrap.innerHTML = gradeTotalsTable(cgList, cgList.reduce((g, r) => ({ b: g.b + r.tot.b, p: g.p + r.tot.p, a: g.a + r.tot.a }), { b: 0, p: 0, a: 0 }), cgLevel);
    container.appendChild(mdCard('CG summary — Pre-Test', 'Worked out from the child marks above — nothing to enter here. Activities on the same CG all add up.', cgWrap));
    container.appendChild(mdSec(preTestTypeFilter + ' activities', '<span class="reqs">ASM-PT1…3</span>'));
    const cgGroups = [];
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      if(a.type !== preTestTypeFilter) return;
      const cgMajor = (a.cg.match(/CG\s*(\d+)/) || [])[1] || '0';
      let group = cgGroups.find(g => g.cgMajor === cgMajor);
      if(!group){ group = {cgMajor, items:[]}; cgGroups.push(group); }
      group.items.push(Object.assign({}, a, {idx}));
    });
    cgGroups.sort((x,y)=>parseInt(x.cgMajor,10)-parseInt(y.cgMajor,10));
    let pickerTable = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="table-layout:fixed;width:100%;min-width:760px;border-collapse:separate;border-spacing:0;"><colgroup><col style="width:12%;"><col style="width:42%;"><col style="width:14%;"><col style="width:10%;"><col style="width:11%;"><col style="width:11%;"></colgroup><thead><tr><th>Curricular Goal</th><th>Activity</th><th>Specification</th><th style="text-align:center;"><span class="gd gd-B" style="width:20px; height:20px; font-size:10px;">B</span></th><th style="text-align:center;"><span class="gd gd-P" style="width:20px; height:20px; font-size:10px;">P</span></th><th style="text-align:center;"><span class="gd gd-A" style="width:20px; height:20px; font-size:10px;">A</span></th></tr></thead><tbody>';
    cgGroups.forEach(g => g.items.forEach((a,i) => {
      const t = preTestTallyEntries[String(a.idx)] || {count_e:0,count_p:0,count_a:0};
      pickerTable += `<tr style="border-bottom:1px solid var(--border);cursor:pointer;" onclick="preTestSelectedActivityIdx=${a.idx};renderMonthlyAssessment(monthlyAssessmentTargetEl);">${i===0 ? `<td rowspan="${g.items.length}" style="vertical-align:top;font-weight:600;padding:14px 12px;">CG-${esc(g.cgMajor)}</td>` : ''}<td style="word-wrap:break-word;text-align:left;padding:14px 12px;">${esc(a.activity)}</td><td class="dim" style="padding:14px 12px;">${esc(a.cg)}</td><td style="text-align:center;padding:14px 12px;">${t.count_e||0}</td><td style="text-align:center;padding:14px 12px;">${t.count_p||0}</td><td style="text-align:center;padding:14px 12px;">${t.count_a||0}</td></tr>`;
    }));
    pickerTable += '</tbody></table></div>';
    const pickerWrap = document.createElement('div'); pickerWrap.innerHTML = pickerTable;
    const tableCard = document.createElement('div');
    tableCard.className = 'card';
    const tableNote = document.createElement('p'); tableNote.className = 'cap'; tableNote.textContent = 'The Beginner · Proficient · Advanced counts are worked out automatically from the child-wise records above. Click an activity row to enter that activity.';
    tableCard.appendChild(tableNote); tableCard.appendChild(pickerWrap);
    container.appendChild(tableCard);
    const saveBar = document.createElement('div'); saveBar.className = 'card'; // same save bar as the other tabs
    saveBar.style.cssText = 'padding:16px 18px; margin:16px 0 24px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';
    saveBar.innerHTML = `<div style="flex:1; min-width:240px;"><b>Pre-Test is saved as you tap</b><p class="cap" style="margin:4px 0 0;">${totalMarked} of ${totalCells} marks entered. Each tap saves straight away on this device.</p></div><span class="gd-pill" style="font-weight:700; color:var(--success,#1e7a45);">✓ Saved</span>`;
    container.appendChild(saveBar);
  }

function renderPreTestImportCard(){
  const wrap = document.createElement('div');

  wrap.innerHTML = `
    <div class="card" style="
      margin-top:4px;
      margin-bottom:20px;
      padding:16px 18px;
      overflow:hidden;
    ">

      <div style="
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:20px;
        align-items:center;
      ">

        <!-- LEFT: heading + description -->
        <div style="min-width:0;">
          <h3 style="
            margin:0 0 4px;
            font-family:var(--disp);
            font-size:14px;
            font-weight:700;
          ">
            📥 Import a file or photo — Pre-Test (BPA)
          </h3>
        </div>

        <!-- RIGHT: actions -->
        <div style="
          display:flex;
          align-items:center;
          justify-content:flex-end;
          gap:8px;
          flex-wrap:wrap;
        ">

          <button
            type="button"
            class="btn"
            style="
              width:auto;
              min-width:150px;
              padding:9px 16px;
              white-space:nowrap;
            "
            onclick="scanPreTestBpaPhoto()">
            📷 Scan a photo
          </button>

          <button
            type="button"
            class="btn-primary"
            style="
              width:auto;
              min-width:150px;
              padding:9px 16px;
              white-space:nowrap;
            "
            onclick="document.getElementById('preTestImportInput').click()">
            📥 Import a file
          </button>

          <button
            type="button"
            class="btn"
            style="
              width:auto;
              min-width:150px;
              padding:9px 16px;
              white-space:nowrap;
            "
            onclick="preTestGoToEntry()">
            ✍ Enter manually
          </button>

          <button
            type="button"
            class="btn"
            style="
              width:auto;
              min-width:165px;
              padding:9px 16px;
              white-space:nowrap;
            "
            onclick="downloadPreTestBpaTemplate()">
            ↓ Download BPA template
          </button>

        </div>
      </div>

      <input
        type="file"
        id="preTestImportInput"
        accept=".xlsx,.xls,.csv"
        style="display:none;"
        onchange="importPreTestFile()"
      />

      <div
        id="preTestImportResult"
        style="
          margin-top:12px;
          word-break:break-word;
          overflow-wrap:anywhere;
        ">
      </div>

    </div>
  `;

  /*
   * Mobile:
   * stack description above buttons instead of squeezing the buttons.
   */
  const card = wrap.firstElementChild;
  const grid = card.firstElementChild;

  function adjustPreTestImportLayout(){
    if(window.innerWidth <= 900){
      grid.style.gridTemplateColumns = '1fr';

      const actions = grid.children[1];
      actions.style.justifyContent = 'flex-start';
    } else {
      grid.style.gridTemplateColumns = 'minmax(0,1fr) auto';

      const actions = grid.children[1];
      actions.style.justifyContent = 'flex-end';
    }
  }

  adjustPreTestImportLayout();

  /*
   * Avoid registering the same resize listener repeatedly.
   */
  if(!window.__preTestImportResizeBound){
    window.__preTestImportResizeBound = true;

    window.addEventListener('resize', () => {
      const card = document.querySelector('.card[data-pretest-import-card]');
      if(!card) return;

      const grid = card.firstElementChild;
      if(!grid) return;

      if(window.innerWidth <= 900){
        grid.style.gridTemplateColumns = '1fr';

        const actions = grid.children[1];
        if(actions) actions.style.justifyContent = 'flex-start';
      } else {
        grid.style.gridTemplateColumns = 'minmax(0,1fr) auto';

        const actions = grid.children[1];
        if(actions) actions.style.justifyContent = 'flex-end';
      }
    });
  }

  card.setAttribute('data-pretest-import-card','1');

  return wrap;
}


/*
 * Download the BPA template.
 *
 * The template contains:
 *   - school heading
 *   - class heading
 *   - academic year
 *   - Pre-Test BPA heading
 *   - register number
 *   - child name
 *   - activity number
 *   - B / P / A columns
 *
 * One row = one child × one activity.
 */
function downloadPreTestBpaTemplate(){

  const pupils = assessmentPupilNames();

  const schoolName =
    (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.school_name)
      ? myClassInfo.school_name
      : '';

  const className =
    (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_name)
      ? myClassInfo.class_name
      : '';

  const academicYear =
    (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.academic_year)
      ? myClassInfo.academic_year
      : new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);


  /*
   * Header information — similar to the attendance sheets.
   */
  const rows = [
    [schoolName],
    [className],
    ['PRE-TEST ASSESSMENT — BPA'],
    ['Academic Year: ' + academicYear],
    [''],
    ['B = Beginner', 'P = Proficient', 'A = Advanced'],
    [''],
    ['child_name', 'register_no', 'activity_no', 'B', 'P', 'A']
  ];


  /*
   * One row for every child × activity.
   */
  pupils.forEach(name => {

    const pupil =
      Array.isArray(realPupilsCache)
        ? realPupilsCache.find(p => p.name === name)
        : null;

    const reg =
      pupil &&
      (
        pupil.register_no ||
        pupil.register_number ||
        pupil.roll_no ||
        pupil.admission_no
      )
        ? (
            pupil.register_no ||
            pupil.register_number ||
            pupil.roll_no ||
            pupil.admission_no
          )
        : '';

    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((activity, idx) => {

      rows.push([
        name,
        reg,
        idx + 1,
        0,
        0,
        0
      ]);

    });
  });


  /*
   * Prefer XLSX because the template is meant to look like
   * the school's assessment/attendance sheets.
   */
  if(typeof XLSX !== 'undefined'){

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    /*
     * Merge the heading rows.
     */
    ws['!merges'] = [
      { s:{r:0,c:0}, e:{r:0,c:5} },
      { s:{r:1,c:0}, e:{r:1,c:5} },
      { s:{r:2,c:0}, e:{r:2,c:5} },
      { s:{r:3,c:0}, e:{r:3,c:5} }
    ];

    /*
     * Column widths.
     */
    ws['!cols'] = [
      { wch:28 },  // child name
      { wch:15 },  // register no.
      { wch:14 },  // activity no.
      { wch:8 },   // B
      { wch:8 },   // P
      { wch:8 }    // A
    ];

    /*
     * Basic heading styling.
     */
    const headingRows = [0,1,2,3];

    headingRows.forEach(r => {

      const cell = ws[XLSX.utils.encode_cell({r:r,c:0})];

      if(cell){
        cell.s = {
          font:{
            bold:true,
            sz:r === 2 ? 14 : 11
          },
          alignment:{
            horizontal:'center',
            vertical:'center'
          }
        };
      }

    });

    /*
     * Style the actual import header.
     */
    ['A8','B8','C8','D8','E8','F8'].forEach(ref => {

      if(ws[ref]){
        ws[ref].s = {
          font:{bold:true},
          alignment:{
            horizontal:'center',
            vertical:'center'
          }
        };
      }

    });

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'BPA PRE-TEST'
    );

    XLSX.writeFile(
      wb,
      'Pre-Test-BPA-Template.xlsx'
    );

    return;
  }


  /*
   * CSV fallback if XLSX is not loaded.
   */
  const csv = rows
    .map(row =>
      row
        .map(cell =>
          `"${String(cell).replace(/"/g,'""')}"`
        )
        .join(',')
    )
    .join('\n');

  const blob = new Blob(
    [csv],
    {type:'text/csv;charset=utf-8;'}
  );

  const a = document.createElement('a');

  a.href = URL.createObjectURL(blob);
  a.download = 'Pre-Test-BPA-Template.csv';

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(a.href);
}
  // "✍ Enter manually": go to the activity choice and the child table below.
  function preTestGoToEntry(){
    const el = document.getElementById('preTestTypeSelect'); if(!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
    el.focus();
  }
  function setPreTestChildCount(name, activityIdx, field, value){
    if(typeof preTestAssessmentEntries === 'undefined') return;
    const v = Math.max(0, Math.min(1, parseInt(value,10) || 0));
    if(!preTestAssessmentEntries[name]) preTestAssessmentEntries[name] = {};
    const key = String(activityIdx);
    const current = preTestAssessmentEntries[name][key] || '';
    if(v === 1) preTestAssessmentEntries[name][key] = field;
    else if(current === field) delete preTestAssessmentEntries[name][key];
    savePreTestAssessmentEntries();
    syncPreTestTallyFromChildEntries();
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  function syncPreTestTallyFromChildEntries(){
    if(typeof preTestAssessmentEntries === 'undefined') return;
    Object.keys(preTestTallyEntries).forEach(k => delete preTestTallyEntries[k]);
    assessmentPupilNames().forEach(name => {
      const rec = preTestAssessmentEntries[name] || {};
      Object.keys(rec).forEach(k => {
        const v = rec[k];
        if(!preTestTallyEntries[k]) preTestTallyEntries[k] = {count_e:0,count_p:0,count_a:0};
        if(v === 'B') preTestTallyEntries[k].count_e++;
        else if(v === 'P') preTestTallyEntries[k].count_p++;
        else if(v === 'A') preTestTallyEntries[k].count_a++;
      });
    });
    savePreTestTallyEntries();
  }

  async function importPreTestFile(){
    const input = document.getElementById('preTestImportInput');
    const resultEl = document.getElementById('preTestImportResult');
    if(!input || !input.files.length){ resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>'; return; }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';
    let rows;
    try { rows = await readAssessmentFileRows(input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }
    const header = rows[0].map(h => String(h).trim().toLowerCase());
    if(header.join(',') !== 'child_name,register_no,activity_no,b,p,a'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: child_name,register_no,activity_no,B,P,A — got: ${esc(rows[0].join(','))}</div>`; return;
    }
    if(typeof preTestAssessmentEntries === 'undefined'){
      resultEl.innerHTML = '<div class="au-error">Pre-Test child records are not loaded. Refresh the page and try again.</div>'; return;
    }
    const pupils = assessmentPupilNames();
    let imported=0; const skipped=[];
    for(let i=1;i<rows.length;i++){
      const parts = rows[i]; const rowNum=i+1;
      if(parts.length !== 6){ skipped.push(`Row ${rowNum}: expected 6 columns, got ${parts.length}`); continue; }
      const childName=String(parts[0]).trim(), activityNo=parseInt(parts[2],10);
      const b=parseInt(parts[3],10), p=parseInt(parts[4],10), a=parseInt(parts[5],10);
      if(!pupils.includes(childName)){ skipped.push(`Row ${rowNum}: "${childName}" is not a child in this class`); continue; }
      if(!Number.isInteger(activityNo) || activityNo<1 || activityNo>WEEKLY_ASSESSMENT_ACTIVITIES.length){ skipped.push(`Row ${rowNum}: activity_no must be 1-${WEEKLY_ASSESSMENT_ACTIVITIES.length}`); continue; }
      if(![b,p,a].every(x=>x===0||x===1)){ skipped.push(`Row ${rowNum}: B, P and A must each be 0 or 1`); continue; }
      const sum=b+p+a;
      if(sum!==0 && sum!==1){ skipped.push(`Row ${rowNum}: exactly one of B/P/A must be 1, or all three must be 0`); continue; }
      if(!preTestAssessmentEntries[childName]) preTestAssessmentEntries[childName]={};
      const key=String(activityNo-1);
      if(sum===0) delete preTestAssessmentEntries[childName][key];
      else preTestAssessmentEntries[childName][key] = b===1 ? 'B' : p===1 ? 'P' : 'A';
      imported++;
    }
    if(imported){ savePreTestAssessmentEntries(); syncPreTestTallyFromChildEntries(); }
    let html=`<div class="au-success">✓ Imported ${imported} child/activity record${imported===1?'':'s'} — saved.</div>`;
    if(skipped.length) html += `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<ul style="margin:4px 0 0 18px;">${skipped.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>`;
    resultEl.innerHTML=html;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  // (downloadPreTestClassPdf moved to part 14 to keep this file under 1000 lines.)
  // Serves both Monthly Assessment and Classroom Observation — same
  // domain-tier grid shape, only the store and scope label differ,
  // matching how renderMonthlyAssessment already shares one renderer
  // between the two via assessmentEntryType.
  function downloadAssessmentGridPdf(){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const store = getAssessmentStore();
    const typeInfo = ASSESSMENT_TYPE_INFO[assessmentEntryType];
    const scopeLabel = assessmentEntryType === 'monthly' ? new Date().toLocaleDateString([], {month:'long', year:'numeric'}) : 'Ongoing log';

    const totalCells = assessmentPupilNames().length * ASSESSMENT_DOMAINS.length;
    let recordedCells = 0;
    const tot = {E:0,P:0,A:0};
    assessmentPupilNames().forEach(name => ASSESSMENT_DOMAINS.forEach(d => {
      const v = store[name] && store[name][d.key];
      if(v){ recordedCells++; tot[v]++; }
    }));
    const completeness = totalCells ? Math.round(recordedCells / totalCells * 100) : 0;
    const dsi = recordedCells ? Math.round(((tot.A*3 + tot.P*2 + tot.E*1) / (3 * recordedCells) * 200) * 10) / 10 : 0;
    const sriPct = recordedCells ? Math.round((tot.P + tot.A) / recordedCells * 100) : 0;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(typeInfo.label + ' — ' + scopeLabel, 14, 15);
    doc.setFontSize(9);
    doc.text(assessmentPdfHeaderLine() + ' · generated ' + new Date().toLocaleDateString(), 14, 21);
    doc.text('Recording complete: ' + completeness + '%   ·   Class DSI: ' + dsi + ' of 200   ·   At Proficient or above: ' + sriPct + '%', 14, 27);

    doc.autoTable({
      startY: 32,
      head: [['Child', ...ASSESSMENT_DOMAINS.map(d => d.label), 'Recorded']],
      body: assessmentPupilNames().map(name => {
        const cells = ASSESSMENT_DOMAINS.map(d => TIER_INFO[(store[name] && store[name][d.key]) || '']?.letter || '·');
        const recCount = ASSESSMENT_DOMAINS.filter(d => store[name] && store[name][d.key]).length;
        return [name, ...cells, recCount + '/' + ASSESSMENT_DOMAINS.length];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });

    doc.save((assessmentEntryType === 'monthly' ? 'monthly-assessment-' : 'classroom-observation-') + todayKey() + '.pdf');
  }

  // ---------------------------------------------------------------
  // CLASSROOM OBSERVATION — rebuilt from the flat, untimed, 10-domain
  // localStorage log (classroomObservationEntries, above) into the real
  // structure confirmed from the BALVATIKA_2 sheet: 2-4 named Themes per
  // month (e.g. "My Classroom," "Emotions and Feelings"), each with
  // 2-4 Curricular-Goal-tagged items. Same server-backed, month-scoped
  // shape as Workbook Assessment — a theme picker stands in for the
  // workbook picker there. classroomObservationEntries above is now
  // dead (kept only so nothing throws if referenced elsewhere); this is
  // the real data path going forward.
  // ---------------------------------------------------------------
  let currentObservationThemeId = null;
  var obsRangeFrom = null, obsRangeTo = null; // Classroom Observation: From / To months

  const observationThemesCache = {}; // level+'|'+month -> null|'loading'|'error:...'|[{id,name,items:[{id,cg_code}]}]
  function ensureObservationThemesLoaded(level, month, reRenderFn){
    const key = level + '|' + month;
    if(Array.isArray(observationThemesCache[key])) return true;
    if(observationThemesCache[key] === 'loading') return false;
    if(typeof observationThemesCache[key] === 'string' && observationThemesCache[key].startsWith('error:')) return true;
    observationThemesCache[key] = 'loading';
    fetch('backend/assessment/observation/get_observation_themes.php?' + new URLSearchParams({ level, month }) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(res => res.json())
      .then(data => {
        observationThemesCache[key] = data.status === 'success' ? data.themes : 'error:' + (data.message || 'Could not load observation themes.');
        reRenderFn();
      })
      .catch(() => { observationThemesCache[key] = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }

  const observationAssessmentCache = {}; // month -> null|'loading'|'error:...'|{ [pupilId]: { [itemId]: 'E'|'P'|'A' } }
  const observationTeacherNotesCache = {}; // month|themeId -> notes by pupil
  const observationTeacherNotesInflight = {};
  function ensureObservationTeacherNotesLoaded(month, themeId, reRender){
    const key = month + '|' + themeId;
    if(observationTeacherNotesCache[key] && typeof observationTeacherNotesCache[key] === 'object') return true;
    if(observationTeacherNotesInflight[key]) return false;
    const url = 'backend/assessment/get_assessment_notes.php?' + new URLSearchParams({assessment_type:'observation',month,context_id:themeId}) + (window.location.search ? '&' + window.location.search.slice(1) : '');
    observationTeacherNotesInflight[key] = fetch(url)
      .then(r => r.json())
      .then(d => {
        observationTeacherNotesCache[key] = d.status === 'success' ? (d.notes || {}) : 'error:' + (d.message || 'Could not load teacher notes.');
      })
      .catch(() => { observationTeacherNotesCache[key] = 'error:Could not reach the server.'; })
      .finally(() => {
        delete observationTeacherNotesInflight[key];
        if (typeof reRender === 'function') reRender();
      });
    return false;
  }
  async function saveObservationTeacherNote(pupilId, month, themeId, note){
    const key = month + '|' + themeId, cache = observationTeacherNotesCache[key];
    if(cache && typeof cache === 'object') cache[pupilId] = note;
    try{
      const res = await fetch('backend/assessment/save_assessment_note.php' + window.location.search, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assessment_type:'observation',month,context_id:themeId,pupil_id:pupilId,note})});
      const d = await res.json(); if(d.status !== 'success') throw new Error(d.message || 'Not saved.');
    }catch(err){ alert('That note was not saved: ' + (err.message || err)); delete observationTeacherNotesCache[key]; renderMonthlyAssessment(monthlyAssessmentTargetEl); }
  }
  function ensureObservationAssessmentLoaded(month, reRenderFn){
    if(observationAssessmentCache[month] && typeof observationAssessmentCache[month] === 'object') return true;
    if(observationAssessmentCache[month] === 'loading') return false;
    if(typeof observationAssessmentCache[month] === 'string' && observationAssessmentCache[month].startsWith('error:')) return true;
    observationAssessmentCache[month] = 'loading';
    fetch('backend/assessment/observation/get_observation_assessment.php?' + new URLSearchParams({ month }) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(res => res.json())
      .then(data => {
        if(data.status !== 'success'){ observationAssessmentCache[month] = 'error:' + (data.message || 'Could not load observation marks.'); reRenderFn(); return; }
        const byPupil = {};
        data.marks.forEach(m => {
          if(!byPupil[m.pupil_id]) byPupil[m.pupil_id] = {};
          byPupil[m.pupil_id][m.observation_item_id] = m.level_mark;
        });
        observationAssessmentCache[month] = byPupil;
        reRenderFn();
      })
      .catch(() => { observationAssessmentCache[month] = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }

  // Grades still on their way to the server (each tap saves on its own).
  // The Save button below waits for these, then re-reads the month from
  // the database so the confirmation is what's actually stored.
  var observationPendingSaves = 0;
  var observationSaveMessage = ''; // shown under the Save button after a check

  async function confirmObservationSaved(){
    const btn = document.getElementById('observationSaveBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
    // Wait (up to ~10 s) for any taps still being sent.
    for(let i = 0; i < 50 && observationPendingSaves > 0; i++){
      await new Promise(r => setTimeout(r, 200));
    }
    const month = currentWorkbookMonth;
    try{
      const res = await fetch('backend/assessment/observation/get_observation_assessment.php?' + new URLSearchParams({ month }) + (window.location.search ? '&' + window.location.search.slice(1) : ''));
      const data = await res.json();
      if(data.status !== 'success') throw new Error(data.message || 'Could not check the saved grades.');
      const byPupil = {};
      data.marks.forEach(m => {
        if(!byPupil[m.pupil_id]) byPupil[m.pupil_id] = {};
        byPupil[m.pupil_id][m.observation_item_id] = m.level_mark;
      });
      observationAssessmentCache[month] = byPupil; // screen now shows exactly what the database holds
      const level = workbookLevelFromClassName();
      const themes = observationThemesCache[level + '|' + month] || [];
      const theme = themes.find(t => t.id === currentObservationThemeId);
      const itemIds = theme ? theme.items.map(it => it.id) : [];
      let themeCount = 0;
      Object.values(byPupil).forEach(marks => itemIds.forEach(id => { if(marks[id]) themeCount++; }));
      const totalCells = itemIds.length * assessmentPupilNames().length;
      const now = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      observationSaveMessage = '✓ Saved at ' + now + ' — ' + themeCount + ' of ' + totalCells + ' grades for ' + (theme ? theme.name : 'this theme') + ' are in the database (' + month + ').';
    } catch(err){
      observationSaveMessage = '⚠ ' + (err.message || 'Could not reach the server.') + ' Your taps may not all be saved — try again.';
    }
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  // Same content as the .xlsx export, as a printable PDF — one table
  // per theme scheduled this month, a row per child.
  function downloadObservationAssessmentPdf(){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const level = workbookLevelFromClassName();
    const themes = observationThemesCache[level + '|' + currentWorkbookMonth] || [];
    const marks = observationAssessmentCache[currentWorkbookMonth] || {};
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Classroom Observation — ' + currentWorkbookMonth, 14, 15);
    doc.setFontSize(9);
    doc.text(assessmentPdfHeaderLine() + ' · generated ' + new Date().toLocaleDateString(), 14, 21);
    let startY = 26;
    themes.forEach((t, ti) => {
      if(ti > 0) startY = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : startY) + 12;
      doc.setFontSize(12);
      doc.text(t.name, 14, startY);
      doc.autoTable({
        startY: startY + 4,
        head: [['Child', ...t.items.map(it => it.cg_code)]],
        body: assessmentPupilNames().map((name, idx) => {
          const pupil = realPupilsCache[idx];
          const pm = marks[pupil.id] || {};
          return [name, ...t.items.map(it => pm[it.id] ? TIER_INFO[pm[it.id]].letter : '·')];
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 60] }
      });
    });
    doc.save('classroom-observation-' + level.replace(/\s+/g,'') + '-' + currentWorkbookMonth + '-' + todayKey() + '.pdf');
  }

  // Direct 3-button set, same UI and "tap again to clear" pattern as
  // Workbook Assessment's saveWorkbookMark.
  function saveObservationMark(pupilId, itemId, currentMark, tier){
    const next = currentMark === tier ? null : tier;
    const month = currentWorkbookMonth; // Observation shares the same month picker state as Workbook — one "which month" concept across the Assessment section
    if(!observationAssessmentCache[month] || typeof observationAssessmentCache[month] !== 'object') return;
    if(!observationAssessmentCache[month][pupilId]) observationAssessmentCache[month][pupilId] = {};
    if(next === null) delete observationAssessmentCache[month][pupilId][itemId];
    else observationAssessmentCache[month][pupilId][itemId] = next;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);

    observationPendingSaves++;
    fetch('backend/assessment/observation/save_observation_assessment.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ pupil_id: pupilId, observation_item_id: itemId, level_mark: next })
    }).then(res => res.json()).then(data => {
      if(data.status !== 'success'){
        observationAssessmentCache[month] = observationAssessmentCache[month] || {};
        if(!observationAssessmentCache[month][pupilId]) observationAssessmentCache[month][pupilId] = {};
        if(currentMark === null) delete observationAssessmentCache[month][pupilId][itemId];
        else observationAssessmentCache[month][pupilId][itemId] = currentMark;
        renderMonthlyAssessment(monthlyAssessmentTargetEl);
        alert('Could not save that grade — check your connection and try again.');
      }
    }).catch(() => { alert('Could not save that grade — check your connection and try again.'); }).finally(() => { observationPendingSaves = Math.max(0, observationPendingSaves - 1); });
  }

  function renderObservationImportCard(){
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.marginTop = '4px';
    wrap.innerHTML = `
      <div class="hd"><div><h3>Import Classroom Observation from a file</h3><p class="cap">.csv or .xlsx — header row must be exactly: child_name,theme,cg_code,level_mark — theme must match a theme name scheduled this month, cg_code must match one of that theme's items, level_mark is B, P or A.</p></div></div>
      <input type="file" id="observationImportInput" accept=".csv,.xlsx" style="margin-top:8px;" />
      <div id="observationImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importObservationAssessmentFile()">Import</button>
    `;
    return wrap;
  }

  async function importObservationAssessmentFile(){
    const input = document.getElementById('observationImportInput');
    const resultEl = document.getElementById('observationImportResult');
    if(!smartAssessHandoffRows && (!input || !input.files.length)){ resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>'; return; }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';

    let rows;
    try { rows = await readAssessmentFileRows(input && input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }

    const header = rows[0].map(h => h.toLowerCase());
    if(header.join(',') !== 'child_name,theme,cg_code,level_mark'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: child_name,theme,cg_code,level_mark — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }

    const level = workbookLevelFromClassName();
    const themesKey = level + '|' + currentWorkbookMonth;
    const themes = observationThemesCache[themesKey];
    if(!Array.isArray(themes)){ resultEl.innerHTML = '<div class="au-error">Observation themes for this month have not finished loading — wait a moment and try again.</div>'; return; }
    const pupilByName = {};
    (realPupilsCache || []).forEach(p => { pupilByName[p.name.trim().toLowerCase()] = p; });

    let imported = 0;
    const skipped = [];
    for(let i = 1; i < rows.length; i++){
      const [childName, themeName, cgCode, levelMarkRaw] = rows[i];
      const rowNum = i + 1;
      const pupil = pupilByName[(childName || '').trim().toLowerCase()];
      if(!pupil){ skipped.push(`Row ${rowNum}: no child named "${childName}" in this class`); continue; }
      const theme = themes.find(t => t.name.toLowerCase() === (themeName || '').trim().toLowerCase());
      if(!theme){ skipped.push(`Row ${rowNum}: no theme named "${themeName}" scheduled for ${currentWorkbookMonth}`); continue; }
      const [cgBase, occRaw] = String(cgCode || '').trim().split('#'); // "C-4.2#2" = the theme's second C-4.2 item
      const item = theme.items.filter(it => it.cg_code.toLowerCase() === cgBase.toLowerCase())[(parseInt(occRaw, 10) || 1) - 1];
      if(!item){ skipped.push(`Row ${rowNum}: CG code "${cgCode}" isn't part of "${theme.name}"`); continue; }
      let mark = (levelMarkRaw || '').trim().toUpperCase();
      if(mark === 'B') mark = 'E'; // B (Beginner) is stored as E
      if(!['E','P','A'].includes(mark)){ skipped.push(`Row ${rowNum}: level_mark must be B, P, or A — got "${levelMarkRaw}"`); continue; }

      try {
        const res = await fetch('backend/assessment/observation/save_observation_assessment.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ pupil_id: pupil.id, observation_item_id: item.id, level_mark: mark })
        });
        const data = await res.json();
        if(data.status === 'success'){
          if(!observationAssessmentCache[currentWorkbookMonth] || typeof observationAssessmentCache[currentWorkbookMonth] !== 'object') observationAssessmentCache[currentWorkbookMonth] = {};
          if(!observationAssessmentCache[currentWorkbookMonth][pupil.id]) observationAssessmentCache[currentWorkbookMonth][pupil.id] = {};
          observationAssessmentCache[currentWorkbookMonth][pupil.id][item.id] = mark;
          imported++;
        } else {
          skipped.push(`Row ${rowNum}: server rejected it — ${data.message || 'unknown error'}`);
        }
      } catch(e){ skipped.push(`Row ${rowNum}: could not reach the server`); }
    }

    resultEl.innerHTML = `<div class="au-success">Imported ${imported} of ${rows.length - 1} rows.</div>` +
      (skipped.length ? `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<br>${skipped.map(esc).join('<br>')}</div>` : '');
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  function downloadObservationAssessmentXlsx(){
    if(typeof XLSX === 'undefined'){ alert('.xlsx export did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const level = workbookLevelFromClassName();
    const themesKey = level + '|' + currentWorkbookMonth;
    const themes = observationThemesCache[themesKey] || [];
    const marks = observationAssessmentCache[currentWorkbookMonth] || {};
    const allItems = themes.flatMap(t => t.items.map(it => ({...it, themeName: t.name})));

    const header = ['Child', ...allItems.map(it => it.themeName + ' (' + it.cg_code + ')')];
    const rows = [header];
    assessmentPupilNames().forEach((name, idx) => {
      const pupil = realPupilsCache[idx];
      const pupilMarks = marks[pupil.id] || {};
      rows.push([name, ...allItems.map(it => pupilMarks[it.id] || '')]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wbOut = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbOut, ws, currentWorkbookMonth.slice(0,31));
    XLSX.writeFile(wbOut, 'classroom-observation-' + level.replace(/\s+/g,'') + '-' + currentWorkbookMonth + '-' + todayKey() + '.xlsx');
  }

  function renderObservationAssessmentSection(container){
    const level = workbookLevelFromClassName();

    // Months as a range — From [month] To [month] — and one Theme list
    // with every theme in that range. Picking a theme opens its grid for
    // THAT theme's month (currentWorkbookMonth), so grades are saved
    // against the month they belong to, exactly as before.
    const rerender = () => renderMonthlyAssessment(monthlyAssessmentTargetEl);
    const TERM_MONTHS = assessTermMonths(); // Term 1 or Term 2 (part 14)
    if(!TERM_MONTHS.includes(obsRangeFrom)) obsRangeFrom = currentWorkbookMonth;
    if(!TERM_MONTHS.includes(obsRangeTo)) obsRangeTo = currentWorkbookMonth;
    const iFrom = TERM_MONTHS.indexOf(obsRangeFrom), iTo = TERM_MONTHS.indexOf(obsRangeTo);
    const rangeMonths = TERM_MONTHS.slice(Math.min(iFrom, iTo), Math.max(iFrom, iTo) + 1);
    const monthBar = document.createElement('div'); monthBar.className = 'fbar'; monthBar.style.cssText = 'margin-bottom:18px; display:flex; gap:16px; flex-wrap:wrap; align-items:flex-end;';
    const monthOpts = sel => TERM_MONTHS.map(m => `<option value="${esc(m)}" ${m === sel ? 'selected' : ''}>${esc(m)}</option>`).join('');
    monthBar.innerHTML = `<div class="ctl"><label>From</label><select id="observationFromSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${monthOpts(obsRangeFrom)}</select></div>
      <div class="ctl"><label>To</label><select id="observationToSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${monthOpts(obsRangeTo)}</select></div>`;
    container.appendChild(monthBar);
    const setRange = (from, to) => {
      if(TERM_MONTHS.indexOf(from) > TERM_MONTHS.indexOf(to)) [from, to] = [to, from]; // keep From before To
      obsRangeFrom = from; obsRangeTo = to;
      const months = TERM_MONTHS.slice(TERM_MONTHS.indexOf(from), TERM_MONTHS.indexOf(to) + 1);
      if(!months.includes(currentWorkbookMonth)){ currentWorkbookMonth = from; currentObservationThemeId = null; }
      rerender();
    };
    monthBar.querySelector('#observationFromSelect').onchange = e => setRange(e.target.value, obsRangeTo);
    monthBar.querySelector('#observationToSelect').onchange = e => setRange(obsRangeFrom, e.target.value);


    if(!ensurePupilsLoadedFor(container, rerender)) return;

    // themes of every month in the range; marks for the theme's month
    if(!rangeMonths.includes(currentWorkbookMonth)) currentWorkbookMonth = rangeMonths[0];
    const allThemesLoaded = rangeMonths.map(m => ensureObservationThemesLoaded(level, m, rerender)).every(Boolean);
    const marksLoaded = ensureObservationAssessmentLoaded(currentWorkbookMonth, rerender);
    const failedMonth = rangeMonths.find(m => typeof observationThemesCache[level + '|' + m] === 'string' && observationThemesCache[level + '|' + m].startsWith('error:'));
    if(failedMonth){
      const k = level + '|' + failedMonth;
      renderRetryCard(container, observationThemesCache[k].slice(6), () => delete observationThemesCache[k]); return;
    }
    if(typeof observationAssessmentCache[currentWorkbookMonth] === 'string' && observationAssessmentCache[currentWorkbookMonth].startsWith('error:')){
      renderRetryCard(container, observationAssessmentCache[currentWorkbookMonth].slice(6), () => delete observationAssessmentCache[currentWorkbookMonth]); return;
    }
    if(!allThemesLoaded || !marksLoaded){ container.appendChild(mdCard(null, 'Loading observation themes…', null)); return; }

    const rangeThemes = rangeMonths.flatMap(m => (observationThemesCache[level + '|' + m] || []).map(t => ({ month: m, t })));
    if(!rangeThemes.length){
      container.appendChild(mdCard(null, 'No themes are scheduled ' + (rangeMonths.length > 1 ? 'from ' + rangeMonths[0] + ' to ' + rangeMonths[rangeMonths.length - 1] : 'for ' + rangeMonths[0]) + ' yet.', null));
      return;
    }
    const picked = rangeThemes.find(x => x.month === currentWorkbookMonth && x.t.id === currentObservationThemeId);
    if(!picked){
      const first = rangeThemes.find(x => x.month === currentWorkbookMonth) || rangeThemes[0];
      currentObservationThemeId = first.t.id;
      if(first.month !== currentWorkbookMonth){ currentWorkbookMonth = first.month; rerender(); return; } // load that month's marks
    }

    const themesKey = level + '|' + currentWorkbookMonth;
    const themes = observationThemesCache[themesKey];
    const marks = observationAssessmentCache[currentWorkbookMonth];

    // --- Theme picker — every theme in the range, labelled with its month ---
    // Theme sits in the same bar as From / To, side by side.
    const themeCtl = document.createElement('div'); themeCtl.className = 'ctl'; themeCtl.style.cssText = 'flex:1; min-width:260px;';
    themeCtl.innerHTML = '<label>Theme</label><select id="observationThemeSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px; width:100%; max-width:520px;"></select>';
    monthBar.appendChild(themeCtl);
    const themeSel = themeCtl.querySelector('#observationThemeSelect');
    rangeMonths.forEach(m => {
      const list = rangeThemes.filter(x => x.month === m);
      if(!list.length) return;
      const group = document.createElement('optgroup'); group.label = m;
      list.forEach(({ t }) => {
        const opt = document.createElement('option'); opt.value = m + '|' + t.id; opt.textContent = m + ' — ' + t.name + ' (' + t.items.length + ' items)';
        if(m === currentWorkbookMonth && t.id === currentObservationThemeId) opt.selected = true;
        group.appendChild(opt);
      });
      themeSel.appendChild(group);
    });
    themeSel.onchange = () => {
      const [m, id] = themeSel.value.split('|');
      currentWorkbookMonth = m; currentObservationThemeId = parseInt(id, 10);
      rerender();
    };

    const selectedTheme = themes.find(t => t.id === currentObservationThemeId);
    const items = selectedTheme.items;
    ensureObservationTeacherNotesLoaded(currentWorkbookMonth, selectedTheme.id, rerender);

    if(!items.length){
      container.appendChild(mdCard(null, 'No items are set up for "' + esc(selectedTheme.name) + '" yet.', null));
      return;
    }

    // ---- Import previous data (collapsed by default) ----
    const obsImportToggle = document.createElement('div');
    obsImportToggle.className = 'card'; obsImportToggle.style.cssText = 'padding:0; margin-bottom:14px; overflow:hidden;';
    obsImportToggle.innerHTML = `
      <div onclick="observationImportOpen = !observationImportOpen; this.nextElementSibling.classList.toggle('hidden', !observationImportOpen); this.querySelector('.chevron').style.transform = observationImportOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import from a file</h3>
          <p class="cap" style="margin:0;">Grade manually by tapping E, P, or A on the table below, or import a file here — either way saves to the same real record.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${observationImportOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${observationImportOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    obsImportToggle.style.display = 'none'; // replaced by 📥 Import a file or photo (part 14)
    container.appendChild(obsImportToggle);
    obsImportToggle.querySelector('div:last-child').appendChild(renderObservationImportCard());

    const anyGraded = Object.keys(marks).some(pid => Object.keys(marks[pid] || {}).length);
    container.appendChild(mdSec(esc(selectedTheme.name) + ' — ' + currentWorkbookMonth, '<span class="reqs">ASM-O1…O3</span>'));

    let obsRecorded = 0;
    const obsTot = { B: 0, P: 0, A: 0 };
    assessmentPupilNames().forEach((name, idx) => {
      const pupil = realPupilsCache[idx];
      const pupilMarks = marks[pupil.id] || {};
      items.forEach(it => {
        const m = pupilMarks[it.id];
        if(m === 'E' || m === 'B'){ obsTot.B++; obsRecorded++; }
        else if(m === 'P'){ obsTot.P++; obsRecorded++; }
        else if(m === 'A'){ obsTot.A++; obsRecorded++; }
      });
    });
    const obsTotalCells = assessmentPupilNames().length * items.length;
    const obsCompleteness = obsTotalCells ? Math.round(obsRecorded / obsTotalCells * 100) : 0;
    const obsDsi = obsRecorded ? Math.round(((obsTot.A*3 + obsTot.P*2 + obsTot.B) / (3 * obsRecorded) * 200) * 10) / 10 : 0;
    const obsSri = obsRecorded ? Math.round((obsTot.P + obsTot.A) / obsRecorded * 100) : 0;
    const obsNoMarks = assessmentPupilNames().filter((name, idx) => {
      const pupil = realPupilsCache[idx];
      const pupilMarks = marks[pupil.id] || {};
      return items.every(it => !pupilMarks[it.id]);
    }).length;
    container.appendChild(mdGrid('g5', [
      mdTile('Scope', items.length, 'activities in this theme', mdPill(currentWorkbookMonth, 'info'), 'ASM-O1'),
      mdTile('Recording complete', obsCompleteness, '% of child/activity cells', mdPill(mdStatusBand(obsCompleteness, 90, 70).l, mdStatusBand(obsCompleteness, 90, 70).c), 'ASM-O2', mdMeter(obsCompleteness)),
      mdTile('Class DSI', obsDsi, 'of 200', mdPill(mdStatusBand(obsDsi/2).l, mdStatusBand(obsDsi/2).c), 'DSI', mdMeter(obsDsi/2)),
      mdTile('At Proficient or above', obsSri, '% SRI', mdPill(mdStatusBand(obsSri).l, mdStatusBand(obsSri).c), 'SRI', mdMeter(obsSri)),
      mdTile('Children with no marks', obsNoMarks, 'of ' + assessmentPupilNames().length, obsNoMarks > assessmentPupilNames().length/3 ? mdPill('Needs follow-up', 'crit') : obsNoMarks ? mdPill('Some still open', 'warn') : mdPill('All assessed', 'good'), 'ASM-O3')
    ]));

    // Group columns by their real Curricular Goal (derived server-side
    // from each item's cg_code, matched against the real 13-CG
    // taxonomy) — same grouped-header treatment Workbook Assessment
    // uses, adapted for a column-per-item grid instead of a row-per-item
    // form since Observation grades the whole class at once.
    const cgGroups = [];
    items.forEach(it => {
      const key = it.curricular_goal_id || 'ungrouped';
      let group = cgGroups.find(g => g.key === key);
      if(!group){ group = { key, goal_text: it.goal_text || 'Ungrouped', items: [] }; cgGroups.push(group); }
      group.items.push(it);
    });

    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th rowspan="2">Child</th>' +
      cgGroups.map(g => `<th colspan="${g.items.length}" style="text-align:center;">${esc(g.goal_text)}</th>`).join('') +
      '</tr><tr>' +
      cgGroups.flatMap(g => g.items.map((it, idx) => `<th>${idx + 1}. ${esc(it.cg_code)}</th>`)).join('') +
      '<th rowspan="2" style="min-width:220px; text-align:left;">Teacher notes</th>' +
      '</tr></thead><tbody>';

    const tierColors = { E: 'var(--danger,#c8433f)', P: '#EE8F35', A: 'var(--success)' };
    const orderedItems = cgGroups.flatMap(g => g.items); // must match the header's column order exactly
    assessmentPupilNames().forEach((name, idx) => {
      const pupil = realPupilsCache[idx];
      const pupilMarks = marks[pupil.id] || {};
      const cells = orderedItems.map(it => {
        const mark = pupilMarks[it.id] || null;
        const btns = ['E','P','A'].map(t => {
          const active = mark === t;
          return `<button onclick="saveObservationMark(${pupil.id},${it.id},${mark ? "'" + mark + "'" : 'null'},'${t}')" title="${TIER_INFO[t].n}" style="${gradeBtnStyle(t, active, 24)}">${gradeBtnLabel(active, t)}</button>`;
        }).join('');
        return `<td style="text-align:center;"><div style="display:flex; gap:3px; justify-content:center;">${btns}</div></td>`;
      }).join('');
      table += `<tr><td><b>${esc(name)}</b></td>${cells}<td style="min-width:220px;"><input type="text" class="assessment-note-input" data-pupil="${pupil.id}" value="${esc(observationNotes[pupil.id] || '')}" placeholder="Add a note" style="width:100%; min-width:200px; padding:8px 10px; border:1px solid var(--border,#d9dcd5); border-radius:6px; font-size:12.5px; font-family:inherit; box-sizing:border-box;"></td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    const observationTableCard = mdCard(null, 'Tap B, P or A to record an observation (B Beginner · P Proficient · A Advanced) — the chosen one is highlighted; tap it again to clear. Each tap saves immediately, no separate Save step.', wrap);
    observationTableCard.style.marginTop = '24px';
    container.appendChild(observationTableCard);
    observationTableCard.querySelectorAll('.assessment-note-input').forEach(inp => { inp.addEventListener('change', () => saveObservationTeacherNote(parseInt(inp.getAttribute('data-pupil'),10), currentWorkbookMonth, selectedTheme.id, inp.value.trim())); });

    // ---- Save & download — every tap above already saves on its own;
    // "Save" waits for any still in flight, then re-reads the month
    // from the database and reports what is actually stored. The
    // download buttons export every theme graded this month.
    const saveBar = document.createElement('div');
    saveBar.className = 'card';
    saveBar.style.cssText = 'padding:16px 18px; margin-top:16px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';
    saveBar.innerHTML = `
      <div style="flex:1; min-width:240px;">
        <b>Save this month's observation</b>
        <p class="cap" style="margin:4px 0 0;">${observationSaveMessage ? esc(observationSaveMessage) : 'Checks every grade above against the database and confirms how many are stored.'}</p>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="observationSaveBtn" class="btn-primary" style="width:auto; padding:9px 18px;">✓ Save</button>
      </div>`;
    container.appendChild(saveBar);
    saveBar.querySelector('#observationSaveBtn').onclick = confirmObservationSaved;
    container.appendChild(assessmentReportsLink('observation'));
  }


  // ---------------------------------------------------------------
  // FINE & GROSS MOTOR — same pattern as the Bhandup Tank Road
  // "Gross / Fine Motor Assessment" sheet: one activity per month
  // (June–October), every child rated G Achieved / Y Developing /
  // R Needs Support, plus a teacher note per child per sheet. The
  // children are THIS class's real roster (realPupilsCache), never the
  // names on that sheet. Saved to the real database
  // (backend/assessment/motor/).
  // ---------------------------------------------------------------
  const MOTOR_MONTHS = ['June', 'July', 'August', 'September', 'October'];
  const MOTOR_ACTIVITIES = {
    fine: {
      June:      { title: 'Pencil Cup Pegs', detail: 'Squeeze and attach 10 clothes pegs around the rim of a sturdy cup. Remove them one by one.' },
      July:      { title: 'Button Practice', detail: 'Fasten and unfasten the large buttons on a practice strip or doll shirt.' },
      August:    { title: 'Pattern Lacing', detail: 'Thread a lace through holes around a cardboard shape, alternating two bead colours.' },
      September: { title: 'Leaf Rubbing', detail: 'Hold a leaf under paper and rub with the side of a crayon to reveal its veins.' },
      October:   { title: 'Clay Numerals', detail: 'Roll thin clay ropes and shape numerals 1–5. Make matching clay balls beside each numeral.' }
    },
    gross: {
      June:      { title: 'Classroom Obstacle Path', detail: 'Walk around cones, step over a low foam block and balance along a taped line.' },
      July:      { title: 'Healthy Habits Action Trail', detail: 'Walk between picture stations. Mime brushing, bathing and exercise with whole-body actions.' },
      August:    { title: 'Hop Step Clap', detail: 'Copy and repeat a hop–step–clap movement pattern. Try leading the next round.' },
      September: { title: 'Grow Like a Plant', detail: 'Crouch like a seed, rise slowly, stretch like a tree and sway gently in the wind.' },
      October:   { title: 'Number Line Jumps', detail: 'Jump along the floor numbers 1–10. Stop on the number called by the teacher.' }
    }
  };
  // Motor ratings are SHOWN as B / P / A like every other assessment.
  // They are stored as before (R / Y / G), so nothing already saved
  // changes: R = B Beginner, Y = P Proficient, G = A Advanced.
  const MOTOR_RATINGS = {
    R: { letter: 'B', label: 'Beginner', color: 'var(--danger, #c8433f)' },
    Y: { letter: 'P', label: 'Proficient', color: '#EE8F35' },
    G: { letter: 'A', label: 'Advanced', color: 'var(--success, #0ca30c)' }
  };
  const MOTOR_ORDER = ['R', 'Y', 'G']; // shown left to right as B · P · A
  function motorLetter(r){ return r && MOTOR_RATINGS[r] ? MOTOR_RATINGS[r].letter : ''; }

  let motorSkillType = 'fine'; // 'fine' | 'gross'
  let motorAssessmentCache = null; // null | 'loading' | 'error:...' | { ratings: {pupilId:{fine:{June:'G'}, gross:{...}}}, notes: {pupilId:{fine:'..', gross:'..'}} }
  let motorPendingSaves = 0;
  let motorSaveMessage = '';

  // ---------------------------------------------------------------
  // FINE & GROSS MOTOR — IMPORT. Reads the same layout as the Fine /
  // Gross Motor Assessment sheets: a header row with ROLL NO. ·
  // STUDENT NAME · JUNE … OCTOBER · TEACHER NOTES, then one row per
  // child. An .xlsx can hold both sheets (tabs named FINE MOTOR /
  // GROSS MOTOR); a .csv is one sheet and goes to whichever sheet is
  // selected above. Children are matched by name against THIS class's
  // roll — any name not on the roll is listed and skipped, never
  // created. Nothing is saved until the preview is confirmed.
  // ---------------------------------------------------------------
  let motorImportOpen = false;
  let pendingMotorImport = null; // { ratings:[...], notes:[...], summary }

  // Small CSV reader that respects quoted cells, so a teacher note
  // containing a comma stays in one column.
  function parseCsvRows(text){
    const rows = []; let row = [], cell = '', inQuotes = false;
    for(let i = 0; i < text.length; i++){
      const ch = text[i];
      if(inQuotes){
        if(ch === '"' && text[i + 1] === '"'){ cell += '"'; i++; }
        else if(ch === '"') inQuotes = false;
        else cell += ch;
      } else if(ch === '"') inQuotes = true;
      else if(ch === ','){ row.push(cell.trim()); cell = ''; }
      else if(ch === '\n' || ch === '\r'){
        if(ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell.trim()); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if(cell !== '' || row.length){ row.push(cell.trim()); rows.push(row); }
    return rows.filter(r => r.some(c => c !== ''));
  }

  async function readMotorFileSheets(file){
    if(/\.xlsx$/i.test(file.name)){
      if(typeof XLSX === 'undefined') throw new Error('.xlsx support did not load (no internet reached the CDN) — try a .csv file instead.');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      return wb.SheetNames.map(n => ({
        name: n,
        rows: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' }).map(r => r.map(c => String(c).trim()))
      }));
    }
    return [{ name: file.name, rows: parseCsvRows(await file.text()) }];
  }

  function motorTypeForSheet(sheet, singleSheet){
    const hay = (sheet.name + ' ' + sheet.rows.slice(0, 4).map(r => r.join(' ')).join(' ')).toLowerCase();
    if(hay.includes('fine')) return 'fine';
    if(hay.includes('gross')) return 'gross';
    return singleSheet ? motorSkillType : null; // a lone unlabelled sheet goes to the sheet selected on screen
  }

  // Sheets may use B/P/A (as the portal shows) or the older G/Y/R.
  const MOTOR_WORD_TO_RATING = { B: 'R', P: 'Y', A: 'G', BEGINNER: 'R', PROFICIENT: 'Y', ADVANCED: 'G',
    G: 'G', Y: 'Y', R: 'R', ACHIEVED: 'G', DEVELOPING: 'Y', 'NEEDS SUPPORT': 'R' };

  // Returns { ratings, notes, problems, matched:Set, unmatched:[] } for one sheet.
  function parseMotorSheet(rows, type){
    const out = { ratings: [], notes: [], problems: [], matched: new Set(), unmatched: [] };
    const headerIdx = rows.findIndex(r => r.some(c => c.toLowerCase() === 'student name'));
    if(headerIdx < 0){ out.problems.push('No "STUDENT NAME" header row found.'); return out; }
    const header = rows[headerIdx].map(c => c.toLowerCase());
    const nameCol = header.indexOf('student name');
    const notesCol = header.findIndex(c => c.startsWith('teacher note') || c === 'notes');
    const monthCols = {};
    MOTOR_MONTHS.forEach(m => { const i = header.indexOf(m.toLowerCase()); if(i >= 0) monthCols[m] = i; });
    if(!Object.keys(monthCols).length){ out.problems.push('No month columns (JUNE … OCTOBER) found in the header row.'); return out; }

    const byName = {};
    realPupilsCache.forEach(p => { byName[p.name.trim().toLowerCase().replace(/\s+/g, ' ')] = p; });

    for(let i = headerIdx + 1; i < rows.length; i++){
      const row = rows[i];
      const rawName = (row[nameCol] || '').trim();
      if(!rawName) continue; // the activity-description row under the header, or a blank line
      const pupil = byName[rawName.toLowerCase().replace(/\s+/g, ' ')];
      if(!pupil){ out.unmatched.push(rawName); continue; }
      out.matched.add(pupil.id);
      Object.entries(monthCols).forEach(([m, col]) => {
        const cell = (row[col] || '').trim().toUpperCase();
        if(!cell) return; // blank = leave whatever is saved
        const rating = MOTOR_WORD_TO_RATING[cell];
        if(!rating){ out.problems.push(`${rawName}, ${m}: "${row[col]}" isn't B, P or A — skipped`); return; }
        out.ratings.push({ pupil_id: pupil.id, skill_type: type, month: m, rating });
      });
      if(notesCol >= 0 && (row[notesCol] || '').trim()){
        out.notes.push({ pupil_id: pupil.id, skill_type: type, note: row[notesCol].trim() });
      }
    }
    return out;
  }

  async function previewMotorImport(){
    const input = document.getElementById('motorImportInput');
    const resultEl = document.getElementById('motorImportResult');
    pendingMotorImport = null;
    if(!input.files.length){ resultEl.innerHTML = '<div class="au-error">Choose a .xlsx or .csv file first.</div>'; return; }
    resultEl.innerHTML = '<p class="sub">Reading file…</p>';
    let sheets;
    try { sheets = await readMotorFileSheets(input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }

    const ratings = [], notes = [], sheetLines = [], problems = [];
    const unmatched = new Set();
    sheets.forEach(sheet => {
      if(!sheet.rows.length) return;
      const type = motorTypeForSheet(sheet, sheets.length === 1);
      if(!type){ problems.push(`Sheet "${sheet.name}": can't tell if it's Fine or Gross Motor — name the tab FINE MOTOR or GROSS MOTOR.`); return; }
      const res = parseMotorSheet(sheet.rows, type);
      ratings.push(...res.ratings); notes.push(...res.notes);
      res.unmatched.forEach(n => unmatched.add(n));
      res.problems.forEach(p => problems.push(`Sheet "${sheet.name}": ${p}`));
      sheetLines.push(`<li><b>${type === 'fine' ? 'Fine Motor' : 'Gross Motor'}</b> (sheet "${esc(sheet.name)}") — ${res.ratings.length} rating${res.ratings.length === 1 ? '' : 's'}, ${res.notes.length} note${res.notes.length === 1 ? '' : 's'}, ${res.matched.size} child${res.matched.size === 1 ? '' : 'ren'} matched</li>`);
    });

    let html = '';
    if(ratings.length || notes.length){
      pendingMotorImport = { ratings, notes };
      html += `<div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
        <p style="margin:0 0 8px; font-weight:600;">Preview — nothing has been saved yet</p>
        <ul style="margin:0 0 10px 18px; padding:0; font-size:13px;">${sheetLines.join('')}</ul>
        <p class="cap" style="margin:0 0 10px;">Ratings in the file replace what's saved for that child and month. Blank cells in the file leave the saved rating as it is.</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="confirmMotorImport()">Confirm import — save ${ratings.length} rating${ratings.length === 1 ? '' : 's'}${notes.length ? ' and ' + notes.length + ' note' + (notes.length === 1 ? '' : 's') : ''}</button>
          <button class="btn" onclick="cancelMotorImport()">Cancel</button>
        </div>
      </div>`;
    } else {
      html += '<div class="au-error">Nothing in this file could be imported for this class.</div>';
    }
    if(unmatched.size){
      html += `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:10px 12px; margin-top:10px; font-size:12.5px;"><b>${unmatched.size} name${unmatched.size === 1 ? '' : 's'} not on this class's roll — skipped:</b><br>${[...unmatched].slice(0, 30).map(esc).join(', ')}${unmatched.size > 30 ? ' …' : ''}<br>Names must match the roll exactly. "Download sheet to fill in" gives a file with your class's names already in it.</div>`;
    }
    if(problems.length){
      html += `<div class="au-error" style="margin-top:8px;">${problems.slice(0, 20).map(esc).join('<br>')}${problems.length > 20 ? '<br>…and ' + (problems.length - 20) + ' more' : ''}</div>`;
    }
    resultEl.innerHTML = html;
  }

  function cancelMotorImport(){
    pendingMotorImport = null;
    const resultEl = document.getElementById('motorImportResult');
    if(resultEl) resultEl.innerHTML = '<p class="cap">Import cancelled — nothing was saved.</p>';
  }

  async function confirmMotorImport(){
    const resultEl = document.getElementById('motorImportResult');
    if(!pendingMotorImport){ resultEl.innerHTML = '<div class="au-error">Preview a file first.</div>'; return; }
    const { ratings, notes } = pendingMotorImport;
    resultEl.innerHTML = '<p class="sub">Saving…</p>';
    try{
      const res = await fetch('backend/assessment/motor/import_motor_assessment.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, ratings, notes })
      });
      const data = await res.json();
      if(data.status !== 'success'){ resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`; return; }
      pendingMotorImport = null;
      const fresh = await fetchMotorAssessment(); // show exactly what the database now holds
      if(typeof fresh !== 'string') motorAssessmentCache = fresh;
      motorSaveMessage = '✓ Imported ' + data.ratings_saved + ' rating' + (data.ratings_saved === 1 ? '' : 's') + (data.notes_saved ? ' and ' + data.notes_saved + ' note' + (data.notes_saved === 1 ? '' : 's') : '') + ' from the file.';
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
      alert(motorSaveMessage);
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }

  // The sheet to fill in — same layout as the source sheets, with this
  // class's own children and anything already saved, so a teacher can
  // fill it offline and import it straight back.
  function downloadMotorImportTemplate(){
    if(typeof XLSX === 'undefined'){ alert('.xlsx support did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const wbOut = XLSX.utils.book_new();
    ['fine', 'gross'].forEach(type => {
      const rows = [
        [(myClassInfo.school_name || '') + ' | ' + (myClassInfo.class_name || '')],
        [type === 'fine' ? 'FINE MOTOR ASSESSMENT SHEET' : 'GROSS MOTOR ASSESSMENT SHEET'],
        ['School: ' + (myClassInfo.school_name || '') + '    Class: ' + (myClassInfo.class_name || '') + '    Academic Year: ' + new Date().getFullYear()],
        ['B = Beginner   |   P = Proficient   |   A = Advanced'],
        [],
        ['ROLL NO.', 'STUDENT NAME', ...MOTOR_MONTHS.map(m => m.toUpperCase()), 'TEACHER NOTES'],
        ['', '', ...MOTOR_MONTHS.map(m => MOTOR_ACTIVITIES[type][m].title + '\n' + MOTOR_ACTIVITIES[type][m].detail), '']
      ];
      realPupilsCache.forEach((p, i) => rows.push([i + 1, p.name, ...MOTOR_MONTHS.map(m => motorLetter(motorRating(p.id, type, m))), motorNote(p.id, type)]));
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{wch: 9}, {wch: 26}, ...MOTOR_MONTHS.map(() => ({wch: 25})), {wch: 30}];
      ws['!merges'] = [0, 1, 2, 3].map(r => ({ s: {r, c: 0}, e: {r, c: MOTOR_MONTHS.length + 2} }));
      XLSX.utils.book_append_sheet(wbOut, ws, type === 'fine' ? 'FINE MOTOR' : 'GROSS MOTOR');
    });
    XLSX.writeFile(wbOut, 'motor-assessment-to-fill-' + (myClassInfo.class_name || 'class').replace(/\s+/g, '') + '.xlsx');
  }

  function renderMotorImportCard(){
    const toggle = document.createElement('div');
    toggle.className = 'card';
    toggle.style.cssText = 'padding:0; margin-bottom:20px; overflow:hidden;';
    toggle.innerHTML = `
      <div onclick="motorImportOpen = !motorImportOpen; this.nextElementSibling.classList.toggle('hidden', !motorImportOpen); this.querySelector('.chevron').style.transform = motorImportOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import from a file</h3>
          <p class="cap" style="margin:0;">Bring in ratings and notes from a Fine / Gross Motor Assessment sheet (.xlsx or .csv), instead of tapping each one.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${motorImportOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${motorImportOpen ? '' : 'hidden'}" style="padding:0 18px 18px;">
        <p class="cap" style="margin:0 0 8px;">Use the same layout as the assessment sheet: a header row <b>ROLL NO. · STUDENT NAME · JUNE · JULY · AUGUST · SEPTEMBER · OCTOBER · TEACHER NOTES</b>, then one row per child with B, P or A under each month (older sheets with G, Y, R are read too). An .xlsx can hold both tabs (FINE MOTOR and GROSS MOTOR); a .csv goes to the sheet selected above (${motorSkillType === 'fine' ? 'Fine Motor' : 'Gross Motor'}). Names must match this class's roll — other names are skipped.</p>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:10px 0;">
          <input type="file" id="motorImportInput" accept=".xlsx,.csv" style="max-width:100%;" />
          <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="previewMotorImport()">Preview import</button>
          <button class="btn" onclick="downloadMotorImportTemplate()">⬇ Download sheet to fill in (.xlsx)</button>
        </div>
        <div id="motorImportResult" style="word-break:break-word; overflow-wrap:anywhere;"></div>
      </div>`;
    return toggle;
  }

  function ensureMotorAssessmentLoaded(reRenderFn){
    if(motorAssessmentCache && typeof motorAssessmentCache === 'object') return true;
    if(motorAssessmentCache === 'loading') return false;
    if(typeof motorAssessmentCache === 'string') return true; // error — shown with Retry
    if(!myClassInfo.class_id) return false;
    motorAssessmentCache = 'loading';
    fetchMotorAssessment().then(result => {
      motorAssessmentCache = result;
      if(reRenderFn) reRenderFn(); else renderMonthlyAssessment(monthlyAssessmentTargetEl);
    });
    return false;
  }

/* ===== teacher-part-11.js ===== */
/* =========================================================================
   teacher-part-11.js — part 11 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  async function fetchMotorAssessment(){
    try{
      const params = new URLSearchParams(window.location.search);
      params.set('class_id', myClassInfo.class_id);
      const res = await fetch('backend/assessment/motor/get_motor_assessment.php?' + params.toString());
      const data = await res.json();
      if(data.status !== 'success') return 'error:' + (data.message || 'Could not load motor assessment.');
      return { ratings: data.ratings || {}, notes: data.notes || {} };
    } catch(err){
      return 'error:Could not reach the server.';
    }
  }

  function motorRating(pupilId, type, month){
    const c = motorAssessmentCache;
    return (c && c.ratings && c.ratings[pupilId] && c.ratings[pupilId][type] && c.ratings[pupilId][type][month]) || null;
  }
  function motorNote(pupilId, type){
    const c = motorAssessmentCache;
    return (c && c.notes && c.notes[pupilId] && c.notes[pupilId][type]) || '';
  }

  // Tap a letter to set it, tap the active one again to clear it.
  function setMotorRating(pupilId, month, rating){
    const type = motorSkillType;
    const current = motorRating(pupilId, type, month);
    const next = current === rating ? null : rating;
    const c = motorAssessmentCache;
    if(!c.ratings[pupilId]) c.ratings[pupilId] = {};
    if(!c.ratings[pupilId][type]) c.ratings[pupilId][type] = {};
    if(next) c.ratings[pupilId][type][month] = next;
    else delete c.ratings[pupilId][type][month];
    motorSaveMessage = '';
    renderMonthlyAssessment(monthlyAssessmentTargetEl);

    motorPendingSaves++;
    fetch('backend/assessment/motor/save_motor_rating.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ class_id: myClassInfo.class_id, pupil_id: pupilId, skill_type: type, month, rating: next })
    }).then(r => r.json()).then(data => {
      if(data.status !== 'success') throw new Error(data.message || 'Could not save.');
    }).catch(err => {
      // Put back what was there before, and say so.
      if(current) c.ratings[pupilId][type][month] = current;
      else delete c.ratings[pupilId][type][month];
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
      alert('Could not save that rating — ' + (err.message || 'check your connection') + '.');
    }).finally(() => { motorPendingSaves = Math.max(0, motorPendingSaves - 1); });
  }

  function saveMotorNote(pupilId, text){
    const type = motorSkillType;
    const c = motorAssessmentCache;
    if(!c.notes[pupilId]) c.notes[pupilId] = {};
    c.notes[pupilId][type] = text;
    motorPendingSaves++;
    fetch('backend/assessment/motor/save_motor_note.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ class_id: myClassInfo.class_id, pupil_id: pupilId, skill_type: type, note: text })
    }).then(r => r.json()).then(data => {
      if(data.status !== 'success') alert('Could not save that note — ' + (data.message || 'try again') + '.');
    }).catch(() => alert('Could not save that note — check your connection.'))
      .finally(() => { motorPendingSaves = Math.max(0, motorPendingSaves - 1); });
  }

  // Waits for taps still being sent, re-reads the class from the
  // database and reports what is actually stored.
  async function confirmMotorSaved(){
    const btn = document.getElementById('motorSaveBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
    for(let i = 0; i < 50 && motorPendingSaves > 0; i++) await new Promise(r => setTimeout(r, 200));
    const result = await fetchMotorAssessment();
    if(typeof result === 'string'){
      motorSaveMessage = '⚠ ' + result.slice(6) + ' Your ratings may not all be saved — try again.';
    } else {
      motorAssessmentCache = result;
      let count = 0;
      realPupilsCache.forEach(p => MOTOR_MONTHS.forEach(m => { if(motorRating(p.id, motorSkillType, m)) count++; }));
      const total = realPupilsCache.length * MOTOR_MONTHS.length;
      const now = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      motorSaveMessage = '✓ Saved at ' + now + ' — ' + count + ' of ' + total + ' ' + (motorSkillType === 'fine' ? 'fine' : 'gross') + ' motor ratings are in the database.';
    }
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  // Printable PDF in the same layout as the source sheets: title,
  // school/class line, legend, then Roll · Student · June–October ·
  // Teacher notes — one page per sheet (Fine Motor, Gross Motor), with
  // this class's own children and ratings. A blank cell is not rated.
  function downloadMotorAssessmentPdf(){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const ratingFill = { A: [212, 237, 218], P: [253, 236, 200], B: [248, 215, 218] };
    ['fine', 'gross'].forEach((type, ti) => {
      if(ti > 0) doc.addPage();
      doc.setFontSize(14);
      doc.text(type === 'fine' ? 'Fine Motor Assessment Sheet' : 'Gross Motor Assessment Sheet', 14, 15);
      doc.setFontSize(9);
      doc.text('School: ' + (myClassInfo.school_name || '') + '    Class: ' + (myClassInfo.class_name || '') + '    Academic Year: ' + new Date().getFullYear() + '    · generated ' + new Date().toLocaleDateString(), 14, 21);
      doc.text('B = Beginner   |   P = Proficient   |   A = Advanced   |   blank = not rated', 14, 26);
      doc.autoTable({
        startY: 31,
        head: [['Roll', 'Student name', ...MOTOR_MONTHS.map(m => m + '\n' + MOTOR_ACTIVITIES[type][m].title), 'Teacher notes']],
        body: realPupilsCache.map((p, i) => [i + 1, p.name, ...MOTOR_MONTHS.map(m => motorLetter(motorRating(p.id, type, m))), motorNote(p.id, type)]),
        styles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
        headStyles: { fillColor: [91, 155, 213], halign: 'center' },
        columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 45 }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' }, 7: { cellWidth: 60 } },
        didParseCell: (data) => {
          if(data.section === 'body' && data.column.index >= 2 && data.column.index <= 6){
            const fill = ratingFill[data.cell.raw];
            if(fill){ data.cell.styles.fillColor = fill; data.cell.styles.fontStyle = 'bold'; }
          }
        }
      });
      // Activity details under the table, so the sheet explains itself.
      let y = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : 31) + 8;
      doc.setFontSize(8);
      MOTOR_MONTHS.forEach(m => {
        const line = doc.splitTextToSize(m + ' — ' + MOTOR_ACTIVITIES[type][m].title + ': ' + MOTOR_ACTIVITIES[type][m].detail, 265);
        if(y + line.length * 4 > 200){ doc.addPage(); y = 15; }
        doc.text(line, 14, y);
        y += line.length * 4 + 1;
      });
    });
    doc.save('motor-assessment-' + (myClassInfo.class_name || 'class').replace(/\s+/g, '') + '-' + todayKey() + '.pdf');
  }

  // Fine / Gross sheet switch — shown right under the assessment tab buttons (above the import card)
  function renderMotorSheetCard(){
    const container = document.createElement('div');
    // Fine / Gross switch
    const switchBar = document.createElement('div'); switchBar.className = 'fbar'; switchBar.style.marginBottom = '14px';
    switchBar.innerHTML = '<div class="ctl"><label>Sheet</label><div style="display:flex; gap:5px;" id="motorTypeChips"></div></div>';
    container.appendChild(switchBar);
    const chipsWrap = switchBar.querySelector('#motorTypeChips');
    [['fine', '✋ Fine Motor'], ['gross', '🏃 Gross Motor']].forEach(([key, label]) => {
      const b = document.createElement('button');
      b.className = 'chip' + (motorSkillType === key ? ' sel' : '');
      b.textContent = label;
      b.onclick = () => { motorSkillType = key; motorSaveMessage = ''; renderMonthlyAssessment(monthlyAssessmentTargetEl); };
      chipsWrap.appendChild(b);
    });
    return container;
  }
  function renderMotorAssessmentSection(container){
    if(currentAssessTerm() === 2){
      container.appendChild(mdSec('Fine & Gross Motor — Term 2', ''));
      container.appendChild(attNote('No data available — no Fine & Gross Motor activities are set for Term 2 (November – March) yet. Term 1\u2019s ratings are under Term 1.'));
      return;
    }
    const typeLabel = motorSkillType === 'fine' ? 'Fine Motor' : 'Gross Motor';
    container.appendChild(mdSec(typeLabel + ' assessment', '<span class="reqs">ASM-M1…M2</span>'));
    const note = document.createElement('p');
    note.className = 'cap'; note.style.margin = '4px 0 14px';
    note.textContent = 'One activity a month, June to October. Rate every child B Beginner · P Proficient · A Advanced — tap B, P or A to set it, tap it again to clear. Each tap saves to the database.';
    container.appendChild(note);


    if(!myClassInfo.class_id){ container.appendChild(mdCard(null, 'Loading your class info…', null)); return; }
    if(typeof motorAssessmentCache === 'string' && motorAssessmentCache.startsWith('error:')){
      renderRetryCard(container, motorAssessmentCache.slice(6), () => { motorAssessmentCache = null; });
      return;
    }
    if(!ensureMotorAssessmentLoaded()){ container.appendChild(mdCard(null, 'Loading ratings…', null)); return; }

    const pupils = realPupilsCache;
    if(!pupils.length){ container.appendChild(mdCard(null, 'No children on the roll yet — add them in Class Attendance → Admissions.', null)); return; }

    const oldMotorImportCard = renderMotorImportCard();
    oldMotorImportCard.style.display = 'none'; // replaced by 📥 Import a file or photo (part 14)
    container.appendChild(oldMotorImportCard);

    // Real counts per month for the selected sheet
    const monthIdx = MOTOR_MONTHS.indexOf(new Date().toLocaleDateString('en-US', {month: 'long'}));
    const tiles = MOTOR_MONTHS.map((m, i) => {
      const counts = { G: 0, Y: 0, R: 0 };
      pupils.forEach(p => { const r = motorRating(p.id, motorSkillType, m); if(r) counts[r]++; });
      const rated = counts.G + counts.Y + counts.R;
      return mdTile(m + (i === monthIdx ? ' · now' : ''), rated ? counts.G : '—', rated ? 'of ' + rated + ' Advanced (A)' : 'not rated yet',
        rated ? mdPill(counts.Y + ' Proficient (P) · ' + counts.R + ' Beginner (B)', counts.R ? 'warn' : 'good') : mdPill('No data yet', 'neu'),
        MOTOR_ACTIVITIES[motorSkillType][m].title);
    });
    const tileGrid = mdGrid('g5', tiles);
    tileGrid.style.marginBottom = '20px';
    container.appendChild(tileGrid);

    // Grading table — Roll · Child · 5 months · Teacher notes
    const acts = MOTOR_ACTIVITIES[motorSkillType];
    const cellPad = 'padding:12px 14px; vertical-align:middle;';
    let table = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="min-width:1100px;"><thead><tr>'
      + '<th style="text-align:left; padding:12px 14px; width:56px;">Roll</th><th style="text-align:left; padding:12px 14px; min-width:170px;">Child</th>'
      + MOTOR_MONTHS.map((m, i) => `<th style="text-align:center; white-space:normal; min-width:140px; padding:12px 14px; ${i === monthIdx ? 'background:var(--surface-2,#eceee9);' : ''}" title="${esc(acts[m].detail)}">${esc(m)}<br><span style="font-weight:600; text-transform:none; letter-spacing:0; color:var(--ink-2,#4f534d);">${esc(acts[m].title)}</span></th>`).join('')
      + '<th style="text-align:left; min-width:220px; padding:12px 14px;">Teacher notes</th></tr></thead><tbody>';
    pupils.forEach((p, idx) => {
      const cells = MOTOR_MONTHS.map((m, i) => {
        const current = motorRating(p.id, motorSkillType, m);
        const btns = MOTOR_ORDER.map(r => {
          const active = current === r;
          return `<button onclick="setMotorRating(${p.id}, '${m}', '${r}')" title="${MOTOR_RATINGS[r].label}" style="${gradeBtnStyle(r, active, 30)}">${gradeBtnLabel(active, r)}</button>`;
        }).join('');
        return `<td style="text-align:center; ${cellPad} ${i === monthIdx ? 'background:var(--surface-2,#eceee9);' : ''}"><div style="display:inline-flex; gap:8px;">${btns}</div></td>`;
      }).join('');
      table += `<tr><td class="dim" style="text-align:left; ${cellPad}">${idx + 1}</td><td style="text-align:left; ${cellPad}"><b>${esc(p.name)}</b></td>${cells}
        <td style="text-align:left; ${cellPad}"><input type="text" data-pupil="${p.id}" class="motor-note-input" value="${esc(motorNote(p.id, motorSkillType))}" placeholder="Add a note" style="width:100%; min-width:200px; padding:8px 10px; border:1px solid var(--border,#d9dcd5); border-radius:6px; font-size:12.5px; font-family:inherit; box-sizing:border-box;" /></td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Hover a month heading to see the full activity. B Beginner · P Proficient · A Advanced. A blank cell has not been rated and is never counted.', wrap));
    wrap.querySelectorAll('.motor-note-input').forEach(inp => {
      inp.addEventListener('change', () => saveMotorNote(parseInt(inp.getAttribute('data-pupil'), 10), inp.value.trim()));
    });

    // Save & download
    let anyRated = false;
    pupils.forEach(p => ['fine', 'gross'].forEach(t => MOTOR_MONTHS.forEach(m => { if(motorRating(p.id, t, m)) anyRated = true; })));
    const saveBar = document.createElement('div');
    saveBar.className = 'card';
    saveBar.style.cssText = 'padding:18px 20px; margin-top:20px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';
    saveBar.innerHTML = `
      <div style="flex:1; min-width:240px;">
        <b>Save ${esc(typeLabel.toLowerCase())} assessment</b>
        <p class="cap" style="margin:4px 0 0;">${motorSaveMessage ? esc(motorSaveMessage) : 'Checks every rating above against the database and confirms how many are stored.'}</p>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="motorSaveBtn" class="btn-primary" style="width:auto; padding:9px 18px;">✓ Save</button>
      </div>`;
    container.appendChild(saveBar);
    saveBar.querySelector('#motorSaveBtn').onclick = confirmMotorSaved;
    container.appendChild(assessmentReportsLink('motor'));
  }

  function renderMonthlyAssessment(targetEl){
    monthlyAssessmentTargetEl = targetEl || null;
    const container = targetEl || document.getElementById('monthlyassessment-body');
    container.innerHTML = '';

    if(!ensurePupilsLoadedFor(container, () => renderMonthlyAssessment(monthlyAssessmentTargetEl))) return;
    if(assessmentEntryType !== 'records' && !ASSESSMENT_TYPE_INFO[assessmentEntryType]) assessmentEntryType = Object.keys(ASSESSMENT_TYPE_INFO)[0]; // e.g. the removed Weekly activities tab

    // --- Assessment type tabs ---
    const typeBar = document.createElement('div');
    typeBar.style.cssText = 'display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;';
    Object.keys(ASSESSMENT_TYPE_INFO).forEach(key => {
      const info = ASSESSMENT_TYPE_INFO[key];
      const active = assessmentEntryType === key;
      const btn = document.createElement('button');
      btn.textContent = info.icon + ' ' + info.label;
      btn.style.cssText = `padding:8px 16px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:${active ? '600' : '400'};`;
      btn.onclick = () => switchAssessmentEntryType(key);
      typeBar.appendChild(btn);
    });
    // ▤ Assessment records — every assessment's saved data and report, as a tab here.
    const recBtn = document.createElement('button');
    const recActive = assessmentEntryType === 'records';
    recBtn.textContent = '▤ Assessment records';
    recBtn.style.cssText = `padding:8px 16px; border-radius:8px; border:1px solid ${recActive ? 'transparent' : 'var(--border)'}; background:${recActive ? 'var(--primary)' : '#fff'}; color:${recActive ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:${recActive ? '600' : '400'};`;
    recBtn.onclick = () => openAssessmentRecords();
    typeBar.appendChild(recBtn);
    container.appendChild(typeBar);
    // Term 1 / Term 2 — on every tab (part 14); the shared month stays inside the chosen term.
    renderAssessTermBar(container);
    syncMonthToTerm();
    if(recActive){ renderAssessmentRecords(container); return; }

    // One smart import on every assessment tab that has an importer (part 14).
    if(assessmentEntryType === 'motor' && currentAssessTerm() !== 2) container.appendChild(renderMotorSheetCard()); // Sheet: Fine / Gross — right under the tabs
    const smartCard = typeof renderAssessSmartCard === 'function' ? renderAssessSmartCard(assessmentEntryType) : null;
    if(smartCard) container.appendChild(smartCard);
    const addDownload = () => container.appendChild(importDownloadCard('assessment', assessmentEntryType)); 
    
    // (real book pages, grouped by physical workbook, scoped by month —
    // not the 10-domain grid Classroom Observation used to share) and
    // is server-backed rather than a client-side store, so it gets its
    // own dedicated renderer.
    if(assessmentEntryType === 'workbook'){
      renderWorkbookAssessmentSection(container);
      addDownload(); return;
    }

    // Classroom Observation is now real, theme-based, and month-scoped
    // (see renderObservationAssessmentSection above) — no longer the
    // flat 10-domain grid the generic renderer below still serves.
    if(assessmentEntryType === 'observation'){
      renderObservationAssessmentSection(container);

      container.appendChild(assessTabTotalsCard('observation')); addDownload(); return; // Total at the end, then Download
    }

    // Pre-Test moved here from Reports > Assessment Dashboard > Child
    // Record — that page mixed real data entry with analysis, and
    // Reports should only ever hold analysis. Pre-Test is real entry
    // (same 26 real activities Weekly used to grade), so it belongs in
    // Assessment. Child Record still shows a read-only summary of what's
    // recorded here — never editable buttons.
    if(assessmentEntryType === 'pretest'){
      renderPreTestClassSection(container);
      addDownload(); return;
    }

    // Fine & Gross Motor — monthly activity sheets (June–October), G/Y/R
    // per child, real database. Comes right after Pre-Test.
    if(assessmentEntryType === 'motor'){
      renderMotorAssessmentSection(container);
      addDownload(); return;
    }

    // Weekly activity B/P/A per child — moved here from My Class, which
    // now shows the families.
    if(assessmentEntryType === 'activity'){
      renderWeeklyActivitySection(container);
      return;
    }

    ensureActiveAssessmentSeeded();
    const store = getAssessmentStore();
    const typeInfo = ASSESSMENT_TYPE_INFO[assessmentEntryType];
    const scopeLabel = assessmentEntryType === 'weekly' ? ('Week ' + currentWeekNum)
      : assessmentEntryType === 'monthly' ? new Date().toLocaleDateString([], {month:'long', year:'numeric'})
      : 'ongoing log';

    // --- Add data: manual entry or import — shown FIRST, before any
    // stats or the grid, since entering data is the actual first thing
    // to do here, not an afterthought at the bottom of the page. ---
    container.appendChild(mdSec('Add data — ' + typeInfo.label, '<span class="reqs">' + typeInfo.reqs + '</span>'));
    const addDataNote = document.createElement('p');
    addDataNote.className = 'cap'; addDataNote.style.margin = '4px 0 14px';
    addDataNote.textContent = 'Enter manually by tapping any cell in the grid below, or import a file — either way writes to the same record, so the two are never out of sync. Tapping a cell saves it immediately.';
    container.appendChild(addDataNote);

    const anyRecordedThisType = assessmentPupilNames().some(n => store[n] && Object.values(store[n]).some(Boolean));
    if(anyRecordedThisType){
      const resetRow = document.createElement('div'); resetRow.style.cssText = 'margin:0 0 14px;';
      const resetBtn = document.createElement('button');
      resetBtn.textContent = '↺ Enter manually — clear all and start fresh';
      resetBtn.style.cssText = 'padding:7px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:12.5px; font-weight:600;';
      resetBtn.onclick = clearActiveAssessmentType;
      resetRow.appendChild(resetBtn);
      container.appendChild(resetRow);
    }

    container.appendChild(renderAssessmentImportCard(assessmentEntryType));

    // --- Download report — Section 2: a standalone .pdf snapshot of
    // this recording window, separate from the entry section above. ---
    container.appendChild(mdSec('Download report — ' + typeInfo.label, '<span class="reqs">' + typeInfo.reqs + '</span>'));
    if(anyRecordedThisType){
      const dlWrap = document.createElement('div'); dlWrap.style.cssText = 'margin-top:22px; margin-bottom:16px;';
      const dlBtn = document.createElement('button');
      dlBtn.className = 'btn-primary'; dlBtn.style.cssText = 'width:auto; padding:9px 16px;';
      dlBtn.textContent = '⬇ Download ' + typeInfo.label + ' report (PDF)';
      dlBtn.onclick = downloadAssessmentGridPdf;
      dlWrap.appendChild(dlBtn);
      container.appendChild(dlWrap);
    } else {
      container.appendChild(mdCard(null, 'Nothing recorded yet — grade at least one child in one domain below to enable the report.', null));
    }

    const totalCells = assessmentPupilNames().length * ASSESSMENT_DOMAINS.length;
    let recordedCells = 0;
    const tot = {E:0,P:0,A:0};
    assessmentPupilNames().forEach(name => ASSESSMENT_DOMAINS.forEach(d => {
      const v = store[name] && store[name][d.key];
      if(v){ recordedCells++; tot[v]++; }
    }));
    const completeness = totalCells ? Math.round(recordedCells / totalCells * 100) : 0;
    const dsi = recordedCells ? Math.round(((tot.A*3 + tot.P*2 + tot.E*1) / (3 * recordedCells) * 200) * 10) / 10 : 0;
    const sriPct = recordedCells ? Math.round((tot.P + tot.A) / recordedCells * 100) : 0;
    const noMovementCount = assessmentPupilNames().filter(name => {
      const eCount = ASSESSMENT_DOMAINS.filter(d => store[name] && store[name][d.key] === 'E').length;
      return eCount < 5;
    }).length;

    container.appendChild(mdSec(typeInfo.label, '<span class="reqs">' + typeInfo.reqs + '</span>'));
    const summaryGrid = mdGrid('g5', [
      mdTile('Scope', scopeLabel, typeInfo.label, mdPill('Open for recording', 'info'), typeInfo.reqs),
      mdTile('Recording complete', completeness, '% of cells', mdPill(mdStatusBand(completeness, 90, 70).l, mdStatusBand(completeness, 90, 70).c), 'ASM-13', mdMeter(completeness)),
      mdTile('Class DSI', dsi, 'of 200', mdPill(mdStatusBand(dsi/2).l, mdStatusBand(dsi/2).c), 'DSI', mdMeter(dsi/2)),
      mdTile('At Proficient or above', sriPct, '% SRI', mdPill(mdStatusBand(sriPct).l, mdStatusBand(sriPct).c), 'SRI', mdMeter(sriPct)),
      mdTile('Children with no movement', noMovementCount, 'of ' + assessmentPupilNames().length, noMovementCount > assessmentPupilNames().length/3 ? mdPill('Look at the teaching', 'crit') : mdPill('Expected at this point', 'neu'), 'ASM-17')
    ]);
    summaryGrid.style.marginBottom = '24px';
    container.appendChild(summaryGrid);

    if(completeness < 100){
      container.appendChild(mdCard((totalCells - recordedCells) + ' of ' + totalCells + ' observations not recorded' + (assessmentEntryType === 'monthly' ? ' this month' : assessmentEntryType === 'weekly' ? ' this week' : ' yet'),
        'Every figure above is computed only on what is recorded, so an incomplete record reads better than it is.', null));
    }

    container.appendChild(mdSec('Every child against every domain', '<span class="reqs">ASM-12…14</span>'));
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th><th>Att %</th>' +
      ASSESSMENT_DOMAINS.map(d => `<th title="${esc(d.full)}">${esc(d.label)}</th>`).join('') + '<th>Rec</th><th>Moved</th></tr></thead><tbody>';
    assessmentPupilNames().forEach(name => {
      const attPct = Math.round(sampleRand(name + 'asmatt') * 100);
      if(!store[name]) store[name] = {};
      const cells = ASSESSMENT_DOMAINS.map(d => {
        const tier = store[name][d.key];
        return assessmentTierCell(name, d.key, !!tier, tier);
      }).join('');
      const recCount = ASSESSMENT_DOMAINS.filter(d => store[name][d.key]).length;
      const eCount = ASSESSMENT_DOMAINS.filter(d => store[name][d.key] === 'E').length;
      const movedPill = eCount >= 5 ? mdPill('Needs support', 'crit') : mdPill('No movement', 'warn');
      const attBand = mdStatusBand(attPct, 85, 50); // green ≥85, amber ≥50, red below — matches real screenshot's banding, not the app's usual 85/70
      table += `<tr><td><b>${esc(name)}</b></td><td>${mdPill(String(attPct), attBand.c)}</td>${cells}<td>${recCount}/${ASSESSMENT_DOMAINS.length}</td><td>${movedPill}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Tap a cell to open B / P / A — picking one saves it immediately, no separate Save step. A blank cell (·) has not been observed and is not counted anywhere — a blank is never read as Beginner, because "I have not looked" and "she cannot do it yet" are different findings.', wrap));
  }

  // ============================================================
  // ASSESSMENT DASHBOARD (Reports) — read-only summary/reporting view
  // over the exact same monthlyAssessmentEntries Monthly Assessment
  // edits and imports write to (now persisted — see
  // loadMonthlyAssessmentEntries/saveMonthlyAssessmentEntries above).
  // Nothing here has its own data source; every number is computed
  // fresh from what's actually recorded, so this and Monthly
  // Assessment can never show two different answers for the same
  // child. There's no real per-month history yet (assessment isn't
  // date-partitioned in this app), so this reports on the current
  // recording period only — no month picker, since one that didn't
  // actually change the data would be worse than none.
  // ============================================================

  const BENCHMARK_DSI = Math.round(2/3*200*10)/10; // 133.3 — DSI if every recorded cell were exactly Proficient

  function computeAssessmentDashboardStats(){
    ensureMonthlyAssessmentSeeded();
    const totalCells = assessmentPupilNames().length * ASSESSMENT_DOMAINS.length;
    const tot = {E:0,P:0,A:0};
    let recordedCount = 0;
    ASSESSMENT_DOMAINS.forEach(d => {
      assessmentPupilNames().forEach(name => {
        const tier = monthlyAssessmentEntries[name][d.key];
        if(tier){ tot[tier]++; recordedCount++; }
      });
    });
    const completeness = totalCells ? Math.round(recordedCount / totalCells * 100) : 0;
    const classDSI = recordedCount ? Math.round((tot.A*3 + tot.P*2 + tot.E*1) / (3*recordedCount) * 200 * 10) / 10 : 0;
    const sriPct = recordedCount ? Math.round((tot.P + tot.A) / recordedCount * 100) : 0;
    const advancedPct = recordedCount ? Math.round(tot.A / recordedCount * 1000) / 10 : 0;

    // Class-wide E→P / P→A conversion — same real prevtier→tier seeds
    // the Transition report's own conversion table uses, so this and
    // that page can never disagree about the same underlying movement.
    // "Current" tier prefers what's actually recorded here; falls back
    // to the same baseline seed only for cells nobody has observed yet.
    let startedE = 0, movedToP = 0, startedP = 0, movedToA = 0;
    const tierWeight = {E:1,P:2,A:3};
    assessmentPupilNames().forEach(name => {
      ASSESSMENT_DOMAINS.forEach(d => {
        const from = sampleTier(name + d.key + 'prevtier');
        const to = monthlyAssessmentEntries[name][d.key] || sampleTier(name + d.key + 'tier');
        if(from === 'E'){ startedE++; if(tierWeight[to] >= tierWeight.P) movedToP++; }
        if(from === 'P'){ startedP++; if(to === 'A') movedToA++; }
      });
    });
    const epConversion = startedE ? Math.round(movedToP / startedE * 1000) / 10 : 0;
    const paConversion = startedP ? Math.round(movedToA / startedP * 1000) / 10 : 0;

    const domainStats = ASSESSMENT_DOMAINS.map(d => {
      const dTot = {E:0,P:0,A:0};
      let n = 0;
      assessmentPupilNames().forEach(name => {
        const tier = monthlyAssessmentEntries[name][d.key];
        if(tier){ dTot[tier]++; n++; }
      });
      const dsi = n ? Math.round((dTot.A*3 + dTot.P*2 + dTot.E*1) / (3*n) * 200 * 10) / 10 : 0;
      const sri = n ? Math.round((dTot.P + dTot.A) / n * 100) : 0;
      return { d, n, tot: dTot, dsi, sri };
    });
    const flaggedDomains = domainStats.filter(x => x.n > 0 && x.dsi < BENCHMARK_DSI);

    const childRows = assessmentPupilNames().map(name => {
      const cells = ASSESSMENT_DOMAINS.map(d => {
        const tier = monthlyAssessmentEntries[name][d.key];
        const baseline = sampleTier(name + d.key + 'tier'); // the "workbook" convention Child Record already uses
        return { d, tier, disagree: !!(tier && tier !== baseline) };
      });
      const recorded = cells.filter(c => c.tier);
      const cTot = {E:0,P:0,A:0}; recorded.forEach(c => cTot[c.tier]++);
      const n = recorded.length;
      const dsi = n ? Math.round((cTot.A*3 + cTot.P*2 + cTot.E*1) / (3*n) * 200 * 10) / 10 : 0;
      const sri = n ? Math.round((cTot.P + cTot.A) / n * 100) : 0;
      const progress = n === 0 ? null : cTot.E >= 5 ? 'Beginner' : cTot.E >= 2 ? 'Developing' : 'Age Appropriate';
      const noteRoll = sampleRand(name + 'notestat');
      const note = noteRoll > 0.66 ? 'Shared' : noteRoll > 0.33 ? 'Written' : 'None';
      return { name, cells, n, dsi, sri, progress, note };
    });
    const notesSharedCount = childRows.filter(c => c.note === 'Shared').length;

    return { totalCells, recordedCount, completeness, classDSI, sriPct, advancedPct, epConversion, paConversion, domainStats, flaggedDomains, childRows, notesSharedCount };
  }

  var assessmentDashboardTab = 'overview';
  function switchAssessmentDashboardTab(tab){
    assessmentDashboardTab = tab;
    renderAssessmentDashboard();
  }

  // ---------------------------------------------------------------
  // ASSESSMENT RECORDS (Assessment Dashboard → ▤ Assessment records)
  // — every assessment's saved record and its report download, in one
  // place. Read-only: grading still happens in Assessment. Everything
  // here reads the same real stores the entry screens save to
  // (observation / workbook / motor from the database; Pre-Test from
  // its class tally).
  // ---------------------------------------------------------------

  // ---------------------------------------------------------------
  // REPORT PDF EXPORTER — one shared way to download any report on
  // screen. It reads the report exactly as rendered (headings, tiles,
  // bar rows, list rows and tables), so a download can never show a
  // different number from the screen. Buttons, inputs and charts are
  // left out; chart numbers are already in the tables and tiles.
  // ---------------------------------------------------------------
  function pdfSafeText(s){
    // jsPDF's built-in font only covers Latin-1 plus a few symbols — drop
    // emoji and other glyphs it would print as garbage.
    return String(s == null ? '' : s)
      .replace(/₹/g, 'Rs ')
      .replace(/[^\x20-\x7E\xA0-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u00B7]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function exportReportPdf(rootEl, title, fileStem){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    if(!rootEl){ alert('Nothing to export on this screen yet.'); return; }
    const clone = rootEl.cloneNode(true);
    // Keep typed values, drop controls, charts and anything marked no-export.
    clone.querySelectorAll('input, textarea').forEach(el => { const s = document.createElement('span'); s.textContent = el.value || ''; el.replaceWith(s); });
    clone.querySelectorAll('select').forEach(el => { const s = document.createElement('span'); s.textContent = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : ''; el.replaceWith(s); });
    clone.querySelectorAll('button, svg, script, style, [data-no-export]').forEach(el => el.remove());

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(pdfSafeText(title), 14, 15);
    doc.setFontSize(9);
    doc.text(pdfSafeText(assessmentPdfHeaderLine() + ' · ' + (myClassInfo.school_name || '') + ' · generated ' + new Date().toLocaleString()), 14, 21);
    let y = 28;
    const need = (h) => { if(y + h > 195){ doc.addPage(); y = 15; } };
    const heading = (text, size) => {
      const t = pdfSafeText(text); if(!t) return;
      need(10); doc.setFontSize(size); doc.text(t, 14, y); y += size >= 12 ? 7 : 6;
    };
    const table = (opts) => {
      doc.autoTable(Object.assign({ startY: y, styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [37, 99, 60] }, margin: { left: 14, right: 14 } }, opts));
      y = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : y) + 8;
    };
    let pendingTiles = [], pendingBars = [], pendingRows = [];
    const flush = () => {
      if(pendingTiles.length){ table({ head: [['Measure', 'Value', 'Status', 'Basis']], body: pendingTiles }); pendingTiles = []; }
      if(pendingBars.length){ table({ head: [['Item', 'Value']], body: pendingBars }); pendingBars = []; }
      if(pendingRows.length){ table({ head: [['Item', 'Detail', 'Status']], body: pendingRows }); pendingRows = []; }
    };

    const walk = (el) => {
      for(const child of Array.from(el.children)){
        const tag = child.tagName;
        if(tag === 'TABLE'){
          flush();
          // Clean every cell's text before handing the table over.
          child.querySelectorAll('th, td').forEach(c => { c.textContent = pdfSafeText(c.textContent) || '—'; });
          table({ html: child });
          continue;
        }
        if(child.classList.contains('tile')){
          const q = sel => { const n = child.querySelector(sel); return n ? pdfSafeText(n.textContent) : ''; };
          pendingTiles.push([q('.k'), q('.v'), q('.d'), q('.f')]);
          continue;
        }
        if(child.classList.contains('hbar-row')){
          const label = child.querySelector('.hbar-row-label'), count = child.querySelector('.hbar-count');
          pendingBars.push([pdfSafeText(label ? label.textContent : ''), pdfSafeText(count ? count.textContent : '')]);
          continue;
        }
        if(child.classList.contains('row') && child.parentElement && child.parentElement.classList.contains('list')){
          const t = child.querySelector('.t');
          const b = t && t.querySelector('b'), sp = t && t.querySelector('span');
          const rest = child.lastElementChild && child.lastElementChild !== t ? child.lastElementChild.textContent : '';
          pendingRows.push([pdfSafeText(b ? b.textContent : (t ? t.textContent : '')), pdfSafeText(sp ? sp.textContent : ''), pdfSafeText(rest)]);
          continue;
        }
        if(tag === 'H1' || tag === 'H2'){ flush(); heading(child.textContent, 13); continue; }
        if(tag === 'H3' || tag === 'H4'){ flush(); heading(child.textContent, 11); continue; }
        if(child.children.length) walk(child);
      }
    };
    walk(clone);
    flush();
    doc.save((fileStem || 'report') + '-' + todayKey() + '.pdf');
  }

  // ---------------------------------------------------------------
  // DOWNLOADS ALWAYS AT THE END — one rule for the whole portal.
  // Any element marked data-dl-end="1" (every report's download bar)
  // is kept as the LAST item of the report it sits in, even when more
  // of that report is added after it (screens often load in steps).
  // ---------------------------------------------------------------
  (function keepDownloadsAtEnd(){
    const settle = (parent) => {
      if(!parent || !parent.children) return;
      const bars = Array.from(parent.children).filter(el => el.getAttribute && el.getAttribute('data-dl-end') === '1');
      if(!bars.length) return;
      const last = parent.lastElementChild;
      if(bars.length === 1 && last === bars[0]) return;
      const tail = Array.from(parent.children).slice(-bars.length);
      if(tail.every((el, i) => el === bars[i])) return;
      bars.forEach(b => parent.appendChild(b)); // same order, moved to the end
    };
    const obs = new MutationObserver(list => {
      const seen = new Set();
      list.forEach(m => { if(m.type === 'childList' && !seen.has(m.target)){ seen.add(m.target); settle(m.target); } });
    });
    const start = () => obs.observe(document.body, { childList: true, subtree: true });
    if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
    window.settleDownloadBars = settle;
  })();

  // A "⬇ Download report (PDF)" bar, kept at the END of its report.
  // getRoot is a function so the export reads the report as it is at
  // the moment of the click, not when the button was drawn.
  function reportDownloadBar(getRoot, title, fileStem, note){
    const bar = document.createElement('div');
    bar.setAttribute('data-no-export', '1');
    bar.setAttribute('data-dl-end', '1');
    bar.style.cssText = 'display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:18px 0 6px; padding-top:14px; border-top:1px solid var(--border);';
    const btn = document.createElement('button');
    btn.textContent = '⬇ Download report (PDF)';
    btn.style.cssText = 'padding:8px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
    btn.onclick = () => exportReportPdf(getRoot(), title, fileStem);
    bar.appendChild(btn);
    if(note){ const n = document.createElement('span'); n.className = 'cap'; n.textContent = note; bar.appendChild(n); }
    return bar;
  }

  // Flags have their own shape (one card per flag), so they get a
  // straight table rather than the generic reader.
  function downloadFlagsPdf(year, month){
    if(typeof window.jspdf === 'undefined'){ alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const ym = year + '-' + String(month + 1).padStart(2, '0');
    const list = flagsRecords.filter(f => f.dateRaised && f.dateRaised.slice(0, 7) === ym).sort((a, b) => a.dateRaised.localeCompare(b.dateRaised));
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const monthName = new Date(year, month, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    doc.setFontSize(14); doc.text('Flags & Notifications — ' + monthName, 14, 15);
    doc.setFontSize(9); doc.text(pdfSafeText(assessmentPdfHeaderLine() + ' · generated ' + new Date().toLocaleString()), 14, 21);
    doc.autoTable({
      startY: 27,
      head: [['Raised', 'By', 'Kind', 'What was noted', 'Reply due', 'Status', 'My reply']],
      body: list.length ? list.map(f => [f.dateRaised, pdfSafeText(f.raisedByName || ''), FLAG_STATES[f.state] ? FLAG_STATES[f.state].label : f.state, pdfSafeText(f.text), f.dueDate || '—',
        f.status === 'replied' ? 'Replied ' + (f.replyDate || '') : f.state === 'observation' ? 'No reply needed' : (f.dueDate && f.dueDate < todayDateKey() ? 'Overdue' : 'Awaiting reply'),
        pdfSafeText(f.replyText || '')]) : [['—', '', '', 'Nothing raised this month.', '', '', '']],
      styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [37, 99, 60] },
      columnStyles: { 3: { cellWidth: 80 }, 6: { cellWidth: 60 } }
    });
    doc.save('flags-' + ym + '-' + todayKey() + '.pdf');
  }

  // Parent Involvement lives in js/render/parent-volunteers.js — add the
  // same download bar to it without editing that file, by wrapping its
  // render function once it exists.
  (function attachParentInvolvementDownload(){
    const wrap = () => {
      if(typeof window.renderParentInvolvement !== 'function' || window.renderParentInvolvement.__withDownload) return false;
      const original = window.renderParentInvolvement;
      const wrapped = function(){
        const out = original.apply(this, arguments);
        const body = document.getElementById('parentinvolvement-body');
        if(body && Array.isArray(realPupilsCache) && !body.querySelector('[data-report-dl]')){
          const bar = reportDownloadBar(() => document.getElementById('parentinvolvement-body'), 'Parent Involvement', 'parent-involvement');
          bar.setAttribute('data-report-dl', '1');
          body.appendChild(bar);
        }
        return out;
      };
      wrapped.__withDownload = true;
      window.renderParentInvolvement = wrapped;
      return true;
    };
    if(!wrap()) window.addEventListener('load', wrap);
  })();

  var assessmentRecordsType = 'total'; // 'total' | 'observation' | 'workbook' | 'pretest' | 'motor'

  function assessmentRecordsRerender(){
    const body = document.getElementById('assessmentdashboard-body');
    if(body && !body.classList.contains('hidden') && assessmentDashboardTab === 'records') renderAssessmentDashboard();
    const ab = document.getElementById('assessment-body');
    if(ab && !ab.classList.contains('hidden') && assessmentEntryType === 'records') renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }


  // The small pointer each entry screen shows where its download used to be.
  function assessmentReportsLink(type){
    // The "report is in the Assessment records tab" note is no longer shown —
    // ▤ Assessment records is already a tab at the top of this screen.
    return document.createDocumentFragment();
  }

  function recordsLetterPill(letter, cls){
    return letter
      ? gradeDot(letter, 22)
      : '<span class="dim">·</span>';
  }

  function recordsDownloadRow(buttons, note){
    const row = document.createElement('div');
    row.className = 'card';
    row.setAttribute('data-no-export', '1');
    row.setAttribute('data-dl-end', '1');
    row.style.cssText = 'padding:14px 18px; margin:18px 0 0; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';
    row.innerHTML = `<div style="flex:1; min-width:220px;"><b>⬇ Download report</b><p class="cap" style="margin:3px 0 0;">${note}</p></div><div style="display:flex; gap:8px; flex-wrap:wrap;"></div>`;
    const btnWrap = row.lastElementChild;
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = b.primary ? 'btn-primary' : 'btn';
      if(b.primary) btn.style.cssText = 'width:auto; padding:9px 16px;';
      btn.textContent = b.label;
      if(b.disabled){ btn.disabled = true; btn.title = b.disabled; }
      else btn.onclick = b.onClick;
      btnWrap.appendChild(btn);
    });
    return row;
  }

  function renderAssessmentRecords(container){
    container.appendChild(mdSec('Assessment records', '<span class="reqs">REP · all instruments</span>'));
    const intro = document.createElement('p');
    intro.className = 'cap'; intro.style.margin = '4px 0 14px';
    intro.textContent = 'What has actually been saved for each assessment, and its report. Grading happens in Assessment — this view is read-only.';
    container.appendChild(intro);

    const typeBar = document.createElement('div'); typeBar.className = 'fbar'; typeBar.style.marginBottom = '14px';
    typeBar.innerHTML = '<div class="ctl"><label>Assessment</label><div style="display:flex; gap:5px; flex-wrap:wrap;" id="recordsTypeChips"></div></div>';
    container.appendChild(typeBar);
    const chips = typeBar.querySelector('#recordsTypeChips');
    [['total', 'Σ Total — every CG'], ['pretest', '📋 Pre-Test'], ['observation', '👁️ Classroom Observation'], ['workbook', '📘 Workbook'], ['motor', '🤸 Fine & Gross Motor']].forEach(([key, label]) => {
      const b = document.createElement('button');
      b.className = 'chip' + (assessmentRecordsType === key ? ' sel' : '');
      b.textContent = label;
      b.onclick = () => { assessmentRecordsType = key; assessmentRecordsRefresh(); };
      chips.appendChild(b);
    });

    // Month picker for the month-scoped instruments — the same shared
    // month the Assessment screens use.
    if(assessmentRecordsType === 'observation' || assessmentRecordsType === 'workbook' || assessmentRecordsType === 'total'){
      const bar = document.createElement('div'); bar.className = 'fbar'; bar.style.marginBottom = '14px';
      bar.innerHTML = '<div class="ctl"><label>Month</label><select id="recordsMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
      container.appendChild(bar);
      const sel = bar.querySelector('#recordsMonthSelect');
      fillRecordsMonthSelect(sel); // part 14: the term's months, plus Whole Term for Σ Total
    }

    const body = document.createElement('div');
    container.appendChild(body);
    if(!ensurePupilsLoadedFor(body, assessmentRecordsRerender)) return;

    if(!['total', 'observation', 'workbook', 'pretest', 'motor'].includes(assessmentRecordsType)) assessmentRecordsType = 'total';
    if(assessmentRecordsType === 'total') renderCgTotalRecords(body); // part 14
    else if(assessmentRecordsType === 'observation') renderObservationRecords(body);
    else if(assessmentRecordsType === 'workbook') renderWorkbookRecords(body);
    else if(assessmentRecordsType === 'pretest') renderPreTestRecords(body);
    else renderMotorRecords(body);
  }

  function recordsErrorCard(container, message, clearFn){
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="card" style="padding:16px;"><p style="margin:0 0 10px;">${esc(message)}</p><button class="btn-primary" style="width:auto; padding:7px 14px;">Retry</button></div>`;
    wrap.querySelector('button').onclick = () => { clearFn(); assessmentRecordsRefresh(); };
    container.appendChild(wrap);
  }

  function renderObservationRecords(container){
    const level = workbookLevelFromClassName();
    const month = currentWorkbookMonth;
    const themesKey = level + '|' + month;
    const themesLoaded = ensureObservationThemesLoaded(level, month, assessmentRecordsRerender);
    const marksLoaded = ensureObservationAssessmentLoaded(month, assessmentRecordsRerender);
    if(typeof observationThemesCache[themesKey] === 'string' && observationThemesCache[themesKey].startsWith('error:')){ recordsErrorCard(container, observationThemesCache[themesKey].slice(6), () => delete observationThemesCache[themesKey]); return; }
    if(typeof observationAssessmentCache[month] === 'string' && observationAssessmentCache[month].startsWith('error:')){ recordsErrorCard(container, observationAssessmentCache[month].slice(6), () => delete observationAssessmentCache[month]); return; }
    if(!themesLoaded || !marksLoaded){ container.appendChild(mdCard(null, 'Loading Classroom Observation…', null)); return; }

    const themes = observationThemesCache[themesKey];
    const marks = observationAssessmentCache[month];
    if(!themes.length){ container.appendChild(mdCard(null, 'No observation themes are scheduled for ' + esc(month) + '.', null)); return; }
    const anyGraded = Object.keys(marks).some(pid => Object.keys(marks[pid] || {}).length);

    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF', primary: true, onClick: downloadObservationAssessmentPdf, disabled: anyGraded ? '' : 'Nothing graded this month yet' },
      { label: '⬇ Excel (.xlsx)', onClick: downloadObservationAssessmentXlsx, disabled: anyGraded ? '' : 'Nothing graded this month yet' }
    ], anyGraded ? 'Every theme graded in ' + esc(month) + ', one table per theme.' : 'Nothing has been graded for ' + esc(month) + ' yet.'));

    const obsPick = recordsPick(container, 'obs|' + month, 'Topic', themes.map(t => [t.name, t.name + ' (' + t.items.length + ' CG)']).concat([['__all', 'All topics, one below another (' + themes.length + ')']]));
    themes.filter(t => obsPick === '__all' || t.name === obsPick).forEach(t => {
      let graded = 0;
      let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Child</th>'
        + t.items.map(it => `<th style="text-align:center;" title="${esc(it.goal_text || '')}">${esc(it.cg_code)}</th>`).join('') + '</tr></thead><tbody>';
      assessmentPupilNames().forEach((name, idx) => {
        const pm = marks[realPupilsCache[idx].id] || {};
        table += `<tr><td style="text-align:left;"><b>${esc(name)}</b></td>` + t.items.map(it => {
          const v = pm[it.id]; if(v) graded++;
          return `<td style="text-align:center;">${recordsLetterPill(v ? TIER_INFO[v].letter : '', v ? TIER_INFO[v].c : '')}</td>`;
        }).join('') + '</tr>';
      });
      table += '</tbody></table></div>';
      const wrap = document.createElement('div'); wrap.innerHTML = table;
      const card = mdCard(t.name, graded + ' of ' + (t.items.length * assessmentPupilNames().length) + ' grades recorded · B Beginner · P Proficient · A Advanced · · not graded', wrap);
      card.style.marginBottom = '16px';
      container.appendChild(card);
    });
  }

  function renderWorkbookRecords(container){
    const level = workbookLevelFromClassName();
    const month = currentWorkbookMonth;
    const booksKey = level + '|' + month;
    const booksLoaded = ensureWorkbookCompetenciesLoaded(level, month, assessmentRecordsRerender);
    const tallyLoaded = ensureWorkbookCompetencyTallyLoaded(month, assessmentRecordsRerender);
    if(myClassInfo.class_id) ensureWorkbookMonthSubmissionLoaded(myClassInfo.class_id, month, assessmentRecordsRerender);
    if(typeof workbookCompetenciesCache[booksKey] === 'string' && workbookCompetenciesCache[booksKey].startsWith('error:')){ recordsErrorCard(container, workbookCompetenciesCache[booksKey].slice(6), () => delete workbookCompetenciesCache[booksKey]); return; }
    if(typeof workbookCompetencyTallyCache[month] === 'string' && workbookCompetencyTallyCache[month].startsWith('error:')){ recordsErrorCard(container, workbookCompetencyTallyCache[month].slice(6), () => delete workbookCompetencyTallyCache[month]); return; }
    if(!booksLoaded || !tallyLoaded){ container.appendChild(mdCard(null, 'Loading Workbook Assessment…', null)); return; }

    const books = workbookCompetenciesCache[booksKey];
    const tally = workbookCompetencyTallyCache[month] || {};
    const sub = workbookMonthSubmissionCache[month];
    const isSubmitted = sub && typeof sub === 'object' && sub.submitted;
    if(!books.length){ container.appendChild(mdCard(null, 'No workbooks are set up for ' + esc(level) + ' yet.', null)); return; }

    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF — every workbook', primary: true, onClick: () => downloadWorkbookMonthReportPdf(books, month), disabled: isSubmitted ? '' : 'Submit this month\u2019s marks in Assessment → Workbook first' }
    ], isSubmitted
      ? '✓ ' + esc(month) + ' submitted' + (sub.submitted_by_name ? ' by ' + esc(sub.submitted_by_name) : '') + ' — every workbook in one PDF.'
      : '🔒 ' + esc(month) + ' isn\u2019t submitted yet — submit it in Assessment → Workbook Assessment to unlock the report.'));

    const wbPick = recordsPick(container, 'wb|' + month, 'Workbook', books.filter(b => b.competencies.length).map(b => [b.name, b.name]).concat([['__all', 'All workbooks, one below another']]));
    books.filter(b => wbPick === '__all' || b.name === wbPick).forEach(book => {
      if(!book.competencies.length) return;
      let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">CG</th><th style="text-align:left;">Competency</th><th style="text-align:center;"><span class="gd gd-B" style="width:20px; height:20px; font-size:10px;">B</span></th><th style="text-align:center;"><span class="gd gd-P" style="width:20px; height:20px; font-size:10px;">P</span></th><th style="text-align:center;"><span class="gd gd-A" style="width:20px; height:20px; font-size:10px;">A</span></th></tr></thead><tbody>';
      let rowsWithData = 0;
      book.competencies.forEach(c => {
        const t = tally[c.id] || { count_e: 0, count_p: 0, count_a: 0 };
        if(t.count_e + t.count_p + t.count_a > 0) rowsWithData++;
        table += `<tr><td class="dim" style="text-align:left;">${esc(c.cg_code)}</td><td style="text-align:left; white-space:normal;">${esc(c.competency_text)}</td><td style="text-align:center;">${t.count_e}</td><td style="text-align:center;">${t.count_p}</td><td style="text-align:center;">${t.count_a}</td></tr>`;
      });
      table += '</tbody></table></div>';
      const wrap = document.createElement('div'); wrap.innerHTML = table;
      const card = mdCard(book.name, rowsWithData + ' of ' + book.competencies.length + ' competencies have counts for ' + esc(month) + ' · class-wide counts, not per child', wrap);
      card.style.marginBottom = '16px';
      container.appendChild(card);
    });
  }

  function renderPreTestRecords(container){
    ensurePreTestTallyForClass();
    const anyTallied = Object.values(preTestTallyEntries).some(t => (t.count_e + t.count_p + t.count_a) > 0);
    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF', primary: true, onClick: downloadPreTestClassPdf, disabled: anyTallied ? '' : 'Nothing recorded yet' }
    ], anyTallied ? 'The class baseline across all ' + WEEKLY_ASSESSMENT_ACTIVITIES.length + ' activities.' : 'Nothing has been recorded for the Pre-Test yet.'));

    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>#</th><th style="text-align:left;">Type</th><th style="text-align:left;">Activity</th><th style="text-align:left;">CG</th><th style="text-align:center;"><span class="gd gd-B" style="width:20px; height:20px; font-size:10px;">B</span></th><th style="text-align:center;"><span class="gd gd-P" style="width:20px; height:20px; font-size:10px;">P</span></th><th style="text-align:center;"><span class="gd gd-A" style="width:20px; height:20px; font-size:10px;">A</span></th><th style="text-align:center;">Avg</th></tr></thead><tbody>';
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const t = preTestTallyEntries[String(idx)] || { count_e: 0, count_p: 0, count_a: 0 };
      const marked = t.count_e + t.count_p + t.count_a;
      const avg = marked ? Math.round((t.count_a*3 + t.count_p*2 + t.count_e) / marked * 100) / 100 : null;
      table += `<tr><td class="dim">${idx + 1}</td><td class="dim" style="text-align:left;">${esc(a.type)}</td><td style="text-align:left; white-space:normal;">${esc(a.activity)}</td><td class="dim" style="text-align:left;">${esc(a.cg)}</td><td style="text-align:center;">${t.count_e}</td><td style="text-align:center;">${t.count_p}</td><td style="text-align:center;">${t.count_a}</td><td style="text-align:center;">${avg === null ? '—' : avg}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard('Pre-Test — class baseline', 'Class-wide counts per activity (B Beginner · P Proficient · A Advanced). Avg = the average score (B lowest, A highest).', wrap));
  }

  function renderMotorRecords(container){
    if(typeof motorAssessmentCache === 'string' && motorAssessmentCache.startsWith('error:')){ recordsErrorCard(container, motorAssessmentCache.slice(6), () => { motorAssessmentCache = null; }); return; }
    if(!ensureMotorAssessmentLoaded(assessmentRecordsRerender)){ container.appendChild(mdCard(null, 'Loading Fine & Gross Motor…', null)); return; }

    let anyRated = false;
    realPupilsCache.forEach(p => ['fine', 'gross'].forEach(t => MOTOR_MONTHS.forEach(m => { if(motorRating(p.id, t, m)) anyRated = true; })));
    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF — both sheets', primary: true, onClick: downloadMotorAssessmentPdf, disabled: anyRated ? '' : 'Nothing rated yet' }
    ], anyRated ? 'Fine Motor and Gross Motor sheets, June to October, with teacher notes.' : 'No child has been rated yet.'));

    const cls = { G: 'good', Y: 'warn', R: 'crit' };
    const motorPick = recordsPick(container, 'motor', 'Sheet', [['fine', '✋ Fine Motor'], ['gross', '🏃 Gross Motor'], ['__all', 'Both sheets, one below another']]);
    ['fine', 'gross'].filter(t => motorPick === '__all' || t === motorPick).forEach(type => {
      let rated = 0;
      let table = '<div class="report-table-wrap"><table class="report-table" style="min-width:900px;"><thead><tr><th style="text-align:left;">Roll</th><th style="text-align:left;">Child</th>'
        + MOTOR_MONTHS.map(m => `<th style="text-align:center; white-space:normal;" title="${esc(MOTOR_ACTIVITIES[type][m].detail)}">${esc(m)}<br><span style="font-weight:600; text-transform:none; letter-spacing:0;">${esc(MOTOR_ACTIVITIES[type][m].title)}</span></th>`).join('')
        + '<th style="text-align:left;">Teacher notes</th></tr></thead><tbody>';
      realPupilsCache.forEach((p, i) => {
        table += `<tr><td class="dim" style="text-align:left;">${i + 1}</td><td style="text-align:left;"><b>${esc(p.name)}</b></td>` + MOTOR_MONTHS.map(m => {
          const r = motorRating(p.id, type, m); if(r) rated++;
          return `<td style="text-align:center;">${recordsLetterPill(motorLetter(r), r ? cls[r] : '')}</td>`;
        }).join('') + `<td style="text-align:left; white-space:normal;" class="dim">${esc(motorNote(p.id, type)) || '—'}</td></tr>`;
      });
      table += '</tbody></table></div>';
      const wrap = document.createElement('div'); wrap.innerHTML = table;
      const card = mdCard(type === 'fine' ? '✋ Fine Motor' : '🏃 Gross Motor', rated + ' of ' + (realPupilsCache.length * MOTOR_MONTHS.length) + ' ratings recorded · B Beginner · P Proficient · A Advanced', wrap);
      card.style.marginBottom = '16px';
      container.appendChild(card);
    });
  }


  // Assessment records → My Class weekly ratings (read-only; rated in My Class).
  var recordsMyClassWeek = null; // null = current week
  function renderMyClassRecords(container){
    const week = recordsMyClassWeek === null ? currentWeekNum : recordsMyClassWeek;
    const firstWeek = (typeof WEEKS !== 'undefined' && WEEKS.length) ? WEEKS[0].w : 1;
    const weekInfo = (typeof WEEKS !== 'undefined') ? WEEKS.find(w => w.w === week) : null;
    const picker = document.createElement('div');
    picker.setAttribute('data-no-export', '1');
    picker.style.cssText = 'display:flex; align-items:center; gap:10px; margin:0 0 12px; flex-wrap:wrap;';
    picker.innerHTML = `<button class="btn" ${week <= firstWeek ? 'disabled' : ''}>‹ Previous week</button>
      <div><b>Week ${week}</b>${weekInfo ? ' · ' + esc(weekInfo.theme) + ' <span class="dim">(' + esc(weekInfo.dates) + ')</span>' : ''}</div>
      <button class="btn" ${week >= currentWeekNum ? 'disabled' : ''}>Next week ›</button>`;
    const [prevB, nextB] = picker.querySelectorAll('button');
    prevB.onclick = () => { recordsMyClassWeek = week - 1; assessmentRecordsRefresh(); };
    nextB.onclick = () => { recordsMyClassWeek = week + 1; assessmentRecordsRefresh(); };
    container.appendChild(picker);

    if(!myClassInfo.class_id){ container.appendChild(mdCard(null, 'Loading your class info…', null)); return; }
    const status = childActivityRatingsStatus[week];
    if(status === undefined) fetchChildActivityRatings(week);
    if(status === undefined || status === 'loading'){ container.appendChild(mdCard(null, 'Loading this week\u2019s ratings…', null)); return; }
    if(status === 'error'){ recordsErrorCard(container, 'Could not load this week\u2019s ratings from the server.', () => { delete childActivityRatingsStatus[week]; }); return; }

    const weekRatings = childActivityRatings[week] || {};
    const report = document.createElement('div');
    let rated = 0;
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Child</th>'
      + DOMAINS.map(d => `<th style="text-align:center; white-space:normal;">${esc(d.label)}<br><span class="dim" style="font-weight:400; font-size:11px;">${esc(d.cg || '')}</span></th>`).join('')
      + '<th style="text-align:center;">Rated</th><th style="text-align:center;">P or A</th></tr></thead><tbody>';
    realPupilsCache.forEach(p => {
      const r = weekRatings[p.id] || {};
      const n = DOMAINS.filter(d => r[d.key]).length; rated += n;
      const pa = DOMAINS.filter(d => r[d.key] === 'P' || r[d.key] === 'A').length;
      table += `<tr><td style="text-align:left;"><b>${esc(p.name)}</b></td>` + DOMAINS.map(d => `<td style="text-align:center;">${recordsLetterPill(r[d.key] ? TIER_INFO[r[d.key]].letter : '', r[d.key] ? TIER_INFO[r[d.key]].c : '')}</td>`).join('')
        + `<td style="text-align:center;">${n ? n + ' / ' + DOMAINS.length : '—'}</td><td style="text-align:center;">${n ? pa + ' of ' + n : '—'}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    report.appendChild(mdSec('My Class — weekly activity ratings, Week ' + week, ''));
    report.appendChild(mdCard(null, rated + ' of ' + (realPupilsCache.length * DOMAINS.length) + ' ratings recorded · B Beginner · P Proficient · A Advanced · · not rated', wrap));
    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF', primary: true, onClick: () => exportReportPdf(report, 'My Class — weekly activity ratings, Week ' + week, 'myclass-ratings-week' + week), disabled: rated ? '' : 'Nothing rated this week yet' }
    ], rated ? 'Every child against every activity area for Week ' + week + '.' : 'Nothing has been rated for Week ' + week + ' yet.'));
    container.appendChild(report);
  }

  function renderAssessmentDashboard(){
    if(assessmentDashboardTab === 'records') assessmentDashboardTab = 'overview'; // records now live in Assessment → ▤ Assessment records
    const container = document.getElementById('assessmentdashboard-body');
    container.innerHTML = '';

    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex; gap:8px; margin:14px 0; overflow-x:auto; flex-wrap:wrap;';
    const tabStyle = (active) => `padding:8px 16px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:${active ? '600' : '400'}; white-space:nowrap;`;
    tabBar.innerHTML = `
      <button style="${tabStyle(assessmentDashboardTab === 'overview')}" onclick="switchAssessmentDashboardTab('overview')">◆ Overview</button>
      <button style="${tabStyle(assessmentDashboardTab === 'childrecord')}" onclick="switchAssessmentDashboardTab('childrecord')">◍ Child Record</button>
      <button style="${tabStyle(assessmentDashboardTab === 'transition')}" onclick="switchAssessmentDashboardTab('transition')">△ Transition</button>
    `;
    container.appendChild(tabBar);

    // Child Record keeps its own dedicated div (childrecord-body) — other
    // screens (Transition's roster, this dashboard's own tables, etc.)
    // jump straight to a specific child via switchSidebarSection
    // ('childrecord', name), and that path keeps working unchanged.
    // This tab just shows/hides that same div instead of duplicating
    // renderChildRecord's logic.
    document.getElementById('childrecord-body').classList.toggle('hidden', assessmentDashboardTab !== 'childrecord');

    if(assessmentDashboardTab === 'overview'){
      renderAssessmentDashboardOverview(container);
    } else if(assessmentDashboardTab === 'records'){
      renderAssessmentRecords(container);
    } else if(assessmentDashboardTab === 'childrecord'){
      renderChildRecord();
    } else if(assessmentDashboardTab === 'transition'){
      // Same renderTransition() used for the standalone section —
      // rendered into a fresh div under this tab bar instead of its
      // own sidebar destination.
      const transitionWrap = document.createElement('div');
      container.appendChild(transitionWrap);
      renderTransition(transitionWrap);
    }
  }

/* ===== teacher-part-12.js ===== */
/* =========================================================================
   teacher-part-12.js — part 12 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  function downloadAssessmentDashboardOverviewPdf(){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const stats = computeAssessmentDashboardStats();
    const monthName = new Date().toLocaleDateString([], {month:'long', year:'numeric'});
    const nameEl = document.querySelector('.user-name');
    const teacherLabel = ((nameEl && nameEl.textContent.trim()) || 'Teacher') + ' — ' + myClassInfo.class_name;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Assessment Dashboard — ' + monthName, 14, 15);
    doc.setFontSize(9);
    doc.text(teacherLabel + ' · generated ' + new Date().toLocaleDateString(), 14, 21);

    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(
      `Class DSI ${stats.recordedCount ? stats.classDSI : '—'} of 200 · At Proficient or above (SRI) ${stats.recordedCount ? stats.sriPct + '%' : '—'} · Recording complete ${stats.completeness}% · Advanced ${stats.recordedCount ? stats.advancedPct + '%' : '—'} · E→P conversion ${stats.epConversion}% · P→A conversion ${stats.paConversion}% · Feedback notes shared ${stats.notesSharedCount} of ${assessmentPupilNames().length}.`,
      265
    );
    doc.text(summaryLines, 14, 30);
    let y = 30 + summaryLines.length * 5 + 6;

    doc.setFontSize(11);
    if(stats.flaggedDomains.length){
      doc.text('Domains below benchmark', 14, y);
      doc.autoTable({
        startY: y + 4,
        head: [['Domain', 'DSI (of 200)']],
        body: stats.flaggedDomains.map(x => [x.d.full, x.dsi]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [200, 60, 60] }
      });
      y = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.text('No domains below benchmark this month.', 14, y);
      y += 10;
    }

    doc.setFontSize(11);
    doc.text('Domain-by-domain', 14, y);
    doc.autoTable({
      startY: y + 4,
      head: [['Domain', 'Recorded', 'DSI (of 200)', 'SRI %', 'Beginner', 'Proficient', 'Advanced']],
      body: stats.domainStats.map(x => [x.d.full, x.n + '/' + assessmentPupilNames().length, x.n ? x.dsi : '—', x.n ? x.sri + '%' : '—', x.tot.E, x.tot.P, x.tot.A]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });

    // Own page — one row per child across all ten domains is wide
    // enough to want the full page to itself.
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Child by domain — ' + monthName, 14, 15);
    doc.autoTable({
      startY: 22,
      head: [['Child', ...ASSESSMENT_DOMAINS.map(d => d.label), 'DSI', 'SRI %', 'Progress band']],
      body: stats.childRows.map(c => [
        c.name,
        ...c.cells.map(cell => cell.tier || '·'),
        c.n ? c.dsi : '—',
        c.n ? c.sri + '%' : '—',
        c.progress || 'No data'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });

    doc.save('assessment-dashboard-' + monthName.replace(/\s+/g, '-').toLowerCase() + '-' + todayKey() + '.pdf');
  }

  let dashboardTrendFromMonth = null;
  let dashboardTrendToMonth = null;
  const workbookTallyTrendCache = {}; // 'fromMonth|toMonth' -> null|'loading'|'error:...'|[competency rows]
  function ensureWorkbookTallyTrendLoaded(fromMonth, toMonth, reRenderFn){
    const key = fromMonth + '|' + toMonth;
    if(Array.isArray(workbookTallyTrendCache[key])) return true;
    if(workbookTallyTrendCache[key] === 'loading') return false;
    if(typeof workbookTallyTrendCache[key] === 'string' && workbookTallyTrendCache[key].startsWith('error:')) return true;
    workbookTallyTrendCache[key] = 'loading';
    fetch('backend/assessment/workbook/get_workbook_tally_trend.php?' + new URLSearchParams({ from_month: fromMonth, to_month: toMonth }) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(res => res.json())
      .then(data => {
        workbookTallyTrendCache[key] = data.status === 'success' ? data.competencies : 'error:' + (data.message || 'Could not load trend data.');
        reRenderFn();
      })
      .catch(() => { workbookTallyTrendCache[key] = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }

  function renderAssessmentDashboardOverview(container){
    renderAssessmentOverviewReal(container); // part 14 — real saved marks only
  }

  // Placeholder — "Open feedback notes" needs a real parent-facing
  // notes feature (see Family & Parents) that doesn't exist yet.
  // Left as an inert stub rather than a broken link, same pattern as
  // other not-yet-wired actions in this app.
  function openFeedbackNotesStub(){}



  // ---------------------------------------------------------
  // IMPORT ASSESSMENT — client-side only, on purpose. Unlike
  // Materials, there is no real periodic_ratings-style database table
  // wired up for Monthly Assessment yet — monthlyAssessmentEntries is
  // pure in-memory state that resets on reload, same as it's always
  // been. This import fills that same in-memory object faster than
  // tapping every cell by hand; it does NOT persist anywhere, and
  // says so plainly rather than implying otherwise.
  //
  // Expected format — exactly 3 columns, header row required:
  //   child_name,domain,tier
  //   Aarav Sharma,heal,E
  //   Aarav Sharma,phys,P
  // domain must be one of: heal, phys, sens, envi, emot, part, logi, math, lang, arts
  // tier must be one of: E, P, A
  // ---------------------------------------------------------
  // ---------------------------------------------------------
  // IMPORT ASSESSMENT — bulk version of tapping every B/P/A cell by
  // hand, same idea as Import materials. Accepts .csv or a real .xlsx
  // (read client-side via SheetJS, loaded from cdnjs — this app has no
  // backend table for assessment yet, so unlike Materials this can't
  // go through a PHP/ZipArchive endpoint; it fills monthlyAssessmentEntries
  // directly, then saveMonthlyAssessmentEntries() persists it to
  // localStorage same as typing it in by hand would).
  //
  // Expected format — exactly 3 columns, header row required:
  //   child_name,domain,tier
  //   Aarav Sharma,heal,E
  //   Aarav Sharma,phys,P
  // domain must be one of: heal, phys, sens, envi, emot, part, logi, math, lang, arts
  // tier must be one of: E, P, A
  // ---------------------------------------------------------
  function renderAssessmentImportCard(afterImport){
    const typeLabel = ASSESSMENT_TYPE_INFO[afterImport] ? ASSESSMENT_TYPE_INFO[afterImport].label : 'assessment';
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.marginTop = '16px';
    wrap.innerHTML = `
      <div class="hd"><div><h3>Import ${esc(typeLabel)} from a file</h3><p class="cap">.csv or .xlsx — header row must be exactly: child_name,domain,tier — domain is one of heal/phys/sens/envi/emot/part/logi/math/lang/arts, tier is B, P or A.</p></div></div>
      <input type="file" id="assessmentImportInput" accept=".csv,.xlsx" style="margin-top:8px;" />
      <div id="assessmentImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importAssessmentFile('${afterImport}')">Import</button>
    `;
    return wrap;
  }

  // Reads a File into an array of string rows (each row an array of
  // string cells) regardless of whether it's .csv or .xlsx, so the
  // validation/import logic below only has to be written once.
  async function readAssessmentFileRows(file){
    // Rows corrected in the smart import preview (part 14) come in here
    // instead of a file, then go through the importer's normal checks.
    if(typeof smartAssessHandoffRows !== 'undefined' && smartAssessHandoffRows){ const r = smartAssessHandoffRows; smartAssessHandoffRows = null; return r; }
    if(/\.xlsx$/i.test(file.name)){
      if(typeof XLSX === 'undefined'){
        throw new Error('.xlsx support did not load (no internet reached the CDN) — try a .csv file instead.');
      }
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })
        .map(row => row.map(cell => String(cell).trim()))
        .filter(row => row.some(cell => cell !== ''));
    }
    const text = await file.text();
    return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => l.split(',').map(c => c.trim()));
  }

  async function importAssessmentFile(afterImport){
    const input = document.getElementById('assessmentImportInput');
    const resultEl = document.getElementById('assessmentImportResult');
    if(!input.files.length){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';

    let rows;
    try {
      rows = await readAssessmentFileRows(input.files[0]);
    } catch(err){
      resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`;
      return;
    }
    if(!rows.length){
      resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>';
      return;
    }
    const header = rows[0].map(h => h.toLowerCase());
    if(header.join(',') !== 'child_name,domain,tier'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: child_name,domain,tier — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }
    // Resolves from the explicit afterImport argument, not the global
    // assessmentEntryType — Dashboard's own import always targets
    // monthly regardless of whichever tab was last open elsewhere.
    let targetStore, targetSave;
    if(afterImport === 'weekly'){
      if(!weeklyAssessmentEntries[currentWeekNum]) weeklyAssessmentEntries[currentWeekNum] = {};
      targetStore = weeklyAssessmentEntries[currentWeekNum];
      targetSave = saveWeeklyAssessmentEntries;
    } else if(afterImport === 'observation'){
      targetStore = classroomObservationEntries;
      targetSave = saveClassroomObservationEntries;
    } else {
      targetStore = monthlyAssessmentEntries; // 'monthly' or 'dashboard'
      targetSave = saveMonthlyAssessmentEntries;
    }
    const validDomains = ASSESSMENT_DOMAINS.map(d => d.key);
    let imported = 0;
    const skipped = [];
    for(let i = 1; i < rows.length; i++){
      const parts = rows[i];
      const rowNum = i + 1;
      if(parts.length !== 3){ skipped.push(`Row ${rowNum}: expected 3 columns, got ${parts.length}`); continue; }
      const [childName, domain, tierRaw] = parts;
      let tier = tierRaw.toUpperCase();
      if(tier === 'B') tier = 'E'; // accept the displayed letter (Beginner) as well as the internal code
      if(!assessmentPupilNames().includes(childName)){ skipped.push(`Row ${rowNum}: "${childName}" is not a child in this class`); continue; }
      if(!validDomains.includes(domain.toLowerCase())){ skipped.push(`Row ${rowNum}: "${domain}" is not a recognised domain`); continue; }
      if(!['E','P','A'].includes(tier)){ skipped.push(`Row ${rowNum}: "${tierRaw}" must be B, P, or A`); continue; }
      if(!targetStore[childName]) targetStore[childName] = {};
      targetStore[childName][domain.toLowerCase()] = tier;
      imported++;
    }
    if(imported > 0) targetSave();
    let html = `<div class="au-success">✓ Filled in ${imported} cell${imported === 1 ? '' : 's'} — saved.</div>`;
    if(skipped.length > 0){
      html += `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<ul style="margin:4px 0 0 18px;">${skipped.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`;
    }
    resultEl.innerHTML = html;
    if(afterImport === 'dashboard') renderAssessmentDashboard();
    else renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  // ---------- 10. CHILD RECORD ----------
  // Matches vStudent: a child picker, DSI/SRI/movement/attendance/
  // stuck-domain tiles, and a domain-by-domain table with an
  // observation note per domain.
  // childFeedbackEntries[studentName] = [{text, date}, ...] — newest first
  const childFeedbackEntries = {};
  (function loadChildFeedbackEntries(){
    try {
      const raw = localStorage.getItem('childFeedbackEntries');
      if(raw) Object.assign(childFeedbackEntries, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
  })();
  function saveChildFeedbackEntries(){
    try { localStorage.setItem('childFeedbackEntries', JSON.stringify(childFeedbackEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }
  function addChildFeedback(name){
    const input = document.getElementById('childFeedbackInput');
    const text = (input.value || '').trim();
    if(!text){ input.focus(); return; }
    if(!childFeedbackEntries[name]) childFeedbackEntries[name] = [];
    childFeedbackEntries[name].unshift({ text, date: todayDateKey() });
    saveChildFeedbackEntries();
    renderChildRecord(name);
  }
  function deleteChildFeedback(name, idx){
    if(!confirm('Delete this feedback note? This can\'t be undone.')) return;
    childFeedbackEntries[name].splice(idx, 1);
    saveChildFeedbackEntries();
    renderChildRecord(name);
  }
  function renderChildFeedbackSection(container, name){
    const entries = childFeedbackEntries[name] || [];
    container.appendChild(mdSec('Teacher\u2019s Feedback', '<span class="reqs">FDB-01</span>'));
    const formCard = document.createElement('div');
    formCard.className = 'card'; formCard.style.padding = '16px'; formCard.style.marginBottom = '14px';
    formCard.innerHTML = `<textarea id="childFeedbackInput" rows="3" placeholder="Write feedback about ${esc(name)}'s progress\u2026" style="width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;"></textarea>
      <button onclick="addChildFeedback('${esc(name)}')" style="margin-top:8px; padding:8px 18px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Add feedback</button>`;
    container.appendChild(formCard);
    if(entries.length){
      const listWrap = document.createElement('div');
      listWrap.innerHTML = entries.map((e, i) => `<div class="card" style="padding:12px 16px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
          <p style="margin:0; flex:1; white-space:pre-wrap;">${esc(e.text)}</p>
          <button onclick="deleteChildFeedback('${esc(name)}',${i})" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:13px; padding:0;" title="Delete">✕</button>
        </div>
        <p class="cap" style="margin:6px 0 0;">${esc(e.date)}</p>
      </div>`).join('');
      container.appendChild(listWrap);
    } else {
      const empty = document.createElement('p');
      empty.className = 'cap'; empty.style.marginBottom = '16px';
      empty.textContent = 'No feedback recorded yet for ' + name.split(' ')[0] + '.';
      container.appendChild(empty);
    }
  }

  function renderChildRecord(selectedName){
    renderChildRecordReal(selectedName); // part 14 — real data only
  }

  // preTestAssessmentEntries[studentName][activityIndexAsString] = 'B'|'P'|'A'
  const preTestAssessmentEntries = {};
  (function loadPreTestAssessmentEntries(){
    try {
      const raw = localStorage.getItem('preTestAssessmentEntries');
      if(raw){
        Object.assign(preTestAssessmentEntries, JSON.parse(raw));
        // Migrate the legacy internal Beginner code to the user-facing BPA code.
        Object.keys(preTestAssessmentEntries).forEach(name => {
          Object.keys(preTestAssessmentEntries[name] || {}).forEach(k => {
            if(preTestAssessmentEntries[name][k] === 'E') preTestAssessmentEntries[name][k] = 'B';
          });
        });
      }
    } catch(e){ /* malformed or unavailable — start empty */ }
  })();
  function savePreTestAssessmentEntries(){
    try { localStorage.setItem('preTestAssessmentEntries', JSON.stringify(preTestAssessmentEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }
  function setPreTestTier(name, activityIdx, tier){
    if(!preTestAssessmentEntries[name]) preTestAssessmentEntries[name] = {};
    const key = String(activityIdx);
    if(preTestAssessmentEntries[name][key] === tier) delete preTestAssessmentEntries[name][key];
    else preTestAssessmentEntries[name][key] = tier;
    savePreTestAssessmentEntries();
    renderChildRecord(name);
  }

  function clearPreTestAssessment(name){
    if(!confirm('Clear ' + name + '\u2019s Pre-Test Assessment? All 26 activities for this child will be reset — it can\u2019t be undone.')) return;
    preTestAssessmentEntries[name] = {};
    savePreTestAssessmentEntries();
    renderChildRecord(name);
  }

  function renderPreTestAssessmentSection(container, name){
    const record = preTestAssessmentEntries[name] || {};
    let assessed = 0, se = 0, sp = 0, sa = 0;
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const v = record[String(idx)];
      if(v === 'B') se++; else if(v === 'P') sp++; else if(v === 'A') sa++;
      if(v) assessed++;
    });
    const totalScore = sa*3 + sp*2 + se*1;
    const maxPossible = assessed * 3;
    const pctAchievement = maxPossible ? Math.round(totalScore / maxPossible * 100) : 0;
    const band = !assessed ? mdPill('Not recorded', 'neu') : pctAchievement >= 85 ? mdPill('Advanced', 'good') : pctAchievement >= 60 ? mdPill('Proficient', 'warn') : mdPill('Beginner', 'crit');

    container.appendChild(mdSec('Pre-Test Assessment', '<span class="reqs">ASM-PT1…3</span>'));
    const ptNote = document.createElement('p');
    ptNote.className = 'cap'; ptNote.style.margin = '4px 0 14px';
    ptNote.textContent = 'The baseline worksheet done once, before teaching starts — same 26 activities as Weekly Assessment, recorded once for this child rather than every week.';
    container.appendChild(ptNote);

    if(assessed > 0){
      const resetRow = document.createElement('div'); resetRow.style.cssText = 'margin:0 0 14px;';
      const resetBtn = document.createElement('button');
      resetBtn.textContent = '↺ Enter manually — clear all and start fresh';
      resetBtn.style.cssText = 'padding:7px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:12.5px; font-weight:600;';
      resetBtn.onclick = () => clearPreTestAssessment(name);
      resetRow.appendChild(resetBtn);
      container.appendChild(resetRow);
    }

    container.appendChild(mdGrid('g4', [
      mdTile('Activities recorded', assessed, 'of ' + WEEKLY_ASSESSMENT_ACTIVITIES.length, mdPill(assessed === WEEKLY_ASSESSMENT_ACTIVITIES.length ? 'Complete' : 'In progress', assessed === WEEKLY_ASSESSMENT_ACTIVITIES.length ? 'good' : 'warn'), 'ASM-PT1'),
      mdTile('Total score', totalScore, 'of ' + maxPossible, mdPill(mdStatusBand(pctAchievement).l, mdStatusBand(pctAchievement).c), 'ASM-PT2'),
      mdTile('% Achievement', assessed ? pctAchievement : '—', assessed ? '' : 'not recorded', band, 'ASM-PT3'),
      mdTile('Overall band', assessed ? (sa >= sp && sa >= se ? 'Advanced' : sp >= se ? 'Proficient' : 'Beginner') : '—', 'baseline', band, 'ASM-PT3')
    ]));

    const gradeGrid = document.createElement('div');
    gradeGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:8px;';
    const tierColors = { B: 'var(--danger,#c8433f)', P: '#EE8F35', A: 'var(--success)' };
    gradeGrid.innerHTML = WEEKLY_ASSESSMENT_ACTIVITIES.map((a, idx) => {
      const tier = record[String(idx)];
      const btns = ['B','P','A'].map(t => {
        const active = tier === t;
        const letter = t;
        return `<button onclick="setPreTestTier('${esc(name)}',${idx},'${t}')" title="${gradeLabel(t)}" style="${gradeBtnStyle(t, active, 28)} margin:0 auto;">${gradeBtnLabel(active, t)}</button>`;
      }).join('');
      return `<div style="border:1px solid var(--border); border-radius:8px; padding:8px; background:var(--card);">
        <div style="font-size:11px; font-weight:600; margin-bottom:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(a.activity)}">${idx + 1}. ${esc(a.activity)}</div>
        <div class="cap" style="font-size:10px; margin-bottom:6px;">${esc(a.type)} · ${esc(a.cg)}</div>
        <div style="display:flex; gap:4px;">${btns}</div>
        <div style="font-size:9.5px; margin-top:5px; color:var(--success); font-weight:600; visibility:${tier ? 'visible' : 'hidden'};">✓ Saved</div>
      </div>`;
    }).join('');
    container.appendChild(mdCard(null, 'Tapping a rating saves it immediately for ' + esc(name).split(' ')[0] + ' — the "✓ Saved" mark confirms each one.', gradeGrid));
  }

function sampleTeacherProfile(){
  // Use the real teacher name already loaded into the top-right
  // profile by session_check.php. Keep the remaining profile
  // fields unchanged for now because they are still sample data.
  const loggedInTeacherName =
    document.querySelector('.user-name')?.textContent?.trim() ||
    'Teacher';

  return {
    name: loggedInTeacherName,
    qualification: 'D.El.Ed (Diploma in Elementary Education)',
    dob: '14-03-1991',
    age: 35,
    gender: 'Female',
    maritalStatus: 'Married',
    contactNormal: '98' + String(23456780),
    contactEmergency: '98' + String(76543210),
    experience: '6 years',
    languages: ['Hindi', 'Marathi', 'English'],
    address: 'Room 12, Kamgar Vasahat, Sion, Mumbai 400022',
    training: [
      { name: 'Classroom management basics', date: 'Apr 2026', cert: true },
      { name: 'Using the Jadui Pitara kit', date: 'Jun 2026', cert: true },
      { name: 'Parent engagement techniques', date: 'Jul 2026', cert: false }
    ]
  };
}
  function renderTeacherProfile(){
    const container = document.getElementById('teacherprofile-body');
    container.innerHTML = '';
    renderTeacherFilterBar(container, renderTeacherProfile);
    const p = sampleTeacherProfile();

    container.appendChild(mdSec('Teacher Profile', '<span class="reqs">STF-01…08</span>'));
    const context = document.createElement('p');
    context.className = 'cap';
    context.style.margin = '4px 0 16px';
    context.innerHTML = `${esc(p.name)} · ${esc(myClassInfo.school_name)} · ${esc(myClassInfo.class_name)} — school and class are real (from this login); the details below are sample data.`;
    container.appendChild(context);

    const g = document.createElement('div'); g.className = 'g g2';

    const basicsBody = document.createElement('dl'); basicsBody.className = 'kv';
    basicsBody.innerHTML = `
      <dt>Qualification</dt><dd>${esc(p.qualification)}</dd>
      <dt>Date of birth</dt><dd>${esc(p.dob)} (${p.age} years)</dd>
      <dt>Gender</dt><dd>${esc(p.gender)}</dd>
      <dt>Marital status</dt><dd>${esc(p.maritalStatus)}</dd>
      <dt>Experience</dt><dd>${esc(p.experience)}</dd>
      <dt>Languages spoken</dt><dd>${esc(p.languages.join(', '))}</dd>`;
    g.appendChild(mdCard('Basics', 'STF-01…04', basicsBody));

    const contactBody = document.createElement('dl'); contactBody.className = 'kv';
    contactBody.innerHTML = `
      <dt>Contact number (normal)</dt><dd>${esc(p.contactNormal)}</dd>
      <dt>Contact number (emergency)</dt><dd>${esc(p.contactEmergency)}</dd>
      <dt>Address</dt><dd>${esc(p.address)}</dd>`;
    g.appendChild(mdCard('Contact', 'STF-05', contactBody));

    container.appendChild(g);

    container.appendChild(mdSec('Activities / workshops done till date', '<span class="reqs">STF-06 · training certifications</span>'));
    const trainingList = document.createElement('div'); trainingList.className = 'list';
    trainingList.innerHTML = p.training.map(t => `<div class="row"><div class="t"><b>${esc(t.name)}</b><span>${esc(t.date)}</span></div>
      <div>${t.cert ? mdPill('Certified', 'good') : mdPill('Attended, no certificate', 'warn')}</div></div>`).join('');
    container.appendChild(mdCard(null, null, trainingList));

    // --- Google Drive connection ---
    container.appendChild(mdSec('Google Drive', ''));
    const driveCard = document.createElement('div');
    driveCard.className = 'card'; driveCard.style.padding = '20px';
    driveCard.id = 'driveStatusCard';
    driveCard.innerHTML = '<p class="cap">Checking connection…</p>';
    container.appendChild(driveCard);
    checkDriveConnectionStatus();
  }

  // Shared helper — checks which of a list of Drive file IDs still
  // actually exist (not deleted/trashed on Drive's side). Returns null
  // if the check itself couldn't be performed (e.g. network error, or
  // Drive not connected) — callers must treat null as "don't prune
  // anything," never as "everything's deleted." A failed check is not
  // evidence of deletion.
  async function checkDriveFilesStillExist(fileIds){
    const ids = fileIds.filter(Boolean);
    if(!ids.length) return new Set();
    try{
      const res = await fetch('backend/drive/check_drive_files.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ file_ids: ids })
      });
      const data = await res.json();
      if(data.status !== 'success') return null;
      return new Set(data.existing);
    } catch(err){
      return null;
    }
  }

  async function checkDriveConnectionStatus(){
    const card = document.getElementById('driveStatusCard');
    if(!card) return;
    try{
      const res = await fetch('backend/drive/check_drive_status.php' + window.location.search);
      const data = await res.json();
      if(data.status !== 'success'){
        card.innerHTML = `<p class="cap" style="color:var(--danger, #c8433f);">${esc(data.message || 'Could not check Drive status.')}</p>`;
        return;
      }
      if(data.connected){
        card.innerHTML = `<p style="margin:0 0 4px; color:var(--success); font-weight:600;">✓ Connected</p>
          <p class="cap" style="margin:0 0 12px;">Photo, video, audio and document evidence uploads go straight to your Drive, organized into folders automatically.</p>
          <a href="backend/google_oauth_start.php${window.location.search}" style="display:inline-block; padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; color:var(--text); font-size:13px; font-weight:600; text-decoration:none;">Reconnect / switch account</a>`;
      } else {
        card.innerHTML = `<p style="margin:0 0 4px; color:var(--text-muted); font-weight:600;">Not connected</p>
          <p class="cap" style="margin:0 0 12px;">Connect your Google Drive so evidence you upload (photos, videos, documents) saves there automatically instead of failing.</p>
          <a href="backend/google_oauth_start.php${window.location.search}" style="display:inline-block; padding:9px 18px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:13px; font-weight:600; text-decoration:none;">Connect Google Drive</a>`;
      }
    } catch(err){
      card.innerHTML = '<p class="cap" style="color:var(--danger, #c8433f);">Could not reach the server.</p>';
    }
  }

  // ---------- 11. TRANSITION ----------
  // Matches vTransition: Jr KG → Sr KG promotion tiles + outcome
  // table, plus a Sr KG → Grade 1 readiness section.
  function isFlaggedForFollowUp(completion, domainsEmergingCount, attendance){
    return completion < 70 || domainsEmergingCount >= 3 || attendance < 80;
  }

  let transitionTargetEl = null; // remembers where to re-render (embedded tab vs standalone section)


/* ===== teacher-part-13.js ===== */
/* =========================================================================
   teacher-part-13.js — part 13 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   This last part also starts the page: it runs the login check.
   ========================================================================= */
  function renderTransition(targetEl){
    transitionTargetEl = targetEl || null;
    const container = targetEl || document.getElementById('transition-body');
    container.innerHTML = '';
    container.appendChild(mdSec('Transition — Jr KG to Sr KG', '<span class="reqs">BAL-09…12 · DAT-52</span>'));
    container.appendChild(attNote('No data available. Transition (who moves on to Sr KG, readiness, and tracing children who left) is not recorded in the portal yet, so nothing is shown here rather than an estimate.'));
  }

  // Toggles which chart is visible inside the Transition report's
  // "Charts & analysis" panel. Deliberately shows one at a time —
  // the dropdown IS the chart switcher, not a filter alongside them.
  function switchTransitionChart(which){
    document.querySelectorAll('.tc-chart').forEach(el => {
      el.classList.toggle('hidden', el.id !== 'tcChart-' + which);
    });
  }

  // Expand/collapse a sidebar parent's child tabs — e.g. clicking
  // "Attendance" toggles its two sub-tabs (Class Attendance /
  // Attendance Records) open or closed, chevron rotates to match.
  // Defaults open (see CSS — no .collapsed class on load).
  function toggleSidebarParent(childrenId){
    const wrap = document.getElementById(childrenId + '-wrap');
    const chevron = document.getElementById('chevron-' + childrenId);
    if(!wrap) return;
    wrap.classList.toggle('collapsed');
    if(chevron) chevron.classList.toggle('collapsed');
  }

function renderPreviewBanner(isPreviewing){
  const el = document.getElementById('preview-banner');
  if(!el) return;
  el.innerHTML = isPreviewing ? `
    <div class="preview-banner">
      <span>👁️ Previewing as this role</span>
      <button onclick="returnToSuperAdmin()">Return to Super Admin</button>
    </div>` : '';
}

function returnToSuperAdmin(){
  fetch('backend/auth/return_to_admin.php', { method: 'POST' })
    .then(r => r.json())
    .then(data => {
      if(data.status === 'success') window.location.href = 'superadmin.html';
    })
    .catch(() => {});
}

fetch('backend/auth/session_check.php' + window.location.search)
  .then(r => r.json())
  .then(data => {
    if(data.status !== 'logged_in' || data.role !== 'teacher'){
      window.location.href = 'index.html';
      return;
    }
    enterTeacherFlow();
    renderPreviewBanner(data.is_previewing);
    applyRealTeacherName(data.name, data.email); // the real name + email in the topbar, and the heading
    updateTopbarSchoolLine(); // fallback shown immediately
    loadMyClassInfo(); // then replaced with the real school/class for this login, once it resolves

    // Coming from Textbooks' sidebar (e.g. teacher.html?section=materials) —
    // jump straight to that section, but only if the dashboard itself is
    // actually showing (enterTeacherFlow sometimes shows the attendance
    // gate screen instead, which has no sidebar to switch within).
    const params = new URLSearchParams(window.location.search);
    const requestedSection = params.get('section');
    if(requestedSection && !document.getElementById('view-dashboard').classList.contains('hidden')){
      switchSidebarSection(requestedSection);
    }
  })
  .catch(() => { window.location.href = 'index.html'; });

  // =================================================================
  // CLASS ATTENDANCE → 📊 REPORTS — one proper report per month of the
  // school year (June → April), plus a whole-year view. Built only from
  // the attendance actually marked — a month with nothing marked says so.
  //   Each month: summary tiles · every child's present / absent / % and
  //   whether they need a follow-up · the full day-by-day register ·
  //   download at the end.
  // =================================================================
  function attNote(text){ const c = document.createElement('div'); c.className = 'card'; c.style.padding = '16px 18px'; const p = document.createElement('p'); p.style.margin = '0'; p.textContent = text; c.appendChild(p); return c; }
  var attReportMonth = null; // { y, m } or 'year'
  function attAcademicMonths(){
    const now = new Date();
    const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    const months = [];
    for(let i = 0; i < 11; i++){ // June … April
      const d = new Date(startYear, 5 + i, 1);
      if(d > now) break;
      months.push({ y: d.getFullYear(), m: d.getMonth() });
    }
    return months;
  }
  function attMonthLabel(o, long){ return new Date(o.y, o.m, 1).toLocaleDateString([], long ? { month: 'long', year: 'numeric' } : { month: 'short' }); }
  function attDateKey(y, m, d){ return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }

  // Everything one month's report needs, from real marks only.
  function attMonthStats(y, m){
    const today = todayDateKey();
    const days = new Date(y, m + 1, 0).getDate();
    const schoolDays = [], holidays = [];
    for(let d = 1; d <= days; d++){
      const dow = new Date(y, m, d).getDay();
      if(dow === 0 || dow === 6) continue;
      const key = attDateKey(y, m, d);
      if(key > today) continue;
      const hol = complianceHolidayName(y, m, d) || studentHolidays[key];
      if(hol){ holidays.push({ date: key, name: hol }); continue; }
      schoolDays.push(key);
    }
    const markedDays = schoolDays.filter(k => attendanceRecords[k] && Object.keys(attendanceRecords[k]).length);
    const children = (Array.isArray(realPupilsCache) ? realPupilsCache : []).map((p, i) => {
      let present = 0, absent = 0, run = 0, longest = 0;
      schoolDays.forEach(k => {
        if(p.admitted_date && k < p.admitted_date) return; // not yet on the roll that day
        const v = (attendanceRecords[k] || {})[p.id];
        if(v === 'present' || v === 'late'){ present++; run = 0; }
        else if(v === 'absent'){ absent++; run++; if(run > longest) longest = run; }
      });
      const marked = present + absent;
      return { id: p.id, roll: i + 1, register_no: p.register_no || '', name: p.name, present, absent, marked,
        pct: marked ? Math.round(present / marked * 1000) / 10 : null, longest };
    });
    const withMarks = children.filter(c => c.marked);
    const totP = withMarks.reduce((a, c) => a + c.present, 0), totM = withMarks.reduce((a, c) => a + c.marked, 0);
    return {
      y, m, schoolDays, holidays, markedDays, children,
      classPct: totM ? Math.round(totP / totM * 1000) / 10 : null,
      below70: withMarks.filter(c => c.marked >= 4 && c.pct < 70),
      streak3: withMarks.filter(c => c.longest >= 3),
      perfect: withMarks.filter(c => c.absent === 0 && c.marked >= 4)
    };
  }

  function attEnsureMonths(list, onDone){
    const missing = list.filter(o => attendanceMonthStatus[o.y + '-' + o.m] === undefined);
    if(!missing.length) return true;
    Promise.all(missing.map(o => fetchAttendanceMonth(o.y, o.m))).then(() => {
      if(onDone) onDone();
      else if(classAttendanceTab === 'reports') renderAttendanceReports();
    });
    return false;
  }

  function renderAttendanceReports(){
    let host = document.getElementById('attendancereports-body');
    const section = document.getElementById('classattendance-body');
    if(!host){ host = document.createElement('div'); host.id = 'attendancereports-body'; }
    if(host.parentElement !== section) section.appendChild(host);
    host.innerHTML = '';
    if(!ensurePupilsLoadedFor(host, renderAttendanceReports)) return;

    const months = attAcademicMonths();
    if(!attReportMonth) attReportMonth = months[months.length - 1] || { y: new Date().getFullYear(), m: new Date().getMonth() };

    host.appendChild(mdSec('Attendance reports', '<span class="reqs">REG-01…07</span>'));
    const chips = document.createElement('div');
    chips.setAttribute('data-no-export', '1');
    chips.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin:0 0 16px;';
    const chip = (label, active, onClick) => { const b = document.createElement('button'); b.textContent = label; b.onclick = onClick;
      b.style.cssText = `padding:6px 14px; border-radius:99px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:12.5px; font-weight:600; cursor:pointer;`;
      chips.appendChild(b); };
    months.forEach(o => chip(attMonthLabel(o), attReportMonth !== 'year' && attReportMonth.y === o.y && attReportMonth.m === o.m, () => { attReportMonth = o; renderAttendanceReports(); }));
    chip('Whole year', attReportMonth === 'year', () => { attReportMonth = 'year'; renderAttendanceReports(); });
    host.appendChild(chips);

    const need = attReportMonth === 'year' ? months : [attReportMonth];
    if(!attEnsureMonths(need)){ host.appendChild(attNote('Loading the attendance marked for ' + (attReportMonth === 'year' ? 'the whole year' : attMonthLabel(attReportMonth, true)) + '…')); return; }
    const failed = need.find(o => String(attendanceMonthStatus[o.y + '-' + o.m] || '').startsWith('error:'));
    if(failed){
      const card = attNote('Could not load ' + attMonthLabel(failed, true) + ': ' + String(attendanceMonthStatus[failed.y + '-' + failed.m]).slice(6));
      const retry = document.createElement('button'); retry.className = 'btn'; retry.textContent = 'Try again'; retry.style.marginTop = '8px';
      retry.onclick = () => { need.forEach(o => { if(String(attendanceMonthStatus[o.y + '-' + o.m]).startsWith('error:')) delete attendanceMonthStatus[o.y + '-' + o.m]; }); renderAttendanceReports(); };
      card.appendChild(retry); host.appendChild(card); return;
    }

    const report = document.createElement('div');
    host.appendChild(report);
    const pctText = v => v === null ? '—' : v + '%';
    const band = v => v === null ? mdPill('No marks', 'neu') : v >= 85 ? mdPill('Good', 'good') : v >= 70 ? mdPill('Watch', 'warn') : mdPill('Below 70%', 'crit');

    if(attReportMonth === 'year'){
      const all = months.map(o => attMonthStats(o.y, o.m));
      report.appendChild(mdSec('Whole year — ' + attMonthLabel(months[0] || { y: new Date().getFullYear(), m: 5 }, true) + ' to ' + attMonthLabel(months[months.length - 1] || months[0], true), ''));
      let t = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Month</th><th>School days so far</th><th>Days marked</th><th>Holidays</th><th>Class attendance</th><th>Below 70%</th><th>3+ days absent in a row</th></tr></thead><tbody>';
      all.forEach(s => {
        t += `<tr><td style="text-align:left;"><b>${esc(attMonthLabel(s, true))}</b></td><td>${s.schoolDays.length}</td><td>${s.markedDays.length}</td><td>${s.holidays.length}</td>`
          + `<td>${s.markedDays.length ? pctText(s.classPct) : '<span class="dim">Not marked</span>'}</td><td>${s.markedDays.length ? s.below70.length : '—'}</td><td>${s.markedDays.length ? s.streak3.length : '—'}</td></tr>`;
      });
      t += '</tbody></table></div>';
      const w1 = document.createElement('div'); w1.innerHTML = t;
      report.appendChild(mdCard('Month by month', 'Class attendance = present marks ÷ all marks in the month. Months with nothing marked are shown as "Not marked" — never estimated.', w1));

      // Each child across the whole year
      const byChild = {};
      all.forEach(s => s.children.forEach(c => { const b = byChild[c.id] || (byChild[c.id] = { roll: c.roll, register_no: c.register_no, name: c.name, present: 0, absent: 0 }); b.present += c.present; b.absent += c.absent; }));
      let t2 = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Roll</th><th>Reg. no.</th><th style="text-align:left;">Child</th><th>Present</th><th>Absent</th><th>Attendance</th><th style="text-align:left;">Status</th></tr></thead><tbody>';
      Object.values(byChild).sort((a, b) => a.roll - b.roll).forEach(c => {
        const marked = c.present + c.absent, pct = marked ? Math.round(c.present / marked * 1000) / 10 : null;
        const status = band(pct);
        t2 += `<tr><td>${c.roll}</td><td>${esc(c.register_no) || '—'}</td><td style="text-align:left;"><b>${esc(c.name)}</b></td><td>${c.present}</td><td>${c.absent}</td><td>${pctText(pct)}</td><td style="text-align:left;">${status}</td></tr>`;
      });
      t2 += '</tbody></table></div>';
      const w2 = document.createElement('div'); w2.innerHTML = t2;
      report.appendChild(mdCard('Every child — whole year', null, w2));
      host.appendChild(attDownloadCard('Download — whole year', [{ label: '⬇ Whole-year report (PDF)', primary: true, run: () => exportReportPdf(report, 'Attendance — whole year — ' + (myClassInfo.class_name || ''), 'attendance-year') }]));
      return;
    }

    const s = attMonthStats(attReportMonth.y, attReportMonth.m);
    const title = attMonthLabel(s, true);
    report.appendChild(mdSec('Attendance report — ' + title, ''));
    if(!s.markedDays.length){
      report.appendChild(attNote('No attendance has been marked for ' + title + ' yet. Mark it in ✓ Mark Attendance, or bring it in with 📥 Import attendance from any file.'));
      return;
    }
    const grid = document.createElement('div'); grid.className = 'g g4';
    grid.appendChild(mdTile('Class attendance', s.classPct === null ? '—' : s.classPct, s.classPct === null ? 'no marks' : '% of all marks', band(s.classPct), 'REG-05'));
    grid.appendChild(mdTile('Days marked', s.markedDays.length, 'of ' + s.schoolDays.length + ' school days so far', s.markedDays.length === s.schoolDays.length ? mdPill('Complete', 'good') : mdPill((s.schoolDays.length - s.markedDays.length) + ' not marked', 'warn'), 'REG-02'));
    grid.appendChild(mdTile('Below 70%', s.below70.length, 'children (4+ days marked)', s.below70.length ? mdPill('Follow up', 'crit') : mdPill('None', 'good'), 'REG-06'));
    grid.appendChild(mdTile('Full attendance', s.perfect.length, 'children never absent', mdPill(s.perfect.length ? 'Well done' : '—', s.perfect.length ? 'good' : 'neu'), 'REG-05'));
    report.appendChild(grid);
    if(s.holidays.length){
      report.appendChild(mdCard('Holidays in ' + title, s.holidays.map(h => new Date(h.date + 'T00:00:00').toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' — ' + h.name).join(' · '), null));
    }

    let t = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Roll</th><th>Reg. no.</th><th style="text-align:left;">Child</th><th>Present</th><th>Absent</th><th>Days marked</th><th>Attendance</th><th style="text-align:left;">Needs a follow-up?</th><th style="text-align:left;">Parent</th></tr></thead><tbody>';
    s.children.forEach(c => {
      const notes = [];
      if(c.marked >= 4 && c.pct < 70) notes.push('Below 70%');
      if(c.longest >= 3) notes.push(c.longest + ' days absent in a row');
      t += `<tr><td>${c.roll}</td><td>${esc(c.register_no) || '—'}</td><td style="text-align:left;"><b>${esc(c.name)}</b></td><td>${c.present}</td><td>${c.absent}</td><td>${c.marked}</td><td>${pctText(c.pct)}</td>`
        + `<td style="text-align:left;">${notes.length ? '<span style="color:var(--crit,#d03b3b); font-weight:600;">' + notes.map(esc).join(' · ') + '</span>' : (c.marked ? 'No' : '<span class="dim">Not marked</span>')}</td><td style="text-align:left;">${notes.length ? attFbCell(c, c.longest >= 3 ? 'streak' : 'below70', title) : ''}</td></tr>`;
    });
    t += '</tbody></table></div>';
    const w = document.createElement('div'); w.innerHTML = t;
    report.appendChild(mdCard('Every child — ' + title, 'Attendance = present ÷ days marked for that child. A child admitted during the month is only counted from their admission date. Children who need a follow-up have a 💬 Feedback to parent button.', w));
    const fbPanel = document.createElement('div');
    fbPanel.id = 'attFbPanel'; fbPanel.className = 'card'; fbPanel.setAttribute('data-no-export', '1');
    fbPanel.style.cssText = 'padding:16px 18px; margin-top:16px; border:2px solid var(--primary);' + (attFb ? '' : ' display:none;');
    report.appendChild(fbPanel);
    if(attFb) setTimeout(renderAttFeedbackPanel, 0);
    if(typeof ensureAttendanceFollowupsLoaded === 'function') ensureAttendanceFollowupsLoaded(); // "Sent …" under the button

    // The full day-by-day register for this month (it has its own printable download).
    calendarYear = s.y; calendarMonth = s.m;
    const reg = document.createElement('div');
    host.appendChild(reg);
    renderAttendanceRegister(reg);
    // The register's own download bar is replaced by one download card for the month.
    const regBtn = reg.querySelector('[data-dl-end] button');
    const regDownload = regBtn && regBtn.onclick;
    reg.querySelectorAll('[data-dl-end]').forEach(el => el.remove());
    host.appendChild(attDownloadCard('Download — ' + title, [
      { label: '⬇ Monthly report — summary & every child (PDF)', primary: true, run: () => exportReportPdf(report, 'Attendance report — ' + title + ' — ' + (myClassInfo.class_name || ''), 'attendance-' + s.y + '-' + String(s.m + 1).padStart(2, '0')) },
      regDownload ? { label: '⬇ Day-by-day register (PDF)', run: regDownload } : null
    ]));
  }

  // =================================================================
  // MY CLASS — the families. One row per child with the parents' /
  // guardians' details from the REAL family profile (never a sample):
  // who they are, how to reach them, where they live. A child with no
  // profile yet says so, with a button to add it in Family & Parents.
  // (The weekly B/P/A grading that used to be here is now
  //  Assessment → 🧒 Weekly activities.)
  // =================================================================
  var myClassFamilySearch = '';
  function openFamilyProfileFor(name){
    selectedFamilyChildName = name;
    switchSidebarSection('familyparents');
  }
  function renderMyClassFamilies(){
    const container = document.getElementById('myclass-body');
    container.innerHTML = '';
    container.appendChild(renderTeachingTabBar('myclass'));
    if(!ensurePupilsLoadedFor(container, renderMyClass)) return;
    if(!familyRecordsLoaded){
      ensureFamilyRecordsLoaded(renderMyClass);
      container.appendChild(attNote('Loading the family profiles…'));
      return;
    }

    const kids = realPupilsCache;
    const rec = name => { const r = familyRecords[name]; return r && Array.isArray(r.guardianNames) && r.guardianNames.length ? r : null; };
    const phoneOf = g => (g && g.phone ? String(g.phone).trim() : '');
    const withProfile = kids.filter(p => rec(p.name));
    const reachable = kids.filter(p => { const r = rec(p.name); return r && r.guardianNames.some(g => phoneOf(g)); });
    const smart = kids.filter(p => { const r = rec(p.name); return r && r.guardianNames.some(g => g.smart); });

    container.appendChild(mdSec('My Class — the families', '<span class="reqs">FAM-01…04</span>'));
    const grid = document.createElement('div'); grid.className = 'g g4';
    grid.appendChild(mdTile('Children on roll', kids.length, 'in ' + (myClassInfo.class_name || 'this class'), mdPill('Register order', 'neu'), 'REG-14'));
    grid.appendChild(mdTile('Family profiles', withProfile.length, 'of ' + kids.length + ' filled in', withProfile.length === kids.length && kids.length ? mdPill('Complete', 'good') : mdPill((kids.length - withProfile.length) + ' missing', kids.length - withProfile.length ? 'warn' : 'good'), 'FAM-01'));
    grid.appendChild(mdTile('Reachable by phone', reachable.length, 'families with a number', reachable.length === kids.length && kids.length ? mdPill('All', 'good') : mdPill((kids.length - reachable.length) + ' without', 'warn'), 'FAM-02'));
    grid.appendChild(mdTile('Smartphone at home', smart.length, 'families (for messages / videos)', mdPill(withProfile.length ? Math.round(smart.length / withProfile.length * 100) + '% of profiles' : 'No profiles yet', 'neu'), 'FAM-03'));
    container.appendChild(grid);

    const tools = document.createElement('div');
    tools.setAttribute('data-no-export', '1');
    tools.style.cssText = 'display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:6px 0 12px;';
    tools.innerHTML = `<input id="myClassFamilySearch" type="text" placeholder="Search child or parent name…" value="${esc(myClassFamilySearch)}" style="flex:1; min-width:220px; padding:9px 12px; border:1px solid var(--border); border-radius:8px; font-size:13px;" />
      <button class="btn" onclick="switchSidebarSection('familyparents')">👪 Open Family &amp; Parents</button>`;
    container.appendChild(tools);

    const report = document.createElement('div');
    container.appendChild(report);
    const q = myClassFamilySearch.trim().toLowerCase();
    const shown = kids.map((p, i) => ({ p, i })).filter(({ p }) => {
      if(!q) return true;
      const r = rec(p.name);
      return p.name.toLowerCase().includes(q) || (r && r.guardianNames.some(g => String(g.name || '').toLowerCase().includes(q)));
    });
    const guardianCell = (g, occ) => g ? `<b>${esc(g.name || '—')}</b><div class="cap">${esc([g.rel, occ, g.edu].filter(Boolean).join(' · ')) || '—'}</div>` : '<span class="dim">—</span>';
    const phoneCell = g => { const ph = phoneOf(g); return ph ? `<a href="tel:${esc(ph.replace(/[^\d+]/g, ''))}" style="font-weight:600; white-space:nowrap;">📞 ${esc(ph)}</a>${g.smart ? '<div class="cap">Smartphone</div>' : ''}` : '<span class="dim">No number</span>'; };
    let t = '<div class="report-table-wrap"><table class="report-table" style="min-width:1000px;"><thead><tr><th>Roll</th><th>Reg. no.</th><th style="text-align:left;">Child</th>'
      + '<th style="text-align:left;">Parent / guardian</th><th style="text-align:left;">Phone</th><th style="text-align:left;">Second guardian</th><th style="text-align:left;">Phone</th>'
      + '<th style="text-align:left;">Area</th><th style="text-align:left;">Languages at home</th><th style="text-align:left;">Profile</th></tr></thead><tbody>';
    shown.forEach(({ p, i }) => {
      const r = rec(p.name);
      const safeName = esc(p.name).replace(/'/g, '&#39;');
      if(!r){
        t += `<tr><td>${i + 1}</td><td>${esc(p.register_no || '') || '—'}</td><td style="text-align:left;"><b>${esc(p.name)}</b></td>`
          + `<td colspan="6" style="text-align:left;" class="dim">No family profile yet</td>`
          + `<td style="text-align:left;"><button class="btn" data-no-export="1" style="padding:5px 10px; font-size:12px;" onclick="openFamilyProfileFor('${safeName}')">Add profile</button></td></tr>`;
        return;
      }
      const g1 = r.guardianNames.find(g => g.primary) || r.guardianNames[0];
      const g2 = r.guardianNames.find(g => g !== g1) || null;
      const occ = g => { const idx = r.guardianNames.indexOf(g); return idx >= 0 && Array.isArray(r.guardians) && r.guardians[idx] ? (r.guardians[idx].occ || '') : ''; };
      const complete = g1 && g1.name && phoneOf(g1);
      const langs = Array.isArray(r.langs) ? r.langs.join(', ') : (r.langs || r.motherTongue || '');
      t += `<tr><td>${i + 1}</td><td>${esc(p.register_no || '') || '—'}</td><td style="text-align:left;"><b>${esc(p.name)}</b></td>`
        + `<td style="text-align:left;">${guardianCell(g1, occ(g1))}</td><td style="text-align:left;">${phoneCell(g1)}</td>`
        + `<td style="text-align:left;">${guardianCell(g2, g2 ? occ(g2) : '')}</td><td style="text-align:left;">${g2 ? phoneCell(g2) : '<span class="dim">—</span>'}</td>`
        + `<td style="text-align:left;">${esc(r.locality || '') || '<span class="dim">—</span>'}</td><td style="text-align:left;">${esc(langs) || '<span class="dim">—</span>'}</td>`
        + `<td style="text-align:left;">${complete ? mdPill('Complete', 'good') : mdPill('Incomplete', 'warn')} <button class="btn" data-no-export="1" style="padding:4px 9px; font-size:11.5px; margin-left:4px;" onclick="openFamilyProfileFor('${safeName}')">Open</button></td></tr>`;
    });
    if(!shown.length) t += `<tr><td colspan="10" class="dim" style="text-align:left;">No child or parent matches "${esc(myClassFamilySearch)}".</td></tr>`;
    t += '</tbody></table></div>';
    const w = document.createElement('div'); w.innerHTML = t;
    report.appendChild(mdCard('Every family', 'From each child\u2019s family profile. Tap a number to call. Missing or incomplete profiles can be filled in from Family & Parents (one at a time, or import the Family Profile sheet).', w));

    const search = document.getElementById('myClassFamilySearch');
    search.oninput = () => { myClassFamilySearch = search.value; const pos = search.selectionStart; renderMyClassFamilies(); const s2 = document.getElementById('myClassFamilySearch'); s2.focus(); s2.setSelectionRange(pos, pos); };
    container.appendChild(reportDownloadBar(() => report, 'My Class — families — ' + (myClassInfo.class_name || ''), 'my-class-families', 'Every child with their parents\u2019 details, for this class only.'));
  }

  // Class-list preview (used by the one 📥 Import a file button when the
  // file is a list of children, and by the older children-import card).
  // rows[0] is the header row. Nothing is saved until Confirm.
  function previewClassPupilImportRows(rows, resultEl, removeMissing){
    pendingPupilSync = null;
    if(!Array.isArray(realPupilsCache)){ resultEl.innerHTML = '<div class="au-error">Still loading the roll — try again in a moment.</div>'; return; }
    if(!rows || !rows.length){ resultEl.innerHTML = '<div class="au-error">The file is empty.</div>'; return; }
    const header = rows[0].map(h => h.trim().toLowerCase().replace(/[\s_]+/g, ' '));
    const col = n => header.findIndex(h => h === n);
    let nameCol = [col('name'), col('student name'), col('child name'), col('child')].find(i => i >= 0);
    if(nameCol === undefined && typeof SI_NAME_WORDS !== 'undefined'){ const k = header.findIndex(h => SI_NAME_WORDS.includes(h)); if(k >= 0) nameCol = k; }
    if(nameCol === undefined){ resultEl.innerHTML = '<div class="au-error">The first row must be a header with a "name" column (e.g. name,admitted date,dob,gender).</div>'; return; }
    const admCol = [col('admitted date'), col('admission date'), col('date of admission')].find(i => i >= 0);
    const dobCol = [col('dob'), col('date of birth')].find(i => i >= 0);
    const genderCol = col('gender');
    const regCol = pickRegisterColumn(rows[0], rows.slice(1), [nameCol]);

    const onRoll = {};
    realPupilsCache.forEach(p => { onRoll[normPupilName(p.name)] = p; });
    const seen = new Set(), add = [], keep = [], problems = [], regUpdates = [];
    for(let i = 1; i < rows.length; i++){
      const r = rows[i];
      const split = splitRegisterFromName(r[nameCol]);
      const name = split.name;
      if(!name) continue;
      if(siNotAChild(name)){ problems.push(`Row ${i + 1}: "${name}" is not a child's name (crossed out / a note) — skipped.`); continue; }
      const regFromCol = regCol >= 0 ? String(r[regCol] || '').trim().replace(/\.0+$/, '') : '';
      const register_no = /^\d{1,6}$/.test(regFromCol) ? regFromCol : split.register_no;
      const key = normPupilName(name);
      if(seen.has(key)){ problems.push(`Row ${i + 1}: "${name}" appears twice in the file — added once.`); continue; }
      seen.add(key);
      if(onRoll[key]){
        keep.push(onRoll[key].name);
        if(register_no && String(onRoll[key].register_no || '') !== register_no) regUpdates.push({ id: onRoll[key].id, name: onRoll[key].name, register_no });
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
    const remove = removeMissing ? realPupilsCache.filter(p => !seen.has(normPupilName(p.name))).map(p => ({ id: p.id, name: p.name })) : [];

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

  // Turns one sheet into plain text rows for the class-list preview,
  // starting at the header row (the first row with a name heading).
  function siClassListRows(grid){
    const toText = v => v instanceof Date ? siYmd(v) : String(v == null ? '' : v).trim();
    for(let r = 0; r < Math.min(grid.length, 40); r++){
      const row = grid[r] || [];
      const norm = row.map(v => siNorm(v));
      if(norm.some(h => SI_NAME_WORDS.includes(h))){
        const out = grid.slice(r).map(x => (x || []).map(toText));
        const nameIdx = norm.findIndex(h => SI_NAME_WORDS.includes(h));
        const names = out.slice(1).filter(x => (x[nameIdx] || '').trim()).length;
        return names ? { rows: out, names } : null;
      }
    }
    return null;
  }

  // Step shown when the file is a CLASS LIST (names, no attendance marks).
  function renderSmartClassListStep(fileName, rows){
    const out = siPanel();
    smartImport = { fileName, classList: rows };
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 4px; font-weight:600;">“${esc(fileName)}” is a class list — it has children's names but no attendance marks.</p>
      <p class="cap" style="margin:0 0 10px;">So I'll update ${esc(myClassInfo.class_name || 'this class')}'s roll: add new children, save register numbers, and leave children already on the roll as they are. Nothing is saved until you confirm.</p>
      <label style="display:flex; align-items:flex-start; gap:8px; font-size:13px; margin:4px 0 10px;">
        <input type="checkbox" id="classPupilRemoveMissing" style="margin-top:3px;" onchange="previewClassPupilImportRows(smartImport.classList, document.getElementById('classPupilImportResult'), this.checked)" />
        <span>This file is the <b>complete</b> class list — take children who are not in it off the roll (their past records are kept).</span>
      </label>
      <div id="classPupilImportResult" style="word-break:break-word; overflow-wrap:anywhere;"></div>
    </div>`;
    previewClassPupilImportRows(rows, document.getElementById('classPupilImportResult'), false);
  }

  // ---- Moved from part 10 (Pre-Test class PDF) ----
  function downloadPreTestClassPdf(){
    ensurePreTestTallyForClass();
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Pre-Test — class baseline', 14, 15);
    doc.setFontSize(9);
    doc.text(assessmentPdfHeaderLine() + ' · generated ' + new Date().toLocaleDateString(), 14, 21);

    doc.autoTable({
      startY: 26,
      head: [['#', 'Type', 'Activity', 'CG', 'B Beginner', 'P Proficient', 'A Advanced', 'Avg', '% Advanced']],
      body: WEEKLY_ASSESSMENT_ACTIVITIES.map((a, idx) => {
        const t = preTestTallyEntries[String(idx)] || { count_e: 0, count_p: 0, count_a: 0 };
        const marked = t.count_e + t.count_p + t.count_a;
        const rowAvg = marked ? Math.round((t.count_a*3 + t.count_p*2 + t.count_e*1) / marked * 100) / 100 : 0;
        const rowPctA = marked ? Math.round(t.count_a / marked * 100) : 0;
        return [idx + 1, a.type, a.activity, a.cg, t.count_e, t.count_p, t.count_a, rowAvg, marked ? rowPctA + '%' : '—'];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });

    const secondTableY = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : 26) + 10;
    doc.setFontSize(12);
    doc.text('Per-student summary', 14, secondTableY);
    doc.autoTable({
      startY: secondTableY + 4,
      head: [['Child', 'Activities assessed', 'B Beginner', 'P Proficient', 'A Advanced', 'Total score', 'Max possible', '% Achievement', 'Band']],
      body: assessmentPupilNames().map(name => {
        let se = 0, sp = 0, sa = 0, assessed = 0;
        WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
          const v = preTestAssessmentEntries[name] && preTestAssessmentEntries[name][String(idx)];
          if(v === 'B') se++; else if(v === 'P') sp++; else if(v === 'A') sa++;
          if(v) assessed++;
        });
        const totalScore = sa*3 + sp*2 + se*1;
        const maxPossible = assessed * 3;
        const pctAchievement = maxPossible ? Math.round(totalScore / maxPossible * 100) : 0;
        const band = !assessed ? 'Not started' : pctAchievement >= 85 ? 'Advanced' : pctAchievement >= 60 ? 'Proficient' : 'Beginner';
        return [name, assessed + '/' + WEEKLY_ASSESSMENT_ACTIVITIES.length, se, sp, sa, totalScore, maxPossible, assessed ? pctAchievement + '%' : '—', band];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });

    doc.save('pre-test-' + todayKey() + '.pdf');
  }

  // ---- Moved from part 14 (download sheets for the import cards) ----
  // ---- ⬇ Download sheet: this month's register, ready to fill in and import ----
  function downloadAttendanceSheetTemplate(){
    if(typeof XLSX === 'undefined'){ alert('.xlsx support did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const y = calendarYear, m = calendarMonth, days = new Date(y, m + 1, 0).getDate();
    const dates = []; for(let d = 1; d <= days; d++){ const dow = new Date(y, m, d).getDay(); if(dow !== 0) dates.push(d); }
    const header = ['Register No', 'Student Name', ...dates];
    const rows = (Array.isArray(realPupilsCache) ? realPupilsCache : []).map(p => [p.register_no || '', p.name, ...dates.map(d => {
      const v = (attendanceRecords[y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')] || {})[p.id];
      return v === 'present' || v === 'late' ? 'P' : v === 'absent' ? 'A' : '';
    })]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [{ wch: 12 }, { wch: 26 }, ...dates.map(() => ({ wch: 4 }))];
    const wb = XLSX.utils.book_new();
    const sheetName = new Date(y, m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, 'attendance-' + sheetName.replace(/\s+/g, '-').toLowerCase() + '-' + (myClassInfo.class_name || 'class').replace(/\s+/g, '') + '.xlsx');
  }

  // ---- ⬇ Download sheet for an assessment, in the layout the import reads ----
  function assessDownloadSheet(type){
    if(typeof XLSX === 'undefined'){ alert('.xlsx support did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    if(type === 'motor'){ downloadMotorImportTemplate(); return; }
    const kids = Array.isArray(realPupilsCache) ? realPupilsCache : [];
    let aoa, name;
    const letter = v => v === 'E' ? 'B' : (v === 'P' || v === 'A') ? v : ''; // the sheet uses B/P/A, like the screen
    if(type === 'observation'){
      const themes = observationThemesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth] || [];
      const items = themes.flatMap(t => t.items.map(it => ({ t, it })));
      const marks = observationAssessmentCache[currentWorkbookMonth] || {};
      aoa = [['Register No', 'Student Name', ...items.map(x => x.it.cg_code + ' ' + x.t.name)], ...kids.map(p => [p.register_no || '', p.name, ...items.map(x => letter((marks[p.id] || {})[x.it.id]))])]; // CG + theme, so a CG under two themes imports back to the right column
      name = 'observation-' + currentWorkbookMonth;
    } else if(type === 'workbook'){
      const books = workbookCompetenciesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth] || [];
      const book = books.find(b => b.name === currentWorkbookCompetencyBookName) || books[0];
      const tally = workbookCompetencyTallyCache[currentWorkbookMonth] || {};
      aoa = [['cg_code', 'competency', 'count_b', 'count_p', 'count_a'], ...(book ? book.competencies : []).map(c => { const t = tally[c.id] || {}; return [c.cg_code, c.competency_text || '', t.count_e || '', t.count_p || '', t.count_a || '']; })];
      name = 'workbook-' + currentWorkbookMonth;
    } else {
      ensurePreTestTallyForClass();
      aoa = [['activity_no', 'activity', 'count_b', 'count_p', 'count_a'], ...WEEKLY_ASSESSMENT_ACTIVITIES.map((a, i) => { const t = preTestTallyEntries[String(i)] || {}; return [i + 1, a.activity, t.count_e || '', t.count_p || '', t.count_a || '']; })];
      name = 'pretest';
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, name.toLowerCase() + '-' + (myClassInfo.class_name || 'class').replace(/\s+/g, '') + '.xlsx');
  }

  // ---- Moved from part 14 ----
  // ---- Card layouts for Σ Total (less scrolling than wide tables) ----
  const CG_CARD_GRID = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:12px;';
  function cgLevelPill(L, short){
    if(!L) return '<span class="dim">—</span>';
    return short ? gradeDot(L.letter, 22, 'average ' + L.avg) : gradePill(L.letter, 'average ' + L.avg); // js/grade-scale.js
  }
  function cgGroupCardsHtml(codes, rows, include, srcNames, lvl){
    const groups = {};
    codes.forEach(c => { (groups[cgMajor(c)] = groups[cgMajor(c)] || []).push(c); });
    const short = { observation: 'Obs', workbook: 'WB', pretest: 'Pre-Test', motor: 'Motor' };
    let html = '<div data-no-export="1" style="' + CG_CARD_GRID + '">';
    Object.keys(groups).sort((a, b) => a - b).forEach(maj => {
      const tot = { b: 0, p: 0, a: 0 };
      const lines = groups[maj].map(code => {
        const r = rows[code], t = cgRowTotal(r, include);
        tot.b += t.b; tot.p += t.p; tot.a += t.a;
        const src = Object.keys(srcNames).filter(k => include[k] && r[k].b + r[k].p + r[k].a).map(k => short[k] + ' ' + r[k].b + '·' + r[k].p + '·' + r[k].a).join('  ·  ');
        return `<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; padding:7px 0; border-top:1px solid var(--border);">
          <div style="min-width:0;"><b>${esc(code)}</b><div class="cap">${src ? esc(src) : 'Not counted (unticked)'}</div></div>
          <div style="text-align:right; white-space:nowrap;"><span class="cap">${t.b}·${t.p}·${t.a}</span> ${cgLevelPill(cgLevel(t.b, t.p, t.a), true)}</div></div>`;
      }).join('');
      const L = cgLevel(tot.b, tot.p, tot.a);
      html += `<div style="border:1px solid var(--border); border-radius:10px; padding:12px 14px; background:#fff;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:4px;">
          <b style="font-size:15px;">CG-${maj}</b>${cgLevelPill(L)}</div>
        <div class="cap" style="margin-bottom:4px;">${L ? 'B·P·A ' + tot.b + '·' + tot.p + '·' + tot.a + ' · avg ' + L.avg + ' · ' + L.pctPA + '% at P or above' : 'No data available'}</div>
        ${lines}</div>`;
    });
    return html + '</div>';
  }
  // Each child — a compact, filterable list (one slim row per child).
  function childCardsHtml(cgCols, kids, sumFor){
    const id = 'cgKids' + Math.floor(Math.random() * 1e6);
    const rows = realPupilsCache.map((p, i) => {
      const all = { b: 0, p: 0, a: 0 };
      const cells = cgCols.map(c => { const t = sumFor((kids[p.id] || {})[c]); all.b += t.b; all.p += t.p; all.a += t.a; return cgLevel(t.b, t.p, t.a); });
      return { p, roll: i + 1, cells, all, L: cgLevel(all.b, all.p, all.a) };
    });
    const count = k => rows.filter(r => k === 'all' ? true : k === 'none' ? !r.L : r.L && r.L.letter === k).length;
    const letter = L => L ? gradeDot(L.letter, 22, 'average ' + L.avg) : '<span class="dim">·</span>';
    const chip = (k, label, cls) => `<button type="button" data-lv="${k}" onclick="cgKidsFilter('${id}', '${k}', this)" style="padding:6px 12px; border-radius:99px; border:1px solid var(--border); background:${k === 'all' ? 'var(--primary)' : '#fff'}; color:${k === 'all' ? '#fff' : 'var(--text)'}; font-size:12.5px; font-weight:600; cursor:pointer;">${label} <span style="opacity:.8;">${count(k)}</span></button>`;
    let html = `<div data-no-export="1" id="${id}">
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:0 0 12px;">
        ${chip('all', 'All')}${chip('B', 'B Beginner')}${chip('P', 'P Proficient')}${chip('A', 'A Advanced')}${count('none') ? chip('none', 'No data') : ''}
        <input type="text" placeholder="Search name or reg. no…" oninput="cgKidsFilter('${id}')" style="flex:1; min-width:180px; max-width:280px; padding:7px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px;" />
        <select onchange="cgKidsSort('${id}', this.value)" style="padding:7px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px;"><option value="roll">Sort: roll</option><option value="need">Sort: needs support first</option></select>
      </div>
      <div class="report-table-wrap"><table class="report-table" style="font-size:12.5px;"><thead><tr><th>Roll</th><th style="text-align:left;">Child</th>${cgCols.map(c => `<th style="padding:6px 4px;">${esc(c)}</th>`).join('')}<th>B·P·A</th><th>Avg</th><th style="text-align:left;">Overall</th></tr></thead><tbody>`;
    rows.forEach(r => {
      html += `<tr data-child="${esc((r.p.name + ' ' + (r.p.register_no || '')).toLowerCase())}" data-level="${r.L ? r.L.letter : 'none'}" data-roll="${r.roll}" data-avg="${r.L ? r.L.avg : 9}">
        <td style="padding:5px 8px;">${r.roll}</td>
        <td style="text-align:left; padding:5px 8px; white-space:nowrap;"><b>${esc(r.p.name)}</b>${r.p.register_no ? ' <span class="cap">' + esc(r.p.register_no) + '</span>' : ''}</td>
        ${r.cells.map(L => `<td style="padding:5px 4px;">${letter(L)}</td>`).join('')}
        <td style="padding:5px 8px; white-space:nowrap;">${r.all.b + r.all.p + r.all.a ? r.all.b + '·' + r.all.p + '·' + r.all.a : '—'}</td>
        <td style="padding:5px 8px;">${r.L ? r.L.avg : '—'}</td>
        <td style="text-align:left; padding:5px 8px; white-space:nowrap;">${r.L ? cgLevelPill(r.L) : '<span class="dim">No data</span>'}</td></tr>`;
    });
    html += `</tbody></table></div><p class="cap cg-kids-none" style="display:none; margin:10px 0 0;">No child matches.</p></div>`;
    return html;
  }
  function cgKidsFilter(id, level, btn){
    const box = document.getElementById(id); if(!box) return;
    if(level !== undefined){
      box.dataset.level = level;
      box.querySelectorAll('button[data-lv]').forEach(b => { const on = b.dataset.lv === level; b.style.background = on ? 'var(--primary)' : '#fff'; b.style.color = on ? '#fff' : 'var(--text)'; });
    }
    const lv = box.dataset.level || 'all', q = (box.querySelector('input').value || '').toLowerCase().trim();
    let shown = 0;
    box.querySelectorAll('tbody tr').forEach(tr => { const ok = (lv === 'all' || tr.dataset.level === lv) && (!q || tr.dataset.child.includes(q)); tr.style.display = ok ? '' : 'none'; if(ok) shown++; });
    box.querySelector('.cg-kids-none').style.display = shown ? 'none' : '';
  }
  function cgKidsSort(id, by){
    const box = document.getElementById(id); if(!box) return;
    const body = box.querySelector('tbody');
    Array.from(body.children).sort((a, b) => by === 'need' ? (+a.dataset.avg - +b.dataset.avg) || (+a.dataset.roll - +b.dataset.roll) : (+a.dataset.roll - +b.dataset.roll)).forEach(tr => body.appendChild(tr));
  }

  // =================================================================
  // FEEDBACK TO PARENT — for children whose attendance needs a follow-up
  // (below 70%, or 3+ days absent in a row) in Class Attendance → Reports.
  // The message goes to the child's parent / guardian from the REAL family
  // profile, with the child's real figures, in English, Hindi or Marathi.
  // Sent by WhatsApp or SMS (opens the phone's app), or just saved — and
  // always recorded in the database against the child (attendance follow-ups).
  // =================================================================
  var attFb = null; // { pupilId, name, reason, monthLabel, present, marked, pct, lang, guardianIdx }
  const ATT_FB_TEXT = {
    en: f => `Namaste ${f.g}, this is ${f.t} from ${f.cls}, ${f.sch}. ${f.c}'s attendance in ${f.m} is ${f.pct}% (${f.present} of ${f.marked} days).${f.streak ? ' ' + f.c + ' was absent ' + f.streak + ' days in a row.' : ''} Coming to school every day helps ${f.c} learn and make friends. Please send ${f.c} to school daily, and let me know if there is any difficulty. Thank you.`,
    hi: f => `नमस्ते ${f.g}, मैं ${f.t}, ${f.cls}, ${f.sch} से। ${f.c} की ${f.m} की उपस्थिति ${f.pct}% है (${f.marked} में से ${f.present} दिन)।${f.streak ? ' ' + f.c + ' लगातार ' + f.streak + ' दिन अनुपस्थित रहे।' : ''} रोज़ स्कूल आने से ${f.c} अच्छे से सीखते हैं। कृपया ${f.c} को रोज़ स्कूल भेजें, और कोई परेशानी हो तो मुझे बताएं। धन्यवाद।`,
    mr: f => `नमस्कार ${f.g}, मी ${f.t}, ${f.cls}, ${f.sch} मधून. ${f.c} ची ${f.m} मधील उपस्थिती ${f.pct}% आहे (${f.marked} पैकी ${f.present} दिवस).${f.streak ? ' ' + f.c + ' सलग ' + f.streak + ' दिवस गैरहजर होते.' : ''} रोज शाळेत आल्याने ${f.c} चांगले शिकतात. कृपया ${f.c} ला दररोज शाळेत पाठवा, आणि काही अडचण असल्यास मला कळवा. धन्यवाद.`
  };
  function attFbHistory(pupilId){
    const all = (attendanceFollowupsCache && typeof attendanceFollowupsCache === 'object' && attendanceFollowupsCache[pupilId]) || [];
    return all.filter(f => /^Feedback to parent/.test(f.action_type || ''));
  }
  function attFbCell(c, reason, monthLabel){
    const last = attFbHistory(c.id)[0];
    const btn = `<button class="chip" onclick="openAttFeedback(${c.id}, '${reason}', '${esc(monthLabel)}', ${c.present}, ${c.marked}, ${c.pct === null ? 'null' : c.pct}, ${c.longest || 0})" style="white-space:nowrap;">💬 Feedback to parent</button>`;
    return btn + (last ? `<div class="cap" style="margin-top:3px; color:var(--good,#0a7a0a);">Sent ${esc(new Date(last.follow_up_date + 'T00:00:00').toLocaleDateString([], { day: 'numeric', month: 'short' }))} · ${esc((last.action_type || '').replace(/^Feedback to parent — /, ''))}</div>` : '');
  }
  function openAttFeedback(pupilId, reason, monthLabel, present, marked, pct, streak){
    const p = realPupilsCache.find(x => x.id === pupilId); if(!p) return;
    attFb = { pupilId, name: p.name, reason, monthLabel, present, marked, pct, streak, lang: (attFb && attFb.lang) || 'en', guardianIdx: 0 };
    if(!familyRecordsLoaded) ensureFamilyRecordsLoaded(() => renderAttFeedbackPanel());
    renderAttFeedbackPanel();
    const el = document.getElementById('attFbPanel'); if(el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function attFbGuardians(name){
    const r = familyRecords[name];
    return r && Array.isArray(r.guardianNames) ? r.guardianNames.filter(g => g && (g.name || g.phone)) : [];
  }
  function attFbMessage(){
    const gs = attFbGuardians(attFb.name), g = gs[attFb.guardianIdx] || null;
    const teacher = (document.querySelector('.user-name') || {}).textContent || 'the class teacher';
    return ATT_FB_TEXT[attFb.lang]({ g: g && g.name ? g.name : (attFb.lang === 'en' ? 'Parent' : attFb.lang === 'hi' ? 'अभिभावक' : 'पालक'), t: teacher.trim(), cls: myClassInfo.class_name || '', sch: myClassInfo.school_name || '',
      c: attFb.name.split(' ')[0], m: attFb.monthLabel, pct: attFb.pct === null ? '—' : attFb.pct, present: attFb.present, marked: attFb.marked, streak: attFb.streak >= 3 ? attFb.streak : 0 });
  }
  function renderAttFeedbackPanel(){
    const box = document.getElementById('attFbPanel'); if(!box || !attFb) return;
    const gs = attFbGuardians(attFb.name), g = gs[attFb.guardianIdx] || null;
    const phone = g && g.phone ? String(g.phone).trim() : '';
    box.style.display = '';
    box.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
        <b>💬 Feedback to ${esc(attFb.name)}'s parent — ${esc(attFb.monthLabel)}</b>
        <button class="chip" onclick="attFb = null; const b = document.getElementById('attFbPanel'); b.style.display = 'none'; b.innerHTML = '';">✕ Close</button></div>
      ${!familyRecordsLoaded ? '<p class="cap">Loading the family profile…</p>' : gs.length
        ? `<div class="fbar" style="margin-bottom:10px;"><div class="ctl"><label>To</label><select onchange="attFb.guardianIdx = +this.value; renderAttFeedbackPanel();" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${gs.map((x, i) => `<option value="${i}" ${i === attFb.guardianIdx ? 'selected' : ''}>${esc(x.name || 'Guardian')}${x.rel ? ' (' + esc(x.rel) + ')' : ''}${x.phone ? ' · ' + esc(x.phone) : ' · no number'}</option>`).join('')}</select></div>
           <div class="ctl"><label>Language</label><select onchange="attFb.lang = this.value; renderAttFeedbackPanel();" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"><option value="en" ${attFb.lang === 'en' ? 'selected' : ''}>English</option><option value="hi" ${attFb.lang === 'hi' ? 'selected' : ''}>हिंदी</option><option value="mr" ${attFb.lang === 'mr' ? 'selected' : ''}>मराठी</option></select></div></div>`
        : '<div class="au-error" style="margin-bottom:10px;">No family profile for ' + esc(attFb.name) + ' yet — add the parent in Family & Parents to send this to them. You can still save the feedback as a note.</div>'}
      <textarea id="attFbText" rows="5" style="width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box; line-height:1.5;">${esc(attFbMessage())}</textarea>
      <div class="imp-btns" style="margin-top:10px;">
        <button class="imp-btn primary" ${phone ? '' : 'disabled title="No phone number on file"'} onclick="sendAttFeedback('WhatsApp')">🟢 Send on WhatsApp</button>
        <button class="imp-btn" ${phone ? '' : 'disabled title="No phone number on file"'} onclick="sendAttFeedback('SMS')">✉ Send SMS</button>
        <button class="imp-btn" onclick="sendAttFeedback('Saved')">💾 Save only</button>
      </div>
      <p class="cap" style="margin:8px 0 0;">Edit the message as you like. It is saved against ${esc(attFb.name)} (to ${esc(g && g.name ? g.name : 'the parent')}) and shows in Class Attendance's follow-ups.</p>`;
  }
  async function sendAttFeedback(channel){
    if(!attFb) return;
    const text = (document.getElementById('attFbText') || {}).value || attFbMessage();
    const gs = attFbGuardians(attFb.name), g = gs[attFb.guardianIdx] || null;
    let digits = g && g.phone ? String(g.phone).replace(/\D/g, '') : '';
    if(digits.length === 10) digits = '91' + digits;      // Indian mobile → country code for WhatsApp
    if(channel === 'WhatsApp' && digits) window.open('https://wa.me/' + digits + '?text=' + encodeURIComponent(text), '_blank');
    if(channel === 'SMS' && digits) window.location.href = 'sms:+' + digits + '?body=' + encodeURIComponent(text);
    try{
      const res = await fetch('backend/attendance/save_attendance_followup.php' + window.location.search, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: myClassInfo.class_id, pupil_id: attFb.pupilId, reason: attFb.reason, follow_up_date: todayDateKey(),
          action_type: 'Feedback to parent — ' + channel,
          note: 'To: ' + (g ? (g.name || 'Guardian') + (g.rel ? ' (' + g.rel + ')' : '') + (g.phone ? ', ' + g.phone : '') : 'parent (no profile)') + ' · ' + attFb.monthLabel + ' · ' + text })
      });
      const data = await res.json();
      if(data.status !== 'success') throw new Error(data.message || 'Could not save.');
      attendanceFollowupsCache = null; // reload so the row shows "Sent …"
      if(typeof ensureAttendanceFollowupsLoaded === 'function') ensureAttendanceFollowupsLoaded();
      alert('Feedback ' + (channel === 'Saved' ? 'saved' : 'recorded as sent by ' + channel) + ' for ' + attFb.name + '.');
      attFb = null;
      setTimeout(() => { if(classAttendanceTab === 'reports') renderAttendanceReports(); }, 600);
    } catch(err){ alert('The message ' + (channel === 'Saved' ? '' : 'opened, but it ') + 'could not be saved: ' + err.message); }
  }

    // "✍ Enter manually" on Class Attendance: close the import panel and go to the day's register (Present / Absent).
  function goToAttendanceRegister(){
    const panel = document.getElementById('smartImportPanel'); if(panel) panel.innerHTML = '';
    const head = document.getElementById('attRegisterTop'); if(!head) return;
    window.scrollTo({ top: head.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' }); // 90 = room for the top bar
    head.style.transition = 'background .6s'; head.style.background = 'var(--primary-soft, #e6f4ec)';
    setTimeout(() => { head.style.background = ''; }, 1400);
  }
  function attendanceManualSheet(){
    const y = calendarYear, m = calendarMonth, days = new Date(y, m + 1, 0).getDate();
    const dates = []; for(let d = 1; d <= days; d++){ const dow = new Date(y, m, d).getDay(); if(dow !== 0 && dow !== 6) dates.push(d); }
    const grid = [['Student Name', ...dates.map(String)]];
    (Array.isArray(realPupilsCache) ? realPupilsCache : []).forEach(p => grid.push([p.name, ...dates.map(d => {
      const v = (attendanceRecords[y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')] || {})[p.id];
      return v === 'present' || v === 'late' ? 'P' : v === 'absent' ? 'A' : '';
    })]));
    if(grid.length < 2){ siPanel().innerHTML = '<div class="au-error">There are no children on the roll yet — add them first (Admissions).</div>'; return; }
    photoGridSheetName = new Date(y, m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
    photoGridSource = 'manual';
    renderPhotoGridEditor(grid, 'attendance');
  }
  // Admissions: blank rows to type children in.
  var rollSheetRows = null;
  function admissionsManualSheet(){
    rollSheetRows = rollSheetRows || Array.from({ length: 5 }, () => ['', '', '', '', '']);
    renderRollSheet();
  }
  function renderRollSheet(){
    const out = siPanel();
    const heads = ['Register No', 'Student Name', 'Admission date', 'Date of birth', 'Gender'];
    const types = ['text', 'text', 'date', 'date', 'gender'];
    let t = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 4px; font-weight:600;">✍ Enter children manually — nothing is saved yet</p>
      <p class="cap" style="margin:0 0 10px;">One child per row. Only the name is needed; empty rows are skipped. Then <b>Next — preview</b> checks for children already on the roll before anything is saved.</p>
      <div class="report-table-wrap"><table class="report-table" style="min-width:760px;"><thead><tr>${heads.map(h => `<th style="text-align:left;">${h}</th>`).join('')}<th></th></tr></thead><tbody>`;
    rollSheetRows.forEach((r, i) => {
      t += '<tr>' + types.map((ty, j) => {
        const on = `onchange="rollSheetRows[${i}][${j}] = this.value"`;
        if(ty === 'gender') return `<td><select ${on} style="padding:6px; border:1px solid var(--border); border-radius:6px;"><option value=""></option><option ${r[j] === 'Female' ? 'selected' : ''}>Female</option><option ${r[j] === 'Male' ? 'selected' : ''}>Male</option></select></td>`;
        return `<td><input type="${ty}" value="${esc(r[j])}" ${on} placeholder="${j === 0 ? 'e.g. 7101' : j === 1 ? 'Full name' : ''}" style="width:100%; min-width:${j === 1 ? 190 : 110}px; padding:6px 8px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></td>`;
      }).join('') + `<td><button class="chip" onclick="rollSheetRows.splice(${i}, 1); if(!rollSheetRows.length) rollSheetRows.push(['', '', '', '', '']); renderRollSheet();" title="Remove this row">✕</button></td></tr>`;
    });
    t += `</tbody></table></div>
      <div class="imp-btns" style="margin-top:12px;">
        <button class="imp-btn" onclick="rollSheetRows.push(['', '', '', '', '']); renderRollSheet();">＋ Add row</button>
        <button class="imp-btn primary" onclick="rollSheetContinue()">Next — preview</button>
        <button class="imp-btn" onclick="rollSheetRows = null; siPanel().innerHTML = '<p class=&quot;cap&quot;>Cancelled — nothing was saved.</p>';">Cancel</button>
      </div></div>`;
    out.innerHTML = t;
  }
  function rollSheetContinue(){
    const rows = (rollSheetRows || []).filter(r => String(r[1] || '').trim());
    if(!rows.length){ alert('Type at least one child\u2019s name.'); return; }
    rollSheetRows = null;
    renderSmartClassListStep('the children you typed', [['Register No', 'Student Name', 'Admission date', 'Date of birth', 'Gender'], ...rows]);
  }
  // Assessment: the roll (or the competencies / activities) with what is saved, as an editable sheet.
  function assessManualSheet(type){
    const targets = assessTargets(type);
    if(!targets){ assessPanel().innerHTML = '<div class="au-error">This tab has not finished loading its items — wait a moment and try again.</div>'; return; }
    const kids = Array.isArray(realPupilsCache) ? realPupilsCache : [];
    let grid;
    if(assessIsTally(type)){
      const cur = key => { if(type === 'pretest'){ ensurePreTestTallyForClass(); return preTestTallyEntries[String(+key - 1)] || {}; }
        const books = workbookCompetenciesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth] || [];
        const c = books.flatMap(b => b.competencies).find(x => x.cg_code === key); return c ? ((workbookCompetencyTallyCache[currentWorkbookMonth] || {})[c.id] || {}) : {}; };
      grid = [['Key', 'B Beginner', 'P Proficient', 'A Advanced'], ...targets.map(t => { const v = cur(t.key); return [t.key, String(v.count_e || 0), String(v.count_p || 0), String(v.count_a || 0)]; })];
    } else {
      const letter = (p, t) => {
        if(type === 'motor'){ return motorLetter(motorRating(p.id, motorSkillType, t.key)); }
        const themes = observationThemesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth] || [];
        const it = themes.flatMap(th => th.items.map(i => ({ th, i }))).find(x => x.th.name === t.theme && x.i.cg_code === t.cg);
        const v = it ? ((observationAssessmentCache[currentWorkbookMonth] || {})[p.id] || {})[it.i.id] : '';
        return v === 'E' ? 'B' : v || '';
      };
      grid = [['Student Name', ...targets.map(t => t.cg || t.key)], ...kids.map(p => [p.name, ...targets.map(t => letter(p, t))])];
    }
    if(assessIsTally(type)){
      assessSmart = assessAnalyse(type, grid, 'the sheet you typed', 'manual');
    } else {
      // Typing sheet: EVERY item as a column (empty ones too), every child as a row.
      assessSmart = { type, fileName: 'the sheet you typed', source: 'manual', tally: false, targets, grid,
        columns: targets.map((t, j) => ({ col: j + 1, label: t.cg || t.key, target: t.key })),
        rows: kids.map((p, i) => ({ raw: p.name, pupilId: p.id, include: true, marks: grid[i + 1].slice(1).map(v => assessMark(v)), rawMarks: grid[i + 1].slice(1) })) };
    }
    renderAssessSmartPreview();
  }

  // One download card at the end of a report. Any problem shows on screen,
  // so a download can never fail silently.
  function attDownloadCard(title, items){
    const card = document.createElement('div');
    card.className = 'card'; card.setAttribute('data-no-export', '1'); card.setAttribute('data-dl-end', '1');
    card.style.cssText = 'padding:16px 18px; margin-top:22px;';
    card.innerHTML = `<b>${esc(title)}</b><p class="cap" style="margin:3px 0 12px;">PDFs carry the school, class and teacher on every page.</p><div class="imp-btns"></div><div class="att-dl-msg" style="margin-top:8px;"></div>`;
    const row = card.querySelector('.imp-btns'), msg = card.querySelector('.att-dl-msg');
    items.filter(Boolean).forEach(it => {
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'imp-btn' + (it.primary ? ' primary' : ''); b.textContent = it.label; b.style.minWidth = '240px';
      b.onclick = () => {
        msg.innerHTML = '';
        if(!it.noPdf && typeof window.jspdf === 'undefined'){ msg.innerHTML = '<div class="au-error">The PDF maker did not load — check the internet connection, then reload the page (Ctrl + Shift + R).</div>'; return; }
        try { it.run(); msg.innerHTML = '<p class="cap" style="margin:0; color:var(--good,#0a7a0a);">✓ Download started — check your Downloads folder.</p>'; }
        catch(err){ console.error(err); msg.innerHTML = '<div class="au-error">The PDF could not be made: ' + esc(err.message || err) + ' — please send a screenshot of this.</div>'; }
      };
      row.appendChild(b);
    });
    return card;
  }

  // ⬇ The PDF for this page — a download card at the END of the page.
  // (Excel files are only used for importing.)
  function importDownloadCard(kind, type){
    const monthName = new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
    let item;
    if(kind === 'roll') item = { label: '⬇ Class list (PDF)', run: downloadClassListPdf, note: 'Every child on the roll — register no., name, admission date, date of birth, gender.' };
    else if(kind === 'assessment'){
      const run = type === 'observation' ? downloadObservationAssessmentPdf
        : type === 'pretest' ? downloadPreTestClassPdf
        : type === 'motor' ? downloadMotorAssessmentPdf
        : () => {
            const books = workbookCompetenciesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth];
            const sub = workbookMonthSubmissionCache[currentWorkbookMonth];
            if(!(sub && typeof sub === 'object' && sub.submitted)) throw new Error('Submit this month\u2019s workbook marks first — the Workbook report unlocks once the month is submitted.');
            downloadWorkbookMonthReportPdf(books, currentWorkbookMonth);
          };
      item = { label: '⬇ ' + (ASSESS_SMART_TYPES[type] || 'Assessment').replace(/ \(class tally\)/, '') + ' report (PDF)', run, note: 'The full report for this assessment, as saved.' };
    } else item = { label: '⬇ Attendance — ' + monthName + ' (PDF)', run: downloadAttendanceMonthPdf, note: 'Every child\u2019s present, absent, days marked and attendance % for ' + monthName + '.' };
    const card = attDownloadCard('Download', [{ label: item.label, run: item.run, primary: true }]);
    const cap = card.querySelector('.cap'); if(cap) cap.textContent = item.note;
    return card;
  }
  // This month's attendance as a PDF — real marks only.
  function downloadAttendanceMonthPdf(){
    const s = attMonthStats(calendarYear, calendarMonth);
    const monthName = new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'portrait' });
    doc.setFontSize(14); doc.text('Attendance — ' + monthName, 14, 16);
    doc.setFontSize(9); doc.text(pdfSafeText((myClassInfo.class_name || '') + ' · ' + (myClassInfo.school_name || '') + ' · ' + s.markedDays.length + ' of ' + s.schoolDays.length + ' school days marked so far · class attendance ' + (s.classPct === null ? '—' : s.classPct + '%')), 14, 22);
    doc.autoTable({ startY: 27, styles: { fontSize: 8.5, cellPadding: 2 }, headStyles: { fillColor: [37, 99, 60] },
      head: [['Roll', 'Reg. no.', 'Child', 'Present', 'Absent', 'Days marked', 'Attendance']],
      body: s.children.length ? s.children.map(c => [c.roll, c.register_no || '—', pdfSafeText(c.name), c.present, c.absent, c.marked, c.pct === null ? 'No data' : c.pct + '%']) : [['', '', 'No data available', '', '', '', '']] });
    doc.save('attendance-' + calendarYear + '-' + String(calendarMonth + 1).padStart(2, '0') + '.pdf');
  }
  // The class list as a PDF.
  function downloadClassListPdf(){
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'portrait' });
    doc.setFontSize(14); doc.text('Class list — ' + pdfSafeText(myClassInfo.class_name || ''), 14, 16);
    doc.setFontSize(9); doc.text(pdfSafeText((myClassInfo.school_name || '') + ' · ' + (realPupilsCache || []).length + ' children on the roll'), 14, 22);
    doc.autoTable({ startY: 27, styles: { fontSize: 8.5, cellPadding: 2 }, headStyles: { fillColor: [37, 99, 60] },
      head: [['Roll', 'Reg. no.', 'Child', 'Admitted', 'Date of birth', 'Gender']],
      body: (realPupilsCache || []).map((p, i) => [i + 1, p.register_no || '—', pdfSafeText(p.name), p.admitted_date || '—', p.dob || '—', p.gender || '—']) });
    doc.save('class-list-' + (myClassInfo.class_name || 'class').replace(/\s+/g, '') + '.pdf');
  }

  // =================================================================
  // IMPORT A FILE — first the format, then the file; a file that does
  // not fit is refused with an alert (nothing is imported).
  // =================================================================
  const IMPORT_FORMATS = {
    attendance: { title: 'Attendance register', need: ['A column for the children\u2019s names — headed <b>Name</b> or <b>Student Name</b>', 'One column per day — headed <b>1, 2, 3 … 31</b> (or the dates)', 'In each cell: <b>P</b> present · <b>A</b> absent · <b>H</b> holiday (blank = not marked)'],
      optional: 'Register No / Roll No column; one sheet per month, named e.g. <b>July 2026</b> (or you pick the month in the next step).',
      example: [['Register No', 'Student Name', '1', '2', '3', '…'], ['7101', 'Sumaiya Sattar', 'P', 'P', 'A', '…'], ['7102', 'Sohana Abdul Rahim', 'P', 'A', 'P', '…']] },
    roll: { title: 'Class list', need: ['A column for the children\u2019s names — headed <b>Name</b> or <b>Student Name</b>', 'One child per row'],
      optional: '<b>Register No</b>, <b>Admission date</b>, <b>Date of birth</b> (e.g. 2021-05-02 or 02/05/2021), <b>Gender</b>.',
      example: [['Register No', 'Student Name', 'Admission date', 'Date of birth', 'Gender'], ['7101', 'Sumaiya Sattar', '2026-06-15', '2021-05-02', 'Female'], ['7102', 'Sohana Abdul Rahim', '2026-06-15', '2021-03-11', 'Female']] },
    observation: { title: 'Classroom Observation', need: ['A column for the children\u2019s names — headed <b>Name</b> or <b>Student Name</b>', 'One column per CG item of the theme — headed with its code, e.g. <b>C-8.3</b>', 'In each cell: <b>B</b> Beginner · <b>P</b> Proficient · <b>A</b> Advanced (or G / Y / R)'],
      optional: 'Register No column.', example: [['Student Name', 'C-8.3', 'C-8.5'], ['Avani Suryavanshi', 'P', 'A'], ['Darsh Pande', 'B', 'P']] },
    motor: { title: 'Fine & Gross Motor', need: ['A column for the children\u2019s names — headed <b>Name</b> or <b>Student Name</b>', 'One column per month — <b>June, July, August, September, October</b>', 'In each cell: <b>B</b> · <b>P</b> · <b>A</b> (or G / Y / R)'],
      optional: 'Fine and Gross Motor on separate sheets, named Fine / Gross.', example: [['Student Name', 'June', 'July', 'August'], ['Avani Suryavanshi', 'P', 'A', 'A'], ['Darsh Pande', 'B', 'P', 'P']] },
    workbook: { title: 'Workbook (class counts)', need: ['A column with each competency\u2019s <b>CG code</b> (e.g. CG-1.1)', 'Three count columns headed <b>B</b>, <b>P</b>, <b>A</b> — how many children at each level'],
      optional: 'A competency description column.', example: [['cg_code', 'competency', 'B Beginner', 'P Proficient', 'A Advanced'], ['CG-1.1', 'Holds a crayon correctly', '3', '12', '5'], ['CG-1.2', 'Draws lines and circles', '4', '13', '5']] },
    pretest: { title: 'Pre-Test (class counts)', need: ['A column with each <b>activity number</b> (1, 2, 3 …) or activity name', 'Three count columns headed <b>B</b>, <b>P</b>, <b>A</b>'],
      optional: 'An activity description column.', example: [['activity_no', 'activity', 'B Beginner', 'P Proficient', 'A Advanced'], ['1', 'Sorting by colour', '5', '10', '6'], ['2', 'Counting to 10', '7', '9', '5']] }
  };
  function showImportFormat(kind, type){
    const key = kind === 'assessment' ? type : kind;
    const F = IMPORT_FORMATS[key]; if(!F) return;
    const out = kind === 'assessment' ? assessPanel() : siPanel();
    const go = kind === 'assessment' ? `assessSmartChoose('${type}', 'file')` : `smartImportChoose('${kind === 'roll' ? 'roll' : ''}')`;
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px 16px; background:var(--bg);">
      <p style="margin:0 0 6px; font-weight:600;">📋 The file must be in this format — ${esc(F.title)}</p>
      <p class="cap" style="margin:0 0 4px;">An Excel or CSV file (<b>.xlsx, .xls or .csv</b>) with:</p>
      <ul style="margin:4px 0 8px 18px; padding:0; font-size:13px; line-height:1.6;">${F.need.map(n => '<li>' + n + '</li>').join('')}</ul>
      <p class="cap" style="margin:0 0 10px;">Optional: ${F.optional}</p>
      <div class="report-table-wrap"><table class="report-table" style="font-size:12px; min-width:0;"><thead><tr>${F.example[0].map(h => '<th>' + esc(h) + '</th>').join('')}</tr></thead><tbody>${F.example.slice(1).map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('')}</tbody></table></div>
      <p class="cap" style="margin:8px 0 12px;">A file without the required columns — or a different kind of file — is refused, and nothing is imported.</p>
      <div class="imp-btns"><button type="button" class="imp-btn primary" onclick="${go}">📥 Choose the file</button>
        <button type="button" class="imp-btn" onclick="this.closest('[data-si-panel], #assessSmartPanel').innerHTML = '';">Cancel</button></div></div>`;
  }
  // The file itself: only spreadsheets.
  function importFileTypeOk(file){
    if(/\.(xlsx|xls|csv)$/i.test(file.name || '')) return true;
    alert('This file can\u2019t be imported: "' + file.name + '" is not a spreadsheet.\n\nOnly Excel or CSV files (.xlsx, .xls, .csv) can be imported. For a photo of a sheet, use 📷 Scan a photo instead.');
    return false;
  }
  function importRefuse(panel, lines){
    alert('This file can\u2019t be imported:\n\n• ' + lines.join('\n• ') + '\n\nNothing was imported. Check the format and try again.');
    if(panel) panel.innerHTML = '<div class="au-error"><b>File not imported.</b><br>' + lines.map(esc).join('<br>') + '</div>';
  }
  // How many names in a list are on this class's roll.
  function importRollMatches(names){
    const roll = new Set((realPupilsCache || []).map(p => normPupilName(p.name)));
    return names.filter(n => roll.has(normPupilName(splitRegisterFromName(n).name))).length;
  }
  // Assessment: is the analysed file usable? Returns the problems ([] = fine).
  function assessFileProblems(S, type){
    const p = [];
    if(S.tally){
      if(!S.rows.some(r => r.include)) p.push(type === 'pretest' ? 'No column with the Pre-Test activity numbers or names was found.' : 'No column with the competencies\u2019 CG codes (e.g. CG-1.1) was found.');
      if(!S.countsFound) p.push('No count columns headed B, P and A were found.');
    } else {
      if(!S.headerFound) p.push('No heading row was found — the first row should name the columns (e.g. Student Name, ' + (type === 'motor' ? 'June, July …' : 'C-8.3 …') + ').');
      if(!S.nameFound) p.push('No column for the children\u2019s names (headed Name / Student Name).');
      if(!S.columns.length) p.push('No column with B / P / A marks was found.');
      else if(!S.columns.some(c => c.target)) p.push('None of the columns match this tab\u2019s ' + (type === 'motor' ? 'months (June … October).' : 'CG items for ' + currentWorkbookMonth + ' (e.g. ' + ((assessTargets(type) || [])[0] || {}).cg + ').'));
      if(S.rows.length && (realPupilsCache || []).length && !S.rows.some(r => r.pupilId)) p.push('None of the names match the children of ' + (myClassInfo.class_name || 'this class') + ' — is this another class\u2019s file?');
      if(!S.rows.length) p.push('No children were found under the headings.');
    }
    return p;
  }

/* ===== teacher-part-14.js ===== */
/* =========================================================================
   teacher-part-14.js — part 14 of 14 of the teacher portal script.
   SMART ASSESSMENT IMPORT — one "📥 Import a file or photo" card on each
   assessment tab (Fine & Gross Motor, Classroom Observation, Workbook,
   Pre-Test). Any layout (.xlsx / .xls / .csv) or a PHOTO of a marksheet
   (read on this device with Tesseract — the photo never leaves it):
     1. reads the sheet or photo into a grid and works out which column
        is the child, which columns are marks, and what each column is
        (a month, a CG item, a competency …);
     2. shows an EDITABLE preview — change any mark, fix a child the
        name didn't match, re-point or skip a column, skip a row;
     3. on Confirm, hands exactly what you see to that assessment's own,
        existing import/save code, which checks it and saves it.
   Marks are read as B / P / A (G/Y/R, E/P/A, Beginner… are converted).
   ========================================================================= */

  var assessSmart = null;
  var smartAssessHandoffRows = null; // read once by readAssessmentFileRows (part 12)
  const ASSESS_SMART_TYPES = { motor: 'Fine & Gross Motor', observation: 'Classroom Observation', workbook: 'Workbook', pretest: 'Pre-Test' };

  // Any mark → 'B' | 'P' | 'A' | '' (blank) | '?' (couldn't read).
  function assessMark(v){
    const t = String(v == null ? '' : v).trim().toUpperCase().replace(/\.$/, '');
    if(!t || t === '-' || t === '—') return '';
    if(['B', 'E', 'R', 'BEGINNER', 'EMERGING', 'RED', 'NEEDS SUPPORT', 'NS', '8'].includes(t)) return 'B'; // "8" is a common OCR misread of B
    if(['P', 'Y', 'PROFICIENT', 'YELLOW', 'DEVELOPING', 'D'].includes(t)) return 'P';
    if(['A', 'G', 'ADVANCED', 'GREEN', 'ACHIEVED', '4'].includes(t)) return 'A';     // "4" is a common OCR misread of A
    return '?';
  }
  function assessNorm(s){ return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9.]/g, ''); }
  function assessCell(v){ return v instanceof Date ? siYmd(v) : String(v == null ? '' : v).trim(); }

  // ---- what each column can be, per assessment ----
  function assessTargets(type){
    if(type === 'motor') return MOTOR_MONTHS.map(m => ({ key: m, label: m + ' — ' + MOTOR_ACTIVITIES[motorSkillType][m].title, match: [m.toLowerCase(), m.slice(0, 3).toLowerCase()] }));
    if(type === 'observation'){
      const themes = observationThemesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth];
      if(!Array.isArray(themes)) return null;
      return themes.flatMap(t => { const seen = {}; return t.items.map(it => { const occ = seen[it.cg_code] = (seen[it.cg_code] || 0) + 1; // the same CG twice in a theme = two items
        return { key: t.name + '|' + it.cg_code + (occ > 1 ? '#' + occ : ''), theme: t.name, cg: it.cg_code, occ, label: it.cg_code + ' — ' + t.name + (occ > 1 ? ' (' + occ + ')' : ''), match: [assessNorm(it.cg_code)] }; }); });
    }
    if(type === 'workbook'){
      const books = workbookCompetenciesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth];
      const book = Array.isArray(books) ? books.find(b => b.name === currentWorkbookCompetencyBookName) : null;
      if(!book) return null;
      return book.competencies.map(c => ({ key: c.cg_code, label: c.cg_code + ' — ' + String(c.competency_text || '').slice(0, 60), match: [assessNorm(c.cg_code)] }));
    }
    if(type === 'pretest') return WEEKLY_ASSESSMENT_ACTIVITIES.map((a, i) => ({ key: String(i + 1), label: (i + 1) + '. ' + a.activity, match: [String(i + 1), assessNorm(a.activity)] }));
    return [];
  }
  const assessIsTally = type => type === 'workbook'; // Pre-Test is child-wise: each child's B / P / A per activity

  function renderAssessSmartCard(type){
    if(!ASSESS_SMART_TYPES[type] || type === 'workbook') return null;// Workbook is child-wise now; its Excel import comes with the Pre-Test format (Step 4)
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'padding:16px 18px; margin:0 0 18px;';
    const what = assessIsTally(type) ? 'a table of how many children were at B, P and A' : 'a sheet with each child\u2019s B / P / A marks';
    card.innerHTML = `
      <div class="imp-card">
        <div class="imp-text">
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import a file or photo — ${esc(ASSESS_SMART_TYPES[type])}</h3>
          <p class="cap" style="margin:0;">Any layout (.xlsx, .xls, .csv), or a photo of the marksheet — ${what}. You get an editable preview to correct anything before it is saved${type === 'motor' ? ' (to the ' + (motorSkillType === 'fine' ? 'Fine' : 'Gross') + ' Motor sheet selected below)' : ''}.</p>
        </div>
        ${importButtonsHtml(`assessSmartChoose('${type}', 'photo')`, `showImportFormat('assessment', '${type}')`, `assessManualSheet('${type}')`, `assessDownloadSheet('${type}')`, 'Download sheet')}
      </div>
      <div id="assessSmartPanel" style="margin-top:12px; word-break:break-word; overflow-wrap:anywhere;"></div>`;
    if(assessSmart && assessSmart.type === type && assessSmart.grid) setTimeout(renderAssessSmartPreview, 0);
    return card;
  }

  function assessPanel(){ return document.getElementById('assessSmartPanel'); }

 function assessSmartChoose(type, source){
  if(source === 'photo'){
    openAssessmentCamera(type);
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.csv';

  input.onchange = async () => {
    const file = input.files && input.files[0];
    if(!file) return;

    if(!importFileTypeOk(file)) return;

    const out = assessPanel();

    try{
      const targets = assessTargets(type);

      if(!targets){
        throw new Error(
          'This tab has not finished loading its items — wait a moment and try again.'
        );
      }

      if(typeof XLSX === 'undefined'){
        throw new Error(
          'The spreadsheet reader did not load (no internet reached the CDN).'
        );
      }

      out.innerHTML =
        '<p class="sub">Reading ' + esc(file.name) + '…</p>';

      const wb = XLSX.read(
        await file.arrayBuffer(),
        {
          type: 'array',
          cellDates: true
        }
      );

      const sheets = wb.SheetNames
        .map(n => ({
          name: n,
          grid: XLSX.utils.sheet_to_json(
            wb.Sheets[n],
            {
              header: 1,
              raw: true,
              cellDates: true,
              defval: ''
            }
          ).map(r => r.map(assessCell))
        }))
        .filter(
          s => s.grid.some(
            r => r.some(Boolean)
          )
        );

      if(!sheets.length){
        throw new Error('The file is empty.');
      }

      let pick = sheets[0];

      if(type === 'motor'){
        pick =
          sheets.find(
            s =>
              s.name
                .toLowerCase()
                .includes(motorSkillType)
          ) ||
          sheets
            .slice()
            .sort(
              (a,b) =>
                b.grid.length - a.grid.length
            )[0];
      }else{
        pick =
          sheets
            .slice()
            .sort(
              (a,b) =>
                b.grid.length - a.grid.length
            )[0];
      }

      const grid = pick.grid;

      const S = assessAnalyse(
        type,
        grid,
        file.name,
        source
      );

      const problems =
        assessFileProblems(S, type);

      if(problems.length){
        importRefuse(out, problems);
        return;
      }

      assessSmart = S;

      renderAssessSmartPreview();

    }catch(err){

      out.innerHTML =
        `<div class="au-error">
          ${esc(err.message || err)}
        </div>`;
    }
  };

  input.click();
}

  // =====================================================================
  // 📷 Scan a photo — camera OR gallery (replaces the old openAssessmentCamera).
  // Used by every assessment tab (Pre-Test, Observation, Workbook, Motor).
  //   • 📸 Capture photo        — live camera inside the portal
  //   • 🖼 Choose from gallery  — any photo already on this device
  //   • 📱 Open camera app      — phones/tablets only: the device's own camera
  // If the camera cannot open (no camera, permission denied, not HTTPS, DroidCam
  // not started …) the window stays open so a photo can still be chosen.
  // =====================================================================

  // One place that turns a photo (from the camera or the gallery) into the editable preview.
  async function assessProcessPhoto(type, file){
    const panel = assessPanel();
    if(!panel){ alert('Import panel is not available yet.'); return; }
    if(!file) return;
    if(!/^image\//i.test(file.type || '') && !/\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name || '')){
      panel.innerHTML = '<div class="au-error">That file is not a photo. Choose a JPG or PNG picture of the marksheet (for Excel or CSV use “Import a file”).</div>';
      return;
    }
    if(file.size > 25 * 1024 * 1024){
      panel.innerHTML = '<div class="au-error">That photo is larger than 25 MB. Choose a smaller one, or take it again.</div>';
      return;
    }
    try{
      const targets = assessTargets(type);
      if(!targets) throw new Error('This tab has not finished loading its items — wait a moment and try again.');
      panel.innerHTML = '<p class="sub">Reading the photo…</p>';
      const grid = await assessOcrGrid(file, type, panel);
      assessSmart = assessAnalyse(type, grid, file.name || 'photo', 'photo');
      renderAssessSmartPreview();
    }catch(err){
      let msg = String((err && err.message) || err);
      if(/hei[cf]/i.test((file.type || '') + ' ' + (file.name || ''))) msg += ' (HEIC/HEIF photos are not readable in every browser — share or save the picture as a JPG and try again.)';
      panel.innerHTML = `<div class="au-error">${esc(msg)}</div>`;
    }
  }

  // Opens the device's file chooser for pictures. useCameraApp = ask phones to open their own camera.
  function assessPickPhotoFile(useCameraApp, done){
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if(useCameraApp) input.setAttribute('capture', 'environment');
    input.onchange = () => { const f = input.files && input.files[0]; if(f) done(f); };
    input.click();
  }

  async function openAssessmentCamera(type){
    if(!assessPanel()){ alert('Import panel is not available yet.'); return; }
    const old = document.getElementById('assessmentCameraWrap');
    if(old) old.remove();

    const isTouch = (navigator.maxTouchPoints || 0) > 0;
    let stream = null, capturedBlob = null;

    const wrap = document.createElement('div');
    wrap.id = 'assessmentCameraWrap';
    wrap.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,.78); display:flex; align-items:center; justify-content:center; padding:20px;';
    wrap.innerHTML = `
      <div style="width:min(760px,96vw); max-height:94vh; overflow:auto; background:var(--card,#fff); border-radius:14px; padding:18px; box-shadow:0 20px 60px rgba(0,0,0,.35);">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px;">
          <div>
            <h3 style="margin:0; font-family:var(--disp); font-size:16px;">📷 Scan a photo</h3>
            <p class="cap" style="margin:4px 0 0;">Take a photo of the complete marksheet, or choose one from your gallery.</p>
          </div>
          <button type="button" class="imp-btn" id="assessmentCameraClose">✕ Close</button>
        </div>
        <div id="assessmentCameraBox" style="background:#111; border-radius:10px; overflow:hidden; position:relative;">
          <video id="assessmentCameraVideo" autoplay playsinline muted style="display:block; width:100%; max-height:65vh; object-fit:contain;"></video>
          <div id="assessmentCameraFrame" style="position:absolute; inset:8%; border:2px solid rgba(255,255,255,.8); border-radius:8px; pointer-events:none;"></div>
        </div>
        <canvas id="assessmentCameraCanvas" style="display:none;"></canvas>
        <div id="assessmentCameraMessage" class="cap" style="min-height:20px; margin-top:10px;">Starting the camera…</div>
        <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap; margin-top:12px;">
          <button type="button" class="imp-btn primary" id="assessmentCameraCapture">📸 Capture photo</button>
          <button type="button" class="imp-btn" id="assessmentCameraRetake" style="display:none;">🔄 Retake</button>
          <button type="button" class="imp-btn primary" id="assessmentCameraUse" style="display:none;">✓ Use this photo</button>
          <button type="button" class="imp-btn" id="assessmentCameraGallery">🖼 Choose from gallery</button>
          ${isTouch ? '<button type="button" class="imp-btn" id="assessmentCameraApp">📱 Open camera app</button>' : ''}
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const $ = id => wrap.querySelector('#' + id);
    const video = $('assessmentCameraVideo'), canvas = $('assessmentCameraCanvas'), message = $('assessmentCameraMessage');
    const captureBtn = $('assessmentCameraCapture'), retakeBtn = $('assessmentCameraRetake'), useBtn = $('assessmentCameraUse');

    function stopCamera(){ if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; } }
    function onKey(e){ if(e.key === 'Escape') closeCamera(); }
    function closeCamera(){ stopCamera(); document.removeEventListener('keydown', onKey); wrap.remove(); }
    document.addEventListener('keydown', onKey);

    $('assessmentCameraClose').onclick = closeCamera;
    // Gallery / camera app: close this window and read the chosen photo.
    $('assessmentCameraGallery').onclick = () => assessPickPhotoFile(false, f => { closeCamera(); assessProcessPhoto(type, f); });
    if(isTouch) $('assessmentCameraApp').onclick = () => assessPickPhotoFile(true, f => { closeCamera(); assessProcessPhoto(type, f); });

    // The live camera could not start — keep the window open so a gallery photo can still be used.
    function cameraUnavailable(why){
      stopCamera();
      $('assessmentCameraBox').style.display = 'none';
      captureBtn.style.display = 'none';
      message.textContent = why + ' You can still choose a photo from your gallery.';
    }

    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      cameraUnavailable('The camera cannot be used here (it needs a recent Chrome or Edge over HTTPS).');
    } else {
      try{
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if(!document.body.contains(wrap)){ stopCamera(); return; } // closed while the camera was starting
        video.srcObject = stream;
        message.textContent = 'Camera ready. Make sure the complete sheet is visible and readable.';
      }catch(err){
        let msg = 'Could not open the camera.';
        if(err && err.name === 'NotAllowedError') msg = 'Camera permission was denied. Allow camera access in the browser to use it.';
        else if(err && err.name === 'NotFoundError') msg = 'No camera was found on this device.';
        else if(err && err.name === 'NotReadableError') msg = 'The camera is being used by another application.';
        cameraUnavailable(msg);
      }
    }

    captureBtn.onclick = () => {
      if(!video.videoWidth || !video.videoHeight){ message.textContent = 'The camera is not ready yet. Please wait a moment.'; return; }
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if(!blob){ message.textContent = 'Could not capture the photo. Try again.'; return; }
        capturedBlob = blob;
        video.style.display = 'none';
        canvas.style.cssText = 'display:block; width:100%; max-height:65vh; object-fit:contain;';
        captureBtn.style.display = 'none';
        retakeBtn.style.display = 'inline-flex';
        useBtn.style.display = 'inline-flex';
        message.textContent = 'Check the photo. If the complete sheet is visible, click “Use this photo”.';
      }, 'image/jpeg', 0.92);
    };

    retakeBtn.onclick = () => {
      capturedBlob = null;
      canvas.style.display = 'none';
      video.style.display = 'block';
      captureBtn.style.display = 'inline-flex';
      retakeBtn.style.display = 'none';
      useBtn.style.display = 'none';
      message.textContent = 'Camera ready. Take another photo.';
    };

    useBtn.onclick = () => {
      if(!capturedBlob) return;
      const file = new File([capturedBlob], 'assessment-scan-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      closeCamera();
      assessProcessPhoto(type, file);
    };
  }

  // ---- photo → grid, on this device ----
  function assessLoadTesseract(){
    if(window.Tesseract) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = () => res(); s.onerror = () => rej(new Error('The photo reader could not be downloaded — check the internet connection and try again.'));
      document.head.appendChild(s);
    });
  }
  // Grayscale + contrast + enlarge small photos: printed and neat handwriting read noticeably better.
  async function assessPrepareImage(file){
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That photo could not be opened.')); i.src = url; });
    const scale = Math.min(3, Math.max(1, 2000 / Math.max(img.width, img.height)));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
    for(let i = 0; i < px.length; i += 4){
      const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const v = Math.max(0, Math.min(255, (y - 128) * 1.6 + 128));
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    g.putImageData(d, 0, 0);
    URL.revokeObjectURL(url);
    return c;
  }
  async function assessOcrGrid(file, type, out){
    out.innerHTML = '<p class="sub">Getting the photo reader ready…</p>';
    await assessLoadTesseract();
    const canvas = await assessPrepareImage(file);
    const result = await Tesseract.recognize(canvas, 'eng', {
      logger: m => { if(m.status === 'recognizing text' && out) out.innerHTML = `<p class="sub">Reading the photo… ${Math.round((m.progress || 0) * 100)}%</p>`; }
    });
    const lines = ((result.data && result.data.lines) || []).map(l => l.text).filter(t => t && t.trim());
    const text = lines.length ? lines : String((result.data && result.data.text) || '').split(/\n/);
    const grid = [];
    text.forEach(line => {
      const clean = line.replace(/[|\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
      if(!clean) return;
      const toks = clean.split(' ');
      // The heading line ("Student Name June July …", "CG  B  P  A"): keep it as a header row.
      const nameAt = toks.findIndex(t => /^name$/i.test(t));
      if(!grid.length && nameAt >= 0){ grid.push(['Student Name', ...toks.slice(nameAt + 1)]); return; }
      if(!grid.length && assessIsTally(type) && toks.filter(t => /^(b|p|a|e|beginner|proficient|advanced|emerging)$/i.test(t)).length >= 2){
        grid.push(['Key', ...toks.filter(t => /^(b|p|a|e|beginner|proficient|advanced|emerging)$/i.test(t))]); return;
      }
      if(assessIsTally(type)){
        // key first (CG code / activity no.), then the numbers
        const nums = toks.filter(t => /^\d{1,3}$/.test(t));
        const key = toks.find(t => /cg|\d+\.\d+/i.test(t)) || toks[0];
        grid.push([key, ...nums.slice(-3)]);
        return;
      }
      // trailing short tokens are marks; the rest is the name
      let k = toks.length;
      while(k > 1 && /^[BPAEGYR8478✓✗xX-]{1,2}$/i.test(toks[k - 1])) k--;
      grid.push([toks.slice(0, k).join(' '), ...toks.slice(k)]);
    });
    if(!grid.length) throw new Error('No writing could be read from this photo. Take it again in good light, straight on, with the whole sheet in view.');
    return grid;
  }

  // ---- work out the structure ----
  function assessAnalyse(type, grid, fileName, source){
    const targets = assessTargets(type);
    const width = Math.max(...grid.map(r => r.length));
    // "CG-8.3" and "C-8.3" are the same code; a code only matches whole, so C-8.1 never matches C-8.13.
    // A Pre-Test activity number matches only itself ("1" or "1."), never "10"–"19".
    const cgNorm = h => assessNorm(h).replace(/cg(?=\d)/g, 'c');
    const codeHit = (n, m) => new RegExp('(^|[^0-9.])' + m.replace(/\./g, '\\.') + '(?![0-9])').test(n);
    const matchTarget = h => { const n = cgNorm(h); if(!n) return null; return targets.find(t => t.match.some(m => m && (/^c\d+\.\d+$/.test(m) ? codeHit(n, m) : /^\d+$/.test(m) ? (n === m || n.startsWith(m + '.') && !/^\d/.test(n.slice(m.length + 1))) : (n === m || n.includes(m) || (m.length > 3 && m.includes(n) && n.length > 3))))) || null; };
    // header row: a name heading, or 2+ cells that name targets
    let headerIdx = -1;
    const bpaRow = r => (grid[r] || []).filter(c => /^(count[_ ]?)?([123]\s*(beginner|proficient|advanced)?|b|p|a|e|beginner|proficient|advanced|emerging)$/i.test(String(c).trim())).length >= 2;
    if(assessIsTally(type)) for(let r = 0; r < Math.min(grid.length, 15); r++) if(bpaRow(r)){ headerIdx = r; break; } // counts: the B · P · A heading row wins
    for(let r = 0; r < Math.min(grid.length, 15) && headerIdx < 0; r++){
      const row = grid[r] || [];
      const nameHit = row.some(c => SI_NAME_WORDS.includes(siNorm(c)));
      const tHits = row.filter(c => matchTarget(c)).length;
      const bpaHits = row.filter(c => /^(count[_ ]?)?([123]\s*(beginner|proficient|advanced)?|b|p|a|e|beginner|proficient|advanced|emerging)$/i.test(String(c).trim())).length;
      if(nameHit || tHits >= 2 || (assessIsTally(type) && bpaHits >= 2)){ headerIdx = r; break; }
    }
    const header = headerIdx >= 0 ? grid[headerIdx] : [];
    const body = grid.slice(headerIdx + 1).filter(r => r.some(c => String(c).trim()));

    if(assessIsTally(type)){
      // key column = the one whose cells match targets most; counts = B/P/A headings or the last 3 numeric columns
      let keyCol = 0, best = -1;
      for(let c = 0; c < width; c++){ const hits = body.filter(r => matchTarget(r[c])).length; if(hits > best){ best = hits; keyCol = c; } }
      const h = header.map(x => String(x).trim().toLowerCase());
      const find = words => h.findIndex(x => words.includes(x.replace(/^count[_ ]?/, '').replace(/^([123])\s*(beginner|proficient|advanced)$/, '$1')));
      let cb = find(['1', 'b', 'e', 'beginner', 'emerging']), cp = find(['2', 'p', 'proficient']), ca = find(['3', 'a', 'advanced']);
      if(cb < 0 || cp < 0 || ca < 0){
        const numCols = []; for(let c = 0; c < width; c++) if(c !== keyCol && body.filter(r => /^\d+$/.test(String(r[c] || '').trim())).length >= Math.max(1, body.length * 0.5)) numCols.push(c);
        [cb, cp, ca] = numCols.slice(-3).concat([-1, -1, -1]).slice(0, 3);
      }
      const rows = body.map(r => {
        const t = matchTarget(r[keyCol]);
        const n = c => (c >= 0 && /^\d+$/.test(String(r[c] || '').trim())) ? parseInt(r[c], 10) : 0;
        return { raw: String(r[keyCol] || ''), target: t ? t.key : '', include: !!t, b: n(cb), p: n(cp), a: n(ca) };
      }).filter(r => r.raw || r.b || r.p || r.a);
      return { type, fileName, source, tally: true, targets, rows, grid, countsFound: cb >= 0 && cp >= 0 && ca >= 0 };
    }

    // per-child: name column + mark columns
    let nameCol = header.findIndex(c => SI_NAME_WORDS.includes(siNorm(c)));
    if(nameCol < 0){ let best = -1; for(let c = 0; c < width; c++){ const n = body.filter(r => /[a-z\u0900-\u097F]{3,}/i.test(String(r[c] || '')) && assessMark(r[c]) === '?').length; if(n > best){ best = n; nameCol = c; } } }
    const markCols = [];
    for(let c = 0; c < width; c++){
      if(c === nameCol) continue;
      const vals = body.map(r => String(r[c] || '').trim()).filter(Boolean);
      if(!vals.length) continue;
      const good = vals.filter(v => assessMark(v) !== '?').length;
      if(good >= vals.length * 0.5 || matchTarget(header[c])) markCols.push(c);
    }
    const used = new Set();
    const columns = markCols.map((c, i) => {
      let t = matchTarget(header[c]);
      // The same CG code can sit under two themes in one month (e.g. C-7.1 in July).
      // The theme named in the column heading wins; otherwise columns go to those
      // themes in order, so a second C-7.1 column fills the second theme.
      if(t && type === 'observation'){
        const same = targets.filter(x => x.cg === t.cg);
        if(same.length > 1){
          const hn = assessNorm(header[c]);
          t = same.find(x => !used.has(x.key) && hn.includes(assessNorm(x.theme))) || same.find(x => !used.has(x.key)) || t;
        }
      }
      if(!t && type === 'motor') t = targets.find(x => !used.has(x.key) && targets.indexOf(x) >= i) || null; // months in order
      if(t) used.add(t.key);
      return { col: c, label: String(header[c] || 'Column ' + (c + 1)), target: t ? t.key : '' };
    });
    const roll = {}; (realPupilsCache || []).forEach(p => { roll[normPupilName(p.name)] = p; });
    const rows = body.map(r => {
      const name = splitRegisterFromName(r[nameCol]).name;
      const p = roll[normPupilName(name)];
      return { raw: name, pupilId: p ? p.id : '', include: !!name && !SI_TOTAL_WORDS.test(name), marks: columns.map(col => assessMark(r[col.col])), rawMarks: columns.map(col => String(r[col.col] || '')) };
    }).filter(r => r.raw);
    return { type, fileName, source, tally: false, targets, columns, rows, grid, headerFound: headerIdx >= 0, nameFound: header.some(c => SI_NAME_WORDS.includes(siNorm(c))) || rows.some(r => r.pupilId) };
  }

  // ---- the editable preview ----
  function assessSmartSet(path, value){
    const [kind, i, j] = path.split(':');
    const s = assessSmart; if(!s) return;
    if(kind === 'inc') s.rows[+i].include = value;
    else if(kind === 'pupil') s.rows[+i].pupilId = value ? +value : '';
    else if(kind === 'mark') s.rows[+i].marks[+j] = value;
    else if(kind === 'col') s.columns[+i].target = value;
    else if(kind === 'tkey'){ s.rows[+i].target = value; if(value) s.rows[+i].include = true; }
    else if(kind === 'tnum') s.rows[+i][j] = Math.max(0, parseInt(value, 10) || 0);
    renderAssessSmartPreview();
  }
  function assessSmartBlankUnknown(){ assessSmart.rows.forEach(r => { if(r.marks) r.marks = r.marks.map(m => m === '?' ? '' : m); }); renderAssessSmartPreview(); }

  function renderAssessSmartPreview(){
    const out = assessPanel(); const s = assessSmart;
    if(!out || !s) return;
    const sel = (path, opts, cur, extra) => `<select onchange="assessSmartSet('${path}', this.value)" style="padding:4px 6px; border:1px solid ${extra || 'var(--border)'}; border-radius:6px; font-size:12.5px; max-width:230px;">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const from = s.source === 'photo' ? 'the photo' : '“' + esc(s.fileName) + '”';
    let html = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 4px; font-weight:600;">Check and correct what I read from ${from} — nothing is saved yet</p>
      <p class="cap" style="margin:0 0 10px;">Change anything that's wrong: every mark, which child a row is, and what each column is. Untick rows to leave them out.${s.source === 'photo' ? ' Photos — especially handwriting — are often misread, so please look over every row.' : ''}</p>`;
    if(s.type === 'observation' && !s.tally){
      const byCg = {}; s.targets.forEach(t => { (byCg[t.cg] = byCg[t.cg] || []).push(t.theme); });
      const twice = Object.entries(byCg).filter(([, th]) => th.length > 1);
      if(twice.length) html += `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:8px 10px; margin:0 0 10px; font-size:12.5px;"><b>Same CG code under more than one theme this month:</b> ${twice.map(([cg, th]) => esc(cg) + ' (' + th.map(esc).join(', ') + ')').join('; ')}. Each column is matched to the theme named in its heading, or else in order — check the theme shown above each column.</div>`;
    }
    let problems = 0, toSave = 0;
    if(s.tally){
      const opts = [['', '— not a row to save —']].concat(s.targets.map(t => [t.key, t.label]));
      html += '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Use</th><th style="text-align:left;">In the file</th><th style="text-align:left;">Saves as</th><th><span class="gd gd-B" style="width:20px; height:20px; font-size:10px;">B</span></th><th><span class="gd gd-P" style="width:20px; height:20px; font-size:10px;">P</span></th><th><span class="gd gd-A" style="width:20px; height:20px; font-size:10px;">A</span></th></tr></thead><tbody>';
      s.rows.forEach((r, i) => {
        if(r.include && !r.target) problems++;
        if(r.include && r.target) toSave++;
        const num = f => `<input type="number" min="0" value="${r[f]}" onchange="assessSmartSet('tnum:${i}:${f}', this.value)" style="width:60px; padding:4px; text-align:center; border:1px solid var(--border); border-radius:6px;" />`;
        html += `<tr style="${r.include ? '' : 'opacity:.5;'}"><td><input type="checkbox" ${r.include ? 'checked' : ''} onchange="assessSmartSet('inc:${i}', this.checked)" /></td><td style="text-align:left;">${esc(r.raw) || '<span class="dim">(blank)</span>'}</td>`
          + `<td style="text-align:left;">${sel('tkey:' + i, opts, r.target, r.include && !r.target ? 'var(--crit,#d03b3b)' : '')}</td><td>${num('b')}</td><td>${num('p')}</td><td>${num('a')}</td></tr>`;
      });
      html += '</tbody></table></div>';
    } else {
      const colOpts = [['', '— skip this column —']].concat(s.targets.map(t => [t.key, t.label]));
      const pupilOpts = [['', '— not in this class (skip) —']].concat((realPupilsCache || []).map(p => [p.id, (p.register_no ? p.register_no + ' ' : '') + p.name]));
      const markOpts = [['', '—'], ['B', 'B'], ['P', 'P'], ['A', 'A'], ['?', '?']];
      html += '<div class="report-table-wrap"><table class="report-table" style="min-width:760px;"><thead><tr><th>Use</th><th style="text-align:left;">Child</th>'
        + s.columns.map((c, j) => `<th style="text-align:center; white-space:normal;"><div class="cap" style="margin-bottom:4px;">${esc(c.label)}</div>${sel('col:' + j, colOpts, c.target, c.target ? '' : 'var(--text-muted,#999)')}</th>`).join('')
        + '</tr></thead><tbody>';
      s.rows.forEach((r, i) => {
        const bad = r.include && !r.pupilId;
        if(bad) problems++;
        html += `<tr style="${r.include ? '' : 'opacity:.5;'}"><td><input type="checkbox" ${r.include ? 'checked' : ''} onchange="assessSmartSet('inc:${i}', this.checked)" /></td>`
          + `<td style="text-align:left;"><div class="cap">${esc(r.raw)}</div>${sel('pupil:' + i, pupilOpts, r.pupilId, bad ? 'var(--crit,#d03b3b)' : '')}</td>`
          + r.marks.map((m, j) => {
              const colOn = s.columns[j].target;
              if(r.include && colOn && m === '?') problems++;
              if(r.include && colOn && r.pupilId && m && m !== '?') toSave++;
              return `<td style="text-align:center; ${colOn ? '' : 'opacity:.4;'}">${sel('mark:' + i + ':' + j, markOpts, m, m === '?' ? 'var(--crit,#d03b3b)' : '')}${m === '?' ? `<div class="cap" style="color:var(--crit,#d03b3b);">read “${esc(r.rawMarks[j])}”</div>` : ''}</td>`;
            }).join('') + '</tr>';
      });
      html += '</tbody></table></div>';
    }
    html += `<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:12px;">
        <button class="btn-primary" style="width:auto; padding:8px 16px;" onclick="assessSmartConfirm()" ${problems || !toSave ? 'disabled' : ''}>Confirm — save ${toSave} ${s.tally ? 'row' + (toSave === 1 ? '' : 's') : 'mark' + (toSave === 1 ? '' : 's')}</button>
        <button class="btn" onclick="assessSmart = null; assessPanel().innerHTML = '<p class=&quot;cap&quot;>Import cancelled — nothing was saved.</p>';">Cancel</button>
        ${!s.tally && s.rows.some(r => r.marks.includes('?')) ? '<button class="btn" onclick="assessSmartBlankUnknown()">Leave unreadable marks blank</button>' : ''}
        ${problems ? `<span class="cap" style="color:var(--crit,#d03b3b);">${problems} thing${problems === 1 ? '' : 's'} to fix (red borders) — or untick those rows</span>` : ''}
      </div></div>`;
    out.innerHTML = html;
  }

  // ---- save: hand exactly what's shown to the assessment's own import ----
  async function assessRunImporter(resultId, run){
    const panel = assessPanel();
    const existing = document.getElementById(resultId);
    if(existing) existing.id = resultId + '__hold';
    const target = document.createElement('div'); target.id = resultId; target.style.marginTop = '10px';
    panel.appendChild(target);
    try { await run(); }
    finally { target.id = resultId + '__done'; if(existing) existing.id = resultId; }
  }
  async function assessSmartConfirm(){
    const s = assessSmart; if(!s) return;
    const panel = assessPanel();
    panel.querySelectorAll('button').forEach(b => b.disabled = true);
    try{
      if(s.type === 'motor'){
        const ratings = [];
        s.rows.forEach(r => { if(!r.include || !r.pupilId) return; r.marks.forEach((m, j) => {
          const month = s.columns[j].target; if(!month || !m || m === '?') return;
          ratings.push({ pupil_id: r.pupilId, skill_type: motorSkillType, month, rating: MOTOR_WORD_TO_RATING[m] });
        }); });
        pendingMotorImport = { ratings, notes: [] };
        await assessRunImporter('motorImportResult', confirmMotorImport);
      } else if(s.type === 'observation'){
        const rows = [['child_name', 'theme', 'cg_code', 'level_mark']];
        const byKey = {}; s.targets.forEach(t => { byKey[t.key] = t; });
        s.rows.forEach(r => { if(!r.include || !r.pupilId) return; const p = realPupilsCache.find(x => x.id === r.pupilId);
          r.marks.forEach((m, j) => { const t = byKey[s.columns[j].target]; if(!t || !m || m === '?') return; rows.push([p.name, t.theme, t.cg + (t.occ > 1 ? '#' + t.occ : ''), m]); }); });
        smartAssessHandoffRows = rows;
        await assessRunImporter('observationImportResult', importObservationAssessmentFile);
      } else if(s.type === 'pretest'){ // child-wise: each child's B / P / A per activity, saved into that child's Pre-Test record
        let n = 0;
        s.rows.forEach(r => { if(!r.include || !r.pupilId) return; const p = realPupilsCache.find(x => x.id === r.pupilId); if(!p) return;
          const store = preTestAssessmentEntries[p.name] = preTestAssessmentEntries[p.name] || {};
          r.marks.forEach((m, j) => { const act = s.columns[j].target; if(!act || !m || m === '?') return; store[String(+act - 1)] = m; n++; }); });
        if(n){ savePreTestAssessmentEntries(); syncPreTestTallyFromChildEntries(); }
        renderMonthlyAssessment(monthlyAssessmentTargetEl);
        const box = assessPanel(); if(box) box.innerHTML = `<div class="au-success">✓ Imported ${n} Pre-Test mark${n === 1 ? '' : 's'} — saved.</div>`;
      } else if(s.type === 'workbook'){
        const rows = [['cg_code', 'count_b', 'count_p', 'count_a']];
        s.rows.forEach(r => { if(r.include && r.target) rows.push([r.target, String(r.b), String(r.p), String(r.a)]); });
        smartAssessHandoffRows = rows;
        await assessRunImporter('workbookTallyImportResult', importWorkbookTallyFile);
      }
      assessSmart = null;
    } catch(err){
      const box = assessPanel(); if(box) box.insertAdjacentHTML('beforeend', `<div class="au-error">${esc(err.message || err)}</div>`);
    } finally {
      smartAssessHandoffRows = null;
    }
  }

  // ---- ▤ Assessment records as a tab on the Assessment screen (used from part 11) ----
  // Redraw the records view wherever it is showing.
  function assessmentRecordsRefresh(){
    const ab = document.getElementById('assessment-body');
    if(ab && !ab.classList.contains('hidden') && assessmentEntryType === 'records') renderMonthlyAssessment(monthlyAssessmentTargetEl);
    else renderAssessmentDashboard();
  }
  // Used by the entry screens: open the ▤ Assessment records tab.
  function openAssessmentRecords(type){
    if(type) assessmentRecordsType = type;
    assessmentEntryType = 'records';
    const ab = document.getElementById('assessment-body');
    if(ab && !ab.classList.contains('hidden')) renderMonthlyAssessment(monthlyAssessmentTargetEl);
    else switchSidebarSection('assessment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =================================================================
  // ASSESSMENT RECORDS → Σ TOTAL (all CGs). Every CG code with its
  // B / P / A counts from each assessment, the total, and the CG's
  // level — worked out only from what has actually been saved.
  //   Classroom Observation — each child's mark per CG item (the month)
  //   Workbook              — the class tally per competency (the month)
  //   Pre-Test              — the class baseline tally per activity
  //   Fine & Gross Motor    — each child's rating for the month's activity,
  //                           counted under the CG the portal's activity
  //                           areas give fine / gross motor (DOMAINS).
  // Level = average of B=1, P=2, A=3: under 1.67 → B, under 2.34 → P, else A.
  // =================================================================
  var cgTotalInclude = { observation: false, workbook: false, pretest: false, motor: false }; // tick to include
  // "CG-8.3", "CG 8.3", "C-8.3", "c8.3" → "CG-8.3" (some item lists write C-, some CG-).
  function cgCode(raw){
    const m = String(raw || '').toUpperCase().match(/(?:^|[^A-Z])C\s*G?\s*[-–.]?\s*(\d+(?:\.\d+)?)/);
    return m ? 'CG-' + m[1] : '';
  }
  function cgMajor(code){ const m = code.match(/^CG-(\d+)/); return m ? +m[1] : 999; }
  function cgLevel(b, p, a){
    const n = b + p + a; if(!n) return null;
    const avg = (b + 2 * p + 3 * a) / n;
    return { avg: Math.round(avg * 100) / 100, letter: avg < 1.67 ? 'B' : avg < 2.34 ? 'P' : 'A', pctPA: Math.round((p + a) / n * 100) };
  }
  function motorCgFor(type){
    const list = (typeof DOMAINS !== 'undefined' && Array.isArray(DOMAINS)) ? DOMAINS : [];
    const d = list.find(x => new RegExp(type === 'fine' ? 'fine\\s*motor' : 'gross\\s*motor', 'i').test(x.label || ''));
    return d ? cgCode(d.cg) : '';
  }

  // ---- One calculation of every CG's B / P / A, shared by Σ Total and the Dashboard Overview ----
  function computeCgTotals(month, reRender){
    const level = workbookLevelFromClassName();
    const ready = [
      ensureObservationThemesLoaded(level, month, reRender),
      ensureObservationAssessmentLoaded(month, reRender),
      ensureWorkbookCompetenciesLoaded(level, month, reRender),
      ensureWorkbookPagesLoaded(level, month, reRender),       // Workbook: child-wise marks per page (part 09)
      ensureWorkbookChildMarksLoaded(month, reRender),
      ensureMotorAssessmentLoaded(reRender)
    ];
    if(myClassInfo.class_id) ensureWorkbookMonthSubmissionLoaded(myClassInfo.class_id, month, reRender);
    ensurePreTestTallyForClass();
    if(ready.some(r => !r)) return { loading: true };

    const rows = {};
    const add = (code, src, tier, n, what) => {
      if(!code || !n) return;
      const r = rows[code] || (rows[code] = { code, items: new Set(), observation: { b: 0, p: 0, a: 0 }, workbook: { b: 0, p: 0, a: 0 }, pretest: { b: 0, p: 0, a: 0 }, motor: { b: 0, p: 0, a: 0 } });
      r[src][tier] += n; if(what) r.items.add(what);
    };
    const tierOf = t => t === 'E' || t === 'B' ? 'b' : t === 'P' ? 'p' : t === 'A' ? 'a' : '';
    const errors = [], recorded = { observation: 0, workbook: 0, pretest: 0, motor: 0 };
    const children = {}; // pupil id -> CG -> { observation:{b,p,a}, motor:{b,p,a} }
    const addChild = (pid, code, src, tier) => {
      if(!code) return;
      const c = children[pid] || (children[pid] = {});
      const r = c[code] || (c[code] = { observation: { b: 0, p: 0, a: 0 }, workbook: { b: 0, p: 0, a: 0 }, motor: { b: 0, p: 0, a: 0 } });
      r[src][tier]++;
    };
    const themes = observationThemesCache[level + '|' + month], marks = observationAssessmentCache[month];
    if(Array.isArray(themes) && marks && typeof marks === 'object'){
      themes.forEach(t => t.items.forEach(it => {
        realPupilsCache.forEach(p => { const k = tierOf((marks[p.id] || {})[it.id]); if(k){ add(cgCode(it.cg_code), 'observation', k, 1, 'Observation: ' + t.name); addChild(p.id, cgCode(it.cg_code), 'observation', k); recorded.observation++; } });
      }));
    } else errors.push('Classroom Observation');
    const books = workbookCompetenciesCache[level + '|' + month];
    const wbPages = workbookPagesCache[level + '|' + month], wbMarks = workbookChildMarksCache[month];
    if(Array.isArray(wbPages) && wbMarks && typeof wbMarks === 'object'){ // each child, each page, that page's CG — pages on the same CG add up
      wbPages.forEach(b => (b.pages || []).forEach(pg => realPupilsCache.forEach(p => { const k = tierOf((wbMarks[p.id] || {})[pg.id]);
        if(k){ const code = cgCode(pg.cg_code); add(code, 'workbook', k, 1, 'Workbook: ' + b.name); addChild(p.id, code, 'workbook', k); recorded.workbook++; } })));
    } else errors.push('Workbook');
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((act, idx) => { const t = preTestTallyEntries[String(idx)]; if(!t) return;
      const code = cgCode(act.cg);
      add(code, 'pretest', 'b', t.count_e || 0, 'Pre-Test'); add(code, 'pretest', 'p', t.count_p || 0, 'Pre-Test'); add(code, 'pretest', 'a', t.count_a || 0, 'Pre-Test');
      recorded.pretest += (t.count_e || 0) + (t.count_p || 0) + (t.count_a || 0); });
    let motorNote = '';
    if(motorAssessmentCache && typeof motorAssessmentCache === 'object' && MOTOR_MONTHS.includes(month)){
      ['fine', 'gross'].forEach(type => {
        const code = motorCgFor(type);
        if(!code){ motorNote += (type === 'fine' ? 'Fine' : 'Gross') + ' Motor has no CG code in the activity areas, so it is not counted. '; return; }
        realPupilsCache.forEach(p => { const r = motorRating(p.id, type, month); const k = r === 'R' ? 'b' : r === 'Y' ? 'p' : r === 'G' ? 'a' : '';
          if(k){ add(code, 'motor', k, 1, (type === 'fine' ? 'Fine' : 'Gross') + ' Motor: ' + MOTOR_ACTIVITIES[type][month].title); addChild(p.id, code, 'motor', k); recorded.motor++; } });
      });
    } else if(!MOTOR_MONTHS.includes(month)) motorNote = 'Fine & Gross Motor runs June–October, so it has nothing for ' + month + '. ';
    const codes = Object.keys(rows).sort((x, y) => cgMajor(x) - cgMajor(y) || parseFloat(x.slice(3)) - parseFloat(y.slice(3)));
    return { loading: false, rows, codes, errors, motorNote, books, recorded, children };
  }
  // The total for one CG row, counting only the ticked assessments.
  function cgRowTotal(r, include){
    const tot = { b: 0, p: 0, a: 0 };
    ['observation', 'workbook', 'pretest', 'motor'].forEach(k => { if(include[k]){ tot.b += r[k].b; tot.p += r[k].p; tot.a += r[k].a; } });
    return tot;
  }

  function renderCgTotalRecords(container){
    const termInfo = ASSESS_TERMS[currentAssessTerm()];
    const whole = recordsWholeTerm;
    const month = whole ? termInfo.label + ' (' + termInfo.span + ')' : currentWorkbookMonth; // the label used below
    const T = whole ? computeCgTotalsTerm(termInfo.months, assessmentRecordsRerender) : computeCgTotals(currentWorkbookMonth, assessmentRecordsRerender);
    if(T.loading){ container.appendChild(attNote('Loading every assessment for ' + month + '…')); return; }
    const { rows, codes, errors, motorNote, books } = T;

    const srcNames = { pretest: 'Pre-Test (baseline)', observation: 'Classroom Observation', workbook: 'Workbook', motor: 'Fine & Gross Motor' };
    const ctl = document.createElement('div');
    ctl.setAttribute('data-no-export', '1');
    ctl.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:0 0 12px; font-size:13px;';
    ctl.innerHTML = '<b style="margin-right:4px;">Count in the total:</b>' + Object.keys(srcNames).map(k => `<label style="display:inline-flex; gap:6px; align-items:center; white-space:nowrap; margin:0; padding:6px 12px; border:1px solid var(--border); border-radius:99px; background:${cgTotalInclude[k] ? 'var(--bg)' : '#fff'}; cursor:pointer; font-weight:500; text-transform:none; letter-spacing:0;"><input type="checkbox" style="margin:0; width:auto;" ${cgTotalInclude[k] ? 'checked' : ''} onchange="cgTotalInclude['${k}'] = this.checked; assessmentRecordsRefresh();" /> ${esc(srcNames[k])}</label>`).join('');
    container.appendChild(ctl);

    const report = document.createElement('div');
    container.appendChild(report);
    report.appendChild(mdSec('Total — every CG, ' + month, '<span class="reqs">CG-1…CG-13</span>'));
    if(!codes.length) report.appendChild(attNote('No data available — nothing has been recorded for ' + month + ' in any assessment yet.'));
    else if(!Object.keys(cgTotalInclude).some(k => cgTotalInclude[k])) report.appendChild(attNote('Every assessment is unticked above, so nothing is counted in the total — tick at least one.'));
    else {
      const cell = x => x.b + x.p + x.a ? `${x.b} · ${x.p} · ${x.a}` : '<span class="dim">—</span>';
      const lvl = L => L ? gradePill(L.letter, 'average ' + L.avg) : '<span class="dim">—</span>';
      let t = '<div class="report-table-wrap"><table class="report-table" style="min-width:980px;"><thead><tr><th style="text-align:left;">CG</th>'
        + Object.keys(srcNames).map(k => `<th style="${cgTotalInclude[k] ? '' : 'opacity:.45;'}">${esc(srcNames[k])}<br><span class="dim" style="font-weight:400;">B · P · A</span></th>`).join('')
        + '<th>Total B</th><th>Total P</th><th>Total A</th><th>Avg (1–3)</th><th>At P or above</th><th style="text-align:left;">CG level</th></tr></thead><tbody>';
      let lastMajor = null, grand = { b: 0, p: 0, a: 0 }, majorTot = null;
      const blanks = Object.keys(srcNames).map(() => '<td></td>').join('');
      const majorRow = () => { if(!majorTot) return; const L = cgLevel(majorTot.b, majorTot.p, majorTot.a);
        t += `<tr style="background:var(--bg); font-weight:600;"><td style="text-align:left;">CG-${lastMajor} overall</td>${blanks}<td>${majorTot.b}</td><td>${majorTot.p}</td><td>${majorTot.a}</td><td>${L ? L.avg : '—'}</td><td>${L ? L.pctPA + '%' : '—'}</td><td style="text-align:left;">${lvl(L)}</td></tr>`; };
      codes.forEach(code => {
        const r = rows[code]; const maj = cgMajor(code);
        if(maj !== lastMajor){ majorRow(); lastMajor = maj; majorTot = { b: 0, p: 0, a: 0 }; }
        const tot = cgRowTotal(r, cgTotalInclude);
        ['b', 'p', 'a'].forEach(k => { majorTot[k] += tot[k]; grand[k] += tot[k]; });
        const L = cgLevel(tot.b, tot.p, tot.a);
        t += `<tr><td style="text-align:left;"><b>${esc(code)}</b><div class="cap">${esc([...r.items].slice(0, 3).join(' · '))}${r.items.size > 3 ? ' …' : ''}</div></td>`
          + Object.keys(srcNames).map(k => `<td style="${cgTotalInclude[k] ? '' : 'opacity:.45;'}">${cell(r[k])}</td>`).join('')
          + `<td>${tot.b}</td><td>${tot.p}</td><td>${tot.a}</td><td>${L ? L.avg : '—'}</td><td>${L ? L.pctPA + '%' : '—'}</td><td style="text-align:left;">${lvl(L)}</td></tr>`;
      });
      majorRow();
      const G = cgLevel(grand.b, grand.p, grand.a);
      t += `<tr style="font-weight:700; border-top:2px solid var(--border);"><td style="text-align:left;">All CGs</td>${blanks}<td>${grand.b}</td><td>${grand.p}</td><td>${grand.a}</td><td>${G ? G.avg : '—'}</td><td>${G ? G.pctPA + '%' : '—'}</td><td style="text-align:left;">${lvl(G)}</td></tr>`;
      t += '</tbody></table></div>';
      const w = document.createElement('div');
      // On screen: one card per CG group. The full table stays (hidden) for the PDF download.
      w.innerHTML = '<div class="cg-pdf-only" style="display:none;">' + t + '</div>' + cgGroupCardsHtml(codes, rows, cgTotalInclude, srcNames, lvl);
      if(whole && T.perMonth){
        const lvlTxt = L => L ? gradeNum(L.letter) + (L.letter === 'A' ? ' Advanced' : L.letter === 'P' ? ' Proficient' : ' Beginner') + ' (' + L.avg + ')' : '<span class="dim">No data available</span>';
        let mt = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Month</th><th>Observation marks</th><th>Workbook children</th><th>Motor ratings</th><th>Marks in total</th><th style="text-align:left;">Class level</th></tr></thead><tbody>';
        T.perMonth.forEach(({ month: m, T: mt0 }) => {
          const g = mt0.codes.reduce((a, c) => { const x = cgRowTotal(mt0.rows[c], Object.assign({}, cgTotalInclude, { pretest: false })); return { b: a.b + x.b, p: a.p + x.p, a: a.a + x.a }; }, { b: 0, p: 0, a: 0 });
          const n = g.b + g.p + g.a;
          mt += `<tr><td style="text-align:left;"><b>${esc(m)}</b></td><td>${mt0.recorded.observation || '—'}</td><td>${mt0.recorded.workbook || '—'}</td><td>${mt0.recorded.motor || '—'}</td><td>${n || '—'}</td><td style="text-align:left;">${n ? lvlTxt(cgLevel(g.b, g.p, g.a)) : '<span class="dim">No data available</span>'}</td></tr>`;
        });
        mt += '</tbody></table></div>';
        const mw = document.createElement('div'); mw.innerHTML = mt;
        const mc = mdCard('Month by month — ' + month, 'What was recorded each month, and the class level from that month\u2019s marks (Pre-Test is the term baseline, so it is counted once in the table above, not per month).', mw);
        mc.style.marginBottom = '18px';
        report.appendChild(mc);
      }
      report.appendChild(mdCard('Every CG — ' + month, 'Counts are B · P · A. Level comes from the average score (B lowest, A highest): mostly B → Beginner, mostly P → Proficient, mostly A → Advanced. Only saved marks are counted; blanks never count. ' + (motorNote || 'Fine Motor counts under ' + (motorCgFor('fine') || '—') + ' and Gross Motor under ' + (motorCgFor('gross') || '—') + ', as in the activity areas. ') + (errors.length ? 'Could not load: ' + errors.join(', ') + '.' : ''), w));
    }

    // ---- Each child: their level in every CG (Observation, Workbook and Motor are per child) ----
    if(codes.length){
      const useSrc = ['observation', 'workbook', 'motor'].filter(k => cgTotalInclude[k]);
      report.appendChild(mdSec('Each child — ' + month, ''));
      if(!useSrc.length){
        report.appendChild(attNote('Tick Classroom Observation, Workbook and / or Fine & Gross Motor above to see each child\u2019s report. (Pre-Test is saved as class counts here, so it cannot be shown child by child.)'));
      } else {
        const kids = T.children || {};
        const cgCols = codes.filter(c => realPupilsCache.some(p => { const r = (kids[p.id] || {})[c]; return r && useSrc.some(k => r[k] && r[k].b + r[k].p + r[k].a); }));
        if(!cgCols.length){ report.appendChild(attNote('No data available — no child-by-child marks for ' + month + ' in the ticked assessments.')); }
        else {
          const sumFor = r => { const t = { b: 0, p: 0, a: 0 }; if(r) useSrc.forEach(k => { if(r[k]) ['b', 'p', 'a'].forEach(x => t[x] += r[k][x]); }); return t; };
          const pill = L => L ? gradeDot(L.letter, 22, 'average ' + L.avg) : '<span class="dim">—</span>';
          let ct = '<div class="report-table-wrap"><table class="report-table" style="min-width:' + Math.max(700, 260 + cgCols.length * 70) + 'px;"><thead><tr><th>Roll</th><th style="text-align:left;">Child</th>'
            + cgCols.map(c => `<th>${esc(c)}</th>`).join('') + '<th>B · P · A</th><th>Avg</th><th style="text-align:left;">Overall</th></tr></thead><tbody>';
          realPupilsCache.forEach((p, i) => {
            const all = { b: 0, p: 0, a: 0 };
            const cells = cgCols.map(c => { const t = sumFor((kids[p.id] || {})[c]); all.b += t.b; all.p += t.p; all.a += t.a; return `<td>${pill(cgLevel(t.b, t.p, t.a))}</td>`; }).join('');
            const L = cgLevel(all.b, all.p, all.a);
            ct += `<tr><td>${i + 1}</td><td style="text-align:left;"><b>${esc(p.name)}</b>${p.register_no ? '<div class="cap">Reg. no. ' + esc(p.register_no) + '</div>' : ''}</td>${cells}`
              + `<td>${all.b + all.p + all.a ? all.b + ' · ' + all.p + ' · ' + all.a : '<span class="dim">—</span>'}</td><td>${L ? L.avg : '—'}</td>`
              + `<td style="text-align:left;">${L ? gradePill(L.letter, 'average ' + L.avg) : '<span class="dim">No data available</span>'}</td></tr>`;
          });
          ct += '</tbody></table></div>';
          const cw = document.createElement('div');
          cw.innerHTML = '<div class="cg-pdf-only" style="display:none;">' + ct + '</div>' + childCardsHtml(cgCols, kids, sumFor);
          report.appendChild(mdCard('Every child — ' + month, 'Each child\u2019s level per CG from ' + useSrc.map(k => ({ observation: 'Classroom Observation', workbook: 'Workbook', motor: 'Fine & Gross Motor' })[k]).join(', ') + ' (hover a letter to see the average). Pre-Test is a class count, so it is in the CG table above but not here. Only saved marks are counted.', cw));
        }
      }
    }

    const sub = workbookMonthSubmissionCache[month];
    const wbSubmitted = sub && typeof sub === 'object' && sub.submitted;
    const dl = document.createElement('div');
    dl.className = 'card'; dl.setAttribute('data-no-export', '1'); dl.setAttribute('data-dl-end', '1');
    dl.style.cssText = 'padding:14px 18px; margin:18px 0 0;';
    dl.innerHTML = `<b>⬇ Download the records — ${esc(month)}</b><p class="cap" style="margin:3px 0 10px;">The total above, or any one assessment's full report.</p><div style="display:flex; gap:8px; flex-wrap:wrap;"></div>`;
    const btns = dl.lastElementChild;
    const mk = (label, fn, why) => { const b = document.createElement('button'); b.className = btns.children.length ? 'btn' : 'btn-primary'; if(!btns.children.length) b.style.cssText = 'width:auto; padding:9px 16px;'; b.textContent = label; if(why){ b.disabled = true; b.title = why; } else b.onclick = fn; btns.appendChild(b); };
    mk(whole ? '⬇ Collective report — ' + termInfo.label + ' (PDF)' : '⬇ Total — every CG (PDF)', () => exportReportPdf(report, (whole ? 'Assessment — collective report — ' : 'Assessment total — every CG — ') + month + ' — ' + (myClassInfo.class_name || ''), (whole ? 'assessment-' + termInfo.label.replace(/\s+/g, '').toLowerCase() : 'assessment-total-' + month.toLowerCase())), codes.length ? '' : 'Nothing recorded yet');
    if(whole){ container.appendChild(dl); return; } // the collective report is the one download for a whole term
    mk('⬇ Classroom Observation', downloadObservationAssessmentPdf);
    mk('⬇ Workbook', () => downloadWorkbookMonthReportPdf(books, month), wbSubmitted ? '' : 'Submit this month\u2019s workbook marks in Assessment → Workbook first');
    mk('⬇ Pre-Test', downloadPreTestClassPdf);
    mk('⬇ Fine & Gross Motor', downloadMotorAssessmentPdf);
    container.appendChild(dl);
  }

  // =================================================================
  // ASSESSMENT DASHBOARD → OVERVIEW — from real saved marks only (the
  // same CG totals as Assessment → ▤ Assessment records → Σ Total).
  // =================================================================
  function renderAssessmentOverviewReal(container){
    if(!ensurePupilsLoadedFor(container, () => renderAssessmentDashboard())) return;
    const period = dashPeriodGet(), month = period.label + (dashSource === 'all' ? '' : ' · ' + dashSourceLabel()); // period + which assessment (js/assess-periods.js)
    container.appendChild(mdSec('Assessment dashboard — ' + month, '<span class="reqs">REP-01…07</span>'));
    const bar = document.createElement('div'); bar.className = 'fbar'; bar.setAttribute('data-no-export', '1'); bar.style.marginBottom = '14px';
    bar.innerHTML = '<div class="ctl"><label>Period</label>' + dashPeriodSelectHtml() + '</div>';
    bar.querySelector('select').onchange = e => dashPeriodChange(e.target.value);
    container.appendChild(bar);
    container.appendChild(dashSourceBar()); // All assessments · Classroom Observation · Workbook · Pre-Test · Fine & Gross Motor

    const T = computeCgTotalsPeriod(period, () => renderAssessmentDashboard());
    if(T.loading){ container.appendChild(attNote('Loading the saved assessments for ' + month + '…')); return; }
    const report = document.createElement('div');
    report.style.cssText = 'display:flex; flex-direction:column; gap:20px;'; // even space between the tiles and every card
    container.appendChild(report);
    const all = dashSourceInclude(); // only the chosen assessment, or all of them
    const cgs = T.codes.map(c => { const tot = cgRowTotal(T.rows[c], all); return { code: c, tot, L: cgLevel(tot.b, tot.p, tot.a), items: [...T.rows[c].items] }; }).filter(x => x.L);
    if(!cgs.length){
      report.appendChild(attNote('No data available — no assessment has been recorded for ' + month + ' yet. Grade children in Assessment (Classroom Observation, Workbook, Pre-Test, Fine & Gross Motor) and this dashboard fills in from what is saved.'));
      return;
    }
    const grand = cgs.reduce((a, x) => ({ b: a.b + x.tot.b, p: a.p + x.tot.p, a: a.a + x.tot.a }), { b: 0, p: 0, a: 0 });
    const G = cgLevel(grand.b, grand.p, grand.a);
    const beginners = cgs.filter(x => x.L.letter === 'B').sort((x, y) => x.L.avg - y.L.avg);
    const levelText = L => L.letter === 'A' ? 'Advanced' : L.letter === 'P' ? 'Proficient' : 'Beginner';
    const grid = document.createElement('div'); grid.className = 'g g4';
    grid.appendChild(mdTile('Class level', levelText(G), 'average ' + G.avg + ' of 3', gradePill(G.letter, 'average ' + G.avg), 'REP-01'));
    grid.appendChild(mdTile('At Proficient or above', G.pctPA, '% of all marks', mdPill(grand.b + grand.p + grand.a + ' marks', 'neu'), 'REP-02'));
    grid.appendChild(mdTile('CGs assessed', cgs.length, 'with saved marks', mdPill(cgs.filter(x => x.L.letter !== 'B').length + ' at P or A', 'good'), 'REP-03'));
    grid.appendChild(mdTile('CGs needing attention', beginners.length, 'at Beginner level', beginners.length ? mdPill('Plan support', 'crit') : mdPill('None', 'good'), 'REP-04'));
    report.appendChild(grid);
    // Every CG with its B · P · A totals across all assessments (colour-coded) — js/grade-scale.js
    const ct = document.createElement('div'); ct.innerHTML = gradeTotalsTable(cgs, grand, cgLevel);
    report.appendChild(mdCard('CG totals — ' + month, 'Every assessment\u2019s marks for each CG added together: Classroom Observation, Workbook, Pre-Test and Fine & Gross Motor. Several activities on the same CG all count.', ct));
    const kt = document.createElement('div'); kt.innerHTML = dashSource === 'pretest' ? '<p class="cap" style="margin:0;">Pre-Test is saved as class counts for now, so it has no child-by-child totals here. Its CG levels are in the CG totals above.</p>' : gradeChildrenTable(realPupilsCache, T.children || {}, cgLevel, dashSource === 'all' ? null : dashSource); // each child's own totals (js/grade-scale.js)
    report.appendChild(mdCard('Each child — totals, ' + month, 'Each child\u2019s own marks added up across every CG (Classroom Observation, Workbook and Fine & Gross Motor). Open “CG by CG” to see the levels behind it. Pre-Test is a class count, so it is in the CG totals above but not here.', kt));

const src = [['pretest', 'Pre-Test (baseline)', 'marks (class counts)'], ['observation', 'Classroom Observation', 'marks'], ['workbook', 'Workbook', 'child marks'], ['motor', 'Fine & Gross Motor', 'ratings']];
    const recWrap = document.createElement('div');
    recWrap.innerHTML = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Assessment</th><th>Recorded for ' + esc(month) + '</th></tr></thead><tbody>'
      + src.map(([k, label, unit]) => `<tr><td style="text-align:left;"><b>${esc(label)}</b></td><td>${T.recorded[k] ? T.recorded[k] + ' ' + unit : '<span class="dim">No data available</span>'}</td></tr>`).join('') + '</tbody></table></div>';
    report.appendChild(mdCard('What has been recorded', 'Only saved marks are counted — nothing is estimated. A mark is one child on one item (Pre-Test is a class count, so each child counted is one mark). Pre-Test counts are kept on this device; the others are in the database.', recWrap));

    const bWrap = document.createElement('div');
    bWrap.innerHTML = beginners.length
      ? '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">CG</th><th style="text-align:left;">From</th><th>B · P · A</th><th>Avg</th><th>At P or above</th></tr></thead><tbody>'
        + beginners.map(x => `<tr><td style="text-align:left;"><b>${esc(x.code)}</b></td><td style="text-align:left;" class="cap">${esc(x.items.slice(0, 3).join(' · '))}</td><td>${x.tot.b} · ${x.tot.p} · ${x.tot.a}</td><td>${x.L.avg}</td><td>${x.L.pctPA}%</td></tr>`).join('') + '</tbody></table></div>'
      : '<p class="cap" style="margin:0;">No CG is at Beginner level this month.</p>';
    report.appendChild(mdCard('CGs at Beginner level', 'Mostly B — the average is in the Beginner band. The full list of every CG is in Assessment → ▤ Assessment records → Σ Total.', bWrap));
    container.appendChild(reportDownloadBar(() => report, 'Assessment dashboard — ' + month + ' — ' + (myClassInfo.class_name || ''), 'assessment-dashboard-' + month.toLowerCase()));
  }

  // =================================================================
  // CHILD RECORD — one child, from real saved data only.
  // =================================================================
  var childRecordName = null;
  function renderChildRecordReal(selectedName){
    const container = document.getElementById('childrecord-body');
    container.innerHTML = '';
    const rerender = () => renderChildRecordReal(childRecordName);
    if(!ensurePupilsLoadedFor(container, rerender)) return;
    if(!realPupilsCache.length){ container.appendChild(attNote('No data available — there are no children on this class\u2019s roll yet.')); return; }
    const pupil = realPupilsCache.find(p => p.name === selectedName) || realPupilsCache.find(p => p.name === childRecordName) || realPupilsCache[0];
    childRecordName = pupil.name;
    const idx = realPupilsCache.indexOf(pupil);

    const bar = document.createElement('div'); bar.className = 'fbar'; bar.setAttribute('data-no-export', '1');
    bar.innerHTML = `<div class="ctl"><label>Child</label><select style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px; min-width:240px;"></select></div>
      <div class="ctl"><label>Month</label><select style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>
      <div class="grow" style="flex:1;"></div><div class="cap">Roll ${idx + 1} of ${realPupilsCache.length}${pupil.register_no ? ' · Reg. no. ' + esc(pupil.register_no) : ''} · ${esc(myClassInfo.class_name || '')} · ${esc(myClassInfo.school_name || '')}</div>`;
    const [cSel, mSel] = bar.querySelectorAll('select');
    realPupilsCache.forEach(p => { const o = document.createElement('option'); o.value = p.name; o.textContent = (p.register_no ? p.register_no + ' ' : '') + p.name; if(p === pupil) o.selected = true; cSel.appendChild(o); });
    cSel.onchange = () => renderChildRecordReal(cSel.value);
    WORKBOOK_MONTHS.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; if(m === currentWorkbookMonth) o.selected = true; mSel.appendChild(o); });
    mSel.onchange = () => { currentWorkbookMonth = mSel.value; rerender(); };
    bar.style.marginBottom = '24px';
    container.appendChild(bar);

    const month = currentWorkbookMonth, level = workbookLevelFromClassName();
    const months = attAcademicMonths();
    const loaded = [
      ensureObservationThemesLoaded(level, month, rerender),
      ensureObservationAssessmentLoaded(month, rerender),
      ensureMotorAssessmentLoaded(rerender),
      attEnsureMonths(months, () => { const b = document.getElementById('childrecord-body'); if(b && !b.classList.contains('hidden')) rerender(); })
    ];
    if(!familyRecordsLoaded) ensureFamilyRecordsLoaded(rerender);
    if(loaded.some(x => !x)){
      container.appendChild(attNote('Loading ' + pupil.name + '\u2019s record…'));
      return;
    }
    const report = document.createElement('div');
    container.appendChild(report);
    report.appendChild(mdSec('Child Record — ' + pupil.name, '<span class="reqs">REP-09 · FDB-01</span>'));

    // Attendance, month by month
    const att = months.map(o => { const s = attMonthStats(o.y, o.m); const c = s.children.find(x => x.id === pupil.id) || { present: 0, absent: 0, marked: 0, pct: null, longest: 0 }; return { o, c }; });
    const yearP = att.reduce((a, x) => a + x.c.present, 0), yearM = att.reduce((a, x) => a + x.c.marked, 0);
    // Observation this month
    const themes = observationThemesCache[level + '|' + month];
    const marks = (observationAssessmentCache[month] || {})[pupil.id] || {};
    const obsRows = Array.isArray(themes) ? themes.flatMap(t => t.items.map(it => ({ theme: t.name, cg: it.cg_code, v: marks[it.id] || '' }))) : [];
    const obsMarked = obsRows.filter(r => r.v);
    const obsL = cgLevel(obsMarked.filter(r => r.v === 'E').length, obsMarked.filter(r => r.v === 'P').length, obsMarked.filter(r => r.v === 'A').length);
    // Motor
    const motorLetters = type => MOTOR_MONTHS.map(m => ({ m, r: motorLetter(motorRating(pupil.id, type, m)) }));
    const motorAny = ['fine', 'gross'].some(t => motorLetters(t).some(x => x.r));
    // Family
    const fam = familyRecords[pupil.name];
    const g1 = fam && Array.isArray(fam.guardianNames) ? (fam.guardianNames.find(g => g.primary) || fam.guardianNames[0]) : null;

    const lv = L => L ? gradePill(L.letter, 'average ' + L.avg) : mdPill('No data available', 'neu');
    const grid = document.createElement('div'); grid.className = 'g g4';
    grid.appendChild(mdTile('Attendance this year', yearM ? Math.round(yearP / yearM * 1000) / 10 : '—', yearM ? '% of ' + yearM + ' days marked' : 'No data available', yearM ? mdPill(yearP + ' present', 'neu') : mdPill('No data available', 'neu'), 'REP-09'));
    grid.appendChild(mdTile('Observation — ' + month, obsMarked.length, obsRows.length ? 'of ' + obsRows.length + ' CG items graded' : 'No data available', lv(obsL), 'ASM-O1'));
    grid.appendChild(mdTile('Fine & Gross Motor', ['fine', 'gross'].reduce((a, t) => a + motorLetters(t).filter(x => x.r).length, 0), 'ratings, June–October', motorAny ? mdPill('Recorded', 'good') : mdPill('No data available', 'neu'), 'ASM-M1'));
    grid.appendChild(mdTile('Family profile', fam ? 'On file' : '—', fam ? (g1 ? (g1.name || '') : '') : 'No data available', fam ? mdPill('Profile', 'good') : mdPill('No data available', 'neu'), 'FAM-01'));
    report.appendChild(grid);

    const tbl = (head, rows) => { const w = document.createElement('div'); w.innerHTML = '<div class="report-table-wrap"><table class="report-table"><thead><tr>' + head.map(h => `<th style="text-align:${h[1] || 'center'};">${esc(h[0])}</th>`).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>'; return w; };
    report.appendChild(mdCard('Attendance, month by month', null, tbl([['Month', 'left'], ['Present'], ['Absent'], ['Days marked'], ['Attendance']],
      att.map(({ o, c }) => c.marked ? `<tr><td style="text-align:left;"><b>${esc(attMonthLabel(o, true))}</b></td><td>${c.present}</td><td>${c.absent}</td><td>${c.marked}</td><td>${c.pct}%</td></tr>`
        : `<tr><td style="text-align:left;"><b>${esc(attMonthLabel(o, true))}</b></td><td colspan="4" class="dim">No data available</td></tr>`))));
    report.appendChild(obsRows.length
      ? mdCard('Classroom Observation — ' + month, 'B Beginner · P Proficient · A Advanced · — not graded', tbl([['Topic', 'left'], ['CG'], ['Mark']],
          obsRows.map(r => `<tr><td style="text-align:left;">${esc(r.theme)}</td><td>${esc(r.cg)}</td><td>${r.v ? recordsLetterPill(TIER_INFO[r.v].letter, TIER_INFO[r.v].c) : '<span class="dim">—</span>'}</td></tr>`)))
      : attNote('Classroom Observation — No data available for ' + month + '.'));
    report.appendChild(motorAny
      ? mdCard('Fine & Gross Motor', 'B Beginner · P Proficient · A Advanced · — not rated', tbl([['Sheet', 'left'], ...MOTOR_MONTHS.map(m => [m])],
          ['fine', 'gross'].map(t => `<tr><td style="text-align:left;"><b>${t === 'fine' ? 'Fine Motor' : 'Gross Motor'}</b></td>${motorLetters(t).map(x => `<td>${x.r || '<span class="dim">—</span>'}</td>`).join('')}</tr>`)))
      : attNote('Fine & Gross Motor — No data available.'));
    report.appendChild(fam
      ? mdCard('Family', null, tbl([['Parent / guardian', 'left'], ['Relation'], ['Phone']],
          fam.guardianNames.map(g => `<tr><td style="text-align:left;"><b>${esc(g.name || '—')}</b></td><td>${esc(g.rel || '—')}</td><td>${esc(g.phone || '—')}</td></tr>`)))
      : attNote('Family — No data available. Add the family profile in Family & Parents.'));
    renderChildFeedbackSection(report, pupil.name); // the teacher's own feedback notes (real)
    // Even spacing between every block of the record (tiles, tables, notes).
    Array.from(report.children).forEach((el, i) => { el.style.marginTop = i === 0 ? '0' : (el.classList.contains('sec') ? '30px' : '20px'); el.style.marginBottom = '0'; });
    const firstGrid = report.querySelector(':scope > .g'); if(firstGrid) firstGrid.style.marginTop = '14px';
    container.appendChild(reportDownloadBar(() => report, 'Child Record — ' + pupil.name, 'child-record-' + pupil.name.replace(/\s+/g, '-').toLowerCase()));
  }

  // ---- Assessment records: one topic / workbook / sheet at a time ----
  // A dropdown instead of every section stacked on one long page. The
  // choice is remembered while the page is open. Downloads still cover
  // everything.
  var recordsPickState = {};
  function recordsPick(container, key, label, options){
    let cur = recordsPickState[key];
    if(!options.some(o => o[0] === cur)) cur = options[0] ? options[0][0] : '__all';
    recordsPickState[key] = cur;
    const bar = document.createElement('div');
    bar.className = 'fbar'; bar.setAttribute('data-no-export', '1'); bar.style.marginBottom = '14px';
    bar.innerHTML = `<div class="ctl"><label>${esc(label)}</label><select style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px; min-width:280px; max-width:100%;">${options.map(o => `<option value="${esc(o[0])}" ${o[0] === cur ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`;
    bar.querySelector('select').onchange = e => { recordsPickState[key] = e.target.value; assessmentRecordsRefresh(); };
    container.appendChild(bar);
    return cur;
  }

  // =================================================================
  // IMPORT CARDS — one look everywhere: three equal buttons
  //   📷 Scan a photo · 📥 Import a file · ⬇ Download sheet
  // on Class Attendance, Admissions and every Assessment tab.
  // =================================================================
  (function importButtonStyle(){
    if(document.getElementById('impBtnStyle')) return;
    const st = document.createElement('style'); st.id = 'impBtnStyle';
    st.textContent = '.imp-btns{display:flex;gap:8px;flex-wrap:wrap;align-items:stretch;}'
      + '.imp-btn{box-sizing:border-box;min-width:170px;height:42px;padding:0 16px;margin:0;border-radius:8px;border:1px solid var(--border);background:#fff;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;line-height:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;white-space:nowrap;}'
      + '.imp-btn.primary{background:var(--primary);border-color:var(--primary);color:#fff;}'
      + '.imp-btn:hover{filter:brightness(.96);}'
      + '.imp-card{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}'
      + '.imp-card .imp-text{flex:1;min-width:260px;}'
      + '@media (max-width:700px){.imp-btns{width:100%;}.imp-btn{flex:1 1 100%;min-width:0;}}';
    (document.head || document.documentElement).appendChild(st);
  })();
function importButtonsHtml(photoCall, fileCall, manualCall, downloadCall, downloadLabel){
  return `
    <div class="imp-btns">
      
      <button
        type="button"
        class="imp-btn"
        onclick="${photoCall}">
        📷 Scan a photo
      </button>

      <button
        type="button"
        class="imp-btn primary"
        onclick="${fileCall}">
        📥 Import a file
      </button>

      <button
        type="button"
        class="imp-btn"
        onclick="${manualCall}">
        ✍ Enter manually
      </button>

      <button
        type="button"
        class="imp-btn"
        onclick="${downloadCall}">
        ↓ ${downloadLabel || 'Download template'}
      </button>

    </div>
  `;
}

  // The import panel that is on screen (Class Attendance or Admissions).
  function siPanel(){
    const all = Array.from(document.querySelectorAll('[data-si-panel]'));
    const shown = el => { for(let n = el; n && n !== document.body; n = n.parentElement){ if(n.classList.contains('hidden') || n.style.display === 'none' || (window.getComputedStyle && getComputedStyle(n).display === 'none')) return false; } return true; };
    return all.find(shown) || all[0] || document.getElementById('smartImportPanel');
  }

  // ---- 📷 a photo of a register (attendance) or a class list (admissions) ----
  function smartImportPhoto(mode){
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.setAttribute('capture', 'environment');
    input.onchange = async () => {
      const file = input.files[0]; if(!file) return;
      const out = siPanel();
      try{
        out.innerHTML = '<p class="sub">Getting the photo reader ready…</p>';
        await assessLoadTesseract();
        const canvas = await assessPrepareImage(file);
        const result = await Tesseract.recognize(canvas, 'eng', { logger: m => { if(m.status === 'recognizing text') out.innerHTML = `<p class="sub">Reading the photo… ${Math.round((m.progress || 0) * 100)}%</p>`; } });
        const lines = ((result.data && result.data.lines) || []).map(l => l.text).filter(t => t && t.trim());
        const grid = mode === 'roll' ? photoClassListGrid(lines) : photoRegisterGrid(lines);
        photoGridSource = 'photo'; photoGridSheetName = null;
        if(grid.length < 2) throw new Error('No names could be read from this photo. Take it again in good light, straight on, with the whole page in view.');
        renderPhotoGridEditor(grid, mode);
      } catch(err){ out.innerHTML = `<div class="au-error">${esc(err.message || err)}</div>`; }
    };
    input.click();
  }
  // Register photo → [header, ...rows]: name, then one mark per day.
  function photoRegisterGrid(lines){
    const markRe = /^(p|a|h|pr|ab|✓|✔|✗|✘|x|-|\.)$/i;
    let header = null; const rows = [];
    lines.forEach(line => {
      const toks = line.replace(/[|\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
      if(!toks.length) return;
      const nameAt = toks.findIndex(t => /^name$/i.test(t));
      const nums = toks.filter(t => /^([1-9]|[12]\d|3[01])$/.test(t));
      if(!header && (nameAt >= 0 || nums.length >= 5)){
        header = ['Student Name', ...(nameAt >= 0 ? toks.slice(nameAt + 1) : nums)];
        return;
      }
      // Marks = the short items at the end of the line (1–2 characters). A
      // misread one (e.g. "8" for B, "4" for A) is kept and shown in red to fix.
      let k = toks.length;
      while(k > 1 && toks[k - 1].length <= 2) k--;
      const marks = toks.slice(k);
      if(!marks.length || marks.filter(t => markRe.test(t)).length < Math.max(1, marks.length / 2)) return; // not a child row
      const name = toks.slice(0, k).join(' ');
      if(SI_TOTAL_WORDS.test(splitRegisterFromName(name).name)) return; // a "Total" line
      rows.push([name, ...marks.map(t => t.toUpperCase())]);
    });
    if(!rows.length) return [];
    const width = Math.max(...rows.map(r => r.length));
    if(!header) header = ['Student Name', ...Array.from({ length: width - 1 }, (_, i) => String(i + 1))];
    while(header.length < width) header.push(String(header.length));
    return [header, ...rows];
  }
  // Class-list photo → [header, ...rows]: one name per line (a register number in front is kept).
  function photoClassListGrid(lines){
    const rows = lines.map(l => l.replace(/[|\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(l => /[a-z]{2,}/i.test(l) && !/^(sr\.?|roll|no\.?|name|student name|class|register)\b/i.test(l))
      .map(l => [l]);
    return rows.length ? [['Student Name'], ...rows] : [];
  }
  // Edit every cell of what the photo gave, then continue to the usual preview.
  var photoGrid = null, photoGridMode = null, photoGridSheetName = null, photoGridSource = 'photo';
  function renderPhotoGridEditor(grid, mode){
    photoGrid = grid; photoGridMode = mode;
    const out = siPanel();
    const isRoll = mode === 'roll';
    const markOk = v => /^(P|A|H|)$/i.test(String(v || '').trim());
    let t = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 4px; font-weight:600;">${photoGridSource === 'manual' ? '✍ Enter the marks — nothing is saved yet.' : 'Step 1 — check what was read from the photo. Nothing is saved yet.'}</p>
      <p class="cap" style="margin:0 0 10px;">${photoGridSource === 'manual' ? 'Type P, A or H for each child and day (leave blank if not marked); marks already saved are filled in.' : 'Correct any name or mark — photos, especially handwriting, are often misread.'} ${isRoll ? 'One child per row; a register number in front of the name is kept.' : 'The top row is the day of the month for each column; marks are P, A or H (leave blank if not marked). Red cells are not P, A or H.'} Untick a row to leave it out.</p>
      <div class="report-table-wrap"><table class="report-table" style="min-width:${isRoll ? 420 : 760}px;"><thead><tr><th>Use</th>`;
    grid[0].forEach((h, j) => { t += `<th>${j === 0 ? 'Child' : `<input value="${esc(h)}" onchange="photoGrid[0][${j}] = this.value" style="width:44px; padding:3px; text-align:center; border:1px solid var(--border); border-radius:5px;">`}</th>`; });
    t += '</tr></thead><tbody>';
    grid.slice(1).forEach((r, i) => {
      t += `<tr><td><input type="checkbox" checked onchange="photoGrid[${i + 1}].__skip = !this.checked" /></td>`;
      for(let j = 0; j < grid[0].length; j++){
        const v = r[j] == null ? '' : r[j];
        t += j === 0
          ? `<td style="text-align:left;"><input value="${esc(v)}" onchange="photoGrid[${i + 1}][0] = this.value" style="width:100%; min-width:180px; padding:5px 7px; border:1px solid var(--border); border-radius:6px;"></td>`
          : `<td><input value="${esc(v)}" maxlength="2" onchange="photoGrid[${i + 1}][${j}] = this.value.toUpperCase(); this.style.borderColor = /^(P|A|H|)$/i.test(this.value.trim()) ? '' : 'var(--crit,#d03b3b)';" style="width:40px; padding:4px; text-align:center; border:1px solid ${markOk(v) ? 'var(--border)' : 'var(--crit,#d03b3b)'}; border-radius:5px;"></td>`;
      }
      t += '</tr>';
    });
    t += `</tbody></table></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
        <button class="imp-btn primary" onclick="photoGridContinue()">Next — preview</button>
        <button class="imp-btn" onclick="photoGrid = null; siPanel().innerHTML = '<p class=&quot;cap&quot;>Import cancelled — nothing was saved.</p>';">Cancel</button>
      </div></div>`;
    out.innerHTML = t;
  }
  function photoGridContinue(){
    if(!photoGrid) return;
    const rows = photoGrid.filter((r, i) => i === 0 || (!r.__skip && String(r[0] || '').trim()));
    if(rows.length < 2){ alert('Keep at least one child row.'); return; }
    if(photoGridMode === 'roll'){ renderSmartClassListStep('the photo', rows.map(r => r.slice(0, 1))); return; }
    // An attendance grid: hand it to the same reader as a file (Step 1 there asks for the month).
    smartImport = { fileName: photoGridSource === 'manual' ? 'the sheet you typed' : 'the photo', sheets: [siAnalyseSheet(photoGridSheetName || 'Photo', rows)], addMissing: !(Array.isArray(realPupilsCache) && realPupilsCache.length), markHolidays: true };
    photoGridSheetName = null; photoGridSource = 'photo';
    if(!smartImport.sheets[0].include){ siPanel().innerHTML = '<div class="au-error">The day numbers across the top could not be read — fix them in the first row (1, 2, 3 …) and try again.</div>'; renderPhotoGridEditor(photoGrid, photoGridMode); return; }
    renderSmartImportMapping();
  }

  // =================================================================
  // ASSESSMENT TERMS — Term 1 (June–October) and Term 2 (November–March).
  // One choice for the whole Assessment section: every tab's month
  // pickers (Observation From/To, Workbook, Assessment records) only
  // offer the chosen term's months, and the Pre-Test keeps a separate
  // tally for each term. It opens on the term we are in.
  // =================================================================
  const ASSESS_TERMS = {
    1: { label: 'Term 1', span: 'June – October', months: ['June', 'July', 'August', 'September', 'October'] },
    2: { label: 'Term 2', span: 'November – March', months: ['November', 'December', 'January', 'February', 'March'] }
  };
  var assessmentTerm = null;
  function currentAssessTerm(){
    if(assessmentTerm) return assessmentTerm;
    const m = new Date().getMonth(); // 0 = Jan
    return (m >= 5 && m <= 9) ? 1 : 2;  // June–October → Term 1; otherwise Term 2
  }
  function assessTermMonths(){ return ASSESS_TERMS[currentAssessTerm()].months; }
  // Keep the shared month inside the chosen term.
  function syncMonthToTerm(){
    const ms = assessTermMonths();
    if(!ms.includes(currentWorkbookMonth)){
      const now = new Date().toLocaleDateString('en-GB', { month: 'long' });
      currentWorkbookMonth = ms.includes(now) ? now : ms[0];
    }
    if(typeof obsRangeFrom !== 'undefined'){
      if(!ms.includes(obsRangeFrom)) obsRangeFrom = currentWorkbookMonth;
      if(!ms.includes(obsRangeTo)) obsRangeTo = currentWorkbookMonth;
    }
  }
  function switchAssessTerm(t){
    if(currentAssessTerm() === t) return;
    assessmentTerm = t;
    const ms = assessTermMonths();
    const now = new Date().toLocaleDateString('en-GB', { month: 'long' });
    currentWorkbookMonth = ms.includes(now) ? now : ms[0];
    obsRangeFrom = ms[0]; obsRangeTo = ms[ms.length - 1];   // Observation shows the whole term
    currentObservationThemeId = null;
    if(typeof preTestTallyLoadedFor !== 'undefined') preTestTallyLoadedFor = null; // reload that term's Pre-Test tally
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  function renderAssessTermBar(container){
    const t = currentAssessTerm();
    const bar = document.createElement('div');
    bar.setAttribute('data-no-export', '1');
    bar.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:0 0 16px;';
    bar.innerHTML = '<b style="font-size:13px; margin-right:4px;">Term</b>' + [1, 2].map(k => {
      const on = k === t, T = ASSESS_TERMS[k];
      return `<button type="button" onclick="switchAssessTerm(${k})" style="padding:8px 16px; border-radius:99px; border:1px solid ${on ? 'transparent' : 'var(--border)'}; background:${on ? 'var(--primary)' : '#fff'}; color:${on ? '#fff' : 'var(--text)'}; font-size:13px; font-weight:600; cursor:pointer;">${T.label} <span style="font-weight:400; opacity:.85;">· ${T.span}</span></button>`;
    }).join('');
    container.appendChild(bar);
  }

  // =================================================================
  // ASSESSMENT RECORDS → Σ TOTAL for a WHOLE TERM — the collective report.
  // Adds up every month of the chosen term (Observation, Workbook and
  // Motor month by month; the Pre-Test baseline once — it is one tally
  // per term, not one per month).
  // =================================================================
  var recordsWholeTerm = false;
  // The records Month dropdown: the term's months, plus "Whole Term" for Σ Total.
  function fillRecordsMonthSelect(sel){
    if(assessmentRecordsType === 'total'){
      const T = ASSESS_TERMS[currentAssessTerm()];
      const o = document.createElement('option'); o.value = '__term'; o.textContent = 'Whole ' + T.label + ' (' + T.span + ') — collective report';
      if(recordsWholeTerm) o.selected = true;
      sel.appendChild(o);
    } else recordsWholeTerm = false;
    assessTermMonths().forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; if(!recordsWholeTerm && m === currentWorkbookMonth) o.selected = true; sel.appendChild(o); });
    sel.onchange = () => {
      if(sel.value === '__term') recordsWholeTerm = true;
      else { recordsWholeTerm = false; currentWorkbookMonth = sel.value; }
      assessmentRecordsRefresh();
    };
  }
  function computeCgTotalsTerm(months, reRender){
    const per = months.map(m => ({ month: m, T: computeCgTotals(m, reRender) }));
    if(per.some(x => x.T.loading)) return { loading: true };
    const rows = {}, errors = new Set(), recorded = { observation: 0, workbook: 0, pretest: 0, motor: 0 }, children = {};
    const blank = code => ({ code, items: new Set(), observation: { b: 0, p: 0, a: 0 }, workbook: { b: 0, p: 0, a: 0 }, pretest: { b: 0, p: 0, a: 0 }, motor: { b: 0, p: 0, a: 0 } });
    per.forEach(({ T }, i) => {
      T.errors.forEach(e => errors.add(e));
      Object.entries(T.children || {}).forEach(([pid, cgs]) => Object.entries(cgs).forEach(([code, r]) => {
        const c = children[pid] || (children[pid] = {});
        const t = c[code] || (c[code] = { observation: { b: 0, p: 0, a: 0 }, workbook: { b: 0, p: 0, a: 0 }, motor: { b: 0, p: 0, a: 0 } });
        ['observation', 'workbook', 'motor'].forEach(k => ['b', 'p', 'a'].forEach(x => { t[k][x] += (r[k] || {})[x] || 0; }));
      }));
      ['observation', 'workbook', 'motor'].forEach(k => { recorded[k] += T.recorded[k]; });
      if(i === 0) recorded.pretest = T.recorded.pretest;              // baseline: once
      T.codes.forEach(code => {
        const src = T.rows[code], r = rows[code] || (rows[code] = blank(code));
        ['observation', 'workbook', 'motor'].concat(i === 0 ? ['pretest'] : []).forEach(k => { r[k].b += src[k].b; r[k].p += src[k].p; r[k].a += src[k].a; });
        src.items.forEach(x => { if(i === 0 || !/^Pre-Test/.test(x)) r.items.add(x); });
      });
    });
    // drop rows that only had a Pre-Test entry repeated from later months (none left after the merge rule) and sort
    const codes = Object.keys(rows).filter(c => ['observation', 'workbook', 'pretest', 'motor'].some(k => rows[c][k].b + rows[c][k].p + rows[c][k].a))
      .sort((x, y) => cgMajor(x) - cgMajor(y) || parseFloat(x.slice(3)) - parseFloat(y.slice(3)));
    return { loading: false, rows, codes, errors: [...errors], motorNote: '', books: null, recorded, perMonth: per, children };
  }