/* =========================================================================
   js/render/live-poll.js — a single shared timer that re-fetches whatever
   screen is currently open, every 20 seconds, so a change made on another
   device shows up here without a manual reload. Reuses the exact same
   render functions switchSidebarSection() already calls — this never
   duplicates rendering logic, it just re-triggers it on a timer.

   Each data loader used here needs to support a "force" argument that
   bypasses its own already-loaded cache (dailyPlanEntriesLoadedWeeks,
   studentHolidaysLoaded, familyRecordsLoaded, etc.) — without that, the
   loader would just see itself as "already loaded" and do nothing.
   ========================================================================= */

var LIVE_POLL_INTERVAL_MS = 20000;

// ---- Never redraw while the teacher is in the middle of something ----
// A redraw rebuilds the whole screen: a file chosen in a picker that was
// still open was lost, an import preview vanished, a name being edited was
// cancelled — so teachers had to click "Import a file" again and again
// (on phones the gallery/camera trip back even triggered an instant redraw).
// The refresh now waits until she is done, then carries on as before.
var livePollPickerUntil = 0;
(function watchFilePickers(){
  if(typeof HTMLInputElement === 'undefined') return;
  var baseClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function(){
    if(this.type === 'file'){
      livePollPickerUntil = Date.now() + 10 * 60 * 1000;            // the picker / camera is open
      var done = function(){ livePollPickerUntil = Date.now() + 3000; }; // a moment for the file to be read
      this.addEventListener('change', done, { once: true });
      this.addEventListener('cancel', done, { once: true });
    }
    return baseClick.apply(this, arguments);
  };
  document.addEventListener('click', function(e){
    var t = e.target; if(t && t.tagName === 'INPUT' && t.type === 'file') livePollPickerUntil = Date.now() + 10 * 60 * 1000;
  }, true);
})();
function livePollTeacherIsBusy(){
  if(Date.now() < livePollPickerUntil) return 'choosing a file';
  var a = document.activeElement;
  if(a && a !== document.body && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return 'typing';
  var showing = function(el){ return !!(el && el.offsetParent !== null && String(el.innerHTML || '').trim()); };
  if(typeof smartImport !== 'undefined' && smartImport && typeof siPanel === 'function' && showing(siPanel())) return 'an attendance / class-list import is open';
  if(typeof assessSmart !== 'undefined' && assessSmart && typeof assessPanel === 'function' && showing(assessPanel())) return 'an assessment import is open';
  if(typeof registerImportState !== 'undefined' && registerImportState && registerImportState.preview) return 'a register import is open';
  if(typeof editingPupilId !== 'undefined' && editingPupilId) return 'editing an admission';
  if(document.querySelector('[data-roll-editor], [data-si-edit], [data-roll-input]')) return 'editing a name';
  return '';
}

async function pollActiveSectionForUpdates(){
  // Don't poll while the tab is in the background — no point hitting
  // the server for a screen nobody's looking at right now.
  if(document.hidden) return;
  if(livePollTeacherIsBusy()) return; // try again next time — never pull the screen out from under her
  const section = currentActiveSection;
  const childName = currentActiveSectionChildName;

  try{
    if(section === 'myday'){
      if(typeof ensureDailyPlanEntriesLoaded === 'function') await ensureDailyPlanEntriesLoaded(true);
      if(typeof ensureStudentHolidaysLoaded === 'function') await ensureStudentHolidaysLoaded(true);
      if(document.getElementById('myday-body') && !document.getElementById('myday-body').classList.contains('hidden')) renderMyDay();
    } else if(section === 'myclass' || section === 'familyparents'){
      if(typeof ensureFamilyRecordsLoaded === 'function') await ensureFamilyRecordsLoaded(true);
      if(section === 'myclass' && document.getElementById('myclass-body') && !document.getElementById('myclass-body').classList.contains('hidden')) renderMyClass();
      if(section === 'familyparents' && document.getElementById('familyparents-body') && !document.getElementById('familyparents-body').classList.contains('hidden')) renderFamilyParents(childName);
    } else if(section === 'classattendance'){
      if(typeof fetchAttendanceMonth === 'function') await fetchAttendanceMonth(markAttYear, markAttMonth);
      // fetchAttendanceMonth already re-renders classattendance-body itself once it resolves
    } else if(section === 'attendancedashboard'){
      if(typeof fetchAttendanceMonth === 'function') await fetchAttendanceMonth(calendarYear, calendarMonth);
    }
    // Add further sections here the same way as real backend sync gets
    // built for them — one branch per section, calling that section's
    // own loader with force=true, then its own render function.
  } catch(err){ /* a failed poll just tries again next interval — never surfaces an error to the person */ }
}

setInterval(pollActiveSectionForUpdates, LIVE_POLL_INTERVAL_MS);

// Also refresh immediately the moment the tab regains focus — catches
// the common case (switched away, came back) without waiting up to 20s.
document.addEventListener('visibilitychange', () => {
  if(!document.hidden) pollActiveSectionForUpdates();
});