/* =========================================================================
   js/classlist-import-review.js — class-list import: check and correct every name
   -------------------------------------------------------------------------
   When a class list is imported (Class Attendance or Admissions → Import a
   file), the preview is a table, one row per child in the file:

     ✓ | Register no | Name (EDITABLE) | What will happen

     • Already on the roll (same spelling) ...................... nothing to do
     • Looks like a child on the roll, spelled differently:
          ◉ keep the roll's name   ○ change the roll to the name typed here
          ○ a different child — add as new
     • New child ................................................ added with the
       name as typed (correct it first if the file has it wrong)
     • A close name on the roll ("did you mean…?") ............. choose

   Any name can be corrected in its row before confirming; the corrected
   spelling is what is ADDED, or saved as the child's name
   (backend/pupils/rename_pupil.php — the name only, nothing else changes).
   Untick a row to leave it out. Spellings that differ from the roll are
   remembered (NameMatch), so the next register file still finds the child.
   Replaces previewClassPupilImportRows / confirmClassPupilImport
   (teacher-part-26.js / -02.js). Loads after the part files.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof previewClassPupilImportRows !== 'function' || typeof confirmClassPupilImport !== 'function') return;
  const h = s => (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NM = () => window.NameMatch && typeof NameMatch.find === 'function' ? NameMatch : null;
  const same = (a, b) => normPupilName(a) === normPupilName(b);
  let S = null;   // the review: { rows, removeMissing, problems, resultEl }

  // ---- read the file into review rows ----
  previewClassPupilImportRows = function(rows, resultEl, removeMissing){
    pendingPupilSync = null;
    if(!Array.isArray(realPupilsCache)){ resultEl.innerHTML = '<div class="au-error">Still loading the roll — try again in a moment.</div>'; return; }
    if(!rows || !rows.length){ resultEl.innerHTML = '<div class="au-error">The file is empty.</div>'; return; }
    const header = rows[0].map(x => String(x || '').trim().toLowerCase().replace(/[\s_]+/g, ' '));
    const col = n => header.findIndex(x => x === n);
    let nameCol = [col('name'), col('student name'), col('child name'), col('child')].find(i => i >= 0);
    if(nameCol === undefined && typeof SI_NAME_WORDS !== 'undefined'){ const k = header.findIndex(x => SI_NAME_WORDS.includes(x)); if(k >= 0) nameCol = k; }
    if(nameCol === undefined){ resultEl.innerHTML = '<div class="au-error">The first row must be a header with a "name" column (e.g. name,admitted date,dob,gender).</div>'; return; }
    const admCol = [col('admitted date'), col('admission date'), col('date of admission')].find(i => i >= 0);
    const dobCol = [col('dob'), col('date of birth')].find(i => i >= 0);
    const genderCol = col('gender');
    const regCol = typeof pickRegisterColumn === 'function' ? pickRegisterColumn(rows[0], rows.slice(1), [nameCol]) : -1;
    const problems = [], out = [], seen = new Set(), taken = new Set();
    for(let i = 1; i < rows.length; i++){
      const r = rows[i];
      const split = splitRegisterFromName(r[nameCol]);
      const name = split.name;
      if(!name) continue;
      if(typeof siNotAChild === 'function' && siNotAChild(name)){ problems.push(`Row ${i + 1}: "${name}" is not a child's name (crossed out / a note) — skipped.`); continue; }
      const regRaw = regCol >= 0 ? String(r[regCol] || '').trim().replace(/\.0+$/, '') : '';
      const regFromCol = NM() && NameMatch.registerFrom ? NameMatch.registerFrom(regRaw) : regRaw;
      const register_no = /^\d{1,6}$/.test(regFromCol) ? regFromCol : split.register_no;
      const key = normPupilName(name);
      if(seen.has(key)){ problems.push(`Row ${i + 1}: "${name}" appears twice in the file — listed once.`); continue; }
      seen.add(key);
      const adm = admCol !== undefined ? normaliseImportDate(r[admCol]) : '';
      const dob = dobCol !== undefined ? normaliseImportDate(r[dobCol]) : '';
      if(adm === null) problems.push(`Row ${i + 1} (${name}): admitted date "${r[admCol]}" isn't a date I can read — today's date will be used.`);
      if(dob === null) problems.push(`Row ${i + 1} (${name}): date of birth "${r[dobCol]}" isn't a date I can read — left blank.`);
      let gender = genderCol >= 0 ? String(r[genderCol] || '').trim() : '';
      gender = /^f/i.test(gender) ? 'Female' : /^m/i.test(gender) ? 'Male' : '';
      // who on the roll is this?
      let pupil = null, how = '', alts = [];
      const exact = realPupilsCache.find(p => !taken.has(p.id) && same(p.name, name));
      if(exact){ pupil = exact; how = 'exact'; }
      else if(NM()){ const m = NameMatch.find(name, { register: register_no, taken, roll: realPupilsCache });
        if(m.pupil && m.sure){ pupil = m.pupil; how = m.how; } else { alts = [m.pupil].concat(m.alternatives || []).filter((p, k, a) => p && a.indexOf(p) === k).slice(0, 3); } }
      if(pupil) taken.add(pupil.id);
      out.push({ row: i + 1, file: name, name, register_no, admitted_date: adm || todayDateKey(), dob: dob || '', gender, include: true,
        pupil, how, alts,
        // matched with another spelling → keep the roll's name unless the teacher chooses; new → add
        choice: pupil ? 'keep' : 'new', altId: '' });
    }
    S = { rows: out, removeMissing: !!removeMissing, problems, resultEl };
    draw();
  };

  // ---- the table ----
  function statusOf(r){
    if(!r.include) return ['Left out', 'This row will not be imported.', '#EEF1EE', '#5B6B62'];
    if(r.pupil && r.choice !== 'new'){
      const renamed = r.choice === 'rename' || (r.how === 'exact' && !same(r.name, r.pupil.name));
      if(renamed) return ['Name corrected', `${r.pupil.name} → ${r.name}`, '#FFF1CC', '#7A5300'];
      return r.how === 'exact' ? ['On the roll', '', '#DDF2E5', '#1E6B46'] : ['On the roll as “' + r.pupil.name + '”', (window.NameMatch && NameMatch.how(r.how)) || 'spelled differently', '#E8F1FB', '#1F4E79'];
    }
    if(r.altId){ const p = realPupilsCache.find(x => String(x.id) === String(r.altId)); return ['Same child as “' + (p ? p.name : '') + '”', 'kept on the roll', '#E8F1FB', '#1F4E79']; }
    return ['New — will be added', '', '#DDF2E5', '#1E6B46'];
  }
  function draw(){
    const el = S.resultEl; if(!el) return;
    const rowsHtml = S.rows.map((r, k) => {
      const [st, sub, bg, fg] = statusOf(r);
      let choices = '';
      if(r.include && r.pupil && r.how !== 'exact'){
        choices = `<div style="display:flex; flex-direction:column; gap:3px; margin-top:6px; font-size:12.5px;">
          <label><input type="radio" name="cli${k}" ${r.choice === 'keep' ? 'checked' : ''} onchange="cliSet(${k}, 'choice', 'keep')"> keep the roll's name <b>${h(r.pupil.name)}</b></label>
          <label><input type="radio" name="cli${k}" ${r.choice === 'rename' ? 'checked' : ''} onchange="cliSet(${k}, 'choice', 'rename')"> change the roll to the name typed here</label>
          <label><input type="radio" name="cli${k}" ${r.choice === 'new' ? 'checked' : ''} onchange="cliSet(${k}, 'choice', 'new')"> a different child — add as new</label></div>`;
      } else if(r.include && !r.pupil && r.alts.length){
        choices = `<div style="display:flex; flex-direction:column; gap:3px; margin-top:6px; font-size:12.5px;"><span class="cap" style="margin:0;">A close name is on the roll — is it the same child?</span>
          <label><input type="radio" name="cli${k}" ${!r.altId ? 'checked' : ''} onchange="cliSet(${k}, 'altId', '')"> no — a new child</label>
          ${r.alts.map(p => `<label><input type="radio" name="cli${k}" ${String(r.altId) === String(p.id) ? 'checked' : ''} onchange="cliSet(${k}, 'altId', '${p.id}')"> yes, it is <b>${h(p.name)}</b>${p.register_no ? ' (' + h(p.register_no) + ')' : ''}</label>`).join('')}</div>`;
      }
      const edited = !same(r.name, r.file);
      return `<tr style="${r.include ? '' : 'opacity:.55;'}">
        <td style="text-align:center;"><input type="checkbox" ${r.include ? 'checked' : ''} onchange="cliSet(${k}, 'include', this.checked)" aria-label="Import row ${r.row}"></td>
        <td style="white-space:nowrap;">${h(r.register_no || '—')}</td>
        <td style="min-width:220px;"><input type="text" value="${h(r.name)}" ${r.include ? '' : 'disabled'} oninput="cliName(${k}, this.value)" onchange="cliSet(${k}, 'name', this.value)" aria-label="Name in row ${r.row}"
              style="width:100%; box-sizing:border-box; padding:6px 8px; border:1px solid ${edited ? '#E0A526' : 'var(--border, #D6DCD7)'}; border-radius:6px; font:inherit; font-size:13.5px; ${edited ? 'background:#FFFBEA;' : ''}">
            ${edited ? `<div class="cap" style="margin:2px 0 0; font-size:11.5px;">in the file: “${h(r.file)}”</div>` : ''}</td>
        <td><span style="display:inline-block; padding:3px 9px; border-radius:999px; font-size:12px; font-weight:800; background:${bg}; color:${fg};">${h(st)}</span>${sub ? `<div class="cap" style="margin:3px 0 0; font-size:11.5px;">${h(sub)}</div>` : ''}${choices}</td></tr>`;
    }).join('');
    const plan = build();
    const missing = S.removeMissing ? plan.remove.length : 0;
    const summary = [plan.add.length ? `<b style="color:#1E6B46;">${plan.add.length} to add</b>` : '', plan.renames.length ? `<b style="color:#7A5300;">${plan.renames.length} name${plan.renames.length === 1 ? '' : 's'} to correct</b>` : '',
      `${plan.keep} already on the roll`, plan.regUpdates.length ? `${plan.regUpdates.length} register number${plan.regUpdates.length === 1 ? '' : 's'} to save` : '',
      missing ? `<b style="color:#9B1C1C;">${missing} to take off the roll</b> (not in the file)` : ''].filter(Boolean).join(' · ');
    const nothing = !plan.add.length && !plan.renames.length && !plan.regUpdates.length && !missing;
    el.innerHTML = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px;">
      <p style="margin:0 0 4px; font-weight:700;">Check the names — nothing has been saved yet</p>
      <p class="cap" style="margin:0 0 10px;">Correct any spelling in its box: the corrected name is the one saved. Untick a row to leave it out.</p>
      <div style="overflow-x:auto;"><table class="report-table" style="width:100%; font-size:13px;"><thead><tr><th style="width:44px;">✓</th><th style="width:90px; text-align:left;">Register no</th><th style="text-align:left;">Name</th><th style="text-align:left;">What will happen</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
      ${missing ? `<p class="cap" style="margin:8px 0 0;">Taken off the roll (their past records are kept): ${h(plan.remove.slice(0, 30).map(r => r.name).join(', '))}${plan.remove.length > 30 ? ' …' : ''}</p>` : ''}
      ${S.problems.length ? `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:8px 10px; margin:10px 0 0; font-size:12.5px;">${S.problems.slice(0, 15).map(h).join('<br>')}</div>` : ''}
      <p style="margin:12px 0 0; font-size:13.5px;">${summary}</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn-primary" style="width:auto; padding:8px 14px;" ${nothing ? 'disabled' : ''} onclick="confirmClassPupilImport()">${nothing ? 'Nothing to change' : 'Confirm and save'}</button>
        <button class="btn" onclick="cliCancel()">Cancel</button></div></div>`;
  }

  // ---- what will be saved ----
  function build(){
    const add = [], renames = [], regUpdates = [], remember = [], usedIds = new Set();
    let keep = 0;
    S.rows.forEach(r => {
      if(!r.include) return;
      const name = String(r.name || '').trim().replace(/\s+/g, ' '); if(!name) return;
      let p = r.pupil && r.choice !== 'new' ? r.pupil : (r.altId ? realPupilsCache.find(x => String(x.id) === String(r.altId)) : null);
      if(p){
        usedIds.add(p.id); keep++;
        // renamed: the teacher chose "change the roll to the name typed here", or edited the name of a child found by exact spelling
        const wantRename = (r.choice === 'rename' && r.pupil) || (r.how === 'exact' && !same(name, p.name));
        if(wantRename && !same(name, p.name)) renames.push({ id: p.id, from: p.name, name });
        const finalName = wantRename ? name : p.name;
        if(!same(r.file, finalName)) remember.push({ spelling: r.file, id: p.id, name: finalName });
        if(r.register_no && String(p.register_no || '') !== r.register_no) regUpdates.push({ id: p.id, name: finalName, register_no: r.register_no });
      } else {
        add.push({ name, register_no: r.register_no, admitted_date: r.admitted_date, dob: r.dob, gender: r.gender });
      }
    });
    const remove = S.removeMissing ? realPupilsCache.filter(p => !usedIds.has(p.id)).map(p => ({ id: p.id, name: p.name })) : [];
    return { add, renames, regUpdates, remember, keep, remove };
  }

  window.cliSet = (k, field, v) => { const r = S && S.rows[k]; if(!r) return; r[field] = field === 'name' ? String(v) : v; draw(); };
  window.cliName = (k, v) => { const r = S && S.rows[k]; if(r) r.name = String(v); };   // while typing: no redraw (keeps the cursor)
  window.cliCancel = () => { S = null; pendingPupilSync = null; const el = document.getElementById('classPupilImportResult'); if(el) el.innerHTML = '<p class="cap">Import cancelled — nothing was saved.</p>'; };

  // ---- save ----
  confirmClassPupilImport = async function(){
    const el = (S && S.resultEl) || document.getElementById('classPupilImportResult');
    if(!S){ if(el) el.innerHTML = '<div class="au-error">Preview a file first.</div>'; return; }
    const plan = build();
    if(plan.remove.length && !confirm(plan.remove.length + ' child' + (plan.remove.length === 1 ? '' : 'ren') + ' will be taken off the roll. Continue?')) return;
    el.innerHTML = '<p class="sub">Saving…</p>';
    const qs = window.location.search, cid = (typeof myClassInfo !== 'undefined' && myClassInfo.class_id) || null;
    const post = (url, body) => fetch(url + qs, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
    const failed = [];
    try {
      // 1. names corrected (the name only)
      for(const x of plan.renames){ const d = await post('backend/pupils/rename_pupil.php', { pupil_id: x.id, name: x.name, class_id: cid }).catch(() => ({ status: 'error' }));
        if(d.status !== 'success') failed.push(x.from + ' → ' + x.name); }
      // 2. new children, register numbers, children taken off — as before
      let data = { status: 'success', added: 0, removed: 0, register_updated: 0 };
      if(plan.add.length || plan.remove.length || plan.regUpdates.length)
        data = await post('backend/pupils/sync_class_pupils.php', { add: plan.add.map(a => Object.assign({ manual_verified: true }, a)), remove_ids: plan.remove.map(r => r.id), register_updates: plan.regUpdates, class_id: cid });
      if(data.status !== 'success'){ el.innerHTML = `<div class="au-error">${h(data.message || 'Import failed.')}</div>`; return; }
      // 3. remember the file's spellings, so the next register file still finds these children
      if(NM() && NameMatch.remember) plan.remember.forEach(m => { try { NameMatch.remember(m.spelling, { id: m.id, name: m.name }); } catch(e){} });
      if(typeof rollNotAddedText === 'function'){ const held = rollNotAddedText(data); if(held) alert(held); }
      S = null; pendingPupilSync = null;
      alert('Roll updated: ' + (data.added || 0) + ' added' + (plan.renames.length - failed.length ? ', ' + (plan.renames.length - failed.length) + ' name' + (plan.renames.length - failed.length === 1 ? '' : 's') + ' corrected' : '')
        + (data.removed ? ', ' + data.removed + ' taken off the roll' : '') + (data.register_updated ? ', ' + data.register_updated + ' register number' + (data.register_updated === 1 ? '' : 's') + ' saved' : '') + '.'
        + (failed.length ? '\n\nThese names could not be corrected: ' + failed.join(', ') + ' — try again, or use Admissions → Edit.' : ''));
      realPupilsCache = null;
      if(typeof renderAttendanceBody === 'function'){ try { renderAttendanceBody(); } catch(e){} }
      const adm = document.getElementById('admissions-body'); if(adm && !adm.classList.contains('hidden') && typeof renderAdmissions === 'function'){ try { renderAdmissions(); } catch(e){} }
    } catch(err){ el.innerHTML = '<div class="au-error">Could not reach the server.</div>'; }
  };
})();
