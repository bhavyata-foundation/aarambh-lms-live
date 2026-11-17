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
      <p class="cap" style="margin:0 0 12px;">Comparing two months' class-wide E/P/A counts. This shows whether the class's overall balance shifted toward Advanced — it cannot show which specific child moved, since the tally isn't recorded per child.</p>
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
