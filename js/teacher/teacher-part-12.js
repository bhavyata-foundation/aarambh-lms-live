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
  // No invented households — an empty record; screens say "No data available".
  function sampleHousehold(name){
    return Object.assign(sampleFamily(name), { locality: '', walk: null, skills: [], res: [], siblings: null, familyStructure: '', maritalStatus: '', motherTongue: '', annualIncome: null, guardianNames: [] });
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
  // PTM attendance and home activity start EMPTY (nothing invented) —
  // they fill in only when a teacher records them.
  function getFamilyEngagement(name){
    if(!familyEngagementRecords[name]){
      familyEngagementRecords[name] = {
        ptm: { attended: null, meetingLabel: '', feedback: '', actionsAgreed: [] },
        activity: { name: '', materials: '', time: '', reading: false, status: '', deliveryChannel: '', language: '', confirmedBy: '' }
      };
    }
    return familyEngagementRecords[name];
  }
  // Remove entries the old generator invented (every field exactly as it
  // would have made them, untouched since). Anything a teacher changed stays.
  (function removeInventedEngagement(){
    let removed = 0;
    Object.keys(familyEngagementRecords || {}).forEach(name => {
      const r = familyEngagementRecords[name]; if(!r || !r.ptm || !r.activity) return;
      const act = HOME_ACTIVITY_POOL[Math.floor(sampleRand(name + 'actidx') * HOME_ACTIVITY_POOL.length)];
      const untouched = r.ptm.meetingLabel === 'Monthly meeting, month 2' && !r.ptm.feedback && !(r.ptm.actionsAgreed || []).length
        && r.ptm.attended === (sampleRand(name + 'ptmatt') > 0.35)
        && act && r.activity.name === act.name
        && r.activity.status === samplePick(name + 'actstatus', ACTIVITY_STATUSES)
        && r.activity.deliveryChannel === samplePick(name + 'delch', DELIVERY_CHANNELS)
        && r.activity.language === samplePick(name + 'actlang', ['Telugu', 'Hindi', 'Marathi'])
        && !r.activity.confirmedBy;
      if(untouched){ delete familyEngagementRecords[name]; removed++; }
    });
    if(removed){ try { localStorage.setItem('familyEngagementRecords', JSON.stringify(familyEngagementRecords)); } catch(e){} }
  })();
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
    if(isSample){
      container.appendChild(attNote('No data available — ' + name + ' has no family profile yet. Add it with "+ Add this family\u2019s profile manually" above, or import the Family Profile sheet.'));
      return;
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
