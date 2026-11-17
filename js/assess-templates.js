/* =========================================================================
   js/assess-templates.js — a descriptive Workbook assessment sheet
   -------------------------------------------------------------------------
   Assessment → Workbook → "Download sheet" used to give a bare class-count
   table (cg_code · competency · count_b …). It now gives a sheet a new
   teacher can fill without help, laid out like the Foundation's monthly
   assessment sheets:

     Sheet 1  "<Book> <Month>"   title · school · class · teacher
                                 how to fill (one line) · B / P / A legend
                                 headings: Roll No. | Student Name | Page 15 · Act 1 …
                                 CG row · Activity row · Goal row
                                 one row per child (from the class roll), with a
                                 B / P / A drop-down and colours; saved marks filled in
     Sheet 2  "How to fill"      step by step, with the meaning of B / P / A
     Sheet 3  "CG list"          every CG code on the sheet, in words

   The sheet imports straight back (Import a file): the headings, the CG row
   and the book name in the title are what the import reads.

   Styled with ExcelJS (loaded from cdnjs when first needed). If it can't
   load, the same sheet is made without colours with SheetJS.
   Loads after the part files and js/assess-import-checks.js (teacher.html).
   ========================================================================= */
(function(){
  'use strict';

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const LEGEND = [
    ['B', 'Beginner',   'is just starting — needs help to do the activity',  'FFFDE2E1', 'FF9B1C1C'],
    ['P', 'Proficient', 'does the activity with a little help',               'FFFFF4CC', 'FF7A5A00'],
    ['A', 'Advanced',   'does it on their own, correctly and confidently',    'FFE3F4E8', 'FF1E6B46'],
  ];
  const GREEN = 'FF1E8F5E', LIGHT = 'FFEFF7F2', GREY = 'FF6B7A72';

  // ---------------------------------------------------------------------
  // The sheet, as rows of cells. Used by both the styled and plain builds.
  // d = { book, month, year, school, standard, teacher, acts:[{page, act, many, cg, title, id}],
  //       kids:[{reg, name, marks:{pageId:'B'|'P'|'A'}}], goals:{ '2': {text, area} } }
  // ---------------------------------------------------------------------
  function goalOf(d, cg){ const m = String(cg || '').match(/(\d+)/); return m && d.goals[m[1]] ? d.goals[m[1]] : null; }
  function layout(d){
    const head = d.acts.map(a => 'Page ' + a.page + (a.many ? ' · Act ' + a.act : ''));
    const rows = [];
    rows.push(['Workbook Assessment — ' + d.book + ' — ' + d.month + ' ' + d.year + ' — ' + pageRange(d.acts) + ' (' + d.acts.length + (d.acts.length === 1 ? ' activity)' : ' activities)')]);                         // 1
    rows.push([d.school + '   ·   ' + d.standard + (d.teacher ? '   ·   Teacher: ' + d.teacher : '')]);          // 2
    rows.push(['Write ONE letter in each white box: B, P or A. Leave the box empty if the child was not assessed (absent, or the page was not done). New to this sheet? Open the “How to fill” tab at the bottom.']); // 3
    rows.push(LEGEND.map(([l, w, what]) => l + ' = ' + w + ' — ' + what));                                       // 4
    rows.push([]);                                                                                                // 5
    rows.push(['Roll No.', 'Student Name', ...head]);                                                             // 6  headings (the import reads these)
    rows.push(['CG', '', ...d.acts.map(a => a.cg)]);                                                              // 7  CG row (the import reads this too)
    rows.push(['Activity', '', ...d.acts.map(a => a.title || '')]);                                               // 8
    rows.push(['Goal', '', ...d.acts.map(a => { const g = goalOf(d, a.cg); return g ? g.text : ''; })]);          // 9
    d.kids.forEach(k => rows.push([k.reg || '', k.name, ...d.acts.map(a => k.marks[a.id] || '')]));               // 10…
    rows.push([]);
    rows.push(['Empty box = not assessed.  Please don’t change rows 1–9, the headings or the children’s names — the portal reads them to put each mark in the right place. A child missing from the list? Add them under Class Attendance → Admissions first, then download a new sheet.']);
    return { rows, first: 10, last: 9 + d.kids.length, cols: 2 + d.acts.length };
  }
  function howToRows(d){
    return [
      ['How to fill the Workbook Assessment sheet'],
      [],
      ['1', 'Check the top of the first sheet: the book (' + d.book + '), the month (' + d.month + ' ' + d.year + ') and your class must be right. This sheet has only the ' + d.month + ' pages of ' + d.book + ' (' + pageRange(d.acts) + ') — for another month or book, choose it on the Workbook screen and download again.'],
      ['2', 'Each ROW is one child. Each COLUMN is one activity in the workbook — “Page 18 · Act 2” means the 2nd activity on page 18. The row “Activity” under the headings says what the child does there.'],
      ['3', 'Open the child’s workbook at that page and look at what they did.'],
      ['4', 'Write ONE letter in the box: B, P or A (see the table below). You can also pick it from the little arrow in the box.'],
      ['5', 'If the child was absent, or did not do that page, leave the box EMPTY. Don’t write 0, -, X or Ab.'],
      ['6', 'Don’t add, delete or move columns, and don’t change the headings, the CG row or the names.'],
      ['7', 'To put the marks in the portal: Assessment → Workbook → choose ' + d.month + ' → Import a file → choose this file. Check the preview, then Save.'],
      [],
      ['Letter', 'Means', 'When to write it'],
      ...LEGEND.map(([l, w, what]) => [l, w, 'The child ' + what + '.']),
      ['(empty)', 'Not assessed', 'The child was absent, or the page was not done yet.'],
      [],
      ['Example', 'Asha did page 15 on her own, needed a little help on page 16, and was absent for page 18:', 'Page 15 → A    Page 16 → P    Page 18 → (leave empty)'],
    ];
  }
  function cgRows(d){
    const seen = {}, out = [['CG code', 'Curricular goal', 'Development area', 'Activities on this sheet']];
    d.acts.forEach(a => { const k = String(a.cg || '').trim(); if(!k) return; (seen[k] = seen[k] || []).push('Page ' + a.page + (a.many ? ' · Act ' + a.act : '')); });
    Object.keys(seen).sort((x, y) => { const p = s => s.replace(/[^\d.]/g, '').split('.').map(Number); const [a1, a2 = 0] = p(x), [b1, b2 = 0] = p(y); return a1 - b1 || a2 - b2; })
      .forEach(k => { const g = goalOf(d, k); out.push([k, g ? g.text : '', g ? g.area : '', seen[k].join(', ')]); });
    return out;
  }
  // "Pages 15–25" (or "Page 7") — the pages of this book scheduled for this month
  function pageRange(acts){
    const ps = [...new Set(acts.map(a => +a.page))].sort((a, b) => a - b);
    if(!ps.length) return '';
    return ps.length === 1 ? 'Page ' + ps[0] : 'Pages ' + ps[0] + '\u2013' + ps[ps.length - 1];
  }
  function sheetName(d){ return (d.book + ' ' + d.month).replace(/[\\\/?*\[\]:]/g, ' ').slice(0, 31); }

  // ---------------------------------------------------------------------
  // Styled build (ExcelJS). Exposed for testing as window.buildWorkbookAssessmentXlsx.
  // ---------------------------------------------------------------------
  function buildStyled(ExcelJS, d){
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Bhavyata portal';
    const L = layout(d), ws = wb.addWorksheet(sheetName(d), {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 9, showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '6:9', margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
    });
    L.rows.forEach(r => ws.addRow(r));
    const lastCol = L.cols, colL = n => ws.getColumn(n).letter;
    ws.getColumn(1).width = 10; ws.getColumn(2).width = 26;
    for(let c = 3; c <= lastCol; c++) ws.getColumn(c).width = 14;
    const thin = { style: 'thin', color: { argb: 'FFB9C7BF' } }, box = { top: thin, left: thin, bottom: thin, right: thin };
    const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
    // 1–3 title, details, instruction
    ws.mergeCells(1, 1, 1, lastCol); ws.mergeCells(2, 1, 2, lastCol); ws.mergeCells(3, 1, 3, lastCol);
    Object.assign(ws.getCell('A1'), { font: { bold: true, size: 16, color: { argb: GREEN } } });
    Object.assign(ws.getCell('A2'), { font: { bold: true, size: 11, color: { argb: GREY } } });
    Object.assign(ws.getCell('A3'), { font: { size: 11 }, alignment: { wrapText: true, vertical: 'middle' }, fill: fill('FFFFF8E6') });
    ws.getRow(1).height = 26; ws.getRow(3).height = 34;
    // 4 legend: three coloured boxes across the sheet
    const span = Math.max(1, Math.floor(lastCol / 3));
    for(let c = 1; c <= lastCol; c++) ws.getCell(4, c).value = null;   // the plain build's three legend cells → one coloured band
    LEGEND.forEach(([l, w, what, bg, fg], i) => {
      const from = 1 + i * span, to = i === 2 ? lastCol : from + span - 1;
      if(to > from) ws.mergeCells(4, from, 4, to);
      const c = ws.getCell(4, from);
      c.value = { richText: [{ text: l + ' = ' + w, font: { bold: true, size: 11, color: { argb: fg } } }, { text: '  —  ' + what, font: { size: 10, color: { argb: fg } } }] };
      c.fill = fill(bg); c.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }; c.border = box;
    });
    ws.getRow(4).height = 32;
    // 6 headings, 7 CG, 8 Activity, 9 Goal
    for(let c = 1; c <= lastCol; c++){
      const h = ws.getCell(6, c); h.font = { bold: true, color: { argb: 'FFFFFFFF' } }; h.fill = fill(GREEN); h.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; h.border = box;
      const g = ws.getCell(7, c); g.font = { bold: true, color: { argb: GREEN } }; g.fill = fill(LIGHT); g.alignment = { horizontal: 'center', vertical: 'middle' }; g.border = box;
      const a = ws.getCell(8, c); a.font = { size: 9.5, color: { argb: 'FF33413A' } }; a.fill = fill(LIGHT); a.alignment = { wrapText: true, vertical: 'top', horizontal: 'center' }; a.border = box;
      const o = ws.getCell(9, c); o.font = { size: 9, italic: true, color: { argb: GREY } }; o.fill = fill(LIGHT); o.alignment = { wrapText: true, vertical: 'top', horizontal: 'center' }; o.border = box;
    }
    ['A7', 'A8', 'A9'].forEach(k => { ws.getCell(k).font = { bold: true, size: 9.5, color: { argb: GREY } }; ws.getCell(k).alignment = { horizontal: 'left', vertical: 'top' }; });
    ws.getRow(6).height = 22; ws.getRow(8).height = 62; ws.getRow(9).height = 40;
    // children
    for(let r = L.first; r <= L.last; r++){
      ws.getRow(r).height = 20;
      for(let c = 1; c <= lastCol; c++){
        const cell = ws.getCell(r, c); cell.border = box;
        cell.alignment = { vertical: 'middle', horizontal: c === 2 ? 'left' : 'center' };
        if(c === 2) cell.font = { bold: true };
        if(c >= 3) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"B,P,A"'], showErrorMessage: true, errorStyle: 'stop', errorTitle: 'B, P or A', error: 'Write B (Beginner), P (Proficient) or A (Advanced) — or leave the box empty if the child was not assessed.', showInputMessage: false };
      }
    }
    if(L.last >= L.first && lastCol >= 3){
      const ref = 'C' + L.first + ':' + colL(lastCol) + L.last;
      ws.addConditionalFormatting({ ref, rules: LEGEND.map(([l, , , bg, fg], i) => ({ type: 'cellIs', operator: 'equal', formulae: ['"' + l + '"'], priority: i + 1, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: bg } }, font: { bold: true, color: { argb: fg } } } })) });
    }
    const foot = L.last + 2; ws.mergeCells(foot, 1, foot, lastCol);
    Object.assign(ws.getCell(foot, 1), { font: { size: 10, italic: true, color: { argb: GREY } }, alignment: { wrapText: true } }); ws.getRow(foot).height = 30;

    // How to fill
    const fitPage = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 } };
    const hw = wb.addWorksheet('How to fill', { views: [{ showGridLines: false }], pageSetup: fitPage });
    howToRows(d).forEach(r => hw.addRow(r));
    hw.getColumn(1).width = 10; hw.getColumn(2).width = 60; hw.getColumn(3).width = 48;
    hw.getCell('A1').font = { bold: true, size: 15, color: { argb: GREEN } };
    hw.eachRow((row, n) => {
      if(n >= 3 && n <= 9){ hw.mergeCells(n, 2, n, 3); row.getCell(1).font = { bold: true, size: 12, color: { argb: GREEN } }; row.getCell(1).alignment = { horizontal: 'center', vertical: 'top' }; row.getCell(2).alignment = { wrapText: true, vertical: 'top' }; row.height = 32; }
    });
    const tHead = 11;
    [1, 2, 3].forEach(c => { const x = hw.getCell(tHead, c); x.font = { bold: true, color: { argb: 'FFFFFFFF' } }; x.fill = fill(GREEN); x.border = box; });
    LEGEND.forEach(([, , , bg, fg], i) => [1, 2, 3].forEach(c => { const x = hw.getCell(tHead + 1 + i, c); x.fill = fill(bg); x.font = { bold: c < 3, color: { argb: fg } }; x.border = box; x.alignment = { wrapText: true, vertical: 'middle', horizontal: c === 1 ? 'center' : 'left' }; }));
    [1, 2, 3].forEach(c => { const x = hw.getCell(tHead + 4, c); x.border = box; x.alignment = { wrapText: true, horizontal: c === 1 ? 'center' : 'left' }; x.font = { color: { argb: GREY } }; });
    const ex = hw.getRow(tHead + 6); ex.getCell(1).font = { bold: true }; ex.getCell(2).alignment = { wrapText: true }; ex.getCell(3).alignment = { wrapText: true }; ex.height = 34;

    // CG list
    const cw = wb.addWorksheet('CG list', { views: [{ state: 'frozen', ySplit: 1, showGridLines: false }], pageSetup: Object.assign({}, fitPage, { orientation: 'landscape' }) });
    cgRows(d).forEach(r => cw.addRow(r));
    [12, 46, 30, 46].forEach((w, i) => { cw.getColumn(i + 1).width = w; });
    cw.eachRow((row, n) => row.eachCell({ includeEmpty: true }, c => {
      c.border = box; c.alignment = { wrapText: true, vertical: 'top' };
      if(n === 1){ c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = fill(GREEN); } else if(c.col === 1) c.font = { bold: true, color: { argb: GREEN } };
    }));
    return wb;
  }
  window.buildWorkbookAssessmentXlsx = buildStyled;   // for tests

  // Plain build (SheetJS), when ExcelJS can't load: same cells, no colours.
  function buildPlain(d){
    const L = layout(d), ws = XLSX.utils.aoa_to_sheet(L.rows);
    ws['!cols'] = [{ wch: 10 }, { wch: 26 }, ...d.acts.map(() => ({ wch: 14 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName(d));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(howToRows(d)), 'How to fill');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cgRows(d)), 'CG list');
    return wb;
  }

  // ---------------------------------------------------------------------
  // Gather what is on screen: class, month, book, its activities, the roll
  // and any marks already saved.
  // ---------------------------------------------------------------------
  let goalsCache = null;
  async function loadGoals(){
    if(goalsCache) return goalsCache;
    try {
      const res = await fetch('backend/curriculum/get_curricular_goals.php' + window.location.search);
      const data = await res.json();
      const out = {};
      (data.curricular_goals || []).forEach(g => { const m = String(g.goal_text || '').match(/CG-?\s*(\d+)/i); if(m) out[m[1]] = { text: g.goal_text, area: g.area_name || '' }; });
      goalsCache = out;
    } catch(e){ goalsCache = {}; }   // the sheet still works without the goal names
    return goalsCache;
  }
  function schoolYearOf(monthName){
    const now = new Date(), start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    return MONTHS.indexOf(monthName) >= 5 ? start : start + 1;   // June–December: the first year; January–May: the next
  }
  async function gather(){
    const level = workbookLevelFromClassName(), month = currentWorkbookMonth;
    const books = workbookPagesCache[level + '|' + month];
    const book = Array.isArray(books) ? (books.find(b => b.name === currentWorkbookCompetencyBookName) || books[0]) : null;
    if(!book || !Array.isArray(book.pages) || !book.pages.length) throw new Error('No ' + month + ' activities are loaded for this book yet — open Workbook, choose the month and book, then try again.');
    const perPage = {}; book.pages.forEach(p => { const k = String(p.page_number).replace(/\.0$/, ''); perPage[k] = (perPage[k] || 0) + 1; });
    const acts = book.pages.slice().sort((a, b) => (+a.page_number - +b.page_number) || ((a.activity_no || 1) - (b.activity_no || 1)))
      .map(p => { const page = String(p.page_number).replace(/\.0$/, ''); return { id: p.id, page, act: p.activity_no || 1, many: perPage[page] > 1, cg: String(p.cg_code || '').trim(), title: String(p.activity_title || '').trim() }; });
    const saved = (typeof workbookChildMarksCache !== 'undefined' && workbookChildMarksCache[month] && typeof workbookChildMarksCache[month] === 'object') ? workbookChildMarksCache[month] : {};
    const letter = v => v === 'E' ? 'B' : (v === 'P' || v === 'A') ? v : '';
    const kids = (Array.isArray(realPupilsCache) ? realPupilsCache : []).map(p => {
      const m = {}; acts.forEach(a => { const v = letter((saved[p.id] || {})[a.id]); if(v) m[a.id] = v; });
      return { reg: p.register_no || '', name: p.name, marks: m };
    });
    const teacherEl = document.querySelector('.user-menu .user-name');
    return {
      book: book.name, month, year: schoolYearOf(month),
      school: (myClassInfo && myClassInfo.school_name) || '',
      standard: level === 'Sr KG' ? 'Senior KG (Balvatika 3)' : 'Junior KG (Balvatika 2)',
      teacher: teacherEl ? teacherEl.textContent.trim() : '',
      acts, kids, goals: await loadGoals(),
    };
  }

  window.workbookSheetData = gather; // the Workbook sheet's data (book pages, saved marks, CG goals) — used by assess-pretty-sheets.js

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
  function save(blob, name){
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  async function downloadWorkbookAssessmentSheet(){
    let d;
    try { d = await gather(); } catch(err){ alert(err.message || err); return; }
    const file = ('Workbook_' + d.book + '_' + d.month + '_' + pageRange(d.acts).replace(/\s+/g, '').replace('\u2013', '-') + '_' + (d.standard.startsWith('Senior') ? 'SrKG' : 'JrKG') + '_' + (d.school || 'class')).replace(/[^A-Za-z0-9_]+/g, '_').replace(/_+/g, '_') + '.xlsx';
    try {
      const ExcelJS = await loadExcelJS();
      const buf = await buildStyled(ExcelJS, d).xlsx.writeBuffer();
      save(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), file);
    } catch(e){
      if(typeof XLSX === 'undefined'){ alert('.xlsx support did not load (no internet reached the CDN) — try again once you\u2019re online.'); return; }
      XLSX.writeFile(buildPlain(d), file);   // same sheet, without colours
    }
  }
  window.downloadWorkbookAssessmentSheet = downloadWorkbookAssessmentSheet;

  function labelDownloadButton(){
    if(typeof assessmentEntryType !== 'undefined' && assessmentEntryType !== 'workbook') return;
    const btn = document.querySelector('button[onclick*="assessDownloadSheet(\'workbook\')"]');
    if(!btn) return;
    let text = '\u2193 Download sheet';
    try {
      const books = workbookPagesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth];
      const book = Array.isArray(books) ? (books.find(b => b.name === currentWorkbookCompetencyBookName) || books[0]) : null;
      if(book && Array.isArray(book.pages) && book.pages.length){
        const acts = book.pages.map(p => ({ page: String(p.page_number).replace(/\.0$/, '') }));
        text = '\u2193 Download ' + book.name + ' \u00b7 ' + currentWorkbookMonth + ' sheet';
        btn.title = 'Only ' + currentWorkbookMonth + '\u2019s pages of ' + book.name + ': ' + pageRange(acts) + ', ' + book.pages.length + (book.pages.length === 1 ? ' activity' : ' activities') + ', with your children listed.';
      }
    } catch(e){}
    if(btn.textContent.trim() !== text) btn.textContent = text;
  }
  window.labelWorkbookDownloadButton = labelDownloadButton;
  if(typeof renderMonthlyAssessment === 'function'){
    const baseRender = renderMonthlyAssessment;
    renderMonthlyAssessment = function(){
      const r = baseRender.apply(this, arguments);
      setTimeout(labelDownloadButton, 0); // after the month and book pickers are drawn
      return r;
    };
  }

  if(typeof assessDownloadSheet === 'function'){
    const base = assessDownloadSheet;
    assessDownloadSheet = function(type){
      if(type === 'workbook') return downloadWorkbookAssessmentSheet();
      return base.apply(this, arguments);
    };
  }
})();