// Shared tab state for the Assessment Dashboard. teacher.js (which used to declare these) is no longer
// loaded on the teacher page, so they are declared here on window so every script can see them.
window.assessmentDashboardTab = window.assessmentDashboardTab || 'overview';
window.assessmentRecordsType = window.assessmentRecordsType || 'observation';

/* =========================================================================
   js/assessment-reports.js — Assessment Dashboard → 📄 Reports
   -------------------------------------------------------------------------
   Four views, all from the marks already saved in the portal:
     • 🧒 Student Report  — the HPC card for one child (hpc-card.js), real
                            Pre-Test and Term marks, with a child selector.
     • 🏫 School Report   — the class / school performance analysis
                            (school-report.js), real marks of every child.
     • 📋 Class report    — one row per child: each competency's level, the
                            overall level (Pre-Test → Term), the competencies
                            at B; and, per competency, how many children are
                            at B / P / A.
     • 📝 Progress report — one child, as the HPC Student_Report: overview,
                            competency-wise, domain-wise, Panchakosha,
                            prominent, improvement, room for improvement (with
                            focus areas and activities), teacher's notes.
   Rules (agreed Oct 2026):
     • Baseline = Pre-Test; Term = Observation + Workbook + Fine & Gross Motor
       of the term's months.
     • A competency = the child's average over all its observations
       (B = 1, P = 2, A = 3).
     • Levels shown are only B / P / A: average ≥ 2.5 → A, ≥ 1.5 → P, else B.
     • Parameters, domains, koshas and the overall level are
       COMPETENCY-WEIGHTED: the average of their competencies, each counted
       once however often it was observed.
     • No ranking anywhere — each child is compared with their own Pre-Test.
   Needs js/hpc-master.js (competency → CG, parameter, domain, kosha),
   js/hpc-card.js and js/school-report.js (the two cards) — all in teacher.html.
   Loads after the part files (wraps renderAssessmentDashboard).
   ========================================================================= */
