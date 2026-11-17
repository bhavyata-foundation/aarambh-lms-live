function setPreTestChildCount(name, activityIdx, field, value){
    if(typeof preTestAssessmentEntries === 'undefined') return;
    const v = Math.max(0, Math.min(1, parseInt(value,10) || 0));
    if(!preTestAssessmentEntries[name]) preTestAssessmentEntries[name] = {};
    const key = String(activityIdx);
    const current = preTestAssessmentEntries[name][key] || '';
    if(v === 1) preTestAssessmentEntries[name][key] = field;
    else if(current === field) delete preTestAssessmentEntries[name][key];
    savePreTestAssessmentEntries();
    syncPreTestTallyFromChildEntries();
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  function syncPreTestTallyFromChildEntries(){
    if(typeof preTestAssessmentEntries === 'undefined') return;
    Object.keys(preTestTallyEntries).forEach(k => delete preTestTallyEntries[k]);
    assessmentPupilNames().forEach(name => {
      const rec = preTestAssessmentEntries[name] || {};
      Object.keys(rec).forEach(k => {
        const v = rec[k];
        if(!preTestTallyEntries[k]) preTestTallyEntries[k] = {count_e:0,count_p:0,count_a:0};
        if(v === 'B') preTestTallyEntries[k].count_e++;
        else if(v === 'P') preTestTallyEntries[k].count_p++;
        else if(v === 'A') preTestTallyEntries[k].count_a++;
      });
    });
    savePreTestTallyEntries();
  }
  async function importPreTestFile(){
    const input = document.getElementById('preTestImportInput');
    const resultEl = document.getElementById('preTestImportResult');
    if(!input || !input.files.length){ resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>'; return; }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';
    let rows;
    try { rows = await readAssessmentFileRows(input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }
    const header = rows[0].map(h => String(h).trim().toLowerCase());
    if(header.join(',') !== 'child_name,register_no,activity_no,b,p,a'){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: child_name,register_no,activity_no,B,P,A — got: ${esc(rows[0].join(','))}</div>`; return;
    }
    if(typeof preTestAssessmentEntries === 'undefined'){
      resultEl.innerHTML = '<div class="au-error">Pre-Test child records are not loaded. Refresh the page and try again.</div>'; return;
    }
    const pupils = assessmentPupilNames();
    let imported=0; const skipped=[];
    for(let i=1;i<rows.length;i++){
      const parts = rows[i]; const rowNum=i+1;
      if(parts.length !== 6){ skipped.push(`Row ${rowNum}: expected 6 columns, got ${parts.length}`); continue; }
      const childName=String(parts[0]).trim(), activityNo=parseInt(parts[2],10);
      const b=parseInt(parts[3],10), p=parseInt(parts[4],10), a=parseInt(parts[5],10);
      if(!pupils.includes(childName)){ skipped.push(`Row ${rowNum}: "${childName}" is not a child in this class`); continue; }
      if(!Number.isInteger(activityNo) || activityNo<1 || activityNo>WEEKLY_ASSESSMENT_ACTIVITIES.length){ skipped.push(`Row ${rowNum}: activity_no must be 1-${WEEKLY_ASSESSMENT_ACTIVITIES.length}`); continue; }
      if(![b,p,a].every(x=>x===0||x===1)){ skipped.push(`Row ${rowNum}: B, P and A must each be 0 or 1`); continue; }
      const sum=b+p+a;
      if(sum!==0 && sum!==1){ skipped.push(`Row ${rowNum}: exactly one of B/P/A must be 1, or all three must be 0`); continue; }
      if(!preTestAssessmentEntries[childName]) preTestAssessmentEntries[childName]={};
      const key=String(activityNo-1);
      if(sum===0) delete preTestAssessmentEntries[childName][key];
      else preTestAssessmentEntries[childName][key] = b===1 ? 'B' : p===1 ? 'P' : 'A';
      imported++;
    }
    if(imported){ savePreTestAssessmentEntries(); syncPreTestTallyFromChildEntries(); }
    let html=`<div class="au-success">✓ Imported ${imported} child/activity record${imported===1?'':'s'} — saved.</div>`;
    if(skipped.length) html += `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<ul style="margin:4px 0 0 18px;">${skipped.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>`;
    resultEl.innerHTML=html;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  // (downloadPreTestClassPdf moved to part 14 to keep this file under 1000 lines.)
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
    doc.text('Recording complete: ' + completeness + '%   ·   ·   At Proficient or above: ' + sriPct + '%', 14, 27);
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
  var obsRangeFrom = null, obsRangeTo = null; // Classroom Observation: From / To months
  const observationThemesCache = {}; // level+'|'+month -> null|'loading'|'error:...'|[{id,name,items:[{id,cg_code}]}]
  async function observationFetchJson(path, params){
    const url = new URL(path, document.baseURI);
    Object.entries(params || {}).forEach(([k,v]) => url.searchParams.set(k, v));
    const current = new URL(window.location.href);
    current.searchParams.forEach((v,k) => { if(!url.searchParams.has(k)) url.searchParams.set(k,v); });
    url.searchParams.set('_ts', String(Date.now()));
    const res = await fetch(url.href, { credentials:'same-origin', cache:'no-store', headers:{'Accept':'application/json'} });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw.replace(/^\uFEFF/, '')); }
    catch(e){ throw new Error('Server returned invalid JSON (HTTP ' + res.status + ').'); }
    if(!res.ok || data.status !== 'success') throw new Error(data.message || ('HTTP ' + res.status));
    return data;
  }
  function ensureObservationThemesLoaded(level, month, reRenderFn){
    const key = level + '|' + month;
    if(Array.isArray(observationThemesCache[key])) return true;
    if(observationThemesCache[key] === 'loading') return false;
    if(typeof observationThemesCache[key] === 'string' && observationThemesCache[key].startsWith('error:')) return true;
    observationThemesCache[key] = 'loading';
    observationFetchJson('backend/assessment/observation/get_observation_themes.php', { level, month })
      .then(data => {
        observationThemesCache[key] = Array.isArray(data.themes) ? data.themes : 'error:Server returned no observation themes.';
        reRenderFn();
      })
      .catch(err => { observationThemesCache[key] = 'error:' + (err.message || 'Could not load observation themes.'); reRenderFn(); });
    return false;
  }
  const observationAssessmentCache = {}; // month -> null|'loading'|'error:...'|{ [pupilId]: { [itemId]: 'E'|'P'|'A' } }
  const observationTeacherNotesCache = {}; // month|themeId -> notes by pupil
  const observationTeacherNotesInflight = {};
  function ensureObservationTeacherNotesLoaded(month, themeId, reRender){
    const key = month + '|' + themeId;
    if(observationTeacherNotesCache[key] && typeof observationTeacherNotesCache[key] === 'object') return true;
    if(observationTeacherNotesInflight[key]) return false;
    const url = 'backend/assessment/get_assessment_notes.php?' + new URLSearchParams({assessment_type:'observation',month,context_id:themeId}) + (window.location.search ? '&' + window.location.search.slice(1) : '');
    observationTeacherNotesInflight[key] = fetch(url)
      .then(r => r.json())
      .then(d => {
        observationTeacherNotesCache[key] = d.status === 'success' ? (d.notes || {}) : 'error:' + (d.message || 'Could not load teacher notes.');
      })
      .catch(() => { observationTeacherNotesCache[key] = 'error:Could not reach the server.'; })
      .finally(() => {
        delete observationTeacherNotesInflight[key];
        if (typeof reRender === 'function') reRender();
      });
    return false;
  }
  async function saveObservationTeacherNote(pupilId, month, themeId, note){
    const key = month + '|' + themeId, cache = observationTeacherNotesCache[key];
    if(cache && typeof cache === 'object') cache[pupilId] = note;
    try{
      const res = await fetch('backend/assessment/save_assessment_note.php' + window.location.search, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assessment_type:'observation',month,context_id:themeId,pupil_id:pupilId,note})});
      const d = await res.json(); if(d.status !== 'success') throw new Error(d.message || 'Not saved.');
    }catch(err){ alert('That note was not saved: ' + (err.message || err)); delete observationTeacherNotesCache[key]; renderMonthlyAssessment(monthlyAssessmentTargetEl); }
  }
  function ensureObservationAssessmentLoaded(month, reRenderFn){
    if(observationAssessmentCache[month] && typeof observationAssessmentCache[month] === 'object') return true;
    if(observationAssessmentCache[month] === 'loading') return false;
    if(typeof observationAssessmentCache[month] === 'string' && observationAssessmentCache[month].startsWith('error:')) return true;
    observationAssessmentCache[month] = 'loading';
    observationFetchJson('backend/assessment/observation/get_observation_assessment.php', { month })
      .then(data => {
        const byPupil = {};
        (Array.isArray(data.marks) ? data.marks : []).forEach(m => {
          if(!byPupil[m.pupil_id]) byPupil[m.pupil_id] = {};
          byPupil[m.pupil_id][m.observation_item_id] = m.level_mark;
        });
        observationAssessmentCache[month] = byPupil;
        reRenderFn();
      })
      .catch(err => { observationAssessmentCache[month] = 'error:' + (err.message || 'Could not load observation marks.'); reRenderFn(); });
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
      <div class="hd"><div><h3>Import Classroom Observation from a file</h3><p class="cap">.csv or .xlsx — header row must be exactly: child_name,theme,cg_code,level_mark — theme must match a theme name scheduled this month, cg_code must match one of that theme's items, level_mark is B, P or A.</p></div></div>
      <input type="file" id="observationImportInput" accept=".csv,.xlsx" style="margin-top:8px;" />
      <div id="observationImportResult" style="margin-top:10px;"></div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importObservationAssessmentFile()">Import</button>
    `;
    return wrap;
  }
  async function importObservationAssessmentFile(){
    const input = document.getElementById('observationImportInput');
    const resultEl = document.getElementById('observationImportResult');
    if(!smartAssessHandoffRows && (!input || !input.files.length)){ resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>'; return; }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';
    let rows;
    try { rows = await readAssessmentFileRows(input && input.files[0]); }
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
      const [cgBase, occRaw] = String(cgCode || '').trim().split('#'); // "C-4.2#2" = the theme's second C-4.2 item
      const item = theme.items.filter(it => it.cg_code.toLowerCase() === cgBase.toLowerCase())[(parseInt(occRaw, 10) || 1) - 1];
      if(!item){ skipped.push(`Row ${rowNum}: CG code "${cgCode}" isn't part of "${theme.name}"`); continue; }
      let mark = (levelMarkRaw || '').trim().toUpperCase();
      if(mark === 'B') mark = 'E'; // B (Beginner) is stored as E
      if(!['E','P','A'].includes(mark)){ skipped.push(`Row ${rowNum}: level_mark must be B, P, or A — got "${levelMarkRaw}"`); continue; }
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
