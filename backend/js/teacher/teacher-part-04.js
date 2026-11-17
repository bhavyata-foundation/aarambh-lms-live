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
      ? `<span onclick="toggleAssessmentPopup('${name}','${domainKey}')" class="pill ${TIER_INFO[tier].c}" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; font-size:12px; font-weight:600;" title="${TIER_INFO[tier].n} — tap to change">${TIER_INFO[tier].letter}</span>`
      : `<span onclick="toggleAssessmentPopup('${name}','${domainKey}')" class="dim" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; border:1px dashed #0b0b0b55;" title="Not observed — tap to record">·</span>`;
    const popupHtml = isOpen ? `
      <div style="position:absolute; top:30px; left:50%; transform:translateX(-50%); z-index:20; background:#fff; border:1px solid #0b0b0b33; border-radius:8px; padding:4px; display:flex; gap:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); white-space:nowrap;">
        ${['E','P','A'].map(t => `<span onclick="setAssessmentTier('${name}','${domainKey}','${t}')" class="pill ${TIER_INFO[t].c}" style="cursor:pointer; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px; font-size:12px; font-weight:600;" title="${TIER_INFO[t].n}">${TIER_INFO[t].letter}</span>`).join('')}
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
        head: [['CG', 'Competency', 'Pages', 'E', 'P', 'A']],
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
    secWrap.querySelector('#attRegisterDownloadBtn').onclick = () => downloadAttendanceRegisterPdf(scopeLabel, viewDates, viewRows, todaysDateKeyStr);

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
      mdTile('My attendance', myAttendancePct, '% of ' + teacherDays + ' working days',
        mdPill(mdStatusBand(myAttendancePct).l, mdStatusBand(myAttendancePct).c), 'CAL-13', mdMeter(myAttendancePct)),
      mdTile('On Saturdays', saturdayPct, '% of teacher-only days',
        mdPill(mdStatusBand(saturdayPct, 85, 60).l, mdStatusBand(saturdayPct, 85, 60).c), 'GAP-48', mdMeter(saturdayPct)),
      mdTile('Plans submitted', plansSubmittedPct, '% of days due',
        mdPill(mdStatusBand(plansSubmittedPct).l, mdStatusBand(plansSubmittedPct).c), 'PLN-17', mdMeter(plansSubmittedPct)),
      mdTile('Congruent with the week', congruentPct, '% of sessions',
        mdPill(mdStatusBand(congruentPct).l, mdStatusBand(congruentPct).c), 'PLN-16', mdMeter(congruentPct)),
      mdTile('Sessions confirmed', congruentPct, '% (evidence not yet tracked)',
        mdPill('Approximate', 'info'), 'EVD-03 · see caption')
    ]);
    statGrid5.style.marginBottom = '22px';
    container.appendChild(statGrid5);

    const denomCard = mdCard('Two denominators on this page',
      `CAL-13 · my attendance divides by <b>${teacherDays} teacher working days</b>, which includes the Saturdays with no children. Child attendance and session delivery divide by <b>${studentDays} student days</b>. Mixing them is GAP-47. "Sessions confirmed" above is approximated from planning data, not a real evidence count — this app tracks photo uploads per session (Section 6) but doesn't yet keep a queryable "has evidence" flag on the client to compute this properly.`, null);
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
