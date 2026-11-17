/* =========================================================================
   js/assess-records-redesign.js — ▤ Assessment records, in the portal's own look
   -------------------------------------------------------------------------
   Replaces renderAssessmentRecords() (teacher-part-23.js). It sits under the
   Term 1 / Term 2 bar and the assessment tabs exactly as the other Assessment
   screens do, and is built from the same pieces they use: section heading,
   stat tiles (mdTile), cards (mdCard) and report tables.

     Assessment chips  →  Pre-Test · Classroom Observation · Workbook ·
                          Fine & Gross Motor · Term total
     Pre-Test / Term total show:  stat tiles  →  "Where the class needs
                          support"  →  "Every CG" table (grouped by area).
     Observation / Workbook / Motor show the SAME summary (stat tiles → "Where the
                          class needs support" → "Every CG" table) for their own marks,
                          and then keep their existing detailed record views below it.

   Real data only:
     • Pre-Test    the class tally per activity (preTestTallyEntries, rebuilt
                   from the child-wise Pre-Test marks), grouped by CG.
     • Term total  computeCgTotalsTerm() — all four assessments, whole term.
   Tiles:  Completed = marks given ÷ (activities × children on the roll)
           Class DSI = average of B = 0, P = 100, A = 200 over the marks given
           At Proficient or above (SRI) = (P + A) ÷ marks given
   Loads AFTER the teacher-part files, grade-scale.js and assess-periods.js.
   ========================================================================= */
