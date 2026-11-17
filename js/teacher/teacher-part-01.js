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
