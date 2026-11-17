/* ============================================================
   CLASSROOM STATE MASTER DATA
   Keep this inside classroom-state.js so Classroom State does
   not depend on myday-planning.js.
   ============================================================ */

var CLASSROOM_STATE_SECTIONS =
  window.CLASSROOM_STATE_SECTIONS || [
    {
      section: 'Fabric',
      caption: null,
      items: [
        {
          key: 'walls',
          label: 'Walls painted and clean',
          critical: true
        },
        {
          key: 'floor',
          label: 'Floor safe and even',
          critical: true
        },
        {
          key: 'lighting',
          label: 'Lighting and ventilation',
          critical: true
        },
        {
          key: 'fans',
          label: 'Fans working',
          critical: false
        }
      ]
    },

    {
      section: 'Teaching',
      caption:
        'Material a child can reach herself counts; material locked in a cupboard does not.',
      items: [
        {
          key: 'activityboards',
          label: 'Activity / display boards',
          critical: false
        },
        {
          key: 'tlmaccess',
          label: 'TLM available and accessible to children',
          critical: true
        },
        {
          key: 'jaduipitara',
          label: 'Jadui Pitara material present',
          critical: false
        },
        {
          key: 'stationery',
          label: 'Stationery — crayons, paper, chart',
          critical: true
        },
        {
          key: 'childwork',
          label: "Children's own work on display",
          critical: false
        }
      ]
    },

    {
      section: 'Storage',
      caption: null,
      items: [
        {
          key: 'cupboards',
          label: 'Cupboards, lockable',
          critical: false
        },
        {
          key: 'lowshelves',
          label: 'Low open shelves for children',
          critical: false
        },
        {
          key: 'floormats',
          label: 'Floor mats / seating',
          critical: false
        }
      ]
    },

    {
      section: 'Health',
      caption:
        'These are conditions for use, not quality measures.',
      items: [
        {
          key: 'water',
          label: 'Drinking water in the room or adjacent',
          critical: true
        },
        {
          key: 'toilet',
          label: 'Child-height toilet accessible',
          critical: true
        },
        {
          key: 'handwash',
          label: 'Handwashing point with soap',
          critical: true
        },
        {
          key: 'firstaid',
          label: 'First-aid box, stocked and in date',
          critical: true
        },
        {
          key: 'emergency',
          label: 'Emergency contacts displayed',
          critical: true
        }
      ]
    }
  ];


var CLASSROOM_STATE_STATUSES =
  window.CLASSROOM_STATE_STATUSES || [
    {
      v: 'good',
      l: 'Good',
      color: 'var(--success)'
    },
    {
      v: 'adequate',
      l: 'Adequate',
      color: '#EE8F35'
    },
    {
      v: 'needsattention',
      l: 'Needs attention',
      color: 'var(--danger,#c8433f)'
    },
    {
      v: 'notpresent',
      l: 'Not present',
      color: 'var(--text-muted)'
    }
  ];


var classroomStateEntries =
  window.classroomStateEntries || {};


(function loadClassroomStateEntries() {
  try {
    const raw =
      localStorage.getItem(
        'classroomStateEntries'
      );

    if (raw) {
      Object.assign(
        classroomStateEntries,
        JSON.parse(raw)
      );
    }
  } catch (e) {
    console.warn(
      'Could not load classroom state.',
      e
    );
  }
})();

