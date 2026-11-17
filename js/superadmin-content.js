/* =========================================================================
   js/superadmin-content.js — superadmin portal · "🧩 Content & Activities"
   -------------------------------------------------------------------------
   The superadmin changes the activities here; teachers' dashboards use the
   change immediately (js/content-sync.js, and the observation themes).

     Pre-Test               Jr KG / Sr KG: each activity's type, wording, CG,
                            page — Save · Retire / Restore · Add activity
     Classroom Observation  Jr KG / Sr KG · month: each theme (name, month,
                            Retire / Restore) and its competencies (code,
                            Save, Retire / Restore, + Add) · + Add theme
     Workbook · Fine & Gross Motor — next · Weekly plans → activity-plans.html

   The safe rules: wording and CG can always change; new ones are added (a
   new Pre-Test activity takes the next number); old ones are RETIRED — kept
   for the records, hidden from new entry — never deleted. The server allows
   changes from superadmin logins only (backend/content/save_content.php).
   Loads after superadmin.js and superadmin-dashboards.js.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof switchAdminSection !== 'function') return;
  const S = { tab: 'pretest', level: 'Jr KG', month: 'June', pretest: null, themes: null, msg: '' };
  const MONTHS = ['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April'];
  const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const body = () => document.getElementById('admin-body');
  const api = (url, data) => fetch(url + window.location.search, data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : { cache: 'no-store' })
    .then(r => r.json().catch(() => ({ status: 'error', message: 'The server did not answer (HTTP ' + r.status + ').' })));

  // ---- the menu item ----
  function addNav(){
    if(document.getElementById('navContent')) return;
    const ref = document.getElementById('navEvents') || document.getElementById('navAddUser'); if(!ref) return;
    const b = ref.cloneNode(true); b.id = 'navContent'; b.classList.remove('active');
    b.removeAttribute('onclick'); b.onclick = () => switchAdminSection('content');
    const label = [...b.querySelectorAll('span')].pop(); if(label) label.textContent = 'Content & Activities'; else b.textContent = 'Content & Activities';
    const icon = b.querySelector('.icon'); if(icon) icon.textContent = '🧩';
    ref.insertAdjacentElement('afterend', b);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addNav); else addNav();

  const baseSwitch = switchAdminSection;
  switchAdminSection = function(section){
    const mine = document.getElementById('navContent');
    if(section !== 'content'){ if(mine) mine.classList.remove('active'); return baseSwitch.apply(this, arguments); }
    document.querySelectorAll('.sidebar-nav-btn.active, .sidebar .active').forEach(el => el.classList.remove('active'));
    if(mine) mine.classList.add('active');
    const sub = document.getElementById('adminSubheading'); if(sub) sub.textContent = 'Change the activities teachers use — the change reaches every teacher straight away';
    const pl = document.getElementById('pageLabel'); if(pl) pl.textContent = 'Content & Activities';
    const ss = document.getElementById('sidebar-schools-section'); if(ss) ss.classList.add('hidden');
    render();
  };

  // ---- drawing ----
  const chip = (on, label, click) => `<button type="button" onclick="${click}" style="padding:7px 15px; border-radius:999px; font:inherit; font-size:13.5px; font-weight:700; cursor:pointer; border:1px solid ${on ? 'var(--primary, #1E8F5E)' : 'var(--border, #D6DCD7)'}; background:${on ? 'var(--primary, #1E8F5E)' : '#fff'}; color:${on ? '#fff' : '#1D2B22'};">${label}</button>`;
  const btn = (label, click, kind) => `<button type="button" onclick="${click}" style="padding:6px 12px; border-radius:8px; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; ${kind === 'primary' ? 'border:1px solid var(--primary, #1E8F5E); background:var(--primary, #1E8F5E); color:#fff;' : kind === 'warn' ? 'border:1px solid #E9B5B1; background:#fff; color:#9B1C1C;' : 'border:1px solid var(--border, #D6DCD7); background:#fff; color:#17765B;'}">${label}</button>`;
  const inp = (attrs, val, w) => `<input ${attrs} value="${h(val)}" style="width:${w || '100%'}; padding:6px 8px; border:1px solid var(--border, #D6DCD7); border-radius:6px; font:inherit; font-size:13.5px; box-sizing:border-box;">`;
  const cgHint = code => { if(!window.HPC) return ''; const i = HPC.info(code); return i && i.text ? h(i.code + ' — ' + i.text) : i && i.whole ? h(i.cg + ' ' + i.cgName) : ''; };

  function render(){
    const el = body(); if(!el) return;
    const tabs = `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
        ${chip(S.tab === 'pretest', '📋 Pre-Test', "contentTab('pretest')")}${chip(S.tab === 'observation', '👁️ Classroom Observation', "contentTab('observation')")}
        <span title="Coming next" style="padding:7px 15px; border-radius:999px; font-size:13.5px; font-weight:700; border:1px dashed #D6DCD7; color:#8a968f;">📘 Workbook · next</span>
        <span title="Coming next" style="padding:7px 15px; border-radius:999px; font-size:13.5px; font-weight:700; border:1px dashed #D6DCD7; color:#8a968f;">🤸 Fine & Gross Motor · next</span>
        <a href="activity-plans.html" target="_blank" rel="noopener" title="Change the weekly activity plans (opens in a new tab)" style="padding:7px 15px; border-radius:999px; font-size:13.5px; font-weight:700; border:1px solid var(--border, #D6DCD7); color:#1D2B22; background:#fff; text-decoration:none;">▦ Weekly plans ↗</a></div>`;
    const rules = `<p class="cap" style="margin:0 0 14px;">Changes reach every teacher straight away. The wording and the CG can always be changed; new activities are added at the end; an old one is <b>retired</b> — kept for the marks already saved, hidden from new entry — never deleted.</p>`;
    const levels = `<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:14px;"><b style="font-size:13px; margin-right:4px;">Class</b>${chip(S.level === 'Jr KG', 'Jr KG (Balvatika 2)', "contentLevel('Jr KG')")}${chip(S.level === 'Sr KG', 'Sr KG (Balvatika 3)', "contentLevel('Sr KG')")}
        ${S.tab === 'observation' ? `<b style="font-size:13px; margin:0 4px 0 12px;">Month</b><select onchange="contentMonth(this.value)" style="padding:7px 10px; border:1px solid var(--border, #D6DCD7); border-radius:8px; font:inherit; font-size:13.5px;">${MONTHS.map(m => `<option ${m === S.month ? 'selected' : ''}>${m}</option>`).join('')}</select>` : ''}</div>`;
    const msg = S.msg ? `<div role="status" style="margin:0 0 12px; padding:10px 14px; border-radius:10px; font-size:13.5px; ${/^✓/.test(S.msg) ? 'background:#DDF2E5; color:#1E6B46;' : 'background:#FCE3E1; color:#9B1C1C;'}">${h(S.msg)}</div>` : '';
    el.innerHTML = `<div class="card" style="padding:18px 20px;">${tabs}${rules}${levels}${msg}<div data-content-body></div></div>`;
    const box = el.querySelector('[data-content-body]');
    if(S.tab === 'pretest') drawPretest(box); else drawObservation(box);
  }

  function drawPretest(box){
    if(!S.pretest){ box.innerHTML = '<p class="cap">Loading the Pre-Test activities…</p>'; loadPretest(); return; }
    const rows = S.pretest[S.level] || [];
    box.innerHTML = `<div style="overflow-x:auto;"><table class="report-table" style="width:100%; min-width:900px;"><thead><tr><th style="width:44px;">#</th><th style="width:130px;">Type</th><th style="text-align:left;">Activity</th><th style="width:110px;">CG / competency</th><th style="width:70px;">Page</th><th style="width:100px;">Status</th><th style="width:170px;"></th></tr></thead><tbody>
      ${rows.map(r => `<tr data-pos="${r.position}" style="${r.retired ? 'opacity:.55;' : ''}">
        <td><b>${r.position}</b></td>
        <td><select data-f="type" style="padding:6px; border:1px solid var(--border, #D6DCD7); border-radius:6px; font:inherit; font-size:13px;"><option ${r.type === 'Worksheet' ? 'selected' : ''}>Worksheet</option><option ${r.type === 'Classroom' ? 'selected' : ''}>Classroom</option></select></td>
        <td style="text-align:left;">${inp('data-f="activity" aria-label="Activity ' + r.position + '"', r.activity)}</td>
        <td title="${cgHint(r.cg)}">${inp('data-f="cg" aria-label="CG of activity ' + r.position + '"', r.cg, '96px')}</td>
        <td>${inp('data-f="page"', r.page, '56px')}</td>
        <td>${r.retired ? '<span style="font-size:12px; font-weight:800; color:#8a968f;">Retired</span>' : '<span style="font-size:12px; font-weight:800; color:#1E6B46;">In use</span>'}</td>
        <td style="white-space:nowrap;">${btn('Save', 'contentSavePretest(' + r.position + ')', 'primary')} ${r.retired ? btn('Restore', 'contentRetirePretest(' + r.position + ', false)') : btn('Retire', 'contentRetirePretest(' + r.position + ', true)', 'warn')}</td></tr>`).join('')}
      <tr data-new style="background:#F3FAF6;"><td><b>${rows.length + 1}</b></td>
        <td><select data-f="type" style="padding:6px; border:1px solid var(--border, #D6DCD7); border-radius:6px; font:inherit; font-size:13px;"><option>Worksheet</option><option selected>Classroom</option></select></td>
        <td style="text-align:left;">${inp('data-f="activity" placeholder="New activity — what the child does" aria-label="New activity"', '')}</td>
        <td>${inp('data-f="cg" placeholder="e.g. 8.2" aria-label="CG of the new activity"', '', '96px')}</td><td>${inp('data-f="page" placeholder="—"', '', '56px')}</td><td></td>
        <td>${btn('+ Add activity', 'contentAddPretest()', 'primary')}</td></tr>
      </tbody></table></div>
      <p class="cap" style="margin:10px 0 0;">${S.level}: ${rows.filter(r => !r.retired).length} in use${rows.some(r => r.retired) ? ', ' + rows.filter(r => r.retired).length + ' retired' : ''}. Hover a CG to see the competency.</p>`;
  }
  function drawObservation(box){
    if(!S.themes){ box.innerHTML = '<p class="cap">Loading the observation themes…</p>'; loadThemes(); return; }
    const list = S.themes.filter(t => t.level === S.level && t.month === S.month);
    const theme = t => `<div data-theme="${t.id}" style="border:1px solid #E3E7E3; border-radius:12px; padding:14px 16px; margin-bottom:12px; ${t.retired ? 'opacity:.55;' : ''}">
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          ${inp('data-f="name" aria-label="Theme name"', t.name, 'min(520px, 100%)')}
          <select data-f="month" aria-label="Month" style="padding:6px; border:1px solid var(--border, #D6DCD7); border-radius:6px; font:inherit; font-size:13px;">${MONTHS.map(m => `<option ${m === t.month ? 'selected' : ''}>${m}</option>`).join('')}</select>
          ${btn('Save theme', 'contentSaveTheme(' + t.id + ')', 'primary')} ${t.retired ? btn('Restore theme', 'contentRetireTheme(' + t.id + ', false)') : btn('Retire theme', 'contentRetireTheme(' + t.id + ', true)', 'warn')}
          ${t.retired ? '<span style="font-size:12px; font-weight:800; color:#8a968f;">Retired</span>' : ''}</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
          ${t.items.map(i => `<div data-item="${i.id}" title="${cgHint(i.cg_code)}" style="display:flex; gap:6px; align-items:center; padding:6px 8px; border:1px solid ${i.retired ? '#E3E7E3' : '#9FD3BB'}; border-radius:10px; background:${i.retired ? '#FAFBFA' : '#F3FAF6'}; ${i.retired ? 'opacity:.6;' : ''}">
              ${inp('data-f="cg_code" aria-label="Competency"', i.cg_code, '78px')}${btn('Save', 'contentSaveItem(' + i.id + ')')}${i.retired ? btn('Restore', 'contentRetireItem(' + i.id + ', false)') : btn('Retire', 'contentRetireItem(' + i.id + ', true)', 'warn')}</div>`).join('')}
          <div style="display:flex; gap:6px; align-items:center; padding:6px 8px; border:1px dashed #9FD3BB; border-radius:10px;">${inp('data-new-item placeholder="e.g. 4.2" aria-label="New competency"', '', '78px')}${btn('+ Add competency', 'contentAddItem(' + t.id + ')', 'primary')}</div>
        </div></div>`;
    box.innerHTML = (list.length ? list.map(theme).join('') : `<p class="cap">No themes for ${h(S.level)} in ${h(S.month)} yet.</p>`)
      + `<div style="border:1px dashed #9FD3BB; border-radius:12px; padding:12px 16px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; background:#F3FAF6;"><b style="font-size:13px;">New theme for ${h(S.level)}, ${h(S.month)}:</b>${inp('data-new-theme placeholder="Theme name" aria-label="New theme name"', '', 'min(420px, 100%)')}${btn('+ Add theme', 'contentAddTheme()', 'primary')}</div>
        <p class="cap" style="margin:10px 0 0;">Competencies are written C-1.2 (CG-1, competency 2). Hover one to see what it is.</p>`;
  }

  // ---- loading and saving ----
  function loadPretest(){ api('backend/content/get_pretest_activities.php').then(d => { if(d.status !== 'success'){ S.msg = d.message || 'Could not load the Pre-Test.'; S.pretest = { 'Jr KG': [], 'Sr KG': [] }; } else S.pretest = d.levels; render(); }); }
  function loadThemes(){ api('backend/content/get_observation_content.php').then(d => { if(d.status !== 'success'){ S.msg = d.message || 'Could not load the themes.'; S.themes = []; } else S.themes = d.themes; render(); }); }
  function save(data, okText, reload){
    return api('backend/content/save_content.php', data).then(d => {
      S.msg = d.status === 'success' ? '✓ ' + okText + ' — teachers see it now.' : (d.message || 'Not saved.');
      if(d.status === 'success'){ if(reload === 'pretest') S.pretest = null; else S.themes = null; }
      render();
    });
  }
  const val = (row, f) => { const el = row && row.querySelector('[data-f="' + f + '"]'); return el ? el.value : ''; };
  window.contentTab = t => { S.tab = t; S.msg = ''; render(); };
  window.contentLevel = l => { S.level = l; S.msg = ''; render(); };
  window.contentMonth = m => { S.month = m; S.msg = ''; render(); };
  window.contentSavePretest = pos => { const r = body().querySelector('tr[data-pos="' + pos + '"]');
    save({ action: 'pretest_update', level: S.level, position: pos, type: val(r, 'type'), activity: val(r, 'activity'), cg: val(r, 'cg'), page: val(r, 'page') }, S.level + ' activity ' + pos + ' saved', 'pretest'); };
  window.contentRetirePretest = (pos, on) => {
    if(on && !confirm('Retire ' + S.level + ' activity ' + pos + '?\n\nIt stays in the records with the marks already saved, but teachers will no longer see it for new entry. You can restore it later.')) return;
    save({ action: on ? 'pretest_retire' : 'pretest_restore', level: S.level, position: pos }, S.level + ' activity ' + pos + (on ? ' retired' : ' restored'), 'pretest'); };
  window.contentAddPretest = () => { const r = body().querySelector('tr[data-new]');
    save({ action: 'pretest_add', level: S.level, type: val(r, 'type'), activity: val(r, 'activity'), cg: val(r, 'cg'), page: val(r, 'page') }, 'New ' + S.level + ' activity added', 'pretest'); };
  window.contentSaveTheme = id => { const t = body().querySelector('[data-theme="' + id + '"]');
    save({ action: 'theme_update', id, name: val(t, 'name'), month: val(t, 'month') }, 'Theme saved', 'themes'); };
  window.contentRetireTheme = (id, on) => { if(on && !confirm('Retire this theme? Its observations already saved are kept; teachers will no longer see it.')) return;
    save({ action: on ? 'theme_retire' : 'theme_restore', id }, on ? 'Theme retired' : 'Theme restored', 'themes'); };
  window.contentAddTheme = () => { const n = body().querySelector('[data-new-theme]');
    save({ action: 'theme_add', level: S.level, month: S.month, name: n ? n.value : '' }, 'Theme added', 'themes'); };
  window.contentSaveItem = id => { const i = body().querySelector('[data-item="' + id + '"]');
    save({ action: 'item_update', id, cg_code: val(i, 'cg_code') }, 'Competency saved', 'themes'); };
  window.contentRetireItem = (id, on) => save({ action: on ? 'item_retire' : 'item_restore', id }, on ? 'Competency retired' : 'Competency restored', 'themes');
  window.contentAddItem = themeId => { const t = body().querySelector('[data-theme="' + themeId + '"] [data-new-item]');
    save({ action: 'item_add', theme_id: themeId, cg_code: t ? t.value : '' }, 'Competency added', 'themes'); };
})();