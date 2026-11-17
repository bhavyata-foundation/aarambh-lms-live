/* =========================================================================
   js/supervisor/compliance-issues.js — a supervisor raises a real
   compliance concern against a specific teacher's class, the teacher
   sees it on her own dashboard and responds, and the supervisor
   reviews that response to resolve or escalate it.

   Genuinely backend-connected (compliance_issues table) — this has to
   be, since the supervisor and teacher are on separate logins/
   devices; localStorage can't cross that boundary the way it can for
   this app's other not-yet-backed features.

   Uses the same real school/class selector pattern PTM & Training
   already relies on (get_schools_list.php / get_classes_for_Schools.php),
   not the demo sidebar teacher list — so an issue actually reaches the
   real teacher logged into that class.
   ========================================================================= */

var COMPLIANCE_ISSUE_CATEGORIES = [
  'Attendance & Punctuality', 'Lesson Plan & Curriculum', 'Classroom Safety & Hygiene',
  'TLM & Material', 'Discipline & Behaviour', 'Documentation & Records', 'Other'
];

let ciSchoolId = null, ciClassId = null;
let complianceIssuesCache = []; // last real fetch, so resolve/escalate can find an issue by id without refetching

async function renderComplianceIssues(){
  const container = document.getElementById('compliance-issues-body');
  if(!container) return;
  container.innerHTML = '';
  container.appendChild(mdSec('Compliance Issues', '<span class="reqs">raised against a real teacher\'s class</span>'));

  const formWrap = document.createElement('div');
  formWrap.className = 'card'; formWrap.style.cssText = 'padding:16px 18px; margin-bottom:18px;';
  formWrap.innerHTML = `
    <h4 style="margin:0 0 12px; font-size:13px;">Raise a new issue</h4>
    <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end;">
      <div style="flex:1; min-width:180px;">
        <label style="font-size:10.5px; font-weight:bold; color:#888; text-transform:uppercase; display:block; margin-bottom:4px;">School</label>
        <select id="ciSchoolSelect" onchange="ciOnSchoolChange()" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;"><option>Loading…</option></select>
      </div>
      <div style="flex:1; min-width:180px;">
        <label style="font-size:10.5px; font-weight:bold; color:#888; text-transform:uppercase; display:block; margin-bottom:4px;">Class / Teacher</label>
        <select id="ciClassSelect" onchange="ciOnClassChange()" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;"><option>Select a school first</option></select>
      </div>
      <div style="min-width:170px;">
        <label style="font-size:10.5px; font-weight:bold; color:#888; text-transform:uppercase; display:block; margin-bottom:4px;">Category</label>
        <select id="ciCategorySelect" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;">${COMPLIANCE_ISSUE_CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('')}</select>
      </div>
      <div style="min-width:120px;">
        <label style="font-size:10.5px; font-weight:bold; color:#888; text-transform:uppercase; display:block; margin-bottom:4px;">Severity</label>
        <select id="ciSeveritySelect" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;">
          <option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option>
        </select>
      </div>
    </div>
    <div style="margin-top:10px;">
      <label style="font-size:10.5px; font-weight:bold; color:#888; text-transform:uppercase; display:block; margin-bottom:4px;">Description</label>
      <textarea id="ciDescription" placeholder="What was observed, and what needs to change?" style="width:100%; min-height:64px; padding:8px 10px; border:1px solid #ccc; border-radius:6px; font-size:13px; resize:vertical;"></textarea>
    </div>
    <div id="ciFormResult" style="margin-top:8px;"></div>
    <button class="btn-sup" style="margin-top:8px;" onclick="submitComplianceIssue()">Raise issue</button>
  `;
  container.appendChild(formWrap);

  const listHeading = document.createElement('h3');
  listHeading.className = 'report-h3';
  listHeading.textContent = 'Raised so far';
  container.appendChild(listHeading);

  const listWrap = document.createElement('div');
  listWrap.id = 'complianceIssuesList';
  listWrap.innerHTML = '<p class="sub">Loading…</p>';
  container.appendChild(listWrap);

  ciLoadSchools();
  await ciLoadIssuesList();
}

async function ciLoadSchools(){
  const sel = document.getElementById('ciSchoolSelect');
  try{
    const res = await fetch('backend/get_schools_list.php' + window.location.search);
    const data = await res.json();
    if(data.status !== 'success' || !data.schools){ sel.innerHTML = '<option value="">Could not load schools</option>'; return; }
    sel.innerHTML = '<option value="">Choose a school…</option>' + data.schools.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  } catch(err){
    sel.innerHTML = '<option value="">Could not reach the server</option>';
  }
}

