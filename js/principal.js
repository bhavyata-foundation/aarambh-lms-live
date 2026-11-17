/* =========================================================================
   PRINCIPAL.JS — Principal role: teacher leave approvals (rendered by
   js/leave-approvals.js into #leaveApprovalsBox) and the school's PTM
   calendar (rendered by js/ptm-view.js into #ptm-body).
   ========================================================================= */

/* ---- Backend path fix for THIS page ----
   teacher.js carries the full old-path → new-folder shim, but this page
   doesn't load teacher.js. ptm-view.js still calls some old flat paths
   (e.g. backend/get_events.php), so the ones this page actually uses
   are redirected here to their real folders. */
(function setupPrincipalBackendPaths(){
  const PATH_MAP = {
    'backend/session_check.php':       'backend/auth/session_check.php',
    'backend/logout.php':              'backend/auth/logout.php',
    'backend/return_to_admin.php':     'backend/auth/return_to_admin.php',
    'backend/get_my_school.php':       'backend/schools/get_my_school.php',
    'backend/get_events.php':          'backend/events/get_events.php',
    'backend/add_event.php':           'backend/events/add_event.php',
    'backend/get_ptm_meeting.php':     'backend/ptm/get_ptm_meeting.php',
    'backend/save_ptm_meeting.php':    'backend/ptm/save_ptm_meeting.php',
    'backend/respond_to_training.php': 'backend/ptm/respond_to_training.php'
  };
  function fixPath(url){
    if(typeof url !== 'string') return url;
    for(const oldPath in PATH_MAP){
      if(url === oldPath || url.startsWith(oldPath + '?')) return PATH_MAP[oldPath] + url.slice(oldPath.length);
    }
    return url;
  }
  const originalFetch = window.fetch.bind(window);
  window.fetch = function(input, init){
    return originalFetch(typeof input === 'string' ? fixPath(input) : input, init);
  };
})();

function toggleUserMenu(){
  document.getElementById('userDropdown').classList.toggle('hidden');
}
document.addEventListener('click', function(e){
  const menu = document.getElementById('userMenu');
  if(menu && !menu.contains(e.target)) document.getElementById('userDropdown').classList.add('hidden');
});

fetch('backend/auth/session_check.php' + window.location.search)
  .then(r => r.json())
  .then(data => {
    if(data.status !== 'logged_in' || data.role !== 'principal'){
      window.location.href = 'index.html';
      return;
    }
    document.getElementById('principalName').textContent = data.name;
    const avatar = document.querySelector('.user-avatar');
    if(avatar && data.name){
      const initials = data.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
      if(initials) avatar.textContent = initials;
    }
    loadPrincipalSchoolAndRenderPTM();
  })
  .catch(() => { window.location.href = 'index.html'; });

async function loadPrincipalSchoolAndRenderPTM(){
  try{
    const res = await fetch('backend/schools/get_my_school.php' + window.location.search);
    const data = await res.json();
    if(data.status !== 'success' || !data.school){
      const msg = '<p class="sub">Your account isn\'t linked to a school yet — ask your superadmin to link it.</p>';
      document.getElementById('ptm-body').innerHTML = msg;
      // Leave requests are matched to the principal through her school,
      // so say so here too rather than showing an empty "nothing waiting".
      const leaveBox = document.getElementById('leaveApprovalsBox');
      if(leaveBox) leaveBox.innerHTML = '<h3 style="margin:0 0 6px;">Leave requests to review</h3>' + msg;
      return;
    }
    document.getElementById('principalSchoolName').textContent = data.school.name;
    renderPTMView('ptm-body', {
      schoolId: data.school.id,
      classId: null, // whole-school PTM — a principal oversees the school, not one class
      role: 'principal',
      canSchedule: false,
      canToggleTeacherPrep: false,
      canToggleSupervisorPrep: false,
      querySuffix: window.location.search
    });
  } catch(err){
    document.getElementById('ptm-body').innerHTML = '<p class="sub">Could not reach the server.</p>';
  }
}