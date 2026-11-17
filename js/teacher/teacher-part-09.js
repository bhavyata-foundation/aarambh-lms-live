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
    downloadBtn.style.cssText = 'padding:8px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
    downloadBtn.onclick = downloadAttendanceDashboardPdf;
    container.appendChild(pickerRow);
    const dashDlBar = document.createElement('div');
    dashDlBar.setAttribute('data-dl-end', '1'); dashDlBar.setAttribute('data-no-export', '1');
    dashDlBar.style.cssText = 'margin:18px 0 6px; padding-top:14px; border-top:1px solid var(--border);';
    dashDlBar.appendChild(downloadBtn);
    container.appendChild(dashDlBar);
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
  // (Removed: invented attendance for months with no marks.)
  function sampleAttendanceStatsForMonth(year, month){ return computeAttendanceDashboardStats(year, month); }
  function renderAttendanceAcrossYear(container, year, month){
    const monthName = new Date(year, month, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const now = new Date();
    const curIdx = ACADEMIC_MONTHS.indexOf(now.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS.slice(0, ACADEMIC_MONTHS.indexOf(month) + 1);
    const monthStats = monthsSoFar.map(m => {
      const real = computeAttendanceDashboardStats(year, m);
      return { m, s: real }; // real marks only — a month with none says "No data available"
    });
    const thisMonthReal = computeAttendanceDashboardStats(year, month);
    const thisMonth = thisMonthReal;
    // --- Month by month table ---
    container.appendChild(mdSec('Month by month', ''));
    const mbmHead = document.createElement('div');
    mbmHead.innerHTML = `<p style="font-weight:600; margin:4px 0 2px;">Roll, attendance and effective strength</p>
      <p class="cap" style="margin-bottom:14px;">Attendance is real students marked present, divided by real marks taken. Months with nothing marked show "No data available" — nothing is estimated.</p>`;
    container.appendChild(mbmHead);
    let mbmTable = `<div class="report-table-wrap"><table class="report-table">
      <thead><tr><th>Month</th><th>Student days</th><th>On roll</th><th>Days marked</th>
      <th>Attendance %</th><th>Effective strength</th><th>Below 70%</th></tr></thead><tbody>`;
    monthStats.forEach(({m, s}) => {
      const label = new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'});
      if(!s.hasData){ mbmTable += `<tr><td><b>${esc(label)}</b></td><td colspan="6" class="dim" style="text-align:left;">No data available</td></tr>`; return; }
      mbmTable += `<tr>
        <td><b>${esc(label)}</b></td>
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
    analysisCard.innerHTML = `<h4 style="margin:0 0 6px; font-size:13px;">Analysis</h4><p style="margin:0; font-size:13.5px; line-height:1.6;">${esc(buildAttendanceAnalysisText(monthStats.filter(x => x.s.hasData)))}</p>`;
    container.appendChild(analysisCard);
    // --- Two-column: trend line + child-wise bars ---
    const twoCol = document.createElement('div');
    twoCol.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:22px;';
    twoCol.style.gridTemplateColumns = window.innerWidth < 900 ? '1fr' : '1fr 1fr';
    // Trend line — every month now has a real-or-sample value, so it
    // always plots once two months exist in the academic year so far.
    const plotted = monthStats.filter(x => x.s.hasData);
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
      <p class="cap" style="margin:0 0 16px;">REP-09 · every child against her own denominator.${thisMonth.hasData ? '' : ' No data available — nothing marked yet for ' + esc(monthName) + '.'}</p>
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
