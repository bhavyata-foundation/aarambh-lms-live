// All activities in the chosen months: the rows are shown inside the CG summary card (cg-summary.js), not as a table of their own.
var observationAllView = false;
function renderObservationAllView(container, months, level, rerender){
  const loaded = months.map(m => ensureObservationAssessmentLoaded(m, rerender)).every(Boolean);
  if(!loaded){ container.appendChild(mdCard(null, 'Loading the marks for every month in the range…', null)); return; }
  const kids = Array.isArray(realPupilsCache) ? realPupilsCache : [];
  const rows = [];
  months.forEach(m => {
    const themes = observationThemesCache[level + '|' + m] || [];
    const marks = observationAssessmentCache[m] || {};
    themes.forEach(t => (t.items || []).forEach(it => {
      const cnt = { B: 0, P: 0, A: 0 };
      kids.forEach(p => {
        const v = (marks[p.id] || {})[it.id];
        if(v === 'E' || v === 'B') cnt.B++; else if(v === 'P') cnt.P++; else if(v === 'A') cnt.A++;
      });
      rows.push({ month: m, theme: t.name, cg: it.cg_code, b: cnt.B, p: cnt.P, a: cnt.A, taken: cnt.B + cnt.P + cnt.A > 0 });
    }));
  });
  window.observationAllRows = { months, rows };
}
function renderObservationAssessmentSection(container){
    const level = workbookLevelFromClassName();
    // Months as a range — From [month] To [month] — and one Theme list
    // with every theme in that range. Picking a theme opens its grid for
    // THAT theme's month (currentWorkbookMonth), so grades are saved
    // against the month they belong to, exactly as before.
    const rerender = () => renderMonthlyAssessment(monthlyAssessmentTargetEl);
    const TERM_MONTHS = assessTermMonths(); // Term 1 or Term 2 (part 14)
    if(!TERM_MONTHS.includes(obsRangeFrom)) obsRangeFrom = currentWorkbookMonth;
    if(!TERM_MONTHS.includes(obsRangeTo)) obsRangeTo = currentWorkbookMonth;
    const iFrom = TERM_MONTHS.indexOf(obsRangeFrom), iTo = TERM_MONTHS.indexOf(obsRangeTo);
    const rangeMonths = TERM_MONTHS.slice(Math.min(iFrom, iTo), Math.max(iFrom, iTo) + 1);
    const monthBar = document.createElement('div'); monthBar.className = 'fbar'; monthBar.style.cssText = 'margin-bottom:18px; display:flex; gap:16px; flex-wrap:wrap; align-items:flex-end;';
    const monthOpts = sel => TERM_MONTHS.map(m => `<option value="${esc(m)}" ${m === sel ? 'selected' : ''}>${esc(m)}</option>`).join('');
    monthBar.innerHTML = `<div class="ctl"><label>From</label><select id="observationFromSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${monthOpts(obsRangeFrom)}</select></div>
      <div class="ctl"><label>To</label><select id="observationToSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${monthOpts(obsRangeTo)}</select></div>`;
    container.appendChild(monthBar);
    const setRange = (from, to) => {
      if(TERM_MONTHS.indexOf(from) > TERM_MONTHS.indexOf(to)) [from, to] = [to, from]; // keep From before To
      obsRangeFrom = from; obsRangeTo = to;
      const months = TERM_MONTHS.slice(TERM_MONTHS.indexOf(from), TERM_MONTHS.indexOf(to) + 1);
      if(!months.includes(currentWorkbookMonth)){ currentWorkbookMonth = from; currentObservationThemeId = null; }
      rerender();
    };
    monthBar.querySelector('#observationFromSelect').onchange = e => setRange(e.target.value, obsRangeTo);
    monthBar.querySelector('#observationToSelect').onchange = e => setRange(obsRangeFrom, e.target.value);
    if(!ensurePupilsLoadedFor(container, rerender)) return;
    // themes of every month in the range; marks for the theme's month
    if(!rangeMonths.includes(currentWorkbookMonth)) currentWorkbookMonth = rangeMonths[0];
    const allThemesLoaded = rangeMonths.map(m => ensureObservationThemesLoaded(level, m, rerender)).every(Boolean);
    const marksLoaded = ensureObservationAssessmentLoaded(currentWorkbookMonth, rerender);
    const failedMonth = rangeMonths.find(m => typeof observationThemesCache[level + '|' + m] === 'string' && observationThemesCache[level + '|' + m].startsWith('error:'));
    if(failedMonth){
      const k = level + '|' + failedMonth;
      renderRetryCard(container, observationThemesCache[k].slice(6), () => delete observationThemesCache[k]); return;
    }
    if(typeof observationAssessmentCache[currentWorkbookMonth] === 'string' && observationAssessmentCache[currentWorkbookMonth].startsWith('error:')){
      renderRetryCard(container, observationAssessmentCache[currentWorkbookMonth].slice(6), () => delete observationAssessmentCache[currentWorkbookMonth]); return;
    }
    if(!allThemesLoaded || !marksLoaded){ container.appendChild(mdCard(null, 'Loading observation themes…', null)); return; }
    const rangeThemes = rangeMonths.flatMap(m => (observationThemesCache[level + '|' + m] || []).map(t => ({ month: m, t })));
    if(!rangeThemes.length){
      container.appendChild(mdCard(null, 'No themes are scheduled ' + (rangeMonths.length > 1 ? 'from ' + rangeMonths[0] + ' to ' + rangeMonths[rangeMonths.length - 1] : 'for ' + rangeMonths[0]) + ' yet.', null));
      return;
    }
    const picked = rangeThemes.find(x => x.month === currentWorkbookMonth && x.t.id === currentObservationThemeId);
    if(!picked){
      const first = rangeThemes.find(x => x.month === currentWorkbookMonth) || rangeThemes[0];
      currentObservationThemeId = first.t.id;
      if(first.month !== currentWorkbookMonth){ currentWorkbookMonth = first.month; rerender(); return; } // load that month's marks
    }
    const themesKey = level + '|' + currentWorkbookMonth;
    const themes = observationThemesCache[themesKey];
    const marks = observationAssessmentCache[currentWorkbookMonth];
    // --- Theme picker — every theme in the range, labelled with its month ---
    // Theme sits in the same bar as From / To, side by side.
    const themeCtl = document.createElement('div'); themeCtl.className = 'ctl'; themeCtl.style.cssText = 'flex:1; min-width:260px;';
    themeCtl.innerHTML = '<label>Theme</label><select id="observationThemeSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px; width:100%; max-width:520px;"></select>';
    monthBar.appendChild(themeCtl);
    const themeSel = themeCtl.querySelector('#observationThemeSelect');
    const allOpt = document.createElement('option'); allOpt.value = 'ALL';
    allOpt.textContent = 'All activities (' + rangeMonths[0] + (rangeMonths.length > 1 ? ' – ' + rangeMonths[rangeMonths.length - 1] : '') + ')';
    if(observationAllView) allOpt.selected = true;
    themeSel.appendChild(allOpt);
    rangeMonths.forEach(m => {
      const list = rangeThemes.filter(x => x.month === m);
      if(!list.length) return;
      const group = document.createElement('optgroup'); group.label = m;
      list.forEach(({ t }) => {
        const opt = document.createElement('option'); opt.value = m + '|' + t.id; opt.textContent = m + ' — ' + t.name + ' (' + t.items.length + ' items)';
        if(m === currentWorkbookMonth && t.id === currentObservationThemeId) opt.selected = true;
        group.appendChild(opt);
      });
      themeSel.appendChild(group);
    });
    themeSel.onchange = () => {
      if(themeSel.value === 'ALL'){ observationAllView = true; rerender(); return; }
      observationAllView = false;
      const [m, id] = themeSel.value.split('|');
      currentWorkbookMonth = m; currentObservationThemeId = parseInt(id, 10);
      rerender();
    };
    if(observationAllView){ renderObservationAllView(container, rangeMonths, level, rerender); return; }
    window.observationAllRows = null;
    const selectedTheme = themes.find(t => t.id === currentObservationThemeId);
    const items = selectedTheme.items;
    ensureObservationTeacherNotesLoaded(currentWorkbookMonth, selectedTheme.id, rerender);
    const observationNotes = (observationTeacherNotesCache[currentWorkbookMonth + '|' + selectedTheme.id] && typeof observationTeacherNotesCache[currentWorkbookMonth + '|' + selectedTheme.id] === 'object') ? observationTeacherNotesCache[currentWorkbookMonth + '|' + selectedTheme.id] : {};
    if(!items.length){
      container.appendChild(mdCard(null, 'No items are set up for "' + esc(selectedTheme.name) + '" yet.', null));
      return;
    }
    // ---- Import previous data (collapsed by default) ----
    const obsImportToggle = document.createElement('div');
    obsImportToggle.className = 'card'; obsImportToggle.style.cssText = 'padding:0; margin-bottom:14px; overflow:hidden;';
    obsImportToggle.innerHTML = `
      <div onclick="observationImportOpen = !observationImportOpen; this.nextElementSibling.classList.toggle('hidden', !observationImportOpen); this.querySelector('.chevron').style.transform = observationImportOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import from a file</h3>
          <p class="cap" style="margin:0;">Grade manually by tapping E, P, or A on the table below, or import a file here — either way saves to the same real record.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${observationImportOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${observationImportOpen ? '' : 'hidden'}" style="padding:0 18px 18px;"></div>
    `;
    obsImportToggle.style.display = 'none'; // replaced by 📥 Import a file or photo (part 14)
    container.appendChild(obsImportToggle);
    obsImportToggle.querySelector('div:last-child').appendChild(renderObservationImportCard());
    const anyGraded = Object.keys(marks).some(pid => Object.keys(marks[pid] || {}).length);
    container.appendChild(mdSec(esc(selectedTheme.name) + ' — ' + currentWorkbookMonth, '<span class="reqs">ASM-O1…O3</span>'));
    let obsRecorded = 0;
    const obsTot = { B: 0, P: 0, A: 0 };
    assessmentPupilNames().forEach((name, idx) => {
      const pupil = realPupilsCache[idx];
      const pupilMarks = marks[pupil.id] || {};
      items.forEach(it => {
        const m = pupilMarks[it.id];
        if(m === 'E' || m === 'B'){ obsTot.B++; obsRecorded++; }
        else if(m === 'P'){ obsTot.P++; obsRecorded++; }
        else if(m === 'A'){ obsTot.A++; obsRecorded++; }
      });
    });
    const obsTotalCells = assessmentPupilNames().length * items.length;
    const obsCompleteness = obsTotalCells ? Math.round(obsRecorded / obsTotalCells * 100) : 0;
    const obsDsi = obsRecorded ? Math.round(((obsTot.A*3 + obsTot.P*2 + obsTot.B) / (3 * obsRecorded) * 200) * 10) / 10 : 0;
    const obsSri = obsRecorded ? Math.round((obsTot.P + obsTot.A) / obsRecorded * 100) : 0;
    const obsNoMarks = assessmentPupilNames().filter((name, idx) => {
      const pupil = realPupilsCache[idx];
      const pupilMarks = marks[pupil.id] || {};
      return items.every(it => !pupilMarks[it.id]);
    }).length;
    container.appendChild(mdGrid('g5', [
      mdTile('Scope', items.length, 'activities in this theme', mdPill(currentWorkbookMonth, 'info'), 'ASM-O1'),
      mdTile('Recording complete', obsCompleteness, '% of child/activity cells', mdPill(mdStatusBand(obsCompleteness, 90, 70).l, mdStatusBand(obsCompleteness, 90, 70).c), 'ASM-O2', mdMeter(obsCompleteness)),
      mdTile('Class DSI', obsDsi, 'of 200', mdPill(mdStatusBand(obsDsi/2).l, mdStatusBand(obsDsi/2).c), 'DSI', mdMeter(obsDsi/2)),
      mdTile('At Proficient or above', obsSri, '% SRI', mdPill(mdStatusBand(obsSri).l, mdStatusBand(obsSri).c), 'SRI', mdMeter(obsSri)),
      mdTile('Children with no marks', obsNoMarks, 'of ' + assessmentPupilNames().length, obsNoMarks > assessmentPupilNames().length/3 ? mdPill('Needs follow-up', 'crit') : obsNoMarks ? mdPill('Some still open', 'warn') : mdPill('All assessed', 'good'), 'ASM-O3')
    ]));
    // Group columns by their real Curricular Goal (derived server-side
    // from each item's cg_code, matched against the real 13-CG
    // taxonomy) — same grouped-header treatment Workbook Assessment
    // uses, adapted for a column-per-item grid instead of a row-per-item
    // form since Observation grades the whole class at once.
    const cgGroups = [];
    items.forEach(it => {
      const key = it.curricular_goal_id || 'ungrouped';
      let group = cgGroups.find(g => g.key === key);
      if(!group){ group = { key, goal_text: it.goal_text || 'Ungrouped', items: [] }; cgGroups.push(group); }
      group.items.push(it);
    });
    let table = '<div class="report-table-wrap observation-grid-wrap" style="overflow-x:auto; width:100%;"><table class="report-table observation-grid" style="width:100%; min-width:1120px; border-collapse:separate; border-spacing:0;"><thead><tr><th rowspan="2" style="padding:14px 16px; min-width:180px; text-align:left; vertical-align:middle;">Child</th>' +
      cgGroups.map(g => `<th colspan="${g.items.length}" style="text-align:center; padding:14px 10px; min-width:150px;">${esc(g.goal_text)}</th>`).join('') +
      '</tr><tr>' +
      cgGroups.flatMap(g => g.items.map((it, idx) => `<th style="padding:12px 10px; min-width:150px; text-align:center; white-space:nowrap;">${idx + 1}. ${esc(it.cg_code)}</th>`)).join('') +
      '<th rowspan="2" style="min-width:260px; width:260px; padding:14px 16px; text-align:left; vertical-align:middle;">Teacher notes</th>' +
      '</tr></thead><tbody>';
    const tierColors = { E: 'var(--danger,#c8433f)', P: '#EE8F35', A: 'var(--success)' };
    const orderedItems = cgGroups.flatMap(g => g.items); // must match the header's column order exactly
    assessmentPupilNames().forEach((name, idx) => {
      const pupil = realPupilsCache[idx];
      const pupilMarks = marks[pupil.id] || {};
      const cells = orderedItems.map(it => {
        const mark = pupilMarks[it.id] || null;
        const btns = ['E','P','A'].map(t => {
          const active = mark === t;
          return `<button onclick="saveObservationMark(${pupil.id},${it.id},${mark ? "'" + mark + "'" : 'null'},'${t}')" title="${TIER_INFO[t].n}" style="${gradeBtnStyle(t, active, 24)}">${gradeBtnLabel(active, t)}</button>`;
        }).join('');
        return `<td style="text-align:center; padding:13px 10px; vertical-align:middle;"><div style="display:flex; gap:8px; justify-content:center; align-items:center;">${btns}</div></td>`;
      }).join('');
      table += `<tr style="height:58px;"><td style="padding:13px 16px; vertical-align:middle; white-space:nowrap;"><b>${esc(name)}</b></td>${cells}<td style="min-width:260px; width:260px; padding:10px 14px; vertical-align:middle;"><input type="text" class="assessment-note-input" data-pupil="${pupil.id}" value="${esc(observationNotes[pupil.id] || '')}" placeholder="Add a note" style="width:100%; min-width:200px; padding:8px 10px; border:1px solid var(--border,#d9dcd5); border-radius:6px; font-size:12.5px; font-family:inherit; box-sizing:border-box;"></td></tr>`;
    });
    table += '</tbody></table></div>';
    const wrap = document.createElement('div'); wrap.innerHTML = table;
    const observationTableCard = mdCard(null, 'Tap B, P or A to record an observation (B Beginner · P Proficient · A Advanced) — the chosen one is highlighted; tap it again to clear. Each tap saves immediately, no separate Save step.', wrap);
    observationTableCard.style.marginTop = '24px';
    observationTableCard.style.marginBottom = '24px';
    container.appendChild(observationTableCard);
    observationTableCard.querySelectorAll('.assessment-note-input').forEach(inp => { inp.addEventListener('change', () => saveObservationTeacherNote(parseInt(inp.getAttribute('data-pupil'),10), currentWorkbookMonth, selectedTheme.id, inp.value.trim())); });
    // ---- Save & download — every tap above already saves on its own;
    // "Save" waits for any still in flight, then re-reads the month
    // from the database and reports what is actually stored. The
    // download buttons export every theme graded this month.
    const saveBar = document.createElement('div');
    saveBar.className = 'card';
    saveBar.style.cssText = 'padding:16px 18px; margin-top:16px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';
    saveBar.innerHTML = `
      <div style="flex:1; min-width:240px;">
        <b>Save this month's observation</b>
        <p class="cap" style="margin:4px 0 0;">${observationSaveMessage ? esc(observationSaveMessage) : 'Checks every grade above against the database and confirms how many are stored.'}</p>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="observationSaveBtn" class="btn-primary" style="width:auto; padding:9px 18px;">✓ Save</button>
      </div>`;
    container.appendChild(saveBar);
    saveBar.querySelector('#observationSaveBtn').onclick = confirmObservationSaved;
    container.appendChild(assessmentReportsLink('observation'));
  }
  // ---------------------------------------------------------------
  // FINE & GROSS MOTOR — same pattern as the Bhandup Tank Road
  // "Gross / Fine Motor Assessment" sheet: one activity per month
  // (June–October), every child rated G Achieved / Y Developing /
  // R Needs Support, plus a teacher note per child per sheet. The
  // children are THIS class's real roster (realPupilsCache), never the
  // names on that sheet. Saved to the real database
  // (backend/assessment/motor/).
  // ---------------------------------------------------------------
  const MOTOR_MONTHS = ['June', 'July', 'August', 'September', 'October'];
  const MOTOR_ACTIVITIES = {
    fine: {
      June:      { title: 'Pencil Cup Pegs', detail: 'Squeeze and attach 10 clothes pegs around the rim of a sturdy cup. Remove them one by one.' },
      July:      { title: 'Button Practice', detail: 'Fasten and unfasten the large buttons on a practice strip or doll shirt.' },
      August:    { title: 'Pattern Lacing', detail: 'Thread a lace through holes around a cardboard shape, alternating two bead colours.' },
      September: { title: 'Leaf Rubbing', detail: 'Hold a leaf under paper and rub with the side of a crayon to reveal its veins.' },
      October:   { title: 'Clay Numerals', detail: 'Roll thin clay ropes and shape numerals 1–5. Make matching clay balls beside each numeral.' }
    },
    gross: {
      June:      { title: 'Classroom Obstacle Path', detail: 'Walk around cones, step over a low foam block and balance along a taped line.' },
      July:      { title: 'Healthy Habits Action Trail', detail: 'Walk between picture stations. Mime brushing, bathing and exercise with whole-body actions.' },
      August:    { title: 'Hop Step Clap', detail: 'Copy and repeat a hop–step–clap movement pattern. Try leading the next round.' },
      September: { title: 'Grow Like a Plant', detail: 'Crouch like a seed, rise slowly, stretch like a tree and sway gently in the wind.' },
      October:   { title: 'Number Line Jumps', detail: 'Jump along the floor numbers 1–10. Stop on the number called by the teacher.' }
    }
  };
  // Motor ratings are SHOWN as B / P / A like every other assessment.
  // They are stored as before (R / Y / G), so nothing already saved
  // changes: R = B Beginner, Y = P Proficient, G = A Advanced.
  const MOTOR_RATINGS = {
    R: { letter: 'B', label: 'Beginner', color: 'var(--danger, #c8433f)' },
    Y: { letter: 'P', label: 'Proficient', color: '#EE8F35' },
    G: { letter: 'A', label: 'Advanced', color: 'var(--success, #0ca30c)' }
  };
  const MOTOR_ORDER = ['R', 'Y', 'G']; // shown left to right as B · P · A
  function motorLetter(r){ return r && MOTOR_RATINGS[r] ? MOTOR_RATINGS[r].letter : ''; }
  let motorSkillType = 'fine'; // 'fine' | 'gross'
  let motorAssessmentCache = null; // null | 'loading' | 'error:...' | { ratings: {pupilId:{fine:{June:'G'}, gross:{...}}}, notes: {pupilId:{fine:'..', gross:'..'}} }
  let motorPendingSaves = 0;
  let motorSaveMessage = '';
  // ---------------------------------------------------------------
  // FINE & GROSS MOTOR — IMPORT. Reads the same layout as the Fine /
  // Gross Motor Assessment sheets: a header row with ROLL NO. ·
  // STUDENT NAME · JUNE … OCTOBER · TEACHER NOTES, then one row per
  // child. An .xlsx can hold both sheets (tabs named FINE MOTOR /
  // GROSS MOTOR); a .csv is one sheet and goes to whichever sheet is
  // selected above. Children are matched by name against THIS class's
  // roll — any name not on the roll is listed and skipped, never
  // created. Nothing is saved until the preview is confirmed.
  // ---------------------------------------------------------------
  let motorImportOpen = false;
  let pendingMotorImport = null; // { ratings:[...], notes:[...], summary }
  // Small CSV reader that respects quoted cells, so a teacher note
  // containing a comma stays in one column.
  function parseCsvRows(text){
    const rows = []; let row = [], cell = '', inQuotes = false;
    for(let i = 0; i < text.length; i++){
      const ch = text[i];
      if(inQuotes){
        if(ch === '"' && text[i + 1] === '"'){ cell += '"'; i++; }
        else if(ch === '"') inQuotes = false;
        else cell += ch;
      } else if(ch === '"') inQuotes = true;
      else if(ch === ','){ row.push(cell.trim()); cell = ''; }
      else if(ch === '\n' || ch === '\r'){
        if(ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell.trim()); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if(cell !== '' || row.length){ row.push(cell.trim()); rows.push(row); }
    return rows.filter(r => r.some(c => c !== ''));
  }
  async function readMotorFileSheets(file){
    if(/\.xlsx$/i.test(file.name)){
      if(typeof XLSX === 'undefined') throw new Error('.xlsx support did not load (no internet reached the CDN) — try a .csv file instead.');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      return wb.SheetNames.map(n => ({
        name: n,
        rows: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' }).map(r => r.map(c => String(c).trim()))
      }));
    }
    return [{ name: file.name, rows: parseCsvRows(await file.text()) }];
  }
  function motorTypeForSheet(sheet, singleSheet){
    const hay = (sheet.name + ' ' + sheet.rows.slice(0, 4).map(r => r.join(' ')).join(' ')).toLowerCase();
    if(hay.includes('fine')) return 'fine';
    if(hay.includes('gross')) return 'gross';
    return singleSheet ? motorSkillType : null; // a lone unlabelled sheet goes to the sheet selected on screen
  }
  // Sheets may use B/P/A (as the portal shows) or the older G/Y/R.
  const MOTOR_WORD_TO_RATING = { B: 'R', P: 'Y', A: 'G', BEGINNER: 'R', PROFICIENT: 'Y', ADVANCED: 'G',
    G: 'G', Y: 'Y', R: 'R', ACHIEVED: 'G', DEVELOPING: 'Y', 'NEEDS SUPPORT': 'R' };
  // Returns { ratings, notes, problems, matched:Set, unmatched:[] } for one sheet.
  function parseMotorSheet(rows, type){
    const out = { ratings: [], notes: [], problems: [], matched: new Set(), unmatched: [] };
    const headerIdx = rows.findIndex(r => r.some(c => c.toLowerCase() === 'student name'));
    if(headerIdx < 0){ out.problems.push('No "STUDENT NAME" header row found.'); return out; }
    const header = rows[headerIdx].map(c => c.toLowerCase());
    const nameCol = header.indexOf('student name');
    const notesCol = header.findIndex(c => c.startsWith('teacher note') || c === 'notes');
    const monthCols = {};
    MOTOR_MONTHS.forEach(m => { const i = header.indexOf(m.toLowerCase()); if(i >= 0) monthCols[m] = i; });
    if(!Object.keys(monthCols).length){ out.problems.push('No month columns (JUNE … OCTOBER) found in the header row.'); return out; }
    const byName = {};
    realPupilsCache.forEach(p => { byName[p.name.trim().toLowerCase().replace(/\s+/g, ' ')] = p; });
    for(let i = headerIdx + 1; i < rows.length; i++){
      const row = rows[i];
      const rawName = (row[nameCol] || '').trim();
      if(!rawName) continue; // the activity-description row under the header, or a blank line
      const pupil = byName[rawName.toLowerCase().replace(/\s+/g, ' ')];
      if(!pupil){ out.unmatched.push(rawName); continue; }
      out.matched.add(pupil.id);
      Object.entries(monthCols).forEach(([m, col]) => {
        const cell = (row[col] || '').trim().toUpperCase();
        if(!cell) return; // blank = leave whatever is saved
        const rating = MOTOR_WORD_TO_RATING[cell];
        if(!rating){ out.problems.push(`${rawName}, ${m}: "${row[col]}" isn't B, P or A — skipped`); return; }
        out.ratings.push({ pupil_id: pupil.id, skill_type: type, month: m, rating });
      });
      if(notesCol >= 0 && (row[notesCol] || '').trim()){
        out.notes.push({ pupil_id: pupil.id, skill_type: type, note: row[notesCol].trim() });
      }
    }
    return out;
  }
  async function previewMotorImport(){
    const input = document.getElementById('motorImportInput');
    const resultEl = document.getElementById('motorImportResult');
    pendingMotorImport = null;
    if(!input.files.length){ resultEl.innerHTML = '<div class="au-error">Choose a .xlsx or .csv file first.</div>'; return; }
    resultEl.innerHTML = '<p class="sub">Reading file…</p>';
    let sheets;
    try { sheets = await readMotorFileSheets(input.files[0]); }
    catch(err){ resultEl.innerHTML = `<div class="au-error">${esc(err.message || 'Could not read the file.')}</div>`; return; }
    const ratings = [], notes = [], sheetLines = [], problems = [];
    const unmatched = new Set();
    sheets.forEach(sheet => {
      if(!sheet.rows.length) return;
      const type = motorTypeForSheet(sheet, sheets.length === 1);
      if(!type){ problems.push(`Sheet "${sheet.name}": can't tell if it's Fine or Gross Motor — name the tab FINE MOTOR or GROSS MOTOR.`); return; }
      const res = parseMotorSheet(sheet.rows, type);
      ratings.push(...res.ratings); notes.push(...res.notes);
      res.unmatched.forEach(n => unmatched.add(n));
      res.problems.forEach(p => problems.push(`Sheet "${sheet.name}": ${p}`));
      sheetLines.push(`<li><b>${type === 'fine' ? 'Fine Motor' : 'Gross Motor'}</b> (sheet "${esc(sheet.name)}") — ${res.ratings.length} rating${res.ratings.length === 1 ? '' : 's'}, ${res.notes.length} note${res.notes.length === 1 ? '' : 's'}, ${res.matched.size} child${res.matched.size === 1 ? '' : 'ren'} matched</li>`);
    });
    let html = '';
    if(ratings.length || notes.length){
      pendingMotorImport = { ratings, notes };
      html += `<div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
        <p style="margin:0 0 8px; font-weight:600;">Preview — nothing has been saved yet</p>
        <ul style="margin:0 0 10px 18px; padding:0; font-size:13px;">${sheetLines.join('')}</ul>
        <p class="cap" style="margin:0 0 10px;">Ratings in the file replace what's saved for that child and month. Blank cells in the file leave the saved rating as it is.</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="confirmMotorImport()">Confirm import — save ${ratings.length} rating${ratings.length === 1 ? '' : 's'}${notes.length ? ' and ' + notes.length + ' note' + (notes.length === 1 ? '' : 's') : ''}</button>
          <button class="btn" onclick="cancelMotorImport()">Cancel</button>
        </div>
      </div>`;
    } else {
      html += '<div class="au-error">Nothing in this file could be imported for this class.</div>';
    }
    if(unmatched.size){
      html += `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:10px 12px; margin-top:10px; font-size:12.5px;"><b>${unmatched.size} name${unmatched.size === 1 ? '' : 's'} not on this class's roll — skipped:</b><br>${[...unmatched].slice(0, 30).map(esc).join(', ')}${unmatched.size > 30 ? ' …' : ''}<br>Names must match the roll exactly. "Download sheet to fill in" gives a file with your class's names already in it.</div>`;
    }
    if(problems.length){
      html += `<div class="au-error" style="margin-top:8px;">${problems.slice(0, 20).map(esc).join('<br>')}${problems.length > 20 ? '<br>…and ' + (problems.length - 20) + ' more' : ''}</div>`;
    }
    resultEl.innerHTML = html;
  }
  function cancelMotorImport(){
    pendingMotorImport = null;
    const resultEl = document.getElementById('motorImportResult');
    if(resultEl) resultEl.innerHTML = '<p class="cap">Import cancelled — nothing was saved.</p>';
  }
  async function confirmMotorImport(){
    const resultEl = document.getElementById('motorImportResult');
    if(!pendingMotorImport){ resultEl.innerHTML = '<div class="au-error">Preview a file first.</div>'; return; }
    const { ratings, notes } = pendingMotorImport;
    resultEl.innerHTML = '<p class="sub">Saving…</p>';
    try{
      const res = await fetch('backend/assessment/motor/import_motor_assessment.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, ratings, notes })
      });
      const data = await res.json();
      if(data.status !== 'success'){ resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`; return; }
      pendingMotorImport = null;
      const fresh = await fetchMotorAssessment(); // show exactly what the database now holds
      if(typeof fresh !== 'string') motorAssessmentCache = fresh;
      motorSaveMessage = '✓ Imported ' + data.ratings_saved + ' rating' + (data.ratings_saved === 1 ? '' : 's') + (data.notes_saved ? ' and ' + data.notes_saved + ' note' + (data.notes_saved === 1 ? '' : 's') : '') + ' from the file.';
      renderMonthlyAssessment(monthlyAssessmentTargetEl);
      alert(motorSaveMessage);
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }
  // The sheet to fill in — same layout as the source sheets, with this
  // class's own children and anything already saved, so a teacher can
  // fill it offline and import it straight back.
  function downloadMotorImportTemplate(){
    if(typeof XLSX === 'undefined'){ alert('.xlsx support did not load (no internet reached the CDN) — try again once you\'re online.'); return; }
    const wbOut = XLSX.utils.book_new();
    ['fine', 'gross'].forEach(type => {
      const rows = [
        [(myClassInfo.school_name || '') + ' | ' + (myClassInfo.class_name || '')],
        [type === 'fine' ? 'FINE MOTOR ASSESSMENT SHEET' : 'GROSS MOTOR ASSESSMENT SHEET'],
        ['School: ' + (myClassInfo.school_name || '') + '    Class: ' + (myClassInfo.class_name || '') + '    Academic Year: ' + new Date().getFullYear()],
        ['B = Beginner   |   P = Proficient   |   A = Advanced'],
        [],
        ['ROLL NO.', 'STUDENT NAME', ...MOTOR_MONTHS.map(m => m.toUpperCase()), 'TEACHER NOTES'],
        ['', '', ...MOTOR_MONTHS.map(m => MOTOR_ACTIVITIES[type][m].title + '\n' + MOTOR_ACTIVITIES[type][m].detail), '']
      ];
      realPupilsCache.forEach((p, i) => rows.push([i + 1, p.name, ...MOTOR_MONTHS.map(m => motorLetter(motorRating(p.id, type, m))), motorNote(p.id, type)]));
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{wch: 9}, {wch: 26}, ...MOTOR_MONTHS.map(() => ({wch: 25})), {wch: 30}];
      ws['!merges'] = [0, 1, 2, 3].map(r => ({ s: {r, c: 0}, e: {r, c: MOTOR_MONTHS.length + 2} }));
      XLSX.utils.book_append_sheet(wbOut, ws, type === 'fine' ? 'FINE MOTOR' : 'GROSS MOTOR');
    });
    XLSX.writeFile(wbOut, 'motor-assessment-to-fill-' + (myClassInfo.class_name || 'class').replace(/\s+/g, '') + '.xlsx');
  }
  function renderMotorImportCard(){
    const toggle = document.createElement('div');
    toggle.className = 'card';
    toggle.style.cssText = 'padding:0; margin-bottom:20px; overflow:hidden;';
    toggle.innerHTML = `
      <div onclick="motorImportOpen = !motorImportOpen; this.nextElementSibling.classList.toggle('hidden', !motorImportOpen); this.querySelector('.chevron').style.transform = motorImportOpen ? 'rotate(90deg)' : 'rotate(0deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700;">📥 Import from a file</h3>
          <p class="cap" style="margin:0;">Bring in ratings and notes from a Fine / Gross Motor Assessment sheet (.xlsx or .csv), instead of tapping each one.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px; transform:${motorImportOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▶</span>
      </div>
      <div class="${motorImportOpen ? '' : 'hidden'}" style="padding:0 18px 18px;">
        <p class="cap" style="margin:0 0 8px;">Use the same layout as the assessment sheet: a header row <b>ROLL NO. · STUDENT NAME · JUNE · JULY · AUGUST · SEPTEMBER · OCTOBER · TEACHER NOTES</b>, then one row per child with B, P or A under each month (older sheets with G, Y, R are read too). An .xlsx can hold both tabs (FINE MOTOR and GROSS MOTOR); a .csv goes to the sheet selected above (${motorSkillType === 'fine' ? 'Fine Motor' : 'Gross Motor'}). Names must match this class's roll — other names are skipped.</p>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:10px 0;">
          <input type="file" id="motorImportInput" accept=".xlsx,.csv" style="max-width:100%;" />
          <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="previewMotorImport()">Preview import</button>
          <button class="btn" onclick="downloadMotorImportTemplate()">⬇ Download sheet to fill in (.xlsx)</button>
        </div>
        <div id="motorImportResult" style="word-break:break-word; overflow-wrap:anywhere;"></div>
      </div>`;
    return toggle;
  }
  function ensureMotorAssessmentLoaded(reRenderFn){
    if(motorAssessmentCache && typeof motorAssessmentCache === 'object') return true;
    if(motorAssessmentCache === 'loading') return false;
    if(typeof motorAssessmentCache === 'string') return true; // error — shown with Retry
    if(!myClassInfo.class_id) return false;
    motorAssessmentCache = 'loading';
    fetchMotorAssessment().then(result => {
      motorAssessmentCache = result;
      if(reRenderFn) reRenderFn(); else renderMonthlyAssessment(monthlyAssessmentTargetEl);
    });
    return false;
  }
/* ===== teacher-part-11.js ===== */
/* =========================================================================
   teacher-part-11.js — part 11 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */