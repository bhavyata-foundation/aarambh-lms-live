/* =========================================================================
   js/supervisor/visit-cover.js — SECTION 1 of the Aarambh Supervision
   Compliance Sheet: "VISIT IDENTIFICATION" — filled once per visit,
   read by every frequency checklist (Weekly/Monthly/Bi-Annual/Annual).
   Rendered at the top of the Visit Checklist screen, above the Weekly
   checklist itself.

   No real backend for this yet (same honest gap as the checklist
   itself) — persisted per-teacher to localStorage instead, so
   switching between teachers in the sidebar shows each one's own
   in-progress Visit Cover, not one shared/overwritten record.

   Two fields are genuinely auto-filled from data the app already has,
   not left as blank text boxes: Class Observed (from the selected
   teacher's own class) and Previous Visit Date / Previous Visit
   Overall Score (looked up from the real HISTORY array for that exact
   teacher — matches the sheet's own instruction that later sheets
   "pick this up automatically").
   ========================================================================= */

var visitCoverRecords = {}; // key: "TeacherName — Class" -> editable fields
(function loadVisitCoverRecords(){
  try {
    const raw = localStorage.getItem('visitCoverRecords');
    if(raw) Object.assign(visitCoverRecords, JSON.parse(raw));
  } catch(e){ /* malformed or unavailable — start empty */ }
})();
function saveVisitCoverRecords(){
  try { localStorage.setItem('visitCoverRecords', JSON.stringify(visitCoverRecords)); }
  catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
}

function currentVisitCoverKey(){
  return currentVisit.teacherName + ' — ' + currentVisit.className;
}

function ensureVisitCoverRecord(){
  const key = currentVisitCoverKey();
  if(!visitCoverRecords[key]){
    visitCoverRecords[key] = {
      refNo: 'AAR/SUP/2026-27/' + String(Object.keys(visitCoverRecords).length + 1).padStart(3, '0'),
      schoolName: currentVisit.schoolName, ward: currentVisit.ward, dateOfVisit: new Date().toISOString().slice(0, 10),
      shiftSession: 'Morning Shift', timeIn: '', timeOut: '',
      supervisorName: 'Mr. Kulin Maniar', helperName: '', hmName: '',
      visitType: 'Regular', checklistsApplicable: { weekly: true, monthly: false, biAnnual: false, annual: false },
      previousActionsClosed: ''
    };
  } else if(currentVisit.schoolName && !visitCoverRecords[key].schoolName){
    // Record already existed (e.g. from a prior demo-sidebar session)
    // but didn't know its real school yet — fill it in now that a real
    // school context arrived, without overwriting anything the
    // supervisor already typed.
    visitCoverRecords[key].schoolName = currentVisit.schoolName;
    visitCoverRecords[key].ward = currentVisit.ward;
  }
  return visitCoverRecords[key];
}

function updateVisitCoverField(field, value){
  const rec = ensureVisitCoverRecord();
  rec[field] = value;
  saveVisitCoverRecords();
}

function toggleVisitCoverChecklist(freq){
  const rec = ensureVisitCoverRecord();
  rec.checklistsApplicable[freq] = !rec.checklistsApplicable[freq];
  saveVisitCoverRecords();
  renderVisitCover();
}

// Looks up the most recent real HISTORY entry for this exact teacher —
// "TeacherName — Class" is already the shape both TEACHERS and HISTORY
// use elsewhere in checklist.js, so no fuzzy matching needed.
function findPreviousVisitFor(teacherKey){
  const entries = HISTORY.filter(h => h.teacher === teacherKey);
  return entries.length ? entries[0] : null; // HISTORY is already newest-first
}

