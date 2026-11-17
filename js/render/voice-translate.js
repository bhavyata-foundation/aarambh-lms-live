/* =========================================================================
   AARAMBH VOICE → TEXT → TRANSLATION
   File:
   js/render/voice-translate.js

   Supported spoken languages:
   English (India), Hindi, Marathi, Gujarati

   Speech recognition happens in the browser (Web Speech API).
   Translation happens securely through our PHP backend.

   CHANGES (v2)
   - Continuous dictation: the mic no longer cuts off at the first pause.
     It keeps listening (auto-restarting when the browser ends a session)
     until the teacher taps again, or 15 s pass with no speech.
   - Fixed: starting the mic in another box while one was recording used
     to wipe the new session's state. Every session now owns its state.
   - Fixed: speech that was still "interim" when recording stopped is no
     longer lost.
   - Android Chrome duplicate-text bug is avoided by rebuilding the
     transcript from event.results on every event instead of appending.
   - Gujarati added (speech gu-IN, translation gu).
   - All UI text goes through t() / lang/*.json with English fallbacks.
   - Last-used languages are remembered.
   - Button is looked up by id, so it survives a re-render of the card.
   ========================================================================= */

(function () {

  const VOICE_LANGUAGES = {
    en: { code: 'en', speechCode: 'en-IN', label: 'English' },
    hi: { code: 'hi', speechCode: 'hi-IN', label: 'हिंदी' },
    mr: { code: 'mr', speechCode: 'mr-IN', label: 'मराठी' },
    gu: { code: 'gu', speechCode: 'gu-IN', label: 'ગુજરાતી' }
  };

  const IDLE_STOP_MS = 15000;   // stop if nothing is heard for this long
  const RESTART_DELAY_MS = 150; // pause before re-opening the recogniser
  const MAX_QUICK_FAILS = 3;    // sessions that die instantly = give up

  const LANG_PREF_KEY = 'aarambhVoiceLangs';

  // Only ONE session can be active at a time. Each session object owns
  // all of its own state, so an old session finishing late can never
  // clobber a newer one.
  let activeSession = null;


  /* =========================================================
     SMALL HELPERS
     ========================================================= */

  function vt(key, fallback, vars) {

    let text = fallback;

    try {
      if (typeof window.t === 'function') {
        const translated = window.t(key);
        if (translated && translated !== key) {
          text = translated;
        }
      }
    } catch (e) { /* use fallback */ }

    if (vars) {
      Object.keys(vars).forEach(function (name) {
        text = text.split('{' + name + '}').join(vars[name]);
      });
    }

    return text;
  }


  function escAttr(value) {

    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }


  function loadLangPrefs() {

    try {
      const saved = JSON.parse(
        localStorage.getItem(LANG_PREF_KEY) || '{}'
      );

      return {
        source: VOICE_LANGUAGES[saved.source] ? saved.source : 'en',
        target:
          saved.target === 'same' || VOICE_LANGUAGES[saved.target]
            ? saved.target
            : 'same'
      };

    } catch (e) {
      return { source: 'en', target: 'same' };
    }
  }


  function saveLangPrefs(source, target) {

    try {
      localStorage.setItem(
        LANG_PREF_KEY,
        JSON.stringify({ source: source, target: target })
      );
    } catch (e) { /* storage unavailable — not critical */ }
  }


  /* =========================================================
     SUPPORT CHECK
     ========================================================= */

  function aarambhVoiceSupported() {

    return !!(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );
  }


  /* =========================================================
     LANGUAGE HELPERS
     ========================================================= */

  function getVoiceLanguage(code) {

    return VOICE_LANGUAGES[code] || VOICE_LANGUAGES.en;
  }


  function getVoiceSourceLanguage(domainKey) {

    const el = document.getElementById('voiceSourceLang-' + domainKey);

    return el && el.value ? el.value : 'en';
  }


  function getVoiceTargetLanguage(domainKey) {

    const el = document.getElementById('voiceTargetLang-' + domainKey);

    return el && el.value ? el.value : 'same';
  }


  /* =========================================================
     STATUS + BUTTON
     ========================================================= */

  function setVoiceStatus(domainKey, message, isError) {

    const el = document.getElementById('voiceStatus-' + domainKey);

    if (!el) return;

    el.textContent = message || '';

    el.style.color = isError
      ? 'var(--danger, #c8433f)'
      : 'var(--text-muted)';
  }


  // The card can be re-rendered while recording (live poll, tab switch),
  // which replaces the button. Look it up by id each time; fall back to
  // the element we were given.
  function getVoiceButton(session) {

    return (
      document.getElementById('voiceBtn-' + session.domainKey) ||
      session.button
    );
  }


  function setButtonListening(session) {

    const button = getVoiceButton(session);

    if (!button) return;

    button.disabled = false;
    button.classList.add('listening');
    button.textContent =
      '🔴 ' + vt('voice_listening', 'Listening…') +
      ' · ' + vt('voice_tap_stop', 'Tap to stop');
  }


  function setButtonIdle(session, disabled) {

    const button = getVoiceButton(session);

    if (!button) return;

    button.classList.remove('listening');
    button.disabled = !!disabled;
    button.textContent = '🎤 ' + vt('voice_speak', 'Speak');
  }


  /* =========================================================
     SERVER TRANSLATION
     ========================================================= */

  async function translateVoiceText(text, sourceLanguage, targetLanguage) {

    if (!text) {
      return '';
    }

    if (
      targetLanguage === 'same' ||
      sourceLanguage === targetLanguage
    ) {
      return text;
    }

    const response = await fetch(
      'backend/translation/translate_text.php',
      {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          source: sourceLanguage,
          target: targetLanguage
        })
      }
    );

    let data;

    try {
      data = await response.json();
    } catch (e) {
      throw new Error('Translation server returned an invalid response.');
    }

    if (!response.ok || data.status !== 'success') {
      throw new Error(data.message || 'Translation failed.');
    }

    return data.translated_text || '';
  }


  /* =========================================================
     INSERT INTO TEXTAREA
     ========================================================= */

  function appendVoiceText(domainKey, text) {

    const textarea = document.getElementById('planText-' + domainKey);

    if (!textarea || !text) {
      return;
    }

    const existing = textarea.value.trim();

    textarea.value = existing
      ? existing + ' ' + text.trim()
      : text.trim();

    /*
      teacher.js / myday-planning.js already exposes savePlanText().
    */

    if (typeof window.savePlanText === 'function') {

      window.savePlanText(domainKey, textarea.value);

    } else if (typeof savePlanText === 'function') {

      savePlanText(domainKey, textarea.value);
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }


  /* =========================================================
     SESSION LIFECYCLE
     ========================================================= */

  function clearIdleTimer(session) {

    if (session.idleTimer) {
      clearTimeout(session.idleTimer);
      session.idleTimer = null;
    }
  }


  function armIdleTimer(session) {

    clearIdleTimer(session);

    session.idleTimer = setTimeout(function () {
      requestStop(session);
    }, IDLE_STOP_MS);
  }


  // Ask a session to wrap up. The recogniser's own onend does the rest.
  function requestStop(session) {

    if (!session || session.finished) return;

    session.stopRequested = true;
    clearIdleTimer(session);

    if (session.recognition) {
      try {
        session.recognition.stop();
      } catch (e) {
        // Already stopped — make sure we still finish.
        finishSession(session);
      }
    } else {
      finishSession(session);
    }
  }


  function stopAarambhVoiceInput() {

    requestStop(activeSession);
  }


  // Everything heard so far in this session: earlier recogniser
  // instances (committed) + the current one (finals, then interim).
  function collectTranscript(session) {

    const parts = [];

    if (session.committed) parts.push(session.committed);
    if (session.currentFinal) parts.push(session.currentFinal);
    if (session.currentInterim) parts.push(session.currentInterim);

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }


  // Move what the current recogniser heard into `committed`, so a
  // restarted recogniser starts from a clean slate.
  function commitCurrent(session) {

    const heard = [session.currentFinal, session.currentInterim]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (heard) {
      session.committed = session.committed
        ? session.committed + ' ' + heard
        : heard;
    }

    session.currentFinal = '';
    session.currentInterim = '';
  }


  async function finishSession(session) {

    if (session.finished) return;

    session.finished = true;
    clearIdleTimer(session);

    // Only clear the global if it still points at THIS session.
    if (activeSession === session) {
      activeSession = null;
    }

    commitCurrent(session);

    const transcript = session.committed.trim();
    const domainKey = session.domainKey;

    // "No speech" after the teacher already spoke is just the browser
    // noticing the silence at the end — not worth showing as an error.
    const showError =
      !!session.error &&
      !(session.error === 'no-speech' && transcript);

    if (showError) {
      setVoiceStatus(domainKey, session.errorMessage, true);
    }

    if (!transcript) {
      setButtonIdle(session, false);
      return;
    }

    // Same-language transcription.
    if (
      session.targetLanguage === 'same' ||
      session.targetLanguage === session.sourceLanguage
    ) {

      appendVoiceText(domainKey, transcript);

      setButtonIdle(session, false);

      if (!showError) {
        setVoiceStatus(
          domainKey,
          '✓ ' + vt('voice_converted', 'Voice converted to text'),
          false
        );
      }

      return;
    }

    // Translation required.
    setVoiceStatus(domainKey, vt('voice_translating', 'Translating…'), false);

    setButtonIdle(session, true);

    try {

      const translated = await translateVoiceText(
        transcript,
        session.sourceLanguage,
        session.targetLanguage
      );

      appendVoiceText(domainKey, translated);

      setVoiceStatus(
        domainKey,
        '✓ ' + vt(
          'voice_translated_to',
          'Translated to {lang}',
          { lang: getVoiceLanguage(session.targetLanguage).label }
        ),
        false
      );

    } catch (error) {

      // Never throw away the teacher's speech: keep the original.
      appendVoiceText(domainKey, transcript);

      setVoiceStatus(
        domainKey,
        vt(
          'voice_translation_failed',
          'Translation failed — original speech was saved.'
        ) + ' ' + error.message,
        true
      );

    } finally {

      setButtonIdle(session, false);
    }
  }


  /* =========================================================
     RECOGNISER (one session may use several, back to back)
     ========================================================= */

  function errorMessageFor(code) {

    const map = {
      'not-allowed':
        vt('voice_err_denied', 'Microphone permission was denied.'),
      'service-not-allowed':
        vt('voice_err_service', 'Speech recognition permission was denied.'),
      'no-speech':
        vt('voice_err_nospeech', 'No speech was detected. Try again.'),
      'audio-capture':
        vt('voice_err_nomic', 'No microphone was found.'),
      'network':
        vt('voice_err_network', 'Speech recognition needs an internet connection.'),
      'aborted':
        vt('voice_stopped', 'Voice input stopped.')
    };

    return (
      map[code] ||
      (vt('voice_err_generic', 'Voice recognition error:') + ' ' + code)
    );
  }


  function openRecognizer(session) {

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();

    recognition.lang = getVoiceLanguage(session.sourceLanguage).speechCode;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    session.recognition = recognition;
    session.startedAt = Date.now();
    session.heardInThisInstance = false;

    recognition.onresult = function (event) {

      // Ignore events from a recogniser we've already replaced.
      if (session.recognition !== recognition || session.finished) return;

      session.heardInThisInstance = true;
      session.quickFails = 0;
      armIdleTimer(session);

      // Rebuild from index 0 every time (NOT from event.resultIndex and
      // NOT by appending). Android Chrome re-sends earlier results in
      // continuous mode, which would otherwise duplicate the text.
      let finals = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {

        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finals += (finals ? ' ' : '') + transcript.trim();
        } else {
          interim += transcript;
        }
      }

      session.currentFinal = finals.trim();
      session.currentInterim = interim.trim();

      const preview = collectTranscript(session);

      setVoiceStatus(
        session.domainKey,
        preview
          ? vt('voice_heard', 'Heard:') + ' ' + preview
          : vt('voice_listening', 'Listening…'),
        false
      );
    };

    recognition.onerror = function (event) {

      if (session.recognition !== recognition || session.finished) return;

      // 'aborted' is us (or the browser) stopping; not an error to show.
      if (event.error === 'aborted') return;

      session.error = event.error;
      session.errorMessage = errorMessageFor(event.error);
      session.stopRequested = true; // errors end the session; no restart
    };

    recognition.onend = function () {

      if (session.recognition !== recognition || session.finished) return;

      // Done, or an error happened: wrap up.
      if (session.stopRequested || session.error) {
        finishSession(session);
        return;
      }

      // Browser ended the session by itself (they do, roughly every
      // minute or after a long pause). Keep going.
      commitCurrent(session);

      const lasted = Date.now() - session.startedAt;

      if (!session.heardInThisInstance && lasted < 700) {
        session.quickFails++;
      }

      if (session.quickFails >= MAX_QUICK_FAILS) {
        finishSession(session);
        return;
      }

      setTimeout(function () {

        if (session.finished || session.stopRequested) {
          finishSession(session);
          return;
        }

        try {
          openRecognizer(session);
          session.recognition.start();
        } catch (e) {
          session.error = 'start-failed';
          session.errorMessage =
            vt('voice_start_failed', 'Could not start microphone.');
          finishSession(session);
        }

      }, RESTART_DELAY_MS);
    };
  }


  /* =========================================================
     START VOICE INPUT
     ========================================================= */

  function startAarambhVoiceInput(domainKey, button) {

    if (!aarambhVoiceSupported()) {

      setVoiceStatus(
        domainKey,
        vt('voice_unsupported', 'Voice typing is not supported in this browser.'),
        true
      );

      return;
    }

    // Tapping the same microphone again stops it.
    if (activeSession && activeSession.domainKey === domainKey) {

      requestStop(activeSession);

      return;
    }

    // A different box is recording: wrap that one up first. It keeps its
    // own domainKey/target, so its text still lands in the right box.
    if (activeSession) {
      requestStop(activeSession);
    }

    const sourceLanguage = getVoiceSourceLanguage(domainKey);
    const targetLanguage = getVoiceTargetLanguage(domainKey);

    saveLangPrefs(sourceLanguage, targetLanguage);

    const session = {
      domainKey: domainKey,
      button: button,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      recognition: null,
      committed: '',
      currentFinal: '',
      currentInterim: '',
      stopRequested: false,
      finished: false,
      error: null,
      errorMessage: '',
      quickFails: 0,
      startedAt: 0,
      heardInThisInstance: false,
      idleTimer: null
    };

    activeSession = session;

    setButtonListening(session);

    setVoiceStatus(
      domainKey,
      vt(
        'voice_speak_in',
        'Speak in {lang}…',
        { lang: getVoiceLanguage(sourceLanguage).label }
      ),
      false
    );

    try {

      openRecognizer(session);
      session.recognition.start();
      armIdleTimer(session);

    } catch (error) {

      session.error = 'start-failed';
      session.errorMessage =
        vt('voice_start_failed', 'Could not start microphone.');

      finishSession(session);
    }
  }


  // If the teacher leaves the page / switches app while recording,
  // wrap up so the speech is saved and the mic is released.
  window.addEventListener('pagehide', stopAarambhVoiceInput);


  /* =========================================================
     HTML CONTROL
     Used by myday.js
     ========================================================= */

  function aarambhVoiceTranslateControls(domainKey) {

    if (!aarambhVoiceSupported()) {

      return `
        <div style="margin-top:6px; font-size:11px; color:var(--text-muted);">
          ${escAttr(vt('voice_unavailable', 'Voice typing is unavailable in this browser.'))}
        </div>
      `;
    }

    const prefs = loadLangPrefs();
    const key = escAttr(domainKey);

    const sel = function (value, current) {
      return value === current ? ' selected' : '';
    };

    const selectStyle =
      'padding:6px 7px; border:1px solid var(--border);' +
      'border-radius:7px; background:#fff; font-size:11px;';

    return `

      <div
        style="
          margin-top:7px;
          padding:8px;
          border:1px solid var(--border);
          border-radius:9px;
          background:var(--bg);
        "
      >

        <div
          style="
            display:flex;
            gap:6px;
            align-items:center;
            flex-wrap:wrap;
          "
        >

          <select
            id="voiceSourceLang-${key}"
            title="${escAttr(vt('voice_title_source', 'Language you will speak'))}"
            style="${selectStyle}"
          >
            <option value="en"${sel('en', prefs.source)}>Speak: English</option>
            <option value="hi"${sel('hi', prefs.source)}>बोलें: हिंदी</option>
            <option value="mr"${sel('mr', prefs.source)}>बोला: मराठी</option>
            <option value="gu"${sel('gu', prefs.source)}>બોલો: ગુજરાતી</option>
          </select>

          <span style="font-size:11px; color:var(--text-muted);">→</span>

          <select
            id="voiceTargetLang-${key}"
            title="${escAttr(vt('voice_title_target', 'Language to write into the activity box'))}"
            style="${selectStyle}"
          >
            <option value="same"${sel('same', prefs.target)}>${escAttr(vt('voice_write_same', 'Write same language'))}</option>
            <option value="en"${sel('en', prefs.target)}>Write English</option>
            <option value="hi"${sel('hi', prefs.target)}>हिंदी में लिखें</option>
            <option value="mr"${sel('mr', prefs.target)}>मराठीत लिहा</option>
            <option value="gu"${sel('gu', prefs.target)}>ગુજરાતીમાં લખો</option>
          </select>

          <button
            type="button"
            id="voiceBtn-${key}"
            class="chip"
            data-voice-key="${key}"
            style="white-space:nowrap; font-size:11px; cursor:pointer;"
            onclick="startAarambhVoiceInput(this.dataset.voiceKey, this)"
          >
            🎤 ${escAttr(vt('voice_speak', 'Speak'))}
          </button>

        </div>

        <div
          id="voiceStatus-${key}"
          style="
            min-height:16px;
            margin-top:5px;
            font-size:10.5px;
            color:var(--text-muted);
          "
        ></div>

      </div>
    `;
  }


  /* =========================================================
     EXPOSE GLOBALLY
     ========================================================= */

  window.aarambhVoiceSupported = aarambhVoiceSupported;
  window.startAarambhVoiceInput = startAarambhVoiceInput;
  window.stopAarambhVoiceInput = stopAarambhVoiceInput;
  window.aarambhVoiceTranslateControls = aarambhVoiceTranslateControls;

})();
