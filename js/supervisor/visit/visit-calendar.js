/* =========================================================================
   js/supervisor/visit-calendar.js — a real visit-scheduling calendar
   (schedule a visit against a real school/class, see it on a month
   grid) plus the in-app notification bell in the topbar. Both are
   genuinely computed from real app state (scheduledVisits, HISTORY),
   not fabricated counts.

   No real backend yet for scheduledVisits — same honest gap as every
   other not-yet-backed feature in this app — persisted to
   localStorage instead.

   Load AFTER checklist.js (needs TEACHERS/HISTORY), schools-events.js
   (needs MY_SCHOOLS), and visit-context.js (needs setCurrentVisit).
   ========================================================================= */

var scheduledVisits = []; // {id, schoolName, ward, teacherName, className, date, time, notes, status:'scheduled'|'done'}
(function loadScheduledVisits(){
  try {
    const raw = localStorage.getItem('scheduledVisits');
    if(raw) scheduledVisits = JSON.parse(raw);
  } catch(e){ /* malformed or unavailable — start empty */ }
})();
function saveScheduledVisits(){
  try { localStorage.setItem('scheduledVisits', JSON.stringify(scheduledVisits)); }
  catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
}

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calSelectedDate = null;

function shiftCalMonth(delta){
  calMonth += delta;
  if(calMonth > 11){ calMonth = 0; calYear++; }
  if(calMonth < 0){ calMonth = 11; calYear--; }
  renderVisitCalendar();
}

function addScheduledVisit(){
  const schoolSel = document.getElementById('schedSchoolSelect');
  const classSel = document.getElementById('schedClassSelect');
  const dateEl = document.getElementById('schedDate');
  const timeEl = document.getElementById('schedTime');
  const notesEl = document.getElementById('schedNotes');
  if(!schoolSel.value || !classSel.value || !dateEl.value){
    alert('Pick a school, a class, and a date first.');
    return;
  }
  const school = MY_SCHOOLS.find(s => s.id === schoolSel.value);
  const cls = school.classes[parseInt(classSel.value, 10)];
  scheduledVisits.push({
    id: 'sv' + Date.now(),
    schoolName: school.name, ward: school.ward,
    teacherName: cls.teacher || 'Unassigned', className: cls.name,
    date: dateEl.value, time: timeEl.value || '', notes: notesEl.value || '',
    status: 'scheduled'
  });
  saveScheduledVisits();
  notesEl.value = '';
  renderVisitCalendar();
  if(typeof updateNotificationBell === 'function') updateNotificationBell();
}

function updateScheduleClassOptions(){
  const schoolSel = document.getElementById('schedSchoolSelect');
  const classSel = document.getElementById('schedClassSelect');
  const school = MY_SCHOOLS.find(s => s.id === schoolSel.value);
  classSel.innerHTML = school
    ? school.classes.map((c, i) => `<option value="${i}">${esc(c.name)} — ${esc(c.teacher || 'Unassigned')}</option>`).join('')
    : '<option value="">Pick a school first</option>';
}

function startScheduledVisit(id){
  const v = scheduledVisits.find(sv => sv.id === id);
  if(!v) return;
  v.status = 'done';
  saveScheduledVisits();
  renderVisitCalendar();
  if(typeof updateNotificationBell === 'function') updateNotificationBell();
}

function deleteScheduledVisit(id){
  if(!confirm('Remove this scheduled visit?')) return;
  scheduledVisits = scheduledVisits.filter(sv => sv.id !== id);
  saveScheduledVisits();
  renderVisitCalendar();
  if(typeof updateNotificationBell === 'function') updateNotificationBell();
}

function renderVisitCalendar(){
  const container = document.getElementById('visit-calendar-body');
  if(!container) return;
  container.innerHTML = '';
  container.appendChild(mdSec('Visit Calendar', '<span class="reqs">' + scheduledVisits.filter(v => v.status === 'scheduled').length + ' upcoming</span>'));

  // --- Schedule a new visit ---
  const formWrap = document.createElement('div');
  formWrap.className = 'card'; formWrap.style.cssText = 'padding:16px 18px; margin-bottom:18px;';
  formWrap.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end;">
      <div style="flex:1; min-width:180px;">
        <label style="font-size:10.5px; font-weight:bold; color:#888; text-transform:uppercase; display:block; margin-bottom:4px;">School</label>
        <select id="schedSchoolSelect" onchange="updateScheduleClassOptions()" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;">
          <option value="">Choose a school…</option>
          ${MY_SCHOOLS.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}
        </select>
      </div>
      <div style="flex:1; min-width:160px;">
        <label style="font-size:10.5px; font-weight:bold; color:#888; text-transform:uppercase; display:block; margin-bottom:4px;">Class</label>
        <select id="schedClassSelect" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;"><option value="">Pick a school first</option></select>
      </div>
      <div style="min-width:140px;">
        <label style="font-size:10.5px; font-weight:bold; color:#888; text-transform:uppercase; display:block; margin-bottom:4px;">Date</label>
        <input type="date" id="schedDate" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;" />
      </div>
      <div style="min-width:110px;">
        <label style="font-size:10.5px; font-weight:bold; color:#888; text-transform:uppercase; display:block; margin-bottom:4px;">Time</label>
        <input type="time" id="schedTime" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;" />
      </div>
      <div style="flex:2; min-width:200px;">
        <label style="font-size:10.5px; font-weight:bold; color:#888; text-transform:uppercase; display:block; margin-bottom:4px;">Notes (optional)</label>
        <input type="text" id="schedNotes" placeholder="e.g. Follow-up on last visit's action points" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;" />
      </div>
      <button class="btn-sup" onclick="addScheduledVisit()">+ Schedule</button>
    </div>
  `;
  container.appendChild(formWrap);

  // --- Month grid ---
  const firstDay = new Date(calYear, calMonth, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthName = firstDay.toLocaleDateString([], {month:'long', year:'numeric'});
  const todayStr = new Date().toISOString().slice(0, 10);

  let cells = '';
  for(let i = 0; i < startWeekday; i++) cells += '<div></div>';
  for(let d = 1; d <= daysInMonth; d++){
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayVisits = scheduledVisits.filter(v => v.date === dateStr);
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === calSelectedDate;
    cells += `<div onclick="calSelectedDate='${dateStr}'; renderVisitCalendar();" style="min-height:56px; padding:6px; border-radius:8px; cursor:pointer; border:1px solid ${isSelected ? 'var(--role-supervisor,#7c3aed)' : '#eee'}; background:${isToday ? '#fef6e7' : '#fff'};">
      <div style="font-size:12px; font-weight:${isToday?'700':'400'};">${d}</div>
      ${dayVisits.length ? `<div style="margin-top:3px; display:flex; gap:2px; flex-wrap:wrap;">${dayVisits.map(v => `<span style="width:7px; height:7px; border-radius:50%; background:${v.status==='done' ? '#0ca30c' : '#EE8F35'};" title="${esc(v.schoolName)}"></span>`).join('')}</div>` : ''}
    </div>`;
  }

  const calWrap = document.createElement('div');
  calWrap.className = 'card'; calWrap.style.cssText = 'padding:16px 18px; margin-bottom:18px;';
  calWrap.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <b>${monthName}</b>
      <div><button class="btn-sup-outline" onclick="shiftCalMonth(-1)">‹</button> <button class="btn-sup-outline" onclick="shiftCalMonth(1)">›</button></div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px; font-size:11px; color:#888; margin-bottom:4px;">
      <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px;">${cells}</div>
  `;
  container.appendChild(calWrap);

  // --- Selected day's list, or all upcoming if nothing selected ---
  const listTitle = document.createElement('h3');
  listTitle.className = 'report-h3';
  listTitle.textContent = calSelectedDate
    ? 'Visits on ' + new Date(calSelectedDate + 'T00:00:00').toLocaleDateString([], {day:'numeric', month:'long', year:'numeric'})
    : 'All upcoming visits';
  container.appendChild(listTitle);

  const relevantVisits = (calSelectedDate ? scheduledVisits.filter(v => v.date === calSelectedDate) : scheduledVisits.filter(v => v.status === 'scheduled'))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const listWrap = document.createElement('div');
  if(!relevantVisits.length){
    listWrap.innerHTML = `<p class="sub">${calSelectedDate ? 'Nothing scheduled this day.' : 'No visits scheduled yet — use the form above.'}</p>`;
  } else {
    listWrap.innerHTML = relevantVisits.map(v => `
      <div class="card" style="padding:12px 16px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <b>${esc(v.schoolName)}</b> — ${esc(v.className)} (${esc(v.teacherName)})
          <div class="cap">${esc(v.date)}${v.time ? ' · ' + esc(v.time) : ''}${v.notes ? ' · ' + esc(v.notes) : ''}</div>
        </div>
        <div style="display:flex; gap:6px;">
          ${v.status === 'scheduled' ? `<button class="btn-sup" style="padding:6px 12px; font-size:12px;" onclick="startScheduledVisit('${v.id}')">Mark done</button>` : `<span class="pill good">Done</span>`}
          <button class="btn-sup-outline" style="padding:6px 12px; font-size:12px;" onclick="deleteScheduledVisit('${v.id}')">Remove</button>
        </div>
      </div>
    `).join('');
  }
  container.appendChild(listWrap);
}

/* ===================== NOTIFICATION BELL ===================== */
// Real alerts, computed from real state — never a fabricated count.
// Two sources right now: scheduled visits due today/overdue, and
// flagged entries in HISTORY needing follow-up. More sources (pending
// Effective Approvals, etc.) can feed the same list later without
// changing how the bell itself works.

function computeNotifications(){
  const todayStr = new Date().toISOString().slice(0, 10);
  const alerts = [];

  scheduledVisits.filter(v => v.status === 'scheduled' && v.date <= todayStr).forEach(v => {
    const overdue = v.date < todayStr;
    alerts.push({
      text: (overdue ? '⚠️ Overdue: ' : '📅 Due today: ') + v.schoolName + ' — ' + v.className,
      sub: v.date + (v.time ? ' · ' + v.time : ''),
      action: () => startScheduledVisit(v.id)
    });
  });

  HISTORY.filter(h => h.flag).forEach(h => {
    alerts.push({
      text: '🚩 Flagged visit: ' + h.teacher,
      sub: h.date + ' · ' + h.score + '%' + ' — needs follow-up',
      action: () => switchSection('history')
    });
  });

  return alerts;
}

function updateNotificationBell(){
  const badge = document.getElementById('notifBadge');
  if(!badge) return;
  const count = computeNotifications().length;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

function toggleNotificationBell(){
  const dropdown = document.getElementById('notifDropdown');
  const isHidden = dropdown.classList.contains('hidden');
  if(isHidden) renderNotificationDropdown();
  dropdown.classList.toggle('hidden', !isHidden);
}

function renderNotificationDropdown(){
  const dropdown = document.getElementById('notifDropdown');
  const alerts = computeNotifications();
  dropdown.innerHTML = alerts.length
    ? alerts.map((a, i) => `<div onclick="closeNotificationBellAnd(${i})" style="padding:12px 14px; border-bottom:1px solid #f0f0f0; cursor:pointer;">
        <div style="font-size:13px; font-weight:600;">${a.text}</div>
        <div style="font-size:11.5px; color:#888; margin-top:2px;">${a.sub}</div>
      </div>`).join('')
    : `<div style="padding:16px; text-align:center; color:#888; font-size:13px;">Nothing needs your attention right now.</div>`;
  dropdown._alerts = alerts; // stashed so closeNotificationBellAnd can find the right action without re-computing
}

function closeNotificationBellAnd(idx){
  const dropdown = document.getElementById('notifDropdown');
  const alert = dropdown._alerts && dropdown._alerts[idx];
  dropdown.classList.add('hidden');
  if(alert && alert.action) alert.action();
}

document.addEventListener('click', function(e){
  const wrap = document.getElementById('notifBellWrap');
  if(wrap && !wrap.contains(e.target)) document.getElementById('notifDropdown').classList.add('hidden');
});

updateNotificationBell(); // real count on page load, not left at 0 until something else triggers it