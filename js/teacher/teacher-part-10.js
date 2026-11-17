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
      return { m, s: real }; // real marks only — a month with none says "No data available"
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
    const analysisLines = doc.splitTextToSize(buildAttendanceAnalysisText(monthStats.filter(x => x.s.hasData)), 265);
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
      body: monthStats.map(({m, s}) => s.hasData ? [
        new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'}),
        s.studentDays, s.roll, s.daysMarked, s.attendancePct + '%', s.effectiveStrength, s.below70
      ] : [new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'}), 'No data available', '', '', '', '', '']),
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
      const bar = document.createElement('div'); bar.setAttribute('data-dl-end', '1'); bar.setAttribute('data-no-export', '1');
      bar.style.cssText = 'margin:18px 0 6px; padding-top:14px; border-top:1px solid var(--border);';
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
    // Weeks this month with materials recorded on My Day's activity cards.
    'TLM plan': () => {
      const weeks = complianceWeeksInMonth(calendarYear, calendarMonth);
      const planned = weeks.filter(w => typeof weekHasCardMaterials === 'function' && weekHasCardMaterials(w.w)).length;
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
/* ===== teacher-part-06.js ===== */
/* =========================================================================
   teacher-part-06.js — part 6 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */
