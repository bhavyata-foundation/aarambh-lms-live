/* =========================================================================
   AARAMBH VOICE → TEXT → TRANSLATION
   File:
   js/render/voice-translate.js

   Supported:
   English (India)
   Hindi
   Marathi

   Speech recognition happens in the browser.
   Translation happens securely through our PHP backend.
   ========================================================================= */

(function () {

  const VOICE_LANGUAGES = {
    en: {
      code: 'en',
      speechCode: 'en-IN',
      label: 'English'
    },

    hi: {
      code: 'hi',
      speechCode: 'hi-IN',
      label: 'हिंदी'
    },

    mr: {
      code: 'mr',
      speechCode: 'mr-IN',
      label: 'मराठी'
    }
  };


  // (listening state: voiceSession, below)


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

    return VOICE_LANGUAGES[code] ||
      VOICE_LANGUAGES.en;
  }


  function getVoiceSourceLanguage(domainKey) {

    const el =
      document.getElementById(
        'voiceSourceLang-' + domainKey
      );

    return el && el.value
      ? el.value
      : 'en';
  }


  function getVoiceTargetLanguage(domainKey) {

    const el =
      document.getElementById(
        'voiceTargetLang-' + domainKey
      );

    return el && el.value
      ? el.value
      : 'same';
  }


  /* =========================================================
     STATUS
     ========================================================= */

  function setVoiceStatus(domainKey, message, isError) {

    const el =
      document.getElementById(
        'voiceStatus-' + domainKey
      );

    if (!el) return;

    el.textContent = message || '';

    el.style.color = isError
      ? 'var(--danger, #c8433f)'
      : 'var(--text-muted)';
  }


  /* =========================================================
     SERVER TRANSLATION
     ========================================================= */

  async function translateVoiceText(
    text,
    sourceLanguage,
    targetLanguage
  ) {

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

        headers: {
          'Content-Type': 'application/json'
        },

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
      throw new Error(
        'Translation server returned an invalid response.'
      );
    }


    if (
      !response.ok ||
      data.status !== 'success'
    ) {

      throw new Error(
        data.message ||
        'Translation failed.'
      );
    }


    return data.translated_text || '';
  }


  /* =========================================================
     INSERT INTO TEXTAREA
     ========================================================= */

  function appendVoiceText(
    domainKey,
    text
  ) {

    const textarea =
      document.getElementById(
        'planText-' + domainKey
      );

    if (!textarea || !text) {
      return;
    }


    const existing =
      textarea.value.trim();


    textarea.value =
      existing
        ? existing + ' ' + text.trim()
        : text.trim();


    /*
      teacher.js / myday-planning.js already exposes
      savePlanText().
    */

    if (
      typeof window.savePlanText ===
      'function'
    ) {

      window.savePlanText(
        domainKey,
        textarea.value
      );

    } else if (
      typeof savePlanText ===
      'function'
    ) {

      savePlanText(
        domainKey,
        textarea.value
      );
    }


    textarea.dispatchEvent(
      new Event(
        'input',
        {
          bubbles: true
        }
      )
    );
  }


  /* =========================================================
     STOP ACTIVE RECORDING
     ========================================================= */

  /* =========================================================
     LISTENING — keeps listening through pauses until the teacher
     taps the microphone again (Oct 2026).
     - asks for the microphone first, so Chrome on Android shows
       its "Allow microphone" prompt;
     - Android: one sentence at a time, restarted automatically
       (left listening continuously, Android Chrome repeats words);
       other browsers: continuous;
     - stops by itself after about 20 seconds of silence, or 5 minutes;
     - every problem says how to fix it.
     ========================================================= */

  let voiceSession = null;   // { key, button, finalText, stopping, silences, started, lastError, … }
  const IS_ANDROID = /Android/i.test(navigator.userAgent || '');

  const VOICE_FIX = {
    'not-allowed': 'The microphone is blocked for this site. Tap the 🔒 (or ⓘ) next to the address → Permissions → Microphone → Allow, then reload the page.',
    'service-not-allowed': 'Voice typing is switched off on this phone. Open the Google app → Settings → Voice, switch it on, then try again.',
    'audio-capture': 'No microphone was found. Check no other app (call, recorder) is using it, then try again.',
    'language-not-supported': 'This language is not installed for voice typing on this phone. Google app → Settings → Voice → Languages → add it (Marathi / Hindi), then try again.',
    'network': 'Voice typing needs the internet. Check the connection and try again.',
    'bad-grammar': 'Voice typing could not start. Reload the page and try again.'
  };

  function stopAarambhVoiceInput() {
    if (!voiceSession) return;
    voiceSession.stopping = true;
    try {
      voiceSession.recognition.stop();
    } catch (e) {
      finishVoiceSession(voiceSession);
    }
  }

  // Ask for the microphone up front: true · 'denied' · 'nomic'
  async function ensureVoiceMicrophone() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());   // release it before listening starts
      return true;
    } catch (e) {
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) return 'denied';
      if (e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError')) return 'nomic';
      return true;
    }
  }

  function resetVoiceButton(button) {
    if (!button) return;
    button.disabled = false;
    button.textContent = '🎤 Speak';
    button.classList.remove('listening');
  }

  function listenOnce(session) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = session.language.speechCode;
    recognition.interimResults = true;
    recognition.continuous = !IS_ANDROID;
    recognition.maxAlternatives = 1;
    recognition._final = '';
    session.recognition = recognition;

    recognition.onstart = function () {
      session.button.disabled = false;
      session.button.textContent = '🔴 Listening… tap to stop';
      session.button.classList.add('listening');
      if (!session.finalText) setVoiceStatus(session.key, 'Speak in ' + session.language.label + '… tap 🔴 when you have finished.', false);
    };

    // Whole list each time (not only the new part): no word is counted twice
    recognition.onresult = function (event) {
      let fin = '', interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) fin += t + ' '; else interim += t;
      }
      recognition._final = fin;
      if (fin || interim) session.silences = 0;
      const preview = (session.finalText + fin + interim).trim();
      setVoiceStatus(session.key, preview ? 'Heard: ' + preview : 'Listening…', false);
    };

    recognition.onerror = function (event) {
      const err = event.error;
      if (err === 'no-speech') { session.silences++; return; }   // a pause: keep going
      if (err === 'aborted') return;
      session.lastError = err;
      session.stopping = true;
      setVoiceStatus(session.key, VOICE_FIX[err] || ('Voice typing stopped (' + err + '). Try again.'), true);
    };

    recognition.onend = function () {
      session.finalText += recognition._final;
      const tooQuiet = session.silences >= 3;                       // about 20 seconds of silence
      const tooLong = Date.now() - session.started > 5 * 60 * 1000;
      if (!session.stopping && !tooQuiet && !tooLong && voiceSession === session) {
        try { listenOnce(session); return; } catch (e) { /* fall through */ }
      }
      finishVoiceSession(session);
    };

    recognition.start();
  }

  async function finishVoiceSession(session) {
    if (session.finished) return;
    session.finished = true;
    if (voiceSession === session) voiceSession = null;
    const domainKey = session.key, button = session.button;
    resetVoiceButton(button);

    const transcript = session.finalText.trim();
    if (!transcript) {
      if (!session.lastError) setVoiceStatus(domainKey, 'Nothing was heard. Tap 🎤, hold the phone close and speak clearly.', true);
      return;
    }

    // Same language: put it in the box as spoken
    if (session.target === 'same' || session.target === session.source) {
      appendVoiceText(domainKey, transcript);
      setVoiceStatus(domainKey, '✓ Voice converted to text', false);
      return;
    }

    // Translation
    setVoiceStatus(domainKey, 'Translating…', false);
    button.disabled = true;
    try {
      const translated = await translateVoiceText(transcript, session.source, session.target);
      appendVoiceText(domainKey, translated);
      setVoiceStatus(domainKey, '✓ Translated to ' + getVoiceLanguage(session.target).label, false);
    } catch (error) {
      // Never throw away the teacher's words: keep what she said
      appendVoiceText(domainKey, transcript);
      setVoiceStatus(domainKey, 'Translation failed — your words were kept as spoken. ' + (error && error.message ? error.message : ''), true);
    } finally {
      button.disabled = false;
    }
  }

  /* =========================================================
     START VOICE INPUT
     ========================================================= */

  async function startAarambhVoiceInput(domainKey, button) {
    if (!aarambhVoiceSupported()) {
      setVoiceStatus(domainKey, 'Voice typing works in Google Chrome (or Microsoft Edge). Open the portal in Chrome to use it.', true);
      return;
    }
    if (window.isSecureContext === false) {
      setVoiceStatus(domainKey, 'Voice typing needs the secure address (https://…). Open the portal from its https link.', true);
      return;
    }

    // The same microphone again: stop
    if (voiceSession && voiceSession.key === domainKey) {
      stopAarambhVoiceInput();
      return;
    }
    // Another card is listening: finish that one first (its words are kept)
    if (voiceSession) stopAarambhVoiceInput();

    const source = getVoiceSourceLanguage(domainKey);
    const target = getVoiceTargetLanguage(domainKey);
    const language = getVoiceLanguage(source);

    button.disabled = true;
    button.textContent = '⏳ Starting…';
    setVoiceStatus(domainKey, 'Starting the microphone…', false);

    const mic = await ensureVoiceMicrophone();
    if (mic === 'denied') { resetVoiceButton(button); setVoiceStatus(domainKey, VOICE_FIX['not-allowed'], true); return; }
    if (mic === 'nomic') { resetVoiceButton(button); setVoiceStatus(domainKey, VOICE_FIX['audio-capture'], true); return; }

    const session = { key: domainKey, button, source, target, language, finalText: '', stopping: false, silences: 0, started: Date.now(), lastError: null, finished: false };
    voiceSession = session;
    try {
      listenOnce(session);
    } catch (error) {
      voiceSession = null;
      resetVoiceButton(button);
      setVoiceStatus(domainKey, 'Could not start the microphone. Reload the page and try again.', true);
    }
  }

  /* =========================================================
     HTML CONTROL
     Used by myday.js
     ========================================================= */

  function aarambhVoiceTranslateControls(
    domainKey
  ) {

    if (!aarambhVoiceSupported()) {

      return `
        <div
          style="
            margin-top:6px;
            font-size:11px;
            color:var(--text-muted);
          "
        >
          Voice typing is unavailable in this browser.
        </div>
      `;
    }


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
            id="voiceSourceLang-${domainKey}"
            title="Language you will speak"
            style="
              padding:6px 7px;
              border:1px solid var(--border);
              border-radius:7px;
              background:#fff;
              font-size:11px;
            "
          >

            <option value="en">
              Speak: English
            </option>

            <option value="hi">
              बोलें: हिंदी
            </option>

            <option value="mr">
              बोला: मराठी
            </option>

          </select>


          <span
            style="
              font-size:11px;
              color:var(--text-muted);
            "
          >
            →
          </span>


          <select
            id="voiceTargetLang-${domainKey}"
            title="Language to write into the activity box"
            style="
              padding:6px 7px;
              border:1px solid var(--border);
              border-radius:7px;
              background:#fff;
              font-size:11px;
            "
          >

            <option value="same">
              Write same language
            </option>

            <option value="en">
              Write English
            </option>

            <option value="hi">
              हिंदी में लिखें
            </option>

            <option value="mr">
              मराठीत लिहा
            </option>

          </select>


          <button
            type="button"
            class="chip"
            style="
              white-space:nowrap;
              font-size:11px;
              cursor:pointer;
            "
            onclick="
              startAarambhVoiceInput(
                '${domainKey}',
                this
              )
            "
          >
            🎤 Speak
          </button>

        </div>


        <div
          id="voiceStatus-${domainKey}"
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

  window.aarambhVoiceSupported =
    aarambhVoiceSupported;


  window.startAarambhVoiceInput =
    startAarambhVoiceInput;


  window.stopAarambhVoiceInput =
    stopAarambhVoiceInput;


  window.aarambhVoiceTranslateControls =
    aarambhVoiceTranslateControls;


})();