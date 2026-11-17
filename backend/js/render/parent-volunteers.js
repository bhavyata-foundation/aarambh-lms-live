/* =========================================================================
   js/render/parent-volunteers.js — Parent Volunteers / Committee screen
   (approving willing households, scheduling their workshops) and Parent
   Involvement's engagement summary. Extracted from teacher.js's old
   SECTION 8.

   Same cross-file-sharing rule as every other split file.
   ========================================================================= */

  /* ===================== SECTION 8: PARENT VOLUNTEERS / COMMITTEE ===================== */

  let expandedCommitteeDetailName = null; // which child's family record skill/availability/willingness editor is open, one at a time

  function toggleCommitteeDetailEditor(childName){
    expandedCommitteeDetailName = (expandedCommitteeDetailName === childName) ? null : childName;
    renderParentVolunteers();
  }

  function saveCommitteeDetailFromForm(childName){
    const f = familyRecords[childName];
    if(!f) return;
    f.workshopSkills = Array.from(document.querySelectorAll(`.cd-skill-${cssSafe(childName)}:checked`)).map(el => el.value);
    f.workshopAvailability = Array.from(document.querySelectorAll(`.cd-avail-${cssSafe(childName)}:checked`)).map(el => JSON.parse(el.value));
    const willingRadio = document.querySelector(`input[name="cd-willing-${cssSafe(childName)}"]:checked`);
    f.willingToVolunteer = willingRadio ? willingRadio.value === 'yes' : null;
    saveFamilyRecords();
    expandedCommitteeDetailName = null;
    renderParentVolunteers();
  }

  // Turns an arbitrary id/name (may contain spaces or characters CSS
  // class names can't use) into something safe to use in a
  // querySelector class name.
  function cssSafe(id){ return String(id).replace(/[^a-zA-Z0-9_-]/g, '_'); }

  function renderCommitteeDetailEditor(childName, f){
    const skillsHtml = SKILL_OPTIONS.map(s => `
      <label style="display:inline-flex; align-items:center; gap:4px; margin:0 12px 6px 0; font-size:12.5px;">
        <input type="checkbox" class="cd-skill-${cssSafe(childName)}" value="${s.value}" ${(f.workshopSkills||[]).includes(s.value) ? 'checked' : ''} /> ${esc(s.label)}
      </label>`).join('');

    const availHtml = `<div class="report-table-wrap"><table class="report-table" style="font-size:12px;"><thead><tr><th></th>${TIME_SLOTS.map(t => `<th style="text-align:center;">${esc(t.label)}</th>`).join('')}</tr></thead><tbody>
      ${DAY_OPTIONS.map(d => `<tr><td>${esc(d.label)}</td>${TIME_SLOTS.map(t => {
        const val = JSON.stringify({day: d.value, slot: t.value});
        const isChecked = (f.workshopAvailability||[]).some(a => a.day === d.value && a.slot === t.value);
        return `<td style="text-align:center;"><input type="checkbox" class="cd-avail-${cssSafe(childName)}" value='${esc(val)}' ${isChecked ? 'checked' : ''} /></td>`;
      }).join('')}</tr>`).join('')}
    </tbody></table></div>`;

    return `<div class="card" style="padding:16px; margin-top:8px; background:var(--bg);">
      <p style="margin:0 0 8px; font-weight:600; font-size:13px;">Skilled in</p>
      <div style="margin-bottom:14px;">${skillsHtml}</div>
      <p style="margin:0 0 8px; font-weight:600; font-size:13px;">Available for workshops</p>
      <div style="margin-bottom:14px;">${availHtml}</div>
      <p style="margin:0 0 8px; font-weight:600; font-size:13px;">Willing to volunteer?</p>
      <div style="margin-bottom:14px; display:flex; gap:16px;">
        <label style="font-size:12.5px;"><input type="radio" name="cd-willing-${cssSafe(childName)}" value="yes" ${f.willingToVolunteer === true ? 'checked' : ''} /> Yes</label>
        <label style="font-size:12.5px;"><input type="radio" name="cd-willing-${cssSafe(childName)}" value="no" ${f.willingToVolunteer === false ? 'checked' : ''} /> No</label>
      </div>
      <button class="btn-primary" style="width:auto; padding:7px 14px; font-size:12.5px;" onclick="saveCommitteeDetailFromForm('${esc(childName)}')">Save</button>
    </div>`;
  }

  // --- Scheduling a workshop time: teacher picks the actual day+slot a
  // volunteer will run their workshop, restricted to only the slots
  // that parent already marked as available — this can't clash with
  // what the parent said she can do, though it can still clash with
  // the class's own routine, since no real class timetable data
  // exists in this app yet to check that automatically.
  // Explicit teacher approval, separate from willing_to_volunteer —
  // willingness is what the PARENT said on the Family Profile form;
  // approval is the TEACHER'S own decision to actually let that parent
  // into the group before any workshop gets scheduled. A household
  // stays visible here as soon as they're willing, so the teacher can
  // see who's asked, but scheduling is gated on her approving them
  // first — saying yes on the form doesn't auto-admit anyone.
  function approveVolunteer(childName){
    const f = familyRecords[childName];
    if(f){ f.teacherApproved = true; saveFamilyRecords(); }
    renderParentVolunteers();
  }
  function unapproveVolunteer(childName){
    const f = familyRecords[childName];
    if(f){ f.teacherApproved = false; f.scheduledWorkshop = null; saveFamilyRecords(); } // un-approving also clears any workshop already scheduled under that approval
    renderParentVolunteers();
  }

  function scheduleWorkshopFromForm(childName){
    const select = document.getElementById('scheduleSelect-' + cssSafe(childName));
    if(!select || !select.value) return;
    const { day, slot } = JSON.parse(select.value);
    const f = familyRecords[childName];
    if(f){
      f.scheduledWorkshop = { day, slot };
      saveFamilyRecords();
    }
    renderParentVolunteers();
  }

  function clearScheduledWorkshop(childName){
    const f = familyRecords[childName];
    if(f) f.scheduledWorkshop = null;
    saveFamilyRecords();
    renderParentVolunteers();
  }

  function renderParentVolunteers(){
    const container = document.getElementById('volunteers-body');
    container.innerHTML = '';
    container.appendChild(renderParentsTabBar('volunteers'));

    // Real class roster from here down — same realPupilsCache/
    // ensurePupilsLoadedFor Assessment already uses, replacing the old
    // hardcoded SAMPLE_STUDENTS fake list this whole section used to
    // run on (which is what produced things like "Mrs. undefined" for
    // a name that was never really in the class).
    if(!ensurePupilsLoadedFor(container, () => renderParentVolunteers())) return;

    // Parent Volunteers is now a filtered view of familyRecords (the
    // real Family Profile import from the Family & Parents tab) —
    // parents with willing_to_volunteer = yes show up here, with
    // whatever workshop_skills/workshop_availability came in on that
    // same sheet. Replaces the old separate parent-committee.js
    // applicant queue and suitability score entirely.
    const realStudentNames = realPupilsCache.map(p => p.name);
    const willingRecords = realStudentNames
      .map(name => ({ name, f: familyRecords[name] }))
      .filter(x => x.f && x.f.willingToVolunteer === true);

    container.appendChild(mdSec('Parent Volunteers', '<span class="reqs">filtered from the Family Profile import</span>'));
    const intro = document.createElement('p');
    intro.className = 'cap'; intro.style.margin = '4px 0 16px';
    intro.innerHTML = 'Parents willing to run a workshop, pulled from the Family Profile sheet imported in the Family &amp; Parents tab. Import that sheet with <code>willing_to_volunteer = yes</code> (and workshop_skills / workshop_availability filled in) to add someone here — or edit a record directly below.';
    container.appendChild(intro);

    if(!willingRecords.length){
      container.appendChild(mdCard(null, 'No willing parents yet. Import the Family Profile sheet in Family & Parents with willing_to_volunteer = yes for at least one household, or edit an existing household\'s record there.', null));
    } else {
      willingRecords.forEach(({name, f}) => {
        const guardianName = (f.guardianNames[0] || {}).name || '';
        const skillLabels = (f.workshopSkills||[]).length ? esc((f.workshopSkills||[]).map(s => SKILL_OPTIONS.find(o=>o.value===s)?.label || s).join(', ')) : 'none recorded';
        const isApproved = f.teacherApproved === true;
        const wrap = document.createElement('div');
        wrap.className = 'material-row'; wrap.style.cssText = 'flex-direction:column; align-items:stretch; margin-bottom:10px;';
        wrap.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
            <div>
              <strong>${esc(guardianName)}</strong> — ${esc(name)}
              ${isApproved ? mdPill('Approved', 'good') : mdPill('Awaiting your approval', 'warn')}
              <div class="sub" style="margin-top:2px;">Skills: ${skillLabels}</div>
              ${f.scheduledWorkshop ? `<div class="sub" style="margin-top:2px; color:var(--success); font-weight:600;">✓ Workshop scheduled: ${esc(DAY_OPTIONS.find(d=>d.value===f.scheduledWorkshop.day)?.label || f.scheduledWorkshop.day)} · ${esc(TIME_SLOTS.find(t=>t.value===f.scheduledWorkshop.slot)?.label || f.scheduledWorkshop.slot)} <button style="margin-left:6px; padding:2px 8px; border-radius:6px; border:1px solid var(--border); background:#fff; font-size:11px; cursor:pointer;" onclick="clearScheduledWorkshop('${esc(name)}')">Clear</button></div>` : ''}
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              ${isApproved
                ? `<button style="padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12.5px; cursor:pointer;" onclick="unapproveVolunteer('${esc(name)}')">Remove from group</button>`
                : `<button class="btn-primary" style="padding:6px 12px; font-size:12.5px; width:auto;" onclick="approveVolunteer('${esc(name)}')">✓ Approve for the group</button>`}
              <button style="padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12.5px; cursor:pointer;" onclick="toggleCommitteeDetailEditor('${esc(name)}')">${expandedCommitteeDetailName === name ? 'Close' : 'Edit skills / availability'}</button>
            </div>
          </div>
          ${isApproved && (f.workshopAvailability||[]).length && !f.scheduledWorkshop ? `
          <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
            <select id="scheduleSelect-${cssSafe(name)}" style="flex:1; max-width:320px; padding:6px 10px; border:1px solid var(--border); border-radius:8px; font-size:12.5px;">
              ${f.workshopAvailability.map(av => `<option value='${esc(JSON.stringify(av))}'>${esc(DAY_OPTIONS.find(d=>d.value===av.day)?.label || av.day)} · ${esc(TIME_SLOTS.find(t=>t.value===av.slot)?.label || av.slot)}</option>`).join('')}
            </select>
            <button class="btn-primary" style="width:auto; padding:6px 14px; font-size:12.5px;" onclick="scheduleWorkshopFromForm('${esc(name)}')">Schedule workshop</button>
          </div>
          <p class="cap" style="margin:4px 0 0;">Pick from her own stated availability. Check it doesn't clash with your class routine — no timetable data exists yet to catch that automatically.</p>` : ''}
          ${!isApproved ? `<p class="cap" style="margin:8px 0 0;">She said yes to volunteering on the Family Profile form — approve her above before a workshop can be scheduled.</p>` : ''}
          ${expandedCommitteeDetailName === name ? renderCommitteeDetailEditor(name, f) : ''}
        `;
        container.appendChild(wrap);
      });
    }
  }

  function renderHouseholdProfilesSection(container){
    try {
    const realStudentNames = realPupilsCache.map(p => p.name);
    if(!selectedHouseholdName || !realStudentNames.includes(selectedHouseholdName)) selectedHouseholdName = realStudentNames[0];

    const allProfiles = realStudentNames.map(n => {
      const { f, isSample } = getFamilyRecordOrSample(n);
      return { name: n, profile: f, isSample };
    });
    const missingPhoneCount = allProfiles.filter(x => !((x.profile.guardianNames[0] || {}).phone || '').trim()).length;
    const profileCompleteMean = allProfiles.length ? Math.round(allProfiles.reduce((sum, x) => sum + (x.profile.complete !== undefined ? x.profile.complete : (x.isSample ? 0 : 100)), 0) / allProfiles.length) : 0;

    container.appendChild(mdSec('Household Contacts', '<span class="reqs">FAM-01…12</span>'));
    container.appendChild(mdGrid('g3', [
      mdTile('Households', realStudentNames.length, 'in my class', mdPill(myClassInfo.class_name, 'neu'), 'FAM-01'),
      mdTile('Missing phone', missingPhoneCount, 'household' + (missingPhoneCount === 1 ? '' : 's'), missingPhoneCount ? mdPill('Fix this first', 'warn') : mdPill('All have a number', 'good'), 'FAM-05'),
      mdTile('Profile complete', profileCompleteMean, '% mean', mdPill(mdStatusBand(profileCompleteMean, 80, 60).l, mdStatusBand(profileCompleteMean, 80, 60).c), 'FAM-12', mdMeter(profileCompleteMean))
    ]));
    const contactNote = document.createElement('p');
    contactNote.className = 'cap'; contactNote.style.margin = '4px 0 16px';
    contactNote.innerHTML = 'Every household\'s contact details. Willingness to volunteer, skills, and workshop availability live in the <b>Parent Volunteers</b> tab instead — this section is everyone, that one is just the willing subset.';
    container.appendChild(contactNote);

    if(!realStudentNames.length){
      container.appendChild(mdCard(null, 'No pupils loaded for this class yet.', null));
      return;
    }

    // --- Household picker ---
    const pickerBar = document.createElement('div');
    pickerBar.className = 'fbar';
    pickerBar.style.marginBottom = '22px';
    pickerBar.innerHTML = `<div class="ctl"><label>Household</label><select id="hhPickerSelect" style="${SELECT_STYLE} min-width:260px !important;"></select></div>
      <div class="grow" style="flex:1;"></div>
      <div class="cap">${esc(sampleHousehold(selectedHouseholdName).motherTongue)} · ${sampleHousehold(selectedHouseholdName).reads ? 'reads the programme language' : 'does not read the programme language'}</div>`;
    container.appendChild(pickerBar);
    const hhSel = pickerBar.querySelector('#hhPickerSelect');
    realStudentNames.forEach(n => {
      const { f } = getFamilyRecordOrSample(n);
      const guardianAttendingName = (f.guardianAttending || '').split(' — ')[1] || (f.guardianNames[0] || {}).name || '';
      const opt = document.createElement('option'); opt.value = n; opt.textContent = n + ' — ' + guardianAttendingName;
      if(n === selectedHouseholdName) opt.selected = true;
      hhSel.appendChild(opt);
    });
    hhSel.onchange = () => switchParentVolunteersHousehold(hhSel.value);

    const { f: p, isSample } = getFamilyRecordOrSample(selectedHouseholdName);
    const guardianAttendingValue = p.guardianAttending || ((p.guardianNames[0] || {}).rel + ' — ' + (p.guardianNames[0] || {}).name);
    const occupation = (p.guardians[0] || {}).occ || '';
    const phone = (p.guardianNames[0] || {}).phone || '';
    const skillText = (p.skills || []).join(', ');
    const availableDays = p.generalAvailableDays || [];
    const freeTimings = p.generalFreeTimings || '';

    container.appendChild(mdSec('Household — ' + selectedHouseholdName, '<span class="reqs">FAM-02…12</span>'));
    const whoCard = document.createElement('div');
    whoCard.className = 'card'; whoCard.style.padding = '22px'; whoCard.style.marginBottom = '22px';
    const fld = 'width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;';
    const lbl = 'font-size:10.5px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; display:block;';
    const phoneMissing = !phone.trim();
    whoCard.innerHTML = `
      <h4 style="margin:0 0 4px;">Who in this household, and how to reach them</h4>
      <p class="cap" style="margin:0 0 18px;">${isSample ? 'Placeholder data — no Family Profile sheet row imported for this household yet. Editing any field below saves it as a real record.' : 'Real data from the Family Profile import. Willingness/skills/workshop availability are recorded in Parent Volunteers, not here.'}</p>
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:20px 28px;">
        <div><label style="${lbl}">Guardian attending</label><select onchange="updateFamilyContactField('${esc(selectedHouseholdName)}','guardianAttending',this.value)" style="${fld}">
          ${p.guardianNames.map(g => `<option value="${esc(g.rel + ' — ' + g.name)}" ${guardianAttendingValue === g.rel + ' — ' + g.name ? 'selected' : ''}>${esc(g.rel)} — ${esc(g.name)}</option>`).join('')}
        </select></div>
        <div><label style="${lbl}">Occupation</label><input type="text" value="${esc(occupation)}" onchange="updateFamilyContactField('${esc(selectedHouseholdName)}','occupation',this.value)" style="${fld}" /></div>
        <div>
          <label style="${lbl}">Phone <span style="color:var(--danger,#c8433f);">*</span></label>
          <input type="text" value="${esc(phone)}" placeholder="Required — 10-digit mobile number" onchange="updateFamilyContactField('${esc(selectedHouseholdName)}','phone',this.value)" style="${fld}${phoneMissing ? ' border-color:var(--danger,#c8433f);' : ''}" />
          ${phoneMissing ? `<p class="cap" style="margin:4px 0 0; color:var(--danger,#c8433f);">No way to reach this household without a phone number.</p>` : ''}
        </div>
        <div><label style="${lbl}">General skill note</label><input type="text" placeholder="e.g. Tailoring, storytelling, cricket coaching" value="${esc(skillText)}" onchange="updateFamilyContactField('${esc(selectedHouseholdName)}','skill',this.value)" style="${fld}" /></div>
        <div style="grid-column: span 2;">
          <label style="${lbl}">Days generally available</label>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${DAYS_OF_WEEK.map(d => `<button type="button" onclick="toggleFamilyContactAvailableDay('${esc(selectedHouseholdName)}','${d}')" style="padding:6px 14px; border-radius:20px; border:1px solid ${availableDays.includes(d) ? 'transparent' : 'var(--border)'}; background:${availableDays.includes(d) ? 'var(--primary)' : '#fff'}; color:${availableDays.includes(d) ? '#fff' : 'var(--text)'}; font-size:12.5px; font-weight:600; cursor:pointer;">${d}</button>`).join('')}
          </div>
        </div>
        <div><label style="${lbl}">Free timings</label><input type="text" placeholder="e.g. 10:00 AM – 1:00 PM" value="${esc(freeTimings)}" onchange="updateFamilyContactField('${esc(selectedHouseholdName)}','freeTimings',this.value)" style="${fld}" /></div>
      </div>`;
    container.appendChild(whoCard);

    // --- The whole class ---
    container.appendChild(mdSec('The whole class', '<span class="reqs">FAM-01</span>'));
    const wcNote = document.createElement('p');
    wcNote.className = 'cap'; wcNote.style.margin = '4px 0 16px';
    wcNote.textContent = 'Contact details, household by household — ordered by missing phone first, since that\'s the gap worth closing before anything else.';
    container.appendChild(wcNote);

    const sortedProfiles = allProfiles.slice().sort((a, b) => {
      const aMissing = !((a.profile.guardianNames[0] || {}).phone || '').trim() ? 0 : 1;
      const bMissing = !((b.profile.guardianNames[0] || {}).phone || '').trim() ? 0 : 1;
      return aMissing - bMissing;
    });
    let wcTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th><th>Guardian</th><th>Available</th><th>Phone</th></tr></thead><tbody>';
    sortedProfiles.forEach(x => {
      const guardianAttending = x.profile.guardianAttending || ((x.profile.guardianNames[0] || {}).rel + ' — ' + (x.profile.guardianNames[0] || {}).name);
      const guardianName = guardianAttending.split(' — ')[1] || guardianAttending;
      // Available-hours detail is only meaningful for households that
      // actually said yes to volunteering — that's the whole reason it
      // was collected (scheduling workshops in Parent Volunteers). For
      // everyone else this column would just be leaking a field that
      // isn't relevant to them here, so it shows their committee status
      // instead — still real, general info, not a blank/invented value.
      const isWilling = x.profile.willingToVolunteer === true;
      const days = x.profile.generalAvailableDays || [];
      const timings = x.profile.generalFreeTimings || '';
      const availSummary = days.join(', ') + (timings ? ' · ' + timings : '');
      const availCell = isWilling
        ? (availSummary ? esc(availSummary) : '<span class="cap">Not specified</span>')
        : (x.profile.willingToVolunteer === false ? '<span class="cap">Not volunteering</span>' : '<span class="cap">No answer yet</span>');
      const phoneVal = (x.profile.guardianNames[0] || {}).phone || '';
      const hasPhone = !!phoneVal.trim();
      wcTable += `<tr style="cursor:pointer;" onclick="switchParentVolunteersHousehold('${esc(x.name)}')">
        <td><b>${esc(x.name)}</b></td>
        <td>${esc(guardianName)}</td>
        <td>${availCell}</td>
        <td>${hasPhone ? esc(phoneVal) : mdPill('Missing', 'crit')}</td>
      </tr>`;
    });
    wcTable += '</tbody></table></div>';
    const wcWrap = document.createElement('div'); wcWrap.innerHTML = wcTable;
    container.appendChild(mdCard(null, 'Tap a row to open that household above.', wcWrap));
    } catch(err){
      const errorBox = document.createElement('div');
      errorBox.className = 'card';
      errorBox.style.cssText = 'border-color:#c8433f; background:#fdeaea;';
      errorBox.innerHTML = `<div class="hd"><div><h3 style="color:#c8433f;">Household Contacts hit an error</h3><p class="cap">${esc(err.message)}</p></div></div>`;
      container.appendChild(errorBox);
    }
  }

  /* =========================================================
     PARENT INVOLVEMENT — connected to the real Family Profile import
     (familyRecords, the same store the Family & Parents tab writes to)
     rather than the old separate applicant/score system, which is
     retired. "On committee" now means willingToVolunteer === true on
     that same real record — one source of truth, not two.
     ========================================================= */
  function renderParentInvolvement(){
    const container = document.getElementById('parentinvolvement-body');
    container.innerHTML = '';
    if(!ensurePupilsLoadedFor(container, () => renderParentInvolvement())) return;

    try{
    const realStudentNames = realPupilsCache.map(p => p.name);
    if(!realStudentNames.length){
      container.appendChild(mdCard(null, 'No pupils loaded for this class yet.', null));
      return;
    }

    // Every real household in this class, each with a genuine
    // volunteer status and a genuine talent (skills) pulled from
    // Family & Parents — not a separate invented dataset.
    const households = realStudentNames.map(name => {
      const h = sampleHousehold(name);
      const rec = familyRecords[name];
      const committeeStatus = rec ? (rec.willingToVolunteer === true ? 'volunteering' : rec.willingToVolunteer === false ? 'not willing' : 'no answer yet') : 'no profile yet';
      const homeStatus = sampleHomeActStatus(name);
      return { name, household: h, record: rec, committeeStatus, homeStatus };
    });
    const onCommitteeHouseholds = households.filter(h => h.committeeStatus === 'volunteering');
    const notOnCommitteeHouseholds = households.filter(h => h.committeeStatus !== 'volunteering');
    const noProfileHouseholds = households.filter(h => h.committeeStatus === 'no profile yet');

    const engagedPct = Math.round(households.filter(h => h.homeStatus === 'done' || h.homeStatus === 'partly done').length / households.length * 100);

    container.appendChild(mdSec('Parent Involvement', '<span class="reqs">PCI-05…09 · REP-12</span>'));
    container.appendChild(mdGrid('g4', [
      mdTile('Households volunteering', onCommitteeHouseholds.length, 'of ' + households.length,
        mdPill(onCommitteeHouseholds.length > 0 ? 'On track' : 'None yet', onCommitteeHouseholds.length > 0 ? 'good' : 'warn'), 'PCM-08', mdMeter(onCommitteeHouseholds.length / households.length * 100)),
      mdTile('No profile imported yet', noProfileHouseholds.length, 'households',
        noProfileHouseholds.length ? mdPill('Import Family Profile sheet', 'warn') : mdPill('All households on file', 'good'), 'FAM-01'),
      mdTile('Home activity engaged', engagedPct, '% of households',
        mdPill(mdStatusBand(engagedPct, 80, 60).l, mdStatusBand(engagedPct, 80, 60).c), 'PTC-06', mdMeter(engagedPct)),
      mdTile('Real households on file', households.length, 'this class',
        mdPill('from Family & Parents', 'info'), 'FAM-01')
    ]));

    container.appendChild(mdSec('Volunteers and their skills', '<span class="reqs">PCM-08 · from the Family Profile import</span>'));
    const talentList = document.createElement('div'); talentList.className = 'list';
    talentList.innerHTML = onCommitteeHouseholds.length
      ? onCommitteeHouseholds.map(h => `<div class="row"><div class="t"><b>${esc(h.name.split(' ')[0])}'s guardian</b><span>${esc((h.record.workshopSkills||[]).map(s => SKILL_OPTIONS.find(o=>o.value===s)?.label || s).join(', ') || 'no skills recorded')}</span></div><div>${mdPill('Volunteering', 'good')}</div></div>`).join('')
      : '<p class="sub">No willing households yet — see Parent Volunteers, or import the Family Profile sheet with willing_to_volunteer = yes.</p>';
    container.appendChild(mdCard(null, 'Skills are workshop_skills from the Family Profile sheet, not household skills (a different, more general field).', talentList));

    container.appendChild(mdSec('Involvement against progress', '<span class="reqs">PCI-08 · REP-12</span>'));
    const dsiFor = (name) => {
      const tiers = ASSESSMENT_DOMAINS.map(d => (monthlyAssessmentEntries[name] && monthlyAssessmentEntries[name][d.key]) || sampleTier(name+d.key+'tier'));
      return Math.round((tiers.filter(t=>t==='A').length*3 + tiers.filter(t=>t==='P').length*2 + tiers.filter(t=>t==='E').length*1) / (3*ASSESSMENT_DOMAINS.length) * 200 * 10) / 10;
    };
    const meanDsi = (list) => list.length ? Math.round(list.reduce((sum, h) => sum + dsiFor(h.name), 0) / list.length * 10) / 10 : 0;
    const onCommitteeDsi = meanDsi(onCommitteeHouseholds);
    const notOnCommitteeDsi = meanDsi(notOnCommitteeHouseholds);

    const involvementCard = document.createElement('div'); involvementCard.className = 'card';
    involvementCard.innerHTML = `
      <div class="hd"><div><h3>Do children whose families are involved do better?</h3>
        <p class="cap">PCI-08 · the honest answer is "a little, and confounded". Families with time to sit on a committee are families with time to sit with a child, and this comparison cannot separate the two. It is shown because it will be asked for, with the caveat attached rather than in a footnote.</p></div></div>
    `;
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Group</th><th>Children</th><th>Mean DSI</th></tr></thead><tbody>';
    table += `<tr><td><b>Household on a committee</b></td><td>${onCommitteeHouseholds.length}</td><td>${onCommitteeHouseholds.length ? onCommitteeDsi : '—'} ${onCommitteeHouseholds.length ? mdPill(mdStatusBand(onCommitteeDsi/2, 70, 55).l, mdStatusBand(onCommitteeDsi/2, 70, 55).c) : ''}</td></tr>`;
    table += `<tr><td><b>Household not on a committee</b></td><td>${notOnCommitteeHouseholds.length}</td><td>${notOnCommitteeHouseholds.length ? notOnCommitteeDsi : '—'} ${notOnCommitteeHouseholds.length ? mdPill(mdStatusBand(notOnCommitteeDsi/2, 70, 55).l, mdStatusBand(notOnCommitteeDsi/2, 70, 55).c) : ''}</td></tr>`;
    table += '</tbody></table></div>';
    const tableWrap = document.createElement('div'); tableWrap.innerHTML = table;
    involvementCard.appendChild(tableWrap);
    container.appendChild(involvementCard);
    } catch(err){
      const errorBox = document.createElement('div');
      errorBox.className = 'card';
      errorBox.style.cssText = 'border-color:#c8433f; background:#fdeaea;';
      errorBox.innerHTML = `<div class="hd"><div><h3 style="color:#c8433f;">This screen hit an error</h3><p class="cap">${esc(err.message)}</p></div></div>`;
      container.appendChild(errorBox);
    }
  }

  /* =========================================================
     MY DAY — rebuilt against the extracted prototype design system
     (tile/pill/meter/sec/card classes, now merged into style.css).
     Uses the REAL DOMAINS array above (real times, real CG codes,
     real week/theme data) — only the delivery-tracking numbers
     (sessions confirmed, week compliance, attendance) are realistic
     PLACEHOLDER values for now, per the agreed "frontend first,
     database after" plan. Nothing here reads from a real backend yet.

     ADAPTED FROM THE ORIGINAL PROTOTYPE: the original used hover-only
     tooltips for session detail, which don't work on phones/tablets.
     Replaced with tap-to-expand panels instead.
     ========================================================= */