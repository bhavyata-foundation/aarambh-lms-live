/* =========================================================
   BHAVYATA PORTAL
   Supervisor → Visit Schedule → Visit Details
   ========================================================= */

(function () {
  "use strict";

  window.currentSupervisorVisit = null;

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getModal() {
    return document.getElementById("supervisorVisitDetailsModal");
  }

  function createModal() {
    if (getModal()) return;

    const modal = document.createElement("div");

    modal.id = "supervisorVisitDetailsModal";
    modal.className = "supervisor-visit-modal hidden";

    modal.innerHTML = `
      <div class="supervisor-visit-modal-backdrop"
           onclick="closeSupervisorVisitDetails()"></div>

      <div class="supervisor-visit-modal-card">

        <div class="supervisor-visit-modal-header">
          <div>
            <div class="supervisor-visit-modal-kicker">
              VISIT DETAILS
            </div>

            <h2 id="visitDetailsTitle">
              School Visit
            </h2>

            <p id="visitDetailsSubtitle">
              Review the scheduled visit
            </p>
          </div>

          <button
            type="button"
            class="supervisor-visit-close"
            onclick="closeSupervisorVisitDetails()"
            aria-label="Close">
            ×
          </button>
        </div>

        <div class="supervisor-visit-modal-body">

          <div id="visitDetailsSummary"
               class="supervisor-visit-summary">
          </div>

          <div class="supervisor-visit-section">
            <div class="supervisor-visit-section-heading">
              <div>
                <h3>Visit Information</h3>
                <p>
                  Confirm the visit information before completing
                  the visit checklist.
                </p>
              </div>
            </div>

            <div id="visitDetailsInformation"
                 class="supervisor-visit-info-grid">
            </div>
          </div>

          <div class="supervisor-visit-section">
            <div class="supervisor-visit-section-heading">
              <div>
                <h3>Visit Checklist</h3>
                <p>
                  Complete the visit observations and compliance
                  checks during the school visit.
                </p>
              </div>
            </div>

            <div id="visitComplianceContainer">
              <div class="supervisor-visit-empty">
                Compliance checklist will be added here.
              </div>
            </div>
          </div>

        </div>

        <div class="supervisor-visit-modal-footer">

          <button
            type="button"
            class="btn-secondary"
            onclick="closeSupervisorVisitDetails()">
            Close
          </button>

          <button
            type="button"
            class="btn-primary"
            onclick="startSupervisorVisitChecklist()">
            Start Visit Checklist
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(modal);
  }

  function injectStyles() {
    if (document.getElementById("supervisorVisitDetailsStyles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "supervisorVisitDetailsStyles";

    style.textContent = `
      .supervisor-visit-modal {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      .supervisor-visit-modal.hidden {
        display: none;
      }

      .supervisor-visit-modal-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(20, 28, 35, 0.48);
      }

      .supervisor-visit-modal-card {
        position: relative;
        z-index: 1;
        width: min(900px, 100%);
        max-height: calc(100vh - 48px);
        overflow: hidden;
        background: var(--card, #ffffff);
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 16px;
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
        display: flex;
        flex-direction: column;
      }

      .supervisor-visit-modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        padding: 22px 24px;
        border-bottom: 1px solid var(--border, #e5e7eb);
      }

      .supervisor-visit-modal-kicker {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .12em;
        color: var(--text-muted, #737373);
        margin-bottom: 5px;
      }

      .supervisor-visit-modal-header h2 {
        margin: 0;
        font-size: 21px;
        color: var(--text, #222);
      }

      .supervisor-visit-modal-header p {
        margin: 5px 0 0;
        font-size: 13px;
        color: var(--text-muted, #737373);
      }

      .supervisor-visit-close {
        width: 34px;
        height: 34px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--text-muted, #737373);
        font-size: 27px;
        line-height: 1;
        cursor: pointer;
      }

      .supervisor-visit-close:hover {
        background: var(--bg, #f5f5f5);
      }

      .supervisor-visit-modal-body {
        overflow-y: auto;
        padding: 24px;
      }

      .supervisor-visit-summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 22px;
      }

      .supervisor-visit-summary-card {
        padding: 14px;
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 11px;
        background: var(--bg, #fafafa);
      }

      .supervisor-visit-summary-label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .06em;
        color: var(--text-muted, #737373);
        margin-bottom: 5px;
      }

      .supervisor-visit-summary-value {
        font-size: 14px;
        font-weight: 700;
        color: var(--text, #222);
      }

      .supervisor-visit-section {
        margin-top: 20px;
      }

      .supervisor-visit-section:first-child {
        margin-top: 0;
      }

      .supervisor-visit-section-heading {
        margin-bottom: 14px;
      }

      .supervisor-visit-section-heading h3 {
        margin: 0;
        font-size: 16px;
        color: var(--text, #222);
      }

      .supervisor-visit-section-heading p {
        margin: 5px 0 0;
        font-size: 12px;
        line-height: 1.5;
        color: var(--text-muted, #737373);
      }

      .supervisor-visit-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .supervisor-visit-info-item {
        padding: 13px 14px;
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 10px;
      }

      .supervisor-visit-info-label {
        font-size: 11px;
        color: var(--text-muted, #737373);
        margin-bottom: 4px;
      }

      .supervisor-visit-info-value {
        font-size: 13px;
        font-weight: 600;
        color: var(--text, #222);
      }

      .supervisor-visit-empty {
        padding: 22px;
        text-align: center;
        border: 1px dashed var(--border, #d7d7d7);
        border-radius: 10px;
        color: var(--text-muted, #737373);
        font-size: 13px;
        background: var(--bg, #fafafa);
      }

      .supervisor-visit-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 16px 24px;
        border-top: 1px solid var(--border, #e5e7eb);
        background: var(--bg, #fafafa);
      }

      .supervisor-visit-modal-footer button {
        border: 0;
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }

      .supervisor-visit-modal-footer .btn-secondary {
        background: #fff;
        color: var(--text, #222);
        border: 1px solid var(--border, #d7d7d7);
      }

      .supervisor-visit-modal-footer .btn-primary {
        background: var(--primary, #356859);
        color: #fff;
      }

      @media (max-width: 700px) {
        .supervisor-visit-modal {
          padding: 10px;
        }

        .supervisor-visit-modal-card {
          max-height: calc(100vh - 20px);
        }

        .supervisor-visit-summary {
          grid-template-columns: 1fr;
        }

        .supervisor-visit-info-grid {
          grid-template-columns: 1fr;
        }

        .supervisor-visit-modal-body {
          padding: 18px;
        }

        .supervisor-visit-modal-header {
          padding: 18px;
        }

        .supervisor-visit-modal-footer {
          padding: 14px 18px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function normaliseVisit(visit) {
    visit = visit || {};

    return {
      id: visit.id ?? visit.visit_id ?? "",
      schoolId: visit.school_id ?? visit.schoolId ?? "",
      schoolName:
        visit.school_name ??
        visit.schoolName ??
        visit.school ??
        "School",
      className:
        visit.class_name ??
        visit.className ??
        visit.class ??
        "—",
      teacherName:
        visit.teacher_name ??
        visit.teacherName ??
        visit.teacher ??
        "—",
      visitDate:
        visit.visit_date ??
        visit.visitDate ??
        visit.date ??
        "—",
      visitTime:
        visit.visit_time ??
        visit.visitTime ??
        visit.time ??
        "—",
      status:
        visit.status ??
        "Scheduled",
      purpose:
        visit.purpose ??
        visit.visit_type ??
        visit.visitType ??
        "School Visit"
    };
  }

  function renderVisitDetails(visit) {
    const data = normaliseVisit(visit);

    const title = document.getElementById("visitDetailsTitle");
    const subtitle = document.getElementById("visitDetailsSubtitle");
    const summary = document.getElementById("visitDetailsSummary");
    const information = document.getElementById("visitDetailsInformation");

    if (title) {
      title.textContent = data.schoolName;
    }

    if (subtitle) {
      subtitle.textContent =
        data.purpose + " · " + data.status;
    }

    if (summary) {
      summary.innerHTML = `
        <div class="supervisor-visit-summary-card">
          <div class="supervisor-visit-summary-label">
            Date
          </div>
          <div class="supervisor-visit-summary-value">
            ${esc(data.visitDate)}
          </div>
        </div>

        <div class="supervisor-visit-summary-card">
          <div class="supervisor-visit-summary-label">
            Time
          </div>
          <div class="supervisor-visit-summary-value">
            ${esc(data.visitTime)}
          </div>
        </div>

        <div class="supervisor-visit-summary-card">
          <div class="supervisor-visit-summary-label">
            Status
          </div>
          <div class="supervisor-visit-summary-value">
            ${esc(data.status)}
          </div>
        </div>
      `;
    }

    if (information) {
      information.innerHTML = `
        <div class="supervisor-visit-info-item">
          <div class="supervisor-visit-info-label">
            School
          </div>
          <div class="supervisor-visit-info-value">
            ${esc(data.schoolName)}
          </div>
        </div>

        <div class="supervisor-visit-info-item">
          <div class="supervisor-visit-info-label">
            Class
          </div>
          <div class="supervisor-visit-info-value">
            ${esc(data.className)}
          </div>
        </div>

        <div class="supervisor-visit-info-item">
          <div class="supervisor-visit-info-label">
            Teacher
          </div>
          <div class="supervisor-visit-info-value">
            ${esc(data.teacherName)}
          </div>
        </div>

        <div class="supervisor-visit-info-item">
          <div class="supervisor-visit-info-label">
            Visit Type
          </div>
          <div class="supervisor-visit-info-value">
            ${esc(data.purpose)}
          </div>
        </div>
      `;
    }
  }

  window.openSupervisorVisitDetails = function (visit) {
    createModal();
    injectStyles();

    window.currentSupervisorVisit = normaliseVisit(visit);

    renderVisitDetails(window.currentSupervisorVisit);

    const modal = getModal();

    if (!modal) return;

    modal.classList.remove("hidden");

    document.body.style.overflow = "hidden";
  };

  window.closeSupervisorVisitDetails = function () {
    const modal = getModal();

    if (modal) {
      modal.classList.add("hidden");
    }

    document.body.style.overflow = "";
  };

  window.startSupervisorVisitChecklist = function () {
    const visit = window.currentSupervisorVisit;

    if (!visit) return;

    /*
      The actual Compliance Sheet will be connected here
      in the next file.

      For now we only confirm that the selected visit has
      been carried into the workflow.
    */

    if (typeof window.openSupervisorVisitCompliance === "function") {
      window.openSupervisorVisitCompliance(visit);
      return;
    }

    alert(
      "Visit selected successfully. The Compliance Checklist will be connected next."
    );
  };

  /*
   * Helper for the calendar.
   *
   * Your Visit Calendar can simply call:
   *
   * openSupervisorVisitDetails(visitObject)
   *
   * No sidebar section is created.
   */

  window.initSupervisorVisitDetails = function () {
    createModal();
    injectStyles();
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      window.initSupervisorVisitDetails
    );
  } else {
    window.initSupervisorVisitDetails();
  }
})();