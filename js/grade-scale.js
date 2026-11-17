/* =========================================================================
   js/grade-scale.js — THE grade scale for every assessment screen
   -------------------------------------------------------------------------
   One look everywhere (Classroom Observation, Workbook, Pre-Test, Fine &
   Gross Motor, Weekly, My Class, records, dashboards, Transition):

       B  Beginner     light red circle
       P  Proficient   light yellow circle
       A  Advanced     light green circle

   B / P / A is the only grading system. Tap-to-grade pickers show the three
   letters side by side; the chosen one is highlighted. Not graded = none
   highlighted, which means "Not assessed" — never Beginner.

   What is saved is unchanged (E/P/A for most assessments, R/Y/G for
   Motor) — only the display is B / P / A. Change the colours or wording
   here and every screen follows.
   Loads after the part files (teacher.html).
   ========================================================================= */
  var GRADE_SCALE = {
    // bg = the colour itself (outlines); tint = the soft fill; ink = the number
    B: { n: 1, label: 'Beginner',   bg: '#D64545', tint: '#FDE4E2', ink: '#B3261E' },
    P: { n: 2, label: 'Proficient', bg: '#E9B824', tint: '#FFF4CC', ink: '#8A6400' },
    A: { n: 3, label: 'Advanced',   bg: '#2E9E5B', tint: '#DDF3E5', ink: '#1E7A45' }
  };
  var GRADE_LEGEND = 'B Beginner · P Proficient · A Advanced';

  // Any stored or typed code → 'B' | 'P' | 'A' | ''.
  function gradeKey(x){
    const t = String(x == null ? '' : x).trim().toUpperCase();
    if(['B', 'E', 'R', 'BEGINNER', 'EMERGING', 'RED'].includes(t)) return 'B';
    if(['P', 'Y', 'PROFICIENT', 'YELLOW', 'DEVELOPING'].includes(t)) return 'P';
    if(['A', 'G', 'ADVANCED', 'GREEN', 'ACHIEVED'].includes(t)) return 'A';
    return '';
  }
  function gradeNum(x){ return gradeKey(x); } // kept for older callers: now returns the letter B / P / A
  function gradeLabel(x){ const k = gradeKey(x); return k ? GRADE_SCALE[k].label : ''; }

  // A filled circle with the number. size in px (default 22).
  function gradeDot(x, size, title){
    const k = gradeKey(x);
    if(!k) return '<span class="dim" title="not graded">·</span>';
    const g = GRADE_SCALE[k], s = size || 22;
    return `<span class="gd gd-${k}" title="${title || k + ' ' + g.label}" style="width:${s}px; height:${s}px; font-size:${Math.round(s * 0.52)}px;">${k}</span>`;
  }
  // Circle + word, for an overall level ("2 Proficient").
  function gradePill(x, title){
    const k = gradeKey(x);
    if(!k) return '<span class="dim">—</span>';
    return `<span class="gd-pill" title="${title || ''}">${gradeDot(k, 18)}<span>${GRADE_SCALE[k].label}</span></span>`;
  }
  // Inline style for a tap-to-grade circle: soft colour always; the chosen one
  // gets a strong outline and full colour, the others are paler.
  function gradeBtnStyle(x, active, size){
    const k = gradeKey(x), g = GRADE_SCALE[k] || GRADE_SCALE.P, s = size || 26;
    return `width:${s}px; height:${s}px; min-width:${s}px; padding:0; border-radius:50%; border:${active ? 2 : 1}px solid ${g.bg}; background:${g.tint}; color:${g.ink};`
      + ` font-size:${Math.round(s * 0.48)}px; font-weight:${active ? 800 : 600}; line-height:1; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;`
      + (active ? ` box-shadow:0 0 0 2px #fff, 0 0 0 3.5px ${g.bg};` : ' opacity:.7;');
  }
  // What a picker circle says: its own letter (B / P / A). The chosen one is highlighted by gradeBtnStyle.
  function gradeBtnLabel(active, x){ return gradeKey(x); }
  // Three heading cells for count tables (1 · 2 · 3).
  function gradeHeads(){ return ['B', 'P', 'A'].map(k => `<th style="text-align:center;">${gradeDot(k, 20)}</th>`).join(''); }

  // A count cell tinted in its grade's colour (pale when 0).
  function gradeCountCell(x, n){
    const k = gradeKey(x), g = GRADE_SCALE[k];
    return `<td style="text-align:center; font-weight:700; background:${n ? g.tint : 'transparent'}; color:${n ? g.ink : 'var(--text-muted,#999)'};">${n}</td>`;
  }
  // A bar showing the B / P / A mix in red / yellow / green.
  function gradeBar(b, p, a, width){
    const n = b + p + a; if(!n) return '<span class="dim">—</span>';
    const seg = (k, v) => v ? `<span title="${GRADE_SCALE[k].label}: ${v} (${Math.round(v / n * 100)}%)" style="display:block; height:100%; width:${v / n * 100}%; background:${GRADE_SCALE[k].bg};"></span>` : '';
    return `<span style="display:flex; width:${width || 140}px; height:12px; border-radius:6px; overflow:hidden; background:#eee;">${seg('B', b)}${seg('P', p)}${seg('A', a)}</span>`;
  }
  
    // "CG-2.2" -> "C-2.2" (a competency) · "CG-3" stays "CG-3" (a whole curricular goal)
  // codes exactly as stored, i.e. as on the official sheets ("CG 1.2" on the Pre-Test, "C-1.2" on Observation / Workbook)
  function cgCodeLabel(code){ return String(code == null ? '' : code).trim(); }
  // The CG totals table: rows = [{ code, tot:{b,p,a}, L, items:[...] }], grand = {b,p,a}.
  function gradeTotalsTable(rows, grand, levelFn){
    const lv = (b, p, a) => levelFn ? levelFn(b, p, a) : null;
    let h = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="min-width:720px;"><thead><tr><th style="text-align:left;">Code</th><th style="text-align:left;">From</th>'
      + gradeHeads() + '<th>Total</th><th style="text-align:left;">Mix</th><th style="text-align:left;">Class level</th></tr></thead><tbody>';
    rows.forEach(r => {
      const n = r.tot.b + r.tot.p + r.tot.a, L = r.L || lv(r.tot.b, r.tot.p, r.tot.a);
      h += `<tr><td style="text-align:left;"><b>${esc(cgCodeLabel(r.code))}</b></td><td style="text-align:left;" class="cap">${esc((r.items || []).slice(0, 3).join(' · '))}${(r.items || []).length > 3 ? ' …' : ''}</td>`
        + gradeCountCell('B', r.tot.b) + gradeCountCell('P', r.tot.p) + gradeCountCell('A', r.tot.a)
        + `<td style="text-align:center; font-weight:700;">${n}</td><td>${gradeBar(r.tot.b, r.tot.p, r.tot.a)}</td><td style="text-align:left;">${L ? gradePill(L.letter, 'average ' + L.avg) : '<span class="dim">Not assessed</span>'}</td></tr>`;
    });
    if(grand){
      const n = grand.b + grand.p + grand.a, L = lv(grand.b, grand.p, grand.a);
      h += `<tr style="border-top:2px solid var(--border);"><td style="text-align:left;" colspan="2"><b>All CGs</b></td>`
        + gradeCountCell('B', grand.b) + gradeCountCell('P', grand.p) + gradeCountCell('A', grand.a)
        + `<td style="text-align:center; font-weight:800;">${n}</td><td>${gradeBar(grand.b, grand.p, grand.a)}</td><td style="text-align:left;">${L ? gradePill(L.letter, 'average ' + L.avg) : ''}</td></tr>`;
    }
    return h + '</tbody></table></div>';
  }

  // Each child's totals: kids = [{id, name, register_no}], children = { pupilId: { CG: { observation:{b,p,a}, workbook:{..}, motor:{..} } } }.
  // One row per child (all CGs added up), with a "CG by CG" breakdown underneath.
  function gradeChildrenTable(kids, children, levelFn, onlySrc){
    const SRC = { observation: 'Classroom Observation', workbook: 'Workbook', motor: 'Fine & Gross Motor' };
    if(onlySrc) Object.keys(SRC).forEach(k => { if(k !== onlySrc) delete SRC[k]; }); // just one assessment
    const sum = r => { const t = { b: 0, p: 0, a: 0 }; Object.keys(SRC).forEach(k => { if(r && r[k]) { t.b += r[k].b; t.p += r[k].p; t.a += r[k].a; } }); return t; };
    const byCode = (x, y) => (parseInt(x.replace(/\D+/, ''), 10) - parseInt(y.replace(/\D+/, ''), 10)) || parseFloat(x.split('.')[1] || 0) - parseFloat(y.split('.')[1] || 0);
    let h = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="min-width:760px;"><thead><tr><th style="text-align:left;">Child</th>'
      + gradeHeads() + '<th>Total</th><th style="text-align:left;">Mix</th><th style="text-align:left;">Overall</th><th style="text-align:left;">CG by CG</th></tr></thead><tbody>';
    kids.forEach(p => {
      const mine = children[p.id] || {}, codes = Object.keys(mine).filter(c => { const t = sum(mine[c]); return t.b + t.p + t.a; }).sort(byCode);
      const all = codes.reduce((t, c) => { const x = sum(mine[c]); return { b: t.b + x.b, p: t.p + x.p, a: t.a + x.a }; }, { b: 0, p: 0, a: 0 });
      const n = all.b + all.p + all.a, L = n && levelFn ? levelFn(all.b, all.p, all.a) : null;
      let detail = '<span class="dim">—</span>';
      if(codes.length){
        detail = `<details><summary style="cursor:pointer; color:var(--primary,#1e8f6e); font-size:12.5px;">${codes.map(c => { const x = sum(mine[c]), l = levelFn ? levelFn(x.b, x.p, x.a) : null; return l ? gradeDot(l.letter, 18, c + ': ' + l.letter) : ''; }).join(' ')} <span style="margin-left:4px;">${codes.length} CG${codes.length === 1 ? '' : 's'}</span></summary>`
          + '<table class="report-table" style="margin-top:8px; min-width:520px;"><thead><tr><th style="text-align:left;">Code</th>' + gradeHeads() + '<th>Total</th><th style="text-align:left;">Level</th><th style="text-align:left;">From</th></tr></thead><tbody>'
          + codes.map(c => { const r = mine[c], x = sum(r), t = x.b + x.p + x.a, l = levelFn ? levelFn(x.b, x.p, x.a) : null;
              const from = Object.keys(SRC).filter(k => r[k] && r[k].b + r[k].p + r[k].a).map(k => SRC[k] + ' ' + (r[k].b + r[k].p + r[k].a)).join(' · ');
              return `<tr><td style="text-align:left;"><b>${esc(cgCodeLabel(c))}</b></td>${gradeCountCell('B', x.b)}${gradeCountCell('P', x.p)}${gradeCountCell('A', x.a)}<td style="text-align:center;">${t}</td><td style="text-align:left;">${l ? gradePill(l.letter, 'average ' + l.avg) : ''}</td><td style="text-align:left;" class="cap">${esc(from)}</td></tr>`; }).join('')
          + '</tbody></table></details>';
      }
      h += `<tr><td style="text-align:left; vertical-align:top;"><b>${esc(p.name)}</b>${p.register_no ? '<div class="cap">' + esc(p.register_no) + '</div>' : ''}</td>`
        + gradeCountCell('B', all.b) + gradeCountCell('P', all.p) + gradeCountCell('A', all.a)
        + `<td style="text-align:center; font-weight:700;">${n}</td><td>${gradeBar(all.b, all.p, all.a, 120)}</td><td style="text-align:left;">${L ? gradePill(L.letter, 'average ' + L.avg) : '<span class="dim">Not assessed</span>'}</td><td style="text-align:left;">${detail}</td></tr>`;
    });
    return h + '</tbody></table></div>';
  }

  (function gradeStyles(){
    if(document.getElementById('grade-scale-css')) return;
    const st = document.createElement('style'); st.id = 'grade-scale-css';
    st.textContent = '.gd{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;font-weight:800;line-height:1;flex:0 0 auto;vertical-align:middle;font-family:inherit;}'
      + Object.keys(GRADE_SCALE).map(k => `.gd-${k}{background:${GRADE_SCALE[k].tint};color:${GRADE_SCALE[k].ink};border:1px solid ${GRADE_SCALE[k].bg};}`).join('')
      + '.gd-pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;white-space:nowrap;}'
      + '@media print{.gd{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}';
    (document.head || document.documentElement).appendChild(st);
  })();

  // Screens that read a letter from these tables now get the number.
  (function applyScale(){
    try { if(typeof TIER_INFO !== 'undefined'){ TIER_INFO.E.letter = 'B'; TIER_INFO.P.letter = 'P'; TIER_INFO.A.letter = 'A'; } } catch(e){}
    try {
      if(typeof MOTOR_RATINGS !== 'undefined'){
        [['R', 'B'], ['Y', 'P'], ['G', 'A']].forEach(([r, k]) => { MOTOR_RATINGS[r].letter = k; MOTOR_RATINGS[r].color = GRADE_SCALE[k].bg; }); // colour = outline colour
      }
    } catch(e){}
  })();