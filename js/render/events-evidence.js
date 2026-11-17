/* =========================================================================
   js/render/events-evidence.js — School Events / PTM agenda extras, and
   per-session activity photo evidence uploads. Two smaller, related
   features combined into one file rather than two tiny ones. Extracted
   from teacher.js's old SECTIONS 5 and 6.

   Same cross-file-sharing rule as every other split file: classic
   <script>, so top-level `function` is global automatically, but
   top-level `let`/`const` isn't shared across <script> tags.
   ========================================================================= */

/* ===================== SCHOOL EVENTS / PTM AGENDA EXTRAS ===================== */

function renderSchoolEvents(){
  initEventsCalendar('events-body', 'backend/get_events.php' + window.location.search);
}

// ---------------------------------------------------------------
// PTM AGENDA EXTRAS — household-by-household log and the full
// 11-meeting year plan. Rendered into their own container
// (ptm-extras-body), separate from ptm-view.js's real backend-driven
// Agenda/scheduling view — this app doesn't have a real backend
// table for the year plan yet, so it's sample-seeded and locally
// persisted, same convention as the rest of this file's not-yet-
// backed features.
// ---------------------------------------------------------------
const PTM_YEAR_PLAN = [
  { month: 'June 2026', theme: 'Settling in and the year ahead', objectives: 'Introduce the programme and the daily routine · Collect and confirm household details · Explain the baseline assessment · Agree how the school will contact each household' },
  { month: 'July 2026', theme: 'Attendance and the rainy season', objectives: 'Attendance so far and why it matters at this age · Monsoon health and safety · Home activity — the first sheet · Questions from parents' },
  { month: 'August 2026', theme: 'How your child is learning', objectives: 'Child progress this term · Explaining Beginner, Proficient and Advanced · Independence Day preparation · Home learning support' },
  { month: 'September 2026', theme: 'Festivals and participation', objectives: 'Ganesh festival participation · Behavioural observations · Parent committee formation · Attendance review' },
  { month: 'October 2026', theme: 'Mid-year review', objectives: 'First-term assessment review · HPC explained · Children needing extra support · Diwali break and continuity at home' },
  { month: 'November 2026', theme: 'Health, nutrition and growth', objectives: 'Growth and nutrition · Children\u2019s Day showcase · Attendance review · Home learning support' },
  { month: 'December 2026', theme: 'Language at home', objectives: 'Language development in two languages · Reading at home without books · Assessment review · Winter activities' },
  { month: 'January 2027', theme: 'Numbers everywhere', objectives: 'Early numeracy at home · Attendance review · Republic Day participation · Portfolio and worksheets' },
  { month: 'February 2027', theme: 'Getting ready for the next step', objectives: 'School readiness indicators · Annual day preparation · Sr KG \u2192 Grade 1 admission process · Intervention plans' },
  { month: 'March 2027', theme: 'Term three and the transition', objectives: 'Third-term assessment review · Transition to Sr KG or Grade 1 · Parent showcase · Summer continuity' },
  { month: 'April 2027', theme: 'The year in review', objectives: 'Holistic Progress Card handover · Graduation and farewell · Feedback from parents on the year · Next year \u2014 dates and expectations' }
];

const ptmAgendaState = {}; // persisted: {yearPlanExtras:{monthLabel:[items]}}
(function loadPtmAgendaState(){
  try {
    const raw = localStorage.getItem('ptmAgendaState');
    if(raw) Object.assign(ptmAgendaState, JSON.parse(raw));
  } catch(e){ /* malformed or unavailable — start empty */ }
})();
function savePtmAgendaState(){
  try { localStorage.setItem('ptmAgendaState', JSON.stringify(ptmAgendaState)); }
  catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
}
function addPtmYearPlanItem(monthLabel){
  const input = document.getElementById('ptmYearPlanInput');
  const text = (input.value || '').trim();
  if(!text) return;
  if(!ptmAgendaState.yearPlanExtras) ptmAgendaState.yearPlanExtras = {};
  if(!ptmAgendaState.yearPlanExtras[monthLabel]) ptmAgendaState.yearPlanExtras[monthLabel] = [];
  ptmAgendaState.yearPlanExtras[monthLabel].push(text);
  savePtmAgendaState();
  renderPTMExtras(document.getElementById('ptm-extras-body'));
}

