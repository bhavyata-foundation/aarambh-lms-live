/* =========================================================================
   js/teacher-start.js — starts the teacher screen.
   Load it LAST in teacher.html, after every teacher-part script.
   It checks the login, then shows the dashboard for that teacher.
   ========================================================================= */
(function startTeacherScreen(){
  fetch('backend/auth/session_check.php' + window.location.search)
    .then(r => r.json())
    .then(data => {
      if(data.status !== 'logged_in' || data.role !== 'teacher'){
        window.location.href = 'index.html';
        return;
      }
      enterTeacherFlow();
      if(typeof renderPreviewBanner === 'function') renderPreviewBanner(data.is_previewing);
      if(typeof applyRealTeacherName === 'function') applyRealTeacherName(data.name, data.email);
      if(typeof updateTopbarSchoolLine === 'function') updateTopbarSchoolLine();
      if(typeof loadMyClassInfo === 'function') loadMyClassInfo();
    })
    .catch(() => { window.location.href = 'index.html'; });
})();