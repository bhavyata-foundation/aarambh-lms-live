function switchAssessTerm(t){
    if(window.setPortalTerm){ window.setPortalTerm(t); return; }
    if(currentAssessTerm() === t) return;
    assessmentTerm = t;
    const ms = assessTermMonths();
    const now = new Date().toLocaleDateString('en-GB', { month: 'long' });
    currentWorkbookMonth = ms.includes(now) ? now : ms[0];
    obsRangeFrom = ms[0]; obsRangeTo = ms[ms.length - 1];   // Observation shows the whole term
    currentObservationThemeId = null;
    if(typeof preTestTallyLoadedFor !== 'undefined') preTestTallyLoadedFor = null; // reload that term's Pre-Test tally
    renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  // The top bar is fixed and its height changes (taller with the Jr KG / Sr KG switch, or when it wraps),
  // so a frozen bar must sit exactly under it: measured, and kept in step when the top bar resizes.
  function assessStickyTop(){ const tb = document.querySelector('.topbar'); return tb ? Math.round(tb.getBoundingClientRect().height) : 0; }
  function assessStickyRefresh(){ const t = assessStickyTop() + 'px'; document.querySelectorAll('[data-term-sticky]').forEach(el => { el.style.top = t; }); }
  if(!window.__assessStickyHook){
    window.__assessStickyHook = true;
    window.addEventListener('resize', assessStickyRefresh);
    window.addEventListener('load', assessStickyRefresh);
    if(window.ResizeObserver){ const tb = document.querySelector('.topbar'); if(tb) new ResizeObserver(assessStickyRefresh).observe(tb); }
  }
  // The colour the page is actually painted with behind this container (so a frozen bar blends in).
  function assessPageBg(el){
    for(let n = el; n && n.nodeType === 1; n = n.parentElement){
      const c = getComputedStyle(n).backgroundColor;
      if(c && c !== 'transparent' && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(c)) return c;
    }
    return '#f4f4f2';
  }
  function renderAssessTermBar(container){
    return; // the Term switch is at the top of the portal now, so the per-page Term row is not drawn
    const t = currentAssessTerm();
    const bar = document.createElement('div');
    bar.setAttribute('data-no-export', '1');
    bar.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:0 0 16px;';
    bar.innerHTML = '<b style="font-size:13px; margin-right:4px;">Term</b>' + [1, 2].map(k => {
      const on = k === t, T = ASSESS_TERMS[k];
      return `<button type="button" onclick="switchAssessTerm(${k})" style="padding:8px 16px; border-radius:99px; border:1px solid ${on ? 'transparent' : 'var(--border)'}; background:${on ? 'var(--primary)' : '#fff'}; color:${on ? '#fff' : 'var(--text)'}; font-size:13px; font-weight:600; cursor:pointer;">${T.label} <span style="font-weight:400; opacity:.85;">· ${T.span}</span></button>`;
    }).join('');
    // Same Term bar on EVERY assessment tab (Pre-Test, Observation, Workbook, Motor, Records):
    // frozen under the fixed top bar, same spacing, and the page's own background (no tinted band).
    bar.setAttribute('data-term-sticky', '1');
    bar.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:0 0 12px; padding:6px 0; position:sticky; top:' + assessStickyTop() + 'px; z-index:40; background:' + assessPageBg(container) + ';';
    container.appendChild(bar);
  }
  // =================================================================
  // ASSESSMENT RECORDS → Σ TOTAL for a WHOLE TERM — the collective report.
  // Adds up every month of the chosen term (Observation, Workbook and
  // Motor month by month; the Pre-Test baseline once — it is one tally
  // per term, not one per month).
  // =================================================================
  var recordsWholeTerm = false;
  // The records Month dropdown: the term's months, plus "Whole Term" for Σ Total.
  function fillRecordsMonthSelect(sel){
    if(assessmentRecordsType === 'total'){
      const T = ASSESS_TERMS[currentAssessTerm()];
      const o = document.createElement('option'); o.value = '__term'; o.textContent = 'Whole ' + T.label + ' (' + T.span + ') — collective report';
      if(recordsWholeTerm) o.selected = true;
      sel.appendChild(o);
    } else recordsWholeTerm = false;
    assessTermMonths().forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; if(!recordsWholeTerm && m === currentWorkbookMonth) o.selected = true; sel.appendChild(o); });
    sel.onchange = () => {
      if(sel.value === '__term') recordsWholeTerm = true;
      else { recordsWholeTerm = false; currentWorkbookMonth = sel.value; }
      assessmentRecordsRefresh();
    };
  }
  // ---- Viva (term-level): the saved B / P / A per question for the class and term, cached per term ----
  window.vivaTermCache = window.vivaTermCache || {};
  function vivaLoad(termNum, redraw){
    const cid = (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_id) || null;
    if(!cid) return {};
    const key = cid + '|' + termNum;
    if(window.vivaTermCache[key] !== undefined) return window.vivaTermCache[key];
    window.vivaTermCache[key] = null;
    const qs = window.location.search ? '&' + window.location.search.slice(1) : '';
    fetch('backend/assessment/viva/get_viva.php?class_id=' + encodeURIComponent(cid) + '&term=TERM_' + termNum + qs, { cache: 'no-store' })
      .then(r => r.json()).then(d => { window.vivaTermCache[key] = d.status === 'success' ? (d.marks || {}) : {}; if(redraw) redraw(); })
      .catch(() => { window.vivaTermCache[key] = {}; if(redraw) redraw(); });
    return null;
  }
  function computeCgTotalsTerm(months, reRender){
    const per = months.map(m => ({ month: m, T: computeCgTotals(m, reRender) }));
    if(per.some(x => x.T.loading)) return { loading: true };
    // Viva belongs to the term of these months (Term 1: June–October, Term 2: November–March)
    const vivaTermNum = (months || []).some(m => /^nov|^dec|^jan|^feb|^mar/i.test(String(m))) ? 2 : 1;
    const vivaMarks = vivaLoad(vivaTermNum, reRender);
    if(vivaMarks === null) return { loading: true };
    const rows = {}, errors = new Set(), recorded = { observation: 0, workbook: 0, pretest: 0, motor: 0, viva: 0 }, children = {};
    const blank = code => ({ code, items: new Set(), observation: { b: 0, p: 0, a: 0 }, workbook: { b: 0, p: 0, a: 0 }, pretest: { b: 0, p: 0, a: 0 }, motor: { b: 0, p: 0, a: 0 }, viva: { b: 0, p: 0, a: 0 } });
    per.forEach(({ T }, i) => {
      T.errors.forEach(e => errors.add(e));
      Object.entries(T.children || {}).forEach(([pid, cgs]) => Object.entries(cgs).forEach(([code, r]) => {
        const c = children[pid] || (children[pid] = {});
        const t = c[code] || (c[code] = { observation: { b: 0, p: 0, a: 0 }, workbook: { b: 0, p: 0, a: 0 }, motor: { b: 0, p: 0, a: 0 } });
        ['observation', 'workbook', 'motor'].forEach(k => ['b', 'p', 'a'].forEach(x => { t[k][x] += (r[k] || {})[x] || 0; }));
      }));
      ['observation', 'workbook', 'motor'].forEach(k => { recorded[k] += T.recorded[k]; });
      if(i === 0) recorded.pretest = T.recorded.pretest;              // baseline: once
      T.codes.forEach(code => {
        const src = T.rows[code], r = rows[code] || (rows[code] = blank(code));
        ['observation', 'workbook', 'motor'].concat(i === 0 ? ['pretest'] : []).forEach(k => { r[k].b += src[k].b; r[k].p += src[k].p; r[k].a += src[k].a; });
        src.items.forEach(x => { if(i === 0 || !/^Pre-Test/.test(x)) r.items.add(x); });
      });
    });
    // drop rows that only had a Pre-Test entry repeated from later months (none left after the merge rule) and sort
    // Viva: each question's B / P / A counts toward every CG code it is linked to
    Object.entries(vivaMarks).forEach(([pid, qm]) => (window.VIVA_QUESTIONS || []).forEach(q => {
      const v = qm[q.no]; const t = v === 'B' ? 'b' : v === 'P' ? 'p' : v === 'A' ? 'a' : '';
      if(!t) return;
      recorded.viva++;
      q.cgs.forEach(c => { const code = cgCode(c); const r = rows[code] || (rows[code] = blank(code)); r.viva[t]++; });
    }));
    const codes = Object.keys(rows).filter(c => ['observation', 'workbook', 'pretest', 'motor', 'viva'].some(k => rows[c][k].b + rows[c][k].p + rows[c][k].a))
      .sort((x, y) => cgMajor(x) - cgMajor(y) || parseFloat(x.slice(3)) - parseFloat(y.slice(3)));
    return { loading: false, rows, codes, errors: [...errors], motorNote: '', books: null, recorded, perMonth: per, children };
  }
