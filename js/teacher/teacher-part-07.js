var ASSESSMENT_DOMAINS = [
    {key:'heal', label:'HEAL', full:'Health'},
    {key:'phys', label:'PHYS', full:'Physical'},
    {key:'sens', label:'SENS', full:'Sensory'},
    {key:'envi', label:'ENVI', full:'Environmental awareness'},
    {key:'emot', label:'EMOT', full:'Emotional'},
    {key:'part', label:'PART', full:'Participation'},
    {key:'logi', label:'LOGI', full:'Logical / cognitive'},
    {key:'math', label:'MATH', full:'Numeracy'},
    {key:'lang', label:'LANG', full:'Language'},
    {key:'arts', label:'ARTS', full:'Creative arts'}
  ];
  // Tap-to-open-popup grading: tapping a domain cell's badge opens a
  // small popup with 3 direct buttons (B/P/A) — 2 taps total, but the
  // cell itself stays compact (matters here since each row has 10 of
  // these). openAssessmentPopupKey tracks which single cell's popup is
  // open at a time; the whole table re-renders on every interaction,
  // same pattern as the rest of this screen.
  let openAssessmentPopupKey = null; // 'studentName|domainKey', or null
  function assessmentTierCell(name, domainKey, recorded, tier){
    const cellKey = name + '|' + domainKey;
    const isOpen = openAssessmentPopupKey === cellKey;
    const badgeHtml = recorded
      ? `<span onclick="toggleAssessmentPopup('${name}','${domainKey}')" style="${gradeBtnStyle(tier, true, 26)}" title="${TIER_INFO[tier].n} — tap to change">${gradeBtnLabel(true, tier)}</span>`
      : `<span onclick="toggleAssessmentPopup('${name}','${domainKey}')" class="dim" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; border:1px dashed #0b0b0b55;" title="Not observed — tap to record">·</span>`;
    const popupHtml = isOpen ? `
      <div style="position:absolute; top:30px; left:50%; transform:translateX(-50%); z-index:20; background:#fff; border:1px solid #0b0b0b33; border-radius:8px; padding:4px; display:flex; gap:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); white-space:nowrap;">
        ${['E','P','A'].map(t => `<span onclick="setAssessmentTier('${name}','${domainKey}','${t}')" style="${gradeBtnStyle(t, t === tier, 26)}" title="${TIER_INFO[t].n}">${gradeBtnLabel(t === tier, t)}</span>`).join('')}
      </div>` : '';
    return `<td style="text-align:center; position:relative;">${badgeHtml}${popupHtml}</td>`;
  }
  function toggleAssessmentPopup(name, domainKey){
    const cellKey = name + '|' + domainKey;
    openAssessmentPopupKey = (openAssessmentPopupKey === cellKey) ? null : cellKey;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  function setAssessmentTier(name, domainKey, tier){
    const store = getAssessmentStore();
    if(!store[name]) store[name] = {};
    store[name][domainKey] = tier;
    saveAssessmentStore();
    openAssessmentPopupKey = null;
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  function sampleTier(seed){ return samplePick(seed, ['E','P','A']); }
  function renderClassProgress(){
    const container = document.getElementById('classprogress-body');
    container.innerHTML = '';
    renderTeacherFilterBar(container, renderClassProgress);
    const classSRI = Math.round((72 + sampleRand('sri') * 20) * 10) / 10;
    const classCPI = Math.round((110 + sampleRand('cpi') * 60) * 10) / 10;
    const advancedPct = Math.round((18 + sampleRand('ari') * 30) * 10) / 10;
    const epConversion = Math.round((30 + sampleRand('ep') * 40) * 10) / 10;
    const paConversion = Math.round((20 + sampleRand('pa') * 30) * 10) / 10;
    const assessmentComplete = Math.round(60 + sampleRand('asmc') * 35);
    container.appendChild(mdSec('Class Progress', '<span class="reqs">ASM-02…04 · WBK-02</span>'));
    container.appendChild(mdGrid('g5', [
      mdTile('Class SRI', classSRI, '%', mdPill(mdStatusBand(classSRI).l, mdStatusBand(classSRI).c), 'SRI = (P+A) ÷ N × 100', mdMeter(classSRI)),
      mdTile('Class CPI', classCPI, '/200', mdPill(mdStatusBand(classCPI/2).l, mdStatusBand(classCPI/2).c), 'Σ Domain DSI ÷ 10', mdMeter(classCPI/2)),
      mdTile('Advanced', advancedPct, '%', mdPill('sample', 'info'), 'ARI = A ÷ N × 100', mdMeter(advancedPct)),
      mdTile('E → P conversion', epConversion, '%', mdPill('P→A ' + paConversion + '%', 'neu'), 'x ÷ E(SEM I) × 100', mdMeter(epConversion)),
      mdTile('Assessment complete', assessmentComplete, '%', mdPill(mdStatusBand(assessmentComplete).l, mdStatusBand(assessmentComplete).c), 'ASM-03 · children × domains', mdMeter(assessmentComplete))
    ]));
    container.appendChild(mdSec('Child by domain', '<span class="reqs">ASM-02…04 · WBK-02</span>'));
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th>' +
      ASSESSMENT_DOMAINS.map(d => `<th title="${esc(d.full)}">${esc(d.label)}</th>`).join('') + '<th>P+A</th><th>Band</th></tr></thead><tbody>';
    SAMPLE_STUDENTS.forEach(name => {
      const tiers = ASSESSMENT_DOMAINS.map(d => sampleTier(name + d.key + 'tier'));
      const paCount = tiers.filter(t => t !== 'E').length;
      const cells = ASSESSMENT_DOMAINS.map((d, j) => {
        const tier = tiers[j];
        return `<td><span class="pill ${TIER_INFO[tier].c}" title="${TIER_INFO[tier].n}">${tier}</span></td>`;
      }).join('');
      table += `<tr><td><b>${esc(name)}</b></td>${cells}<td>${paCount}/${ASSESSMENT_DOMAINS.length}</td><td>${mdPill(mdStatusBand(paCount/ASSESSMENT_DOMAINS.length*100).l, mdStatusBand(paCount/ASSESSMENT_DOMAINS.length*100).c)}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'B Beginner · P Proficient · A Advanced. Sample data — the real dumbbell/stack charts from the prototype need a full assessment history this app doesn\'t track yet.', wrap));
  }
  // ---------- 3. ATTENDANCE REGISTER ----------
  // Matches the real prototype's vTeacherRegister: same 4 tiles, same
  // day-by-day register table (P/A marks + totals), same caption.
  // Sample data — real streak/threshold detection needs a real
  // attendance history this app doesn't store long-term yet.
  // ---------- ATTENDANCE HUB — Check/Audit and Child-wise Record as
  // tabs. Child-wise Record moved here from Assessment Dashboard —
  // it's attendance data, so it belongs with the other attendance
  // reports, not mixed into an assessment screen.
  function renderAttendanceHub(){
    const container = document.getElementById('attendancehub-body');
    container.innerHTML = '';
    container.appendChild(renderAttendanceTabBar('attendancehub'));
    if(!ensurePupilsLoadedFor(container, renderAttendanceHub)) return;
    // Non-blocking — this screen already has an honest "(sample)"
    // fallback for months with no real data, same pattern used
    // throughout the app, so we don't block rendering on this fetch,
    // just kick it off if it hasn't happened yet and let the screen
    // self-correct via re-render once it resolves.
    if(attendanceMonthStatus[calendarYear + '-' + calendarMonth] === undefined) fetchAttendanceMonth(calendarYear, calendarMonth);
    // Check/Audit removed entirely — Child-wise Record is the only
    // content this screen shows now, so the sub-tab bar that used to
    // switch between the two isn't needed either.
    const cwContainer = document.createElement('div');
    container.appendChild(cwContainer);
    renderAttendanceRegister(cwContainer);
    renderAttendanceAcrossYear(cwContainer, calendarYear, calendarMonth);
  }
  let registerViewMode = 'month'; // 'week' or 'month'
  let classAttendanceReportsOpen = false; // backs the "See reports" toggle in Class Attendance — survives re-renders from polling
  let classAttendanceImportOpen = false; // backs the "Import previous months' attendance" toggle
  let classAttendancePickDayOpen = false; // backs the "Pick a different day" toggle
  let classAttendanceFollowUpOpen = false; // backs the "Who needs a follow-up" toggle
  let admissionsReportsOpen = false; // backs the "See reports" toggle in Admissions — survives re-renders from polling
  let monthlyEffectiveActiveTab = 'signoff'; // 'monthbymonth' | 'signoff' — backs Monthly Effective's two section tabs
  let observationImportOpen = false; // backs the "Import from a file" toggle in Classroom Observation
  let observationDownloadOpen = false; // backs the "Download report" toggle in Classroom Observation
  let workbookImportOpen = false; // backs the "Import from a file" toggle in Workbook Assessment
  let workbookDownloadOpen = false; // backs the "Download report" toggle in Workbook Assessment — only ever usable once submitted
  // month -> null|'loading'|'error:...'|{submitted, submitted_at, submitted_by_name}
  var workbookMonthSubmissionCache = {};
  function ensureWorkbookMonthSubmissionLoaded(classId, month, reRenderFn){
    if(workbookMonthSubmissionCache[month] && typeof workbookMonthSubmissionCache[month] === 'object') return true;
    if(workbookMonthSubmissionCache[month] === 'loading') return false;
    if(typeof workbookMonthSubmissionCache[month] === 'string' && workbookMonthSubmissionCache[month].startsWith('error:')) return true;
    workbookMonthSubmissionCache[month] = 'loading';
    fetch('backend/assessment/workbook/get_workbook_month_submission.php?' + new URLSearchParams({ class_id: classId, month }) + (window.location.search ? '&' + window.location.search.slice(1) : ''))
      .then(res => res.json())
      .then(data => {
        workbookMonthSubmissionCache[month] = data.status === 'success' ? data : 'error:' + (data.message || 'Could not load submission status.');
        reRenderFn();
      })
      .catch(() => { workbookMonthSubmissionCache[month] = 'error:Could not reach the server.'; reRenderFn(); });
    return false;
  }
  async function submitWorkbookMonth(){
    if(!myClassInfo.class_id) return;
    const month = currentWorkbookMonth;
    try{
      const res = await fetch('backend/assessment/workbook/submit_workbook_month.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, month })
      });
      const data = await res.json();
      if(data.status !== 'success'){ alert(data.message || 'Could not submit.'); return; }
      delete workbookMonthSubmissionCache[month]; // force a real refetch rather than assume the shape of what we just sent
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
    } catch(err){ alert('Could not reach the server.'); }
  }
  async function unsubmitWorkbookMonth(){
    if(!myClassInfo.class_id) return;
    const month = currentWorkbookMonth;
    if(!confirm('Un-submit ' + month + '\u2019s Workbook Assessment? This only changes the submitted status \u2014 none of the actual grades are affected.')) return;
    try{
      const res = await fetch('backend/assessment/workbook/unsubmit_workbook_month.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, month })
      });
      const data = await res.json();
      if(data.status !== 'success'){ alert(data.message || 'Could not undo submission.'); return; }
      delete workbookMonthSubmissionCache[month];
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
    } catch(err){ alert('Could not reach the server.'); }
  }
  // Exports every workbook's competency tally for the month as one
  // PDF, one table per book — "every workbook at once" matches the
  // same scope the submission itself covers, not just whichever book
  // happens to be selected on screen right now.
  function downloadWorkbookMonthReportPdf(books, month){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const tally = workbookCompetencyTallyCache[month] || {};
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const nameEl = document.querySelector('.user-name');
    const teacherLabel = ((nameEl && nameEl.textContent.trim()) || 'Teacher') + ' — ' + myClassInfo.class_name;
    doc.setFontSize(14);
    doc.text('Workbook Assessment — ' + month, 14, 15);
    doc.setFontSize(9);
    doc.text(teacherLabel + ' · generated ' + new Date().toLocaleDateString(), 14, 21);
    let startY = 26;
    books.forEach((book, bi) => {
      if(bi > 0) startY = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : startY) + 12;
      doc.setFontSize(12);
      doc.text(book.name, 14, startY);
      doc.autoTable({
        startY: startY + 4,
        head: [['CG', 'Competency', 'Pages', 'B Beginner', 'P Proficient', 'A Advanced']],
        body: book.competencies.map(c => {
          const t = tally[c.id] || { count_e: 0, count_p: 0, count_a: 0 };
          return [c.cg_code, c.competency_text, c.page_numbers || '—', t.count_e, t.count_p, t.count_a];
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 60] }
      });
    });
    doc.save('workbook-assessment-' + month.toLowerCase() + '-' + todayKey() + '.pdf');
  }
  let preTestImportOpen = false; // backs the "Import from a file" toggle in Pre-Test
  let preTestDownloadOpen = false; // backs the "Download report" toggle in Pre-Test
  let preTestGlanceOpen = false; // backs the "Every activity, at a glance" toggle in Pre-Test
  let registerViewTargetEl = null; // remembers where to re-render when the toggle changes
  function setRegisterViewMode(mode){
    registerViewMode = mode;
    renderAttendanceRegister(registerViewTargetEl);
  }
  function renderAttendanceRegister(targetEl){
    registerViewTargetEl = targetEl || null;
    const container = targetEl || document.getElementById('attendanceregister-body');
    container.innerHTML = '';
    if(!ensurePupilsLoadedFor(container, () => renderAttendanceRegister(registerViewTargetEl))) return;
    // Every real school weekday this month (Mon-Fri) — holidays are no
    // longer skipped here; they become their own styled column instead
    // (REG-04 wants the register to visibly account for every day, not
    // silently omit ones that turned out to be holidays). Same combined
    // holiday check the Class Attendance day-picker calendar already
    // uses (fixed calendar + teacher-declared), so the two never
    // disagree about which day was a holiday.
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const teachingDates = []; // every weekday, holiday or not
    const holidayNameByDate = {};
    for(let d = 1; d <= daysInMonth; d++){
      const dow = new Date(calendarYear, calendarMonth, d).getDay();
      if(dow === 0 || dow === 6) continue; // children: Mon-Fri only
      const dateStr = calendarYear + '-' + String(calendarMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const holidayName = complianceHolidayName(calendarYear, calendarMonth, d) || studentHolidays[dateStr];
      if(holidayName) holidayNameByDate[dateStr] = holidayName;
      teachingDates.push(dateStr);
    }
    const realTeachingDays = teachingDates.filter(d => !holidayNameByDate[d]).length; // holidays excluded from the "teaching days" count itself
    const todaysDateKeyStr = todayDateKey();
    // Real marks only, from the same attendanceRecords store Class
    // Attendance's own Enter tab and every import writes to.
    // 'present'/'absent' are real explicit marks. A weekday that is a
    // holiday is its own type, never scored either way. A weekday that
    // is NOT a holiday and has no mark is treated as absent once its
    // date has actually arrived (REG-05 — an unmarked day is a missed
    // mark, not a neutral non-event) — but a day still in the future
    // simply hasn't happened yet, so it stays unscored rather than
    // being falsely counted against anyone.
    const rows = realPupilsCache.map(p => {
      const marks = teachingDates.map(dateStr => {
        if(holidayNameByDate[dateStr]) return { type: 'holiday', name: holidayNameByDate[dateStr] };
        const status = (attendanceRecords[dateStr] || {})[p.id];
        if(status === 'present') return { type: 'present' };
        if(status === 'absent') return { type: 'absent', inferred: false };
        if(dateStr <= todaysDateKeyStr) return { type: 'absent', inferred: true }; // never marked, and the day has already happened
        return { type: 'future' };
      });
      return { name: p.name, marks };
    });
    // Genuine "has anything real ever been recorded" check — kept
    // separate from the display logic above, so the empty state below
    // still reflects reality even though every past unmarked day now
    // visually shows as Absent rather than a neutral dot.
    const anyRealMark = teachingDates.some(dateStr => {
      const rec = attendanceRecords[dateStr];
      return rec && realPupilsCache.some(p => rec[p.id]);
    });
    // The dropdown below narrows both the stat tiles AND the table to
    // one specific teaching week of the month (Mon–Fri, 5 columns each
    // — the last week may run shorter), or the whole month — same
    // underlying marks either way, just a narrower window.
    const weekSize = 5;
    const weekCount = Math.ceil(teachingDates.length / weekSize) || 1;
    const monthName = new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], {month:'long'});
    let viewStart = 0, viewDays = teachingDates.length, scopeLabel = 'this month';
    if(registerViewMode !== 'month'){
      const wi = Math.min(parseInt(registerViewMode.replace('week', ''), 10) - 1, weekCount - 1);
      viewStart = wi * weekSize;
      viewDays = Math.min(weekSize, teachingDates.length - viewStart);
      scopeLabel = `Week ${wi + 1} of ${monthName}`;
    }
    const viewDates = teachingDates.slice(viewStart, viewStart + viewDays);
    const viewRows = rows.map(r => {
      const marks = r.marks.slice(viewStart, viewStart + viewDays);
      const scoredMarks = marks.filter(m => m.type === 'present' || m.type === 'absent');
      const pres = marks.filter(m => m.type === 'present').length;
      let run = 0, maxRun = 0;
      marks.forEach(m => { run = m.type === 'absent' ? run + 1 : 0; maxRun = Math.max(maxRun, run); });
      return { name: r.name, marks, pres, absentCount: scoredMarks.length - pres, pct: scoredMarks.length ? Math.round(pres / scoredMarks.length * 100) : 0, maxRun };
    });
    const classAvg = viewRows.length ? Math.round(viewRows.reduce((a, r) => a + r.pct, 0) / viewRows.length * 10) / 10 : 0;
    const below60 = viewRows.filter(r => r.pct < 60).length;
    const threeOrMore = viewRows.filter(r => r.maxRun >= 3).length;
    const weekOptions = Array.from({length: weekCount}, (_, wi) => {
      const start = wi * weekSize, days = Math.min(weekSize, teachingDates.length - start);
      const val = 'week' + (wi + 1);
      return `<option value="${val}" ${registerViewMode === val ? 'selected' : ''}>Week ${wi + 1} of ${esc(monthName)} (${days}d)</option>`;
    }).join('');
    const secWrap = document.createElement('div');
    secWrap.className = 'sec';
    secWrap.style.cssText = 'margin-bottom:18px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;';
    secWrap.innerHTML = `
      <h2 style="margin:0;">Attendance Register — ${esc(scopeLabel)}</h2>
      <select id="registerViewModeSelect" style="${SELECT_STYLE}" onchange="setRegisterViewMode(this.value)">
        <option value="month" ${registerViewMode === 'month' ? 'selected' : ''}>Full month</option>
        ${weekOptions}
      </select>
      <button id="attRegisterDownloadBtn" style="padding:7px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;">⬇ Download report (PDF)</button>
      <div class="hr"></div>
      <span class="reqs">REG-01…04 · printable</span>
    `;
    container.appendChild(secWrap);
    const regDlBtn = secWrap.querySelector('#attRegisterDownloadBtn');
    regDlBtn.onclick = () => downloadAttendanceRegisterPdf(scopeLabel, viewDates, viewRows, todaysDateKeyStr);
    const regDlBar = document.createElement('div');
    regDlBar.setAttribute('data-dl-end', '1'); regDlBar.setAttribute('data-no-export', '1');
    regDlBar.style.cssText = 'margin:18px 0 6px; padding-top:14px; border-top:1px solid var(--border);';
    regDlBar.appendChild(regDlBtn);
    container.appendChild(regDlBar);
    if(!anyRealMark){
      container.appendChild(mdCard(null, `No attendance has been recorded for ${esc(monthName)} yet — mark it in Class Attendance, or import previous months' attendance there. Nothing is fabricated here while real data is missing.`, null));
      return;
    }
    const statGrid = mdGrid('g4', [
      mdTile('Class attendance', classAvg, '%', mdPill(mdStatusBand(classAvg).l, mdStatusBand(classAvg).c), scopeLabel + ' average', mdMeter(classAvg)),
      mdTile('Teaching days', realTeachingDays, scopeLabel, mdPill('holidays excluded', 'info'), 'LPC-11 · holiday calendar'),
      mdTile('Children below 60%', below60, 'flagged', mdPill('follow-up required', 'warn'), 'REG-06'),
      mdTile('Three or more absences', threeOrMore, 'children', mdPill('consecutive', 'crit'), 'REG-06 · early warning')
    ]);
    statGrid.style.marginBottom = '22px';
    container.appendChild(statGrid);
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th>' +
      viewDates.map(dateStr => `<th>${dateStr === todaysDateKeyStr ? 'Today' : parseInt(dateStr.slice(8), 10)}</th>`).join('') + '<th>P</th><th>A</th><th>%</th></tr></thead><tbody>';
    viewRows.forEach(r => {
      const cells = r.marks.map(m => {
        if(m.type === 'holiday') return `<td style="text-align:center; text-decoration:line-through; color:var(--text-muted); background:#fdf1e3;" title="Holiday: ${esc(m.name)}">H</td>`;
        if(m.type === 'future') return '<td style="text-align:center;" title="Not yet happened"><span class="dim">·</span></td>';
        if(m.type === 'present') return '<td style="text-align:center;"><span class="pill good">P</span></td>';
        // Absent — a real explicit mark looks the same as always; an
        // inferred one (never marked, day already happened) is shown
        // with the same red A but a lighter tint and a tooltip, so a
        // teacher can still tell the two apart on close inspection
        // without the table needing a whole separate legend entry.
        return m.inferred
          ? `<td style="text-align:center;" title="Not marked — counted as absent"><span class="pill crit" style="opacity:.65;">A*</span></td>`
          : '<td style="text-align:center;"><span class="pill crit">A</span></td>';
      }).join('');
      table += `<tr><td style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(r.name)}')"><b>${esc(r.name)}</b></td>${cells}<td>${r.pres}</td><td>${r.absentCount}</td><td><b>${r.pct}</b></td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'Laid out as an education officer would expect: school, class, teacher, month and totals in the header when printed (REG-04). H is a holiday (struck through, never scored). A day that was never marked is now counted as absent once it\'s actually happened (shown as A*, slightly faded, on hover) — a day still in the future stays a dot (·), since it hasn\'t happened yet. Tap a child\'s name for her full record.', wrap));
    // --- Attendance trends: weekly + monthly, as two chart cards side
    // by side at 50% width each — same shared component Check
    // Attendance uses, so this styling is consistent app-wide instead
    // of a one-off full-width list just for this screen.
    // computeWeeklyAttendanceData (shared with Check Attendance) still
    // expects the older 'P'/'A'/'·' string-mark shape — converting to
    // that here, rather than changing the shared function, keeps Check
    // Attendance's own unrelated rows format working unchanged.
    const rowsForTrend = rows.map(r => ({ name: r.name, marks: r.marks.map(m => m.type === 'present' ? 'P' : (m.type === 'absent' ? 'A' : '·')) }));
    renderAttendanceTrendCards(container, computeWeeklyAttendanceData(rowsForTrend, realTeachingDays), computeMonthlyAttendanceData(calendarYear));
  }
  // Exports exactly what's currently shown in the register table above
  // — one row per child, one column per real weekday in view (H for
  // holiday, P/A/A* otherwise), plus the same P/A/% totals. Which
  // exact fields belong in this export can still change — this is a
  // straightforward starting point (the visible table, verbatim),
  // not a fixed final spec.
  function downloadAttendanceRegisterPdf(scopeLabel, viewDates, viewRows, todaysDateKeyStr){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const nameEl = document.querySelector('.user-name');
    const teacherLabel = ((nameEl && nameEl.textContent.trim()) || 'Teacher') + ' — ' + myClassInfo.class_name;
    doc.setFontSize(14);
    doc.text('Attendance Register — ' + scopeLabel, 14, 15);
    doc.setFontSize(9);
    doc.text(teacherLabel + ' · generated ' + new Date().toLocaleDateString(), 14, 21);
    const dayLabels = viewDates.map(dateStr => dateStr === todaysDateKeyStr ? 'Today' : String(parseInt(dateStr.slice(8), 10)));
    const markLabel = (m) => m.type === 'holiday' ? 'H' : m.type === 'future' ? '·' : m.type === 'present' ? 'P' : (m.inferred ? 'A*' : 'A');
    doc.autoTable({
      startY: 26,
      head: [['Child', ...dayLabels, 'P', 'A', '%']],
      body: viewRows.map(r => [r.name, ...r.marks.map(markLabel), r.pres, r.absentCount, r.pct + '%']),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [37, 99, 60] }
    });
    doc.save('attendance-register-' + scopeLabel.replace(/\s+/g, '-').toLowerCase() + '-' + todayKey() + '.pdf');
  }
  // ---------- 4. MY COMPLIANCE ----------
  // Matches vTeacherCompliance: the same ten compliance dimensions
  // shown separately (never combined into one score), plus data
  // freshness / training record / open supervisor actions cards.
  // The real chBars bar-chart widget isn't reproduced — shown as tiles
  // + a simple list instead, same numbers, simpler chrome.
  const COMPLIANCE_DIMENSIONS = ['Daily plan', 'TLM plan', 'Attendance register', 'Assessment', 'Home activity', 'PTM prep', 'Monthly Effective', 'Photo evidence', 'Materials logged', 'Teacher attendance'];
  /* =========================================================
     MY ATTENDANCE & PLAN COMPLIANCE — matches the reference: two
     denominators (student days vs teacher working days), 5 tiles,
     and a real day-by-day calendar for the selected month.
     "My attendance" and "On Saturdays" are computed from the SAME
     real teacher-attendance data the compact calendar already uses
     (getMonthAttendanceRecords) — not a separate dataset. "Plans
     submitted" and "Congruent with the week" are computed from the
     real dailyPlanEntries data, aggregated across every week that
     falls in the selected month. "Sessions confirmed (with evidence)"
     is the one honest gap: this app tracks photo UPLOADS (see Section
     6) but not a queryable "does this session have evidence" flag on
     the client, so it's approximated from the same plan data with a
     caption saying so — not invented as if it were separately real.
     ========================================================= */
  // Same fixed-holiday convention as ptm-view.js's calendar, kept
  // local here rather than importing it, since this file doesn't
  // otherwise depend on ptm-view.js's internals. Dates are the same
  // kind of representative placeholders the reference itself uses
  // (its own Independence Day/Raksha Bandhan dates don't match the
  // real calendar either) — not claimed as the real 2026-27 calendar.
  function complianceHolidayName(year, month, day){
    const key = month + '-' + day;
    const holidays = { '0-26':'Republic Day', '4-1':'Maharashtra Day', '7-15':'Independence Day', '9-2':'Gandhi Jayanti' };
    return holidays[key] || null;
  }
  function isLastSaturday(year, month, day, daysInMonth){
    const d = new Date(year, month, day);
    if(d.getDay() !== 6) return false;
    for(let later = day + 7; later <= daysInMonth; later += 7) return false;
    return true;
  }
  function teacherWorkingDaysInMonth(year, month){
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let count = 0;
    for(let d = 1; d <= daysInMonth; d++){
      const dow = new Date(year, month, d).getDay();
      if(complianceHolidayName(year, month, d)) continue;
      if(dow === 0) continue; // Sunday
      if(dow === 6 && isLastSaturday(year, month, d, daysInMonth)) continue; // last Saturday off
      count++; // Mon-Fri, and Saturdays except the last
    }
    return count;
  }
  // Academic year month order — Jun through Apr, skipping May (summer
  // break) — shared by every "month by month" report in this file so
  // they can never drift out of sync with each other.
  const ACADEMIC_MONTHS = [5,6,7,8,9,10,11,0,1,2,3];