function dayOfWeekFor(dateStr){
  if(!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if(isNaN(d)) return '';
  return d.toLocaleDateString([], { weekday: 'long' });
}

function renderVisitCover(){
  const container = document.getElementById('visit-cover-body');
  if(!container) return;
  const key = currentVisitCoverKey();
  const rec = ensureVisitCoverRecord();
  const prev = findPreviousVisitFor(key);

  container.innerHTML = '';
  container.appendChild(mdSec('Visit Cover — Visit Identification', '<span class="reqs">Section 1 · read by every checklist</span>'));

  const wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.style.cssText = 'padding:18px 20px;';

  const field = (label, inputHtml) => `
    <div style="min-width:180px; flex:1;">
      <label style="font-size:10.5px; font-weight:bold; color:var(--text-muted,#888); text-transform:uppercase; letter-spacing:.04em; display:block; margin-bottom:4px;">${label}</label>
      ${inputHtml}
    </div>`;
  const textInput = (field, value, placeholder) =>
    `<input type="text" value="${(value || '').replace(/"/g,'&quot;')}" placeholder="${placeholder || ''}" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;" oninput="updateVisitCoverField('${field}', this.value)" />`;

  wrap.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; gap:14px; margin-bottom:14px;">
      ${field('Visit Reference No.', textInput('refNo', rec.refNo))}
      ${field('Date of Visit', `<input type="date" value="${rec.dateOfVisit}" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;" onchange="updateVisitCoverField('dateOfVisit', this.value); renderVisitCover();" />`)}
      ${field('Day / Shift / Session', `<div style="display:flex; gap:6px;"><input type="text" value="${dayOfWeekFor(rec.dateOfVisit)}" disabled style="width:50%; padding:7px 9px; border:1px solid #ddd; border-radius:6px; font-size:13px; background:#f5f5f5; color:#666;" />${textInput('shiftSession', rec.shiftSession).replace('width:100%','width:50%')}</div>`)}
    </div>
    <div style="display:flex; flex-wrap:wrap; gap:14px; margin-bottom:14px;">
      ${field('School Name', textInput('schoolName', rec.schoolName, 'e.g. MCGM Municipal School, Andheri (E) No. 2'))}
      ${field('Ward / Area Office', textInput('ward', rec.ward, 'e.g. K-East Ward'))}
      ${field('Class Observed', `<input type="text" value="${currentVisit.className}" disabled style="width:100%; padding:7px 9px; border:1px solid #ddd; border-radius:6px; font-size:13px; background:#f5f5f5; color:#666;" title="From the currently selected visit" />`)}
    </div>
    <div style="display:flex; flex-wrap:wrap; gap:14px; margin-bottom:14px;">
      ${field('Time In', `<input type="time" value="${rec.timeIn}" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;" onchange="updateVisitCoverField('timeIn', this.value)" />`)}
      ${field('Time Out', `<input type="time" value="${rec.timeOut}" style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;" onchange="updateVisitCoverField('timeOut', this.value)" />`)}
      ${field('Visit Type', `<select style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;" onchange="updateVisitCoverField('visitType', this.value)">${['Regular','Follow-up','Surprise'].map(v => `<option value="${v}" ${rec.visitType===v?'selected':''}>${v}</option>`).join('')}</select>`)}
    </div>
    <div style="display:flex; flex-wrap:wrap; gap:14px; margin-bottom:14px;">
      ${field('Supervisor / Coordinator Name', textInput('supervisorName', rec.supervisorName))}
      ${field('Teacher Name', `<input type="text" value="${currentVisit.teacherName}" disabled style="width:100%; padding:7px 9px; border:1px solid #ddd; border-radius:6px; font-size:13px; background:#f5f5f5; color:#666;" title="From the currently selected visit" />`)}
      ${field('Helper Name', textInput('helperName', rec.helperName))}
      ${field('HM / Principal Name', textInput('hmName', rec.hmName))}
    </div>
    <div style="margin-bottom:14px;">
      <label style="font-size:10.5px; font-weight:bold; color:var(--text-muted,#888); text-transform:uppercase; letter-spacing:.04em; display:block; margin-bottom:6px;">Checklists Applicable This Visit</label>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${[['weekly','Weekly'],['monthly','Monthly'],['biAnnual','Bi-Annual'],['annual','Annual']].map(([k,label]) =>
          `<button onclick="toggleVisitCoverChecklist('${k}')" style="width:auto; height:auto; white-space:nowrap; padding:7px 16px; border-radius:6px; font-size:13px; cursor:pointer; ${rec.checklistsApplicable[k] ? 'background:#0ca30c; color:#fff; border:none;' : 'background:#fff; border:1px solid #ccc; color:var(--text-muted,#666);'}">${label}</button>`
        ).join('')}
      </div>
    </div>
    <div style="display:flex; flex-wrap:wrap; gap:14px; padding-top:12px; border-top:1px solid #eee;">
      ${field('Previous Visit Date', `<input type="text" value="${prev ? prev.date : 'No previous visit on record'}" disabled style="width:100%; padding:7px 9px; border:1px solid #ddd; border-radius:6px; font-size:13px; background:#f5f5f5; color:#666;" title="Auto-filled from Visit History for this teacher" />`)}
      ${field('Previous Visit Overall Score', `<input type="text" value="${prev ? prev.score + '%' : '—'}" disabled style="width:100%; padding:7px 9px; border:1px solid #ddd; border-radius:6px; font-size:13px; background:#f5f5f5; color:#666;" title="Auto-filled from Visit History for this teacher" />`)}
      ${field('Previous Action Points Closed?', `<select style="width:100%; padding:7px 9px; border:1px solid #ccc; border-radius:6px; font-size:13px;" onchange="updateVisitCoverField('previousActionsClosed', this.value)"><option value="" ${rec.previousActionsClosed===''?'selected':''}>—</option><option value="Y" ${rec.previousActionsClosed==='Y'?'selected':''}>Y</option><option value="N" ${rec.previousActionsClosed==='N'?'selected':''}>N</option></select>`)}
    </div>
  `;
  container.appendChild(wrap);
  container.appendChild(renderComplianceFrequencyMaster());
}

// SECTION 2 of the compliance sheet — "which checklist is used when."
// Transcribed exactly: 9 rows, real Frequency/Who Completes/Deadline/
// Escalates To. None of the other 8 checklists are part of this
// dashboard build (Weekly and its companions were removed; Monthly/
// Bi-Annual/Annual were never built) — every row here is honestly
// informational only, not a link to something that doesn't exist.
var COMPLIANCE_FREQUENCY_MASTER = [
  { name: '1. Weekly Compliance', freq: 'Every school visit / at least once a week per school', who: 'Supervisor / Coordinator', deadline: 'Same day — soft copy uploaded by 6:00 PM', escalates: 'Programme Head', target: null },
  { name: '2. Monthly Compliance', freq: 'Once a month (with the PTM cycle)', who: 'Supervisor + Teacher', deadline: 'By 5th of the following month', escalates: 'Programme Head / Principal', target: null },
  { name: '3. Bi-Annual Compliance', freq: 'Twice a year — end of Semester 1 (Oct) & Semester 2 (Apr)', who: 'Supervisor + Programme Head', deadline: 'Within 10 days of semester close', escalates: 'Foundation Management', target: null },
  { name: '4. Annual Compliance', freq: 'Once a year — April/May, before the new academic year', who: 'Programme Head + Foundation Management', deadline: 'By 31st May', escalates: 'Trustees / MCGM Area Office', target: null },
  { name: '5. Attendance Verification', freq: 'Every visit (physical head count)', who: 'Supervisor', deadline: 'Same day', escalates: 'Principal / Area Office', target: null },
  { name: '6. Parent Feedback', freq: 'Every visit — minimum 5 parents', who: 'Supervisor', deadline: 'Same day', escalates: 'Programme Head', target: null },
  { name: '7. HM / Principal Discussion', freq: 'At least once a fortnight', who: 'Supervisor', deadline: 'Fortnightly record', escalates: 'Area Office', target: null },
  { name: '8. Action Plan & Escalation', freq: 'Every visit — closed before the next visit', who: 'Supervisor + Teacher + HM', deadline: 'Same day; review at next visit', escalates: 'As per escalation level', target: null },
  { name: '9. Score Summary', freq: 'Auto-calculated every visit', who: 'System (formula-driven)', deadline: 'Same day', escalates: 'Follow-up visit if score < 2.5', target: null }
];

function scrollToComplianceSection(targetId){
  const el = document.getElementById(targetId);
  if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderComplianceFrequencyMaster(){
  let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Sheet / Checklist</th><th>Frequency</th><th>Who Completes</th><th>Submission Deadline</th><th>Escalates To</th></tr></thead><tbody>';
  COMPLIANCE_FREQUENCY_MASTER.forEach(row => {
    table += `<tr>
      <td><b>${esc(row.name)}</b></td>
      <td>${esc(row.freq)}</td>
      <td>${esc(row.who)}</td>
      <td>${esc(row.deadline)}</td>
      <td>${esc(row.escalates)}</td>
    </tr>`;
  });
  table += '</tbody></table></div>';
  const wrap = document.createElement('div'); wrap.innerHTML = table;
  const section = document.createElement('div');
  section.appendChild(mdSec('Compliance Frequency Master', '<span class="reqs">Section 2 · which checklist is used when</span>'));
  section.appendChild(mdCard(null, 'Reference only — none of these 9 checklists are built into this dashboard yet, including Weekly, which was removed along with Visit Checklist.', wrap));
  return section;
}