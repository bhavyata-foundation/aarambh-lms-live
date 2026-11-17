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
  // (Removed: invented monthly grades.) Every child gets an empty entry —
  // nothing recorded until a teacher records it.
  function ensureMonthlyAssessmentSeeded(){
    (Array.isArray(realPupilsCache) ? realPupilsCache.map(p => p.name) : []).forEach(name => {
      if(!monthlyAssessmentEntries[name]) monthlyAssessmentEntries[name] = {};
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
        return `<button onclick="setWeeklyActivityQuickTier('${esc(name)}','${t}')" title="${TIER_INFO[t].n}" style="${gradeBtnStyle(t, active, 28)} margin:0 auto;">${gradeBtnLabel(active, t)}</button>`;
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
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>#</th><th>Type</th><th>Activity</th><th>CG</th><th>Page</th><th>Marked</th><th><span class="gd gd-B" style="width:20px; height:20px; font-size:10px;">B</span></th><th><span class="gd gd-P" style="width:20px; height:20px; font-size:10px;">P</span></th><th><span class="gd gd-A" style="width:20px; height:20px; font-size:10px;">A</span></th><th>Avg</th><th>% Advanced</th></tr></thead><tbody>';
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
    let sTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th><th>Activities assessed</th><th><span class="gd gd-B" style="width:20px; height:20px; font-size:10px;">B</span></th><th><span class="gd gd-P" style="width:20px; height:20px; font-size:10px;">P</span></th><th><span class="gd gd-A" style="width:20px; height:20px; font-size:10px;">A</span></th><th>Total score</th><th>Max possible</th><th>% Achievement</th><th>Band</th></tr></thead><tbody>';
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
      <div class="hd"><div><h3>Import Weekly Assessment from a file</h3><p class="cap">.csv or .xlsx — header row must be exactly: child_name,activity_no,tier — activity_no is 1-${WEEKLY_ASSESSMENT_ACTIVITIES.length} (matching the activity list above, in order), tier is B, P or A. Built for large rolls: one row per child per activity, so a 40-child class is 40 rows, not 40 columns.</p></div></div>
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
      head: [['#', 'Type', 'Activity', 'CG', 'Page', 'Marked', 'B Beginner', 'P Proficient', 'A Advanced', 'Avg', '% Advanced']],
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
      head: [['Child', 'Activities assessed', 'B Beginner', 'P Proficient', 'A Advanced', 'Total score', 'Max possible', '% Achievement', 'Band']],
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
  let preTestTypeFilter = 'Worksheet'; // 'Worksheet' | 'Classroom'
  let preTestSelectedActivityIdx = 0;
  // Kept per CLASS (storage key includes the class id), so two class
  // logins used on the same browser never see each other's counts.
  const preTestTallyEntries = {}; // activityIdx (string) -> {count_e, count_p, count_a}
  var preTestTallyLoadedFor = null;
  function ensurePreTestTallyForClass(){
    const cid = myClassInfo && myClassInfo.class_id;
    const term = typeof currentAssessTerm === 'function' ? currentAssessTerm() : 1;
    const loadKey = cid + '|' + term;
    if(!cid || preTestTallyLoadedFor === loadKey) return;
    Object.keys(preTestTallyEntries).forEach(k => delete preTestTallyEntries[k]);
    try {
      const raw = localStorage.getItem(preTestStorageKey(cid, term));
      if(raw) Object.assign(preTestTallyEntries, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
    // Child-wise Pre-Test records are the source of truth. Rebuild the
    // activity tallies from them whenever they exist, so class counts can
    // never drift away from individual child records.
    if(typeof preTestAssessmentEntries !== 'undefined' && typeof assessmentPupilNames === 'function'){
      Object.keys(preTestTallyEntries).forEach(k => delete preTestTallyEntries[k]);
      assessmentPupilNames().forEach(name => {
        const rec = preTestAssessmentEntries[name] || {};
        Object.keys(rec).forEach(k => {
          const v = rec[k] === 'E' ? 'B' : rec[k]; // migrate the old internal Beginner code once
          if(!preTestTallyEntries[k]) preTestTallyEntries[k] = {count_e:0,count_p:0,count_a:0};
          if(v === 'B') preTestTallyEntries[k].count_e++;
          else if(v === 'P') preTestTallyEntries[k].count_p++;
          else if(v === 'A') preTestTallyEntries[k].count_a++;
        });
      });
    }
    preTestTallyLoadedFor = loadKey;
  }
  // Term 1 keeps the original key (so tallies already entered stay where
  // they are); Term 2 has its own, so the two terms never overwrite each other.
  function preTestStorageKey(cid, term){ return 'preTestTallyEntries:' + cid + (term === 2 ? ':term2' : ''); }
  function savePreTestTallyEntries(){
    ensurePreTestTallyForClass();
    if(!myClassInfo || !myClassInfo.class_id) return;
    try { localStorage.setItem(preTestStorageKey(myClassInfo.class_id, typeof currentAssessTerm === 'function' ? currentAssessTerm() : 1), JSON.stringify(preTestTallyEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory only */ }
  }
  function setPreTestTallyCount(activityIdx, field, value){
    ensurePreTestTallyForClass();
    const key = String(activityIdx);
    if(!preTestTallyEntries[key]) preTestTallyEntries[key] = { count_e: 0, count_p: 0, count_a: 0 };
    preTestTallyEntries[key][field] = Math.max(0, parseInt(value, 10) || 0);
    savePreTestTallyEntries();
  }
/* ===== teacher-part-10.js ===== */
/* =========================================================================
   teacher-part-10.js — part 10 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */
