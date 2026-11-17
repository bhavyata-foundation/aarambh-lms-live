function renderSidebar(){
    const list = document.getElementById('week-list');
    list.innerHTML = WEEKS.map(w => {
      const isExpanded = expandedWeek === w.w;
      let dropdownHtml = '';
      if(isExpanded && weeksWithContent.includes(w.w)){
        const weekTopics = WEEK_DAY_TOPICS['wk' + w.w] || {};
        dropdownHtml = `<div class="day-topic-list">
          <div class="day-topic-heading">Topic: ${w.theme}</div>` + DAYS.map(d => {
          const key = w.w + '-' + d.key;
          const checked = dayTopicDone[key] ? 'checked' : '';
          const doneClass = dayTopicDone[key] ? 'dt-done' : '';
          const activeClass = (w.w===currentWeekNum && d.key===currentDay) ? 'active-day' : '';
          const topic = weekTopics[d.key];
          const topicText = topic ? alwaysEnglish(topic.value) : 'Topic not yet added';
          return `<div class="day-topic-row ${activeClass}">
            <input type="checkbox" ${checked} onchange="toggleDayTopic(${w.w}, '${d.key}', this)" />
            <span class="dt-label ${doneClass}" onclick="event.stopPropagation(); selectWeekDay(${w.w}, '${d.key}')">${d.label} — ${topicText}</span>
          </div>`;
        }).join('') + `</div>`;
      } else if(isExpanded){
        dropdownHtml = `<div class="day-topic-list" style="color:var(--text-muted); font-size:11px;">No topics authored for this week yet.</div>`;
      }
      return `<div class="week-item ${w.w===currentWeekNum?'active':''} ${weeksWithContent.includes(w.w)?'has-content':''}" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; align-items:center; gap:10px;" onclick="toggleWeekExpand(${w.w})">
          <div class="week-num">${w.w}</div>
          <div class="week-info">
            <div class="week-title">WEEK-${w.w}</div>
            <div class="week-dates">${w.theme} · ${w.dates}</div>
          </div>
          <span class="chevron ${isExpanded?'open':''}">▶</span>
        </div>
        ${dropdownHtml}
      </div>`;
    }).join('');
  }
  function toggleWeekExpand(wnum){
    expandedWeek = (expandedWeek === wnum) ? null : wnum;
    if(weeksWithContent.includes(wnum)) openWeek(wnum);
    else renderSidebar();
  }
  function toggleDayTopic(wnum, dayKey, el){
    dayTopicDone[wnum + '-' + dayKey] = el.checked;
    renderSidebar();
  }
  function selectWeekDay(wnum, dayKey){
    expandedWeek = wnum;
    currentDay = dayKey;
    openWeek(wnum);
    closeSidebar();
  }
  function openWeek(wnum){
    currentWeekNum = wnum;
    renderSidebar();
    const w = WEEKS.find(x => x.w === wnum);
    document.getElementById('week-subheading').textContent = `Week ${w.w} · Term 1 · ${w.dates} · Theme: ${w.theme}`;
    const body = document.getElementById('week-body');
    if(weeksWithContent.includes(wnum)){
      renderWeekBody();
    } else {
      body.innerHTML = `<div class="empty-state">Content for "${w.theme}" hasn't been authored in this rough demo yet — only Week 1 ("My Classroom") has the full daily lesson plan wired up.</div>`;
    }
  }
  function renderWeekBody(){
    const body = document.getElementById('week-body');
    body.innerHTML = `
      <div class="value-banner" id="value-banner"></div>
      <div id="day-summary"></div>
      <div id="rating-panel-container"></div>
      <div class="domain-grid" id="domain-grid"></div>
    `;
    renderDailyView();
  }
  const domainDone = {};   // key: day-domain -> true/false
  const dayRatings = {};   // key: day-domain -> {studentName: rating}
  function renderDailyView(){
    const day = DAYS.find(d => d.key === currentDay);
    document.getElementById('value-banner').innerHTML = `<strong>Value:</strong> ${alwaysEnglish(day.value)} &nbsp;·&nbsp; <strong>Link:</strong> ${alwaysEnglish(day.link)}`;
    let doneCount = 0;
    let cardsHtml = '';
    // Only render a card for domains that actually have content for
    // this specific week — e.g. Week 2's real plan doesn't include
    // Tidy & Put Away at all, so it should disappear rather than
    // show an empty "Not planned yet" placeholder.
    const weekPlan = WEEKLY_PLAN['wk' + currentWeekNum];
    const trackedDomains = DOMAINS.filter(dom => weekPlan && weekPlan[dom.key] !== undefined);
    trackedDomains.forEach(dom => {
      const activity = todaysActivity(dom.key);
      const key = currentDay + '-' + dom.key;
      const done = !!domainDone[key];
      if(done) doneCount++;
      if(!dom.h5p){
        // Plain checklist item, no game, no proficiency rating
        cardsHtml += `<div class="stage-card ${done?'done':''}">
          <div class="stage-head">
            <span class="name">${pickLang(dom.label)} <span class="stage-time">${dom.time}</span></span>
            <span class="stage-tag ${done?'done':''}">${done ? 'Done' : 'Not done'}</span>
          </div>
          <div class="materials-line">Planned activity: ${activity}</div>
          <div class="competency-tag">Covers: ${competencyFor(dom.key)}</div>
          <div class="stage-foot">
            <label class="mark-taught">
              <input type="checkbox" ${done?'checked':''} onchange="toggleDomainDone('${dom.key}', this)" />
              Mark as done today
            </label>
          </div>
        </div>`;
        return;
      }
      cardsHtml += `<div class="stage-card ${done?'done':''}" id="stage-card-${key}">
        <div class="stage-head">
          <span class="name">${pickLang(dom.label)} <span class="stage-time">${dom.time}</span></span>
          <button class="fullscreen-btn" onclick="toggleCardFullscreen('stage-card-${key}')" title="View full screen" aria-label="View full screen">⛶</button>
          <span class="stage-tag ${done?'done':''}">${done ? 'Done today' : 'Pending'}</span>
        </div>
        <div class="materials-line">Planned activity: ${activity}</div>
        <div class="competency-tag">Covers: ${competencyFor(dom.key)}</div>
        <div class="h5p-block">
          <div class="h5p-frame" id="${mountId(key)}">${done ? '<div class="h5p-done-msg">✓ Practised — nice work!</div>' : ''}</div>
        </div>
        <div class="stage-foot">
          <label class="mark-taught">
            <input type="checkbox" ${done?'checked':''} onchange="toggleDomainDone('${dom.key}', this)" />
            Mark as done today
          </label>
          <button class="btn-rate-open small" onclick="openRatingPanel('${dom.key}')">Enter proficiency</button>
        </div>
      </div>`;
    });
    document.getElementById('domain-grid').innerHTML = cardsHtml;
    document.getElementById('day-summary').innerHTML =
      `<div class="topic-complete-banner ${doneCount<trackedDomains.length ? 'pending' : ''}">${doneCount===trackedDomains.length?'✓ ':''}${doneCount} of ${trackedDomains.length} domains done for ${day.label}</div>`;
    trackedDomains.forEach(dom => { if(dom.h5p) mountH5pIfNeeded(dom.key); });
    document.getElementById('pending-count').textContent = DOMAINS.length - doneCount;
    renderTodayOverview();
  }
  function toggleDomainDone(domainKey, el){
    domainDone[currentDay + '-' + domainKey] = el.checked;
    renderDailyView();
  }
  function renderTodayOverview(){
    const el = document.getElementById('today-overview');
    if(!el) return;
    const day = DAYS.find(d => d.key === currentDay);
    const rows = DOMAINS.map(dom => {
      const activity = todaysActivity(dom.key);
      const done = !!domainDone[currentDay + '-' + dom.key];
      return `<div class="overview-row ${done ? 'done' : ''}">
        <span class="overview-time">${dom.time}</span>
        <span class="overview-domain">${pickLang(dom.label)}</span>
        <span class="overview-activity">${activity}</span>
        <span class="overview-status">${done ? '✓' : '•'}</span>
      </div>`;
    }).join('');
    el.innerHTML = `
      <div class="overview-header">
        <span>Today's plan — ${day.label}</span>
        <span class="overview-toggle" onclick="toggleOverview()">${overviewCollapsed ? 'Show' : 'Hide'}</span>
      </div>
      <div class="overview-body ${overviewCollapsed ? 'hidden' : ''}">${rows}</div>
    `;
  }
  let overviewCollapsed = false;
  function toggleOverview(){
    overviewCollapsed = !overviewCollapsed;
    renderTodayOverview();
  }
  function mountId(key){ return 'h5p-mount-' + key.replace(/[^a-zA-Z0-9]/g,'_'); }
  function mountH5pIfNeeded(domainKey){
    const key = currentDay + '-' + domainKey;
    if(domainDone[key]) return; // already taught — done message is shown instead
    const el = document.getElementById(mountId(key));
    const renderer = ACTIVITY_RENDERERS[domainKey];
    if(el && renderer){
      renderer(el, function(){
        domainDone[key] = true;
        renderDailyView();
      });
    }
  }
  function openRatingPanel(domainKey){
    const key = currentDay + '-' + domainKey;
    const existing = dayRatings[key] || {};
    const domainLabel = DOMAINS.find(d=>d.key===domainKey).label;
    const dayLabel = DAYS.find(d=>d.key===currentDay).label;
    const competencyText = competencyFor(domainKey);
    let html = `<div class="rating-panel">
      <p class="rp-title">Enter proficiency — ${domainLabel}, ${dayLabel}</p>
      <p class="rp-competency"><strong>Covers:</strong> ${competencyText}</p>`;
    (Array.isArray(realPupilsCache) ? realPupilsCache.map(p => p.name) : []).forEach(name => {
      const current = existing[name] || '';
      html += `<div class="rp-row"><span>${name}</span>
        <select id="rate-${name.replace(/\s/g,'_')}">
          <option value="">— Select —</option>
          ${RATING_LEVELS.map(l => `<option value="${l}" ${current===l?'selected':''}>${l}</option>`).join('')}
        </select></div>`;
    });
    html += `<div class="rp-actions">
        <button class="btn-save" onclick="saveRatings('${domainKey}')">Save ratings</button>
        <button class="btn-cancel" onclick="closeRatingPanel()">Cancel</button>
      </div></div>`;
    document.getElementById('rating-panel-container').innerHTML = html;
    document.getElementById('rating-panel-container').scrollIntoView({behavior:'smooth', block:'center'});
  }
  function saveRatings(domainKey){
    const key = currentDay + '-' + domainKey;
    const ratings = {};
    (Array.isArray(realPupilsCache) ? realPupilsCache.map(p => p.name) : []).forEach(name => {
      const sel = document.getElementById(`rate-${name.replace(/\s/g,'_')}`);
      if(sel && sel.value) ratings[name] = sel.value;
    });
    dayRatings[key] = ratings;
    closeRatingPanel();
  }
  function closeRatingPanel(){
    document.getElementById('rating-panel-container').innerHTML = '';
  }