function renderPTMExtras(container){
  if(!container) return;
  container.innerHTML = '';
  if(!ensurePupilsLoadedFor(container, () => renderPTMExtras(container))) return;
  try {
    const realStudentNames = realPupilsCache.map(p => p.name);
    // Note: the meeting Agenda (objectives + prep checklists) is NOT
    // duplicated here — ptm-view.js already renders a real one, tied
    // to actual scheduled meetings via the backend. Building a second,
    // sample-data version here would just confuse which one is real.
    // This container only adds what doesn't already exist elsewhere:
    // the household-by-household log and the full year plan.

    // --- Household by household ---
    container.appendChild(mdSec('Household by household', '<span class="reqs">PTM-05 · PTM-08…10</span>'));
    const hhNote = document.createElement('p');
    hhNote.className = 'cap'; hhNote.style.margin = '4px 0 16px';
    hhNote.innerHTML = '<b>Who came, who was spoken to, and what was agreed</b><br>PTM-08 · a household that has not attended for three consecutive months is what PTC-09 escalates, not a low overall attendance figure.';
    container.appendChild(hhNote);

    let hhTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th><th>Household</th><th>Attended</th><th>Feedback recorded</th><th>Actions</th><th>Language</th></tr></thead><tbody>';
    realStudentNames.forEach(name => {
      const eng = getFamilyEngagement(name);
      const hh = sampleHousehold(name);
      const primaryGuardian = hh.guardianNames.find(g => g.primary) || hh.guardianNames[0];
      hhTable += `<tr style="cursor:pointer;" onclick="switchSidebarSection('familyparents', '${esc(name)}')">
        <td><b>${esc(name)}</b></td>
        <td class="dim">${esc(primaryGuardian.name)}</td>
        <td>${eng.ptm.attended ? mdPill('Attended', 'good') : mdPill('—', 'neu')}</td>
        <td>${eng.ptm.feedback ? mdPill('Recorded', 'good') : mdPill('—', 'neu')}</td>
        <td>${eng.ptm.actionsAgreed.length || '—'}</td>
        <td>${esc(hh.motherTongue)}</td>
      </tr>`;
    });
    hhTable += '</tbody></table></div>';
    const hhWrap = document.createElement('div'); hhWrap.innerHTML = hhTable;
    container.appendChild(mdCard(null, 'Tap a row to open that household\'s full Parent-teacher meeting record in Family & Parents.', hhWrap));

    // --- The PTM year plan ---
    container.appendChild(mdSec('The PTM year plan', '<span class="reqs">PTM-13…20</span>'));
    const yearPlanNote = document.createElement('p');
    yearPlanNote.className = 'cap'; yearPlanNote.style.margin = '4px 0 16px';
    yearPlanNote.innerHTML = '<b>All eleven meetings, planned before the year starts</b><br>PTM-13 · the agenda for every month is set at the start of the year against the programme cycle, not invented on the 20th. A teacher may add an item for her own class; she cannot remove the standing objectives, because those are what make the eleven meetings a sequence rather than eleven separate events.';
    container.appendChild(yearPlanNote);

    let ypTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Month</th><th>Theme</th><th>Standing objectives</th></tr></thead><tbody>';
    PTM_YEAR_PLAN.forEach(row => {
      const extras = (ptmAgendaState.yearPlanExtras && ptmAgendaState.yearPlanExtras[row.month]) || [];
      const extraText = extras.length ? ' · <b>' + extras.map(esc).join(' · ') + '</b>' : '';
      ypTable += `<tr><td><b>${esc(row.month)}</b></td><td>${esc(row.theme)}</td><td>${esc(row.objectives)}${extraText}</td></tr>`;
    });
    ypTable += '</tbody></table></div>';
    const ypWrap = document.createElement('div'); ypWrap.innerHTML = ypTable;
    container.appendChild(mdCard(null, null, ypWrap));

    const currentMonthLabel = new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
    const addItemCard = document.createElement('div');
    addItemCard.className = 'card'; addItemCard.style.padding = '22px'; addItemCard.style.marginTop = '16px';
    addItemCard.innerHTML = `<h4 style="margin:0 0 4px;">Add an item for my class this month</h4>
      <p class="cap" style="margin:0 0 14px;">Added to ${esc(currentMonthLabel)} — this adds to the standing objectives above, it doesn't replace them.</p>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <input id="ptmYearPlanInput" type="text" placeholder="e.g. Three households asked about the Grade 1 admission dates" style="flex:1; min-width:260px; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px;" />
        <button onclick="addPtmYearPlanItem('${esc(currentMonthLabel)}')" style="padding:9px 18px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Add to the agenda</button>
      </div>`;
    container.appendChild(addItemCard);
  } catch(err){
    const errorBox = document.createElement('div');
    errorBox.className = 'card';
    errorBox.style.cssText = 'border-color:#c8433f; background:#fdeaea;';
    errorBox.innerHTML = `<div class="hd"><div><h3 style="color:#c8433f;">PTM agenda hit an error</h3><p class="cap">${esc(err.message)}</p></div></div>`;
    container.appendChild(errorBox);
  }
}