(function(){
  'use strict';

  var CG_NAMES = {
    1: 'Healthy & Safe Habits', 2: 'Sensorial Development', 3: 'Physical Fitness & Fine Motor Skills',
    4: 'Emotional Intelligence', 5: 'Productive Work & Seva', 6: 'Care for Nature',
    7: 'Observations & Logical Thinking', 8: 'Mathematical Understanding', 9: 'Communication in Two Languages',
    10: 'Reading & Writing (L1)', 11: 'Beginning Reading & Writing (L2)', 12: 'Visual & Performing Arts',
    13: 'Curiosity, Attention, Adaptability & Positive Learning Behaviours'
  };
  var CG_GROUPS = [
    { name: 'Physical Development', cgs: [1, 2, 3] },
    { name: 'Socio-Emotional & Ethical Development', cgs: [4, 5, 6] },
    { name: 'Cognitive & Language Development', cgs: [7, 8, 9, 10, 11] },
    { name: 'Creative & Aesthetic Development', cgs: [12] },
    { name: 'Positive Learning Habits', cgs: [13] }
  ];
  var CHIPS = [['pretest', '📋 Pre-Test'], ['observation', '👁️ Classroom Observation'], ['workbook', '📘 Workbook'], ['motor', '🤸 Fine & Gross Motor'], ['viva', '🗣️ Viva'], ['total', 'Σ Term total — every CG']];
  var SUPPORT_MIN_PCT = 25;   // a CG is listed under "needs support" when this % of its marks (or more) are Beginner
  var SUPPORT_MAX = 3;        // …and only the highest few are listed
  var SRC_LABEL = { pretest: 'Pre-Test', observation: 'Observation', workbook: 'Workbook', motor: 'Motor', viva: 'Viva' };

  function h(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sum(rows){
    var t = { b: 0, p: 0, a: 0 };
    Object.keys(rows).forEach(function(k){ t.b += rows[k].b; t.p += rows[k].p; t.a += rows[k].a; });
    return t;
  }
  function dsi(t){ var n = t.b + t.p + t.a; return n ? Math.round((t.p * 100 + t.a * 200) / n) : null; }
  function sri(t){ var n = t.b + t.p + t.a; return n ? Math.round((t.p + t.a) / n * 100) : null; }

  // ---------------------------------------------------------------- data
  function pretestData(){
    ensurePreTestTallyForClass();
    var rows = {}, byType = {};
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach(function(a, i){
      var code = cgCode(a.cg), maj = cgMajor(code); if(maj === 999) return;
      var t = preTestTallyEntries[String(i)] || {};
      var r = rows[maj] || (rows[maj] = { b: 0, p: 0, a: 0, cover: [] });
      r.b += t.count_e || 0; r.p += t.count_p || 0; r.a += t.count_a || 0;
      r.cover.push('Act ' + (i + 1) + ' · ' + code.replace(/^CG-/, ''));
      byType[a.type] = (byType[a.type] || 0) + 1;
    });
    Object.keys(rows).forEach(function(k){ rows[k].cover = rows[k].cover.join('\u2003'); });
    return { rows: rows, acts: WEEKLY_ASSESSMENT_ACTIVITIES.length, byType: byType };
  }
  function termData(T){
    var rows = {};
    T.codes.forEach(function(code){
      var maj = cgMajor(code); if(maj === 999) return;
      var s = T.rows[code], r = rows[maj] || (rows[maj] = { b: 0, p: 0, a: 0, src: { pretest: 0, observation: 0, workbook: 0, motor: 0, viva: 0 } });
      Object.keys(r.src).forEach(function(k){ var x = s[k]; r.src[k] += x.b + x.p + x.a; r.b += x.b; r.p += x.p; r.a += x.a; });
    });
    Object.keys(rows).forEach(function(k){
      var r = rows[k];
      r.cover = Object.keys(r.src).filter(function(s){ return r.src[s]; }).map(function(s){ return SRC_LABEL[s] + ' ' + r.src[s]; }).join(' · ');
    });
    return rows;
  }

  // ------------------------------------------------------- shared pieces
  // A stat tile in the portal's own style: label, big number, status pill, optional meter and small note.
  function tile(label, value, unit, pct, band, note){
    var pill = band ? (band.html || mdPill(band.l, band.c)) : '';
    var meter = pct == null ? null : mdMeter(pct, band ? band.c : '');
    return mdTile(label, value, unit, pill, note || '', meter);
  }
  // DSI is on a 0–200 scale (B = 0, P = 100, A = 200): show the class level it falls in, not a pass/fail band.
  function dsiBand(D){
    if(D == null) return { l: 'No marks yet', c: 'neu' };
    var letter = (1 + D / 100) < 1.67 ? 'B' : (1 + D / 100) < 2.34 ? 'P' : 'A';
    return { html: gradePill(letter, 'average ' + (Math.round((1 + D / 100) * 100) / 100)) };
  }
  function levelCell(r, n){
    var L = n ? cgLevel(r.b, r.p, r.a) : null;
    return L ? gradePill(L.letter, 'average ' + L.avg) : '<span class="dim">Not assessed</span>';
  }

  function renderCgView(body, cfg){
    var rows = cfg.rows;
    body.appendChild(mdGrid('g4', cfg.tiles));

    // Where the class needs support
    var needs = Object.keys(rows).map(function(k){
      var r = rows[k], n = r.b + r.p + r.a;
      return { cg: +k, pct: n ? Math.round(r.b / n * 100) : 0, n: n };
    }).filter(function(x){ return x.n && x.pct >= SUPPORT_MIN_PCT; })
      .sort(function(x, y){ return y.pct - x.pct || x.cg - y.cg; }).slice(0, SUPPORT_MAX);
    var sup = document.createElement('div');
    sup.innerHTML = needs.length
      ? needs.map(function(x){
          return '<div style="display:flex; gap:10px; align-items:center; padding:6px 0;"><span class="pill crit">CG-' + x.cg + '</span><span>' + h(CG_NAMES[x.cg] || '') + ' — <b>' + x.pct + '%</b> of marks at Beginner</span></div>';
        }).join('')
      : '<p class="cap" style="margin:0;">No CG has ' + SUPPORT_MIN_PCT + '% or more of its marks at Beginner.</p>';
    var supCard = mdCard('Where the class needs support', 'The CGs with the largest share of Beginner marks (' + SUPPORT_MIN_PCT + '% or more).', sup);
    supCard.style.marginTop = '20px';
    body.appendChild(supCard);

    // Every CG — grouped by area
    var t = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="min-width:860px;"><thead><tr>'
      + '<th style="text-align:left;">Curricular goal</th><th style="text-align:left;">' + h(cfg.coverHead) + '</th>' + gradeHeads()
      + '<th>Marks</th><th style="text-align:left;">Mix</th><th style="text-align:left;">Class level</th></tr></thead><tbody>';
    var pdf = '';
    CG_GROUPS.forEach(function(g){
      t += '<tr><td colspan="8" style="text-align:left; background:var(--bg); font-weight:700; color:var(--primary-dark, var(--primary));">' + h(g.name) + '</td></tr>';
      g.cgs.forEach(function(cg){
        var r = rows[cg] || { b: 0, p: 0, a: 0, cover: '' }, n = r.b + r.p + r.a;
        var cover = (n || r.cover) ? (r.cover || '') : cfg.emptyCover;
        var dash = '<td style="text-align:center;" class="dim">–</td>';
        t += '<tr><td style="text-align:left;"><b>CG-' + cg + '</b><div class="cap">' + h(CG_NAMES[cg]) + '</div></td>'
          + '<td style="text-align:left; white-space:normal;" class="cap">' + h(cover) + '</td>'
          + (n ? gradeCountCell('B', r.b) + gradeCountCell('P', r.p) + gradeCountCell('A', r.a) : dash + dash + dash)
          + '<td style="text-align:center; font-weight:700;">' + (n || '–') + '</td>'
          + '<td>' + (n ? gradeBar(r.b, r.p, r.a) : '<span class="dim">—</span>') + '</td>'
          + '<td style="text-align:left;">' + levelCell(r, n) + '</td></tr>';
        var L = n ? cgLevel(r.b, r.p, r.a) : null;
        pdf += '<tr><td>CG-' + cg + ' ' + h(CG_NAMES[cg]) + '</td><td>' + h(cover) + '</td><td>' + (n ? r.b : '–') + '</td><td>' + (n ? r.p : '–') + '</td><td>' + (n ? r.a : '–') + '</td><td>' + (n || '–') + '</td><td>' + (L ? ({ B: 'Beginner', P: 'Proficient', A: 'Advanced' })[L.letter] : 'Not assessed') + '</td></tr>';
      });
    });
    t += '</tbody></table></div>';
    var w = document.createElement('div'); w.innerHTML = t;
    var card = mdCard(cfg.title, cfg.sub + ' <span class="dim">· B Beginner · P Proficient · A Advanced</span>', w);
    card.style.marginTop = '20px';
    body.appendChild(card);

    if(cfg.noPdf) return;   // Observation / Workbook / Motor keep their own downloads
    // Source for the PDF (plain tables, kept hidden — the exporter reads tables)
    var src = document.createElement('div'); src.style.display = 'none';
    src.innerHTML = '<table class="report-table"><thead><tr><th>Measure</th><th>Value</th></tr></thead><tbody>'
      + cfg.pdfSummary.map(function(x){ return '<tr><td>' + h(x[0]) + '</td><td>' + h(x[1]) + '</td></tr>'; }).join('') + '</tbody></table>'
      + '<table class="report-table"><thead><tr><th>CG</th><th>' + h(cfg.coverHead) + '</th><th>B</th><th>P</th><th>A</th><th>Marks</th><th>Class level</th></tr></thead><tbody>' + pdf + '</tbody></table>';
    body.appendChild(src);
    window.__arxPdf = function(){ exportReportPdf(src, cfg.pdfTitle, cfg.pdfStem); };
  }

  function renderPretest(body, term){
    var info = ASSESS_TERMS[term];
    var d = pretestData(), pupils = (typeof realPupilsCache !== 'undefined' && realPupilsCache) ? realPupilsCache.length : 0;
    var t = sum(d.rows), marks = t.b + t.p + t.a, expected = d.acts * pupils;
    var D = dsi(t), S = sri(t), done = expected ? Math.round(marks / expected * 100) : 0;
    var ws = d.byType.Worksheet || 0, cr = d.byType.Classroom || 0;
    body.appendChild(mdSec('Pre-Test — class baseline, ' + info.label, ''));
    body.appendChild(recordsDownloadRow([{ label: '⬇ Pre-Test report (PDF)', primary: true, onClick: function(){ window.__arxPdf && window.__arxPdf(); }, disabled: marks ? '' : 'Nothing recorded yet' }],
      marks ? 'The class baseline across all ' + d.acts + ' activities.' : 'Nothing has been recorded for the Pre-Test yet.'));
    var gap = document.createElement('div'); gap.style.height = '14px'; body.appendChild(gap);
    renderCgView(body, {
      rows: d.rows,
      coverHead: 'Covered by (activity · competency)',
      emptyCover: 'Not in the Pre-Test — seen in Observation and Workbook',
      title: 'Every CG — Pre-Test baseline',
      sub: 'Each activity\u2019s marks add up to its CG. Absent children are not counted.',
      tiles: [
        tile('Activities', d.acts, ws + ' worksheet · ' + cr + ' classroom', null, { l: 'Covering ' + Object.keys(d.rows).length + ' of 13 CGs', c: 'neu' }, ''),
        tile('Completed', done, '% of child/activity cells', done, expected ? mdStatusBand(done) : { l: 'No children yet', c: 'neu' }, marks + ' of ' + expected + (marks < expected ? ' · the rest absent / not evaluated' : '')),
        tile('Class DSI', D == null ? '—' : D, 'of 200', D == null ? 0 : D / 2, dsiBand(D), 'B = 0 · P = 100 · A = 200'),
        tile('At Proficient or above', S == null ? '—' : S, '% SRI', S == null ? 0 : S, S == null ? { l: 'No marks yet', c: 'neu' } : mdStatusBand(S), 'Of the marks given')
      ],
      pdfTitle: 'Pre-Test — class baseline',
      pdfStem: 'pretest-cg-baseline',
      pdfSummary: [['Activities', d.acts], ['Marks given', marks + ' of ' + expected], ['Class DSI (of 200)', D == null ? '—' : D], ['At Proficient or above (SRI)', S == null ? '—' : S + '%']]
    });
  }

  function renderTerm(body, term){
    var info = ASSESS_TERMS[term];
    var T = computeCgTotalsTerm(info.months, assessmentRecordsRerender);
    if(T.loading){ body.appendChild(attNote('Loading every assessment for ' + info.label + '…')); return; }
    var rows = termData(T), t = sum(rows), marks = t.b + t.p + t.a, D = dsi(t), S = sri(t), rec = T.recorded || {};
    var assessed = Object.keys(rows).filter(function(k){ return rows[k].b + rows[k].p + rows[k].a; }).length;
    body.appendChild(mdSec('Term total — every CG, ' + info.label + ' (' + info.span + ')', '<span class="reqs">CG-1…CG-13</span>'));
    body.appendChild(recordsDownloadRow([{ label: '⬇ ' + info.label + ' report (PDF)', primary: true, onClick: function(){ window.__arxPdf && window.__arxPdf(); }, disabled: marks ? '' : 'Nothing recorded yet' }],
      marks ? 'Pre-Test, Classroom Observation, Workbook and Fine & Gross Motor added together.' : 'Nothing has been recorded for ' + info.label + ' yet.'));
    if(marks && T.errors && T.errors.length) body.appendChild(attNote('Not counted yet (nothing saved, or still loading): ' + T.errors.join(', ') + '.'));
    var gap = document.createElement('div'); gap.style.height = '14px'; body.appendChild(gap);
    renderCgView(body, {
      rows: rows,
      coverHead: 'Marks counted, by assessment',
      emptyCover: 'Nothing recorded yet',
      title: 'Every CG — ' + info.label,
      sub: 'Only saved marks are counted; absent children never are.',
      tiles: [
        tile('Marks recorded', marks, 'in the term', null, { l: assessed + ' of 13 CGs assessed', c: assessed ? 'good' : 'neu' }, 'Pre-Test ' + (rec.pretest || 0) + ' · Observation ' + (rec.observation || 0) + ' · Workbook ' + (rec.workbook || 0) + ' · Motor ' + (rec.motor || 0)),
        tile('CGs assessed', assessed, 'of 13', assessed / 13 * 100, mdStatusBand(assessed / 13 * 100), 'With at least one saved mark'),
        tile('Class DSI', D == null ? '—' : D, 'of 200', D == null ? 0 : D / 2, dsiBand(D), 'B = 0 · P = 100 · A = 200'),
        tile('At Proficient or above', S == null ? '—' : S, '% SRI', S == null ? 0 : S, S == null ? { l: 'No marks yet', c: 'neu' } : mdStatusBand(S), 'Of the marks given')
      ],
      pdfTitle: 'Assessment — collective report — ' + info.label + ' (' + info.span + ')',
      pdfStem: 'collective-' + info.label.replace(/\s+/g, '').toLowerCase(),
      pdfSummary: [['Marks recorded', marks], ['CGs assessed', assessed + ' of 13'], ['Class DSI (of 200)', D == null ? '—' : D], ['At Proficient or above (SRI)', S == null ? '—' : S + '%']]
    });
  }

  // ------------------------------------------- same summary, other windows
  // Classroom Observation, Workbook and Fine & Gross Motor get exactly the Pre-Test layout
  // (tiles → needs support → Every CG), built from that window's own saved marks. The numbers
  // come from computeCgTotals(), the same calculation the Term total uses, so they always agree.
  var WIN_LABEL = { observation: 'Classroom Observation', workbook: 'Workbook', motor: 'Fine & Gross Motor', viva: 'Viva' };

  function coverText(map){   // { 'Theme name': {'9.4':1, '9.7':1} }  →  'Theme name · 9.4, 9.7   Other · 2.1'
    return Object.keys(map).map(function(n){ return n + ' · ' + Object.keys(map[n]).join(', '); }).join('\u2003');
  }
  function addCover(cov, maj, name, code){
    if(maj === 999 || !name) return;
    var m = cov[maj] || (cov[maj] = {}), c = m[name] || (m[name] = {});
    if(code) c[code] = 1;
  }
  function windowData(src, month, term){
    var info = ASSESS_TERMS[term], level = workbookLevelFromClassName();
    var pupils = (typeof realPupilsCache !== 'undefined' && realPupilsCache) ? realPupilsCache.length : 0;
    var T = (src === 'motor') ? computeCgTotalsTerm(info.months, assessmentRecordsRerender) : computeCgTotals(month, assessmentRecordsRerender);
    if(!T || T.loading) return null;
    var rows = {}, cov = {}, first = { n: 0, unit: '', val: 0 }, expected = 0;

    T.codes.forEach(function(code){
      var maj = cgMajor(code); if(maj === 999) return;
      var s = T.rows[code][src]; if(!(s.b + s.p + s.a)) return;
      var r = rows[maj] || (rows[maj] = { b: 0, p: 0, a: 0, cover: '' });
      r.b += s.b; r.p += s.p; r.a += s.a;
    });

    if(src === 'observation'){
      var themes = observationThemesCache[level + '|' + month]; themes = Array.isArray(themes) ? themes : [];
      var items = 0;
      themes.forEach(function(t){ (t.items || []).forEach(function(it){ items++; var c = cgCode(it.cg_code); addCover(cov, cgMajor(c), t.name, c.replace(/^CG-/, '')); }); });
      expected = items * pupils; first = { val: themes.length, unit: items + ' graded items', label: 'Themes' };
    } else if(src === 'workbook'){
      var books = workbookPagesCache[level + '|' + month]; books = Array.isArray(books) ? books : [];
      var pages = 0;
      books.forEach(function(b){ (b.pages || []).forEach(function(pg){ pages++; var c = cgCode(pg.cg_code); addCover(cov, cgMajor(c), b.name, c.replace(/^CG-/, '')); }); });
      expected = pages * pupils; first = { val: books.length, unit: pages + ' pages', label: 'Workbooks' };
    } else {
      var mm = info.months.filter(function(m){ return MOTOR_MONTHS.indexOf(m) >= 0; }).length;
      ['fine', 'gross'].forEach(function(type){ var c = motorCgFor(type); if(c) addCover(cov, cgMajor(c), type === 'fine' ? 'Fine Motor' : 'Gross Motor', c.replace(/^CG-/, '')); });
      expected = pupils * 2 * mm; first = { val: 2, unit: 'Fine · Gross', label: 'Sheets' };
    }
    Object.keys(cov).forEach(function(k){ var r = rows[k] || (rows[k] = { b: 0, p: 0, a: 0 }); r.cover = coverText(cov[k]); });
    return { rows: rows, expected: expected, first: first, T: T, info: info };
  }

  // Inserts the summary right after the window's own "Download report" row (heading just above it),
  // so every assessment reads: heading → download → tiles → needs support → Every CG → the detail grids.
  function addWindowSummary(body, src, term){
    var dl = body.querySelector('[data-dl-end]'); if(!dl) return;      // still loading / nothing set up: the window shows its own message
    var d = windowData(src, currentWorkbookMonth, term); if(!d) return;
    var t = sum(d.rows), marks = t.b + t.p + t.a, D = dsi(t), S = sri(t);
    var done = d.expected ? Math.round(marks / d.expected * 100) : 0;
    var covered = Object.keys(d.rows).length;
    var scope = (src === 'motor') ? d.info.label : currentWorkbookMonth;
    var name = WIN_LABEL[src];
    var box = document.createElement('div');
    var gap = document.createElement('div'); gap.style.height = '14px'; box.appendChild(gap);
    renderCgView(box, {
      rows: d.rows, noPdf: true,
      coverHead: 'Covered by (' + (src === 'observation' ? 'theme' : src === 'workbook' ? 'workbook' : 'sheet') + ' · competency)',
      emptyCover: 'Not in ' + name + ' — seen in the other assessments',
      title: 'Every CG — ' + name + ', ' + scope,
      sub: 'Each item\u2019s marks add up to its CG, across all topics. Absent children are not counted.',
      tiles: [
        tile(d.first.label, d.first.val, d.first.unit, null, { l: 'Covering ' + covered + ' of 13 CGs', c: 'neu' }, ''),
        tile('Completed', done, '% of child/item cells', done, d.expected ? mdStatusBand(done) : { l: 'No children yet', c: 'neu' }, marks + ' of ' + d.expected + (marks < d.expected ? ' · the rest absent / not evaluated' : '')),
        tile('Class DSI', D == null ? '—' : D, 'of 200', D == null ? 0 : D / 2, dsiBand(D), 'B = 0 · P = 100 · A = 200'),
        tile('At Proficient or above', S == null ? '—' : S, '% SRI', S == null ? 0 : S, S == null ? { l: 'No marks yet', c: 'neu' } : mdStatusBand(S), 'Of the marks given')
      ]
    });
    body.insertBefore(mdSec(name + ' — class summary, ' + scope, ''), dl);
    body.insertBefore(box, dl.nextSibling);
  }

  // ----------------------------------------------------------- the screen
  window.renderAssessmentRecords = function(container){
    window.__arxPdf = null;
    window.__arxFilterBar = null;   // the one card that holds Month + Topic / Workbook (see recordsPick)
    var valid = CHIPS.map(function(c){ return c[0]; });
    if(valid.indexOf(assessmentRecordsType) < 0) assessmentRecordsType = 'pretest';
    var type = assessmentRecordsType, term = currentAssessTerm();
    recordsWholeTerm = (type === 'total');

    // The same "Assessment" chip row the records screen always had.
    var typeBar = document.createElement('div'); typeBar.className = 'fbar'; typeBar.style.marginBottom = '14px';
    typeBar.innerHTML = '<div class="ctl"><label>Assessment</label><div style="display:flex; gap:5px; flex-wrap:wrap;" id="recordsTypeChips"></div></div>';
    container.appendChild(typeBar);
    var chips = typeBar.querySelector('#recordsTypeChips');
    CHIPS.forEach(function(c){
      var b = document.createElement('button');
      b.className = 'chip' + (type === c[0] ? ' sel' : '');
      b.textContent = c[1];
      b.onclick = function(){ assessmentRecordsType = c[0]; recordsWholeTerm = (c[0] === 'total'); assessmentRecordsRefresh(); };
      chips.appendChild(b);
    });

    // Month picker — only for the instruments that are saved month by month.
    if(type === 'observation' || type === 'workbook'){
      var bar = document.createElement('div'); bar.className = 'fbar'; bar.style.cssText = 'margin-bottom:18px; display:flex; gap:16px; flex-wrap:wrap; align-items:flex-end;';
      bar.innerHTML = '<div class="ctl"><label>Month</label><select id="recordsMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
      container.appendChild(bar);
      fillRecordsMonthSelect(bar.querySelector('#recordsMonthSelect'));
      window.__arxFilterBar = bar;   // Topic / Workbook joins this card, right next to Month
    }

    var body = document.createElement('div'); container.appendChild(body);
    if(!ensurePupilsLoadedFor(body, assessmentRecordsRerender)) return;

    if(type === 'pretest') renderPretest(body, term);
    else if(type === 'total') renderTerm(body, term);
    else if(type === 'observation'){ renderObservationRecords(body); addWindowSummary(body, 'observation', term); }
    else if(type === 'workbook'){ renderWorkbookRecords(body); addWindowSummary(body, 'workbook', term); }
    else if(type === 'viva'){ if(window.vivaCgCardInto) window.vivaCgCardInto(body); }
    else { renderMotorRecords(body); addWindowSummary(body, 'motor', term); }
  };

  // Open on the Pre-Test (it used to open on Σ Total).
  if(assessmentRecordsType === 'total') assessmentRecordsType = 'pretest';
})();