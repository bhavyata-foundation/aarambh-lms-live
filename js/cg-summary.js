/* =========================================================================
   js/cg-summary.js — the same "CG summary" card on every Assessment tab
   -------------------------------------------------------------------------
   Pre-Test, Classroom Observation, Workbook Assessment and Fine & Gross
   Motor each get one card, in the same look (gradeTotalsTable):

       CG · From · B · P · A · Total · Mix · Class level   (+ "All CGs")

   Folded by default: its own full-width card, tinted so it stands apart
   from the summary tiles — CG summary · n CGs covered · class level · the
   B / P / A mix — with one chip per covered CG, coloured by its class level
   (grey = not assessed yet), and Show the table ▸. Opened, the full table, with ▾ Hide. The choice is kept per
   tab while the page is open.

   Every tab is laid out like Pre-Test: its month box (MONTH, or FROM / TO)
   just above the Import card, and a row of summary tiles — Scope ·
   Completed · Class DSI · At Proficient or above · No marks yet — on the
   tabs that have none of their own (Observation, Workbook, Motor; the same
   DSI / SRI as Pre-Test).

   Workbook, Observation and Fine & Gross Motor: the grading list (the child
   table) is hidden until the teacher taps ✍ Enter manually — then it opens
   in place (not the typing sheet), with its save bar joined under it, and
   "▾ Hide the grading list" closes it. Kept per tab while the page is open.

   Pre-Test: tapping Workbook sheet / Classroom sheet opens that sheet's activities (picker + grading
   list) and the CG summary counts only that sheet's activities.

   Hover (or Tab to) an activity in the From column: a small box shows what
   it is — the Pre-Test activity's name, the observation theme, the workbook
   page's activity, the month's motor activity.

   Competency and curricular goal: a code like 1.2 is a COMPETENCY, written
   C-1.2; competencies combine into their CURRICULAR GOAL (C-1.2, C-1.3 …
   → CG-1). The table shows each CG with its competencies under it; a CG
   adds up its competencies, a competency adds up its activities.

   Only the CGs that tab's activities COVER are listed — a covered CG with
   no marks yet shows "Not assessed"; a CG the tab doesn't cover is not
   shown at all. Activities on the same CG all add up.

     Pre-Test       the class's 26 activities (Jr / Sr KG list)
     Observation    every theme of the From – To months shown, each theme's
                    competencies (C-9.4 → CG-9.4)
     Workbook       the pages of the book and month shown
     Fine & Gross   the monthly Fine / Gross Motor activities of the term

   It takes the place of the old Pre-Test and Workbook CG summaries and of
   the Observation "Total" card, so nothing is shown twice — also when one
   of them is added after the tab is drawn, or folded (Show / Hide).
   On Pre-Test it also removes the "Worksheet / Classroom activities" table
   (activities grouped CG-1, CG-2 …): the CG summary and the activity list in
   "Add data" cover it. And its "Pre-Test is saved as you tap · ✓ Saved"
   card leaves the bottom of the tab and moves into "Add data — Pre-Test"
   (where ✍ Enter manually takes the teacher, assess-import-checks.js),
   right under the grading list (the child list with B · P · A), whenever
   that list is on screen. Only children
   on the class roll are counted. Nothing is entered here.
   Loads after the part files, assess-periods.js and the Pre-Test add-ons.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof renderMonthlyAssessment !== 'function' || typeof gradeTotalsTable !== 'function') return;
  const TYPES = { pretest: 'Pre-Test', observation: 'Classroom Observation', workbook: 'Workbook', motor: 'Fine & Gross Motor' };
  const tierOf = t => t === 'E' || t === 'B' ? 'b' : t === 'P' ? 'p' : t === 'A' ? 'a' : '';
  const sortCodes = (x, y) => cgMajor(x) - cgMajor(y) || parseFloat(x.slice(3)) - parseFloat(y.slice(3)) || x.localeCompare(y);
  const span = ms => ms.length === 1 ? ms[0] : ms[0] + ' – ' + ms[ms.length - 1];

  // { loading } or { rows:[{code, tot:{b,p,a}, items:[…]}], period }
  // ---- Workbook: the SAVED tally for the class and month (used when no file was imported in this session) ----
window.savedWbCache = window.savedWbCache || {};
function loadSavedWorkbookTally(month, redraw){
  const cid = (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_id) || null;
  if(!cid || !month) return null;
  const selBook = (typeof currentWorkbookCompetencyBookName !== 'undefined' && currentWorkbookCompetencyBookName) ? currentWorkbookCompetencyBookName : '';
  const key = cid + '|' + month + '|' + selBook;
  window.savedWbStamp = window.savedWbStamp || {};
  const hit = window.savedWbCache[key];
  // an empty result is kept for only 10 seconds, so marks saved afterwards show up on the next redraw
  if(hit !== undefined && !(Array.isArray(hit) && hit.length === 0 && Date.now() - (window.savedWbStamp[key] || 0) > 10000)) return hit;
  window.savedWbStamp[key] = Date.now();
  window.savedWbCache[key] = null;
  const level = (typeof workbookLevelFromClassName === 'function') ? workbookLevelFromClassName() : '';
  const qs = window.location.search ? '&' + window.location.search.slice(1) : '';
  // the activity list (each activity has its CG code) and the saved marks (each mark belongs to one activity page)
  Promise.all([
    fetch('backend/assessment/workbook/get_workbook_pages.php?level=' + encodeURIComponent(level) + '&month=' + encodeURIComponent(month) + qs, { cache: 'no-store' }).then(r => r.json()),
    fetch('backend/assessment/workbook/get_workbook_assessment.php?month=' + encodeURIComponent(month) + qs, { cache: 'no-store' }).then(r => r.json())
  ]).then(([pz, mz]) => {
    // page id -> { cg number, activity label }
    const walk = (o, out) => { if(Array.isArray(o)) o.forEach(x => walk(x, out)); else if(o && typeof o === 'object'){ if('id' in o && 'cg_code' in o) out.push(o); Object.values(o).forEach(v => walk(v, out)); } return out; };
    const pageInfo = {};
    // only the pages of the workbook selected on screen (e.g. Uvach Alphabets), not every workbook
    const bookPages = [];
    const findBook = o => { if(Array.isArray(o)) o.forEach(findBook); else if(o && typeof o === 'object'){ if(selBook && o.name === selBook && Array.isArray(o.pages)) bookPages.push(...o.pages); Object.values(o).forEach(v => { if(v && typeof v === 'object') findBook(v); }); } };
    findBook(pz);
    // a book with no pages this month shows nothing: never fall back to other books
    const pagesToUse = selBook ? bookPages : walk(pz, []);
    pagesToUse.forEach(a => {
      const m = /(\d+)/.exec(String(a.cg_code || '')); if(!m) return;
      pageInfo[String(a.id)] = { cg: 'CG-' + m[1], label: 'Activity ' + (a.activity_no != null ? a.activity_no : a.page_number || a.id) };
    });
    // count each child's mark once, under the CG of its activity page
    const agg = {};
    (Array.isArray(mz && mz.marks) ? mz.marks : []).forEach(x => {
      const info = pageInfo[String(x.workbook_page_id)]; if(!info) return;
      const v = String(x.level_mark || '').toUpperCase();
      const t = (v === 'E' || v === 'B') ? 'b' : v === 'P' ? 'p' : v === 'A' ? 'a' : '';
      if(!t) return;
      const k = info.cg + '|' + info.label;
      (agg[k] = agg[k] || { cg: info.cg, code: info.label, b: 0, p: 0, a: 0 })[t]++;
    });
    window.savedWbCache[key] = Object.values(agg); window.savedWbStamp[key] = Date.now();
    if(typeof redraw === 'function') redraw();
  }).catch(() => { window.savedWbCache[key] = []; window.savedWbStamp[key] = Date.now(); if(typeof redraw === 'function') redraw(); });
  return null;
}
function collect(type, rerender){
    const rows = {}, kids = Array.isArray(realPupilsCache) ? realPupilsCache : [];
    const perKid = {}; let cells = 0, units = 0, scope = '';
    const mark = (r, pid, k) => { if(!k) return; r.tot[k]++; perKid[pid] = (perKid[pid] || 0) + 1; };
    const row = code => rows[code] || (rows[code] = { code, tot: { b: 0, p: 0, a: 0 }, items: [], tips: {} });
    const cover = (code, label, tip) => { if(!code) return null; const r = row(code); if(label && !r.items.includes(label)){ r.items.push(label); if(tip) r.tips[label] = tip; } return r; };
    const level = workbookLevelFromClassName();
    let period = '';
    if(type === 'pretest'){
      ensurePreTestTallyForClass();
      const sheet = (typeof preTestTypeFilter !== 'undefined' && preTestTypeFilter) ? preTestTypeFilter : '';
      WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, i) => {
        if(sheet && a.type !== sheet) return;   // only the sheet chosen in the Sheet card (Workbook = Worksheet, or Classroom)
        if(a.retired) return;                    // retired by the superadmin (Content & Activities)
        const r = cover(cgCode(a.cg), 'Activity ' + (i + 1), (i + 1) + '. ' + a.activity + ' · ' + a.type + (a.page ? ' · page ' + a.page : '') + ' · ' + a.cg), t = preTestTallyEntries[String(i)] || {};
        r.tot.b += t.count_e || 0; r.tot.p += t.count_p || 0; r.tot.a += t.count_a || 0;
      });
      period = (sheet === 'Classroom' ? 'Classroom sheet · ' : sheet === 'Worksheet' ? 'Workbook sheet · ' : '') + (assessmentTerm === 2 ? 'Term 2' : 'Term 1');
    }
    if(type === 'observation'){
      // The saved observation marks of this level and month (from the server), counted per activity.
      const key = level + '|' + currentWorkbookMonth;
      window.__obsSaved = window.__obsSaved || {};
      if(!(key in window.__obsSaved)){
        window.__obsSaved[key] = null;
        fetch('backend/assessment/observation/get_observation_saved_summary.php?level=' + encodeURIComponent(level) + '&month=' + encodeURIComponent(currentWorkbookMonth) + '&' + (window.location.search || '').replace(/^\?/, ''), { cache: 'no-store' })
          .then(r => r.json()).then(d => { window.__obsSaved[key] = (d && d.rows) || []; if(rerender) rerender(); })
          .catch(() => { window.__obsSaved[key] = []; if(rerender) rerender(); });
      }
      if(window.__obsSaved[key] === null) return { loading: true, period: currentWorkbookMonth };
      const savedRows = window.__obsSaved[key];
      savedRows.forEach(x => {
        const m = String(x.cg_code || '').match(/^C-(\d+)\./);
        if(!m) return;
        const r = cover('CG-' + m[1], x.cg_code, x.theme + ' · ' + x.cg_code);
        if(r){ r.tot.b += x.E || 0; r.tot.p += x.P || 0; r.tot.a += x.A || 0; }
        cells += (x.E || 0) + (x.P || 0) + (x.A || 0); units++;
      });
      period = currentWorkbookMonth; scope = units + ' activit' + (units === 1 ? 'y' : 'ies');
      return { loading: false, rows: Object.values(rows), period, scope, cells, units, kids: kids.length, noMarks: kids.filter(p => !savedRows.length).length };
    }
    if(false){
      let months = assessTermMonths();
      if(typeof obsRangeFrom !== 'undefined'){ const a = months.indexOf(obsRangeFrom), b = months.indexOf(obsRangeTo); if(a >= 0 && b >= a) months = months.slice(a, b + 1); }
      const ready = months.map(m => [ensureObservationThemesLoaded(level, m, rerender), ensureObservationAssessmentLoaded(m, rerender)]).flat();
      if(ready.some(x => !x)) return { loading: true, period: span(months) };
      months.forEach(m => {
        const themes = observationThemesCache[level + '|' + m], marks = observationAssessmentCache[m];
        if(!Array.isArray(themes)) return;
        themes.forEach(t => (t.items || []).forEach(it => {
          const r = cover(cgCode(it.cg_code), t.name + (months.length > 1 ? ' (' + m + ')' : ''), 'Theme: ' + t.name + ' · ' + m + ' · competencies ' + (t.items || []).filter(x => cgCode(x.cg_code) === cgCode(it.cg_code)).map(x => x.cg_code).join(', '));
          cells += kids.length;
          if(r && marks && typeof marks === 'object') kids.forEach(p => mark(r, p.id, tierOf((marks[p.id] || {})[it.id])));
        }));
        if(Array.isArray(themes)) units += themes.length;
      });
      period = span(months); scope = units + ' theme' + (units === 1 ? '' : 's');
    }
    if(type === 'workbook'){
      // Only the CGs of the file imported in this session (blank until an import). Nothing is read from the server here.
      const month = currentWorkbookMonth;
      // Only saved marks count. A file that is imported but not confirmed is never shown here.
      const fromFile = [];
      fromFile.forEach(f => (f.compRows || []).forEach(c => {
        const r = cover('CG-' + f.cg.replace('CG-', ''), c.code, c.code);
        if(r){ r.tot.b += c.b; r.tot.p += c.p; r.tot.a += c.a; }
      }));
      period = fromFile.length ? 'Imported file · ' + month : month;
      units = fromFile.reduce((n, f) => n + (f.compRows || []).length, 0); scope = units + ' competenc' + (units === 1 ? 'y' : 'ies');
      // no file imported in this session: show the saved tally for this class and month
      if(!fromFile.length){
        const saved = loadSavedWorkbookTally(month, rerender);
        if(saved && saved.length){
          saved.forEach(x => { const r = cover(x.cg, x.code, x.code); if(r){ r.tot.b += x.b; r.tot.p += x.p; r.tot.a += x.a; } });
          period = 'Saved · ' + month;
          units = saved.length; scope = units + ' competenc' + (units === 1 ? 'y' : 'ies');
        }
      }
      return { loading: false, rows: Object.values(rows), period, scope, cells: 0, units, kids: 0, noMarks: 0 };
    }
    if(type === 'workbook_unused'){
      const month = currentWorkbookMonth;
      if(![ensureWorkbookPagesLoaded(level, month, rerender), ensureWorkbookChildMarksLoaded(month, rerender)].every(Boolean)) return { loading: true, period: month };
      const books = workbookPagesCache[level + '|' + month], marks = workbookChildMarksCache[month];
      const book = Array.isArray(books) ? (books.find(b => b.name === currentWorkbookCompetencyBookName) || books[0]) : null;
      const onPage = {}; (book && book.pages || []).forEach(pg => { onPage[pg.page_number] = (onPage[pg.page_number] || 0) + 1; });
      (book && book.pages || []).forEach(pg => {
        const lbl = 'Page ' + String(pg.page_number).replace(/\.0$/, '') + (onPage[pg.page_number] > 1 ? ' · Act ' + (pg.activity_no || 1) : ''); // as the Workbook screen labels it
        const r = cover(cgCode(pg.cg_code), lbl, (pg.activity_title ? pg.activity_title + ' · ' : '') + (book ? book.name + ' · ' : '') + lbl + ' · ' + pg.cg_code);
        cells += kids.length; units++;
        if(r && marks && typeof marks === 'object') kids.forEach(p => mark(r, p.id, tierOf((marks[p.id] || {})[pg.id])));
      });
      period = (book ? book.name + ' · ' : '') + month; scope = units + ' activit' + (units === 1 ? 'y' : 'ies');
    }
    if(type === 'motor'){
      if(!ensureMotorAssessmentLoaded(rerender)) return { loading: true, period: '' };
      const months = assessTermMonths().filter(m => MOTOR_MONTHS.includes(m));
      ['fine', 'gross'].forEach(kind => {
        const code = motorCgFor(kind); if(!code) return;
        months.forEach(m => {
          const act = (MOTOR_ACTIVITIES[kind] || {})[m]; if(!act) return;
          const r = cover(code, (kind === 'fine' ? 'Fine' : 'Gross') + ' Motor · ' + m, (kind === 'fine' ? 'Fine' : 'Gross') + ' Motor, ' + m + ': ' + act.title + (act.detail ? ' — ' + act.detail : ''));
          cells += kids.length; units++;
          kids.forEach(p => { const v = motorRating(p.id, kind, m); mark(r, p.id, v === 'R' ? 'b' : v === 'Y' ? 'p' : v === 'G' ? 'a' : ''); });
        });
      });
      period = months.length ? span(months) : ''; scope = units + ' activit' + (units === 1 ? 'y' : 'ies');
    }
    const list = Object.keys(rows).sort(sortCodes).map(c => rows[c]);
    return { loading: false, rows: list, period, cells, scope, kids: kids.length, noMarks: kids.filter(p => !perKid[p.id]).length };
  }

  // open / folded, per tab, for this browser tab
  const OPEN_KEY = 'aarambhCgSummaryOpen';
  const isOpen = type => { try { return !!JSON.parse(sessionStorage.getItem(OPEN_KEY) || '{}')[type]; } catch(e){ return false; } };
  // the All activities rows for a screen: Classroom Observation or Workbook
  const allRowsFor = type => (type === 'observation' ? window.observationAllRows : type === 'workbook' ? window.workbookAllRows : null);
  // Classroom Observation: the table starts closed on every page load; it opens only when Show the table is clicked.
  try { const o = JSON.parse(sessionStorage.getItem(OPEN_KEY) || '{}'); delete o.observation; delete o.workbook; sessionStorage.setItem(OPEN_KEY, JSON.stringify(o)); } catch(e){}
  window.cgSummaryToggle = function(type){
    let o = {}; try { o = JSON.parse(sessionStorage.getItem(OPEN_KEY) || '{}'); } catch(e){}
    o[type] = !o[type]; try { sessionStorage.setItem(OPEN_KEY, JSON.stringify(o)); } catch(e){}
    const t = monthlyAssessmentTargetEl, old = t && t.querySelector('[data-cg-summary]');
    if(old){ const fresh = card(type, () => renderMonthlyAssessment(monthlyAssessmentTargetEl)); old.replaceWith(fresh); } // only this card changes
  };

  // The 13 curricular goals (curricular_goals table)
  const CG_NAMES = { 1: 'Healthy & Safe Habits', 2: 'Sensorial Development', 3: 'Physical Fitness & Fine Motor Skills', 4: 'Emotional Intelligence', 5: 'Productive Work & Seva', 6: 'Care for Nature', 7: 'Observations & Logical Thinking', 8: 'Mathematical Understanding', 9: 'Communication in Two Languages', 10: 'Reading & Writing (L1)', 11: 'Beginning Reading & Writing (L2)', 12: 'Visual & Performing Arts', 13: 'Curiosity, Attention, Adaptability & Positive Learning Behaviours' };
  // competency rows ("CG-1.2" inside the portal) → C-1.2, grouped under CG-1
  function groupCgs(rows){
    const by = {};
    rows.forEach(r => {
      const m = String(r.code).match(/^CG-(\d+)(?:\.(\d+))?/); if(!m) return;
      const g = by[m[1]] || (by[m[1]] = { code: 'CG-' + m[1], num: +m[1], name: CG_NAMES[m[1]] || '', tot: { b: 0, p: 0, a: 0 }, comps: [] });
      g.tot.b += r.tot.b; g.tot.p += r.tot.p; g.tot.a += r.tot.a;
      g.comps.push(Object.assign({}, r, { code: m[2] ? 'C-' + m[1] + '.' + m[2] : 'C-' + m[1], whole: !m[2] }));
    });
    return Object.values(by).sort((x, y) => x.num - y.num);
  }

  // All activities inside the observation CG summary card — laid out like the CG summary table
  // (CG rows, competencies under each, the activities in FROM, coloured B / P / A, TOTAL, MIX, CLASS LEVEL).
  function observationAllBlock(data){
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:16px; width:100%;';
    const byCg = {}, byComp = {}, grand = { b: 0, p: 0, a: 0 };
    data.rows.forEach(r => {
      if(!(r.b + r.p + r.a)) return; // not completed: left out of the table
      const m = /C-?\s*(\d+)\.(\d+)/.exec(String(r.cg || '')); if(!m) return;
      const cgN = m[1], comp = 'C-' + m[1] + '.' + m[2];
      const cg = byCg[cgN] || (byCg[cgN] = { code: 'CG-' + cgN, tot: { b: 0, p: 0, a: 0 }, comps: [] });
      if(!cg.comps.includes(comp)) cg.comps.push(comp);
      const c = byComp[comp] || (byComp[comp] = { code: comp, tot: { b: 0, p: 0, a: 0 }, items: [] });
      [c.tot, cg.tot].forEach(t2 => { t2.b += r.b; t2.p += r.p; t2.a += r.a; });
      grand.b += r.b; grand.p += r.p; grand.a += r.a;
      const key = r.theme + '|' + r.month;
      if(!c.items.some(x => x.theme + '|' + x.month === key)) c.items.push({ theme: r.theme, month: r.month });
    });
    const flat = [], kind = [];
    Object.keys(byCg).sort((x, y) => Number(x) - Number(y)).forEach(n => {
      const g = byCg[n];
      g.comps.sort((x, y) => Number(x.split('.')[1]) - Number(y.split('.')[1]));
      flat.push({ code: g.code, tot: g.tot, items: g.comps }); kind.push(g);
      g.comps.forEach(cc => { const c = byComp[cc]; flat.push({ code: c.code, tot: c.tot, items: c.items.map(x => x.theme + ' · ' + x.month) }); kind.push(null); });
    });
    if(!flat.length){ wrap.innerHTML = '<p class="cap" style="margin:0;">No observation activities in this range yet.</p>'; return wrap; }
    wrap.innerHTML = gradeTotalsTable(flat, grand, cgLevel);
    [...wrap.querySelectorAll('tbody tr')].slice(0, flat.length).forEach((tr, i) => {
      const g = kind[i], r = flat[i], c0 = tr.children[0], c1 = tr.children[1];
      if(!c0 || !c1) return;
      if(g){
        c0.innerHTML = '<b>' + esc(g.code) + '</b>';
        c1.innerHTML = 'Competencies ' + g.comps.map(x => '<b>' + esc(x) + '</b>').join(' · ');
        [...tr.children].forEach(td => { td.style.borderTop = '2px solid var(--border, #E3E7E3)'; });
        c0.style.background = c1.style.background = '#F3FAF6';
      } else {
        c0.innerHTML = '<span style="padding-left:18px; color:var(--primary-dark, #17765B); font-weight:700;">' + esc(r.code) + '</span>';
        c1.style.whiteSpace = 'normal';
        c1.innerHTML = byComp[r.code].items.map(x => '<div style="line-height:1.5; padding:2px 0;">' + esc(x.theme) + ' <span class="cap" style="margin-left:6px;">' + esc(x.month) + '</span></div>').join('');
        [...tr.children].forEach(td => { td.style.fontSize = '13px'; });
      }
    });
    return wrap;
  }
  function card(type, rerender){
    const name = TYPES[type], d = collect(type, rerender);
    // Observation with All activities: the header counts come from the same range rows as the table,
    // and only competencies that have marks are counted.
    if(allRowsFor(type) && allRowsFor(type).rows && allRowsFor(type).rows.length){
      const AR = allRowsFor(type), comps = {};
      AR.rows.forEach(r => {
        const m = /C-?\s*(\d+)\.(\d+)/.exec(String(r.cg || '')); if(!m) return;
        const code = 'CG-' + m[1] + '.' + m[2];
        const c = comps[code] || (comps[code] = { code, tot: { b: 0, p: 0, a: 0 }, items: [], tips: {} });
        c.tot.b += r.b; c.tot.p += r.p; c.tot.a += r.a;
        const lbl = r.theme + ' · ' + r.month; if(!c.items.includes(lbl)) c.items.push(lbl);
      });
      d.rows = Object.values(comps).filter(c => c.tot.b + c.tot.p + c.tot.a > 0);
      d.period = AR.months[0] + (AR.months.length > 1 ? ' – ' + AR.months[AR.months.length - 1] : '');
    }
    // With All activities, the card shows one table only: the activity list built by observationAllBlock
    const allActive = !!(allRowsFor(type) && allRowsFor(type).rows && allRowsFor(type).rows.length);
    const title = 'CG summary — ' + name + (d.period ? ', ' + d.period : '');
    // Only goals and competencies with marks count as covered. A goal with no marks yet is not covered.
    const rows = d.rows || [], hasMarks = x => (x.tot.b + x.tot.p + x.tot.a) > 0;
    const cgs = groupCgs(rows).filter(hasMarks).map(g => Object.assign({}, g, { comps: g.comps.filter(hasMarks) }));
    const comps = rows.filter(hasMarks).length, marked = cgs.length;
    const grand = rows.reduce((g, r) => ({ b: g.b + r.tot.b, p: g.p + r.tot.p, a: g.a + r.tot.a }), { b: 0, p: 0, a: 0 });
    const L = (grand.b + grand.p + grand.a) ? cgLevel(grand.b, grand.p, grand.a) : null;
    const btn = (label, extra) => `<button type="button" onclick="cgSummaryToggle('${type}')" style="margin-top:8px; padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; font:inherit; font-size:12.5px; font-weight:700; color:var(--primary-dark, #17765B); cursor:pointer; ${extra || ''}">${label}</button>`;
    let el;
    if(!isOpen(type)){
      // folded: a card of its own (tinted), one chip per covered CG coloured by its level
      const LV = { B: ['Beginner', '#FCE3E1', '#9B1C1C', '#E9B5B1'], P: ['Proficient', '#FFF1CC', '#7A5300', '#E8CF84'], A: ['Advanced', '#DDF2E5', '#1E6B46', '#A9D9BC'] };
      const chips = cgs.map(g => { const n = g.tot.b + g.tot.p + g.tot.a, l = n ? cgLevel(g.tot.b, g.tot.p, g.tot.a) : null, k = l && LV[l.letter];
        const tip = g.code + ' ' + g.name + ' — ' + (k ? k[0] + ' (B ' + g.tot.b + ' · P ' + g.tot.p + ' · A ' + g.tot.a + ')' : 'not assessed yet') + ' · from ' + g.comps.map(c => c.code).join(', ');
        return `<span data-cg-tip="${esc(tip)}" tabindex="0" style="display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:999px; font-size:13px; font-weight:800; white-space:nowrap; cursor:help; ${k ? 'background:' + k[1] + '; color:' + k[2] + '; border:1px solid ' + k[3] : 'background:#fff; color:#6b7770; border:1px dashed #b9c4be'}">${esc(g.code)}<span style="font-weight:700; opacity:.8;">${k ? l.letter : '–'}</span><span style="font-weight:600; font-size:11.5px; opacity:.75;">· ${g.comps.length} comp.</span></span>`; }).join('');
      const levelTxt = d.loading ? 'Adding up…' : !rows.length ? 'No CGs on this tab yet' : L ? ({ B: 'Beginner', P: 'Proficient', A: 'Advanced' }[L.letter] || L.letter) : 'Not assessed yet';
      const levelStyle = L ? 'background:' + LV[L.letter][1] + '; color:' + LV[L.letter][2] : 'background:#eef1ee; color:#5b6b62';
      el = document.createElement('div'); el.className = 'card';
      el.style.cssText = 'background:#F3FAF6; border:1.5px solid #9FD3BB; border-radius:16px; padding:22px 24px; display:flex; flex-wrap:wrap; gap:18px 28px; align-items:center;';
      el.innerHTML = `
        <div style="flex:0 1 340px; min-width:260px; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#17765B;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>
            CG summary</div>
          <div style="font-size:13px; font-weight:600; color:#5B6B62; margin-top:-4px;">${esc(name)}${d.period ? ' · ' + esc(d.period) : ''}</div>
          <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;"><span style="font-size:44px; font-weight:800; line-height:1; color:var(--text, #1D2B22);">${d.loading ? '…' : cgs.length}</span><span style="font-size:15px; font-weight:700; color:#3B4A41;">CG${cgs.length === 1 ? '' : 's'} covered</span><span style="font-size:13px; font-weight:600; color:#5B6B62;">from ${comps} competenc${comps === 1 ? 'y' : 'ies'} · ${marked} with marks</span></div>
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;"><span style="padding:4px 11px; border-radius:999px; font-size:12.5px; font-weight:800; ${levelStyle}">Class level: ${esc(levelTxt)}</span>${(grand.b + grand.p + grand.a) ? gradeBar(grand.b, grand.p, grand.a, 120) : ''}</div>
        </div>
        <div style="flex:999 1 360px; min-width:0; display:flex; flex-wrap:wrap; gap:8px; align-content:center;" aria-label="Class level of each curricular goal">${chips || '<span class="cap">Nothing to show yet.</span>'}</div>
        <div style="flex:0 0 auto;"><button type="button" onclick="cgSummaryToggle('${type}')" style="height:44px; padding:0 18px; border-radius:10px; border:1px solid #17765B; background:#17765B; color:#fff; font:inherit; font-size:14px; font-weight:800; cursor:pointer;">Show the table ▸</button></div>`;
    } else if(d.loading){
      el = mdCard(title, 'Adding up the saved marks…', null);
    } else {
      const box = document.createElement('div');
      const flat = [], kind = [];
      cgs.forEach(g => { flat.push({ code: g.code, tot: g.tot, items: g.comps.map(c => c.code) }); kind.push(g);
        g.comps.forEach(c => { if(c.whole && g.comps.length === 1){ g.directItems = c.items; g.directTips = c.tips; return; } flat.push(c); kind.push(null); }); });
      box.innerHTML = allActive ? '' : (rows.length ? gradeTotalsTable(flat, grand, cgLevel) : '<p class="cap" style="margin:0;"><b>No data was recorded for this month.</b></p>');
      const tipSpan = (lbl, tip) => tip ? `<span data-cg-tip="${esc(tip)}" tabindex="0" style="border-bottom:1px dotted #8a968f; cursor:help; outline-offset:2px;">${esc(lbl)}</span>` : esc(lbl);
      [...box.querySelectorAll('tbody tr')].slice(0, flat.length).forEach((tr, i) => {
        const r = flat[i], g = kind[i], c0 = tr.children[0], c1 = tr.children[1]; if(!c0 || !c1) return;
        if(g){   // a curricular goal: its name; From = its competencies (or, for a CG-level activity, the activities)
          c0.innerHTML = `<b>${esc(g.code)}</b><div class="cap" style="margin:2px 0 0; font-weight:600;">${esc(g.name)}</div>`;
          c1.innerHTML = g.directItems ? g.directItems.map(l => tipSpan(l, (g.directTips || {})[l])).join(' · ') : 'Competencies ' + g.comps.map(c => '<b>' + esc(c.code) + '</b>').join(' · ');
          [...tr.children].forEach(td => { td.style.borderTop = '2px solid var(--border, #E3E7E3)'; }); c0.style.background = c1.style.background = '#F3FAF6';
        } else { // a competency, under its CG: the activities it comes from
          c0.innerHTML = `<span style="padding-left:18px; color:var(--primary-dark, #17765B); font-weight:700;">${esc(r.code)}</span>`;
          c1.innerHTML = r.items.map(l => tipSpan(l, (r.tips || {})[l])).join(' · ');
          [...tr.children].forEach(td => { td.style.fontSize = '13px'; });
        }
      });
      const allRow = box.querySelector('tbody tr:last-child td'); if(allRow && /All CGs/.test(allRow.textContent)) allRow.textContent = 'All CGs';
      el = mdCard(title, 'Worked out from the child marks — nothing to enter here. ' + cgs.length + ' curricular goal' + (cgs.length === 1 ? '' : 's') + ' (CG) from ' + comps + ' competenc' + (comps === 1 ? 'y' : 'ies') + ' (C-…): each CG adds up its competencies, and each competency adds up its activities.', box);
      const hd = el.querySelector('.hd'); if(hd){ hd.style.display = 'flex'; hd.style.justifyContent = 'space-between'; hd.style.alignItems = 'flex-start'; hd.style.gap = '12px'; hd.insertAdjacentHTML('beforeend', btn('▾ Hide', 'margin-top:0; flex:none;')); }
    }
    if(allActive && isOpen(type)) el.appendChild(observationAllBlock(allRowsFor(type)));
    el.setAttribute('data-cg-summary', type);
    if(d.loading) recheck(type, rerender);
    // Pre-Test: the curricular goals this test does not cover at all (the full CG list minus the covered ones)
    if(type === 'pretest'){
      const coveredNums = cgs.map(g => g.num);
      const missing = Object.keys(CG_NAMES).map(Number).filter(n => !coveredNums.includes(n));
      const box = document.createElement('div');
      box.setAttribute('data-cg-not-covered', '');
      // only a glance: one quiet line; the names appear on hover
      box.style.cssText = 'width:100%; margin-top:4px; padding-top:10px; border-top:1px solid #CDE7DA; font-size:12px; color:#5b6b62;';
      box.innerHTML = missing.length
        ? `<span title="${esc(missing.map(n => 'CG-' + n + ' ' + CG_NAMES[n]).join('\n'))}" style="cursor:help; border-bottom:1px dotted #8a968f;">Not covered by Pre-Test: ${missing.length} CG${missing.length === 1 ? '' : 's'}</span>`
        : `<span style="font-size:12.5px; color:#1E6B46; font-weight:700;">Every curricular goal is covered by the Pre-Test.</span>`;
      el.appendChild(box);
    }
    return el;
  }
  // still adding up: look again shortly (some redraws on the server never come back to this card)
  // The same CG summary card the Workbook screen uses, for other screens (Pre-Test, …)
  window.cgSummaryCardFor = function(type, rerender){ return card(type, rerender); };
  // Redraw one summary card now (used after saved marks are loaded from the database)
  window.cgSummaryRefresh = function(type){
    const t = monthlyAssessmentTargetEl, old = t && t.querySelector('[data-cg-summary="' + type + '"]');
    if(!old) return;
    old.replaceWith(card(type, () => renderMonthlyAssessment(monthlyAssessmentTargetEl)));
  };
  let rechecks = 0;
  function recheck(type, rerender){
    if(rechecks > 40) return; rechecks++;
    setTimeout(() => {
      const t = monthlyAssessmentTargetEl, old = t && t.querySelector('[data-cg-summary="' + type + '"]');
      if(!old || assessmentEntryType !== type) return;
      const d = collect(type, rerender);
      if(d.loading){ recheck(type, rerender); return; }
      rechecks = 0; old.replaceWith(card(type, rerender)); placeTiles(t, type);
    }, 1500);
  }
  // Observation / Workbook / Motor: the same summary tiles as Pre-Test (a tab with tiles of its own keeps them)
  function placeTiles(targetEl, type){
    if(type === 'pretest') return;
    const old = targetEl.querySelector('[data-cg-tiles]'); if(old) old.remove();
    // the tab's own summary tiles start with "Scope" (Observation, Workbook); Motor's month cards are not summary tiles
    if([...targetEl.children].some(ch => ch.classList && ch.classList.contains('g') && !ch.hasAttribute('data-cg-tiles') && /^\W*Scope/.test(String(ch.textContent || '').trim()))) return;
    const d = collect(type, () => renderMonthlyAssessment(monthlyAssessmentTargetEl)); if(d.loading) return;
    const g = (d.rows || []).reduce((x, r) => ({ b: x.b + r.tot.b, p: x.p + r.tot.p, a: x.a + r.tot.a }), { b: 0, p: 0, a: 0 }), n = g.b + g.p + g.a;
    const done = d.cells ? Math.round(100 * n / d.cells) : 0;
    const dsi = n ? Math.round(((g.a * 3 + g.p * 2 + g.b) / (3 * n) * 200) * 10) / 10 : 0, sri = n ? Math.round((g.p + g.a) / n * 100) : 0;
    const band = v => mdStatusBand(v), name = TYPES[type];
    const grid = document.createElement('div'); grid.className = 'g g5'; grid.setAttribute('data-cg-tiles', type);
    [mdTile('Scope', d.scope || '—', groupCgs(d.rows || []).length + ' CGs · ' + (d.rows || []).length + ' competencies · ' + (d.period || ''), mdPill(name, 'info'), ''),
     mdTile('Completed', done, '% of child × activity marked', mdPill(mdStatusBand(done, 90, 70).l, mdStatusBand(done, 90, 70).c), '', mdMeter(done)),
     mdTile('Class DSI', dsi, 'of 200', n ? mdPill(band(dsi / 2).l, band(dsi / 2).c) : mdPill('No marks yet', 'warn'), 'DSI', mdMeter(dsi / 2)),
     mdTile('At Proficient or above', sri, '% SRI', n ? mdPill(band(sri).l, band(sri).c) : mdPill('No marks yet', 'warn'), 'SRI', mdMeter(sri)),
     mdTile('No marks yet', d.noMarks, 'of ' + d.kids + ' children', d.noMarks > d.kids / 3 ? mdPill('Needs follow-up', 'crit') : d.noMarks ? mdPill('Some to do', 'warn') : mdPill('None', 'good'), '')
    ].forEach(t => grid.appendChild(t));
    const imp = [...targetEl.children].find(ch => /^\W*Import a file or photo/.test(String(ch.textContent || '').replace(/\s+/g, ' ').trim()));
    if(imp) imp.insertAdjacentElement('afterend', grid); else targetEl.insertBefore(grid, targetEl.firstChild);
  }

  // A card on the tab, by what its text begins with (works whatever heading tag or fold it has)
  const startsWith = (el, re) => re.test(String(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120));
  const OLD_SUMMARY = /^[^A-Za-z]*(CG summary|Total — Classroom Observation|Total — Fine & Gross Motor)/; // titles run on into the next text
  const ACT_SECTION = /^[^A-Za-z]*(Worksheet|Classroom) activities/;   // its text runs on into the label ("…activitiesASM-PT1…3")
  const ACT_TABLE = /^[^A-Za-z]*The Beginner · Proficient · Advanced counts are worked out/;
  const SAVE_BAR = /^[^A-Za-z]*Pre-Test is saved as you tap/;
  function tidy(targetEl){
    const type = typeof assessmentEntryType !== 'undefined' ? assessmentEntryType : '';
    [...targetEl.children].forEach(ch => {
      if(ch.hasAttribute('data-cg-summary') || ch.querySelector('[data-cg-summary]') || ch.hasAttribute('data-pt-save-status') || ch.querySelector('[data-pt-save-status]')) return; // never the new cards themselves
      if(startsWith(ch, OLD_SUMMARY)) ch.remove();                                   // an old / second CG summary
      else if(type === 'pretest' && (startsWith(ch, ACT_SECTION) || startsWith(ch, ACT_TABLE) || startsWith(ch, SAVE_BAR))) ch.remove(); // the CG-1 … table; the save card (now in Enter manually)
    });
  }
  // Pre-Test: the MONTH box (a box whose label starts "Month", with a dropdown) goes just above the Import card
  function moveMonthBox(targetEl){
    const kids = [...targetEl.children];
    const tiles = kids.find(ch => /^\W*Import a file or photo/.test(String(ch.textContent || '').replace(/\s+/g, ' ').trim())); // the Import card
    const month = kids.find(ch => ch !== tiles && ch.querySelector && ch.querySelector('select') && /^\W*(month(?!ly)|from)/i.test(String(ch.textContent || '').trim())); // its label runs on into the dropdown ("MonthAll months…", "FromNovember…")
    if(!tiles || !month || month.nextElementSibling === tiles) return; // nothing to do, or already there
    targetEl.insertBefore(month, tiles);
  }
  // ---- the grading list: hidden until ✍ Enter manually (Workbook, Observation, Motor) ----
  const GRID_TABS = { workbook: 1, observation: 1, motor: 1 }, GRID_KEY = 'aarambhGradingOpen';
  const gridOpen = type => { try { return !!JSON.parse(sessionStorage.getItem(GRID_KEY) || '{}')[type]; } catch(e){ return false; } };
  const setGridOpen = (type, on) => { let o = {}; try { o = JSON.parse(sessionStorage.getItem(GRID_KEY) || '{}'); } catch(e){} o[type] = !!on; try { sessionStorage.setItem(GRID_KEY, JSON.stringify(o)); } catch(e){} };
  function gradingLayout(targetEl, type){
    if(!GRID_TABS[type]) return;
    const kids = [...targetEl.children];
    const grid = kids.find(ch => ch.querySelector && [...ch.querySelectorAll('thead')].some(th => /teacher notes/i.test(th.textContent)));
    if(!grid) return;
    // the save bar (Observation, Motor) joins the list, as its last row
    const bar = kids.find(ch => ch !== grid && ch.querySelector && ch.querySelector('#observationSaveBtn, #motorSaveBtn'));
    if(bar && !grid.contains(bar)){
      bar.style.margin = '14px -18px -16px'; bar.style.borderRadius = '0 0 12px 12px'; bar.style.border = '0'; bar.style.borderTop = '1px solid var(--border, #E3E7E3)';
      bar.style.boxShadow = 'none'; bar.style.background = '#F3FAF6';
      grid.appendChild(bar);
    }
    let slot = targetEl.querySelector('[data-grading-slot]');
    if(!slot){
      slot = document.createElement('div'); slot.className = 'card'; slot.setAttribute('data-grading-slot', type);
      slot.style.cssText = 'padding:14px 18px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';
      grid.insertAdjacentElement('beforebegin', slot);
    }
    const open = gridOpen(type);
    grid.style.display = open ? '' : 'none';
    // Workbook: no 'Grading list' hint bar; the grading table still opens with Enter manually
    if(type === 'workbook' || type === 'observation' || type === 'motor'){ slot.style.display = 'none'; slot.innerHTML = ''; } else slot.innerHTML = open
      ? `<span class="cap" style="margin:0;"><b style="color:var(--text);">Grading list</b> — tap B, P or A for each child; each tap saves straight away.</span><button type="button" onclick="gradingToggle('${type}', false)" style="padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; font:inherit; font-size:12.5px; font-weight:700; color:var(--primary-dark, #17765B); cursor:pointer;">▾ Hide the grading list</button>`
      : `<span style="font-size:14px;"><b>Grading list</b> <span class="cap">— hidden. It opens with ✍ Enter manually.</span></span><button type="button" onclick="gradingToggle('${type}', true)" style="height:40px; padding:0 16px; border-radius:10px; border:1px solid var(--primary, #1E8F5E); background:var(--primary, #1E8F5E); color:#fff; font:inherit; font-size:14px; font-weight:700; cursor:pointer;">✍ Enter manually</button>`;
  }
  window.gradingToggle = function(type, on){
    setGridOpen(type, on);
    const t = monthlyAssessmentTargetEl; if(!t) return;
    gradingLayout(t, type);
    if(on){ const g = t.querySelector('[data-grading-slot]'); if(g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    // the Enter manually button on the Import card shows green while the list is open
    const btn = [...t.querySelectorAll('.imp-btn')].find(b => /Enter manually/.test(b.textContent));
    if(btn && typeof impSetActive === 'function'){ if(on) impSetActive(btn); else btn.classList.remove('primary'); }
  };
  if(typeof assessManualSheet === 'function'){ // ✍ Enter manually on these tabs opens the grading list itself
    const baseManGrid = assessManualSheet;
    assessManualSheet = function(type){ if(GRID_TABS[type]) return gradingToggle(type, true); return baseManGrid.apply(this, arguments); };
  }

  const watched = new WeakSet();
  function watch(targetEl){ // cards added after the tab is drawn (folds, late loads) are tidied too
    if(watched.has(targetEl) || typeof MutationObserver === 'undefined') return;
    watched.add(targetEl);
    new MutationObserver(() => { if(!targetEl.querySelector('[data-cg-summary]')) return; tidy(targetEl); moveMonthBox(targetEl); if(assessmentEntryType === 'pretest') placeSaveStatus(targetEl); else gradingLayout(targetEl, assessmentEntryType); }).observe(targetEl, { childList: true }); // and the save card back / the month box up / the grading list after a late redraw
  }

  // "Pre-Test is saved as you tap" — in Add data, under the child list, once she enters by hand
  let ptManual = false;
  function preTestCounts(){
    const kids = Array.isArray(realPupilsCache) ? realPupilsCache : [], acts = WEEKLY_ASSESSMENT_ACTIVITIES || [];
    let done = 0; kids.forEach(p => { const rec = (preTestAssessmentEntries || {})[p.name] || {}; acts.forEach((a, i) => { const v = rec[String(i)]; if(v === 'B' || v === 'P' || v === 'A') done++; }); });
    return { done, total: kids.length * acts.length };
  }
  // as the last row of the grading list (same box), or as a card of its own if the list can't be found
  function preTestSaveStatus(asFooter){
    const { done, total } = preTestCounts();
    const el = document.createElement('div'); el.setAttribute('data-pt-save-status', '');
    if(asFooter){
      el.style.cssText = 'display:flex; align-items:center; gap:10px 14px; flex-wrap:wrap; padding:12px 16px; border-top:1px solid var(--border, #E3E7E3); background:#F3FAF6; border-radius:0 0 12px 12px;';
      el.innerHTML = `<span style="display:inline-flex; align-items:center; gap:6px; padding:4px 11px; border-radius:999px; background:#DDF2E5; color:#1E6B46; font-weight:800; font-size:13px;">✓ Saved</span>`
        + `<span style="font-size:13.5px;"><b>Pre-Test is saved as you tap</b> — ${done} of ${total} marks entered. Each tap saves straight away.</span>`;
    } else {
      el.className = 'card';
      el.style.cssText = 'padding:14px 18px; margin:12px 0 20px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';
      el.innerHTML = `<div style="flex:1; min-width:220px;"><b>Pre-Test is saved as you tap</b><p class="cap" style="margin:4px 0 0;">${done} of ${total} marks entered. Each tap saves straight away.</p></div>`
        + `<span class="gd-pill" style="font-weight:700; color:var(--success, #1e6b46);">✓ Saved</span>`;
    }
    return el;
  }
  function placeSaveStatus(targetEl){
    return; // removed: the submit card is the only save control on the Pre-Test page
    if(targetEl.querySelector('[data-pt-save-status]')) return; // whenever the grading list is on screen
    // 1. inside the grading list itself (the child list with B · P · A), as its last row
    const table = [...targetEl.querySelectorAll('table')].find(t => /B\s*·\s*P\s*·\s*A/.test((t.querySelector('thead') || {}).textContent || ''));
    if(table){
      const box = table.closest('.card') || table.closest('.report-table-wrap') || table.parentElement;
      if(box && targetEl.contains(box)){
        box.appendChild(preTestSaveStatus(true)); // the list's own frame: the footer sits inside it, under the last child
        return;
      }
    }
    // 2. else just before the CG summary card, which always follows the grading list
    const summary = targetEl.querySelector('[data-cg-summary]');
    if(summary && summary.parentElement){ summary.parentElement.insertBefore(preTestSaveStatus(false), summary); return; }
    // 3. else right after the "This activity: …" line, wherever it sits
    const line = [...targetEl.querySelectorAll('div, p')].filter(el => /^\W*This activity:/.test(el.textContent.trim()))
      .find(el => !(el.parentElement && /^\W*This activity:/.test(el.parentElement.textContent.trim())));
    if(line) line.insertAdjacentElement('afterend', preTestSaveStatus(false));
  }
  if(typeof assessManualSheet === 'function'){ // ✍ Enter manually on Pre-Test: show the status, then go to Add data
    const baseMan = assessManualSheet;
    assessManualSheet = function(type){
      if(type === 'pretest' && !ptManual){ ptManual = true; const t = monthlyAssessmentTargetEl; if(t) placeSaveStatus(t); }
      return baseMan.apply(this, arguments);
    };
  }
  if(typeof setPreTestChildCount === 'function'){ // a B / P / A tap is entering by hand too
    const baseSet = setPreTestChildCount;
    setPreTestChildCount = function(){ ptManual = true; return baseSet.apply(this, arguments); };
  }

  // one small pop-up box for every [data-cg-tip] (mouse hover or keyboard focus)
  (function tipBox(){
    if(typeof document === 'undefined' || window.__cgTipReady) return; window.__cgTipReady = true;
    const tip = document.createElement('div');
    tip.setAttribute('role', 'tooltip');
    tip.style.cssText = 'position:fixed; z-index:9999; max-width:340px; padding:8px 11px; border-radius:8px; background:#1D2B22; color:#fff; font-size:13px; line-height:1.4; box-shadow:0 6px 18px rgba(0,0,0,.18); pointer-events:none; display:none;';
    const show = el => {
      tip.textContent = el.getAttribute('data-cg-tip'); tip.style.display = 'block';
      if(!tip.isConnected) document.body.appendChild(tip);
      const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      let x = Math.min(Math.max(8, r.left), window.innerWidth - w - 8), y = r.top - h - 8;
      if(y < 8) y = r.bottom + 8; // no room above: below
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    };
    const hide = () => { tip.style.display = 'none'; };
    document.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest('[data-cg-tip]'); if(el) show(el); });
    document.addEventListener('mouseout', e => { const el = e.target.closest && e.target.closest('[data-cg-tip]'); if(el && !(e.relatedTarget && el.contains(e.relatedTarget))) hide(); });
    document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-cg-tip]'); if(el) show(el); else hide(); });
    document.addEventListener('focusout', hide);
    window.addEventListener('scroll', hide, true);
  })();

  // ---- Class Attendance: the Import card uses only the Month bar above ----
  // (Here as well as in attendance-import-month.js, so it works even when an older copy of that
  // file is on the server.) No description text, no "Month to import" picker — whichever script
  // adds them — and one line saying which month is imported.
  const MONTHS_ = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function tidyAttendanceImportCard(card){
    if(!card || !/Import attendance or a class list/.test(card.textContent || '')) return;
    card.querySelectorAll('select').forEach(sel => {
      const row = sel.closest('div, label, p') || sel;
      const around = (row.textContent || '') + ' ' + (sel.id || '');
      const monthish = /month/i.test(around) || [...sel.options].some(o => /^(January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(o.textContent.trim()));
      if(monthish && !row.hasAttribute('data-att-import-month') && !row.querySelector('.imp-btn')) row.remove();
    });
    [...card.querySelectorAll('p, div, span')].forEach(el => {
      if(el.children.length > 2 || el.hasAttribute('data-att-import-month') || el.querySelector('.imp-btn, h3')) return;
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if(/^A register in any layout\b/.test(t) || /^The file must be for this month\.?$/.test(t)) el.remove();
    });
    window.attImportMonth = null; // the import follows the Month bar
    if(!card.querySelector('[data-att-import-month]')){
      const y = typeof markAttYear === 'number' ? markAttYear : new Date().getFullYear(), m = typeof markAttMonth === 'number' ? markAttMonth : new Date().getMonth();
      const h = card.querySelector('h3'), line = document.createElement('div'); line.setAttribute('data-att-import-month', '');
      line.style.cssText = 'margin-top:8px; font-size:14px;';
      line.innerHTML = 'Importing: <b>' + MONTHS_[m] + ' ' + y + '</b> <span class="cap" style="margin:0;">— the month chosen in <b>Month</b> above.</span>';
      if(h) h.insertAdjacentElement('afterend', line);
    }
  }
  if(typeof MutationObserver !== 'undefined' && document.body){
    let q = false;
    new MutationObserver(() => { if(q) return; q = true; setTimeout(() => { q = false; document.querySelectorAll('.card').forEach(c => { if(/Import attendance or a class list/.test(c.textContent || '')) tidyAttendanceImportCard(c); }); }, 0); })
      .observe(document.body, { childList: true, subtree: true });
  }

  // ---- Pre-Test Sheet card: tapping Workbook sheet / Classroom sheet opens THAT sheet's activities ----
  // (the activity picker and the grading list, which otherwise wait for ✍ Enter manually), and scrolls to them.
  if(typeof setPreTestSheet === 'function'){
    setPreTestSheet = function(type){
      preTestTypeFilter = type;
      if(typeof preTestManualOpen !== 'undefined') preTestManualOpen = false;   // switching sheets shows the same view; the grid opens only with Enter manually
      const first = WEEKLY_ASSESSMENT_ACTIVITIES.findIndex(a => a.type === type);
      if(typeof preTestSelectedActivityIdx !== 'undefined' && (WEEKLY_ASSESSMENT_ACTIVITIES[preTestSelectedActivityIdx] || {}).type !== type && first >= 0) preTestSelectedActivityIdx = first;
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
      setTimeout(() => { const bar = document.getElementById('preTestPickerBar'); if(bar && bar.scrollIntoView) bar.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 0);
    };
  }

  const base = renderMonthlyAssessment;
  renderMonthlyAssessment = function(targetEl){
    const out = base.apply(this, arguments);
    try {
      const type = typeof assessmentEntryType !== 'undefined' ? assessmentEntryType : '';
      if(!TYPES[type] || !targetEl || targetEl.querySelector('[data-cg-summary]')) return out;
      const rerender = () => renderMonthlyAssessment(monthlyAssessmentTargetEl);
      // put the new card where the first old summary stood, else before the Download card at the end
      const old = [...targetEl.children].find(ch => startsWith(ch, OLD_SUMMARY));
      const fresh = card(type, rerender);
      if(old) targetEl.insertBefore(fresh, old);
      else {
        const dl = [...targetEl.children].find(ch => /^\W*Download/.test(String(ch.textContent || '').replace(/\s+/g, ' ').trim()));
        if(dl) targetEl.insertBefore(fresh, dl); else targetEl.appendChild(fresh);
      }
      tidy(targetEl);
      moveMonthBox(targetEl);
      if(type === 'pretest') placeSaveStatus(targetEl); else { placeTiles(targetEl, type); gradingLayout(targetEl, type); }
      watch(targetEl);
    } catch(e){ /* the tab still works without the summary */ }
    return out;
  };
})();