async function ciOnSchoolChange(){
  ciSchoolId = parseInt(document.getElementById('ciSchoolSelect').value, 10) || null;
  ciClassId = null;
  const classSel = document.getElementById('ciClassSelect');
  if(!ciSchoolId){ classSel.innerHTML = '<option value="">Select a school first</option>'; return; }
  classSel.innerHTML = '<option value="">Loading…</option>';
  try{
    const params = new URLSearchParams(window.location.search);
    params.set('school_id', ciSchoolId);
    const res = await fetch('backend/get_classes_for_Schools.php?' + params.toString());
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

function ciOnClassChange(){
  ciClassId = parseInt(document.getElementById('ciClassSelect').value, 10) || null;
}

async function submitComplianceIssue(){
  const resultEl = document.getElementById('ciFormResult');
  const category = document.getElementById('ciCategorySelect').value;
  const severity = document.getElementById('ciSeveritySelect').value;
  const description = document.getElementById('ciDescription').value.trim();

  if(!ciSchoolId || !ciClassId){ resultEl.innerHTML = '<div class="au-error">Pick a school and class first.</div>'; return; }
  if(!description){ resultEl.innerHTML = '<div class="au-error">A description is required.</div>'; return; }

  resultEl.innerHTML = '<p class="sub">Saving…</p>';
  try{
    const res = await fetch('backend/add_compliance_issue.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ class_id: ciClassId, school_id: ciSchoolId, category, description, severity })
    });
    const data = await res.json();
    if(data.status !== 'success'){
      resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Could not save.')}</div>`;
      return;
    }
    document.getElementById('ciDescription').value = '';
    resultEl.innerHTML = '';
    alert('Issue raised — it will appear on that teacher\'s dashboard.');
    await ciLoadIssuesList();
  } catch(err){
    resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
  }
}

async function ciLoadIssuesList(){
  const listWrap = document.getElementById('complianceIssuesList');
  try{
    const params = new URLSearchParams(window.location.search);
    const res = await fetch('backend/get_compliance_issues.php?' + params.toString());
    const data = await res.json();
    if(data.status !== 'success'){
      listWrap.innerHTML = `<p class="sub">${esc(data.message || 'Could not load issues.')}</p>`;
      return;
    }
    complianceIssuesCache = data.issues || [];
    renderComplianceIssuesList();
  } catch(err){
    listWrap.innerHTML = '<p class="sub">Could not reach the server.</p>';
  }
}

var CI_STATUS_PILL = {
  open: '<span class="pill warn">Open — awaiting response</span>',
  teacher_responded: '<span class="pill info">Teacher responded — needs your review</span>',
  resolved: '<span class="pill good">Resolved</span>',
  escalated: '<span class="pill crit">Escalated</span>'
};

function renderComplianceIssuesList(){
  const listWrap = document.getElementById('complianceIssuesList');
  if(!complianceIssuesCache.length){
    listWrap.innerHTML = '<p class="sub">No issues raised yet.</p>';
    return;
  }
  listWrap.innerHTML = complianceIssuesCache.map(issue => `
    <div class="card" style="padding:14px 18px; margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
        <div>
          <b>${esc(issue.class_name)}</b> — ${esc(issue.school_name)}
          <div class="cap" style="margin-top:2px;">${esc(issue.category)} · ${esc(issue.severity)} severity · raised ${esc((issue.raised_at||'').slice(0,10))}</div>
        </div>
        ${CI_STATUS_PILL[issue.status] || ''}
      </div>
      <p style="margin:10px 0 0; font-size:13px;">${esc(issue.description)}</p>
      ${issue.teacher_response ? `<div style="margin-top:10px; padding:10px 12px; background:#f7f7f5; border-radius:8px;"><div class="cap" style="margin-bottom:4px;">Teacher's response</div><p style="margin:0; font-size:13px;">${esc(issue.teacher_response)}</p></div>` : ''}
      ${issue.resolution_note ? `<div class="cap" style="margin-top:8px;">Resolution note: ${esc(issue.resolution_note)}</div>` : ''}
      ${(issue.status === 'open' || issue.status === 'teacher_responded') ? `
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button class="btn-sup" style="padding:6px 14px; font-size:12px;" onclick="resolveComplianceIssue(${issue.id},'resolved')">✓ Resolve</button>
          <button class="btn-sup-outline" style="padding:6px 14px; font-size:12px;" onclick="resolveComplianceIssue(${issue.id},'escalated')">Escalate</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function resolveComplianceIssue(issueId, decision){
  let note = '';
  if(decision === 'escalated'){
    note = prompt('Note for the escalation record (optional):') || '';
  }
  try{
    const res = await fetch('backend/resolve_compliance_issue.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ issue_id: issueId, decision, note })
    });
    const data = await res.json();
    if(data.status !== 'success'){ alert(data.message || 'Could not save the decision.'); return; }
    await ciLoadIssuesList();
  } catch(err){
    alert('Could not reach the server.');
  }
}