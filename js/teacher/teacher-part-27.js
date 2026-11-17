function attDownloadCard(title, items){
    const card = document.createElement('div');
    card.className = 'card'; card.setAttribute('data-no-export', '1'); card.setAttribute('data-dl-end', '1');
    card.style.cssText = 'padding:16px 18px; margin-top:22px;';
    card.innerHTML = `<b>${esc(title)}</b><p class="cap" style="margin:3px 0 12px;">PDFs carry the school, class and teacher on every page.</p><div class="imp-btns"></div><div class="att-dl-msg" style="margin-top:8px;"></div>`;
    const row = card.querySelector('.imp-btns'), msg = card.querySelector('.att-dl-msg');
    items.filter(Boolean).forEach(it => {
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'imp-btn' + (it.primary ? ' primary' : ''); b.textContent = it.label; b.style.minWidth = '240px';
      b.onclick = () => {
        msg.innerHTML = '';
        if(!it.noPdf && typeof window.jspdf === 'undefined'){ msg.innerHTML = '<div class="au-error">The PDF maker did not load — check the internet connection, then reload the page (Ctrl + Shift + R).</div>'; return; }
        try { it.run(); msg.innerHTML = '<p class="cap" style="margin:0; color:var(--good,#0a7a0a);">✓ Download started — check your Downloads folder.</p>'; }
        catch(err){ console.error(err); msg.innerHTML = '<div class="au-error">The PDF could not be made: ' + esc(err.message || err) + ' — please send a screenshot of this.</div>'; }
      };
      row.appendChild(b);
    });
    return card;
  }
  // ⬇ The PDF for this page — a download card at the END of the page.
  // (Excel files are only used for importing.)
  function importDownloadCard(kind, type){
    const monthName = new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
    let item;
    if(kind === 'roll') item = { label: '⬇ Class list (PDF)', run: downloadClassListPdf, note: 'Every child on the roll — register no., name, admission date, date of birth, gender.' };
    else if(kind === 'assessment'){
      const run = type === 'observation' ? downloadObservationAssessmentPdf
        : type === 'pretest' ? downloadPreTestClassPdf
        : type === 'motor' ? downloadMotorAssessmentPdf
        : () => {
            const books = workbookCompetenciesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth];
            const sub = workbookMonthSubmissionCache[currentWorkbookMonth];
            if(!(sub && typeof sub === 'object' && sub.submitted)) throw new Error('Submit this month\u2019s workbook marks first — the Workbook report unlocks once the month is submitted.');
            downloadWorkbookMonthReportPdf(books, currentWorkbookMonth);
          };
      item = { label: '⬇ ' + (ASSESS_SMART_TYPES[type] || 'Assessment').replace(/ \(class tally\)/, '') + ' report (PDF)', run, note: 'The full report for this assessment, as saved.' };
    } else item = { label: '⬇ Attendance — ' + monthName + ' (PDF)', run: downloadAttendanceMonthPdf, note: 'Every child\u2019s present, absent, days marked and attendance % for ' + monthName + '.' };
    const card = attDownloadCard('Download', [{ label: item.label, run: item.run, primary: true }]);
    const cap = card.querySelector('.cap'); if(cap) cap.textContent = item.note;
    return card;
  }
  // This month's attendance as a PDF — real marks only.
  function downloadAttendanceMonthPdf(){
    const s = attMonthStats(calendarYear, calendarMonth);
    const monthName = new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'portrait' });
    doc.setFontSize(14); doc.text('Attendance — ' + monthName, 14, 16);
    doc.setFontSize(9); doc.text(pdfSafeText((myClassInfo.class_name || '') + ' · ' + (myClassInfo.school_name || '') + ' · ' + s.markedDays.length + ' of ' + s.schoolDays.length + ' school days marked so far · class attendance ' + (s.classPct === null ? '—' : s.classPct + '%')), 14, 22);
    doc.autoTable({ startY: 27, styles: { fontSize: 8.5, cellPadding: 2 }, headStyles: { fillColor: [37, 99, 60] },
      head: [['Roll', 'Reg. no.', 'Child', 'Present', 'Absent', 'Days marked', 'Attendance']],
      body: s.children.length ? s.children.map(c => [c.roll, c.register_no || '—', pdfSafeText(c.name), c.present, c.absent, c.marked, c.pct === null ? 'No data' : c.pct + '%']) : [['', '', 'No data available', '', '', '', '']] });
    doc.save('attendance-' + calendarYear + '-' + String(calendarMonth + 1).padStart(2, '0') + '.pdf');
  }
  // The class list as a PDF.
  function downloadClassListPdf(){
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'portrait' });
    doc.setFontSize(14); doc.text('Class list — ' + pdfSafeText(myClassInfo.class_name || ''), 14, 16);
    doc.setFontSize(9); doc.text(pdfSafeText((myClassInfo.school_name || '') + ' · ' + (realPupilsCache || []).length + ' children on the roll'), 14, 22);
    doc.autoTable({ startY: 27, styles: { fontSize: 8.5, cellPadding: 2 }, headStyles: { fillColor: [37, 99, 60] },
      head: [['Roll', 'Reg. no.', 'Child', 'Admitted', 'Date of birth', 'Gender']],
      body: (realPupilsCache || []).map((p, i) => [i + 1, p.register_no || '—', pdfSafeText(p.name), p.admitted_date || '—', p.dob || '—', p.gender || '—']) });
    doc.save('class-list-' + (myClassInfo.class_name || 'class').replace(/\s+/g, '') + '.pdf');
  }
  // =================================================================
  // IMPORT A FILE — first the format, then the file; a file that does
  // not fit is refused with an alert (nothing is imported).
  // =================================================================
  const IMPORT_FORMATS = {
    attendance: { title: 'Attendance register', need: ['A column for the children\u2019s names — headed <b>Name</b> or <b>Student Name</b>', 'One column per day — headed <b>1, 2, 3 … 31</b> (or the dates)', 'In each cell: <b>P</b> present · <b>A</b> absent · <b>H</b> holiday (blank = not marked)'],
      optional: 'Register No / Roll No column; one sheet per month, named e.g. <b>July 2026</b> (or you pick the month in the next step).',
      example: [['Register No', 'Student Name', '1', '2', '3', '…'], ['7101', 'Sumaiya Sattar', 'P', 'P', 'A', '…'], ['7102', 'Sohana Abdul Rahim', 'P', 'A', 'P', '…']] },
    roll: { title: 'Class list', need: ['A column for the children\u2019s names — headed <b>Name</b> or <b>Student Name</b>', 'One child per row'],
      optional: '<b>Register No</b>, <b>Admission date</b>, <b>Date of birth</b> (e.g. 2021-05-02 or 02/05/2021), <b>Gender</b>.',
      example: [['Register No', 'Student Name', 'Admission date', 'Date of birth', 'Gender'], ['7101', 'Sumaiya Sattar', '2026-06-15', '2021-05-02', 'Female'], ['7102', 'Sohana Abdul Rahim', '2026-06-15', '2021-03-11', 'Female']] },
    observation: { title: 'Classroom Observation', need: ['A column for the children\u2019s names — headed <b>Name</b> or <b>Student Name</b>', 'One column per CG item of the theme — headed with its code, e.g. <b>C-8.3</b>', 'In each cell: <b>B</b> Beginner · <b>P</b> Proficient · <b>A</b> Advanced (or G / Y / R)'],
      optional: 'Register No column.', example: [['Student Name', 'C-8.3', 'C-8.5'], ['Avani Suryavanshi', 'P', 'A'], ['Darsh Pande', 'B', 'P']] },
    motor: { title: 'Fine & Gross Motor', need: ['A column for the children\u2019s names — headed <b>Name</b> or <b>Student Name</b>', 'One column per month — <b>June, July, August, September, October</b>', 'In each cell: <b>B</b> · <b>P</b> · <b>A</b> (or G / Y / R)'],
      optional: 'Fine and Gross Motor on separate sheets, named Fine / Gross.', example: [['Student Name', 'June', 'July', 'August'], ['Avani Suryavanshi', 'P', 'A', 'A'], ['Darsh Pande', 'B', 'P', 'P']] },
    workbook: { title: 'Workbook (class counts)', need: ['A column with each competency\u2019s <b>CG code</b> (e.g. CG-1.1)', 'Three count columns headed <b>B</b>, <b>P</b>, <b>A</b> — how many children at each level'],
      optional: 'A competency description column.', example: [['cg_code', 'competency', 'B Beginner', 'P Proficient', 'A Advanced'], ['CG-1.1', 'Holds a crayon correctly', '3', '12', '5'], ['CG-1.2', 'Draws lines and circles', '4', '13', '5']] },
    pretest: { title: 'Pre-Test (class counts)', need: ['A column with each <b>activity number</b> (1, 2, 3 …) or activity name', 'Three count columns headed <b>B</b>, <b>P</b>, <b>A</b>'],
      optional: 'An activity description column.', example: [['activity_no', 'activity', 'B Beginner', 'P Proficient', 'A Advanced'], ['1', 'Sorting by colour', '5', '10', '6'], ['2', 'Counting to 10', '7', '9', '5']] },
    viva: { title: 'Viva', need: ['A column with each child\u2019s <b>Roll No</b> (or <b>Student Name</b>)', 'Ten question columns headed <b>Q1</b> to <b>Q10</b> (for example "Q1 · C-1.1")', 'Each question cell <b>B</b>, <b>P</b> or <b>A</b> (leave blank if not assessed)'], optional: 'The Viva template from Download sheet already has these columns.', example: [['Roll No', 'Student Name', 'Q1 · C-1.1', 'Q2 · C-1.4, C-1.6'], ['4101', 'Aashika R. Maurya', 'B', 'P']] }
  };
  function showImportFormat(kind, type){
    const key = kind === 'assessment' ? type : kind;
    const F = IMPORT_FORMATS[key]; if(!F) return;
    const out = kind === 'assessment' ? assessPanel() : siPanel();
    const go = kind === 'assessment' ? `assessSmartChoose('${type}', 'file')` : `smartImportChoose('${kind === 'roll' ? 'roll' : ''}')`;
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px 16px; background:var(--bg);">
      <p style="margin:0 0 6px; font-weight:600;">📋 The file must be in this format — ${esc(F.title)}</p>
      <p class="cap" style="margin:0 0 4px;">An Excel or CSV file (<b>.xlsx, .xls or .csv</b>) with:</p>
      <ul style="margin:4px 0 8px 18px; padding:0; font-size:13px; line-height:1.6;">${F.need.map(n => '<li>' + n + '</li>').join('')}</ul>
      <p class="cap" style="margin:0 0 10px;">Optional: ${F.optional}</p>
      <div class="report-table-wrap"><table class="report-table" style="font-size:12px; min-width:0;"><thead><tr>${F.example[0].map(h => '<th>' + esc(h) + '</th>').join('')}</tr></thead><tbody>${F.example.slice(1).map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('')}</tbody></table></div>
      <p class="cap" style="margin:8px 0 12px;">A file without the required columns — or a different kind of file — is refused, and nothing is imported.</p>
      <div class="imp-btns"><button type="button" class="imp-btn primary" onclick="${go}">📥 Choose the file</button>
        <button type="button" class="imp-btn" onclick="this.closest('[data-si-panel], #assessSmartPanel').innerHTML = '';">Cancel</button></div></div>`;
  }
  // The file itself: only spreadsheets.
  function importFileTypeOk(file){
    if(/\.(xlsx|xls|csv)$/i.test(file.name || '')) return true;
    alert('This file can\u2019t be imported: "' + file.name + '" is not a spreadsheet.\n\nOnly Excel or CSV files (.xlsx, .xls, .csv) can be imported. For a photo of a sheet, use 📷 Scan a photo instead.');
    return false;
  }
  function importRefuse(panel, lines){
    alert('This file can\u2019t be imported:\n\n• ' + lines.join('\n• ') + '\n\nNothing was imported. Check the format and try again.');
    if(panel) panel.innerHTML = '<div class="au-error"><b>File not imported.</b><br>' + lines.map(esc).join('<br>') + '</div>';
  }
  // How many names in a list are on this class's roll.
  function importRollMatches(names){
    const roll = new Set((realPupilsCache || []).map(p => normPupilName(p.name)));
    return names.filter(n => roll.has(normPupilName(splitRegisterFromName(n).name))).length;
  }
  // Assessment: is the analysed file usable? Returns the problems ([] = fine).
  function assessFileProblems(S, type){
    const p = [];
    if(S.tally){
      if(!S.rows.some(r => r.include)) p.push(type === 'pretest' ? 'No column with the Pre-Test activity numbers or names was found.' : 'No column with the competencies\u2019 CG codes (e.g. CG-1.1) was found.');
      if(!S.countsFound) p.push('No count columns headed B, P and A were found.');
    } else {
      if(!S.headerFound) p.push('No heading row was found — the first row should name the columns (e.g. Student Name, ' + (type === 'motor' ? 'June, July …' : 'C-8.3 …') + ').');
      if(!S.nameFound) p.push('No column for the children\u2019s names (headed Name / Student Name).');
      if(!S.columns.length) p.push('No column with B / P / A marks was found.');
      else if(!S.columns.some(c => c.target)) p.push('None of the columns match this tab\u2019s ' + (type === 'motor' ? 'months (June … October).' : (type === 'workbook' ? 'pages for ' : 'CG items for ') + currentWorkbookMonth + ' (e.g. ' + (((assessTargets(type) || [])[0] || {}).cg || String(((assessTargets(type) || [])[0] || {}).label || '').split(' \u2014 ')[0] || '\u2014') + ').'));
      if(S.rows.length && (realPupilsCache || []).length && !S.rows.some(r => r.pupilId)) p.push('None of the names match the children of ' + (myClassInfo.class_name || 'this class') + ' — is this another class\u2019s file?');
      if(!S.rows.length) p.push('No children were found under the headings.');
    }
    return p;
  }
/* ===== teacher-part-14.js ===== */
/* =========================================================================
   teacher-part-14.js — part 14 of 14 of the teacher portal script.
   SMART ASSESSMENT IMPORT — one "📥 Import a file or photo" card on each
   assessment tab (Fine & Gross Motor, Classroom Observation, Workbook,
   Pre-Test). Any layout (.xlsx / .xls / .csv) or a PHOTO of a marksheet
   (read on this device with Tesseract — the photo never leaves it):
     1. reads the sheet or photo into a grid and works out which column
        is the child, which columns are marks, and what each column is
        (a month, a CG item, a competency …);
     2. shows an EDITABLE preview — change any mark, fix a child the
        name didn't match, re-point or skip a column, skip a row;
     3. on Confirm, hands exactly what you see to that assessment's own,
        existing import/save code, which checks it and saves it.
   Marks are read as B / P / A (G/Y/R, E/P/A, Beginner… are converted).
   ========================================================================= */
  var assessSmart = null;
  var smartAssessHandoffRows = null; // read once by readAssessmentFileRows (part 12)
  const ASSESS_SMART_TYPES = { motor: 'Fine & Gross Motor', observation: 'Classroom Observation', workbook: 'Workbook', pretest: 'Pre-Test', viva: 'Viva' };
  // Any mark → 'B' | 'P' | 'A' | '' (blank) | '?' (couldn't read).
  function assessMark(v){
    const t = String(v == null ? '' : v).trim().toUpperCase().replace(/\.$/, '');
    if(!t || t === '-' || t === '—') return '';
    if(['B', 'E', 'R', 'BEGINNER', 'EMERGING', 'RED', 'NEEDS SUPPORT', 'NS', '8'].includes(t)) return 'B'; // "8" is a common OCR misread of B
    if(['P', 'Y', 'PROFICIENT', 'YELLOW', 'DEVELOPING', 'D'].includes(t)) return 'P';
    if(['A', 'G', 'ADVANCED', 'GREEN', 'ACHIEVED', '4'].includes(t)) return 'A';     // "4" is a common OCR misread of A
    return '?';
  }
  function assessNorm(s){ return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9.]/g, ''); }
  function assessCell(v){ return v instanceof Date ? siYmd(v) : String(v == null ? '' : v).trim(); }
  // ---- what each column can be, per assessment ----
  function assessTargets(type){
    if(type === 'motor') return MOTOR_MONTHS.map(m => ({ key: m, label: m + ' — ' + MOTOR_ACTIVITIES[motorSkillType][m].title, match: [m.toLowerCase(), m.slice(0, 3).toLowerCase()] }));
    if(type === 'observation'){
      const themes = observationThemesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth];
      if(!Array.isArray(themes)) return null;
      return themes.flatMap(t => { const seen = {}; return t.items.map(it => { const occ = seen[it.cg_code] = (seen[it.cg_code] || 0) + 1; // the same CG twice in a theme = two items
        return { key: t.name + '|' + it.cg_code + (occ > 1 ? '#' + occ : ''), theme: t.name, cg: it.cg_code, occ, label: it.cg_code + ' — ' + t.name + (occ > 1 ? ' (' + occ + ')' : ''), match: [assessNorm(it.cg_code)] }; }); });
    }
    if(type === 'workbook'){
      const books = workbookPagesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth];
      const book = Array.isArray(books) ? books.find(b => b.name === currentWorkbookCompetencyBookName) : null;
      if(!book || !Array.isArray(book.pages)) return null;
      return book.pages.map(p => {
        const page = String(p.page_number).replace(/\.0$/, '');
        const title = String(p.activity_title || '').trim();
        const label = 'Page ' + page + (p.activity_no ? ' · Act ' + p.activity_no : '') + ' — ' + String(p.cg_code || '') + (title ? ' — ' + title : '');
        return { key: String(p.id), label, match: [assessNorm('page ' + page), assessNorm(String(p.cg_code || '')), assessNorm(title)] };
      });
    }
    if(type === 'pretest') return WEEKLY_ASSESSMENT_ACTIVITIES.map((a, i) => ({ key: String(i + 1), label: (i + 1) + '. ' + a.activity, match: [String(i + 1), assessNorm(a.activity)] }));
    return [];
  }
  const assessIsTally = type => false; // All assessment imports are child-wise B / P / A marks.
  function renderAssessSmartCard(type){
    if(!ASSESS_SMART_TYPES[type]) return null;
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'padding:16px 18px; margin:0 0 18px;';
    const what = assessIsTally(type) ? 'a table of how many children were at B, P and A' : 'a sheet with each child\u2019s B / P / A marks';
    card.innerHTML = `
      <div class="imp-card">
        <div class="imp-text">
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import a file or photo — ${esc(ASSESS_SMART_TYPES[type])}</h3>
          
        </div>
        ${importButtonsHtml(`assessSmartChoose('${type}', 'photo')`, `showImportFormat('assessment', '${type}')`, `assessManualSheet('${type}')`, `assessDownloadSheet('${type}')`, 'Download sheet')}
      </div>
      <div id="assessSmartPanel" style="margin-top:12px; word-break:break-word; overflow-wrap:anywhere;"></div>`;
    if(assessSmart && assessSmart.type === type && assessSmart.grid) setTimeout(renderAssessSmartPreview, 0);
    return card;
  }
  window.renderAssessSmartCard = renderAssessSmartCard;
  function assessPanel(){ return document.getElementById('assessSmartPanel'); }
 function assessSmartChoose(type, source){
  if(type === 'viva'){ // Viva: its own file reader (js/viva.js)
    if(source === 'photo'){ alert('Photo reading is not available for Viva yet. Use Import a file.'); return; }
    const vin = document.createElement('input'); vin.type = 'file'; vin.accept = '.xlsx,.xls';
    vin.onchange = () => { if(vin.files && vin.files[0] && window.vivaImportFile) window.vivaImportFile(vin.files[0]); };
    vin.click(); return;
  }
  if(source === 'photo'){
    openAssessmentCamera(type);
    return;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.csv';
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if(!file) return;
    if(!importFileTypeOk(file)) return;
    const out = assessPanel();
    try{
      const targets = assessTargets(type);
      if(!targets){
        throw new Error(
          'This tab has not finished loading its items — wait a moment and try again.'
        );
      }
      if(typeof XLSX === 'undefined'){
        throw new Error(
          'The spreadsheet reader did not load (no internet reached the CDN).'
        );
      }
      out.innerHTML =
        '<p class="sub">Reading ' + esc(file.name) + '…</p>';
      const wb = XLSX.read(
        await file.arrayBuffer(),
        {
          type: 'array',
          cellDates: true
        }
      );
      const sheets = wb.SheetNames
        .map(n => ({
          name: n,
          grid: XLSX.utils.sheet_to_json(
            wb.Sheets[n],
            {
              header: 1,
              raw: true,
              cellDates: true,
              defval: ''
            }
          ).map(r => r.map(assessCell))
        }))
        .filter(
          s => s.grid.some(
            r => r.some(Boolean)
          )
        );
      if(!sheets.length){
        throw new Error('The file is empty.');
      }
      let pick = sheets[0];
      if(type === 'motor'){
        pick =
          sheets.find(
            s =>
              s.name
                .toLowerCase()
                .includes(motorSkillType)
          ) ||
          sheets
            .slice()
            .sort(
              (a,b) =>
                b.grid.length - a.grid.length
            )[0];
      }else{
        pick =
          sheets
            .slice()
            .sort(
              (a,b) =>
                b.grid.length - a.grid.length
            )[0];
      }
      const grid = pick.grid;
      const S = assessAnalyse(
        type,
        grid,
        file.name,
        source
      );
      const problems =
        assessFileProblems(S, type);
      if(problems.length){
        importRefuse(out, problems);
        return;
      }
      assessSmart = S;
      renderAssessSmartPreview();
    }catch(err){
      out.innerHTML =
        `<div class="au-error">
          ${esc(err.message || err)}
        </div>`;
    }
  };
  input.click();
}
  // =====================================================================
  // 📷 Scan a photo — camera OR gallery (replaces the old openAssessmentCamera).
  // Used by every assessment tab (Pre-Test, Observation, Workbook, Motor).
  //   • 📸 Capture photo        — live camera inside the portal
  //   • 🖼 Choose from gallery  — any photo already on this device
  //   • 📱 Open camera app      — phones/tablets only: the device's own camera
  // If the camera cannot open (no camera, permission denied, not HTTPS, DroidCam
  // not started …) the window stays open so a photo can still be chosen.
  // =====================================================================
  // One place that turns a photo (from the camera or the gallery) into the editable preview.
  async function assessProcessPhoto(type, file){
    const panel = assessPanel();
    if(!panel){ alert('Import panel is not available yet.'); return; }
    if(!file) return;
    if(!/^image\//i.test(file.type || '') && !/\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name || '')){
      panel.innerHTML = '<div class="au-error">That file is not a photo. Choose a JPG or PNG picture of the marksheet (for Excel or CSV use “Import a file”).</div>';
      return;
    }
    if(file.size > 25 * 1024 * 1024){
      panel.innerHTML = '<div class="au-error">That photo is larger than 25 MB. Choose a smaller one, or take it again.</div>';
      return;
    }
    try{
      const targets = assessTargets(type);
      if(!targets) throw new Error('This tab has not finished loading its items — wait a moment and try again.');
      panel.innerHTML = '<p class="sub">Reading the photo…</p>';
      const grid = await assessOcrGrid(file, type, panel);
      assessSmart = assessAnalyse(type, grid, file.name || 'photo', 'photo');
      renderAssessSmartPreview();
    }catch(err){
      let msg = String((err && err.message) || err);
      if(/hei[cf]/i.test((file.type || '') + ' ' + (file.name || ''))) msg += ' (HEIC/HEIF photos are not readable in every browser — share or save the picture as a JPG and try again.)';
      panel.innerHTML = `<div class="au-error">${esc(msg)}</div>`;
    }
  }
  // Opens the device's file chooser for pictures. useCameraApp = ask phones to open their own camera.
  function assessPickPhotoFile(useCameraApp, done){
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if(useCameraApp) input.setAttribute('capture', 'environment');
    input.onchange = () => { const f = input.files && input.files[0]; if(f) done(f); };
    input.click();
  }
  async function openAssessmentCamera(type){
    if(!assessPanel()){ alert('Import panel is not available yet.'); return; }
    const old = document.getElementById('assessmentCameraWrap');
    if(old) old.remove();
    const isTouch = (navigator.maxTouchPoints || 0) > 0;
    let stream = null, capturedBlob = null;
    const wrap = document.createElement('div');
    wrap.id = 'assessmentCameraWrap';
    wrap.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,.78); display:flex; align-items:center; justify-content:center; padding:20px;';
    wrap.innerHTML = `
      <div style="width:min(760px,96vw); max-height:94vh; overflow:auto; background:var(--card,#fff); border-radius:14px; padding:18px; box-shadow:0 20px 60px rgba(0,0,0,.35);">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px;">
          <div>
            <h3 style="margin:0; font-family:var(--disp); font-size:16px;">📷 Scan a photo</h3>
            <p class="cap" style="margin:4px 0 0;">Take a photo of the complete marksheet, or choose one from your gallery.</p>
          </div>
          <button type="button" class="imp-btn" id="assessmentCameraClose">✕ Close</button>
        </div>
        <div id="assessmentCameraBox" style="background:#111; border-radius:10px; overflow:hidden; position:relative;">
          <video id="assessmentCameraVideo" autoplay playsinline muted style="display:block; width:100%; max-height:65vh; object-fit:contain;"></video>
          <div id="assessmentCameraFrame" style="position:absolute; inset:8%; border:2px solid rgba(255,255,255,.8); border-radius:8px; pointer-events:none;"></div>
        </div>
        <canvas id="assessmentCameraCanvas" style="display:none;"></canvas>
        <div id="assessmentCameraMessage" class="cap" style="min-height:20px; margin-top:10px;">Starting the camera…</div>
        <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap; margin-top:12px;">
          <button type="button" class="imp-btn primary" id="assessmentCameraCapture">📸 Capture photo</button>
          <button type="button" class="imp-btn" id="assessmentCameraRetake" style="display:none;">🔄 Retake</button>
          <button type="button" class="imp-btn primary" id="assessmentCameraUse" style="display:none;">✓ Use this photo</button>
          <button type="button" class="imp-btn" id="assessmentCameraGallery">🖼 Choose from gallery</button>
          ${isTouch ? '<button type="button" class="imp-btn" id="assessmentCameraApp">📱 Open camera app</button>' : ''}
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const $ = id => wrap.querySelector('#' + id);
    const video = $('assessmentCameraVideo'), canvas = $('assessmentCameraCanvas'), message = $('assessmentCameraMessage');
    const captureBtn = $('assessmentCameraCapture'), retakeBtn = $('assessmentCameraRetake'), useBtn = $('assessmentCameraUse');
    function stopCamera(){ if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; } }
    function onKey(e){ if(e.key === 'Escape') closeCamera(); }
    function closeCamera(){ stopCamera(); document.removeEventListener('keydown', onKey); wrap.remove(); }
    document.addEventListener('keydown', onKey);
    $('assessmentCameraClose').onclick = closeCamera;
    // Gallery / camera app: close this window and read the chosen photo.
    $('assessmentCameraGallery').onclick = () => assessPickPhotoFile(false, f => { closeCamera(); assessProcessPhoto(type, f); });
    if(isTouch) $('assessmentCameraApp').onclick = () => assessPickPhotoFile(true, f => { closeCamera(); assessProcessPhoto(type, f); });
    // The live camera could not start — keep the window open so a gallery photo can still be used.
    function cameraUnavailable(why){
      stopCamera();
      $('assessmentCameraBox').style.display = 'none';
      captureBtn.style.display = 'none';
      message.textContent = why + ' You can still choose a photo from your gallery.';
    }
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      cameraUnavailable('The camera cannot be used here (it needs a recent Chrome or Edge over HTTPS).');
    } else {
      try{
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if(!document.body.contains(wrap)){ stopCamera(); return; } // closed while the camera was starting
        video.srcObject = stream;
        message.textContent = 'Camera ready. Make sure the complete sheet is visible and readable.';
      }catch(err){
        let msg = 'Could not open the camera.';
        if(err && err.name === 'NotAllowedError') msg = 'Camera permission was denied. Allow camera access in the browser to use it.';
        else if(err && err.name === 'NotFoundError') msg = 'No camera was found on this device.';
        else if(err && err.name === 'NotReadableError') msg = 'The camera is being used by another application.';
        cameraUnavailable(msg);
      }
    }
    captureBtn.onclick = () => {
      if(!video.videoWidth || !video.videoHeight){ message.textContent = 'The camera is not ready yet. Please wait a moment.'; return; }
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if(!blob){ message.textContent = 'Could not capture the photo. Try again.'; return; }
        capturedBlob = blob;
        video.style.display = 'none';
        canvas.style.cssText = 'display:block; width:100%; max-height:65vh; object-fit:contain;';
        captureBtn.style.display = 'none';
        retakeBtn.style.display = 'inline-flex';
        useBtn.style.display = 'inline-flex';
        message.textContent = 'Check the photo. If the complete sheet is visible, click “Use this photo”.';
      }, 'image/jpeg', 0.92);
    };
    retakeBtn.onclick = () => {
      capturedBlob = null;
      canvas.style.display = 'none';
      video.style.display = 'block';
      captureBtn.style.display = 'inline-flex';
      retakeBtn.style.display = 'none';
      useBtn.style.display = 'none';
      message.textContent = 'Camera ready. Take another photo.';
    };
    useBtn.onclick = () => {
      if(!capturedBlob) return;
      const file = new File([capturedBlob], 'assessment-scan-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      closeCamera();
      assessProcessPhoto(type, file);
    };
  }
  // ---- photo → grid, on this device ----
