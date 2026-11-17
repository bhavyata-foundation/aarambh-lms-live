/* =========================================================================
   TEST MODE BANNER — js/test-mode-banner.js
   Add to every portal page (teacher, supervisor, principal, login):
     <script src="js/test-mode-banner.js"></script>
   Asks the server whether this browser is in test mode. If it is, an
   orange banner stays at the top of every page, the tab title starts with
   "[TEST]", and the first page opened in test mode shows an alert once.
   In the real portal it shows nothing at all.
   ========================================================================= */
(function(){
  var COOKIE = 'aarambh_test_mode';
  function clearCookie(){ document.cookie = COOKIE + '=; Max-Age=0; path=/'; }

  function leaveTestMode(){
    if(!confirm('Leave TEST MODE?\n\nThis browser goes back to the REAL portal. Anything saved after this goes into real school data.')) return;
    clearCookie();
    try { sessionStorage.removeItem('aarambhTestAlertShown'); } catch(e){}
    alert('You have left test mode.\n\nThis browser is now on the REAL portal.');
    location.reload();
  }
  window.leaveAarambhTestMode = leaveTestMode;

  function showBanner(){
    if(document.getElementById('aarambhTestBanner')) return;
    var bar = document.createElement('div');
    bar.id = 'aarambhTestBanner';
    bar.setAttribute('role', 'alert');
    bar.style.cssText = 'position:fixed; top:0; left:0; right:0; z-index:2147483000; display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap;'
      + 'padding:7px 14px; font:600 13px/1.3 system-ui,Segoe UI,sans-serif; color:#fff; text-align:center;'
      + 'background:repeating-linear-gradient(135deg,#c2410c 0 18px,#ea580c 18px 36px); box-shadow:0 2px 8px rgba(0,0,0,.25);';
    bar.innerHTML = '<span>🧪 TEST MODE — you are using the TEST copy of the database. Nothing you save here changes real school data.</span>'
      + '<button type="button" style="padding:4px 12px; border-radius:6px; border:1px solid #fff; background:rgba(255,255,255,.15); color:#fff; font:600 12px system-ui,sans-serif; cursor:pointer;">Leave test mode</button>';
    bar.querySelector('button').onclick = leaveTestMode;
    document.body.appendChild(bar);
    var pad = function(){ document.body.style.paddingTop = bar.offsetHeight + 'px'; };
    pad(); window.addEventListener('resize', pad);
    if(document.title.indexOf('[TEST]') !== 0) document.title = '[TEST] ' + document.title;
    try {
      if(!sessionStorage.getItem('aarambhTestAlertShown')){
        sessionStorage.setItem('aarambhTestAlertShown', '1');
        alert('🧪 TEST MODE\n\nThis browser is using the TEST copy of the database.\nYou can add, import and change anything — real school data is not affected.\n\nUse "Leave test mode" in the orange bar to go back to the real portal.');
      }
    } catch(e){}
  }

  // On the XAMPP laptop itself (localhost) a small green note says when
  // this is the REAL data, so testing never happens there by mistake.
  // Schools opening the portal through ngrok never see this note.
  function showRealNote(){
    if(document.getElementById('aarambhRealNote')) return;
    var h = location.hostname;
    if(h !== 'localhost' && h !== '127.0.0.1') return;
    var n = document.createElement('div');
    n.id = 'aarambhRealNote';
    n.style.cssText = 'position:fixed; left:12px; bottom:12px; z-index:2147483000; padding:6px 12px; border-radius:99px;'
      + 'font:600 12px/1.3 system-ui,Segoe UI,sans-serif; color:#fff; background:#1f7a4d; box-shadow:0 2px 8px rgba(0,0,0,.2);';
    n.textContent = '✓ REAL DATA — this is not test mode';
    n.title = 'This browser is using the real school database. To test, open backend/dev/test_env.php and put this browser in test mode.';
    document.body.appendChild(n);
  }

  function check(){
    fetch('backend/dev/env_status.php', { cache: 'no-store', credentials: 'same-origin' })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){
        if(d && d.env === 'test') showBanner();
        else if(d && d.env === 'live') showRealNote();
        // If the status could not be checked, change nothing — never
        // switch test mode off on our own.
      })
      .catch(function(){ /* status unavailable — change nothing */ });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check); else check();
})();