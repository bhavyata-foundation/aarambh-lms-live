/* =========================================================================
   teacher-part-03.js — part 3 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   Nothing here runs on its own at load except data set-up.
   ========================================================================= */

  function renderAttendanceRegisterForDay(container, dateStr){
    if(!attendanceRecords[dateStr]) attendanceRecords[dateStr] = {};
    const records = attendanceRecords[dateStr];
    const [y, m] = dateStr.split('-').map(Number);
    const niceDate = new Date(dateStr + 'T00:00:00').toLocaleDateString([], {day:'2-digit', month:'short'});
    const declaredHoliday = studentHolidays[dateStr] || null;

    // Real pupils, filtered by each one's own real admitted_date —
    // REG-14 (a child admitted later isn't on an earlier register) is
    // now enforced against her actual database admission date, not a
    // separate localStorage admissionRecords guess keyed by name.
    let present = 0, absent = 0;
    const notYetAdmittedCount = realPupilsCache.length - realPupilsCache.filter(p => !p.admitted_date || p.admitted_date <= dateStr).length;
    const rows = realPupilsCache
      .filter(p => !p.admitted_date || p.admitted_date <= dateStr)
      .map((p, i) => {
        const status = records[p.id];
        if(status === 'present') present++;
        else if(status === 'absent') absent++;
        const mtd = childMonthToDatePct(p.id, y, m - 1, dateStr);
        return { id: p.id, name: p.name, admitted_date: p.admitted_date, roll: i + 1, register_no: p.register_no || '', status, pct: mtd.pct, marked: mtd.marked };
      });

    // Same-name disambiguation — two pupils sharing an exact name is
    // real and not rare (common first names repeat a lot). Storage is
    // already safe (keyed by id), but the display needs to make it
    // visually obvious which is which, or a teacher marking by eye
    // could still tap the wrong one even though the system wouldn't
    // actually mix up the data.
    const nameCounts = {};
    rows.forEach(r => { nameCounts[r.name] = (nameCounts[r.name] || 0) + 1; });
    const hasDuplicateNames = Object.values(nameCounts).some(c => c > 1);

    container.appendChild(mdSec('Register for ' + niceDate, '<span class="reqs">REG-14</span>'));
    container.appendChild((() => {
      const p = document.createElement('p'); p.className = 'cap'; p.style.marginBottom = '14px';
      p.innerHTML = 'REG-14 · the roll is the children admitted on or before this date, so a child admitted later simply isn\'t on an earlier register.'
        + (notYetAdmittedCount > 0 ? ` ${notYetAdmittedCount} child${notYetAdmittedCount === 1 ? '' : 'ren'} not yet admitted as of this date ${notYetAdmittedCount === 1 ? 'is' : 'are'} hidden from this register.` : '');
      return p;
    })());

    if(declaredHoliday){
      const banner = document.createElement('div');
      banner.className = 'card';
      banner.style.cssText = 'padding:16px 18px; margin-bottom:14px; background:#fdf1e3; border-color:#E0A429; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;';
      banner.innerHTML = `<div><b>🎉 Holiday for students: ${esc(declaredHoliday)}</b><p class="cap" style="margin:4px 0 0;">No attendance needed today.</p></div>
        <button onclick="removeStudentHoliday('${dateStr}')" style="padding:7px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12.5px; font-weight:600; cursor:pointer;">Remove holiday</button>`;
      container.appendChild(banner);
      return;
    }

    // Day summary — moved here from My Day's "Class present today" tile,
    // since it belongs with the register itself. Real counts only:
    // present / absent / not yet marked, out of the children admitted
    // on or before this date (the same roll shown below).
    const rollCount = rows.length;
    const unmarkedCount = Math.max(0, rollCount - present - absent);
    const isTodayView = dateStr === todayDateKey();
    const pctOf = n => rollCount ? (n / rollCount * 100) : 0;
    const summaryCard = document.createElement('div');
    summaryCard.className = 'att-summary';
    summaryCard.innerHTML = `
      <div class="att-summary-head">
        <div>
          <div class="att-summary-k">${isTodayView ? 'Class present today' : 'Class present on ' + esc(niceDate)}</div>
          <div class="att-summary-v">${present}<small> of ${rollCount}</small></div>
        </div>
        ${rollCount === 0 ? mdPill('No children on the roll', 'neu')
          : unmarkedCount === 0 ? mdPill('All ' + rollCount + ' marked', 'good')
          : mdPill(unmarkedCount + ' not marked yet', 'warn')}
      </div>
      <div class="att-summary-bar" aria-hidden="true">
        <i class="p" style="width:${pctOf(present)}%"></i><i class="a" style="width:${pctOf(absent)}%"></i>
      </div>
      <div class="att-summary-legend">
        <span><i class="p"></i>Present <b>${present}</b></span>
        <span><i class="a"></i>Absent <b>${absent}</b></span>
        <span><i class="u"></i>Not marked <b>${unmarkedCount}</b></span>
      </div>`;
        container.appendChild(summaryCard);
        
        const actionsRow = document.createElement('div');
        actionsRow.style.cssText = 'display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px;';
        actionsRow.innerHTML = `
      <button onclick="markAllPresentForDay('${dateStr}')" style="padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:13px; font-weight:600;">All present</button>
      ${(present + absent) > 0 ? `<button onclick="clearAllMarksForDay('${dateStr}')" style="padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:13px; font-weight:600;">↺ Clear all marks</button>` : ''}
      <button onclick="toggleHolidayForm('${dateStr}')" style="padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:13px; font-weight:600;">🎉 Mark as holiday</button>
      <span class="cap">Present ${present} · Absent ${absent} — tap Present or Absent for each name; tap the active one again to clear it.</span>
    `;
    container.appendChild(actionsRow);

    const holidayForm = document.createElement('div');
    holidayForm.id = 'holidayForm-' + dateStr;
    holidayForm.className = 'hidden';
    holidayForm.style.cssText = 'display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:14px; padding:12px 14px; border:1px dashed var(--border); border-radius:10px; background:var(--bg);';
    holidayForm.innerHTML = `
      <span class="cap">Which holiday?</span>
      <select id="holidayPresetSelect-${dateStr}" onchange="handleHolidayPresetChange('${dateStr}')" style="padding:7px 8px; border:1px solid var(--border); border-radius:8px; font-size:13px; background:#fff;">
        <option value="">Choose a common holiday…</option>
        ${COMMON_HOLIDAYS.map(h => `<option value="${esc(h)}">${esc(h)}</option>`).join('')}
        <option value="__other__">Other — type it myself</option>
      </select>
      <input id="holidayNameInput-${dateStr}" type="text" placeholder="e.g. School closed for elections" style="display:none; flex:1; min-width:220px; padding:7px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px;" />
      <button onclick="declareStudentHoliday('${dateStr}')" style="padding:7px 16px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Save</button>
    `;
    container.appendChild(holidayForm);

    const searchWrap = document.createElement('input');
    searchWrap.type = 'text';
    searchWrap.className = 'attendance-search';
    searchWrap.placeholder = 'Search student by name';
    searchWrap.value = attendanceSearchTerm;
    searchWrap.style.cssText = 'width:100%; padding:10px; margin-bottom:14px; border:1px solid var(--border); border-radius:8px; font-size:14px;';
    searchWrap.oninput = (e) => filterAttendance(e.target.value);
    container.appendChild(searchWrap);

    const visibleRows = attendanceSearchTerm
      ? rows.filter(r => r.name.toLowerCase().includes(attendanceSearchTerm.toLowerCase()))
      : rows;

    const colors = { present: 'var(--success)', absent: 'var(--danger,#c8433f)' };
    if(hasDuplicateNames){
      const warnEl = document.createElement('p');
      warnEl.className = 'cap';
      warnEl.style.cssText = 'margin:0 0 10px; color:var(--danger, #c8433f);';
      warnEl.textContent = '⚠ Two or more children on this roll share the exact same name — look at the admission date shown under each before marking, not just the name.';
      container.appendChild(warnEl);
    }
    const roster = document.createElement('div');
    roster.style.cssText = 'background:var(--card); border:1px solid var(--border); border-radius:10px; overflow:hidden;';
    roster.innerHTML = visibleRows.map(r => `<div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--border); flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-weight:bold; font-size:13px;">${esc(r.name)}${nameCounts[r.name] > 1 ? ` <span style="font-weight:normal; color:var(--danger, #c8433f);">· admitted ${esc(r.admitted_date || 'unknown date')}</span>` : ''}</div>
          <div class="cap">Roll ${r.roll}${r.register_no ? ' · Register/MIN ' + esc(r.register_no) : ' · Register/MIN missing'} · month to date ${r.marked ? r.pct + '%' : '—'}</div>
        </div>
        <div style="display:flex; gap:6px;">
          <button onclick="setAttendanceStatus('${dateStr}', ${r.id}, 'present')" style="min-width:84px; padding:8px 14px; border-radius:8px; border:${r.status === 'present' ? 'none' : '1px solid var(--border)'}; background:${r.status === 'present' ? colors.present : '#fff'}; color:${r.status === 'present' ? '#fff' : 'var(--text)'}; font-weight:600; font-size:13px; cursor:pointer;">Present</button>
          <button onclick="setAttendanceStatus('${dateStr}', ${r.id}, 'absent')" style="min-width:84px; padding:8px 14px; border-radius:8px; border:${r.status === 'absent' ? 'none' : '1px solid var(--border)'}; background:${r.status === 'absent' ? colors.absent : '#fff'}; color:${r.status === 'absent' ? '#fff' : 'var(--text)'}; font-weight:600; font-size:13px; cursor:pointer;">Absent</button>
          <button onclick="removePupilFromRoster(${r.id}, '${esc(r.name).replace(/'/g, "\\'")}')" title="Remove ${esc(r.name)} from the roster entirely" style="padding:8px 10px; border-radius:8px; border:1px solid var(--border); background:#fff; color:var(--danger, #c8433f); font-size:13px; cursor:pointer;">🗑</button>
        </div>
      </div>`).join('') || `<p class="cap" style="padding:16px;">No student matches "${esc(attendanceSearchTerm)}".</p>`;
    container.appendChild(roster);

    // Submit sits after the full list now — the natural last step once
    // every name has actually been looked at, not a button sitting
    // above names that haven't been marked yet.
    const submitRow = document.createElement('div');
    submitRow.style.cssText = 'margin-top:16px; display:flex; justify-content:flex-end;';
    submitRow.innerHTML = `<button onclick="submitRegisterForDay('${dateStr}')" style="padding:10px 22px; border-radius:8px; border:none; background:var(--primary); color:#fff; cursor:pointer; font-size:13.5px; font-weight:600;">${attendanceSaved ? 'Submitted ✓' : 'Submit register'}</button>`;
    container.appendChild(submitRow);
  }

  // Sets a specific status directly rather than cycling through
  // present → absent on repeated taps — Present and Absent are now two
  // separate buttons, so each one always means exactly what it says.
  // Tapping the already-active one clears back to "not marked".
  //
  // Optimistic: the screen updates immediately (same feel as before),
  // the real save happens in the background — an alert only appears
  // if that background save actually fails, so a slow connection
  // doesn't make marking attendance feel sluggish.
  //
  // Keyed by pupilId now, not name — attendanceRecords[date] is a
  // {pupilId: status} object, matching how the database and
  // get_attendance.php both key it. Two same-named children never
  // collide here, unlike the old name-keyed version.
  function setAttendanceStatus(dateStr, pupilId, status){
    if(!attendanceRecords[dateStr]) attendanceRecords[dateStr] = {};
    const newStatus = attendanceRecords[dateStr][pupilId] === status ? null : status;
    if(newStatus === null) delete attendanceRecords[dateStr][pupilId];
    else attendanceRecords[dateStr][pupilId] = newStatus;
    attendanceSaved = false;
    renderAttendanceBody();
    fetch('backend/attendance/save_attendance.php' + window.location.search, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ class_id: myClassInfo.class_id, pupil_id: pupilId, date: dateStr, status: newStatus })
    }).catch(() => { alert('Could not save this mark — check your connection and try again.'); });
  }

  // Removes a pupil from the roster entirely (soft-delete — active=0
  // in the database, never a real DELETE) — not the same as marking
  // her absent for one day. Confirmed explicitly since this affects
  // every future register, not just today's.
  async function removePupilFromRoster(pupilId, name){
    if(!confirm(`Remove ${name} from the roster entirely? She'll stop appearing on every future register — this isn't the same as marking her absent today. Her past attendance history is kept, and this can be undone from the database if it was a mistake.`)) return;
    try{
      const res = await fetch('backend/pupils/remove_pupil.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, pupil_id: pupilId })
      });
      const data = await res.json();
      if(data.status !== 'success'){
        alert(data.message || 'Could not remove this pupil.');
        return;
      }
      realPupilsCache = null; // force a fresh fetch everywhere it's used, not just here
      renderAttendanceBody();
    } catch(err){
      alert('Could not reach the server.');
    }
  }

  async function markAllPresentForDay(dateStr){
    attendanceRecords[dateStr] = {};
    realPupilsCache.forEach(p => { attendanceRecords[dateStr][p.id] = 'present'; });
    attendanceSaved = false;
    renderAttendanceBody();
    try{
      await fetch('backend/attendance/save_attendance.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, marks: realPupilsCache.map(p => ({ pupil_id: p.id, date: dateStr, status: 'present' })) })
      });
    } catch(err){
      alert('Could not save to the server — check your connection and try again.');
    }
  }

  // Returns the day to genuinely unmarked — every student back to
  // "Not marked", not "Absent". This is the default state a fresh day
  // should start in; this button lets a teacher get back to it if a
  // register was started by mistake or needs a clean re-do.
  async function clearAllMarksForDay(dateStr){
    const previouslyMarkedIds = Object.keys(attendanceRecords[dateStr] || {}); // already pupil ids (as strings) — no name lookup needed
    attendanceRecords[dateStr] = {};
    attendanceSaved = false;
    renderAttendanceBody();
    if(!previouslyMarkedIds.length) return;
    try{
      await fetch('backend/attendance/save_attendance.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          class_id: myClassInfo.class_id,
          marks: previouslyMarkedIds.map(id => ({ pupil_id: Number(id), date: dateStr, status: null }))
        })
      });
    } catch(err){
      alert('Could not clear marks on the server — check your connection and try again.');
    }
  }

  // Every mark already saves itself the moment it's tapped (see
  // setAttendanceStatus above) — this button is now just a local
  // "I've reviewed this day" confirmation, not a separate save step.
  function submitRegisterForDay(dateStr){
    attendanceSaved = true;
    renderAttendanceBody();
  }


  // ---------------------------------------------------------------
  // FOLLOW-UP ACTIONS — the "Action" and "Call home" buttons on
  // "Who needs a follow-up". Every action taken is saved to the
  // database (attendance_followups) against that child, so the card
  // shows what was last done and when, and nothing depends on memory.
  //   Call home — dials the primary guardian's number from the real
  //     Family Profile (never a sample one), then opens the form to
  //     record how the call went.
  //   Action — records any other follow-up (home visit, message,
  //     spoke at pickup, referred to supervisor …) with a note.
  // ---------------------------------------------------------------
  const FOLLOW_UP_ACTIONS = [
    'Called home — spoke to family',
    'Called home — no answer',
    'Home visit',
    'Spoke to parent at pickup / drop-off',
    'Sent a message to the family',
    'Referred to supervisor',
    'Other'
  ];
  var attendanceFollowupsCache = null;   // null | 'loading' | 'error:…' | { pupilId: [ {action_type, note, follow_up_date, reason} ] }
  var attendanceFollowUpFormFor = null;  // pupil id whose form is open
  var attendanceFollowUpFormType = '';
  var attendanceFollowUpFormReason = '';

  function ensureAttendanceFollowupsLoaded(){
    if(attendanceFollowupsCache !== null || !myClassInfo.class_id) return;
    attendanceFollowupsCache = 'loading';
    const params = new URLSearchParams(window.location.search);
    params.set('class_id', myClassInfo.class_id);
    fetch('backend/attendance/get_attendance_followups.php?' + params.toString())
      .then(r => r.json())
      .then(data => {
        if(data.status !== 'success'){ attendanceFollowupsCache = 'error:' + (data.message || 'Could not load follow-ups.'); return; }
        const byPupil = {};
        (data.followups || []).forEach(f => { (byPupil[f.pupil_id] = byPupil[f.pupil_id] || []).push(f); });
        attendanceFollowupsCache = byPupil;
      })
      .catch(() => { attendanceFollowupsCache = 'error:Could not reach the server.'; })
      .finally(() => {
        const body = document.getElementById('attendance-body');
        if(body && !body.classList.contains('hidden')) renderAttendanceBody();
      });
  }

  // Primary guardian's phone from the REAL imported/entered Family
  // Profile only — a sample household's number is never dialled.
  function guardianContactFor(pupilName){
    const rec = familyRecords[pupilName];
    if(!rec || !Array.isArray(rec.guardianNames)) return null;
    const g = rec.guardianNames.find(x => x.primary && x.phone) || rec.guardianNames.find(x => x.phone);
    return g ? { phone: String(g.phone).trim(), name: g.name || '', rel: g.rel || '' } : null;
  }

  function callHomeForPupil(pupilId, reason){
    const pupil = realPupilsCache.find(p => p.id === pupilId);
    if(!pupil) return;
    const g = guardianContactFor(pupil.name);
    if(!g){
      alert('No phone number is on file for ' + pupil.name + '\u2019s family.\n\nAdd it in Family & Parents \u2192 choose ' + pupil.name + ' \u2192 Edit this profile manually, or import the Family Profile sheet.');
      return;
    }
    // Opens the phone dialler (on a phone) or the calling app (on a computer).
    window.location.href = 'tel:' + g.phone.replace(/[^\d+]/g, '');
    attendanceFollowUpFormFor = pupilId;
    attendanceFollowUpFormType = 'Called home — spoke to family';
    attendanceFollowUpFormReason = reason;
    renderAttendanceBody();
  }

  function openFollowUpAction(pupilId, reason){
    const closing = attendanceFollowUpFormFor === pupilId;
    attendanceFollowUpFormFor = closing ? null : pupilId;
    attendanceFollowUpFormType = '';
    attendanceFollowUpFormReason = reason;
    renderAttendanceBody();
  }

  async function saveAttendanceFollowUp(pupilId){
    const typeEl = document.getElementById('fuType-' + pupilId);
    const noteEl = document.getElementById('fuNote-' + pupilId);
    const dateEl = document.getElementById('fuDate-' + pupilId);
    const btn = document.getElementById('fuSave-' + pupilId);
    if(!typeEl || !typeEl.value){ alert('Choose what was done.'); return; }
    if(btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
    try{
      const res = await fetch('backend/attendance/save_attendance_followup.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, pupil_id: pupilId, action_type: typeEl.value, note: (noteEl.value || '').trim(), follow_up_date: dateEl.value, reason: attendanceFollowUpFormReason })
      });
      const data = await res.json();
      if(data.status !== 'success'){ alert(data.message || 'Could not save.'); if(btn){ btn.disabled = false; btn.textContent = 'Save'; } return; }
      attendanceFollowUpFormFor = null;
      attendanceFollowupsCache = null; // reload the real saved list
      ensureAttendanceFollowupsLoaded();
      renderAttendanceBody();
    } catch(err){
      alert('Could not reach the server.');
      if(btn){ btn.disabled = false; btn.textContent = 'Save'; }
    }
  }

  // One child's row in a follow-up card: name, why, last action, the two
  // buttons, and (when open) the form to record what was done.
  function followUpChildRowHtml(pupilId, name, detail, reason){
    const g = guardianContactFor(name);
    const history = (attendanceFollowupsCache && typeof attendanceFollowupsCache === 'object' && attendanceFollowupsCache[pupilId]) || [];
    const last = history[0];
    const lastLine = last
      ? `<div class="cap" style="margin-top:3px; color:var(--good,#0a7a0a);">Last: ${esc(last.action_type)} · ${esc(new Date(last.follow_up_date + 'T00:00:00').toLocaleDateString([], {day:'numeric', month:'short'}))}${history.length > 1 ? ' · ' + history.length + ' actions so far' : ''}</div>`
      : `<div class="cap" style="margin-top:3px;">No follow-up recorded yet</div>`;
    const btn = 'padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12px; cursor:pointer; white-space:nowrap;';
    const open = attendanceFollowUpFormFor === pupilId;
    const today = todayDateKey();
    const form = open ? `
      <div style="margin-top:10px; padding:12px; border:1px dashed var(--border); border-radius:10px; background:var(--bg);">
        <label class="cap" style="display:block; margin-bottom:4px;">What was done</label>
        <select id="fuType-${pupilId}" style="width:100%; padding:7px 8px; border:1px solid var(--border); border-radius:8px; font-size:13px; background:#fff;">
          <option value="">Choose…</option>
          ${FOLLOW_UP_ACTIONS.map(a => `<option ${a === attendanceFollowUpFormType ? 'selected' : ''}>${esc(a)}</option>`).join('')}
        </select>
        <label class="cap" style="display:block; margin:8px 0 4px;">Date</label>
        <input id="fuDate-${pupilId}" type="date" value="${today}" max="${today}" style="padding:7px 8px; border:1px solid var(--border); border-radius:8px; font-size:13px;" />
        <label class="cap" style="display:block; margin:8px 0 4px;">Note (what the family said, next step)</label>
        <textarea id="fuNote-${pupilId}" rows="2" placeholder="e.g. Mother says she had fever, will return Monday" style="width:100%; padding:7px 8px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;"></textarea>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button id="fuSave-${pupilId}" onclick="saveAttendanceFollowUp(${pupilId})" style="padding:7px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;">Save</button>
          <button onclick="openFollowUpAction(${pupilId}, '${reason}')" style="${btn}">Cancel</button>
        </div>
        ${history.length ? `<div class="cap" style="margin-top:10px;"><b>Earlier:</b><br>${history.slice(0, 5).map(h => esc(h.follow_up_date) + ' — ' + esc(h.action_type) + (h.note ? ': ' + esc(h.note) : '')).join('<br>')}</div>` : ''}
      </div>` : '';
    return `<div style="padding:10px 0; border-bottom:1px solid var(--border);">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;">
        <div style="min-width:0;"><b>${esc(name)}</b><div class="cap">${detail}</div>${g ? `<div class="cap">📞 ${esc(g.phone)}${g.rel ? ' · ' + esc(g.rel) : ''}</div>` : ''}${lastLine}</div>
        <div style="display:flex; gap:6px; flex-shrink:0;">
          <button onclick="openFollowUpAction(${pupilId}, '${reason}')" style="${btn}${open ? ' background:var(--bg);' : ''}">Action</button>
          <button onclick="callHomeForPupil(${pupilId}, '${reason}')" title="${g ? 'Call ' + esc(g.phone) : 'No phone number on file'}" style="${btn}${g ? '' : ' color:var(--text-muted,#888);'}">Call home</button>
        </div>
      </div>${form}
    </div>`;
  }

  function renderAttendanceFollowUp(container, year, month, uptoDateStr){
    container.appendChild(mdSec('Who needs a follow-up', '<span class="reqs">REG-06/07 · PTC-09</span>'));
    ensureAttendanceFollowupsLoaded();
    if(!familyRecordsLoaded) ensureFamilyRecordsLoaded(renderAttendanceBody); // real guardian phone numbers for "Call home"

    // Square cards: same width and height, a big count at the top and
    // the names underneath (scrolls inside the card if the list is long).
    const SQUARE_CARD_STYLE = 'padding:20px; aspect-ratio:1 / 1; display:flex; flex-direction:column; overflow:hidden; min-width:0;';

    // Below 70% this month — at least 4 marked days, so a child admitted
    // a couple of days ago isn't judged on a handful of days.
    const belowList = [];
    realPupilsCache.forEach(p => {
      const mtd = childMonthToDatePct(p.id, year, month, uptoDateStr);
      if(mtd.marked >= 4 && mtd.pct < 70) belowList.push({ id: p.id, name: p.name, pct: mtd.pct, marked: mtd.marked, present: mtd.present });
    });
    const belowCard = document.createElement('div');
    belowCard.className = 'card'; belowCard.style.cssText = SQUARE_CARD_STYLE;
    const belowRows = belowList.length
      ? belowList.map(c => followUpChildRowHtml(c.id, c.name, c.present + ' of ' + c.marked + ' days · ' + c.pct + '%', 'below70')).join('')
      : `<p class="cap">No children below 70% with four or more days marked yet.</p>`;
    belowCard.innerHTML = `<h4 style="margin:0 0 6px;">Below 70% this month</h4>
      <div style="font-family:var(--disp); font-size:34px; font-weight:800; line-height:1; color:${belowList.length ? 'var(--crit,#d03b3b)' : 'var(--good,#0ca30c)'};">${belowList.length}<small style="font-size:14px; font-weight:700; color:var(--ink-2,#4f534d);"> of ${assessmentPupilNames().length}</small></div>
      <p class="cap" style="margin:6px 0 10px;">Children with four or more days marked. A child admitted last week isn't judged on three days.</p>
      <div style="flex:1; overflow-y:auto; min-height:0;">${belowRows}</div>`;

    // Three or more days in a row — the child's TRAILING streak of
    // consecutive absent marks, ending on or before the selected date.
    const streakList = [];
    realPupilsCache.forEach(p => {
      const markedDates = Object.keys(attendanceRecords)
        .filter(d => d <= uptoDateStr && attendanceRecords[d] && attendanceRecords[d][p.id])
        .sort();
      let streak = 0;
      markedDates.forEach(d => { streak = attendanceRecords[d][p.id] === 'absent' ? streak + 1 : 0; });
      if(streak >= 3) streakList.push({ id: p.id, name: p.name, streak });
    });
    const streakCard = document.createElement('div');
    streakCard.className = 'card'; streakCard.style.cssText = SQUARE_CARD_STYLE;
    const streakRows = streakList.length
      ? streakList.map(c => followUpChildRowHtml(c.id, c.name, c.streak + ' days absent in a row', 'streak')).join('')
      : `<p class="cap">No unbroken absence of three days or more.</p>`;
    streakCard.innerHTML = `<h4 style="margin:0 0 6px;">Three or more days in a row</h4>
      <div style="font-family:var(--disp); font-size:34px; font-weight:800; line-height:1; color:${streakList.length ? 'var(--crit,#d03b3b)' : 'var(--good,#0ca30c)'};">${streakList.length}<small style="font-size:14px; font-weight:700; color:var(--ink-2,#4f534d);"> ${streakList.length === 1 ? 'child' : 'children'}</small></div>
      <p class="cap" style="margin:6px 0 10px;">Unbroken absences ending on this date. REG-07 raises this to the supervisor automatically.</p>
      <div style="flex:1; overflow-y:auto; min-height:0;">${streakRows}</div>`;

    const twoCol = document.createElement('div');
    twoCol.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 340px)); gap:20px;';
    twoCol.appendChild(belowCard);
    twoCol.appendChild(streakCard);
    container.appendChild(twoCol);
  }

  function filterAttendance(term){
    attendanceSearchTerm = term;
    renderAttendanceBody();
    const input = document.querySelector('.attendance-search');
    if(input){ input.focus(); input.setSelectionRange(term.length, term.length); }
  }

  let expandedWeek = 1;
  const dayTopicDone = {}; // key: week-dayKey -> true/false (manual sidebar tick, separate from granular task tracking)

  /* ===================== SECTION 11: WEEKLY ACTIVITIES / CURRICULUM ===================== */

  function renderSidebar(){
    const list = document.getElementById('week-list');
    list.innerHTML = WEEKS.map(w => {
      const isExpanded = expandedWeek === w.w;
      let dropdownHtml = '';
      if(isExpanded && weeksWithContent.includes(w.w)){
        const weekTopics = WEEK_DAY_TOPICS['wk' + w.w] || {};
        dropdownHtml = `<div class="day-topic-list">
          <div class="day-topic-heading">Topic: ${w.theme}</div>` + DAYS.map(d => {
          const key = w.w + '-' + d.key;
          const checked = dayTopicDone[key] ? 'checked' : '';
          const doneClass = dayTopicDone[key] ? 'dt-done' : '';
          const activeClass = (w.w===currentWeekNum && d.key===currentDay) ? 'active-day' : '';
          const topic = weekTopics[d.key];
          const topicText = topic ? alwaysEnglish(topic.value) : 'Topic not yet added';
          return `<div class="day-topic-row ${activeClass}">
            <input type="checkbox" ${checked} onchange="toggleDayTopic(${w.w}, '${d.key}', this)" />
            <span class="dt-label ${doneClass}" onclick="event.stopPropagation(); selectWeekDay(${w.w}, '${d.key}')">${d.label} — ${topicText}</span>
          </div>`;
        }).join('') + `</div>`;
      } else if(isExpanded){
        dropdownHtml = `<div class="day-topic-list" style="color:var(--text-muted); font-size:11px;">No topics authored for this week yet.</div>`;
      }
      return `<div class="week-item ${w.w===currentWeekNum?'active':''} ${weeksWithContent.includes(w.w)?'has-content':''}" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; align-items:center; gap:10px;" onclick="toggleWeekExpand(${w.w})">
          <div class="week-num">${w.w}</div>
          <div class="week-info">
            <div class="week-title">WEEK-${w.w}</div>
            <div class="week-dates">${w.theme} · ${w.dates}</div>
          </div>
          <span class="chevron ${isExpanded?'open':''}">▶</span>
        </div>
        ${dropdownHtml}
      </div>`;
    }).join('');
  }

  function toggleWeekExpand(wnum){
    expandedWeek = (expandedWeek === wnum) ? null : wnum;
    if(weeksWithContent.includes(wnum)) openWeek(wnum);
    else renderSidebar();
  }

  function toggleDayTopic(wnum, dayKey, el){
    dayTopicDone[wnum + '-' + dayKey] = el.checked;
    renderSidebar();
  }

  function selectWeekDay(wnum, dayKey){
    expandedWeek = wnum;
    currentDay = dayKey;
    openWeek(wnum);
    closeSidebar();
  }

  function openWeek(wnum){
    currentWeekNum = wnum;
    renderSidebar();
    const w = WEEKS.find(x => x.w === wnum);
    document.getElementById('week-subheading').textContent = `Week ${w.w} · Term 1 · ${w.dates} · Theme: ${w.theme}`;
    const body = document.getElementById('week-body');
    if(weeksWithContent.includes(wnum)){
      renderWeekBody();
    } else {
      body.innerHTML = `<div class="empty-state">Content for "${w.theme}" hasn't been authored in this rough demo yet — only Week 1 ("My Classroom") has the full daily lesson plan wired up.</div>`;
    }
  }

  function renderWeekBody(){
    const body = document.getElementById('week-body');
    body.innerHTML = `
      <div class="value-banner" id="value-banner"></div>
      <div id="day-summary"></div>
      <div id="rating-panel-container"></div>
      <div class="domain-grid" id="domain-grid"></div>
    `;
    renderDailyView();
  }

  const domainDone = {};   // key: day-domain -> true/false
  const dayRatings = {};   // key: day-domain -> {studentName: rating}

  function renderDailyView(){
    const day = DAYS.find(d => d.key === currentDay);
    document.getElementById('value-banner').innerHTML = `<strong>Value:</strong> ${alwaysEnglish(day.value)} &nbsp;·&nbsp; <strong>Link:</strong> ${alwaysEnglish(day.link)}`;

    let doneCount = 0;
    let cardsHtml = '';

    // Only render a card for domains that actually have content for
    // this specific week — e.g. Week 2's real plan doesn't include
    // Tidy & Put Away at all, so it should disappear rather than
    // show an empty "Not planned yet" placeholder.
    const weekPlan = WEEKLY_PLAN['wk' + currentWeekNum];
    const trackedDomains = DOMAINS.filter(dom => weekPlan && weekPlan[dom.key] !== undefined);

    trackedDomains.forEach(dom => {
      const activity = todaysActivity(dom.key);
      const key = currentDay + '-' + dom.key;
      const done = !!domainDone[key];
      if(done) doneCount++;

      if(!dom.h5p){
        // Plain checklist item, no game, no proficiency rating
        cardsHtml += `<div class="stage-card ${done?'done':''}">
          <div class="stage-head">
            <span class="name">${pickLang(dom.label)} <span class="stage-time">${dom.time}</span></span>
            <span class="stage-tag ${done?'done':''}">${done ? 'Done' : 'Not done'}</span>
          </div>
          <div class="materials-line">Planned activity: ${activity}</div>
          <div class="competency-tag">Covers: ${competencyFor(dom.key)}</div>
          <div class="stage-foot">
            <label class="mark-taught">
              <input type="checkbox" ${done?'checked':''} onchange="toggleDomainDone('${dom.key}', this)" />
              Mark as done today
            </label>
          </div>
        </div>`;
        return;
      }

      cardsHtml += `<div class="stage-card ${done?'done':''}" id="stage-card-${key}">
        <div class="stage-head">
          <span class="name">${pickLang(dom.label)} <span class="stage-time">${dom.time}</span></span>
          <button class="fullscreen-btn" onclick="toggleCardFullscreen('stage-card-${key}')" title="View full screen" aria-label="View full screen">⛶</button>
          <span class="stage-tag ${done?'done':''}">${done ? 'Done today' : 'Pending'}</span>
        </div>
        <div class="materials-line">Planned activity: ${activity}</div>
        <div class="competency-tag">Covers: ${competencyFor(dom.key)}</div>
        <div class="h5p-block">
          <div class="h5p-frame" id="${mountId(key)}">${done ? '<div class="h5p-done-msg">✓ Practised — nice work!</div>' : ''}</div>
        </div>
        <div class="stage-foot">
          <label class="mark-taught">
            <input type="checkbox" ${done?'checked':''} onchange="toggleDomainDone('${dom.key}', this)" />
            Mark as done today
          </label>
          <button class="btn-rate-open small" onclick="openRatingPanel('${dom.key}')">Enter proficiency</button>
        </div>
      </div>`;
    });

    document.getElementById('domain-grid').innerHTML = cardsHtml;
    document.getElementById('day-summary').innerHTML =
      `<div class="topic-complete-banner ${doneCount<trackedDomains.length ? 'pending' : ''}">${doneCount===trackedDomains.length?'✓ ':''}${doneCount} of ${trackedDomains.length} domains done for ${day.label}</div>`;

    trackedDomains.forEach(dom => { if(dom.h5p) mountH5pIfNeeded(dom.key); });
    document.getElementById('pending-count').textContent = DOMAINS.length - doneCount;

    renderTodayOverview();
  }

  function toggleDomainDone(domainKey, el){
    domainDone[currentDay + '-' + domainKey] = el.checked;
    renderDailyView();
  }

  function renderTodayOverview(){
    const el = document.getElementById('today-overview');
    if(!el) return;
    const day = DAYS.find(d => d.key === currentDay);

    const rows = DOMAINS.map(dom => {
      const activity = todaysActivity(dom.key);
      const done = !!domainDone[currentDay + '-' + dom.key];
      return `<div class="overview-row ${done ? 'done' : ''}">
        <span class="overview-time">${dom.time}</span>
        <span class="overview-domain">${pickLang(dom.label)}</span>
        <span class="overview-activity">${activity}</span>
        <span class="overview-status">${done ? '✓' : '•'}</span>
      </div>`;
    }).join('');

    el.innerHTML = `
      <div class="overview-header">
        <span>Today's plan — ${day.label}</span>
        <span class="overview-toggle" onclick="toggleOverview()">${overviewCollapsed ? 'Show' : 'Hide'}</span>
      </div>
      <div class="overview-body ${overviewCollapsed ? 'hidden' : ''}">${rows}</div>
    `;
  }

  let overviewCollapsed = false;
  function toggleOverview(){
    overviewCollapsed = !overviewCollapsed;
    renderTodayOverview();
  }


  function mountId(key){ return 'h5p-mount-' + key.replace(/[^a-zA-Z0-9]/g,'_'); }

  function mountH5pIfNeeded(domainKey){
    const key = currentDay + '-' + domainKey;
    if(domainDone[key]) return; // already taught — done message is shown instead
    const el = document.getElementById(mountId(key));
    const renderer = ACTIVITY_RENDERERS[domainKey];
    if(el && renderer){
      renderer(el, function(){
        domainDone[key] = true;
        renderDailyView();
      });
    }
  }

  function openRatingPanel(domainKey){
    const key = currentDay + '-' + domainKey;
    const existing = dayRatings[key] || {};
    const domainLabel = DOMAINS.find(d=>d.key===domainKey).label;
    const dayLabel = DAYS.find(d=>d.key===currentDay).label;
    const competencyText = competencyFor(domainKey);

    let html = `<div class="rating-panel">
      <p class="rp-title">Enter proficiency — ${domainLabel}, ${dayLabel}</p>
      <p class="rp-competency"><strong>Covers:</strong> ${competencyText}</p>`;
    SAMPLE_STUDENTS.forEach(name => {
      const current = existing[name] || '';
      html += `<div class="rp-row"><span>${name}</span>
        <select id="rate-${name.replace(/\s/g,'_')}">
          <option value="">— Select —</option>
          ${RATING_LEVELS.map(l => `<option value="${l}" ${current===l?'selected':''}>${l}</option>`).join('')}
        </select></div>`;
    });
    html += `<div class="rp-actions">
        <button class="btn-save" onclick="saveRatings('${domainKey}')">Save ratings</button>
        <button class="btn-cancel" onclick="closeRatingPanel()">Cancel</button>
      </div></div>`;
    document.getElementById('rating-panel-container').innerHTML = html;
    document.getElementById('rating-panel-container').scrollIntoView({behavior:'smooth', block:'center'});
  }

  function saveRatings(domainKey){
    const key = currentDay + '-' + domainKey;
    const ratings = {};
    SAMPLE_STUDENTS.forEach(name => {
      const sel = document.getElementById(`rate-${name.replace(/\s/g,'_')}`);
      if(sel && sel.value) ratings[name] = sel.value;
    });
    dayRatings[key] = ratings;
    closeRatingPanel();
  }

  function closeRatingPanel(){
    document.getElementById('rating-panel-container').innerHTML = '';
  }

