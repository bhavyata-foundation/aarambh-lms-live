/* =========================================================================
   js/render/materials.js — TLM & Resources (Materials) screen, plus a
   handful of Family contact quick-edit helpers that were originally
   colocated here in teacher.js rather than with the rest of Family &
   Parents (kept together as found, not re-sorted). Extracted from
   teacher.js's old SECTION 7.

   Same cross-file-sharing rule as every other split file: classic
   <script>, so top-level `function` is global automatically, but
   top-level `let`/`const` isn't shared across <script> tags.
   ========================================================================= */

  /* ===================== SECTION 7: MATERIALS ===================== */

  // Fetches the real materials list from the database. Previously this
  // read from localStorage instead — meaning "+ Add material" and the
  // CSV import were both writing real rows to the real materials
  // table, while this function kept reading a completely separate,
  // never-synced local copy. Fixed to actually match.
  // Cache of the last list fetched by renderMaterials — lets the "add
  // material" form check for a duplicate without a second round trip
  // to the server, and lets the download button export what's on screen.
  var lastLoadedMaterials = [];
  var myDayMaterialsFetchStatus = 'idle'; // 'idle' | 'loading' | 'loaded' — separate from lastLoadedMaterials.length so "no materials imported yet" isn't confused with "haven't fetched yet"

  // Background-load the real TLM & Resources inventory for use on My
  // Day's "Materials needed this week" cards, the same lazy-fetch-then-
  // re-render pattern fetchAttendanceMonth already uses for attendance.
  // Skips re-fetching if TLM & Resources was already opened this
  // session (lastLoadedMaterials is shared with that screen).
  async function ensureMyDayMaterialsLoaded(){
    if(myDayMaterialsFetchStatus !== 'idle') return;
    myDayMaterialsFetchStatus = 'loading';
    const materials = await getMaterialsList();
    lastLoadedMaterials = materials;
    myDayMaterialsFetchStatus = 'loaded';
    if(document.getElementById('myday-body') && !document.getElementById('myday-body').classList.contains('hidden')) renderMyDay();
  }

  // "Signed" (RES-11..14) ticks, keyed by material id. Saved in the
  // DATABASE (backend/records, kind 'tlm_signed', one record 'all') so
  // they show on every device; this browser keeps a copy for offline.
  var materialsSignedLocal = {};
  var materialsSignedWrap = { all: materialsSignedLocal }; // the shape class-records stores
  (function loadMaterialsSignedLocal(){
    try {
      const raw = localStorage.getItem('materialsSignedLocal');
      if(raw) Object.assign(materialsSignedLocal, JSON.parse(raw));
    } catch(e){ /* start empty */ }
    if(!Object.keys(materialsSignedLocal).length) delete materialsSignedWrap.all; // nothing here to move up
    let firstMove = true;
    try { firstMove = localStorage.getItem('materialsSignedMoved') !== 'yes'; } catch(e){}
    const browserTicks = Object.assign({}, materialsSignedLocal);
    if(typeof classRecordsSync === 'function') classRecordsSync('tlm_signed', materialsSignedWrap, () => {
      const fromServer = Object.assign({}, materialsSignedWrap.all || {});
      // First time from this browser: keep ticks made here as well as the
      // database's (another device may have ticked other items).
      const extra = firstMove ? Object.keys(browserTicks).filter(k => browserTicks[k] && !fromServer[k]) : [];
      extra.forEach(k => { fromServer[k] = true; });
      Object.keys(materialsSignedLocal).forEach(k => { delete materialsSignedLocal[k]; });
      Object.assign(materialsSignedLocal, fromServer);
      materialsSignedWrap.all = materialsSignedLocal;
      try { localStorage.setItem('materialsSignedMoved', 'yes'); } catch(e){}
      if(extra.length && typeof classRecordSave === 'function') classRecordSave('tlm_signed', 'all', materialsSignedLocal);
      try { localStorage.setItem('materialsSignedLocal', JSON.stringify(materialsSignedLocal)); } catch(e){}
      const body = document.getElementById('materials-body');
      if(body && !body.classList.contains('hidden') && typeof renderMaterials === 'function') renderMaterials();
    });
  })();
  function toggleMaterialSignedLocal(materialId){
    materialsSignedLocal[materialId] = !materialsSignedLocal[materialId];
    if(!materialsSignedLocal[materialId]) delete materialsSignedLocal[materialId];
    try { localStorage.setItem('materialsSignedLocal', JSON.stringify(materialsSignedLocal)); } catch(e){ /* ignore */ }
    if(typeof classRecordSave === 'function') classRecordSave('tlm_signed', 'all', materialsSignedLocal);
    renderMaterials();
  }

  async function getMaterialsList(){
    try{
      const res = await fetch('backend/get_materials.php' + window.location.search);
      const data = await res.json();
      return (data.status === 'success' && data.materials) ? data.materials : [];
    } catch(err){
      return [];
    }
  }

  function materialRowHtml(m){
    const sourceColor = m.supply_source === 'Bhavyata Foundation' ? 'info' : m.supply_source === 'Other Foundation' ? 'warn' : 'good';
    return `
      <div class="material-row" data-material-id="${m.id}">
        <div>
          <div class="material-name">${m.item_name}</div>
          <div class="material-meta">${m.quantity ? 'Qty ' + m.quantity + ' · ' : ''}received ${new Date(m.received_date + 'T00:00:00').toLocaleDateString([], {day:'numeric', month:'short'})}</div>
          <div style="margin-top:4px; display:flex; gap:6px;">
            ${m.category ? mdPill(m.category, 'neu') : ''}
            ${m.supply_source ? mdPill(m.supply_source, sourceColor) : ''}
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="material-toggle-btn ${m.distributed ? 'is-distributed' : ''}" ${(!m.distributed && !m.drive_link) ? 'disabled title="Attach a photo first — required before marking distributed" style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="toggleMaterialDistributed('${m.id}')">
            ${m.distributed ? 'Distributed' : 'Mark distributed'}
          </button>
          <button class="chip" style="color:var(--danger,#c8433f);" onclick="deleteMaterial('${m.id}')">Delete</button>
        </div>
      </div>`;
  }

  var materialsTab = 'materials';
  function switchMaterialsTab(tab){
    materialsTab = tab;
    renderMaterials();
  }

  function renderResourcesTabBar(activeTab){
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap;';
    const tabs = [
      { key: 'materials', label: '📦 TLM & Resources' },
      { key: 'classroomstate', label: '🏫 Classroom State' }   // (Digital Workbooks tab removed, Oct 2026)
    ];
    tabs.forEach(t => {
      const active = t.key === activeTab;
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.cssText = `padding:8px 16px; border-radius:20px; border:1px solid ${active ? 'transparent' : 'var(--border)'}; background:${active ? 'var(--primary)' : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; font-size:13px; font-weight:600; cursor:pointer;`;
      btn.onclick = () => switchMaterialsTab(t.key);
      bar.appendChild(btn);
    });
    return bar;
  }

  function renderMaterials(){
    const container = document.getElementById('materials-body');
    container.innerHTML = '';
    if(materialsTab === 'workbooks') materialsTab = 'materials'; // the Digital Workbooks tab is gone
    container.appendChild(renderResourcesTabBar(materialsTab));

    if(materialsTab === 'materials'){
      const wrap = document.createElement('div');
      container.appendChild(wrap);
      renderMaterialsMainTab(wrap);
    } else if(materialsTab === 'classroomstate'){
      const wrap = document.createElement('div');
      container.appendChild(wrap);
      renderClassroomState(wrap);
    }
  }

  let materialsRenderToken = 0; // incremented on every call; a stale call checks this after its await and bails if a newer one has since started
  let materialsPruneCheckedThisLoad = false;

  // Same background self-correction Classroom State already does for
  // its photos — if a photo was deleted directly in Google Drive
  // (outside the app), this catches that and clears the now-broken
  // reference here too. Unlike Classroom State (localStorage), a
  // pruned material's cleared reference has to be persisted via
  // set_material_photo.php, not just mutated in memory.
  async function pruneDeletedMaterialPhotos(materials){
    if(materialsPruneCheckedThisLoad) return;
    materialsPruneCheckedThisLoad = true;
    const fileIds = materials.map(m => m.drive_file_id).filter(Boolean);
    if(!fileIds.length) return;
    const existing = await checkDriveFilesStillExist(fileIds);
    if(existing === null) return; // check itself failed — never treat that as "everything's deleted"
    const goneMaterials = materials.filter(m => m.drive_file_id && !existing.has(m.drive_file_id));
    if(!goneMaterials.length) return;
    for(const m of goneMaterials){
      try{
        await fetch('backend/set_material_photo.php' + window.location.search, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ material_id: m.id, drive_file_id: '', drive_link: '' })
        });
      } catch(err){ /* one failing to clear shouldn't stop the others */ }
    }
    renderMaterials(); // re-render shows the real, now-corrected state
  }

  // ---- Supply report: which foundation gave what, and what each item is used for in teaching ----
  // Suggested uses. Matched against the item name (lower case), first match wins. Edit freely.
  const MATERIAL_USE_BY_TERM = [
    ['chalk', 'Writing and drawing practice on the board; pre-writing strokes and letter shapes.'],
    ['crayon', 'Colouring and fine-motor control; early drawing and shape work.'],
    ['bead', 'Counting, sorting and patterning; fine-motor threading.'],
    ['block', 'Building, balance and spatial thinking; counting and comparing sizes.'],
    ['book', 'Story time, listening and early reading; matching pictures to words.'],
    ['puzzle', 'Problem solving and hand-eye coordination; shape and part-whole understanding.'],
    ['ball', 'Gross-motor play, throwing and catching; coordination and turn-taking.'],
  ];
  const usedForInTeaching = (itemName) => {
    const n = String(itemName || '').toLowerCase();
    const hit = MATERIAL_USE_BY_TERM.find(([term]) => n.includes(term));
    return hit ? hit[1] : 'Classroom teaching material. Add its use here when you know it.';
  };
  const BUILT_IN_SOURCES = ['BMC', 'Bhavyata Foundation', 'Other Foundation'];
  const SOURCE_COLOURS = { 'BMC': 'var(--primary)', 'Bhavyata Foundation': 'var(--success)', 'Other Foundation': '#EE8F35' };
  let supplyFoundations = null;         // names saved for this class (from backend/materials/foundations.php)
  let supplyFoundationsLoading = false;

  function loadSupplyFoundations(){
    if(supplyFoundations !== null || supplyFoundationsLoading) return;
    supplyFoundationsLoading = true;
    fetch('backend/materials/foundations.php' + window.location.search)
      .then(r => r.json())
      .then(d => { supplyFoundations = d.status === 'success' ? (d.foundations || []) : []; })
      .catch(() => { supplyFoundations = []; })
      .finally(() => { supplyFoundationsLoading = false; renderMaterials(); });
  }

  function renderSupplyReport(container, materials){
    container.appendChild(mdSec('Supply report: who gave what, and what it is for', '<span class="reqs">RES-07</span>'));
    const card = document.createElement('div');
    card.className = 'card'; card.style.padding = '22px';


    // every source: the built-in three, plus the foundations this class has added
    const sources = [...BUILT_IN_SOURCES];
    const groups = {};
    sources.forEach(src => { groups[src] = { items: [], qty: 0 }; });
    materials.forEach(m => {
      const src = m.supply_source || 'BMC';
      if(!groups[src]) { groups[src] = { items: [], qty: 0 }; sources.push(src); }
      groups[src].items.push(m);
      groups[src].qty += parseInt(m.quantity, 10) || 0;
    });
    const maxQty = Math.max(1, ...Object.values(groups).map(g => g.qty));

    // only the sources that have items are drawn, so an empty 'Other Foundation' row is not shown
    const shownSources = sources.filter(src => groups[src].items.length > 0);
    const bars = shownSources.map(src => {
      const g = groups[src];
      const colour = SOURCE_COLOURS[src] || '#7B61FF';
      return `<div class="hbar-row">
        <div class="hbar-row-label">${esc(src)} (${g.items.length} item${g.items.length === 1 ? '' : 's'})</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(g.qty / maxQty * 100)}%; background:${colour};"></div></div>
        <div class="hbar-count">${g.qty} units</div>
      </div>`;
    }).join('');

    const tables = sources.filter(src => groups[src].items.length).map(src => {
      const g = groups[src];
      const rows = g.items.map(m => `<tr>
          <td style="text-align:left;"><b>${esc(m.item_name)}</b></td>
          <td>${parseInt(m.quantity, 10) || 0}</td>
          <td style="text-align:left;">${esc(usedForInTeaching(m.item_name))}</td>
        </tr>`).join('');
      return `<h5 style="margin:16px 0 6px;">${esc(src)} · ${g.qty} units</h5>
        <div class="report-table-wrap"><table class="report-table">
          <thead><tr><th style="text-align:left;">Item</th><th>Quantity</th><th style="text-align:left;">Used for in teaching</th></tr></thead>
          <tbody>${rows}</tbody></table></div>`;
    }).join('');

    card.innerHTML = `<h4 style="margin:0 0 4px;">Supply by foundation</h4>
      <p class="cap" style="margin:0 0 14px;">How many units each foundation has given this class, and what each item is used for.</p>
      <div class="hbar-axis"><span>0</span><span>${Math.round(maxQty / 2)}</span><span>${maxQty}</span></div>
      ${bars}
      ${tables || '<p class="cap" style="margin:14px 0 0;">No items logged yet. Items appear here once they are added or imported.</p>'}`;
    container.appendChild(card);
  }

  // ---- Teacher → supervisor: message about short materials ----
  async function sendShortMessage(){
    const box = document.getElementById('shortMsgText');
    const result = document.getElementById('shortMsgResult');
    const text = (box && box.value || '').trim();
    if(!text){ if(result) result.textContent = 'Type a message first.'; return; }
    if(result) result.textContent = 'Sending…';
    try {
      const res = await fetch('backend/materials/short_messages.php' + window.location.search, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      if(data.status !== 'success'){ if(result) result.textContent = data.message || 'Could not send.'; return; }
      if(result) result.textContent = 'Sent to your supervisor.';
    } catch(err){
      if(result) result.textContent = 'Could not reach the server, so the message was not sent.';
    }
  }

  async function renderMaterialsMainTab(container){
    const myToken = ++materialsRenderToken;
    container.innerHTML = '';

    const materials = await getMaterialsList();
    if(myToken !== materialsRenderToken) return; // a newer call started while this fetch was in flight — don't append stale content on top of it
    lastLoadedMaterials = materials; // so submitNewMaterial can check for duplicates without a second fetch
    pruneDeletedMaterialPhotos(materials); // background check — self-corrects via re-render if anything's actually gone from Drive
    materials.sort((a, b) => b.received_date.localeCompare(a.received_date));
    const distributedCount = materials.filter(m => m.distributed).length;

    // ---------------------------------------------------------
    // Stat cards — every number here is real (from the materials
    // table) or directly derived from it. "Entitled" uses the real
    // class roster size (SAMPLE_STUDENTS.length) as the per-item
    // target, since this app has no separate per-item entitlement
    // column yet — a real number, not an invented one, just a
    // simplifying assumption (every child gets one of each item).
    // ---------------------------------------------------------
    const entitledQty = SAMPLE_STUDENTS.length;
    const receivedTotal = materials.reduce((sum, m) => sum + (parseInt(m.quantity, 10) || 0), 0);
    const shortItems = materials.filter(m => {
      const q = parseInt(m.quantity, 10);
      return !isNaN(q) && q < entitledQty;
    });

    const heading = document.createElement('div');
    heading.style.cssText = 'display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:4px;';
    heading.innerHTML = `<h1 style="margin:0;">TLM &amp; Resources</h1><span class="reqs">RES-01…15</span>`;
    container.appendChild(heading);
    container.appendChild(renderMaterialsImportCard()); // the import section: right under the heading, before the summary tiles

    const damagedCount = materials.filter(m => m.item_condition === 'damaged').length;

    container.appendChild(mdGrid('g5', [
      mdTile('Items on the list', materials.length, 'for this class', mdPill('RES-02', 'neu')),
      mdTile('Received', receivedTotal, 'units logged', mdPill('RES-04', 'neu')),
      mdTile('Short of entitlement', shortItems.length, 'item' + (shortItems.length === 1 ? '' : 's'), shortItems.length ? mdPill('Watch', 'warn') : mdPill('None', 'good'), 'entitled = ' + entitledQty + ' per item (class roll)'),
      mdTile('Distributed', distributedCount, 'of ' + materials.length + ' items', mdPill(materials.length && distributedCount === materials.length ? 'All distributed' : 'In progress', materials.length && distributedCount === materials.length ? 'good' : 'neu')),
      mdTile('Damaged', damagedCount, 'items', damagedCount > 0 ? mdPill('Replace', 'crit') : mdPill('None', 'good'))
    ]));

    // ---- Where the material came from — real, grouped by the real source field ----
    renderSupplyReport(container, materials);
    container.appendChild(mdSec('Where the material came from', '<span class="reqs">RES-03</span>'));
    const bySourceCard = document.createElement('div');
    bySourceCard.className = 'card'; bySourceCard.style.padding = '22px';
    const sourceGroups = {};
    materials.forEach(m => {
      const src = m.supply_source || 'BMC';
      if(!sourceGroups[src]) sourceGroups[src] = { count: 0, qty: 0 };
      sourceGroups[src].count++;
      sourceGroups[src].qty += parseInt(m.quantity, 10) || 0;
    });
    const sourceEntries = Object.entries(sourceGroups);
    const maxQty = Math.max(1, ...sourceEntries.map(([, v]) => v.qty));
    if(sourceEntries.length === 0){
      bySourceCard.innerHTML = `<h4 style="margin:0 0 4px;">By source</h4><p class="cap" style="margin:0;">Nothing logged yet.</p>`;
    } else {
      bySourceCard.innerHTML = `<h4 style="margin:0 0 4px;">By source</h4>
        <p class="cap" style="margin:0 0 16px;">RES-03 · BMC, partner foundations and the school buy different things and are accountable for them separately.</p>
        <div class="hbar-axis"><span>0</span><span>${Math.round(maxQty/4)}</span><span>${Math.round(maxQty/2)}</span><span>${Math.round(maxQty*3/4)}</span><span>${maxQty}</span></div>
        ${sourceEntries.map(([src, v]) => `
          <div class="hbar-row">
            <div class="hbar-row-label">${esc(src)} (${v.count} item${v.count === 1 ? '' : 's'})</div>
            <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(v.qty/maxQty*100)}%; background:${src === 'BMC' ? 'var(--primary)' : src === 'Bhavyata Foundation' ? 'var(--success)' : '#EE8F35'};"></div></div>
            <div class="hbar-count">${v.qty} units</div>
          </div>`).join('')}`;
    }
    container.appendChild(bySourceCard);

    const whatShortCard = document.createElement('div');
    whatShortCard.className = 'card'; whatShortCard.style.padding = '22px';
    whatShortCard.innerHTML = `<h4 style="margin:0 0 4px;">What is short</h4>
      <p class="cap" style="margin:0 0 16px;">RES-06 · entitlement is per child for consumables — ${entitledQty} per item, this class's roll.</p>
      ${shortItems.length === 0
        ? `<p class="cap" style="margin:0;">Nothing is short right now.</p>`
        : `<div class="list">${shortItems.map(m => `<div class="row"><div class="t"><b>${esc(m.item_name)}</b><span>${esc(m.supply_source || 'BMC')} · ${m.quantity || 0} received of ${entitledQty} entitled</span></div><div>${mdPill('Short ' + (entitledQty - (parseInt(m.quantity, 10) || 0)), 'warn')}</div></div>`).join('')}</div>`}`;

    if(shortItems.length){
      const suggested = shortItems.map(m => `${m.item_name} (${m.quantity || 0} of ${entitledQty})`).join(', ');
      whatShortCard.insertAdjacentHTML('beforeend',
        `<div style="margin-top:14px; border-top:1px solid var(--border); padding-top:12px;">
          <b style="font-size:13px;">Tell your supervisor</b>
          <textarea id="shortMsgText" rows="3" maxlength="2000" style="width:100%; margin-top:6px; padding:9px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; box-sizing:border-box;">${esc('Materials short: ' + suggested)}</textarea>
          <div style="display:flex; gap:10px; align-items:center; margin-top:8px; flex-wrap:wrap;">
            <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="sendShortMessage()">Send to supervisor</button>
            <span id="shortMsgResult" class="cap"></span>
          </div>
        </div>`);
    }
    const twoColRes = document.createElement('div');
    twoColRes.className = 'transition-two-col';
    twoColRes.appendChild(bySourceCard);
    twoColRes.appendChild(whatShortCard);
    container.appendChild(twoColRes);

    // ---------------------------------------------------------
    // TLM STOCK — "what's still present with them," specifically
    // for Teaching-Learning Materials. Distinct from the general list
    // below: this is scoped to category='TLM' and filtered to items
    // NOT YET distributed — i.e. still sitting in the classroom,
    // available to use, rather than everything ever received.
    // ---------------------------------------------------------
    const tlmItems = materials.filter(m => m.category === 'TLM');
    const tlmPresent = tlmItems.filter(m => !m.distributed);
    const tlmPresentQty = tlmPresent.reduce((sum, m) => sum + (parseInt(m.quantity, 10) || 0), 0);

    container.appendChild(mdSec('TLM stock — still present', '<span class="reqs">INV-01</span>'));
    const tlmList = document.createElement('div'); tlmList.className = 'list';
    tlmList.innerHTML = tlmPresent.length
      ? tlmPresent.map(m => `<div class="row">
          <div class="t"><b>${esc(m.item_name)}</b> <span class="dim">· ${esc(m.supply_source || 'BMC')}</span></div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span>${m.quantity || '—'}</span>
            ${m.drive_link
              ? `<a class="chip" href="${esc(m.drive_link)}" target="_blank" rel="noopener">📷 View photo</a><button class="chip" style="color:var(--danger,#c8433f);" onclick="removeMaterialPhoto('${m.id}','${esc(m.drive_file_id || '')}')">Remove photo</button>`
              : `<button class="chip" id="matPhotoBtn-${m.id}" onclick="attachMaterialPhoto('${m.id}','${esc(m.item_name).replace(/'/g, "\\'")}','${esc(m.supply_source || 'BMC').replace(/'/g, "\\'")}')">📷 Add photo</button>`}
          </div>
        </div>`).join('')
      : '<p class="sub">No TLM items currently marked as still present — either none logged yet, or everything logged has already been marked distributed.</p>';
    container.appendChild(mdCard(null, tlmPresent.length ? `${tlmPresentQty} unit(s) across ${tlmPresent.length} TLM item(s) still in the classroom, not yet distributed.` : null, tlmList));

    // ---- Inventory — the full real list, one row per item ----
    container.appendChild(mdSec('Inventory', '<span class="reqs">RES-11…14</span>'));
    const invHead = document.createElement('div');
    invHead.style.cssText = 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:14px;';
    invHead.innerHTML = `<p class="cap" style="margin:0;">Everything this class holds. Ordered by what was received most recently.</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn-sup-outline" style="width:auto; padding:8px 14px;" onclick="downloadMaterialsCsv()">⬇ CSV</button>
        <button class="btn-sup-outline" style="width:auto; padding:8px 14px;" onclick="downloadMaterialsPdf()">⬇ PDF</button>
        <button class="btn-primary" style="width:auto; padding:8px 14px;" onclick="toggleAddMaterialForm()">+ Add material</button>
      </div>`;
    container.appendChild(invHead);
    container.appendChild((() => { const w = document.createElement('div'); w.id = 'addMaterialFormWrap'; w.className = 'hidden'; return w; })());

    let invTable = '<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Item</th><th>Category</th><th>Source</th><th>Entitled</th><th>Received</th><th>Issued</th><th>Balance</th><th>Short</th><th>Received on</th><th>Condition</th><th>Photo</th><th>Signed</th><th></th></tr></thead><tbody>';
    materials.forEach(m => {
      const received = parseInt(m.quantity, 10) || 0;
      // "Issued" isn't a separate real field yet — this app only tracks
      // a single distributed flag, not partial issuance. Derived
      // honestly from that: fully issued once distributed, otherwise 0.
      const issued = m.distributed ? received : 0;
      const balance = received - issued;
      const short = Math.max(0, entitledQty - received);
      const condition = m.item_condition || 'usable'; // backend doesn't return this field yet on most rows — defaults honestly rather than guessing
      const signed = !!materialsSignedLocal[m.id]; // saved for the class — see classRecordsSync above
      invTable += `<tr>
        <td><b>${esc(m.item_name)}</b></td>
        <td class="dim">${m.category ? esc(m.category) : '—'}</td>
        <td>${m.supply_source ? mdPill(m.supply_source, m.supply_source === 'Bhavyata Foundation' ? 'info' : m.supply_source === 'Other Foundation' ? 'warn' : 'neu') : '—'}</td>
        <td>${entitledQty}</td>
        <td>${m.quantity ? esc(String(m.quantity)) : '—'}</td>
        <td>${issued}</td>
        <td>${balance}</td>
        <td>${short > 0 ? mdPill(String(short), 'crit') : '—'}</td>
        <td>${new Date(m.received_date + 'T00:00:00').toLocaleDateString([], {day:'numeric', month:'short', year:'numeric'})}</td>
        <td>${mdPill(condition, condition === 'damaged' ? 'crit' : 'good')}</td>
        <td>${m.drive_link ? mdPill('✓ Uploaded', 'good') : mdPill('No photo', 'neu')}</td>
        <td><span class="pill ${signed ? 'good' : 'neu'}" style="cursor:pointer;" onclick="toggleMaterialSignedLocal('${m.id}')" title="Tap to change — saved for your class">${signed ? 'Yes' : 'No'}</span></td>
        <td style="white-space:nowrap;">
          <button class="chip" ${(!m.distributed && !m.drive_link) ? 'disabled title="Attach a photo first — required before marking distributed" style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="toggleMaterialDistributed('${m.id}')">${m.distributed ? 'Undo' : 'Distribute'}</button>
          ${m.drive_link
            ? `<a class="chip" href="${esc(m.drive_link)}" target="_blank" rel="noopener">📷 View photo</a><button class="chip" style="color:var(--danger,#c8433f);" onclick="removeMaterialPhoto('${m.id}','${esc(m.drive_file_id || '')}')">Remove photo</button>`
            : `<button class="chip" id="matPhotoBtn-${m.id}" onclick="attachMaterialPhoto('${m.id}','${esc(m.item_name).replace(/'/g, "\\'")}','${esc(m.supply_source || 'BMC').replace(/'/g, "\\'")}')">📷 Add photo</button>`}
          <button class="chip" style="color:var(--danger,#c8433f);" onclick="deleteMaterial('${m.id}')">Delete</button>
        </td>
      </tr>`;
    });
    invTable += '</tbody></table></div>';
    const invWrap = document.createElement('div'); invWrap.innerHTML = invTable;
    container.appendChild(mdCard(null, materials.length ? null : 'No materials logged yet — tap "+ Add material" once something arrives, or use the import section at the top.', invWrap));
    const invNote = document.createElement('p');
    invNote.className = 'cap';
    invNote.style.margin = '10px 0 0';
    invNote.innerHTML = `Entitled = ${entitledQty} per item (this class's roll). Issued/Balance are derived from the real "distributed" flag, not tracked separately yet. Tap <b>Signed</b> to tick it — it's saved for your class and shows on every device.`;
    container.appendChild(invNote);
  }

  // ---------------------------------------------------------
  // IMPORT MATERIALS — bulk version of "+ Add material". Accepts
  // either a .csv or a real .xlsx file (import_materials.php reads
  // both — no separate upload path needed for each). Header row must
  // be exactly: item_name,quantity,received_date
  // ---------------------------------------------------------
  // The last import result lives here so the page can redraw after an import (it does) without
  // losing the "Imported N items" message. It is cleared when a new file is chosen.
  var materialsImportResultHtml = '';
  function renderMaterialsImportCard(){
    const wrap = document.createElement('div');
    wrap.id = 'materialsImportPanel';
    wrap.className = 'card';
    wrap.style.margin = '10px 0 18px';
    wrap.innerHTML = `
      <div class="hd"><div><h3>Import materials from a file</h3><p class="cap">.csv or .xlsx — header row must be exactly item_name,quantity,received_date, or item_name,quantity,received_date,category,source to also set category (TLM/Stationery/Workbook/Other) and source (BMC/Bhavyata Foundation/Other Foundation). Any common date format is fine. Note: the duplicate check (same item+source+date) only runs on the manual "+ Add material" form — a bulk import isn't cross-checked against the existing list on this screen, so double-check import_materials.php handles that server-side before relying on it.</p></div></div>
      <input type="file" id="materialsImportInput" accept=".csv,.xlsx" style="margin-top:8px;" onchange="materialsImportResultHtml=''; document.getElementById('materialsImportResult').innerHTML='';" />
      <div id="materialsImportResult" style="margin-top:10px;">${materialsImportResultHtml}</div>
      <button class="btn-primary" style="width:auto; padding:9px 16px; margin-top:10px;" onclick="importMaterialsFile()">Import</button>
    `;
    return wrap;
  }

  async function importMaterialsFile(){
    const input = document.getElementById('materialsImportInput');
    const resultEl = document.getElementById('materialsImportResult');
    if(!input.files.length){
      resultEl.innerHTML = '<div class="au-error">Choose a .csv or .xlsx file first.</div>';
      return;
    }
    resultEl.innerHTML = '<p class="sub">Importing…</p>';

    const formData = new FormData();
    formData.append('import_file', input.files[0]);

    try{
      const res = await fetch('backend/import_materials.php' + window.location.search, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if(data.status !== 'success'){
        resultEl.innerHTML = `<div class="au-error">${esc(data.message || 'Import failed.')}</div>`;
        return;
      }
      let html = `<div class="au-success">✓ Imported ${data.imported} item${data.imported === 1 ? '' : 's'}.</div>`;
      if(data.skipped_count > 0){
        html += `<div class="au-error" style="margin-top:6px;">${data.skipped_count} row(s) skipped:<ul style="margin:4px 0 0 18px;">${data.skipped.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`;
      }
      resultEl.innerHTML = html;
      materialsImportResultHtml = html; // survive the redraw below
      renderMaterials(); // reload the real list with the newly imported rows
    } catch(err){
      resultEl.innerHTML = '<div class="au-error">Could not reach the server.</div>';
    }
  }

  /* =========================================================
     PARENT VOLUNTEERS — this teacher's class context is fixed here
     for now (matches "Mrs. Sharma — Jr KG B" above) — in a real
     backend this would come from the logged-in teacher's own class
     assignment instead of being hardcoded. Reads/writes the same
     shared storage the parent dashboard uses (parent-committee.js),
     so a parent's real submission shows up here without a page
     reload needed on the parent's side.
     ========================================================= */
  const CURRENT_TEACHER_CLASS = {
    school: 'Triveni Sangam Municipal School',
    className: 'Jr KG'
  };

  // ---------------------------------------------------------------
  // HOUSEHOLD CONTACTS — now backed by the same real familyRecords
  // store the Family Profile import writes to (previously a separate
  // householdProfiles store the import never touched, which is why
  // this card could show fake data forever even after a real import).
  // Editing any field here promotes that household from sample to a
  // real (manually-entered) familyRecords entry, same "promote on
  // edit" pattern the manual entry card elsewhere already uses.
  // ---------------------------------------------------------------
  var DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function ensureRealFamilyRecord(name){
    if(!familyRecords[name]){
      const sample = sampleHousehold(name);
      const primaryGuardian = sample.guardianNames.find(g => g.primary) || sample.guardianNames[0];
      familyRecords[name] = Object.assign({}, sample, {
        guardianAttending: primaryGuardian.rel + ' — ' + primaryGuardian.name,
        generalAvailableDays: [],
        generalFreeTimings: '',
        workshopSkills: [], workshopAvailability: [], willingToVolunteer: null, scheduledWorkshop: null, teacherApproved: false,
        importedAt: null // manually created here, not from a sheet import
      });
    }
    const f = familyRecords[name];
    if(f.guardianAttending === undefined) f.guardianAttending = (f.guardianNames[0] || {}).rel + ' — ' + (f.guardianNames[0] || {}).name;
    if(f.generalAvailableDays === undefined) f.generalAvailableDays = [];
    if(f.generalFreeTimings === undefined) f.generalFreeTimings = '';
    return f;
  }

  let selectedHouseholdName = null;
  function switchParentVolunteersHousehold(name){
    selectedHouseholdName = name;
    renderFamilyParents(name);
  }
  function updateFamilyContactField(name, field, value){
    const f = ensureRealFamilyRecord(name);
    if(field === 'guardianAttending') f.guardianAttending = value;
    else if(field === 'occupation'){ if(!f.guardians[0]) f.guardians[0] = {occ:''}; f.guardians[0].occ = value; }
    else if(field === 'phone'){ if(!f.guardianNames[0]) f.guardianNames[0] = {name:'', rel:'Guardian'}; f.guardianNames[0].phone = value; }
    else if(field === 'skill') f.skills = value.split(',').map(s => s.trim()).filter(Boolean);
    else if(field === 'freeTimings') f.generalFreeTimings = value;
    saveFamilyRecords();
  }
  function toggleFamilyContactAvailableDay(name, day){
    const f = ensureRealFamilyRecord(name);
    const idx = f.generalAvailableDays.indexOf(day);
    if(idx >= 0) f.generalAvailableDays.splice(idx, 1);
    else f.generalAvailableDays.push(day); // keep chronological, not click-order
    f.generalAvailableDays.sort((a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b));
    saveFamilyRecords();
    renderFamilyParents(selectedHouseholdName);
  }