/* =========================================================
   SESSION RESUME — on page load, check whether there's already a
   real logged-in session (e.g. after clicking "Preview as Teacher"
   from Super Admin, or simply reloading this page while logged in)
   and skip straight to the dashboard instead of showing the login
   form again. If not logged in, the login form just stays visible,
   same as before this existed.
   Runs last, after every function/variable it calls is already
   defined — same ordering reason the old dev-bypass trigger used
   to need this position.
   ========================================================= */
// -------------------------------------------------------------------------
// PREVIEW BANNER — shown only when a superadmin is currently previewing
// the teacher role (see backend/preview_as.php). Lets them get back to
// their real superadmin session with one click, no re-login needed.
// -------------------------------------------------------------------------
  /* ===================== SECTION 12: REMAINING SIDEBAR SCREENS ===================== */
  // All 11 of these are deliberately frontend-only placeholder views —
  // sample/computed data, no new backend endpoints, same "frontend
  // first" pattern used everywhere else in this app so far. The 5
  // student-dependent ones (My Class, Class Progress, Attendance
  // Register, Admissions, Monthly Assessment, Child Record, Transition)
  // are blocked on a real `students` table — this reuses the existing
  // SAMPLE_STUDENTS list as a stand-in until that table exists.
  //
  // Deterministic pseudo-random helper — same purpose as the old
  // prototype's rng(): stable sample numbers that don't re-shuffle on
  // every render, without needing a real backend or true randomness.
  function sampleHash(str){
    let h = 2166136261;
    for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }
  function sampleRand(seed){ return (sampleHash(seed) % 1000) / 1000; }
  function samplePick(seed, arr){ return arr[Math.floor(sampleRand(seed) * arr.length)]; }
  // ---------- 1. MY CLASS ----------
  // Matches the real prototype's vTeacherClass exactly: same tiles, same
  // table columns, same wording/req codes — pulled directly from the
  // prototype's source rather than guessed at from a screenshot.
  const OCCUPATIONS = ['Daily wage labour','Auto / taxi driver','Domestic work','Tailoring','Homemaker','Unemployed','Self-employed / small trade','Salaried'];
  const LANGUAGES_AT_HOME = ['Hindi','Marathi','Telugu','Bhojpuri','Gujarati'];
  const INCOME_BANDS = ['Under ₹5,000','₹5,000–10,000','₹15,000–25,000','Prefer not to say'];
  // No invented family details: a child without a real family profile
  // gets an EMPTY record (every screen then shows "No data available").
  function sampleFamily(name){
    return { guardians: [], langs: [], reads: false, income: '', complete: 0, consent: false, photoConsent: false, noData: true };
  }
  function sampleHomeActStatus(name){
    return 'No data available'; // home activity is not tracked yet — never invented
  }
  // ---------- 1. MY CLASS — weekly activity performance ----------
  // One row per child, one column per session domain (each mapped to
  // its Curricular Goal). The teacher rates each child once per domain
  // per week on the same B / P / A scale used everywhere else in the
  // app. Real data only: ratings come from child_activity_ratings via
  // get_child_activity_ratings.php; "held" counts come from the real
  // session-done records (sessionDoneEntries). Nothing rated = "·".
  let myClassViewWeek = null;          // null = follow currentWeekNum
  let myClassRatingPopupKey = null;    // 'pupilId|domainKey' of the one open popup, or null
  let myClassRatingSaveError = '';     // shown above the table if a save fails
  let childActivityRatings = {};       // week -> { pupilId: { domainKey: 'E'|'P'|'A' } }
  let childActivityRatingsStatus = {}; // week -> 'loading' | 'loaded' | 'error'
  let myClassPlanFetchTried = {};      // week -> true once we've asked for that week's session records
  function myClassWeek(){
    return myClassViewWeek === null ? currentWeekNum : myClassViewWeek;
  }
  function shiftMyClassWeek(delta){
    const firstWeek = (typeof WEEKS !== 'undefined' && WEEKS.length) ? WEEKS[0].w : 1;
    const next = myClassWeek() + delta;
    if(next < firstWeek || next > currentWeekNum) return; // no rating future weeks
    myClassViewWeek = next;
    myClassRatingPopupKey = null;
    renderMyClass();
  }
  async function fetchChildActivityRatings(week){
    if(!myClassInfo.class_id) return;
    childActivityRatingsStatus[week] = 'loading';
    try{
      const params = new URLSearchParams(window.location.search);
      params.set('class_id', myClassInfo.class_id);
      params.set('week_number', week);
      const res = await fetch('backend/assessment/activity/get_child_activity_ratings.php?' + params.toString());
      const data = await res.json();
      if(data.status === 'success'){
        childActivityRatings[week] = data.ratings || {};
        childActivityRatingsStatus[week] = 'loaded';
      } else {
        childActivityRatingsStatus[week] = 'error';
      }
    } catch(err){
      childActivityRatingsStatus[week] = 'error';
    }
    renderMyClass();
    if(typeof assessmentRecordsRerender === 'function') assessmentRecordsRerender();
  }
  function toggleMyClassRatingPopup(pupilId, domainKey){
    const key = pupilId + '|' + domainKey;
    myClassRatingPopupKey = (myClassRatingPopupKey === key) ? null : key;
    renderMyClass();
  }
  async function setChildActivityRating(pupilId, domainKey, rating){
    const week = myClassWeek();
    if(!childActivityRatings[week]) childActivityRatings[week] = {};
    if(!childActivityRatings[week][pupilId]) childActivityRatings[week][pupilId] = {};
    const previous = childActivityRatings[week][pupilId][domainKey] || null;
    // Optimistic local update so the tap feels instant
    if(rating) childActivityRatings[week][pupilId][domainKey] = rating;
    else delete childActivityRatings[week][pupilId][domainKey];
    myClassRatingPopupKey = null;
    myClassRatingSaveError = '';
    renderMyClass();
    try{
      const res = await fetch('backend/assessment/activity/save_child_activity_rating.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, week_number: week, pupil_id: pupilId, domain_key: domainKey, rating: rating || null })
      });
      const data = await res.json();
      if(data.status !== 'success') throw new Error(data.message || 'Save failed');
    } catch(err){
      // Put back what the server actually has, and say so
      if(previous) childActivityRatings[week][pupilId][domainKey] = previous;
      else delete childActivityRatings[week][pupilId][domainKey];
      myClassRatingSaveError = 'Could not save that rating — it has been undone. Check your connection and try again.';
      renderMyClass();
    }
  }
  function myClassRatingCell(pupilId, domainKey, rating){
    const key = pupilId + '|' + domainKey;
    const isOpen = myClassRatingPopupKey === key;
    const badge = rating
      ? `<span onclick="toggleMyClassRatingPopup(${pupilId},'${domainKey}')" style="${gradeBtnStyle(rating, true, 26)}" title="${TIER_INFO[rating].n} — tap to change">${gradeBtnLabel(true, rating)}</span>`
      : `<span onclick="toggleMyClassRatingPopup(${pupilId},'${domainKey}')" class="dim" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; border:1px dashed #0b0b0b55;" title="Not rated — tap to rate">·</span>`;
    const popup = isOpen ? `
      <div style="position:absolute; top:30px; left:50%; transform:translateX(-50%); z-index:20; background:#fff; border:1px solid #0b0b0b33; border-radius:8px; padding:4px; display:flex; gap:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); white-space:nowrap;">
        ${['E','P','A'].map(t => `<span onclick="setChildActivityRating(${pupilId},'${domainKey}','${t}')" style="${gradeBtnStyle(t, t === rating, 26)}" title="${TIER_INFO[t].n}">${gradeBtnLabel(t === rating, t)}</span>`).join('')}
        ${rating ? `<span onclick="setChildActivityRating(${pupilId},'${domainKey}',null)" class="dim" style="cursor:pointer; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px; border:1px solid #0b0b0b22;" title="Clear rating">✕</span>` : ''}
      </div>` : '';
    return `<td style="text-align:center; position:relative;">${badge}${popup}</td>`;
  }
  // My Class now shows the families (renderMyClassFamilies, part 13).
  // The weekly activity grading below moved to Assessment → 🧒 Weekly
  // activities. Everything that refreshes it still calls renderMyClass(),
  // so this refreshes whichever of the two is on screen.
  function renderMyClass(){
    const mc = document.getElementById('myclass-body');
    if(mc && !mc.classList.contains('hidden')) renderMyClassFamilies();
    const ab = document.getElementById('assessment-body');
    if(ab && !ab.classList.contains('hidden') && assessmentEntryType === 'activity') renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  function renderWeeklyActivitySection(container){
    if(!ensurePupilsLoadedFor(container, renderMyClass)) return;
    const week = myClassWeek();
    const weekInfo = (typeof WEEKS !== 'undefined') ? WEEKS.find(w => w.w === week) : null;
    const firstWeek = (typeof WEEKS !== 'undefined' && WEEKS.length) ? WEEKS[0].w : 1;
    container.appendChild(mdSec('Weekly activity performance', '<span class="reqs">CG-3 · CG-4 · CG-8 · CG-9 · CG-10 · CG-11 · CG-12</span>'));
    // Week picker
    const picker = document.createElement('div');
    picker.style.cssText = 'display:flex; align-items:center; gap:10px; margin:0 0 12px; flex-wrap:wrap;';
    picker.innerHTML = `
      <button class="btn" ${week <= firstWeek ? 'disabled' : ''} onclick="shiftMyClassWeek(-1)">‹ Previous week</button>
      <div><b>Week ${week}</b>${weekInfo ? ` · ${esc(weekInfo.theme)} <span class="dim">(${esc(weekInfo.dates)})</span>` : ''}</div>
      <button class="btn" ${week >= currentWeekNum ? 'disabled' : ''} onclick="shiftMyClassWeek(1)">Next week ›</button>`;
    container.appendChild(picker);
    if(!myClassInfo.class_id){
      const msg = document.createElement('p'); msg.className = 'dim'; msg.textContent = 'Loading your class info…';
      container.appendChild(msg);
      return;
    }
    // Real session-done records for this week (for the "held" line under each domain)
    if(!myClassPlanFetchTried[week]){
      myClassPlanFetchTried[week] = true;
      Promise.resolve(ensureDailyPlanEntriesLoaded(false, week)).then(() => renderMyClass());
    }
    // Real ratings for this week
    const status = childActivityRatingsStatus[week];
    if(status === undefined){ fetchChildActivityRatings(week); }
    if(status === undefined || status === 'loading'){
      const msg = document.createElement('p'); msg.className = 'dim'; msg.textContent = 'Loading this week\'s ratings…';
      container.appendChild(msg);
      return;
    }
    if(status === 'error'){
      const wrap = document.createElement('div');
      wrap.innerHTML = '<p class="dim">Could not load this week\'s ratings from the server.</p><button class="btn">Retry</button>';
      wrap.querySelector('button').onclick = () => { delete childActivityRatingsStatus[week]; renderMyClass(); };
      container.appendChild(wrap);
      return;
    }
    if(myClassRatingSaveError){
      const err = document.createElement('p');
      err.style.cssText = 'color:#b42318; margin:0 0 8px;';
      err.textContent = myClassRatingSaveError;
      container.appendChild(err);
    }
    const weekRatings = childActivityRatings[week] || {};
    const heldDays = {};
    DOMAINS.forEach(d => {
      heldDays[d.key] = DAYS.filter(day => sessionDoneEntries[dailyPlanKey(week, day.key, d.key)]).length;
    });
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th>' +
      DOMAINS.map(d => `<th style="text-align:center; white-space:normal; min-width:84px;" title="${esc(broadCompetencyFallback(d.key))}">
        ${esc(d.label)}<br><span class="dim" style="font-weight:400; font-size:11px;">${esc(d.cg)} · ${heldDays[d.key] ? 'held ' + heldDays[d.key] + '/' + DAYS.length + ' days' : 'not marked held'}</span></th>`).join('') +
      '<th style="text-align:center;">Rated</th><th style="text-align:center;">P or A</th></tr></thead><tbody>';
    realPupilsCache.forEach(pupil => {
      const r = weekRatings[pupil.id] || {};
      const ratedCount = DOMAINS.filter(d => r[d.key]).length;
      const paCount = DOMAINS.filter(d => r[d.key] === 'P' || r[d.key] === 'A').length;
      table += `<tr>
        <td style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(pupil.name)}')"><b>${esc(pupil.name)}</b></td>
        ${DOMAINS.map(d => myClassRatingCell(pupil.id, d.key, r[d.key] || null)).join('')}
        <td style="text-align:center;">${ratedCount ? ratedCount + ' / ' + DOMAINS.length : '<span class="dim">Not yet rated</span>'}</td>
        <td style="text-align:center;">${ratedCount ? '<b>' + paCount + '</b> of ' + ratedCount : '<span class="dim">—</span>'}</td>
      </tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Rate each child once per activity area for the week: B Beginner · P Proficient · A Advanced. Tap a cell to rate; tap a name to open that child\'s full record. "Held" counts come from sessions marked done in My Day.', wrap));
    container.appendChild(assessmentReportsLink('myclass'));
  }
  // ---------- 2. CLASS PROGRESS ----------
  // Matches the real prototype's vTeacherProgress structure — same
  // tile set and the same B/P/A tier grid per child per domain. The
  // underlying SRI/CPI/ARI formulas and dumbbell/stack charts from the
  // original are NOT reproduced (they depend on a full assessment
  // history this app doesn't have yet) — tile numbers here are sample
  // data shaped to look the same, not the real formula output.
  // Internal tier code stays 'E' (touched by dozens of calculations in
  // Dashboard/Transition/Child Record/PDF export) — only what's shown
  // to a person changes, via .letter/.n below. Renaming the storage
  // code itself would mean re-verifying every one of those call sites;
  // this way the display changes everywhere at once, safely.
  const TIER_INFO = { E: {n:'Beginner', c:'crit', letter:'B'}, P: {n:'Proficient', c:'warn', letter:'P'}, A: {n:'Advanced', c:'good', letter:'A'} };
/* ===== teacher-part-04.js ===== */
/* =========================================================================
   teacher-part-04.js — part 4 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */
  // The real assessment domains (ASM screens) — 10 developmental
  // domains, DIFFERENT from the app's existing DOMAINS array (which is
  // the 8 time-of-day session slots for My Day/Daily Plan). Matches
  // the prototype's own column headers exactly: HEAL PHYS SENS ENVI
  // EMOT PART LOGI MATH LANG ARTS.
