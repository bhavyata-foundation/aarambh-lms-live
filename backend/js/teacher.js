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

fetch('backend/auth/session_check.php' + window.location.search)
  .then(r => r.json())
  .then(data => {
    if(data.status !== 'logged_in' || data.role !== 'teacher'){
      window.location.href = 'index.html';
      return;
    }
    enterTeacherFlow();
    renderPreviewBanner(data.is_previewing);
    applyRealTeacherName(data.name); // fixes the hardcoded "Mrs. Sharma" in the topbar + heading
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

  function normPupilName(s){ return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

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

    const onRoll = {};
    realPupilsCache.forEach(p => { onRoll[normPupilName(p.name)] = p; });
    const seen = new Set(), add = [], keep = [], problems = [];
    for(let i = 1; i < rows.length; i++){
      const r = rows[i];
      const name = (r[nameCol] || '').trim().replace(/\s+/g, ' ');
      if(!name) continue;
      const key = normPupilName(name);
      if(seen.has(key)){ problems.push(`Row ${i + 1}: "${name}" appears twice in the file — added once.`); continue; }
      seen.add(key);
      if(onRoll[key]){ keep.push(onRoll[key].name); continue; }
      const adm = admCol !== undefined ? normaliseImportDate(r[admCol]) : '';
      const dob = dobCol !== undefined ? normaliseImportDate(r[dobCol]) : '';
      if(adm === null){ problems.push(`Row ${i + 1} (${name}): admitted date "${r[admCol]}" isn't a date I can read — today's date will be used.`); }
      if(dob === null){ problems.push(`Row ${i + 1} (${name}): date of birth "${r[dobCol]}" isn't a date I can read — left blank.`); }
      let gender = genderCol >= 0 ? (r[genderCol] || '').trim() : '';
      if(/^f/i.test(gender)) gender = 'Female'; else if(/^m/i.test(gender)) gender = 'Male'; else gender = '';
      add.push({ name, admitted_date: adm || todayDateKey(), dob: dob || '', gender });
    }
    const remove = removeMissing ? realPupilsCache.filter(p => !seen.has(normPupilName(p.name))).map(p => ({ id: p.id, name: p.name })) : [];

    if(!add.length && !remove.length){
      resultEl.innerHTML = `<div class="au-success">Nothing to change — all ${keep.length} name${keep.length === 1 ? '' : 's'} in the file are already on the roll.</div>` + (problems.length ? `<div class="au-error" style="margin-top:6px;">${problems.map(esc).join('<br>')}</div>` : '');
      return;
    }
    pendingPupilSync = { add, keep, remove, removeMissing };
    const list = arr => arr.slice(0, 40).map(esc).join(', ') + (arr.length > 40 ? ' …and ' + (arr.length - 40) + ' more' : '');
    resultEl.innerHTML = `<div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
      <p style="margin:0 0 8px; font-weight:600;">Preview — nothing has been saved yet</p>
      ${add.length ? `<p style="margin:0 0 6px;"><b style="color:var(--good,#0a7a0a);">${add.length} to add</b> to ${esc(myClassInfo.class_name || 'this class')}: <span class="cap">${list(add.map(a => a.name))}</span></p>` : ''}
      <p style="margin:0 0 6px;"><b>${keep.length} already on the roll</b> — left as they are.</p>
      ${remove.length ? `<p style="margin:0 0 6px;"><b style="color:var(--crit,#d03b3b);">${remove.length} to take off the roll</b> (not in the file): <span class="cap">${list(remove.map(r => r.name))}</span><br><span class="cap">Their past attendance and assessments are kept; they just stop appearing on new registers.</span></p>` : ''}
      ${problems.length ? `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:8px 10px; margin:8px 0; font-size:12.5px;">${problems.slice(0, 15).map(esc).join('<br>')}</div>` : ''}
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="confirmClassPupilImport()">Confirm — ${[add.length ? 'add ' + add.length : '', remove.length ? 'remove ' + remove.length : ''].filter(Boolean).join(', ')}</button>
        <button class="btn" onclick="pendingPupilSync = null; document.getElementById('classPupilImportResult').innerHTML = '<p class=&quot;cap&quot;>Import cancelled — nothing was saved.</p>';">Cancel</button>
      </div></div>`;
  }

  async function confirmClassPupilImport(){
    const resultEl = document.getElementById('classPupilImportResult');
    if(!pendingPupilSync){ resultEl.innerHTML = '<div class="au-error">Preview a file first.</div>'; return; }
    if(pendingPupilSync.remove.length && !confirm(pendingPupilSync.remove.length + ' child' + (pendingPupilSync.remove.length === 1 ? '' : 'ren') + ' will be taken off the roll. Continue?')) return;
    resultEl.innerHTML = '<p class="sub">Saving…</p>';
    try{
      const res = await fetch('backend/pupils/sync_class_pupils.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ add: pendingPupilSync.add, remove_ids: pendingPupilSync.remove.map(r => r.id) })
      });
      const data = await res.json();
      if(data.status !== 'success'){ resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`; return; }
      pendingPupilSync = null;
      alert('Roll updated: ' + data.added + ' added' + (data.removed ? ', ' + data.removed + ' taken off the roll' : '') + (data.skipped && data.skipped.length ? ', ' + data.skipped.length + ' skipped' : '') + '.');
      realPupilsCache = null; // reload the real roll everywhere
      renderAttendanceBody();
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }

  // A file with this class's current roll already in it, to edit and import back.
  function downloadClassRollTemplate(){
    if(typeof XLSX === 'undefined'){ alert('.xlsx support did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const rows = [['name', 'admitted_date', 'dob', 'gender']];
    (Array.isArray(realPupilsCache) ? realPupilsCache : []).forEach(p => rows.push([p.name, p.admitted_date || '', p.dob || '', p.gender || '']));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch: 28}, {wch: 14}, {wch: 14}, {wch: 10}];
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
        <p class="cap" style="margin:0 0 8px;">First row is the header. Only <b>name</b> is required; <b>admitted_date</b>, <b>dob</b> and <b>gender</b> are optional (dates like 2026-06-15 or 15/06/2026). Children are always added to <b>${esc(myClassInfo.class_name || 'this class')}</b> — the class you are logged in to.</p>
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
      let nameCol = -1, rollCol = -1; const dateCols = [];
      for(let c = 0; c < Math.min(row.length, maxCols); c++){
        const n = siNorm(row[c]);
        if(nameCol < 0 && SI_NAME_WORDS.includes(n)) nameCol = c;
        else if(rollCol < 0 && SI_ROLL_WORDS.includes(n)) rollCol = c;
        const d = siReadDateCell(row[c]);
        if(d && c !== rollCol) dateCols.push({ col: c, ...d });
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
        if(nameCol >= 0) out.sections.push({ headerRow: r, nameCol, rollCol, dateCols, headerCells: row });
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
      for(let r = s.headerRow + 1; r < end; r++){
        const row = grid[r] || [];
        const name = siText(row[s.nameCol]).replace(/\s+/g, ' ');
        if(!name || SI_TOTAL_WORDS.test(name) || /^\d+([.,]\d+)?%?$/.test(name)) continue;
        if(s.rollCol >= 0 && siText(row[s.rollCol]) && !/^\d+$/.test(siText(row[s.rollCol]))) continue; // sub-headings in the roll column
        const marks = s.dateCols.map(d => { countValue(row[d.col]); return row[d.col]; });
        if(marks.every(m => !siText(m))) continue; // a child row with nothing marked adds nothing
        s.rows.push({ name, marks });
      }
    });
    if(out.long){
      const L = out.long; L.rows = [];
      for(let r = L.headerRow + 1; r < grid.length; r++){
        const row = grid[r] || [];
        const name = siText(row[L.nameCol]).replace(/\s+/g, ' ');
        const d = siReadDateCell(row[L.dateCol]);
        if(!name || !d || !d.date) continue;
        countValue(row[L.markCol]);
        L.rows.push({ name, date: siYmd(d.date), mark: row[L.markCol] });
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
    const put = (sheet, name, date, raw) => {
      const meaning = sheet.valueMap[siNorm(raw)] || (siText(raw) ? 'unknown' : 'blank');
      if(meaning === 'blank') return;
      if(!date){ stats.noDate++; return; }
      if(meaning === 'unknown'){ stats.unknown++; return; }
      if(meaning === 'ignore'){ stats.ignored++; return; }
      if(date > today){ stats.future++; return; }
      const key = normPupilName(name);
      const rec = byName[key] || (byName[key] = { name, attendance: {} });
      rec.attendance[date] = meaning;
      stats[meaning]++;
    };
    smartImport.sheets.filter(s => s.include).forEach(sheet => {
      sheet.sections.forEach(s => { const dates = siSectionDates(sheet, s); s.rows.forEach(r => r.marks.forEach((m, i) => put(sheet, r.name, dates[i], m))); });
      if(sheet.long) sheet.long.rows.forEach(r => put(sheet, r.name, r.date, r.mark));
    });
    return { byName, stats };
  }

  async function smartImportChoose(){
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.xlsx,.xls,.csv';
    input.onchange = async () => {
      const file = input.files[0]; if(!file) return;
      if(typeof XLSX === 'undefined'){ alert('The spreadsheet reader did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
      const out = document.getElementById('smartImportPanel');
      out.innerHTML = '<p class="sub">Reading ' + esc(file.name) + '…</p>';
      try{
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const sheets = wb.SheetNames.map(n => siAnalyseSheet(n, XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' })));
        if(!sheets.some(s => s.include)){ out.innerHTML = '<div class="au-error">I couldn\'t find an attendance grid in this file — it needs a column of children\'s names and a row of dates or day numbers (or a list with name, date and mark columns).</div>'; return; }
        smartImport = { fileName: file.name, sheets, addMissing: !(Array.isArray(realPupilsCache) && realPupilsCache.length), markHolidays: true };
        renderSmartImportMapping();
      } catch(err){ out.innerHTML = `<div class="au-error">Could not read this file: ${esc(err.message || err)}</div>`; }
    };
    input.click();
  }

  function renderSmartImportMapping(){
    const out = document.getElementById('smartImportPanel');
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
        <button class="btn" onclick="smartImport = null; document.getElementById('smartImportPanel').innerHTML = '';">Cancel</button>
        ${unknownLeft ? `<span class="cap" style="color:var(--crit,#d03b3b);">${unknownLeft} mark type${unknownLeft === 1 ? '' : 's'} still to choose</span>` : ''}${monthsMissing ? '<span class="cap" style="color:var(--crit,#d03b3b);"> Choose the month and year</span>' : ''}
      </div></div>`;
  }

  function renderSmartImportPreview(){
    const out = document.getElementById('smartImportPanel');
    const { byName, stats } = siCollect();
    const roll = {}; (realPupilsCache || []).forEach(p => { roll[normPupilName(p.name)] = p; });
    const all = Object.values(byName);
    const matched = all.filter(r => roll[normPupilName(r.name)]);
    const missing = all.filter(r => !roll[normPupilName(r.name)]);
    // Whole-class holiday days: every child who has a mark that day has H.
    const dayMarks = {};
    all.forEach(r => Object.entries(r.attendance).forEach(([d, m]) => { (dayMarks[d] = dayMarks[d] || []).push(m); }));
    const holidayDays = Object.entries(dayMarks).filter(([d, ms]) => ms.length >= 2 && ms.every(m => m === 'holiday') && !studentHolidays[d]).map(([d]) => d).sort();
    const counted = list => list.reduce((a, r) => { Object.values(r.attendance).forEach(m => { if(m === 'present') a.p++; else if(m === 'absent') a.a++; }); return a; }, { p: 0, a: 0 });
    const saving = counted(smartImport.addMissing ? all : matched);
    smartImport.collected = { byName, matched, missing, holidayDays };
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 8px; font-weight:600;">Step 2 of 2 — preview. Nothing has been saved yet.</p>
      <p style="margin:0 0 6px;"><b>${matched.length}</b> child${matched.length === 1 ? ' is' : 'ren are'} already on ${esc(myClassInfo.class_name || 'this class')}'s roll.</p>
      ${missing.length ? `<p style="margin:0 0 6px;"><b style="color:${smartImport.addMissing ? 'var(--good,#0a7a0a)' : 'var(--crit,#d03b3b)'};">${missing.length} not on the roll</b> — ${smartImport.addMissing ? 'will be added' : 'will be <b>skipped</b>'}: <span class="cap">${missing.slice(0, 40).map(r => esc(r.name)).join(', ')}${missing.length > 40 ? ' …' : ''}</span></p>` : ''}
      <p style="margin:0 0 6px;">Will save <b>${saving.p}</b> present and <b>${saving.a}</b> absent marks (they replace anything already saved for that child and day).</p>
      ${smartImport.markHolidays && holidayDays.length ? `<p style="margin:0 0 6px;"><b>${holidayDays.length}</b> day${holidayDays.length === 1 ? '' : 's'} will be marked as holidays: <span class="cap">${holidayDays.map(esc).join(', ')}</span></p>` : ''}
      <p class="cap" style="margin:0 0 6px;">${stats.future ? stats.future + ' marks dated after today are left out. ' : ''}${stats.ignored ? stats.ignored + ' marks set to "Ignore" are left out. ' : ''}${stats.noDate ? stats.noDate + ' marks had no readable date and are left out. ' : ''}</p>
      <label style="display:flex; gap:8px; align-items:center; font-size:13px; margin:8px 0;"><input type="checkbox" id="smartImportRemember" checked /> Remember my choices for files laid out like this one</label>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
        <button class="btn-primary" style="width:auto; padding:8px 16px;" onclick="confirmSmartImport()" ${saving.p + saving.a || (smartImport.addMissing && missing.length) ? '' : 'disabled'}>Confirm import</button>
        <button class="btn" onclick="renderSmartImportMapping()">Back</button>
      </div></div>`;
  }

  async function confirmSmartImport(){
    const out = document.getElementById('smartImportPanel');
    const c = smartImport && smartImport.collected;
    if(!c) return;
    const remember = !!(document.getElementById('smartImportRemember') || {}).checked;
    try{
      let added = 0;
      if(smartImport.addMissing && c.missing.length){
        out.innerHTML = '<p class="sub">Adding children to the roll…</p>';
        const res = await fetch('backend/pupils/sync_class_pupils.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ add: c.missing.map(r => ({ name: r.name, admitted_date: Object.keys(r.attendance).sort()[0] || todayDateKey() })), remove_ids: [] })
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
        const box = document.getElementById('smartImportPanel'); if(box) box.innerHTML = `<p class="sub">Saving marks… ${Math.min(i + 400, marks.length)} of ${marks.length}</p>`;
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
      const box = document.getElementById('smartImportPanel');
      if(box) box.innerHTML = `<div class="au-error">${esc(err.message)}</div><button class="btn" style="margin-top:8px;" onclick="renderSmartImportPreview()">Back to preview</button>`;
    }
  }

  function renderSmartImportCard(){
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'padding:16px 18px; margin:0 0 20px;';
    card.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div style="flex:1; min-width:240px;">
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import attendance from any file</h3>
          <p class="cap" style="margin:0;">Your register in any layout — .xlsx, .xls or .csv, one sheet or one per month. I work out the names, dates and marks, you check, then it's saved to ${esc(myClassInfo.class_name || 'this class')}.</p>
        </div>
        <button class="btn-primary" style="width:auto; padding:10px 20px;" onclick="smartImportChoose()">📥 Import a file</button>
      </div>
      <div id="smartImportPanel" style="margin-top:12px; word-break:break-word; overflow-wrap:anywhere;"></div>`;
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
  container.appendChild(renderSmartImportCard());
  container.appendChild(renderClassPupilImportCard());

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
  pickDayToggleCard.className = 'card'; pickDayToggleCard.style.cssText = 'padding:0; margin-top:14px; overflow:hidden;';
  pickDayToggleCard.innerHTML = `
    <div onclick="classAttendancePickDayOpen = !classAttendancePickDayOpen; this.nextElementSibling.classList.toggle('hidden', !classAttendancePickDayOpen); this.querySelector('.chevron').style.transform = classAttendancePickDayOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
         style="display:flex; align-items:center; justify-content:space-between; padding:16px 18px; cursor:pointer;">
      <div>
        <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📅 Pick a different day</h3>
        <p class="cap" style="margin:0;">Open or correct a past day's register — currently open: ${markAttSelectedDate === todayDateKey() ? 'Today' : esc(markAttSelectedDate)}.</p>
      </div>
      <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${classAttendancePickDayOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
    </div>
    <div class="${classAttendancePickDayOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
  `;
  container.appendChild(pickDayToggleCard);
  const pickDayBody = pickDayToggleCard.querySelector('div:last-child');

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

    // Collapsed by default — the register/report view is real and
    // useful, but showing it inline by default makes this screen very
    // long; tapping "See reports" opens it, same collapsible-card
    // convention used elsewhere in this app (e.g. Monthly Effective's
    // "What the portal will print").
    const reportsToggleCard = document.createElement('div');
    reportsToggleCard.className = 'card'; reportsToggleCard.style.cssText = 'padding:0; margin-top:20px; overflow:hidden;';
    reportsToggleCard.innerHTML = `
      <div onclick="classAttendanceReportsOpen = !classAttendanceReportsOpen; this.nextElementSibling.classList.toggle('hidden', !classAttendanceReportsOpen); this.querySelector('.chevron').style.transform = classAttendanceReportsOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:16px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📊 See reports</h3>
          <p class="cap" style="margin:0;">The weekly/monthly attendance register, generated from what's actually been marked above.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${classAttendanceReportsOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${classAttendanceReportsOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    container.appendChild(reportsToggleCard);
    const registerGridContainer = document.createElement('div');
    reportsToggleCard.querySelector('div:last-child').appendChild(registerGridContainer);
    renderAttendanceRegister(registerGridContainer);

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
        return { id: p.id, name: p.name, admitted_date: p.admitted_date, roll: i + 1, status, pct: mtd.pct, marked: mtd.marked };
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

    container.appendChild(mdSec('Register for ' + niceDate, '<span class="reqs">REG-14</span>'));
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
          <div class="cap">Roll ${r.roll} · month to date ${r.marked ? r.pct + '%' : '—'}</div>
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
    SAMPLE_STUDENTS.forEach(name => {
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
    SAMPLE_STUDENTS.forEach(name => {
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

  function sampleFamily(name){
    const occA = samplePick(name + 'occA', OCCUPATIONS);
    const occB = samplePick(name + 'occB', OCCUPATIONS);
    const langCount = 1 + Math.floor(sampleRand(name + 'langn') * 2);
    const langs = [samplePick(name + 'lang1', LANGUAGES_AT_HOME)];
    if(langCount > 1){
      const second = samplePick(name + 'lang2', LANGUAGES_AT_HOME);
      if(!langs.includes(second)) langs.push(second);
    }
    return {
      guardians: [{occ: occA}, {occ: occB}],
      langs,
      reads: sampleRand(name + 'reads') > 0.3,
      income: samplePick(name + 'inc', INCOME_BANDS),
      complete: Math.round(40 + sampleRand(name + 'complete') * 60),
      consent: sampleRand(name + 'consent') > 0.15,
      photoConsent: sampleRand(name + 'photoconsent') > 0.35
    };
  }
  function sampleHomeActStatus(name){
    return samplePick(name + 'homeact', ['done', 'partly done', 'not done', 'not asked']);
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
      ? `<span onclick="toggleMyClassRatingPopup(${pupilId},'${domainKey}')" class="pill ${TIER_INFO[rating].c}" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; font-size:12px; font-weight:600;" title="${TIER_INFO[rating].n} — tap to change">${TIER_INFO[rating].letter}</span>`
      : `<span onclick="toggleMyClassRatingPopup(${pupilId},'${domainKey}')" class="dim" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; border:1px dashed #0b0b0b55;" title="Not rated — tap to rate">·</span>`;
    const popup = isOpen ? `
      <div style="position:absolute; top:30px; left:50%; transform:translateX(-50%); z-index:20; background:#fff; border:1px solid #0b0b0b33; border-radius:8px; padding:4px; display:flex; gap:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); white-space:nowrap;">
        ${['E','P','A'].map(t => `<span onclick="setChildActivityRating(${pupilId},'${domainKey}','${t}')" class="pill ${TIER_INFO[t].c}" style="cursor:pointer; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px; font-size:12px; font-weight:600;" title="${TIER_INFO[t].n}">${TIER_INFO[t].letter}</span>`).join('')}
        ${rating ? `<span onclick="setChildActivityRating(${pupilId},'${domainKey}',null)" class="dim" style="cursor:pointer; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px; border:1px solid #0b0b0b22;" title="Clear rating">✕</span>` : ''}
      </div>` : '';
    return `<td style="text-align:center; position:relative;">${badge}${popup}</td>`;
  }

  function renderMyClass(){
    const container = document.getElementById('myclass-body');
    container.innerHTML = '';
    container.appendChild(renderTeachingTabBar('myclass'));
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
      ? `<span onclick="toggleAssessmentPopup('${name}','${domainKey}')" class="pill ${TIER_INFO[tier].c}" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; font-size:12px; font-weight:600;" title="${TIER_INFO[tier].n} — tap to change">${TIER_INFO[tier].letter}</span>`
      : `<span onclick="toggleAssessmentPopup('${name}','${domainKey}')" class="dim" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; border:1px dashed #0b0b0b55;" title="Not observed — tap to record">·</span>`;
    const popupHtml = isOpen ? `
      <div style="position:absolute; top:30px; left:50%; transform:translateX(-50%); z-index:20; background:#fff; border:1px solid #0b0b0b33; border-radius:8px; padding:4px; display:flex; gap:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); white-space:nowrap;">
        ${['E','P','A'].map(t => `<span onclick="setAssessmentTier('${name}','${domainKey}','${t}')" class="pill ${TIER_INFO[t].c}" style="cursor:pointer; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px; font-size:12px; font-weight:600;" title="${TIER_INFO[t].n}">${TIER_INFO[t].letter}</span>`).join('')}
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
        head: [['CG', 'Competency', 'Pages', 'E', 'P', 'A']],
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
    secWrap.querySelector('#attRegisterDownloadBtn').onclick = () => downloadAttendanceRegisterPdf(scopeLabel, viewDates, viewRows, todaysDateKeyStr);

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
      mdTile('My attendance', myAttendancePct, '% of ' + teacherDays + ' working days',
        mdPill(mdStatusBand(myAttendancePct).l, mdStatusBand(myAttendancePct).c), 'CAL-13', mdMeter(myAttendancePct)),
      mdTile('On Saturdays', saturdayPct, '% of teacher-only days',
        mdPill(mdStatusBand(saturdayPct, 85, 60).l, mdStatusBand(saturdayPct, 85, 60).c), 'GAP-48', mdMeter(saturdayPct)),
      mdTile('Plans submitted', plansSubmittedPct, '% of days due',
        mdPill(mdStatusBand(plansSubmittedPct).l, mdStatusBand(plansSubmittedPct).c), 'PLN-17', mdMeter(plansSubmittedPct)),
      mdTile('Congruent with the week', congruentPct, '% of sessions',
        mdPill(mdStatusBand(congruentPct).l, mdStatusBand(congruentPct).c), 'PLN-16', mdMeter(congruentPct)),
      mdTile('Sessions confirmed', congruentPct, '% (evidence not yet tracked)',
        mdPill('Approximate', 'info'), 'EVD-03 · see caption')
    ]);
    statGrid5.style.marginBottom = '22px';
    container.appendChild(statGrid5);

    const denomCard = mdCard('Two denominators on this page',
      `CAL-13 · my attendance divides by <b>${teacherDays} teacher working days</b>, which includes the Saturdays with no children. Child attendance and session delivery divide by <b>${studentDays} student days</b>. Mixing them is GAP-47. "Sessions confirmed" above is approximated from planning data, not a real evidence count — this app tracks photo uploads per session (Section 6) but doesn't yet keep a queryable "has evidence" flag on the client to compute this properly.`, null);
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
    downloadBtn.style.cssText = 'padding:7px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer; margin-left:auto;';
    downloadBtn.onclick = downloadAttendanceDashboardPdf;
    pickerRow.appendChild(downloadBtn);
    container.appendChild(pickerRow);

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
  function sampleAttendanceStatsForMonth(year, month){
    const roll = assessmentPupilNames().length;
    const studentDays = studentDaysInMonth(year, month);
    const daysMarked = studentDays; // a full sample month, for a believable picture
    const perChildMarked = {}, perChildPresent = {};
    let totalPresentSlots = 0, totalPossibleSlots = 0;
    assessmentPupilNames().forEach(name => {
      const pct = 78 + sampleRand(name + year + month + 'sampleatt') * 20;
      const present = Math.round(daysMarked * pct / 100);
      perChildMarked[name] = daysMarked;
      perChildPresent[name] = present;
      totalPresentSlots += present;
      totalPossibleSlots += daysMarked;
    });
    const attendancePct = totalPossibleSlots ? Math.round(totalPresentSlots / totalPossibleSlots * 1000) / 10 : 0;
    const effectiveStrength = daysMarked ? Math.round(totalPresentSlots / daysMarked * 10) / 10 : 0;
    const below70 = assessmentPupilNames().filter(name => perChildMarked[name] && (perChildPresent[name] / perChildMarked[name] * 100) < 70).length;
    return { roll, studentDays, daysMarked, attendancePct, effectiveStrength, below70, perChildMarked, perChildPresent, isSample: true };
  }

  function renderAttendanceAcrossYear(container, year, month){
    const monthName = new Date(year, month, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const now = new Date();
    const curIdx = ACADEMIC_MONTHS.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS.slice(0, ACADEMIC_MONTHS.indexOf(month) + 1);
    const monthStats = monthsSoFar.map(m => {
      const real = computeAttendanceDashboardStats(year, m);
      return { m, s: real.hasData ? real : Object.assign(sampleAttendanceStatsForMonth(year, m), { hasData: true }) };
    });
    const thisMonthReal = computeAttendanceDashboardStats(year, month);
    const thisMonth = thisMonthReal.hasData ? thisMonthReal : Object.assign(sampleAttendanceStatsForMonth(year, month), { hasData: true });

    // --- Month by month table ---
    container.appendChild(mdSec('Month by month', ''));
    const mbmHead = document.createElement('div');
    mbmHead.innerHTML = `<p style="font-weight:600; margin:4px 0 2px;">Roll, attendance and effective strength</p>
      <p class="cap" style="margin-bottom:14px;">Attendance is real students marked present, divided by real marks taken. Months with nothing entered show representative sample figures instead of a red zero, clearly marked "(sample)".</p>`;
    container.appendChild(mbmHead);

    let mbmTable = `<div class="report-table-wrap"><table class="report-table">
      <thead><tr><th>Month</th><th>Student days</th><th>On roll</th><th>Days marked</th>
      <th>Attendance %</th><th>Effective strength</th><th>Below 70%</th></tr></thead><tbody>`;
    monthStats.forEach(({m, s}) => {
      const label = new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'});
      mbmTable += `<tr>
        <td><b>${esc(label)}</b>${s.isSample ? ' <span class="cap" style="font-weight:400;">(sample)</span>' : ''}</td>
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
    analysisCard.innerHTML = `<h4 style="margin:0 0 6px; font-size:13px;">Analysis</h4><p style="margin:0; font-size:13.5px; line-height:1.6;">${esc(buildAttendanceAnalysisText(monthStats))}</p>`;
    container.appendChild(analysisCard);

    // --- Two-column: trend line + child-wise bars ---
    const twoCol = document.createElement('div');
    twoCol.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:22px;';
    twoCol.style.gridTemplateColumns = window.innerWidth < 900 ? '1fr' : '1fr 1fr';

    // Trend line — every month now has a real-or-sample value, so it
    // always plots once two months exist in the academic year so far.
    const plotted = monthStats;
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
      <p class="cap" style="margin:0 0 16px;">REP-09 · every child against her own denominator.${thisMonth.isSample ? ' Sample figures — nothing real marked yet for ' + esc(monthName) + '.' : ''}</p>
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
      return { m, s: real.hasData ? real : Object.assign(sampleAttendanceStatsForMonth(year, m), { hasData: true }) };
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
    const analysisLines = doc.splitTextToSize(buildAttendanceAnalysisText(monthStats), 265);
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
      body: monthStats.map(({m, s}) => [
        new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'}) + (s.isSample ? ' (sample)' : ''),
        s.studentDays, s.roll, s.daysMarked, s.attendancePct + '%', s.effectiveStrength, s.below70
      ]),
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
      const bar = document.createElement('div'); bar.style.cssText = 'margin:0 0 14px;';
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
    // Weeks this month that have a "Materials needed this week" list in My Day.
    'TLM plan': () => {
      const weeks = complianceWeeksInMonth(calendarYear, calendarMonth);
      const planned = weeks.filter(w => (weeklyTlmEntries[w.w] || []).length > 0).length;
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
        const weekEntries = weeklyTlmEntries[currentWeekNum];
        const hasData = Array.isArray(weekEntries) && weekEntries.length > 0;
        return { k, v: hasData ? Math.round(weekEntries.filter(m => m.used).length / weekEntries.length * 100) : 0, real: true, hasData };
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
  function sampleHousehold(name){
    const f = sampleFamily(name);
    const familyStructure = samplePick(name + 'fstruct', ['Two parents', 'Single parent', 'Guardian']);
    return Object.assign(f, {
      locality: samplePick(name + 'loc', ['Ambedkar Nagar', 'Kamgar Vasahat', 'Shanti Nagar', 'Ganesh Nagar']),
      walk: 5 + Math.floor(sampleRand(name + 'walk') * 20),
      skills: [samplePick(name + 'sk1', HOUSEHOLD_SKILLS), samplePick(name + 'sk2', HOUSEHOLD_SKILLS)],
      res: [samplePick(name + 'res1', HOME_RESOURCES)],
      siblings: Math.floor(sampleRand(name + 'sib') * 3),
      familyStructure,
      maritalStatus: familyStructure === 'Two parents' ? 'Married' : samplePick(name + 'marstat', ['Single', 'Married']),
      motherTongue: samplePick(name + 'mt', ['Hindi', 'Marathi', 'Telugu', 'Bhojpuri', 'Gujarati']),
      annualIncome: Math.round((30000 + sampleRand(name + 'annincome') * 150000) / 1000) * 1000,
      guardianNames: [{name: 'Mrs. ' + (name.split(' ')[1] || name), rel: 'Mother', edu: samplePick(name+'edu1', ['No formal education','Primary school','Secondary school']), phone: '98'+String(Math.floor(sampleRand(name+'ph1')*90000000)+10000000), smart: sampleRand(name+'sm1')>0.4, primary: true},
                      {name: 'Mr. ' + (name.split(' ')[1] || name), rel: 'Father', edu: samplePick(name+'edu2', ['No formal education','Primary school','Secondary school']), phone: '98'+String(Math.floor(sampleRand(name+'ph2')*90000000)+10000000), smart: sampleRand(name+'sm2')>0.4, primary: false}]
    });
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

  function getFamilyEngagement(name){
    if(!familyEngagementRecords[name]){
      const activity = HOME_ACTIVITY_POOL[Math.floor(sampleRand(name + 'actidx') * HOME_ACTIVITY_POOL.length)];
      const attended = sampleRand(name + 'ptmatt') > 0.35;
      familyEngagementRecords[name] = {
        ptm: {
          attended,
          meetingLabel: 'Monthly meeting, month 2',
          feedback: attended ? '' : '',
          actionsAgreed: []
        },
        activity: {
          name: activity.name, materials: activity.materials, time: activity.time, reading: activity.reading,
          status: samplePick(name + 'actstatus', ACTIVITY_STATUSES),
          deliveryChannel: samplePick(name + 'delch', DELIVERY_CHANNELS),
          language: samplePick(name + 'actlang', ['Telugu', 'Hindi', 'Marathi']),
          confirmedBy: ''
        }
      };
    }
    return familyEngagementRecords[name];
  }

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
  SAMPLE_STUDENTS.forEach(name => {
    if(admissionRecords[name]) return;
    const extra = sampleAdmissionExtra(name);
    admissionRecords[name] = {
      address: extra.address, dob: extra.dob, gender: extra.gender, speciallyAbled: extra.speciallyAbled,
      prevStudied: extra.previouslyStudied !== 'None',
      prevSchool: extra.previouslyStudied !== 'None' ? extra.previouslyStudied : '',
      prevStandard: '', prevBoard: '', prevReason: '',
      admittedDate: '2026-06-01', startOfYear: true, baseline: true
    };
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
    container.appendChild(mdGrid('g3', [
      mdTile('On roll now', total, 'children', mdPill(myClassInfo.class_name, 'neu'), 'ADB-11'),
      mdTile('Admitted at the start', startOfYearPupils.length, total ? new Date(termStartDate + 'T00:00:00').toLocaleDateString([], {month:'long', year:'numeric'}) : '', mdPill(total ? Math.round(startOfYearPupils.length/total*100) + '% of the class' : '—', 'neu'), 'ADB-11'),
      mdTile('Admitted during the year', midYearPupils.length, 'after term start', mdPill(total ? Math.round(midYearPupils.length/total*100) + '% of the class' : '—', 'info'), 'ADB-12')
    ]));

    const whyCard = mdCard('Why this screen exists',
      'The roll is not a number set in June. Children arrive all year — families move into the area, a child turns four, an anganwadi refers one across. Every attendance, assessment and curriculum figure has a denominator that changes underneath it, and a portal that stores one enrolment count will report all of them wrongly for the rest of the year.', null);
    whyCard.style.marginTop = '20px';
    container.appendChild(whyCard);

    // --- Import from a spreadsheet — the fast path for a whole roster
    // at once, real pupils table, same one used everywhere else in the
    // app (Class Attendance, Assessment) reads from. ---
    container.appendChild(mdSec('Import from a spreadsheet', ''));
    const importCard = document.createElement('div');
    importCard.className = 'card'; importCard.style.cssText = 'margin-bottom:22px; padding:22px; overflow:hidden;';
    importCard.innerHTML = `
      <p class="cap" style="margin:0 0 10px;">.csv or .xlsx — header row must be exactly:</p>
      <p class="cap" style="margin:0 0 10px; word-break:break-word; overflow-wrap:anywhere; font-family:monospace; font-size:12px; background:var(--bg); border-radius:6px; padding:8px 10px;">name,admitted_date</p>
      <p class="cap" style="margin:0;">admitted_date is optional per row — leave it blank for an existing student and today's date is used; fill it in for anyone who joined partway through the year. This is the quick path for a whole roster at once — use the fuller form below to also capture DOB, address, previous school, etc. for one child.</p>
      <input type="file" id="pupilImportInput" accept=".csv,.xlsx" style="margin-top:10px; max-width:100%;" />
      <div id="pupilImportResult" style="margin-top:10px; word-break:break-word; overflow-wrap:anywhere;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importPupilsFile()">Import</button>
    `;
    container.appendChild(importCard);

    // --- Add an admission (or edit one already on the roster) ---
    const editingPupil = editingPupilId ? realPupilsCache.find(p => p.id === editingPupilId) : null;
    container.appendChild(mdSec(editingPupil ? 'Edit admission — ' + editingPupil.name : 'Add an admission', '<span class="reqs">ADB-01…10</span>'));
    const admFormEl = renderAddAdmissionForm(editingPupil);
    admFormEl.setAttribute('data-no-export', '1');
    container.appendChild(admFormEl);

    // --- Every admission — one real row per pupil on the real roster,
    // with Edit and Remove actions. Remove is the same soft-delete
    // Class Attendance's register uses — so removing someone here or
    // there has the exact same effect everywhere. ---
    container.appendChild(mdSec('Every admission', '<span class="reqs">ADB-16 · REG-16</span>'));
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
    container.appendChild(mdCard(null, 'Workbooks and TLM entitlement follow the child\'s own admission date, not the June headcount.', wrap));

    // Collapsed by default — same "See reports" convention as Class
    // Attendance, so this screen doesn't default to being very long.
    const admReportsToggleCard = document.createElement('div');
    admReportsToggleCard.className = 'card'; admReportsToggleCard.style.cssText = 'padding:0; margin-top:20px; overflow:hidden;';
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

  (function loadMonthlyEffectiveRecords(){
    try {
      const raw = localStorage.getItem('monthlyEffectiveRecords');
      if(raw) Object.assign(monthlyEffectiveRecords, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
  })();

  function saveMonthlyEffectiveRecords(){
    try { localStorage.setItem('monthlyEffectiveRecords', JSON.stringify(monthlyEffectiveRecords)); }
    catch(e){ /* storage full/unavailable (a scanned image can be large) — stays in-memory for this session only */ }
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
      realPupilsCache = data.status === 'success' ? data.pupils : 'error:' + (data.message || 'Could not load pupils.');
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
    const enrolled = SAMPLE_STUDENTS.length;

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
      const isSample = !mStudent.hasData && !mTeacherHasData;
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
    const mbmCard = mdCard(null, 'The current month is highlighted. Months with nothing real recorded yet show representative sample figures, marked "(sample)" — never mistaken for real data. Sign-off shows Signed once all three signatures are in for that month.', mbmWrap);
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
    return /sr\s*kg/i.test(name) ? 'Sr KG' : 'Jr KG'; // defaults to Jr KG if unrecognized, rather than showing nothing
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

  function renderWorkbookAssessmentSection(container){
    const level = workbookLevelFromClassName();

    const booksLoaded = ensureWorkbookCompetenciesLoaded(level, currentWorkbookMonth, () => renderMonthlyAssessment(monthlyAssessmentTargetEl));
    const tallyLoaded = ensureWorkbookCompetencyTallyLoaded(currentWorkbookMonth, () => renderMonthlyAssessment(monthlyAssessmentTargetEl));
    const booksKey = level + '|' + currentWorkbookMonth;
    if(typeof workbookCompetenciesCache[booksKey] === 'string' && workbookCompetenciesCache[booksKey].startsWith('error:')){
      renderRetryCard(container, workbookCompetenciesCache[booksKey].slice(6), () => { delete workbookCompetenciesCache[booksKey]; delete workbookCompetencyTallyCache[currentWorkbookMonth]; }); return;
    }
    if(typeof workbookCompetencyTallyCache[currentWorkbookMonth] === 'string' && workbookCompetencyTallyCache[currentWorkbookMonth].startsWith('error:')){
      renderRetryCard(container, workbookCompetencyTallyCache[currentWorkbookMonth].slice(6), () => { delete workbookCompetencyTallyCache[currentWorkbookMonth]; delete workbookCompetenciesCache[booksKey]; }); return;
    }
    if(!booksLoaded || !tallyLoaded){ container.appendChild(mdCard(null, 'Loading workbooks…', null)); return; }

    const books = workbookCompetenciesCache[booksKey];
    if(!books.length){
      container.appendChild(mdCard(null, 'No workbooks are set up for ' + esc(level) + ' yet.', null));
      return;
    }

    // --- Month picker — shares the same month concept as Classroom
    // Observation (currentWorkbookMonth), since this tally is recorded
    // per month, same as everything else in Assessment. ---
    const monthBar = document.createElement('div'); monthBar.className = 'fbar'; monthBar.style.marginBottom = '14px';
    monthBar.innerHTML = '<div class="ctl"><label>Month</label><select id="workbookCompMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    container.appendChild(monthBar);
    const monthSel = monthBar.querySelector('#workbookCompMonthSelect');
    WORKBOOK_MONTHS.forEach(m => {
      const opt = document.createElement('option'); opt.value = m; opt.textContent = m;
      if(m === currentWorkbookMonth) opt.selected = true;
      monthSel.appendChild(opt);
    });
    monthSel.onchange = () => { currentWorkbookMonth = monthSel.value; renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    // --- Term bar — Term 1 shows every "Part 1" workbook, Term 2 every
    // "Part 2" workbook. Filters the book picker below; doesn't touch
    // the month picker (a term spans several months). ---
    const termBar = document.createElement('div'); termBar.className = 'fbar'; termBar.style.marginBottom = '14px';
    termBar.innerHTML = '<div class="ctl"><label>Term</label><div style="display:flex; gap:5px;" id="workbookTermChips"></div></div>';
    container.appendChild(termBar);
    const termChipsWrap = termBar.querySelector('#workbookTermChips');
    ['Term 1', 'Term 2'].forEach(term => {
      const b = document.createElement('button');
      b.className = 'chip' + (term === currentWorkbookTerm ? ' sel' : '');
      b.textContent = term;
      b.onclick = () => { currentWorkbookTerm = term; renderMonthlyAssessment(monthlyAssessmentTargetEl); };
      termChipsWrap.appendChild(b);
    });

    // --- Book picker — filtered to the selected term, clean names only
    // (no page range/competency count clutter in the option text). ---
    const booksThisTerm = books.filter(b => bookBelongsToTerm(b.name, currentWorkbookTerm));
    if(!booksThisTerm.length){
      container.appendChild(mdCard(null, 'No workbooks for ' + currentWorkbookTerm + ' are set up for ' + esc(level) + ' yet.', null));
      return;
    }
    if(!currentWorkbookCompetencyBookName || !booksThisTerm.some(b => b.name === currentWorkbookCompetencyBookName)) currentWorkbookCompetencyBookName = booksThisTerm[0].name;
    const bookBar = document.createElement('div'); bookBar.className = 'fbar'; bookBar.style.marginBottom = '14px';
    bookBar.innerHTML = '<div class="ctl"><label>Workbook</label><select id="workbookCompBookSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    container.appendChild(bookBar);
    const bookSel = bookBar.querySelector('#workbookCompBookSelect');
    booksThisTerm.forEach(b => {
      const opt = document.createElement('option'); opt.value = b.name;
      opt.textContent = b.name;
      if(b.name === currentWorkbookCompetencyBookName) opt.selected = true;
      bookSel.appendChild(opt);
    });
    bookSel.onchange = () => { currentWorkbookCompetencyBookName = bookSel.value; renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    const selectedBook = booksThisTerm.find(b => b.name === currentWorkbookCompetencyBookName);
    const competencies = selectedBook.competencies;

    if(!competencies.length){
      container.appendChild(mdCard(null, 'No competency data has been entered for ' + esc(selectedBook.name) + ' yet.', null));
      return;
    }

    const tally = workbookCompetencyTallyCache[currentWorkbookMonth];

    // Group by Curricular Goal, matching the real handwritten record's grouping.
    const byGoal = [];
    competencies.forEach(c => {
      let group = byGoal.find(g => g.curricular_goal_id === c.curricular_goal_id);
      if(!group){ group = { curricular_goal_id: c.curricular_goal_id, goal_text: c.goal_text, items: [] }; byGoal.push(group); }
      group.items.push(c);
    });

    // ---- Import previous data (collapsed by default) ----
    const wbImportToggle = document.createElement('div');
    wbImportToggle.className = 'card'; wbImportToggle.style.cssText = 'padding:0; margin-bottom:14px; overflow:hidden;';
    wbImportToggle.innerHTML = `
      <div onclick="workbookImportOpen = !workbookImportOpen; this.nextElementSibling.classList.toggle('hidden', !workbookImportOpen); this.querySelector('.chevron').style.transform = workbookImportOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import ${esc(selectedBook.name)} tally from a file</h3>
          <p class="cap" style="margin:0;">.csv or .xlsx, one row per competency — tap to open and choose a file, or fill in the numbers by hand in the table below.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${workbookImportOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${workbookImportOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    container.appendChild(wbImportToggle);
    wbImportToggle.querySelector('div:last-child').appendChild(renderWorkbookTallyImportCard(selectedBook));

    if(myClassInfo.class_id){
      ensureWorkbookMonthSubmissionLoaded(myClassInfo.class_id, currentWorkbookMonth, () => renderMonthlyAssessment(monthlyAssessmentTargetEl));
    }
    const submissionStatus = workbookMonthSubmissionCache[currentWorkbookMonth];
    const isSubmitted = submissionStatus && typeof submissionStatus === 'object' && submissionStatus.submitted;

    container.appendChild(mdSec(esc(selectedBook.name) + ' — ' + currentWorkbookMonth, '<span class="reqs">ASM-WB1…WB4</span>'));
    const hpcNote = document.createElement('p');
    hpcNote.className = 'cap'; hpcNote.style.margin = '4px 0 14px';
    hpcNote.innerHTML = 'Class-wide tally, not per-child — for each competency, enter how many children this month came out Emerging, Proficient, or Advanced. Based on continuous observation across the month, not a one-off test.';
    container.appendChild(hpcNote);

    let table = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="table-layout:fixed; width:100%; min-width:760px;"><colgroup><col style="width:15%;"><col style="width:38%;"><col style="width:17%;"><col style="width:10%;"><col style="width:10%;"><col style="width:10%;"></colgroup><thead><tr><th>Curricular Goal</th><th>Competency</th><th>Pages</th><th style="text-align:center;">E</th><th style="text-align:center;">P</th><th style="text-align:center;">A</th></tr></thead><tbody>';
    byGoal.forEach(g => {
      g.items.forEach((c, idx) => {
        const t = (tally && tally[c.id]) || { count_e: 0, count_p: 0, count_a: 0 };
        const numInput = (field, val) => `<input type="number" min="0" value="${val}" style="width:48px; text-align:center; padding:4px; border:1px solid var(--border); border-radius:5px; font-size:13px;" onchange="const row=workbookCompetencyTallyCache['${currentWorkbookMonth}'][${c.id}]||{count_e:0,count_p:0,count_a:0}; row['${field}']=Math.max(0,parseInt(this.value,10)||0); this.value=row['${field}']; saveWorkbookCompetencyTally(${c.id},'${currentWorkbookMonth}',row.count_e,row.count_p,row.count_a);" />`;
        table += `<tr>${idx === 0 ? `<td rowspan="${g.items.length}" style="vertical-align:top; font-weight:600;">${esc(g.goal_text)}</td>` : ''}
          <td title="${esc(c.cg_code)}" style="white-space:normal; word-wrap:break-word; overflow-wrap:break-word; padding:8px 10px; text-align:left;">${esc(c.competency_text)}</td>
          <td class="dim" style="white-space:normal; word-wrap:break-word; overflow-wrap:break-word; font-size:12px;">${esc(c.page_numbers || '—')}</td>
          <td style="text-align:center;">${numInput('count_e', t.count_e)}</td>
          <td style="text-align:center;">${numInput('count_p', t.count_p)}</td>
          <td style="text-align:center;">${numInput('count_a', t.count_a)}</td>
        </tr>`;
      });
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Each number saves as soon as you change it — no separate Save step. These are class-wide counts for ' + currentWorkbookMonth + ', not tied to named children.', wrap));

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
      <p class="cap" style="margin:0 0 8px;">.csv or .xlsx — header row must be exactly: cg_code,count_e,count_p,count_a — cg_code must match one of ${esc(selectedBook.name)}'s competencies (shown as the small grey code under each competency), counts are whole numbers ≥ 0. Applies to ${esc(currentWorkbookMonth)} — the month currently selected above. One row per competency, not per child.</p>
      <input type="file" id="workbookTallyImportInput" accept=".csv,.xlsx" />
      <div id="workbookTallyImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importWorkbookTallyFile()">Import</button>
    `;
    return wrap;
  }

  async function importWorkbookTallyFile(){
    const input = document.getElementById('workbookTallyImportInput');
    const resultEl = document.getElementById('workbookTallyImportResult');
    if(!input.files.length){
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
    try { rows = await readAssessmentFileRows(input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }

    const header = rows[0].map(h => h.toLowerCase());
    if(header.join(',') !== 'cg_code,count_e,count_p,count_a'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: cg_code,count_e,count_p,count_a — got: ${esc(rows[0].join(','))}</div>`;
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
    observation: { label: 'Classroom Observation', icon: '👁️', reqs: 'ASM-O1…O3' },
    workbook: { label: 'Workbook Assessment', icon: '📘', reqs: 'ASM-WB1…WB4' },
    pretest: { label: 'Pre-Test', icon: '📋', reqs: 'ASM-PT1…3' },
    motor: { label: 'Fine & Gross Motor', icon: '🤸', reqs: 'ASM-M1…M2' }
  };
  // Weekly Assessment and Monthly Assessment were removed pending a
  // restructure — was previously a computed rollup (Weekly Review /
  // Monthly Review) over Workbook + Classroom Observation evidence.
  // WEEKLY_ASSESSMENT_ACTIVITIES and TIER_INFO below are NOT dead code —
  // Pre-Test still depends on both directly, since it shares the same
  // real 26-activity list.
  let assessmentEntryType = 'observation';
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
  function ensureMonthlyAssessmentSeeded(){
    // The skeleton object for each student must exist regardless of
    // whether value-seeding is disabled — "clear and start fresh"
    // means values stay genuinely blank, not that the per-student
    // object itself should be missing. Without this, anything reading
    // monthlyAssessmentEntries[name][domain] directly (Assessment
    // Dashboard's Overview, Child by domain table) throws on a name
    // that was never touched after a reset, instead of just showing a
    // real zero — this is exactly what was crashing that page silently.
    assessmentPupilNames().forEach(name => { if(!monthlyAssessmentEntries[name]) monthlyAssessmentEntries[name] = {}; });
    if(monthlyAssessmentSeedingDisabled) return; // explicitly cleared — stay genuinely blank until real data is entered
    assessmentPupilNames().forEach(name => {
      ASSESSMENT_DOMAINS.forEach(d => {
        if(monthlyAssessmentEntries[name][d.key] !== undefined) return; // already real or already seeded
        const recorded = sampleRand(name + d.key + 'rec') > 0.1; // ~90% of cells recorded, a few blank
        monthlyAssessmentEntries[name][d.key] = recorded ? samplePick(name + d.key + 'ma', ['E','P','A']) : null;
      });
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
    gradeGrid.innerHTML = assessmentPupilNames().map(name => {
      const tier = weekStore[name][String(selectedWeeklyActivityIdx)];
      const btns = ['E','P','A'].map(t => {
        const active = tier === t;
        const letter = TIER_INFO[t].letter;
        return `<button onclick="setWeeklyActivityQuickTier('${esc(name)}','${t}')" title="${TIER_INFO[t].n}" style="flex:1; padding:6px 0; border-radius:5px; border:${active ? 'none' : '1px solid var(--border)'}; background:${active ? tierColors[t] : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:11px; font-weight:700; cursor:pointer;">${letter}</button>`;
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
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>#</th><th>Type</th><th>Activity</th><th>CG</th><th>Page</th><th>Marked</th><th>B</th><th>P</th><th>A</th><th>Avg</th><th>% Advanced</th></tr></thead><tbody>';
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
    let sTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th><th>Activities assessed</th><th>B</th><th>P</th><th>A</th><th>Total score</th><th>Max possible</th><th>% Achievement</th><th>Band</th></tr></thead><tbody>';
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
      <div class="hd"><div><h3>Import Weekly Assessment from a file</h3><p class="cap">.csv or .xlsx — header row must be exactly: child_name,activity_no,tier — activity_no is 1-${WEEKLY_ASSESSMENT_ACTIVITIES.length} (matching the activity list above, in order), tier is B/P/A. Built for large rolls: one row per child per activity, so a 40-child class is 40 rows, not 40 columns.</p></div></div>
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
      head: [['#', 'Type', 'Activity', 'CG', 'Page', 'Marked', 'B', 'P', 'A', 'Avg', '% Advanced']],
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
      head: [['Child', 'Activities assessed', 'B', 'P', 'A', 'Total score', 'Max possible', '% Achievement', 'Band']],
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
  let preTestTypeFilter = 'Worksheet'; // 'Worksheet' | 'Classroom' — the two real activity types in WEEKLY_ASSESSMENT_ACTIVITIES, kept as two separate tables rather than merged

  // Kept per CLASS (storage key includes the class id), so two class
  // logins used on the same browser never see each other's counts.
  const preTestTallyEntries = {}; // activityIdx (string) -> {count_e, count_p, count_a}
  var preTestTallyLoadedFor = null;
  function ensurePreTestTallyForClass(){
    const cid = myClassInfo && myClassInfo.class_id;
    if(!cid || preTestTallyLoadedFor === cid) return;
    Object.keys(preTestTallyEntries).forEach(k => delete preTestTallyEntries[k]);
    try {
      const raw = localStorage.getItem('preTestTallyEntries:' + cid);
      if(raw) Object.assign(preTestTallyEntries, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
    preTestTallyLoadedFor = cid;
  }
  function savePreTestTallyEntries(){
    ensurePreTestTallyForClass();
    if(!myClassInfo || !myClassInfo.class_id) return;
    try { localStorage.setItem('preTestTallyEntries:' + myClassInfo.class_id, JSON.stringify(preTestTallyEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory only */ }
  }
  function setPreTestTallyCount(activityIdx, field, value){
    ensurePreTestTallyForClass();
    const key = String(activityIdx);
    if(!preTestTallyEntries[key]) preTestTallyEntries[key] = { count_e: 0, count_p: 0, count_a: 0 };
    preTestTallyEntries[key][field] = Math.max(0, parseInt(value, 10) || 0);
    savePreTestTallyEntries();
  }

  function renderPreTestClassSection(container){
    ensurePreTestTallyForClass();
    let totalMarked = 0;
    const tot = { E: 0, P: 0, A: 0 };
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const t = preTestTallyEntries[String(idx)] || { count_e: 0, count_p: 0, count_a: 0 };
      tot.E += t.count_e; tot.P += t.count_p; tot.A += t.count_a;
      totalMarked += t.count_e + t.count_p + t.count_a;
    });
    const classSize = assessmentPupilNames().length;
    const totalCells = WEEKLY_ASSESSMENT_ACTIVITIES.length * classSize;
    const completeness = totalCells ? Math.round(totalMarked / totalCells * 100) : 0;
    const avgScore = totalMarked ? Math.round((tot.A*3 + tot.P*2 + tot.E*1) / totalMarked * 100) / 100 : 0;
    const pctAdvanced = totalMarked ? Math.round(tot.A / totalMarked * 100) : 0;

    container.appendChild(mdSec('Pre-Test', '<span class="reqs">ASM-PT1…3</span>'));
    const ptNote = document.createElement('p');
    ptNote.className = 'cap'; ptNote.style.margin = '4px 0 14px';
    ptNote.textContent = 'The baseline worksheet, done once per child before teaching starts — same 26 activities as Weekly Assessment. Class-wide counts, not tied to named children (same model as Workbook Assessment).';
    container.appendChild(ptNote);

    container.appendChild(mdGrid('g4', [
      mdTile('Activities', WEEKLY_ASSESSMENT_ACTIVITIES.length, '20 worksheet + 6 classroom', mdPill('Baseline', 'info'), 'ASM-PT1'),
      mdTile('Recording complete', completeness, '% of cells', mdPill(mdStatusBand(completeness, 90, 70).l, mdStatusBand(completeness, 90, 70).c), 'ASM-PT2', mdMeter(completeness)),
      mdTile('Class avg score', avgScore, 'of 3', mdPill(mdStatusBand(avgScore/3*100).l, mdStatusBand(avgScore/3*100).c), 'ASM-PT3', mdMeter(avgScore/3*100)),
      mdTile('% Advanced', pctAdvanced, 'achieved', mdPill(mdStatusBand(pctAdvanced).l, mdStatusBand(pctAdvanced).c), 'ASM-PT3', mdMeter(pctAdvanced))
    ]));

    container.appendChild(mdSec('Add data — Pre-Test', '<span class="reqs">ASM-PT1…3</span>'));
    // Two separate tables (Worksheet / Classroom) picked via a
    // dropdown, rather than one merged table — these are genuinely
    // different activity types (paper worksheet vs. an in-classroom
    // task), so keeping them apart avoids implying they're the same
    // kind of evidence. "Page" is replaced with the actual CG
    // specification (e.g. "CG 1.2") each row covers — more useful here
    // than a workbook page number, since Pre-Test activities aren't
    // tied to book pages the way Workbook Assessment is.
    const typeBar = document.createElement('div'); typeBar.className = 'fbar card'; typeBar.style.cssText = 'margin-bottom:16px; padding:16px 18px;';
    typeBar.innerHTML = '<div class="ctl"><label>Activity type</label><select id="preTestTypeSelect" style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    container.appendChild(typeBar);
    const typeSel = typeBar.querySelector('#preTestTypeSelect');
    ['Worksheet', 'Classroom'].forEach(t => {
      const opt = document.createElement('option'); opt.value = t; opt.textContent = t;
      if(t === preTestTypeFilter) opt.selected = true;
      typeSel.appendChild(opt);
    });
    typeSel.onchange = () => { preTestTypeFilter = typeSel.value; renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    // ---- Import previous data (collapsed by default) ----
    const ptImportToggle = document.createElement('div');
    ptImportToggle.className = 'card'; ptImportToggle.style.cssText = 'padding:0; margin-bottom:14px; overflow:hidden;';
    ptImportToggle.innerHTML = `
      <div onclick="preTestImportOpen = !preTestImportOpen; this.nextElementSibling.classList.toggle('hidden', !preTestImportOpen); this.querySelector('.chevron').style.transform = preTestImportOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import Pre-Test from a file</h3>
          <p class="cap" style="margin:0;">.csv or .xlsx, one row per activity — tap to open and choose a file, or fill in the numbers by hand in the table below.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${preTestImportOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${preTestImportOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    container.appendChild(ptImportToggle);
    ptImportToggle.querySelector('div:last-child').appendChild(renderPreTestImportCard());

    // Report download lives in Assessment Dashboard → Assessment records.
    container.appendChild(assessmentReportsLink('pretest'));

    container.appendChild(mdSec(preTestTypeFilter + ' activities', '<span class="reqs">ASM-PT1…3</span>'));
    // CG-grouped table for whichever type is selected — same rowspan
    // pattern as Workbook Assessment's Curricular Goal grouping, and
    // the same inline number-box tally entry, saving on every change.
    const cgGroups = [];
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      if(a.type !== preTestTypeFilter) return;
      const cgMajor = (a.cg.match(/CG\s*(\d+)/) || [])[1] || '0';
      let group = cgGroups.find(g => g.cgMajor === cgMajor);
      if(!group){ group = { cgMajor, items: [] }; cgGroups.push(group); }
      group.items.push(Object.assign({}, a, { idx }));
    });
    cgGroups.sort((x, y) => parseInt(x.cgMajor, 10) - parseInt(y.cgMajor, 10));

    const numInput = (activityIdx, field, val) => `<input type="number" min="0" value="${val}" style="width:52px; text-align:center; padding:4px; border:1px solid var(--border); border-radius:5px; font-size:13px;" onchange="setPreTestTallyCount(${activityIdx}, '${field}', this.value); this.value=(preTestTallyEntries[String(${activityIdx})]||{}).${field}||0;" />`;

    let pickerTable = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="table-layout:fixed; width:100%; min-width:760px; border-collapse:separate; border-spacing:0;"><colgroup><col style="width:12%;"><col style="width:42%;"><col style="width:14%;"><col style="width:10%;"><col style="width:11%;"><col style="width:11%;"></colgroup><thead><tr><th style="padding:10px 12px;">Curricular Goal</th><th style="padding:10px 12px;">Activity</th><th style="padding:10px 12px;">Specification</th><th style="padding:10px 12px; text-align:center;">E</th><th style="padding:10px 12px; text-align:center;">P</th><th style="padding:10px 12px; text-align:center;">A</th></tr></thead><tbody>';
    if(!cgGroups.length){
      pickerTable += `<tr><td colspan="6" class="dim" style="text-align:center; padding:20px;">No ${esc(preTestTypeFilter)} activities are defined.</td></tr>`;
    }
    cgGroups.forEach(g => {
      g.items.forEach((a, idx) => {
        const t = preTestTallyEntries[String(a.idx)] || { count_e: 0, count_p: 0, count_a: 0 };
        pickerTable += `<tr style="border-bottom:1px solid var(--border);">
          ${idx === 0 ? `<td rowspan="${g.items.length}" style="vertical-align:top; font-weight:600; padding:14px 12px;">CG-${esc(g.cgMajor)}</td>` : ''}
          <td style="word-wrap:break-word; text-align:left; padding:14px 12px;">${esc(a.activity)}</td>
          <td class="dim" style="padding:14px 12px;">${esc(a.cg)}</td>
          <td style="text-align:center; padding:14px 12px;">${numInput(a.idx, 'count_e', t.count_e)}</td>
          <td style="text-align:center; padding:14px 12px;">${numInput(a.idx, 'count_p', t.count_p)}</td>
          <td style="text-align:center; padding:14px 12px;">${numInput(a.idx, 'count_a', t.count_a)}</td>
        </tr>`;
      });
    });
    pickerTable += '</tbody></table></div>';
    const pickerWrap = document.createElement('div'); pickerWrap.innerHTML = pickerTable;
    container.appendChild(mdCard(null, 'Each number saves as soon as you change it — the button below is just a visible confirmation, not a separate required step. These are class-wide counts, not tied to named children.', pickerWrap));

    // Explicit Save confirmation — every cell already auto-saves on
    // change, but a visible, tappable button gives the same reassurance
    // the app's other data-entry screens already offer (e.g. My Day's
    // "✓ Save activity"), rather than relying purely on an invisible
    // per-keystroke save.
    const ptSaveRow = document.createElement('div');
    ptSaveRow.style.cssText = 'display:flex; align-items:center; gap:10px; margin:12px 0 24px;';
    const ptSaveBtn = document.createElement('button');
    ptSaveBtn.className = 'btn-primary';
    ptSaveBtn.style.cssText = 'width:auto; padding:10px 22px;';
    ptSaveBtn.textContent = '✓ Save';
    const ptSaveMsg = document.createElement('span');
    ptSaveMsg.style.cssText = 'font-size:13px; color:var(--success, #0ca30c);';
    ptSaveBtn.onclick = () => {
      ptSaveMsg.textContent = '✓ Saved';
      setTimeout(() => { ptSaveMsg.textContent = ''; }, 2000);
    };
    ptSaveRow.appendChild(ptSaveBtn);
    ptSaveRow.appendChild(ptSaveMsg);
    container.appendChild(ptSaveRow);

    // ---- Every activity, at a glance (collapsed by default) — a
    // read-only denser view of exactly the same data already visible
    // in the editable table above, same reasoning as My Day's
    // "clubbed overview" collapse: two views of the same numbers
    // shouldn't both be open by default. ----
    const ptGlanceToggle = document.createElement('div');
    ptGlanceToggle.className = 'card'; ptGlanceToggle.style.cssText = 'padding:0; margin-bottom:14px; overflow:hidden;';
    ptGlanceToggle.innerHTML = `
      <div onclick="preTestGlanceOpen = !preTestGlanceOpen; this.nextElementSibling.classList.toggle('hidden', !preTestGlanceOpen); this.querySelector('.chevron').style.transform = preTestGlanceOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📊 Every activity, at a glance</h3>
          <p class="cap" style="margin:0;">Both activity types combined, read-only, with averages — the same numbers as the editable table above.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${preTestGlanceOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${preTestGlanceOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    container.appendChild(ptGlanceToggle);
    const ptGlanceBody = ptGlanceToggle.querySelector('div:last-child');
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>#</th><th>Type</th><th>Activity</th><th>CG</th><th>E</th><th>P</th><th>A</th><th>Avg</th><th>% Advanced</th></tr></thead><tbody>';
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const t = preTestTallyEntries[String(idx)] || { count_e: 0, count_p: 0, count_a: 0 };
      const marked = t.count_e + t.count_p + t.count_a;
      const rowAvg = marked ? Math.round((t.count_a*3 + t.count_p*2 + t.count_e*1) / marked * 100) / 100 : 0;
      const rowPctA = marked ? Math.round(t.count_a / marked * 100) : 0;
      table += `<tr>
        <td class="dim">${idx + 1}</td><td class="dim">${esc(a.type)}</td><td><b>${esc(a.activity)}</b></td><td class="dim">${esc(a.cg)}</td>
        <td>${t.count_e}</td><td>${t.count_p}</td><td>${t.count_a}</td><td>${rowAvg}</td><td>${marked ? rowPctA + '%' : '—'}</td>
      </tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    ptGlanceBody.appendChild(wrap);
  }

  function renderPreTestImportCard(){
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <p class="cap" style="margin:0 0 8px;">.csv or .xlsx — header row must be exactly: activity_no,count_e,count_p,count_a — activity_no is 1-${WEEKLY_ASSESSMENT_ACTIVITIES.length} (matching the # column in "Every activity, at a glance" below), counts are whole numbers ≥ 0. One row per activity, not per child — same class-wide model as the table above.</p>
      <input type="file" id="preTestImportInput" accept=".csv,.xlsx" />
      <div id="preTestImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importPreTestFile()">Import</button>
    `;
    return wrap;
  }

  async function importPreTestFile(){
    ensurePreTestTallyForClass();
    const input = document.getElementById('preTestImportInput');
    const resultEl = document.getElementById('preTestImportResult');
    if(!input.files.length){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';
    let rows;
    try { rows = await readAssessmentFileRows(input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }
    const header = rows[0].map(h => h.toLowerCase());
    if(header.join(',') !== 'activity_no,count_e,count_p,count_a'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: activity_no,count_e,count_p,count_a — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }
    let imported = 0;
    const skipped = [];
    for(let i = 1; i < rows.length; i++){
      const parts = rows[i];
      const rowNum = i + 1;
      if(parts.length !== 4){ skipped.push(`Row ${rowNum}: expected 4 columns, got ${parts.length}`); continue; }
      const [activityNoRaw, eRaw, pRaw, aRaw] = parts;
      const activityIdx = parseInt(activityNoRaw, 10) - 1;
      if(isNaN(activityIdx) || activityIdx < 0 || activityIdx >= WEEKLY_ASSESSMENT_ACTIVITIES.length){ skipped.push(`Row ${rowNum}: "${activityNoRaw}" must be 1-${WEEKLY_ASSESSMENT_ACTIVITIES.length}`); continue; }
      const e = parseInt(eRaw, 10), p = parseInt(pRaw, 10), a = parseInt(aRaw, 10);
      if(isNaN(e) || isNaN(p) || isNaN(a) || e < 0 || p < 0 || a < 0){
        skipped.push(`Row ${rowNum}: counts must be whole numbers ≥ 0 — got "${eRaw}, ${pRaw}, ${aRaw}"`);
        continue;
      }
      preTestTallyEntries[String(activityIdx)] = { count_e: e, count_p: p, count_a: a };
      imported++;
    }
    if(imported > 0) savePreTestTallyEntries();
    let html = `<div class="au-success">✓ Filled in ${imported} activit${imported === 1 ? 'y' : 'ies'} — saved.</div>`;
    if(skipped.length > 0){
      html += `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<ul style="margin:4px 0 0 18px;">${skipped.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`;
    }
    resultEl.innerHTML = html;
    alert(`Imported ${imported} Pre-Test activit${imported === 1 ? 'y' : 'ies'}.` + (skipped.length ? ` ${skipped.length} skipped — see the details below.` : ''));
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

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
      head: [['#', 'Type', 'Activity', 'CG', 'E', 'P', 'A', 'Avg', '% Advanced']],
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
      head: [['Child', 'Activities assessed', 'B', 'P', 'A', 'Total score', 'Max possible', '% Achievement', 'Band']],
      body: assessmentPupilNames().map(name => {
        let se = 0, sp = 0, sa = 0, assessed = 0;
        WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
          const v = preTestAssessmentEntries[name] && preTestAssessmentEntries[name][String(idx)];
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

    doc.save('pre-test-' + todayKey() + '.pdf');
  }

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
      <div class="hd"><div><h3>Import Classroom Observation from a file</h3><p class="cap">.csv or .xlsx — header row must be exactly: child_name,theme,cg_code,level_mark — theme must match a theme name scheduled this month, cg_code must match one of that theme's items, level_mark is E/P/A.</p></div></div>
      <input type="file" id="observationImportInput" accept=".csv,.xlsx" style="margin-top:8px;" />
      <div id="observationImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importObservationAssessmentFile()">Import</button>
    `;
    return wrap;
  }

  async function importObservationAssessmentFile(){
    const input = document.getElementById('observationImportInput');
    const resultEl = document.getElementById('observationImportResult');
    if(!input.files.length){ resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>'; return; }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';

    let rows;
    try { rows = await readAssessmentFileRows(input.files[0]); }
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
      const item = theme.items.find(it => it.cg_code.toLowerCase() === (cgCode || '').trim().toLowerCase());
      if(!item){ skipped.push(`Row ${rowNum}: CG code "${cgCode}" isn't part of "${theme.name}"`); continue; }
      const mark = (levelMarkRaw || '').trim().toUpperCase();
      if(!['E','P','A'].includes(mark)){ skipped.push(`Row ${rowNum}: level_mark must be E, P, or A — got "${levelMarkRaw}"`); continue; }

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

    // Reuses the same month picker/state as Workbook Assessment
    // (currentWorkbookMonth) — one "which month" concept for the whole
    // Assessment section rather than two separate month selectors that
    // could drift out of sync.
    const monthBar = document.createElement('div'); monthBar.className = 'fbar'; monthBar.style.marginBottom = '18px';
    monthBar.innerHTML = '<div class="ctl"><label>Month</label><select id="observationMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    container.appendChild(monthBar);
    const monthSel = monthBar.querySelector('#observationMonthSelect');
    WORKBOOK_MONTHS.forEach(m => {
      const opt = document.createElement('option'); opt.value = m; opt.textContent = m;
      if(m === currentWorkbookMonth) opt.selected = true;
      monthSel.appendChild(opt);
    });
    monthSel.onchange = () => { currentWorkbookMonth = monthSel.value; renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    const cadenceNote = document.createElement('p');
    cadenceNote.className = 'cap'; cadenceNote.style.margin = '0 0 16px';
    cadenceNote.innerHTML = '<b>' + esc(level) + ' themes</b> — 2 to 4 themes are scheduled per month, each observed through everyday classroom activity, not a formal test.';
    container.appendChild(cadenceNote);

    if(!ensurePupilsLoadedFor(container, () => renderMonthlyAssessment(monthlyAssessmentTargetEl))) return;

    const themesLoaded = ensureObservationThemesLoaded(level, currentWorkbookMonth, () => renderMonthlyAssessment(monthlyAssessmentTargetEl));
    const marksLoaded = ensureObservationAssessmentLoaded(currentWorkbookMonth, () => renderMonthlyAssessment(monthlyAssessmentTargetEl));
    const themesKey = level + '|' + currentWorkbookMonth;
    if(typeof observationThemesCache[themesKey] === 'string' && observationThemesCache[themesKey].startsWith('error:')){
      renderRetryCard(container, observationThemesCache[themesKey].slice(6), () => delete observationThemesCache[themesKey]); return;
    }
    if(typeof observationAssessmentCache[currentWorkbookMonth] === 'string' && observationAssessmentCache[currentWorkbookMonth].startsWith('error:')){
      renderRetryCard(container, observationAssessmentCache[currentWorkbookMonth].slice(6), () => delete observationAssessmentCache[currentWorkbookMonth]); return;
    }
    if(!themesLoaded || !marksLoaded){ container.appendChild(mdCard(null, 'Loading observation themes…', null)); return; }

    const themes = observationThemesCache[themesKey];
    const marks = observationAssessmentCache[currentWorkbookMonth];

    if(!themes.length){
      container.appendChild(mdCard(null, 'No themes are scheduled for ' + currentWorkbookMonth + ' yet.', null));
      return;
    }

    // --- Theme picker — same "pick the group, then its grid opens"
    // pattern as Workbook Assessment's book picker. ---
    if(!currentObservationThemeId || !themes.some(t => t.id === currentObservationThemeId)) currentObservationThemeId = themes[0].id;
    const themeBar = document.createElement('div'); themeBar.className = 'fbar'; themeBar.style.marginBottom = '18px';
    themeBar.innerHTML = '<div class="ctl"><label>Theme</label><select id="observationThemeSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    container.appendChild(themeBar);
    const themeSel = themeBar.querySelector('#observationThemeSelect');
    themes.forEach(t => {
      const opt = document.createElement('option'); opt.value = t.id; opt.textContent = t.name + ' (' + t.items.length + ' items)';
      if(t.id === currentObservationThemeId) opt.selected = true;
      themeSel.appendChild(opt);
    });
    themeSel.onchange = () => { currentObservationThemeId = parseInt(themeSel.value, 10); renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    const selectedTheme = themes.find(t => t.id === currentObservationThemeId);
    const items = selectedTheme.items;

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
    container.appendChild(obsImportToggle);
    obsImportToggle.querySelector('div:last-child').appendChild(renderObservationImportCard());

    const anyGraded = Object.keys(marks).some(pid => Object.keys(marks[pid] || {}).length);
    container.appendChild(mdSec(esc(selectedTheme.name) + ' — ' + currentWorkbookMonth, '<span class="reqs">ASM-O1…O3</span>'));

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
          return `<button onclick="saveObservationMark(${pupil.id},${it.id},${mark ? "'" + mark + "'" : 'null'},'${t}')" title="${TIER_INFO[t].n}" style="width:22px; height:22px; padding:0; border-radius:5px; border:${active ? 'none' : '1px solid var(--border)'}; background:${active ? tierColors[t] : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:10.5px; font-weight:700; cursor:pointer;">${TIER_INFO[t].letter}</button>`;
        }).join('');
        return `<td style="text-align:center;"><div style="display:flex; gap:3px; justify-content:center;">${btns}</div></td>`;
      }).join('');
      table += `<tr><td><b>${esc(name)}</b></td>${cells}</tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Tap E, P, or A directly to record an observation — tapping the already-active letter clears it. Each tap saves immediately, no separate Save step.', wrap));

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
  const MOTOR_RATINGS = {
    G: { label: 'Achieved', color: 'var(--success, #0ca30c)' },
    Y: { label: 'Developing', color: '#EE8F35' },
    R: { label: 'Needs Support', color: 'var(--danger, #c8433f)' }
  };

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

  const MOTOR_WORD_TO_RATING = { G: 'G', Y: 'Y', R: 'R', ACHIEVED: 'G', DEVELOPING: 'Y', 'NEEDS SUPPORT': 'R' };

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
        if(!rating){ out.problems.push(`${rawName}, ${m}: "${row[col]}" isn't G, Y or R — skipped`); return; }
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
        ['G = Achieved   |   Y = Developing   |   R = Needs Support'],
        [],
        ['ROLL NO.', 'STUDENT NAME', ...MOTOR_MONTHS.map(m => m.toUpperCase()), 'TEACHER NOTES'],
        ['', '', ...MOTOR_MONTHS.map(m => MOTOR_ACTIVITIES[type][m].title + '\n' + MOTOR_ACTIVITIES[type][m].detail), '']
      ];
      realPupilsCache.forEach((p, i) => rows.push([i + 1, p.name, ...MOTOR_MONTHS.map(m => motorRating(p.id, type, m) || ''), motorNote(p.id, type)]));
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
        <p class="cap" style="margin:0 0 8px;">Use the same layout as the assessment sheet: a header row <b>ROLL NO. · STUDENT NAME · JUNE · JULY · AUGUST · SEPTEMBER · OCTOBER · TEACHER NOTES</b>, then one row per child with G, Y or R under each month. An .xlsx can hold both tabs (FINE MOTOR and GROSS MOTOR); a .csv goes to the sheet selected above (${motorSkillType === 'fine' ? 'Fine Motor' : 'Gross Motor'}). Names must match this class's roll — other names are skipped.</p>
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
    const ratingFill = { G: [212, 237, 218], Y: [253, 236, 200], R: [248, 215, 218] };
    ['fine', 'gross'].forEach((type, ti) => {
      if(ti > 0) doc.addPage();
      doc.setFontSize(14);
      doc.text(type === 'fine' ? 'Fine Motor Assessment Sheet' : 'Gross Motor Assessment Sheet', 14, 15);
      doc.setFontSize(9);
      doc.text('School: ' + (myClassInfo.school_name || '') + '    Class: ' + (myClassInfo.class_name || '') + '    Academic Year: ' + new Date().getFullYear() + '    · generated ' + new Date().toLocaleDateString(), 14, 21);
      doc.text('G = Achieved   |   Y = Developing   |   R = Needs Support   |   blank = not rated', 14, 26);
      doc.autoTable({
        startY: 31,
        head: [['Roll', 'Student name', ...MOTOR_MONTHS.map(m => m + '\n' + MOTOR_ACTIVITIES[type][m].title), 'Teacher notes']],
        body: realPupilsCache.map((p, i) => [i + 1, p.name, ...MOTOR_MONTHS.map(m => motorRating(p.id, type, m) || ''), motorNote(p.id, type)]),
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

  function renderMotorAssessmentSection(container){
    const typeLabel = motorSkillType === 'fine' ? 'Fine Motor' : 'Gross Motor';
    container.appendChild(mdSec(typeLabel + ' assessment', '<span class="reqs">ASM-M1…M2</span>'));
    const note = document.createElement('p');
    note.className = 'cap'; note.style.margin = '4px 0 14px';
    note.textContent = 'One activity a month, June to October. Rate every child G Achieved · Y Developing · R Needs Support — tap a letter to set it, tap it again to clear. Each tap saves to the database.';
    container.appendChild(note);

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

    if(!myClassInfo.class_id){ container.appendChild(mdCard(null, 'Loading your class info…', null)); return; }
    if(typeof motorAssessmentCache === 'string' && motorAssessmentCache.startsWith('error:')){
      renderRetryCard(container, motorAssessmentCache.slice(6), () => { motorAssessmentCache = null; });
      return;
    }
    if(!ensureMotorAssessmentLoaded()){ container.appendChild(mdCard(null, 'Loading ratings…', null)); return; }

    const pupils = realPupilsCache;
    if(!pupils.length){ container.appendChild(mdCard(null, 'No children on the roll yet — add them in Class Attendance → Admissions.', null)); return; }

    container.appendChild(renderMotorImportCard());

    // Real counts per month for the selected sheet
    const monthIdx = MOTOR_MONTHS.indexOf(new Date().toLocaleDateString('en-US', {month: 'long'}));
    const tiles = MOTOR_MONTHS.map((m, i) => {
      const counts = { G: 0, Y: 0, R: 0 };
      pupils.forEach(p => { const r = motorRating(p.id, motorSkillType, m); if(r) counts[r]++; });
      const rated = counts.G + counts.Y + counts.R;
      return mdTile(m + (i === monthIdx ? ' · now' : ''), rated ? counts.G : '—', rated ? 'of ' + rated + ' achieved' : 'not rated yet',
        rated ? mdPill(counts.Y + ' developing · ' + counts.R + ' support', counts.R ? 'warn' : 'good') : mdPill('No data yet', 'neu'),
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
        const btns = ['G', 'Y', 'R'].map(r => {
          const active = current === r;
          return `<button onclick="setMotorRating(${p.id}, '${m}', '${r}')" title="${MOTOR_RATINGS[r].label}" style="width:30px; height:30px; padding:0; border-radius:6px; border:${active ? 'none' : '1px solid var(--border,#d9dcd5)'}; background:${active ? MOTOR_RATINGS[r].color : '#fff'}; color:${active ? '#fff' : 'var(--text,#0c0e0b)'}; font-size:11px; font-weight:700; cursor:pointer;">${r}</button>`;
        }).join('');
        return `<td style="text-align:center; ${cellPad} ${i === monthIdx ? 'background:var(--surface-2,#eceee9);' : ''}"><div style="display:inline-flex; gap:8px;">${btns}</div></td>`;
      }).join('');
      table += `<tr><td class="dim" style="text-align:left; ${cellPad}">${idx + 1}</td><td style="text-align:left; ${cellPad}"><b>${esc(p.name)}</b></td>${cells}
        <td style="text-align:left; ${cellPad}"><input type="text" data-pupil="${p.id}" class="motor-note-input" value="${esc(motorNote(p.id, motorSkillType))}" placeholder="Add a note" style="width:100%; min-width:200px; padding:8px 10px; border:1px solid var(--border,#d9dcd5); border-radius:6px; font-size:12.5px; font-family:inherit; box-sizing:border-box;" /></td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Hover a month heading to see the full activity. G Achieved · Y Developing · R Needs Support. A blank cell has not been rated and is never counted.', wrap));
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
    container.appendChild(typeBar);

    // Workbook Assessment has a genuinely different real structure too
    // (real book pages, grouped by physical workbook, scoped by month —
    // not the 10-domain grid Classroom Observation used to share) and
    // is server-backed rather than a client-side store, so it gets its
    // own dedicated renderer.
    if(assessmentEntryType === 'workbook'){
      renderWorkbookAssessmentSection(container);
      return;
    }

    // Classroom Observation is now real, theme-based, and month-scoped
    // (see renderObservationAssessmentSection above) — no longer the
    // flat 10-domain grid the generic renderer below still serves.
    if(assessmentEntryType === 'observation'){
      renderObservationAssessmentSection(container);
      return;
    }

    // Pre-Test moved here from Reports > Assessment Dashboard > Child
    // Record — that page mixed real data entry with analysis, and
    // Reports should only ever hold analysis. Pre-Test is real entry
    // (same 26 real activities Weekly used to grade), so it belongs in
    // Assessment. Child Record still shows a read-only summary of what's
    // recorded here — never editable buttons.
    if(assessmentEntryType === 'pretest'){
      renderPreTestClassSection(container);
      return;
    }

    // Fine & Gross Motor — monthly activity sheets (June–October), G/Y/R
    // per child, real database. Comes right after Pre-Test.
    if(assessmentEntryType === 'motor'){
      renderMotorAssessmentSection(container);
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
    container.appendChild(mdGrid('g5', [
      mdTile('Scope', scopeLabel, typeInfo.label, mdPill('Open for recording', 'info'), typeInfo.reqs),
      mdTile('Recording complete', completeness, '% of cells', mdPill(mdStatusBand(completeness, 90, 70).l, mdStatusBand(completeness, 90, 70).c), 'ASM-13', mdMeter(completeness)),
      mdTile('Class DSI', dsi, 'of 200', mdPill(mdStatusBand(dsi/2).l, mdStatusBand(dsi/2).c), 'DSI', mdMeter(dsi/2)),
      mdTile('At Proficient or above', sriPct, '% SRI', mdPill(mdStatusBand(sriPct).l, mdStatusBand(sriPct).c), 'SRI', mdMeter(sriPct)),
      mdTile('Children with no movement', noMovementCount, 'of ' + assessmentPupilNames().length, noMovementCount > assessmentPupilNames().length/3 ? mdPill('Look at the teaching', 'crit') : mdPill('Expected at this point', 'neu'), 'ASM-17')
    ]));

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

  // A "⬇ Download report (PDF)" bar for the top of any report.
  // getRoot is a function so the export reads the report as it is at
  // the moment of the click, not when the button was drawn.
  function reportDownloadBar(getRoot, title, fileStem, note){
    const bar = document.createElement('div');
    bar.setAttribute('data-no-export', '1');
    bar.style.cssText = 'display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:0 0 14px;';
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
          body.insertBefore(bar, body.firstChild);
        }
        return out;
      };
      wrapped.__withDownload = true;
      window.renderParentInvolvement = wrapped;
      return true;
    };
    if(!wrap()) window.addEventListener('load', wrap);
  })();

  var assessmentRecordsType = 'observation'; // 'observation' | 'workbook' | 'pretest' | 'motor'

  function assessmentRecordsRerender(){
    const body = document.getElementById('assessmentdashboard-body');
    if(body && !body.classList.contains('hidden') && assessmentDashboardTab === 'records') renderAssessmentDashboard();
  }

  // Used by the entry screens: jump straight to this tab.
  function openAssessmentRecords(type){
    assessmentRecordsType = type;
    assessmentDashboardTab = 'records';
    switchSidebarSection('assessmentdashboard');
  }

  // The small pointer each entry screen shows where its download used to be.
  function assessmentReportsLink(type){
    const p = document.createElement('p');
    p.className = 'cap';
    p.style.cssText = 'margin:14px 0 0; padding:10px 14px; border-left:3px solid var(--primary); background:var(--bg); border-radius:0 8px 8px 0;';
    p.innerHTML = `📊 The report for this assessment is in <a href="#" onclick="openAssessmentRecords('${type}'); return false;" style="color:var(--primary); font-weight:600;">Assessment Dashboard → Assessment records</a>.`;
    return p;
  }

  function recordsLetterPill(letter, cls){
    return letter
      ? `<span class="pill ${cls}" style="min-width:22px; justify-content:center;">${esc(letter)}</span>`
      : '<span class="dim">·</span>';
  }

  function recordsDownloadRow(buttons, note){
    const row = document.createElement('div');
    row.className = 'card';
    row.style.cssText = 'padding:14px 18px; margin:0 0 18px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';
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
    [['observation', '👁️ Classroom Observation'], ['workbook', '📘 Workbook'], ['pretest', '📋 Pre-Test'], ['motor', '🤸 Fine & Gross Motor'], ['myclass', '🧒 My Class weekly ratings']].forEach(([key, label]) => {
      const b = document.createElement('button');
      b.className = 'chip' + (assessmentRecordsType === key ? ' sel' : '');
      b.textContent = label;
      b.onclick = () => { assessmentRecordsType = key; renderAssessmentDashboard(); };
      chips.appendChild(b);
    });

    // Month picker for the month-scoped instruments — the same shared
    // month the Assessment screens use.
    if(assessmentRecordsType === 'observation' || assessmentRecordsType === 'workbook'){
      const bar = document.createElement('div'); bar.className = 'fbar'; bar.style.marginBottom = '14px';
      bar.innerHTML = '<div class="ctl"><label>Month</label><select id="recordsMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
      container.appendChild(bar);
      const sel = bar.querySelector('#recordsMonthSelect');
      WORKBOOK_MONTHS.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; if(m === currentWorkbookMonth) o.selected = true; sel.appendChild(o); });
      sel.onchange = () => { currentWorkbookMonth = sel.value; renderAssessmentDashboard(); };
    }

    const body = document.createElement('div');
    container.appendChild(body);
    if(!ensurePupilsLoadedFor(body, assessmentRecordsRerender)) return;

    if(assessmentRecordsType === 'observation') renderObservationRecords(body);
    else if(assessmentRecordsType === 'workbook') renderWorkbookRecords(body);
    else if(assessmentRecordsType === 'pretest') renderPreTestRecords(body);
    else if(assessmentRecordsType === 'myclass') renderMyClassRecords(body);
    else renderMotorRecords(body);
  }

  function recordsErrorCard(container, message, clearFn){
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="card" style="padding:16px;"><p style="margin:0 0 10px;">${esc(message)}</p><button class="btn-primary" style="width:auto; padding:7px 14px;">Retry</button></div>`;
    wrap.querySelector('button').onclick = () => { clearFn(); renderAssessmentDashboard(); };
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

    themes.forEach(t => {
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

    books.forEach(book => {
      if(!book.competencies.length) return;
      let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">CG</th><th style="text-align:left;">Competency</th><th style="text-align:center;">E</th><th style="text-align:center;">P</th><th style="text-align:center;">A</th></tr></thead><tbody>';
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

    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>#</th><th style="text-align:left;">Type</th><th style="text-align:left;">Activity</th><th style="text-align:left;">CG</th><th style="text-align:center;">E</th><th style="text-align:center;">P</th><th style="text-align:center;">A</th><th style="text-align:center;">Avg</th></tr></thead><tbody>';
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const t = preTestTallyEntries[String(idx)] || { count_e: 0, count_p: 0, count_a: 0 };
      const marked = t.count_e + t.count_p + t.count_a;
      const avg = marked ? Math.round((t.count_a*3 + t.count_p*2 + t.count_e) / marked * 100) / 100 : null;
      table += `<tr><td class="dim">${idx + 1}</td><td class="dim" style="text-align:left;">${esc(a.type)}</td><td style="text-align:left; white-space:normal;">${esc(a.activity)}</td><td class="dim" style="text-align:left;">${esc(a.cg)}</td><td style="text-align:center;">${t.count_e}</td><td style="text-align:center;">${t.count_p}</td><td style="text-align:center;">${t.count_a}</td><td style="text-align:center;">${avg === null ? '—' : avg}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard('Pre-Test — class baseline', 'Class-wide counts per activity (E Emerging · P Proficient · A Advanced). Avg weights E=1, P=2, A=3.', wrap));
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
    ['fine', 'gross'].forEach(type => {
      let rated = 0;
      let table = '<div class="report-table-wrap"><table class="report-table" style="min-width:900px;"><thead><tr><th style="text-align:left;">Roll</th><th style="text-align:left;">Child</th>'
        + MOTOR_MONTHS.map(m => `<th style="text-align:center; white-space:normal;" title="${esc(MOTOR_ACTIVITIES[type][m].detail)}">${esc(m)}<br><span style="font-weight:600; text-transform:none; letter-spacing:0;">${esc(MOTOR_ACTIVITIES[type][m].title)}</span></th>`).join('')
        + '<th style="text-align:left;">Teacher notes</th></tr></thead><tbody>';
      realPupilsCache.forEach((p, i) => {
        table += `<tr><td class="dim" style="text-align:left;">${i + 1}</td><td style="text-align:left;"><b>${esc(p.name)}</b></td>` + MOTOR_MONTHS.map(m => {
          const r = motorRating(p.id, type, m); if(r) rated++;
          return `<td style="text-align:center;">${recordsLetterPill(r, r ? cls[r] : '')}</td>`;
        }).join('') + `<td style="text-align:left; white-space:normal;" class="dim">${esc(motorNote(p.id, type)) || '—'}</td></tr>`;
      });
      table += '</tbody></table></div>';
      const wrap = document.createElement('div'); wrap.innerHTML = table;
      const card = mdCard(type === 'fine' ? '✋ Fine Motor' : '🏃 Gross Motor', rated + ' of ' + (realPupilsCache.length * MOTOR_MONTHS.length) + ' ratings recorded · G Achieved · Y Developing · R Needs Support', wrap);
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
    prevB.onclick = () => { recordsMyClassWeek = week - 1; renderAssessmentDashboard(); };
    nextB.onclick = () => { recordsMyClassWeek = week + 1; renderAssessmentDashboard(); };
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
    const container = document.getElementById('assessmentdashboard-body');
    container.innerHTML = '';

    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex; gap:8px; margin:14px 0; overflow-x:auto; flex-wrap:wrap;';
    const tabStyle = (active) => `padding:8px 16px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:${active ? '600' : '400'}; white-space:nowrap;`;
    tabBar.innerHTML = `
      <button style="${tabStyle(assessmentDashboardTab === 'overview')}" onclick="switchAssessmentDashboardTab('overview')">◆ Overview</button>
      <button style="${tabStyle(assessmentDashboardTab === 'records')}" onclick="switchAssessmentDashboardTab('records')">▤ Assessment records</button>
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
    if(!ensurePupilsLoadedFor(container, () => renderAssessmentDashboardOverview(container))) return;
    const stats = computeAssessmentDashboardStats();
    const monthName = new Date().toLocaleDateString([], {month:'long', year:'numeric'});

    const heading = document.createElement('div');
    heading.style.cssText = 'display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:4px;';
    heading.innerHTML = `<h1 style="margin:0;">Assessment dashboard</h1>
      <span class="reqs">REP-01…07</span>`;
    container.appendChild(heading);

    const subhead = document.createElement('p');
    subhead.className = 'cap';
    subhead.style.margin = '0 0 10px';
    subhead.textContent = `Teacher · ${monthName} · Scale B/P/A · weights 1·2·3 · DSI 0–200 · benchmark ${BENCHMARK_DSI}`;
    container.appendChild(subhead);

    const downloadRow = document.createElement('div');
    downloadRow.style.cssText = 'margin:2px 0 10px;';
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇ Download report (PDF)';
    downloadBtn.style.cssText = 'padding:8px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
    downloadBtn.onclick = downloadAssessmentDashboardOverviewPdf;
    downloadRow.appendChild(downloadBtn);
    container.appendChild(downloadRow);

    const explainer = document.createElement('p');
    explainer.className = 'cap';
    explainer.style.margin = '10px 0 18px';
    explainer.innerHTML = `Every figure below is computed only from what's actually recorded on Monthly Assessment — a blank cell (·) is never counted as Beginner, and an incomplete month reads as incomplete rather than quietly better than it is.`;
    container.appendChild(explainer);

    container.appendChild(mdGrid('g5', [
      mdTile('Class DSI', stats.recordedCount ? stats.classDSI : '—', 'of 200', stats.recordedCount ? mdPill(mdStatusBand(stats.classDSI, BENCHMARK_DSI*1.25, BENCHMARK_DSI).l, mdStatusBand(stats.classDSI, BENCHMARK_DSI*1.25, BENCHMARK_DSI).c) : mdPill('No data yet', 'neu'), 'DSI', stats.recordedCount ? mdMeter(stats.classDSI/2) : null),
      mdTile('At Proficient or above', stats.recordedCount ? stats.sriPct : '—', stats.recordedCount ? '% SRI' : '', stats.recordedCount ? mdPill(mdStatusBand(stats.sriPct).l, mdStatusBand(stats.sriPct).c) : mdPill('No data yet', 'neu'), 'SRI', stats.recordedCount ? mdMeter(stats.sriPct) : null),
      mdTile('Recording complete', stats.completeness, '% observation', mdPill(mdStatusBand(stats.completeness, 90, 70).l, mdStatusBand(stats.completeness, 90, 70).c), 'ASM-30', mdMeter(stats.completeness)),
      mdTile('Feedback notes shared', stats.notesSharedCount, 'of ' + assessmentPupilNames().length + ' children', mdPill(stats.notesSharedCount === assessmentPupilNames().length ? 'All shared' : 'In progress', stats.notesSharedCount === assessmentPupilNames().length ? 'good' : 'neu'), 'FBK-14'),
      mdTile('Issues flagged', stats.flaggedDomains.length, 'from this report', stats.flaggedDomains.length ? mdPill('Needs review', 'crit') : mdPill('None', 'good'), 'REP-05')
    ]));

    const issuesCard = document.createElement('div');
    issuesCard.className = 'card'; issuesCard.style.padding = '22px'; issuesCard.style.marginTop = '22px'; issuesCard.style.marginBottom = '22px';
    if(stats.flaggedDomains.length === 0){
      issuesCard.innerHTML = `<h4 style="margin:0 0 4px;">Nothing flagged this month</h4>
        <p class="cap" style="margin:0;">${stats.recordedCount ? 'Every recorded domain is at or above the ' + BENCHMARK_DSI + ' benchmark.' : 'Nothing has been recorded yet, so there is nothing to flag.'}</p>`;
    } else {
      issuesCard.innerHTML = `<h4 style="margin:0 0 4px;">Domains below benchmark</h4>
        <p class="cap" style="margin:0 0 12px;">Below ${BENCHMARK_DSI} DSI means, on average, this domain hasn't reached Proficient across the class yet.</p>
        <div class="list">${stats.flaggedDomains.map(x => `<div class="row"><div class="t"><b>${esc(x.d.full)}</b></div><div>${x.dsi} of 200 ${mdPill('Below benchmark', 'crit')}</div></div>`).join('')}</div>`;
    }
    container.appendChild(issuesCard);

    // ---- Class assessment overall ----
    container.appendChild(mdSec('Class assessment overall', '<span class="reqs">REP-01/02</span>'));
    const standsCard = document.createElement('div');
    standsCard.className = 'card'; standsCard.style.padding = '22px';
    let standsRows = '';
    stats.domainStats.forEach(x => {
      const pE = x.n ? x.tot.E/x.n*100 : 0, pP = x.n ? x.tot.P/x.n*100 : 0, pA = x.n ? x.tot.A/x.n*100 : 0;
      standsRows += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
        <div style="width:110px; font-size:12px; flex-shrink:0;">${esc(x.d.full)}</div>
        <div style="flex:1; height:16px; border-radius:4px; overflow:hidden; display:flex; background:var(--bg);">
          ${x.n ? `<div style="width:${pE}%; background:#AFC9EE;"></div><div style="width:${pP}%; background:#5B8FD6;"></div><div style="width:${pA}%; background:#2C5AA0;"></div>` : ''}
        </div>
        <div style="width:44px; font-size:12px; text-align:right; flex-shrink:0;">${x.n ? x.sri + '%' : '—'}</div>
      </div>`;
    });
    standsCard.innerHTML = `<h4 style="margin:0 0 4px;">Where the class stands</h4>
      <p class="cap" style="margin:0 0 16px;">Share of recorded cells at each tier, by domain. The number is the share at Proficient or above.</p>
      ${standsRows}
      <p style="font-size:11px; color:var(--text-muted); margin:10px 0 0;">
        <span style="display:inline-block; width:8px; height:8px; background:#AFC9EE; border-radius:2px; margin-right:4px;"></span>Beginner (w1)
        &nbsp;&nbsp;<span style="display:inline-block; width:8px; height:8px; background:#5B8FD6; border-radius:2px; margin-right:4px;"></span>Proficient (w2)
        &nbsp;&nbsp;<span style="display:inline-block; width:8px; height:8px; background:#2C5AA0; border-radius:2px; margin-right:4px;"></span>Advanced (w3)
      </p>`;

    const strengthCard = document.createElement('div');
    strengthCard.className = 'card'; strengthCard.style.padding = '22px';
    const strengthAxisMax = 200;
    strengthCard.innerHTML = `<h4 style="margin:0 0 4px;">Domain Strength by domain</h4>
      <p class="cap" style="margin:0 0 16px;">DSI per domain, 0–200. Below ${BENCHMARK_DSI} is below the "all Proficient" benchmark.</p>
      <div class="hbar-axis">${[0,50,100,150,200].map(t => `<span>${t}</span>`).join('')}</div>
      ${stats.domainStats.map(x => {
        const color = x.n === 0 ? 'var(--border)' : x.dsi >= BENCHMARK_DSI*1.25 ? 'var(--success)' : x.dsi >= BENCHMARK_DSI ? '#EE8F35' : 'var(--danger,#c8433f)';
        return `<div class="hbar-row">
          <div class="hbar-row-label">${esc(x.d.full)}</div>
          <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(x.dsi/strengthAxisMax*100)}%; background:${color};"></div></div>
          <div class="hbar-count">${x.n ? x.dsi : '—'}</div>
        </div>`;
      }).join('')}`;

    const twoColAsm = document.createElement('div');
    twoColAsm.className = 'transition-two-col';
    twoColAsm.appendChild(standsCard);
    twoColAsm.appendChild(strengthCard);
    container.appendChild(twoColAsm);

    // ---- Class Progress — pulled in from the standalone Class
    // Progress report, but wired to the same real monthlyAssessmentEntries
    // this whole dashboard already uses, instead of that page's own
    // sample-random tiles. Advanced% and conversion% are genuinely new
    // information not shown elsewhere on this dashboard. ----
    container.appendChild(mdSec('Class Progress', '<span class="reqs">ASM-02…04 · WBK-02</span>'));
    container.appendChild(mdGrid('g5', [
      mdTile('Class SRI', stats.recordedCount ? stats.sriPct : '—', stats.recordedCount ? '%' : '', stats.recordedCount ? mdPill(mdStatusBand(stats.sriPct).l, mdStatusBand(stats.sriPct).c) : mdPill('No data yet', 'neu'), 'SRI = (P+A) ÷ N × 100', stats.recordedCount ? mdMeter(stats.sriPct) : null),
      mdTile('Class CPI', stats.recordedCount ? stats.classDSI : '—', '/200', stats.recordedCount ? mdPill(mdStatusBand(stats.classDSI/2).l, mdStatusBand(stats.classDSI/2).c) : mdPill('No data yet', 'neu'), 'Σ Domain DSI ÷ 10', stats.recordedCount ? mdMeter(stats.classDSI/2) : null),
      mdTile('Advanced', stats.recordedCount ? stats.advancedPct : '—', stats.recordedCount ? '%' : '', mdPill('real', 'info'), 'ARI = A ÷ N × 100', stats.recordedCount ? mdMeter(stats.advancedPct) : null),
      mdTile('E → P conversion', stats.epConversion, '%', mdPill('P→A ' + stats.paConversion + '%', 'neu'), 'moved ÷ started at E × 100', mdMeter(stats.epConversion)),
      mdTile('Assessment complete', stats.completeness, '%', mdPill(mdStatusBand(stats.completeness).l, mdStatusBand(stats.completeness).c), 'ASM-03 · children × domains', mdMeter(stats.completeness))
    ]));

    container.appendChild(mdSec('Child by domain', '<span class="reqs">ASM-02…04 · WBK-02</span>'));
    let cbdTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th>' +
      ASSESSMENT_DOMAINS.map(d => `<th title="${esc(d.full)}">${esc(d.label)}</th>`).join('') + '<th>P+A</th><th>Band</th></tr></thead><tbody>';
    assessmentPupilNames().forEach(name => {
      const tiers = ASSESSMENT_DOMAINS.map(d => monthlyAssessmentEntries[name][d.key] || sampleTier(name + d.key + 'tier'));
      const paCount = tiers.filter(t => t !== 'E').length;
      const paPct = paCount / ASSESSMENT_DOMAINS.length * 100;
      const cells = ASSESSMENT_DOMAINS.map((d, j) => `<td><span class="pill ${TIER_INFO[tiers[j]].c}" title="${TIER_INFO[tiers[j]].n}">${tiers[j]}</span></td>`).join('');
      const band = mdStatusBand(paPct, 90, 70);
      const bandLabel = band.c === 'good' ? 'On track' : band.c === 'warn' ? 'Watch' : 'Action';
      cbdTable += `<tr style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(name)}')"><td><b>${esc(name)}</b></td>${cells}<td>${paCount}/${ASSESSMENT_DOMAINS.length}</td><td>${mdPill(bandLabel, band.c)}</td></tr>`;
    });
    cbdTable += '</tbody></table></div>';
    const cbdWrap = document.createElement('div'); cbdWrap.innerHTML = cbdTable;
    container.appendChild(mdCard(null, 'B Beginner · P Proficient · A Advanced. Cells without a recorded observation this month fall back to the child\'s current standing so the band always reflects where she actually is.', cbdWrap));

    // ---- Suggested improvements ----
    container.appendChild(mdSec('Suggested improvements', '<span class="reqs">REP-06/07</span>'));
    const weakest = stats.domainStats.filter(x => x.n > 0).sort((a,b) => a.dsi - b.dsi).slice(0, 3);
    const suggCard = document.createElement('div');
    suggCard.className = 'card'; suggCard.style.padding = '22px';
    if(weakest.length === 0){
      suggCard.innerHTML = `<h4 style="margin:0 0 4px;">What this report suggests, and who it goes to</h4>
        <p class="cap" style="margin:0;">Nothing recorded yet — suggestions need at least one observed domain to point at.</p>`;
    } else {
      let suggTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Domain</th><th>DSI</th><th>Change in class</th><th>Feedback area for the parent</th><th>Children affected</th></tr></thead><tbody>';
      weakest.forEach(x => {
        const affected = assessmentPupilNames().filter(name => monthlyAssessmentEntries[name][x.d.key] === 'E').length;
        suggTable += `<tr><td><b>${esc(x.d.full)}</b></td><td>${x.dsi}</td><td>Add a session a week in this domain</td><td>—</td><td>${affected}</td></tr>`;
      });
      suggTable += '</tbody></table></div>';
      suggCard.innerHTML = `<h4 style="margin:0 0 4px;">What this report suggests, and who it goes to</h4>
        <p class="cap" style="margin:0 0 16px;">REP-06 · each suggestion names the domain, the children it applies to, and whether it is a class change or a household one. A suggestion with no named recipient is a suggestion nobody acts on.</p>
        ${suggTable}
        <div style="margin-top:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <button class="btn-primary" style="width:auto; padding:9px 16px;" onclick="openFeedbackNotesStub()">Open feedback notes for these children</button>
          <span class="cap">REP-07 · the route from a report to a parent is one click, because a finding that stops at a dashboard has not reached anybody who can act on it.</span>
        </div>`;
    }
    container.appendChild(suggCard);
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
      <div class="hd"><div><h3>Import ${esc(typeLabel)} from a file</h3><p class="cap">.csv or .xlsx — header row must be exactly: child_name,domain,tier — domain is one of heal/phys/sens/envi/emot/part/logi/math/lang/arts, tier is B/P/A.</p></div></div>
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
    const container = document.getElementById('childrecord-body');
    container.innerHTML = '';
    const name = selectedName || SAMPLE_STUDENTS[0];

    const selectWrap = document.createElement('div'); selectWrap.className = 'fbar';
    selectWrap.innerHTML = `<div class="ctl"><label>Child</label><select id="childRecordSelect" style="padding:6px 10px; border:1px solid #0b0b0b33; border-radius:6px;"></select></div>
      <div class="grow" style="flex:1;"></div><div class="cap">Roll ${SAMPLE_STUDENTS.indexOf(name)+1} of ${SAMPLE_STUDENTS.length} · Jr KG · Triveni Sangam Municipal School</div>`;
    container.appendChild(selectWrap);
    const sel = selectWrap.querySelector('#childRecordSelect');
    SAMPLE_STUDENTS.forEach(n => {
      const opt = document.createElement('option'); opt.value = n; opt.textContent = n;
      if(n === name) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.onchange = () => renderChildRecord(sel.value);

    container.appendChild(reportDownloadBar(() => document.getElementById('childrecord-body'), 'Child Record — ' + name, 'child-record-' + name.replace(/\s+/g, '-').toLowerCase()));
    renderChildFeedbackSection(container, name);

    const tiers = ASSESSMENT_DOMAINS.map(d => (monthlyAssessmentEntries[name] && monthlyAssessmentEntries[name][d.key]) || sampleTier(name+d.key+'tier'));
    const paCount = tiers.filter(t => t !== 'E').length;
    const dsi = Math.round((tiers.filter(t=>t==='A').length*3 + tiers.filter(t=>t==='P').length*2 + tiers.filter(t=>t==='E').length*1) / (3*ASSESSMENT_DOMAINS.length) * 200 * 10) / 10;
    const attMean = Math.round(70 + sampleRand(name + 'attmean') * 28);
    const stuck = tiers.filter(t => t === 'E').length > 2 ? 1 : 0;

    container.appendChild(mdGrid('g5', [
      mdTile('Domain Strength', dsi, 'of 200', mdPill(mdStatusBand(dsi/2).l, mdStatusBand(dsi/2).c), 'DSI', mdMeter(dsi/2)),
      mdTile('At Proficient or above', paCount, 'of ' + ASSESSMENT_DOMAINS.length + ' domains', mdPill(mdStatusBand(paCount/ASSESSMENT_DOMAINS.length*100).l, mdStatusBand(paCount/ASSESSMENT_DOMAINS.length*100).c), 'SRI', mdMeter(paCount/ASSESSMENT_DOMAINS.length*100)),
      mdTile('Moved up this term', stuck ? 0 : 2, 'domains', stuck ? mdPill('No movement', 'warn') : mdPill('Progressing', 'good'), 'ASM-22'),
      mdTile('Attendance', attMean, '% year to date', mdPill(mdStatusBand(attMean).l, mdStatusBand(attMean).c), 'REG-05', mdMeter(attMean)),
      mdTile('Still Beginner', tiers.filter(t=>t==='E').length, 'domains', tiers.filter(t=>t==='E').length>=3 ? mdPill('Needs a plan', 'crit') : mdPill('Watch', 'warn'), 'ASM-24')
    ]));

    container.appendChild(mdSec('Domain by domain', '<span class="reqs">ASM-21…23</span>'));
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Domain</th><th>Last term</th><th>This term</th><th>Change</th></tr></thead><tbody>';
    ASSESSMENT_DOMAINS.forEach((d, i) => {
      const prevTier = sampleTier(name + d.key + 'prevtier');
      const curTier = tiers[i];
      const w = {E:1,P:2,A:3};
      const up = w[curTier] > w[prevTier];
      table += `<tr><td><b>${esc(d.full)}</b></td>
        <td><span class="pill ${TIER_INFO[prevTier].c}">${TIER_INFO[prevTier].letter}</span></td>
        <td><span class="pill ${TIER_INFO[curTier].c}">${TIER_INFO[curTier].letter}${up ? ' ↑' : ''}</span></td>
        <td>${up ? mdPill('Up a tier', 'good') : mdPill('No change', 'neu')}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard('Where ' + name.split(' ')[0] + ' is now, and where she was',
      'An arrow marks a tier gained since last term. B Beginner · P Proficient · A Advanced.', wrap));

    // --- Pre-Test — read-only summary only. Actual grading now lives
    // in Assessment > Pre-Test (moved there since Reports should only
    // ever show analysis, never data entry). This links there instead
    // of duplicating the editable form. ---
    const ptRecord = preTestAssessmentEntries[name] || {};
    let ptAssessed = 0, ptE = 0, ptP = 0, ptA = 0;
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const v = ptRecord[String(idx)];
      if(v === 'E') ptE++; else if(v === 'P') ptP++; else if(v === 'A') ptA++;
      if(v) ptAssessed++;
    });
    const ptScore = ptA*3 + ptP*2 + ptE*1;
    const ptMax = ptAssessed * 3;
    const ptPct = ptMax ? Math.round(ptScore / ptMax * 100) : 0;
    const ptBand = !ptAssessed ? mdPill('Not recorded', 'neu') : ptPct >= 85 ? mdPill('Advanced', 'good') : ptPct >= 60 ? mdPill('Proficient', 'warn') : mdPill('Beginner', 'crit');
    container.appendChild(mdSec('Pre-Test', '<span class="reqs">ASM-PT1…3</span>'));
    container.appendChild(mdGrid('g3', [
      mdTile('Activities recorded', ptAssessed, 'of ' + WEEKLY_ASSESSMENT_ACTIVITIES.length, ptAssessed === WEEKLY_ASSESSMENT_ACTIVITIES.length ? mdPill('Complete', 'good') : mdPill('In progress', 'warn'), 'ASM-PT1'),
      mdTile('% Achievement', ptAssessed ? ptPct : '—', ptAssessed ? '' : 'not recorded', ptBand, 'ASM-PT2'),
      mdTile('Overall band', ptAssessed ? (ptA >= ptP && ptA >= ptE ? 'Advanced' : ptP >= ptE ? 'Proficient' : 'Beginner') : '—', 'baseline', ptBand, 'ASM-PT3')
    ]));
    const ptLink = document.createElement('p');
    ptLink.className = 'cap'; ptLink.style.margin = '8px 0 0';
    ptLink.innerHTML = 'To enter or change Pre-Test grades, go to <a href="#" onclick="switchSidebarSection(\'assessment\'); assessmentEntryType=\'pretest\'; renderMonthlyAssessment(document.getElementById(\'assessment-body\')); return false;" style="color:var(--primary); font-weight:600;">Assessment → Pre-Test</a>.';
    container.appendChild(ptLink);
  }

  // preTestAssessmentEntries[studentName][activityIndexAsString] = 'E'|'P'|'A'
  const preTestAssessmentEntries = {};
  (function loadPreTestAssessmentEntries(){
    try {
      const raw = localStorage.getItem('preTestAssessmentEntries');
      if(raw) Object.assign(preTestAssessmentEntries, JSON.parse(raw));
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
      if(v === 'E') se++; else if(v === 'P') sp++; else if(v === 'A') sa++;
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
    const tierColors = { E: 'var(--danger,#c8433f)', P: '#EE8F35', A: 'var(--success)' };
    gradeGrid.innerHTML = WEEKLY_ASSESSMENT_ACTIVITIES.map((a, idx) => {
      const tier = record[String(idx)];
      const btns = ['E','P','A'].map(t => {
        const active = tier === t;
        const letter = TIER_INFO[t].letter;
        return `<button onclick="setPreTestTier('${esc(name)}',${idx},'${t}')" title="${TIER_INFO[t].n}" style="flex:1; padding:5px 0; border-radius:5px; border:${active ? 'none' : '1px solid var(--border)'}; background:${active ? tierColors[t] : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:11px; font-weight:700; cursor:pointer;">${letter}</button>`;
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

  // ---------- 12. TEACHER PROFILE ----------
  // New screen — no equivalent existed anywhere in the app before this.
  // Sample data for the currently logged-in teacher (Mrs. Sharma), same
  // deterministic-sample pattern as everything else. A real version of
  // this would read from users.* plus a new teacher_profile table —
  // neither of which exist yet.
  function sampleTeacherProfile(){
    return {
      name: 'Mrs. Sharma',
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
  function renderTransition(targetEl){
    transitionTargetEl = targetEl || null;
    const container = targetEl || document.getElementById('transition-body');
    container.innerHTML = '';

    const jrCount = 3, srCount = 2;
    const jrOutcomes = { promoted: 3, 'left the area': 0, 'needs tracing': 0 };
    const jrTotal = Object.values(jrOutcomes).reduce((a,b) => a+b, 0);
    const jrRate = Math.round(jrOutcomes.promoted / jrTotal * 100);
    const readyRate = 78, traced = 92;

    const cohort = SAMPLE_STUDENTS.map(name => {
      const completion = Math.round(50 + sampleRand(name + 'trcomp') * 50);
      const attendance = Math.round(60 + sampleRand(name + 'tratt') * 40);
      const emergingDomains = ASSESSMENT_DOMAINS.filter(d => sampleTier(name + d.key + 'tier') === 'E');
      const flagged = isFlaggedForFollowUp(completion, emergingDomains.length, attendance);
      return { name, completion, attendance, emergingDomains, flagged };
    });
    const flaggedCount = cohort.filter(c => c.flagged).length;

    container.appendChild(reportDownloadBar(() => container, 'Transition report', 'transition'));
    container.appendChild(mdSec('Transition — Jr KG to Sr KG', '<span class="reqs">BAL-09…12 · DAT-52</span>'));
    container.appendChild(mdGrid('g5', [
      mdTile('Jr KG children', jrCount, 'Balvatika 2', mdPill('1 school', 'neu'), 'BAL-09'),
      mdTile('Promoted to Sr KG', jrRate, '%', mdPill(mdStatusBand(jrRate, 92, 85).l, mdStatusBand(jrRate, 92, 85).c), 'BAL-10', mdMeter(jrRate)),
      mdTile('School Ready', readyRate, '% of Sr KG', mdPill(mdStatusBand(readyRate, 70, 50).l, mdStatusBand(readyRate, 70, 50).c), 'BAL-06', mdMeter(readyRate)),
      mdTile('Destination traced', traced, '% of Sr KG', mdPill(mdStatusBand(traced, 90, 75).l, mdStatusBand(traced, 90, 75).c), 'BAL-12', mdMeter(traced)),
      mdTile('Flagged for follow-up', flaggedCount, 'of ' + cohort.length + ' children',
        flaggedCount ? mdPill('Needs review', 'warn') : mdPill('None flagged', 'good'),
        'BAL-13', mdMeter(flaggedCount / cohort.length * 100, 'warn'))
    ]));

    const jrTotalKids = jrTotal;
    const outcomeRows = Object.entries(jrOutcomes).map(([k, v]) => ({
      label: k[0].toUpperCase() + k.slice(1),
      count: v,
      pct: Math.round(v / jrTotalKids * 100),
      pill: k === 'promoted' ? mdPill('Continued', 'good') : (k === 'left the area' ? mdPill('Migration', 'warn') : mdPill('Needs tracing', 'crit'))
    }));
    const outcomeCard = document.createElement('div');
    outcomeCard.className = 'card'; outcomeCard.style.padding = '22px';
    outcomeCard.innerHTML = `
      <h4 style="margin:0 0 4px;">What happened to last year's Balvatika 2</h4>
      <p class="cap" style="margin:0 0 16px;">A child who does not appear in Sr KG has either left the area or been lost track of. BAL-10 keeps the two apart, because the first is migration and the second is a programme failure.</p>
      <div class="report-table-wrap"><table class="report-table">
        <thead><tr><th>Outcome</th><th>Children</th><th>Share</th><th></th></tr></thead>
        <tbody>
          ${outcomeRows.map(r => `<tr><td><b>${esc(r.label)}</b></td><td>${r.count}</td><td>${r.pct}%</td><td>${r.pill}</td></tr>`).join('')}
          <tr><td><b>Total</b></td><td><b>${jrTotalKids}</b></td><td><b>100%</b></td><td></td></tr>
        </tbody>
      </table></div>`;

    const readyCount = Math.round(srCount * readyRate / 100);
    const notReadyCount = srCount - readyCount;
    const axisMax = Math.max(6, Math.ceil(srCount / 6) * 6);
    const axisTicks = [0, axisMax/4, axisMax/2, axisMax*3/4, axisMax].map(n => Math.round(n));
    const readyCard = document.createElement('div');
    readyCard.className = 'card'; readyCard.style.padding = '22px';
    readyCard.innerHTML = `
      <h4 style="margin:0 0 4px;">Readiness of the promoted cohort</h4>
      <p class="cap" style="margin:0 0 16px;">Not a gate. BAL-09 records what the Sr KG teacher is receiving so she can plan the first month, and nothing in this table may hold a child back.</p>
      <div class="hbar-axis">${axisTicks.map(t => `<span>${t}</span>`).join('')}</div>
      <div class="hbar-row">
        <div class="hbar-row-label">Three or fewer domains at Beginner</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(readyCount/axisMax*100)}%; background:var(--success);"></div></div>
        <div class="hbar-count">${readyCount} children</div>
      </div>
      <div class="hbar-row">
        <div class="hbar-row-label">Four or more at Beginner</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(notReadyCount/axisMax*100)}%; background:#EE8F35;"></div></div>
        <div class="hbar-count">${notReadyCount} children</div>
      </div>`;

    const twoColBal = document.createElement('div');
    twoColBal.className = 'transition-two-col';
    twoColBal.appendChild(outcomeCard);
    twoColBal.appendChild(readyCard);
    container.appendChild(twoColBal);

    // ---- Sr KG → Grade 1: where the leaving cohort actually went ----
    const srDestinations = [
      { label: 'MCGM Grade 1 (same school)', count: Math.max(0, srCount - 1), confirmed: Math.max(0, srCount - 1) },
      { label: 'MCGM Grade 1 (other school)', count: srCount > 1 ? 1 : 0, confirmed: 0 }
    ].filter(d => d.count > 0);
    const srTotalKids = srDestinations.reduce((a, d) => a + d.count, 0) || srCount;

    container.appendChild(mdSec('Sr KG → Grade 1', '<span class="reqs">BAL-11…14</span>'));
    const destCard = document.createElement('div');
    destCard.className = 'card'; destCard.style.padding = '22px';
    const srTotalConfirmed = srDestinations.reduce((a, d) => a + d.confirmed, 0);
    destCard.innerHTML = `
      <h4 style="margin:0 0 4px;">Where the leaving cohort went</h4>
      <p class="cap" style="margin:0 0 16px;">BAL-12 · a destination is confirmed only when someone has actually checked. "Assumed to have continued" is recorded as not traced, and this is the single hardest figure in the programme to keep honest.</p>
      <div class="report-table-wrap"><table class="report-table">
        <thead><tr><th>Destination</th><th>Children</th><th>Share</th><th>Confirmed</th><th></th></tr></thead>
        <tbody>
          ${srDestinations.map(d => `<tr>
            <td><b>${esc(d.label)}</b></td>
            <td>${d.count}</td>
            <td>${Math.round(d.count / srTotalKids * 100)}%</td>
            <td>${d.confirmed} of ${d.count}</td>
            <td>${d.confirmed === d.count ? mdPill('Verified', 'good') : mdPill('Follow up', 'crit')}</td>
          </tr>`).join('')}
          <tr><td><b>Total</b></td><td><b>${srTotalKids}</b></td><td><b>100%</b></td><td><b>${srTotalConfirmed}</b></td><td></td></tr>
        </tbody>
      </table></div>`;
    container.appendChild(destCard);

    // ---- Readiness bands + parameter-by-parameter — same section,
    // right under the destinations table, same two-column card layout
    // and hbar components as the Balvatika cards above so headings,
    // spacing and type all read as one continuous report. ----
    const needsSupportCount = Math.round(notReadyCount * 0.6);
    const developingCount = notReadyCount - needsSupportCount;
    const bandAxisMax = Math.max(6, Math.ceil(srCount / 6) * 6);
    const bandTicks = [0, bandAxisMax/4, bandAxisMax/2, bandAxisMax*3/4, bandAxisMax].map(n => Math.round(n));
    const bandsCard = document.createElement('div');
    bandsCard.className = 'card'; bandsCard.style.padding = '22px';
    bandsCard.innerHTML = `
      <h4 style="margin:0 0 4px;">Readiness bands</h4>
      <p class="cap" style="margin:0 0 16px;">BAL-06 · three bands, from the eight parameters. Creative engagement is recorded but not counted towards the band (BAL-05) — a child is not less ready for Grade 1 because she does not like drawing.</p>
      <div class="hbar-axis">${bandTicks.map(t => `<span>${t}</span>`).join('')}</div>
      <div class="hbar-row">
        <div class="hbar-row-label">School Ready</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(readyCount/bandAxisMax*100)}%; background:var(--success);"></div></div>
        <div class="hbar-count">${readyCount} children</div>
      </div>
      <div class="hbar-row">
        <div class="hbar-row-label">Developing</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(developingCount/bandAxisMax*100)}%; background:#EE8F35;"></div></div>
        <div class="hbar-count">${developingCount} children</div>
      </div>
      <div class="hbar-row">
        <div class="hbar-row-label">Needs Support</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(needsSupportCount/bandAxisMax*100)}%; background:var(--danger,#c8433f);"></div></div>
        <div class="hbar-count">${needsSupportCount} children</div>
      </div>`;

    const READINESS_PARAMS = [
      {key:'lang', label:'Language readiness'},
      {key:'num', label:'Early numeracy'},
      {key:'socio', label:'Socio-emotional'},
      {key:'motor', label:'Physical & motor'},
      {key:'habits', label:'Learning habits'}
    ];
    const paramReadiness = READINESS_PARAMS.map(p => {
      const ready = Math.max(0, Math.min(srCount, Math.round(srCount * (0.4 + sampleRand('srparam' + p.key) * 0.6))));
      return { ...p, ready };
    });
    const paramCard = document.createElement('div');
    paramCard.className = 'card'; paramCard.style.padding = '22px';
    paramCard.innerHTML = `
      <h4 style="margin:0 0 4px;">Parameter by parameter</h4>
      <p class="cap" style="margin:0 0 16px;">Which readiness parameter the cohort is weakest on. This is the one table that should change what is taught in the last term of Sr KG.</p>
      <div class="hbar-axis">${['0%','25%','50%','75%','100%'].map(t => `<span>${t}</span>`).join('')}</div>
      ${paramReadiness.map(p => `
        <div class="hbar-row">
          <div class="hbar-row-label">${esc(p.label)}</div>
          <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(p.ready/srCount*100)}%; background:${p.ready/srCount >= 0.85 ? 'var(--success)' : p.ready/srCount >= 0.6 ? '#EE8F35' : 'var(--danger,#c8433f)'};"></div></div>
          <div class="hbar-count">${p.ready} of ${srCount}</div>
        </div>`).join('')}`;

    const twoColBands = document.createElement('div');
    twoColBands.className = 'transition-two-col';
    twoColBands.style.marginTop = '20px';
    twoColBands.appendChild(bandsCard);
    twoColBands.appendChild(paramCard);
    container.appendChild(twoColBands);

    container.appendChild(mdSec('Child roster', '<span class="reqs">BAL-13 · flagged children need follow-up</span>'));
    let rosterTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th><th>Completion</th><th>Domains emerging</th><th>Attendance</th><th></th></tr></thead><tbody>';
    cohort.forEach(c => {
      rosterTable += `<tr style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(c.name)}')">
        <td><b>${esc(c.name)}</b></td>
        <td>${c.completion}%</td>
        <td class="dim">${c.emergingDomains.length ? esc(c.emergingDomains.map(d => d.label).join(', ')) : '—'}</td>
        <td>${c.attendance}%</td>
        <td>${c.flagged ? mdPill('Follow up', 'crit') : ''}</td>
      </tr>`;
    });
    rosterTable += '</tbody></table></div>';
    const rosterWrap = document.createElement('div'); rosterWrap.innerHTML = rosterTable;
    container.appendChild(mdCard(null, 'A child is flagged when activity completion is below 70%, three or more domains are still Beginner, or attendance is below 80%. Tap a child\'s name for her full record.', rosterWrap));

    // ---- Charts & analysis — collapsed by default, expands on hover.
    // Deliberately kept INSIDE renderTransition() — it references
    // cohort and container, both local to this function. Sitting
    // outside (as found in the version you pasted) would throw
    // "cohort is not defined" the instant the script loads. ----
    if(!document.getElementById('transitionChartsStyle')){
      const style = document.createElement('style');
      style.id = 'transitionChartsStyle';
      style.textContent = `
        .transition-charts-wrap{ margin-top:16px; }
        .transition-charts-toggle{
          display:flex; align-items:center; justify-content:space-between;
          padding:12px 16px; background:var(--card,#fff);
          border:1px solid var(--border,#0b0b0b22); border-radius:10px;
          cursor:pointer; font-size:13px; font-weight:600;
        }
        .transition-charts-chevron{ transition:transform .2s ease; font-size:11px; color:var(--text-muted,#6d6b67); }
        .transition-charts-panel{
          display:none;
          background:var(--card,#fff); border:1px solid var(--border,#0b0b0b22);
          border-top:none; border-radius:0 0 10px 10px;
        }
        .transition-charts-wrap.open .transition-charts-panel{ display:block; }
        .transition-charts-wrap.open .transition-charts-chevron{ transform:rotate(90deg); }
        .transition-charts-panel-inner{ padding:18px; }
        .tc-hbar-row{ display:flex; align-items:center; gap:10px; margin-bottom:12px; }
        .tc-hbar-label{ width:150px; font-size:12px; flex-shrink:0; }
        .tc-hbar-track{ flex:1; height:14px; border-radius:4px; background:#0b0b0b12; overflow:hidden; display:flex; }
      `;
      document.head.appendChild(style);
    }

    const domainReadiness = ASSESSMENT_DOMAINS.map(d => {
      const emergingCount = cohort.filter(c => c.emergingDomains.some(ed => ed.key === d.key)).length;
      const securePct = Math.round((cohort.length - emergingCount) / cohort.length * 100);
      return { label: d.label, full: d.full, securePct };
    });

    const trendMonths = ['Jun','Jul','Aug','Sep','Oct'];
    const trendValues = trendMonths.map((m, i) => Math.round(35 + i * 12 + sampleRand('trend' + m) * 8));

    const chartsWrap = document.createElement('div');
    chartsWrap.className = 'transition-charts-wrap';
    chartsWrap.innerHTML = `
      <div class="transition-charts-toggle" onclick="this.closest('.transition-charts-wrap').classList.toggle('open')">
        <span>Charts &amp; analysis</span>
        <span class="transition-charts-chevron">▸</span>
      </div>
      <div class="transition-charts-panel">
        <div class="transition-charts-panel-inner">

          <div class="ctl" style="margin-bottom:16px; max-width:280px;">
            <label style="font-size:10.5px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; display:block;">Chart</label>
            <select onchange="switchTransitionChart(this.value)" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; background:#fff; font-family:inherit;">
              <option value="domain">Domain readiness at handoff</option>
              <option value="trend">Completion trend across the year</option>
            </select>
          </div>

          <div id="tcChart-domain" class="tc-chart">
            <p style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted,#6d6b67); margin:0 0 12px;">Domain readiness at handoff</p>
            ${domainReadiness.map(d => `
              <div class="tc-hbar-row">
                <span class="tc-hbar-label" title="${esc(d.full)}">${esc(d.label)}</span>
                <div class="tc-hbar-track">
                  <div style="width:${d.securePct}%; background:#1D9E75;"></div>
                  <div style="width:${100 - d.securePct}%; background:#E0A429;"></div>
                </div>
                <span style="width:40px; font-size:12px; text-align:right;">${d.securePct}%</span>
              </div>`).join('')}
            <p style="font-size:11px; color:var(--text-muted,#6d6b67); margin:4px 0 0;">
              <span style="display:inline-block; width:8px; height:8px; background:#1D9E75; border-radius:2px; margin-right:4px;"></span>Secure
              &nbsp;&nbsp;<span style="display:inline-block; width:8px; height:8px; background:#E0A429; border-radius:2px; margin-right:4px;"></span>Beginner
            </p>
          </div>

          <div id="tcChart-trend" class="tc-chart hidden">
            <p style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted,#6d6b67); margin:0 0 12px;">Completion trend across the year</p>
            <div style="display:flex; align-items:flex-end; gap:8px; height:90px;">
              ${trendValues.map(v => `<div style="flex:1; background:#378ADD; border-radius:3px 3px 0 0; height:${v}%;"></div>`).join('')}
            </div>
            <div style="display:flex; gap:8px; margin-top:6px;">
              ${trendMonths.map(m => `<span style="flex:1; text-align:center; font-size:11px; color:var(--text-muted,#6d6b67);">${m}</span>`).join('')}
            </div>
          </div>

        </div>
      </div>
    `;
    container.appendChild(chartsWrap);

    // ---- Net change by domain — replaces the old fake transition
    // matrix + "conversion by domain" table, which used SAMPLE_STUDENTS
    // and fabricated tier data with no connection to anything real.
    // workbook_competency_tally holds real class-wide counts
    // (count_e/count_p/count_a per competency per month) — but that's
    // aggregate data, not per-child tracking, so it can only honestly
    // support a NET CHANGE view (did the class's overall balance shift
    // toward Advanced between two months), never a literal "this child
    // moved from E to P" transition, which the old matrix implied but
    // no real data here could back.
    if(!dashboardTrendToMonth){
      dashboardTrendToMonth = WORKBOOK_MONTHS[WORKBOOK_MONTHS.length - 1];
      dashboardTrendFromMonth = WORKBOOK_MONTHS[Math.max(0, WORKBOOK_MONTHS.length - 2)];
    }

    const trendWrap = document.createElement('div');
    trendWrap.style.marginTop = '16px';
    const monthOptions = (selectedVal) => WORKBOOK_MONTHS.map(m => `<option value="${m}"${m === selectedVal ? ' selected' : ''}>${m}</option>`).join('');
    trendWrap.innerHTML = `
      <h4 style="margin:0 0 4px;">Net change by domain <span class="reqs">real, from Workbook Assessment tallies</span></h4>
      <p class="cap" style="margin:0 0 12px;">Comparing two months' class-wide E/P/A counts. This shows whether the class's overall balance shifted toward Advanced — it cannot show which specific child moved, since the tally isn't recorded per child.</p>
      <div class="fbar" style="margin-bottom:14px;">
        <div class="ctl"><label>From</label><select id="trendFromSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${monthOptions(dashboardTrendFromMonth)}</select></div>
        <div class="ctl"><label>To</label><select id="trendToSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${monthOptions(dashboardTrendToMonth)}</select></div>
      </div>
      <div id="trendTableTarget"></div>
    `;
    container.appendChild(trendWrap);
    trendWrap.querySelector('#trendFromSelect').onchange = (e) => { dashboardTrendFromMonth = e.target.value; renderAssessmentDashboardOverview(container); };
    trendWrap.querySelector('#trendToSelect').onchange = (e) => { dashboardTrendToMonth = e.target.value; renderAssessmentDashboardOverview(container); };

    const trendTarget = trendWrap.querySelector('#trendTableTarget');
    const trendKey = dashboardTrendFromMonth + '|' + dashboardTrendToMonth;
    const trendLoaded = ensureWorkbookTallyTrendLoaded(dashboardTrendFromMonth, dashboardTrendToMonth, () => renderAssessmentDashboardOverview(container));
    if(typeof workbookTallyTrendCache[trendKey] === 'string' && workbookTallyTrendCache[trendKey].startsWith('error:')){
      renderRetryCard(trendTarget, workbookTallyTrendCache[trendKey].slice(6), () => delete workbookTallyTrendCache[trendKey]);
      return;
    }
    if(!trendLoaded){ trendTarget.innerHTML = '<p class="cap">Loading…</p>'; return; }

    const competencies = workbookTallyTrendCache[trendKey];
    if(!competencies.length){
      trendTarget.innerHTML = '<p class="cap">No competencies are set up yet — add some in Workbook Assessment first.</p>';
      return;
    }

    // Roll up per development area (domain).
    const byArea = [];
    competencies.forEach(c => {
      let area = byArea.find(a => a.area_id === c.area_id);
      if(!area){ area = { area_id: c.area_id, area_name: c.area_name, goals: [] }; byArea.push(area); }
      let goal = area.goals.find(g => g.curricular_goal_id === c.curricular_goal_id);
      if(!goal){ goal = { curricular_goal_id: c.curricular_goal_id, goal_text: c.goal_text, e_from:0,p_from:0,a_from:0,e_to:0,p_to:0,a_to:0 }; area.goals.push(goal); }
      goal.e_from += c.e_from; goal.p_from += c.p_from; goal.a_from += c.a_from;
      goal.e_to += c.e_to; goal.p_to += c.p_to; goal.a_to += c.a_to;
    });

    const avgScore = (e,p,a) => { const total = e+p+a; return total ? Math.round((e*1+p*2+a*3)/total * 100) / 100 : null; };

    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Domain</th><th>Goal</th><th style="text-align:center;">' + esc(dashboardTrendFromMonth) + '<br><span style="font-weight:400;">E / P / A</span></th><th style="text-align:center;">' + esc(dashboardTrendToMonth) + '<br><span style="font-weight:400;">E / P / A</span></th><th>Avg score</th><th>Change</th></tr></thead><tbody>';
    byArea.forEach(area => {
      area.goals.forEach((g, idx) => {
        const fromAvg = avgScore(g.e_from, g.p_from, g.a_from);
        const toAvg = avgScore(g.e_to, g.p_to, g.a_to);
        let statusPill;
        if(fromAvg === null || toAvg === null) statusPill = mdPill('No data', 'neu');
        else if(toAvg > fromAvg) statusPill = mdPill('Shifted up', 'good');
        else if(toAvg < fromAvg) statusPill = mdPill('Shifted down', 'crit');
        else statusPill = mdPill('No change', 'neu');
        table += `<tr>${idx === 0 ? `<td rowspan="${area.goals.length}" style="vertical-align:top; font-weight:600;">${esc(area.area_name)}</td>` : ''}
          <td style="text-align:left;">${esc(g.goal_text)}</td>
          <td class="dim" style="text-align:center;">${g.e_from} / ${g.p_from} / ${g.a_from}</td>
          <td class="dim" style="text-align:center;">${g.e_to} / ${g.p_to} / ${g.a_to}</td>
          <td class="dim">${fromAvg !== null ? fromAvg : '—'} → ${toAvg !== null ? toAvg : '—'}</td>
          <td>${statusPill}</td>
        </tr>`;
      });
    });
    table += '</tbody></table></div>';
    trendTarget.innerHTML = '';
    const trendTableWrap = document.createElement('div');
    trendTableWrap.innerHTML = table;
    trendTarget.appendChild(trendTableWrap);
    const trendNote = document.createElement('p');
    trendNote.className = 'cap'; trendNote.style.cssText = 'margin-top:12px; border-left:3px solid var(--primary); padding-left:12px;';
    trendNote.innerHTML = '<b>What this can and cannot tell you.</b> "Avg score" is a weighted average (E=1, P=2, A=3) across however many children were tallied that month. A rising average means the class collectively leaned more toward Advanced — it does not mean every child individually improved, and the number of children tallied can differ month to month if attendance or recording was incomplete.';
    trendTarget.appendChild(trendNote);
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