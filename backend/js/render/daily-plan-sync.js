/* =========================================================================
   js/render/daily-plan-sync.js — connects dailyPlanEntries/
   sessionDoneEntries (myday-planning.js) to the REAL backend
   (backend/daily_plan/save_daily_plan.php, get_daily_plan.php) —
   the actual weeks/domain_activities/teacher_daily_plans/
   domain_completion schema, confirmed working (it's what Teachers
   Performance on the supervisor side already reads from).

   A previous version of this file connected to a save_daily_plan_entry.php
   that never matched this real schema — this replaces it entirely.

   Same "optimistic local write, sync in the background" pattern as
   teacher attendance: local state (already saved to localStorage by
   myday-planning.js's own functions) stays authoritative immediately;
   these sync calls are fire-and-forget so typing never feels laggy.
   ========================================================================= */

var dailyPlanEntriesFetchStatus = 'idle'; // 'idle' | 'loading' | 'loaded' | 'error'

// save_daily_plan.php's real contract: class_id, week_number, domain_key,
// day, plan_text, materials, used_suggestion, and an OPTIONAL completed
// field — only include `completed` when explicitly changing done-state,
// since including it (even as false) writes/deletes a domain_completion
// row, which savePlanText/addMaterialChip/removeMaterialChip shouldn't
// trigger on their own.
async function syncDailyPlanEntryToServer(week, dayKey, domainKey, completedValue, coveredDate){
  if(!myClassInfo.class_id) return; // still loading — nothing to sync against yet
  const key = dailyPlanKey(week, dayKey, domainKey);
  const entry = dailyPlanEntries[key] || { text: '', materials: [], usedSuggestion: false };

  const body = {
    class_id: myClassInfo.class_id,
    week_number: week,
    domain_key: domainKey,
    day: dayKey,
    plan_text: entry.text,
    materials: entry.materials,
    used_suggestion: entry.usedSuggestion
  };
  if(completedValue !== undefined) body.completed = completedValue;
  if(coveredDate) body.covered_date = coveredDate;

  try{
    await fetch('backend/daily_plan/save_daily_plan.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
  } catch(err){ /* offline — the local copy already saved by myday-planning.js stays authoritative until this succeeds later */ }
}

// resetTodaysPlans clears a day's plans entirely — matches that by
// sending an empty plan_text/materials and completed:false, rather
// than a separate delete endpoint (none exists for this table).
async function deleteDailyPlanEntryFromServer(week, dayKey, domainKey){
  if(!myClassInfo.class_id) return;
  try{
    await fetch('backend/daily_plan/save_daily_plan.php' + window.location.search, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        class_id: myClassInfo.class_id, week_number: week, domain_key: domainKey, day: dayKey,
        plan_text: '', materials: [], used_suggestion: false, completed: false
      })
    });
  } catch(err){ /* offline — nothing further to do; the local delete already happened */ }
}

