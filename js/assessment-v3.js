/* ARAMBH LMS — Assessment V3
 * Compact, progressive-disclosure Classroom Observation assessment UI.
 * Uses the existing observation API and existing E/P/A records.
 * Display labels: B/P/A (B maps to stored E).
 */
(function(){
  const V3 = window.ARAMBH_ASSESSMENT_V3 = window.ARAMBH_ASSESSMENT_V3 || {
    openCg: null,
    childOpen: false,
    childId: null,
    editOpen: false,
    detailsOpen: false
  };

  const bpa = v => {
    const k = String(v == null ? '' : v).trim().toUpperCase();
    return k === 'E' || k === 'B' || k === '1' ? 'B' : k === 'P' || k === '2' ? 'P' : k === 'A' || k === '3' ? 'A' : '';
  };
  const score = k => k === 'B' ? 1 : k === 'P' ? 2 : k === 'A' ? 3 : 0;
  const level = (b,p,a) => {
    const n = b+p+a;
    if(!n) return null;
    const avg = (b + p*2 + a*3) / n;
    return { letter: avg < 1.67 ? 'B' : avg < 2.34 ? 'P' : 'A', avg: Math.round(avg*100)/100, pa: Math.round((p+a)/n*100), n };
  };
  const badge = k => {
    const x = bpa(k); if(!x) return '<span class="av3-empty">—</span>';
    const label = x === 'B' ? 'Beginner' : x === 'P' ? 'Proficient' : 'Advanced';
    return `<span class="av3-badge av3-${x}" title="${label}">${x}</span>`;
  };
  const pct = n => n == null ? '—' : n + '%';

  function aggregate(months, levelName, pupils){
    const allItems = [];
    const marksByMonth = {};
    months.forEach(m => {
      const themes = observationThemesCache[levelName + '|' + m] || [];
      const marks = observationAssessmentCache[m] || {};
      marksByMonth[m] = marks;
      themes.forEach(theme => theme.items.forEach(item => allItems.push({
        ...item,
        themeName: theme.name,
        themeId: theme.id,
        month: m
      })));
    });

    // A CG is the curricular goal, not the individual competency code.
    // cg_code (for example C-1.3) is a competency. curricular_goal_id maps
    // that competency to its parent CG (for example CG-1).
    const cg = {};
    const child = {};
    const itemSeen = new Set();
    const activitySeen = new Set();
    const cgItems = {};
    let recorded = 0;

    const add = (obj, key, mark) => {
      if(!obj[key]) obj[key] = { b:0,p:0,a:0,n:0 };
      const k = bpa(mark); if(!k) return;
      obj[key][k.toLowerCase()]++;
      obj[key].n++;
    };

    allItems.forEach(item => {
      itemSeen.add(String(item.id));
      activitySeen.add(String(item.month) + '|' + String(item.themeId));

      const cgKey = item.curricular_goal_id != null
        ? String(item.curricular_goal_id)
        : ('code:' + String(item.cg_code || 'Unassigned').trim());
      const goalText = String(item.goal_text || '').trim();
      const cgMatch = goalText.match(/CG-\d+/i);
      const cgCode = cgMatch ? cgMatch[0].toUpperCase() : (String(item.cg_code || 'Unassigned').match(/\d+/)?.[0] ? 'CG-' + String(item.cg_code).match(/\d+/)[0] : 'Unassigned');

      if(!cg[cgKey]) cg[cgKey] = {
        key: cgKey,
        code: cgCode,
        goal: goalText || cgCode,
        items: new Set(),
        activities: new Set(),
        themes: new Set(),
        b:0,p:0,a:0,n:0
      };

      cg[cgKey].items.add(String(item.id));
      cg[cgKey].activities.add(String(item.month) + '|' + String(item.themeId));
      cg[cgKey].themes.add(String(item.month) + '|' + String(item.themeName));
      if(!cgItems[cgKey]) cgItems[cgKey] = [];
      if(!cgItems[cgKey].some(x => String(x.id) === String(item.id) && String(x.month) === String(item.month))) {
        cgItems[cgKey].push(item);
      }

      pupils.forEach(p => {
        const mark = (marksByMonth[item.month][p.id] || {})[item.id];
        const k = bpa(mark);
        if(k){
          cg[cgKey][k.toLowerCase()]++;
          cg[cgKey].n++;
          recorded++;
          if(!child[p.id]) child[p.id] = {};
          add(child[p.id], cgKey, mark);
        }
      });
    });

    Object.values(cg).forEach(r => {
      r.competencies = r.items.size;
      r.activityCount = r.activities.size;
      r.level = level(r.b,r.p,r.a);
    });
    Object.values(child).forEach(byCg => Object.values(byCg).forEach(r => {
      r.level = level(r.b,r.p,r.a);
    }));

    const total = Object.values(cg).reduce((a,r) => ({
      b:a.b+r.b,
      p:a.p+r.p,
      a:a.a+r.a
    }), {b:0,p:0,a:0});
    total.level = level(total.b,total.p,total.a);

    return { allItems, itemSeen, activitySeen, cg, cgItems, child, total, recorded, expected: itemSeen.size * pupils.length };
  }

  function css(){
    if(document.getElementById('assessment-v3-css')) return;
    const s=document.createElement('style'); s.id='assessment-v3-css';
    s.textContent=`
      .av3-wrap{display:flex;flex-direction:column;gap:14px}
      .av3-card{background:#fff;border:1px solid var(--border,#dfe8e2);border-radius:14px;box-shadow:0 2px 10px rgba(20,70,45,.04);overflow:hidden}
      .av3-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 17px;cursor:pointer}
      .av3-head h3{margin:0;font-family:var(--disp,inherit);font-size:15px;color:var(--text,#1e2b24)}
      .av3-sub{margin:3px 0 0;color:var(--text-muted,#6d766f);font-size:12px}
      .av3-body{padding:0 17px 17px}
      .av3-overview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:15px 17px}
      .av3-stat{padding:12px;border:1px solid var(--border,#dfe8e2);border-radius:11px;background:#fbfdfc}
      .av3-stat .k{font-size:11px;color:var(--text-muted,#6d766f);font-weight:600}.av3-stat .v{font-size:22px;font-weight:800;margin-top:3px}.av3-stat .d{font-size:11px;color:var(--text-muted,#6d766f);margin-top:2px}
      .av3-level{font-size:28px;font-weight:900}.av3-badge{display:inline-flex;align-items:center;justify-content:center;width:27px;height:27px;border-radius:50%;font-weight:800;border:1px solid;vertical-align:middle}
      .av3-B{background:#fde4e2;color:#b3261e;border-color:#d64545}.av3-P{background:#fff4cc;color:#8a6400;border-color:#e9b824}.av3-A{background:#ddf3e5;color:#1e7a45;border-color:#2e9e5b}.av3-empty{color:#a2aaa4}
      .av3-mini{font-size:11px;color:var(--text-muted,#6d766f)}
      .av3-cg-row{display:grid;grid-template-columns:minmax(210px,1fr) 82px 92px 92px 76px 100px 86px;align-items:center;gap:8px;padding:10px 0;border-top:1px solid var(--border,#edf1ee)}
      .av3-cg-row:first-child{border-top:0}.av3-cg-name{font-weight:700}.av3-cg-name small{display:block;font-weight:400;color:var(--text-muted,#6d766f);margin-top:2px}
      .av3-num{text-align:center;font-size:12px}.av3-num strong{display:block;font-size:13px}.av3-table{width:100%;border-collapse:collapse}.av3-table th{font-size:11px;color:var(--text-muted,#6d766f);font-weight:700;text-align:center;padding:8px 6px;border-bottom:1px solid var(--border)}.av3-table td{font-size:12px;padding:8px 6px;border-bottom:1px solid var(--border);text-align:center}.av3-table th:first-child,.av3-table td:first-child{text-align:left}.av3-link{border:0;background:none;color:var(--primary,#148b64);font-weight:700;cursor:pointer;padding:4px 0}.av3-detail{margin-top:10px;padding:13px;border-radius:11px;background:#f7fbf9;border:1px solid var(--border)}
      .av3-filter{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:13px 17px;border-bottom:1px solid var(--border)}.av3-filter input,.av3-filter select{padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:#fff;font:inherit;font-size:12px}
      .av3-scroll{overflow:auto}.av3-note{padding:10px 12px;border-radius:9px;background:#f8faf9;color:var(--text-muted,#6d766f);font-size:12px}
      .av3-edit .av3-head{background:#fbfdfc}.av3-chevron{font-size:13px;color:var(--text-muted);transition:transform .15s}.av3-open .av3-chevron{transform:rotate(90deg)}
      @media(max-width:900px){.av3-overview{grid-template-columns:repeat(2,1fr)}.av3-cg-row{grid-template-columns:minmax(180px,1fr) 65px 65px 70px 60px 80px 60px}.av3-cg-row .hide-sm{display:none}}
      @media(max-width:620px){.av3-overview{grid-template-columns:1fr 1fr}.av3-cg-row{grid-template-columns:minmax(150px,1fr) 55px 55px 55px}.av3-cg-row .optional{display:none}}
    `;
    document.head.appendChild(s);
  }

  function renderCompactObservation(container){
    css();
    const levelName = workbookLevelFromClassName();
    const rerender = () => renderMonthlyAssessment(monthlyAssessmentTargetEl);
    const TERM_MONTHS = assessTermMonths();
    if(!TERM_MONTHS.includes(obsRangeFrom)) obsRangeFrom=currentWorkbookMonth;
    if(!TERM_MONTHS.includes(obsRangeTo)) obsRangeTo=currentWorkbookMonth;
    const iFrom=TERM_MONTHS.indexOf(obsRangeFrom), iTo=TERM_MONTHS.indexOf(obsRangeTo);
    const rangeMonths=TERM_MONTHS.slice(Math.min(iFrom,iTo),Math.max(iFrom,iTo)+1);

    const bar=document.createElement('div'); bar.className='fbar'; bar.style.cssText='margin-bottom:14px;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end';
    const opts=s=>TERM_MONTHS.map(m=>`<option value="${esc(m)}" ${m===s?'selected':''}>${esc(m)}</option>`).join('');
    bar.innerHTML=`<div class="ctl"><label>From</label><select id="av3from">${opts(obsRangeFrom)}</select></div><div class="ctl"><label>To</label><select id="av3to">${opts(obsRangeTo)}</select></div>`;
    container.appendChild(bar);
    const setRange=(from,to)=>{if(TERM_MONTHS.indexOf(from)>TERM_MONTHS.indexOf(to))[from,to]=[to,from];obsRangeFrom=from;obsRangeTo=to;currentWorkbookMonth=from;currentObservationThemeId=null;V3.openCg=null;V3.childId=null;rerender();};
    bar.querySelector('#av3from').onchange=e=>setRange(e.target.value,obsRangeTo);bar.querySelector('#av3to').onchange=e=>setRange(obsRangeFrom,e.target.value);

    if(!ensurePupilsLoadedFor(container,rerender)) return;
    const themesReady=rangeMonths.map(m=>ensureObservationThemesLoaded(levelName,m,rerender)).every(Boolean);
    const marksReady=rangeMonths.map(m=>ensureObservationAssessmentLoaded(m,rerender)).every(Boolean);
    if(!themesReady||!marksReady){container.appendChild(mdCard(null,'Loading assessment records…',null));return;}
    const pupils=realPupilsCache||[];
    const A=aggregate(rangeMonths,levelName,pupils);
    const allThemes=rangeMonths.flatMap(m=>(observationThemesCache[levelName+'|'+m]||[]));
    const themeCount=allThemes.length;
    const overall=A.total.level;
    const completion=A.expected?Math.round(A.recorded/A.expected*100):0;

    const wrap=document.createElement('div');wrap.className='av3-wrap';container.appendChild(wrap);

    const overview=document.createElement('div');overview.className='av3-card';
    overview.innerHTML=`<div class="av3-overview">
      <div class="av3-stat"><div class="k">Children</div><div class="v">${pupils.length}</div><div class="d">this class</div></div>
      <div class="av3-stat"><div class="k">CGs covered</div><div class="v">${Object.keys(A.cg).length}</div><div class="d">${themeCount} themes</div></div>
      <div class="av3-stat"><div class="k">Activities</div><div class="v">${A.activitySeen.size}</div><div class="d">expected grades ${A.expected}</div></div>
      <div class="av3-stat"><div class="k">Overall class level</div><div class="v av3-level">${badge(overall&&overall.letter)}</div><div class="d">${overall?overall.avg+'/3 · '+overall.pa+'% P or above':'No grades yet'} · ${A.recorded}/${A.expected} recorded (${completion}%)</div></div>
    </div>`;
    wrap.appendChild(overview);

    const cgCard=document.createElement('div');cgCard.className='av3-card';
    const cgOpen=V3.detailsOpen;
    cgCard.innerHTML=`<div class="av3-head ${cgOpen?'av3-open':''}" id="av3DetailsHead"><div><h3>CG performance</h3><p class="av3-sub">See each CG's current BPA level first. Open a CG only when you need its activity and BPA details.</p></div><span class="av3-chevron">▶</span></div>`;
    const cgBody=document.createElement('div');cgBody.className='av3-body '+(cgOpen?'':'hidden');
    cgCard.querySelector('#av3DetailsHead').onclick=()=>{V3.detailsOpen=!V3.detailsOpen;rerender();};
    const sorted=Object.values(A.cg).sort((x,y)=>{const na=parseInt((x.code.match(/\d+/)||['999'])[0],10),nb=parseInt((y.code.match(/\d+/)||['999'])[0],10);return na-nb||x.code.localeCompare(y.code);});
    if(!sorted.length) cgBody.innerHTML='<div class="av3-note">No CG assessment records are available for this period yet.</div>';
    else {
      const head=document.createElement('div');head.className='av3-cg-row';head.innerHTML='<div><b>CG</b></div><div class="av3-num">Activities</div><div class="av3-num">Competencies</div><div class="av3-num">Grades</div><div class="av3-num">P+A</div><div class="av3-num">Avg.</div><div class="av3-num">Level</div>';cgBody.appendChild(head);
      sorted.forEach(r=>{
        const l=r.level;const row=document.createElement('div');row.className='av3-cg-row';
        row.innerHTML=`<div class="av3-cg-name">${esc(r.code)}<small>${esc(r.goal)}</small></div><div class="av3-num"><strong>${r.activityCount}</strong><span class="av3-mini">activities</span></div><div class="av3-num"><strong>${r.competencies}</strong><span class="av3-mini">competencies</span></div><div class="av3-num"><strong>${r.n}</strong><span class="av3-mini">${r.competencies*pupils.length} exp.</span></div><div class="av3-num"><strong>${l?pct(l.pa):'—'}</strong></div><div class="av3-num"><strong>${l?l.avg:'—'}</strong><span class="av3-mini">/ 3</span></div><div class="av3-num">${badge(l&&l.letter)}</div>`;
        row.querySelector('.av3-cg-name').style.cursor='pointer';row.querySelector('.av3-cg-name').onclick=()=>{V3.openCg=V3.openCg===r.key?null:r.key;rerender();};
        cgBody.appendChild(row);
        if(V3.openCg===r.key){
          const d=document.createElement('div');d.className='av3-detail';
          const items=A.cgItems[r.key]||[];
          d.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><b>${esc(r.code)} — ${esc(r.goal)}</b><span>${badge(l&&l.letter)} <span class="av3-mini">${l?l.avg+'/3 · '+l.pa+'% P or above':''}</span></span></div>
          <div style="margin-top:10px;display:flex;gap:18px;flex-wrap:wrap;font-size:12px"><span>B <b>${r.b}</b></span><span>P <b>${r.p}</b></span><span>A <b>${r.a}</b></span><span>Total <b>${r.n}</b></span></div>
          <div class="av3-scroll" style="margin-top:10px"><table class="av3-table"><thead><tr><th>Activity</th><th>Competency</th><th>Month</th><th>Grades</th></tr></thead><tbody>${items.map(it=>{let n=0;rangeMonths.forEach(m=>{const pm=observationAssessmentCache[m]||{};pupils.forEach(p=>{if((pm[p.id]||{})[it.id])n++;});});return `<tr><td>${esc(it.themeName)}</td><td>${esc(it.cg_code||'—')}</td><td>${esc(it.month)}</td><td>${n}/${pupils.length}</td></tr>`;}).join('')}</tbody></table></div>`;
          cgBody.appendChild(d);
        }
      });
      const l=A.total.level;const total=document.createElement('div');total.className='av3-detail';total.style.marginTop='12px';total.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>All CGs — collective total</b><span>${badge(l&&l.letter)} <span class="av3-mini">${l?l.avg+'/3 · '+l.pa+'% P or above':''}</span></span></div><div style="margin-top:8px;font-size:12px">B <b>${A.total.b}</b> · P <b>${A.total.p}</b> · A <b>${A.total.a}</b> · Total grades <b>${A.recorded}/${A.expected}</b></div>`;cgBody.appendChild(total);
    }
    cgCard.appendChild(cgBody);wrap.appendChild(cgCard);

    const childCard=document.createElement('div');childCard.className='av3-card';
    childCard.innerHTML=`<div class="av3-head ${V3.childOpen?'av3-open':''}" id="av3ChildHead"><div><h3>Child-wise progress</h3><p class="av3-sub">See whether each child is at Beginner, Proficient or Advanced for every CG.</p></div><span class="av3-chevron">▶</span></div>`;
    const childBody=document.createElement('div');childBody.className='av3-body '+(V3.childOpen?'':'hidden');
    childCard.querySelector('#av3ChildHead').onclick=()=>{V3.childOpen=!V3.childOpen;rerender();};
    if(V3.childOpen){
      const controls=document.createElement('div');controls.className='av3-filter';controls.innerHTML='<input id="av3ChildSearch" placeholder="Search child name or register no."><select id="av3LevelFilter"><option value="">All levels</option><option value="B">B — Beginner</option><option value="P">P — Proficient</option><option value="A">A — Advanced</option></select>';
      childBody.appendChild(controls);
      const tableWrap=document.createElement('div');tableWrap.className='av3-scroll';
      const renderChildren=()=>{
        const q=(controls.querySelector('#av3ChildSearch').value||'').toLowerCase().trim(), lf=controls.querySelector('#av3LevelFilter').value;
        const rows=pupils.filter(p=>(!q||((p.name||'')+' '+(p.register_no||'')).toLowerCase().includes(q))).map(p=>{
          const byCg=A.child[p.id]||{};let total={b:0,p:0,a:0};Object.values(byCg).forEach(x=>{total.b+=x.b;total.p+=x.p;total.a+=x.a;});const ov=level(total.b,total.p,total.a);
          if(lf&&(!ov||ov.letter!==lf))return '';
          const cgCells=sorted.map(r=>{const x=byCg[r.key];const title=x&&x.level?`${r.code} — ${x.level.letter === 'B' ? 'Beginner' : x.level.letter === 'P' ? 'Proficient' : 'Advanced'} · ${x.n} recorded grades`: `${r.code} — No grade recorded`;return `<td class="av3-child-cg" title="${esc(title)}">${x&&x.level?badge(x.level.letter):'<span class="av3-empty">—</span>'}</td>`;}).join('');
          return `<tr><td><b>${esc(p.name)}</b><div class="av3-mini">${p.register_no?'Reg. '+esc(p.register_no):''}</div></td>${cgCells}<td>${badge(ov&&ov.letter)}</td><td><button class="av3-link" data-child="${p.id}">View</button></td></tr>`;
        }).filter(Boolean).join('');
        tableWrap.innerHTML=`<table class="av3-table"><thead><tr><th>Child</th>${sorted.map(r=>`<th title="${esc(r.goal)}">${esc(r.code)}</th>`).join('')}<th>Overall</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="99" class="av3-empty">No children match this filter.</td></tr>'}</tbody></table>`;
        tableWrap.querySelectorAll('[data-child]').forEach(btn=>btn.onclick=()=>{V3.childId=Number(btn.dataset.child);rerender();});
      };
      controls.querySelector('#av3ChildSearch').oninput=renderChildren;controls.querySelector('#av3LevelFilter').onchange=renderChildren;renderChildren();childBody.appendChild(tableWrap);
    }
    childCard.appendChild(childBody);wrap.appendChild(childCard);

    if(V3.childId!=null){
      const p=pupils.find(x=>Number(x.id)===Number(V3.childId));
      if(p){
        const detail=document.createElement('div');detail.className='av3-card';const byCg=A.child[p.id]||{};let tb=0,tp=0,ta=0;Object.values(byCg).forEach(x=>{tb+=x.b;tp+=x.p;ta+=x.a;});const ov=level(tb,tp,ta);
        detail.innerHTML=`<div class="av3-head"><div><h3>${esc(p.name)} — child report</h3><p class="av3-sub">Each CG level is calculated from this child's recorded activity grades.</p></div><button class="btn" id="av3CloseChild" style="padding:6px 10px">Close</button></div><div class="av3-body"><div class="av3-overview" style="padding:0 0 12px"><div class="av3-stat"><div class="k">Overall level</div><div class="v av3-level">${badge(ov&&ov.letter)}</div><div class="d">${ov?ov.avg+'/3':''}</div></div><div class="av3-stat"><div class="k">P or above</div><div class="v">${ov?pct(ov.pa):'—'}</div><div class="d">of recorded grades</div></div><div class="av3-stat"><div class="k">Recorded</div><div class="v">${tb+tp+ta}</div><div class="d">activity grades</div></div></div><table class="av3-table"><thead><tr><th>CG</th><th>Activities assessed</th><th>B</th><th>P</th><th>A</th><th>P+A</th><th>Level</th></tr></thead><tbody>${sorted.map(r=>{const x=byCg[r.key],l=x&&x.level;return `<tr><td><b>${esc(r.code)}</b><div class="av3-mini">${esc(r.goal)}</div></td><td>${x?x.n:0}</td><td>${x?x.b:0}</td><td>${x?x.p:0}</td><td>${x?x.a:0}</td><td>${l?pct(l.pa):'—'}</td><td>${badge(l&&l.letter)}</td></tr>`;}).join('')}</tbody></table></div>`;
        detail.querySelector('#av3CloseChild').onclick=()=>{V3.childId=null;rerender();};wrap.appendChild(detail);
      }
    }

    const edit=document.createElement('div');edit.className='av3-card av3-edit';
    edit.innerHTML=`<div class="av3-head ${V3.editOpen?'av3-open':''}" id="av3EditHead"><div><h3>✏️ Enter / edit assessment</h3><p class="av3-sub">Open the familiar child-by-competency grid only when you need to grade.</p></div><span class="av3-chevron">▶</span></div>`;
    const editBody=document.createElement('div');editBody.className='av3-body '+(V3.editOpen?'':'hidden');
    edit.querySelector('#av3EditHead').onclick=()=>{V3.editOpen=!V3.editOpen;rerender();};
    if(V3.editOpen){
      // Re-use the selected theme controls and existing save functions without duplicating data-entry logic.
      const themeBar=document.createElement('div');themeBar.className='fbar';themeBar.style.cssText='margin-bottom:12px;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end';
      const themeOptions=rangeMonths.flatMap(m=>(observationThemesCache[levelName+'|'+m]||[]).map(t=>({m,t})));if(!themeOptions.length){editBody.appendChild(document.createTextNode('No themes scheduled.'));}
      else{
        if(!themeOptions.some(x=>x.m===currentWorkbookMonth&&x.t.id===currentObservationThemeId)){currentWorkbookMonth=themeOptions[0].m;currentObservationThemeId=themeOptions[0].t.id;}
        themeBar.innerHTML=`<div class="ctl"><label>Theme</label><select id="av3theme">${themeOptions.map(x=>`<option value="${x.m}|${x.t.id}" ${x.m===currentWorkbookMonth&&x.t.id===currentObservationThemeId?'selected':''}>${esc(x.m+' — '+x.t.name)} (${x.t.items.length})</option>`).join('')}</select></div>`;editBody.appendChild(themeBar);
        themeBar.querySelector('#av3theme').onchange=e=>{const [m,id]=e.target.value.split('|');currentWorkbookMonth=m;currentObservationThemeId=Number(id);rerender();};
        const themes=observationThemesCache[levelName+'|'+currentWorkbookMonth]||[],theme=themes.find(t=>Number(t.id)===Number(currentObservationThemeId))||themes[0],marks=observationAssessmentCache[currentWorkbookMonth]||{};
        if(theme){const groups=[];theme.items.forEach(it=>{let g=groups.find(x=>x.key===(it.curricular_goal_id||'u'));if(!g){g={key:it.curricular_goal_id||'u',goal:it.goal_text||it.cg_code,items:[]};groups.push(g);}g.items.push(it);});
          const ordered=groups.flatMap(g=>g.items);let h='<div class="av3-scroll"><table class="av3-table"><thead><tr><th rowspan="2">Child</th>'+groups.map(g=>`<th colspan="${g.items.length}">${esc(g.goal)}</th>`).join('')+'</tr><tr>'+groups.flatMap(g=>g.items.map(it=>`<th>${esc(it.cg_code)}</th>`)).join('')+'</tr></thead><tbody>';
          pupils.forEach(p=>{const pm=marks[p.id]||{};h+='<tr><td><b>'+esc(p.name)+'</b></td>'+ordered.map(it=>{const mark=pm[it.id]||null;return '<td><div style="display:flex;justify-content:center;gap:4px">'+['E','P','A'].map(t=>`<button onclick="saveObservationMark(${p.id},${it.id},${mark?"'"+mark+"'":'null'},'${t}')" style="${gradeBtnStyle(t,mark===t,25)}">${t==='E'?'B':t}</button>`).join('')+'</div></td>';}).join('')+'</tr>';});
          h+='</tbody></table></div>';const w=document.createElement('div');w.innerHTML=h;editBody.appendChild(w);editBody.insertAdjacentHTML('beforeend','<div class="av3-note" style="margin-top:10px">B = Beginner (stored as E), P = Proficient, A = Advanced. Tapping a grade saves immediately.</div>');
        }
      }
    }
    edit.appendChild(editBody);wrap.appendChild(edit);
  }

  // Override only Classroom Observation. Workbook, Pre-Test, Motor and the
  // existing Assessment Records remain untouched and continue using their
  // existing renderers/APIs.
  window.renderObservationAssessmentSection = renderCompactObservation;
})();
