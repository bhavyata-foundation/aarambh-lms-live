/* =========================================================================
   js/attendance-template.js — a descriptive monthly attendance register
   -------------------------------------------------------------------------
   Class Attendance → "Download sheet" used to give a bare grid (Register
   No · Student Name · 1 2 3 …). It now gives a register a new teacher can
   fill without help, like the new Workbook sheet:

     Sheet 1  "<Month> <Year>"   title · school · class · teacher
                                 how to fill (one line) · P / A / H legend
                                 a weekday row (Mon, Tue …; holidays named)
                                 headings: Register No | Student Name | 1 | 2 … | Present | Absent | Attendance %
                                 one row per child (from the class roll), with a
                                 P / A / H drop-down and colours; saved marks filled in
                                 "Total present" / "Total absent" under every day
     Sheet 2  "How to fill"      step by step, with the meaning of P / A / H

   The month is the one chosen in the Month bar at the top of Class Attendance
   (js/attendance-import-month.js), so the sheet and the import always agree.
   Sundays are left out, as before. The sheet imports straight back.

   Styled with ExcelJS (loaded from cdnjs when first needed); if it can't
   load, the same sheet is made without colours with SheetJS.
   Loads after the part files and js/attendance-import-month.js (teacher.html).
   ========================================================================= */
