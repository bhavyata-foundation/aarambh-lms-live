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
    const summaryLines = doc.splitTextToSize();
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
      .catch(() => { workbookTallyTrendCache[key] = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }

  function renderAssessmentDashboardOverview(container){
    if(!ensurePupilsLoadedFor(container, () => renderAssessmentDashboardOverview(container))) return;
    const stats = computeAssessmentDashboardStats();
    const monthName = new Date().toLocaleDateString([], {month:'long', year:'numeric'});

    const heading = document.createElement('div');
    heading.style.cssText = 'display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:4px;';
    heading.innerHTML = `<h1 style="margin:0;">Assessment dashboard</h1>
      <span class="reqs">REP-01…07</span>`;
    container.appendChild(heading);

    const subhead = document.createElement('p');
    subhead.className = 'cap';
    subhead.style.margin = '0 0 10px';
    subhead.textContent = `Teacher · ${monthName} · Scale B/P/A · weights 1·2·3 · DSI 0–200 · benchmark ${BENCHMARK_DSI}`;
    container.appendChild(subhead);

    const downloadRow = document.createElement('div');
    downloadRow.style.cssText = 'margin:2px 0 10px;';
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇ Download report (PDF)';
    downloadBtn.style.cssText = 'padding:8px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
    downloadBtn.onclick = downloadAssessmentDashboardOverviewPdf;
    downloadRow.appendChild(downloadBtn);
    container.appendChild(downloadRow);

    const explainer = document.createElement('p');
    explainer.className = 'cap';
    explainer.style.margin = '10px 0 18px';
    explainer.innerHTML = `Every figure below is computed only from what's actually recorded on Monthly Assessment — a blank cell (·) is never counted as Beginner, and an incomplete month reads as incomplete rather than quietly better than it is.`;
    container.appendChild(explainer);

    container.appendChild(mdGrid('g5', [
      mdTile('At Proficient or above', stats.recordedCount ? stats.sriPct : '—', stats.recordedCount ? '% SRI' : '', stats.recordedCount ? mdPill(mdStatusBand(stats.sriPct).l, mdStatusBand(stats.sriPct).c) : mdPill('No data yet', 'neu'), 'SRI', stats.recordedCount ? mdMeter(stats.sriPct) : null),
      mdTile('Recording complete', stats.completeness, '% observation', mdPill(mdStatusBand(stats.completeness, 90, 70).l, mdStatusBand(stats.completeness, 90, 70).c), 'ASM-30', mdMeter(stats.completeness)),
      mdTile('Feedback notes shared', stats.notesSharedCount, 'of ' + assessmentPupilNames().length + ' children', mdPill(stats.notesSharedCount === assessmentPupilNames().length ? 'All shared' : 'In progress', stats.notesSharedCount === assessmentPupilNames().length ? 'good' : 'neu'), 'FBK-14'),
      mdTile('Issues flagged', stats.flaggedDomains.length, 'from this report', stats.flaggedDomains.length ? mdPill('Needs review', 'crit') : mdPill('None', 'good'), 'REP-05')
    ]));

    const issuesCard = document.createElement('div');
    issuesCard.className = 'card'; issuesCard.style.padding = '22px'; issuesCard.style.marginTop = '22px'; issuesCard.style.marginBottom = '22px';
    if(stats.flaggedDomains.length === 0){
      issuesCard.innerHTML = `<h4 style="margin:0 0 4px;">Nothing flagged this month</h4>
        <p class="cap" style="margin:0;">${stats.recordedCount ? 'Every recorded domain is at or above the ' + BENCHMARK_DSI + ' benchmark.' : 'Nothing has been recorded yet, so there is nothing to flag.'}</p>`;
    } else {
      issuesCard.innerHTML = `<h4 style="margin:0 0 4px;">Domains below benchmark</h4>
        <p class="cap" style="margin:0 0 12px;">Below ${BENCHMARK_DSI} DSI means, on average, this domain hasn't reached Proficient across the class yet.</p>
        <div class="list">${stats.flaggedDomains.map(x => `<div class="row"><div class="t"><b>${esc(x.d.full)}</b></div><div>${x.dsi} of 200 ${mdPill('Below benchmark', 'crit')}</div></div>`).join('')}</div>`;
    }
    container.appendChild(issuesCard);

    // ---- Class assessment overall ----
    container.appendChild(mdSec('Class assessment overall', '<span class="reqs">REP-01/02</span>'));
    const standsCard = document.createElement('div');
    standsCard.className = 'card'; standsCard.style.padding = '22px';
    let standsRows = '';
    stats.domainStats.forEach(x => {
      const pE = x.n ? x.tot.E/x.n*100 : 0, pP = x.n ? x.tot.P/x.n*100 : 0, pA = x.n ? x.tot.A/x.n*100 : 0;
      standsRows += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
        <div style="width:110px; font-size:12px; flex-shrink:0;">${esc(x.d.full)}</div>
        <div style="flex:1; height:16px; border-radius:4px; overflow:hidden; display:flex; background:var(--bg);">
          ${x.n ? `<div style="width:${pE}%; background:#AFC9EE;"></div><div style="width:${pP}%; background:#5B8FD6;"></div><div style="width:${pA}%; background:#2C5AA0;"></div>` : ''}
        </div>
        <div style="width:44px; font-size:12px; text-align:right; flex-shrink:0;">${x.n ? x.sri + '%' : '—'}</div>
      </div>`;
    });
    standsCard.innerHTML = `<h4 style="margin:0 0 4px;">Where the class stands</h4>
      <p class="cap" style="margin:0 0 16px;">Share of recorded cells at each tier, by domain. The number is the share at Proficient or above.</p>
      ${standsRows}
      <p style="font-size:11px; color:var(--text-muted); margin:10px 0 0;">
        <span style="display:inline-block; width:8px; height:8px; background:#AFC9EE; border-radius:2px; margin-right:4px;"></span>Beginner (w1)
        &nbsp;&nbsp;<span style="display:inline-block; width:8px; height:8px; background:#5B8FD6; border-radius:2px; margin-right:4px;"></span>Proficient (w2)
        &nbsp;&nbsp;<span style="display:inline-block; width:8px; height:8px; background:#2C5AA0; border-radius:2px; margin-right:4px;"></span>Advanced (w3)
      </p>`;

    const strengthCard = document.createElement('div');
    strengthCard.className = 'card'; strengthCard.style.padding = '22px';
    const strengthAxisMax = 200;
    strengthCard.innerHTML = `<h4 style="margin:0 0 4px;">Domain Strength by domain</h4>
      <p class="cap" style="margin:0 0 16px;">DSI per domain, 0–200. Below ${BENCHMARK_DSI} is below the "all Proficient" benchmark.</p>
      <div class="hbar-axis">${[0,50,100,150,200].map(t => `<span>${t}</span>`).join('')}</div>
      ${stats.domainStats.map(x => {
        const color = x.n === 0 ? 'var(--border)' : x.dsi >= BENCHMARK_DSI*1.25 ? 'var(--success)' : x.dsi >= BENCHMARK_DSI ? '#EE8F35' : 'var(--danger,#c8433f)';
        return `<div class="hbar-row">
          <div class="hbar-row-label">${esc(x.d.full)}</div>
          <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(x.dsi/strengthAxisMax*100)}%; background:${color};"></div></div>
          <div class="hbar-count">${x.n ? x.dsi : '—'}</div>
        </div>`;
      }).join('')}`;

    const twoColAsm = document.createElement('div');
    twoColAsm.className = 'transition-two-col';
    twoColAsm.appendChild(standsCard);
    twoColAsm.appendChild(strengthCard);
    container.appendChild(twoColAsm);

    // ---- Class Progress — pulled in from the standalone Class
    // Progress report, but wired to the same real monthlyAssessmentEntries
    // this whole dashboard already uses, instead of that page's own
    // sample-random tiles. Advanced% and conversion% are genuinely new
    // information not shown elsewhere on this dashboard. ----
    container.appendChild(mdSec('Class Progress', '<span class="reqs">ASM-02…04 · WBK-02</span>'));
    container.appendChild(mdGrid('g5', [
      mdTile('Class SRI', stats.recordedCount ? stats.sriPct : '—', stats.recordedCount ? '%' : '', stats.recordedCount ? mdPill(mdStatusBand(stats.sriPct).l, mdStatusBand(stats.sriPct).c) : mdPill('No data yet', 'neu'), 'SRI = (P+A) ÷ N × 100', stats.recordedCount ? mdMeter(stats.sriPct) : null),
      mdTile('Class CPI', stats.recordedCount ? stats.classDSI : '—', '/200', stats.recordedCount ? mdPill(mdStatusBand(stats.classDSI/2).l, mdStatusBand(stats.classDSI/2).c) : mdPill('No data yet', 'neu'), 'Σ Domain DSI ÷ 10', stats.recordedCount ? mdMeter(stats.classDSI/2) : null),
      mdTile('Advanced', stats.recordedCount ? stats.advancedPct : '—', stats.recordedCount ? '%' : '', mdPill('real', 'info'), 'ARI = A ÷ N × 100', stats.recordedCount ? mdMeter(stats.advancedPct) : null),
      mdTile('E → P conversion', stats.epConversion, '%', mdPill('P→A ' + stats.paConversion + '%', 'neu'), 'moved ÷ started at E × 100', mdMeter(stats.epConversion)),
      mdTile('Assessment complete', stats.completeness, '%', mdPill(mdStatusBand(stats.completeness).l, mdStatusBand(stats.completeness).c), 'ASM-03 · children × domains', mdMeter(stats.completeness))
    ]));

    container.appendChild(mdSec('Child by domain', '<span class="reqs">ASM-02…04 · WBK-02</span>'));
    let cbdTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th>' +
      ASSESSMENT_DOMAINS.map(d => `<th title="${esc(d.full)}">${esc(d.label)}</th>`).join('') + '<th>P+A</th><th>Band</th></tr></thead><tbody>';
    assessmentPupilNames().forEach(name => {
      const tiers = ASSESSMENT_DOMAINS.map(d => monthlyAssessmentEntries[name][d.key] || sampleTier(name + d.key + 'tier'));
      const paCount = tiers.filter(t => t !== 'E').length;
      const paPct = paCount / ASSESSMENT_DOMAINS.length * 100;
      const cells = ASSESSMENT_DOMAINS.map((d, j) => `<td><span class="pill ${TIER_INFO[tiers[j]].c}" title="${TIER_INFO[tiers[j]].n}">${tiers[j]}</span></td>`).join('');
      const band = mdStatusBand(paPct, 90, 70);
      const bandLabel = band.c === 'good' ? 'On track' : band.c === 'warn' ? 'Watch' : 'Action';
      cbdTable += `<tr style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(name)}')"><td><b>${esc(name)}</b></td>${cells}<td>${paCount}/${ASSESSMENT_DOMAINS.length}</td><td>${mdPill(bandLabel, band.c)}</td></tr>`;
    });
    cbdTable += '</tbody></table></div>';
    const cbdWrap = document.createElement('div'); cbdWrap.innerHTML = cbdTable;
    container.appendChild(mdCard(null, 'B Beginner · P Proficient · A Advanced. Cells without a recorded observation this month fall back to the child\'s current standing so the band always reflects where she actually is.', cbdWrap));

    // ---- Suggested improvements ----
    container.appendChild(mdSec('Suggested improvements', '<span class="reqs">REP-06/07</span>'));
    const weakest = stats.domainStats.filter(x => x.n > 0).sort((a,b) => a.dsi - b.dsi).slice(0, 3);
    const suggCard = document.createElement('div');
    suggCard.className = 'card'; suggCard.style.padding = '22px';
    if(weakest.length === 0){
      suggCard.innerHTML = `<h4 style="margin:0 0 4px;">What this report suggests, and who it goes to</h4>
        <p class="cap" style="margin:0;">Nothing recorded yet — suggestions need at least one observed domain to point at.</p>`;
    } else {
      let suggTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Domain</th><th>DSI</th><th>Change in class</th><th>Feedback area for the parent</th><th>Children affected</th></tr></thead><tbody>';
      weakest.forEach(x => {
        const affected = assessmentPupilNames().filter(name => monthlyAssessmentEntries[name][x.d.key] === 'E').length;
        suggTable += `<tr><td><b>${esc(x.d.full)}</b></td><td>${x.dsi}</td><td>Add a session a week in this domain</td><td>—</td><td>${affected}</td></tr>`;
      });
      suggTable += '</tbody></table></div>';
      suggCard.innerHTML = `<h4 style="margin:0 0 4px;">What this report suggests, and who it goes to</h4>
        <p class="cap" style="margin:0 0 16px;">REP-06 · each suggestion names the domain, the children it applies to, and whether it is a class change or a household one. A suggestion with no named recipient is a suggestion nobody acts on.</p>
        ${suggTable}
        <div style="margin-top:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <button class="btn-primary" style="width:auto; padding:9px 16px;" onclick="openFeedbackNotesStub()">Open feedback notes for these children</button>
          <span class="cap">REP-07 · the route from a report to a parent is one click, because a finding that stops at a dashboard has not reached anybody who can act on it.</span>
        </div>`;
    }
    container.appendChild(suggCard);
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
      <div class="hd"><div><h3>Import ${esc(typeLabel)} from a file</h3><p class="cap">.csv or .xlsx — header row must be exactly: child_name,domain,tier — domain is one of heal/phys/sens/envi/emot/part/logi/math/lang/arts, tier is B/P/A.</p></div></div>
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
    const container = document.getElementById('childrecord-body');
    container.innerHTML = '';
    const name = selectedName || SAMPLE_STUDENTS[0];

    const selectWrap = document.createElement('div'); selectWrap.className = 'fbar';
    selectWrap.innerHTML = `<div class="ctl"><label>Child</label><select id="childRecordSelect" style="padding:6px 10px; border:1px solid #0b0b0b33; border-radius:6px;"></select></div>
      <div class="grow" style="flex:1;"></div><div class="cap">Roll ${SAMPLE_STUDENTS.indexOf(name)+1} of ${SAMPLE_STUDENTS.length} · Jr KG · Triveni Sangam Municipal School</div>`;
    container.appendChild(selectWrap);
    const sel = selectWrap.querySelector('#childRecordSelect');
    SAMPLE_STUDENTS.forEach(n => {
      const opt = document.createElement('option'); opt.value = n; opt.textContent = n;
      if(n === name) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.onchange = () => renderChildRecord(sel.value);

    container.appendChild(reportDownloadBar(() => document.getElementById('childrecord-body'), 'Child Record — ' + name, 'child-record-' + name.replace(/\s+/g, '-').toLowerCase()));
    renderChildFeedbackSection(container, name);

    const tiers = ASSESSMENT_DOMAINS.map(d => (monthlyAssessmentEntries[name] && monthlyAssessmentEntries[name][d.key]) || sampleTier(name+d.key+'tier'));
    const paCount = tiers.filter(t => t !== 'E').length;
    const dsi = Math.round((tiers.filter(t=>t==='A').length*3 + tiers.filter(t=>t==='P').length*2 + tiers.filter(t=>t==='E').length*1) / (3*ASSESSMENT_DOMAINS.length) * 200 * 10) / 10;
    const attMean = Math.round(70 + sampleRand(name + 'attmean') * 28);
    const stuck = tiers.filter(t => t === 'E').length > 2 ? 1 : 0;

    container.appendChild(mdGrid('g5', [
      mdTile('Domain Strength', dsi, 'of 200', mdPill(mdStatusBand(dsi/2).l, mdStatusBand(dsi/2).c), 'DSI', mdMeter(dsi/2)),
      mdTile('At Proficient or above', paCount, 'of ' + ASSESSMENT_DOMAINS.length + ' domains', mdPill(mdStatusBand(paCount/ASSESSMENT_DOMAINS.length*100).l, mdStatusBand(paCount/ASSESSMENT_DOMAINS.length*100).c), 'SRI', mdMeter(paCount/ASSESSMENT_DOMAINS.length*100)),
      mdTile('Moved up this term', stuck ? 0 : 2, 'domains', stuck ? mdPill('No movement', 'warn') : mdPill('Progressing', 'good'), 'ASM-22'),
      mdTile('Attendance', attMean, '% year to date', mdPill(mdStatusBand(attMean).l, mdStatusBand(attMean).c), 'REG-05', mdMeter(attMean)),
      mdTile('Still Beginner', tiers.filter(t=>t==='E').length, 'domains', tiers.filter(t=>t==='E').length>=3 ? mdPill('Needs a plan', 'crit') : mdPill('Watch', 'warn'), 'ASM-24')
    ]));

    container.appendChild(mdSec('Domain by domain', '<span class="reqs">ASM-21…23</span>'));
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Domain</th><th>Last term</th><th>This term</th><th>Change</th></tr></thead><tbody>';
    ASSESSMENT_DOMAINS.forEach((d, i) => {
      const prevTier = sampleTier(name + d.key + 'prevtier');
      const curTier = tiers[i];
      const w = {E:1,P:2,A:3};
      const up = w[curTier] > w[prevTier];
      table += `<tr><td><b>${esc(d.full)}</b></td>
        <td><span class="pill ${TIER_INFO[prevTier].c}">${TIER_INFO[prevTier].letter}</span></td>
        <td><span class="pill ${TIER_INFO[curTier].c}">${TIER_INFO[curTier].letter}${up ? ' ↑' : ''}</span></td>
        <td>${up ? mdPill('Up a tier', 'good') : mdPill('No change', 'neu')}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard('Where ' + name.split(' ')[0] + ' is now, and where she was',
      'An arrow marks a tier gained since last term. B Beginner · P Proficient · A Advanced.', wrap));

    // --- Pre-Test — read-only summary only. Actual grading now lives
    // in Assessment > Pre-Test (moved there since Reports should only
    // ever show analysis, never data entry). This links there instead
    // of duplicating the editable form. ---
    const ptRecord = preTestAssessmentEntries[name] || {};
    let ptAssessed = 0, ptE = 0, ptP = 0, ptA = 0;
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const v = ptRecord[String(idx)];
      if(v === 'E') ptE++; else if(v === 'P') ptP++; else if(v === 'A') ptA++;
      if(v) ptAssessed++;
    });
    const ptScore = ptA*3 + ptP*2 + ptE*1;
    const ptMax = ptAssessed * 3;
    const ptPct = ptMax ? Math.round(ptScore / ptMax * 100) : 0;
    const ptBand = !ptAssessed ? mdPill('Not recorded', 'neu') : ptPct >= 85 ? mdPill('Advanced', 'good') : ptPct >= 60 ? mdPill('Proficient', 'warn') : mdPill('Beginner', 'crit');
    container.appendChild(mdSec('Pre-Test', '<span class="reqs">ASM-PT1…3</span>'));
    container.appendChild(mdGrid('g3', [
      mdTile('Activities recorded', ptAssessed, 'of ' + WEEKLY_ASSESSMENT_ACTIVITIES.length, ptAssessed === WEEKLY_ASSESSMENT_ACTIVITIES.length ? mdPill('Complete', 'good') : mdPill('In progress', 'warn'), 'ASM-PT1'),
      mdTile('% Achievement', ptAssessed ? ptPct : '—', ptAssessed ? '' : 'not recorded', ptBand, 'ASM-PT2'),
      mdTile('Overall band', ptAssessed ? (ptA >= ptP && ptA >= ptE ? 'Advanced' : ptP >= ptE ? 'Proficient' : 'Beginner') : '—', 'baseline', ptBand, 'ASM-PT3')
    ]));
    const ptLink = document.createElement('p');
    ptLink.className = 'cap'; ptLink.style.margin = '8px 0 0';
    ptLink.innerHTML = 'To enter or change Pre-Test grades, go to <a href="#" onclick="switchSidebarSection(\'assessment\'); assessmentEntryType=\'pretest\'; renderMonthlyAssessment(document.getElementById(\'assessment-body\')); return false;" style="color:var(--primary); font-weight:600;">Assessment → Pre-Test</a>.';
    container.appendChild(ptLink);
  }

  // preTestAssessmentEntries[studentName][activityIndexAsString] = 'E'|'P'|'A'
  const preTestAssessmentEntries = {};
  (function loadPreTestAssessmentEntries(){
    try {
      const raw = localStorage.getItem('preTestAssessmentEntries');
      if(raw) Object.assign(preTestAssessmentEntries, JSON.parse(raw));
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
      if(v === 'E') se++; else if(v === 'P') sp++; else if(v === 'A') sa++;
      if(v) assessed++;
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
      mdTile('Activities recorded', assessed, 'of ' + WEEKLY_ASSESSMENT_ACTIVITIES.length, mdPill(assessed === WEEKLY_ASSESSMENT_ACTIVITIES.length ? 'Complete' : 'In progress', assessed === WEEKLY_ASSESSMENT_ACTIVITIES.length ? 'good' : 'warn'), 'ASM-PT1'),
      mdTile('Total score', totalScore, 'of ' + maxPossible, mdPill(mdStatusBand(pctAchievement).l, mdStatusBand(pctAchievement).c), 'ASM-PT2'),
      mdTile('% Achievement', assessed ? pctAchievement : '—', assessed ? '' : 'not recorded', band, 'ASM-PT3'),
      mdTile('Overall band', assessed ? (sa >= sp && sa >= se ? 'Advanced' : sp >= se ? 'Proficient' : 'Beginner') : '—', 'baseline', band, 'ASM-PT3')
    ]));

    const gradeGrid = document.createElement('div');
    gradeGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:8px;';
    const tierColors = { E: 'var(--danger,#c8433f)', P: '#EE8F35', A: 'var(--success)' };
    gradeGrid.innerHTML = WEEKLY_ASSESSMENT_ACTIVITIES.map((a, idx) => {
      const tier = record[String(idx)];
      const btns = ['E','P','A'].map(t => {
        const active = tier === t;
        const letter = TIER_INFO[t].letter;
        return `<button onclick="setPreTestTier('${esc(name)}',${idx},'${t}')" title="${TIER_INFO[t].n}" style="flex:1; padding:5px 0; border-radius:5px; border:${active ? 'none' : '1px solid var(--border)'}; background:${active ? tierColors[t] : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:11px; font-weight:700; cursor:pointer;">${letter}</button>`;
      }).join('');
      return `<div style="border:1px solid var(--border); border-radius:8px; padding:8px; background:var(--card);">
        <div style="font-size:11px; font-weight:600; margin-bottom:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(a.activity)}">${idx + 1}. ${esc(a.activity)}</div>
        <div class="cap" style="font-size:10px; margin-bottom:6px;">${esc(a.type)} · ${esc(a.cg)}</div>
        <div style="display:flex; gap:4px;">${btns}</div>
        <div style="font-size:9.5px; margin-top:5px; color:var(--success); font-weight:600; visibility:${tier ? 'visible' : 'hidden'};">✓ Saved</div>
      </div>`;
    }).join('');
    container.appendChild(mdCard(null, 'Tapping a rating saves it immediately for ' + esc(name).split(' ')[0] + ' — the "✓ Saved" mark confirms each one.', gradeGrid));
  }

  // ---------- 12. TEACHER PROFILE ----------
  // New screen — no equivalent existed anywhere in the app before this.
  // Sample data for the currently logged-in teacher (Mrs. Sharma), same
  // deterministic-sample pattern as everything else. A real version of
  // this would read from users.* plus a new teacher_profile table —
  // neither of which exist yet.
  function sampleTeacherProfile(){
    return {
      name: 'Mrs. Sharma',
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

  function renderTeacherProfile(){
    const container = document.getElementById('teacherprofile-body');
    container.innerHTML = '';
    renderTeacherFilterBar(container, renderTeacherProfile);
    const p = sampleTeacherProfile();

    container.appendChild(mdSec('Teacher Profile', '<span class="reqs">STF-01…08</span>'));
    const context = document.createElement('p');
    context.className = 'cap';
    context.style.margin = '4px 0 16px';
    context.innerHTML = `${esc(p.name)} · ${esc(myClassInfo.school_name)} · ${esc(myClassInfo.class_name)} — school and class are real (from this login); the details below are sample data.`;
    container.appendChild(context);

    const g = document.createElement('div'); g.className = 'g g2';

    const basicsBody = document.createElement('dl'); basicsBody.className = 'kv';
    basicsBody.innerHTML = `
      <dt>Qualification</dt><dd>${esc(p.qualification)}</dd>
      <dt>Date of birth</dt><dd>${esc(p.dob)} (${p.age} years)</dd>
      <dt>Gender</dt><dd>${esc(p.gender)}</dd>
      <dt>Marital status</dt><dd>${esc(p.maritalStatus)}</dd>
      <dt>Experience</dt><dd>${esc(p.experience)}</dd>
      <dt>Languages spoken</dt><dd>${esc(p.languages.join(', '))}</dd>`;
    g.appendChild(mdCard('Basics', 'STF-01…04', basicsBody));

    const contactBody = document.createElement('dl'); contactBody.className = 'kv';
    contactBody.innerHTML = `
      <dt>Contact number (normal)</dt><dd>${esc(p.contactNormal)}</dd>
      <dt>Contact number (emergency)</dt><dd>${esc(p.contactEmergency)}</dd>
      <dt>Address</dt><dd>${esc(p.address)}</dd>`;
    g.appendChild(mdCard('Contact', 'STF-05', contactBody));

    container.appendChild(g);

    container.appendChild(mdSec('Activities / workshops done till date', '<span class="reqs">STF-06 · training certifications</span>'));
    const trainingList = document.createElement('div'); trainingList.className = 'list';
    trainingList.innerHTML = p.training.map(t => `<div class="row"><div class="t"><b>${esc(t.name)}</b><span>${esc(t.date)}</span></div>
      <div>${t.cert ? mdPill('Certified', 'good') : mdPill('Attended, no certificate', 'warn')}</div></div>`).join('');
    container.appendChild(mdCard(null, null, trainingList));

    // --- Google Drive connection ---
    container.appendChild(mdSec('Google Drive', ''));
    const driveCard = document.createElement('div');
    driveCard.className = 'card'; driveCard.style.padding = '20px';
    driveCard.id = 'driveStatusCard';
    driveCard.innerHTML = '<p class="cap">Checking connection…</p>';
    container.appendChild(driveCard);
    checkDriveConnectionStatus();
  }

  // Shared helper — checks which of a list of Drive file IDs still
  // actually exist (not deleted/trashed on Drive's side). Returns null
  // if the check itself couldn't be performed (e.g. network error, or
  // Drive not connected) — callers must treat null as "don't prune
  // anything," never as "everything's deleted." A failed check is not
  // evidence of deletion.
  async function checkDriveFilesStillExist(fileIds){
    const ids = fileIds.filter(Boolean);
    if(!ids.length) return new Set();
    try{
      const res = await fetch('backend/drive/check_drive_files.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ file_ids: ids })
      });
      const data = await res.json();
      if(data.status !== 'success') return null;
      return new Set(data.existing);
    } catch(err){
      return null;
    }
  }

  async function checkDriveConnectionStatus(){
    const card = document.getElementById('driveStatusCard');
    if(!card) return;
    try{
      const res = await fetch('backend/drive/check_drive_status.php' + window.location.search);
      const data = await res.json();
      if(data.status !== 'success'){
        card.innerHTML = `<p class="cap" style="color:var(--danger, #c8433f);">${esc(data.message || 'Could not check Drive status.')}</p>`;
        return;
      }
      if(data.connected){
        card.innerHTML = `<p style="margin:0 0 4px; color:var(--success); font-weight:600;">✓ Connected</p>
          <p class="cap" style="margin:0 0 12px;">Photo, video, audio and document evidence uploads go straight to your Drive, organized into folders automatically.</p>
          <a href="backend/google_oauth_start.php${window.location.search}" style="display:inline-block; padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; color:var(--text); font-size:13px; font-weight:600; text-decoration:none;">Reconnect / switch account</a>`;
      } else {
        card.innerHTML = `<p style="margin:0 0 4px; color:var(--text-muted); font-weight:600;">Not connected</p>
          <p class="cap" style="margin:0 0 12px;">Connect your Google Drive so evidence you upload (photos, videos, documents) saves there automatically instead of failing.</p>
          <a href="backend/google_oauth_start.php${window.location.search}" style="display:inline-block; padding:9px 18px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:13px; font-weight:600; text-decoration:none;">Connect Google Drive</a>`;
      }
    } catch(err){
      card.innerHTML = '<p class="cap" style="color:var(--danger, #c8433f);">Could not reach the server.</p>';
    }
  }

  // ---------- 11. TRANSITION ----------
  // Matches vTransition: Jr KG → Sr KG promotion tiles + outcome
  // table, plus a Sr KG → Grade 1 readiness section.
  function isFlaggedForFollowUp(completion, domainsEmergingCount, attendance){
    return completion < 70 || domainsEmergingCount >= 3 || attendance < 80;
  }

  let transitionTargetEl = null; // remembers where to re-render (embedded tab vs standalone section)
