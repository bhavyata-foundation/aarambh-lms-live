// Parent report extras: the teacher's review note (speak in English or Hindi, Hindi is translated to English),
// and a Hindi / English switch for the whole report page. Translation uses Google Cloud Translation on the server.
(function(){
  var MOTOR = 'backend/assessment/motor/';
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, SELECT: 1, BUTTON: 1, OPTION: 1, INPUT: 1 };
  var originals = null;

  function postJson(url, body){
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' }).then(function(r){ return r.json(); });
  }
  function translate(texts, target){
    return postJson(MOTOR + 'translate_text.php?' + qsNow(), { texts: texts, target: target }).then(function(d){
      if(d.status !== 'success') throw new Error(d.message || 'translation failed');
      return d.translations;
    });
  }
  function qsNow(){ return window.location.search ? window.location.search.slice(1) : ''; }

  // ---- the teacher's note (replaces the blank boxes in section 8) ----
  function noteWidget(id){
    return '<style>@media print{[data-pn="speak-en"],[data-pn="speak-hi"]{display:none !important;}}</style>' +
      '<div id="pn-widget" data-pid="' + id.pupil + '" data-term="' + id.term + '" data-class="' + id.cls + '" style="font-size:14px;">' +
      '<div class="pn-edit">' +
        '<div style="display:flex; gap:8px; flex-wrap:wrap; margin:6px 0 8px;">' +
          '<button type="button" data-pn="speak-en" style="' + BTN + '">🎤 Speak in English</button>' +
          '<button type="button" data-pn="speak-hi" style="' + BTN + '">🎤 Speak in Hindi (translated to English)</button>' +
          '<button type="button" data-pn="stop" style="' + BTN + ' display:none;">⏹ Stop</button>' +
        '</div>' +
        '<textarea data-pn="text" rows="5" placeholder="Write or speak the note for the parent…" style="width:100%; box-sizing:border-box; padding:10px; border:1px solid #C9D6CF; border-radius:10px; font:inherit; font-size:14px;"></textarea>' +
        '<div style="display:flex; gap:10px; align-items:center; margin-top:8px;">' +
          '<button type="button" data-pn="save" style="' + BTN_PRIMARY + '">Save note</button>' +
          '<span data-pn="status" style="font-size:12.5px; color:#5b6b62;"></span>' +
        '</div>' +
      '</div>' +
      '<div class="pn-view" data-pn="view" style="display:none; padding:10px 12px; border:1px solid #DDE8E2; border-radius:10px; white-space:pre-wrap; line-height:1.6;"></div>' +
    '</div>';
  }
  var BTN = 'height:36px; padding:0 12px; border-radius:8px; border:1px solid #C9D6CF; background:#fff; color:#17765B; font:inherit; font-size:13px; font-weight:700; cursor:pointer;';
  var BTN_PRIMARY = 'height:38px; padding:0 16px; border-radius:10px; border:1px solid #17765B; background:#17765B; color:#fff; font:inherit; font-size:14px; font-weight:700; cursor:pointer;';

  function setStatus(w, msg){ var s = w.querySelector('[data-pn="status"]'); if(s) s.textContent = msg; }

  function loadNote(w){
    var q = 'pupil_id=' + w.dataset.pid + '&term=' + w.dataset.term + '&' + qsNow();
    fetch(MOTOR + 'review_notes.php?' + q, { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(d){
      if(d.status === 'success'){ w.querySelector('[data-pn="text"]').value = d.note || ''; w.querySelector('[data-pn="view"]').textContent = d.note || ''; }
      else setStatus(w, d.message || 'could not load the note');
    }).catch(function(){ setStatus(w, 'could not load the note'); });
  }

  var rec = null;
  function speak(w, lang){
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ setStatus(w, 'Speech input needs Chrome or Safari.'); return; }
    var ta = w.querySelector('[data-pn="text"]');
    var hindi = lang === 'hi';
    rec = new SR(); rec.lang = hindi ? 'hi-IN' : 'en-IN'; rec.interimResults = false; rec.continuous = true;
    var said = '';
    rec.onresult = function(e){ for(var i = e.resultIndex; i < e.results.length; i++){ if(e.results[i].isFinal) said += e.results[i][0].transcript + ' '; } };
    rec.onend = function(){
      rec = null;
      w.querySelector('[data-pn="stop"]').style.display = 'none';
      var text = said.trim(); if(!text) { setStatus(w, 'Nothing was heard.'); return; }
      if(!hindi){ ta.value = (ta.value ? ta.value + ' ' : '') + text; setStatus(w, 'Added. Check the text, then save.'); return; }
      setStatus(w, 'Translating to English…');
      translate([text], 'en').then(function(t){ ta.value = (ta.value ? ta.value + ' ' : '') + t[0]; setStatus(w, 'Added in English. Check the text, then save.'); })
        .catch(function(e){ setStatus(w, 'Translation failed: ' + e.message); });
    };
    w.querySelector('[data-pn="stop"]').style.display = '';
    setStatus(w, 'Listening… tap Stop when done.');
    rec.start();
  }

  function wire(w){
    w.addEventListener('click', function(e){
      var b = e.target.closest('[data-pn]'); if(!b) return;
      var k = b.dataset.pn;
      if(k === 'speak-en') speak(w, 'en');
      else if(k === 'speak-hi') speak(w, 'hi');
      else if(k === 'stop' && rec) rec.stop();
      else if(k === 'save'){
        var note = w.querySelector('[data-pn="text"]').value;
        setStatus(w, 'Saving…');
        postJson(MOTOR + 'review_notes.php?' + qsNow(), { pupil_id: +w.dataset.pid, term: w.dataset.term, note: note }).then(function(d){
          if(d.status === 'success'){ w.querySelector('[data-pn="view"]').textContent = note; setStatus(w, 'Saved.'); }
          else setStatus(w, d.message || 'not saved');
        }).catch(function(){ setStatus(w, 'not saved'); });
      }
    });
    loadNote(w);
  }

  // ---- the whole report page: Hindi / English ----
  function textNodes(root){
    var out = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n; while((n = walker.nextNode())){
      var p = n.parentElement; if(!p || SKIP[p.tagName] || p.closest('#pn-widget')) continue;
      if(!/[A-Za-z]/.test(n.nodeValue)) continue;
      out.push(n);
    }
    return out;
  }
  function setLanguage(root, to, btn){
    btn.disabled = true;
    if(to === 'hi'){
      originals = textNodes(root).map(function(n){ return { node: n, orig: n.nodeValue }; });
      var unique = [...new Set(originals.map(function(o){ return o.orig.trim(); }))];
      translate(unique, 'hi').then(function(tr){
        var map = {}; unique.forEach(function(s, i){ map[s] = tr[i]; });
        originals.forEach(function(o){ var t = o.orig.trim(); if(map[t] != null) o.node.nodeValue = o.orig.replace(t, map[t]); });
        btn.textContent = 'English'; btn.dataset.to = 'en'; btn.disabled = false;
      }).catch(function(e){ alert('Hindi translation failed: ' + e.message); btn.disabled = false; });
    } else {
      if(originals) originals.forEach(function(o){ o.node.nodeValue = o.orig; });
      btn.textContent = 'हिन्दी'; btn.dataset.to = 'hi'; btn.disabled = false;
    }
  }

  window.parentNotes = {
    mount: function(root, pupil, cls, term){
      // the switch sits at the top of the parent report
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex; justify-content:flex-end; margin:0 0 8px;';
      bar.innerHTML = '<button type="button" data-to="hi" style="' + BTN + '">हिन्दी</button>';
      root.insertBefore(bar, root.firstChild);
      bar.querySelector('button').addEventListener('click', function(){ setLanguage(root, this.dataset.to, this); });

      // section 8 (TEACHER'S REVIEW NOTES): keep its heading and signature line, replace the blank boxes with the note editor
      var head = [...root.querySelectorAll('*')].find(function(e){ return e.childElementCount === 0 && /TEACHER'S REVIEW NOTES/i.test(e.textContent); });
      if(head){
        var sec = head.closest('section') || head.parentElement.parentElement || head.parentElement;
        [...sec.children].forEach(function(ch){ if(!ch.contains(head) && !/Class Teacher/.test(ch.textContent)) ch.remove(); });
        var box = document.createElement('div');
        box.innerHTML = noteWidget({ pupil: pupil, cls: cls, term: term });
        sec.appendChild(box.firstChild);
        wire(sec.querySelector('#pn-widget'));
      }
      if(!document.getElementById('pn-print-style')){
        var st = document.createElement('style'); st.id = 'pn-print-style';
        st.textContent = '@media print { #pn-widget .pn-edit{display:none !important;} #pn-widget .pn-view{display:block !important;} button{display:none !important;} }';
        document.head.appendChild(st);
      }
    }
  };
})();
