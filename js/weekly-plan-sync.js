/* =========================================================================
   js/weekly-plan-sync.js — the weekly activity plans, as changed by the
   superadmin or a supervisor (activity-plans.html), applied on top of the
   plans in js/weeks/weekN.js
   -------------------------------------------------------------------------
   Loads backend/content/weekly_plan.php and changes WEEKLY_PLAN (the given
   activity of each week · day · area) and WEEK_DAY_TOPICS (each day's
   topic). My Day, the Insights coverage, the Activity record and its Excel
   all read those, so they follow the changes. A copy of the original plans
   is kept, so "back to the original" really brings the original back.
   Used by teacher.html and activity-plans.html. Load after the week files.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof WEEKLY_PLAN === 'undefined') return;
  const copy = o => JSON.parse(JSON.stringify(o || {}));
  const ORIGINAL = copy(WEEKLY_PLAN), ORIGINAL_TOPICS = typeof WEEK_DAY_TOPICS !== 'undefined' ? copy(WEEK_DAY_TOPICS) : {};
  // My Day shows the activity "as given": ACTIVITY_COMPETENCIES (the full text), else WEEKLY_PLAN (the short name)
  const HAS_AC = typeof ACTIVITY_COMPETENCIES !== 'undefined', ORIGINAL_AC = HAS_AC ? copy(ACTIVITY_COMPETENCIES) : {};
  window.WEEKLY_PLAN_ORIGINAL = ORIGINAL; window.WEEK_TOPICS_ORIGINAL = ORIGINAL_TOPICS;
  window.weeklyPlanChanges = [];
  const topicText = t => !t ? '' : typeof t === 'string' ? t : (t.link || t.value || '');
  window.weeklyPlanOriginal = (week, day, area) => area === '_topic' ? topicText((ORIGINAL_TOPICS['wk' + week] || {})[day])
    : ((((ORIGINAL_AC['wk' + week] || {})[area] || {})[day]) || (((ORIGINAL['wk' + week] || {})[area] || {})[day]) || '');
  // the text a teacher sees for an activity now (after any changes)
  window.weeklyPlanGiven = (week, day, area) => ((HAS_AC && ((ACTIVITY_COMPETENCIES['wk' + week] || {})[area] || {})[day]) || ((((typeof WEEKLY_PLAN !== 'undefined' && WEEKLY_PLAN['wk' + week]) || {})[area] || {})[day]) || '');

  window.applyWeeklyPlanChanges = function(list){
    // start again from the originals, so a change that was reset disappears
    Object.keys(WEEKLY_PLAN).forEach(k => { if(!(k in ORIGINAL)) delete WEEKLY_PLAN[k]; });
    Object.keys(ORIGINAL).forEach(k => { WEEKLY_PLAN[k] = copy(ORIGINAL[k]); });
    if(HAS_AC){
      Object.keys(ACTIVITY_COMPETENCIES).forEach(k => { if(!(k in ORIGINAL_AC)) delete ACTIVITY_COMPETENCIES[k]; });
      Object.keys(ORIGINAL_AC).forEach(k => { ACTIVITY_COMPETENCIES[k] = copy(ORIGINAL_AC[k]); });
    }
    if(typeof WEEK_DAY_TOPICS !== 'undefined'){
      Object.keys(WEEK_DAY_TOPICS).forEach(k => { if(!(k in ORIGINAL_TOPICS)) delete WEEK_DAY_TOPICS[k]; });
      Object.keys(ORIGINAL_TOPICS).forEach(k => { WEEK_DAY_TOPICS[k] = copy(ORIGINAL_TOPICS[k]); });
    }
    (list || []).forEach(c => {
      const wk = 'wk' + c.week;
      if(c.area === '_topic'){
        if(typeof WEEK_DAY_TOPICS === 'undefined') return;
        const day = (WEEK_DAY_TOPICS[wk] = WEEK_DAY_TOPICS[wk] || {});
        const t = day[c.day] && typeof day[c.day] === 'object' ? day[c.day] : {};
        t.value = c.text; t.link = c.text; day[c.day] = t;
      } else {
        const plan = (WEEKLY_PLAN[wk] = WEEKLY_PLAN[wk] || {});
        (plan[c.area] = plan[c.area] || {})[c.day] = c.text;
        if(HAS_AC){ const ac = (ACTIVITY_COMPETENCIES[wk] = ACTIVITY_COMPETENCIES[wk] || {}); (ac[c.area] = ac[c.area] || {})[c.day] = c.text; }   // the same text on My Day's cards and overview
      }
    });
    window.weeklyPlanChanges = list || [];
  };

  window.loadWeeklyPlanChanges = function(){
    return fetch('backend/content/weekly_plan.php' + window.location.search, { cache: 'no-store' })
      .then(r => r.json()).then(d => {
        if(d.status !== 'success') return d;
        window.applyWeeklyPlanChanges(d.changes);
        // My Day may already be on screen: draw it again with the changed plan
        try { const md = document.getElementById('myday-body'); if(md && !md.classList.contains('hidden') && md.children.length && typeof renderMyDay === 'function') renderMyDay(); } catch(e){}
        return d;
      }).catch(e => ({ status: 'error', message: String(e) }));
  };
  if(!window.__weeklyPlanNoAutoLoad) window.loadWeeklyPlanChanges();
})();