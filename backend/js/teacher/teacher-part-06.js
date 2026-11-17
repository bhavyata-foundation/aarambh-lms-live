/* =========================================================================
   teacher-part-06.js — part 6 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

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
        const weekEntries = weeklyTlmEntries[currentWeekNum];
        const hasData = Array.isArray(weekEntries) && weekEntries.length > 0;
        return { k, v: hasData ? Math.round(weekEntries.filter(m => m.used).length / weekEntries.length * 100) : 0, real: true, hasData };
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

  async function importFamilyProfileFile(){
    const input = document.getElementById('familyProfileImportInput');
    const resultEl = document.getElementById('familyProfileImportResult');
    if(!input.files.length){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';
    let rows;
    try {
      rows = await readAssessmentFileRows(input.files[0]); // shared parser — genuinely generic despite the name, same one weekly/monthly assessment imports use
    } catch(err){
      resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`;
      return;
    }
    if(!rows.length){
      resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>';
      return;
    }
    const header = rows[0].map(h => h.toLowerCase().trim());
    if(header.join(',') !== FAMILY_PROFILE_CSV_HEADER.join(',')){
      resultEl.innerHTML = `<div class="au-error">Header row must be exactly: ${esc(FAMILY_PROFILE_CSV_HEADER.join(','))} — got: ${esc(rows[0].join(','))}</div>`;
      return;
    }

    let imported = 0;
    const skipped = [];
    const warnings = [];
    const updatedNames = [];
    for(let i = 1; i < rows.length; i++){
      const parts = rows[i];
      const rowNum = i + 1;
      if(parts.length !== FAMILY_PROFILE_CSV_HEADER.length){
        skipped.push(`Row ${rowNum}: expected ${FAMILY_PROFILE_CSV_HEADER.length} columns, got ${parts.length}`);
        continue;
      }
      const [
        childName, g1Name, g1Rel, g1Occ, g1Phone, g1Edu,
        g2Name, g2Rel, g2Occ, g2Phone, g2Edu,
        locality, motherTongue, languagesRaw, incomeBand, skillsRaw, resourcesRaw,
        siblingsRaw, readsRaw, photoConsentRaw,
        workshopSkillsRaw, workshopAvailabilityRaw, willingRaw
      ] = parts;

      if(!realPupilsCache.some(p => p.name === childName)){ skipped.push(`Row ${rowNum}: "${childName}" is not a child in this class`); continue; }
      if(!g1Name.trim()){ skipped.push(`Row ${rowNum}: guardian1_name is required`); continue; }

      if(!INCOME_BANDS.includes(incomeBand)){
        warnings.push(`Row ${rowNum} (${childName}): "${incomeBand}" isn't one of the standard income bands — saved as given, but check for a typo.`);
      }

      const guardianNames = [{ name: g1Name, rel: g1Rel || 'Guardian', edu: g1Edu || '', phone: g1Phone || '', smart: true, primary: true }];
      const guardians = [{ occ: g1Occ || '' }];
      if(g2Name && g2Name.trim()){
        guardianNames.push({ name: g2Name, rel: g2Rel || 'Guardian', edu: g2Edu || '', phone: g2Phone || '', smart: true, primary: false });
        guardians.push({ occ: g2Occ || '' });
      }

      const yesNo = (v) => /^y(es)?$/i.test((v || '').trim());
      const noYes = (v) => /^n(o)?$/i.test((v || '').trim());

      // workshop_skills: semicolon-separated labels matched against the
      // fixed SKILL_OPTIONS picklist — unrecognized labels are dropped
      // with a warning rather than silently kept as junk values.
      const workshopSkills = [];
      (workshopSkillsRaw || '').split(';').map(s => s.trim()).filter(Boolean).forEach(label => {
        const match = SKILL_OPTIONS.find(s => s.label.toLowerCase() === label.toLowerCase());
        if(match) workshopSkills.push(match.value);
        else warnings.push(`Row ${rowNum} (${childName}): "${label}" isn't a recognized workshop skill — skipped, check spelling against: ${SKILL_OPTIONS.map(s=>s.label).join(', ')}`);
      });

      // workshop_availability: semicolon-separated day:slot pairs.
      const workshopAvailability = [];
      (workshopAvailabilityRaw || '').split(';').map(s => s.trim()).filter(Boolean).forEach(pair => {
        const [dayPart, slotPart] = pair.split(':').map(s => (s || '').trim());
        const day = DAY_OPTIONS.find(d => d.label.toLowerCase() === (dayPart||'').toLowerCase() || d.value === (dayPart||'').toLowerCase());
        const slot = TIME_SLOTS.find(t => t.label.toLowerCase() === (slotPart||'').toLowerCase() || t.value === (slotPart||'').toLowerCase());
        if(day && slot) workshopAvailability.push({day: day.value, slot: slot.value});
        else warnings.push(`Row ${rowNum} (${childName}): "${pair}" isn't a recognized day:slot pair — skipped`);
      });

      const willingToVolunteer = yesNo(willingRaw) ? true : noYes(willingRaw) ? false : null;

      // Preserve any workshop already scheduled — and any teacher
      // approval already given — for this child before this import
      // overwrites the record. Re-importing the same sheet (e.g. to
      // fix a typo elsewhere) shouldn't silently un-approve someone or
      // wipe a schedule the teacher already set up.
      const existingScheduled = familyRecords[childName] ? familyRecords[childName].scheduledWorkshop : null;
      const existingApproved = familyRecords[childName] ? familyRecords[childName].teacherApproved : false;

      familyRecords[childName] = {
        locality: locality || '', motherTongue: motherTongue || '',
        langs: (languagesRaw || '').split(';').map(s => s.trim()).filter(Boolean),
        income: incomeBand,
        skills: (skillsRaw || '').split(';').map(s => s.trim()).filter(Boolean),
        res: (resourcesRaw || '').split(';').map(s => s.trim()).filter(Boolean),
        siblings: parseInt(siblingsRaw, 10) || 0,
        reads: yesNo(readsRaw),
        photoConsent: yesNo(photoConsentRaw),
        consent: true, // presence of a completed form response IS the consent record — FAM-related consent tracking beyond this is a separate, explicit step, not inferred further here
        guardianNames, guardians,
        workshopSkills, workshopAvailability, willingToVolunteer,
        scheduledWorkshop: existingScheduled,
        teacherApproved: existingApproved,
        importedAt: todayDateKey()
      };
      imported++;
      updatedNames.push(childName);
    }
    saveFamilyRecords();
    updatedNames.forEach(n => syncFamilyProfileToServer(n));

    async function syncFamilyProfileToServer(name){
  const pupil = realPupilsCache && realPupilsCache.find(p => p.name === name);
  const rec = familyRecords[name];
  if(!pupil || !rec) return;
  const guardians = (rec.guardianNames || []).map((g, i) => Object.assign({}, g, { occ: (rec.guardians[i] || {}).occ || '' }));
  try{
    await fetch('backend/pupils/save_family_profile.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        pupil_id: pupil.id,
        locality: rec.locality, mother_tongue: rec.motherTongue,
        languages_at_home: rec.langs, income_band: rec.income,
        household_skills: rec.skills, home_resources: rec.res,
        siblings_in_programme: rec.siblings, adult_reads_programme_language: rec.reads,
        photo_consent: rec.photoConsent, consent: rec.consent, guardians,
        workshop_skills: rec.workshopSkills, workshop_availability: rec.workshopAvailability,
        willing_to_volunteer: rec.willingToVolunteer, scheduled_workshop: rec.scheduledWorkshop,
        teacher_approved: rec.teacherApproved
      })
    });
  } catch(err){ /* offline — local copy stays authoritative until this succeeds later */ }
}

    // Explicit confirmation that this genuinely applied class-wide —
    // every child named in the sheet, not just whichever one happened
    // to be on screen — plus who's still left on sample data, so a
    // teacher can see at a glance whether the whole class is covered.
    const stillOnSample = realPupilsCache.map(p => p.name).filter(n => !familyRecords[n]);
    let html = `<div class="au-success">Imported ${imported} of ${rows.length - 1} rows.${updatedNames.length ? ' Updated: ' + esc(updatedNames.join(', ')) + '.' : ''}</div>`;
    if(stillOnSample.length) html += `<div class="cap" style="margin-top:6px;">Still showing sample data (not in this sheet): ${esc(stillOnSample.join(', '))}.</div>`;
    if(warnings.length) html += `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:12px 14px; margin-top:6px; font-size:13px;">${warnings.map(w => esc(w)).join('<br/>')}</div>`;
    if(skipped.length) html += `<div class="au-error" style="margin-top:6px;">${skipped.length} row(s) skipped:<br/>${skipped.map(s => esc(s)).join('<br/>')}</div>`;
    resultEl.innerHTML = html;
    alert(`Imported ${imported} of ${rows.length - 1} rows from the Family Profile sheet.` + (skipped.length ? ` ${skipped.length} row(s) were skipped — see the details below.` : ''));
    if(typeof renderFamilyParents === 'function' && document.getElementById('familyparents-body') && !document.getElementById('familyparents-body').classList.contains('hidden')){
      renderFamilyParents(selectedFamilyChildName);
    }
  }


  // Matches vTeacherFamily: a child picker, a "Household" card (kv
  // list) and a "Parents and guardians" card, plus consent pills.
  const HOUSEHOLD_SKILLS = ['Tailoring', 'Cooking', 'Driving', 'Masonry', 'Farming'];
  const HOME_RESOURCES = ['Smartphone', 'Radio', 'Television', 'Books at home', 'None of these'];
  function sampleHousehold(name){
    const f = sampleFamily(name);
    const familyStructure = samplePick(name + 'fstruct', ['Two parents', 'Single parent', 'Guardian']);
    return Object.assign(f, {
      locality: samplePick(name + 'loc', ['Ambedkar Nagar', 'Kamgar Vasahat', 'Shanti Nagar', 'Ganesh Nagar']),
      walk: 5 + Math.floor(sampleRand(name + 'walk') * 20),
      skills: [samplePick(name + 'sk1', HOUSEHOLD_SKILLS), samplePick(name + 'sk2', HOUSEHOLD_SKILLS)],
      res: [samplePick(name + 'res1', HOME_RESOURCES)],
      siblings: Math.floor(sampleRand(name + 'sib') * 3),
      familyStructure,
      maritalStatus: familyStructure === 'Two parents' ? 'Married' : samplePick(name + 'marstat', ['Single', 'Married']),
      motherTongue: samplePick(name + 'mt', ['Hindi', 'Marathi', 'Telugu', 'Bhojpuri', 'Gujarati']),
      annualIncome: Math.round((30000 + sampleRand(name + 'annincome') * 150000) / 1000) * 1000,
      guardianNames: [{name: 'Mrs. ' + (name.split(' ')[1] || name), rel: 'Mother', edu: samplePick(name+'edu1', ['No formal education','Primary school','Secondary school']), phone: '98'+String(Math.floor(sampleRand(name+'ph1')*90000000)+10000000), smart: sampleRand(name+'sm1')>0.4, primary: true},
                      {name: 'Mr. ' + (name.split(' ')[1] || name), rel: 'Father', edu: samplePick(name+'edu2', ['No formal education','Primary school','Secondary school']), phone: '98'+String(Math.floor(sampleRand(name+'ph2')*90000000)+10000000), smart: sampleRand(name+'sm2')>0.4, primary: false}]
    });
  }
  // ---------------------------------------------------------------
  // FAMILY & HOME ACTIVITY — parent-teacher meeting record and home
  // activity tracking, per household, plus a class-wide engagement
  // view. Seeded with representative defaults (same seeded-random
  // convention as the rest of this file) so it isn't starting blank,
  // but every field is editable and persists like the rest of this
  // app's real records.
  // ---------------------------------------------------------------
  const HOME_ACTIVITY_POOL = [
    { name: 'Sort the buttons by colour', materials: 'buttons or bottle caps', time: '10 minutes', reading: false },
    { name: 'Name five things in the kitchen', materials: 'none', time: '5 minutes', reading: false },
    { name: 'Count the steps to the door', materials: 'none', time: '5 minutes', reading: false },
    { name: 'Draw your favourite animal', materials: 'paper, crayons', time: '15 minutes', reading: false },
    { name: 'Sing the rhyme learned this week', materials: 'none', time: '5 minutes', reading: false }
  ];
  const DELIVERY_CHANNELS = ['Message', 'Printed sheet', 'Verbal at pickup'];
  const ACTIVITY_STATUSES = ['not asked', 'issued', 'done'];

  const familyEngagementRecords = {}; // name -> {ptm:{attended,meetingLabel,feedback,actionsAgreed}, activity:{...,status,deliveryChannel,language,confirmedBy}}

  (function loadFamilyEngagementRecords(){
    try {
      const raw = localStorage.getItem('familyEngagementRecords');
      if(raw) Object.assign(familyEngagementRecords, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — re-seeded below as needed */ }
  })();

  function saveFamilyEngagementRecords(){
    try { localStorage.setItem('familyEngagementRecords', JSON.stringify(familyEngagementRecords)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }

  function getFamilyEngagement(name){
    if(!familyEngagementRecords[name]){
      const activity = HOME_ACTIVITY_POOL[Math.floor(sampleRand(name + 'actidx') * HOME_ACTIVITY_POOL.length)];
      const attended = sampleRand(name + 'ptmatt') > 0.35;
      familyEngagementRecords[name] = {
        ptm: {
          attended,
          meetingLabel: 'Monthly meeting, month 2',
          feedback: attended ? '' : '',
          actionsAgreed: []
        },
        activity: {
          name: activity.name, materials: activity.materials, time: activity.time, reading: activity.reading,
          status: samplePick(name + 'actstatus', ACTIVITY_STATUSES),
          deliveryChannel: samplePick(name + 'delch', DELIVERY_CHANNELS),
          language: samplePick(name + 'actlang', ['Telugu', 'Hindi', 'Marathi']),
          confirmedBy: ''
        }
      };
    }
    return familyEngagementRecords[name];
  }

  function updateFamilyEngagementField(name, group, field, value){
    const rec = getFamilyEngagement(name);
    rec[group][field] = value;
    saveFamilyEngagementRecords();
  }
  function togglePtmAttendance(name){
    const rec = getFamilyEngagement(name);
    rec.ptm.attended = !rec.ptm.attended;
    saveFamilyEngagementRecords();
    renderFamilyParents(name);
  }
  function cycleActivityStatus(name){
    const rec = getFamilyEngagement(name);
    const idx = ACTIVITY_STATUSES.indexOf(rec.activity.status);
    rec.activity.status = ACTIVITY_STATUSES[(idx + 1) % ACTIVITY_STATUSES.length];
    saveFamilyEngagementRecords();
    renderFamilyParents(name);
  }

  function renderFamilyParents(selectedName){
    const container = document.getElementById('familyparents-body');
    container.innerHTML = '';
    container.appendChild(renderParentsTabBar('familyparents'));
    if(!ensurePupilsLoadedFor(container, () => renderFamilyParents(selectedName))) return;
        if(!ensureFamilyRecordsLoaded(() => renderFamilyParents(selectedName))) return;
    const realStudentNames = realPupilsCache.map(p => p.name);
    if(!realStudentNames.length){
      container.appendChild(mdCard(null, 'No pupils loaded for this class yet.', null));
      return;
    }
    const name = (selectedName && realStudentNames.includes(selectedName)) ? selectedName : realStudentNames[0];
    selectedFamilyChildName = name;
    const { f, isSample } = getFamilyRecordOrSample(name);

    container.appendChild(renderFamilyProfileImportCard());

    const pick = document.createElement('div'); pick.className = 'fbar';
    pick.innerHTML = `<div class="ctl"><label>Child</label><select id="famChildSel" style="padding:6px 10px; border:1px solid #0b0b0b33; border-radius:6px;"></select></div>
      <div class="grow" style="flex:1;"></div>
      <div>${f.consent ? mdPill('Consent recorded', 'good') : mdPill('Consent not recorded', 'crit')}
      ${f.photoConsent ? mdPill('Photo consent', 'good') : mdPill('No photo consent', 'warn')}</div>`;
    container.appendChild(pick);
    const sel = pick.querySelector('#famChildSel');
    realStudentNames.forEach(n => {
      const opt = document.createElement('option'); opt.value = n; opt.textContent = n;
      if(n === name) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.onchange = () => { familyManualEditOpen = false; renderFamilyParents(sel.value); };

    const manualToggleRow = document.createElement('div');
    manualToggleRow.style.cssText = 'margin-bottom:16px;';
    const manualToggleBtn = document.createElement('button');
    manualToggleBtn.textContent = familyManualEditOpen ? 'Cancel manual entry' : (isSample ? '+ Add this family\'s profile manually' : '✎ Edit this profile manually');
    manualToggleBtn.style.cssText = 'padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
    manualToggleBtn.onclick = toggleFamilyManualEdit;
    manualToggleRow.appendChild(manualToggleBtn);
    container.appendChild(manualToggleRow);

    if(familyManualEditOpen){
      container.appendChild(renderFamilyManualEntryCard(name));
      return; // form replaces the read-only view below until saved or cancelled
    }

    const g = document.createElement('div'); g.className = 'g g2';
    const householdBody = document.createElement('dl'); householdBody.className = 'kv';
    // Primary guardian's phone/occupation, pulled up into this card too
    // — the same values shown per-guardian on the right, but visible
    // here as well for a quick-glance summary without needing to read
    // the second card.
    const primaryGuardian = f.guardianNames.find(gd => gd.primary) || f.guardianNames[0];
    const primaryGuardianIdx = f.guardianNames.indexOf(primaryGuardian);
    const primaryOccupation = (f.guardians[primaryGuardianIdx] || {}).occ || '';
    // Real imports don't collect "walk to school" or a computed family-
    // structure/marital-status pair — those rows just don't render for
    // a real record rather than showing a made-up value. Income is
    // ONLY ever the band — no exact-figure row exists here at all,
    // real or sample.
    householdBody.innerHTML = `
      <dt>Locality</dt><dd>${esc(f.locality)}</dd>
      ${f.walk !== undefined ? `<dt>Walk to school</dt><dd>${f.walk} minutes</dd>` : ''}
      ${f.familyStructure !== undefined ? `<dt>Family structure</dt><dd>${esc(f.familyStructure)}${f.familyStructure !== 'Guardian' ? ' · ' + esc(f.maritalStatus) : ''}</dd>` : ''}
      <dt>Mother tongue</dt><dd>${esc(f.motherTongue)}</dd>
      <dt>Phone</dt><dd>${esc(primaryGuardian.phone) || '<span class="cap">Not given</span>'}</dd>
      <dt>Occupation</dt><dd>${esc(primaryOccupation) || '<span class="cap">Not given</span>'}</dd>
      <dt>Income band</dt><dd>${esc(f.income)}</dd>
      <dt>Languages at home</dt><dd>${esc(f.langs.join(', '))}</dd>
      <dt>Adult reads programme language</dt><dd>${f.reads ? 'Yes' : '<b>No</b> — guidance must be audio or pictorial (PTC-05)'}</dd>
      <dt>Household skills</dt><dd>${f.skills.length ? esc(f.skills.join(', ')) : '<span class="cap">None given</span>'}</dd>
      <dt>Home resources</dt><dd>${f.res.length ? esc(f.res.join(', ')) : '<span class="cap">None given</span>'}</dd>
      <dt>Siblings in programme</dt><dd>${f.siblings}</dd>
      ${f.complete !== undefined ? `<dt>Profile completeness</dt><dd>${f.complete}%</dd>` : ''}`;
    g.appendChild(mdCard('Household — ' + name + (isSample ? ' (sample)' : ''), isSample ? 'FAM-01 · no Google Form response imported yet for this child — showing representative sample data.' : 'FAM-01 · imported ' + esc(f.importedAt || '') + ' from the Google Form response.', householdBody));

    const guardianList = document.createElement('div'); guardianList.className = 'list';
    guardianList.innerHTML = f.guardianNames.map((gd, i) => `<div class="row"><div class="t"><b>${esc(gd.name)} · ${esc(gd.rel)}</b><span>${esc(f.guardians[i].occ) || '<span class="cap">Occupation not given</span>'} · ${esc(gd.edu) || '<span class="cap">Education not given</span>'} · ${esc(gd.phone) || '<span class="cap">No phone given</span>'}</span></div>
      <div>${gd.smart ? mdPill('Smartphone', 'good') : mdPill('Basic phone', 'warn')} ${gd.primary ? mdPill('Primary', 'info') : ''}</div></div>`).join('');
    g.appendChild(mdCard('Parents and guardians', 'FAM-02…04 · occupation and education on controlled lists.', guardianList));
    container.appendChild(g);

    // --- Parent-teacher meeting + Home activities this week ---
    const eng = getFamilyEngagement(name);
    const g2 = document.createElement('div'); g2.className = 'g g2'; g2.style.marginTop = '22px';

    const ptmBody = document.createElement('div');
    ptmBody.innerHTML = `
      <div class="row"><div class="t"><b>Attendance</b><span>${esc(eng.ptm.meetingLabel)}</span></div>
        <button onclick="togglePtmAttendance('${esc(name)}')" style="border:none; cursor:pointer;">${eng.ptm.attended ? mdPill('Attended', 'good') : mdPill('Did not attend', 'crit')}</button></div>
      <div class="row" style="align-items:flex-start;"><div class="t" style="flex:1;"><b>Parent feedback</b>
        <textarea onchange="updateFamilyEngagementField('${esc(name)}','ptm','feedback',this.value)" placeholder="The parent's own words, in their language" style="width:100%; margin-top:6px; padding:8px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; min-height:50px; box-sizing:border-box;">${esc(eng.ptm.feedback)}</textarea></div>
        <div>${eng.ptm.feedback ? mdPill('Recorded', 'good') : mdPill('None', 'neu')}</div></div>
      <div class="row" style="align-items:flex-start;"><div class="t" style="flex:1;"><b>Actions agreed</b>
        <input type="text" value="${esc(eng.ptm.actionsAgreed.join(', '))}" onchange="updateFamilyEngagementField('${esc(name)}','ptm','actionsAgreed',this.value.split(',').map(s=>s.trim()).filter(Boolean))" placeholder="Comma-separated, e.g. Read together 10 min a day" style="width:100%; margin-top:6px; padding:8px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;" /></div>
        <div>${eng.ptm.actionsAgreed.length ? mdPill(eng.ptm.actionsAgreed.length, 'info') : mdPill('None', 'neu')}</div></div>`;
    const ptmCard = mdCard('Parent-teacher meeting', 'PTM-02…05 · the parent\'s own words are recorded in their language.', ptmBody);
    g2.appendChild(ptmCard);

    const actStatusColor = { 'not asked': 'neu', 'issued': 'info', 'done': 'good' };
    const actStatusLabel = { 'not asked': 'Not asked', 'issued': 'Issued', 'done': 'Done' };
    const activityBody = document.createElement('div');
    activityBody.innerHTML = `
      <div class="row"><div class="t"><b>${esc(eng.activity.name)}</b><span>Materials: ${esc(eng.activity.materials)} · ${esc(eng.activity.time)} · ${eng.activity.reading ? 'reading needed' : 'no reading needed'}</span></div>
        <button onclick="cycleActivityStatus('${esc(name)}')" style="border:none; cursor:pointer;">${mdPill(actStatusLabel[eng.activity.status], actStatusColor[eng.activity.status])}</button></div>
      <dl class="kv" style="margin-top:10px;">
        <dt>Delivery channel</dt><dd><select onchange="updateFamilyEngagementField('${esc(name)}','activity','deliveryChannel',this.value)" style="padding:4px 8px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${DELIVERY_CHANNELS.map(c => `<option ${eng.activity.deliveryChannel === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></dd>
        <dt>Language</dt><dd><b>${esc(eng.activity.language)}</b></dd>
        <dt>Confirmed by</dt><dd>${eng.activity.confirmedBy ? esc(eng.activity.confirmedBy) : '—'}</dd>
      </dl>
      <p class="cap" style="margin:12px 0 0;">Compliance is reported as where support is needed, never as a family ranking (PTC-09).</p>`;
    const activityCard = mdCard('Home activities this week', 'PTC-02…07 · channel chosen from what this household actually has.', activityBody);
    g2.appendChild(activityCard);
    container.appendChild(g2);

    // --- Class-wide family engagement ---
    const allEngagement = realStudentNames.map(n => ({ name: n, eng: getFamilyEngagement(n) }));
    const activityCompliancePct = Math.round(allEngagement.filter(x => x.eng.activity.status !== 'not asked').length / allEngagement.length * 100);
    const ptmAttendancePct = Math.round(allEngagement.filter(x => x.eng.ptm.attended).length / allEngagement.length * 100);
    const notEngaged = allEngagement.filter(x => !x.eng.ptm.attended && x.eng.activity.status !== 'done');

    container.appendChild(mdSec('Class-wide family engagement', '<span class="reqs">PTC-08/09 · PTM-07</span>'));
    const engGrid = document.createElement('div');
    engGrid.style.cssText = 'display:grid; grid-template-columns:' + (window.innerWidth < 900 ? '1fr' : 'repeat(3,1fr)') + '; gap:16px;';

    const donut = (pct, label, sub, color) => {
      const r = 42, c = 2 * Math.PI * r;
      const offset = c * (1 - pct / 100);
      return `<div class="card" style="padding:22px; text-align:center;">
        <h4 style="margin:0 0 14px; text-align:left;">${esc(label)}</h4>
        <svg viewBox="0 0 100 100" style="width:140px; height:140px;">
          <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--bg)" stroke-width="10"></circle>
          <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 50 50)"></circle>
          <text x="50" y="47" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text)">${pct}%</text>
          <text x="50" y="63" text-anchor="middle" font-size="8" fill="var(--text-muted)">${esc(sub)}</text>
        </svg>
      </div>`;
    };
    const donutWrap = document.createElement('div');
    donutWrap.innerHTML = donut(activityCompliancePct, 'Home activity compliance', 'households', 'var(--primary)') + donut(ptmAttendancePct, 'PTM attendance', 'this month', 'var(--success)');
    Array.from(donutWrap.children).forEach(c => engGrid.appendChild(c));

    const notEngagedCard = document.createElement('div');
    notEngagedCard.className = 'card'; notEngagedCard.style.padding = '22px';
    notEngagedCard.innerHTML = `<h4 style="margin:0 0 4px;">Households not engaged</h4>
      <p class="cap" style="margin:0 0 14px;">PTC-08 · did not attend the PTM and haven't completed a home activity.</p>
      ${notEngaged.length ? notEngaged.map(x => `<div class="row" style="cursor:pointer;" onclick="renderFamilyParents('${esc(x.name)}')">
          <div class="t"><b>${esc(x.name)}</b><span>${sampleHousehold(x.name).reads ? 'reads' : 'no literate adult'} · ${esc(x.eng.activity.deliveryChannel)}</span></div>
          <div>${x.eng.activity.status === 'not asked' ? mdPill('not asked', 'warn') : mdPill('not done', 'crit')}</div>
        </div>`).join('') : '<p class="cap">Every household is engaged on at least one front.</p>'}`;
    engGrid.appendChild(notEngagedCard);
    container.appendChild(engGrid);

    // --- Household Contacts — every household's contact details,
    // pulled up from real data where imported / sampleHousehold as a
    // fallback otherwise. Lives here specifically (not on Parent
    // Volunteers) — that tab is exclusively the willing-to-volunteer
    // filtered list, this tab is everyone.
    renderHouseholdProfilesSection(container);
  }

  // ---------- 6. CHECK ATTENDANCE ----------
  // Matches vTeacherAttCheck: a fuller monthly register than the plain
  // Attendance Register — distinguishes "not yet admitted" (dot) from
  // "no register taken yet" (dash) from actual P/A marks, plus a
  // footer row of daily present-of-roll totals.
  // Two small bar charts, side by side, each capped at 50% width —
  // weekly from THIS page's own data (so it can never disagree with
  // the day-by-day table below it), monthly from the real cross-month
  // attendanceRecords store (the only place multiple real months
  // actually exist — this page only ever shows one month at a time).
  // Shared "two chart cards, side by side, 50% each" building block —
  // used everywhere weekly/monthly attendance trends are shown, so
  // there's one real implementation of the layout, not a copy per
  // screen that can drift out of sync with the others.
  function renderSmallBarChart(data, title, note){
    const w = 320, h = 150, padL = 28, padR = 10, padT = 14, padB = 24;
    const gap = (w - padL - padR) / data.length;
    const barW = gap * 0.55;
    const bars = data.map((d, i) => {
      const x = padL + i * gap + (gap - barW) / 2;
      const val = d.pct === null ? 0 : d.pct;
      const barH = (h - padT - padB) * (val / 100);
      const y = h - padB - barH;
      const color = d.pct === null ? 'var(--border)' : val >= 85 ? 'var(--success)' : val >= 70 ? '#EE8F35' : 'var(--danger,#c8433f)';
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(barH, 1).toFixed(1)}" fill="${color}" rx="3"></rect>
        <text x="${(x + barW/2).toFixed(1)}" y="${(y - 5).toFixed(1)}" font-size="10" text-anchor="middle" fill="var(--text)">${d.pct === null ? '—' : d.pct}</text>
        <text x="${(x + barW/2).toFixed(1)}" y="${h - 6}" font-size="10" text-anchor="middle" fill="var(--text-muted)">${esc(d.label)}</text>`;
    }).join('');
    const card = document.createElement('div');
    card.className = 'card'; card.style.padding = '18px';
    card.innerHTML = `<h4 style="margin:0 0 4px; font-size:13px;">${esc(title)}</h4>
      <p class="cap" style="margin:0 0 10px;">${esc(note)}</p>
      <svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">
        <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="var(--border)"></line>
        ${bars}
      </svg>`;
    return card;
  }

  // Rolls a register's per-day marks (rows[].marks, teachingDays wide)
  // into Monday–Friday teaching weeks. Shared by every screen that
  // shows a weekly breakdown, so it can never disagree with whichever
  // day-by-day grid it was computed from.
  function computeWeeklyAttendanceData(rows, teachingDays){
    const weekSize = 5;
    const weekCount = Math.ceil(teachingDays / weekSize);
    return Array.from({length: weekCount}, (_, wi) => {
      const start = wi * weekSize, end = Math.min(start + weekSize, teachingDays);
      let present = 0, marked = 0;
      rows.forEach(r => {
        for(let i = start; i < end; i++){
          const m = r.marks[i];
          if(m === '·') continue;
          marked++;
          if(m === 'P') present++;
        }
      });
      return { label: 'Wk ' + (wi + 1), pct: marked ? Math.round(present / marked * 100) : null };
    });
  }

  // Real attendanceRecords, one point per academic month so far this
  // year — the only place multiple real months of data actually exist,
  // so every "monthly" chart app-wide pulls from here.
  function computeMonthlyAttendanceData(year){
    const now = new Date();
    const curIdx = ACADEMIC_MONTHS.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS.slice(0, ACADEMIC_MONTHS.indexOf(calendarMonth) + 1);
    return monthsSoFar.map(m => {
      const s = computeAttendanceDashboardStats(year, m);
      return { label: new Date(2000, m, 1).toLocaleDateString([], {month:'short'}), pct: s.hasData ? s.attendancePct : null };
    });
  }

  // The two cards together, at exactly 50% width each on desktop
  // (stacking to one column on narrow screens) — this is the layout
  // itself, reused wherever weekly + monthly attendance trends appear.
  function renderAttendanceTrendCards(container, weekData, monthData){
    container.appendChild(mdSec('Attendance trends', '<span class="reqs">REG-15 · REP-08/09</span>'));
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:' + (window.innerWidth < 700 ? '1fr' : 'repeat(2,1fr)') + '; gap:16px; margin-bottom:22px;';
    grid.appendChild(renderSmallBarChart(weekData, 'Weekly attendance', 'Rolled up Monday–Friday into teaching weeks.'));
    grid.appendChild(renderSmallBarChart(monthData, 'Monthly attendance', 'Real marked days, month by month this academic year.'));
    container.appendChild(grid);
  }

  function renderCheckAttendanceTrends(container, rows, teachingDays){
    renderAttendanceTrendCards(container, computeWeeklyAttendanceData(rows, teachingDays), computeMonthlyAttendanceData(calendarYear));
  }

  function renderCheckAttendance(targetEl){
    const container = targetEl || document.getElementById('checkattendance-body');
    if(!targetEl){ container.innerHTML = ''; renderTeacherFilterBar(container, renderCheckAttendance); }
    const teachingDays = 22;
    const enrolled = SAMPLE_STUDENTS.length;
    const todaysRecords = attendanceRecords[todayKey()] || {}; // same real data as the Register tab's "Today" column
    const rows = SAMPLE_STUDENTS.map((name, i) => {
      const admittedFrom = (i === SAMPLE_STUDENTS.length - 1) ? Math.floor(teachingDays * 0.4) : 0; // last child = a mid-month admission, for realism
      const marks = Array.from({length: teachingDays}, (_, d) => {
        if(d < admittedFrom) return '·';
        return sampleRand(name + 'chk' + d) > 0.1 ? 'P' : 'A';
      });
      const todayStatus = todaysRecords[name];
      marks[teachingDays - 1] = todayStatus === 'present' ? 'P' : todayStatus === 'absent' ? 'A' : '·';
      const markedDays = marks.filter(m => m !== '·').length;
      const pres = marks.filter(m => m === 'P').length;
      return { name, marks, pres, markedDays, pct: markedDays ? Math.round(pres / markedDays * 100) : null };
    });
    const ada = Math.round(rows.reduce((a, r) => a + r.pres, 0) / teachingDays * 10) / 10;
    const overallPct = Math.round(rows.reduce((a, r) => a + (r.pct || 0), 0) / rows.length);
    const below70 = rows.filter(r => r.pct !== null && r.pct < 70).length;

    container.appendChild(mdSec('Check Attendance — this month', '<span class="reqs">REG-15 · CAL-13</span>'));
    container.appendChild(mdGrid('g4', [
      mdTile('On roll', enrolled, 'end of month', mdPill('+1 this month', 'info'), 'ADB-12'),
      mdTile('Average daily attendance', ada, 'children', mdPill('the effective strength', 'good'), 'ADB-14', mdMeter(ada / enrolled * 100)),
      mdTile('Attendance', overallPct, '% present', mdPill(mdStatusBand(overallPct).l, mdStatusBand(overallPct).c), 'REG-05', mdMeter(overallPct)),
      mdTile('Below 70%', below70, 'children', mdPill('follow-up list', 'warn'), 'REG-06')
    ]));

    renderCheckAttendanceTrends(container, rows, teachingDays);

    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th>' +
      Array.from({length: teachingDays}, (_, i) => `<th>${i === teachingDays - 1 ? 'Today' : i+1}</th>`).join('') + '<th>%</th></tr></thead><tbody>';
    rows.forEach(r => {
      const cells = r.marks.map((m, i) => {
        if(m === '·') return `<td style="text-align:center;" title="${i === teachingDays - 1 ? 'not marked yet today' : 'not yet admitted'}"><span class="dim">·</span></td>`;
        return `<td style="text-align:center;">${m === 'P' ? '<span class="pill good">P</span>' : '<span class="pill crit">A</span>'}</td>`;
      }).join('');
      table += `<tr><td style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(r.name)}')"><b>${esc(r.name)}</b></td>${cells}<td><b>${r.pct === null ? '—' : r.pct + '%'}</b></td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'A dot is a day before that child was admitted, or today if it hasn\'t been marked yet — neither is an absence, and both are excluded from her denominator (ADB-13). The "Today" column is real — it\'s exactly what\'s been marked in Enter › Attendance. Tap a child\'s name for her full record.', wrap));
  }

  // ---------- 7. ADMISSIONS ----------
  // Matches vTeacherAdmissions: on-roll/June-start/mid-year/no-baseline
  // tiles, an explanatory note, and the every-admission table — now
  // backed by a real admissionRecords store instead of a fixed
  // juneStart/midYear split, so a teacher can actually add a child
  // through the form below and see her appear everywhere for real.
  function sampleAdmissionExtra(name){
    return {
      dob: samplePick(name + 'dob', ['2022-04-12', '2021-09-03', '2022-01-27', '2021-06-18', '2022-11-09']),
      gender: samplePick(name + 'gender', ['Female', 'Male']),
      address: samplePick(name + 'addr', ['Ambedkar Nagar, Sion', 'Kamgar Vasahat, Sion', 'Shanti Nagar, Wadala', 'Ganesh Nagar, Wadala']),
      speciallyAbled: sampleRand(name + 'sabled') > 0.92,
      previouslyStudied: sampleRand(name + 'prev') > 0.6 ? samplePick(name + 'prevwhere', ['Anganwadi', 'Private preschool']) : 'None'
    };
  }

  // name -> {address, dob, gender, speciallyAbled, prevStudied,
  //   prevSchool, prevStandard, prevBoard, prevReason, admittedDate,
  //   startOfYear, baseline}
  const admissionRecords = {};

  (function loadAdmissionRecords(){
    try {
      const raw = localStorage.getItem('admissionRecords');
      if(raw) Object.assign(admissionRecords, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — re-seeded below */ }
  })();