// Fetches this week's real plan (get_daily_plan.php) and merges it
// into dailyPlanEntries/sessionDoneEntries — same reconciliation idea
// as fetchTeacherAttendanceMonth: the server is the real record, but
// local optimistic state shouldn't be thrown away while this is in flight.
// Re-fetches whenever the viewed week changes (keyed by week number),
// not just once per session, since My Day lets a teacher switch weeks.
var dailyPlanEntriesLoadedWeeks = {}; // week_number -> true, once successfully loaded
async function ensureDailyPlanEntriesLoaded(force, weekOverride){
  // weekOverride lets a caller fetch a SPECIFIC week's plans (e.g. Monthly
  // Effective needing every week that falls in a given month) rather than
  // only ever the week currently being viewed in My Day — without this,
  // "Daily activities" for a month whose weeks were never opened in My Day
  // always read as near-zero, even when real plans exist in the database.
  const week = weekOverride !== undefined ? weekOverride : currentWeekNum;
  if(dailyPlanEntriesLoadedWeeks[week] && !force) return;
  if(!myClassInfo.class_id) return; // class info not ready yet — try again once loadMyClassInfo resolves and re-renders My Day
  dailyPlanEntriesFetchStatus = 'loading';
  try{
    const params = new URLSearchParams(window.location.search);
    params.set('class_id', myClassInfo.class_id);
    params.set('week_number', week);
    const res = await fetch('backend/daily_plan/get_daily_plan.php?' + params.toString());
    const data = await res.json();
    if(data.status === 'success'){
            const masterActivities = data.master_activities || {};
      const plans = data.plans || {};
      const completion = data.completion || {};
      // Union of keys from BOTH master_activities and plans — a
      // week with no authored master activities yet (master_activities
      // empty, e.g. week 14) must still merge in whatever the teacher
      // has actually typed and saved, from plans. Only relying on
      // master_activities' keys silently dropped real saved plans
      // whenever a week had no foundation activities authored for it.
      const allDayDomainKeys = new Set([
        ...Object.keys(masterActivities),
        ...Object.keys(plans)
      ]);
      allDayDomainKeys.forEach(dayDomainKey => {
        const [dayKey, domainKey] = dayDomainKey.split('-');
        const key = dailyPlanKey(week, dayKey, domainKey);
        const plan = plans[dayDomainKey];
        // Overwrite from the server unless the LOCAL copy actually has
        // real content — a key merely existing (even a blank leftover
        // from testing before this real backend existed) isn't worth
        // protecting. Only a local entry with real text or materials
        // in it is treated as "might be newer than the server, don't
        // clobber it."
        const local = dailyPlanEntries[key];
        const localHasRealContent = local && (
          (local.text && local.text.trim()) ||
          (local.materials && local.materials.length)
        );
        if(!localHasRealContent && plan){
          dailyPlanEntries[key] = { text: plan.plan_text || '', materials: plan.materials || [], usedSuggestion: plan.used_suggestion };
        }
        // Same idea for session-done: an explicit local false left
        // over from earlier testing shouldn't block the server's real
        // completed:true — only trust local when it's true (can't be
        // accidentally stale in the "blocking new data" direction).
        if(!sessionDoneEntries[key]){
          sessionDoneEntries[key] = !!(completion[dayDomainKey] && completion[dayDomainKey].completed);
        }
        if(!coveredDateEntries[key] && completion[dayDomainKey] && completion[dayDomainKey].covered_date){
          coveredDateEntries[key] = completion[dayDomainKey].covered_date;
        }
      });
            // ---- Session evidence (photo metadata) ----
      try{
        const evParams = new URLSearchParams(window.location.search);
        evParams.set('class_id', myClassInfo.class_id);
        evParams.set('week_number', week);
        const evRes = await fetch('backend/daily_plan/get_session_evidence.php?' + evParams.toString());
        const evData = await evRes.json();
        if(evData.status === 'success'){
          Object.keys(evData.evidence).forEach(dayDomainKey => {
            const [dayKey, domainKey] = dayDomainKey.split('-');
            const evKey = evidenceKey(week, dayKey, domainKey);
            const serverList = evData.evidence[dayDomainKey].map(e => ({
              name: e.name, size: e.size, type: e.type, uploadedAt: e.uploadedAt,
              driveLink: e.driveLink, driveFileId: e.driveFileId, evidenceId: e.id
            }));
            // Merge by driveFileId so a record already added locally
            // (e.g. just uploaded on this device, before this fetch
            // ran) isn't duplicated — only server records not already
            // present locally get appended.
            if(!uploadedEvidenceRecords[evKey]) uploadedEvidenceRecords[evKey] = [];
            const localIds = new Set(uploadedEvidenceRecords[evKey].map(e => e.driveFileId));
            serverList.forEach(e => { if(!localIds.has(e.driveFileId)) uploadedEvidenceRecords[evKey].push(e); });
          });
          saveUploadedEvidenceRecords();
        }
      } catch(err){ /* offline — local evidence stays as-is */ }
            dailyPlanEntriesLoadedWeeks[week] = true;
      dailyPlanEntriesFetchStatus = 'loaded';
      if(week === currentWeekNum && typeof renderMyDay === 'function' && document.getElementById('myday-body') && !document.getElementById('myday-body').classList.contains('hidden')){
        renderMyDay(); // reflect anything that just arrived from the server
      }
      if(typeof renderMonthlyEffective === 'function' && document.getElementById('monthlyeffective-body') && !document.getElementById('monthlyeffective-body').classList.contains('hidden')){
        renderMonthlyEffective(); // a background-loaded week's plans just arrived — refresh Daily activities with real data
      }
    } else {
      dailyPlanEntriesFetchStatus = 'error';
    }
  } catch(err){
    dailyPlanEntriesFetchStatus = 'error'; // offline — local/localStorage data already loaded stays as-is
  }
}