/* =========================================================
   SESSION RESUME — on page load, check whether there's already a
   real logged-in session (e.g. after clicking "Preview as Teacher"
   from Super Admin, or simply reloading this page while logged in)
   and skip straight to the dashboard instead of showing the login
   form again. If not logged in, the login form just stays visible,
   same as before this existed.

   Runs last, after every function/variable it calls is already
   defined — same ordering reason the old dev-bypass trigger used
   to need this position.
   ========================================================= */
  
// -------------------------------------------------------------------------
// PREVIEW BANNER — shown only when a superadmin is currently previewing
// the teacher role (see backend/preview_as.php). Lets them get back to
// their real superadmin session with one click, no re-login needed.
// -------------------------------------------------------------------------
  /* ===================== SECTION 12: REMAINING SIDEBAR SCREENS ===================== */
  // All 11 of these are deliberately frontend-only placeholder views —
  // sample/computed data, no new backend endpoints, same "frontend
  // first" pattern used everywhere else in this app so far. The 5
  // student-dependent ones (My Class, Class Progress, Attendance
  // Register, Admissions, Monthly Assessment, Child Record, Transition)
  // are blocked on a real `students` table — this reuses the existing
  // SAMPLE_STUDENTS list as a stand-in until that table exists.
  //
  // Deterministic pseudo-random helper — same purpose as the old
  // prototype's rng(): stable sample numbers that don't re-shuffle on
  // every render, without needing a real backend or true randomness.
  function sampleHash(str){
    let h = 2166136261;
    for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }
  function sampleRand(seed){ return (sampleHash(seed) % 1000) / 1000; }
  function samplePick(seed, arr){ return arr[Math.floor(sampleRand(seed) * arr.length)]; }

  // ---------- 1. MY CLASS ----------
  // Matches the real prototype's vTeacherClass exactly: same tiles, same
  // table columns, same wording/req codes — pulled directly from the
  // prototype's source rather than guessed at from a screenshot.
  const OCCUPATIONS = ['Daily wage labour','Auto / taxi driver','Domestic work','Tailoring','Homemaker','Unemployed','Self-employed / small trade','Salaried'];
  const LANGUAGES_AT_HOME = ['Hindi','Marathi','Telugu','Bhojpuri','Gujarati'];
  const INCOME_BANDS = ['Under ₹5,000','₹5,000–10,000','₹15,000–25,000','Prefer not to say'];

  function sampleFamily(name){
    const occA = samplePick(name + 'occA', OCCUPATIONS);
    const occB = samplePick(name + 'occB', OCCUPATIONS);
    const langCount = 1 + Math.floor(sampleRand(name + 'langn') * 2);
    const langs = [samplePick(name + 'lang1', LANGUAGES_AT_HOME)];
    if(langCount > 1){
      const second = samplePick(name + 'lang2', LANGUAGES_AT_HOME);
      if(!langs.includes(second)) langs.push(second);
    }
    return {
      guardians: [{occ: occA}, {occ: occB}],
      langs,
      reads: sampleRand(name + 'reads') > 0.3,
      income: samplePick(name + 'inc', INCOME_BANDS),
      complete: Math.round(40 + sampleRand(name + 'complete') * 60),
      consent: sampleRand(name + 'consent') > 0.15,
      photoConsent: sampleRand(name + 'photoconsent') > 0.35
    };
  }
  function sampleHomeActStatus(name){
    return samplePick(name + 'homeact', ['done', 'partly done', 'not done', 'not asked']);
  }

  // ---------- 1. MY CLASS — weekly activity performance ----------
  // One row per child, one column per session domain (each mapped to
  // its Curricular Goal). The teacher rates each child once per domain
  // per week on the same B / P / A scale used everywhere else in the
  // app. Real data only: ratings come from child_activity_ratings via
  // get_child_activity_ratings.php; "held" counts come from the real
  // session-done records (sessionDoneEntries). Nothing rated = "·".
  let myClassViewWeek = null;          // null = follow currentWeekNum
  let myClassRatingPopupKey = null;    // 'pupilId|domainKey' of the one open popup, or null
  let myClassRatingSaveError = '';     // shown above the table if a save fails
  let childActivityRatings = {};       // week -> { pupilId: { domainKey: 'E'|'P'|'A' } }
  let childActivityRatingsStatus = {}; // week -> 'loading' | 'loaded' | 'error'
  let myClassPlanFetchTried = {};      // week -> true once we've asked for that week's session records

  function myClassWeek(){
    return myClassViewWeek === null ? currentWeekNum : myClassViewWeek;
  }
  function shiftMyClassWeek(delta){
    const firstWeek = (typeof WEEKS !== 'undefined' && WEEKS.length) ? WEEKS[0].w : 1;
    const next = myClassWeek() + delta;
    if(next < firstWeek || next > currentWeekNum) return; // no rating future weeks
    myClassViewWeek = next;
    myClassRatingPopupKey = null;
    renderMyClass();
  }

  async function fetchChildActivityRatings(week){
    if(!myClassInfo.class_id) return;
    childActivityRatingsStatus[week] = 'loading';
    try{
      const params = new URLSearchParams(window.location.search);
      params.set('class_id', myClassInfo.class_id);
      params.set('week_number', week);
      const res = await fetch('backend/assessment/activity/get_child_activity_ratings.php?' + params.toString());
      const data = await res.json();
      if(data.status === 'success'){
        childActivityRatings[week] = data.ratings || {};
        childActivityRatingsStatus[week] = 'loaded';
      } else {
        childActivityRatingsStatus[week] = 'error';
      }
    } catch(err){
      childActivityRatingsStatus[week] = 'error';
    }
    renderMyClass();
    if(typeof assessmentRecordsRerender === 'function') assessmentRecordsRerender();
  }

  function toggleMyClassRatingPopup(pupilId, domainKey){
    const key = pupilId + '|' + domainKey;
    myClassRatingPopupKey = (myClassRatingPopupKey === key) ? null : key;
    renderMyClass();
  }

  async function setChildActivityRating(pupilId, domainKey, rating){
    const week = myClassWeek();
    if(!childActivityRatings[week]) childActivityRatings[week] = {};
    if(!childActivityRatings[week][pupilId]) childActivityRatings[week][pupilId] = {};
    const previous = childActivityRatings[week][pupilId][domainKey] || null;

    // Optimistic local update so the tap feels instant
    if(rating) childActivityRatings[week][pupilId][domainKey] = rating;
    else delete childActivityRatings[week][pupilId][domainKey];
    myClassRatingPopupKey = null;
    myClassRatingSaveError = '';
    renderMyClass();

    try{
      const res = await fetch('backend/assessment/activity/save_child_activity_rating.php' + window.location.search, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ class_id: myClassInfo.class_id, week_number: week, pupil_id: pupilId, domain_key: domainKey, rating: rating || null })
      });
      const data = await res.json();
      if(data.status !== 'success') throw new Error(data.message || 'Save failed');
    } catch(err){
      // Put back what the server actually has, and say so
      if(previous) childActivityRatings[week][pupilId][domainKey] = previous;
      else delete childActivityRatings[week][pupilId][domainKey];
      myClassRatingSaveError = 'Could not save that rating — it has been undone. Check your connection and try again.';
      renderMyClass();
    }
  }

  function myClassRatingCell(pupilId, domainKey, rating){
    const key = pupilId + '|' + domainKey;
    const isOpen = myClassRatingPopupKey === key;
    const badge = rating
      ? `<span onclick="toggleMyClassRatingPopup(${pupilId},'${domainKey}')" class="pill ${TIER_INFO[rating].c}" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; font-size:12px; font-weight:600;" title="${TIER_INFO[rating].n} — tap to change">${TIER_INFO[rating].letter}</span>`
      : `<span onclick="toggleMyClassRatingPopup(${pupilId},'${domainKey}')" class="dim" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:6px; border:1px dashed #0b0b0b55;" title="Not rated — tap to rate">·</span>`;
    const popup = isOpen ? `
      <div style="position:absolute; top:30px; left:50%; transform:translateX(-50%); z-index:20; background:#fff; border:1px solid #0b0b0b33; border-radius:8px; padding:4px; display:flex; gap:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); white-space:nowrap;">
        ${['E','P','A'].map(t => `<span onclick="setChildActivityRating(${pupilId},'${domainKey}','${t}')" class="pill ${TIER_INFO[t].c}" style="cursor:pointer; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px; font-size:12px; font-weight:600;" title="${TIER_INFO[t].n}">${TIER_INFO[t].letter}</span>`).join('')}
        ${rating ? `<span onclick="setChildActivityRating(${pupilId},'${domainKey}',null)" class="dim" style="cursor:pointer; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px; border:1px solid #0b0b0b22;" title="Clear rating">✕</span>` : ''}
      </div>` : '';
    return `<td style="text-align:center; position:relative;">${badge}${popup}</td>`;
  }

