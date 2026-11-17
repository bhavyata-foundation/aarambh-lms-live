/* =========================================================================
   js/render/ui-helpers.js — pure, self-contained utility functions used
   throughout the whole app: HTML-escaping (esc), image compression for
   uploads, and the 'md*' card/tile/pill/meter builders that back almost
   every screen's UI. No dependencies on anything else in the app — only
   builtins (document, Math, Promise, Image, File, etc.) — so load order
   relative to other files doesn't matter; these are only ever called
   from inside other functions, never at top-level parse time.
   Extracted from teacher.js's old SECTION 9 (My Day) — these particular
   functions were colocated with My Day originally but are genuinely
   used everywhere, not specific to that screen.
   ========================================================================= */

  function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Resizes and re-compresses an image file entirely in the browser
  // before it ever reaches the server — a phone camera photo (often
  // 3-8 MB) typically shrinks to a few hundred KB with no visible
  // quality loss for "photo of a received material" purposes, and
  // that's the single biggest lever on upload speed, since the file
  // travels smaller across both hops (browser->server->Drive).
  // Non-image files (or anything that fails to decode) pass through
  // unchanged rather than blocking the upload.
  function compressImageFile(file, maxDimension = 1280, quality = 0.8){
    return new Promise((resolve) => {
      if(!file.type.startsWith('image/')){ resolve(file); return; }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if(width <= maxDimension && height <= maxDimension){
          // Already small enough — skip re-encoding a tiny image, no benefit.
          resolve(file);
          return;
        }
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if(!blob){ resolve(file); return; } // encoding failed for some reason — fall back to the original rather than lose the photo
          resolve(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); }; // couldn't decode as an image — upload the original untouched
      img.src = objectUrl;
    });
  }

  // Renames a File to a given base name, keeping its actual extension
  // (from its MIME type, since compressImageFile always produces
  // image/jpeg regardless of the original format) — used so a material
  // photo is identifiable by filename alone once several end up in the
  // same organization folder, rather than needing a separate folder
  // per item just to tell them apart.
  function renameFileTo(file, newBaseName){
    const extByType = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    const ext = extByType[file.type] || (file.name.match(/\.(\w+)$/) || [,'jpg'])[1];
    const safeName = newBaseName.replace(/[\\/:*?"<>|]/g, '-').trim() || 'photo';
    return new File([file], safeName + '.' + ext, { type: file.type });
  }

  function f1(n){ return (Math.round(n * 10) / 10).toFixed(1); }

  function mdGrid(cls, items){ const g = document.createElement('div'); g.className = 'g ' + cls; items.forEach(i => i && g.appendChild(i)); return g; }

  function mdTile(k, v, unit, extra, formula, mtr){
    const t = document.createElement('div'); t.className = 'tile';
    t.innerHTML = `<div class="k">${esc(k)}</div><div class="v">${v}${unit ? `<small> ${esc(unit)}</small>` : ''}</div>`;
    if(extra){ const d = document.createElement('div'); d.className = 'd'; d.innerHTML = extra; t.appendChild(d); }
    if(mtr) t.appendChild(mtr);
    if(formula){ const f = document.createElement('div'); f.className = 'f'; f.textContent = formula; t.appendChild(f); }
    return t;
  }

  function mdPill(l, c){ return `<span class="pill ${c}">${esc(l)}</span>`; }

  function mdMeter(pct, cls){
    const m = document.createElement('div'); m.className = 'meter' + (cls ? ' ' + cls : '');
    const i = document.createElement('i'); i.style.width = Math.max(0, Math.min(100, pct)) + '%'; m.appendChild(i);
    return m;
  }

  function mdSec(title, right){
    const s = document.createElement('div'); s.className = 'sec';
    s.innerHTML = `<h2>${esc(title)}</h2><div class="hr"></div>${right || ''}`;
    return s;
  }

  function mdCard(title, cap, bodyEl){
    const c = document.createElement('div'); c.className = 'card';
    if(title){
      c.innerHTML = `<div class="hd"><div><h3>${esc(title)}</h3>${cap ? `<p class="cap">${cap}</p>` : ''}</div></div>`;
    }
    if(bodyEl) c.appendChild(bodyEl);
    return c;
  }

  function mdStatusBand(pct, good, warn){
    if(pct >= (good || 85)) return {l:'On track', c:'good'};
    if(pct >= (warn || 70)) return {l:'Watch', c:'warn'};
    return {l:'Action', c:'crit'};
  }