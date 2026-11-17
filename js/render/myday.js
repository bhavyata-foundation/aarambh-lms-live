/* =========================================================================
   js/render/myday.js — the My Day screen itself: the teaching-day
   filter bar, tab bars, Homework tab, and renderMyDay() proper (today's
   sessions, attendance tiles, materials needed this week). Extracted
   from teacher.js's old SECTION 9.

   Same cross-file-sharing rule as every other split file: classic
   <script>, so top-level `function` is global automatically, but
   top-level `let`/`const` isn't shared across <script> tags.
   ========================================================================= */

  /* ===================== SECTION 9: MY DAY ===================== */

  // Moved to js/render/ui-helpers.js — esc, compressImageFile, renameFileTo,
  // f1, mdGrid, mdTile, mdPill, mdMeter, mdSec, mdCard, mdStatusBand all live
  // there now.


  // A representative material per domain, matching the "chip under each
  // session card" pattern in the reference design. This is only ever
  // used as placeholder/suggestion text when nothing's been planned —
  // stock status below now comes from the real imported TLM inventory,
  // never from an invented number.
  var MYDAY_DOMAIN_MATERIAL = {
    welcome:'Greeting song cards', story:'Story picture book', numeracy:'Counting beads, number cards',
    language:'Phonics flash cards', create:'Clay, crayons, paper', outdoor:'Hoops, bean bags',
    tidy:'Labelled storage trays', reflect:'Feelings faces chart'
  };

  var tlmInsightExpanded = false;
    // Term 1 is completed: nothing can be recorded. Recording controls are disabled; viewing stays open.
  function lockTerm1Recording(root){
    const VIEW = /materials|activities|overview|week|insights|my class|my day|term/i;
    const lock = () => {
      root.querySelectorAll('input, select, textarea, button').forEach(el => {
        if(el.closest('#portal-term-switch') || el.closest('.fbar') || el.closest('[data-term1-note]')) return;
        if(el.tagName === 'BUTTON' && VIEW.test(el.textContent || '')) return;
        el.disabled = true;
      });
    };
    lock();
    if(!root.__term1Observer){
      root.__term1Observer = new MutationObserver(lock);
      root.__term1Observer.observe(root, { childList: true, subtree: true });
    }
  }

