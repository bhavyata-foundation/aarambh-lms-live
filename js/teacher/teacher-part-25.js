function renderTeacherProfile(){
    const container = document.getElementById('teacherprofile-body');
    container.innerHTML = '';
    renderTeacherFilterBar(container, renderTeacherProfile);
    const p = sampleTeacherProfile();
    container.appendChild(mdSec('Teacher Profile', '<span class="reqs">STF-01…08</span>'));
    const context = document.createElement('p');
    context.className = 'cap';
    context.style.margin = '4px 0 16px';
    context.innerHTML = `${esc(p.name)} · ${esc(myClassInfo.school_name)} · ${esc(myClassInfo.class_name)} — school and class are real (from this login); the details below are sample data.`;
    container.appendChild(context);
    const g = document.createElement('div'); g.className = 'g g2';
    const basicsBody = document.createElement('dl'); basicsBody.className = 'kv';
    basicsBody.innerHTML = `
      <dt>Qualification</dt><dd>${esc(p.qualification)}</dd>
      <dt>Date of birth</dt><dd>${esc(p.dob)} (${p.age} years)</dd>
      <dt>Gender</dt><dd>${esc(p.gender)}</dd>
      <dt>Marital status</dt><dd>${esc(p.maritalStatus)}</dd>
      <dt>Experience</dt><dd>${esc(p.experience)}</dd>
      <dt>Languages spoken</dt><dd>${esc(p.languages.join(', '))}</dd>`;
    g.appendChild(mdCard('Basics', 'STF-01…04', basicsBody));
    const contactBody = document.createElement('dl'); contactBody.className = 'kv';
    contactBody.innerHTML = `
      <dt>Contact number (normal)</dt><dd>${esc(p.contactNormal)}</dd>
      <dt>Contact number (emergency)</dt><dd>${esc(p.contactEmergency)}</dd>
      <dt>Address</dt><dd>${esc(p.address)}</dd>`;
    g.appendChild(mdCard('Contact', 'STF-05', contactBody));
    container.appendChild(g);
    container.appendChild(mdSec('Activities / workshops done till date', '<span class="reqs">STF-06 · training certifications</span>'));
    const trainingList = document.createElement('div'); trainingList.className = 'list';
    trainingList.innerHTML = p.training.map(t => `<div class="row"><div class="t"><b>${esc(t.name)}</b><span>${esc(t.date)}</span></div>
      <div>${t.cert ? mdPill('Certified', 'good') : mdPill('Attended, no certificate', 'warn')}</div></div>`).join('');
    container.appendChild(mdCard(null, null, trainingList));
    // --- Google Drive connection ---
    container.appendChild(mdSec('Google Drive', ''));
    const driveCard = document.createElement('div');
    driveCard.className = 'card'; driveCard.style.padding = '20px';
    driveCard.id = 'driveStatusCard';
    driveCard.innerHTML = '<p class="cap">Checking connection…</p>';
    container.appendChild(driveCard);
    checkDriveConnectionStatus();
  }
  // Shared helper — checks which of a list of Drive file IDs still
  // actually exist (not deleted/trashed on Drive's side). Returns null
  // if the check itself couldn't be performed (e.g. network error, or
  // Drive not connected) — callers must treat null as "don't prune
  // anything," never as "everything's deleted." A failed check is not
  // evidence of deletion.
  async function checkDriveFilesStillExist(fileIds){
    const ids = fileIds.filter(Boolean);
    if(!ids.length) return new Set();
    try{
      const res = await fetch('backend/drive/check_drive_files.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ file_ids: ids })
      });
      const data = await res.json();
      if(data.status !== 'success') return null;
      return new Set(data.existing);
    } catch(err){
      return null;
    }
  }
  async function checkDriveConnectionStatus(){
    const card = document.getElementById('driveStatusCard');
    if(!card) return;
    try{
      const res = await fetch('backend/drive/check_drive_status.php' + window.location.search);
      const data = await res.json();
      if(data.status !== 'success'){
        card.innerHTML = `<p class="cap" style="color:var(--danger, #c8433f);">${esc(data.message || 'Could not check Drive status.')}</p>`;
        return;
      }
      if(data.connected){
        card.innerHTML = `<p style="margin:0 0 4px; color:var(--success); font-weight:600;">✓ Connected</p>
          <p class="cap" style="margin:0 0 12px;">Photo, video, audio and document evidence uploads go straight to your Drive, organized into folders automatically.</p>
          <a href="backend/google_oauth_start.php${window.location.search}" style="display:inline-block; padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; color:var(--text); font-size:13px; font-weight:600; text-decoration:none;">Reconnect / switch account</a>`;
      } else {
        card.innerHTML = `<p style="margin:0 0 4px; color:var(--text-muted); font-weight:600;">Not connected</p>
          <p class="cap" style="margin:0 0 12px;">Connect your Google Drive so evidence you upload (photos, videos, documents) saves there automatically instead of failing.</p>
          <a href="backend/google_oauth_start.php${window.location.search}" style="display:inline-block; padding:9px 18px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:13px; font-weight:600; text-decoration:none;">Connect Google Drive</a>`;
      }
    } catch(err){
      card.innerHTML = '<p class="cap" style="color:var(--danger, #c8433f);">Could not reach the server.</p>';
    }
  }
  // ---------- 11. TRANSITION ----------
  // Matches vTransition: Jr KG → Sr KG promotion tiles + outcome
  // table, plus a Sr KG → Grade 1 readiness section.
  function isFlaggedForFollowUp(completion, domainsEmergingCount, attendance){
    return completion < 70 || domainsEmergingCount >= 3 || attendance < 80;
  }
  let transitionTargetEl = null; // remembers where to re-render (embedded tab vs standalone section)
