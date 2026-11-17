/* =========================================================================
   js/workbook-records.js — Assessment records → Workbook, and its PDF
   -------------------------------------------------------------------------
   Workbook is marked child by child, per activity (Workbook tab). The
   records view and "PDF — every workbook" still read the OLD class-count
   list ("competencies" with B / P / A counts typed in per class), which
   the Sr KG books (Sopanika, Uvach …) don't have — so the records view
   showed nothing but the download box, and the PDF came out empty.

   Both now use the real marks, the same way the Workbook tab does:
     • per book: "Pages 15–25 · 14 activities · 120 of 168 marks recorded"
     • CG summary: CG · activities · B · P · A · total · class level
       (activities on the same CG add up; class level = average of B 1 /
       P 2 / A 3, the same rule as everywhere else)
     • every child: one B / P / A per activity, and the child's own totals
   Blank = not assessed — never counted as Beginner.

   Replaces renderWorkbookRecords() and downloadWorkbookMonthReportPdf()
   by name. Loads after the part files (teacher.html).
   ========================================================================= */
(function(){
  'use strict';
  if(typeof renderWorkbookRecords !== 'function') return;

  const LETTER = { E: 'B', P: 'P', A: 'A' };
  const pageNo = p => String(p.page_number).replace(/\.0$/, '');

  // One book's activities in page order, with how each is labelled.
  function activitiesOf(book){
    const per = {};
    book.pages.forEach(p => { const k = pageNo(p); per[k] = (per[k] || 0) + 1; });
    return book.pages.slice()
      .sort((a, b) => (+a.page_number - +b.page_number) || ((a.activity_no || 1) - (b.activity_no || 1)))
      .map(p => { const pg = pageNo(p), many = per[pg] > 1, act = p.activity_no || 1;
        return { id: p.id, page: pg, act, cg: String(p.cg_code || '').trim(), title: String(p.activity_title || '').trim(),
                 label: 'Page ' + pg + (many ? ' · Act ' + act : ''), short: pg + (many ? '·' + act : '') }; });
  }
  function pageRange(acts){
    const ps = [...new Set(acts.map(a => +a.page))].sort((a, b) => a - b);
    return !ps.length ? '' : ps.length === 1 ? 'Page ' + ps[0] : 'Pages ' + ps[0] + '\u2013' + ps[ps.length - 1];
  }
  // Everything the view and the PDF need for one book.
  function bookSummary(book, kids, marks){
    const acts = activitiesOf(book);
    const byCg = {}, perChild = {};
    let recorded = 0;
    acts.forEach(a => {
      const g = byCg[a.cg] = byCg[a.cg] || { acts: [], b: 0, p: 0, a: 0 };
      g.acts.push(a.short);
      kids.forEach(k => {
        const v = LETTER[(marks[k.id] || {})[a.id]]; if(!v) return;
        recorded++;
        if(v === 'B') g.b++; else if(v === 'P') g.p++; else g.a++;
        const c = perChild[k.id] = perChild[k.id] || { b: 0, p: 0, a: 0 };
        if(v === 'B') c.b++; else if(v === 'P') c.p++; else c.a++;
      });
    });
    const cgs = Object.keys(byCg).sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
    return { acts, byCg, cgs, perChild, recorded, possible: acts.length * kids.length };
  }
  const levelOf = (b, p, a) => (typeof cgLevel === 'function') ? cgLevel(b, p, a) : null;
  const pill = L => L ? (typeof gradePill === 'function' ? gradePill(L.letter, 'average ' + L.avg) : esc(L.letter)) : '<span class="dim">Not assessed yet</span>';
  const dot = v => v ? (typeof recordsLetterPill === 'function' ? recordsLetterPill(v) : esc(v)) : '<span class="dim">·</span>';
  const heads = () => (typeof gradeHeads === 'function') ? gradeHeads() : '<th>B</th><th>P</th><th>A</th>';

  // ---------------------------------------------------------------------
  // Assessment records → Workbook
  // ---------------------------------------------------------------------
  renderWorkbookRecords = function(container){
    const level = workbookLevelFromClassName(), month = currentWorkbookMonth, key = level + '|' + month;
    const pagesLoaded = ensureWorkbookPagesLoaded(level, month, assessmentRecordsRerender);
    const marksLoaded = ensureWorkbookChildMarksLoaded(month, assessmentRecordsRerender);
    if(myClassInfo.class_id) ensureWorkbookMonthSubmissionLoaded(myClassInfo.class_id, month, assessmentRecordsRerender);
    const pc = workbookPagesCache[key], mc = workbookChildMarksCache[month];
    if(typeof pc === 'string' && pc.startsWith('error:')){ recordsErrorCard(container, pc.slice(6), () => delete workbookPagesCache[key]); return; }
    if(typeof mc === 'string' && mc.startsWith('error:')){ recordsErrorCard(container, mc.slice(6), () => delete workbookChildMarksCache[month]); return; }
    if(!pagesLoaded || !marksLoaded || !Array.isArray(realPupilsCache)){ container.appendChild(mdCard(null, 'Loading Workbook Assessment…', null)); return; }

    const books = (pc || []).filter(b => Array.isArray(b.pages) && b.pages.length);
    if(!books.length){ container.appendChild(mdCard(null, 'No ' + esc(level) + ' workbook pages are scheduled for ' + esc(month) + '.', null)); return; }
    const kids = realPupilsCache, marks = mc || {};
    const sub = workbookMonthSubmissionCache[month], isSubmitted = sub && typeof sub === 'object' && sub.submitted;
    const sums = books.map(b => ({ book: b, s: bookSummary(b, kids, marks) }));
    const anyMarks = sums.some(x => x.s.recorded);

    container.appendChild(recordsDownloadRow([
      { label: '\u2b07 PDF \u2014 every workbook', primary: true, onClick: () => downloadWorkbookMonthReportPdf(books, month),
        disabled: !isSubmitted ? 'Submit this month\u2019s marks in Assessment \u2192 Workbook first' : !anyMarks ? 'No Workbook marks saved for ' + month + ' yet' : '' }
    ], isSubmitted
      ? '\u2713 ' + esc(month) + ' submitted' + (sub.submitted_by_name ? ' by ' + esc(sub.submitted_by_name) : '') + ' \u2014 every workbook in one PDF: CG summary and every child\u2019s marks.'
      : '\ud83d\udd12 ' + esc(month) + ' isn\u2019t submitted yet \u2014 submit it in Assessment \u2192 Workbook to unlock the report.'));

    const pick = recordsPick(container, 'wb|' + month, 'Workbook',
      sums.map(x => [x.book.name, x.book.name + ' \u2014 ' + pageRange(x.s.acts) + ' (' + x.s.recorded + ' of ' + x.s.possible + ' marks)'])
        .concat([['__all', 'All workbooks, one below another (' + books.length + ')']]));

    sums.filter(x => pick === '__all' || x.book.name === pick).forEach(({ book, s }) => {
      const wrap = document.createElement('div');
      // CG summary
      let t = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="min-width:620px;"><thead><tr><th style="text-align:left;">CG</th><th style="text-align:left;">Activities</th>' + heads() + '<th>Total</th><th style="text-align:left;">Class level</th></tr></thead><tbody>';
      s.cgs.forEach(cg => { const g = s.byCg[cg], n = g.b + g.p + g.a;
        t += `<tr><td style="text-align:left;"><b>${esc(cg || '—')}</b></td><td style="text-align:left; white-space:normal;">${esc(g.acts.join(', '))}</td><td>${g.b}</td><td>${g.p}</td><td>${g.a}</td><td>${n}</td><td style="text-align:left;">${pill(n ? levelOf(g.b, g.p, g.a) : null)}</td></tr>`; });
      t += '</tbody></table></div>';
      // every child
      t += '<p class="cap" style="margin:14px 0 6px; font-weight:600;">Every child</p><div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table"><thead><tr><th style="text-align:left; position:sticky; left:0; background:var(--card,#fff);">Child</th>'
        + s.acts.map(a => `<th style="text-align:center; white-space:nowrap;" title="${esc(a.label + ' \u2014 ' + a.cg + (a.title ? ' \u2014 ' + a.title : ''))}">${esc(a.short)}<div class="cap" style="font-weight:400;">${esc(a.cg)}</div></th>`).join('')
        + heads() + '<th style="text-align:left;">Level</th></tr></thead><tbody>';
      kids.forEach(k => { const c = s.perChild[k.id] || { b: 0, p: 0, a: 0 }, n = c.b + c.p + c.a;
        t += `<tr><td style="text-align:left; white-space:nowrap; position:sticky; left:0; background:var(--card,#fff);"><b>${esc(k.name)}</b></td>`
          + s.acts.map(a => `<td style="text-align:center;">${dot(LETTER[(marks[k.id] || {})[a.id]])}</td>`).join('')
          + `<td>${c.b}</td><td>${c.p}</td><td>${c.a}</td><td style="text-align:left;">${pill(n ? levelOf(c.b, c.p, c.a) : null)}</td></tr>`; });
      t += '</tbody></table></div>';
      wrap.innerHTML = t;
      const card = mdCard(book.name + ' \u2014 ' + month,
        pageRange(s.acts) + ' \u00b7 ' + s.acts.length + ' activit' + (s.acts.length === 1 ? 'y' : 'ies') + ' \u00b7 ' + s.recorded + ' of ' + s.possible + ' marks recorded. Activities on the same CG add up. Column headings are page \u00b7 activity (hover for the activity). B Beginner \u00b7 P Proficient \u00b7 A Advanced \u00b7 \u00b7 = not assessed.', wrap);
      card.style.marginBottom = '16px';
      container.appendChild(card);
    });
  };

  // ---------------------------------------------------------------------
  // "PDF — every workbook": the same, one section per book
  // ---------------------------------------------------------------------
  downloadWorkbookMonthReportPdf = function(books, month){
    if(typeof window.jspdf === 'undefined'){ alert('PDF export did not load (no internet reached the CDN) \u2014 try again once you\u2019re online.'); return; }
    const level = workbookLevelFromClassName();
    const list = (Array.isArray(workbookPagesCache[level + '|' + month]) ? workbookPagesCache[level + '|' + month] : []).filter(b => Array.isArray(b.pages) && b.pages.length);
    const marks = (workbookChildMarksCache[month] && typeof workbookChildMarksCache[month] === 'object') ? workbookChildMarksCache[month] : {};
    const kids = Array.isArray(realPupilsCache) ? realPupilsCache : [];
    if(!list.length) throw new Error('The ' + month + ' workbook pages have not loaded yet \u2014 open Assessment \u2192 Workbook for ' + month + ' once, then try again.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const W = doc.internal.pageSize.getWidth();
    const nameEl = document.querySelector('.user-menu .user-name') || document.querySelector('.user-name');
    const who = ((nameEl && nameEl.textContent.trim()) || 'Teacher') + ' \u2014 ' + (myClassInfo.school_name || '') + ' \u00b7 ' + (myClassInfo.class_name || '');
    doc.setFontSize(14); doc.text('Workbook Assessment \u2014 ' + month, 14, 22);
    doc.setFontSize(9); doc.text(who, 14, 28);
    doc.text('B = Beginner \u00b7 P = Proficient \u00b7 A = Advanced \u00b7 empty = not assessed. Class level = average of B 1 / P 2 / A 3.', 14, 33);
    let y = 38;
    const lvl = (b, p, a) => { const L = levelOf(b, p, a); return L ? L.letter + ' (' + L.avg + ')' : '\u2014'; };
    list.forEach((book, bi) => {
      const s = bookSummary(book, kids, marks);
      if(bi > 0){ doc.addPage(); y = 22; }
      doc.setFontSize(12); doc.text(book.name + ' \u2014 ' + pageRange(s.acts) + ' \u2014 ' + s.recorded + ' of ' + s.possible + ' marks recorded', 14, y);
      doc.autoTable({
        startY: y + 3,
        head: [['CG', 'Activities', 'B', 'P', 'A', 'Total', 'Class level']],
        body: s.cgs.map(cg => { const g = s.byCg[cg], n = g.b + g.p + g.a; return [cg || '\u2014', g.acts.join(', '), g.b, g.p, g.a, n, n ? lvl(g.b, g.p, g.a) : 'Not assessed']; }),
        styles: { fontSize: 8 }, headStyles: { fillColor: [37, 99, 60] }, columnStyles: { 1: { cellWidth: 110 } },
      });
      const fs = s.acts.length > 18 ? 6 : s.acts.length > 12 ? 7 : 8;
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 6,
        head: [['Child', ...s.acts.map(a => a.short + '\n' + a.cg), 'B', 'P', 'A', 'Level']],
        body: kids.map(k => { const c = s.perChild[k.id] || { b: 0, p: 0, a: 0 }, n = c.b + c.p + c.a;
          return [k.name, ...s.acts.map(a => LETTER[(marks[k.id] || {})[a.id]] || ''), c.b, c.p, c.a, n ? lvl(c.b, c.p, c.a) : '\u2014']; }),
        styles: { fontSize: fs, halign: 'center', cellPadding: 1.2 }, headStyles: { fillColor: [37, 99, 60], fontSize: fs },
        columnStyles: { 0: { halign: 'left', cellWidth: 36 } },
        tableWidth: W - 28,
        didParseCell: d => { if(d.section !== 'body' || d.column.index === 0 || d.column.index > s.acts.length) return;
          const v = d.cell.raw; if(v === 'B') d.cell.styles.fillColor = [253, 226, 225]; else if(v === 'P') d.cell.styles.fillColor = [255, 244, 204]; else if(v === 'A') d.cell.styles.fillColor = [227, 244, 232]; },
      });
    });
    doc.save('workbook-assessment-' + month.toLowerCase() + '-' + (typeof todayKey === 'function' ? todayKey() : 'report') + '.pdf');
  };
})();
