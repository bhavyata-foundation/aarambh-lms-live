/* =========================================================================
   VISIT FORM
   Supervisor → Schedule / Visit Cover

   This is the first data-entry layer of the Supervisor Compliance workflow.

   Current fields:
   - School
   - Class
   - Date
   - Time
   - Visit Type
   - Applicable compliance frequency
   - Teacher
   - Helper
   - HM / Principal
   - Previous visit information
   - Notes

   Data is currently stored in browser localStorage until the real
   Supervisor Visit database endpoints are wired.
   ========================================================================= */

(function () {

  'use strict';

  const STORE_KEY =
    'bhavyata_supervisor_visits';

  let editingVisitId = null;

  /* -----------------------------------------------------------------------
     HELPERS
     ----------------------------------------------------------------------- */

  function esc(value) {

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function todayKey() {

    const d =
      new Date();

    const y =
      d.getFullYear();

    const m =
      String(
        d.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        d.getDate()
      ).padStart(2, '0');

    return `${y}-${m}-${day}`;
  }

  function getVisits() {

    if (
      window.SupervisorVisitStore &&
      typeof window.SupervisorVisitStore.get ===
        'function'
    ) {
      return window.SupervisorVisitStore.get();
    }

    try {

      const raw =
        localStorage.getItem(
          STORE_KEY
        );

      return raw
        ? JSON.parse(raw)
        : [];

    } catch (err) {

      return [];
    }
  }

  function saveVisits(visits) {

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
      STORE_KEY,
      JSON.stringify(visits)
    );
  }

  function makeId() {

    return (
      'VIS-' +
      Date.now() +
      '-' +
      Math.floor(
        Math.random() * 1000
      )
    );
  }

  // Same convention the old Visit Cover form used — AAR/SUP/<academic
  // year>/<sequential number, zero-padded>. Sequential number is based
  // on how many visits already exist, so it keeps counting up even as
  // old visits are edited (never regenerated for an existing visit).
  function makeRefNo() {
    const visits =
      (window.SupervisorVisitStore &&
        typeof window.SupervisorVisitStore.get === 'function')
        ? window.SupervisorVisitStore.get()
        : [];
    const seq = String(visits.length + 1).padStart(3, '0');
    return 'AAR/SUP/2026-27/' + seq;
  }

  /* -----------------------------------------------------------------------
     FORM HTML
     ----------------------------------------------------------------------- */

  function formHtml(visit) {

    const value =
      visit || {};

    return `

      <div class="visit-form-card">

        <div class="visit-form-title">

          <h3>
            ${editingVisitId
              ? 'Edit Visit'
              : 'Schedule a School Visit'}
          </h3>

          <p>
            Complete the Visit Cover information first.
            The applicable compliance checklists will be completed
            after the visit is opened.
          </p>

        </div>

        <!-- VISIT REFERENCE NO. -->

        <div style="margin-bottom:15px;">
          <label class="field-label-admin">
            Visit Reference No.
          </label>
          <input
            id="visitRefNo"
            class="admin-input"
            type="text"
            readonly
            style="width:280px; background:#f4f4f2; color:#666; box-sizing:border-box;"
            value="${esc(value.refNo || makeRefNo())}"
          >
        </div>

        <!-- BASIC VISIT DETAILS -->

        <div
          style="
            display:grid;
            grid-template-columns:
              minmax(220px,1.2fr)
              minmax(180px,1fr)
              minmax(170px,0.85fr)
              minmax(150px,0.7fr);
            gap:15px;
            align-items:end;
          "
        >

          <div>
            <label class="field-label-admin">
              School *
            </label>

            <select
              id="visitSchool"
              class="admin-input"
            >
              <option value="">
                Choose a school...
              </option>

              <option value="__manual__">
                Enter school manually
              </option>

              ${
                value.schoolName &&
                value.schoolName !==
                  '__manual__'
                  ? `
                    <option
                      value="${esc(value.schoolName)}"
                      selected
                    >
                      ${esc(value.schoolName)}
                    </option>
                  `
                  : ''
              }
            </select>

            <input
              id="visitSchoolManual"
              class="admin-input"
              type="text"
              placeholder="School name"
              value="${esc(
                value.schoolManual || ''
              )}"
              style="
                display:none;
                margin-top:7px;
              "
            >
          </div>

          <div>

            <label class="field-label-admin">
              Class Observed *
            </label>

            <select
              id="visitClass"
              class="admin-input"
            >
              <option value="">
                Choose class...
              </option>

              <option
                value="Jr KG"
                ${value.className === 'Jr KG'
                  ? 'selected'
                  : ''}
              >
                Jr KG
              </option>

              <option
                value="Sr KG"
                ${value.className === 'Sr KG'
                  ? 'selected'
                  : ''}
              >
                Sr KG
              </option>
            </select>

          </div>

          <div>

            <label class="field-label-admin">
              Date *
            </label>

            <input
              id="visitDate"
              class="admin-input"
              type="date"
              style="width:100%; box-sizing:border-box;"
              value="${esc(
                value.date ||
                todayKey()
              )}"
            >

          </div>

          <div>

            <label class="field-label-admin">
              Time *
            </label>

            <input
              id="visitTime"
              class="admin-input"
              type="time"
              style="width:100%; box-sizing:border-box;"
              value="${esc(
                value.time || ''
              )}"
            >

          </div>

        </div>

        <!-- VISIT TYPE -->

        <div
          style="
            display:grid;
            grid-template-columns:
              minmax(180px,1fr)
              minmax(320px,2fr);
            gap:15px;
            margin-top:17px;
          "
        >

          <div>

            <label class="field-label-admin">
              Visit Type
            </label>

            <select
              id="visitType"
              class="admin-input"
            >

              <option
                value="Regular"
                ${value.visitType === 'Regular' ||
                  !value.visitType
                    ? 'selected'
                    : ''}
              >
                Regular
              </option>

              <option
                value="Follow-up"
                ${value.visitType === 'Follow-up'
                  ? 'selected'
                  : ''}
              >
                Follow-up
              </option>

              <option
                value="Surprise"
                ${value.visitType === 'Surprise'
                  ? 'selected'
                  : ''}
              >
                Surprise
              </option>

            </select>

          </div>

          <div>

            <label class="field-label-admin">
              Compliance Checks Applicable
            </label>

            <div
              style="
                display:flex;
                flex-wrap:wrap;
                gap:10px;
                padding-top:8px;
              "
            >

              ${checkOption(
                'weekly',
                'Weekly',
                value
              )}

              ${checkOption(
                'monthly',
                'Monthly',
                value
              )}

              ${checkOption(
                'biannual',
                'Bi-Annual',
                value
              )}

              ${checkOption(
                'annual',
                'Annual',
                value
              )}

            </div>

          </div>

        </div>

        <!-- PEOPLE -->

        <div
          style="
            display:grid;
            grid-template-columns:
              repeat(3,1fr);
            gap:15px;
            margin-top:17px;
          "
        >

          <div>

            <label class="field-label-admin">
              Teacher
            </label>

            <input
              id="visitTeacher"
              class="admin-input"
              type="text"
              placeholder="Teacher name"
              value="${esc(
                value.teacherName || ''
              )}"
            >

          </div>

          <div>

            <label class="field-label-admin">
              Helper
            </label>

            <input
              id="visitHelper"
              class="admin-input"
              type="text"
              placeholder="Helper name"
              value="${esc(
                value.helperName || ''
              )}"
            >

          </div>

          <div>

            <label class="field-label-admin">
              HM / Principal
            </label>

            <input
              id="visitPrincipal"
              class="admin-input"
              type="text"
              placeholder="HM / Principal name"
              value="${esc(
                value.principalName || ''
              )}"
            >

          </div>

        </div>

        <!-- PREVIOUS VISIT -->

        <div
          style="
            margin-top:17px;
            padding:14px 15px;
            border:1px solid #e6e6e3;
            border-radius:10px;
            background:#fafaf8;
          "
        >

          <div
            style="
              font-size:13px;
              font-weight:700;
              margin-bottom:8px;
            "
          >
            Previous Visit & Follow-up
          </div>

          <div
            id="previousVisitInfo"
            style="
              font-size:13px;
              color:#666;
            "
          >
            Select a school to see previous visit information.
          </div>

        </div>

        <!-- NOTES -->

        <div style="margin-top:17px;">

          <label class="field-label-admin">
            Notes / Follow-up Notes
          </label>

          <textarea
            id="visitNotes"
            class="admin-input"
            rows="3"
            placeholder="e.g. Follow-up on previous action points"
            style="
              resize:vertical;
              min-height:80px;
              width:100%;
              box-sizing:border-box;
            "
          >${esc(
            value.notes || ''
          )}</textarea>

        </div>

        <!-- ACTIONS -->

        <div
          style="
            display:flex;
            justify-content:flex-end;
            gap:9px;
            margin-top:18px;
          "
        >

          <button
            type="button"
            class="btn-sup-outline"
            onclick="cancelVisitForm()"
          >
            Cancel
          </button>

          <button
            type="button"
            class="btn-primary"
            onclick="saveSupervisorVisit()"
          >
            ${
              editingVisitId
                ? 'Save Changes'
                : '+ Schedule Visit'
            }
          </button>

        </div>

        <div
          id="visitFormMessage"
          style="margin-top:10px;"
        ></div>

      </div>
    `;
  }

  function checkOption(
    key,
    label,
    visit
  ) {

    const checked =
      visit &&
      visit.checklists &&
      visit.checklists[key]
        ? 'checked'
        : '';

    return `
      <label
        style="
          display:flex;
          align-items:center;
          gap:6px;
          padding:7px 12px;
          border:1px solid #ddd;
          border-radius:7px;
          background:#fff;
          font-size:12px;
          white-space:nowrap;
          cursor:pointer;
        "
      >
        <input
          type="checkbox"
          id="visitCheck_${key}"
          ${checked}
        >
        ${esc(label)}
      </label>
    `;
  }

  /* -----------------------------------------------------------------------
     SCHOOL LIST

     We use the existing school endpoint when available.
     If it is unavailable, manual entry remains possible.
     ----------------------------------------------------------------------- */

  async function loadSchoolOptions(
    selectedName
  ) {

    const select =
      document.getElementById(
        'visitSchool'
      );

    if (!select) return;

    try {

      const res =
        await fetch(
          'backend/schools/get_schools_list.php' +
          window.location.search
        );

      const data =
        await res.json();

      if (
        data.status !== 'success' ||
        !Array.isArray(data.schools)
      ) {
        return;
      }

      select.innerHTML = `
        <option value="">
          Choose a school...
        </option>
      `;

      data.schools.forEach(
        school => {

          const option =
            document.createElement(
              'option'
            );

          option.value =
            school.name;

          // Ward shown alongside the name when the real endpoint
          // provides it — falls back to just the name if it doesn't,
          // rather than showing a literal "undefined".
          option.textContent =
            school.ward
              ? school.name + ' — Ward ' + school.ward
              : school.name;

          select.appendChild(
            option
          );
        }
      );

      const manualOption =
        document.createElement(
          'option'
        );

      manualOption.value =
        '__manual__';

      manualOption.textContent =
        'Enter school manually';

      select.appendChild(
        manualOption
      );

      if (
        selectedName &&
        [...select.options].some(
          o =>
            o.value ===
            selectedName
        )
      ) {
        select.value =
          selectedName;
      }

      handleSchoolMode();

    } catch (err) {

      /* Manual mode remains available. */

    }
  }

  function handleSchoolMode() {

    const select =
      document.getElementById(
        'visitSchool'
      );

    const manual =
      document.getElementById(
        'visitSchoolManual'
      );

    if (!select || !manual) {
      return;
    }

    const manualMode =
      select.value ===
      '__manual__';

    manual.style.display =
      manualMode
        ? 'block'
        : 'none';

    updatePreviousVisit();
  }

  /* -----------------------------------------------------------------------
     PREVIOUS VISIT
     ----------------------------------------------------------------------- */

  function updatePreviousVisit() {

    const info =
      document.getElementById(
        'previousVisitInfo'
      );

    const select =
      document.getElementById(
        'visitSchool'
      );

    if (!info || !select) {
      return;
    }

    let school =
      select.value;

    if (
      school ===
      '__manual__'
    ) {

      school =
        document.getElementById(
          'visitSchoolManual'
        )?.value.trim();

    }

    if (!school) {

      info.textContent =
        'Select a school to see previous visit information.';

      return;
    }

    const visits =
      getVisits()
        .filter(
          v =>
            String(
              v.schoolName || ''
            ).toLowerCase() ===
            String(
              school
            ).toLowerCase()
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

      info.innerHTML = `
        <span>
          No previous visit recorded for this school.
        </span>
      `;

      return;
    }

    const previous =
      visits.find(
        v =>
          String(v.id) !==
          String(editingVisitId)
      ) || visits[0];

    info.innerHTML = `
      <strong>
        Last visit:
      </strong>
      ${esc(
        formatDate(
          previous.date
        )
      )}
      &nbsp; · &nbsp;

      <strong>
        Type:
      </strong>
      ${esc(
        previous.visitType ||
        'Regular'
      )}

      ${
        previous.overallScore !==
        undefined &&
        previous.overallScore !==
        null &&
        previous.overallScore !== ''
          ? `
            &nbsp; · &nbsp;
            <strong>
              Previous score:
            </strong>
            ${esc(
              previous.overallScore
            )}
          `
          : ''
      }

      ${
        previous.follow_up
          ? `
            <br>
            <span
              style="
                display:inline-block;
                margin-top:6px;
                color:#a63838;
                font-weight:700;
              "
            >
              Follow-up required
            </span>
          `
          : ''
      }
    `;
  }

  function formatDate(value) {

    if (!value) return '—';

    const d =
      new Date(
        value + 'T00:00:00'
      );

    if (isNaN(d.getTime())) {
      return value;
    }

    return d.toLocaleDateString(
      [],
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    );
  }

  /* -----------------------------------------------------------------------
     RENDER FORM
     ----------------------------------------------------------------------- */

  window.renderVisitForm =
    async function (
      visit
    ) {

      const container =
        document.getElementById(
          'visit-form-body'
        );

      if (!container) return;

      editingVisitId =
        visit
          ? visit.id
          : null;

      // When opening the form for a brand-new visit (not editing an
      // existing one), pre-fill School/Class from whichever real
      // teacher is currently selected in the sidebar — currentVisit
      // comes from visit-context.js, kept in sync by selectTeacher()
      // with real data from fetchRealTeachers() in checklist.js.
      // Used for BOTH the form markup and loadSchoolOptions below,
      // so the two can never disagree about which school to show.
      const displayVisit =
        visit ||
        (typeof currentVisit !== 'undefined' && currentVisit.schoolName
          ? { schoolName: currentVisit.schoolName, className: currentVisit.className, teacherName: currentVisit.teacherName }
          : null);

      container.innerHTML =
        formHtml(displayVisit);

      const school =
        document.getElementById(
          'visitSchool'
        );

      if (school) {

        school.addEventListener(
          'change',
          handleSchoolMode
        );
      }

      const manual =
        document.getElementById(
          'visitSchoolManual'
        );

      if (manual) {

        manual.addEventListener(
          'input',
          updatePreviousVisit
        );
      }

      await loadSchoolOptions(
        displayVisit?.schoolName
      );

      updatePreviousVisit();
    };

  /* -----------------------------------------------------------------------
     OPEN EDIT
     ----------------------------------------------------------------------- */

  window.openVisitForm =
    function (visit) {

      if (
        typeof switchSection ===
        'function'
      ) {
        switchSection(
          'visitform'
        );
      }

      renderVisitForm(
        visit
      );
    };

  /* -----------------------------------------------------------------------
     SAVE
     ----------------------------------------------------------------------- */

  window.saveSupervisorVisit =
    function () {

      const schoolSelect =
        document.getElementById(
          'visitSchool'
        );

      const manualSchool =
        document.getElementById(
          'visitSchoolManual'
        );

      const classEl =
        document.getElementById(
          'visitClass'
        );

      const dateEl =
        document.getElementById(
          'visitDate'
        );

      const timeEl =
        document.getElementById(
          'visitTime'
        );

      const message =
        document.getElementById(
          'visitFormMessage'
        );

      if (
        !schoolSelect ||
        !classEl ||
        !dateEl ||
        !timeEl
      ) {
        return;
      }

      let schoolName =
        schoolSelect.value;

      if (
        schoolName ===
        '__manual__'
      ) {

        schoolName =
          manualSchool
            ? manualSchool.value.trim()
            : '';
      }

      if (!schoolName) {

        showMessage(
          message,
          'Please select or enter a school.',
          'error'
        );

        return;
      }

      if (!classEl.value) {

        showMessage(
          message,
          'Please select the class being observed.',
          'error'
        );

        return;
      }

      if (!dateEl.value) {

        showMessage(
          message,
          'Please select the visit date.',
          'error'
        );

        return;
      }

      if (!timeEl.value) {

        showMessage(
          message,
          'Please select the visit time.',
          'error'
        );

        return;
      }

      const visit = {

        id:
          editingVisitId ||
          makeId(),

        refNo:
          document.getElementById(
            'visitRefNo'
          )?.value ||
          makeRefNo(),

        schoolName,

        schoolManual:
          schoolSelect.value ===
          '__manual__'
            ? (
                manualSchool
                  ? manualSchool.value.trim()
                  : ''
              )
            : '',

        className:
          classEl.value,

        date:
          dateEl.value,

        time:
          timeEl.value,

        visitType:
          document.getElementById(
            'visitType'
          )?.value ||
          'Regular',

        teacherName:
          document.getElementById(
            'visitTeacher'
          )?.value.trim() ||
          '',

        helperName:
          document.getElementById(
            'visitHelper'
          )?.value.trim() ||
          '',

        principalName:
          document.getElementById(
            'visitPrincipal'
          )?.value.trim() ||
          '',

        notes:
          document.getElementById(
            'visitNotes'
          )?.value.trim() ||
          '',

        checklists: {

          weekly:
            !!document.getElementById(
              'visitCheck_weekly'
            )?.checked,

          monthly:
            !!document.getElementById(
              'visitCheck_monthly'
            )?.checked,

          biannual:
            !!document.getElementById(
              'visitCheck_biannual'
            )?.checked,

          annual:
            !!document.getElementById(
              'visitCheck_annual'
            )?.checked
        },

        status:
          'scheduled',

        updatedAt:
          new Date().toISOString()
      };

      const visits =
        getVisits();

      const existingIndex =
        visits.findIndex(
          v =>
            String(v.id) ===
            String(visit.id)
        );

      if (
        existingIndex >= 0
      ) {

        visit.createdAt =
          visits[
            existingIndex
          ].createdAt ||
          new Date().toISOString();

        visits[
          existingIndex
        ] = Object.assign(
          {},
          visits[
            existingIndex
          ],
          visit
        );

      } else {

        visit.createdAt =
          new Date().toISOString();

        visits.push(
          visit
        );
      }

      saveVisits(
        visits
      );

      editingVisitId =
        null;

      if (
        typeof refreshVisitSchedule ===
        'function'
      ) {
        refreshVisitSchedule();
      }

      if (
        typeof switchSection ===
        'function'
      ) {
        switchSection(
          'visitschedule'
        );
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
     CANCEL
     ----------------------------------------------------------------------- */

  window.cancelVisitForm =
    function () {

      editingVisitId =
        null;

      if (
        typeof switchSection ===
        'function'
      ) {
        switchSection(
          'visitschedule'
        );
      }
    };

  /* -----------------------------------------------------------------------
     MESSAGE
     ----------------------------------------------------------------------- */

  function showMessage(
    element,
    text,
    type
  ) {

    if (!element) return;

    element.innerHTML = `
      <div
        style="
          padding:9px 12px;
          border-radius:7px;
          font-size:12px;
          font-weight:600;
          background:${
            type === 'error'
              ? '#fdecec'
              : '#eaf6ed'
          };
          color:${
            type === 'error'
              ? '#a63838'
              : '#28753c'
          };
        "
      >
        ${esc(text)}
      </div>
    `;
  }

})();