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
    const byName = {}; // stable identity -> { name, register_no, roll, attendance:{date:'P'|'A'|'H'|null} }
    const perSheet = []; let warnings = 0;
    try{
      for(const sheet of st.sheets.filter(s => st.selected.has(s.sheet))){
        const fd = new FormData(); fd.append('file', st.file); fd.append('sheet', sheet.sheet);
        const data = await registerImportFetch('backend/import/convert.php', fd);
        if(data.status !== 'success') throw new Error(sheet.sheet + ': ' + data.message + (data.detail ? ' — ' + data.detail : ''));
        warnings += data.warning_count || 0;
        perSheet.push({ sheet: sheet.sheet, month: data.month, students: data.students_found, summary: data.attendance_summary });
        (data.students || []).forEach(s => {
          const register_no = String(s.register_no || '').trim().replace(/\.0+$/, '');
          const key = siImportedIdentityKey(s.name, register_no);
          const rec = byName[key] || (byName[key] = { _identityKey: key, name: s.name.trim().replace(/\s+/g, ' '), register_no, roll: s.roll_no, attendance: {} });
          Object.assign(rec.attendance, s.attendance || {});
        });
      }
    } catch(err){ out.innerHTML = `<div class="au-error">${esc(err.message)}</div>`; return; }

    const identityIssues = siRegisterIdentityIssues(Object.values(byName), false);
    const safeRows = Object.values(byName).filter(r => !identityIssues.problemKeys.has(r._identityKey));

    const rollByName = {}, rollByRegister = {};
    (realPupilsCache || []).forEach(p => {
      const nameKey = normPupilName(p.name);
      (rollByName[nameKey] = rollByName[nameKey] || []).push(p);
      const registerKey = String(p.register_no || '').trim();
      if(registerKey) (rollByRegister[registerKey] = rollByRegister[registerKey] || []).push(p);
    });
    const matchImportedPupil = r => {
      const registerMatches = r.register_no ? (rollByRegister[String(r.register_no)] || []) : [];
      if(registerMatches.length === 1) return registerMatches[0];
      const nameMatches = rollByName[normPupilName(r.name)] || [];
      return nameMatches.length === 1 ? nameMatches[0] : null;
    };
    const matched = [], missing = [];
    safeRows.forEach(r => (matchImportedPupil(r) ? matched : missing).push(r));
    const today = todayDateKey();
    const count = list => { let p = 0, a = 0, h = 0, future = 0; list.forEach(r => Object.entries(r.attendance).forEach(([d, v]) => { if(d > today){ if(v) future++; return; } if(v === 'P') p++; else if(v === 'A') a++; else if(v === 'H') h++; })); return { p, a, h, future }; };
    const willSave = count(st.addMissing ? matched.concat(missing) : matched);
    st.preview = { byName, safeRows, matched, missing, perSheet, identityIssues };

    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
      <p style="margin:0 0 8px; font-weight:600;">Preview — nothing has been saved yet</p>
      <ul style="margin:0 0 10px 18px; padding:0; font-size:13px;">${perSheet.map(s => `<li><b>${esc(s.sheet)}</b> — ${s.students} children · P ${s.summary.P} · A ${s.summary.A} · H ${s.summary.H} · blank ${s.summary.blank}</li>`).join('')}</ul>
      ${siRegisterIdentityIssueHtml(identityIssues)}
      <p style="margin:0 0 6px;"><b>${matched.length}</b> child${matched.length === 1 ? ' is' : 'ren are'} already on the roll.</p>
      ${missing.length ? `<p style="margin:0 0 6px;"><b style="color:${st.addMissing ? 'var(--good,#0a7a0a)' : 'var(--crit,#d03b3b)'};">${missing.length} not on the roll</b> — ${st.addMissing ? 'will be added to ' + esc(myClassInfo.class_name || 'this class') : '<b>skipped</b> (tick "Add children…" to include them)'}: <span class="cap">${missing.slice(0, 40).map(r => esc(r.name)).join(', ')}${missing.length > 40 ? ' …' : ''}</span></p>` : ''}
      <p style="margin:0 0 6px;">Will save <b>${willSave.p}</b> present and <b>${willSave.a}</b> absent marks. Saved marks replace what is already there for that child and day.</p>
      <p class="cap" style="margin:0 0 6px;">${willSave.h ? willSave.h + ' holiday (H) cells are not saved as marks — mark those days as holidays on the register calendar if they aren\u2019t already. ' : ''}${willSave.future ? willSave.future + ' marks dated after today are skipped. ' : ''}${warnings ? warnings + ' cells had something other than P / A / H and were left out.' : ''}</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="confirmRegisterImport()" ${!identityIssues.hasBlocking && (willSave.p + willSave.a || (st.addMissing && missing.length)) ? '' : 'disabled'}>Confirm import</button>
        <button class="btn" onclick="renderRegisterSheetPicker()">Back</button>
      </div></div>`;
  }

  async function confirmRegisterImport(){
    const out = document.getElementById('registerImportResult');
    const st = registerImportState;
    if(!st || !st.preview) return;
    if(st.preview.identityIssues && st.preview.identityIssues.hasBlocking){
      out.innerHTML = siRegisterIdentityIssueHtml(st.preview.identityIssues) + '<button class="btn" style="margin-top:8px;" onclick="renderRegisterSheetPicker()">Choose the corrected workbook</button>';
      return;
    }
    try{
      let added = 0, reactivated = 0, updated = 0;
      if(st.addMissing && st.preview.missing.length){
        out.innerHTML = '<p class="sub">Adding children to the roll…</p>';
        const earliest = r => Object.keys(r.attendance).filter(d => r.attendance[d]).sort()[0] || todayDateKey();
        const res = await fetch(pupilApiUrl('backend/pupils/sync_class_pupils.php'), {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ class_id: myClassInfo.class_id, add: st.preview.missing.map(r => ({ name: r.name, register_no: r.register_no || '', admitted_date: earliest(r) })), remove_ids: [] })
        });
        const data = await res.json();
        if(data.status !== 'success') throw new Error(data.message || 'Could not add the children.');
        added = data.added;
        reactivated = data.reactivated || 0;
        updated = data.updated || 0;
        if(Array.isArray(data.pupils)) applyCanonicalPupilRoster(data.pupils);
        else { realPupilsCache = null; await fetchMyPupils(); }
        if(!Array.isArray(realPupilsCache)) throw new Error('Children were added, but the roll could not be reloaded — press Confirm again.');
      }
      const rollByName = {}, rollByRegister = {};
      realPupilsCache.forEach(p => {
        const nameKey = normPupilName(p.name);
        (rollByName[nameKey] = rollByName[nameKey] || []).push(p);
        const registerKey = String(p.register_no || '').trim();
        if(registerKey) (rollByRegister[registerKey] = rollByRegister[registerKey] || []).push(p);
      });
      const matchImportedPupil = r => {
        const registerMatches = r.register_no ? (rollByRegister[String(r.register_no)] || []) : [];
        if(registerMatches.length === 1) return registerMatches[0];
        const nameMatches = rollByName[normPupilName(r.name)] || [];
        return nameMatches.length === 1 ? nameMatches[0] : null;
      };
      const today = todayDateKey();
      const marks = [];
      (st.preview.safeRows || Object.values(st.preview.byName)).forEach(r => {
        const pupil = matchImportedPupil(r);
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
          method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ class_id: myClassInfo.class_id, marks: marks.slice(i, i + 400) })
        });
        const data = await res.json();
        if(data.status !== 'success') throw new Error((data.message || 'Could not save marks.') + ' (' + saved + ' saved before this.)');
        saved += data.saved || 0;
      }
      registerImportState = null;
      Object.keys(attendanceMonthStatus).forEach(k => delete attendanceMonthStatus[k]); // reload months from the database
      alert('Register imported: ' + [added ? added + ' children added' : '', reactivated ? reactivated + ' restored with earlier records' : '', updated ? updated + ' pupil details updated' : '', saved + ' attendance marks saved'].filter(Boolean).join(', ') + '.');
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

  const SI_NAME_WORDS = ['name', 'student name', 'name of student', 'students name', "student's name", 'child name', 'name of child', 'child', 'student', 'pupil', 'pupil name', 'full name',
    'नाव', 'नाम', 'विद्यार्थ्याचे नाव', 'विद्यार्थ्यांचे नाव', 'विद्यार्थी', 'छात्र का नाम', 'बालकाचे नाव'];
  const SI_ROLL_WORDS = ['roll', 'roll no', 'roll no.', 'roll number', 'sr', 'sr no', 'sr. no.', 'sr.no', 'sr no.', 's no', 's.no', 'sno', 'no', 'no.', 'अ.क्र', 'अ. क्र.', 'क्रमांक', 'हजेरी क्रमांक'];
  const SI_TOTAL_WORDS = /^(total|grand total|present|absent|total present|total absent|sum|average|avg|एकूण|एकूण हजर|एकूण गैरहजर|सरासरी|कुल)\b/i;
  const SI_MONTHS = { jan:0, january:0, feb:1, february:1, mar:2, march:2, apr:3, april:3, may:4, jun:5, june:5, jul:6, july:6, aug:7, august:7, sep:8, sept:8, september:8, oct:9, october:9, nov:10, november:10, dec:11, december:11,
    'जानेवारी':0, 'फेब्रुवारी':1, 'मार्च':2, 'एप्रिल':3, 'मे':4, 'जून':5, 'जुलै':6, 'ऑगस्ट':7, 'सप्टेंबर':8, 'ऑक्टोबर':9, 'नोव्हेंबर':10, 'डिसेंबर':11 };
  const SI_MARKS = {
    present: ['p', 'present', 'pr', '✓', '✔', '√', '1', 'y', 'yes', 'हजर', 'उपस्थित', 'उ', 'ह'],
    absent:  ['a', 'ab', 'abs', 'absent', 'x', '✗', '✘', '×', '0', 'n', 'no', 'गैरहजर', 'अनुपस्थित', 'गै', 'अ'],
    holiday: ['h', 'hol', 'holiday', 'hd', 'सुट्टी', 'सुटी', 'अवकाश', 'छुट्टी']
  };

  function siText(v){ return v instanceof Date ? '' : String(v == null ? '' : v).trim(); }
  function siNorm(v){ return siText(v).toLowerCase().replace(/\s+/g, ' ').replace(/[:.]$/, ''); }
  function siYmd(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  // Keep the register/MIN number as the primary identity without ever
  // collapsing two different names that accidentally share the same
  // number in the source file. The preview below blocks such conflicts.
  function siImportedIdentityKey(name, registerNo){
    const reg = String(registerNo || '').trim().replace(/\.0+$/, '');
    const nameKey = normPupilName(name);
    return reg ? 'r:' + reg + '|n:' + nameKey : 'n:' + nameKey;
  }

  function siRegisterIdentityIssues(records, requireExpectedRegister){
    const byRegister = {}, byName = {};
    records.forEach(r => {
      const reg = String(r.register_no || '').trim().replace(/\.0+$/, '');
      const nameKey = normPupilName(r.name);
      if(reg) (byRegister[reg] = byRegister[reg] || []).push(r);
      (byName[nameKey] = byName[nameKey] || []).push(r);
    });

    const duplicateRegisters = [];
    Object.entries(byRegister).forEach(([registerNo, rows]) => {
      const names = [...new Map(rows.map(r => [normPupilName(r.name), r.name])).values()];
      if(names.length > 1) duplicateRegisters.push({ register_no: registerNo, names, rows });
    });

    const conflictingNames = [];
    Object.entries(byName).forEach(([nameKey, rows]) => {
      const registers = [...new Set(rows.map(r => String(r.register_no || '').trim()).filter(Boolean))];
      if(registers.length > 1) conflictingNames.push({ name: rows[0].name, registers, rows });
    });

    const missingRegisters = requireExpectedRegister
      ? records.filter(r => r.register_expected && !String(r.register_no || '').trim())
      : [];
    const problemKeys = new Set();
    duplicateRegisters.forEach(g => g.rows.forEach(r => problemKeys.add(r._identityKey)));
    conflictingNames.forEach(g => g.rows.forEach(r => problemKeys.add(r._identityKey)));
    missingRegisters.forEach(r => problemKeys.add(r._identityKey));

    return {
      duplicateRegisters,
      conflictingNames,
      missingRegisters,
      problemKeys,
      hasBlocking: problemKeys.size > 0
    };
  }

  function siRegisterIdentityIssueHtml(issues){
    if(!issues || !issues.hasBlocking) return '';
    const lines = [];
    issues.duplicateRegisters.forEach(g => lines.push('Register/MIN ' + esc(g.register_no) + ' is used for ' + g.names.map(esc).join(' and ') + '.'));
    issues.conflictingNames.forEach(g => lines.push(esc(g.name) + ' has different Register/MIN numbers: ' + g.registers.map(esc).join(', ') + '.'));
    issues.missingRegisters.forEach(r => lines.push(esc(r.name) + ' has no Register/MIN number.'));
    return `<div class="au-error" style="margin:8px 0;"><b>Register/MIN numbers must be corrected before importing.</b><br>${lines.join('<br>')}<br><span style="font-weight:normal;">Correct these cells in Excel and upload the workbook again. Import is blocked so attendance cannot be attached to the wrong child.</span></div>`;
  }

  // A header cell → a full date, a bare day number, or nothing.
  function siReadDateCell(v){
    if(v instanceof Date && !isNaN(v)) return { date: new Date(v.getFullYear(), v.getMonth(), v.getDate()) };
    const t = siText(v);
    if(!t) return null;
    let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m) return { date: new Date(+m[1], +m[2] - 1, +m[3]) };
    m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/);
    if(m) return { date: new Date(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]) };
    m = t.match(/^(\d{1,2})[\s\-\/]*([a-z\u0900-\u097F]{3,})[\s\-\/,]*(\d{2}|\d{4})?$/i);
    if(m && SI_MONTHS[m[2].toLowerCase()] !== undefined){
      const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null;
      return y ? { date: new Date(y, SI_MONTHS[m[2].toLowerCase()], +m[1]) } : { day: +m[1], month: SI_MONTHS[m[2].toLowerCase()] };
    }
    m = t.match(/^([1-9]|[12]\d|3[01])(?:\s*[\r\n]+.*|\s+[a-z\u0900-\u097F]{2,}\.?)?$/is); // "5", "5 Wed", "5\nWed"
    if(m) return { day: +m[1] };
    return null;
  }

  // Month + year from text such as "JUNE 2026", "Jun-26", "जून २०२६".
  function siMonthYearFromText(text){
    const t = String(text || '').toLowerCase().replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d));
    let month = null;
    for(const [word, idx] of Object.entries(SI_MONTHS)){
      const re = new RegExp('(^|[^a-z\\u0900-\\u097F])' + word + '($|[^a-z\\u0900-\\u097F])', 'i');
      if(re.test(t)){ month = idx; break; }
    }
    if(month === null) return null;
    let year = null;
    const y4 = t.match(/(20\d{2})/); const y2 = t.match(/(?:^|[^\d])(\d{2})(?:$|[^\d])/);
    if(y4) year = +y4[1]; else if(y2) year = 2000 + +y2[1];
    return { month, year };
  }

  function siMarkMeaning(value, remembered){
    const v = siNorm(value);
    if(!v) return 'blank';
    if(remembered && remembered[v]) return remembered[v];
    for(const [meaning, words] of Object.entries(SI_MARKS)) if(words.includes(v)) return meaning;
    return 'unknown';
  }

  function siRememberedMaps(){ try { return JSON.parse(localStorage.getItem('smartImportMaps') || '{}'); } catch(e){ return {}; } }
  function siFingerprint(headerCells){ return headerCells.map(siNorm).filter(Boolean).filter(h => !/^\d+$/.test(h)).slice(0, 8).join('|'); }

  // ---- Find the grid(s) on one sheet ----
  function siAnalyseSheet(name, grid){
    const out = { sheet: name, include: true, sections: [], long: null, problems: [], monthGuess: siMonthYearFromText(name), valueCounts: {}, valueMap: {} };
    const maxCols = Math.min(400, Math.max(0, ...grid.slice(0, 60).map(r => r.length)));
    // Title text above the first header, for a month like "Attendance — June 2026".
    const titleText = grid.slice(0, 8).map(r => r.map(siText).join(' ')).join(' ');
    if(!out.monthGuess || out.monthGuess.year === null){
      const fromTitle = siMonthYearFromText(titleText);
      if(fromTitle){
        if(!out.monthGuess) out.monthGuess = fromTitle;
        else if(fromTitle.year !== null) out.monthGuess.year = fromTitle.year;
      }
    }

    // Header rows: a name-like cell, or at least five date/day cells in a row.
    for(let r = 0; r < grid.length; r++){
      const row = grid[r] || [];
      let nameCol = -1, rollCol = -1, regCol = -1; const dateCols = [];
      for(let c = 0; c < Math.min(row.length, maxCols); c++){
        const n = siNorm(row[c]);
        if(nameCol < 0 && SI_NAME_WORDS.includes(n)) nameCol = c;
        else if(regCol < 0 && isRegisterHeader(row[c])) regCol = c;
        else if(rollCol < 0 && SI_ROLL_WORDS.includes(n)) rollCol = c;
        const d = siReadDateCell(row[c]);
        if(d && c !== rollCol && c !== regCol) dateCols.push({ col: c, ...d });
      }
      // Bare day numbers must run upward, otherwise it's a data row of numbers.
      // A header needs five or more real dates, or five or more day
      // numbers that strictly go up (1, 2, 3 …) — a row of 1/0 marks
      // never does, so it can't be mistaken for a header.
      const days = dateCols.filter(d => d.day !== undefined);
      const fullDates = dateCols.filter(d => d.date);
      const increasing = days.length >= 5 && days.every((d, i) => i === 0 || d.day > days[i - 1].day);
      if(fullDates.length >= 5 || increasing){
        if(!increasing) for(let i = dateCols.length - 1; i >= 0; i--) if(!dateCols[i].date) dateCols.splice(i, 1);
        if(nameCol < 0){
          // No labelled name column: the text column just left of the dates.
          for(let c = dateCols[0].col - 1; c >= 0; c--){
            const sample = grid.slice(r + 1, r + 12).map(x => siText((x || [])[c])).filter(Boolean);
            if(sample.length >= 2 && sample.filter(s => /[a-z\u0900-\u097F]{2,}/i.test(s) && !/^\d+$/.test(s)).length >= sample.length * 0.6){ nameCol = c; break; }
          }
        }
        if(nameCol >= 0) out.sections.push({ headerRow: r, nameCol, rollCol, regCol, dateCols, headerCells: row });
      } else if(nameCol >= 0 && !out.long){
        // Long layout: name + a date column + a mark column, one row per day.
        const dateColIdx = row.findIndex(v => ['date', 'day', 'दिनांक', 'तारीख'].includes(siNorm(v)));
        const markColIdx = row.findIndex(v => ['status', 'attendance', 'mark', 'present/absent', 'p/a', 'हजेरी', 'उपस्थिती'].includes(siNorm(v)));
        if(dateColIdx >= 0 && markColIdx >= 0) out.long = { headerRow: r, nameCol, dateCol: dateColIdx, markCol: markColIdx, headerCells: row };
      }
    }
    if(!out.sections.length && !out.long){ out.include = false; out.problems.push('No attendance grid found on this sheet.'); return out; }

    const remembered = siRememberedMaps()[siFingerprint((out.sections[0] || out.long).headerCells)] || {};
    out.fingerprint = siFingerprint((out.sections[0] || out.long).headerCells);
    const countValue = v => { const k = siNorm(v); if(!k) return; out.valueCounts[k] = (out.valueCounts[k] || 0) + 1; };

    // Children rows under each section header, up to the next header.
    const headerRows = out.sections.map(s => s.headerRow);
    out.sections.forEach((s, i) => {
      s.rows = [];
      const end = i + 1 < out.sections.length ? headerRows[i + 1] : grid.length;
      for(let r = s.headerRow + 1; r < end; r++){
        const row = grid[r] || [];
        // A register number may be in its own column, or written in front
        // of the name ("1234 Avani Suryavanshi") — either way it is kept.
        const split = splitRegisterFromName(siText(row[s.nameCol]));
        const name = split.name;
        const regCell = s.regCol >= 0 ? siText(row[s.regCol]).replace(/\.0+$/, '') : '';
        const reg = /^\d{1,6}$/.test(regCell) ? regCell : split.register_no;
        if(!name || SI_TOTAL_WORDS.test(name) || /^\d+([.,]\d+)?%?$/.test(name)) continue;
        if(s.rollCol >= 0 && siText(row[s.rollCol]) && !/^\d+$/.test(siText(row[s.rollCol]))) continue; // sub-headings in the roll column
        const marks = s.dateCols.map(d => { countValue(row[d.col]); return row[d.col]; });
        if(marks.every(m => !siText(m))) continue; // a child row with nothing marked adds nothing
        s.rows.push({ name, reg, registerExpected: s.regCol >= 0, marks });
      }
    });
    if(out.long){
      const L = out.long; L.rows = [];
      for(let r = L.headerRow + 1; r < grid.length; r++){
        const row = grid[r] || [];
        const lsplit = splitRegisterFromName(siText(row[L.nameCol]));
        const name = lsplit.name;
        const d = siReadDateCell(row[L.dateCol]);
        if(!name || !d || !d.date) continue;
        countValue(row[L.markCol]);
        L.rows.push({ name, reg: lsplit.register_no, date: siYmd(d.date), mark: row[L.markCol] });
      }
    }
    Object.keys(out.valueCounts).forEach(v => { out.valueMap[v] = siMarkMeaning(v, remembered.values); });
    out.needsMonth = out.sections.some(s => s.dateCols.some(d => !d.date && (d.month === undefined || !out.monthGuess || out.monthGuess.year === null))) && !(out.monthGuess && out.monthGuess.year !== null && out.monthGuess.month !== undefined);
    return out;
  }

  // ---- The dates for one section, once month/year are settled ----
  function siSectionDates(sheet, s){
    return s.dateCols.map(d => {
      if(d.date) return siYmd(d.date);
      const month = d.month !== undefined ? d.month : (sheet.monthGuess ? sheet.monthGuess.month : null);
      const year = sheet.monthGuess ? sheet.monthGuess.year : null;
      if(month === null || month === undefined || !year) return null;
      const dt = new Date(year, month, d.day);
      return dt.getMonth() === month ? siYmd(dt) : null; // 31 June is dropped
    });
  }

  // All sheets → { byName: {key: {name, attendance:{date:'present'|'absent'|'holiday'}}}, stats }
  function siCollect(){
    const byName = {}; const stats = { present: 0, absent: 0, holiday: 0, ignored: 0, unknown: 0, future: 0, noDate: 0 };
    const today = todayDateKey();
    const put = (sheet, name, date, raw, reg, registerExpected) => {
      const meaning = sheet.valueMap[siNorm(raw)] || (siText(raw) ? 'unknown' : 'blank');
      if(meaning === 'blank') return;
      if(!date){ stats.noDate++; return; }
      if(meaning === 'unknown'){ stats.unknown++; return; }
      if(meaning === 'ignore'){ stats.ignored++; return; }
      if(date > today){ stats.future++; return; }
      const key = siImportedIdentityKey(name, reg);
      const rec = byName[key] || (byName[key] = { _identityKey: key, name, register_no: '', register_expected: false, attendance: {} });
      if(reg && !rec.register_no) rec.register_no = reg;
      if(registerExpected) rec.register_expected = true;
      rec.attendance[date] = meaning;
      stats[meaning]++;
    };
    smartImport.sheets.filter(s => s.include).forEach(sheet => {
      sheet.sections.forEach(s => { const dates = siSectionDates(sheet, s); s.rows.forEach(r => r.marks.forEach((m, i) => put(sheet, r.name, dates[i], m, r.reg, r.registerExpected))); });
      if(sheet.long) sheet.long.rows.forEach(r => put(sheet, r.name, r.date, r.mark, r.reg, false));
    });
    return { byName, stats, identityIssues: siRegisterIdentityIssues(Object.values(byName), true) };
  }

  async function smartImportChoose(){
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.xlsx,.xls,.csv';
    input.onchange = async () => {
      const file = input.files[0]; if(!file) return;
      if(typeof XLSX === 'undefined'){ alert('The spreadsheet reader did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
      const out = document.getElementById('smartImportPanel');
      out.innerHTML = '<p class="sub">Reading ' + esc(file.name) + '…</p>';
      try{
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const sheets = wb.SheetNames.map(n => siAnalyseSheet(n, XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' })));
        if(!sheets.some(s => s.include)){ out.innerHTML = '<div class="au-error">I couldn\'t find an attendance grid in this file — it needs a column of children\'s names and a row of dates or day numbers (or a list with name, date and mark columns).</div>'; return; }
        smartImport = { fileName: file.name, sheets, addMissing: true, markHolidays: true };
        renderSmartImportMapping();
      } catch(err){ out.innerHTML = `<div class="au-error">Could not read this file: ${esc(err.message || err)}</div>`; }
    };
    input.click();
  }

  function renderSmartImportMapping(){
    const out = document.getElementById('smartImportPanel');
    const monthOpts = sel => Array.from({length: 12}, (_, i) => `<option value="${i}" ${sel === i ? 'selected' : ''}>${new Date(2000, i, 1).toLocaleDateString([], {month:'long'})}</option>`).join('');
    const meaningOpts = sel => [['present','Present'],['absent','Absent'],['holiday','Holiday'],['ignore','Ignore this mark'],['unknown','— choose —']].map(([v, l]) => `<option value="${v}" ${sel === v ? 'selected' : ''}>${l}</option>`).join('');
    let unknownLeft = 0;
    const cards = smartImport.sheets.map((sh, si) => {
      if(!sh.sections.length && !sh.long) return `<div class="cap" style="margin:6px 0;">Sheet <b>${esc(sh.sheet)}</b>: no attendance grid — skipped.</div>`;
      const children = sh.sections.reduce((a, s) => a + s.rows.length, 0) + (sh.long ? new Set(sh.long.rows.map(r => normPupilName(r.name))).size : 0);
      const dates = sh.sections.flatMap(s => siSectionDates(sh, s)).filter(Boolean).sort();
      const nameHeader = sh.sections[0] ? siText(sh.sections[0].headerCells[sh.sections[0].nameCol]) || 'column ' + XLSX.utils.encode_col(sh.sections[0].nameCol) : siText(sh.long.headerCells[sh.long.nameCol]);
      const layout = sh.long ? 'a list with one row per child per day'
        : `a grid${sh.sections.length > 1 ? ' in ' + sh.sections.length + ' sections' : ''} — names under “${esc(nameHeader)}”, ${sh.sections[0].dateCols.length} day columns`;
      const values = Object.keys(sh.valueCounts).sort((a, b) => sh.valueCounts[b] - sh.valueCounts[a]);
      values.forEach(v => { if(sh.include && sh.valueMap[v] === 'unknown') unknownLeft++; });
      const needMonth = sh.sections.some(s => s.dateCols.some(d => !d.date));
      return `<div style="border:1px solid var(--border); border-radius:10px; padding:12px 14px; margin:10px 0; ${sh.include ? '' : 'opacity:.6;'}">
        <label style="display:flex; gap:8px; align-items:center; font-weight:600;"><input type="checkbox" ${sh.include ? 'checked' : ''} onchange="smartImport.sheets[${si}].include = this.checked; renderSmartImportMapping();" /> Sheet “${esc(sh.sheet)}”</label>
        <p class="cap" style="margin:6px 0;">I read this as <b>${layout}</b>, with <b>${children}</b> children${dates.length ? ', from <b>' + esc(dates[0]) + '</b> to <b>' + esc(dates[dates.length - 1]) + '</b>' : ''}.</p>
        ${needMonth ? `<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin:6px 0;"><span class="cap">The days are numbers only, so which month is this?</span>
          <select onchange="smartImport.sheets[${si}].monthGuess = Object.assign({}, smartImport.sheets[${si}].monthGuess, {month: +this.value}); renderSmartImportMapping();" style="padding:5px 8px; border:1px solid var(--border); border-radius:6px;">${monthOpts(sh.monthGuess ? sh.monthGuess.month : null)}${sh.monthGuess && sh.monthGuess.month !== undefined && sh.monthGuess.month !== null ? '' : '<option selected disabled>Choose…</option>'}</select>
          <input type="number" min="2020" max="2035" value="${sh.monthGuess && sh.monthGuess.year ? sh.monthGuess.year : ''}" placeholder="Year" onchange="smartImport.sheets[${si}].monthGuess = Object.assign({}, smartImport.sheets[${si}].monthGuess, {year: +this.value}); renderSmartImportMapping();" style="width:90px; padding:5px 8px; border:1px solid var(--border); border-radius:6px;" />
          ${sh.monthGuess && sh.monthGuess.month != null && sh.monthGuess.year ? '<span class="pill good">from the sheet</span>' : '<span class="pill warn">please choose</span>'}</div>` : ''}
        <div class="cap" style="margin:8px 0 4px;">What the marks mean:</div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">${values.map(v => `<label style="display:flex; align-items:center; gap:6px; border:1px solid ${sh.valueMap[v] === 'unknown' ? 'var(--crit,#d03b3b)' : 'var(--border)'}; border-radius:8px; padding:4px 8px; font-size:12.5px;">
          <b>“${esc(v)}”</b> <span class="dim">×${sh.valueCounts[v]}</span>
          <select onchange="smartImport.sheets[${si}].valueMap['${esc(v).replace(/'/g, "\\'")}'] = this.value; renderSmartImportMapping();" style="padding:3px 6px; border:1px solid var(--border); border-radius:6px; font-size:12px;">${meaningOpts(sh.valueMap[v])}</select></label>`).join('') || '<span class="cap">No marks found.</span>'}</div>
      </div>`;
    }).join('');
    const monthsMissing = smartImport.sheets.some(sh => sh.include && sh.sections.some(s => s.dateCols.some(d => !d.date)) && !(sh.monthGuess && sh.monthGuess.month != null && sh.monthGuess.year));
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 4px; font-weight:600;">Step 1 of 2 — check how I read “${esc(smartImport.fileName)}”</p>
      <p class="cap" style="margin:0;">Correct anything that's wrong. Marks with a red border are ones I don't recognise — choose what they mean.</p>
      ${cards}
      <label style="display:flex; gap:8px; align-items:flex-start; font-size:13px; margin:8px 0;"><input type="checkbox" ${smartImport.addMissing ? 'checked' : ''} onchange="smartImport.addMissing = this.checked" style="margin-top:3px;" /> <span>Synchronize children who are in the file but not yet on ${esc(myClassInfo.class_name || 'this class')}'s roll</span></label>
      <label style="display:flex; gap:8px; align-items:flex-start; font-size:13px; margin:8px 0;"><input type="checkbox" ${smartImport.markHolidays ? 'checked' : ''} onchange="smartImport.markHolidays = this.checked" style="margin-top:3px;" /> <span>Days marked as a holiday for the whole class become holidays on the register calendar</span></label>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn-primary" style="width:auto; padding:8px 16px;" onclick="renderSmartImportPreview()" ${unknownLeft || monthsMissing ? 'disabled title="Choose a meaning for every red mark and a month for every sheet first"' : ''}>Next — preview</button>
        <button class="btn" onclick="smartImport = null; document.getElementById('smartImportPanel').innerHTML = '';">Cancel</button>
        ${unknownLeft ? `<span class="cap" style="color:var(--crit,#d03b3b);">${unknownLeft} mark type${unknownLeft === 1 ? '' : 's'} still to choose</span>` : ''}${monthsMissing ? '<span class="cap" style="color:var(--crit,#d03b3b);"> Choose the month and year</span>' : ''}
      </div></div>`;
  }

  function renderSmartImportPreview(){
    const out = document.getElementById('smartImportPanel');
    const { byName, stats, identityIssues } = siCollect();
    const rollByName = {}, rollByRegister = {};
    (realPupilsCache || []).forEach(p => {
      const nameKey = normPupilName(p.name);
      (rollByName[nameKey] = rollByName[nameKey] || []).push(p);
      const registerKey = String(p.register_no || '').trim();
      if(registerKey) (rollByRegister[registerKey] = rollByRegister[registerKey] || []).push(p);
    });
    const matchImportedPupil = r => {
      const registerMatches = r.register_no ? (rollByRegister[String(r.register_no)] || []) : [];
      if(registerMatches.length === 1) return registerMatches[0];
      const nameMatches = rollByName[normPupilName(r.name)] || [];
      return nameMatches.length === 1 ? nameMatches[0] : null;
    };
    const all = Object.values(byName);
    const safeAll = all.filter(r => !identityIssues.problemKeys.has(r._identityKey));
    const matched = safeAll.filter(r => matchImportedPupil(r));
    const missing = safeAll.filter(r => !matchImportedPupil(r));
    const regUpdates = matched.map(r => ({ p: matchImportedPupil(r), reg: r.register_no })).filter(x => x.reg && String(x.p.register_no || '') !== x.reg).map(x => ({ id: x.p.id, name: x.p.name, register_no: x.reg }));
    // Whole-class holiday days: every child who has a mark that day has H.
    const dayMarks = {};
    safeAll.forEach(r => Object.entries(r.attendance).forEach(([d, m]) => { (dayMarks[d] = dayMarks[d] || []).push(m); }));
    const holidayDays = Object.entries(dayMarks).filter(([d, ms]) => ms.length >= 2 && ms.every(m => m === 'holiday') && !studentHolidays[d]).map(([d]) => d).sort();
    const counted = list => list.reduce((a, r) => { Object.values(r.attendance).forEach(m => { if(m === 'present') a.p++; else if(m === 'absent') a.a++; }); return a; }, { p: 0, a: 0 });
    const saving = counted(smartImport.addMissing ? safeAll : matched);
    smartImport.collected = { byName, safeAll, matched, missing, holidayDays, regUpdates, identityIssues };
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 8px; font-weight:600;">Step 2 of 2 — preview. Nothing has been saved yet.</p>
      ${siRegisterIdentityIssueHtml(identityIssues)}
      <p style="margin:0 0 6px;"><b>${matched.length}</b> child${matched.length === 1 ? ' is' : 'ren are'} already on ${esc(myClassInfo.class_name || 'this class')}'s roll.${regUpdates.length ? ` Their register numbers will be saved for <b>${regUpdates.length}</b>, so the class is listed in register order.` : ''}</p>
      ${all.some(r => r.register_no) ? '' : '<p class="cap" style="margin:0 0 6px;">No register numbers were found in this file (a "Register No" / "GR No" column, or a number written before each name). The class stays in its current order.</p>'}
      ${missing.length ? `<p style="margin:0 0 6px;"><b style="color:${smartImport.addMissing ? 'var(--good,#0a7a0a)' : 'var(--crit,#d03b3b)'};">${missing.length} not on the roll</b> — ${smartImport.addMissing ? 'will be added' : 'will be <b>skipped</b>'}: <span class="cap">${missing.slice(0, 40).map(r => esc(r.name)).join(', ')}${missing.length > 40 ? ' …' : ''}</span></p>` : ''}
      <p style="margin:0 0 6px;">Will save <b>${saving.p}</b> present and <b>${saving.a}</b> absent marks (they replace anything already saved for that child and day).</p>
      ${smartImport.markHolidays && holidayDays.length ? `<p style="margin:0 0 6px;"><b>${holidayDays.length}</b> day${holidayDays.length === 1 ? '' : 's'} will be marked as holidays: <span class="cap">${holidayDays.map(esc).join(', ')}</span></p>` : ''}
      <p class="cap" style="margin:0 0 6px;">${stats.future ? stats.future + ' marks dated after today are left out. ' : ''}${stats.ignored ? stats.ignored + ' marks set to "Ignore" are left out. ' : ''}${stats.noDate ? stats.noDate + ' marks had no readable date and are left out. ' : ''}</p>
      <label style="display:flex; gap:8px; align-items:center; font-size:13px; margin:8px 0;"><input type="checkbox" id="smartImportRemember" checked /> Remember my choices for files laid out like this one</label>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
        <button class="btn-primary" style="width:auto; padding:8px 16px;" onclick="confirmSmartImport()" ${!identityIssues.hasBlocking && (saving.p + saving.a || (smartImport.addMissing && missing.length) || regUpdates.length) ? '' : 'disabled'}>Confirm import</button>
        <button class="btn" onclick="renderSmartImportMapping()">Back</button>
      </div></div>`;
  }

  async function confirmSmartImport(){
    const out = document.getElementById('smartImportPanel');
    const c = smartImport && smartImport.collected;
    if(!c) return;
    if(c.identityIssues && c.identityIssues.hasBlocking){
      out.innerHTML = siRegisterIdentityIssueHtml(c.identityIssues) + '<button class="btn" style="margin-top:8px;" onclick="smartImport = null; document.getElementById(\'smartImportPanel\').innerHTML = \'\';">Choose the corrected workbook</button>';
      return;
    }
    const remember = !!(document.getElementById('smartImportRemember') || {}).checked;
    try{
      let added = 0, reactivated = 0, updated = 0;
      const toAdd = smartImport.addMissing ? c.missing : [];
      if(toAdd.length || (c.regUpdates && c.regUpdates.length)){
        out.innerHTML = '<p class="sub">Updating the roll…</p>';
        const res = await fetch(pupilApiUrl('backend/pupils/sync_class_pupils.php'), {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ class_id: myClassInfo.class_id, add: toAdd.map(r => ({ name: r.name, register_no: r.register_no || '', admitted_date: Object.keys(r.attendance).sort()[0] || todayDateKey() })), remove_ids: [],
            register_updates: (c.regUpdates || []).map(u => ({ id: u.id, register_no: u.register_no })) })
        });
        const data = await res.json();
        if(data.status !== 'success') throw new Error(data.message || 'Could not add the children.');
        added = data.added;
        reactivated = data.reactivated || 0;
        updated = data.updated || 0;
        if(Array.isArray(data.pupils)) applyCanonicalPupilRoster(data.pupils);
        else { realPupilsCache = null; await fetchMyPupils(); }
        if(!Array.isArray(realPupilsCache)) throw new Error('The children were added, but the roll could not be reloaded — press Confirm again (nothing will be added twice).');
      }
      const rollByName = {}, rollByRegister = {};
      realPupilsCache.forEach(p => {
        const nameKey = normPupilName(p.name);
        (rollByName[nameKey] = rollByName[nameKey] || []).push(p);
        const registerKey = String(p.register_no || '').trim();
        if(registerKey) (rollByRegister[registerKey] = rollByRegister[registerKey] || []).push(p);
      });
      const matchImportedPupil = r => {
        const registerMatches = r.register_no ? (rollByRegister[String(r.register_no)] || []) : [];
        if(registerMatches.length === 1) return registerMatches[0];
        const nameMatches = rollByName[normPupilName(r.name)] || [];
        return nameMatches.length === 1 ? nameMatches[0] : null;
      };
      const marks = [];
      (c.safeAll || Object.values(c.byName)).forEach(r => {
        const pupil = matchImportedPupil(r); if(!pupil) return;
        Object.entries(r.attendance).forEach(([date, m]) => { if(m === 'present' || m === 'absent') marks.push({ pupil_id: pupil.id, date, status: m }); });
      });
      let saved = 0;
      for(let i = 0; i < marks.length; i += 400){
        const box = document.getElementById('smartImportPanel'); if(box) box.innerHTML = `<p class="sub">Saving marks… ${Math.min(i + 400, marks.length)} of ${marks.length}</p>`;
        const res = await fetch('backend/attendance/save_attendance.php' + window.location.search, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ class_id: myClassInfo.class_id, marks: marks.slice(i, i + 400) }) });
        const data = await res.json();
        if(data.status !== 'success') throw new Error((data.message || 'Could not save marks.') + ' (' + saved + ' were saved before this.)');
        saved += data.saved || 0;
      }
      let holidays = 0;
      if(smartImport.markHolidays){
        for(const d of c.holidayDays){
          studentHolidays[d] = 'Holiday (from imported register)';
          await fetch('backend/daily_plan/save_student_holiday.php' + window.location.search, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ class_id: myClassInfo.class_id, holiday_date: d, holiday_name: 'Holiday (from imported register)' }) }).catch(() => {});
          holidays++;
        }
        if(holidays && typeof saveStudentHolidays === 'function') saveStudentHolidays();
      }
      if(remember){
        const maps = siRememberedMaps();
        smartImport.sheets.filter(s => s.include && s.fingerprint).forEach(s => {
          maps[s.fingerprint] = { values: Object.fromEntries(Object.entries(s.valueMap).filter(([, m]) => m !== 'unknown')) };
        });
        try { localStorage.setItem('smartImportMaps', JSON.stringify(maps)); } catch(e){}
      }
      smartImport = null;
      Object.keys(attendanceMonthStatus).forEach(k => delete attendanceMonthStatus[k]);
      alert('Import finished: ' + [added ? added + ' children added' : '', reactivated ? reactivated + ' restored with earlier records' : '', updated ? updated + ' pupil details updated' : '', saved + ' attendance marks saved', holidays ? holidays + ' holidays marked' : ''].filter(Boolean).join(', ') + '.');
      renderAttendanceBody();
    } catch(err){
      const box = document.getElementById('smartImportPanel');
      if(box) box.innerHTML = `<div class="au-error">${esc(err.message)}</div><button class="btn" style="margin-top:8px;" onclick="renderSmartImportPreview()">Back to preview</button>`;
    }
  }

  function renderSmartImportCard(){
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'padding:16px 18px; margin:0 0 20px;';
    card.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div style="flex:1; min-width:240px;">
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import attendance from any file</h3>
          <p class="cap" style="margin:0;">Your register in any layout — .xlsx, .xls or .csv, one sheet or one per month. I work out the names, dates and marks, you check, then it's saved to ${esc(myClassInfo.class_name || 'this class')}.</p>
        </div>
        <button class="btn-primary" style="width:auto; padding:10px 20px;" onclick="smartImportChoose()">📥 Import a file</button>
      </div>
      <div id="smartImportPanel" style="margin-top:12px; word-break:break-word; overflow-wrap:anywhere;"></div>`;
    return card;
  }

  // Holds the parsed, validated result of the last previewed file until
  // the teacher confirms or cancels — nothing is saved until then.
 window.pendingAttendanceImport =
  window.pendingAttendanceImport ?? null;

  async function previewAttendanceFile(){
    const input = document.getElementById('attendanceImportInput');
    const monthSelect = document.getElementById('attendanceImportMonthSelect');
    const expectedYearMonth = monthSelect ? monthSelect.value : null; // 'YYYY-MM'
    const resultEl = document.getElementById('attendanceImportResult');
    pendingAttendanceImport = null;
    if(!input.files.length){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    if(!Array.isArray(realPupilsCache)){
      resultEl.innerHTML = '<div class="au-error">Still loading pupils — try again in a moment.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Reading file…</p>';

    let rows;
    try{
      rows = await readAssessmentFileRows(input.files[0]);
    } catch(err){
      resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`;
      return;
    }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }

    const header = rows[0].map(h => h.trim());
    if(header[0].toLowerCase() !== 'name'){
      resultEl.innerHTML = '<div class="au-error">The first column header must be exactly "name".</div>';
      return;
    }
    const dateColumns = header.slice(1);
    const badDateCols = dateColumns.filter(d => !/^\d{4}-\d{2}-\d{2}$/.test(d));
    if(badDateCols.length){
      resultEl.innerHTML = `<div class="au-error">These column headers aren't valid YYYY-MM-DD dates: ${esc(badDateCols.join(', '))}</div>`;
      return;
    }
    if(!dateColumns.length){
      resultEl.innerHTML = '<div class="au-error">No date columns found after "name".</div>';
      return;
    }

    // Any date column outside the selected month is flagged and
    // excluded entirely, rather than silently imported into the wrong
    // month's records.
    const monthMismatchCols = expectedYearMonth ? dateColumns.filter(d => d.slice(0, 7) !== expectedYearMonth) : [];
    const validDateColumns = expectedYearMonth ? dateColumns.filter(d => d.slice(0, 7) === expectedYearMonth) : dateColumns;
    if(!validDateColumns.length){
      resultEl.innerHTML = `<div class="au-error">None of this file's date columns fall in the selected month (${esc(expectedYearMonth)}). Choose the correct month, or check the file.</div>`;
      return;
    }

    const marks = [];
    const skipped = [];
    if(monthMismatchCols.length){
      skipped.push(`${monthMismatchCols.length} date column(s) outside the selected month, excluded entirely: ${monthMismatchCols.join(', ')}`);
    }
    const perChild = {}; // name -> {present, absent}
    for(let i = 1; i < rows.length; i++){
      const rowNum = i + 1;
      const rawName = (rows[i][0] || '').trim();
      if(!rawName) continue;
      const pupil = realPupilsCache.find(p => p.name === rawName);
      if(!pupil){ skipped.push(`Row ${rowNum}: "${rawName}" is not a child currently on the roll — not imported`); continue; }
      validDateColumns.forEach(dateStr => {
        const colIdx = dateColumns.indexOf(dateStr);
        const cell = (rows[i][colIdx + 1] || '').trim().toUpperCase();
        if(!cell) return;
        if(cell !== 'P' && cell !== 'A'){ skipped.push(`Row ${rowNum}, ${dateStr}: "${cell}" isn't P or A — cell skipped`); return; }
        marks.push({ pupil_id: pupil.id, date: dateStr, status: cell === 'P' ? 'present' : 'absent' });
        if(!perChild[rawName]) perChild[rawName] = { present: 0, absent: 0 };
        perChild[rawName][cell === 'P' ? 'present' : 'absent']++;
      });
    }

    if(!marks.length){
      resultEl.innerHTML = `<div class="au-error">Nothing valid to import.${skipped.length ? '<br/>' + skipped.slice(0, 10).map(s => esc(s)).join('<br/>') : ''}</div>`;
      return;
    }

    pendingAttendanceImport = { marks, skipped, dateColumns: validDateColumns };
    const childNames = Object.keys(perChild);
    const dateRange = validDateColumns.length > 1 ? `${validDateColumns[0]} to ${validDateColumns[validDateColumns.length-1]}` : validDateColumns[0];

    let previewHtml = `<div style="border:1px solid var(--border); border-radius:8px; padding:14px; margin-top:4px;">
      <p style="margin:0 0 10px; font-weight:600;">Preview — nothing has been saved yet</p>
      <p class="cap" style="margin:0 0 10px;">${marks.length} marks ready, across ${childNames.length} children and ${validDateColumns.length} date(s) (${esc(dateRange)}).</p>`;

    previewHtml += '<div class="report-table-wrap" style="max-height:280px; overflow-y:auto;"><table class="report-table"><thead><tr><th>Child</th><th>Present</th><th>Absent</th></tr></thead><tbody>';
    childNames.slice(0, 30).forEach(name => {
      previewHtml += `<tr><td>${esc(name)}</td><td>${perChild[name].present}</td><td>${perChild[name].absent}</td></tr>`;
    });
    previewHtml += '</tbody></table></div>';
    if(childNames.length > 30) previewHtml += `<p class="cap" style="margin:6px 0 0;">…and ${childNames.length - 30} more children</p>`;

    if(skipped.length){
      previewHtml += `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:10px 12px; margin-top:10px; font-size:12.5px;">${skipped.length} row/cell(s) will be skipped:<br/>${skipped.slice(0, 15).map(s => esc(s)).join('<br/>')}${skipped.length > 15 ? '<br/>…and ' + (skipped.length - 15) + ' more' : ''}</div>`;
    }

    previewHtml += `<div style="display:flex; gap:8px; margin-top:14px;">
        <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="confirmAttendanceImport()">Confirm import — save ${marks.length} marks</button>
        <button style="padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer;" onclick="cancelAttendanceImport()">Cancel</button>
      </div>
    </div>`;
    resultEl.innerHTML = previewHtml;
  }

  function cancelAttendanceImport(){
    pendingAttendanceImport = null;
    const resultEl = document.getElementById('attendanceImportResult');
    if(resultEl) resultEl.innerHTML = '<p class="cap">Import cancelled — nothing was saved.</p>';
  }

  async function confirmAttendanceImport(){
    const resultEl = document.getElementById('attendanceImportResult');
    if(!pendingAttendanceImport){
      resultEl.innerHTML = '<div class="au-error">Nothing to confirm — preview a file first.</div>';
      return;
    }
    const { marks, skipped } = pendingAttendanceImport;
    resultEl.innerHTML = '<p class="sub">Saving ' + marks.length + ' marks…</p>';
    try{
      const res = await fetch('backend/attendance/save_attendance.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, marks })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`;
        return;
      }
      Object.keys(attendanceMonthStatus).forEach(k => delete attendanceMonthStatus[k]);
      let html = `<div class="au-success">Imported ${data.saved} of ${marks.length} marks.</div>`;
      if(skipped.length) html += `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:12px 14px; margin-top:6px; font-size:13px;">${skipped.length} skipped:<br/>${skipped.slice(0, 20).map(s => esc(s)).join('<br/>')}${skipped.length > 20 ? '<br/>…and ' + (skipped.length - 20) + ' more' : ''}</div>`;
      resultEl.innerHTML = html;
      alert(`Imported ${data.saved} of ${marks.length} attendance marks.` + (skipped.length ? ` ${skipped.length} skipped — see the details below.` : ''));
      pendingAttendanceImport = null;
      renderAttendanceBody();
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }

 function renderAttendanceBody(){

  if(!markAttSelectedDate){
    markAttSelectedDate =
      todayDateKey();
  }

  const container =
    document.getElementById(
      window.attendanceEntryTargetId ||
      'attendance-body'
    );

  if(!container){
    console.error(
      'Attendance container not found.'
    );
    return;
  }

  /*
    IMPORTANT:
    renderAttendanceBody() can be called repeatedly after
    pupils/attendance data finishes loading.

    Always clear the existing register before rebuilding it.
  */
  container.innerHTML = '';


  // Real pupils loading
  if(realPupilsCache === null){

    fetchMyPupils();

    container.innerHTML =
      '<p class="cap">Loading pupils…</p>';

    return;
  }


  if(realPupilsCache === 'loading'){

    container.innerHTML =
      '<p class="cap">Loading pupils…</p>';

    return;
  }


  if(
    typeof realPupilsCache === 'string' &&
    realPupilsCache.startsWith('error:')
  ){

    container.innerHTML =
      `<p class="cap"
          style="color:var(--danger,#c8433f);">
        ${esc(realPupilsCache.slice(6))}
      </p>`;

    return;
  }


  const year =
    markAttYear;

  const month =
    markAttMonth;


  if(
    !ensureAttendanceMonthLoadedFor(
      year,
      month,
      container,
      renderAttendanceBody
    )
  ){
    return;
  }


  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();


  const monthName =
    new Date(
      year,
      month,
      1
    ).toLocaleDateString(
      [],
      {
        month: 'long',
        year: 'numeric'
      }
    );


  const heading =
    document.createElement(
      'div'
    );


  heading.innerHTML = `
    <h1 style="margin:0 0 4px;">
      Mark attendance
    </h1>

    <p
      class="cap"
      style="margin-bottom:14px;"
    >
      Mark today's register below,
      or pick a different day from
      the calendar further down.
    </p>
  `;


  container.appendChild(
    heading
  );


  // ---- One import button for attendance files of any layout
  // (Smart Import). The older fixed-format importers are no longer
  // shown here — this one reads their layouts too. ----
  container.appendChild(renderSmartImportCard());
  container.appendChild(renderClassPupilImportCard());

  renderAttendanceRegisterForDay(
    container,
    markAttSelectedDate
  );


  /* Everything below this point is administrative/reporting content,
     not the daily task itself — grouped into clearly labeled,
     collapsed-by-default sections (same convention as "See reports")
     instead of all showing inline, so this screen defaults to being
     short and each section is visually distinct rather than
     everything blending together on one long page. */

  // ---- Pick a different day (calendar) ----
  const pickDayToggleCard = document.createElement('div');
  pickDayToggleCard.className = 'card'; pickDayToggleCard.style.cssText = 'padding:0; margin-top:14px; overflow:hidden;';
  pickDayToggleCard.innerHTML = `
    <div onclick="classAttendancePickDayOpen = !classAttendancePickDayOpen; this.nextElementSibling.classList.toggle('hidden', !classAttendancePickDayOpen); this.querySelector('.chevron').style.transform = classAttendancePickDayOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
         style="display:flex; align-items:center; justify-content:space-between; padding:16px 18px; cursor:pointer;">
      <div>
        <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📅 Pick a different day</h3>
        <p class="cap" style="margin:0;">Open or correct a past day's register — currently open: ${markAttSelectedDate === todayDateKey() ? 'Today' : esc(markAttSelectedDate)}.</p>
      </div>
      <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${classAttendancePickDayOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
    </div>
    <div class="${classAttendancePickDayOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
  `;
  container.appendChild(pickDayToggleCard);
  const pickDayBody = pickDayToggleCard.querySelector('div:last-child');

    // --- Pick a day (calendar), for opening or correcting another day ---
    const reqTag = document.createElement('p'); reqTag.className = 'cap'; reqTag.style.cssText = 'text-align:right; margin:0 0 6px;'; reqTag.innerHTML = '<span class="reqs">REG-02 · CAL-04</span>';
    pickDayBody.appendChild(reqTag);
    const nav = document.createElement('div');
    nav.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:10px;';
    nav.innerHTML = `<button onclick="shiftMarkAttMonth(-1)" style="padding:4px 10px; border:1px solid var(--border); border-radius:6px; background:#fff; cursor:pointer;">‹</button>
      <b>${esc(monthName)}</b>
      <button onclick="shiftMarkAttMonth(1)" style="padding:4px 10px; border:1px solid var(--border); border-radius:6px; background:#fff; cursor:pointer;">›</button>`;
    pickDayBody.appendChild(nav);

    const weekLabels = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:grid; grid-template-columns:repeat(7,1fr); gap:8px; margin-bottom:6px; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase;';
    headerRow.innerHTML = weekLabels.map(l => `<div>${l}</div>`).join('');
    pickDayBody.appendChild(headerRow);

    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Sun=0 -> Mon-first layout
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(7,1fr); gap:8px; margin-bottom:10px;';
    for(let i = 0; i < startWeekday; i++) grid.appendChild(document.createElement('div'));

    for(let d = 1; d <= daysInMonth; d++){
      const dateStr = ymd(year, month, d);
      const dow = new Date(year, month, d).getDay();
      const holidayName = complianceHolidayName(year, month, d) || studentHolidays[dateStr];
      const isSelected = dateStr === markAttSelectedDate;
      const dayRecords = attendanceRecords[dateStr] || null;
      // Present count specifically — NOT every marked child. A day
      // with 1 absence out of 5 shows 4/5, not 5/5 (5/5 would say
      // everyone was present, which isn't what happened).
      // Only counts pupils actually on roll by this date, same REG-14
      // rule the register itself enforces below.
      const onRollThisDay = realPupilsCache.filter(p => !p.admitted_date || p.admitted_date <= dateStr);
      const presentCount = dayRecords ? onRollThisDay.filter(p => dayRecords[p.id] === 'present').length : 0;
      const anyMarked = dayRecords ? onRollThisDay.some(p => dayRecords[p.id]) : false;

      let bg = '#fff', body = '', clickable = false;
      if(holidayName){
        bg = '#fdf1e3'; body = '🎉 ' + esc(holidayName);
        clickable = true; // still selectable, to view/remove the holiday for that day
      } else if(dow === 0){
        bg = '#f4f4f2'; body = 'Sunday';
      } else if(dow === 6 && isLastSaturday(year, month, d, daysInMonth)){
        bg = '#e8f1fb'; body = 'Last Saturday — monthly holiday';
      } else if(dow === 6){
        bg = '#e8f1fb'; body = 'Saturday — no children';
      } else {
        clickable = true;
        body = anyMarked
          ? `<span style="display:inline-block; padding:2px 8px; border-radius:6px; background:var(--success); color:#fff; font-weight:600;">${presentCount}/${onRollThisDay.length}</span>`
          : `<span class="cap">—</span>`;
      }

      const cell = document.createElement('div');
      cell.style.cssText = `background:${bg}; border:1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}; ${isSelected ? 'box-shadow:0 0 0 2px var(--primary-light);' : ''} border-radius:8px; padding:10px; min-height:64px; font-size:12px; ${clickable ? 'cursor:pointer;' : ''}`;
      if(clickable) cell.onclick = () => { markAttSelectedDate = dateStr; classAttendancePickDayOpen = true; renderAttendanceBody(); };
      cell.innerHTML = `<div style="font-weight:600; margin-bottom:4px;">${d}${dateStr === todayDateKey() ? ' · Today' : ''}</div><div>${body}</div>`;
      grid.appendChild(cell);
    }
    pickDayBody.appendChild(grid);

    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex; flex-wrap:wrap; gap:16px; font-size:12px; color:var(--text-muted);';
    legend.innerHTML = `
      <span><i style="display:inline-block; width:10px; height:10px; background:var(--success); margin-right:5px; border-radius:2px;"></i>Present count / roll</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#e8f1fb; margin-right:5px; border-radius:2px;"></i>Saturday — no children</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#f4f4f2; margin-right:5px; border-radius:2px;"></i>Sunday</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#fdf1e3; margin-right:5px; border-radius:2px;"></i>Holiday</span>
    `;
    pickDayBody.appendChild(legend);

  // ---- Who needs a follow-up — two square cards, always visible ----
  const followUpWrap = document.createElement('div');
  followUpWrap.style.marginTop = '22px';
  container.appendChild(followUpWrap);
  renderAttendanceFollowUp(followUpWrap, year, month, markAttSelectedDate);

    // Collapsed by default — the register/report view is real and
    // useful, but showing it inline by default makes this screen very
    // long; tapping "See reports" opens it, same collapsible-card
    // convention used elsewhere in this app (e.g. Monthly Effective's
    // "What the portal will print").
    const reportsToggleCard = document.createElement('div');
    reportsToggleCard.className = 'card'; reportsToggleCard.style.cssText = 'padding:0; margin-top:20px; overflow:hidden;';
    reportsToggleCard.innerHTML = `
      <div onclick="classAttendanceReportsOpen = !classAttendanceReportsOpen; this.nextElementSibling.classList.toggle('hidden', !classAttendanceReportsOpen); this.querySelector('.chevron').style.transform = classAttendanceReportsOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:16px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📊 See reports</h3>
          <p class="cap" style="margin:0;">The weekly/monthly attendance register, generated from what's actually been marked above.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${classAttendanceReportsOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${classAttendanceReportsOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    container.appendChild(reportsToggleCard);
    const registerGridContainer = document.createElement('div');
    reportsToggleCard.querySelector('div:last-child').appendChild(registerGridContainer);
    renderAttendanceRegister(registerGridContainer);

    // Keep the dashboard's "Class attendance today" tile in sync —
    // always TODAY specifically, regardless of which day is open above.
    const todaysRecords = attendanceRecords[todayDateKey()] || {};
    const todaysPresent = realPupilsCache.filter(p => todaysRecords[p.id] === 'present').length;
    const classAttendEl = document.getElementById('classAttendanceValue');
    if(classAttendEl) classAttendEl.textContent = todaysPresent + '/' + assessmentPupilNames().length;
  }

  function shiftMarkAttMonth(delta){
    markAttMonth += delta;
    if(markAttMonth > 11){ markAttMonth = 0; markAttYear++; }
    if(markAttMonth < 0){ markAttMonth = 11; markAttYear--; }
    renderAttendanceBody();
  }
