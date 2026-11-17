/* =========================================================================
   js/render/teacher-leave.js — "My leave" section, shown inside
   My Compliance → My Working Days (called from
   renderMyWorkingDaysCalendar in teacher.js).

   Real data only: requests come from backend/teacher_leave/*. A leave is
   only counted once BOTH the supervisor and the principal approve it —
   at that point the server writes each working day into
   teacher_attendance as 'leave', which is what the calendar and the
   attendance % read. Nothing here is estimated.

   Re-renders only its own section element, so it doesn't depend on any
   let/const from teacher.js.
   ========================================================================= */

// Styles for this section, injected once so no CSS file edit is needed.
(function injectTeacherLeaveStyles(){
  if(document.getElementById('teacherLeaveStyles')) return;
  const style = document.createElement('style');
  style.id = 'teacherLeaveStyles';
  style.textContent = '\n/* =========================================================\n   MY LEAVE — My Compliance → My Working Days\n   ========================================================= */\n.leave-summary{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:13px; max-width:620px;}\n.leave-stat{background:var(--surface-1); border:1px solid var(--line); border-radius:11px; padding:12px 14px; box-shadow:var(--shadow-1);}\n.leave-stat .k{font-size:10px; letter-spacing:.07em; text-transform:uppercase; color:var(--ink-3); font-weight:800;}\n.leave-stat .v{font-family:var(--disp); font-size:24px; font-weight:800; letter-spacing:-.03em; margin-top:4px;}\n.leave-stat .v small{font-size:12.5px; font-weight:700; color:var(--ink-2); letter-spacing:0;}\n.leave-form{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px 16px;}\n.leave-form .full{grid-column:1 / -1;}\n.leave-form label{display:block; font-size:10px; letter-spacing:.07em; text-transform:uppercase; color:var(--ink-3); font-weight:800; margin-bottom:4px;}\n.leave-form select, .leave-form input, .leave-form textarea{width:100%; max-width:none; font:inherit; font-size:13px; padding:8px 10px; border:1px solid var(--line); border-radius:8px; background:var(--surface-1); color:var(--ink-1); box-sizing:border-box;}\n.leave-form textarea{resize:vertical;}\n.leave-list{display:flex; flex-direction:column; gap:10px;}\n.leave-item{background:var(--surface-1); border:1px solid var(--line); border-left:4px solid var(--warn); border-radius:10px; padding:12px 14px;}\n.leave-item.is-approved{border-left-color:var(--good);}\n.leave-item.is-rejected{border-left-color:var(--crit);}\n.leave-item.is-cancelled{border-left-color:var(--line); opacity:.75;}\n.leave-item-head{display:flex; justify-content:space-between; align-items:flex-start; gap:10px;}\n.leave-reason{margin:8px 0; font-size:13px; color:var(--ink-2);}\n.leave-approvers{display:flex; flex-wrap:wrap; gap:8px 24px; font-size:12px;}\n.leave-approver span:first-child{margin-right:6px; color:var(--ink-2);}\n@media(max-width:700px){ .leave-form, .leave-summary{grid-template-columns:1fr;} }\n\n/* My attendance today card (also defined in style-new-design.css if you added it — duplicates are harmless) */\n.att-summary{background:var(--surface-1,#fff);border:1px solid var(--line,#d9dcd5);border-left:4px solid var(--good,#0ca30c);border-radius:11px;padding:14px 16px 12px;margin:0 0 14px;box-shadow:var(--shadow-2,0 1px 2px rgba(0,0,0,.06));max-width:520px;}\n.att-summary.is-absent{border-left-color:var(--crit,#d03b3b);}\n.att-summary.is-unmarked{border-left-color:var(--warn,#fab219);}\n.att-summary-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;}\n.att-summary-k{font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3,#797d75);font-weight:800;margin-bottom:4px;}\n.att-summary-v{font-family:var(--disp,inherit);font-size:28px;font-weight:800;letter-spacing:-.03em;line-height:1;}\n.att-summary-v small{font-size:14px;font-weight:700;color:var(--ink-2,#4f534d);letter-spacing:0;}\n.att-summary-legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:9px;font-size:12px;color:var(--ink-2,#4f534d);}\n.att-summary-legend b{color:var(--ink-1,#0c0e0b);}\n';
  document.head.appendChild(style);
})();

var teacherLeaveRecords = null;      // null = not fetched | 'loading' | 'error:...' | array
var teacherLeaveFormOpen = false;    // backs the collapsed "Apply for leave" card
var teacherLeaveSectionEl = null;    // the div this section renders into

var LEAVE_TYPE_LABELS = { casual: 'Casual leave', sick: 'Sick leave', other: 'Other' };

async function fetchTeacherLeaves(){
  teacherLeaveRecords = 'loading';
  try{
    const res = await fetch('backend/teacher_leave/get_my_leaves.php' + window.location.search);
    const data = await res.json();
    teacherLeaveRecords = data.status === 'success' ? (data.leaves || []) : 'error:' + (data.message || 'Could not load your leave requests.');
  } catch(err){
    teacherLeaveRecords = 'error:Could not reach the server.';
  }
  rerenderTeacherLeaveSection();
}

