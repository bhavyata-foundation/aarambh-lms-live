// Assessment Dashboard tab state. Declared here (chrome.js loads early) so every script can read it
// before the dashboard scripts run. teacher.js is no longer loaded on the teacher page.
window.assessmentDashboardTab = window.assessmentDashboardTab || 'overview';
window.assessmentRecordsType = window.assessmentRecordsType || 'observation';

/* =========================================================================
   js/render/chrome.js — sidebar/topbar UI chrome and the main section
   router (switchSidebarSection). Pure rendering/navigation, no state
   of its own beyond a couple of open/closed menu toggles. Extracted
   from teacher.js's old SECTION 4.
   ========================================================================= */

var currentActiveSection = 'myday';
var currentActiveSectionChildName = undefined;
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarBackdrop').classList.toggle('show');
}

function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('show');
}

// Real browser Fullscreen API — this is the actual production app,
// not a preview widget, so requestFullscreen() works normally here.
function toggleCardFullscreen(cardId){
  const card = document.getElementById(cardId);
  if(!card) return;
  if(!document.fullscreenElement){
    card.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

// Keeps every fullscreen button's icon/label correct, whichever
// card is currently expanded (or none), including when a child
// exits via the Escape key rather than tapping the button again.
document.addEventListener('fullscreenchange', () => {
  document.querySelectorAll('.stage-card').forEach(card => {
    const btn = card.querySelector('.fullscreen-btn');
    if(!btn) return;
    const isThisCardFullscreen = document.fullscreenElement === card;
    btn.textContent = isThisCardFullscreen ? '⤢' : '⛶';
    btn.title = isThisCardFullscreen ? 'Exit full screen' : 'View full screen';
  });
});

function toggleUserMenu(){
  document.getElementById('userDropdown').classList.toggle('hidden');
}
function closeUserMenu(){
  document.getElementById('userDropdown').classList.add('hidden');
}
document.addEventListener('click', function(e){
  const menu = document.getElementById('userMenu');
  if(menu && !menu.contains(e.target)) closeUserMenu();
});

// WhatsApp-style attachment menu for session evidence uploads (Section
// 6, My Day). One menu can be open at a time; clicking its own toggle
// button or anywhere outside closes it — same convention as the user
// menu above, just scoped per domain key since every session card has
// its own menu instance.
function toggleEvidenceMenu(key){
  document.querySelectorAll('[id^="evidenceMenu-"]').forEach(m => {
    if(m.id !== 'evidenceMenu-' + key) m.classList.add('hidden');
  });
  const menu = document.getElementById('evidenceMenu-' + key);
  if(menu) menu.classList.toggle('hidden');
}
function closeEvidenceMenu(key){
  const menu = document.getElementById('evidenceMenu-' + key);
  if(menu) menu.classList.add('hidden');
}
document.addEventListener('click', function(e){
  document.querySelectorAll('[id^="evidenceMenu-"]:not(.hidden)').forEach(menu => {
    const key = menu.id.replace('evidenceMenu-', '');
    const btn = document.getElementById('evidenceAddBtn-' + key);
    if(!menu.contains(e.target) && e.target !== btn && !(btn && btn.contains(e.target))){
      menu.classList.add('hidden');
    }
  });
});

function todayKey(){ return new Date().toISOString().slice(0,10); }

const teacherMainTabs = document.getElementById('teacherMainTabs');

if(teacherMainTabs){
  teacherMainTabs.classList.toggle(
    'hidden',
    section !== 'myday' && section !== 'myclass'
  );
}


function switchSidebarSection(section, selectedChildName){
  currentActiveSection = section;
  currentActiveSectionChildName = selectedChildName;
  document.getElementById('navMyDay').classList.toggle('active', section === 'myday' || section === 'myclass' || section === 'aiassistance');
  document.getElementById('navFamilyParents').classList.toggle('active', section === 'familyparents' || section === 'ptm' || section === 'volunteers' || section === 'homework');
  document.getElementById('navMonthlyEffective').classList.toggle('active', section === 'monthlyeffective' || section === 'mycompliance' || section === 'flagsnotifications');
  document.getElementById('navAssessment').classList.toggle('active', section === 'assessment');
  document.getElementById('navAssessmentDashboard').classList.toggle('active', section === 'assessmentdashboard' || section === 'transition');
  document.getElementById('navParentInvolvement').classList.toggle('active', section === 'parentinvolvement');
  document.getElementById('navTeacherProfile').classList.toggle('active', section === 'teacherprofile');
  document.getElementById('navAttendanceDashboard').classList.toggle('active', section === 'attendancedashboard');
  document.getElementById('navClassAttendance').classList.toggle('active', section === 'classattendance');
  document.getElementById('navMaterials').classList.toggle('active', section === 'materials' || section === 'classroomstate' || section === 'digitalworkbooks');
  document.getElementById('sidebar-workbook-section').classList.toggle('hidden', section !== 'workbook');

  const labelEl = document.getElementById('pageLabel');
  if(labelEl){
    labelEl.textContent = section === 'myday' ? 'My Day'
      : section === 'myclass' ? 'My Class'
      : section === 'aiassistance' ? 'AI Assistance'
      : section === 'ptm' ? 'PTM Schedule & Agenda'
      : section === 'mycompliance' ? 'My Compliance'
      : section === 'flagsnotifications' ? 'Flags & Notifications'
      : section === 'teacherprofile' ? 'Teacher Profile'
      : section === 'familyparents' ? 'Family & Parents'
      : section === 'admissions' ? 'Admissions'
      : section === 'monthlyeffective' ? 'Monthly Effective'
      : section === 'assessment' ? 'Assessment'
      : section === 'childrecord' ? 'Child Record'
      : section === 'transition' ? 'Transition'
      : section === 'parentinvolvement' ? 'Parent Involvement'
      : section === 'attendancedashboard' ? 'Attendance Dashboard'
      : section === 'assessmentdashboard' ? 'Assessment Dashboard'
      : section === 'classattendance' ? 'Class Attendance'
      : section === 'calendar' ? 'My Attendance'
      : section === 'materials' ? 'TLM & Resources'
      : section === 'classroomstate' ? 'Classroom State'
      : section === 'volunteers' ? 'Parent Volunteers'
      : section === 'homework' ? 'Homework'
      : 'My Day';
  }

  document.getElementById('week-body').classList.add('hidden');
  document.getElementById('classattendance-body').classList.add('hidden');
  document.getElementById('attendance-body').classList.add('hidden');
  document.getElementById('calendar-body').classList.add('hidden');
  document.getElementById('myday-body').classList.add('hidden');
  document.getElementById('myclass-body').classList.add('hidden');
  document.getElementById('aiassistance-body').classList.add('hidden');
  document.getElementById('ptm-body').classList.add('hidden');
  document.getElementById('ptm-extras-body').classList.add('hidden');
  document.getElementById('ptm-tabbar-body').classList.add('hidden');
  document.getElementById('mycompliance-body').classList.add('hidden');
  document.getElementById('flagsnotifications-body').classList.add('hidden');
  document.getElementById('teacherprofile-body').classList.add('hidden');
  document.getElementById('familyparents-body').classList.add('hidden');
  document.getElementById('admissions-body').classList.add('hidden');
  document.getElementById('monthlyeffective-body').classList.add('hidden');
  document.getElementById('monthlyassessment-body').classList.add('hidden');
  document.getElementById('assessment-body').classList.add('hidden');
  document.getElementById('childrecord-body').classList.add('hidden');
  document.getElementById('parentinvolvement-body').classList.add('hidden');
  document.getElementById('compliancecal-body').classList.add('hidden');
  document.getElementById('attendancedashboard-body').classList.add('hidden');
  document.getElementById('assessmentdashboard-body').classList.add('hidden');
  document.getElementById('materials-body').classList.add('hidden');
  document.getElementById('classroomstate-body').classList.add('hidden');
  document.getElementById('volunteers-body').classList.add('hidden');
  document.getElementById('homework-body').classList.add('hidden');
  document.getElementById('today-overview').classList.add('hidden');
  document.querySelector('.stat-grid').classList.add('hidden');
  document.querySelector('.banner-success').classList.add('hidden');

  if(section === 'classattendance'){
    document.getElementById('classattendance-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Mark today\'s attendance, or review admissions';
    renderClassAttendanceSection();
  } else if(section === 'calendar'){
    document.getElementById('calendar-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'My Attendance';
    renderAttendanceCalendar(calendarYear, calendarMonth);
  } else if(section === 'assessment'){
    // Grade ENTRY only — Weekly/Monthly/Classroom Observation forms,
    // import, and PDF download. Deliberately separate from Reports
    // > Assessment Dashboard, which is analysis/trends only and has
    // no entry UI of its own anymore.
    document.getElementById('assessment-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Enter grades — weekly, monthly, or classroom observation';
    renderMonthlyAssessment(document.getElementById('assessment-body'));
  } else if(section === 'myclass'){
    document.getElementById('myclass-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'The whole class, one row each';
    renderMyClass();
  } else if(section === 'aiassistance'){
    document.getElementById('aiassistance-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Suggested activities and planning advisories — rule-based, not a live model';
    renderAIAssistance();
  } else if(section === 'myday'){
    document.getElementById('myday-body').classList.remove('hidden');
    document.getElementById('myclass-body').classList.add('hidden');
    document.getElementById('week-subheading').textContent = 'Today\'s sessions, attendance, and materials at a glance';
    } else if(section === 'myclass'){
  document.getElementById('myclass-body').classList.remove('hidden');

  document.getElementById('week-subheading').textContent =
    'Information, attendance, and progress for your class';

  renderMyClass();
    renderMyDay();
  } else if(section === 'ptm'){
    document.getElementById('ptm-body').classList.remove('hidden');
    document.getElementById('ptm-extras-body').classList.remove('hidden');
    document.getElementById('ptm-tabbar-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'When is the meeting, what is on the agenda, and am I ready for it?';
    renderTeacherPTM();
  } else if(section === 'mycompliance'){
    document.getElementById('mycompliance-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Your own SOP compliance, rolled up';
    renderMyCompliance();
  } else if(section === 'flagsnotifications'){
    document.getElementById('flagsnotifications-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'What has been noted, what needs a reply, and what has gone further up';
    renderFlagsNotifications();
  } else if(section === 'teacherprofile'){
    document.getElementById('teacherprofile-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Your qualifications, contact details, and training record';
    renderTeacherProfile();
  } else if(section === 'familyparents'){
    document.getElementById('familyparents-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Who to call for each child';
    renderFamilyParents(selectedChildName);
  } else if(section === 'monthlyeffective'){
    document.getElementById('monthlyeffective-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'The monthly return: what it says, and have you signed it?';
    renderMonthlyEffective();
  } else if(section === 'childrecord'){
    document.getElementById('childrecord-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'One child\'s full picture in one place';
    renderChildRecord(selectedChildName);
  } else if(section === 'transition'){
    // Folded into Assessment Dashboard as a tab — route there instead
    // of a standalone screen, opened directly on the Transition tab.
    assessmentDashboardTab = 'transition';
    document.getElementById('assessmentdashboard-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Where the class stands, domain by domain';
    renderAssessmentDashboard();
  } else if(section === 'parentinvolvement'){
    document.getElementById('parentinvolvement-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Who\'s involved, who could be, and whether it shows in the numbers';
    renderParentInvolvement();
  } else if(section === 'attendancedashboard'){
    document.getElementById('attendancedashboard-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Roll, attendance and effective strength, month by month';
    renderAttendanceDashboard();
  } else if(section === 'assessmentdashboard'){
    document.getElementById('assessmentdashboard-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Where the class stands, domain by domain';
    renderAssessmentDashboard();
  } else if(section === 'materials'){
    document.getElementById('materials-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Items received from BMC, and whether they\'ve reached your class';
    materialsTab = 'materials';
    renderMaterials();
  } else if(section === 'classroomstate'){
    // Folded into TLM & Resources as a tab — route there instead of
    // a standalone screen, opened directly on the Classroom State tab.
    document.getElementById('materials-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Items received from BMC, and whether they\'ve reached your class';
    materialsTab = 'classroomstate';
    renderMaterials();
  } else if(section === 'digitalworkbooks'){
    document.getElementById('materials-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Items received from BMC, and whether they\'ve reached your class';
    materialsTab = 'workbooks';
    renderMaterials();
  } else if(section === 'volunteers'){
    document.getElementById('volunteers-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'Parents interested in helping out as co-educators in your class';
    renderParentVolunteers();
  } else if(section === 'homework'){
    document.getElementById('homework-body').classList.remove('hidden');
    document.getElementById('week-subheading').textContent = 'One assignment for the whole class';
    renderHomework();
  } else {
    document.getElementById('week-body').classList.remove('hidden');
    document.getElementById('today-overview').classList.remove('hidden');
    document.querySelector('.stat-grid').classList.remove('hidden');
    document.querySelector('.banner-success').classList.remove('hidden');
    openWeek(currentWeekNum);
  }
  closeSidebar();
}

function switchTeacherMainTab(tab){

  const myDayBody = document.getElementById('myday-body');
  const myClassBody = document.getElementById('myclass-body');

  const myDayTab = document.getElementById('teacherTabMyDay');
  const myClassTab = document.getElementById('teacherTabMyClass');

  const tabs = document.getElementById('teacherMainTabs');

  if(!myDayBody || !myClassBody) return;

  /* Always hide both first */
  myDayBody.classList.add('hidden');
  myClassBody.classList.add('hidden');

  /* Reset tab styling */
  if(myDayTab) myDayTab.classList.remove('active');
  if(myClassTab) myClassTab.classList.remove('active');

  /* -------------------------
     MY CLASS
     ------------------------- */

  if(tab === 'myclass'){

    myClassBody.classList.remove('hidden');

    if(myClassTab){
      myClassTab.classList.add('active');
    }

    const pageLabel = document.getElementById('pageLabel');

    if(pageLabel){
      pageLabel.textContent = 'My Class';
    }

    const subheading = document.getElementById('week-subheading');

    if(subheading){
      subheading.textContent =
        'Information, attendance, and progress for your class';
    }

    /* My Day dashboard-only elements */
    const overview = document.getElementById('today-overview');
    const stats = document.querySelector('.stat-grid');
    const banner = document.querySelector('.banner-success');

    if(overview) overview.classList.add('hidden');
    if(stats) stats.classList.add('hidden');
    if(banner) banner.classList.add('hidden');

    renderMyClass();

  }

  /* -------------------------
     MY DAY
     ------------------------- */

  else {

    myDayBody.classList.remove('hidden');

    if(myDayTab){
      myDayTab.classList.add('active');
    }

    const pageLabel = document.getElementById('pageLabel');

    if(pageLabel){
      pageLabel.textContent = 'My Day';
    }

    const subheading = document.getElementById('week-subheading');

    if(subheading){
      subheading.textContent =
        "Today's sessions, attendance, and materials at a glance";
    }

    const overview = document.getElementById('today-overview');
    const stats = document.querySelector('.stat-grid');
    const banner = document.querySelector('.banner-success');

    if(overview) overview.classList.remove('hidden');
    if(stats) stats.classList.remove('hidden');
    if(banner) banner.classList.remove('hidden');

    renderMyDay();

  }

  closeSidebar();
}