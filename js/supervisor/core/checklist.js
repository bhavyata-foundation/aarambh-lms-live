/* =========================================================================
   js/supervisor/core/checklist.js

   Supervisor shell controller:
   - Session guard
   - Sidebar / topbar chrome
   - Current sidebar section routing
   - Teacher demo list used by the existing visit context
   - Legacy visit-history fallback data

   IMPORTANT:
   This file is aligned to the CURRENT supervisor.html structure:

     visitschedule -> section-visitschedule / navVisitSchedule
     schools       -> section-schools       / navSchools
     effective     -> section-effective     / navEffective
     issues        -> section-issues        / navIssues
     events        -> section-events        / navEvents

   Visit Calendar / Upcoming Visits / Visit History are SUB-TABS inside
   Visit Schedule. They are not separate sidebar sections.
   ========================================================================= */


// =========================================================================
// SESSION GUARD
// =========================================================================

fetch('backend/auth/session_check.php' + window.location.search)
  .then(function (response) {
    return response.json();
  })
  .then(function (data) {

    if (
      data.status !== 'logged_in' ||
      data.role !== 'supervisor'
    ) {
      window.location.href = 'index.html';
    }

  })
  .catch(function () {
    window.location.href = 'index.html';
  });


// =========================================================================
// EXISTING DEMO TEACHER DATA
//
// Kept because visit-context.js currently reads TEACHERS for its initial
// currentVisit fallback. This can be replaced with real backend data later.
// =========================================================================

// Real teachers, fetched from the database — replaces the old
// hardcoded demo array. Starts empty; fetchRealTeachers() below fills
// it in once the real endpoint responds, then re-renders the list.
var TEACHERS = [];

