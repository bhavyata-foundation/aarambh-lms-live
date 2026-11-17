/* =========================================================================
   js/content-sync.js — the activities, as the superadmin set them
   -------------------------------------------------------------------------
   The superadmin changes activities in the superadmin portal (Content &
   Activities). This file makes the teacher dashboard use them, immediately:

   PRE-TEST  the Jr KG and Sr KG lists are loaded from the server
             (backend/content/get_pretest_activities.php) into the lists the
             portal already uses (PRETEST_ACTIVITIES_JR / _SR, pretest-levels.js),
             so the Pre-Test screen, its import, the download sheet, the CG
             summary and the dashboard all follow them.
             An activity keeps its NUMBER for good (marks are saved under it):
             a RETIRED one stays in the list but is left out of new entry,
             the import and the download sheet; new ones come at the end.
   OBSERVATION  themes and competencies come from the server already; retired
             ones are left out there (get_observation_themes.php).

   If the server can't be reached, the lists built into the portal are used.
   Loads after pretest-levels.js and the part files (teacher.html).
   ========================================================================= */
(function(){
  'use strict';
  if(typeof PRETEST_ACTIVITIES_JR === 'undefined' || typeof PRETEST_ACTIVITIES_SR === 'undefined') return;
  window.contentPretestLoaded = false;

  const isRetired = i => !!((typeof WEEKLY_ASSESSMENT_ACTIVITIES !== 'undefined' && WEEKLY_ASSESSMENT_ACTIVITIES[i]) || {}).retired;
  window.preTestRetired = isRetired;

  function apply(levels){
    const fill = (target, rows) => {
      if(!Array.isArray(rows) || !rows.length) return;
      const byPos = []; rows.forEach(r => { byPos[r.position - 1] = { type: r.type, activity: r.activity, cg: r.cg, page: r.page || '—', retired: !!r.retired }; });
      for(let i = 0; i < byPos.length; i++) if(!byPos[i]) byPos[i] = { type: 'Worksheet', activity: '(not in use)', cg: '', page: '—', retired: true }; // a gap never shifts the numbers
      target.splice(0, target.length, ...byPos);
    };
    fill(PRETEST_ACTIVITIES_JR, levels['Jr KG']); fill(PRETEST_ACTIVITIES_SR, levels['Sr KG']);
    if(typeof preTestLevelShown !== 'undefined') preTestLevelShown = '';   // the next screen re-applies the class's list
    if(typeof preTestTallyLoadedFor !== 'undefined') preTestTallyLoadedFor = null;
    window.contentPretestLoaded = true;
    // the Assessment screen is open: draw it again with the new list
    try { const t = typeof monthlyAssessmentTargetEl !== 'undefined' ? monthlyAssessmentTargetEl : null;
      if(t && t.isConnected && typeof renderMonthlyAssessment === 'function') renderMonthlyAssessment(t); } catch(e){}
  }
  function load(){
    fetch('backend/content/get_pretest_activities.php' + window.location.search, { cache: 'no-store' })
      .then(r => r.json()).then(d => { if(d && d.status === 'success' && d.levels) apply(d.levels); })
      .catch(() => { /* the portal's own lists stay */ });
  }
  load();
  window.reloadContent = load; // e.g. after a superadmin edit in the same browser

  // ---- retired Pre-Test activities: not in the import's columns ----
  if(typeof assessTargets === 'function'){
    const baseTargets = assessTargets;
    assessTargets = function(type){
      const out = baseTargets.apply(this, arguments);
      return type === 'pretest' && Array.isArray(out) ? out.filter(t => !isRetired(+t.key - 1)) : out;
    };
  }
  // ---- …and not offered in the Add data activity picker ----
  if(typeof renderMonthlyAssessment === 'function'){
    const baseRender = renderMonthlyAssessment;
    renderMonthlyAssessment = function(){
      const out = baseRender.apply(this, arguments);
      try {
        if(typeof assessmentEntryType !== 'undefined' && assessmentEntryType === 'pretest'){
          const sel = document.getElementById('preTestActivitySelect');
          if(sel){
            [...sel.options].forEach(o => { if(isRetired(+o.value)) o.remove(); });
            if(isRetired(typeof preTestSelectedActivityIdx !== 'undefined' ? preTestSelectedActivityIdx : -1) && sel.options.length){
              preTestSelectedActivityIdx = +sel.options[0].value; return renderMonthlyAssessment.apply(this, arguments);
            }
          }
        }
      } catch(e){}
      return out;
    };
  }
})();
