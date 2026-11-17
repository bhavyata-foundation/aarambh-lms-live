/* =========================================================================
   js/records-pretest.js — Assessment records, redrawn (Pre-Test: CG-wise)
   -------------------------------------------------------------------------
   Loads AFTER the part files (teacher.html). It replaces, by name:

     renderAssessmentRecords(container)   the screen's top: title, Term 1 / 2,
                                          "The term, in order" step cards
                                          (Pre-Test · Classroom Observation ·
                                          Workbook · Fine & Gross Motor ·
                                          Term total). The other four records
                                          views underneath are unchanged.
     renderPreTestRecords(container)      the Pre-Test, CG by CG:
                                          4 summary tiles · "Where the class
                                          needs support" · Every CG table
                                          (B · P · A · marks · mix · level).

   There is NO child-by-child table here, by design.
   Everything is worked out from the saved Pre-Test marks of the chosen term
   (the same class tally the Pre-Test entry screen writes). Absent = no mark,
   and is never counted as B, P or A.

   Numbers:  Completed = marks given ÷ (children × activities)
             SRI       = (P + A) ÷ marks given
             Class DSI = (P × 100 + A × 200) ÷ marks given   (B = 0 · P = 100 · A = 200)
             Level     = average of B 1 / P 2 / A 3 (same rule as everywhere: cgLevel)
   ========================================================================= */
