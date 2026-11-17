// Classroom Observation: the same "Not yet submitted / Submit marks for the month" card as Workbook and Pre-Test.
// Submitting is a status flag only: the marks stay editable, and the Download section waits for submission.
(function(){
  var cache = {};
  var qs = function(){ return window.location.search ? '&' + window.location.search.slice(1) : ''; };
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };

  function load(classId, month, redraw){
    var key = classId + '|' + month;
    if(cache[key] !== undefined) return cache[key];
    cache[key] = 'loading';
    fetch('backend/assessment/observation/get_observation_month_submission.php?' + new URLSearchParams({ class_id: classId, month: month }) + qs(), { cache: 'no-store' })
      .then(function(r){ return r.json(); })
      .then(function(d){ cache[key] = d.status === 'success' ? d : 'error:' + (d.message || 'Could not load status.'); redraw(); })
      .catch(function(){ cache[key] = 'error:Could not reach the server.'; redraw(); });
    return 'loading';
  }

  function card(classId, month, status){
    var el = document.createElement('div');
    el.className = 'card'; el.setAttribute('data-obs-submit', ''); el.style.cssText = 'padding:16px 18px; margin-top:20px; margin-bottom:14px;';
    if(status === 'loading' || status === undefined){ el.innerHTML = '<p class="cap" style="margin:0;">Checking submission status…</p>'; }
    else if(typeof status === 'string'){ el.innerHTML = '<p class="cap" style="margin:0; color:#B42318;">' + esc(status.replace('error:', '')) + '</p>'; }
    else if(status.submitted){
      var when = status.submitted_at ? new Date(status.submitted_at.replace(' ', 'T')).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      el.innerHTML = '<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;"><div><b style="color:#1E7B4F;">✓ ' + esc(month) + ' submitted</b><p class="cap" style="margin:4px 0 0;">' + esc(when) + '</p></div>' +
        '<button style="padding:7px 14px; border-radius:8px; border:1px solid #C9D6CF; background:#fff; font-size:12.5px; cursor:pointer;" onclick="obsUndoSubmit(' + classId + ',\'' + esc(month) + '\')">Undo submission</button></div>';
    } else {
      el.innerHTML = '<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;"><div><b>Not yet submitted</b><p class="cap" style="margin:4px 0 0;">Submit once all the observation marks for ' + esc(month) + ' are entered.</p></div>' +
        '<button style="width:auto; padding:9px 18px; border-radius:8px; border:none; background:#0E6B4E; color:#fff; font-weight:700; cursor:pointer;" onclick="obsSubmit(' + classId + ',\'' + esc(month) + '\')">Submit marks for ' + esc(month) + '</button></div>';
    }
    return el;
  }

  window.obsSubmit = function(classId, month){
    fetch('backend/assessment/observation/submit_observation_month.php' + (window.location.search || ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class_id: classId, month: month }) })
      .then(function(r){ return r.json(); })
      .then(function(d){ if(d.status !== 'success'){ alert(d.message || 'Could not submit.'); return; } delete cache[classId + '|' + month]; redrawNow(); })
      .catch(function(){ alert('Could not reach the server.'); });
  };
  window.obsUndoSubmit = function(classId, month){
    if(!confirm('Undo the submission for ' + month + '? Only the status changes; no marks are affected.')) return;
    fetch('backend/assessment/observation/unsubmit_observation_month.php' + (window.location.search || ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class_id: classId, month: month }) })
      .then(function(r){ return r.json(); })
      .then(function(d){ if(d.status !== 'success'){ alert(d.message || 'Could not undo.'); return; } delete cache[classId + '|' + month]; redrawNow(); })
      .catch(function(){ alert('Could not reach the server.'); });
  };

  function redrawNow(){ if(typeof renderMonthlyAssessment === 'function' && typeof monthlyAssessmentTargetEl !== 'undefined') renderMonthlyAssessment(monthlyAssessmentTargetEl); }

  // after the Classroom Observation screen is drawn, add the submit card under it
  if(typeof renderMonthlyAssessment === 'function'){
    var base = renderMonthlyAssessment;
    renderMonthlyAssessment = function(targetEl){
      var out = base.apply(this, arguments);
      try {
        if(targetEl && typeof assessmentEntryType !== 'undefined' && assessmentEntryType === 'observation'){
          targetEl.querySelectorAll('[data-obs-submit]').forEach(function(x){ x.remove(); });
          var classId = (typeof myClassInfo !== 'undefined' && myClassInfo.class_id) ? myClassInfo.class_id : null;
          var month = (typeof currentWorkbookMonth !== 'undefined') ? currentWorkbookMonth : '';
          if(classId && month){
            var status = load(classId, month, redrawNow);
            var box = card(classId, month, status);
            // directly after the CG summary card, not at the bottom of the screen
            var summary = targetEl.querySelector('[data-cg-summary]');
            var anchor = summary ? (summary.closest('.card') || summary) : null;
            if(anchor && anchor.parentNode){ anchor.parentNode.insertBefore(box, anchor.nextSibling); }
            else { targetEl.appendChild(box); }
          }
        }
      } catch(e){ console.error('obs-submit', e); }
      return out;
    };
  }
})();