/* ===== teacher-part-13.js ===== */
/* =========================================================================
   teacher-part-13.js — part 13 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   This last part also starts the page: it runs the login check.
   ========================================================================= */
  function renderTransition(targetEl){
    transitionTargetEl = targetEl || null;
    const container = targetEl || document.getElementById('transition-body');
    container.innerHTML = '';
    container.appendChild(mdSec('Transition — Jr KG to Sr KG', '<span class="reqs">BAL-09…12 · DAT-52</span>'));
    container.appendChild(attNote('No data available. Transition (who moves on to Sr KG, readiness, and tracing children who left) is not recorded in the portal yet, so nothing is shown here rather than an estimate.'));
  }
  // Toggles which chart is visible inside the Transition report's
  // "Charts & analysis" panel. Deliberately shows one at a time —
  // the dropdown IS the chart switcher, not a filter alongside them.
  function switchTransitionChart(which){
    document.querySelectorAll('.tc-chart').forEach(el => {
      el.classList.toggle('hidden', el.id !== 'tcChart-' + which);
    });
  }
  // Expand/collapse a sidebar parent's child tabs — e.g. clicking
  // "Attendance" toggles its two sub-tabs (Class Attendance /
  // Attendance Records) open or closed, chevron rotates to match.
  // Defaults open (see CSS — no .collapsed class on load).
  function toggleSidebarParent(childrenId){
    const wrap = document.getElementById(childrenId + '-wrap');
    const chevron = document.getElementById('chevron-' + childrenId);
    if(!wrap) return;
    wrap.classList.toggle('collapsed');
    if(chevron) chevron.classList.toggle('collapsed');
  }
