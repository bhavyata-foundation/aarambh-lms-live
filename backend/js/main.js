/* =========================================================================
   MAIN.JS — login page only (index.html). Every other role's actual
   dashboard now lives on its own page (teacher.html, supervisor.html,
   superadmin.html, parent.html) — this file's only job is authenticating
   someone and sending them to the right one.

   TABLE OF CONTENTS (search for "SECTION:" to jump between these)
   1. LOGIN & SESSION (role selector) — selectRole, the login form itself,
      remembered email (never the password), dev-bypass skip-login, logout
   2. STARTUP — on page load: resume an existing session (redirect to the
      right role's page) or fill in the remembered email; the dev-bypass
      trigger that runs after everything else is defined
   ========================================================================= */

let selectedRole = 'teacher';

  /* ===================== SECTION 1: LOGIN & SESSION (role selector) ===================== */

  function selectRole(role, el){
    selectedRole = role;
    document.querySelectorAll('.role-btn').forEach(b=>b.classList.remove('active'));
    el.classList.add('active');
  }

/* ===================== SECTION 3: LOGIN & SESSION ===================== */

function handleLoginSubmit(event){
  event.preventDefault();
  login();
  return false;
}

/* =========================================================
   REMEMBERED EMAIL — only the EMAIL is remembered on this device,
   never the password. (An earlier version kept email + password in
   plain readable text in localStorage; anyone using this browser
   could read it in seconds. That copy is now wiped automatically
   the first time this page opens — see forgetOldSavedPasswords.)

   Passwords can still be remembered safely by the browser's own
   "Save password?" offer (Chrome / Edge / Safari keep it encrypted
   and ask for the device lock) — the form's autocomplete settings
   in index.html allow that.
   ========================================================= */
const OLD_SAVED_LOGIN_KEY = 'savedLoginCredentials'; // email + password — no longer used
const REMEMBERED_EMAIL_KEY = 'rememberedLoginEmail';

// One-time clean-up: keep the email, destroy the stored password.
(function forgetOldSavedPasswords(){
  try{
    const raw = localStorage.getItem(OLD_SAVED_LOGIN_KEY);
    if(raw === null) return;
    let email = '';
    try { email = (JSON.parse(raw) || {}).email || ''; } catch(e){}
    if(email && !localStorage.getItem(REMEMBERED_EMAIL_KEY)) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    localStorage.removeItem(OLD_SAVED_LOGIN_KEY);
  } catch(e){ /* storage unavailable — nothing saved anyway */ }
})();

function getRememberedEmail(){
  try{ return localStorage.getItem(REMEMBERED_EMAIL_KEY) || ''; } catch(e){ return ''; }
}

function rememberEmail(email){
  try{ localStorage.setItem(REMEMBERED_EMAIL_KEY, email); } catch(e){ /* just won't persist */ }
}

function clearRememberedEmail(){
  try{ localStorage.removeItem(REMEMBERED_EMAIL_KEY); localStorage.removeItem(OLD_SAVED_LOGIN_KEY); } catch(e){}
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  const link = document.getElementById('clearSavedLoginLink');
  if(link) link.remove();
  document.getElementById('loginEmail').focus();
}

function autoFillSavedLogin(){
  const email = getRememberedEmail();
  if(!email) return;
  const emailEl = document.getElementById('loginEmail');
  if(!emailEl.value) emailEl.value = email;
  document.getElementById('loginPassword').focus();

  const footer = document.querySelector('.login-footer');
  if(footer && !document.getElementById('clearSavedLoginLink')){
    const link = document.createElement('div');
    link.id = 'clearSavedLoginLink';
    link.style.cssText = 'text-align:center; margin-top:8px;';
    link.innerHTML = `<a href="#" onclick="clearRememberedEmail(); return false;" style="font-size:12px; color:var(--text-muted); text-decoration:underline;">Not you? Use a different email</a>`;
    footer.insertAdjacentElement('afterend', link);
  }
}

// Where each role's dashboard lives.
const ROLE_PAGES = {
  teacher: 'teacher.html',
  supervisor: 'supervisor.html',
  superadmin: 'superadmin.html',
  parent: 'parent.html',
  principal: 'principal.html'
};

async function login(){
  const emailEl = document.getElementById('loginEmail');
  const passwordEl = document.getElementById('loginPassword');
  const errorEl = document.getElementById('loginError');
  const btnEl = document.getElementById('loginBtn');

  const email = emailEl.value.trim();
  const password = passwordEl.value;

  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  if(!email || !password){
    errorEl.textContent = 'Please enter both email and password.';
    errorEl.classList.remove('hidden');
    return;
  }

  btnEl.disabled = true;
  btnEl.textContent = 'Signing in…';

  try{
    const res = await fetch('backend/auth/login.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password})
    });
    const data = await res.json();

    if(data.status !== 'success'){
      errorEl.textContent = data.message || 'Login failed. Please try again.';
      errorEl.classList.remove('hidden');
      btnEl.disabled = false;
      btnEl.textContent = 'Sign in';
      return;
    }

    rememberEmail(email); // the email only — never the password

    // The role that actually matters is whatever the SERVER says this
    // account is — not whichever role button was clicked. This is what
    // stops someone from clicking "Super Admin" and getting in on a
    // teacher's credentials.
    selectedRole = data.role;

    if(ROLE_PAGES[selectedRole]){
      window.location.href = ROLE_PAGES[selectedRole];
    } else {
      errorEl.textContent = 'This role is not wired up yet in this prototype.';
      errorEl.classList.remove('hidden');
      btnEl.disabled = false;
      btnEl.textContent = 'Sign in';
    }
  } catch(err){
    errorEl.textContent = 'Could not reach the server. Check your connection and try again.';
    errorEl.classList.remove('hidden');
    btnEl.disabled = false;
    btnEl.textContent = 'Sign in';
  }
}

