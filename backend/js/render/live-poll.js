/* =========================================================================
   teacher-part-13.js — part 13 of 13 of the teacher portal script
   (formerly one js/teacher.js). The parts share one global scope and
   MUST be loaded in order, 01 to 13, exactly where teacher.js used to be.
   This last part also starts the page: it runs the login check.
   ========================================================================= */
  function renderTransition(targetEl){
    transitionTargetEl = targetEl || null;
    const container = targetEl || document.getElementById('transition-body');
    container.innerHTML = '';

    const jrCount = 3, srCount = 2;
    const jrOutcomes = { promoted: 3, 'left the area': 0, 'needs tracing': 0 };
    const jrTotal = Object.values(jrOutcomes).reduce((a,b) => a+b, 0);
    const jrRate = Math.round(jrOutcomes.promoted / jrTotal * 100);
    const readyRate = 78, traced = 92;

    const cohort = SAMPLE_STUDENTS.map(name => {
      const completion = Math.round(50 + sampleRand(name + 'trcomp') * 50);
      const attendance = Math.round(60 + sampleRand(name + 'tratt') * 40);
      const emergingDomains = ASSESSMENT_DOMAINS.filter(d => sampleTier(name + d.key + 'tier') === 'E');
      const flagged = isFlaggedForFollowUp(completion, emergingDomains.length, attendance);
      return { name, completion, attendance, emergingDomains, flagged };
    });
    const flaggedCount = cohort.filter(c => c.flagged).length;

    container.appendChild(reportDownloadBar(() => container, 'Transition report', 'transition'));
    container.appendChild(mdSec('Transition — Jr KG to Sr KG', '<span class="reqs">BAL-09…12 · DAT-52</span>'));
    container.appendChild(mdGrid('g5', [
      mdTile('Jr KG children', jrCount, 'Balvatika 2', mdPill('1 school', 'neu'), 'BAL-09'),
      mdTile('Promoted to Sr KG', jrRate, '%', mdPill(mdStatusBand(jrRate, 92, 85).l, mdStatusBand(jrRate, 92, 85).c), 'BAL-10', mdMeter(jrRate)),
      mdTile('School Ready', readyRate, '% of Sr KG', mdPill(mdStatusBand(readyRate, 70, 50).l, mdStatusBand(readyRate, 70, 50).c), 'BAL-06', mdMeter(readyRate)),
      mdTile('Destination traced', traced, '% of Sr KG', mdPill(mdStatusBand(traced, 90, 75).l, mdStatusBand(traced, 90, 75).c), 'BAL-12', mdMeter(traced)),
      mdTile('Flagged for follow-up', flaggedCount, 'of ' + cohort.length + ' children',
        flaggedCount ? mdPill('Needs review', 'warn') : mdPill('None flagged', 'good'),
        'BAL-13', mdMeter(flaggedCount / cohort.length * 100, 'warn'))
    ]));

    const jrTotalKids = jrTotal;
    const outcomeRows = Object.entries(jrOutcomes).map(([k, v]) => ({
      label: k[0].toUpperCase() + k.slice(1),
      count: v,
      pct: Math.round(v / jrTotalKids * 100),
      pill: k === 'promoted' ? mdPill('Continued', 'good') : (k === 'left the area' ? mdPill('Migration', 'warn') : mdPill('Needs tracing', 'crit'))
    }));
    const outcomeCard = document.createElement('div');
    outcomeCard.className = 'card'; outcomeCard.style.padding = '22px';
    outcomeCard.innerHTML = `
      <h4 style="margin:0 0 4px;">What happened to last year's Balvatika 2</h4>
      <p class="cap" style="margin:0 0 16px;">A child who does not appear in Sr KG has either left the area or been lost track of. BAL-10 keeps the two apart, because the first is migration and the second is a programme failure.</p>
      <div class="report-table-wrap"><table class="report-table">
        <thead><tr><th>Outcome</th><th>Children</th><th>Share</th><th></th></tr></thead>
        <tbody>
          ${outcomeRows.map(r => `<tr><td><b>${esc(r.label)}</b></td><td>${r.count}</td><td>${r.pct}%</td><td>${r.pill}</td></tr>`).join('')}
          <tr><td><b>Total</b></td><td><b>${jrTotalKids}</b></td><td><b>100%</b></td><td></td></tr>
        </tbody>
      </table></div>`;

    const readyCount = Math.round(srCount * readyRate / 100);
    const notReadyCount = srCount - readyCount;
    const axisMax = Math.max(6, Math.ceil(srCount / 6) * 6);
    const axisTicks = [0, axisMax/4, axisMax/2, axisMax*3/4, axisMax].map(n => Math.round(n));
    const readyCard = document.createElement('div');
    readyCard.className = 'card'; readyCard.style.padding = '22px';
    readyCard.innerHTML = `
      <h4 style="margin:0 0 4px;">Readiness of the promoted cohort</h4>
      <p class="cap" style="margin:0 0 16px;">Not a gate. BAL-09 records what the Sr KG teacher is receiving so she can plan the first month, and nothing in this table may hold a child back.</p>
      <div class="hbar-axis">${axisTicks.map(t => `<span>${t}</span>`).join('')}</div>
      <div class="hbar-row">
        <div class="hbar-row-label">Three or fewer domains at Beginner</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(readyCount/axisMax*100)}%; background:var(--success);"></div></div>
        <div class="hbar-count">${readyCount} children</div>
      </div>
      <div class="hbar-row">
        <div class="hbar-row-label">Four or more at Beginner</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(notReadyCount/axisMax*100)}%; background:#EE8F35;"></div></div>
        <div class="hbar-count">${notReadyCount} children</div>
      </div>`;

    const twoColBal = document.createElement('div');
    twoColBal.className = 'transition-two-col';
    twoColBal.appendChild(outcomeCard);
    twoColBal.appendChild(readyCard);
    container.appendChild(twoColBal);

    // ---- Sr KG → Grade 1: where the leaving cohort actually went ----
    const srDestinations = [
      { label: 'MCGM Grade 1 (same school)', count: Math.max(0, srCount - 1), confirmed: Math.max(0, srCount - 1) },
      { label: 'MCGM Grade 1 (other school)', count: srCount > 1 ? 1 : 0, confirmed: 0 }
    ].filter(d => d.count > 0);
    const srTotalKids = srDestinations.reduce((a, d) => a + d.count, 0) || srCount;

    container.appendChild(mdSec('Sr KG → Grade 1', '<span class="reqs">BAL-11…14</span>'));
    const destCard = document.createElement('div');
    destCard.className = 'card'; destCard.style.padding = '22px';
    const srTotalConfirmed = srDestinations.reduce((a, d) => a + d.confirmed, 0);
    destCard.innerHTML = `
      <h4 style="margin:0 0 4px;">Where the leaving cohort went</h4>
      <p class="cap" style="margin:0 0 16px;">BAL-12 · a destination is confirmed only when someone has actually checked. "Assumed to have continued" is recorded as not traced, and this is the single hardest figure in the programme to keep honest.</p>
      <div class="report-table-wrap"><table class="report-table">
        <thead><tr><th>Destination</th><th>Children</th><th>Share</th><th>Confirmed</th><th></th></tr></thead>
        <tbody>
          ${srDestinations.map(d => `<tr>
            <td><b>${esc(d.label)}</b></td>
            <td>${d.count}</td>
            <td>${Math.round(d.count / srTotalKids * 100)}%</td>
            <td>${d.confirmed} of ${d.count}</td>
            <td>${d.confirmed === d.count ? mdPill('Verified', 'good') : mdPill('Follow up', 'crit')}</td>
          </tr>`).join('')}
          <tr><td><b>Total</b></td><td><b>${srTotalKids}</b></td><td><b>100%</b></td><td><b>${srTotalConfirmed}</b></td><td></td></tr>
        </tbody>
      </table></div>`;
    container.appendChild(destCard);

    // ---- Readiness bands + parameter-by-parameter — same section,
    // right under the destinations table, same two-column card layout
    // and hbar components as the Balvatika cards above so headings,
    // spacing and type all read as one continuous report. ----
    const needsSupportCount = Math.round(notReadyCount * 0.6);
    const developingCount = notReadyCount - needsSupportCount;
    const bandAxisMax = Math.max(6, Math.ceil(srCount / 6) * 6);
    const bandTicks = [0, bandAxisMax/4, bandAxisMax/2, bandAxisMax*3/4, bandAxisMax].map(n => Math.round(n));
    const bandsCard = document.createElement('div');
    bandsCard.className = 'card'; bandsCard.style.padding = '22px';
    bandsCard.innerHTML = `
      <h4 style="margin:0 0 4px;">Readiness bands</h4>
      <p class="cap" style="margin:0 0 16px;">BAL-06 · three bands, from the eight parameters. Creative engagement is recorded but not counted towards the band (BAL-05) — a child is not less ready for Grade 1 because she does not like drawing.</p>
      <div class="hbar-axis">${bandTicks.map(t => `<span>${t}</span>`).join('')}</div>
      <div class="hbar-row">
        <div class="hbar-row-label">School Ready</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(readyCount/bandAxisMax*100)}%; background:var(--success);"></div></div>
        <div class="hbar-count">${readyCount} children</div>
      </div>
      <div class="hbar-row">
        <div class="hbar-row-label">Developing</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(developingCount/bandAxisMax*100)}%; background:#EE8F35;"></div></div>
        <div class="hbar-count">${developingCount} children</div>
      </div>
      <div class="hbar-row">
        <div class="hbar-row-label">Needs Support</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(needsSupportCount/bandAxisMax*100)}%; background:var(--danger,#c8433f);"></div></div>
        <div class="hbar-count">${needsSupportCount} children</div>
      </div>`;

    const READINESS_PARAMS = [
      {key:'lang', label:'Language readiness'},
      {key:'num', label:'Early numeracy'},
      {key:'socio', label:'Socio-emotional'},
      {key:'motor', label:'Physical & motor'},
      {key:'habits', label:'Learning habits'}
    ];
    const paramReadiness = READINESS_PARAMS.map(p => {
      const ready = Math.max(0, Math.min(srCount, Math.round(srCount * (0.4 + sampleRand('srparam' + p.key) * 0.6))));
      return { ...p, ready };
    });
    const paramCard = document.createElement('div');
    paramCard.className = 'card'; paramCard.style.padding = '22px';
    paramCard.innerHTML = `
      <h4 style="margin:0 0 4px;">Parameter by parameter</h4>
      <p class="cap" style="margin:0 0 16px;">Which readiness parameter the cohort is weakest on. This is the one table that should change what is taught in the last term of Sr KG.</p>
      <div class="hbar-axis">${['0%','25%','50%','75%','100%'].map(t => `<span>${t}</span>`).join('')}</div>
      ${paramReadiness.map(p => `
        <div class="hbar-row">
          <div class="hbar-row-label">${esc(p.label)}</div>
          <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(p.ready/srCount*100)}%; background:${p.ready/srCount >= 0.85 ? 'var(--success)' : p.ready/srCount >= 0.6 ? '#EE8F35' : 'var(--danger,#c8433f)'};"></div></div>
          <div class="hbar-count">${p.ready} of ${srCount}</div>
        </div>`).join('')}`;

    const twoColBands = document.createElement('div');
    twoColBands.className = 'transition-two-col';
    twoColBands.style.marginTop = '20px';
    twoColBands.appendChild(bandsCard);
    twoColBands.appendChild(paramCard);
    container.appendChild(twoColBands);

    container.appendChild(mdSec('Child roster', '<span class="reqs">BAL-13 · flagged children need follow-up</span>'));
    let rosterTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Child</th><th>Completion</th><th>Domains emerging</th><th>Attendance</th><th></th></tr></thead><tbody>';
    cohort.forEach(c => {
      rosterTable += `<tr style="cursor:pointer;" onclick="switchSidebarSection('childrecord', '${esc(c.name)}')">
        <td><b>${esc(c.name)}</b></td>
        <td>${c.completion}%</td>
        <td class="dim">${c.emergingDomains.length ? esc(c.emergingDomains.map(d => d.label).join(', ')) : '—'}</td>
        <td>${c.attendance}%</td>
        <td>${c.flagged ? mdPill('Follow up', 'crit') : ''}</td>
      </tr>`;
    });
    rosterTable += '</tbody></table></div>';
    const rosterWrap = document.createElement('div'); rosterWrap.innerHTML = rosterTable;
    container.appendChild(mdCard(null, 'A child is flagged when activity completion is below 70%, three or more domains are still Beginner, or attendance is below 80%. Tap a child\'s name for her full record.', rosterWrap));

    // ---- Charts & analysis — collapsed by default, expands on hover.
    // Deliberately kept INSIDE renderTransition() — it references
    // cohort and container, both local to this function. Sitting
    // outside (as found in the version you pasted) would throw
    // "cohort is not defined" the instant the script loads. ----
    if(!document.getElementById('transitionChartsStyle')){
      const style = document.createElement('style');
      style.id = 'transitionChartsStyle';
      style.textContent = `
        .transition-charts-wrap{ margin-top:16px; }
        .transition-charts-toggle{
          display:flex; align-items:center; justify-content:space-between;
          padding:12px 16px; background:var(--card,#fff);
          border:1px solid var(--border,#0b0b0b22); border-radius:10px;
          cursor:pointer; font-size:13px; font-weight:600;
        }
        .transition-charts-chevron{ transition:transform .2s ease; font-size:11px; color:var(--text-muted,#6d6b67); }
        .transition-charts-panel{
          display:none;
          background:var(--card,#fff); border:1px solid var(--border,#0b0b0b22);
          border-top:none; border-radius:0 0 10px 10px;
        }
        .transition-charts-wrap.open .transition-charts-panel{ display:block; }
        .transition-charts-wrap.open .transition-charts-chevron{ transform:rotate(90deg); }
        .transition-charts-panel-inner{ padding:18px; }
        .tc-hbar-row{ display:flex; align-items:center; gap:10px; margin-bottom:12px; }
        .tc-hbar-label{ width:150px; font-size:12px; flex-shrink:0; }
        .tc-hbar-track{ flex:1; height:14px; border-radius:4px; background:#0b0b0b12; overflow:hidden; display:flex; }
      `;
      document.head.appendChild(style);
    }

    const domainReadiness = ASSESSMENT_DOMAINS.map(d => {
      const emergingCount = cohort.filter(c => c.emergingDomains.some(ed => ed.key === d.key)).length;
      const securePct = Math.round((cohort.length - emergingCount) / cohort.length * 100);
      return { label: d.label, full: d.full, securePct };
    });

    const trendMonths = ['Jun','Jul','Aug','Sep','Oct'];
    const trendValues = trendMonths.map((m, i) => Math.round(35 + i * 12 + sampleRand('trend' + m) * 8));

    const chartsWrap = document.createElement('div');
    chartsWrap.className = 'transition-charts-wrap';
    chartsWrap.innerHTML = `
      <div class="transition-charts-toggle" onclick="this.closest('.transition-charts-wrap').classList.toggle('open')">
        <span>Charts &amp; analysis</span>
        <span class="transition-charts-chevron">▸</span>
      </div>
      <div class="transition-charts-panel">
        <div class="transition-charts-panel-inner">

          <div class="ctl" style="margin-bottom:16px; max-width:280px;">
            <label style="font-size:10.5px; font-weight:bold; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; display:block;">Chart</label>
            <select onchange="switchTransitionChart(this.value)" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; background:#fff; font-family:inherit;">
              <option value="domain">Domain readiness at handoff</option>
              <option value="trend">Completion trend across the year</option>
            </select>
          </div>

          <div id="tcChart-domain" class="tc-chart">
            <p style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted,#6d6b67); margin:0 0 12px;">Domain readiness at handoff</p>
            ${domainReadiness.map(d => `
              <div class="tc-hbar-row">
                <span class="tc-hbar-label" title="${esc(d.full)}">${esc(d.label)}</span>
                <div class="tc-hbar-track">
                  <div style="width:${d.securePct}%; background:#1D9E75;"></div>
                  <div style="width:${100 - d.securePct}%; background:#E0A429;"></div>
                </div>
                <span style="width:40px; font-size:12px; text-align:right;">${d.securePct}%</span>
              </div>`).join('')}
            <p style="font-size:11px; color:var(--text-muted,#6d6b67); margin:4px 0 0;">
              <span style="display:inline-block; width:8px; height:8px; background:#1D9E75; border-radius:2px; margin-right:4px;"></span>Secure
              &nbsp;&nbsp;<span style="display:inline-block; width:8px; height:8px; background:#E0A429; border-radius:2px; margin-right:4px;"></span>Beginner
            </p>
          </div>

          <div id="tcChart-trend" class="tc-chart hidden">
            <p style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted,#6d6b67); margin:0 0 12px;">Completion trend across the year</p>
            <div style="display:flex; align-items:flex-end; gap:8px; height:90px;">
              ${trendValues.map(v => `<div style="flex:1; background:#378ADD; border-radius:3px 3px 0 0; height:${v}%;"></div>`).join('')}
            </div>
            <div style="display:flex; gap:8px; margin-top:6px;">
              ${trendMonths.map(m => `<span style="flex:1; text-align:center; font-size:11px; color:var(--text-muted,#6d6b67);">${m}</span>`).join('')}
            </div>
          </div>

        </div>
      </div>
    `;
    container.appendChild(chartsWrap);

    // ---- Net change by domain — replaces the old fake transition
    // matrix + "conversion by domain" table, which used SAMPLE_STUDENTS
    // and fabricated tier data with no connection to anything real.
    // workbook_competency_tally holds real class-wide counts
    // (count_e/count_p/count_a per competency per month) — but that's
    // aggregate data, not per-child tracking, so it can only honestly
    // support a NET CHANGE view (did the class's overall balance shift
    // toward Advanced between two months), never a literal "this child
    // moved from E to P" transition, which the old matrix implied but
    // no real data here could back.
    if(!dashboardTrendToMonth){
      dashboardTrendToMonth = WORKBOOK_MONTHS[WORKBOOK_MONTHS.length - 1];
      dashboardTrendFromMonth = WORKBOOK_MONTHS[Math.max(0, WORKBOOK_MONTHS.length - 2)];
    }

    const trendWrap = document.createElement('div');
    trendWrap.style.marginTop = '16px';
    const monthOptions = (selectedVal) => WORKBOOK_MONTHS.map(m => `<option value="${m}"${m === selectedVal ? ' selected' : ''}>${m}</option>`).join('');
    trendWrap.innerHTML = `
      <h4 style="margin:0 0 4px;">Net change by domain <span class="reqs">real, from Workbook Assessment tallies</span></h4>
      <p class="cap" style="margin:0 0 12px;">Comparing two months' class-wide B/P/A counts. This shows whether the class's overall balance shifted toward Advanced — it cannot show which specific child moved, since the tally isn't recorded per child.</p>
      <div class="fbar" style="margin-bottom:14px;">
        <div class="ctl"><label>From</label><select id="trendFromSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${monthOptions(dashboardTrendFromMonth)}</select></div>
        <div class="ctl"><label>To</label><select id="trendToSelect" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:13px;">${monthOptions(dashboardTrendToMonth)}</select></div>
      </div>
      <div id="trendTableTarget"></div>
    `;
    container.appendChild(trendWrap);
    trendWrap.querySelector('#trendFromSelect').onchange = (e) => { dashboardTrendFromMonth = e.target.value; renderAssessmentDashboardOverview(container); };
    trendWrap.querySelector('#trendToSelect').onchange = (e) => { dashboardTrendToMonth = e.target.value; renderAssessmentDashboardOverview(container); };

    const trendTarget = trendWrap.querySelector('#trendTableTarget');
    const trendKey = dashboardTrendFromMonth + '|' + dashboardTrendToMonth;
    const trendLoaded = ensureWorkbookTallyTrendLoaded(dashboardTrendFromMonth, dashboardTrendToMonth, () => renderAssessmentDashboardOverview(container));
    if(typeof workbookTallyTrendCache[trendKey] === 'string' && workbookTallyTrendCache[trendKey].startsWith('error:')){
      renderRetryCard(trendTarget, workbookTallyTrendCache[trendKey].slice(6), () => delete workbookTallyTrendCache[trendKey]);
      return;
    }
    if(!trendLoaded){ trendTarget.innerHTML = '<p class="cap">Loading…</p>'; return; }

    const competencies = workbookTallyTrendCache[trendKey];
    if(!competencies.length){
      trendTarget.innerHTML = '<p class="cap">No competencies are set up yet — add some in Workbook Assessment first.</p>';
      return;
    }

    // Roll up per development area (domain).
    const byArea = [];
    competencies.forEach(c => {
      let area = byArea.find(a => a.area_id === c.area_id);
      if(!area){ area = { area_id: c.area_id, area_name: c.area_name, goals: [] }; byArea.push(area); }
      let goal = area.goals.find(g => g.curricular_goal_id === c.curricular_goal_id);
      if(!goal){ goal = { curricular_goal_id: c.curricular_goal_id, goal_text: c.goal_text, e_from:0,p_from:0,a_from:0,e_to:0,p_to:0,a_to:0 }; area.goals.push(goal); }
      goal.e_from += c.e_from; goal.p_from += c.p_from; goal.a_from += c.a_from;
      goal.e_to += c.e_to; goal.p_to += c.p_to; goal.a_to += c.a_to;
    });

    const avgScore = (e,p,a) => { const total = e+p+a; return total ? Math.round((e*1+p*2+a*3)/total * 100) / 100 : null; };

    let table = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Domain</th><th>Goal</th><th style="text-align:center;">' + esc(dashboardTrendFromMonth) + '<br><span style="font-weight:400;">E / P / A</span></th><th style="text-align:center;">' + esc(dashboardTrendToMonth) + '<br><span style="font-weight:400;">E / P / A</span></th><th>Avg score</th><th>Change</th></tr></thead><tbody>';
    byArea.forEach(area => {
      area.goals.forEach((g, idx) => {
        const fromAvg = avgScore(g.e_from, g.p_from, g.a_from);
        const toAvg = avgScore(g.e_to, g.p_to, g.a_to);
        let statusPill;
        if(fromAvg === null || toAvg === null) statusPill = mdPill('No data', 'neu');
        else if(toAvg > fromAvg) statusPill = mdPill('Shifted up', 'good');
        else if(toAvg < fromAvg) statusPill = mdPill('Shifted down', 'crit');
        else statusPill = mdPill('No change', 'neu');
        table += `<tr>${idx === 0 ? `<td rowspan="${area.goals.length}" style="vertical-align:top; font-weight:600;">${esc(area.area_name)}</td>` : ''}
          <td style="text-align:left;">${esc(g.goal_text)}</td>
          <td class="dim" style="text-align:center;">${g.e_from} / ${g.p_from} / ${g.a_from}</td>
          <td class="dim" style="text-align:center;">${g.e_to} / ${g.p_to} / ${g.a_to}</td>
          <td class="dim">${fromAvg !== null ? fromAvg : '—'} → ${toAvg !== null ? toAvg : '—'}</td>
          <td>${statusPill}</td>
        </tr>`;
      });
    });
    table += '</tbody></table></div>';
    trendTarget.innerHTML = '';
    const trendTableWrap = document.createElement('div');
    trendTableWrap.innerHTML = table;
    trendTarget.appendChild(trendTableWrap);
    const trendNote = document.createElement('p');
    trendNote.className = 'cap'; trendNote.style.cssText = 'margin-top:12px; border-left:3px solid var(--primary); padding-left:12px;';
    trendNote.innerHTML = '<b>What this can and cannot tell you.</b> "Avg score" is a weighted average (E=1, P=2, A=3) across however many children were tallied that month. A rising average means the class collectively leaned more toward Advanced — it does not mean every child individually improved, and the number of children tallied can differ month to month if attendance or recording was incomplete.';
    trendTarget.appendChild(trendNote);
  }

  // Toggles which chart is visible inside the Transition report's
  // "Charts & analysis" panel. Deliberately shows one at a time —
  // the dropdown IS the chart switcher, not a filter alongside them.
  function switchTransitionChart(which){
    document.querySelectorAll('.tc-chart').forEach(el => {
      el.classList.toggle('hidden', el.id !== 'tcChart-' + which);
    });
  }

  // Expand/collapse a sidebar parent's child tabs — e.g. clicking
  // "Attendance" toggles its two sub-tabs (Class Attendance /
  // Attendance Records) open or closed, chevron rotates to match.
  // Defaults open (see CSS — no .collapsed class on load).
  function toggleSidebarParent(childrenId){
    const wrap = document.getElementById(childrenId + '-wrap');
    const chevron = document.getElementById('chevron-' + childrenId);
    if(!wrap) return;
    wrap.classList.toggle('collapsed');
    if(chevron) chevron.classList.toggle('collapsed');
  }

