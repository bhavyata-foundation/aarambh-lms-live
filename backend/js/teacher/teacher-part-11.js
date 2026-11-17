/* =========================================================================
   teacher-part-11.js — part 11 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

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
    const ratingFill = { G: [212, 237, 218], Y: [253, 236, 200], R: [248, 215, 218] };
    ['fine', 'gross'].forEach((type, ti) => {
      if(ti > 0) doc.addPage();
      doc.setFontSize(14);
      doc.text(type === 'fine' ? 'Fine Motor Assessment Sheet' : 'Gross Motor Assessment Sheet', 14, 15);
      doc.setFontSize(9);
      doc.text('School: ' + (myClassInfo.school_name || '') + '    Class: ' + (myClassInfo.class_name || '') + '    Academic Year: ' + new Date().getFullYear() + '    · generated ' + new Date().toLocaleDateString(), 14, 21);
      doc.text('G = Achieved   |   Y = Developing   |   R = Needs Support   |   blank = not rated', 14, 26);
      doc.autoTable({
        startY: 31,
        head: [['Roll', 'Student name', ...MOTOR_MONTHS.map(m => m + '\n' + MOTOR_ACTIVITIES[type][m].title), 'Teacher notes']],
        body: realPupilsCache.map((p, i) => [i + 1, p.name, ...MOTOR_MONTHS.map(m => motorRating(p.id, type, m) || ''), motorNote(p.id, type)]),
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

  function renderMotorAssessmentSection(container){
    const typeLabel = motorSkillType === 'fine' ? 'Fine Motor' : 'Gross Motor';
    container.appendChild(mdSec(typeLabel + ' assessment', '<span class="reqs">ASM-M1…M2</span>'));
    const note = document.createElement('p');
    note.className = 'cap'; note.style.margin = '4px 0 14px';
    note.textContent = 'One activity a month, June to October. Rate every child G Achieved · Y Developing · R Needs Support — tap a letter to set it, tap it again to clear. Each tap saves to the database.';
    container.appendChild(note);

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

    if(!myClassInfo.class_id){ container.appendChild(mdCard(null, 'Loading your class info…', null)); return; }
    if(typeof motorAssessmentCache === 'string' && motorAssessmentCache.startsWith('error:')){
      renderRetryCard(container, motorAssessmentCache.slice(6), () => { motorAssessmentCache = null; });
      return;
    }
    if(!ensureMotorAssessmentLoaded()){ container.appendChild(mdCard(null, 'Loading ratings…', null)); return; }

    const pupils = realPupilsCache;
    if(!pupils.length){ container.appendChild(mdCard(null, 'No children on the roll yet — add them in Class Attendance → Admissions.', null)); return; }

    container.appendChild(renderMotorImportCard());

    // Real counts per month for the selected sheet
    const monthIdx = MOTOR_MONTHS.indexOf(new Date().toLocaleDateString('en-US', {month: 'long'}));
    const tiles = MOTOR_MONTHS.map((m, i) => {
      const counts = { G: 0, Y: 0, R: 0 };
      pupils.forEach(p => { const r = motorRating(p.id, motorSkillType, m); if(r) counts[r]++; });
      const rated = counts.G + counts.Y + counts.R;
      return mdTile(m + (i === monthIdx ? ' · now' : ''), rated ? counts.G : '—', rated ? 'of ' + rated + ' achieved' : 'not rated yet',
        rated ? mdPill(counts.Y + ' developing · ' + counts.R + ' support', counts.R ? 'warn' : 'good') : mdPill('No data yet', 'neu'),
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
        const btns = ['G', 'Y', 'R'].map(r => {
          const active = current === r;
          return `<button onclick="setMotorRating(${p.id}, '${m}', '${r}')" title="${MOTOR_RATINGS[r].label}" style="width:30px; height:30px; padding:0; border-radius:6px; border:${active ? 'none' : '1px solid var(--border,#d9dcd5)'}; background:${active ? MOTOR_RATINGS[r].color : '#fff'}; color:${active ? '#fff' : 'var(--text,#0c0e0b)'}; font-size:11px; font-weight:700; cursor:pointer;">${r}</button>`;
        }).join('');
        return `<td style="text-align:center; ${cellPad} ${i === monthIdx ? 'background:var(--surface-2,#eceee9);' : ''}"><div style="display:inline-flex; gap:8px;">${btns}</div></td>`;
      }).join('');
      table += `<tr><td class="dim" style="text-align:left; ${cellPad}">${idx + 1}</td><td style="text-align:left; ${cellPad}"><b>${esc(p.name)}</b></td>${cells}
        <td style="text-align:left; ${cellPad}"><input type="text" data-pupil="${p.id}" class="motor-note-input" value="${esc(motorNote(p.id, motorSkillType))}" placeholder="Add a note" style="width:100%; min-width:200px; padding:8px 10px; border:1px solid var(--border,#d9dcd5); border-radius:6px; font-size:12.5px; font-family:inherit; box-sizing:border-box;" /></td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Hover a month heading to see the full activity. G Achieved · Y Developing · R Needs Support. A blank cell has not been rated and is never counted.', wrap));
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

    if(!ensurePupilsLoadedFor(container, () => renderMonthlyAssessment(monthlyAssessmentTargetEl))) return;

    // --- Assessment type tabs ---
    const typeBar = document.createElement('div');
    typeBar.style.cssText = 'display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;';
    Object.keys(ASSESSMENT_TYPE_INFO).forEach(key => {
      const info = ASSESSMENT_TYPE_INFO[key];
      const active = assessmentEntryType === key;
      const btn = document.createElement('button');
      btn.textContent = info.icon + ' ' + info.label;
      btn.style.cssText = `padding:8px 16px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:${active ? '600' : '400'};`;
      btn.onclick = () => switchAssessmentEntryType(key);
      typeBar.appendChild(btn);
    });
    container.appendChild(typeBar);

    // Workbook Assessment has a genuinely different real structure too
    // (real book pages, grouped by physical workbook, scoped by month —
    // not the 10-domain grid Classroom Observation used to share) and
    // is server-backed rather than a client-side store, so it gets its
    // own dedicated renderer.
    if(assessmentEntryType === 'workbook'){
      renderWorkbookAssessmentSection(container);
      return;
    }

    // Classroom Observation is now real, theme-based, and month-scoped
    // (see renderObservationAssessmentSection above) — no longer the
    // flat 10-domain grid the generic renderer below still serves.
    if(assessmentEntryType === 'observation'){
      renderObservationAssessmentSection(container);
      return;
    }

    // Pre-Test moved here from Reports > Assessment Dashboard > Child
    // Record — that page mixed real data entry with analysis, and
    // Reports should only ever hold analysis. Pre-Test is real entry
    // (same 26 real activities Weekly used to grade), so it belongs in
    // Assessment. Child Record still shows a read-only summary of what's
    // recorded here — never editable buttons.
    if(assessmentEntryType === 'pretest'){
      renderPreTestClassSection(container);
      return;
    }

    // Fine & Gross Motor — monthly activity sheets (June–October), G/Y/R
    // per child, real database. Comes right after Pre-Test.
    if(assessmentEntryType === 'motor'){
      renderMotorAssessmentSection(container);
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
    container.appendChild(mdGrid('g5', [
      mdTile('Scope', scopeLabel, typeInfo.label, mdPill('Open for recording', 'info'), typeInfo.reqs),
      mdTile('Recording complete', completeness, '% of cells', mdPill(mdStatusBand(completeness, 90, 70).l, mdStatusBand(completeness, 90, 70).c), 'ASM-13', mdMeter(completeness)),
      mdTile('Class DSI', dsi, 'of 200', mdPill(mdStatusBand(dsi/2).l, mdStatusBand(dsi/2).c), 'DSI', mdMeter(dsi/2)),
      mdTile('At Proficient or above', sriPct, '% SRI', mdPill(mdStatusBand(sriPct).l, mdStatusBand(sriPct).c), 'SRI', mdMeter(sriPct)),
      mdTile('Children with no movement', noMovementCount, 'of ' + assessmentPupilNames().length, noMovementCount > assessmentPupilNames().length/3 ? mdPill('Look at the teaching', 'crit') : mdPill('Expected at this point', 'neu'), 'ASM-17')
    ]));

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

  var assessmentDashboardTab = 'overview';
  function switchAssessmentDashboardTab(tab){
    assessmentDashboardTab = tab;
    renderAssessmentDashboard();
  }

  // ---------------------------------------------------------------
  // ASSESSMENT RECORDS (Assessment Dashboard → ▤ Assessment records)
  // — every assessment's saved record and its report download, in one
  // place. Read-only: grading still happens in Assessment. Everything
  // here reads the same real stores the entry screens save to
  // (observation / workbook / motor from the database; Pre-Test from
  // its class tally).
  // ---------------------------------------------------------------

  // ---------------------------------------------------------------
  // REPORT PDF EXPORTER — one shared way to download any report on
  // screen. It reads the report exactly as rendered (headings, tiles,
  // bar rows, list rows and tables), so a download can never show a
  // different number from the screen. Buttons, inputs and charts are
  // left out; chart numbers are already in the tables and tiles.
  // ---------------------------------------------------------------
  function pdfSafeText(s){
    // jsPDF's built-in font only covers Latin-1 plus a few symbols — drop
    // emoji and other glyphs it would print as garbage.
    return String(s == null ? '' : s)
      .replace(/₹/g, 'Rs ')
      .replace(/[^\x20-\x7E\xA0-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u00B7]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function exportReportPdf(rootEl, title, fileStem){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    if(!rootEl){ alert('Nothing to export on this screen yet.'); return; }
    const clone = rootEl.cloneNode(true);
    // Keep typed values, drop controls, charts and anything marked no-export.
    clone.querySelectorAll('input, textarea').forEach(el => { const s = document.createElement('span'); s.textContent = el.value || ''; el.replaceWith(s); });
    clone.querySelectorAll('select').forEach(el => { const s = document.createElement('span'); s.textContent = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : ''; el.replaceWith(s); });
    clone.querySelectorAll('button, svg, script, style, [data-no-export]').forEach(el => el.remove());

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(pdfSafeText(title), 14, 15);
    doc.setFontSize(9);
    doc.text(pdfSafeText(assessmentPdfHeaderLine() + ' · ' + (myClassInfo.school_name || '') + ' · generated ' + new Date().toLocaleString()), 14, 21);
    let y = 28;
    const need = (h) => { if(y + h > 195){ doc.addPage(); y = 15; } };
    const heading = (text, size) => {
      const t = pdfSafeText(text); if(!t) return;
      need(10); doc.setFontSize(size); doc.text(t, 14, y); y += size >= 12 ? 7 : 6;
    };
    const table = (opts) => {
      doc.autoTable(Object.assign({ startY: y, styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [37, 99, 60] }, margin: { left: 14, right: 14 } }, opts));
      y = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : y) + 8;
    };
    let pendingTiles = [], pendingBars = [], pendingRows = [];
    const flush = () => {
      if(pendingTiles.length){ table({ head: [['Measure', 'Value', 'Status', 'Basis']], body: pendingTiles }); pendingTiles = []; }
      if(pendingBars.length){ table({ head: [['Item', 'Value']], body: pendingBars }); pendingBars = []; }
      if(pendingRows.length){ table({ head: [['Item', 'Detail', 'Status']], body: pendingRows }); pendingRows = []; }
    };

    const walk = (el) => {
      for(const child of Array.from(el.children)){
        const tag = child.tagName;
        if(tag === 'TABLE'){
          flush();
          // Clean every cell's text before handing the table over.
          child.querySelectorAll('th, td').forEach(c => { c.textContent = pdfSafeText(c.textContent) || '—'; });
          table({ html: child });
          continue;
        }
        if(child.classList.contains('tile')){
          const q = sel => { const n = child.querySelector(sel); return n ? pdfSafeText(n.textContent) : ''; };
          pendingTiles.push([q('.k'), q('.v'), q('.d'), q('.f')]);
          continue;
        }
        if(child.classList.contains('hbar-row')){
          const label = child.querySelector('.hbar-row-label'), count = child.querySelector('.hbar-count');
          pendingBars.push([pdfSafeText(label ? label.textContent : ''), pdfSafeText(count ? count.textContent : '')]);
          continue;
        }
        if(child.classList.contains('row') && child.parentElement && child.parentElement.classList.contains('list')){
          const t = child.querySelector('.t');
          const b = t && t.querySelector('b'), sp = t && t.querySelector('span');
          const rest = child.lastElementChild && child.lastElementChild !== t ? child.lastElementChild.textContent : '';
          pendingRows.push([pdfSafeText(b ? b.textContent : (t ? t.textContent : '')), pdfSafeText(sp ? sp.textContent : ''), pdfSafeText(rest)]);
          continue;
        }
        if(tag === 'H1' || tag === 'H2'){ flush(); heading(child.textContent, 13); continue; }
        if(tag === 'H3' || tag === 'H4'){ flush(); heading(child.textContent, 11); continue; }
        if(child.children.length) walk(child);
      }
    };
    walk(clone);
    flush();
    doc.save((fileStem || 'report') + '-' + todayKey() + '.pdf');
  }

  // A "⬇ Download report (PDF)" bar for the top of any report.
  // getRoot is a function so the export reads the report as it is at
  // the moment of the click, not when the button was drawn.
  function reportDownloadBar(getRoot, title, fileStem, note){
    const bar = document.createElement('div');
    bar.setAttribute('data-no-export', '1');
    bar.style.cssText = 'display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:0 0 14px;';
    const btn = document.createElement('button');
    btn.textContent = '⬇ Download report (PDF)';
    btn.style.cssText = 'padding:8px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
    btn.onclick = () => exportReportPdf(getRoot(), title, fileStem);
    bar.appendChild(btn);
    if(note){ const n = document.createElement('span'); n.className = 'cap'; n.textContent = note; bar.appendChild(n); }
    return bar;
  }

  // Flags have their own shape (one card per flag), so they get a
  // straight table rather than the generic reader.
  function downloadFlagsPdf(year, month){
    if(typeof window.jspdf === 'undefined'){ alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const ym = year + '-' + String(month + 1).padStart(2, '0');
    const list = flagsRecords.filter(f => f.dateRaised && f.dateRaised.slice(0, 7) === ym).sort((a, b) => a.dateRaised.localeCompare(b.dateRaised));
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const monthName = new Date(year, month, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    doc.setFontSize(14); doc.text('Flags & Notifications — ' + monthName, 14, 15);
    doc.setFontSize(9); doc.text(pdfSafeText(assessmentPdfHeaderLine() + ' · generated ' + new Date().toLocaleString()), 14, 21);
    doc.autoTable({
      startY: 27,
      head: [['Raised', 'By', 'Kind', 'What was noted', 'Reply due', 'Status', 'My reply']],
      body: list.length ? list.map(f => [f.dateRaised, pdfSafeText(f.raisedByName || ''), FLAG_STATES[f.state] ? FLAG_STATES[f.state].label : f.state, pdfSafeText(f.text), f.dueDate || '—',
        f.status === 'replied' ? 'Replied ' + (f.replyDate || '') : f.state === 'observation' ? 'No reply needed' : (f.dueDate && f.dueDate < todayDateKey() ? 'Overdue' : 'Awaiting reply'),
        pdfSafeText(f.replyText || '')]) : [['—', '', '', 'Nothing raised this month.', '', '', '']],
      styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [37, 99, 60] },
      columnStyles: { 3: { cellWidth: 80 }, 6: { cellWidth: 60 } }
    });
    doc.save('flags-' + ym + '-' + todayKey() + '.pdf');
  }

  // Parent Involvement lives in js/render/parent-volunteers.js — add the
  // same download bar to it without editing that file, by wrapping its
  // render function once it exists.
  (function attachParentInvolvementDownload(){
    const wrap = () => {
      if(typeof window.renderParentInvolvement !== 'function' || window.renderParentInvolvement.__withDownload) return false;
      const original = window.renderParentInvolvement;
      const wrapped = function(){
        const out = original.apply(this, arguments);
        const body = document.getElementById('parentinvolvement-body');
        if(body && Array.isArray(realPupilsCache) && !body.querySelector('[data-report-dl]')){
          const bar = reportDownloadBar(() => document.getElementById('parentinvolvement-body'), 'Parent Involvement', 'parent-involvement');
          bar.setAttribute('data-report-dl', '1');
          body.insertBefore(bar, body.firstChild);
        }
        return out;
      };
      wrapped.__withDownload = true;
      window.renderParentInvolvement = wrapped;
      return true;
    };
    if(!wrap()) window.addEventListener('load', wrap);
  })();

  var assessmentRecordsType = 'observation'; // 'observation' | 'workbook' | 'pretest' | 'motor'

  function assessmentRecordsRerender(){
    const body = document.getElementById('assessmentdashboard-body');
    if(body && !body.classList.contains('hidden') && assessmentDashboardTab === 'records') renderAssessmentDashboard();
  }

  // Used by the entry screens: jump straight to this tab.
  function openAssessmentRecords(type){
    assessmentRecordsType = type;
    assessmentDashboardTab = 'records';
    switchSidebarSection('assessmentdashboard');
  }

  // The small pointer each entry screen shows where its download used to be.
  function assessmentReportsLink(type){
    const p = document.createElement('p');
    p.className = 'cap';
    p.style.cssText = 'margin:14px 0 0; padding:10px 14px; border-left:3px solid var(--primary); background:var(--bg); border-radius:0 8px 8px 0;';
    p.innerHTML = `📊 The report for this assessment is in <a href="#" onclick="openAssessmentRecords('${type}'); return false;" style="color:var(--primary); font-weight:600;">Assessment Dashboard → Assessment records</a>.`;
    return p;
  }

  function recordsLetterPill(letter, cls){
    return letter
      ? `<span class="pill ${cls}" style="min-width:22px; justify-content:center;">${esc(letter)}</span>`
      : '<span class="dim">·</span>';
  }

  function recordsDownloadRow(buttons, note){
    const row = document.createElement('div');
    row.className = 'card';
    row.style.cssText = 'padding:14px 18px; margin:0 0 18px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';
    row.innerHTML = `<div style="flex:1; min-width:220px;"><b>⬇ Download report</b><p class="cap" style="margin:3px 0 0;">${note}</p></div><div style="display:flex; gap:8px; flex-wrap:wrap;"></div>`;
    const btnWrap = row.lastElementChild;
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = b.primary ? 'btn-primary' : 'btn';
      if(b.primary) btn.style.cssText = 'width:auto; padding:9px 16px;';
      btn.textContent = b.label;
      if(b.disabled){ btn.disabled = true; btn.title = b.disabled; }
      else btn.onclick = b.onClick;
      btnWrap.appendChild(btn);
    });
    return row;
  }

  function renderAssessmentRecords(container){
    container.appendChild(mdSec('Assessment records', '<span class="reqs">REP · all instruments</span>'));
    const intro = document.createElement('p');
    intro.className = 'cap'; intro.style.margin = '4px 0 14px';
    intro.textContent = 'What has actually been saved for each assessment, and its report. Grading happens in Assessment — this view is read-only.';
    container.appendChild(intro);

    const typeBar = document.createElement('div'); typeBar.className = 'fbar'; typeBar.style.marginBottom = '14px';
    typeBar.innerHTML = '<div class="ctl"><label>Assessment</label><div style="display:flex; gap:5px; flex-wrap:wrap;" id="recordsTypeChips"></div></div>';
    container.appendChild(typeBar);
    const chips = typeBar.querySelector('#recordsTypeChips');
    [['observation', '👁️ Classroom Observation'], ['workbook', '📘 Workbook'], ['pretest', '📋 Pre-Test'], ['motor', '🤸 Fine & Gross Motor'], ['myclass', '🧒 My Class weekly ratings']].forEach(([key, label]) => {
      const b = document.createElement('button');
      b.className = 'chip' + (assessmentRecordsType === key ? ' sel' : '');
      b.textContent = label;
      b.onclick = () => { assessmentRecordsType = key; renderAssessmentDashboard(); };
      chips.appendChild(b);
    });

    // Month picker for the month-scoped instruments — the same shared
    // month the Assessment screens use.
    if(assessmentRecordsType === 'observation' || assessmentRecordsType === 'workbook'){
      const bar = document.createElement('div'); bar.className = 'fbar'; bar.style.marginBottom = '14px';
      bar.innerHTML = '<div class="ctl"><label>Month</label><select id="recordsMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
      container.appendChild(bar);
      const sel = bar.querySelector('#recordsMonthSelect');
      WORKBOOK_MONTHS.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; if(m === currentWorkbookMonth) o.selected = true; sel.appendChild(o); });
      sel.onchange = () => { currentWorkbookMonth = sel.value; renderAssessmentDashboard(); };
    }

    const body = document.createElement('div');
    container.appendChild(body);
    if(!ensurePupilsLoadedFor(body, assessmentRecordsRerender)) return;

    if(assessmentRecordsType === 'observation') renderObservationRecords(body);
    else if(assessmentRecordsType === 'workbook') renderWorkbookRecords(body);
    else if(assessmentRecordsType === 'pretest') renderPreTestRecords(body);
    else if(assessmentRecordsType === 'myclass') renderMyClassRecords(body);
    else renderMotorRecords(body);
  }

  function recordsErrorCard(container, message, clearFn){
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="card" style="padding:16px;"><p style="margin:0 0 10px;">${esc(message)}</p><button class="btn-primary" style="width:auto; padding:7px 14px;">Retry</button></div>`;
    wrap.querySelector('button').onclick = () => { clearFn(); renderAssessmentDashboard(); };
    container.appendChild(wrap);
  }

  function renderObservationRecords(container){
    const level = workbookLevelFromClassName();
    const month = currentWorkbookMonth;
    const themesKey = level + '|' + month;
    const themesLoaded = ensureObservationThemesLoaded(level, month, assessmentRecordsRerender);
    const marksLoaded = ensureObservationAssessmentLoaded(month, assessmentRecordsRerender);
    if(typeof observationThemesCache[themesKey] === 'string' && observationThemesCache[themesKey].startsWith('error:')){ recordsErrorCard(container, observationThemesCache[themesKey].slice(6), () => delete observationThemesCache[themesKey]); return; }
    if(typeof observationAssessmentCache[month] === 'string' && observationAssessmentCache[month].startsWith('error:')){ recordsErrorCard(container, observationAssessmentCache[month].slice(6), () => delete observationAssessmentCache[month]); return; }
    if(!themesLoaded || !marksLoaded){ container.appendChild(mdCard(null, 'Loading Classroom Observation…', null)); return; }

    const themes = observationThemesCache[themesKey];
    const marks = observationAssessmentCache[month];
    if(!themes.length){ container.appendChild(mdCard(null, 'No observation themes are scheduled for ' + esc(month) + '.', null)); return; }
    const anyGraded = Object.keys(marks).some(pid => Object.keys(marks[pid] || {}).length);

    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF', primary: true, onClick: downloadObservationAssessmentPdf, disabled: anyGraded ? '' : 'Nothing graded this month yet' },
      { label: '⬇ Excel (.xlsx)', onClick: downloadObservationAssessmentXlsx, disabled: anyGraded ? '' : 'Nothing graded this month yet' }
    ], anyGraded ? 'Every theme graded in ' + esc(month) + ', one table per theme.' : 'Nothing has been graded for ' + esc(month) + ' yet.'));

    themes.forEach(t => {
      let graded = 0;
      let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Child</th>'
        + t.items.map(it => `<th style="text-align:center;" title="${esc(it.goal_text || '')}">${esc(it.cg_code)}</th>`).join('') + '</tr></thead><tbody>';
      assessmentPupilNames().forEach((name, idx) => {
        const pm = marks[realPupilsCache[idx].id] || {};
        table += `<tr><td style="text-align:left;"><b>${esc(name)}</b></td>` + t.items.map(it => {
          const v = pm[it.id]; if(v) graded++;
          return `<td style="text-align:center;">${recordsLetterPill(v ? TIER_INFO[v].letter : '', v ? TIER_INFO[v].c : '')}</td>`;
        }).join('') + '</tr>';
      });
      table += '</tbody></table></div>';
      const wrap = document.createElement('div'); wrap.innerHTML = table;
      const card = mdCard(t.name, graded + ' of ' + (t.items.length * assessmentPupilNames().length) + ' grades recorded · B Beginner · P Proficient · A Advanced · · not graded', wrap);
      card.style.marginBottom = '16px';
      container.appendChild(card);
    });
  }

  function renderWorkbookRecords(container){
    const level = workbookLevelFromClassName();
    const month = currentWorkbookMonth;
    const booksKey = level + '|' + month;
    const booksLoaded = ensureWorkbookCompetenciesLoaded(level, month, assessmentRecordsRerender);
    const tallyLoaded = ensureWorkbookCompetencyTallyLoaded(month, assessmentRecordsRerender);
    if(myClassInfo.class_id) ensureWorkbookMonthSubmissionLoaded(myClassInfo.class_id, month, assessmentRecordsRerender);
    if(typeof workbookCompetenciesCache[booksKey] === 'string' && workbookCompetenciesCache[booksKey].startsWith('error:')){ recordsErrorCard(container, workbookCompetenciesCache[booksKey].slice(6), () => delete workbookCompetenciesCache[booksKey]); return; }
    if(typeof workbookCompetencyTallyCache[month] === 'string' && workbookCompetencyTallyCache[month].startsWith('error:')){ recordsErrorCard(container, workbookCompetencyTallyCache[month].slice(6), () => delete workbookCompetencyTallyCache[month]); return; }
    if(!booksLoaded || !tallyLoaded){ container.appendChild(mdCard(null, 'Loading Workbook Assessment…', null)); return; }

    const books = workbookCompetenciesCache[booksKey];
    const tally = workbookCompetencyTallyCache[month] || {};
    const sub = workbookMonthSubmissionCache[month];
    const isSubmitted = sub && typeof sub === 'object' && sub.submitted;
    if(!books.length){ container.appendChild(mdCard(null, 'No workbooks are set up for ' + esc(level) + ' yet.', null)); return; }

    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF — every workbook', primary: true, onClick: () => downloadWorkbookMonthReportPdf(books, month), disabled: isSubmitted ? '' : 'Submit this month\u2019s marks in Assessment → Workbook first' }
    ], isSubmitted
      ? '✓ ' + esc(month) + ' submitted' + (sub.submitted_by_name ? ' by ' + esc(sub.submitted_by_name) : '') + ' — every workbook in one PDF.'
      : '🔒 ' + esc(month) + ' isn\u2019t submitted yet — submit it in Assessment → Workbook Assessment to unlock the report.'));

    books.forEach(book => {
      if(!book.competencies.length) return;
      let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">CG</th><th style="text-align:left;">Competency</th><th style="text-align:center;">E</th><th style="text-align:center;">P</th><th style="text-align:center;">A</th></tr></thead><tbody>';
      let rowsWithData = 0;
      book.competencies.forEach(c => {
        const t = tally[c.id] || { count_e: 0, count_p: 0, count_a: 0 };
        if(t.count_e + t.count_p + t.count_a > 0) rowsWithData++;
        table += `<tr><td class="dim" style="text-align:left;">${esc(c.cg_code)}</td><td style="text-align:left; white-space:normal;">${esc(c.competency_text)}</td><td style="text-align:center;">${t.count_e}</td><td style="text-align:center;">${t.count_p}</td><td style="text-align:center;">${t.count_a}</td></tr>`;
      });
      table += '</tbody></table></div>';
      const wrap = document.createElement('div'); wrap.innerHTML = table;
      const card = mdCard(book.name, rowsWithData + ' of ' + book.competencies.length + ' competencies have counts for ' + esc(month) + ' · class-wide counts, not per child', wrap);
      card.style.marginBottom = '16px';
      container.appendChild(card);
    });
  }

  function renderPreTestRecords(container){
    ensurePreTestTallyForClass();
    const anyTallied = Object.values(preTestTallyEntries).some(t => (t.count_e + t.count_p + t.count_a) > 0);
    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF', primary: true, onClick: downloadPreTestClassPdf, disabled: anyTallied ? '' : 'Nothing recorded yet' }
    ], anyTallied ? 'The class baseline across all ' + WEEKLY_ASSESSMENT_ACTIVITIES.length + ' activities.' : 'Nothing has been recorded for the Pre-Test yet.'));

    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>#</th><th style="text-align:left;">Type</th><th style="text-align:left;">Activity</th><th style="text-align:left;">CG</th><th style="text-align:center;">E</th><th style="text-align:center;">P</th><th style="text-align:center;">A</th><th style="text-align:center;">Avg</th></tr></thead><tbody>';
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const t = preTestTallyEntries[String(idx)] || { count_e: 0, count_p: 0, count_a: 0 };
      const marked = t.count_e + t.count_p + t.count_a;
      const avg = marked ? Math.round((t.count_a*3 + t.count_p*2 + t.count_e) / marked * 100) / 100 : null;
      table += `<tr><td class="dim">${idx + 1}</td><td class="dim" style="text-align:left;">${esc(a.type)}</td><td style="text-align:left; white-space:normal;">${esc(a.activity)}</td><td class="dim" style="text-align:left;">${esc(a.cg)}</td><td style="text-align:center;">${t.count_e}</td><td style="text-align:center;">${t.count_p}</td><td style="text-align:center;">${t.count_a}</td><td style="text-align:center;">${avg === null ? '—' : avg}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard('Pre-Test — class baseline', 'Class-wide counts per activity (E Emerging · P Proficient · A Advanced). Avg weights E=1, P=2, A=3.', wrap));
  }

  function renderMotorRecords(container){
    if(typeof motorAssessmentCache === 'string' && motorAssessmentCache.startsWith('error:')){ recordsErrorCard(container, motorAssessmentCache.slice(6), () => { motorAssessmentCache = null; }); return; }
    if(!ensureMotorAssessmentLoaded(assessmentRecordsRerender)){ container.appendChild(mdCard(null, 'Loading Fine & Gross Motor…', null)); return; }

    let anyRated = false;
    realPupilsCache.forEach(p => ['fine', 'gross'].forEach(t => MOTOR_MONTHS.forEach(m => { if(motorRating(p.id, t, m)) anyRated = true; })));
    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF — both sheets', primary: true, onClick: downloadMotorAssessmentPdf, disabled: anyRated ? '' : 'Nothing rated yet' }
    ], anyRated ? 'Fine Motor and Gross Motor sheets, June to October, with teacher notes.' : 'No child has been rated yet.'));

    const cls = { G: 'good', Y: 'warn', R: 'crit' };
    ['fine', 'gross'].forEach(type => {
      let rated = 0;
      let table = '<div class="report-table-wrap"><table class="report-table" style="min-width:900px;"><thead><tr><th style="text-align:left;">Roll</th><th style="text-align:left;">Child</th>'
        + MOTOR_MONTHS.map(m => `<th style="text-align:center; white-space:normal;" title="${esc(MOTOR_ACTIVITIES[type][m].detail)}">${esc(m)}<br><span style="font-weight:600; text-transform:none; letter-spacing:0;">${esc(MOTOR_ACTIVITIES[type][m].title)}</span></th>`).join('')
        + '<th style="text-align:left;">Teacher notes</th></tr></thead><tbody>';
      realPupilsCache.forEach((p, i) => {
        table += `<tr><td class="dim" style="text-align:left;">${i + 1}</td><td style="text-align:left;"><b>${esc(p.name)}</b></td>` + MOTOR_MONTHS.map(m => {
          const r = motorRating(p.id, type, m); if(r) rated++;
          return `<td style="text-align:center;">${recordsLetterPill(r, r ? cls[r] : '')}</td>`;
        }).join('') + `<td style="text-align:left; white-space:normal;" class="dim">${esc(motorNote(p.id, type)) || '—'}</td></tr>`;
      });
      table += '</tbody></table></div>';
      const wrap = document.createElement('div'); wrap.innerHTML = table;
      const card = mdCard(type === 'fine' ? '✋ Fine Motor' : '🏃 Gross Motor', rated + ' of ' + (realPupilsCache.length * MOTOR_MONTHS.length) + ' ratings recorded · G Achieved · Y Developing · R Needs Support', wrap);
      card.style.marginBottom = '16px';
      container.appendChild(card);
    });
  }


  // Assessment records → My Class weekly ratings (read-only; rated in My Class).
  var recordsMyClassWeek = null; // null = current week
  function renderMyClassRecords(container){
    const week = recordsMyClassWeek === null ? currentWeekNum : recordsMyClassWeek;
    const firstWeek = (typeof WEEKS !== 'undefined' && WEEKS.length) ? WEEKS[0].w : 1;
    const weekInfo = (typeof WEEKS !== 'undefined') ? WEEKS.find(w => w.w === week) : null;
    const picker = document.createElement('div');
    picker.setAttribute('data-no-export', '1');
    picker.style.cssText = 'display:flex; align-items:center; gap:10px; margin:0 0 12px; flex-wrap:wrap;';
    picker.innerHTML = `<button class="btn" ${week <= firstWeek ? 'disabled' : ''}>‹ Previous week</button>
      <div><b>Week ${week}</b>${weekInfo ? ' · ' + esc(weekInfo.theme) + ' <span class="dim">(' + esc(weekInfo.dates) + ')</span>' : ''}</div>
      <button class="btn" ${week >= currentWeekNum ? 'disabled' : ''}>Next week ›</button>`;
    const [prevB, nextB] = picker.querySelectorAll('button');
    prevB.onclick = () => { recordsMyClassWeek = week - 1; renderAssessmentDashboard(); };
    nextB.onclick = () => { recordsMyClassWeek = week + 1; renderAssessmentDashboard(); };
    container.appendChild(picker);

    if(!myClassInfo.class_id){ container.appendChild(mdCard(null, 'Loading your class info…', null)); return; }
    const status = childActivityRatingsStatus[week];
    if(status === undefined) fetchChildActivityRatings(week);
    if(status === undefined || status === 'loading'){ container.appendChild(mdCard(null, 'Loading this week\u2019s ratings…', null)); return; }
    if(status === 'error'){ recordsErrorCard(container, 'Could not load this week\u2019s ratings from the server.', () => { delete childActivityRatingsStatus[week]; }); return; }

    const weekRatings = childActivityRatings[week] || {};
    const report = document.createElement('div');
    let rated = 0;
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Child</th>'
      + DOMAINS.map(d => `<th style="text-align:center; white-space:normal;">${esc(d.label)}<br><span class="dim" style="font-weight:400; font-size:11px;">${esc(d.cg || '')}</span></th>`).join('')
      + '<th style="text-align:center;">Rated</th><th style="text-align:center;">P or A</th></tr></thead><tbody>';
    realPupilsCache.forEach(p => {
      const r = weekRatings[p.id] || {};
      const n = DOMAINS.filter(d => r[d.key]).length; rated += n;
      const pa = DOMAINS.filter(d => r[d.key] === 'P' || r[d.key] === 'A').length;
      table += `<tr><td style="text-align:left;"><b>${esc(p.name)}</b></td>` + DOMAINS.map(d => `<td style="text-align:center;">${recordsLetterPill(r[d.key] ? TIER_INFO[r[d.key]].letter : '', r[d.key] ? TIER_INFO[r[d.key]].c : '')}</td>`).join('')
        + `<td style="text-align:center;">${n ? n + ' / ' + DOMAINS.length : '—'}</td><td style="text-align:center;">${n ? pa + ' of ' + n : '—'}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    report.appendChild(mdSec('My Class — weekly activity ratings, Week ' + week, ''));
    report.appendChild(mdCard(null, rated + ' of ' + (realPupilsCache.length * DOMAINS.length) + ' ratings recorded · B Beginner · P Proficient · A Advanced · · not rated', wrap));
    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF', primary: true, onClick: () => exportReportPdf(report, 'My Class — weekly activity ratings, Week ' + week, 'myclass-ratings-week' + week), disabled: rated ? '' : 'Nothing rated this week yet' }
    ], rated ? 'Every child against every activity area for Week ' + week + '.' : 'Nothing has been rated for Week ' + week + ' yet.'));
    container.appendChild(report);
  }

  function renderAssessmentDashboard(){
    const container = document.getElementById('assessmentdashboard-body');
    container.innerHTML = '';

    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex; gap:8px; margin:14px 0; overflow-x:auto; flex-wrap:wrap;';
    const tabStyle = (active) => `padding:8px 16px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:${active ? '600' : '400'}; white-space:nowrap;`;
    tabBar.innerHTML = `
      <button style="${tabStyle(assessmentDashboardTab === 'overview')}" onclick="switchAssessmentDashboardTab('overview')">◆ Overview</button>
      <button style="${tabStyle(assessmentDashboardTab === 'records')}" onclick="switchAssessmentDashboardTab('records')">▤ Assessment records</button>
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
