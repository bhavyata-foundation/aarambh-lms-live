/* =========================================================================
   js/hpc-master.js — the HPC competency master and formulas (one source for every report)
   -------------------------------------------------------------------------
   Used by the Assessment Dashboard reports (Holistic Progress Card per child,
   class / school report). Every number is calculated here, the same way
   everywhere.

   DATA (window.HPC)
     domains       D1 Physical & Motor … D6 Creative–Aesthetic
     koshas        K1 Annamaya–Pranamaya (CG-1,2,3) … K5 Anandamaya (CG-12,13 + values)
     cgs           CG-1 … CG-13: short name, the full NCF goal, its kosha
     params        the 19 HPC parameters (essential combinations) PM1 … CA4:
                   domain, focus, CG alignment, and the recommendations for
                   Needs Intervention / Developing / Strong-Very Strong
     competencies  C-1.1 … C-13.4 (+ V-1 … V-4 values): CG, parameter, wording
     remarks       the remark for each band

   SOURCES  the team's NCF-FS framework document (Oct 2026) — the 13 CGs, the
   competencies and the six domains' HPC tables; the HPC_BPA_Domain_Analysis
   workbook — formulas, bands, koshas, recommendations, remarks. Where the two
   differ, the document wins and the entry says so ("note"):
     C-8.7  → CD2 (arithmetic is Number Sense & Operations; workbook had CD3)
     C-10.4, C-10.5 → LC2 (reading in L1; workbook had LC3)
     C-8.13 → CD2 (chosen by the team)
     C-3.5  kept under PM3 (workbook only) so saved marks are not lost

   FORMULAS (HPC workbook, Formula_Sheet) — see the functions below
     score = 1×%B + 2×%P + 3×%A (100–300) · band ≥250 Very Strong · 200–249 Strong ·
     150–199 Developing · <150 Needs Intervention · level A ≥250, P ≥150, else B ·
     readiness (P+A)% ≥80 Ready, 60–79 Nearly Ready · B→P/A conversion, P→A
     advancement, movement (paired) · (P+A)/B ratio · normalised gain (T−P)/(300−P) ·
     achieved = ≥70% of children at P/A · CPI = mean of the 6 domain scores ·
     learning gap: Beginner >40% (20–40% watch)
   ========================================================================= */
