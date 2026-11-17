var assessmentDashboardTab = 'overview';
  function switchAssessmentDashboardTab(tab){
    assessmentDashboardTab = tab;
    renderAssessmentDashboard();
  }
  // ---------------------------------------------------------------
  // ASSESSMENT RECORDS (Assessment Dashboard → ▤ Assessment records)
  // — every assessment's saved record and its report download, in one
  // place. Read-only: grading still happens in Assessment. Everything
  // here reads the same real stores the entry screens save to
  // (observation / workbook / motor from the database; Pre-Test from
  // its class tally).
  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // REPORT PDF EXPORTER — one shared way to download any report on
  // screen. It reads the report exactly as rendered (headings, tiles,
  // bar rows, list rows and tables), so a download can never show a
  // different number from the screen. Buttons, inputs and charts are
  // left out; chart numbers are already in the tables and tiles.
  // ---------------------------------------------------------------
  function pdfSafeText(s){
    // jsPDF's built-in font only covers Latin-1 plus a few symbols — drop
    // emoji and other glyphs it would print as garbage.
    return String(s == null ? '' : s)
      .replace(/₹/g, 'Rs ')
      .replace(/[\u2713\u2714]/g, '@@TICK@@')
      .replace(/[^\x20-\x7E\xA0-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u00B7]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  // Loads html2canvas the first time it is needed (cdnjs is already allowed on this page)
  function loadHtml2Canvas(){
    if(window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      sc.onload = () => resolve(window.html2canvas);
      sc.onerror = () => reject(new Error('html2canvas did not load'));
      document.head.appendChild(sc);
    });
  }

  // Captures the on-screen report into an A4 PDF (several pages if needed).
  async function exportCapturedPdf(rootEl, title, fileStem){
    if(typeof window.jspdf === 'undefined'){ alert('PDF export did not load — check the internet and try again.'); return; }
    let h2c;
    try { h2c = await loadHtml2Canvas(); }
    catch(e){ alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const card = rootEl.querySelector('.hpc-page') || rootEl;
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed; left:-10000px; top:0; width:1120px; background:#ffffff;';
    const copy = card.cloneNode(true);
    copy.querySelectorAll('button, svg, script, style, [data-no-export], .hpc-hint').forEach(el => el.remove());
    copy.querySelectorAll('.hpc-sec-body').forEach(b => { b.style.display = 'block'; });
    copy.querySelectorAll('input, textarea').forEach(el => { const sp = document.createElement('span'); sp.textContent = el.value || ''; el.replaceWith(sp); });
    copy.querySelectorAll('select').forEach(el => { const sp = document.createElement('span'); sp.textContent = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : ''; el.replaceWith(sp); });
    holder.appendChild(copy);
    document.body.appendChild(holder);
    try {
      const canvas = await h2c(copy, { scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: 1120, logging: false });
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210, pageH = 297, margin = 8;
      const imgW = pageW - margin * 2;
      const pxPerMm = canvas.width / imgW;
      const sliceH = Math.floor((pageH - margin * 2) * pxPerMm);
      let y = 0, first = true;
      while(y < canvas.height){
        const h = Math.min(sliceH, canvas.height - y);
        const part = document.createElement('canvas');
        part.width = canvas.width; part.height = h;
        part.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if(!first) doc.addPage();
        doc.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, h / pxPerMm);
        first = false; y += h;
      }
      doc.save((fileStem || 'report') + '.pdf');
    } catch(err){
      console.error('PDF capture failed:', err);
      alert('Could not make the PDF: ' + (err && err.message ? err.message : err));
    } finally {
      holder.remove();
    }
  }

  // A tick in a table cell is drawn as a green check mark (ZapfDingbats), not as text.
  function tickCell(d){
    if(d.section !== 'body' || !d.cell || !Array.isArray(d.cell.text)) return;
    if(!d.cell.text.join('').includes('@@TICK@@')) return;
    d.cell.text = ['4'];
    d.cell.styles.font = 'ZapfDingbats';
    d.cell.styles.fontStyle = 'normal';
    d.cell.styles.fontSize = 11;
    d.cell.styles.textColor = [22, 130, 70];
    d.cell.styles.halign = 'center';
  }
  function exportReportPdf(rootEl, title, fileStem){
    if(typeof window.jspdf === 'undefined'){
      alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.');
      return;
    }
    if(!rootEl){ alert('Nothing to export on this screen yet.'); return; }
    // The Student / School report: capture the report as it looks on screen (same green design as the Excel)
    if(rootEl.querySelector('.hpc-page') || rootEl.classList.contains('hpc-page')){ return exportCapturedPdf(rootEl, title, fileStem); }
    const clone = rootEl.cloneNode(true);
    // Keep typed values, drop controls, charts and anything marked no-export.
    clone.querySelectorAll('input, textarea').forEach(el => { const s = document.createElement('span'); s.textContent = el.value || ''; el.replaceWith(s); });
    clone.querySelectorAll('select').forEach(el => { const s = document.createElement('span'); s.textContent = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : ''; el.replaceWith(s); });
    clone.querySelectorAll('button, svg, script, style, [data-no-export]').forEach(el => el.remove());
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    // Title band in the portal green, the same as the report banner on screen
    doc.setFillColor(29, 158, 117);
    doc.rect(0, 0, 297, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(pdfSafeText(title), 14, 12);
    doc.setFontSize(9);
    doc.text(pdfSafeText(assessmentPdfHeaderLine() + ' · ' + (myClassInfo.school_name || '') + ' · generated ' + new Date().toLocaleString()), 14, 20);
    doc.setTextColor(33, 33, 33);
    let y = 34;
    const need = (h) => { if(y + h > 195){ doc.addPage(); y = 15; } };
    const heading = (text, size) => {
      const t = pdfSafeText(text); if(!t) return;
      need(10); doc.setFontSize(size); doc.text(t, 14, y); y += size >= 12 ? 7 : 6;
    };
    const table = (opts) => {
      // competency tables (Code, Competency, then the five categories) share the same column widths on every page
      const headTxt = opts && opts.html && opts.html.querySelector('thead') ? opts.html.querySelector('thead').textContent : '';
      const compTable = /Pre-Test/.test(headTxt) && /Viva/.test(headTxt);
      const widths = compTable ? { columnStyles: { 0: { cellWidth: 62 }, 2: { cellWidth: 58 }, 3: { cellWidth: 58 }, 4: { cellWidth: 58 }, 5: { cellWidth: 58 }, 6: { cellWidth: 58 } } } : {};
      doc.autoTable(Object.assign({ startY: y, styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [29, 158, 117] }, margin: { left: 14, right: 14 }, didParseCell: tickCell }, widths, opts));
      y = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : y) + 8;
    };
    let pendingTiles = [], pendingBars = [], pendingRows = [];
    const flush = () => {
      if(pendingTiles.length){ table({ head: [['Measure', 'Value', 'Status', 'Basis']], body: pendingTiles }); pendingTiles = []; }
      if(pendingBars.length){ table({ head: [['Item', 'Value']], body: pendingBars }); pendingBars = []; }
      if(pendingRows.length){ table({ head: [['Item', 'Detail', 'Status']], body: pendingRows }); pendingRows = []; }
    };
    const walk = (el) => {
      for(const child of Array.from(el.children)){
        const tag = child.tagName;
        if(tag === 'TABLE'){
          flush();
          // Clean every cell's text before handing the table over.
          child.querySelectorAll('th, td').forEach(c => {
            // a dropdown cell: its summary, then each item on its own line (not run together)
            const det = c.querySelector('details');
            if(det){
              const sum = det.querySelector('summary');
              const items = Array.from(det.querySelectorAll('div div')).map(x => pdfSafeText(x.textContent));
              const brief = !items.length && det.querySelector(':scope > div') ? [pdfSafeText(det.querySelector(':scope > div').textContent)] : [];
              c.textContent = [pdfSafeText(sum ? sum.textContent : '')].concat(brief, items).filter(Boolean).join('\n');
              return;
            }
            c.textContent = pdfSafeText(c.textContent);
          });
          table({ html: child });
          continue;
        }
        if(child.classList.contains('tile')){
          const q = sel => { const n = child.querySelector(sel); return n ? pdfSafeText(n.textContent) : ''; };
          pendingTiles.push([q('.k'), q('.v'), q('.d'), q('.f')]);
          continue;
        }
        if(child.classList.contains('hbar-row')){
          const label = child.querySelector('.hbar-row-label'), count = child.querySelector('.hbar-count');
          pendingBars.push([pdfSafeText(label ? label.textContent : ''), pdfSafeText(count ? count.textContent : '')]);
          continue;
        }
        if(child.classList.contains('row') && child.parentElement && child.parentElement.classList.contains('list')){
          const t = child.querySelector('.t');
          const b = t && t.querySelector('b'), sp = t && t.querySelector('span');
          const rest = child.lastElementChild && child.lastElementChild !== t ? child.lastElementChild.textContent : '';
          pendingRows.push([pdfSafeText(b ? b.textContent : (t ? t.textContent : '')), pdfSafeText(sp ? sp.textContent : ''), pdfSafeText(rest)]);
          continue;
        }
        if(tag === 'H1' || tag === 'H2'){ flush(); heading(child.textContent, 13); continue; }
        if(tag === 'H3' || tag === 'H4'){ flush(); heading(child.textContent, 11); continue; }
        if(child.children.length) walk(child);
      }
    };
    walk(clone);
    flush();
    doc.save((fileStem || 'report') + '-' + todayKey() + '.pdf');
  }
  // ---------------------------------------------------------------
  // DOWNLOADS ALWAYS AT THE END — one rule for the whole portal.
  // Any element marked data-dl-end="1" (every report's download bar)
  // is kept as the LAST item of the report it sits in, even when more
  // of that report is added after it (screens often load in steps).
  // ---------------------------------------------------------------
  (function keepDownloadsAtEnd(){
    const settle = (parent) => {
      if(!parent || !parent.children) return;
      const bars = Array.from(parent.children).filter(el => el.getAttribute && el.getAttribute('data-dl-end') === '1');
      if(!bars.length) return;
      const last = parent.lastElementChild;
      if(bars.length === 1 && last === bars[0]) return;
      const tail = Array.from(parent.children).slice(-bars.length);
      if(tail.every((el, i) => el === bars[i])) return;
      bars.forEach(b => parent.appendChild(b)); // same order, moved to the end
    };
    const obs = new MutationObserver(list => {
      const seen = new Set();
      list.forEach(m => { if(m.type === 'childList' && !seen.has(m.target)){ seen.add(m.target); settle(m.target); } });
    });
    const start = () => obs.observe(document.body, { childList: true, subtree: true });
    if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
    window.settleDownloadBars = settle;
  })();
  // A "⬇ Download report (PDF)" bar, kept at the END of its report.
  // getRoot is a function so the export reads the report as it is at
  // the moment of the click, not when the button was drawn.
  function reportDownloadBar(getRoot, title, fileStem, note){
    const bar = document.createElement('div');
    bar.setAttribute('data-no-export', '1');
    bar.setAttribute('data-dl-end', '1');
    bar.style.cssText = 'display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:18px 0 6px; padding-top:14px; border-top:1px solid var(--border);';
    const btn = document.createElement('button');
    btn.textContent = '⬇ Download report (PDF)';
    btn.style.cssText = 'padding:8px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
    btn.onclick = () => exportReportPdf(getRoot(), title, fileStem);
    bar.appendChild(btn);
    if(note){ const n = document.createElement('span'); n.className = 'cap'; n.textContent = note; bar.appendChild(n); }
    return bar;
  }
  // Flags have their own shape (one card per flag), so they get a
  // straight table rather than the generic reader.
  function downloadFlagsPdf(year, month){
    if(typeof window.jspdf === 'undefined'){ alert('PDF export did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const ym = year + '-' + String(month + 1).padStart(2, '0');
    const list = flagsRecords.filter(f => f.dateRaised && f.dateRaised.slice(0, 7) === ym).sort((a, b) => a.dateRaised.localeCompare(b.dateRaised));
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const monthName = new Date(year, month, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    doc.setFontSize(14); doc.text('Flags & Notifications — ' + monthName, 14, 15);
    doc.setFontSize(9); doc.text(pdfSafeText(assessmentPdfHeaderLine() + ' · generated ' + new Date().toLocaleString()), 14, 21);
    doc.autoTable({
      startY: 27,
      head: [['Raised', 'By', 'Kind', 'What was noted', 'Reply due', 'Status', 'My reply']],
      body: list.length ? list.map(f => [f.dateRaised, pdfSafeText(f.raisedByName || ''), FLAG_STATES[f.state] ? FLAG_STATES[f.state].label : f.state, pdfSafeText(f.text), f.dueDate || '—',
        f.status === 'replied' ? 'Replied ' + (f.replyDate || '') : f.state === 'observation' ? 'No reply needed' : (f.dueDate && f.dueDate < todayDateKey() ? 'Overdue' : 'Awaiting reply'),
        pdfSafeText(f.replyText || '')]) : [['—', '', '', 'Nothing raised this month.', '', '', '']],
      styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [37, 99, 60] },
      columnStyles: { 3: { cellWidth: 80 }, 6: { cellWidth: 60 } }
    });
    doc.save('flags-' + ym + '-' + todayKey() + '.pdf');
  }
  // Parent Involvement lives in js/render/parent-volunteers.js — add the
  // same download bar to it without editing that file, by wrapping its
  // render function once it exists.
  (function attachParentInvolvementDownload(){
    const wrap = () => {
      if(typeof window.renderParentInvolvement !== 'function' || window.renderParentInvolvement.__withDownload) return false;
      const original = window.renderParentInvolvement;
      const wrapped = function(){
        const out = original.apply(this, arguments);
        const body = document.getElementById('parentinvolvement-body');
        if(body && Array.isArray(realPupilsCache) && !body.querySelector('[data-report-dl]')){
          const bar = reportDownloadBar(() => document.getElementById('parentinvolvement-body'), 'Parent Involvement', 'parent-involvement');
          bar.setAttribute('data-report-dl', '1');
          body.appendChild(bar);
        }
        return out;
      };
      wrapped.__withDownload = true;
      window.renderParentInvolvement = wrapped;
      return true;
    };
    if(!wrap()) window.addEventListener('load', wrap);
  })();
  var assessmentRecordsType = 'total'; // 'total' | 'observation' | 'workbook' | 'pretest' | 'motor'
  function assessmentRecordsRerender(){
    const body = document.getElementById('assessmentdashboard-body');
    if(body && !body.classList.contains('hidden') && assessmentDashboardTab === 'records') renderAssessmentDashboard();
    const ab = document.getElementById('assessment-body');
    if(ab && !ab.classList.contains('hidden') && assessmentEntryType === 'records') renderMonthlyAssessment(monthlyAssessmentTargetEl);
  }
  // The small pointer each entry screen shows where its download used to be.
  function assessmentReportsLink(type){
    // The "report is in the Assessment records tab" note is no longer shown —
    // ▤ Assessment records is already a tab at the top of this screen.
    return document.createDocumentFragment();
  }
  function recordsLetterPill(letter, cls){
    return letter
      ? gradeDot(letter, 22)
      : '<span class="dim">·</span>';
  }
  function recordsDownloadRow(buttons, note){
    const row = document.createElement('div');
    row.className = 'card';
    row.setAttribute('data-no-export', '1');
    row.setAttribute('data-dl-end', '1');
    row.style.cssText = 'padding:14px 18px; margin:18px 0 0; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';
    row.innerHTML = `<div style="flex:1; min-width:220px;"><b>⬇ Download report</b><p class="cap" style="margin:3px 0 0;">${note}</p></div><div style="display:flex; gap:8px; flex-wrap:wrap;"></div>`;
    const btnWrap = row.lastElementChild;
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = b.primary ? 'btn-primary' : 'btn';
      if(b.primary) btn.style.cssText = 'width:auto; padding:9px 16px;';
      btn.textContent = b.label;
      if(b.disabled){ btn.disabled = true; btn.title = b.disabled; }
      else btn.onclick = b.onClick;
      btnWrap.appendChild(btn);
    });
    return row;
  }
  function renderAssessmentRecords(container){
    container.appendChild(mdSec('Assessment records', '<span class="reqs">REP · all instruments</span>'));
    const intro = document.createElement('p');
    intro.className = 'cap'; intro.style.margin = '4px 0 14px';
    intro.textContent = 'What has actually been saved for each assessment, and its report. Grading happens in Assessment — this view is read-only.';
    container.appendChild(intro);
    const typeBar = document.createElement('div'); typeBar.className = 'fbar'; typeBar.style.marginBottom = '14px';
    typeBar.innerHTML = '<div class="ctl"><label>Assessment</label><div style="display:flex; gap:5px; flex-wrap:wrap;" id="recordsTypeChips"></div></div>';
    container.appendChild(typeBar);
    const chips = typeBar.querySelector('#recordsTypeChips');
    [['total', 'Σ Total — every CG'], ['pretest', '📋 Pre-Test'], ['observation', '👁️ Classroom Observation'], ['workbook', '📘 Workbook'], ['motor', '🤸 Fine & Gross Motor']].forEach(([key, label]) => {
      const b = document.createElement('button');
      b.className = 'chip' + (assessmentRecordsType === key ? ' sel' : '');
      b.textContent = label;
      b.onclick = () => { assessmentRecordsType = key; assessmentRecordsRefresh(); };
      chips.appendChild(b);
    });
    // Month picker for the month-scoped instruments — the same shared
    // month the Assessment screens use.
    if(assessmentRecordsType === 'observation' || assessmentRecordsType === 'workbook' || assessmentRecordsType === 'total'){
      const bar = document.createElement('div'); bar.className = 'fbar'; bar.style.marginBottom = '14px';
      bar.innerHTML = '<div class="ctl"><label>Month</label><select id="recordsMonthSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
      container.appendChild(bar);
      const sel = bar.querySelector('#recordsMonthSelect');
      fillRecordsMonthSelect(sel); // part 14: the term's months, plus Whole Term for Σ Total
    }
    const body = document.createElement('div');
    container.appendChild(body);
    if(!ensurePupilsLoadedFor(body, assessmentRecordsRerender)) return;
    if(!['total', 'observation', 'workbook', 'pretest', 'motor'].includes(assessmentRecordsType)) assessmentRecordsType = 'total';
    if(assessmentRecordsType === 'total') renderCgTotalRecords(body); // part 14
    else if(assessmentRecordsType === 'observation') renderObservationRecords(body);
    else if(assessmentRecordsType === 'workbook') renderWorkbookRecords(body);
    else if(assessmentRecordsType === 'pretest') renderPreTestRecords(body);
    else renderMotorRecords(body);
  }
  function recordsErrorCard(container, message, clearFn){
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="card" style="padding:16px;"><p style="margin:0 0 10px;">${esc(message)}</p><button class="btn-primary" style="width:auto; padding:7px 14px;">Retry</button></div>`;
    wrap.querySelector('button').onclick = () => { clearFn(); assessmentRecordsRefresh(); };
    container.appendChild(wrap);
  }
  function renderObservationRecords(container){
    const level = workbookLevelFromClassName();
    const month = currentWorkbookMonth;
    const themesKey = level + '|' + month;
    const themesLoaded = ensureObservationThemesLoaded(level, month, assessmentRecordsRerender);
    const marksLoaded = ensureObservationAssessmentLoaded(month, assessmentRecordsRerender);
    if(typeof observationThemesCache[themesKey] === 'string' && observationThemesCache[themesKey].startsWith('error:')){ recordsErrorCard(container, observationThemesCache[themesKey].slice(6), () => delete observationThemesCache[themesKey]); return; }
    if(typeof observationAssessmentCache[month] === 'string' && observationAssessmentCache[month].startsWith('error:')){ recordsErrorCard(container, observationAssessmentCache[month].slice(6), () => delete observationAssessmentCache[month]); return; }
    if(!themesLoaded || !marksLoaded){ container.appendChild(mdCard(null, 'Loading Classroom Observation…', null)); return; }
    const themes = observationThemesCache[themesKey];
    const marks = observationAssessmentCache[month];
    if(!themes.length){ container.appendChild(mdCard(null, 'No observation themes are scheduled for ' + esc(month) + '.', null)); return; }
    const anyGraded = Object.keys(marks).some(pid => Object.keys(marks[pid] || {}).length);
    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF', primary: true, onClick: downloadObservationAssessmentPdf, disabled: anyGraded ? '' : 'Nothing graded this month yet' },
      { label: '⬇ Excel (.xlsx)', onClick: downloadObservationAssessmentXlsx, disabled: anyGraded ? '' : 'Nothing graded this month yet' }
    ], anyGraded ? 'Every theme graded in ' + esc(month) + ', one table per theme.' : 'Nothing has been graded for ' + esc(month) + ' yet.'));
    const obsPick = recordsPick(container, 'obs|' + month, 'Topic', themes.map(t => [t.name, t.name + ' (' + t.items.length + ' CG)']).concat([['__all', 'All topics, one below another (' + themes.length + ')']]));
    themes.filter(t => obsPick === '__all' || t.name === obsPick).forEach(t => {
      let graded = 0;
      let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Child</th>'
        + t.items.map(it => `<th style="text-align:center;" title="${esc(it.goal_text || '')}">${esc(it.cg_code)}</th>`).join('') + '</tr></thead><tbody>';
      assessmentPupilNames().forEach((name, idx) => {
        const pm = marks[realPupilsCache[idx].id] || {};
        table += `<tr><td style="text-align:left;"><b>${esc(name)}</b></td>` + t.items.map(it => {
          const v = pm[it.id]; if(v) graded++;
          return `<td style="text-align:center;">${recordsLetterPill(v ? TIER_INFO[v].letter : '', v ? TIER_INFO[v].c : '')}</td>`;
        }).join('') + '</tr>';
      });
      table += '</tbody></table></div>';
      const wrap = document.createElement('div'); wrap.innerHTML = table;
      const card = mdCard(t.name, graded + ' of ' + (t.items.length * assessmentPupilNames().length) + ' grades recorded · B Beginner · P Proficient · A Advanced · · not graded', wrap);
      card.style.marginBottom = '16px';
      container.appendChild(card);
    });
  }
  function renderWorkbookRecords(container){
    const level = workbookLevelFromClassName();
    const month = currentWorkbookMonth;
    const booksKey = level + '|' + month;
    const booksLoaded = ensureWorkbookCompetenciesLoaded(level, month, assessmentRecordsRerender);
    const tallyLoaded = ensureWorkbookCompetencyTallyLoaded(month, assessmentRecordsRerender);
    if(myClassInfo.class_id) ensureWorkbookMonthSubmissionLoaded(myClassInfo.class_id, month, assessmentRecordsRerender);
    if(typeof workbookCompetenciesCache[booksKey] === 'string' && workbookCompetenciesCache[booksKey].startsWith('error:')){ recordsErrorCard(container, workbookCompetenciesCache[booksKey].slice(6), () => delete workbookCompetenciesCache[booksKey]); return; }
    if(typeof workbookCompetencyTallyCache[month] === 'string' && workbookCompetencyTallyCache[month].startsWith('error:')){ recordsErrorCard(container, workbookCompetencyTallyCache[month].slice(6), () => delete workbookCompetencyTallyCache[month]); return; }
    if(!booksLoaded || !tallyLoaded){ container.appendChild(mdCard(null, 'Loading Workbook Assessment…', null)); return; }
    const books = workbookCompetenciesCache[booksKey];
    const tally = workbookCompetencyTallyCache[month] || {};
    const sub = workbookMonthSubmissionCache[month];
    const isSubmitted = sub && typeof sub === 'object' && sub.submitted;
    if(!books.length){ container.appendChild(mdCard(null, 'No workbooks are set up for ' + esc(level) + ' yet.', null)); return; }
    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF — every workbook', primary: true, onClick: () => downloadWorkbookMonthReportPdf(books, month), disabled: isSubmitted ? '' : 'Submit this month\u2019s marks in Assessment → Workbook first' }
    ], isSubmitted
      ? '✓ ' + esc(month) + ' submitted' + (sub.submitted_by_name ? ' by ' + esc(sub.submitted_by_name) : '') + ' — every workbook in one PDF.'
      : '🔒 ' + esc(month) + ' isn\u2019t submitted yet — submit it in Assessment → Workbook Assessment to unlock the report.'));
    const wbPick = recordsPick(container, 'wb|' + month, 'Workbook', books.filter(b => b.competencies.length).map(b => [b.name, b.name]).concat([['__all', 'All workbooks, one below another']]));
    books.filter(b => wbPick === '__all' || b.name === wbPick).forEach(book => {
      if(!book.competencies.length) return;
      let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">CG</th><th style="text-align:left;">Competency</th><th style="text-align:center;"><span class="gd gd-B" style="width:20px; height:20px; font-size:10px;">B</span></th><th style="text-align:center;"><span class="gd gd-P" style="width:20px; height:20px; font-size:10px;">P</span></th><th style="text-align:center;"><span class="gd gd-A" style="width:20px; height:20px; font-size:10px;">A</span></th></tr></thead><tbody>';
      let rowsWithData = 0;
      book.competencies.forEach(c => {
        const t = tally[c.id] || { count_e: 0, count_p: 0, count_a: 0 };
        if(t.count_e + t.count_p + t.count_a > 0) rowsWithData++;
        table += `<tr><td class="dim" style="text-align:left;">${esc(c.cg_code)}</td><td style="text-align:left; white-space:normal;">${esc(c.competency_text)}</td><td style="text-align:center;">${t.count_e}</td><td style="text-align:center;">${t.count_p}</td><td style="text-align:center;">${t.count_a}</td></tr>`;
      });
      table += '</tbody></table></div>';
      const wrap = document.createElement('div'); wrap.innerHTML = table;
      const card = mdCard(book.name, rowsWithData + ' of ' + book.competencies.length + ' competencies have counts for ' + esc(month) + ' · class-wide counts, not per child', wrap);
      card.style.marginBottom = '16px';
      container.appendChild(card);
    });
  }
  function renderPreTestRecords(container){
    ensurePreTestTallyForClass();
    const anyTallied = Object.values(preTestTallyEntries).some(t => (t.count_e + t.count_p + t.count_a) > 0);
    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF', primary: true, onClick: downloadPreTestClassPdf, disabled: anyTallied ? '' : 'Nothing recorded yet' }
    ], anyTallied ? 'The class baseline across all ' + WEEKLY_ASSESSMENT_ACTIVITIES.length + ' activities.' : 'Nothing has been recorded for the Pre-Test yet.'));
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>#</th><th style="text-align:left;">Type</th><th style="text-align:left;">Activity</th><th style="text-align:left;">CG</th><th style="text-align:center;"><span class="gd gd-B" style="width:20px; height:20px; font-size:10px;">B</span></th><th style="text-align:center;"><span class="gd gd-P" style="width:20px; height:20px; font-size:10px;">P</span></th><th style="text-align:center;"><span class="gd gd-A" style="width:20px; height:20px; font-size:10px;">A</span></th><th style="text-align:center;">Absent</th><th style="text-align:center;">Avg</th></tr></thead><tbody>';
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      const t = preTestTallyEntries[String(idx)] || { count_e: 0, count_p: 0, count_a: 0 };
      const marked = t.count_e + t.count_p + t.count_a;
      const avg = marked ? Math.round((t.count_a*3 + t.count_p*2 + t.count_e) / marked * 100) / 100 : null;
      table += `<tr><td class="dim">${idx + 1}</td><td class="dim" style="text-align:left;">${esc(a.type)}</td><td style="text-align:left; white-space:normal;">${esc(a.activity)}</td><td class="dim" style="text-align:left;">${esc(a.cg)}</td><td style="text-align:center;">${t.count_e}</td><td style="text-align:center;">${t.count_p}</td><td style="text-align:center;">${t.count_a}</td><td style="text-align:center;" class="dim">${Math.max(0, assessmentPupilNames().length - marked)}</td><td style="text-align:center;">${avg === null ? '—' : avg}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    container.appendChild(mdCard('Pre-Test — class baseline', 'Class-wide counts per activity (B Beginner · P Proficient · A Advanced). Absent = no mark: the child was absent and has not completed it — not counted in Avg. Avg = the average score (B lowest, A highest).', wrap));
  }
  function renderMotorRecords(container){
    if(typeof motorAssessmentCache === 'string' && motorAssessmentCache.startsWith('error:')){ recordsErrorCard(container, motorAssessmentCache.slice(6), () => { motorAssessmentCache = null; }); return; }
    if(!ensureMotorAssessmentLoaded(assessmentRecordsRerender)){ container.appendChild(mdCard(null, 'Loading Fine & Gross Motor…', null)); return; }
    let anyRated = false;
    realPupilsCache.forEach(p => ['fine', 'gross'].forEach(t => MOTOR_MONTHS.forEach(m => { if(motorRating(p.id, t, m)) anyRated = true; })));
    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF — both sheets', primary: true, onClick: downloadMotorAssessmentPdf, disabled: anyRated ? '' : 'Nothing rated yet' }
    ], anyRated ? 'Fine Motor and Gross Motor sheets, June to October, with teacher notes.' : 'No child has been rated yet.'));
    const cls = { G: 'good', Y: 'warn', R: 'crit' };
    const motorPick = recordsPick(container, 'motor', 'Sheet', [['fine', '✋ Fine Motor'], ['gross', '🏃 Gross Motor'], ['__all', 'Both sheets, one below another']]);
    ['fine', 'gross'].filter(t => motorPick === '__all' || t === motorPick).forEach(type => {
      let rated = 0;
      let table = '<div class="report-table-wrap"><table class="report-table" style="min-width:900px;"><thead><tr><th style="text-align:left;">Roll</th><th style="text-align:left;">Child</th>'
        + MOTOR_MONTHS.map(m => `<th style="text-align:center; white-space:normal;" title="${esc(MOTOR_ACTIVITIES[type][m].detail)}">${esc(m)}<br><span style="font-weight:600; text-transform:none; letter-spacing:0;">${esc(MOTOR_ACTIVITIES[type][m].title)}</span></th>`).join('')
        + '<th style="text-align:left;">Teacher notes</th></tr></thead><tbody>';
      realPupilsCache.forEach((p, i) => {
        table += `<tr><td class="dim" style="text-align:left;">${i + 1}</td><td style="text-align:left;"><b>${esc(p.name)}</b></td>` + MOTOR_MONTHS.map(m => {
          const r = motorRating(p.id, type, m); if(r) rated++;
          return `<td style="text-align:center;">${recordsLetterPill(motorLetter(r), r ? cls[r] : '')}</td>`;
        }).join('') + `<td style="text-align:left; white-space:normal;" class="dim">${esc(motorNote(p.id, type)) || '—'}</td></tr>`;
      });
      table += '</tbody></table></div>';
      const wrap = document.createElement('div'); wrap.innerHTML = table;
      const card = mdCard(type === 'fine' ? '✋ Fine Motor' : '🏃 Gross Motor', rated + ' of ' + (realPupilsCache.length * MOTOR_MONTHS.length) + ' ratings recorded · B Beginner · P Proficient · A Advanced', wrap);
      card.style.marginBottom = '16px';
      container.appendChild(card);
    });
  }
  // Assessment records → My Class weekly ratings (read-only; rated in My Class).
  var recordsMyClassWeek = null; // null = current week
  function renderMyClassRecords(container){
    const week = recordsMyClassWeek === null ? currentWeekNum : recordsMyClassWeek;
    const firstWeek = (typeof WEEKS !== 'undefined' && WEEKS.length) ? WEEKS[0].w : 1;
    const weekInfo = (typeof WEEKS !== 'undefined') ? WEEKS.find(w => w.w === week) : null;
    const picker = document.createElement('div');
    picker.setAttribute('data-no-export', '1');
    picker.style.cssText = 'display:flex; align-items:center; gap:10px; margin:0 0 12px; flex-wrap:wrap;';
    picker.innerHTML = `<button class="btn" ${week <= firstWeek ? 'disabled' : ''}>‹ Previous week</button>
      <div><b>Week ${week}</b>${weekInfo ? ' · ' + esc(weekInfo.theme) + ' <span class="dim">(' + esc(weekInfo.dates) + ')</span>' : ''}</div>
      <button class="btn" ${week >= currentWeekNum ? 'disabled' : ''}>Next week ›</button>`;
    const [prevB, nextB] = picker.querySelectorAll('button');
    prevB.onclick = () => { recordsMyClassWeek = week - 1; assessmentRecordsRefresh(); };
    nextB.onclick = () => { recordsMyClassWeek = week + 1; assessmentRecordsRefresh(); };
    container.appendChild(picker);
    if(!myClassInfo.class_id){ container.appendChild(mdCard(null, 'Loading your class info…', null)); return; }
    const status = childActivityRatingsStatus[week];
    if(status === undefined) fetchChildActivityRatings(week);
    if(status === undefined || status === 'loading'){ container.appendChild(mdCard(null, 'Loading this week\u2019s ratings…', null)); return; }
    if(status === 'error'){ recordsErrorCard(container, 'Could not load this week\u2019s ratings from the server.', () => { delete childActivityRatingsStatus[week]; }); return; }
    const weekRatings = childActivityRatings[week] || {};
    const report = document.createElement('div');
    let rated = 0;
    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Child</th>'
      + DOMAINS.map(d => `<th style="text-align:center; white-space:normal;">${esc(d.label)}<br><span class="dim" style="font-weight:400; font-size:11px;">${esc(d.cg || '')}</span></th>`).join('')
      + '<th style="text-align:center;">Rated</th><th style="text-align:center;">P or A</th></tr></thead><tbody>';
    realPupilsCache.forEach(p => {
      const r = weekRatings[p.id] || {};
      const n = DOMAINS.filter(d => r[d.key]).length; rated += n;
      const pa = DOMAINS.filter(d => r[d.key] === 'P' || r[d.key] === 'A').length;
      table += `<tr><td style="text-align:left;"><b>${esc(p.name)}</b></td>` + DOMAINS.map(d => `<td style="text-align:center;">${recordsLetterPill(r[d.key] ? TIER_INFO[r[d.key]].letter : '', r[d.key] ? TIER_INFO[r[d.key]].c : '')}</td>`).join('')
        + `<td style="text-align:center;">${n ? n + ' / ' + DOMAINS.length : '—'}</td><td style="text-align:center;">${n ? pa + ' of ' + n : '—'}</td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    report.appendChild(mdSec('My Class — weekly activity ratings, Week ' + week, ''));
    report.appendChild(mdCard(null, rated + ' of ' + (realPupilsCache.length * DOMAINS.length) + ' ratings recorded · B Beginner · P Proficient · A Advanced · · not rated', wrap));
    container.appendChild(recordsDownloadRow([
      { label: '⬇ PDF', primary: true, onClick: () => exportReportPdf(report, 'My Class — weekly activity ratings, Week ' + week, 'myclass-ratings-week' + week), disabled: rated ? '' : 'Nothing rated this week yet' }
    ], rated ? 'Every child against every activity area for Week ' + week + '.' : 'Nothing has been rated for Week ' + week + ' yet.'));
    container.appendChild(report);
  }