function logout(){
  // Cancel any pending 12:30 gate timer — it shouldn't fire while logged out,
  // and a fresh login re-checks the gate correctly anyway.
  if(gateTimerId){ clearTimeout(gateTimerId); gateTimerId = null; }

  fetch('backend/auth/logout.php').catch(() => {}); // best-effort — proceed regardless

  document.getElementById('view-attendance').classList.add('hidden');
  document.getElementById('view-dashboard').classList.add('hidden');
  document.getElementById('view-login').classList.remove('hidden');
  // Deliberately NOT clearing today's saved attendance record here —
  // logging back in the same day should still recognise it's already marked.
}

/* =========================================================
   DEV MODE — skip login entirely while iterating on the frontend.

   NOTE: the actual auto-run trigger for this now lives at the very
   END of this file, not here — it has to run AFTER every other
   variable in this file is declared (expandedWeek, attendanceRecords,
   etc.), otherwise it fires too early and hits a "cannot access
   before initialization" error. See the bottom of the file.

   CHANGED: this no longer fires automatically on every localhost page
   load. It used to (see git history / earlier version of this file),
   which meant anyone visiting the bare index.html URL — including an
   official or demo viewer with no idea "dev mode" existed — got
   silently bounced past the login page with no way to reach it short
   of knowing to add ?no_dev=1. That's backwards: the REAL login page
   should be what a stranger sees by default; skipping it should be
   something YOU ask for, not something that happens to everyone else.

   New behaviour: the real login page always shows first. Auto-skip
   only fires when a role is explicitly requested in the URL:
     index.html?dev_role=teacher
     index.html?dev_role=supervisor
     index.html?dev_role=superadmin
     index.html?dev_role=parent
   Visiting bare index.html (no dev_role param) always shows the real
   login page now — no flag needed for that anymore. The "Skip login
   (dev mode)" link is still there for manually picking a role and
   skipping on demand.
   ========================================================= */

function devSkipLogin(){
  // Respects whichever role tab is currently selected on the login card.
  document.getElementById('view-login').classList.add('hidden');
  if(ROLE_PAGES[selectedRole]) window.location.href = ROLE_PAGES[selectedRole] + '?dev_role=' + selectedRole;
}

  

/* ===================== SECTION 2: STARTUP ===================== */

(function checkExistingSession(){
  fetch('backend/auth/session_check.php' + window.location.search)
    .then(r => r.json())
    .then(data => {
      if(data.status !== 'logged_in'){
        autoFillSavedLogin();
        return;
      }
      if(ROLE_PAGES[data.role]) window.location.href = ROLE_PAGES[data.role];
      else autoFillSavedLogin(); // unknown role — stay on the login page rather than guess a dashboard
    })
    .catch(() => { autoFillSavedLogin(); });
})();

/* =========================================================
   DEV MODE — the actual trigger. Runs last, after every let/const in
   this file is initialized.

   Also activates on the GitHub Pages demo URL
   (bhavyata-foundation.github.io) — deliberately, for showing
   officials the frontend without needing real credentials.
   This is SAFE specifically because GitHub Pages serves static
   files only (no PHP, no database) — there is no real student
   or teacher data behind this URL for a bypass to expose.
   This check must NEVER be widened to include the real live domain
   (bhavyatafoundation.com), since that one IS connected to a
   real database.

   IMPORTANT CHANGE from the previous version: this only auto-skips
   when ?dev_role=... is EXPLICITLY present in the URL. No dev_role
   param means the real login page stays up — see the long comment
   on devSkipLogin() above for why this changed.
   ========================================================= */
(function autoDevBypassOnLoad(){
  const DEMO_HOSTNAMES = ['localhost', '127.0.0.1', 'bhavyata-foundation.github.io'];
  const isLocal = DEMO_HOSTNAMES.includes(window.location.hostname);
  const params = new URLSearchParams(window.location.search);

  if(isLocal){
    const wrap = document.getElementById('devSkipLoginWrap');
    if(wrap) wrap.classList.remove('hidden');
  }

  // Only auto-skip when a role was explicitly requested in the URL.
  // Bare index.html (no dev_role param) always shows the real login
  // page now, even on localhost/the demo URL.
  if(!isLocal || !params.has('dev_role')) return;

  const role = params.get('dev_role');
  selectedRole = role;

  devSkipLogin();
})();