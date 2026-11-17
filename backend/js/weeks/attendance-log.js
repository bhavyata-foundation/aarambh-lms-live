/* =========================================================================
   js/supervisor/attendance-log.js — the supervisor's OWN attendance:
   which school she went to, at what time, and what she was there to
   do. Not fabricated — built entirely from visitCoverRecords (already
   real, from visit-cover.js: School Name, Ward, Date of Visit, Time
   In, Time Out, one row per visit she's actually opened).

   "Activities" is the same real 7-step visit workflow this app
   already runs (Weekly Checklist, Attendance Verification, Parent
   Feedback, HM Discussion, Score Summary, Action Plan) — what she is
   actually there to do at every visit, per the compliance sheet's own
   Section 2 frequency table, not an invented task list.

   Load AFTER visit-cover.js (needs visitCoverRecords).
   ========================================================================= */

var ATTENDANCE_LOG_ACTIVITIES = [
  'Weekly Compliance Checklist (A–H)',
  'Attendance — Physical Verification',
  'Parent Feedback (min. 5 parents)',
  'HM / Principal Discussion',
  'Score Summary review',
  'Action Plan & Escalation sign-off'
];

function attendanceLogDuration(timeIn, timeOut){
  if(!timeIn || !timeOut) return null;
  const [inH, inM] = timeIn.split(':').map(Number);
  const [outH, outM] = timeOut.split(':').map(Number);
  let mins = (outH * 60 + outM) - (inH * 60 + inM);
  if(mins < 0) return null; // time out before time in — don't show a negative duration
  return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
}

function renderAttendanceLog(){
  const container = document.getElementById('attendance-log-body');
  if(!container) return;
  container.innerHTML = '';
  container.appendChild(mdSec('My Attendance', '<span class="reqs">where I went, and when</span>'));

  const note = document.createElement('p');
  note.className = 'cap'; note.style.margin = '0 0 16px';
  note.textContent = 'Built from every visit you\'ve opened in Visit Checklist — School, Date, and Time In/Out come from that visit\'s own Visit Cover.';
  container.appendChild(note);

  const entries = Object.keys(visitCoverRecords)
    .map(key => ({ key, rec: visitCoverRecords[key] }))
    .filter(e => e.rec.dateOfVisit)
    .sort((a, b) => (b.rec.dateOfVisit + (b.rec.timeIn||'')).localeCompare(a.rec.dateOfVisit + (a.rec.timeIn||'')));

  if(!entries.length){
    container.appendChild(mdCard(null, 'No visits opened yet — start a visit from the sidebar or My Schools to see your attendance log build up here.', null));
    return;
  }

  const list = document.createElement('div');
  list.style.cssText = 'display:flex; flex-direction:column; gap:10px;';
  entries.forEach(({key, rec}) => {
    const duration = attendanceLogDuration(rec.timeIn, rec.timeOut);
    const dateNice = rec.dateOfVisit ? new Date(rec.dateOfVisit + 'T00:00:00').toLocaleDateString([], {weekday:'short', day:'numeric', month:'short', year:'numeric'}) : '—';
    const card = document.createElement('div');
    card.className = 'card'; card.style.padding = '16px 18px';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap;">
        <div>
          <b style="font-size:14px;">${esc(rec.schoolName || 'School not yet named')}</b>
          ${rec.ward ? `<span class="cap" style="margin-left:6px;">Ward ${esc(rec.ward)}</span>` : ''}
          <div class="cap" style="margin-top:3px;">${esc(key)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px; font-weight:600;">${dateNice}</div>
          <div class="cap">${rec.timeIn || '—:—'} – ${rec.timeOut || '—:—'}${duration ? ' · ' + duration : ''}</div>
        </div>
      </div>
      <div style="margin-top:12px; padding-top:12px; border-top:1px solid #eee;">
        <div class="cap" style="margin-bottom:6px;">Activities for this visit</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${ATTENDANCE_LOG_ACTIVITIES.map(a => `<span class="pill" style="background:#f0f0ee; color:#666;">${esc(a)}</span>`).join('')}
        </div>
      </div>
    `;
    list.appendChild(card);
  });
  container.appendChild(list);
}