/* =========================================================================
   js/supervisor/visit-context.js — the ONE shared concept of "which
   visit am I currently working on." Visit Checklist's sidebar list
   (demo names — Mrs. Sharma, Mrs. Iyer, etc.) and My Schools' real
   ward data (real names — Rukhsar Shaikh, Rashida Khatoon, etc.) are
   two genuinely separate datasets in this app; this file is what lets
   either one set the "current visit" without pretending they're
   secretly the same list. Visit Cover, the Weekly checklist, and the
   Visit Calendar all read from currentVisit rather than reaching into
   TEACHERS or MY_SCHOOLS directly.

   Load this AFTER checklist.js (needs TEACHERS) and BEFORE schools-
   events.js/visit-cover.js/visit-calendar.js (they call setCurrentVisit
   and read currentVisit).
   ========================================================================= */

var currentVisit = { teacherName: '', className: '', schoolName: '', ward: '' };

function setCurrentVisit(teacherName, className, schoolName, ward){
  currentVisit = { teacherName, className, schoolName: schoolName || '', ward: ward || '' };
  const nameEl = document.getElementById('activeTeacherName');
  if(nameEl) nameEl.textContent = teacherName + (className ? ' — ' + className : '');
  if(typeof renderVisitCover === 'function') renderVisitCover();
  if(typeof renderAttendanceVerification === 'function') renderAttendanceVerification();
  if(typeof renderParentFeedback === 'function') renderParentFeedback();
  if(typeof renderHmDiscussion === 'function') renderHmDiscussion();
  if(typeof renderActionPlan === 'function') renderActionPlan();
  if(typeof renderScoreSummary === 'function') renderScoreSummary();
  if(typeof updateNotificationBell === 'function') updateNotificationBell();
}

// Starting point on page load — the first demo teacher in the sidebar,
// same default the app already had before this file existed.
if(typeof TEACHERS !== 'undefined' && TEACHERS.length){
  currentVisit = { teacherName: TEACHERS[0].name, className: TEACHERS[0].cls, schoolName: '', ward: '' };
}