// Uses backend/get_my_class.php for a REAL school_id/class_id — unlike
// the My Day filter bar (deliberately left as placeholder text, see
// that section's comment), the PTM view genuinely needs to know which
// school/class it's asking about, since the data actually lives in
// the database now (ptm_meetings etc.). Falls back to a clear message
// rather than guessing if the teacher isn't linked to a class yet.
async function renderTeacherPTM(){
  const tabBarContainer = document.getElementById('ptm-tabbar-body');
  tabBarContainer.innerHTML = '';
  tabBarContainer.appendChild(renderParentsTabBar('ptm'));

  const container = document.getElementById('ptm-body');
  container.innerHTML = '<p class="sub">Loading…</p>';
  try{
    const res = await fetch('backend/schools/get_my_class.php' + window.location.search);
    const data = await res.json();
    if(data.status !== 'success' || !data.classes || !data.classes.length){
      container.innerHTML = '<p class="sub">Your account isn\'t linked to a class yet — ask your admin to link it.</p>';
    } else {
      // the class she is working in (class switch), else her first
      const myClass = data.classes.find(c => String(c.class_id) === String(data.active_class_id)) || data.classes[0];
      renderPTMView('ptm-body', {
        schoolId: myClass.school_id,
        classId: myClass.class_id,
        role: 'teacher',
        canSchedule: true,
        showScheduleForm: true,
        canToggleTeacherPrep: true,
        canToggleSupervisorPrep: false,
        querySuffix: window.location.search
      });
    }
  } catch(err){
    container.innerHTML = '<p class="sub">Could not reach the server.</p>';
  }

  // The household-by-household log and year plan below are rendered
  // into a SEPARATE container (ptm-extras-body), not appended inside
  // ptm-body — ptm-view.js owns ptm-body and re-renders it on its own
  // (e.g. clicking a day on the calendar), which was wiping out
  // anything appended there. This container is untouched by that.
  renderPTMExtras(document.getElementById('ptm-extras-body'));
}

/* ===================== ACTIVITY PHOTO UPLOAD ===================== */
// Lives directly on each Weekly Activities session card now — no more
// separate "Upload Activity Photo" sidebar page. Selecting a file
// uploads immediately (no separate submit step), tagged with exactly
// which domain/day/week it belongs to, so a photo is always tied to
// a specific session rather than just "today, some activity."

// What's actually been uploaded, per session. The photo itself is in
// the teacher's Google Drive; its label (Drive link, file id, name) is
// in the DATABASE (session_evidence table), so it shows on every device
// and survives a cleared browser. This browser keeps a copy for offline.
const uploadedEvidenceRecords = {}; // key (week-day-domain) -> [{id, name, size, type, uploadedAt, driveLink, driveFileId}]
(function loadUploadedEvidenceRecords(){
  try {
    const raw = localStorage.getItem('uploadedEvidenceRecords');
    if(raw) Object.assign(uploadedEvidenceRecords, JSON.parse(raw));
  } catch(e){ /* malformed or unavailable — start empty */ }
  if(typeof classRecordsWhenClassKnown === 'function') classRecordsWhenClassKnown(syncSessionEvidenceWithServer);
})();

