/* =========================================================================
   js/keep-scroll.js — stay where you are when a screen redraws
   -------------------------------------------------------------------------
   After a mark is saved (attendance, assessment, My Day …) the screen draws
   itself again: it empties its box, then fills it. For that moment the page
   is short, so the browser jumped to the TOP, and stayed there.
   Now, when the same screen redraws, the scroll position is remembered, the
   screen's height is held while it is rebuilt (also while a part loads a
   moment later), and the view is put back exactly where it was.
   Choosing another screen from the menu still starts at the top.
   Loads LAST in teacher.html (after cg-summary.js), so it wraps the screens
   with every add-on already in place.
   ========================================================================= */
(function(){
  'use strict';
  const SCREENS = ['renderMonthlyAssessment', 'renderAttendanceBody', 'renderMyDay', 'renderMyClass', 'renderAdmissions',
    'renderFamilyParents', 'renderAssessmentDashboard', 'renderChildRecordReal', 'renderMaterials', 'renderClassroomState',
    'renderMonthlyEffective', 'renderParentInvolvement', 'renderAttendanceDashboard'];
  let navigating = false, depth = 0, holdTimer = null;
  const held = new Set();

  function visibleBodies(){                      // the screen boxes currently on show
    return [...document.querySelectorAll('[id$="-body"]')].filter(el => !el.classList.contains('hidden') && el.offsetParent !== null && el.offsetHeight > 0);
  }
  function hold(){                               // keep the page as tall as it is now while the screen is rebuilt
    visibleBodies().forEach(el => { if(!el.dataset.keepScrollHeld){ el.dataset.keepScrollHeld = el.style.minHeight || ' '; el.style.minHeight = el.offsetHeight + 'px'; held.add(el); } });
  }
  function release(){
    held.forEach(el => { const v = el.dataset.keepScrollHeld; el.style.minHeight = v.trim(); delete el.dataset.keepScrollHeld; });
    held.clear();
  }
  function wrap(name){
    let f; try { f = eval(name); } catch(e){ return; }
    if(typeof f !== 'function' || f.__keepScroll) return;
    const w = function(){
      if(navigating || depth > 0) return f.apply(this, arguments);   // menu change, or a screen drawn inside another: no restore
      const y = window.scrollY, x = window.scrollX;
      depth++;
      hold();
      let out;
      try { out = f.apply(this, arguments); } finally { depth--; }
      const back = () => { if(Math.abs(window.scrollY - y) > 2) window.scrollTo(x, y); };
      back(); requestAnimationFrame(back); setTimeout(back, 60);
      clearTimeout(holdTimer); holdTimer = setTimeout(() => { release(); }, 1500);   // parts that load a moment later
      return out;
    };
    w.__keepScroll = true;
    try { eval(name + ' = w'); } catch(e){}
  }
  SCREENS.forEach(wrap);

  // choosing another screen from the menu: start at the top, as before
  ['switchSidebarSection', 'switchSection'].forEach(name => {
    let f; try { f = eval(name); } catch(e){ return; }
    if(typeof f !== 'function' || f.__keepScroll) return;
    const w = function(){ navigating = true; release(); try { return f.apply(this, arguments); } finally { setTimeout(() => { navigating = false; }, 0); } };
    w.__keepScroll = true;
    try { eval(name + ' = w'); } catch(e){}
  });
})();
