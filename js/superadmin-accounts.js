// Super Admin: edit an account's name, email, role and password.
(function(){
  var qs = function(){ return window.location.search ? '&' + window.location.search.slice(1) : ''; };
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var ROLES = ['teacher', 'supervisor', 'superadmin', 'parent'];
  var msg = function(text, ok){ var el = document.getElementById('acctMsg'); if(!el) return; el.style.color = ok ? '#1E7B4F' : '#B42318'; el.textContent = text; };

  window.renderAccountEditor = function(){
    var host = document.getElementById('admin-body'); if(!host) return;
    host.innerHTML =
      '<div class="card" style="padding:18px 20px; max-width:860px;">' +
        '<h3 style="margin:0;">Edit accounts</h3>' +
        '<p class="cap" style="margin:4px 0 12px;">Search for a teacher, supervisor or parent by name or email. Change the name, email, role or password, then save.</p>' +
        '<div style="display:flex; gap:8px;"><input id="acctQ" placeholder="Name or email" style="flex:1; padding:8px 10px;"><button id="acctFind" style="padding:8px 14px; border-radius:8px; border:none; background:#0E6B4E; color:#fff; font-weight:700; cursor:pointer;">Search</button></div>' +
        '<div id="acctResults" style="margin-top:10px;"></div>' +
        '<div id="acctEdit" style="margin-top:14px;"></div>' +
        '<p id="acctMsg" style="font-weight:700; margin:10px 0 0;"></p>' +
      '</div>';
    document.getElementById('acctFind').onclick = search;
    document.getElementById('acctQ').onkeydown = function(e){ if(e.key === 'Enter') search(); };
  };

  function search(){
    var q = document.getElementById('acctQ').value.trim();
    if(!q){ msg('Type a name or email to search.', false); return; }
    msg('', true);
    fetch('backend/superadmin/find_account.php?q=' + encodeURIComponent(q) + qs(), { cache: 'no-store' })
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d.status !== 'success'){ msg(d.message || 'Search failed.', false); return; }
        var list = d.accounts || [];
        document.getElementById('acctResults').innerHTML = list.length ? list.map(function(a){
          return '<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-top:1px solid #E3ECE7;"><span><b>' + esc(a.name) + '</b> · ' + esc(a.email) + ' · ' + esc(a.role) + '</span>' +
            '<button data-id="' + a.id + '" style="padding:5px 12px; border-radius:6px; border:1px solid #0E6B4E; background:#fff; color:#0E6B4E; cursor:pointer;">Edit</button></div>';
        }).join('') : '<p class="cap">No account matches that search.</p>';
        document.querySelectorAll('#acctResults button[data-id]').forEach(function(b){
          b.onclick = function(){ var a = list.filter(function(x){ return String(x.id) === b.getAttribute('data-id'); })[0]; openEditor(a); };
        });
      })
      .catch(function(){ msg('Could not reach the server.', false); });
  }

  function openEditor(a){
    document.getElementById('acctEdit').innerHTML =
      '<div style="border:1px solid #C9D6CF; border-radius:10px; padding:14px;">' +
        '<b>Editing: ' + esc(a.name) + '</b>' +
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">' +
          '<label>Name<input id="acctName" value="' + esc(a.name) + '" style="width:100%; padding:7px; margin-top:4px;"></label>' +
          '<label>Email<input id="acctEmail" value="' + esc(a.email) + '" style="width:100%; padding:7px; margin-top:4px;"></label>' +
          '<label>Role<select id="acctRole" style="width:100%; padding:7px; margin-top:4px;">' + ROLES.map(function(r){ return '<option value="' + r + '"' + (r === a.role ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></label>' +
          '<label>New password (leave blank to keep)<input id="acctPass" type="password" autocomplete="new-password" style="width:100%; padding:7px; margin-top:4px;"></label>' +
        '</div>' +
        '<button id="acctSave" style="margin-top:12px; padding:9px 18px; border-radius:8px; border:none; background:#0E6B4E; color:#fff; font-weight:700; cursor:pointer;">Save changes</button>' +
      '</div>';
    document.getElementById('acctSave').onclick = function(){ save(a.id); };
  }

  function save(id){
    var body = { id: id, name: document.getElementById('acctName').value, email: document.getElementById('acctEmail').value, role: document.getElementById('acctRole').value, password: document.getElementById('acctPass').value };
    fetch('backend/superadmin/update_account.php' + (window.location.search || ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d.status !== 'success'){ msg(d.message || 'Not saved.', false); return; }
        msg('Saved.' + (d.password_changed ? ' The new password is active now.' : ''), true);
        document.getElementById('acctPass').value = '';
      })
      .catch(function(){ msg('Not saved: no connection.', false); });
  }
})();
