/* =========================================================================
   js/supervisor/weekly-checklist-data.js — the real Weekly Compliance
   Checklist: 8 sections (A-H), 91 items total, transcribed exactly from
   "Aarambh Supervision Compliance Sheet" → sheet "1. WEEKLY". Each item
   carries both the real compliance parameter text and the real
   "Evidence to See / How to Verify" guidance shown to the supervisor.

   Kept as its own data file (not inline in checklist.js) since 91 real
   items is substantial on its own — separating it keeps checklist.js
   itself focused on rendering/state, and keeps both files well under
   the 500-line cap.

   Same cross-file-sharing rule as the teacher dashboard's split files:
   classic <script>, so `var` here is what makes WEEKLY_CATEGORIES
   readable from checklist.js.
   ========================================================================= */

var WEEKLY_CATEGORIES = [
  { key: 'A', label: 'LESSON PLAN & CURRICULUM IMPLEMENTATION', items: [
    { text: 'Weekly lesson plan is physically available in the classroom.', evidence: 'Ask to see the weekly plan file / teacher diary.' },
    { text: "Today's activity matches the weekly plan for this date.", evidence: 'Compare plan entry against the activity in progress.' },
    { text: 'Monthly theme is being followed in activities and display.', evidence: 'Match theme with wall display and TLM in use.' },
    { text: 'Daily activity plan for the day is written and dated.', evidence: 'Daily activity register / diary.' },
    { text: 'Panchpadi steps (Adheeti, Bodh, Abhyas, Prayog, Prasar) are visible in delivery.', evidence: 'Observe the 20-minute activity flow.' },
    { text: 'Language, numeracy, motor, socio-emotional, creative and life-skill domains covered this week.', evidence: 'Weekly plan domain column.' },
    { text: 'Play-way / activity-based method used — not rote or teacher-centred.', evidence: 'Direct classroom observation.' },
    { text: 'Activities are age-appropriate for Jr KG / Sr KG separately.', evidence: 'Compare with Aadharshila competency list.' },
    { text: 'Panchakosha linkage (Annamaya, Pranamaya, Manomaya, Vijnanamaya, Anandamaya) is evident.', evidence: "Ask teacher to map today's activity." },
    { text: 'One IKS / festival / seasonal element included this week.', evidence: 'Plan entry + display + teacher explanation.' },
    { text: 'Worksheets / workbooks completed appropriately and up to date.', evidence: "Sample 5 children's books at random." },
    { text: "Children's work is checked and corrected by the teacher.", evidence: 'Look for teacher marks / remarks.' },
    { text: 'Class is progressing at an appropriate pace (not lagging or rushing).', evidence: 'Compare completed pages against week number.' },
    { text: 'Home-learning / parent activity (Prasar) given for the week.', evidence: 'Home activity slip / diary note.' },
    { text: 'Teacher supports shy, slow and irregular learners during the activity.', evidence: 'Observe named children.' }
  ]},
  { key: 'B', label: 'CLASSROOM ENVIRONMENT, CLEANLINESS & CHILD SAFETY', items: [
    { text: 'Classroom floor, mats, tables and furniture are clean.', evidence: 'Visual check on arrival.' },
    { text: 'Learning corners are set up and in use.', evidence: 'Check corner-wise material.' },
    { text: "Charts, flashcards and children's work displayed at children's eye level.", evidence: 'Measure by child height, not adult.' },
    { text: 'Learning material arranged neatly and accessible to children.', evidence: 'Open the storage cupboard / boxes.' },
    { text: "Children's bags, bottles and footwear kept properly.", evidence: 'Check entrance / rack area.' },
    { text: 'Safe and clean drinking water available.', evidence: 'See the water source and container.' },
    { text: 'Toilets clean, usable and child-accessible; routine managed.', evidence: 'Physically inspect the toilet.' },
    { text: 'Handwashing practice followed before/after food and toilet.', evidence: 'Observe during routine; check soap availability.' },
    { text: 'Dustbin present and waste disposed of properly.', evidence: 'Visual check.' },
    { text: 'General personal hygiene of children (nails, hair, clothes) is monitored.', evidence: 'Observe and ask teacher about follow-up.' },
    { text: "NO unsafe object within children's reach (sharp items, wires, chemicals, broken furniture).", evidence: 'Walk the full perimeter of the room.' },
    { text: 'No visible safety hazard in or around the classroom / passage / stairs.', evidence: 'Check approach route too.' },
    { text: 'Children are never left unattended at any point.', evidence: 'Observe the whole visit duration.' },
    { text: 'Classroom is child-friendly, attractive and adequately lit and ventilated.', evidence: 'Overall visual judgement.' },
    { text: 'Children are seated comfortably and all can see and hear the teacher.', evidence: 'Sit at the back of the room and check.' },
    { text: 'Fire / emergency exit route is clear.', evidence: 'Check obstruction of the doorway.' }
  ]},
  { key: 'C', label: 'TEACHER OBSERVATION', items: [
    { text: 'Teacher present on time and for the complete shift.', evidence: 'Biometric / app attendance + physical check.' },
    { text: 'Teacher is prepared — TLM and material ready before the activity.', evidence: 'Observe start of session.' },
    { text: 'Class started on time as per the daily routine.', evidence: 'Note actual start time.' },
    { text: 'Circle time / prayer / rhymes / planned opening activity conducted.', evidence: 'Observe the opening 10 minutes.' },
    { text: 'Teacher speaks politely and uses positive, encouraging language.', evidence: 'Listen to actual words used.' },
    { text: 'Teacher uses songs, stories, actions, real objects and examples.', evidence: 'Count methods used in one activity.' },
    { text: 'Teacher gives clear, simple, one-step instructions.', evidence: "Observe children's ability to follow." },
    { text: 'Teacher gives equal participation opportunity to every child.', evidence: 'Track who is called on.' },
    { text: 'Teacher supports children in their home language where needed.', evidence: 'Observe language switching.' },
    { text: 'Teacher encourages instead of scolding; no shouting, humiliation or harsh punishment.', evidence: 'Zero tolerance — rate 1 and escalate if seen.' },
    { text: 'Attendance register and records maintained daily and updated.', evidence: 'Physically open the register.' },
    { text: 'Observation / assessment records maintained per child.', evidence: "Sample 5 children's observation entries." },
    { text: 'Teacher diary / lesson notes updated to date.', evidence: 'Check last dated entry.' },
    { text: 'Teacher communicates properly with the helper.', evidence: 'Observe coordination during activity.' },
    { text: 'Teacher in prescribed dress with official ID card signed by the Principal, worn daily.', evidence: 'Visual check.' },
    { text: 'Teacher shares child progress with parents when needed.', evidence: 'Ask for recent examples.' }
  ]},
  { key: 'D', label: 'HELPER OBSERVATION', items: [
    { text: 'Helper present on time.', evidence: 'Attendance record + physical check.' },
    { text: 'Helper supports the teacher during activities.', evidence: 'Observe the activity.' },
    { text: 'Helper helps children sit, settle and participate.', evidence: 'Observe transitions.' },
    { text: 'Helper supports cleanliness and hygiene of the classroom.', evidence: 'Observe before/after session.' },
    { text: 'Helper assists children during toilet, water and food time.', evidence: 'Observe the routine.' },
    { text: 'Helper handles children with care, patience and no rough handling.', evidence: 'Direct observation — escalate if breached.' },
    { text: 'Helper keeps materials ready and arranged.', evidence: 'Check material readiness.' },
    { text: 'Helper supports weak, small or crying children when needed.', evidence: 'Observe response to a distressed child.' },
    { text: 'Helper maintains classroom routine.', evidence: "Observe the day's flow." },
    { text: 'Helper works respectfully with the teacher.', evidence: 'Observe interaction.' },
    { text: 'Helper wears ID card and is in prescribed dress.', evidence: 'Visual check.' }
  ]},
  { key: 'E', label: 'TEACHER–HELPER BONDING & TEAMWORK', items: [
    { text: 'Teacher and helper work as a team.', evidence: 'Observe division of work.' },
    { text: 'Both communicate respectfully with each other.', evidence: 'Listen to tone.' },
    { text: "Helper understands and follows the teacher's instructions.", evidence: 'Observe instruction–response.' },
    { text: 'Both manage the children together during transitions.', evidence: 'Observe toilet / water / dispersal time.' },
    { text: 'No argument or negative behaviour seen in front of children.', evidence: 'Direct observation.' },
    { text: 'Both support children with love and care.', evidence: 'Direct observation.' },
    { text: 'Class routine runs smoothly because of good coordination.', evidence: 'Overall judgement.' }
  ]},
  { key: 'F', label: 'CHILD OBSERVATION & ENGAGEMENT', items: [
    { text: 'Children are happy, comfortable and settled in class.', evidence: 'Observe faces and body language.' },
    { text: 'Children are actively participating in activities.', evidence: 'Estimate % of children engaged.' },
    { text: "Children respond to the teacher's questions.", evidence: 'Count responders.' },
    { text: 'Children follow simple instructions.', evidence: 'Observe an instruction round.' },
    { text: 'Children share, play and work together.', evidence: 'Observe group activity.' },
    { text: 'Children are learning good habits (greeting, hygiene, cleaning up).', evidence: 'Observe routine behaviour.' },
    { text: 'Children show no fear of the teacher or the helper.', evidence: 'Observe approach behaviour.' },
    { text: 'Opportunity for movement, play or gross-motor activity is provided.', evidence: 'Was a movement slot conducted?' },
    { text: 'Children are allowed to touch, explore and use learning material themselves.', evidence: 'Observe material handling.' },
    { text: 'Children speak / express freely in their home language.', evidence: 'Listen to child talk.' }
  ]},
  { key: 'G', label: 'TLM, BOOKS, STATIONERY & MATERIAL', items: [
    { text: 'TLM is actually being USED in the activity, not merely stored.', evidence: 'Observe use, then open storage.' },
    { text: "Theme-related TLM available for the current week's theme.", evidence: 'Match theme with TLM present.' },
    { text: 'Picture cards, flashcards, storybooks and activity material present and in good condition.', evidence: 'Physical count / condition check.' },
    { text: 'Children have access to required books and workbooks.', evidence: "Sample children's sets." },
    { text: 'Crayons, pencils, slates and stationery available and in use.', evidence: 'Physical check.' },
    { text: 'Material stored properly and safely; no damage or loss.', evidence: 'Open the storage.' },
    { text: 'Stock / issue register updated where applicable.', evidence: 'Open the register and match a sample.' },
    { text: 'No unnecessary wastage or hoarding of material.', evidence: 'Compare issued vs used.' },
    { text: 'Handmade / low-cost TLM prepared by the teacher is in use.', evidence: 'Ask for teacher-made TLM.' },
    { text: 'Any material shortage recorded and requisition raised.', evidence: 'Check requisition note.' }
  ]},
  { key: 'H', label: 'ATTENDANCE — PHYSICAL VERIFICATION', items: [
    { text: 'Physical head count taken by the supervisor and compared with the register.', evidence: 'Fill the Attendance Verification sheet.' },
    { text: 'Attendance register updated daily, not filled in retrospectively.', evidence: 'Check handwriting / ink / dates.' },
    { text: 'Children absent for 3 or more consecutive days identified.', evidence: 'Scan register for absentee patterns.' },
    { text: 'Parents of absentees contacted and the contact recorded.', evidence: 'Ask for the follow-up note.' },
    { text: 'Absentee follow-up entered in the monthly summary / dashboard.', evidence: 'Check the digital upload.' },
    { text: 'Teacher punctuality and full-shift presence verified.', evidence: 'Compare time in / time out.' }
  ]}
];

// Real rating scale (Visit Cover, Section 3) — replaces the old
// good/bad/na 3-option scale entirely. "Rate on evidence observed, not
// on teacher cooperation" per the sheet's own instruction.
var RATING_SCALE = [
  { value: 4, label: 'Very Good', color: 'good' },
  { value: 3, label: 'Satisfactory', color: 'good' },
  { value: 2, label: 'Needs Improvement', color: 'warn' },
  { value: 1, label: 'Urgent Action', color: 'crit' },
  { value: 'NA', label: 'N/A', color: 'neu' }
];

// The Tick and Rating are genuinely two separate columns on the real
// sheet (quick compliant/non-compliant tick during observation, then a
// more nuanced 4-point rating) — kept as two separate inputs here
// rather than collapsed into one, to match the real form exactly.
var TICK_OPTIONS = [
  { value: '✔', label: 'Compliant', color: 'good' },
  { value: '✘', label: 'Non-Compliant', color: 'crit' },
  { value: 'NA', label: 'N/A', color: 'neu' }
];