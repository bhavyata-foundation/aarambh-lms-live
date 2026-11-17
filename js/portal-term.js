// One Term 1 / Term 2 for the whole portal. The choice is stored once; every page reads it.
(function(){
  // The term the portal opens on when nothing has been chosen yet. Change this one number to change the default.
  var DEFAULT_TERM = 2;
  // A new key, so the default above applies once to everyone (an older Term 1 choice is ignored).
  var KEY = 'aarambh.term.v2';
  function defaultTerm(){ return DEFAULT_TERM; }
  window.getPortalTerm = function(){ var v = parseInt(localStorage.getItem(KEY), 10); return (v === 1 || v === 2) ? v : defaultTerm(); };
  window.setPortalTerm = function(n){
    n = (n === 2) ? 2 : 1;
    if(n === window.getPortalTerm()) return;
    localStorage.setItem(KEY, String(n));
    location.reload();
  };
  function draw(){
    if(document.getElementById('portal-term-switch')) return;
    var box = document.createElement('div');
    box.id = 'portal-term-switch';
    box.style.cssText = 'position:fixed; top:14px; right:300px; z-index:9999; display:flex; gap:4px; background:#fff; border:1px solid #C9D6CF; border-radius:999px; padding:4px; box-shadow:0 2px 8px rgba(0,0,0,.08); font:600 12.5px system-ui,sans-serif;';
    var cur = window.getPortalTerm();
    [[1, 'Term 1 · Jun–Oct'], [2, 'Term 2 · Nov–Mar']].forEach(function(p){
      var b = document.createElement('button'); b.type = 'button'; b.textContent = p[1];
      b.style.cssText = 'border:0; border-radius:999px; padding:6px 12px; cursor:pointer; font:inherit; ' + (cur === p[0] ? 'background:#17765B; color:#fff;' : 'background:transparent; color:#1D2B22;');
      b.onclick = function(){ window.setPortalTerm(p[0]); };
      box.appendChild(b);
    });
    document.body.appendChild(box);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', draw); else draw();
})();