(function(){
  'use strict';
  const D = {
  "domains": {
    "D1": {"name": "Physical & Motor Development", "short": "Physical & Motor"},
    "D2": {"name": "Language & Communication", "short": "Language & Comm."},
    "D3": {"name": "Cognitive Development", "short": "Cognitive"},
    "D4": {"name": "Moral, Cultural & Environmental", "short": "Moral-Cultural-Env."},
    "D5": {"name": "Socio-Emotional Development", "short": "Socio-Emotional"},
    "D6": {"name": "Creative–Aesthetic Development", "short": "Creative-Aesthetic"}
  },
  "koshas": {
    "K1": {"name": "Annamaya–Pranamaya Kosha", "short": "Annamaya–Pranamaya", "cgs": "CG-1, 2, 3", "focus": "Physical body, energy & health"},
    "K2": {"name": "Manomaya Kosha – Socio-emotional", "short": "Manomaya (Emotional)", "cgs": "CG-4, 5, 6", "focus": "Mind & emotions, social values"},
    "K3": {"name": "Vigyanamaya Kosha", "short": "Vigyanamaya", "cgs": "CG-7, 8", "focus": "Intellect, reasoning, numeracy & cognition"},
    "K4": {"name": "Manomaya Kosha – Language", "short": "Manomaya (Language)", "cgs": "CG-9, 10, 11", "focus": "Mind expressed through language"},
    "K5": {"name": "Anandamaya Kosha", "short": "Anandamaya", "cgs": "CG-12, 13 (+ values)", "focus": "Values, creativity & inner joy"}
  },
  "cgs": {
    "CG-1": {"name": "Healthy & Safe Habits", "goal": "Children develop habits that keep them healthy and safe", "kosha": "K1"},
    "CG-2": {"name": "Sensorial Development", "goal": "Children develop sharpness in sensorial perceptions", "kosha": "K1"},
    "CG-3": {"name": "Physical Fitness & Fine Motor Skills", "goal": "Children develop a fit and flexible body", "kosha": "K1"},
    "CG-4": {"name": "Emotional Intelligence", "goal": "Children develop emotional intelligence, i.e., the ability to understand and manage their own emotions, and respond positively to social norms", "kosha": "K2"},
    "CG-5": {"name": "Productive Work & Seva", "goal": "Children develop a positive attitude towards productive work and service or 'Seva'", "kosha": "K2"},
    "CG-6": {"name": "Care for Nature", "goal": "Children develop a positive regard for the natural environment around them", "kosha": "K2"},
    "CG-7": {"name": "Observations & Logical Thinking", "goal": "Children make sense of the world around them through observation and logical thinking", "kosha": "K3"},
    "CG-8": {"name": "Mathematical Understanding", "goal": "Children develop mathematical understanding and abilities to recognize the world through quantities, shapes, and measures", "kosha": "K3"},
    "CG-9": {"name": "Communication in Two Languages", "goal": "Children develop effective communication skills for day-to-day interactions in two languages", "kosha": "K4"},
    "CG-10": {"name": "Reading & Writing (L1)", "goal": "Children develop fluency in reading and writing in Language 1", "kosha": "K4"},
    "CG-11": {"name": "Beginning Reading & Writing (L2)", "goal": "Children begin to read and write in Language 2", "kosha": "K4"},
    "CG-12": {"name": "Visual & Performing Arts", "goal": "Children develop abilities and sensibilities in visual and performing arts and express their emotions through art in meaningful and joyful ways", "kosha": "K5"},
    "CG-13": {"name": "Curiosity, Attention, Adaptability & Positive Learning Behaviours", "goal": "Children develop habits of learning that allow them to engage actively in formal learning environments, like a school classroom", "kosha": "K5"}
  },
  "params": {
    "PM1": {"name": "Health & Safety Habits", "short": "Health & Safety", "domain": "D1", "focus": "Nutrition + Hygiene + Safety", "cg": "CG-1", "needs": "Daily hygiene routine with picture charts; safety role-play", "developing": "Songs & routines for hand-washing, healthy tiffin talk", "growth": "Child-led responsibility (hygiene monitor)"},
    "PM2": {"name": "Sensorial Perception", "short": "Sensorial", "domain": "D1", "focus": "Visual, Auditory, Tactile Integration", "cg": "CG-2", "needs": "Sensory trays; sound/smell/texture matching", "developing": "Daily 10-min sensory discrimination games", "growth": "Multi-attribute sorting & sensory memory games"},
    "PM3": {"name": "Motor Coordination & Fitness", "short": "Motor & Fitness", "domain": "D1", "focus": "Gross + Fine Motor + Endurance", "cg": "CG-3", "needs": "Daily gross-motor circuit; fine-motor (beading, clay, tearing)", "developing": "Structured outdoor play; hand–eye games", "growth": "Team games; advanced balance challenges"},
    "LC1": {"name": "Oral Communication & Expression", "short": "Oral Communication", "domain": "D2", "focus": "Listening + Speaking + Vocabulary (Bilingual)", "cg": "CG-9", "needs": "Picture talk, rhymes, storytelling in small groups", "developing": "Daily conversation circle & read-aloud", "growth": "Retelling, role-play, show-and-tell"},
    "LC2": {"name": "Reading Fluency & Comprehension", "short": "Reading (L1)", "domain": "D2", "focus": "Structured Literacy in L1", "cg": "CG-10", "needs": "Phonics & letter-sound games; guided reading", "developing": "Shared reading; word-building practice", "growth": "Independent picture-book reading"},
    "LC3": {"name": "Writing & Emerging L2 Literacy", "short": "Writing & L2", "domain": "D2", "focus": "Paragraph Writing + L2 Reading/Writing", "cg": "CG-10 & CG-11", "needs": "Tracing, sand writing, copying words", "developing": "Sentence writing with picture prompts; L2 word cards", "growth": "Journals / short paragraph writing"},
    "CD1": {"name": "Observation & Logical Inquiry", "short": "Logical Inquiry", "domain": "D3", "focus": "Classification + Cause–Effect + Tool Use", "cg": "CG-7", "needs": "Sorting, cause–effect games with real objects", "developing": "Puzzles; 'what happens next' sequencing", "growth": "Open-ended investigations"},
    "CD2": {"name": "Number Sense & Operations", "short": "Number Sense", "domain": "D3", "focus": "Counting + Place Value + Arithmetic + Money", "cg": "CG-8 (Core Numerical)", "needs": "Manipulatives (counters, beads), daily counting routines", "developing": "Number cards, shop-play with money, practice & repetition", "growth": "Story sums & estimation games"},
    "CD3": {"name": "Patterns, Measurement & Spatial Sense", "short": "Patterns & Measurement", "domain": "D3", "focus": "Shapes + Patterns + Measurement + Vocabulary", "cg": "CG-8 (Structural Math)", "needs": "Shape hunts, pattern beads, measuring with hand-spans", "developing": "Pattern extension & comparison games", "growth": "Create own patterns; non-standard → standard measures"},
    "ME1": {"name": "Environmental Sensitivity", "short": "Environment", "domain": "D4", "focus": "Care for life forms & surroundings", "cg": "CG-6 (C-6.1)", "needs": "Nature walks, plant & pet care tasks", "developing": "Weekly experiential EVS activity", "growth": "Eco-club mini projects"},
    "ME2": {"name": "Cultural Rootedness", "short": "Culture", "domain": "D4", "focus": "Knowledge of festivals & traditions", "cg": "Integrated Value Domain", "needs": "Festival stories, songs & celebrations in class", "developing": "Family/community sharing of traditions", "growth": "Child-led festival presentations"},
    "ME3": {"name": "Moral Character Formation", "short": "Moral Values", "domain": "D4", "focus": "Honesty, gratitude, integrity", "cg": "Value Education", "needs": "Value stories & puppet shows; praise honest acts", "developing": "Gratitude circle; class value charter", "growth": "Value ambassadors / buddy mentoring"},
    "SE1": {"name": "Self & Emotional Awareness", "short": "Self & Emotions", "domain": "D5", "focus": "Identity + Emotion Regulation", "cg": "C-4.1, C-4.2", "needs": "Emotion cards, calm corner, 'all about me' activities", "developing": "Feelings vocabulary in circle time", "growth": "Peer support & reflection talk"},
    "SE2": {"name": "Social Interaction & Cooperation", "short": "Social Cooperation", "domain": "D5", "focus": "Peer Relations + Norm Following", "cg": "C-4.3, 4.4, 4.5, 4.7", "needs": "Buddy system; structured turn-taking games", "developing": "Group tasks with rotating roles", "growth": "Group leadership roles"},
    "SE3": {"name": "Kindness & Seva Orientation", "short": "Kindness & Seva", "domain": "D5", "focus": "Empathy + Productive Helping", "cg": "C-4.6 + CG-5 (C-5.1)", "needs": "Classroom helper rota; kindness stories", "developing": "Collaborative clean-up & helping tasks", "growth": "Small service projects"},
    "CA1": {"name": "Attention & Self-Regulation", "short": "Attention", "domain": "D6", "focus": "Focus + Planning + Mental Flexibility", "cg": "C-13.1, C-13.2", "needs": "Short focused tasks with visual timers", "developing": "Plan-do-review routine", "growth": "Multi-step independent tasks"},
    "CA2": {"name": "Curiosity & Creative Exploration", "short": "Curiosity", "domain": "D6", "focus": "Observation + Inquiry + Imagination", "cg": "C-13.3", "needs": "Wonder questions, discovery table", "developing": "Open-ended play materials", "growth": "Child-led inquiry projects"},
    "CA3": {"name": "Classroom Responsibility", "short": "Responsibility", "domain": "D6", "focus": "Norm Following + Agency + Discipline", "cg": "C-13.4", "needs": "Visual class rules & picture routines; positive reinforcement", "developing": "Classroom jobs with self-check", "growth": "Class monitor / leadership roles"},
    "CA4": {"name": "Visual & Performing Arts", "short": "Arts", "domain": "D6", "focus": "Art + Music + Movement + Drama", "cg": "CG-12 (added – not in source table)", "needs": "Free drawing, music & movement daily", "developing": "Theme-based art and rhythm activities", "growth": "Showcase / performance opportunities"}
  },
  "competencies": {
    "C-1.1": {"cg": "CG-1", "ec": "PM1", "text": "Shows a liking for and understanding of nutritious food and does not waste food"},
    "C-1.2": {"cg": "CG-1", "ec": "PM1", "text": "Practices basic self-care and hygiene"},
    "C-1.3": {"cg": "CG-1", "ec": "PM1", "text": "Keeps the school/classroom hygienic and organised"},
    "C-1.4": {"cg": "CG-1", "ec": "PM1", "text": "Practices safe use of material and simple tools"},
    "C-1.5": {"cg": "CG-1", "ec": "PM1", "text": "Shows awareness of safety in movements (walking, running, cycling) and acts appropriately"},
    "C-1.6": {"cg": "CG-1", "ec": "PM1", "text": "Understands unsafe situations and asks for help"},
    "C-2.1": {"cg": "CG-2", "ec": "PM2", "text": "Differentiates between shapes, colours, and their shades"},
    "C-2.2": {"cg": "CG-2", "ec": "PM2", "text": "Develops visual memory for symbols and representations"},
    "C-2.3": {"cg": "CG-2", "ec": "PM2", "text": "Differentiates sounds and sound patterns by their pitch, volume, and tempo"},
    "C-2.4": {"cg": "CG-2", "ec": "PM2", "text": "Differentiates multiple smells and tastes"},
    "C-2.5": {"cg": "CG-2", "ec": "PM2", "text": "Develops discrimination in the sense of touch"},
    "C-2.6": {"cg": "CG-2", "ec": "PM2", "text": "Begins integrating sensorial perceptions to get a holistic awareness of their experiences"},
    "C-3.1": {"cg": "CG-3", "ec": "PM3", "text": "Shows coordination between sensorial perceptions and body movements in various activities"},
    "C-3.2": {"cg": "CG-3", "ec": "PM3", "text": "Shows balance, coordination, and flexibility in various physical activities"},
    "C-3.3": {"cg": "CG-3", "ec": "PM3", "text": "Shows precision and control in working with their hands and fingers"},
    "C-3.4": {"cg": "CG-3", "ec": "PM3", "text": "Shows strength and endurance in carrying, walking, and running"},
    "C-4.1": {"cg": "CG-4", "ec": "SE1", "text": "Starts recognising 'self' as an individual belonging to a family and community"},
    "C-4.2": {"cg": "CG-4", "ec": "SE1", "text": "Recognises different emotions and makes deliberate efforts to regulate them appropriately"},
    "C-4.3": {"cg": "CG-4", "ec": "SE2", "text": "Interacts comfortably with other children and adults"},
    "C-4.4": {"cg": "CG-4", "ec": "SE2", "text": "Shows cooperative behaviour with other children"},
    "C-4.5": {"cg": "CG-4", "ec": "SE2", "text": "Understands and responds positively to social norms in the classroom and school"},
    "C-4.6": {"cg": "CG-4", "ec": "SE3", "text": "Shows kindness and helpfulness to others (including animals, plants) when they are in need"},
    "C-4.7": {"cg": "CG-4", "ec": "SE2", "text": "Understands and responds positively to the different thoughts, preferences, and emotional needs of other children"},
    "C-5.1": {"cg": "CG-5", "ec": "SE3", "text": "Demonstrates willingness and participation in age-appropriate physical work towards helping others"},
    "C-6.1": {"cg": "CG-6", "ec": "ME1", "text": "Shows care for and joy in engaging with all life forms"},
    "C-7.1": {"cg": "CG-7", "ec": "CD1", "text": "Observes and understands different categories of objects and relationships between them"},
    "C-7.2": {"cg": "CG-7", "ec": "CD1", "text": "Observes and understands cause and effect relationships in nature by forming simple hypotheses and uses observations to explain their hypothesis"},
    "C-7.3": {"cg": "CG-7", "ec": "CD1", "text": "Uses appropriate tools and technology in daily life situations and for learning"},
    "C-8.1": {"cg": "CG-8", "ec": "CD3", "text": "Sorts objects into groups and sub-groups based on more than one property"},
    "C-8.2": {"cg": "CG-8", "ec": "CD3", "text": "Identifies and extends simple patterns in their surroundings, shapes, and numbers"},
    "C-8.3": {"cg": "CG-8", "ec": "CD2", "text": "Counts up to 99 both forwards and backwards and in groups of 10s and 20s"},
    "C-8.4": {"cg": "CG-8", "ec": "CD2", "text": "Arranges numbers up to 99 in ascending and descending order"},
    "C-8.5": {"cg": "CG-8", "ec": "CD2", "text": "Recognises and uses numerals to represent quantities up to 99 with an understanding of the decimal place value system"},
    "C-8.6": {"cg": "CG-8", "ec": "CD2", "text": "Performs addition and subtraction of 2-digit numbers fluently using flexible strategies of composition and decomposition"},
    "C-8.7": {"cg": "CG-8", "ec": "CD2", "text": "Recognises multiplication as repeated addition and division as equal sharing", "note": "Your framework document (arithmetic → Number Sense); the HPC workbook had CD3"},
    "C-8.8": {"cg": "CG-8", "ec": "CD3", "text": "Recognises basic geometric shapes and their observable properties"},
    "C-8.9": {"cg": "CG-8", "ec": "CD3", "text": "Performs simple measurements of length, weight and volume of objects in their immediate environment"},
    "C-8.10": {"cg": "CG-8", "ec": "CD3", "text": "Performs simple measurements of time in minutes, hours, day, weeks, and months"},
    "C-8.11": {"cg": "CG-8", "ec": "CD2", "text": "Performs simple transactions using money up to INR 100"},
    "C-8.12": {"cg": "CG-8", "ec": "CD3", "text": "Develops adequate and appropriate vocabulary for comprehending and expressing concepts and procedures related to quantities, shapes, space, and measurements"},
    "C-8.13": {"cg": "CG-8", "ec": "CD2", "text": "Formulates and solves simple mathematical problems related to quantities, shapes, space, and measurements", "note": "Chosen by the team (Oct 2026)"},
    "C-9.1": {"cg": "CG-9", "ec": "LC1", "text": "Listens to and appreciates simple songs, rhymes, and poems"},
    "C-9.2": {"cg": "CG-9", "ec": "LC1", "text": "Creates simple songs and poems on their own"},
    "C-9.3": {"cg": "CG-9", "ec": "LC1", "text": "Converses fluently and can hold a meaningful conversation"},
    "C-9.4": {"cg": "CG-9", "ec": "LC1", "text": "Understands oral instructions for a complex task and gives clear oral instructions for the same to others"},
    "C-9.5": {"cg": "CG-9", "ec": "LC1", "text": "Comprehends narrated/read-out stories and identifies characters, storyline and what the author wants to say"},
    "C-9.6": {"cg": "CG-9", "ec": "LC1", "text": "Narrates short stories with clear plot and characters"},
    "C-9.7": {"cg": "CG-9", "ec": "LC1", "text": "Knows and uses enough words to carry out day-to-day interactions effectively and can guess meaning of new words by using existing vocabulary"},
    "C-10.1": {"cg": "CG-10", "ec": "LC2", "text": "Develops phonological awareness and blends phonemes/syllables into words and segments words into phonemes/syllables"},
    "C-10.2": {"cg": "CG-10", "ec": "LC2", "text": "Understands basic structure/format of a book, idea of words in print and direction in which they are printed, and recognises basic punctuation marks"},
    "C-10.3": {"cg": "CG-10", "ec": "LC2", "text": "Recognises all the letters of the alphabet (forms of akshara) of the script and uses this knowledge to read and write words"},
    "C-10.4": {"cg": "CG-10", "ec": "LC2", "text": "Reads stories and passages with accuracy and fluency with appropriate pauses and voice modulation", "note": "Your framework document (reading in L1 → Reading Fluency); the HPC workbook had LC3"},
    "C-10.5": {"cg": "CG-10", "ec": "LC2", "text": "Reads short stories and comprehends its meaning – by identifying characters, storyline and what the author wanted to say – on their own", "note": "Your framework document (reading in L1 → Reading Fluency); the HPC workbook had LC3"},
    "C-10.6": {"cg": "CG-10", "ec": "LC2", "text": "Reads short poems and begins to appreciate the poem for its choice of words and imagination"},
    "C-10.7": {"cg": "CG-10", "ec": "LC2", "text": "Reads and comprehends meaning of short news items, instructions and recipes, and publicity material"},
    "C-10.8": {"cg": "CG-10", "ec": "LC3", "text": "Writes a paragraph to express their understanding and experiences"},
    "C-10.9": {"cg": "CG-10", "ec": "LC2", "text": "Shows interest in picking up and reading a variety of children's books"},
    "C-11.1": {"cg": "CG-11", "ec": "LC3", "text": "Develops phonological awareness and is able to blend phonemes/syllables into words and segment words into phonemes/syllables"},
    "C-11.2": {"cg": "CG-11", "ec": "LC3", "text": "Recognises most frequently occurring letters of the alphabet (forms of akshara) of the script and uses this knowledge to read and write simple words and sentences"},
    "C-12.1": {"cg": "CG-12", "ec": "CA4", "text": "Explores and plays with a variety of materials and tools to create two-dimensional and three-dimensional artworks in varying sizes"},
    "C-12.2": {"cg": "CG-12", "ec": "CA4", "text": "Explores and plays with own voice, body, spaces, and a variety of objects to create music, role-play, dance and movement"},
    "C-12.3": {"cg": "CG-12", "ec": "CA4", "text": "Innovates and works imaginatively to express a range of ideas and emotions through the arts"},
    "C-12.4": {"cg": "CG-12", "ec": "CA4", "text": "Works collaboratively in the arts"},
    "C-12.5": {"cg": "CG-12", "ec": "CA4", "text": "Communicates and appreciates a variety of responses while creating and experiencing different forms of art, local culture, and heritage"},
    "C-13.1": {"cg": "CG-13", "ec": "CA1", "text": "Attention and intentional action: acquires skills to plan, focus attention, and direct activities to achieve specific goals"},
    "C-13.2": {"cg": "CG-13", "ec": "CA1", "text": "Memory and mental flexibility: develops adequate working memory, mental flexibility and self-control that would assist them in learning in structured environments"},
    "C-13.3": {"cg": "CG-13", "ec": "CA2", "text": "Observation, wonder, curiosity, and exploration: observes minute details of objects, wonders, explores using various senses, tinkers with objects, and asks questions"},
    "C-13.4": {"cg": "CG-13", "ec": "CA3", "text": "Classroom norms: adopts and follows norms with agency and understanding"},
    "C-3.5": {"cg": "CG-3", "ec": "PM3", "text": "(in the HPC workbook only)", "note": "Only in the HPC workbook — kept so saved marks are not lost"},
    "V-1": {"cg": "VAL", "ec": "ME2", "text": "Knows major festivals and their stories"},
    "V-2": {"cg": "VAL", "ec": "ME2", "text": "Participates in cultural traditions and celebrations"},
    "V-3": {"cg": "VAL", "ec": "ME3", "text": "Shows honesty in everyday situations"},
    "V-4": {"cg": "VAL", "ec": "ME3", "text": "Expresses gratitude and respect"}
  },
  "remarks": {
    "Very Strong": "Consistently Advanced – offer enrichment and leadership roles.",
    "Strong": "Secure at Proficient – encourage towards Advanced-level tasks.",
    "Developing": "Mixed levels – continue guided practice and reinforcement.",
    "Needs Intervention": "Mostly Beginner – needs small-group / one-to-one support."
  }
};

  // A whole CG that sits in exactly one parameter (e.g. a Pre-Test activity tagged "CG 1")
  const WHOLE_CG_PARAM = {};
  Object.entries(D.params).forEach(([k, p]) => String(p.cg || '').split(/[,&]/).map(s => s.trim().replace(/^CG-?/, 'CG-')).forEach(cg => { if(/^CG-\d+$/.test(cg)) (WHOLE_CG_PARAM[cg] = WHOLE_CG_PARAM[cg] || []).push(k); }));

  // "CG 1.2", "C-1.2", "CG-1.2", "c 8.13" → "C-1.2"; "CG 1" / "C-1" → "CG-1"; "V-3" stays
  function code(raw){
    const s = String(raw || '').trim().toUpperCase();
    if(/^V-?\d+$/.test(s)) return 'V-' + s.replace(/\D/g, '');
    const m = s.match(/C\s*G?\s*[-–.]?\s*(\d+)(?:\.(\d+))?/);
    if(!m) return '';
    return m[2] ? 'C-' + m[1] + '.' + m[2] : 'CG-' + m[1];
  }
  // everything a report needs about one code
  function info(raw){
    const c = code(raw); if(!c) return null;
    if(c.startsWith('CG-')){
      const cg = D.cgs[c], ps = WHOLE_CG_PARAM[c] || [], ec = ps.length === 1 ? ps[0] : null;
      return { code: c, competency: null, cg: c, cgName: cg ? cg.name : '', kosha: cg ? cg.kosha : null, param: ec, domain: ec ? D.params[ec].domain : null, whole: true };
    }
    const k = D.competencies[c];
    if(!k){ const cg = 'CG-' + c.slice(2).split('.')[0]; const g = D.cgs[cg]; return { code: c, competency: c, cg, cgName: g ? g.name : '', kosha: g ? g.kosha : null, param: null, domain: null, unknown: true }; }
    return { code: c, competency: c, text: k.text, cg: k.cg, cgName: k.cg === 'VAL' ? 'Values' : D.cgs[k.cg].name, kosha: D.cgs[k.cg] ? D.cgs[k.cg].kosha : 'K5', param: k.ec, paramName: D.params[k.ec].name, domain: D.params[k.ec].domain, note: k.note || '' };
  }

  // ---- formulas ----
  const n3 = (b, p, a) => (b || 0) + (p || 0) + (a || 0);
  const pct = (x, n) => n ? Math.round(x / n * 1000) / 10 : null;
  function score(b, p, a){ const n = n3(b, p, a); return n ? Math.round((b + 2 * p + 3 * a) / n * 1000) / 10 : null; }          // 100–300
  function band(s){ return s == null ? 'Not assessed' : s >= 250 ? 'Very Strong' : s >= 200 ? 'Strong' : s >= 150 ? 'Developing' : 'Needs Intervention'; }
  function level(s){ return s == null ? null : s >= 250 ? 'A' : s >= 150 ? 'P' : 'B'; }
  function readiness(b, p, a){ return pct((p || 0) + (a || 0), n3(b, p, a)); }                                                  // SRI %
  function readinessBand(r){ return r == null ? 'Not assessed' : r >= 80 ? 'Ready' : r >= 60 ? 'Nearly Ready' : 'Not Yet Ready'; }
  // pairs: [{ pre: 'B'|'P'|'A', term: 'B'|'P'|'A' }] — the same child and competency
  function movement(pairs){
    const R = { B: 1, P: 2, A: 3 }, ok = pairs.filter(x => R[x.pre] && R[x.term]);
    const up = ok.filter(x => R[x.term] > R[x.pre]).length, down = ok.filter(x => R[x.term] < R[x.pre]).length;
    const preB = ok.filter(x => x.pre === 'B'), preP = ok.filter(x => x.pre === 'P');
    return { paired: ok.length, up: pct(up, ok.length), same: pct(ok.length - up - down, ok.length), down: pct(down, ok.length),
      conversion: pct(preB.filter(x => x.term !== 'B').length, preB.length),   // B → P/A
      advancement: pct(preP.filter(x => x.term === 'A').length, preP.length),  // P → A
      reviewRegression: ok.length ? down / ok.length > 0.05 : false };
  }
  function ratio(b, p, a){ if(!b) return (p || a) ? Infinity : null; return Math.round(((p || 0) + (a || 0)) / b * 100) / 100; }          // (P+A)/B
  function ratioLabel(r){ return r == null ? 'Not assessed' : r > 1 ? 'Strong' : r === 1 ? 'Balanced' : 'Needs improvement'; }
  function normalisedGain(pre, term){ if(pre == null || term == null || pre >= 300) return null; return Math.round((term - pre) / (300 - pre) * 100) / 100; }
  function gainBand(g){ return g == null ? 'Not assessed' : g < 0 ? 'Decline' : g >= 0.70 ? 'High' : g >= 0.30 ? 'Medium' : 'Low'; }
  function achieved(b, p, a){ const r = readiness(b, p, a); return r != null && r >= 70; }                                             // a competency, class level
  function gapFlag(b, p, a){ const x = pct(b || 0, n3(b, p, a)); return x == null ? null : x > 40 ? 'Learning gap' : x >= 20 ? 'Watch' : null; }
  function cpi(domainScores){ const v = domainScores.filter(x => x != null); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length * 10) / 10 : null; }
  function remark(b){ return D.remarks[b] || ''; }
  function nextStep(param, b){ const p = D.params[param]; if(!p) return ''; return b === 'Needs Intervention' ? p.needs : b === 'Developing' ? p.developing : (b === 'Strong' || b === 'Very Strong') ? p.growth : ''; }

  window.HPC = Object.assign({}, D, { code, info, score, band, level, readiness, readinessBand, movement, ratio, ratioLabel, normalisedGain, gainBand, achieved, gapFlag, cpi, remark, nextStep });
})();