/* ===== teacher-part-15.js ===== */
/* =========================================================================
   teacher-part-15.js — Attendance across the academic year (Phase 1).
   Load AFTER teacher-part-14.js. Shares the global scope with parts 01-14.
   What it does
   - Fetches the whole academic year (Jun..Apr) in ONE call.
   - Builds one row per month with attendance %, effective strength,
     children below 70%, and a coverage % (days marked / working days).
   - Never shows made-up numbers: a month with no marks is "Not recorded".
   - Flags the highest and lowest month, but only among months where at
     least COVERAGE_MIN % of working days were marked.
   ========================================================================= */
var attendanceYearStore = {};   // startYear -> { status, data, at, message }
var ATT_COVERAGE_MIN = 60;      // % of working days that must be marked before a month can be called highest/lowest
var ATT_BELOW_MIN_DAYS = 4;     // a child needs this many marked days in a month to count as "below 70%"
var ATT_STALE_MS = 60000;       // re-fetch when the dashboard is opened and data is older than this
function attPad(n){ return String(n).padStart(2, '0'); }
// Academic year starts in June. Jan..Apr belong to the NEXT calendar year.
function attAcademicStartYear(){
  const n = new Date();
  return n.getMonth() >= 5 ? n.getFullYear() : n.getFullYear() - 1;
}
function attAcademicYearFor(m){
  const s = attAcademicStartYear();
  return m >= 5 ? s : s + 1;
}
async function fetchAttendanceYear(startYear){
  const st = attendanceYearStore[startYear] || (attendanceYearStore[startYear] = {});
  if(!myClassInfo.class_id){ st.status = 'error'; st.message = 'Still loading your class info — try again in a moment.'; return; }
  st.status = 'loading';
  try{
    const params = new URLSearchParams({ class_id: myClassInfo.class_id, start_year: startYear });
    const res = await fetch('backend/attendance/get_attendance_year.php?' + params.toString() + (window.location.search ? '&' + window.location.search.slice(1) : ''));
    const data = await res.json();
    if(data.status === 'success'){ st.status = 'loaded'; st.data = data; st.at = Date.now(); st.message = ''; }
    else { st.status = 'error'; st.message = data.message || 'Could not load the year.'; }
  } catch(err){
    st.status = 'error'; st.message = 'Could not reach the server.';
  }
  const box = document.getElementById('attendancedashboard-body');
  if(box && !box.classList.contains('hidden')) renderAttendanceDashboard();
}
function attRetryYear(){
  delete attendanceYearStore[attAcademicStartYear()];
  renderAttendanceDashboard();
}
// Days with at least one mark in month m (0-11): from the year call when we have it,
// otherwise from whatever month data is already loaded.
function attMarkedDaysFor(m){
  const y = attAcademicYearFor(m);
  const st = attendanceYearStore[attAcademicStartYear()];
  if(st && st.data) return (st.data.marked_days || {})[y + '-' + attPad(m + 1)] || 0;
  return countMarkedDatesInMonth(y, m).length;
}
// One row per academic month elapsed so far.
function attYearRows(){
  const startYear = attAcademicStartYear();
  const st = attendanceYearStore[startYear];
  const d = st && st.data;
  const roster = Array.isArray(realPupilsCache) ? realPupilsCache : [];
  const now = new Date();
  const curIdx = ACADEMIC_MONTHS.indexOf(now.getMonth());
  const months = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS; // May: the year is over, show all
  const rows = months.map(m => {
    const y = attAcademicYearFor(m);
    const ym = y + '-' + attPad(m + 1);
    const monthEnd = ym + '-' + attPad(new Date(y, m + 1, 0).getDate());
    const onRoll = roster.filter(p => !p.admitted_date || p.admitted_date <= monthEnd);
    const studentDays = studentDaysInMonth(y, m);
    const daysMarked = d ? ((d.marked_days || {})[ym] || 0) : 0;
    let present = 0, marked = 0, below70 = 0;
    onRoll.forEach(p => {
      const cell = d && d.children && d.children[String(p.id)] && d.children[String(p.id)][ym];
      if(!cell) return;
      present += cell[0]; marked += cell[1];
      if(cell[1] >= ATT_BELOW_MIN_DAYS && cell[0] / cell[1] * 100 < 70) below70++;
    });
    const round1 = v => Math.round(v * 10) / 10;
    return {
      m, y, ym,
      label: new Date(y, m, 1).toLocaleDateString([], { month: 'long', year: 'numeric' }),
      short: new Date(y, m, 1).toLocaleDateString([], { month: 'short' }),
      studentDays, roll: onRoll.length, daysMarked, presentSlots: present, markedSlots: marked,
      hasData: marked > 0,
      pct: marked ? round1(present / marked * 100) : null,
      effective: (daysMarked && marked) ? round1(present / daysMarked) : null,
      coverage: studentDays ? Math.min(100, Math.round(daysMarked / studentDays * 100)) : 0,
      below70, flag: ''
    };
  });
  // Highest / lowest only among months we can trust.
  const eligible = rows.filter(r => r.hasData && r.coverage >= ATT_COVERAGE_MIN);
  if(eligible.length >= 2){
    let hi = eligible[0], lo = eligible[0];
    eligible.forEach(r => { if(r.pct > hi.pct) hi = r; if(r.pct < lo.pct) lo = r; });
    if(hi !== lo){ hi.flag = 'high'; lo.flag = 'low'; }
  }
  return rows;
}
function attYtd(rows){
  let present = 0, marked = 0, months = 0;
  rows.forEach(r => { if(r.hasData){ months++; present += r.presentSlots; marked += r.markedSlots; } });
  return { months, pct: marked ? Math.round(present / marked * 1000) / 10 : 0 };
}
function attAnalysisText(rows){
  const rec = rows.filter(r => r.hasData);
  if(!rec.length) return 'No attendance has been recorded yet this academic year.';
  let t = 'Attendance is recorded for ' + rec.length + ' of ' + rows.length + ' month' + (rows.length === 1 ? '' : 's') + ' so far.';
  const hi = rows.find(r => r.flag === 'high'), lo = rows.find(r => r.flag === 'low');
  if(hi && lo) t += ' Highest: ' + hi.short + ' (' + hi.pct + '%). Lowest: ' + lo.short + ' (' + lo.pct + '%), ' + (Math.round((hi.pct - lo.pct) * 10) / 10) + ' points lower.';
  else t += ' A highest and lowest month can be named once at least two months have ' + ATT_COVERAGE_MIN + '% or more of their days marked.';
  const thin = rec.filter(r => r.coverage < ATT_COVERAGE_MIN);
  if(thin.length) t += ' ' + thin.map(r => r.short).join(', ') + (thin.length === 1 ? ' has' : ' have') + ' fewer than ' + ATT_COVERAGE_MIN + '% of days marked, so may not be representative.';
  const none = rows.length - rec.length;
  if(none) t += ' ' + none + ' month' + (none === 1 ? ' is' : 's are') + ' not recorded.';
  return t;
}
// Line chart with real gaps for months that were not recorded.
function attLineSvg(rows, key, color, w, opts){
  opts = opts || {};
  const h = 200, padL = 40, padR = 16, padT = 20, padB = 26, n = rows.length;
  const vals = rows.filter(r => r[key] != null).map(r => r[key]);
  if(!vals.length) return '<p class="cap">Nothing recorded yet.</p>';
  const pad = key === 'pct' ? 4 : 1;
  const vMin = Math.max(0, Math.min(...vals) - pad);
  let vMax = Math.max(...vals) + pad; if(key === 'pct') vMax = Math.min(100, vMax);
  const span = Math.max(1e-6, vMax - vMin);
  const xStep = n > 1 ? (w - padL - padR) / (n - 1) : 0;
  const X = i => n > 1 ? padL + i * xStep : (w + padL - padR) / 2;
  const Y = v => padT + (h - padT - padB) * (1 - (v - vMin) / span);
  let path = '', prevOk = false;
  rows.forEach((r, i) => {
    if(r[key] == null){ prevOk = false; return; }
    path += (prevOk ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(r[key]).toFixed(1) + ' ';
    prevOk = true;
  });
  const dots = rows.map((r, i) => {
    if(r[key] == null) return '';
    const fill = opts.flags ? (r.flag === 'high' ? 'var(--success,#2e9e5b)' : r.flag === 'low' ? 'var(--danger,#c8433f)' : color) : color;
    const hollow = r.coverage < ATT_COVERAGE_MIN;
    const x = X(i).toFixed(1), y = Y(r[key]).toFixed(1);
    return '<circle cx="' + x + '" cy="' + y + '" r="4.5" fill="' + (hollow ? '#fff' : fill) + '" stroke="' + fill + '" stroke-width="2"><title>' + esc(r.label + ': ' + r[key] + (opts.suffix || '') + (hollow ? ' (low coverage: ' + r.coverage + '% of days marked)' : '')) + '</title></circle>'
      + '<text x="' + x + '" y="' + (Y(r[key]) - 9).toFixed(1) + '" font-size="11" text-anchor="middle" fill="var(--text)">' + r[key] + '</text>';
  }).join('');
  const labels = rows.map((r, i) => '<text x="' + X(i).toFixed(1) + '" y="' + (h - 6) + '" font-size="10.5" text-anchor="middle" fill="' + (r.hasData ? 'var(--text-muted)' : '#b5b5b5') + '">' + esc(r.short) + (r.hasData ? '' : '*') + '</text>').join('');
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%; height:auto;">'
    + '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (h - padB) + '" stroke="var(--border)"></line>'
    + '<line x1="' + padL + '" y1="' + (h - padB) + '" x2="' + (w - padR) + '" y2="' + (h - padB) + '" stroke="var(--border)"></line>'
    + '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2"></path>' + dots + labels + '</svg>'
    + '<p class="cap" style="margin:4px 0 0;">* not recorded. Hollow dot = under ' + ATT_COVERAGE_MIN + '% of days marked.</p>';
}
// Replaces the old renderAttendanceAcrossYear body (which mixed in "(sample)" numbers).
function renderAttendanceYearReport(container, month){
  const startYear = attAcademicStartYear();
  const st = attendanceYearStore[startYear];
  const stale = !st || (st.status === 'loaded' && Date.now() - st.at > ATT_STALE_MS);
  if(stale) fetchAttendanceYear(startYear);
  container.appendChild(mdSec('Month by month', ''));
  if(!st || (!st.data && st.status === 'loading')){
    const p = document.createElement('p'); p.className = 'cap'; p.textContent = 'Loading attendance for the whole year…';
    container.appendChild(p); return;
  }
  if(!st.data && st.status === 'error'){
    const p = document.createElement('div'); p.className = 'au-error';
    p.innerHTML = esc(st.message || 'Could not load the year.') + ' <button class="btn-ghost" onclick="attRetryYear()">Try again</button>';
    container.appendChild(p); return;
  }
  const rows = attYearRows();
  const head = document.createElement('div');
  head.innerHTML = '<p style="font-weight:600; margin:4px 0 2px;">Roll, attendance and effective strength</p>'
    + '<p class="cap" style="margin-bottom:14px;">Only real marks are counted: attendance % = present marks ÷ marks taken. A month with nothing entered says “Not recorded” — nothing is estimated. '
    + '<b>Coverage</b> = days marked ÷ working days; under ' + ATT_COVERAGE_MIN + '% means the month’s figure may not be representative. Highest/lowest are only named among months at or above that.</p>';
  container.appendChild(head);
  let t = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Month</th><th>Student days</th><th>On roll</th><th>Days marked</th><th>Coverage</th><th>Attendance %</th><th>Effective strength</th><th>Below 70%</th></tr></thead><tbody>';
  rows.forEach(r => {
    const badge = r.flag === 'high' ? ' ' + mdPill('Highest', 'good') : r.flag === 'low' ? ' ' + mdPill('Lowest', 'crit') : '';
    if(!r.hasData){
      t += '<tr><td><b>' + esc(r.label) + '</b></td><td>' + r.studentDays + '</td><td>' + r.roll + '</td><td>0</td><td colspan="4">' + mdPill('Not recorded', 'neu') + '</td></tr>';
      return;
    }
    t += '<tr><td><b>' + esc(r.label) + '</b>' + badge + '</td><td>' + r.studentDays + '</td><td>' + r.roll + '</td><td>' + r.daysMarked + '</td>'
      + '<td>' + r.coverage + '%' + (r.coverage < ATT_COVERAGE_MIN ? ' ' + mdPill('Low coverage', 'warn') : '') + '</td>'
      + '<td>' + pctBar(r.pct, undefined, undefined, true) + '</td><td>' + r.effective + '</td><td>' + r.below70 + '</td></tr>';
  });
  t += '</tbody></table></div>';
  const card = document.createElement('div');
  card.className = 'card'; card.style.padding = '22px'; card.innerHTML = t;
  container.appendChild(card);
  const analysis = document.createElement('div');
  analysis.className = 'card'; analysis.style.cssText = 'padding:18px 22px; margin-top:14px; background:var(--bg);';
  analysis.innerHTML = '<h4 style="margin:0 0 6px; font-size:13px;">Analysis</h4><p style="margin:0; font-size:13.5px; line-height:1.6;">' + esc(attAnalysisText(rows)) + '</p>';
  container.appendChild(analysis);
  // Trend + child-wise for the selected month
  const twoCol = document.createElement('div');
  twoCol.style.cssText = 'display:grid; gap:20px; margin-top:22px; grid-template-columns:' + (window.innerWidth < 900 ? '1fr' : '1fr 1fr') + ';';
  const trend = document.createElement('div');
  trend.className = 'card'; trend.style.padding = '22px';
  trend.innerHTML = '<h4 style="margin:0 0 4px;">Attendance across the year</h4>' + attLineSvg(rows, 'pct', 'var(--primary)', 460, { flags: true, suffix: '%' });
  twoCol.appendChild(trend);
  const y = attAcademicYearFor(month);
  const monthName = new Date(y, month, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
  const cur = computeAttendanceDashboardStats(y, month);
  const childPanel = document.createElement('div');
  childPanel.className = 'card'; childPanel.style.padding = '22px';
  let childRows = '<p class="cap">No attendance marked for ' + esc(monthName) + ' yet.</p>';
  if(cur.hasData){
    childRows = assessmentPupilNames().map(name => {
      const marked = cur.perChildMarked[name] || 0, present = cur.perChildPresent[name] || 0;
      const pct = marked ? present / marked * 100 : 0;
      const color = !marked ? 'var(--border)' : pct >= 85 ? 'var(--success)' : pct >= 70 ? '#EE8F35' : 'var(--danger,#c8433f)';
      return '<div class="hbar-row"><div class="hbar-row-label">' + esc(name) + '</div><div class="hbar-track"><div class="hbar-fill" style="width:' + (marked ? Math.round(pct) : 0) + '%; background:' + color + ';"></div></div><div class="hbar-count">' + (marked ? present + '/' + marked : 'no marks') + '</div></div>';
    }).join('');
  }
  childPanel.innerHTML = '<h4 style="margin:0 0 4px;">Child-wise, ' + esc(monthName) + '</h4><p class="cap" style="margin:0 0 16px;">REP-09 · every child against their own denominator.</p>' + childRows;
  twoCol.appendChild(childPanel);
  container.appendChild(twoCol);
  const eff = document.createElement('div');
  eff.className = 'card'; eff.style.cssText = 'padding:22px; margin-top:20px;';
  eff.innerHTML = '<h4 style="margin:0 0 4px;">Effective strength across the year</h4>' + attLineSvg(rows, 'effective', '#5c7cfa', 940, {});
  container.appendChild(eff);
}