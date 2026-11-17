/* =========================================================================
   js/render/class-switch.js — the class switch in the top bar
   -------------------------------------------------------------------------
   A teacher who teaches two sections of her school (one login, both
   sections) sees a small two-button switch beside the school name:

        [ ● Jr KG ]  [   Sr KG ]        ← the class she is in is solid white

   One tap on the other button switches: the server is told (backend/
   schools/select_class.php, which only accepts her own classes), the page
   reloads with that class only, and a note confirms it:
        "✓ You are now in Senior KG (Balvatika 3) — 12 children"

   Teachers with one class see nothing new.
   Called by loadMyClassInfo() (js/render/app-bootstrap.js) once her
   classes are known. Loads after the part files (teacher.html).
   ========================================================================= */
(function(){
  'use strict';

  const NOTE_KEY = 'aarambhClassSwitchedTo'; // set just before the reload, read once after it

  function isSr(name){ return /\bsenior\b|\bsr\.?\s*k\.?\s*g\b|\bskg\b|\bukg\b|balvatika\s*-?\s*3/i.test(String(name || '')); }
  function shortLabel(c){
    const n = String(c.class_name || '').trim();
    if(!n) return 'Class ' + c.class_id;           // no standard yet: its number, never a guess
    if(/junior/i.test(n)) return 'Jr KG';
    if(/senior/i.test(n)) return 'Sr KG';
    return n;
  }
  function longLabel(c){
    const n = String(c.class_name || '').trim();
    if(!n) return 'class ' + c.class_id;
    return n + (isSr(n) ? ' (Balvatika 3)' : /junior|jr/i.test(n) ? ' (Balvatika 2)' : '');
  }
  const DOT = { jr: '#2e9d5b', sr: '#7b5cc4' };    // Jr KG green, Sr KG purple

  async function choose(c, bar){
    bar.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      const res = await fetch('backend/schools/select_class.php' + window.location.search, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: Number(c.class_id) })
      });
      const data = await res.json();
      if(data.status !== 'success') throw new Error(data.message || 'Could not switch class.');
      try { sessionStorage.setItem(NOTE_KEY, longLabel(c)); } catch(e){}
      window.location.reload(); // every screen starts again with the chosen class
    } catch(err){
      alert('The class was not changed: ' + (err.message || err));
      bar.querySelectorAll('button').forEach(b => { b.disabled = false; });
    }
  }

  // "✓ You are now in Senior KG (Balvatika 3) — 12 children", once, after a switch.
  function showSwitchedNote(){
    let label = null;
    try { label = sessionStorage.getItem(NOTE_KEY); sessionStorage.removeItem(NOTE_KEY); } catch(e){}
    if(!label) return;
    const note = document.createElement('div');
    note.setAttribute('role', 'status');
    note.setAttribute('data-class-switch-note', '');
    note.style.cssText = 'position:fixed; top:84px; left:50%; transform:translateX(-50%); z-index:9999; background:#1d2b22; color:#fff; padding:10px 18px; border-radius:10px; font-size:14px; font-weight:600; box-shadow:0 6px 20px rgba(0,0,0,.25); max-width:92vw; text-align:center;';
    note.textContent = '✓ You are now in ' + label;
    document.body.appendChild(note);
    // add the number of children once the class list has loaded
    let tries = 0;
    (function addCount(){
      if(Array.isArray(window.realPupilsCache) || (typeof realPupilsCache !== 'undefined' && Array.isArray(realPupilsCache))){
        const n = (typeof realPupilsCache !== 'undefined' ? realPupilsCache : window.realPupilsCache).length;
        note.textContent = '✓ You are now in ' + label + ' — ' + n + (n === 1 ? ' child' : ' children');
      } else if(++tries < 20) setTimeout(addCount, 250);
    })();
    setTimeout(() => { note.style.transition = 'opacity .4s'; note.style.opacity = '0'; setTimeout(() => note.remove(), 450); }, 5000);
  }

  // ---- Keep the page below the fixed green top bar --------------------------
  // The top bar stays fixed while the page scrolls under it. When the bar is
  // taller than the gap the page leaves for it (a long school name, the class
  // switch, a narrow screen), the page heading and the first sidebar group
  // slid behind it. This measures the bar and moves the page (and a fixed
  // sidebar) down by exactly the overlap. It changes nothing when there is
  // no overlap, and runs again whenever the bar changes height.
  function fitBelowTopbar(){
    const view = document.getElementById('view-dashboard');
    const bar = view && view.querySelector(':scope > .topbar');
    const layout = view && view.querySelector(':scope > .layout');
    if(!bar || !layout || view.classList.contains('hidden')) return;
    const pos = getComputedStyle(bar).position;
    if(pos !== 'fixed' && pos !== 'absolute') return;            // a bar that takes its own space can't cover anything
    const h = Math.ceil(bar.getBoundingClientRect().height);
    layout.style.marginTop = '';                                  // back to the stylesheet's gap, then measure it
    const top = layout.getBoundingClientRect().top + window.scrollY;
    if(top < h) layout.style.marginTop = ((parseFloat(getComputedStyle(layout).marginTop) || 0) + (h - top)) + 'px';
    const side = document.getElementById('sidebar');
    if(side){
      side.style.top = '';
      const sp = getComputedStyle(side).position, st = parseFloat(getComputedStyle(side).top);
      if((sp === 'fixed' || sp === 'sticky') && !isNaN(st) && st < h) side.style.top = h + 'px';
    }
  }
  window.fitBelowTopbar = fitBelowTopbar;
  (function watch(){
    const start = () => {
      const bar = document.querySelector('#view-dashboard > .topbar');
      if(bar && typeof ResizeObserver === 'function') new ResizeObserver(() => fitBelowTopbar()).observe(bar);
      const view = document.getElementById('view-dashboard');
      if(view && typeof MutationObserver === 'function') new MutationObserver(() => fitBelowTopbar()).observe(view, { attributes: true, attributeFilter: ['class'] });
      window.addEventListener('resize', fitBelowTopbar);
      fitBelowTopbar();
    };
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  })();

  window.renderClassSwitch = function(){
    const list = (typeof myClassInfo !== 'undefined' && Array.isArray(myClassInfo.classes)) ? myClassInfo.classes : [];
    document.querySelectorAll('[data-class-switch]').forEach(el => el.remove());
    if(list.length < 2){ fitBelowTopbar(); return; } // one class: nothing to choose

    document.querySelectorAll('.topbar-brand-sub').forEach(line => {
      // the switch itself shows the class, so the line under the brand shows just the school
      line.textContent = 'An initiative by Bhavyata Foundation';
      const bar = document.createElement('span');
      bar.setAttribute('data-class-switch', '');
      bar.setAttribute('role', 'group');
      bar.setAttribute('aria-label', 'Class you are working in');
      bar.style.cssText = 'display:inline-flex; gap:2px; padding:2px; margin-left:8px; border-radius:999px; background:rgba(0,0,0,.18); vertical-align:middle; line-height:1;';
      list.forEach(c => {
        const on = String(c.class_id) === String(myClassInfo.class_id), sr = isSr(c.class_name);
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.title = on ? 'You are working in ' + longLabel(c) : 'Switch to ' + longLabel(c);
        b.style.cssText = 'display:inline-flex; align-items:center; gap:6px; border:0; border-radius:999px; padding:3px 9px; font:inherit; font-size:11.5px; line-height:1.2; font-weight:700; cursor:' + (on ? 'default' : 'pointer') + '; ' +
          (on ? 'background:#fff; color:#1d2b22; box-shadow:0 1px 3px rgba(0,0,0,.25);' : 'background:transparent; color:rgba(255,255,255,.92);');
        b.innerHTML = '<span aria-hidden="true" style="width:8px; height:8px; border-radius:50%; background:' + (sr ? DOT.sr : DOT.jr) + '; ' + (on ? '' : 'opacity:.75;') + '"></span>';
        b.appendChild(document.createTextNode(shortLabel(c)));
        if(!on) b.onclick = () => choose(c, bar);
        bar.appendChild(b);
      });
      // On the same line as the school name, so the green top bar stays its
      // usual height and never covers the page heading underneath it.
      line.style.display = 'inline';
      line.insertAdjacentElement('afterend', bar);
    });
    showSwitchedNote();
    fitBelowTopbar();
  };
})();
