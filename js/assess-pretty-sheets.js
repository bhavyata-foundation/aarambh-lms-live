/* =========================================================================
   js/assess-pretty-sheets.js — every Assessment "↓ Download sheet", one format
   -------------------------------------------------------------------------
   Pre-Test, Classroom Observation, Workbook and Fine & Gross Motor all
   download the same kind of sheet (as the attendance register):

     rows 1–4   dark title band (school | class | what · month year),
                the sheet's name, School · Class · Teacher · Date, legend
     row 6      SECTION BANDS (worksheet / classroom · a theme · a page ·
                the motor sheet) and SUMMARY
     row 7      small labels (CG code · 1st/2nd time · the month's activity)
     headings   exactly what the portal's import reads
     grid       B / P / A drop-down with colours; saved marks filled in
     Summary    per child: Completed/Marked/Rated · Not … · B · P · A
     Totals     per column: Total B / P / A (labels in column A, so no
                import reads them as a child)
     tabs       a list tab (Activities / Themes) and How to fill

   Each sheet imports straight back. Styled with ExcelJS (from cdnjs); if it
   can't load, the earlier sheet is downloaded instead.
   Loads after the part files, assess-import-checks.js and assess-templates.js.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof assessDownloadSheet !== 'function') return;

  const NAVY = 'FF243D59', BAND = 'FFE9EFF5', LEG = 'FFFFF2CC', LINE = 'FFB9C6D3', GREY = 'FF5B6B62';
  const MARK = { B: ['FFFDE2E1', 'FF9B1C1C'], P: ['FFFFF1CC', 'FF7A5300'], A: ['FFDDF2E5', 'FF1E6B46'] };
  const fill = c => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } });
  const thin = { style: 'thin', color: { argb: LINE } }, box = { top: thin, left: thin, bottom: thin, right: thin };
  const font = (o) => Object.assign({ name: 'Arial', size: 11 }, o || {});
  const center = { horizontal: 'center', vertical: 'middle', wrapText: true };
  const colL = n => { let s = ''; while(n > 0){ const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const std = () => (typeof workbookLevelFromClassName === 'function' && workbookLevelFromClassName() === 'Sr KG') ? 'Senior KG (Balvatika 3)' : 'Junior KG (Balvatika 2)';
  const shortStd = () => std().startsWith('Senior') ? 'SR KG' : 'JR KG';
  const school = () => (myClassInfo && myClassInfo.school_name) || 'School';
  const teacher = () => { const el = document.querySelector('.user-menu .user-name'); return el ? el.textContent.trim() : ''; };
  const termNo = () => (typeof assessmentTerm !== 'undefined' && assessmentTerm === 2) ? 2 : 1;
  const safe = s => String(s).replace(/[^A-Za-z0-9_]+/g, '_').replace(/_+/g, '_');

  function loadExcelJS(){
    if(window.ExcelJS) return Promise.resolve(window.ExcelJS);
    return new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      s.onload = () => window.ExcelJS ? ok(window.ExcelJS) : no(new Error('ExcelJS did not load'));
      s.onerror = () => no(new Error('ExcelJS did not load'));
      document.head.appendChild(s);
    });
  }
  async function save(wb, file){
    fitHeaders(wb);
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = file;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // rows 1–4: the dark title band, the sheet name, school / class / teacher / date, the legend
  // "CG 1.2" → "C-1.2" (a competency) · "CG 1" → "CG-1" (a whole goal)
  // codes exactly as stored, i.e. as on the official sheets ("CG 1.2" on the Pre-Test, "C-1.2" on Observation / Workbook)
  function codeLabel(v){ return String(v == null ? '' : v).trim(); }
  function header(ws, lastCol, title, sub, legend){
    const rows = [[title, font({ size: 15, bold: true, color: { argb: 'FFFFFFFF' } }), NAVY, 26],
                  [sub, font({ size: 12, bold: true, color: { argb: NAVY } }), BAND, 22],
                  ['School: ' + school() + '        Class: ' + std() + '        Teacher: ' + (teacher() || '____________________') + '        Date: ____________', font({ size: 10, bold: true, color: { argb: 'FF333333' } }), 'FFF5F8FB', 20],
                  [legend, font({ size: 10, bold: true, color: { argb: 'FF7A5300' } }), LEG, 20]];
    rows.forEach(([txt, f, bg, h], i) => {
      const r = i + 1; ws.mergeCells(r, 1, r, lastCol);
      const c = ws.getCell(r, 1); c.value = txt; c.font = f; c.fill = fill(bg); c.alignment = { vertical: 'middle', indent: 1, wrapText: true };
      ws.getRow(r).height = h;
    });
    ws.__hdr = { lastCol, rows: rows.map(([txt, f, , h]) => ({ txt: String(txt || ''), size: f.size || 10, h })) };
  }
  // Header rows grow to fit their text on narrow sheets (e.g. a one-page Workbook sheet): done when saving, after the widths are set.
  function fitHeaders(wb){
    wb.worksheets.forEach(ws => { const hd = ws.__hdr; if(!hd) return;
      let width = 0; for(let k = 1; k <= hd.lastCol; k++) width += ws.getColumn(k).width || 9;   // in characters of the default font
      // a narrow sheet (e.g. one Workbook page): widen its columns a little, so the title and details fit on a line
      const MIN = 118;
      if(width < MIN){ const add = (MIN - width) / Math.max(1, hd.lastCol - 1);
        for(let k = 2; k <= hd.lastCol; k++){ const c = ws.getColumn(k); c.width = Math.min(34, (c.width || 9) + add); }
        width = 0; for(let k = 1; k <= hd.lastCol; k++) width += ws.getColumn(k).width || 9; }
      hd.rows.forEach((row, i) => {
        const perLine = Math.max(10, width * 1.1 * 10 / row.size);                           // bigger letters → fewer per line
        const lines = Math.max(1, Math.ceil(row.txt.length * 1.08 / perLine));
        ws.getRow(i + 1).height = Math.max(row.h, Math.round(lines * row.size * 1.55 + 6));
      }); });
  }
  function band(ws, r, c1, c2, txt, bg, fg){
    if(c2 > c1) ws.mergeCells(r, c1, r, c2);
    const c = ws.getCell(r, c1); c.value = txt; c.font = font({ size: 11, bold: true, color: { argb: fg } }); c.fill = fill(bg); c.alignment = center;
    for(let k = c1; k <= c2; k++) ws.getCell(r, k).border = box;
  }
  // the B / P / A drop-down and colours on a block of cells
  function grades(ws, ref, blankMeans){
    const [a, b] = ref.split(':'), c1 = a.match(/[A-Z]+/)[0], r1 = +a.match(/\d+/)[0], c2 = b.match(/[A-Z]+/)[0], r2 = +b.match(/\d+/)[0];
    const n2c = s => s.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
    for(let r = r1; r <= r2; r++) for(let c = n2c(c1); c <= n2c(c2); c++){
      const cell = ws.getCell(r, c);
      cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"B,P,A"'], showErrorMessage: true, errorStyle: 'stop', errorTitle: 'B, P or A', error: 'Type B (Beginner), P (Proficient) or A (Advanced) — or leave the box empty ' + blankMeans + '.' };
      cell.font = font({ bold: true }); cell.alignment = center; cell.border = box;
    }
    ws.addConditionalFormatting({ ref, rules: Object.entries(MARK).map(([l, [bg, fg]], i) => ({ type: 'cellIs', operator: 'equal', formulae: ['"' + l + '"'], priority: i + 1, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: bg } }, font: { bold: true, color: { argb: fg } } } })) });
  }
  function howTo(wb, title, steps, blankText, example){
    const hw = wb.addWorksheet('How to fill', { views: [{ showGridLines: false }] });
    hw.mergeCells('A1:C1'); const t = hw.getCell('A1'); t.value = title; t.font = font({ size: 14, bold: true, color: { argb: 'FFFFFFFF' } }); t.fill = fill(NAVY); t.alignment = { vertical: 'middle', indent: 1 }; hw.getRow(1).height = 24;
    steps.forEach((txt, i) => {
      const r = 3 + i; hw.getCell(r, 1).value = i + 1; hw.getCell(r, 1).font = font({ size: 12, bold: true, color: { argb: NAVY } }); hw.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'top' };
      hw.mergeCells(r, 2, r, 3); const c = hw.getCell(r, 2); c.value = txt; c.alignment = { wrapText: true, vertical: 'top' }; c.font = font(); hw.getRow(r).height = 34;
    });
    let r = 4 + steps.length;
    ['Letter', 'Means', 'When to write it'].forEach((h, k) => { const c = hw.getCell(r, k + 1); c.value = h; c.font = font({ size: 10, bold: true, color: { argb: 'FFFFFFFF' } }); c.fill = fill(NAVY); c.border = box; });
    [['A', 'Advanced', 'The child does it fully and on their own.', 'A'], ['P', 'Proficient', 'The child does most of it, with a little help.', 'P'], ['B', 'Beginner', 'The child is just starting; needs a lot of help.', 'B'], ['(empty)', blankText[0], blankText[1], null]].forEach((row, i) => {
      row.slice(0, 3).forEach((v, k) => { const c = hw.getCell(r + 1 + i, k + 1); c.value = v; c.border = box; c.alignment = { horizontal: k ? 'left' : 'center', vertical: 'middle', wrapText: true, indent: k ? 1 : 0 };
        const m = row[3] && MARK[row[3]]; c.fill = fill(m ? m[0] : 'FFF3F3F3'); c.font = font({ bold: k < 2, color: { argb: m ? m[1] : GREY } }); });
    });
    r += 6; hw.getCell(r, 1).value = 'Example'; hw.getCell(r, 1).font = font({ bold: true });
    hw.mergeCells(r, 2, r, 3); const ex = hw.getCell(r, 2); ex.value = example; ex.alignment = { wrapText: true }; ex.font = font(); hw.getRow(r).height = 32;
    hw.getColumn(1).width = 10; hw.getColumn(2).width = 36; hw.getColumn(3).width = 62;
  }
  const letterOf = v => v === 'E' ? 'B' : (v === 'B' || v === 'P' || v === 'A') ? v : null;

  // ---------------- Pre-Test ----------------
  function buildPreTest(ExcelJS){
    // retired activities (superadmin, Content & Activities) are left out; each keeps its own number
    const acts = WEEKLY_ASSESSMENT_ACTIVITIES.map((a, i) => Object.assign({}, a, { idx: i, num: i + 1 })).filter(a => !a.retired), kids = Array.isArray(realPupilsCache) ? realPupilsCache : [];
    const store = (typeof preTestAssessmentEntries !== 'undefined') ? preTestAssessmentEntries : {};
    const ws0 = acts.filter(a => a.type !== 'Classroom').length, n = acts.length;
    const c0 = 3, cW1 = c0 + ws0 - 1, cC1 = c0 + n - 1, sum0 = cC1 + 1, sums = ['Completed', 'Absent', 'B', 'P', 'A'], last = sum0 + sums.length - 1;
    const first = 9, lastKid = first + Math.max(1, kids.length) - 1;
    const wb = new ExcelJS.Workbook(); wb.creator = 'Bhavyata portal';
    const ws = wb.addWorksheet('Pre-Test', { views: [{ state: 'frozen', xSplit: 2, ySplit: 8, showGridLines: false, zoomScale: 90 }],
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '6:8' } });
    header(ws, last, school().toUpperCase() + '  |  ' + shortStd() + '  |  ' + std().replace(/.*\((.*)\)/, '$1').toUpperCase(),
      'PRE-TEST (BASELINE) ASSESSMENT SHEET — TERM ' + termNo() + '  ·  ' + n + ' activities: ' + ws0 + ' worksheet + ' + (n - ws0) + ' classroom',
      'A = ADVANCED     P = PROFICIENT     B = BEGINNER     Blank = absent for that activity (not evaluated — not counted as B)');
    band(ws, 6, 1, 2, '', NAVY, 'FFFFFFFF'); // no word here: the portal looks for the row with the "Student Name" heading
    band(ws, 6, c0, cW1, 'WORKSHEET ACTIVITIES  (1 – ' + ws0 + ')', 'FFD6E4F0', NAVY);
    if(cC1 > cW1) band(ws, 6, cW1 + 1, cC1, 'CLASSROOM ACTIVITIES  (' + (ws0 + 1) + ' – ' + n + ')', 'FFDCEFD9', 'FF1E5631');
    band(ws, 6, sum0, last, 'SUMMARY  (fills itself)', 'FFEDEDED', 'FF444444');
    // row 7: CG codes; row 8: the headings the import reads
    ws.getCell(7, 2).value = 'CG / competency'; ws.getCell(7, 2).font = font({ size: 9, bold: true, color: { argb: GREY } }); ws.getCell(7, 2).alignment = { horizontal: 'right', vertical: 'middle' };
    [1, 2].forEach(k => { ws.getCell(7, k).fill = fill(BAND); ws.getCell(7, k).border = box; });
    acts.forEach((a, j) => { const c = ws.getCell(7, c0 + j); c.value = codeLabel(a.cg); c.font = font({ size: 9, bold: true, color: { argb: GREY } }); c.fill = fill(a.type === 'Classroom' ? 'FFEEF6EE' : BAND); c.alignment = center; c.border = box; });
    for(let k = sum0; k <= last; k++){ ws.getCell(7, k).fill = fill('FFF3F3F3'); ws.getCell(7, k).border = box; }
    ['Register No', 'Student Name', ...acts.map(a => a.num + '. ' + a.activity), ...sums].forEach((h, k) => {
      const c = ws.getCell(8, k + 1); c.value = h; c.font = font({ size: 10, bold: true, color: { argb: 'FFFFFFFF' } }); c.alignment = center; c.border = box;
      c.fill = fill(k < 2 ? NAVY : k + 1 <= cW1 ? 'FF2F5D86' : k + 1 <= cC1 ? 'FF2E6B45' : 'FF5A5A5A');
    });
    ws.getRow(8).height = 74;
    kids.forEach((p, i) => {
      const r = first + i, rec = store[p.name] || {};
      ws.getCell(r, 1).value = p.register_no || ''; ws.getCell(r, 2).value = p.name;
      [1, 2].forEach(k => { const c = ws.getCell(r, k); c.font = font({ bold: k === 2 }); c.border = box; c.alignment = { horizontal: k === 1 ? 'center' : 'left', vertical: 'middle', indent: k === 2 ? 1 : 0 }; if(i % 2) c.fill = fill('FFF7F9FB'); });
      acts.forEach((a, j) => { const v = letterOf(rec[String(a.idx)]); if(v) ws.getCell(r, c0 + j).value = v; });
      const rng = colL(c0) + r + ':' + colL(cC1) + r;
      const f = { Completed: `COUNTIF(${rng},"B")+COUNTIF(${rng},"P")+COUNTIF(${rng},"A")`, Absent: `IF(COUNTA(${rng})=0,"",${n}-${colL(sum0)}${r})`, B: `COUNTIF(${rng},"B")`, P: `COUNTIF(${rng},"P")`, A: `COUNTIF(${rng},"A")` };
      sums.forEach((k, x) => { const c = ws.getCell(r, sum0 + x); c.value = { formula: f[k] }; c.font = font({ bold: k === 'Completed' }); c.alignment = center; c.border = box; c.fill = fill('FFF3F3F3'); });
      ws.getRow(r).height = 22;
    });
    if(kids.length) grades(ws, colL(c0) + first + ':' + colL(cC1) + lastKid, 'if the child was absent');
    // per activity: Total B / P / A, Absent
    [['Total B — Beginner', 'B', 'FF9B1C1C'], ['Total P — Proficient', 'P', 'FF7A5300'], ['Total A — Advanced', 'A', 'FF1E6B46'], ['Absent — not evaluated', null, GREY]].forEach(([label, l, color], t) => {
      const r = lastKid + 1 + t; ws.mergeCells(r, 1, r, 2);
      const c = ws.getCell(r, 1); c.value = label; c.font = font({ size: 10, bold: true, color: { argb: color } }); c.fill = fill(l ? BAND : 'FFF3F3F3'); c.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
      for(let k = 1; k <= last; k++) ws.getCell(r, k).border = box;
      acts.forEach((a, j) => { const col = colL(c0 + j), g = ws.getCell(r, c0 + j), R = `${col}${first}:${col}${lastKid}`;
        g.value = { formula: l ? `COUNTIF(${R},"${l}")` : `IF(COUNTA(${R})=0,"",${kids.length}-COUNTIF(${R},"B")-COUNTIF(${R},"P")-COUNTIF(${R},"A"))` };
        g.font = font({ size: 10, bold: true, color: { argb: color } }); g.alignment = center; g.fill = fill(l ? BAND : 'FFF3F3F3'); });
    });
    const note = lastKid + 6; ws.mergeCells(note, 1, note, last);
    Object.assign(ws.getCell(note, 1), { value: 'Fill only the grid (one letter per box: B, P or A — pick it from the little arrow). Summary and Total count by themselves. Don\'t change the headings, the CG codes or the names: the portal reads them when you import this sheet.', font: font({ size: 9, italic: true, color: { argb: GREY } }), alignment: { wrapText: true, vertical: 'top' } });
    ws.getRow(note).height = 30;
    ws.getColumn(1).width = 11; ws.getColumn(2).width = 24; for(let j = 0; j < n; j++) ws.getColumn(c0 + j).width = 12.5; for(let k = sum0; k <= last; k++) ws.getColumn(k).width = 10.5;
    // Activities tab, in the same two sections
    const aw = wb.addWorksheet('Activities', { views: [{ state: 'frozen', ySplit: 2, showGridLines: false }] });
    aw.mergeCells('A1:E1'); Object.assign(aw.getCell('A1'), { value: 'Pre-Test activities — ' + std() + ', Term ' + termNo(), font: font({ size: 14, bold: true, color: { argb: 'FFFFFFFF' } }), fill: fill(NAVY), alignment: { vertical: 'middle', indent: 1 } }); aw.getRow(1).height = 24;
    let r = 3;
    [['WORKSHEET ACTIVITIES (1 – ' + ws0 + ')', acts.map((a, i) => [i, a]).filter(([, a]) => a.type !== 'Classroom'), 'FFD6E4F0', NAVY], ['CLASSROOM ACTIVITIES (' + (ws0 + 1) + ' – ' + n + ')', acts.map((a, i) => [i, a]).filter(([, a]) => a.type === 'Classroom'), 'FFDCEFD9', 'FF1E5631']].forEach(([title, list, bg, fg]) => {
      if(!list.length) return;
      aw.mergeCells(r, 1, r, 5); Object.assign(aw.getCell(r, 1), { value: title, font: font({ bold: true, color: { argb: fg } }), fill: fill(bg), alignment: { indent: 1, vertical: 'middle' } }); r++;
      ['No.', 'Activity', 'Type', 'CG / C code', 'Column on the Pre-Test tab'].forEach((h, k) => Object.assign(aw.getCell(r, k + 1), { value: h, font: font({ size: 10, bold: true, color: { argb: 'FFFFFFFF' } }), fill: fill(NAVY), alignment: center, border: box })); r++;
      list.forEach(([i, a]) => { [a.num, a.activity, a.type, codeLabel(a.cg), colL(c0 + i)].forEach((v, k) => Object.assign(aw.getCell(r, k + 1), { value: v, font: font({ bold: k === 1 }), border: box, alignment: { horizontal: k === 1 ? 'left' : 'center', vertical: 'middle', indent: k === 1 ? 1 : 0 } })); r++; });
      r++;
    });
    [7, 44, 13, 14, 24].forEach((w, k) => { aw.getColumn(k + 1).width = w; });
    howTo(wb, 'How to fill the Pre-Test sheet', [
      'Check the top of the Pre-Test tab: the school, the class and the term must be right. Write the date in row 3.',
      'Each ROW is one child. Each COLUMN is one activity — the blue section is the worksheet activities, the green section the classroom activities. The full list is on the Activities tab.',
      'For each child, under each activity, type ONE letter: B, P or A. You can also pick it from the little arrow in the box.',
      'If a child was absent for an activity, leave that box EMPTY: it means "not evaluated", never counted as B.',
      'Summary (Completed, Absent, B, P, A) and the Total rows count by themselves — don\'t type in them.',
      'Don\'t add, delete or move columns, and don\'t change the headings, the CG codes or the names.',
      'To put it in the portal: Assessment → Pre-Test → Import a file → choose this file. Check the preview, then confirm.'],
      ['Absent', 'The child was not there for that activity — not evaluated.'],
      'A child did activity 1 fully on their own → A. Needed some help with activity 2 → P. Absent for activity 21 → leave it empty.');
    return { wb, file: 'Pre-Test_' + safe(std().startsWith('Senior') ? 'SrKG' : 'JrKG') + '_' + safe(school()) + '_Term' + termNo() + '.xlsx' };
  }

  // ---------------- Classroom Observation ----------------
  // The same layout as the approved October sheet: a band per theme, "1st time / 2nd time" where a
  // competency is observed twice in a theme, the headings exactly as the import reads them
  // ("<code> <theme>"), Summary + Totals, and Themes / How to fill tabs.
  function buildObservation(ExcelJS){
    const month = currentWorkbookMonth, level = workbookLevelFromClassName();
    const themes = (observationThemesCache[level + '|' + month] || []).filter(t => t && Array.isArray(t.items) && t.items.length);
    const items = themes.flatMap((t, ti) => t.items.map(it => ({ t, ti, it })));
    const kids = Array.isArray(realPupilsCache) ? realPupilsCache : [], marks = (observationAssessmentCache[month] && typeof observationAssessmentCache[month] === 'object') ? observationAssessmentCache[month] : {};
    const n = items.length, c0 = 3, cL = c0 + Math.max(1, n) - 1, sums = ['Marked', 'Not marked', 'B', 'P', 'A'], s0 = cL + 1, last = s0 + sums.length - 1;
    const R_BAND = 6, R_TIME = 7, R_HEAD = 8, first = 9, lastKid = first + Math.max(1, kids.length) - 1;
    const year = (typeof workbookMonthYear === 'function' ? workbookMonthYear(month) : null) || ((['January','February','March','April','May'].includes(month) ? 1 : 0) + (new Date().getMonth() >= 5 ? new Date().getFullYear() : new Date().getFullYear() - 1));
    const TINTS = [['FFD6E4F0', NAVY], ['FFDCEFD9', 'FF1E5631'], ['FFFBE7D2', 'FF7A4117'], ['FFE8E1F5', 'FF4B2C82']], HEADS = ['FF2F5D86', 'FF2E6B45', 'FF9A5B23', 'FF5B4596'];
    // "1st time / 2nd time": the same competency more than once in the same theme
    const key = x => x.t.id + '|' + x.it.cg_code, total = {}, seen = {};
    items.forEach(x => { total[key(x)] = (total[key(x)] || 0) + 1; });
    const times = items.map(x => { seen[key(x)] = (seen[key(x)] || 0) + 1; return total[key(x)] > 1 ? ['1st time', '2nd time', '3rd time', '4th time'][seen[key(x)] - 1] : ''; });
    const wb = new ExcelJS.Workbook(); wb.creator = 'Bhavyata portal';
    const ws = wb.addWorksheet('Observation ' + month, { views: [{ state: 'frozen', xSplit: 2, ySplit: R_HEAD, showGridLines: false, zoomScale: 90 }],
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: R_BAND + ':' + R_HEAD } });
    header(ws, last, school().toUpperCase() + '  |  ' + shortStd() + '  |  ' + month.toUpperCase() + ' ' + year,
      'CLASSROOM OBSERVATION SHEET — ' + month + '  ·  ' + themes.length + ' theme' + (themes.length === 1 ? '' : 's') + ', ' + n + ' observation' + (n === 1 ? '' : 's') + ' a child',
      'A = ADVANCED     P = PROFICIENT     B = BEGINNER     Blank = not observed yet');
    // row 6: a band per theme (no words over the name columns — the import looks for the "Student Name" row)
    band(ws, R_BAND, 1, 2, '', NAVY, 'FFFFFFFF');
    let col = c0;
    themes.forEach((t, ti) => { const k = t.items.length, [bg, fg] = TINTS[ti % 4]; band(ws, R_BAND, col, col + k - 1, t.name.toUpperCase(), bg, fg); col += k; });
    band(ws, R_BAND, s0, last, 'SUMMARY  (fills itself)', 'FFEDEDED', 'FF444444');
    ws.getRow(R_BAND).height = 34;
    // row 7: 1st / 2nd time
    [1, 2].forEach(k => { ws.getCell(R_TIME, k).fill = fill(BAND); ws.getCell(R_TIME, k).border = box; });
    items.forEach((x, j) => { const c = ws.getCell(R_TIME, c0 + j); c.value = times[j]; c.font = font({ size: 9, italic: true, color: { argb: GREY } }); c.fill = fill(TINTS[x.ti % 4][0]); c.alignment = center; c.border = box; });
    for(let k = s0; k <= last; k++){ ws.getCell(R_TIME, k).fill = fill('FFF3F3F3'); ws.getCell(R_TIME, k).border = box; }
    // row 8: the headings the import reads, exactly "<code> <theme>"
    ['Register No', 'Student Name', ...items.map(x => x.it.cg_code + ' ' + x.t.name), ...sums].forEach((h, k) => {
      const c = ws.getCell(R_HEAD, k + 1); c.value = h; c.font = font({ size: 10, bold: true, color: { argb: 'FFFFFFFF' } }); c.alignment = center; c.border = box;
      c.fill = fill(k < 2 ? NAVY : k < 2 + n ? HEADS[items[k - 2].ti % 4] : 'FF5A5A5A');
    });
    ws.getRow(R_HEAD).height = 78;
    kids.forEach((p, i) => {
      const r = first + i, rec = marks[p.id] || {};
      ws.getCell(r, 1).value = p.register_no || ''; ws.getCell(r, 2).value = p.name;
      [1, 2].forEach(k => { const c = ws.getCell(r, k); c.font = font({ bold: k === 2 }); c.border = box; c.alignment = { horizontal: k === 1 ? 'center' : 'left', vertical: 'middle', indent: k === 2 ? 1 : 0 }; if(i % 2) c.fill = fill('FFF7F9FB'); });
      items.forEach((x, j) => { const v = letterOf(rec[x.it.id]); if(v) ws.getCell(r, c0 + j).value = v; });
      if(n){
        const rng = colL(c0) + r + ':' + colL(cL) + r;
        const f = { Marked: `COUNTIF(${rng},"B")+COUNTIF(${rng},"P")+COUNTIF(${rng},"A")`, 'Not marked': `${n}-${colL(s0)}${r}`, B: `COUNTIF(${rng},"B")`, P: `COUNTIF(${rng},"P")`, A: `COUNTIF(${rng},"A")` };
        sums.forEach((k, x) => { const c = ws.getCell(r, s0 + x); c.value = { formula: f[k] }; c.font = font({ bold: k === 'Marked' }); c.alignment = center; c.border = box; c.fill = fill('FFF3F3F3'); });
      }
      ws.getRow(r).height = 22;
    });
    if(kids.length && n) grades(ws, colL(c0) + first + ':' + colL(cL) + lastKid, 'if you have not observed it yet');
    if(n) [['Total B — Beginner', 'B', 'FF9B1C1C'], ['Total P — Proficient', 'P', 'FF7A5300'], ['Total A — Advanced', 'A', 'FF1E6B46']].forEach(([label, l, color], t) => {
      const r = lastKid + 1 + t; ws.mergeCells(r, 1, r, 2);
      Object.assign(ws.getCell(r, 1), { value: label, font: font({ size: 10, bold: true, color: { argb: color } }), fill: fill(BAND), alignment: { horizontal: 'right', vertical: 'middle', indent: 1 } });
      for(let k = 1; k <= last; k++) ws.getCell(r, k).border = box;
      items.forEach((x, j) => { const c = colL(c0 + j), g = ws.getCell(r, c0 + j); g.value = { formula: `COUNTIF(${c}${first}:${c}${lastKid},"${l}")` }; g.font = font({ size: 10, bold: true, color: { argb: color } }); g.alignment = center; g.fill = fill(BAND); });
    });
    const note = lastKid + 5; ws.mergeCells(note, 1, note, last);
    Object.assign(ws.getCell(note, 1), { value: n ? 'Fill only the grid (one letter per box: B, P or A — pick it from the little arrow). Summary and Total count by themselves. Don\'t change the headings or the names: the portal reads them when you import this sheet.' : 'No themes are scheduled for ' + month + ' for this class yet.', font: font({ size: 9, italic: true, color: { argb: GREY } }), alignment: { wrapText: true, vertical: 'top' } });
    ws.getRow(note).height = 30;
    ws.getColumn(1).width = 11; ws.getColumn(2).width = 24; for(let j = 0; j < Math.max(1, n); j++) ws.getColumn(c0 + j).width = 15; for(let k = s0; k <= last; k++) ws.getColumn(k).width = 10.5;
    // Themes tab
    const tw = wb.addWorksheet('Themes', { views: [{ showGridLines: false }] });
    tw.mergeCells('A1:D1'); Object.assign(tw.getCell('A1'), { value: month + ' themes — ' + std(), font: font({ size: 14, bold: true, color: { argb: 'FFFFFFFF' } }), fill: fill(NAVY), alignment: { vertical: 'middle', indent: 1 } }); tw.getRow(1).height = 24;
    ['Theme', 'Competency', 'Observed', 'Column on the Observation tab'].forEach((h, k) => Object.assign(tw.getCell(3, k + 1), { value: h, font: font({ size: 10, bold: true, color: { argb: 'FFFFFFFF' } }), fill: fill(NAVY), border: box, alignment: center }));
    items.forEach((x, j) => {
      const r = 4 + j, firstOfTheme = j === 0 || items[j - 1].t !== x.t;
      [firstOfTheme ? x.t.name : '', x.it.cg_code, times[j] || 'once', colL(c0 + j)].forEach((v, k) => Object.assign(tw.getCell(r, k + 1), { value: v, border: box, fill: fill(TINTS[x.ti % 4][0]), font: font({ bold: k === 0 }), alignment: { horizontal: k === 0 ? 'left' : 'center', vertical: 'middle', wrapText: true, indent: k === 0 ? 1 : 0 } }));
    });
    [46, 14, 12, 26].forEach((w, k) => { tw.getColumn(k + 1).width = w; });
    howTo(wb, 'How to fill the Classroom Observation sheet', [
      'Check the top: the school, the class and the month (' + month + ' ' + year + ') must be right. Write the date in row 3.',
      'Each ROW is one child. Each COLUMN is one competency to observe; the coloured bands group them by theme (the full list is on the Themes tab).',
      'Where the same competency appears twice in a theme ("1st time", "2nd time"), observe it on two different occasions.',
      'While the children do the theme\'s activities, write ONE letter per child per column: B, P or A — or pick it from the little arrow.',
      'Not observed yet? Leave the box empty.',
      'Summary (Marked, Not marked, B, P, A) and the Total rows count by themselves — don\'t type in them.',
      'Don\'t add, delete or move columns, and don\'t change the headings or the names.',
      'To put it in the portal: Assessment → Classroom Observation → Import a file → choose this file. Check the preview, then confirm.'],
      ['Not observed', 'You have not observed this for the child yet.'],
      themes[0] ? 'During "' + themes[0].name + '", a child did it fully on their own → A under ' + themes[0].items[0].cg_code + '.' : 'A child did it fully on their own → A.');
    return { wb, file: 'Observation_' + safe(month) + '_' + year + '_' + (std().startsWith('Senior') ? 'SrKG' : 'JrKG') + '_' + safe(school()) + '.xlsx' };
  }

  // Shared: Summary columns + Total rows, in the same place on every sheet. The Total labels sit in
  // column A with the name column empty, so no import reads them as a child.
  function summaryAndTotals(ws, { c0, cL, s0, sums, first, lastKid, nKids, count, labels }){
    for(let r = first; r < first + nKids; r++){
      const rng = colL(c0) + r + ':' + colL(cL) + r;
      const f = { [sums[0]]: `COUNTIF(${rng},"B")+COUNTIF(${rng},"P")+COUNTIF(${rng},"A")`, [sums[1]]: `IF(COUNTA(${rng})=0,"",${count}-${colL(s0)}${r})`, B: `COUNTIF(${rng},"B")`, P: `COUNTIF(${rng},"P")`, A: `COUNTIF(${rng},"A")` };
      sums.forEach((k, x) => { const c = ws.getCell(r, s0 + x); c.value = { formula: f[k] }; c.font = font({ bold: x === 0 }); c.alignment = center; c.border = box; c.fill = fill('FFF3F3F3'); });
    }
    const last = s0 + sums.length - 1;
    (labels || [['Total B — Beginner', 'B', 'FF9B1C1C'], ['Total P — Proficient', 'P', 'FF7A5300'], ['Total A — Advanced', 'A', 'FF1E6B46']]).forEach(([label, l, color], t) => {
      const r = lastKid + 1 + t;
      Object.assign(ws.getCell(r, 1), { value: label, font: font({ size: 10, bold: true, color: { argb: color } }), alignment: { horizontal: 'left', vertical: 'middle', indent: 1 } });
      for(let k = 1; k <= last; k++){ ws.getCell(r, k).border = box; ws.getCell(r, k).fill = fill(BAND); }
      for(let j = c0; j <= cL; j++){ const c = colL(j), g = ws.getCell(r, j); g.value = { formula: `COUNTIF(${c}${first}:${c}${lastKid},"${l}")` }; g.font = font({ size: 10, bold: true, color: { argb: color } }); g.alignment = center; }
    });
  }
  function kidCells(ws, r, i, vals){
    vals.forEach((v, k) => { const c = ws.getCell(r, k + 1); if(v !== '' && v != null) c.value = v; c.font = font({ bold: k === 1 }); c.border = box;
      c.alignment = { horizontal: k === 1 ? 'left' : 'center', vertical: 'middle', indent: k === 1 ? 1 : 0 }; if(i % 2) c.fill = fill('FFF7F9FB'); });
  }
  function headings(ws, r, list, colourOf){
    list.forEach((h, k) => { const c = ws.getCell(r, k + 1); c.value = h; c.font = font({ size: 10, bold: true, color: { argb: 'FFFFFFFF' } }); c.alignment = center; c.border = box; c.fill = fill(colourOf(k)); });
  }
  function listTab(wb, name, title, head, rows, widths, tintOf){
    const tw = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
    tw.mergeCells(1, 1, 1, head.length); Object.assign(tw.getCell(1, 1), { value: title, font: font({ size: 14, bold: true, color: { argb: 'FFFFFFFF' } }), fill: fill(NAVY), alignment: { vertical: 'middle', indent: 1 } }); tw.getRow(1).height = 24;
    head.forEach((h, k) => Object.assign(tw.getCell(3, k + 1), { value: h, font: font({ size: 10, bold: true, color: { argb: 'FFFFFFFF' } }), fill: fill(NAVY), border: box, alignment: center }));
    rows.forEach((row, i) => row.forEach((v, k) => Object.assign(tw.getCell(4 + i, k + 1), { value: v, border: box, fill: fill(tintOf ? tintOf(i) : 'FFFFFFFF'), font: font({ bold: k === 0 }), alignment: { horizontal: k >= head.length - 1 && typeof v === 'string' && v.length < 4 ? 'center' : 'left', vertical: 'middle', wrapText: true, indent: 1 } })));
    widths.forEach((w, k) => { tw.getColumn(k + 1).width = w; });
  }
  const TINT4 = [['FFD6E4F0', NAVY], ['FFDCEFD9', 'FF1E5631'], ['FFFBE7D2', 'FF7A4117'], ['FFE8E1F5', 'FF4B2C82']], HEAD4 = ['FF2F5D86', 'FF2E6B45', 'FF9A5B23', 'FF5B4596'];

  // ---------------- Fine & Gross Motor ----------------
  // Same format as Observation: bands · labels (each month's activity) · headings · grid · Summary · Totals.
  // Both motor imports read it: the "STUDENT NAME" heading row, the month columns, TEACHER NOTES.
  function buildMotor(ExcelJS){
    const kids = Array.isArray(realPupilsCache) ? realPupilsCache : [], months = MOTOR_MONTHS, nm = months.length;
    const wb = new ExcelJS.Workbook(); wb.creator = 'Bhavyata portal';
    const yr = new Date().getMonth() >= 5 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    ['fine', 'gross'].forEach((type, ti) => {
      const c0 = 3, cL = c0 + nm - 1, cN = cL + 1, s0 = cN + 1, sums = ['Rated', 'Not rated', 'B', 'P', 'A'], last = s0 + sums.length - 1;
      const R_BAND = 6, R_LABEL = 7, R_HEAD = 8, first = 9, lastKid = first + Math.max(1, kids.length) - 1;
      const [bg, fg] = TINT4[ti === 0 ? 0 : 1], headC = HEAD4[ti === 0 ? 0 : 1], what = type === 'fine' ? 'FINE MOTOR' : 'GROSS MOTOR';
      const ws = wb.addWorksheet(what, { views: [{ state: 'frozen', xSplit: 2, ySplit: R_HEAD, showGridLines: false, zoomScale: 90 }],
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: R_BAND + ':' + R_HEAD } });
      header(ws, last, school().toUpperCase() + '  |  ' + shortStd() + '  |  ' + what + ' · JUNE – OCTOBER ' + yr,
        what + ' ASSESSMENT SHEET — one activity a month, June to October  ·  ' + nm + ' activities a child',
        'A = ADVANCED     P = PROFICIENT     B = BEGINNER     Blank = not rated yet');
      band(ws, R_BAND, 1, 2, '', NAVY, 'FFFFFFFF');
      band(ws, R_BAND, c0, cL, what + ' — ONE ACTIVITY A MONTH', bg, fg);
      band(ws, R_BAND, cN, cN, 'NOTES', 'FFEDEDED', 'FF444444');
      band(ws, R_BAND, s0, last, 'SUMMARY  (fills itself)', 'FFEDEDED', 'FF444444');
      ws.getRow(R_BAND).height = 26;
      // row 7: each month's activity and what to do
      for(let k = 1; k <= last; k++){ const c = ws.getCell(R_LABEL, k); c.border = box; c.fill = fill(k >= c0 && k <= cL ? bg : 'FFF3F3F3'); }
      months.forEach((m, j) => { const a = MOTOR_ACTIVITIES[type][m]; const c = ws.getCell(R_LABEL, c0 + j);
        c.value = { richText: [{ text: a.title + '\n', font: font({ size: 10, bold: true, color: { argb: fg } }) }, { text: a.detail, font: font({ size: 9, color: { argb: 'FF3B4A41' } }) }] };
        c.alignment = { vertical: 'top', horizontal: 'left', wrapText: true }; });
      ws.getRow(R_LABEL).height = 78;
      // row 8: the headings both motor imports read
      headings(ws, R_HEAD, ['ROLL NO.', 'STUDENT NAME', ...months.map(m => m.toUpperCase()), 'TEACHER NOTES', ...sums], k => k < 2 ? NAVY : k < 2 + nm ? headC : 'FF5A5A5A');
      ws.getRow(R_HEAD).height = 30;
      kids.forEach((p, i) => {
        const r = first + i;
        kidCells(ws, r, i, [i + 1, p.name, ...months.map(m => motorLetter(motorRating(p.id, type, m)) || ''), motorNote(p.id, type) || '']);
        const nc = ws.getCell(r, cN); nc.alignment = { wrapText: true, vertical: 'middle' }; nc.font = font({ size: 10 });
        ws.getRow(r).height = 24;
      });
      if(kids.length){ grades(ws, colL(c0) + first + ':' + colL(cL) + lastKid, 'if it is not rated yet'); summaryAndTotals(ws, { c0, cL, s0, sums, first, lastKid, nKids: kids.length, count: nm }); }
      const note = lastKid + 5; ws.mergeCells(note, 1, note, last);
      Object.assign(ws.getCell(note, 1), { value: 'Fill only the grid (one letter per box: B, P or A — pick it from the little arrow) and, if you like, Teacher notes. Summary and Total count by themselves. Don\'t change the headings or the names: the portal reads them when you import this sheet.', font: font({ size: 9, italic: true, color: { argb: GREY } }), alignment: { wrapText: true, vertical: 'top' } });
      ws.getRow(note).height = 30;
      ws.getColumn(1).width = 10; ws.getColumn(2).width = 24; for(let j = 0; j < nm; j++) ws.getColumn(c0 + j).width = 22; ws.getColumn(cN).width = 28; for(let k = s0; k <= last; k++) ws.getColumn(k).width = 10;
    });
    listTab(wb, 'Activities', 'Fine & Gross Motor activities — ' + std(), ['Month', 'Fine motor activity', 'Gross motor activity'],
      months.map(m => [m, MOTOR_ACTIVITIES.fine[m].title + ' — ' + MOTOR_ACTIVITIES.fine[m].detail, MOTOR_ACTIVITIES.gross[m].title + ' — ' + MOTOR_ACTIVITIES.gross[m].detail]), [12, 60, 60], i => i % 2 ? 'FFF7F9FB' : 'FFFFFFFF');
    howTo(wb, 'How to fill the Fine & Gross Motor sheet', [
      'There are two tabs at the bottom: FINE MOTOR and GROSS MOTOR. Fill both. The full list of activities is on the Activities tab.',
      'Each ROW is one child. Each month (June to October) has one activity — it is written above the month\'s heading.',
      'After the children do that month\'s activity, write ONE letter per child under the month: B, P or A (or pick it from the little arrow).',
      'Not rated yet? Leave the box empty. Write anything worth remembering in TEACHER NOTES.',
      'Summary (Rated, Not rated, B, P, A) and the Total rows count by themselves — don\'t type in them.',
      'Don\'t add, delete or move columns, and don\'t change the headings or the names.',
      'To put it in the portal: Assessment → Fine & Gross Motor → Import a file → choose this file. Check the preview, then confirm.'],
      ['Not rated', 'The month\'s activity has not been rated for the child yet.'],
      'In June, Asha pegged all 10 pegs on her own → A under JUNE on the FINE MOTOR tab.');
    return { wb, file: 'Motor_' + (std().startsWith('Senior') ? 'SrKG' : 'JrKG') + '_' + safe(school()) + '_' + yr + '.xlsx' };
  }

  // ---------------- Workbook ----------------
  // Same format: a band per page · headings ("Page 15 · Act 1", as the import reads them) with the CG,
  // Activity and Goal rows straight under them (the import reads the CG row) · grid · Summary · Totals.
  async function buildWorkbook(ExcelJS){
    if(typeof window.workbookSheetData !== 'function') throw new Error('assess-templates.js is not loaded');
    const d = await window.workbookSheetData(), acts = d.acts, kids = d.kids, n = acts.length;
    const range = acts.length ? (acts[0].page === acts[acts.length - 1].page ? 'Page ' + acts[0].page : 'Pages ' + acts[0].page + '–' + acts[acts.length - 1].page) : '';
    const c0 = 3, cL = c0 + n - 1, s0 = cL + 1, sums = ['Marked', 'Not marked', 'B', 'P', 'A'], last = s0 + sums.length - 1;
    const R_BAND = 6, R_HEAD = 7, R_CG = 8, R_ACT = 9, R_GOAL = 10, first = 11, lastKid = first + Math.max(1, kids.length) - 1;
    const goal = cg => { const m = String(cg || '').match(/(\d+)/); return m && d.goals && d.goals[m[1]] ? d.goals[m[1]].text : ''; };
    const wb = new ExcelJS.Workbook(); wb.creator = 'Bhavyata portal';
    const ws = wb.addWorksheet((d.book + ' ' + d.month).slice(0, 31), { views: [{ state: 'frozen', xSplit: 2, ySplit: R_GOAL, showGridLines: false, zoomScale: 90 }],
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: R_BAND + ':' + R_GOAL } });
    header(ws, last, school().toUpperCase() + '  |  ' + shortStd() + '  |  ' + d.book.toUpperCase() + ' · ' + d.month.toUpperCase() + ' ' + d.year,
      'WORKBOOK ASSESSMENT SHEET — ' + d.book + ' · ' + d.month + ' ' + d.year + '  ·  ' + range + ', ' + n + ' activit' + (n === 1 ? 'y' : 'ies') + ' a child',
      'A = ADVANCED     P = PROFICIENT     B = BEGINNER     Blank = not assessed (absent, or the page was not done)');
    // row 6: a band per page
    band(ws, R_BAND, 1, 2, '', NAVY, 'FFFFFFFF');
    const pageTint = {}; let pi = 0;
    acts.forEach((a, j) => { if(!(a.page in pageTint)) pageTint[a.page] = pi++; });
    let j0 = 0;
    while(j0 < n){ let j1 = j0; while(j1 + 1 < n && acts[j1 + 1].page === acts[j0].page) j1++;
      const [bg, fg] = TINT4[pageTint[acts[j0].page] % 4]; band(ws, R_BAND, c0 + j0, c0 + j1, 'PAGE NUMBER ' + acts[j0].page, bg, fg); /* not "PAGE 55": the import would read that as a heading */ j0 = j1 + 1; }
    band(ws, R_BAND, s0, last, 'SUMMARY  (fills itself)', 'FFEDEDED', 'FF444444');
    ws.getRow(R_BAND).height = 36;   // room for "PAGE NUMBER 12" on two lines when a page has one column
    // row 7: the headings the import reads; rows 8–10: CG (the import reads it), Activity, Goal
    headings(ws, R_HEAD, ['Register No', 'Student Name', ...acts.map(a => 'Page ' + a.page + (a.many ? ' · Act ' + a.act : '')), ...sums], k => k < 2 ? NAVY : k < 2 + n ? HEAD4[pageTint[acts[k - 2].page] % 4] : 'FF5A5A5A');
    ws.getRow(R_HEAD).height = 30;
    [[R_CG, 'CG', a => a.cg, 9, true, 22], [R_ACT, 'Activity', a => a.title || '', 9, false, 60], [R_GOAL, 'Goal', a => goal(a.cg), 8.5, false, 48]].forEach(([r, label, val, size, bold, h]) => {
      Object.assign(ws.getCell(r, 1), { value: label, font: font({ size: 9, bold: true, color: { argb: GREY } }), alignment: { horizontal: 'left', vertical: 'middle', indent: 1 } });
      for(let k = 1; k <= last; k++){ const c = ws.getCell(r, k); c.border = box; c.fill = fill(k >= c0 && k <= cL ? TINT4[pageTint[acts[k - c0].page] % 4][0] : 'FFF3F3F3'); }
      acts.forEach((a, j) => { const c = ws.getCell(r, c0 + j); c.value = val(a); c.font = font({ size, bold, color: { argb: bold ? NAVY : 'FF3B4A41' } }); c.alignment = { horizontal: bold ? 'center' : 'left', vertical: 'top', wrapText: true }; });
      ws.getRow(r).height = h;
    });
    kids.forEach((k, i) => { const r = first + i; kidCells(ws, r, i, [k.reg || '', k.name, ...acts.map(a => k.marks[a.id] || '')]); ws.getRow(r).height = 22; });
    if(kids.length && n){ grades(ws, colL(c0) + first + ':' + colL(cL) + lastKid, 'if the child was not assessed'); summaryAndTotals(ws, { c0, cL, s0, sums, first, lastKid, nKids: kids.length, count: n }); }
    const note = lastKid + 5; ws.mergeCells(note, 1, note, last);
    Object.assign(ws.getCell(note, 1), { value: 'Fill only the grid (one letter per box: B, P or A — pick it from the little arrow). Summary and Total count by themselves. Don\'t change the headings, the CG row or the names: the portal reads them when you import this sheet.', font: font({ size: 9, italic: true, color: { argb: GREY } }), alignment: { wrapText: true, vertical: 'top' } });
    ws.getRow(note).height = 30;
    ws.getColumn(1).width = 11; ws.getColumn(2).width = 24; for(let j = 0; j < n; j++) ws.getColumn(c0 + j).width = 16; for(let k = s0; k <= last; k++) ws.getColumn(k).width = 10.5;
    listTab(wb, 'Activities', d.book + ' · ' + d.month + ' ' + d.year + ' — ' + range, ['Page', 'Activity', 'CG', 'Goal', 'Column'],
      acts.map((a, j) => ['Page ' + a.page + (a.many ? ' · Act ' + a.act : ''), a.title || '', a.cg, goal(a.cg), colL(c0 + j)]), [16, 46, 10, 46, 9], i => TINT4[pageTint[acts[i].page] % 4][0]);
    howTo(wb, 'How to fill the Workbook sheet', [
      'Check the top: the school, the class, the book (' + d.book + ') and the month (' + d.month + ' ' + d.year + ') must be right. Write the date in row 3.',
      'Each ROW is one child. Each COLUMN is one workbook activity; the coloured bands group them by page. Under each heading: its CG, the activity and the goal (all on the Activities tab too).',
      'Check the child\'s page and write ONE letter per child per activity: B, P or A — or pick it from the little arrow.',
      'Absent, or the page was not done? Leave the box empty.',
      'Summary (Marked, Not marked, B, P, A) and the Total rows count by themselves — don\'t type in them.',
      'Don\'t add, delete or move columns, and don\'t change the headings, the CG row or the names.',
      'To put it in the portal: Assessment → Workbook → choose ' + d.month + ' and ' + d.book + ' → Import a file → choose this file. Check the preview, then confirm.'],
      ['Not assessed', 'Absent, or the page was not done yet.'],
      acts[0] ? 'Asha did ' + 'Page ' + acts[0].page + ' fully on her own → A under that page.' : 'A child did the page fully on their own → A.');
    return { wb, file: ('Workbook_' + d.book + '_' + d.month + '_' + range.replace(/\s/g, '') + '_' + (std().startsWith('Senior') ? 'SrKG' : 'JrKG') + '_' + school()).replace(/[^A-Za-z0-9_–-]+/g, '_').replace(/_+/g, '_') + '.xlsx' };
  }

  const BUILD = { pretest: buildPreTest, observation: buildObservation, motor: buildMotor, workbook: buildWorkbook };
  const base = assessDownloadSheet;
  assessDownloadSheet = async function(type){
    if(!BUILD[type]) return base.apply(this, arguments);
    try {
      const ExcelJS = await loadExcelJS();
      const { wb, file } = await BUILD[type](ExcelJS);
      await save(wb, file);
    } catch(e){
      console.warn('Styled sheet not made, using the plain one:', e && e.message);
      if(type === 'workbook' && /No .* activities are loaded/.test((e && e.message) || '')){ alert(e.message); return; }
      return base.apply(this, arguments);                              // offline / no ExcelJS: the sheet as before
    }
  };
  window.buildAssessmentSheet = type => loadExcelJS().then(X => BUILD[type](X)); // for tests (may return a promise)
  window.__fitHeaders = fitHeaders;                                                // for tests
  // The Motor tab's older "Import from a file" card has its own Download button
  // (downloadMotorImportTemplate): it gives the same new sheet; the old one only if that fails.
  if(typeof downloadMotorImportTemplate === 'function'){
    const oldMotorSheet = downloadMotorImportTemplate;
    downloadMotorImportTemplate = async function(){
      try { const ExcelJS = await loadExcelJS(); const { wb, file } = await BUILD.motor(ExcelJS); await save(wb, file); }
      catch(e){ console.warn('Styled motor sheet not made, using the plain one:', e && e.message); return oldMotorSheet.apply(this, arguments); }
    };
  }
})();