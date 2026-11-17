/* =========================================================================
   js/render/myday-planning.js — the per-session daily plan editor:
   session-done toggles, voice input for plan text, plan-vs-given match
   checking, material chips, AI Assistance suggestions, and the
   materials photo/CSV/PDF actions that live alongside daily planning.
   Extracted from teacher.js's old SECTION 9.

   Same cross-file-sharing rule as every other split file.
   ========================================================================= */

  function profileStorageKey(name){
    if(typeof myClassInfo === 'undefined' || !myClassInfo.class_id) return null;
    const school = myClassInfo.school_id != null ? String(myClassInfo.school_id) : 'school-unknown';
    const cls = String(myClassInfo.class_id);
    return name + ':' + school + ':' + cls;
  }

  function saveDailyPlanEntries(){
    const storageKey = profileStorageKey('dailyPlanEntries');
    if(!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(dailyPlanEntries)); }
    catch(e){ /* storage full/unavailable — plan stays in-memory for this session only */ }
  }

    var tlmInsightExpanded = false;
  function toggleTlmInsight(){
    tlmInsightExpanded = !tlmInsightExpanded;
    renderMyDay();
  }
  
  var planInsightsExpanded = false;
  var activeVoiceRecognition = null;
  var activeVoiceDomainKey = null;

  function dailyPlanKey(week, dayKey, domainKey){
    return week + '-' + dayKey + '-' + domainKey;
  }

  // Whether a session actually happened as planned — a genuinely
  // separate fact from whether a plan was WRITTEN for it (dailyPlanEntries
  // above). "Confirm what happened" toggles this, independent of the
  // plan text, matching the reference's distinct "Done" column.
  var sessionDoneEntries = {}; // key (dailyPlanKey) -> true
  function loadSessionDoneEntries(){
    try {
      const storageKey = profileStorageKey('sessionDoneEntries');
      if(!storageKey) return;
      const raw = localStorage.getItem(storageKey);
      if(raw) Object.assign(sessionDoneEntries, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
  }
  function saveSessionDoneEntries(){
    const storageKey = profileStorageKey('sessionDoneEntries');
    if(!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(sessionDoneEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }

  // Real date actually covered — only ever set when the session's
  // originally scheduled day turned out to be a holiday and the
  // content got taught on a different real day instead. Absent
  // (undefined) for the normal case of "covered on its own day."
  var coveredDateEntries = {}; // key (dailyPlanKey) -> 'YYYY-MM-DD'
  function loadCoveredDateEntries(){
    try {
      const storageKey = profileStorageKey('coveredDateEntries');
      if(!storageKey) return;
      const raw = localStorage.getItem(storageKey);
      if(raw) Object.assign(coveredDateEntries, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — start empty */ }
  }
  function saveCoveredDateEntries(){
    const storageKey = profileStorageKey('coveredDateEntries');
    if(!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(coveredDateEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }

  function initializeProfileScopedLocalState(){
    if(!profileStorageKey('profile')) return;
    Object.keys(dailyPlanEntries).forEach(k => delete dailyPlanEntries[k]);
    Object.keys(sessionDoneEntries).forEach(k => delete sessionDoneEntries[k]);
    Object.keys(coveredDateEntries).forEach(k => delete coveredDateEntries[k]);
    if(typeof weeklyTlmEntries !== 'undefined') Object.keys(weeklyTlmEntries).forEach(k => delete weeklyTlmEntries[k]);
    try {
      const rawPlan = localStorage.getItem(profileStorageKey('dailyPlanEntries'));
      if(rawPlan) Object.assign(dailyPlanEntries, JSON.parse(rawPlan));
    } catch(e) {}
    loadSessionDoneEntries();
    loadCoveredDateEntries();
    if(typeof loadWeeklyTlmEntries === 'function') loadWeeklyTlmEntries();
  }

  // The real calendar date for a given week+day — Monday of that
  // week (parseWeekStartDate, from curriculum.js) plus the day's
  // offset (mon=0 ... fri=4).
  function getRealDateForWeekDay(weekNum, dayKey){
    const week = WEEKS.find(w => w.w === weekNum);
    if(!week) return null;
    const startDate = parseWeekStartDate(week.dates);
    const dayOffset = ['mon','tue','wed','thu','fri'].indexOf(dayKey);
    if(dayOffset < 0) return null;
    const d = new Date(startDate);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }

  // Checks BOTH holiday sources already used elsewhere in this app —
  // the small fixed set (complianceHolidayName, in teacher.js) and any
  // ad-hoc one a teacher declared herself (studentHolidays, in
  // pupil-attendance.js) — so this agrees with whatever the Attendance
  // Register already considers a holiday, rather than a third,
  // separate notion of "holiday."
  function holidayNameForWeekDay(weekNum, dayKey){
    const d = getRealDateForWeekDay(weekNum, dayKey);
    if(!d) return null;
    const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const fixedHoliday = (typeof complianceHolidayName === 'function') ? complianceHolidayName(d.getFullYear(), d.getMonth(), d.getDate()) : null;
    const declaredHoliday = (typeof studentHolidays !== 'undefined') ? studentHolidays[dateStr] : null;
    return fixedHoliday || declaredHoliday || null;
  }

  function toggleSessionDone(week, dayKey, domainKey){
    const key = dailyPlanKey(week, dayKey, domainKey);
    const markingDone = !sessionDoneEntries[key]; // about to become true, unless currently true (about to un-mark)

    // Only relevant when actually marking something DONE — un-marking
    // doesn't need a covered date, and a session already correctly
    // marked with one keeps it until explicitly changed.
    if(markingDone){
      const holidayName = holidayNameForWeekDay(week, dayKey);
      if(holidayName){
        const suggested = coveredDateEntries[key] || todayDateKey();
        const input = prompt(
          `${holidayName} falls on this session's originally scheduled day, so it couldn't be taught then.\n\nWhich real date was it actually covered on? (YYYY-MM-DD)`,
          suggested
        );
        if(!input) return; // cancelled — don't mark done without a real covered date, since "done, but nobody knows when" isn't honest
        if(!/^\d{4}-\d{2}-\d{2}$/.test(input)){
          alert('Please enter the date as YYYY-MM-DD.');
          return;
        }
        coveredDateEntries[key] = input;
        saveCoveredDateEntries();
      } else if(coveredDateEntries[key]){
        // Was previously covered-on-a-different-day (e.g. the holiday
        // was later un-declared) — clear the stale covered date rather
        // than keep showing an explanation that no longer applies.
        delete coveredDateEntries[key];
        saveCoveredDateEntries();
      }
    }

    sessionDoneEntries[key] = markingDone;
    saveSessionDoneEntries();
    if(typeof syncDailyPlanEntryToServer === 'function') syncDailyPlanEntryToServer(week, dayKey, domainKey, markingDone, coveredDateEntries[key] || null);
    renderMyDay();
  }

  // Domain category names for the "Domain · Goal" column — this app's
  // DOMAINS array already has the real CG code per session; only the
  // broader category label (Emotional, Language, Mathematics, etc.)
  // needed adding, matching the reference's own categorisation.
  var DOMAIN_CATEGORY = {
    welcome: 'Emotional', story: 'Language', numeracy: 'Mathematics', language: 'Language',
    create: 'Arts', outdoor: 'Physical', tidy: 'Participation', reflect: 'Emotional'
  };

  function getSuggestedActivity(domainKey, dayKey){
    const weekPlan = WEEKLY_PLAN['wk' + currentWeekNum] || {};
    const short = weekPlan[domainKey] ? weekPlan[domainKey][dayKey] : '';
    const longer = (ACTIVITY_COMPETENCIES['wk' + currentWeekNum] &&
      ACTIVITY_COMPETENCIES['wk' + currentWeekNum][domainKey])
      ? ACTIVITY_COMPETENCIES['wk' + currentWeekNum][domainKey][dayKey] : '';
    return longer || short || '';
  }

  function voiceInputSupported(){
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function toggleVoiceInput(domainKey, btnEl){
    // Stop and clear if this same session's mic is already listening.
    if(activeVoiceRecognition && activeVoiceDomainKey === domainKey){
      activeVoiceRecognition.stop();
      return;
    }
    // Switching sessions while another mic is live — stop the old one first.
    if(activeVoiceRecognition){
      activeVoiceRecognition.stop();
    }

    if(!voiceInputSupported()){
      btnEl.textContent = '🎤 Voice input not supported in this browser';
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    try {
      recognition = new SpeechRecognitionCtor();
    } catch(e){
      btnEl.textContent = '🎤 Could not start voice input';
      return;
    }

    recognition.lang = 'en-IN';
    recognition.interimResults = true;  // show text live, while still speaking
    recognition.continuous = false;     // continuous mode has known reliability issues
                                         // in some Chrome/Edge versions — one complete
                                         // phrase per click is more reliable
    console.log('[voice] starting recognition for', domainKey);
    recognition.maxAlternatives = 1;

    activeVoiceRecognition = recognition;
    activeVoiceDomainKey = domainKey;
    btnEl.classList.add('listening');
    btnEl.textContent = '🔴 Listening… (click to stop)';

    const textarea = document.getElementById('planText-' + domainKey);
    const baseText = textarea ? textarea.value.trim() : '';
    let finalTranscript = '';

    recognition.onresult = (event) => {
      console.log('[voice] onresult fired', event.results);
      let interimTranscript = '';
      for(let i = event.resultIndex; i < event.results.length; i++){
        const piece = event.results[i][0].transcript;
        if(event.results[i].isFinal){
          finalTranscript += piece + ' ';
        } else {
          interimTranscript += piece;
        }
      }
      if(textarea){
        textarea.value = [baseText, finalTranscript.trim(), interimTranscript].filter(Boolean).join(' ');
        console.log('[voice] textarea now contains:', JSON.stringify(textarea.value));
      } else {
        console.log('[voice] WARNING: could not find textarea planText-' + domainKey);
      }
    };

    recognition.onerror = (event) => {
      console.log('[voice] onerror fired:', event.error, event);
      const reasons = {
        'not-allowed': 'Microphone permission denied — check your browser\'s site settings',
        'no-speech': 'No speech detected — try again',
        'audio-capture': 'No microphone found',
        'network': 'Needs an internet connection'
      };
      btnEl.textContent = '🎤 ' + (reasons[event.error] || ('Error: ' + event.error));
    };

    recognition.onend = () => {
      console.log('[voice] onend fired. Final textarea value:', textarea ? textarea.value : '(no textarea)');
      btnEl.classList.remove('listening');
      btnEl.textContent = '🎤 Speak activity';
      activeVoiceRecognition = null;
      activeVoiceDomainKey = null;
      if(textarea) savePlanText(domainKey, textarea.value);
    };

    recognition.onstart = () => {
      console.log('[voice] onstart fired - microphone is actually active now');
    };

    recognition.start();
  }

  function savePlanText(domainKey, text){
    const dayKey = ['mon','tue','wed','thu','fri'][myDayIndex];
    const key = dailyPlanKey(currentWeekNum, dayKey, domainKey);
    if(!dailyPlanEntries[key]) dailyPlanEntries[key] = {text:'', materials:[], usedSuggestion:false};
    dailyPlanEntries[key].text = text;
    const suggested = getSuggestedActivity(domainKey, dayKey);
    dailyPlanEntries[key].usedSuggestion = (text.trim() === suggested.trim() && text.trim() !== '');
    saveDailyPlanEntries();
    if(typeof syncDailyPlanEntryToServer === 'function') syncDailyPlanEntryToServer(currentWeekNum, dayKey, domainKey);
    updatePlanBadge(domainKey);
  }

  // Explicit "Save activity" button — the textarea already auto-saves as
  // you type (savePlanText fires on every keystroke), but that's easy to
  // miss. This gives a deliberate action with a clear, visible
  // confirmation, and is also what a teacher would naturally reach for
  // after finishing a voice-dictated activity.
  function saveActivityWithConfirmation(domainKey){
    const textarea = document.getElementById('planText-' + domainKey);
    if(!textarea) return;
    savePlanText(domainKey, textarea.value);
    const msg = document.getElementById('planSaveMsg-' + domainKey);
    if(msg){
      msg.textContent = '✓ Saved — synced to My Day';
      setTimeout(() => { msg.textContent = ''; }, 2500);
    }
    // Fires the moment an activity is saved/confirmed — the closest
    // thing this screen has to a "submit" action.
    checkActivityMatch(domainKey);
    const nowHasPlan = textarea.value.trim().length > 0;
    toggleAfterPlanVisibility(domainKey, nowHasPlan);
    // Draw the eye to the photo box the moment it appears — it's the
    // natural next step right after saving a plan.
    if(nowHasPlan){
      const photoBox = document.getElementById('photoUploadBox-' + domainKey);
      if(photoBox){
        photoBox.scrollIntoView({behavior: 'smooth', block: 'center'});
        photoBox.style.transition = 'box-shadow .3s ease';
        photoBox.style.boxShadow = '0 0 0 4px var(--primary-light, rgba(30,140,90,0.25))';
        setTimeout(() => { photoBox.style.boxShadow = 'none'; }, 1200);
      }
    }
  }

  // Materials and photo/evidence upload only make sense once a plan
  // actually exists for this session — shows/hides that block rather
  // than always rendering it, so an empty session isn't inviting a
  // material list or evidence photo for an activity that hasn't been
  // written yet.
  function toggleAfterPlanVisibility(domainKey, show){
    const wrap = document.getElementById('afterPlan-' + domainKey);
    if(wrap) wrap.style.display = show ? '' : 'none';
  }

  // ---------------------------------------------------------------
  // Activity match check — asks an AI agent whether what the teacher
  // actually wrote matches the suggested activity + domain (yes/no).
  //
  // Deliberately NOT wired to the database: matchCheckResults lives
  // only in this tab's memory, and backend/drive/check_activity.php
  // (see that file) never reads or writes any table either. Refreshing
  // the page or switching devices loses the result — that's intentional
  // until this is redesigned as a persisted feature.
  //
  // The endpoint itself is currently a stub (no real agent call yet —
  // that's the "pocket" left for wiring one in later).
  // ---------------------------------------------------------------
  var matchCheckResults = {}; // key -> {status, match, reason} — in-memory only

  function renderMatchBadge(domainKey){
    const dayKey = ['mon','tue','wed','thu','fri'][myDayIndex];
    const key = dailyPlanKey(currentWeekNum, dayKey, domainKey);
    const badge = document.getElementById('matchBadge-' + domainKey);
    if(!badge) return;
    const result = matchCheckResults[key];

    if(!result){
      badge.style.display = 'none';
      badge.textContent = '';
      badge.className = 'pill';
      return;
    }

    badge.style.display = 'inline-block';
    if(result.status === 'checking'){
      badge.textContent = 'Checking match…';
      badge.className = 'pill info';
    } else if(result.match === true){
      badge.textContent = '✓ Matches suggestion/domain';
      badge.className = 'pill good';
    } else if(result.match === false){
      badge.textContent = '✕ Doesn\u2019t match suggestion/domain';
      badge.className = 'pill warn';
    } else {
      badge.textContent = 'Match check: pending (agent not wired yet)';
      badge.className = 'pill';
    }
  }

  async function checkActivityMatch(domainKey){
    const dayKey = ['mon','tue','wed','thu','fri'][myDayIndex];
    const key = dailyPlanKey(currentWeekNum, dayKey, domainKey);
    const entry = dailyPlanEntries[key];
    if(!entry || !entry.text.trim()){
      delete matchCheckResults[key];
      renderMatchBadge(domainKey);
      return;
    }

    matchCheckResults[key] = { status: 'checking', match: null, reason: '' };
    renderMatchBadge(domainKey);

    const suggested = getSuggestedActivity(domainKey, dayKey);
    const d = DOMAINS.find(x => x.key === domainKey);

    try {
      const res = await fetch('backend/drive/check_activity.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: d ? d.label : domainKey,
          suggested_activity: suggested,
          actual_activity: entry.text
        })
      });
      const data = await res.json();
      matchCheckResults[key] = {
        status: data.status || 'pending',
        match: (typeof data.match === 'boolean') ? data.match : null,
        reason: data.reason || ''
      };
    } catch (err) {
      matchCheckResults[key] = { status: 'pending', match: null, reason: 'Could not reach match-check service.' };
    }
    renderMatchBadge(domainKey);
  }

  // Returns every session on the currently selected day to a genuinely
  // empty default — plan text, materials, the "done" mark, and any
  // uploaded evidence records. Confirmed first since this can't be
  // undone; scoped to just this one day, not the whole week/term.
  function resetTodaysPlans(){
    const dayKey = ['mon','tue','wed','thu','fri'][myDayIndex];
    if(!confirm('Clear every session\'s plan for today? This removes the plan text, materials, and evidence records for all 8 sessions today — it can\'t be undone.')) return;
    DOMAINS.forEach(d => {
      const key = dailyPlanKey(currentWeekNum, dayKey, d.key);
      delete dailyPlanEntries[key];
      delete sessionDoneEntries[key];
      delete uploadedEvidenceRecords[evidenceKey(currentWeekNum, dayKey, d.key)];
      if(typeof deleteDailyPlanEntryFromServer === 'function') deleteDailyPlanEntryFromServer(currentWeekNum, dayKey, d.key);
    });
    saveDailyPlanEntries();
    saveSessionDoneEntries();
    saveUploadedEvidenceRecords();
    renderMyDay();
  }

  function clearPlanText(domainKey){
    const textarea = document.getElementById('planText-' + domainKey);
    if(textarea){ textarea.value = ''; savePlanText(domainKey, ''); }
    toggleAfterPlanVisibility(domainKey, false);
  }

  function updatePlanBadge(domainKey){
    const dayKey = ['mon','tue','wed','thu','fri'][myDayIndex];
    const key = dailyPlanKey(currentWeekNum, dayKey, domainKey);
    const entry = dailyPlanEntries[key];
    const badge = document.getElementById('planBadge-' + domainKey);
    if(!badge) return;
    if(!entry || !entry.text.trim()){
      badge.textContent = 'Not planned yet';
      badge.className = 'pill';
    } else {
      badge.textContent = 'Planned';
      badge.className = 'pill good';
    }
  }

  function addMaterialChip(domainKey, inputEl){
    const value = inputEl.value.trim();
    if(!value) return;
    const dayKey = ['mon','tue','wed','thu','fri'][myDayIndex];
    const key = dailyPlanKey(currentWeekNum, dayKey, domainKey);
    if(!dailyPlanEntries[key]) dailyPlanEntries[key] = {text:'', materials:[], usedSuggestion:false};
    dailyPlanEntries[key].materials.push(value);
    saveDailyPlanEntries();
    if(typeof syncDailyPlanEntryToServer === 'function') syncDailyPlanEntryToServer(currentWeekNum, dayKey, domainKey);
    inputEl.value = '';
    renderMaterialChips(domainKey);
  }

  function removeMaterialChip(domainKey, idx){
    const dayKey = ['mon','tue','wed','thu','fri'][myDayIndex];
    const key = dailyPlanKey(currentWeekNum, dayKey, domainKey);
    if(dailyPlanEntries[key]) dailyPlanEntries[key].materials.splice(idx, 1);
    saveDailyPlanEntries();
    if(typeof syncDailyPlanEntryToServer === 'function') syncDailyPlanEntryToServer(currentWeekNum, dayKey, domainKey);
    renderMaterialChips(domainKey);
  }

  function renderMaterialChips(domainKey){
    const dayKey = ['mon','tue','wed','thu','fri'][myDayIndex];
    const key = dailyPlanKey(currentWeekNum, dayKey, domainKey);
    const materials = (dailyPlanEntries[key] && dailyPlanEntries[key].materials) || [];
    const wrap = document.getElementById('planMaterials-' + domainKey);
    if(!wrap) return;
    wrap.innerHTML = materials.map((m, i) =>
      `<span class="chip">${esc(m)} <span style="cursor:pointer; color:var(--ink-3);" onclick="removeMaterialChip('${domainKey}', ${i})">✕</span></span>`
    ).join('');
  }

  function togglePlanInsights(){
    planInsightsExpanded = !planInsightsExpanded;
    renderMyDay();
  }

  // Parses WEEKS[].dates strings like "15–19 Jun 2026" (same month) or
  // "29 Jun–3 Jul 2026" (crosses a month boundary) into the week's
  // actual Monday date. Finds the FIRST day-number and FIRST month
  // abbreviation in the string, which is always the start of the
  // range in both formats.
  // parseWeekStartDate lives in js/data/curriculum.js — removed the
  // duplicate that used to be here (a less robust regex approach that
  // silently won out over the real one, since this file loads after
  // curriculum.js and a duplicate function declaration just overwrites
  // silently rather than erroring).

  // ---------------------------------------------------------------
  // MY CLASS lives further down (see the existing renderMyClass near
  // the Class Progress section) — it was already built in an earlier
  // session, so nothing new is declared here to avoid a duplicate
  // function name silently shadowing it.
  // ---------------------------------------------------------------

  // ---------------------------------------------------------------
  // AI ASSISTANCE — a single home for the two rule-based suggestion
  // systems already in this app: per-session activity suggestions
  // (getSuggestedActivity, pulled from the pre-authored curriculum)
  // and the weekly planning advisories (revisit a domain / protect a
  // dropped session). Neither of these is a live model call — both
  // are deterministic rules over real data — so this screen says that
  // plainly up top rather than letting the label "AI Assistance"
  // imply more than what's actually running.
  // ---------------------------------------------------------------
  function renderAIAssistance(){
    const container = document.getElementById('aiassistance-body');
    container.innerHTML = '';
    container.appendChild(renderTeachingTabBar('aiassistance'));

    const disclaimer = document.createElement('div');
    disclaimer.className = 'card'; disclaimer.style.cssText = 'padding:16px 18px; margin-bottom:22px; background:var(--bg); border-style:dashed;';
    disclaimer.innerHTML = `<p class="cap" style="margin:0;">What's on this page is <b>rule-based, not a live AI model</b>: the weekly advisories below fire from fixed rules over real attendance/assessment data. Nothing here reasons about your specific class beyond applying those rules.</p>`;
    container.appendChild(disclaimer);

    const w = WEEKS.find(x => x.w === currentWeekNum) || WEEKS[0];

    container.appendChild(mdSec('Suggestions for next week', '<span class="reqs">AIR-02…07 · advisory only</span>'));
    const sg = document.createElement('div'); sg.className = 'g g2';
    const c1 = document.createElement('div');
    c1.innerHTML = `<p style="margin:0 0 8px">Suggest a revisit session for <b>Numeracy</b>, using the authored activities for its curricular goal.</p>
      <div style="display:flex;gap:6px"><span class="chip sel">Accept</span><span class="chip">Edit</span><span class="chip">Reject</span></div>
      <p class="cap" style="margin:8px 0 0">Evidence: 28 children × 2 assessment points. AIR-05 requires this line.</p>`;
    sg.appendChild(mdCard('Revisit a domain', 'Rule: two or more assessment points with over 40% at the lowest tier.', c1));
    const c2 = document.createElement('div');
    c2.innerHTML = `<p style="margin:0 0 8px"><b>Tidy &amp; Put Away</b> was not delivered or modified 2 times this fortnight. Most common reason: children absent at wrap-up.</p>
      <div style="display:flex;gap:6px"><span class="chip sel">Accept</span><span class="chip">Edit</span><span class="chip">Reject</span></div>
      <p class="cap" style="margin:8px 0 0">Rejection reason is stored — AIR-07.</p>`;
    sg.appendChild(mdCard('Protect a dropped session', 'Rule: a session not delivered in 3 or more of the last 10 school days.', c2));
    container.appendChild(sg);
  }


  function toggleAddMaterialForm(){
    const wrap = document.getElementById('addMaterialFormWrap');
    const isHidden = wrap.classList.contains('hidden');
    if(!isHidden){ wrap.classList.add('hidden'); wrap.innerHTML = ''; return; }

    wrap.classList.remove('hidden');
    const existingItemNames = [...new Set(lastLoadedMaterials.map(m => m.item_name))];
    wrap.innerHTML = `
      <form onsubmit="return submitNewMaterial(event)" class="card" style="padding:22px; margin-bottom:16px;">
        <h4 style="margin:0 0 4px;">New receipt</h4>
        <p class="cap" style="margin:0 0 16px;">RES-05 · recorded when it arrives, by the person it arrives with. A stock take at the end of the year is a reconstruction, and the difference between the two is the whole reason inventory reports are not believed.</p>
        <div class="transition-filter-row">
          <div class="transition-filter-field">
            <label>Item</label>
            <input type="text" id="matItemName" list="matItemNameList" placeholder="e.g. Workbook set — Jr KG" required style="width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit;" />
            <datalist id="matItemNameList">${existingItemNames.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
          </div>
          <div class="transition-filter-field">
            <label>Source</label>
            <select id="matSource" onchange="document.getElementById('matOtherFoundationWrap').style.display = this.value === 'Other Foundation' ? '' : 'none'" style="width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; background:#fff; font-family:inherit;">
              <option value="BMC" selected>BMC</option>
              <option value="Bhavyata Foundation">Bhavyata Foundation</option>
              <option value="Other Foundation">Other Foundation</option>
            </select>
          </div>
          <div class="transition-filter-field" id="matOtherFoundationWrap" style="display:none;">
            <label>Foundation name</label>
            <input type="text" id="matOtherFoundation" maxlength="100" placeholder="e.g. Rotary Club" style="width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit;">
          </div>
          <div class="transition-filter-field">
            <label>Quantity</label>
            <input type="text" id="matQuantity" placeholder="e.g. 28, or 3 sets" style="width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit;" />
          </div>
        </div>
        <div class="transition-filter-row" style="margin-top:14px;">
          <div class="transition-filter-field">
            <label>Received on</label>
            <input type="date" id="matReceivedDate" required style="width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit;" />
          </div>
          <div class="transition-filter-field">
            <label>Category</label>
            <select id="matCategory" style="width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; background:#fff; font-family:inherit;">
              <option value="TLM">TLM (Teaching-Learning Material)</option>
              <option value="Stationery">Stationery</option>
              <option value="Workbook">Workbook</option>
              <option value="Other" selected>Other</option>
            </select>
          </div>
          <div class="transition-filter-field">
            <label>Condition</label>
            <select id="matCondition" style="width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; background:#fff; font-family:inherit;">
              <option value="usable" selected>usable</option>
              <option value="damaged">damaged</option>
            </select>
          </div>
        </div>
        <div class="transition-filter-row" style="margin-top:14px;">
          <div class="transition-filter-field" style="flex:1;">
            <label>Photo (optional — uploads to Google Drive)</label>
            <input type="file" id="matFile" accept="image/*" capture="environment" style="width:100%; padding:6px 0; font-size:13px;" />
            <p class="cap" style="margin:4px 0 0;">On a phone this opens the camera directly; on desktop it opens a file picker. Saved to Aarambh LMS / TLM &amp; Resources / &lt;item name&gt; in your connected Drive. Leave blank to skip.</p>
            <div id="matFileStatus" style="margin-top:6px;"></div>
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:14px;">
          <button type="submit" class="btn-primary" style="width:auto; padding:9px 16px;">Record receipt</button>
          <button type="button" class="btn-sup-outline" style="width:auto; padding:9px 16px;" onclick="toggleAddMaterialForm()">Cancel</button>
        </div>
        <div id="addMaterialResult" style="margin-top:10px;"></div>
      </form>
    `;
    document.getElementById('matReceivedDate').value = todayKey();
  }

  // Attach a photo to a material that was already logged before the
  // photo feature existed — opens a hidden file input (camera on
  // mobile, picker on desktop), uploads via the same upload_to_drive.php
  // every other upload here uses, then saves the link onto that
  // existing row via set_material_photo.php and refreshes the list.
  // Removes a material's photo — deletes the actual file from Google
  // Drive first (same delete_from_drive.php Classroom State's photo
  // removal already uses), then clears the reference on the material
  // row only after that succeeds, so a failed Drive deletion never
  // leaves the app claiming a photo is gone when it's still sitting
  // in Drive.
  async function removeMaterialPhoto(materialId, driveFileId){
    if(!confirm('Remove this photo? This deletes the actual file from Google Drive, not just the reference here.')) return;
    try{
      if(driveFileId){
        const delRes = await fetch('backend/drive/delete_from_drive.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ file_id: driveFileId })
        });
        const delData = await delRes.json();
        if(delData.status !== 'success'){
          alert(delData.message || 'Could not delete the file from Drive.');
          return;
        }
      }
      const clearRes = await fetch('backend/materials/set_material_photo.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ material_id: materialId, drive_file_id: '', drive_link: '' })
      });
      const clearData = await clearRes.json();
      if(clearData.status !== 'success'){
        alert(clearData.message || 'Deleted from Drive, but could not clear the reference here — try reloading.');
      }
    } catch(err){
      alert('Could not reach the server.');
      return;
    }
    renderMaterials();
  }

  function attachMaterialPhoto(materialId, itemName, supplySource){
    supplySource = supplySource || 'BMC';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = async () => {
      if(!input.files.length){ document.body.removeChild(input); return; }
      const btn = document.getElementById('matPhotoBtn-' + materialId);
      const originalLabel = btn ? btn.textContent : null;
      if(btn){ btn.textContent = 'Compressing…'; btn.disabled = true; }
      try{
        const compressedFile = renameFileTo(await compressImageFile(input.files[0]), itemName);
        if(btn) btn.textContent = 'Uploading…';
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('folder_path', 'TLM & Resources/' + supplySource);
        const uploadRes = await fetch('backend/drive/upload_to_drive.php' + window.location.search, {
          method: 'POST', body: formData
        });
        const uploadData = await uploadRes.json();
        if(uploadData.status !== 'success'){
          if(btn){ btn.textContent = originalLabel; btn.disabled = false; }
          if(uploadData.message && uploadData.message.indexOf('isn\'t connected') !== -1){
            alert('Google Drive isn\'t connected yet — connect it from Class Attendance\'s Google Drive link, then try again.');
          } else {
            alert(uploadData.message || 'Upload failed.');
          }
          document.body.removeChild(input);
          return;
        }
        if(btn) btn.textContent = 'Saving…';
        const saveRes = await fetch('backend/materials/set_material_photo.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ material_id: materialId, drive_file_id: uploadData.file_id, drive_link: uploadData.link })
        });
        const saveData = await saveRes.json();
        if(saveData.status !== 'success'){
          if(btn){ btn.textContent = originalLabel; btn.disabled = false; }
          alert(saveData.message || 'Uploaded to Drive, but could not save the link — try again.');
          document.body.removeChild(input);
          return;
        }
      } catch(err){
        if(btn){ btn.textContent = originalLabel; btn.disabled = false; }
        alert('Could not reach the server.');
        document.body.removeChild(input);
        return;
      }
      document.body.removeChild(input);
      renderMaterials(); // re-render shows the real "✓ Uploaded" status pill and the View photo link — no separate success message needed
    };
    input.click();
  }

  async function submitNewMaterial(event){
    event.preventDefault();
    const resultEl = document.getElementById('addMaterialResult');
    resultEl.innerHTML = '';

    const itemName = document.getElementById('matItemName').value.trim();
    const receivedDate = document.getElementById('matReceivedDate').value;

    if(!itemName || !receivedDate){
      resultEl.innerHTML = `<div class="au-error">Item name and received date are both required.</div>`;
      return false;
    }

    // Duplicate check — same item, same source, same received date is
    // almost always a double-entry (someone taps "Add material" twice,
    // or the item was already logged from an earlier import). Blocks
    // with a clear alert rather than silently creating a second row.
    const sourceChoice = document.getElementById('matSource').value;
    const otherFoundationName = (document.getElementById('matOtherFoundation') ? document.getElementById('matOtherFoundation').value : '').trim();
    const sourceValue = sourceChoice === 'Other Foundation' && otherFoundationName ? otherFoundationName : sourceChoice;
    const isDuplicate = lastLoadedMaterials.some(m =>
      m.item_name.trim().toLowerCase() === itemName.toLowerCase() &&
      (m.supply_source || 'BMC') === sourceValue &&
      m.received_date === receivedDate
    );
    if(isDuplicate){
      alert(`"${itemName}" from ${sourceValue}, received ${receivedDate}, is already on the list. Choose a different date, source, or item name if this is genuinely a separate delivery.`);
      resultEl.innerHTML = `<div class="au-error">Not saved — this looks like a duplicate of an item already logged.</div>`;
      return false;
    }

    // If a photo was chosen (any category, not just Workbook), upload
    // it to Drive first — same upload_to_drive.php every other file
    // upload in this app already uses, landing under Aarambh LMS /
    // TLM & Resources / <item name>. The material record only gets
    // saved after this succeeds (or is skipped, if no file was
    // chosen), so a failed upload never leaves a half-saved row with
    // a broken file link.
    let driveFileId = '', driveLink = '';
    const fileInput = document.getElementById('matFile');
    const category = document.getElementById('matCategory').value;
    if(fileInput && fileInput.files.length){
      const fileStatusEl = document.getElementById('matFileStatus');
      fileStatusEl.innerHTML = '<p class="sub">Compressing…</p>';
      try{
        const compressedFile = renameFileTo(await compressImageFile(fileInput.files[0]), itemName);
        fileStatusEl.innerHTML = '<p class="sub">Uploading to Google Drive…</p>';
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('folder_path', 'TLM & Resources/' + sourceValue);
        const uploadRes = await fetch('backend/drive/upload_to_drive.php' + window.location.search, {
          method: 'POST', body: formData
        });
        const uploadData = await uploadRes.json();
        if(uploadData.status === 'success'){
          driveFileId = uploadData.file_id;
          driveLink = uploadData.link;
          fileStatusEl.innerHTML = '<div class="au-success">✓ Uploaded to Drive.</div>';
        } else if(uploadData.message && uploadData.message.indexOf('isn\'t connected') !== -1){
          fileStatusEl.innerHTML = '<div class="au-error">Google Drive isn\'t connected yet — connect it from Class Attendance\'s Google Drive link, then try again. The material itself will still be saved without the file.</div>';
        } else {
          fileStatusEl.innerHTML = `<div class="au-error">${esc(uploadData.message || 'Upload failed.')} The material itself will still be saved without the file.</div>`;
        }
      } catch(err){
        fileStatusEl.innerHTML = '<div class="au-error">Could not reach the server for the upload. The material itself will still be saved without the file.</div>';
      }
    }

    resultEl.innerHTML = '<p class="sub">Saving…</p>';
    try{
      const res = await fetch('backend/materials/add_materials.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          item_name: itemName,
          quantity: document.getElementById('matQuantity').value.trim(),
          received_date: receivedDate,
          category: category,
          source: sourceValue,
          item_condition: document.getElementById('matCondition').value,
          drive_file_id: driveFileId,
          drive_link: driveLink
        })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Could not save.')}</div>`;
        return false;
      }
      renderMaterials();
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
    return false;
  }

  // Exports exactly what's currently loaded (lastLoadedMaterials) as a
  // .csv — real data, generated client-side, no backend round trip
  // needed. Uses the same column set the import expects, so a
  // downloaded list can be re-imported elsewhere unchanged.
  function downloadMaterialsCsv(){
    if(!lastLoadedMaterials.length){
      alert('Nothing to download yet — the list is empty.');
      return;
    }
    const entitledQty = SAMPLE_STUDENTS.length;
    const header = 'item_name,category,source,entitled,received,issued,balance,short,received_date,condition,signed';
    const rows = lastLoadedMaterials.map(m => {
      const received = parseInt(m.quantity, 10) || 0;
      const issued = m.distributed ? received : 0;
      return [
        m.item_name, m.category || '', m.supply_source || '', entitledQty, received, issued, received - issued,
        Math.max(0, entitledQty - received), m.received_date, m.item_condition || 'usable',
        materialsSignedLocal[m.id] ? 'yes' : 'no'
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [header, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tlm-resources-' + todayKey() + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Same real data as the CSV export, laid out as an actual .pdf table
  // via jsPDF + autoTable (loaded from cdnjs — see teacher.html). If
  // the CDN didn't load (no internet on this machine), fails with a
  // clear message rather than a silent broken button.
  function downloadMaterialsPdf(){
    if(!lastLoadedMaterials.length){
      alert('Nothing to download yet — the list is empty.');
      return;
    }
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — use "Download CSV" instead.');
      return;
    }
    const entitledQty = SAMPLE_STUDENTS.length;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('TLM & Resources — Inventory', 14, 15);
    doc.setFontSize(9);
    doc.text('Mrs. Sharma — Jr KG B · generated ' + new Date().toLocaleDateString(), 14, 21);
    doc.autoTable({
      startY: 26,
      head: [['Item', 'Category', 'Source', 'Entitled', 'Received', 'Issued', 'Balance', 'Short', 'Received on', 'Condition', 'Signed']],
      body: lastLoadedMaterials.map(m => {
        const received = parseInt(m.quantity, 10) || 0;
        const issued = m.distributed ? received : 0;
        return [
          m.item_name, m.category || '—', m.supply_source || 'BMC', entitledQty, received, issued, received - issued,
          Math.max(0, entitledQty - received),
          new Date(m.received_date + 'T00:00:00').toLocaleDateString([], {day:'numeric', month:'short', year:'numeric'}),
          m.item_condition || 'usable',
          materialsSignedLocal[m.id] ? 'Yes' : 'No'
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });
    doc.save('tlm-resources-' + todayKey() + '.pdf');
  }

  // ============================================================
  // CLASSROOM STATE — a monthly self-inspection checklist, four
  // rooms/areas (Fabric, Teaching, Storage, Health), each item rated
  // Good / Adequate / Needs attention / Not present, with an optional
  // photo flag and, for anything flagged "Needs attention", a note
  // and a "Raise with the school" escalation. No backend table exists
  // for this yet — persisted to localStorage only, same swap-out-
  // later pattern as everything else in this file that's real data
  // but not yet database-backed.
  // ============================================================

  var CLASSROOM_STATE_SECTIONS = [
    {
      section: 'Fabric', caption: null,
      items: [
        {key: 'walls', label: 'Walls painted and clean', critical: true},
        {key: 'floor', label: 'Floor safe and even', critical: true},
        {key: 'lighting', label: 'Lighting and ventilation', critical: true},
        {key: 'fans', label: 'Fans working', critical: false}
      ]
    },
    {
      section: 'Teaching', caption: 'INF-05 · material a child can reach herself counts; material locked in a cupboard does not.',
      items: [
        {key: 'activityboards', label: 'Activity / display boards', critical: false},
        {key: 'tlmaccess', label: 'TLM available and accessible to children', critical: true},
        {key: 'jaduipitara', label: 'Jadui Pitara material present', critical: false},
        {key: 'stationery', label: 'Stationery — crayons, paper, chart', critical: true},
        {key: 'childwork', label: "Children's own work on display", critical: false}
      ]
    },
    {
      section: 'Storage', caption: null,
      items: [
        {key: 'cupboards', label: 'Cupboards, lockable', critical: false},
        {key: 'lowshelves', label: 'Low open shelves for children', critical: false},
        {key: 'floormats', label: 'Floor mats / seating', critical: false}
      ]
    },
    {
      section: 'Health', caption: 'INF-07 · these five are conditions for use, not quality measures.',
      items: [
        {key: 'water', label: 'Drinking water in the room or adjacent', critical: true},
        {key: 'toilet', label: 'Child-height toilet accessible', critical: true},
        {key: 'handwash', label: 'Handwashing point with soap', critical: true},
        {key: 'firstaid', label: 'First-aid box, stocked and in date', critical: true},
        {key: 'emergency', label: 'Emergency contacts displayed', critical: true}
      ]
    }
  ];
  var CLASSROOM_STATE_STATUSES = [
    {v: 'good', l: 'Good', color: 'var(--success)'},
    {v: 'adequate', l: 'Adequate', color: '#EE8F35'},
    {v: 'needsattention', l: 'Needs attention', color: 'var(--danger,#c8433f)'},
    {v: 'notpresent', l: 'Not present', color: 'var(--text-muted)'}
  ];

  // entries: itemKey -> {status, photo:bool, note:string, raised:bool}
  var classroomStateEntries = {};
  (function loadClassroomStateEntries(){
    try {
      const raw = localStorage.getItem('classroomStateEntries');
      if(raw) Object.assign(classroomStateEntries, JSON.parse(raw));
    } catch(e){ /* start empty */ }
  })();