function renderPreviewBanner(isPreviewing){
  const el = document.getElementById('preview-banner');
  if(!el) return;
  el.innerHTML = isPreviewing ? `
    <div class="preview-banner">
      <span>👁️ Previewing as this role</span>
      <button onclick="returnToSuperAdmin()">Return to Super Admin</button>
    </div>` : '';
}
function returnToSuperAdmin(){
  fetch('backend/auth/return_to_admin.php', { method: 'POST' })
    .then(r => r.json())
    .then(data => {
      if(data.status === 'success') window.location.href = 'superadmin.html';
    })
    .catch(() => {});
}
fetch('backend/auth/session_check.php' + window.location.search)
  .then(r => r.json())
  .then(data => {
    if(data.status !== 'logged_in' || data.role !== 'teacher'){
      // No automatic redirect: show what the server said, so the real reason is visible
      console.error('Session check did not pass:', data);
      document.body.insertAdjacentHTML('afterbegin', '<div style="position:fixed;top:0;left:0;right:0;z-index:99999;background:#FFF4E5;color:#7A3E00;padding:14px 18px;font:14px system-ui,sans-serif;border-bottom:2px solid #E0A800;">Not signed in as a teacher. The session check said: <b>' + JSON.stringify(data).replace(/</g, '&lt;') + '</b> <a href="index.html?no_dev=1" style="margin-left:12px;font-weight:700;">Go to sign-in page</a></div>');
      return;
    }
    enterTeacherFlow();
    renderPreviewBanner(data.is_previewing);
    applyRealTeacherName(data.name, data.email); // the real name + email in the topbar, and the heading
    updateTopbarSchoolLine(); // fallback shown immediately
    loadMyClassInfo(); // then replaced with the real school/class for this login, once it resolves
    // Coming from Textbooks' sidebar (e.g. teacher.html?section=materials) —
    // jump straight to that section, but only if the dashboard itself is
    // actually showing (enterTeacherFlow sometimes shows the attendance
    // gate screen instead, which has no sidebar to switch within).
    const params = new URLSearchParams(window.location.search);
    const requestedSection = params.get('section');
    if(requestedSection && !document.getElementById('view-dashboard').classList.contains('hidden')){
      switchSidebarSection(requestedSection);
    }
  })
  .catch(err => { console.error('Teacher page setup error (the page stays open):', err); });
  // =================================================================
  // CLASS ATTENDANCE → 📊 REPORTS — one proper report per month of the
  // school year (June → April), plus a whole-year view. Built only from
  // the attendance actually marked — a month with nothing marked says so.
  //   Each month: summary tiles · every child's present / absent / % and
  //   whether they need a follow-up · the full day-by-day register ·
  //   download at the end.
  // =================================================================
  function attNote(text){ const c = document.createElement('div'); c.className = 'card'; c.style.padding = '16px 18px'; const p = document.createElement('p'); p.style.margin = '0'; p.textContent = text; c.appendChild(p); return c; }
  var attReportMonth = null; // { y, m } or 'year'
  function attAcademicMonths(){
    const now = new Date();
    const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    const months = [];
    for(let i = 0; i < 11; i++){ // June … April
      const d = new Date(startYear, 5 + i, 1);
      if(d > now) break;
      months.push({ y: d.getFullYear(), m: d.getMonth() });
    }
    return months;
  }
  function attMonthLabel(o, long){ return new Date(o.y, o.m, 1).toLocaleDateString([], long ? { month: 'long', year: 'numeric' } : { month: 'short' }); }
  function attDateKey(y, m, d){ return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
  // Everything one month's report needs, from real marks only.
  function attMonthStats(y, m){
    const today = todayDateKey();
    const days = new Date(y, m + 1, 0).getDate();
    const schoolDays = [], holidays = [];
    for(let d = 1; d <= days; d++){
      const dow = new Date(y, m, d).getDay();
      if(dow === 0 || dow === 6) continue;
      const key = attDateKey(y, m, d);
      if(key > today) continue;
      const hol = complianceHolidayName(y, m, d) || studentHolidays[key];
      if(hol){ holidays.push({ date: key, name: hol }); continue; }
      schoolDays.push(key);
    }
    const markedDays = schoolDays.filter(k => attendanceRecords[k] && Object.keys(attendanceRecords[k]).length);
    const children = (Array.isArray(realPupilsCache) ? realPupilsCache : []).map((p, i) => {
      let present = 0, absent = 0, run = 0, longest = 0;
      schoolDays.forEach(k => {
        if(p.admitted_date && k < p.admitted_date) return; // not yet on the roll that day
        const v = (attendanceRecords[k] || {})[p.id];
        if(v === 'present' || v === 'late'){ present++; run = 0; }
        else if(v === 'absent'){ absent++; run++; if(run > longest) longest = run; }
      });
      const marked = present + absent;
      return { id: p.id, roll: i + 1, register_no: p.register_no || '', name: p.name, present, absent, marked,
        pct: marked ? Math.round(present / marked * 1000) / 10 : null, longest };
    });
    const withMarks = children.filter(c => c.marked);
    const totP = withMarks.reduce((a, c) => a + c.present, 0), totM = withMarks.reduce((a, c) => a + c.marked, 0);
    return {
      y, m, schoolDays, holidays, markedDays, children,
      classPct: totM ? Math.round(totP / totM * 1000) / 10 : null,
      below70: withMarks.filter(c => c.marked >= 4 && c.pct < 70),
      streak3: withMarks.filter(c => c.longest >= 3),
      perfect: withMarks.filter(c => c.absent === 0 && c.marked >= 4)
    };
  }
  function attEnsureMonths(list, onDone){
    const missing = list.filter(o => attendanceMonthStatus[o.y + '-' + o.m] === undefined);
    if(!missing.length) return true;
    Promise.all(missing.map(o => fetchAttendanceMonth(o.y, o.m))).then(() => {
      if(onDone) onDone();
      else if(classAttendanceTab === 'reports') renderAttendanceReports();
    });
    return false;
  }
  function renderAttendanceReports(){
    let host = document.getElementById('attendancereports-body');
    const section = document.getElementById('classattendance-body');
    if(!host){ host = document.createElement('div'); host.id = 'attendancereports-body'; }
    if(host.parentElement !== section) section.appendChild(host);
    host.innerHTML = '';
    if(!ensurePupilsLoadedFor(host, renderAttendanceReports)) return;
    const months = attAcademicMonths();
    if(!attReportMonth) attReportMonth = months[months.length - 1] || { y: new Date().getFullYear(), m: new Date().getMonth() };
    host.appendChild(mdSec('Attendance reports', '<span class="reqs">REG-01…07</span>'));
    const chips = document.createElement('div');
    chips.setAttribute('data-no-export', '1');
    chips.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin:0 0 16px;';
    const chip = (label, active, onClick) => { const b = document.createElement('button'); b.textContent = label; b.onclick = onClick;
      b.style.cssText = `padding:6px 14px; border-radius:99px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:12.5px; font-weight:600; cursor:pointer;`;
      chips.appendChild(b); };
    months.forEach(o => chip(attMonthLabel(o), attReportMonth !== 'year' && attReportMonth.y === o.y && attReportMonth.m === o.m, () => { attReportMonth = o; renderAttendanceReports(); }));
    chip('Whole year', attReportMonth === 'year', () => { attReportMonth = 'year'; renderAttendanceReports(); });
    host.appendChild(chips);
    const need = attReportMonth === 'year' ? months : [attReportMonth];
    if(!attEnsureMonths(need)){ host.appendChild(attNote('Loading the attendance marked for ' + (attReportMonth === 'year' ? 'the whole year' : attMonthLabel(attReportMonth, true)) + '…')); return; }
    const failed = need.find(o => String(attendanceMonthStatus[o.y + '-' + o.m] || '').startsWith('error:'));
    if(failed){
      const card = attNote('Could not load ' + attMonthLabel(failed, true) + ': ' + String(attendanceMonthStatus[failed.y + '-' + failed.m]).slice(6));
      const retry = document.createElement('button'); retry.className = 'btn'; retry.textContent = 'Try again'; retry.style.marginTop = '8px';
      retry.onclick = () => { need.forEach(o => { if(String(attendanceMonthStatus[o.y + '-' + o.m]).startsWith('error:')) delete attendanceMonthStatus[o.y + '-' + o.m]; }); renderAttendanceReports(); };
      card.appendChild(retry); host.appendChild(card); return;
    }
    const report = document.createElement('div');
    host.appendChild(report);
    const pctText = v => v === null ? '—' : v + '%';
    const band = v => v === null ? mdPill('No marks', 'neu') : v >= 85 ? mdPill('Good', 'good') : v >= 70 ? mdPill('Watch', 'warn') : mdPill('Below 70%', 'crit');
    if(attReportMonth === 'year'){
      const all = months.map(o => attMonthStats(o.y, o.m));
      report.appendChild(mdSec('Whole year — ' + attMonthLabel(months[0] || { y: new Date().getFullYear(), m: 5 }, true) + ' to ' + attMonthLabel(months[months.length - 1] || months[0], true), ''));
      let t = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Month</th><th>School days so far</th><th>Days marked</th><th>Holidays</th><th>Class attendance</th><th>Below 70%</th><th>3+ days absent in a row</th></tr></thead><tbody>';
      all.forEach(s => {
        t += `<tr><td style="text-align:left;"><b>${esc(attMonthLabel(s, true))}</b></td><td>${s.schoolDays.length}</td><td>${s.markedDays.length}</td><td>${s.holidays.length}</td>`
          + `<td>${s.markedDays.length ? pctText(s.classPct) : '<span class="dim">Not marked</span>'}</td><td>${s.markedDays.length ? s.below70.length : '—'}</td><td>${s.markedDays.length ? s.streak3.length : '—'}</td></tr>`;
      });
      t += '</tbody></table></div>';
      const w1 = document.createElement('div'); w1.innerHTML = t;
      report.appendChild(mdCard('Month by month', 'Class attendance = present marks ÷ all marks in the month. Months with nothing marked are shown as "Not marked" — never estimated.', w1));
      // Each child across the whole year
      const byChild = {};
      all.forEach(s => s.children.forEach(c => { const b = byChild[c.id] || (byChild[c.id] = { roll: c.roll, register_no: c.register_no, name: c.name, present: 0, absent: 0 }); b.present += c.present; b.absent += c.absent; }));
      let t2 = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Roll</th><th>Reg. no.</th><th style="text-align:left;">Child</th><th>Present</th><th>Absent</th><th>Attendance</th><th style="text-align:left;">Status</th></tr></thead><tbody>';
      Object.values(byChild).sort((a, b) => a.roll - b.roll).forEach(c => {
        const marked = c.present + c.absent, pct = marked ? Math.round(c.present / marked * 1000) / 10 : null;
        const status = band(pct);
        t2 += `<tr><td>${c.roll}</td><td>${esc(c.register_no) || '—'}</td><td style="text-align:left;"><b>${esc(c.name)}</b></td><td>${c.present}</td><td>${c.absent}</td><td>${pctText(pct)}</td><td style="text-align:left;">${status}</td></tr>`;
      });
      t2 += '</tbody></table></div>';
      const w2 = document.createElement('div'); w2.innerHTML = t2;
      report.appendChild(mdCard('Every child — whole year', null, w2));
      host.appendChild(attDownloadCard('Download — whole year', [{ label: '⬇ Whole-year report (PDF)', primary: true, run: () => exportReportPdf(report, 'Attendance — whole year — ' + (myClassInfo.class_name || ''), 'attendance-year') }]));
      return;
    }
    const s = attMonthStats(attReportMonth.y, attReportMonth.m);
    const title = attMonthLabel(s, true);
    report.appendChild(mdSec('Attendance report — ' + title, ''));
    if(!s.markedDays.length){
      report.appendChild(attNote('No attendance has been marked for ' + title + ' yet. Mark it in ✓ Mark Attendance, or bring it in with 📥 Import attendance from any file.'));
      return;
    }
    const grid = document.createElement('div'); grid.className = 'g g4';
    grid.appendChild(mdTile('Class attendance', s.classPct === null ? '—' : s.classPct, s.classPct === null ? 'no marks' : '% of all marks', band(s.classPct), 'REG-05'));
    grid.appendChild(mdTile('Days marked', s.markedDays.length, 'of ' + s.schoolDays.length + ' school days so far', s.markedDays.length === s.schoolDays.length ? mdPill('Complete', 'good') : mdPill((s.schoolDays.length - s.markedDays.length) + ' not marked', 'warn'), 'REG-02'));
    grid.appendChild(mdTile('Below 70%', s.below70.length, 'children (4+ days marked)', s.below70.length ? mdPill('Follow up', 'crit') : mdPill('None', 'good'), 'REG-06'));
    grid.appendChild(mdTile('Full attendance', s.perfect.length, 'children never absent', mdPill(s.perfect.length ? 'Well done' : '—', s.perfect.length ? 'good' : 'neu'), 'REG-05'));
    report.appendChild(grid);
    if(s.holidays.length){
      report.appendChild(mdCard('Holidays in ' + title, s.holidays.map(h => new Date(h.date + 'T00:00:00').toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' — ' + h.name).join(' · '), null));
    }
    let t = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Roll</th><th>Reg. no.</th><th style="text-align:left;">Child</th><th>Present</th><th>Absent</th><th>Days marked</th><th>Attendance</th><th style="text-align:left;">Needs a follow-up?</th><th style="text-align:left;">Parent</th></tr></thead><tbody>';
    s.children.forEach(c => {
      const notes = [];
      if(c.marked >= 4 && c.pct < 70) notes.push('Below 70%');
      if(c.longest >= 3) notes.push(c.longest + ' days absent in a row');
      t += `<tr><td>${c.roll}</td><td>${esc(c.register_no) || '—'}</td><td style="text-align:left;"><b>${esc(c.name)}</b></td><td>${c.present}</td><td>${c.absent}</td><td>${c.marked}</td><td>${pctText(c.pct)}</td>`
        + `<td style="text-align:left;">${notes.length ? '<span style="color:var(--crit,#d03b3b); font-weight:600;">' + notes.map(esc).join(' · ') + '</span>' : (c.marked ? 'No' : '<span class="dim">Not marked</span>')}</td><td style="text-align:left;">${notes.length ? attFbCell(c, c.longest >= 3 ? 'streak' : 'below70', title) : ''}</td></tr>`;
    });
    t += '</tbody></table></div>';
    const w = document.createElement('div'); w.innerHTML = t;
    report.appendChild(mdCard('Every child — ' + title, 'Attendance = present ÷ days marked for that child. A child admitted during the month is only counted from their admission date. Children who need a follow-up have a 💬 Feedback to parent button.', w));
    const fbPanel = document.createElement('div');
    fbPanel.id = 'attFbPanel'; fbPanel.className = 'card'; fbPanel.setAttribute('data-no-export', '1');
    fbPanel.style.cssText = 'padding:16px 18px; margin-top:16px; border:2px solid var(--primary);' + (attFb ? '' : ' display:none;');
    report.appendChild(fbPanel);
    if(attFb) setTimeout(renderAttFeedbackPanel, 0);
    if(typeof ensureAttendanceFollowupsLoaded === 'function') ensureAttendanceFollowupsLoaded(); // "Sent …" under the button
    // The full day-by-day register for this month (it has its own printable download).
    calendarYear = s.y; calendarMonth = s.m;
    const reg = document.createElement('div');
    host.appendChild(reg);
    renderAttendanceRegister(reg);
    // The register's own download bar is replaced by one download card for the month.
    const regBtn = reg.querySelector('[data-dl-end] button');
    const regDownload = regBtn && regBtn.onclick;
    reg.querySelectorAll('[data-dl-end]').forEach(el => el.remove());
    host.appendChild(attDownloadCard('Download — ' + title, [
      { label: '⬇ Monthly report — summary & every child (PDF)', primary: true, run: () => exportReportPdf(report, 'Attendance report — ' + title + ' — ' + (myClassInfo.class_name || ''), 'attendance-' + s.y + '-' + String(s.m + 1).padStart(2, '0')) },
      regDownload ? { label: '⬇ Day-by-day register (PDF)', run: regDownload } : null
    ]));
  }
  // =================================================================
  // MY CLASS — the families. One row per child with the parents' /
  // guardians' details from the REAL family profile (never a sample):
  // who they are, how to reach them, where they live. A child with no
  // profile yet says so, with a button to add it in Family & Parents.
  // (The weekly B/P/A grading that used to be here is now
  //  Assessment → 🧒 Weekly activities.)
  // =================================================================
  var myClassFamilySearch = '';
  function openFamilyProfileFor(name){
    selectedFamilyChildName = name;
    switchSidebarSection('familyparents');
  }
  // Saves the blanks filled in on one row of My Class → the families. Only the fields the
  // teacher typed are changed; everything already saved stays as it was. Goes through the
  // same save_family_profile.php the Family & Parents screen uses (teacher-owned pupils only).
  window.saveFamilyInline = async function(btn){
    const tr = btn.closest('tr'); const name = tr && tr.getAttribute('data-child');
    const pupil = (typeof realPupilsCache !== 'undefined' ? realPupilsCache : []).find(x => x.name === name);
    if(!pupil){ alert('This child is not on the roll yet — check the register first.'); return; }
    const field = f => { const el = tr.querySelector('[data-fam="' + f + '"]'); return el ? el.value.trim() : null; };
    const old = familyRecords[name] || {};
    const oldList = Array.isArray(old.guardianNames) ? old.guardianNames : [];
    const oldOcc = (i) => ((Array.isArray(old.guardians) && old.guardians[i]) || {}).occ || '';
    const pi = Math.max(0, oldList.findIndex(g => g.primary));
    const g1old = oldList[pi] || {};
    const guardianNames = [];
    const guardians = [];
    // primary guardian: keep what is saved, fill what was typed
    const n1 = field('g1name'), r1 = field('g1rel'), ph1 = field('g1phone');
    const g1 = Object.assign({ rel: 'Guardian', edu: '', smart: true }, g1old, { primary: true });
    if(n1 !== null && n1) g1.name = n1; else if(!g1.name) g1.name = '';
    if(r1 !== null && r1) g1.rel = r1;
    if(ph1 !== null && ph1) g1.phone = ph1;
    guardianNames.push(g1); guardians.push({ occ: oldList.length ? oldOcc(pi) : '' });
    // second guardian: keep if saved; otherwise add the optional one if a name was typed
    const g2old = oldList.find((g, i) => i !== pi) || null;
    if(g2old){
      const idx2 = oldList.indexOf(g2old);
      guardianNames.push(g2old); guardians.push({ occ: oldOcc(idx2) });
    } else {
      const n2 = field('g2name'), ph2 = field('g2phone');
      if(n2) { guardianNames.push({ name: n2, rel: 'Guardian', edu: '', phone: ph2 || '', smart: true, primary: false }); guardians.push({ occ: '' }); }
    }
    const langsTyped = field('langs');
    const langs = langsTyped !== null && langsTyped ? langsTyped.split(/[;,]/).map(s => s.trim()).filter(Boolean) : (Array.isArray(old.langs) ? old.langs : []);
    const areaTyped = field('area');
    const locality = areaTyped !== null && areaTyped ? areaTyped : (old.locality || '');
    if(!g1.name){ alert('Type the parent / guardian name first.'); return; }
    const body = {
      pupil_id: pupil.id, locality, mother_tongue: old.motherTongue || '',
      languages_at_home: langs, income_band: old.income || '',
      household_skills: old.skills || [], home_resources: old.res || [],
      siblings_in_programme: old.siblings || 0, adult_reads_programme_language: !!old.reads,
      photo_consent: !!old.photoConsent, consent: !!old.consent, guardians: guardianNames.map((g, i) => Object.assign({}, g, guardians[i])),
      workshop_skills: old.workshopSkills || [], workshop_availability: old.workshopAvailability || [],
      willing_to_volunteer: old.willingToVolunteer === undefined ? null : old.willingToVolunteer,
      scheduled_workshop: old.scheduledWorkshop || null, teacher_approved: !!old.teacherApproved
    };
    const was = btn.textContent; btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const res = await fetch('backend/pupils/save_family_profile.php' + window.location.search, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if(!res.ok || data.status !== 'success'){ alert(data.message || 'Could not save — try again.'); btn.disabled = false; btn.textContent = was; return; }
      familyRecords[name] = Object.assign({}, old, {
        locality, langs, guardianNames, guardians,
        motherTongue: old.motherTongue || '', income: old.income || '',
        skills: old.skills || [], res: old.res || [], siblings: old.siblings || 0, reads: !!old.reads,
        photoConsent: !!old.photoConsent, consent: !!old.consent,
        workshopSkills: old.workshopSkills || [], workshopAvailability: old.workshopAvailability || [],
        willingToVolunteer: body.willing_to_volunteer, scheduledWorkshop: body.scheduled_workshop, teacherApproved: !!old.teacherApproved
      });
      saveFamilyRecords();
      renderMyClass();   // redraw: filled fields become text, the missing list shrinks
    } catch(err){
      alert('No connection — the profile was not saved. Try again when the internet is back.');
      btn.disabled = false; btn.textContent = was;
    }
  };
  // Gender is stored on the child's record. Female / Male / Other — saved when chosen.
  function genderSel(p){
    const opts = ['', 'Female', 'Male', 'Other'].map(g => `<option value="${g}" ${(p.gender || '') === g ? 'selected' : ''}>${g || 'Choose…'}</option>`).join('');
    return `<select data-no-export="1" onchange="saveGenderInline(this)" style="padding:5px 7px; border:1px solid ${p.gender ? 'var(--border)' : '#E0A800'}; border-radius:6px; font-size:12.5px; background:${p.gender ? '#fff' : '#FFFDF2'};">${opts}</select>`;
  }
  window.saveGenderInline = async function(sel){
    const tr = sel.closest('tr'); const name = tr && tr.getAttribute('data-child');
    const pupil = (typeof realPupilsCache !== 'undefined' ? realPupilsCache : []).find(x => x.name === name);
    if(!pupil){ alert('This child is not on the roll yet.'); return; }
    if(!sel.value){ return; }
    sel.disabled = true;
    try {
      const res = await fetch('backend/pupils/save_pupil_gender.php' + window.location.search, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pupil_id: pupil.id, gender: sel.value })
      });
      const data = await res.json().catch(() => ({}));
      if(data.status !== 'success'){ alert(data.message || 'Gender was not saved.'); sel.disabled = false; return; }
      pupil.gender = sel.value;
      renderMyClassFamilies();
    } catch(err){ alert('No connection — gender was not saved.'); sel.disabled = false; }
  };
  function renderMyClassFamilies(){
    const container = document.getElementById('myclass-body');
    container.innerHTML = '';
    container.appendChild(renderTeachingTabBar('myclass'));
    if(!ensurePupilsLoadedFor(container, renderMyClass)) return;
    if(!familyRecordsLoaded){
      ensureFamilyRecordsLoaded(renderMyClass);
      container.appendChild(attNote('Loading the family profiles…'));
      return;
    }
    const kids = realPupilsCache;
    const rec = name => { const r = familyRecords[name]; return r && Array.isArray(r.guardianNames) && r.guardianNames.length ? r : null; };
    const phoneOf = g => (g && g.phone ? String(g.phone).trim() : '');
    const withProfile = kids.filter(p => rec(p.name));
    const reachable = kids.filter(p => { const r = rec(p.name); return r && r.guardianNames.some(g => phoneOf(g)); });
    const smart = kids.filter(p => { const r = rec(p.name); return r && r.guardianNames.some(g => g.smart); });
    container.appendChild(mdSec('My Class — the families', '<span class="reqs">FAM-01…04</span>'));
    const grid = document.createElement('div'); grid.className = 'g g4';
    grid.appendChild(mdTile('Children on roll', kids.length, 'in ' + (myClassInfo.class_name || 'this class'), mdPill('Register order', 'neu'), 'REG-14'));
    grid.appendChild(mdTile('Family profiles', withProfile.length, 'of ' + kids.length + ' filled in', withProfile.length === kids.length && kids.length ? mdPill('Complete', 'good') : mdPill((kids.length - withProfile.length) + ' missing', kids.length - withProfile.length ? 'warn' : 'good'), 'FAM-01'));
    grid.appendChild(mdTile('Reachable by phone', reachable.length, 'families with a number', reachable.length === kids.length && kids.length ? mdPill('All', 'good') : mdPill((kids.length - reachable.length) + ' without', 'warn'), 'FAM-02'));
    grid.appendChild(mdTile('Smartphone at home', smart.length, 'families (for messages / videos)', mdPill(withProfile.length ? Math.round(smart.length / withProfile.length * 100) + '% of profiles' : 'No profiles yet', 'neu'), 'FAM-03'));
    container.appendChild(grid);
    // children not active this month (absent for the whole month), shown here under My Class only
    try {
      const out = (typeof window.assessInactiveChildren === 'function' ? window.assessInactiveChildren('observation') : []) || [];
      if(out.length){
        const nb = document.createElement('div'); nb.setAttribute('data-inactive-note', '');
        nb.style.cssText = 'margin:12px 0; padding:12px 16px; border:1px solid #DDE8E2; background:#F4F5F4; border-radius:12px; font-size:13px;';
        nb.innerHTML = '<b>' + out.length + ' child' + (out.length === 1 ? '' : 'ren') + ' not active this month</b> — no marks for the whole month (absent). They stay on the roll and count again once they get a mark.';
        container.appendChild(nb);
      }
    } catch(e){ /* the note is optional */ }
    const tools = document.createElement('div');
    tools.setAttribute('data-no-export', '1');
    tools.style.cssText = 'display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:6px 0 12px;';
    tools.innerHTML = `<input id="myClassFamilySearch" type="text" placeholder="Search child or parent name…" value="${esc(myClassFamilySearch)}" style="flex:1; min-width:220px; padding:9px 12px; border:1px solid var(--border); border-radius:8px; font-size:13px;" />
      <button class="btn" onclick="switchSidebarSection('familyparents')">👪 Open Family &amp; Parents</button>`;
    container.appendChild(tools);
    const report = document.createElement('div');
    container.appendChild(report);
    const q = myClassFamilySearch.trim().toLowerCase();
    const shown = kids.map((p, i) => ({ p, i })).filter(({ p }) => {
      if(!q) return true;
      const r = rec(p.name);
      return p.name.toLowerCase().includes(q) || (r && r.guardianNames.some(g => String(g.name || '').toLowerCase().includes(q)));
    });
    const guardianCell = (g, occ) => g ? `<b>${esc(g.name || '—')}</b><div class="cap">${esc([g.rel, occ, g.edu].filter(Boolean).join(' · ')) || '—'}</div>` : '<span class="dim">—</span>';
    const phoneCell = g => { const ph = phoneOf(g); return ph ? `<a href="tel:${esc(ph.replace(/[^\d+]/g, ''))}" style="font-weight:600; white-space:nowrap;">📞 ${esc(ph)}</a>${g.smart ? '<div class="cap">Smartphone</div>' : ''}` : '<span class="dim">No number</span>'; };
    // Student ID: the permanent ID that identifies the child (school code - register no + batch year)
    const sid = p => { const v = p.student_id || p.min_no || ''; return v ? `<span style="font-family:ui-monospace, Menlo, Consolas, monospace; font-size:12.5px; font-weight:700; white-space:nowrap;">${esc(v)}</span>` : '<span class="dim" title="Made once the register number (3–5 digits) is entered">—</span>'; };
    let t = '<div class="report-table-wrap"><table class="report-table" style="min-width:860px;"><thead><tr>'
      + '<th>Roll</th><th>Student ID</th><th style="text-align:left;">Child</th><th style="text-align:left;">Gender</th>'
      + '<th style="text-align:left;">Parent / guardian</th><th style="text-align:left;">Phone</th>'
      + '<th style="text-align:left;">Area</th><th style="text-align:left;">Languages at home</th>'
      + '<th style="text-align:left;">Status</th></tr></thead><tbody>';
    // one small box per missing field; filled fields show as plain text
    const fieldBox = (field, ph, type) => `<input data-fam="${field}" type="${type || 'text'}" placeholder="${esc(ph)}" style="width:100%; max-width:170px; min-width:110px; padding:5px 7px; border:1px solid #E0A800; border-radius:6px; font-size:12.5px; background:#FFFDF2; box-sizing:border-box;">`;
    shown.forEach(({ p, i }) => {
      const r = rec(p.name);
      const key = esc(p.name).replace(/'/g, '&#39;');
      const list = r ? r.guardianNames : [];
      const g1 = list.find(g => g.primary) || list[0] || null;
      const g2 = list.find(g => g !== g1) || null;
      const langList = r && Array.isArray(r.langs) ? r.langs.filter(Boolean) : [];
      const hasName = !!(g1 && g1.name), hasPhone = !!(g1 && phoneOf(g1)), hasArea = !!(r && r.locality), hasLangs = langList.length > 0;
      const missing = [];
      if(!hasName) missing.push('parent name');
      if(!hasPhone) missing.push('phone');
      if(!hasArea) missing.push('area');
      if(!hasLangs) missing.push('languages');
      if(!p.gender) missing.push('gender');
      const nameHtml = hasName
        ? `<b>${esc(g1.name)}</b>${g1.rel ? `<div class="cap">${esc(g1.rel)}</div>` : ''}${g2 && g2.name ? `<div class="cap">+ ${esc(g2.name)}</div>` : ''}`
        : fieldBox('g1name', 'Parent name');
      const phoneHtml = hasPhone
        ? `<a href="tel:${esc(phoneOf(g1).replace(/[^\d+]/g, ''))}" style="white-space:nowrap; font-weight:600;">📞 ${esc(phoneOf(g1))}</a>`
        : fieldBox('g1phone', 'Phone', 'tel');
      const areaHtml = hasArea ? esc(r.locality) : fieldBox('area', 'Area');
      const langsHtml = hasLangs ? esc(langList.join(', ')) : fieldBox('langs', 'e.g. Marathi, Hindi');
      const statusHtml = missing.length
        ? `<div class="cap" style="color:#8A5A00; font-weight:700;">Missing: ${esc(missing.join(', '))}</div>`
          + `<button class="btn" data-no-export="1" style="margin-top:4px; padding:4px 12px; font-size:12px;" onclick="saveFamilyInline(this)">Save</button>`
        : `<span class="cap" style="color:#1D6B3A; font-weight:700;">✓ Complete</span> `
          + `<button class="btn" data-no-export="1" style="padding:3px 10px; font-size:11.5px;" onclick="openFamilyProfileFor('${key}')">Edit</button>`;
      t += `<tr data-child="${esc(p.name)}"><td>${i + 1}</td><td>${sid(p)}</td><td style="text-align:left;"><b>${esc(p.name)}</b></td><td style="text-align:left;">${genderSel(p)}</td>`
        + `<td style="text-align:left;">${nameHtml}</td><td style="text-align:left;">${phoneHtml}</td>`
        + `<td style="text-align:left;">${areaHtml}</td><td style="text-align:left;">${langsHtml}</td>`
        + `<td style="text-align:left; min-width:150px;">${statusHtml}</td></tr>`;
    });
    if(!shown.length) t += `<tr><td colspan="9" class="dim" style="text-align:left;">No child or parent matches "${esc(myClassFamilySearch)}".</td></tr>`;
    t += '</tbody></table></div>';
    const w = document.createElement('div'); w.innerHTML = t;
    report.appendChild(mdCard('Every family', 'From each child\u2019s family profile. Tap a number to call. Missing or incomplete profiles can be filled in from Family & Parents (one at a time, or import the Family Profile sheet).', w));
    const search = document.getElementById('myClassFamilySearch');
    search.oninput = () => { myClassFamilySearch = search.value; const pos = search.selectionStart; renderMyClassFamilies(); const s2 = document.getElementById('myClassFamilySearch'); s2.focus(); s2.setSelectionRange(pos, pos); };
    container.appendChild(reportDownloadBar(() => report, 'My Class — families — ' + (myClassInfo.class_name || ''), 'my-class-families', 'Every child with their parents\u2019 details, for this class only.'));
  }
  // Class-list preview (used by the one 📥 Import a file button when the
  // file is a list of children, and by the older children-import card).
  // rows[0] is the header row. Nothing is saved until Confirm.