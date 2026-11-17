/* =========================================================================
   import-class-filter.js — keeps every Excel / CSV import to THIS class
   -------------------------------------------------------------------------
   Schools often keep one register file for both classes: Jr KG and Sr KG
   children in one sheet with a "Class" column, and one master sheet per
   class with the register numbers. Every importer in the teacher portal
   (attendance, admissions / class list, assessments) reads files through
   XLSX.read, so this file wraps XLSX.read and cleans the workbook BEFORE
   any importer sees it:

     1. A sheet with a "Class" / "Std" / "वर्ग" / "इयत्ता" column keeps
        only the rows for the class you are logged in to. Rows for another
        class (Sr KG when you are Junior KG, and so on) are left out.
     2. A sheet whose NAME says it is another class ("MASTER SHEET SR.KG")
        is left out.
     3. If an attendance grid or class list has no register-number column,
        but another sheet of THIS class lists Register No + Student Name,
        a "Register No" column is filled in from it, matched by name.
     4. If nothing in the file belongs to this class, the file is refused
        with an alert, and nothing in it reaches the importer.

   Files with only one class and no "Class" column pass through unchanged.
   The teacher is told in one alert what was kept and what was left out.
   Load AFTER the xlsx library and the teacher part files (teacher.html).
   ========================================================================= */