// Reads every activity-photo label for this class from the database.
// Any label that was only in this browser (uploads from before this
// fix, or made while offline) is sent up first — the one-time move —
// so nothing already uploaded is lost. Then the database list is shown.
async function syncSessionEvidenceWithServer(classId){
  const q = window.location.search ? '&' + window.location.search.slice(1) : '';
  let server;
  try {
    const res = await fetch('backend/daily_plan/get_all_session_evidence.php?class_id=' + encodeURIComponent(classId) + q);
    const data = await res.json();
    if(data.status !== 'success') throw new Error(data.message || 'Could not load photos.');
    server = data.evidence || {};
  } catch(e){ console.warn('Activity photos: using this browser\u2019s copy for now —', e.message || e); return; }

  const onServer = new Set();
  Object.values(server).forEach(list => list.forEach(ev => { if(ev.driveFileId) onServer.add(ev.driveFileId); }));
  // Labels only in this browser go up ONCE (the first time this browser
  // syncs), plus any upload that couldn't be saved while offline. After
  // that, a label missing from the database means it was removed on
  // another device — so it is dropped here too, not sent back.
  let firstMove = true;
  try { firstMove = localStorage.getItem('evidenceMovedToServer:' + classId) !== 'yes'; } catch(e){}
  for(const [key, list] of Object.entries(uploadedEvidenceRecords)){
    const parts = key.split('-');
    const week = parseInt(parts[0], 10), day = parts[1], domain = parts.slice(2).join('-');
    for(const ev of (list || [])){
      if(!ev.driveFileId){ (server[key] = server[key] || []).push(ev); continue; } // no Drive file — can't be moved, keep it shown
      if(onServer.has(ev.driveFileId)) continue;
      if(!firstMove && !ev.pendingSave) continue; // removed on another device
      try {
        const res = await fetch('backend/daily_plan/save_session_evidence.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ class_id: classId, week_number: week, day, domain_key: domain, file_name: ev.name, file_size: ev.size || 0,
            file_type: ev.type || '', drive_file_id: ev.driveFileId, drive_link: ev.driveLink })
        });
        const data = await res.json();
        if(data.status === 'success'){ onServer.add(ev.driveFileId); const moved = Object.assign({}, ev, { id: data.evidence && data.evidence.id }); delete moved.pendingSave; (server[key] = server[key] || []).push(moved); }
        else (server[key] = server[key] || []).push(Object.assign({}, ev, { pendingSave: true })); // keep it; tried again next time
      } catch(e){ (server[key] = server[key] || []).push(Object.assign({}, ev, { pendingSave: true })); }
    }
  }
  try { localStorage.setItem('evidenceMovedToServer:' + classId, 'yes'); } catch(e){}
  Object.keys(uploadedEvidenceRecords).forEach(k => { delete uploadedEvidenceRecords[k]; });
  Object.assign(uploadedEvidenceRecords, server);
  saveUploadedEvidenceRecords();
  if(typeof renderMyDay === 'function' && document.getElementById('myday-body') && !document.getElementById('myday-body').classList.contains('hidden')) renderMyDay();
}
function saveUploadedEvidenceRecords(){
  try { localStorage.setItem('uploadedEvidenceRecords', JSON.stringify(uploadedEvidenceRecords)); }
  catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
}
function evidenceKey(week, dayKey, domainKey){ return week + '-' + dayKey + '-' + domainKey; }

// Removes one piece of evidence — deletes the real file from Drive
// (not just the local reference), so removing something in the app
// actually cleans up the teacher's Drive too, rather than leaving an
// orphaned file behind forever.
async function removeSessionEvidence(evKey, index){
  const list = uploadedEvidenceRecords[evKey];
  if(!list || !list[index]) return;
  const ev = list[index];
  if(!confirm(`Remove "${ev.name}"? This deletes the actual file from Google Drive, not just the reference here.`)) return;

  if(ev.driveFileId){
    try{
      const res = await fetch('backend/drive/delete_from_drive.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ file_id: ev.driveFileId })
      });
      let data = {};
      try { data = await res.json(); } catch(e){ data = { message: 'The server gave an unexpected reply (' + res.status + ').' }; }
      if(data.status !== 'success'){
        // Most often the file was already deleted (or moved out of reach) in
        // Google Drive itself. Then only the tile here is left — let the
        // teacher remove it rather than leaving it stuck for ever.
        const why = data.message || 'Google Drive could not delete it.';
        if(!confirm('Google Drive didn\u2019t delete \u201c' + ev.name + '\u201d: ' + why
          + '\n\nIf you already deleted it in Google Drive, that\u2019s why.\n\nRemove it from the portal anyway?')) return;
      }
    } catch(err){
      if(!confirm('Couldn\u2019t reach the server to delete \u201c' + ev.name + '\u201d from Google Drive.\n\nRemove it from the portal anyway? (The file may still be in Drive.)')) return;
    }
  }

  // …and its label in the database, so it doesn't come back on another device.
  // daily-plan-sync.js labels the database number 'evidenceId'; this file uses 'id'.
  const evidenceDbId = ev.id || ev.evidenceId;
  if(evidenceDbId){
    try {
      await fetch('backend/daily_plan/delete_session_evidence.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ evidence_id: evidenceDbId })
      });
    } catch(err){ /* the Drive file is already gone; the label is cleaned up next time */ }
  }

  list.splice(index, 1);
  saveUploadedEvidenceRecords();
  if(typeof renderMyDay === 'function' && document.getElementById('myday-body') && !document.getElementById('myday-body').classList.contains('hidden')){
    renderMyDay();
  }
}

