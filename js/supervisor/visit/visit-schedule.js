/* =========================================================================
   VISIT SCHEDULE
   Supervisor Visit Calendar + section controller

   Responsibilities:
   - Supervisor section navigation
   - Visit Schedule tabs
   - Calendar rendering
   - Visit statistics
   - Opening the Schedule Visit form
   - Opening Visit History
   ========================================================================= */

(function () {

  'use strict';

  const VISIT_STORAGE_KEY = 'bhavyata_supervisor_visits';

  let visitCalendarDate = new Date();

  /* -----------------------------------------------------------------------
     STORAGE
     ----------------------------------------------------------------------- */

  function getVisits() {

    try {

      const raw =
        localStorage.getItem(VISIT_STORAGE_KEY);

      if (!raw) return [];

      const parsed = JSON.parse(raw);

      return Array.isArray(parsed)
        ? parsed
        : [];

    } catch (err) {

      return [];
    }
  }

  function saveVisits(visits) {

    try {

      localStorage.setItem(
        VISIT_STORAGE_KEY,
        JSON.stringify(visits)
      );

    } catch (err) {

      console.error(
        'Could not save supervisor visits.',
        err
      );
    }
  }

  window.SupervisorVisitStore = {
    get: getVisits,
    save: saveVisits,
    key: VISIT_STORAGE_KEY
  };

  /* -----------------------------------------------------------------------
     ESCAPE
     ----------------------------------------------------------------------- */

  function esc(value) {

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* -----------------------------------------------------------------------
     DATE HELPERS
     ----------------------------------------------------------------------- */

  function dateKey(date) {

    const y = date.getFullYear();
    const m = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const d = String(
      date.getDate()
    ).padStart(2, '0');

    return `${y}-${m}-${d}`;
  }

  function parseVisitDate(value) {

    if (!value) return null;

    const parts =
      String(value).split('-');

    if (parts.length !== 3) {
      return null;
    }

    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const d = Number(parts[2]);

    const result =
      new Date(y, m, d);

    return isNaN(result.getTime())
      ? null
      : result;
  }

  function formatDate(value) {

    const date =
      parseVisitDate(value);

    if (!date) return '—';

    return date.toLocaleDateString(
      [],
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    );
  }

  function formatTime(value) {

    if (!value) return '—';

    const parts =
      String(value).split(':');

    if (parts.length < 2) {
      return value;
    }

    let hour = Number(parts[0]);
    const minute = parts[1];

    if (isNaN(hour)) {
      return value;
    }

    const suffix =
      hour >= 12
        ? 'PM'
        : 'AM';

    hour =
      hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
  }

  /* -----------------------------------------------------------------------
     STATUS
     ----------------------------------------------------------------------- */

  function getVisitStatus(visit) {

    if (
      visit.status === 'completed' ||
      visit.status === 'cancelled'
    ) {
      return visit.status;
    }

    const date =
      parseVisitDate(visit.date);

    if (!date) return 'scheduled';

    const today =
      new Date();

    today.setHours(0, 0, 0, 0);

    if (date < today) {
      return 'completed';
    }

    return 'scheduled';
  }

  /* -----------------------------------------------------------------------
     DASHBOARD STATS
     ----------------------------------------------------------------------- */

  function updateVisitStats() {

    const visits =
      getVisits();

    const now =
      new Date();

    const currentMonth =
      now.getMonth();

    const currentYear =
      now.getFullYear();

    const monthVisits =
      visits.filter(v => {

        const d =
          parseVisitDate(v.date);

        return d &&
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear;

      });

    const upcoming =
      visits.filter(v =>
        getVisitStatus(v) === 'scheduled'
      );

    const completed =
      visits.filter(v =>
        getVisitStatus(v) === 'completed'
      );

    const followups =
      visits.filter(v =>
        v.visitType === 'Follow-up' ||
        v.follow_up === true
      );

    const setText = (
      id,
      value
    ) => {

      const el =
        document.getElementById(id);

      if (el) {
        el.textContent = value;
      }
    };

    setText(
      'visitMonthCount',
      monthVisits.length
    );

    setText(
      'visitUpcomingCount',
      upcoming.length
    );

    setText(
      'visitCompletedCount',
      completed.length
    );

    setText(
      'visitFollowupCount',
      followups.length
    );
  }

  /* -----------------------------------------------------------------------
     SECTION CONTROLLER

     This intentionally owns switchSection so the old Supervisor
     switchSection implementation cannot try to access removed DOM IDs.
     ----------------------------------------------------------------------- */

  window.switchSection =
    function (section) {

      const sections = [
        'visitschedule',
        'visitform',
        'visitworkspace',
        'schools',
        'events',
        'effective',
        'issues'
      ];

      sections.forEach(name => {

        const el =
          document.getElementById(
            'section-' + name
          );

        if (!el) return;

        if (name === section) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      });

      const navMap = {
        visitschedule: 'navVisitSchedule',
        schools: 'navSchools',
        events: 'navEvents',
        effective: 'navEffective',
        issues: 'navIssues'
      };

      Object.values(navMap).forEach(id => {

        const button =
          document.getElementById(id);

        if (button) {
          button.classList.remove('active');
        }
      });

      const activeNav =
        navMap[section];

      if (activeNav) {

        const button =
          document.getElementById(
            activeNav
          );

        if (button) {
          button.classList.add('active');
        }
      }

      const pageLabel =
        document.getElementById(
          'pageLabel'
        );

      const labels = {
        visitschedule: 'Visit Schedule',
        visitform: 'Schedule Visit',
        visitworkspace: 'Visit Workspace',
        schools: 'My Schools',
        events: 'PTM & Training',
        effective: 'Effective Approvals',
        issues: 'Compliance Issues'
      };

      if (pageLabel) {
        pageLabel.textContent =
          labels[section] ||
          'Supervisor';
      }

      if (
        section === 'visitschedule'
      ) {

        switchVisitTab(
          'calendar'
        );

      } else if (
        section === 'schools'
      ) {

        if (
          typeof renderMySchools ===
          'function'
        ) {
          renderMySchools();
        }

      } else if (
        section === 'events'
      ) {

        if (
          typeof renderSupervisorPTM ===
          'function'
        ) {
          renderSupervisorPTM();
        }

      } else if (
        section === 'effective'
      ) {

        if (
          typeof loadPendingApprovals ===
          'function'
        ) {
          loadPendingApprovals();
        }

      } else if (
        section === 'issues'
      ) {

        if (
          typeof loadComplianceIssues ===
          'function'
        ) {
          loadComplianceIssues();
        } else if (
          typeof renderComplianceIssues ===
          'function'
        ) {
          renderComplianceIssues();
        }
      }

      if (
        typeof closeSidebar ===
        'function'
      ) {
        closeSidebar();
      }
    };

  /* -----------------------------------------------------------------------
     VISIT TABS
     ----------------------------------------------------------------------- */

  window.switchVisitTab =
    function (tab) {

      const tabs = [
        'calendar',
        'upcoming',
        'history'
      ];

      tabs.forEach(name => {

        const panel =
          document.getElementById(
            'visit-panel-' + name
          );

        const button =
          document.getElementById(
            'visitTab' +
            name.charAt(0).toUpperCase() +
            name.slice(1)
          );

        if (panel) {

          panel.classList.toggle(
            'active',
            name === tab
          );
        }

        if (button) {

          button.classList.toggle(
            'active',
            name === tab
          );
        }
      });

      if (tab === 'calendar') {
        renderVisitCalendar();
      }

      if (tab === 'upcoming') {

        if (
          typeof renderUpcomingVisits ===
          'function'
        ) {
          renderUpcomingVisits();
        }
      }

      if (tab === 'history') {

        if (
          typeof renderVisitHistory ===
          'function'
        ) {
          renderVisitHistory();
        }
      }
    };

  /* -----------------------------------------------------------------------
     CALENDAR
     ----------------------------------------------------------------------- */

  function renderVisitCalendar() {

    const container =
      document.getElementById(
        'visit-calendar-body'
      );

    if (!container) return;

    const year =
      visitCalendarDate.getFullYear();

    const month =
      visitCalendarDate.getMonth();

    const monthTitle =
      visitCalendarDate.toLocaleDateString(
        [],
        {
          month: 'long',
          year: 'numeric'
        }
      );

    const title =
      document.getElementById(
        'visitCalendarMonth'
      );

    if (title) {
      title.textContent =
        monthTitle;
    }

    const firstDay =
      new Date(
        year,
        month,
        1
      );

    const lastDay =
      new Date(
        year,
        month + 1,
        0
      );

    const startWeekday =
      firstDay.getDay();

    const daysInMonth =
      lastDay.getDate();

    const visits =
      getVisits();

    let html = '';

    const weekdays = [
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat'
    ];

    html += `
      <div class="visit-calendar-grid">
        ${weekdays.map(day => `
          <div class="visit-calendar-weekday">
            ${day}
          </div>
        `).join('')}
    `;

    for (
      let i = 0;
      i < startWeekday;
      i++
    ) {

      html += `
        <div class="visit-calendar-day empty"></div>
      `;
    }

    const todayKey =
      dateKey(new Date());

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {

      const current =
        new Date(
          year,
          month,
          day
        );

      const key =
        dateKey(current);

      const dayVisits =
        visits.filter(
          v => v.date === key
        );

      const isToday =
        key === todayKey;

      html += `
        <div class="visit-calendar-day ${isToday ? 'today' : ''}">
          <div class="visit-calendar-day-number">
            ${day}
          </div>

          ${dayVisits.map(visit => {

            const status =
              getVisitStatus(visit);

            return `
              <div
                class="visit-calendar-visit"
                onclick="openVisitFromCalendar('${esc(visit.id)}')"
                title="Open visit"
              >
                <strong>
                  ${esc(
                    visit.schoolName ||
                    'School visit'
                  )}
                </strong>

                <span class="visit-extra">
                  ${esc(
                    visit.className ||
                    ''
                  )}
                  ${visit.time
                    ? ' · ' + esc(
                        formatTime(
                          visit.time
                        )
                      )
                    : ''}
                </span>

                <span class="visit-extra">
                  · ${esc(status)}
                </span>
              </div>
            `;

          }).join('')}

        </div>
      `;
    }

    html += '</div>';

    if (!visits.length) {

      html += `
        <div class="visit-empty">
          No visits have been scheduled yet.
          Use <strong>Schedule a Visit</strong>
          to create the first visit.
        </div>
      `;
    }

    container.innerHTML =
      html;
  }

  window.changeVisitCalendarMonth =
    function (delta) {

      visitCalendarDate.setMonth(
        visitCalendarDate.getMonth() +
        delta
      );

      renderVisitCalendar();
    };

  /* -----------------------------------------------------------------------
     CALENDAR VISIT CLICK
     ----------------------------------------------------------------------- */

  window.openVisitFromCalendar =
    function (visitId) {

      const visit =
        getVisits().find(
          v =>
            String(v.id) ===
            String(visitId)
        );

      if (!visit) return;

      if (
        typeof openVisitWorkspace ===
        'function'
      ) {

        openVisitWorkspace(
          visit
        );

        return;
      }

      if (
        typeof openVisitForm ===
        'function'
      ) {

        openVisitForm(
          visit
        );
      }
    };

  /* -----------------------------------------------------------------------
     CREATE NEW VISIT
     ----------------------------------------------------------------------- */

  window.openNewVisit =
    function () {

      switchSection(
        'visitform'
      );

      if (
        typeof renderVisitForm ===
        'function'
      ) {
        renderVisitForm();
      }
    };

  /* -----------------------------------------------------------------------
     INITIALIZE
     ----------------------------------------------------------------------- */

  function initializeVisitSchedule() {

    updateVisitStats();
    renderVisitCalendar();

    /*
      Calendar is deliberately the first/default tab.
    */
    switchVisitTab(
      'calendar'
    );
  }

  /*
    Defer until the other defer-loaded scripts have initialized.
  */
  document.addEventListener(
    'DOMContentLoaded',
    function () {

      setTimeout(
        initializeVisitSchedule,
        0
      );

    }
  );

  window.refreshVisitSchedule =
    function () {

      updateVisitStats();
      renderVisitCalendar();

      if (
        typeof renderUpcomingVisits ===
        'function'
      ) {
        renderUpcomingVisits();
      }

      if (
        typeof renderVisitHistory ===
        'function'
      ) {
        renderVisitHistory();
      }
    };

})();