// Admission and assessment map: each child's admission date against the marks saved for each month.
// Read-only. Shown on the Assessment Dashboard.
(function(){
  const YEAR = 2026;
  const MONTHS = ['June','July','August','September','October'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const monthRange = name => { const i = MONTHS.indexOf(name); const m = 5 + i; return { start: new Date(YEAR, m, 1), end: new Date(YEAR, m + 1, 0) }; };
  const parseDate = s => { if(!s) return null; const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
  const fmt = d => d ? d.toLocaleDateString([], {day:'numeric', month:'short', year:'numeric'}) : '';
  const qs = () => (window.location.search || '').replace(/^\?/, '');
  function cellFor(child, name){
    const adm = parseDate(child.admitted_date);
    const r = monthRange(name);
    if(!adm) return { state: 'nodate', text: 'no date' };
    if(adm > r.end) return { state: 'before', text: 'not yet joined' };
    const c = child.cells[name] || { workbook: 0, observation: 0 };
    const total = (c.workbook || 0) + (c.observation || 0);
    const joinedHere = adm >= r.start && adm <= r.end;
    const base = total > 0 ? { state: 'marked', text: 'W ' + c.workbook + ' · O ' + c.observation } : { state: 'pending', text: 'pending' };
    if(joinedHere) base.joined = true;
    return base;
  }
  const STYLE = {
    marked: 'background:#E1F5EE; color:#0F6E56; border:1px solid #9FE1CB;',
    pending: 'background:#FAEEDA; color:#854F0B; border:1px solid #FAC775;',
    before: 'background:#F1EFE8; color:#888780; border:1px solid #D3D1C7;',
    nodate: 'background:#fff; color:#888780; border:1px dashed #B4B2A9;'
  };
  function table(data){
    const head = `<tr>
      <th style="position:sticky; left:0; background:#F4F8F6; text-align:left; padding:8px 10px; min-width:170px;">Child</th>
      <th style="background:#F4F8F6; padding:8px 10px; min-width:110px;">Admitted</th>
      <th style="background:#F4F8F6; padding:8px 10px; min-width:90px;">Pre-Test</th>
      ${MONTHS.map(m => `<th style="background:#F4F8F6; padding:8px 10px; min-width:96px;">${m}</th>`).join('')}
    </tr>`;
    const rows = data.children.map(ch => {
      const adm = parseDate(ch.admitted_date);
      const late = adm && adm > new Date(YEAR, 5, 1);
      const admCell = adm
        ? `<div>${esc(fmt(adm))}</div>${late ? '<span style="display:inline-block; margin-top:3px; font-size:11px; background:#FAEEDA; color:#854F0B; padding:1px 6px; border-radius:8px;">Joined late</span>' : ''}`
        : '<span style="color:#888780;">no date</span>';
      const pre = ch.pretest > 0
        ? `<span style="${STYLE.marked} padding:4px 8px; border-radius:6px; font-size:12px;">✓ ${ch.pretest}</span>`
        : `<span style="${STYLE.pending} padding:4px 8px; border-radius:6px; font-size:12px;">pending</span>`;
      const cells = MONTHS.map(m => {
        const c = cellFor(ch, m);
        const ring = c.joined ? 'box-shadow: inset 0 0 0 2px #185FA5;' : '';
        return `<td style="padding:6px; text-align:center;"><span title="${esc(m)}: ${esc(c.text)}" style="${STYLE[c.state]} ${ring} display:inline-block; min-width:80px; padding:5px 6px; border-radius:6px; font-size:12px;">${esc(c.text)}${c.joined ? ' · joined' : ''}</span></td>`;
      }).join('');
      return `<tr style="border-top:1px solid #E5EEE9;">
        <td style="position:sticky; left:0; background:#fff; padding:8px 10px; font-weight:600;">${esc(ch.name)}</td>
        <td style="padding:8px 10px; font-size:12px;">${admCell}</td>
        <td style="padding:6px; text-align:center;">${pre}</td>${cells}</tr>`;
    }).join('');
    return `<div style="overflow-x:auto;"><table style="border-collapse:collapse; width:100%; font-size:13px;"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  }
  window.renderAdmissionMap = async function(container){
    if(!container) return;
    const old = container.querySelector('[data-admission-map]'); if(old) old.remove();
    const card = document.createElement('div');
    card.className = 'card'; card.setAttribute('data-admission-map', ''); card.style.cssText = 'padding:16px 18px; margin-top:16px;';
    card.innerHTML = '<b>Admission and assessment map</b><p class="cap" style="margin:6px 0 0;">Loading…</p>';
    container.appendChild(card);
    try {
      const res = await fetch('backend/assessment/admission/admission_map.php?' + qs(), { cache: 'no-store' });
      const data = await res.json();
      if(data.status !== 'success') throw new Error(data.message || 'Could not load.');
      const legend = `<div style="display:flex; flex-wrap:wrap; gap:10px; font-size:12px; color:#5F5E5A; margin:8px 0 12px;">
        <span><span style="${STYLE.marked} padding:2px 8px; border-radius:4px;">W · O</span> marks saved (W = workbook, O = observation)</span>
        <span><span style="${STYLE.pending} padding:2px 8px; border-radius:4px;">pending</span> enrolled, no marks yet</span>
        <span><span style="${STYLE.before} padding:2px 8px; border-radius:4px;">not yet joined</span> before admission</span>
        <span><span style="${STYLE.nodate} padding:2px 8px; border-radius:4px;">no date</span> set from attendance</span>
        <span><span style="box-shadow: inset 0 0 0 2px #185FA5; padding:2px 8px; border-radius:4px;">joined</span> admission month</span></div>`;
      const body = data.children.length ? table(data) : '<p class="cap" style="margin:0;">No children in this class.</p>';
      card.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;"><b>Admission and assessment map</b><span class="cap" style="margin:0;">Admission date = first P or A day in attendance</span></div>${legend}${body}`;
    } catch(err){
      card.innerHTML = `<b>Admission and assessment map</b><p class="cap" style="margin:6px 0 0; color:var(--danger, #c8433f);">${esc(err.message || err)}</p>`;
    }
  };
})();
