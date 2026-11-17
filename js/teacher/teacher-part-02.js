var attendanceSaved = false;
  var attendanceSearchTerm = '';
  // EVENT_TYPE_COLORS now lives in js/events-calendar.js, shared with
  // the supervisor and superadmin pages so all three stay visually
  // identical rather than three separate implementations drifting apart.
  // Moved to js/render/events-evidence.js — renderSchoolEvents,
  // PTM_YEAR_PLAN, ptmAgendaState, addPtmYearPlanItem, renderPTMExtras,
  // renderTeacherPTM (School Events / PTM Agenda Extras), and
  // uploadedEvidenceRecords, evidenceKey, removeSessionEvidence,
  // uploadSessionActivityPhoto (Activity Photo Upload) all live there
  // now — nothing here calls them any differently than before.
  // Moved to js/render/materials.js (TLM & Resources / Materials, plus
  // a few Family contact quick-edit helpers that were originally
  // colocated here) — nothing here calls any of it any differently
  // than before.
  // Moved to js/render/parent-volunteers.js — nothing here calls any
  // of it any differently than before.
  // Moved to js/render/myday.js (My Day screen itself), js/render/
  // myday-planning.js (daily plan editor, voice input, materials chips,
  // AI Assistance), and js/render/classroom-state.js (Classroom State
  // monthly record) — nothing here calls any of it any differently
  // than before.
  /* ===================== SECTION 10: ATTENDANCE — CLASS REGISTER ===================== */
  window.attendanceEntryTargetId =
  window.attendanceEntryTargetId ||
  'attendance-body'; // which element the mark-attendance UI currently renders into
  // "Class Attendance" — combines Mark Attendance and Admissions under
  // one sidebar tab, same internal-tab pattern as Attendance Records
  // below. Reuses renderAttendanceBody()/renderAdmissions() unchanged,
  // just shows/hides their existing target divs instead of duplicating
  // either one's logic.
  var classAttendanceTab = 'mark';
  function switchClassAttendanceTab(tab){
    classAttendanceTab = tab;
    renderClassAttendanceSection();
  }
  function renderClassAttendanceSection(){
    const container = document.getElementById('classattendance-body');
    container.innerHTML = '';
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex; gap:8px; margin:14px 0; overflow-x:auto; flex-wrap:wrap;';
    const tabStyle = (active) => `padding:8px 16px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:${active ? '600' : '400'}; white-space:nowrap;`;
    tabBar.innerHTML = `
      <button style="${tabStyle(classAttendanceTab === 'mark')}" onclick="switchClassAttendanceTab('mark')">✓ Mark Attendance</button>
      <button style="${tabStyle(classAttendanceTab === 'admissions')}" onclick="switchClassAttendanceTab('admissions')">➕ Admissions</button>
      <button style="${tabStyle(classAttendanceTab === 'reports')}" onclick="switchClassAttendanceTab('reports')">📊 Reports</button>
    `;
    container.appendChild(tabBar);
    document.getElementById('attendance-body').classList.toggle('hidden', classAttendanceTab !== 'mark');
    document.getElementById('admissions-body').classList.toggle('hidden', classAttendanceTab !== 'admissions');
    if(classAttendanceTab === 'mark'){
      window.attendanceEntryTargetId =
  'attendance-body';
      renderAttendanceBody();
    } else if(classAttendanceTab === 'admissions'){
      renderAdmissions();
    } else if(classAttendanceTab === 'reports'){
      renderAttendanceReports(); // part 13
    }
  }
  // ---------- MARK ATTENDANCE — day picker, per-day register (3-state
  // cycle: Present → Absent → Late), and a follow-up panel for
  // below-70%/consecutive absences. A teacher can now open any past
  // school day and mark or correct it, not just today.
  window.markAttYear =
  window.markAttYear ?? new Date().getFullYear();
window.markAttMonth =
  window.markAttMonth ?? new Date().getMonth();
