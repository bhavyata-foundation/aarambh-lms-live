function renderMonthlyEffective(){
    const container = document.getElementById('monthlyeffective-body');
    container.innerHTML = '';
    container.appendChild(renderEffectiveTabBar('monthlyeffective'));
    pruneDeletedEffectiveScan(calendarYear, calendarMonth); // background check — self-corrects via re-render above if the scan's actually gone
    // Non-blocking — pull in real pupils if they haven't loaded yet,
    // so the attendance % figure below self-corrects once they
    // arrive, instead of silently staying at 0% forever. The rest of
    // this page doesn't depend on pupils, so it still renders now
    // rather than waiting.
    if(realPupilsCache === null){
      if(!pupilsLoadedRerenderTargets.includes(renderMonthlyEffective)) pupilsLoadedRerenderTargets.push(renderMonthlyEffective);
      fetchMyPupils();
    }
    const year = calendarYear, month = calendarMonth;
    const monthName = new Date(year, month, 1).toLocaleDateString([], {month:'long', year:'numeric'});
    const dueDay = 25;
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const daysLeftToDue = isCurrentMonth ? dueDay - today.getDate() : null;
    // Real figures — same computations Attendance Dashboard and My
    // Compliance already use, so this return can never disagree with
    // what those screens show for the same month.
    const studentStats = computeAttendanceDashboardStats(year, month);
    const complianceStats = computeComplianceStatsForMonth(year, month);
    const studentDays = studentStats.studentDays;
    const registerMarked = studentStats.daysMarked;
    const unmarkedDays = Math.max(studentDays - registerMarked, 0);
    const enrolled = Array.isArray(realPupilsCache) ? realPupilsCache.length : 0;
    // Leave days taken — every real day this month the teacher marked
    // herself absent, whatever day of the week it fell on.
    const teacherMonthRecords = getMonthAttendanceRecords(year, month);
    const leaveDays = Object.values(teacherMonthRecords).filter(r => r.status === 'leave').length;
    container.appendChild(mdSec('Monthly Effective Return', '<span class="reqs">EFF-02…06</span>'));
    const effSubhead = document.createElement('p');
    effSubhead.className = 'cap'; effSubhead.style.margin = '4px 0 16px';
    effSubhead.textContent = `${sampleTeacherProfile().name} · ${myClassInfo.school_name} · ${myClassInfo.class_name}`;
    container.appendChild(effSubhead);
    const statGrid4 = mdGrid('g4', [
      mdTile('Reporting month', new Date(year, month, 1).toLocaleDateString([], {month:'long'}), year + ' · Jr KG', isCurrentMonth ? mdPill(daysLeftToDue > 0 ? 'Not yet due' : 'Overdue', daysLeftToDue > 0 ? 'neu' : 'crit') : mdPill('Past month', 'neu'), 'EFF-02'),
      mdTile('Due to my supervisor', isCurrentMonth ? (daysLeftToDue > 0 ? daysLeftToDue + ' days left' : 'Overdue') : '—', 'the 25th, or the last school day before it', isCurrentMonth ? mdPill(daysLeftToDue > 0 ? 'Not yet due' : 'Overdue', daysLeftToDue > 0 ? 'neu' : 'crit') : mdPill('N/A', 'neu'), 'EFF-03'),
      mdTile('Effective strength', studentStats.hasData ? studentStats.effectiveStrength : '—', studentStats.hasData ? 'of ' + enrolled + ' children' : '', studentStats.hasData ? mdPill(studentStats.effectiveStrength + ' of ' + enrolled + ' children', 'neu') : mdPill('No data yet', 'neu'), 'ADB-14', studentStats.hasData ? mdMeter(studentStats.effectiveStrength / enrolled * 100) : null),
      mdTile('Register complete', registerMarked, 'of ' + studentDays + ' days', unmarkedDays ? mdPill(unmarkedDays + ' days open', 'crit') : mdPill('Complete', 'good'), 'REG-04', mdMeter(studentDays ? registerMarked / studentDays * 100 : 0))
    ]);
    statGrid4.style.marginBottom = '22px';
    container.appendChild(statGrid4);
    if(unmarkedDays){
      const warnCard = mdCard('The register for this month is not complete',
        unmarkedDays + ' of ' + studentDays + ' student days have no register. EFF-06 will not let the Effective be submitted on an incomplete register — every figure below is computed on ' + registerMarked + ' days, and submitting it would put a number on the MCGM file that nobody can reproduce.', null);
      warnCard.style.marginBottom = '22px';
      container.appendChild(warnCard);
    }
    container.appendChild(mdSec('The return', '<span class="reqs">EFF-05</span>'));
    const linesWrap = document.createElement('div'); linesWrap.className = 'list';
    linesWrap.innerHTML = [
      ['Children on roll at month end', enrolled, ''],
      ['Student attendance', studentStats.hasData ? studentStats.attendancePct : '—', studentStats.hasData ? '%' : ''],
      ['Teacher attendance', complianceStats.myAttendancePct, '%'],
      ['Leave days taken', leaveDays, leaveDays === 1 ? 'day' : 'days'],
      ['Daily activities completed', complianceStats.plansSubmittedPct, '% of days due'],
      ['Congruent with the week', complianceStats.congruentPct, '% of sessions']
    ].map(([k, v, unit]) => `<div class="row"><div class="t"><b>${esc(k)}</b></div><div>${esc(String(v))} ${esc(unit)}</div></div>`).join('');
    const printCard = document.createElement('div');
    printCard.className = 'card'; printCard.style.padding = '0'; printCard.style.marginBottom = '22px'; printCard.style.overflow = 'hidden';
    printCard.innerHTML = `
      <div onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.chevron').style.transform = this.nextElementSibling.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';"
           style="display:flex; align-items:center; justify-content:space-between; padding:18px 22px; cursor:pointer;">
        <div>
          <h3 style="margin:0 0 2px; font-family:var(--disp); font-size:14px; font-weight:700; letter-spacing:-.005em;">What the portal will print</h3>
          <p class="cap" style="margin:0;">Every line is computed from what has already been entered this month — tap to see the detail.</p>
        </div>
        <span class="chevron" style="transition:transform .15s; font-size:14px; color:var(--text-muted); flex-shrink:0; margin-left:12px;">▶</span>
      </div>
      <div class="hidden" style="padding:0 22px 22px;"></div>
    `;
    printCard.querySelector('div.hidden').appendChild(linesWrap);
    const printCardExplainer = document.createElement('p');
    printCardExplainer.className = 'cap'; printCardExplainer.style.margin = '0 0 12px';
    printCardExplainer.textContent = 'Nothing here is typed twice — the point of the return is the signature, not the arithmetic. Student attendance, teacher attendance, leave days, and daily activity completion are all real, pulled from the same records used elsewhere in this app.';
    printCard.querySelector('div.hidden').insertBefore(printCardExplainer, linesWrap);
        container.appendChild(printCard);
    // ---- Section tabs — Month by Month and Sign-off & Submission
    // used to sit stacked on one long page; splitting them keeps the
    // overview above (stats, warning, print preview) short and lets
    // each section stand on its own instead of blending together.
    const effTabBar = document.createElement('div');
    effTabBar.style.cssText = 'display:flex; gap:8px; margin:4px 0 20px; flex-wrap:wrap;';
    [
      { key: 'monthbymonth', label: '📅 Month by Month' },
      { key: 'signoff', label: '✍️ Sign-off & Submission' }
    ].forEach(t => {
      const active = t.key === monthlyEffectiveActiveTab;
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.cssText = `padding:9px 18px; border-radius:20px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:13px; font-weight:600; cursor:pointer;`;
      btn.onclick = () => { monthlyEffectiveActiveTab = t.key; renderMonthlyEffective(); };
      effTabBar.appendChild(btn);
    });
    container.appendChild(effTabBar);
    const monthlyEffMonthByMonthPanel = document.createElement('div');
    monthlyEffMonthByMonthPanel.className = monthlyEffectiveActiveTab === 'monthbymonth' ? '' : 'hidden';
    container.appendChild(monthlyEffMonthByMonthPanel);
    const monthlyEffSignoffPanel = document.createElement('div');
    monthlyEffSignoffPanel.className = monthlyEffectiveActiveTab === 'signoff' ? '' : 'hidden';
    container.appendChild(monthlyEffSignoffPanel);
    // ---- Effective, month by month — every academic month so far,
    // ---- Effective, month by month — every academic month so far,
    // same real computations as above, one row each. ----
        monthlyEffMonthByMonthPanel.appendChild(reportDownloadBar(() => monthlyEffMonthByMonthPanel, 'Monthly Effective — month by month', 'monthly-effective'));
        monthlyEffMonthByMonthPanel.appendChild(mdSec('Effective — month by month', '<span class="reqs">EFF-05 · REP-10</span>'));
    const teacherName = sampleTeacherProfile().name;
    const mbmNote = document.createElement('p');
    mbmNote.className = 'cap'; mbmNote.style.margin = '4px 0 16px';
    mbmNote.innerHTML = `${esc(teacherName)} · ${esc(myClassInfo.school_name)} · ${esc(myClassInfo.class_name)} — every academic month so far this year, same figures as the return above.`;
    monthlyEffMonthByMonthPanel.appendChild(mbmNote);
    const curIdx = ACADEMIC_MONTHS.indexOf(today.getMonth());
    const monthsSoFar = curIdx >= 0 ? ACADEMIC_MONTHS.slice(0, curIdx + 1) : ACADEMIC_MONTHS.slice(0, ACADEMIC_MONTHS.indexOf(month) + 1);
    let mbmTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr>' +
      '<th>Month</th><th>Student attendance</th><th>Teacher attendance</th><th>Leave days</th><th>Daily activities</th><th>Register</th><th>Sign-off</th></tr></thead><tbody>';
    monthsSoFar.forEach(m => {
      const mLabel = new Date(year, m, 1).toLocaleDateString([], {month:'long', year:'numeric'});
      const mStudent = computeAttendanceDashboardStats(year, m);
      const mCompliance = computeComplianceStatsForMonth(year, m);
      const mRecord = getMonthlyEffectiveRecord(year, m);
      const mSigned = !!(mRecord.submittedToFoundation);
      const mLeaveReal = Object.values(getMonthAttendanceRecords(year, m)).filter(r => r.status === 'leave').length;
      const mTeacherHasData = mCompliance.myAttendancePct > 0 || mLeaveReal > 0;
      // Past months this app was never actually used in have nothing
      // real to show — rather than a row of dashes, fall back to
      // representative sample figures (same seeded-random convention
      // used elsewhere in this app), clearly marked as sample so
      // they're never mistaken for the real thing.
      const isSample = !mStudent.hasData && !mTeacherHasData; // = nothing real recorded this month
      if(isSample){
        mbmTable += `<tr${m === month ? ' style="background:var(--bg);"' : ''}><td><b>${esc(mLabel)}</b></td><td colspan="5" class="dim" style="text-align:left;">No data available</td><td>${mSigned ? mdPill('Submitted', 'good') : (mRecord.salaryDisbursed ? mdPill('Disbursed', 'good') : mdPill('Pending', 'warn'))}</td></tr>`;
        return;
      }
      // Both percentages now use the "unmarked counts against you"
      // versions: student attendance is the whole class's real present
      // count divided by every real working day × roll (not just
      // marked days); teacher attendance is real present days divided
      // by every real teacher working day this month (not just marked
      // days).
      const sStudentPct = isSample ? Math.round(78 + sampleRand(m + 'effstud') * 20) : mStudent.classWidePct;
      const sTeacherPct = isSample ? Math.round(85 + sampleRand(m + 'effteach') * 15) : mCompliance.teacherClassWidePct;
      const sLeave = isSample ? Math.floor(sampleRand(m + 'effleave') * 3) : mLeaveReal;
      const sDaily = isSample ? Math.round(60 + sampleRand(m + 'effdaily') * 35) : mCompliance.plansSubmittedPct;
      const sRegisterMarked = isSample ? Math.round(mStudent.studentDays * (0.8 + sampleRand(m + 'effreg') * 0.2)) : mStudent.daysMarked;
      // Real counts under each percentage, so "%" is never a bare,
      // unverifiable number — this is what it's actually counting.
      const avgPresentPerDay = (!isSample && mStudent.studentDays) ? Math.round(mStudent.classWidePresentSlots / mStudent.studentDays * 10) / 10 : null;
      const studentCaption = isSample
        ? 'Sample figures'
        : `Avg ${avgPresentPerDay} of ${mStudent.roll} children present per working day, across ${mStudent.studentDays} working days (an unmarked day counts as none present)`;
      const teacherCaption = isSample
        ? 'Sample figures'
        : `Present ${mCompliance.presentCount} of ${mCompliance.teacherWorkingDaysTotal - mCompliance.leaveCount} working days${mCompliance.leaveCount ? ' (' + mCompliance.leaveCount + ' on approved leave, not counted)' : ''} — ${mCompliance.teacherWorkingDaysTotal - mCompliance.leaveCount - mCompliance.presentCount} absent or not marked`;
      mbmTable += `<tr${m === month ? ' style="background:var(--bg);"' : ''}>
        <td><b>${esc(mLabel)}</b>${isSample ? ' <span class="cap" style="font-weight:400;">(sample)</span>' : ''}</td>
        <td>${pctBar(sStudentPct, undefined, undefined, true)}<div class="cap" style="font-size:10px; margin-top:2px;">${studentCaption}</div></td>
        <td>${pctBar(sTeacherPct, undefined, undefined, true)}<div class="cap" style="font-size:10px; margin-top:2px;">${teacherCaption}</div></td>
        <td>${sLeave}</td>
        <td>${pctBar(sDaily, undefined, undefined, true)}</td>
        <td>${sRegisterMarked} / ${mStudent.studentDays}</td>
        <td>${mSigned ? mdPill('Submitted', 'good') : (mRecord.salaryDisbursed ? mdPill('Disbursed', 'good') : mdPill('Pending', 'warn'))}</td>
      </tr>`;
    });
    mbmTable += '</tbody></table></div>';
    const mbmWrap = document.createElement('div'); mbmWrap.innerHTML = mbmTable;
    const mbmCard = mdCard(null, 'The current month is highlighted. Months with nothing real recorded show "No data available" — nothing is estimated. Sign-off shows Signed once all three signatures are in for that month.', mbmWrap);
    mbmCard.style.marginBottom = '22px';
    monthlyEffMonthByMonthPanel.appendChild(mbmCard);
    // ---- The 4-step closing process ----
    // Foundation check → Principal sign → AO sign → submission to the
    // foundation office. Each step is strictly sequential — a locked
    // step shows why it's locked and cannot be actioned out of order.
    // No calendar here on purpose: sign-off is a monthly fact with a
    // due date (the 25th), not something that needs a day grid to
    // record.
    const effRecord = getMonthlyEffectiveRecord(year, month);
        monthlyEffSignoffPanel.appendChild(mdSec('Closing this month\'s return', '<span class="reqs">EFF-07…09</span>'));
    const monthNavRow = document.createElement('div');
    monthNavRow.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:4px;';
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '‹';
    prevBtn.style.cssText = 'width:32px; height:32px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:16px; cursor:pointer;';
    prevBtn.onclick = () => { calendarMonth--; if(calendarMonth < 0){ calendarMonth = 11; calendarYear--; } renderMonthlyEffective(); };
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '›';
    nextBtn.style.cssText = 'width:32px; height:32px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:16px; cursor:pointer;';
    nextBtn.onclick = () => { calendarMonth++; if(calendarMonth > 11){ calendarMonth = 0; calendarYear++; } renderMonthlyEffective(); };
    const monthNavLabel = document.createElement('span');
    monthNavLabel.style.cssText = 'font-weight:700; font-size:15px;';
    monthNavLabel.textContent = monthName;
    monthNavRow.appendChild(prevBtn); monthNavRow.appendChild(monthNavLabel); monthNavRow.appendChild(nextBtn);
    monthlyEffSignoffPanel.appendChild(monthNavRow);
    const dueNote = document.createElement('p');
    dueNote.className = 'cap'; dueNote.style.margin = '2px 0 16px';
    dueNote.textContent = 'Due to the foundation office by the ' + dueDay + 'th of the month.';
    monthlyEffSignoffPanel.appendChild(dueNote);
    // ---- TESTING ONLY — resets this month's entire closing workflow
    // (all 4 steps, both photos, and the real server-side approval row)
    // so the submit → supervisor-approve → sign-off loop can be run
    // through repeatedly while testing. Remove this button before
    // going live — it's not something a real teacher should have
    // access to, since it can undo a real supervisor's decision.
    const resetTestRow = document.createElement('div');
    resetTestRow.style.cssText = 'margin:0 0 16px;';
    const resetTestBtn = document.createElement('button');
    resetTestBtn.textContent = '↺ Reset this month (testing only)';
    resetTestBtn.style.cssText = 'padding:7px 14px; border-radius:8px; border:1px dashed var(--danger, #c8433f); background:#fff; color:var(--danger, #c8433f); font-size:12px; font-weight:600; cursor:pointer;';
    resetTestBtn.onclick = () => resetMonthlyEffectiveForTesting(year, month);
    resetTestRow.appendChild(resetTestBtn);
    monthlyEffSignoffPanel.appendChild(resetTestRow);
    // Real Supervisor-approval status — fetched from the backend, not
    // a local toggle. Everything else in this 4-step list is gated on
    // this coming back 'approved'.
    const approvalKey = monthlyEffectiveKey(year, month);
    let approval = effectiveApprovalCache[approvalKey];
    if(approval === undefined){ fetchEffectiveApprovalStatus(year, month); approval = 'loading'; }
    const step1Approved = (typeof approval === 'object') && approval.approval_status === 'approved';
    const step1Done = step1Approved; // Step 1 only counts as "done" once actually approved, not merely submitted
    const step1DoneDate = step1Approved ? (approval.decided_at || '').slice(0, 10) : null;
    const step2Sig = effRecord.signatures.principal;
    const step2Done = !!step2Sig;
    const step3Sig = effRecord.signatures.ao;
    const step3Done = !!step3Sig;
    const step4Done = !!effRecord.submittedToFoundation;
    function daysBetween(fromDateStr, toDateStr){
      if(!fromDateStr || !toDateStr) return null;
      const ms = new Date(toDateStr + 'T00:00:00') - new Date(fromDateStr + 'T00:00:00');
      return Math.round(ms / 86400000);
    }
    const stepsWrap = document.createElement('div');
    stepsWrap.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px; margin-bottom:22px;';
    // Square-style step card — badge sits above the title now (not
    // beside it), so each card reads as a compact tile rather than a
    // long horizontal row. photoWidget is only passed for Steps 2 & 3
    // (Principal/AO), since those are the ones with an actual paper
    // signature to photograph.
    function renderStep(num, title, done, doneDate, locked, lockedReason, bodyHtml, actionBtn, gapNote, photoWidget){
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'padding:16px; display:flex; flex-direction:column; gap:8px; min-height:150px;' + (locked ? ' opacity:.6;' : '');
      const badge = document.createElement('div');
      badge.style.cssText = 'flex-shrink:0; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; ' +
        (done ? 'background:var(--success); color:#fff;' : locked ? 'background:var(--bg); color:var(--text-muted); border:1px solid var(--border);' : 'background:var(--primary); color:#fff;');
      badge.textContent = done ? '✓' : String(num);
      card.appendChild(badge);
      const body = document.createElement('div');
      body.style.cssText = 'flex:1; min-width:0;';
      body.innerHTML = `<h4 style="margin:0 0 4px; font-size:13px;">Step ${num} · ${esc(title)}</h4>
        <span class="cap" style="margin:0; display:block; ${done ? 'color:var(--success);' : ''}">${done ? '✓ ' + esc(doneDate || 'Done') : locked ? '🔒 ' + esc(lockedReason) : 'Not yet done'}</span>` +
        (gapNote ? `<p class="cap" style="margin:4px 0 0; font-style:italic;">${esc(gapNote)}</p>` : '') +
        (bodyHtml || '');
      if(actionBtn || photoWidget){
        const actionRow = document.createElement('div');
        actionRow.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:8px;';
        if(actionBtn) actionRow.appendChild(actionBtn);
        if(photoWidget) actionRow.appendChild(photoWidget);
        body.appendChild(actionRow);
      }
      card.appendChild(body);
      stepsWrap.appendChild(card);
    }
    // Compact camera control for a signature step — shows a small
    // thumbnail once a photo's attached (tap to retake), otherwise a
    // single "📷 Photo of signature" button. Only meaningful once the
    // step itself is actually signed — no point photographing a
    // signature that hasn't happened yet.
    function buildSignaturePhotoWidget(role, sig){
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex; align-items:center; gap:6px;';
      const inputId = 'sigPhotoInput-' + role;
      const hasPhoto = sig && sig.photoDataUrl;
      wrap.innerHTML = (hasPhoto
        ? `<img src="${sig.photoDataUrl}" style="width:28px; height:28px; object-fit:cover; border-radius:6px; border:1px solid var(--border); cursor:pointer;" title="${esc(sig.photoFileName || 'Signature photo')}" onclick="document.getElementById('${inputId}').click()" />
           <span class="cap" style="color:var(--success);">✓ Photo attached</span>`
        : `<button type="button" onclick="document.getElementById('${inputId}').click()" style="padding:5px 9px; border-radius:6px; border:1px solid var(--border); background:#fff; font-size:11.5px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">📷 Photo of signature</button>`
        ) + `<input type="file" id="${inputId}" accept="image/*" capture="environment" style="display:none;" onchange="attachSignaturePhoto('${role}', this)" />`;
      return wrap;
    }
    // Step 1 — Foundation checks attendance + the Effective sheet data
    const effRecForStep1 = getMonthlyEffectiveRecord(calendarYear, calendarMonth);
    const hasRegisterPhoto = !!effRecForStep1.registerDriveLink;
    // Photo of the physical attendance/leave register — required before
    // submission can even happen, same evidence-before-action gate now
    // used for Materials' Distribute button. The supervisor reviewing
    // Step 1's submission checks this photo against the figures above,
    // not just a self-reported number with nothing behind it.
    const registerPhotoWidget = document.createElement('div');
    registerPhotoWidget.style.cssText = 'margin:6px 0 10px;';
    registerPhotoWidget.innerHTML = hasRegisterPhoto
      ? `<a href="${esc(effRecForStep1.registerDriveLink)}" target="_blank" rel="noopener" style="font-weight:600; font-size:12.5px;">🖼 ${esc(effRecForStep1.registerFileName || 'Attendance register photo')}</a> <span class="cap">· saved to Drive</span>
         <button onclick="removeMonthlyEffectiveRegisterPhoto()" style="margin-left:8px; padding:4px 9px; border-radius:6px; border:1px solid var(--border); background:#fff; font-size:11.5px; cursor:pointer;">Remove</button>`
      : `<input type="file" id="effRegisterInput" accept="image/*" capture="environment" onchange="handleMonthlyEffectiveRegisterPhoto(this)" style="font-size:12.5px;" />
         <span id="effRegisterStatus" class="cap" style="margin-left:8px;"></span>
         <p class="cap" style="margin:4px 0 0;">Photo of the physical attendance/leave register page for this month — required before submitting for approval.</p>`;
    let step1Body = '';
    let step1Btn = null;
    if(approval === 'loading'){
      step1Body = '<p class="cap" style="margin:0;">Checking status…</p>';
    } else if((typeof approval === 'object') && approval.approval_status === 'error'){
      step1Body = `<p class="cap" style="margin:0; color:var(--danger, #c8433f);">${esc(approval.message || 'Could not check approval status.')}</p>`;
    } else if(!approval || approval === 'none' || (typeof approval === 'object' && approval.approval_status === 'none')){
      if(hasRegisterPhoto){
        step1Btn = document.createElement('button');
        step1Btn.id = 'effSubmitApprovalBtn';
        step1Btn.textContent = 'Submit for foundation approval';
        step1Btn.style.cssText = 'padding:7px 12px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
        step1Btn.onclick = submitEffectiveForApproval;
      } else {
        step1Btn = document.createElement('button');
        step1Btn.textContent = 'Submit for foundation approval';
        step1Btn.disabled = true;
        step1Btn.title = 'Attach a photo of the attendance register above first';
        step1Btn.style.cssText = 'padding:7px 12px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; opacity:0.5; cursor:not-allowed;';
      }
    } else if(typeof approval === 'object' && approval.approval_status === 'pending'){
      step1Body = `<p class="cap" style="margin:0;">Submitted ${esc((approval.submitted_at || '').slice(0,10))} — awaiting review.</p>`;
    } else if(typeof approval === 'object' && approval.approval_status === 'rejected'){
      step1Body = `<p class="cap" style="margin:0 0 4px; color:var(--danger, #c8433f);">Sent back${approval.supervisor_note ? ': ' + esc(approval.supervisor_note) : '.'} Correct the figure above and resubmit.</p>`;
      if(hasRegisterPhoto){
        step1Btn = document.createElement('button');
        step1Btn.id = 'effSubmitApprovalBtn';
        step1Btn.textContent = 'Resubmit for approval';
        step1Btn.style.cssText = 'padding:7px 12px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
        step1Btn.onclick = submitEffectiveForApproval;
      } else {
        step1Btn = document.createElement('button');
        step1Btn.textContent = 'Resubmit for approval';
        step1Btn.disabled = true;
        step1Btn.title = 'Attach a photo of the attendance register above first';
        step1Btn.style.cssText = 'padding:7px 12px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; opacity:0.5; cursor:not-allowed;';
      }
    }
    // The photo widget shows regardless of approval state — it's
    // useful context (and removable) even once approved, not just a
    // pre-submission gate that disappears afterward.
    step1Body = registerPhotoWidget.outerHTML + step1Body;
    renderStep(1, 'Attendance & Effective sheet checked', step1Done, step1DoneDate, false, '', step1Body, step1Btn, null);
    // Step 2 — Principal's sign, locked until Step 1 is approved
    let step2Btn = null;
    if(!step2Done && step1Done){
      step2Btn = document.createElement('button');
      step2Btn.textContent = 'Mark Principal sign as done';
      step2Btn.style.cssText = 'padding:7px 12px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
      step2Btn.onclick = () => toggleMonthlyEffectiveSignature('principal');
    } else if(step2Done){
      step2Btn = document.createElement('button');
      step2Btn.textContent = 'Undo';
      step2Btn.style.cssText = 'padding:5px 10px; border-radius:6px; border:1px solid var(--border); background:#fff; font-size:11.5px; cursor:pointer;';
      step2Btn.onclick = () => toggleMonthlyEffectiveSignature('principal');
    }
    const step2Gap = step2Done && step1DoneDate ? (() => {
      const d = daysBetween(step1DoneDate, step2Sig.date);
      return d === null ? null : d + ' day' + (d === 1 ? '' : 's') + ' after foundation approval';
    })() : null;
    renderStep(2, 'Principal\'s sign', step2Done, step2Done ? step2Sig.date : null, !step1Done, 'Unlocks once Step 1 is approved', '', step2Btn, step2Gap, step2Done ? buildSignaturePhotoWidget('principal', step2Sig) : null);
    // Step 3 — AO signature, locked until Step 2 (Principal) is done
    let step3Btn = null;
    if(!step3Done && step2Done){
      step3Btn = document.createElement('button');
      step3Btn.textContent = 'Mark AO sign as done';
      step3Btn.style.cssText = 'padding:7px 12px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer;';
      step3Btn.onclick = () => toggleMonthlyEffectiveSignature('ao');
    } else if(step3Done){
      step3Btn = document.createElement('button');
      step3Btn.textContent = 'Undo';
      step3Btn.style.cssText = 'padding:5px 10px; border-radius:6px; border:1px solid var(--border); background:#fff; font-size:11.5px; cursor:pointer;';
      step3Btn.onclick = () => toggleMonthlyEffectiveSignature('ao');
    }
    const step3Gap = step3Done && step2Done ? (() => {
      const d = daysBetween(step2Sig.date, step3Sig.date);
      return d === null ? null : d + ' day' + (d === 1 ? '' : 's') + ' after Principal sign';
    })() : null;
    renderStep(3, 'AO signature', step3Done, step3Done ? step3Sig.date : null, !step2Done, 'Unlocks once Step 2 (Principal) is done', '', step3Btn, step3Gap, step3Done ? buildSignaturePhotoWidget('ao', step3Sig) : null);
    // Step 4 — Submission to the foundation office, locked until Step 3 (AO) is done
    let step4Btn = null;
    if(!step4Done && step3Done){
      step4Btn = document.createElement('button');
      step4Btn.textContent = 'Mark as submitted to the foundation office';
      step4Btn.style.cssText = 'padding:8px 14px; border-radius:8px; border:none; background:var(--primary); color:#fff; font-size:13px; font-weight:600; cursor:pointer;';
      step4Btn.onclick = () => toggleSubmittedToFoundation();
    } else if(step4Done){
      step4Btn = document.createElement('button');
      step4Btn.textContent = 'Undo';
      step4Btn.style.cssText = 'padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12.5px; cursor:pointer;';
      step4Btn.onclick = () => toggleSubmittedToFoundation();
    }
    const step4Gap = step4Done && step3Done ? (() => {
      const d = daysBetween(step3Sig.date, effRecord.submittedToFoundation.date);
      return d === null ? null : d + ' day' + (d === 1 ? '' : 's') + ' after AO sign';
    })() : null;
    renderStep(4, 'Submission to the foundation office', step4Done, step4Done ? effRecord.submittedToFoundation.date : null, !step3Done, 'Unlocks once Step 3 (AO) is done', '', step4Btn, step4Gap);
    monthlyEffSignoffPanel.appendChild(stepsWrap);
    // ---- Scan of the signed sheet ----
    monthlyEffSignoffPanel.appendChild(mdSec('Scan of the signed sheet', '<span class="reqs">EFF-10</span>'));
    const scanCard = document.createElement('div');
    scanCard.className = 'card'; scanCard.style.padding = '22px'; scanCard.style.marginBottom = '22px';
    const scanPreviewHtml = effRecord.scanDriveLink
      ? `<div style="margin-top:14px;">
           <a href="${esc(effRecord.scanDriveLink)}" target="_blank" rel="noopener" style="font-weight:600;">🖼 ${esc(effRecord.scanFileName || 'Attached file')}</a> <span class="cap">· saved to Drive</span>
           <br><button onclick="removeMonthlyEffectiveScan()" style="margin-top:10px; padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12px; cursor:pointer;">Remove</button>
         </div>`
      : `<p class="cap" style="margin:10px 0 0;">No file attached yet.</p>`;
    scanCard.innerHTML = `<p class="cap" style="margin:0 0 14px;">Once the Principal and AO signatures are on the printed sheet, photograph or scan it and attach it here — it uploads straight to your connected Google Drive.</p>
      <input type="file" id="effScanInput" accept="image/*,application/pdf" onchange="handleMonthlyEffectiveScan(this)" />
      <span id="effScanStatus" class="cap" style="margin-left:10px;"></span>
      ${scanPreviewHtml}`;
    monthlyEffSignoffPanel.appendChild(scanCard);
  }
    // Wipes this month's local sign-off state (Steps 2-4, both photos)
  // AND deletes the real server-side approval row for Step 1, so the
  // full submit → supervisor-approve → sign-off loop can be tested
  // repeatedly from a clean slate. Two calls because these two pieces
  // of state genuinely live in two different places — local storage
  // for the teacher-side steps, a real database row for the
  // supervisor-facing approval.
  async function resetMonthlyEffectiveForTesting(year, month){
    if(!confirm('Reset ALL of this month\'s closing workflow — every step, both photos, and the real approval record the supervisor would see? This is for testing only and can\'t be undone.')) return;
    const key = monthlyEffectiveKey(year, month);
    delete monthlyEffectiveRecords[key];
    saveMonthlyEffectiveRecords();
    delete effectiveApprovalCache[key];
    delete effectiveScanPruneChecked[key];
    if(myClassInfo.class_id){
      try{
        await fetch('backend/effective/reset_effective.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ class_id: myClassInfo.class_id, year, month })
        });
      } catch(err){ /* local state is already cleared regardless */ }
    }
    renderMonthlyEffective();
  }
