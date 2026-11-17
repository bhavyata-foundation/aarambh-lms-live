function saveWorkbookCompetencyTally(competencyId, month, countE, countP, countA){
    if(countE < 0 || countP < 0 || countA < 0) return;
    if(!workbookCompetencyTallyCache[month] || typeof workbookCompetencyTallyCache[month] !== 'object') return;
    workbookCompetencyTallyCache[month][competencyId] = { count_e: countE, count_p: countP, count_a: countA };
    fetch('backend/assessment/workbook/save_workbook_competency_tally.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ workbook_competency_id: competencyId, month, count_e: countE, count_p: countP, count_a: countA })
    }).then(res => res.json()).then(data => {
      if(data.status !== 'success'){ alert('Could not save that count — check your connection and try again.'); }
    }).catch(() => { alert('Could not save that count — check your connection and try again.'); });
  }
/* ===== teacher-part-09.js ===== */
/* =========================================================================
   teacher-part-09.js — part 9 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */
  // Bulk-import variant — same write, but awaitable and silent (no
  // alert per row) so importWorkbookTallyFile can save one row at a
  // time and collect failures into its own summary, rather than firing
  // a dozen simultaneous requests at a local dev PHP server (which
  // serializes requests one at a time and can drop/timeout ones fired
  // concurrently) and popping an alert per failure.
  async function saveWorkbookCompetencyTallySilent(competencyId, month, countE, countP, countA){
    try{
      const res = await fetch('backend/assessment/workbook/save_workbook_competency_tally.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ workbook_competency_id: competencyId, month, count_e: countE, count_p: countP, count_a: countA })
      });
      const data = await res.json();
      if(data.status === 'success'){
        if(workbookCompetencyTallyCache[month] && typeof workbookCompetencyTallyCache[month] === 'object'){
          workbookCompetencyTallyCache[month][competencyId] = { count_e: countE, count_p: countP, count_a: countA };
        }
        return { ok: true };
      }
      return { ok: false, message: data.message || 'Server rejected this row.' };
    } catch(err){
      return { ok: false, message: 'Could not reach the server.' };
    }
  }
  // ---- Child-wise Workbook: each child's B / P / A on each workbook page
  // (each page is linked to its CG). Saved in workbook_assessment through
  // backend/assessment/workbook/get|save_workbook_assessment.php. ----
  const workbookPagesCache = {};      // level|month -> 'loading' | 'error:..' | [{id, name, pages:[{id, page_number, cg_code, activity_title}]}]
  const workbookTeacherNotesCache = {}; // month|bookId -> notes by pupil
  const workbookTeacherNotesInflight = {};
  function ensureWorkbookTeacherNotesLoaded(month, bookId, reRender){
    const key = month + '|' + bookId;
    if(workbookTeacherNotesCache[key] && typeof workbookTeacherNotesCache[key] === 'object') return true;
    if(workbookTeacherNotesInflight[key]) return false;
    const url = 'backend/assessment/get_assessment_notes.php?' + new URLSearchParams({assessment_type:'workbook', month, context_id:bookId}) + (window.location.search ? '&' + window.location.search.slice(1) : '');
    workbookTeacherNotesInflight[key] = fetch(url)
      .then(r => r.json())
      .then(d => {
        workbookTeacherNotesCache[key] = d.status === 'success' ? (d.notes || {}) : 'error:' + (d.message || 'Could not load teacher notes.');
      })
      .catch(() => { workbookTeacherNotesCache[key] = 'error:Could not reach the server.'; })
      .finally(() => {
        delete workbookTeacherNotesInflight[key];
        if (typeof reRender === 'function') reRender();
      });
    return false;
  }
  async function saveWorkbookTeacherNote(pupilId, month, bookId, note){
    const key = month + '|' + bookId, cache = workbookTeacherNotesCache[key];
    if(cache && typeof cache === 'object') cache[pupilId] = note;
    try{
      const res = await fetch('backend/assessment/save_assessment_note.php' + window.location.search, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assessment_type:'workbook',month,context_id:bookId,pupil_id:pupilId,note})});
      const d = await res.json(); if(d.status !== 'success') throw new Error(d.message || 'Not saved.');
    }catch(err){ alert('That note was not saved: ' + (err.message || err)); delete workbookTeacherNotesCache[key]; renderMonthlyAssessment(monthlyAssessmentTargetEl); }
  }
  const workbookChildMarksCache = {}; // month -> 'loading' | 'error:..' | { pupilId: { pageId: 'E'|'P'|'A' } }
  function ensureWorkbookPagesLoaded(level, month, reRender){
    const key = level + '|' + month, c = workbookPagesCache[key];
    if(c && c !== 'loading') return true;
    if(c === 'loading') return false;
    workbookPagesCache[key] = 'loading';
    fetch('backend/get_workbook_pages.php?level=' + encodeURIComponent(level) + '&month=' + encodeURIComponent(month) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(r => r.json()).then(d => { workbookPagesCache[key] = d.status === 'success' ? (d.workbooks || []) : 'error:' + (d.message || 'Could not load the workbook pages.'); reRender(); })
      .catch(() => { workbookPagesCache[key] = 'error:Could not reach the server.'; reRender(); });
    return false;
  }
  function ensureWorkbookChildMarksLoaded(month, reRender){
    const c = workbookChildMarksCache[month];
    if(c && c !== 'loading') return true;
    if(c === 'loading') return false;
    workbookChildMarksCache[month] = 'loading';
    fetch('backend/get_workbook_assessment.php?month=' + encodeURIComponent(month) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(r => r.json()).then(d => {
        if(d.status !== 'success'){ workbookChildMarksCache[month] = 'error:' + (d.message || 'Could not load the workbook marks.'); reRender(); return; }
        const by = {}; (d.marks || []).forEach(m => { (by[m.pupil_id] = by[m.pupil_id] || {})[m.workbook_page_id] = m.level_mark; });
        workbookChildMarksCache[month] = by; reRender();
      }).catch(() => { workbookChildMarksCache[month] = 'error:Could not reach the server.'; reRender(); });
    return false;
  }
  // Tap a letter: saves it; tapping the chosen letter again clears it (= not assessed).
  async function saveWorkbookChildMark(pupilId, pageId, tier){
    const month = currentWorkbookMonth, by = workbookChildMarksCache[month];
    if(!by || typeof by !== 'object') return;
    const before = (by[pupilId] || {})[pageId] || null;
    const next = before === tier ? null : tier;
    (by[pupilId] = by[pupilId] || {})[pageId] = next; if(!next) delete by[pupilId][pageId];
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
    try {
      const res = await fetch('backend/save_workbook_assessment.php' + window.location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pupil_id: pupilId, workbook_page_id: pageId, level_mark: next }) });
      const d = await res.json();
      if(d.status !== 'success') throw new Error(d.message || 'Not saved.');
    } catch(err){
      if(before) (by[pupilId] = by[pupilId] || {})[pageId] = before; else if(by[pupilId]) delete by[pupilId][pageId];
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
      alert('That mark was not saved: ' + (err.message || err) + '\nPlease try again.');
    }
  }
  function renderWorkbookAssessmentSection(container){
    const level = workbookLevelFromClassName();
    const reRender = () => renderMonthlyAssessment(monthlyAssessmentTargetEl);
    // The term comes from the Term 1 / Term 2 bar at the top of Assessment (part 14).
    currentWorkbookTerm = 'Term ' + (typeof currentAssessTerm === 'function' ? currentAssessTerm() : 1);
    const pagesKey = level + '|' + currentWorkbookMonth;
    const pagesLoaded = ensureWorkbookPagesLoaded(level, currentWorkbookMonth, reRender);
    const marksLoaded = ensureWorkbookChildMarksLoaded(currentWorkbookMonth, reRender);
    const pupilsLoaded = ensurePupilsLoadedFor(container, reRender);
    ensureWorkbookCompetenciesLoaded(level, currentWorkbookMonth, reRender); // only for the competency descriptions in the CG summary
    const err = [workbookPagesCache[pagesKey], workbookChildMarksCache[currentWorkbookMonth]].find(x => typeof x === 'string' && x.startsWith('error:'));
    if(err){ renderRetryCard(container, err.slice(6), () => { delete workbookPagesCache[pagesKey]; delete workbookChildMarksCache[currentWorkbookMonth]; }); return; }
    if(!pagesLoaded || !marksLoaded || !pupilsLoaded){ container.appendChild(mdCard(null, 'Loading workbooks…', null)); return; }
    const books = workbookPagesCache[pagesKey];
    if(!books.length){ container.appendChild(mdCard(null, 'No workbooks are set up for ' + esc(level) + ' yet.', null)); return; }
    // --- Compact filters: Month + Workbook share one bar to avoid unnecessary vertical scrolling ---
    const booksThisTerm = books.filter(b => bookBelongsToTerm(b.name, currentWorkbookTerm));
    if(!booksThisTerm.length){ container.appendChild(mdCard(null, 'No workbooks for ' + currentWorkbookTerm + ' are set up for ' + esc(level) + ' yet.', null)); return; }
    if(!currentWorkbookCompetencyBookName || !booksThisTerm.some(b => b.name === currentWorkbookCompetencyBookName)) currentWorkbookCompetencyBookName = booksThisTerm[0].name;
    const filterBar = document.createElement('div');
    filterBar.className = 'fbar';
    filterBar.style.marginBottom = '12px';
    filterBar.innerHTML = `
      <div class="ctl">
        <label>Month</label>
        <select id="workbookCompMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select>
      </div>
      <div class="ctl">
        <label>Workbook</label>
        <select id="workbookCompBookSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px; min-width:180px;"></select>
      </div>`;
    container.appendChild(filterBar);
    const monthSel = filterBar.querySelector('#workbookCompMonthSelect');
    assessTermMonths().forEach(m => {
      const opt = document.createElement('option'); opt.value = m; opt.textContent = m;
      if(m === currentWorkbookMonth) opt.selected = true;
      monthSel.appendChild(opt);
    });
    monthSel.onchange = () => { currentWorkbookMonth = monthSel.value; reRender(); };
    const bookSel = filterBar.querySelector('#workbookCompBookSelect');
    booksThisTerm.forEach(b => {
      const opt = document.createElement('option'); opt.value = b.name; opt.textContent = b.name;
      if(b.name === currentWorkbookCompetencyBookName) opt.selected = true;
      bookSel.appendChild(opt);
    });
    bookSel.onchange = () => { currentWorkbookCompetencyBookName = bookSel.value; reRender(); };
    const selectedBook = booksThisTerm.find(b => b.name === currentWorkbookCompetencyBookName);
    const pages = selectedBook.pages || [];
    ensureWorkbookTeacherNotesLoaded(currentWorkbookMonth, selectedBook.id, reRender);
    container.appendChild(mdSec(esc(selectedBook.name) + ' — ' + currentWorkbookMonth, '<span class="reqs">ASM-WB1…WB4</span>'));
    if(!pages.length){ container.appendChild(mdCard(null, 'No pages of ' + esc(selectedBook.name) + ' are scheduled for ' + esc(currentWorkbookMonth) + '.', null)); return; }
    const marks = workbookChildMarksCache[currentWorkbookMonth];
    const workbookNotes = (workbookTeacherNotesCache[currentWorkbookMonth + '|' + selectedBook.id] && typeof workbookTeacherNotesCache[currentWorkbookMonth + '|' + selectedBook.id] === 'object') ? workbookTeacherNotesCache[currentWorkbookMonth + '|' + selectedBook.id] : {};
    const kids = realPupilsCache || [];
    let wbRecorded = 0;
    const wbTot = { B: 0, P: 0, A: 0 };
    kids.forEach(k => pages.forEach(pg => {
      const m = (marks[k.id] || {})[pg.id];
      if(m === 'E' || m === 'B'){ wbTot.B++; wbRecorded++; }
      else if(m === 'P'){ wbTot.P++; wbRecorded++; }
      else if(m === 'A'){ wbTot.A++; wbRecorded++; }
    }));
    const wbTotalCells = kids.length * pages.length;
    const wbCompleteness = wbTotalCells ? Math.round(wbRecorded / wbTotalCells * 100) : 0;
    const wbDsi = wbRecorded ? Math.round(((wbTot.A*3 + wbTot.P*2 + wbTot.B) / (3 * wbRecorded) * 200) * 10) / 10 : 0;
    const wbSri = wbRecorded ? Math.round((wbTot.P + wbTot.A) / wbRecorded * 100) : 0;
    const wbNoMarks = kids.filter(k => pages.every(pg => { const m = (marks[k.id] || {})[pg.id]; return !m; })).length;
    const summaryGrid = mdGrid('g5', [
      mdTile('Scope', pages.length, 'activities this month', mdPill(selectedBook.name, 'info'), 'ASM-WB1'),
      mdTile('Recording complete', wbCompleteness, '% of child/activity cells', mdPill(mdStatusBand(wbCompleteness, 90, 70).l, mdStatusBand(wbCompleteness, 90, 70).c), 'ASM-WB2', mdMeter(wbCompleteness)),
      mdTile('Class DSI', wbDsi, 'of 200', mdPill(mdStatusBand(wbDsi/2).l, mdStatusBand(wbDsi/2).c), 'DSI', mdMeter(wbDsi/2)),
      mdTile('At Proficient or above', wbSri, '% SRI', mdPill(mdStatusBand(wbSri).l, mdStatusBand(wbSri).c), 'SRI', mdMeter(wbSri)),
      mdTile('Children with no marks', wbNoMarks, 'of ' + kids.length, wbNoMarks > kids.length/3 ? mdPill('Needs follow-up', 'crit') : wbNoMarks ? mdPill('Some still open', 'warn') : mdPill('All assessed', 'good'), 'ASM-WB4')
    ]);
    summaryGrid.style.marginBottom = '24px';
    container.appendChild(summaryGrid);
    const onPage = {}; pages.forEach(pg => { onPage[pg.page_number] = (onPage[pg.page_number] || 0) + 1; });
    const pageLabel = pg => 'Page ' + String(pg.page_number).replace(/\.0$/, '') + (onPage[pg.page_number] > 1 ? ' · Act ' + (pg.activity_no || 1) : ''); // a page can hold up to 3 activities
    let done = 0;
    let table = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="min-width:' + Math.max(640, 220 + pages.length * 118) + 'px;"><thead><tr><th style="text-align:left;">Child</th>'
      + pages.map(pg => `<th style="text-align:center;" title="${esc(pg.activity_title || '')}">${esc(pageLabel(pg))}<div class="dim" style="font-weight:500;">${esc(pg.cg_code)}</div></th>`).join('') + '<th style="text-align:left; min-width:220px;">Teacher notes</th></tr></thead><tbody>';
    kids.forEach(p => {
      const mine = marks[p.id] || {};
      table += `<tr><td style="text-align:left;"><b>${esc(p.name)}</b>${p.register_no ? '<div class="cap">' + esc(p.register_no) + '</div>' : ''}</td>`;
      pages.forEach(pg => {
        const cur = mine[pg.id] || null; if(cur) done++;
        table += '<td style="text-align:center; white-space:nowrap;">' + ['E', 'P', 'A'].map(t => `<button onclick="saveWorkbookChildMark(${p.id},${pg.id},'${t}')" title="${esc(gradeLabel(t))}" style="${gradeBtnStyle(t, cur === t, 26)} margin:0 2px;">${gradeBtnLabel(cur === t, t)}</button>`).join('') + '</td>';
      });
      table += `<td style="min-width:220px;"><input type="text" class="assessment-note-input" data-pupil="${p.id}" value="${esc(workbookNotes[p.id] || '')}" placeholder="Add a note" style="width:100%; min-width:200px; padding:8px 10px; border:1px solid var(--border,#d9dcd5); border-radius:6px; font-size:12.5px; font-family:inherit; box-sizing:border-box;"></td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    const workbookChildCard = mdCard(null, 'Child-wise: tap B, P or A for each child on each page (B Beginner · P Proficient · A Advanced). Each tap saves straight away; tap the chosen letter again to clear it. Blank = not assessed yet — never counted as Beginner. '
      + done + ' of ' + (kids.length * pages.length) + ' marks entered for ' + currentWorkbookMonth + '.', wrap);
    workbookChildCard.style.marginTop = '24px';
    container.appendChild(workbookChildCard);
    workbookChildCard.querySelectorAll('.assessment-note-input').forEach(inp => { inp.addEventListener('change', () => saveWorkbookTeacherNote(parseInt(inp.getAttribute('data-pupil'),10), currentWorkbookMonth, selectedBook.id, inp.value.trim())); });
    // --- CG summary, worked out from the child marks above: pages on the same CG add up ---
    const byCg = {};
    // blank until a file is imported; then only the CGs of that file (the portal stores no CG data)
    const fromFile = (window.__cgFromImport && window.__cgFromImport.month === currentWorkbookMonth) ? window.__cgFromImport.rows : [];
    fromFile.forEach(r => { byCg[r.cg] = { pages: r.comps, b: r.b, p: r.p, a: r.a }; });
    const compText = cg => { const c = ((workbookCompetenciesCache[level + '|' + currentWorkbookMonth] || []).find ? (workbookCompetenciesCache[level + '|' + currentWorkbookMonth].find(b => b.name === selectedBook.name) || {}).competencies || [] : []).find(x => x.cg_code === cg); return c ? c.competency_text : ''; };
    let sum = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="min-width:620px;"><thead><tr><th style="text-align:left;">CG</th><th style="text-align:left;">Pages</th>' + gradeHeads() + '<th>Total</th><th style="text-align:left;">Class level</th></tr></thead><tbody>';
    Object.keys(byCg).sort((x, y) => x.localeCompare(y, undefined, { numeric: true })).forEach(cg => {
      const g = byCg[cg], n = g.b + g.p + g.a, L = n ? cgLevel(g.b, g.p, g.a) : null;
      sum += `<tr><td style="text-align:left;"><b>${esc(cg)}</b>${compText(cg) ? '<div class="cap">' + esc(compText(cg)) + '</div>' : ''}</td><td style="text-align:left;">${esc(g.pages.join(', '))}</td><td>${g.b}</td><td>${g.p}</td><td>${g.a}</td><td>${n}</td><td style="text-align:left;">${L ? gradePill(L.letter, 'average ' + L.avg) : '<span class="dim">Not assessed yet</span>'}</td></tr>`;
    });
    sum += '</tbody></table></div>';
    const sw = document.createElement('div'); sw.innerHTML = sum;
    container.appendChild(mdCard('CG summary — ' + currentWorkbookMonth, 'Worked out from the child marks above — nothing to enter here. When several pages cover the same CG, their B / P / A all add up.', sw));
    if(myClassInfo.class_id){
      ensureWorkbookMonthSubmissionLoaded(myClassInfo.class_id, currentWorkbookMonth, () => renderMonthlyAssessment(monthlyAssessmentTargetEl));
    }
    const submissionStatus = workbookMonthSubmissionCache[currentWorkbookMonth];
    const isSubmitted = submissionStatus && typeof submissionStatus === 'object' && submissionStatus.submitted;
    // ---- Submit marks for the month (covers every workbook at once,
    // not just the one currently selected) — a real, database-backed
    // status flag. Submitting does NOT lock the numbers: every cell
    // above stays editable regardless. Placed after the table so the
    // action follows actually entering the marks. The Download
    // section right after this one only unlocks once this month shows
    // as submitted. ----
    const submitCard = document.createElement('div');
    submitCard.className = 'card'; submitCard.style.cssText = 'padding:16px 18px; margin-top:20px; margin-bottom:14px;';
    if(!myClassInfo.class_id || submissionStatus === undefined || submissionStatus === 'loading'){
      submitCard.innerHTML = '<p class="cap" style="margin:0;">Checking submission status…</p>';
    } else if(typeof submissionStatus === 'string' && submissionStatus.startsWith('error:')){
      submitCard.innerHTML = `<p class="cap" style="margin:0 0 8px; color:var(--danger, #c8433f);">${esc(submissionStatus.slice(6))}</p><button class="chip" onclick="delete workbookMonthSubmissionCache['${currentWorkbookMonth}']; renderMonthlyAssessment(monthlyAssessmentTargetEl);">Retry</button>`;
    } else if(isSubmitted){
      const submittedDate = new Date(submissionStatus.submitted_at).toLocaleDateString([], {day:'numeric', month:'short', year:'numeric'});
      submitCard.innerHTML = `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div><b style="color:var(--success);">✓ ${esc(currentWorkbookMonth)} submitted</b><p class="cap" style="margin:4px 0 0;">${submissionStatus.submitted_by_name ? esc(submissionStatus.submitted_by_name) + ' · ' : ''}${esc(submittedDate)} — numbers above are still editable; submitting is a status flag, not a lock.</p></div>
        <button style="padding:7px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12.5px; cursor:pointer;" onclick="unsubmitWorkbookMonth()">Undo submission</button>
      </div>`;
    } else {
      submitCard.innerHTML = `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div><b>Not yet submitted</b><p class="cap" style="margin:4px 0 0;">Covers every workbook for ${esc(currentWorkbookMonth)}, not just ${esc(selectedBook.name)} — submit once all books' numbers for this month are ready.</p></div>
        <button class="btn-primary" style="width:auto; padding:9px 18px;" onclick="submitWorkbookMonth()">Submit marks for ${esc(currentWorkbookMonth)}</button>
      </div>`;
    }
    container.appendChild(submitCard);
    // Report download lives in Assessment Dashboard → Assessment records.
    container.appendChild(assessmentReportsLink('workbook'));
  }
  function renderWorkbookTallyImportCard(selectedBook){
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <p class="cap" style="margin:0 0 8px;">.csv or .xlsx — header row must be exactly: cg_code,count_b,count_p,count_a (B Beginner · P Proficient · A Advanced) — cg_code must match one of ${esc(selectedBook.name)}'s competencies (shown as the small grey code under each competency), counts are whole numbers ≥ 0. Applies to ${esc(currentWorkbookMonth)} — the month currently selected above. One row per competency, not per child.</p>
      <input type="file" id="workbookTallyImportInput" accept=".csv,.xlsx" />
      <div id="workbookTallyImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importWorkbookTallyFile()">Import</button>
    `;
    return wrap;
  }
  async function importWorkbookTallyFile(){
    const input = document.getElementById('workbookTallyImportInput');
    const resultEl = document.getElementById('workbookTallyImportResult');
    if(!smartAssessHandoffRows && (!input || !input.files.length)){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    const level = workbookLevelFromClassName();
    const booksKey = level + '|' + currentWorkbookMonth;
    const books = workbookCompetenciesCache[booksKey];
    if(!Array.isArray(books)){
      resultEl.innerHTML = '<div class="au-error">Workbooks for this month have not finished loading — wait a moment and try again.</div>';
      return;
    }
    const selectedBook = books.find(b => b.name === currentWorkbookCompetencyBookName);
    if(!selectedBook){
      resultEl.innerHTML = '<div class="au-error">No workbook is currently selected above.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';
    let rows;
    try { rows = await readAssessmentFileRows(input && input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }
    const header = rows[0].map(h => h.toLowerCase().trim().replace(/^count_b$/, 'count_e')); // count_b (Beginner) = count_e
    if(header.join(',') !== 'cg_code,count_e,count_p,count_a'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: cg_code,count_b,count_p,count_a — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }
    const byCgCode = {};
    selectedBook.competencies.forEach(c => { byCgCode[c.cg_code.trim().toLowerCase()] = c; });
    let imported = 0;
    const skipped = [];
    for(let i = 1; i < rows.length; i++){
      const parts = rows[i];
      const rowNum = i + 1;
      if(parts.length !== 4){ skipped.push(`Row ${rowNum}: expected 4 columns, got ${parts.length}`); continue; }
      const [cgCodeRaw, eRaw, pRaw, aRaw] = parts;
      const comp = byCgCode[(cgCodeRaw || '').trim().toLowerCase()];
      if(!comp){ skipped.push(`Row ${rowNum}: "${cgCodeRaw}" isn't a competency code in ${esc(selectedBook.name)}`); continue; }
      const e = parseInt(eRaw, 10), p = parseInt(pRaw, 10), a = parseInt(aRaw, 10);
      if(isNaN(e) || isNaN(p) || isNaN(a) || e < 0 || p < 0 || a < 0){
        skipped.push(`Row ${rowNum}: counts must be whole numbers ≥ 0 — got "${eRaw}, ${pRaw}, ${aRaw}"`);
        continue;
      }
      resultEl.innerHTML = `<p class="sub">Saving ${cgCodeRaw}… (${imported} of ${rows.length - 1} done)</p>`;
      const result = await saveWorkbookCompetencyTallySilent(comp.id, currentWorkbookMonth, e, p, a);
      if(!result.ok){ skipped.push(`Row ${rowNum} (${cgCodeRaw}): ${result.message}`); continue; }
      imported++;
    }
    let html = `<div class="au-success">✓ Filled in ${imported} competenc${imported === 1 ? 'y' : 'ies'} — saved.</div>`;
    if(skipped.length > 0){
      html += `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<ul style="margin:4px 0 0 18px;">${skipped.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`;
    }
    resultEl.innerHTML = html;
    alert(`Imported ${imported} competency tally row(s) for ${selectedBook.name} — ${currentWorkbookMonth}.` + (skipped.length ? ` ${skipped.length} skipped — see the details below.` : ''));
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  const ASSESSMENT_TYPE_INFO = {
    pretest: { label: 'Pre-Test', icon: '📋', reqs: 'ASM-PT1…3' },          // first: the baseline, before teaching starts
    observation: { label: 'Classroom Observation', icon: '👁️', reqs: 'ASM-O1…O3' },
    workbook: { label: 'Workbook Assessment', icon: '📘', reqs: 'ASM-WB1…WB4' },
    motor: { label: 'Fine & Gross Motor', icon: '🤸', reqs: 'ASM-M1…M2' },
    viva: { label: 'Viva', icon: '🗣️', reqs: 'ASM-V1…V2' }
  };
  // Weekly Assessment and Monthly Assessment were removed pending a
  // restructure — was previously a computed rollup (Weekly Review /
  // Monthly Review) over Workbook + Classroom Observation evidence.
  // WEEKLY_ASSESSMENT_ACTIVITIES and TIER_INFO below are NOT dead code —
  // Pre-Test still depends on both directly, since it shares the same
  // real 26-activity list.
  let assessmentEntryType = 'pretest'; // Assessment opens on Pre-Test
  function switchAssessmentEntryType(type){
    if(type === 'pretest' && currentAssessTerm() === 2){ assessmentEntryType = 'observation'; renderMonthlyAssessment(monthlyAssessmentTargetEl); return; }
    // Pre-Test first (Term 1 only): the other steps open only once the Pre-Test for this term is submitted
    if(type !== 'pretest' && currentAssessTerm() === 1 && window.preTestSubmittedState){
      const st = window.preTestSubmittedState();
      if(st === 'loading'){ setTimeout(() => switchAssessmentEntryType(type), 300); return; }
      if(st === 'error'){ alert('The Pre-Test submit status could not be checked. Try again in a moment.'); return; }
      if(st !== 'yes'){ alert('Submit the Pre-Test for this term first ("Submit marks"). The other assessments open after that.'); return; }
    }
    assessmentEntryType = type;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  // ---------------------------------------------------------------
  // WEEKLY ASSESSMENT — real activity-level structure, matching the
  // actual Bhavyata Foundation worksheet ("NEP 2020 Pre-Test Assessment
  // Sheet" / weekend worksheet pack): specific named activities (20
  // worksheet + 6 classroom = 26), each tied to a real Curricular Goal
  // code, rated Green/achieved · Yellow/developing · Red/needs support
  // — not the abstract 10-domain B/P/A grid Monthly and Classroom
  // Observation use. This is a genuinely different instrument, done
  // weekly (Saturdays), not a relabeled copy of the monthly one.
  // ---------------------------------------------------------------
  const WEEKLY_ASSESSMENT_ACTIVITIES = [
    { type: 'Worksheet', activity: 'Tick the good hygiene habits', cg: 'CG 1.2', page: '04' },
    { type: 'Worksheet', activity: 'Circle the organised classroom habits', cg: 'CG 1.3', page: '03' },
    { type: 'Worksheet', activity: 'Tick the safe tools', cg: 'CG 1.4', page: '04' },
    { type: 'Worksheet', activity: 'Circle soft things', cg: 'CG 2.5', page: '01' },
    { type: 'Worksheet', activity: 'Circle your family members', cg: 'CG 4.1', page: '04' },
    { type: 'Worksheet', activity: 'Circle how you feel today', cg: 'CG 4.2', page: '03' },
    { type: 'Worksheet', activity: 'Circle the kind actions', cg: 'CG 4.6', page: '04' },
    { type: 'Worksheet', activity: 'Tick the children respecting others', cg: 'CG 4.7', page: '03' },
    { type: 'Worksheet', activity: 'Put same time objects together', cg: 'CG 7.1', page: '02' },
    { type: 'Worksheet', activity: 'Circle all the traced circles', cg: 'CG 8.1', page: '03' },
    { type: 'Worksheet', activity: 'Circle what comes next', cg: 'CG 8.2', page: '01' },
    { type: 'Worksheet', activity: 'Match the shape to object', cg: 'CG 8.8', page: '02' },
    { type: 'Worksheet', activity: 'Circle the heavy object', cg: 'CG 8.9', page: '02' },
    { type: 'Worksheet', activity: 'Tick the boy who is singing', cg: 'CG 9.1', page: '01' },
    { type: 'Worksheet', activity: 'Tick after doing each action', cg: 'CG 9.4', page: '02' },
    { type: 'Worksheet', activity: 'Trace the dotted lines', cg: 'CG 10.8', page: '04' },
    { type: 'Worksheet', activity: 'Make an artwork using any material', cg: 'CG 12.1', page: '03' },
    { type: 'Worksheet', activity: 'Tick the children who is working alone', cg: 'CG 12.4', page: '02' },
    { type: 'Worksheet', activity: 'Tick the child who has not completed the task', cg: 'CG 13.1', page: '01' },
    { type: 'Worksheet', activity: 'Circle what you want to explore', cg: 'CG 13.3', page: '01' },
    { type: 'Classroom', activity: 'Move Safely Game', cg: 'CG 1.5', page: '—' },
    { type: 'Classroom', activity: 'Touch and Tell Bag', cg: 'CG 2.5', page: '—' },
    { type: 'Classroom', activity: 'Carry and Walk Task', cg: 'CG 3.4', page: '—' },
    { type: 'Classroom', activity: 'Take Turn Game', cg: 'CG 4.4', page: '—' },
    { type: 'Classroom', activity: 'Which Tool for What?', cg: 'CG 7.3', page: '—' },
    { type: 'Classroom', activity: 'Count and Give', cg: 'CG 8.3', page: '—' }
  ];
  // weeklyAssessmentEntries[weekNum][studentName][activityIndexAsString] = 'E'|'P'|'A'
  // Same shape as monthlyAssessmentEntries/classroomObservationEntries
  // (student-first, key-second) and the same B/P/A scale (via the
  // existing TIER_INFO/assessmentTierCell/toggleAssessmentPopup/
  // setAssessmentTier below) — deliberately not a separate G/Y/R system,
  // so every assessment type in this app reads the same way.
  let selectedWeeklyActivityIdx = 0;
  // Direct set (no popup step) for the compact grading grid — tapping
  // the already-active letter again clears it back to unmarked, same
  // "tap again to clear" behavior Attendance's Present/Absent uses.
  function setWeeklyActivityQuickTier(name, tier){
    const store = getAssessmentStore();
    if(!store[name]) store[name] = {};
    const key = String(selectedWeeklyActivityIdx);
    if(store[name][key] === tier) delete store[name][key];
    else store[name][key] = tier;
    saveAssessmentStore();
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  // Wipes every recorded grade for the currently selected week, for
  // every child and every activity — a genuine fresh start, not just
  // clearing the one activity on screen. Confirmed first since this
  // can't be undone.
  function clearWeeklyAssessmentWeek(){
    if(!confirm('Clear every recorded grade for Week ' + currentWeekNum + '? This removes all activities for all children this week — it can\'t be undone.')) return;
    weeklyAssessmentEntries[currentWeekNum] = {};
    saveWeeklyAssessmentEntries();
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  // Serves all three types now — Weekly, Monthly, and Classroom
  // Observation share the same shape (studentName -> key -> tier) and
  // the same B/P/A scale; only the key means something different
  // (activity index for Weekly, domain key for the other two).
  function getAssessmentStore(){
    if(assessmentEntryType === 'weekly'){
      if(!weeklyAssessmentEntries[currentWeekNum]) weeklyAssessmentEntries[currentWeekNum] = {};
      return weeklyAssessmentEntries[currentWeekNum];
    }
    if(assessmentEntryType === 'observation') return classroomObservationEntries;
    return monthlyAssessmentEntries;
  }
  function saveAssessmentStore(){
    if(assessmentEntryType === 'weekly') saveWeeklyAssessmentEntries();
    else if(assessmentEntryType === 'observation') saveClassroomObservationEntries();
    else saveMonthlyAssessmentEntries();
  }
  // Wipes every recorded grade for whichever type is currently active
  // (Monthly Assessment or Classroom Observation) — every child, every
  // domain. For Monthly this only clears real recorded entries; the
  // representative sample cells shown for anything never actually
  // graded are re-seeded fresh on the next render, same as always.
  // Confirmed first since this can't be undone.
  // Once the teacher explicitly clears Monthly Assessment to start
  // fresh, sample-seeding stops permanently (until real data exists
  // again) — otherwise every render would immediately re-fill the
  // just-cleared grid with new random sample values, making "clear and
  // start fresh" look like it did nothing.
  let monthlyAssessmentSeedingDisabled = false;
  (function loadMonthlyAssessmentSeedingDisabled(){
    try { monthlyAssessmentSeedingDisabled = localStorage.getItem('monthlyAssessmentSeedingDisabled') === 'true'; }
    catch(e){ /* malformed or unavailable — default to seeding enabled */ }
  })();
  // Real pupil names for the Assessment section — same realPupilsCache
  // My Pupils / Class Attendance already fetch and share. Returns an
  // empty array if pupils haven't loaded yet; callers guard on that
  // via ensurePupilsLoadedFor() below rather than each checking this
  // return value themselves.