function renderMyClass() {
  const container = document.getElementById('myclass-body');
  if (!container) return;

  container.innerHTML = '';

  // ---------------------------------------------------------
  // MY CLASS
  // ---------------------------------------------------------
  // This section is ONLY for Family & Parents information.
  // Attendance, assessment and activity data are intentionally
  // NOT rendered here.
  // ---------------------------------------------------------

  renderTeacherFilterBar(container, renderMyClass);

  // ---------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------

  const loadingCard = document.createElement('div');
  loadingCard.className = 'card';
  loadingCard.style.padding = '24px';

  loadingCard.innerHTML = `
    <div style="font-weight:700; margin-bottom:6px;">
      Loading family information…
    </div>

    <div class="cap">
      Fetching parent and guardian information for your class.
    </div>
  `;

  container.appendChild(loadingCard);

  // ---------------------------------------------------------
  // Get the real pupil roster
  // ---------------------------------------------------------

  if (!Array.isArray(realPupilsCache)) {

    if (realPupilsCache !== 'loading') {
      realPupilsCache = 'loading';
      fetchMyPupils();
    }

    return;
  }

  const pupils = realPupilsCache;

  if (!pupils.length) {

    loadingCard.remove();

    const emptyCard = document.createElement('div');

    emptyCard.className = 'card';
    emptyCard.style.padding = '24px';

    emptyCard.innerHTML = `
      <div style="font-weight:700; margin-bottom:6px;">
        No pupils found
      </div>

      <div class="cap">
        No pupils are currently assigned to this class.
      </div>
    `;

    container.appendChild(emptyCard);

    return;
  }

  // ---------------------------------------------------------
  // Find the class ID
  // ---------------------------------------------------------

  const classId =
    (typeof myClassInfo !== 'undefined' && (
      myClassInfo.class_id ||
      myClassInfo.classId ||
      myClassInfo.id
    )) ||

    window.currentClassId ||

    window.classId ||

    new URLSearchParams(window.location.search).get('class_id');

  if (!classId) {

    loadingCard.remove();

    const errorCard = document.createElement('div');

    errorCard.className = 'card';
    errorCard.style.padding = '24px';

    errorCard.innerHTML = `
      <div style="font-weight:700; color:#c8433f; margin-bottom:6px;">
        Class information unavailable
      </div>

      <div class="cap">
        The class ID could not be determined, so Family & Parents
        information cannot be loaded.
      </div>
    `;

    container.appendChild(errorCard);

    return;
  }

  // ---------------------------------------------------------
  // Fetch existing Family & Parents data
  // ---------------------------------------------------------

  fetch(
    `backend/pupils/get_family_profiles.php?class_id=${encodeURIComponent(classId)}`,
    {
      credentials: 'include',
      cache: 'no-store'
    }
  )

    .then(async response => {

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        throw new Error(
          data.message || 'Could not load Family & Parents data.'
        );
      }

      return data;
    })

    .then(data => {

      loadingCard.remove();

      const profiles = data.profiles || {};

      // -----------------------------------------------------
      // Heading
      // -----------------------------------------------------

      const heading = document.createElement('div');

      heading.style.marginBottom = '18px';

      heading.innerHTML = `
        <div style="
          font-size:24px;
          font-weight:800;
          margin-bottom:5px;
        ">
          My Class
        </div>

        <div class="cap">
          Parent and guardian information for the children in your class.
        </div>
      `;

      container.appendChild(heading);

      // -----------------------------------------------------
      // Summary
      // -----------------------------------------------------

      const summary = document.createElement('div');

      summary.className = 'card';

      summary.style.marginBottom = '18px';

      summary.innerHTML = `
        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
        ">

          <div>
            <div style="
              font-size:13px;
              font-weight:700;
              text-transform:uppercase;
              letter-spacing:.06em;
              color:#6b7280;
            ">
              Class roster
            </div>

            <div style="
              font-size:24px;
              font-weight:800;
              margin-top:4px;
            ">
              ${pupils.length} children
            </div>
          </div>

          <div>
            ${mdPill(
              'Family & Parents',
              'info'
            )}
          </div>

        </div>
      `;

      container.appendChild(summary);

      // -----------------------------------------------------
      // Helpers
      // -----------------------------------------------------

      function firstValue(object, keys) {

        if (!object || typeof object !== 'object') {
          return '';
        }

        for (const key of keys) {

          if (
            object[key] !== undefined &&
            object[key] !== null &&
            String(object[key]).trim() !== ''
          ) {
            return String(object[key]).trim();
          }
        }

        return '';
      }

      function formatGuardian(guardian) {

        if (!guardian || typeof guardian !== 'object') {
          return {
            name: '',
            relationship: '',
            contact: ''
          };
        }

        const name = firstValue(
          guardian,
          [
            'name',
            'full_name',
            'fullName',
            'guardian_name',
            'guardianName',
            'parent_name',
            'parentName'
          ]
        );

        const relationship = firstValue(
          guardian,
          [
            'relationship',
            'relation',
            'relationship_to_child',
            'relation_to_child',
            'relationToChild'
          ]
        );

        const contact = firstValue(
          guardian,
          [
            'phone',
            'mobile',
            'phone_number',
            'mobile_number',
            'contact',
            'contact_number',
            'contactNumber'
          ]
        );

        return {
          name,
          relationship,
          contact
        };
      }

      function getProfileForPupil(pupil) {

        // Current backend returns profiles keyed by pupil name.
        if (
          pupil &&
          pupil.name &&
          profiles[pupil.name]
        ) {
          return profiles[pupil.name];
        }

        // Additional safe lookup by pupil ID.
        if (
          pupil &&
          pupil.id &&
          profiles[pupil.id]
        ) {
          return profiles[pupil.id];
        }

        if (
          pupil &&
          pupil.pupil_id &&
          profiles[pupil.pupil_id]
        ) {
          return profiles[pupil.pupil_id];
        }

        return null;
      }

      // -----------------------------------------------------
      // Parent involvement
      // -----------------------------------------------------

      function getParentInvolvement(profile) {

        if (!profile) {
          return 'Not available';
        }

        if (
          profile.willingToVolunteer === true ||
          profile.willing_to_volunteer === true
        ) {
          return 'Volunteer';
        }

        if (
          profile.willingToVolunteer === false ||
          profile.willing_to_volunteer === false
        ) {
          return 'Not volunteering';
        }

        return 'Not recorded';
      }

      // -----------------------------------------------------
      // Build table
      // -----------------------------------------------------

      const tableWrapper = document.createElement('div');

      tableWrapper.className = 'report-table-wrap';

      let html = `
        <table class="report-table">

          <thead>
            <tr>

              <th>Child</th>

              <th>Parent / Guardian</th>

              <th>Relationship</th>

              <th>Contact</th>

              <th>Parent Involvement</th>

              <th>Profile</th>

            </tr>
          </thead>

          <tbody>
      `;

      pupils.forEach(pupil => {

        const childName =
          pupil.name ||
          pupil.pupil_name ||
          'Unnamed child';

        const profile =
          getProfileForPupil(pupil);

        const guardians =
          profile &&
          Array.isArray(profile.guardians)
            ? profile.guardians
            : [];

        // ---------------------------------------------------
        // Guardian display
        // ---------------------------------------------------

        let guardianRows = [];

        guardians.forEach(guardian => {

          const formatted =
            formatGuardian(guardian);

          if (
            formatted.name ||
            formatted.relationship ||
            formatted.contact
          ) {

            guardianRows.push(formatted);
          }
        });

        // ---------------------------------------------------
        // No guardian information
        // ---------------------------------------------------

        if (!guardianRows.length) {

          html += `
            <tr>

              <td>
                <strong>
                  ${esc(childName)}
                </strong>
              </td>

              <td>
                <span class="cap">
                  Not available
                </span>
              </td>

              <td>
                <span class="cap">
                  —
                </span>
              </td>

              <td>
                <span class="cap">
                  —
                </span>
              </td>

              <td>
                ${mdPill(
                  getParentInvolvement(profile),
                  'neu'
                )}
              </td>

              <td>
                ${profile
                  ? mdPill('Available', 'good')
                  : mdPill('Not imported', 'neu')
                }
              </td>

            </tr>
          `;

          return;
        }

        // ---------------------------------------------------
        // Multiple guardians
        // ---------------------------------------------------

        guardianRows.forEach((guardian, index) => {

          html += `
            <tr>

              <td>
                ${
                  index === 0
                    ? `<strong>${esc(childName)}</strong>`
                    : `<span class="cap">↳ Additional guardian</span>`
                }
              </td>

              <td>
                <strong>
                  ${esc(guardian.name || 'Not recorded')}
                </strong>
              </td>

              <td>
                ${esc(
                  guardian.relationship || '—'
                )}
              </td>

              <td>
                ${
                  guardian.contact
                    ? `<span>${esc(guardian.contact)}</span>`
                    : '<span class="cap">—</span>'
                }
              </td>

              <td>
                ${mdPill(
                  getParentInvolvement(profile),
                  profile &&
                  (
                    profile.willingToVolunteer === true ||
                    profile.willing_to_volunteer === true
                  )
                    ? 'good'
                    : 'neu'
                )}
              </td>

              <td>
                ${mdPill(
                  'Available',
                  'good'
                )}
              </td>

            </tr>
          `;
        });

      });

      html += `
          </tbody>
        </table>
      `;

      tableWrapper.innerHTML = html;

      container.appendChild(tableWrapper);

    })

    .catch(error => {

      console.error(
        'My Class family profile error:',
        error
      );

      loadingCard.remove();

      const errorCard = document.createElement('div');

      errorCard.className = 'card';

      errorCard.style.padding = '24px';

      errorCard.innerHTML = `
        <div style="
          font-weight:700;
          color:#c8433f;
          margin-bottom:7px;
        ">
          Could not load Family & Parents information
        </div>

        <div class="cap">
          ${esc(
            error.message ||
            'Unknown error while loading family information.'
          )}
        </div>

        <button
          class="btn-primary"
          style="
            margin-top:14px;
            width:auto;
            padding:9px 16px;
          "
          onclick="renderMyClass()"
        >
          Retry
        </button>
      `;

      container.appendChild(errorCard);
    });
}



  // ---------- 2. CLASS PROGRESS ----------
  // Matches the real prototype's vTeacherProgress structure — same
  // tile set and the same B/P/A tier grid per child per domain. The
  // underlying SRI/CPI/ARI formulas and dumbbell/stack charts from the
  // original are NOT reproduced (they depend on a full assessment
  // history this app doesn't have yet) — tile numbers here are sample
  // data shaped to look the same, not the real formula output.
  // Internal tier code stays 'E' (touched by dozens of calculations in
  // Dashboard/Transition/Child Record/PDF export) — only what's shown
  // to a person changes, via .letter/.n below. Renaming the storage
  // code itself would mean re-verifying every one of those call sites;
  // this way the display changes everywhere at once, safely.
  const TIER_INFO = { E: {n:'Beginner', c:'crit', letter:'B'}, P: {n:'Proficient', c:'warn', letter:'P'}, A: {n:'Advanced', c:'good', letter:'A'} };
