/* =========================================================================
   VISIT HISTORY
   Supervisor → Upcoming Visits + Visit History

   Responsibilities:
   - Render upcoming visits
   - Render historical visits
   - Edit scheduled visit
   - Open visit workspace
   - Cancel scheduled visit
   ========================================================================= */

(function () {

  'use strict';

  function getVisits() {

    if (
      window.SupervisorVisitStore &&
      typeof window.SupervisorVisitStore.get ===
        'function'
    ) {
      return window.SupervisorVisitStore.get();
    }

    try {

      return JSON.parse(
        localStorage.getItem(
          'bhavyata_supervisor_visits'
        ) || '[]'
      );

    } catch (err) {

      return [];
    }
  }

  function saveVisits(
    visits
  ) {

    if (
      window.SupervisorVisitStore &&
      typeof window.SupervisorVisitStore.save ===
        'function'
    ) {

      window.SupervisorVisitStore.save(
        visits
      );

      return;
    }

    localStorage.setItem(
      'bhavyata_supervisor_visits',
      JSON.stringify(
        visits
      )
    );
  }

  function esc(value) {

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseDate(
    value
  ) {

    if (!value) return null;

    const d =
      new Date(
        value + 'T00:00:00'
      );

    return isNaN(
      d.getTime()
    )
      ? null
      : d;
  }

  function formatDate(
    value
  ) {

    const d =
      parseDate(value);

    if (!d) return '—';

    return d.toLocaleDateString(
      [],
      {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    );
  }

  function formatTime(
    value
  ) {

    if (!value) return '';

    const parts =
      String(value).split(':');

    if (parts.length < 2) {
      return value;
    }

    let hour =
      Number(parts[0]);

    if (isNaN(hour)) {
      return value;
    }

    const minute =
      parts[1];

    const suffix =
      hour >= 12
        ? 'PM'
        : 'AM';

    hour =
      hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
  }

  function status(
    visit
  ) {

    if (
      visit.status ===
      'cancelled'
    ) {
      return 'cancelled';
    }

    if (
      visit.status ===
      'completed'
    ) {
      return 'completed';
    }

    const d =
      parseDate(
        visit.date
      );

    if (!d) {
      return 'scheduled';
    }

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    return d < today
      ? 'completed'
      : 'scheduled';
  }

  function statusLabel(
    value
  ) {

    if (
      value ===
      'completed'
    ) {
      return 'Completed';
    }

    if (
      value ===
      'cancelled'
    ) {
      return 'Cancelled';
    }

    return 'Scheduled';
  }

  /* -----------------------------------------------------------------------
     VISIT CARD
     ----------------------------------------------------------------------- */

  function visitCard(
    visit,
    allowCancel
  ) {

    const currentStatus =
      status(visit);

    const checklistNames =
      [];

    if (
      visit.checklists?.weekly
    ) {
      checklistNames.push(
        'Weekly'
      );
    }

    if (
      visit.checklists?.monthly
    ) {
      checklistNames.push(
        'Monthly'
      );
    }

    if (
      visit.checklists?.biannual
    ) {
      checklistNames.push(
        'Bi-Annual'
      );
    }

    if (
      visit.checklists?.annual
    ) {
      checklistNames.push(
        'Annual'
      );
    }

    return `
      <div class="visit-record">

        <div class="visit-record-main">

          <div class="visit-record-title">
            ${esc(
              visit.schoolName ||
              'School visit'
            )}
            ${
              visit.className
                ? ' · ' +
                  esc(
                    visit.className
                  )
                : ''
            }
          </div>

          <div class="visit-record-meta">

            ${esc(
              formatDate(
                visit.date
              )
            )}

            ${
              visit.time
                ? ' · ' +
                  esc(
                    formatTime(
                      visit.time
                    )
                  )
                : ''
            }

            ${
              visit.visitType
                ? ' · ' +
                  esc(
                    visit.visitType
                  )
                : ''
            }

          </div>

          ${
            visit.teacherName
              ? `
                <div class="visit-record-meta">
                  Teacher:
                  ${esc(
                    visit.teacherName
                  )}
                </div>
              `
              : ''
          }

          ${
            checklistNames.length
              ? `
                <div class="visit-record-meta">
                  Checks:
                  ${esc(
                    checklistNames.join(
                      ' · '
                    )
                  )}
                </div>
              `
              : `
                <div class="visit-record-meta">
                  No compliance frequency selected yet.
                </div>
              `
          }

          <span
            class="visit-status ${esc(
              currentStatus
            )}"
          >
            ${esc(
              statusLabel(
                currentStatus
              )
            )}
          </span>

        </div>

        <div class="visit-record-actions">

          ${
            currentStatus ===
            'scheduled'
              ? `
                <button
                  type="button"
                  onclick="editSupervisorVisit('${esc(
                    visit.id
                  )}')"
                >
                  Edit
                </button>

                ${
                  allowCancel
                    ? `
                      <button
                        type="button"
                        onclick="cancelSupervisorVisit('${esc(
                          visit.id
                        )}')"
                      >
                        Cancel
                      </button>
                    `
                    : ''
                }
              `
              : ''
          }

          <button
            type="button"
            class="primary"
            onclick="openSupervisorVisit('${esc(
              visit.id
            )}')"
          >
            ${
              currentStatus ===
              'scheduled'
                ? 'Open Visit'
                : 'View Visit'
            }
          </button>

        </div>

      </div>
    `;
  }

  /* -----------------------------------------------------------------------
     UPCOMING
     ----------------------------------------------------------------------- */

  window.renderUpcomingVisits =
    function () {

      const container =
        document.getElementById(
          'visit-upcoming-body'
        );

      if (!container) return;

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const visits =
        getVisits()
          .filter(
            visit => {

              const d =
                parseDate(
                  visit.date
                );

              return (
                d &&
                d >= today &&
                status(visit) ===
                  'scheduled'
              );

            }
          )
          .sort(
            (a, b) =>
              String(
                a.date
              ).localeCompare(
                String(
                  b.date
                )
              ) ||
              String(
                a.time || ''
              ).localeCompare(
                String(
                  b.time || ''
                )
              )
          );

      if (!visits.length) {

        container.innerHTML = `
          <div class="visit-empty">
            No upcoming visits scheduled.
            <br><br>

            <button
              type="button"
              class="btn-primary"
              onclick="openNewVisit()"
            >
              + Schedule a Visit
            </button>
          </div>
        `;

        return;
      }

      container.innerHTML =
        `
          <div class="visit-upcoming-list">
            ${visits.map(
              visit =>
                visitCard(
                  visit,
                  true
                )
            ).join('')}
          </div>
        `;
    };

  /* -----------------------------------------------------------------------
     HISTORY
     ----------------------------------------------------------------------- */

  window.renderVisitHistory =
    function () {

      const container =
        document.getElementById(
          'history-list'
        );

      if (!container) return;

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const visits =
        getVisits()
          .filter(
            visit => {

              const d =
                parseDate(
                  visit.date
                );

              return (
                status(visit) ===
                  'completed' ||
                visit.status ===
                  'cancelled'
              );

            }
          )
          .sort(
            (a, b) =>
              String(
                b.date || ''
              ).localeCompare(
                String(
                  a.date || ''
                )
              )
          );

      if (!visits.length) {

        container.innerHTML = `
          <div class="visit-empty">
            No completed visits yet.
          </div>
        `;

        return;
      }

      container.innerHTML =
        `
          <div class="visit-history-list">
            ${visits.map(
              visit =>
                visitCard(
                  visit,
                  false
                )
            ).join('')}
          </div>
        `;
    };

  /* -----------------------------------------------------------------------
     FIND VISIT
     ----------------------------------------------------------------------- */

  function findVisit(
    id
  ) {

    return getVisits()
      .find(
        visit =>
          String(
            visit.id
          ) ===
          String(id)
      );
  }

  /* -----------------------------------------------------------------------
     EDIT
     ----------------------------------------------------------------------- */

  window.editSupervisorVisit =
    function (id) {

      const visit =
        findVisit(id);

      if (!visit) return;

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
     CANCEL
     ----------------------------------------------------------------------- */

  window.cancelSupervisorVisit =
    function (id) {

      const visit =
        findVisit(id);

      if (!visit) return;

      const confirmed =
        window.confirm(
          `Cancel the visit scheduled for ${formatDate(
            visit.date
          )} at ${
            visit.schoolName ||
            'this school'
          }?`
        );

      if (!confirmed) {
        return;
      }

      const visits =
        getVisits();

      const index =
        visits.findIndex(
          v =>
            String(v.id) ===
            String(id)
        );

      if (index < 0) {
        return;
      }

      visits[index].status =
        'cancelled';

      visits[index].updatedAt =
        new Date().toISOString();

      saveVisits(
        visits
      );

      if (
        typeof refreshVisitSchedule ===
        'function'
      ) {
        refreshVisitSchedule();
      }

      if (
        typeof switchVisitTab ===
        'function'
      ) {
        switchVisitTab(
          'upcoming'
        );
      }
    };

  /* -----------------------------------------------------------------------
     OPEN VISIT
     ----------------------------------------------------------------------- */

  window.openSupervisorVisit =
    function (id) {

      const visit =
        findVisit(id);

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

      /*
        The full compliance workspace is the next layer.
        For now, keep the scheduled visit visible and allow editing.
      */

      if (
        typeof openVisitForm ===
        'function'
      ) {

        openVisitForm(
          visit
        );
      }
    };

})();