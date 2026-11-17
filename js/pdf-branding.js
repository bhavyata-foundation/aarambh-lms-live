/* =========================================================================
   PDF BRANDING — js/pdf-branding.js
   Every PDF the portal makes gets the same branding on EVERY page,
   added automatically just before it is saved, so no report needs its
   own code for it:
     • top strip — logo · "Bhavyata Foundation × MCGM — Aarambh Programme"
                   · school · class · teacher
     • footer    — generated date & time · by whom · "Page X of Y"
   Load it after jsPDF in teacher.html:
     <script src="js/pdf-branding.js" defer></script>
   The logo is read from assets/logo.png; if that file is missing, a
   small green "B" badge is drawn instead.
   ========================================================================= */
(function(){
  var BRAND_LINE = 'Bhavyata Foundation \u00D7 MCGM \u2014 Aarambh Programme';
  var GREEN = [31, 122, 77], STRIP = [232, 245, 238], MUTED = [110, 116, 108];
  var logoDataUrl = null;

  // PDF fonts only cover Latin letters — drop anything else (emoji, Devanagari)
  // rather than printing garbage.
  function safe(s){
    return String(s == null ? '' : s)
      .replace(/[^\x20-\x7E\xA0-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u00B7]/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  // Load the logo once, as an image the PDF can embed.
  (function loadLogo(){
    var img = new Image();
    img.onload = function(){
      try {
        var c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        logoDataUrl = c.toDataURL('image/png');
      } catch(e){ logoDataUrl = null; }
    };
    img.src = 'assets/logo.png';
  })();

  // Who / where, read from the page at the moment the PDF is saved.
  function context(){
    var info = window.myClassInfo || (typeof myClassInfo !== 'undefined' ? myClassInfo : null) || {};
    var nameEl = document.querySelector('.user-name');
    var roleEl = document.querySelector('.user-name-block .tag');
    var schoolEl = document.getElementById('principalSchoolName');
    return {
      school: safe(info.school_name || (schoolEl && schoolEl.textContent) || ''),
      cls: safe(info.class_name || ''),
      person: safe(nameEl ? nameEl.textContent : ''),
      role: safe(roleEl ? roleEl.textContent : '')
    };
  }

  function stamp(doc){
    if(doc.__bhavyataBranded) return;
    doc.__bhavyataBranded = true;
    var ctx = context();
    var when = new Date().toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    var pages = doc.getNumberOfPages();
    var keepSize = doc.getFontSize();
    for(var i = 1; i <= pages; i++){
      doc.setPage(i);
      var w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();

      // ---- top strip ----
      doc.setFillColor(STRIP[0], STRIP[1], STRIP[2]);
      doc.rect(0, 0, w, 8, 'F');
      doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
      doc.rect(0, 8, w, 0.6, 'F');
      if(logoDataUrl){
        try { doc.addImage(logoDataUrl, 'PNG', 4, 1, 6, 6); } catch(e){ logoDataUrl = null; }
      }
      if(!logoDataUrl){
        doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
        doc.roundedRect(4, 1.2, 5.6, 5.6, 1.2, 1.2, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
        doc.text('B', 6.8, 5.4, { align: 'center' });
      }
      doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.text(BRAND_LINE, 12, 5.3);
      var right = [ctx.school, ctx.cls, ctx.person ? (ctx.person + (ctx.role ? ' (' + ctx.role + ')' : '')) : ''].filter(Boolean).join('  \u00B7  ');
      doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 44, 38); doc.setFontSize(7.5);
      if(right) doc.text(right, w - 4, 5.3, { align: 'right' });

      // ---- footer ----
      doc.setDrawColor(210, 214, 206); doc.setLineWidth(0.2);
      doc.line(4, h - 7.5, w - 4, h - 7.5);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]); doc.setFontSize(7);
      doc.text('Generated ' + when + (ctx.person ? ' by ' + ctx.person : '') + '  \u00B7  Bhavyata portal', 4, h - 3.5);
      doc.text('Page ' + i + ' of ' + pages, w - 4, h - 3.5, { align: 'right' });
    }
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(keepSize);
  }
  window.brandBhavyataPdf = stamp;

  // Hook every PDF's save() once the library is on the page.
  // jsPDF 2.x gives each document its own save(), so changing
  // jsPDF.API.save does not work: the document's real save() is lost and
  // every download failed with "Cannot read properties of undefined
  // (reading 'apply')". Instead, each new document's own save() is
  // wrapped as the document is made: branding first, then the real save.
  function hook(){
    var ns = window.jspdf, lib = ns && ns.jsPDF;
    if(!lib || !lib.API) return false;
    if(lib.__bhavyataHooked) return true;
    var Branded = function(){
      var args = [null].concat(Array.prototype.slice.call(arguments));
      var doc = new (Function.prototype.bind.apply(lib, args))();
      var realSave = doc.save;
      if(typeof realSave === 'function'){
        doc.save = function(){
          try { stamp(this); } catch(e){ /* never block a download over branding */ }
          return realSave.apply(this, arguments);
        };
      }
      return doc;
    };
    // everything callers use on jsPDF itself (API, plugins, version, autoTableSetDefaults …)
    Object.getOwnPropertyNames(lib).forEach(function(k){
      if(k === 'length' || k === 'name' || k === 'prototype' || k === 'caller' || k === 'arguments') return;
      try { Branded[k] = lib[k]; } catch(e){}
    });
    Branded.prototype = lib.prototype;     // same prototype as before
    Branded.__bhavyataHooked = true;
    ns.jsPDF = Branded;
    if(window.jsPDF === lib) window.jsPDF = Branded;
    // Tables that run onto more pages start below the strip and stop
    // above the footer (reports can still set their own margins).
    try { if(typeof lib.autoTableSetDefaults === 'function') lib.autoTableSetDefaults({ margin: { top: 14, bottom: 12 } }); } catch(e){}
    return true;
  }
  if(!hook()){
    var tries = 0;
    var t = setInterval(function(){ if(hook() || ++tries > 60) clearInterval(t); }, 500);
  }
})();