/* =========================================================================
   js/supervisor/administration/administration.js — "Administration /
   Analysis": Events (PTM/training calendar) and Effective Approvals
   (approving/rejecting a teacher's Monthly Effective Step 1
   submission). Split out of the old combined schools-events.js.

   Same cross-file-sharing rule as every other split file.
   ========================================================================= */


/* =========================================================
   EVENTS — PTMs, teacher trainings, and other scheduled events.
   Real backend-backed feature: creates go to add_event.php,
   listing comes from get_events.php, school/class dropdowns
   come from get_schools_list.php / get_classes_for_school.php.

   KNOWN LIMITATION: the school dropdown shows every real school,
   not just this supervisor's assigned ones — that assignment
   link doesn't exist in the database yet. Once it does, swap
   get_schools_list.php for a version filtered to this supervisor.
   ========================================================= */

function renderEventsSection(){
  const container = document.getElementById('events-admin-body');
  container.innerHTML = `<p class="sub">Loading…</p>`;

  fetch('backend/schools/get_schools_list.php' + window.location.search)
    .then(r => r.json())
    .then(data => {
      if(data.status !== 'success'){
        container.innerHTML = `<p class="sub">Could not load schools right now.</p>`;
        return;
      }
      container.innerHTML = `<div id="supervisorEventsCalendar"></div>`;
      initEventsCalendar('supervisorEventsCalendar', 'backend/events/get_events.php' + window.location.search, {
        canAdd: true,
        schools: data.schools,
        addEventEndpoint: 'backend/events/add_event.php' + window.location.search,
        classesEndpointBase: 'backend/schools/get_classes_for_Schools.php' + window.location.search
      });
    })
    .catch(() => {
      container.innerHTML = `<p class="sub">Could not reach the server.</p>`;
    });
}


// =========================================================================
// EFFECTIVE APPROVALS — Step 1 of the teacher's 4-step Monthly Effective
// sign-off (attendance & Effective sheet check) has nowhere to be
// approved from until now. This lists every submission still 'pending'
// and lets the supervisor approve or reject it.
//
// KNOWN LIMITATION: get_pending_approvals.php isn't filtered to "schools
// assigned to this supervisor" yet — that assignment table's schema
// isn't known, so this shows every pending submission system-wide.
//
// KNOWN LIMITATION: there's no independently-recorded attendance to
// cross-check the teacher's submitted figure against — daily
// attendance isn't synced to the server yet, only what she submits
// here. Shown as-is, not faked as a verified comparison.
// =========================================================================

// esc() comes from js/render/ui-helpers.js — no need to redefine it here (it was an exact duplicate before).

const EFF_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

async function loadPendingApprovals(){
  const noteEl = document.getElementById('approvalsNote');
  const listEl = document.getElementById('approvalsList');
  noteEl.textContent = 'Loading…';
  listEl.innerHTML = '';
  try {
    const res = await fetch('backend/effective/get_pending_approvals.php' + window.location.search);
    const data = await res.json();
    if(data.status !== 'success'){
      noteEl.textContent = data.message || 'Could not load pending approvals.';
      return;
    }
    renderApprovalsList(data.pending || []);
  } catch(err){
    noteEl.textContent = 'Could not reach the server.';
  }
}

function renderApprovalsList(pending){
  const noteEl = document.getElementById('approvalsNote');
  const listEl = document.getElementById('approvalsList');

  noteEl.innerHTML = pending.length
    ? pending.length + ' submission' + (pending.length === 1 ? '' : 's') + ' waiting on review. <i>Not yet filtered to your assigned schools — showing all pending submissions system-wide.</i>'
    : 'Nothing waiting on review right now.';

  listEl.innerHTML = '';
  listEl.appendChild(mdSec('Effective Approvals', '<span class="reqs">Step 1 of 4</span>'));
  if(!pending.length) return;

  pending.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'padding:18px; margin-bottom:14px;';

    const monthLabel = EFF_MONTH_NAMES[item.month] + ' ' + item.year;
    const submittedDate = (item.submitted_at || '').slice(0, 10);

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
        <div>
          <h4 style="margin:0 0 4px; font-size:14px;">${esc(item.teacher_name)}</h4>
          <p class="cap" style="margin:0 0 2px;">${esc(item.school_name)} · ${esc(item.class_name)}</p>
          <p class="cap" style="margin:0;">${esc(monthLabel)} · submitted ${esc(submittedDate)}</p>
        </div>
        <div style="text-align:right;">
          <p class="cap" style="margin:0 0 2px;">Attendance submitted for this month</p>
          <p style="margin:0; font-size:22px; font-weight:700;">${esc(item.teacher_attendance_pct)}%</p>
        </div>
      </div>
      <p class="cap" style="margin:12px 0 10px; font-style:italic;">Note: this is the one figure the teacher submitted — there's currently no independently-recorded attendance to cross-check it against, since daily attendance isn't synced to the server yet. Use your own judgment / offline records for now.</p>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn-sup" onclick="decideApproval(${item.id}, 'approved', this)">✓ Approve</button>
        <button class="btn-sup-outline" onclick="decideApproval(${item.id}, 'rejected', this)">Reject</button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

async function decideApproval(approvalId, decision, btnEl){
  let note = '';
  if(decision === 'rejected'){
    note = prompt('What should the teacher fix before resubmitting?') || '';
    if(!note.trim()){
      alert('A note is required when rejecting, so she knows what to correct.');
      return;
    }
  }
  const card = btnEl.closest('.card');
  const allButtons = card.querySelectorAll('button');
  allButtons.forEach(b => b.disabled = true);

  try {
    const res = await fetch('backend/effective/approve_effective.php' + window.location.search, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approval_id: approvalId, decision, note })
    });
    const data = await res.json();
    if(data.status !== 'success'){
      alert(data.message || 'Could not save the decision.');
      allButtons.forEach(b => b.disabled = false);
      return;
    }
    loadPendingApprovals(); // refresh the whole list — this one's now handled
  } catch(err){
    alert('Could not reach the server.');
    allButtons.forEach(b => b.disabled = false);
  }
}