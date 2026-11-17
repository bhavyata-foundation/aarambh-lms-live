/* =========================================================================
   js/render/myday-coverage.js — the "📊 Insights" tab (My Day · My Class · Insights)
   -------------------------------------------------------------------------
   A tab of its own next to My Class: the Activity coverage report — how
   many of the scheduled activities the teacher has RECORDED and how many
   she has COVERED — for This day · This week · Year so far, with a week
   picker. (It used to sit inside My Day → Activities & Overview.)
   Below it, the ACTIVITY RECORD: every scheduled activity (given activity,
   the teacher's record, materials, evidence) and whether it was completed —
   filter All / Completed / Not completed; download as Excel or PDF.

     scheduled   every activity card (activity area × school day) up to today
                 (future days are not counted)
     recorded    the card has her own plan, a chosen suggestion, or materials
     covered     the card is marked done (session done on My Day)

   It shows the three numbers, plan → practice bars (and what is recorded but
   not covered / covered with nothing recorded), each activity area, and the
   week as a grid (days × areas) — or, for the year, a bar per week.
   Reads dailyPlanEntries / sessionDoneEntries (daily-plan-sync.js); loads
   any week it still needs. Loads after the part files (wraps renderMyDay).
   ========================================================================= */
(function(){
  'use strict';
  if(typeof renderMyDay !== 'function') return;
  window.covScope = window.covScope || 'week';   // 'day' | 'week' | 'month' | 'year'
  window.myDayInsights = window.myDayInsights || false; // the Insights tab is showing (it is drawn in myday-body)
  window.covOpen = window.covOpen !== false;
  const askedWeeks = {};

  const C = { cov: '#2E8B5E', rec: '#E0A526', none: '#E6EAE7', bg: '#EEF1EE', text: '#1D2B22', muted: '#5B6B62' };
  const areas = () => (typeof DOMAINS !== 'undefined' && Array.isArray(DOMAINS)) ? DOMAINS : [];
  const days = () => (typeof MYDAY_DAY_KEYS !== 'undefined') ? MYDAY_DAY_KEYS : ['mon', 'tue', 'wed', 'thu', 'fri'];
  const dayName = d => (typeof MYDAY_DAY_FULL !== 'undefined' && MYDAY_DAY_FULL[d]) || d;
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  // one card's state
  function card(week, day, areaKey){
    const key = dailyPlanKey(week, day, areaKey), e = (typeof dailyPlanEntries !== 'undefined' && dailyPlanEntries[key]) || {};
    const recorded = !!((e.text && String(e.text).trim()) || e.usedSuggestion || (Array.isArray(e.materials) && e.materials.some(m => String(m || '').trim())));
    const covered = !!(typeof sessionDoneEntries !== 'undefined' && sessionDoneEntries[key]);
    return { recorded, covered };
  }
  // which (week, day) pairs count: school days up to today, holidays left out
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dateOf = (w, d) => typeof getRealDateForWeekDay === 'function' ? getRealDateForWeekDay(w, d) : null;
  const holiday = (w, d) => typeof holidayNameForWeekDay === 'function' ? !!holidayNameForWeekDay(w, d) : false;
  function scope(){
    const wk = typeof currentWeekNum !== 'undefined' ? currentWeekNum : 1;
    const allW = (typeof WEEKS !== 'undefined' && WEEKS.length) ? WEEKS.map(x => x.w) : [wk];
    const now = new Date(); now.setHours(23, 59, 59, 0);
    const today = typeof todayMyDayIndex !== 'undefined' && todayMyDayIndex !== null ? todayMyDayIndex : days().length - 1;
    const isPast = (w, d, i) => { const dt = dateOf(w, d); return dt ? dt <= now : (w < wk || (w === wk && i <= today)); };
    const school = (w, d, i) => isPast(w, d, i) && !holiday(w, d);
    const cellsOf = ws => ws.flatMap(w => days().map((d, i) => [w, d, i]).filter(([w2, d2, i2]) => school(w2, d2, i2)).map(([w2, d2]) => [w2, d2]));
    const selDay = days()[typeof myDayIndex !== 'undefined' ? myDayIndex : today] || days()[0];
    if(window.covScope === 'day') return { label: dayName(selDay) + ', Week ' + wk + (holiday(wk, selDay) ? ' (holiday)' : ''), cells: holiday(wk, selDay) ? [] : [[wk, selDay]], weeks: [wk] };
    if(window.covScope === 'week') return { label: 'Week ' + wk + ' (to date)', cells: cellsOf([wk]), weeks: [wk] };
    if(window.covScope === 'month'){
      const ref = dateOf(wk, selDay) || new Date(), y = ref.getFullYear(), m = ref.getMonth();
      const inMonth = (w, d) => { const dt = dateOf(w, d); return dt && dt.getFullYear() === y && dt.getMonth() === m; };
      const cells = allW.flatMap(w => days().map((d, i) => [w, d, i]).filter(([w2, d2, i2]) => inMonth(w2, d2) && school(w2, d2, i2)).map(([w2, d2]) => [w2, d2]));
      return { label: MONTHS[m] + ' ' + y + ' (to date)', cells, weeks: [...new Set(cells.map(c => c[0]))], month: { y, m } };
    }
    const upToNow = allW.filter(w => w <= wk);
    return { label: 'Year so far (Week ' + upToNow[0] + '–' + wk + ')', cells: cellsOf(upToNow), weeks: upToNow };
  }
  function loaded(weeks){
    const missing = weeks.filter(w => !(typeof dailyPlanEntriesLoadedWeeks !== 'undefined' && dailyPlanEntriesLoadedWeeks[w]));
    if(!missing.length) return true;
    const ask = missing.filter(w => !askedWeeks[w]); ask.forEach(w => { askedWeeks[w] = true; });
    if(ask.length && typeof ensureDailyPlanEntriesLoaded === 'function') Promise.all(ask.map(w => ensureDailyPlanEntriesLoaded(false, w))).then(() => {
      const b = document.getElementById('myday-body'); if(b && !b.classList.contains('hidden')) renderMyDay(); }).catch(() => {});
    return false;
  }

  window.covSetScope = s => { window.covScope = s; renderMyDay(); };
  window.covToggle = () => { window.covOpen = !window.covOpen; renderMyDay(); };

  function build(inTab){
    if(inTab) window.covOpen = true;
    const S = scope(), A = areas();
    const wrap = document.createElement('div'); wrap.className = 'card'; wrap.setAttribute('data-coverage-report', '');
    wrap.style.cssText = 'padding:18px 20px;';
    const chip = (k, t) => `<button type="button" onclick="covSetScope('${k}')" style="padding:6px 14px; border-radius:999px; font:inherit; font-size:13px; font-weight:700; cursor:pointer; border:1px solid ${window.covScope === k ? 'var(--primary, #1E8F5E)' : 'var(--border, #D6DCD7)'}; background:${window.covScope === k ? 'var(--primary, #1E8F5E)' : '#fff'}; color:${window.covScope === k ? '#fff' : C.text};">${t}</button>`;
    const head = `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="covToggle()"><b style="font-size:16px;">📊 Activity coverage</b><span class="cap" style="margin:0;">${window.covOpen ? '— ' + esc(S.label) : '— recorded and covered activities'}</span></div>
        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">${window.covOpen ? chip('day', 'This day') + chip('week', 'This week') + chip('month', 'This month') + chip('year', 'Year so far') : ''}<button type="button" onclick="covToggle()" ${inTab ? 'hidden' : ''} style="padding:6px 12px; border-radius:8px; border:1px solid var(--border, #D6DCD7); background:#fff; font:inherit; font-size:12.5px; font-weight:700; color:var(--primary-dark, #17765B); cursor:pointer;">${window.covOpen ? '▾ Hide' : '▸ Show'}</button></div></div>`;
    if(!window.covOpen){ wrap.innerHTML = head; return wrap; }
    if(!loaded(S.weeks)){ wrap.innerHTML = head + '<p class="cap" style="margin:12px 0 0;">Loading the activity cards…</p>'; return wrap; }

    // count
    let sch = 0, rec = 0, cov = 0, recOnly = 0, covNoRec = 0;
    const byArea = A.map(a => ({ a, sch: 0, rec: 0, cov: 0 })), byWeek = {};
    S.cells.forEach(([w, d]) => A.forEach((a, i) => {
      const c = card(w, d, a.key); sch++; byArea[i].sch++;
      const bw = byWeek[w] || (byWeek[w] = { sch: 0, rec: 0, cov: 0 }); bw.sch++;
      if(c.recorded){ rec++; byArea[i].rec++; bw.rec++; }
      if(c.covered){ cov++; byArea[i].cov++; bw.cov++; }
      if(c.recorded && !c.covered) recOnly++;
      if(c.covered && !c.recorded) covNoRec++;
    }));
    const big = (label, n, of, col, note) => `<div style="flex:1 1 180px; padding:14px 16px; border:1px solid #E3E7E3; border-radius:12px; background:#fff;">
        <div style="font-size:11.5px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:${C.muted};">${label}</div>
        <div style="display:flex; align-items:baseline; gap:6px; margin-top:4px;"><b style="font-size:30px; line-height:1; color:${col};">${n}</b><span style="font-size:13px; color:${C.muted}; font-weight:600;">${of}</span></div>
        <div class="cap" style="margin:4px 0 0;">${note}</div></div>`;
    const ring = `<div style="flex:none; width:104px; height:104px; border-radius:50%; background:conic-gradient(${C.cov} ${pct(cov, sch) * 3.6}deg, ${C.bg} 0); display:grid; place-items:center;" role="img" aria-label="${pct(cov, sch)}% covered">
        <div style="width:80px; height:80px; border-radius:50%; background:#fff; display:grid; place-items:center; text-align:center; line-height:1.05;"><b style="font-size:22px;">${pct(cov, sch)}%</b><span style="font-size:11px; color:${C.muted};">covered</span></div></div>`;
    const kpis = `<div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin:14px 0 6px;">${ring}
        ${big('Activities scheduled', sch, 'cards', C.text, A.length + ' activity areas × ' + (S.cells.length) + ' school day' + (S.cells.length === 1 ? '' : 's') + ' (holidays left out)')}
        ${big('Recorded', rec, pct(rec, sch) + '% of scheduled', C.rec, 'own plan, a chosen suggestion, or materials')}
        ${big('Covered', cov, pct(cov, sch) + '% of scheduled', C.cov, 'marked done on My Day')}</div>`;

    // plan → practice
    const hbar = (label, n, col, extra) => `<div style="display:grid; grid-template-columns:150px 1fr 70px; gap:10px; align-items:center; margin:7px 0;">
        <span style="font-size:13px; font-weight:700;">${label}</span>
        <div style="height:14px; border-radius:7px; background:${C.bg}; overflow:hidden;"><div style="height:100%; width:${pct(n, sch)}%; background:${col}; border-radius:7px;"></div></div>
        <span style="font-size:13px; font-weight:700; text-align:right;">${n}${extra || ''}</span></div>`;
    const funnel = `<div style="margin-top:12px; padding:14px 16px; border:1px solid #E3E7E3; border-radius:12px;">
        <div style="font-size:12px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:${C.muted}; margin-bottom:4px;">From plan to practice</div>
        ${hbar('Scheduled', sch, '#9AA8A0')}${hbar('Recorded', rec, C.rec, ' · ' + pct(rec, sch) + '%')}${hbar('Covered', cov, C.cov, ' · ' + pct(cov, sch) + '%')}
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:8px;">
          <span style="padding:5px 11px; border-radius:999px; font-size:12.5px; font-weight:700; background:#FFF1CC; color:#7A5300;">${recOnly} recorded, not covered yet</span>
          <span style="padding:5px 11px; border-radius:999px; font-size:12.5px; font-weight:700; background:#EEF1EE; color:${C.muted};">${covNoRec} covered with nothing recorded</span>
          <span style="padding:5px 11px; border-radius:999px; font-size:12.5px; font-weight:700; background:#EEF1EE; color:${C.muted};">${sch - rec - covNoRec} not recorded, not covered</span></div></div>`;

    // by activity area
    const areaRows = byArea.map(x => `<div style="display:grid; grid-template-columns:170px 1fr 1fr; gap:10px; align-items:center; padding:6px 0; border-top:1px solid #F0F2F0;">
        <span style="font-size:13px; font-weight:700;">${esc(x.a.label)}</span>
        <div title="Recorded ${x.rec} of ${x.sch}"><div style="height:9px; border-radius:5px; background:${C.bg}; overflow:hidden;"><div style="height:100%; width:${pct(x.rec, x.sch)}%; background:${C.rec};"></div></div><span class="cap" style="margin:0; font-size:11.5px;">recorded ${x.rec}/${x.sch}</span></div>
        <div title="Covered ${x.cov} of ${x.sch}"><div style="height:9px; border-radius:5px; background:${C.bg}; overflow:hidden;"><div style="height:100%; width:${pct(x.cov, x.sch)}%; background:${C.cov};"></div></div><span class="cap" style="margin:0; font-size:11.5px;">covered ${x.cov}/${x.sch}</span></div></div>`).join('');
    const areaCard = `<div style="padding:14px 16px; border:1px solid #E3E7E3; border-radius:12px;"><div style="font-size:12px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:${C.muted}; margin-bottom:4px;">By activity area</div>${areaRows}</div>`;

    // the week as a grid, or the year as a bar per week
    let grid;
    if(window.covScope === 'day' || window.covScope === 'week'){
      const wk = S.weeks[0], ds = days(), shown = new Set(S.cells.map(c => c[1]));
      const cell = (d, a) => { if(!shown.has(d)) return `<div title="${esc(dayName(d))} — not yet" style="height:26px; border-radius:6px; border:1px dashed #D6DCD7;"></div>`;
        const c = card(wk, d, a.key), col = c.covered ? C.cov : c.recorded ? C.rec : C.none;
        return `<div title="${esc(a.label)}, ${esc(dayName(d))}: ${c.covered ? 'covered' : c.recorded ? 'recorded, not covered' : 'nothing recorded'}" style="height:26px; border-radius:6px; background:${col}; color:#fff; font-size:12px; font-weight:800; display:grid; place-items:center;">${c.covered ? '✓' : c.recorded ? '•' : ''}</div>`; };
      grid = `<div style="padding:14px 16px; border:1px solid #E3E7E3; border-radius:12px;"><div style="font-size:12px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:${C.muted}; margin-bottom:8px;">Week ${wk} — day by day</div>
        <div style="display:grid; grid-template-columns:150px repeat(${ds.length}, minmax(0, 1fr)); gap:5px; align-items:center; font-size:12px;">
          <span></span>${ds.map(d => `<b style="text-align:center;">${esc(dayName(d).slice(0, 3))}</b>`).join('')}
          ${A.map(a => `<span style="font-weight:700;">${esc(a.label)}</span>${ds.map(d => cell(d, a)).join('')}`).join('')}</div>
        <div style="display:flex; gap:14px; flex-wrap:wrap; font-size:12px; margin-top:10px;"><span><span style="display:inline-block; width:11px; height:11px; border-radius:3px; background:${C.cov};"></span> covered</span><span><span style="display:inline-block; width:11px; height:11px; border-radius:3px; background:${C.rec};"></span> recorded, not covered</span><span><span style="display:inline-block; width:11px; height:11px; border-radius:3px; background:${C.none};"></span> nothing recorded</span><span><span style="display:inline-block; width:11px; height:11px; border-radius:3px; border:1px dashed #B8C2BC;"></span> later this week</span></div></div>`;
    } else {
      // month: a bar per week of it · year: a bar per month
      const groups = {}, order = [];
      S.cells.forEach(([w, d]) => { const dt = dateOf(w, d), k = window.covScope === 'year' ? (dt ? dt.getFullYear() * 12 + dt.getMonth() : 'W' + w) : 'W' + w;
        if(!groups[k]){ groups[k] = { label: window.covScope === 'year' ? (dt ? MONTHS[dt.getMonth()].slice(0, 3) + ' ' + String(dt.getFullYear()).slice(2) : 'W' + w) : 'Week ' + w, sch: 0, rec: 0, cov: 0 }; order.push(k); }
        A.forEach(a => { const c = card(w, d, a.key), g = groups[k]; g.sch++; if(c.recorded) g.rec++; if(c.covered) g.cov++; }); });
      const maxH = 110, title = window.covScope === 'year' ? 'Month by month' : 'Week by week in ' + S.label.replace(' (to date)', '');
      grid = `<div style="padding:14px 16px; border:1px solid #E3E7E3; border-radius:12px;"><div style="font-size:12px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:${C.muted}; margin-bottom:8px;">${title} — % covered (amber: % recorded)</div>
        <div style="display:flex; align-items:flex-end; gap:10px; height:${maxH + 52}px; overflow-x:auto; padding-top:4px;">${order.map(k => { const b = groups[k], pc = pct(b.cov, b.sch), pr = pct(b.rec, b.sch);
          return `<div title="${esc(b.label)}: recorded ${b.rec}/${b.sch} (${pr}%), covered ${b.cov}/${b.sch} (${pc}%)" style="flex:1 0 54px; max-width:110px; display:flex; flex-direction:column; align-items:center; gap:3px;">
            <span style="font-size:11px; font-weight:800; color:${C.muted};">${pc}%</span>
            <div style="width:100%; height:${maxH}px; display:flex; align-items:flex-end; gap:3px;"><div style="flex:1; height:${pr}%; background:${C.rec}; border-radius:3px 3px 0 0;"></div><div style="flex:1; height:${pc}%; background:${C.cov}; border-radius:3px 3px 0 0;"></div></div>
            <span style="font-size:11.5px; font-weight:700;">${esc(b.label)}</span></div>`; }).join('') || '<span class="cap">No school days yet.</span>'}</div></div>`;
    }
    wrap.innerHTML = head + kpis + funnel + `<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(380px, 1fr)); gap:12px; margin-top:12px;">${areaCard}${grid}</div>`
      + `<p class="cap" style="margin:10px 0 0;">Recorded = her own plan, a chosen suggestion or materials on the activity card. Covered = marked done on My Day. Only school days up to today are counted; holidays (as on the attendance register) are left out.</p>`;
    return wrap;
  }

  // ---- ACTIVITY RECORD: every scheduled activity, what the teacher recorded, and whether it was done ----
  window.covRecFilter = window.covRecFilter || 'all';             // 'all' | 'done' | 'notdone'
  window.covSetRecFilter = f => { window.covRecFilter = f; renderMyDay(); };
  let evAsked = false;
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dayLabel = (w, d) => { const dt = dateOf(w, d); return (dayName(d) || d).slice(0, 3) + (dt ? ' ' + dt.getDate() + ' ' + MON[dt.getMonth()] + ' ' + dt.getFullYear() : ' · Week ' + w); };
  function recordRows(S){
    const out = [];
    S.cells.forEach(([w, d]) => areas().forEach(a => {
      const key = dailyPlanKey(w, d, a.key), e = (typeof dailyPlanEntries !== 'undefined' && dailyPlanEntries[key]) || {};
      const plan = (typeof WEEKLY_PLAN !== 'undefined' && WEEKLY_PLAN['wk' + w] && WEEKLY_PLAN['wk' + w][a.key]) || {};
      const topicO = (typeof WEEK_DAY_TOPICS !== 'undefined' && WEEK_DAY_TOPICS['wk' + w] && WEEK_DAY_TOPICS['wk' + w][d]) || null;
      const own = e.text && String(e.text).trim() ? String(e.text).trim() : '';
      const sug = e.usedSuggestion ? (typeof e.usedSuggestion === 'string' ? e.usedSuggestion : 'the suggested activity') : '';
      const mats = Array.isArray(e.materials) ? e.materials.map(m => String(m || '').trim()).filter(Boolean) : [];
      const ev = (typeof uploadedEvidenceRecords !== 'undefined' && typeof evidenceKey === 'function' && uploadedEvidenceRecords[evidenceKey(w, d, a.key)]) || [];
      const done = !!(typeof sessionDoneEntries !== 'undefined' && sessionDoneEntries[key]);
      const recorded = !!(own || sug || mats.length);
      out.push({ w, d, date: dayLabel(w, d), topic: topicO ? (topicO.link || topicO.value || '') : '', area: a.label, time: a.time || '', cg: a.cg || '',
        given: plan[d] || '', record: own ? 'Own plan: ' + own : sug ? 'Used ' + sug : '', mats, ev: ev.length, evLinks: ev.map(x => x.driveLink).filter(Boolean),
        status: done ? 'done' : recorded ? 'planned' : 'none' });
    }));
    return out;
  }
  const STATUS = { done: ['✓ Completed', '#DDF2E5', '#1E6B46'], planned: ['◐ Planned, not done', '#FFF1CC', '#7A5300'], none: ['✗ Not completed', '#FCE3E1', '#9B1C1C'] };
  function record(){
    const S = scope(), wrap = document.createElement('div'); wrap.className = 'card'; wrap.setAttribute('data-activity-record', ''); wrap.style.cssText = 'padding:18px 20px; margin-top:16px;';
    if(!loaded(S.weeks)){ wrap.innerHTML = '<b>📋 Activity record</b><p class="cap" style="margin:8px 0 0;">Loading the activity cards…</p>'; return wrap; }
    // evidence photos: loaded once for the class
    if(!evAsked && typeof syncSessionEvidenceWithServer === 'function' && typeof myClassInfo !== 'undefined' && myClassInfo.class_id){
      evAsked = true; Promise.resolve(syncSessionEvidenceWithServer(myClassInfo.class_id)).then(() => { if(window.myDayInsights) renderMyDay(); }).catch(() => {}); }
    const all = recordRows(S), f = window.covRecFilter;
    const rows = all.filter(r => f === 'all' || (f === 'done' ? r.status === 'done' : r.status !== 'done'));
    const nDone = all.filter(r => r.status === 'done').length, nPlan = all.filter(r => r.status === 'planned').length, nNone = all.length - nDone - nPlan;
    const chip = (k, t) => `<button type="button" onclick="covSetRecFilter('${k}')" style="padding:6px 13px; border-radius:999px; font:inherit; font-size:13px; font-weight:700; cursor:pointer; border:1px solid ${f === k ? 'var(--primary, #1E8F5E)' : 'var(--border, #D6DCD7)'}; background:${f === k ? 'var(--primary, #1E8F5E)' : '#fff'}; color:${f === k ? '#fff' : C.text};">${t}</button>`;
    let lastDay = '';
    const body = rows.map(r => {
      const first = r.date !== lastDay; lastDay = r.date; const [st, bg, fg] = STATUS[r.status];
      return `<tr style="${first ? 'border-top:2px solid #D6DCD7;' : ''}">
        <td style="text-align:left; white-space:nowrap; vertical-align:top;">${first ? `<b>${esc(r.date)}</b>${r.topic ? `<div class="cap" style="margin:2px 0 0; font-size:11.5px; white-space:normal; max-width:160px;">${esc(r.topic)}</div>` : ''}` : ''}</td>
        <td style="text-align:left; vertical-align:top;"><b>${esc(r.area)}</b><div class="cap" style="margin:2px 0 0; font-size:11.5px;">${esc([r.time, r.cg].filter(Boolean).join(' · '))}</div></td>
        <td style="text-align:left; vertical-align:top;">${r.given ? esc(r.given) : '<span class="cap" style="margin:0;">—</span>'}</td>
        <td style="text-align:left; vertical-align:top;">${r.record ? esc(r.record) : '<span class="cap" style="margin:0;">—</span>'}</td>
        <td style="text-align:left; vertical-align:top; font-size:12.5px;">${r.mats.length ? esc(r.mats.join(', ')) : '<span class="cap" style="margin:0;">—</span>'}</td>
        <td style="text-align:center; vertical-align:top; white-space:nowrap;">${r.ev ? (r.evLinks[0] ? `<a href="${esc(r.evLinks[0])}" target="_blank" rel="noopener">${r.ev} photo${r.ev === 1 ? '' : 's'}</a>` : r.ev + ' photo' + (r.ev === 1 ? '' : 's')) : '<span class="cap" style="margin:0;">—</span>'}</td>
        <td style="vertical-align:top;"><span style="display:inline-block; padding:3px 9px; border-radius:999px; font-size:12px; font-weight:800; white-space:nowrap; background:${bg}; color:${fg};">${st}</span></td></tr>`; }).join('');
    wrap.innerHTML = `<div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center;">
        <div><b style="font-size:16px;">📋 Activity record</b> <span class="cap" style="margin:0;">— ${esc(S.label)}</span></div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">${chip('all', 'All ' + all.length)}${chip('done', 'Completed ' + nDone)}${chip('notdone', 'Not completed ' + (all.length - nDone))}</div></div>
      <div data-record-body>
      <p style="margin:10px 0 10px; font-size:13.5px;"><b style="color:#1E6B46;">Completed ${nDone}</b> of ${all.length} scheduled activities${all.length ? ' (' + pct(nDone, all.length) + '%)' : ''} · <b style="color:#7A5300;">planned, not done ${nPlan}</b> · <b style="color:#9B1C1C;">not completed ${nNone}</b></p>
      ${rows.length ? `<div style="overflow-x:auto;"><table class="report-table" style="width:100%; font-size:13px; min-width:980px;"><thead><tr><th style="text-align:left;">Date · topic</th><th style="text-align:left;">Activity area</th><th style="text-align:left;">Given activity</th><th style="text-align:left;">Teacher's record</th><th style="text-align:left;">Materials</th><th>Evidence</th><th>Status</th></tr></thead><tbody>${body}</tbody></table></div>`
        : '<p class="cap">No activities in this view.</p>'}
      <p class="cap" style="margin:10px 0 0;">Completed = marked done on My Day. Planned, not done = something was written on the card but it was not marked done. Only school days up to today are listed; holidays are left out.</p></div>
      <div data-record-dl style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;"><button type="button" onclick="covRecordExcel()" style="padding:8px 14px; border-radius:8px; border:1px solid var(--primary); background:#fff; color:var(--primary-dark, #17765B); font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;">⬇ Download Excel</button></div>`;
    window.__covRecord = { label: S.label, rows: all };
    if(typeof reportDownloadBar === 'function'){
      const bar = reportDownloadBar(() => wrap.querySelector('[data-record-body]'), 'Activity record — ' + S.label, 'activity-record-' + S.label.replace(/[^A-Za-z0-9]+/g, '-'));
      const dl = wrap.querySelector('[data-record-dl]'); if(bar && dl) dl.insertBefore(bar, dl.firstChild);
    }
    return wrap;
  }
  // One sheet per week (Week 20, Week 21 …), each with its own rows and its own counts.
  window.covRecordExcel = function(){
    if(typeof XLSX === 'undefined'){ alert('The spreadsheet tool did not load — check the internet and try again.'); return; }
    const R = window.__covRecord; if(!R){ return; }
    const who = (typeof myClassInfo !== 'undefined' ? [myClassInfo.school_name, myClassInfo.class_name, myClassInfo.teacher_name].filter(Boolean).join(' · ') : '');
    const weeks = [...new Set(R.rows.map(r => r.w))].sort((a, b) => a - b);
    if(!weeks.length){ alert('No activities to download for this period yet.'); return; }
    const wb = XLSX.utils.book_new();
    weeks.forEach(w => {
      const rows = R.rows.filter(r => r.w === w);
      const nDone = rows.filter(r => r.status === 'done').length;
      const nPlan = rows.filter(r => r.status === 'planned').length;
      const from = rows[0].date, to = rows[rows.length - 1].date;
      const aoa = [['Activity record — Week ' + w], [[who, from + ' to ' + to].filter(Boolean).join('  ·  ')], [],
        ['Date', 'Day topic', 'Activity area', 'Time', 'CG', 'Given activity', "Teacher's record", 'Materials', 'Evidence photos', 'Status']];
      rows.forEach(r => aoa.push([r.date, r.topic, r.area, r.time, r.cg, r.given, r.record, r.mats.join(', '), r.ev || '', STATUS[r.status][0].replace(/^[^A-Za-z]+/, '')]));
      aoa.push([], ['Completed', nDone], ['Planned, not done', nPlan], ['Not completed', rows.length - nDone - nPlan], ['Scheduled', rows.length]);
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 16 }, { wch: 26 }, { wch: 22 }, { wch: 16 }, { wch: 8 }, { wch: 42 }, { wch: 42 }, { wch: 26 }, { wch: 10 }, { wch: 18 }];
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }];
      XLSX.utils.book_append_sheet(wb, ws, 'Week ' + w);
    });
    XLSX.writeFile(wb, 'Activity_record_' + R.label.replace(/[^A-Za-z0-9]+/g, '_') + '.xlsx');
  };

  // ---- the Insights tab, next to My Class ----
  if(typeof renderTeachingTabBar === 'function'){
    const baseBar = renderTeachingTabBar;
    const styleOf = (active) => { const b = baseBar(active ? 'myday' : 'myclass'); return b.children[0] ? b.children[0].style.cssText : ''; };
    renderTeachingTabBar = function(active){
      const ins = active === 'myday' && window.myDayInsights;
      const bar = baseBar.call(this, ins ? '' : active);
      const on = styleOf(true), off = styleOf(false);
      [...bar.querySelectorAll('button')].forEach(b => { const go = b.onclick; b.onclick = function(){ window.myDayInsights = false; return go && go.apply(this, arguments); }; });
      const btn = document.createElement('button');
      btn.textContent = '📊 Insights'; btn.setAttribute('data-insights-tab', ''); btn.style.cssText = ins ? on : off;
      btn.onclick = () => {
        window.myDayInsights = true;
        const show = () => {
          const md = document.getElementById('myday-body');
          if(md && !md.classList.contains('hidden')) renderMyDay(); else { window.__toInsights = true; try { switchSidebarSection('myday'); } finally { window.__toInsights = false; } }
        };
        show();
        // the Insights view needs its data, which can arrive after the first draw: draw again until it shows
        [350, 1200, 2500].forEach(function (ms) {
          setTimeout(function () {
            const b = document.getElementById('myday-body');
            if(window.myDayInsights && b && !b.querySelector('[data-coverage-report]')) show();
          }, ms);
        });
      };
      bar.appendChild(btn);
      return bar;
    };
  }
  // any other navigation (sidebar, My Day / My Class tabs) leaves Insights
  if(typeof switchSidebarSection === 'function'){
    const baseNav = switchSidebarSection;
    switchSidebarSection = function(section){
      if(!window.__toInsights) window.myDayInsights = false;
      const out = baseNav.apply(this, arguments);
      // back on My Day: if the page still holds the Insights view, draw My Day afresh
      const md = document.getElementById('myday-body');
      if(section === 'myday' && !window.myDayInsights && md && md.querySelector('[data-coverage-report]')) renderMyDay();
      return out;
    };
  }
  window.covSetWeek = w => { currentWeekNum = +w; if(typeof onWeekChange === 'function') onWeekChange(); else renderMyDay(); };

  const base = renderMyDay;
  renderMyDay = function(){
    const out = base.apply(this, arguments);
    try {
      const body = document.getElementById('myday-body'); if(!body || !window.myDayInsights) return out;
      // Insights: keep the tab bar, replace the rest with the report
      const bar = body.firstElementChild;
      [...body.children].forEach(ch => { if(ch !== bar) ch.remove(); });
      const ws = (typeof WEEKS !== 'undefined' && WEEKS.length) ? WEEKS : [{ w: currentWeekNum }];
      const head = document.createElement('div');
      head.innerHTML = `<h2 style="margin:4px 0 6px;">Insights</h2><p class="cap" style="margin:0 0 14px;">How many of the scheduled activities you have recorded and covered.</p>
        <div class="fbar" style="margin-bottom:16px;"><div class="ctl"><label>Week</label><select onchange="covSetWeek(this.value)" style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px; max-width:420px;">${ws.map(x => `<option value="${x.w}" ${x.w === currentWeekNum ? 'selected' : ''}>Week ${x.w}${x.theme ? ' — ' + esc(x.theme) : ''}</option>`).join('')}</select></div></div>`;
      body.appendChild(head);
      body.appendChild(build(true));
      body.appendChild(record());   // every activity, done or not
      const pl = document.getElementById('pageLabel'); if(pl) pl.textContent = 'Insights';
    } catch(e){ /* My Day still works */ }
    return out;
  };
  // This file loads near the end of the page, but My Day may already be on screen (it is drawn as soon
  // as its own file loads) — then the tab bar was drawn without Insights: draw My Day once more.
  try {
    const md = document.getElementById('myday-body');
    if(md && !md.classList.contains('hidden') && md.children.length && !md.querySelector('[data-insights-tab]')) renderMyDay();
  } catch(e){}
})();