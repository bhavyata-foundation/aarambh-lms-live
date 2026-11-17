/* =========================================================================
   js/data/curriculum.js — foundational data + small helpers almost every
   other module reads: the day/domain/curricular-goal structure, the
   student roster, rating scale, and the teacher's own attendance-gate
   time. Extracted from teacher.js's old SECTION 1.

   Same cross-file-sharing rule as data.js: this is loaded as a classic
   <script> (no type="module"), so top-level `function` declarations
   are automatically global — but top-level `let`/`const` are NOT
   shared across separate <script> tags. Every binding below that other
   files (teacher.js's rendering code, js/weeks/*.js) still read or
   reassign directly is declared with `var` for that reason — this
   mirrors how js/weeks/*.js already shares WEEKLY_PLAN/
   ACTIVITY_COMPETENCIES with teacher.js today.
   ========================================================================= */

// Auto-detects which week we're actually in from the real calendar
// date, instead of always defaulting to Week 1 — same principle as My
// Day's Mon-Fri auto-detect. WEEKS (js/weeks/weeks-core.js, loaded
// before this file) gives each week's real Mon-Fri date range as text
// (e.g. "15–19 Jun 2026", or "29 Jun–3 Jul 2026" when a week crosses a
// month boundary) — parsed here into each week's real start date.
//
// Rule: use the LATEST week whose Monday has already occurred (i.e.
// start date <= today). This naturally covers weekends within a week
// (Saturday still belongs to the week that started that Monday) and
// both edges of the term: before Week 1 starts, or after the last
// week defined here, it just stays clamped to the nearest real week
// rather than guessing one that doesn't exist.
var MONTH_ABBR_TO_INDEX = {
  Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5,
  Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11
};

function parseWeekStartDate(datesStr){
  const parts = datesStr.split('–').map(s => s.trim());
  const rightTokens = parts[1].split(/\s+/); // e.g. ["19","Jun","2026"] or ["3","Jul","2026"]
  const year = parseInt(rightTokens[rightTokens.length - 1], 10);
  const rightMonth = rightTokens[rightTokens.length - 2];
  const leftTokens = parts[0].split(/\s+/); // e.g. ["15"] (same month as right) or ["29","Jun"] (crosses months)
  const startDay = parseInt(leftTokens[0], 10);
  const startMonth = leftTokens.length > 1 ? leftTokens[1] : rightMonth;
  return new Date(year, MONTH_ABBR_TO_INDEX[startMonth], startDay);
}

function computeCurrentWeekNumFromDate(){
  if(typeof WEEKS === 'undefined' || !WEEKS.length) return 1; // weeks-core.js hasn't loaded yet — safe fallback
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let chosen = WEEKS[0].w;
  WEEKS.forEach(w => {
    if(parseWeekStartDate(w.dates) <= today) chosen = w.w;
  });
  return chosen;
}

// These got lost in the original main.js/teacher.js split — every
// curriculum function below (and i18n.js) depends on them existing.
// Reassigned elsewhere (currentDay by the day-picker in Weekly
// Activities; currentWeekNum by the week picker) — hence var, not let.
var currentWeekNum = computeCurrentWeekNumFromDate();
var currentDay = 'mon';

var DAYS = [
  {key:'mon', label:'Monday'},
  {key:'tue', label:'Tuesday'},
  {key:'wed', label:'Wednesday'},
  {key:'thu', label:'Thursday'},
  {key:'fri', label:'Friday'}
];

var DOMAINS = [
  {key:'welcome',  label:'Welcome & Free Play',   time:'9:00–9:20 AM',   cg:'CG-4',    h5p:true},
  {key:'story',    label:'Story / Rhyme',          time:'9:20–9:45 AM',   cg:'CG-9',    h5p:true},
  {key:'numeracy', label:'Numeracy',                time:'9:45–10:15 AM',  cg:'CG-8',    h5p:true},
  {key:'language', label:'Language',                time:'10:25–10:50 AM', cg:'CG-10',   h5p:true},
  {key:'create',   label:'Create + Fine Motor',     time:'10:50–11:20 AM', cg:'CG-12',   h5p:true},
  {key:'outdoor',  label:'Outdoor / Gross Motor',   time:'11:20–11:40 AM', cg:'CG-3',    h5p:true},
  {key:'tidy',     label:'Tidy & Put Away',          time:'11:40–11:45 AM', cg:'CG-11',   h5p:true},
  {key:'reflect',  label:'Reflect & Wrap',          time:'11:45 AM–12:00 PM', cg:'CG-9/10', h5p:true}
];

// -----------------------------------------------------------------
// DATABASE POCKET — this small lookup is genuinely tiny (a few
// dozen short text rows even at full scale), so storage size was
// never the deciding factor for where it lives. It's kept here as
// hardcoded frontend data for now since we're doing frontend-only
// work right now — but this maps 1:1 onto the `curricular_goals`
// table already designed in the schema, and should move there once
// the backend for this page gets built, so it can be edited/
// translated without redeploying code.
//   Real call would look like:
//     fetch('backend/get_curricular_goals.php')
// -----------------------------------------------------------------
var CG_LABELS = {
  'CG-3':    'Physical & Motor — builds strength, balance and coordination',
  'CG-4':    'Physical & Motor — builds habits that keep them healthy and safe',
  'CG-8':    'Cognitive — builds mathematical understanding using quantities and shapes',
  'CG-9':    'Socio-Emotional — builds emotional intelligence and social awareness',
  'CG-10':   'Language — builds effective communication in two languages',
  'CG-11':   'Life Skills — builds responsibility and care for shared spaces',
  'CG-12':   'Creative & Aesthetic — expresses emotions through visual and performing arts',
  'CG-9/10': 'Socio-Emotional & Language — reflects on the day and communicates learning'
};

function broadCompetencyFallback(domainKey){
  const dom = DOMAINS.find(d => d.key === domainKey);
  if(!dom || !dom.cg) return 'Not mapped yet';
  return CG_LABELS[dom.cg] || 'Not mapped yet';
}

// -----------------------------------------------------------------
// Reads the current UI language from i18n.js's global `currentLang`
// (loaded before this file — see index.html). A day's value can be
// either a plain string (older/untranslated content — shown as-is
// regardless of selected language) or an {en, hi, mr} object (fully
// translated content — returns whichever language is selected,
// falling back to English if that specific language is missing).
// -----------------------------------------------------------------
function pickLang(value){
  // Defensive: falls back to English if i18n.js hasn't loaded (e.g.
  // its file is missing on the server) rather than throwing and
  // breaking the whole dashboard over a language-switcher problem.
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'en';
  if(typeof value === 'string') return value;
  if(value && typeof value === 'object'){
    return value[lang] || value.en || Object.values(value)[0] || 'Not available';
  }
  return 'Not available';
}

// The language switcher ONLY affects the interactive H5P activities —
// nothing else. "Planned activity" and "Covers" text always stays
// English, regardless of which language tab is selected.
function alwaysEnglish(value){
  if(typeof value === 'string') return value;
  if(value && typeof value === 'object') return value.en || Object.values(value)[0] || 'Not available';
  return 'Not available';
}

function competencyFor(domainKey){
  const wk = ACTIVITY_COMPETENCIES[currentWeekKey()];
  if(wk && wk[domainKey] && wk[domainKey][currentDay] !== undefined){
    return pickLang(wk[domainKey][currentDay]);
  }
  // No activity-specific competency authored for this week yet —
  // fall back to the broad domain-level label rather than showing nothing.
  return broadCompetencyFallback(domainKey);
}


function currentWeekKey(){ return 'wk' + currentWeekNum; }

function todaysActivity(domainKey){
  const wk = WEEKLY_PLAN[currentWeekKey()];
  if(!wk || !wk[domainKey] || wk[domainKey][currentDay] === undefined) return 'Not planned yet';
  return pickLang(wk[domainKey][currentDay]);
}

// Called by i18n.js's applyTranslations() whenever the language
// switches, so activity text on-screen updates immediately instead
// of only changing after the next click/re-render.
function onLanguageChanged(){
  if(typeof renderSidebar === 'function') renderSidebar();
  if(typeof renderWeekBody === 'function' && document.getElementById('week-body') && !document.getElementById('week-body').classList.contains('hidden')){
    renderWeekBody();
  }
}

var SAMPLE_STUDENTS = ['Arjun Shinde','Vedant Rane','Rudra Sharma','Aditi Patil','Soham Rane'];

// Admissions can grow the roster beyond the original 5 sample names
// (see submitAdmissionForm in teacher.js) — SAMPLE_STUDENTS stays a
// `var` binding, but the array it points to is still mutable via
// push(), so every screen already reading SAMPLE_STUDENTS (attendance,
// assessments, family, etc.) picks up a newly admitted child for
// free, without needing its own separate roster. Persisted here,
// right after the array exists, so the roster is complete before
// anything else reads its length.
(function loadExtraAdmittedStudents(){
  try {
    const raw = localStorage.getItem('extraAdmittedStudents');
    if(raw) JSON.parse(raw).forEach(n => { if(!SAMPLE_STUDENTS.includes(n)) SAMPLE_STUDENTS.push(n); });
  } catch(e){ /* malformed or unavailable — roster stays at the original 5 */ }
})();

var RATING_LEVELS = ['Emerging','Progressing','Achieving','Exceeding'];
/* =========================================================
   TEACHER'S OWN ATTENDANCE — gated at HER class's actual start
   time, not a fixed clock time for everyone. A teacher whose
   class runs 9:30–12:30 gets gated at 9:30; one whose class
   runs 1:00–4:00 gets gated at 1:00.

   If a teacher owns two classes (e.g. Jr KG + Sr KG) with
   different start times, the gate uses the EARLIER of the two
   — she should have marked her own attendance by the time her
   first session of the day begins.

   DATABASE POCKET — until the real backend call exists, this
   falls back to a placeholder. Once connected, replace with:
     const res = await fetch('backend/get_my_classes.php');
     const classes = await res.json();
     const startTimes = classes.map(c => c.start_time); // "09:30:00" etc.
     gateHour/gateMinute = the earliest one, parsed
   ========================================================= */

var ATTENDANCE_GATE_HOUR = 9;    // PLACEHOLDER — replace with the teacher's real class start time
var ATTENDANCE_GATE_MINUTE = 30; // PLACEHOLDER — same