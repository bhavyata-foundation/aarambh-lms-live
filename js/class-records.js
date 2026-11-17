/* =========================================================================
   js/class-records.js — keeps small per-class labels in the DATABASE
   instead of only in this browser (backend/records/*.php).

   Photos stay in the teacher's Google Drive. What is saved here is only
   the label: the Drive link, file id, file name, plus small ticks and
   statuses. About half a KB each.

   classRecordsSync(kind, localObj, onLoaded)
     Once the class is known: reads every record of this kind from the
     database into localObj (the database wins), and sends up anything
     that was only in this browser (the one-time move). Then calls
     onLoaded() so the screen can redraw.
   classRecordSave(kind, key, data)
     Saves one record (data = null removes it). Retries quietly later
     if the server can't be reached; the browser copy is kept meanwhile.
   ========================================================================= */
(function(){
  'use strict';
  const pending = {}; // 'kind|key' -> data  (waiting to reach the server)
  const PENDING_STORE = 'classRecordsPending';
  try { Object.assign(pending, JSON.parse(localStorage.getItem(PENDING_STORE) || '{}')); } catch(e){}
  const keepPending = () => { try { localStorage.setItem(PENDING_STORE, JSON.stringify(pending)); } catch(e){} };

  function classId(){
    try { return (typeof myClassInfo !== 'undefined' && myClassInfo && myClassInfo.class_id) ? myClassInfo.class_id : null; } catch(e){ return null; }
  }
  function q(){ return window.location.search ? '&' + window.location.search.slice(1) : ''; }
  function whenClassKnown(fn){
    let tries = 0;
    (function wait(){
      if(classId()) return fn(classId());
      if(++tries < 240) setTimeout(wait, 500); // up to 2 minutes
    })();
  }

  async function post(cid, kind, records){
    const res = await fetch('backend/records/save_class_record.php' + window.location.search, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_id: cid, kind, records })
    });
    const data = await res.json();
    if(data.status !== 'success') throw new Error(data.message || 'Could not save.');
    return data;
  }

  async function flushPending(){
    const cid = classId(); if(!cid) return;
    const byKind = {};
    Object.keys(pending).forEach(k => { const i = k.indexOf('|'); (byKind[k.slice(0, i)] = byKind[k.slice(0, i)] || {})[k.slice(i + 1)] = pending[k]; });
    for(const kind of Object.keys(byKind)){
      try {
        await post(cid, kind, byKind[kind]);
        Object.keys(byKind[kind]).forEach(key => { delete pending[kind + '|' + key]; });
        keepPending();
      } catch(e){ /* still offline — try again later */ }
    }
  }

  window.classRecordSave = function(kind, key, data){
    pending[kind + '|' + key] = data === undefined ? null : JSON.parse(JSON.stringify(data));
    keepPending();
    clearTimeout(window.classRecordSave._t);
    window.classRecordSave._t = setTimeout(flushPending, 400); // several quick changes go up together
  };

  window.classRecordsSync = function(kind, localObj, onLoaded, cleanForUpload){
    whenClassKnown(async cid => {
      try {
        await flushPending();
        const res = await fetch('backend/records/get_class_records.php?class_id=' + encodeURIComponent(cid) + '&kind=' + encodeURIComponent(kind) + q());
        const data = await res.json();
        if(data.status !== 'success') throw new Error(data.message || 'Could not load.');
        const server = data.records || {};
        // One-time move: anything only in this browser goes up.
        const onlyHere = {};
        Object.keys(localObj).forEach(key => {
          if(!(key in server) && localObj[key] != null){
            onlyHere[key] = cleanForUpload ? cleanForUpload(localObj[key]) : localObj[key];
          }
        });
        if(Object.keys(onlyHere).length){ try { await post(cid, kind, onlyHere); } catch(e){ Object.keys(onlyHere).forEach(k => window.classRecordSave(kind, k, onlyHere[k])); } }
        // The database wins for everything it has.
        Object.keys(server).forEach(key => { localObj[key] = server[key]; });
        if(typeof onLoaded === 'function') onLoaded();
      } catch(e){
        console.warn('class-records: using this browser\u2019s copy of "' + kind + '" for now —', e.message || e);
      }
    });
  };

  window.classRecordsWhenClassKnown = whenClassKnown; // for screens with their own tables (activity photos)
  window.addEventListener('online', flushPending);
  setInterval(() => { if(Object.keys(pending).length) flushPending(); }, 60000);
})();
