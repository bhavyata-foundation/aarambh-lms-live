/* =========================================================================
   js/render/myday-materials.js — MATERIALS, FROM THE ACTIVITY CARDS
   One record of materials: what the teacher adds under "Materials used"
   on each My Day activity card (saved with that session's plan, in the
   database — teacher_daily_plans.materials via save_daily_plan.php).
   Everything here is read from that record, never typed twice:
     • My Day → Materials: every material used this week, the activity
       and day it was used in, how often, and whether it is in the
       TLM & Resources inventory.
     • 📈 Teaching practice (last 4 weeks): indicators of how materials,
       own plans and evidence are used — separate indicators with the
       numbers behind them, not one score. No records → "No data available".
   Load after myday.js:  <script src="js/render/myday-materials.js" defer></script>
   ========================================================================= */

var MYDAY_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
var MYDAY_DAY_LABEL = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri' };
var MYDAY_DAY_FULL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday' };

// Every material recorded on a card in one week: [{week, day, domain, name, done}]
function cardMaterialsForWeek(week){
  const uses = [];
  MYDAY_DAY_KEYS.forEach(day => (DOMAINS || []).forEach(d => {
    const key = dailyPlanKey(week, day, d.key);
    const e = dailyPlanEntries[key];
    if(!e || !Array.isArray(e.materials)) return;
    e.materials.map(m => String(m || '').trim()).filter(Boolean).forEach(name => uses.push({ week, day, domain: d.key, name, done: !!sessionDoneEntries[key] }));
  }));
  return uses;
}
function weekHasCardMaterials(week){ return cardMaterialsForWeek(week).length > 0; }

// Practice figures for chosen days of one week, from what is saved.
function practiceFor(week, dayKeys){
  let delivered = 0, withMaterials = 0, withEvidence = 0, ownPlans = 0;
  const areas = new Set(), uses = [];
  dayKeys.forEach(day => (DOMAINS || []).forEach(d => {
    const key = dailyPlanKey(week, day, d.key);
    const e = dailyPlanEntries[key] || {};
    const mats = Array.isArray(e.materials) ? e.materials.map(m => String(m || '').trim()).filter(Boolean) : [];
    mats.forEach(name => uses.push({ week, day, domain: d.key, name, done: !!sessionDoneEntries[key] }));
    if(!sessionDoneEntries[key]) return;
    delivered++;
    if(mats.length){ withMaterials++; areas.add(d.key); }
    if(typeof evidenceKey === 'function' && (uploadedEvidenceRecords[evidenceKey(week, day, d.key)] || []).length) withEvidence++;
    if(e.text && String(e.text).trim() && !e.usedSuggestion) ownPlans++;
  }));
  const names = new Set(uses.map(u => normalizeMatName(u.name)));
  return { week, delivered, withMaterials, withEvidence, ownPlans, areas, uses, names };
}
// Kept for My Compliance ("Materials logged", part 06): the whole week.
function practiceForWeek(week){ return practiceFor(week, MYDAY_DAY_KEYS); }

// ---- Which week / day the Materials tab is showing ----
var matViewWeek = null;  // null = the week open in My Day
var matViewDay = null;   // null = the day open in My Day; 'week' = whole week
var matWeeksRequested = {};
function matEnsureWeeksLoaded(weeks){
  const missing = weeks.filter(w => !dailyPlanEntriesLoadedWeeks[w]);
  if(!missing.length) return true;
  const ask = missing.filter(w => !matWeeksRequested[w]);
  ask.forEach(w => { matWeeksRequested[w] = true; });
  if(ask.length){
    Promise.all(ask.map(w => ensureDailyPlanEntriesLoaded(false, w))).then(() => {
      const b = document.getElementById('myday-body');
      if(b && !b.classList.contains('hidden') && myDayActiveSubTab === 'materials') renderMyDay();
    });
  }
  return false;
}
function matWeekInfo(w){ return (typeof WEEKS !== 'undefined') ? WEEKS.find(x => x.w === w) : null; }

