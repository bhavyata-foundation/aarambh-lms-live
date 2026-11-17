/* =========================================================================
   js/name-match.js — matching a child's name in a file to the class roll
   -------------------------------------------------------------------------
   Imports (attendance, Workbook, Observation, Pre-Test, Motor) get names
   typed by hand, so the spelling often differs from the roll:
     "Krushnai Rane" · "Avni Suryawanshi" · "Darsh Pandey" · "Shinde Dwarka"
     · "D. Shinde" · "Vidhit Yadav" · "5004 Avani S."
   NameMatch.find(name, { register, taken }) answers, in this order:
     1. register   — the register number in the file matches the roll
     2. exact      — the same spelling (ignoring case, spaces, dots)
     3. remembered — a spelling a teacher confirmed earlier for this class
     4. sounds     — the same name in another spelling (sh/s, ee/i, w/v,
                     aa/a, dh/d, y/i, double letters, Pandey/Pande …),
                     and no other child sounds like it
     5. order      — the same words in another order ("Shinde Dwarka")
     → these are SURE: used straight away, but shown to the teacher
     6. suggest    — the closest child, clearly closer than any other:
                     NOT used until the teacher confirms ("Did you mean …?")
     7. none       — the teacher chooses the child, adds them, or skips
   NameMatch.remember(fileName, pupil) keeps a confirmed spelling for this
   class on the server (class records, kind "name_alias"), so the same
   misspelling is matched by itself next time, on every device.
   ========================================================================= */
