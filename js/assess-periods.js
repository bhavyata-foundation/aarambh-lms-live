/* =========================================================================
   js/assess-periods.js — Assessment Dashboard by MONTH, TERM or FULL YEAR
   -------------------------------------------------------------------------
   The dashboard (teacher-part-14.js) asks computeCgTotalsPeriod() for the
   totals of the chosen period:
     • a month        — that month's marks
     • Term 1 / 2     — every month of the term added up; Pre-Test (a
                        baseline) counted once, from that term's Pre-Test
     • Full year      — Term 1 + Term 2. If both terms' Pre-Test are the
                        same marks (child-wise Pre-Test is not split by term
                        yet), they are counted once, not twice.
   Loads after teacher-part-14.js (teacher.html).
   ========================================================================= */
  var dashPeriod = null; // 'm:June' … 'm:March' | 't:1' | 't:2' | 'y'

  function dashPeriodGet(){
    const key = dashPeriod || ('m:' + currentWorkbookMonth);
    if(key === 'y') return { key, kind: 'y', label: 'Full year (Term 1 + Term 2)', months: ASSESS_TERMS[1].months.concat(ASSESS_TERMS[2].months) };
    if(key.startsWith('t:')){ const n = +key.slice(2), t = ASSESS_TERMS[n]; return { key, kind: 't', term: n, label: t.label + ' (' + t.span + ')', months: t.months }; }
    const m = key.slice(2); return { key, kind: 'm', month: m, label: m, months: [m] };
  }

  // The Period box on the dashboard.
  function dashPeriodSelectHtml(){
    const cur = dashPeriodGet().key, opt = (v, t) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${t}</option>`;
    return '<select style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">'
      + [1, 2].map(n => `<optgroup label="${ASSESS_TERMS[n].label} months">` + ASSESS_TERMS[n].months.map(m => opt('m:' + m, m)).join('') + '</optgroup>').join('')
      + '<optgroup label="Whole term">' + opt('t:1', 'Term 1 (June – October)') + opt('t:2', 'Term 2 (November – March)') + '</optgroup>'
      + '<optgroup label="Whole year">' + opt('y', 'Full year (Term 1 + Term 2)') + '</optgroup></select>';
  }
  function dashPeriodChange(value){
    dashPeriod = value;
    if(value.startsWith('m:')) currentWorkbookMonth = value.slice(2); // keep the shared month in step
    renderAssessmentDashboard();
  }

  // Run fn as if the Assessment term were n (Pre-Test keeps one count per term), then put it back.
  function withAssessTerm(n, fn){
    const prev = assessmentTerm, prevFlag = window.__assessTermOverride;
    assessmentTerm = n; window.__assessTermOverride = true;
    try { return fn(); }
    finally {
      assessmentTerm = prev; window.__assessTermOverride = prevFlag;
      if(typeof ensurePreTestTallyForClass === 'function') ensurePreTestTallyForClass(); // reload the current term's Pre-Test
    }
  }

  // Add two sets of totals together (used for the full year).
  function mergeCgTotals(A, B){
    const z = () => ({ b: 0, p: 0, a: 0 }), srcs = ['observation', 'workbook', 'pretest', 'motor', 'viva'];
    const pre = T => JSON.stringify(T.codes.map(c => [c, T.rows[c].pretest]).filter(x => x[1].b + x[1].p + x[1].a));
    const pretestSame = pre(A) === pre(B) && pre(A) !== '[]';
    const rows = {}, children = {};
    [A, B].forEach((T, i) => {
      T.codes.forEach(code => {
        const s = T.rows[code], r = rows[code] || (rows[code] = { code, items: new Set(), observation: z(), workbook: z(), pretest: z(), motor: z(), viva: z() });
        srcs.forEach(k => { if(k === 'pretest' && i === 1 && pretestSame) return; ['b', 'p', 'a'].forEach(x => { r[k][x] += s[k][x]; }); });
        s.items.forEach(x => r.items.add(x));
      });
      Object.entries(T.children || {}).forEach(([pid, cgs]) => Object.entries(cgs).forEach(([code, r]) => {
        const c = children[pid] || (children[pid] = {}), t = c[code] || (c[code] = { observation: z(), workbook: z(), motor: z() });
        ['observation', 'workbook', 'motor'].forEach(k => ['b', 'p', 'a'].forEach(x => { t[k][x] += (r[k] || {})[x] || 0; }));
      }));
    });
    const recorded = {}; srcs.forEach(k => { recorded[k] = A.recorded[k] + (k === 'pretest' && pretestSame ? 0 : B.recorded[k]); });
    const codes = Object.keys(rows).sort((x, y) => cgMajor(x) - cgMajor(y) || parseFloat(x.slice(3)) - parseFloat(y.slice(3)));
    return { loading: false, rows, codes, children, recorded,
      errors: Array.from(new Set([...(A.errors || []), ...(B.errors || [])])),
      motorNote: (A.motorNote || '') + (pretestSame ? 'Pre-Test is the same in both terms, so it is counted once for the year. ' : ''),
      books: A.books };
  }

  function computeCgTotalsPeriod(P, reRender){
    if(P.kind === 'm') return computeCgTotals(P.month, reRender);
    if(P.kind === 't') return withAssessTerm(P.term, () => computeCgTotalsTerm(P.months, reRender));
    const A = withAssessTerm(1, () => computeCgTotalsTerm(ASSESS_TERMS[1].months, reRender));
    const B = withAssessTerm(2, () => computeCgTotalsTerm(ASSESS_TERMS[2].months, reRender));
    if(A.loading || B.loading) return { loading: true };
    return mergeCgTotals(A, B);
  }

  // ---- Which assessment the dashboard shows: all of them, or just one ----
  var dashSource = 'all'; // 'all' | 'observation' | 'workbook' | 'pretest' | 'motor'
    var DASH_SOURCES = [['all', 'All assessments'], ['pretest', 'Pre-Test'], ['observation', 'Classroom Observation'], ['workbook', 'Workbook'], ['motor', 'Fine & Gross Motor'], ['viva', 'Viva'], ['coverage', 'Activity coverage']];
  function dashSourceInclude(){
    const all = { observation: true, workbook: true, pretest: true, motor: true, viva: true };
    if(dashSource === 'all') return all;
    Object.keys(all).forEach(k => { all[k] = k === dashSource; });
    return all;
  }
  function dashSourceLabel(){ return (DASH_SOURCES.find(x => x[0] === dashSource) || DASH_SOURCES[0])[1]; }
  // The row of buttons above the dashboard.
  function dashSourceBar(){
    const bar = document.createElement('div'); bar.setAttribute('data-no-export', '1');
    bar.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:0 0 14px;';
    bar.innerHTML = '<span class="cap" style="margin-right:4px;">Show</span>' + DASH_SOURCES.map(([k, l]) => {
      const on = k === dashSource;
      return `<button type="button" onclick="dashSource='${k}'; renderAssessmentDashboard();" style="padding:6px 14px; border-radius:99px; border:1px solid ${on ? 'transparent' : 'var(--border)'}; background:${on ? 'var(--primary)' : '#fff'}; color:${on ? '#fff' : 'var(--text)'}; font-size:12.5px; font-weight:600; cursor:pointer;">${l}</button>`;
    }).join('');
    return bar;
  }

  
  // ---- The CG total at the end of an Assessment tab (Classroom Observation, Fine & Gross Motor) ----
  // Adds up only that tab's own marks for the months it shows. Several activities on the same CG all count.
  function assessTabTotalsCard(source){
    const reRender = () => renderMonthlyAssessment(monthlyAssessmentTargetEl);
    let months = assessTermMonths();
    if(source === 'observation' && typeof obsRangeFrom !== 'undefined'){
      const a = months.indexOf(obsRangeFrom), b = months.indexOf(obsRangeTo);
      if(a >= 0 && b >= a) months = months.slice(a, b + 1);
    }
    const label = { observation: 'Classroom Observation', motor: 'Fine & Gross Motor' }[source] || source;
    const span = months.length === 1 ? months[0] : months[0] + ' – ' + months[months.length - 1];
    const T = computeCgTotalsTerm(months, reRender);
    if(T.loading) return mdCard('Total — ' + label, 'Adding up the saved marks for ' + span + '…', null);
    const rows = T.codes.map(code => { const r = T.rows[code], t = r[source] || { b: 0, p: 0, a: 0 };
      return { code, tot: { b: t.b, p: t.p, a: t.a }, items: Array.from(r.items).filter(x => source === 'motor' ? /motor/i.test(x) : /^Observation/i.test(x)).map(x => x.replace(/^Observation: /, '')) };
    }).filter(r => r.tot.b + r.tot.p + r.tot.a);
    const grand = rows.reduce((g, r) => ({ b: g.b + r.tot.b, p: g.p + r.tot.p, a: g.a + r.tot.a }), { b: 0, p: 0, a: 0 });
    const box = document.createElement('div');
    box.innerHTML = rows.length ? gradeTotalsTable(rows, grand, cgLevel) : '<p class="cap" style="margin:0;">No ' + label + ' marks saved for ' + span + ' yet.</p>';
    return mdCard('Total — ' + label + ', ' + span, 'Every saved mark on this tab added up by CG. Several activities on the same CG all count. Use it to check the data.', box);
  }
