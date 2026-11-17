/* =========================================================================
   js/supervisor/teacher-insights.js — "Teachers Performance" (real
   curriculum-completion data, now backend-connected via
   get_daily_plan_entries.php) and "Teacher's Attendance" (real
   present/absent records via get_teacher_attendance_for_supervisor.php)
   — both read-only, both scoped to a real school/class picked with
   the same selector PTM & Training and Compliance Issues already use.

   Load AFTER checklist.js and js/render/ui-helpers.js (mdSec/mdCard/esc).
   ========================================================================= */

let tiSchoolId = null, tiClassId = null;
let tiActiveTab = 'performance'; // 'performance' | 'attendance'
let tiSelectedWeek = 1; // which of the real 11 weeks Performance is currently showing

async function renderTeacherInsights(){
  const container = document.getElementById(tiActiveTab === 'performance' ? 'performance-body' : 'teacherattendance-body');
  if(!container) return;
  container.innerHTML = '';
  container.appendChild(mdSec(tiActiveTab === 'performance' ? 'Teachers Performance' : "Teacher's Attendance",
    tiActiveTab === 'performance' ? '<span class="reqs">real curriculum completion, from her own dashboard</span>' : '<span class="reqs">real attendance, read-only</span>'));

  const formWrap = document.createElement('div');
  formWrap.className = 'card'; formWrap.style.cssText = 'padding:16px 18px; margin-bottom:18px;';
  formWrap.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; gap:10px;">
      <div style="flex:1; min-width:180px;">
        <label style="font-size:10.5px; font-weight:bold; color:#888; text-transform:uppercase; display:block; margin-bottom:4px;">School</label>
        <select id="tiSchoolSelect-${tiActiveTab}" onchange="tiOnSchoolChange('${tiActiveTab}')" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;"><option>Loading…</option></select>
      </div>
      <div style="flex:1; min-width:180px;">
        <label style="font-size:10.5px; font-weight:bold; color:#888; text-transform:uppercase; display:block; margin-bottom:4px;">Class / Teacher</label>
        <select id="tiClassSelect-${tiActiveTab}" onchange="tiOnClassChange('${tiActiveTab}')" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;"><option value="">Select a school first</option></select>
      </div>
    </div>
  `;
  container.appendChild(formWrap);

  const resultWrap = document.createElement('div');
  resultWrap.id = tiActiveTab + 'Result';
  resultWrap.innerHTML = '<p class="sub">Pick a school and class to see real data.</p>';
  container.appendChild(resultWrap);

  await tiLoadSchools(tiActiveTab);
}

async function tiLoadSchools(tab){
  const sel = document.getElementById('tiSchoolSelect-' + tab);
  if(!sel) return;
  try{
    const res = await fetch('backend/schools/get_schools_list.php' + window.location.search);
    const data = await res.json();
    if(data.status !== 'success' || !data.schools){ sel.innerHTML = '<option value="">Could not load schools</option>'; return; }
    sel.innerHTML = '<option value="">Choose a school…</option>' + data.schools.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  } catch(err){
    sel.innerHTML = '<option value="">Could not reach the server</option>';
  }
}

async function tiOnSchoolChange(tab){
  tiSchoolId = parseInt(document.getElementById('tiSchoolSelect-' + tab).value, 10) || null;
  tiClassId = null;
  const classSel = document.getElementById('tiClassSelect-' + tab);
  if(!tiSchoolId){ classSel.innerHTML = '<option value="">Select a school first</option>'; return; }
  classSel.innerHTML = '<option value="">Loading…</option>';
  try{
    const params = new URLSearchParams(window.location.search);
    params.set('school_id', tiSchoolId);
    const res = await fetch('backend/schools/get_classes_for_Schools.php?' + params.toString());
    const data = await res.json();
    if(data.status !== 'success' || !data.classes || !data.classes.length){
      classSel.innerHTML = '<option value="">No classes at this school yet</option>';
      return;
    }
    classSel.innerHTML = '<option value="">Choose a class…</option>' + data.classes.map(c =>
      `<option value="${c.id}">${esc(c.name || 'Unnamed class')} — ${esc(c.teacher_name || 'Unassigned')}</option>`
    ).join('');
  } catch(err){
    classSel.innerHTML = '<option value="">Could not reach the server</option>';
  }
}

function tiOnClassChange(tab){
  tiClassId = parseInt(document.getElementById('tiClassSelect-' + tab).value, 10) || null;
  if(tiClassId){
    if(tab === 'performance') tiLoadPerformance();
    else tiLoadAttendance();
  }
}

// Rebuilt against the REAL daily-plan schema (weeks / domain_activities
// / teacher_daily_plans / domain_completion) — the earlier version of
// this function assumed a flat daily_plan_entries table that was
// superseded by a real rebuild elsewhere. That real backend is
// week-scoped (one week per request), so this now needs a week
// picker rather than fetching "all weeks" in one call.
function tiRenderWeekPicker(){
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-bottom:14px;';
  wrap.innerHTML = `<label style="font-size:11px; font-weight:bold; color:#888; text-transform:uppercase; margin-right:8px;">Week</label>
    <select id="tiWeekSelect" style="padding:6px 10px; border:1px solid #ccc; border-radius:6px; font-size:13px;">
      ${Array.from({length: 11}, (_, i) => i + 1).map(w => `<option value="${w}" ${w === tiSelectedWeek ? 'selected' : ''}>Week ${w}</option>`).join('')}
    </select>`;
  return wrap;
}
function tiBindWeekPicker(){
  const sel = document.getElementById('tiWeekSelect');
  if(sel) sel.onchange = () => { tiSelectedWeek = parseInt(sel.value, 10); tiLoadPerformance(); };
}

async function tiLoadPerformance(){
  const resultWrap = document.getElementById('performanceResult');
  if(!tiClassId){ resultWrap.innerHTML = '<p class="sub">Pick a school and class to see real data.</p>'; return; }
  resultWrap.innerHTML = '<p class="sub">Loading…</p>';

  const picker = tiRenderWeekPicker();

  try{
    const params = new URLSearchParams(window.location.search);
    params.set('class_id', tiClassId);
    params.set('week_number', tiSelectedWeek);
    const res = await fetch('backend/daily_plan/get_daily_plan_for_supervisor.php?' + params.toString());
    const data = await res.json();
    resultWrap.innerHTML = '';
    resultWrap.appendChild(picker);

    if(data.status !== 'success'){
      resultWrap.insertAdjacentHTML('beforeend', `<p class="sub">${esc(data.message || 'Could not load.')}</p>`);
      tiBindWeekPicker();
      return;
    }

    const masterActivities = data.master_activities || {};
    const plans = data.plans || {};
    const completion = data.completion || {};
    const keys = Object.keys(masterActivities);

    if(!keys.length){
      resultWrap.insertAdjacentHTML('beforeend', `<p class="sub">No planned sessions for Week ${tiSelectedWeek} yet.</p>`);
      tiBindWeekPicker();
      return;
    }

    const doneCount = keys.filter(k => completion[k] && completion[k].completed).length;
    const pct = Math.round((doneCount / keys.length) * 100);

    const statsWrap = document.createElement('div');
    statsWrap.className = 'stat-grid'; statsWrap.style.marginBottom = '16px';
    statsWrap.innerHTML = `
      <div class="stat-card"><p class="label">Sessions planned</p><p class="value">${keys.length}</p></div>
      <div class="stat-card"><p class="label">Marked done</p><p class="value" style="color:var(--role-supervisor)">${doneCount}</p></div>
      <div class="stat-card"><p class="label">Completion</p><p class="value ${pct>=80?'':'warn'}">${pct}%</p></div>
    `;
    resultWrap.appendChild(statsWrap);

    const dayOrder = ['mon','tue','wed','thu','fri'];
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Day</th><th>Domain</th><th>Plan</th><th>Status</th><th>Last updated</th></tr></thead><tbody>';
    keys.sort((a, b) => {
      const [dayA, domA] = a.split('-'); const [dayB, domB] = b.split('-');
      return dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB) || domA.localeCompare(domB);
    }).forEach(key => {
      const master = masterActivities[key];
      const plan = plans[key];
      const done = completion[key] && completion[key].completed;
      const planText = plan ? plan.plan_text : '';
      table += `<tr>
        <td class="dim">${esc(master.day.toUpperCase())}</td><td>${esc(master.domain_key)}</td>
        <td>${planText ? esc(planText.slice(0, 60)) + (planText.length > 60 ? '…' : '') : '<span class="dim">No plan text — master suggestion only</span>'}</td>
        <td>${done ? '<span class="pill good">Done</span>' : '<span class="pill warn">Planned only</span>'}</td>
        <td class="dim">${esc((plan ? (plan.updated_at || '') : '').slice(0, 10)) || '—'}</td>
      </tr>`;
    });
    table += '</tbody></table></div>';
    const tableWrap = document.createElement('div'); tableWrap.innerHTML = table;
    resultWrap.appendChild(tableWrap);
    tiBindWeekPicker();
  } catch(err){
    resultWrap.innerHTML = '';
    resultWrap.appendChild(picker);
    resultWrap.insertAdjacentHTML('beforeend', '<p class="sub">Could not reach the server.</p>');
    tiBindWeekPicker();
  }
}

async function tiLoadAttendance(){
  const resultWrap = document.getElementById('teacherattendanceResult');
  resultWrap.innerHTML = '<p class="sub">Loading…</p>';
  try{
    const params = new URLSearchParams(window.location.search);
    params.set('class_id', tiClassId);
    const res = await fetch('backend/teacher_attendance/get_teacher_attendance_for_supervisor.php?' + params.toString());
    const data = await res.json();
    if(data.status !== 'success'){
      resultWrap.innerHTML = `<p class="sub">${esc(data.message || 'Could not load.')}</p>`;
      return;
    }
    const records = data.records || [];
    if(!records.length){
      resultWrap.innerHTML = '<p class="sub">No attendance marked by this teacher yet.</p>';
      return;
    }
    const presentCount = records.filter(r => r.status === 'present').length;
    const pct = Math.round((presentCount / records.length) * 100);

    const statsWrap = document.createElement('div');
    statsWrap.className = 'stat-grid'; statsWrap.style.marginBottom = '16px';
    statsWrap.innerHTML = `
      <div class="stat-card"><p class="label">Days marked (last 90)</p><p class="value">${records.length}</p></div>
      <div class="stat-card"><p class="label">Present</p><p class="value" style="color:var(--role-supervisor)">${presentCount}</p></div>
      <div class="stat-card"><p class="label">Attendance rate</p><p class="value ${pct>=90?'':'warn'}">${pct}%</p></div>
    `;
    resultWrap.innerHTML = '';
    resultWrap.appendChild(statsWrap);

    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Date</th><th>Status</th><th>Marked at</th></tr></thead><tbody>';
    records.forEach(r => {
      const pill = r.status === 'present' ? '<span class="pill good">Present</span>' : r.status === 'leave' ? '<span class="pill warn">Leave</span>' : '<span class="pill crit">Absent</span>';
      table += `<tr><td>${esc(r.date)}</td><td>${pill}</td><td class="dim">${esc((r.marked_at||'').slice(11,16))}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const tableWrap = document.createElement('div'); tableWrap.innerHTML = table;
    resultWrap.appendChild(tableWrap);
  } catch(err){
    resultWrap.innerHTML = '<p class="sub">Could not reach the server.</p>';
  }
}

function renderPerformanceTab(){ tiActiveTab = 'performance'; renderTeacherInsights(); }
function renderAttendanceTab(){ tiActiveTab = 'attendance'; renderTeacherInsights(); }

// Teachers Performance is the new default landing section, but this
// file loads after schools-events.js — so the initial render happens
// here, not from that earlier file's bootstrap.
renderPerformanceTab();