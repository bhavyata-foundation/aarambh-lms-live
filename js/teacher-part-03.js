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
  // Rows that are not children: a crossed-out / struck entry, or a note
  // written entirely in brackets, e.g. "(Crossed out in source)", "(left)".
  function siNotAChild(name){
    const t = String(name || '').trim();
    return /crossed\s*out|struck\s*off|strike\s*through|cancel+ed|^\s*[(\[{].*[)\]}]\s*$/i.test(t);
  }
  function siText(v){ return v instanceof Date ? '' : String(v == null ? '' : v).trim(); }
  function siNorm(v){ return siText(v).toLowerCase().replace(/\s+/g, ' ').replace(/[:.]$/, ''); }
  function siYmd(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
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
      const regPick = pickRegisterColumn(s.headerCells, grid.slice(s.headerRow + 1, end).map(r => (r || []).map(siText)), [s.nameCol, ...s.dateCols.map(d => d.col)]);
      if(regPick >= 0){ s.regCol = regPick; if(s.rollCol === regPick) s.rollCol = -1; }
      for(let r = s.headerRow + 1; r < end; r++){
        const row = grid[r] || [];
        // A register number may be in its own column, or written in front
        // of the name ("1234 Avani Suryavanshi") — either way it is kept.
        const split = splitRegisterFromName(siText(row[s.nameCol]));
        const name = split.name;
        const regRaw = s.regCol >= 0 ? siText(row[s.regCol]).replace(/\.0+$/, '') : '';
        const regCell = window.NameMatch && NameMatch.registerFrom ? NameMatch.registerFrom(regRaw) : regRaw; // a student ID gives its register no
        const reg = /^\d{1,6}$/.test(regCell) ? regCell : split.register_no;
        if(!name || SI_TOTAL_WORDS.test(name) || /^\d+([.,]\d+)?%?$/.test(name) || siNotAChild(name)) continue;
        if(s.rollCol >= 0 && siText(row[s.rollCol]) && !/^\d+$/.test(siText(row[s.rollCol]))) continue; // sub-headings in the roll column
        const marks = s.dateCols.map(d => { countValue(row[d.col]); return row[d.col]; });
        // a child listed with nothing marked (e.g. no June marks yet) is kept: no marks are saved
        // for it, but the child is matched — and brought back if taken off the roll
        s.rows.push({ name, reg, marks, empty: marks.every(m => !siText(m)) });
      }
    });
    if(out.long){
      const L = out.long; L.rows = [];
      for(let r = L.headerRow + 1; r < grid.length; r++){
        const row = grid[r] || [];
        const lsplit = splitRegisterFromName(siText(row[L.nameCol]));
        const name = lsplit.name;
        const d = siReadDateCell(row[L.dateCol]);
        if(!name || !d || !d.date || siNotAChild(name)) continue;
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
    const put = (sheet, name, date, raw, reg) => {
      const meaning = sheet.valueMap[siNorm(raw)] || (siText(raw) ? 'unknown' : 'blank');
      if(meaning === 'blank') return;
      if(!date){ stats.noDate++; return; }
      if(meaning === 'unknown'){ stats.unknown++; return; }
      if(meaning === 'ignore'){ stats.ignored++; return; }
      if(date > today){ stats.future++; return; }
      const key = normPupilName(name);
      const rec = byName[key] || (byName[key] = { name, register_no: '', attendance: {} });
      if(reg && !rec.register_no) rec.register_no = reg;
      rec.attendance[date] = meaning;
      stats[meaning]++;
    };
    smartImport.sheets.filter(s => s.include).forEach(sheet => {
      sheet.sections.forEach(s => { const dates = siSectionDates(sheet, s); s.rows.forEach(r => r.marks.forEach((m, i) => put(sheet, r.name, dates[i], m, r.reg))); });
      if(sheet.long) sheet.long.rows.forEach(r => put(sheet, r.name, r.date, r.mark, r.reg));
      // every child LISTED counts, with marks or not: a child with an empty row (e.g. no June
      // marks yet) who was taken off the roll is still shown — and brought back — instead of skipped
      sheet.sections.forEach(s => s.rows.forEach(r => {
        const nm = String(r.name || '').trim(); if(!nm || SI_TOTAL_WORDS.test(nm)) return;
        const key = normPupilName(nm), rec = byName[key] || (byName[key] = { name: nm, register_no: '', attendance: {} });
        if(r.reg && !rec.register_no) rec.register_no = r.reg;
      }));
    });
    return { byName, stats };
  }
  async function smartImportChoose(mode){
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.xlsx,.xls,.csv';
    input.onchange = () => { const file = input.files[0]; if(file) smartImportFromFile(mode, file); };
    input.click();
  }
  // Reads a register / class-list file into the import (also used by the AI photo reader, js/ai-photo-reader.js)
  async function smartImportFromFile(mode, file){
    {
      if(!importFileTypeOk(file)) return;
      if(typeof XLSX === 'undefined'){ alert('The spreadsheet reader did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
      const out = siPanel();
      out.innerHTML = '<p class="sub">Reading ' + esc(file.name) + '…</p>';
      try{
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        if(mode === 'roll'){
          // Admissions: the file is read as a list of children only.
          const lists = wb.SheetNames.map(n => siClassListRows(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }))).filter(Boolean);
          if(!lists.length){ importRefuse(out, ['No column for the children\u2019s names was found (it must be headed Name or Student Name).']); return; }
          lists.sort((a, b) => b.names - a.names);
          if(lists[0].rows.length < 2){ importRefuse(out, ['There is a Name column, but no children are listed under it.']); return; }
          renderSmartClassListStep(file.name, lists[0].rows); return;
        }
        const sheets = wb.SheetNames.map(n => siAnalyseSheet(n, XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' })));
        if(!sheets.some(s => s.include)){
          // No attendance marks anywhere — is it a list of children instead?
          const lists = wb.SheetNames.map(n => siClassListRows(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }))).filter(Boolean);
          if(lists.length){ lists.sort((a, b) => b.names - a.names); renderSmartClassListStep(file.name, lists[0].rows); return; }
        }
        if(!sheets.some(s => s.include)){
          const hasNames = wb.SheetNames.some(n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }).slice(0, 20).some(r => r.some(c => SI_NAME_WORDS.includes(siNorm(c)))));
          importRefuse(out, hasNames ? ['There is a Name column, but no day columns (1, 2, 3 … 31 or dates) with P / A / H marks.'] : ['This doesn\u2019t look like an attendance register or a class list.', 'No column for the children\u2019s names (Name / Student Name) and no day columns (1 … 31) were found.']);
          return;
        }
        {
          // another class's register? (only checked when this class already has children)
          const names = sheets.filter(s => s.include).flatMap(s => s.sections.flatMap(x => x.rows.map(r => r.name)));
          if((realPupilsCache || []).length && names.length && importRollMatches(names) === 0){ importRefuse(out, ['None of the ' + names.length + ' names in this file match the children of ' + (myClassInfo.class_name || 'this class') + '.', 'Is this another class\u2019s register? Log in as that class to import it.']); return; }
        }
        if(!sheets.some(s => s.include)){ out.innerHTML = '<div class="au-error">I couldn\'t find an attendance grid in this file — it needs a column of children\'s names and a row of dates or day numbers (or a list with name, date and mark columns).</div>'; return; }
        smartImport = { fileName: file.name, sheets, addMissing: !(Array.isArray(realPupilsCache) && realPupilsCache.length), markHolidays: true };
        renderSmartImportMapping();
      } catch(err){ out.innerHTML = `<div class="au-error">Could not read this file: ${esc(err.message || err)}</div>`; }
    }
  }
  function renderSmartImportMapping(){
    const out = siPanel();
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
      <label style="display:flex; gap:8px; align-items:flex-start; font-size:13px; margin:8px 0;"><input type="checkbox" ${smartImport.addMissing ? 'checked' : ''} onchange="smartImport.addMissing = this.checked" style="margin-top:3px;" /> <span>Add children who are in the file but not yet on ${esc(myClassInfo.class_name || 'this class')}'s roll</span></label>
      <label style="display:flex; gap:8px; align-items:flex-start; font-size:13px; margin:8px 0;"><input type="checkbox" ${smartImport.markHolidays ? 'checked' : ''} onchange="smartImport.markHolidays = this.checked" style="margin-top:3px;" /> <span>Days marked as a holiday for the whole class become holidays on the register calendar</span></label>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn-primary" style="width:auto; padding:8px 16px;" onclick="renderSmartImportPreview()" ${unknownLeft || monthsMissing ? 'disabled title="Choose a meaning for every red mark and a month for every sheet first"' : ''}>Next — preview</button>
        <button class="btn" onclick="smartImport = null; siPanel().innerHTML = '';">Cancel</button>
        ${unknownLeft ? `<span class="cap" style="color:var(--crit,#d03b3b);">${unknownLeft} mark type${unknownLeft === 1 ? '' : 's'} still to choose</span>` : ''}${monthsMissing ? '<span class="cap" style="color:var(--crit,#d03b3b);"> Choose the month and year</span>' : ''}
      </div></div>`;
  }
  // Which child each name in the file is. js/name-match.js handles spelling
  // differences; the teacher's own choices always win. Guesses are NOT used
  // until she confirms them; nothing is ever added twice under another spelling.
  // Children of this class who were taken off the roll (roll_tools.php "removed"), fetched once per import
  function siOffRoll(){
    if(!smartImport) return [];
    if(Array.isArray(smartImport._offRoll)) return smartImport._offRoll;
    if(!smartImport._offRollAsked){
      smartImport._offRollAsked = true;
      fetch('backend/pupils/roll_tools.php' + window.location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'removed', class_id: myClassInfo.class_id }) })
        .then(r => r.json()).then(d => { if(!smartImport) return; smartImport._offRoll = (d && d.status === 'success' && Array.isArray(d.children)) ? d.children : []; if(siPanel() && /Step 2 of 2/.test(siPanel().textContent)) renderSmartImportPreview(); })
        .catch(() => { if(smartImport) smartImport._offRoll = []; });
    }
    return [];
  }
  function siResolveNames(all){
    const choice = smartImport.nameChoice = smartImport.nameChoice || {};
    const typed = smartImport.nameEdit = smartImport.nameEdit || {};   // ✎ Edit: the spelling she typed for a name in the file
    const roll = realPupilsCache || [], taken = new Set(), takenBy = {}, plain = n => normPupilName(n);
    const nameOf = r => typed[r.name] || r.name;
    // children named exactly (or chosen by the teacher) first, so a guess can't take them
    const first = r => choice[r.name] ? 0 : roll.some(p => plain(p.name) === plain(nameOf(r))) ? 1 : 2;
    all.slice().sort((a, b) => first(a) - first(b)).forEach(r => {
      r._pupil = null; r._how = ''; r._suggest = null; r._maybe = null; r._alts = []; r._takenHint = null; r._back = null; r._typed = typed[r.name] || '';
      const c = choice[r.name];
      if(c === 'skip' || c === 'add') return;
      if(c){ const p = roll.find(x => String(x.id) === String(c)); if(p && !taken.has(p.id)){ r._pupil = p; r._how = 'chosen'; taken.add(p.id); takenBy[p.id] = r.name; return; } }
      const m = window.NameMatch ? NameMatch.find(nameOf(r), { register: r._typed ? null : r.register_no, taken })
              : { pupil: roll.find(p => plain(p.name) === plain(nameOf(r)) && !taken.has(p.id)) || null, sure: true, how: 'exact', alternatives: [] };
      if(m.pupil && m.sure){ r._pupil = m.pupil; r._how = r._typed ? 'typed' : m.how; taken.add(m.pupil.id); takenBy[m.pupil.id] = r.name; }
      else if(window.NameMatch && (r._back = (() => { const off = siOffRoll(); if(!off.length) return null; const b = NameMatch.find(nameOf(r), { register: r._typed ? null : r.register_no, roll: off }); return b.pupil && b.sure ? b.pupil : null; })())){
        // taken off the roll earlier: brought back (not a new child), with its saved history
      }
      else {
        r._suggest = m.pupil || null; r._alts = m.alternatives || [];
        // not close enough to suggest, but it does resemble a child: never add it as a NEW child by itself
        if(!r._suggest && r._alts[0] && window.NameMatch && NameMatch.closeness(nameOf(r), r._alts[0].name) >= 0.5) r._maybe = r._alts[0];
        // the child this name most resembles is already used by another row: say so (it may be that row that is wrong)
        if(window.NameMatch){
          const free = NameMatch.find(nameOf(r), { register: null });
          if(free.pupil && taken.has(free.pupil.id) && takenBy[free.pupil.id] !== r.name){
            r._takenHint = { pupil: free.pupil, by: takenBy[free.pupil.id] };
            r._suggest = null; r._maybe = null; // no second-best guess: she decides (the other row may be the wrong one)
          }
        }
      }
    });
    smartImport._takenBy = takenBy;
  }
  // "The file's spelling is right": when saving, the roll is corrected to it
  window.siFixRoll = function(i, on){ const n = (smartImport._names || [])[i]; if(n == null) return; smartImport.fixRoll = smartImport.fixRoll || {}; if(on) smartImport.fixRoll[n] = true; else delete smartImport.fixRoll[n]; renderSmartImportPreview(); };
  window.siFixRollAll = function(on){ smartImport.fixRoll = {}; if(on) (smartImport._fixable || []).forEach(n => { smartImport.fixRoll[n] = true; }); renderSmartImportPreview(); };
  // ✎ Edit a name from the file: the teacher types the right spelling, and it is matched again
  window.siEditName = function(i){
    const n = (smartImport._names || [])[i]; if(n == null) return;
    const cell = document.querySelector(`[data-si-name-row="${i}"]`); if(!cell) return;
    const cur = (smartImport.nameEdit || {})[n] || n;
    cell.innerHTML = `<div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;"><input type="text" value="${esc(cur)}" data-si-edit style="font:inherit; padding:6px 8px; border:1px solid var(--border); border-radius:6px; min-width:170px;" aria-label="Correct spelling">`
      + `<button class="btn-primary" style="width:auto; padding:6px 12px;" data-si-ok>Save</button><button class="btn" style="padding:6px 10px;" data-si-no>Cancel</button></div>`
      + `<div class="cap" style="margin-top:3px;">In the file: “${esc(n)}”</div>`;
    const inp = cell.querySelector('[data-si-edit]'); inp.focus(); inp.select();
    const done = ok => {
      if(ok){ const v = inp.value.trim(); smartImport.nameEdit = smartImport.nameEdit || {}; if(!v || v === n) delete smartImport.nameEdit[n]; else smartImport.nameEdit[n] = v; if(smartImport.nameChoice) delete smartImport.nameChoice[n]; }
      renderSmartImportPreview();
    };
    cell.querySelector('[data-si-ok]').onclick = () => done(true); cell.querySelector('[data-si-no]').onclick = () => done(false);
    inp.onkeydown = e => { if(e.key === 'Enter') done(true); if(e.key === 'Escape') done(false); };
  };
  window.siNameChoice = function(i, v){ const n = (smartImport._names || [])[i]; if(n == null) return; smartImport.nameChoice = smartImport.nameChoice || {}; if(v === '') delete smartImport.nameChoice[n]; else smartImport.nameChoice[n] = v; renderSmartImportPreview(); };
  window.siUseAllSuggestions = function(){ (smartImport._suggested || []).forEach(r => { if(r._suggest) smartImport.nameChoice[r.name] = String(r._suggest.id); }); renderSmartImportPreview(); }; // only real suggestions: an "Is this …?" needs her own choice
  function renderSmartImportPreview(){
    const out = siPanel();
    const { byName, stats } = siCollect();
    const all = Object.values(byName);
    siResolveNames(all);
    const choice = smartImport.nameChoice || {};
    const matched = all.filter(r => r._pupil);
    const spelled = matched.filter(r => r._how !== 'exact' && normPupilName(r.name) !== normPupilName(r._pupil.name));
    const back = all.filter(r => !r._pupil && r._back && !choice[r.name]);   // off the roll → brought back
    const suggested = all.filter(r => !r._pupil && !r._back && (r._suggest || r._maybe || r._takenHint) && !choice[r.name]);
    const unknown = all.filter(r => !r._pupil && !r._back && !r._suggest && !r._maybe && !r._takenHint && !choice[r.name]);
    const toAdd = all.filter(r => back.includes(r) || choice[r.name] === 'add' || (smartImport.addMissing && unknown.includes(r)));
    const skipped = all.filter(r => !r._pupil && !toAdd.includes(r));
    smartImport._suggested = suggested;
    const missing = toAdd; // the confirm step adds exactly these
    const regUpdates = matched.map(r => ({ p: r._pupil, reg: r.register_no })).filter(x => x.reg && String(x.p.register_no || '') !== x.reg).map(x => ({ id: x.p.id, name: x.p.name, register_no: x.reg }));
    // Whole-class holiday days: every child who has a mark that day has H.
    const dayMarks = {};
    all.forEach(r => Object.entries(r.attendance).forEach(([d, m]) => { (dayMarks[d] = dayMarks[d] || []).push(m); }));
    const holidayDays = Object.entries(dayMarks).filter(([d, ms]) => ms.length >= 2 && ms.every(m => m === 'holiday') && !studentHolidays[d]).map(([d]) => d).sort();
    const counted = list => list.reduce((a, r) => { Object.values(r.attendance).forEach(m => { if(m === 'present') a.p++; else if(m === 'absent') a.a++; }); return a; }, { p: 0, a: 0 });
    const saving = counted(matched.concat(toAdd));
    smartImport.collected = { byName, matched, missing, holidayDays, regUpdates };
    // the names to look at: spelled differently, guessed, or not found
    const review = spelled.concat(suggested, all.filter(r => !r._pupil && !suggested.includes(r)));   // includes the brought-back ones
    smartImport._names = review.map(r => r.name);
    const fileSpelling = r => (smartImport.nameEdit || {})[r.name] || r.name;
    const canFix = r => r._pupil && normPupilName(r._pupil.name) !== normPupilName(fileSpelling(r));
    smartImport._fixable = review.filter(canFix).map(r => r.name);
    const fixOn = r => !!(smartImport.fixRoll || {})[r.name] && canFix(r);
    const fixCount = review.filter(fixOn).length;
    const opts = (r) => {
      const cur = r._pupil ? String(r._pupil.id) : (choice[r.name] || ((r._suggest || r._maybe || r._takenHint) ? '' : (toAdd.includes(r) ? 'add' : 'skip')));
      const roll = (realPupilsCache || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
      const hint = !r._pupil && (r._suggest || r._maybe || r._takenHint);
      return (hint ? `<option value="" ${cur === '' ? 'selected' : ''}>${r._suggest ? 'Did you mean ' + esc(r._suggest.name) + '?' : r._maybe ? 'Is this ' + esc(r._maybe.name) + '?' : 'Which child is this?'} — choose</option>` : '')
        + roll.map(p => { const by = (smartImport._takenBy || {})[p.id], other = by && by !== r.name;
            return `<option value="${p.id}" ${cur === String(p.id) ? 'selected' : ''}>${esc(p.name)}${p.register_no ? ' (' + esc(p.register_no) + ')' : ''}${other ? ' — already used for “' + esc(by) + '”' : ''}</option>`; }).join('')
        + `<option value="add" ${cur === 'add' ? 'selected' : ''}>➕ Not on the roll — add as a new child</option>`
        + `<option value="skip" ${cur === 'skip' ? 'selected' : ''}>Skip this name</option>`;
    };
    const tag = r => (r._takenHint ? `<div style="color:#9b1c1c; margin-bottom:3px;">Probably <b>${esc(r._takenHint.pupil.name)}</b> — but already matched to “${esc(r._takenHint.by)}”. Check that row.</div>` : '')
      + (r._pupil ? (r._how === 'chosen' ? '<span style="color:#1e6b46;">chosen</span>' : r._how === 'typed' ? '<span style="color:#1e6b46;">matched to the spelling you typed</span>' : `<span style="color:#24507a;">${esc(window.NameMatch ? NameMatch.how(r._how) : r._how)}</span>`)
      : r._back && !choice[r.name] ? '<span style="color:#1e6b46;">taken off the roll earlier — will be brought back</span>'
      : (r._suggest || r._maybe || r._takenHint) && !choice[r.name] ? '<b style="color:#a36b00;">check — not used yet</b>' : toAdd.includes(r) ? '<span style="color:#1e6b46;">will be added</span>' : '<span style="color:#9b1c1c;">will be skipped</span>');
    const namesTable = review.length ? `
      <div style="margin:8px 0 10px; border:1px solid var(--border); border-radius:8px; overflow-x:auto;">
        <table class="report-table" style="min-width:560px;"><thead><tr><th style="text-align:left;">Name in the file</th><th style="text-align:left;">Child on the roll</th><th style="text-align:left;"></th></tr></thead><tbody>
        ${review.map((r, i) => `<tr><td style="text-align:left;" data-si-name-row="${i}"><b>${esc(r._typed || r.name)}</b>${r._typed ? `<div class="cap">In the file: “${esc(r.name)}”</div>` : ''}<div><button type="button" onclick="siEditName(${i})" style="margin-top:4px; padding:3px 9px; border-radius:6px; border:1px solid var(--border); background:#fff; font-size:12px; cursor:pointer;">✎ Edit</button></div></td><td style="text-align:left;"><select onchange="siNameChoice(${i}, this.value)" style="max-width:300px;">${opts(r)}</select>${canFix(r) ? `<label style="display:flex; gap:6px; align-items:flex-start; margin-top:6px; font-size:12px; cursor:pointer;"><input type="checkbox" ${fixOn(r) ? 'checked' : ''} onchange="siFixRoll(${i}, this.checked)"> <span>The file's spelling is right — change the roll to “<b>${esc(fileSpelling(r))}</b>”</span></label>` : ''}</td><td style="text-align:left; font-size:12px;">${tag(r)}</td></tr>`).join('')}
        </tbody></table></div>` : '';
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 8px; font-weight:600;">Step 2 of 2 — preview. Nothing has been saved yet.</p>
      <p style="margin:0 0 6px;"><b>${matched.length}</b> of ${all.length} name${all.length === 1 ? '' : 's'} matched to ${esc(myClassInfo.class_name || 'this class')}'s roll${spelled.length ? ` — <b>${spelled.length}</b> of them spelled differently in the file` : ''}.${regUpdates.length ? ` Register numbers will be saved for <b>${regUpdates.length}</b>, so the class is listed in register order.` : ''}</p>
      ${suggested.length ? `<p style="margin:0 0 6px; color:#a36b00;"><b>${suggested.length} name${suggested.length === 1 ? ' looks' : 's look'} like a child on the roll but ${suggested.length === 1 ? 'isn\u2019t' : 'aren\u2019t'} certain</b> — ${suggested.length === 1 ? 'it is' : 'they are'} not used until you choose. ${suggested.some(r => r._suggest) ? `<button class="btn" style="padding:3px 10px; font-size:12px;" onclick="siUseAllSuggestions()">Use all ${suggested.filter(r => r._suggest).length} suggestion${suggested.filter(r => r._suggest).length === 1 ? '' : 's'}</button>` : ''}</p>` : ''}
      ${smartImport._fixable.length ? `<p style="margin:0 0 6px; font-size:13px;">${fixCount ? `<b>${fixCount}</b> name${fixCount === 1 ? '' : 's'} on the roll will be corrected to the file's spelling. ` : ''}If the names in the <b>file</b> are spelled right and the <b>roll</b> is wrong: <button class="btn" style="padding:3px 10px; font-size:12px;" onclick="siFixRollAll(${fixCount < smartImport._fixable.length})">${fixCount < smartImport._fixable.length ? 'Correct the roll for all ' + smartImport._fixable.length : 'Untick all'}</button></p>` : ''}
      ${namesTable}
      ${all.some(r => r.register_no) ? '' : '<p class="cap" style="margin:0 0 6px;">No register numbers were found in this file (a "Register No" / "GR No" column, or a number written before each name). The class stays in its current order.</p>'}
      ${back.length ? `<p style="margin:0 0 6px;"><b style="color:var(--good,#0a7a0a);">${back.length} child${back.length === 1 ? '' : 'ren'} taken off the roll earlier will be brought back</b> (with their saved records, not added again): <span class="cap">${back.map(r => esc(r.name)).join(', ')}</span></p>` : ''}
      ${toAdd.length - back.length > 0 ? `<p style="margin:0 0 6px;"><b style="color:var(--good,#0a7a0a);">${toAdd.length - back.length} new child${toAdd.length - back.length === 1 ? '' : 'ren'} will be added</b>: <span class="cap">${toAdd.filter(r => !back.includes(r)).slice(0, 40).map(r => esc(r.name)).join(', ')}</span></p>` : ''}
      ${skipped.length ? `<p style="margin:0 0 6px;"><b style="color:var(--crit,#d03b3b);">${skipped.length} name${skipped.length === 1 ? '' : 's'} will be skipped</b> (their marks are not saved): <span class="cap">${skipped.slice(0, 40).map(r => esc(r.name)).join(', ')}</span></p>` : ''}
      <p style="margin:0 0 6px;">Will save <b>${saving.p}</b> present and <b>${saving.a}</b> absent marks (they replace anything already saved for that child and day).</p>
      ${smartImport.markHolidays && holidayDays.length ? `<p style="margin:0 0 6px;"><b>${holidayDays.length}</b> day${holidayDays.length === 1 ? '' : 's'} will be marked as holidays: <span class="cap">${holidayDays.map(esc).join(', ')}</span></p>` : ''}
      <p class="cap" style="margin:0 0 6px;">${stats.future ? stats.future + ' marks dated after today are left out. ' : ''}${stats.ignored ? stats.ignored + ' marks set to "Ignore" are left out. ' : ''}${stats.noDate ? stats.noDate + ' marks had no readable date and are left out. ' : ''}</p>
      <label style="display:flex; gap:8px; align-items:center; font-size:13px; margin:8px 0;"><input type="checkbox" id="smartImportRemember" checked /> Remember my choices for files laid out like this one, and these spellings of the children's names</label>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
        <button class="btn-primary" style="width:auto; padding:8px 16px;" onclick="confirmSmartImport()" ${saving.p + saving.a || toAdd.length || regUpdates.length ? '' : 'disabled'}>Confirm import</button>
        <button class="btn" onclick="renderSmartImportMapping()">Back</button>
      </div></div>`;
  }
  async function confirmSmartImport(){
    const out = siPanel();
    const c = smartImport && smartImport.collected;
    if(!c) return;
    const remember = !!(document.getElementById('smartImportRemember') || {}).checked;
    try{
      let added = 0, notAdded = '';
      const toAdd = c.missing || []; // exactly the names marked "add" in the preview (never a misspelling of a child already on the roll)
      if(toAdd.length || (c.regUpdates && c.regUpdates.length)){
        out.innerHTML = '<p class="sub">Updating the roll…</p>';
        const res = await fetch('backend/pupils/sync_class_pupils.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ add: toAdd.map(r => ({ name: (smartImport.nameEdit || {})[r.name] || r.name, register_no: r.register_no || '', admitted_date: Object.keys(r.attendance).sort()[0] || todayDateKey(),
            manual_verified: true,                                                                        // she saw "will be added" and confirmed
            confirmed_different: (smartImport.nameChoice || {})[r.name] === 'add' && !!(r._suggest || r._maybe) })), remove_ids: [], // she chose "new child" for a look-alike
            register_updates: (c.regUpdates || []).map(u => ({ id: u.id, register_no: u.register_no })) })
        });
        const data = await res.json();
        if(data.status !== 'success') throw new Error(data.message || 'Could not add the children.');
        added = data.added;
        notAdded = rollNotAddedText(data);
        realPupilsCache = null;
        await fetchMyPupils();
        if(!Array.isArray(realPupilsCache)) throw new Error('The children were added, but the roll could not be reloaded — press Confirm again (nothing will be added twice).');
      }
      // "the file's spelling is right": correct those names on the roll (only the name changes)
      const fixes = Object.values(c.byName).filter(r => r._pupil && (smartImport.fixRoll || {})[r.name]);
      let renamed = 0; const renameProblems = [];
      for(const r of fixes){
        const newName = (smartImport.nameEdit || {})[r.name] || r.name, oldName = r._pupil.name;
        if(normPupilName(newName) === normPupilName(oldName)) continue;
        try {
          const res = await fetch('backend/pupils/roll_tools.php' + window.location.search, { method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'rename', class_id: myClassInfo.class_id, pupil_id: r._pupil.id, name: newName, confirm_lookalike: true }) });
          const d = await res.json();
          if(d.status !== 'success'){ renameProblems.push(oldName + ' → ' + newName + ': ' + (d.message || 'not changed')); continue; }
          renamed++;
          if(window.NameMatch) NameMatch.remember(oldName, { id: r._pupil.id, name: newName }); // files with the old spelling still match
        } catch(e){ renameProblems.push(oldName + ' → ' + newName + ': could not reach the server'); }
      }
      if(renamed){ realPupilsCache = null; await fetchMyPupils(); }
      notAdded = [notAdded, renameProblems.length ? 'Names not corrected on the roll:\n• ' + renameProblems.join('\n• ') : ''].filter(Boolean).join('\n\n');
      const roll = {}; realPupilsCache.forEach(p => { roll[normPupilName(p.name)] = p; });
      const addedNow = new Set((c.missing || []).map(r => r.name)), typedOf = r => (smartImport.nameEdit || {})[r.name] || r.name;
      const marks = [];
      Object.values(c.byName).forEach(r => {
        // the child chosen in the preview (spelling differences resolved there); a newly added child by its name
        const pupil = r._pupil ? realPupilsCache.find(p => p.id === r._pupil.id) : (addedNow.has(r.name) ? roll[normPupilName(typedOf(r))] : null);
        if(!pupil) return;
        if(remember && window.NameMatch && r._pupil) NameMatch.remember(r.name, pupil);
        Object.entries(r.attendance).forEach(([date, m]) => { if(m === 'present' || m === 'absent') marks.push({ pupil_id: pupil.id, date, status: m }); });
      });
      let saved = 0;
      for(let i = 0; i < marks.length; i += 400){
        const box = siPanel(); if(box) box.innerHTML = `<p class="sub">Saving marks… ${Math.min(i + 400, marks.length)} of ${marks.length}</p>`;
        const res = await fetch('backend/attendance/save_attendance.php' + window.location.search, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ marks: marks.slice(i, i + 400) }) });
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
      alert('Import finished: ' + [added ? added + ' children added' : '', renamed ? renamed + ' name' + (renamed === 1 ? '' : 's') + ' corrected on the roll' : '', saved + ' attendance marks saved', holidays ? holidays + ' holidays marked' : ''].filter(Boolean).join(', ') + '.' + (notAdded ? '\n\n' + notAdded + '\n\nTheir attendance in this file was not saved: choose the right child in the preview and import again.' : ''));
      renderAttendanceBody();
    } catch(err){
      const box = siPanel();
      if(box) box.innerHTML = `<div class="au-error">${esc(err.message)}</div><button class="btn" style="margin-top:8px;" onclick="renderSmartImportPreview()">Back to preview</button>`;
    }
  }
  function renderSmartImportCard(mode){
    const roll = mode === 'roll';
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'padding:18px 20px; margin:0 0 20px;';
    card.innerHTML = `
      <div class="imp-card">
        <div class="imp-text">
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">${roll ? '👧 Import children — class list' : '📥 Import attendance or a class list'}</h3>
          <p class="cap" style="margin:0;">${roll
            ? 'A list of the children in any layout — a file (.xlsx, .xls, .csv) or a photo of the list. New children are added, register numbers saved, and nobody already on the roll is duplicated.'
            : 'A register in any layout — a file (.xlsx, .xls, .csv) or a photo. P / A / H marks are saved as attendance; a list of names updates the roll.'} You check a preview first, and it only ever goes into ${esc(myClassInfo.class_name || 'this class')}.</p>
        </div>
        ${importButtonsHtml(`smartImportPhoto('${roll ? 'roll' : 'attendance'}')`, `showImportFormat('${roll ? 'roll' : 'attendance'}')`,roll ? 'admissionsManualSheet()' : 'goToAttendanceRegister()', roll ? 'downloadClassRollTemplate()' : 'downloadAttendanceSheetTemplate()', roll ? 'Download class list' : 'Download sheet')}
      </div>
      <div id="${roll ? 'smartImportPanelRoll' : 'smartImportPanel'}" data-si-panel="1" style="margin-top:14px; word-break:break-word; overflow-wrap:anywhere;"></div>`;
    return card;
  }
  // Holds the parsed, validated result of the last previewed file until
  // the teacher confirms or cancels — nothing is saved until then.
 window.pendingAttendanceImport =
  window.pendingAttendanceImport ?? null;