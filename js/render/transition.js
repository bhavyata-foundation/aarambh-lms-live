/* =========================================================================
   js/render/transition.js — Assessment Dashboard → △ Transition
   -------------------------------------------------------------------------
   Replaces the "No data available" placeholder in teacher-part-13.js
   (renderTransition is defined again here, and this file loads after the
   part files, so this version is the one used).

   For BOTH classes:
     • Readiness from marks already saved — each child's Classroom
       Observation and Fine & Gross Motor marks (B / P / A), Term 1 and
       Term 2 together. Nothing is estimated: a child with too few marks
       shows "Not enough marks yet".
     • The teacher's own view (Ready / Needs support) and a support note.
     • Follow-up notes, dated, for any child.
   Jr KG also records where each child went: moved on to Sr KG / another
   school / left. Sr KG shows readiness for Std 1 only (Std 1 itself is
   not in the portal).

   Saved per class in the database (class_records, kind 'transition',
   one record per child per school year, key 'YYYY-YY:<pupil id>').
   Workbook (child-wise) counts too. Pre-Test is a class count here, so
   it can't describe one child and is not used.
   ========================================================================= */

  var transitionRecords = {};          // 'YYYY-YY:pupilId' -> { view, supportNote, outcome, otherSchool, notes:[{date,text}] }
  var transitionSyncStarted = false;
  var transitionOpenNotes = {};        // pupilId -> true while its notes box is open

  const TRANSITION_MIN_MARKS = 5;      // fewer saved marks than this → "Not enough marks yet"

  function transitionYear(){
    const d = new Date(); const y = d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1; // school year starts in June
    return y + '-' + String((y + 1) % 100).padStart(2, '0');
  }
  function transitionKey(pid){ return transitionYear() + ':' + pid; }
  function transitionGet(pid){ return transitionRecords[transitionKey(pid)] || {}; }
  function transitionRerender(){ if(typeof renderTransition === 'function') renderTransition(transitionTargetEl); }

  function transitionSave(pid, rec){
    const key = transitionKey(pid);
    const clean = {};
    ['view', 'supportNote', 'outcome', 'otherSchool'].forEach(k => { if(rec[k]) clean[k] = String(rec[k]).slice(0, 300); });
    if(Array.isArray(rec.notes) && rec.notes.length) clean.notes = rec.notes.slice(-30);
    if(Object.keys(clean).length) transitionRecords[key] = clean; else delete transitionRecords[key];
    if(typeof classRecordSave === 'function') classRecordSave('transition', key, Object.keys(clean).length ? clean : null);
  }
  function transitionSet(pid, field, value){
    const rec = Object.assign({}, transitionGet(pid));
    rec[field] = value || '';
    if(field === 'outcome' && value !== 'other_school') rec.otherSchool = '';
    transitionSave(pid, rec);
    transitionRerender();
  }
  function transitionToggleNotes(pid){ transitionOpenNotes[pid] = !transitionOpenNotes[pid]; transitionRerender(); }
  function transitionAddNote(pid){
    const box = document.getElementById('trnNote-' + pid);
    const text = box ? box.value.trim() : '';
    if(!text) return;
    const rec = Object.assign({}, transitionGet(pid));
    rec.notes = (rec.notes || []).concat([{ date: (typeof todayDateKey === 'function' ? todayDateKey() : new Date().toISOString().slice(0, 10)), text: text.slice(0, 300) }]);
    transitionSave(pid, rec);
    transitionOpenNotes[pid] = true;
    transitionRerender();
  }
  function transitionRemoveNote(pid, i){
    if(!confirm('Remove this note?')) return;
    const rec = Object.assign({}, transitionGet(pid));
    rec.notes = (rec.notes || []).filter((_, j) => j !== i);
    transitionSave(pid, rec);
    transitionRerender();
  }

  // Readiness for one child from their saved marks (all CGs together).
  function transitionReadiness(cgs){
    let b = 0, p = 0, a = 0, ob = 0, wk = 0, mo = 0; const support = [];
    Object.entries(cgs || {}).forEach(([code, r]) => {
      const w = r.workbook || { b: 0, p: 0, a: 0 }; // Workbook is child-wise too
      const cb = r.observation.b + r.motor.b + w.b, cp = r.observation.p + r.motor.p + w.p, ca = r.observation.a + r.motor.a + w.a;
      b += cb; p += cp; a += ca;
      ob += r.observation.b + r.observation.p + r.observation.a; wk += w.b + w.p + w.a; mo += r.motor.b + r.motor.p + r.motor.a;
      const L = cgLevel(cb, cp, ca); if(L && L.letter === 'B') support.push(code);
    });
    const n = b + p + a;
    const parts = { ob, wk, mo }; // Classroom Observation · Workbook · Fine & Gross Motor
    if(n < TRANSITION_MIN_MARKS) return { state: 'none', n, support: [], parts };
    const L = cgLevel(b, p, a);
    support.sort((x, y) => cgMajor(x) - cgMajor(y) || parseFloat(x.slice(3)) - parseFloat(y.slice(3)));
    return { state: L.letter === 'B' ? 'support' : 'ready', n, L, support, parts };
  }

  function renderTransition(targetEl){
    transitionTargetEl = targetEl || transitionTargetEl || null;
    const container = transitionTargetEl || document.getElementById('transition-body');
    if(!container) return;
    container.innerHTML = '';
    const isSr = workbookLevelFromClassName() === 'Sr KG';
    const next = isSr ? 'Std 1' : 'Sr KG';
    const className = (myClassInfo && myClassInfo.class_name) || (isSr ? 'Sr KG' : 'Jr KG');
    container.appendChild(mdSec('Transition — ' + (isSr ? 'Sr KG to Std 1' : 'Jr KG to Sr KG'), '<span class="reqs">BAL-09…12 · DAT-52</span>'));

    if(!transitionSyncStarted && typeof classRecordsSync === 'function'){
      transitionSyncStarted = true;
      classRecordsSync('transition', transitionRecords, transitionRerender);
    }
    if(!ensurePupilsLoadedFor(container, transitionRerender)) return;
    const months = ASSESS_TERMS[1].months.concat(ASSESS_TERMS[2].months);
    const T = computeCgTotalsTerm(months, transitionRerender);
    if(T.loading){ container.appendChild(attNote('Loading the saved marks for the whole year…')); return; }

    const pupils = (realPupilsCache || []).slice();
    if(!pupils.length){ container.appendChild(attNote('No data available — there are no children on ' + className + '\u2019s roll yet.')); return; }

    const rows = pupils.map(p => ({ p, R: transitionReadiness((T.children || {})[p.id]), rec: transitionGet(p.id) }));
    const count = f => rows.filter(f).length;
    const report = document.createElement('div');
    report.style.cssText = 'display:flex; flex-direction:column; gap:20px;'; // even space between the tiles and every card
    container.appendChild(report);

    // ---- summary ----
    const grid = document.createElement('div'); grid.className = 'g g4';
    grid.appendChild(mdTile('Ready for ' + next, count(r => r.R.state === 'ready'), 'from their marks', mdPill('of ' + rows.length + ' children', 'neu'), 'BAL-09'));
    grid.appendChild(mdTile('Need support first', count(r => r.R.state === 'support'), 'mostly at Beginner', count(r => r.R.state === 'support') ? mdPill('Plan support', 'crit') : mdPill('None', 'good'), 'BAL-10'));
    grid.appendChild(mdTile('Not enough marks yet', count(r => r.R.state === 'none'), 'fewer than ' + TRANSITION_MIN_MARKS + ' marks', mdPill('Observation + Workbook + Motor', 'neu'), 'BAL-11'));
    grid.appendChild(mdTile('Teacher has confirmed', count(r => r.rec.view), 'Ready / Needs support', mdPill((rows.length - count(r => r.rec.view)) + ' still to confirm', count(r => r.rec.view) === rows.length ? 'good' : 'warn'), 'BAL-12'));
    report.appendChild(grid);

    if(!isSr){
      const g2 = document.createElement('div'); g2.className = 'g g4';
      g2.appendChild(mdTile('Moved on to Sr KG', count(r => r.rec.outcome === 'moved_on'), 'children', mdPill('this school', 'good'), 'DAT-52'));
      g2.appendChild(mdTile('Moved to another school', count(r => r.rec.outcome === 'other_school'), 'children', mdPill('school noted', 'neu'), 'DAT-52'));
      g2.appendChild(mdTile('Left', count(r => r.rec.outcome === 'left'), 'children', count(r => r.rec.outcome === 'left') ? mdPill('trace and note', 'warn') : mdPill('None', 'good'), 'DAT-52'));
      g2.appendChild(mdTile('Not recorded yet', count(r => !r.rec.outcome), 'where next', mdPill('fill in at year end', 'neu'), 'DAT-52'));
      report.appendChild(g2);
    }

    // ---- per child ----
    const pill = R => R.state === 'none' ? '<span class="dim">Not enough marks yet</span>'
      : (typeof cgLevelPill === 'function' ? cgLevelPill(R.L, true) : esc(R.L.letter)) + ' <span class="cap">' + (R.state === 'ready' ? 'Ready' : 'Needs support') + '</span>';
    const sel = (pid, field, cur, opts) => `<select onchange="transitionSet(${pid}, '${field}', this.value)" style="padding:5px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px;">${opts.map(([v, l]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const textIn = (pid, field, cur, ph) => `<input type="text" value="${esc(cur || '')}" placeholder="${esc(ph)}" onchange="transitionSet(${pid}, '${field}', this.value)" style="width:100%; min-width:140px; padding:5px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px;" />`;

    let t = '<div class="report-table-wrap" style="overflow-x:auto;"><table class="report-table" style="min-width:900px;"><thead><tr>'
      + '<th style="text-align:left;">Child</th><th>Marks</th><th style="text-align:left;">From the marks</th><th style="text-align:left;">Support areas (CGs at B)</th>'
      + '<th style="text-align:left;">Teacher\u2019s view</th>' + (isSr ? '' : '<th style="text-align:left;">Where next</th>') + '<th style="text-align:left;">Notes</th></tr></thead><tbody>';
    rows.forEach(({ p, R, rec }) => {
      const notes = rec.notes || [];
      t += `<tr><td style="text-align:left;"><b>${esc(p.name)}</b>${p.register_no ? '<div class="cap">' + esc(p.register_no) + '</div>' : ''}</td>`
        + `<td>${R.n}<div class="cap" title="Classroom Observation · Workbook · Fine &amp; Gross Motor marks, Term 1 and Term 2 together">Obs ${R.parts.ob} · Workbook ${R.parts.wk} · Motor ${R.parts.mo}</div></td><td style="text-align:left;">${pill(R)}</td>`
        + `<td style="text-align:left;">${R.support.length ? R.support.map(esc).join(', ') : '<span class="dim">—</span>'}</td>`
        + `<td style="text-align:left;">${sel(p.id, 'view', rec.view || '', [['', '—'], ['ready', 'Ready for ' + next], ['support', 'Needs support first']])}`
        + (rec.view === 'support' ? `<div style="margin-top:6px;">${textIn(p.id, 'supportNote', rec.supportNote, 'What support? e.g. counting to 20')}</div>` : '') + `</td>`
        + (isSr ? '' : `<td style="text-align:left;">${sel(p.id, 'outcome', rec.outcome || '', [['', '—'], ['moved_on', 'Moved on to Sr KG'], ['other_school', 'Moved to another school'], ['left', 'Left']])}`
          + (rec.outcome === 'other_school' ? `<div style="margin-top:6px;">${textIn(p.id, 'otherSchool', rec.otherSchool, 'Which school?')}</div>` : '') + `</td>`)
        + `<td style="text-align:left;"><button class="btn" data-no-export="1" style="padding:4px 10px; font-size:12px;" onclick="transitionToggleNotes(${p.id})">${notes.length ? '📝 ' + notes.length : '+ Note'}</button>`
        + (notes.length ? `<div class="cap" style="margin-top:4px;">${esc(notes[notes.length - 1].date)}: ${esc(notes[notes.length - 1].text)}</div>` : '') + `</td></tr>`;
      if(transitionOpenNotes[p.id]){
        t += `<tr data-no-export="1"><td colspan="${isSr ? 6 : 7}" style="text-align:left; background:var(--bg);">`
          + (notes.length ? notes.map((n, i) => `<div style="display:flex; gap:8px; align-items:baseline; margin:3px 0;"><span class="cap">${esc(n.date)}</span><span>${esc(n.text)}</span><a href="#" onclick="transitionRemoveNote(${p.id}, ${i}); return false;" class="cap" style="margin-left:auto;">remove</a></div>`).join('') : '<div class="cap">No notes yet.</div>')
          + `<div style="display:flex; gap:8px; margin-top:6px;"><input id="trnNote-${p.id}" type="text" placeholder="e.g. Called parent — family moved to Pune; joining a school there" style="flex:1; padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px;" onkeydown="if(event.key==='Enter') transitionAddNote(${p.id})" />`
          + `<button class="btn-primary" style="width:auto; padding:6px 14px;" onclick="transitionAddNote(${p.id})">Add note</button></div></td></tr>`;
      }
    });
    t += '</tbody></table></div>';
    const tw = document.createElement('div'); tw.innerHTML = t;
    report.appendChild(mdCard('Every child — ready for ' + next + '?',
      'From each child\u2019s saved Classroom Observation, Workbook and Fine & Gross Motor marks, Term 1 and Term 2 together: mostly P or A = Ready, mostly B = Needs support, fewer than '
      + TRANSITION_MIN_MARKS + ' marks = not enough to say. Pre-Test is a class count here, so it can\u2019t describe one child. Your own view is saved separately and is what counts.'
      + (isSr ? ' Std 1 isn\u2019t in the portal, so only readiness is recorded here.' : ''), tw));

    // Children still to trace (Jr KG: left or moved, with no note yet).
    if(!isSr){
      const trace = rows.filter(r => (r.rec.outcome === 'left' || r.rec.outcome === 'other_school') && !(r.rec.notes || []).length);
      if(trace.length) report.appendChild(attNote('Still to follow up (left or moved, no note yet): ' + trace.map(r => r.p.name).join(', ') + '.'));
    }

    if(typeof reportDownloadBar === 'function'){
      container.appendChild(reportDownloadBar(() => report, 'Transition — ' + className + ' — ' + transitionYear(), 'transition-' + transitionYear(),
        'Readiness, the teacher\u2019s view' + (isSr ? '' : ', where each child went') + ' and the latest note, for this class only.'));
    }
  }