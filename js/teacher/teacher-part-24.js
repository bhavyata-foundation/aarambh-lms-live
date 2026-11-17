function renderAssessmentDashboard(){
    if(assessmentDashboardTab === 'records') assessmentDashboardTab = 'overview'; // records now live in Assessment → ▤ Assessment records
    const container = document.getElementById('assessmentdashboard-body');
    container.innerHTML = '';
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex; gap:8px; margin:14px 0; overflow-x:auto; flex-wrap:wrap;';
    const tabStyle = (active) => `padding:8px 16px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:${active ? '600' : '400'}; white-space:nowrap;`;
    tabBar.innerHTML = `
      <button style="${tabStyle(assessmentDashboardTab === 'overview')}" onclick="switchAssessmentDashboardTab('overview')">◆ Overview</button>
      <button style="${tabStyle(assessmentDashboardTab === 'childrecord')}" onclick="switchAssessmentDashboardTab('childrecord')">◍ Child Record</button>
      <button style="${tabStyle(assessmentDashboardTab === 'transition')}" onclick="switchAssessmentDashboardTab('transition')">△ Transition</button>
    `;
    container.appendChild(tabBar);
    // Child Record keeps its own dedicated div (childrecord-body) — other
    // screens (Transition's roster, this dashboard's own tables, etc.)
    // jump straight to a specific child via switchSidebarSection
    // ('childrecord', name), and that path keeps working unchanged.
    // This tab just shows/hides that same div instead of duplicating
    // renderChildRecord's logic.
    document.getElementById('childrecord-body').classList.toggle('hidden', assessmentDashboardTab !== 'childrecord');
    if(assessmentDashboardTab === 'overview'){
      renderAssessmentDashboardOverview(container);
    } else if(assessmentDashboardTab === 'records'){
      renderAssessmentRecords(container);
    } else if(assessmentDashboardTab === 'childrecord'){
      renderChildRecord();
    } else if(assessmentDashboardTab === 'transition'){
      // Same renderTransition() used for the standalone section —
      // rendered into a fresh div under this tab bar instead of its
      // own sidebar destination.
      const transitionWrap = document.createElement('div');
      container.appendChild(transitionWrap);
      renderTransition(transitionWrap);
    }
  }
