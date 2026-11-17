/* =========================================================================
   js/attendance-import-month.js — "which month?" for the attendance import
   -------------------------------------------------------------------------
   Class Attendance → Import attendance gets a MONTH picker, like the
   Assessment imports. The teacher says which month she is importing:

   • A register with day numbers only (1 … 31, no month written) is read as
     that month — no more "which month is this?" question afterwards.
   • A file whose dates are for ANOTHER month is stopped with a warning:
        "This file has attendance for July 2026, but you chose June 2026."
        [Switch to July 2026 and continue]  [Cancel]
   • A file with SEVERAL months (e.g. June and July): only the chosen month
     is saved; the preview says how many marks of other months are left out,
     and offers to switch.

   Only the attendance import is changed (not Admissions / the class list).
   Loads after the part files (teacher.html); wraps renderSmartImportCard,
   renderSmartImportMapping, siCollect and renderSmartImportPreview by name.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof renderSmartImportCard !== 'function' || typeof siCollect !== 'function') return;

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const ym = (y, m) => y + '-' + String(m + 1).padStart(2, '0');           // 2026, 6 → "2026-07"
  const label = key => { const [y, m] = key.split('-'); return MONTHS[+m - 1] + ' ' + y; };
  const box = (tone, html) => {
    const c = { warn: ['#fdf1e3', '#8a5a1c'], bad: ['#fde2e1', '#9b1c1c'], info: ['#eef4fb', '#24507a'] }[tone];
    return `<div style="background:${c[0]}; color:${c[1]}; border-radius:8px; padding:9px 11px; margin:0 0 8px; font-size:13px; line-height:1.45;">${html}</div>`;
  };

  // The month being imported. Starts at the month the register calendar shows.
  function shownMonth(){
    const y = (typeof markAttYear === 'number') ? markAttYear : new Date().getFullYear();
    const m = (typeof markAttMonth === 'number') ? markAttMonth : new Date().getMonth();
    return ym(y, m);
  }
  // The import always follows the Month bar at the top of Class Attendance (no second picker);
  // "Switch to … and continue" changes the month for that one import only.
  window.attImportMonth = null;
  function chosen(){ return (typeof smartImport !== 'undefined' && smartImport && smartImport.monthOverride) || shownMonth(); }

  // Months offered: the school year so far (June … this month), newest first.
  function monthChoices(){
    const now = new Date(), out = [];
    let y = now.getFullYear(), m = now.getMonth();
    for(let i = 0; i < 12; i++){
      out.push(ym(y, m));
      if(m === 5) break;                       // the school year starts in June
      m--; if(m < 0){ m = 11; y--; }
    }
    if(!out.includes(chosen())) out.push(chosen());
    return out;
  }

  // ---- 1. the month picker on the import card ----
  const baseCard = renderSmartImportCard;
  renderSmartImportCard = function(mode){
    const card = baseCard.apply(this, arguments);
    if(mode === 'roll') return card;            // the class list has no month
    const text = card.querySelector('.imp-text');
    if(!text) return card;
    // no second month picker here: one line saying which month (the one chosen in Month above)
    const row = document.createElement('div'); row.setAttribute('data-att-import-month', '');
    row.style.cssText = 'margin-top:10px; font-size:14px;';
    row.innerHTML = `Importing: <b>${label(chosen())}</b> <span class="cap" style="margin:0;">— the month chosen in <b>Month</b> above.</span>`;
    text.appendChild(row);
    setTimeout(() => tidyImportCard(card.closest ? (card.closest('.card') || card) : card), 0);
    return card;
  };

  // The Import card shows only its title, the buttons and "Importing: <month>": no description
  // text and no second month picker (whichever script adds one) — the Month bar above decides.
  function tidyImportCard(card){
    if(!card || !/Import attendance or a class list/.test(card.textContent || '')) return;
    card.querySelectorAll('select').forEach(sel => {
      // a month picker: its label says "month", or its options are months
      const row = sel.closest('div, label, p') || sel;
      const around = (row.textContent || '') + ' ' + (sel.getAttribute('aria-label') || '') + ' ' + (sel.id || '');
      const monthish = /month/i.test(around) || [...sel.options].some(o => /^(January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(o.textContent.trim()));
      if(monthish && !row.hasAttribute('data-att-import-month')) row.remove();
    });
    [...card.querySelectorAll('p, div, span')].forEach(el => {
      if(el.children.length > 2 || el.hasAttribute('data-att-import-month')) return;
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if(/^A register in any layout\b/.test(t) || /^The file must be for this month\.?$/.test(t)) el.remove();
    });
  }
  const tidyAll = () => document.querySelectorAll('.card').forEach(c => { if(/Import attendance or a class list/.test(c.textContent || '')) tidyImportCard(c); });
  if(typeof MutationObserver !== 'undefined'){
    let queued = false;
    new MutationObserver(() => { if(queued) return; queued = true; setTimeout(() => { queued = false; tidyAll(); }, 0); }).observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  // Every month that has a mark in the file (included sheets).
  function monthsInFile(){
    const months = {};
    smartImport.sheets.filter(s => s.include).forEach(sheet => {
      sheet.sections.forEach(s => siSectionDates(sheet, s).forEach((d, i) => {
        if(!d) return;
        const has = s.rows.some(r => String(r.marks[i] == null ? '' : r.marks[i]).trim());
        if(has) months[d.slice(0, 7)] = (months[d.slice(0, 7)] || 0) + 1;
      }));
      if(sheet.long) sheet.long.rows.forEach(r => { if(r.date) months[r.date.slice(0, 7)] = (months[r.date.slice(0, 7)] || 0) + 1; });
    });
    return Object.keys(months).sort();
  }

  // ---- 2. check the file's month before the first step is shown ----
  const baseMapping = renderSmartImportMapping;
  renderSmartImportMapping = function(){
    const S = (typeof smartImport !== 'undefined') ? smartImport : null;
    if(S && !S.monthChecked){
      const want = chosen(), [wy, wm] = want.split('-').map(Number);
      // day numbers only, no month written: it is the chosen month
      S.sheets.forEach(sh => {
        const dayOnly = sh.sections.some(s => s.dateCols.some(d => !d.date && d.month === undefined));
        if(dayOnly && !(sh.monthGuess && sh.monthGuess.month != null && sh.monthGuess.year)) sh.monthGuess = { month: wm - 1, year: wy, fromPicker: true };
      });
      const found = monthsInFile();
      const others = found.filter(k => k !== want);
      if(found.length && others.length){
        const out = siPanel();
        const sw = k => `<button class="btn-primary" style="width:auto; padding:8px 16px; margin:0 6px 6px 0;" onclick="attImportSwitchMonth('${k}')">Switch to ${label(k)} and continue</button>`;
        if(!found.includes(want)){
          out.innerHTML = box('bad', `<b>File not imported yet.</b><br>This file has attendance for <b>${others.map(label).join(', ')}</b>, but the <b>Month</b> above shows <b>${label(want)}</b>.`)
            + others.map(sw).join('')
            + `<button class="btn-primary" style="width:auto; padding:8px 16px; margin:0 6px 6px 0;" onclick="attImportAllMonths()">Import all ${found.length} months at once</button>`
            + `<button class="btn" onclick="smartImport = null; siPanel().innerHTML = '';">Cancel</button>`;
        } else {
          out.innerHTML = box('warn', `This file has attendance for <b>${label(want)}</b> and also for <b>${others.map(label).join(', ')}</b>. Only <b>${label(want)}</b> will be imported.`)
            + `<button class="btn-primary" style="width:auto; padding:8px 16px; margin:0 6px 6px 0;" onclick="attImportContinue()">Continue with ${label(want)} only</button>`
            + others.map(sw).join('')
            + `<button class="btn-primary" style="width:auto; padding:8px 16px; margin:0 6px 6px 0;" onclick="attImportAllMonths()">Import all ${found.length} months at once</button>`
            + `<button class="btn" onclick="smartImport = null; siPanel().innerHTML = '';">Cancel</button>`;
        }
        return;
      }
      S.monthChecked = true;
      S.onlyMonth = want;
    }
    return baseMapping.apply(this, arguments);
  };

  // Import every month in the file in one go (no month is dropped).
  window.attImportAllMonths = function(){
    if(!smartImport) return;
    smartImport.monthChecked = true; smartImport.onlyMonth = null; smartImport.allMonths = true;
    renderSmartImportMapping();
  };
  window.attImportContinue = function(){
    if(!smartImport) return;
    smartImport.monthChecked = true; smartImport.onlyMonth = chosen();
    renderSmartImportMapping();
  };
  window.attImportSwitchMonth = function(key){
    if(!smartImport) return;
    smartImport.monthOverride = key; // this import only — the Month bar above stays as it is
    const line = document.querySelector('[data-att-import-month]');
    if(line) line.innerHTML = `Importing: <b>${label(key)}</b> <span class="cap" style="margin:0;">— for this file only (the Month above shows ${label(shownMonth())}).</span>`;
    // day-number sheets that took the old month from the picker take the new one
    const [y, m] = key.split('-').map(Number);
    smartImport.sheets.forEach(sh => { if(sh.monthGuess && sh.monthGuess.fromPicker) sh.monthGuess = { month: m - 1, year: y, fromPicker: true }; });
    smartImport.monthChecked = false;
    renderSmartImportMapping();
  };

  // ---- 2b. after an import: a child in the register was admitted by then ----
  // Each child in the file (with marks: their first marked day; listed without
  // marks: the 1st of the register's month) — the admission date moves EARLIER
  // to that day if needed (never later), so they appear on that month's register
  // instead of "not yet admitted … hidden".
  if(typeof confirmSmartImport === 'function'){
    const baseConfirm = confirmSmartImport;
    confirmSmartImport = async function(){
      const S = (typeof smartImport !== 'undefined') ? smartImport : null;
      let wanted = [];
      try {
        if(S && S.mode !== 'roll'){
          const month = S.onlyMonth || (S.allMonths ? null : chosen()), byName = siCollect().byName;
          wanted = Object.values(byName).map(r => {
            // the first day marked Present / Absent this month (holiday columns don't count)
            const first = typeof siFirstRecordedDay === 'function' ? siFirstRecordedDay(r, month) : Object.keys(r.attendance || {}).filter(d => !month || d.slice(0, 7) === month).sort()[0];
            return { name: (S.nameEdit || {})[r.name] || r.name, reg: r.register_no || '', date: first || (month ? month + '-01' : '') };
          }).filter(x => x.date);
        }
      } catch(e){ wanted = []; }
      const out = await baseConfirm.apply(this, arguments);
      try {
        if(!wanted.length) return out;
        if(!Array.isArray(realPupilsCache) && typeof fetchMyPupils === 'function') await fetchMyPupils();
        const roll = Array.isArray(realPupilsCache) ? realPupilsCache : [], dates = {};
        wanted.forEach(x => {
          const m = window.NameMatch ? NameMatch.find(x.name, { register: x.reg, roll }) : { pupil: roll.find(p => normPupilName(p.name) === normPupilName(x.name)), sure: true };
          if(!m.pupil || !m.sure) return;
          const p = m.pupil, cur = String(p.admitted_date || '').slice(0, 10);
          if(!cur || cur > x.date) dates[p.id] = dates[p.id] && dates[p.id] < x.date ? dates[p.id] : x.date;
        });
        if(!Object.keys(dates).length) return out;
        const res = await fetch('backend/pupils/roll_tools.php' + window.location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'admitted_by', class_id: myClassInfo.class_id, dates }) });
        const d = await res.json();
        if(d && d.status === 'success' && d.moved){
          realPupilsCache = null; if(typeof fetchMyPupils === 'function') await fetchMyPupils();
          if(typeof renderAttendanceBody === 'function') renderAttendanceBody();
        }
      } catch(e){ /* the import itself is done; the dates can be fixed in Admissions */ }
      return out;
    };
  }

  // ---- 3. save only the chosen month ----
  const baseCollect = siCollect;
  siCollect = function(){
    const res = baseCollect.apply(this, arguments);
    const only = smartImport && smartImport.onlyMonth;
    if(!only || !res || !res.byName) return res;
    let left = 0;
    Object.keys(res.byName).forEach(k => {
      const rec = res.byName[k];
      Object.keys(rec.attendance).forEach(d => {
        if(d.slice(0, 7) !== only){
          const m = rec.attendance[d];
          if(res.stats[m] > 0) res.stats[m]--;
          delete rec.attendance[d]; left++;
        }
      });
    });
    res.stats.otherMonth = left;
    return res;
  };

  // ---- 4. the preview says which month is being saved ----
  const basePreview = renderSmartImportPreview;
  renderSmartImportPreview = function(){
    const r = basePreview.apply(this, arguments);
    const only = smartImport && smartImport.onlyMonth;
    const out = siPanel();
    const first = out && out.querySelector('p');
    if(smartImport && smartImport.allMonths && !only && first){
      const months = monthsInFile().map(label).join(', ');
      first.insertAdjacentHTML('afterend', box('info', `Importing <b>all months in this file</b>: ${months}. Every mark is saved.`));
    }
    if(only && first){
      const left = (siCollect().stats || {}).otherMonth || 0;
      first.insertAdjacentHTML('afterend', box('info', `Importing <b>${label(only)}</b>${left ? ` — ${left} mark${left === 1 ? '' : 's'} from other months ${left === 1 ? 'is' : 'are'} left out` : ''}.`));
    }
    return r;
  };
})();