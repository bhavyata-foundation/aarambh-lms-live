// The child grading list stays hidden until the teacher taps "✍ Enter manually"; it then stays open while she grades.
var preTestManualOpen = (typeof preTestManualOpen !== 'undefined') ? preTestManualOpen : false;
var preTestCgSummaryOpen = (typeof preTestCgSummaryOpen !== 'undefined') ? preTestCgSummaryOpen : false; // backs the collapsible "CG summary — Pre-Test" section
// Pre-Test: no B / P / A for an activity = the child was ABSENT and did not complete it.
// Never counted as Beginner, never in B / P / A, DSI, SRI or %.
  let preTestSummaryView = 'sheet'; // 'sheet' (this sheet's CG summary) or 'all' (every activity as a card)
    // Children admitted (admission date on the register) who have no Pre-Test marks yet. Only listed, never filled in.
  function preTestNotAssessedCard(){
    const kids = Array.isArray(realPupilsCache) ? realPupilsCache : [];
    const entries = (typeof preTestAssessmentEntries !== 'undefined' && preTestAssessmentEntries) ? preTestAssessmentEntries : {};
    const todo = kids.filter(p => p.admitted_date && !Object.keys(entries[p.name] || {}).some(k => ['B','P','A'].includes(entries[p.name][k])));
    const box = document.createElement('div');
    if(!todo.length) return box;
    const fmt = d => { const x = new Date(String(d).slice(0,10) + 'T00:00:00'); return isNaN(x) ? String(d) : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
    box.className = 'card';
    box.style.cssText = 'padding:14px 18px; margin:0 0 18px; border:1px solid #E0A800; background:#FFFDF2;';
    box.innerHTML = `<div style="font-weight:800; color:#5C4300; margin-bottom:6px;">Admitted, not yet assessed · ${todo.length}</div>`
      + `<div class="cap" style="margin-bottom:8px;">These children are on the register but have no Pre-Test marks yet. Nothing is filled in for them.</div>`
      + todo.map(p => `<div style="padding:5px 0; border-top:1px solid #F3E3A3; display:flex; justify-content:space-between; gap:12px;"><b>${esc(p.name)}</b><span class="cap">Admitted ${esc(fmt(p.admitted_date))}</span></div>`).join('');
    return box;
  }
function preTestAllActivityCards(){
    const wrap = document.createElement('div');
    const sheets = [['Worksheet', 'Workbook sheet'], ['Classroom', 'Classroom sheet']]; // the Workbook activities are tagged 'Worksheet'
    sheets.forEach(([type, label]) => {
      const acts = WEEKLY_ASSESSMENT_ACTIVITIES.map((a, idx) => Object.assign({}, a, { idx })).filter(a => a.type === type);
      const head = document.createElement('div');
      head.style.cssText = 'font-weight:800; font-size:14px; margin:14px 0 8px;';
      head.textContent = label + ' — ' + acts.length + ' activities';
      wrap.appendChild(head);
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:12px;';
      acts.forEach(a => {
        const e = preTestTallyEntries[String(a.idx)] || { count_e: 0, count_p: 0, count_a: 0 };
        const tot = e.count_e + e.count_p + e.count_a;
        const name = a.name || a.title || a.activity || ('Activity ' + (a.idx + 1));
        const card = document.createElement('div');
        card.className = 'card'; card.style.padding = '14px 16px';
        card.innerHTML = `<div style="font-weight:700; font-size:13.5px;">${esc(name)}</div>`
          + `<div class="cap" style="margin-top:2px;">${esc(a.cg || '')}${a.page && a.page !== '—' ? ' · Page ' + esc(a.page) : ''}</div>`
          + `<div style="display:flex; gap:8px; margin-top:10px; font-weight:800;">`
          + `<span style="color:#B42318;">B ${e.count_e}</span><span style="color:#9A6A00;">P ${e.count_p}</span><span style="color:#1E7B4F;">A ${e.count_a}</span>`
          + `<span class="dim" style="margin-left:auto; font-weight:600;">${tot} marked</span></div>`;
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    });
    wrap.style.marginBottom = '18px'; // space before the submit card
    return wrap;
  }
function preTestDone(v){ return v === 'B' || v === 'P' || v === 'A'; }
function preTestAbsentList(name){ // 1-based activity numbers this child has no mark for
  const rec = (typeof preTestAssessmentEntries !== 'undefined' && preTestAssessmentEntries[name]) || {};
  return WEEKLY_ASSESSMENT_ACTIVITIES.map((a, i) => preTestDone(rec[String(i)]) ? 0 : i + 1).filter(Boolean);
}
function preTestRanges(nums){ // [3,4,5,9,21,22] → "3–5, 9, 21–22"
  const out = []; for(let i = 0; i < nums.length; i++){ let j = i; while(j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++; out.push(j > i ? nums[i] + '\u2013' + nums[j] : String(nums[i])); i = j; }
  return out.join(', ');
}
// ---- Pre-Test "Sheet" card: Workbook sheet | Classroom sheet — two tiles, each with its own progress ring.
// Sits right under the assessment tabs (above the import card) and drives preTestTypeFilter, the same
// choice the activity list further down the page reads.
function setPreTestSheet(type){
  if(preTestTypeFilter === type) return;
  preTestTypeFilter = type;
  renderMonthlyAssessment(monthlyAssessmentTargetEl);
}
function renderPreTestSheetCard(){
  const pupils = (typeof assessmentPupilNames === 'function') ? assessmentPupilNames() : [];
  const store = (typeof preTestAssessmentEntries !== 'undefined' && preTestAssessmentEntries) ? preTestAssessmentEntries : {};
  const kinds = [
    { type: 'Worksheet', icon: '\uD83D\uDCD8', title: 'Workbook sheet',  sub: 'Worksheet activities' },
    { type: 'Classroom', icon: '\uD83C\uDFEB', title: 'Classroom sheet', sub: 'Hands-on classroom activities' }
  ];
  const card = document.createElement('div');
  card.className = 'card'; card.id = 'preTestSheetCard';
  card.setAttribute('data-no-export', '1');
  card.style.cssText = 'padding:14px 16px; margin:0 0 18px;';
  const tiles = kinds.map(k => {
    const acts = WEEKLY_ASSESSMENT_ACTIVITIES.map((a, i) => ({ a, i })).filter(x => x.a.type === k.type);
    const total = acts.length * pupils.length;
    let done = 0;
    acts.forEach(({ i }) => pupils.forEach(n => { if(preTestDone((store[n] || {})[String(i)])) done++; }));
    const pct = total ? Math.round(done / total * 100) : 0;
    const on = preTestTypeFilter === k.type;
    return `<button type="button" role="tab" aria-selected="${on}" onclick="setPreTestSheet('${k.type}')"
      style="flex:1 1 280px; display:flex; align-items:center; gap:14px; text-align:left; padding:12px 14px; border-radius:12px; cursor:pointer; font-family:inherit; color:var(--text);
             border:2px solid ${on ? 'var(--primary)' : 'var(--border)'}; background:${on ? 'var(--primary-light, #e8f5ef)' : '#fff'}; ${on ? 'box-shadow:0 2px 8px rgba(0,0,0,.08);' : ''}">
      <span style="flex:0 0 auto; width:44px; height:44px; border-radius:12px; display:grid; place-items:center; font-size:22px; background:${on ? 'var(--primary)' : '#f1f4f2'};">${k.icon}</span>
      <span style="flex:1; min-width:0;">
        <span style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <b style="font-size:14px; font-family:var(--disp);">${k.title}</b>
          ${on ? '<span style="font-size:10.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; padding:2px 8px; border-radius:99px; background:var(--primary); color:#fff;">Showing</span>' : ''}
        </span>
        <span class="cap" style="display:block; margin:2px 0 0;">${acts.length} activities \u00b7 ${k.sub}</span>
      </span>
      <span title="${done} of ${total} marks recorded" style="flex:0 0 auto; width:46px; height:46px; border-radius:50%; display:grid; place-items:center; background:conic-gradient(var(--primary) ${pct * 3.6}deg, #e3e9e5 0);">
        <span style="width:34px; height:34px; border-radius:50%; background:#fff; display:grid; place-items:center; font-size:11px; font-weight:700;">${pct}%</span>
      </span>
    </button>`;
  }).join('');
  card.innerHTML = `
    <div style="font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted,#6b7a72); margin-bottom:10px;">Sheet</div>
    <div role="tablist" style="display:flex; gap:12px; flex-wrap:wrap;">${tiles}</div>`;
  return card;
}
function renderPreTestClassSection(container){
    // Pre-Test keeps the existing activity/CG layout, but the source of truth
    // is child-wise: one BPA value per child per activity. The B/P/A numbers
    // shown in the activity table are calculated from those child records.
    ensurePreTestTallyForClass();
    if(typeof preTestAssessmentEntries !== 'undefined') syncPreTestTallyFromChildEntries();
    const pupils = assessmentPupilNames();
    const childStore = (typeof preTestAssessmentEntries !== 'undefined') ? preTestAssessmentEntries : {};
    let totalMarked = 0;
    const tot = { B: 0, P: 0, A: 0 };
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      pupils.forEach(name => {
        const v = childStore[name] && childStore[name][String(idx)];
        if(v === 'B'){ tot.B++; totalMarked++; }
        else if(v === 'P'){ tot.P++; totalMarked++; }
        else if(v === 'A'){ tot.A++; totalMarked++; }
      });
    });
    const totalCells = WEEKLY_ASSESSMENT_ACTIVITIES.length * pupils.length;
    const completeness = totalCells ? Math.round(totalMarked / totalCells * 100) : 0;
    const avgScore = totalMarked ? Math.round((tot.A*3 + tot.P*2 + tot.B*1) / totalMarked * 100) / 100 : 0;
    const pctAdvanced = totalMarked ? Math.round(tot.A / totalMarked * 100) : 0;
    container.appendChild(mdSec('Pre-Test', '<span class="reqs">ASM-PT1…3</span>'));
    const ptNote = document.createElement('p');
    ptNote.className = 'cap'; ptNote.style.margin = '4px 0 14px';
    container.appendChild(ptNote);
    const sriPct = totalMarked ? Math.round((tot.P + tot.A) / totalMarked * 100) : 0;
    const summaryGrid = mdGrid('g3', [
      mdTile('Scope', WEEKLY_ASSESSMENT_ACTIVITIES.length + ' activities', '20 worksheet + 6 classroom', mdPill('Baseline', 'info'), 'ASM-PT1'),
      mdTile('Activities completed', completeness, '% of child × activity (the rest: absent)', mdPill(mdStatusBand(completeness, 90, 70).l, mdStatusBand(completeness, 90, 70).c), 'ASM-PT2', mdMeter(completeness)),
      mdTile('At Proficient or above', sriPct, '% SRI', mdPill(mdStatusBand(sriPct).l, mdStatusBand(sriPct).c), 'SRI', mdMeter(sriPct))
    ]);
    summaryGrid.style.marginBottom = '24px';
    container.appendChild(summaryGrid);
    container.appendChild(renderPreTestSheetCard());   // Sheet: Workbook | Classroom — right after the summary cards, with the Activity dropdown directly below
    const typeBar = document.createElement('div'); typeBar.className = 'fbar card'; typeBar.style.cssText = 'margin-bottom:16px; padding:16px 18px; display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end;'; // one selector row: type + activity
    typeBar.innerHTML = '<div class="ctl"><label>Activity type</label><select id="preTestTypeSelect" style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>';
    typeBar.id = 'preTestPickerBar'; typeBar.style.display = preTestManualOpen ? '' : 'none'; // the pickers only matter while grading: shown after "Enter manually"
    if(!preTestManualOpen) typeBar.style.display = 'none'; // Activity choice and grid appear only after Enter manually
    container.appendChild(typeBar);
    const typeCtl = typeBar.querySelector('.ctl'); if(typeCtl) typeCtl.style.display = 'none'; // Workbook / Classroom is chosen in the Sheet card just above
    const typeSel = typeBar.querySelector('#preTestTypeSelect');
    ['Worksheet', 'Classroom'].forEach(t => {
      const opt = document.createElement('option'); opt.value = t; opt.textContent = t;
      if(t === preTestTypeFilter) opt.selected = true;
      typeSel.appendChild(opt);
    });
    typeSel.onchange = () => { preTestTypeFilter = typeSel.value; renderMonthlyAssessment(monthlyAssessmentTargetEl); };
    const activeActivities = WEEKLY_ASSESSMENT_ACTIVITIES.map((a, idx) => Object.assign({}, a, {idx})).filter(a => a.type === preTestTypeFilter);
    const pickerBar = typeBar; // same row as Activity type
    pickerBar.insertAdjacentHTML('beforeend', '<div class="ctl" style="flex:1; min-width:280px;"><label>Activity</label><select id="preTestActivitySelect" style="width:100%; padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;"></select></div>');
    const actSel = pickerBar.querySelector('#preTestActivitySelect');
    activeActivities.forEach(a => {
      const opt = document.createElement('option'); opt.value = String(a.idx); opt.textContent = (a.idx + 1) + '. ' + a.activity + ' — ' + a.cg;
      if(a.idx === (typeof preTestSelectedActivityIdx === 'number' ? preTestSelectedActivityIdx : 0)) opt.selected = true;
      actSel.appendChild(opt);
    });
    if(activeActivities.length && !activeActivities.some(a => a.idx === preTestSelectedActivityIdx)) preTestSelectedActivityIdx = activeActivities[0].idx;
    actSel.value = String(preTestSelectedActivityIdx);
    actSel.onchange = () => { preTestSelectedActivityIdx = parseInt(actSel.value, 10); renderMonthlyAssessment(monthlyAssessmentTargetEl); };
    const active = WEEKLY_ASSESSMENT_ACTIVITIES[preTestSelectedActivityIdx];
    if(active){
      const entryWrap = document.createElement('div'); entryWrap.id = 'preTestEntryList'; entryWrap.style.display = preTestManualOpen ? '' : 'none'; // hidden until "✍ Enter manually"
      container.appendChild(entryWrap); // shown only after Enter manually
      const meta = document.createElement('p');
      meta.className = 'cap'; meta.style.margin = '0 0 12px';
      meta.textContent = active.type + ' · ' + active.cg + (active.page && active.page !== '—' ? ' · Page ' + active.page : '');
      entryWrap.appendChild(meta);
      const childGrid = document.createElement('div');
      childGrid.className = 'report-table-wrap';
      let html = '<table class="report-table" style="min-width:560px;"><thead><tr><th style="text-align:left;">Child</th><th>Register No.</th><th style="text-align:center;">B · P · A</th></tr></thead><tbody>';
      pupils.forEach(name => {
        const pupil = Array.isArray(realPupilsCache) ? realPupilsCache.find(p => p.name === name) : null;
        const reg = pupil && (pupil.register_no || pupil.register_number || pupil.roll_no || pupil.admission_no) ? (pupil.register_no || pupil.register_number || pupil.roll_no || pupil.admission_no) : '';
        const tier = childStore[name] && childStore[name][String(preTestSelectedActivityIdx)];
        // Tap B, P or A (saved as 1 under that grade, 0 under the others); tap the chosen one again = not assessed.
        const circles = ['B', 'P', 'A'].map(g => `<button type="button" title="${esc(gradeLabel(g))}" onclick="setPreTestChildCount('${esc(name).replace(/'/g, "\\'")}', ${preTestSelectedActivityIdx}, '${g}', ${tier === g ? 0 : 1})" style="${gradeBtnStyle(g, tier === g, 28)} margin:0 3px;">${gradeBtnLabel(tier === g, g)}</button>`).join('');
        html += `<tr><td style="text-align:left;"><b>${esc(name)}</b></td><td class="dim">${esc(String(reg))}</td><td style="text-align:center; white-space:nowrap;">${circles}</td></tr>`;
      });
      html += '</tbody></table>';
      childGrid.innerHTML = html;
      entryWrap.appendChild(childGrid);
      const t = (preTestTallyEntries[String(preTestSelectedActivityIdx)] || {count_e:0,count_p:0,count_a:0});
      const summary = document.createElement('div');
      summary.style.cssText = 'display:flex; gap:10px; flex-wrap:wrap; margin:12px 0 20px;';
      summary.innerHTML = `<span class="cap" style="align-self:center;">This activity:</span>${['B', 'P', 'A'].map(g => `<span class="gd-pill">${gradeDot(g, 18)}<span>${t[{ B: 'count_e', P: 'count_p', A: 'count_a' }[g]] || 0}</span></span>`).join('')}<span class="cap" style="align-self:center;">Not assessed ${Math.max(0, pupils.length - (t.count_e || 0) - (t.count_p || 0) - (t.count_a || 0))}</span>`;
      entryWrap.appendChild(summary);
    }
    const cgRows = {}; // CG summary, worked out from the child marks: activities on the same CG add up
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => { const t = preTestTallyEntries[String(idx)] || {}; const r = cgRows[cgCode(a.cg)] = cgRows[cgCode(a.cg)] || { code: cgCode(a.cg), tot: { b: 0, p: 0, a: 0 }, items: [], titles: [] };
      r.tot.b += t.count_e || 0; r.tot.p += t.count_p || 0; r.tot.a += t.count_a || 0; r.items.push('Activity ' + (idx + 1)); r.titles.push('Activity ' + (idx + 1) + ' — ' + (a.activity || '') + (a.type ? ' (' + a.type + (a.page && a.page !== '—' ? ', page ' + a.page : '') + ')' : '')); });
    const cgList = Object.values(cgRows).sort((x, y) => cgMajor(x.code) - cgMajor(y.code) || parseFloat(x.code.slice(3)) - parseFloat(y.code.slice(3)));
    const cgWrap = document.createElement('div'); cgWrap.innerHTML = gradeTotalsTable(cgList, cgList.reduce((g, r) => ({ b: g.b + r.tot.b, p: g.p + r.tot.p, a: g.a + r.tot.a }), { b: 0, p: 0, a: 0 }), cgLevel);
    // CG summary is a collapsible section: a button that expands into the table (state is remembered across re-renders)
    const cgCard = document.createElement('div'); cgCard.className = 'card';
    const cgToggle = document.createElement('button'); cgToggle.type = 'button'; cgToggle.id = 'preTestCgSummaryToggle';
    cgToggle.style.cssText = 'width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; background:none; border:none; padding:0; margin:0; cursor:pointer; text-align:left; font:inherit; color:inherit;';
    const cgBody = document.createElement('div'); cgBody.id = 'preTestCgSummaryBody'; cgBody.style.cssText = 'margin-top:12px;';
    const cgNote = document.createElement('p'); cgNote.className = 'cap'; cgNote.textContent = 'Worked out from the child marks above \u2014 nothing to enter here. Activities on the same CG all add up.';
    cgBody.appendChild(cgNote); cgBody.appendChild(cgWrap);
    const cgPaint = () => {
      cgBody.style.display = preTestCgSummaryOpen ? '' : 'none';
      cgToggle.setAttribute('aria-expanded', preTestCgSummaryOpen ? 'true' : 'false');
      cgToggle.innerHTML = '<span style="font-size:16px; font-weight:700;">\uD83D\uDCCA CG summary \u2014 Pre-Test</span><span style="font-size:12px; font-weight:600; color:var(--text-muted);">' + (preTestCgSummaryOpen ? '\u25BE Hide' : '\u25B8 Show') + '</span>';
    };
    cgToggle.onclick = () => { preTestCgSummaryOpen = !preTestCgSummaryOpen; cgPaint(); };
    cgPaint();
    cgCard.appendChild(cgToggle); cgCard.appendChild(cgBody);
    // the same CG summary card as the Workbook screen (Show the table, the B / P / A mix, the class level)
    container.appendChild(preTestNotAssessedCard());
    // View switch: this sheet's CG summary, or a card for every Workbook and Classroom activity
    const viewBar = document.createElement('div');
    viewBar.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin:6px 0 12px;';
    [['sheet', 'Sheet summary'], ['all', 'All activities']].forEach(([k, lbl]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = lbl;
      b.style.cssText = 'padding:7px 15px; border-radius:999px; font:inherit; font-size:13px; font-weight:700; border:1px solid ' + (preTestSummaryView === k ? 'transparent' : '#C9D6CF') + '; background:' + (preTestSummaryView === k ? '#17765B' : '#fff') + '; color:' + (preTestSummaryView === k ? '#fff' : '#1D2B22') + '; cursor:pointer;';
      b.onclick = () => { preTestSummaryView = k; renderMonthlyAssessment(monthlyAssessmentTargetEl); };
      viewBar.appendChild(b);
    });
    container.appendChild(viewBar);
    if(preTestSummaryView === 'all'){
      container.appendChild(preTestAllActivityCards());
    } else
    if(typeof window.cgSummaryCardFor === 'function'){
      container.appendChild(window.cgSummaryCardFor('pretest', () => { if(typeof renderMonthlyAssessment === 'function' && typeof monthlyAssessmentTargetEl !== 'undefined') renderMonthlyAssessment(monthlyAssessmentTargetEl); }));
    } else { container.appendChild(cgCard); }
    if(typeof window.preTestAppendSubmitAndAttendance === 'function') window.preTestAppendSubmitAndAttendance(container);
    container.appendChild(mdSec(preTestTypeFilter + ' activities', '<span class="reqs">ASM-PT1…3</span>'));
    const cgGroups = [];
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((a, idx) => {
      if(a.type !== preTestTypeFilter) return;
      const cgMajor = (a.cg.match(/CG\s*(\d+)/) || [])[1] || '0';
      let group = cgGroups.find(g => g.cgMajor === cgMajor);
      if(!group){ group = {cgMajor, items:[]}; cgGroups.push(group); }
      group.items.push(Object.assign({}, a, {idx}));
    });
    cgGroups.sort((x,y)=>parseInt(x.cgMajor,10)-parseInt(y.cgMajor,10));
    let pickerTable = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="table-layout:fixed;width:100%;min-width:760px;border-collapse:separate;border-spacing:0;"><colgroup><col style="width:12%;"><col style="width:42%;"><col style="width:14%;"><col style="width:10%;"><col style="width:11%;"><col style="width:11%;"></colgroup><thead><tr><th>Curricular Goal</th><th>Activity</th><th>Specification</th><th style="text-align:center;"><span class="gd gd-B" style="width:20px; height:20px; font-size:10px;">B</span></th><th style="text-align:center;"><span class="gd gd-P" style="width:20px; height:20px; font-size:10px;">P</span></th><th style="text-align:center;"><span class="gd gd-A" style="width:20px; height:20px; font-size:10px;">A</span></th></tr></thead><tbody>';
    cgGroups.forEach(g => g.items.forEach((a,i) => {
      const t = preTestTallyEntries[String(a.idx)] || {count_e:0,count_p:0,count_a:0};
      pickerTable += `<tr style="border-bottom:1px solid var(--border);cursor:pointer;" onclick="preTestSelectedActivityIdx=${a.idx};renderMonthlyAssessment(monthlyAssessmentTargetEl);">${i===0 ? `<td rowspan="${g.items.length}" style="vertical-align:top;font-weight:600;padding:14px 12px;">CG-${esc(g.cgMajor)}</td>` : ''}<td style="word-wrap:break-word;text-align:left;padding:14px 12px;">${esc(a.activity)}</td><td class="dim" style="padding:14px 12px;">${esc(a.cg)}</td><td style="text-align:center;padding:14px 12px;">${t.count_e||0}</td><td style="text-align:center;padding:14px 12px;">${t.count_p||0}</td><td style="text-align:center;padding:14px 12px;">${t.count_a||0}</td></tr>`;
    }));
    pickerTable += '</tbody></table></div>';
    const pickerWrap = document.createElement('div'); pickerWrap.innerHTML = pickerTable;
    const tableCard = document.createElement('div');
    tableCard.className = 'card';
    const tableNote = document.createElement('p'); tableNote.className = 'cap'; tableNote.textContent = 'The Beginner · Proficient · Advanced counts are worked out automatically from the child-wise records above. Click an activity row to enter that activity.';
    tableCard.appendChild(tableNote); tableCard.appendChild(pickerWrap);
    // the activity table is removed: the CG summary card above and the child-wise grading stay
    const saveBar = document.createElement('div'); saveBar.className = 'card'; // same save bar as the other tabs
    saveBar.style.cssText = 'padding:16px 18px; margin:16px 0 24px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';
    saveBar.innerHTML = `<div style="flex:1; min-width:240px;"><b>Pre-Test is saved as you tap</b><p class="cap" style="margin:4px 0 0;">${totalMarked} of ${totalCells} marks entered. Each tap saves straight away on this device.</p></div><span class="gd-pill" style="font-weight:700; color:var(--success,#1e7a45);">✓ Saved</span>`;
    // the 'saved as you tap' bar is shown once (under the child list, by the CG summary)
  }
function renderPreTestImportCard(){
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="card" style="
      margin-top:4px;
      margin-bottom:20px;
      padding:16px 18px;
      overflow:hidden;
    ">
      <div style="
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:20px;
        align-items:center;
      ">
        <!-- LEFT: heading + description -->
        <div style="min-width:0;">
          <h3 style="
            margin:0 0 4px;
            font-family:var(--disp);
            font-size:14px;
            font-weight:700;
          ">
            📥 Import a file or photo — Pre-Test (BPA)
          </h3>
        </div>
        <!-- RIGHT: actions -->
        <div style="
          display:flex;
          align-items:center;
          justify-content:flex-end;
          gap:8px;
          flex-wrap:wrap;
        ">
          <button
            type="button"
            class="btn"
            style="
              width:auto;
              min-width:150px;
              padding:9px 16px;
              white-space:nowrap;
            "
            onclick="scanPreTestBpaPhoto()">
            📷 Scan a photo
          </button>
          <button
            type="button"
            class="btn-primary"
            style="
              width:auto;
              min-width:150px;
              padding:9px 16px;
              white-space:nowrap;
            "
            onclick="document.getElementById('preTestImportInput').click()">
            📥 Import a file
          </button>
          <button
            type="button"
            class="btn"
            style="
              width:auto;
              min-width:150px;
              padding:9px 16px;
              white-space:nowrap;
            "
            onclick="preTestGoToEntry()">
            ✍ Enter manually
          </button>
          <button
            type="button"
            class="btn"
            style="
              width:auto;
              min-width:165px;
              padding:9px 16px;
              white-space:nowrap;
            "
            onclick="downloadPreTestBpaTemplate()">
            ↓ Download BPA template
          </button>
        </div>
      </div>
      <input
        type="file"
        id="preTestImportInput"
        accept=".xlsx,.xls,.csv"
        style="display:none;"
        onchange="importPreTestFile()"
      />
      <div
        id="preTestImportResult"
        style="
          margin-top:12px;
          word-break:break-word;
          overflow-wrap:anywhere;
        ">
      </div>
    </div>
  `;
  /*
   * Mobile:
   * stack description above buttons instead of squeezing the buttons.
   */
  const card = wrap.firstElementChild;
  const grid = card.firstElementChild;
  function adjustPreTestImportLayout(){
    if(window.innerWidth <= 900){
      grid.style.gridTemplateColumns = '1fr';
      const actions = grid.children[1];
      actions.style.justifyContent = 'flex-start';
    } else {
      grid.style.gridTemplateColumns = 'minmax(0,1fr) auto';
      const actions = grid.children[1];
      actions.style.justifyContent = 'flex-end';
    }
  }
  adjustPreTestImportLayout();
  /*
   * Avoid registering the same resize listener repeatedly.
   */
  if(!window.__preTestImportResizeBound){
    window.__preTestImportResizeBound = true;
    window.addEventListener('resize', () => {
      const card = document.querySelector('.card[data-pretest-import-card]');
      if(!card) return;
      const grid = card.firstElementChild;
      if(!grid) return;
      if(window.innerWidth <= 900){
        grid.style.gridTemplateColumns = '1fr';
        const actions = grid.children[1];
        if(actions) actions.style.justifyContent = 'flex-start';
      } else {
        grid.style.gridTemplateColumns = 'minmax(0,1fr) auto';
        const actions = grid.children[1];
        if(actions) actions.style.justifyContent = 'flex-end';
      }
    });
  }
  card.setAttribute('data-pretest-import-card','1');
  return wrap;
}
/*
 * Download the BPA template.
 *
 * The template contains:
 *   - school heading
 *   - class heading
 *   - academic year
 *   - Pre-Test BPA heading
 *   - register number
 *   - child name
 *   - activity number
 *   - B / P / A columns
 *
 * One row = one child × one activity.
 */
function downloadPreTestBpaTemplate(){
  const pupils = assessmentPupilNames();
  const schoolName =
    (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.school_name)
      ? myClassInfo.school_name
      : '';
  const className =
    (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_name)
      ? myClassInfo.class_name
      : '';
  const academicYear =
    (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.academic_year)
      ? myClassInfo.academic_year
      : new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);
  /*
   * Header information — similar to the attendance sheets.
   */
  const rows = [
    [schoolName],
    [className],
    ['PRE-TEST ASSESSMENT — BPA'],
    ['Academic Year: ' + academicYear],
    [''],
    ['B = Beginner', 'P = Proficient', 'A = Advanced'],
    [''],
    ['child_name', 'register_no', 'activity_no', 'B', 'P', 'A']
  ];
  /*
   * One row for every child × activity.
   */
  pupils.forEach(name => {
    const pupil =
      Array.isArray(realPupilsCache)
        ? realPupilsCache.find(p => p.name === name)
        : null;
    const reg =
      pupil &&
      (
        pupil.register_no ||
        pupil.register_number ||
        pupil.roll_no ||
        pupil.admission_no
      )
        ? (
            pupil.register_no ||
            pupil.register_number ||
            pupil.roll_no ||
            pupil.admission_no
          )
        : '';
    WEEKLY_ASSESSMENT_ACTIVITIES.forEach((activity, idx) => {
      rows.push([
        name,
        reg,
        idx + 1,
        0,
        0,
        0
      ]);
    });
  });
  /*
   * Prefer XLSX because the template is meant to look like
   * the school's assessment/attendance sheets.
   */
  if(typeof XLSX !== 'undefined'){
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    /*
     * Merge the heading rows.
     */
    ws['!merges'] = [
      { s:{r:0,c:0}, e:{r:0,c:5} },
      { s:{r:1,c:0}, e:{r:1,c:5} },
      { s:{r:2,c:0}, e:{r:2,c:5} },
      { s:{r:3,c:0}, e:{r:3,c:5} }
    ];
    /*
     * Column widths.
     */
    ws['!cols'] = [
      { wch:28 },  // child name
      { wch:15 },  // register no.
      { wch:14 },  // activity no.
      { wch:8 },   // B
      { wch:8 },   // P
      { wch:8 }    // A
    ];
    /*
     * Basic heading styling.
     */
    const headingRows = [0,1,2,3];
    headingRows.forEach(r => {
      const cell = ws[XLSX.utils.encode_cell({r:r,c:0})];
      if(cell){
        cell.s = {
          font:{
            bold:true,
            sz:r === 2 ? 14 : 11
          },
          alignment:{
            horizontal:'center',
            vertical:'center'
          }
        };
      }
    });
    /*
     * Style the actual import header.
     */
    ['A8','B8','C8','D8','E8','F8'].forEach(ref => {
      if(ws[ref]){
        ws[ref].s = {
          font:{bold:true},
          alignment:{
            horizontal:'center',
            vertical:'center'
          }
        };
      }
    });
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'BPA PRE-TEST'
    );
    XLSX.writeFile(
      wb,
      'Pre-Test-BPA-Template.xlsx'
    );
    return;
  }
  /*
   * CSV fallback if XLSX is not loaded.
   */
  const csv = rows
    .map(row =>
      row
        .map(cell =>
          `"${String(cell).replace(/"/g,'""')}"`
        )
        .join(',')
    )
    .join('\n');
  const blob = new Blob(
    [csv],
    {type:'text/csv;charset=utf-8;'}
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Pre-Test-BPA-Template.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
  // "✍ Enter manually": SHOW the child grading list (hidden until now) and bring it into view.
  // The top bar is fixed, so the scroll clears its real height (taller with the Jr KG / Sr KG switch).
  function preTestGoToEntry(){
    preTestManualOpen = true; // remembered, so any re-render keeps the list open
    let list = document.getElementById('preTestEntryList');
    if(!list && typeof renderMonthlyAssessment === 'function' && typeof monthlyAssessmentTargetEl !== 'undefined' && monthlyAssessmentTargetEl){
      renderMonthlyAssessment(monthlyAssessmentTargetEl); // page was drawn before the flag was set: draw it again, now open
      list = document.getElementById('preTestEntryList');
    }
    if(list) list.style.display = '';
    const pickerBar = document.getElementById('preTestPickerBar'); if(pickerBar) pickerBar.style.display = '';
    const sel = document.getElementById('preTestTypeSelect'); if(!sel) return;
    const bar = sel.closest('.fbar') || sel.parentElement;
    const tb = document.querySelector('.topbar');
    const offset = (tb ? tb.getBoundingClientRect().height : 0) + 56; // leaves the picker bar visible
    window.scrollTo({ top: bar.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  }
  // The Pre-Test "Enter manually" button is built by another file (part 27 / import card). Listen for its
  // click here so the list opens no matter which later file wraps assessManualSheet().
  if(!window.__preTestEntryClickHook){
    window.__preTestEntryClickHook = true;
    document.addEventListener('click', function(e){
      const btn = e.target && e.target.closest ? e.target.closest('button') : null; if(!btn) return;
      const oc = btn.getAttribute('onclick') || '';
      if(oc.indexOf("assessManualSheet('pretest')") !== -1) setTimeout(preTestGoToEntry, 0);
    }, true);
  }
// ---- Pre-Test: the same Submit section and Attendance-only section as the Workbook screen ----
(function(){
  const cache = window.preTestSubmissionCache = window.preTestSubmissionCache || {};
  const termKey = () => 'TERM_' + (typeof currentAssessTerm === 'function' ? currentAssessTerm() : 1);
  const classKey = () => (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_id) || null;
  const qs = () => (window.location.search || '').replace(/^\?/, '');
  const esc2 = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function redrawPreTest(){ if(typeof renderMonthlyAssessment === 'function' && typeof monthlyAssessmentTargetEl !== 'undefined' && monthlyAssessmentTargetEl) renderMonthlyAssessment(monthlyAssessmentTargetEl); }
  function load(){
    const cid = classKey(), term = termKey(); if(!cid) return 'loading';
    const k = cid + '|' + term;
    if(cache[k] !== undefined) return cache[k];
    cache[k] = 'loading';
    fetch('backend/assessment/pretest/get_pretest_term_submission.php?class_id=' + encodeURIComponent(cid) + '&term=' + encodeURIComponent(term) + '&' + qs(), { cache: 'no-store' })
      .then(r => r.json()).then(d => { cache[k] = d.status === 'success' && d.submitted ? d : { submitted: false }; redrawPreTest(); })
      .catch(() => { cache[k] = 'error'; redrawPreTest(); });
    return 'loading';
  }
  // the Pre-Test submit state for the current term, read by the Assessment tabs
  window.preTestSubmittedState = function(){
    const r = load();
    if(r === 'loading') return 'loading';
    if(r === 'error') return 'error';
    return (r && r.submitted) ? 'yes' : 'no';
  };
  async function post(url){
    const cid = classKey(), term = termKey();
    const res = await fetch(url + '?' + qs(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class_id: cid, term }) });
    const d = await res.json();
    if(d.status !== 'success') throw new Error(d.message || 'Not saved.');
    delete cache[cid + '|' + term];
    redrawPreTest();
  }
  window.submitPreTestTerm = async function(){ try { await post('backend/assessment/pretest/submit_pretest_term.php'); } catch(e){ alert(e.message || e); } };
  window.unsubmitPreTestTerm = async function(){ try { await post('backend/assessment/pretest/unsubmit_pretest_term.php'); } catch(e){ alert(e.message || e); } };
  window.preTestAppendSubmitAndAttendance = function(container){
    const st = load();
    const submitCard = document.createElement('div');
    submitCard.className = 'card'; submitCard.style.cssText = 'padding:16px 18px; margin-top:20px; margin-bottom:14px;';
    const term = termKey().replace('TERM_', 'Term ');
    if(st === 'loading' || !classKey()){
      submitCard.innerHTML = '<p class="cap" style="margin:0;">Checking submission status…</p>';
    } else if(st === 'error'){
      submitCard.innerHTML = '<p class="cap" style="margin:0 0 8px; color:var(--danger, #c8433f);">Could not check the submission status.</p>';
    } else if(st.submitted){
      const when = st.submitted_at ? new Date(String(st.submitted_at).replace(' ', 'T')).toLocaleDateString([], {day:'numeric', month:'short', year:'numeric'}) : '';
      submitCard.innerHTML = `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div><b style="color:var(--success);">✓ Pre-Test ${esc2(term)} submitted</b><p class="cap" style="margin:4px 0 0;">${st.submitted_by_name ? esc2(st.submitted_by_name) + ' · ' : ''}${esc2(when)}</p></div>
        <button style="padding:7px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12.5px; cursor:pointer;" onclick="unsubmitPreTestTerm()">Undo submission</button>
      </div>`;
    } else {
      submitCard.innerHTML = `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div><b>Not yet submitted</b><p class="cap" style="margin:4px 0 0;">Covers the whole Pre-Test for ${esc2(term)} — submit once all the children's marks are ready.</p></div>
        <button class="btn-primary" style="width:auto; padding:9px 18px;" onclick="submitPreTestTerm()">Submit marks for ${esc2(term)}</button>
      </div>`;
    }
    submitCard.style.margin = '0 0 18px'; // space before the CG summary card
    container.appendChild(submitCard);
    if(typeof window.attendanceOnlyCardInto === 'function') window.attendanceOnlyCardInto(container);
  };
})();
