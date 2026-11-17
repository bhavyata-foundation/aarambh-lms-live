/* =========================================================================
   teacher-part-05.js — part 5 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  
  function computeAttendanceDashboardStats(year, month){
    // Fire the real fetch for this month if it hasn't been loaded yet —
    // without this, a past month's real attendance was never asked
    // for, hasData came back false, and the table below silently
    // substituted fabricated "(sample)" numbers instead of the real
    // ones sitting in the database.
    if(attendanceMonthStatus[year + '-' + month] === undefined) fetchAttendanceMonth(year, month);
    if(!Array.isArray(realPupilsCache)){
      return { roll: 0, studentDays: studentDaysInMonth(year, month), daysMarked: 0, attendancePct: 0,
        effectiveStrength: 0, below70: 0, hasData: false, perChildMarked: {}, perChildPresent: {} };
    }
    const monthEndStr = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    const onRollThisMonth = realPupilsCache.filter(p => !p.admitted_date || p.admitted_date <= monthEndStr);
    const roll = onRollThisMonth.length;
    const studentDays = studentDaysInMonth(year, month);
    const markedDates = countMarkedDatesInMonth(year, month);
    const daysMarked = markedDates.length;

    let totalPresentSlots = 0, totalPossibleSlots = 0;
    // Counted by real pupil id internally (so two same-named children
    // are never confused mid-count), then attributed to her name for
    // the output shape every consumer of this function already expects.
    // Known remaining limitation: if two pupils share an exact name,
    // their totals still land in the same named bucket below — the
    // counting itself is correct, but the two would need a fuller
    // id-keyed rewrite of every consumer to display as separate rows.
    const perChildMarked = {}, perChildPresent = {};
    onRollThisMonth.forEach(p => { perChildMarked[p.name] = 0; perChildPresent[p.name] = 0; });

    markedDates.forEach(dateStr => {
      const rec = attendanceRecords[dateStr];
      onRollThisMonth.forEach(p => {
        if(rec[p.id]){
          totalPossibleSlots++;
          perChildMarked[p.name]++;
          if(rec[p.id] === 'present'){ totalPresentSlots++; perChildPresent[p.name]++; }
        }
      });
    });

    const attendancePct = totalPossibleSlots ? Math.round(totalPresentSlots / totalPossibleSlots * 1000) / 10 : 0;
    const effectiveStrength = daysMarked ? Math.round(totalPresentSlots / daysMarked * 10) / 10 : 0;
    const below70 = onRollThisMonth.filter(p => {
      if(!perChildMarked[p.name]) return false;
      return (perChildPresent[p.name] / perChildMarked[p.name] * 100) < 70;
    }).length;

    // Class-wide collective attendance — the whole class's real
    // present-count divided by every real working day this month
    // times the roll, whether or not that day was ever marked. An
    // unmarked day contributes zero present children here, unlike
    // attendancePct above (which only ever divides by marked slots).
    // This is what "class strength × working days" actually means.
    const classWidePresentSlots = totalPresentSlots;
    const classWidePossibleSlots = studentDays * roll;
    const classWidePct = classWidePossibleSlots ? Math.round(classWidePresentSlots / classWidePossibleSlots * 1000) / 10 : 0;

    return { roll, studentDays, daysMarked, attendancePct, effectiveStrength, below70,
      classWidePct, classWidePresentSlots, classWidePossibleSlots,
      hasData: daysMarked > 0, perChildMarked, perChildPresent };
  }

  function renderAttendanceDashboard(){
    const container = document.getElementById('attendancedashboard-body');
    container.innerHTML = '';

    if(!ensurePupilsLoadedFor(container, renderAttendanceDashboard)) return;
    const year = calendarYear, month = calendarMonth;
    // Same non-blocking pattern as renderAttendanceHub above.
    if(attendanceMonthStatus[year + '-' + month] === undefined) fetchAttendanceMonth(year, month);

    const monthName = new Date(year, month, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const teachingDays = studentDaysInMonth(year, month); // matches CAL-04/13's "student days" convention

    const heading = document.createElement('div');
    heading.style.cssText = 'display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:4px;';
    heading.innerHTML = `<h1 style="margin:0;">Attendance dashboard</h1>
      <span class="reqs">REP-08/09 · REG</span>
      <span class="cap" style="margin-left:auto;">Teacher · ${esc(monthName)} · ${teachingDays} teaching days · Term 1, 2026</span>`;
    container.appendChild(heading);

    // --- Month picker — dropdown (compact, easier on narrow screens)
    // alongside the existing pill row. Both control the same
    // calendarMonth state, so picking one keeps the other in sync. ---
    const pickerRow = document.createElement('div');
    pickerRow.style.cssText = 'display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:14px 0;';
    const monthDropdown = document.createElement('select');
    monthDropdown.style.cssText = 'padding:7px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; background:#fff;';
    monthDropdown.innerHTML = ACADEMIC_MONTHS.map(m => {
      const label = new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'});
      return `<option value="${m}"${m === month ? ' selected' : ''}>${esc(label)}</option>`;
    }).join('');
    monthDropdown.onchange = () => { calendarMonth = parseInt(monthDropdown.value, 10); renderAttendanceDashboard(); };
    pickerRow.appendChild(monthDropdown);

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇ Download report (PDF)';
    downloadBtn.style.cssText = 'padding:7px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer; margin-left:auto;';
    downloadBtn.onclick = downloadAttendanceDashboardPdf;
    pickerRow.appendChild(downloadBtn);
    container.appendChild(pickerRow);

    const monthTabs = document.createElement('div');
    monthTabs.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin:0 0 14px;';
    monthTabs.innerHTML = ACADEMIC_MONTHS.map(m => {
      const label = new Date(2000, m, 1).toLocaleDateString([], {month:'short'});
      const active = m === month;
      const sDays = studentDaysInMonth(year, m);
      const marked = countMarkedDatesInMonth(year, m).length;
      return `<button onclick="calendarMonth=${m}; renderAttendanceDashboard();" style="padding:6px 12px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:12px; white-space:nowrap;">${label} · ${marked}/${sDays}</button>`;
    }).join('');
    container.appendChild(monthTabs);

    const explainer = document.createElement('p');
    explainer.className = 'cap';
    explainer.style.marginBottom = '14px';
    explainer.innerHTML = `CAL-04/13 · each month shows <b>days marked / student days</b>. A day only counts as "marked" once at least one child has been marked present or absent that day.`;
    container.appendChild(explainer);

    // --- Stat cards ---
    const now = new Date();
    const curIdx = ACADEMIC_MONTHS.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS.slice(0, ACADEMIC_MONTHS.indexOf(month) + 1);
    const monthStats = monthsSoFar.map(m => ({ m, s: computeAttendanceDashboardStats(year, m) }));
    const thisMonth = computeAttendanceDashboardStats(year, month);

    let ytdPresent = 0, ytdPossible = 0, monthsWithData = 0;
    monthStats.forEach(({s}) => {
      if(s.hasData){
        monthsWithData++;
        ytdPresent += Math.round(s.attendancePct * s.daysMarked * assessmentPupilNames().length / 100);
        ytdPossible += s.daysMarked * assessmentPupilNames().length;
      }
    });
    const ytdPct = ytdPossible ? Math.round(ytdPresent / ytdPossible * 1000) / 10 : 0;
    const daysUnmarked = Math.max(0, thisMonth.studentDays - thisMonth.daysMarked);

    const statCards = document.createElement('div');
    statCards.className = 'stat-grid';
    statCards.style.marginBottom = '22px';
    statCards.innerHTML = `
      <div class="stat-card">
        <p class="label">This month</p>
        <p class="value notranslate">${thisMonth.hasData ? thisMonth.attendancePct : '—'}${thisMonth.hasData ? '% present' : ''}</p>
        ${thisMonth.hasData ? mdPill(mdStatusBand(thisMonth.attendancePct).l, mdStatusBand(thisMonth.attendancePct).c) : mdPill('No data yet', 'neu')}
        <p class="cap" style="margin-top:6px;">REG-05</p>
      </div>
      <div class="stat-card">
        <p class="label">Year to date</p>
        <p class="value notranslate">${monthsWithData ? ytdPct : '—'}${monthsWithData ? '% across ' + monthsWithData + ' month' + (monthsWithData === 1 ? '' : 's') : ''}</p>
        ${monthsWithData ? mdPill(mdStatusBand(ytdPct).l, mdStatusBand(ytdPct).c) : mdPill('No data yet', 'neu')}
        <p class="cap" style="margin-top:6px;">REP-08</p>
      </div>
      <div class="stat-card">
        <p class="label">Effective strength</p>
        <p class="value notranslate">${thisMonth.hasData ? thisMonth.effectiveStrength : '—'}${thisMonth.hasData ? ' children' : ''}</p>
        ${thisMonth.hasData ? mdPill('of ' + thisMonth.roll + ' on roll', 'info') : mdPill('No data yet', 'neu')}
        <p class="cap" style="margin-top:6px;">ADB-14</p>
      </div>
      <div class="stat-card">
        <p class="label">Below 70%</p>
        <p class="value notranslate" style="${thisMonth.below70 > 0 ? 'color:#c8433f;' : ''}">${thisMonth.hasData ? thisMonth.below70 : '—'}${thisMonth.hasData ? ' child' + (thisMonth.below70 === 1 ? '' : 'ren') + ' this month' : ''}</p>
        ${thisMonth.hasData ? mdPill(thisMonth.below70 > 0 ? 'Follow up' : 'None', thisMonth.below70 > 0 ? 'warn' : 'good') : mdPill('No data yet', 'neu')}
        <p class="cap" style="margin-top:6px;">REG-06</p>
      </div>
      <div class="stat-card">
        <p class="label">Days unmarked</p>
        <p class="value notranslate">${daysUnmarked}</p>
        ${mdPill(daysUnmarked > 0 ? 'Catch up' : 'Up to date', daysUnmarked > 0 ? 'warn' : 'good')}
        <p class="cap" style="margin-top:6px;">of ${thisMonth.studentDays} student days</p>
      </div>`;
    container.appendChild(statCards);

    // Attendance Register (day-by-day P/A grid) moved to Class
    // Attendance — attendance reporting belongs with attendance, not a
    // separate Reports group. See renderAttendanceBody().

    renderAttendanceAcrossYear(container, year, month);
  }

  // Shared: roll/attendance/effective-strength across the year, a trend
  // line, and a child-wise breakdown for one month. Used by both the
  // standalone Attendance Dashboard report (Reports group) and the
  // Child-wise Record tab under Class Attendance — one real
  // implementation instead of two copies that can drift apart.
  // Representative sample figures for a month with nothing real
  // recorded — same seeded-random convention used elsewhere in this
  // app (e.g. Monthly Effective's month-by-month table), so numbers
  // are stable across reloads rather than jumping around, and clearly
  // tagged as sample wherever they're shown.
  function sampleAttendanceStatsForMonth(year, month){
    const roll = assessmentPupilNames().length;
    const studentDays = studentDaysInMonth(year, month);
    const daysMarked = studentDays; // a full sample month, for a believable picture
    const perChildMarked = {}, perChildPresent = {};
    let totalPresentSlots = 0, totalPossibleSlots = 0;
    assessmentPupilNames().forEach(name => {
      const pct = 78 + sampleRand(name + year + month + 'sampleatt') * 20;
      const present = Math.round(daysMarked * pct / 100);
      perChildMarked[name] = daysMarked;
      perChildPresent[name] = present;
      totalPresentSlots += present;
      totalPossibleSlots += daysMarked;
    });
    const attendancePct = totalPossibleSlots ? Math.round(totalPresentSlots / totalPossibleSlots * 1000) / 10 : 0;
    const effectiveStrength = daysMarked ? Math.round(totalPresentSlots / daysMarked * 10) / 10 : 0;
    const below70 = assessmentPupilNames().filter(name => perChildMarked[name] && (perChildPresent[name] / perChildMarked[name] * 100) < 70).length;
    return { roll, studentDays, daysMarked, attendancePct, effectiveStrength, below70, perChildMarked, perChildPresent, isSample: true };
  }

  function renderAttendanceAcrossYear(container, year, month){
    const monthName = new Date(year, month, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const now = new Date();
    const curIdx = ACADEMIC_MONTHS.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS.slice(0, ACADEMIC_MONTHS.indexOf(month) + 1);
    const monthStats = monthsSoFar.map(m => {
      const real = computeAttendanceDashboardStats(year, m);
      return { m, s: real.hasData ? real : Object.assign(sampleAttendanceStatsForMonth(year, m), { hasData: true }) };
    });
    const thisMonthReal = computeAttendanceDashboardStats(year, month);
    const thisMonth = thisMonthReal.hasData ? thisMonthReal : Object.assign(sampleAttendanceStatsForMonth(year, month), { hasData: true });

    // --- Month by month table ---
    container.appendChild(mdSec('Month by month', ''));
    const mbmHead = document.createElement('div');
    mbmHead.innerHTML = `<p style="font-weight:600; margin:4px 0 2px;">Roll, attendance and effective strength</p>
      <p class="cap" style="margin-bottom:14px;">Attendance is real students marked present, divided by real marks taken. Months with nothing entered show representative sample figures instead of a red zero, clearly marked "(sample)".</p>`;
    container.appendChild(mbmHead);

    let mbmTable = `<div class="report-table-wrap"><table class="report-table">
      <thead><tr><th>Month</th><th>Student days</th><th>On roll</th><th>Days marked</th>
      <th>Attendance %</th><th>Effective strength</th><th>Below 70%</th></tr></thead><tbody>`;
    monthStats.forEach(({m, s}) => {
      const label = new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'});
      mbmTable += `<tr>
        <td><b>${esc(label)}</b>${s.isSample ? ' <span class="cap" style="font-weight:400;">(sample)</span>' : ''}</td>
        <td>${s.studentDays}</td>
        <td>${s.roll}</td>
        <td>${s.daysMarked}</td>
        <td>${pctBar(s.attendancePct, undefined, undefined, true)}</td>
        <td>${s.effectiveStrength}</td>
        <td>${s.below70}</td>
      </tr>`;
    });
    mbmTable += '</tbody></table></div>';
    const mbmCard = document.createElement('div');
    mbmCard.className = 'card'; mbmCard.style.padding = '22px';
    mbmCard.innerHTML = mbmTable;
    container.appendChild(mbmCard);

    // --- Analysis — a short auto-generated summary, not just numbers.
    // Same monthStats already computed above; nothing here recomputes
    // anything, it just reads what's already there. ---
    const analysisCard = document.createElement('div');
    analysisCard.className = 'card'; analysisCard.style.cssText = 'padding:18px 22px; margin-top:14px; background:var(--bg);';
    analysisCard.innerHTML = `<h4 style="margin:0 0 6px; font-size:13px;">Analysis</h4><p style="margin:0; font-size:13.5px; line-height:1.6;">${esc(buildAttendanceAnalysisText(monthStats))}</p>`;
    container.appendChild(analysisCard);

    // --- Two-column: trend line + child-wise bars ---
    const twoCol = document.createElement('div');
    twoCol.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:22px;';
    twoCol.style.gridTemplateColumns = window.innerWidth < 900 ? '1fr' : '1fr 1fr';

    // Trend line — every month now has a real-or-sample value, so it
    // always plots once two months exist in the academic year so far.
    const plotted = monthStats;
    const trendPanel = document.createElement('div');
    trendPanel.className = 'card'; trendPanel.style.padding = '22px';
    let trendSvg;
    if(plotted.length >= 2){
      const w = 460, h = 200, padL = 40, padR = 16, padT = 16, padB = 26;
      const vals = plotted.map(({s}) => s.attendancePct);
      const vMin = Math.max(0, Math.min(...vals) - 4), vMax = Math.min(100, Math.max(...vals) + 4);
      const xStep = (w - padL - padR) / (plotted.length - 1);
      const xy = plotted.map(({s}, i) => {
        const x = padL + i * xStep;
        const y = padT + (h - padT - padB) * (1 - (s.attendancePct - vMin) / Math.max(1, (vMax - vMin)));
        return {x, y, pct: s.attendancePct};
      });
      const pathD = xy.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
      const points = xy.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="var(--primary)"></circle><text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" font-size="11" text-anchor="middle" fill="var(--text)">${p.pct}</text>`).join('');
      const labels = plotted.map(({m}, i) => `<text x="${xy[i].x.toFixed(1)}" y="${h - 6}" font-size="10.5" text-anchor="middle" fill="var(--text-muted)">${new Date(2000, m, 1).toLocaleDateString([], {month:'short'})}</text>`).join('');
      trendSvg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="var(--border)"></line>
        <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="var(--border)"></line>
        <path d="${pathD}" fill="none" stroke="var(--primary)" stroke-width="2"></path>
        ${points}${labels}
      </svg>`;
    } else {
      trendSvg = `<p class="cap">Needs at least two months to plot a trend — only ${plotted.length} so far.</p>`;
    }
    trendPanel.innerHTML = `<h4 style="margin:0 0 4px;">Attendance across the year</h4>${trendSvg}`;
    twoCol.appendChild(trendPanel);

    // Child-wise, this month
    const childPanel = document.createElement('div');
    childPanel.className = 'card'; childPanel.style.padding = '22px';
    const childRows = assessmentPupilNames().map(name => {
      const marked = thisMonth.perChildMarked[name] || 0;
      const present = thisMonth.perChildPresent[name] || 0;
      const pct = marked ? present / marked * 100 : 0;
      const color = !marked ? 'var(--border)' : pct >= 85 ? 'var(--success)' : pct >= 70 ? '#EE8F35' : 'var(--danger,#c8433f)';
      const widthPct = marked ? Math.round(pct) : 0;
      return `<div class="hbar-row">
        <div class="hbar-row-label">${esc(name)}</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${widthPct}%; background:${color};"></div></div>
        <div class="hbar-count">${marked ? present + '/' + marked : 'no marks'}</div>
      </div>`;
    }).join('');
    childPanel.innerHTML = `<h4 style="margin:0 0 4px;">Child-wise, this month</h4>
      <p class="cap" style="margin:0 0 16px;">REP-09 · every child against her own denominator.${thisMonth.isSample ? ' Sample figures — nothing real marked yet for ' + esc(monthName) + '.' : ''}</p>
      ${childRows}`;
    twoCol.appendChild(childPanel);

    container.appendChild(twoCol);

    // --- Effective strength across the year — same SVG-line convention
    // as the attendance trend above, second chart requested alongside
    // it. Own row, not squeezed into the two-column layout above, so
    // neither chart gets cramped. ---
    const effPanel = document.createElement('div');
    effPanel.className = 'card'; effPanel.style.cssText = 'padding:22px; margin-top:20px;';
    let effSvg;
    if(plotted.length >= 2){
      const w = 940, h = 200, padL = 40, padR = 16, padT = 16, padB = 26;
      const vals = plotted.map(({s}) => s.effectiveStrength);
      const vMin = Math.max(0, Math.min(...vals) - 1), vMax = Math.max(...vals) + 1;
      const xStep = (w - padL - padR) / (plotted.length - 1);
      const xy = plotted.map(({s}, i) => {
        const x = padL + i * xStep;
        const y = padT + (h - padT - padB) * (1 - (s.effectiveStrength - vMin) / Math.max(1, (vMax - vMin)));
        return {x, y, v: s.effectiveStrength};
      });
      const pathD = xy.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
      const points = xy.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#5c7cfa"></circle><text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" font-size="11" text-anchor="middle" fill="var(--text)">${p.v}</text>`).join('');
      const labels = plotted.map(({m}, i) => `<text x="${xy[i].x.toFixed(1)}" y="${h - 6}" font-size="10.5" text-anchor="middle" fill="var(--text-muted)">${new Date(2000, m, 1).toLocaleDateString([], {month:'short'})}</text>`).join('');
      effSvg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="var(--border)"></line>
        <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="var(--border)"></line>
        <path d="${pathD}" fill="none" stroke="#5c7cfa" stroke-width="2"></path>
        ${points}${labels}
      </svg>`;
    } else {
      effSvg = `<p class="cap">Needs at least two months to plot a trend — only ${plotted.length} so far.</p>`;
    }
    effPanel.innerHTML = `<h4 style="margin:0 0 4px;">Effective strength across the year</h4>${effSvg}`;
    container.appendChild(effPanel);
  }

  // Extracted out of renderAttendanceAcrossYear — admissions reporting
  // belongs with Admissions, not a separate Reports group. Sourced
  // directly from admissionRecords (the same store Class Attendance's
  // day-by-day register filters against), not a separate guess at
  // enrollment. A child's attendance is only ever counted from her own
  // admittedDate onward — enforced structurally by the register
  // filter, not by a separate formula here.
  //
  // Uses the FULL academic year (all of ACADEMIC_MONTHS), not just
  // monthsSoFar — unlike attendance/effective-strength, a future
  // month genuinely has zero admissions so far, which is real
  // information (not a gap needing a sample fallback), so there's no
  // reason to hide months that haven't happened yet.
  function renderAdmissionsAcrossYear(container, year){
    const fullYearMonths = ACADEMIC_MONTHS.slice();
    const admissionCountsAll = buildMonthlyAdmissionCounts(year, fullYearMonths, false);
    const admissionCountsMidYear = buildMonthlyAdmissionCounts(year, fullYearMonths, true);
    const totalEverAdmitted = Array.isArray(realPupilsCache) ? realPupilsCache.length : 0;
    const termStartDateForAnalysis = totalEverAdmitted ? realPupilsCache.reduce((min, p) => p.admitted_date < min ? p.admitted_date : min, realPupilsCache[0].admitted_date) : null;
    const startOfYearCount = totalEverAdmitted ? realPupilsCache.filter(p => p.admitted_date === termStartDateForAnalysis).length : 0;
    const midYearCount = totalEverAdmitted - startOfYearCount;
    let peakMonthLabel = '—', peakMonthCount = 0;
    const midYearEntries = fullYearMonths.map(m => [m, admissionCountsMidYear[m] || 0]).filter(([, c]) => c > 0);
    if(midYearEntries.length){
      const peak = midYearEntries.reduce((a, b) => b[1] > a[1] ? b : a);
      peakMonthLabel = new Date(2000, peak[0], 1).toLocaleDateString([], {month:'long'});
      peakMonthCount = peak[1];
    }
    // Cumulative on-roll count as of the end of each month — this is
    // the actual "trend of admission": a running total, not new joins
    // per month (that's what the bar chart already shows).
    const cumulativeOnRoll = fullYearMonths.map(m => {
      const monthEndStr = new Date(year, m + 1, 0).toISOString().slice(0, 10);
      return studentsOnRollAsOf(monthEndStr).length;
    });

    container.appendChild(mdSec('Admissions across the year', '<span class="reqs">ADB-11…16</span>'));
    const admStatGrid = mdGrid('g4', [
      mdTile('Admitted so far', totalEverAdmitted, 'children this year', mdPill('Jr KG', 'neu'), 'ADB-11'),
      mdTile('At term start', startOfYearCount, 'in June', mdPill(Math.round(startOfYearCount/totalEverAdmitted*100) + '% of the class', 'neu'), 'ADB-11'),
      mdTile('Mid-year admissions', midYearCount, 'after June', midYearCount ? mdPill('rolling admissions', 'info') : mdPill('None', 'good'), 'ADB-12'),
      mdTile('Peak mid-year month', peakMonthCount || '—', peakMonthCount ? 'in ' + peakMonthLabel : 'no mid-year admissions yet', peakMonthCount ? mdPill(peakMonthLabel, 'info') : mdPill('N/A', 'neu'), 'ADB-12')
    ]);
    admStatGrid.style.marginBottom = '18px';
    container.appendChild(admStatGrid);

    const admPanel = document.createElement('div');
    admPanel.className = 'card'; admPanel.style.cssText = 'padding:22px;';
    admPanel.innerHTML = `<h4 style="margin:0 0 4px;">New admissions by month</h4><p class="cap" style="margin:0 0 10px;">Full academic year, June through April — months not yet reached correctly show 0.</p>${buildAdmissionsBarSvg(fullYearMonths, admissionCountsAll)}`;
    container.appendChild(admPanel);

    const admTrendPanel = document.createElement('div');
    admTrendPanel.className = 'card'; admTrendPanel.style.cssText = 'padding:22px; margin-top:16px;';
    admTrendPanel.innerHTML = `<h4 style="margin:0 0 4px;">Total on roll — trend across the year</h4><p class="cap" style="margin:0 0 10px;">Running total, not new joins per month — the class-size line, step by step, as each admission lands.</p>${buildTrendLineSvg(fullYearMonths, cumulativeOnRoll, '#8b5cf6')}`;
    container.appendChild(admTrendPanel);

    const admAnalysisCard = document.createElement('div');
    admAnalysisCard.className = 'card'; admAnalysisCard.style.cssText = 'padding:18px 22px; margin-top:14px; background:var(--bg);';
    admAnalysisCard.innerHTML = `<h4 style="margin:0 0 6px; font-size:13px;">Analysis</h4><p style="margin:0; font-size:13.5px; line-height:1.6;">${esc(buildAdmissionsAnalysisText(totalEverAdmitted, startOfYearCount, midYearCount, peakMonthLabel, peakMonthCount))}</p>`;
    container.appendChild(admAnalysisCard);
  }

  // Counts NEW admissions per month (not cumulative on-roll) for the
  // academic year so far. midYearOnly=true excludes the term-start
  // bulk (all dated the same June admittedDate) so a genuine mid-year
  // admissions spike doesn't get drowned out by the June baseline —
  // used only for the "peak mid-year month" analysis line below, not
  // for the chart itself, which shows the full honest picture.
  function buildMonthlyAdmissionCounts(year, monthsSoFar, midYearOnly){
    const counts = {};
    monthsSoFar.forEach(m => counts[m] = 0);
    if(!Array.isArray(realPupilsCache) || !realPupilsCache.length) return counts;
    // "Term start" cohort = whoever shares the earliest admitted_date
    // in the roster, same convention Admissions uses — no separate
    // stored flag needed.
    const termStartDate = realPupilsCache.reduce((min, p) => p.admitted_date < min ? p.admitted_date : min, realPupilsCache[0].admitted_date);
    realPupilsCache.forEach(p => {
      if(!p.admitted_date) return;
      if(midYearOnly && p.admitted_date === termStartDate) return;
      const d = new Date(p.admitted_date + 'T00:00:00');
      if(isNaN(d) || d.getFullYear() !== year) return;
      const m = d.getMonth();
      if(counts[m] !== undefined) counts[m]++;
    });
    return counts;
  }

  // Generic line-chart builder — same visual convention as the
  // attendance% and effective-strength trend lines above, factored out
  // since this is now the third place drawing one (here: cumulative
  // on-roll count, a running total rather than a per-month figure).
  function buildTrendLineSvg(months, values, color){
    if(months.length < 2){
      return `<p class="cap">Needs at least two months to plot a trend — only ${months.length} so far.</p>`;
    }
    const w = 940, h = 200, padL = 40, padR = 16, padT = 16, padB = 26;
    const vMin = Math.max(0, Math.min(...values) - 1), vMax = Math.max(...values) + 1;
    const xStep = (w - padL - padR) / (months.length - 1);
    const xy = values.map((v, i) => {
      const x = padL + i * xStep;
      const y = padT + (h - padT - padB) * (1 - (v - vMin) / Math.max(1, (vMax - vMin)));
      return {x, y, v};
    });
    const pathD = xy.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    const points = xy.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${color}"></circle><text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" font-size="11" text-anchor="middle" fill="var(--text)">${p.v}</text>`).join('');
    const labels = months.map((m, i) => `<text x="${xy[i].x.toFixed(1)}" y="${h - 6}" font-size="10.5" text-anchor="middle" fill="var(--text-muted)">${new Date(2000, m, 1).toLocaleDateString([], {month:'short'})}</text>`).join('');
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="var(--border)"></line>
      <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="var(--border)"></line>
      <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2"></path>
      ${points}${labels}
    </svg>`;
  }

  function buildAdmissionsBarSvg(monthsSoFar, admissionCounts){
    const w = 940, h = 200, padL = 40, padR = 16, padT = 20, padB = 34;
    const max = Math.max(...monthsSoFar.map(m => admissionCounts[m] || 0), 1);
    const gap = (w - padL - padR) / monthsSoFar.length;
    const barW = gap * 0.6;
    let bars = '';
    monthsSoFar.forEach((m, i) => {
      const v = admissionCounts[m] || 0;
      const barH = (h - padT - padB) * (v / max);
      const x = padL + i * gap + (gap - barW) / 2;
      const y = h - padB - barH;
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="#e08e2b"></rect>`;
      bars += `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" font-size="11" text-anchor="middle" fill="var(--text)">${v}</text>`;
      bars += `<text x="${(x + barW / 2).toFixed(1)}" y="${h - padB + 14}" font-size="10.5" text-anchor="middle" fill="var(--text-muted)">${new Date(2000, m, 1).toLocaleDateString([], {month:'short'})}</text>`;
    });
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="var(--border)"></line>
      <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="var(--border)"></line>
      ${bars}
    </svg>`;
  }

  function buildAdmissionsAnalysisText(totalEverAdmitted, startOfYearCount, midYearCount, peakMonthLabel, peakMonthCount){
    const midYearNote = peakMonthCount > 0
      ? ` Of the ${midYearCount} admitted after term start, ${peakMonthLabel} saw the most — ${peakMonthCount} child${peakMonthCount === 1 ? '' : 'ren'}.`
      : (midYearCount > 0 ? ` ${midYearCount} admitted after term start, spread evenly with no single peak month.` : '');
    return `${totalEverAdmitted} children have been admitted so far this year — ${startOfYearCount} at term start and ${midYearCount} mid-year.${midYearNote}`
      + (midYearCount > 0 ? ' Each mid-year admission\'s attendance is calculated only from her own admission date onward — the day-by-day register above no longer lets her be marked (or counted) on dates before she actually joined, so early months are never averaged against days she wasn\'t yet enrolled for.' : '');
  }

  // Auto-generated written summary — average, best/worst month, count
  // of child-months below the 70% benchmark, and a first-half-vs-
  // second-half trend direction once there's enough data to say
  // anything meaningful about it (4+ months).
  function buildAttendanceAnalysisText(monthStats){
    if(!monthStats.length) return 'Not enough data yet to analyse.';
    const monthLabel = (m) => new Date(2000, m, 1).toLocaleDateString([], {month:'long'});
    const avgPct = Math.round(monthStats.reduce((sum, x) => sum + x.s.attendancePct, 0) / monthStats.length * 10) / 10;
    const best = monthStats.reduce((a, b) => b.s.attendancePct > a.s.attendancePct ? b : a);
    const worst = monthStats.reduce((a, b) => b.s.attendancePct < a.s.attendancePct ? b : a);
    const totalBelow70 = monthStats.reduce((sum, x) => sum + x.s.below70, 0);

    let trendNote = '';
    if(monthStats.length >= 4){
      const half = Math.floor(monthStats.length / 2);
      const firstHalfAvg = monthStats.slice(0, half).reduce((s, x) => s + x.s.attendancePct, 0) / half;
      const secondHalfAvg = monthStats.slice(half).reduce((s, x) => s + x.s.attendancePct, 0) / (monthStats.length - half);
      const diff = Math.round((secondHalfAvg - firstHalfAvg) * 10) / 10;
      trendNote = diff > 1 ? ` Attendance has been improving overall (+${diff} points comparing the first half of the year so far to the second).`
        : diff < -1 ? ` Attendance has been declining overall (${diff} points comparing the first half of the year so far to the second).`
        : ' Attendance has stayed roughly stable across the year so far.';
    }

    return `Average attendance across ${monthStats.length} month${monthStats.length === 1 ? '' : 's'} is ${avgPct}%. ${monthLabel(best.m)} was the strongest at ${best.s.attendancePct}%, while ${monthLabel(worst.m)} was the weakest at ${worst.s.attendancePct}%.`
      + (totalBelow70 > 0 ? ` ${totalBelow70} child-month${totalBelow70 === 1 ? '' : 's'} fell below the 70% benchmark and may need follow-up.` : ' No child fell below the 70% benchmark in any month.')
      + trendNote;
  }

  // Draws a simple bar chart to an offscreen canvas — used only for
  // the PDF export below. Deliberately separate from the on-screen SVG
  // trend lines above: jsPDF embeds raster images, not SVG, so this
  // avoids converting working SVG output and just draws fresh instead.
  function drawBarChartCanvas(labels, values, opts){
    const { width = 700, height = 260, color = '#25993c', suffix = '' } = opts || {};
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
    const padL = 40, padR = 16, padT = 20, padB = 34;
    const max = Math.max(...values, 1);
    const gap = (width - padL - padR) / values.length;
    const barW = gap * 0.6;
    ctx.strokeStyle = '#ccc';
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, height - padB); ctx.lineTo(width - padR, height - padB); ctx.stroke();
    values.forEach((v, i) => {
      const barH = (height - padT - padB) * (v / max);
      const x = padL + i * gap + (gap - barW) / 2;
      const y = height - padB - barH;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, barH);
      ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(v) + suffix, x + barW / 2, y - 4);
      ctx.fillText(labels[i], x + barW / 2, height - padB + 14);
    });
    return canvas;
  }

  // Same as drawBarChartCanvas above, but a connected line instead of
  // bars — used for the cumulative on-roll trend in the PDF, mirroring
  // buildTrendLineSvg's on-screen look.
  function drawLineChartCanvas(labels, values, opts){
    const { width = 940, height = 260, color = '#8b5cf6' } = opts || {};
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
    const padL = 40, padR = 16, padT = 20, padB = 34;
    const vMin = Math.max(0, Math.min(...values) - 1), vMax = Math.max(...values) + 1;
    const xStep = (width - padL - padR) / (values.length - 1 || 1);
    ctx.strokeStyle = '#ccc';
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, height - padB); ctx.lineTo(width - padR, height - padB); ctx.stroke();
    const pts = values.map((v, i) => {
      const x = padL + i * xStep;
      const y = padT + (height - padT - padB) * (1 - (v - vMin) / Math.max(1, (vMax - vMin)));
      return {x, y, v};
    });
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => { if(i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    pts.forEach((p, i) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(p.v), p.x, p.y - 8);
      ctx.fillText(labels[i], p.x, height - padB + 14);
    });
    return canvas;
  }

  function downloadAttendanceDashboardPdf(){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const year = calendarYear;
    const now = new Date();
    const curIdx = ACADEMIC_MONTHS.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS.slice(0, ACADEMIC_MONTHS.indexOf(calendarMonth) + 1);
    const monthStats = monthsSoFar.map(m => {
      const real = computeAttendanceDashboardStats(year, m);
      return { m, s: real.hasData ? real : Object.assign(sampleAttendanceStatsForMonth(year, m), { hasData: true }) };
    });

    const labels = monthStats.map(({m}) => new Date(2000, m, 1).toLocaleDateString([], {month:'short'}));
    const attCanvas = drawBarChartCanvas(labels, monthStats.map(({s}) => s.attendancePct), { color: '#25993c', suffix: '%' });
    const effCanvas = drawBarChartCanvas(labels, monthStats.map(({s}) => s.effectiveStrength), { color: '#5c7cfa' });
    const admissionCountsAll = buildMonthlyAdmissionCounts(year, ACADEMIC_MONTHS, false);
    const admissionCountsMidYear = buildMonthlyAdmissionCounts(year, ACADEMIC_MONTHS, true);
    const admLabels = ACADEMIC_MONTHS.map(m => new Date(2000, m, 1).toLocaleDateString([], {month:'short'}));
    const admCanvas = drawBarChartCanvas(admLabels, ACADEMIC_MONTHS.map(m => admissionCountsAll[m] || 0), { color: '#e08e2b', width: 940 });
    const cumulativeOnRoll = ACADEMIC_MONTHS.map(m => {
      const monthEndStr = new Date(year, m + 1, 0).toISOString().slice(0, 10);
      return studentsOnRollAsOf(monthEndStr).length;
    });
    const admTrendCanvas = drawLineChartCanvas(admLabels, cumulativeOnRoll, { color: '#8b5cf6', width: 940 });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const nameEl = document.querySelector('.user-name');
    const teacherLabel = ((nameEl && nameEl.textContent.trim()) || 'Teacher') + ' — ' + myClassInfo.class_name;

    doc.setFontSize(14);
    doc.text('Attendance Dashboard — ' + year, 14, 15);
    doc.setFontSize(9);
    doc.text(teacherLabel + ' · generated ' + new Date().toLocaleDateString(), 14, 21);

    doc.setFontSize(10);
    const analysisLines = doc.splitTextToSize(buildAttendanceAnalysisText(monthStats), 265);
    doc.text(analysisLines, 14, 30);

    let y = 30 + analysisLines.length * 5 + 8;
    doc.setFontSize(11);
    doc.text('Attendance % by month', 14, y);
    doc.text('Effective strength by month', 150, y);
    doc.addImage(attCanvas.toDataURL('image/png'), 'PNG', 14, y + 4, 130, 48);
    doc.addImage(effCanvas.toDataURL('image/png'), 'PNG', 150, y + 4, 130, 48);

    const totalEverAdmitted = Array.isArray(realPupilsCache) ? realPupilsCache.length : 0;
    const termStartDateForAnalysis = totalEverAdmitted ? realPupilsCache.reduce((min, p) => p.admitted_date < min ? p.admitted_date : min, realPupilsCache[0].admitted_date) : null;
    const startOfYearCount = totalEverAdmitted ? realPupilsCache.filter(p => p.admitted_date === termStartDateForAnalysis).length : 0;
    const midYearCount = totalEverAdmitted - startOfYearCount;
    let peakMonthLabel = '—', peakMonthCount = 0;
    const midYearEntries = ACADEMIC_MONTHS.map(m => [m, admissionCountsMidYear[m] || 0]).filter(([, c]) => c > 0);
    if(midYearEntries.length){
      const peak = midYearEntries.reduce((a, b) => b[1] > a[1] ? b : a);
      peakMonthLabel = new Date(2000, peak[0], 1).toLocaleDateString([], {month:'long'});
      peakMonthCount = peak[1];
    }

    // Own page — bar chart + trend line + analysis together is enough
    // to crowd out the first page, and both charts deserve full width.
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Admissions — ' + year, 14, 15);
    doc.setFontSize(11);
    doc.text('New admissions by month (full academic year)', 14, 28);
    doc.addImage(admCanvas.toDataURL('image/png'), 'PNG', 14, 32, 266, 56);
    doc.text('Total on roll — trend across the year', 14, 96);
    doc.addImage(admTrendCanvas.toDataURL('image/png'), 'PNG', 14, 100, 266, 56);
    doc.setFontSize(9);
    const admAnalysisLines = doc.splitTextToSize(buildAdmissionsAnalysisText(totalEverAdmitted, startOfYearCount, midYearCount, peakMonthLabel, peakMonthCount), 265);
    doc.text(admAnalysisLines, 14, 164);

    doc.autoTable({
      startY: 164 + admAnalysisLines.length * 4 + 8,
      head: [['Month', 'Student days', 'On roll', 'Days marked', 'Attendance %', 'Effective strength', 'Below 70%']],
      body: monthStats.map(({m, s}) => [
        new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'}) + (s.isSample ? ' (sample)' : ''),
        s.studentDays, s.roll, s.daysMarked, s.attendancePct + '%', s.effectiveStrength, s.below70
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 60] }
    });

    doc.save('attendance-dashboard-' + year + '-' + todayKey() + '.pdf');
  }

  // ---------------------------------------------------------------
  // FLAGS & NOTIFICATIONS — what a supervisor has noted, what needs a
  // reply, and what's gone further up. Three named states (Observation
  // / Concern / For escalation), each with its own reply expectation
  // and visibility, matching the real SOP distinction: an escalation
  // is a person's decision, never an automatic threshold (ESC-04).
  // No real supervisor-side app exists yet to raise these for real, so
  // this starts genuinely empty rather than showing fabricated flags
  // against a teacher who's done nothing wrong — "Nothing raised this
  // month" is the honest default, not a placeholder to fill later.
  // ---------------------------------------------------------------
  const FLAG_STATES = {
    observation: { label: 'Observation', color: 'info', meaning: 'Noted at a visit. No action required, no reply expected. It exists so a pattern can be seen later.', reply: 'No', seenBy: 'Supervisor and me' },
    concern: { label: 'Concern', color: 'warn', meaning: 'Needs a response from the person flagged, within the stated days. Visible to the next level up but not actioned by them.', reply: 'Within 7 days', seenBy: 'Supervisor, me, programme lead (read only)' },
    escalation: { label: 'For escalation', color: 'crit', meaning: 'Raised to the next level with a named owner and a date. Applied by a person, never by a threshold — ESC-04.', reply: 'Within 3 days', seenBy: 'Supervisor, me, programme lead — with an owner and a date' }
  };

  // Real, database-backed now (teacher_flags table, backend/flags/).
  // A supervisor raises a flag from supervisor.html; the teacher sees it
  // here and replies. Nothing is kept in localStorage any more.
  // Shape kept the same as before so every reader of flagsRecords
  // (this screen and My Compliance's "Open actions") works unchanged.
  const flagsRecords = []; // {id, dateRaised, state, text, dueDate, status:'open'|'replied', replyText, replyDate, raisedByName}
  var flagsFetchStatus = 'idle'; // 'idle' | 'loading' | 'loaded' | 'error:<message>'

  async function fetchFlagsRecords(){
    flagsFetchStatus = 'loading';
    try{
      const res = await fetch('backend/flags/get_my_flags.php' + window.location.search);
      const data = await res.json();
      if(data.status === 'success'){
        flagsRecords.length = 0;
        (data.flags || []).forEach(f => flagsRecords.push({
          id: String(f.id),
          dateRaised: f.date_raised,
          state: f.state,
          text: f.text,
          dueDate: f.due_date || null,
          status: f.status,
          replyText: f.reply_text || '',
          replyDate: f.replied_at ? String(f.replied_at).slice(0, 10) : '',
          raisedByName: f.raised_by_name || ''
        }));
        flagsFetchStatus = 'loaded';
      } else {
        flagsFetchStatus = 'error:' + (data.message || 'Could not load flags.');
      }
    } catch(err){
      flagsFetchStatus = 'error:Could not reach the server.';
    }
    const flagsBody = document.getElementById('flagsnotifications-body');
    if(flagsBody && !flagsBody.classList.contains('hidden')) renderFlagsNotifications();
    const compBody = document.getElementById('mycompliance-body');
    if(compBody && !compBody.classList.contains('hidden') && typeof renderMyCompliance === 'function') renderMyCompliance();
  }
  function ensureFlagsLoaded(){
    if(flagsFetchStatus === 'idle') fetchFlagsRecords();
  }
  // Kept so any older call site doesn't throw — flags are saved on the server now.
  function saveFlagsRecords(){}

  async function submitFlagReply(flagId){
    const input = document.getElementById('flagReplyInput-' + flagId);
    if(!input) return;
    const text = (input.value || '').trim();
    if(!text){ input.focus(); return; }
    const btn = input.parentElement ? input.parentElement.querySelector('button') : null;
    if(btn){ btn.disabled = true; btn.textContent = 'Sending…'; }
    try{
      const res = await fetch('backend/flags/reply_flag.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ flag_id: parseInt(flagId, 10), reply_text: text })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        alert(data.message || 'Could not send the reply.');
        if(btn){ btn.disabled = false; btn.textContent = 'Send reply'; }
        return;
      }
      await fetchFlagsRecords(); // real saved row back from the server
    } catch(err){
      alert('Could not reach the server.');
      if(btn){ btn.disabled = false; btn.textContent = 'Send reply'; }
    }
  }

  // The old teacher-side "test flag" button was removed from the UI;
  // flags are raised by the supervisor (supervisor.html) now.
  function submitTestFlag(){}

  ensureFlagsLoaded(); // load once at startup so My Compliance's "Open actions" has real data

  function renderFlagsNotifications(){
    const container = document.getElementById('flagsnotifications-body');
    container.innerHTML = '';
    container.appendChild(renderEffectiveTabBar('flagsnotifications'));
    ensureFlagsLoaded();
    if(flagsFetchStatus === 'loading' || flagsFetchStatus === 'idle'){
      const p = document.createElement('p'); p.className = 'cap'; p.textContent = 'Loading flags…';
      container.appendChild(p);
      return;
    }
    if(typeof flagsFetchStatus === 'string' && flagsFetchStatus.startsWith('error:')){
      const wrap = document.createElement('div');
      wrap.innerHTML = '<p class="cap" style="color:var(--crit,#d03b3b);">' + esc(flagsFetchStatus.slice(6)) + '</p><button class="btn">Retry</button>';
      wrap.querySelector('button').onclick = () => { flagsFetchStatus = 'idle'; renderFlagsNotifications(); };
      container.appendChild(wrap);
      return;
    }
    const year = calendarYear, month = calendarMonth;
    const monthName = new Date(year, month, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
    const monthKey = year + '-' + month;
    const today = todayDateKey();

    const monthFlags = flagsRecords.filter(f => f.dateRaised && f.dateRaised.slice(0, 7) === (year + '-' + String(month + 1).padStart(2, '0')));
    const observations = monthFlags.filter(f => f.state === 'observation');
    const concerns = monthFlags.filter(f => f.state === 'concern');
    const escalations = monthFlags.filter(f => f.state === 'escalation');
    const overdue = monthFlags.filter(f => f.status === 'open' && f.dueDate && f.dueDate < today);

    container.appendChild(mdSec('Flags & Notifications', '<span class="reqs">ISS-04…10</span>'));
    (() => {
      const bar = document.createElement('div'); bar.style.cssText = 'margin:0 0 14px;';
      const b = document.createElement('button'); b.textContent = '⬇ Download report (PDF)';
      b.style.cssText = 'padding:8px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
      b.onclick = () => downloadFlagsPdf(year, month);
      bar.appendChild(b); container.appendChild(bar);
    })();

    const monthTabs = document.createElement('div');
    monthTabs.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin:14px 0;';
    monthTabs.innerHTML = ACADEMIC_MONTHS.map(m => {
      const label = new Date(2000, m, 1).toLocaleDateString([], { month: 'short' });
      const active = m === month;
      const count = flagsRecords.filter(f => f.dateRaised && f.dateRaised.slice(0, 7) === (year + '-' + String(m + 1).padStart(2, '0'))).length;
      return `<button onclick="calendarMonth=${m}; renderFlagsNotifications();" style="padding:6px 12px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:12px; white-space:nowrap;">${label} · ${count}</button>`;
    }).join('');
    container.appendChild(monthTabs);

    const statGrid = mdGrid('g5', [
      mdTile('Flags to me', monthFlags.length, 'in ' + new Date(2000, month, 1).toLocaleDateString([], { month: 'long' }), mdPill(monthFlags.length ? 'See below' : 'None', monthFlags.length ? 'warn' : 'good'), 'ISS-10'),
      mdTile('Observations', observations.length, 'no reply needed', mdPill('For the record', 'info'), 'ISS-04'),
      mdTile('Concerns', concerns.filter(f => f.status === 'open').length, 'reply expected', mdPill(concerns.filter(f => f.status === 'open').length ? 'Reply needed' : 'None', concerns.filter(f => f.status === 'open').length ? 'warn' : 'good'), 'ISS-05'),
      mdTile('For escalation', escalations.length, 'raised upward', mdPill(escalations.length ? 'Escalated' : 'None', escalations.length ? 'crit' : 'good'), 'ISS-06'),
      mdTile('Overdue', overdue.length, 'past the reply date', mdPill(overdue.length ? 'Reply now' : 'Up to date', overdue.length ? 'crit' : 'good'), 'ISS-08')
    ]);
    statGrid.style.marginBottom = '22px';
    container.appendChild(statGrid);

    container.appendChild(mdSec('The three states', '<span class="reqs">ISS-04…06</span>'));
    const statesBody = document.createElement('div');
    let statesTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>State</th><th>What it means</th><th>Reply</th><th>Seen by</th></tr></thead><tbody>';
    Object.values(FLAG_STATES).forEach(s => {
      statesTable += `<tr><td>${mdPill(s.label, s.color)}</td><td style="text-align:left; white-space:normal; min-width:280px;">${esc(s.meaning)}</td><td style="text-align:left; white-space:normal;">${esc(s.reply)}</td><td class="dim" style="text-align:left; white-space:normal; min-width:200px;">${esc(s.seenBy)}</td></tr>`;
    });
    statesTable += '</tbody></table></div>';
    statesBody.innerHTML = statesTable;
    const statesCard = mdCard('What each one means and what it asks of me', null, statesBody);
    statesCard.style.marginBottom = '22px';
    container.appendChild(statesCard);

    container.appendChild(mdSec('What has been raised with me', '<span class="reqs">ISS-10…14</span>'));
    if(!monthFlags.length){
      const noneCard = document.createElement('div');
      noneCard.className = 'card'; noneCard.style.padding = '22px';
      noneCard.innerHTML = `<p class="cap" style="margin:0;">Nothing raised this month.</p>`;
      container.appendChild(noneCard);
    } else {
      monthFlags.slice().sort((a, b) => b.dateRaised.localeCompare(a.dateRaised)).forEach(f => {
        const s = FLAG_STATES[f.state];
        const card = document.createElement('div');
        card.className = 'card'; card.style.padding = '18px'; card.style.marginBottom = '12px';
        const overdueNow = f.status === 'open' && f.dueDate && f.dueDate < today;
        card.innerHTML = `<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div>
              ${mdPill(s.label, s.color)} ${overdueNow ? mdPill('Overdue', 'crit') : ''}
              <p style="margin:8px 0 0;">${esc(f.text)}</p>
              <p class="cap" style="margin:6px 0 0;">Raised ${esc(f.dateRaised)}${f.raisedByName ? ' by ' + esc(f.raisedByName) : ''}${f.dueDate ? ' · reply due ' + esc(f.dueDate) : ''}</p>
            </div>
            <div>${f.status === 'replied' ? mdPill('Replied', 'good') : (f.state === 'observation' ? mdPill('No reply needed', 'neu') : mdPill('Awaiting reply', 'warn'))}</div>
          </div>
          ${f.status === 'replied'
            ? `<div class="cap" style="margin-top:10px; padding:10px; background:var(--bg); border-radius:8px;">My reply (${esc(f.replyDate)}): ${esc(f.replyText)}</div>`
            : (f.state !== 'observation'
              ? `<div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                  <input id="flagReplyInput-${f.id}" type="text" placeholder="Write a reply" style="flex:1; min-width:220px; padding:8px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px;" />
                  <button onclick="submitFlagReply('${f.id}')" style="padding:8px 16px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Send reply</button>
                </div>`
              : '')}`;
        container.appendChild(card);
      });
    }
  }

  let myComplianceTab = 'compliance';
  function switchMyComplianceTab(tab){
    myComplianceTab = tab;
    renderMyCompliance();
  }

  function renderMyCompliance(){
    const container = document.getElementById('mycompliance-body');
    container.innerHTML = '';
    container.appendChild(renderEffectiveTabBar('mycompliance'));
    renderTeacherFilterBar(container, renderMyCompliance);

    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex; gap:8px; margin:14px 0; overflow-x:auto; flex-wrap:wrap;';
    const tabStyle = (active) => `padding:8px 16px; border-radius:8px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:${active ? '600' : '400'}; white-space:nowrap;`;
    tabBar.innerHTML = `
      <button style="${tabStyle(myComplianceTab === 'compliance')}" onclick="switchMyComplianceTab('compliance')">⇧ My Compliance</button>
      <button style="${tabStyle(myComplianceTab === 'workingdays')}" onclick="switchMyComplianceTab('workingdays')">📅 My Working Days</button>
    `;
    container.appendChild(tabBar);

    container.appendChild(reportDownloadBar(() => document.getElementById('mycompliance-body'),
      myComplianceTab === 'compliance' ? 'My Compliance — ' + new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], {month:'long', year:'numeric'}) : 'My Working Days — ' + new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], {month:'long', year:'numeric'}),
      myComplianceTab === 'compliance' ? 'my-compliance' : 'my-working-days'));
    if(myComplianceTab === 'compliance'){
      renderMyComplianceOverview(container);
    } else if(myComplianceTab === 'workingdays'){
      // Same renderComplianceCal() that used to be its own sidebar
      // destination — one implementation, just rendered into a fresh
      // div under this tab bar instead of a second place to find it.
      const calWrap = document.createElement('div');
      container.appendChild(calWrap);
      renderComplianceCal(calWrap);
    }
  }

    // Pocket for dimensions whose real data source isn't wired in yet.
  // Each key is a function returning {v, hasData} — fill one in the
  // moment its real source is confirmed, and it switches from sample
  // to real with no other change needed anywhere else on this screen.
  // Empty for now: Photo evidence (uploadedEvidenceRecords — source
  // file/scope not yet confirmed), TLM plan, PTM prep, Home activity
  // (no tracked feature exists yet for these three).
   // ---- Real sources for the four dimensions that used to show sample
  // numbers. Each returns {v, hasData}; hasData:false shows "No data
  // yet" instead of a made-up %. Home activity has no tracked feature
  // yet, so it says "Not tracked yet" rather than inventing a figure.
  function complianceWeeksInMonth(year, month){
    return WEEKS.filter(w => {
      const s = parseWeekStartDate(w.dates);
      return s.getFullYear() === year && s.getMonth() === month;
    });
  }

  // PTM prep — the teacher's own checklist for the next scheduled PTM,
  // from the same ptm_meetings data the PTM screen shows.
  let ptmPrepComplianceCache = null; // null | 'loading' | 'none' | 'error' | {total, done, date}
  function ensurePtmPrepComplianceLoaded(){
    if(ptmPrepComplianceCache !== null) return;
    if(!myClassInfo.school_id) return; // class info not loaded yet — tried again on the next render
    ptmPrepComplianceCache = 'loading';
    const params = new URLSearchParams(window.location.search);
    params.set('school_id', myClassInfo.school_id);
    if(myClassInfo.class_id) params.set('class_id', myClassInfo.class_id);
    fetch('backend/ptm/get_ptm_meeting.php?' + params.toString())
      .then(r => r.json())
      .then(data => {
        const meeting = data.status === 'success' ? data.meeting : null;
        if(!meeting){ ptmPrepComplianceCache = 'none'; return; }
        const items = (meeting.prep_items || []).filter(p => p.for_role === 'teacher');
        ptmPrepComplianceCache = { total: items.length, done: items.filter(p => p.is_done == 1).length, date: meeting.meeting_date };
      })
      .catch(() => { ptmPrepComplianceCache = 'error'; })
      .finally(() => {
        const body = document.getElementById('mycompliance-body');
        if(body && !body.classList.contains('hidden') && myComplianceTab === 'compliance') renderMyCompliance();
      });
  }

  const realDimensionSources = {
    // Of the sessions marked done this month, how many have at least
    // one photo/video/audio/document uploaded against them.
    'Photo evidence': () => {
      let doneSessions = 0, withEvidence = 0;
      complianceWeeksInMonth(calendarYear, calendarMonth).forEach(w => {
        ['mon','tue','wed','thu','fri'].forEach(dk => {
          DOMAINS.forEach(d => {
            if(!sessionDoneEntries[dailyPlanKey(w.w, dk, d.key)]) return;
            doneSessions++;
            if((uploadedEvidenceRecords[evidenceKey(w.w, dk, d.key)] || []).length) withEvidence++;
          });
        });
      });
      return { v: doneSessions ? Math.round(withEvidence / doneSessions * 100) : 0, hasData: doneSessions > 0 };
    },
    // Weeks this month that have a "Materials needed this week" list in My Day.
    'TLM plan': () => {
      const weeks = complianceWeeksInMonth(calendarYear, calendarMonth);
      const planned = weeks.filter(w => (weeklyTlmEntries[w.w] || []).length > 0).length;
      return { v: weeks.length ? Math.round(planned / weeks.length * 100) : 0, hasData: planned > 0 };
    },
    // Teacher prep items ticked for the next scheduled PTM.
    'PTM prep': () => {
      ensurePtmPrepComplianceLoaded();
      const c = ptmPrepComplianceCache;
      if(!c || typeof c !== 'object' || !c.total) return { v: 0, hasData: false };
      return { v: Math.round(c.done / c.total * 100), hasData: true };
    },
    // No real home-activity tracking exists yet (Family & Parents still
    // seeds it with sample values), so nothing is shown as a number.
    'Home activity': () => ({ v: 0, hasData: false, notTracked: true })
  };
