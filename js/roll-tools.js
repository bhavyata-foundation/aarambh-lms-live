/* =========================================================================
   js/roll-tools.js — Admissions: correct a name, clear or tidy the roll
   -------------------------------------------------------------------------
   Adds to Class Attendance → Admissions (renderAdmissions, wrapped by name):

   • ✎ Edit, on every child in "Every admission": opens a small editor right
     under that child — "Name of the student" (filled in) and the register
     number — then Save. "Edit all details" in it opens the full admission
     form (address, date of birth …) as before. Only those change — no date of
     birth needed, nothing else is overwritten. The OLD spelling is kept as
     a remembered spelling (js/name-match.js), so files still written the
     old way keep matching this child.

   • "🧹 Clear or tidy the roll":
       – Take everyone off the roll (type REMOVE ALL). Nothing is deleted:
         attendance and marks stay, an import with the same names brings each
         child back (never a duplicate), and Undo restores them at once.
       – Children taken off the roll: how many, and which have saved data.
       – Permanently delete the ones with NOTHING saved (type DELETE).
         A child with any attendance or mark can't be deleted this way.

   Server: backend/pupils/roll_tools.php. Loads after the part files.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof renderAdmissions !== 'function') return;
  const UNDO_KEY = 'aarambhRollUndo';
  const api = async body => {
    const res = await fetch('backend/pupils/roll_tools.php' + window.location.search, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ class_id: myClassInfo.class_id }, body)) });
    let d; try { d = await res.json(); } catch(e){ throw new Error(res.status === 404 ? 'backend/pupils/roll_tools.php is not on the server yet.' : 'The server did not answer properly (HTTP ' + res.status + ').'); }
    return d;
  };
  const reload = () => { realPupilsCache = null; renderAdmissions(); };
  const undoInfo = () => { try { const u = JSON.parse(localStorage.getItem(UNDO_KEY) || 'null'); return u && String(u.class_id) === String(myClassInfo.class_id) ? u : null; } catch(e){ return null; } };

  // ---- ✏️ Name: edit in place ----
  window.rollEditName = function(id){
    const p = (realPupilsCache || []).find(x => x.id === id); if(!p) return;
    const row = document.querySelector(`tr[data-roll-row="${id}"]`); if(!row) return;
    document.querySelectorAll('tr[data-roll-editor]').forEach(tr => tr.remove()); // one editor at a time
    const ed = document.createElement('tr'); ed.setAttribute('data-roll-editor', id);
    const lbl = 'font-size:10.5px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; display:block;';
    const fld = 'padding:10px 12px; border:1px solid var(--border); border-radius:8px; font:inherit; font-size:14px; box-sizing:border-box;';
    ed.innerHTML = `<td colspan="${row.children.length}" style="background:var(--bg,#f6f8f6); padding:14px 16px; text-align:left;">
        <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end;">
          <label style="flex:1 1 260px;"><span style="${lbl}">Name of the student</span><input type="text" value="${esc(p.name)}" data-roll-input style="${fld} width:100%;"></label>
          <label style="flex:0 0 150px;"><span style="${lbl}">Register no.</span><input type="text" value="${esc(p.register_no || '')}" data-roll-reg style="${fld} width:100%;"></label>
          <div style="display:flex; gap:8px;">
            <button class="btn-primary" style="width:auto; padding:10px 20px;" data-roll-save>Save</button>
            <button class="btn" style="padding:10px 16px;" data-roll-cancel>Cancel</button>
          </div>
        </div>
        <div class="cap" data-roll-msg style="margin-top:8px;"></div>
        <div style="margin-top:6px;"><a href="#" class="cap" data-roll-more>Edit all details (address, date of birth, previous school, receipt) →</a></div>
      </td>`;
    row.insertAdjacentElement('afterend', ed);
    const input = ed.querySelector('[data-roll-input]'), msg = ed.querySelector('[data-roll-msg]');
    input.focus(); input.setSelectionRange(input.value.length, input.value.length);
    ed.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const save = async (confirmLookalike) => {
      const name = input.value.trim(), reg = ed.querySelector('[data-roll-reg]').value.trim();
      if(!name){ msg.innerHTML = '<span style="color:var(--crit,#d03b3b);">The name can\u2019t be empty.</span>'; return; }
      if(name === p.name && reg === String(p.register_no || '')){ ed.remove(); return; } // nothing changed
      msg.textContent = 'Saving…'; ed.querySelector('[data-roll-save]').disabled = true;
      try {
        const d = await api({ action: 'rename', pupil_id: id, name, register_no: reg, confirm_lookalike: !!confirmLookalike });
        if(d.status !== 'success'){
          ed.querySelector('[data-roll-save]').disabled = false;
          if(d.code === 'lookalike' && confirm(d.message)) return save(true);
          msg.innerHTML = `<span style="color:var(--crit,#d03b3b);">${esc(d.message || 'Could not save.')}</span>`; return;
        }
        // files written the old way keep matching this child
        if(window.NameMatch && d.old_name && d.old_name !== d.name) NameMatch.remember(d.old_name, { id, name: d.name });
        reload();
      } catch(e){ ed.querySelector('[data-roll-save]').disabled = false; msg.innerHTML = `<span style="color:var(--crit,#d03b3b);">${esc(e.message || e)}</span>`; }
    };
    ed.querySelector('[data-roll-save]').onclick = () => save(false);
    ed.querySelector('[data-roll-cancel]').onclick = () => ed.remove();
    ed.querySelector('[data-roll-more]').onclick = e => { e.preventDefault(); ed.remove(); if(typeof editAdmission === 'function') editAdmission(id); };
    input.onkeydown = e => { if(e.key === 'Enter') save(false); if(e.key === 'Escape') ed.remove(); };
  };

  // ---- clear / undo / delete empty ----
  window.rollRemoveAll = async function(){
    const n = (realPupilsCache || []).length;
    const typed = prompt(`Take all ${n} children of ${myClassInfo.class_name || 'this class'} off the roll?\n\nNothing is deleted: their attendance and marks are kept, and importing the class list again brings each child back. You can also undo straight away.\n\nType REMOVE ALL to confirm.`);
    if(typed === null) return;
    if(typed.trim().toUpperCase() !== 'REMOVE ALL'){ alert('Nothing was changed (REMOVE ALL was not typed).'); return; }
    try {
      const d = await api({ action: 'remove_all', confirm: 'REMOVE ALL' });
      if(d.status !== 'success') throw new Error(d.message);
      try { localStorage.setItem(UNDO_KEY, JSON.stringify({ class_id: myClassInfo.class_id, ids: d.ids, at: new Date().toISOString() })); } catch(e){}
      alert(d.removed + ' children were taken off the roll. Use Undo in "Clear or tidy the roll" to bring them back.');
      reload();
    } catch(e){ alert('The roll was not changed: ' + (e.message || e)); }
  };
  window.rollUndo = async function(){
    const u = undoInfo(); if(!u) return;
    try {
      const d = await api({ action: 'restore', ids: u.ids });
      if(d.status !== 'success') throw new Error(d.message);
      try { localStorage.removeItem(UNDO_KEY); } catch(e){}
      alert(d.restored + ' children are back on the roll.' + (d.skipped && d.skipped.length ? '\n\nNot brought back:\n• ' + d.skipped.join('\n• ') : ''));
      reload();
    } catch(e){ alert('Could not undo: ' + (e.message || e)); }
  };
  window.rollDeleteEmpty = async function(){
    const box = document.querySelector('[data-roll-removed]');
    try {
      const list = await api({ action: 'removed' }); if(list.status !== 'success') throw new Error(list.message);
      const empty = list.children.filter(c => !c.saved);
      if(!empty.length){ alert('No child off the roll is without saved data — nothing can be deleted.'); return; }
      const typed = prompt(`PERMANENTLY delete ${empty.length} child${empty.length === 1 ? '' : 'ren'} who ${empty.length === 1 ? 'is' : 'are'} off the roll and ${empty.length === 1 ? 'has' : 'have'} nothing saved?\n\n${empty.slice(0, 20).map(c => '• ' + c.name).join('\n')}${empty.length > 20 ? '\n• … and ' + (empty.length - 20) + ' more' : ''}\n\nThis can't be undone. Type DELETE to confirm.`);
      if(typed === null) return;
      if(typed.trim().toUpperCase() !== 'DELETE'){ alert('Nothing was deleted (DELETE was not typed).'); return; }
      const d = await api({ action: 'delete_empty', confirm: 'DELETE' }); if(d.status !== 'success') throw new Error(d.message);
      alert(d.deleted + ' deleted.' + (d.kept_with_data ? ' ' + d.kept_with_data + ' kept, because they have saved attendance or marks.' : ''));
      reload();
    } catch(e){ alert('Nothing was deleted: ' + (e.message || e)); if(box) box.textContent = ''; }
  };
  async function fillRemoved(el){
    try {
      const d = await api({ action: 'removed' }); if(d.status !== 'success') throw new Error(d.message);
      const withData = d.children.filter(c => c.saved), empty = d.children.filter(c => !c.saved);
      el.innerHTML = !d.children.length ? 'No child is off the roll.'
        : `<b>${d.children.length}</b> child${d.children.length === 1 ? ' is' : 'ren are'} off the roll: ${withData.length} with saved data (kept), <b>${empty.length}</b> with nothing saved.`
          + (empty.length ? ` <span class="cap">(${empty.slice(0, 12).map(c => esc(c.name)).join(', ')}${empty.length > 12 ? ' …' : ''})</span>` : '');
    } catch(e){ el.textContent = ''; }
  }

  const base = renderAdmissions;
  renderAdmissions = function(){
    const out = base.apply(this, arguments);
    try {
      const container = document.getElementById('admissions-body'); if(!container || !Array.isArray(realPupilsCache)) return out;
      // ✎ Edit opens the name editor right under the child (the full form is one link away in it)
      container.querySelectorAll('button[onclick^="editAdmission("]').forEach(eb => {
        const id = +(eb.getAttribute('onclick').match(/editAdmission\((\d+)/) || [])[1];
        const tr = eb.closest('tr'); if(!id || !tr || tr.hasAttribute('data-roll-row')) return;
        tr.setAttribute('data-roll-row', id);
        eb.removeAttribute('onclick'); eb.onclick = () => rollEditName(id);
        eb.textContent = '✎ Edit'; eb.title = 'Edit this child\u2019s name';
      });
      // the clear / tidy section, after "Every admission"
      if(!container.querySelector('[data-roll-tools]')){
        const u = undoInfo(), card = document.createElement('div');
        card.className = 'card'; card.setAttribute('data-roll-tools', ''); card.setAttribute('data-no-export', '1');
        card.style.cssText = 'margin-top:16px; padding:16px 18px;';
        card.innerHTML = `<h3 style="margin:0 0 4px; font-family:var(--disp); font-size:14px; font-weight:700;">🧹 Clear or tidy the roll</h3>
          <p class="cap" style="margin:0 0 10px;">To start the list again: take everyone off, then import the class list. Children are matched by name and register number, so nobody is added twice, and each child's attendance and marks come back with them.</p>
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <button class="btn" onclick="rollRemoveAll()" ${realPupilsCache.length ? '' : 'disabled'}>Take everyone off the roll</button>
            ${u ? `<button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="rollUndo()">↶ Undo — bring back ${u.ids.length} children</button>` : ''}
            <button class="btn" onclick="rollDeleteEmpty()" style="color:var(--crit,#d03b3b);">Delete removed children with no saved data</button>
          </div>
          <p class="cap" data-roll-removed style="margin:10px 0 0;"></p>`;
        container.appendChild(card);
        fillRemoved(card.querySelector('[data-roll-removed]'));
      }
    } catch(e){ /* Admissions still works without these */ }
    return out;
  };
})();
