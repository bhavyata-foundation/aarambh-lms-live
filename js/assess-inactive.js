/* =========================================================================
   js/assess-inactive.js — a child absent for the whole month is NOT ACTIVE
   for that month, and is left out of that month's evaluation
   -------------------------------------------------------------------------
   Not active (for one tab, one month) = the child has no mark at all in that
   month's activities while other children do (so the assessment did happen).
   Pre-Test: no mark in the whole term (only absent / blank) while others have.
   When nobody has marks yet (start of the month) no one is "not active".
   A child admitted AFTER a month is never "not active" in it (they hadn't joined).

   What changes on the Assessment tabs (Pre-Test · Classroom Observation ·
   Workbook · Fine & Gross Motor):
     • "Recording complete"      counts only the ACTIVE children's cells
     • "Children with no marks"  counts only ACTIVE children ("of N active")
     • a note names the children left out, and why
   Class DSI / SRI, the CG summary and the reports already use real marks
   only, so a child with no marks adds nothing there. Nothing is hidden or
   deleted: the child stays in the grading list, and counts again as soon as
   they get a mark.
   🔁 CATCH-UP (Classroom Observation and Workbook): every child who missed a
   whole month earlier this term, with that month's competencies to assess
   when they are back ("Back since August — assess now" + Open July), or
   "Still absent — follow up". A child leaves the list once they have a mark
   in the missed month (those marks count for that month).
   Loads after the part files (teacher.html); wraps renderMonthlyAssessment.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof renderMonthlyAssessment !== 'function') return;
  const MONTHS_ALL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MARK = v => ['B', 'E', 'P', 'A', 'G', 'Y', 'R'].includes(String(v || '').trim().toUpperCase());
  const level = () => typeof workbookLevelFromClassName === 'function' ? workbookLevelFromClassName() : 'Jr KG';
  const month = () => typeof currentWorkbookMonth !== 'undefined' ? currentWorkbookMonth : '';
  // the children who are assessed (attendance-only children are left out: js/attendance-only.js)
  const kids = () => typeof assessmentRoll === 'function' ? assessmentRoll() : (Array.isArray(realPupilsCache) ? realPupilsCache : []);
  const fullRoll = () => Array.isArray(realPupilsCache) ? realPupilsCache : [];

  // does this child have at least one mark in this tab, this month (Pre-Test: this term)?
  function hasMark(type, forMonth){
    const m = forMonth || month(), L = level();
    if(type === 'observation'){
      const themes = (typeof observationThemesCache !== 'undefined' && observationThemesCache[L + '|' + m]) || [];
      const items = (Array.isArray(themes) ? themes : []).flatMap(t => t.items || []).map(it => it.id);
      const marks = (typeof observationAssessmentCache !== 'undefined' && observationAssessmentCache[m]) || null;
      if(!marks || typeof marks !== 'object' || !items.length) return null;
      return p => items.some(id => MARK((marks[p.id] || {})[id]));
    }
    if(type === 'workbook'){
      const books = (typeof workbookPagesCache !== 'undefined' && workbookPagesCache[L + '|' + m]) || [];
      const pages = (Array.isArray(books) ? books : []).flatMap(b => b.pages || []).map(pg => pg.id);
      const marks = (typeof workbookChildMarksCache !== 'undefined' && workbookChildMarksCache[m]) || null;
      if(!marks || typeof marks !== 'object' || !pages.length) return null;
      return p => pages.some(id => MARK((marks[p.id] || {})[id]));
    }
    if(type === 'motor'){
      if(typeof motorRating !== 'function') return null;
      return p => MARK(motorRating(p.id, 'fine', m)) || MARK(motorRating(p.id, 'gross', m));
    }
    if(type === 'pretest'){
      if(typeof preTestAssessmentEntries === 'undefined') return null;
      return p => { const e = preTestAssessmentEntries[p.name] || preTestAssessmentEntries[p.id] || {}; return Object.values(e).some(MARK); };
    }
    return null;
  }
  // the children not active this month (empty when nobody has been assessed yet)
  // the last day of a term month, in the school year now running (June–December: this year; January–April: the next)
  function monthEnd(m){
    const i = MONTHS_ALL.indexOf(m); if(i < 0) return null;
    const now = new Date(), startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    const y = i >= 5 ? startYear : startYear + 1;
    return new Date(y, i + 1, 0).toISOString().slice(0, 10);
  }
  // a child admitted after the month cannot have missed it
  const admittedBy = (p, m) => { const end = monthEnd(m), d = String(p.admitted_date || p.admission_date || '').slice(0, 10); return !end || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d <= end; };
  window.assessInactiveChildren = function(type, forMonth){
    const test = hasMark(type, forMonth); if(!test) return [];
    const m = forMonth || month();
    const all = kids().filter(p => type === 'pretest' || admittedBy(p, m)), active = all.filter(test);
    return active.length ? all.filter(p => !test(p)) : [];
  };

  // ---- correct the two tiles, and say who was left out ----
  function fix(targetEl, type){
    const out = window.assessInactiveChildren(type), ao = fullRoll().length - kids().length, k = out.length + ao;
    const old = targetEl.querySelector('[data-inactive-note]'); if(old) old.remove();
    if(!k) return;
    const n = fullRoll().length, act = n - k;          // the tiles counted the whole roll: take out the not-active and the attendance-only
    const tiles = [...targetEl.querySelectorAll('.tile')];
    const tile = label => tiles.find(t => (t.querySelector('.k') || {}).textContent === label);
    const setV = (t, v, unit) => { const e = t.querySelector('.v'); if(e) e.innerHTML = v + (unit ? `<small> ${unit}</small>` : ''); };
    const band = v => (typeof mdStatusBand === 'function' ? mdStatusBand(v, 90, 70) : null);
    const rec = tile('Recording complete');
    if(rec && !rec.dataset.inactiveFixed){
      const e = rec.querySelector('.v'), v = parseFloat(e ? e.textContent : '');
      if(!isNaN(v) && act > 0){
        const nv = Math.min(100, Math.round(v * n / act)), unit = (e.querySelector('small') || {}).textContent || '';
        setV(rec, nv, unit.trim() + ' · active children');
        const b = band(nv), d = rec.querySelector('.d'); if(b && d && typeof mdPill === 'function') d.innerHTML = mdPill(b.l, b.c);
        rec.querySelectorAll('[style*="width"]').forEach(bar => { if(/%/.test(bar.style.width)) bar.style.width = nv + '%'; });
        rec.dataset.inactiveFixed = '1';
      }
    }
    const none = tile('Children with no marks');
    if(none && !none.dataset.inactiveFixed){
      const e = none.querySelector('.v'), v = parseInt(e ? e.textContent : '', 10);
      if(!isNaN(v)){
        const nv = Math.max(0, v - k); setV(none, nv, 'of ' + act + ' active');
        const d = none.querySelector('.d'); if(d && typeof mdPill === 'function') d.innerHTML = nv > act / 3 ? mdPill('Needs follow-up', 'crit') : nv ? mdPill('Some still open', 'warn') : mdPill('All assessed', 'good');
        none.dataset.inactiveFixed = '1';
      }
    }
    // the note, just under the tiles
    const grid = (rec || none) ? (rec || none).parentElement : null;
    const note = document.createElement('div'); note.setAttribute('data-inactive-note', '');
    note.style.cssText = 'margin:10px 0 4px; padding:10px 14px; border-radius:10px; background:#F2F4F3; border:1px solid #DDE3DF; font-size:13.5px;';
    const when = type === 'pretest' ? ('this term') : ('in ' + month());
    const names = out.map(p => p.name).slice(0, 12).join(', ') + (k > 12 ? ' …' : '');
    const aoNote = ao ? ` <span class="cap" style="margin:0;">· ${ao} attendance-only child${ao === 1 ? '' : 'ren'} not assessed (👥 card below).</span>` : '';
    if(!out.length){ note.innerHTML = `<b>${ao} attendance-only child${ao === 1 ? '' : 'ren'}</b> — on the register, not assessed, so left out of these figures (👥 card below).`;
      if(grid && grid.parentElement) grid.insertAdjacentElement('afterend', note); else targetEl.insertBefore(note, targetEl.firstChild); return; }
    note.innerHTML = `<b>${out.length} child${out.length === 1 ? '' : 'ren'} not active ${when}</b> — no marks for the whole ${type === 'pretest' ? 'term' : 'month'} (absent), so left out of ${type === 'pretest' ? 'this term\u2019s' : 'this month\u2019s'} figures: ${String(names).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))}. They stay in the grading list and count again as soon as they get a mark.` + aoNote;
    if(grid && grid.parentElement) grid.insertAdjacentElement('afterend', note); else targetEl.insertBefore(note, targetEl.firstChild);
  }

  // ---- 🔁 CATCH-UP: children absent for a whole month earlier this term — assess that month when they are back ----
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function termSoFar(){
    const ms = typeof assessTermMonths === 'function' ? assessTermMonths() : [];
    const now = MONTHS[new Date().getMonth()];
    const i = ms.indexOf(now);
    return i >= 0 ? ms.slice(0, i + 1) : ms;                  // the term's months up to this month
  }
  // load every month of the term so far (each loader returns true when ready, else calls back)
  function ready(type, months, redraw){
    const L = level(), ok = [];
    months.forEach(m => {
      if(type === 'observation'){
        if(typeof ensureObservationThemesLoaded === 'function') ok.push(ensureObservationThemesLoaded(L, m, redraw));
        if(typeof ensureObservationAssessmentLoaded === 'function') ok.push(ensureObservationAssessmentLoaded(m, redraw));
      } else {
        if(typeof ensureWorkbookPagesLoaded === 'function') ok.push(ensureWorkbookPagesLoaded(L, m, redraw));
        if(typeof ensureWorkbookChildMarksLoaded === 'function') ok.push(ensureWorkbookChildMarksLoaded(m, redraw));
      }
    });
    return ok.every(x => x !== false);
  }
  // what a month asks for: [{ code, text, from }] — the competencies, with their themes / pages
  function monthContent(type, m){
    const L = level(), by = {};
    const add = (code, from) => { if(!code) return; const c = window.HPC ? HPC.code(code) : code; (by[c] = by[c] || { code: c, from: new Set() }).from.add(from); };
    if(type === 'observation') ((typeof observationThemesCache !== 'undefined' && observationThemesCache[L + '|' + m]) || []).forEach(t => (t.items || []).forEach(it => add(it.cg_code, t.name)));
    else ((typeof workbookPagesCache !== 'undefined' && workbookPagesCache[L + '|' + m]) || []).forEach(b => (b.pages || []).forEach(pg => add(pg.cg_code, b.name + ' p.' + String(pg.page_number).replace(/\.0$/, ''))));
    return Object.values(by).map(x => { const i = window.HPC ? HPC.info(x.code) : null; return { code: x.code, text: (i && i.text) || '', from: [...x.from] }; })
      .sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }));
  }
  function catchUp(targetEl, type){
    const old = targetEl.querySelector('[data-catchup]'); if(old) old.remove();
    const months = termSoFar(); if(!months.length) return;
    const card = document.createElement('div'); card.className = 'card'; card.setAttribute('data-catchup', '');
    card.style.cssText = 'margin-top:16px; padding:16px 18px; border:1px solid var(--border, #D6DCD7);';
    const redraw = () => { try { if(typeof monthlyAssessmentTargetEl !== 'undefined' && monthlyAssessmentTargetEl) renderMonthlyAssessment(monthlyAssessmentTargetEl); } catch(e){} };
    if(!ready(type, months, redraw)){ card.innerHTML = '<b>🔁 Catch-up</b> <span class="cap" style="margin:0;">— checking the term\u2019s months…</span>'; targetEl.appendChild(card); return; }
    const rows = [];
    months.forEach((m, mi) => window.assessInactiveChildren(type, m).forEach(p => {
      const later = months.slice(mi + 1), test = later.map(x => hasMark(type, x));
      const backIn = later.find((x, k) => test[k] && test[k](p));
      // joined during this month (a new admission): not absent — simply not assessed yet
      const end = monthEnd(m), d = String(p.admitted_date || p.admission_date || '').slice(0, 10);
      const joined = !!(end && /^\d{4}-\d{2}-\d{2}$/.test(d) && d.slice(0, 7) === end.slice(0, 7));
      rows.push({ p, m, back: backIn || (joined ? m : ''), joined, what: monthContent(type, m) });
    }));
    const what = type === 'observation' ? 'Classroom Observation' : 'Workbook';
    if(!rows.length){
      card.innerHTML = `<b>🔁 Catch-up — ${what}</b><p class="cap" style="margin:6px 0 0;">Nobody missed a whole month this term so far — nothing to catch up.</p>`;
      targetEl.appendChild(card); return;
    }
    rows.sort((a, b) => (a.back ? 0 : 1) - (b.back ? 0 : 1) || months.indexOf(a.m) - months.indexOf(b.m) || a.p.name.localeCompare(b.p.name));
    const body = rows.map(r => `<tr>
        <td style="text-align:left; white-space:nowrap; vertical-align:top;"><b>${h(r.p.name)}</b></td>
        <td style="vertical-align:top; white-space:nowrap;"><b>${h(r.m)}</b></td>
        <td style="text-align:left; vertical-align:top; font-size:12.5px;">${r.what.map(x => `<div style="margin:0 0 3px;"><b>${h(x.code)}</b>${x.text ? ' — ' + h(x.text) : ''} <span class="cap" style="margin:0; font-size:11.5px;">(${h(x.from.join(', '))})</span></div>`).join('') || '<span class="cap" style="margin:0;">—</span>'}</td>
        <td style="vertical-align:top;">${r.back ? `<span style="display:inline-block; padding:3px 9px; border-radius:999px; font-size:12px; font-weight:800; background:#DDF2E5; color:#1E6B46; white-space:nowrap;">${r.joined && r.back === r.m ? 'Joined in ' + h(r.m) + ' — assess now' : 'Back since ' + h(r.back) + ' — assess now'}</span>`
            : '<span style="display:inline-block; padding:3px 9px; border-radius:999px; font-size:12px; font-weight:800; background:#FCE3E1; color:#9B1C1C; white-space:nowrap;">Still absent — follow up</span>'}</td>
        <td style="vertical-align:top;">${r.back ? `<button type="button" class="btn" style="width:auto; padding:6px 12px; font-size:12.5px;" onclick="assessCatchUpOpen('${h(r.m)}')">Open ${h(r.m)}</button>` : ''}</td></tr>`).join('');
    const nBack = rows.filter(r => r.back).length;
    card.innerHTML = `<div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:baseline;">
        <b style="font-size:15px;">🔁 Catch-up — ${what}: assess these when the child is back</b>
        <span class="cap" style="margin:0;">${nBack} to assess now · ${rows.length - nBack} still absent</span>
        <button type="button" class="btn" data-catchup-toggle="${type}" style="width:auto; padding:6px 12px; font-size:12.5px;" onclick="assessCatchUpToggle('${type}')">${catchUpOpen(type) ? 'Hide' : 'Show'}</button></div>
      <div data-catchup-body="${type}" style="display:${catchUpOpen(type) ? 'block' : 'none'};">
      <p class="cap" style="margin:6px 0 10px;">Each child missed a whole month (no marks while the class was assessed). When they are back, assess that month\u2019s competencies in normal class activities and enter the marks in <b>that month</b> (Open …) — they count for that month, and the child leaves this list.</p>
      <div style="overflow-x:auto;"><table class="report-table" style="width:100%; font-size:13px; min-width:860px;"><thead><tr><th style="text-align:left;">Child</th><th>Missed</th><th style="text-align:left;">What to assess</th><th>Status</th><th></th></tr></thead><tbody>${body}</tbody></table></div>
      </div>`;
    targetEl.appendChild(card);
  }
  // Hide / Show for the catch-up card (remembered on this device)
  // hidden by default: it opens only when someone clicks Show
  function catchUpOpen(type){ try { return localStorage.getItem('aarambhCatchUpOpen_' + type) === '1'; } catch(e){ return false; } }
  window.assessCatchUpToggle = function(type){
    const open = !catchUpOpen(type);
    try { localStorage.setItem('aarambhCatchUpOpen_' + type, open ? '1' : '0'); } catch(e){}
    document.querySelectorAll('[data-catchup-body="' + type + '"]').forEach(el => el.style.display = open ? 'block' : 'none');
    document.querySelectorAll('[data-catchup-toggle="' + type + '"]').forEach(el => el.textContent = open ? 'Hide' : 'Show');
  };
  window.assessCatchUpOpen = function(m){
    try { currentWorkbookMonth = m; } catch(e){}
    // Classroom Observation shows only its From–To months: widen them to include this month, and start at its first theme
    try {
      if(typeof obsRangeFrom !== 'undefined' && typeof assessTermMonths === 'function'){
        const ms = assessTermMonths(), i = ms.indexOf(m);
        if(i >= 0){
          if(ms.indexOf(obsRangeFrom) < 0 || ms.indexOf(obsRangeFrom) > i) obsRangeFrom = m;
          if(ms.indexOf(obsRangeTo) < 0 || ms.indexOf(obsRangeTo) < i) obsRangeTo = m;
        }
        if(typeof currentObservationThemeId !== 'undefined') currentObservationThemeId = null;
      }
    } catch(e){}
    try { if(typeof monthlyAssessmentTargetEl !== 'undefined' && monthlyAssessmentTargetEl){ renderMonthlyAssessment(monthlyAssessmentTargetEl); monthlyAssessmentTargetEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); } } catch(e){}
  };

  const base = renderMonthlyAssessment;
  renderMonthlyAssessment = function(targetEl){
    const out = base.apply(this, arguments);
    try {
      const type = typeof assessmentEntryType !== 'undefined' ? assessmentEntryType : '';
      // The not-active note is no longer shown on the assessment tabs; it appears under My Class.
      // Catch-up card removed from Classroom Observation and Workbook (not wanted on these screens)
    } catch(e){ console.error('assess-inactive', e); }
    return out;
  };
})();