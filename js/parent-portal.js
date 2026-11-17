// Parent portal: real child data + parent<->teacher messages.
// Loaded AFTER parent.js. Fills #parent-mychild-body and the page heading.
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const body = () => document.getElementById('parent-mychild-body');
  let children = [], current = null;

  async function api(url, opts){
    const res = await fetch(url + (opts ? '' : ''), opts);
    const data = await res.json().catch(() => ({}));
    if(!res.ok || data.status !== 'success') throw new Error(data.message || 'Something went wrong.');
    return data;
  }

  function fmtDay(d){ const dt = new Date(d + 'T00:00:00'); return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  function fmtTime(t){ const dt = new Date(String(t).replace(' ', 'T')); return isNaN(dt) ? '' : dt.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }

  function renderChild(){
    const c = children.find(x => String(x.id) === String(current));
    const a = c.attendance;
    document.querySelector('.dash h1').textContent = c.name + ' — ' + c.class_name;
    const sub = document.getElementById('parent-subheading');
    if(sub) sub.textContent = c.school_name + ' · Parent view';

    const todayHtml = a.today === 'present' ? '<span style="color:var(--success);">Present</span>'
      : a.today === 'absent' ? '<span style="color:var(--crit,#d03b3b);">Absent</span>'
      : '<span style="color:var(--text-muted);">Not marked yet</span>';
    const strip = a.recent.length
      ? a.recent.map(r => `<span title="${esc(fmtDay(r.date))}: ${esc(r.status)}" style="display:inline-block; width:22px; height:22px; border-radius:5px; margin:2px; background:${r.status === 'present' ? 'var(--success,#2e9e5b)' : 'var(--crit,#d03b3b)'};"></span>`).join('')
      : '<span class="cap">No attendance marked in the last two weeks.</span>';

    const picker = children.length > 1
      ? `<label style="font-size:13px;">Child: <select id="ppChildSel">${children.map(x => `<option value="${x.id}" ${String(x.id) === String(current) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>` : '';

    body().innerHTML = `
      ${picker}
      <div class="stat-grid">
        <div class="stat-card"><p class="label">Attendance this month</p><p class="value">${a.month_percent == null ? '—' : a.month_percent + '%'}</p></div>
        <div class="stat-card"><p class="label">Today</p><p class="value">${todayHtml}</p></div>
        <div class="stat-card"><p class="label">Days present</p><p class="value">${a.month_present}</p></div>
        <div class="stat-card"><p class="label">Days absent</p><p class="value">${a.month_absent}</p></div>
      </div>
      <h3 class="report-h3">Last 14 days</h3>
      <div class="card" style="padding:12px;">${strip}<p class="cap" style="margin:8px 0 0;">Green = present, red = absent. Days with no colour were not marked (holiday or weekend).</p></div>
      <h3 class="report-h3">Message the teacher</h3>
      <div class="card" style="padding:12px;">
        <div id="ppThread" style="max-height:320px; overflow:auto; margin-bottom:10px;"></div>
        <div style="display:flex; gap:8px;">
          <input type="text" id="ppMsg" maxlength="1000" placeholder="Write a message…" style="flex:1;" />
          <button class="btn-primary" id="ppSend" style="width:auto; padding:8px 16px;">Send</button>
        </div>
        <div id="ppErr" class="login-error hidden" style="margin-top:8px;"></div>
      </div>`;

    const sel = document.getElementById('ppChildSel');
    if(sel) sel.onchange = () => { current = sel.value; renderChild(); };
    document.getElementById('ppSend').onclick = send;
    document.getElementById('ppMsg').onkeydown = e => { if(e.key === 'Enter') send(); };
    loadThread();
  }

  async function loadThread(){
    const box = document.getElementById('ppThread'); if(!box) return;
    try{
      const d = await api('backend/parent/messages.php?pupil_id=' + encodeURIComponent(current));
      box.innerHTML = d.messages.length ? d.messages.map(m => {
        const mine = m.sender_role === 'parent';
        return `<div style="display:flex; justify-content:${mine ? 'flex-end' : 'flex-start'}; margin:6px 0;">
          <div style="max-width:78%; padding:8px 12px; border-radius:12px; background:${mine ? 'var(--accent-soft,#e3f1e8)' : 'var(--surface-2,#f1f1f1)'};">
            <div style="font-size:11px; color:var(--text-muted);">${mine ? 'You' : esc(m.sender_name || 'Teacher')} · ${esc(fmtTime(m.created_at))}</div>
            <div style="white-space:pre-wrap;">${esc(m.body)}</div></div></div>`;
      }).join('') : '<p class="cap">No messages yet. Say hello to the teacher.</p>';
      box.scrollTop = box.scrollHeight;
    } catch(e){ box.innerHTML = `<p class="cap">${esc(e.message)}</p>`; }
  }

  async function send(){
    const inp = document.getElementById('ppMsg'), err = document.getElementById('ppErr'), btn = document.getElementById('ppSend');
    const text = inp.value.trim(); if(!text) return;
    err.classList.add('hidden'); btn.disabled = true;
    try{
      await api('backend/parent/messages.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ pupil_id: Number(current), body: text }) });
      inp.value = ''; await loadThread();
    } catch(e){ err.textContent = e.message; err.classList.remove('hidden'); }
    btn.disabled = false;
  }

  async function init(){
    if(!body()) return;
    body().innerHTML = '<p class="cap">Loading…</p>';
    try{
      const d = await api('backend/parent/get_my_children.php');
      children = d.children;
      if(!children.length){
        document.querySelector('.dash h1').textContent = 'Welcome';
        body().innerHTML = '<div class="card" style="padding:16px;">No child is linked to your account yet. Please ask your school admin to link your child.</div>';
        return;
      }
      current = children[0].id; renderChild();
    } catch(e){ body().innerHTML = `<div class="au-error">${esc(e.message)}</div>`; }
  }
  document.addEventListener('DOMContentLoaded', init);
})();