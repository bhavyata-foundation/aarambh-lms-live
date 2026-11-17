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

  function renderWorkbookAssessmentSection(container){
    const level = workbookLevelFromClassName();

    const booksLoaded = ensureWorkbookCompetenciesLoaded(level, currentWorkbookMonth, () => renderMonthlyAssessment(monthlyAssessmentTargetEl));
    const tallyLoaded = ensureWorkbookCompetencyTallyLoaded(currentWorkbookMonth, () => renderMonthlyAssessment(monthlyAssessmentTargetEl));
    const booksKey = level + '|' + currentWorkbookMonth;
    if(typeof workbookCompetenciesCache[booksKey] === 'string' && workbookCompetenciesCache[booksKey].startsWith('error:')){
      renderRetryCard(container, workbookCompetenciesCache[booksKey].slice(6), () => { delete workbookCompetenciesCache[booksKey]; delete workbookCompetencyTallyCache[currentWorkbookMonth]; }); return;
    }
    if(typeof workbookCompetencyTallyCache[currentWorkbookMonth] === 'string' && workbookCompetencyTallyCache[currentWorkbookMonth].startsWith('error:')){
      renderRetryCard(container, workbookCompetencyTallyCache[currentWorkbookMonth].slice(6), () => { delete workbookCompetencyTallyCache[currentWorkbookMonth]; delete workbookCompetenciesCache[booksKey]; }); return;
    }
    if(!booksLoaded || !tallyLoaded){ container.appendChild(mdCard(null, 'Loading workbooks…', null)); return; }

    const books = workbookCompetenciesCache[booksKey];
    if(!books.length){
      container.appendChild(mdCard(null, 'No workbooks are set up for ' + esc(level) + ' yet.', null));
      return;
    }

    // --- Month picker — shares the same month concept as Classroom
    // Observation (currentWorkbookMonth), since this tally is recorded
    // per month, same as everything else in Assessment. ---
    const monthBar = document.createElement('div'); monthBar.className = 'fbar'; monthBar.style.marginBottom = '14px';
    monthBar.innerHTML = '<div class="ctl"><label>Month</label><select id="workbookCompMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    container.appendChild(monthBar);
    const monthSel = monthBar.querySelector('#workbookCompMonthSelect');
    WORKBOOK_MONTHS.forEach(m => {
      const opt = document.createElement('option'); opt.value = m; opt.textContent = m;
      if(m === currentWorkbookMonth) opt.selected = true;
      monthSel.appendChild(opt);
    });
    monthSel.onchange = () => { currentWorkbookMonth = monthSel.value; renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    // --- Term bar — Term 1 shows every "Part 1" workbook, Term 2 every
    // "Part 2" workbook. Filters the book picker below; doesn't touch
    // the month picker (a term spans several months). ---
    const termBar = document.createElement('div'); termBar.className = 'fbar'; termBar.style.marginBottom = '14px';
    termBar.innerHTML = '<div class="ctl"><label>Term</label><div style="display:flex; gap:5px;" id="workbookTermChips"></div></div>';
    container.appendChild(termBar);
    const termChipsWrap = termBar.querySelector('#workbookTermChips');
    ['Term 1', 'Term 2'].forEach(term => {
      const b = document.createElement('button');
      b.className = 'chip' + (term === currentWorkbookTerm ? ' sel' : '');
      b.textContent = term;
      b.onclick = () => { currentWorkbookTerm = term; renderMonthlyAssessment(monthlyAssessmentTargetEl); };
      termChipsWrap.appendChild(b);
    });

    // --- Book picker — filtered to the selected term, clean names only
    // (no page range/competency count clutter in the option text). ---
    const booksThisTerm = books.filter(b => bookBelongsToTerm(b.name, currentWorkbookTerm));
    if(!booksThisTerm.length){
      container.appendChild(mdCard(null, 'No workbooks for ' + currentWorkbookTerm + ' are set up for ' + esc(level) + ' yet.', null));
      return;
    }
    if(!currentWorkbookCompetencyBookName || !booksThisTerm.some(b => b.name === currentWorkbookCompetencyBookName)) currentWorkbookCompetencyBookName = booksThisTerm[0].name;
    const bookBar = document.createElement('div'); bookBar.className = 'fbar'; bookBar.style.marginBottom = '14px';
    bookBar.innerHTML = '<div class="ctl"><label>Workbook</label><select id="workbookCompBookSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    container.appendChild(bookBar);
    const bookSel = bookBar.querySelector('#workbookCompBookSelect');
    booksThisTerm.forEach(b => {
      const opt = document.createElement('option'); opt.value = b.name;
      opt.textContent = b.name;
      if(b.name === currentWorkbookCompetencyBookName) opt.selected = true;
      bookSel.appendChild(opt);
    });
    bookSel.onchange = () => { currentWorkbookCompetencyBookName = bookSel.value; renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    const selectedBook = booksThisTerm.find(b => b.name === currentWorkbookCompetencyBookName);
    const competencies = selectedBook.competencies;

    if(!competencies.length){
      container.appendChild(mdCard(null, 'No competency data has been entered for ' + esc(selectedBook.name) + ' yet.', null));
      return;
    }

    const tally = workbookCompetencyTallyCache[currentWorkbookMonth];

    // Group by Curricular Goal, matching the real handwritten record's grouping.
    const byGoal = [];
    competencies.forEach(c => {
      let group = byGoal.find(g => g.curricular_goal_id === c.curricular_goal_id);
      if(!group){ group = { curricular_goal_id: c.curricular_goal_id, goal_text: c.goal_text, items: [] }; byGoal.push(group); }
      group.items.push(c);
    });

    // ---- Import previous data (collapsed by default) ----
    const wbImportToggle = document.createElement('div');
    wbImportToggle.className = 'card'; wbImportToggle.style.cssText = 'padding:0; margin-bottom:14px; overflow:hidden;';
    wbImportToggle.innerHTML = `
      <div onclick="workbookImportOpen = !workbookImportOpen; this.nextElementSibling.classList.toggle('hidden', !workbookImportOpen); this.querySelector('.chevron').style.transform = workbookImportOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import ${esc(selectedBook.name)} tally from a file</h3>
          <p class="cap" style="margin:0;">.csv or .xlsx, one row per competency — tap to open and choose a file, or fill in the numbers by hand in the table below.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${workbookImportOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${workbookImportOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    container.appendChild(wbImportToggle);
    wbImportToggle.querySelector('div:last-child').appendChild(renderWorkbookTallyImportCard(selectedBook));

    if(myClassInfo.class_id){
      ensureWorkbookMonthSubmissionLoaded(myClassInfo.class_id, currentWorkbookMonth, () => renderMonthlyAssessment(monthlyAssessmentTargetEl));
    }
    const submissionStatus = workbookMonthSubmissionCache[currentWorkbookMonth];
    const isSubmitted = submissionStatus && typeof submissionStatus === 'object' && submissionStatus.submitted;

    container.appendChild(mdSec(esc(selectedBook.name) + ' — ' + currentWorkbookMonth, '<span class="reqs">ASM-WB1…WB4</span>'));
    const hpcNote = document.createElement('p');
    hpcNote.className = 'cap'; hpcNote.style.margin = '4px 0 14px';
    hpcNote.innerHTML = 'Class-wide tally, not per-child — for each competency, enter how many children this month came out Emerging, Proficient, or Advanced. Based on continuous observation across the month, not a one-off test.';
    container.appendChild(hpcNote);

    let table = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="table-layout:fixed; width:100%; min-width:760px;"><colgroup><col style="width:15%;"><col style="width:38%;"><col style="width:17%;"><col style="width:10%;"><col style="width:10%;"><col style="width:10%;"></colgroup><thead><tr><th>Curricular Goal</th><th>Competency</th><th>Pages</th><th style="text-align:center;">E</th><th style="text-align:center;">P</th><th style="text-align:center;">A</th></tr></thead><tbody>';
    byGoal.forEach(g => {
      g.items.forEach((c, idx) => {
        const t = (tally && tally[c.id]) || { count_e: 0, count_p: 0, count_a: 0 };
        const numInput = (field, val) => `<input type="number" min="0" value="${val}" style="width:48px; text-align:center; padding:4px; border:1px solid var(--border); border-radius:5px; font-size:13px;" onchange="const row=workbookCompetencyTallyCache['${currentWorkbookMonth}'][${c.id}]||{count_e:0,count_p:0,count_a:0}; row['${field}']=Math.max(0,parseInt(this.value,10)||0); this.value=row['${field}']; saveWorkbookCompetencyTally(${c.id},'${currentWorkbookMonth}',row.count_e,row.count_p,row.count_a);" />`;
        table += `<tr>${idx === 0 ? `<td rowspan="${g.items.length}" style="vertical-align:top; font-weight:600;">${esc(g.goal_text)}</td>` : ''}
          <td title="${esc(c.cg_code)}" style="white-space:normal; word-wrap:break-word; overflow-wrap:break-word; padding:8px 10px; text-align:left;">${esc(c.competency_text)}</td>
          <td class="dim" style="white-space:normal; word-wrap:break-word; overflow-wrap:break-word; font-size:12px;">${esc(c.page_numbers || '—')}</td>
          <td style="text-align:center;">${numInput('count_e', t.count_e)}</td>
          <td style="text-align:center;">${numInput('count_p', t.count_p)}</td>
          <td style="text-align:center;">${numInput('count_a', t.count_a)}</td>
        </tr>`;
      });
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Each number saves as soon as you change it — no separate Save step. These are class-wide counts for ' + currentWorkbookMonth + ', not tied to named children.', wrap));

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
      <p class="cap" style="margin:0 0 8px;">.csv or .xlsx — header row must be exactly: cg_code,count_e,count_p,count_a — cg_code must match one of ${esc(selectedBook.name)}'s competencies (shown as the small grey code under each competency), counts are whole numbers ≥ 0. Applies to ${esc(currentWorkbookMonth)} — the month currently selected above. One row per competency, not per child.</p>
      <input type="file" id="workbookTallyImportInput" accept=".csv,.xlsx" />
      <div id="workbookTallyImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importWorkbookTallyFile()">Import</button>
    `;
    return wrap;
  }

  async function importWorkbookTallyFile(){
    const input = document.getElementById('workbookTallyImportInput');
    const resultEl = document.getElementById('workbookTallyImportResult');
    if(!input.files.length){
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
    try { rows = await readAssessmentFileRows(input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }

    const header = rows[0].map(h => h.toLowerCase());
    if(header.join(',') !== 'cg_code,count_e,count_p,count_a'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: cg_code,count_e,count_p,count_a — got: ${esc(rows[0].join(','))}</div>`;
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
    observation: { label: 'Classroom Observation', icon: '👁️', reqs: 'ASM-O1…O3' },
    workbook: { label: 'Workbook Assessment', icon: '📘', reqs: 'ASM-WB1…WB4' },
    pretest: { label: 'Pre-Test', icon: '📋', reqs: 'ASM-PT1…3' },
    motor: { label: 'Fine & Gross Motor', icon: '🤸', reqs: 'ASM-M1…M2' }
  };
  // Weekly Assessment and Monthly Assessment were removed pending a
  // restructure — was previously a computed rollup (Weekly Review /
  // Monthly Review) over Workbook + Classroom Observation evidence.
  // WEEKLY_ASSESSMENT_ACTIVITIES and TIER_INFO below are NOT dead code —
  // Pre-Test still depends on both directly, since it shares the same
  // real 26-activity list.
  let assessmentEntryType = 'observation';
  function switchAssessmentEntryType(type){
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
  function assessmentPupilNames(){
    return Array.isArray(realPupilsCache) ? realPupilsCache.map(p => p.name) : [];
  }

  // Shared loading/error guard for any screen that needs real pupils
  // before it can render anything meaningful — fetches once, and
  // triggers reRenderFn again automatically once fetchMyPupils()
  // resolves (fetchMyPupils already knows to re-render Class
  // Attendance/My Pupils; this list is how it also learns about
  // whichever Assessment/Reports screen called this).
  const pupilsLoadedRerenderTargets = [];
  function ensurePupilsLoadedFor(container, reRenderFn){
    if(Array.isArray(realPupilsCache)) return true;
    if(realPupilsCache === null){
      if(!pupilsLoadedRerenderTargets.includes(reRenderFn)) pupilsLoadedRerenderTargets.push(reRenderFn);
      fetchMyPupils();
      container.innerHTML = '<p class="cap">Loading pupils…</p>';
    } else if(realPupilsCache === 'loading'){
      // A manual retry option alongside the spinner, not just after a
      // failure — with a fluctuating connection, a request can hang
      // well past the point a person is willing to wait. Retrying
      // doesn't cancel the original (the 12s timeout in fetchMyPupils
      // handles that); it just starts a fresh attempt and shows
      // whichever one resolves first.
      const wrap = document.createElement('div');
      wrap.innerHTML = '<p class="cap">Loading pupils…</p><button style="margin-top:6px; padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:12.5px;">Taking a while? Retry</button>';
      wrap.querySelector('button').onclick = () => { realPupilsCache = null; ensurePupilsLoadedFor(container, reRenderFn); };
      container.innerHTML = '';
      container.appendChild(wrap);
    } else if(typeof realPupilsCache === 'string' && realPupilsCache.startsWith('error:')){
      const wrap = document.createElement('div');
      wrap.innerHTML = `<p class="cap" style="color:var(--danger, #c8433f);">${esc(realPupilsCache.slice(6))}</p><button style="margin-top:6px; padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:12.5px;">Retry</button>`;
      wrap.querySelector('button').onclick = () => { realPupilsCache = null; ensurePupilsLoadedFor(container, reRenderFn); };
      container.innerHTML = '';
      container.appendChild(wrap);
    }
    return false;
  }

  function saveMonthlyAssessmentSeedingDisabled(){
    try { localStorage.setItem('monthlyAssessmentSeedingDisabled', String(monthlyAssessmentSeedingDisabled)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }

  function clearActiveAssessmentType(){
    const typeInfo = ASSESSMENT_TYPE_INFO[assessmentEntryType];
    if(!confirm('Clear every recorded grade for ' + typeInfo.label + '? This removes it for every child in every domain — it can\'t be undone.')) return;
    const store = getAssessmentStore();
    assessmentPupilNames().forEach(name => { store[name] = {}; });
    saveAssessmentStore();
    if(assessmentEntryType === 'monthly'){
      monthlyAssessmentSeedingDisabled = true;
      saveMonthlyAssessmentSeedingDisabled();
    }
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  // Fills any (child, domain) cell neither real data nor a previous seed
  // has touched with representative sample data — called by both Monthly
  // Assessment and the Assessment Dashboard so whichever loads first
  // doesn't matter. Never overwrites a real recorded value.
  function ensureMonthlyAssessmentSeeded(){
    // The skeleton object for each student must exist regardless of
    // whether value-seeding is disabled — "clear and start fresh"
    // means values stay genuinely blank, not that the per-student
    // object itself should be missing. Without this, anything reading
    // monthlyAssessmentEntries[name][domain] directly (Assessment
    // Dashboard's Overview, Child by domain table) throws on a name
    // that was never touched after a reset, instead of just showing a
    // real zero — this is exactly what was crashing that page silently.
    assessmentPupilNames().forEach(name => { if(!monthlyAssessmentEntries[name]) monthlyAssessmentEntries[name] = {}; });
    if(monthlyAssessmentSeedingDisabled) return; // explicitly cleared — stay genuinely blank until real data is entered
    assessmentPupilNames().forEach(name => {
      ASSESSMENT_DOMAINS.forEach(d => {
        if(monthlyAssessmentEntries[name][d.key] !== undefined) return; // already real or already seeded
        const recorded = sampleRand(name + d.key + 'rec') > 0.1; // ~90% of cells recorded, a few blank
        monthlyAssessmentEntries[name][d.key] = recorded ? samplePick(name + d.key + 'ma', ['E','P','A']) : null;
      });
    });
  }
  // Same seeding idea, generalized for whichever store is currently
  // active — Weekly and Classroom Observation start genuinely empty
  // (no fabricated history), so this only ever touches monthlyAssessmentEntries.
  function ensureActiveAssessmentSeeded(){
    if(assessmentEntryType === 'monthly') ensureMonthlyAssessmentSeeded();
    else {
      const store = getAssessmentStore();
      assessmentPupilNames().forEach(name => { if(!store[name]) store[name] = {}; });
    }
  }
  var monthlyAssessmentTargetEl = null; // remembers where to re-render (embedded tab vs standalone section)
  // Real activity-level Weekly Assessment — one row per activity (not
  // per domain), G/Y/R per student, with the same auto-calculated
  // columns the real worksheet has: per-activity Green/Yellow/Red
  // counts, class avg score (max 3), % Green, plus a per-student
  // summary block mirroring "C. PER-STUDENT SUMMARY" on the real sheet.
  function renderWeeklyAssessmentSection(container){
    const weekStore = weeklyAssessmentEntries[currentWeekNum] || {};
    assessmentPupilNames().forEach(name => { if(!weekStore[name]) weekStore[name] = {}; });

    // --- Class-wide stats ---
    let totalCells = 0, recordedCells = 0;
    const tot = { E: 0, P: 0, A: 0 };
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      assessmentPupilNames().forEach(name => {
        totalCells++;
        const v = weekStore[name][String(idx)];
        if(v){ recordedCells++; tot[v]++; }
      });
    });
    const completeness = totalCells ? Math.round(recordedCells / totalCells * 100) : 0;
    const avgScore = recordedCells ? Math.round((tot.A*3 + tot.P*2 + tot.E*1) / recordedCells * 100) / 100 : 0;
    const pctAdvanced = recordedCells ? Math.round(tot.A / recordedCells * 100) : 0;

    container.appendChild(mdSec('Weekly Assessment — Week ' + currentWeekNum, '<span class="reqs">ASM-W1…W4</span>'));
    container.appendChild(mdGrid('g4', [
      mdTile('Activities', WEEKLY_ASSESSMENT_ACTIVITIES.length, '20 worksheet + 6 classroom', mdPill('Due Saturday', 'info'), 'ASM-W1'),
      mdTile('Recording complete', completeness, '% of cells', mdPill(mdStatusBand(completeness, 90, 70).l, mdStatusBand(completeness, 90, 70).c), 'ASM-W2', mdMeter(completeness)),
      mdTile('Class avg score', avgScore, 'of 3', mdPill(mdStatusBand(avgScore/3*100).l, mdStatusBand(avgScore/3*100).c), 'ASM-W3', mdMeter(avgScore/3*100)),
      mdTile('% Advanced', pctAdvanced, 'achieved', mdPill(mdStatusBand(pctAdvanced).l, mdStatusBand(pctAdvanced).c), 'ASM-W4', mdMeter(pctAdvanced))
    ]));

    // --- Add data: pick ONE activity, grade every child as a row.
    // Deliberately not a 26-activity × 40-child grid — at real class
    // sizes that grid becomes unusable (40+ tiny tappable columns).
    // Grading one activity at a time, with children as a scrollable
    // list, is the same shape Attendance already uses at this class
    // size and works the same way here regardless of roll count. ---
    container.appendChild(mdSec('Add data — Weekly Assessment', '<span class="reqs">' + 'ASM-W1…W4' + '</span>'));
    const totalGradedThisWeek = assessmentPupilNames().filter(n => Object.keys(weekStore[n]).length > 0).length;
    if(totalGradedThisWeek > 0){
      const resetRow = document.createElement('div'); resetRow.style.cssText = 'margin:4px 0 14px;';
      const resetBtn = document.createElement('button');
      resetBtn.textContent = '↺ Enter manually — clear all and start fresh';
      resetBtn.style.cssText = 'padding:7px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:12.5px; font-weight:600;';
      resetBtn.onclick = clearWeeklyAssessmentWeek;
      resetRow.appendChild(resetBtn);
      container.appendChild(resetRow);
    }
    const pickerBar = document.createElement('div'); pickerBar.className = 'fbar'; pickerBar.style.marginBottom = '16px';
    pickerBar.innerHTML = '<div class="ctl" style="flex:1; min-width:280px;"><label>Activity</label><select id="weeklyActivitySelect" style="width:100%; padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    container.appendChild(pickerBar);
    const actSel = pickerBar.querySelector('#weeklyActivitySelect');
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const opt = document.createElement('option'); opt.value = idx;
      opt.textContent = (idx + 1) + '. [' + a.type + '] ' + a.activity + ' — ' + a.cg;
      if(idx === selectedWeeklyActivityIdx) opt.selected = true;
      actSel.appendChild(opt);
    });
    actSel.onchange = () => { selectedWeeklyActivityIdx = parseInt(actSel.value, 10); renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    const activeActivity = WEEKLY_ASSESSMENT_ACTIVITIES[selectedWeeklyActivityIdx];
    const actMeta = document.createElement('p');
    actMeta.className = 'cap'; actMeta.style.margin = '0 0 14px';
    actMeta.textContent = activeActivity.type + ' · ' + activeActivity.cg + ' · Page ' + activeActivity.page;
    container.appendChild(actMeta);

    // Compact grid, not one full-width row per child — direct B/P/A
    // buttons (no tap-to-open-popup step) fit far more children per
    // screen, the same trade Attendance's Present/Absent redesign made.
    // At minmax(200px,1fr) this fits 4-6 children per row on desktop
    // and keeps working, just narrower, at 40 on the roll.
    const gradeGrid = document.createElement('div');
    gradeGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:8px; margin-bottom:16px;';
    const tierColors = { E: 'var(--danger,#c8433f)', P: '#EE8F35', A: 'var(--success)' };
    gradeGrid.innerHTML = assessmentPupilNames().map(name => {
      const tier = weekStore[name][String(selectedWeeklyActivityIdx)];
      const btns = ['E','P','A'].map(t => {
        const active = tier === t;
        const letter = TIER_INFO[t].letter;
        return `<button onclick="setWeeklyActivityQuickTier('${esc(name)}','${t}')" title="${TIER_INFO[t].n}" style="flex:1; padding:6px 0; border-radius:5px; border:${active ? 'none' : '1px solid var(--border)'}; background:${active ? tierColors[t] : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:11px; font-weight:700; cursor:pointer;">${letter}</button>`;
      }).join('');
      return `<div style="border:1px solid var(--border); border-radius:8px; padding:8px; background:var(--card);">
        <div style="font-weight:600; font-size:12px; margin-bottom:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(name)}">${esc(name)}</div>
        <div style="display:flex; gap:4px;">${btns}</div>
        <div style="font-size:10px; margin-top:5px; color:var(--success); font-weight:600; visibility:${tier ? 'visible' : 'hidden'};">✓ Saved</div>
      </div>`;
    }).join('');
    container.appendChild(mdCard(null, 'Tapping a rating saves it immediately — the "✓ Saved" mark under each name confirms it. This grid stays compact whether the class has 6 children or 40.', gradeGrid));

    container.appendChild(renderWeeklyImportCard());

    // --- Download report — Section 2: a standalone .pdf of this
    // week's data, separate from the entry section above. Only shown
    // once something has actually been recorded — an empty report
    // helps nobody. ---
    container.appendChild(mdSec('Download report — Week ' + currentWeekNum, '<span class="reqs">' + 'ASM-W1…W4' + '</span>'));
    if(totalGradedThisWeek > 0){
      const dlWrap = document.createElement('div'); dlWrap.style.cssText = 'margin-top:22px; margin-bottom:16px;';
      const dlBtn = document.createElement('button');
      dlBtn.className = 'btn-primary'; dlBtn.style.cssText = 'width:auto; padding:9px 16px;';
      dlBtn.textContent = '⬇ Download Week ' + currentWeekNum + ' report (PDF)';
      dlBtn.onclick = downloadWeeklyAssessmentPdf;
      dlWrap.appendChild(dlBtn);
      container.appendChild(dlWrap);
    } else {
      container.appendChild(mdCard(null, 'Nothing recorded for Week ' + currentWeekNum + ' yet — grade at least one activity above to enable the report.', null));
    }

    // --- Per-activity summary — aggregate counts only, no per-student
    // columns, so this table's width never depends on roll size. ---
    container.appendChild(mdSec('Every activity, at a glance', '<span class="reqs">ASM-W1…W4</span>'));
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>#</th><th>Type</th><th>Activity</th><th>CG</th><th>Page</th><th>Marked</th><th>B</th><th>P</th><th>A</th><th>Avg</th><th>% Advanced</th></tr></thead><tbody>';
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const rowTiers = assessmentPupilNames().map(name => weekStore[name][String(idx)] || null);
      const e = rowTiers.filter(t => t === 'E').length;
      const p = rowTiers.filter(t => t === 'P').length;
      const ac = rowTiers.filter(t => t === 'A').length;
      const marked = e + p + ac;
      const rowAvg = marked ? Math.round((ac*3 + p*2 + e*1) / marked * 100) / 100 : 0;
      const rowPctA = marked ? Math.round(ac / marked * 100) : 0;
      const isActive = idx === selectedWeeklyActivityIdx;
      table += `<tr style="cursor:pointer; ${isActive ? 'background:var(--bg);' : ''}" onclick="selectedWeeklyActivityIdx=${idx}; renderMonthlyAssessment(monthlyAssessmentTargetEl);">
        <td class="dim">${idx + 1}</td><td class="dim">${esc(a.type)}</td><td><b>${esc(a.activity)}</b></td><td class="dim">${esc(a.cg)}</td><td class="dim">${esc(a.page)}</td>
        <td>${marked}/${assessmentPupilNames().length}</td><td>${e}</td><td>${p}</td><td>${ac}</td><td>${rowAvg}</td><td>${marked ? rowPctA + '%' : '—'}</td>
      </tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Tap a row to grade that activity above.', wrap));

    // --- Per-student summary (matches the real sheet's "C. PER-STUDENT SUMMARY") ---
    container.appendChild(mdSec('Per-student summary', '<span class="reqs">ASM-W5</span>'));
    let sTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th><th>Activities assessed</th><th>B</th><th>P</th><th>A</th><th>Total score</th><th>Max possible</th><th>% Achievement</th><th>Band</th></tr></thead><tbody>';
    assessmentPupilNames().forEach(name => {
      let se = 0, sp = 0, sa = 0, assessed = 0;
      WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
        const v = weekStore[name][String(idx)];
        if(v === 'E') se++; else if(v === 'P') sp++; else if(v === 'A') sa++;
        if(v) assessed++;
      });
      const totalScore = sa*3 + sp*2 + se*1;
      const maxPossible = assessed * 3;
      const pctAchievement = maxPossible ? Math.round(totalScore / maxPossible * 100) : 0;
      const band = !assessed ? mdPill('Not started', 'neu') : pctAchievement >= 85 ? mdPill('Advanced', 'good') : pctAchievement >= 60 ? mdPill('Proficient', 'warn') : mdPill('Beginner', 'crit');
      sTable += `<tr style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(name)}')"><td><b>${esc(name)}</b></td><td>${assessed}/${WEEKLY_ASSESSMENT_ACTIVITIES.length}</td><td>${se}</td><td>${sp}</td><td>${sa}</td><td>${totalScore}</td><td>${maxPossible}</td><td>${assessed ? pctAchievement + '%' : '—'}</td><td>${band}</td></tr>`;
    });
    sTable += '</tbody></table></div>';
    const sWrap = document.createElement('div'); sWrap.innerHTML = sTable;
    container.appendChild(mdCard(null, 'Auto-calculated from the activities above — never entered separately, so it can\'t drift out of sync with them.', sWrap));
  }

  // Import specific to Weekly Assessment's real shape: rows reference
  // an activity number (1-26, matching the order above) rather than a
  // domain key — tier is B/P/A, same scale as Monthly and Classroom
  // Observation.
  function renderWeeklyImportCard(){
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.marginTop = '4px';
    wrap.innerHTML = `
      <div class="hd"><div><h3>Import Weekly Assessment from a file</h3><p class="cap">.csv or .xlsx — header row must be exactly: child_name,activity_no,tier — activity_no is 1-${WEEKLY_ASSESSMENT_ACTIVITIES.length} (matching the activity list above, in order), tier is B/P/A. Built for large rolls: one row per child per activity, so a 40-child class is 40 rows, not 40 columns.</p></div></div>
      <input type="file" id="weeklyImportInput" accept=".csv,.xlsx" style="margin-top:8px;" />
      <div id="weeklyImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importWeeklyAssessmentFile()">Import</button>
    `;
    return wrap;
  }

  async function importWeeklyAssessmentFile(){
    const input = document.getElementById('weeklyImportInput');
    const resultEl = document.getElementById('weeklyImportResult');
    if(!input.files.length){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';
    let rows;
    try {
      rows = await readAssessmentFileRows(input.files[0]);
    } catch(err){
      resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`;
      return;
    }
    if(!rows.length){
      resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>';
      return;
    }
    const header = rows[0].map(h => h.toLowerCase());
    if(header.join(',') !== 'child_name,activity_no,tier'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: child_name,activity_no,tier — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }
    if(!weeklyAssessmentEntries[currentWeekNum]) weeklyAssessmentEntries[currentWeekNum] = {};
    const weekStore = weeklyAssessmentEntries[currentWeekNum];
    let imported = 0;
    const skipped = [];
    for(let i = 1; i < rows.length; i++){
      const parts = rows[i];
      const rowNum = i + 1;
      if(parts.length !== 3){ skipped.push(`Row ${rowNum}: expected 3 columns, got ${parts.length}`); continue; }
      const [childName, activityNoRaw, tierRaw] = parts;
      const activityIdx = parseInt(activityNoRaw, 10) - 1;
      let tier = tierRaw.toUpperCase();
      if(tier === 'B') tier = 'E'; // accept the displayed letter (Beginner) as well as the internal code
      if(!assessmentPupilNames().includes(childName)){ skipped.push(`Row ${rowNum}: "${childName}" is not a child in this class`); continue; }
      if(isNaN(activityIdx) || activityIdx < 0 || activityIdx >= WEEKLY_ASSESSMENT_ACTIVITIES.length){ skipped.push(`Row ${rowNum}: "${activityNoRaw}" must be 1-${WEEKLY_ASSESSMENT_ACTIVITIES.length}`); continue; }
      if(!['E','P','A'].includes(tier)){ skipped.push(`Row ${rowNum}: "${tierRaw}" must be B, P, or A`); continue; }
      if(!weekStore[childName]) weekStore[childName] = {};
      weekStore[childName][String(activityIdx)] = tier;
      imported++;
    }
    if(imported > 0) saveWeeklyAssessmentEntries();
    let html = `<div class="au-success">✓ Filled in ${imported} cell${imported === 1 ? '' : 's'} — saved.</div>`;
    if(skipped.length > 0){
      html += `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<ul style="margin:4px 0 0 18px;">${skipped.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`;
    }
    resultEl.innerHTML = html;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  // Shared header line for every assessment PDF — reads the teacher's
  // name from the topbar DOM element (not hardcoded) and the real
  // class_name from myClassInfo, so these reports pick up the actual
  // logged-in teacher and class once GAP-topbar-name is fixed, rather
  // than baking in a placeholder the way the old TLM PDF export did.
  function assessmentPdfHeaderLine(){
    const nameEl = document.querySelector('.user-name');
    const teacherName = (nameEl && nameEl.textContent.trim()) || 'Teacher';
    return teacherName + ' — ' + myClassInfo.class_name;
  }

  // Section 2 of every assessment tab: a real .pdf of that assessment
  // window's data, generated client-side via jsPDF + autoTable (same
  // library already used for the TLM & Resources report). Weekly gets
  // its own export (activity-level, not domain-level) since its data
  // shape is genuinely different from Monthly/Observation.
  function downloadWeeklyAssessmentPdf(){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const weekStore = weeklyAssessmentEntries[currentWeekNum] || {};
    const weekTheme = (WEEKS.find(w => w.w === currentWeekNum) || {}).theme || '';
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Weekly Assessment — Week ' + currentWeekNum + (weekTheme ? ' · ' + weekTheme : ''), 14, 15);
    doc.setFontSize(9);
    doc.text(assessmentPdfHeaderLine() + ' · generated ' + new Date().toLocaleDateString(), 14, 21);

    doc.autoTable({
      startY: 26,
      head: [['#', 'Type', 'Activity', 'CG', 'Page', 'Marked', 'B', 'P', 'A', 'Avg', '% Advanced']],
      body: WEEKLY_ASSESSMENT_ACTIVITIES.map((a, idx) => {
        const rowTiers = assessmentPupilNames().map(name => (weekStore[name] && weekStore[name][String(idx)]) || null);
        const e = rowTiers.filter(t => t === 'E').length;
        const p = rowTiers.filter(t => t === 'P').length;
        const ac = rowTiers.filter(t => t === 'A').length;
        const marked = e + p + ac;
        const rowAvg = marked ? Math.round((ac*3 + p*2 + e*1) / marked * 100) / 100 : 0;
        const rowPctA = marked ? Math.round(ac / marked * 100) : 0;
        return [idx + 1, a.type, a.activity, a.cg, a.page, marked + '/' + assessmentPupilNames().length, e, p, ac, rowAvg, marked ? rowPctA + '%' : '—'];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });

    const secondTableY = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : 26) + 10;
    doc.setFontSize(12);
    doc.text('Per-student summary', 14, secondTableY);
    doc.autoTable({
      startY: secondTableY + 4,
      head: [['Child', 'Activities assessed', 'B', 'P', 'A', 'Total score', 'Max possible', '% Achievement', 'Band']],
      body: assessmentPupilNames().map(name => {
        let se = 0, sp = 0, sa = 0, assessed = 0;
        WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
          const v = weekStore[name] && weekStore[name][String(idx)];
          if(v === 'E') se++; else if(v === 'P') sp++; else if(v === 'A') sa++;
          if(v) assessed++;
        });
        const totalScore = sa*3 + sp*2 + se*1;
        const maxPossible = assessed * 3;
        const pctAchievement = maxPossible ? Math.round(totalScore / maxPossible * 100) : 0;
        const band = !assessed ? 'Not started' : pctAchievement >= 85 ? 'Advanced' : pctAchievement >= 60 ? 'Proficient' : 'Beginner';
        return [name, assessed + '/' + WEEKLY_ASSESSMENT_ACTIVITIES.length, se, sp, sa, totalScore, maxPossible, assessed ? pctAchievement + '%' : '—', band];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });

    doc.save('weekly-assessment-week' + currentWeekNum + '-' + todayKey() + '.pdf');
  }

  // ---------------------------------------------------------------
  // PRE-TEST — moved here from Reports > Assessment Dashboard > Child
  // Record, where it was mixed in with read-only analysis. Same real
  // 26-activity list as Weekly Assessment, but graded once per child
  // (baseline) rather than every week — so it reuses Weekly's exact
  // "pick one activity, grade every child as a row" pattern, just
  // without week-scoping. preTestAssessmentEntries/setPreTestTier
  // already existed for the old per-child form; this adds the
  // class-wide entry point on top of the same data.
  //
  // UPDATED: switched from per-child grading to a class-wide tally
  // (count of how many children scored E/P/A per activity), same
  // model as Workbook Assessment — entered directly as number boxes
  // in the CG-grouped table below, no separate per-child grid anymore.
  // preTestAssessmentEntries (per-child) still exists and still feeds
  // Child Record and the CSV import, but nothing on THIS screen writes
  // to it anymore — a deliberate, known tradeoff, not an oversight.
  // ---------------------------------------------------------------
  let preTestTypeFilter = 'Worksheet'; // 'Worksheet' | 'Classroom' — the two real activity types in WEEKLY_ASSESSMENT_ACTIVITIES, kept as two separate tables rather than merged

  // Kept per CLASS (storage key includes the class id), so two class
  // logins used on the same browser never see each other's counts.
  const preTestTallyEntries = {}; // activityIdx (string) -> {count_e, count_p, count_a}
  var preTestTallyLoadedFor = null;
  function ensurePreTestTallyForClass(){
    const cid = myClassInfo && myClassInfo.class_id;
    if(!cid || preTestTallyLoadedFor === cid) return;
    Object.keys(preTestTallyEntries).forEach(k => delete preTestTallyEntries[k]);
    try {
      const raw = localStorage.getItem('preTestTallyEntries:' + cid);
      if(raw) Object.assign(preTestTallyEntries, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
    preTestTallyLoadedFor = cid;
  }
  function savePreTestTallyEntries(){
    ensurePreTestTallyForClass();
    if(!myClassInfo || !myClassInfo.class_id) return;
    try { localStorage.setItem('preTestTallyEntries:' + myClassInfo.class_id, JSON.stringify(preTestTallyEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory only */ }
  }
  function setPreTestTallyCount(activityIdx, field, value){
    ensurePreTestTallyForClass();
    const key = String(activityIdx);
    if(!preTestTallyEntries[key]) preTestTallyEntries[key] = { count_e: 0, count_p: 0, count_a: 0 };
    preTestTallyEntries[key][field] = Math.max(0, parseInt(value, 10) || 0);
    savePreTestTallyEntries();
  }