function toggleTlmInsight(){
    tlmInsightExpanded = !tlmInsightExpanded;
    renderMyDay();
  }

  // Backs the Activities / Materials sub-tab inside My Day — a real
  // variable (not just DOM state), so it survives a re-render from
  // polling or a plan save, same reasoning as tlmInsightExpanded above.
  var myDayActiveSubTab = 'activities'; // 'activities' | 'materials'
  function switchMyDaySubTab(tab){
    myDayActiveSubTab = tab;
    renderMyDay();
  }

  // Backs the "Given plan and my plan, clubbed" overview table's
  // collapsed-by-default toggle — off by default since the session
  // cards below already show the same data in full; this is a denser
  // second view someone opens on purpose, not the main daily view.
  var clubbedOverviewExpanded = false;
  function toggleClubbedOverview(){
    clubbedOverviewExpanded = !clubbedOverviewExpanded;
    renderMyDay();
  }

  // Per-session card collapse state, keyed by the same dpKey
  // (dailyPlanKey) used for the plan data itself — so a session with a
  // saved plan opens expanded by default, an unplanned one starts
  // collapsed to just its header, and a manual toggle is remembered
  // for that specific day/week/session until the view moves on to a
  // different day or week (a new dpKey).
  var myDaySessionCardOpen = {}; // dpKey -> true/false
  function toggleSessionCardOpen(dpKey){
    myDaySessionCardOpen[dpKey] = !myDaySessionCardOpen[dpKey];
    renderMyDay();
  }

  // Strips punctuation and collapses whitespace so "Counting beads,
  // number cards" and "counting beads number cards" compare equal —
  // used by both the exact-match and fuzzy-match paths below.
  function normalizeMatName(s){
    return (s || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // Common short words that shouldn't count as a meaningful overlap on
  // their own (matching on "and" or "the" alone isn't a real signal).
  var MATNAME_STOPWORDS = new Set(['and','the','a','an','for','of','with','to']);

  // Looks up real stock by matching the material's name against
  // whatever's actually been imported/logged in TLM & Resources
  // (lastLoadedMaterials, via getMaterialsList/ensureMyDayMaterialsLoaded).
  //
  // Three tiers, in order:
  //   1. Exact match (normalized) — confident, matchType 'exact'.
  //   2. Fuzzy match — one normalized name contains the other as a
  //      substring, or they share a meaningful word (length > 2, not
  //      a stopword) — matchType 'fuzzy'. Shown to the teacher as a
  //      "Possible match" with the real inventory name alongside it,
  //      never presented as a confirmed match, since fuzzy matching
  //      can genuinely be wrong (e.g. "beads" could mean a different
  //      craft-beads item, not the counting beads).
  //   3. No match at all — matchType 'none'.
  //
  // "low stock" is never invented from a made-up threshold — it's
  // only ever "in stock", "damaged" (real item_condition), "distributed"
  // (real distributed flag), or "not found" when nothing imported
  // matches this name at all, even fuzzily.
  function stockInfoFor(materialName){
    if(!materialName) return {found: false, matchType: 'none', matchedName: null, issued: null, distributed: false, state: 'unknown'};
    const target = normalizeMatName(materialName);
    if(!target) return {found: false, matchType: 'none', matchedName: null, issued: null, distributed: false, state: 'unknown'};

    // Tier 1 — exact.
    let match = lastLoadedMaterials.find(m => normalizeMatName(m.item_name) === target);
    let matchType = match ? 'exact' : null;

    // Tier 2 — fuzzy, only attempted if no exact match exists.
    if(!match){
      const targetWords = target.split(' ').filter(w => w.length > 2 && !MATNAME_STOPWORDS.has(w));
      let bestScore = 0;
      lastLoadedMaterials.forEach(m => {
        const itemNorm = normalizeMatName(m.item_name);
        if(!itemNorm) return;
        let score = 0;
        // Substring either direction is a strong signal — e.g. "beads"
        // inside "counting beads number cards".
        if(target.length >= 3 && (itemNorm.includes(target) || target.includes(itemNorm))) score = 2;
        // Otherwise, any shared meaningful word is a weaker signal.
        if(score === 0 && targetWords.length){
          const itemWords = itemNorm.split(' ').filter(w => w.length > 2 && !MATNAME_STOPWORDS.has(w));
          if(targetWords.some(w => itemWords.includes(w))) score = 1;
        }
        if(score > bestScore){ bestScore = score; match = m; }
      });
      if(match) matchType = 'fuzzy';
    }

    if(!match) return {found: false, matchType: 'none', matchedName: null, issued: null, distributed: false, state: 'unknown'};
    const state = match.item_condition === 'damaged' ? 'damaged' : (match.distributed ? 'distributed' : 'ok');
    return {
      found: true, matchType, matchedName: match.item_name,
      issued: match.quantity != null ? match.quantity : null,
      distributed: !!match.distributed, state, source: match.supply_source || 'BMC'
    };
  }
  // Auto-detect today's real weekday instead of always defaulting to
  // Monday. Mon-Fri map straight onto DAYS[]/dayKeysArr indices; Sat/Sun
  // have no pupil session plan at all (children: Mon-Fri only), so on
  // those days we fall back to Friday internally (keeps every existing
  // dayKeysArr[myDayIndex] lookup safe) and flag it separately so
  // renderMyDay() can show a distinct weekend state instead of quietly
  // pretending it's Friday.
  function computeTodayMyDayIndex(){
    const dow = new Date().getDay(); // 0=Sun ... 6=Sat
    return (dow >= 1 && dow <= 5) ? (dow - 1) : null;
  }
  var todayMyDayIndex = computeTodayMyDayIndex();
  var myDayIndex = todayMyDayIndex === null ? 4 : todayMyDayIndex; // 0=mon ... matches DAYS[] order
  var myDayIsNonTeachingToday = (todayMyDayIndex === null); // true on Sat/Sun
  var myDayManuallySelected = false; // set true once the teacher taps a day chip

  // ---- Shared with Daily Plan: these read the SAME dailyPlanEntries data
  // Daily Plan writes to, so My Day's stats genuinely reflect whatever the
  // teacher has actually planned — not a separate, disconnected number. ----
  function countPlannedSessionsForDay(weekNum, dayKey){
    return DOMAINS.filter(d => {
      const key = dailyPlanKey(weekNum, dayKey, d.key);
      return dailyPlanEntries[key] && dailyPlanEntries[key].text.trim();
    }).length;
  }

  function countCustomSessionsForDay(weekNum, dayKey){
    return DOMAINS.filter(d => {
      const key = dailyPlanKey(weekNum, dayKey, d.key);
      return dailyPlanEntries[key] && dailyPlanEntries[key].text.trim() && !dailyPlanEntries[key].usedSuggestion;
    }).length;
  }

  function computeWeekCompliancePct(weekNum){
    const dayKeysArr = ['mon','tue','wed','thu','fri'];
    let totalPlanned = 0;
    dayKeysArr.forEach(dk => { totalPlanned += countPlannedSessionsForDay(weekNum, dk); });
    return (totalPlanned / (dayKeysArr.length * DOMAINS.length)) * 100;
  }

  // ---------------------------------------------------------
  // SHARED FILTER BAR — School/Division/Academic Year/Week, the same
  // chrome the real prototype shows at the top of every teacher screen.
  // Previously this only existed inside renderMyDay() — an oversight,
  // not a deliberate choice, since every other screen built afterward
  // never got it. Now every screen calls this the same way.
  //
  // School/Division/Academic Year are read-only (a real teacher only
  // ever has the one they're assigned to); Week is real and functional
  // — changing it re-renders whichever screen is currently open via
  // onWeekChange, so switching weeks works consistently everywhere,
  // not just on My Day/Daily Plan.
  // ---------------------------------------------------------
  var SELECT_STYLE = "padding:6px 28px 6px 10px !important; border:1px solid #0b0b0b33 !important; border-radius:6px !important; background-color:#fff !important; background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path d=%22M1 1l4 4 4-4%22 stroke=%22%2352514e%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>') !important; background-repeat:no-repeat !important; background-position:right 10px center !important; background-size:10px 6px !important; -webkit-appearance:none !important; -moz-appearance:none !important; appearance:none !important; cursor:pointer !important; font-size:13px !important; color:#0b0b0b !important; display:inline-block !important;";

  // School/Division/Academic Year were removed from the filter bar
  // below — a teacher only ever sees her own school and class via her
  // login, so "selecting" one was always cosmetic (no onchange, never
  // scoped any real data). Week stays: it's genuinely functional
  // (curriculum content actually varies by week).

  function renderTeacherFilterBar(container, onWeekChange){
    const filterBar = document.createElement('div'); filterBar.className = 'fbar';
    filterBar.innerHTML = `
      <div class="ctl"><label>Week</label><select id="filterBarWeekSelect" style="${SELECT_STYLE} min-width:220px !important;"></select></div>
    `;
    container.appendChild(filterBar);
    if((window.getPortalTerm ? window.getPortalTerm() : 1) === 1){
      const note = document.createElement('div');
      note.setAttribute('data-term1-note', '1');
      note.style.cssText = 'margin:0 0 14px; padding:12px 16px; border:1px solid #E0A800; background:#FFF8E1; border-radius:12px; color:#5C4300; font-size:14px; font-weight:600;';
      note.textContent = 'Term 1 is completed. You can look at the Term 1 weeks, but nothing can be recorded for Term 1.';
      container.appendChild(note);
      lockTerm1Recording(container);
    }

    const weekSel = filterBar.querySelector('#filterBarWeekSelect');
    // The term comes from the switch at the top of the portal. Term 1 = Weeks 1–20, Term 2 = Weeks 21–36.
    const portalTerm = (window.getPortalTerm ? window.getPortalTerm() : 1);
    const termWeeks = WEEKS.filter(wk => (wk.w <= 20 ? 1 : 2) === portalTerm);
    if(termWeeks.length && !termWeeks.some(wk => wk.w === currentWeekNum)) currentWeekNum = termWeeks[termWeeks.length - 1].w;
    termWeeks.forEach(wk => {
      const opt = document.createElement('option');
      opt.value = wk.w; opt.textContent = 'Week ' + wk.w + ' — ' + wk.theme;
      if(wk.w === currentWeekNum) opt.selected = true;
      weekSel.appendChild(opt);
    });
        weekSel.onchange = () => { currentWeekNum = parseInt(weekSel.value, 10); onWeekChange(); };

    // Honest warning if today falls after the last week added to WEEKS,
    // instead of silently showing that old week as if it were this week.
    const lastWeek = WEEKS[WEEKS.length - 1];
    if(lastWeek){
      const lastEnd = parseWeekStartDate(lastWeek.dates);
      lastEnd.setDate(lastEnd.getDate() + 4); // Friday of that week
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if(today > lastEnd){
        const warn = document.createElement('p');
        warn.style.cssText = 'margin:8px 0 0; color:#b54708; font-size:13px;';
        warn.textContent = '\u26a0 No week has been added for today (' + today.toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}) + '). The latest week available is Week ' + lastWeek.w + ' (' + lastWeek.dates + ').';
        filterBar.appendChild(warn);
      }
    }
    return filterBar;
  }

  // Training-session alert on My Day — checks the real events backend

  // Training-session alert on My Day — checks the real events backend
  // for any Teacher Training / Workshop scheduled in the next 7 days
  // at this teacher's school, and shows a banner if there is one.
  // Doesn't block rendering the rest of My Day — fires and updates the
  // banner slot once the fetch resolves, same pattern as everything
  // else in this app that reads from the real backend.
  async function renderTrainingAlertBanner(container){
    const slot = document.createElement('div');
    slot.id = 'trainingAlertSlot';
    container.appendChild(slot);
    try{
      const params = new URLSearchParams(window.location.search);
      if(myClassInfo && myClassInfo.school_id) params.set('school_id', myClassInfo.school_id);
      const res = await fetch('backend/get_events.php?' + params.toString());
      const data = await res.json();
      if(data.status !== 'success') return;
      const today = new Date(); today.setHours(0,0,0,0);
      const weekAhead = new Date(today); weekAhead.setDate(weekAhead.getDate() + 7);
      const upcoming = (data.events || []).filter(e => {
        if(e.event_type === 'PTM') return false; // PTM has its own dedicated screen already
        const d = new Date(e.event_date + 'T00:00:00');
        return d >= today && d <= weekAhead;
      }).sort((a, b) => {
        // A training still needing her response jumps to the front,
        // ahead of ones already confirmed — that's the one actually
        // asking something of her right now.
        const aPending = a.status === 'proposed' ? 0 : 1;
        const bPending = b.status === 'proposed' ? 0 : 1;
        if(aPending !== bPending) return aPending - bPending;
        return a.event_date.localeCompare(b.event_date);
      });
      if(!upcoming.length) return;
      const next = upcoming[0];
      const daysAway = Math.round((new Date(next.event_date + 'T00:00:00') - today) / 86400000);
      const whenLabel = daysAway === 0 ? 'today' : daysAway === 1 ? 'tomorrow' : 'in ' + daysAway + ' days';
      const isPending = next.status === 'proposed';
      slot.innerHTML = `<div class="banner-success ${isPending ? 'pending' : ''}" style="margin-bottom:16px; ${isPending ? 'flex-direction:column; align-items:flex-start; gap:8px;' : ''}">
        <div>📢 <b>${esc(next.event_type)}: ${esc(next.title)}</b> — ${whenLabel}${next.event_time ? ' · ' + esc(next.event_time) : ''}${next.notes ? ' · ' + esc(next.notes) : ''}</div>
        ${isPending ? `
          <div style="display:flex; gap:8px;">
            <span style="font-size:13px; color:var(--text-muted);">Can you make it?</span>
            <button class="chip" onclick="respondToTraining(${next.id}, 'confirmed')">Yes, confirm</button>
            <button class="chip" onclick="respondToTraining(${next.id}, 'declined')">Can't make it</button>
          </div>` : ''}
      </div>`;
    } catch(err){ /* fails quietly — My Day works fine with no alert shown */ }
  }

  async function respondToTraining(eventId, response){
    try{
      await fetch('backend/respond_to_training.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ event_id: eventId, response })
      });
    } catch(err){ /* fall through — re-render shows the real current state regardless */ }
    const slot = document.getElementById('trainingAlertSlot');
    if(slot && slot.parentNode){
      const parent = slot.parentNode;
      slot.remove();
      renderTrainingAlertBanner(parent);
    }
  }

  // ---------------------------------------------------------------
  // Shared horizontal tab bar for My Day / My Class — both now live
  // under one sidebar item (Teaching → My Day) and switch between
  // each other as in-page tabs instead of separate sidebar
  // destinations. Each screen still has its own real div and render
  // function (myday-body/renderMyDay, myclass-body/renderMyClass) —
  // this just prepends the same tab strip to whichever one is
  // currently visible, driving the same switchSidebarSection routing
  // that already exists. AI Assistance no longer has its own tab here
  // — it's still reachable from inside My Day via the "Open AI
  // Assistance" pointer card, and renderAIAssistance() itself is
  // untouched.
  // ---------------------------------------------------------------
  function renderTeachingTabBar(activeTab){
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap;';
    const tabs = [
      { key: 'myday', label: '▦ My Day' },
      { key: 'myclass', label: '☰ My Class' },
    ];
    tabs.forEach(t => {
      const active = t.key === activeTab;
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.cssText = `padding:8px 16px; border-radius:20px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:13px; font-weight:600; cursor:pointer;`;
      btn.onclick = () => switchSidebarSection(t.key);
      bar.appendChild(btn);
    });
    return bar;
  }

  // Same pattern as renderTeachingTabBar above — Monthly Effective, My
  // Compliance, and Flags & Notifications now share one sidebar item
  // (Effective → Monthly Effective) and switch between each other as
  // in-page tabs. Each keeps its own real div and render function;
  // this just prepends the same tab strip to whichever is visible.
  function renderEffectiveTabBar(activeTab){
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap;';
    const tabs = [
      { key: 'monthlyeffective', label: '⇧ Monthly Effective' },
      { key: 'mycompliance', label: '⇧ My Compliance' },
      { key: 'flagsnotifications', label: '! Flags & Notifications' }
    ];
    tabs.forEach(t => {
      const active = t.key === activeTab;
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.cssText = `padding:8px 16px; border-radius:20px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:13px; font-weight:600; cursor:pointer;`;
      btn.onclick = () => switchSidebarSection(t.key);
      bar.appendChild(btn);
    });
    return bar;
  }

  // Same pattern again — Class Attendance and Attendance Records now
  // share one sidebar item (Attendance → Class Attendance) and switch
  // between each other as in-page tabs.
  function renderAttendanceTabBar(activeTab){
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap;';
    const tabs = [
      { key: 'classattendance', label: '🗓️ Class Attendance' },
      { key: 'attendancehub', label: '🗓️ Attendance Records' }
    ];
    tabs.forEach(t => {
      const active = t.key === activeTab;
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.cssText = `padding:8px 16px; border-radius:20px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:13px; font-weight:600; cursor:pointer;`;
      btn.onclick = () => switchSidebarSection(t.key);
      bar.appendChild(btn);
    });
    return bar;
  }

  // Same pattern again — Family & Parents, PTM Schedule & Agenda, and
  // Parent Volunteers now share one sidebar item (Parents → Family &
  // Parents) and switch between each other as in-page tabs.
  function renderParentsTabBar(activeTab){
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap;';
    const tabs = [
      { key: 'familyparents', label: '👪 Family & Parents' },
      { key: 'ptm', label: '◎ PTM Schedule & Agenda' },
      { key: 'volunteers', label: '🤝 Parent Volunteers' },
      { key: 'homework', label: '📝 Homework' }
    ];
    tabs.forEach(t => {
      const active = t.key === activeTab;
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.cssText = `padding:8px 16px; border-radius:20px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:13px; font-weight:600; cursor:pointer;`;
      btn.onclick = () => switchSidebarSection(t.key);
      bar.appendChild(btn);
    });
    return bar;
  }

  // ---------------------------------------------------------------
  // HOMEWORK — a real, backend-backed whole-class assignment list.
  // Not per-pupil (every child gets the same assignment); an optional
  // photo/worksheet attaches via the same Drive upload pipeline
  // Materials and Admissions already use (compressImageFile +
  // renameFileTo before upload_to_drive.php), just under its own
  // 'Homework' Drive folder.
  // ---------------------------------------------------------------
  var homeworkRecords = []; // real rows, once fetched
  var homeworkFetchStatus = 'idle'; // 'idle' | 'loading' | 'loaded' | 'error:<message>'
  var homeworkDriveFileId = '', homeworkDriveLink = ''; // holds whatever's been uploaded for the form currently being filled in, until Save

  async function ensureHomeworkLoaded(){
    if(homeworkFetchStatus !== 'idle') return;
    if(!myClassInfo.class_id){ homeworkFetchStatus = 'idle'; return; } // class info not loaded yet — try again once loadMyClassInfo() resolves and re-renders
    homeworkFetchStatus = 'loading';
    try{
      const params = new URLSearchParams({ class_id: myClassInfo.class_id });
      const res = await fetch('backend/get_homework.php?' + params.toString() + (window.location.search ? '&' + window.location.search.slice(1) : ''));
      const data = await res.json();
      if(data.status === 'success'){
        homeworkRecords.length = 0;
        homeworkRecords.push(...(data.homework || []));
        homeworkFetchStatus = 'loaded';
      } else {
        homeworkFetchStatus = 'error:' + (data.message || 'Could not load homework.');
      }
    } catch(err){
      homeworkFetchStatus = 'error:Could not reach the server.';
    }
    if(document.getElementById('homework-body') && !document.getElementById('homework-body').classList.contains('hidden')) renderHomework();
  }

  async function handleHomeworkFileSelected(inputEl){
    const label = document.getElementById('homeworkAttachLabel');
    const file = inputEl.files && inputEl.files[0];
    if(!label || !file) return;
    const titleEl = document.getElementById('homeworkTitleInput');
    const title = (titleEl && titleEl.value.trim()) || 'Homework';

    label.textContent = 'Uploading to Google Drive…';
    const compressedFile = renameFileTo(await compressImageFile(file), title);
    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('folder_path', 'Homework');

    try{
      const res = await fetch('backend/upload_to_drive.php' + window.location.search, { method: 'POST', body: formData });
      const data = await res.json();
      if(data.status === 'success'){
        homeworkDriveFileId = data.file_id;
        homeworkDriveLink = data.link;
        label.textContent = '✓ ' + compressedFile.name + ' — tap to replace';
      } else {
        label.textContent = data.message || 'Upload failed — tap to try again';
      }
    } catch(err){
      label.textContent = 'Could not reach the server — tap to try again';
    }
  }

  async function saveNewHomework(){
    const titleEl = document.getElementById('homeworkTitleInput');
    const descEl = document.getElementById('homeworkDescInput');
    const dueEl = document.getElementById('homeworkDueInput');
    const resultEl = document.getElementById('homeworkSaveResult');
    const title = (titleEl.value || '').trim();
    if(!title){ resultEl.innerHTML = '<div class="au-error">A title is required.</div>'; return; }

    resultEl.innerHTML = '<p class="sub">Saving…</p>';
    try{
      const res = await fetch('backend/add_homework.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          title, description: (descEl.value || '').trim(), due_date: dueEl.value || '',
          drive_file_id: homeworkDriveFileId, drive_link: homeworkDriveLink
        })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Could not save.')}</div>`;
        return;
      }
      // Reset the form for the next assignment.
      titleEl.value = ''; descEl.value = ''; dueEl.value = '';
      homeworkDriveFileId = ''; homeworkDriveLink = '';
      homeworkFetchStatus = 'idle'; // force a real refetch so the new row's real id/created_at come from the server, not guessed
      alert('Homework assigned to the whole class.');
      renderHomework();
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }

  async function deleteHomework(homeworkId){
    if(!confirm('Delete this homework assignment? This cannot be undone.')) return;
    try{
      const res = await fetch('backend/delete_homework.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ homework_id: homeworkId })
      });
      const data = await res.json();
      if(data.status !== 'success'){ alert(data.message || 'Could not delete.'); return; }
      homeworkFetchStatus = 'idle';
      renderHomework();
    } catch(err){
      alert('Could not reach the server.');
    }
  }

  // Real WhatsApp Business API doesn't support posting into a REGULAR
  // group at all (it only sends individual template messages to
  // opted-in numbers) — this school uses an ordinary group, not a
  // Business API setup, so automated posting genuinely isn't possible
  // here. This is the honest alternative: pre-fill the message via
  // WhatsApp's own wa.me share link (no API, no account, no cost) —
  // WhatsApp opens with the text ready, the teacher picks her class
  // group herself and taps send. wa.me can't target a specific group
  // directly (only individual contacts), so that one tap stays manual.
  function shareHomeworkToWhatsApp(homeworkId){
    const hw = homeworkRecords.find(h => h.id === homeworkId);
    if(!hw) return;
    const dueStr = hw.due_date ? new Date(hw.due_date + 'T00:00:00').toLocaleDateString([], {day:'numeric', month:'short', year:'numeric'}) : null;
    let msg = `📝 Homework: ${hw.title}\n`;
    if(dueStr) msg += `Due: ${dueStr}\n`;
    if(hw.description) msg += `\n${hw.description}\n`;
    if(hw.drive_link) msg += `\nWorksheet: ${hw.drive_link}\n`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  }

  function renderHomework(){
    const container = document.getElementById('homework-body');
    container.innerHTML = '';
    container.appendChild(renderParentsTabBar('homework'));
    ensureHomeworkLoaded();

    container.appendChild(mdSec('Assign homework', '<span class="reqs">HW-01</span>'));
    const note = document.createElement('p');
    note.className = 'cap'; note.style.margin = '4px 0 14px';
    note.textContent = 'One assignment for the whole class — every child gets the same homework, same as how materials are logged for the class as a whole.';
    container.appendChild(note);

    const formWrap = document.createElement('div');
    formWrap.className = 'card';
    formWrap.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div>
          <label style="font-size:11px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; display:block; margin-bottom:4px;">Title</label>
          <input type="text" id="homeworkTitleInput" placeholder="e.g. Count 1–10 with objects at home" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;" />
        </div>
        <div>
          <label style="font-size:11px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; display:block; margin-bottom:4px;">Description</label>
          <textarea id="homeworkDescInput" placeholder="What should the child (and parent) do?" style="width:100%; min-height:70px; padding:8px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px; resize:vertical;"></textarea>
        </div>
        <div style="display:flex; gap:14px; flex-wrap:wrap;">
          <div style="flex:1; min-width:160px;">
            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; display:block; margin-bottom:4px;">Due date</label>
            <input type="date" id="homeworkDueInput" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;" />
          </div>
          <div style="flex:2; min-width:220px;">
            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; display:block; margin-bottom:4px;">Photo or worksheet (optional)</label>
            <label id="homeworkAttachLabel" style="display:flex; align-items:center; gap:8px; padding:8px 10px; border:1px dashed var(--border); border-radius:6px; font-size:12.5px; cursor:pointer; color:var(--text-muted);">
              + Add a photo or scan
              <input type="file" accept="image/*,application/pdf" style="display:none;" onchange="handleHomeworkFileSelected(this)" />
            </label>
          </div>
        </div>
        <div id="homeworkSaveResult"></div>
        <button class="btn-primary" style="width:auto; padding:9px 18px; align-self:flex-start;" onclick="saveNewHomework()">Assign homework</button>
      </div>
    `;
    container.appendChild(formWrap);

    container.appendChild(mdSec('Assigned so far', '<span class="reqs">HW-02</span>'));
    if(homeworkFetchStatus === 'loading' || homeworkFetchStatus === 'idle'){
      container.appendChild(mdCard(null, 'Loading homework…', null));
    } else if(typeof homeworkFetchStatus === 'string' && homeworkFetchStatus.startsWith('error:')){
      container.appendChild(mdCard(null, homeworkFetchStatus.slice(6), null));
    } else if(!homeworkRecords.length){
      container.appendChild(mdCard(null, 'Nothing assigned yet — use the form above.', null));
    } else {
      const list = document.createElement('div');
      list.style.cssText = 'display:flex; flex-direction:column; gap:10px;';
      homeworkRecords.forEach(hw => {
        const dueStr = hw.due_date ? new Date(hw.due_date + 'T00:00:00').toLocaleDateString([], {day:'numeric', month:'short', year:'numeric'}) : null;
        const card = document.createElement('div');
        card.className = 'card'; card.style.padding = '14px 16px';
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
            <div>
              <b>${esc(hw.title)}</b>
              ${dueStr ? `<div class="cap" style="margin-top:2px;">Due ${esc(dueStr)}</div>` : ''}
              ${hw.description ? `<p style="margin:8px 0 0; font-size:13px;">${esc(hw.description)}</p>` : ''}
              ${hw.drive_link ? `<a class="chip" href="${esc(hw.drive_link)}" target="_blank" rel="noopener" style="display:inline-block; margin-top:8px;">📎 View attachment</a>` : ''}
              <button style="display:inline-block; margin-top:8px; margin-left:8px; padding:5px 10px; border-radius:6px; border:1px solid var(--border); background:#fff; color:#25D366; font-size:11.5px; font-weight:600; cursor:pointer;" onclick="shareHomeworkToWhatsApp(${hw.id})">💬 Share to WhatsApp</button>
            </div>
            <button style="padding:5px 10px; border-radius:6px; border:1px solid var(--border); background:#fff; color:var(--danger,#c8433f); font-size:11.5px; cursor:pointer; white-space:nowrap;" onclick="deleteHomework(${hw.id})">Delete</button>
          </div>
        `;
        list.appendChild(card);
      });
      container.appendChild(list);
    }
  }

  var evidencePruneCheckedThisLoad = false; // only check once per page load — this hits the Drive API once per file, not something to repeat on every render

  async function pruneDeletedEvidenceFiles(){
    if(evidencePruneCheckedThisLoad) return;
    evidencePruneCheckedThisLoad = true;
    const fileIds = [];
    Object.values(uploadedEvidenceRecords).forEach(list => list.forEach(ev => { if(ev.driveFileId) fileIds.push(ev.driveFileId); }));
    if(!fileIds.length) return;
    const existing = await checkDriveFilesStillExist(fileIds);
    if(existing === null) return; // check itself failed — don't assume anything's deleted
    let changed = false;
    Object.keys(uploadedEvidenceRecords).forEach(key => {
      const before = uploadedEvidenceRecords[key].length;
      uploadedEvidenceRecords[key] = uploadedEvidenceRecords[key].filter(ev => !ev.driveFileId || existing.has(ev.driveFileId));
      if(uploadedEvidenceRecords[key].length !== before) changed = true;
    });
    if(changed){
      saveUploadedEvidenceRecords();
      if(document.getElementById('myday-body') && !document.getElementById('myday-body').classList.contains('hidden')) renderMyDay();
    }
  }

  // ---------------------------------------------------------------
  // CARRIED-OVER HOLIDAY SESSIONS — if the school day immediately
  // before the one currently being viewed was a declared holiday, any
  // session planned for that holiday day but never marked done shows
  // here too, so it isn't silently lost. Marking one done from here
  // goes through the SAME toggleSessionDone() as everywhere else — it
  // still prompts for/records the real covered date into
  // domain_completion, exactly as if she'd marked it done from the
  // holiday day's own view. This only ever ADDS to the currently
  // viewed day; it never moves or renumbers anything else in the week.
  // ---------------------------------------------------------------
  function collectCarriedOverHolidaySessions(weekNum, viewedDayKey){
    const dayKeysArr = ['mon','tue','wed','thu','fri'];
    const viewedIdx = dayKeysArr.indexOf(viewedDayKey);
    const carried = []; // {dayKey, domainKey, domainLabel, text, holidayName}
    if(viewedIdx <= 0) return carried; // Monday has no earlier day in this same week to look back to
    for(let i = viewedIdx - 1; i >= 0; i--){
      const dk = dayKeysArr[i];
      const holidayName = holidayNameForWeekDay(weekNum, dk);
      if(!holidayName) break; // stop at the first real (non-holiday) day walking backward
      DOMAINS.forEach(d => {
        const key = dailyPlanKey(weekNum, dk, d.key);
        const entry = dailyPlanEntries[key];
        if(entry && entry.text && entry.text.trim() && !sessionDoneEntries[key]){
          carried.push({ dayKey: dk, domainKey: d.key, domainLabel: d.label, text: entry.text, holidayName });
        }
      });
    }
    return carried;
  }

  // ---------------------------------------------------------------
  // HOLIDAY BANNER — when the day currently being viewed is itself a
  // declared holiday, say so plainly instead of showing empty/planned
  // session cards as if it were a normal teaching day. This is purely
  // informational here; completing the actual work happens the
  // following day via renderCarriedOverHolidayBanner() below, which
  // is what actually records the real covered date.
  // ---------------------------------------------------------------
  function renderViewedDayHolidayBanner(container, weekNum, viewedDayKey){
    const holidayName = holidayNameForWeekDay(weekNum, viewedDayKey);
    if(!holidayName) return;
    const banner = document.createElement('div');
    banner.className = 'card';
    banner.style.cssText = 'padding:16px 18px; margin-bottom:20px; background:#fdf3e3; border-color:#EE8F35;';
    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:20px;">🎉</span>
        <div>
          <b>This day is a declared holiday — ${esc(holidayName)}</b>
          <p class="cap" style="margin:4px 0 0;">No teaching happened today. Any sessions planned for today that weren't taught will show up on the following day's My Day for you to mark as done there, with the real date it was actually covered.</p>
        </div>
      </div>
    `;
    container.appendChild(banner);
  }

  // ---------------------------------------------------------------
  // Renders the actual list of un-done sessions carried over from a
  // preceding holiday day (see collectCarriedOverHolidaySessions
  // above), each with a "Mark done" button. Kept as its own function,
  // separate from renderViewedDayHolidayBanner above — the two used to
  // be accidentally merged into one broken function whose second half
  // (this part) referenced variables that were never in scope, which
  // silently crashed renderMyDay() every time either banner tried to
  // render, before the Mon–Fri day chips ever got populated.
  // ---------------------------------------------------------------
  function renderCarriedOverHolidayBanner(container, weekNum, viewedDayKey){
    const carried = collectCarriedOverHolidaySessions(weekNum, viewedDayKey);
    if(!carried.length) return;
    const dayLabelFor = { mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday' };
    container.appendChild(mdSec('Carried over from a holiday', '<span class="reqs">not yet marked done</span>'));
    const note = document.createElement('p');
    note.className = 'cap'; note.style.margin = '4px 0 14px';
    note.textContent = 'These sessions were planned for a day that turned out to be a holiday and were never marked done — mark them done here if you actually taught them today.';
    container.appendChild(note);

    const list = document.createElement('div');
    list.style.cssText = 'display:flex; flex-direction:column; gap:10px; margin-bottom:24px;';
    carried.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card'; card.style.padding = '14px 16px';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
          <div>
            <b>${esc(item.domainLabel)}</b>
            <span class="cap" style="margin-left:8px;">${esc(dayLabelFor[item.dayKey])} · ${esc(item.holidayName)}</span>
            <p style="margin:6px 0 0; font-size:13px;">${esc(item.text)}</p>
          </div>
          <button class="btn-primary" style="width:auto; padding:7px 14px; white-space:nowrap;" onclick="toggleSessionDone(${weekNum}, '${item.dayKey}', '${item.domainKey}')">✓ Mark done</button>
        </div>
      `;
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  function renderMyDay(){
    const container = document.getElementById('myday-body');
    container.innerHTML = '';
    document.getElementById('week-body').classList.add('hidden'); // the old curriculum browser stays unreachable — this screen's own Week/Day selectors already cover the same ground

    container.appendChild(renderTeachingTabBar('myday'));
    pruneDeletedEvidenceFiles(); // background check — self-corrects via re-render above if anything's actually gone
    if(typeof ensureDailyPlanEntriesLoaded === 'function') ensureDailyPlanEntriesLoaded(); // real backend sync — see js/render/daily-plan-sync.js
    if(typeof ensureStudentHolidaysLoaded === 'function') ensureStudentHolidaysLoaded(); // real backend sync — see js/data/pupil-attendance.js

    const heading = document.createElement('div');
    heading.style.cssText = 'display:flex; align-items:baseline; gap:10px; margin-bottom:2px;';
    heading.innerHTML = `<h2 style="margin:0; font-family:var(--disp);">My Day</h2><span class="reqs">LPC · TLM · AIR</span>`;
    container.appendChild(heading);

    const dayKeysArr = ['mon','tue','wed','thu','fri'];
    const dayLabels = ['Mon','Tue','Wed','Thu','Fri'];
    const currentDayKey = dayKeysArr[myDayIndex];
    const done = countPlannedSessionsForDay(currentWeekNum, currentDayKey);
    const weekPct = computeWeekCompliancePct(currentWeekNum);
    const customCount = countCustomSessionsForDay(currentWeekNum, currentDayKey);
    // Real numbers now, not hardcoded — reads the exact same
    // attendanceRecords data the Attendance hub's "Enter" tab writes
    // to, so marking students there actually changes what shows here.
    // Fire a background fetch if today's month hasn't been loaded yet
    // (e.g. My Day is the very first screen opened this session) —
    // fetchAttendanceMonth re-renders My Day automatically once it resolves.
    const todayForStat = new Date();
    if(attendanceMonthStatus[todayForStat.getFullYear() + '-' + todayForStat.getMonth()] === undefined){
      fetchAttendanceMonth(todayForStat.getFullYear(), todayForStat.getMonth());
    }
    const todaysRecords = attendanceRecords[todayKey()] || {};
    const markedTotal = Object.keys(todaysRecords).length;
    const classPresent = markedTotal ? Object.values(todaysRecords).filter(s => s === 'present').length : 0;
    const classTotal = assessmentPupilNames().length;
    // Real now, not hardcoded — same computeComplianceStatsForMonth this
    // month's Monthly Effective screen reads, backed by the real
    // teacher_attendance table via getMonthAttendanceRecords/
    // fetchTeacherAttendanceMonth (enterTeacherFlow already warms this
    // month's cache at load, so this is usually already populated by
    // the time My Day renders).
    const myAttendanceStats = computeComplianceStatsForMonth(todayForStat.getFullYear(), todayForStat.getMonth());
    const myAttendancePct = myAttendanceStats.myAttendancePct;
    const todaysOwnRecord = getTodayAttendanceRecord();
    const myAttendancePillLabel = todaysOwnRecord
      ? (todaysOwnRecord.status === 'present'
          ? 'Marked present' + (todaysOwnRecord.markedAt ? ' ' + new Date(todaysOwnRecord.markedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '')
          : 'Marked absent today')
      : 'Not marked yet';
    const w = WEEKS.find(x => x.w === currentWeekNum) || WEEKS[0];

    renderTeacherFilterBar(container, renderMyDay);
    renderTrainingAlertBanner(container);


        container.appendChild(mdGrid('g2', [
      mdTile('Sessions confirmed', done + ' of ' + DOMAINS.length, '',
        mdPill(mdStatusBand(done/DOMAINS.length*100, 100, 75).l, mdStatusBand(done/DOMAINS.length*100, 100, 75).c),
        'One tap per session', mdMeter(done/DOMAINS.length*100, done===DOMAINS.length ? 'good' : 'warn')),
      mdTile('Week compliance', f1(weekPct), '%',
        mdPill(mdStatusBand(weekPct).l, mdStatusBand(weekPct).c) + mdPill(customCount + ' custom today', 'info'),
        'delivered ÷ planned', mdMeter(weekPct))
    ]));

    const dayBar = document.createElement('div'); dayBar.className = 'fbar'; dayBar.style.cssText = 'margin-top:20px; margin-bottom:28px;';
    dayBar.innerHTML = '<div class="ctl"><label>Teaching day</label><div style="display:flex;gap:5px" id="mdDayChips"></div></div>';
    container.appendChild(dayBar);
    const dc = document.getElementById('mdDayChips');
    dayLabels.forEach((dn, i) => {
      const b = document.createElement('button');
      b.className = 'chip' + (i === myDayIndex ? ' sel' : '');
      // Real calendar date under each day label, same "Monday\n06 Jul"
      // style the source Weekly Activity Completion sheets use — not
      // just an abstract Mon/Tue/Wed with no year/date context.
      const realDate = getRealDateForWeekDay(currentWeekNum, dayKeysArr[i]);
      const dateLabel = realDate ? realDate.toLocaleDateString([], {day:'2-digit', month:'short'}) : '';
      b.innerHTML = `${esc(dn)}${dateLabel ? `<br><span style="font-size:9.5px; opacity:.75;">${esc(dateLabel)}</span>` : ''}`;
      b.style.lineHeight = '1.3';
      b.onclick = () => { myDayIndex = i; myDayManuallySelected = true; renderMyDay(); };
      dc.appendChild(b);
    });
    renderViewedDayHolidayBanner(container, currentWeekNum, currentDayKey);
    renderCarriedOverHolidayBanner(container, currentWeekNum, currentDayKey);

    const weekPlan = WEEKLY_PLAN['wk' + currentWeekNum] || {};
    const dayKey = dayKeysArr[myDayIndex];
    const showWeekendState = myDayIsNonTeachingToday && !myDayManuallySelected;

    // ---- Activities / Materials sub-tab — the clubbed overview table
    // and session cards live under "Activities"; the weekly materials
    // list lives under "Materials", so the two don't blend into one
    // very long page. AI pointer, Coverage & Analysis and the footer
    // legend stay visible below both tabs regardless, since they're
    // general/summary content that doesn't belong to just one of the two.
    const subTabBar = document.createElement('div');
    subTabBar.style.cssText = 'display:flex; gap:8px; margin:16px 0 20px; flex-wrap:wrap;';
    [
      { key: 'activities', label: '📋 Activities & Overview' },
      { key: 'materials', label: '🧰 Materials' }
    ].forEach(t => {
      const active = t.key === myDayActiveSubTab;
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.cssText = `padding:9px 18px; border-radius:20px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:13px; font-weight:600; cursor:pointer;`;
      btn.onclick = () => switchMyDaySubTab(t.key);
      subTabBar.appendChild(btn);
    });
    container.appendChild(subTabBar);

    const activitiesTabPanel = document.createElement('div');
    activitiesTabPanel.className = myDayActiveSubTab === 'activities' ? '' : 'hidden';
    container.appendChild(activitiesTabPanel);
    const materialsTabPanel = document.createElement('div');
    materialsTabPanel.className = myDayActiveSubTab === 'materials' ? '' : 'hidden';
    container.appendChild(materialsTabPanel);

    if(showWeekendState){
      const todayNice = new Date().toLocaleDateString([], {weekday:'long', day:'numeric', month:'long'});
      const weekendPanel = document.createElement('div');
      weekendPanel.className = 'per';
      weekendPanel.style.cssText = 'text-align:center; padding:40px 24px; margin-top:20px;';
      weekendPanel.innerHTML = `
        <div style="font-size:32px; line-height:1;">🗓️</div>
        <h3 style="margin:14px 0 6px;">No pupil sessions today</h3>
        <p class="cap" style="max-width:420px; margin:0 auto;">${esc(todayNice)} \u2014 children attend Monday to Friday, so there's no daily session plan for today. Pick a weekday above to view or get ahead on its plan.</p>
      `;
      activitiesTabPanel.appendChild(weekendPanel);
    } else {

    // --- Given plan and my plan, clubbed --- Collapsed by default now:
    // this is a second, denser view of exactly the same
    // dailyPlanEntries/weekPlan data the session cards below already
    // show in full — showing both inline by default meant scrolling
    // through the same information twice before even reaching the
    // cards, which is the actual daily task.
    const clubbedToggle = document.createElement('button');
    clubbedToggle.style.cssText = 'display:flex; align-items:center; justify-content:space-between; width:100%; margin-bottom:14px; padding:14px 18px; border-radius:10px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:14px; font-weight:700; color:var(--text);';
    clubbedToggle.innerHTML = `<span>${clubbedOverviewExpanded ? '📊 Hide given plan vs. my plan (overview table)' : '📊 Show given plan vs. my plan (overview table)'}</span><span style="font-size:13px; color:var(--text-muted); transition:transform .15s; transform:rotate(${clubbedOverviewExpanded ? '90deg' : '0deg'});">▶</span>`;
    clubbedToggle.onclick = toggleClubbedOverview;
    activitiesTabPanel.appendChild(clubbedToggle);

    if(clubbedOverviewExpanded){
    activitiesTabPanel.appendChild(mdSec('Given plan and my plan, clubbed', '<span class="reqs">PLN-19 · LPC-01</span>'));
    const clubbedNote = document.createElement('p');
    clubbedNote.className = 'cap'; clubbedNote.style.margin = '4px 0 16px';
    clubbedNote.innerHTML = `<b>Week ${w.w} \u2014 ${esc(w.theme)}</b><br>PLN-19 \u00b7 one row a session. The left column is what the weekly plan gave; the right is what I wrote for today. Seeing them apart is what makes a divergence a decision rather than a drift.`;
    activitiesTabPanel.appendChild(clubbedNote);

    let clubTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Session</th><th>Time</th><th>Domain · Goal</th><th>Weekly plan as given</th><th>My plan for today</th><th>Aligned</th><th>Done</th></tr></thead><tbody>';
    DOMAINS.forEach(d => {
      const dpKey = dailyPlanKey(currentWeekNum, dayKey, d.key);
      const dpEntry = dailyPlanEntries[dpKey];
      const hasPlan = !!(dpEntry && dpEntry.text && dpEntry.text.trim());
      const planText = hasPlan ? dpEntry.text.trim() : '';
      const usedSuggestion = hasPlan && dpEntry.usedSuggestion;
      const givenText = (ACTIVITY_COMPETENCIES['wk' + currentWeekNum] &&
        ACTIVITY_COMPETENCIES['wk' + currentWeekNum][d.key] &&
        ACTIVITY_COMPETENCIES['wk' + currentWeekNum][d.key][dayKey]) || (weekPlan[d.key] ? weekPlan[d.key][dayKey] : '') || '';
      const aligned = !hasPlan ? null : usedSuggestion;
      const isDone = !!sessionDoneEntries[dpKey];
      const coveredDate = coveredDateEntries[dpKey];
      clubTable += `<tr>
        <td><b>${esc(d.label)}</b></td>
        <td class="dim">${esc(d.time)}</td>
        <td class="dim">${esc(DOMAIN_CATEGORY[d.key] || '')} · ${esc(d.cg)}</td>
        <td style="white-space:normal; text-align:left; min-width:260px; max-width:420px;">${givenText ? `<div class="plan-2line" title="${esc(givenText)} (tap to show all)" onclick="this.classList.toggle('open')">${esc(givenText)}</div>` : '<span class="cap">\u2014</span>'}</td>
        <td style="white-space:normal; text-align:left; min-width:220px; max-width:380px;"><b>${hasPlan ? `<div class="plan-2line" title="${esc(planText)} (tap to show all)" onclick="this.classList.toggle('open')">${esc(planText)}</div>` : '<span class="cap" style="font-weight:400;">Not planned yet</span>'}</b></td>
        <td>${aligned === null ? '<span class="cap">\u2014</span>' : (aligned ? mdPill('Yes', 'good') : mdPill('Diverges', 'warn'))}</td>
        <td style="text-align:center; cursor:pointer;" onclick="toggleSessionDone(${currentWeekNum}, '${dayKey}', '${d.key}')">${isDone ? '<span class="pill good">✓</span>' : '<span class="cap">\u2014</span>'}${coveredDate ? `<br><span class="cap" style="font-size:10.5px;" title="Originally scheduled day was a holiday">Covered ${esc(coveredDate)}</span>` : ''}</td>
      </tr>`;
    });
    clubTable += '</tbody></table></div>';
    const clubWrap = document.createElement('div'); clubWrap.innerHTML = clubTable;
    activitiesTabPanel.appendChild(mdCard(null, 'Tap the Done column to confirm a session actually happened \u2014 independent of whether a plan was written for it.', clubWrap));
    }

    // Renamed for its new position — this now introduces the session
    // cards below (the "weekly plan" in detail), not the whole page,
    // since the clubbed overview above it now comes first.
    const currentDayRealDate = getRealDateForWeekDay(currentWeekNum, currentDayKey);
    const currentDayDateLabel = currentDayRealDate
      ? currentDayRealDate.toLocaleDateString([], {weekday:'long', day:'numeric', month:'short', year:'numeric'})
      : dayLabels[myDayIndex];
    const sessionsHeading = mdSec(
      'Today\'s plan — Week ' + w.w + ' · ' + w.theme + ' · ' + currentDayDateLabel,
      '<span class="reqs">LPC-01…04 · TLM-03/04 · TCH-14…17</span>'
    );
    sessionsHeading.style.display = 'flex';
    sessionsHeading.style.alignItems = 'center';
    sessionsHeading.style.justifyContent = 'space-between';
    sessionsHeading.style.flexWrap = 'wrap';
    sessionsHeading.style.gap = '8px';
    const anyPlannedToday = DOMAINS.some(d => {
      const e = dailyPlanEntries[dailyPlanKey(currentWeekNum, dayKey, d.key)];
      return e && e.text && e.text.trim();
    });
    if(anyPlannedToday){
      const resetBtn = document.createElement('button');
      resetBtn.className = 'chip';
      resetBtn.style.cssText = 'font-size:11.5px; white-space:nowrap;';
      resetBtn.textContent = '↺ Clear all plans for this day';
      resetBtn.onclick = resetTodaysPlans;
      sessionsHeading.appendChild(resetBtn);
    }
    activitiesTabPanel.appendChild(sessionsHeading);

    const sessionsGrid = document.createElement('div'); sessionsGrid.className = 'g g4'; sessionsGrid.style.marginTop = '24px';
    DOMAINS.forEach(d => {
      const dpKey = dailyPlanKey(currentWeekNum, dayKey, d.key);
      const dpEntry = dailyPlanEntries[dpKey] || {text:'', materials:[], usedSuggestion:false};
      const hasPlan = !!(dpEntry.text && dpEntry.text.trim());
      const usedSuggestion = hasPlan && dpEntry.usedSuggestion;

      const c = document.createElement('div');
      c.className = 'per' + (hasPlan ? ' done' : ' miss');
      const evKey = evidenceKey(currentWeekNum, dayKey, d.key);
      const evidence = uploadedEvidenceRecords[evKey] || [];
      const hasEvidence = evidence.length > 0;
      const evidenceHtml = evidence.length ? `<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">
          ${evidence.map((ev, i) => {
            const t = ev.type || '';
            const kind = t.startsWith('video') ? 'video' : t.startsWith('audio') ? 'audio' : t.startsWith('image') ? 'image' : 'doc';
            const iconByKind = { video: '▶', audio: '🎵', image: '🖼', doc: '📄' };
            const labelByKind = { video: 'VID', audio: 'AUD', image: 'IMG', doc: 'DOC' };
            const colorByKind = { video: 'var(--primary)', audio: 'var(--primary)', image: 'var(--text-muted)', doc: 'var(--text-muted)' };
            const sizeLabel = ev.size ? (ev.size / (1024 * 1024)).toFixed(1) + ' MB' : '';
            // Tiles for evidence uploaded before Drive integration
            // won't have a driveLink — those just aren't clickable,
            // same as before, rather than pointing at a broken link.
            const tileTag = ev.driveLink ? 'a' : 'div';
            const tileAttrs = ev.driveLink ? `href="${esc(ev.driveLink)}" target="_blank" rel="noopener"` : '';
            return `<div style="width:96px; position:relative;">
              <${tileTag} ${tileAttrs} style="padding:8px; border:1px solid var(--border); border-radius:10px; background:var(--bg); position:relative; display:block; text-decoration:none; color:inherit; cursor:${ev.driveLink ? 'pointer' : 'default'};">
                <div style="display:flex; align-items:center; justify-content:center; height:40px; position:relative;">
                  <span style="font-size:18px;">${iconByKind[kind]}</span>
                  <span style="position:absolute; top:0; right:0; font-weight:700; font-size:8px; padding:1px 4px; border-radius:4px; background:${colorByKind[kind]}; color:#fff;">${labelByKind[kind]}</span>
                </div>
                <div style="font-size:10px; margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(ev.name)}">${esc(ev.name)}</div>
                <div class="cap" style="font-size:9.5px;">${sizeLabel}${ev.driveLink ? ' · Drive' : ''}</div>
              </${tileTag}>
              <button onclick="removeSessionEvidence('${evKey}', ${i})" title="Remove this evidence" style="position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; border:1px solid var(--border); background:#fff; color:var(--danger, #c8433f); font-size:12px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">✕</button>
            </div>`;
          }).join('')}
        </div>` : '';
      const hasPlanNow = !!(dpEntry.text && dpEntry.text.trim());
      // Per-session collapse state, keyed by the same dpKey used for
      // the plan itself — so it naturally resets when the day/week
      // changes (a new dpKey), defaults sensibly the first time a
      // given session is seen (planned sessions open, unplanned ones
      // collapsed to just their header), and remembers a manual
      // toggle afterward without a re-render undoing it, since typing/
      // saving inside a card never calls renderMyDay() directly.
      if(myDaySessionCardOpen[dpKey] === undefined) myDaySessionCardOpen[dpKey] = hasPlanNow;
      const isCardOpen = myDaySessionCardOpen[dpKey];

      c.innerHTML = `
        <div class="ph" style="cursor:pointer;" onclick="toggleSessionCardOpen('${dpKey}')"><span class="pn">${esc(d.label)}</span><span style="display:flex; align-items:center; gap:6px;"><span id="planBadge-${d.key}" class="pill">Not planned yet</span><span style="font-size:12px; color:var(--text-muted); transition:transform .15s; transform:rotate(${isCardOpen ? '90deg' : '0deg'}); display:inline-block;">▶</span></span></div>
        <div class="pt">${esc(d.time)} · ${esc(d.cg)}</div>

        <div id="sessionCardBody-${d.key}" style="${isCardOpen ? '' : 'display:none;'}">
        <label style="font-size:11px; color:var(--text-muted); display:block; margin:8px 0 4px;">Your plan for this session</label>
        <div>
  <textarea
    id="planText-${d.key}"
    rows="2"
    style="
      width:100%;
      box-sizing:border-box;
      font-size:12.5px;
      padding:7px 9px;
      border:1px solid var(--border);
      border-radius:8px;
      font-family:inherit;
    "
    placeholder="Write your own activity here"
  ></textarea>

  ${
    typeof aarambhVoiceTranslateControls === 'function'
      ? aarambhVoiceTranslateControls(d.key)
      : ''
  }
</div>
        <div style="display:flex; gap:6px; margin:8px 0; align-items:center; flex-wrap:wrap;">
          <button class="chip" style="background:var(--primary); color:#fff; border-color:transparent; font-size:11.5px;" onclick="saveActivityWithConfirmation('${d.key}')">✓ Save activity</button>
          <button class="chip" style="font-size:11.5px;" onclick="clearPlanText('${d.key}')">Clear</button>
          <span id="planSaveMsg-${d.key}" style="font-size:11px; color:var(--success, #0ca30c);"></span>
          <span id="matchBadge-${d.key}" class="pill" style="display:none;"></span>
        </div>

        <div id="afterPlan-${d.key}" style="${hasPlanNow ? '' : 'display:none;'}">
        <label style="font-size:11px; color:var(--text-muted); display:block; margin:4px 0;">Materials used in this activity</label>
        <div id="planMaterials-${d.key}" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px;"></div>
        <div style="display:flex; gap:6px;">
          <input type="text" id="planMaterialInput-${d.key}" placeholder="${MYDAY_DOMAIN_MATERIAL[d.key] ? 'e.g. ' + esc(MYDAY_DOMAIN_MATERIAL[d.key]) : 'Add a material'}" style="flex:1; padding:6px 8px; font-size:11.5px; border:1px solid var(--border); border-radius:8px;" onkeydown="if(event.key==='Enter'){ addMaterialChip('${d.key}', this); }" />
          <button class="chip" style="font-size:11.5px;" onclick="addMaterialChip('${d.key}', document.getElementById('planMaterialInput-${d.key}'))">Add</button>
        </div>

        <div style="position:relative; margin-top:14px;">
          <button type="button" id="evidenceAddBtn-${d.key}" onclick="toggleEvidenceMenu('${d.key}')"
            style="width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:26px 16px; border:2px dashed var(--primary); border-radius:12px; background:var(--bg); cursor:pointer; text-align:center; font-family:inherit;">
            <span style="font-size:26px; line-height:1; color:${hasEvidence ? 'var(--success)' : 'var(--primary)'};">${hasEvidence ? '✓' : '+'}</span>
            <span style="font-size:14px; font-weight:700; margin-top:6px;">${hasEvidence ? 'Add another' : 'Add evidence \u2014 photo, video, audio or a document'}</span>
            <span class="cap" style="font-size:11px;">${esc(DOMAIN_CATEGORY[d.key] || '')} · ${esc(d.cg)}</span>
          </button>
          <div id="evidenceMenu-${d.key}" class="hidden" style="position:absolute; left:0; right:0; top:calc(100% + 6px); z-index:20; background:#fff; border:1px solid var(--border); border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.15); padding:6px; display:flex; flex-direction:column; gap:2px;">
            <button type="button" onclick="document.getElementById('evCam-${d.key}').click(); closeEvidenceMenu('${d.key}')" style="display:flex; align-items:center; gap:10px; padding:9px 10px; border:none; background:none; text-align:left; font-size:13px; border-radius:8px; cursor:pointer; font-family:inherit;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='none'">📷 <span>Take a photo</span></button>
            <button type="button" onclick="document.getElementById('evCamVideo-${d.key}').click(); closeEvidenceMenu('${d.key}')" style="display:flex; align-items:center; gap:10px; padding:9px 10px; border:none; background:none; text-align:left; font-size:13px; border-radius:8px; cursor:pointer; font-family:inherit;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='none'">🎥 <span>Record a video</span></button>
            <button type="button" onclick="document.getElementById('evGallery-${d.key}').click(); closeEvidenceMenu('${d.key}')" style="display:flex; align-items:center; gap:10px; padding:9px 10px; border:none; background:none; text-align:left; font-size:13px; border-radius:8px; cursor:pointer; font-family:inherit;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='none'">🖼 <span>Choose from gallery</span></button>
            <button type="button" onclick="document.getElementById('evAudio-${d.key}').click(); closeEvidenceMenu('${d.key}')" style="display:flex; align-items:center; gap:10px; padding:9px 10px; border:none; background:none; text-align:left; font-size:13px; border-radius:8px; cursor:pointer; font-family:inherit;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='none'">🎤 <span>Choose audio</span></button>
            <button type="button" onclick="document.getElementById('evDoc-${d.key}').click(); closeEvidenceMenu('${d.key}')" style="display:flex; align-items:center; gap:10px; padding:9px 10px; border:none; background:none; text-align:left; font-size:13px; border-radius:8px; cursor:pointer; font-family:inherit;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='none'">📄 <span>Choose a document</span></button>
          </div>
          <input type="file" id="evCam-${d.key}" accept="image/*" capture="environment" style="display:none;" onchange="uploadSessionActivityPhoto('${d.key}', '${dayKey}', this)" />
          <input type="file" id="evCamVideo-${d.key}" accept="video/*" capture="environment" style="display:none;" onchange="uploadSessionActivityPhoto('${d.key}', '${dayKey}', this)" />
          <input type="file" id="evGallery-${d.key}" accept="image/*,video/*" style="display:none;" onchange="uploadSessionActivityPhoto('${d.key}', '${dayKey}', this)" />
          <input type="file" id="evAudio-${d.key}" accept="audio/*" style="display:none;" onchange="uploadSessionActivityPhoto('${d.key}', '${dayKey}', this)" />
          <input type="file" id="evDoc-${d.key}" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style="display:none;" onchange="uploadSessionActivityPhoto('${d.key}', '${dayKey}', this)" />
        </div>
        <div style="text-align:center; margin-top:4px;"><span id="sessionPhotoStatus-${d.key}-${dayKey}" style="font-size:12px; color:var(--ink-3);"></span></div>
        ${evidenceHtml}
        </div>
        </div>`;
      sessionsGrid.appendChild(c);

      // Wire up textarea persistence right after insertion, same as
      // the old Daily Plan screen did — input fires savePlanText on
      // every keystroke.
      const ta = c.querySelector('#planText-' + d.key);
      ta.value = dpEntry.text;
      ta.addEventListener('input', () => savePlanText(d.key, ta.value));
    });
    activitiesTabPanel.appendChild(sessionsGrid);
    // Materials for the day being viewed, activity by activity (js/render/myday-materials.js).
    if(typeof renderDayMaterialsStrip === 'function'){ try { activitiesTabPanel.appendChild(renderDayMaterialsStrip(currentWeekNum, currentDayKey)); } catch(err){ console.error('Day materials:', err); } }

    // Populate material chips and badges now that all DOM nodes exist.
    DOMAINS.forEach(d => { renderMaterialChips(d.key); updatePlanBadge(d.key); renderMatchBadge(d.key); });

    } // end showWeekendState else-branch

    // ---- Collapsed-by-default planning insights for the day ----
    const insightsToggle = document.createElement('button');
    insightsToggle.style.cssText = 'display:flex; align-items:center; justify-content:space-between; width:100%; margin-top:14px; padding:14px 18px; border-radius:10px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:14px; font-weight:700; color:var(--text);';
    insightsToggle.innerHTML = `<span>${planInsightsExpanded ? '📊 Hide plan insights for the day' : '📊 Show plan insights for the day'}</span><span style="font-size:13px; color:var(--text-muted); transition:transform .15s; transform:rotate(${planInsightsExpanded ? '90deg' : '0deg'});">▶</span>`;
    insightsToggle.onclick = togglePlanInsights;
    activitiesTabPanel.appendChild(insightsToggle);

    if(planInsightsExpanded){
      const plannedCount = DOMAINS.filter(d => {
        const k = dailyPlanKey(currentWeekNum, dayKey, d.key);
        return dailyPlanEntries[k] && dailyPlanEntries[k].text.trim();
      }).length;
      const suggestionCount = DOMAINS.filter(d => {
        const k = dailyPlanKey(currentWeekNum, dayKey, d.key);
        return dailyPlanEntries[k] && dailyPlanEntries[k].usedSuggestion;
      }).length;
      const insightsCard = document.createElement('div'); insightsCard.className = 'card'; insightsCard.style.marginTop = '10px';
      insightsCard.innerHTML = `
        <div class="hd"><div><h3>Today's planning snapshot</h3><p class="cap">${dayLabels[myDayIndex]} · Week ${w.w}</p></div></div>
        <div class="g g4" style="margin-top:8px;">
          <div class="tile"><div class="k">Sessions planned</div><div class="v">${plannedCount}<small> of ${DOMAINS.length}</small></div></div>
          <div class="tile"><div class="k">Using suggestions</div><div class="v">${suggestionCount}<small> of ${plannedCount || 0}</small></div></div>
          <div class="tile"><div class="k">Your own activities</div><div class="v">${Math.max(0, plannedCount - suggestionCount)}</div></div>
        </div>
        <p class="cap" style="margin-top:10px;">This is a lightweight snapshot, not a performance score — customizing an activity isn't flagged as a problem here, it's just shown for your own reference.</p>`;
      activitiesTabPanel.appendChild(insightsCard);
    }

    // ---- Materials — read from the activity cards (js/render/myday-materials.js).
    // The separate "Materials needed this week" box is gone: materials are
    // recorded once, on each activity card, and listed here from there. ----
    if(typeof renderMyDayMaterialsPanel === 'function'){
      try { renderMyDayMaterialsPanel(materialsTabPanel); }
      catch(err){ console.error('Materials tab:', err); materialsTabPanel.insertAdjacentHTML('beforeend', '<div class="card" style="padding:16px 18px;">The Materials list could not be drawn — please send a screenshot of F12 → Console.</div>'); }
    } else {
      materialsTabPanel.insertAdjacentHTML('beforeend', '<div class="card" style="padding:16px 18px;"><b>js/render/myday-materials.js is missing.</b> Copy it into C:\\xampp\\htdocs\\aarambh-lms\\js\\render\\ and make sure teacher.html loads it.</div>');
    }

    const aiPointer = document.createElement('div');
    aiPointer.className = 'card'; aiPointer.style.cssText = 'padding:16px 18px; margin-top:22px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; cursor:pointer;';
    aiPointer.onclick = () => switchSidebarSection('aiassistance');
    aiPointer.innerHTML = `<div><b>✦ Suggested activities and planning advisories</b><p class="cap" style="margin:2px 0 0;">Rule-based suggestions for next week, plus the same suggested-activity list shown on the cards above — all in one place.</p></div>
      <span class="chip" style="white-space:nowrap;">Open AI Assistance →</span>`;
    container.appendChild(aiPointer);

    // --- Coverage & Analysis — collapsed by default, matching the
    // "What the portal will print" pattern used elsewhere: a header
    // that's always visible, content that only renders once tapped. ---
    const coverageCard = document.createElement('div');
    coverageCard.className = 'card'; coverageCard.style.padding = '0'; coverageCard.style.marginTop = '22px'; coverageCard.style.overflow = 'hidden';
    coverageCard.innerHTML = `
      <div onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.chevron').style.transform = this.nextElementSibling.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:18px 22px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700; letter-spacing:-.005em;">Coverage &amp; Analysis</h3>
          <p class="cap" style="margin:0;">Which domains actually get photographed, and what the evidence is for \u2014 tap to see it.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px;">\u25b6</span>
      </div>
      <div class="hidden" style="padding:0 22px 22px;"></div>
    `;
    const coverageBody = coverageCard.querySelector('div.hidden');

    // Real counts from uploadedEvidenceRecords \u2014 how many teaching
    // days this week (Mon\u2013Fri) have at least one file against each
    // domain, out of the 5 possible. Scoped to the current week (not
    // "the month") since week-day-domain is the only real key this app
    // actually tracks uploads against.
    const coverageRows = DOMAINS.map(d => {
      const daysWithEvidence = dayKeysArr.filter(dk => (uploadedEvidenceRecords[evidenceKey(currentWeekNum, dk, d.key)] || []).length > 0).length;
      return { label: d.label, count: daysWithEvidence, total: dayKeysArr.length };
    });
    let coverageChart = '<div style="display:flex; flex-direction:column; gap:10px;">';
    coverageRows.forEach(r => {
      const pct = Math.round(r.count / r.total * 100);
      const color = pct >= 50 ? 'var(--success)' : 'var(--primary)';
      coverageChart += `<div style="display:grid; grid-template-columns:110px 1fr 40px; align-items:center; gap:8px; font-size:12px;">
        <span>${esc(r.label)}</span>
        <div style="background:var(--bg); border-radius:6px; height:10px; overflow:hidden;"><div style="width:${pct}%; height:100%; background:${color};"></div></div>
        <span class="cap" style="text-align:right;">${r.count}/${r.total}</span>
      </div>`;
    });
    coverageChart += '</div>';
    const coverageChartWrap = document.createElement('div'); coverageChartWrap.innerHTML = coverageChart;
    const coverageChartCard = mdCard('Which domains get photographed', 'Media clusters where the activity looks good in a picture; some domains naturally photograph less, and the record thins out there.', coverageChartWrap);

    const evidencePurposeBody = document.createElement('div');
    evidencePurposeBody.innerHTML = `<p style="margin:0 0 14px;">A photograph is not an assessment. It is what makes an assessment reviewable \u2014 the supervisor at the monthly meeting, the parent at the PTM, and the teacher herself three months later can all see the same thing the tier was recorded from.</p>
      <dl class="kv">
        <dt>Stored against</dt><dd>day \u00b7 domain \u00b7 curricular goal \u00b7 class \u2014 never against a named child by default</dd>
        <dt>Retention</dt><dd>the programme year plus one, then deleted</dd>
        <dt>Consent</dt><dd>household-level, recorded at admission, withdrawable at any time</dd>
        <dt>Not permitted</dt><dd>export of a child-identifiable image outside the school</dd>
      </dl>`;
    const evidencePurposeCard = mdCard('What the evidence is for', null, evidencePurposeBody);

    const coverageGrid = document.createElement('div');
    coverageGrid.style.cssText = 'display:grid; grid-template-columns:' + (window.innerWidth < 900 ? '1fr' : '1fr 1fr') + '; gap:16px;';
    coverageGrid.appendChild(coverageChartCard);
    coverageGrid.appendChild(evidencePurposeCard);
    coverageBody.appendChild(coverageGrid);

    const cautionNote = document.createElement('p');
    cautionNote.className = 'cap';
    cautionNote.style.cssText = 'margin:16px 0 0; padding:10px 14px; border-left:3px solid var(--primary); background:var(--bg); border-radius:0 8px 8px 0;';
    cautionNote.innerHTML = '<b>A caution worth writing down.</b> Once evidence becomes a compliance figure, teachers photograph to satisfy the figure. This coverage is reported for visibility only \u2014 never as a target, and no escalation is triggered by it.';
    coverageBody.appendChild(cautionNote);

    container.appendChild(coverageCard);

    // Reference-info legend — static, non-personal glossary/benchmark data
    // straight from the SOP (not per-teacher, doesn't change day to day).
    // Matches the prototype's .ftr bar; built with inline styles rather
    // than relying on a .ftr class that may not exist yet in
    // style-new-design.css.
    const footerLegend = document.createElement('div');
    footerLegend.style.cssText = 'display:flex; flex-wrap:wrap; gap:16px; margin-top:16px; padding-top:10px; border-top:1px solid var(--line, #0b0b0b1a); font-size:12px; color:var(--ink-3, #6d6b67);';
    footerLegend.innerHTML = [
      '<span><b>Scale</b> B/P/A three-tier · weights 1 · 2 · 3</span>',
      '<span><b>DSI</b> 0–200 · benchmark 133.3</span>',
      '<span><b>Domains</b> 10 → 5 koshas → 6 HPC domains → 13 curricular goals</span>',
      '<span><b>Year</b> June to April · May vacation · <b>210</b> computed teaching days</span>',
      '<span><b>Teacher days</b> 246 · Saturdays are teacher-only, last Saturday off</span>',
      '<span><b>Built to</b> BRD v3.3 · SOP · calendar · principal · Effective cycle</span>',
      '<span>Bhavyata Foundation × MCGM</span>'
    ].join('');
    container.appendChild(footerLegend);
  }

  /* =========================================================
     DAILY PLAN — entry-level planning screen. Each session shows a
     starting-point suggestion pulled from the REAL authored curriculum
     (WEEKLY_PLAN + ACTIVITY_COMPETENCIES) — this is pre-written content
     acting as a sensible default, not a live AI call. The teacher can
     accept it as-is, edit it, or clear it and write something entirely
     her own (e.g. a voice-to-text activity) — nothing here is locked.

     Voice input uses the browser's real SpeechRecognition API (not a
     simulation). Support varies by browser — solid in Chrome/Edge,
     partial in Safari, largely absent in Firefox — so the mic button
     hides itself gracefully where it isn't available, rather than
     showing something that would silently fail.

     All plan text/materials are held in dailyPlanEntries, keyed by
     week-day-domain — placeholder client-side storage until this
     becomes a real backend-saved plan.
     ========================================================= */
  var dailyPlanEntries = {}; // key -> {text, materials:[], usedSuggestion}

  // ---------------------------------------------------------
  // WEEKLY TLM PLAN — a simple, teacher-typed list of materials she
  // intends to use this week. Now the sole "materials needed this
  // week" section on the page (see renderMyDay above) — merges what
  // used to be two separate blocks: her own free-form list AND a
  // separate curriculum-default card grid. Each item she adds is
  // checked live against real TLM inventory via stockInfoFor(), and
  // carries a simple used/not-used toggle — no per-session usage log,
  // just a plain flag. Placeholder client-side storage for now, same
  // swap-out-for-a-real-backend pocket as dailyPlanEntries.
  // ---------------------------------------------------------
  var weeklyTlmEntries = {}; // week number -> [{name, used:boolean}, ...]
  function loadWeeklyTlmEntries(){
    try {
      const storageKey = (typeof profileStorageKey === 'function') ? profileStorageKey('weeklyTlmEntries') : null;
      if(!storageKey) return;
      const raw = localStorage.getItem(storageKey);
      if(raw){
        const parsed = JSON.parse(raw);
        Object.keys(parsed).forEach(wk => {
          weeklyTlmEntries[wk] = (parsed[wk] || []).map(item => {
            if(typeof item === 'string') return { name: item, used: false };
            return { name: item.name, used: !!item.used || (Array.isArray(item.usageLog) && item.usageLog.length > 0) };
          });
        });
      }
    } catch(e){ /* malformed or unavailable — start empty */ }
  }
  function saveWeeklyTlmEntries(){
    const storageKey = (typeof profileStorageKey === 'function') ? profileStorageKey('weeklyTlmEntries') : null;
    if(!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(weeklyTlmEntries)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }
  function addWeeklyTlmItem(){
    const input = document.getElementById('weeklyTlmInput');
    const value = (input.value || '').trim();
    if(!value) return;
    if(!weeklyTlmEntries[currentWeekNum]) weeklyTlmEntries[currentWeekNum] = [];
    weeklyTlmEntries[currentWeekNum].push({ name: value, used: false });
    saveWeeklyTlmEntries();
    input.value = '';
    renderMyDay();
  }
  function toggleTlmUsed(idx){
    const item = weeklyTlmEntries[currentWeekNum][idx];
    if(!item) return;
    item.used = !item.used;
    saveWeeklyTlmEntries();
    renderMyDay();
  }
  function removeWeeklyTlmItem(idx){
    if(!weeklyTlmEntries[currentWeekNum]) return;
    weeklyTlmEntries[currentWeekNum].splice(idx, 1);
    saveWeeklyTlmEntries();
    renderMyDay();
  }
  // Persist to localStorage — same swap-out-for-a-real-backend pocket
  // used for teacherAttendance below. Without this, dailyPlanEntries was
  // pure in-memory state that vanished on every reload, which is why the
  // compliance summary's Plans/Congruency/Sessions-confirmed columns could
  // never show anything but 0 no matter what was actually typed into
  // Daily Plan — the attendance sheet and the plan data were never
  // actually wired together across page loads.
  // Loaded by initializeProfileScopedLocalState() after the real class identity is known.
