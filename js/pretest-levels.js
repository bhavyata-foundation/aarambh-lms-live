/* =========================================================================
   js/pretest-levels.js — the Pre-Test that belongs to the logged-in class
   -------------------------------------------------------------------------
   Jr KG (Balvatika 2) and Sr KG (Balvatika 3) share the 6 classroom
   activities but have different 20 worksheet activities and CGs. The
   portal's list (WEEKLY_ASSESSMENT_ACTIVITIES, part 09) is the Jr KG one;
   for a Sr KG class it is swapped for the Sr KG list below, so the Pre-Test
   screen, its import, the CG totals and the dashboard all use the right
   activities. Pre-Test marks are kept per class, so a class always reads
   its own list.
   Sr KG list: from the S G Barve MPS Sr KG Pre-Test sheet (October 2026).
   Activity 1's CG is written there as "CG 1" — to be confirmed.
   Loads after the part files (teacher.html).
   ========================================================================= */
  var PRETEST_ACTIVITIES_JR = WEEKLY_ASSESSMENT_ACTIVITIES.map(a => Object.assign({}, a)); // as in part 09
  var PRETEST_ACTIVITIES_SR = [
    { type: 'Worksheet', activity: 'Circle the healthy food', cg: 'CG 1', page: '2' },
    { type: 'Worksheet', activity: 'Circle the dark colour', cg: 'CG 2.1', page: '2' },
    { type: 'Worksheet', activity: 'Look and remember', cg: 'CG 2.2', page: '4' },
    { type: 'Worksheet', activity: 'Circle loud sound', cg: 'CG 2.3', page: '4' },
    { type: 'Worksheet', activity: 'Circle things we taste', cg: 'CG 2.4', page: '4' },
    { type: 'Worksheet', activity: 'Circle hard objects', cg: 'CG 2.5', page: '3' },
    { type: 'Worksheet', activity: 'Circle the helpful actions', cg: 'CG 5.1', page: '4' },
    { type: 'Worksheet', activity: 'Match cause to effect', cg: 'CG 7.2', page: '1' },
    { type: 'Worksheet', activity: 'Arrange numbers from small to big', cg: 'CG 8.4', page: '3' },
    { type: 'Worksheet', activity: 'Match the number to the quantity', cg: 'CG 8.5', page: '2' },
    { type: 'Worksheet', activity: 'Circle the correct pictures', cg: 'CG 8.12', page: '2' },
    { type: 'Worksheet', activity: 'Circle the characters in the story', cg: 'CG 9.5', page: '3' },
    { type: 'Worksheet', activity: 'Name the pictures', cg: 'CG 9.7', page: '1' },
    { type: 'Worksheet', activity: 'Circle only letters', cg: 'CG 10.3', page: '4' },
    { type: 'Worksheet', activity: 'Read the word and point to the picture', cg: 'CG 10.4', page: '2' },
    { type: 'Worksheet', activity: 'Read and answer', cg: 'CG 10.5', page: '3' },
    { type: 'Worksheet', activity: 'Match the instructions', cg: 'CG 10.7', page: '1' },
    { type: 'Worksheet', activity: 'Match sound to the image', cg: 'CG 11.1', page: '1' },
    { type: 'Worksheet', activity: 'Circle the happy face', cg: 'CG 12.3', page: '1' },
    { type: 'Worksheet', activity: 'Tick good learning habits', cg: 'CG 13.2', page: '3' },
    { type: 'Classroom', activity: 'Move Safely Game', cg: 'CG 1.5', page: '—' },
    { type: 'Classroom', activity: 'Touch and Tell Bag', cg: 'CG 2.5', page: '—' },
    { type: 'Classroom', activity: 'Carry and Walk Task', cg: 'CG 3.4', page: '—' },
    { type: 'Classroom', activity: 'Take Turn Game', cg: 'CG 4.4', page: '—' },
    { type: 'Classroom', activity: 'Which Tool for What?', cg: 'CG 7.3', page: '—' },
    { type: 'Classroom', activity: 'Count and Give', cg: 'CG 8.3', page: '—' }
  ];
  var preTestLevelShown = 'Jr KG';

  // Use the list of the logged-in class (Sr KG → Sr KG list, otherwise Jr KG).
  function applyPreTestLevel(){
    const lvl = (typeof workbookLevelFromClassName === 'function') ? workbookLevelFromClassName() : 'Jr KG';
    const want = lvl === 'Sr KG' ? 'Sr KG' : 'Jr KG';
    if(want === preTestLevelShown) return;
    const list = want === 'Sr KG' ? PRETEST_ACTIVITIES_SR : PRETEST_ACTIVITIES_JR;
    WEEKLY_ASSESSMENT_ACTIVITIES.splice(0, WEEKLY_ASSESSMENT_ACTIVITIES.length, ...list.map(a => Object.assign({}, a)));
    preTestLevelShown = want;
    if(typeof preTestTallyLoadedFor !== 'undefined') preTestTallyLoadedFor = null; // recount with the right activities
  }

  // Every screen that uses the Pre-Test activities picks the right list first.
  ['renderMonthlyAssessment', 'renderAssessmentDashboard', 'computeCgTotals', 'assessSmartChoose', 'assessDownloadSheet'].forEach(name => {
    const base = window[name]; if(typeof base !== 'function') return;
    window[name] = function(){ applyPreTestLevel(); return base.apply(this, arguments); };
  });

  // Under the Pre-Test title: which class's Pre-Test this is.
  (function(){
    const base = window.renderMonthlyAssessment; if(typeof base !== 'function') return;
    window.renderMonthlyAssessment = function(targetEl){
      const out = base.apply(this, arguments);
      try {
        if(typeof assessmentEntryType !== 'undefined' && assessmentEntryType === 'pretest' && targetEl && !targetEl.querySelector('.pt-level')){
          const title = [...targetEl.querySelectorAll('h1,h2,h3,h4,div')].find(el => !el.children.length && el.textContent.trim() === 'Pre-Test') ||
                        [...targetEl.querySelectorAll('h1,h2,h3,h4')].find(el => /^\s*Pre-Test\b/.test(el.textContent) && !/Import|Add data/.test(el.textContent));
          if(title){
            const p = document.createElement('p'); p.className = 'cap pt-level'; p.style.cssText = 'margin:-6px 0 14px; display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px;';
            p.innerHTML = '<span>Pre-Test for <b>' + (preTestLevelShown === 'Sr KG' ? 'Sr KG (Balvatika 3)' : 'Jr KG (Balvatika 2)') + '</b> — the class you\u2019re logged in with' + (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_name ? ' (' + esc(myClassInfo.class_name) + ')' : '') + '.</span>';
            (title.closest('.sec, .md-sec, .sec-head') || title).insertAdjacentElement('afterend', p);
          }
        }
      } catch(e){}
      return out;
    };
  })();