function renderPreviewBanner(isPreviewing){
  const el = document.getElementById('preview-banner');
  if(!el) return;
  el.innerHTML = isPreviewing ? `
    <div class="preview-banner">
      <span>👁️ Previewing as this role</span>
      <button onclick="returnToSuperAdmin()">Return to Super Admin</button>
    </div>` : '';
}

function returnToSuperAdmin(){
  fetch('backend/auth/return_to_admin.php', { method: 'POST' })
    .then(r => r.json())
    .then(data => {
      if(data.status === 'success') window.location.href = 'superadmin.html';
    })
    .catch(() => {});
}

fetch('backend/auth/session_check.php' + window.location.search)
  .then(r => r.json())
  .then(data => {
    if(data.status !== 'logged_in' || data.role !== 'teacher'){
      window.location.href = 'index.html';
      return;
    }
    enterTeacherFlow();
    renderPreviewBanner(data.is_previewing);
    applyRealTeacherName(data.name); // fixes the hardcoded "Mrs. Sharma" in the topbar + heading
    updateTopbarSchoolLine(); // fallback shown immediately
    loadMyClassInfo(); // then replaced with the real school/class for this login, once it resolves

    // Coming from Textbooks' sidebar (e.g. teacher.html?section=materials) —
    // jump straight to that section, but only if the dashboard itself is
    // actually showing (enterTeacherFlow sometimes shows the attendance
    // gate screen instead, which has no sidebar to switch within).
    const params = new URLSearchParams(window.location.search);
    const requestedSection = params.get('section');
    if(requestedSection && !document.getElementById('view-dashboard').classList.contains('hidden')){
      switchSidebarSection(requestedSection);
    }
  })
  .catch(() => { window.location.href = 'index.html'; });

  // =================================================================
  // CLASS ATTENDANCE → 📊 REPORTS — one proper report per month of the
  // school year (June → April), plus a whole-year view. Built only from
  // the attendance actually marked — a month with nothing marked says so.
  //   Each month: summary tiles · every child's present / absent / % and
  //   whether they need a follow-up · the full day-by-day register ·
  //   download at the end.
  // =================================================================
  function attNote(text){ const c = document.createElement('div'); c.className = 'card'; c.style.padding = '16px 18px'; const p = document.createElement('p'); p.style.margin = '0'; p.textContent = text; c.appendChild(p); return c; }
  var attReportMonth = null; // { y, m } or 'year'
  function attAcademicMonths(){
    const now = new Date();
    const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    const months = [];
    for(let i = 0; i < 11; i++){ // June … April
      const d = new Date(startYear, 5 + i, 1);
      if(d > now) break;
      months.push({ y: d.getFullYear(), m: d.getMonth() });
    }
    return months;
  }
  function attMonthLabel(o, long){ return new Date(o.y, o.m, 1).toLocaleDateString([], long ? { month: 'long', year: 'numeric' } : { month: 'short' }); }
  function attDateKey(y, m, d){ return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }

  // Everything one month's report needs, from real marks only.
  function attMonthStats(y, m){
    const today = todayDateKey();
    const days = new Date(y, m + 1, 0).getDate();
    const schoolDays = [], holidays = [];
    for(let d = 1; d <= days; d++){
      const dow = new Date(y, m, d).getDay();
      if(dow === 0 || dow === 6) continue;
      const key = attDateKey(y, m, d);
      if(key > today) continue;
      const hol = complianceHolidayName(y, m, d) || studentHolidays[key];
      if(hol){ holidays.push({ date: key, name: hol }); continue; }
      schoolDays.push(key);
    }
    const markedDays = schoolDays.filter(k => attendanceRecords[k] && Object.keys(attendanceRecords[k]).length);
    const children = (Array.isArray(realPupilsCache) ? realPupilsCache : []).map((p, i) => {
      let present = 0, absent = 0, run = 0, longest = 0;
      schoolDays.forEach(k => {
        if(p.admitted_date && k < p.admitted_date) return; // not yet on the roll that day
        const v = (attendanceRecords[k] || {})[p.id];
        if(v === 'present' || v === 'late'){ present++; run = 0; }
        else if(v === 'absent'){ absent++; run++; if(run > longest) longest = run; }
      });
      const marked = present + absent;
      return { id: p.id, roll: i + 1, register_no: p.register_no || '', name: p.name, present, absent, marked,
        pct: marked ? Math.round(present / marked * 1000) / 10 : null, longest };
    });
    const withMarks = children.filter(c => c.marked);
    const totP = withMarks.reduce((a, c) => a + c.present, 0), totM = withMarks.reduce((a, c) => a + c.marked, 0);
    return {
      y, m, schoolDays, holidays, markedDays, children,
      classPct: totM ? Math.round(totP / totM * 1000) / 10 : null,
      below70: withMarks.filter(c => c.marked >= 4 && c.pct < 70),
      streak3: withMarks.filter(c => c.longest >= 3),
      perfect: withMarks.filter(c => c.absent === 0 && c.marked >= 4)
    };
  }

  function attEnsureMonths(list){
    const missing = list.filter(o => attendanceMonthStatus[o.y + '-' + o.m] === undefined);
    if(!missing.length) return true;
    Promise.all(missing.map(o => fetchAttendanceMonth(o.y, o.m))).then(() => {
      if(classAttendanceTab === 'reports') renderAttendanceReports();
    });
    return false;
  }

  // .card and the tile grid have no outer margin of their own, so blocks appended one
  // after another touch. Give every block 18px above it - except a block right under its
  // own section heading (the heading already spaces it) and the download bar (spaces itself).
  function attSpaceStack(el){
    Array.from(el.children).forEach(c => {
      const prev = c.previousElementSibling;
      if(!prev || c.classList.contains('sec') || prev.classList.contains('sec') || c.hasAttribute('data-no-export')) return;
      c.style.marginTop = '18px';
    });
  }

  function renderAttendanceReports(){
    let host = document.getElementById('attendancereports-body');
    const section = document.getElementById('classattendance-body');
    if(!host){ host = document.createElement('div'); host.id = 'attendancereports-body'; }
    if(host.parentElement !== section) section.appendChild(host);
    host.innerHTML = '';
    if(!ensurePupilsLoadedFor(host, renderAttendanceReports)) return;

    const months = attAcademicMonths();
    if(!attReportMonth) attReportMonth = months[months.length - 1] || { y: new Date().getFullYear(), m: new Date().getMonth() };

    host.appendChild(mdSec('Attendance reports', '<span class="reqs">REG-01…07</span>'));
    const chips = document.createElement('div');
    chips.setAttribute('data-no-export', '1');
    chips.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin:0 0 16px;';
    const chip = (label, active, onClick) => { const b = document.createElement('button'); b.textContent = label; b.onclick = onClick;
      b.style.cssText = `padding:6px 14px; border-radius:99px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:12.5px; font-weight:600; cursor:pointer;`;
      chips.appendChild(b); };
    months.forEach(o => chip(attMonthLabel(o), attReportMonth !== 'year' && attReportMonth.y === o.y && attReportMonth.m === o.m, () => { attReportMonth = o; renderAttendanceReports(); }));
    chip('Whole year', attReportMonth === 'year', () => { attReportMonth = 'year'; renderAttendanceReports(); });
    host.appendChild(chips);

    const need = attReportMonth === 'year' ? months : [attReportMonth];
    if(!attEnsureMonths(need)){ host.appendChild(attNote('Loading the attendance marked for ' + (attReportMonth === 'year' ? 'the whole year' : attMonthLabel(attReportMonth, true)) + '…')); return; }
    const failed = need.find(o => String(attendanceMonthStatus[o.y + '-' + o.m] || '').startsWith('error:'));
    if(failed){
      const card = attNote('Could not load ' + attMonthLabel(failed, true) + ': ' + String(attendanceMonthStatus[failed.y + '-' + failed.m]).slice(6));
      const retry = document.createElement('button'); retry.className = 'btn'; retry.textContent = 'Try again'; retry.style.marginTop = '8px';
      retry.onclick = () => { need.forEach(o => { if(String(attendanceMonthStatus[o.y + '-' + o.m]).startsWith('error:')) delete attendanceMonthStatus[o.y + '-' + o.m]; }); renderAttendanceReports(); };
      card.appendChild(retry); host.appendChild(card); return;
    }

    const report = document.createElement('div');
    host.appendChild(report);
    const pctText = v => v === null ? '—' : v + '%';
    const band = v => v === null ? mdPill('No marks', 'neu') : v >= 85 ? mdPill('Good', 'good') : v >= 70 ? mdPill('Watch', 'warn') : mdPill('Below 70%', 'crit');

    if(attReportMonth === 'year'){
      const all = months.map(o => attMonthStats(o.y, o.m));
      report.appendChild(mdSec('Whole year — ' + attMonthLabel(months[0] || { y: new Date().getFullYear(), m: 5 }, true) + ' to ' + attMonthLabel(months[months.length - 1] || months[0], true), ''));
      let t = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th style="text-align:left;">Month</th><th>School days so far</th><th>Days marked</th><th>Holidays</th><th>Class attendance</th><th>Below 70%</th><th>3+ days absent in a row</th></tr></thead><tbody>';
      all.forEach(s => {
        t += `<tr><td style="text-align:left;"><b>${esc(attMonthLabel(s, true))}</b></td><td>${s.schoolDays.length}</td><td>${s.markedDays.length}</td><td>${s.holidays.length}</td>`
          + `<td>${s.markedDays.length ? pctText(s.classPct) : '<span class="dim">Not marked</span>'}</td><td>${s.markedDays.length ? s.below70.length : '—'}</td><td>${s.markedDays.length ? s.streak3.length : '—'}</td></tr>`;
      });
      t += '</tbody></table></div>';
      const w1 = document.createElement('div'); w1.innerHTML = t;
      report.appendChild(mdCard('Month by month', 'Class attendance = present marks ÷ all marks in the month. Months with nothing marked are shown as "Not marked" — never estimated.', w1));

      // Each child across the whole year
      const byChild = {};
      all.forEach(s => s.children.forEach(c => { const b = byChild[c.id] || (byChild[c.id] = { roll: c.roll, register_no: c.register_no, name: c.name, present: 0, absent: 0 }); b.present += c.present; b.absent += c.absent; }));
      let t2 = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Roll</th><th>Reg. no.</th><th style="text-align:left;">Child</th><th>Present</th><th>Absent</th><th>Attendance</th><th style="text-align:left;">Status</th></tr></thead><tbody>';
      Object.values(byChild).sort((a, b) => a.roll - b.roll).forEach(c => {
        const marked = c.present + c.absent, pct = marked ? Math.round(c.present / marked * 1000) / 10 : null;
        const status = band(pct);
        t2 += `<tr><td>${c.roll}</td><td>${esc(c.register_no) || '—'}</td><td style="text-align:left;"><b>${esc(c.name)}</b></td><td>${c.present}</td><td>${c.absent}</td><td>${pctText(pct)}</td><td style="text-align:left;">${status}</td></tr>`;
      });
      t2 += '</tbody></table></div>';
      const w2 = document.createElement('div'); w2.innerHTML = t2;
      report.appendChild(mdCard('Every child — whole year', null, w2));
      attSpaceStack(report);
      host.appendChild(reportDownloadBar(() => report, 'Attendance — whole year — ' + (myClassInfo.class_name || ''), 'attendance-year'));
      attSpaceStack(host);
      return;
    }

    const s = attMonthStats(attReportMonth.y, attReportMonth.m);
    const title = attMonthLabel(s, true);
    report.appendChild(mdSec('Attendance report — ' + title, ''));
    if(!s.markedDays.length){
      report.appendChild(attNote('No attendance has been marked for ' + title + ' yet. Mark it in ✓ Mark Attendance, or bring it in with 📥 Import attendance from any file.'));
      return;
    }
    const grid = document.createElement('div'); grid.className = 'g g4';
    grid.appendChild(mdTile('Class attendance', s.classPct === null ? '—' : s.classPct, s.classPct === null ? 'no marks' : '% of all marks', band(s.classPct), 'REG-05'));
    grid.appendChild(mdTile('Days marked', s.markedDays.length, 'of ' + s.schoolDays.length + ' school days so far', s.markedDays.length === s.schoolDays.length ? mdPill('Complete', 'good') : mdPill((s.schoolDays.length - s.markedDays.length) + ' not marked', 'warn'), 'REG-02'));
    grid.appendChild(mdTile('Below 70%', s.below70.length, 'children (4+ days marked)', s.below70.length ? mdPill('Follow up', 'crit') : mdPill('None', 'good'), 'REG-06'));
    grid.appendChild(mdTile('Full attendance', s.perfect.length, 'children never absent', mdPill(s.perfect.length ? 'Well done' : '—', s.perfect.length ? 'good' : 'neu'), 'REG-05'));
    report.appendChild(grid);
    if(s.holidays.length){
      const holWrap = document.createElement('div');
      holWrap.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; padding-top:2px;';
      holWrap.innerHTML = s.holidays.map(h => mdPill(new Date(h.date + 'T00:00:00').toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' — ' + h.name, 'neu')).join('');
      report.appendChild(mdCard('Holidays in ' + title, null, holWrap));
    }

    let t = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Roll</th><th>Reg. no.</th><th style="text-align:left;">Child</th><th>Present</th><th>Absent</th><th>Days marked</th><th>Attendance</th><th style="text-align:left;">Needs a follow-up?</th></tr></thead><tbody>';
    s.children.forEach(c => {
      const notes = [];
      if(c.marked >= 4 && c.pct < 70) notes.push('Below 70%');
      if(c.longest >= 3) notes.push(c.longest + ' days absent in a row');
      t += `<tr><td>${c.roll}</td><td>${esc(c.register_no) || '—'}</td><td style="text-align:left;"><b>${esc(c.name)}</b></td><td>${c.present}</td><td>${c.absent}</td><td>${c.marked}</td><td>${pctText(c.pct)}</td>`
        + `<td style="text-align:left;">${notes.length ? '<span style="color:var(--crit,#d03b3b); font-weight:600;">' + notes.map(esc).join(' · ') + '</span>' : (c.marked ? 'No' : '<span class="dim">Not marked</span>')}</td></tr>`;
    });
    t += '</tbody></table></div>';
    const w = document.createElement('div'); w.innerHTML = t;
    report.appendChild(mdCard('Every child — ' + title, 'Attendance = present ÷ days marked for that child. A child admitted during the month is only counted from their admission date.', w));
    attSpaceStack(report);

    // The full day-by-day register for this month (it has its own printable download).
    calendarYear = s.y; calendarMonth = s.m;
    const reg = document.createElement('div');
    host.appendChild(reg);
    renderAttendanceRegister(reg);
    host.appendChild(reportDownloadBar(() => report, 'Attendance report — ' + title + ' — ' + (myClassInfo.class_name || ''), 'attendance-' + s.y + '-' + String(s.m + 1).padStart(2, '0'), 'Summary and every child for ' + title + '. The day-by-day register above has its own download.'));
    attSpaceStack(host);
  }

  // =================================================================
  // MY CLASS — the families. One row per child with the parents' /
  // guardians' details from the REAL family profile (never a sample):
  // who they are, how to reach them, where they live. A child with no
  // profile yet says so, with a button to add it in Family & Parents.
  // (The weekly B/P/A grading that used to be here is now
  //  Assessment → 🧒 Weekly activities.)
  // =================================================================
  var myClassFamilySearch = '';
  function openFamilyProfileFor(name){
    selectedFamilyChildName = name;
    switchSidebarSection('familyparents');
  }
  function renderMyClassFamilies(){
    const container = document.getElementById('myclass-body');
    container.innerHTML = '';
    container.appendChild(renderTeachingTabBar('myclass'));
    if(!ensurePupilsLoadedFor(container, renderMyClass)) return;
    if(!familyRecordsLoaded){
      ensureFamilyRecordsLoaded(renderMyClass);
      container.appendChild(attNote('Loading the family profiles…'));
      return;
    }

    const kids = realPupilsCache;
    const rec = name => { const r = familyRecords[name]; return r && Array.isArray(r.guardianNames) && r.guardianNames.length ? r : null; };
    const phoneOf = g => (g && g.phone ? String(g.phone).trim() : '');
    const withProfile = kids.filter(p => rec(p.name));
    const reachable = kids.filter(p => { const r = rec(p.name); return r && r.guardianNames.some(g => phoneOf(g)); });
    const smart = kids.filter(p => { const r = rec(p.name); return r && r.guardianNames.some(g => g.smart); });

    container.appendChild(mdSec('My Class — the families', '<span class="reqs">FAM-01…04</span>'));
    const grid = document.createElement('div'); grid.className = 'g g4';
    grid.appendChild(mdTile('Children on roll', kids.length, 'in ' + (myClassInfo.class_name || 'this class'), mdPill('Register order', 'neu'), 'REG-14'));
    grid.appendChild(mdTile('Family profiles', withProfile.length, 'of ' + kids.length + ' filled in', withProfile.length === kids.length && kids.length ? mdPill('Complete', 'good') : mdPill((kids.length - withProfile.length) + ' missing', kids.length - withProfile.length ? 'warn' : 'good'), 'FAM-01'));
    grid.appendChild(mdTile('Reachable by phone', reachable.length, 'families with a number', reachable.length === kids.length && kids.length ? mdPill('All', 'good') : mdPill((kids.length - reachable.length) + ' without', 'warn'), 'FAM-02'));
    grid.appendChild(mdTile('Smartphone at home', smart.length, 'families (for messages / videos)', mdPill(withProfile.length ? Math.round(smart.length / withProfile.length * 100) + '% of profiles' : 'No profiles yet', 'neu'), 'FAM-03'));
    container.appendChild(grid);

    const tools = document.createElement('div');
    tools.setAttribute('data-no-export', '1');
    tools.style.cssText = 'display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:6px 0 12px;';
    tools.innerHTML = `<input id="myClassFamilySearch" type="text" placeholder="Search child or parent name…" value="${esc(myClassFamilySearch)}" style="flex:1; min-width:220px; padding:9px 12px; border:1px solid var(--border); border-radius:8px; font-size:13px;" />
      <button class="btn" onclick="switchSidebarSection('familyparents')">👪 Open Family &amp; Parents</button>`;
    container.appendChild(tools);

    const report = document.createElement('div');
    container.appendChild(report);
    const q = myClassFamilySearch.trim().toLowerCase();
    const shown = kids.map((p, i) => ({ p, i })).filter(({ p }) => {
      if(!q) return true;
      const r = rec(p.name);
      return p.name.toLowerCase().includes(q) || (r && r.guardianNames.some(g => String(g.name || '').toLowerCase().includes(q)));
    });
    const guardianCell = (g, occ) => g ? `<b>${esc(g.name || '—')}</b><div class="cap">${esc([g.rel, occ, g.edu].filter(Boolean).join(' · ')) || '—'}</div>` : '<span class="dim">—</span>';
    const phoneCell = g => { const ph = phoneOf(g); return ph ? `<a href="tel:${esc(ph.replace(/[^\d+]/g, ''))}" style="font-weight:600; white-space:nowrap;">📞 ${esc(ph)}</a>${g.smart ? '<div class="cap">Smartphone</div>' : ''}` : '<span class="dim">No number</span>'; };
    let t = '<div class="report-table-wrap"><table class="report-table" style="min-width:1000px;"><thead><tr><th>Roll</th><th>Reg. no.</th><th style="text-align:left;">Child</th>'
      + '<th style="text-align:left;">Parent / guardian</th><th style="text-align:left;">Phone</th><th style="text-align:left;">Second guardian</th><th style="text-align:left;">Phone</th>'
      + '<th style="text-align:left;">Area</th><th style="text-align:left;">Languages at home</th><th style="text-align:left;">Profile</th></tr></thead><tbody>';
    shown.forEach(({ p, i }) => {
      const r = rec(p.name);
      const safeName = esc(p.name).replace(/'/g, '&#39;');
      if(!r){
        t += `<tr><td>${i + 1}</td><td>${esc(p.register_no || '') || '—'}</td><td style="text-align:left;"><b>${esc(p.name)}</b></td>`
          + `<td colspan="6" style="text-align:left;" class="dim">No family profile yet</td>`
          + `<td style="text-align:left;"><button class="btn" data-no-export="1" style="padding:5px 10px; font-size:12px;" onclick="openFamilyProfileFor('${safeName}')">Add profile</button></td></tr>`;
        return;
      }
      const g1 = r.guardianNames.find(g => g.primary) || r.guardianNames[0];
      const g2 = r.guardianNames.find(g => g !== g1) || null;
      const occ = g => { const idx = r.guardianNames.indexOf(g); return idx >= 0 && Array.isArray(r.guardians) && r.guardians[idx] ? (r.guardians[idx].occ || '') : ''; };
      const complete = g1 && g1.name && phoneOf(g1);
      const langs = Array.isArray(r.langs) ? r.langs.join(', ') : (r.langs || r.motherTongue || '');
      t += `<tr><td>${i + 1}</td><td>${esc(p.register_no || '') || '—'}</td><td style="text-align:left;"><b>${esc(p.name)}</b></td>`
        + `<td style="text-align:left;">${guardianCell(g1, occ(g1))}</td><td style="text-align:left;">${phoneCell(g1)}</td>`
        + `<td style="text-align:left;">${guardianCell(g2, g2 ? occ(g2) : '')}</td><td style="text-align:left;">${g2 ? phoneCell(g2) : '<span class="dim">—</span>'}</td>`
        + `<td style="text-align:left;">${esc(r.locality || '') || '<span class="dim">—</span>'}</td><td style="text-align:left;">${esc(langs) || '<span class="dim">—</span>'}</td>`
        + `<td style="text-align:left;">${complete ? mdPill('Complete', 'good') : mdPill('Incomplete', 'warn')} <button class="btn" data-no-export="1" style="padding:4px 9px; font-size:11.5px; margin-left:4px;" onclick="openFamilyProfileFor('${safeName}')">Open</button></td></tr>`;
    });
    if(!shown.length) t += `<tr><td colspan="10" class="dim" style="text-align:left;">No child or parent matches "${esc(myClassFamilySearch)}".</td></tr>`;
    t += '</tbody></table></div>';
    const w = document.createElement('div'); w.innerHTML = t;
    report.appendChild(mdCard('Every family', 'From each child\u2019s family profile. Tap a number to call. Missing or incomplete profiles can be filled in from Family & Parents (one at a time, or import the Family Profile sheet).', w));

    const search = document.getElementById('myClassFamilySearch');
    search.oninput = () => { myClassFamilySearch = search.value; const pos = search.selectionStart; renderMyClassFamilies(); const s2 = document.getElementById('myClassFamilySearch'); s2.focus(); s2.setSelectionRange(pos, pos); };
    container.appendChild(reportDownloadBar(() => report, 'My Class — families — ' + (myClassInfo.class_name || ''), 'my-class-families', 'Every child with their parents\u2019 details, for this class only.'));
  }

  // Class-list preview (used by the one 📥 Import a file button when the
  // file is a list of children, and by the older children-import card).
  // rows[0] is the header row. Nothing is saved until Confirm.
  let classImportReview = [];  // rows not on the roll, editable before anything is saved
  let classImportJunk = [];    // children already on the roll whose "name" looks like a note
  let classImportCtx = null;

  function previewClassPupilImportRows(rows, resultEl, removeMissing){
    pendingPupilSync = null; classImportReview = []; classImportJunk = []; classImportCtx = null;
    if(!Array.isArray(realPupilsCache)){ resultEl.innerHTML = '<div class="au-error">Still loading the roll — try again in a moment.</div>'; return; }
    if(!rows || !rows.length){ resultEl.innerHTML = '<div class="au-error">The file is empty.</div>'; return; }
    const header = rows[0].map(h => h.trim().toLowerCase().replace(/[\s_]+/g, ' '));
    const col = n => header.findIndex(h => h === n);
    let nameCol = [col('name'), col('student name'), col('child name'), col('child')].find(i => i >= 0);
    if(nameCol === undefined && typeof SI_NAME_WORDS !== 'undefined'){ const k = header.findIndex(h => SI_NAME_WORDS.includes(h)); if(k >= 0) nameCol = k; }
    if(nameCol === undefined){ resultEl.innerHTML = '<div class="au-error">The first row must be a header with a "name" column (e.g. name,admitted date,dob,gender).</div>'; return; }
    const admCol = [col('admitted date'), col('admission date'), col('date of admission')].find(i => i >= 0);
    const dobCol = [col('dob'), col('date of birth')].find(i => i >= 0);
    const genderCol = col('gender');
    const regCol = rows[0].findIndex(isRegisterHeader);
    const minCol = rows[0].findIndex(isMinHeader);

    const onRoll = {};
    realPupilsCache.forEach(p => { onRoll[normPupilName(p.name)] = p; });
    const seen = new Set(), review = [], keep = [], problems = [], regUpdates = [], minUpdates = [];
    for(let i = 1; i < rows.length; i++){
      const r = rows[i];
      const split = splitRegisterFromName(r[nameCol]);
      const name = split.name;
      if(!name) continue;
      const register_no = (regCol >= 0 ? pupilCleanReg(r[regCol]) : '') || split.register_no;
      const min_no = minCol >= 0 ? pupilCleanMin(r[minCol]) : '';
      const key = normPupilName(name);
      if(seen.has(key)){ problems.push(`Row ${i + 1}: "${name}" appears twice in the file — used once.`); continue; }
      seen.add(key);
      if(onRoll[key]){
        keep.push(onRoll[key].name);
        if(register_no && String(onRoll[key].register_no || '') !== register_no) regUpdates.push({ id: onRoll[key].id, name: onRoll[key].name, register_no });
        if(min_no && String(onRoll[key].min_no || '') !== min_no) minUpdates.push({ id: onRoll[key].id, name: onRoll[key].name, min_no });
        continue;
      }
      const adm = admCol !== undefined ? normaliseImportDate(r[admCol]) : '';
      const dob = dobCol !== undefined ? normaliseImportDate(r[dobCol]) : '';
      if(adm === null){ problems.push(`Row ${i + 1} (${name}): admitted date "${r[admCol]}" isn't a date I can read — today's date will be used.`); }
      if(dob === null){ problems.push(`Row ${i + 1} (${name}): date of birth "${r[dobCol]}" isn't a date I can read — left blank.`); }
      let gender = genderCol >= 0 ? (r[genderCol] || '').trim() : '';
      if(/^f/i.test(gender)) gender = 'Female'; else if(/^m/i.test(gender)) gender = 'Male'; else gender = '';
      // Names that look like notes start out ticked "Skip"; everything here can be edited.
      review.push({ name, register_no, min_no, admitted_date: adm || todayDateKey(), dob: dob || '', gender, skip: !!pupilNameProblem(name), verify: false });
    }
    classImportReview = review;
    classImportJunk = realPupilsCache.filter(p => pupilNameProblem(p.name)).map(p => ({ id: p.id, name: p.name, remove: true }));
    classImportCtx = { onRoll, seen, keep, problems, regUpdates, minUpdates, removeMissing, resultEl };

    const wouldRemove = removeMissing && realPupilsCache.some(p => !seen.has(normPupilName(p.name)));
    if(!review.length && !regUpdates.length && !minUpdates.length && !wouldRemove && !classImportJunk.length){
      resultEl.innerHTML = `<div class="au-success">Nothing to change — all ${keep.length} name${keep.length === 1 ? '' : 's'} in the file are already on the roll.</div>` + (problems.length ? `<div class="au-error" style="margin-top:6px;">${problems.map(esc).join('<br>')}</div>` : '');
      return;
    }
    const states = review.map(r => pupilReviewState(r, onRoll));
    resultEl.innerHTML = `<div style="border:1px solid var(--border); border-radius:8px; padding:14px;">
      <p style="margin:0 0 8px; font-weight:600;">Preview — nothing has been saved yet</p>
      <div id="classImportSummary"></div>
      ${classImportJunk.length ? `<div style="background:#fdf1e3; border-radius:8px; padding:8px 10px; margin:8px 0; font-size:12.5px;">
        <p style="margin:0 0 4px; font-weight:600; color:#8a5a1c;">On the roll, but these don't look like children</p>
        ${classImportJunk.map((j, i) => `<label style="display:flex; gap:8px; align-items:center; margin:2px 0;"><input type="checkbox" id="classImportJunk${i}" checked onchange="classImportJunkToggle(${i}, this.checked)" /> Take <b>${esc(j.name)}</b> off the roll</label>`).join('')}
        <p class="cap" style="margin:4px 0 0;">Their past records are kept; they just stop appearing on registers.</p></div>` : ''}
      ${review.length ? `<p style="margin:10px 0 4px; font-weight:600;">Needs your review (${review.length})</p>
        <p class="cap" style="margin:0 0 6px;">These are not on the roll yet. Fix a name, add the <b>Register no.</b> or <b>MIN no.</b>, or tick <b>Skip</b>. Nothing is added until it has a proper name and a number (or “Add without number”).</p>
        ${pupilReviewTableHtml('classImport', 'classImportReviewEdit', 'classImportVerifyAll', review, states)}` : ''}
      ${problems.length ? `<div style="background:#fdf1e3; color:#8a5a1c; border-radius:8px; padding:8px 10px; margin:8px 0; font-size:12.5px;">${problems.slice(0, 15).map(esc).join('<br>')}</div>` : ''}
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button class="btn-primary" id="classImportConfirmBtn" style="width:auto; padding:8px 14px;" onclick="confirmClassPupilImport()">Confirm</button>
        <button class="btn" onclick="pendingPupilSync = null; classImportReview = []; document.getElementById('classPupilImportResult').innerHTML = '<p class=&quot;cap&quot;>Import cancelled — nothing was saved.</p>';">Cancel</button>
      </div></div>`;
    classImportRefresh();
  }

  // Works out what would be saved right now, from the file plus the teacher's edits.
  function classImportRecompute(){
    const c = classImportCtx;
    const add = [], regUpdates = c.regUpdates.slice(), minUpdates = c.minUpdates.slice();
    const used = new Set(), seenNow = new Set(c.seen), states = [];
    let blocked = 0, skipped = 0, matched = 0;
    classImportReview.forEach((r, i) => {
      let st = pupilReviewState(r, c.onRoll);
      const key = normPupilName(r.name);
      if((st.kind === 'match' || st.kind === 'add') && used.has(key)) st = { kind: 'skip', text: 'Same name as another row above, so it is left out.' };
      states[i] = st;
      if(st.kind === 'skip'){ skipped++; return; }
      if(st.kind === 'problem' || st.kind === 'needs'){ blocked++; return; }
      used.add(key); seenNow.add(key);
      const reg = pupilCleanReg(r.register_no), min = pupilCleanMin(r.min_no);
      if(st.kind === 'match'){
        const p = c.onRoll[key]; matched++;
        if(reg && String(p.register_no || '') !== reg && !regUpdates.some(u => u.id === p.id)) regUpdates.push({ id: p.id, name: p.name, register_no: reg });
        if(min && String(p.min_no || '') !== min && !minUpdates.some(u => u.id === p.id)) minUpdates.push({ id: p.id, name: p.name, min_no: min });
        return;
      }
      add.push({ name: r.name.trim().replace(/\s+/g, ' '), register_no: reg, min_no: min, manual_verified: !!r.verify, admitted_date: r.admitted_date, dob: r.dob, gender: r.gender });
    });
    const junkIds = new Set(classImportJunk.filter(j => j.remove).map(j => j.id));
    const remove = [];
    realPupilsCache.forEach(p => {
      if(junkIds.has(p.id) || (c.removeMissing && !seenNow.has(normPupilName(p.name)))) remove.push({ id: p.id, name: p.name });
    });
    pendingPupilSync = { add, keep: c.keep, remove, removeMissing: c.removeMissing, regUpdates, minUpdates };
    return { add, remove, regUpdates, minUpdates, blocked, skipped, matched, states };
  }

  function classImportRefresh(){
    if(!classImportCtx) return;
    const t = classImportRecompute();
    const box = document.getElementById('classImportSummary'); if(!box) return;
    const list = arr => arr.slice(0, 40).map(esc).join(', ') + (arr.length > 40 ? ' …and ' + (arr.length - 40) + ' more' : '');
    box.innerHTML =
      (t.add.length ? `<p style="margin:0 0 6px;"><b style="color:var(--good,#0a7a0a);">${t.add.length} to add</b> to ${esc(myClassInfo.class_name || 'this class')}: <span class="cap">${list(t.add.map(a => a.name))}</span></p>` : '')
      + `<p style="margin:0 0 6px;"><b>${classImportCtx.keep.length} already on the roll</b> — left as they are${t.regUpdates.length ? `, except <b>${t.regUpdates.length}</b> whose register number will be saved` : ''}${t.minUpdates.length ? `${t.regUpdates.length ? ' and' : ', except'} <b>${t.minUpdates.length}</b> whose MIN number will be saved` : ''}.</p>`
      + (t.blocked ? `<p style="margin:0 0 6px; color:var(--crit,#d03b3b);"><b>${t.blocked}</b> row${t.blocked === 1 ? '' : 's'} below still need${t.blocked === 1 ? 's' : ''} a fix or a Skip — they will <b>not</b> be imported yet.</p>` : '')
      + (t.remove.length ? `<p style="margin:0 0 6px;"><b style="color:var(--crit,#d03b3b);">${t.remove.length} to take off the roll</b>: <span class="cap">${list(t.remove.map(r => r.name))}</span></p>` : '');
    pupilReviewPaint('classImport', t.states);
    const btn = document.getElementById('classImportConfirmBtn');
    const label = [t.add.length ? 'add ' + t.add.length : '', t.remove.length ? 'remove ' + t.remove.length : '', t.regUpdates.length ? 'save ' + t.regUpdates.length + ' register no.' : '', t.minUpdates.length ? 'save ' + t.minUpdates.length + ' MIN no.' : ''].filter(Boolean).join(', ');
    if(btn){ btn.textContent = label ? 'Confirm — ' + label : 'Nothing to save yet'; btn.disabled = !label; }
  }

  function classImportReviewEdit(i, field, value){
    const r = classImportReview[i]; if(!r) return;
    r[field] = value;
    if(field === 'skip') r.skipTouched = true;
    // A name that started out looking like a note is un-skipped once it has been fixed (unless the teacher chose).
    if(field === 'name' && !r.skipTouched){ r.skip = !!pupilNameProblem(value); const el = document.getElementById('classImportSkip' + i); if(el) el.checked = r.skip; }
    classImportRefresh();
  }
  function classImportVerifyAll(checked){
    classImportReview.forEach((r, i) => { r.verify = checked; const el = document.getElementById('classImportVerify' + i); if(el) el.checked = checked; });
    classImportRefresh();
  }
  function classImportJunkToggle(i, checked){ if(classImportJunk[i]) classImportJunk[i].remove = checked; classImportRefresh(); }

  // Turns one sheet into plain text rows for the class-list preview,
  // starting at the header row (the first row with a name heading).
  function siClassListRows(grid){
    const toText = v => v instanceof Date ? siYmd(v) : String(v == null ? '' : v).trim();
    for(let r = 0; r < Math.min(grid.length, 40); r++){
      const row = grid[r] || [];
      const norm = row.map(v => siNorm(v));
      if(norm.some(h => SI_NAME_WORDS.includes(h))){
        const out = grid.slice(r).map(x => (x || []).map(toText));
        const nameIdx = norm.findIndex(h => SI_NAME_WORDS.includes(h));
        const names = out.slice(1).filter(x => (x[nameIdx] || '').trim()).length;
        return names ? { rows: out, names } : null;
      }
    }
    return null;
  }

  // Step shown when the file is a CLASS LIST (names, no attendance marks).
  function renderSmartClassListStep(fileName, rows){
    const out = document.getElementById('smartImportPanel');
    smartImport = { fileName, classList: rows };
    out.innerHTML = `<div style="border:1px solid var(--border); border-radius:10px; padding:14px; background:var(--bg);">
      <p style="margin:0 0 4px; font-weight:600;">“${esc(fileName)}” is a class list — it has children's names but no attendance marks.</p>
      <p class="cap" style="margin:0 0 10px;">So I'll update ${esc(myClassInfo.class_name || 'this class')}'s roll: add new children, save register numbers, and leave children already on the roll as they are. Nothing is saved until you confirm.</p>
      <label style="display:flex; align-items:flex-start; gap:8px; font-size:13px; margin:4px 0 10px;">
        <input type="checkbox" id="classPupilRemoveMissing" style="margin-top:3px;" onchange="previewClassPupilImportRows(smartImport.classList, document.getElementById('classPupilImportResult'), this.checked)" />
        <span>This file is the <b>complete</b> class list — take children who are not in it off the roll (their past records are kept).</span>
      </label>
      <div id="classPupilImportResult" style="word-break:break-word; overflow-wrap:anywhere;"></div>
    </div>`;
    previewClassPupilImportRows(rows, document.getElementById('classPupilImportResult'), false);
  }