window.markAttSelectedDate =
  window.markAttSelectedDate ?? null;
  function ymd(year, month, day){
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  // Every real mark for one child, weekdays only, on or before a given
  // date within one month — used for the "month to date %" next to her
  // name, and for the Below-70% follow-up list.
  // Keyed by pupil ID, not name — two children who happen to share a
  // name must resolve to two different attendance records, never one.
  function childMonthToDatePct(pupilId, year, month, uptoDateStr){
    let present = 0, marked = 0;
    Object.keys(attendanceRecords).forEach(dateStr => {
      if(dateStr > uptoDateStr) return;
      const d = new Date(dateStr + 'T00:00:00');
      if(isNaN(d) || d.getFullYear() !== year || d.getMonth() !== month) return;
      const dow = d.getDay();
      if(dow === 0 || dow === 6) return;
      const status = (attendanceRecords[dateStr] || {})[pupilId];
      if(!status) return;
      marked++;
      if(status === 'present') present++;
    });
    return { pct: marked ? Math.round(present / marked * 1000) / 10 : 0, marked, present };
  }
  // Historical attendance import — wide format (one column per date),
  // matching the shape a real paper register naturally has (rows =
  // children, columns = days) rather than forcing one row per mark.
  // Reuses the same shared file parser the Family Profile and Pupils
  // imports already use. Two-step: previewAttendanceFile() parses and
  // shows what would happen without writing anything, then
  // confirmAttendanceImport() actually saves it — nothing hits the
  // server until the teacher explicitly confirms the preview.
  function renderAttendanceImportCard(){
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.cssText = 'margin-bottom:20px; padding:20px; overflow:hidden;';
    const monthOptions = ACADEMIC_MONTHS.map(m => {
      const label = new Date(calendarYear, m, 1).toLocaleDateString([], {month:'long', year:'numeric'});
      return `<option value="${calendarYear}-${String(m+1).padStart(2,'0')}"${m === calendarMonth ? ' selected' : ''}>${esc(label)}</option>`;
    }).join('');
    wrap.appendChild(renderRegisterWorkbookImport());
    const simple = document.createElement('div');
    wrap.appendChild(simple);
    simple.innerHTML = `
      <h3 style="margin:0 0 8px; font-size:14px;">Or: a simple file (one column per date)</h3>
      <p class="cap" style="margin:0 0 8px;">.csv or .xlsx — first column header must be exactly "name", every column after that is one date in YYYY-MM-DD format (e.g. name,2026-06-01,2026-06-02,...). Each cell under a date is P (present), A (absent), or left blank for not marked.</p>
      <div style="margin:0 0 10px;">
        <label style="font-size:12.5px; font-weight:600; display:block; margin-bottom:4px;">Which month is this file for?</label>
        <select id="attendanceImportMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${monthOptions}</select>
        <p class="cap" style="margin:4px 0 0;">Any date column outside this month will be flagged and skipped, rather than silently imported into the wrong month.</p>
      </div>
      <input type="file" id="attendanceImportInput" accept=".csv,.xlsx" style="max-width:100%;" />
      <div id="attendanceImportResult" style="margin-top:10px; word-break:break-word; overflow-wrap:anywhere;"></div>
      <button class="btn-primary" style="width:auto; padding:8px 14px; margin-top:10px;" onclick="previewAttendanceFile()">Preview import</button>
    `;
    return wrap;
  }
  // ---------------------------------------------------------------
  // IMPORT CHILDREN FOR THIS CLASS — Class Attendance → Mark
  // Attendance. The roll changes through the year, so a teacher can
  // bring in her class list from a file at any time. The file is
  // compared with the current roll first (nothing is saved until the
  // preview is confirmed):
  //   new names are added to THIS class only (the server takes the
  //   class from the login, never from the file);
  //   names already on the roll are left as they are;
  //   optionally, children missing from the file are taken off the
  //   roll (a soft remove — their past attendance is kept).
  // ---------------------------------------------------------------
  let classPupilImportOpen = false;
  let pendingPupilSync = null; // { add:[{name, admitted_date, dob, gender}], keep:[names], remove:[{id,name}], removeMissing }
  // Names are compared without a register/serial number in front, so
  // "1234 Avani Suryavanshi" and "Avani Suryavanshi" are the same child.
  function normPupilName(s){ return splitRegisterFromName(s).name.toLowerCase(); }
  // Children the server did NOT add (e.g. "looks like X, already on the roll"), as one message.
  function rollNotAddedText(data){
    const nr = (data && Array.isArray(data.needs_review)) ? data.needs_review : [];
    if(!nr.length) return '';
    return nr.length + ' child' + (nr.length === 1 ? ' was' : 'ren were') + ' not added:\n• ' + nr.slice(0, 15).map(x => (x.name || '?') + ' — ' + (x.reason || 'needs checking')).join('\n• ') + (nr.length > 15 ? '\n• … and ' + (nr.length - 15) + ' more' : '');
  }
  // "1234 Avani Suryavanshi", "1234. Avani", "3) 1234 - Avani" →
  // { register_no: '1234', name: 'Avani …' }. A 3–5 digit number is the
  // register number; a 1–2 digit number in front is only a serial (Sr No)
  // and is dropped.
  function splitRegisterFromName(raw){
    let name = String(raw == null ? '' : raw).trim().replace(/\s+/g, ' ');
    let register_no = '';
    for(let k = 0; k < 2; k++){
      const m = name.match(/^(\d{1,5})\s*[.\-)\]:\/]?\s+(\S.*)$/) || name.match(/^(\d{1,5})[.\-)\]:\/]\s*(\S.*)$/);
      if(!m) break;
      if(m[1].length >= 3 && !register_no) register_no = m[1];
      name = m[2].trim();
    }
    return { register_no, name };
  }
  // Header words for a register-number column.
  const REGISTER_HEADER_WORDS = ['register no', 'register number', 'reg no', 'regno', 'register', 'gr no', 'gr number', 'grno', 'general register no', 'general register number',
    'admission no', 'admission number', 'adm no', 'min no', 'min number', 'mun no', 'nondani kramank',
    'नोंदणी क्रमांक', 'रजि नं', 'रजिस्टर नं', 'रजिस्टर क्रमांक', 'जीआर नं', 'जनरल रजिस्टर नं', 'प्रवेश क्रमांक'];
  function isRegisterHeader(h){ return REGISTER_HEADER_WORDS.includes(String(h || '').toLowerCase().replace(/\./g, '').replace(/[:#]/g, ' ').replace(/[_\s]+/g, ' ').trim()); }
  // The register number is recognised by its VALUES, whatever the heading
  // says: a column headed Register / Reg / G.R. / Min / Sr. No. / S.No /
  // Roll / No. (or blank) whose values are mostly unique 3–5 digit numbers
  // (7101, 7102 …). A Roll No column of 1, 2, 3 … is not one.
  function looksLikeRegisterNumbers(values){
    const v = values.map(x => String(x == null ? '' : x).trim().replace(/\.0+$/, '')).filter(Boolean);
    if(v.length < 2) return false;
    const reg = v.filter(x => /^\d{3,5}$/.test(x));
    return reg.length >= v.length * 0.8 && new Set(reg).size === reg.length;
  }
  const SERIAL_HEADER_WORDS = ['sr no', 'sr', 'srno', 's no', 'sno', 'serial no', 'serial number', 'no', 'number', 'roll no', 'roll', 'roll number', 'min no', 'min number', 'mun no', 'id', 'student id', 'अ क्र', 'अक्र', 'क्रमांक', 'हजेरी क्रमांक'];
  function pickRegisterColumn(header, bodyRows, skipCols){
    const named = (header || []).findIndex(isRegisterHeader);
    if(named >= 0 && !skipCols.includes(named)) return named;            // a "Register No" heading always wins
    const norm = h => String(h || '').toLowerCase().replace(/\./g, '').replace(/[:#]/g, ' ').replace(/[_\s]+/g, ' ').trim();
    const width = Math.max((header || []).length, ...bodyRows.map(r => (r || []).length), 0);
    for(let c = 0; c < width; c++){
      if(skipCols.includes(c)) continue;
      const h = norm((header || [])[c]);
      if(h && !SERIAL_HEADER_WORDS.includes(h)) continue;
      if(looksLikeRegisterNumbers(bodyRows.map(r => (r || [])[c]))) return c;
    }
    return -1;
  }
  // Accepts 2026-06-15, 15-06-2026, 15/06/2026 or 15.06.2026 → 2026-06-15.
  function normaliseImportDate(raw){
    const v = String(raw || '').trim();
    if(!v) return '';
    let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
    m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/);
    if(m){ const y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); }
    return null; // not a date we can read
  }
  async function previewClassPupilImport(){
    const input = document.getElementById('classPupilImportInput');
    const resultEl = document.getElementById('classPupilImportResult');
    const removeMissing = !!(document.getElementById('classPupilRemoveMissing') || {}).checked;
    pendingPupilSync = null;
    if(!input || !input.files.length){ resultEl.innerHTML = '<div class="au-error">Choose a .xlsx or .csv file first.</div>'; return; }
    resultEl.innerHTML = '<p class="sub">Reading file…</p>';
    let rows;
    try { rows = await readAssessmentFileRows(input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    previewClassPupilImportRows(rows, resultEl, removeMissing); // part 13
  }
  async function confirmClassPupilImport(){
    const resultEl = document.getElementById('classPupilImportResult');
    if(!pendingPupilSync){ resultEl.innerHTML = '<div class="au-error">Preview a file first.</div>'; return; }
    if(pendingPupilSync.remove.length && !confirm(pendingPupilSync.remove.length + ' child' + (pendingPupilSync.remove.length === 1 ? '' : 'ren') + ' will be taken off the roll. Continue?')) return;
    resultEl.innerHTML = '<p class="sub">Saving…</p>';
    try{
      const res = await fetch('backend/pupils/sync_class_pupils.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ add: pendingPupilSync.add.map(a => Object.assign({ manual_verified: true }, a)), remove_ids: pendingPupilSync.remove.map(r => r.id), register_updates: (pendingPupilSync.regUpdates || []).map(u => ({ id: u.id, register_no: u.register_no })) }) // she confirmed the preview
      });
      const data = await res.json();
      if(data.status !== 'success'){ resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`; return; }
      { const held = rollNotAddedText(data); if(held) alert(held); }
      pendingPupilSync = null;
      alert('Roll updated: ' + data.added + ' added' + (data.removed ? ', ' + data.removed + ' taken off the roll' : '') + (data.register_updated ? ', ' + data.register_updated + ' register numbers saved' : '') + (data.skipped && data.skipped.length ? ', ' + data.skipped.length + ' skipped' : '') + '.');
      realPupilsCache = null; // reload the real roll everywhere
      renderAttendanceBody();
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }
  // A file with this class's current roll already in it, to edit and import back.
  function downloadClassRollTemplate(){
    if(typeof XLSX === 'undefined'){ alert('.xlsx support did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const rows = [['register_no', 'name', 'admitted_date', 'dob', 'gender']];
    (Array.isArray(realPupilsCache) ? realPupilsCache : []).forEach(p => rows.push([p.register_no || '', p.name, p.admitted_date || '', p.dob || '', p.gender || '']));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch: 12}, {wch: 28}, {wch: 14}, {wch: 14}, {wch: 10}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Class roll');
    XLSX.writeFile(wb, 'class-roll-' + (myClassInfo.class_name || 'class').replace(/\s+/g, '') + '.xlsx');
  }
  function renderClassPupilImportCard(){
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'padding:0; margin:0 0 20px; overflow:hidden;';
    card.innerHTML = `
      <div onclick="classPupilImportOpen = !classPupilImportOpen; this.nextElementSibling.classList.toggle('hidden', !classPupilImportOpen); this.querySelector('.chevron').style.transform = classPupilImportOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:16px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">👧 Import children for this class</h3>
          <p class="cap" style="margin:0;">Bring in ${esc(myClassInfo.class_name || 'this class')}'s list from a .xlsx or .csv file — new names are added, names already on the roll are left alone.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${classPupilImportOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${classPupilImportOpen ? '' : 'hidden'}" style="padding:0 18px 18px;">
        <p class="cap" style="margin:0 0 8px;">First row is the header. Only <b>name</b> is required; <b>register_no</b> (or the register number written before the name, e.g. "1234 Avani Suryavanshi"), <b>admitted_date</b>, <b>dob</b> and <b>gender</b> are optional — the class is listed in register-number order (dates like 2026-06-15 or 15/06/2026). Children are always added to <b>${esc(myClassInfo.class_name || 'this class')}</b> — the class you are logged in to.</p>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:10px 0;">
          <input type="file" id="classPupilImportInput" accept=".xlsx,.csv" style="max-width:100%;" />
          <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="previewClassPupilImport()">Preview import</button>
          <button class="btn" onclick="downloadClassRollTemplate()">⬇ Download current roll (.xlsx)</button>
        </div>
        <label style="display:flex; align-items:flex-start; gap:8px; font-size:13px; margin:4px 0 10px;">
          <input type="checkbox" id="classPupilRemoveMissing" style="margin-top:3px;" />
          <span>This file is the <b>complete</b> class list — take children who are not in it off the roll (their past records are kept).</span>
        </label>
        <div id="classPupilImportResult" style="word-break:break-word; overflow-wrap:anywhere;"></div>
      </div>`;
    return card;
  }
  // ---------------------------------------------------------------
  // IMPORT FROM THE ATTENDANCE REGISTER WORKBOOK (.xlsx) — uses the
  // register reader in backend/import/ (detect-format.php finds the
  // month sheets and header rows; convert.php reads each child's
  // P / A / H per day). Nothing is saved until the preview is
  // confirmed, and everything is saved to THIS class only:
  //   • children in the register but not on the roll can be added
  //     (backend/pupils/sync_class_pupils.php — class taken from the login);
  //   • P and A marks go through the same save_attendance.php the
  //     register itself uses; H (holiday) and blank cells are not marks.
  // ---------------------------------------------------------------
  let registerImportState = null; // { file, sheets:[…], selected:Set, preview:{…} }
  async function registerImportFetch(url, formData){
    const res = await fetch(url + window.location.search, { method: 'POST', body: formData });
    const text = await res.text();
    try { return JSON.parse(text); }
    catch(e){
      if(/autoload|PhpSpreadsheet|vendor/i.test(text)) throw new Error('The Excel reader library (PhpSpreadsheet) is not installed on the server — see the note under the card.');
      if(res.status === 404) throw new Error('backend/import/' + url.split('/').pop() + ' was not found on the server.');
      throw new Error('The server sent back something that is not data (status ' + res.status + ').');
    }
  }
  async function readRegisterWorkbook(){
    const input = document.getElementById('registerImportInput');
    const out = document.getElementById('registerImportResult');
    if(!input.files.length){ out.innerHTML = '<div class="au-error">Choose the register workbook (.xlsx) first.</div>'; return; }
    out.innerHTML = '<p class="sub">Reading the workbook…</p>';
    const fd = new FormData(); fd.append('file', input.files[0]);
    try{
      const data = await registerImportFetch('backend/import/detect-format.php', fd);
      if(data.status !== 'success') throw new Error(data.message + (data.detail ? ' — ' + data.detail : ''));
      const sheets = (data.sheets || []).filter(s => s.sections_found > 0);
      if(!sheets.length){ out.innerHTML = '<div class="au-error">No attendance sheet found — each month sheet needs a header row with "Student Name" and day numbers 1–31.</div>'; return; }
      registerImportState = { file: input.files[0], sheets, selected: new Set(sheets.filter(s => s.month).map(s => s.sheet)), preview: null };
      renderRegisterSheetPicker();
    } catch(err){ out.innerHTML = `<div class="au-error">${esc(err.message)}</div>`; }
  }
  function renderRegisterSheetPicker(){
    const out = document.getElementById('registerImportResult');
    const st = registerImportState;
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
      <p style="margin:0 0 8px; font-weight:600;">Month sheets found in ${esc(st.file.name)}</p>
      ${st.sheets.map(s => `<label style="display:flex; gap:8px; align-items:center; font-size:13px; margin:4px 0;">
        <input type="checkbox" ${st.selected.has(s.sheet) ? 'checked' : ''} ${s.month ? '' : 'disabled'} onchange="registerImportState.selected[this.checked ? 'add' : 'delete']('${esc(s.sheet).replace(/'/g, "\\'")}')" />
        <b>${esc(s.sheet)}</b> <span class="cap">${s.month ? new Date(s.month.year, s.month.month - 1, 1).toLocaleDateString([], {month:'long', year:'numeric'}) : 'month not recognised from the sheet name — skipped'} · ${s.sections_found} section${s.sections_found === 1 ? '' : 's'}</span></label>`).join('')}
      <label style="display:flex; gap:8px; align-items:flex-start; font-size:13px; margin:10px 0 4px;">
        <input type="checkbox" id="registerAddMissing" ${Array.isArray(realPupilsCache) && realPupilsCache.length ? '' : 'checked'} style="margin-top:3px;" />
        <span>Add children who are in the register but not yet on ${esc(myClassInfo.class_name || 'this class')}'s roll</span></label>
      <button class="btn-primary" style="width:auto; padding:8px 14px; margin-top:8px;" onclick="previewRegisterImport()">Preview import</button>
    </div>`;
  }
/* ===== teacher-part-02.js ===== */
/* =========================================================================
   teacher-part-02.js — part 2 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */
  async function previewRegisterImport(){
    const out = document.getElementById('registerImportResult');
    const st = registerImportState;
    if(!st || !st.selected.size){ out.insertAdjacentHTML('beforeend', '<div class="au-error">Tick at least one month sheet.</div>'); return; }
    st.addMissing = !!(document.getElementById('registerAddMissing') || {}).checked;
    out.innerHTML = '<p class="sub">Reading attendance…</p>';
    const byName = {}; // normalised name -> { name, roll, attendance:{date:'P'|'A'|'H'|null} }
    const perSheet = []; let warnings = 0;
    try{
      for(const sheet of st.sheets.filter(s => st.selected.has(s.sheet))){
        const fd = new FormData(); fd.append('file', st.file); fd.append('sheet', sheet.sheet);
        const data = await registerImportFetch('backend/import/convert.php', fd);
        if(data.status !== 'success') throw new Error(sheet.sheet + ': ' + data.message + (data.detail ? ' — ' + data.detail : ''));
        warnings += data.warning_count || 0;
        perSheet.push({ sheet: sheet.sheet, month: data.month, students: data.students_found, summary: data.attendance_summary });
        (data.students || []).forEach(s => {
          const key = normPupilName(s.name);
          const rec = byName[key] || (byName[key] = { name: s.name.trim().replace(/\s+/g, ' '), roll: s.roll_no, attendance: {} });
          Object.assign(rec.attendance, s.attendance || {});
        });
      }
    } catch(err){ out.innerHTML = `<div class="au-error">${esc(err.message)}</div>`; return; }
    const roll = {}; (realPupilsCache || []).forEach(p => { roll[normPupilName(p.name)] = p; });
    const matched = [], missing = [];
    Object.values(byName).forEach(r => (roll[normPupilName(r.name)] ? matched : missing).push(r));
    const today = todayDateKey();
    const count = list => { let p = 0, a = 0, h = 0, future = 0; list.forEach(r => Object.entries(r.attendance).forEach(([d, v]) => { if(d > today){ if(v) future++; return; } if(v === 'P') p++; else if(v === 'A') a++; else if(v === 'H') h++; })); return { p, a, h, future }; };
    const willSave = count(st.addMissing ? matched.concat(missing) : matched);
    st.preview = { byName, matched, missing, perSheet };
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
      <p style="margin:0 0 8px; font-weight:600;">Preview — nothing has been saved yet</p>
      <ul style="margin:0 0 10px 18px; padding:0; font-size:13px;">${perSheet.map(s => `<li><b>${esc(s.sheet)}</b> — ${s.students} children · P ${s.summary.P} · A ${s.summary.A} · H ${s.summary.H} · blank ${s.summary.blank}</li>`).join('')}</ul>
      <p style="margin:0 0 6px;"><b>${matched.length}</b> child${matched.length === 1 ? ' is' : 'ren are'} already on the roll.</p>
      ${missing.length ? `<p style="margin:0 0 6px;"><b style="color:${st.addMissing ? 'var(--good,#0a7a0a)' : 'var(--crit,#d03b3b)'};">${missing.length} not on the roll</b> — ${st.addMissing ? 'will be added to ' + esc(myClassInfo.class_name || 'this class') : '<b>skipped</b> (tick "Add children…" to include them)'}: <span class="cap">${missing.slice(0, 40).map(r => esc(r.name)).join(', ')}${missing.length > 40 ? ' …' : ''}</span></p>` : ''}
      <p style="margin:0 0 6px;">Will save <b>${willSave.p}</b> present and <b>${willSave.a}</b> absent marks. Saved marks replace what is already there for that child and day.</p>
      <p class="cap" style="margin:0 0 6px;">${willSave.h ? willSave.h + ' holiday (H) cells are not saved as marks — mark those days as holidays on the register calendar if they aren\u2019t already. ' : ''}${willSave.future ? willSave.future + ' marks dated after today are skipped. ' : ''}${warnings ? warnings + ' cells had something other than P / A / H and were left out.' : ''}</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="confirmRegisterImport()" ${willSave.p + willSave.a || (st.addMissing && missing.length) ? '' : 'disabled'}>Confirm import</button>
        <button class="btn" onclick="renderRegisterSheetPicker()">Back</button>
      </div></div>`;
  }
  async function confirmRegisterImport(){
    const out = document.getElementById('registerImportResult');
    const st = registerImportState;
    if(!st || !st.preview) return;
    try{
      let added = 0;
      if(st.addMissing && st.preview.missing.length){
        out.innerHTML = '<p class="sub">Adding children to the roll…</p>';
        const earliest = r => Object.keys(r.attendance).filter(d => r.attendance[d]).sort()[0] || todayDateKey();
        const res = await fetch('backend/pupils/sync_class_pupils.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ add: st.preview.missing.map(r => ({ name: r.name, admitted_date: earliest(r), manual_verified: true })), remove_ids: [] }) // she confirmed the preview
        });
        const data = await res.json();
        if(data.status !== 'success') throw new Error(data.message || 'Could not add the children.');
        added = data.added;
        const held = rollNotAddedText(data); if(held) alert(held + '\n\nTheir attendance in this file is not saved. Correct the name and import again.');
        realPupilsCache = null;
        await fetchMyPupils(); // the real roll, now including the new children
        if(!Array.isArray(realPupilsCache)) throw new Error('Children were added, but the roll could not be reloaded — press Confirm again.');
      }
      const roll = {}; realPupilsCache.forEach(p => { roll[normPupilName(p.name)] = p; });
      const today = todayDateKey();
      const marks = [];
      Object.values(st.preview.byName).forEach(r => {
        const pupil = roll[normPupilName(r.name)];
        if(!pupil) return;
        Object.entries(r.attendance).forEach(([date, v]) => {
          if(date > today) return;
          if(v === 'P') marks.push({ pupil_id: pupil.id, date, status: 'present' });
          else if(v === 'A') marks.push({ pupil_id: pupil.id, date, status: 'absent' });
        });
      });
      let saved = 0;
      for(let i = 0; i < marks.length; i += 400){
        out.innerHTML = `<p class="sub">Saving marks… ${Math.min(i + 400, marks.length)} of ${marks.length}</p>`;
        const res = await fetch('backend/attendance/save_attendance.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ marks: marks.slice(i, i + 400) })
        });
        const data = await res.json();
        if(data.status !== 'success') throw new Error((data.message || 'Could not save marks.') + ' (' + saved + ' saved before this.)');
        saved += data.saved || 0;
      }
      registerImportState = null;
      Object.keys(attendanceMonthStatus).forEach(k => delete attendanceMonthStatus[k]); // reload months from the database
      alert('Register imported: ' + (added ? added + ' children added, ' : '') + saved + ' attendance marks saved.');
      renderAttendanceBody();
    } catch(err){ out.innerHTML = `<div class="au-error">${esc(err.message)}</div>`; }
  }
  function renderRegisterWorkbookImport(){
    const box = document.createElement('div');
    box.style.cssText = 'border:1px solid var(--border); border-radius:10px; padding:16px; margin-bottom:18px; background:var(--bg);';
    box.innerHTML = `
      <h3 style="margin:0 0 6px; font-size:14px;">📘 From the class attendance register workbook (.xlsx)</h3>
      <p class="cap" style="margin:0 0 10px;">The register with one sheet per month (sheet names like "JUNE 2026"), a "Student Name" column, and day numbers 1–31 across the top with P / A / H in each cell. The workbook is read first and you see a preview — nothing is saved until you confirm, and it only ever goes into ${esc(myClassInfo.class_name || 'this class')}.</p>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <input type="file" id="registerImportInput" accept=".xlsx,.xls" style="max-width:100%;" />
        <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="readRegisterWorkbook()">Read workbook</button>
      </div>
      <div id="registerImportResult" style="margin-top:12px; word-break:break-word; overflow-wrap:anywhere;"></div>`;
    return box;
  }
  // =================================================================
  // SMART ATTENDANCE IMPORT — one button, any register file.
  //
  // Reads any .xlsx / .xls / .csv in the browser (the file never leaves
  // the teacher's computer until she confirms), then:
  //   1. finds the attendance grid on every sheet on its own — the
  //      name column, the header row(s) of dates or day numbers, the
  //      month/year (from the sheet name, a title cell or real dates),
  //      repeated sections, and "Total" rows to skip;
  //      it also understands a long list (one row per child per day);
  //   2. works out what each mark means (P/A/H, ✓/✗, 1/0, Present,
  //      हजर / गैरहजर …) and asks only about marks it doesn't know;
  //   3. shows that reading in plain words so the teacher can correct
  //      it, then a preview — nothing is saved before Confirm;
  //   4. saves to THIS class only (children added through
  //      sync_class_pupils.php, marks through save_attendance.php,
  //      holiday days through save_student_holiday.php);
  //   5. remembers the corrections for that file layout, so next
  //      month's register imports without questions.
  // =================================================================
  let smartImport = null; // { fileName, sheets:[analysis], step }
