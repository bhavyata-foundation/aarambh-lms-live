// Six domains of development, with the weightage of each domain and of each curricular goal (CG).
// Final CG weightages total 100%. Domain weightage = sum of its CGs.
// Hovering over a CG (CG-n) or a competency (C-n.m) on any summary table shows its domain and weightage.
(function(){
  var DOMAINS = [
    { name: 'Physical and Motor Development', weight: 21, cgs: [1, 2, 3] },
    { name: 'Moral, Cultural and Environmental Development', weight: 17, cgs: [5, 6] },
    { name: 'Socio-Emotional Development', weight: 8, cgs: [4] },
    { name: 'Cognitive Development', weight: 26, cgs: [7, 8, 13] },
    { name: 'Language & Communication', weight: 20, cgs: [9, 10, 11] },
    { name: 'Creative–Aesthetic Development', weight: 8, cgs: [12] }
  ];
  // weightage of each CG (final, total 100%)
  var CG_WEIGHT = { 1: 6, 2: 7, 3: 8, 4: 8, 5: 9, 6: 8, 7: 10, 8: 10, 9: 10, 10: 6, 11: 4, 12: 8, 13: 6 };
  var byCg = {};
  DOMAINS.forEach(function(d){ d.cgs.forEach(function(n){ byCg[n] = d; }); });
  window.CG_DOMAINS = DOMAINS;
  window.CG_WEIGHT = CG_WEIGHT;
  window.cgDomainFor = function(n){ return byCg[Number(n)] || null; };

  // the hover text for a CG or competency code
  function tipFor(text){
    var m = /^\s*(?:CG-|C-)(\d+)(?:\.\d+)?\b/.exec(text || '');
    if(!m) return null;
    var n = Number(m[1]);
    var d = byCg[n];
    if(!d) return null;
    return d.name + ' · domain ' + d.weight + '% · CG-' + n + ' ' + CG_WEIGHT[n] + '% of the HPC';
  }
  // add the tip to every CG / competency code that doesn't have one yet
  function tag(root){
    if(!root || !root.querySelectorAll) return;
    root.querySelectorAll('b, span, div, td, th').forEach(function(el){
      if(el.dataset.cgTip) return;
      var own = Array.prototype.filter.call(el.childNodes, function(n){ return n.nodeType === 3; })
        .map(function(n){ return n.textContent; }).join('').trim();
      var txt = own || (el.children.length === 1 && el.children[0].tagName === 'B' ? el.children[0].textContent : '');
      var tip = tipFor(txt);
      if(tip){ el.title = tip; el.dataset.cgTip = '1'; }
    });
  }
  var timer = null;
  function run(){ clearTimeout(timer); timer = setTimeout(function(){ tag(document.body); }, 150); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  new MutationObserver(run).observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