// Fetches every real teacher + her actual assigned school/class/ward
// from get_teachers_for_supervisor.php. "status" (pending/done) isn't
// real data yet — no backend concept of "visited this week" exists —
// so it's approximated here by checking SupervisorVisitStore (the
// same real localStorage visits the Visit Schedule section uses) for
// a completed visit at that teacher's school+class within the last 7
// days. This is a reasonable stand-in, not a guarantee, since a visit
// currently isn't linked to a real teacher_id — only school+class name.
async function fetchRealTeachers(){
  try {
    const res = await fetch('backend/schools/get_teachers_for_supervisor.php' + window.location.search);
    const data = await res.json();
    if (data.status !== 'success' || !Array.isArray(data.teachers)) return;

    const visits = (window.SupervisorVisitStore && typeof window.SupervisorVisitStore.get === 'function')
      ? window.SupervisorVisitStore.get() : [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    TEACHERS = data.teachers.map(t => {
      const visitedRecently = visits.some(v =>
        v.status === 'completed' &&
        v.schoolName === t.school_name &&
        v.className === t.class_name &&
        v.completedAt &&
        new Date(v.completedAt) >= sevenDaysAgo
      );
      return {
        id: t.id,
        name: t.name,
        cls: t.class_name || 'Not linked to a class yet',
        schoolId: t.school_id,
        schoolName: t.school_name,
        ward: t.ward,
        status: visitedRecently ? 'done' : 'pending'
      };
    });

    renderTeacherList();

    // The context-fallback at the bottom of visit-context.js ran
    // before this fetch resolved (TEACHERS was still empty then), so
    // it never had real data to set — do it now that it exists.
    if (TEACHERS.length && typeof setCurrentVisit === 'function') {
      setCurrentVisit(TEACHERS[0].name, TEACHERS[0].cls, TEACHERS[0].schoolName || '', TEACHERS[0].ward || '');
    }
  } catch (err) {
    // Offline or server error — the sidebar just stays empty rather
    // than falling back to fake demo names, since that would be
    // actively misleading about which teachers are real.
  }
}


// =========================================================================
// LEGACY VISIT HISTORY FALLBACK
//
// visit-cover.js still reads HISTORY for previous-visit information. Keep
// the shared data available until the new Visit Schedule modules are fully
// database-backed. We no longer treat History as a sidebar section.
// =========================================================================

var HISTORY = [

  {
    date: '11 Aug',
    teacher: 'Mrs. Nair — Sr KG B',
    score: 94,
    flag: false
  },

  {
    date: '11 Aug',
    teacher: 'Mr. Rane — Jr KG C',
    score: 72,
    flag: true
  },

  {
    date: '8 Aug',
    teacher: 'Mrs. Sharma — Jr KG B',
    score: 88,
    flag: false
  },

  {
    date: '7 Aug',
    teacher: 'Ms. Fernandes — Jr KG A',
    score: 65,
    flag: true
  },

  {
    date: '5 Aug',
    teacher: 'Mrs. Iyer — Sr KG A',
    score: 91,
    flag: false
  }

];


var activeTeacherIdx = 0;


// =========================================================================
// SIDEBAR / USER MENU
// =========================================================================

function toggleSidebar() {

  var sidebar =
    document.getElementById('sidebar');

  var backdrop =
    document.getElementById('sidebarBackdrop');


  if (sidebar) {

    sidebar.classList.toggle(
      'open'
    );

  }


  if (backdrop) {

    backdrop.classList.toggle(
      'show'
    );

  }

}


function closeSidebar() {

  var sidebar =
    document.getElementById('sidebar');

  var backdrop =
    document.getElementById('sidebarBackdrop');


  if (sidebar) {

    sidebar.classList.remove(
      'open'
    );

  }


  if (backdrop) {

    backdrop.classList.remove(
      'show'
    );

  }

}


function toggleUserMenu() {

  var dropdown =
    document.getElementById(
      'userDropdown'
    );


  if (!dropdown) {
    return;
  }


  dropdown.classList.toggle(
    'hidden'
  );

}


function closeUserMenu() {

  var dropdown =
    document.getElementById(
      'userDropdown'
    );


  if (!dropdown) {
    return;
  }


  dropdown.classList.add(
    'hidden'
  );

}


document.addEventListener(
  'click',
  function (event) {

    var menu =
      document.getElementById(
        'userMenu'
      );


    if (
      menu &&
      !menu.contains(event.target)
    ) {

      closeUserMenu();

    }

  }
);


// =========================================================================
// CURRENT SUPERVISOR SECTION ROUTER
// =========================================================================

var SUPERVISOR_SECTION_CONFIG = {

  visitschedule: {

    navId:
      'navVisitSchedule',

    sectionId:
      'section-visitschedule',

    label:
      'Visit Schedule'

  },


  schools: {

    navId:
      'navSchools',

    sectionId:
      'section-schools',

    label:
      'My Schools'

  },


  effective: {

    navId:
      'navEffective',

    sectionId:
      'section-effective',

    label:
      'Effective Approvals'

  },


  issues: {

    navId:
      'navIssues',

    sectionId:
      'section-issues',

    label:
      'Compliance Issues'

  },


  events: {

    navId:
      'navEvents',

    sectionId:
      'section-events',

    label:
      'PTM & Training'

  },


  // ----------------------------------------------------------
  // Internal Visit Schedule workflow screens.
  //
  // These are NOT sidebar items.
  // ----------------------------------------------------------

  visitform: {

    navId: null,

    sectionId:
      'section-visitform',

    label:
      'Schedule Visit'

  },


  visitworkspace: {

    navId: null,

    sectionId:
      'section-visitworkspace',

    label:
      'Visit Details'

  }

};


var SUPERVISOR_PAGE_SECTION_IDS = [

  'section-visitschedule',

  'section-visitform',

  'section-visitworkspace',

  'section-schools',

  'section-events',

  'section-effective',

  'section-issues'

];


// =========================================================================
// NAVIGATION ACTIVE STATE
// =========================================================================

function setSupervisorNavActive(section) {

  Object.keys(
    SUPERVISOR_SECTION_CONFIG
  ).forEach(

    function (key) {

      var navId =
        SUPERVISOR_SECTION_CONFIG[key]
          .navId;


      if (!navId) {
        return;
      }


      var nav =
        document.getElementById(
          navId
        );


      if (!nav) {
        return;
      }


      nav.classList.toggle(
        'active',
        key === section
      );

    }

  );

}


// =========================================================================
// SHOW / HIDE PAGE SECTIONS
// =========================================================================

function showSupervisorSection(section) {

  var config =
    SUPERVISOR_SECTION_CONFIG[
      section
    ];


  if (!config) {

    console.warn(
      '[Supervisor] Unknown section:',
      section
    );

    return false;

  }


  SUPERVISOR_PAGE_SECTION_IDS
    .forEach(

      function (sectionId) {

        var el =
          document.getElementById(
            sectionId
          );


        if (!el) {
          return;
        }


        el.classList.toggle(
          'hidden',
          sectionId !==
            config.sectionId
        );

      }

    );


  return true;

}


// =========================================================================
// PAGE LABEL
// =========================================================================

function updateSupervisorPageLabel(
  section
) {

  var config =
    SUPERVISOR_SECTION_CONFIG[
      section
    ];

  var label =
    document.getElementById(
      'pageLabel'
    );


  if (
    config &&
    label
  ) {

    label.textContent =
      config.label;

  }

}


// =========================================================================
// RENDER CURRENT SECTION
// =========================================================================

function renderCurrentSupervisorSection(
  section
) {

  // ----------------------------------------------------------
  // VISIT SCHEDULE
  // ----------------------------------------------------------

  if (
    section ===
    'visitschedule'
  ) {

    /*
      Visit Calendar is deliberately the default tab every time
      the supervisor returns to Visit Schedule from the sidebar.
    */

    if (
      typeof switchVisitTab ===
      'function'
    ) {

      switchVisitTab(
        'calendar'
      );

    }

    else if (
      typeof renderVisitCalendar ===
      'function'
    ) {

      renderVisitCalendar();

    }


    return;

  }


  // ----------------------------------------------------------
  // MY SCHOOLS
  // ----------------------------------------------------------

  if (
    section ===
    'schools'
  ) {

    if (
      typeof renderMySchools ===
      'function'
    ) {

      renderMySchools();

    }


    return;

  }


  // ----------------------------------------------------------
  // PTM & TRAINING
  // ----------------------------------------------------------

  if (
    section ===
    'events'
  ) {

    /*
      Current supervisor.html contains:

      ptmTopSchoolSelect
      ptmTopClassSelect
      ptm-schedule-body

      Therefore renderSupervisorPTM() is the correct renderer.

      renderEventsSection() belongs to the older events-admin-body
      architecture and is kept only as fallback.
    */

    if (
      typeof renderSupervisorPTM ===
      'function'
    ) {

      renderSupervisorPTM();

    }

    else if (
      typeof renderEventsSection ===
      'function'
    ) {

      renderEventsSection();

    }


    return;

  }


  // ----------------------------------------------------------
  // EFFECTIVE APPROVALS
  // ----------------------------------------------------------

  if (
    section ===
    'effective'
  ) {

    if (
      typeof loadPendingApprovals ===
      'function'
    ) {

      loadPendingApprovals();

    }


    return;

  }


  // ----------------------------------------------------------
  // COMPLIANCE ISSUES
  // ----------------------------------------------------------

  if (
    section ===
    'issues'
  ) {

    if (
      typeof renderComplianceIssues ===
      'function'
    ) {

      renderComplianceIssues();

    }

    else if (
      typeof loadComplianceIssues ===
      'function'
    ) {

      loadComplianceIssues();

    }

  }

}


// =========================================================================
// MAIN SIDEBAR SWITCH FUNCTION
// =========================================================================

function switchSection(section) {

  if (
    !SUPERVISOR_SECTION_CONFIG[
      section
    ]
  ) {

    console.warn(
      '[Supervisor] switchSection ignored unknown section:',
      section
    );

    return;

  }


  setSupervisorNavActive(
    section
  );


  if (
    !showSupervisorSection(
      section
    )
  ) {

    return;

  }


  updateSupervisorPageLabel(
    section
  );


  renderCurrentSupervisorSection(
    section
  );


  closeSidebar();

}


// =========================================================================
// TEACHER LIST
// =========================================================================

function renderTeacherList() {

  var list =
    document.getElementById(
      'teacher-list'
    );


  if (!list) {
    return;
  }


  list.innerHTML =
    TEACHERS.map(

      function (
        teacher,
        index
      ) {

        var initials =
          teacher.name
            .split(' ')
            .map(
              function (word) {

                return word
                  ? word[0]
                  : '';

              }
            )
            .join('')
            .slice(
              0,
              2
            );


        return `

          <div
            class="
              teacher-item
              ${
                index === activeTeacherIdx
                  ? 'active'
                  : ''
              }
              ${
                teacher.status === 'done'
                  ? 'visited'
                  : ''
              }
            "
            onclick="selectTeacher(${index})"
          >

            <div class="teacher-avatar">
              ${initials}
            </div>

            <div class="teacher-info">

              <div class="teacher-name">
                ${teacher.name}
              </div>

              <div class="teacher-meta">
                ${teacher.cls}
              </div>

            </div>

            <div class="teacher-badge ${teacher.status}">

              ${
                teacher.status === 'done'
                  ? 'Visited'
                  : 'Pending'
              }

            </div>

          </div>

        `;

      }

    ).join('');


  var pendingStat =
    document.getElementById(
      'pendingStat'
    );


  if (pendingStat) {

    pendingStat.textContent =
      TEACHERS.filter(

        function (teacher) {

          return (
            teacher.status ===
            'pending'
          );

        }

      ).length;

  }

}


// =========================================================================
// SELECT TEACHER
// =========================================================================

function selectTeacher(index) {

  if (
    index < 0 ||
    index >= TEACHERS.length
  ) {

    return;

  }


  activeTeacherIdx =
    index;


  if (
    typeof setCurrentVisit ===
    'function'
  ) {

    setCurrentVisit(

      TEACHERS[index].name,

      TEACHERS[index].cls,

      TEACHERS[index].schoolName || '',

      TEACHERS[index].ward || ''

    );

  }


  renderTeacherList();

  closeSidebar();

}


// =========================================================================
// LEGACY HISTORY FALLBACK
//
// Kept global because older Visit Cover code may still call renderHistory().
// New Visit Schedule history modules can replace / override this later.
// =========================================================================

function renderHistory() {

  var historyList =
    document.getElementById(
      'history-list'
    );


  if (!historyList) {
    return;
  }


  historyList.innerHTML =
    HISTORY.map(

      function (history) {

        return `

          <div class="vh-row">

            <span class="vh-date">
              ${history.date}
            </span>

            <span class="vh-teacher">
              ${history.teacher}
            </span>

            <span
              class="
                vh-score
                ${
                  history.score >= 80
                    ? 'good'
                    : 'warn'
                }
              "
            >
              ${history.score}%
            </span>

            <span class="vh-flag">

              ${
                history.flag
                  ? '🚩 Flagged'
                  : '—'
              }

            </span>

            <span></span>

          </div>

        `;

      }

    ).join('');

}


// =========================================================================
// INITIAL BOOTSTRAP
//
// DOMContentLoaded fires after every deferred supervisor script has executed,
// so switchVisitTab(), renderMySchools(), renderSupervisorPTM(), etc. are
// available by the time we select the default section.
// =========================================================================

document.addEventListener(
  'DOMContentLoaded',
  function () {

    fetchRealTeachers();

    switchSection(
      'visitschedule'
    );

  }
);