(function(){
  'use strict';

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const LEGEND = [
    ['P', 'Present', 'the child came to school that day',               'FFE3F4E8', 'FF1E6B46'],
    ['A', 'Absent',  'the child did not come that day',                 'FFFDE2E1', 'FF9B1C1C'],
    ['H', 'Holiday', 'school was closed for everyone (write it for every child)', 'FFE9ECEF', 'FF4A5560'],
  ];
  const GREEN = 'FF1E8F5E', LIGHT = 'FFEFF7F2', GREY = 'FF6B7A72';
  const colName = n => { let s = ''; while(n > 0){ const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

  // d = { year, month (0–11), school, standard, teacher,
  //       days:[{ day, dow, holiday:'' | name }], kids:[{ reg, name, marks:{ day:'P'|'A'|'H' } }] }
  function layout(d){
    const monthTitle = MONTHS[d.month] + ' ' + d.year;
    const rows = [];
    rows.push(['Attendance Register — ' + monthTitle]);                                                                   // 1
    rows.push([d.school + '   ·   ' + d.standard + (d.teacher ? '   ·   Teacher: ' + d.teacher : '')]);                     // 2
    rows.push(['Write ONE letter for each child under each day: P (present) or A (absent). On a day the school was closed, write H for every child. Leave a box empty if that day was not marked. New to this sheet? Open the “How to fill” tab at the bottom.']); // 3
    rows.push(LEGEND.map(([l, w, what]) => l + ' = ' + w + ' — ' + what));                                                  // 4
    rows.push(['', 'Day →', ...d.days.map(x => x.holiday ? 'Holiday' : DOW[x.dow])]);                                       // 5 weekday row
    rows.push(['Register No', 'Student Name', ...d.days.map(x => x.day), 'Present', 'Absent', 'Attendance %']);             // 6 headings (the import reads these)
    d.kids.forEach(k => rows.push([k.reg || '', k.name, ...d.days.map(x => k.marks[x.day] || ''), '', '', '']));            // 7…
    rows.push(['', 'Total present', ...d.days.map(() => '')]);
    rows.push(['', 'Total absent', ...d.days.map(() => '')]);
    rows.push([]);
    rows.push(['Empty box = not marked.  Please don’t change rows 1–6, the day numbers or the children’s names — the portal reads them to put each mark on the right day. A child missing from the list? Add them under Class Attendance → Admissions first, then download a new sheet.']);
    const first = 7, last = 6 + d.kids.length;
    return { rows, first, last, dayCol1: 3, dayColN: 2 + d.days.length, cols: 2 + d.days.length + 3, monthTitle };
  }
  function howToRows(d){
    const mt = MONTHS[d.month] + ' ' + d.year;
    return [
      ['How to fill the Attendance Register'],
      [],
      ['1', 'Check the top of the first sheet: the month (' + mt + ') and your class must be right. For another month, choose it in Month at the top of Class Attendance and download again.'],
      ['2', 'Each ROW is one child. Each COLUMN is one day of the month (Sundays are left out). The row above the day numbers says the weekday, or “Holiday”.'],
      ['3', 'For each child, under each day, write ONE letter: P or A (see the table below). You can also pick it from the little arrow in the box.'],
      ['4', 'If the school was closed that day (a holiday), write H for EVERY child under that day.'],
      ['5', 'If you did not take attendance that day, leave the boxes empty. Don’t write 0, 1, ✓, X or Ab.'],
      ['6', 'The Present, Absent and Attendance % columns and the Total rows count by themselves — don’t type in them.'],
      ['7', 'Don’t add, delete or move columns, and don’t change the headings, the day numbers or the names.'],
      ['8', 'To put it in the portal: Class Attendance → choose ' + mt + ' in Month at the top → Import a file → choose this file. Check the preview, then confirm.'],
      [],
      ['Letter', 'Means', 'When to write it'],
      ...LEGEND.map(([l, w, what]) => [l, w, 'When ' + what + '.']),
      ['(empty)', 'Not marked', 'Attendance was not taken that day (or the day has not come yet).'],
      [],
      ['Example', 'Asha came on the 1st, was absent on the 2nd, and the 3rd was a holiday:', '1 → P    2 → A    3 → H'],
    ];
  }

  function buildStyled(ExcelJS, d){
    const wb = new ExcelJS.Workbook(); wb.creator = 'Bhavyata portal';
    const L = layout(d);
    const ws = wb.addWorksheet(L.monthTitle, {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 6, showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '5:6', margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
    });
    L.rows.forEach(r => ws.addRow(r));
    const lastCol = L.cols, D1 = L.dayCol1, DN = L.dayColN, cP = DN + 1, cA = DN + 2, cPct = DN + 3;
    const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
    const thin = { style: 'thin', color: { argb: 'FFB9C7BF' } }, box = { top: thin, left: thin, bottom: thin, right: thin };
    ws.getColumn(1).width = 11; ws.getColumn(2).width = 26;
    for(let c = D1; c <= DN; c++) ws.getColumn(c).width = 4.6;
    ws.getColumn(cP).width = 9; ws.getColumn(cA).width = 9; ws.getColumn(cPct).width = 12;
    // 1–3
    [1, 2, 3].forEach(r => ws.mergeCells(r, 1, r, lastCol));
    ws.getCell('A1').font = { bold: true, size: 16, color: { argb: GREEN } };
    ws.getCell('A2').font = { bold: true, size: 11, color: { argb: GREY } };
    Object.assign(ws.getCell('A3'), { font: { size: 11 }, alignment: { wrapText: true, vertical: 'middle' }, fill: fill('FFFFF8E6') });
    ws.getRow(1).height = 26; ws.getRow(3).height = 34;
    // 4 legend
    for(let c = 1; c <= lastCol; c++) ws.getCell(4, c).value = null;
    const span = Math.max(1, Math.floor(lastCol / 3));
    LEGEND.forEach(([l, w, what, bg, fg], i) => {
      const from = 1 + i * span, to = i === 2 ? lastCol : from + span - 1;
      if(to > from) ws.mergeCells(4, from, 4, to);
      const c = ws.getCell(4, from);
      c.value = { richText: [{ text: l + ' = ' + w, font: { bold: true, size: 11, color: { argb: fg } } }, { text: '  —  ' + what, font: { size: 10, color: { argb: fg } } }] };
      c.fill = fill(bg); c.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }; c.border = box;
    });
    ws.getRow(4).height = 30;
    // 5 weekday row, 6 headings
    for(let c = 1; c <= lastCol; c++){
      const wd = ws.getCell(5, c), h = ws.getCell(6, c);
      const x = d.days[c - D1];
      wd.font = { size: 8.5, bold: !!(x && (x.holiday || x.dow === 6)), color: { argb: x && x.holiday ? 'FF4A5560' : GREY } };
      wd.alignment = { horizontal: 'center', vertical: 'bottom', textRotation: x && x.holiday ? 90 : 0 };
      if(x && x.holiday) wd.fill = fill('FFE9ECEF');
      h.font = { bold: true, color: { argb: 'FFFFFFFF' } }; h.fill = fill(GREEN); h.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; h.border = box;
    }
    ws.getCell(5, 2).alignment = { horizontal: 'right' }; ws.getCell(5, 2).font = { size: 9, italic: true, color: { argb: GREY } };
    ws.getRow(5).height = d.days.some(x => x.holiday) ? 44 : 16; ws.getRow(6).height = 22;
    // children
    for(let r = L.first; r <= L.last; r++){
      ws.getRow(r).height = 19;
      for(let c = 1; c <= lastCol; c++){
        const cell = ws.getCell(r, c); cell.border = box;
        cell.alignment = { vertical: 'middle', horizontal: c === 2 ? 'left' : 'center' };
        if(c === 2) cell.font = { bold: true };
        const x = d.days[c - D1];
        if(c >= D1 && c <= DN){
          cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"P,A,H"'], showErrorMessage: true, errorStyle: 'stop', errorTitle: 'P, A or H', error: 'Write P (present), A (absent) or H (holiday) — or leave the box empty if that day was not marked.' };
          if(x && x.holiday) cell.fill = fill('FFF3F4F6');
        }
      }
      const rng = colName(D1) + r + ':' + colName(DN) + r;
      ws.getCell(r, cP).value = { formula: 'COUNTIF(' + rng + ',"P")' };
      ws.getCell(r, cA).value = { formula: 'COUNTIF(' + rng + ',"A")' };
      ws.getCell(r, cPct).value = { formula: 'IF(' + colName(cP) + r + '+' + colName(cA) + r + '=0,"",' + colName(cP) + r + '/(' + colName(cP) + r + '+' + colName(cA) + r + '))' };
      ws.getCell(r, cPct).numFmt = '0%';
      [cP, cA, cPct].forEach(c => { ws.getCell(r, c).fill = fill(LIGHT); ws.getCell(r, c).font = { bold: true, color: { argb: GREEN } }; });
    }
    if(L.last >= L.first){
      ws.addConditionalFormatting({ ref: colName(D1) + L.first + ':' + colName(DN) + L.last,
        rules: LEGEND.map(([l, , , bg, fg], i) => ({ type: 'cellIs', operator: 'equal', formulae: ['"' + l + '"'], priority: i + 1, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: bg } }, font: { bold: true, color: { argb: fg } } } })) });
    }
    // totals under every day
    [['Total present', 'P', L.last + 1], ['Total absent', 'A', L.last + 2]].forEach(([, letter, r]) => {
      for(let c = 1; c <= lastCol; c++){ const cell = ws.getCell(r, c); cell.border = box; cell.fill = fill(LIGHT); cell.font = { bold: true, size: 9.5, color: { argb: GREEN } }; cell.alignment = { horizontal: c === 2 ? 'right' : 'center' }; }
      for(let c = D1; c <= DN; c++) if(L.last >= L.first) ws.getCell(r, c).value = { formula: 'COUNTIF(' + colName(c) + L.first + ':' + colName(c) + L.last + ',"' + letter + '")' };
    });
    const foot = L.last + 4; ws.mergeCells(foot, 1, foot, lastCol);
    Object.assign(ws.getCell(foot, 1), { font: { size: 10, italic: true, color: { argb: GREY } }, alignment: { wrapText: true } }); ws.getRow(foot).height = 30;

    // How to fill
    const hw = wb.addWorksheet('How to fill', { views: [{ showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    howToRows(d).forEach(r => hw.addRow(r));
    hw.getColumn(1).width = 10; hw.getColumn(2).width = 62; hw.getColumn(3).width = 46;
    hw.getCell('A1').font = { bold: true, size: 15, color: { argb: GREEN } };
    for(let n = 3; n <= 10; n++){ hw.mergeCells(n, 2, n, 3); const row = hw.getRow(n); row.getCell(1).font = { bold: true, size: 12, color: { argb: GREEN } }; row.getCell(1).alignment = { horizontal: 'center', vertical: 'top' }; row.getCell(2).alignment = { wrapText: true, vertical: 'top' }; row.height = 32; }
    const tH = 12;
    [1, 2, 3].forEach(c => { const x = hw.getCell(tH, c); x.font = { bold: true, color: { argb: 'FFFFFFFF' } }; x.fill = fill(GREEN); x.border = box; });
    LEGEND.forEach(([, , , bg, fg], i) => [1, 2, 3].forEach(c => { const x = hw.getCell(tH + 1 + i, c); x.fill = fill(bg); x.font = { bold: c < 3, color: { argb: fg } }; x.border = box; x.alignment = { wrapText: true, vertical: 'middle', horizontal: c === 1 ? 'center' : 'left' }; }));
    [1, 2, 3].forEach(c => { const x = hw.getCell(tH + 4, c); x.border = box; x.font = { color: { argb: GREY } }; x.alignment = { wrapText: true, horizontal: c === 1 ? 'center' : 'left' }; });
    const ex = hw.getRow(tH + 6); ex.getCell(1).font = { bold: true }; ex.getCell(2).alignment = { wrapText: true }; ex.height = 30;
    return wb;
  }
  window.buildAttendanceRegisterXlsx = buildStyled;   // for tests

  function buildPlain(d){
    const L = layout(d), ws = XLSX.utils.aoa_to_sheet(L.rows);
    ws['!cols'] = [{ wch: 11 }, { wch: 26 }, ...d.days.map(() => ({ wch: 4 })), { wch: 9 }, { wch: 9 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, L.monthTitle);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(howToRows(d)), 'How to fill');
    return wb;
  }

  // ---- what is on screen: the month chosen for import, the roll, saved marks, holidays ----
  function chosenMonth(){
    if(window.attImportMonth){ const [y, m] = window.attImportMonth.split('-').map(Number); return { year: y, month: m - 1 }; }
    const y = (typeof markAttYear === 'number') ? markAttYear : (typeof calendarYear === 'number' ? calendarYear : new Date().getFullYear());
    const m = (typeof markAttMonth === 'number') ? markAttMonth : (typeof calendarMonth === 'number' ? calendarMonth : new Date().getMonth());
    return { year: y, month: m };
  }
  function gather(){
    const { year, month } = chosenMonth();
    const n = new Date(year, month + 1, 0).getDate(), days = [];
    const ymd = dd => year + '-' + String(month + 1).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
    for(let dd = 1; dd <= n; dd++){
      const dow = new Date(year, month, dd).getDay(); if(dow === 0) continue;   // Sundays left out, as before
      let holiday = '';
      try { holiday = (typeof complianceHolidayName === 'function' && complianceHolidayName(year, month, dd)) || (typeof studentHolidays !== 'undefined' && studentHolidays[ymd(dd)]) || ''; } catch(e){}
      days.push({ day: dd, dow, holiday: holiday ? String(holiday) : '' });
    }
    const recs = (typeof attendanceRecords !== 'undefined') ? attendanceRecords : {};
    const kids = (Array.isArray(realPupilsCache) ? realPupilsCache : []).map(p => {
      const marks = {};
      days.forEach(x => {
        if(x.holiday){ marks[x.day] = 'H'; return; }
        const v = (recs[ymd(x.day)] || {})[p.id];
        if(v === 'present' || v === 'late') marks[x.day] = 'P'; else if(v === 'absent') marks[x.day] = 'A';
      });
      return { reg: p.register_no || '', name: p.name, marks };
    });
    const teacherEl = document.querySelector('.user-menu .user-name');
    const std = (typeof workbookLevelFromClassName === 'function' && workbookLevelFromClassName() === 'Sr KG') ? 'Senior KG (Balvatika 3)' : 'Junior KG (Balvatika 2)';
    return { year, month, school: (myClassInfo && myClassInfo.school_name) || '', standard: std, teacher: teacherEl ? teacherEl.textContent.trim() : '', days, kids };
  }
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
  async function downloadAttendanceRegister(){
    const d = gather();
    const file = ('Attendance_' + MONTHS[d.month] + '_' + d.year + '_' + (d.standard.startsWith('Senior') ? 'SrKG' : 'JrKG') + '_' + (d.school || 'class')).replace(/[^A-Za-z0-9_]+/g, '_').replace(/_+/g, '_') + '.xlsx';
    try {
      const ExcelJS = await loadExcelJS();
      const buf = await buildStyled(ExcelJS, d).xlsx.writeBuffer();
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = file;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch(e){
      if(typeof XLSX === 'undefined'){ alert('.xlsx support did not load (no internet reached the CDN) — try again once you\u2019re online.'); return; }
      XLSX.writeFile(buildPlain(d), file);
    }
  }
  if(typeof downloadAttendanceSheetTemplate === 'function') downloadAttendanceSheetTemplate = downloadAttendanceRegister;
  window.downloadAttendanceRegister = downloadAttendanceRegister;

  // The button says which month it gives, and follows "Month to import".
  function labelButton(){
    const btn = document.querySelector('button[onclick*="downloadAttendanceSheetTemplate"]'); if(!btn) return;
    const { year, month } = chosenMonth();
    const text = '\u2193 Download ' + MONTHS[month] + ' ' + year + ' register';
    if(btn.textContent.trim() !== text) btn.textContent = text;
    btn.title = 'A register for ' + MONTHS[month] + ' ' + year + ' with your children listed, the weekdays and holidays, and P / A / H boxes.';
  }
  document.addEventListener('change', e => { if(e.target && e.target.id === 'attImportMonthSel') setTimeout(labelButton, 0); });
  if(typeof renderSmartImportCard === 'function'){
    const baseCard = renderSmartImportCard;
    renderSmartImportCard = function(mode){ const card = baseCard.apply(this, arguments); if(mode !== 'roll') setTimeout(labelButton, 0); return card; };
  }
  window.labelAttendanceDownloadButton = labelButton;
})();