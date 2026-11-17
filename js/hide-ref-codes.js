/* =========================================================================
   HIDE REFERENCE CODES — js/hide-ref-codes.js
   The portal's screens are tagged with requirement reference numbers
   from the programme's specification (REG-05, REP-08/09, ADB-14,
   CAL-04/13, ISS-04…10, LPC-01…04 …). They help developers, not
   teachers, so this removes them from what is shown — on every screen,
   as it appears — and from the PDFs made from those screens.
   Never touched: CG codes (CG-8.3, C-8.3), register numbers, names,
   or anything inside an input box.
   Load on every page:  <script src="js/hide-ref-codes.js"></script>
   ========================================================================= */
(function(){
  // Requirement codes: 2–4 capital letters, a dash, a number, optionally a
  // range (…, -, –, /) — but never CG- (curricular goals).
  var CODE = '(?:(?!CG-)[A-Z]{2,4}-[A-Z]?\\d{1,3}(?:\\.\\d+)?(?:\\s*(?:…|\\.\\.\\.|–|/)\\s*[A-Z]?\\d{1,3})?(?:/\\d{1,3})?)';
  var LIST = new RegExp('(?:^|(?<=[\\s(]))' + CODE + '(?:\\s*[·•,]\\s*(?:' + CODE + '|[A-Z]{2,4}(?![a-z])))*', 'g');
  var LEAD = new RegExp('^\\s*' + CODE + '(?:\\s*[·•,]\\s*' + CODE + ')*\\s*[·•:—–-]\\s*');
  var ONLY_LEFTOVER = /^[\s·•,()\-–—…/]*(?:(?:[A-Z]{2,4}|printable)[\s·•,()\-–—…/]*)*$/;

  // Strip codes from one piece of text; returns the cleaned text.
  function clean(t){
    if(!/[A-Z]{2,4}-\d/.test(t)) return t;
    var out = t.replace(LEAD, '').replace(LIST, '');
    out = out.replace(/\s+[—–]\s*([.,;:])/g, '$1')          // "threshold — ." → "threshold."
             .replace(/\(\s*[·•,]?\s*\)/g, '')               // "( )" left behind
             .replace(/^\s*[·•]\s*/, '').replace(/\s*[·•]\s*$/, '')
             .replace(/\s{2,}/g, ' ');
    return ONLY_LEFTOVER.test(out) ? '' : out;
  }

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CODE: 1, PRE: 1 };
  function scrub(root){
    if(!root) return;
    if(root.nodeType === 3){ fixText(root); return; }
    if(root.nodeType !== 1 || SKIP[root.tagName] || root.isContentEditable) return;
    if(root.classList && root.classList.contains('reqs')){ root.style.display = 'none'; return; }
    root.querySelectorAll && root.querySelectorAll('.reqs').forEach(function(el){ el.style.display = 'none'; });
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function(n){
      var p = n.parentElement;
      while(p && p !== root.parentElement){ if(SKIP[p.tagName] || p.isContentEditable) return NodeFilter.FILTER_REJECT; p = p.parentElement; }
      return /[A-Z]{2,4}-\d/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }});
    var list = []; while(w.nextNode()) list.push(w.currentNode);
    list.forEach(fixText);
  }
  function fixText(n){
    var before = n.nodeValue, after = clean(before);
    if(after === before) return;
    n.nodeValue = after;
    // A small label that held only the code (e.g. under a tile) — hide the empty box.
    var p = n.parentElement;
    if(!after.trim() && p && !p.children.length && !p.textContent.trim()) p.style.display = 'none';
  }
  window.cleanReferenceCodes = clean;

  function start(){
    var style = document.createElement('style');
    style.textContent = '.reqs{display:none !important;}';
    document.head.appendChild(style);
    scrub(document.body);
    new MutationObserver(function(list){
      list.forEach(function(m){
        if(m.type === 'characterData') fixText(m.target);
        else m.addedNodes.forEach(scrub);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();


/* -------------------------------------------------------------------------
   SECURITY CLEAN-UP (added here because this file loads on every page):
   an older login page kept the email AND PASSWORD in this browser in plain
   readable text ('savedLoginCredentials'). Wipe that copy wherever the
   person is, keeping only the email so the login page can still fill it in.
   ------------------------------------------------------------------------- */
(function forgetOldSavedPasswordEverywhere(){
  try{
    const raw = localStorage.getItem('savedLoginCredentials');
    if(raw === null) return;
    let email = '';
    try { email = (JSON.parse(raw) || {}).email || ''; } catch(e){}
    if(email && !localStorage.getItem('rememberedLoginEmail')) localStorage.setItem('rememberedLoginEmail', email);
    localStorage.removeItem('savedLoginCredentials');
  } catch(e){ /* storage unavailable */ }
})();