function rerenderTeacherLeaveSection(){
  if(teacherLeaveSectionEl && document.body.contains(teacherLeaveSectionEl)){
    buildTeacherLeaveSection(teacherLeaveSectionEl);
  }
}

// Entry point — appends the section to the given container.
function renderMyLeaveSection(container){
  const section = document.createElement('div');
  section.style.marginTop = '22px';
  container.appendChild(section);
  teacherLeaveSectionEl = section;
  if(teacherLeaveRecords === null) fetchTeacherLeaves();
  buildTeacherLeaveSection(section);
}

function leaveDateLabel(ymdStr){
  return new Date(ymdStr + 'T00:00:00').toLocaleDateString([], {day:'numeric', month:'short', year:'numeric'});
}

function leaveStatusPill(status){
  if(status === 'approved') return mdPill('Approved', 'good');
  if(status === 'rejected') return mdPill('Rejected', 'crit');
  if(status === 'cancelled') return mdPill('Cancelled', 'neu');
  return mdPill('Pending', 'warn');
}

function leaveApproverLine(label, status, name, note){
  const pill = status === 'approved' ? mdPill('Approved', 'good') : status === 'rejected' ? mdPill('Rejected', 'crit') : mdPill('Waiting', 'neu');
  return `<div class="leave-approver"><span>${esc(label)}${name ? ' · ' + esc(name) : ''}</span>${pill}${note ? `<div class="cap" style="margin-top:3px;">“${esc(note)}”</div>` : ''}</div>`;
}

function buildTeacherLeaveSection(section){
  section.innerHTML = '';
  section.appendChild(mdSec('My leave', '<span class="reqs">approved by supervisor + principal</span>'));

  if(teacherLeaveRecords === null || teacherLeaveRecords === 'loading'){
    const p = document.createElement('p'); p.className = 'cap'; p.textContent = 'Loading your leave requests…';
    section.appendChild(p);
    return;
  }
  if(typeof teacherLeaveRecords === 'string'){
    const wrap = document.createElement('div');
    wrap.innerHTML = `<p class="cap" style="color:var(--crit);">${esc(teacherLeaveRecords.slice(6))}</p><button class="btn">Retry</button>`;
    wrap.querySelector('button').onclick = fetchTeacherLeaves;
    section.appendChild(wrap);
    return;
  }

  // ---- Real totals for this academic year (June → May) ----
  const now = new Date();
  const ayStartYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  const ayStart = ayStartYear + '-06-01';
  const ayEnd = (ayStartYear + 1) + '-05-31';
  const inYear = teacherLeaveRecords.filter(l => l.start_date <= ayEnd && l.end_date >= ayStart);
  const approvedDays = inYear.filter(l => l.status === 'approved').reduce((a, l) => a + l.working_days, 0);
  const pendingCount = inYear.filter(l => l.status === 'pending').length;
  const pendingDays = inYear.filter(l => l.status === 'pending').reduce((a, l) => a + l.working_days, 0);

  const summary = document.createElement('div');
  summary.className = 'leave-summary';
  summary.innerHTML = `
    <div class="leave-stat"><div class="k">Approved leave this year</div><div class="v">${approvedDays}<small> working day${approvedDays === 1 ? '' : 's'}</small></div></div>
    <div class="leave-stat"><div class="k">Waiting for approval</div><div class="v">${pendingCount}<small> request${pendingCount === 1 ? '' : 's'} · ${pendingDays} day${pendingDays === 1 ? '' : 's'}</small></div></div>`;
  section.appendChild(summary);

  // ---- Apply for leave (collapsed by default) ----
  const today = todayDateKey();
  const formCard = document.createElement('div');
  formCard.className = 'card'; formCard.style.cssText = 'padding:0; margin:14px 0; overflow:hidden;';
  formCard.innerHTML = `
    <div class="leave-toggle" style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer;">
      <div>
        <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">✉ Apply for leave</h3>
        <p class="cap" style="margin:0;">Goes to your supervisor and your principal. It counts as leave only once both approve.</p>
      </div>
      <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--ink-3); transform:rotate(${teacherLeaveFormOpen ? '90deg' : '0deg'});">▶</span>
    </div>
    <div class="${teacherLeaveFormOpen ? '' : 'hidden'}" style="padding:0 18px 18px;">
      <div class="leave-form">
        <div><label>Leave type</label>
          <select id="leaveTypeInput">${Object.keys(LEAVE_TYPE_LABELS).map(k => `<option value="${k}">${esc(LEAVE_TYPE_LABELS[k])}</option>`).join('')}</select></div>
        <div><label>From</label><input type="date" id="leaveStartInput" value="${today}" /></div>
        <div><label>To</label><input type="date" id="leaveEndInput" value="${today}" /></div>
        <div class="full"><label>Reason</label><textarea id="leaveReasonInput" rows="2" placeholder="e.g. Medical appointment, family function"></textarea></div>
      </div>
      <p class="cap" id="leaveDaysPreview" style="margin:8px 0 0;"></p>
      <div id="leaveApplyResult" style="margin-top:8px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 18px; margin-top:10px;" onclick="submitLeaveApplication()">Submit leave request</button>
    </div>`;
  section.appendChild(formCard);
  formCard.querySelector('.leave-toggle').onclick = () => { teacherLeaveFormOpen = !teacherLeaveFormOpen; buildTeacherLeaveSection(section); };
  if(teacherLeaveFormOpen){
    const updatePreview = () => {
      const s = document.getElementById('leaveStartInput').value, e = document.getElementById('leaveEndInput').value;
      const el = document.getElementById('leaveDaysPreview');
      if(!s || !e || e < s){ el.textContent = ''; return; }
      const n = countLeaveWorkingDays(s, e);
      el.textContent = n + ' working day' + (n === 1 ? '' : 's') + ' in this range (Sundays, the last Saturday of the month and holidays are not counted).';
    };
    document.getElementById('leaveStartInput').oninput = updatePreview;
    document.getElementById('leaveEndInput').oninput = updatePreview;
    updatePreview();
  }

  // ---- Every request ----
  if(!teacherLeaveRecords.length){
    const p = document.createElement('p'); p.className = 'cap'; p.textContent = 'No leave requests yet.';
    section.appendChild(p);
    return;
  }
  const list = document.createElement('div');
  list.className = 'leave-list';
  list.innerHTML = teacherLeaveRecords.map(l => {
    const range = l.start_date === l.end_date ? leaveDateLabel(l.start_date) : leaveDateLabel(l.start_date) + ' – ' + leaveDateLabel(l.end_date);
    return `<div class="leave-item is-${esc(l.status)}">
      <div class="leave-item-head">
        <div><b>${esc(LEAVE_TYPE_LABELS[l.leave_type] || l.leave_type)}</b> · ${esc(range)}
          <div class="cap">${l.working_days} working day${l.working_days === 1 ? '' : 's'} · applied ${esc((l.created_at || '').slice(0, 10))}</div></div>
        <div>${leaveStatusPill(l.status)}</div>
      </div>
      <p class="leave-reason">${esc(l.reason)}</p>
      <div class="leave-approvers">
        ${leaveApproverLine('Supervisor', l.supervisor_status, l.supervisor_name, l.supervisor_note)}
        ${leaveApproverLine('Principal', l.principal_status, l.principal_name, l.principal_note)}
      </div>
      ${l.status === 'pending' ? `<button class="btn" style="margin-top:8px;" onclick="cancelLeaveRequest(${l.id})">Cancel request</button>` : ''}
    </div>`;
  }).join('');
  section.appendChild(list);
}