(function(){
  'use strict';
  if(typeof renderAssessmentRecords !== 'function') return;

  // ---- the 13 CGs and the five development areas they sit under ----
  const RP_AREAS = [
    { name: 'Physical Development', cgs: [[1, 'Healthy & Safe Habits'], [2, 'Sensorial Development'], [3, 'Physical Fitness & Fine Motor Skills']] },
    { name: 'Socio-Emotional & Ethical Development', cgs: [[4, 'Emotional Intelligence'], [5, 'Productive Work & Seva'], [6, 'Care for Nature']] },
    { name: 'Cognitive & Language Development', cgs: [[7, 'Observations & Logical Thinking'], [8, 'Mathematical Understanding'], [9, 'Communication in Two Languages'], [10, 'Reading & Writing (L1)'], [11, 'Beginning Reading & Writing (L2)']] },
    { name: 'Creative & Aesthetic Development', cgs: [[12, 'Visual & Performing Arts']] },
    { name: 'Positive Learning Habits', cgs: [[13, 'Curiosity, Attention, Adaptability & Positive Learning Behaviours']] }
  ];
  const NEEDS_SUPPORT_AT = 0.30; // a CG is listed when 30% or more of its marks are Beginner
  const GREEN = '#1b7a5a';

  const gs = (k, prop, fb) => (typeof GRADE_SCALE !== 'undefined' && GRADE_SCALE[k] && GRADE_SCALE[k][prop]) || fb;
  const COL = { B: gs('B', 'bg', '#D64545'), P: gs('P', 'bg', '#E9B824'), A: gs('A', 'bg', '#2E9E5B') };
  const TINT = { B: gs('B', 'tint', '#FDE4E2'), P: gs('P', 'tint', '#FFF4CC'), A: gs('A', 'tint', '#DDF3E5') };
  const INK = { B: gs('B', 'ink', '#B3261E'), P: gs('P', 'ink', '#8A6400'), A: gs('A', 'ink', '#1E7A45') };
  const NAME = { B: 'Beginner', P: 'Proficient', A: 'Advanced' };
  const E = s => (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function injectCss(){
    if(document.getElementById('rp-style')) return;
    const st = document.createElement('style'); st.id = 'rp-style';
    st.textContent = `
.rp-head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start;margin:4px 0 18px}
.rp-eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--ink-3,#797d75)}
.rp-title{font-family:var(--disp,inherit);font-size:30px;font-weight:800;letter-spacing:-.02em;margin:4px 0 6px;color:var(--ink-1,#1c2a24)}
.rp-sub{color:var(--ink-2,#4f534d);font-size:14px;margin:0;max-width:64ch}
.rp-pdf{font:inherit;font-size:13.5px;font-weight:600;padding:10px 16px;border-radius:10px;border:1px solid var(--line,#d9dcd5);background:var(--surface-1,#fff);color:var(--ink-1,#1c2a24);cursor:pointer;white-space:nowrap}
.rp-pdf:disabled{opacity:.5;cursor:not-allowed}
.rp-termrow{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 18px}
.rp-termrow b{font-size:13px;margin-right:2px}
.rp-pill{font:inherit;font-size:14px;border:1px solid var(--line,#d9dcd5);background:var(--surface-1,#fff);color:var(--ink-1,#1c2a24);border-radius:999px;padding:9px 18px;cursor:pointer}
.rp-pill.on{background:${GREEN};border-color:${GREEN};color:#fff;font-weight:700}
.rp-label{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--ink-3,#797d75);margin:4px 0 10px}
.rp-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:18px}
.rp-step{text-align:left;font:inherit;color:var(--ink-1,#1c2a24);background:var(--surface-1,#fff);border:1px solid var(--line,#d9dcd5);border-radius:12px;padding:16px;cursor:pointer}
.rp-step.on{background:${GREEN};border-color:${GREEN};color:#fff}
.rp-step .t{display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px}
.rp-step .n{width:24px;height:24px;border-radius:50%;display:inline-grid;place-items:center;font-size:12px;background:#e1f3ea;color:${GREEN};flex:none}
.rp-step.on .n{background:rgba(255,255,255,.22);color:#fff}
.rp-step .l1{font-size:12.5px;margin-top:8px;opacity:.92}
.rp-step .l2{font-size:11.5px;margin-top:2px;opacity:.7}
.rp-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:16px}
.rp-kpi{background:var(--surface-1,#fff);border:1px solid var(--line,#d9dcd5);border-radius:12px;padding:18px 20px}
.rp-kpi .k{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--ink-3,#797d75)}
.rp-kpi .v{font-family:var(--disp,inherit);font-size:34px;font-weight:800;letter-spacing:-.03em;line-height:1.1;margin:8px 0 4px;color:var(--ink-1,#1c2a24)}
.rp-kpi .v small{font-size:14px;font-weight:600;color:var(--ink-2,#4f534d);letter-spacing:0;margin-left:6px}
.rp-kpi .f{font-size:12.5px;color:var(--ink-2,#4f534d)}
.rp-card{background:var(--surface-1,#fff);border:1px solid var(--line,#d9dcd5);border-radius:12px;margin-bottom:16px;overflow:hidden}
.rp-support{padding:16px 20px;display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center}
.rp-support b{font-size:15px}
.rp-sup-item{display:inline-flex;align-items:center;gap:10px;font-size:14px;color:var(--ink-1,#1c2a24)}
.rp-cgchip{background:${TINT.B};color:${INK.B};font-weight:800;font-size:12px;padding:4px 11px;border-radius:999px;white-space:nowrap}
.rp-cardhead{padding:20px 20px 14px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end}
.rp-cardhead h3{margin:0 0 4px;font-family:var(--disp,inherit);font-size:19px;font-weight:800;color:var(--ink-1,#1c2a24)}
.rp-cardhead p{margin:0;font-size:13.5px;color:var(--ink-2,#4f534d)}
.rp-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--ink-1,#1c2a24)}
.rp-legend span{display:inline-flex;align-items:center;gap:6px}
.rp-legend i{width:11px;height:11px;border-radius:3px;display:inline-block}
.rp-scroll{overflow-x:auto}
.rp-table{width:100%;min-width:900px;border-collapse:collapse}
.rp-table th{background:var(--surface-0,#f3f4f1);font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3,#797d75);font-weight:700;padding:12px 10px;text-align:left;border-top:1px solid var(--line,#d9dcd5);border-bottom:1px solid var(--line,#d9dcd5)}
.rp-table th.c,.rp-table td.c{text-align:center}
.rp-table td{padding:14px 10px;border-bottom:1px solid var(--line-soft,#e7e9e4);vertical-align:middle;font-size:14px;color:var(--ink-1,#1c2a24)}
.rp-table th:first-child,.rp-table td:first-child{padding-left:20px}
.rp-table th:last-child,.rp-table td:last-child{padding-right:20px}
.rp-table tr.area td{background:var(--surface-0,#f3f4f1);color:${GREEN};font-weight:700;font-size:13px;padding:10px 20px}
.rp-cgname{font-size:13px;color:var(--ink-2,#4f534d);margin-top:2px}
.rp-cov{font-size:12.5px;color:var(--ink-2,#4f534d);line-height:1.5}
.rp-cov span{display:inline-block;margin-right:8px;white-space:nowrap}
.rp-cov.none{color:var(--ink-3,#797d75)}
.rp-num{font-weight:700;font-size:15px}
.rp-num.B{color:${INK.B}} .rp-num.P{color:${INK.P}} .rp-num.A{color:${INK.A}} .rp-num.m{color:var(--ink-1,#1c2a24);font-weight:800}
.rp-num.dim{color:var(--ink-3,#797d75);font-weight:600}
.rp-mix{display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--surface-2,#eceee9);min-width:150px}
.rp-mix i{display:block;height:100%}
.rp-level{display:inline-block;font-size:12.5px;font-weight:700;padding:5px 12px;border-radius:999px;white-space:nowrap}
.rp-level.none{background:var(--surface-2,#eceee9);color:var(--ink-3,#797d75);font-weight:600}
.rp-empty{padding:22px 20px;font-size:14px;color:var(--ink-2,#4f534d)}
@media (max-width:700px){.rp-title{font-size:25px}.rp-kpi .v{font-size:29px}}`;
    document.head.appendChild(st);
  }

  // ---------------------------------------------------------------------
  // The Pre-Test numbers, worked out once, from the saved class tally.
  // ---------------------------------------------------------------------
  function preTestFigures(){
    ensurePreTestTallyForClass();
    const acts = WEEKLY_ASSESSMENT_ACTIVITIES;
    const kids = (typeof assessmentPupilNames === 'function') ? assessmentPupilNames().length : 0;
    const byCg = {}; const tot = { b: 0, p: 0, a: 0 };
    acts.forEach((a, i) => {
      const code = cgCode(a.cg), major = cgMajor(code);
      const t = preTestTallyEntries[String(i)] || {};
      const b = +t.count_e || 0, p = +t.count_p || 0, ad = +t.count_a || 0;
      const row = byCg[major] = byCg[major] || { b: 0, p: 0, a: 0, acts: [] };
      row.b += b; row.p += p; row.a += ad;
      row.acts.push({ n: i + 1, sub: code.replace(/^CG-/, '') });
      tot.b += b; tot.p += p; tot.a += ad;
    });
    const marks = tot.b + tot.p + tot.a;
    const cells = kids * acts.length;
    return {
      acts, kids, byCg, tot, marks, cells,
      worksheet: acts.filter(a => a.type === 'Worksheet').length,
      classroom: acts.filter(a => a.type === 'Classroom').length,
      covered: Object.keys(byCg).filter(k => +k >= 1 && +k <= 13).length,
      completed: cells ? Math.min(100, Math.round(marks / cells * 100)) : 0,
      dsi: marks ? Math.round((tot.p * 100 + tot.a * 200) / marks) : 0,
      sri: marks ? Math.round((tot.p + tot.a) / marks * 100) : 0
    };
  }

  const kpi = (k, v, unit, foot) => `<div class="rp-kpi"><div class="k">${E(k)}</div><div class="v">${v}${unit ? `<small>${E(unit)}</small>` : ''}</div><div class="f">${E(foot)}</div></div>`;

  // ---------------------------------------------------------------------
  // Pre-Test records — CG by CG
  // ---------------------------------------------------------------------
  function renderPreTestRecordsNew(container){
    injectCss();
    const F = preTestFigures();
    const wrap = document.createElement('div');

    if(!F.marks){
      wrap.innerHTML = `<div class="rp-card"><div class="rp-empty">Nothing has been recorded for the Pre-Test in ${E(ASSESS_TERMS[currentAssessTerm()].label)} yet. Enter the marks in Assessment → Pre-Test and this page fills in by itself.</div></div>`;
      container.appendChild(wrap); return;
    }

    // 4 summary tiles
    let html = '<div class="rp-kpis">'
      + kpi('Activities', F.acts.length, F.worksheet + ' worksheet · ' + F.classroom + ' classroom', 'Covering ' + F.covered + ' of the 13 CGs')
      + kpi('Completed', F.completed + '%', F.marks + ' of ' + F.cells, 'The rest: absent, not evaluated')
      + kpi('Class DSI', F.dsi, 'of 200', 'B = 0 · P = 100 · A = 200')
      + kpi('At Proficient or above', F.sri + '%', 'SRI', 'Of the marks given')
      + '</div>';

    // Where the class needs support
    const needs = [];
    RP_AREAS.forEach(ar => ar.cgs.forEach(([n, title]) => {
      const r = F.byCg[n]; const m = r ? r.b + r.p + r.a : 0;
      if(m && r.b / m >= NEEDS_SUPPORT_AT) needs.push({ n, title, pct: Math.round(r.b / m * 100) });
    }));
    needs.sort((x, y) => y.pct - x.pct || x.n - y.n);
    html += '<div class="rp-card rp-support"><b>Where the class needs support</b>'
      + (needs.length
        ? needs.sort((x, y) => x.n - y.n).map(x => `<span class="rp-sup-item"><span class="rp-cgchip">CG-${x.n}</span>${E(x.title)} — ${x.pct}% of marks at Beginner</span>`).join('')
        : `<span class="rp-sup-item">No CG has ${Math.round(NEEDS_SUPPORT_AT * 100)}% or more of its marks at Beginner.</span>`)
      + '</div>';

    // Every CG — Pre-Test baseline
    const legend = ['B', 'P', 'A'].map(k => `<span><i style="background:${COL[k]}"></i>${k} ${NAME[k]}</span>`).join('');
    let rows = '';
    RP_AREAS.forEach(ar => {
      rows += `<tr class="area"><td colspan="8">${E(ar.name)}</td></tr>`;
      ar.cgs.forEach(([n, title]) => {
        const r = F.byCg[n]; const m = r ? r.b + r.p + r.a : 0;
        const lvl = m ? cgLevel(r.b, r.p, r.a) : null;
        let cov;
        if(r && r.acts.length) cov = `<div class="rp-cov">${r.acts.map(a => `<span>Act ${a.n} · ${E(a.sub)}</span>`).join('')}</div>`;
        else cov = '<div class="rp-cov none">Not in the Pre-Test — seen in Observation and Workbook</div>';
        const num = (k, v) => m ? `<span class="rp-num ${k}">${v}</span>` : '<span class="rp-num dim">–</span>';
        const seg = k => (m ? (r[k.toLowerCase()] / m * 100) : 0);
        const mix = m
          ? `<div class="rp-mix" title="B ${r.b} · P ${r.p} · A ${r.a}">${['B', 'P', 'A'].map(k => `<i style="width:${seg(k)}%;background:${COL[k]}"></i>`).join('')}</div>`
          : '<div class="rp-mix"></div>';
        const level = lvl
          ? `<span class="rp-level" style="background:${TINT[lvl.letter]};color:${INK[lvl.letter]}">${NAME[lvl.letter]}</span>`
          : '<span class="rp-level none">Not assessed</span>';
        rows += `<tr><td><b>CG-${n}</b><div class="rp-cgname">${E(title)}</div></td><td>${cov}</td>`
          + `<td class="c">${num('B', m ? r.b : '')}</td><td class="c">${num('P', m ? r.p : '')}</td><td class="c">${num('A', m ? r.a : '')}</td>`
          + `<td class="c">${m ? `<span class="rp-num m">${m}</span>` : '<span class="rp-num dim">–</span>'}</td><td>${mix}</td><td>${level}</td></tr>`;
      });
    });
    html += `<div class="rp-card"><div class="rp-cardhead"><div><h3>Every CG — Pre-Test baseline</h3><p>Each activity's marks add up to its CG. Absent children are not counted.</p></div><div class="rp-legend">${legend}</div></div>`
      + `<div class="rp-scroll"><table class="rp-table"><thead><tr><th>Curricular goal</th><th>Covered by (activity · competency)</th><th class="c">B</th><th class="c">P</th><th class="c">A</th><th class="c">Marks</th><th>Mix</th><th>Class level</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;

    wrap.innerHTML = html;
    container.appendChild(wrap);
  }

  // ---------------------------------------------------------------------
  // Screen top: title, term, "the term, in order" — then the chosen view
  // ---------------------------------------------------------------------
  function setRecordsTerm(t){
    if(window.setPortalTerm){ window.setPortalTerm(t); return; }
    if(currentAssessTerm() === t) return;
    assessmentTerm = t;
    const ms = assessTermMonths();
    const now = new Date().toLocaleDateString('en-GB', { month: 'long' });
    currentWorkbookMonth = ms.includes(now) ? now : ms[0];
    if(typeof obsRangeFrom !== 'undefined'){ obsRangeFrom = ms[0]; obsRangeTo = ms[ms.length - 1]; }
    if(typeof currentObservationThemeId !== 'undefined') currentObservationThemeId = null;
    if(typeof preTestTallyLoadedFor !== 'undefined') preTestTallyLoadedFor = null; // reload that term's Pre-Test tally
    assessmentRecordsRefresh();
  }

  function renderAssessmentRecordsNew(container){
    injectCss();
    ensurePreTestTallyForClass(); // the header's PDF button and the step cards read this term's Pre-Test tally
    const info = (typeof myClassInfo !== 'undefined' && myClassInfo) || {};
    const term = currentAssessTerm();
    const months = ASSESS_TERMS[term].months;
    const span = months[0] + ' → ' + months[months.length - 1] + ' · monthly';
    if(!['total', 'observation', 'workbook', 'pretest', 'motor'].includes(assessmentRecordsType)) assessmentRecordsType = 'total';
    const type = assessmentRecordsType;

    // header
    const head = document.createElement('div'); head.className = 'rp-head';
    head.innerHTML = `<div><div class="rp-eyebrow">${E([info.class_name, info.school_name].filter(Boolean).join(' · '))}</div>`
      + '<h1 class="rp-title">Assessment records</h1>'
      + '<p class="rp-sub">What has been saved, assessment by assessment, and how the class stands on every curricular goal (CG).</p></div>';
    if(type === 'pretest'){
      const pdf = document.createElement('button'); pdf.type = 'button'; pdf.className = 'rp-pdf'; pdf.textContent = '⬇ Pre-Test report (PDF)';
      const any = Object.values(preTestTallyEntries || {}).some(t => (+t.count_e || 0) + (+t.count_p || 0) + (+t.count_a || 0) > 0);
      if(any) pdf.onclick = downloadPreTestClassPdf; else { pdf.disabled = true; pdf.title = 'Nothing recorded yet'; }
      head.appendChild(pdf);
    }
    container.appendChild(head);

    // term
    // the Term is set by the switch at the top of the portal (no per-page Term row)

    // the term, in order
    ensurePreTestTallyForClass();
    const F = preTestFigures();
    const level = (typeof workbookLevelFromClassName === 'function') ? workbookLevelFromClassName() : '';
    const themes = (typeof observationThemesCache !== 'undefined') ? observationThemesCache[level + '|' + currentWorkbookMonth] : null;
    const obsLine = Array.isArray(themes) && themes.length
      ? themes.length + ' themes · ' + themes.reduce((s, t) => s + ((t.items && t.items.length) || 0), 0) + ' competencies'
      : 'Themes & competencies';
    const steps = [
      { key: 'pretest', n: '1', title: 'Pre-Test', l1: months[0] + ' · baseline', l2: F.acts.length + ' activities · ' + F.marks + ' marks' },
      { key: 'observation', n: '2', title: 'Classroom Observation', l1: span, l2: obsLine },
      { key: 'workbook', n: '3', title: 'Workbook', l1: span, l2: 'Workbook pages' },
      { key: 'motor', n: '4', title: 'Fine & Gross Motor', l1: span, l2: '1 activity a month each' },
      { key: 'total', n: 'Σ', title: 'Term total', l1: 'Whole ' + ASSESS_TERMS[term].label, l2: 'Every CG, every assessment' }
    ];
    const lab = document.createElement('div'); lab.className = 'rp-label'; lab.textContent = 'The term, in order';
    container.appendChild(lab);
    const grid = document.createElement('div'); grid.className = 'rp-steps';
    steps.forEach(s => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'rp-step' + (type === s.key ? ' on' : '');
      b.setAttribute('aria-pressed', type === s.key ? 'true' : 'false');
      b.innerHTML = `<div class="t"><span class="n">${E(s.n)}</span>${E(s.title)}</div><div class="l1">${E(s.l1)}</div><div class="l2">${E(s.l2)}</div>`;
      b.onclick = () => { assessmentRecordsType = s.key; assessmentRecordsRefresh(); };
      grid.appendChild(b);
    });
    container.appendChild(grid);

    // Month picker for the month-scoped views — as before.
    if(type === 'observation' || type === 'workbook' || type === 'total'){
      const bar = document.createElement('div'); bar.className = 'fbar'; bar.style.marginBottom = '14px';
      bar.innerHTML = '<div class="ctl"><label>Month</label><select id="recordsMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
      container.appendChild(bar);
      fillRecordsMonthSelect(bar.querySelector('#recordsMonthSelect')); // part 14: the term's months, plus Whole Term for Σ Total
    }

    const body = document.createElement('div');
    container.appendChild(body);
    if(!ensurePupilsLoadedFor(body, assessmentRecordsRerender)) return;
    if(type === 'total') renderCgTotalRecords(body);            // part 14
    else if(type === 'observation') renderObservationRecords(body);
    else if(type === 'workbook') renderWorkbookRecords(body);
    else if(type === 'pretest') renderPreTestRecordsNew(body);
    else renderMotorRecords(body);
  }

  window.renderAssessmentRecords = renderAssessmentRecordsNew;
  window.renderPreTestRecords = renderPreTestRecordsNew;
})();