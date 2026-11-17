// Display only: a decimal code (CG-2.2) is a competency, so it shows as C-2.2. Single-digit goals stay CG-2.
function cgDisplayCode(c){ return /^CG-\d+\.\d+$/.test(String(c)) ? String(c).replace(/^CG-/, 'C-') : c; }
function renderCgTotalRecords(container){
    const termInfo = ASSESS_TERMS[currentAssessTerm()];
    const whole = recordsWholeTerm;
    const month = whole ? termInfo.label + ' (' + termInfo.span + ')' : currentWorkbookMonth; // the label used below
    const T = whole ? computeCgTotalsTerm(termInfo.months, assessmentRecordsRerender) : computeCgTotals(currentWorkbookMonth, assessmentRecordsRerender);
    if(T.loading){ container.appendChild(attNote('Loading every assessment for ' + month + '…')); return; }
    const { rows, codes, errors, motorNote, books } = T;
    const srcNames = { pretest: 'Pre-Test (baseline)', observation: 'Classroom Observation', workbook: 'Workbook', motor: 'Fine & Gross Motor' };
    const ctl = document.createElement('div');
    ctl.setAttribute('data-no-export', '1');
    ctl.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:0 0 12px; font-size:13px;';
    ctl.innerHTML = '<b style="margin-right:4px;">Count in the total:</b>' + Object.keys(srcNames).map(k => `<label style="display:inline-flex; gap:6px; align-items:center; white-space:nowrap; margin:0; padding:6px 12px; border:1px solid var(--border); border-radius:99px; background:${cgTotalInclude[k] ? 'var(--bg)' : '#fff'}; cursor:pointer; font-weight:500; text-transform:none; letter-spacing:0;"><input type="checkbox" style="margin:0; width:auto;" ${cgTotalInclude[k] ? 'checked' : ''} onchange="cgTotalInclude['${k}'] = this.checked; assessmentRecordsRefresh();" /> ${esc(srcNames[k])}</label>`).join('');
    container.appendChild(ctl);
    const report = document.createElement('div');
    container.appendChild(report);
    report.appendChild(mdSec('Total — every CG, ' + month, '<span class="reqs">CG-1…CG-13</span>'));
    if(!codes.length) report.appendChild(attNote('No data available — nothing has been recorded for ' + month + ' in any assessment yet.'));
    else if(!Object.keys(cgTotalInclude).some(k => cgTotalInclude[k])) report.appendChild(attNote('Every assessment is unticked above, so nothing is counted in the total — tick at least one.'));
    else {
      const cell = x => x.b + x.p + x.a ? `${x.b} · ${x.p} · ${x.a}` : '<span class="dim">—</span>';
      const lvl = L => L ? gradePill(L.letter, 'average ' + L.avg) : '<span class="dim">—</span>';
      let t = '<div class="report-table-wrap"><table class="report-table" style="min-width:980px;"><thead><tr><th style="text-align:left;">CG</th>'
        + Object.keys(srcNames).map(k => `<th style="${cgTotalInclude[k] ? '' : 'opacity:.45;'}">${esc(srcNames[k])}<br><span class="dim" style="font-weight:400;">B · P · A</span></th>`).join('')
        + '<th>Total B</th><th>Total P</th><th>Total A</th><th>Avg (1–3)</th><th>At P or above</th><th style="text-align:left;">CG level</th></tr></thead><tbody>';
      let lastMajor = null, grand = { b: 0, p: 0, a: 0 }, majorTot = null;
      const blanks = Object.keys(srcNames).map(() => '<td></td>').join('');
      const majorRow = () => { if(!majorTot) return; const L = cgLevel(majorTot.b, majorTot.p, majorTot.a);
        t += `<tr style="background:var(--bg); font-weight:600;"><td style="text-align:left;">CG-${lastMajor} overall</td>${blanks}<td>${majorTot.b}</td><td>${majorTot.p}</td><td>${majorTot.a}</td><td>${L ? L.avg : '—'}</td><td>${L ? L.pctPA + '%' : '—'}</td><td style="text-align:left;">${lvl(L)}</td></tr>`; };
      codes.forEach(code => {
        const r = rows[code]; const maj = cgMajor(code);
        if(maj !== lastMajor){ majorRow(); lastMajor = maj; majorTot = { b: 0, p: 0, a: 0 }; }
        const tot = cgRowTotal(r, cgTotalInclude);
        ['b', 'p', 'a'].forEach(k => { majorTot[k] += tot[k]; grand[k] += tot[k]; });
        const L = cgLevel(tot.b, tot.p, tot.a);
        t += `<tr><td style="text-align:left;"><b>${esc(cgDisplayCode(code))}</b><div class="cap">${esc([...r.items].slice(0, 3).join(' · '))}${r.items.size > 3 ? ' …' : ''}</div></td>`
          + Object.keys(srcNames).map(k => `<td style="${cgTotalInclude[k] ? '' : 'opacity:.45;'}">${cell(r[k])}</td>`).join('')
          + `<td>${tot.b}</td><td>${tot.p}</td><td>${tot.a}</td><td>${L ? L.avg : '—'}</td><td>${L ? L.pctPA + '%' : '—'}</td><td style="text-align:left;">${lvl(L)}</td></tr>`;
      });
      majorRow();
      const G = cgLevel(grand.b, grand.p, grand.a);
      t += `<tr style="font-weight:700; border-top:2px solid var(--border);"><td style="text-align:left;">All CGs</td>${blanks}<td>${grand.b}</td><td>${grand.p}</td><td>${grand.a}</td><td>${G ? G.avg : '—'}</td><td>${G ? G.pctPA + '%' : '—'}</td><td style="text-align:left;">${lvl(G)}</td></tr>`;
      t += '</tbody></table></div>';
      const w = document.createElement('div');
      // On screen: one card per CG group. The full table stays (hidden) for the PDF download.
      w.innerHTML = '<div class="cg-pdf-only" style="display:none;">' + t + '</div>' + cgGroupCardsHtml(codes, rows, cgTotalInclude, srcNames, lvl);
      if(whole && T.perMonth){
        const lvlTxt = L => L ? gradeNum(L.letter) + (L.letter === 'A' ? ' Advanced' : L.letter === 'P' ? ' Proficient' : ' Beginner') + ' (' + L.avg + ')' : '<span class="dim">No data available</span>';
        let mt = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Month</th><th>Observation marks</th><th>Workbook children</th><th>Motor ratings</th><th>Marks in total</th><th style="text-align:left;">Class level</th></tr></thead><tbody>';
        T.perMonth.forEach(({ month: m, T: mt0 }) => {
          const g = mt0.codes.reduce((a, c) => { const x = cgRowTotal(mt0.rows[c], Object.assign({}, cgTotalInclude, { pretest: false })); return { b: a.b + x.b, p: a.p + x.p, a: a.a + x.a }; }, { b: 0, p: 0, a: 0 });
          const n = g.b + g.p + g.a;
          mt += `<tr><td style="text-align:left;"><b>${esc(m)}</b></td><td>${mt0.recorded.observation || '—'}</td><td>${mt0.recorded.workbook || '—'}</td><td>${mt0.recorded.motor || '—'}</td><td>${n || '—'}</td><td style="text-align:left;">${n ? lvlTxt(cgLevel(g.b, g.p, g.a)) : '<span class="dim">No data available</span>'}</td></tr>`;
        });
        mt += '</tbody></table></div>';
        const mw = document.createElement('div'); mw.innerHTML = mt;
        const mc = mdCard('Month by month — ' + month, 'What was recorded each month, and the class level from that month\u2019s marks (Pre-Test is the term baseline, so it is counted once in the table above, not per month).', mw);
        mc.style.marginBottom = '18px';
        report.appendChild(mc);
      }
      report.appendChild(mdCard('Every CG — ' + month, 'Counts are B · P · A. Level comes from the average score (B lowest, A highest): mostly B → Beginner, mostly P → Proficient, mostly A → Advanced. Only saved marks are counted; blanks never count. ' + (motorNote || 'Fine Motor counts under ' + (motorCgFor('fine') || '—') + ' and Gross Motor under ' + (motorCgFor('gross') || '—') + ', as in the activity areas. ') + (errors.length ? 'Could not load: ' + errors.join(', ') + '.' : ''), w));
    }
    // ---- Each child: their level in every CG (Observation, Workbook and Motor are per child) ----
    if(codes.length){
      const useSrc = ['observation', 'workbook', 'motor'].filter(k => cgTotalInclude[k]);
      report.appendChild(mdSec('Each child — ' + month, ''));
      if(!useSrc.length){
        report.appendChild(attNote('Tick Classroom Observation, Workbook and / or Fine & Gross Motor above to see each child\u2019s report. (Pre-Test is saved as class counts here, so it cannot be shown child by child.)'));
      } else {
        const kids = T.children || {};
        const cgCols = codes.filter(c => realPupilsCache.some(p => { const r = (kids[p.id] || {})[c]; return r && useSrc.some(k => r[k] && r[k].b + r[k].p + r[k].a); }));
        if(!cgCols.length){ report.appendChild(attNote('No data available — no child-by-child marks for ' + month + ' in the ticked assessments.')); }
        else {
          const sumFor = r => { const t = { b: 0, p: 0, a: 0 }; if(r) useSrc.forEach(k => { if(r[k]) ['b', 'p', 'a'].forEach(x => t[x] += r[k][x]); }); return t; };
          const pill = L => L ? gradeDot(L.letter, 22, 'average ' + L.avg) : '<span class="dim">—</span>';
          let ct = '<div class="report-table-wrap"><table class="report-table" style="min-width:' + Math.max(700, 260 + cgCols.length * 70) + 'px;"><thead><tr><th>Roll</th><th style="text-align:left;">Child</th>'
            + cgCols.map(c => `<th>${esc(c)}</th>`).join('') + '<th>B · P · A</th><th>Avg</th><th style="text-align:left;">Overall</th></tr></thead><tbody>';
          realPupilsCache.forEach((p, i) => {
            const all = { b: 0, p: 0, a: 0 };
            const cells = cgCols.map(c => { const t = sumFor((kids[p.id] || {})[c]); all.b += t.b; all.p += t.p; all.a += t.a; return `<td>${pill(cgLevel(t.b, t.p, t.a))}</td>`; }).join('');
            const L = cgLevel(all.b, all.p, all.a);
            ct += `<tr><td>${i + 1}</td><td style="text-align:left;"><b>${esc(p.name)}</b>${p.register_no ? '<div class="cap">Reg. no. ' + esc(p.register_no) + '</div>' : ''}</td>${cells}`
              + `<td>${all.b + all.p + all.a ? all.b + ' · ' + all.p + ' · ' + all.a : '<span class="dim">—</span>'}</td><td>${L ? L.avg : '—'}</td>`
              + `<td style="text-align:left;">${L ? gradePill(L.letter, 'average ' + L.avg) : '<span class="dim">No data available</span>'}</td></tr>`;
          });
          ct += '</tbody></table></div>';
          const cw = document.createElement('div');
          cw.innerHTML = '<div class="cg-pdf-only" style="display:none;">' + ct + '</div>' + childCardsHtml(cgCols, kids, sumFor);
          report.appendChild(mdCard('Every child — ' + month, 'Each child\u2019s level per CG from ' + useSrc.map(k => ({ observation: 'Classroom Observation', workbook: 'Workbook', motor: 'Fine & Gross Motor' })[k]).join(', ') + ' (hover a letter to see the average). Pre-Test is a class count, so it is in the CG table above but not here. Only saved marks are counted.', cw));
        }
      }
    }
    const sub = workbookMonthSubmissionCache[month];
    const wbSubmitted = sub && typeof sub === 'object' && sub.submitted;
    const dl = document.createElement('div');
    dl.className = 'card'; dl.setAttribute('data-no-export', '1'); dl.setAttribute('data-dl-end', '1');
    dl.style.cssText = 'padding:14px 18px; margin:18px 0 0;';
    dl.innerHTML = `<b>⬇ Download the records — ${esc(month)}</b><p class="cap" style="margin:3px 0 10px;">The total above, or any one assessment's full report.</p><div style="display:flex; gap:8px; flex-wrap:wrap;"></div>`;
    const btns = dl.lastElementChild;
    const mk = (label, fn, why) => { const b = document.createElement('button'); b.className = btns.children.length ? 'btn' : 'btn-primary'; if(!btns.children.length) b.style.cssText = 'width:auto; padding:9px 16px;'; b.textContent = label; if(why){ b.disabled = true; b.title = why; } else b.onclick = fn; btns.appendChild(b); };
    mk(whole ? '⬇ Collective report — ' + termInfo.label + ' (PDF)' : '⬇ Total — every CG (PDF)', () => exportReportPdf(report, (whole ? 'Assessment — collective report — ' : 'Assessment total — every CG — ') + month + ' — ' + (myClassInfo.class_name || ''), (whole ? 'assessment-' + termInfo.label.replace(/\s+/g, '').toLowerCase() : 'assessment-total-' + month.toLowerCase())), codes.length ? '' : 'Nothing recorded yet');
    if(whole){ container.appendChild(dl); return; } // the collective report is the one download for a whole term
    mk('⬇ Classroom Observation', downloadObservationAssessmentPdf);
    mk('⬇ Workbook', () => downloadWorkbookMonthReportPdf(books, month), wbSubmitted ? '' : 'Submit this month\u2019s workbook marks in Assessment → Workbook first');
    mk('⬇ Pre-Test', downloadPreTestClassPdf);
    mk('⬇ Fine & Gross Motor', downloadMotorAssessmentPdf);
    container.appendChild(dl);
  }
  // =================================================================
  // ASSESSMENT DASHBOARD → OVERVIEW — from real saved marks only (the
  // same CG totals as Assessment → ▤ Assessment records → Σ Total).
  // =================================================================
  // =================================================================
  // ACTIVITY COVERAGE — per competency, term-wise (styled table)
  // =================================================================
  function covNum(code){ var m = /^C-(\d+)\.(\d+)$/.exec(code); return m ? [Number(m[1]), Number(m[2])] : [999, 999]; }
  function covCell(v, strong){
    var box = 'border:1px solid #8FB3A0; text-align:center; padding:7px 10px; width:110px; font-variant-numeric:tabular-nums;';
    if (!v) return '<td style="' + box + ' color:#A7B3AD;">0</td>';
    return '<td style="' + box + (strong ? ' font-weight:800;' : '') + '">' + v + '</td>';
  }
  function covTable(title, d){
    if (!d || d.status !== 'success') return '<p class="cap" style="color:#9B1C1C;">' + esc(title) + ': could not load the activity counts.</p>';
    var wbs = d.workbooks || [];
    var codes = Object.keys(d.rows || {}).sort(function (a, b) { var x = covNum(a), y = covNum(b); return x[0] - y[0] || x[1] - y[1]; });
    var byCg = {}; codes.forEach(function (c) { var n = covNum(c)[0]; (byCg[n] = byCg[n] || []).push(c); });
    var tot = function (r, keys) { return keys.reduce(function (s, k) { return s + (r[k] || 0); }, 0); };
    var wbKeys = wbs.map(function (w) { return 'wb:' + w; });
    var th = 'border:1px solid #8FB3A0; padding:9px 10px; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:#3E5A4C; background:#EAF4EF; position:sticky; top:0; z-index:1; vertical-align:middle;';
    var thR = th + ' text-align:center; width:110px;';
    var head = '<thead>' +
      '<tr><th rowspan="2" style="' + th + ' text-align:left; width:200px;">CG / Competency</th>' +
      (wbs.length ? '<th colspan="' + wbs.length + '" style="' + th + ' text-align:center;">Workbook assessment</th>' : '') +
      '<th rowspan="2" style="' + thR + '">Workbook total</th>' +
      '<th rowspan="2" style="' + thR + '">Classroom Observation</th>' +
      '<th rowspan="2" style="' + thR + '">Pre-Test</th>' +
      '<th rowspan="2" style="' + thR + '">Total activities</th></tr>' +
      '<tr>' + wbs.map(function (w) { return '<th style="' + thR + ' font-weight:600; text-transform:none; letter-spacing:0; font-size:12px;">' + esc(w) + '</th>'; }).join('') + '</tr>' +
      '</thead>';
    var body = '';
    Object.keys(byCg).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
      var sum = {}; var kids = byCg[n];
      kids.forEach(function (c) { var r = d.rows[c] || {}; Object.keys(r).forEach(function (k) { sum[k] = (sum[k] || 0) + r[k]; }); });
      var sumTotal = tot(sum, wbKeys) + (sum.obs || 0) + (sum.pre || 0);
      body += '<tr style="background:#F1F8F4;">' +
        '<td style="border:1px solid #8FB3A0; padding:9px 10px; font-weight:800; color:#17513C; width:200px;">CG-' + n + '</td>' +
        wbKeys.map(function (k) { return covCell(sum[k] || 0, true); }).join('') +
        covCell(tot(sum, wbKeys), true) + covCell(sum.obs || 0, true) + covCell(sum.pre || 0, true) + covCell(sumTotal, true) + '</tr>';
      kids.forEach(function (c) {
        var r = d.rows[c] || {};
        var rt = tot(r, wbKeys) + (r.obs || 0) + (r.pre || 0);
        body += '<tr onmouseover="this.style.background=\'#FAFCFB\'" onmouseout="this.style.background=\'\'">' +
          '<td style="border:1px solid #8FB3A0; padding:7px 10px 7px 26px; color:#24352C; width:200px;">' + esc(c) + '</td>' +
          wbKeys.map(function (k) { return covCell(r[k] || 0, false); }).join('') +
          covCell(tot(r, wbKeys), false) + covCell(r.obs || 0, false) + covCell(r.pre || 0, false) + covCell(rt, false) + '</tr>';
      });
    });
    if (!body) body = '<tr><td colspan="' + (wbs.length + 5) + '" style="border:1px solid #C9DCD2; padding:14px; color:#6B7770;">No activities are set for this term yet.</td></tr>';
    return '<div style="margin:14px 0 6px; display:flex; align-items:center; gap:10px;"><span style="font-size:14px; font-weight:800; color:#17513C;">' + esc(title) + '</span>' +
      '<span style="font-size:12px; color:#6B7770;">' + codes.length + ' competencies · ' + Object.keys(byCg).length + ' CGs</span></div>' +
      '<div style="overflow:auto; max-height:70vh; border:1px solid #8FB3A0; border-radius:10px; background:#fff;">' +
      '<table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:13px; color:#1D2B22;">' + head + '<tbody>' + body + '</tbody></table></div>';
  }
  function activityCoverageInto(container){
    var level = (typeof workbookLevelFromClassName === 'function') ? workbookLevelFromClassName() : 'Sr KG';
    var card = document.createElement('div');
    card.className = 'card'; card.setAttribute('data-no-export', '1'); card.style.cssText = 'padding:18px 20px; margin-top:6px; border-radius:14px;';
    card.innerHTML = '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap;">' +
      '<div><div style="font-size:16px; font-weight:800; color:#17513C;">Activity coverage</div>' +
      '<div style="font-size:12.5px; color:#5B6B62; margin-top:3px;">How many activities assess each competency, by workbook, Classroom Observation and Pre-Test. Motor is assessed at CG level and is not counted here.</div></div>' +
      '<div style="font-size:12px; color:#5B6B62; background:#F3F8F5; border:1px solid #D5E3DB; border-radius:8px; padding:6px 10px;">0 = no activity yet</div></div>' +
      '<div data-cov-body style="color:#6B7770; font-size:13px; padding:14px 0;">Loading…</div>';
    container.appendChild(card);
    var url = function (term) { return 'backend/assessment/coverage/get_activity_coverage.php?level=' + encodeURIComponent(level) + '&term=' + term + (window.location.search ? '&' + window.location.search.slice(1) : ''); };
    Promise.all([fetch(url('TERM_1'), { cache: 'no-store' }).then(function (r) { return r.json(); }),
                 fetch(url('TERM_2'), { cache: 'no-store' }).then(function (r) { return r.json(); })])
      .then(function (ds) {
        card.querySelector('[data-cov-body]').innerHTML = covTable('Term 1 · June to October', ds[0]) + covTable('Term 2 · November to March', ds[1]);
      })
      .catch(function () { card.querySelector('[data-cov-body]').innerHTML = '<p style="color:#9B1C1C; font-size:13px;">Could not load the activity counts.</p>'; });
  }

  function renderAssessmentOverviewReal(container){
    if(!ensurePupilsLoadedFor(container, () => renderAssessmentDashboard())) return;
    const period = dashPeriodGet(), month = period.label + (dashSource === 'all' ? '' : ' · ' + dashSourceLabel()); // period + which assessment (js/assess-periods.js)
    if (dashSource === 'coverage') { container.appendChild(dashSourceBar()); activityCoverageInto(container); return; }
    container.appendChild(mdSec('Assessment dashboard — ' + month, '<span class="reqs">REP-01…07</span>'));
    const bar = document.createElement('div'); bar.className = 'fbar'; bar.setAttribute('data-no-export', '1'); bar.style.marginBottom = '14px';
    bar.innerHTML = '<div class="ctl"><label>Period</label>' + dashPeriodSelectHtml() + '</div>';
    bar.querySelector('select').onchange = e => dashPeriodChange(e.target.value);
    container.appendChild(bar);
    container.appendChild(dashSourceBar()); // All assessments · Classroom Observation · Workbook · Pre-Test · Fine & Gross Motor
    const T = computeCgTotalsPeriod(period, () => renderAssessmentDashboard());
    if(T.loading){ container.appendChild(attNote('Loading the saved assessments for ' + month + '…')); return; }
    const report = document.createElement('div');
    report.style.cssText = 'display:flex; flex-direction:column; gap:20px;'; // even space between the tiles and every card
    container.appendChild(report);
    const all = dashSourceInclude(); // only the chosen assessment, or all of them
    const cgs = T.codes.map(c => { const tot = cgRowTotal(T.rows[c], all); return { code: c, tot, L: cgLevel(tot.b, tot.p, tot.a), items: [...T.rows[c].items] }; }).filter(x => x.L);
    if(!cgs.length){
      report.appendChild(attNote('No data available — no assessment has been recorded for ' + month + ' yet. Grade children in Assessment (Classroom Observation, Workbook, Pre-Test, Fine & Gross Motor, Viva) and this dashboard fills in from what is saved.'));
      return;
    }
    const grand = cgs.reduce((a, x) => ({ b: a.b + x.tot.b, p: a.p + x.tot.p, a: a.a + x.tot.a }), { b: 0, p: 0, a: 0 });
    const G = cgLevel(grand.b, grand.p, grand.a);
    const beginners = cgs.filter(x => x.L.letter === 'B').sort((x, y) => x.L.avg - y.L.avg);
    const levelText = L => L.letter === 'A' ? 'Advanced' : L.letter === 'P' ? 'Proficient' : 'Beginner';
    const grid = document.createElement('div'); grid.className = 'g g4';
    grid.appendChild(mdTile('Class level', levelText(G), 'average ' + G.avg + ' of 3', gradePill(G.letter, 'average ' + G.avg), 'REP-01'));
    grid.appendChild(mdTile('At Proficient or above', G.pctPA, '% of all marks', mdPill(grand.b + grand.p + grand.a + ' marks', 'neu'), 'REP-02'));
    grid.appendChild(mdTile('CGs assessed', cgs.length, 'with saved marks', mdPill(cgs.filter(x => x.L.letter !== 'B').length + ' at P or A', 'good'), 'REP-03'));
    grid.appendChild(mdTile('CGs needing attention', beginners.length, 'at Beginner level', beginners.length ? mdPill('Plan support', 'crit') : mdPill('None', 'good'), 'REP-04'));
    report.appendChild(grid);
    // Every CG with its B · P · A totals across all assessments (colour-coded) — js/grade-scale.js
    const ct = document.createElement('div'); ct.innerHTML = gradeTotalsTable(cgs, grand, cgLevel);
    report.appendChild(mdCard('CG totals — ' + month, 'Every assessment\u2019s marks for each CG added together: Classroom Observation, Workbook, Pre-Test and Fine & Gross Motor. Several activities on the same CG all count.', ct));
    const kt = document.createElement('div'); kt.innerHTML = dashSource === 'pretest' ? '<p class="cap" style="margin:0;">Pre-Test is saved as class counts for now, so it has no child-by-child totals here. Its CG levels are in the CG totals above.</p>' : gradeChildrenTable(realPupilsCache, T.children || {}, cgLevel, dashSource === 'all' ? null : dashSource); // each child's own totals (js/grade-scale.js)
    report.appendChild(mdCard('Each child — totals, ' + month, 'Each child\u2019s own marks added up across every CG (Classroom Observation, Workbook and Fine & Gross Motor). Open “CG by CG” to see the levels behind it. Pre-Test is a class count, so it is in the CG totals above but not here.', kt));
const src = [['pretest', 'Pre-Test (baseline)', 'marks (class counts)'], ['observation', 'Classroom Observation', 'marks'], ['workbook', 'Workbook', 'child marks'], ['motor', 'Fine & Gross Motor', 'ratings']];
    const recWrap = document.createElement('div');
    recWrap.innerHTML = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Assessment</th><th>Recorded for ' + esc(month) + '</th></tr></thead><tbody>'
      + src.map(([k, label, unit]) => `<tr><td style="text-align:left;"><b>${esc(label)}</b></td><td>${T.recorded[k] ? T.recorded[k] + ' ' + unit : '<span class="dim">No data available</span>'}</td></tr>`).join('') + '</tbody></table></div>';
    report.appendChild(mdCard('What has been recorded', 'Only saved marks are counted — nothing is estimated. A mark is one child on one item (Pre-Test is a class count, so each child counted is one mark). Pre-Test counts are kept on this device; the others are in the database.', recWrap));
    const bWrap = document.createElement('div');
    bWrap.innerHTML = beginners.length
      ? '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">CG</th><th style="text-align:left;">From</th><th>B · P · A</th><th>Avg</th><th>At P or above</th></tr></thead><tbody>'
        + beginners.map(x => `<tr><td style="text-align:left;"><b>${esc(cgDisplayCode(x.code))}</b></td><td style="text-align:left;" class="cap">${esc(x.items.slice(0, 3).join(' · '))}</td><td>${x.tot.b} · ${x.tot.p} · ${x.tot.a}</td><td>${x.L.avg}</td><td>${x.L.pctPA}%</td></tr>`).join('') + '</tbody></table></div>'
      : '<p class="cap" style="margin:0;">No CG is at Beginner level this month.</p>';
    report.appendChild(mdCard('CGs at Beginner level', 'Mostly B — the average is in the Beginner band. The full list of every CG is in Assessment → ▤ Assessment records → Σ Total.', bWrap));
    container.appendChild(reportDownloadBar(() => report, 'Assessment dashboard — ' + month + ' — ' + (myClassInfo.class_name || ''), 'assessment-dashboard-' + month.toLowerCase()));
  }
  // =================================================================
  // CHILD RECORD — one child, from real saved data only.
  // =================================================================
  var childRecordName = null;
  function renderChildRecordReal(selectedName){
    const container = document.getElementById('childrecord-body');
    container.innerHTML = '';
    const rerender = () => renderChildRecordReal(childRecordName);
    if(!ensurePupilsLoadedFor(container, rerender)) return;
    if(!realPupilsCache.length){ container.appendChild(attNote('No data available — there are no children on this class\u2019s roll yet.')); return; }
    const pupil = realPupilsCache.find(p => p.name === selectedName) || realPupilsCache.find(p => p.name === childRecordName) || realPupilsCache[0];
    childRecordName = pupil.name;
    const idx = realPupilsCache.indexOf(pupil);
    const bar = document.createElement('div'); bar.className = 'fbar'; bar.setAttribute('data-no-export', '1');
    bar.innerHTML = `<div class="ctl"><label>Child</label><select style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px; min-width:240px;"></select></div>
      <div class="ctl"><label>Month</label><select style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>
      <div class="grow" style="flex:1;"></div><div class="cap">Roll ${idx + 1} of ${realPupilsCache.length}${pupil.register_no ? ' · Reg. no. ' + esc(pupil.register_no) : ''} · ${esc(myClassInfo.class_name || '')} · ${esc(myClassInfo.school_name || '')}</div>`;
    const [cSel, mSel] = bar.querySelectorAll('select');
    realPupilsCache.forEach(p => { const o = document.createElement('option'); o.value = p.name; o.textContent = (p.register_no ? p.register_no + ' ' : '') + p.name; if(p === pupil) o.selected = true; cSel.appendChild(o); });
    cSel.onchange = () => renderChildRecordReal(cSel.value);
    // the months of the term chosen at the top (Term 1: June–October, Term 2: November–March)
    const termMonthsHere = assessTermMonths();
    if(!termMonthsHere.includes(currentWorkbookMonth)) currentWorkbookMonth = termMonthsHere[0];
    termMonthsHere.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; if(m === currentWorkbookMonth) o.selected = true; mSel.appendChild(o); });
    mSel.onchange = () => { currentWorkbookMonth = mSel.value; rerender(); };
    bar.style.marginBottom = '24px';
    container.appendChild(bar);
    const month = currentWorkbookMonth, level = workbookLevelFromClassName();
    const months = attAcademicMonths();
    const loaded = [
      ensureObservationThemesLoaded(level, month, rerender),
      ensureObservationAssessmentLoaded(month, rerender),
      ensureMotorAssessmentLoaded(rerender),
      attEnsureMonths(months, () => { const b = document.getElementById('childrecord-body'); if(b && !b.classList.contains('hidden')) rerender(); })
    ];
    if(!familyRecordsLoaded) ensureFamilyRecordsLoaded(rerender);
    if(loaded.some(x => !x)){
      container.appendChild(attNote('Loading ' + pupil.name + '\u2019s record…'));
      return;
    }
    const report = document.createElement('div');
    container.appendChild(report);
    report.appendChild(mdSec('Child Record — ' + pupil.name, '<span class="reqs">REP-09 · FDB-01</span>'));
    // Attendance, month by month
    const att = months.map(o => { const s = attMonthStats(o.y, o.m); const c = s.children.find(x => x.id === pupil.id) || { present: 0, absent: 0, marked: 0, pct: null, longest: 0 }; return { o, c }; });
    const yearP = att.reduce((a, x) => a + x.c.present, 0), yearM = att.reduce((a, x) => a + x.c.marked, 0);
    // Observation this month
    const themes = observationThemesCache[level + '|' + month];
    const marks = (observationAssessmentCache[month] || {})[pupil.id] || {};
    const obsRows = Array.isArray(themes) ? themes.flatMap(t => t.items.map(it => ({ theme: t.name, cg: it.cg_code, v: marks[it.id] || '' }))) : [];
    const obsMarked = obsRows.filter(r => r.v);
    const obsL = cgLevel(obsMarked.filter(r => r.v === 'E').length, obsMarked.filter(r => r.v === 'P').length, obsMarked.filter(r => r.v === 'A').length);
    // Motor
    const motorLetters = type => MOTOR_MONTHS.map(m => ({ m, r: motorLetter(motorRating(pupil.id, type, m)) }));
    const motorAny = ['fine', 'gross'].some(t => motorLetters(t).some(x => x.r));
    // Family
    const fam = familyRecords[pupil.name];
    const g1 = fam && Array.isArray(fam.guardianNames) ? (fam.guardianNames.find(g => g.primary) || fam.guardianNames[0]) : null;
    const lv = L => L ? gradePill(L.letter, 'average ' + L.avg) : mdPill('No data available', 'neu');
    const grid = document.createElement('div'); grid.className = 'g g4';
    grid.appendChild(mdTile('Attendance this year', yearM ? Math.round(yearP / yearM * 1000) / 10 : '—', yearM ? '% of ' + yearM + ' days marked' : 'No data available', yearM ? mdPill(yearP + ' present', 'neu') : mdPill('No data available', 'neu'), 'REP-09'));
    grid.appendChild(mdTile('Observation — ' + month, obsMarked.length, obsRows.length ? 'of ' + obsRows.length + ' CG items graded' : 'No data available', lv(obsL), 'ASM-O1'));
    grid.appendChild(mdTile('Fine & Gross Motor', ['fine', 'gross'].reduce((a, t) => a + motorLetters(t).filter(x => x.r).length, 0), 'ratings, June–October', motorAny ? mdPill('Recorded', 'good') : mdPill('No data available', 'neu'), 'ASM-M1'));
    grid.appendChild(mdTile('Family profile', fam ? 'On file' : '—', fam ? (g1 ? (g1.name || '') : '') : 'No data available', fam ? mdPill('Profile', 'good') : mdPill('No data available', 'neu'), 'FAM-01'));
    report.appendChild(grid);
    const tbl = (head, rows) => { const w = document.createElement('div'); w.innerHTML = '<div class="report-table-wrap"><table class="report-table"><thead><tr>' + head.map(h => `<th style="text-align:${h[1] || 'center'};">${esc(h[0])}</th>`).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>'; return w; };
    report.appendChild(mdCard('Attendance, month by month', null, tbl([['Month', 'left'], ['Present'], ['Absent'], ['Days marked'], ['Attendance']],
      att.map(({ o, c }) => c.marked ? `<tr><td style="text-align:left;"><b>${esc(attMonthLabel(o, true))}</b></td><td>${c.present}</td><td>${c.absent}</td><td>${c.marked}</td><td>${c.pct}%</td></tr>`
        : `<tr><td style="text-align:left;"><b>${esc(attMonthLabel(o, true))}</b></td><td colspan="4" class="dim">No data available</td></tr>`))));
    report.appendChild(obsRows.length
      ? mdCard('Classroom Observation — ' + month, 'B Beginner · P Proficient · A Advanced · — not graded', tbl([['Topic', 'left'], ['CG'], ['Mark']],
          obsRows.map(r => `<tr><td style="text-align:left;">${esc(r.theme)}</td><td>${esc(r.cg)}</td><td>${r.v ? recordsLetterPill(TIER_INFO[r.v].letter, TIER_INFO[r.v].c) : '<span class="dim">—</span>'}</td></tr>`)))
      : attNote('Classroom Observation — No data available for ' + month + '.'));
    report.appendChild(motorAny
      ? mdCard('Fine & Gross Motor', 'B Beginner · P Proficient · A Advanced · — not rated', tbl([['Sheet', 'left'], ...MOTOR_MONTHS.map(m => [m])],
          ['fine', 'gross'].map(t => `<tr><td style="text-align:left;"><b>${t === 'fine' ? 'Fine Motor' : 'Gross Motor'}</b></td>${motorLetters(t).map(x => `<td>${x.r || '<span class="dim">—</span>'}</td>`).join('')}</tr>`)))
      : attNote('Fine & Gross Motor — No data available.'));
    report.appendChild(fam
      ? mdCard('Family', null, tbl([['Parent / guardian', 'left'], ['Relation'], ['Phone']],
          fam.guardianNames.map(g => `<tr><td style="text-align:left;"><b>${esc(g.name || '—')}</b></td><td>${esc(g.rel || '—')}</td><td>${esc(g.phone || '—')}</td></tr>`)))
      : attNote('Family — No data available. Add the family profile in Family & Parents.'));
    renderChildFeedbackSection(report, pupil.name); // the teacher's own feedback notes (real)
    // Even spacing between every block of the record (tiles, tables, notes).
    Array.from(report.children).forEach((el, i) => { el.style.marginTop = i === 0 ? '0' : (el.classList.contains('sec') ? '30px' : '20px'); el.style.marginBottom = '0'; });
    const firstGrid = report.querySelector(':scope > .g'); if(firstGrid) firstGrid.style.marginTop = '14px';
    container.appendChild(reportDownloadBar(() => report, 'Child Record — ' + pupil.name, 'child-record-' + pupil.name.replace(/\s+/g, '-').toLowerCase()));
  }
  // ---- Assessment records: one topic / workbook / sheet at a time ----
  // A dropdown instead of every section stacked on one long page. The
  // choice is remembered while the page is open. Downloads still cover
  // everything.
  var recordsPickState = {};
  function recordsPick(container, key, label, options){
    let cur = recordsPickState[key];
    if(!options.some(o => o[0] === cur)) cur = options[0] ? options[0][0] : '__all';
    recordsPickState[key] = cur;
    const bar = document.createElement('div');
    bar.className = 'fbar'; bar.setAttribute('data-no-export', '1'); bar.style.marginBottom = '14px';
    bar.innerHTML = `<div class="ctl"><label>${esc(label)}</label><select style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px; min-width:280px; max-width:100%;">${options.map(o => `<option value="${esc(o[0])}" ${o[0] === cur ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`;
    bar.querySelector('select').onchange = e => { recordsPickState[key] = e.target.value; assessmentRecordsRefresh(); };
    // On the records screen the Month card is already there: put this picker INSIDE it, next to Month,
    // so Month + Topic / Workbook / Sheet are one single card (not two stacked cards).
    const host = window.__arxFilterBar;
    if(host && host.parentNode && host.parentNode === container.parentNode){
      host.appendChild(bar.querySelector('.ctl'));
    } else {
      container.appendChild(bar);
    }
    return cur;
  }
  // =================================================================
  // IMPORT CARDS — one look everywhere: three equal buttons
  //   📷 Scan a photo · 📥 Import a file · ⬇ Download sheet
  // on Class Attendance, Admissions and every Assessment tab.
  // =================================================================
  (function importButtonStyle(){
    if(document.getElementById('impBtnStyle')) return;
    const st = document.createElement('style'); st.id = 'impBtnStyle';
    st.textContent = '.imp-btns{display:flex;gap:8px;flex-wrap:wrap;align-items:stretch;}'
      + '.imp-btn{box-sizing:border-box;min-width:170px;height:42px;padding:0 16px;margin:0;border-radius:8px;border:1px solid var(--border);background:#fff;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;line-height:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;white-space:nowrap;}'
      + '.imp-btn.primary{background:var(--primary);border-color:var(--primary);color:#fff;}'
      + '.imp-btn:hover{filter:brightness(.96);}'
      + '.imp-card{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}'
      + '.imp-card .imp-text{flex:1;min-width:260px;}'
      + '@media (max-width:700px){.imp-btns{width:100%;}.imp-btn{flex:1 1 100%;min-width:0;}}';
    (document.head || document.documentElement).appendChild(st);
  })();


function importButtonsHtml(photoCall, fileCall, manualCall, downloadCall, downloadLabel){
  // No button is green to begin with; the one the teacher clicks turns green (impSetActive).
  const b = (call, label) => `<button type="button" class="imp-btn" onclick="impSetActive(this); ${call}">${label}</button>`;
  return `
    <div class="imp-btns">
      ${b(photoCall, '📷 Scan a photo')}
      ${b(fileCall, '📥 Import a file')}
      ${b(manualCall, '✍ Enter manually')}
      ${b(downloadCall, '↓ ' + (downloadLabel || 'Download template'))}
    </div>
  `;
}
// The clicked import button turns green; the others on the same card go back to white.
function impSetActive(btn){
  const row = btn && btn.closest('.imp-btns'); if(!row) return;
  row.querySelectorAll('.imp-btn').forEach(x => { x.classList.toggle('primary', x === btn); x.setAttribute('aria-pressed', x === btn ? 'true' : 'false'); });
}


  // The import panel that is on screen (Class Attendance or Admissions).
  function siPanel(){
    const all = Array.from(document.querySelectorAll('[data-si-panel]'));
    const shown = el => { for(let n = el; n && n !== document.body; n = n.parentElement){ if(n.classList.contains('hidden') || n.style.display === 'none' || (window.getComputedStyle && getComputedStyle(n).display === 'none')) return false; } return true; };
    return all.find(shown) || all[0] || document.getElementById('smartImportPanel');
  }
  // ---- 📷 a photo of a register (attendance) or a class list (admissions) ----
  function smartImportPhoto(mode){
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.setAttribute('capture', 'environment');
    input.onchange = async () => {
      const file = input.files[0]; if(!file) return;
      const out = siPanel();
      try{
        out.innerHTML = '<p class="sub">Getting the photo reader ready…</p>';
        await assessLoadTesseract();
        const canvas = await assessPrepareImage(file);
        const result = await Tesseract.recognize(canvas, 'eng', { logger: m => { if(m.status === 'recognizing text') out.innerHTML = `<p class="sub">Reading the photo… ${Math.round((m.progress || 0) * 100)}%</p>`; } });
        const lines = ((result.data && result.data.lines) || []).map(l => l.text).filter(t => t && t.trim());
        const grid = mode === 'roll' ? photoClassListGrid(lines) : photoRegisterGrid(lines);
        photoGridSource = 'photo'; photoGridSheetName = null;
        if(grid.length < 2) throw new Error('No names could be read from this photo. Take it again in good light, straight on, with the whole page in view.');
        renderPhotoGridEditor(grid, mode);
      } catch(err){ out.innerHTML = `<div class="au-error">${esc(err.message || err)}</div>`; }
    };
    input.click();
  }
  // Register photo → [header, ...rows]: name, then one mark per day.
  function photoRegisterGrid(lines){
    const markRe = /^(p|a|h|pr|ab|✓|✔|✗|✘|x|-|\.)$/i;
    let header = null; const rows = [];
    lines.forEach(line => {
      const toks = line.replace(/[|\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
      if(!toks.length) return;
      const nameAt = toks.findIndex(t => /^name$/i.test(t));
      const nums = toks.filter(t => /^([1-9]|[12]\d|3[01])$/.test(t));
      if(!header && (nameAt >= 0 || nums.length >= 5)){
        header = ['Student Name', ...(nameAt >= 0 ? toks.slice(nameAt + 1) : nums)];
        return;
      }
      // Marks = the short items at the end of the line (1–2 characters). A
      // misread one (e.g. "8" for B, "4" for A) is kept and shown in red to fix.
      let k = toks.length;
      while(k > 1 && toks[k - 1].length <= 2) k--;
      const marks = toks.slice(k);
      if(!marks.length || marks.filter(t => markRe.test(t)).length < Math.max(1, marks.length / 2)) return; // not a child row
      const name = toks.slice(0, k).join(' ');
      if(SI_TOTAL_WORDS.test(splitRegisterFromName(name).name)) return; // a "Total" line
      rows.push([name, ...marks.map(t => t.toUpperCase())]);
    });
    if(!rows.length) return [];
    const width = Math.max(...rows.map(r => r.length));
    if(!header) header = ['Student Name', ...Array.from({ length: width - 1 }, (_, i) => String(i + 1))];
    while(header.length < width) header.push(String(header.length));
    return [header, ...rows];
  }
  // Class-list photo → [header, ...rows]: one name per line (a register number in front is kept).
  function photoClassListGrid(lines){
    const rows = lines.map(l => l.replace(/[|\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(l => /[a-z]{2,}/i.test(l) && !/^(sr\.?|roll|no\.?|name|student name|class|register)\b/i.test(l))
      .map(l => [l]);
    return rows.length ? [['Student Name'], ...rows] : [];
  }
  // Edit every cell of what the photo gave, then continue to the usual preview.
  var photoGrid = null, photoGridMode = null, photoGridSheetName = null, photoGridSource = 'photo';
  function renderPhotoGridEditor(grid, mode){
    photoGrid = grid; photoGridMode = mode;
    const out = siPanel();
    const isRoll = mode === 'roll';
    const markOk = v => /^(P|A|H|)$/i.test(String(v || '').trim());
    let t = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 4px; font-weight:600;">${photoGridSource === 'manual' ? '✍ Enter the marks — nothing is saved yet.' : 'Step 1 — check what was read from the photo. Nothing is saved yet.'}</p>
      <p class="cap" style="margin:0 0 10px;">${photoGridSource === 'manual' ? 'Type P, A or H for each child and day (leave blank if not marked); marks already saved are filled in.' : 'Correct any name or mark — photos, especially handwriting, are often misread.'} ${isRoll ? 'One child per row; a register number in front of the name is kept.' : 'The top row is the day of the month for each column; marks are P, A or H (leave blank if not marked). Red cells are not P, A or H.'} Untick a row to leave it out.</p>
      <div class="report-table-wrap"><table class="report-table" style="min-width:${isRoll ? 420 : 760}px;"><thead><tr><th>Use</th>`;
    grid[0].forEach((h, j) => { t += `<th>${j === 0 ? 'Child' : `<input value="${esc(h)}" onchange="photoGrid[0][${j}] = this.value" style="width:44px; padding:3px; text-align:center; border:1px solid var(--border); border-radius:5px;">`}</th>`; });
    t += '</tr></thead><tbody>';
    grid.slice(1).forEach((r, i) => {
      t += `<tr><td><input type="checkbox" checked onchange="photoGrid[${i + 1}].__skip = !this.checked" /></td>`;
      for(let j = 0; j < grid[0].length; j++){
        const v = r[j] == null ? '' : r[j];
        t += j === 0
          ? `<td style="text-align:left;"><input value="${esc(v)}" onchange="photoGrid[${i + 1}][0] = this.value" style="width:100%; min-width:180px; padding:5px 7px; border:1px solid var(--border); border-radius:6px;"></td>`
          : `<td><input value="${esc(v)}" maxlength="2" onchange="photoGrid[${i + 1}][${j}] = this.value.toUpperCase(); this.style.borderColor = /^(P|A|H|)$/i.test(this.value.trim()) ? '' : 'var(--crit,#d03b3b)';" style="width:40px; padding:4px; text-align:center; border:1px solid ${markOk(v) ? 'var(--border)' : 'var(--crit,#d03b3b)'}; border-radius:5px;"></td>`;
      }
      t += '</tr>';
    });
    t += `</tbody></table></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
        <button class="imp-btn primary" onclick="photoGridContinue()">Next — preview</button>
        <button class="imp-btn" onclick="photoGrid = null; siPanel().innerHTML = '<p class=&quot;cap&quot;>Import cancelled — nothing was saved.</p>';">Cancel</button>
      </div></div>`;
    out.innerHTML = t;
  }
  function photoGridContinue(){
    if(!photoGrid) return;
    const rows = photoGrid.filter((r, i) => i === 0 || (!r.__skip && String(r[0] || '').trim()));
    if(rows.length < 2){ alert('Keep at least one child row.'); return; }
    if(photoGridMode === 'roll'){ renderSmartClassListStep('the photo', rows.map(r => r.slice(0, 1))); return; }
    // An attendance grid: hand it to the same reader as a file (Step 1 there asks for the month).
    smartImport = { fileName: photoGridSource === 'manual' ? 'the sheet you typed' : 'the photo', sheets: [siAnalyseSheet(photoGridSheetName || 'Photo', rows)], addMissing: !(Array.isArray(realPupilsCache) && realPupilsCache.length), markHolidays: true };
    photoGridSheetName = null; photoGridSource = 'photo';
    if(!smartImport.sheets[0].include){ siPanel().innerHTML = '<div class="au-error">The day numbers across the top could not be read — fix them in the first row (1, 2, 3 …) and try again.</div>'; renderPhotoGridEditor(photoGrid, photoGridMode); return; }
    renderSmartImportMapping();
  }
  // =================================================================
  // ASSESSMENT TERMS — Term 1 (June–October) and Term 2 (November–March).
  // One choice for the whole Assessment section: every tab's month
  // pickers (Observation From/To, Workbook, Assessment records) only
  // offer the chosen term's months, and the Pre-Test keeps a separate
  // tally for each term. It opens on the term we are in.
  // =================================================================
  const ASSESS_TERMS = {
    1: { label: 'Term 1', span: 'June – October', months: ['June', 'July', 'August', 'September', 'October'] },
    2: { label: 'Term 2', span: 'November – March', months: ['November', 'December', 'January', 'February', 'March'] }
  };
  var assessmentTerm = null;
  function currentAssessTerm(){
    if(window.__assessTermOverride && assessmentTerm) return assessmentTerm;
    if(window.getPortalTerm) return window.getPortalTerm();   // the one term for the whole portal
    const m = new Date().getMonth(); // 0 = Jan
    return (m >= 5 && m <= 9) ? 1 : 2;  // June–October → Term 1; otherwise Term 2
  }
  function assessTermMonths(){ return ASSESS_TERMS[currentAssessTerm()].months; }
  // Keep the shared month inside the chosen term.
  function syncMonthToTerm(){
    const ms = assessTermMonths();
    if(!ms.includes(currentWorkbookMonth)){
      const now = new Date().toLocaleDateString('en-GB', { month: 'long' });
      currentWorkbookMonth = ms.includes(now) ? now : ms[0];
    }
    if(typeof obsRangeFrom !== 'undefined'){
      if(!ms.includes(obsRangeFrom)) obsRangeFrom = currentWorkbookMonth;
      if(!ms.includes(obsRangeTo)) obsRangeTo = currentWorkbookMonth;
    }
  }