// Preview only — the server recomputes this itself (leave_helpers.php)
// with the same rules, and its number is the one that's stored.
function countLeaveWorkingDays(startStr, endStr){
  let n = 0;
  const d = new Date(startStr + 'T00:00:00'), end = new Date(endStr + 'T00:00:00');
  while(d <= end){
    const dow = d.getDay();
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const isHoliday = typeof complianceHolidayName === 'function' && complianceHolidayName(d.getFullYear(), d.getMonth(), d.getDate());
    const isLastSat = typeof isLastSaturday === 'function' && isLastSaturday(d.getFullYear(), d.getMonth(), d.getDate(), daysInMonth);
    if(dow !== 0 && !isLastSat && !isHoliday) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

async function submitLeaveApplication(){
  const resultEl = document.getElementById('leaveApplyResult');
  const body = {
    leave_type: document.getElementById('leaveTypeInput').value,
    start_date: document.getElementById('leaveStartInput').value,
    end_date: document.getElementById('leaveEndInput').value,
    reason: document.getElementById('leaveReasonInput').value.trim()
  };
  if(!body.start_date || !body.end_date){ resultEl.innerHTML = '<div class="au-error">Choose both dates.</div>'; return; }
  if(body.end_date < body.start_date){ resultEl.innerHTML = '<div class="au-error">The end date cannot be before the start date.</div>'; return; }
  if(!body.reason){ resultEl.innerHTML = '<div class="au-error">A reason is required.</div>'; return; }
  resultEl.innerHTML = '<p class="cap">Submitting…</p>';
  try{
    const res = await fetch('backend/teacher_leave/apply_leave.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)
    });
    const data = await res.json();
    if(data.status !== 'success'){ resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Could not submit.')}</div>`; return; }
    teacherLeaveFormOpen = false;
    await fetchTeacherLeaves(); // real row back from the server, not a guessed one
  } catch(err){
    resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
  }
}

async function cancelLeaveRequest(leaveId){
  if(!confirm('Cancel this leave request? Your supervisor and principal will no longer see it.')) return;
  try{
    const res = await fetch('backend/teacher_leave/cancel_leave.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ leave_id: leaveId })
    });
    const data = await res.json();
    if(data.status !== 'success'){ alert(data.message || 'Could not cancel.'); return; }
    fetchTeacherLeaves();
  } catch(err){
    alert('Could not reach the server.');
  }
}