(function(){
  'use strict';
  if(typeof XLSX === 'undefined' || !XLSX.read || XLSX.read.__classFiltered) return;

  const LEVEL_LABEL = { jr: 'Jr KG', sr: 'Sr KG', nur: 'Nursery' };
  const CLASS_HEADER_WORDS = ['class', 'class name', 'std', 'standard', 'grade', 'level', 'group', 'class/section',
    'class section', 'class & section', 'class and section', 'class/div', 'वर्ग', 'इयत्ता', 'कक्षा', 'गट', 'वर्ग/तुकडी'];
  const NAME_WORDS_FALLBACK = ['name', 'student name', 'name of student', 'students name', "student's name", 'child name',
    'name of child', 'child', 'student', 'pupil', 'pupil name', 'full name', 'नाव', 'नाम', 'विद्यार्थ्याचे नाव'];
  const REG_WORDS_FALLBACK = ['register no', 'register number', 'reg no', 'regno', 'register', 'gr no', 'gr number', 'grno',
    'general register no', 'admission no', 'admission number', 'adm no', 'min no', 'mun no'];

  const norm = v => String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[:.]$/, '');
  const headerNorm = v => norm(v).replace(/\./g, '').replace(/[:#]/g, ' ').replace(/[_\s]+/g, ' ').trim();
  const isNameHeader = v => {
    const n = norm(v);
    return (typeof SI_NAME_WORDS !== 'undefined' ? SI_NAME_WORDS : NAME_WORDS_FALLBACK).includes(n);
  };
  const isRegHeader = v => (typeof isRegisterHeader === 'function') ? isRegisterHeader(v) : REG_WORDS_FALLBACK.includes(headerNorm(v));
  const isClassHeader = v => CLASS_HEADER_WORDS.includes(headerNorm(v));
  const nameKey = v => {
    let s = String(v == null ? '' : v);
    if(typeof splitRegisterFromName === 'function') s = splitRegisterFromName(s).name;
    return s.toLowerCase().replace(/[^a-z\u0900-\u097F]+/g, ' ').trim();
  };

  // "Jr KG", "JR.KG", "Junior KG A", "LKG", "छोटा गट" → { level:'jr', div:'a' }
  function classLevel(text){
    const t = ' ' + String(text == null ? '' : text).toLowerCase().replace(/[._\-\/()]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    let level = null;
    if(/ (sr|senior|snr) ?k ?g | (skg|ukg) | upper kg | senior kindergarten |मोठा गट|वरिष्ठ/.test(t)) level = 'sr';
    else if(/ (jr|junior|jnr) ?k ?g | (jkg|lkg) | lower kg | junior kindergarten |छोटा गट|लहान गट|कनिष्ठ/.test(t)) level = 'jr';
    else if(/ nursery | play ?group |नर्सरी|शिशु/.test(t)) level = 'nur';
    else if(/^ (jr|junior) $/.test(t)) level = 'jr';
    else if(/^ (sr|senior) $/.test(t)) level = 'sr';
    if(!level) return null;
    const d = t.match(/(?:kg|गट|div|division|section|sec) ([a-h]) $/);
    return { level, div: d ? d[1] : '' };
  }

  // Every class a title or sheet name mentions: "Jr KG & Sr KG" → ['jr','sr'].
  function levelsIn(text){
    const t = ' ' + String(text == null ? '' : text).toLowerCase().replace(/[._\-\/()&,|]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    const found = [];
    if(/ (sr|senior|snr) ?k ?g | (skg|ukg) | upper kg | senior kindergarten |मोठा गट|वरिष्ठ/.test(t)) found.push('sr');
    if(/ (jr|junior|jnr) ?k ?g | (jkg|lkg) | lower kg | junior kindergarten |छोटा गट|लहान गट|कनिष्ठ/.test(t)) found.push('jr');
    if(/ nursery | play ?group |नर्सरी|शिशु/.test(t)) found.push('nur');
    return found;
  }

  function myClass(){
    let name = '';
    try { if(typeof myClassInfo !== 'undefined' && myClassInfo) name = [myClassInfo.class_name, myClassInfo.section, myClassInfo.division].filter(Boolean).join(' '); } catch(e){}
    if(!name){ const el = document.getElementById('topbarSchoolLine'); if(el) name = el.textContent.split('·').pop(); }
    const c = classLevel(name);
    if(c) c.label = (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_name) || LEVEL_LABEL[c.level];
    return c;
  }
  const sameClass = (a, mine) => a.level === mine.level && !(a.div && mine.div && a.div !== mine.div);

  // ---- Small sheet helpers (cells are copied as they are, so dates, ----
  // ---- formats and cached formula values all survive the rebuild)   ----
  function sheetRange(ws){ return ws && ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null; }
  function cellVal(ws, r, c){ const cell = ws[XLSX.utils.encode_cell({ r, c })]; return cell ? (cell.w != null ? cell.w : cell.v) : ''; }

  // The header row: a name heading in the first 40 rows.
  function findHeader(ws){
    const rg = sheetRange(ws); if(!rg) return null;
    for(let r = rg.s.r; r <= Math.min(rg.e.r, rg.s.r + 40); r++){
      let nameCol = -1, classCol = -1, regCol = -1, days = [], dates = 0;
      for(let c = rg.s.c; c <= Math.min(rg.e.c, rg.s.c + 400); c++){
        const v = cellVal(ws, r, c);
        if(nameCol < 0 && isNameHeader(v)) nameCol = c;
        else if(classCol < 0 && isClassHeader(v)) classCol = c;
        else if(regCol < 0 && isRegHeader(v)) regCol = c;
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if(cell && (cell.t === 'd' || cell.v instanceof Date)) dates++;
        else if(/^([1-9]|[12]\d|3[01])$/.test(String(cell ? cell.v : '').trim())) days.push(+cell.v);
      }
      if(nameCol >= 0){
        const grid = dates >= 5 || (days.length >= 5 && days.every((d, i) => i === 0 || d > days[i - 1]));
        let headings = 0;
        for(let c = rg.s.c; c <= rg.e.c; c++) if(String(cellVal(ws, r, c)).trim()) headings++;
        return { row: r, nameCol, classCol, regCol, grid, headings, range: rg };
      }
    }
    return null;
  }

  // Keep only the rows `keep(r)` says yes to; optionally add one column.
  function rebuildSheet(ws, keepRow, addCol){
    const rg = sheetRange(ws);
    const out = {};
    let nr = rg.s.r;
    let maxC = rg.e.c;
    for(let r = rg.s.r; r <= rg.e.r; r++){
      if(!keepRow(r)) continue;
      for(let c = rg.s.c; c <= rg.e.c; c++){
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if(cell) out[XLSX.utils.encode_cell({ r: nr, c })] = cell;
      }
      if(addCol){
        const v = addCol(r);
        if(v !== ''){ out[XLSX.utils.encode_cell({ r: nr, c: rg.e.c + 1 })] = { t: 's', v: String(v), w: String(v) }; maxC = rg.e.c + 1; }
      }
      nr++;
    }
    Object.keys(ws).forEach(k => { if(k[0] === '!' && k !== '!ref' && k !== '!merges' && k !== '!rows') out[k] = ws[k]; });
    out['!ref'] = XLSX.utils.encode_range({ s: { r: rg.s.r, c: rg.s.c }, e: { r: Math.max(rg.s.r, nr - 1), c: maxC } });
    return out;
  }

  // ---- The clean-up itself ----
  function filterWorkbook(wb){
    const mine = myClass();
    if(!mine || !wb || !Array.isArray(wb.SheetNames)) return wb;
    const report = { otherRows: {}, keptRows: 0, droppedSheets: [], regFilled: 0, regFrom: [], hadClassColumn: false };
    const keepSheets = [];

    wb.SheetNames.forEach(sn => {
      const ws = wb.Sheets[sn];
      const head = findHeader(ws);
      // A sheet with a Class column: filter its rows.
      if(head && head.classCol >= 0){
        let known = 0, filled = 0;
        for(let r = head.row + 1; r <= head.range.e.r; r++){
          const v = String(cellVal(ws, r, head.classCol)).trim(); if(!v) continue;
          filled++; if(classLevel(v)) known++;
        }
        if(filled && known >= filled * 0.6){
          report.hadClassColumn = true;
          let kept = 0;
          const keepRow = r => {
            if(r <= head.row) return true;
            const c = classLevel(cellVal(ws, r, head.classCol));
            if(!c) return true;                       // blank / heading rows stay
            const name = String(cellVal(ws, r, head.nameCol)).trim();
            const isChild = /[a-z\u0900-\u097F]{2,}/i.test(name) && !/^\d+([.,]\d+)?$/.test(name);
            if(!sameClass(c, mine)){ if(isChild) report.otherRows[LEVEL_LABEL[c.level]] = (report.otherRows[LEVEL_LABEL[c.level]] || 0) + 1; return false; }
            if(!isChild) return false;                // e.g. a "Jr KG | 10 | 214" summary row
            kept++; return true;
          };
          const rebuilt = rebuildSheet(ws, keepRow);
          report.keptRows += kept;
          wb.Sheets[sn] = rebuilt;
          if(kept) keepSheets.push(sn); // a sheet with no rows for this class is simply not passed on
          return;
        }
      }
      // A sheet whose name, or title above the header, is for another class only.
      let title = sn;
      const rg = sheetRange(ws);
      if(rg){
        const lastTitleRow = head ? head.row - 1 : Math.min(rg.e.r, rg.s.r + 4);
        for(let r = rg.s.r; r <= lastTitleRow; r++) for(let c = rg.s.c; c <= Math.min(rg.e.c, rg.s.c + 30); c++) title += ' ' + cellVal(ws, r, c);
      }
      const named = levelsIn(title);
      if(named.length && !named.includes(mine.level)){ report.droppedSheets.push(sn); return; }
      keepSheets.push(sn);
    });

    const anythingOther = report.droppedSheets.length || Object.keys(report.otherRows).length;
    const keptWithChildren = keepSheets.filter(sn => findHeader(wb.Sheets[sn]));
    if(anythingOther && !keptWithChildren.length){
      const others = Object.keys(report.otherRows).concat(report.droppedSheets.map(s => {
        const ws = wb.Sheets[s]; let t = s;
        try { const rg = sheetRange(ws); for(let r = rg.s.r; r <= Math.min(rg.e.r, rg.s.r + 4); r++) for(let c = rg.s.c; c <= Math.min(rg.e.c, rg.s.c + 30); c++) t += ' ' + cellVal(ws, r, c); } catch(e){}
        const l = levelsIn(t); return l.length ? l.map(x => LEVEL_LABEL[x]).join(' / ') : s;
      }));
      alert('This file is for ' + Array.from(new Set(others)).join(', ') + ' — nothing in it belongs to ' + mine.label + '.\n\nNothing will be imported. Log in to that class to import it there.');
      const empty = XLSX.utils.aoa_to_sheet([[]]);
      return Object.assign(wb, { SheetNames: ['(nothing for this class)'], Sheets: { '(nothing for this class)': empty } });
    }

    // Register numbers from a list sheet of THIS class (Register No + Name).
    const regMap = {}; const regCount = {};
    keepSheets.forEach(sn => {
      const ws = wb.Sheets[sn]; const head = findHeader(ws);
      if(!head || head.regCol < 0) return;
      let n = 0;
      for(let r = head.row + 1; r <= head.range.e.r; r++){
        const reg = String(cellVal(ws, r, head.regCol)).trim().replace(/\.0+$/, '');
        const key = nameKey(cellVal(ws, r, head.nameCol));
        if(!key || !/^\d{3,6}$/.test(reg)) continue;
        regCount[reg] = (regCount[reg] || 0) + 1;
        if(!regMap[key]){ regMap[key] = reg; n++; }
      }
      if(n) report.regFrom.push(sn);
    });
    Object.keys(regMap).forEach(k => { if(regCount[regMap[k]] > 1) delete regMap[k]; }); // a number used twice can't be trusted
    if(Object.keys(regMap).length){
      keepSheets.forEach(sn => {
        const ws = wb.Sheets[sn]; const head = findHeader(ws);
        if(!head || head.regCol >= 0) return;
        if(!head.grid && head.headings > 6) return;   // not an attendance grid or a plain class list — leave its layout alone
        let hits = 0;
        for(let r = head.row + 1; r <= head.range.e.r; r++) if(regMap[nameKey(cellVal(ws, r, head.nameCol))]) hits++;
        if(!hits) return;
        wb.Sheets[sn] = rebuildSheet(ws, () => true, r => r === head.row ? 'Register No' : (r > head.row ? (regMap[nameKey(cellVal(ws, r, head.nameCol))] || '') : ''));
        report.regFilled = Math.max(report.regFilled, hits);
      });
    }

    wb.SheetNames = keepSheets;
    Object.keys(wb.Sheets).forEach(k => { if(!keepSheets.includes(k)) delete wb.Sheets[k]; });

    // Tell the teacher what happened, in one message.
    if(anythingOther || report.regFilled){
      const lines = [];
      if(anythingOther){
        const left = Object.entries(report.otherRows).map(([lvl, n]) => n + ' ' + lvl + ' child' + (n === 1 ? '' : 'ren'));
        lines.push('This file has more than one class. Only ' + mine.label + ' will be imported'
          + (report.hadClassColumn ? ' (' + report.keptRows + ' child' + (report.keptRows === 1 ? '' : 'ren') + ')' : '') + '.');
        if(left.length) lines.push('Left out: ' + left.join(', ') + '.');
        if(report.droppedSheets.length) lines.push('Sheets left out (another class): ' + report.droppedSheets.join(', ') + '.');
      }
      if(report.regFilled) lines.push('Register numbers for ' + report.regFilled + ' child' + (report.regFilled === 1 ? '' : 'ren') + ' were taken from: ' + report.regFrom.join(', ') + '.');
      lines.push('\nYou will still see a preview — nothing is saved until you confirm.');
      setTimeout(() => alert(lines.join('\n')), 0);
    }
    return wb;
  }

  const originalRead = XLSX.read;
  XLSX.read = function(data, opts){
    const wb = originalRead.call(this, data, opts);
    try { return filterWorkbook(wb); }
    catch(err){ console.warn('import-class-filter: left the file as it was —', err); return wb; }
  };
  XLSX.read.__classFiltered = true;
  window.importClassFilter = { filterWorkbook, classLevel }; // for testing in the console
})();