(function(){
  'use strict';
  if(typeof renderAssessmentDashboard !== 'function') return;

  const R = window.__aarReports = { view: 'hpcstudent', child: null, pre: {}, preKey: null, preLoading: false, preError: '' };
  const LV = { B: ['Beginner', '#FCE3E1', '#9B1C1C', '#F1B4AE'], P: ['Proficient', '#FFF1CC', '#7A5300', '#F2D27A'], A: ['Advanced', '#DDF2E5', '#1E6B46', '#9FD3BB'] };
  const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tier = t => t === 'E' || t === 'B' || t === 'R' ? 'b' : t === 'P' || t === 'Y' ? 'p' : t === 'A' || t === 'G' ? 'a' : '';
  const levelOf = m => m == null ? null : m >= 2.5 ? 'A' : m >= 1.5 ? 'P' : 'B';
  const meanOf = c => { const n = c.b + c.p + c.a; return n ? (c.b + 2 * c.p + 3 * c.a) / n : null; };
  const avg = xs => { const v = xs.filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const code = raw => window.HPC ? HPC.code(raw) : String(raw || '').trim();
  // the children who are assessed (attendance-only children are left out: js/attendance-only.js)
  const kids = () => typeof assessmentRoll === 'function' ? assessmentRoll() : (Array.isArray(realPupilsCache) ? realPupilsCache : []);
  const classLevel = () => typeof workbookLevelFromClassName === 'function' ? workbookLevelFromClassName() : 'Jr KG';
  const term = () => typeof currentAssessTerm === 'function' ? currentAssessTerm() : 1;
  const termMonths = () => typeof assessTermMonths === 'function' ? assessTermMonths() : [];
  const chip = (L, title) => L ? `<span title="${h(title || LV[L][0])}" style="display:inline-block; min-width:22px; padding:2px 6px; border-radius:6px; font-weight:800; font-size:12px; text-align:center; background:${LV[L][1]}; color:${LV[L][2]}; border:1px solid ${LV[L][3]};">${L}</span>` : '<span class="cap" style="margin:0;">—</span>';
  const move = (a, b) => { const r = { B: 1, P: 2, A: 3 }; if(!a || !b) return ''; return r[b] > r[a] ? '↑' : r[b] < r[a] ? '↓' : '→'; };
  const redraw = () => { try { const b = document.getElementById('assessmentdashboard-body') || null; if(typeof assessmentDashboardTab !== 'undefined' && assessmentDashboardTab === 'reports') renderAssessmentDashboard(); } catch(e){} };
  const schoolName = () => (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.school_name) || '';
  const academicYear = () => { const n = new Date(), y = n.getMonth() >= 5 ? n.getFullYear() : n.getFullYear() - 1; return y + '-' + String(y + 1).slice(2); };

  // ---- Pre-Test marks from the database (the baseline) ----
  function preTestList(){
    const sr = /Sr/i.test(classLevel());
    if(sr && typeof PRETEST_ACTIVITIES_SR !== 'undefined') return PRETEST_ACTIVITIES_SR;
    if(!sr && typeof PRETEST_ACTIVITIES_JR !== 'undefined') return PRETEST_ACTIVITIES_JR;
    return typeof WEEKLY_ASSESSMENT_ACTIVITIES !== 'undefined' ? WEEKLY_ASSESSMENT_ACTIVITIES : [];
  }
  function loadPre(){
    const cid = (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_id) || null;
    if(!cid) return true;
    const key = cid + '|PRE|TERM_1';
    if(R.preKey === key) return true;
    if(R.preLoading) return false;
    R.preLoading = true; R.preError = '';
    const qs = window.location.search ? '&' + window.location.search.slice(1) : '';
    fetch('backend/assessment/pretest/get_pretest_assessment.php?class_id=' + encodeURIComponent(cid) + '&term=TERM_1' + qs, { cache: 'no-store' })
      .then(r => r.json()).then(d => {
        if(d.status !== 'success') throw new Error(d.message || 'Could not load the Pre-Test.');
        R.pre = {}; Object.entries(d.sessions || {}).forEach(([pid, s]) => { R.pre[+pid] = s.marks || {}; });
        R.preKey = key;
      }).catch(e => { R.preError = e.message || String(e); R.preKey = key; })
      .finally(() => { R.preLoading = false; redraw(); });
    return false;
  }

  // ---- Viva: the saved B / P / A per question for the class and term (get_viva.php) ----
  function loadViva(){
    const cid = (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_id) || null;
    if(!cid) return true;
    const key = cid + '|' + term();
    if(R.vivaKey === key) return true;
    if(R.vivaLoading) return false;
    R.vivaLoading = true;
    const qs = window.location.search ? '&' + window.location.search.slice(1) : '';
    fetch('backend/assessment/viva/get_viva.php?class_id=' + encodeURIComponent(cid) + '&term=TERM_' + term() + qs, { cache: 'no-store' })
      .then(r => r.json()).then(d => { R.viva = d.status === 'success' ? (d.marks || {}) : {}; R.vivaKey = key; })
      .catch(() => { R.viva = {}; R.vivaKey = key; })
      .finally(() => { R.vivaLoading = false; redraw(); });
    return false;
  }

  // ---- every child's marks, per competency: { pre: {pid: {code: {b,p,a}}}, term: {…} } ----
  function gather(){
    const level = classLevel(), months = termMonths(), ready = [];
    ready.push(loadPre());
    ready.push(loadViva());
    months.forEach(m => {
      if(typeof ensureObservationThemesLoaded === 'function') ready.push(ensureObservationThemesLoaded(level, m, redraw));
      if(typeof ensureObservationAssessmentLoaded === 'function') ready.push(ensureObservationAssessmentLoaded(m, redraw));
      if(typeof ensureWorkbookPagesLoaded === 'function') ready.push(ensureWorkbookPagesLoaded(level, m, redraw));
      if(typeof ensureWorkbookChildMarksLoaded === 'function') ready.push(ensureWorkbookChildMarksLoaded(m, redraw));
    });
    if(typeof ensureMotorAssessmentLoaded === 'function') ready.push(ensureMotorAssessmentLoaded(redraw));
    if(ready.some(x => x === false)) return null;

    const pre = {}, trm = {};
    const add = (store, pid, c, t) => { if(!c || !t) return; const k = (store[pid] = store[pid] || {}); const x = (k[c] = k[c] || { b: 0, p: 0, a: 0 }); x[t]++; };
    // Viva (Term): each question's B / P / A counts toward every CG code it is linked to
    const vivaCid = (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_id) || null;
    if(vivaCid && R.vivaKey === vivaCid + '|' + term() && R.viva){
      kids().forEach(p => {
        const qm = R.viva[String(p.id)] || {};
        (window.VIVA_QUESTIONS || []).forEach(q => { const v = qm[q.no]; if(v) q.cgs.forEach(c => add(trm, p.id, code(c), tier(v))); });
      });
    }
    // Pre-Test: activity number → its CG / competency
    const acts = preTestList();
    kids().forEach(p => Object.entries(R.pre[p.id] || {}).forEach(([n, g]) => { const a = acts[+n - 1]; if(a && !a.retired) add(pre, p.id, code(a.cg), tier(g)); }));
    // Term: Observation + Workbook + Motor
    months.forEach(m => {
      const themes = (typeof observationThemesCache !== 'undefined' && observationThemesCache[level + '|' + m]) || [];
      const om = (typeof observationAssessmentCache !== 'undefined' && observationAssessmentCache[m]) || {};
      (Array.isArray(themes) ? themes : []).forEach(t => (t.items || []).forEach(it => kids().forEach(p => add(trm, p.id, code(it.cg_code), tier((om[p.id] || {})[it.id])))));
      const books = (typeof workbookPagesCache !== 'undefined' && workbookPagesCache[level + '|' + m]) || [];
      const wm = (typeof workbookChildMarksCache !== 'undefined' && workbookChildMarksCache[m]) || {};
      (Array.isArray(books) ? books : []).forEach(b => (b.pages || []).forEach(pg => kids().forEach(p => add(trm, p.id, code(pg.cg_code), tier((wm[p.id] || {})[pg.id])))));
      if(typeof MOTOR_MONTHS !== 'undefined' && MOTOR_MONTHS.includes(m) && typeof motorRating === 'function' && typeof motorCgFor === 'function')
        ['fine', 'gross'].forEach(kind => { const c = code(motorCgFor(kind)); if(c && typeof MOTOR_ACTIVITIES !== 'undefined' && (MOTOR_ACTIVITIES[kind] || {})[m]) kids().forEach(p => add(trm, p.id, c, tier(motorRating(p.id, kind, m)))); });
    });
    return { pre, term: trm };
  }

  const sortCodes = (x, y) => { const n = s => (String(s).match(/\d+(\.\d+)?/g) || ['999']).map(Number); const a = n(x), b = n(y); return (a[0] - b[0]) || ((a[1] || 0) - (b[1] || 0)) || String(x).localeCompare(String(y)); };
  const info = c => (window.HPC && HPC.info(c)) || { code: c, cg: '', domain: null, kosha: null, param: null };

  // "CG-3" is a whole curricular goal, not a competency. Fine & Gross Motor marks are saved at goal level,
  // so these codes carry marks but have no competency text: keep them out of the competency lists.
  const isGoalCode = c => /^CG-\d+$/i.test(String(c).trim());

  // ---- one child's profile ----
  function profile(data, pid){
    const pre = data.pre[pid] || {}, trm = data.term[pid] || {};
    const codes = [...new Set([...Object.keys(pre), ...Object.keys(trm)])].sort(sortCodes);
    const comps = codes.map(c => { const mp = pre[c] ? meanOf(pre[c]) : null, mt = trm[c] ? meanOf(trm[c]) : null; const i = info(c);
      return { code: c, i, pre: levelOf(mp), term: levelOf(mt), mp, mt, counts: trm[c] || { b: 0, p: 0, a: 0 } }; });
    const group = key => { const g = {}; comps.forEach(x => { const k = x.i[key]; if(!k) return; (g[k] = g[k] || []).push(x); }); return g; };
    const roll = list => ({ mp: avg(list.map(x => x.mp)), mt: avg(list.map(x => x.mt)), n: list.length,
      b: list.filter(x => x.term === 'B').length, p: list.filter(x => x.term === 'P').length, a: list.filter(x => x.term === 'A').length });
    return { comps, overall: roll(comps), domains: group('domain'), koshas: group('kosha'), params: group('param'), roll };
  }
  const statusNote = (a, b) => !b ? ['Not assessed this term', ''] : !a ? ['New this term', b === 'B' ? 'Assessed this term only — at Beginner; needs focused support.' : 'Assessed this term only.']
    : a === 'B' && b === 'A' ? ['Big leap', 'Remarkable leap from Beginner to Advanced — offer enrichment.']
    : move(a, b) === '↑' ? ['Improved', 'Improved to ' + LV[b][0] + ' — reinforce so it stays secure.']
    : move(a, b) === '↓' ? ['Slipped', 'Slipped since the Pre-Test — review with guided practice.']
    : b === 'A' ? ['Prominent', 'Secure at Advanced — offer enrichment and leadership roles.']
    : b === 'P' ? ['On track', 'Steady at Proficient — add challenge to move towards Advanced.']
    : ['Needs support', 'Still at Beginner — needs focused one-to-one or small-group support.'];

  // ---- the child's levels in the shape the two HPC cards take: { "C-1.1": "B"|"P"|"A" } ----
  function hpcInputs(data, pid){
    const pr = profile(data, pid), pre = {}, trm = {};
    pr.comps.forEach(x => { if(isGoalCode(x.code)) return; if(x.pre) pre[x.code] = x.pre; if(x.term) trm[x.code] = x.term; });
    return { pre, term: trm };
  }

  // ---- 🧒 STUDENT REPORT (the HPC card, one child) ----
  function hpcStudentReport(data, root){
    const ks = kids(); const p = ks.find(k => k.id === R.child) || ks[0];
    if(!p){ root.innerHTML = '<p class="cap">No children on the roll.</p>'; return; }
    if(!window.HPCCard){ root.innerHTML = '<p class="cap">The Student Report needs js/hpc-card.js — add it to teacher.html (after js/hpc-master.js).</p>'; return; }
    R.child = p.id;
    const sel = `<div class="no-print" style="margin:0 0 12px;"><label style="font-size:13px; font-weight:700;">Child <select onchange="aarOpenChild(+this.value)" style="margin-left:6px; padding:7px 10px; border:1px solid var(--border); border-radius:8px; font:inherit; font-size:13.5px;">${ks.map(k => `<option value="${k.id}" ${k.id === p.id ? 'selected' : ''}>${h(k.name)}</option>`).join('')}</select></label></div>`;
    const lv = hpcInputs(data, p.id), today = new Date().toISOString().slice(0, 10);
    let card = '';
    try {
      card = HPCCard.render({
        schoolName: schoolName(), className: classLevel() + (/Sr/i.test(classLevel()) ? ' (Balvatika 3)' : ' (Balvatika 2)'), academicYear: academicYear(), reportDate: today,
        student: { name: p.name, roll: p.register_no || p.student_id || p.min_no || '', gender: p.gender || '', joined: String(p.admitted_date || '').slice(0, 10) },
        pre: lv.pre, term: lv.term, attendance: null, rounds: null
      });
    } catch(e){ console.error('HPC card', e); card = '<p class="cap" style="color:#9B1C1C;">The Student Report could not be drawn: ' + h(e.message || e) + '</p>'; }
    root.innerHTML = sel + card;
    // number the visible Student Report sections 1, 2, 3 ... in the order they appear
    root.querySelectorAll('.hpc-sec-t').forEach(function (el, i) { el.textContent = el.textContent.replace(/^\s*[0-9A-Za-z]+\s*·/, (i + 1) + ' ·'); });
  }

  // ---- 🏫 SCHOOL REPORT (class / school analysis of every child) ----
  function hpcSchoolReport(data, root){
    const ks = kids();
    if(!ks.length){ root.innerHTML = '<p class="cap">No children on the roll.</p>'; return; }
    if(!window.HPCSchool){ root.innerHTML = '<p class="cap">The School Report needs js/school-report.js — add it to teacher.html (after js/hpc-master.js).</p>'; return; }
    let html = '';
    try {
      html = HPCSchool.render({
        schoolName: schoolName(), className: classLevel() + (/Sr/i.test(classLevel()) ? ' (Balvatika 3)' : ' (Balvatika 2)'), academicYear: academicYear(), termLabel: termLabel(),
        cohort: ks.map(p => hpcInputs(data, p.id))
      });
    } catch(e){ console.error('School report', e); html = '<p class="cap" style="color:#9B1C1C;">The School Report could not be drawn: ' + h(e.message || e) + '</p>'; }
    root.innerHTML = html;
  }

  // ---- CLASS REPORT ----
  function classReport(data, root){
    const ks = kids(), profs = {}; ks.forEach(p => { profs[p.id] = profile(data, p.id); });
    const allCodes = [...new Set(ks.flatMap(p => profs[p.id].comps.map(x => x.code)))].sort(sortCodes);
    const codes = allCodes.filter(c => !isGoalCode(c)), goalCodes = allCodes.filter(isGoalCode);
    const nAt = L => ks.filter(p => levelOf(profs[p.id].overall.mt) === L).length;
    const nAssessed = ks.filter(p => profs[p.id].overall.mt != null).length;
    const summary = `<div style="display:flex; gap:10px; flex-wrap:wrap; margin:6px 0 14px;">
        ${['B', 'P', 'A'].map(L => `<div style="flex:1 1 140px; padding:12px 14px; border-radius:12px; background:${LV[L][1]}; border:1px solid ${LV[L][3]};"><div style="font-size:12px; font-weight:800; color:${LV[L][2]}; text-transform:uppercase; letter-spacing:.06em;">${L} · ${LV[L][0]}</div><b style="font-size:26px; color:${LV[L][2]};">${nAt(L)}</b> <span class="cap" style="margin:0;">of ${nAssessed} children overall</span></div>`).join('')}</div>`;
    const head = `<tr><th style="text-align:left; position:sticky; left:0; background:var(--surface, #fff);">Child</th><th style="text-align:left;">Student ID</th>${codes.map(c => `<th title="${h((info(c).text || '') + (info(c).cgName ? ' · ' + info(c).cg + ' ' + info(c).cgName : ''))}" style="font-size:11px; white-space:nowrap;">${h(c)}</th>`).join('')}<th>Pre-Test</th><th>Term</th><th></th><th style="text-align:left;">Competencies at B</th></tr>`;
    const rows = ks.map(p => { const pr = profs[p.id], byCode = {}; pr.comps.forEach(x => { byCode[x.code] = x; });
      const atB = pr.comps.filter(x => x.term === 'B').map(x => x.code);
      const Lp = levelOf(pr.overall.mp), Lt = levelOf(pr.overall.mt);
      return `<tr><td style="text-align:left; white-space:nowrap; position:sticky; left:0; background:var(--surface, #fff);"><a href="#" onclick="aarOpenChild(${p.id}); return false;" style="font-weight:700; color:inherit;">${h(p.name)}</a></td><td style="text-align:left; white-space:nowrap; font-size:12px;">${h(p.student_id || p.min_no || '—')}</td>
        ${codes.map(c => { const x = byCode[c]; return `<td style="text-align:center;">${x ? chip(x.term, (x.pre ? 'Pre-Test ' + x.pre + ' → ' : '') + (x.term ? 'Term ' + x.term : 'not assessed this term')) : ''}</td>`; }).join('')}
        <td style="text-align:center;">${chip(Lp)}</td><td style="text-align:center;">${chip(Lt)}</td><td style="text-align:center; font-weight:800;">${move(Lp, Lt)}</td>
        <td style="text-align:left; font-size:12px;">${atB.length ? `<b>${atB.length}</b> · ${h(atB.join(', '))}` : '<span class="cap" style="margin:0;">none</span>'}</td></tr>`; }).join('');
    // class statistics — a table of its own: one row per competency
    const statRows = codes.map(c => { const n = L => ks.filter(p => { const x = profs[p.id].comps.find(y => y.code === c); return x && x.term === L; }).length;
      const nb = n('B'), np = n('P'), na = n('A'), none = ks.length - nb - np - na, i = info(c);
      const cls = levelOf(avg(ks.map(p => { const x = profs[p.id].comps.find(y => y.code === c); return x ? x.mt : null; })));
      const cell = (v, L) => `<td style="text-align:center; font-weight:700; ${v && L ? 'background:' + LV[L][1] + '; color:' + LV[L][2] + ';' : ''}">${v || '—'}</td>`;
      return `<tr><td><b>${h(c)}</b></td><td style="text-align:left;">${h(i.text || '')}</td><td style="text-align:left; white-space:nowrap;">${h(i.domain && window.HPC && HPC.domains[i.domain] ? HPC.domains[i.domain].short || HPC.domains[i.domain].name : '')}</td>${cell(nb, 'B')}${cell(np, 'P')}${cell(na, 'A')}<td style="text-align:center;">${none || '—'}</td><td style="text-align:center;">${chip(cls)}</td></tr>`; }).join('');
    const stats = `<h4 style="margin:22px 0 4px;">Class statistics — each competency</h4>
      <p class="cap" style="margin:0 0 8px;">How many children are at each level this term, and the class level for that competency (the average of the children's levels).</p>
      <div style="overflow-x:auto;"><table class="report-table" style="width:100%; font-size:12.5px;"><thead><tr><th>Code</th><th style="text-align:left;">Competency</th><th style="text-align:left;">Domain</th><th>Children at B</th><th>at P</th><th>at A</th><th>Not assessed</th><th>Class level</th></tr></thead><tbody>${statRows || '<tr><td colspan="8" class="cap">No marks yet.</td></tr>'}</tbody></table></div>${goalCodes.length ? `<p class="cap" style="margin:8px 0 0;">Also assessed at whole-goal level, with no competency attached: <b>${goalCodes.map(c => h(c)).join(', ')}</b> (Fine &amp; Gross Motor ratings). They count in each child's overall level but have no competency row here.</p>` : ''}`;

    root.innerHTML = `<p class="cap" style="margin:0 0 6px;">Each cell is the child's level for that competency this term (hover for Pre-Test → Term). Overall = the average of the child's competencies, each counted once. Click a name for the child's report.</p>
      ${summary}
      <h4 style="margin:6px 0 8px;">Children</h4>
      <div style="overflow-x:auto;"><table class="report-table" style="width:100%; font-size:12.5px;"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
      ${stats}`;
  }
  const termLabel = () => (term() === 2 ? 'Term 2' : 'Term 1') + ' (Pre-Test → ' + (termMonths()[0] || '') + '–' + (termMonths().slice(-1)[0] || '') + ')';

  // ---- PROGRESS REPORT (one child, written out) ----
  // One download button on the parent report: this child's PDF, or the whole class as a ZIP.
  function parentDownloadMenu(getRoot, title, fname){
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative; display:inline-block;';
    const main = document.createElement('button');
    main.type = 'button';
    main.textContent = '⬇ Download report ▾';
    main.style.cssText = 'padding:8px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
    const menu = document.createElement('div');
    menu.style.cssText = 'display:none; position:absolute; bottom:calc(100% + 6px); left:0; z-index:20; min-width:260px; background:#fff; border:1px solid #C9D6CF; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,.12); padding:6px;';
    const item = (label, sub, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.cssText = 'display:block; width:100%; text-align:left; padding:9px 10px; border:none; background:none; border-radius:8px; cursor:pointer; font:inherit;';
      b.innerHTML = '<b style="font-size:13px;">' + zipEsc(label) + '</b><div style="font-size:11.5px; color:#5b6b62; margin-top:2px;">' + zipEsc(sub) + '</div>';
      b.onmouseenter = () => b.style.background = '#F0F8F4';
      b.onmouseleave = () => b.style.background = 'none';
      b.onclick = () => { menu.style.display = 'none'; fn(); };
      return b;
    };
    const status = document.createElement('span');
    status.style.cssText = 'font-size:12.5px; color:#5b6b62; margin-left:10px;';
    menu.appendChild(item("This child's report (PDF)", 'The report on screen, saved as a PDF', () => parentSingleDownload(getRoot(), status, main)));
    menu.appendChild(item('Whole class (ZIP of PDFs)', 'One PDF per child, each on one page, in one ZIP', () => parentZipAll(getRoot(), status, main, true)));
    menu.appendChild(item('Whole class (fast ZIP of web pages)', 'One web page per child, in one ZIP. Quick; open in a browser and print to PDF', () => parentZipAll(getRoot(), status, main, false)));
    main.onclick = () => { menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; };
    wrap.appendChild(main); wrap.appendChild(menu); wrap.appendChild(status);
    return wrap;
  }

  // ---- PDF of a parent report: opened sections, no buttons or boxes, fitted to one A4 page ----
  function cleanReportCopy(root){
    const c = root.cloneNode(true);
    c.removeAttribute('style'); // the hidden working area's off-screen position must not go into the saved page
    c.querySelectorAll('.no-print').forEach(x => x.remove());
    c.querySelectorAll('[data-zip-bar],[data-dl-end],button,select,textarea,input,.pn-edit').forEach(x => x.remove());
    c.querySelectorAll('details').forEach(d => d.setAttribute('open', ''));
    // report sections are opened with the hpc-open class; open every one, and show its body
    c.querySelectorAll('.hpc-sec').forEach(sec => sec.classList.add('hpc-open'));
    c.querySelectorAll('.hpc-sec-body').forEach(b => { b.style.display = 'block'; });
    c.querySelectorAll('[data-pn="view"]').forEach(v => { v.style.display = 'block'; });
    c.querySelectorAll('*').forEach(e => { if(e.childElementCount === 0 && /^click to (open|close)/i.test(e.textContent.trim())) e.remove(); });
    return c;
  }
  async function reportToPdfBlob(copy, childName){
    if(typeof html2pdf === 'undefined') throw new Error('the PDF library did not load; check the connection and reload the page');
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed; left:-12000px; top:0; width:794px; background:#fff;';
    holder.innerHTML = '<style>' + allPageCss() + '</style>';
    const page = document.createElement('div');
    page.style.cssText = 'width:794px; box-sizing:border-box; padding:18px 22px; background:#fff; color:#111; font:13px system-ui,sans-serif;';
    page.innerHTML = '<h1 style="font:700 18px system-ui,sans-serif; margin:0 0 10px;">' + zipEsc(childName) + '</h1>';
    page.appendChild(copy);
    holder.appendChild(page);
    document.body.appendChild(holder);
    try {
      await new Promise(r => setTimeout(r, 150));
      // one page exactly as tall as the report: nothing is cut off and nothing is scaled
      const h = Math.ceil(page.getBoundingClientRect().height) + 2;
      return await html2pdf().set({
        margin: 0,
        image: { type: 'jpeg', quality: 0.85 },
        html2canvas: { scale: 1, useCORS: true, logging: false, backgroundColor: '#ffffff', scrollY: 0, windowHeight: h },
        jsPDF: { unit: 'px', format: [794, h], orientation: 'portrait' },
        pagebreak: { mode: [] }
      }).from(page).outputPdf('blob');
    } finally { holder.remove(); }
  }
  function saveBlob(blob, name){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function parentSingleDownload(root, statusEl, btnEl){
    const k = (kids() || []).find(x => x.id === R.child) || { name: 'Child' };
    btnEl.disabled = true; statusEl.textContent = 'Making the PDF…';
    try {
      const blob = await reportToPdfBlob(cleanReportCopy(root), k.name);
      saveBlob(blob, zipSafeName(k.name) + ' - Parent Report.pdf');
      statusEl.textContent = 'Done.';
    } catch(e){ statusEl.textContent = 'Stopped: ' + (e.message || e); }
    finally { btnEl.disabled = false; }
  }

  // ---- Download every child's parent report as one ZIP, each file named after the child ----
  const zipEsc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const zipSafeName = v => String(v || 'Child').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim() || 'Child';
  function addParentZipBar(root){
    if(root.querySelector('[data-zip-bar]')) return;
    const bar = document.createElement('div');
    bar.setAttribute('data-zip-bar', '');
    bar.style.cssText = 'display:flex; justify-content:flex-end; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:12px;';
    bar.innerHTML = '<span data-zip-status style="font-size:12.5px; color:#5b6b62;"></span>' +
      '<button type="button" style="padding:8px 14px; border-radius:8px; border:none; background:#0E6B4E; color:#fff; font-weight:700; cursor:pointer;">⬇ Download all parent reports (ZIP)</button>';
    bar.querySelector('button').onclick = () => parentZipAll(root, bar);
    root.insertBefore(bar, root.firstChild);
  }
  // the child's name shown as its own field in the report (the drop-down is ignored)
  function hasChildName(root, name){
    return [...root.querySelectorAll('*')].some(e => e.childElementCount === 0 && !e.closest('select') && e.textContent.trim() === name);
  }
  function waitForChildReport(root, name, timeoutMs){
    return new Promise(resolve => {
      const begin = Date.now();
      const tick = () => {
        if(hasChildName(root, name)) return resolve(true);
        if(Date.now() - begin > timeoutMs) return resolve(false);
        setTimeout(tick, 80);
      };
      setTimeout(tick, 50);
    });
  }
  function allPageCss(){
    return Array.from(document.styleSheets).map(ss => { try { return Array.from(ss.cssRules).map(r => r.cssText).join('\n'); } catch(e){ return ''; } }).join('\n');
  }
  // One web page per child: all sections open, a Print / Save as PDF button, and printed pages
  // that keep each section and table row together (no cut-off sections, no shrinking)
  function webPageHtml(name, css, reportHtml){
    const printCss = '@page{size:A4;margin:10mm}' +
      'body{margin:0;background:#fff;color:#111;font:13px system-ui,sans-serif}' +
      '#rpt{max-width:760px;margin:0 auto;padding:14px 16px}' +
      '@media print{' +
        '.no-print{display:none!important}' +
        '#rpt{max-width:none;padding:0}' +
        'body{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
        'tr,.hpc-card,[class*="card"]{break-inside:avoid;page-break-inside:avoid}' +
        '.hpc-sec-head,h1,h2,h3,h4{break-after:avoid;page-break-after:avoid}' +
        'table{page-break-inside:auto}' +
      '}';
    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>' + zipEsc(name) + ' · Parent report</title><style>' + css + printCss + '</style></head><body>' +
      '<div class="no-print" style="max-width:760px; margin:10px auto 0; padding:0 16px; text-align:right;">' +
      '<button type="button" onclick="window.print()" style="padding:8px 14px; border-radius:8px; border:none; background:#0E6B4E; color:#fff; font-weight:700; cursor:pointer;">Print / Save as PDF</button></div>' +
      '<div id="rpt"><h1 style="font:700 18px system-ui,sans-serif; margin:0 0 10px;">' + zipEsc(name) + '</h1>' + reportHtml + '</div>' +
      '</body></html>';
  }
  // status line: text, percentage and a bar
  function setProgress(statusEl, pct, text){
    const p = Math.max(0, Math.min(100, pct));
    // a box fixed at the top right, so the progress shows wherever you are on the page
    let box = document.getElementById('aarZipProgress');
    if(!box){
      box = document.createElement('div');
      box.id = 'aarZipProgress';
      box.style.cssText = 'position:fixed; top:140px; right:24px; z-index:100000; min-width:280px; max-width:360px; background:#fff; border:1px solid #9FD3BB; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.18); padding:12px 14px; font:13px system-ui,sans-serif; color:#1D2B22;';
      document.body.appendChild(box);
    }
    box.style.display = 'block';
    box.innerHTML = '<div style="font-weight:800; margin-bottom:6px;">' + zipEsc(text) + '</div>' +
      '<div style="display:flex; align-items:center; gap:10px;"><span style="flex:1; height:10px; background:#E3ECE7; border-radius:5px; overflow:hidden;"><span style="display:block; height:10px; width:' + p + '%; background:#0E6B4E; transition:width .2s;"></span></span>' +
      '<b style="min-width:42px; text-align:right;">' + p + '%</b></div>';
    if(p >= 100) setTimeout(() => { box.style.display = 'none'; }, 6000);
    statusEl.innerHTML = '<span style="font-weight:700; color:#17765B;">' + zipEsc(text) + ' · ' + p + '%</span>' +
      '<span style="display:inline-block; width:160px; height:8px; background:#E3ECE7; border-radius:4px; vertical-align:middle; margin-left:8px; overflow:hidden;">' +
      '<span style="display:block; height:8px; width:' + p + '%; background:#0E6B4E; transition:width .2s;"></span></span>';
  }
  async function parentZipAll(root, statusEl, btnEl, asPdf = true){
    if(typeof JSZip === 'undefined'){ alert('The ZIP library did not load. Check the internet connection and reload the page.'); return; }
    const ks = kids() || [];
    if(!ks.length){ alert('No children on the roll.'); return; }
    const status = statusEl, btn = btnEl;
    const original = R.child;
    const zip = new JSZip(), used = new Set(), css = allPageCss(), failed = [];
    const data = asPdf ? null : gather();
    const combined = [];
    if(!asPdf && !data){ statusEl.textContent = 'The marks are still loading. Try again in a moment.'; btnEl.disabled = false; return; }
    btn.disabled = true;
    try {
      for(let i = 0; i < ks.length; i++){
        const k = ks[i];
        setProgress(status, Math.round(90 * i / ks.length), 'Preparing ' + (i + 1) + ' of ' + ks.length + ': ' + k.name);
        let copy;
        if(asPdf){
          aarOpenChild(k.id); aarSetView('parent');
          const ok = await waitForChildReport(root, k.name, 15000);
          if(!ok){ failed.push(k.name); continue; } // skip this child, carry on with the rest
          copy = cleanReportCopy(root);
        } else {
          // build this child's report directly in a hidden area: the screen is not redrawn
          R.child = k.id;
          const tmp = document.createElement('div');
          tmp.style.cssText = 'position:absolute; left:-20000px; top:0; width:794px;';
          document.body.appendChild(tmp);
          try { parentReport(data, tmp); copy = cleanReportCopy(tmp); }
          catch(e){ failed.push(k.name); continue; }
          finally { tmp.remove(); }
        }
        if(!asPdf){ combined.push('<div' + (combined.length ? ' style="break-before:page; page-break-before:always;"' : '') + '><h1 style="font:700 18px system-ui,sans-serif; margin:0 0 10px;">' + zipEsc(k.name) + '</h1>' + copy.outerHTML + '</div>'); }
        const base = zipSafeName(k.name) + ' - Parent Report';
        const ext = asPdf ? '.pdf' : '.html';
        let fname = base + ext, n = 2;
        while(used.has(fname.toLowerCase())) fname = base + ' ' + (n++) + ext;
        used.add(fname.toLowerCase());
        if(asPdf){
          zip.file(fname, await reportToPdfBlob(copy, k.name));
        } else {
          // web page: no drawing step, so it is quick
          zip.file(fname, webPageHtml(k.name, css, copy.outerHTML));
        }
      }
      if(!asPdf && combined.length){
        const cls = zipSafeName((typeof myClassInfo !== 'undefined' && myClassInfo ? myClassInfo.class_name : '') || 'class');
        zip.file('All Parent Reports - ' + cls + ' (print once to one PDF).html', webPageHtml('All parent reports · ' + cls, css, combined.join('')));
      }
      setProgress(status, 90, 'Building the ZIP…');
      const blob = await zip.generateAsync({ type: 'blob' }, meta => setProgress(status, 90 + Math.round(meta.percent * 0.1), 'Building the ZIP…'));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'Parent Reports - ' + zipSafeName((typeof myClassInfo !== 'undefined' && myClassInfo ? myClassInfo.class_name : '') || 'class') + '.zip';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setProgress(status, 100, 'Done: ' + (ks.length - failed.length) + ' of ' + ks.length + ' reports' + (failed.length ? ' (skipped: ' + failed.join(', ') + ')' : ''));
    } catch(e){
      status.textContent = 'Stopped: ' + (e.message || e);
    } finally {
      if(original){ aarOpenChild(original); aarSetView('parent'); }
      btn.disabled = false;
    }
  }

  // Score bands legend: what each score range means, shown in the report itself
  function bandLegendHtml(){
    const row = (name, range, lvl, bg, fg, text) =>
      '<tr><td style="padding:6px 8px;"><span style="display:inline-block; padding:3px 10px; border-radius:999px; font-weight:700; background:' + bg + '; color:' + fg + ';">' + name + '</span></td>' +
      '<td style="padding:6px 8px; font-weight:700; white-space:nowrap;">' + range + '</td><td style="padding:6px 8px; white-space:nowrap;">' + lvl + '</td><td style="padding:6px 8px;">' + text + '</td></tr>';
    return '<section class="hpc-sec hpc-open" style="margin-top:12px;">' +
      '<div class="hpc-sec-head" style="background:#1d9e75; color:#fff; padding:10px 14px; font-weight:800;">SCORE BANDS · what the score means</div>' +
      '<div class="hpc-sec-body" style="display:block; padding:10px 14px;">' +
      '<p style="margin:0 0 8px; font-size:12.5px;">Score = 1 × % Beginner + 2 × % Proficient + 3 × % Advanced (range 100 to 300).</p>' +
      '<table style="width:100%; border-collapse:collapse; font-size:12.5px;"><thead><tr>' +
      '<th style="text-align:left; padding:6px 8px;">Band</th><th style="text-align:left; padding:6px 8px;">Score</th><th style="text-align:left; padding:6px 8px;">Level</th><th style="text-align:left; padding:6px 8px;">What it means</th></tr></thead><tbody>' +
      row('Very Strong', '250 – 300', 'Advanced (A)', '#1B5E20', '#FFFFFF', 'Secure at Advanced. Ready for enrichment and leadership tasks.') +
      row('Strong', '200 – 249', 'Proficient (P)', '#A9D18E', '#1B5E20', 'Secure at Proficient. Encouraged towards Advanced-level tasks.') +
      row('Developing', '150 – 199', 'Proficient (P)', '#FFD966', '#5D4037', 'Mixed levels. Continued guided practice and reinforcement.') +
      row('Needs Intervention', 'below 150', 'Beginner (B)', '#F4A6A0', '#7F0000', 'Mostly Beginner. Needs small-group or one-to-one support.') +
      '</tbody></table></div></section>';
  }
  // ---- Parent report: the Student Report card itself, without the Normalised gain tile ----
  function parentReport(data, root){
    const ks = kids(); const p = ks.find(k => k.id === R.child) || ks[0];
    hpcStudentReport(data, root);
    // remove the Normalised gain card (its label sits in a card inside the row of cards)
    const label = [...root.querySelectorAll('*')].find(e => e.childElementCount === 0 && /^Normalised gain$/i.test(e.textContent.trim()));
    if(label){
      let card = label;
      while(card.parentElement && card.parentElement !== root && card.parentElement.childElementCount < 4) card = card.parentElement;
      card.remove();
    }
    // the parent report leaves out section 2 (competency-wise) and section 4 (panchakosha-wise)
    ['COMPETENCY-WISE PERFORMANCE', 'PANCHAKOSHA-WISE DEVELOPMENT'].forEach(t => {
      const el = [...root.querySelectorAll('*')].find(e => e.childElementCount === 0 && e.textContent.indexOf(t) >= 0);
      if(!el) return;
      let c = el;
      while(c.parentElement && c.parentElement !== root && c.parentElement.childElementCount < 6) c = c.parentElement;
      c.remove();
    });
    // renumber the remaining sections 1 to 6, in order (the leaves are matched by title; ROOM comes before IMPROVEMENT)
    [['OVERALL OVERVIEW', 1], ['DOMAIN-WISE DEVELOPMENT', 2], ['BEST PERFORMANCE IN CG', 3], ['WEAK PERFORMING CGs', 4], ["TEACHER'S REVIEW NOTES", 5]].forEach(([t, n]) => {
      const el = [...root.querySelectorAll('*')].find(e => e.childElementCount === 0 && e.textContent.indexOf(t) >= 0 && /^\s*\d+\s*·/.test(e.textContent));
      if(el) el.textContent = el.textContent.replace(/^\s*\d+\s*·/, n + ' ·');
    });
    // score bands legend, just above the footer
    try {
      const foot = root.querySelector('.hpc-footer'), leg = document.createElement('div');
      leg.innerHTML = bandLegendHtml();
      if(foot && foot.parentNode) foot.parentNode.insertBefore(leg, foot); else root.appendChild(leg);
    } catch(e){ console.warn('band legend:', e); }
    // teacher's review note (speak / translate) and the Hindi switch
    const termKey = 'TERM_' + (typeof currentAssessTerm === 'function' ? currentAssessTerm() : 1);
    try { if(window.parentNotes && p) window.parentNotes.mount(root, p.id, (typeof myClassInfo !== 'undefined' && myClassInfo ? myClassInfo.class_id : null), termKey); } catch(e) { console.warn('parent notes:', e); }
    // changing the child keeps the parent report open
    const sel = root.querySelector('select');
    if(sel){ sel.onchange = function(){ aarOpenChild(+this.value); aarSetView('parent'); }; }
  }
  function studentReport(data, root){
    const ks = kids(); const p = ks.find(k => k.id === R.child) || ks[0];
    if(!p){ root.innerHTML = '<p class="cap">No children on the roll.</p>'; return; }
    R.child = p.id;
    const pr = profile(data, p.id), o = pr.overall, Lp = levelOf(o.mp), Lt = levelOf(o.mt);
    const moves = pr.comps.filter(x => x.pre && x.term).map(x => move(x.pre, x.term));
    const up = moves.filter(m => m === '↑').length, same = moves.filter(m => m === '→').length, down = moves.filter(m => m === '↓').length;
    const ready = o.n ? Math.round((o.p + o.a) / Math.max(1, o.b + o.p + o.a) * 100) : null;
    const ranked = (g, name) => Object.entries(g).map(([k, l]) => [k, avg(l.map(x => x.mt))]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]).map(([k]) => name(k));
    const dName = k => (window.HPC && HPC.domains[k] ? HPC.domains[k].name : k), kName = k => (window.HPC && HPC.koshas[k] ? HPC.koshas[k].short : k);
    const dRank = ranked(pr.domains, dName), kRank = ranked(pr.koshas, kName);
    const first = (p.name || '').split(' ')[0];
    const auto = Lt ? `${first} is at ${LV[Lt][0]} overall at the end of term${Lp ? ', ' + (move(Lp, Lt) === '↑' ? 'up from ' + LV[Lp][0] : move(Lp, Lt) === '↓' ? 'down from ' + LV[Lp][0] : 'the same as') + ' at the Pre-Test' : ''}. ${up} competenc${up === 1 ? 'y' : 'ies'} improved${o.b ? ', and ' + o.b + ' still need support' : ''}.${dRank.length > 1 ? ' Strongest in ' + dRank[0] + '; most support needed in ' + dRank[dRank.length - 1] + '.' : ''}` : `${first} has no Term marks yet.`;
    const sel = `<label style="font-size:13px; font-weight:700;">Child <select onchange="aarOpenChild(+this.value); aarSetView('student')" style="margin-left:6px; padding:7px 10px; border:1px solid var(--border); border-radius:8px; font:inherit; font-size:13.5px;">${ks.map(k => `<option value="${k.id}" ${k.id === p.id ? 'selected' : ''}>${h(k.name)}</option>`).join('')}</select></label>`;
    const tile = (label, val, sub) => `<div style="flex:1 1 150px; padding:12px 14px; border:1px solid #E3E7E3; border-radius:12px;"><div style="font-size:11.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#5b6b62;">${label}</div><div style="margin-top:6px; font-size:20px; font-weight:800;">${val}</div><div class="cap" style="margin:4px 0 0;">${sub || ''}</div></div>`;
    const sec = (n, t) => `<h4 style="margin:22px 0 8px; padding-bottom:6px; border-bottom:2px solid var(--primary, #1E8F5E);">${n} · ${t}</h4>`;
    const areaTable = (g, name) => `<div style="overflow-x:auto;"><table class="report-table" style="width:100%; font-size:13px;"><thead><tr><th style="text-align:left;">Area</th><th>Competencies</th><th>Term B / P / A</th><th>Pre-Test</th><th>Term</th><th></th><th style="text-align:left;">Review note</th></tr></thead><tbody>
      ${Object.entries(g).sort((a, b) => sortCodes(a[0], b[0])).map(([k, l]) => { const r = pr.roll(l), a = levelOf(r.mp), b = levelOf(r.mt); return `<tr><td style="text-align:left;"><b>${h(name(k))}</b></td><td style="text-align:center;">${r.n}</td><td style="text-align:center;">${r.b} / ${r.p} / ${r.a}</td><td style="text-align:center;">${chip(a)}</td><td style="text-align:center;">${chip(b)}</td><td style="text-align:center; font-weight:800;">${move(a, b)}</td><td style="text-align:left; font-size:12px;">${h(b ? (window.HPC ? HPC.remark(b === 'A' ? 'Very Strong' : b === 'P' ? 'Strong' : 'Needs Intervention') : '') : 'Not assessed this term')}</td></tr>`; }).join('')}</tbody></table></div>`;
    const list = (xs, empty) => xs.length ? `<ul style="margin:6px 0; padding-left:20px; columns:2; column-gap:28px;">${xs.map(x => `<li style="margin:3px 0; font-size:13px;"><b>${h(x.code)}</b> — ${h(x.i.text || '')}</li>`).join('')}</ul>` : `<p class="cap" style="margin:4px 0;">${empty}</p>`;
    const atB = pr.comps.filter(x => x.term === 'B'), slipped = pr.comps.filter(x => move(x.pre, x.term) === '↓');
    const focus = {}; atB.forEach(x => { if(x.i.param) (focus[x.i.param] = focus[x.i.param] || []).push(x.code); });
    root.innerHTML = `<div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center;">${sel}<span class="cap" style="margin:0;">${h(classLevel())} · ${h(termLabel())}</span></div>
      <p class="cap" style="margin:12px 0 0;">${p.student_id || p.min_no ? 'Student ID ' + h(p.student_id || p.min_no) + ' · ' : ''}${p.register_no ? 'Register no ' + h(p.register_no) + ' · ' : ''}${p.admitted_date ? 'Joined ' + h(p.admitted_date) : ''}</p>
      ${sec(1, 'Overall overview')}
      <div style="display:flex; gap:10px; flex-wrap:wrap;">${tile('Pre-Test', chip(Lp), Lp ? LV[Lp][0] : 'no Pre-Test marks')}${tile('Term', chip(Lt), Lt ? LV[Lt][0] : 'no Term marks yet')}${tile('Change', move(Lp, Lt) || '—', move(Lp, Lt) === '↑' ? 'moved up' : move(Lp, Lt) === '↓' ? 'moved down' : move(Lp, Lt) ? 'same level' : '')}${tile('Readiness', ready == null ? '—' : ready + '%', 'competencies at P or A this term')}${tile('Movement', `↑ ${up} · → ${same} · ↓ ${down}`, 'competencies since the Pre-Test')}</div>
      <p style="margin:10px 0 0; font-size:13.5px;"><b>Strongest / most support:</b> ${dRank.length ? h(dRank[0]) + ' / ' + h(dRank[dRank.length - 1]) : '—'} &nbsp;·&nbsp; <b>Kosha:</b> ${kRank.length ? h(kRank[0]) + ' / ' + h(kRank[kRank.length - 1]) : '—'}</p>
      <p style="margin:8px 0 0; padding:10px 12px; border-radius:10px; background:#F3FAF6; font-size:13.5px;"><b>Teacher's overview (auto):</b> ${h(auto)}</p>
      ${sec(2, 'Competency-wise performance')}
      <div style="overflow-x:auto;"><table class="report-table" style="width:100%; font-size:12.5px;"><thead><tr><th>Code</th><th style="text-align:left;">Competency</th><th>CG</th><th style="text-align:left;">Domain</th><th>Pre-Test</th><th>Term</th><th></th><th style="text-align:left;">Status</th><th style="text-align:left;">Review note</th></tr></thead><tbody>
      ${pr.comps.filter(x => !isGoalCode(x.code)).map(x => { const [st, note] = statusNote(x.pre, x.term); return `<tr><td><b>${h(x.code)}</b></td><td style="text-align:left;">${h(x.i.text || '')}</td><td>${h(x.i.cg || '')}</td><td style="text-align:left;">${h(x.i.domain ? dName(x.i.domain) : '')}</td><td style="text-align:center;">${chip(x.pre)}</td><td style="text-align:center;">${chip(x.term)}</td><td style="text-align:center; font-weight:800;">${move(x.pre, x.term)}</td><td style="text-align:left;">${h(st)}</td><td style="text-align:left; font-size:12px;">${h(note)}</td></tr>`; }).join('') || '<tr><td colspan="9" class="cap">No marks yet.</td></tr>'}</tbody></table></div>
      ${sec(3, 'Domain-wise development')}${areaTable(pr.domains, dName)}
      ${sec(4, 'Panchakosha-wise development')}${areaTable(pr.koshas, kName)}
      ${sec(5, 'Prominent competencies ⭐ (Advanced this term)')}${list(pr.comps.filter(x => x.term === 'A'), 'None at Advanced yet.')}
      ${sec(6, 'Improvement 📈 (moved up since the Pre-Test)')}${list(pr.comps.filter(x => move(x.pre, x.term) === '↑'), 'No movement up yet.')}
      ${sec(7, 'Room for improvement 🎯')}
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:12px;"><div><b style="font-size:13px;">Still at Beginner</b>${list(atB, 'None — well done.')}</div><div><b style="font-size:13px;">Slipped since the Pre-Test</b>${list(slipped, 'None.')}</div></div>
      ${Object.keys(focus).length ? `<div style="overflow-x:auto; margin-top:8px;"><table class="report-table" style="width:100%; font-size:12.5px;"><thead><tr><th style="text-align:left;">Focus area</th><th style="text-align:left;">Needs support in</th><th style="text-align:left;">Suggested activities (class & home)</th></tr></thead><tbody>${Object.entries(focus).map(([k, cs]) => `<tr><td style="text-align:left;"><b>${h(window.HPC && HPC.params[k] ? HPC.params[k].name : k)}</b></td><td style="text-align:left;">${h(cs.join(', '))}</td><td style="text-align:left;">${h(window.HPC ? HPC.nextStep(k, 'Needs Intervention') : '')}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${sec(8, "Teacher's review notes")}
      ${['Overall progress', 'Strengths observed', 'Areas to work on', 'Message to parents'].map(t => `<div style="margin:8px 0;"><b style="font-size:13px;">${t}</b><div style="height:44px; border-bottom:1px dashed #B8C2BC;"></div></div>`).join('')}
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:20px; margin-top:28px; text-align:center; font-size:12.5px;">${['Class Teacher', 'Principal', 'Parent / Guardian'].map(t => `<div style="border-top:1px solid #8a968f; padding-top:6px;">${t}</div>`).join('')}</div>`;
  }


  // ---- CLASS REPORT AS EXCEL (the Student-Wise Scores layout, simplified) ----
  function loadExcel(){
    if(window.ExcelJS) return Promise.resolve(window.ExcelJS);
    return new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      sc.onload = () => window.ExcelJS ? ok(window.ExcelJS) : no(new Error('The Excel tool did not load')); sc.onerror = () => no(new Error('The Excel tool did not load — check the internet.')); document.head.appendChild(sc); });
  }
  async function classWorkbook(data){
    const ExcelJS = await loadExcel();
    const ks = kids(), profs = {}; ks.forEach(p => { profs[p.id] = profile(data, p.id); });
    const codes = [...new Set(ks.flatMap(p => profs[p.id].comps.map(x => x.code)))].sort(sortCodes);
    const school = schoolName();
    const cls = classLevel() + (/Sr/i.test(classLevel()) ? ' (Balvatika 3)' : ' (Balvatika 2)');
    const wb = new ExcelJS.Workbook(); wb.creator = 'Bhavyata Portal';
    const ws = wb.addWorksheet('Student Scores', { views: [{ state: 'frozen', xSplit: 6, ySplit: 4 }],
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '4:4', margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } } });
    const FILL = { B: 'FFFCE3E1', P: 'FFFFF1CC', A: 'FFDDF2E5' }, FONT = { B: 'FF9B1C1C', P: 'FF7A5300', A: 'FF1E6B46' };
    const fill = (c, argb) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }; };
    const thin = { style: 'thin', color: { argb: 'FFD6DCD7' } }, box = { top: thin, left: thin, bottom: thin, right: thin };
    const C0 = 7, cEnd = C0 + codes.length - 1;                                    // competency columns
    const col = { obs: cEnd + 1, b: cEnd + 2, p: cEnd + 3, a: cEnd + 4, score: cEnd + 5, level: cEnd + 6, pre: cEnd + 7, move: cEnd + 8, nB: cEnd + 9, atB: cEnd + 10 };
    const last = col.atB, L = n => ws.getColumn(n).letter;
    // rows 1–3: title, explanation, legend
    ws.mergeCells(1, 1, 1, last); Object.assign(ws.getCell(1, 1), { value: 'BHAVYATA FOUNDATION  |  AARAMBH  —  STUDENT-WISE COMPETENCY SCORES  (one row per child)  ·  ' + school + '  ·  ' + cls + '  ·  ' + termLabel() });
    ws.getCell(1, 1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }; fill(ws.getCell(1, 1), 'FF1E5E4A'); ws.getRow(1).height = 24;
    ws.mergeCells(2, 1, 2, last); ws.getCell(2, 1).value = 'Each competency cell is the child\u2019s AVERAGE level for that competency over every observation this term (Observation, Workbook, Fine & Gross Motor): B = 1, P = 2, A = 3. Level: 2.50 or more = A · 1.50 or more = P · below 1.50 = B. The OVERALL score is the average of the child\u2019s competencies, each counted once however often it was observed. Each child is compared with their own Pre-Test; children are not ranked.';
    ws.getCell(2, 1).alignment = { wrapText: true, vertical: 'top' }; ws.getRow(2).height = 44; ws.getCell(2, 1).font = { size: 10, color: { argb: 'FF3B4A41' } };
    // legend: B = 1 · P = 2 · A = 3 · target 2 (in the wide columns, so nothing is cut)
    [[2, 'B = Beginner  ·  scores 1', 'B'], [3, 'P = Proficient  ·  scores 2', 'P'], [6, 'A = Advanced  ·  scores 3', 'A']].forEach(([n, t, k]) => { const c = ws.getCell(3, n); c.value = t; fill(c, FILL[k]); c.font = { bold: true, color: { argb: FONT[k] } }; c.border = box; });
    ws.mergeCells(3, 4, 3, 5); Object.assign(ws.getCell(3, 4), { value: 'Target  ·  2 (P)' }); ws.getCell(3, 4).font = { bold: true }; fill(ws.getCell(3, 4), 'FFFFF7D6'); ws.getCell(3, 4).border = box;
    // row 4: headings
    const heads = ['S.No.', 'School', 'Section / Class', 'Register No.', 'Student ID', 'Student Name', ...codes, 'Total Obs', 'B', 'P', 'A', 'OVERALL SCORE (competency-weighted)', 'TERM LEVEL', 'PRE-TEST LEVEL', 'MOVEMENT', 'No. of Competencies at B', 'Competencies at B (priority)'];
    heads.forEach((t, i) => { const c = ws.getCell(4, i + 1); c.value = t; c.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }; fill(c, 'FF2E7D62'); c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.border = box; });
    codes.forEach((cd, j) => { const t = (info(cd).text || ''); if(t) ws.getCell(4, C0 + j).note = cd + ' — ' + t; });
    ws.getRow(4).height = 46;
    // one row per child
    const r0 = 5;
    ks.forEach((p, i) => {
      const r = r0 + i, pr = profs[p.id], by = {}; pr.comps.forEach(x => { by[x.code] = x; });
      const tot = pr.comps.reduce((s, x) => ({ b: s.b + x.counts.b, p: s.p + x.counts.p, a: s.a + x.counts.a }), { b: 0, p: 0, a: 0 });
      [i + 1, school, cls, p.register_no || '', p.student_id || p.min_no || '', p.name].forEach((v, k) => { ws.getCell(r, k + 1).value = v; });
      codes.forEach((cd, j) => { const x = by[cd], c = ws.getCell(r, C0 + j);
        if(x && x.mt != null){ c.value = Math.round(x.mt * 100) / 100; c.numFmt = '0.00'; fill(c, FILL[x.term]); c.font = { color: { argb: FONT[x.term] } }; }
        else fill(c, 'FFF1F3F1');                                                   // grey = not assessed this term
        c.alignment = { horizontal: 'center' }; });
      const rng = L(C0) + r + ':' + L(cEnd) + r, sc = pr.overall.mt;
      ws.getCell(r, col.obs).value = tot.b + tot.p + tot.a; ws.getCell(r, col.b).value = tot.b; ws.getCell(r, col.p).value = tot.p; ws.getCell(r, col.a).value = tot.a;
      ws.getCell(r, col.score).value = codes.length ? { formula: 'IF(COUNT(' + rng + ')=0,"",ROUND(AVERAGE(' + rng + '),2))', result: sc == null ? '' : Math.round(sc * 100) / 100 } : '';
      ws.getCell(r, col.score).numFmt = '0.00';
      const sL = L(col.score) + r;
      ws.getCell(r, col.level).value = { formula: 'IF(' + sL + '="","",IF(' + sL + '>=2.5,"A",IF(' + sL + '>=1.5,"P","B")))', result: levelOf(sc) || '' };
      const lv = levelOf(sc); if(lv){ fill(ws.getCell(r, col.level), FILL[lv]); ws.getCell(r, col.level).font = { bold: true, color: { argb: FONT[lv] } }; }
      const pl = levelOf(pr.overall.mp); ws.getCell(r, col.pre).value = pl || '—';
      ws.getCell(r, col.move).value = move(pl, lv) === '↑' ? '↑ improved' : move(pl, lv) === '↓' ? '↓ slipped' : move(pl, lv) === '→' ? '→ same' : '';
      ws.getCell(r, col.nB).value = { formula: 'COUNTIF(' + rng + ',"<1.5")', result: pr.comps.filter(x => x.term === 'B').length };
      ws.getCell(r, col.atB).value = pr.comps.filter(x => x.term === 'B').map(x => x.code).join(', ');
      for(let k = 1; k <= last; k++){ const c = ws.getCell(r, k); c.border = box; if(k > 6 && k !== col.atB) c.alignment = Object.assign({ horizontal: 'center' }, c.alignment || {}); }
    });
    const rEnd = r0 + ks.length - 1;
    // class average and children at B / P / A per competency
    let r = rEnd + 2;
    const label = (row, t, argb) => { ws.mergeCells(row, 2, row, 6); const c = ws.getCell(row, 2); c.value = t; c.font = { bold: true, color: { argb: argb || 'FF1D2B22' } }; };
    label(r, 'CLASS AVERAGE — ' + cls);
    codes.concat(['__score']).forEach((cd, j) => { const n = cd === '__score' ? col.score : C0 + j, rg = L(n) + r0 + ':' + L(n) + rEnd; const c = ws.getCell(r, n);
      c.value = { formula: 'IF(COUNT(' + rg + ')=0,"",ROUND(AVERAGE(' + rg + '),2))' }; c.numFmt = '0.00'; c.font = { bold: true }; c.alignment = { horizontal: 'center' }; fill(c, 'FFEEF1EE'); });
    [['B', '"<1.5"', null], ['P', '">=1.5"', '"<2.5"'], ['A', '">=2.5"', null]].forEach(([k, c1, c2], q) => { const row = r + 1 + q; label(row, 'Children at ' + k, FONT[k]);
      codes.forEach((cd, j) => { const n = C0 + j, rg = L(n) + r0 + ':' + L(n) + rEnd, c = ws.getCell(row, n);
        c.value = { formula: c2 ? 'COUNTIFS(' + rg + ',' + c1 + ',' + rg + ',' + c2 + ')' : 'COUNTIF(' + rg + ',' + c1 + ')' }; c.alignment = { horizontal: 'center' }; fill(c, FILL[k]); c.font = { bold: true, color: { argb: FONT[k] } }; }); });
    // level distribution (overall)
    r = r + 6;
    ws.mergeCells(r, 2, r, 6); ws.getCell(r, 2).value = 'LEVEL DISTRIBUTION — how many children are at each level overall'; ws.getCell(r, 2).font = { bold: true };
    ['Level', 'Overall score', 'Children', '% of children'].forEach((t, k) => { const c = ws.getCell(r + 1, 2 + k); c.value = t; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; fill(c, 'FF2E7D62'); c.border = box; });
    const sr = L(col.score) + r0 + ':' + L(col.score) + rEnd;
    [['A — Advanced', '2.50 – 3.00', 'COUNTIF(' + sr + ',">=2.5")', 'A'], ['P — Proficient', '1.50 – 2.49', 'COUNTIFS(' + sr + ',">=1.5",' + sr + ',"<2.5")', 'P'], ['B — Beginner', '1.00 – 1.49', 'COUNTIF(' + sr + ',"<1.5")', 'B']].forEach(([t, rngT, f, k], q) => {
      const row = r + 2 + q; ws.getCell(row, 2).value = t; ws.getCell(row, 3).value = rngT; ws.getCell(row, 4).value = { formula: f };
      ws.getCell(row, 5).value = { formula: 'IF(COUNT(' + sr + ')=0,"",' + L(4) + row + '/COUNT(' + sr + '))' }; ws.getCell(row, 5).numFmt = '0%';
      [2, 3, 4, 5].forEach(n => { const c = ws.getCell(row, n); fill(c, FILL[k]); c.font = { bold: n === 2, color: { argb: FONT[k] } }; c.border = box; }); });
    // how to read
    r = r + 6;
    ['HOW TO READ:',
     '   • A competency cell of 1.00 means every observation was Beginner, 2.00 every observation Proficient, 3.00 every observation Advanced; 1.50 is an equal split of B and P. Grey = not assessed this term.',
     '   • The OVERALL score counts each competency once, so a competency observed five times does not outweigh one observed once.',
     '   • PRE-TEST LEVEL is the child\u2019s level on joining (baseline); MOVEMENT compares it with this term. Children are not ranked.',
     '   • Hover a competency code in the heading row to see what the competency is; the Competencies tab lists them all.'].forEach((t, q) => { ws.mergeCells(r + q, 2, r + q, last); const c = ws.getCell(r + q, 2); c.value = t; c.font = q ? { size: 10 } : { bold: true }; });
    // widths
    [6, 24, 24, 11, 15, 26].forEach((w, k) => { ws.getColumn(k + 1).width = w; });
    codes.forEach((cd, j) => { ws.getColumn(C0 + j).width = 8; });
    [9, 6, 6, 6, 14, 10, 11, 12, 13, 34].forEach((w, k) => { ws.getColumn(col.obs + k).width = w; });
    // Competencies tab
    const wc = wb.addWorksheet('Competencies');
    ['Code', 'Competency', 'CG', 'Domain', 'HPC parameter'].forEach((t, k) => { const c = wc.getCell(1, k + 1); c.value = t; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; fill(c, 'FF2E7D62'); });
    codes.forEach((cd, j) => { const i = info(cd); [cd, i.text || '', (i.cg || '') + (i.cgName ? ' ' + i.cgName : ''), i.domain && HPC.domains[i.domain] ? HPC.domains[i.domain].name : '', i.param && HPC.params[i.param] ? i.param + ' ' + HPC.params[i.param].name : ''].forEach((v, k) => { wc.getCell(j + 2, k + 1).value = v; }); });
    [10, 70, 34, 32, 36].forEach((w, k) => { wc.getColumn(k + 1).width = w; });
    return wb;
  }
  window.aarDownloadExcel = async function(btn){
    const old = btn ? btn.textContent : '';
    try {
      if(btn){ btn.disabled = true; btn.textContent = '⏳ Making the Excel…'; }
      const data = gather(); if(!data) throw new Error('The marks are still loading — try again in a moment.');
      const wb = await classWorkbook(data);
      const buf = await wb.xlsx.writeBuffer();
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = 'Aarambh_Student_Wise_Scores_' + classLevel().replace(/\s+/g, '_') + '_' + (term() === 2 ? 'Term2' : 'Term1') + '.xlsx';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch(e){ alert(e.message || String(e)); }
    finally { if(btn){ btn.disabled = false; btn.textContent = old; } }
  };
  window.__aarClassWorkbook = classWorkbook; window.__aarGather = gather;   // for tests

  // ---- ⬇ HPC REPORT (Excel): the team's own workbook (HPC_BPA_Domain_Analysis), filled with this class ----
  // Only the input cells are written (Setup · Students · Competencies 65+ · PreTest · Term1 · Student_Report C6),
  // straight into the file, so its designs, formulas, colour rules and charts stay exactly as they are; Excel
  // recalculates on opening, and School_Report / Student_Report / Dashboard show this class.
  const HPC_TEMPLATE = 'assets/HPC_report_template.xlsx';
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  function loadZip(){
    if(window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      sc.onload = () => window.JSZip ? ok(window.JSZip) : no(new Error('The zip tool did not load')); sc.onerror = () => no(new Error('The zip tool did not load — check the internet.')); document.head.appendChild(sc); });
  }
  const colL = n => { let s = ''; while(n > 0){ const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const colN = l => l.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  const excelDate = d => { const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000 : null; };
  // one sheet, as a small editor over its XML
  function sheetEditor(xml){
    const doc = new DOMParser().parseFromString(xml, 'application/xml'), data = doc.getElementsByTagNameNS(NS, 'sheetData')[0];
    const rows = {}; [...data.getElementsByTagNameNS(NS, 'row')].forEach(r => { rows[+r.getAttribute('r')] = r; });
    function rowEl(n){
      if(rows[n]) return rows[n];
      const r = doc.createElementNS(NS, 'row'); r.setAttribute('r', n);
      const after = Object.keys(rows).map(Number).filter(x => x > n).sort((a, b) => a - b)[0];
      after ? data.insertBefore(r, rows[after]) : data.appendChild(r); rows[n] = r; return r;
    }
    function cellEl(ref){
      const n = +ref.replace(/[A-Z]+/, ''), row = rowEl(n);
      let c = [...row.getElementsByTagNameNS(NS, 'c')].find(x => x.getAttribute('r') === ref);
      if(c) return c;
      c = doc.createElementNS(NS, 'c'); c.setAttribute('r', ref);
      const col = colN(ref.replace(/\d+/, '')), next = [...row.getElementsByTagNameNS(NS, 'c')].find(x => colN(x.getAttribute('r').replace(/\d+/, '')) > col);
      next ? row.insertBefore(c, next) : row.appendChild(c); return c;
    }
    return {
      set(ref, v){                           // a number, a text, or '' (empty: the cell keeps its style)
        const c = cellEl(ref); while(c.firstChild) c.removeChild(c.firstChild); c.removeAttribute('t');
        if(v === '' || v == null) return;
        if(typeof v === 'number'){ const e = doc.createElementNS(NS, 'v'); e.textContent = String(v); c.appendChild(e); return; }
        c.setAttribute('t', 'inlineStr'); const is = doc.createElementNS(NS, 'is'), t = doc.createElementNS(NS, 't'); t.textContent = String(v); is.appendChild(t); c.appendChild(is);
      },
      xml(){ return new XMLSerializer().serializeToString(doc); }
    };
  }
  // formulas keep their result from the sample data: drop those, so every program works them out afresh
  const dropCached = xml => xml.replace(/(<c\b[^>]*>)(<f\b[^>]*\/>|<f\b[^>]*>[\s\S]*?<\/f>)<v>[\s\S]*?<\/v>/g, '$1$2');
  async function hpcWorkbook(data, only){
    const JSZip = await loadZip();
    const res = await fetch(HPC_TEMPLATE, { cache: 'no-store' });
    if(!res.ok) throw new Error('The HPC report template is not on the server (' + HPC_TEMPLATE + ').');
    const zip = await JSZip.loadAsync(await res.arrayBuffer());
    const wbXml = await zip.file('xl/workbook.xml').async('string'), rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    const path = name => { const m = wbXml.match(new RegExp('<sheet[^>]*name="' + name + '"[^>]*r:id="(rId\\d+)"')); if(!m) throw new Error('The template has no sheet "' + name + '".');
      const t = (rels.match(new RegExp('<Relationship[^>]*Id="' + m[1] + '"[^>]*Target="([^"]+)"')) || rels.match(new RegExp('<Relationship[^>]*Target="([^"]+)"[^>]*Id="' + m[1] + '"')))[1]; return 'xl/' + t.replace(/^\/?xl\//, ''); };
    // the template's competency list (Competencies!B5:B84), to know which column is which
    const ss = zip.file('xl/sharedStrings.xml') ? await zip.file('xl/sharedStrings.xml').async('string') : '';
    const shared = [...ss.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join(''));
    const compXml = await zip.file(path('Competencies')).async('string');
    const ids = [];
    for(let r = 5; r <= 84; r++){
      const m = compXml.match(new RegExp('<c r="B' + r + '"([^>]*)>([\\s\\S]*?)</c>'));
      let v = '';
      if(m){ const vv = (m[2].match(/<v>([\s\S]*?)<\/v>/) || [])[1]; v = /t="s"/.test(m[1]) ? (shared[+vv] || '') : /inlineStr/.test(m[1]) ? ((m[2].match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || '') : (vv || ''); }
      ids.push(String(v).trim());
    }
    // the class: assessed children and their levels
    const ks = kids(), profs = {}; ks.forEach(p => { profs[p.id] = profile(data, p.id); });
    const used = new Set(ks.flatMap(p => profs[p.id].comps.map(x => x.code)));
    const comp = sheetEditor(compXml);
    used.forEach(code => {                    // a competency the plan uses that the template does not list: add it (rows 65–84)
      if(ids.includes(code)) return; const k = ids.indexOf(''); if(k < 0) return;
      const i = info(code); ids[k] = code; const r = 5 + k;
      comp.set('B' + r, code); comp.set('C' + r, i.cg || ''); comp.set('D' + r, i.param || ''); comp.set('G' + r, i.text || '');
    });
    zip.file(path('Competencies'), dropCached(comp.xml()));
    // Setup
    const setup = sheetEditor(await zip.file(path('Setup')).async('string'));
    const now = new Date(), y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    setup.set('C3', schoolName()); setup.set('C4', /Sr/i.test(classLevel()) ? 'SR KG' : 'JR KG');
    setup.set('C5', y + '-' + String(y + 1).slice(2)); setup.set('C8', 'REAL');
    zip.file(path('Setup'), dropCached(setup.xml()));
    // Students (rows 5–64)
    const st = sheetEditor(await zip.file(path('Students')).async('string'));
    const roll = (p, i) => (/^\d+$/.test(String(p.register_no || '')) ? +p.register_no : i + 1);
    for(let i = 0; i < 60; i++){
      const p = ks[i], r = 5 + i;
      st.set('A' + r, p ? i + 1 : ''); st.set('B' + r, p ? roll(p, i) : ''); st.set('C' + r, p ? p.name : '');
      st.set('D' + r, p ? (/^f/i.test(p.gender || '') ? 'F' : /^m/i.test(p.gender || '') ? 'M' : '') : ''); st.set('E' + r, p ? (excelDate(p.admitted_date) || '') : '');
    }
    zip.file(path('Students'), dropCached(st.xml()));
    // PreTest and Term1 (rows 11–70, columns C–CD): each child's level per competency
    for(const [sheet, key] of [['PreTest', 'pre'], ['Term1', 'term']]){
      const ed = sheetEditor(await zip.file(path(sheet)).async('string'));
      for(let i = 0; i < 60; i++){
        const p = ks[i], byCode = {}; if(p) profs[p.id].comps.forEach(x => { byCode[x.code] = x[key]; });
        for(let k = 0; k < 80; k++) ed.set(colL(3 + k) + (11 + i), p && ids[k] && byCode[ids[k]] ? byCode[ids[k]] : '');
      }
      zip.file(path(sheet), dropCached(ed.xml()));
    }
    // Student_Report: the first child (change Roll No. in C6 to see another)
    const sr = sheetEditor(await zip.file(path('Student_Report')).async('string'));
    if(ks[0]) sr.set('C6', roll(ks[0], 0));
    zip.file(path('Student_Report'), dropCached(sr.xml()));
    // every other sheet: drop the sample results too; and recalculate on opening
    for(const f of Object.keys(zip.files).filter(f => /^xl\/worksheets\/sheet\d+\.xml$/.test(f))){
      if([path('Competencies'), path('Setup'), path('Students'), path('PreTest'), path('Term1'), path('Student_Report')].includes(f)) continue;
      zip.file(f, dropCached((await zip.file(f).async('string')).replace(/ tabSelected="1"/g, '')));
    }
    // the download shows ONLY the sheet asked for (the others stay in the file, hidden, because the formulas use them)
    const names = [...wbXml.matchAll(/<sheet\b[^>]*\/>/g)].map(m => (m[0].match(/name="([^"]*)"/) || [])[1]);
    const idx = Math.max(0, names.indexOf(only));
    let wbOut = wbXml.replace(/<sheet\b[^>]*\/>/g, t => {
      const nm = (t.match(/name="([^"]*)"/) || [])[1];
      const bare = t.replace(/\sstate="[^"]*"/, '');
      return nm === only ? bare : bare.replace(/\/>$/, ' state="hidden"/>');
    });
    wbOut = wbOut.replace(/<workbookView\b([^>]*?)(\/?)>/, (m, attrs, end) => '<workbookView' + attrs.replace(/\sactiveTab="[^"]*"/, '').replace(/\sfirstSheet="[^"]*"/, '') + ' activeTab="' + idx + '"' + end + '>');
    const onlyPath = path(only);
    const sx = await zip.file(onlyPath).async('string');
    zip.file(onlyPath, sx.replace(/<sheetView\b/, '<sheetView tabSelected="1"'));
    zip.file('xl/workbook.xml', /<calcPr\b/.test(wbOut) ? wbOut.replace(/<calcPr\b[^>]*\/>/, '<calcPr calcId="191029" fullCalcOnLoad="1"/>') : wbOut.replace('</workbook>', '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>'));
    return { zip, children: ks.length, comps: ids.filter(Boolean).length };
  }
  window.aarDownloadHPC = async function(btn, only){
    const old = btn ? btn.textContent : '';
    try {
      if(btn){ btn.disabled = true; btn.textContent = '⏳ Making the HPC report…'; }
      const data = gather(); if(!data) throw new Error('The marks are still loading — try again in a moment.');
      const r = await hpcWorkbook(data, only);
      const blob = await r.zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = (only === 'School_Report' ? 'School_Report_' : 'Student_Report_') + (schoolName() || 'class').replace(/[^A-Za-z0-9]+/g, '_') + '_' + classLevel().replace(/\s+/g, '') + '_' + (term() === 2 ? 'Term2' : 'Term1') + '.xlsx';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    } catch(e){ alert(e.message || String(e)); }
    finally { if(btn){ btn.disabled = false; btn.textContent = old; } }
  };
  window.__aarHPC = hpcWorkbook;   // for tests

  window.aarSetView = v => { R.view = v; redraw(); };
  window.aarOpenChild = id => { R.child = id; if(R.view !== 'student' && R.view !== 'hpcstudent') R.view = 'hpcstudent'; redraw(); };

  // ---- the tab ----
  const base = renderAssessmentDashboard;
  const paintAssessmentDashboard = function(){
    const out = base.apply(this, arguments);
    try {
      const body = document.getElementById('assessmentdashboard-body') || document.querySelector('[id$="dashboard-body"]:not(.hidden)');
      if(!body) return out;
      const bar = [...body.querySelectorAll('div')].find(d => [...d.querySelectorAll('button')].some(b => /Child Record/.test(b.textContent)));
      if(bar && !bar.querySelector('[data-aar-tab]')){
        const active = assessmentDashboardTab === 'reports';
        // copy a tab that is NOT selected; when Reports is open, none of the others is selected
        const plain = [...bar.querySelectorAll('button')].find(x => !/var\(--primary\)/.test(x.getAttribute('style') || '') || active) || bar.querySelector('button');
        const b = document.createElement('button'); b.setAttribute('data-aar-tab', ''); b.textContent = '📄 Reports';
        b.style.cssText = plain ? plain.style.cssText : '';
        if(active){ b.style.background = 'var(--primary)'; b.style.color = '#fff'; b.style.borderColor = 'transparent'; }
        b.onclick = () => switchAssessmentDashboardTab('reports');
        bar.appendChild(b);
      }
      if(assessmentDashboardTab !== 'reports') return out;
      const wrap = document.createElement('div'); wrap.className = 'card'; wrap.setAttribute('data-aar-reports', ''); wrap.style.cssText = 'padding:18px 20px;';
      const pick = (k, t) => `<button type="button" onclick="aarSetView('${k}')" style="padding:7px 15px; border-radius:999px; font:inherit; font-size:13.5px; font-weight:700; cursor:pointer; border:1px solid ${R.view === k ? 'var(--primary, #1E8F5E)' : 'var(--border, #D6DCD7)'}; background:${R.view === k ? 'var(--primary, #1E8F5E)' : '#fff'}; color:${R.view === k ? '#fff' : '#1D2B22'};">${t}</button>`;
      wrap.innerHTML = `<div data-result-reports style="margin-bottom:14px; padding:12px 14px; border:1px solid var(--border, #D6DCD7); border-radius:12px; background:#F7FBF8;"><div style="font-weight:800; font-size:14px; color:#1D2B22; margin:0 0 8px;">📑 Result reports</div><div style="display:flex; gap:8px; flex-wrap:wrap;">${pick('hpcstudent', '🧒 Student Report')}${pick('hpcschool', '🏫 School Report')}</div></div><div data-other-reports style="margin-bottom:12px;"><div style="font-weight:800; font-size:14px; color:#1D2B22; margin:0 0 8px;">📚 Other reports</div><div style="display:flex; gap:8px; flex-wrap:wrap;">${pick('class', '📋 Class report')}${pick('cg', '📝 CG report')}${pick('parent', '👪 Parent report')}</div></div><div data-aar-root></div>`;
      body.appendChild(wrap);
      const root = wrap.querySelector('[data-aar-root]');
      const titleEl = document.createElement('h3'); titleEl.style.cssText = 'margin:0 0 6px;'; root.parentNode.insertBefore(titleEl, root);
      if(!window.HPC){ root.innerHTML = '<p class="cap">The reports need js/hpc-master.js — add it to teacher.html.</p>'; return out; }
      const data = gather();
      if(!data){ root.innerHTML = '<p class="cap">Loading the Pre-Test and this term\'s marks…</p>'; return out; }
      if(R.preError) root.insertAdjacentHTML('beforebegin', `<p class="cap" style="color:#9B1C1C;">Pre-Test marks could not be loaded (${h(R.preError)}) — the report shows the Term only.</p>`);
      if(R.view === 'hpcstudent') hpcStudentReport(data, root);
      else if(R.view === 'hpcschool') hpcSchoolReport(data, root);
      else if(R.view === 'parent') parentReport(data, root);
      else if(R.view === 'cg') cgReport(root);
      else if(R.view === 'student') studentReport(data, root);
      else classReport(data, root);
      const pp = kids().find(k => k.id === R.child);
      const title = R.view === 'hpcstudent' ? 'Student Report' + (pp ? ' — ' + pp.name : '')
        : R.view === 'hpcschool' ? 'School Report — ' + classLevel() + ' · ' + termLabel()
        : R.view === 'parent' ? 'Parent report'
        : R.view === 'cg' ? 'CG report — ' + classLevel() + ' · ' + (window.cgReportTerm === 2 ? 'Term 2 (November – March)' : 'Term 1 (June – October)')
        : R.view === 'student' ? 'Student Progress Report' + (pp ? ' — ' + pp.name : '')
        : 'Class report — ' + classLevel() + ' · ' + termLabel();
      titleEl.textContent = title;
      if(typeof reportDownloadBar === 'function' && R.view !== 'cg'){ // the CG report uses Save as PDF (print) instead
        const perChild = R.view === 'hpcstudent' || R.view === 'student';
        const fname = R.view === 'hpcschool' ? 'school-report-' + classLevel().replace(/\s+/g, '-')
          : perChild && pp ? (R.view === 'hpcstudent' ? 'student-report-' : 'progress-report-') + pp.name.replace(/\s+/g, '-')
          : 'class-report-' + classLevel().replace(/\s+/g, '-');
        wrap.appendChild(reportDownloadBar(() => root, title, fname));
        if(R.view === 'parent'){
          const dl = wrap.querySelector('[data-dl-end]');
          if(dl){ dl.querySelectorAll('button').forEach(b => b.remove()); dl.insertBefore(parentDownloadMenu(() => root, title, fname), dl.firstChild); }
        }
        if(R.view === 'hpcstudent' || R.view === 'hpcschool'){ const dl = wrap.querySelector('[data-dl-end]'); if(dl){ const sheet = R.view === 'hpcschool' ? 'School_Report' : 'Student_Report';
          const x = document.createElement('button'); x.type = 'button'; x.textContent = R.view === 'hpcschool' ? '⬇ School report (Excel)' : '⬇ Student report (Excel)';
          x.title = 'Downloads only this report: ' + sheet; x.style.cssText = 'padding:8px 14px; border-radius:8px; border:1px solid #1565C1; background:#E3F2FD; color:#0D47A1; font-size:12.5px; font-weight:700; cursor:pointer;';
          x.onclick = () => aarDownloadHPC(x, sheet); dl.appendChild(x); } }
        if(R.view === 'class'){ const dl = wrap.querySelector('[data-dl-end]'); if(dl){ const x = document.createElement('button'); x.type = 'button'; x.textContent = '⬇ Download Excel (Student-Wise Scores)';
          x.style.cssText = 'padding:8px 14px; border-radius:8px; border:1px solid var(--primary); background:#fff; color:var(--primary-dark, #17765B); font-size:12.5px; font-weight:700; cursor:pointer;'; x.onclick = () => aarDownloadExcel(x); dl.insertBefore(x, dl.children[1] || null); } }
      }
    } catch(e){ console.error('assessment reports', e); }
    return out;
  };
  // ---- CG report: the six domains of development, each CG under its domain, with the domain's HPC weightage ----
  const CG_TITLES = { 1: 'Healthy & Safe Habits', 2: 'Sensorial Perception', 3: 'Fit & Flexible Body', 4: 'Emotional Intelligence', 5: 'Productive Work & Seva', 6: 'Care for Nature', 7: 'Observation & Logical Thinking', 8: 'Mathematical Understanding', 9: 'Communication in Two Languages', 10: 'Reading & Writing (L1)', 11: 'Beginning Reading & Writing (L2)', 12: 'Visual & Performing Arts', 13: 'Curiosity, Attention & Learning Behaviours' };
  // competencies named in the framework for CG-1 to CG-8 (the rest come from the Workbook competency list)
  var FRAMEWORK_TEXT = {
    'C-1.1': 'Shows a liking for and understanding of nutritious food and does not waste food',
    'C-1.2': 'Practises basic self-care and hygiene',
    'C-1.3': 'Keeps the school/classroom hygienic and organised',
    'C-1.4': 'Practises safe use of material and simple tools',
    'C-1.5': 'Shows awareness of safety in movements (walking, running, cycling) and acts appropriately',
    'C-1.6': 'Understands unsafe situations and asks for help',
    'C-2.1': 'Differentiates between shapes, colours, and their shades',
    'C-2.2': 'Develops visual memory for symbols and representations',
    'C-2.3': 'Differentiates sounds and sound patterns by their pitch, volume, and tempo',
    'C-2.4': 'Differentiates multiple smells and tastes',
    'C-2.5': 'Develops discrimination in the sense of touch',
    'C-2.6': 'Begins integrating sensorial perceptions to get a holistic awareness of their experiences',
    'C-3.1': 'Shows coordination between sensorial perceptions and body movements in various activities',
    'C-3.2': 'Shows balance, coordination, and flexibility in various physical activities',
    'C-3.3': 'Shows precision and control in working with their hands and fingers',
    'C-3.4': 'Shows strength and endurance in carrying, walking, and running',
    'C-4.1': "Starts recognising 'self' as an individual belonging to a family and community",
    'C-4.2': 'Recognises different emotions and makes deliberate efforts to regulate them appropriately',
    'C-4.3': 'Interacts comfortably with other children and adults',
    'C-4.4': 'Shows cooperative behaviour with other children',
    'C-4.5': 'Understands and responds positively to social norms in the classroom and school',
    'C-4.6': 'Shows kindness and helpfulness to others (including animals, plants) when they are in need',
    'C-4.7': 'Understands and responds positively to the different thoughts, preferences, and emotional needs of other children',
    'C-5.1': 'Demonstrates willingness and participation in age-appropriate physical work towards helping others',
    'C-6.1': 'Shows care for and joy in engaging with all life forms',
    'C-7.1': 'Observes and understands different categories of objects and relationships between them',
    'C-7.2': 'Observes and understands cause and effect relationships in nature by forming simple hypotheses and uses observations to explain their hypothesis',
    'C-7.3': 'Uses appropriate tools and technology in daily life situations and for learning',
    'C-8.1': 'Sorts objects into groups and sub-groups based on more than one property',
    'C-8.2': 'Identifies and extends simple patterns in their surroundings, shapes, and numbers',
    'C-8.3': 'Counts up to 99 both forwards and backwards and in groups of 10s and 20s',
    'C-8.4': 'Arranges numbers up to 99 in ascending and descending order',
    'C-8.5': 'Recognises and uses numerals to represent quantities up to 99 with an understanding of the decimal place value system',
    'C-8.6': 'Performs addition and subtraction of 2-digit numbers fluently using flexible strategies of composition and decomposition',
    'C-8.7': 'Recognises multiplication as repeated addition and division as equal sharing',
    'C-8.8': 'Recognises basic geometric shapes and their observable properties',
    'C-8.9': 'Performs simple measurements of length, weight and volume of objects in their immediate environment',
    'C-8.10': 'Performs simple measurements of time in minutes, hours, day, weeks, and months',
    'C-8.11': 'Performs simple transactions using money up to INR 100',
    'C-8.12': 'Develops adequate and appropriate vocabulary for comprehending and expressing concepts and procedures related to quantities, shapes, space, and measurements',
    'C-8.13': 'Formulates and solves simple mathematical problems related to quantities, shapes, space, and measurements',
    'C-9.1': 'Listens to and appreciates simple songs, rhymes, and poems',
    'C-9.2': 'Creates simple songs and poems on their own',
    'C-9.3': 'Converses fluently and can hold a meaningful conversation',
    'C-9.4': 'Understands oral instructions for a complex task and gives clear oral instructions for the same to others',
    'C-9.5': 'Comprehends narrated/read-out stories and identifies characters, storyline and what the author wants to say',
    'C-9.6': 'Narrates short stories with clear plot and characters',
    'C-9.7': 'Knows and uses enough words to carry out day-to-day interactions effectively and can guess meaning of new words by using existing vocabulary',
    'C-10.1': 'Develops phonological awareness and blends phonemes/ syllables into words and segment words into phonemes/ syllables',
    'C-10.2': 'Understands basic structure/format of a book, idea of words in print and direction in which they are printed, and recognises basic punctuation marks',
    'C-10.3': 'Recognises all the letters of the alphabet (forms of akshara) of the script and uses this knowledge to read and write words',
    'C-10.4': 'Reads stories and passages with accuracy and fluency with appropriate pauses and voice modulation',
    'C-10.5': 'Reads short stories and comprehends its meaning – by identifying characters, storyline and what the author wanted to say – on their own',
    'C-10.6': 'Reads short poems and begins to appreciate the poem for its choice of words and imagination',
    'C-10.7': 'Reads and comprehends meaning of short news items, instructions and recipes, and publicity material',
    'C-10.8': 'Write a paragraph to express their understanding and experiences',
    'C-10.9': 'Shows interest in picking up and reading a variety of children’s books',
    'C-11.1': 'Develops phonological awareness and are able to blend phonemes/syllables into words and segment words into phonemes/syllables',
    'C-11.2': 'Recognises most frequently occurring letters of the alphabet (forms of akshara) of the script and uses this knowledge to read and write simple words and sentences',
    'C-12.1': 'Explores and plays with a variety of materials and tools to create two-dimensional and three-dimensional artworks in varying sizes',
    'C-12.2': 'Explores and plays with own voice, body, spaces, and a variety of objects to create music, role-play, dance and movement.',
    'C-12.3': 'Innovates and works imaginatively to express a range of ideas and emotions through the arts',
    'C-12.4': 'Works collaboratively in the arts',
    'C-12.5': 'Communicates and appreciates a variety of responses while creating and experiencing different forms of art, local culture, and heritage',
    'C-13.1': 'Attention and intentional action: Acquires skills to plan, focus attention, and direct activities to achieve specific goals',
    'C-13.2': 'Memory and mental flexibility: Develops adequate working memory, mental flexibility (to sustain or shift attention appropriately), and self-control (to resist impulsive actions or responses) that would assist them in learning in structured environments',
    'C-13.3': 'Observation, wonder, curiosity, and exploration: Observes minute details of objects, wonders, and explores using various senses, tinkers with objects, and asks questions',
    'C-13.4': 'Classroom norms: Adopts and follows norms with agency and understanding'
  };
  var FRAMEWORK_COMPS = Object.keys(FRAMEWORK_TEXT);
  // Fine & Gross Motor: ratings that count as covered (G Achieved, Y Developing), and the competencies each month's activity covers
  var MOTOR_COUNT = ['G', 'Y'];
  var MOTOR_MAP = {
    fine:  { June: ['C-3.3'], July: ['C-1.2', 'C-3.3'], August: ['C-3.3', 'C-8.2'], September: ['C-2.5'], October: ['C-3.3', 'C-8.5'] },
    gross: { June: ['C-3.2', 'C-1.5'], July: ['C-1.2', 'C-1.5'], August: ['C-3.1', 'C-3.2'], September: ['C-6.1'], October: ['C-3.4', 'C-8.3'] }
  };
  var MOTOR_CG = { gross: 3, fine: 12 };
  var CG_BRIEF = { 1: 'Children develop habits that keep them healthy and safe.', 2: 'Children develop sharpness in sensorial perceptions.', 3: 'Children develop a fit and flexible body.', 4: 'Children develop emotional intelligence: understanding and managing their own emotions, and responding positively to social norms.', 5: "Children develop a positive attitude towards productive work and service, or 'Seva'.", 6: 'Children develop a positive regard for the natural environment around them.', 7: 'Children make sense of the world around them through observation and logical thinking.', 8: 'Children develop mathematical understanding and abilities to recognise the world through quantities, shapes, and measures.', 9: 'Children develop effective communication skills for day-to-day interactions in two languages.', 10: 'Children develop fluency in reading and writing in Language 1.', 11: 'Children begin to read and write in Language 2.', 12: 'Children develop abilities and sensibilities in visual and performing arts and express their emotions through art.', 13: 'Children develop habits of learning that allow them to engage actively in formal learning environments.' };
  // Save as PDF: the browser prints the report itself (its own page breaks, colours and check marks)
  window.cgPrintReport = function(){
    const root = window.cgReportRoot; if(!root) return;
    const area = document.createElement('div'); area.id = 'cg-print-area';
    area.innerHTML = root.innerHTML;
    // the download keeps only the competency tables (with their CG and domain headings)
    area.querySelectorAll('details').forEach(d => { d.open = true; });
    [...area.querySelectorAll('div')].forEach(d => { const f = d.firstElementChild; if(f && /^Not completed yet/.test(f.textContent.trim())) d.remove(); });
    [...area.querySelectorAll('p')].forEach(p => { if(/competencies covered this term/.test(p.textContent)) p.remove(); });
    [...area.querySelectorAll('details > div')].forEach(d => { if(!d.querySelector('table')) d.remove(); });
    [...area.querySelectorAll('span')].forEach(sp => { if(sp.textContent.trim() === 'Term' && sp.parentElement) sp.parentElement.remove(); });
    [...area.querySelectorAll('button')].forEach(b => b.remove());
    const style = document.createElement('style'); style.id = 'cg-print-style';
    style.textContent = '#cg-print-area{display:none;} @media print { body > *:not(#cg-print-area){display:none !important;} #cg-print-area{display:block !important; padding:12px; font-family:Helvetica, Arial, sans-serif; color:#1D2B22;} #cg-print-area button, #cg-print-area select{display:none !important;} #cg-print-area summary{list-style:none;} #cg-print-area *{-webkit-print-color-adjust:exact; print-color-adjust:exact;} #cg-print-area table{page-break-inside:auto;} #cg-print-area tr{page-break-inside:avoid; page-break-after:auto;} #cg-print-area thead{display:table-header-group;} }';
    document.head.appendChild(style); document.body.appendChild(area);
    const done = () => { area.remove(); style.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 50);
  };
  function cgReport(root){
    const domains = window.CG_DOMAINS || [];
    if(!domains.length){ root.innerHTML = '<p class="cap">The domain list (js/cg-domains.js) is not loaded yet.</p>'; return; }
    const cid = (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_id) || null;
    window.cgReportRoot = root;
    const termNo = window.cgReportTerm || 1;
    const key = cid + '|' + termNo + '|' + (window.location.search || '');
    if(window.cgCoverage && window.cgCoverage.key === key){ paintCgReport(root, domains, window.cgCoverage); return; }
    root.innerHTML = cgTermToggle(termNo) + '<p class="cap">Loading the competency coverage for this term…</p>';
    if(window.cgCoverageLoading === key) return;
    window.cgCoverageLoading = key;
    const qs = window.location.search ? '&' + window.location.search.slice(1) : '';
    const level = (typeof workbookLevelFromClassName === 'function') ? workbookLevelFromClassName() : '';
    const months = termNo === 2 ? ['November', 'December', 'January', 'February', 'March'] : ['June', 'July', 'August', 'September', 'October'];
    const walk = (o, out) => { if(Array.isArray(o)) o.forEach(x => walk(x, out)); else if(o && typeof o === 'object'){ if('id' in o && 'cg_code' in o) out.push(o); Object.values(o).forEach(v => walk(v, out)); } return out; };
    const cov = {}; const comps = {};
    const addCov = (code, src) => { (cov[code] = cov[code] || []).push(src); };
    FRAMEWORK_COMPS.forEach(c => { comps[c] = { code: c, text: FRAMEWORK_TEXT[c] }; });
    const jobs = [
      // Fine & Gross Motor: the saved competency-wise marks (B / P / A), read straight from the database
      fetch('backend/assessment/motor/get_motor_competency_marks.php?class_id=' + encodeURIComponent(cid) + qs, { cache: 'no-store' }).then(r => r.json()).then(d => {
        ((d && d.rows) || []).forEach(x => { if(x.level_mark === 'A' || x.level_mark === 'P') addCov(x.competency_code, x.skill_type === 'gross' ? 'Gross Motor' : 'Fine Motor'); });
      }).catch(() => {}),
      // Pre-Test: the competency codes each child has marks for (saved per child, per term)
      fetch('backend/assessment/pretest/get_pretest_assessment.php?class_id=' + encodeURIComponent(cid) + '&term=TERM_' + termNo + qs, { cache: 'no-store' }).then(r => r.json()).then(d => {
        Object.values((d && d.sessions) || {}).forEach(ss => Object.keys(ss.byCode || {}).forEach(code => {
          const v = ss.byCode[code]; if(v && (v.b || v.p || v.a)) addCov(String(code).trim().replace(/^CG\s*/i, 'C-'), 'Pre-Test');
        }));
      }).catch(() => {}),
      fetch('backend/assessment/workbook/get_workbook_competencies.php?level=' + encodeURIComponent(level) + qs, { cache: 'no-store' }).then(r => r.json()).then(z => {
        walk(z, []).forEach(c => { const code = String(c.cg_code || '').trim(); if(!code) return; comps[code] = comps[code] || { code, text: '' }; comps[code].text = c.competency_text || comps[code].text; });
      }).catch(() => {}),
      fetch('backend/assessment/viva/get_viva.php?class_id=' + encodeURIComponent(cid) + '&term=TERM_' + termNo + qs, { cache: 'no-store' }).then(r => r.json()).then(d => {
        const marks = d.marks || {};
        const qlist = window.VIVA_QUESTIONS || [];
        Object.keys(marks).forEach(pid => qlist.forEach(q => { if(marks[pid][q.no]) q.cgs.forEach(c => addCov(c, 'Viva')); }));
      }).catch(() => {})
    ];
    months.forEach(mo => {
      jobs.push(fetch('backend/assessment/observation/get_observation_saved_summary.php?level=' + encodeURIComponent(level) + '&month=' + encodeURIComponent(mo) + qs, { cache: 'no-store' }).then(r => r.json()).then(d => {
        (((d && d.rows) || [])).forEach(r => { if(r.cg_code && ((r.E || 0) + (r.P || 0) + (r.A || 0)) > 0) addCov(String(r.cg_code).trim(), 'Classroom Observation'); });
      }).catch(() => {}));
      jobs.push(Promise.all([
        fetch('backend/assessment/workbook/get_workbook_pages.php?level=' + encodeURIComponent(level) + '&month=' + encodeURIComponent(mo) + qs, { cache: 'no-store' }).then(r => r.json()),
        fetch('backend/assessment/workbook/get_workbook_assessment.php?month=' + encodeURIComponent(mo) + qs, { cache: 'no-store' }).then(r => r.json())
      ]).then(([pz, mz]) => {
        const pageInfo = {};
        walk(pz, []).forEach(a => { const code = String(a.cg_code || '').trim(); if(code) pageInfo[String(a.id)] = { code, label: 'Workbook · ' + mo + ' · ' + (a.activity_title || ('Activity ' + (a.activity_no != null ? a.activity_no : a.id))) }; });
        (Array.isArray(mz && mz.marks) ? mz.marks : []).forEach(x => {
          const info = pageInfo[String(x.workbook_page_id)]; if(!info) return;
          const v = String(x.level_mark || '').toUpperCase();
          if(v === 'B' || v === 'P' || v === 'A' || v === 'E') addCov(info.code, 'Workbook');
        });
      }).catch(() => {}));
    });
    Promise.all(jobs).then(() => {
      // one entry per source and activity, not one per child
      Object.keys(cov).forEach(c => { cov[c] = [...new Set(cov[c])]; });
      window.cgCoverage = { key, comps, cov };
      window.cgCoverageLoading = null;
      paintCgReport(root, domains, window.cgCoverage);
    });
  }
  var CG_CATS = ['Pre-Test', 'Classroom Observation', 'Workbook', 'Fine Motor', 'Gross Motor', 'Viva'];
  var CG_LABEL = { 'Pre-Test': 'Pre-Test', 'Classroom Observation': 'Observation', 'Workbook': 'Workbook', 'Fine Motor': 'Fine Motor', 'Gross Motor': 'Gross Motor', 'Viva': 'Viva' };
  function cgTermToggle(n){
    const btn = (k, t) => `<button type="button" onclick="cgSetReportTerm(${k})" style="padding:7px 15px; border-radius:999px; font:inherit; font-size:13.5px; font-weight:700; border:1px solid #C9D6CF; cursor:pointer; background:${n === k ? '#17765B' : '#fff'}; color:${n === k ? '#fff' : '#1D2B22'};">${t}</button>`;
    return `<div style="display:flex; gap:8px; align-items:center; margin:0 0 12px;"><span style="font-weight:700; color:#3c4a43; font-size:13px;">Term</span>${btn(1, 'Term 1 · June – October')}${btn(2, 'Term 2 · November – March')}</div>`;
  }
  window.cgSetReportTerm = function(n){ window.cgReportTerm = n; window.cgCoverage = null; window.cgCoverageLoading = null; if(window.cgReportRoot) cgReport(window.cgReportRoot); };
  function paintCgReport(root, domains, data){
    const { comps, cov } = data;
    const motorChip = n => codesOf(n).some(c => (cov[c] || []).some(k => k === 'Fine Motor' || k === 'Gross Motor')) ? '<span style="margin-left:8px; padding:2px 8px; border-radius:999px; background:#E3F5EA; color:#1E7B4F; font-size:12px; font-weight:700;">✓ Motor</span>' : '';
    const colW = '<colgroup><col style="width:86px"><col><col style="width:110px"><col style="width:110px"><col style="width:110px"><col style="width:110px"><col style="width:110px"><col style="width:110px"></colgroup>';
    const cellB = 'border-left:1px solid #E5EEE9;';
    const headRow = `<tr style="background:#FAFCFB; font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:#5b6b62;"><th style="text-align:left; padding:9px 10px; border-bottom:1px solid #DDE8E2;">Code</th><th style="text-align:left; padding:9px 10px; border-bottom:1px solid #DDE8E2; ${cellB}">Competency</th>${CG_CATS.map(k => `<th style="text-align:center; padding:9px 6px; border-bottom:1px solid #DDE8E2; ${cellB}">${h(CG_LABEL[k] || k)}</th>`).join('')}</tr>`;
    const codesOf = n => Object.keys(comps).filter(c => { const m = /^C-(\d+)\./.exec(c); return m && Number(m[1]) === n; }).sort((a, b) => Number(a.split('.')[1]) - Number(b.split('.')[1]));
    const total = Object.keys(comps).length;
    const covered = Object.keys(comps).filter(c => cov[c] && cov[c].length).length;
    const blocks = domains.map(d => {
      const cgRows = d.cgs.map(n => {
        const codes = codesOf(n);
        const rows = codes.map(c => {
          const srcs = cov[c] || [];
          const cells = CG_CATS.map(k => `<td style="text-align:center; padding:9px 6px; ${cellB} color:#1E7B4F; font-size:16px; font-weight:800;">${srcs.indexOf(k) >= 0 ? '✓' : ''}</td>`).join('');
          return `<tr style="border-top:1px solid #E5EEE9;"><td style="text-align:left; padding:9px 10px; font-weight:700; white-space:nowrap;">${h(c)}</td><td style="text-align:left; padding:9px 10px; font-size:13px; line-height:1.4; white-space:normal; overflow-wrap:anywhere; ${cellB}">${h(comps[c].text || 'Competency text not in the framework list')}</td>${cells}</tr>`;
        }).join('');
        return `<div style="margin:0 0 12px;"><details><summary style="display:flex; justify-content:space-between; padding:8px 10px; background:#FAFCFB; font-weight:800; cursor:pointer; list-style:none;"><span>CG-${n} · ${h(CG_TITLES[n] || '')} <span style="color:#17765B; font-weight:600;">▾</span></span><span style="color:#5b6b62; font-weight:600;">${codes.filter(c => cov[c] && cov[c].length).length} of ${codes.length} covered</span></summary><div style="padding:6px 10px; font-size:12.5px; color:#3c4a43; line-height:1.5;">${h(CG_BRIEF[n] || '')}</div></details>
          <table style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:13.5px;">${colW}<thead>${headRow}</thead><tbody>${rows || '<tr><td style="padding:8px 10px; color:#5b6b62;">No competencies listed</td></tr>'}</tbody></table></div>`;
      }).join('');
      return `<div style="margin-bottom:14px; border:1px solid #DDE8E2; border-radius:12px; overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#F3FAF6;"><b>${h(d.name)}</b><span style="font-weight:800; color:#17765B;">${d.weight}%</span></div>
        <div style="padding:8px 10px;">${cgRows}</div></div>`;
    }).join('');
    // the CGs that are not completed yet, collected in one small box
    const incomplete = [];
    domains.forEach(d => d.cgs.forEach(n => {
      const codes = codesOf(n); if(!codes.length) return;
      const got = codes.filter(c => cov[c] && cov[c].length).length;
      if(got < codes.length) incomplete.push({ n, got, total: codes.length });
    }));
    const cellS = 'padding:9px 10px; border-top:1px solid #F3E3A3; vertical-align:top;';
    const incompleteRows = incomplete.map(t => {
      const missing = codesOf(t.n).filter(c => !(cov[c] && cov[c].length));
      const brief = CG_BRIEF[t.n] || '';
      const list = missing.map(c => `<div style="padding:4px 0;"><b>${h(c)}</b> ${h((comps[c] && comps[c].text) || 'Competency text not in the framework list')}</div>`).join('');
      return `<tr><td style="${cellS} text-align:left;"><details><summary style="cursor:pointer; font-weight:800; list-style:none;">CG-${t.n} <span style="color:#7a5a00; font-weight:600;">▾</span></summary><div style="margin-top:6px; font-weight:400; font-size:12.5px; color:#3c4a43; line-height:1.5;">${h(brief)}</div></details></td><td style="${cellS} text-align:left; font-weight:700; white-space:nowrap;">${t.got} of ${t.total}</td><td style="${cellS} text-align:left; font-size:13px; line-height:1.5;"><details><summary style="cursor:pointer; list-style:none;">${missing.map(h).join(', ') || '—'} <span style="color:#7a5a00; font-weight:600;">▾</span></summary><div style="margin-top:6px;">${list}</div></details></td></tr>`;
    }).join('');
    const incompleteHtml = incomplete.length
      ? `<div style="margin:0 0 14px; border:1px solid #F2C94C; border-radius:12px; overflow:hidden; background:#FFFDF5;">
          <div style="padding:10px 14px; background:#FFF8E1; font-weight:800; color:#5C4300;">Not completed yet · ${incomplete.length} CG${incomplete.length === 1 ? '' : 's'}</div>
          <table style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:13.5px;">
            <colgroup><col style="width:110px"><col style="width:120px"><col></colgroup>
            <thead><tr style="font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:#7a5a00;"><th style="text-align:left; padding:8px 10px;">CG</th><th style="text-align:left; padding:8px 10px;">Covered</th><th style="text-align:left; padding:8px 10px;">Competencies still missing</th></tr></thead>
            <tbody>${incompleteRows}</tbody></table></div>`
      : `<div style="margin:0 0 14px; padding:12px 16px; border:1px solid #9FD3BB; background:#F3FAF6; border-radius:12px; color:#1E7B4F; font-weight:800;">All CGs are completed</div>`;
    const notesHtml = `<div style="margin:0 0 14px; padding:12px 16px; border:1px solid #DDE8E2; border-radius:12px; background:#FAFCFB; font-size:12.5px; color:#3c4a43; line-height:1.7;">
        <div style="font-weight:800; color:#1D2B22; margin-bottom:4px;">Notes</div>
        <div>• A competency is <b>covered</b> when any included assessment has a saved mark for it.</div>
        <div>• <b>Included:</b> Pre-Test, Classroom Observation, Workbook and Viva.</div>
        <div>• <b>Not yet included:</b> Fine &amp; Gross Motor. Its saved data is not linked to competency codes yet.</div>
        <div>• The report shows the term selected above (Term 1 or Term 2).</div></div>`;
    root.innerHTML = `<div style="padding:4px 2px 10px;"><div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin:0 0 10px;">${cgTermToggle(window.cgReportTerm || 1)}</div>${incompleteHtml}
      <p style="margin:0 0 6px; color:#3c4a43; font-size:13px;"><b>${covered} of ${total}</b> competencies covered this term · <b>${total - covered}</b> not covered.</p>
      
      ${blocks}<div style="margin-top:16px; padding-top:14px; border-top:1px solid #DDE8E2; display:flex; justify-content:flex-end;"><button type="button" onclick="cgPrintReport()" style="height:40px; padding:0 18px; border-radius:10px; border:1px solid #17765B; background:#17765B; color:#fff; font:inherit; font-size:14px; font-weight:700; cursor:pointer;">⬇ Download CG report (PDF)</button></div></div>`;
  }
  // Several loaders finish one after another and each asks for a repaint, which made the whole screen flicker.
  // Repaints requested within a moment of each other now become one repaint.
  let aarRepaintQueued = false;
  renderAssessmentDashboard = function(){
    if(aarRepaintQueued) return;
    aarRepaintQueued = true;
    setTimeout(() => { aarRepaintQueued = false; paintAssessmentDashboard(); }, 60);
  };
})();