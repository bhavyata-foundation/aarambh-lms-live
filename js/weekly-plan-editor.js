/* =========================================================================
   js/weekly-plan-editor.js — change the weekly activity plans (activity-plans.html)
   -------------------------------------------------------------------------
   For the superadmin and supervisors. Choose a week: a grid of the day's
   TOPIC and every ACTIVITY AREA (time · CG) × Mon–Fri, each cell the given
   activity. Edit any cell → Save changes. A changed cell shows who changed it
   and "↺ original" puts the original plan back. Download the week as Excel.
   Teachers see the changes on My Day, Insights and the Activity record
   (js/weekly-plan-sync.js). The server allows changes only for the superadmin
   and supervisors (backend/content/weekly_plan.php) and logs every change.
   ========================================================================= */
(function(){
  'use strict';
  const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday']];
  const areas = () => (typeof DOMAINS !== 'undefined' ? DOMAINS : []).map(d => ({ key: d.key, label: d.label || d.name || d.key, time: d.time || '', cg: d.cg || '' }));
  const S = { week: null, canEdit: false, msg: '', busy: false, loaded: false, error: '' };
  const API = 'backend/content/weekly_plan.php';
  const weeks = () => { const s = new Set(Object.keys(typeof WEEKLY_PLAN !== 'undefined' ? WEEKLY_PLAN : {}).map(k => +k.replace('wk', '')).filter(Boolean));
    (window.weeklyPlanChanges || []).forEach(c => s.add(c.week)); return [...s].sort((a, b) => a - b); };
  const weekTitle = w => { const W = (typeof WEEKS !== 'undefined' && Array.isArray(WEEKS)) ? WEEKS.find(x => +x.week === w || +x.number === w) : null; return 'Week ' + w + (W && (W.title || W.theme) ? ' — ' + (W.title || W.theme) : ''); };
  const change = (w, d, a) => (window.weeklyPlanChanges || []).find(c => c.week === w && c.day === d && c.area === a);
  const current = (w, d, a) => { const c = change(w, d, a); return c ? c.text : window.weeklyPlanOriginal(w, d, a); };

  async function load(){
    window.__weeklyPlanNoAutoLoad = true;
    const d = await window.loadWeeklyPlanChanges();
    S.loaded = true;
    if(d.status !== 'success'){ S.error = d.message || 'Could not load the plans.'; draw(); return; }
    S.canEdit = !!d.can_edit; if(!S.week) S.week = weeks().slice(-1)[0] || 1;
    draw();
  }
  function draw(){
    const el = document.getElementById('plans'); if(!el) return;
    if(!S.loaded){ el.innerHTML = '<p class="cap">Loading the weekly plans…</p>'; return; }
    if(S.error){ el.innerHTML = `<div class="au-error">${h(S.error)}</div>${/log in/i.test(S.error) ? '<p><a href="index.html">Log in</a> as the superadmin or a supervisor, then open this page again.</p>' : ''}`; return; }
    const w = S.week, A = areas();
    const cell = (d, a) => { const c = change(w, d, a), v = current(w, d, a);
      return `<td style="vertical-align:top; padding:6px; min-width:170px; ${c ? 'background:#FFF8DC;' : ''}">
        <textarea data-cell="${d}|${a}" ${S.canEdit ? '' : 'readonly'} rows="${a === '_topic' ? 2 : 3}" oninput="wpeMark(this)"
          style="width:100%; box-sizing:border-box; padding:6px 8px; border:1px solid var(--border, #D6DCD7); border-radius:6px; font:inherit; font-size:13px; resize:vertical; ${a === '_topic' ? 'font-weight:700;' : ''}">${h(v)}</textarea>
        ${c ? `<div class="cap" style="margin:3px 0 0; font-size:11px;">changed${c.by ? ' by ' + h(c.by) : ''}${c.at ? ' · ' + h(String(c.at).slice(0, 10)) : ''}${S.canEdit ? ` · <a href="#" onclick="wpeReset('${d}', '${a}'); return false;">↺ original</a>` : ''}</div>` : ''}</td>`; };
    const nChanged = (window.weeklyPlanChanges || []).filter(c => c.week === w).length;
    el.innerHTML = `
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
        <label style="font-weight:700;">Week <select onchange="wpeWeek(+this.value)" style="margin-left:6px; padding:8px 10px; border:1px solid var(--border); border-radius:8px; font:inherit;">
          ${weeks().map(x => `<option value="${x}" ${x === w ? 'selected' : ''}>${h(weekTitle(x))}</option>`).join('')}</select></label>
        ${S.canEdit ? `<label class="cap" style="margin:0;">or week no. <input type="number" min="1" max="60" style="width:70px; padding:6px; border:1px solid var(--border); border-radius:6px;" onchange="wpeWeek(+this.value)"></label>` : ''}
        <span class="cap" style="margin:0;">${nChanged ? nChanged + ' cell' + (nChanged === 1 ? '' : 's') + ' changed from the original (yellow)' : 'the original plan'}</span></div>
      ${S.canEdit ? '' : '<p class="cap" style="margin:0 0 10px; padding:8px 12px; background:#FCE3E1; border-radius:8px;">You can read the plans; only the superadmin and supervisors can change them.</p>'}
      <div style="overflow-x:auto;"><table class="report-table" style="width:100%; min-width:1000px;"><thead><tr><th style="text-align:left; width:170px;">Activity area</th>${DAYS.map(([, n]) => `<th>${n}</th>`).join('')}</tr></thead><tbody>
        <tr><td style="text-align:left; vertical-align:top;"><b>Day topic</b></td>${DAYS.map(([d]) => cell(d, '_topic')).join('')}</tr>
        ${A.map(a => `<tr><td style="text-align:left; vertical-align:top;"><b>${h(a.label)}</b><div class="cap" style="margin:2px 0 0; font-size:11.5px;">${h([a.time, a.cg].filter(Boolean).join(' · '))}</div></td>${DAYS.map(([d]) => cell(d, a.key)).join('')}</tr>`).join('')}
      </tbody></table></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; align-items:center;">
        ${S.canEdit ? `<button class="btn-primary" style="width:auto; padding:9px 16px;" ${S.busy ? 'disabled' : ''} onclick="wpeSave()">💾 Save changes</button>` : ''}
        <button class="btn" style="width:auto; padding:9px 16px;" onclick="wpeExcel()">⬇ Download this week's plan (Excel)</button>
        ${S.msg ? `<span role="status" style="padding:6px 12px; border-radius:8px; font-size:13.5px; ${/^⚠/.test(S.msg) ? 'background:#FCE3E1; color:#9B1C1C;' : 'background:#DDF2E5; color:#1E6B46;'}">${h(S.msg)}</span>` : ''}</div>
      <p class="cap" style="margin:10px 0 0;">Saved changes reach every teacher's My Day, the Insights coverage and the Activity record (and its Excel) the next time their page loads.</p>`;
  }
  const post = body => fetch(API + window.location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()).catch(() => ({ status: 'error', message: 'The server did not answer.' }));
  window.wpeMark = t => { const [d, a] = t.dataset.cell.split('|'); t.style.borderColor = t.value.trim() !== current(S.week, d, a).trim() ? '#E0A526' : ''; };
  window.wpeWeek = w => { if(!w) return; S.week = w; S.msg = ''; draw(); };
  window.wpeSave = async function(){
    const edits = [...document.querySelectorAll('#plans textarea[data-cell]')].map(t => { const [d, a] = t.dataset.cell.split('|'); return { d, a, v: t.value.trim() }; })
      .filter(x => x.v !== current(S.week, x.d, x.a).trim());
    if(!edits.length){ S.msg = 'Nothing has changed.'; draw(); return; }
    S.busy = true; S.msg = 'Saving ' + edits.length + '…'; draw();
    let ok = 0; const bad = [];
    for(const x of edits){
      const orig = window.weeklyPlanOriginal(S.week, x.d, x.a).trim();
      const d = !x.v || x.v === orig ? await post({ action: 'reset', week: S.week, day: x.d, area: x.a }) : await post({ action: 'save', week: S.week, day: x.d, area: x.a, text: x.v });
      d.status === 'success' ? ok++ : bad.push(d.message || 'not saved');
    }
    await window.loadWeeklyPlanChanges();
    S.busy = false; S.msg = (bad.length ? '⚠ ' + bad.length + ' not saved (' + bad[0] + '). ' : '✓ ') + ok + ' saved — teachers see it on their next page load.'; draw();
  };
  window.wpeReset = async function(d, a){
    if(!confirm('Put back the original plan for this cell?')) return;
    const r = await post({ action: 'reset', week: S.week, day: d, area: a });
    await window.loadWeeklyPlanChanges(); S.msg = r.status === 'success' ? '✓ The original plan is back.' : '⚠ ' + (r.message || 'Not reset.'); draw();
  };
  window.wpeExcel = function(){
    if(typeof XLSX === 'undefined'){ alert('The spreadsheet tool did not load — check the internet.'); return; }
    const w = S.week, rows = [[weekTitle(w)], [], ['Activity area', 'Time', 'CG'].concat(DAYS.map(([, n]) => n)), ['Day topic', '', ''].concat(DAYS.map(([d]) => current(w, d, '_topic')))];
    areas().forEach(a => rows.push([a.label, a.time, a.cg].concat(DAYS.map(([d]) => current(w, d, a.key)))));
    const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 8 }].concat(DAYS.map(() => ({ wch: 34 })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Week ' + w); XLSX.writeFile(wb, 'Weekly_plan_week_' + w + '.xlsx');
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
