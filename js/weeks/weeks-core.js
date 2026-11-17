/* =========================================================
   WEEKS CORE — shared containers and the master list of every
   week (theme, dates). This file must load FIRST, before any
   individual week file (week1.js, week2.js, ...), since those
   files ADD to these objects rather than declaring their own.

   Adding a new week now means:
     1. Create js/weeks/weekN.js (copy week1.js as a template)
     2. Add its <script> tag in index.html, after this file
   No changes needed in main.js for a new week's plain content —
   only its own interactive activities need designing there.
   ========================================================= */

const WEEKLY_PLAN = {};
const ACTIVITY_COMPETENCIES = {};
const weeksWithContent = [];

// Per-week sidebar day topics — separate from WEEKLY_PLAN (which
// holds each domain's activity text). This is the short "value"
// and "link" shown in the sidebar's day checklist.
const WEEK_DAY_TOPICS = {};

// The actual interactive H5P-style activities (match-pairs,
// complete-sentence, tap-explore, etc.) — see main.js's generic
// renderers for what "type" values are supported. Each week file
// fills in INTERACTIVE_ACTIVITIES.wkN with its own 30 activities
// (6 domains × 5 days).
const INTERACTIVE_ACTIVITIES = {};

const WEEKS = [
  {w:1, theme:'My Classroom', dates:'15–19 Jun 2026'},
  {w:2, theme:'My Body and Senses', dates:'22–26 Jun 2026'},
  {w:3, theme:'Emotions and Feelings', dates:'29 Jun–3 Jul 2026'},
  {w:4, theme:'My Family', dates:'6–10 Jul 2026'},
  {w:5, theme:'Fruits & Vegetables', dates:'13–17 Jul 2026'},
  {w:6, theme:'Habits, Hygiene & Health', dates:'20–24 Jul 2026'},
  {w:7, theme:'Nature Patterns', dates:'27–31 Jul 2026'},
  {w:8, theme:'Beads, Jewellery & Rangoli Patterns', dates:'3–7 Aug 2026'},
  {w:9, theme:'Number, Sound & Movement Patterns', dates:'10–14 Aug 2026'},
  {w:10, theme:'Counting Classroom Items', dates:'17–21 Aug 2026'},
  {w:11, theme:'Plants, Seeds & Flowers', dates:'24–28 Aug 2026'},
  {w:12, theme:'Counting with Sticks', dates:'31 Aug–4 Sep 2026'},
  {w:13, theme:'Number Line Walk', dates:'7–11 Sep 2026'},
  {w:14, theme:'Group Counting', dates:'14–18 Sep 2026'},
  {w:15, theme:'Number Line / Cards & Group Counting', dates:'21–25 Sep 2026'},
  {w:16, theme:'Numbers in Stories (Train Bogies, Treasure Hunt & Number Neighbours)', dates:'28 Sep–2 Oct 2026'},
  {w:17, theme:'Numeral, Quantity & Place Value', dates:'5–9 Oct 2026'},
  {w:18, theme:'Adding Snacks & Toy Shop Addition (Real-Life Contexts)', dates:'12–16 Oct 2026'},
  {w:19, theme:"Adding, Subtraction, Taking Away & Bus Stop Maths", dates:"19 Oct–25 Oct 2026"},
  {w:20, theme:"Shapes - Around Us & Hunt", dates:"26 Oct–01 Nov 2026"},
  {w:21, theme:"Making Shape & Building with Blocks", dates:"02 Nov–08 Nov 2026"},
  {w:22, theme:"Measuring - Length & Weight", dates:"09 Nov–15 Nov 2026"},
  {w:23, theme:"MEASURING - capacity, time & calender", dates:"16 Nov–22 Nov 2026"},
  {w:24, theme:"Money & Mini Market", dates:"23 Nov–29 Nov 2026"},
  {w:25, theme:"Neighbours & Transport (Community, road safety, shops, vehicles)", dates:"30 Nov–06 Dec 2026"},
  {w:26, theme:"Community Helpers", dates:"07 Dec–13 Dec 2026"},
  {w:27, theme:"Nature Exploration & Wild Animals", dates:"14 Dec–20 Dec 2026"},
  {w:28, theme:"Birds & Animals and Offsprings", dates:"21 Dec–27 Dec 2026"},
  {w:29, theme:"Water & Ocean Life", dates:"28 Dec–03 Jan 2027"},
  {w:30, theme:"Lights, Shadow and Sciences", dates:"04 Jan–10 Jan 2027"},
  {w:31, theme:"Objects, Tools & its uses", dates:"11 Jan–17 Jan 2027"},
  {w:32, theme:"Spatial Position & Scavenger Hunt", dates:"18 Jan–24 Jan 2027"},
  {w:33, theme:"Thinking Skills - Odd One Out & Riddles", dates:"25 Jan–31 Jan 2027"},
  {w:34, theme:"Colours, Sounds & Music", dates:"01 Feb–07 Feb 2027"},
  {w:35, theme:"Celebrations, Culture & Festivals", dates:"08 Feb–14 Feb 2027"},
  {w:36, theme:"Growing Up - Looking Back and Forward", dates:"15 Feb–21 Feb 2027"},
];