async function uploadSessionActivityPhoto(domainKey, dayKey, inputEl){
  const statusEl = document.getElementById('sessionPhotoStatus-' + domainKey + '-' + dayKey);
  if(!inputEl.files.length) return;

  // Uploads straight to the teacher's own connected Google Drive now
  // — replaces the old local-server storage entirely, and the old
  // manual "open Drive, paste link back" workaround this was
  // standing in for. If Drive isn't connected yet, the endpoint
  // says so explicitly rather than failing silently.
  //
  // Drive folder: Aarambh LMS / Weekly Activities / <the plan's date> /
  // <NN · Activity (Domain)> — ONE FOLDER PER ACTIVITY, numbered in the
  // order of the day, so two activities of the same domain (e.g. Story /
  // Rhyme and Language) never share a folder. The date is the day the
  // plan is for (from the week + day shown), not the day of uploading,
  // so a photo added later still lands under the right day.
  const domainName = DOMAIN_CATEGORY[domainKey] || domainKey;
  const list = (typeof DOMAINS !== 'undefined' && Array.isArray(DOMAINS)) ? DOMAINS : [];
  const pos = list.findIndex(x => x.key === domainKey);
  const activity = pos >= 0 ? (list[pos].label || domainKey) : domainKey;
  const safe = t => String(t).replace(/[\\/:*?"<>|]+/g, ' - ').replace(/\s+/g, ' ').trim();
  const activityFolder = (pos >= 0 ? String(pos + 1).padStart(2, '0') + ' · ' : '') + safe(activity) + (domainName && domainName !== activity ? ' (' + safe(domainName) + ')' : '');
  let planDate = null;
  try { planDate = typeof getRealDateForWeekDay === 'function' ? getRealDateForWeekDay(currentWeekNum, dayKey) : null; } catch(e){ planDate = null; }
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const dateFolder = (planDate && typeof planDate.getFullYear === 'function' && !isNaN(planDate.getTime())) ? ymd(planDate) : todayKey(); // no date known → today, as before
  const formData = new FormData();
  formData.append('file', inputEl.files[0]);
  formData.append('folder_path', 'Weekly Activities/' + dateFolder + '/' + activityFolder);

  if(statusEl) statusEl.textContent = 'Uploading to Google Drive…';

  const file = inputEl.files[0];
  try{
    const res = await fetch('backend/drive/upload_to_drive.php' + window.location.search, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if(statusEl){
      statusEl.textContent = data.status === 'success' ? '✓ Uploaded to Drive' : (data.message || 'Upload failed');
      statusEl.style.color = data.status === 'success' ? 'var(--good, #0ca30c)' : 'var(--danger, #c8433f)';
    }
    if(data.status === 'success'){
      const key = evidenceKey(currentWeekNum, dayKey, domainKey);
      if(!uploadedEvidenceRecords[key]) uploadedEvidenceRecords[key] = [];
      const record = {
        name: file.name, size: file.size, type: file.type, uploadedAt: todayDateKey(),
        driveLink: data.link, driveFileId: data.file_id
      };
      uploadedEvidenceRecords[key].push(record);
      saveUploadedEvidenceRecords();
      // Save the label in the database so it shows on every device.
      try{
        const saveRes = await fetch('backend/daily_plan/save_session_evidence.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            class_id: myClassInfo.class_id,
            week_number: currentWeekNum,
            day: dayKey,
            domain_key: domainKey,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            drive_file_id: data.file_id,
            drive_link: data.link
          })
        });
        const saved = await saveRes.json();
        if(saved.status === 'success' && saved.evidence && saved.evidence.id){ record.id = saved.evidence.id; }
        else { record.pendingSave = true; }
        saveUploadedEvidenceRecords();
      } catch(err){ record.pendingSave = true; saveUploadedEvidenceRecords(); /* offline — sent up the next time the portal opens */ }
      if(typeof renderMyDay === 'function' && document.getElementById('myday-body') && !document.getElementById('myday-body').classList.contains('hidden')){
        renderMyDay();
        return;
      }
      if(typeof renderMyDay === 'function' && document.getElementById('myday-body') && !document.getElementById('myday-body').classList.contains('hidden')){
        renderMyDay();
        return; // renderMyDay rebuilds this status element fresh — nothing left to update on the old one
      }
    } else if(data.message && data.message.indexOf('isn\'t connected') !== -1 && statusEl){
      statusEl.innerHTML = 'Google Drive isn\'t connected yet — <a href="backend/google_oauth_start.php' + window.location.search + '" target="_blank" style="color:inherit; text-decoration:underline;">connect it</a>, then try again.';
    }
  } catch(err){
    if(statusEl){
      statusEl.textContent = 'Could not reach the server.';
      statusEl.style.color = 'var(--danger, #c8433f)';
    }
  }
    inputEl.value = ''; // allow uploading another photo to the same session afterward
}


