/* =========================================================================
   js/leave-approvals.js — "Leave requests to review" list, shared by
   supervisor.html and principal.html. The server decides which role is
   asking (session) and returns only requests still waiting on that
   role, so the same file works on both pages.

   Usage: put <div id="leaveApprovalsBox"></div> on the page, load this
   script, and it fills itself in on load.
   ========================================================================= */

(function(){
  const LEAVE_TYPE_NAMES = { casual: 'Casual leave', sick: 'Sick leave', other: 'Other' };

  function escL(str){
    const div = document.createElement('div');
    div.textContent = str === null || str === undefined ? '' : String(str);
    return div.innerHTML;
  }
  function niceDate(ymd){
    return new Date(ymd + 'T00:00:00').toLocaleDateString([], {day:'numeric', month:'short', year:'numeric'});
  }
  function statusChip(label, status){
    const colors = { approved: '#0a7a0a', rejected: '#a12727', pending: '#6d6b67' };
    const text = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'waiting';
    return `<span style="font-size:11.5px; color:${colors[status] || colors.pending};">${escL(label)}: <b>${text}</b></span>`;
  }

  async function loadLeaveApprovals(){
    const box = document.getElementById('leaveApprovalsBox');
    if(!box) return;
    box.innerHTML = '<h3 style="margin:0 0 6px;">Leave requests to review</h3><p class="cap">Loading…</p>';
    try{
      const res = await fetch('backend/teacher_leave/get_pending_leaves.php' + window.location.search);
      const data = await res.json();
      if(data.status !== 'success'){ box.innerHTML = '<h3 style="margin:0 0 6px;">Leave requests to review</h3><p class="cap">' + escL(data.message || 'Could not load leave requests.') + '</p>'; return; }
      renderList(box, data.role, data.pending || []);
    } catch(err){
      box.innerHTML = '<h3 style="margin:0 0 6px;">Leave requests to review</h3><p class="cap">Could not reach the server.</p>';
    }
  }

  function renderList(box, role, pending){
    const otherRole = role === 'principal' ? 'Supervisor' : 'Principal';
    const scopeNote = role === 'principal' ? 'Teachers in your school.' : 'All schools — not yet filtered to your assigned schools.';
    let html = `<h3 style="margin:0 0 4px;">Leave requests to review</h3>
      <p class="cap" style="margin:0 0 14px;">${pending.length ? pending.length + ' waiting on your decision. ' : 'Nothing waiting on your decision. '}${scopeNote} A leave counts only once both the supervisor and the principal approve.</p>`;
    pending.forEach(l => {
      const range = l.start_date === l.end_date ? niceDate(l.start_date) : niceDate(l.start_date) + ' – ' + niceDate(l.end_date);
      const otherStatus = role === 'principal' ? l.supervisor_status : l.principal_status;
      html += `<div class="card" style="padding:16px; margin-bottom:12px;" data-leave-id="${l.id}">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div>
            <b>${escL(l.teacher_name)}</b>
            <div class="cap">${escL(l.school_name || '')}${l.class_name ? ' · ' + escL(l.class_name) : ''}</div>
            <div style="margin-top:6px;">${escL(LEAVE_TYPE_NAMES[l.leave_type] || l.leave_type)} · ${escL(range)} · <b>${l.working_days}</b> working day${l.working_days === 1 ? '' : 's'}</div>
          </div>
          <div style="text-align:right;">${statusChip(otherRole, otherStatus)}<div class="cap">applied ${escL((l.created_at || '').slice(0, 10))}</div></div>
        </div>
        <p style="margin:10px 0; font-size:13px;">${escL(l.reason)}</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button data-decision="approved" style="padding:8px 16px; border-radius:8px; border:none; background:#1a9b6c; color:#fff; font-weight:600; cursor:pointer;">✓ Approve</button>
          <button data-decision="rejected" style="padding:8px 16px; border-radius:8px; border:1px solid #d9dcd5; background:#fff; color:#a12727; font-weight:600; cursor:pointer;">Reject</button>
        </div>
      </div>`;
    });
    box.innerHTML = html;
    box.querySelectorAll('button[data-decision]').forEach(btn => {
      btn.onclick = () => decide(btn);
    });
  }

  async function decide(btn){
    const card = btn.closest('[data-leave-id]');
    const leaveId = parseInt(card.getAttribute('data-leave-id'), 10);
    const decision = btn.getAttribute('data-decision');
    let note = '';
    if(decision === 'rejected'){
      note = (prompt('Why is this leave being rejected? The teacher will see this.') || '').trim();
      if(!note){ alert('A note is required when rejecting.'); return; }
    }
    card.querySelectorAll('button').forEach(b => b.disabled = true);
    try{
      const res = await fetch('backend/teacher_leave/decide_leave.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ leave_id: leaveId, decision, note })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        alert(data.message || 'Could not save the decision.');
        card.querySelectorAll('button').forEach(b => b.disabled = false);
        return;
      }
      if(data.final_status === 'approved') alert('Leave fully approved — ' + data.days_written + ' working day(s) added to the teacher\u2019s attendance as leave.');
      loadLeaveApprovals();
    } catch(err){
      alert('Could not reach the server.');
      card.querySelectorAll('button').forEach(b => b.disabled = false);
    }
  }

  window.loadLeaveApprovals = loadLeaveApprovals;
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadLeaveApprovals);
  else loadLeaveApprovals();
})();