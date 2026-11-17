async function previewAttendanceFile(){
    const input = document.getElementById('attendanceImportInput');
    const monthSelect = document.getElementById('attendanceImportMonthSelect');
    const expectedYearMonth = monthSelect ? monthSelect.value : null; // 'YYYY-MM'
    const resultEl = document.getElementById('attendanceImportResult');
    pendingAttendanceImport = null;
    if(!input.files.length){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    if(!Array.isArray(realPupilsCache)){
      resultEl.innerHTML = '<div class="au-error">Still loading pupils — try again in a moment.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Reading file…</p>';
    let rows;
    try{
      rows = await readAssessmentFileRows(input.files[0]);
    } catch(err){
      resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`;
      return;
    }
    if(!rows.length){ resultEl.innerHTML = '<div class="au-error">The file appears to be empty.</div>'; return; }
    const header = rows[0].map(h => h.trim());
    if(header[0].toLowerCase() !== 'name'){
      resultEl.innerHTML = '<div class="au-error">The first column header must be exactly "name".</div>';
      return;
    }
    const dateColumns = header.slice(1);
    const badDateCols = dateColumns.filter(d => !/^\d{4}-\d{2}-\d{2}$/.test(d));
    if(badDateCols.length){
      resultEl.innerHTML = `<div class="au-error">These column headers aren't valid YYYY-MM-DD dates: ${esc(badDateCols.join(', '))}</div>`;
      return;
    }
    if(!dateColumns.length){
      resultEl.innerHTML = '<div class="au-error">No date columns found after "name".</div>';
      return;
    }
    // Any date column outside the selected month is flagged and
    // excluded entirely, rather than silently imported into the wrong
    // month's records.
    const monthMismatchCols = expectedYearMonth ? dateColumns.filter(d => d.slice(0, 7) !== expectedYearMonth) : [];
    const validDateColumns = expectedYearMonth ? dateColumns.filter(d => d.slice(0, 7) === expectedYearMonth) : dateColumns;
    if(!validDateColumns.length){
      resultEl.innerHTML = `<div class="au-error">None of this file's date columns fall in the selected month (${esc(expectedYearMonth)}). Choose the correct month, or check the file.</div>`;
      return;
    }
    const marks = [];
    const skipped = [];
    if(monthMismatchCols.length){
      skipped.push(`${monthMismatchCols.length} date column(s) outside the selected month, excluded entirely: ${monthMismatchCols.join(', ')}`);
    }
    const perChild = {}; // name -> {present, absent}
    for(let i = 1; i < rows.length; i++){
      const rowNum = i + 1;
      const rawName = (rows[i][0] || '').trim();
      if(!rawName) continue;
      const pupil = realPupilsCache.find(p => p.name === rawName);
      if(!pupil){ skipped.push(`Row ${rowNum}: "${rawName}" is not a child currently on the roll — not imported`); continue; }
      validDateColumns.forEach(dateStr => {
        const colIdx = dateColumns.indexOf(dateStr);
        const cell = (rows[i][colIdx + 1] || '').trim().toUpperCase();
        if(!cell) return;
        if(cell !== 'P' && cell !== 'A'){ skipped.push(`Row ${rowNum}, ${dateStr}: "${cell}" isn't P or A — cell skipped`); return; }
        marks.push({ pupil_id: pupil.id, date: dateStr, status: cell === 'P' ? 'present' : 'absent' });
        if(!perChild[rawName]) perChild[rawName] = { present: 0, absent: 0 };
        perChild[rawName][cell === 'P' ? 'present' : 'absent']++;
      });
    }
    if(!marks.length){
      resultEl.innerHTML = `<div class="au-error">Nothing valid to import.${skipped.length ? '<br/>' + skipped.slice(0, 10).map(s => esc(s)).join('<br/>') : ''}</div>`;
      return;
    }
    pendingAttendanceImport = { marks, skipped, dateColumns: validDateColumns };
    const childNames = Object.keys(perChild);
    const dateRange = validDateColumns.length > 1 ? `${validDateColumns[0]} to ${validDateColumns[validDateColumns.length-1]}` : validDateColumns[0];
    let previewHtml = `<div style="border:1px solid var(--border); border-radius:8px; padding:14px; margin-top:4px;">
      <p style="margin:0 0 10px; font-weight:600;">Preview — nothing has been saved yet</p>
      <p class="cap" style="margin:0 0 10px;">${marks.length} marks ready, across ${childNames.length} children and ${validDateColumns.length} date(s) (${esc(dateRange)}).</p>`;
    previewHtml += '<div class="report-table-wrap" style="max-height:280px; overflow-y:auto;"><table class="report-table"><thead><tr><th>Child</th><th>Present</th><th>Absent</th></tr></thead><tbody>';
    childNames.slice(0, 30).forEach(name => {
      previewHtml += `<tr><td>${esc(name)}</td><td>${perChild[name].present}</td><td>${perChild[name].absent}</td></tr>`;
    });
    previewHtml += '</tbody></table></div>';
    if(childNames.length > 30) previewHtml += `<p class="cap" style="margin:6px 0 0;">…and ${childNames.length - 30} more children</p>`;
    if(skipped.length){
      previewHtml += `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:10px 12px; margin-top:10px; font-size:12.5px;">${skipped.length} row/cell(s) will be skipped:<br/>${skipped.slice(0, 15).map(s => esc(s)).join('<br/>')}${skipped.length > 15 ? '<br/>…and ' + (skipped.length - 15) + ' more' : ''}</div>`;
    }
    previewHtml += `<div style="display:flex; gap:8px; margin-top:14px;">
        <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="confirmAttendanceImport()">Confirm import — save ${marks.length} marks</button>
        <button style="padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer;" onclick="cancelAttendanceImport()">Cancel</button>
      </div>
    </div>`;
    resultEl.innerHTML = previewHtml;
  }
  function cancelAttendanceImport(){
    pendingAttendanceImport = null;
    const resultEl = document.getElementById('attendanceImportResult');
    if(resultEl) resultEl.innerHTML = '<p class="cap">Import cancelled — nothing was saved.</p>';
  }
  async function confirmAttendanceImport(){
    const resultEl = document.getElementById('attendanceImportResult');
    if(!pendingAttendanceImport){
      resultEl.innerHTML = '<div class="au-error">Nothing to confirm — preview a file first.</div>';
      return;
    }
    const { marks, skipped } = pendingAttendanceImport;
    resultEl.innerHTML = '<p class="sub">Saving ' + marks.length + ' marks…</p>';
    try{
      const res = await fetch('backend/attendance/save_attendance.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ marks })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`;
        return;
      }
      Object.keys(attendanceMonthStatus).forEach(k => delete attendanceMonthStatus[k]);
      let html = `<div class="au-success">Imported ${data.saved} of ${marks.length} marks.</div>`;
      if(skipped.length) html += `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:12px 14px; margin-top:6px; font-size:13px;">${skipped.length} skipped:<br/>${skipped.slice(0, 20).map(s => esc(s)).join('<br/>')}${skipped.length > 20 ? '<br/>…and ' + (skipped.length - 20) + ' more' : ''}</div>`;
      resultEl.innerHTML = html;
      alert(`Imported ${data.saved} of ${marks.length} attendance marks.` + (skipped.length ? ` ${skipped.length} skipped — see the details below.` : ''));
      pendingAttendanceImport = null;
      renderAttendanceBody();
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }
  // ---------- Month tabs (Class Attendance → Mark attendance) ----------
  // One strip of month tabs for the school year. The chosen month drives the
  // calendar, the register, the follow-up cards AND the "Month to import"
  // of the import card below it — one place to change the month.
  function attendanceYearMonths(){
    const now = new Date();
    const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;   // school year starts in June
    return ACADEMIC_MONTHS.map(m => ({ year: m >= 5 ? startYear : startYear + 1, month: m }));
  }
  function attMonthTabStyle(active, isNow){
    return 'flex:0 0 auto; min-width:64px; padding:8px 14px; border-radius:8px; cursor:pointer; text-align:center; line-height:1.15; font-family:inherit; '
      + 'border:1px solid ' + (active ? 'var(--primary)' : 'var(--border)') + '; '
      + 'background:' + (active ? 'var(--primary)' : '#fff') + '; '
      + 'color:' + (active ? '#fff' : 'var(--text)') + '; '
      + (active ? 'box-shadow:0 2px 6px rgba(0,0,0,.14); ' : '')
      + (isNow && !active ? 'border-style:dashed; ' : '');
  }
  function renderAttendanceMonthTabs(){
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'attMonthTabsCard';
    card.style.cssText = 'padding:14px 16px; margin:0 0 16px;';
    const now = new Date();
    const tabs = attendanceYearMonths().map(({year, month}) => {
      const active = year === markAttYear && month === markAttMonth;
      const isNow = year === now.getFullYear() && month === now.getMonth();
      const short = new Date(year, month, 1).toLocaleDateString([], {month:'short'});
      const key = year + '-' + String(month + 1).padStart(2, '0');
      return `<button type="button" data-ym="${key}" data-now="${isNow ? 1 : 0}" aria-pressed="${active}" onclick="setAttendanceMonth(${year}, ${month})" style="${attMonthTabStyle(active, isNow)}">
        <div style="font-size:14px; font-weight:700;">${esc(short)}</div>
        <div style="font-size:10.5px; opacity:.8; margin-top:2px;">${year}</div>
      </button>`;
    }).join('');
    const fullName = new Date(markAttYear, markAttMonth, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    card.innerHTML = `
      <div style="display:flex; align-items:baseline; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
        <h3 style="margin:0; font-family:var(--disp); font-size:14px; font-weight:700;">🗓️ Month</h3>
        <span class="cap" style="margin:0;">Showing <b>${esc(fullName)}</b> — the calendar, register and import below all follow this month.</span>
      </div>
      <div id="attMonthTabsRow" role="tablist" style="display:flex; gap:8px; overflow-x:auto; padding:2px 2px 6px; -webkit-overflow-scrolling:touch;">${tabs}</div>`;
    // bring the open month into view on narrow screens
    setTimeout(() => {
      const on = card.querySelector('button[aria-pressed="true"]');
      const row = card.querySelector('#attMonthTabsRow');
      if(on && row) row.scrollLeft = Math.max(0, on.offsetLeft - row.clientWidth / 2 + on.offsetWidth / 2);
    }, 0);
    return card;
  }
  // restyle the tabs in place (used when the import flow switches month without a full redraw)
  window.attHighlightMonthTab = function(key){
    document.querySelectorAll('#attMonthTabsRow button[data-ym]').forEach(b => {
      const on = b.dataset.ym === key;
      b.setAttribute('aria-pressed', on);
      b.style.cssText = attMonthTabStyle(on, b.dataset.now === '1');
    });
  };
  function setAttendanceMonth(year, month){
    markAttYear = year;
    markAttMonth = month;
    window.attImportMonth = year + '-' + String(month + 1).padStart(2, '0');   // "Month to import" follows the tab
    // keep the open day inside the chosen month: today if it is in it, else its first weekday
    const t = new Date();
    if(t.getFullYear() === year && t.getMonth() === month){
      markAttSelectedDate = todayDateKey();
    } else {
      let d = 1;
      while(d < 7 && [0, 6].includes(new Date(year, month, d).getDay())) d++;
      markAttSelectedDate = ymd(year, month, d);
    }
    classAttendancePickDayOpen = false;
    renderAttendanceBody();
  }
  window.setAttendanceMonth = setAttendanceMonth;

 function renderAttendanceBody(){
  if(!markAttSelectedDate){
    markAttSelectedDate =
      todayDateKey();
  }
  const container =
    document.getElementById(
      window.attendanceEntryTargetId ||
      'attendance-body'
    );
  if(!container){
    console.error(
      'Attendance container not found.'
    );
    return;
  }
  /*
    IMPORTANT:
    renderAttendanceBody() can be called repeatedly after
    pupils/attendance data finishes loading.
    Always clear the existing register before rebuilding it.
  */
  container.innerHTML = '';
  // Real pupils loading
  if(realPupilsCache === null){
    fetchMyPupils();
    container.innerHTML =
      '<p class="cap">Loading pupils…</p>';
    return;
  }
  if(realPupilsCache === 'loading'){
    container.innerHTML =
      '<p class="cap">Loading pupils…</p>';
    return;
  }
  if(
    typeof realPupilsCache === 'string' &&
    realPupilsCache.startsWith('error:')
  ){
    container.innerHTML =
      `<p class="cap"
          style="color:var(--danger,#c8433f);">
        ${esc(realPupilsCache.slice(6))}
      </p>`;
    return;
  }
  const year =
    markAttYear;
  const month =
    markAttMonth;
  if(
    !ensureAttendanceMonthLoadedFor(
      year,
      month,
      container,
      renderAttendanceBody
    )
  ){
    return;
  }
  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();
  const monthName =
    new Date(
      year,
      month,
      1
    ).toLocaleDateString(
      [],
      {
        month: 'long',
        year: 'numeric'
      }
    );
  const heading =
    document.createElement(
      'div'
    );
  heading.innerHTML = `
    <h1 style="margin:0 0 4px;">
      Mark attendance
    </h1>
    <p
      class="cap"
      style="margin-bottom:14px;"
    >
      Mark today's register below,
      or pick a different day from
      the calendar further down.
    </p>
  `;
  container.appendChild(
    heading
  );
  // ---- One import button for attendance files of any layout
  // (Smart Import). The older fixed-format importers are no longer
  // shown here — this one reads their layouts too. ----
  container.appendChild(renderAttendanceMonthTabs());   // month tabs — above the import card
  container.appendChild(renderSmartImportCard());
  container.appendChild(importDownloadCard('attendance')); // stays at the end of the page (data-dl-end)
  // (The separate children-import card is no longer shown — the one
  //  📥 Import a file button above also takes class lists.)
  renderAttendanceRegisterForDay(
    container,
    markAttSelectedDate
  );
  /* Everything below this point is administrative/reporting content,
     not the daily task itself — grouped into clearly labeled,
     collapsed-by-default sections (same convention as "See reports")
     instead of all showing inline, so this screen defaults to being
     short and each section is visually distinct rather than
     everything blending together on one long page. */
  // ---- Pick a different day (calendar) ----
  const pickDayToggleCard = document.createElement('div');
  pickDayToggleCard.className = 'card';
  pickDayToggleCard.style.cssText = 'padding:0; margin-top:16px; overflow:hidden; border:1px solid var(--border); border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,.05);';
  const openDayLabel = markAttSelectedDate === todayDateKey() ? 'Today' : esc(markAttSelectedDate);
  pickDayToggleCard.innerHTML = `
    <div role="button" tabindex="0" aria-expanded="${classAttendancePickDayOpen}"
         onclick="classAttendancePickDayOpen = !classAttendancePickDayOpen; this.setAttribute('aria-expanded', classAttendancePickDayOpen); this.nextElementSibling.classList.toggle('hidden', !classAttendancePickDayOpen); this.querySelector('.chevron').style.transform = classAttendancePickDayOpen ? 'rotate(180deg)' : 'rotate(0deg)'; this.style.background = classAttendancePickDayOpen ? 'var(--primary-light, #e8f5ef)' : '#fff';"
         onkeydown="if(event.key==='Enter'||event.key===' '){ event.preventDefault(); this.click(); }"
         style="display:flex; align-items:stretch; cursor:pointer; background:${classAttendancePickDayOpen ? 'var(--primary-light, #e8f5ef)' : '#fff'};">
      <div style="display:flex; align-items:center; gap:8px; padding:0 18px; background:var(--primary); color:#fff; font-family:var(--disp); font-size:14px; font-weight:700; letter-spacing:.02em; white-space:nowrap;">📅 Calendar</div>
      <div style="flex:1; min-width:0; padding:14px 16px;">
        <div style="font-size:14px; font-weight:700; font-family:var(--disp);">Pick a different day</div>
        <p class="cap" style="margin:2px 0 0;">Open or correct a past day's register — currently open: <b>${openDayLabel}</b>.</p>
      </div>
      <div style="display:flex; align-items:center; padding:0 18px; border-left:1px solid var(--border);">
        <span class="chevron" style="transition:transform .15s; font-size:13px; color:var(--text-muted); transform:${classAttendancePickDayOpen ? 'rotate(180deg)' : 'rotate(0deg)'};">▼</span>
      </div>
    </div>
    <div class="${classAttendancePickDayOpen ? '' : 'hidden'}" style="padding:16px 18px 18px; border-top:1px solid var(--border);"></div>
  `;
  container.appendChild(pickDayToggleCard);
  const pickDayBody = pickDayToggleCard.querySelector(':scope > div:last-child');
    // --- Pick a day (calendar), for opening or correcting another day ---
    const reqTag = document.createElement('p'); reqTag.className = 'cap'; reqTag.style.cssText = 'text-align:right; margin:0 0 6px;'; reqTag.innerHTML = '<span class="reqs">REG-02 · CAL-04</span>';
    pickDayBody.appendChild(reqTag);
    const nav = document.createElement('div');
    nav.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:10px;';
    nav.innerHTML = `<button onclick="shiftMarkAttMonth(-1)" style="padding:4px 10px; border:1px solid var(--border); border-radius:6px; background:#fff; cursor:pointer;">‹</button>
      <b>${esc(monthName)}</b>
      <button onclick="shiftMarkAttMonth(1)" style="padding:4px 10px; border:1px solid var(--border); border-radius:6px; background:#fff; cursor:pointer;">›</button>`;
    pickDayBody.appendChild(nav);
    const weekLabels = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:grid; grid-template-columns:repeat(7,1fr); gap:8px; margin-bottom:6px; font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase;';
    headerRow.innerHTML = weekLabels.map(l => `<div>${l}</div>`).join('');
    pickDayBody.appendChild(headerRow);
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Sun=0 -> Mon-first layout
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(7,1fr); gap:8px; margin-bottom:10px;';
    for(let i = 0; i < startWeekday; i++) grid.appendChild(document.createElement('div'));
    for(let d = 1; d <= daysInMonth; d++){
      const dateStr = ymd(year, month, d);
      const dow = new Date(year, month, d).getDay();
      const holidayName = complianceHolidayName(year, month, d) || studentHolidays[dateStr];
      const isSelected = dateStr === markAttSelectedDate;
      const dayRecords = attendanceRecords[dateStr] || null;
      // Present count specifically — NOT every marked child. A day
      // with 1 absence out of 5 shows 4/5, not 5/5 (5/5 would say
      // everyone was present, which isn't what happened).
      // Only counts pupils actually on roll by this date, same REG-14
      // rule the register itself enforces below.
      const onRollThisDay = realPupilsCache.filter(p => !p.admitted_date || p.admitted_date <= dateStr);
      const presentCount = dayRecords ? onRollThisDay.filter(p => dayRecords[p.id] === 'present').length : 0;
      const anyMarked = dayRecords ? onRollThisDay.some(p => dayRecords[p.id]) : false;
      let bg = '#fff', body = '', clickable = false;
      if(holidayName){
        bg = '#fdf1e3'; body = '🎉 ' + esc(holidayName);
        clickable = true; // still selectable, to view/remove the holiday for that day
      } else if(dow === 0){
        bg = '#f4f4f2'; body = 'Sunday';
      } else if(dow === 6 && isLastSaturday(year, month, d, daysInMonth)){
        bg = '#e8f1fb'; body = 'Last Saturday — monthly holiday';
      } else if(dow === 6){
        bg = '#e8f1fb'; body = 'Saturday — no children';
      } else {
        clickable = true;
        body = anyMarked
          ? `<span style="display:inline-block; padding:2px 8px; border-radius:6px; background:var(--success); color:#fff; font-weight:600;">${presentCount}/${onRollThisDay.length}</span>`
          : `<span class="cap">—</span>`;
      }
      const cell = document.createElement('div');
      cell.style.cssText = `background:${bg}; border:1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}; ${isSelected ? 'box-shadow:0 0 0 2px var(--primary-light);' : ''} border-radius:8px; padding:10px; min-height:64px; font-size:12px; ${clickable ? 'cursor:pointer;' : ''}`;
      if(clickable) cell.onclick = () => { markAttSelectedDate = dateStr; classAttendancePickDayOpen = true; renderAttendanceBody(); };
      cell.innerHTML = `<div style="font-weight:600; margin-bottom:4px;">${d}${dateStr === todayDateKey() ? ' · Today' : ''}</div><div>${body}</div>`;
      grid.appendChild(cell);
    }
    pickDayBody.appendChild(grid);
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex; flex-wrap:wrap; gap:16px; font-size:12px; color:var(--text-muted);';
    legend.innerHTML = `
      <span><i style="display:inline-block; width:10px; height:10px; background:var(--success); margin-right:5px; border-radius:2px;"></i>Present count / roll</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#e8f1fb; margin-right:5px; border-radius:2px;"></i>Saturday — no children</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#f4f4f2; margin-right:5px; border-radius:2px;"></i>Sunday</span>
      <span><i style="display:inline-block; width:10px; height:10px; background:#fdf1e3; margin-right:5px; border-radius:2px;"></i>Holiday</span>
    `;
    pickDayBody.appendChild(legend);
  // ---- Who needs a follow-up — two square cards, always visible ----
  const followUpWrap = document.createElement('div');
  followUpWrap.style.marginTop = '22px';
  container.appendChild(followUpWrap);
  renderAttendanceFollowUp(followUpWrap, year, month, markAttSelectedDate);
    // The monthly register and reports now live in the 📊 Reports tab
    // (renderAttendanceReports, part 13), next to Admissions.
    // Keep the dashboard's "Class attendance today" tile in sync —
    // always TODAY specifically, regardless of which day is open above.
    const todaysRecords = attendanceRecords[todayDateKey()] || {};
    const todaysPresent = realPupilsCache.filter(p => todaysRecords[p.id] === 'present').length;
    const classAttendEl = document.getElementById('classAttendanceValue');
    if(classAttendEl) classAttendEl.textContent = todaysPresent + '/' + assessmentPupilNames().length;
  }
  function shiftMarkAttMonth(delta){
    markAttMonth += delta;
    if(markAttMonth > 11){ markAttMonth = 0; markAttYear++; }
    if(markAttMonth < 0){ markAttMonth = 11; markAttYear--; }
    renderAttendanceBody();
  }
/* ===== teacher-part-03.js ===== */
/* =========================================================================
   teacher-part-03.js — part 3 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */