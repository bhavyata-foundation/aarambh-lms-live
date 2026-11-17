function renderMyComplianceOverview(container){
    const complianceStats = computeComplianceStatsForMonth(calendarYear, calendarMonth);
    const studentStats = computeAttendanceDashboardStats(calendarYear, calendarMonth);
    // Real, verified data sources — each one traced to an actual
    // store elsewhere in this app before being wired here, not
    // assumed. hasData:false means "genuinely nothing recorded yet",
    // shown as such below rather than a fabricated 0%.
    const dims = COMPLIANCE_DIMENSIONS.map(k => {
      if(k === 'Teacher attendance'){
        return { k, v: complianceStats.myAttendancePct, real: true, hasData: true };
      }
      if(k === 'Daily plan'){
        return { k, v: complianceStats.plansSubmittedPct, real: true, hasData: complianceStats.hasPlans };
      }
      if(k === 'Attendance register'){
        const hasData = studentStats.hasData;
        return { k, v: hasData ? Math.round(studentStats.daysMarked / studentStats.studentDays * 100) : 0, real: true, hasData };
      }
      if(k === 'Assessment'){
        // Real, coarse "has grading actually started this month"
        // signal across all three Assessment screens — not a
        // weighted score, just how many of the three have any real
        // count entered at all.
        const wbTally = workbookCompetencyTallyCache[currentWorkbookMonth];
        const wbAny = wbTally && typeof wbTally === 'object' && Object.values(wbTally).some(t => (t.count_e||0)+(t.count_p||0)+(t.count_a||0) > 0);
        ensurePreTestTallyForClass();
        const ptAny = Object.values(preTestTallyEntries).some(t => (t.count_e||0)+(t.count_p||0)+(t.count_a||0) > 0);
        const obsCache = observationAssessmentCache[currentWorkbookMonth];
        const obsAny = obsCache && typeof obsCache === 'object' && Object.keys(obsCache).some(pid => Object.keys(obsCache[pid] || {}).length > 0);
        const signals = [wbAny, ptAny, obsAny];
        return { k, v: Math.round(signals.filter(Boolean).length / signals.length * 100), real: true, hasData: true };
      }
      if(k === 'Monthly Effective'){
        const effRec = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
        const stepsDone = [!!effRec.registerDriveLink, !!effRec.signatures.principal, !!effRec.signatures.ao, !!effRec.submittedToFoundation].filter(Boolean).length;
        return { k, v: Math.round(stepsDone / 4 * 100), real: true, hasData: true };
      }
      if(k === 'Materials logged'){
        // Sessions held this week that have materials recorded on their activity card.
        const pr = typeof practiceForWeek === 'function' ? practiceForWeek(currentWeekNum) : null;
        const hasData = !!(pr && pr.delivered);
        return { k, v: hasData ? Math.round(pr.withMaterials / pr.delivered * 100) : 0, real: true, hasData };
      }
      // Photo evidence / TLM plan / PTM prep / Home activity — real
      // sources live in realDimensionSources above.
      if(realDimensionSources[k]){
        const result = realDimensionSources[k]();
        return { k, v: result.v, real: !result.notTracked, hasData: result.hasData, notTracked: !!result.notTracked };
      }
      return { k, v: 0, real: false, hasData: false, notTracked: true }; // never a sample number
    });
    container.appendChild(mdSec('What my supervisor sees', '<span class="reqs">TCM-01…12</span>'));
    container.appendChild((() => {
      const p = document.createElement('p'); p.className = 'cap'; p.style.margin = '4px 0 16px';
      p.innerHTML = 'The same ten dimensions as the supervisor\u2019s view. Deliberately shown as dimensions, never combined into one ranked score \u2014 the dimensions are not equally within a teacher\u2019s control (RPT-15). <b>Teacher attendance</b> is computed from your real attendance record; every other dimension is computed from what is actually recorded in this portal, and shows "No data yet" or "Not tracked yet" rather than a made-up number when nothing is recorded.';
      return p;
    })());
    const dimBarsHtml = (list) => list.map(x => {
      if(x.notTracked){
        return `<div class="hbar-row">
          <div class="hbar-row-label">${esc(x.k)}</div>
          <div class="hbar-track"></div>
          <div class="hbar-count cap">Not tracked yet</div>
        </div>`;
      }
      if(x.real && !x.hasData){
        return `<div class="hbar-row">
          <div class="hbar-row-label">${esc(x.k)} <span class="pill info" style="font-size:9.5px; padding:1px 6px; vertical-align:middle;">real</span></div>
          <div class="hbar-track"></div>
          <div class="hbar-count cap">No data yet</div>
        </div>`;
      }
      const band = mdStatusBand(x.v);
      const color = band.c === 'good' ? 'var(--success)' : band.c === 'warn' ? '#EE8F35' : 'var(--danger,#c8433f)';
      return `<div class="hbar-row">
        <div class="hbar-row-label">${esc(x.k)}${x.real ? ' <span class="pill info" style="font-size:9.5px; padding:1px 6px; vertical-align:middle;">real</span>' : ''}</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${x.v}%; background:${color};"></div></div>
        <div class="hbar-count">${x.v}%</div>
      </div>`;
    }).join('');
    const half = Math.ceil(dims.length / 2);
    const dimGrid = document.createElement('div');
    dimGrid.style.cssText = 'display:grid; grid-template-columns:' + (window.innerWidth < 700 ? '1fr' : 'repeat(2,1fr)') + '; gap:16px; margin-bottom:22px;';
    const dimCardLeft = document.createElement('div'); dimCardLeft.className = 'card'; dimCardLeft.style.padding = '22px';
    dimCardLeft.innerHTML = dimBarsHtml(dims.slice(0, half));
    const dimCardRight = document.createElement('div'); dimCardRight.className = 'card'; dimCardRight.style.padding = '22px';
    dimCardRight.innerHTML = dimBarsHtml(dims.slice(half));
    dimGrid.appendChild(dimCardLeft);
    dimGrid.appendChild(dimCardRight);
    container.appendChild(dimGrid);
    const statGrid = mdGrid('g4', dims.slice(0, 4).map(d => d.hasData
      ? mdTile(d.k, d.v, '%', mdPill(mdStatusBand(d.v).l, mdStatusBand(d.v).c), '', mdMeter(d.v, mdStatusBand(d.v).c))
      : mdTile(d.k, '—', '', mdPill(d.notTracked ? 'Not tracked yet' : 'No data yet', 'neu'), '')));
    statGrid.style.marginBottom = '22px';
    container.appendChild(statGrid);
    // Data freshness — no real "last updated" timestamp is tracked
    // anywhere in this app for any of these (dailyPlanEntries, the
    // assessment tally caches, etc. store the latest value only, not
    // a history), so "updated 3 days ago" was always fabricated. Real
    // presence — has anything actually been recorded this month? —
    // is the honest signal available right now.
    const freshnessItems = [
      ['Daily plan', complianceStats.hasPlans],
      ['Assessment', dims.find(d => d.k === 'Assessment').v > 0],
      ['Workbooks', !!(workbookCompetencyTallyCache[currentWorkbookMonth] && typeof workbookCompetencyTallyCache[currentWorkbookMonth] === 'object')],
      ['Home activity', false] // no real data source exists yet for this
    ];
    // Open actions — real, from the same flagsRecords store Flags &
    // Notifications reads and writes. "Open" concerns/escalations
    // with a real due date, soonest first.
    const openActions = flagsRecords
      .filter(f => f.status === 'open' && f.dueDate)
      .sort((a, b) => a.dueDate < b.dueDate ? -1 : 1);
    const todayStr = todayDateKey();
    container.appendChild(mdGrid('g3', [
      mdCard('Data freshness', 'TCM-11 · an unrecorded value is never shown as a zero.',
        (() => { const d = document.createElement('div'); d.className = 'list';
          d.innerHTML = freshnessItems
            .map(([label, hasData]) => `<div class="row"><div class="t"><b>${esc(label)}</b></div><div>${hasData ? mdPill('Recorded this month', 'good') : mdPill('Nothing recorded yet', 'neu')}</div></div>`).join('');
          return d; })()),
      mdCard('My training record', 'TRN-08 · forms a professional development record.',
        (() => { const d = document.createElement('div'); d.className = 'cap';
          d.style.padding = '4px 0';
          d.textContent = 'No training record has been entered yet — this needs a real training-tracking feature to be built before anything real can show here.';
          return d; })()),
      mdCard('Open actions from my last visit', 'SVR-14 · reviewed at the next visit.',
        openActions.length
          ? (() => { const d = document.createElement('div'); d.className = 'list';
              d.innerHTML = openActions.map(f => {
                const daysLeft = Math.round((new Date(f.dueDate) - new Date(todayStr)) / 86400000);
                const dueLabel = daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : 'Due in ' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's');
                return `<div class="row"><div class="t"><b>${esc(f.text)}</b><span>${esc(dueLabel)}</span></div><div>${mdPill(daysLeft < 0 ? 'Overdue' : 'Open', daysLeft < 0 ? 'crit' : 'warn')}</div></div>`;
              }).join('');
              return d; })()
          : (() => { const d = document.createElement('div'); d.className = 'cap'; d.style.padding = '4px 0';
              d.textContent = 'No open actions right now.';
              return d; })())
    ]));
  }
  // ---------------------------------------------------------------
  // FAMILY RECORDS — real, persisted family/parent data, filled in via
  // the Google Forms import below. Falls back to sampleHousehold()
  // (clearly marked "(sample)") for any child whose family hasn't
  // been imported yet, same honesty convention used everywhere else
  // in this app (Monthly Effective's month-by-month table, Attendance
  // Dashboard, etc.) — never a red zero, never mistaken for real data.
  //
  // Deliberately has NO annual-income field at all, exact or
  // otherwise — only the income band (a controlled list, INCOME_BANDS
  // above) is ever collected or stored. That's a household's business,
  // and a band is what every downstream use of this data actually
  // needs.
  // ---------------------------------------------------------------
  var familyRecords = {}; // child_name -> real imported record, shape built by importFamilyProfileFile below
  let selectedFamilyChildName = null; // tracked so the import handler can refresh whichever child is currently being viewed
  (function loadFamilyRecords(){
    try {
      const raw = localStorage.getItem('familyRecords');
      if(raw) Object.assign(familyRecords, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty, sample fallback covers it */ }
  })();
  function saveFamilyRecords(){
    try { localStorage.setItem('familyRecords', JSON.stringify(familyRecords)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }
  var familyRecordsLoaded = false;
async function ensureFamilyRecordsLoaded(reRenderFn, force){
  if(familyRecordsLoaded && !force) return true;
  if(!myClassInfo.class_id) return false;
  familyRecordsLoaded = true;
  try{
    const params = new URLSearchParams({ class_id: myClassInfo.class_id });
    const res = await fetch('backend/pupils/get_family_profiles.php?' + params.toString() + (window.location.search ? '&' + window.location.search.slice(1) : ''));
    const data = await res.json();
    if(data.status === 'success'){
      Object.assign(familyRecords, data.profiles || {});
      saveFamilyRecords(); // keep localStorage as a same-tab cache, not the source of truth anymore
      if(reRenderFn) reRenderFn();
    }
  } catch(err){
    familyRecordsLoaded = false; // allow retry
  }
  return false;
}
  // Exact column order a teacher's Google Form export (or a manually
  // built spreadsheet) must match. guardian2_* columns may be left
  // blank for a single-guardian household. Multi-value cells
  // (languages_at_home, household_skills, home_resources,
  // workshop_skills) use a semicolon between values, NOT a comma — a
  // comma would be read as a new column and misalign everything after
  // it.
  //
  // workshop_skills / workshop_availability / willing_to_volunteer are
  // the fields Parent Volunteers filters on — this is now the ONE
  // real source for that screen too, not a separate applicant sheet.
  // workshop_skills is deliberately a different column from
  // household_skills above: that one is free-text ("what she's good
  // at" for the household profile), this one is a fixed picklist
  // matched against SKILL_OPTIONS specifically for workshop matching.
  const FAMILY_PROFILE_CSV_HEADER = [
    'child_name', 'guardian1_name', 'guardian1_relation', 'guardian1_occupation', 'guardian1_phone', 'guardian1_education',
    'guardian2_name', 'guardian2_relation', 'guardian2_occupation', 'guardian2_phone', 'guardian2_education',
    'locality', 'mother_tongue', 'languages_at_home', 'income_band', 'household_skills', 'home_resources',
    'siblings_in_programme', 'adult_reads_programme_language', 'photo_consent',
    'workshop_skills', 'workshop_availability', 'willing_to_volunteer'
  ];
  function renderFamilyProfileImportCard(){
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.cssText = 'margin-bottom:22px; overflow:hidden;';
    wrap.innerHTML = `
      <div class="hd"><div><h3>Import Family Profiles from Google Form</h3>
        <p class="cap" style="margin:0 0 8px;">.csv or .xlsx — header row must be exactly:</p>
        <p class="cap" style="margin:0 0 10px; word-break:break-word; overflow-wrap:anywhere; font-family:monospace; font-size:12px; background:var(--bg); border-radius:6px; padding:8px 10px;">${esc(FAMILY_PROFILE_CSV_HEADER.join(','))}</p>
        <p class="cap" style="margin:0; word-break:break-word; overflow-wrap:anywhere;">Leave guardian2_* blank for a single-guardian household. For languages_at_home, household_skills, home_resources and workshop_skills, separate multiple values with a semicolon ( ; ) — not a comma, or it'll be read as a new column.
        income_band should be one of: ${esc(INCOME_BANDS.join(' / '))}. adult_reads_programme_language, photo_consent and willing_to_volunteer should be yes/no.
        workshop_skills should be from: ${SKILL_OPTIONS.map(s=>s.label).join(', ')}. workshop_availability is semicolon-separated day:slot pairs, e.g. Mon:Morning;Wed:Afternoon (slots: ${TIME_SLOTS.map(t=>t.label).join(', ')}).</p></div></div>
      <input type="file" id="familyProfileImportInput" accept=".csv,.xlsx" style="margin-top:8px; max-width:100%;" />
      <div id="familyProfileImportResult" style="margin-top:10px; word-break:break-word; overflow-wrap:anywhere;"></div>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="btn-primary" style="width:auto; padding:9px 16px;" onclick="importFamilyProfileFile()">Import</button>
        <button style="width:auto; padding:9px 16px; border-radius:8px; border:1px solid var(--border); background:#fff; color:var(--danger,#c8433f); cursor:pointer;" onclick="clearImportedFamilyData()">Delete imported data</button>
      </div>
    `;
    return wrap;
  }
  // Wipes every real imported Family Profile record (from familyRecords,
  // including the willingToVolunteer/workshopSkills/teacherApproved
  // fields on it) so the whole class falls back to placeholder data
  // again — for re-testing an import from a clean slate, not a
  // per-household delete.
  function clearImportedFamilyData(){
    const importedCount = Object.keys(familyRecords).length;
    if(!importedCount){ alert('There is no imported Family Profile data to delete.'); return; }
    if(!confirm(`Delete all ${importedCount} imported Family Profile record(s)? This clears willingness, skills, availability, approvals, and scheduled workshops for every household — the whole class reverts to placeholder data until you import again. This cannot be undone.`)) return;
    Object.keys(familyRecords).forEach(name => delete familyRecords[name]);
        if(myClassInfo.class_id){
      fetch('backend/pupils/delete_family_profiles.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id })
      }).catch(() => {});
    }
    saveFamilyRecords();
    alert('Imported Family Profile data deleted. The class is back to placeholder data.');
    // Unconditional, not gated on a visibility check — "The whole
    // class" table (renderHouseholdProfilesSection) and Parent
    // Involvement both read familyRecords too, and a stale hidden-class
    // check here was exactly why this wasn't refreshing live before.
    // Re-rendering into a hidden container is harmless; it's just
    // ready and correct the moment that tab is opened.
    if(typeof renderFamilyParents === 'function') renderFamilyParents(selectedFamilyChildName);
    if(typeof renderParentVolunteers === 'function') renderParentVolunteers();
    if(typeof renderParentInvolvement === 'function') renderParentInvolvement();
  }
  function getFamilyRecordOrSample(name){
    if(familyRecords[name]) return { f: familyRecords[name], isSample: false };
    return { f: sampleHousehold(name), isSample: true };
  }
  const GUARDIAN_EDUCATION_LEVELS = ['No formal education', 'Primary school', 'Secondary school', 'Higher secondary or above'];
  let familyManualEditOpen = false; // reset whenever the child switches, in renderFamilyParents below
  function toggleFamilyManualEdit(){
    familyManualEditOpen = !familyManualEditOpen;
    renderFamilyParents(selectedFamilyChildName);
  }
  // Manual, in-app alternative to the CSV import above — same
  // familyRecords store, same shape importFamilyProfileFile builds,
  // just typed in directly for one child at a time instead of
  // uploaded in bulk. Pre-fills from whatever's currently showing
  // (real record if one exists, sample otherwise) so editing an
  // existing profile doesn't mean starting from a blank form.
  function renderFamilyManualEntryCard(name){
    const existing = familyRecords[name];
    const { f } = getFamilyRecordOrSample(name);
    const g1 = f.guardianNames[0] || {};
    const g1Occ = (f.guardians[0] || {}).occ || '';
    const hasG2 = f.guardianNames.length > 1;
    const g2 = hasG2 ? f.guardianNames[1] : {};
    const g2Occ = hasG2 ? ((f.guardians[1] || {}).occ || '') : '';
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.cssText = 'margin-bottom:22px; padding:22px;';
    const fld = 'width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;';
    const lbl = 'font-size:10.5px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; display:block;';
    const checkboxRow = (options, selected, namePrefix) => options.map(o =>
      `<label style="display:inline-flex; align-items:center; gap:5px; margin:0 14px 6px 0; font-size:12.5px; font-weight:normal; text-transform:none;">
        <input type="checkbox" id="${namePrefix}-${esc(o)}" value="${esc(o)}" ${selected.includes(o) ? 'checked' : ''} /> ${esc(o)}
      </label>`).join('');
    wrap.innerHTML = `
      <h4 style="margin:0 0 4px;">${existing ? 'Edit' : 'Add'} ${esc(name)}'s family profile manually</h4>
      <p class="cap" style="margin:0 0 16px;">Same record the Google Form import writes to — fill this in directly instead, for one child at a time.</p>
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:16px 24px;">
        <div><label style="${lbl}">Guardian 1 name</label><input id="fme_g1name" type="text" value="${esc(g1.name || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Guardian 1 relation</label><input id="fme_g1rel" type="text" placeholder="Mother / Father / Guardian" value="${esc(g1.rel || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Guardian 1 occupation</label><select id="fme_g1occ" style="${fld}"><option value="">Select…</option>${OCCUPATIONS.map(o => `<option ${g1Occ === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <div><label style="${lbl}">Guardian 1 phone</label><input id="fme_g1phone" type="text" value="${esc(g1.phone || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Guardian 1 education</label><select id="fme_g1edu" style="${fld}"><option value="">Select…</option>${GUARDIAN_EDUCATION_LEVELS.map(o => `<option ${g1.edu === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <div></div>
      </div>
      <label style="display:flex; align-items:center; gap:8px; margin:18px 0 0; font-size:13px; font-weight:600; cursor:pointer;">
        <input type="checkbox" id="fme_hasG2" ${hasG2 ? 'checked' : ''} onchange="document.getElementById('fme_g2fields').style.display = this.checked ? 'grid' : 'none';" /> This child has a second guardian
      </label>
      <div id="fme_g2fields" style="display:${hasG2 ? 'grid' : 'none'}; grid-template-columns:repeat(2,1fr); gap:16px 24px; margin-top:12px;">
        <div><label style="${lbl}">Guardian 2 name</label><input id="fme_g2name" type="text" value="${esc(g2.name || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Guardian 2 relation</label><input id="fme_g2rel" type="text" placeholder="Mother / Father / Guardian" value="${esc(g2.rel || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Guardian 2 occupation</label><select id="fme_g2occ" style="${fld}"><option value="">Select…</option>${OCCUPATIONS.map(o => `<option ${g2Occ === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <div><label style="${lbl}">Guardian 2 phone</label><input id="fme_g2phone" type="text" value="${esc(g2.phone || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Guardian 2 education</label><select id="fme_g2edu" style="${fld}"><option value="">Select…</option>${GUARDIAN_EDUCATION_LEVELS.map(o => `<option ${g2.edu === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <div></div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:16px 24px; margin-top:18px;">
        <div><label style="${lbl}">Locality</label><input id="fme_locality" type="text" value="${esc(f.locality || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Mother tongue</label><select id="fme_mothertongue" style="${fld}"><option value="">Select…</option>${LANGUAGES_AT_HOME.map(o => `<option ${f.motherTongue === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <div><label style="${lbl}">Income band</label><select id="fme_income" style="${fld}"><option value="">Select…</option>${INCOME_BANDS.map(o => `<option ${f.income === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <div><label style="${lbl}">Siblings in programme</label><input id="fme_siblings" type="number" min="0" value="${f.siblings || 0}" style="${fld}" /></div>
      </div>
      <div style="margin-top:18px;"><label style="${lbl}">Languages at home</label>${checkboxRow(LANGUAGES_AT_HOME, f.langs || [], 'fme_lang')}</div>
      <div style="margin-top:10px;"><label style="${lbl}">Household skills</label>${checkboxRow(HOUSEHOLD_SKILLS, f.skills || [], 'fme_skill')}</div>
      <div style="margin-top:10px;"><label style="${lbl}">Home resources</label>${checkboxRow(HOME_RESOURCES, f.res || [], 'fme_res')}</div>
      <div style="display:flex; gap:24px; margin-top:16px; flex-wrap:wrap;">
        <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;"><input type="checkbox" id="fme_reads" ${f.reads ? 'checked' : ''} /> Adult reads the programme language</label>
        <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;"><input type="checkbox" id="fme_photoconsent" ${f.photoConsent ? 'checked' : ''} /> Photo consent given</label>
      </div>
      <div style="margin-top:20px; display:flex; gap:10px;">
        <button class="btn-primary" style="width:auto; padding:9px 18px;" onclick="saveFamilyManualEntry('${esc(name)}')">Save profile</button>
        <button style="padding:9px 18px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:13px; font-weight:600; cursor:pointer;" onclick="toggleFamilyManualEdit()">Cancel</button>
      </div>
    `;
    return wrap;
  }
  function checkedValues(options, namePrefix){
    return options.filter(o => {
      const el = document.getElementById(namePrefix + '-' + o);
      return el && el.checked;
    });
  }
  function saveFamilyManualEntry(name){
    const g1Name = document.getElementById('fme_g1name').value.trim();
    if(!g1Name){
      alert('Guardian 1 name is required.');
      return;
    }
    const guardianNames = [{
      name: g1Name,
      rel: document.getElementById('fme_g1rel').value.trim() || 'Guardian',
      edu: document.getElementById('fme_g1edu').value,
      phone: document.getElementById('fme_g1phone').value.trim(),
      smart: true, primary: true
    }];
    const guardians = [{ occ: document.getElementById('fme_g1occ').value }];
    if(document.getElementById('fme_hasG2').checked){
      const g2Name = document.getElementById('fme_g2name').value.trim();
      if(g2Name){
        guardianNames.push({
          name: g2Name,
          rel: document.getElementById('fme_g2rel').value.trim() || 'Guardian',
          edu: document.getElementById('fme_g2edu').value,
          phone: document.getElementById('fme_g2phone').value.trim(),
          smart: true, primary: false
        });
        guardians.push({ occ: document.getElementById('fme_g2occ').value });
      }
    }
    familyRecords[name] = {
      locality: document.getElementById('fme_locality').value.trim(),
      motherTongue: document.getElementById('fme_mothertongue').value,
      langs: checkedValues(LANGUAGES_AT_HOME, 'fme_lang'),
      income: document.getElementById('fme_income').value,
      skills: checkedValues(HOUSEHOLD_SKILLS, 'fme_skill'),
      res: checkedValues(HOME_RESOURCES, 'fme_res'),
      siblings: parseInt(document.getElementById('fme_siblings').value, 10) || 0,
      reads: document.getElementById('fme_reads').checked,
      photoConsent: document.getElementById('fme_photoconsent').checked,
      consent: true,
      guardianNames, guardians,
      importedAt: todayDateKey()
    };
    saveFamilyRecords();
    syncFamilyProfileToServer(name);
    familyManualEditOpen = false;
    renderFamilyParents(name);
  }
