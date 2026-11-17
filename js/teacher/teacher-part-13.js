function renderAttendanceTrendCards(container, weekData, monthData){
    container.appendChild(mdSec('Attendance trends', '<span class="reqs">REG-15 · REP-08/09</span>'));
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:' + (window.innerWidth < 700 ? '1fr' : 'repeat(2,1fr)') + '; gap:16px; margin-bottom:22px;';
    grid.appendChild(renderSmallBarChart(weekData, 'Weekly attendance', 'Rolled up Monday–Friday into teaching weeks.'));
    grid.appendChild(renderSmallBarChart(monthData, 'Monthly attendance', 'Real marked days, month by month this academic year.'));
    container.appendChild(grid);
  }
  function renderCheckAttendanceTrends(container, rows, teachingDays){
    renderAttendanceTrendCards(container, computeWeeklyAttendanceData(rows, teachingDays), computeMonthlyAttendanceData(calendarYear));
  }
  function renderCheckAttendance(targetEl){
    const container = targetEl || document.getElementById('checkattendance-body');
    if(!targetEl){ container.innerHTML = ''; renderTeacherFilterBar(container, renderCheckAttendance); }
    const teachingDays = 22;
    const enrolled = SAMPLE_STUDENTS.length;
    const todaysRecords = attendanceRecords[todayKey()] || {}; // same real data as the Register tab's "Today" column
    const rows = SAMPLE_STUDENTS.map((name, i) => {
      const admittedFrom = (i === SAMPLE_STUDENTS.length - 1) ? Math.floor(teachingDays * 0.4) : 0; // last child = a mid-month admission, for realism
      const marks = Array.from({length: teachingDays}, (_, d) => {
        if(d < admittedFrom) return '·';
        return sampleRand(name + 'chk' + d) > 0.1 ? 'P' : 'A';
      });
      const todayStatus = todaysRecords[name];
      marks[teachingDays - 1] = todayStatus === 'present' ? 'P' : todayStatus === 'absent' ? 'A' : '·';
      const markedDays = marks.filter(m => m !== '·').length;
      const pres = marks.filter(m => m === 'P').length;
      return { name, marks, pres, markedDays, pct: markedDays ? Math.round(pres / markedDays * 100) : null };
    });
    const ada = Math.round(rows.reduce((a, r) => a + r.pres, 0) / teachingDays * 10) / 10;
    const overallPct = Math.round(rows.reduce((a, r) => a + (r.pct || 0), 0) / rows.length);
    const below70 = rows.filter(r => r.pct !== null && r.pct < 70).length;
    container.appendChild(mdSec('Check Attendance — this month', '<span class="reqs">REG-15 · CAL-13</span>'));
    container.appendChild(mdGrid('g4', [
      mdTile('On roll', enrolled, 'end of month', mdPill('+1 this month', 'info'), 'ADB-12'),
      mdTile('Average daily attendance', ada, 'children', mdPill('the effective strength', 'good'), 'ADB-14', mdMeter(ada / enrolled * 100)),
      mdTile('Attendance', overallPct, '% present', mdPill(mdStatusBand(overallPct).l, mdStatusBand(overallPct).c), 'REG-05', mdMeter(overallPct)),
      mdTile('Below 70%', below70, 'children', mdPill('follow-up list', 'warn'), 'REG-06')
    ]));
    renderCheckAttendanceTrends(container, rows, teachingDays);
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th>' +
      Array.from({length: teachingDays}, (_, i) => `<th>${i === teachingDays - 1 ? 'Today' : i+1}</th>`).join('') + '<th>%</th></tr></thead><tbody>';
    rows.forEach(r => {
      const cells = r.marks.map((m, i) => {
        if(m === '·') return `<td style="text-align:center;" title="${i === teachingDays - 1 ? 'not marked yet today' : 'not yet admitted'}"><span class="dim">·</span></td>`;
        return `<td style="text-align:center;">${m === 'P' ? '<span class="pill good">P</span>' : '<span class="pill crit">A</span>'}</td>`;
      }).join('');
      table += `<tr><td style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(r.name)}')"><b>${esc(r.name)}</b></td>${cells}<td><b>${r.pct === null ? '—' : r.pct + '%'}</b></td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard(null, 'A dot is a day before that child was admitted, or today if it hasn\'t been marked yet — neither is an absence, and both are excluded from her denominator (ADB-13). The "Today" column is real — it\'s exactly what\'s been marked in Enter › Attendance. Tap a child\'s name for her full record.', wrap));
  }
  // ---------- 7. ADMISSIONS ----------
  // Matches vTeacherAdmissions: on-roll/June-start/mid-year/no-baseline
  // tiles, an explanatory note, and the every-admission table — now
  // backed by a real admissionRecords store instead of a fixed
  // juneStart/midYear split, so a teacher can actually add a child
  // through the form below and see her appear everywhere for real.
  function sampleAdmissionExtra(name){
    return {
      dob: samplePick(name + 'dob', ['2022-04-12', '2021-09-03', '2022-01-27', '2021-06-18', '2022-11-09']),
      gender: samplePick(name + 'gender', ['Female', 'Male']),
      address: samplePick(name + 'addr', ['Ambedkar Nagar, Sion', 'Kamgar Vasahat, Sion', 'Shanti Nagar, Wadala', 'Ganesh Nagar, Wadala']),
      speciallyAbled: sampleRand(name + 'sabled') > 0.92,
      previouslyStudied: sampleRand(name + 'prev') > 0.6 ? samplePick(name + 'prevwhere', ['Anganwadi', 'Private preschool']) : 'None'
    };
  }
  // name -> {address, dob, gender, speciallyAbled, prevStudied,
  //   prevSchool, prevStandard, prevBoard, prevReason, admittedDate,
  //   startOfYear, baseline}
  const admissionRecords = {};
  (function loadAdmissionRecords(){
    try {
      const raw = localStorage.getItem('admissionRecords');
      if(raw) Object.assign(admissionRecords, JSON.parse(raw));
    } catch(e){ /* malformed or unavailable — re-seeded below */ }
  })();
/* ===== teacher-part-07.js ===== */
/* =========================================================================
   teacher-part-07.js — part 7 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */
  function saveAdmissionRecords(){
    try { localStorage.setItem('admissionRecords', JSON.stringify(admissionRecords)); }
    catch(e){ /* storage full/unavailable — stays in-memory for this session only */ }
  }
  function saveExtraAdmittedStudent(name){
    try {
      const raw = localStorage.getItem('extraAdmittedStudents');
      const list = raw ? JSON.parse(raw) : [];
      if(!list.includes(name)) list.push(name);
      localStorage.setItem('extraAdmittedStudents', JSON.stringify(list));
    } catch(e){ /* stays in-memory for this session only */ }
  }
  // The original 5 sample students get seeded, representative admission
  // details the first time this loads (same generator the old fake
  // juneStart/midYear split used), so "Every admission" has something
  // real-shaped even before a teacher has added anyone through the
  // form. Only fills in what's missing — never overwrites a real entry.
  // Prototype children (SAMPLE_STUDENTS) are no longer seeded into the
  // admission details; any seeded earlier are removed here. Real
  // entries (the teacher's own) are never touched.
  (typeof SAMPLE_STUDENTS !== 'undefined' ? SAMPLE_STUDENTS : []).forEach(name => {
    const r = admissionRecords[name];
    if(r && r.baseline && r.startOfYear && r.admittedDate === '2026-06-01') delete admissionRecords[name];
  });
  saveAdmissionRecords();
  function computeAgeFromDob(dobStr){
    if(!dobStr) return null;
    const dob = new Date(dobStr + 'T00:00:00');
    if(isNaN(dob)) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const hadBirthdayThisYear = (now.getMonth() > dob.getMonth()) || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
    if(!hadBirthdayThisYear) age--;
    return age;
  }
  let receiptPruneCheckedThisLoad = false;
  async function pruneDeletedReceipts(){
    if(receiptPruneCheckedThisLoad || !Array.isArray(realPupilsCache)) return;
    receiptPruneCheckedThisLoad = true;
    const withReceipts = realPupilsCache.filter(p => p.receipt_drive_file_id);
    if(!withReceipts.length) return;
    const existing = await checkDriveFilesStillExist(withReceipts.map(p => p.receipt_drive_file_id));
    if(existing === null) return;
    const gone = withReceipts.filter(p => !existing.has(p.receipt_drive_file_id));
    if(!gone.length) return;
    // Persisted server-side (not just local state) — receipts live on
    // the pupils table, so a stale reference needs clearing there too,
    // not just hidden from this one screen.
    await Promise.all(gone.map(p => fetch('backend/pupils/clear_pupil_receipt.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ pupil_id: p.id })
    }).catch(() => {})));
    realPupilsCache = null;
    if(document.getElementById('admissions-body') && !document.getElementById('admissions-body').classList.contains('hidden')) renderAdmissions();
  }
  // ---- First day attendance was marked = that child's admission day ----
  // Children with no attendance marked keep the admission date on the roll.
  let firstAttendanceByPupil = null;   // { pupil_id: 'YYYY-MM-DD' }, loaded once
  let firstAttendanceLoading = false;
  function ensureFirstAttendanceLoaded(){
    if(firstAttendanceByPupil !== null || firstAttendanceLoading) return;
    firstAttendanceLoading = true;
    fetch('backend/pupils/first_attendance.php' + window.location.search)
      .then(r => r.json())
      .then(d => { firstAttendanceByPupil = d.status === 'success' ? (d.first || {}) : {}; })
      .catch(() => { firstAttendanceByPupil = {}; })
      .finally(() => { firstAttendanceLoading = false; renderAdmissions(); });
  }
  function applyFirstAttendanceDates(){
    realPupilsCache.forEach(p => {
      if(p.admitted_recorded === undefined) p.admitted_recorded = p.admitted_date;   // keep the roll date
      const first = firstAttendanceByPupil ? firstAttendanceByPupil[String(p.id)] : null;
      p.admitted_date = first || p.admitted_recorded;
    });
  }

  function renderAdmissions(){
    const container = document.getElementById('admissions-body');
    container.innerHTML = '';
    if(!ensurePupilsLoadedFor(container, renderAdmissions)) return;
    pruneDeletedReceipts(); // background check — self-corrects via re-render above if any receipt's actually gone
    ensureFirstAttendanceLoaded();
    applyFirstAttendanceDates();
    const total = realPupilsCache.length;
    // "Admitted at term start" = whoever shares the earliest admitted_date
    // in the roster, rather than a separate stored flag — the earliest
    // date IS the term-start cohort, by definition.
    const termStartDate = total ? realPupilsCache.reduce((min, p) => p.admitted_date < min ? p.admitted_date : min, realPupilsCache[0].admitted_date) : null;
    const startOfYearPupils = realPupilsCache.filter(p => p.admitted_date === termStartDate);
    const midYearPupils = realPupilsCache.filter(p => p.admitted_date !== termStartDate);
    container.appendChild(mdSec('Admissions', '<span class="reqs">ADB-11…16</span>'));
    // ---- Import children first: photo · file · enter manually ----
    container.appendChild(admSpace(renderSmartImportCard('roll')));
    container.appendChild(importDownloadCard('roll'));
    const admTiles = mdGrid('g3', [
      mdTile('On roll now', total, 'children', mdPill(myClassInfo.class_name, 'neu'), 'ADB-11'),
      mdTile('Admitted at the start', startOfYearPupils.length, total ? new Date(termStartDate + 'T00:00:00').toLocaleDateString([], {month:'long', year:'numeric'}) : '', mdPill(total ? Math.round(startOfYearPupils.length/total*100) + '% of the class' : '—', 'neu'), 'ADB-11'),
      mdTile('Admitted during the year', midYearPupils.length, 'after term start', mdPill(total ? Math.round(midYearPupils.length/total*100) + '% of the class' : '—', 'info'), 'ADB-12')
    ]);
    admTiles.style.marginBottom = '0';
    container.appendChild(admTiles);
    // ---- Admissions month by month (from each child's real admission date) ----
    container.appendChild(admSpace(admMonthAnalysisCard(realPupilsCache)));
    // ---- Edit an admission — shown only while editing a child (Edit in "Every admission").
    // New children are added from the import card above (✍ Enter manually). ----
    const editingPupil = editingPupilId ? realPupilsCache.find(p => p.id === editingPupilId) : null;
    if(editingPupil){
      const admFormEl = renderAddAdmissionForm(editingPupil);
      admFormEl.setAttribute('data-no-export', '1');
      admFormEl.style.margin = '0';
      container.appendChild(admSpace(admFold('form', '✏️ Edit admission — ' + editingPupil.name, 'Change this child\u2019s details and save.', admFormEl, true)));
    }
    // ---- Every admission — the full list, folded ----
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr>' +
      '<th>Child</th><th title="As in the school register">Register no</th><th title="Permanent: school code - register no + admission year. Never changes.">Student ID</th><th title="This academic year\u2019s code: the same with this year at the end">This year</th><th>Admitted</th><th>DOB (Age)</th><th>Gender</th><th>Address</th><th>Previously studied</th><th>Specially abled</th><th>Receipt</th><th></th></tr></thead><tbody>';
    realPupilsCache.forEach(p => {
      const age = computeAgeFromDob(p.dob);
      const how = p.admitted_date === termStartDate ? 'Start of year' : 'Mid-year admission';
      const prevText = p.prev_studied
        ? [p.prev_school, p.prev_standard, p.prev_board].filter(Boolean).join(', ') || 'Yes'
        : 'None';
      table += `<tr>
        <td style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(p.name)}')"><b>${esc(p.name)}</b></td>
        <td>${p.register_no ? esc(p.register_no) : '<span class="cap">—</span>'}</td>
        <td style="white-space:nowrap;">${p.student_id || p.min_no ? `<b>${esc(p.student_id || p.min_no)}</b>` : `<span class="cap" title="A student ID is made when the register number (3\u20135 digits) is entered">needs register no</span>`}</td>
        <td style="white-space:nowrap;">${p.year_code ? esc(p.year_code) : '<span class="cap">—</span>'}</td>
        <td>${p.admitted_date ? esc(p.admitted_date) : '—'} · ${esc(how)}</td>
        <td>${p.dob ? esc(p.dob) + (age !== null ? ' (' + age + ')' : '') : '—'}</td>
        <td>${esc(p.gender || '—')}</td>
        <td class="dim">${esc(p.address || '—')}</td>
        <td>${esc(prevText)}${p.prev_studied && p.prev_reason ? ' — ' + esc(p.prev_reason) : ''}</td>
        <td>${p.specially_abled ? mdPill('Yes', 'info') : 'No'}</td>
        <td>${p.receipt_drive_link ? `<a href="${esc(p.receipt_drive_link)}" target="_blank" rel="noopener">View</a>` : '<span class="cap">None</span>'}</td>
        <td style="white-space:nowrap;">
          <button onclick="editAdmission(${p.id})" title="Edit ${esc(p.name)}'s details" style="padding:6px 10px; border-radius:6px; border:1px solid var(--border); background:#fff; font-size:12px; cursor:pointer; margin-right:4px;">✎</button>
          <button onclick="removePupilFromRoster(${p.id}, '${esc(p.name).replace(/'/g, "\\'")}')" title="Remove ${esc(p.name)} from the roster" style="padding:6px 10px; border-radius:6px; border:1px solid var(--border); background:#fff; color:var(--danger, #c8433f); font-size:12px; cursor:pointer;">🗑</button>
        </td>
      </tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    const listCard = mdCard(null, 'Workbooks and TLM entitlement follow the child\'s own admission date, not the June headcount.', wrap);
    listCard.style.margin = '0'; listCard.style.boxShadow = 'none'; listCard.style.border = 'none'; listCard.style.padding = '0';
    container.appendChild(admSpace(admFold('list', '📋 Every admission — ' + total + ' child' + (total === 1 ? '' : 'ren'), 'The full list with admission date, age, address, previous school and receipt — edit or remove from here.', listCard)));
    // ---- Why this screen exists — folded ----
    const whyBody = document.createElement('p'); whyBody.style.margin = '0'; whyBody.style.lineHeight = '1.55';
    whyBody.textContent = 'The roll is not a number set in June. Children arrive all year — families move into the area, a child turns four, an anganwadi refers one across. Every attendance, assessment and curriculum figure has a denominator that changes underneath it, and a portal that stores one enrolment count will report all of them wrongly for the rest of the year.', null;
    container.appendChild(admSpace(admFold('why', 'ℹ️ Why this screen exists', 'Why the roll is tracked child by child, all year.', whyBody)));
    // Collapsed by default — same "See reports" convention as Class
    // Attendance, so this screen doesn't default to being very long.
    const admReportsToggleCard = document.createElement('div');
    admReportsToggleCard.className = 'card'; admReportsToggleCard.style.cssText = 'padding:0; margin-top:22px; overflow:hidden;';
    admReportsToggleCard.innerHTML = `
      <div onclick="admissionsReportsOpen = !admissionsReportsOpen; this.nextElementSibling.classList.toggle('hidden', !admissionsReportsOpen); this.querySelector('.chevron').style.transform = admissionsReportsOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:16px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📊 See reports</h3>
          <p class="cap" style="margin:0;">Admissions trends across the year, generated from the real roster above.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${admissionsReportsOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${admissionsReportsOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    container.appendChild(admReportsToggleCard);
    const admReportsBody = admReportsToggleCard.querySelector('div:last-child');
    admReportsBody.appendChild(reportDownloadBar(() => document.getElementById('admissions-body'), 'Admissions — ' + (myClassInfo.class_name || ''), 'admissions', 'Every admission, the roll counts and admissions across the year.'));
    renderAdmissionsAcrossYear(admReportsBody, calendarYear);
  }
  // ---- Admissions screen helpers ----
  var admFoldOpen = { form: false, list: false, why: false };
  function admSpace(el){ el.style.marginTop = '22px'; return el; }
  function admFold(key, title, sub, bodyEl, forceOpen){
    const open = forceOpen || admFoldOpen[key];
    const card = document.createElement('div');
    card.className = 'card'; card.style.cssText = 'padding:0; overflow:hidden;';
    card.id = 'admFold-' + key;
    card.innerHTML = `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 20px; cursor:pointer;">
        <div><h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">${esc(title)}</h3><p class="cap" style="margin:0;">${esc(sub)}</p></div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; transform:rotate(${open ? 90 : 0}deg);">▶</span></div>
      <div class="${open ? '' : 'hidden'}" style="padding:4px 20px 20px;"></div>`;
    card.lastElementChild.appendChild(bodyEl);
    card.firstElementChild.onclick = () => {
      admFoldOpen[key] = !admFoldOpen[key];
      card.lastElementChild.classList.toggle('hidden', !admFoldOpen[key]);
      card.querySelector('.chevron').style.transform = 'rotate(' + (admFoldOpen[key] ? 90 : 0) + 'deg)';
    };
    return card;
  }
  // "✍ Enter manually" on the import card: open the form and go to it.
  function admOpenManualEntry(){
    editingPupilId = null;
    admFoldOpen.form = true;
    renderAdmissions();
    const f = document.getElementById('admFold-form');
    if(f && f.scrollIntoView) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // Admissions month by month, from each child's real admission date.
  function admMonthAnalysisCard(pupils){
    const byMonth = {};
    pupils.forEach(p => { if(!p.admitted_date) return; const k = String(p.admitted_date).slice(0, 7); (byMonth[k] = byMonth[k] || []).push(p); });
    const keys = Object.keys(byMonth).sort();
    const wrap = document.createElement('div');
    if(!keys.length){
      wrap.innerHTML = '<p class="cap" style="margin:0;">No data available — no admission dates have been recorded yet.</p>';
      return mdCard('📈 Admissions month by month', null, wrap);
    }
    // every month from the first admission up to this month, so gaps show as 0
    const months = []; const [fy, fm] = keys[0].split('-').map(Number); const now = new Date();
    for(let d = new Date(fy, fm - 1, 1); d <= now || months.length === 0; d.setMonth(d.getMonth() + 1)){ months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); if(months.length > 24) break; }
    keys.forEach(k => { if(!months.includes(k)) months.push(k); }); months.sort();
    const max = Math.max(...months.map(k => (byMonth[k] || []).length));
    const label = k => new Date(k + '-01T00:00:00').toLocaleDateString([], { month: 'long', year: 'numeric' });
    const top = months.filter(k => (byMonth[k] || []).length === max).map(label);
    const after = pupils.filter(p => p.admitted_date && String(p.admitted_date).slice(0, 7) !== keys[0]).length;
    const recent = months.slice(-3).reduce((a, k) => a + (byMonth[k] || []).length, 0);
    let rows = '';
    months.forEach(k => {
      const n = (byMonth[k] || []).length, isTop = n === max && n > 0;
      const names = (byMonth[k] || []).slice(0, 4).map(p => esc(p.name)).join(', ') + ((byMonth[k] || []).length > 4 ? ' …' : '');
      rows += `<tr${isTop ? ' style="background:var(--bg);"' : ''}><td style="text-align:left;"><b>${esc(label(k))}</b>${isTop ? ' ' + mdPill('Highest', 'good') : ''}</td><td>${n}</td>`
        + `<td style="text-align:left; min-width:160px;"><div style="height:10px; border-radius:5px; background:var(--primary); width:${max ? Math.max(n ? 6 : 0, Math.round(n / max * 100)) : 0}%;"></div></td>`
        + `<td style="text-align:left;" class="cap">${n ? names : '—'}</td></tr>`;
    });
    wrap.innerHTML = `<p style="margin:0 0 12px;"><b>Most admissions:</b> ${esc(top.join(', '))} (${max} child${max === 1 ? '' : 'ren'}). <b>${after}</b> admitted after the first month · <b>${recent}</b> in the last 3 months.</p>
      <div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Month</th><th>Admitted</th><th style="text-align:left;"></th><th style="text-align:left;">Children</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return mdCard('📈 Admissions month by month', 'From each child\u2019s admission date — months with no admissions show 0.', wrap);
  }
  let editingPupilId = null; // null = adding a new admission; a pupil id = editing that existing one
  let admReceiptDriveLink = null; // set once handleAdmReceiptSelected finishes uploading, read by submitAdmissionForm below
  let admReceiptDriveFileId = null;
  function renderAddAdmissionForm(editingPupil){
    const fld = 'width:100%; padding:11px 12px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;';
    const lbl = 'font-size:10.5px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px; display:block;';
    const p = editingPupil || {};
    const genderSel = (val) => `<option value="Female" ${val === 'Female' ? 'selected' : ''}>Female</option><option value="Male" ${val === 'Male' ? 'selected' : ''}>Male</option>`;
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.style.padding = '28px';
    wrap.innerHTML = `
      <div id="admFormError" class="cap" style="color:var(--danger,#c8433f); margin-bottom:18px; display:none;"></div>
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:24px 28px;">
        <div><label style="${lbl}">Name of the student</label><input id="admFormName" type="text" placeholder="Full name" value="${esc(p.name || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Address</label><input id="admFormAddress" type="text" placeholder="Locality, area" value="${esc(p.address || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Date of birth</label><input id="admFormDob" type="date" value="${esc(p.dob || '')}" oninput="updateAdmFormAge()" style="${fld}" /></div>
        <div><label style="${lbl}">Age</label><input id="admFormAge" type="text" readonly placeholder="Calculated from date of birth" value="${p.dob ? (computeAgeFromDob(p.dob) ?? '') + ' years' : ''}" style="${fld} background:var(--bg); color:var(--text-muted);" /></div>
        <div><label style="${lbl}">Gender</label><select id="admFormGender" style="${fld}">${genderSel(p.gender)}</select></div>
        <div><label style="${lbl}">Specially abled</label><select id="admFormSpeciallyAbled" style="${fld}"><option value="no" ${!p.specially_abled ? 'selected' : ''}>No</option><option value="yes" ${p.specially_abled ? 'selected' : ''}>Yes</option></select></div>
        <div><label style="${lbl}">Previously studied elsewhere</label><select id="admFormPrevStudied" onchange="toggleAdmFormPrevBlock()" style="${fld}"><option value="no" ${!p.prev_studied ? 'selected' : ''}>No</option><option value="yes" ${p.prev_studied ? 'selected' : ''}>Yes</option></select></div>
        <div><label style="${lbl}">Date of admission</label><input id="admFormAdmittedDate" type="date" value="${esc(p.admitted_date || todayDateKey())}" style="${fld}" /></div>
      </div>
      <div id="admFormPrevBlock" style="display:${p.prev_studied ? 'grid' : 'none'}; grid-template-columns:repeat(2,1fr); gap:24px 28px; margin-top:24px; padding-top:24px; border-top:1px solid var(--border);">
        <div><label style="${lbl}">Previous school</label><input id="admFormPrevSchool" type="text" placeholder="School name" value="${esc(p.prev_school || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Previous standard</label><input id="admFormPrevStandard" type="text" placeholder="e.g. Nursery, Jr KG" value="${esc(p.prev_standard || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Board</label><input id="admFormPrevBoard" type="text" placeholder="e.g. State board" value="${esc(p.prev_board || '')}" style="${fld}" /></div>
        <div><label style="${lbl}">Reason for leaving</label><input id="admFormPrevReason" type="text" placeholder="e.g. family relocated" value="${esc(p.prev_reason || '')}" style="${fld}" /></div>
      </div>
      <div style="margin-top:24px; padding-top:24px; border-top:1px solid var(--border);">
        <label style="${lbl}">Admission receipt</label>
        <p class="cap" style="margin:0 0 10px;">Photo or scan of the signed admission receipt, if one was issued — uploads straight to your connected Google Drive.</p>
        <label id="admReceiptBox" style="display:flex; align-items:center; gap:10px; padding:14px 16px; border:1.5px dashed var(--border); border-radius:10px; background:var(--bg); cursor:pointer; max-width:420px;">
          <span style="font-size:20px; line-height:1;">${admReceiptDriveLink ? '✓' : '+'}</span>
          <span id="admReceiptLabel" style="font-size:13px; font-weight:600;">${admReceiptDriveLink ? '✓ Receipt attached — tap to replace' : 'Add a photo or scan of the receipt'}</span>
          <input id="admFormReceipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style="display:none;" onchange="handleAdmReceiptSelected(this)" />
        </label>
        ${admReceiptDriveLink ? `<p class="cap" style="margin:6px 0 0;"><a href="${esc(admReceiptDriveLink)}" target="_blank" rel="noopener">View current receipt in Drive</a></p>` : ''}
      </div>
      <div style="margin-top:28px; padding-top:20px; border-top:1px solid var(--border); display:flex; gap:10px;">
        <button onclick="submitAdmissionForm()" class="btn-primary" style="width:auto; padding:11px 24px;">${editingPupil ? 'Save changes' : 'Add admission'}</button>
        ${editingPupil ? `<button onclick="cancelEditAdmission()" style="padding:11px 20px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:13px; font-weight:600; cursor:pointer;">Cancel</button>` : ''}
      </div>
    `;
    return wrap;
  }
  function editAdmission(pupilId){
    editingPupilId = pupilId;
    // Pre-fill from her existing record, if she already has a receipt
    // on file — so re-submitting the form (e.g. after fixing another
    // field) doesn't silently wipe it out.
    const pupil = realPupilsCache.find(p => p.id === pupilId);
    admReceiptDriveLink = (pupil && pupil.receipt_drive_link) || null;
    admReceiptDriveFileId = (pupil && pupil.receipt_drive_file_id) || null;
    renderAdmissions();
    // Scroll the form into view — it's mid-page, easy to miss otherwise.
    setTimeout(() => { const el = document.getElementById('admFormError'); if(el) el.closest('.card').scrollIntoView({behavior:'smooth', block:'center'}); }, 50);
  }
  function cancelEditAdmission(){
    editingPupilId = null;
    admReceiptDriveLink = null;
    admReceiptDriveFileId = null;
    renderAdmissions();
  }
  // Named after the child, same convention as materials/attendance
  // photos elsewhere in this app (renameFileTo) — several receipts
  // sitting in the same "Admissions" Drive folder are otherwise
  // indistinguishable by filename alone (e.g. every phone photo just
  // calls itself "IMG_2041.jpg"). compressImageFile is a no-op for a
  // PDF (it can't be decoded as an image, so it resolves unchanged) —
  // safe to run regardless of which file type was picked.
  async function handleAdmReceiptSelected(inputEl){
    const label = document.getElementById('admReceiptLabel');
    const file = inputEl.files && inputEl.files[0];
    if(!label || !file) return;
    const nameEl = document.getElementById('admFormName');
    const studentName = (nameEl && nameEl.value.trim()) || 'Admission Receipt';
    label.textContent = 'Uploading to Google Drive…';
    const compressedFile = renameFileTo(await compressImageFile(file), studentName);
    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('folder_path', 'Admissions');
    try{
      const res = await fetch('backend/drive/upload_to_drive.php' + window.location.search, { method: 'POST', body: formData });
      const data = await res.json();
      if(data.status === 'success'){
        admReceiptDriveLink = data.link;
        admReceiptDriveFileId = data.file_id;
        label.textContent = '✓ ' + compressedFile.name + ' — tap to replace';
      } else {
        label.textContent = data.message || 'Upload failed — tap to try again';
      }
    } catch(err){
      label.textContent = 'Could not reach the server — tap to try again';
    }
  }
  function updateAdmFormAge(){
    const dobEl = document.getElementById('admFormDob');
    const ageEl = document.getElementById('admFormAge');
    if(!dobEl || !ageEl) return;
    const age = computeAgeFromDob(dobEl.value);
    ageEl.value = age === null ? '' : age + (age === 1 ? ' year' : ' years');
  }
  function toggleAdmFormPrevBlock(){
    const sel = document.getElementById('admFormPrevStudied');
    const block = document.getElementById('admFormPrevBlock');
    if(sel && block) block.style.display = sel.value === 'yes' ? 'grid' : 'none';
  }