function renderMyDayMaterialsPanel(panel){
  ensureMyDayMaterialsLoaded(); // the real TLM inventory, for "in the inventory" counts
  const allWeeks = (typeof WEEKS !== 'undefined' && WEEKS.length) ? WEEKS.map(x => x.w) : [currentWeekNum];
  const firstWeek = allWeeks[0];
  const isAll = matViewWeek === 'all';
  const week = isAll ? currentWeekNum : (matViewWeek === null ? currentWeekNum : matViewWeek);
  const viewDay = isAll ? 'week' : (matViewDay === null ? (MYDAY_DAY_KEYS[myDayIndex] || 'mon') : matViewDay);
  const dayKeys = viewDay === 'week' ? MYDAY_DAY_KEYS : [viewDay];
  const scopeWeeks = isAll ? allWeeks.filter(w => w <= currentWeekNum) : [week];
  const scopeLabel = isAll ? 'All weeks (Week ' + firstWeek + '–' + currentWeekNum + ')' : viewDay === 'week' ? 'Week ' + week : MYDAY_DAY_FULL[viewDay] + ', Week ' + week;
  const domainLabel = k => { const d = (DOMAINS || []).find(x => x.key === k); return d ? d.label : k; };

  // ---- the two dropdowns ----
  panel.appendChild(mdSec('Materials used', ''));
  const bar = document.createElement('div');
  bar.className = 'fbar'; bar.setAttribute('data-no-export', '1'); bar.style.marginBottom = '16px';
  const weekOpts = [`<option value="all" ${isAll ? 'selected' : ''}>All weeks — the year so far</option>`];
  allWeeks.forEach(w => { const i = matWeekInfo(w); weekOpts.push(`<option value="${w}" ${!isAll && w === week ? 'selected' : ''}>Week ${w}${i ? ' — ' + esc(i.theme || '') + (i.dates ? ' (' + esc(i.dates) + ')' : '') : ''}${w === currentWeekNum ? ' · this week' : w > currentWeekNum ? ' · upcoming' : ''}</option>`); });
  const dayOpts = MYDAY_DAY_KEYS.map(d => `<option value="${d}" ${d === viewDay ? 'selected' : ''}>${MYDAY_DAY_FULL[d]}</option>`).join('') + `<option value="week" ${viewDay === 'week' ? 'selected' : ''}>Whole week</option>`;
  bar.innerHTML = `<div class="ctl"><label>Week</label><select id="matWeekSel" style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px; max-width:420px;">${weekOpts.join('')}</select></div>
    <div class="ctl"><label>Day</label><select id="matDaySel" ${isAll ? 'disabled title="All weeks shows every day"' : ''} style="padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${dayOpts}</select></div>`;
  panel.appendChild(bar);
  bar.querySelector('#matWeekSel').onchange = e => { matViewWeek = e.target.value === 'all' ? 'all' : +e.target.value; renderMyDay(); };
  bar.querySelector('#matDaySel').onchange = e => { matViewDay = e.target.value; renderMyDay(); };
  const note = document.createElement('p');
  note.className = 'cap'; note.style.margin = '0 0 18px';
  note.textContent = 'Recorded on each activity card (Activities & Overview → the card → "Materials used in this activity"). This page only reads them — add or change them on the card.';
  panel.appendChild(note);

  // the chosen week + the 3 before it (to tell what is new)
  const prevWeeks = []; if(!isAll) for(let w = Math.max(firstWeek, week - 3); w < week; w++) prevWeeks.push(w);
  if(!isAll && week > currentWeekNum){ panel.appendChild(practiceNote('Week ' + week + ' is upcoming — No data available yet.')); return; }
  if(!matEnsureWeeksLoaded(prevWeeks.concat(scopeWeeks))){ panel.appendChild(practiceNote('Loading ' + (isAll ? 'every week so far' : 'Week ' + week) + '…')); return; }

  const report = document.createElement('div');
  panel.appendChild(report);
  const parts = scopeWeeks.map(w => practiceFor(w, dayKeys));
  const P = { delivered: 0, withMaterials: 0, withEvidence: 0, ownPlans: 0, areas: new Set(), uses: [], names: new Set() };
  parts.forEach(x => { P.delivered += x.delivered; P.withMaterials += x.withMaterials; P.withEvidence += x.withEvidence; P.ownPlans += x.ownPlans;
    x.areas.forEach(a => P.areas.add(a)); x.uses.forEach(u => P.uses.push(u)); x.names.forEach(n => P.names.add(n)); });
  // Is this material in TLM & Resources? (the real imported inventory)
  const invPill = name => {
    const st = stockInfoFor(name);
    if(!st.found) return myDayMaterialsFetchStatus === 'loading' ? mdPill('Checking…', 'neu') : mdPill('Not in inventory', 'neu');
    if(st.matchType === 'fuzzy') return mdPill('Possible match: ' + st.matchedName, 'warn');
    return st.state === 'ok' ? mdPill('In stock', 'good') : st.state === 'distributed' ? mdPill('Distributed', 'info') : mdPill('Damaged', 'crit');
  };
  const matCell = list => list.map(u => `<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:3px 0;"><span class="chip" style="font-size:12px;">${esc(u.name)}</span>${invPill(u.name)}</div>`).join('');

  // ---- the record: each activity and its materials ----
  report.appendChild(mdSec('Record — ' + scopeLabel, ''));
  if(!P.uses.length){
    report.appendChild(practiceNote('No data available — no materials were recorded on the activity cards for ' + scopeLabel + '.'));
  } else {
    const showDay = viewDay === 'week';
    let t = '<div class="report-table-wrap"><table class="report-table"><thead><tr>' + (isAll ? '<th style="text-align:left;">Week</th>' : '') + (showDay ? '<th style="text-align:left;">Day</th>' : '')
      + '<th style="text-align:left;">Activity</th><th style="text-align:left;">Materials used · in TLM inventory?</th><th>Session held</th></tr></thead><tbody>';
    scopeWeeks.forEach(w => {
      dayKeys.forEach(day => {
        const rows = (DOMAINS || []).map(d => ({ d, list: P.uses.filter(u => u.week === w && u.day === day && u.domain === d.key) })).filter(r => r.list.length);
        if(!rows.length){
          if(showDay && !isAll) t += `<tr><td style="text-align:left;"><b>${MYDAY_DAY_FULL[day]}</b></td><td colspan="3" class="dim" style="text-align:left;">No data available</td></tr>`;
          return;
        }
        rows.forEach((r, i) => {
          t += '<tr>' + (isAll ? `<td style="text-align:left;">Week ${w}</td>` : '')
            + (showDay ? (i === 0 ? `<td style="text-align:left; vertical-align:top;" rowspan="${rows.length}"><b>${MYDAY_DAY_FULL[day]}</b></td>` : '') : '')
            + `<td style="text-align:left;">${esc(r.d.label)}</td><td style="text-align:left;">${matCell(r.list)}</td>`
            + `<td>${r.list[0].done ? mdPill('Held', 'good') : mdPill('Not yet', 'neu')}</td></tr>`;
        });
      });
    });
    t += '</tbody></table></div>';
    const w = document.createElement('div'); w.innerHTML = t;
    const rc = mdCard(null, null, w); rc.style.marginBottom = '0';
    report.appendChild(rc);
  }

  // ---- statistics for the chosen day (or week) only ----
  const statsHead = mdSec('📈 Statistics — ' + scopeLabel, '');
  statsHead.style.marginTop = '30px';
  report.appendChild(statsHead);
  if(!P.delivered && !P.uses.length){ report.appendChild(practiceNote('No data available — nothing was recorded for ' + scopeLabel + ' yet.')); }
  else {
    // "New" = not used in the 3 weeks before, nor on an earlier day of this week
    const seenBefore = new Set();
    prevWeeks.forEach(w => practiceFor(w, MYDAY_DAY_KEYS).names.forEach(n => seenBefore.add(n)));
    const firstIdx = MYDAY_DAY_KEYS.indexOf(dayKeys[0]);
    practiceFor(week, MYDAY_DAY_KEYS.slice(0, firstIdx)).names.forEach(n => seenBefore.add(n));
    const fresh = isAll ? [] : [...P.names].filter(n => !seenBefore.has(n));
    const inInventory = [...P.names].filter(n => { const st = stockInfoFor(n); return st.found && st.matchType !== 'fuzzy'; });
    const ownMade = [...P.names].filter(n => !stockInfoFor(n).found);
    const pct = (a, b) => b ? Math.round(a / b * 100) : null;
    const band = (v, good, ok) => v === null ? mdPill('No data available', 'neu') : v >= good ? mdPill('Strong', 'good') : v >= ok ? mdPill('Developing', 'warn') : mdPill('Low', 'crit');
    const pM = pct(P.withMaterials, P.delivered), pE = pct(P.withEvidence, P.delivered), pO = pct(P.ownPlans, P.delivered);
    const sessionsPlanned = dayKeys.length * (DOMAINS || []).length * scopeWeeks.length;
    // ---- a visual report: Sessions · Materials · Activity areas · Innovation signs ----
    const C = { good: '#2E8B5E', warn: '#D9A21B', crit: '#D8574F', neu: '#B8C2BC', tlm: '#2F6FB0', own: '#C77A1E', bg: '#EEF1EE' };
    const colourOf = (v, good, ok) => v === null ? C.neu : v >= good ? C.good : v >= ok ? C.warn : C.crit;
    const ring = (value, total, label) => {
      const v = total ? Math.round(value / total * 100) : 0, col = value ? C.good : C.neu;
      return `<div style="display:flex; align-items:center; gap:16px;">
        <div role="img" aria-label="${value} of ${total} ${label}" style="flex:none; width:96px; height:96px; border-radius:50%; background:conic-gradient(${col} ${v * 3.6}deg, ${C.bg} 0); display:grid; place-items:center;">
          <div style="width:74px; height:74px; border-radius:50%; background:#fff; display:grid; place-items:center; text-align:center; line-height:1.05;"><b style="font-size:22px;">${value}</b><span style="font-size:11px; color:#5b6b62;">of ${total}</span></div></div>
        <div><div style="font-size:15px; font-weight:800;">${label}</div><div class="cap" style="margin:2px 0 0;">${value ? v + '% of the planned sessions were marked done' : 'None marked done yet — mark sessions done on My Day'}</div></div></div>`;
    };
    const bar = (label, v, good, ok, hint) => `<div style="margin:10px 0;">
        <div style="display:flex; justify-content:space-between; gap:10px; font-size:13px; margin-bottom:4px;"><span><b>${label}</b> <span class="cap">${hint}</span></span><b style="color:${colourOf(v, good, ok)};">${v === null ? '—' : v + '%'}</b></div>
        <div style="height:10px; border-radius:6px; background:${C.bg}; overflow:hidden;"><div style="height:100%; width:${v || 0}%; background:${colourOf(v, good, ok)}; border-radius:6px;"></div></div></div>`;
    const card = (title, sub, body) => { const c = document.createElement('div'); c.className = 'card'; c.style.cssText = 'padding:18px 20px; margin:0;'; c.innerHTML = `<div style="font-size:12px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#5b6b62; margin-bottom:4px;">${title}</div>${sub ? `<div class="cap" style="margin:0 0 10px;">${sub}</div>` : ''}${body}`; return c; };
    const layout = document.createElement('div'); layout.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:16px; margin-bottom:16px;';

    // 1. Sessions
    layout.appendChild(card('Sessions', null, ring(P.delivered, sessionsPlanned, 'Sessions held')
      + (P.delivered ? bar('With materials', pM, 70, 40, '% of sessions held') + bar('Evidence attached', pE, 70, 40, '% of sessions held') + bar('Own plans', pO, 50, 20, '% of sessions held')
                     : '<p class="cap" style="margin:14px 0 0;">With materials · Evidence attached · Own plans appear here once a session is marked done.</p>')));

    // 2. Materials: where they came from, and each one
    const nTot = P.names.size, nInv = inInventory.length, nOwn = ownMade.length, nOther = Math.max(0, nTot - nInv - nOwn);
    const seg = (n, col, label) => n ? `<div title="${label}: ${n}" style="width:${n / nTot * 100}%; background:${col}; display:grid; place-items:center; color:#fff; font-size:11px; font-weight:800;">${n}</div>` : '';
    const freshSet = new Set(fresh), ownSet = new Set(ownMade), invSet = new Set(inInventory);
    const chips = [...P.names].sort().map(n => {
      const tags = (freshSet.has(n) ? '<span style="font-size:10.5px; font-weight:800; color:#1E6B46; background:#DDF2E5; padding:1px 6px; border-radius:6px;">New</span>' : '')
        + (ownSet.has(n) ? '<span style="font-size:10.5px; font-weight:800; color:#7A4117; background:#FBE7D2; padding:1px 6px; border-radius:6px;">Own</span>' : invSet.has(n) ? '<span style="font-size:10.5px; font-weight:800; color:#1F4E79; background:#DCE9F6; padding:1px 6px; border-radius:6px;">TLM</span>' : '');
      const uses = P.uses.filter(u => u.name === n).length;
      return `<span style="display:inline-flex; align-items:center; gap:5px; padding:5px 9px; margin:3px; border:1px solid #E3E7E3; border-radius:999px; font-size:12.5px; background:#fff;">${esc(n)}${uses > 1 ? ` <span class="cap" style="margin:0;">×${uses}</span>` : ''}${tags}</span>`; }).join('');
    layout.appendChild(card('Materials', nTot + ' different material' + (nTot === 1 ? '' : 's') + ' · ' + P.uses.length + ' use' + (P.uses.length === 1 ? '' : 's') + (isAll ? '' : ' · ' + fresh.length + ' new (not used in the 3 weeks before)'),
      (nTot ? `<div style="display:flex; height:22px; border-radius:6px; overflow:hidden; background:${C.bg};">${seg(nInv, C.tlm, 'From TLM inventory')}${seg(nOwn, C.own, 'Own / handmade')}${seg(nOther, C.neu, 'Possible match')}</div>
        <div style="display:flex; gap:14px; flex-wrap:wrap; font-size:12px; margin:6px 0 10px;"><span><span style="display:inline-block; width:10px; height:10px; border-radius:2px; background:${C.tlm};"></span> From TLM inventory ${nInv}</span><span><span style="display:inline-block; width:10px; height:10px; border-radius:2px; background:${C.own};"></span> Own / handmade ${nOwn}</span>${nOther ? `<span><span style="display:inline-block; width:10px; height:10px; border-radius:2px; background:${C.neu};"></span> To check ${nOther}</span>` : ''}</div>
        <div style="margin:0 -3px;">${chips}</div>` : '<p class="cap" style="margin:0;">No materials recorded.</p>')));
    report.appendChild(layout);

    // 3. Activity areas
    const areaRow = (DOMAINS || []).map(d => { const n = P.uses.filter(u => u.domain === d.key).length, on = P.areas.has(d.key);
      return `<div title="${esc(d.label)}: ${n} material use${n === 1 ? '' : 's'}" style="flex:1 1 120px; padding:10px 12px; border-radius:10px; border:1px solid ${on ? '#9FD3BB' : '#E3E7E3'}; background:${on ? '#F3FAF6' : '#FAFBFA'};">
        <div style="font-size:13px; font-weight:700; color:${on ? '#1D2B22' : '#8a968f'};">${esc(d.label)}</div>
        <div style="font-size:12px; color:${on ? '#1E6B46' : '#8a968f'}; margin-top:2px;">${on ? '✓ ' + n + ' use' + (n === 1 ? '' : 's') : '○ none'}</div></div>`; }).join('');
    const ac = card('Activity areas', P.areas.size + ' of ' + (DOMAINS || []).length + ' areas used materials', `<div style="display:flex; gap:8px; flex-wrap:wrap;">${areaRow}</div>`);
    ac.style.marginBottom = '16px'; report.appendChild(ac);

    // 4. Innovation signs: a checklist, not one score
    const SIGNS = [
      [fresh.length > 0, isAll ? 'New materials' : fresh.length + ' new material' + (fresh.length === 1 ? '' : 's'), isAll ? 'shown week by week' : (fresh.length ? fresh.slice(0, 4).join(', ') + (fresh.length > 4 ? ' …' : '') : 'none new this time')],
      [ownMade.length > 0, ownMade.length + ' own / handmade material' + (ownMade.length === 1 ? '' : 's'), 'made or brought by the teacher'],
      [P.areas.size >= Math.ceil((DOMAINS || []).length * 0.7), 'Materials across most activity areas', P.areas.size + ' of ' + (DOMAINS || []).length + ' areas'],
      [pO !== null && pO >= 50, 'Her own plans in most sessions', pO === null ? 'once sessions are marked done' : pO + '% of sessions held']];
    const nSigns = SIGNS.filter(x => x[0]).length;
    const sWrap = document.createElement('div');
    sWrap.innerHTML = `<div style="display:flex; align-items:baseline; gap:8px; margin-bottom:8px;"><b style="font-size:28px; line-height:1;">${nSigns}</b><span style="font-weight:700;">of ${SIGNS.length} signs of innovative teaching</span></div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:8px;">${SIGNS.map(([on, t, sub]) => `<div style="display:flex; gap:10px; align-items:flex-start; padding:10px 12px; border-radius:10px; background:${on ? '#F3FAF6' : '#FAFBFA'}; border:1px solid ${on ? '#9FD3BB' : '#E3E7E3'};"><span style="flex:none; width:22px; height:22px; border-radius:50%; display:grid; place-items:center; font-weight:800; font-size:13px; color:#fff; background:${on ? C.good : C.neu};">${on ? '✓' : '○'}</span><span><b style="font-size:13.5px;">${esc(t)}</b><span class="cap" style="display:block; margin:2px 0 0;">${esc(sub)}</span></span></div>`).join('')}</div>
      <p class="cap" style="margin:10px 0 0;">Separate signs from the activity cards, not one score. "Sessions held" counts sessions marked done on My Day — the percentages appear once a session is marked done.</p>`;
    report.appendChild(mdCard('Innovation indicators', null, sWrap));
  }
  if(typeof reportDownloadBar === 'function'){
    panel.appendChild(reportDownloadBar(() => report, 'Materials and teaching practice — ' + scopeLabel + ' — ' + (myClassInfo.class_name || ''), (isAll ? 'materials-all-weeks' : 'materials-week' + week + (viewDay === 'week' ? '' : '-' + viewDay))));
  }
}
function practiceNote(text){ const c = document.createElement('div'); c.className = 'card'; c.style.padding = '16px 18px'; const p = document.createElement('p'); p.style.margin = '0'; p.textContent = text; c.appendChild(p); return c; }

// ---- Below the activity cards: the viewed day's materials, activity by activity ----
// Kept up to date as materials are added or removed on a card (wraps the
// card's own chip renderer once), without redrawing the whole page.
function renderDayMaterialsStrip(week, dayKey){
  if(typeof renderMaterialChips === 'function' && !renderMaterialChips.__withStrip){
    const original = renderMaterialChips;
    const wrapped = function(){ const out = original.apply(this, arguments); refreshDayMaterialsStrip(); return out; };
    wrapped.__withStrip = true;
    window.renderMaterialChips = wrapped;
  }
  const box = document.createElement('div');
  box.id = 'dayMaterialsStrip';
  box.className = 'card';
  box.style.cssText = 'padding:16px 18px; margin-top:16px;';
  box.dataset.week = week; box.dataset.day = dayKey;
  fillDayMaterialsStrip(box);
  return box;
}
function refreshDayMaterialsStrip(){
  const box = document.getElementById('dayMaterialsStrip');
  if(box) fillDayMaterialsStrip(box);
}
function fillDayMaterialsStrip(box){
  const week = +box.dataset.week, dayKey = box.dataset.day;
  const rows = (DOMAINS || []).map(d => {
    const e = dailyPlanEntries[dailyPlanKey(week, dayKey, d.key)];
    const list = e && Array.isArray(e.materials) ? e.materials.map(m => String(m || '').trim()).filter(Boolean) : [];
    return { d, list };
  }).filter(r => r.list.length);
  const total = rows.reduce((a, r) => a + r.list.length, 0);
  box.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:${rows.length ? '10px' : '0'};">
      <div><b>🧺 Materials for ${MYDAY_DAY_FULL[dayKey] || dayKey}</b> <span class="cap">· ${total ? total + ' recorded across ' + rows.length + ' activit' + (rows.length === 1 ? 'y' : 'ies') : 'No data available — add them on the cards above'}</span></div>
      <button class="chip" onclick="switchMyDaySubTab('materials')">Whole week in Materials →</button>
    </div>`
    + (rows.length ? '<div style="display:grid; grid-template-columns:minmax(140px, 220px) 1fr; gap:6px 14px; font-size:13px;">'
      + rows.map(r => `<div class="cap" style="padding-top:4px;"><b>${esc(r.d.label)}</b></div><div>${r.list.map(n => '<span class="chip" style="display:inline-block; margin:2px 4px 2px 0; font-size:12px;">' + esc(n) + '</span>').join('')}</div>`).join('')
      + '</div>' : '');
}