/* ===== teacher-part-12.js ===== */
/* =========================================================================
   teacher-part-12.js — part 12 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */
  function downloadAssessmentDashboardOverviewPdf(){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const stats = computeAssessmentDashboardStats();
    const monthName = new Date().toLocaleDateString([], {month:'long', year:'numeric'});
    const nameEl = document.querySelector('.user-name');
    const teacherLabel = ((nameEl && nameEl.textContent.trim()) || 'Teacher') + ' — ' + myClassInfo.class_name;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Assessment Dashboard — ' + monthName, 14, 15);
    doc.setFontSize(9);
    doc.text(teacherLabel + ' · generated ' + new Date().toLocaleDateString(), 14, 21);
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(
      `Class DSI ${stats.recordedCount ? stats.classDSI : '—'} of 200 · At Proficient or above (SRI) ${stats.recordedCount ? stats.sriPct + '%' : '—'} · Recording complete ${stats.completeness}% · Advanced ${stats.recordedCount ? stats.advancedPct + '%' : '—'} · E→P conversion ${stats.epConversion}% · P→A conversion ${stats.paConversion}% · Feedback notes shared ${stats.notesSharedCount} of ${assessmentPupilNames().length}.`,
      265
    );
    doc.text(summaryLines, 14, 30);
    let y = 30 + summaryLines.length * 5 + 6;
    doc.setFontSize(11);
    if(stats.flaggedDomains.length){
      doc.text('Domains below benchmark', 14, y);
      doc.autoTable({
        startY: y + 4,
        head: [['Domain', 'DSI (of 200)']],
        body: stats.flaggedDomains.map(x => [x.d.full, x.dsi]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [200, 60, 60] }
      });
      y = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.text('No domains below benchmark this month.', 14, y);
      y += 10;
    }
    doc.setFontSize(11);
    doc.text('Domain-by-domain', 14, y);
    doc.autoTable({
      startY: y + 4,
      head: [['Domain', 'Recorded', 'DSI (of 200)', 'SRI %', 'Beginner', 'Proficient', 'Advanced']],
      body: stats.domainStats.map(x => [x.d.full, x.n + '/' + assessmentPupilNames().length, x.n ? x.dsi : '—', x.n ? x.sri + '%' : '—', x.tot.E, x.tot.P, x.tot.A]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });
    // Own page — one row per child across all ten domains is wide
    // enough to want the full page to itself.
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Child by domain — ' + monthName, 14, 15);
    doc.autoTable({
      startY: 22,
      head: [['Child', ...ASSESSMENT_DOMAINS.map(d => d.label), 'DSI', 'SRI %', 'Progress band']],
      body: stats.childRows.map(c => [
        c.name,
        ...c.cells.map(cell => cell.tier || '·'),
        c.n ? c.dsi : '—',
        c.n ? c.sri + '%' : '—',
        c.progress || 'No data'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });
    doc.save('assessment-dashboard-' + monthName.replace(/\s+/g, '-').toLowerCase() + '-' + todayKey() + '.pdf');
  }
  let dashboardTrendFromMonth = null;
  let dashboardTrendToMonth = null;
  const workbookTallyTrendCache = {}; // 'fromMonth|toMonth' -> null|'loading'|'error:...'|[competency rows]
  function ensureWorkbookTallyTrendLoaded(fromMonth, toMonth, reRenderFn){
    const key = fromMonth + '|' + toMonth;
    if(Array.isArray(workbookTallyTrendCache[key])) return true;
    if(workbookTallyTrendCache[key] === 'loading') return false;
    if(typeof workbookTallyTrendCache[key] === 'string' && workbookTallyTrendCache[key].startsWith('error:')) return true;
    workbookTallyTrendCache[key] = 'loading';
    fetch('backend/assessment/workbook/get_workbook_tally_trend.php?' + new URLSearchParams({ from_month: fromMonth, to_month: toMonth }) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(res => res.json())
      .then(data => {
        workbookTallyTrendCache[key] = data.status === 'success' ? data.competencies : 'error:' + (data.message || 'Could not load trend data.');
        reRenderFn();
      })
      .catch(err => {
        // show the real reason (and log it) instead of a silent 'Could not reach the server'
        console.error('Workbook trend could not be drawn:', err);
        workbookTallyTrendCache[key] = 'error:' + ((err && err.message) ? err.message : 'Could not reach the server.');
        reRenderFn();
      });
    return false;
  }
  function renderAssessmentDashboardOverview(container){
    renderAssessmentOverviewReal(container); // part 14 — real saved marks only
    if(typeof window.renderAdmissionMap === 'function') window.renderAdmissionMap(container); // admission ↔ assessment map
  }
  // Placeholder — "Open feedback notes" needs a real parent-facing
  // notes feature (see Family & Parents) that doesn't exist yet.
  // Left as an inert stub rather than a broken link, same pattern as
  // other not-yet-wired actions in this app.
  function openFeedbackNotesStub(){}
  // ---------------------------------------------------------
  // IMPORT ASSESSMENT — client-side only, on purpose. Unlike
  // Materials, there is no real periodic_ratings-style database table
  // wired up for Monthly Assessment yet — monthlyAssessmentEntries is
  // pure in-memory state that resets on reload, same as it's always
  // been. This import fills that same in-memory object faster than
  // tapping every cell by hand; it does NOT persist anywhere, and
  // says so plainly rather than implying otherwise.
  //
  // Expected format — exactly 3 columns, header row required:
  //   child_name,domain,tier
  //   Aarav Sharma,heal,E
  //   Aarav Sharma,phys,P
  // domain must be one of: heal, phys, sens, envi, emot, part, logi, math, lang, arts
  // tier must be one of: E, P, A
  // ---------------------------------------------------------
  // ---------------------------------------------------------
  // IMPORT ASSESSMENT — bulk version of tapping every B/P/A cell by
  // hand, same idea as Import materials. Accepts .csv or a real .xlsx
  // (read client-side via SheetJS, loaded from cdnjs — this app has no
  // backend table for assessment yet, so unlike Materials this can't
  // go through a PHP/ZipArchive endpoint; it fills monthlyAssessmentEntries
  // directly, then saveMonthlyAssessmentEntries() persists it to
  // localStorage same as typing it in by hand would).
  //
  // Expected format — exactly 3 columns, header row required:
  //   child_name,domain,tier
  //   Aarav Sharma,heal,E
  //   Aarav Sharma,phys,P
  // domain must be one of: heal, phys, sens, envi, emot, part, logi, math, lang, arts
  // tier must be one of: E, P, A
  // ---------------------------------------------------------
  function renderAssessmentImportCard(afterImport){
    const typeLabel = ASSESSMENT_TYPE_INFO[afterImport] ? ASSESSMENT_TYPE_INFO[afterImport].label : 'assessment';
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.marginTop = '16px';
    wrap.innerHTML = `
      <div class="hd"><div><h3>Import ${esc(typeLabel)} from a file</h3><p class="cap">.csv or .xlsx — header row must be exactly: child_name,domain,tier — domain is one of heal/phys/sens/envi/emot/part/logi/math/lang/arts, tier is B, P or A.</p></div></div>
      <input type="file" id="assessmentImportInput" accept=".csv,.xlsx" style="margin-top:8px;" />
      <div id="assessmentImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importAssessmentFile('${afterImport}')">Import</button>
    `;
    return wrap;
  }
  // Reads a File into an array of string rows (each row an array of
  // string cells) regardless of whether it's .csv or .xlsx, so the
  // validation/import logic below only has to be written once.
  async function readAssessmentFileRows(file){
    // Rows corrected in the smart import preview (part 14) come in here
    // instead of a file, then go through the importer's normal checks.
    if(typeof smartAssessHandoffRows !== 'undefined' && smartAssessHandoffRows){ const r = smartAssessHandoffRows; smartAssessHandoffRows = null; return r; }
    if(/\.xlsx$/i.test(file.name)){
      if(typeof XLSX === 'undefined'){
        throw new Error('.xlsx support did not load (no internet reached the CDN) — try a .csv file instead.');
      }
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })
        .map(row => row.map(cell => String(cell).trim()))
        .filter(row => row.some(cell => cell !== ''));
    }
    const text = await file.text();
    return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => l.split(',').map(c => c.trim()));
  }
  async function importAssessmentFile(afterImport){
    const input = document.getElementById('assessmentImportInput');
    const resultEl = document.getElementById('assessmentImportResult');
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
    if(header.join(',') !== 'child_name,domain,tier'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: child_name,domain,tier — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }
    // Resolves from the explicit afterImport argument, not the global
    // assessmentEntryType — Dashboard's own import always targets
    // monthly regardless of whichever tab was last open elsewhere.
    let targetStore, targetSave;
    if(afterImport === 'weekly'){
      if(!weeklyAssessmentEntries[currentWeekNum]) weeklyAssessmentEntries[currentWeekNum] = {};
      targetStore = weeklyAssessmentEntries[currentWeekNum];
      targetSave = saveWeeklyAssessmentEntries;
    } else if(afterImport === 'observation'){
      targetStore = classroomObservationEntries;
      targetSave = saveClassroomObservationEntries;
    } else {
      targetStore = monthlyAssessmentEntries; // 'monthly' or 'dashboard'
      targetSave = saveMonthlyAssessmentEntries;
    }
    const validDomains = ASSESSMENT_DOMAINS.map(d => d.key);
    let imported = 0;
    const skipped = [];
    for(let i = 1; i < rows.length; i++){
      const parts = rows[i];
      const rowNum = i + 1;
      if(parts.length !== 3){ skipped.push(`Row ${rowNum}: expected 3 columns, got ${parts.length}`); continue; }
      const [childName, domain, tierRaw] = parts;
      let tier = tierRaw.toUpperCase();
      if(tier === 'B') tier = 'E'; // accept the displayed letter (Beginner) as well as the internal code
      if(!assessmentPupilNames().includes(childName)){ skipped.push(`Row ${rowNum}: "${childName}" is not a child in this class`); continue; }
      if(!validDomains.includes(domain.toLowerCase())){ skipped.push(`Row ${rowNum}: "${domain}" is not a recognised domain`); continue; }
      if(!['E','P','A'].includes(tier)){ skipped.push(`Row ${rowNum}: "${tierRaw}" must be B, P, or A`); continue; }
      if(!targetStore[childName]) targetStore[childName] = {};
      targetStore[childName][domain.toLowerCase()] = tier;
      imported++;
    }
    if(imported > 0) targetSave();
    let html = `<div class="au-success">✓ Filled in ${imported} cell${imported === 1 ? '' : 's'} — saved.</div>`;
    if(skipped.length > 0){
      html += `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<ul style="margin:4px 0 0 18px;">${skipped.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`;
    }
    resultEl.innerHTML = html;
    if(afterImport === 'dashboard') renderAssessmentDashboard();
    else renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  // ---------- 10. CHILD RECORD ----------
  // Matches vStudent: a child picker, DSI/SRI/movement/attendance/
  // stuck-domain tiles, and a domain-by-domain table with an
  // observation note per domain.
  // childFeedbackEntries[studentName] = [{text, date}, ...] — newest first
  const childFeedbackEntries = {};
  (function loadChildFeedbackEntries(){
    try {
      const raw = localStorage.getItem('childFeedbackEntries');
      if(raw) Object.assign(childFeedbackEntries, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
  })();
  function saveChildFeedbackEntries(){
    try { localStorage.setItem('childFeedbackEntries', JSON.stringify(childFeedbackEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }
  function addChildFeedback(name){
    const input = document.getElementById('childFeedbackInput');
    const text = (input.value || '').trim();
    if(!text){ input.focus(); return; }
    if(!childFeedbackEntries[name]) childFeedbackEntries[name] = [];
    childFeedbackEntries[name].unshift({ text, date: todayDateKey() });
    saveChildFeedbackEntries();
    renderChildRecord(name);
  }
  function deleteChildFeedback(name, idx){
    if(!confirm('Delete this feedback note? This can\'t be undone.')) return;
    childFeedbackEntries[name].splice(idx, 1);
    saveChildFeedbackEntries();
    renderChildRecord(name);
  }
  function renderChildFeedbackSection(container, name){
    const entries = childFeedbackEntries[name] || [];
    container.appendChild(mdSec('Teacher\u2019s Feedback', '<span class="reqs">FDB-01</span>'));
    const formCard = document.createElement('div');
    formCard.className = 'card'; formCard.style.padding = '16px'; formCard.style.marginBottom = '14px';
    formCard.innerHTML = `<textarea id="childFeedbackInput" rows="3" placeholder="Write feedback about ${esc(name)}'s progress\u2026" style="width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;"></textarea>
      <button onclick="addChildFeedback('${esc(name)}')" style="margin-top:8px; padding:8px 18px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Add feedback</button>`;
    container.appendChild(formCard);
    if(entries.length){
      const listWrap = document.createElement('div');
      listWrap.innerHTML = entries.map((e, i) => `<div class="card" style="padding:12px 16px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
          <p style="margin:0; flex:1; white-space:pre-wrap;">${esc(e.text)}</p>
          <button onclick="deleteChildFeedback('${esc(name)}',${i})" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:13px; padding:0;" title="Delete">✕</button>
        </div>
        <p class="cap" style="margin:6px 0 0;">${esc(e.date)}</p>
      </div>`).join('');
      container.appendChild(listWrap);
    } else {
      const empty = document.createElement('p');
      empty.className = 'cap'; empty.style.marginBottom = '16px';
      empty.textContent = 'No feedback recorded yet for ' + name.split(' ')[0] + '.';
      container.appendChild(empty);
    }
  }
  function renderChildRecord(selectedName){
    renderChildRecordReal(selectedName); // part 14 — real data only
  }
  // preTestAssessmentEntries[studentName][activityIndexAsString] = 'B'|'P'|'A'
  const preTestAssessmentEntries = {};
  (function loadPreTestAssessmentEntries(){
    try {
      const raw = localStorage.getItem('preTestAssessmentEntries');
      if(raw){
        Object.assign(preTestAssessmentEntries, JSON.parse(raw));
        // Migrate the legacy internal Beginner code to the user-facing BPA code.
        Object.keys(preTestAssessmentEntries).forEach(name => {
          Object.keys(preTestAssessmentEntries[name] || {}).forEach(k => {
            if(preTestAssessmentEntries[name][k] === 'E') preTestAssessmentEntries[name][k] = 'B';
          });
        });
      }
    } catch(e){ /* malformed or unavailable — start empty */ }
  })();
  function savePreTestAssessmentEntries(){
    try { localStorage.setItem('preTestAssessmentEntries', JSON.stringify(preTestAssessmentEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }
  function setPreTestTier(name, activityIdx, tier){
    if(!preTestAssessmentEntries[name]) preTestAssessmentEntries[name] = {};
    const key = String(activityIdx);
    if(preTestAssessmentEntries[name][key] === tier) delete preTestAssessmentEntries[name][key];
    else preTestAssessmentEntries[name][key] = tier;
    savePreTestAssessmentEntries();
    renderChildRecord(name);
  }
  function clearPreTestAssessment(name){
    if(!confirm('Clear ' + name + '\u2019s Pre-Test Assessment? All 26 activities for this child will be reset — it can\u2019t be undone.')) return;
    preTestAssessmentEntries[name] = {};
    savePreTestAssessmentEntries();
    renderChildRecord(name);
  }
  function renderPreTestAssessmentSection(container, name){
    const record = preTestAssessmentEntries[name] || {};
    let assessed = 0, se = 0, sp = 0, sa = 0;
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const v = record[String(idx)];
      if(v === 'B') se++; else if(v === 'P') sp++; else if(v === 'A') sa++;
      if(v === 'B' || v === 'P' || v === 'A') assessed++; // AB (absent for this activity) is not evaluated
    });
    const totalScore = sa*3 + sp*2 + se*1;
    const maxPossible = assessed * 3;
    const pctAchievement = maxPossible ? Math.round(totalScore / maxPossible * 100) : 0;
    const band = !assessed ? mdPill('Not recorded', 'neu') : pctAchievement >= 85 ? mdPill('Advanced', 'good') : pctAchievement >= 60 ? mdPill('Proficient', 'warn') : mdPill('Beginner', 'crit');
    container.appendChild(mdSec('Pre-Test Assessment', '<span class="reqs">ASM-PT1…3</span>'));
    const ptNote = document.createElement('p');
    ptNote.className = 'cap'; ptNote.style.margin = '4px 0 14px';
    ptNote.textContent = 'The baseline worksheet done once, before teaching starts — same 26 activities as Weekly Assessment, recorded once for this child rather than every week.';
    container.appendChild(ptNote);
    if(assessed > 0){
      const resetRow = document.createElement('div'); resetRow.style.cssText = 'margin:0 0 14px;';
      const resetBtn = document.createElement('button');
      resetBtn.textContent = '↺ Enter manually — clear all and start fresh';
      resetBtn.style.cssText = 'padding:7px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:12.5px; font-weight:600;';
      resetBtn.onclick = () => clearPreTestAssessment(name);
      resetRow.appendChild(resetBtn);
      container.appendChild(resetRow);
    }
    container.appendChild(mdGrid('g4', [
      mdTile('Activities completed', assessed, 'of ' + WEEKLY_ASSESSMENT_ACTIVITIES.length, mdPill(assessed === WEEKLY_ASSESSMENT_ACTIVITIES.length ? 'All completed' : (WEEKLY_ASSESSMENT_ACTIVITIES.length - assessed) + ' absent', assessed === WEEKLY_ASSESSMENT_ACTIVITIES.length ? 'good' : 'warn'), 'ASM-PT1'),
      mdTile('Total score', totalScore, 'of ' + maxPossible, mdPill(mdStatusBand(pctAchievement).l, mdStatusBand(pctAchievement).c), 'ASM-PT2'),
      mdTile('% Achievement', assessed ? pctAchievement : '—', assessed ? '' : 'not recorded', band, 'ASM-PT3'),
      mdTile('Overall band', assessed ? (sa >= sp && sa >= se ? 'Advanced' : sp >= se ? 'Proficient' : 'Beginner') : '—', 'baseline', band, 'ASM-PT3')
    ]));
    const absentNums = preTestAbsentList(name);
    if(absentNums.length){
      const ab = document.createElement('div'); ab.className = 'cap';
      ab.style.cssText = 'margin:0 0 12px; padding:10px 12px; border-radius:8px; background:#f3f4f6; color:#4a5560; line-height:1.5;';
      ab.innerHTML = '<b>Absent — not completed:</b> ' + esc(name.split(' ')[0]) + ' was absent for ' + (absentNums.length === WEEKLY_ASSESSMENT_ACTIVITIES.length ? 'all ' + absentNums.length + ' activities' : absentNums.length + ' of ' + WEEKLY_ASSESSMENT_ACTIVITIES.length + ' activities (no. ' + esc(preTestRanges(absentNums)) + ')') + ' and has not completed them. They are not counted in the score or the %.';
      container.appendChild(ab);
    }
    const gradeGrid = document.createElement('div');
    gradeGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:8px;';
    const tierColors = { B: 'var(--danger,#c8433f)', P: '#EE8F35', A: 'var(--success)' };
    gradeGrid.innerHTML = WEEKLY_ASSESSMENT_ACTIVITIES.map((a, idx) => {
      const tier = record[String(idx)];
      const btns = ['B','P','A'].map(t => {
        const active = tier === t;
        const letter = t;
        return `<button onclick="setPreTestTier('${esc(name)}',${idx},'${t}')" title="${gradeLabel(t)}" style="${gradeBtnStyle(t, active, 28)} margin:0 auto;">${gradeBtnLabel(active, t)}</button>`;
      }).join('');
      return `<div style="border:1px solid var(--border); border-radius:8px; padding:8px; background:var(--card);">
        <div style="font-size:11px; font-weight:600; margin-bottom:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(a.activity)}">${idx + 1}. ${esc(a.activity)}</div>
        <div class="cap" style="font-size:10px; margin-bottom:6px;">${esc(a.type)} · ${esc(a.cg)}</div>
        <div style="display:flex; gap:4px;">${btns}</div>
        <div style="font-size:9.5px; margin-top:5px; font-weight:600; color:${preTestDone(tier) ? 'var(--success)' : '#4a5560'};">${preTestDone(tier) ? '✓ Saved' : 'Absent — not evaluated'}</div>
      </div>`;
    }).join('');
    container.appendChild(mdCard(null, 'Tapping a rating saves it immediately for ' + esc(name).split(' ')[0] + ' — the "✓ Saved" mark confirms each one.', gradeGrid));
  }
function sampleTeacherProfile(){
  // Use the real teacher name already loaded into the top-right
  // profile by session_check.php. Keep the remaining profile
  // fields unchanged for now because they are still sample data.
  const loggedInTeacherName =
    document.querySelector('.user-name')?.textContent?.trim() ||
    'Teacher';
  return {
    name: loggedInTeacherName,
    qualification: 'D.El.Ed (Diploma in Elementary Education)',
    dob: '14-03-1991',
    age: 35,
    gender: 'Female',
    maritalStatus: 'Married',
    contactNormal: '98' + String(23456780),
    contactEmergency: '98' + String(76543210),
    experience: '6 years',
    languages: ['Hindi', 'Marathi', 'English'],
    address: 'Room 12, Kamgar Vasahat, Sion, Mumbai 400022',
    training: [
      { name: 'Classroom management basics', date: 'Apr 2026', cert: true },
      { name: 'Using the Jadui Pitara kit', date: 'Jun 2026', cert: true },
      { name: 'Parent engagement techniques', date: 'Jul 2026', cert: false }
    ]
  };
}