(function(){
  'use strict';
  const store = {}; // alias key → { id, name, as } for the class in use
  let loaded = false;

  // plain form: lower case, no register number in front, no dots or extra spaces
  function plain(s){
    return String(s == null ? '' : s).toLowerCase().replace(/^\s*\d+[\s.)\-:]+/, '').replace(/[._,;:()'"`\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // how a word sounds, so common spelling differences disappear
  function soundWord(w){
    let s = w.replace(/[^a-z\u0900-\u097f]/g, '');
    if(!/[a-z]/.test(s)) return s; // Devanagari: compared as written
    s = s.replace(/ksh/g, 'x').replace(/x/g, 'ks')
         .replace(/sh|s/g, 's').replace(/ch/g, 'c').replace(/th/g, 't').replace(/dh/g, 'd').replace(/kh/g, 'k').replace(/gh/g, 'g')
         .replace(/ph/g, 'f').replace(/bh/g, 'b').replace(/jh/g, 'j').replace(/rh/g, 'r').replace(/ck/g, 'k').replace(/q/g, 'k')
         .replace(/w/g, 'v').replace(/z/g, 'j')
         .replace(/aa/g, 'a').replace(/ee|ii/g, 'i').replace(/oo|uu/g, 'u').replace(/ou|au/g, 'o').replace(/ai|ei|ay|ey/g, 'e').replace(/y/g, 'i')
         .replace(/(.)\1+/g, '$1')                                  // double letters
         .replace(/h(?![aeiou])/g, '').replace(/([^aeiou])h/g, '$1')  // a silent h
         .replace(/(.{3,})[ae]$/, '$1');                           // a trailing a / e (Pande · Pandey · Pandeya)
    return s;
  }
  const sound = s => plain(s).split(' ').filter(Boolean).map(soundWord).join(' ');
  function lev(a, b){
    const m = a.length, n = b.length; if(!m || !n) return Math.max(m, n);
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for(let i = 1; i <= m; i++){ const cur = [i]; for(let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[n];
  }
  const sim = (a, b) => (!a || !b) ? 0 : 1 - lev(a, b) / Math.max(a.length, b.length);
  // a key the class-records store accepts (letters, digits, - _ : .), from any spelling
  function aliasKey(s){
    const p = plain(s); let h = 2166136261;
    for(let i = 0; i < p.length; i++){ h ^= p.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return 'n' + h.toString(36);
  }
  // A register number as written in a file: plain (5001) stays as it is; a student ID or this year's
  // code (KW-ADR-500126 / KW-ADR-500127 — school code, register no, 2-digit year) gives back 5001.
  function registerFrom(v){
    const s = String(v == null ? '' : v).trim().replace(/\.0+$/, '').replace(/\s+/g, '');
    const m = s.match(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?-(\d{3,5})\d{2}$/);
    return m ? m[1] : s;
  }
  const regNorm = v => registerFrom(v).replace(/^0+(?=\d)/, '');

  // how close two names are, 0 … 1 (surname and first letter count extra)
  function closeness(a, b){
    const A = sound(a).split(' '), B = sound(b).split(' ');
    let s = sim(A.join(''), B.join(''));
    const lastA = A[A.length - 1], lastB = B[B.length - 1];
    if(A.length > 1 && B.length > 1 && lastA === lastB) s += 0.12;
    if(A[0] && B[0] && A[0][0] === B[0][0]) s += 0.05;
    // initials: "D Shinde" / "Dwarka S"
    if(A.length === 2 && B.length === 2){ // only "D Shinde" ⇄ "Dwarka Shinde"; "M. Issa Shaikh" is not "Mariyam Shaikh"
      if(A[0].length === 1 && A[0] === B[0][0] && lastA === lastB) s = Math.max(s, 0.9);
      if(lastA.length === 1 && lastA === lastB[0] && A[0] === B[0]) s = Math.max(s, 0.9);
    }
    // a different first name is a different child, even with the same surname ("Yash Shinde" ≠ "Dwarka Shinde")
    if(A[0] && B[0] && A[0].length > 1 && B[0].length > 1 && sim(A[0], B[0]) < 0.55) s = Math.min(s, 0.6);
    // With a father's name in the middle ("Mudassir Kasim Patel"), brothers and sisters share
    // everything but the first name: the first names must then be really close.
    const fullA = A.filter(t => t.length > 1), fullB = B.filter(t => t.length > 1);
    if(fullA.length >= 3 && fullB.length >= 3 && sim(fullA[0], fullB[0]) < 0.8) s = Math.min(s, 0.6);
    // A middle word on both sides that differs ("M. Issa Shaikh" / "M. Umar Shaikh") is another child
    const midA = A.slice(1, -1).filter(t => t.length > 1), midB = B.slice(1, -1).filter(t => t.length > 1);
    if(midA.length && midB.length && !midA.some(x => midB.some(y => sim(x, y) >= 0.6))) s = Math.min(s, 0.6);
    return Math.min(1, s);
  }

  /**
   * find(name, { register, taken: Set of pupil ids already used, roll })
   * → { pupil, how, sure, score, alternatives: [pupil, …] }
   */
  function find(name, opt){
    opt = opt || {};
    const roll = (opt.roll || (typeof realPupilsCache !== 'undefined' && Array.isArray(realPupilsCache) ? realPupilsCache : [])).filter(p => !(opt.taken && opt.taken.has(p.id)));
    const res = (pupil, how, sure, score) => ({ pupil, how, sure, score: score == null ? 1 : score, alternatives: [] });
    if(!roll.length) return res(null, 'none', false, 0);
    // 1. register number
    const reg = regNorm(opt.register != null ? opt.register : (String(name).match(/^\s*(\d{1,6})[\s.)\-:]/) || [])[1]);
    if(reg){ const p = roll.find(x => regNorm(x.register_no || x.register_number || x.roll_no) === reg); if(p && closeness(name, p.name) >= 0.45) return res(p, 'register', true); }
    const pn = plain(name); if(!pn) return res(null, 'none', false, 0);
    // 2. exact
    let p = roll.find(x => plain(x.name) === pn); if(p) return res(p, 'exact', true);
    // 3. a spelling confirmed earlier for this class
    const mem = store[aliasKey(name)];
    if(mem){ p = roll.find(x => String(x.id) === String(mem.id)); if(p) return res(p, 'remembered', true); }
    // 4. sounds the same, and only one child does
    const sn = sound(name), same = roll.filter(x => sound(x.name) === sn);
    if(same.length === 1) return res(same[0], 'sounds', true);
    // 5. same words, another order
    const words = sn.split(' ').sort().join(' '), swapped = roll.filter(x => sound(x.name).split(' ').sort().join(' ') === words);
    if(swapped.length === 1) return res(swapped[0], 'order', true);
    // 6. the closest child, clearly closer than the next
    const scored = roll.map(x => ({ p: x, s: closeness(name, x.name) })).sort((a, b) => b.s - a.s);
    const out = res(null, 'none', false, scored[0].s);
    out.alternatives = scored.slice(0, 3).filter(x => x.s >= 0.45).map(x => x.p);
    if(scored[0].s >= 0.66 && (!scored[1] || scored[0].s - scored[1].s >= 0.08)){ out.pupil = scored[0].p; out.how = 'suggest'; }
    return out;
  }

  const HOW = { register: 'by register number', exact: '', remembered: 'spelling confirmed earlier', sounds: 'same name, different spelling', order: 'same name, words in another order', suggest: 'closest name on the roll' };

  window.NameMatch = {
    registerFrom,
    plain, sound, find, closeness, how: h => HOW[h] || '',
    // a teacher confirmed that this spelling is this child: remember it for the class
    remember(fileName, pupil){
      if(!pupil || plain(fileName) === plain(pupil.name)) return false;
      const k = aliasKey(fileName), v = { id: pupil.id, name: pupil.name, as: String(fileName).trim().slice(0, 80) };
      if(store[k] && String(store[k].id) === String(v.id)) return false;
      store[k] = v;
      if(typeof classRecordSave === 'function') classRecordSave('name_alias', k, v);
      return true;
    },
    remembered: () => Object.values(store),
    forget(fileName){ const k = aliasKey(fileName); if(!store[k]) return; delete store[k]; if(typeof classRecordSave === 'function') classRecordSave('name_alias', k, null); },
    load(){ if(loaded || typeof classRecordsSync !== 'function') return; loaded = true; classRecordsSync('name_alias', store); },
    _store: store
  };
  if(typeof module !== 'undefined') module.exports = window.NameMatch;
  // load this class's remembered spellings as soon as the class is known
  if(typeof classRecordsSync === 'function') window.NameMatch.load();
})();