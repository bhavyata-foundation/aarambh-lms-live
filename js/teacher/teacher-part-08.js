function studentDaysInMonth(year, month){
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let count = 0;
    for(let d = 1; d <= daysInMonth; d++){
      const dow = new Date(year, month, d).getDay();
      if(complianceHolidayName(year, month, d)) continue;
      if(dow === 0 || dow === 6) continue; // children: Mon-Fri only
      count++;
    }
    return count;
  }
  // Shared by the single-month tiles and the "Across the year" table below —
  // one formula, computed for whichever (year, month) is asked for, so the
  // two views can never drift apart.
  function computeComplianceStatsForMonth(year, month){
    const records = getMonthAttendanceRecords(year, month);
    const allEntries = Object.entries(records);
    const weekdayEntries = allEntries.filter(([dateStr]) => {
      const dow = new Date(dateStr + 'T00:00:00').getDay();
      return dow >= 1 && dow <= 6;
    });
    const presentCount = weekdayEntries.filter(([, r]) => r.status === 'present').length;
    // Approved leave (written as 'leave' by decide_leave.php once both
    // the supervisor and principal approve) is neither present nor
    // absent — it's left out of the denominator, not counted against her.
    const leaveCount = weekdayEntries.filter(([, r]) => r.status === 'leave').length;
    const markedCount = weekdayEntries.length - leaveCount;
    const myAttendancePct = markedCount ? Math.round(presentCount / markedCount * 1000) / 10 : 0;
    const saturdayEntries = allEntries.filter(([dateStr]) => new Date(dateStr + 'T00:00:00').getDay() === 6);
    const saturdayPresent = saturdayEntries.filter(([, r]) => r.status === 'present').length;
    const saturdayScored = saturdayEntries.filter(([, r]) => r.status !== 'leave').length;
    const saturdayPct = saturdayScored ? Math.round(saturdayPresent / saturdayScored * 1000) / 10 : 0;
        const weeksInMonth = WEEKS.filter(w => {
      const start = parseWeekStartDate(w.dates);
      return start.getFullYear() === year && start.getMonth() === month;
    });
    // Fire a background fetch for any week in this month that hasn't
    // actually been loaded from the server yet — without this, a week
    // never opened in My Day/Daily Plan reads as having zero plans here,
    // even when real ones exist in the database.
    if(typeof ensureDailyPlanEntriesLoaded === 'function'){
      weeksInMonth.forEach(w => {
        if(!dailyPlanEntriesLoadedWeeks[w.w]) ensureDailyPlanEntriesLoaded(false, w.w);
      });
    }
    let totalDueDays = 0, daysWithAnyPlan = 0, totalSessionSlots = 0, plannedSlots = 0;
    weeksInMonth.forEach(w => {
      ['mon','tue','wed','thu','fri'].forEach(dk => {
        totalDueDays++;
        const planned = countPlannedSessionsForDay(w.w, dk);
        if(planned > 0) daysWithAnyPlan++;
        totalSessionSlots += DOMAINS.length;
        plannedSlots += planned;
      });
    });
    const plansSubmittedPct = totalDueDays ? Math.round(daysWithAnyPlan / totalDueDays * 1000) / 10 : 0;
    const congruentPct = totalSessionSlots ? Math.round(plannedSlots / totalSessionSlots * 1000) / 10 : 0;
    // "Unmarked counts as absent" version — divides by every real
    // working day this month (teacherWorkingDaysInMonth), not just the
    // days she actually marked. A day she never marked at all is
    // treated exactly like an explicit absence here.
    const teacherWorkingDaysTotal = teacherWorkingDaysInMonth(year, month);
    const teacherDaysExLeave = Math.max(teacherWorkingDaysTotal - leaveCount, 0);
    const teacherClassWidePct = teacherDaysExLeave ? Math.round(presentCount / teacherDaysExLeave * 1000) / 10 : 0;
    return { myAttendancePct, saturdayPct, plansSubmittedPct, congruentPct, sessionsConfirmedPct: congruentPct,
      presentCount, markedCount, leaveCount, teacherClassWidePct, teacherWorkingDaysTotal, // raw counts, exposed so multi-month aggregates (e.g. computeTermAttendancePct) can weight correctly rather than averaging percentages
      hasAttendance: markedCount > 0, hasSaturday: saturdayEntries.length > 0,
      hasPlans: totalDueDays > 0, hasCongruency: totalSessionSlots > 0 };
  }
  // Term-to-date attendance % for the "My attendance (term)" tile at the
  // top of the dashboard (teacher.html's static header, not My Day's own
  // mdGrid tile). Weighted by raw present/marked counts across every
  // academic month so far this year — NOT an average of monthly
  // percentages, which would over-weight low-attendance months.
  // Same (single-year, ACADEMIC_MONTHS-up-to-now) convention already
  // used by the compliance calendar's month tabs.
  function computeTermAttendancePct(){
    const now = new Date();
    const curIdx = ACADEMIC_MONTHS.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS;
    let presentSum = 0, markedSum = 0;
    monthsSoFar.forEach(m => {
      const stats = computeComplianceStatsForMonth(now.getFullYear(), m);
      presentSum += stats.presentCount;
      markedSum += stats.markedCount;
    });
    return markedSum ? Math.round(presentSum / markedSum * 1000) / 10 : null; // null = nothing marked yet anywhere this term
  }
  function updateTermAttendanceTile(){
    const el = document.getElementById('myAttendanceTermValue');
    if(!el) return;
    const pct = computeTermAttendancePct();
    el.textContent = pct === null ? '—' : pct + '%';
  }
  // Small colored percentage bar, matching the reference design's
  // green/amber/red month-by-month table. Reuses the same var(--success)
  // and var(--danger) tokens already used for pills elsewhere in this file.
  // hasData=false renders a neutral dashed "no data" cell instead of a
  // false-alarm red 0 — a month nothing was recorded for isn't the same
  // as a month of genuine non-compliance.
  function pctBar(pct, good, warn, hasData){
    if(hasData === false){
      return `<div style="background:var(--bg); color:var(--text-muted); font-weight:600; font-size:12.5px; border:1px dashed var(--border); border-radius:6px; padding:4px 0; text-align:center; min-width:40px;" title="No data recorded yet">–</div>`;
    }
    good = good || 85; warn = warn || 70;
    const color = pct >= good ? 'var(--success)' : pct >= warn ? '#EE8F35' : 'var(--danger,#c8433f)';
    return `<div style="background:${color}; color:#fff; font-weight:600; font-size:12.5px; border-radius:6px; padding:5px 0; text-align:center; min-width:40px;">${pct}</div>`;
  }
  let complianceCalTargetEl = null; // remembers where to re-render when the month tabs inside this change
  let complianceCalActiveTab = 'workingdays'; // 'workingdays' | 'acrossyear' — backs My Compliance's section tabs
  function renderComplianceCal(targetEl){
    complianceCalTargetEl = targetEl || null;
    const container = targetEl || document.getElementById('compliancecal-body');
    container.innerHTML = '';
    if(!targetEl) renderTeacherFilterBar(container, renderComplianceCal);
    const year = calendarYear, month = calendarMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = new Date(year, month, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const teacherDays = teacherWorkingDaysInMonth(year, month);
    const studentDays = studentDaysInMonth(year, month);
    // Month picker — same academic year (Jun–Apr) convention used
    // elsewhere in this app. Selecting one jumps the shared calendar
    // state to that month and re-renders.
    const monthTabs = document.createElement('div');
    monthTabs.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin:14px 0;';
    const academicMonths = ACADEMIC_MONTHS;
    monthTabs.innerHTML = academicMonths.map(m => {
      const label = new Date(2000, m, 1).toLocaleDateString([], {month:'short'});
      const active = m === month;
      const sDays = studentDaysInMonth(year, m);
      const tDays = teacherWorkingDaysInMonth(year, m);
      return `<button onclick="calendarMonth=${m}; renderComplianceCal(complianceCalTargetEl);" style="padding:6px 12px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:12px; white-space:nowrap;">${label} · ${sDays}/${tDays}</button>`;
    }).join('');
    container.appendChild(monthTabs);
    const explainer = document.createElement('p');
    explainer.className = 'cap';
    explainer.style.marginBottom = '14px';
    explainer.innerHTML = `CAL-04/13 · each month shows <b>student days / teacher working days</b>. Children attend Monday to Friday; teachers also work Saturdays, less the last Saturday of the month. Curriculum and child attendance divide by the first; teacher attendance and planning compliance by the second.`;
    container.appendChild(explainer);
    // --- Real teacher attendance + plan compliance for this month ---
    const records = getMonthAttendanceRecords(year, month);
    const { myAttendancePct, saturdayPct, plansSubmittedPct, congruentPct } = computeComplianceStatsForMonth(year, month);
    // --- Plain-count summary (present/absent/not yet marked) for this
    // month, alongside the percentage tiles above — same Mon-Sat
    // "teacher working days" denominator as CAL-13, just expressed as
    // raw counts instead of a percentage.
    const markedThisMonth = Object.entries(records).filter(([dateStr]) => {
      const dow = new Date(dateStr + 'T00:00:00').getDay();
      return dow >= 1 && dow <= 6; // Mon-Sat, matches teacherWorkingDaysInMonth
    });
    const presentDays = markedThisMonth.filter(([, r]) => r.status === 'present').length;
    const absentDays = markedThisMonth.filter(([, r]) => r.status === 'absent').length;
    const markedDays = markedThisMonth.length;
    const notMarkedDays = Math.max(teacherDays - markedDays, 0);
    const statGrid5 = mdGrid('g5', [
      // % present of the days actually MARKED — and how many working days are marked,
      // so 1 day marked never reads as "100% of 25 working days".
      mdTile('My attendance', markedDays ? Math.round(presentDays / markedDays * 100) : '—',
        markedDays ? '% present · ' + markedDays + ' of ' + teacherDays + ' working days marked' : 'No data available — no day marked yet',
        markedDays ? (notMarkedDays ? mdPill(notMarkedDays + ' day' + (notMarkedDays === 1 ? '' : 's') + ' not marked', 'warn') : mdPill('All days marked', 'good')) : mdPill('No data available', 'neu'),
        'CAL-13', mdMeter(markedDays ? Math.round(presentDays / markedDays * 100) : 0)),
      mdTile('On Saturdays', saturdayPct, '% of teacher-only days',
        mdPill(mdStatusBand(saturdayPct, 85, 60).l, mdStatusBand(saturdayPct, 85, 60).c), 'GAP-48', mdMeter(saturdayPct)),
      mdTile('Plans submitted', plansSubmittedPct, '% of days due',
        mdPill(mdStatusBand(plansSubmittedPct).l, mdStatusBand(plansSubmittedPct).c), 'PLN-17', mdMeter(plansSubmittedPct)),
      mdTile('Congruent with the week', congruentPct, '% of sessions',
        mdPill(mdStatusBand(congruentPct).l, mdStatusBand(congruentPct).c), 'PLN-16', mdMeter(congruentPct)),
      (() => {
        // Real: sessions marked done on My Day, in this month's weeks.
        const wks = typeof complianceWeeksInMonth === 'function' ? complianceWeeksInMonth(year, month) : [];
        const due = wks.length * 5 * (typeof DOMAINS !== 'undefined' ? DOMAINS.length : 0);
        const done = typeof practiceForWeek === 'function' ? wks.reduce((a, w) => a + practiceForWeek(w.w).delivered, 0) : 0;
        return done
          ? mdTile('Sessions confirmed', Math.round(done / due * 100), '% · ' + done + ' of ' + due + ' sessions marked done', mdPill(mdStatusBand(Math.round(done / due * 100)).l, mdStatusBand(Math.round(done / due * 100)).c), 'EVD-03', mdMeter(Math.round(done / due * 100)))
          : mdTile('Sessions confirmed', '—', 'No data available — no session marked done yet', mdPill('No data available', 'neu'), 'EVD-03');
      })()
    ]);
    statGrid5.style.marginBottom = '22px';
    container.appendChild(statGrid5);
    const denomCard = mdCard('Two denominators on this page',
      `My attendance is the share of the days you have <b>marked</b> on which you were present, with how many of this month's <b>${teacherDays} teacher working days</b> (which include the Saturdays with no children) are marked so far — unmarked days are not counted as present or absent. Child attendance and session delivery divide by <b>${studentDays} student days</b>. "Sessions confirmed" counts the sessions marked done on My Day in this month's weeks.`, null);
    denomCard.style.marginBottom = '22px';
    container.appendChild(denomCard);
        // ---- Section tabs — My Working Days and Across the year used to
    // sit stacked on one long page; splitting them keeps each section
    // short and lets it stand on its own, same tab pattern as My Day
    // and Monthly Effective.
    const complianceTabBar = document.createElement('div');
    complianceTabBar.style.cssText = 'display:flex; gap:8px; margin:4px 0 20px; flex-wrap:wrap;';
    [
      { key: 'workingdays', label: '📅 My Working Days' },
      { key: 'acrossyear', label: '📊 Across the Year' }
    ].forEach(t => {
      const active = t.key === complianceCalActiveTab;
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.cssText = `padding:9px 18px; border-radius:20px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:13px; font-weight:600; cursor:pointer;`;
      btn.onclick = () => { complianceCalActiveTab = t.key; renderComplianceCal(complianceCalTargetEl); };
      complianceTabBar.appendChild(btn);
    });
    container.appendChild(complianceTabBar);
    if(complianceCalActiveTab === 'workingdays'){
      renderMyWorkingDaysCalendar(container, year, month, monthName, records, daysInMonth, teacherDays, presentDays, absentDays, markedDays, notMarkedDays);
    } else {
      renderComplianceAcrossYear(container, year, month, academicMonths);
    }
  }
  // ---- My Working Days — the day-by-day calendar and its summary,
  // split out of renderComplianceCal into its own function. Now
  // wrapped in its own card (calCard), matching the card boundary
  // "Across the year" already has below it — previously the grid sat
  // directly on the page background with no card around it. ----
  function renderMyWorkingDaysCalendar(container, year, month, monthName, records, daysInMonth, teacherDays, presentDays, absentDays, markedDays, notMarkedDays){
    const markedPct = teacherDays ? Math.round(markedDays / teacherDays * 100) : 0;
    const summaryBody = document.createElement('div');
    summaryBody.className = 'report-table-wrap';
    summaryBody.innerHTML = `
      <table class="report-table">
        <tbody>
          <tr><td>Present</td><td><b>${presentDays}</b> ${presentDays === 1 ? 'day' : 'days'} this month</td></tr>
          <tr><td>Absent</td><td><b>${absentDays}</b> ${absentDays === 1 ? 'day' : 'days'} this month</td></tr>
          <tr><td>On approved leave</td><td><b>${Object.values(records).filter(r => r.status === 'leave').length}</b> working days this month</td></tr>
          <tr><td>Not yet marked</td><td><b>${notMarkedDays}</b> of ${teacherDays} working days</td></tr>
          <tr><td>Marked so far</td><td><b>${markedDays} / ${teacherDays}</b> working days (${markedPct}%)</td></tr>
        </tbody>
      </table>`;
    container.appendChild(mdSec('My working month', '<span class="reqs">TCH-09 · CAL-11</span>'));
    // Today's own attendance — moved here from My Day's "My attendance"
    // tile, since it belongs with the teacher's working-days record.
    // Always TODAY, whichever month is being viewed below; the % is
    // this calendar month's present ÷ marked days, same figure My Day
    // used to show.
    const nowForMine = new Date();
    const myTodayRecord = getTodayAttendanceRecord();
    const myMonthStats = computeComplianceStatsForMonth(nowForMine.getFullYear(), nowForMine.getMonth());
    const myTodayStatus = myTodayRecord ? myTodayRecord.status : null;
    const myTodayTime = (myTodayRecord && myTodayRecord.markedAt) ? new Date(myTodayRecord.markedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
    const myTodayCard = document.createElement('div');
    myTodayCard.className = 'att-summary' + (myTodayStatus === 'present' ? '' : myTodayStatus === 'absent' ? ' is-absent' : ' is-unmarked');
    myTodayCard.innerHTML = `
      <div class="att-summary-head">
        <div>
          <div class="att-summary-k">My attendance today</div>
          <div class="att-summary-v">${myTodayStatus === 'present' ? 'Present' : myTodayStatus === 'absent' ? 'Absent' : 'Not marked'}</div>
        </div>
        ${myTodayStatus === 'present' ? mdPill('Marked present' + (myTodayTime ? ' ' + myTodayTime : ''), 'good')
          : myTodayStatus === 'absent' ? mdPill('Marked absent', 'crit')
          : mdPill('Not marked yet', 'warn')}
      </div>
      <div class="att-summary-legend">
        <span>This month <b>${myMonthStats.hasAttendance ? myMonthStats.myAttendancePct + '%' : '—'}</b> of marked days</span>
        <span>Gate at first class start</span>
      </div>`;
    container.appendChild(myTodayCard);
    // Apply for leave + every request and its approval status —
    // js/render/teacher-leave.js.
    // If teacher.html doesn't load js/render/teacher-leave.js, load it here
    // on first use, so the section appears either way.
    if(typeof renderMyLeaveSection === 'function'){
      renderMyLeaveSection(container);
    } else {
      const leaveSlot = document.createElement('div');
      leaveSlot.innerHTML = '<p class="cap" style="margin-top:22px;">Loading your leave section…</p>';
      container.appendChild(leaveSlot);
      const renderInto = () => {
        if(typeof renderMyLeaveSection !== 'function'){
          leaveSlot.innerHTML = '<p class="cap" style="margin-top:22px; color:var(--crit,#d03b3b);">Could not load js/render/teacher-leave.js — check the file is in the js/render folder.</p>';
          return;
        }
        leaveSlot.innerHTML = '';
        renderMyLeaveSection(leaveSlot);
      };
      let tag = document.getElementById('teacherLeaveScript');
      if(!tag){
        tag = document.createElement('script');
        tag.id = 'teacherLeaveScript';
        tag.src = 'js/render/teacher-leave.js?v=' + Date.now();
        document.head.appendChild(tag);
      }
      tag.addEventListener('load', renderInto);
      tag.addEventListener('error', renderInto);
    }
    const calCard = document.createElement('div');
    calCard.className = 'card';
    calCard.style.padding = '22px';
    const dbdHeader = document.createElement('div');
    dbdHeader.innerHTML = `<p style="font-weight:600; margin:4px 0 2px;">${esc(monthName)} — day by day</p><p class="cap" style="margin-bottom:10px;">A blue Saturday is a working day with no children. The last Saturday is my monthly holiday and is not counted.</p>`;
    calCard.appendChild(dbdHeader);
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // convert Sun=0 to Mon-first layout
    const weekLabels = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:grid; grid-template-columns:repeat(7,1fr); gap:8px; margin-bottom:6px; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase;';
    headerRow.innerHTML = weekLabels.map(l => `<div>${l}</div>`).join('');
    calCard.appendChild(headerRow);
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(7,1fr); gap:8px;';
    for(let i = 0; i < startWeekday; i++) grid.appendChild(document.createElement('div'));
    for(let d = 1; d <= daysInMonth; d++){
      const dateObj = new Date(year, month, d);
      const dow = dateObj.getDay();
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayShort = dateObj.toLocaleDateString([], {weekday:'short'});
      const holidayName = complianceHolidayName(year, month, d);
      const record = records[dateStr];
      const cell = document.createElement('div');
      let bg = '#fff', pillHtml = '', bodyHtml = '';
      if(holidayName){
        bg = '#fdf1e3';
        bodyHtml = esc(holidayName);
      } else if(dow === 0){
        bg = '#f4f4f2';
        bodyHtml = 'Sunday';
      } else if(dow === 6 && isLastSaturday(year, month, d, daysInMonth)){
        bg = '#e8f1fb';
        bodyHtml = 'Last Saturday — monthly teacher holiday';
      } else if(dow === 6){
        bg = '#e8f1fb';
        bodyHtml = 'Saturday — teachers only, no children';
        pillHtml = record ? `<span class="pill ${record.status === 'present' ? 'good' : record.status === 'leave' ? 'info' : 'crit'}" style="margin-top:6px; display:inline-block;">${record.status === 'present' ? 'Present' : record.status === 'leave' ? 'On leave' : 'Absent'}</span>` : '';
      } else {
        pillHtml = record ? `<span class="pill ${record.status === 'present' ? 'good' : record.status === 'leave' ? 'info' : 'crit'}" style="display:inline-block;">${record.status === 'present' ? 'Present' : record.status === 'leave' ? 'On leave' : 'Absent'}</span>` : '';
      }
      cell.style.cssText = `background:${bg}; border:1px solid var(--border); border-radius:8px; padding:10px; min-height:70px; font-size:12px;`;
      cell.innerHTML = `<div style="font-weight:600; margin-bottom:4px;">${d} ${dayShort}</div><div class="dim" style="margin-bottom:4px;">${bodyHtml}</div>${pillHtml}`;
      grid.appendChild(cell);
    }
    calCard.appendChild(grid);
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex; flex-wrap:wrap; gap:16px; margin-top:12px; font-size:12px; color:var(--text-muted);';
    legend.innerHTML = `
      <span><i style="display:inline-block; width:10px; height:10px; background:#fff; border:1px solid var(--border); margin-right:5px; border-radius:2px;"></i>Children in school</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#e8f1fb; margin-right:5px; border-radius:2px;"></i>Saturday — teachers only, no children</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#f4f4f2; margin-right:5px; border-radius:2px;"></i>Sunday or monthly teacher holiday</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#fdf1e3; margin-right:5px; border-radius:2px;"></i>Declared holiday</span>
    `;
    calCard.appendChild(legend);
    container.appendChild(calCard);
    const summaryCard = mdCard(monthName + ' at a glance',
      'CAL-13 · counted against the same ' + teacherDays + ' teacher working days used above.',
      summaryBody);
    summaryCard.style.marginTop = '22px';
    container.appendChild(summaryCard);
  }
  // ---- Across the year — every month so far this academic year, side
  // by side, split out of renderComplianceCal into its own function. ----
  function renderComplianceAcrossYear(container, year, month, academicMonths){
    container.appendChild(mdSec('Across the year', '<span class="reqs">REP-10/11</span>'));
    const yearCard = document.createElement('div');
    yearCard.className = 'card';
    yearCard.style.padding = '22px';
    const now = new Date();
    const curIdx = academicMonths.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? academicMonths.slice(0, curIdx + 1) : academicMonths.slice(0, academicMonths.indexOf(month) + 1);
    let yearTable = `
      <h3 style="margin:0 0 6px;">Attendance and compliance month by month</h3>
      <p class="cap" style="margin:0 0 18px;">Every column names its denominator in the header, because two of the five use a different one.</p>
      <div class="report-table-wrap"><table class="report-table">
        <thead><tr>
          <th>Month</th><th>Student days</th><th>Teacher days</th>
          <th>My attendance % (teacher days)</th><th>Saturdays %</th>
          <th>Plans submitted % (student days)</th><th>Congruency %</th><th>Sessions confirmed %</th>
        </tr></thead><tbody>`;
    monthsSoFar.forEach(m => {
      const label = new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'});
      const sDays = studentDaysInMonth(year, m);
      const tDays = teacherWorkingDaysInMonth(year, m);
      const s = computeComplianceStatsForMonth(year, m);
      yearTable += `<tr>
        <td><b>${esc(label)}</b></td>
        <td>${sDays}</td>
        <td>${tDays}</td>
        <td>${pctBar(s.myAttendancePct, undefined, undefined, s.hasAttendance)}</td>
        <td>${pctBar(s.saturdayPct, 85, 60, s.hasSaturday)}</td>
        <td>${pctBar(s.plansSubmittedPct, undefined, undefined, s.hasPlans)}</td>
        <td>${pctBar(s.congruentPct, undefined, undefined, s.hasCongruency)}</td>
        <td>${pctBar(s.sessionsConfirmedPct, undefined, undefined, s.hasCongruency)}</td>
      </tr>`;
    });
    yearTable += '</tbody></table></div>';
    yearCard.innerHTML = yearTable;
    container.appendChild(yearCard);
    const yearNote = document.createElement('p');
    yearNote.className = 'cap';
    yearNote.style.cssText = 'margin-top:12px; border-left:3px solid var(--primary); padding-left:12px;';
    yearNote.innerHTML = `<b>What this page is not.</b> It is not a score. TCM-12 forbids these five being added together, and they are shown to the teacher first — before the supervisor sees them — because a compliance figure someone discovers on somebody else's screen is a figure they will start managing rather than acting on.`;
    container.appendChild(yearNote);
  }
  // ============================================================
  // ATTENDANCE DASHBOARD (Reports) — class-wide roll, attendance and
  // effective-strength reporting, month by month, plus a per-child
  // breakdown for the selected month. Built on the same real
  // attendanceRecords the Class Attendance → Attendance screen writes
  // to — now backed by the real daily_attendance table (fetched via
  // fetchAttendanceMonth, merged into the same in-memory object every
  // read site already uses) instead of localStorage, and the roster
  // itself reads the real pupils table (realPupilsCache) rather than
  // the old SAMPLE_STUDENTS placeholder.
  // ============================================================
  function countMarkedDatesInMonth(year, month){
    return Object.keys(attendanceRecords).filter(dateStr => {
      const d = new Date(dateStr + 'T00:00:00');
      if(isNaN(d) || d.getFullYear() !== year || d.getMonth() !== month) return false;
      const dow = d.getDay();
      if(dow === 0 || dow === 6) return false; // roll/attendance is weekday-only (children: Mon-Fri)
      const rec = attendanceRecords[dateStr];
      return rec && Object.keys(rec).length > 0;
    }).sort();
  }
  // Children actually on roll as of a given date — admitted on or
  // before it. Shared by the attendance dashboard's month-level roll
  // count and the admissions chart below, so both agree with the
  // day-level register filter above instead of three places computing
  // "who's enrolled" three different ways.
  function studentsOnRollAsOf(dateStr){
    if(!Array.isArray(realPupilsCache)) return [];
    return realPupilsCache.filter(p => !p.admitted_date || p.admitted_date <= dateStr).map(p => p.name);
  }
/* ===== teacher-part-05.js ===== */
/* =========================================================================
   teacher-part-05.js — part 5 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */
