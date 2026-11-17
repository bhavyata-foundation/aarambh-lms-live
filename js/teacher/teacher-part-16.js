function toggleMonthlyEffectiveSignature(role){
    const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
    // Defensive guards, in addition to the disabled buttons — each
    // step can only be marked once the one before it is actually done,
    // matching the strict 4-step order (Steps 1-4). Undoing an earlier
    // step also undoes everything that came after it, since a later
    // step's date being "after" an earlier one no longer means
    // anything once the earlier one is retracted.
    if(role === 'principal' && !rec.signatures.principal){
      const approval = effectiveApprovalCache[monthlyEffectiveKey(calendarYear, calendarMonth)];
      if(!approval || typeof approval !== 'object' || approval.approval_status !== 'approved'){
        alert('Principal sign-off is locked until the foundation approves this month\'s attendance (Step 1).');
        return;
      }
    }
    if(role === 'ao' && !rec.signatures.ao && !rec.signatures.principal){
      alert('AO sign is locked until the Principal has signed (Step 2).');
      return;
    }
    if(rec.signatures[role]){
      rec.signatures[role] = null;
      if(role === 'principal'){
        // Retracting Principal also retracts everything downstream —
        // AO sign and submission no longer have a valid "after Step 2"
        // date to point back to.
        rec.signatures.ao = null;
        rec.submittedToFoundation = null;
      }
      if(role === 'ao'){
        rec.submittedToFoundation = null;
      }
      // Undoing a signature also undoes disbursement — the sign-off
      // it depended on no longer fully exists.
      rec.salaryDisbursed = false;
    } else {
      rec.signatures[role] = { date: todayDateKey() };
    }
    saveMonthlyEffectiveRecords();
    renderMonthlyEffective();
  }
  function toggleSubmittedToFoundation(){
    const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
    // Defensive guard — Step 4 can only be marked once Step 3 (AO) is done.
    if(!rec.submittedToFoundation && !rec.signatures.ao){
      alert('Submission to the foundation office is locked until the AO has signed (Step 3).');
      return;
    }
    if(rec.submittedToFoundation){
      rec.submittedToFoundation = null;
      rec.salaryDisbursed = false;
    } else {
      rec.submittedToFoundation = { date: todayDateKey() };
    }
    saveMonthlyEffectiveRecords();
    renderMonthlyEffective();
  }
  // Attaches a photo of the physical signature to Step 2 (Principal)
  // or Step 3 (AO) — only meaningful once that step is actually marked
  // done, since there's nothing to photograph before then. Stored the
  // same way the full sheet scan already is (base64 in localStorage) —
  // consistent with the existing pattern, not a new storage mechanism.
  function attachSignaturePhoto(role, inputEl){
    const file = inputEl.files && inputEl.files[0];
    if(!file) return;
    const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
    if(!rec.signatures[role]) return; // shouldn't happen — control only shown once signed
    const reader = new FileReader();
    reader.onload = (e) => {
      rec.signatures[role].photoDataUrl = e.target.result;
      rec.signatures[role].photoFileName = file.name;
      saveMonthlyEffectiveRecords();
      renderMonthlyEffective();
    };
    reader.readAsDataURL(file);
  }
  async function handleMonthlyEffectiveRegisterPhoto(inputEl){
    const file = inputEl.files && inputEl.files[0];
    if(!file) return;
    const statusEl = document.getElementById('effRegisterStatus');
    if(statusEl) statusEl.textContent = 'Compressing…';
    const compressedFile = renameFileTo(await compressImageFile(file), 'Attendance Register');
    if(statusEl) statusEl.textContent = 'Uploading to Google Drive…';
    const monthFolder = new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('folder_path', 'Monthly Effective/' + monthFolder);
    try{
      const res = await fetch('backend/drive/upload_to_drive.php' + window.location.search, { method: 'POST', body: formData });
      const data = await res.json();
      if(data.status === 'success'){
        const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
        rec.registerDriveLink = data.link;
        rec.registerDriveFileId = data.file_id;
        rec.registerFileName = compressedFile.name;
        saveMonthlyEffectiveRecords();
        renderMonthlyEffective();
      } else if(statusEl){
        statusEl.textContent = data.message || 'Upload failed.';
        statusEl.style.color = 'var(--danger, #c8433f)';
      }
    } catch(err){
      if(statusEl){ statusEl.textContent = 'Could not reach the server.'; statusEl.style.color = 'var(--danger, #c8433f)'; }
    }
  }
  async function removeMonthlyEffectiveRegisterPhoto(){
    const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
    if(!confirm('Remove this photo? This deletes the actual file from Google Drive, not just the reference here.')) return;
    if(rec.registerDriveFileId){
      try{
        const res = await fetch('backend/drive/delete_from_drive.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ file_id: rec.registerDriveFileId })
        });
        const data = await res.json();
        if(data.status !== 'success'){ alert(data.message || 'Could not delete the file from Drive.'); return; }
      } catch(err){ alert('Could not reach the server.'); return; }
    }
    rec.registerDriveLink = null;
    rec.registerDriveFileId = null;
    rec.registerFileName = null;
    saveMonthlyEffectiveRecords();
    renderMonthlyEffective();
  }
  async function handleMonthlyEffectiveScan(inputEl){
    const file = inputEl.files && inputEl.files[0];
    if(!file) return;
    const statusEl = document.getElementById('effScanStatus');
    if(statusEl) statusEl.textContent = 'Uploading to Google Drive…';
    const monthFolder = new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder_path', 'Monthly Effective/' + monthFolder);
    try{
      const res = await fetch('backend/drive/upload_to_drive.php' + window.location.search, { method: 'POST', body: formData });
      const data = await res.json();
      if(data.status === 'success'){
        const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
        rec.scanDriveLink = data.link;
        rec.scanDriveFileId = data.file_id;
        rec.scanFileName = file.name;
        saveMonthlyEffectiveRecords();
        renderMonthlyEffective();
      } else if(statusEl){
        statusEl.textContent = data.message || 'Upload failed.';
        statusEl.style.color = 'var(--danger, #c8433f)';
      }
    } catch(err){
      if(statusEl){ statusEl.textContent = 'Could not reach the server.'; statusEl.style.color = 'var(--danger, #c8433f)'; }
    }
  }
  async function removeMonthlyEffectiveScan(){
    const rec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
    if(!confirm('Remove this scan? This deletes the actual file from Google Drive, not just the reference here.')) return;
    if(rec.scanDriveFileId){
      try{
        const res = await fetch('backend/drive/delete_from_drive.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ file_id: rec.scanDriveFileId })
        });
        const data = await res.json();
        if(data.status !== 'success'){ alert(data.message || 'Could not delete the file from Drive.'); return; }
      } catch(err){ alert('Could not reach the server.'); return; }
    }
    rec.scanDriveLink = null;
    rec.scanDriveFileId = null;
    rec.scanFileName = null;
    saveMonthlyEffectiveRecords();
    renderMonthlyEffective();
  }
  // ---------- 9. MONTHLY ASSESSMENT ----------
  // Matches vClassAssess EXACTLY as screenshotted: Child / Att% / 10
  // domain columns (HEAL PHYS SENS ENVI EMOT PART LOGI MATH LANG ARTS)
  // / Rec (x of 10 recorded) / Moved (verdict pill). A blank cell means
  // "not observed this month" — shown as a dim dot, never as Beginner.
  var monthlyAssessmentEntries = {}; // studentName -> {domainKey: 'E'|'P'|'A'|null}
  // Persist REAL entries only (typed, imported) — not the representative
  // sample-seeded cells renderMonthlyAssessment fills gaps with. Same
  // reasoning as dailyPlanEntries/attendanceRecords above: without this,
  // nothing typed or imported here survives a reload, so an Excel import
  // would be pointless. Seeded placeholder values are deliberately never
  // written back, so localStorage only ever holds what someone actually
  // recorded.
  (function loadMonthlyAssessmentEntries(){
    try {
      const raw = localStorage.getItem('monthlyAssessmentEntries');
      if(raw) Object.assign(monthlyAssessmentEntries, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
  })();
  function saveMonthlyAssessmentEntries(){
    try { localStorage.setItem('monthlyAssessmentEntries', JSON.stringify(monthlyAssessmentEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }
  // ---------------------------------------------------------------
  // WEEKLY ASSESSMENT and CLASSROOM OBSERVATION — two more assessment
  // types alongside Monthly Assessment, each genuinely separate data
  // (not the same numbers relabeled). Weekly is additionally scoped
  // by week — weeklyAssessmentEntries[weekNum][studentName][domainKey]
  // — reusing the same currentWeekNum the rest of this app already
  // shares, so switching "Week" anywhere is consistent everywhere.
  // Classroom Observation has the same flat shape as Monthly (no time
  // scoping) since it's a running log, not a periodic return.
  // ---------------------------------------------------------------
  const weeklyAssessmentEntries = {}; // weekNum -> studentName -> {activityIndexAsString: 'E'|'P'|'A'}
  const classroomObservationEntries = {}; // studentName -> {domainKey: tier|null}
  (function loadWeeklyAndObservationEntries(){
    try {
      const rawW = localStorage.getItem('weeklyAssessmentEntries');
      if(rawW) Object.assign(weeklyAssessmentEntries, JSON.parse(rawW));
    } catch(e){ /* malformed or unavailable — start empty */ }
    try {
      const rawO = localStorage.getItem('classroomObservationEntries');
      if(rawO) Object.assign(classroomObservationEntries, JSON.parse(rawO));
    } catch(e){ /* malformed or unavailable — start empty */ }
  })();
  function saveWeeklyAssessmentEntries(){
    try { localStorage.setItem('weeklyAssessmentEntries', JSON.stringify(weeklyAssessmentEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }
  function saveClassroomObservationEntries(){
    try { localStorage.setItem('classroomObservationEntries', JSON.stringify(classroomObservationEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }
  // ---------------------------------------------------------------
  // WORKBOOK ASSESSMENT — a genuinely different instrument from the
  // three above: real, server-backed evidence (workbooks table + master
  // workbook_pages content list, seeded once from the actual Khelika/
  // Vaani/Sopanika/Uvach books) rather than a client-side domain grid.
  // Not localStorage — this is real DB from the start, same as pupils
  // and attendance, since it's new rather than a migration.
  //
  // Book set genuinely differs by class level (Jr KG: Khelika+Vaani.
  // Sr KG: Khelika+Sopanika+Uvach Phonics+Uvach Alphabets), and pages
  // accumulate month over month rather than resetting weekly — both
  // scoped server-side, not assumed client-side.
  //
  // KNOWN LIMITATION: myClassInfo only tracks one active class (same
  // constraint the rest of this app already has — see loadMyClassInfo's
  // own comment: "this app is single-class throughout"). A teacher with
  // both a Jr KG and a Sr KG class would only see the first one's
  // workbook set here, same as everywhere else in the app today. Worth
  // revisiting alongside a real multi-class UI, not solved locally here.
  // ---------------------------------------------------------------
  const WORKBOOK_MONTHS = ['June','July','August','September','October'];
  let currentWorkbookMonth = WORKBOOK_MONTHS[WORKBOOK_MONTHS.length - 1];
  function workbookLevelFromClassName(){
    const name = (myClassInfo.class_name || '');
    // "Senior KG" is how the database names it; also accepts Sr KG / SKG / UKG.
    // Balvatika 3 is the Sr KG standard (Balvatika 2 = Jr KG).
    return /\b(senior|sr\.?)\s*k\.?\s*g\b|\bskg\b|\bukg\b|\bbalvatika\s*-?\s*3\b|\bbv\s*-?\s*3\b/i.test(name) ? 'Sr KG' : 'Jr KG'; // defaults to Jr KG if unrecognized, rather than showing nothing
  }
  // Shared error-display helper for the computed/server-backed Assessment
  // sections — errors are now "sticky" (the loaders above deliberately
  // stop auto-retrying once an error is cached, to prevent the
  // repeated-fetch loop that happened before this was added). A visible
  // Retry button is the only way back from an error short of a full page
  // reload, so every error display needs one.
  function renderRetryCard(container, message, clearFn){
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="card" style="padding:16px;"><p style="margin:0 0 10px;">${esc(message)}</p><button class="btn-primary" style="width:auto; padding:7px 14px;">Retry</button></div>`;
    wrap.querySelector('button').onclick = () => { clearFn(); renderMonthlyAssessment(monthlyAssessmentTargetEl); };
    container.appendChild(wrap);
  }
  // ---------------------------------------------------------------
  // WORKBOOK ASSESSMENT — rebuilt around the real grading unit
  // confirmed from "FINAL KHELIKA Part 1 ALL ACTIVITY BOOK JR 2026.pdf":
  // a COMPETENCY (one C-CODE row), not a physical page. A competency can
  // span several pages; page numbers are reference only, never the
  // grading key. Matches the real printed HPC record 1:1: pick a book,
  // pick a child, work through the CG-grouped competency table with
  // E/P/A per row — not month-scoped, since competencies aren't tied to
  // a monthly plan the way page schedules were.
  // ---------------------------------------------------------------
  const workbookCompetenciesCache = {}; // level -> null|'loading'|'error:...'|[{id,name,competencies:[{id,cg_code,competency_text,page_numbers,curricular_goal_id,goal_text}]}]
  function ensureWorkbookCompetenciesLoaded(level, month, reRenderFn){
    const key = level + '|' + month;
    if(Array.isArray(workbookCompetenciesCache[key])) return true;
    if(workbookCompetenciesCache[key] === 'loading') return false;
    if(typeof workbookCompetenciesCache[key] === 'string' && workbookCompetenciesCache[key].startsWith('error:')) return true;
    workbookCompetenciesCache[key] = 'loading';
    fetch('backend/assessment/workbook/get_workbook_competencies.php?' + new URLSearchParams({ level, month }) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(res => res.json())
      .then(data => {
        workbookCompetenciesCache[key] = data.status === 'success' ? (Array.isArray(data.workbooks) ? data.workbooks : []) : 'error:' + (data.message || 'Could not load workbook competencies.'); // never undefined: that asked again on every redraw
        reRenderFn();
      })
      .catch(() => { workbookCompetenciesCache[key] = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }
  // workbookCompetencyMarksCache = null|'loading'|'error:...'|{ [pupilId]: { [competencyId]: 'E'|'P'|'A' } }
  // A single shared cache, not per-level/month — competency marks aren't
  // scoped that way, same reasoning as the competencies themselves.
  let workbookCompetencyMarksCache = null;
  function ensureWorkbookCompetencyMarksLoaded(reRenderFn){
    if(workbookCompetencyMarksCache && typeof workbookCompetencyMarksCache === 'object') return true;
    if(workbookCompetencyMarksCache === 'loading') return false;
    if(typeof workbookCompetencyMarksCache === 'string' && workbookCompetencyMarksCache.startsWith('error:')) return true;
    workbookCompetencyMarksCache = 'loading';
    fetch('backend/assessment/workbook/get_workbook_competency_assessment.php' + window.location.search)
      .then(res => res.json())
      .then(data => {
        if(data.status !== 'success'){ workbookCompetencyMarksCache = 'error:' + (data.message || 'Could not load competency marks.'); reRenderFn(); return; }
        const byPupil = {};
        data.marks.forEach(m => {
          if(!byPupil[m.pupil_id]) byPupil[m.pupil_id] = {};
          byPupil[m.pupil_id][m.workbook_competency_id] = m.level_mark;
        });
        workbookCompetencyMarksCache = byPupil;
        reRenderFn();
      })
      .catch(() => { workbookCompetencyMarksCache = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }
  // Direct 3-button set, tap-again-to-clear — same pattern as everywhere
  // else in this app.
  function saveWorkbookCompetencyMark(pupilId, competencyId, currentMark, tier){
    const next = currentMark === tier ? null : tier;
    if(!workbookCompetencyMarksCache || typeof workbookCompetencyMarksCache !== 'object') return;
    if(!workbookCompetencyMarksCache[pupilId]) workbookCompetencyMarksCache[pupilId] = {};
    if(next === null) delete workbookCompetencyMarksCache[pupilId][competencyId];
    else workbookCompetencyMarksCache[pupilId][competencyId] = next;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
    fetch('backend/assessment/workbook/save_workbook_competency_assessment.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ pupil_id: pupilId, workbook_competency_id: competencyId, level_mark: next })
    }).then(res => res.json()).then(data => {
      if(data.status !== 'success'){
        workbookCompetencyMarksCache[pupilId] = workbookCompetencyMarksCache[pupilId] || {};
        if(currentMark === null) delete workbookCompetencyMarksCache[pupilId][competencyId];
        else workbookCompetencyMarksCache[pupilId][competencyId] = currentMark;
        renderMonthlyAssessment(monthlyAssessmentTargetEl);
        alert('Could not save that grade — check your connection and try again.');
      }
    }).catch(() => { alert('Could not save that grade — check your connection and try again.'); });
  }
  let currentWorkbookCompetencyBookName = null;
  // Term filter for the Workbook picker below — "Part 1" books belong to
  // Term 1, "Part 2" books to Term 2 (matching how the school actually
  // splits the year). Any workbook whose name has neither "Part 1" nor
  // "Part 2" in it is shown in both terms rather than silently hidden.
  let currentWorkbookTerm = 'Term 1';
  function bookBelongsToTerm(bookName, term){
    const hasPart1 = /part\s*1\b/i.test(bookName);
    const hasPart2 = /part\s*2\b/i.test(bookName);
    if(!hasPart1 && !hasPart2) return true; // no part number at all — don't hide it from either term
    return term === 'Term 1' ? hasPart1 : hasPart2;
  }
  let currentWorkbookCompetencyPupilId = null;
  // --- Setup form: add new competency rows directly from the app,
  // instead of a SQL script every time a new book's real rubric comes
  // in. Separate from grading — this defines the content, grading
  // happens against whatever's been defined here. ---
  let curricularGoalsListCache = null; // null|'loading'|'error:...'|[{id,goal_text,area_name}]
  function ensureCurricularGoalsListLoaded(reRenderFn){
    if(Array.isArray(curricularGoalsListCache)) return true;
    if(curricularGoalsListCache === 'loading') return false;
    if(typeof curricularGoalsListCache === 'string' && curricularGoalsListCache.startsWith('error:')) return true;
    curricularGoalsListCache = 'loading';
    fetch('backend/curriculum/get_curricular_goals.php' + window.location.search)
      .then(res => res.json())
      .then(data => {
        curricularGoalsListCache = data.status === 'success' ? data.curricular_goals : 'error:' + (data.message || 'Could not load Curricular Goals.');
        reRenderFn();
      })
      .catch(() => { curricularGoalsListCache = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }
  function renderAddCompetencyForm(workbookId, workbookName){
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.marginBottom = '16px';
    if(typeof curricularGoalsListCache === 'string' && curricularGoalsListCache.startsWith('error:')){
      wrap.innerHTML = `<div style="padding:14px;"><p style="margin:0;">${esc(curricularGoalsListCache.slice(6))}</p><button class="btn-primary" style="width:auto; padding:6px 12px; margin-top:8px;" onclick="curricularGoalsListCache=null; renderMonthlyAssessment(monthlyAssessmentTargetEl);">Retry</button></div>`;
      return wrap;
    }
    if(!Array.isArray(curricularGoalsListCache)){
      wrap.innerHTML = '<div style="padding:14px;"><p class="cap" style="margin:0;">Loading Curricular Goals…</p></div>';
      return wrap;
    }
    const cgOptions = curricularGoalsListCache.map(cg => `<option value="${cg.id}">${esc(cg.goal_text)}</option>`).join('');
    wrap.innerHTML = `
      <div class="hd"><div><h3>Add a competency to ${esc(workbookName)}</h3><p class="cap">Define a new row here once, from the real rubric document — grading against it becomes available immediately below.</p></div></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
        <div><label style="font-size:12px; font-weight:600; display:block; margin-bottom:3px;">Curricular Goal</label>
          <select id="newCompCgSelect" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${cgOptions}</select></div>
        <div><label style="font-size:12px; font-weight:600; display:block; margin-bottom:3px;">C-Code</label>
          <input id="newCompCode" placeholder="e.g. C-8.3" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:13px;" /></div>
      </div>
      <div style="margin-top:10px;"><label style="font-size:12px; font-weight:600; display:block; margin-bottom:3px;">Competency</label>
        <textarea id="newCompText" rows="2" placeholder="e.g. Counts up to 99 both forwards and backwards and in groups of 10s and 20s" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:13px; font-family:inherit; resize:vertical;"></textarea></div>
      <div style="margin-top:10px;"><label style="font-size:12px; font-weight:600; display:block; margin-bottom:3px;">Page numbers (optional, reference only)</label>
        <input id="newCompPages" placeholder="e.g. 6, 9, 19, 20" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:13px;" /></div>
      <div id="newCompResult" style="margin-top:8px;"></div>
      <button class="btn-primary" style="width:auto; padding:8px 16px; margin-top:10px;" onclick="submitNewWorkbookCompetency(${workbookId})">Add competency</button>
    `;
    return wrap;
  }
  async function submitNewWorkbookCompetency(workbookId){
    const resultEl = document.getElementById('newCompResult');
    const cgId = parseInt(document.getElementById('newCompCgSelect').value, 10);
    const cgCode = document.getElementById('newCompCode').value.trim();
    const competencyText = document.getElementById('newCompText').value.trim();
    const pageNumbers = document.getElementById('newCompPages').value.trim();
    if(!cgCode || !competencyText){
      resultEl.innerHTML = '<div class="au-error">C-Code and Competency are both required.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Saving…</p>';
    try{
      const res = await fetch('backend/assessment/workbook/add_workbook_competency.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ workbook_id: workbookId, curricular_goal_id: cgId, cg_code: cgCode, competency_text: competencyText, page_numbers: pageNumbers })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Could not save.')}</div>`;
        return;
      }
      resultEl.innerHTML = '<div class="au-success">✓ Added.</div>';
      // Force a fresh reload of this level+month's competencies so the
      // new row shows up in the grading table right away.
      const level = workbookLevelFromClassName();
      delete workbookCompetenciesCache[level + '|' + currentWorkbookMonth];
      document.getElementById('newCompCode').value = '';
      document.getElementById('newCompText').value = '';
      document.getElementById('newCompPages').value = '';
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }
  // Tally cache: month -> null|'loading'|'error:...'|{ [competencyId]: {count_e,count_p,count_a} }
  const workbookCompetencyTallyCache = {};
  function ensureWorkbookCompetencyTallyLoaded(month, reRenderFn){
    if(workbookCompetencyTallyCache[month] && typeof workbookCompetencyTallyCache[month] === 'object') return true;
    if(workbookCompetencyTallyCache[month] === 'loading') return false;
    if(typeof workbookCompetencyTallyCache[month] === 'string' && workbookCompetencyTallyCache[month].startsWith('error:')) return true;
    workbookCompetencyTallyCache[month] = 'loading';
    fetch('backend/assessment/workbook/get_workbook_competency_tally.php?' + new URLSearchParams({ month }) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(res => res.json())
      .then(data => {
        if(data.status !== 'success'){ workbookCompetencyTallyCache[month] = 'error:' + (data.message || 'Could not load tally counts.'); reRenderFn(); return; }
        const byCompetency = {};
        data.tally.forEach(t => { byCompetency[t.workbook_competency_id] = { count_e: t.count_e, count_p: t.count_p, count_a: t.count_a }; });
        workbookCompetencyTallyCache[month] = byCompetency;
        reRenderFn();
      })
      .catch(() => { workbookCompetencyTallyCache[month] = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }
