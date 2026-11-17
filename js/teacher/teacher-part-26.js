function previewClassPupilImportRows(rows, resultEl, removeMissing){
    pendingPupilSync = null;
    if(!Array.isArray(realPupilsCache)){ resultEl.innerHTML = '<div class="au-error">Still loading the roll — try again in a moment.</div>'; return; }
    if(!rows || !rows.length){ resultEl.innerHTML = '<div class="au-error">The file is empty.</div>'; return; }
    const header = rows[0].map(h => h.trim().toLowerCase().replace(/[\s_]+/g, ' '));
    const col = n => header.findIndex(h => h === n);
    let nameCol = [col('name'), col('student name'), col('child name'), col('child')].find(i => i >= 0);
    if(nameCol === undefined && typeof SI_NAME_WORDS !== 'undefined'){ const k = header.findIndex(h => SI_NAME_WORDS.includes(h)); if(k >= 0) nameCol = k; }
    if(nameCol === undefined){ resultEl.innerHTML = '<div class="au-error">The first row must be a header with a "name" column (e.g. name,admitted date,dob,gender).</div>'; return; }
    const admCol = [col('admitted date'), col('admission date'), col('date of admission')].find(i => i >= 0);
    const dobCol = [col('dob'), col('date of birth')].find(i => i >= 0);
    const genderCol = col('gender');
    const regCol = pickRegisterColumn(rows[0], rows.slice(1), [nameCol]);
    const onRoll = {};
    realPupilsCache.forEach(p => { onRoll[normPupilName(p.name)] = p; });
    const seen = new Set(), add = [], keep = [], problems = [], regUpdates = [];
    for(let i = 1; i < rows.length; i++){
      const r = rows[i];
      const split = splitRegisterFromName(r[nameCol]);
      const name = split.name;
      if(!name) continue;
      if(siNotAChild(name)){ problems.push(`Row ${i + 1}: "${name}" is not a child's name (crossed out / a note) — skipped.`); continue; }
      const regFromCol = regCol >= 0 ? String(r[regCol] || '').trim().replace(/\.0+$/, '') : '';
      const register_no = /^\d{1,6}$/.test(regFromCol) ? regFromCol : split.register_no;
      const key = normPupilName(name);
      if(seen.has(key)){ problems.push(`Row ${i + 1}: "${name}" appears twice in the file — added once.`); continue; }
      seen.add(key);
      if(onRoll[key]){
        keep.push(onRoll[key].name);
        if(register_no && String(onRoll[key].register_no || '') !== register_no) regUpdates.push({ id: onRoll[key].id, name: onRoll[key].name, register_no });
        continue;
      }
      const adm = admCol !== undefined ? normaliseImportDate(r[admCol]) : '';
      const dob = dobCol !== undefined ? normaliseImportDate(r[dobCol]) : '';
      if(adm === null){ problems.push(`Row ${i + 1} (${name}): admitted date "${r[admCol]}" isn't a date I can read — today's date will be used.`); }
      if(dob === null){ problems.push(`Row ${i + 1} (${name}): date of birth "${r[dobCol]}" isn't a date I can read — left blank.`); }
      let gender = genderCol >= 0 ? (r[genderCol] || '').trim() : '';
      if(/^f/i.test(gender)) gender = 'Female'; else if(/^m/i.test(gender)) gender = 'Male'; else gender = '';
      add.push({ name, register_no, admitted_date: adm || todayDateKey(), dob: dob || '', gender });
    }
    const remove = removeMissing ? realPupilsCache.filter(p => !seen.has(normPupilName(p.name))).map(p => ({ id: p.id, name: p.name })) : [];
    if(!add.length && !remove.length && !regUpdates.length){
      resultEl.innerHTML = `<div class="au-success">Nothing to change — all ${keep.length} name${keep.length === 1 ? '' : 's'} in the file are already on the roll.</div>` + (problems.length ? `<div class="au-error" style="margin-top:6px;">${problems.map(esc).join('<br>')}</div>` : '');
      return;
    }
    pendingPupilSync = { add, keep, remove, removeMissing, regUpdates };
    const list = arr => arr.slice(0, 40).map(esc).join(', ') + (arr.length > 40 ? ' …and ' + (arr.length - 40) + ' more' : '');
    resultEl.innerHTML = `<div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
      <p style="margin:0 0 8px; font-weight:600;">Preview — nothing has been saved yet</p>
      ${add.length ? `<p style="margin:0 0 6px;"><b style="color:var(--good,#0a7a0a);">${add.length} to add</b> to ${esc(myClassInfo.class_name || 'this class')}: <span class="cap">${list(add.map(a => a.name))}</span></p>` : ''}
      <p style="margin:0 0 6px;"><b>${keep.length} already on the roll</b> — left as they are${regUpdates.length ? `, except <b>${regUpdates.length}</b> whose register number will be saved: <span class="cap">${regUpdates.slice(0, 30).map(u => esc(u.register_no + ' ' + u.name)).join(', ')}${regUpdates.length > 30 ? ' …' : ''}</span>` : ''}.</p>
      ${add.length ? `<p class="cap" style="margin:0 0 6px;">${add.filter(a => a.register_no).length} of the ${add.length} new children have a register number.</p>` : ''}
      ${remove.length ? `<p style="margin:0 0 6px;"><b style="color:var(--crit,#d03b3b);">${remove.length} to take off the roll</b> (not in the file): <span class="cap">${list(remove.map(r => r.name))}</span><br><span class="cap">Their past attendance and assessments are kept; they just stop appearing on new registers.</span></p>` : ''}
      ${problems.length ? `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:8px 10px; margin:8px 0; font-size:12.5px;">${problems.slice(0, 15).map(esc).join('<br>')}</div>` : ''}
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="confirmClassPupilImport()">Confirm — ${[add.length ? 'add ' + add.length : '', remove.length ? 'remove ' + remove.length : '', regUpdates.length ? 'save ' + regUpdates.length + ' register no.' : ''].filter(Boolean).join(', ')}</button>
        <button class="btn" onclick="pendingPupilSync = null; document.getElementById('classPupilImportResult').innerHTML = '<p class=&quot;cap&quot;>Import cancelled — nothing was saved.</p>';">Cancel</button>
      </div></div>`;
  }
  // Turns one sheet into plain text rows for the class-list preview,
  // starting at the header row (the first row with a name heading).
  function siClassListRows(grid){
    const toText = v => v instanceof Date ? siYmd(v) : String(v == null ? '' : v).trim();
    for(let r = 0; r < Math.min(grid.length, 40); r++){
      const row = grid[r] || [];
      const norm = row.map(v => siNorm(v));
      if(norm.some(h => SI_NAME_WORDS.includes(h))){
        const out = grid.slice(r).map(x => (x || []).map(toText));
        const nameIdx = norm.findIndex(h => SI_NAME_WORDS.includes(h));
        const names = out.slice(1).filter(x => (x[nameIdx] || '').trim()).length;
        return names ? { rows: out, names } : null;
      }
    }
    return null;
  }
  // Step shown when the file is a CLASS LIST (names, no attendance marks).
  function renderSmartClassListStep(fileName, rows){
    const out = siPanel();
    smartImport = { fileName, classList: rows };
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 4px; font-weight:600;">“${esc(fileName)}” is a class list — it has children's names but no attendance marks.</p>
      <p class="cap" style="margin:0 0 10px;">So I'll update ${esc(myClassInfo.class_name || 'this class')}'s roll: add new children, save register numbers, and leave children already on the roll as they are. Nothing is saved until you confirm.</p>
      <label style="display:flex; align-items:flex-start; gap:8px; font-size:13px; margin:4px 0 10px;">
        <input type="checkbox" id="classPupilRemoveMissing" style="margin-top:3px;" onchange="previewClassPupilImportRows(smartImport.classList, document.getElementById('classPupilImportResult'), this.checked)" />
        <span>This file is the <b>complete</b> class list — take children who are not in it off the roll (their past records are kept).</span>
      </label>
      <div id="classPupilImportResult" style="word-break:break-word; overflow-wrap:anywhere;"></div>
    </div>`;
    previewClassPupilImportRows(rows, document.getElementById('classPupilImportResult'), false);
  }
  // ---- Moved from part 10 (Pre-Test class PDF) ----
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
    doc.text('Absent = no mark: the child was absent and has not completed that activity. Absences are not counted in B / P / A, Avg or %.', 14, 25);
    doc.autoTable({
      startY: 29,
      head: [['#', 'Type', 'Activity', 'CG', 'B Beginner', 'P Proficient', 'A Advanced', 'Absent', 'Avg', '% Advanced']],
      body: WEEKLY_ASSESSMENT_ACTIVITIES.map((a, idx) => {
        const t = preTestTallyEntries[String(idx)] || { count_e: 0, count_p: 0, count_a: 0 };
        const marked = t.count_e + t.count_p + t.count_a;
        const rowAvg = marked ? Math.round((t.count_a*3 + t.count_p*2 + t.count_e*1) / marked * 100) / 100 : 0;
        const rowPctA = marked ? Math.round(t.count_a / marked * 100) : 0;
        return [idx + 1, a.type, a.activity, a.cg, t.count_e, t.count_p, t.count_a, Math.max(0, assessmentPupilNames().length - marked), rowAvg, marked ? rowPctA + '%' : '—'];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });
    const secondTableY = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : 26) + 10;
    doc.setFontSize(12);
    doc.text('Per-student summary', 14, secondTableY);
    doc.autoTable({
      startY: secondTableY + 4,
      head: [['Child', 'Activities completed', 'Absent for (not completed)', 'B', 'P', 'A', 'Total score', 'Max possible', '% Achievement', 'Band']],
      body: assessmentPupilNames().map(name => {
        let se = 0, sp = 0, sa = 0, assessed = 0;
        WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
          const v = preTestAssessmentEntries[name] && preTestAssessmentEntries[name][String(idx)];
          if(v === 'B') se++; else if(v === 'P') sp++; else if(v === 'A') sa++;
          if(v === 'B' || v === 'P' || v === 'A') assessed++; // AB (absent for this activity) is not evaluated
        });
        const totalScore = sa*3 + sp*2 + se*1;
        const maxPossible = assessed * 3;
        const pctAchievement = maxPossible ? Math.round(totalScore / maxPossible * 100) : 0;
        const band = !assessed ? 'Absent for all' : pctAchievement >= 85 ? 'Advanced' : pctAchievement >= 60 ? 'Proficient' : 'Beginner';
        const absent = preTestAbsentList(name);
        return [name, assessed + ' of ' + WEEKLY_ASSESSMENT_ACTIVITIES.length, absent.length ? (absent.length === WEEKLY_ASSESSMENT_ACTIVITIES.length ? 'all activities' : absent.length + ': no. ' + preTestRanges(absent)) : '—', se, sp, sa, totalScore, maxPossible, assessed ? pctAchievement + '%' : '—', band];
      }),
      styles: { fontSize: 8 },
      columnStyles: { 2: { cellWidth: 52 } },
      headStyles: { fillColor: [37, 99, 60] }
    });
    doc.save('pre-test-' + todayKey() + '.pdf');
  }
  // ---- Moved from part 14 (download sheets for the import cards) ----
  // ---- ⬇ Download sheet: this month's register, ready to fill in and import ----
  function downloadAttendanceSheetTemplate(){
    if(typeof XLSX === 'undefined'){ alert('.xlsx support did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const y = calendarYear, m = calendarMonth, days = new Date(y, m + 1, 0).getDate();
    const dates = []; for(let d = 1; d <= days; d++){ const dow = new Date(y, m, d).getDay(); if(dow !== 0) dates.push(d); }
    const header = ['Register No', 'Student Name', ...dates];
    const rows = (Array.isArray(realPupilsCache) ? realPupilsCache : []).map(p => [p.register_no || '', p.name, ...dates.map(d => {
      const v = (attendanceRecords[y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')] || {})[p.id];
      return v === 'present' || v === 'late' ? 'P' : v === 'absent' ? 'A' : '';
    })]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [{ wch: 12 }, { wch: 26 }, ...dates.map(() => ({ wch: 4 }))];
    const wb = XLSX.utils.book_new();
    const sheetName = new Date(y, m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, 'attendance-' + sheetName.replace(/\s+/g, '-').toLowerCase() + '-' + (myClassInfo.class_name || 'class').replace(/\s+/g, '') + '.xlsx');
  }
  // ---- ⬇ Download sheet for an assessment, in the layout the import reads ----
  function assessDownloadSheet(type){
    if(type === 'viva'){ if(window.vivaDownloadTemplate) window.vivaDownloadTemplate(); return; }
    if(typeof XLSX === 'undefined'){ alert('.xlsx support did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    if(type === 'motor'){ downloadMotorImportTemplate(); return; }
    const kids = Array.isArray(realPupilsCache) ? realPupilsCache : [];
    let aoa, name;
    const letter = v => v === 'E' ? 'B' : (v === 'P' || v === 'A') ? v : ''; // the sheet uses B/P/A, like the screen
    if(type === 'observation'){
      const themes = observationThemesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth] || [];
      const items = themes.flatMap(t => t.items.map(it => ({ t, it })));
      const marks = observationAssessmentCache[currentWorkbookMonth] || {};
      aoa = [['Register No', 'Student Name', ...items.map(x => x.it.cg_code + ' ' + x.t.name)], ...kids.map(p => [p.register_no || '', p.name, ...items.map(x => letter((marks[p.id] || {})[x.it.id]))])]; // CG + theme, so a CG under two themes imports back to the right column
      name = 'observation-' + currentWorkbookMonth;
    } else if(type === 'workbook'){
      const books = workbookCompetenciesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth] || [];
      const book = books.find(b => b.name === currentWorkbookCompetencyBookName) || books[0];
      const tally = workbookCompetencyTallyCache[currentWorkbookMonth] || {};
      aoa = [['cg_code', 'competency', 'count_b', 'count_p', 'count_a'], ...(book ? book.competencies : []).map(c => { const t = tally[c.id] || {}; return [c.cg_code, c.competency_text || '', t.count_e || '', t.count_p || '', t.count_a || '']; })];
      name = 'workbook-' + currentWorkbookMonth;
    } else {
      ensurePreTestTallyForClass();
      aoa = [['activity_no', 'activity', 'count_b', 'count_p', 'count_a'], ...WEEKLY_ASSESSMENT_ACTIVITIES.map((a, i) => { const t = preTestTallyEntries[String(i)] || {}; return [i + 1, a.activity, t.count_e || '', t.count_p || '', t.count_a || '']; })];
      name = 'pretest';
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, name.toLowerCase() + '-' + (myClassInfo.class_name || 'class').replace(/\s+/g, '') + '.xlsx');
  }
  // ---- Moved from part 14 ----
  // ---- Card layouts for Σ Total (less scrolling than wide tables) ----
  const CG_CARD_GRID = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:12px;';
  function cgLevelPill(L, short){
    if(!L) return '<span class="dim">—</span>';
    return short ? gradeDot(L.letter, 22, 'average ' + L.avg) : gradePill(L.letter, 'average ' + L.avg); // js/grade-scale.js
  }
  function cgGroupCardsHtml(codes, rows, include, srcNames, lvl){
    const groups = {};
    codes.forEach(c => { (groups[cgMajor(c)] = groups[cgMajor(c)] || []).push(c); });
    const short = { observation: 'Obs', workbook: 'WB', pretest: 'Pre-Test', motor: 'Motor' };
    let html = '<div data-no-export="1" style="' + CG_CARD_GRID + '">';
    Object.keys(groups).sort((a, b) => a - b).forEach(maj => {
      const tot = { b: 0, p: 0, a: 0 };
      const lines = groups[maj].map(code => {
        const r = rows[code], t = cgRowTotal(r, include);
        tot.b += t.b; tot.p += t.p; tot.a += t.a;
        const src = Object.keys(srcNames).filter(k => include[k] && r[k].b + r[k].p + r[k].a).map(k => short[k] + ' ' + r[k].b + '·' + r[k].p + '·' + r[k].a).join('  ·  ');
        return `<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; padding:7px 0; border-top:1px solid var(--border);">
          <div style="min-width:0;"><b>${esc(code)}</b><div class="cap">${src ? esc(src) : 'Not counted (unticked)'}</div></div>
          <div style="text-align:right; white-space:nowrap;"><span class="cap">${t.b}·${t.p}·${t.a}</span> ${cgLevelPill(cgLevel(t.b, t.p, t.a), true)}</div></div>`;
      }).join('');
      const L = cgLevel(tot.b, tot.p, tot.a);
      html += `<div style="border:1px solid var(--border); border-radius:10px; padding:12px 14px; background:#fff;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:4px;">
          <b style="font-size:15px;">CG-${maj}</b>${cgLevelPill(L)}</div>
        <div class="cap" style="margin-bottom:4px;">${L ? 'B·P·A ' + tot.b + '·' + tot.p + '·' + tot.a + ' · avg ' + L.avg + ' · ' + L.pctPA + '% at P or above' : 'No data available'}</div>
        ${lines}</div>`;
    });
    return html + '</div>';
  }
  // Each child — a compact, filterable list (one slim row per child).
  function childCardsHtml(cgCols, kids, sumFor){
    const id = 'cgKids' + Math.floor(Math.random() * 1e6);
    const rows = realPupilsCache.map((p, i) => {
      const all = { b: 0, p: 0, a: 0 };
      const cells = cgCols.map(c => { const t = sumFor((kids[p.id] || {})[c]); all.b += t.b; all.p += t.p; all.a += t.a; return cgLevel(t.b, t.p, t.a); });
      return { p, roll: i + 1, cells, all, L: cgLevel(all.b, all.p, all.a) };
    });
    const count = k => rows.filter(r => k === 'all' ? true : k === 'none' ? !r.L : r.L && r.L.letter === k).length;
    const letter = L => L ? gradeDot(L.letter, 22, 'average ' + L.avg) : '<span class="dim">·</span>';
    const chip = (k, label, cls) => `<button type="button" data-lv="${k}" onclick="cgKidsFilter('${id}', '${k}', this)" style="padding:6px 12px; border-radius:99px; border:1px solid var(--border); background:${k === 'all' ? 'var(--primary)' : '#fff'}; color:${k === 'all' ? '#fff' : 'var(--text)'}; font-size:12.5px; font-weight:600; cursor:pointer;">${label} <span style="opacity:.8;">${count(k)}</span></button>`;
    let html = `<div data-no-export="1" id="${id}">
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:0 0 12px;">
        ${chip('all', 'All')}${chip('B', 'B Beginner')}${chip('P', 'P Proficient')}${chip('A', 'A Advanced')}${count('none') ? chip('none', 'No data') : ''}
        <input type="text" placeholder="Search name or reg. no…" oninput="cgKidsFilter('${id}')" style="flex:1; min-width:180px; max-width:280px; padding:7px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px;" />
        <select onchange="cgKidsSort('${id}', this.value)" style="padding:7px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px;"><option value="roll">Sort: roll</option><option value="need">Sort: needs support first</option></select>
      </div>
      <div class="report-table-wrap"><table class="report-table" style="font-size:12.5px;"><thead><tr><th>Roll</th><th style="text-align:left;">Child</th>${cgCols.map(c => `<th style="padding:6px 4px;">${esc(c)}</th>`).join('')}<th>B·P·A</th><th>Avg</th><th style="text-align:left;">Overall</th></tr></thead><tbody>`;
    rows.forEach(r => {
      html += `<tr data-child="${esc((r.p.name + ' ' + (r.p.register_no || '')).toLowerCase())}" data-level="${r.L ? r.L.letter : 'none'}" data-roll="${r.roll}" data-avg="${r.L ? r.L.avg : 9}">
        <td style="padding:5px 8px;">${r.roll}</td>
        <td style="text-align:left; padding:5px 8px; white-space:nowrap;"><b>${esc(r.p.name)}</b>${r.p.register_no ? ' <span class="cap">' + esc(r.p.register_no) + '</span>' : ''}</td>
        ${r.cells.map(L => `<td style="padding:5px 4px;">${letter(L)}</td>`).join('')}
        <td style="padding:5px 8px; white-space:nowrap;">${r.all.b + r.all.p + r.all.a ? r.all.b + '·' + r.all.p + '·' + r.all.a : '—'}</td>
        <td style="padding:5px 8px;">${r.L ? r.L.avg : '—'}</td>
        <td style="text-align:left; padding:5px 8px; white-space:nowrap;">${r.L ? cgLevelPill(r.L) : '<span class="dim">No data</span>'}</td></tr>`;
    });
    html += `</tbody></table></div><p class="cap cg-kids-none" style="display:none; margin:10px 0 0;">No child matches.</p></div>`;
    return html;
  }
  function cgKidsFilter(id, level, btn){
    const box = document.getElementById(id); if(!box) return;
    if(level !== undefined){
      box.dataset.level = level;
      box.querySelectorAll('button[data-lv]').forEach(b => { const on = b.dataset.lv === level; b.style.background = on ? 'var(--primary)' : '#fff'; b.style.color = on ? '#fff' : 'var(--text)'; });
    }
    const lv = box.dataset.level || 'all', q = (box.querySelector('input').value || '').toLowerCase().trim();
    let shown = 0;
    box.querySelectorAll('tbody tr').forEach(tr => { const ok = (lv === 'all' || tr.dataset.level === lv) && (!q || tr.dataset.child.includes(q)); tr.style.display = ok ? '' : 'none'; if(ok) shown++; });
    box.querySelector('.cg-kids-none').style.display = shown ? 'none' : '';
  }
  function cgKidsSort(id, by){
    const box = document.getElementById(id); if(!box) return;
    const body = box.querySelector('tbody');
    Array.from(body.children).sort((a, b) => by === 'need' ? (+a.dataset.avg - +b.dataset.avg) || (+a.dataset.roll - +b.dataset.roll) : (+a.dataset.roll - +b.dataset.roll)).forEach(tr => body.appendChild(tr));
  }
  // =================================================================
  // FEEDBACK TO PARENT — for children whose attendance needs a follow-up
  // (below 70%, or 3+ days absent in a row) in Class Attendance → Reports.
  // The message goes to the child's parent / guardian from the REAL family
  // profile, with the child's real figures, in English, Hindi or Marathi.
  // Sent by WhatsApp or SMS (opens the phone's app), or just saved — and
  // always recorded in the database against the child (attendance follow-ups).
  // =================================================================
  var attFb = null; // { pupilId, name, reason, monthLabel, present, marked, pct, lang, guardianIdx }
  const ATT_FB_TEXT = {
    en: f => `Namaste ${f.g}, this is ${f.t} from ${f.cls}, ${f.sch}. ${f.c}'s attendance in ${f.m} is ${f.pct}% (${f.present} of ${f.marked} days).${f.streak ? ' ' + f.c + ' was absent ' + f.streak + ' days in a row.' : ''} Coming to school every day helps ${f.c} learn and make friends. Please send ${f.c} to school daily, and let me know if there is any difficulty. Thank you.`,
    hi: f => `नमस्ते ${f.g}, मैं ${f.t}, ${f.cls}, ${f.sch} से। ${f.c} की ${f.m} की उपस्थिति ${f.pct}% है (${f.marked} में से ${f.present} दिन)।${f.streak ? ' ' + f.c + ' लगातार ' + f.streak + ' दिन अनुपस्थित रहे।' : ''} रोज़ स्कूल आने से ${f.c} अच्छे से सीखते हैं। कृपया ${f.c} को रोज़ स्कूल भेजें, और कोई परेशानी हो तो मुझे बताएं। धन्यवाद।`,
    mr: f => `नमस्कार ${f.g}, मी ${f.t}, ${f.cls}, ${f.sch} मधून. ${f.c} ची ${f.m} मधील उपस्थिती ${f.pct}% आहे (${f.marked} पैकी ${f.present} दिवस).${f.streak ? ' ' + f.c + ' सलग ' + f.streak + ' दिवस गैरहजर होते.' : ''} रोज शाळेत आल्याने ${f.c} चांगले शिकतात. कृपया ${f.c} ला दररोज शाळेत पाठवा, आणि काही अडचण असल्यास मला कळवा. धन्यवाद.`
  };
  function attFbHistory(pupilId){
    const all = (attendanceFollowupsCache && typeof attendanceFollowupsCache === 'object' && attendanceFollowupsCache[pupilId]) || [];
    return all.filter(f => /^Feedback to parent/.test(f.action_type || ''));
  }
  function attFbCell(c, reason, monthLabel){
    const last = attFbHistory(c.id)[0];
    const btn = `<button class="chip" onclick="openAttFeedback(${c.id}, '${reason}', '${esc(monthLabel)}', ${c.present}, ${c.marked}, ${c.pct === null ? 'null' : c.pct}, ${c.longest || 0})" style="white-space:nowrap;">💬 Feedback to parent</button>`;
    return btn + (last ? `<div class="cap" style="margin-top:3px; color:var(--good,#0a7a0a);">Sent ${esc(new Date(last.follow_up_date + 'T00:00:00').toLocaleDateString([], { day: 'numeric', month: 'short' }))} · ${esc((last.action_type || '').replace(/^Feedback to parent — /, ''))}</div>` : '');
  }
  function openAttFeedback(pupilId, reason, monthLabel, present, marked, pct, streak){
    const p = realPupilsCache.find(x => x.id === pupilId); if(!p) return;
    attFb = { pupilId, name: p.name, reason, monthLabel, present, marked, pct, streak, lang: (attFb && attFb.lang) || 'en', guardianIdx: 0 };
    if(!familyRecordsLoaded) ensureFamilyRecordsLoaded(() => renderAttFeedbackPanel());
    renderAttFeedbackPanel();
    const el = document.getElementById('attFbPanel'); if(el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function attFbGuardians(name){
    const r = familyRecords[name];
    return r && Array.isArray(r.guardianNames) ? r.guardianNames.filter(g => g && (g.name || g.phone)) : [];
  }
  function attFbMessage(){
    const gs = attFbGuardians(attFb.name), g = gs[attFb.guardianIdx] || null;
    const teacher = (document.querySelector('.user-name') || {}).textContent || 'the class teacher';
    return ATT_FB_TEXT[attFb.lang]({ g: g && g.name ? g.name : (attFb.lang === 'en' ? 'Parent' : attFb.lang === 'hi' ? 'अभिभावक' : 'पालक'), t: teacher.trim(), cls: myClassInfo.class_name || '', sch: myClassInfo.school_name || '',
      c: attFb.name.split(' ')[0], m: attFb.monthLabel, pct: attFb.pct === null ? '—' : attFb.pct, present: attFb.present, marked: attFb.marked, streak: attFb.streak >= 3 ? attFb.streak : 0 });
  }
  function renderAttFeedbackPanel(){
    const box = document.getElementById('attFbPanel'); if(!box || !attFb) return;
    const gs = attFbGuardians(attFb.name), g = gs[attFb.guardianIdx] || null;
    const phone = g && g.phone ? String(g.phone).trim() : '';
    box.style.display = '';
    box.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
        <b>💬 Feedback to ${esc(attFb.name)}'s parent — ${esc(attFb.monthLabel)}</b>
        <button class="chip" onclick="attFb = null; const b = document.getElementById('attFbPanel'); b.style.display = 'none'; b.innerHTML = '';">✕ Close</button></div>
      ${!familyRecordsLoaded ? '<p class="cap">Loading the family profile…</p>' : gs.length
        ? `<div class="fbar" style="margin-bottom:10px;"><div class="ctl"><label>To</label><select onchange="attFb.guardianIdx = +this.value; renderAttFeedbackPanel();" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${gs.map((x, i) => `<option value="${i}" ${i === attFb.guardianIdx ? 'selected' : ''}>${esc(x.name || 'Guardian')}${x.rel ? ' (' + esc(x.rel) + ')' : ''}${x.phone ? ' · ' + esc(x.phone) : ' · no number'}</option>`).join('')}</select></div>
           <div class="ctl"><label>Language</label><select onchange="attFb.lang = this.value; renderAttFeedbackPanel();" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"><option value="en" ${attFb.lang === 'en' ? 'selected' : ''}>English</option><option value="hi" ${attFb.lang === 'hi' ? 'selected' : ''}>हिंदी</option><option value="mr" ${attFb.lang === 'mr' ? 'selected' : ''}>मराठी</option></select></div></div>`
        : '<div class="au-error" style="margin-bottom:10px;">No family profile for ' + esc(attFb.name) + ' yet — add the parent in Family & Parents to send this to them. You can still save the feedback as a note.</div>'}
      <textarea id="attFbText" rows="5" style="width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box; line-height:1.5;">${esc(attFbMessage())}</textarea>
      <div class="imp-btns" style="margin-top:10px;">
        <button class="imp-btn primary" ${phone ? '' : 'disabled title="No phone number on file"'} onclick="sendAttFeedback('WhatsApp')">🟢 Send on WhatsApp</button>
        <button class="imp-btn" ${phone ? '' : 'disabled title="No phone number on file"'} onclick="sendAttFeedback('SMS')">✉ Send SMS</button>
        <button class="imp-btn" onclick="sendAttFeedback('Saved')">💾 Save only</button>
      </div>
      <p class="cap" style="margin:8px 0 0;">Edit the message as you like. It is saved against ${esc(attFb.name)} (to ${esc(g && g.name ? g.name : 'the parent')}) and shows in Class Attendance's follow-ups.</p>`;
  }
  async function sendAttFeedback(channel){
    if(!attFb) return;
    const text = (document.getElementById('attFbText') || {}).value || attFbMessage();
    const gs = attFbGuardians(attFb.name), g = gs[attFb.guardianIdx] || null;
    let digits = g && g.phone ? String(g.phone).replace(/\D/g, '') : '';
    if(digits.length === 10) digits = '91' + digits;      // Indian mobile → country code for WhatsApp
    if(channel === 'WhatsApp' && digits) window.open('https://wa.me/' + digits + '?text=' + encodeURIComponent(text), '_blank');
    if(channel === 'SMS' && digits) window.location.href = 'sms:+' + digits + '?body=' + encodeURIComponent(text);
    try{
      const res = await fetch('backend/attendance/save_attendance_followup.php' + window.location.search, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: myClassInfo.class_id, pupil_id: attFb.pupilId, reason: attFb.reason, follow_up_date: todayDateKey(),
          action_type: 'Feedback to parent — ' + channel,
          note: 'To: ' + (g ? (g.name || 'Guardian') + (g.rel ? ' (' + g.rel + ')' : '') + (g.phone ? ', ' + g.phone : '') : 'parent (no profile)') + ' · ' + attFb.monthLabel + ' · ' + text })
      });
      const data = await res.json();
      if(data.status !== 'success') throw new Error(data.message || 'Could not save.');
      attendanceFollowupsCache = null; // reload so the row shows "Sent …"
      if(typeof ensureAttendanceFollowupsLoaded === 'function') ensureAttendanceFollowupsLoaded();
      alert('Feedback ' + (channel === 'Saved' ? 'saved' : 'recorded as sent by ' + channel) + ' for ' + attFb.name + '.');
      attFb = null;
      setTimeout(() => { if(classAttendanceTab === 'reports') renderAttendanceReports(); }, 600);
    } catch(err){ alert('The message ' + (channel === 'Saved' ? '' : 'opened, but it ') + 'could not be saved: ' + err.message); }
  }
    // "✍ Enter manually" on Class Attendance: close the import panel and go to the day's register (Present / Absent).
  function goToAttendanceRegister(){
    const panel = document.getElementById('smartImportPanel'); if(panel) panel.innerHTML = '';
    const head = document.getElementById('attRegisterTop'); if(!head) return;
    window.scrollTo({ top: head.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' }); // 90 = room for the top bar
    head.style.transition = 'background .6s'; head.style.background = 'var(--primary-soft, #e6f4ec)';
    setTimeout(() => { head.style.background = ''; }, 1400);
  }
  function attendanceManualSheet(){
    const y = calendarYear, m = calendarMonth, days = new Date(y, m + 1, 0).getDate();
    const dates = []; for(let d = 1; d <= days; d++){ const dow = new Date(y, m, d).getDay(); if(dow !== 0 && dow !== 6) dates.push(d); }
    const grid = [['Student Name', ...dates.map(String)]];
    (Array.isArray(realPupilsCache) ? realPupilsCache : []).forEach(p => grid.push([p.name, ...dates.map(d => {
      const v = (attendanceRecords[y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')] || {})[p.id];
      return v === 'present' || v === 'late' ? 'P' : v === 'absent' ? 'A' : '';
    })]));
    if(grid.length < 2){ siPanel().innerHTML = '<div class="au-error">There are no children on the roll yet — add them first (Admissions).</div>'; return; }
    photoGridSheetName = new Date(y, m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
    photoGridSource = 'manual';
    renderPhotoGridEditor(grid, 'attendance');
  }
  // Admissions: blank rows to type children in.
  var rollSheetRows = null;
  function admissionsManualSheet(){
    rollSheetRows = rollSheetRows || Array.from({ length: 5 }, () => ['', '', '', '', '']);
    renderRollSheet();
  }
  function renderRollSheet(){
    const out = siPanel();
    const heads = ['Register No', 'Student Name', 'Admission date', 'Date of birth', 'Gender'];
    const types = ['text', 'text', 'date', 'date', 'gender'];
    let t = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 4px; font-weight:600;">✍ Enter children manually — nothing is saved yet</p>
      <p class="cap" style="margin:0 0 10px;">One child per row. Only the name is needed; empty rows are skipped. Then <b>Next — preview</b> checks for children already on the roll before anything is saved.</p>
      <div class="report-table-wrap"><table class="report-table" style="min-width:760px;"><thead><tr>${heads.map(h => `<th style="text-align:left;">${h}</th>`).join('')}<th></th></tr></thead><tbody>`;
    rollSheetRows.forEach((r, i) => {
      t += '<tr>' + types.map((ty, j) => {
        const on = `onchange="rollSheetRows[${i}][${j}] = this.value"`;
        if(ty === 'gender') return `<td><select ${on} style="padding:6px; border:1px solid var(--border); border-radius:6px;"><option value=""></option><option ${r[j] === 'Female' ? 'selected' : ''}>Female</option><option ${r[j] === 'Male' ? 'selected' : ''}>Male</option></select></td>`;
        return `<td><input type="${ty}" value="${esc(r[j])}" ${on} placeholder="${j === 0 ? 'e.g. 7101' : j === 1 ? 'Full name' : ''}" style="width:100%; min-width:${j === 1 ? 190 : 110}px; padding:6px 8px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></td>`;
      }).join('') + `<td><button class="chip" onclick="rollSheetRows.splice(${i}, 1); if(!rollSheetRows.length) rollSheetRows.push(['', '', '', '', '']); renderRollSheet();" title="Remove this row">✕</button></td></tr>`;
    });
    t += `</tbody></table></div>
      <div class="imp-btns" style="margin-top:12px;">
        <button class="imp-btn" onclick="rollSheetRows.push(['', '', '', '', '']); renderRollSheet();">＋ Add row</button>
        <button class="imp-btn primary" onclick="rollSheetContinue()">Next — preview</button>
        <button class="imp-btn" onclick="rollSheetRows = null; siPanel().innerHTML = '<p class=&quot;cap&quot;>Cancelled — nothing was saved.</p>';">Cancel</button>
      </div></div>`;
    out.innerHTML = t;
  }
  function rollSheetContinue(){
    const rows = (rollSheetRows || []).filter(r => String(r[1] || '').trim());
    if(!rows.length){ alert('Type at least one child\u2019s name.'); return; }
    rollSheetRows = null;
    renderSmartClassListStep('the children you typed', [['Register No', 'Student Name', 'Admission date', 'Date of birth', 'Gender'], ...rows]);
  }
  // Assessment: the roll (or the competencies / activities) with what is saved, as an editable sheet.
  function assessManualSheet(type){
    if(type === 'viva'){ if(window.vivaFocusGrid) window.vivaFocusGrid(); return; }
    const targets = assessTargets(type);
    if(!targets){ assessPanel().innerHTML = '<div class="au-error">This tab has not finished loading its items — wait a moment and try again.</div>'; return; }
    const kids = Array.isArray(realPupilsCache) ? realPupilsCache : [];
    let grid;
    if(assessIsTally(type)){
      const cur = key => { if(type === 'pretest'){ ensurePreTestTallyForClass(); return preTestTallyEntries[String(+key - 1)] || {}; }
        const books = workbookCompetenciesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth] || [];
        const c = books.flatMap(b => b.competencies).find(x => x.cg_code === key); return c ? ((workbookCompetencyTallyCache[currentWorkbookMonth] || {})[c.id] || {}) : {}; };
      grid = [['Key', 'B Beginner', 'P Proficient', 'A Advanced'], ...targets.map(t => { const v = cur(t.key); return [t.key, String(v.count_e || 0), String(v.count_p || 0), String(v.count_a || 0)]; })];
    } else {
      const letter = (p, t) => {
        if(type === 'motor'){ return motorLetter(motorRating(p.id, motorSkillType, t.key)); }
        const themes = observationThemesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth] || [];
        const it = themes.flatMap(th => th.items.map(i => ({ th, i }))).find(x => x.th.name === t.theme && x.i.cg_code === t.cg);
        const v = it ? ((observationAssessmentCache[currentWorkbookMonth] || {})[p.id] || {})[it.i.id] : '';
        return v === 'E' ? 'B' : v || '';
      };
      grid = [['Student Name', ...targets.map(t => t.cg || t.key)], ...kids.map(p => [p.name, ...targets.map(t => letter(p, t))])];
    }
    if(assessIsTally(type)){
      assessSmart = assessAnalyse(type, grid, 'the sheet you typed', 'manual');
    } else {
      // Typing sheet: EVERY item as a column (empty ones too), every child as a row.
      assessSmart = { type, fileName: 'the sheet you typed', source: 'manual', tally: false, targets, grid,
        columns: targets.map((t, j) => ({ col: j + 1, label: t.cg || t.key, target: t.key })),
        rows: kids.map((p, i) => ({ raw: p.name, pupilId: p.id, include: true, marks: grid[i + 1].slice(1).map(v => assessMark(v)), rawMarks: grid[i + 1].slice(1) })) };
    }
    renderAssessSmartPreview();
  }
  // One download card at the end of a report. Any problem shows on screen,
  // so a download can never fail silently.
