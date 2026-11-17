/* ============================================================
   WEEK 4 — "My Family" (Term 1, 6-10 Jul 2026)

   Built from the real spreadsheet
   (Weekly_Activity_Completion_DomainWise_Week4.xlsx). Replaces the
   earlier stopgap version that only fixed the duplicate-const crash
   but carried no real content — this is the actual authored week.
   ============================================================ */

WEEK_DAY_TOPICS.wk4 = {
  mon:{value:'Name family members', link:'My Family: Who is in my family'},
  tue:{value:'Recognise elder and younger family members', link:'My Family: Elders & Younger'},
  wed:{value:'Match a family member to their role', link:'My Family: Family Roles'},
  thu:{value:'Talk about helping at home', link:'My Family: Helping at Home'},
  fri:{value:'Say "I love my family"', link:'My Family: Love & Care'}
};

WEEKLY_PLAN.wk4 = {
  welcome:  {mon:'Family picture card free play', tue:'Free play with home corner toys', wed:'Attendance and family talk', thu:'Hygiene check and greeting talk', fri:'Weather and family sharing'},
  story:    {mon:'Story: My Family Loves Me', tue:'Rhyme: Mummy, Daddy, I Love You', wed:'Story: Grandma Tells a Story', thu:'Story: Helping at Home', fri:'Story: We Care for Each Other'},
  numeracy: {mon:'Count family members in picture', tue:'Sort elder / younger family members', wed:'Match family member to role', thu:'Count boys/girls in family picture', fri:'Family counting recap'},
  language: {mon:'Words: mother, father', tue:'Words: brother, sister', wed:'Words: grandmother, grandfather', thu:'Sentence: "This is my ___."', fri:'Sentence: "I love my family."'},
  create:   {mon:'Family colouring', tue:'Family picture matching', wed:'Family tree pasting', thu:'Draw my family', fri:'My family badge/card'},
  outdoor:  {mon:'Family action song', tue:'Greeting action game', wed:'Family role-play walk', thu:'Helping hands movement', fri:'Family circle game & love recap'},
  reflect:  {mon:'Name one family member', tue:'Say one elder name', wed:'Say "This is my ___."', thu:'Say one helping action', fri:'Share family card'}
};

ACTIVITY_COMPETENCIES.wk4 = {
  welcome: {
    mon:'Explores family picture cards through free play', tue:'Plays freely with home corner toys',
    wed:'Participates in attendance and talks about family', thu:'Checks personal hygiene and joins a greeting talk',
    fri:'Connects weather to family sharing'
  },
  story: {
    mon:'Listens to a story about family love', tue:'Joins a rhyme about mummy, daddy and love',
    wed:'Listens to a story told by grandma', thu:'Listens to a story about helping at home',
    fri:'Listens to a story about caring for each other'
  },
  numeracy: {
    mon:'Counts family members in a picture', tue:'Sorts family members as elder or younger',
    wed:'Matches a family member to their role', thu:'Counts boys and girls in a family picture',
    fri:'Recaps counting family members'
  },
  language: {
    mon:'Learns the words mother, father', tue:'Learns the words brother, sister',
    wed:'Learns the words grandmother, grandfather', thu:'Completes the sentence "This is my ___."',
    fri:'Completes the sentence "I love my family."'
  },
  create: {
    mon:'Colours a family picture', tue:'Matches family pictures',
    wed:'Pastes a family tree', thu:'Draws their own family',
    fri:'Makes a family badge or card'
  },
  outdoor: {
    mon:'Joins a family action song', tue:'Plays a greeting action game',
    wed:'Walks through a family role-play', thu:'Moves through a helping-hands activity',
    fri:'Plays a family circle game and recaps love for family'
  },
  reflect: {
    mon:'Names one family member', tue:'Says one elder\u2019s name',
    wed:'Says "This is my ___."', thu:'Says one way they help at home',
    fri:'Shares their family card'
  }
};

weeksWithContent.push(4);


/* ------------------------------------------------------------
   INTERACTIVE_ACTIVITIES.wkN block intentionally omitted — same
   convention as every other week file (see week1.js's closing note).
   Everything My Day / Daily Plan actually needs (WEEK_DAY_TOPICS,
   WEEKLY_PLAN, ACTIVITY_COMPETENCIES, weeksWithContent) is above.
   ------------------------------------------------------------ */