// Curriculum master (supervisor side): the term's assessment items, each filed under its CG and competency.
(function(){
  var CG = {
    1: ['Healthy & Safe Habits', 6, 'Physical & Motor'], 2: ['Sensorial Development', 7, 'Physical & Motor'],
    3: ['Physical Fitness & Fine Motor Skills', 8, 'Physical & Motor'], 4: ['Emotional Intelligence', 8, 'Socio-Emotional'],
    5: ['Productive Work & Seva', 9, 'Moral, Cultural & Environmental'], 6: ['Care for Nature', 8, 'Moral, Cultural & Environmental'],
    7: ['Observation & Logical Thinking', 10, 'Cognitive'], 8: ['Mathematical Understanding', 10, 'Cognitive'],
    9: ['Communication in Two Languages', 10, 'Language & Communication'], 10: ['Reading & Writing (L1)', 6, 'Language & Communication'],
    11: ['Beginning Reading & Writing (L2)', 4, 'Language & Communication'], 12: ['Visual & Performing Arts', 8, 'Creative-Aesthetic'],
    13: ['Curiosity, Attention, Adaptability & Positivity', 6, 'Cognitive']
  };
  var ASSESSMENTS = ['Pre-Test', 'Classroom Observation', 'Workbook', 'Fine & Gross Motor', 'Viva'];
  var state = { level: 'Sr KG', term: 'TERM_1', items: [], loaded: false };
  var qs = function(){ return window.location.search ? '&' + window.location.search.slice(1) : ''; };
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };

  // status of one row: does its CG exist, and does its competency belong to that CG?
  function statusOf(it){
    if(!it.cg_number) return ['Missing CG', '#B42318'];
    if(!CG[it.cg_number]) return ['CG not in list', '#B42318'];
    var m = /^C-(\d+)\./.exec(it.competency_code || '');
    if(it.competency_code && (!m || Number(m[1]) !== it.cg_number)) return ['Code is not in this CG', '#B42318'];
    if(!it.competency_code) return ['No competency code', '#9A6A00'];
    return ['Matched', '#1E7B4F'];
  }

  function load(){
    state.loaded = false;
    fetch('backend/curriculum/get_curriculum.php?level=' + encodeURIComponent(state.level) + '&term=' + encodeURIComponent(state.term) + qs(), { cache: 'no-store' })
      .then(function(r){ return r.json(); })
      .then(function(d){ state.items = d.status === 'success' ? d.items : []; state.loaded = true; draw(d.status === 'success' ? '' : (d.message || 'Could not load the curriculum.')); })
      .catch(function(){ state.loaded = true; draw('Could not reach the server.'); });
  }

  function legend(){
    var rows = Object.keys(CG).map(function(n){ var g = CG[n];
      return '<tr><td style="padding:6px 10px; font-weight:700;">CG-' + n + '</td><td style="padding:6px 10px;">' + esc(g[0]) + '</td><td style="padding:6px 10px;">' + esc(g[2]) + '</td><td style="padding:6px 10px; text-align:right;">' + g[1] + '%</td></tr>'; }).join('');
    return '<details style="margin-bottom:14px;"><summary style="cursor:pointer; font-weight:700;">CG legend (number, name, domain, weightage)</summary>' +
      '<table style="width:100%; border-collapse:collapse; margin-top:8px; font-size:13px;">' + rows + '</table></details>';
  }

  function rowHtml(it){
    var st = statusOf(it);
    var sel = function(opts, val){ return '<select data-f="%F%" style="padding:5px 6px; border:1px solid #C9D6CF; border-radius:6px; font-size:13px;">' + opts.map(function(o){ return '<option value="' + esc(o) + '"' + (String(o) === String(val) ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>'; };
    var cgOpts = ['']; for(var n = 1; n <= 13; n++) cgOpts.push(String(n));
    return '<tr data-id="' + (it.id || 0) + '" style="border-top:1px solid #E3ECE7;">' +
      '<td style="padding:6px;">' + sel(ASSESSMENTS, it.assessment).replace('%F%', 'assessment') + '</td>' +
      '<td style="padding:6px;"><input data-f="month" value="' + esc(it.month) + '" style="width:100px; padding:5px; font-size:13px;"></td>' +
      '<td style="padding:6px;"><input data-f="item" value="' + esc(it.item) + '" style="width:220px; padding:5px; font-size:13px;"></td>' +
      '<td style="padding:6px;"><input data-f="page" value="' + esc(it.page) + '" style="width:80px; padding:5px; font-size:13px;"></td>' +
      '<td style="padding:6px;"><select data-f="cg_number" style="padding:5px; font-size:13px;">' + cgOpts.map(function(o){ return '<option value="' + o + '"' + (String(it.cg_number || '') === o ? ' selected' : '') + '>' + (o ? 'CG-' + o : '—') + '</option>'; }).join('') + '</select></td>' +
      '<td style="padding:6px;"><input data-f="competency_code" value="' + esc(it.competency_code) + '" placeholder="C-7.1" style="width:80px; padding:5px; font-size:13px;"></td>' +
      '<td style="padding:6px; text-align:center;"><input data-f="sort_order" type="number" value="' + (it.sort_order || 0) + '" style="width:60px; padding:5px; font-size:13px;"></td>' +
      '<td style="padding:6px; font-weight:700; color:' + st[1] + '; white-space:nowrap;">' + st[0] + '</td>' +
      '<td style="padding:6px; white-space:nowrap;"><button data-act="save" style="padding:5px 10px; border-radius:6px; border:1px solid #0E6B4E; background:#0E6B4E; color:#fff; font-size:12.5px; cursor:pointer;">Save</button> ' +
      (it.id ? '<button data-act="del" style="padding:5px 10px; border-radius:6px; border:1px solid #E2A6A0; background:#fff; color:#9B1C1C; font-size:12.5px; cursor:pointer;">Delete</button>' : '') + '</td></tr>';
  }

  function draw(msg){
    var host = document.getElementById('curriculum-body'); if(!host) return;
    var matched = state.items.filter(function(i){ return statusOf(i)[0] === 'Matched'; }).length;
    var rows = state.items.map(rowHtml).join('');
    host.innerHTML =
      '<div class="card" style="padding:16px 18px;">' +
        '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">' +
          '<div><h3 style="margin:0;">Curriculum master</h3><p class="cap" style="margin:4px 0 0;">Every assessment item for the term, filed under its CG and competency. Each row shows whether it matches.</p></div>' +
          '<div style="display:flex; gap:8px; align-items:center;">' +
            '<select id="cmLevel" style="padding:7px 10px;"><option value="Sr KG"' + (state.level === 'Sr KG' ? ' selected' : '') + '>Senior KG</option><option value="Jr KG"' + (state.level === 'Jr KG' ? ' selected' : '') + '>Junior KG</option></select>' +
            '<select id="cmTerm" style="padding:7px 10px;"><option value="TERM_1"' + (state.term === 'TERM_1' ? ' selected' : '') + '>Term 1</option><option value="TERM_2"' + (state.term === 'TERM_2' ? ' selected' : '') + '>Term 2</option></select>' +
          '</div>' +
        '</div>' +
        '<p style="margin:10px 0 0; font-size:13px;"><b>' + matched + '</b> of <b>' + state.items.length + '</b> items matched</p>' +
        (msg ? '<p style="color:#B42318; font-weight:700; margin:8px 0 0;">' + esc(msg) + '</p>' : '') +
        '<div style="margin:12px 0;">' + legend() + '</div>' +
        '<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:13px;">' +
          '<thead><tr style="background:#F4F8F6; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#5b6b62;">' +
          '<th style="padding:8px 6px; text-align:left;">Assessment</th><th style="padding:8px 6px; text-align:left;">Month</th><th style="padding:8px 6px; text-align:left;">Item / Activity</th><th style="padding:8px 6px; text-align:left;">Page</th><th style="padding:8px 6px; text-align:left;">CG</th><th style="padding:8px 6px; text-align:left;">Competency</th><th style="padding:8px 6px; text-align:center;">Order</th><th style="padding:8px 6px; text-align:left;">Status</th><th></th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table></div>' +
        '<div style="margin-top:12px;"><button id="cmAdd" style="padding:8px 14px; border-radius:8px; border:1px solid #0E6B4E; background:#fff; color:#0E6B4E; font-weight:700; cursor:pointer;">+ Add item</button></div>' +
      '</div>';
    bind();
  }

  function rowData(tr){
    var o = { id: Number(tr.getAttribute('data-id')) || 0, level: state.level, term: state.term };
    tr.querySelectorAll('[data-f]').forEach(function(el){ o[el.getAttribute('data-f')] = el.value; });
    o.cg_number = o.cg_number ? Number(o.cg_number) : null;
    o.sort_order = Number(o.sort_order) || 0;
    return o;
  }

  function bind(){
    document.getElementById('cmLevel').onchange = function(e){ state.level = e.target.value; load(); };
    document.getElementById('cmTerm').onchange = function(e){ state.term = e.target.value; load(); };
    document.getElementById('cmAdd').onclick = function(){ state.items.push({ id: 0, assessment: 'Classroom Observation', month: '', item: '', page: '', cg_number: null, competency_code: '', sort_order: state.items.length + 1 }); draw(''); };
    document.querySelectorAll('#curriculum-body tbody tr').forEach(function(tr){
      tr.querySelector('[data-act="save"]').onclick = function(){ save(tr); };
      var del = tr.querySelector('[data-act="del"]');
      if(del) del.onclick = function(){ remove(tr); };
    });
  }

  function save(tr){
    var body = rowData(tr);
    fetch('backend/curriculum/save_curriculum.php' + (window.location.search || ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function(r){ return r.json(); })
      .then(function(d){ if(d.status !== 'success'){ alert(d.message || 'Not saved.'); return; } load(); })
      .catch(function(){ alert('Not saved: no connection.'); });
  }

  function remove(tr){
    var id = Number(tr.getAttribute('data-id'));
    if(!id || !confirm('Remove this item from the curriculum master?')) return;
    fetch('backend/curriculum/delete_curriculum.php' + (window.location.search || ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) })
      .then(function(r){ return r.json(); })
      .then(function(d){ if(d.status !== 'success'){ alert(d.message || 'Not removed.'); return; } load(); })
      .catch(function(){ alert('Not removed: no connection.'); });
  }

  window.renderCurriculumMaster = function(){ load(); };
})();
