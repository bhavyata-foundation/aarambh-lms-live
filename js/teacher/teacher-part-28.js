function assessLoadTesseract(){
    if(window.Tesseract) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = () => res(); s.onerror = () => rej(new Error('The photo reader could not be downloaded — check the internet connection and try again.'));
      document.head.appendChild(s);
    });
  }
  // Grayscale + contrast + enlarge small photos: printed and neat handwriting read noticeably better.
  async function assessPrepareImage(file){
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That photo could not be opened.')); i.src = url; });
    const scale = Math.min(3, Math.max(1, 2000 / Math.max(img.width, img.height)));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
    for(let i = 0; i < px.length; i += 4){
      const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const v = Math.max(0, Math.min(255, (y - 128) * 1.6 + 128));
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    g.putImageData(d, 0, 0);
    URL.revokeObjectURL(url);
    return c;
  }
  async function assessOcrGrid(file, type, out){
    out.innerHTML = '<p class="sub">Getting the photo reader ready…</p>';
    await assessLoadTesseract();
    const canvas = await assessPrepareImage(file);
    const result = await Tesseract.recognize(canvas, 'eng', {
      logger: m => { if(m.status === 'recognizing text' && out) out.innerHTML = `<p class="sub">Reading the photo… ${Math.round((m.progress || 0) * 100)}%</p>`; }
    });
    const lines = ((result.data && result.data.lines) || []).map(l => l.text).filter(t => t && t.trim());
    const text = lines.length ? lines : String((result.data && result.data.text) || '').split(/\n/);
    const grid = [];
    text.forEach(line => {
      const clean = line.replace(/[|\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
      if(!clean) return;
      const toks = clean.split(' ');
      // The heading line ("Student Name June July …", "CG  B  P  A"): keep it as a header row.
      const nameAt = toks.findIndex(t => /^name$/i.test(t));
      if(!grid.length && nameAt >= 0){ grid.push(['Student Name', ...toks.slice(nameAt + 1)]); return; }
      if(!grid.length && assessIsTally(type) && toks.filter(t => /^(b|p|a|e|beginner|proficient|advanced|emerging)$/i.test(t)).length >= 2){
        grid.push(['Key', ...toks.filter(t => /^(b|p|a|e|beginner|proficient|advanced|emerging)$/i.test(t))]); return;
      }
      if(assessIsTally(type)){
        // key first (CG code / activity no.), then the numbers
        const nums = toks.filter(t => /^\d{1,3}$/.test(t));
        const key = toks.find(t => /cg|\d+\.\d+/i.test(t)) || toks[0];
        grid.push([key, ...nums.slice(-3)]);
        return;
      }
      // trailing short tokens are marks; the rest is the name
      let k = toks.length;
      while(k > 1 && /^[BPAEGYR8478✓✗xX-]{1,2}$/i.test(toks[k - 1])) k--;
      grid.push([toks.slice(0, k).join(' '), ...toks.slice(k)]);
    });
    if(!grid.length) throw new Error('No writing could be read from this photo. Take it again in good light, straight on, with the whole sheet in view.');
    return grid;
  }
  // ---- work out the structure ----
  function assessAnalyse(type, grid, fileName, source){
    const targets = assessTargets(type);
    const width = Math.max(...grid.map(r => r.length));
    // "CG-8.3" and "C-8.3" are the same code; a code only matches whole, so C-8.1 never matches C-8.13.
    // A Pre-Test activity number matches only itself ("1" or "1."), never "10"–"19".
    const cgNorm = h => assessNorm(h).replace(/cg(?=\d)/g, 'c');
    const codeHit = (n, m) => new RegExp('(^|[^0-9.])' + m.replace(/\./g, '\\.') + '(?![0-9])').test(n);
    const matchTarget = h => { const n = cgNorm(h); if(!n) return null; return targets.find(t => t.match.some(m => m && (/^c\d+\.\d+$/.test(m) ? codeHit(n, m) : /^\d+$/.test(m) ? (n === m || n.startsWith(m + '.') && !/^\d/.test(n.slice(m.length + 1))) : (n === m || n.includes(m) || (m.length > 3 && m.includes(n) && n.length > 3))))) || null; };
    // header row: a name heading, or 2+ cells that name targets
    let headerIdx = -1;
    const bpaRow = r => (grid[r] || []).filter(c => /^(count[_ ]?)?([123]\s*(beginner|proficient|advanced)?|b|p|a|e|beginner|proficient|advanced|emerging)$/i.test(String(c).trim())).length >= 2;
    if(assessIsTally(type)) for(let r = 0; r < Math.min(grid.length, 15); r++) if(bpaRow(r)){ headerIdx = r; break; } // counts: the B · P · A heading row wins
    // header row: the row that names the most DIFFERENT activities. A row of numbers (1-20, then 1-6 for the
    // Classroom columns) names each number only once, so the activity names row wins for all 26 activities.
    let bestScore = 0;
    for(let r = 0; r < Math.min(grid.length, 15); r++){
      const row = grid[r] || [];
      const nameHit = row.some(c => SI_NAME_WORDS.includes(siNorm(c)));
      const keys = new Set(row.map(c => { const tt = matchTarget(c); return tt ? tt.key : null; }).filter(Boolean));
      const bpaHits = row.filter(c => /^(count[_ ]?)?([123]\s*(beginner|proficient|advanced)?|b|p|a|e|beginner|proficient|advanced|emerging)$/i.test(String(c).trim())).length;
      const eligible = nameHit || keys.size >= 2 || (assessIsTally(type) && bpaHits >= 2);
      const score = (nameHit ? 1000 : 0) + keys.size + (assessIsTally(type) && bpaHits >= 2 ? 1000 : 0);
      if(eligible && score > bestScore){ bestScore = score; headerIdx = r; }
    }
    const header = headerIdx >= 0 ? grid[headerIdx] : [];
    const body = grid.slice(headerIdx + 1).filter(r => r.some(c => String(c).trim()));
    if(assessIsTally(type)){
      // key column = the one whose cells match targets most; counts = B/P/A headings or the last 3 numeric columns
      let keyCol = 0, best = -1;
      for(let c = 0; c < width; c++){ const hits = body.filter(r => matchTarget(r[c])).length; if(hits > best){ best = hits; keyCol = c; } }
      const h = header.map(x => String(x).trim().toLowerCase());
      const find = words => h.findIndex(x => words.includes(x.replace(/^count[_ ]?/, '').replace(/^([123])\s*(beginner|proficient|advanced)$/, '$1')));
      let cb = find(['1', 'b', 'e', 'beginner', 'emerging']), cp = find(['2', 'p', 'proficient']), ca = find(['3', 'a', 'advanced']);
      if(cb < 0 || cp < 0 || ca < 0){
        const numCols = []; for(let c = 0; c < width; c++) if(c !== keyCol && body.filter(r => /^\d+$/.test(String(r[c] || '').trim())).length >= Math.max(1, body.length * 0.5)) numCols.push(c);
        [cb, cp, ca] = numCols.slice(-3).concat([-1, -1, -1]).slice(0, 3);
      }
      const rows = body.map(r => {
        const t = matchTarget(r[keyCol]);
        const n = c => (c >= 0 && /^\d+$/.test(String(r[c] || '').trim())) ? parseInt(r[c], 10) : 0;
        return { raw: String(r[keyCol] || ''), target: t ? t.key : '', include: !!t, b: n(cb), p: n(cp), a: n(ca) };
      }).filter(r => r.raw || r.b || r.p || r.a);
      return { type, fileName, source, tally: true, targets, rows, grid, countsFound: cb >= 0 && cp >= 0 && ca >= 0 };
    }
    // per-child: name column + mark columns
    let nameCol = header.findIndex(c => SI_NAME_WORDS.includes(siNorm(c)));
    if(nameCol < 0){ let best = -1; for(let c = 0; c < width; c++){ const n = body.filter(r => /[a-z\u0900-\u097F]{3,}/i.test(String(r[c] || '')) && assessMark(r[c]) === '?').length; if(n > best){ best = n; nameCol = c; } } }
    const markCols = [];
    for(let c = 0; c < width; c++){
      if(c === nameCol) continue;
      // Summary columns (Marked, Not marked, B, P, A totals) are never read as marks.
      if(/^(marked|not marked|total|completed|absent|[bpa]|total [bpa].*|summary.*)$/i.test(String(header[c] || '').trim())) continue;
      const vals = body.map(r => String(r[c] || '').trim()).filter(Boolean);
      if(!vals.length) continue;
      const good = vals.filter(v => assessMark(v) !== '?').length;
      if(good >= vals.length * 0.5 || matchTarget(header[c])) markCols.push(c);
    }
    const used = new Set();
    const columns = markCols.map((c, i) => {
      let t = matchTarget(header[c]);
      // The same CG code can sit under two themes in one month (e.g. C-7.1 in July).
      // The theme named in the column heading wins; otherwise columns go to those
      // themes in order, so a second C-7.1 column fills the second theme.
      if(t && type === 'observation'){
        const same = targets.filter(x => x.cg === t.cg);
        if(same.length > 1){
          const hn = assessNorm(header[c]);
          t = same.find(x => !used.has(x.key) && hn.includes(assessNorm(x.theme))) || same.find(x => !used.has(x.key)) || t;
        }
      }
      if(!t && type === 'motor') t = targets.find(x => !used.has(x.key) && targets.indexOf(x) >= i) || null; // months in order
      // Flexible capture: a repeated occasion gets its own item, and a column whose heading names a CG code and theme
      // is taken as given even if the portal's list does not have that occasion.
      if(type === 'observation' && t && used.has(t.key)) t = null;
      if(type === 'observation' && !t){
        const mm = String(header[c] || '').trim().match(/^(C-?\d+\.\d+)\s+(.+)$/i);
        if(mm){ t = { key: 'extra|' + c, cg: 'C-' + mm[1].replace(/^C-?/i, ''), theme: mm[2].trim(), label: String(header[c]).trim(), match: [] }; targets.push(t); }
      }
      if(t) used.add(t.key);
      return { col: c, label: String(header[c] || 'Column ' + (c + 1)), target: t ? t.key : '' };
    });
    const roll = {}; (realPupilsCache || []).forEach(p => { roll[normPupilName(p.name)] = p; });
    const rows = body.map(r => {
      const name = splitRegisterFromName(r[nameCol]).name;
      const p = roll[normPupilName(name)];
      return { raw: name, pupilId: p ? p.id : '', include: !!name && !SI_TOTAL_WORDS.test(name), marks: columns.map(col => assessMark(r[col.col])), rawMarks: columns.map(col => String(r[col.col] || '')) };
    }).filter(r => r.raw);
    return { type, fileName, source, tally: false, targets, columns, rows, grid, headerFound: headerIdx >= 0, nameFound: header.some(c => SI_NAME_WORDS.includes(siNorm(c))) || rows.some(r => r.pupilId) };
  }
  // ---- the editable preview ----
  function assessSmartSet(path, value){
    const [kind, i, j] = path.split(':');
    const s = assessSmart; if(!s) return;
    if(kind === 'inc') s.rows[+i].include = value;
    else if(kind === 'pupil') s.rows[+i].pupilId = value ? +value : '';
    else if(kind === 'mark') s.rows[+i].marks[+j] = value;
    else if(kind === 'col') s.columns[+i].target = value;
    else if(kind === 'tkey'){ s.rows[+i].target = value; if(value) s.rows[+i].include = true; }
    else if(kind === 'tnum') s.rows[+i][j] = Math.max(0, parseInt(value, 10) || 0);
    renderAssessSmartPreview();
  }
  function assessSmartBlankUnknown(){ assessSmart.rows.forEach(r => { if(r.marks) r.marks = r.marks.map(m => m === '?' ? '' : m); }); renderAssessSmartPreview(); }
  function renderAssessSmartPreview(){
    const out = assessPanel(); const s = assessSmart;
    if(!out || !s) return;
    const sel = (path, opts, cur, extra) => `<select onchange="assessSmartSet('${path}', this.value)" style="padding:4px 6px; border:1px solid ${extra || 'var(--border)'}; border-radius:6px; font-size:12.5px; max-width:230px;">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const from = s.source === 'photo' ? 'the photo' : '“' + esc(s.fileName) + '”';
    // "✍ Enter manually": the teacher types the marks herself, so there is no file or photo that was "read" —
    // the title and the "Change anything that's wrong…" line are only for file / photo imports.
    const manual = s.source === 'manual';
    let html = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">` + (manual ? '' : `
      <p style="margin:0 0 4px; font-weight:600;">Check and correct what I read from ${from} — nothing is saved yet</p>
      <p class="cap" style="margin:0 0 10px;">Change anything that's wrong: every mark, which child a row is, and what each column is. Untick rows to leave them out.${s.source === 'photo' ? ' Photos — especially handwriting — are often misread, so please look over every row.' : ''}</p>`);
    if(s.type === 'observation' && !s.tally){
      const byCg = {}; s.targets.forEach(t => { (byCg[t.cg] = byCg[t.cg] || []).push(t.theme); });
      const twice = Object.entries(byCg).filter(([, th]) => th.length > 1);
      if(twice.length && s.columns.some(c => !c.target)) html += `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:8px 10px; margin:0 0 10px; font-size:12.5px;"><b>Same CG code under more than one theme this month:</b> ${twice.map(([cg, th]) => esc(cg) + ' (' + th.map(esc).join(', ') + ')').join('; ')}. Each column is matched to the theme named in its heading, or else in order — check the theme shown above each column.</div>`;
    }
    let problems = 0, toSave = 0;
    if(s.tally){
      const opts = [['', '— not a row to save —']].concat(s.targets.map(t => [t.key, t.label]));
      html += '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Use</th><th style="text-align:left;">In the file</th><th style="text-align:left;">Saves as</th><th><span class="gd gd-B" style="width:20px; height:20px; font-size:10px;">B</span></th><th><span class="gd gd-P" style="width:20px; height:20px; font-size:10px;">P</span></th><th><span class="gd gd-A" style="width:20px; height:20px; font-size:10px;">A</span></th></tr></thead><tbody>';
      s.rows.forEach((r, i) => {
        if(r.include && !r.target) problems++;
        if(r.include && r.target) toSave++;
        const num = f => `<input type="number" min="0" value="${r[f]}" onchange="assessSmartSet('tnum:${i}:${f}', this.value)" style="width:60px; padding:4px; text-align:center; border:1px solid var(--border); border-radius:6px;" />`;
        html += `<tr style="${r.include ? '' : 'opacity:.5;'}"><td><input type="checkbox" ${r.include ? 'checked' : ''} onchange="assessSmartSet('inc:${i}', this.checked)" /></td><td style="text-align:left;">${esc(r.raw) || '<span class="dim">(blank)</span>'}</td>`
          + `<td style="text-align:left;">${sel('tkey:' + i, opts, r.target, r.include && !r.target ? 'var(--crit,#d03b3b)' : '')}</td><td>${num('b')}</td><td>${num('p')}</td><td>${num('a')}</td></tr>`;
      });
      html += '</tbody></table></div>';
    } else {
      const colOpts = [['', '— skip this column —']].concat(s.targets.map(t => [t.key, t.label]));
      const pupilOpts = [['', '— not in this class (skip) —']].concat((realPupilsCache || []).map(p => [p.id, (p.register_no ? p.register_no + ' ' : '') + p.name]));
      const markOpts = [['', '—'], ['B', 'B'], ['P', 'P'], ['A', 'A'], ['?', '?']];
      html += '<div class="report-table-wrap"><table class="report-table" style="min-width:760px;"><thead><tr><th>Use</th><th style="text-align:left;">Child</th>'
        + s.columns.map((c, j) => `<th style="text-align:center; white-space:normal;"><div class="cap" style="margin-bottom:4px;">${esc(c.label)}</div>${sel('col:' + j, colOpts, c.target, c.target ? '' : 'var(--text-muted,#999)')}</th>`).join('')
        + '</tr></thead><tbody>';
      s.rows.forEach((r, i) => {
        const bad = r.include && !r.pupilId;
        if(bad) problems++;
        html += `<tr style="${r.include ? '' : 'opacity:.5;'}"><td><input type="checkbox" ${r.include ? 'checked' : ''} onchange="assessSmartSet('inc:${i}', this.checked)" /></td>`
          + `<td style="text-align:left;"><div class="cap">${esc(r.raw)}</div>${sel('pupil:' + i, pupilOpts, r.pupilId, bad ? 'var(--crit,#d03b3b)' : '')}</td>`
          + r.marks.map((m, j) => {
              const colOn = s.columns[j].target;
              if(r.include && colOn && m === '?') problems++;
              if(r.include && colOn && r.pupilId && m && m !== '?') toSave++;
              return `<td style="text-align:center; ${colOn ? '' : 'opacity:.4;'}">${sel('mark:' + i + ':' + j, markOpts, m, m === '?' ? 'var(--crit,#d03b3b)' : '')}${m === '?' ? `<div class="cap" style="color:var(--crit,#d03b3b);">read “${esc(r.rawMarks[j])}”</div>` : ''}</td>`;
            }).join('') + '</tr>';
      });
      html += '</tbody></table></div>';
    }
    html += `<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:12px;">
        <button class="btn-primary" style="width:auto; padding:8px 16px;" onclick="assessSmartConfirm()" ${problems || !toSave ? 'disabled' : ''}>Confirm — save ${toSave} ${s.tally ? 'row' + (toSave === 1 ? '' : 's') : 'mark' + (toSave === 1 ? '' : 's')}</button>
        <button class="btn" onclick="assessSmart = null; assessPanel().innerHTML = '<p class=&quot;cap&quot;>Import cancelled — nothing was saved.</p>';">Cancel</button>
        ${!s.tally && s.rows.some(r => r.marks.includes('?')) ? '<button class="btn" onclick="assessSmartBlankUnknown()">Leave unreadable marks blank</button>' : ''}
        ${problems ? `<span class="cap" style="color:var(--crit,#d03b3b);">${problems} thing${problems === 1 ? '' : 's'} to fix (red borders) — or untick those rows</span>` : ''}
      </div></div>`;
    out.innerHTML = html;
  }
  // ---- save: hand exactly what's shown to the assessment's own import ----
  async function assessRunImporter(resultId, run){
    const panel = assessPanel();
    const existing = document.getElementById(resultId);
    if(existing) existing.id = resultId + '__hold';
    const target = document.createElement('div'); target.id = resultId; target.style.marginTop = '10px';
    panel.appendChild(target);
    try { await run(); }
    finally { target.id = resultId + '__done'; if(existing) existing.id = resultId; }
  }
  async function assessSmartConfirm(){
    const s = assessSmart; if(!s) return;
    const panel = assessPanel();
    panel.querySelectorAll('button').forEach(b => b.disabled = true);
    try{
      if(s.type === 'motor'){
        const ratings = [];
        s.rows.forEach(r => { if(!r.include || !r.pupilId) return; r.marks.forEach((m, j) => {
          const month = s.columns[j].target; if(!month || !m || m === '?') return;
          ratings.push({ pupil_id: r.pupilId, skill_type: motorSkillType, month, rating: MOTOR_WORD_TO_RATING[m] });
        }); });
        pendingMotorImport = { ratings, notes: [] };
        await assessRunImporter('motorImportResult', confirmMotorImport);
      } else if(s.type === 'observation'){
        // the activities come from this file's own headings; blank cells stay unmarked (never a grade)
        const targets = {}; s.targets.forEach(t => { targets[t.key] = t; });
        const marks = [];
        s.rows.forEach(r => { if(!r.include || !r.pupilId) return;
          r.marks.forEach((m, j) => { const t = targets[s.columns[j].target]; if(!t || !m || m === '?') return;
            if(!t.theme || !t.cg || !currentWorkbookMonth) return; // a cell with no item is left out, never blocks the batch
            marks.push({ pupil_id: r.pupilId, month: currentWorkbookMonth, theme: t.theme, cg_code: t.cg, occ: t.occ || 1, level_mark: m === 'B' ? 'E' : m }); }); });
        const d = await assessPostObservationMarks(marks);
        // the observation summary shows only the CGs of this file (this session only)
        if(typeof cgRowsFromFile === 'function') window.__cgFromImportObs = { month: currentWorkbookMonth, rows: cgRowsFromFile() };
        // like the workbook: drop the old copy of this month, reload it from the saved marks, and redraw the screen
        try { if(typeof observationThemesCache !== 'undefined') delete observationThemesCache[workbookLevelFromClassName() + '|' + currentWorkbookMonth]; } catch(e){}
        try { if(typeof observationAssessmentCache !== 'undefined') delete observationAssessmentCache[currentWorkbookMonth]; } catch(e){}
        try { if(window.__obsSaved) delete window.__obsSaved[workbookLevelFromClassName() + '|' + currentWorkbookMonth]; } catch(e){}
        renderMonthlyAssessment(monthlyAssessmentTargetEl);
        const box = assessPanel(); if(box) box.innerHTML = `<div class="au-success">✓ Imported ${d.saved} observation mark${d.saved === 1 ? '' : 's'} — saved.</div>`;
      } else if(s.type === 'pretest'){ // each child's B / P / A per activity: saved to the database, then shown from it
        const rowsToSave = [];
        s.rows.forEach(r => { if(!r.include || !r.pupilId) return; const p = realPupilsCache.find(x => x.id === r.pupilId); if(!p) return;
          r.marks.forEach((m, j) => { const key = s.columns[j].target; if(!key || !m || m === '?') return;
            // the activity number is the activity's position in the Pre-Test order (1–26), not the sheet's key
            const pos = (s.targets || []).findIndex(t => t.key === key); if(pos < 0) return;
            rowsToSave.push({ pupil_id: p.id, activity_no: pos + 1, level_mark: m }); }); });
        const box = assessPanel();
        try {
          const res = await window.preTestSaveImport(rowsToSave);
          const skippedTxt = res.skipped.length ? `<div style="margin-top:6px;">${res.skipped.length} row(s) skipped: ${res.skipped.map(x => String(x).replace(/</g,'&lt;')).join('; ')}</div>` : '';
          if(box) box.innerHTML = `<div class="au-success">✓ Saved ${res.imported} Pre-Test mark${res.imported === 1 ? '' : 's'} to the database.</div>${skippedTxt}`;
        } catch(err){
          if(box) box.innerHTML = `<div class="au-error">The Pre-Test marks were not saved: ${err.message || err}</div>`;
        }
      } else if(s.type === 'workbook'){
        const targets = {}; s.targets.forEach(t => { targets[t.key] = t; });
        const marks = [];
        s.rows.forEach(r => {
          if(!r.include || !r.pupilId) return;
          r.marks.forEach((m, j) => {
            const t = targets[s.columns[j].target];
            if(!t || m === '?') return;
            // a blank cell = absent for this activity (saved as ABS, never as a grade)
            const lvl = !m ? 'ABS' : (m === 'B' ? 'E' : m);
            if(t.item) marks.push({ pupil_id: r.pupilId, item: t.item, level_mark: lvl });
            else marks.push({ pupil_id: r.pupilId, workbook_page_id: +t.key, level_mark: lvl });
          });
        });
        // All marks in one request (backend/assessment/workbook/save_workbook_marks_batch.php):
        // one request per mark took minutes through ngrok with nothing on screen.
        const box0 = assessPanel();
        const note = document.createElement('div'); note.className = 'cap'; note.setAttribute('data-wb-saving', '');
        note.style.cssText = 'margin-top:10px; font-weight:600;';
        note.textContent = 'Saving ' + marks.length + ' marks…';
        if(box0) box0.appendChild(note);
        let saved = 0;
        try {
          const res = await fetch('backend/assessment/workbook/save_workbook_marks_batch.php' + window.location.search, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ marks, workbook: { level: workbookLevelFromClassName(), name: currentWorkbookCompetencyBookName, month: currentWorkbookMonth } })
          });
          const text = await res.text();
          let d; try { d = JSON.parse(text); } catch(e){ throw new Error(res.status === 404 ? 'The new save file (save_workbook_marks_batch.php) is not on the server yet.' : 'The server did not answer properly (HTTP ' + res.status + '). Nothing was saved.'); }
          if(d.status !== 'success') throw new Error(d.message || 'The Workbook marks could not be saved.');
          saved = d.saved || 0;
          // the CG summary shows the CGs of the file just imported (this session only; nothing is stored for CGs)
          if(typeof cgRowsFromFile === 'function') window.__cgFromImport = { month: currentWorkbookMonth, rows: cgRowsFromFile() };
        } finally { note.remove(); }
        const cache = workbookChildMarksCache[currentWorkbookMonth] || (workbookChildMarksCache[currentWorkbookMonth] = {});
        marks.forEach(m => { (cache[m.pupil_id] = cache[m.pupil_id] || {})[m.workbook_page_id] = m.level_mark; });
        renderMonthlyAssessment(monthlyAssessmentTargetEl);
        const box = assessPanel(); if(box) box.innerHTML = `<div class="au-success">✓ Imported ${saved} Workbook mark${saved === 1 ? '' : 's'} — saved.</div>`;
      }
      assessSmart = null;
    } catch(err){
      const box = assessPanel();
      if(box){
        box.insertAdjacentHTML('beforeend', `<div class="au-error" data-assess-save-error>${esc(err.message || err)}</div>`);
        box.querySelectorAll('button').forEach(b => { b.disabled = false; }); // so she can try again
        const e = box.querySelector('[data-assess-save-error]:last-of-type'); if(e && e.scrollIntoView) e.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    } finally {
      smartAssessHandoffRows = null;
    }
  }
  // ---- ▤ Assessment records as a tab on the Assessment screen (used from part 11) ----
  // Redraw the records view wherever it is showing.
  function assessmentRecordsRefresh(){
    const ab = document.getElementById('assessment-body');
    if(ab && !ab.classList.contains('hidden') && assessmentEntryType === 'records') renderMonthlyAssessment(monthlyAssessmentTargetEl);
    else renderAssessmentDashboard();
  }
  // Used by the entry screens: open the ▤ Assessment records tab.
  function openAssessmentRecords(type){
    if(type) assessmentRecordsType = type;
    assessmentEntryType = 'records';
    const ab = document.getElementById('assessment-body');
    if(ab && !ab.classList.contains('hidden')) renderMonthlyAssessment(monthlyAssessmentTargetEl);
    else switchSidebarSection('assessment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // =================================================================
  // ASSESSMENT RECORDS → Σ TOTAL (all CGs). Every CG code with its
  // B / P / A counts from each assessment, the total, and the CG's
  // level — worked out only from what has actually been saved.
  //   Classroom Observation — each child's mark per CG item (the month)
  //   Workbook              — the class tally per competency (the month)
  //   Pre-Test              — the class baseline tally per activity
  //   Fine & Gross Motor    — each child's rating for the month's activity,
  //                           counted under the CG the portal's activity
  //                           areas give fine / gross motor (DOMAINS).
  // Level = average of B=1, P=2, A=3: under 1.67 → B, under 2.34 → P, else A.
  // =================================================================
  var cgTotalInclude = { observation: false, workbook: false, pretest: false, motor: false }; // tick to include
  // "CG-8.3", "CG 8.3", "C-8.3", "c8.3" → "CG-8.3" (some item lists write C-, some CG-).
  function cgCode(raw){
    const m = String(raw || '').toUpperCase().match(/(?:^|[^A-Z])C\s*G?\s*[-–.]?\s*(\d+(?:\.\d+)?)/);
    return m ? 'CG-' + m[1] : '';
  }
  function cgMajor(code){ const m = code.match(/^CG-(\d+)/); return m ? +m[1] : 999; }
  function cgLevel(b, p, a){
    const n = b + p + a; if(!n) return null;
    const avg = (b + 2 * p + 3 * a) / n;
    return { avg: Math.round(avg * 100) / 100, letter: avg < 1.67 ? 'B' : avg < 2.34 ? 'P' : 'A', pctPA: Math.round((p + a) / n * 100) };
  }
  function motorCgFor(type){
    const list = (typeof DOMAINS !== 'undefined' && Array.isArray(DOMAINS)) ? DOMAINS : [];
    const d = list.find(x => new RegExp(type === 'fine' ? 'fine\\s*motor' : 'gross\\s*motor', 'i').test(x.label || ''));
    return d ? cgCode(d.cg) : '';
  }
  // ---- One calculation of every CG's B / P / A, shared by Σ Total and the Dashboard Overview ----
  function computeCgTotals(month, reRender){
    const level = workbookLevelFromClassName();
    const ready = [
      ensureObservationThemesLoaded(level, month, reRender),
      ensureObservationAssessmentLoaded(month, reRender),
      ensureWorkbookCompetenciesLoaded(level, month, reRender),
      ensureWorkbookPagesLoaded(level, month, reRender),       // Workbook: child-wise marks per page (part 09)
      ensureWorkbookChildMarksLoaded(month, reRender),
      ensureMotorAssessmentLoaded(reRender)
    ];
    if(myClassInfo.class_id) ensureWorkbookMonthSubmissionLoaded(myClassInfo.class_id, month, reRender);
    ensurePreTestTallyForClass();
    if(ready.some(r => !r)) return { loading: true };
    const rows = {};
    const add = (code, src, tier, n, what) => {
      if(!code || !n) return;
      const r = rows[code] || (rows[code] = { code, items: new Set(), observation: { b: 0, p: 0, a: 0 }, workbook: { b: 0, p: 0, a: 0 }, pretest: { b: 0, p: 0, a: 0 }, motor: { b: 0, p: 0, a: 0 } });
      r[src][tier] += n; if(what) r.items.add(what);
    };
    const tierOf = t => t === 'E' || t === 'B' ? 'b' : t === 'P' ? 'p' : t === 'A' ? 'a' : '';
    const errors = [], recorded = { observation: 0, workbook: 0, pretest: 0, motor: 0 };
    const children = {}; // pupil id -> CG -> { observation:{b,p,a}, motor:{b,p,a} }
    const addChild = (pid, code, src, tier) => {
      if(!code) return;
      const c = children[pid] || (children[pid] = {});
      const r = c[code] || (c[code] = { observation: { b: 0, p: 0, a: 0 }, workbook: { b: 0, p: 0, a: 0 }, motor: { b: 0, p: 0, a: 0 } });
      r[src][tier]++;
    };
    const themes = observationThemesCache[level + '|' + month], marks = observationAssessmentCache[month];
    if(Array.isArray(themes) && marks && typeof marks === 'object'){
      themes.forEach(t => t.items.forEach(it => {
        realPupilsCache.forEach(p => { const k = tierOf((marks[p.id] || {})[it.id]); if(k){ add(cgCode(it.cg_code), 'observation', k, 1, 'Observation: ' + t.name); addChild(p.id, cgCode(it.cg_code), 'observation', k); recorded.observation++; } });
      }));
    } else errors.push('Classroom Observation');
    const books = workbookCompetenciesCache[level + '|' + month];
    const wbPages = workbookPagesCache[level + '|' + month], wbMarks = workbookChildMarksCache[month];
    if(Array.isArray(wbPages) && wbMarks && typeof wbMarks === 'object'){ // each child, each page, that page's CG — pages on the same CG add up
      wbPages.forEach(b => (b.pages || []).forEach(pg => realPupilsCache.forEach(p => { const k = tierOf((wbMarks[p.id] || {})[pg.id]);
        if(k){ const code = cgCode(pg.cg_code); add(code, 'workbook', k, 1, 'Workbook: ' + b.name); addChild(p.id, code, 'workbook', k); recorded.workbook++; } })));
    } else errors.push('Workbook');
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((act, idx) => { const t = preTestTallyEntries[String(idx)]; if(!t) return;
      const code = cgCode(act.cg);
      add(code, 'pretest', 'b', t.count_e || 0, 'Pre-Test'); add(code, 'pretest', 'p', t.count_p || 0, 'Pre-Test'); add(code, 'pretest', 'a', t.count_a || 0, 'Pre-Test');
      recorded.pretest += (t.count_e || 0) + (t.count_p || 0) + (t.count_a || 0); });
    let motorNote = '';
    if(motorAssessmentCache && typeof motorAssessmentCache === 'object' && MOTOR_MONTHS.includes(month)){
      ['fine', 'gross'].forEach(type => {
        const code = motorCgFor(type);
        if(!code){ motorNote += (type === 'fine' ? 'Fine' : 'Gross') + ' Motor has no CG code in the activity areas, so it is not counted. '; return; }
        realPupilsCache.forEach(p => { const r = motorRating(p.id, type, month); const k = r === 'R' ? 'b' : r === 'Y' ? 'p' : r === 'G' ? 'a' : '';
          if(k){ add(code, 'motor', k, 1, (type === 'fine' ? 'Fine' : 'Gross') + ' Motor: ' + MOTOR_ACTIVITIES[type][month].title); addChild(p.id, code, 'motor', k); recorded.motor++; } });
      });
    } else if(!MOTOR_MONTHS.includes(month)) motorNote = 'Fine & Gross Motor runs June–October, so it has nothing for ' + month + '. ';
    const codes = Object.keys(rows).sort((x, y) => cgMajor(x) - cgMajor(y) || parseFloat(x.slice(3)) - parseFloat(y.slice(3)));
    return { loading: false, rows, codes, errors, motorNote, books, recorded, children };
  }
  // The total for one CG row, counting only the ticked assessments.
  function cgRowTotal(r, include){
    const tot = { b: 0, p: 0, a: 0 };
    ['observation', 'workbook', 'pretest', 'motor'].forEach(k => { if(include[k]){ tot.b += r[k].b; tot.p += r[k].p; tot.a += r[k].a; } });
    return tot;
  }