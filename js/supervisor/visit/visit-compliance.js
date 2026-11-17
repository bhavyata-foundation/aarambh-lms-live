/* =========================================================================
   BHAVYATA PORTAL
   Supervisor → Visit Schedule → Visit Checklist (Save Visit)

   This is the file visit-details.js's own comment pointed at:
   "The actual Compliance Sheet will be connected here in the next
   file." It defines window.openSupervisorVisitCompliance(visit),
   which visit-details.js already calls automatically once this file
   is loaded — no change needed there.

   Renders the real 8-section, 91-item Weekly Compliance Checklist
   (WEEKLY_CATEGORIES / RATING_SCALE / TICK_OPTIONS — from
   weekly-checklist-day.js) into the #visitComplianceContainer that
   already exists in visit-details.js's modal, then swaps the
   footer's "Start Visit Checklist" button into "Save Visit".

   Save Visit finds this same visit in SupervisorVisitStore, marks it
   status: 'completed' with the checklist responses attached, and
   saves it back — which is exactly what visit-history.js's own
   status() function already checks for, so a saved visit appears in
   Visit History immediately with no changes needed there either.
   ========================================================================= */

(function () {
  'use strict';

  // key: 'A-0', 'A-1', ... (section key + item index) -> {tick, rating}
  let complianceResponses = {};
  let complianceVisitId = null;

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function responseKey(sectionKey, itemIdx) {
    return sectionKey + '-' + itemIdx;
  }

  function setTick(sectionKey, itemIdx, value) {
    const key = responseKey(sectionKey, itemIdx);
    if (!complianceResponses[key]) complianceResponses[key] = {};
    // Tapping the already-active tick again clears it — same
    // "tap again to clear" convention used everywhere else in this app.
    complianceResponses[key].tick =
      complianceResponses[key].tick === value ? null : value;
    renderChecklistBody();
  }

  function setRating(sectionKey, itemIdx, value) {
    const key = responseKey(sectionKey, itemIdx);
    if (!complianceResponses[key]) complianceResponses[key] = {};
    complianceResponses[key].rating =
      complianceResponses[key].rating === value ? null : value;
    renderChecklistBody();
  }

  function countAnswered() {
    let total = 0, answered = 0;
    if (typeof WEEKLY_CATEGORIES === 'undefined') return { total: 0, answered: 0 };
    WEEKLY_CATEGORIES.forEach(section => {
      section.items.forEach((item, idx) => {
        total++;
        const r = complianceResponses[responseKey(section.key, idx)];
        if (r && r.tick) answered++;
      });
    });
    return { total, answered };
  }

  function renderChecklistBody() {
    const container = document.getElementById('visitComplianceContainer');
    if (!container) return;

    if (typeof WEEKLY_CATEGORIES === 'undefined') {
      container.innerHTML = `<div class="supervisor-visit-empty">
        Checklist data (weekly-checklist-day.js) didn't load — check the script tag on this page.
      </div>`;
      return;
    }

    const { total, answered } = countAnswered();

    let html = `<div style="margin-bottom:14px; padding:10px 14px; background:#f7f7f5; border-radius:8px; font-size:13px;">
      <b>${answered}</b> of <b>${total}</b> items ticked
    </div>`;

    WEEKLY_CATEGORIES.forEach(section => {
      html += `<div style="margin-bottom:18px;">
        <h4 style="margin:0 0 8px; font-size:13px; font-weight:700;">${esc(section.key)}. ${esc(section.label)}</h4>`;

      section.items.forEach((item, idx) => {
        const key = responseKey(section.key, idx);
        const r = complianceResponses[key] || {};

        const tickButtons = TICK_OPTIONS.map(t => {
          const active = r.tick === t.value;
          const color = t.color === 'good' ? 'var(--success,#25993c)' : t.color === 'crit' ? 'var(--danger,#c8433f)' : 'var(--text-muted,#888)';
          return `<button type="button" onclick="window.__visitComplianceSetTick('${esc(section.key)}',${idx},'${esc(t.value)}')"
            title="${esc(t.label)}"
            style="padding:4px 9px; border-radius:6px; border:${active ? 'none' : '1px solid var(--border,#ccc)'}; background:${active ? color : '#fff'}; color:${active ? '#fff' : 'var(--text,#333)'}; font-size:12px; font-weight:600; cursor:pointer; margin-right:4px;">${esc(t.value)}</button>`;
        }).join('');

        const ratingButtons = RATING_SCALE.map(rt => {
          const active = r.rating === rt.value;
          const color = rt.color === 'good' ? 'var(--success,#25993c)' : rt.color === 'warn' ? '#EE8F35' : rt.color === 'crit' ? 'var(--danger,#c8433f)' : 'var(--text-muted,#888)';
          return `<button type="button" onclick="window.__visitComplianceSetRating('${esc(section.key)}',${idx},'${esc(rt.value)}')"
            title="${esc(rt.label)}"
            style="padding:3px 8px; border-radius:5px; border:${active ? 'none' : '1px solid var(--border,#ccc)'}; background:${active ? color : '#fff'}; color:${active ? '#fff' : 'var(--text,#333)'}; font-size:11px; font-weight:600; cursor:pointer; margin-right:3px;">${esc(rt.label)}</button>`;
        }).join('');

        html += `<div style="padding:10px 0; border-bottom:1px solid var(--border,#eee);">
          <div style="font-size:13px; margin-bottom:2px;">${esc(item.text)}</div>
          <div style="font-size:11.5px; color:var(--text-muted,#888); margin-bottom:6px;">Evidence: ${esc(item.evidence)}</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
            <span style="font-size:11px; color:#888; margin-right:4px;">Tick:</span>${tickButtons}
            <span style="font-size:11px; color:#888; margin:0 4px 0 10px;">Rating:</span>${ratingButtons}
          </div>
        </div>`;
      });

      html += `</div>`;
    });

    container.innerHTML = html;
  }

  window.__visitComplianceSetTick = setTick;
  window.__visitComplianceSetRating = setRating;

  function swapFooterToSaveButton() {
    // The footer's "Start Visit Checklist" button already exists in
    // visit-details.js's fixed modal HTML — rather than editing that
    // file again, this finds it and turns it into "Save Visit" the
    // moment the checklist actually renders.
    const footer = document.querySelector('.supervisor-visit-modal-footer');
    if (!footer) return;
    const startBtn = footer.querySelector('button.btn-primary');
    if (!startBtn) return;
    startBtn.textContent = 'Save Visit';
    startBtn.setAttribute('onclick', 'window.saveSupervisorVisitCompliance()');
  }

  window.openSupervisorVisitCompliance = function (visit) {
    complianceVisitId = visit && visit.id;
    complianceResponses = {};
    renderChecklistBody();
    swapFooterToSaveButton();
  };

  window.saveSupervisorVisitCompliance = function () {
    if (!window.SupervisorVisitStore || typeof window.SupervisorVisitStore.get !== 'function') {
      alert('Could not save — the visit store is not available.');
      return;
    }
    const { answered, total } = countAnswered();
    if (answered === 0) {
      if (!confirm('No checklist items have been ticked yet. Save this visit as completed anyway?')) return;
    }

    const visits = window.SupervisorVisitStore.get();
    const idx = visits.findIndex(v => String(v.id) === String(complianceVisitId));
    if (idx === -1) {
      alert('Could not find this visit to save — it may have been deleted.');
      return;
    }

    visits[idx].status = 'completed';
    visits[idx].completedAt = new Date().toISOString();
    visits[idx].checklist = complianceResponses;
    visits[idx].checklistSummary = { answered, total };

    window.SupervisorVisitStore.save(visits);

    if (typeof window.closeSupervisorVisitDetails === 'function') {
      window.closeSupervisorVisitDetails();
    }
    // Refresh whichever views are currently on screen — each one
    // guards on its own container existing, same pattern the rest of
    // this app already uses, so calling all of them is harmless even
    // if only one is actually visible right now.
    if (typeof window.renderVisitHistory === 'function') window.renderVisitHistory();
    if (typeof window.refreshVisitSchedule === 'function') window.refreshVisitSchedule();

    alert('Visit saved — it now appears in Visit History.');
  };
})();