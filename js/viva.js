// Viva: a new assessment category, built like Pre-Test and Workbook. One B / P / A per child per question (Q1–Q10),
// each question linked to its CG codes. Saved to the database, shown from the database, with a CG summary and import.
(function(){
  // The 10 Viva questions and their CG codes (from the Viva sheet of the assessment file)
  const VIVA_QUESTIONS = [
    { no: 'Q1',  text: 'Which is healthier for you: an apple or chips?', cgs: ['C-1.1'] },
    { no: 'Q2',  text: 'Show me how you use scissors safely.', cgs: ['C-1.4','C-1.6'] },
    { no: 'Q3',  text: 'Look at this fruit. What colour is it? How does it feel?', cgs: ['C-2.6'] },
    { no: 'Q4',  text: 'What shape is this? Can you count its sides?', cgs: ['C-8.8'] },
    { no: 'Q5',  text: 'Your friend is speaking. What should you do?', cgs: ['C-4.5','C-5.1'] },
    { no: 'Q6',  text: 'Sing a rhyme you know and show one action with it.', cgs: ['C-9.1','C-12.2'] },
    { no: 'Q7',  text: 'Pick up the red crayon, draw a circle, and colour it.', cgs: ['C-12.4','C-13.1'] },
    { no: 'Q8',  text: 'Which object is longer: this pencil or this crayon?', cgs: ['C-8.12'] },
    { no: 'Q9',  text: 'Look at these three pictures. Tell me what happened first, next and last.', cgs: ['C-9.6'] },
    { no: 'Q10', text: 'What sound do you hear at the beginning of “ball”?', cgs: ['C-11.2'] }
  ];
  window.VIVA_QUESTIONS = VIVA_QUESTIONS;
  const CG_NAMES = {'1':'Healthy & Safe Habits','2':'Sensorial Development','4':'Emotional Intelligence','5':'Productive Work & Service (Seva)','8':'Mathematical Understanding','9':'Oral Language','11':'Language 2 Literacy','12':'Visual & Performing Arts','13':'Learning Habits'};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const qs = () => (window.location.search || '').replace(/^\?/, '');
  const termKey = () => 'TERM_' + (typeof currentAssessTerm === 'function' ? currentAssessTerm() : 1);
  const classKey = () => (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_id) || null;
  const pupils = () => (typeof realPupilsCache !== 'undefined' && Array.isArray(realPupilsCache) ? realPupilsCache : []);
  let state = { marks: {}, loaded: false, error: '', open: false, sumOpen: true, preview: null };
  let subState = { key: '', data: null };   // submission status for the class and term
  async function load(redraw){
    const cid = classKey(); if(!cid) { state = { marks: {}, loaded: true, error: 'The class is not loaded yet.' }; return; }
    try {
      const res = await fetch('backend/assessment/viva/get_viva.php?class_id=' + encodeURIComponent(cid) + '&term=' + encodeURIComponent(termKey()) + '&' + qs(), { cache: 'no-store' });
      const d = await res.json();
      if(d.status !== 'success') throw new Error(d.message || 'Could not load.');
      state = { marks: d.marks || {}, loaded: true, error: '', open: state.open, sumOpen: state.sumOpen };
    } catch(e){ state = { marks: {}, loaded: true, error: e.message || String(e), open: state.open, sumOpen: state.sumOpen }; }
    if(redraw) redraw();
  }
  async function saveMarks(rows){
    const res = await fetch('backend/assessment/viva/save_viva.php?' + qs(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class_id: classKey(), term: termKey(), marks: rows }) });
    const d = await res.json();
    if(d.status !== 'success') throw new Error(d.message || 'Not saved.');
    return d;
  }
  async function loadSub(redraw){
    const cid = classKey(), term = termKey(); if(!cid) return;
    const key = cid + '|' + term;
    if(subState.key === key && subState.data !== null) return;
    subState = { key, data: 'loading' };
    try {
      const res = await fetch('backend/assessment/viva/get_viva_term_submission.php?class_id=' + encodeURIComponent(cid) + '&term=' + encodeURIComponent(term) + '&' + qs(), { cache: 'no-store' });
      const d = await res.json();
      subState = { key, data: d.status === 'success' && d.submitted ? d : { submitted: false } };
    } catch(e){ subState = { key, data: { submitted: false, error: e.message || String(e) } }; }
    if(redraw) redraw();
  }
  async function postSub(url){
    const res = await fetch(url + '?' + qs(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class_id: classKey(), term: termKey() }) });
    const d = await res.json();
    if(d.status !== 'success') throw new Error(d.message || 'Not saved.');
    subState = { key: '', data: null };
    redrawViva();
  }
  window.submitVivaTerm = async function(){ try { await postSub('backend/assessment/viva/submit_viva_term.php'); } catch(e){ alert(e.message || e); } };
  window.undoVivaTerm = async function(){ try { await postSub('backend/assessment/viva/unsubmit_viva_term.php'); } catch(e){ alert(e.message || e); } };
  // the Submit section, below the grading table (same wording as the Pre-Test submit section)
  function submitCard(){
    const card = document.createElement('div'); card.className = 'card'; card.setAttribute('data-viva', ''); card.style.cssText = 'padding:16px 18px; margin-top:14px;';
    const term = termKey().replace('TERM_', 'Term ');
    const d = subState.data;
    if(d === null || d === 'loading'){ card.innerHTML = '<p class="cap" style="margin:0;">Checking submission status…</p>'; loadSub(redrawViva); }
    else if(d.submitted){
      const when = d.submitted_at ? new Date(String(d.submitted_at).replace(' ', 'T')).toLocaleDateString([], {day:'numeric', month:'short', year:'numeric'}) : '';
      card.innerHTML = `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div><b style="color:var(--success);">✓ Viva ${esc(term)} submitted</b><p class="cap" style="margin:4px 0 0;">${d.submitted_by_name ? esc(d.submitted_by_name) + ' · ' : ''}${esc(when)}</p></div>
        <button style="padding:7px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12.5px; cursor:pointer;" onclick="undoVivaTerm()">Undo submission</button></div>`;
    } else {
      card.innerHTML = `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div><b>Not yet submitted</b><p class="cap" style="margin:4px 0 0;">Covers the whole Viva for ${esc(term)} — submit once all the children's marks are ready.</p></div>
        <button class="btn-primary" style="width:auto; padding:9px 18px;" onclick="submitVivaTerm()">Submit marks for ${esc(term)}</button></div>`;
    }
    return card;
  }
  function render(container){
    const kids = pupils();
    const term = termKey().replace('TERM_', 'Term ');
    // same card, header and table components as the Pre-Test and Workbook screens
    const card = document.createElement('div'); card.className = 'card'; card.setAttribute('data-viva', '');
    card.innerHTML = `<div class="hd"><div><h3>Viva · ${esc(term)}</h3><p class="cap">Ten questions. Mark each child B, P or A. Each question counts toward its CG codes.</p></div></div>`;
    // the shared "Import a file or photo" panel (same five buttons as the other categories)
    // status tiles, as on the other categories
    const total = kids.length * VIVA_QUESTIONS.length;
    let marked = 0, prof = 0, valued = 0;
    kids.forEach(p => { const m = state.marks[String(p.id)] || {}; VIVA_QUESTIONS.forEach(q => { const v = m[q.no]; if(v){ marked++; valued++; if(v==='P' || v==='A') prof++; } }); });
    const pct = total ? Math.round(100 * marked / total) : 0;
    const srPct = valued ? Math.round(100 * prof / valued) : 0;
    const noMarks = kids.filter(p => !Object.keys(state.marks[String(p.id)] || {}).length).length;
    const tiles = [
      ['SCOPE', VIVA_QUESTIONS.length, 'questions', 'Viva · ' + term],
      ['COMPLETED', pct, '% of child × question marked', marked ? 'Saved' : 'No marks yet'],
      ['AT PROFICIENT OR ABOVE', srPct, '% P or A', valued ? '' : 'No marks yet'],
      ['NO MARKS YET', noMarks, 'of ' + kids.length + ' children', noMarks ? 'Needs follow-up' : 'All marked']
    ];
    // status tiles: the shared tile style used across the portal (mdTile); a plain fallback if it isn't loaded
    const row = document.createElement('div');
    row.setAttribute('data-viva', ''); row.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; margin-bottom:14px;';
    const tileDefs = [
      ['Scope', VIVA_QUESTIONS.length, 'questions', 'Viva · ' + term],
      ['Recording complete', pct, '% of child × question cells · active children', marked ? 'On track' : 'No marks yet'],
      ['At proficient or above', srPct, '% SRI', valued ? 'On track' : 'No marks yet'],
      ['Children with no marks', noMarks, 'of ' + kids.length + ' active', noMarks ? 'Needs follow-up' : 'All assessed']
    ];
    tileDefs.forEach(t => {
      if(typeof window.mdTile === 'function'){ row.appendChild(window.mdTile(t[0], t[1], t[2], t[3])); }
      else { const el = document.createElement('div'); el.className = 'card'; el.style.cssText = 'padding:16px 18px;'; el.innerHTML = `<div style="font-size:11px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:#5b6b62;">${esc(t[0])}</div><div style="font-size:30px; font-weight:800; margin-top:6px; line-height:1.1;">${esc(t[1])} <span style="font-size:13px; font-weight:600; color:#3c4a43;">${esc(t[2])}</span></div><div style="font-size:12.5px; color:#5b6b62; margin-top:6px;">${esc(t[3])}</div>`; row.appendChild(el); }
    });
    container.appendChild(row);
    const prev = renderImportPreview(); if(prev) container.appendChild(prev);
    // a 'Hide grading table' button in the header; the table is drawn only when it is open
    const hideBtn = document.createElement('button'); hideBtn.className = 'btn-primary'; hideBtn.textContent = 'Hide grading table';
    hideBtn.onclick = () => window.vivaHideGrid();
    card.querySelector('.hd').appendChild(hideBtn);
    if(state.error){ card.insertAdjacentHTML('beforeend', `<p class="cap" style="color:var(--danger, #c8433f);">${esc(state.error)}</p>`); }
    else if(!kids.length){ card.insertAdjacentHTML('beforeend', '<p class="cap">No children in this class yet.</p>'); }
    else {
      const ths = VIVA_QUESTIONS.map(q => `<th title="${esc(q.text)}">${esc(q.no)}<div class="cap" style="margin:2px 0 0;">${esc(q.cgs.join(', '))}</div></th>`).join('');
      const rows = kids.map(p => {
        const m = state.marks[String(p.id)] || {};
        const tds = VIVA_QUESTIONS.map(q => {
          const v = m[q.no] || '';
          return `<td><select data-viva-pupil="${p.id}" data-viva-q="${q.no}" onchange="vivaSaveCell(this)">
            <option value="">—</option><option value="B"${v==='B'?' selected':''}>B</option><option value="P"${v==='P'?' selected':''}>P</option><option value="A"${v==='A'?' selected':''}>A</option></select></td>`;
        }).join('');
        return `<tr><td style="position:sticky; left:0; background:#fff; z-index:1;"><b>${esc(p.name)}</b></td>${tds}</tr>`;
      }).join('');
      card.insertAdjacentHTML('beforeend', `<div class="report-table-wrap" data-viva-scroll style="overflow-x:auto;"><table class="report-table" style="min-width:1100px;"><thead><tr><th style="position:sticky; left:0; background:#F4F8F6; z-index:1;">Child</th>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`);
    }
    // Same sections, in the same order, as the other tabs: CG summary, Attendance only, then the grading table (when open)
    container.appendChild(cgCard());
    if(typeof window.attendanceOnlyCardInto === 'function') window.attendanceOnlyCardInto(container);
    if(state.open) container.appendChild(card);
    container.querySelectorAll('[data-viva-scroll]').forEach(el => { el.scrollLeft = 0; });
    container.appendChild(submitCard());
    container.appendChild(downloadCard());
  }
  // CG summary card: the same look as the Workbook tab. Shows the table only when asked.
  // one row per curricular goal (CG-1, CG-2 …): each child's mark counts once for each CG its question is linked to
  function cgGroups(){
    const src = state.preview ? Object.fromEntries((state.preview.rows || []).filter(r => r.pid).map(r => [String(r.pid), r.marks])) : (state.marks || {});
    const g = {};
    VIVA_QUESTIONS.forEach(q => { const ns = [...new Set(q.cgs.map(c => c.replace('C-','').split('.')[0]))]; ns.forEach(n => { (g[n] = g[n] || { n, qs: new Set(), b: 0, p: 0, a: 0 }).qs.add(q.no); }); });
    Object.values(src).forEach(qm => {
      VIVA_QUESTIONS.forEach(q => {
        const v = qm[q.no]; if(!v) return;
        [...new Set(q.cgs.map(c => c.replace('C-','').split('.')[0]))].forEach(n => { const x = g[n]; if(!x) return; if(v === 'B') x.b++; else if(v === 'P') x.p++; else if(v === 'A') x.a++; });
      });
    });
    return Object.values(g).sort((x, y) => Number(x.n) - Number(y.n)).map(x => ({ n: x.n, qs: [...x.qs], b: x.b, p: x.p, a: x.a }));
  }
  // CG summary card: the Classroom Observation summary's layout and styling
  function cgCard(){
    const groups = cgGroups();
    const covered = groups.filter(g => g.b + g.p + g.a > 0).length;
    const term = termKey().replace('TERM_', 'Term ');
    const c = document.createElement('div'); c.className = 'card'; c.setAttribute('data-viva', '');
    c.style.cssText = 'padding:18px 20px; margin-top:14px;';
    const ring = (letter, col) => `<span style="display:inline-flex; align-items:center; justify-content:center; width:17px; height:17px; border-radius:50%; border:1.5px solid ${col}; color:${col}; font-size:10px; font-weight:800;">${letter}</span>`;
    const lvl = (b, p, a) => {
      const t = b + p + a; if(!t) return '';
      const avg = (b * 1 + p * 2 + a * 3) / t;
      const [name, col, mark] = avg < 1.67 ? ['Beginning', '#E08A00', 'B'] : avg < 2.33 ? ['Proficient', '#B7791F', 'P'] : ['Advanced', '#1E7B4F', 'A'];
      return `<span style="display:inline-flex; align-items:center; gap:6px; font-weight:700; font-size:13.5px;">${ring(mark, col)}${name}</span>`;
    };
    const mix = (b, p, a) => {
      const t = b + p + a; if(!t) return '';
      const w = v => (100 * v / t).toFixed(1) + '%';
      return `<div style="display:flex; height:7px; width:140px; border-radius:4px; overflow:hidden;"><div style="width:${w(b)}; background:#E05555;"></div><div style="width:${w(p)}; background:#F2B632;"></div><div style="width:${w(a)}; background:#2E9E5B;"></div></div>`;
    };
    const fromOf = n => {
      const pairs = []; VIVA_QUESTIONS.forEach(q => q.cgs.forEach(x => { if(x.replace('C-','').split('.')[0] === n && !pairs.some(p => p[0] === x)) pairs.push([x, q.no]); }));
      return pairs.map(([code, qno]) => `<span data-viva-tip style="position:relative; border-bottom:1px dotted #5b6b62; cursor:default;">${esc(code)}<span class="vtip" style="display:none; position:absolute; bottom:135%; right:0; background:#1f2a24; color:#fff; padding:6px 10px; border-radius:6px; font-size:12px; white-space:nowrap; z-index:20; pointer-events:none;">Viva · ${esc(qno)} · ${esc(code)}</span></span>`).join(', ');
    };
    const num = (v, col, bg) => `<td style="padding:8px 10px; text-align:center; background:${bg};"><span style="color:${col}; font-weight:700;">${v}</span></td>`;
    const rows = groups.map(g => `<tr style="border-top:1px solid #E5EEE9;">
        <td style="padding:8px 10px; background:#F0FAF5;"><div style="font-weight:800;">CG-${esc(g.n)}</div><div style="font-weight:700;">${esc(CG_NAMES[g.n] || '')}</div></td>
        <td style="padding:8px 10px; text-align:right;"><span style="font-size:12.5px; color:#3c4a43;">${fromOf(g.n)}</span></td>
        ${num(g.b, '#B42318', '#FDE7E7')}${num(g.p, '#9A6A00', '#FFF6D5')}${num(g.a, '#1E7B4F', '#E3F5EA')}
        <td style="padding:8px 10px; text-align:center; font-weight:800;">${g.b + g.p + g.a}</td>
        <td style="padding:8px 10px;">${mix(g.b, g.p, g.a)}</td>
        <td style="padding:8px 10px;">${lvl(g.b, g.p, g.a)}</td></tr>`).join('');
    const tb = groups.reduce((x, g) => ({ b: x.b + g.b, p: x.p + g.p, a: x.a + g.a }), { b: 0, p: 0, a: 0 });
    const allRow = groups.length ? `<tr style="border-top:1px solid #CFE6DA;">
        <td style="padding:8px 10px; font-weight:800;">All CGs</td><td></td>
        ${num(tb.b, '#B42318', '#FDE7E7')}${num(tb.p, '#9A6A00', '#FFF6D5')}${num(tb.a, '#1E7B4F', '#E3F5EA')}
        <td style="padding:8px 10px; text-align:center; font-weight:800;">${tb.b + tb.p + tb.a}</td>
        <td style="padding:8px 10px;">${mix(tb.b, tb.p, tb.a)}</td>
        <td style="padding:8px 10px;">${lvl(tb.b, tb.p, tb.a)}</td></tr>` : '';
    const hd = 'padding:8px 10px; font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#5b6b62; background:#F4F8F6;';
    const head = `<tr>
        <th style="${hd} text-align:left;">Code</th><th style="${hd} text-align:right;">From</th>
        <th style="${hd} text-align:center;">${ring('B', '#E05555')}</th><th style="${hd} text-align:center;">${ring('P', '#F2B632')}</th><th style="${hd} text-align:center;">${ring('A', '#2E9E5B')}</th>
        <th style="${hd} text-align:center;">Total</th><th style="${hd} text-align:left;">Mix</th><th style="${hd} text-align:left;">Class level</th></tr>`;
    const table = groups.length ? `<div style="overflow:visible; margin-top:16px; border:1px solid #DDE8E2; border-radius:10px;"><table style="width:100%; border-collapse:collapse; font-size:13.5px;"><thead>${head}</thead><tbody>${rows}${allRow}</tbody></table></div>` : '<p style="margin-top:14px; color:#5b6b62;">Nothing to show yet.</p>';
    // the same card as the other assessment summaries: CG SUMMARY label, count, CG chips, and Show the table
    const level = (b, p, a) => { const tot = b + p + a; if (!tot) return ''; const sc = (p + 2 * a) / tot; return sc < 0.67 ? 'B' : (sc < 1.34 ? 'P' : 'A'); };
    const chips = groups.map(g => {
      const L = level(g.b, g.p, g.a);
      const cgN = g.cg || g.n; const nq = g.qs ? (g.qs.size != null ? g.qs.size : g.qs.length) : 0;
      return `<span style="padding:6px 12px; border-radius:999px; font-size:12.5px; font-weight:700; border:1px solid #E6D08A; background:#FFF6D5; color:#6B4E00; white-space:nowrap;">CG-${cgN} &nbsp;${L} · ${nq} comp.</span>`;
    }).join('');
    c.innerHTML = `<style>[data-viva-tip]:hover .vtip{display:block !important;}</style>
      <div style="background:#F0F8F4; border:1px solid #9FD3BB; border-radius:14px; padding:18px 20px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap;">
          <div style="min-width:240px;">
            <div style="font-size:12px; font-weight:800; letter-spacing:.08em; color:#17765B;">CG SUMMARY</div>
            <div style="font-size:13px; color:#3a4a42; margin-top:4px;">Viva · ${esc(term)}</div>
            <div style="display:flex; align-items:baseline; gap:8px; margin-top:8px;">
              <span style="font-size:44px; font-weight:800; line-height:1; color:#1D2B22;">${groups.length}</span>
              <span style="font-size:16px; font-weight:700;">CGs covered</span>
            </div>
            <div style="font-size:13px; color:#3a4a42; margin-top:6px;">from ${VIVA_QUESTIONS.length} questions · ${covered} with marks</div>
            <div style="display:flex; align-items:center; gap:12px; margin-top:10px; flex-wrap:wrap;"><span style="padding:6px 12px; border-radius:999px; background:#FFF6D5; border:1px solid #E6D08A; font-size:13px; font-weight:700; color:#6B4E00;">Class level: ${lvl(tb.b, tb.p, tb.a)}</span>${mix(tb.b, tb.p, tb.a)}</div>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:8px; flex:1; min-width:260px; justify-content:center; align-items:center;">${chips || '<span style="font-size:14px; color:#6b7770;">Nothing to show yet.</span>'}</div>
          <button onclick="vivaToggleSummary()" style="height:44px; padding:0 18px; border-radius:10px; border:none; background:#0E6B4E; color:#fff; font:inherit; font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap;">${state.sumOpen ? '▾ Hide' : 'Show the table ▸'}</button>
        </div>
        ${state.sumOpen ? `<div style="margin-top:16px;">${table}</div>` : ''}
      </div>`;
    return c;
  }
  // for the Assessment records screen: the same CG card, with the saved marks loaded for the term
  window.vivaCgCardInto = function(el){
    const draw = () => { el.querySelectorAll('[data-viva]').forEach(x => x.remove()); el.appendChild(cgCard()); };
    if(!state.loaded || state.term !== termKey()){ state = Object.assign({ marks: {}, loaded: false, error: '', term: termKey() }, { open: state.open, sumOpen: state.sumOpen, preview: state.preview }); load(draw); }
    draw();
  };
  window.vivaToggleSummary = function(){ state.sumOpen = !state.sumOpen; redrawViva(); };
  function cgSummary(){
    const by = {};
    VIVA_QUESTIONS.forEach(q => q.cgs.forEach(cg => { (by[cg] = by[cg] || { cg, qs: [], b: 0, p: 0, a: 0 }).qs.push(q.no); }));
    // while a preview is open, the summary counts the preview's marks; otherwise the saved marks
    const src = state.preview ? Object.fromEntries((state.preview.rows || []).filter(r => r.pid).map(r => [String(r.pid), r.marks])) : state.marks;
    Object.values(src).forEach(qm => {
      VIVA_QUESTIONS.forEach(q => { const v = qm[q.no]; if(!v) return; q.cgs.forEach(cg => { const r = by[cg]; if(r){ if(v==='B') r.b++; else if(v==='P') r.p++; else if(v==='A') r.a++; } }); });
    });
    return Object.values(by).sort((x,y) => x.cg.localeCompare(y.cg, undefined, {numeric:true}));
  }
    window.renderVivaSection = function(container){
    if(!container) return;
    container.setAttribute('data-viva-host', '');
    const redraw = () => { container.querySelectorAll('[data-viva]').forEach(el => el.remove()); render(container); };
    if(!state.loaded || state.term !== termKey()){
      // keep what the teacher chose (summary open, grading table open, the open preview) across the reload
      const keep = { open: state.open, sumOpen: state.sumOpen, preview: state.preview };
      state = Object.assign({ marks: {}, loaded: false, error: '', term: termKey() }, keep);
      load(redraw);
    }
    render(container);
  };
  window.vivaSaveCell = async function(sel){
    const pid = sel.getAttribute('data-viva-pupil'), q = sel.getAttribute('data-viva-q'), v = sel.value;
    try {
      await saveMarks([{ pupil_id: Number(pid), question_no: q, level_mark: v }]);
      state.marks[pid] = state.marks[pid] || {}; if(v) state.marks[pid][q] = v; else delete state.marks[pid][q];
      document.querySelectorAll('[data-viva]').forEach(el => el.remove()); const host = document.querySelector('[data-viva-host]') || document.getElementById('monthlyassessment-body'); if(host) render(host);
    } catch(e){ alert(e.message || e); }
  };
  window.vivaImportFile = function(file){
    if(!file){ alert('No file was chosen.'); return; }
    if(typeof XLSX === 'undefined'){ alert('The spreadsheet reader has not loaded. Reload the page (Ctrl + Shift + R) and try again.'); return; }
    const reader = new FileReader();
    reader.onerror = () => alert('The file could not be read. Check that it is an Excel (.xlsx) file.');
    reader.onload = function(ev){
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
        const p = buildImportPreview(rows, file.name);
        p.rows = computeImportRows(p);
        state.preview = p;
        redrawViva();
      } catch(e){ alert(e.message || String(e)); }
    };
    reader.readAsArrayBuffer(file);
  };

  function redrawViva(){ document.querySelectorAll('[data-viva]').forEach(el => el.remove()); const host = document.querySelector('[data-viva-host]') || document.getElementById('monthlyassessment-body'); if(host) render(host); }
  // ---- Download (same section as Fine & Gross Motor): the full Viva report as a PDF, from the saved marks ----
  window.vivaDownloadReport = function(){
    const JS = (window.jspdf && window.jspdf.jsPDF) || (typeof jsPDF !== 'undefined' ? jsPDF : null);
    if(!JS){ alert('PDF support did not load. Reload the page and try again.'); return; }
    const doc = new JS({ orientation: 'landscape' });
    const term = termKey().replace('TERM_', 'Term ');
    doc.setFontSize(14); doc.text('Viva · ' + term, 14, 16);
    doc.setFontSize(9); doc.text('Marks as saved (B / P / A). Each question counts toward its CG codes.', 14, 22);
    const head = [['Child'].concat(VIVA_QUESTIONS.map(q => q.no + ' (' + q.cgs.join(', ') + ')'))];
    const body = pupils().map(p => { const m = state.marks[String(p.id)] || {}; return [p.name].concat(VIVA_QUESTIONS.map(q => m[q.no] || '')); });
    doc.autoTable({ head, body, startY: 27, styles: { fontSize: 8 }, headStyles: { fillColor: [30, 143, 94] } });
    const y = doc.lastAutoTable.finalY + 10;
    const sum = cgSummary();
    doc.autoTable({
      head: [['CG', 'Questions', 'B', 'P', 'A', 'Total']],
      body: sum.map(r => ['CG-' + r.cg.replace('C-', '').split('.')[0], r.qs.join(', '), r.b, r.p, r.a, r.b + r.p + r.a]),
      startY: y, styles: { fontSize: 9 }, headStyles: { fillColor: [30, 143, 94] }
    });
    doc.save('Viva_' + termKey() + '.pdf');
  };
  function downloadCard(){
    const card = document.createElement('div'); card.className = 'card'; card.setAttribute('data-viva', ''); card.style.cssText = 'padding:16px 18px; margin-top:14px;';
    card.innerHTML = `<b>Download</b><p class="cap" style="margin:4px 0 12px;">The full report for this assessment, as saved.</p>
      <button class="btn-primary" style="width:auto; padding:9px 18px;" onclick="vivaDownloadReport()">⬇ Viva report (PDF)</button>`;
    return card;
  }
  // ---- Import preview (like Workbook / Classroom Observation): see every row and column, change a column's type, edit any mark ----
  function buildImportPreview(rows, fileName){
    const h = rows.findIndex(r => r.some(c => /^\s*Q1\b/i.test(String(c)) || /roll|name/i.test(String(c))));
    if(h < 0) throw new Error('This file has no Roll No, Name or Q1 columns. Use the Viva template (Download sheet).');
    const hdr = rows[h].map(c => String(c).trim());
    const cols = hdr.map((text, col) => {
      let map = 'ignore';
      const m = /^Q(\d{1,2})\b/i.exec(text);
      if(m && VIVA_QUESTIONS.some(q => q.no === 'Q' + Number(m[1]))) map = 'Q' + Number(m[1]);
      else if(/roll|reg/i.test(text)) map = 'roll';
      else if(/name/i.test(text)) map = 'name';
      return { col, label: text || ('Column ' + (col + 1)), map };
    });
    const data = rows.slice(h + 1).filter(r => r.some(c => String(c).trim() !== ''));
    return { fileName, cols, data, rows: [] };
  }
  function pupilNameById(pid){ const p = pupils().find(x => x.id === pid); return p ? p.name : ''; }
  function computeImportRows(p){
    const byRoll = {}, byName = {};
    pupils().forEach(pu => {
      [pu.register_no, pu.roll_no, pu.roll, pu.id].forEach(v => { if(v != null && v !== '') byRoll[String(v).replace(/\.0$/, '').trim()] = pu.id; });
      if(pu.name) byName[String(pu.name).trim().toLowerCase()] = pu.id;
    });
    const colOf = key => (p.cols.find(c => c.map === key) || {}).col;
    const rollC = colOf('roll'), nameC = colOf('name');
    return p.data.map(r => {
      const roll = rollC == null ? '' : String(r[rollC] || '').replace(/\.0$/, '').trim();
      const name = nameC == null ? '' : String(r[nameC] || '').trim();
      const pid = (roll && byRoll[roll]) || (name && byName[name.toLowerCase()]) || null;
      const marks = {};
      VIVA_QUESTIONS.forEach(q => {
        const c = colOf(q.no);
        const v = c == null ? '' : String(r[c] || '').trim().toUpperCase();
        marks[q.no] = (v === 'B' || v === 'P' || v === 'A') ? v : '';
      });
      return { roll, name, pid, marks };
    });
  }
  function countImportMarks(p){
    return (p.rows || []).reduce((n, r) => n + (r.pid ? VIVA_QUESTIONS.reduce((k, q) => k + (r.marks[q.no] ? 1 : 0), 0) : 0), 0);
  }
  function renderImportPreview(){
    const p = state.preview; if(!p) return null;
    const card = document.createElement('div'); card.className = 'card'; card.setAttribute('data-viva', ''); card.setAttribute('data-viva-preview', '');
    card.style.cssText = 'margin-bottom:14px;';
    const roles = ['ignore', 'roll', 'name'].concat(VIVA_QUESTIONS.map(q => q.no));
    const labelOf = k => k === 'ignore' ? 'Ignore this column' : k === 'roll' ? 'Roll No' : k === 'name' ? 'Student Name' : k;
    const maps = p.cols.map(c => `<div style="display:flex; gap:8px; align-items:center; font-size:13px;"><span style="min-width:170px;">${esc(c.label)}</span><select onchange="vivaSetColumn(${c.col}, this.value)">${roles.map(r => `<option value="${r}"${r === c.map ? ' selected' : ''}>${esc(labelOf(r))}</option>`).join('')}</select></div>`).join('');
    const matched = p.rows.filter(r => r.pid).length;
    const total = countImportMarks(p);
    const body = p.rows.map((r, i) => `<tr><td>${r.pid ? '<b>' + esc(pupilNameById(r.pid)) + '</b>' : '<span style="color:#b42318;">not matched: ' + esc(r.name || r.roll) + '</span>'}</td><td>${esc(r.roll)}</td>${VIVA_QUESTIONS.map(q => `<td><select onchange="vivaEditMark(${i}, '${q.no}', this.value)"${r.pid ? '' : ' disabled'}><option value="">—</option>${['B', 'P', 'A'].map(v => `<option value="${v}"${r.marks[q.no] === v ? ' selected' : ''}>${v}</option>`).join('')}</select></td>`).join('')}</tr>`).join('');
    card.innerHTML = `<div class="hd"><div><h3>Preview — ${esc(p.fileName)}</h3><p class="cap">${p.rows.length} row(s) read · ${matched} matched to this class · ${total} mark(s) ready. Check the column types and each mark, then confirm.</p></div></div>
      <div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="min-width:1100px;"><thead><tr><th>Child</th><th>Roll</th>${VIVA_QUESTIONS.map(q => `<th>${esc(q.no)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>
      <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:12px;">
        <button onclick="vivaCancelPreview()" style="padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer;">Cancel</button>
        <button class="btn-primary" style="width:auto;" onclick="vivaConfirmPreview()"${total ? '' : ' disabled'}>Confirm — save ${total} mark(s)</button></div>`;
    return card;
  }
  window.vivaSetColumn = function(col, map){
    const p = state.preview; if(!p) return;
    const c = p.cols.find(x => x.col === col); if(c) c.map = map;
    p.rows = computeImportRows(p); redrawViva();
  };
  window.vivaEditMark = function(i, q, v){
    const p = state.preview; if(!p || !p.rows[i]) return;
    p.rows[i].marks[q] = v; redrawViva();
  };
  window.vivaCancelPreview = function(){ state.preview = null; redrawViva(); };
  window.vivaConfirmPreview = async function(){
    const p = state.preview; if(!p) return;
    const marks = [];
    p.rows.forEach(r => { if(!r.pid) return; VIVA_QUESTIONS.forEach(q => { const v = r.marks[q.no]; if(v === 'B' || v === 'P' || v === 'A') marks.push({ pupil_id: r.pid, question_no: q.no, level_mark: v }); }); });
    if(!marks.length){ alert('There are no marks to save. Check the column types and the marks in the preview.'); return; }
    try {
      const d = await saveMarks(marks);
      alert('Saved ' + d.saved + ' Viva mark(s).');
      state.preview = null;
      await load(null);
      redrawViva();
    } catch(e){ alert(e.message || String(e)); }
  };
  window.vivaFocusGrid = function(){
    state.open = true; redrawViva();
    const g = document.querySelector('[data-viva] select'); if(g){ g.scrollIntoView({behavior:'smooth', block:'center'}); g.focus(); }
  };
  window.vivaHideGrid = function(){ state.open = false; redrawViva(); };
  window.vivaDownloadTemplate = function(){
    if(typeof XLSX === 'undefined'){ alert('.xlsx support did not load (no internet reached the CDN) — try again once you are online.'); return; }
    const kids = pupils();
    const heads = ['Roll No','Student Name'].concat(VIVA_QUESTIONS.map(q => q.no + ' · ' + q.cgs.join(', ')));
    const rows = [heads].concat(kids.map(p => [p.register_no || p.id, p.name].concat(VIVA_QUESTIONS.map(() => ''))));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Viva');
    XLSX.writeFile(wb, 'Viva_template_' + termKey() + '.xlsx');
  };
  // "Choose the file" on the Viva tab: open the file picker directly (capture phase, so it runs before the shared panel's handler)
  document.addEventListener('click', function(e){
    const b = e.target && e.target.closest ? e.target.closest('button') : null;
    if(!b || !/Choose the file/i.test(b.textContent || '')) return;
    let onViva = false;
    try { onViva = (typeof assessmentEntryType !== 'undefined' && assessmentEntryType === 'viva'); } catch(_){}
    if(!onViva) return;
    e.preventDefault(); e.stopImmediatePropagation();
    console.log('[viva] Choose the file clicked: opening the picker');
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls,.csv';
    input.onchange = () => { if(input.files && input.files[0]) window.vivaImportFile(input.files[0]); };
    input.click();
  }, true);
})();
