async function submitAdmissionForm(){
    const val = id => (document.getElementById(id).value || '').trim();
    const name = val('admFormName');
    const address = val('admFormAddress');
    const dob = val('admFormDob');
    const gender = document.getElementById('admFormGender').value;
    const speciallyAbled = document.getElementById('admFormSpeciallyAbled').value === 'yes';
    const prevStudied = document.getElementById('admFormPrevStudied').value === 'yes';
    const prevSchool = val('admFormPrevSchool');
    const prevStandard = val('admFormPrevStandard');
    const prevBoard = val('admFormPrevBoard');
    const prevReason = val('admFormPrevReason');
    const admittedDate = val('admFormAdmittedDate') || todayDateKey();
    // Receipt is still client-side metadata only, same honest gap as
    // before this form wrote to the real pupils table — there's no
    // upload endpoint or storage column for it yet. Worth wiring to
    // the same upload_to_drive.php that photo evidence already uses,
    // if that's wanted next.
    const isEditing = !!editingPupilId;
    const errorEl = document.getElementById('admFormError');
    const showError = (msg) => { errorEl.textContent = msg; errorEl.style.display = 'block'; };
    errorEl.style.display = 'none';
    if(!name) return showError('Name of the student is required.');
    // When editing, her own current name obviously shouldn't count as
    // a duplicate — only check against everyone ELSE on the roster.
    const nameTaken = assessmentPupilNames().some((n, i) => n === name && (!isEditing || realPupilsCache[i].id !== editingPupilId));
    if(nameTaken) return showError('A student with this exact name is already on the roll.');
    // A new admission needs a date of birth; correcting an existing child (often imported without one) doesn't.
    if(!dob && !isEditing) return showError('Date of birth is required, to calculate age.');
    if(dob && computeAgeFromDob(dob) === null) return showError('That date of birth doesn\'t look valid.');
    if(!myClassInfo.class_id) return showError('Still loading your class info — try again in a moment.');
    const submitBtn = document.querySelector('#admissions-body button[onclick="submitAdmissionForm()"]');
    if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Saving…'; }
    const endpoint = isEditing ? 'backend/update_pupil.php' : 'backend/add_pupil.php';
    const body = isEditing
      ? { pupil_id: editingPupilId, name, admitted_date: admittedDate, address, dob, gender, specially_abled: speciallyAbled, prev_studied: prevStudied, prev_school: prevSchool, prev_standard: prevStandard, prev_board: prevBoard, prev_reason: prevReason, receipt_drive_link: admReceiptDriveLink, receipt_drive_file_id: admReceiptDriveFileId }
      : { school_id: myClassInfo.school_id, class_id: myClassInfo.class_id, name, admitted_date: admittedDate, address, dob, gender, specially_abled: speciallyAbled, prev_studied: prevStudied, prev_school: prevSchool, prev_standard: prevStandard, prev_board: prevBoard, prev_reason: prevReason, receipt_drive_link: admReceiptDriveLink, receipt_drive_file_id: admReceiptDriveFileId };
    try{
      const res = await fetch(endpoint + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if(data.status !== 'success'){
        showError(data.message || 'Could not save this admission.');
        if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = isEditing ? 'Save changes' : 'Add admission'; }
        return;
      }
      // She's now a real row in the pupils table — Class Attendance and
      // Assessment already read from realPupilsCache directly, so
      // invalidating it here is the only thing needed for her to show
      // up everywhere else too.
      editingPupilId = null;
      admReceiptDriveLink = null;
      admReceiptDriveFileId = null;
      realPupilsCache = null;
      renderAdmissions();
    } catch(err){
      showError('Could not reach the server.');
      if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = isEditing ? 'Save changes' : 'Add admission'; }
    }
  }
  // ---------- 8. MONTHLY EFFECTIVE ----------
  // Matches vTeacherEffective: reporting-month tiles, an incomplete-
  // register warning, and "the return" as a computed line-item table
  // rather than a form to fill in by hand.
  //
  // EXTENDED: the return now carries real student attendance, real
  // teacher attendance, and real leave days (all computed from data
  // this app already tracks, same as the rest of the return), plus the
  // actual sign-off workflow — AO / HM / Principal signatures, a
  // scanned copy of the signed paper sheet, and a salary-disbursed
  // status that only unlocks once every signature is in, matching how
  // this really works: the sheet gets signed, then salary follows.
  const monthlyEffectiveRecords = {}; // key 'YYYY-M' -> {signatures:{principal,ao}, submittedToFoundation, scanDataUrl, scanFileName, salaryDisbursed}
  // Saved in the DATABASE (backend/records, kind 'effective') so it is
  // the same on every device and survives a cleared browser; this
  // browser keeps a copy for offline use. Photos stay in Drive — only
  // their link / file id / name are kept here.
  const monthlyEffectiveSent = {}; // key -> JSON last sent, so only changed months go up
  const cleanEffectiveForUpload = rec => { const r = Object.assign({}, rec); delete r.scanDataUrl; delete r.driveLink; return r; };
  function saveMonthlyEffectiveLocal(){
    try { localStorage.setItem('monthlyEffectiveRecords', JSON.stringify(monthlyEffectiveRecords)); } catch(e){ /* full/unavailable */ }
  }
  (function loadMonthlyEffectiveRecords(){
    try {
      const raw = localStorage.getItem('monthlyEffectiveRecords');
      if(raw) Object.assign(monthlyEffectiveRecords, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
    if(typeof classRecordsSync === 'function') classRecordsSync('effective', monthlyEffectiveRecords, () => {
      Object.keys(monthlyEffectiveRecords).forEach(k => { monthlyEffectiveSent[k] = JSON.stringify(cleanEffectiveForUpload(monthlyEffectiveRecords[k])); });
      saveMonthlyEffectiveLocal();
      const body = document.getElementById('monthlyeffective-body');
      if(body && !body.classList.contains('hidden') && typeof renderMonthlyEffective === 'function') renderMonthlyEffective();
    }, cleanEffectiveForUpload);
  })();
  function saveMonthlyEffectiveRecords(){
    saveMonthlyEffectiveLocal();
    if(typeof classRecordSave !== 'function') return;
    Object.keys(monthlyEffectiveRecords).forEach(k => {
      const json = JSON.stringify(cleanEffectiveForUpload(monthlyEffectiveRecords[k]));
      if(monthlyEffectiveSent[k] !== json){ monthlyEffectiveSent[k] = json; classRecordSave('effective', k, JSON.parse(json)); }
    });
  }
  function monthlyEffectiveKey(year, month){ return year + '-' + month; }
  // Real Supervisor-approval status, fetched from the new backend
  // endpoints — NOT a local toggle. Cached per (year, month) so the
  // screen doesn't re-fetch on every render, only when the viewed
  // month changes or after a submit/resubmit.
  var effectiveApprovalCache = {}; // key 'YYYY-M' -> {approval_status, teacher_attendance_pct, supervisor_note, submitted_at, decided_at} | 'loading'
  // ---------------------------------------------------------------
  // MY PUPILS — the real roster, fetched from get_my_pupils.php. This
  // is the actual database table; SAMPLE_STUDENTS elsewhere in this
  // file is still the hardcoded placeholder every other screen reads
  // from today. Rewiring attendance/assessment/family to read from
  // realPupilsCache instead of SAMPLE_STUDENTS is separate follow-up
  // work — this section only handles getting real pupils INTO the
  // database and letting a teacher see/manage them.
  // ---------------------------------------------------------------
  var realPupilsCache = null; // null = not yet fetched, 'loading', or an array of {id, school_id, class_id, name, admitted_date}
  // The class roll is kept in REGISTER NUMBER order (the 3–4 digit
  // General Register / admission number written before each child's
  // name in the school register), not alphabetically. Children without a
  // register number yet come after, in name order. Every list, report and
  // roll number in the portal follows this order, because they all read
  // realPupilsCache.
  function pupilRegisterOrder(a, b){
    const ra = String(a.register_no || '').trim(), rb = String(b.register_no || '').trim();
    if(ra && !rb) return -1;
    if(!ra && rb) return 1;
    if(ra && rb){
      const na = parseInt(ra, 10), nb = parseInt(rb, 10);
      if(!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
      if(ra !== rb) return ra.localeCompare(rb, undefined, { numeric: true });
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  }
  async function fetchMyPupils(){
    if(!myClassInfo.class_id){
      realPupilsCache = 'error:Still loading your class info — try again in a moment.';
      return;
    }
    realPupilsCache = 'loading';
    // A fluctuating connection can leave a request hanging indefinitely
    // (net::ERR_NETWORK_CHANGED in particular) rather than failing
    // cleanly — without a timeout, that leaves realPupilsCache stuck on
    // 'loading' forever with no way to recover short of a full page
    // reload. 12s is generous for a real response but short enough that
    // a genuinely hung request doesn't strand the screen.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try{
      const res = await fetch('backend/pupils/get_my_pupils.php' + window.location.search, { signal: controller.signal });
      const data = await res.json();
      realPupilsCache = data.status === 'success' ? (data.pupils || []).slice().sort(pupilRegisterOrder) : 'error:' + (data.message || 'Could not load pupils.');
    } catch(err){
      realPupilsCache = err.name === 'AbortError' ? 'error:Timed out — your connection may be unstable. Tap Retry to try again.' : 'error:Could not reach the server.';
    } finally {
      clearTimeout(timeoutId);
    }
    if(document.getElementById('classattendance-body') && !document.getElementById('classattendance-body').classList.contains('hidden')){
      renderAttendanceBody();
      if(classAttendanceTab === 'admissions') renderAdmissions();
    }
    // Any Assessment/Reports screen that asked to be re-rendered once
    // pupils are ready (via ensurePupilsLoadedFor) gets called now —
    // drained, not just read, so this only ever fires once per screen
    // that actually asked, not on every future fetch too.
    while(pupilsLoadedRerenderTargets.length){
      const fn = pupilsLoadedRerenderTargets.shift();
      try { fn(); } catch(e){ /* screen no longer visible/relevant — ignore */ }
    }
  }
  async function importPupilsFile(){
    const input = document.getElementById('pupilImportInput');
    const resultEl = document.getElementById('pupilImportResult');
    if(!input.files.length){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    if(!myClassInfo.class_id){
      resultEl.innerHTML = '<div class="au-error">Still loading your class info — try again in a moment.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';
    let rows;
    try{
      rows = await readAssessmentFileRows(input.files[0]); // shared parser, same one Family Profile import uses
    } catch(err){
      resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`;
      return;
    }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }
    const header = rows[0].map(h => h.toLowerCase().trim());
    if(header.join(',') !== 'name,admitted_date'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: name,admitted_date — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }
    const pupils = rows.slice(1).filter(r => r.length && r[0] && r[0].trim()).map(r => ({ name: r[0].trim(), admitted_date: (r[1] || '').trim() }));
    try{
      const res = await fetch('backend/pupils/import_pupils.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ school_id: myClassInfo.school_id, class_id: myClassInfo.class_id, pupils })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`;
        return;
      }
      let html = `<div class="au-success">Imported ${data.imported} of ${pupils.length} rows.</div>`;
      if(data.skipped && data.skipped.length) html += `<div class="au-error" style="margin-top:6px;">${data.skipped.length} row(s) skipped:<br/>${data.skipped.map(s => esc(s)).join('<br/>')}</div>`;
      resultEl.innerHTML = html;
      realPupilsCache = null;
      renderAdmissions();
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }
  async function fetchEffectiveApprovalStatus(year, month){
    const key = monthlyEffectiveKey(year, month);
    // Don't fire the request at all until we actually have a real
    // class_id — sending class_id=undefined just produces a 404 that
    // gets cached as a permanent-looking error. loadMyClassInfo()
    // clears this cache and retries once the real ID is known, so
    // this naturally resolves a moment later instead of getting stuck.
    if(!myClassInfo.class_id){
      effectiveApprovalCache[key] = { approval_status: 'error', message: 'Still loading your class info — this will update automatically in a moment.' };
      return;
    }
    effectiveApprovalCache[key] = 'loading';
    try {
      const params = new URLSearchParams({ class_id: myClassInfo.class_id, year, month });
      const res = await fetch('backend/effective/get_effective.php?' + params.toString() + (window.location.search ? '&' + window.location.search.slice(1) : ''));
      const data = await res.json();
      if(data.status === 'success'){
        effectiveApprovalCache[key] = data;
      } else {
        effectiveApprovalCache[key] = { approval_status: 'error', message: data.message };
      }
    } catch(err){
      effectiveApprovalCache[key] = { approval_status: 'error', message: 'Could not reach the server.' };
    }
    // Only re-render if the teacher is still looking at the month this
    // fetch was for — avoids clobbering a screen she's since navigated
    // away from.
    if(calendarYear === year && calendarMonth === month && document.getElementById('monthlyeffective-body') && !document.getElementById('monthlyeffective-body').classList.contains('hidden')){
      renderMonthlyEffective();
    }
  }
  async function submitEffectiveForApproval(){
    const year = calendarYear, month = calendarMonth;
    if(!myClassInfo.class_id){
      alert('Your class info is still loading — try again in a moment.');
      return;
    }
    // Defense-in-depth — the button itself is already disabled without
    // a photo, but this guards against it being triggered any other way.
    const effRec = getMonthlyEffectiveRecord(year, month);
    if(!effRec.registerDriveLink){
      alert('Attach a photo of the attendance register for this month before submitting.');
      return;
    }
    const complianceStats = computeComplianceStatsForMonth(year, month);
    const btn = document.getElementById('effSubmitApprovalBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Submitting…'; }
    try {
      const res = await fetch('backend/effective/submit_effective.php' + window.location.search, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: myClassInfo.school_id,
          class_id: myClassInfo.class_id,
          year, month,
          teacher_attendance_pct: complianceStats.myAttendancePct
        })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        alert(data.message || 'Could not submit for approval.');
        if(btn){ btn.disabled = false; btn.textContent = 'Submit for foundation approval'; }
        return;
      }
      await fetchEffectiveApprovalStatus(year, month);
    } catch(err){
      alert('Could not reach the server.');
      if(btn){ btn.disabled = false; btn.textContent = 'Submit for foundation approval'; }
    }
  }
  function getMonthlyEffectiveRecord(year, month){
    const key = monthlyEffectiveKey(year, month);
    if(!monthlyEffectiveRecords[key]){
      monthlyEffectiveRecords[key] = {
        // Step 2 & 3 of the 4-step process — Step 1 (attendance/data
        // check) lives in effectiveApprovalCache (backend-verified,
        // not a local toggle) and Step 4 is submittedToFoundation
        // below. HM is gone — the real process is Foundation check →
        // Principal → AO → submission, not three independent signs.
        signatures: { principal: null, ao: null },
        submittedToFoundation: null,
        registerDriveLink: null, registerDriveFileId: null, registerFileName: null,
        scanDriveLink: null, scanDriveFileId: null, scanFileName: null,
        salaryDisbursed: false
      };
    }
    const rec = monthlyEffectiveRecords[key];
    // Backfill for records saved under the old shape (driveLink didn't
    // exist yet, or it still has the old ao/hm/principal-in-parallel
    // signatures object from before this 4-step redesign, or the scan
    // was still a base64 blob / manually-pasted link from before real
    // Drive upload existed).
    if(rec.submittedToFoundation === undefined) rec.submittedToFoundation = null;
    if(!rec.signatures) rec.signatures = { principal: null, ao: null };
    if(rec.signatures.hm !== undefined) delete rec.signatures.hm; // old field, no longer used
    if(rec.scanDriveLink === undefined) rec.scanDriveLink = null;
    if(rec.scanDriveFileId === undefined) rec.scanDriveFileId = null;
    if(rec.registerDriveLink === undefined) rec.registerDriveLink = null;
    if(rec.registerDriveFileId === undefined) rec.registerDriveFileId = null;
    if(rec.registerFileName === undefined) rec.registerFileName = null;
    if(rec.scanDataUrl !== undefined) delete rec.scanDataUrl; // old base64 field, superseded by real Drive upload
    if(rec.driveLink !== undefined) delete rec.driveLink; // old manual-paste-link field, superseded by real Drive upload
    return rec;
  }
  const effectiveScanPruneChecked = {}; // 'YYYY-M' -> true once checked, so switching months doesn't skip checking a new one
  async function pruneDeletedEffectiveScan(year, month){
    const key = monthlyEffectiveKey(year, month);
    if(effectiveScanPruneChecked[key]) return;
    effectiveScanPruneChecked[key] = true;
    const rec = getMonthlyEffectiveRecord(year, month);
    const fileIds = [rec.scanDriveFileId, rec.registerDriveFileId].filter(Boolean);
    if(!fileIds.length) return;
    const existing = await checkDriveFilesStillExist(fileIds);
    if(existing === null) return;
    let changed = false;
    if(rec.scanDriveFileId && !existing.has(rec.scanDriveFileId)){
      rec.scanDriveLink = null; rec.scanDriveFileId = null; rec.scanFileName = null;
      changed = true;
    }
    if(rec.registerDriveFileId && !existing.has(rec.registerDriveFileId)){
      rec.registerDriveLink = null; rec.registerDriveFileId = null; rec.registerFileName = null;
      changed = true;
    }
    if(changed){
      saveMonthlyEffectiveRecords();
      if(document.getElementById('monthlyeffective-body') && !document.getElementById('monthlyeffective-body').classList.contains('hidden')) renderMonthlyEffective();
    }
  }
/* ===== teacher-part-08.js ===== */
/* =========================================================================
   teacher-part-08.js — part 8 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */
