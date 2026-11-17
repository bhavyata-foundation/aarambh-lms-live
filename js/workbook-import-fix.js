/* =========================================================================
   js/workbook-import-fix.js — Workbook import: the right book, every activity
   -------------------------------------------------------------------------
   Loads after js/assess-import-checks.js (teacher.html) and wraps
   assessAnalyse() for type 'workbook' only.

   1. THE RIGHT BOOK ONLY. A file is read against the book selected on
      screen. If the file names a DIFFERENT book (in its title rows, or its
      file name) the import stops — nothing can be saved — and says so:
        "File not imported. This file is for Uvach Alphabets, but the screen
         shows Sopanika."  [Switch to Uvach Alphabets and read it again] [Cancel]
      A book of the other standard (e.g. a Jr KG Khelika sheet in a Sr KG
      class), or one with no pages this month, is stopped without a switch.
      In a file with several sheets for different books, only the sheet for
      the selected book is read.

   2. TWO ACTIVITIES ON ONE PAGE. Foundation sheets put the CG under each
      page heading, and a page with two activities has a second column with
      no heading:
            Page 7 | (blank)        ← heading row
            C-9.7  | C-7.1          ← CG row
      A blank heading now carries the page on its left, and when a page has
      more than one activity, the CG decides which activity the column is.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof assessAnalyse !== 'function') return;

  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const cgKey = s => { const m = String(s || '').match(/c\s*g?\s*-?\s*(\d+(?:\.\d+)?)/i); return m ? 'c' + m[1] : ''; };
  const pageOf = s => { const m = String(s || '').match(/\bp(?:a?ge?)?\.?\s*(\d+)/i); return m ? String(+m[1]) : ''; };

  // Books of this class's standard that have pages this month.
  function booksNow(){
    try {
      const books = workbookPagesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth];
      return Array.isArray(books) ? books : [];
    } catch(e){ return []; }
  }
  // Every workbook name the portal knows, both standards ("Uvacha" on the
  // Foundation sheets is the same book as "Uvach").
  const KNOWN_BOOKS = ['Khelika Part 1', 'Khelika Part 2', 'Vaani Part 1', 'Vaani Part 2', 'Sopanika', 'Uvach Phonics', 'Uvach Alphabets'];
  function allBookNames(){
    const names = new Set(KNOWN_BOOKS);
    try { Object.values(workbookPagesCache).forEach(v => { if(Array.isArray(v)) v.forEach(b => b && b.name && names.add(b.name)); }); } catch(e){}
    return [...names];
  }
  const normBook = s => norm(s).replace(/uvacha/g, 'uvach');
  // The book the file names, longest name first ("Khelika Part 2" before "Khelika").
  function bookNamedIn(grid, fileName){
    const text = normBook((grid || []).slice(0, 6).flat().join(' ') + ' ' + (fileName || ''));
    return allBookNames().sort((a, b) => b.length - a.length).find(n => text.includes(normBook(n))) || null;
  }
  const esc2 = v => (typeof esc === 'function') ? esc(v) : String(v);

  // Re-point each mark column using page + CG, so every activity is found once.
  function remapColumns(S, grid){
    if(!S || !Array.isArray(S.columns) || !Array.isArray(S.targets)) return;
    const hIdx = grid.findIndex((r, i) => i < 15 && (r || []).some(c => { try { return SI_NAME_WORDS.includes(siNorm(c)); } catch(e){ return false; } }));
    if(hIdx < 0) return;
    const header = grid[hIdx] || [];
    const next = grid[hIdx + 1] || [];
    const cgRow = next.filter(c => cgKey(c)).length >= 2 ? next : [];
    // what each target is: page, CG (from its label "Page 7 · Act 2 — C-9.7 — …")
    const T = S.targets.map(t => { const m = String(t.label).match(/^Page\s+([\d.]+)(?:\s*·\s*Act\s*(\d+))?\s*—\s*([^—]*)/i);
      return { key: t.key, page: m ? String(+m[1]) : '', act: m && m[2] ? +m[2] : 1, cg: m ? cgKey(m[3]) : '' }; });
    const used = new Set();
    let lastPage = '';
    S.columns.forEach(col => {
      const h = header[col.col];
      let page = pageOf(h);
      if(!page && !String(h || '').trim() && lastPage) page = lastPage;   // blank heading: same page as the column on its left
      if(page) lastPage = page;
      const cg = cgRow.length ? cgKey(cgRow[col.col]) : '';
      const free = T.filter(t => !used.has(t.key));
      let pick = null;
      if(page){
        const onPage = free.filter(t => t.page === page);
        pick = (cg && onPage.find(t => t.cg === cg)) || (onPage.length === 1 || !cg ? onPage[0] : null) || null;
      } else if(cg){
        pick = free.find(t => t.cg === cg) || null;
      }
      if(page || cg){ col.target = pick ? pick.key : ''; }
      if(col.target) used.add(col.target);
      if(!String(h || '').trim() && page) col.label = 'Page ' + page + (cg ? ' (' + String(cgRow[col.col]).trim() + ')' : '');
    });
  }

  const baseAnalyse = assessAnalyse;
  assessAnalyse = function(type, grid, fileName, source){
    if(type !== 'workbook' || !Array.isArray(grid)) return baseAnalyse.apply(this, arguments);
    const named = bookNamedIn(grid, fileName);
    const S = baseAnalyse.call(this, type, grid, fileName, source);
    if(S && !S.tally){
      remapColumns(S, grid);
      S.workbookName = currentWorkbookCompetencyBookName;
      if(named && named !== currentWorkbookCompetencyBookName){
        // another book's sheet: nothing in it may be saved here
        S.wrongBook = { named, canSwitch: booksNow().some(b => b.name === named) };
        S.columns.forEach(c => { c.target = ''; });
      }
    }
    return S;
  };

  // The preview of a wrong-book file: stopped, with the reason (and the way
  // to the right book, when this class has it this month).
  if(typeof renderAssessSmartPreview === 'function'){
    const basePreview = renderAssessSmartPreview;
    renderAssessSmartPreview = function(){
      const S = (typeof assessSmart !== 'undefined') ? assessSmart : null;
      if(!S || S.type !== 'workbook' || !S.wrongBook) return basePreview.apply(this, arguments);
      const out = assessPanel(); if(!out) return;
      const w = S.wrongBook, here = currentWorkbookCompetencyBookName;
      const why = w.canSwitch
        ? `This file is for <b>${esc2(w.named)}</b>, but the screen shows <b>${esc2(here)}</b>. Marks are only imported into the workbook that is selected.`
        : `This file is for <b>${esc2(w.named)}</b>, which has no ${esc2(currentWorkbookMonth)} pages for this class (${esc2(myClassInfo.class_name || 'this class')}). Marks are only imported into the workbook that is selected — <b>${esc2(here)}</b>.`;
      out.innerHTML = `<div class="au-error"><b>File not imported — nothing was saved.</b><br>${why}</div>`
        + `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">`
        + (w.canSwitch ? `<button class="btn-primary" style="width:auto; padding:8px 16px;" onclick="wbImportSwitchBook()">Switch to ${esc2(w.named)} and read it again</button>` : '')
        + `<button class="btn" onclick="assessSmart = null; assessPanel().innerHTML = '';">Cancel</button></div>`;
    };
  }
  // Select the file's book, then read the same file again (no re-upload).
  window.wbImportSwitchBook = function(){
    const S = (typeof assessSmart !== 'undefined') ? assessSmart : null;
    if(!S || !S.wrongBook || !S.wrongBook.canSwitch) return;
    currentWorkbookCompetencyBookName = S.wrongBook.named;
    if(typeof assessSwitchMonthAndRetry === 'function') return assessSwitchMonthAndRetry(currentWorkbookMonth); // redraws, waits for the book, reads the file again
    if(typeof renderMonthlyAssessment === 'function') renderMonthlyAssessment(monthlyAssessmentTargetEl);
  };
  // Belt and braces: a wrong-book import can never be confirmed.
  if(typeof assessSmartConfirm === 'function'){
    const baseConfirm = assessSmartConfirm;
    assessSmartConfirm = async function(){
      const S = (typeof assessSmart !== 'undefined') ? assessSmart : null;
      if(S && S.type === 'workbook' && S.wrongBook){ renderAssessSmartPreview(); return; }
      return baseConfirm.apply(this, arguments);
    };
  }
})();