/* =========================================================================
   RENDER LOGIC — restored. This was missing entirely (this file only had
   the data above it); the section that actually builds and saves the UI
   never made it into the deployed version.
   ========================================================================= */

  function saveClassroomStateEntries(){
    try { localStorage.setItem('classroomStateEntries', JSON.stringify(classroomStateEntries)); }
    catch(e){ /* storage full/unavailable */ }
  }

  function setClassroomStateStatus(itemKey, status){
    if(!classroomStateEntries[itemKey]) classroomStateEntries[itemKey] = { status: null, photo: null, note: '', raised: false };
    classroomStateEntries[itemKey].status = status;
    saveClassroomStateEntries();
    renderClassroomState(classroomStateTargetEl);
  }

  // Resizes/compresses an image client-side before storing it as a
  // data URL — full-resolution photos would blow through localStorage's
  // ~5-10MB quota after a handful of items. 480px max dimension, JPEG
  // quality 0.6, keeps each photo to roughly 20-60KB.
  function resizeImageForStorage(file, maxDim, quality){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if(w > h && w > maxDim){ h = Math.round(h * maxDim / w); w = maxDim; }
          else if(h >= w && h > maxDim){ w = Math.round(w * maxDim / h); h = maxDim; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Not a readable image file.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.readAsDataURL(file);
    });
  }

  // Fired by the hidden file input's onchange — the input itself has
  // accept="image/*" capture="environment", which opens the camera
  // directly on a phone and falls back to a normal file picker on
  // desktop (browsers that don't support "capture" just ignore it).
  // Which item's Take/Upload menu is currently open — one at a time,
  // same as the assessment tier popup elsewhere in this file.
  var openClassroomPhotoMenuKey = null;
  function toggleClassroomPhotoMenu(itemKey){
    openClassroomPhotoMenuKey = (openClassroomPhotoMenuKey === itemKey) ? null : itemKey;
    renderClassroomState(classroomStateTargetEl);
  }

  async function handleClassroomStatePhotoChange(itemKey, inputEl){
    if(!inputEl.files.length) return;
    const statusEl = document.getElementById('classroomPhotoStatus-' + itemKey);
    if(statusEl) statusEl.textContent = 'Uploading to Google Drive…';
    try{
      // Uploads to the teacher's own Drive now, organized as
      // Aarambh LMS / Classroom State / <Month Year> — replaces the old
      // resize-and-store-as-base64-locally approach entirely, same
      // reasoning as the Weekly Activities evidence upload.
      const monthFolder = new Date().toLocaleDateString([], {month:'long', year:'numeric'});
      const formData = new FormData();
      formData.append('file', inputEl.files[0]);
      formData.append('folder_path', 'Classroom State/' + monthFolder);

      const res = await fetch('backend/drive/upload_to_drive.php' + window.location.search, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if(!classroomStateEntries[itemKey]) classroomStateEntries[itemKey] = { status: null, photo: null, note: '', raised: false };

      if(data.status === 'success'){
        classroomStateEntries[itemKey].photo = { driveLink: data.link, driveFileId: data.file_id, uploadedAt: todayDateKey() };
        saveClassroomStateEntries();
      } else if(data.message && data.message.indexOf('isn\'t connected') !== -1){
        alert('Google Drive isn\'t connected yet — connect it from Class Attendance\'s Google Drive link, then try again.');
      } else {
        alert(data.message || 'Upload failed.');
      }
    } catch(err){
      alert('Could not reach the server.');
    }
    inputEl.value = ''; // allow choosing the same file again later
    openClassroomPhotoMenuKey = null; // close the menu now that a choice was made
    renderClassroomState(classroomStateTargetEl);
  }
  async function removeClassroomStatePhoto(itemKey){
    const entry = classroomStateEntries[itemKey];
    if(!entry || !entry.photo) return;
    if(!confirm('Remove this photo? This deletes the actual file from Google Drive, not just the reference here.')) return;
    if(entry.photo.driveFileId){
      try{
        const res = await fetch('backend/drive/delete_from_drive.php' + window.location.search, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ file_id: entry.photo.driveFileId })
        });
        const data = await res.json();
        if(data.status !== 'success'){
          alert(data.message || 'Could not delete the file from Drive.');
          return;
        }
      } catch(err){
        alert('Could not reach the server.');
        return;
      }
    }
    entry.photo = null;
    saveClassroomStateEntries();
    renderClassroomState(classroomStateTargetEl);
  }

  function toggleClassroomStateRaised(itemKey){
    if(!classroomStateEntries[itemKey]) classroomStateEntries[itemKey] = { status: null, photo: null, note: '', raised: false };
    classroomStateEntries[itemKey].raised = !classroomStateEntries[itemKey].raised;
    saveClassroomStateEntries();
    renderClassroomState(classroomStateTargetEl);
  }
  function saveClassroomStateNote(itemKey, text){
    if(!classroomStateEntries[itemKey]) classroomStateEntries[itemKey] = { status: null, photo: null, note: '', raised: false };
    classroomStateEntries[itemKey].note = text;
    saveClassroomStateEntries();
  }

  var classroomStateSubmittedMonth = null; // 'YYYY-MM' of the last submitted record, or null
  (function loadClassroomStateSubmitted(){
    try { classroomStateSubmittedMonth = localStorage.getItem('classroomStateSubmittedMonth'); } catch(e){ /* ignore */ }
  })();
  function submitClassroomStateRecord(){
    const monthKey = new Date().toISOString().slice(0, 7);
    classroomStateSubmittedMonth = monthKey;
    try { localStorage.setItem('classroomStateSubmittedMonth', monthKey); } catch(e){ /* ignore */ }
    renderClassroomState(classroomStateTargetEl);
  }

  function classroomStateItemCard(item){
    const entry = classroomStateEntries[item.key] || { status: null, photo: null, note: '', raised: false };
    const statusRow = `<div style="display:inline-flex; border:1px solid var(--border); border-radius:9px; overflow:hidden;">
      ${CLASSROOM_STATE_STATUSES.map((s, i) => {
        const active = entry.status === s.v;
        return `<button onclick="setClassroomStateStatus('${item.key}','${s.v}')" style="padding:8px 14px; border:none; border-left:${i === 0 ? 'none' : '1px solid var(--border)'}; background:${active ? s.color : '#fff'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:12.5px; font-weight:${active ? '600' : '400'}; white-space:nowrap;">${s.l}</button>`;
      }).join('')}
    </div>`;

    // One toggle button opens a small menu with both choices — same
    // tap-to-open-popup pattern as the B/P/A picker on Monthly
    // Assessment. Keeps both options available without two buttons
    // sitting on the card permanently.
    const cameraInput = `<input type="file" accept="image/*" capture="environment" id="csCameraInput-${item.key}" style="display:none;" onchange="handleClassroomStatePhotoChange('${item.key}', this)" />`;
    const uploadInput = `<input type="file" accept="image/*" id="csUploadInput-${item.key}" style="display:none;" onchange="handleClassroomStatePhotoChange('${item.key}', this)" />`;
    const menuOpen = openClassroomPhotoMenuKey === item.key;
    const photoMenu = menuOpen ? `
      <div style="position:absolute; top:36px; left:0; z-index:20; background:#fff; border:1px solid var(--border); border-radius:8px; padding:5px; box-shadow:0 4px 12px rgba(0,0,0,0.15); white-space:nowrap; display:flex; flex-direction:column; gap:2px; min-width:140px;">
        <button class="chip" style="justify-content:flex-start; text-align:left;" onclick="document.getElementById('csCameraInput-${item.key}').click()">📷 Take photo</button>
        <button class="chip" style="justify-content:flex-start; text-align:left;" onclick="document.getElementById('csUploadInput-${item.key}').click()">⬆ Upload photo</button>
      </div>` : '';
    const photoSection = `<div style="position:relative; display:flex; align-items:center; gap:8px;">
        ${entry.photo ? `<a href="${esc(entry.photo.driveLink)}" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:4px; width:34px; height:34px; border-radius:6px; border:1px solid var(--border); background:var(--bg); justify-content:center; font-size:16px;" title="Open photo in Drive">🖼</a>` : ''}
        <button class="chip" onclick="toggleClassroomPhotoMenu('${item.key}')">${entry.photo ? '✓ Photo' : '📷 Add photo'} ▾</button>
        ${entry.photo ? `<button class="chip" style="color:var(--danger,#c8433f);" onclick="removeClassroomStatePhoto('${item.key}')">Remove</button>` : ''}
        <span id="classroomPhotoStatus-${item.key}" class="cap"></span>
        ${photoMenu}
      </div>`;

    const needsAttention = entry.status === 'needsattention';
    const raiseBtn = needsAttention
      ? `<button class="chip" onclick="toggleClassroomStateRaised('${item.key}')" style="${entry.raised ? 'color:var(--primary-dark); font-weight:600;' : ''}">${entry.raised ? '✓ Raised with school' : 'Raise with the school'}</button>`
      : '';
    const noteBox = needsAttention
      ? `<textarea placeholder="What's wrong, and what's been done about it so far…" oninput="saveClassroomStateNote('${item.key}', this.value)" style="width:100%; margin-top:12px; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; min-height:60px; resize:vertical; background:#fdf1e3;">${esc(entry.note)}</textarea>`
      : '';
    const statusMeta = entry.status ? CLASSROOM_STATE_STATUSES.find(s => s.v === entry.status) : null;
    const borderColor = statusMeta ? statusMeta.color : 'var(--border)';
    const bgTint = needsAttention ? 'linear-gradient(to right, #fff8f2, #fff)' : '#fff';

    return `<div class="card" style="padding:18px 20px; margin-bottom:12px; border-left:4px solid ${borderColor}; background:${bgTint}; box-shadow:0 1px 2px rgba(0,0,0,0.04);">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <b style="font-size:14px;">${esc(item.label)}</b>
          ${item.critical ? mdPill('Critical', 'crit') : ''}
        </div>
        ${statusMeta ? `<span style="font-size:11px; color:${statusMeta.color}; font-weight:600;">●&nbsp;${statusMeta.l}</span>` : `<span style="font-size:11px; color:var(--text-muted);">Not yet rated</span>`}
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        ${statusRow}
        ${photoSection}${cameraInput}${uploadInput}
        ${raiseBtn}
      </div>
      ${noteBox}
    </div>`;
  }

  var classroomStateTargetEl = null; // remembers where to re-render (embedded tab vs standalone section)
  var classroomStatePruneCheckedThisLoad = false;

  async function pruneDeletedClassroomStatePhotos(){
    if(classroomStatePruneCheckedThisLoad) return;
    classroomStatePruneCheckedThisLoad = true;
    const fileIds = Object.values(classroomStateEntries).map(e => e.photo && e.photo.driveFileId).filter(Boolean);
    if(!fileIds.length) return;
    const existing = await checkDriveFilesStillExist(fileIds);
    if(existing === null) return;
    let changed = false;
    Object.keys(classroomStateEntries).forEach(key => {
      const entry = classroomStateEntries[key];
      if(entry.photo && entry.photo.driveFileId && !existing.has(entry.photo.driveFileId)){
        entry.photo = null;
        changed = true;
      }
    });
    if(changed){
      saveClassroomStateEntries();
      if(document.getElementById('classroomstate-body') && !document.getElementById('classroomstate-body').classList.contains('hidden')) renderClassroomState(classroomStateTargetEl);
    }
  }

  function renderClassroomState(targetEl){
    classroomStateTargetEl = targetEl || null;
    const container = targetEl || document.getElementById('classroomstate-body');
    container.innerHTML = '';
    pruneDeletedClassroomStatePhotos(); // background check — self-corrects via re-render above if anything's actually gone

    const heading = document.createElement('div');
    heading.style.cssText = 'display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:4px;';
    heading.innerHTML = `<h1 style="margin:0;">The state of my classroom</h1><span class="reqs">INF-01…08</span>`;
    container.appendChild(heading);
    const subhead = document.createElement('p');
    subhead.className = 'cap';
    subhead.style.margin = '0 0 18px';
    subhead.textContent = 'Rated once a month, room by room. A photo travels with the rating, not instead of it.';
    container.appendChild(subhead);

    // ---- Summary stat row — real, computed from what's actually rated ----
    const allItems = CLASSROOM_STATE_SECTIONS.flatMap(s => s.items);
    const ratedCount = allItems.filter(it => classroomStateEntries[it.key] && classroomStateEntries[it.key].status).length;
    const goodCount = allItems.filter(it => classroomStateEntries[it.key] && classroomStateEntries[it.key].status === 'good').length;
    const needsAttentionCount = allItems.filter(it => classroomStateEntries[it.key] && classroomStateEntries[it.key].status === 'needsattention').length;
    const criticalOpenCount = allItems.filter(it => it.critical && (!classroomStateEntries[it.key] || classroomStateEntries[it.key].status !== 'good')).length;

    container.appendChild(mdGrid('g4', [
      mdTile('Rated', ratedCount, 'of ' + allItems.length + ' items', mdPill(mdStatusBand(ratedCount/allItems.length*100).l, mdStatusBand(ratedCount/allItems.length*100).c), '', mdMeter(ratedCount/allItems.length*100)),
      mdTile('Good', goodCount, 'items', mdPill(goodCount ? 'On track' : 'None yet', goodCount ? 'good' : 'neu')),
      mdTile('Needs attention', needsAttentionCount, 'items', needsAttentionCount ? mdPill('Follow up', 'crit') : mdPill('None', 'good')),
      mdTile('Critical not yet Good', criticalOpenCount, 'of ' + allItems.filter(it=>it.critical).length + ' critical', criticalOpenCount ? mdPill('Priority', 'crit') : mdPill('All clear', 'good'))
    ]));

    CLASSROOM_STATE_SECTIONS.forEach(sec => {
      container.appendChild(mdSec(sec.section, ''));
      if(sec.caption){
        const cap = document.createElement('p');
        cap.className = 'cap';
        cap.style.margin = '0 0 14px';
        cap.textContent = sec.caption;
        container.appendChild(cap);
      }
      const wrap = document.createElement('div');
      wrap.innerHTML = sec.items.map(classroomStateItemCard).join('');
      container.appendChild(wrap);
    });

    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const alreadySubmitted = classroomStateSubmittedMonth === monthKey;

    const submitCard = document.createElement('div');
    submitCard.style.cssText = 'margin-top:16px;';
    submitCard.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <button class="btn-primary" style="width:auto; padding:9px 18px;" onclick="submitClassroomStateRecord()" ${alreadySubmitted ? 'disabled' : ''}>
          ${alreadySubmitted ? '✓ Submitted for ' + now.toLocaleDateString([], {month:'long', year:'numeric'}) : "✓ Submit this month's record"}
        </button>
        <span class="cap">${ratedCount} of ${allItems.length} rated · INF-03 · once a month, and at every supervisor visit the two records are compared (INF-10).</span>
      </div>
      <p class="cap" style="margin-top:12px; border-left:3px solid var(--primary); padding-left:12px;">
        <b>Why the teacher records this and not only the supervisor.</b> The supervisor sees the room twice a month, on a day she chose. The teacher is in it every day. INF-10 keeps both because a fan that works on visit days and not on others is a real and common finding a single monthly inspection cannot produce.
      </p>`;
    container.appendChild(submitCard);
  }

  async function toggleMaterialDistributed(materialId){
    // Distributing requires a photo on file first — proof the item was
    // actually received before it goes out to children, not just
    // logged. Only gates the forward transition (not-yet-distributed →
    // distributed); undoing a distribution is always allowed, since
    // that's a correction, not a new claim needing evidence.
    const material = lastLoadedMaterials.find(m => String(m.id) === String(materialId));
    if(material && !material.distributed && !material.drive_link){
      alert('Attach a photo of "' + material.item_name + '" before marking it distributed — this is the evidence it actually arrived.');
      return;
    }
    try{
      await fetch('backend/materials/toggle_material.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ material_id: materialId })
      });
    } catch(err){ /* fall through to re-render regardless — shows the real current state */ }
    renderMaterials();
  }

  // "In case of mistakes" delete — same pattern as PTM/event deletion:
  // confirm first, then remove for real via the backend. Surfaces the
  // actual server response instead of swallowing it — a silent
  // failure here looks identical to "delete does nothing."
  async function deleteMaterial(materialId){
    if(!confirm('Delete this material? This cannot be undone.')) return;
    try{
      const res = await fetch('backend/materials/delete_material.php' + window.location.search, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ material_id: materialId })
      });
      let data = null;
      try { data = await res.json(); } catch(parseErr){ /* non-JSON response — handled below via res.ok */ }
      if(!res.ok || (data && data.status && data.status !== 'success')){
        alert('Delete failed: ' + (data && data.message ? data.message : ('server responded ' + res.status + '. Check backend/materials/delete_material.php.')));
      }
    } catch(err){
      alert('Delete failed: could not reach the server (' + err.message + ').');
    }
    renderMaterials();
  }