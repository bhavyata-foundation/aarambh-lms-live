/* =========================================================================
   js/child-feedback-db.js — Child Record feedback notes saved in the DATABASE
   -------------------------------------------------------------------------
   The teacher's feedback notes on each child (Assessment Dashboard → Child
   Record → Teacher's Feedback) were kept only in the browser. They are now
   saved in the database (class_records, kind "child_feedback", one record
   per child, keyed by the child's number so a corrected name keeps its notes), and notes that exist only in this browser are uploaded the
   first time the Child Record opens. Only this class's children are sent.
   Needs js/class-records.js (loaded earlier) and 'child_feedback' in
   backend/records/records_common.php → CLASS_RECORD_KINDS.
   ========================================================================= */
(function(){
  'use strict';
  if(typeof saveChildFeedbackEntries !== 'function' || typeof childFeedbackEntries === 'undefined' || typeof classRecordSave !== 'function') return;
  const KIND = 'child_feedback';
  const roll = () => (Array.isArray(realPupilsCache) ? realPupilsCache : []);
  let synced = false, lastName = null;

  // This class's notes only (the browser may hold other classes' notes too), keyed by the child's number.
  function classView(){ const v = {}; roll().forEach(p => { if(Array.isArray(childFeedbackEntries[p.name])) v[String(p.id)] = childFeedbackEntries[p.name]; }); return v; }

  function sync(){
    if(synced || !roll().length) return;
    synced = true;
    const v = classView();
    classRecordsSync(KIND, v, () => {
      roll().forEach(p => { if(String(p.id) in v) childFeedbackEntries[p.name] = Array.isArray(v[String(p.id)]) ? v[String(p.id)] : []; });
      try { localStorage.setItem('childFeedbackEntries', JSON.stringify(childFeedbackEntries)); } catch(e){}
      if(lastName && typeof renderChildRecord === 'function') renderChildRecord(lastName); // show what the database has
    });
  }

  // Every add / delete already calls saveChildFeedbackEntries → also save this class's notes to the database.
  const baseSave = saveChildFeedbackEntries;
  saveChildFeedbackEntries = function(){
    const r = baseSave.apply(this, arguments);
    roll().forEach(p => { if(childFeedbackEntries[p.name] !== undefined) classRecordSave(KIND, String(p.id), childFeedbackEntries[p.name] || []); });
    return r;
  };

  // Opening a child's record loads the notes from the database (once per page).
  const baseSection = renderChildFeedbackSection;
  renderChildFeedbackSection = function(container, name){ lastName = name; sync(); return baseSection.apply(this, arguments); };
})();
