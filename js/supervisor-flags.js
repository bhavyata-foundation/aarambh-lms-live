/* =========================================================================
   js/supervisor-flags.js — "Raise a flag" + "Flags I've raised" on
   supervisor.html (Compliance Issues section). Saves to the real
   teacher_flags table via backend/flags/. The teacher sees each flag in
   Monthly Effective → Flags & Notifications and replies there; the
   reply shows up in the list below.

   Usage: <div id="supervisorFlagsBox"></div> + this script.
   ========================================================================= */

(function(){
  const STATE_INFO = {
    observation: { label: 'Observation', color: '#1c5cab', bg: '#e8eff7', note: 'For the record — no reply expected.' },
    concern:     { label: 'Concern', color: '#8a5c00', bg: '#fdf1d9', note: 'Teacher must reply within 7 days.' },
    escalation:  { label: 'For escalation', color: '#a12727', bg: '#fbe4e4', note: 'Teacher must reply within 3 days.' }
  };

  let teachers = [];
  let flags = [];

  function escF(str){
    const div = document.createElement('div');
    div.textContent = str === null || str === undefined ? '' : String(str);
    return div.innerHTML;
  }
  function niceDate(ymd){
    if(!ymd) return '';
    return new Date(String(ymd).slice(0, 10) + 'T00:00:00').toLocaleDateString([], {day:'numeric', month:'short', year:'numeric'});
  }
  function chip(label, color, bg){
    return `<span style="display:inline-block; font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px; color:${color}; background:${bg};">${escF(label)}</span>`;
  }

  async function loadAll(){
    const box = document.getElementById('supervisorFlagsBox');
    if(!box) return;
    box.innerHTML = '<p class="cap">Loading…</p>';
    try{
      const [tRes, fRes] = await Promise.all([
        fetch('backend/flags/get_flag_teachers.php' + window.location.search).then(r => r.json()),
        fetch('backend/flags/get_raised_flags.php' + window.location.search).then(r => r.json())
      ]);
      if(tRes.status !== 'success'){ box.innerHTML = '<p class="cap">' + escF(tRes.message || 'Could not load teachers.') + '</p>'; return; }
      if(fRes.status !== 'success'){ box.innerHTML = '<p class="cap">' + escF(fRes.message || 'Could not load flags.') + '</p>'; return; }
      teachers = tRes.teachers || [];
      flags = fRes.flags || [];
      render(box);
    } catch(err){
      box.innerHTML = '<p class="cap">Could not reach the server.</p>';
    }
  }

  function render(box){
    const today = new Date().toISOString().slice(0, 10);
    const teacherOptions = teachers.map(t =>
      `<option value="${t.teacher_user_id}|${t.class_id}">${escF(t.teacher_name)} — ${escF(t.class_name || '')}${t.school_name ? ' · ' + escF(t.school_name) : ''}</option>`
    ).join('');

    const fld = 'width:100%; padding:8px 10px; border:1px solid #d9dcd5; border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;';
    const lbl = 'display:block; font-size:10px; letter-spacing:.07em; text-transform:uppercase; color:#797d75; font-weight:800; margin-bottom:4px;';

    let html = `
      <h3 style="margin:0 0 4px;">Raise a flag</h3>
      <p class="cap" style="margin:0 0 14px;">Goes straight to the teacher's Flags &amp; Notifications. An escalation is a person's decision, never an automatic threshold (ESC-04).</p>
      ${teachers.length ? `
      <div style="display:grid; grid-template-columns:2fr 1fr; gap:12px;">
        <div><label style="${lbl}">Teacher</label><select id="flagTeacherSel" style="${fld}">${teacherOptions}</select></div>
        <div><label style="${lbl}">Kind</label>
          <select id="flagStateSel" style="${fld}">
            <option value="observation">Observation</option>
            <option value="concern">Concern</option>
            <option value="escalation">For escalation</option>
          </select></div>
        <div style="grid-column:1 / -1;"><label style="${lbl}">What was noted</label>
          <textarea id="flagTextInput" rows="2" placeholder="e.g. Daily plan not written for three days this week" style="${fld} resize:vertical;"></textarea></div>
      </div>
      <p class="cap" id="flagStateNote" style="margin:6px 0 0;">${STATE_INFO.observation.note}</p>
      <div id="flagRaiseResult" style="margin-top:8px;"></div>
      <button id="flagRaiseBtn" style="margin-top:10px; padding:9px 18px; border-radius:8px; border:none; background:#5848bd; color:#fff; font-weight:600; font-size:13px; cursor:pointer;">Raise flag</button>
      ` : '<p class="cap">No teachers are assigned to a class yet.</p>'}

      <h3 style="margin:26px 0 4px;">Flags I've raised</h3>
      <p class="cap" style="margin:0 0 12px;">Last 90 days, newest first, with the teacher's reply.</p>`;

    if(!flags.length){
      html += '<p class="cap">No flags raised in the last 90 days.</p>';
    } else {
      html += flags.map(f => {
        const s = STATE_INFO[f.state] || STATE_INFO.observation;
        const overdue = f.status === 'open' && f.due_date && String(f.due_date).slice(0, 10) < today;
        const statusChip = f.status === 'replied' ? chip('Replied', '#0a7a0a', '#e6f5e6')
          : f.state === 'observation' ? chip('No reply needed', '#4f534d', '#eceee9')
          : overdue ? chip('Overdue', '#a12727', '#fbe4e4') : chip('Awaiting reply', '#8a5c00', '#fdf1d9');
        return `<div style="border:1px solid #e5e5e2; border-radius:10px; padding:12px 14px; margin-bottom:10px; background:#fff;">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div><b>${escF(f.teacher_name)}</b> <span class="cap">${escF(f.class_name || '')}${f.school_name ? ' · ' + escF(f.school_name) : ''}</span></div>
            <div>${chip(s.label, s.color, s.bg)} ${statusChip}</div>
          </div>
          <p style="margin:8px 0 4px; font-size:13px;">${escF(f.text)}</p>
          <div class="cap">Raised ${escF(niceDate(f.date_raised))}${f.raised_by_name ? ' by ' + escF(f.raised_by_name) : ''}${f.due_date ? ' · reply due ' + escF(niceDate(f.due_date)) : ''}</div>
          ${f.status === 'replied' ? `<div style="margin-top:8px; padding:8px 10px; background:#f3f4f1; border-radius:8px; font-size:12.5px;"><b>Teacher's reply (${escF(niceDate(f.replied_at))}):</b> ${escF(f.reply_text)}</div>` : ''}
        </div>`;
      }).join('');
    }
    box.innerHTML = html;

    const stateSel = document.getElementById('flagStateSel');
    if(stateSel){
      stateSel.onchange = () => { document.getElementById('flagStateNote').textContent = STATE_INFO[stateSel.value].note; };
      document.getElementById('flagRaiseBtn').onclick = raiseFlag;
    }
  }

  async function raiseFlag(){
    const resultEl = document.getElementById('flagRaiseResult');
    const btn = document.getElementById('flagRaiseBtn');
    const [teacherId, classId] = document.getElementById('flagTeacherSel').value.split('|').map(n => parseInt(n, 10));
    const state = document.getElementById('flagStateSel').value;
    const text = document.getElementById('flagTextInput').value.trim();
    if(!text){ resultEl.innerHTML = '<p class="cap" style="color:#a12727;">Write what was noted first.</p>'; return; }
    btn.disabled = true; btn.textContent = 'Raising…';
    try{
      const res = await fetch('backend/flags/raise_flag.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ teacher_user_id: teacherId, class_id: classId, state, text })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        resultEl.innerHTML = '<p class="cap" style="color:#a12727;">' + escF(data.message || 'Could not raise the flag.') + '</p>';
        btn.disabled = false; btn.textContent = 'Raise flag';
        return;
      }
      loadAll(); // real saved row back from the server
    } catch(err){
      resultEl.innerHTML = '<p class="cap" style="color:#a12727;">Could not reach the server.</p>';
      btn.disabled = false; btn.textContent = 'Raise flag';
    }
  }

  window.loadSupervisorFlags = loadAll;
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadAll);
  else loadAll();
})();