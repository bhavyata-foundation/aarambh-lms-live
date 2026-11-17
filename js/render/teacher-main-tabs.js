/* =========================================================
   TEACHER MAIN TABS
   My Day ↔ My Class

   This file is intentionally separate from teacher-part-01..13.
   It controls only the two top-level teacher dashboard tabs.
   ========================================================= */

(function () {

  function setTeacherMainTabActive(tab) {
    const myDayTab = document.getElementById('teacherTabMyDay');
    const myClassTab = document.getElementById('teacherTabMyClass');

    if (myDayTab) {
      myDayTab.classList.toggle('active', tab === 'myday');
    }

    if (myClassTab) {
      myClassTab.classList.toggle('active', tab === 'myclass');
    }
  }


  function hideTeacherMainBodies() {
    const myDayBody = document.getElementById('myday-body');
    const myClassBody = document.getElementById('myclass-body');

    if (myDayBody) {
      myDayBody.classList.add('hidden');
    }

    if (myClassBody) {
      myClassBody.classList.add('hidden');
    }
  }


  function switchTeacherMainTab(tab) {

    const myDayBody = document.getElementById('myday-body');
    const myClassBody = document.getElementById('myclass-body');

    if (!myDayBody || !myClassBody) {
      console.warn(
        'Teacher main tabs: myday-body or myclass-body was not found.'
      );
      return;
    }

    /* -----------------------------------------------------
       Always hide both first.
       ----------------------------------------------------- */

    hideTeacherMainBodies();


    /* -----------------------------------------------------
       MY CLASS
       ----------------------------------------------------- */

    if (tab === 'myclass') {

      myClassBody.classList.remove('hidden');

      setTeacherMainTabActive('myclass');

      const pageLabel = document.getElementById('pageLabel');

      if (pageLabel) {
        pageLabel.textContent = 'My Class';
      }

      /*
       * renderMyClass() already exists in
       * js/teacher/teacher-part-03.js.
       *
       * Do not recreate My Class here.
       */

      if (typeof renderMyClass === 'function') {
        renderMyClass();
      } else {
        console.warn(
          'Teacher main tabs: renderMyClass() is not available yet.'
        );
      }

    }


    /* -----------------------------------------------------
       MY DAY
       ----------------------------------------------------- */

    else {

      myDayBody.classList.remove('hidden');

      setTeacherMainTabActive('myday');

      const pageLabel = document.getElementById('pageLabel');

      if (pageLabel) {
        pageLabel.textContent = 'My Day';
      }

      /*
       * renderMyDay() already lives in
       * js/render/myday.js.
       *
       * Do not recreate My Day here.
       */

      if (typeof renderMyDay === 'function') {
        renderMyDay();
      } else {
        console.warn(
          'Teacher main tabs: renderMyDay() is not available yet.'
        );
      }
    }


    /* -----------------------------------------------------
       Close mobile sidebar if available.
       ----------------------------------------------------- */

    if (typeof closeSidebar === 'function') {
      closeSidebar();
    }
  }


  /*
   * Make the function available to the inline onclick=""
   * handlers already present in teacher.html.
   *
   * Example:
   * onclick="switchTeacherMainTab('myday')"
   */

  window.switchTeacherMainTab = switchTeacherMainTab;


  /*
   * Keep the existing initial HTML state:
   * My Day active, My Class hidden.
   */

  function initialiseTeacherMainTabs() {

    const myDayBody = document.getElementById('myday-body');
    const myClassBody = document.getElementById('myclass-body');

    if (!myDayBody || !myClassBody) {
      return;
    }

    setTeacherMainTabActive('myday');

    myDayBody.classList.remove('hidden');
    myClassBody.classList.add('hidden');
  }


  /*
   * The script is loaded with defer, so DOM is available by the
   * time this executes in teacher.html.
   */

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initialiseTeacherMainTabs,
      { once: true }
    );
  } else {
    initialiseTeacherMainTabs();
  }

})();