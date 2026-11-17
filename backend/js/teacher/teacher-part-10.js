/* =========================================================================
   teacher-part-10.js — part 10 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  function renderPreTestClassSection(container){
    ensurePreTestTallyForClass();
    let totalMarked = 0;
    const tot = { E: 0, P: 0, A: 0 };
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const t = preTestTallyEntries[String(idx)] || { count_e: 0, count_p: 0, count_a: 0 };
      tot.E += t.count_e; tot.P += t.count_p; tot.A += t.count_a;
      totalMarked += t.count_e + t.count_p + t.count_a;
    });
    const classSize = assessmentPupilNames().length;
    const totalCells = WEEKLY_ASSESSMENT_ACTIVITIES.length * classSize;
    const completeness = totalCells ? Math.round(totalMarked / totalCells * 100) : 0;
    const avgScore = totalMarked ? Math.round((tot.A*3 + tot.P*2 + tot.E*1) / totalMarked * 100) / 100 : 0;
    const pctAdvanced = totalMarked ? Math.round(tot.A / totalMarked * 100) : 0;

    container.appendChild(mdSec('Pre-Test', '<span class="reqs">ASM-PT1…3</span>'));
    const ptNote = document.createElement('p');
    ptNote.className = 'cap'; ptNote.style.margin = '4px 0 14px';
    ptNote.textContent = 'The baseline worksheet, done once per child before teaching starts — same 26 activities as Weekly Assessment. Class-wide counts, not tied to named children (same model as Workbook Assessment).';
    container.appendChild(ptNote);

    container.appendChild(mdGrid('g4', [
      mdTile('Activities', WEEKLY_ASSESSMENT_ACTIVITIES.length, '20 worksheet + 6 classroom', mdPill('Baseline', 'info'), 'ASM-PT1'),
      mdTile('Recording complete', completeness, '% of cells', mdPill(mdStatusBand(completeness, 90, 70).l, mdStatusBand(completeness, 90, 70).c), 'ASM-PT2', mdMeter(completeness)),
      mdTile('Class avg score', avgScore, 'of 3', mdPill(mdStatusBand(avgScore/3*100).l, mdStatusBand(avgScore/3*100).c), 'ASM-PT3', mdMeter(avgScore/3*100)),
      mdTile('% Advanced', pctAdvanced, 'achieved', mdPill(mdStatusBand(pctAdvanced).l, mdStatusBand(pctAdvanced).c), 'ASM-PT3', mdMeter(pctAdvanced))
    ]));

    container.appendChild(mdSec('Add data — Pre-Test', '<span class="reqs">ASM-PT1…3</span>'));
    // Two separate tables (Worksheet / Classroom) picked via a
    // dropdown, rather than one merged table — these are genuinely
    // different activity types (paper worksheet vs. an in-classroom
    // task), so keeping them apart avoids implying they're the same
    // kind of evidence. "Page" is replaced with the actual CG
    // specification (e.g. "CG 1.2") each row covers — more useful here
    // than a workbook page number, since Pre-Test activities aren't
    // tied to book pages the way Workbook Assessment is.
    const typeBar = document.createElement('div'); typeBar.className = 'fbar card'; typeBar.style.cssText = 'margin-bottom:16px; padding:16px 18px;';
    typeBar.innerHTML = '<div class="ctl"><label>Activity type</label><select id="preTestTypeSelect" style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    container.appendChild(typeBar);
    const typeSel = typeBar.querySelector('#preTestTypeSelect');
    ['Worksheet', 'Classroom'].forEach(t => {
      const opt = document.createElement('option'); opt.value = t; opt.textContent = t;
      if(t === preTestTypeFilter) opt.selected = true;
      typeSel.appendChild(opt);
    });
    typeSel.onchange = () => { preTestTypeFilter = typeSel.value; renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    // ---- Import previous data (collapsed by default) ----
    const ptImportToggle = document.createElement('div');
    ptImportToggle.className = 'card'; ptImportToggle.style.cssText = 'padding:0; margin-bottom:14px; overflow:hidden;';
    ptImportToggle.innerHTML = `
      <div onclick="preTestImportOpen = !preTestImportOpen; this.nextElementSibling.classList.toggle('hidden', !preTestImportOpen); this.querySelector('.chevron').style.transform = preTestImportOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import Pre-Test from a file</h3>
          <p class="cap" style="margin:0;">.csv or .xlsx, one row per activity — tap to open and choose a file, or fill in the numbers by hand in the table below.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${preTestImportOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${preTestImportOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    container.appendChild(ptImportToggle);
    ptImportToggle.querySelector('div:last-child').appendChild(renderPreTestImportCard());

    // Report download lives in Assessment Dashboard → Assessment records.
    container.appendChild(assessmentReportsLink('pretest'));

    container.appendChild(mdSec(preTestTypeFilter + ' activities', '<span class="reqs">ASM-PT1…3</span>'));
    // CG-grouped table for whichever type is selected — same rowspan
    // pattern as Workbook Assessment's Curricular Goal grouping, and
    // the same inline number-box tally entry, saving on every change.
    const cgGroups = [];
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      if(a.type !== preTestTypeFilter) return;
      const cgMajor = (a.cg.match(/CG\s*(\d+)/) || [])[1] || '0';
      let group = cgGroups.find(g => g.cgMajor === cgMajor);
      if(!group){ group = { cgMajor, items: [] }; cgGroups.push(group); }
      group.items.push(Object.assign({}, a, { idx }));
    });
    cgGroups.sort((x, y) => parseInt(x.cgMajor, 10) - parseInt(y.cgMajor, 10));

    const numInput = (activityIdx, field, val) => `<input type="number" min="0" value="${val}" style="width:52px; text-align:center; padding:4px; border:1px solid var(--border); border-radius:5px; font-size:13px;" onchange="setPreTestTallyCount(${activityIdx}, '${field}', this.value); this.value=(preTestTallyEntries[String(${activityIdx})]||{}).${field}||0;" />`;

    let pickerTable = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="table-layout:fixed; width:100%; min-width:760px; border-collapse:separate; border-spacing:0;"><colgroup><col style="width:12%;"><col style="width:42%;"><col style="width:14%;"><col style="width:10%;"><col style="width:11%;"><col style="width:11%;"></colgroup><thead><tr><th style="padding:10px 12px;">Curricular Goal</th><th style="padding:10px 12px;">Activity</th><th style="padding:10px 12px;">Specification</th><th style="padding:10px 12px; text-align:center;">E</th><th style="padding:10px 12px; text-align:center;">P</th><th style="padding:10px 12px; text-align:center;">A</th></tr></thead><tbody>';
    if(!cgGroups.length){
      pickerTable += `<tr><td colspan="6" class="dim" style="text-align:center; padding:20px;">No ${esc(preTestTypeFilter)} activities are defined.</td></tr>`;
    }
    cgGroups.forEach(g => {
      g.items.forEach((a, idx) => {
        const t = preTestTallyEntries[String(a.idx)] || { count_e: 0, count_p: 0, count_a: 0 };
        pickerTable += `<tr style="border-bottom:1px solid var(--border);">
          ${idx === 0 ? `<td rowspan="${g.items.length}" style="vertical-align:top; font-weight:600; padding:14px 12px;">CG-${esc(g.cgMajor)}</td>` : ''}
          <td style="word-wrap:break-word; text-align:left; padding:14px 12px;">${esc(a.activity)}</td>
          <td class="dim" style="padding:14px 12px;">${esc(a.cg)}</td>
          <td style="text-align:center; padding:14px 12px;">${numInput(a.idx, 'count_e', t.count_e)}</td>
          <td style="text-align:center; padding:14px 12px;">${numInput(a.idx, 'count_p', t.count_p)}</td>
          <td style="text-align:center; padding:14px 12px;">${numInput(a.idx, 'count_a', t.count_a)}</td>
        </tr>`;
      });
    });
    pickerTable += '</tbody></table></div>';
    const pickerWrap = document.createElement('div'); pickerWrap.innerHTML = pickerTable;
    container.appendChild(mdCard(null, 'Each number saves as soon as you change it — the button below is just a visible confirmation, not a separate required step. These are class-wide counts, not tied to named children.', pickerWrap));

    // Explicit Save confirmation — every cell already auto-saves on
    // change, but a visible, tappable button gives the same reassurance
    // the app's other data-entry screens already offer (e.g. My Day's
    // "✓ Save activity"), rather than relying purely on an invisible
    // per-keystroke save.
    const ptSaveRow = document.createElement('div');
    ptSaveRow.style.cssText = 'display:flex; align-items:center; gap:10px; margin:12px 0 24px;';
    const ptSaveBtn = document.createElement('button');
    ptSaveBtn.className = 'btn-primary';
    ptSaveBtn.style.cssText = 'width:auto; padding:10px 22px;';
    ptSaveBtn.textContent = '✓ Save';
    const ptSaveMsg = document.createElement('span');
    ptSaveMsg.style.cssText = 'font-size:13px; color:var(--success, #0ca30c);';
    ptSaveBtn.onclick = () => {
      ptSaveMsg.textContent = '✓ Saved';
      setTimeout(() => { ptSaveMsg.textContent = ''; }, 2000);
    };
    ptSaveRow.appendChild(ptSaveBtn);
    ptSaveRow.appendChild(ptSaveMsg);
    container.appendChild(ptSaveRow);

    // ---- Every activity, at a glance (collapsed by default) — a
    // read-only denser view of exactly the same data already visible
    // in the editable table above, same reasoning as My Day's
    // "clubbed overview" collapse: two views of the same numbers
    // shouldn't both be open by default. ----
    const ptGlanceToggle = document.createElement('div');
    ptGlanceToggle.className = 'card'; ptGlanceToggle.style.cssText = 'padding:0; margin-bottom:14px; overflow:hidden;';
    ptGlanceToggle.innerHTML = `
      <div onclick="preTestGlanceOpen = !preTestGlanceOpen; this.nextElementSibling.classList.toggle('hidden', !preTestGlanceOpen); this.querySelector('.chevron').style.transform = preTestGlanceOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📊 Every activity, at a glance</h3>
          <p class="cap" style="margin:0;">Both activity types combined, read-only, with averages — the same numbers as the editable table above.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${preTestGlanceOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${preTestGlanceOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    container.appendChild(ptGlanceToggle);
    const ptGlanceBody = ptGlanceToggle.querySelector('div:last-child');
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>#</th><th>Type</th><th>Activity</th><th>CG</th><th>E</th><th>P</th><th>A</th><th>Avg</th><th>% Advanced</th></tr></thead><tbody>';
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const t = preTestTallyEntries[String(idx)] || { count_e: 0, count_p: 0, count_a: 0 };
      const marked = t.count_e + t.count_p + t.count_a;
      const rowAvg = marked ? Math.round((t.count_a*3 + t.count_p*2 + t.count_e*1) / marked * 100) / 100 : 0;
      const rowPctA = marked ? Math.round(t.count_a / marked * 100) : 0;
      table += `<tr>
        <td class="dim">${idx + 1}</td><td class="dim">${esc(a.type)}</td><td><b>${esc(a.activity)}</b></td><td class="dim">${esc(a.cg)}</td>
        <td>${t.count_e}</td><td>${t.count_p}</td><td>${t.count_a}</td><td>${rowAvg}</td><td>${marked ? rowPctA + '%' : '—'}</td>
      </tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    ptGlanceBody.appendChild(wrap);
  }

  function renderPreTestImportCard(){
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <p class="cap" style="margin:0 0 8px;">.csv or .xlsx — header row must be exactly: activity_no,count_e,count_p,count_a — activity_no is 1-${WEEKLY_ASSESSMENT_ACTIVITIES.length} (matching the # column in "Every activity, at a glance" below), counts are whole numbers ≥ 0. One row per activity, not per child — same class-wide model as the table above.</p>
      <input type="file" id="preTestImportInput" accept=".csv,.xlsx" />
      <div id="preTestImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importPreTestFile()">Import</button>
    `;
    return wrap;
  }

  async function importPreTestFile(){
    ensurePreTestTallyForClass();
    const input = document.getElementById('preTestImportInput');
    const resultEl = document.getElementById('preTestImportResult');
    if(!input.files.length){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';
    let rows;
    try { rows = await readAssessmentFileRows(input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }
    const header = rows[0].map(h => h.toLowerCase());
    if(header.join(',') !== 'activity_no,count_e,count_p,count_a'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: activity_no,count_e,count_p,count_a — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }
    let imported = 0;
    const skipped = [];
    for(let i = 1; i < rows.length; i++){
      const parts = rows[i];
      const rowNum = i + 1;
      if(parts.length !== 4){ skipped.push(`Row ${rowNum}: expected 4 columns, got ${parts.length}`); continue; }
      const [activityNoRaw, eRaw, pRaw, aRaw] = parts;
      const activityIdx = parseInt(activityNoRaw, 10) - 1;
      if(isNaN(activityIdx) || activityIdx < 0 || activityIdx >= WEEKLY_ASSESSMENT_ACTIVITIES.length){ skipped.push(`Row ${rowNum}: "${activityNoRaw}" must be 1-${WEEKLY_ASSESSMENT_ACTIVITIES.length}`); continue; }
      const e = parseInt(eRaw, 10), p = parseInt(pRaw, 10), a = parseInt(aRaw, 10);
      if(isNaN(e) || isNaN(p) || isNaN(a) || e < 0 || p < 0 || a < 0){
        skipped.push(`Row ${rowNum}: counts must be whole numbers ≥ 0 — got "${eRaw}, ${pRaw}, ${aRaw}"`);
        continue;
      }
      preTestTallyEntries[String(activityIdx)] = { count_e: e, count_p: p, count_a: a };
      imported++;
    }
    if(imported > 0) savePreTestTallyEntries();
    let html = `<div class="au-success">✓ Filled in ${imported} activit${imported === 1 ? 'y' : 'ies'} — saved.</div>`;
    if(skipped.length > 0){
      html += `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<ul style="margin:4px 0 0 18px;">${skipped.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`;
    }
    resultEl.innerHTML = html;
    alert(`Imported ${imported} Pre-Test activit${imported === 1 ? 'y' : 'ies'}.` + (skipped.length ? ` ${skipped.length} skipped — see the details below.` : ''));
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  function downloadPreTestClassPdf(){
    ensurePreTestTallyForClass();
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Pre-Test — class baseline', 14, 15);
    doc.setFontSize(9);
    doc.text(assessmentPdfHeaderLine() + ' · generated ' + new Date().toLocaleDateString(), 14, 21);

    doc.autoTable({
      startY: 26,
      head: [['#', 'Type', 'Activity', 'CG', 'E', 'P', 'A', 'Avg', '% Advanced']],
      body: WEEKLY_ASSESSMENT_ACTIVITIES.map((a, idx) => {
        const t = preTestTallyEntries[String(idx)] || { count_e: 0, count_p: 0, count_a: 0 };
        const marked = t.count_e + t.count_p + t.count_a;
        const rowAvg = marked ? Math.round((t.count_a*3 + t.count_p*2 + t.count_e*1) / marked * 100) / 100 : 0;
        const rowPctA = marked ? Math.round(t.count_a / marked * 100) : 0;
        return [idx + 1, a.type, a.activity, a.cg, t.count_e, t.count_p, t.count_a, rowAvg, marked ? rowPctA + '%' : '—'];
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
          const v = preTestAssessmentEntries[name] && preTestAssessmentEntries[name][String(idx)];
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

    doc.save('pre-test-' + todayKey() + '.pdf');
  }

  // Serves both Monthly Assessment and Classroom Observation — same
  // domain-tier grid shape, only the store and scope label differ,
  // matching how renderMonthlyAssessment already shares one renderer
  // between the two via assessmentEntryType.
  function downloadAssessmentGridPdf(){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const store = getAssessmentStore();
    const typeInfo = ASSESSMENT_TYPE_INFO[assessmentEntryType];
    const scopeLabel = assessmentEntryType === 'monthly' ? new Date().toLocaleDateString([], {month:'long', year:'numeric'}) : 'Ongoing log';

    const totalCells = assessmentPupilNames().length * ASSESSMENT_DOMAINS.length;
    let recordedCells = 0;
    const tot = {E:0,P:0,A:0};
    assessmentPupilNames().forEach(name => ASSESSMENT_DOMAINS.forEach(d => {
      const v = store[name] && store[name][d.key];
      if(v){ recordedCells++; tot[v]++; }
    }));
    const completeness = totalCells ? Math.round(recordedCells / totalCells * 100) : 0;
    const dsi = recordedCells ? Math.round(((tot.A*3 + tot.P*2 + tot.E*1) / (3 * recordedCells) * 200) * 10) / 10 : 0;
    const sriPct = recordedCells ? Math.round((tot.P + tot.A) / recordedCells * 100) : 0;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(typeInfo.label + ' — ' + scopeLabel, 14, 15);
    doc.setFontSize(9);
    doc.text(assessmentPdfHeaderLine() + ' · generated ' + new Date().toLocaleDateString(), 14, 21);
    doc.text('Recording complete: ' + completeness + '%   ·    ·   At Proficient or above: ' + sriPct + '%', 14, 27);

    doc.autoTable({
      startY: 32,
      head: [['Child', ...ASSESSMENT_DOMAINS.map(d => d.label), 'Recorded']],
      body: assessmentPupilNames().map(name => {
        const cells = ASSESSMENT_DOMAINS.map(d => TIER_INFO[(store[name] && store[name][d.key]) || '']?.letter || '·');
        const recCount = ASSESSMENT_DOMAINS.filter(d => store[name] && store[name][d.key]).length;
        return [name, ...cells, recCount + '/' + ASSESSMENT_DOMAINS.length];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });

    doc.save((assessmentEntryType === 'monthly' ? 'monthly-assessment-' : 'classroom-observation-') + todayKey() + '.pdf');
  }

  // ---------------------------------------------------------------
  // CLASSROOM OBSERVATION — rebuilt from the flat, untimed, 10-domain
  // localStorage log (classroomObservationEntries, above) into the real
  // structure confirmed from the BALVATIKA_2 sheet: 2-4 named Themes per
  // month (e.g. "My Classroom," "Emotions and Feelings"), each with
  // 2-4 Curricular-Goal-tagged items. Same server-backed, month-scoped
  // shape as Workbook Assessment — a theme picker stands in for the
  // workbook picker there. classroomObservationEntries above is now
  // dead (kept only so nothing throws if referenced elsewhere); this is
  // the real data path going forward.
  // ---------------------------------------------------------------
  let currentObservationThemeId = null;

  const observationThemesCache = {}; // level+'|'+month -> null|'loading'|'error:...'|[{id,name,items:[{id,cg_code}]}]
  function ensureObservationThemesLoaded(level, month, reRenderFn){
    const key = level + '|' + month;
    if(Array.isArray(observationThemesCache[key])) return true;
    if(observationThemesCache[key] === 'loading') return false;
    if(typeof observationThemesCache[key] === 'string' && observationThemesCache[key].startsWith('error:')) return true;
    observationThemesCache[key] = 'loading';
    fetch('backend/assessment/observation/get_observation_themes.php?' + new URLSearchParams({ level, month }) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(res => res.json())
      .then(data => {
        observationThemesCache[key] = data.status === 'success' ? data.themes : 'error:' + (data.message || 'Could not load observation themes.');
        reRenderFn();
      })
      .catch(() => { observationThemesCache[key] = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }

  const observationAssessmentCache = {}; // month -> null|'loading'|'error:...'|{ [pupilId]: { [itemId]: 'E'|'P'|'A' } }
  function ensureObservationAssessmentLoaded(month, reRenderFn){
    if(observationAssessmentCache[month] && typeof observationAssessmentCache[month] === 'object') return true;
    if(observationAssessmentCache[month] === 'loading') return false;
    if(typeof observationAssessmentCache[month] === 'string' && observationAssessmentCache[month].startsWith('error:')) return true;
    observationAssessmentCache[month] = 'loading';
    fetch('backend/assessment/observation/get_observation_assessment.php?' + new URLSearchParams({ month }) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(res => res.json())
      .then(data => {
        if(data.status !== 'success'){ observationAssessmentCache[month] = 'error:' + (data.message || 'Could not load observation marks.'); reRenderFn(); return; }
        const byPupil = {};
        data.marks.forEach(m => {
          if(!byPupil[m.pupil_id]) byPupil[m.pupil_id] = {};
          byPupil[m.pupil_id][m.observation_item_id] = m.level_mark;
        });
        observationAssessmentCache[month] = byPupil;
        reRenderFn();
      })
      .catch(() => { observationAssessmentCache[month] = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }

  // Grades still on their way to the server (each tap saves on its own).
  // The Save button below waits for these, then re-reads the month from
  // the database so the confirmation is what's actually stored.
  var observationPendingSaves = 0;
  var observationSaveMessage = ''; // shown under the Save button after a check

  async function confirmObservationSaved(){
    const btn = document.getElementById('observationSaveBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
    // Wait (up to ~10 s) for any taps still being sent.
    for(let i = 0; i < 50 && observationPendingSaves > 0; i++){
      await new Promise(r => setTimeout(r, 200));
    }
    const month = currentWorkbookMonth;
    try{
      const res = await fetch('backend/assessment/observation/get_observation_assessment.php?' + new URLSearchParams({ month }) + (window.location.search ? '&' + window.location.search.slice(1) : ''));
      const data = await res.json();
      if(data.status !== 'success') throw new Error(data.message || 'Could not check the saved grades.');
      const byPupil = {};
      data.marks.forEach(m => {
        if(!byPupil[m.pupil_id]) byPupil[m.pupil_id] = {};
        byPupil[m.pupil_id][m.observation_item_id] = m.level_mark;
      });
      observationAssessmentCache[month] = byPupil; // screen now shows exactly what the database holds
      const level = workbookLevelFromClassName();
      const themes = observationThemesCache[level + '|' + month] || [];
      const theme = themes.find(t => t.id === currentObservationThemeId);
      const itemIds = theme ? theme.items.map(it => it.id) : [];
      let themeCount = 0;
      Object.values(byPupil).forEach(marks => itemIds.forEach(id => { if(marks[id]) themeCount++; }));
      const totalCells = itemIds.length * assessmentPupilNames().length;
      const now = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      observationSaveMessage = '✓ Saved at ' + now + ' — ' + themeCount + ' of ' + totalCells + ' grades for ' + (theme ? theme.name : 'this theme') + ' are in the database (' + month + ').';
    } catch(err){
      observationSaveMessage = '⚠ ' + (err.message || 'Could not reach the server.') + ' Your taps may not all be saved — try again.';
    }
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  // Same content as the .xlsx export, as a printable PDF — one table
  // per theme scheduled this month, a row per child.
  function downloadObservationAssessmentPdf(){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const level = workbookLevelFromClassName();
    const themes = observationThemesCache[level + '|' + currentWorkbookMonth] || [];
    const marks = observationAssessmentCache[currentWorkbookMonth] || {};
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Classroom Observation — ' + currentWorkbookMonth, 14, 15);
    doc.setFontSize(9);
    doc.text(assessmentPdfHeaderLine() + ' · generated ' + new Date().toLocaleDateString(), 14, 21);
    let startY = 26;
    themes.forEach((t, ti) => {
      if(ti > 0) startY = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : startY) + 12;
      doc.setFontSize(12);
      doc.text(t.name, 14, startY);
      doc.autoTable({
        startY: startY + 4,
        head: [['Child', ...t.items.map(it => it.cg_code)]],
        body: assessmentPupilNames().map((name, idx) => {
          const pupil = realPupilsCache[idx];
          const pm = marks[pupil.id] || {};
          return [name, ...t.items.map(it => pm[it.id] ? TIER_INFO[pm[it.id]].letter : '·')];
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 60] }
      });
    });
    doc.save('classroom-observation-' + level.replace(/\s+/g,'') + '-' + currentWorkbookMonth + '-' + todayKey() + '.pdf');
  }

  // Direct 3-button set, same UI and "tap again to clear" pattern as
  // Workbook Assessment's saveWorkbookMark.
  function saveObservationMark(pupilId, itemId, currentMark, tier){
    const next = currentMark === tier ? null : tier;
    const month = currentWorkbookMonth; // Observation shares the same month picker state as Workbook — one "which month" concept across the Assessment section
    if(!observationAssessmentCache[month] || typeof observationAssessmentCache[month] !== 'object') return;
    if(!observationAssessmentCache[month][pupilId]) observationAssessmentCache[month][pupilId] = {};
    if(next === null) delete observationAssessmentCache[month][pupilId][itemId];
    else observationAssessmentCache[month][pupilId][itemId] = next;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);

    observationPendingSaves++;
    fetch('backend/assessment/observation/save_observation_assessment.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ pupil_id: pupilId, observation_item_id: itemId, level_mark: next })
    }).then(res => res.json()).then(data => {
      if(data.status !== 'success'){
        observationAssessmentCache[month] = observationAssessmentCache[month] || {};
        if(!observationAssessmentCache[month][pupilId]) observationAssessmentCache[month][pupilId] = {};
        if(currentMark === null) delete observationAssessmentCache[month][pupilId][itemId];
        else observationAssessmentCache[month][pupilId][itemId] = currentMark;
        renderMonthlyAssessment(monthlyAssessmentTargetEl);
        alert('Could not save that grade — check your connection and try again.');
      }
    }).catch(() => { alert('Could not save that grade — check your connection and try again.'); }).finally(() => { observationPendingSaves = Math.max(0, observationPendingSaves - 1); });
  }

  function renderObservationImportCard(){
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.marginTop = '4px';
    wrap.innerHTML = `
      <div class="hd"><div><h3>Import Classroom Observation from a file</h3><p class="cap">.csv or .xlsx — header row must be exactly: child_name,theme,cg_code,level_mark — theme must match a theme name scheduled this month, cg_code must match one of that theme's items, level_mark is E/P/A.</p></div></div>
      <input type="file" id="observationImportInput" accept=".csv,.xlsx" style="margin-top:8px;" />
      <div id="observationImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importObservationAssessmentFile()">Import</button>
    `;
    return wrap;
  }

  async function importObservationAssessmentFile(){
    const input = document.getElementById('observationImportInput');
    const resultEl = document.getElementById('observationImportResult');
    if(!input.files.length){ resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>'; return; }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';

    let rows;
    try { rows = await readAssessmentFileRows(input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }

    const header = rows[0].map(h => h.toLowerCase());
    if(header.join(',') !== 'child_name,theme,cg_code,level_mark'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: child_name,theme,cg_code,level_mark — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }

    const level = workbookLevelFromClassName();
    const themesKey = level + '|' + currentWorkbookMonth;
    const themes = observationThemesCache[themesKey];
    if(!Array.isArray(themes)){ resultEl.innerHTML = '<div class="au-error">Observation themes for this month have not finished loading — wait a moment and try again.</div>'; return; }
    const pupilByName = {};
    (realPupilsCache || []).forEach(p => { pupilByName[p.name.trim().toLowerCase()] = p; });

    let imported = 0;
    const skipped = [];
    for(let i = 1; i < rows.length; i++){
      const [childName, themeName, cgCode, levelMarkRaw] = rows[i];
      const rowNum = i + 1;
      const pupil = pupilByName[(childName || '').trim().toLowerCase()];
      if(!pupil){ skipped.push(`Row ${rowNum}: no child named "${childName}" in this class`); continue; }
      const theme = themes.find(t => t.name.toLowerCase() === (themeName || '').trim().toLowerCase());
      if(!theme){ skipped.push(`Row ${rowNum}: no theme named "${themeName}" scheduled for ${currentWorkbookMonth}`); continue; }
      const item = theme.items.find(it => it.cg_code.toLowerCase() === (cgCode || '').trim().toLowerCase());
      if(!item){ skipped.push(`Row ${rowNum}: CG code "${cgCode}" isn't part of "${theme.name}"`); continue; }
      const mark = (levelMarkRaw || '').trim().toUpperCase();
      if(!['E','P','A'].includes(mark)){ skipped.push(`Row ${rowNum}: level_mark must be E, P, or A — got "${levelMarkRaw}"`); continue; }

      try {
        const res = await fetch('backend/assessment/observation/save_observation_assessment.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ pupil_id: pupil.id, observation_item_id: item.id, level_mark: mark })
        });
        const data = await res.json();
        if(data.status === 'success'){
          if(!observationAssessmentCache[currentWorkbookMonth] || typeof observationAssessmentCache[currentWorkbookMonth] !== 'object') observationAssessmentCache[currentWorkbookMonth] = {};
          if(!observationAssessmentCache[currentWorkbookMonth][pupil.id]) observationAssessmentCache[currentWorkbookMonth][pupil.id] = {};
          observationAssessmentCache[currentWorkbookMonth][pupil.id][item.id] = mark;
          imported++;
        } else {
          skipped.push(`Row ${rowNum}: server rejected it — ${data.message || 'unknown error'}`);
        }
      } catch(e){ skipped.push(`Row ${rowNum}: could not reach the server`); }
    }

    resultEl.innerHTML = `<div class="au-success">Imported ${imported} of ${rows.length - 1} rows.</div>` +
      (skipped.length ? `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<br>${skipped.map(esc).join('<br>')}</div>` : '');
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }

  function downloadObservationAssessmentXlsx(){
    if(typeof XLSX === 'undefined'){ alert('.xlsx export did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const level = workbookLevelFromClassName();
    const themesKey = level + '|' + currentWorkbookMonth;
    const themes = observationThemesCache[themesKey] || [];
    const marks = observationAssessmentCache[currentWorkbookMonth] || {};
    const allItems = themes.flatMap(t => t.items.map(it => ({...it, themeName: t.name})));

    const header = ['Child', ...allItems.map(it => it.themeName + ' (' + it.cg_code + ')')];
    const rows = [header];
    assessmentPupilNames().forEach((name, idx) => {
      const pupil = realPupilsCache[idx];
      const pupilMarks = marks[pupil.id] || {};
      rows.push([name, ...allItems.map(it => pupilMarks[it.id] || '')]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wbOut = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbOut, ws, currentWorkbookMonth.slice(0,31));
    XLSX.writeFile(wbOut, 'classroom-observation-' + level.replace(/\s+/g,'') + '-' + currentWorkbookMonth + '-' + todayKey() + '.xlsx');
  }

  function renderObservationAssessmentSection(container){
    const level = workbookLevelFromClassName();

    // Reuses the same month picker/state as Workbook Assessment
    // (currentWorkbookMonth) — one "which month" concept for the whole
    // Assessment section rather than two separate month selectors that
    // could drift out of sync.
    const monthBar = document.createElement('div'); monthBar.className = 'fbar'; monthBar.style.marginBottom = '18px';
    monthBar.innerHTML = '<div class="ctl"><label>Month</label><select id="observationMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    container.appendChild(monthBar);
    const monthSel = monthBar.querySelector('#observationMonthSelect');
    WORKBOOK_MONTHS.forEach(m => {
      const opt = document.createElement('option'); opt.value = m; opt.textContent = m;
      if(m === currentWorkbookMonth) opt.selected = true;
      monthSel.appendChild(opt);
    });
    monthSel.onchange = () => { currentWorkbookMonth = monthSel.value; renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    const cadenceNote = document.createElement('p');
    cadenceNote.className = 'cap'; cadenceNote.style.margin = '0 0 16px';
    cadenceNote.innerHTML = '<b>' + esc(level) + ' themes</b> — 2 to 4 themes are scheduled per month, each observed through everyday classroom activity, not a formal test.';
    container.appendChild(cadenceNote);

    if(!ensurePupilsLoadedFor(container, () => renderMonthlyAssessment(monthlyAssessmentTargetEl))) return;

    const themesLoaded = ensureObservationThemesLoaded(level, currentWorkbookMonth, () => renderMonthlyAssessment(monthlyAssessmentTargetEl));
    const marksLoaded = ensureObservationAssessmentLoaded(currentWorkbookMonth, () => renderMonthlyAssessment(monthlyAssessmentTargetEl));
    const themesKey = level + '|' + currentWorkbookMonth;
    if(typeof observationThemesCache[themesKey] === 'string' && observationThemesCache[themesKey].startsWith('error:')){
      renderRetryCard(container, observationThemesCache[themesKey].slice(6), () => delete observationThemesCache[themesKey]); return;
    }
    if(typeof observationAssessmentCache[currentWorkbookMonth] === 'string' && observationAssessmentCache[currentWorkbookMonth].startsWith('error:')){
      renderRetryCard(container, observationAssessmentCache[currentWorkbookMonth].slice(6), () => delete observationAssessmentCache[currentWorkbookMonth]); return;
    }
    if(!themesLoaded || !marksLoaded){ container.appendChild(mdCard(null, 'Loading observation themes…', null)); return; }

    const themes = observationThemesCache[themesKey];
    const marks = observationAssessmentCache[currentWorkbookMonth];

    if(!themes.length){
      container.appendChild(mdCard(null, 'No themes are scheduled for ' + currentWorkbookMonth + ' yet.', null));
      return;
    }

    // --- Theme picker — same "pick the group, then its grid opens"
    // pattern as Workbook Assessment's book picker. ---
    if(!currentObservationThemeId || !themes.some(t => t.id === currentObservationThemeId)) currentObservationThemeId = themes[0].id;
    const themeBar = document.createElement('div'); themeBar.className = 'fbar'; themeBar.style.marginBottom = '18px';
    themeBar.innerHTML = '<div class="ctl"><label>Theme</label><select id="observationThemeSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    container.appendChild(themeBar);
    const themeSel = themeBar.querySelector('#observationThemeSelect');
    themes.forEach(t => {
      const opt = document.createElement('option'); opt.value = t.id; opt.textContent = t.name + ' (' + t.items.length + ' items)';
      if(t.id === currentObservationThemeId) opt.selected = true;
      themeSel.appendChild(opt);
    });
    themeSel.onchange = () => { currentObservationThemeId = parseInt(themeSel.value, 10); renderMonthlyAssessment(monthlyAssessmentTargetEl); };

    const selectedTheme = themes.find(t => t.id === currentObservationThemeId);
    const items = selectedTheme.items;

    if(!items.length){
      container.appendChild(mdCard(null, 'No items are set up for "' + esc(selectedTheme.name) + '" yet.', null));
      return;
    }

    // ---- Import previous data (collapsed by default) ----
    const obsImportToggle = document.createElement('div');
    obsImportToggle.className = 'card'; obsImportToggle.style.cssText = 'padding:0; margin-bottom:14px; overflow:hidden;';
    obsImportToggle.innerHTML = `
      <div onclick="observationImportOpen = !observationImportOpen; this.nextElementSibling.classList.toggle('hidden', !observationImportOpen); this.querySelector('.chevron').style.transform = observationImportOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import from a file</h3>
          <p class="cap" style="margin:0;">Grade manually by tapping E, P, or A on the table below, or import a file here — either way saves to the same real record.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${observationImportOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${observationImportOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    container.appendChild(obsImportToggle);
    obsImportToggle.querySelector('div:last-child').appendChild(renderObservationImportCard());

    const anyGraded = Object.keys(marks).some(pid => Object.keys(marks[pid] || {}).length);
    container.appendChild(mdSec(esc(selectedTheme.name) + ' — ' + currentWorkbookMonth, '<span class="reqs">ASM-O1…O3</span>'));

    // Group columns by their real Curricular Goal (derived server-side
    // from each item's cg_code, matched against the real 13-CG
    // taxonomy) — same grouped-header treatment Workbook Assessment
    // uses, adapted for a column-per-item grid instead of a row-per-item
    // form since Observation grades the whole class at once.
    const cgGroups = [];
    items.forEach(it => {
      const key = it.curricular_goal_id || 'ungrouped';
      let group = cgGroups.find(g => g.key === key);
      if(!group){ group = { key, goal_text: it.goal_text || 'Ungrouped', items: [] }; cgGroups.push(group); }
      group.items.push(it);
    });

    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th rowspan="2">Child</th>' +
      cgGroups.map(g => `<th colspan="${g.items.length}" style="text-align:center;">${esc(g.goal_text)}</th>`).join('') +
      '</tr><tr>' +
      cgGroups.flatMap(g => g.items.map((it, idx) => `<th>${idx + 1}. ${esc(it.cg_code)}</th>`)).join('') +
      '</tr></thead><tbody>';

    const tierColors = { E: 'var(--danger,#c8433f)', P: '#EE8F35', A: 'var(--success)' };
    const orderedItems = cgGroups.flatMap(g => g.items); // must match the header's column order exactly
    assessmentPupilNames().forEach((name, idx) => {
      const pupil = realPupilsCache[idx];
      const pupilMarks = marks[pupil.id] || {};
      const cells = orderedItems.map(it => {
        const mark = pupilMarks[it.id] || null;
        const btns = ['E','P','A'].map(t => {
          const active = mark === t;
          return `<button onclick="saveObservationMark(${pupil.id},${it.id},${mark ? "'" + mark + "'" : 'null'},'${t}')" title="${TIER_INFO[t].n}" style="width:22px; height:22px; padding:0; border-radius:5px; border:${active ? 'none' : '1px solid var(--border)'}; background:${active ? tierColors[t] : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:10.5px; font-weight:700; cursor:pointer;">${TIER_INFO[t].letter}</button>`;
        }).join('');
        return `<td style="text-align:center;"><div style="display:flex; gap:3px; justify-content:center;">${btns}</div></td>`;
      }).join('');
      table += `<tr><td><b>${esc(name)}</b></td>${cells}</tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Tap E, P, or A directly to record an observation — tapping the already-active letter clears it. Each tap saves immediately, no separate Save step.', wrap));

    // ---- Save & download — every tap above already saves on its own;
    // "Save" waits for any still in flight, then re-reads the month
    // from the database and reports what is actually stored. The
    // download buttons export every theme graded this month.
    const saveBar = document.createElement('div');
    saveBar.className = 'card';
    saveBar.style.cssText = 'padding:16px 18px; margin-top:16px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';
    saveBar.innerHTML = `
      <div style="flex:1; min-width:240px;">
        <b>Save this month's observation</b>
        <p class="cap" style="margin:4px 0 0;">${observationSaveMessage ? esc(observationSaveMessage) : 'Checks every grade above against the database and confirms how many are stored.'}</p>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="observationSaveBtn" class="btn-primary" style="width:auto; padding:9px 18px;">✓ Save</button>
      </div>`;
    container.appendChild(saveBar);
    saveBar.querySelector('#observationSaveBtn').onclick = confirmObservationSaved;
    container.appendChild(assessmentReportsLink('observation'));
  }


  // ---------------------------------------------------------------
  // FINE & GROSS MOTOR — same pattern as the Bhandup Tank Road
  // "Gross / Fine Motor Assessment" sheet: one activity per month
  // (June–October), every child rated G Achieved / Y Developing /
  // R Needs Support, plus a teacher note per child per sheet. The
  // children are THIS class's real roster (realPupilsCache), never the
  // names on that sheet. Saved to the real database
  // (backend/assessment/motor/).
  // ---------------------------------------------------------------
  const MOTOR_MONTHS = ['June', 'July', 'August', 'September', 'October'];
  const MOTOR_ACTIVITIES = {
    fine: {
      June:      { title: 'Pencil Cup Pegs', detail: 'Squeeze and attach 10 clothes pegs around the rim of a sturdy cup. Remove them one by one.' },
      July:      { title: 'Button Practice', detail: 'Fasten and unfasten the large buttons on a practice strip or doll shirt.' },
      August:    { title: 'Pattern Lacing', detail: 'Thread a lace through holes around a cardboard shape, alternating two bead colours.' },
      September: { title: 'Leaf Rubbing', detail: 'Hold a leaf under paper and rub with the side of a crayon to reveal its veins.' },
      October:   { title: 'Clay Numerals', detail: 'Roll thin clay ropes and shape numerals 1–5. Make matching clay balls beside each numeral.' }
    },
    gross: {
      June:      { title: 'Classroom Obstacle Path', detail: 'Walk around cones, step over a low foam block and balance along a taped line.' },
      July:      { title: 'Healthy Habits Action Trail', detail: 'Walk between picture stations. Mime brushing, bathing and exercise with whole-body actions.' },
      August:    { title: 'Hop Step Clap', detail: 'Copy and repeat a hop–step–clap movement pattern. Try leading the next round.' },
      September: { title: 'Grow Like a Plant', detail: 'Crouch like a seed, rise slowly, stretch like a tree and sway gently in the wind.' },
      October:   { title: 'Number Line Jumps', detail: 'Jump along the floor numbers 1–10. Stop on the number called by the teacher.' }
    }
  };
  const MOTOR_RATINGS = {
    G: { label: 'Achieved', color: 'var(--success, #0ca30c)' },
    Y: { label: 'Developing', color: '#EE8F35' },
    R: { label: 'Needs Support', color: 'var(--danger, #c8433f)' }
  };

  let motorSkillType = 'fine'; // 'fine' | 'gross'
  let motorAssessmentCache = null; // null | 'loading' | 'error:...' | { ratings: {pupilId:{fine:{June:'G'}, gross:{...}}}, notes: {pupilId:{fine:'..', gross:'..'}} }
  let motorPendingSaves = 0;
  let motorSaveMessage = '';

  // ---------------------------------------------------------------
  // FINE & GROSS MOTOR — IMPORT. Reads the same layout as the Fine /
  // Gross Motor Assessment sheets: a header row with ROLL NO. ·
  // STUDENT NAME · JUNE … OCTOBER · TEACHER NOTES, then one row per
  // child. An .xlsx can hold both sheets (tabs named FINE MOTOR /
  // GROSS MOTOR); a .csv is one sheet and goes to whichever sheet is
  // selected above. Children are matched by name against THIS class's
  // roll — any name not on the roll is listed and skipped, never
  // created. Nothing is saved until the preview is confirmed.
  // ---------------------------------------------------------------
  let motorImportOpen = false;
  let pendingMotorImport = null; // { ratings:[...], notes:[...], summary }

  // Small CSV reader that respects quoted cells, so a teacher note
  // containing a comma stays in one column.
  function parseCsvRows(text){
    const rows = []; let row = [], cell = '', inQuotes = false;
    for(let i = 0; i < text.length; i++){
      const ch = text[i];
      if(inQuotes){
        if(ch === '"' && text[i + 1] === '"'){ cell += '"'; i++; }
        else if(ch === '"') inQuotes = false;
        else cell += ch;
      } else if(ch === '"') inQuotes = true;
      else if(ch === ','){ row.push(cell.trim()); cell = ''; }
      else if(ch === '\n' || ch === '\r'){
        if(ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell.trim()); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if(cell !== '' || row.length){ row.push(cell.trim()); rows.push(row); }
    return rows.filter(r => r.some(c => c !== ''));
  }

  async function readMotorFileSheets(file){
    if(/\.xlsx$/i.test(file.name)){
      if(typeof XLSX === 'undefined') throw new Error('.xlsx support did not load (no internet reached the CDN) — try a .csv file instead.');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      return wb.SheetNames.map(n => ({
        name: n,
        rows: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' }).map(r => r.map(c => String(c).trim()))
      }));
    }
    return [{ name: file.name, rows: parseCsvRows(await file.text()) }];
  }

  function motorTypeForSheet(sheet, singleSheet){
    const hay = (sheet.name + ' ' + sheet.rows.slice(0, 4).map(r => r.join(' ')).join(' ')).toLowerCase();
    if(hay.includes('fine')) return 'fine';
    if(hay.includes('gross')) return 'gross';
    return singleSheet ? motorSkillType : null; // a lone unlabelled sheet goes to the sheet selected on screen
  }

  const MOTOR_WORD_TO_RATING = { G: 'G', Y: 'Y', R: 'R', ACHIEVED: 'G', DEVELOPING: 'Y', 'NEEDS SUPPORT': 'R' };

  // Returns { ratings, notes, problems, matched:Set, unmatched:[] } for one sheet.
  function parseMotorSheet(rows, type){
    const out = { ratings: [], notes: [], problems: [], matched: new Set(), unmatched: [] };
    const headerIdx = rows.findIndex(r => r.some(c => c.toLowerCase() === 'student name'));
    if(headerIdx < 0){ out.problems.push('No "STUDENT NAME" header row found.'); return out; }
    const header = rows[headerIdx].map(c => c.toLowerCase());
    const nameCol = header.indexOf('student name');
    const notesCol = header.findIndex(c => c.startsWith('teacher note') || c === 'notes');
    const monthCols = {};
    MOTOR_MONTHS.forEach(m => { const i = header.indexOf(m.toLowerCase()); if(i >= 0) monthCols[m] = i; });
    if(!Object.keys(monthCols).length){ out.problems.push('No month columns (JUNE … OCTOBER) found in the header row.'); return out; }

    const byName = {};
    realPupilsCache.forEach(p => { byName[p.name.trim().toLowerCase().replace(/\s+/g, ' ')] = p; });

    for(let i = headerIdx + 1; i < rows.length; i++){
      const row = rows[i];
      const rawName = (row[nameCol] || '').trim();
      if(!rawName) continue; // the activity-description row under the header, or a blank line
      const pupil = byName[rawName.toLowerCase().replace(/\s+/g, ' ')];
      if(!pupil){ out.unmatched.push(rawName); continue; }
      out.matched.add(pupil.id);
      Object.entries(monthCols).forEach(([m, col]) => {
        const cell = (row[col] || '').trim().toUpperCase();
        if(!cell) return; // blank = leave whatever is saved
        const rating = MOTOR_WORD_TO_RATING[cell];
        if(!rating){ out.problems.push(`${rawName}, ${m}: "${row[col]}" isn't G, Y or R — skipped`); return; }
        out.ratings.push({ pupil_id: pupil.id, skill_type: type, month: m, rating });
      });
      if(notesCol >= 0 && (row[notesCol] || '').trim()){
        out.notes.push({ pupil_id: pupil.id, skill_type: type, note: row[notesCol].trim() });
      }
    }
    return out;
  }

  async function previewMotorImport(){
    const input = document.getElementById('motorImportInput');
    const resultEl = document.getElementById('motorImportResult');
    pendingMotorImport = null;
    if(!input.files.length){ resultEl.innerHTML = '<div class="au-error">Choose a .xlsx or .csv file first.</div>'; return; }
    resultEl.innerHTML = '<p class="sub">Reading file…</p>';
    let sheets;
    try { sheets = await readMotorFileSheets(input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }

    const ratings = [], notes = [], sheetLines = [], problems = [];
    const unmatched = new Set();
    sheets.forEach(sheet => {
      if(!sheet.rows.length) return;
      const type = motorTypeForSheet(sheet, sheets.length === 1);
      if(!type){ problems.push(`Sheet "${sheet.name}": can't tell if it's Fine or Gross Motor — name the tab FINE MOTOR or GROSS MOTOR.`); return; }
      const res = parseMotorSheet(sheet.rows, type);
      ratings.push(...res.ratings); notes.push(...res.notes);
      res.unmatched.forEach(n => unmatched.add(n));
      res.problems.forEach(p => problems.push(`Sheet "${sheet.name}": ${p}`));
      sheetLines.push(`<li><b>${type === 'fine' ? 'Fine Motor' : 'Gross Motor'}</b> (sheet "${esc(sheet.name)}") — ${res.ratings.length} rating${res.ratings.length === 1 ? '' : 's'}, ${res.notes.length} note${res.notes.length === 1 ? '' : 's'}, ${res.matched.size} child${res.matched.size === 1 ? '' : 'ren'} matched</li>`);
    });

    let html = '';
    if(ratings.length || notes.length){
      pendingMotorImport = { ratings, notes };
      html += `<div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
        <p style="margin:0 0 8px; font-weight:600;">Preview — nothing has been saved yet</p>
        <ul style="margin:0 0 10px 18px; padding:0; font-size:13px;">${sheetLines.join('')}</ul>
        <p class="cap" style="margin:0 0 10px;">Ratings in the file replace what's saved for that child and month. Blank cells in the file leave the saved rating as it is.</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="confirmMotorImport()">Confirm import — save ${ratings.length} rating${ratings.length === 1 ? '' : 's'}${notes.length ? ' and ' + notes.length + ' note' + (notes.length === 1 ? '' : 's') : ''}</button>
          <button class="btn" onclick="cancelMotorImport()">Cancel</button>
        </div>
      </div>`;
    } else {
      html += '<div class="au-error">Nothing in this file could be imported for this class.</div>';
    }
    if(unmatched.size){
      html += `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:10px 12px; margin-top:10px; font-size:12.5px;"><b>${unmatched.size} name${unmatched.size === 1 ? '' : 's'} not on this class's roll — skipped:</b><br>${[...unmatched].slice(0, 30).map(esc).join(', ')}${unmatched.size > 30 ? ' …' : ''}<br>Names must match the roll exactly. "Download sheet to fill in" gives a file with your class's names already in it.</div>`;
    }
    if(problems.length){
      html += `<div class="au-error" style="margin-top:8px;">${problems.slice(0, 20).map(esc).join('<br>')}${problems.length > 20 ? '<br>…and ' + (problems.length - 20) + ' more' : ''}</div>`;
    }
    resultEl.innerHTML = html;
  }

  function cancelMotorImport(){
    pendingMotorImport = null;
    const resultEl = document.getElementById('motorImportResult');
    if(resultEl) resultEl.innerHTML = '<p class="cap">Import cancelled — nothing was saved.</p>';
  }

  async function confirmMotorImport(){
    const resultEl = document.getElementById('motorImportResult');
    if(!pendingMotorImport){ resultEl.innerHTML = '<div class="au-error">Preview a file first.</div>'; return; }
    const { ratings, notes } = pendingMotorImport;
    resultEl.innerHTML = '<p class="sub">Saving…</p>';
    try{
      const res = await fetch('backend/assessment/motor/import_motor_assessment.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, ratings, notes })
      });
      const data = await res.json();
      if(data.status !== 'success'){ resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`; return; }
      pendingMotorImport = null;
      const fresh = await fetchMotorAssessment(); // show exactly what the database now holds
      if(typeof fresh !== 'string') motorAssessmentCache = fresh;
      motorSaveMessage = '✓ Imported ' + data.ratings_saved + ' rating' + (data.ratings_saved === 1 ? '' : 's') + (data.notes_saved ? ' and ' + data.notes_saved + ' note' + (data.notes_saved === 1 ? '' : 's') : '') + ' from the file.';
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
      alert(motorSaveMessage);
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }

  // The sheet to fill in — same layout as the source sheets, with this
  // class's own children and anything already saved, so a teacher can
  // fill it offline and import it straight back.
  function downloadMotorImportTemplate(){
    if(typeof XLSX === 'undefined'){ alert('.xlsx support did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const wbOut = XLSX.utils.book_new();
    ['fine', 'gross'].forEach(type => {
      const rows = [
        [(myClassInfo.school_name || '') + ' | ' + (myClassInfo.class_name || '')],
        [type === 'fine' ? 'FINE MOTOR ASSESSMENT SHEET' : 'GROSS MOTOR ASSESSMENT SHEET'],
        ['School: ' + (myClassInfo.school_name || '') + '    Class: ' + (myClassInfo.class_name || '') + '    Academic Year: ' + new Date().getFullYear()],
        ['G = Achieved   |   Y = Developing   |   R = Needs Support'],
        [],
        ['ROLL NO.', 'STUDENT NAME', ...MOTOR_MONTHS.map(m => m.toUpperCase()), 'TEACHER NOTES'],
        ['', '', ...MOTOR_MONTHS.map(m => MOTOR_ACTIVITIES[type][m].title + '\n' + MOTOR_ACTIVITIES[type][m].detail), '']
      ];
      realPupilsCache.forEach((p, i) => rows.push([i + 1, p.name, ...MOTOR_MONTHS.map(m => motorRating(p.id, type, m) || ''), motorNote(p.id, type)]));
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{wch: 9}, {wch: 26}, ...MOTOR_MONTHS.map(() => ({wch: 25})), {wch: 30}];
      ws['!merges'] = [0, 1, 2, 3].map(r => ({ s: {r, c: 0}, e: {r, c: MOTOR_MONTHS.length + 2} }));
      XLSX.utils.book_append_sheet(wbOut, ws, type === 'fine' ? 'FINE MOTOR' : 'GROSS MOTOR');
    });
    XLSX.writeFile(wbOut, 'motor-assessment-to-fill-' + (myClassInfo.class_name || 'class').replace(/\s+/g, '') + '.xlsx');
  }

  function renderMotorImportCard(){
    const toggle = document.createElement('div');
    toggle.className = 'card';
    toggle.style.cssText = 'padding:0; margin-bottom:20px; overflow:hidden;';
    toggle.innerHTML = `
      <div onclick="motorImportOpen = !motorImportOpen; this.nextElementSibling.classList.toggle('hidden', !motorImportOpen); this.querySelector('.chevron').style.transform = motorImportOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import from a file</h3>
          <p class="cap" style="margin:0;">Bring in ratings and notes from a Fine / Gross Motor Assessment sheet (.xlsx or .csv), instead of tapping each one.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${motorImportOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${motorImportOpen ? '' : 'hidden'}" style="padding:0 18px 18px;">
        <p class="cap" style="margin:0 0 8px;">Use the same layout as the assessment sheet: a header row <b>ROLL NO. · STUDENT NAME · JUNE · JULY · AUGUST · SEPTEMBER · OCTOBER · TEACHER NOTES</b>, then one row per child with G, Y or R under each month. An .xlsx can hold both tabs (FINE MOTOR and GROSS MOTOR); a .csv goes to the sheet selected above (${motorSkillType === 'fine' ? 'Fine Motor' : 'Gross Motor'}). Names must match this class's roll — other names are skipped.</p>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:10px 0;">
          <input type="file" id="motorImportInput" accept=".xlsx,.csv" style="max-width:100%;" />
          <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="previewMotorImport()">Preview import</button>
          <button class="btn" onclick="downloadMotorImportTemplate()">⬇ Download sheet to fill in (.xlsx)</button>
        </div>
        <div id="motorImportResult" style="word-break:break-word; overflow-wrap:anywhere;"></div>
      </div>`;
    return toggle;
  }

  function ensureMotorAssessmentLoaded(reRenderFn){
    if(motorAssessmentCache && typeof motorAssessmentCache === 'object') return true;
    if(motorAssessmentCache === 'loading') return false;
    if(typeof motorAssessmentCache === 'string') return true; // error — shown with Retry
    if(!myClassInfo.class_id) return false;
    motorAssessmentCache = 'loading';
    fetchMotorAssessment().then(result => {
      motorAssessmentCache = result;
      if(reRenderFn) reRenderFn(); else renderMonthlyAssessment(monthlyAssessmentTargetEl);
    });
    return false;
  }
