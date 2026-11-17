/* =========================================================================
   js/assess-import-checks.js — safer Assessment imports (📥 Import a file)
   -------------------------------------------------------------------------
   Loads AFTER teacher-part-14.js and adds to its import; part 14 itself is
   unchanged. School files are uneven, so before anything is saved the
   preview now says plainly what will and won't go in:

   1. RIGHT SHEET  — a file with several sheets (e.g. one per month): the
      sheet that matches this tab's items best is read, not just the
      longest one.
   2. RIGHT MONTH  — if the file or sheet names another month than the one
      on screen, the import says so and offers to switch to that month and
      read the file again (instead of refusing it).
   3. NAMES        — a name that isn't on the roll gets "Did you mean …?"
      with the closest child, and one click to use it. Nothing is matched
      by guess without the teacher choosing it.
   4. CHECKS       — columns that will be skipped, this month's items the
      file doesn't have, children on the roll with no row, the same child
      twice, class counts that don't add up to the roll.
   5. REPORT       — after saving: what was saved and exactly what was
      skipped and why.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof assessAnalyse !== 'function' || typeof renderAssessSmartPreview !== 'function') return;

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthIn = text => {
    const t = ' ' + String(text || '').toLowerCase().replace(/[_\-./]+/g, ' ') + ' ';
    const hits = MONTHS.filter(m => new RegExp('[^a-z](' + m.toLowerCase() + '|' + m.slice(0, 3).toLowerCase() + (m === 'September' ? '|sept' : '') + ')[^a-z]').test(t));
    return hits.length === 1 ? hits[0] : null; // two different months named → can't tell
  };
  const box = (tone, html) => {
    const c = { warn: ['#fdf1e3', '#8a5a1c'], bad: ['#fde2e1', '#9b1c1c'], info: ['#eef4fb', '#24507a'], good: ['#e6f4ec', '#1e6b46'] }[tone];
    return `<div style="background:${c[0]}; color:${c[1]}; border-radius:8px; padding:8px 10px; margin:0 0 8px; font-size:12.5px; line-height:1.45;">${html}</div>`;
  };
  const list = (items, max) => { max = max || 8; return items.slice(0, max).map(esc).join(', ') + (items.length > max ? ' and ' + (items.length - max) + ' more' : ''); };

  // ---- closest name on the roll (for "Did you mean …?") ----
  function lev(a, b){
    const m = a.length, n = b.length; if(!m || !n) return Math.max(m, n);
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for(let i = 1; i <= m; i++){
      const cur = [i];
      for(let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  const squash = s => normPupilName(s).replace(/[^a-z\u0900-\u097f ]/g, '').replace(/\s+/g, ' ').trim();
  function closestOnRoll(name, takenIds){
    const a = squash(name); if(a.length < 3) return null;
    const scored = (realPupilsCache || []).filter(p => !takenIds.has(p.id)).map(p => {
      const b = squash(p.name);
      const whole = 1 - lev(a.replace(/ /g, ''), b.replace(/ /g, '')) / Math.max(a.length, b.length);
      const firstSame = a.split(' ')[0] === b.split(' ')[0] ? 0.05 : 0;
      return { p, score: whole + firstSame };
    }).sort((x, y) => y.score - x.score);
    if(!scored.length || scored[0].score < 0.72) return null;
    if(scored[1] && scored[0].score - scored[1].score < 0.06) return null; // two equally close children → don't suggest
    return scored[0].p;
  }

  // ---- 3. add suggestions to the analysis (file and photo imports) ----
  // ---- A row whose name isn't on the roll is matched by its register number, when the file has one ----
  function matchByRegister(S, grid){
    const regNorm = v => String(v == null ? '' : v).replace(/\.0+$/, '').replace(/\s+/g, '').replace(/^0+(?=\d)/, '');
    const byReg = {}; (realPupilsCache || []).forEach(p => { const r = regNorm(p.register_no || p.register_number || p.roll_no); if(r) byReg[r] = p; });
    if(!Object.keys(byReg).length) return;
    for(let h = 0; h < Math.min(grid.length, 15); h++){
      const head = (grid[h] || []).map(c => String(c == null ? '' : c).toLowerCase().replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim());
      const ri = head.findIndex(x => /^(register|register no|register number|reg no|reg|roll no|g r no|gr no)$/.test(x));
      const ni = head.findIndex(x => /(student|child)?\s*name$/.test(x) && x.length <= 14);
      if(ri < 0 || ni < 0) continue;
      const regOf = {}; grid.slice(h + 1).forEach(r => { const n = normPupilName(String(r[ni] == null ? '' : r[ni])); if(n) regOf[n] = regNorm(r[ri]); });
      const taken = new Set(S.rows.filter(r => r.pupilId).map(r => r.pupilId));
      S.rows.forEach(r => { if(r.pupilId) return; const p = byReg[regOf[normPupilName(r.raw)]]; if(p && !taken.has(p.id)){ r.pupilId = p.id; r.byRegister = true; taken.add(p.id); delete r.suggest; } });
      return;
    }
  }

  // ---- Pre-Test: one child-wise layout for every way in ----
  // A Pre-Test LIST (child_name · register_no · activity_no · B · P · A, 1 under
  // the chosen grade) becomes the same GRID as a marksheet: Register No ·
  // Student Name · 1 … 26 with B / P / A. Grid headings like "1\nCG 4.1" become "1".
  function preTestCanonical(grid){
    const norm = v => String(v == null ? '' : v).toLowerCase().replace(/["'`]/g, '').replace(/\s+/g, ' ').trim();
    const nAct = (typeof WEEKLY_ASSESSMENT_ACTIVITIES !== 'undefined') ? WEEKLY_ASSESSMENT_ACTIVITIES.length : 26;
    for(let h = 0; h < Math.min(grid.length, 12); h++){
      const head = (grid[h] || []).map(norm);
      const ci = head.findIndex(x => /^(child[_ ]?name|student[_ ]?name|name)$/.test(x));
      const ai = head.findIndex(x => /^(activity[_ ]?(no|number)?|act[_ ]?no)$/.test(x));
      const bi = head.indexOf('b'), pi = head.indexOf('p'), xi = head.indexOf('a');
      if(ci >= 0 && ai >= 0 && bi >= 0 && pi >= 0 && xi >= 0){
        const ri = head.findIndex(x => /^(register[_ ]?(no|number)?|reg[_ ]?no|roll[_ ]?no)$/.test(x));
        const on = v => /^(1|1\.0+|✓|✔|x|yes|y|true)$/i.test(String(v == null ? '' : v).trim());
        const kids = new Map(); // one grid row per child, in the file's order
        grid.slice(h + 1).forEach(r => {
          const name = String(r[ci] == null ? '' : r[ci]).trim(), reg = ri >= 0 ? String(r[ri] == null ? '' : r[ri]).trim() : '';
          const act = parseInt(r[ai], 10); if(!(name || reg) || !(act >= 1 && act <= nAct)) return;
          const key = reg || name.toLowerCase(); if(!kids.has(key)) kids.set(key, { reg, name, marks: Array(nAct).fill('') });
          const f = [on(r[bi]), on(r[pi]), on(r[xi])], n = f.filter(Boolean).length;
          kids.get(key).marks[act - 1] = n === 1 ? ['B', 'P', 'A'][f.indexOf(true)] : n > 1 ? '?' : ''; // two 1s → asks in the preview
        });
        return [['Register No', 'Student Name', ...Array.from({ length: nAct }, (_, i) => String(i + 1))], ...[...kids.values()].map(k => [k.reg, k.name, ...k.marks])];
      }
      const ni = head.findIndex(x => /^(student name|child name|child|name)$/.test(x));
      if(ni >= 0 && (grid[h] || []).filter((c, j) => j !== ni && /^\d{1,2}(\D|$)/.test(String(c).trim())).length >= 3){
        const g = grid.map(r => r.slice()); // copy, then plain activity numbers in the heading row
        g[h] = g[h].map((c, j) => (j !== ni && /^\d{1,2}(\D|$)/.test(String(c).trim())) ? String(parseInt(String(c).trim(), 10)) : c);
        return g;
      }
    }
    return grid;
  }
  // ⬇ Download template on the Pre-Test card: this class's children × activities 1–26, with any saved marks.
  function preTestTemplate(){
    if(typeof XLSX === 'undefined'){ alert('The spreadsheet tool did not load — check the internet and try again.'); return; }
    const acts = WEEKLY_ASSESSMENT_ACTIVITIES, kids = realPupilsCache || [];
    const store = (typeof preTestAssessmentEntries !== 'undefined') ? preTestAssessmentEntries : {};
    const aoa = [['Pre-Test — ' + ((myClassInfo && myClassInfo.class_name) || '') + ' — Term ' + (typeof currentAssessTerm === 'function' ? currentAssessTerm() : 1)],
      ['Type B, P or A under each activity. Leave it empty when the child was not assessed.'], [],
      ['Register No', 'Student Name', ...acts.map((a, i) => (i + 1) + '\n' + a.cg)],
      ...kids.map(p => [p.register_no || '', p.name, ...acts.map((a, i) => ((store[p.name] || {})[String(i)]) || '')])];
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 12 }, { wch: 28 }, ...acts.map(() => ({ wch: 7 }))];
    const list = XLSX.utils.aoa_to_sheet([['No.', 'Activity', 'Type', 'CG'], ...acts.map((a, i) => [i + 1, a.activity, a.type, a.cg])]); list['!cols'] = [{ wch: 5 }, { wch: 60 }, { wch: 12 }, { wch: 10 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Pre-Test'); XLSX.utils.book_append_sheet(wb, list, 'Activities');
    XLSX.writeFile(wb, 'pretest-to-fill-' + String((myClassInfo && myClassInfo.class_name) || 'class').replace(/\W+/g, '') + '.xlsx');
  }
  if(typeof assessDownloadSheet === 'function'){ const baseDl = assessDownloadSheet; assessDownloadSheet = function(type){ return type === 'pretest' ? preTestTemplate() : baseDl.apply(this, arguments); }; }
  if(typeof assessManualSheet === 'function'){ const baseMan = assessManualSheet; assessManualSheet = function(type){
    if(type !== 'pretest') return baseMan.apply(this, arguments);
    const el = document.getElementById('preTestTypeSelect'); if(!el) return; // ✍ Enter manually: go to the activity choice and the child table
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' }); el.focus(); }; }

  const baseAnalyse = assessAnalyse;
  assessAnalyse = function(type, grid, fileName, source){
    if(type === 'pretest' && Array.isArray(grid)) grid = preTestCanonical(grid);
    const S = baseAnalyse.call(this, type, grid, fileName, source);
    if(S && !S.tally && Array.isArray(S.rows) && Array.isArray(grid)) matchByRegister(S, grid);
    if(S && !S.tally && Array.isArray(S.rows)){
      const taken = new Set(S.rows.filter(r => r.pupilId).map(r => r.pupilId));
      S.rows.forEach(r => {
        if(r.pupilId || !r.include) return;
        if(window.NameMatch){ // js/name-match.js: sure matches are used (and shown); guesses only suggested
          const m = NameMatch.find(r.raw, { taken });
          if(m.pupil && m.sure){ r.pupilId = m.pupil.id; r.matchedHow = m.how; taken.add(m.pupil.id); }
          else if(m.pupil) r.suggest = { id: m.pupil.id, name: m.pupil.name };
          return;
        }
        const p = closestOnRoll(r.raw, taken); if(p){ r.suggest = { id: p.id, name: p.name }; }
      });
    }
    return S;
  };

  // ---- 1 & 2. choose the right sheet; offer the right month ----
  var assessPendingFile = null; // { type, fileName, sheets } kept while the month switches
  // Does a sheet hold any marks / counts at all? (Templates have empty month sheets.)
  function hasMarks(S){
    if(S.tally) return S.rows.some(r => r.b + r.p + r.a > 0);
    return S.rows.some(r => r.marks.some(m => m && m !== '?'));
  }
  function analyseBest(type, sheets, fileName){
    let best = null;
    // A monthly import (observation or workbook) reads only the sheet of the month selected, never the Pre-Test sheet.
    if(type === 'observation' || type === 'workbook'){
      const notPre = sheets.filter(sh => !/pre[\s-]?test/i.test(sh.name));
      const sameMonth = notPre.filter(sh => monthIn(sh.name) === currentWorkbookMonth);
      if(sameMonth.length) sheets = sameMonth;
    }
    const all = sheets.map(sh => { prepareSheetItems(type, [sh]); return { sh, S: assessAnalyse(type, sh.grid, fileName, 'file') }; });
    const filled = all.filter(x => hasMarks(x.S));
    const pool = filled.length ? filled : all;
    pool.forEach(({ sh, S }) => {
      const hits = S.tally ? S.rows.filter(r => r.target).length : (S.columns || []).filter(c => c.target).length;
      const named = monthIn(sh.name) === currentWorkbookMonth ? 1 : 0;
      const score = hits * 10 + named * 5 + Math.min(sh.grid.length, 200) / 1000;
      if(!best || score > best.score) best = { S, sh, score, hits };
    });
    prepareSheetItems(type, [best.sh]);   // the items for the chosen sheet only
    best.S.sheetName = best.sh.name;
    best.S.otherSheets = sheets.filter(s => s !== best.sh).map(s => s.name);
    best.S.filledMonths = filled.map(x => monthIn(x.sh.name)).filter(m => m && termMonths().includes(m));
    const titleText = (best.sh.grid.slice(0, 4).flat().join(' ')) + ' ';
    best.S.fileMonth = (type === 'observation' || type === 'workbook') ? (monthIn(best.sh.name) || monthIn(titleText) || monthIn(fileName)) : null;
    return best.S;
  }
  function termMonths(){ try { return assessTermMonths(); } catch(e){ return MONTHS; } }

  window.assessSwitchMonthAndRetry = function(month){
    const pending = assessPendingFile; if(!pending) return;
    if(pending.type === 'observation'){ obsRangeFrom = month; obsRangeTo = month; currentObservationThemeId = null; }
    currentWorkbookMonth = month;
    if(typeof renderMonthlyAssessment === 'function') renderMonthlyAssessment(monthlyAssessmentTargetEl);
    let tries = 0;
    (function wait(){
      const panel = assessPanel();
      if(assessTargets(pending.type) && panel){ assessReadSheets(pending.type, pending.fileName, pending.sheets); return; }
      if(++tries < 60) setTimeout(wait, 250); // that month's items are loading
      else if(panel) panel.innerHTML = '<div class="au-error">' + esc(month) + '\u2019s items didn\u2019t load — try importing again.</div>';
    })();
  };

  // ---- The items come from the IMPORTED SHEET: each column's CG code in its heading, not the server's CG-wise plan ----
  // The sheet's own headings define the columns; identical headings are made distinct so every column is its own item.
  // The marks are then evaluated against those columns only.
  const SHEET_CG_TEXT = /C[-\s]?\d+\.\d+/i;
  let sheetItemsByType = {};
  function prepareSheetItems(type, sheets){
    sheetItemsByType = {};
    if(!['observation', 'workbook', 'pretest'].includes(type)) return;
    const items = [];
    const bookName = (typeof currentWorkbookCompetencyBookName !== 'undefined' && currentWorkbookCompetencyBookName) ? String(currentWorkbookCompetencyBookName).toLowerCase() : '';
    const wantBlock = /vaani/.test(bookName) ? 'vaani' : (/khelika/.test(bookName) ? 'khelika' : '');
    sheets.forEach(sh => {
      if(!sh.gridOriginal) sh.gridOriginal = (sh.grid || []).map(r => r.slice());
      sh.grid = sh.gridOriginal.map(r => r.slice());   // the file's own layout, read as it is
      const g = sh.grid || [];
      // the CG row = the row with the most CG codes (within the first 15 rows)
      let hr = -1, best = 0;
      for(let r = 0; r < Math.min(g.length, 15); r++){
        const n = (g[r] || []).filter(c => SHEET_CG_TEXT.test(String(c))).length;
        if(n > best){ best = n; hr = r; }
      }
      if(hr < 0 || best < 1) return;
      // the workbook blocks in the heading row: 'KHELIKA …' columns and 'VAANI …' columns
      const h0 = g[0] || [];
      const vIdx = h0.findIndex(x => /vaani/i.test(String(x)));
      let from = 0, to = Infinity;
      if(vIdx > 0 && wantBlock === 'khelika') to = vIdx;
      if(vIdx > 0 && wantBlock === 'vaani') from = vIdx;
      const pageRow = hr - 1 >= 0 ? (g[hr - 1] || []) : [];   // numbers above the codes = page numbers
      const themeRow = hr - 2 >= 0 ? (g[hr - 2] || []) : [];  // theme names above the page numbers
      const isNum = v => { const t = String(v == null ? '' : v).trim(); return t !== '' && !isNaN(Number(t)); };
      // the heading row (ROLL NO. / NAME) is where the importer matches columns: give each CG column its label there too
      let nameRow = -1;
      for(let r = 0; r < hr; r++){ if((g[r] || []).some(x => SI_NAME_WORDS.includes(siNorm(x)))){ nameRow = r; break; } }
      const count = {};
      let theme = '';
      for(let c = from; c < Math.min(to, (g[hr] || []).length); c++){
        const tv = String(themeRow[c] == null ? '' : themeRow[c]).trim();
        if(tv && !isNum(tv)) theme = tv.replace(/\s+/g, ' ');
        const txt = String(g[hr][c] == null ? '' : g[hr][c]).replace(/\s+/g, ' ').trim();
        const m = txt.match(/C[-\s]?(\d+\.\d+)/i);
        if(!m) continue;
        let pg = isNum(pageRow[c]) ? Math.round(Number(pageRow[c])) : 0;
        // no page row: the page is written in the heading (for example 'C-8.3 · Cards · p23')
        if(!pg){ const pm = txt.match(/·\s*p(\d+)\b/i); if(pm) pg = Number(pm[1]); }
        const code = 'C-' + m[1];
        let title = (theme ? theme.replace(/\b\w/g, ch => ch.toUpperCase()) : '');
        // no theme row (a one-row heading such as 'C-7.1 · My Classroom'): the theme is the text after the code
        if(!title){ const hm = txt.match(/^C-\d+\.\d+\s*·\s*(.+?)(?:\s*·\s*p\d+)?$/); if(hm && !/^p\d+$/i.test(hm[1].trim())) title = hm[1].trim(); }
        const label = [code, title, pg ? 'p' + pg : ''].filter(Boolean).join(' · ');
        count[label] = (count[label] || 0) + 1;
        const unique = count[label] > 1 ? label + ' #' + count[label] : label;
        g[hr][c] = unique;   // the read copy of this heading, so the column matches its own item
        if(nameRow >= 0){ if(!g[nameRow]) g[nameRow] = []; g[nameRow][c] = unique; }
        const ordinal = items.filter(x => x.key.indexOf('sheet|' + sh.name + '|') === 0 && x.item.page_number === pg).length + 1;
        items.push({ key: 'sheet|' + sh.name + '|' + c, label: unique, theme: title, cg: code, occ: count[label], match: [assessNorm(unique)],
          item: { page_number: pg, activity_no: ordinal, cg_code: code, activity_title: title } });
      }
    });
    if(items.length) sheetItemsByType[type] = items;
  }
  // ---- CG summary from the imported file ----
  // The CG names are fixed here (from the NEP / NCF-FS framework). Nothing is read from or saved to the server for them.
  // The table lists only the CGs that appear in the imported sheet, with their competencies and the marks in the sheet.
  const ASSESS_CG_NAMES = {
    1: 'Healthy & Safe Habits', 2: 'Sensorial Development', 3: 'Physical Fitness & Fine Motor Skills',
    4: 'Emotional Intelligence', 5: 'Productive Work & Service (Seva)', 6: 'Natural Environment',
    7: 'Observations & Logical Thinking', 8: 'Mathematical Understanding', 9: 'Oral Language',
    10: 'Reading & Writing in Language 1', 11: 'Language 2 Literacy', 12: 'Visual & Performing Arts',
    13: 'Learning Habits'
  };
  function cgEsc(v){ return String(v == null ? '' : v).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
  function cgSummaryFromFile(){
    if(typeof assessPendingFile === 'undefined' || !assessPendingFile || !sheetItemsByType) return '';
    const items = Object.values(sheetItemsByType).flat();
    if(!items.length) return '';
    const sheetName = items[0].key.split('|')[1];
    const sh = (assessPendingFile.sheets || []).find(x => x.name === sheetName);
    if(!sh) return '';
    const g = sh.gridOriginal || sh.grid || [];
    const byCG = {};
    items.filter(x => x.key.indexOf('sheet|' + sheetName + '|') === 0).forEach(it => {
      const c = Number(it.key.split('|')[2]);
      const m = String(it.item.cg_code || '').match(/^C-(\d+)\.(\d+)$/);
      if(!m) return;
      const cgNo = Number(m[1]);
      const rec = byCG[cgNo] || (byCG[cgNo] = { comps: new Set(), B: 0, P: 0, A: 0 });
      rec.comps.add(it.item.cg_code);
      for(let r = 0; r < g.length; r++){
        const v = String((g[r] || [])[c] == null ? '' : g[r][c]).trim().toUpperCase();
        if(v === 'B' || v === 'P' || v === 'A') rec[v]++;
      }
    });
    const cgs = Object.keys(byCG).map(Number).sort((a, b) => a - b);
    if(!cgs.length) return '';
    const rows = cgs.map(n => {
      const r = byCG[n], total = r.B + r.P + r.A;
      return `<tr>
        <td style="padding:6px 8px;"><b>CG-${n}</b><div style="font-size:12px;">${cgEsc(ASSESS_CG_NAMES[n] || '')}</div></td>
        <td style="padding:6px 8px;">${cgEsc([...r.comps].sort().join(', '))}</td>
        <td style="padding:6px 8px; text-align:center;">${r.B}</td>
        <td style="padding:6px 8px; text-align:center;">${r.P}</td>
        <td style="padding:6px 8px; text-align:center;">${r.A}</td>
        <td style="padding:6px 8px; text-align:center;"><b>${total}</b></td>
      </tr>`;
    }).join('');
    return `<div style="margin-top:14px; border:1px solid var(--border); border-radius:10px; overflow:hidden;">
      <div style="padding:10px 12px; background:#E1F5EE; font-weight:800;">CG summary from this file: ${cgs.length} CG${cgs.length === 1 ? '' : 's'} · ${cgEsc(sheetName)}</div>
      <div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead><tr style="background:#F4F8F6;">
          <th style="text-align:left; padding:6px 8px;">CG</th><th style="text-align:left; padding:6px 8px;">Competencies in the file</th>
          <th style="padding:6px 8px;">B</th><th style="padding:6px 8px;">P</th><th style="padding:6px 8px;">A</th><th style="padding:6px 8px;">Total</th>
        </tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  // The CG rows of the imported sheet: one per CG in the file, with its competencies and the B / P / A in the sheet.
  function cgRowsFromFile(){
    if(typeof assessPendingFile === 'undefined' || !assessPendingFile || !sheetItemsByType) return [];
    const items = Object.values(sheetItemsByType).flat();
    if(!items.length) return [];
    const sheetName = items[0].key.split('|')[1];
    const sh = (assessPendingFile.sheets || []).find(x => x.name === sheetName);
    if(!sh) return [];
    const g = sh.gridOriginal || sh.grid || [];
    const comp = {};   // competency code (C-8.3) -> B / P / A counted from the file's own columns
    items.filter(x => x.key.indexOf('sheet|' + sheetName + '|') === 0).forEach(it => {
      const c = Number(it.key.split('|')[2]);
      const code = String(it.item.cg_code || '');
      if(!/^C-\d+\.\d+$/.test(code)) return;
      const rec = comp[code] || (comp[code] = { code, b: 0, p: 0, a: 0 });
      for(let r = 0; r < g.length; r++){
        const v = String((g[r] || [])[c] == null ? '' : g[r][c]).trim().toUpperCase();
        if(v === 'B' || v === 'P' || v === 'A') rec[v.toLowerCase()]++;
      }
    });
    const byCG = {};
    Object.values(comp).forEach(c => {
      const n = Number(c.code.match(/^C-(\d+)/)[1]);
      const cg = byCG[n] || (byCG[n] = { cg: 'CG-' + n, comps: [], compRows: [], b: 0, p: 0, a: 0 });
      cg.comps.push(c.code); cg.compRows.push(c); cg.b += c.b; cg.p += c.p; cg.a += c.a;
    });
    return Object.keys(byCG).map(Number).sort((a, b) => a - b).map(n => { const r = byCG[n]; r.comps.sort(); r.compRows.sort((x, y) => x.code.localeCompare(y.code, undefined, { numeric: true })); return r; });
  }
  window.cgRowsFromFile = cgRowsFromFile;
  if(typeof renderAssessSmartPreview === 'function' && !renderAssessSmartPreview.__cgCard){
    const basePreviewCG = renderAssessSmartPreview;
    renderAssessSmartPreview = function(){
      const out = basePreviewCG.apply(this, arguments);
      const box = typeof assessPanel === 'function' ? assessPanel() : null;
      const html = cgSummaryFromFile();
      // the CG summary now lives on the workbook screen, after Confirm (not in the preview)
      return out;
    };
    renderAssessSmartPreview.__cgCard = true;
  }

  async function assessPostObservationMarks(marks){
    const res = await fetch('backend/assessment/observation/save_observation_marks_batch.php' + window.location.search, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: workbookLevelFromClassName(), marks })
    });
    const text = await res.text();
    let d; try { d = JSON.parse(text); } catch(e){
      throw new Error(res.status === 404 ? 'The observation save file (save_observation_marks_batch.php) is not on the server — check backend/assessment/observation/' : 'The server answered with an error (HTTP ' + res.status + ') instead of a save result. Open the save file in the browser to see the message.');
    }
    if(d.status !== 'success') throw new Error(d.message || 'The observation marks could not be saved.');
    return d;
  }
  window.assessPostObservationMarks = assessPostObservationMarks;

  // ---- Import ALL months of a workbook file in one go (like the attendance file) ----
  function allMonthSheets(){
    const sheets = (assessPendingFile && assessPendingFile.sheets) || [];
    return sheets.filter(sh => !/pre[\s-]?test/i.test(sh.name) && monthIn(sh.name));
  }
  async function assessImportAllMonths(){
    const type = assessPendingFile && assessPendingFile.type;
    const fileName = assessPendingFile && assessPendingFile.fileName;
    const monthSheets = allMonthSheets();
    if((type !== 'workbook' && type !== 'observation') || monthSheets.length < 2){ alert('This file has no months to import together.'); return; }
    const marks = []; const perMonth = [];
    monthSheets.forEach(sh => {
      prepareSheetItems(type, [sh]);
      const S = assessAnalyse(type, sh.grid, fileName, 'file');
      const mon = monthIn(sh.name);
      const targets = {}; (S.targets || []).forEach(x => { targets[x.key] = x; });
      let count = 0;
      (S.rows || []).forEach(r => {
        if(!r.include || !r.pupilId) return;
        (r.marks || []).forEach((m, j) => {
          const tg = targets[S.columns[j].target];
          if(!tg || m === '?') return;
          if(type === 'observation'){ if(!m) return; marks.push({ pupil_id: r.pupilId, month: mon, theme: tg.theme, cg_code: tg.cg, occ: tg.occ || 1, level_mark: m === 'B' ? 'E' : m }); count++; return; }
          const lvl = !m ? 'ABS' : (m === 'B' ? 'E' : m);
          marks.push({ pupil_id: r.pupilId, item: Object.assign({}, tg.item, { month: mon }), level_mark: lvl });
          count++;
        });
      });
      perMonth.push({ mon, count });
    });
    if(!marks.length){ alert('No marks found in this file.'); return; }
    const box = assessPanel();
    if(box) box.insertAdjacentHTML('beforeend', '<div class="cap" data-allmonths-saving style="margin-top:10px; font-weight:600;">Saving all months…</div>');
    try {
      let d;
      if(type === 'observation'){ d = await assessPostObservationMarks(marks); d.cleared = 0; }
      else {
        const res = await fetch('backend/assessment/workbook/save_workbook_marks_batch.php' + window.location.search, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marks, workbook: { level: workbookLevelFromClassName(), name: currentWorkbookCompetencyBookName, month: currentWorkbookMonth } })
        });
        d = await res.json();
      }
      if(d.status !== 'success') throw new Error(d.message || 'The marks could not be saved.');
      const list = perMonth.map(x => x.mon + ' ' + x.count).join(' · ');
      if(box) box.innerHTML = `<div class="au-success">✓ Saved all months: ${d.saved} marks, ${d.cleared || 0} cleared (${list}).</div>`;
    } catch(err){
      if(box) box.insertAdjacentHTML('beforeend', `<div class="au-error">${err.message}. Nothing was saved.</div>`);
    }
  }
  window.assessImportAllMonths = assessImportAllMonths;
  if(typeof renderAssessSmartPreview === 'function' && !renderAssessSmartPreview.__allMonths){
    const baseAll = renderAssessSmartPreview;
    renderAssessSmartPreview = function(){
      const out = baseAll.apply(this, arguments);
      const box = typeof assessPanel === 'function' ? assessPanel() : null;
      if(false && box && assessPendingFile && (assessPendingFile.type === 'workbook' || assessPendingFile.type === 'observation') && allMonthSheets().length > 1){   // all-months import is off: save one month at a time
        box.insertAdjacentHTML('afterbegin', `<div style="margin-bottom:12px; padding:12px; border:1px solid #1D9E75; border-radius:10px; background:#E1F5EE;">
          <b>This file has ${allMonthSheets().length} months.</b> Import them all at once:
          <button class="btn-primary" style="width:auto; margin-left:8px; padding:8px 14px;" onclick="assessImportAllMonths()">Import all ${allMonthSheets().length} months</button>
        </div>`);
      }
      return out;
    };
    renderAssessSmartPreview.__allMonths = true;
  }

  // The preview redraws after every choice. Keep the place the teacher is at (sideways and down), so she does not
  // have to scroll back across the table each time she picks a column.
  function scrollSpots(box){ return box ? [...box.querySelectorAll('*')].filter(e => e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2) : []; }
  function keepPreviewPlace(fn){
    return function(){
      const before = scrollSpots(typeof assessPanel === 'function' ? assessPanel() : null).map(e => [e.scrollLeft, e.scrollTop]);
      const winY = window.scrollY;
      const out = fn.apply(this, arguments);
      const after = scrollSpots(typeof assessPanel === 'function' ? assessPanel() : null);
      after.forEach((e, i) => { if(before[i]){ e.scrollLeft = before[i][0]; e.scrollTop = before[i][1]; } });
      window.scrollTo(0, winY);
      return out;
    };
  }
  if(typeof renderAssessSmartPreview === 'function' && !renderAssessSmartPreview.__keepsPlace){
    const basePreview = renderAssessSmartPreview;
    renderAssessSmartPreview = keepPreviewPlace(basePreview);
    renderAssessSmartPreview.__keepsPlace = true;
  }

  // While a file is being imported, its own columns are the items to evaluate against (never the server plan).
  if(typeof assessTargets === 'function'){
    const planAssessTargets = assessTargets;
    assessTargets = function(type){
      // Workbook: match against the server's pages for the month (dynamic). Observation: the file's own activities.
      if(type !== 'workbook' && typeof assessPendingFile !== 'undefined' && assessPendingFile && sheetItemsByType[type]) return sheetItemsByType[type];
      return planAssessTargets.apply(this, arguments);
    };
  }

  function assessReadSheets(type, fileName, sheets){
    const out = assessPanel();
    prepareSheetItems(type, sheets);
    assessPendingFile = { type, fileName, sheets };
    const S = analyseBest(type, sheets, fileName);
    try { console.log('[import debug] type', type, '| sheet', S && S.sheetName, '| columns read:', JSON.stringify((S && S.columns || []).slice(0, 12)), '| targets:', JSON.stringify((assessTargets(type) || []).slice(0, 12).map(x => ({ key: x.key, label: x.label, match: x.match })))); } catch(e) { console.log('[import debug] error', e); }
    // A sheet for another workbook: say so first (js/workbook-import-fix.js draws it)
    if(S && S.wrongBook && typeof renderAssessSmartPreview === 'function'){ assessSmart = S; renderAssessSmartPreview(); return; }
    const problems = assessFileProblems(S, type);
    let others = (S.filledMonths || []).filter(m => m !== currentWorkbookMonth);
    if(!others.length && S.fileMonth && S.fileMonth !== currentWorkbookMonth && termMonths().includes(S.fileMonth)) others = [S.fileMonth];
    if(problems.length){
      const btn = m => `<button class="btn-primary" style="width:auto; padding:8px 16px; margin:0 6px 6px 0;" onclick="assessSwitchMonthAndRetry('${esc(m)}')">Switch to ${esc(m)} and read it again</button>`;
      out.innerHTML = '<div class="au-error"><b>File not imported yet.</b><br>' + problems.map(esc).join('<br>') + '</div>'
        + (others.length ? `<div style="margin-top:8px;">${box('warn', `This file has marks for <b>${others.map(esc).join(', ')}</b>, but the screen shows <b>${esc(currentWorkbookMonth)}</b>.`)}${others.map(btn).join('')}</div>` : '');
      return;
    }
    assessSmart = S;
    renderAssessSmartPreview();
  }

  const baseChoose = assessSmartChoose; // the original, still used for photos
  assessSmartChoose = function(type, source){
    if(type === 'viva') return baseChoose(type, source); // Viva has its own file reader (js/viva.js)
    if(source === 'photo') return baseChoose(type, source); // photos: unchanged (the checks still show in the preview)
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.xlsx,.xls,.csv';
    input.onchange = async () => {
      const file = input.files[0]; if(!file) return;
      if(!importFileTypeOk(file)) return;
      const out = assessPanel();
      try{
        // the items come from the file itself, so the server list is not needed to read it
        if(!assessTargets(type) && !['observation', 'workbook', 'pretest'].includes(type)) throw new Error('This tab has not finished loading its items — wait a moment and try again.');
        if(typeof XLSX === 'undefined') throw new Error('The spreadsheet reader did not load (no internet reached the CDN).');
        out.innerHTML = '<p class="sub">Reading ' + esc(file.name) + '…</p>';
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        let sheets = wb.SheetNames.map(n => ({ name: n, grid: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }).map(r => r.map(assessCell)) }))
          .filter(s => s.grid.some(r => r.some(Boolean)));
        if(!sheets.length) throw new Error('The file is empty.');
        if(type === 'motor'){ const m = sheets.find(s => s.name.toLowerCase().includes(motorSkillType)); if(m) sheets = [m]; }
        assessReadSheets(type, file.name, sheets);
      } catch(err){ out.innerHTML = `<div class="au-error">${esc(err.message || err)}</div>`; }
    };
    input.click();
  };

  // ---- 4. the checks, shown at the top of the preview ----
  function checksHtml(s){
    const out = [];
    const roll = realPupilsCache || [];
    if(s.fileMonth && s.fileMonth !== currentWorkbookMonth){
      out.push(box('bad', `<b>This file seems to be for ${esc(s.fileMonth)}</b>, but the screen shows <b>${esc(currentWorkbookMonth)}</b>. Saving now puts these marks in ${esc(currentWorkbookMonth)}.`
        + (termMonths().includes(s.fileMonth) ? ` <button class="btn" style="padding:3px 10px; font-size:12px; margin-left:6px;" onclick="assessSwitchMonthAndRetry('${esc(s.fileMonth)}')">Switch to ${esc(s.fileMonth)}</button>` : '')));
    }
    if(s.otherSheets && s.otherSheets.length) out.push(box('info', `This file has ${s.otherSheets.length + 1} sheets. Reading <b>“${esc(s.sheetName)}”</b> — it matches ${s.type === 'pretest' ? 'the Pre-Test activities' : esc(currentWorkbookMonth) + '\u2019s items'} best. Not read: ${list(s.otherSheets)}.`));
    if(s.tally){
      const n = roll.length;
      const off = s.rows.filter(r => r.include && r.target && n && r.b + r.p + r.a !== n);
      const over = off.filter(r => r.b + r.p + r.a > n);
      if(over.length) out.push(box('bad', `<b>${over.length} row${over.length === 1 ? ' counts' : 's count'} more children than the class has (${n})</b>: ${list(over.map(r => r.raw + ' = ' + (r.b + r.p + r.a)))}.`));
      const under = off.filter(r => r.b + r.p + r.a < n);
      if(under.length) out.push(box('warn', `${under.length} row${under.length === 1 ? ' counts' : 's count'} fewer than the ${n} children on the roll (absent children?): ${list(under.map(r => r.raw + ' = ' + (r.b + r.p + r.a)))}.`));
      const missing = s.targets.filter(t => !s.rows.some(r => r.include && r.target === t.key));
      if(missing.length && missing.length < s.targets.length) out.push(box('info', `Not in the file (nothing will be saved for them): ${list(missing.map(t => t.label))}.`));
      return out.join('');
    }
    const skippedCols = s.columns.filter(c => !c.target);
    if(skippedCols.length) out.push(box('warn', `<b>${skippedCols.length} column${skippedCols.length === 1 ? '' : 's'} will be skipped</b> — ${list(skippedCols.map(c => c.label.replace(/\n/g, ' ')))}. If one of them is an item, choose it in the box above that column.`));
    const used = new Set(s.columns.map(c => c.target).filter(Boolean));
    const notIn = s.targets.filter(t => !used.has(t.key));
    if(notIn.length && used.size && s.type !== 'pretest') out.push(box('info', `${esc(currentWorkbookMonth)} items not in this file (left as they are): ${list(notIn.map(t => t.label))}.`));
    const spelled = s.rows.filter(r => r.include && r.pupilId && r.matchedHow && r.matchedHow !== 'exact');
    if(spelled.length) out.push(box('info', `<b>${spelled.length} name${spelled.length === 1 ? ' was' : 's were'} matched although spelled differently</b> — check them: ${list(spelled.map(r => '“' + r.raw + '” → ' + ((roll.find(p => p.id === r.pupilId) || {}).name || '?')), 12)}.`));
    const unmatched = s.rows.filter(r => r.include && !r.pupilId);
    const sugg = unmatched.filter(r => r.suggest);
    if(sugg.length) out.push(box('warn', `<b>${sugg.length} name${sugg.length === 1 ? ' is' : 's are'} spelled differently from the roll.</b> Check each “Did you mean …?” below, or <button class="btn" style="padding:3px 10px; font-size:12px;" onclick="assessUseAllSuggestions()">Use all ${sugg.length} suggestion${sugg.length === 1 ? '' : 's'}</button>`));
    const none = unmatched.filter(r => !r.suggest);
    if(none.length) out.push(box('bad', `<b>${none.length} name${none.length === 1 ? ' isn\u2019t' : 's aren\u2019t'} on the roll</b>: ${list(none.map(r => r.raw))}. Choose the child, or untick the row to skip it.`));
    const ids = s.rows.filter(r => r.include && r.pupilId).map(r => r.pupilId);
    const twice = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    if(twice.length) out.push(box('bad', `<b>The same child is in two rows</b>: ${list(twice.map(id => (roll.find(p => p.id === id) || {}).name || id))}. Only one row's marks would be kept — untick the wrong row.`));
    const suggested = new Set(sugg.map(r => r.suggest.id)); // already offered as "Did you mean …?"
    const noRow = roll.filter(p => !ids.includes(p.id) && !suggested.has(p.id));
    if(noRow.length && ids.length) out.push(box('info', `${noRow.length} child${noRow.length === 1 ? '' : 'ren'} on the roll ${noRow.length === 1 ? 'has' : 'have'} no row in this file (nothing changes for them): ${list(noRow.map(p => p.name), 12)}.`));
    const blanks = s.rows.filter(r => r.include && r.pupilId).reduce((n, r) => n + r.marks.filter((m, j) => s.columns[j].target && !m).length, 0);
    if(blanks) out.push(box('info', `${blanks} empty cell${blanks === 1 ? '' : 's'} in the file — left unmarked.`));
    return out.join('');
  }

  window.assessUseAllSuggestions = function(){
    if(!assessSmart) return;
    assessSmart.rows.forEach(r => { if(r.include && !r.pupilId && r.suggest) r.pupilId = r.suggest.id; });
    renderAssessSmartPreview();
  };

  const basePreview = renderAssessSmartPreview;
  renderAssessSmartPreview = function(){
    basePreview.apply(this, arguments);
    const out = assessPanel(); const s = assessSmart; if(!out || !s) return;
    const inner = out.firstElementChild; if(!inner) return;
    const checks = s.source === 'manual' ? '' : checksHtml(s); // typed sheet (✍ Enter manually): no file, so nothing to check
    if(checks){
      const holder = document.createElement('div'); holder.className = 'assess-checks'; holder.innerHTML = '<p style="margin:0 0 6px; font-weight:600; font-size:13px;">Checks before saving</p>' + checks;
      const intro = inner.querySelectorAll('p')[1] || inner.firstElementChild;
      intro.insertAdjacentElement('afterend', holder);
    }
    if(!s.tally){
      const trs = out.querySelectorAll('table.report-table tbody tr');
      s.rows.forEach((r, i) => {
        if(r.include && r.pupilId && r.matchedHow && r.matchedHow !== 'exact' && trs[i] && trs[i].children[1] && window.NameMatch){
          const d = document.createElement('div'); d.style.cssText = 'margin-top:4px; font-size:12px; color:#24507a;';
          d.textContent = 'Spelled “' + r.raw + '” in the file — ' + NameMatch.how(r.matchedHow) + '.';
          trs[i].children[1].appendChild(d);
        }
        if(!r.include || r.pupilId || !r.suggest || !trs[i]) return;
        const cell = trs[i].children[1]; if(!cell) return;
        const d = document.createElement('div'); d.style.cssText = 'margin-top:4px; font-size:12px; color:#8a5a1c;';
        d.innerHTML = `Did you mean <b>${esc(r.suggest.name)}</b>? <a href="#" onclick="assessSmartSet('pupil:${i}', '${r.suggest.id}'); return false;">Use this</a>`;
        cell.appendChild(d);
      });
    }
  };

  // ---- 5. after saving: what went in, what didn't ----
  const baseConfirm = assessSmartConfirm;
  assessSmartConfirm = async function(){
    const s = assessSmart; if(!s) return baseConfirm.apply(this, arguments);
    const rep = { saved: 0, skippedRows: [], unreadable: 0, blank: 0, skippedCols: 0 };
    if(s.tally){
      s.rows.forEach(r => { if(r.include && r.target) rep.saved++; else if(r.raw) rep.skippedRows.push(r.raw + (r.include ? ' (not matched)' : ' (unticked)')); });
    } else {
      rep.skippedCols = s.columns.filter(c => !c.target).length;
      s.rows.forEach(r => {
        if(!r.include || !r.pupilId){ rep.skippedRows.push(r.raw + (!r.include ? ' (unticked)' : ' (not on the roll)')); return; }
        r.marks.forEach((m, j) => { if(!s.columns[j].target) return; if(!m) rep.blank++; else if(m === '?') rep.unreadable++; else rep.saved++; });
      });
    }
    const month = currentWorkbookMonth, type = s.type, file = s.fileName, sheet = s.sheetName;
    let learned = 0;
    if(!s.tally && window.NameMatch) s.rows.forEach(r => { if(r.include && r.pupilId){ const p = (realPupilsCache || []).find(x => x.id === r.pupilId); if(p && NameMatch.remember(r.raw, p)) learned++; } });
    await baseConfirm.apply(this, arguments);
    const panel = assessPanel(); if(!panel) return;
    const lines = [];
    lines.push(`<b>${rep.saved} ${s.tally ? 'row' + (rep.saved === 1 ? '' : 's') : 'mark' + (rep.saved === 1 ? '' : 's')}</b> sent to be saved${type === 'motor' || type === 'pretest' ? '' : ' for ' + esc(month)}${type === 'workbook' && s.workbookName ? ' to <b>' + esc(s.workbookName) + '</b>' : ''}, from “${esc(file)}”${sheet ? ' (sheet “' + esc(sheet) + '”)' : ''}.`);
    if(rep.skippedRows.length) lines.push(`Rows skipped: ${list(rep.skippedRows, 20)}.`);
    if(rep.unreadable) lines.push(`${rep.unreadable} unreadable mark${rep.unreadable === 1 ? '' : 's'} left blank.`);
    if(rep.blank && s.source !== 'manual') lines.push(`${rep.blank} blank cell${rep.blank === 1 ? '' : 's'} saved as absent for that activity (not a grade).`);
    if(rep.skippedCols) lines.push(`${rep.skippedCols} column${rep.skippedCols === 1 ? '' : 's'} not used.`);
    if(learned) lines.push(`${learned} spelling${learned === 1 ? '' : 's'} of children's names remembered for this class — next time they match by themselves.`);
    const d = document.createElement('div'); d.style.marginTop = '10px';
    d.innerHTML = box(rep.skippedRows.length || rep.unreadable ? 'warn' : 'good', '<b>Import summary.</b> ' + lines.join(' ') + ' The result from the server is shown above.');
    panel.appendChild(d);
  };
})();