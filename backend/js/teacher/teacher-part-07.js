/* =========================================================================
   teacher-part-07.js — part 7 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  function saveAdmissionRecords(){
    try { localStorage.setItem('admissionRecords', JSON.stringify(admissionRecords)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }

  function saveExtraAdmittedStudent(name){
    try {
      const raw = localStorage.getItem('extraAdmittedStudents');
      const list = raw ? JSON.parse(raw) : [];
      if(!list.includes(name)) list.push(name);
      localStorage.setItem('extraAdmittedStudents', JSON.stringify(list));
    } catch(e){ /* stays in-memory for this session only */ }
  }

  // The original 5 sample students get seeded, representative admission
  // details the first time this loads (same generator the old fake
  // juneStart/midYear split used), so "Every admission" has something
  // real-shaped even before a teacher has added anyone through the
  // form. Only fills in what's missing — never overwrites a real entry.
  SAMPLE_STUDENTS.forEach(name => {
    if(admissionRecords[name]) return;
    const extra = sampleAdmissionExtra(name);
    admissionRecords[name] = {
      address: extra.address, dob: extra.dob, gender: extra.gender, speciallyAbled: extra.speciallyAbled,
      prevStudied: extra.previouslyStudied !== 'None',
      prevSchool: extra.previouslyStudied !== 'None' ? extra.previouslyStudied : '',
      prevStandard: '', prevBoard: '', prevReason: '',
      admittedDate: '2026-06-01', startOfYear: true, baseline: true
    };
  });
  saveAdmissionRecords();

  function computeAgeFromDob(dobStr){
    if(!dobStr) return null;
    const dob = new Date(dobStr + 'T00:00:00');
    if(isNaN(dob)) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const hadBirthdayThisYear = (now.getMonth() > dob.getMonth()) || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
    if(!hadBirthdayThisYear) age--;
    return age;
  }

  let receiptPruneCheckedThisLoad = false;

  async function pruneDeletedReceipts(){
    if(receiptPruneCheckedThisLoad || !Array.isArray(realPupilsCache)) return;
    receiptPruneCheckedThisLoad = true;
    const withReceipts = realPupilsCache.filter(p => p.receipt_drive_file_id);
    if(!withReceipts.length) return;
    const existing = await checkDriveFilesStillExist(withReceipts.map(p => p.receipt_drive_file_id));
    if(existing === null) return;
    const gone = withReceipts.filter(p => !existing.has(p.receipt_drive_file_id));
    if(!gone.length) return;
    // Persisted server-side (not just local state) — receipts live on
    // the pupils table, so a stale reference needs clearing there too,
    // not just hidden from this one screen.
    await Promise.all(gone.map(p => fetch('backend/pupils/clear_pupil_receipt.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ pupil_id: p.id })
    }).catch(() => {})));
    realPupilsCache = null;
    if(document.getElementById('admissions-body') && !document.getElementById('admissions-body').classList.contains('hidden')) renderAdmissions();
  }

  function renderAdmissions(){
    const container = document.getElementById('admissions-body');
    container.innerHTML = '';

    if(!ensurePupilsLoadedFor(container, renderAdmissions)) return;
    pruneDeletedReceipts(); // background check — self-corrects via re-render above if any receipt's actually gone

    const total = realPupilsCache.length;
    // "Admitted at term start" = whoever shares the earliest admitted_date
    // in the roster, rather than a separate stored flag — the earliest
    // date IS the term-start cohort, by definition.
    const termStartDate = total ? realPupilsCache.reduce((min, p) => p.admitted_date < min ? p.admitted_date : min, realPupilsCache[0].admitted_date) : null;
    const startOfYearPupils = realPupilsCache.filter(p => p.admitted_date === termStartDate);
    const midYearPupils = realPupilsCache.filter(p => p.admitted_date !== termStartDate);

    container.appendChild(mdSec('Admissions', '<span class="reqs">ADB-11…16</span>'));
    container.appendChild(mdGrid('g3', [
      mdTile('On roll now', total, 'children', mdPill(myClassInfo.class_name, 'neu'), 'ADB-11'),
      mdTile('Admitted at the start', startOfYearPupils.length, total ? new Date(termStartDate + 'T00:00:00').toLocaleDateString([], {month:'long', year:'numeric'}) : '', mdPill(total ? Math.round(startOfYearPupils.length/total*100) + '% of the class' : '—', 'neu'), 'ADB-11'),
      mdTile('Admitted during the year', midYearPupils.length, 'after term start', mdPill(total ? Math.round(midYearPupils.length/total*100) + '% of the class' : '—', 'info'), 'ADB-12')
    ]));

    const whyCard = mdCard('Why this screen exists',
      'The roll is not a number set in June. Children arrive all year — families move into the area, a child turns four, an anganwadi refers one across. Every attendance, assessment and curriculum figure has a denominator that changes underneath it, and a portal that stores one enrolment count will report all of them wrongly for the rest of the year.', null);
    whyCard.style.marginTop = '20px';
    container.appendChild(whyCard);

    // --- Import from a spreadsheet — the fast path for a whole roster
    // at once, real pupils table, same one used everywhere else in the
    // app (Class Attendance, Assessment) reads from. ---
    container.appendChild(mdSec('Import from a spreadsheet', ''));
    const importCard = document.createElement('div');
    importCard.className = 'card'; importCard.style.cssText = 'margin-bottom:22px; padding:22px; overflow:hidden;';
    importCard.innerHTML = `
      <p class="cap" style="margin:0 0 10px;">.csv or .xlsx — header row must be exactly:</p>
      <p class="cap" style="margin:0 0 10px; word-break:break-word; overflow-wrap:anywhere; font-family:monospace; font-size:12px; background:var(--bg); border-radius:6px; padding:8px 10px;">name,admitted_date</p>
      <p class="cap" style="margin:0;">admitted_date is optional per row — leave it blank for an existing student and today's date is used; fill it in for anyone who joined partway through the year. This is the quick path for a whole roster at once — use the fuller form below to also capture DOB, address, previous school, etc. for one child.</p>
      <input type="file" id="pupilImportInput" accept=".csv,.xlsx" style="margin-top:10px; max-width:100%;" />
      <div id="pupilImportResult" style="margin-top:10px; word-break:break-word; overflow-wrap:anywhere;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importPupilsFile()">Import</button>
    `;
    container.appendChild(importCard);

    // --- Add an admission (or edit one already on the roster) ---
    const editingPupil = editingPupilId ? realPupilsCache.find(p => p.id === editingPupilId) : null;
    container.appendChild(mdSec(editingPupil ? 'Edit admission — ' + editingPupil.name : 'Add an admission', '<span class="reqs">ADB-01…10</span>'));
    const admFormEl = renderAddAdmissionForm(editingPupil);
    admFormEl.setAttribute('data-no-export', '1');
    container.appendChild(admFormEl);

    // --- Every admission — one real row per pupil on the real roster,
    // with Edit and Remove actions. Remove is the same soft-delete
    // Class Attendance's register uses — so removing someone here or
    // there has the exact same effect everywhere. ---
    container.appendChild(mdSec('Every admission', '<span class="reqs">ADB-16 · REG-16</span>'));
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr>' +
      '<th>Child</th><th>Admitted</th><th>DOB (Age)</th><th>Gender</th><th>Address</th><th>Previously studied</th><th>Specially abled</th><th>Receipt</th><th></th></tr></thead><tbody>';
    realPupilsCache.forEach(p => {
      const age = computeAgeFromDob(p.dob);
      const how = p.admitted_date === termStartDate ? 'Start of year' : 'Mid-year admission';
      const prevText = p.prev_studied
        ? [p.prev_school, p.prev_standard, p.prev_board].filter(Boolean).join(', ') || 'Yes'
        : 'None';
      table += `<tr>
        <td style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(p.name)}')"><b>${esc(p.name)}</b></td>
        <td>${p.admitted_date ? esc(p.admitted_date) : '—'} · ${esc(how)}</td>
        <td>${p.dob ? esc(p.dob) + (age !== null ? ' (' + age + ')' : '') : '—'}</td>
        <td>${esc(p.gender || '—')}</td>
        <td class="dim">${esc(p.address || '—')}</td>
        <td>${esc(prevText)}${p.prev_studied && p.prev_reason ? ' — ' + esc(p.prev_reason) : ''}</td>
        <td>${p.specially_abled ? mdPill('Yes', 'info') : 'No'}</td>
        <td>${p.receipt_drive_link ? `<a href="${esc(p.receipt_drive_link)}" target="_blank" rel="noopener">View</a>` : '<span class="cap">None</span>'}</td>
        <td style="white-space:nowrap;">
          <button onclick="editAdmission(${p.id})" title="Edit ${esc(p.name)}'s details" style="padding:6px 10px; border-radius:6px; border:1px solid var(--border); background:#fff; font-size:12px; cursor:pointer; margin-right:4px;">✎</button>
          <button onclick="removePupilFromRoster(${p.id}, '${esc(p.name).replace(/'/g, "\\'")}')" title="Remove ${esc(p.name)} from the roster" style="padding:6px 10px; border-radius:6px; border:1px solid var(--border); background:#fff; color:var(--danger, #c8433f); font-size:12px; cursor:pointer;">🗑</button>
        </td>
      </tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Workbooks and TLM entitlement follow the child\'s own admission date, not the June headcount.', wrap));

    // Collapsed by default — same "See reports" convention as Class
    // Attendance, so this screen doesn't default to being very long.
    const admReportsToggleCard = document.createElement('div');
    admReportsToggleCard.className = 'card'; admReportsToggleCard.style.cssText = 'padding:0; margin-top:20px; overflow:hidden;';
    admReportsToggleCard.innerHTML = `
      <div onclick="admissionsReportsOpen = !admissionsReportsOpen; this.nextElementSibling.classList.toggle('hidden', !admissionsReportsOpen); this.querySelector('.chevron').style.transform = admissionsReportsOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:16px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📊 See reports</h3>
          <p class="cap" style="margin:0;">Admissions trends across the year, generated from the real roster above.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${admissionsReportsOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${admissionsReportsOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    container.appendChild(admReportsToggleCard);
    const admReportsBody = admReportsToggleCard.querySelector('div:last-child');
    admReportsBody.appendChild(reportDownloadBar(() => document.getElementById('admissions-body'), 'Admissions — ' + (myClassInfo.class_name || ''), 'admissions', 'Every admission, the roll counts and admissions across the year.'));
    renderAdmissionsAcrossYear(admReportsBody, calendarYear);
  }

  let editingPupilId = null; // null = adding a new admission; a pupil id = editing that existing one
  let admReceiptDriveLink = null; // set once handleAdmReceiptSelected finishes uploading, read by submitAdmissionForm below
  let admReceiptDriveFileId = null;

  function renderAddAdmissionForm(editingPupil){
    const fld = 'width:100%; padding:11px 12px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;';
    const lbl = 'font-size:10.5px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px; display:block;';
    const p = editingPupil || {};
    const genderSel = (val) => `<option value="Female" ${val === 'Female' ? 'selected' : ''}>Female</option><option value="Male" ${val === 'Male' ? 'selected' : ''}>Male</option>`;
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.padding = '28px';
    wrap.innerHTML = `
      <div id="admFormError" class="cap" style="color:var(--danger,#c8433f); margin-bottom:18px; display:none;"></div>
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:24px 28px;">
        <div><label style="${lbl}">Name of the student</label><input id="admFormName" type="text" placeholder="Full name" value="${esc(p.name || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Address</label><input id="admFormAddress" type="text" placeholder="Locality, area" value="${esc(p.address || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Date of birth</label><input id="admFormDob" type="date" value="${esc(p.dob || '')}" oninput="updateAdmFormAge()" style="${fld}" /></div>
        <div><label style="${lbl}">Age</label><input id="admFormAge" type="text" readonly placeholder="Calculated from date of birth" value="${p.dob ? (computeAgeFromDob(p.dob) ?? '') + ' years' : ''}" style="${fld} background:var(--bg); color:var(--text-muted);" /></div>
        <div><label style="${lbl}">Gender</label><select id="admFormGender" style="${fld}">${genderSel(p.gender)}</select></div>
        <div><label style="${lbl}">Specially abled</label><select id="admFormSpeciallyAbled" style="${fld}"><option value="no" ${!p.specially_abled ? 'selected' : ''}>No</option><option value="yes" ${p.specially_abled ? 'selected' : ''}>Yes</option></select></div>
        <div><label style="${lbl}">Previously studied elsewhere</label><select id="admFormPrevStudied" onchange="toggleAdmFormPrevBlock()" style="${fld}"><option value="no" ${!p.prev_studied ? 'selected' : ''}>No</option><option value="yes" ${p.prev_studied ? 'selected' : ''}>Yes</option></select></div>
        <div><label style="${lbl}">Date of admission</label><input id="admFormAdmittedDate" type="date" value="${esc(p.admitted_date || todayDateKey())}" style="${fld}" /></div>
      </div>
      <div id="admFormPrevBlock" style="display:${p.prev_studied ? 'grid' : 'none'}; grid-template-columns:repeat(2,1fr); gap:24px 28px; margin-top:24px; padding-top:24px; border-top:1px solid var(--border);">
        <div><label style="${lbl}">Previous school</label><input id="admFormPrevSchool" type="text" placeholder="School name" value="${esc(p.prev_school || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Previous standard</label><input id="admFormPrevStandard" type="text" placeholder="e.g. Nursery, Jr KG" value="${esc(p.prev_standard || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Board</label><input id="admFormPrevBoard" type="text" placeholder="e.g. State board" value="${esc(p.prev_board || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Reason for leaving</label><input id="admFormPrevReason" type="text" placeholder="e.g. family relocated" value="${esc(p.prev_reason || '')}" style="${fld}" /></div>
      </div>
      <div style="margin-top:24px; padding-top:24px; border-top:1px solid var(--border);">
        <label style="${lbl}">Admission receipt</label>
        <p class="cap" style="margin:0 0 10px;">Photo or scan of the signed admission receipt, if one was issued — uploads straight to your connected Google Drive.</p>
        <label id="admReceiptBox" style="display:flex; align-items:center; gap:10px; padding:14px 16px; border:1.5px dashed var(--border); border-radius:10px; background:var(--bg); cursor:pointer; max-width:420px;">
          <span style="font-size:20px; line-height:1;">${admReceiptDriveLink ? '✓' : '+'}</span>
          <span id="admReceiptLabel" style="font-size:13px; font-weight:600;">${admReceiptDriveLink ? '✓ Receipt attached — tap to replace' : 'Add a photo or scan of the receipt'}</span>
          <input id="admFormReceipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style="display:none;" onchange="handleAdmReceiptSelected(this)" />
        </label>
        ${admReceiptDriveLink ? `<p class="cap" style="margin:6px 0 0;"><a href="${esc(admReceiptDriveLink)}" target="_blank" rel="noopener">View current receipt in Drive</a></p>` : ''}
      </div>
      <div style="margin-top:28px; padding-top:20px; border-top:1px solid var(--border); display:flex; gap:10px;">
        <button onclick="submitAdmissionForm()" class="btn-primary" style="width:auto; padding:11px 24px;">${editingPupil ? 'Save changes' : 'Add admission'}</button>
        ${editingPupil ? `<button onclick="cancelEditAdmission()" style="padding:11px 20px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:13px; font-weight:600; cursor:pointer;">Cancel</button>` : ''}
      </div>
    `;
    return wrap;
  }

  function editAdmission(pupilId){
    editingPupilId = pupilId;
    // Pre-fill from her existing record, if she already has a receipt
    // on file — so re-submitting the form (e.g. after fixing another
    // field) doesn't silently wipe it out.
    const pupil = realPupilsCache.find(p => p.id === pupilId);
    admReceiptDriveLink = (pupil && pupil.receipt_drive_link) || null;
    admReceiptDriveFileId = (pupil && pupil.receipt_drive_file_id) || null;
    renderAdmissions();
    // Scroll the form into view — it's mid-page, easy to miss otherwise.
    setTimeout(() => { const el = document.getElementById('admFormError'); if(el) el.closest('.card').scrollIntoView({behavior:'smooth', block:'center'}); }, 50);
  }
  function cancelEditAdmission(){
    editingPupilId = null;
    admReceiptDriveLink = null;
    admReceiptDriveFileId = null;
    renderAdmissions();
  }

  // Named after the child, same convention as materials/attendance
  // photos elsewhere in this app (renameFileTo) — several receipts
  // sitting in the same "Admissions" Drive folder are otherwise
  // indistinguishable by filename alone (e.g. every phone photo just
  // calls itself "IMG_2041.jpg"). compressImageFile is a no-op for a
  // PDF (it can't be decoded as an image, so it resolves unchanged) —
  // safe to run regardless of which file type was picked.
  async function handleAdmReceiptSelected(inputEl){
    const label = document.getElementById('admReceiptLabel');
    const file = inputEl.files && inputEl.files[0];
    if(!label || !file) return;

    const nameEl = document.getElementById('admFormName');
    const studentName = (nameEl && nameEl.value.trim()) || 'Admission Receipt';

    label.textContent = 'Uploading to Google Drive…';
    const compressedFile = renameFileTo(await compressImageFile(file), studentName);
    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('folder_path', 'Admissions');

    try{
      const res = await fetch('backend/drive/upload_to_drive.php' + window.location.search, { method: 'POST', body: formData });
      const data = await res.json();
      if(data.status === 'success'){
        admReceiptDriveLink = data.link;
        admReceiptDriveFileId = data.file_id;
        label.textContent = '✓ ' + compressedFile.name + ' — tap to replace';
      } else {
        label.textContent = data.message || 'Upload failed — tap to try again';
      }
    } catch(err){
      label.textContent = 'Could not reach the server — tap to try again';
    }
  }

  function updateAdmFormAge(){
    const dobEl = document.getElementById('admFormDob');
    const ageEl = document.getElementById('admFormAge');
    if(!dobEl || !ageEl) return;
    const age = computeAgeFromDob(dobEl.value);
    ageEl.value = age === null ? '' : age + (age === 1 ? ' year' : ' years');
  }

  function toggleAdmFormPrevBlock(){
    const sel = document.getElementById('admFormPrevStudied');
    const block = document.getElementById('admFormPrevBlock');
    if(sel && block) block.style.display = sel.value === 'yes' ? 'grid' : 'none';
  }

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
    if(!dob) return showError('Date of birth is required, to calculate age.');
    if(computeAgeFromDob(dob) === null) return showError('That date of birth doesn\'t look valid.');
    if(!myClassInfo.class_id) return showError('Still loading your class info — try again in a moment.');

    const submitBtn = document.querySelector('#admissions-body button[onclick="submitAdmissionForm()"]');
    if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Saving…'; }

    const endpoint = isEditing ? 'backend/update_pupil.php' : 'backend/add_pupil.php';
    const body = isEditing
      ? { class_id: myClassInfo.class_id, pupil_id: editingPupilId, name, admitted_date: admittedDate, address, dob, gender, specially_abled: speciallyAbled, prev_studied: prevStudied, prev_school: prevSchool, prev_standard: prevStandard, prev_board: prevBoard, prev_reason: prevReason, receipt_drive_link: admReceiptDriveLink, receipt_drive_file_id: admReceiptDriveFileId }
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

  (function loadMonthlyEffectiveRecords(){
    try {
      const raw = localStorage.getItem('monthlyEffectiveRecords');
      if(raw) Object.assign(monthlyEffectiveRecords, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
  })();

  function saveMonthlyEffectiveRecords(){
    try { localStorage.setItem('monthlyEffectiveRecords', JSON.stringify(monthlyEffectiveRecords)); }
    catch(e){ /* storage full/unavailable (a scanned image can be large) — stays in-memory for this session only */ }
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

  // Every pupil-facing screen must read the same canonical roster. A few
  // older reports still read SAMPLE_STUDENTS, so keep that legacy array in
  // step with the real database rows until those reports are fully migrated.
  function applyCanonicalPupilRoster(pupils){
    realPupilsCache = (pupils || []).slice().sort(pupilRegisterOrder);
    if(Array.isArray(SAMPLE_STUDENTS)){
      SAMPLE_STUDENTS.splice(0, SAMPLE_STUDENTS.length, ...realPupilsCache.map(p => p.name));
    }
    document.dispatchEvent(new CustomEvent('aarambh:pupils-synced', {
      detail: { class_id: myClassInfo.class_id, pupils: realPupilsCache.slice() }
    }));
    [
      ['myday-body', 'renderMyDay'],
      ['myclass-body', 'renderMyClass'],
      ['materials-body', 'renderMaterials'],
      ['monthlyeffective-body', 'renderMonthlyEffective'],
      ['attendancedashboard-body', 'renderAttendanceDashboard'],
      ['assessmentdashboard-body', 'renderAssessmentDashboard'],
      ['parentinvolvement-body', 'renderParentInvolvement']
    ].forEach(([id, renderer]) => {
      const el = document.getElementById(id);
      if(el && !el.classList.contains('hidden') && typeof window[renderer] === 'function'){
        try { window[renderer](); } catch(e) { /* view may still be initializing */ }
      }
    });
  }

  function pupilApiUrl(path){
    const params = new URLSearchParams(window.location.search);
    if(myClassInfo.class_id) params.set('class_id', myClassInfo.class_id);
    const query = params.toString();
    return path + (query ? '?' + query : '');
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
      const res = await fetch(pupilApiUrl('backend/pupils/get_my_pupils.php'), { signal: controller.signal });
      const data = await res.json();
      if(data.status === 'success') applyCanonicalPupilRoster(data.pupils || []);
      else realPupilsCache = 'error:' + (data.message || 'Could not load pupils.');
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
      const res = await fetch(pupilApiUrl('backend/pupils/sync_class_pupils.php'), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, add: pupils, remove_ids: [] })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`;
        return;
      }
      const synchronized = (data.added || 0) + (data.reactivated || 0) + (data.updated || 0) + (data.unchanged || 0);
      let html = `<div class="au-success">Synchronized ${synchronized} of ${pupils.length} rows — ${data.added || 0} added${data.reactivated ? `, ${data.reactivated} restored with their earlier records` : ''}.</div>`;
      if(data.skipped && data.skipped.length) html += `<div class="au-error" style="margin-top:6px;">${data.skipped.length} row(s) skipped:<br/>${data.skipped.map(s => esc(s)).join('<br/>')}</div>`;
      resultEl.innerHTML = html;
      if(Array.isArray(data.pupils)) applyCanonicalPupilRoster(data.pupils);
      else realPupilsCache = null;
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
