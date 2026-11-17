/* =========================================================================
   js/supervisor/schools-events.js — My Schools (ward-grouped), the
   Events section (PTM/training calendar), the initial page bootstrap
   calls, and Effective Approvals (approving/rejecting a teacher's
   Monthly Effective Step 1 submission). Extracted from supervisor.js.

   Must load AFTER js/supervisor/checklist.js — the bootstrap calls
   below (renderTeacherList/renderChecklist/renderAttendance) need
   those function declarations to already exist.
   ========================================================================= */

/* =========================================================
   MY SCHOOLS — same ward-classification pattern as Super Admin,
   but scoped to only the schools assigned to this supervisor.
   ========================================================= */

// Real data for Mr. Kulin Maniar's assigned schools (ward L),
// same shape as SCHOOLS_SEED in js/superadmin.js — once a backend
// exists, both pages would fetch this from the same /api/schools
// endpoint, filtered server-side to this supervisor's assignment.
var MY_SCHOOLS = [
  {id:'s8', name:'Nehru Nagar MPS', ward:'L', address:'Shiv Shrusti School, 16, Shiv Shrusti Rd, G.T.B.Nagar, Nehru Nagar, Kurla, Mumbai, Maharashtra 400024', classes:[
    {name:'Jr KG', teacher:'Rukhsar Shaikh'},
    {name:'Sr KG', teacher:'Rashida Khatoon'}
  ]},
  {id:'s9', name:'Mohili Village MPS', ward:'L', address:'Opp. APEX HOSPITAL, Pereira Wadi, Saki Naka, Mumbai, Maharashtra 400072', classes:[
    {name:'Jr KG', teacher:'Deepika Dubey'},
    {name:'Sr KG', teacher:'Yasmeen Shaikh'}
  ]},
  {id:'s10', name:'Kajupada MPS', ward:'L', address:'Shivaji Vidhayala, Indira Nagar, Kajupada, Mumbai, Maharashtra 400072', classes:[
    {name:'Jr KG', teacher:'Sancheti Gole'},
    {name:'Sr KG', teacher:'Leenatha (BMC Teacher)'}
  ]},
  {id:'s11', name:'S.G Barve Marg MPS', ward:'L', address:'Brahmanwadi, opp. Kurla Station Kurla West, Mumbai, Maharashtra 400070', classes:[
    {name:'Jr KG', teacher:'Khushboo Mulani'},
    {name:'Sr KG', teacher:'Sana Ruksar Shaikh'}
  ]},
  {id:'s12', name:'Chunabhatti MPS', ward:'L', address:'Darawade Chawl, VN Purav Marg, Samarth Nagar, Chunabhatti, Sion, Mumbai, Maharashtra 400022', classes:[
    {name:'Jr KG', teacher:'Radha Yadav'},
    {name:'Sr KG', teacher:'Tasleem Shaikh'}
  ]}
];

let mySelectedWard = null;
let myExpandedSchoolCard = null;

function getMyWards(){
  return [...new Set(MY_SCHOOLS.map(s => s.ward))].sort();
}

function renderMySchools(){
  mySelectedWard = null;
  const container = document.getElementById('my-schools-body');
  container.innerHTML = '';
  container.appendChild(mdSec('My Schools', '<span class="reqs">' + MY_SCHOOLS.length + ' assigned</span>'));
  const wardGridWrap = document.createElement('div');
  wardGridWrap.innerHTML = `<div class="ward-grid" id="myWardGrid"></div>`;
  container.appendChild(wardGridWrap);
  renderMyWardCards();
}

function renderMyWardCards(){
  const container = document.getElementById('myWardGrid');
  container.innerHTML = getMyWards().map(w => {
    const count = MY_SCHOOLS.filter(s => s.ward === w).length;
    return `<div class="ward-card" onclick="selectMyWard('${w}')">
      <div class="ward-card-code">${w}</div>
      <div class="ward-card-count">${count} school${count===1?'':'s'}</div>
    </div>`;
  }).join('');
}

function selectMyWard(ward){
  mySelectedWard = ward;
  myExpandedSchoolCard = null;
  const count = MY_SCHOOLS.filter(s => s.ward === ward).length;
  document.getElementById('my-schools-body').innerHTML = `
    <button class="btn-sup-outline" style="margin-bottom:16px;" onclick="renderMySchools()">← All wards</button>
    <h3 class="report-h3">Ward ${ward} — ${count} school${count===1?'':'s'}</h3>
    <div class="schools-grid" id="mySchoolsGrid"></div>
  `;
  renderMySchoolCards();
}

function renderMySchoolCards(){
  const container = document.getElementById('mySchoolsGrid');
  const list = mySelectedWard ? MY_SCHOOLS.filter(s => s.ward === mySelectedWard) : MY_SCHOOLS;
  container.innerHTML = list.map(sc => {
    const isOpen = myExpandedSchoolCard === sc.id;
    const classSummary = sc.classes.map(c => `${c.name}: ${c.teacher || 'Unassigned'}`).join(' · ');
    return `<div class="school-card" onclick="toggleMySchoolCard('${sc.id}')">
      <div class="school-card-head">
        <div>
          <h4>${sc.name}</h4>
          <div class="meta">Ward ${sc.ward} · ${classSummary}</div>
        </div>
        <span class="cat-chevron ${isOpen?'open':''}">▶</span>
      </div>
      ${isOpen ? `<div class="school-card-details" onclick="event.stopPropagation()">
        <div class="row"><span>📍 Address</span><span>${sc.address || '—'}</span></div>
        ${sc.classes.map(c => `<div class="row"><span>👤 ${c.name} teacher</span><span>${c.teacher || 'Unassigned'}</span></div>`).join('')}
      </div>` : ''}
    </div>`;
  }).join('');
}

function toggleMySchoolCard(schoolId){
  myExpandedSchoolCard = (myExpandedSchoolCard === schoolId) ? null : schoolId;
  renderMySchoolCards();
}

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


renderTeacherList();
renderHistory(); // now the default landing section

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

function esc(str){
  const div = document.createElement('div');
  div.textContent = str === null || str === undefined ? '' : String(str);
  return div.innerHTML;
}

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