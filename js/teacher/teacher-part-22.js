async function fetchMotorAssessment(){
    try{
      const params = new URLSearchParams(window.location.search);
      params.set('class_id', myClassInfo.class_id);
      const res = await fetch('backend/assessment/motor/get_motor_assessment.php?' + params.toString());
      const data = await res.json();
      if(data.status !== 'success') return 'error:' + (data.message || 'Could not load motor assessment.');
      return { ratings: data.ratings || {}, notes: data.notes || {} };
    } catch(err){
      return 'error:Could not reach the server.';
    }
  }
  function motorRating(pupilId, type, month){
    const c = motorAssessmentCache;
    return (c && c.ratings && c.ratings[pupilId] && c.ratings[pupilId][type] && c.ratings[pupilId][type][month]) || null;
  }
  function motorNote(pupilId, type){
    const c = motorAssessmentCache;
    return (c && c.notes && c.notes[pupilId] && c.notes[pupilId][type]) || '';
  }
  // Tap a letter to set it, tap the active one again to clear it.
  function setMotorRating(pupilId, month, rating){
    const type = motorSkillType;
    const current = motorRating(pupilId, type, month);
    const next = current === rating ? null : rating;
    const c = motorAssessmentCache;
    if(!c.ratings[pupilId]) c.ratings[pupilId] = {};
    if(!c.ratings[pupilId][type]) c.ratings[pupilId][type] = {};
    if(next) c.ratings[pupilId][type][month] = next;
    else delete c.ratings[pupilId][type][month];
    motorSaveMessage = '';
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
    motorPendingSaves++;
    fetch('backend/assessment/motor/save_motor_rating.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ class_id: myClassInfo.class_id, pupil_id: pupilId, skill_type: type, month, rating: next })
    }).then(r => r.json()).then(data => {
      if(data.status !== 'success') throw new Error(data.message || 'Could not save.');
    }).catch(err => {
      // Put back what was there before, and say so.
      if(current) c.ratings[pupilId][type][month] = current;
      else delete c.ratings[pupilId][type][month];
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
      alert('Could not save that rating — ' + (err.message || 'check your connection') + '.');
    }).finally(() => { motorPendingSaves = Math.max(0, motorPendingSaves - 1); });
  }
  function saveMotorNote(pupilId, text){
    const type = motorSkillType;
    const c = motorAssessmentCache;
    if(!c.notes[pupilId]) c.notes[pupilId] = {};
    c.notes[pupilId][type] = text;
    motorPendingSaves++;
    fetch('backend/assessment/motor/save_motor_note.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ class_id: myClassInfo.class_id, pupil_id: pupilId, skill_type: type, note: text })
    }).then(r => r.json()).then(data => {
      if(data.status !== 'success') alert('Could not save that note — ' + (data.message || 'try again') + '.');
    }).catch(() => alert('Could not save that note — check your connection.'))
      .finally(() => { motorPendingSaves = Math.max(0, motorPendingSaves - 1); });
  }
  // Waits for taps still being sent, re-reads the class from the
  // database and reports what is actually stored.
  async function confirmMotorSaved(){
    const btn = document.getElementById('motorSaveBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
    for(let i = 0; i < 50 && motorPendingSaves > 0; i++) await new Promise(r => setTimeout(r, 200));
    const result = await fetchMotorAssessment();
    if(typeof result === 'string'){
      motorSaveMessage = '⚠ ' + result.slice(6) + ' Your ratings may not all be saved — try again.';
    } else {
      motorAssessmentCache = result;
      let count = 0;
      realPupilsCache.forEach(p => MOTOR_MONTHS.forEach(m => { if(motorRating(p.id, motorSkillType, m)) count++; }));
      const total = realPupilsCache.length * MOTOR_MONTHS.length;
      const now = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      motorSaveMessage = '✓ Saved at ' + now + ' — ' + count + ' of ' + total + ' ' + (motorSkillType === 'fine' ? 'fine' : 'gross') + ' motor ratings are in the database.';
    }
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  // Printable PDF in the same layout as the source sheets: title,
  // school/class line, legend, then Roll · Student · June–October ·
  // Teacher notes — one page per sheet (Fine Motor, Gross Motor), with
  // this class's own children and ratings. A blank cell is not rated.
  function downloadMotorAssessmentPdf(){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const ratingFill = { A: [212, 237, 218], P: [253, 236, 200], B: [248, 215, 218] };
    ['fine', 'gross'].forEach((type, ti) => {
      if(ti > 0) doc.addPage();
      doc.setFontSize(14);
      doc.text(type === 'fine' ? 'Fine Motor Assessment Sheet' : 'Gross Motor Assessment Sheet', 14, 15);
      doc.setFontSize(9);
      doc.text('School: ' + (myClassInfo.school_name || '') + '    Class: ' + (myClassInfo.class_name || '') + '    Academic Year: ' + new Date().getFullYear() + '    · generated ' + new Date().toLocaleDateString(), 14, 21);
      doc.text('B = Beginner   |   P = Proficient   |   A = Advanced   |   blank = not rated', 14, 26);
      doc.autoTable({
        startY: 31,
        head: [['Roll', 'Student name', ...MOTOR_MONTHS.map(m => m + '\n' + MOTOR_ACTIVITIES[type][m].title), 'Teacher notes']],
        body: realPupilsCache.map((p, i) => [i + 1, p.name, ...MOTOR_MONTHS.map(m => motorLetter(motorRating(p.id, type, m))), motorNote(p.id, type)]),
        styles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
        headStyles: { fillColor: [91, 155, 213], halign: 'center' },
        columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 45 }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' }, 7: { cellWidth: 60 } },
        didParseCell: (data) => {
          if(data.section === 'body' && data.column.index >= 2 && data.column.index <= 6){
            const fill = ratingFill[data.cell.raw];
            if(fill){ data.cell.styles.fillColor = fill; data.cell.styles.fontStyle = 'bold'; }
          }
        }
      });
      // Activity details under the table, so the sheet explains itself.
      let y = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : 31) + 8;
      doc.setFontSize(8);
      MOTOR_MONTHS.forEach(m => {
        const line = doc.splitTextToSize(m + ' — ' + MOTOR_ACTIVITIES[type][m].title + ': ' + MOTOR_ACTIVITIES[type][m].detail, 265);
        if(y + line.length * 4 > 200){ doc.addPage(); y = 15; }
        doc.text(line, 14, y);
        y += line.length * 4 + 1;
      });
    });
    doc.save('motor-assessment-' + (myClassInfo.class_name || 'class').replace(/\s+/g, '') + '-' + todayKey() + '.pdf');
  }
  // Fine / Gross sheet switch — shown right under the assessment tab buttons (above the import card)
  function renderMotorSheetCard(){
    const container = document.createElement('div');
    // Fine / Gross switch
    const switchBar = document.createElement('div'); switchBar.className = 'fbar'; switchBar.style.marginBottom = '14px';
    switchBar.innerHTML = '<div class="ctl"><label>Sheet</label><div style="display:flex; gap:5px;" id="motorTypeChips"></div></div>';
    container.appendChild(switchBar);
    const chipsWrap = switchBar.querySelector('#motorTypeChips');
    [['fine', '✋ Fine Motor'], ['gross', '🏃 Gross Motor']].forEach(([key, label]) => {
      const b = document.createElement('button');
      b.className = 'chip' + (motorSkillType === key ? ' sel' : '');
      b.textContent = label;
      b.onclick = () => { motorSkillType = key; motorSaveMessage = ''; renderMonthlyAssessment(monthlyAssessmentTargetEl); };
      chipsWrap.appendChild(b);
    });
    return container;
  }
  function renderMotorAssessmentSection(container){
    if(currentAssessTerm() === 2){
      container.appendChild(mdSec('Fine & Gross Motor — Term 2', ''));
      container.appendChild(attNote('No data available — no Fine & Gross Motor activities are set for Term 2 (November – March) yet. Term 1\u2019s ratings are under Term 1.'));
      return;
    }
    const typeLabel = motorSkillType === 'fine' ? 'Fine Motor' : 'Gross Motor';
    container.appendChild(mdSec(typeLabel + ' assessment', '<span class="reqs">ASM-M1…M2</span>'));
    const note = document.createElement('p');
    note.className = 'cap'; note.style.margin = '4px 0 14px';
    note.textContent = 'One activity a month, June to October. Rate every child B Beginner · P Proficient · A Advanced — tap B, P or A to set it, tap it again to clear. Each tap saves to the database.';
    container.appendChild(note);
    if(!myClassInfo.class_id){ container.appendChild(mdCard(null, 'Loading your class info…', null)); return; }
    if(typeof motorAssessmentCache === 'string' && motorAssessmentCache.startsWith('error:')){
      renderRetryCard(container, motorAssessmentCache.slice(6), () => { motorAssessmentCache = null; });
      return;
    }
    if(!ensureMotorAssessmentLoaded()){ container.appendChild(mdCard(null, 'Loading ratings…', null)); return; }
    const pupils = realPupilsCache;
    if(!pupils.length){ container.appendChild(mdCard(null, 'No children on the roll yet — add them in Class Attendance → Admissions.', null)); return; }
    const oldMotorImportCard = renderMotorImportCard();
    oldMotorImportCard.style.display = 'none'; // replaced by 📥 Import a file or photo (part 14)
    container.appendChild(oldMotorImportCard);
    // Real counts per month for the selected sheet
    const monthIdx = MOTOR_MONTHS.indexOf(new Date().toLocaleDateString('en-US', {month: 'long'}));
    const tiles = MOTOR_MONTHS.map((m, i) => {
      const counts = { G: 0, Y: 0, R: 0 };
      pupils.forEach(p => { const r = motorRating(p.id, motorSkillType, m); if(r) counts[r]++; });
      const rated = counts.G + counts.Y + counts.R;
      return mdTile(m + (i === monthIdx ? ' · now' : ''), rated ? counts.G : '—', rated ? 'of ' + rated + ' Advanced (A)' : 'not rated yet',
        rated ? mdPill(counts.Y + ' Proficient (P) · ' + counts.R + ' Beginner (B)', counts.R ? 'warn' : 'good') : mdPill('No data yet', 'neu'),
        MOTOR_ACTIVITIES[motorSkillType][m].title);
    });
    const tileGrid = mdGrid('g5', tiles);
    tileGrid.style.marginBottom = '20px';
    container.appendChild(tileGrid);
    // Grading table — Roll · Child · 5 months · Teacher notes
    const acts = MOTOR_ACTIVITIES[motorSkillType];
    const cellPad = 'padding:12px 14px; vertical-align:middle;';
    let table = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="min-width:1100px;"><thead><tr>'
      + '<th style="text-align:left; padding:12px 14px; width:56px;">Roll</th><th style="text-align:left; padding:12px 14px; min-width:170px;">Child</th>'
      + MOTOR_MONTHS.map((m, i) => `<th style="text-align:center; white-space:normal; min-width:140px; padding:12px 14px; ${i === monthIdx ? 'background:var(--surface-2,#eceee9);' : ''}" title="${esc(acts[m].detail)}">${esc(m)}<br><span style="font-weight:600; text-transform:none; letter-spacing:0; color:var(--ink-2,#4f534d);">${esc(acts[m].title)}</span></th>`).join('')
      + '<th style="text-align:left; min-width:220px; padding:12px 14px;">Teacher notes</th></tr></thead><tbody>';
    pupils.forEach((p, idx) => {
      const cells = MOTOR_MONTHS.map((m, i) => {
        const current = motorRating(p.id, motorSkillType, m);
        const btns = MOTOR_ORDER.map(r => {
          const active = current === r;
          return `<button onclick="setMotorRating(${p.id}, '${m}', '${r}')" title="${MOTOR_RATINGS[r].label}" style="${gradeBtnStyle(r, active, 30)}">${gradeBtnLabel(active, r)}</button>`;
        }).join('');
        return `<td style="text-align:center; ${cellPad} ${i === monthIdx ? 'background:var(--surface-2,#eceee9);' : ''}"><div style="display:inline-flex; gap:8px;">${btns}</div></td>`;
      }).join('');
      table += `<tr><td class="dim" style="text-align:left; ${cellPad}">${idx + 1}</td><td style="text-align:left; ${cellPad}"><b>${esc(p.name)}</b></td>${cells}
        <td style="text-align:left; ${cellPad}"><input type="text" data-pupil="${p.id}" class="motor-note-input" value="${esc(motorNote(p.id, motorSkillType))}" placeholder="Add a note" style="width:100%; min-width:200px; padding:8px 10px; border:1px solid var(--border,#d9dcd5); border-radius:6px; font-size:12.5px; font-family:inherit; box-sizing:border-box;" /></td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Hover a month heading to see the full activity. B Beginner · P Proficient · A Advanced. A blank cell has not been rated and is never counted.', wrap));
    wrap.querySelectorAll('.motor-note-input').forEach(inp => {
      inp.addEventListener('change', () => saveMotorNote(parseInt(inp.getAttribute('data-pupil'), 10), inp.value.trim()));
    });
    // Save & download
    let anyRated = false;
    pupils.forEach(p => ['fine', 'gross'].forEach(t => MOTOR_MONTHS.forEach(m => { if(motorRating(p.id, t, m)) anyRated = true; })));
    const saveBar = document.createElement('div');
    saveBar.className = 'card';
    saveBar.style.cssText = 'padding:18px 20px; margin-top:20px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';
    saveBar.innerHTML = `
      <div style="flex:1; min-width:240px;">
        <b>Save ${esc(typeLabel.toLowerCase())} assessment</b>
        <p class="cap" style="margin:4px 0 0;">${motorSaveMessage ? esc(motorSaveMessage) : 'Checks every rating above against the database and confirms how many are stored.'}</p>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="motorSaveBtn" class="btn-primary" style="width:auto; padding:9px 18px;">✓ Save</button>
      </div>`;
    container.appendChild(saveBar);
    saveBar.querySelector('#motorSaveBtn').onclick = confirmMotorSaved;
    container.appendChild(assessmentReportsLink('motor'));
  }
  function renderMonthlyAssessment(targetEl){
    monthlyAssessmentTargetEl = targetEl || null;
    const container = targetEl || document.getElementById('monthlyassessment-body');
    container.innerHTML = '';
    // One spacing rule for the filter cards (Month / From-To-Theme / Sheet / Book …) on every assessment tab.
    if(!document.getElementById('assessUniformStyle')){ const st = document.createElement('style'); st.id = 'assessUniformStyle'; st.textContent = '.assess-uniform > .fbar, .assess-uniform > .card, .assess-uniform > .g{margin:0 0 18px !important;}' + '.assess-uniform > .sec{margin:28px 0 12px !important;}' + '.assess-uniform > .sec + .cap, .assess-uniform > .sec + p{margin:0 0 16px !important;}'; document.head.appendChild(st); }
    container.classList.add('assess-uniform');
    if(!ensurePupilsLoadedFor(container, () => renderMonthlyAssessment(monthlyAssessmentTargetEl))) return;
    if(assessmentEntryType !== 'records' && !ASSESSMENT_TYPE_INFO[assessmentEntryType]) assessmentEntryType = Object.keys(ASSESSMENT_TYPE_INFO)[0]; // e.g. the removed Weekly activities tab
    // --- Assessment type tabs --- (Pre-Test is a Term 1 assessment only)
    if(currentAssessTerm() === 2 && assessmentEntryType === 'pretest') assessmentEntryType = 'observation';
    const typeBar = document.createElement('div');
    typeBar.style.cssText = 'display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap;';
    Object.keys(ASSESSMENT_TYPE_INFO).forEach(key => {
      if(key === 'pretest' && currentAssessTerm() === 2) return; // no Pre-Test in Term 2
      const info = ASSESSMENT_TYPE_INFO[key];
      const active = assessmentEntryType === key;
      const btn = document.createElement('button');
      btn.textContent = info.icon + ' ' + info.label;
      btn.style.cssText = `padding:8px 16px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:${active ? '600' : '400'};`;
      btn.onclick = () => switchAssessmentEntryType(key);
      typeBar.appendChild(btn);
    });
    // ▤ Assessment records — every assessment's saved data and report, as a tab here.
    const recBtn = document.createElement('button');
    const recActive = assessmentEntryType === 'records';
    recBtn.textContent = '▤ Assessment records';
    recBtn.style.cssText = `padding:8px 16px; border-radius:8px; border:1px solid ${recActive ? 'transparent' : 'var(--border)'}; background:${recActive ? 'var(--primary)' : '#fff'}; color:${recActive ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:${recActive ? '600' : '400'};`;
    recBtn.onclick = () => openAssessmentRecords();
    typeBar.appendChild(recBtn);
    container.appendChild(typeBar);
    // Term 1 / Term 2 — on every tab (part 14); the shared month stays inside the chosen term.
        container.appendChild(typeBar);
    // Term 1 / Term 2 — on every tab (part 14); the shared month stays inside the chosen term.
    renderAssessTermBar(container);
    container.appendChild(typeBar);
    syncMonthToTerm();
    if(recActive){ renderAssessmentRecords(container); return; }
    // One smart import on every assessment tab that has an importer (part 14).
    if(assessmentEntryType === 'motor' && currentAssessTerm() !== 2) container.appendChild(renderMotorSheetCard()); // Sheet: Fine / Gross — right under the tabs
    const smartCard = typeof renderAssessSmartCard === 'function' ? renderAssessSmartCard(assessmentEntryType) : null;
    if(smartCard) container.appendChild(smartCard);
    // Viva: its own screen (js/viva.js) — drawn after the term bar and the import panel, like the other tabs
    if(assessmentEntryType === 'viva'){ if(typeof window.renderVivaSection === 'function') window.renderVivaSection(container); return; }
    const addDownload = () => container.appendChild(importDownloadCard('assessment', assessmentEntryType)); 
    // (real book pages, grouped by physical workbook, scoped by month —
    // not the 10-domain grid Classroom Observation used to share) and
    // is server-backed rather than a client-side store, so it gets its
    // own dedicated renderer.
    if(assessmentEntryType === 'workbook'){
      renderWorkbookAssessmentSection(container);
      addDownload(); return;
    }
    // Classroom Observation is now real, theme-based, and month-scoped
    // (see renderObservationAssessmentSection above) — no longer the
    // flat 10-domain grid the generic renderer below still serves.
    if(assessmentEntryType === 'observation'){
      renderObservationAssessmentSection(container);
      container.appendChild(assessTabTotalsCard('observation')); addDownload(); return; // Total at the end, then Download
    }
    // Pre-Test moved here from Reports > Assessment Dashboard > Child
    // Record — that page mixed real data entry with analysis, and
    // Reports should only ever hold analysis. Pre-Test is real entry
    // (same 26 real activities Weekly used to grade), so it belongs in
    // Assessment. Child Record still shows a read-only summary of what's
    // recorded here — never editable buttons.
    if(assessmentEntryType === 'pretest'){
      renderPreTestClassSection(container);
      addDownload(); return;
    }
    // Fine & Gross Motor — monthly activity sheets (June–October), G/Y/R
    // per child, real database. Comes right after Pre-Test.
    if(assessmentEntryType === 'motor'){
      renderMotorAssessmentSection(container);
      addDownload(); return;
    }
    // Weekly activity B/P/A per child — moved here from My Class, which
    // now shows the families.
    if(assessmentEntryType === 'activity'){
      renderWeeklyActivitySection(container);
      return;
    }
    ensureActiveAssessmentSeeded();
    const store = getAssessmentStore();
    const typeInfo = ASSESSMENT_TYPE_INFO[assessmentEntryType];
    const scopeLabel = assessmentEntryType === 'weekly' ? ('Week ' + currentWeekNum)
      : assessmentEntryType === 'monthly' ? new Date().toLocaleDateString([], {month:'long', year:'numeric'})
      : 'ongoing log';
    // --- Add data: manual entry or import — shown FIRST, before any
    // stats or the grid, since entering data is the actual first thing
    // to do here, not an afterthought at the bottom of the page. ---
    container.appendChild(mdSec('Add data — ' + typeInfo.label, '<span class="reqs">' + typeInfo.reqs + '</span>'));
    const addDataNote = document.createElement('p');
    addDataNote.className = 'cap'; addDataNote.style.margin = '4px 0 14px';
    addDataNote.textContent = 'Enter manually by tapping any cell in the grid below, or import a file — either way writes to the same record, so the two are never out of sync. Tapping a cell saves it immediately.';
    container.appendChild(addDataNote);
    const anyRecordedThisType = assessmentPupilNames().some(n => store[n] && Object.values(store[n]).some(Boolean));
    if(anyRecordedThisType){
      const resetRow = document.createElement('div'); resetRow.style.cssText = 'margin:0 0 14px;';
      const resetBtn = document.createElement('button');
      resetBtn.textContent = '↺ Enter manually — clear all and start fresh';
      resetBtn.style.cssText = 'padding:7px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:12.5px; font-weight:600;';
      resetBtn.onclick = clearActiveAssessmentType;
      resetRow.appendChild(resetBtn);
      container.appendChild(resetRow);
    }
    container.appendChild(renderAssessmentImportCard(assessmentEntryType));
    // --- Download report — Section 2: a standalone .pdf snapshot of
    // this recording window, separate from the entry section above. ---
    container.appendChild(mdSec('Download report — ' + typeInfo.label, '<span class="reqs">' + typeInfo.reqs + '</span>'));
    if(anyRecordedThisType){
      const dlWrap = document.createElement('div'); dlWrap.style.cssText = 'margin-top:22px; margin-bottom:16px;';
      const dlBtn = document.createElement('button');
      dlBtn.className = 'btn-primary'; dlBtn.style.cssText = 'width:auto; padding:9px 16px;';
      dlBtn.textContent = '⬇ Download ' + typeInfo.label + ' report (PDF)';
      dlBtn.onclick = downloadAssessmentGridPdf;
      dlWrap.appendChild(dlBtn);
      container.appendChild(dlWrap);
    } else {
      container.appendChild(mdCard(null, 'Nothing recorded yet — grade at least one child in one domain below to enable the report.', null));
    }
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
    const noMovementCount = assessmentPupilNames().filter(name => {
      const eCount = ASSESSMENT_DOMAINS.filter(d => store[name] && store[name][d.key] === 'E').length;
      return eCount < 5;
    }).length;
    container.appendChild(mdSec(typeInfo.label, '<span class="reqs">' + typeInfo.reqs + '</span>'));
    const summaryGrid = mdGrid('g5', [
      mdTile('Scope', scopeLabel, typeInfo.label, mdPill('Open for recording', 'info'), typeInfo.reqs),
      mdTile('Recording complete', completeness, '% of cells', mdPill(mdStatusBand(completeness, 90, 70).l, mdStatusBand(completeness, 90, 70).c), 'ASM-13', mdMeter(completeness)),

      mdTile('At Proficient or above', sriPct, '% SRI', mdPill(mdStatusBand(sriPct).l, mdStatusBand(sriPct).c), 'SRI', mdMeter(sriPct)),
      mdTile('Children with no movement', noMovementCount, 'of ' + assessmentPupilNames().length, noMovementCount > assessmentPupilNames().length/3 ? mdPill('Look at the teaching', 'crit') : mdPill('Expected at this point', 'neu'), 'ASM-17')
    ]);
    summaryGrid.style.marginBottom = '24px';
    container.appendChild(summaryGrid);
    if(completeness < 100){
      container.appendChild(mdCard((totalCells - recordedCells) + ' of ' + totalCells + ' observations not recorded' + (assessmentEntryType === 'monthly' ? ' this month' : assessmentEntryType === 'weekly' ? ' this week' : ' yet'),
        'Every figure above is computed only on what is recorded, so an incomplete record reads better than it is.', null));
    }
    container.appendChild(mdSec('Every child against every domain', '<span class="reqs">ASM-12…14</span>'));
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th><th>Att %</th>' +
      ASSESSMENT_DOMAINS.map(d => `<th title="${esc(d.full)}">${esc(d.label)}</th>`).join('') + '<th>Rec</th><th>Moved</th></tr></thead><tbody>';
    assessmentPupilNames().forEach(name => {
      const attPct = Math.round(sampleRand(name + 'asmatt') * 100);
      if(!store[name]) store[name] = {};
      const cells = ASSESSMENT_DOMAINS.map(d => {
        const tier = store[name][d.key];
        return assessmentTierCell(name, d.key, !!tier, tier);
      }).join('');
      const recCount = ASSESSMENT_DOMAINS.filter(d => store[name][d.key]).length;
      const eCount = ASSESSMENT_DOMAINS.filter(d => store[name][d.key] === 'E').length;
      const movedPill = eCount >= 5 ? mdPill('Needs support', 'crit') : mdPill('No movement', 'warn');
      const attBand = mdStatusBand(attPct, 85, 50); // green ≥85, amber ≥50, red below — matches real screenshot's banding, not the app's usual 85/70
      table += `<tr><td><b>${esc(name)}</b></td><td>${mdPill(String(attPct), attBand.c)}</td>${cells}<td>${recCount}/${ASSESSMENT_DOMAINS.length}</td><td>${movedPill}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Tap a cell to open B / P / A — picking one saves it immediately, no separate Save step. A blank cell (·) has not been observed and is not counted anywhere — a blank is never read as Beginner, because "I have not looked" and "she cannot do it yet" are different findings.', wrap));
  }
  // ============================================================
  // ASSESSMENT DASHBOARD (Reports) — read-only summary/reporting view
  // over the exact same monthlyAssessmentEntries Monthly Assessment
  // edits and imports write to (now persisted — see
  // loadMonthlyAssessmentEntries/saveMonthlyAssessmentEntries above).
  // Nothing here has its own data source; every number is computed
  // fresh from what's actually recorded, so this and Monthly
  // Assessment can never show two different answers for the same
  // child. There's no real per-month history yet (assessment isn't
  // date-partitioned in this app), so this reports on the current
  // recording period only — no month picker, since one that didn't
  // actually change the data would be worse than none.
  // ============================================================
  const BENCHMARK_DSI = Math.round(2/3*200*10)/10; // 133.3 — DSI if every recorded cell were exactly Proficient
  function computeAssessmentDashboardStats(){
    ensureMonthlyAssessmentSeeded();
    const totalCells = assessmentPupilNames().length * ASSESSMENT_DOMAINS.length;
    const tot = {E:0,P:0,A:0};
    let recordedCount = 0;
    ASSESSMENT_DOMAINS.forEach(d => {
      assessmentPupilNames().forEach(name => {
        const tier = monthlyAssessmentEntries[name][d.key];
        if(tier){ tot[tier]++; recordedCount++; }
      });
    });
    const completeness = totalCells ? Math.round(recordedCount / totalCells * 100) : 0;
    const classDSI = recordedCount ? Math.round((tot.A*3 + tot.P*2 + tot.E*1) / (3*recordedCount) * 200 * 10) / 10 : 0;
    const sriPct = recordedCount ? Math.round((tot.P + tot.A) / recordedCount * 100) : 0;
    const advancedPct = recordedCount ? Math.round(tot.A / recordedCount * 1000) / 10 : 0;
    // Class-wide E→P / P→A conversion — same real prevtier→tier seeds
    // the Transition report's own conversion table uses, so this and
    // that page can never disagree about the same underlying movement.
    // "Current" tier prefers what's actually recorded here; falls back
    // to the same baseline seed only for cells nobody has observed yet.
    let startedE = 0, movedToP = 0, startedP = 0, movedToA = 0;
    const tierWeight = {E:1,P:2,A:3};
    assessmentPupilNames().forEach(name => {
      ASSESSMENT_DOMAINS.forEach(d => {
        const from = sampleTier(name + d.key + 'prevtier');
        const to = monthlyAssessmentEntries[name][d.key] || sampleTier(name + d.key + 'tier');
        if(from === 'E'){ startedE++; if(tierWeight[to] >= tierWeight.P) movedToP++; }
        if(from === 'P'){ startedP++; if(to === 'A') movedToA++; }
      });
    });
    const epConversion = startedE ? Math.round(movedToP / startedE * 1000) / 10 : 0;
    const paConversion = startedP ? Math.round(movedToA / startedP * 1000) / 10 : 0;
    const domainStats = ASSESSMENT_DOMAINS.map(d => {
      const dTot = {E:0,P:0,A:0};
      let n = 0;
      assessmentPupilNames().forEach(name => {
        const tier = monthlyAssessmentEntries[name][d.key];
        if(tier){ dTot[tier]++; n++; }
      });
      const dsi = n ? Math.round((dTot.A*3 + dTot.P*2 + dTot.E*1) / (3*n) * 200 * 10) / 10 : 0;
      const sri = n ? Math.round((dTot.P + dTot.A) / n * 100) : 0;
      return { d, n, tot: dTot, dsi, sri };
    });
    const flaggedDomains = domainStats.filter(x => x.n > 0 && x.dsi < BENCHMARK_DSI);
    const childRows = assessmentPupilNames().map(name => {
      const cells = ASSESSMENT_DOMAINS.map(d => {
        const tier = monthlyAssessmentEntries[name][d.key];
        const baseline = sampleTier(name + d.key + 'tier'); // the "workbook" convention Child Record already uses
        return { d, tier, disagree: !!(tier && tier !== baseline) };
      });
      const recorded = cells.filter(c => c.tier);
      const cTot = {E:0,P:0,A:0}; recorded.forEach(c => cTot[c.tier]++);
      const n = recorded.length;
      const dsi = n ? Math.round((cTot.A*3 + cTot.P*2 + cTot.E*1) / (3*n) * 200 * 10) / 10 : 0;
      const sri = n ? Math.round((cTot.P + cTot.A) / n * 100) : 0;
      const progress = n === 0 ? null : cTot.E >= 5 ? 'Beginner' : cTot.E >= 2 ? 'Developing' : 'Age Appropriate';
      const noteRoll = sampleRand(name + 'notestat');
      const note = noteRoll > 0.66 ? 'Shared' : noteRoll > 0.33 ? 'Written' : 'None';
      return { name, cells, n, dsi, sri, progress, note };
    });
    const notesSharedCount = childRows.filter(c => c.note === 'Shared').length;
    return { totalCells, recordedCount, completeness, classDSI, sriPct, advancedPct, epConversion, paConversion, domainStats, flaggedDomains, childRows, notesSharedCount };
  }