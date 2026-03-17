import { useState, useEffect, useRef, useCallback } from "react";

// ─── BACKEND CONFIG ────────────────────────────────────────────────────────────
const SUPABASE_URL  = "https://njovlmhhearoqeadwbyg.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qb3ZsbWhoZWFyb3FlYWR3YnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MDg3NTAsImV4cCI6MjA4OTI4NDc1MH0._1SNw5nNX3tEkPho6Fg2wLITDY_LKwfoYXYUbVNcOwY";
const STRIPE_PAYMENT_LINK = "PASTE_YOUR_STRIPE_PAYMENT_LINK_HERE"; // e.g. https://buy.stripe.com/xxx

async function sbGet(email) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sat_users?email=eq.${encodeURIComponent(email)}&select=*`, {
      headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` }
    });
    const rows = await res.json();
    return rows?.[0] || null;
  } catch(e) { return null; }
}

async function sbUpsert(email, userData, isPro=false) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sat_users`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON,
        "Authorization": `Bearer ${SUPABASE_ANON}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({ email, user_data: userData, is_pro: isPro, updated_at: new Date().toISOString() })
    });
    return res.ok;
  } catch(e) { return false; }
}

async function sbCheckPro(email) {
  const row = await sbGet(email);
  return row?.is_pro || false;
}

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const T = {
  navy:"#1e3a5f", navyDark:"#0f2240", navyLight:"#2d547f", navyFaint:"#e8f0f8",
  gold:"#b8860b", goldBright:"#d4a017", goldFaint:"#fdf6e3",
  rum:"#8b3a0f", rumFaint:"#fdf0e8",
  green:"#2d6a4f", greenMid:"#52b788", greenFaint:"#e8f5ee",
  teal:"#0d7377", tealLight:"#14a8ad", tealFaint:"#e6f7f7",
  blue:"#1e5f8a", blueFaint:"#e8f0f8",
  purple:"#5b21b6", purpleMid:"#7c3aed", purpleFaint:"#f5f0ff",
  pink:"#be185d", pinkFaint:"#fdf2f8",
  bg:"#faf7f2", surface:"#ffffff", surface2:"#f2ede4",
  border:"#e0d5c5", borderDark:"#c8b99a",
  textPrimary:"#1a1208", textSecondary:"#5a4a35", textMuted:"#6b5d4f",
};

// ─── MATH COURSES ──────────────────────────────────────────────────────────────
const MATH_COURSES = [
  { id:"algebra",  name:"Heart of Algebra",       color:T.green,  icon:"x²", section:"math",
    topics:[
      {id:"linear_eq",    name:"Linear Equations",    desc:"Solve for x, one-variable"},
      {id:"inequalities", name:"Inequalities",         desc:">, <, ≥, ≤ on number lines"},
      {id:"systems",      name:"Systems of Equations", desc:"Two variables, two equations"},
      {id:"linear_fn",    name:"Linear Functions",     desc:"Slope, intercepts, y=mx+b"},
      {id:"abs_value",    name:"Absolute Value",       desc:"|x| equations & inequalities"},
      {id:"word_probs",   name:"Word Problems",        desc:"Real-world linear scenarios"},
    ]},
  { id:"advanced", name:"Advanced Algebra",        color:T.gold,   icon:"f(x)", section:"math",
    topics:[
      {id:"quadratics",  name:"Quadratic Equations",  desc:"Factor, complete square, formula"},
      {id:"polynomials", name:"Polynomials",           desc:"Operations, remainder theorem"},
      {id:"rational",    name:"Rational Expressions",  desc:"Simplify, add, solve"},
      {id:"exponential", name:"Exponential Functions", desc:"Growth, decay, rules"},
      {id:"complex",     name:"Complex Numbers",       desc:"i, real + imaginary parts"},
      {id:"functions",   name:"Function Notation",     desc:"f(x), composition, inverse"},
    ]},
  { id:"data",     name:"Problem Solving & Data",  color:T.blue,   icon:"∑", section:"math",
    topics:[
      {id:"ratios",      name:"Ratios & Proportions", desc:"Part-to-part, scaling"},
      {id:"percentages", name:"Percentages",          desc:"Change, markup, discount"},
      {id:"statistics",  name:"Statistics",           desc:"Mean, median, mode, range"},
      {id:"data_interp", name:"Data Interpretation",  desc:"Tables, charts, scatterplots"},
      {id:"probability", name:"Probability",          desc:"Single & compound events"},
      {id:"unit_conv",   name:"Unit Conversion",      desc:"Rates, dimensional analysis"},
    ]},
  { id:"geometry", name:"Geometry",                color:T.purple, icon:"△", section:"math",
    topics:[
      {id:"triangles",    name:"Triangles",           desc:"Angles, Pythagorean, similar"},
      {id:"circles",      name:"Circles",             desc:"Area, arc, sector, tangent"},
      {id:"coord_geo",    name:"Coordinate Geometry", desc:"Distance, midpoint, slope"},
      {id:"trig",         name:"Trigonometry",        desc:"sin, cos, tan, SOHCAHTOA"},
      {id:"vol_area",     name:"Volume & Area",       desc:"2D and 3D shapes"},
      {id:"lines_angles", name:"Lines & Angles",      desc:"Parallel, transversal, congruent"},
    ]},
];

// ─── READING & WRITING COURSES ─────────────────────────────────────────────────
const RW_COURSES = [
  { id:"craft",    name:"Craft & Structure",       color:T.teal,   icon:"✦", section:"rw",
    topics:[
      {id:"words_context",   name:"Words in Context",     desc:"Vocabulary based on passage meaning"},
      {id:"text_structure",  name:"Text Structure",        desc:"How a passage is organized"},
      {id:"cross_text",      name:"Cross-Text Connections",desc:"Comparing two related passages"},
      {id:"author_purpose",  name:"Author's Purpose",      desc:"Why the author wrote this"},
      {id:"text_function",   name:"Function of a Sentence",desc:"What role a sentence plays"},
      {id:"rhetorical_syn",  name:"Rhetorical Synthesis",  desc:"Combining notes into a sentence"},
    ]},
  { id:"info",     name:"Information & Ideas",     color:T.blue,   icon:"📊", section:"rw",
    topics:[
      {id:"central_idea",  name:"Central Idea & Details", desc:"Main point and supporting evidence"},
      {id:"command_evid",  name:"Command of Evidence",    desc:"Textual and quantitative evidence"},
      {id:"inferences",    name:"Inferences",             desc:"Drawing conclusions from the text"},
      {id:"data_tables",   name:"Charts & Tables",        desc:"Interpreting graphs in passages"},
      {id:"relationships", name:"Relationships",          desc:"How ideas connect in a passage"},
      {id:"perspectives",  name:"Multiple Perspectives",  desc:"Different viewpoints in a text"},
    ]},
  { id:"english",  name:"Standard English Conventions", color:T.purple, icon:"¶", section:"rw",
    topics:[
      {id:"boundaries",    name:"Sentence Boundaries",  desc:"Periods, semicolons, run-ons"},
      {id:"punctuation",   name:"Punctuation",          desc:"Commas, colons, dashes"},
      {id:"subject_verb",  name:"Subject-Verb Agreement",desc:"Singular/plural consistency"},
      {id:"pronoun_agree", name:"Pronoun Agreement",    desc:"Pronoun-antecedent matching"},
      {id:"verb_tense",    name:"Verb Tense & Form",    desc:"Consistent and correct tense"},
      {id:"modifiers",     name:"Modifiers",            desc:"Dangling and misplaced modifiers"},
    ]},
  { id:"expression",name:"Expression of Ideas",   color:T.pink,   icon:"✏", section:"rw",
    topics:[
      {id:"transitions",    name:"Transitions",         desc:"Connecting ideas with signal words"},
      {id:"precise_lang",   name:"Precise Language",    desc:"Choosing exact, clear wording"},
      {id:"concision",      name:"Concision",           desc:"Eliminating wordiness"},
      {id:"org_sequence",   name:"Organization",        desc:"Logical order and sequence"},
      {id:"intro_conclude", name:"Intro & Conclusion",  desc:"Opening and closing sentences"},
      {id:"tone_style",     name:"Tone & Style",        desc:"Matching the passage's voice"},
    ]},
];

const ALL_COURSES = [...MATH_COURSES, ...RW_COURSES];

// ─── XP & RANK SYSTEM ──────────────────────────────────────────────────────────
const XP_RANKS = [
  {min:0,    label:"Deckhand",    icon:"⚓"},
  {min:50,   label:"Navigator",   icon:"🧭"},
  {min:150,  label:"Cartographer",icon:"🗺️"},
  {min:300,  label:"First Mate",  icon:"⛵"},
  {min:500,  label:"Captain",     icon:"🚢"},
  {min:800,  label:"Commodore",   icon:"🏴‍☠️"},
  {min:1200, label:"Admiral",     icon:"⭐"},
];
const getXpRank = xp => { for(let i=XP_RANKS.length-1;i>=0;i--) if(xp>=XP_RANKS[i].min) return XP_RANKS[i]; return XP_RANKS[0]; };
const getXpToNext = xp => { for(let i=0;i<XP_RANKS.length-1;i++) if(xp<XP_RANKS[i+1].min) return {next:XP_RANKS[i+1],progress:(xp-XP_RANKS[i].min)/(XP_RANKS[i+1].min-XP_RANKS[i].min)}; return null; };

// ─── MASTERY ENGINE ────────────────────────────────────────────────────────────
const MASTERY_WEIGHTS = {new:4, struggling:5, learning:3, proficient:2, mastered:1};
const MASTERY_COLORS = {
  new:        {bg:T.navyFaint,  text:T.navy,   border:T.navyLight,  label:"New"},
  struggling: {bg:T.rumFaint,   text:T.rum,    border:"#f4a090",    label:"Struggling"},
  learning:   {bg:T.goldFaint,  text:T.gold,   border:T.goldBright, label:"Learning"},
  proficient: {bg:T.blueFaint,  text:T.blue,   border:T.blue,       label:"Proficient"},
  mastered:   {bg:T.greenFaint, text:T.green,  border:T.greenMid,   label:"Mastered"},
};

function getTopicMastery(stats) {
  if(!stats) return "new";
  const {total=0, history=[]} = stats;
  if(total < 3) return "new";
  const recent = history.slice(-10);
  const acc = recent.length > 0 ? recent.reduce((a,b)=>a+b,0)/recent.length : 0;
  if(total >= 15 && acc >= 0.9) return "mastered";
  if(total >= 10 && acc >= 0.8) return "proficient";
  if(acc >= 0.5) return "learning";
  return "struggling";
}

function pickAdaptiveTopic(courseId, skillProgress, weakTopics=[]) {
  const course = ALL_COURSES.find(c=>c.id===courseId);
  const pool = [];
  course.topics.forEach(t => {
    const mastery = getTopicMastery(skillProgress?.[t.id]);
    // If user flagged this as weak during onboarding AND hasn't practiced it yet,
    // treat it as struggling (weight 5) instead of new (weight 4)
    const isOnboardingWeak = weakTopics.includes(t.id) && mastery === "new";
    const w = isOnboardingWeak ? 5 : MASTERY_WEIGHTS[mastery];
    for(let i=0;i<w;i++) pool.push(t);
  });
  return pool[Math.floor(Math.random()*pool.length)];
}

function getCourseProgress(courseId, skillProgress) {
  const course = ALL_COURSES.find(c=>c.id===courseId);
  if(!course) return {pct:0,mastered:0,total:0};
  const counts = {mastered:0,proficient:0,learning:0,struggling:0,new:0};
  course.topics.forEach(t => counts[getTopicMastery(skillProgress?.[t.id])]++);
  const score = counts.mastered*100+counts.proficient*75+counts.learning*50+counts.struggling*20;
  return {...counts, pct:Math.round(score/(course.topics.length*100)*100), total:course.topics.length};
}

function getSectionMastery(section, skillProgress) {
  const courses = ALL_COURSES.filter(c=>c.section===section);
  const pcts = courses.map(c=>getCourseProgress(c.id,skillProgress).pct);
  return Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length);
}

function getStrugglingTopics(skillProgress) {
  const result = [];
  ALL_COURSES.forEach(c => c.topics.forEach(t => {
    if(getTopicMastery(skillProgress?.[t.id])==="struggling")
      result.push({...t, courseId:c.id, courseName:c.name, courseColor:c.color, section:c.section});
  }));
  return result;
}

function getUntouchedTopics(skillProgress) {
  const result = [];
  ALL_COURSES.forEach(c => c.topics.forEach(t => {
    if(!skillProgress?.[t.id]) result.push({...t, courseId:c.id, courseName:c.name, section:c.section});
  }));
  return result;
}

// Rough predicted score based on mastery (200-800 per section)
function getPredictedScore(skillProgress) {
  const mathPct = getSectionMastery("math", skillProgress);
  const rwPct   = getSectionMastery("rw",   skillProgress);
  const mathScore = Math.round(200 + (mathPct/100) * 600);
  const rwScore   = Math.round(200 + (rwPct/100)   * 600);
  return {math: mathScore, rw: rwScore, total: mathScore + rwScore};
}

// ─── FALLBACK QUESTIONS ────────────────────────────────────────────────────────
const MATH_FALLBACKS = {
  linear_eq:    [{q:"If 3x + 7 = 22, what is x?",options:["3","5","7","9"],answer:1,explanation:"3x=15, x=5",hint:"Subtract 7 from both sides."}],
  inequalities: [{q:"Which satisfies 2x − 3 > 7?",options:["x=4","x=5","x=6","x=2"],answer:2,explanation:"2x>10, x>5",hint:"Isolate x the same as an equation."}],
  systems:      [{q:"If 2x−y=8 and x+y=7, what is x?",options:["3","5","7","4"],answer:1,explanation:"Adding: 3x=15, x=5",hint:"Try adding both equations."}],
  linear_fn:    [{q:"Slope through (0,3) and (2,7)?",options:["1","2","3","4"],answer:1,explanation:"(7−3)/(2−0)=2",hint:"Use (y₂−y₁)/(x₂−x₁)."}],
  abs_value:    [{q:"Solve |x−4|=6",options:["x=−2 or 10","x=2 or 10","x=−2 or 2","x=6"],answer:0,explanation:"x−4=±6",hint:"Set up two equations."}],
  word_probs:   [{q:"A train travels 60mph for 2.5h. Distance?",options:["120mi","140mi","150mi","160mi"],answer:2,explanation:"60×2.5=150",hint:"d=rt"}],
  quadratics:   [{q:"Roots of x²−5x+6=0?",options:["2,3","−2,−3","1,6","−1,6"],answer:0,explanation:"(x−2)(x−3)=0",hint:"Find two numbers multiplying to 6, summing to −5."}],
  polynomials:  [{q:"Simplify (x²−9)/(x−3)",options:["x+3","x−3","x²+3","x"],answer:0,explanation:"Difference of squares, cancel (x−3)",hint:"Factor the numerator."}],
  rational:     [{q:"Simplify 2x/x² for x≠0",options:["2/x","2x","x/2","2"],answer:0,explanation:"2x/x²=2/x",hint:"Cancel one x."}],
  exponential:  [{q:"If f(x)=2^x, what is f(3)?",options:["6","8","9","16"],answer:1,explanation:"2³=8",hint:"Multiply 2 by itself 3 times."}],
  complex:      [{q:"What is i²?",options:["1","−1","i","−i"],answer:1,explanation:"By definition, i²=−1",hint:"Fundamental property of i."}],
  functions:    [{q:"f(x)=2x²−3x+1, what is f(2)?",options:["3","5","7","9"],answer:0,explanation:"2(4)−3(2)+1=3",hint:"Substitute x=2."}],
  ratios:       [{q:"2 cups flour per 3 cups sugar. For 9 cups sugar?",options:["4","5","6","7"],answer:2,explanation:"2/3=x/9, x=6",hint:"Set up a proportion."}],
  percentages:  [{q:"$80 item, 25% off. New price?",options:["$55","$60","$65","$70"],answer:1,explanation:"$80×0.75=$60",hint:"Multiply by (1−rate)."}],
  statistics:   [{q:"Mean of 4,7,9,x is 8. What is x?",options:["10","12","14","16"],answer:1,explanation:"Sum=32, x=12",hint:"Total must be 8×4=32."}],
  data_interp:  [{q:"Sales: Mon 20, Tue 30, Wed 25. Average?",options:["25","26","27","28"],answer:0,explanation:"(20+30+25)/3=25",hint:"Sum ÷ count."}],
  probability:  [{q:"P(rain)=0.3. P(no rain)?",options:["0.3","0.5","0.7","0.9"],answer:2,explanation:"1−0.3=0.7",hint:"Complement rule."}],
  unit_conv:    [{q:"60mph = ? ft/sec (5280ft/mi)",options:["88","90","92","96"],answer:0,explanation:"60×5280/3600=88",hint:"×5280 ÷3600."}],
  triangles:    [{q:"Right triangle legs 6 and 8. Hypotenuse?",options:["10","12","14","√72"],answer:0,explanation:"6²+8²=100,√100=10",hint:"Pythagorean theorem."}],
  circles:      [{q:"Area of circle with radius 5?",options:["10π","25π","50π","5π"],answer:1,explanation:"A=πr²=25π",hint:"Square the radius first."}],
  coord_geo:    [{q:"Distance (1,2) to (4,6)?",options:["4","5","6","7"],answer:1,explanation:"√(9+16)=5",hint:"Distance formula."}],
  trig:         [{q:"sin(θ)=? if opp=3, hyp=5",options:["3/5","4/5","5/3","3/4"],answer:0,explanation:"sin=opp/hyp=3/5",hint:"SOHCAHTOA."}],
  vol_area:     [{q:"Sum of interior angles of hexagon?",options:["540°","720°","900°","1080°"],answer:1,explanation:"(6−2)×180=720°",hint:"(n−2)×180."}],
  lines_angles: [{q:"Parallel lines cut by transversal. Which angles are equal?",options:["Supplementary","Corresponding","Adjacent","Consecutive"],answer:1,explanation:"Corresponding angles are equal.",hint:"Same position at each intersection."}],
};

const RW_FALLBACKS = {
  words_context:  [{q:"In the sentence 'The scientist's theory was tenuous at best', what does 'tenuous' mean?",options:["Well-supported","Weakly founded","Controversial","Groundbreaking"],answer:1,hint:"Consider the phrase 'at best'.",explanation:"'Tenuous' means weak or thin. 'At best' signals the theory is barely acceptable."}],
  text_structure: [{q:"A paragraph begins with a claim, then gives three examples, then restates the claim. What structure is this?",options:["Chronological","Problem-solution","Claim-evidence-restatement","Compare-contrast"],answer:2,hint:"Look at what each part of the paragraph does.",explanation:"The paragraph presents a claim, supports it with evidence, and restates it — a classic argumentative structure."}],
  cross_text:     [{q:"Passage 1 argues X is beneficial. Passage 2 argues X causes harm. How do they relate?",options:["They agree completely","They are unrelated","They offer opposing views","Passage 2 extends Passage 1"],answer:2,hint:"What does each author say about X?",explanation:"One author sees benefits, the other sees harm — these are opposing perspectives on the same topic."}],
  author_purpose: [{q:"An author ends a passage with a call to action. What is the primary purpose?",options:["To entertain","To inform","To persuade","To describe"],answer:2,hint:"A call to action wants the reader to do something.",explanation:"Calls to action are persuasive — the author wants the audience to change behavior or views."}],
  text_function:  [{q:"A sentence in a passage says 'But not everyone agrees.' What function does it serve?",options:["It introduces evidence","It transitions to a counterargument","It restates the thesis","It provides background"],answer:1,hint:"What comes after this sentence in most arguments?",explanation:"This phrase signals the author is about to present an opposing view — it's a transition to counterargument."}],
  rhetorical_syn: [{q:"Which sentence best combines: 'Dogs are loyal. Dogs make good pets.'",options:["Dogs are loyal, they make good pets","Dogs, which are loyal, make good pets","Dogs are loyal so they are good pets","Dogs are loyal; also, good pets"],answer:1,explanation:"The relative clause 'which are loyal' cleanly integrates both ideas.",hint:"Look for the option that makes one smooth sentence."}],
  central_idea:   [{q:"A passage describes climate patterns, ocean currents, and their combined effects. The central idea is:",options:["Ocean temperatures fluctuate","Climate and oceans interact to shape weather","Fish depend on ocean currents","Humans affect ocean temperatures"],answer:1,hint:"What single idea ties all the details together?",explanation:"All details point to the relationship between climate and oceans — that's the unifying central idea."}],
  command_evid:   [{q:"A student claims study time improves grades. Which evidence best supports this?",options:["Grades vary by teacher","Students who study 3+ hours daily average 12% higher grades","Some students dislike homework","Test anxiety affects results"],answer:1,hint:"Look for direct, measurable evidence.",explanation:"Specific data showing a correlation between study time and grades directly supports the claim."}],
  inferences:     [{q:"The passage says the explorer 'returned with empty hands but full journals.' What can we infer?",options:["The expedition failed completely","The explorer found no treasure but recorded many observations","The explorer lost his supplies","The journals were later published"],answer:1,hint:"'Empty hands' = no material gains; 'full journals' = lots of notes.",explanation:"The contrast implies no physical discoveries but rich documentation of the journey."}],
  data_tables:    [{q:"A table shows sales in Q1: 100, Q2: 150, Q3: 120, Q4: 200. What's the trend?",options:["Steadily increasing","Steadily decreasing","Fluctuating but trending up","No pattern"],answer:2,hint:"Look at the overall direction despite the dip in Q3.",explanation:"Sales dip in Q3 but end higher than they started — fluctuating but generally increasing."}],
  relationships:  [{q:"Author A credits technology for economic growth. Author B says inequality limits growth. They:",options:["Agree on causes of growth","Identify different factors affecting growth","Both oppose technology","Ignore each other's arguments"],answer:1,hint:"Both discuss growth but focus on different variables.",explanation:"They aren't contradicting each other directly — they're highlighting different variables that affect the same outcome."}],
  perspectives:   [{q:"One passage praises urbanization. Another warns of its environmental cost. Their relationship is:",options:["Both fully supportive","Both critical","In tension — one positive, one cautionary","Unrelated topics"],answer:2,hint:"What is each author's overall stance?",explanation:"One celebrates urbanization while the other warns against it — they represent opposing perspectives."}],
  boundaries:     [{q:"Which is correctly punctuated? 'I studied hard, I passed the test.'",options:["Correct as written","I studied hard; I passed the test.","I studied hard. I passed the test.","Both B and C"],answer:3,hint:"The original is a comma splice. What are the valid fixes?",explanation:"A comma splice joins two independent clauses with only a comma. A semicolon or period both fix it."}],
  punctuation:    [{q:"Which sentence uses a colon correctly?",options:["I need: milk and eggs","I need three things: milk, eggs, and bread","I need milk: eggs, and bread","I: need milk and eggs"],answer:1,hint:"A colon introduces a list after a complete clause.",explanation:"The colon correctly follows a complete independent clause and introduces the list that follows."}],
  subject_verb:   [{q:"'The group of students __ studying.' Which verb is correct?",options:["are","were","is","have"],answer:2,hint:"What is the subject — 'group' or 'students'?",explanation:"The subject is 'group' (singular), so the singular verb 'is' is correct."}],
  pronoun_agree:  [{q:"'Each student must bring __ own pencil.' Which pronoun is correct?",options:["their","his or her","its","our"],answer:1,hint:"'Each' is singular — what agrees with it formally?",explanation:"'Each' is singular; formally, 'his or her' agrees. 'Their' is increasingly accepted but 'his or her' is the traditional SAT answer."}],
  verb_tense:     [{q:"'By the time she arrived, he already __ dinner.' Which verb form?",options:["ate","eats","had eaten","has eaten"],answer:2,hint:"Which tense shows an action completed before another past action?",explanation:"Past perfect ('had eaten') expresses an action completed before another past event."}],
  modifiers:      [{q:"'Running quickly, the finish line appeared.' What is wrong?",options:["Nothing is wrong","'Running quickly' wrongly modifies 'finish line'","'appeared' is incorrect","The sentence is too short"],answer:1,hint:"Who was running quickly?",explanation:"The modifier 'running quickly' should describe a person, but grammatically modifies 'finish line' — a dangling modifier."}],
  transitions:    [{q:"Which transition best shows contrast? 'She studied hard. ___, she failed.'",options:["Therefore","Furthermore","Nevertheless","As a result"],answer:2,hint:"You need a word that signals an unexpected outcome.",explanation:"'Nevertheless' signals that despite a previous condition (studying hard), an opposite result occurred."}],
  precise_lang:   [{q:"Which is most precise? 'The experiment's results were ___.'",options:["good","positive","statistically significant at p<0.05","fine"],answer:2,hint:"SAT values specific, exact language over vague words.",explanation:"'Statistically significant at p<0.05' is precise and scientific. The others are vague."}],
  concision:      [{q:"Which is most concise? The long reason why he was late was due to the fact that the bus was delayed.",options:["The long reason why he was late was because the bus was delayed","He was late because the bus was delayed","The bus was delayed, which was the reason for his lateness","Due to the bus delay, he arrived late for this reason"],answer:1,hint:"Cut every unnecessary word.",explanation:"'He was late because the bus was delayed' conveys the same information in the fewest words."}],
  org_sequence:   [{q:"A paragraph jumps from discussing causes to effects to causes again. What should be fixed?",options:["Add more examples","Reorganize to group causes together, then effects","Use more transitions","Shorten sentences"],answer:1,hint:"Logical organization groups related ideas together.",explanation:"Mixing causes and effects disrupts logical flow. Grouping causes, then effects, creates a clearer structure."}],
  intro_conclude: [{q:"An essay about ocean pollution ends: 'Ocean pollution is bad.' What's wrong?",options:["Nothing, it's clear","It's too vague and doesn't synthesize the essay's arguments","It should be longer","It needs a quote"],answer:1,hint:"A conclusion should leave the reader with a meaningful final thought.",explanation:"'Ocean pollution is bad' is too simplistic. A strong conclusion synthesizes the essay's key points or leaves the reader with something to think about."}],
  tone_style:     [{q:"A formal scientific passage uses the phrase 'totally awesome results.' What's wrong?",options:["Nothing, variety is good","The phrase is too informal for the passage's tone","The phrase is too long","It should use passive voice"],answer:1,hint:"Does the language match the context?",explanation:"'Totally awesome' is casual slang — it clashes with the formal, scientific tone established in the passage."}],
};

const ALL_FALLBACKS = {...MATH_FALLBACKS, ...RW_FALLBACKS};

// ─── FORMULAS ──────────────────────────────────────────────────────────────────
const FORMULAS = [
  {id:1, name:"Quadratic Formula",    formula:"x = (-b ± √(b²-4ac)) / 2a",     topic:"Advanced Algebra",        mastered:false},
  {id:2, name:"Slope Formula",        formula:"m = (y₂-y₁) / (x₂-x₁)",        topic:"Heart of Algebra",        mastered:false},
  {id:3, name:"Distance Formula",     formula:"d = √((x₂-x₁)² + (y₂-y₁)²)",   topic:"Geometry",                mastered:false},
  {id:4, name:"Area of Circle",       formula:"A = πr²",                        topic:"Geometry",                mastered:false},
  {id:5, name:"Pythagorean Theorem",  formula:"a² + b² = c²",                   topic:"Geometry",                mastered:false},
  {id:6, name:"Mean (Average)",       formula:"x̄ = Σx / n",                    topic:"Problem Solving & Data",  mastered:false},
  {id:7, name:"Percent Change",       formula:"% = (new-old)/old × 100",        topic:"Problem Solving & Data",  mastered:false},
  {id:8, name:"Difference of Squares",formula:"a²-b² = (a+b)(a-b)",            topic:"Advanced Algebra",        mastered:false},
  {id:9, name:"FOIL Method",          formula:"(a+b)(c+d) = ac+ad+bc+bd",       topic:"Advanced Algebra",        mastered:false},
  {id:10,name:"Circumference",        formula:"C = 2πr",                        topic:"Geometry",                mastered:false},
];

// ─── SVG COMPONENTS ────────────────────────────────────────────────────────────
const CompassLogo = ({size=28}) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={{flexShrink:0}}>
    <circle cx="14" cy="14" r="12.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
    <circle cx="14" cy="14" r="9" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
    <line x1="14" y1="1.5" x2="14" y2="4.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="14" y1="23.5" x2="14" y2="26.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeLinecap="round"/>
    <line x1="1.5" y1="14" x2="4.5" y2="14" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeLinecap="round"/>
    <line x1="23.5" y1="14" x2="26.5" y2="14" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeLinecap="round"/>
    <text x="14" y="10.2" textAnchor="middle" fontSize="3.8" fontFamily="Space Mono,monospace" fill="rgba(255,255,255,0.7)" fontWeight="700">N</text>
    <polygon points="14,5.5 12.5,14 14,15.5 15.5,14" fill="#f0c040"/>
    <polygon points="14,22.5 12.5,14 14,12.5 15.5,14" fill="rgba(255,255,255,0.75)"/>
    <circle cx="14" cy="14" r="2" fill="#f0c040" opacity="0.9"/>
    <circle cx="14" cy="14" r="1" fill="#fff" opacity="0.6"/>
  </svg>
);

const MasteryChip = ({tier}) => {
  const m = MASTERY_COLORS[tier];
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,background:m.bg,border:`1px solid ${m.border}`,borderRadius:20,padding:"5px 10px",fontFamily:"'Space Mono',monospace",fontSize:17,fontWeight:700,color:m.text,whiteSpace:"nowrap"}}>{m.label}</span>;
};

const ProgressBar = ({pct, color, height=5}) => (
  <div style={{height,background:T.border,borderRadius:3,overflow:"hidden",marginTop:4}}>
    <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:3,transition:"width 0.6s ease"}}/>
  </div>
);

const BoldExplanation = ({text, style={}}) => {
  if(!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return (
    <span style={style}>
      {parts.map((p,i) => /^\*\*/.test(p)
        ? <strong key={i} style={{background:"rgba(184,134,11,0.13)",borderRadius:3,padding:"0 3px",color:"inherit"}}>{p.slice(2,-2)}</strong>
        : <span key={i}>{p}</span>
      )}
    </span>
  );
};

const NavHeader = ({title, subtitle, back, backFn, right}) => (
  <div style={{background:T.navyDark,padding:"20px 20px 18px",position:"relative",overflow:"hidden",flexShrink:0}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`repeating-linear-gradient(90deg,${T.goldBright} 0,${T.goldBright} 8px,${T.navyDark} 8px,${T.navyDark} 16px)`,opacity:0.6}}/>
    <div style={{position:"absolute",bottom:-1,left:0,right:0,height:14,background:T.bg,clipPath:"ellipse(55% 100% at 50% 100%)"}}/>
    <div style={{display:"flex",alignItems:"center",gap:10,position:"relative",zIndex:2}}>
      {back && <button onClick={backFn} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:10,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",color:"white",cursor:"pointer",flexShrink:0}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>}
      <div style={{flex:1}}>
        {subtitle && <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.6)",letterSpacing:1.5,marginBottom:3}}>{subtitle}</div>}
        <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:"white",letterSpacing:-0.3}}>{title}</div>
      </div>
      {right}
    </div>
  </div>
);


// ─── COURSE ICON ───────────────────────────────────────────────────────────────
const COURSE_ICONS = {
  algebra:    <><line x1="5" y1="19" x2="19" y2="5"/><line x1="5" y1="5" x2="19" y2="19"/></>,
  advanced:   <><path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20z"/><path d="M8 12h8M12 8v8"/></>,
  data:       <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  geometry:   <><polygon points="12 2 22 20 2 20"/></>,
  craft:      <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></>,
  info:       <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
  english:    <><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></>,
  expression: <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/><line x1="15" y1="5" x2="19" y2="9"/></>,
};
function CourseIcon({id, color, size=40}) {
  return (
    <div style={{width:size,height:size,borderRadius:Math.round(size*0.28),background:`${color}14`,border:`1.5px solid ${color}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <svg width={size*0.46} height={size*0.46} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {COURSE_ICONS[id] || <circle cx="12" cy="12" r="8"/>}
      </svg>
    </div>
  );
}

// ─── BOTTOM NAV ────────────────────────────────────────────────────────────────
function BottomNav({screen, setScreen}) {
  const NAV_ICONS = {
    home:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    practice: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    learn:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
    review:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.44"/></svg>,
    progress: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  };
  const tabs = [
    {id:"home",     label:"HOME"},
    {id:"practice", label:"PRACTICE"},
    {id:"learn",    label:"LEARN"},
    {id:"review",   label:"REVIEW"},
    {id:"progress", label:"PROGRESS"},
  ];
  return (
    <div className="bottom-nav-safe" style={{background:"white",borderTop:`1px solid ${T.border}`,display:"flex",paddingTop:"6px",flexShrink:0,boxShadow:"0 -2px 12px rgba(0,0,0,0.06)"}}>
      {tabs.map(t => {
        const active = screen===t.id || (t.id==="progress" && screen==="settings");
        return (
          <button key={t.id} onClick={()=>setScreen(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:0.5,color:active?T.navy:T.textMuted,padding:"4px 0",transition:"color 0.15s"}}>
            <div style={{width:36,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:10,background:active?T.navyFaint:"transparent",transition:"background 0.15s"}}>{NAV_ICONS[t.id]}</div>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}


// ─── DIAGNOSTIC QUIZ ───────────────────────────────────────────────────────────
const DIAGNOSTIC_QUESTIONS = [
  // ── MATH ──
  {
    id:"d_m1", courseId:"algebra", section:"math",
    q:"If 3x + 7 = 22, what is the value of 6x?",
    options:["5","10","25","30"],
    answer:3,
    explanation:"Solve: 3x = 15, so x = 5. Then 6x = **30**."
  },
  {
    id:"d_m2", courseId:"data", section:"math",
    q:"A survey of 200 students found that 45% prefer math over English. How many students prefer math?",
    options:["45","90","100","110"],
    answer:1,
    explanation:"45% of 200 = 0.45 × 200 = **90** students."
  },
  {
    id:"d_m3", courseId:"advanced", section:"math",
    q:"Which of the following is equivalent to (x + 3)² − 9?",
    options:["x² + 6x","x² + 9","x² + 6x + 9","x(x + 6)"],
    answer:3,
    explanation:"(x+3)² − 9 = x² + 6x + 9 − 9 = **x(x + 6)**."
  },
  {
    id:"d_m4", courseId:"geometry", section:"math",
    q:"A circle has a radius of 5. What is its area? (Use π ≈ 3.14)",
    options:["15.7","31.4","78.5","157"],
    answer:2,
    explanation:"Area = πr² = 3.14 × 25 = **78.5**."
  },
  {
    id:"d_m5", courseId:"algebra", section:"math",
    q:"If f(x) = 2x − 4, for what value of x does f(x) = 0?",
    options:["-4","-2","2","4"],
    answer:2,
    explanation:"Set 2x − 4 = 0 → 2x = 4 → x = **2**."
  },
  // ── READING & WRITING ──
  {
    id:"d_rw1", courseId:"english", section:"rw",
    passage:"The committee met on Tuesday to review the budget. ______ they approved the new spending plan unanimously.",
    q:"Which transition word best completes the sentence?",
    options:["However","Therefore","Although","Meanwhile"],
    answer:1,
    explanation:"**Therefore** signals a result — the review led to approval. The other choices create logical contradictions."
  },
  {
    id:"d_rw2", courseId:"craft", section:"rw",
    passage:"Marine biologist Dr. Elena Vasquez has spent fifteen years documenting deep-sea ecosystems. Her research reveals that bioluminescent organisms are far more common than previously believed.",
    q:"The primary purpose of this passage is to",
    options:[
      "argue that deep-sea research is underfunded",
      "introduce a researcher and summarize her findings",
      "compare bioluminescent species across ecosystems",
      "challenge previous scientific beliefs about marine life"
    ],
    answer:1,
    explanation:"The passage **introduces Dr. Vasquez and summarizes her key finding** — it doesn't argue, compare, or challenge."
  },
  {
    id:"d_rw3", courseId:"expression", section:"rw",
    passage:"The company's profits rose sharply last quarter. The CEO attributed this to the new marketing strategy.",
    q:"Which revision best combines these two sentences?",
    options:[
      "The company's profits rose sharply last quarter, and the CEO attributed this to the new marketing strategy.",
      "The company's profits rose sharply last quarter because the CEO's new marketing strategy.",
      "Sharply rising profits last quarter, the CEO's new marketing strategy was attributed.",
      "The CEO's new marketing strategy, profits rose sharply last quarter."
    ],
    answer:0,
    explanation:"Choice A **correctly joins two independent clauses** with a comma and coordinating conjunction."
  },
  {
    id:"d_rw4", courseId:"info", section:"rw",
    passage:"A study tracked 500 adults over 10 years. Those who exercised at least 3 times per week had a 40% lower risk of developing heart disease compared to sedentary participants.",
    q:"Which conclusion is best supported by the data?",
    options:[
      "Exercise eliminates the risk of heart disease",
      "Sedentary people will definitely develop heart disease",
      "Regular exercise is associated with reduced heart disease risk",
      "Only adults who exercise 3 times weekly stay healthy"
    ],
    answer:2,
    explanation:"The data shows **association**, not elimination or certainty. Choice C accurately reflects a 40% lower risk."
  },
  {
    id:"d_rw5", courseId:"english", section:"rw",
    q:"Which sentence is punctuated correctly?",
    options:[
      "The scientist who discovered penicillin, Alexander Fleming won the Nobel Prize.",
      "The scientist, who discovered penicillin Alexander Fleming, won the Nobel Prize.",
      "The scientist who discovered penicillin, Alexander Fleming, won the Nobel Prize.",
      "The scientist who discovered penicillin Alexander Fleming, won the Nobel Prize."
    ],
    answer:2,
    explanation:"**Alexander Fleming** is an appositive — a nonessential phrase that must be set off with **commas on both sides**."
  },
];

function DiagnosticQuiz({onComplete}) {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState([]); // [{courseId, correct}]
  const [phase, setPhase] = useState("quiz"); // "quiz" | "results"

  const q = DIAGNOSTIC_QUESTIONS[qIdx];
  const isLast = qIdx === DIAGNOSTIC_QUESTIONS.length - 1;
  const progress = (qIdx / DIAGNOSTIC_QUESTIONS.length) * 100;

  const handleSelect = (idx) => {
    if(revealed) return;
    setSelected(idx);
    setRevealed(true);
  };

  const handleNext = () => {
    const correct = selected === q.answer;
    const newResults = [...results, {courseId: q.courseId, section: q.section, correct}];

    if(isLast) {
      // Build seeded skillProgress from results
      const skillProgress = {};
      // Group by courseId
      const byCourse = {};
      newResults.forEach(r => {
        if(!byCourse[r.courseId]) byCourse[r.courseId] = {correct:0, total:0};
        byCourse[r.courseId].total++;
        if(r.correct) byCourse[r.courseId].correct++;
      });

      // For each course with results, seed ALL topics at a starter level
      Object.entries(byCourse).forEach(([courseId, stats]) => {
        const course = ALL_COURSES.find(c => c.id === courseId);
        if(!course) return;
        const pct = stats.correct / stats.total;
        // Seed each topic in this course with 3 attempts at appropriate accuracy
        course.topics.forEach(t => {
          const baseCorrect = pct >= 0.6 ? 2 : pct >= 0.4 ? 1 : 0;
          skillProgress[t.id] = {
            total: 3,
            correct: baseCorrect,
            history: Array(3).fill(baseCorrect > 0 ? 1 : 0).map((v,i) => i < baseCorrect ? 1 : 0)
          };
        });
      });

      setResults(newResults);
      onComplete(skillProgress, newResults);
    } else {
      setResults(newResults);
      setQIdx(i => i + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const mathCount  = results.filter(r => r.section==="math"  && r.correct).length;
  const rwCount    = results.filter(r => r.section==="rw"    && r.correct).length;
  const mathTotal  = results.filter(r => r.section==="math").length;
  const rwTotal    = results.filter(r => r.section==="rw").length;

  const OPTION_LABELS = ["A","B","C","D"];

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Header */}
      <div style={{background:T.navyDark,padding:"20px 24px 22px",flexShrink:0,position:"relative"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`repeating-linear-gradient(90deg,${T.goldBright} 0,${T.goldBright} 8px,${T.navyDark} 8px,${T.navyDark} 16px)`,opacity:0.6}}/>
        <div style={{position:"absolute",bottom:-1,left:0,right:0,height:14,background:T.bg,clipPath:"ellipse(55% 100% at 50% 100%)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,position:"relative",zIndex:2}}>
          <CompassLogo size={24}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:15,fontWeight:700,color:"white"}}>Skill Assessment</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.5)",letterSpacing:1,marginTop:1}}>QUESTION {qIdx+1} OF {DIAGNOSTIC_QUESTIONS.length}</div>
          </div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:T.goldBright}}>{qIdx+1}<span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>/{DIAGNOSTIC_QUESTIONS.length}</span></div>
        </div>
        {/* Progress bar */}
        <div style={{height:5,background:"rgba(255,255,255,0.12)",borderRadius:3,overflow:"hidden",position:"relative",zIndex:2}}>
          <div style={{width:`${progress}%`,height:"100%",background:T.goldBright,borderRadius:3,transition:"width 0.4s ease"}}/>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"20px 20px 12px"}}>
        {/* Section label */}
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:q.section==="math"?T.navyFaint:T.tealFaint,border:`1px solid ${q.section==="math"?T.navy:T.teal}30`,borderRadius:20,padding:"4px 10px",marginBottom:14}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:q.section==="math"?T.navy:T.teal}}/>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:q.section==="math"?T.navy:T.teal,letterSpacing:0.5,fontWeight:700}}>{q.section==="math"?"MATH":"READING & WRITING"}</span>
        </div>

        {/* Passage (if any) */}
        {q.passage&&(
          <div style={{background:T.surface,borderRadius:12,padding:"14px 16px",marginBottom:16,borderLeft:`3px solid ${T.teal}`}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:T.teal,letterSpacing:1,marginBottom:8}}>PASSAGE</div>
            <div style={{fontSize:14,color:T.textSecondary,lineHeight:1.75}}>{q.passage}</div>
          </div>
        )}

        {/* Question */}
        <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:16,padding:"18px",marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontSize:16,fontWeight:600,color:T.textPrimary,lineHeight:1.65}}>{q.q}</div>
        </div>

        {/* Answer choices */}
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
          {q.options.map((opt, idx) => {
            const isCorrect = idx === q.answer;
            const isSelected = idx === selected;
            let bg = "white", border = `1.5px solid ${T.border}`, color = T.textPrimary;
            if(revealed) {
              if(isCorrect)        { bg = "#ecfdf5"; border = `2px solid ${T.greenMid}`; color = T.green; }
              else if(isSelected)  { bg = "#fef2f2"; border = `2px solid #ef4444`; color = "#dc2626"; }
            } else if(isSelected) {
              border = `2px solid ${T.navy}`; bg = T.navyFaint;
            }
            return (
              <button key={idx} onClick={()=>handleSelect(idx)}
                style={{display:"flex",alignItems:"center",gap:12,background:bg,border,borderRadius:12,padding:"14px 16px",textAlign:"left",cursor:revealed?"default":"pointer",transition:"all 0.15s"}}>
                <div style={{width:28,height:28,borderRadius:7,background:revealed&&isCorrect?T.greenMid:revealed&&isSelected?"#ef4444":T.navy,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {revealed && isCorrect
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    : revealed && isSelected
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      : <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:"white"}}>{OPTION_LABELS[idx]}</span>
                  }
                </div>
                <span style={{fontSize:14,fontWeight:500,color,lineHeight:1.4}}>{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {revealed&&(
          <div className="explanation-in" style={{background:selected===q.answer?"#ecfdf5":"#fef2f2",border:`1.5px solid ${selected===q.answer?T.greenMid:"#fca5a5"}`,borderRadius:12,padding:"14px 16px",marginBottom:16}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,fontWeight:700,color:selected===q.answer?T.green:"#dc2626",letterSpacing:0.5,marginBottom:6}}>
              {selected===q.answer?"✓ CORRECT":"✗ INCORRECT"}
            </div>
            <BoldExplanation text={q.explanation} color={T.textSecondary}/>
          </div>
        )}

        {/* CTA */}
        {revealed&&(
          <button onClick={handleNext} style={{width:"100%",background:T.navy,color:"white",border:"none",borderRadius:14,padding:"17px",fontFamily:"'Poppins',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(30,58,95,0.3)"}}>
            {isLast ? "See My Results →" : "Next Question →"}
          </button>
        )}
        {!revealed&&(
          <div style={{textAlign:"center",fontFamily:"'Space Mono',monospace",fontSize:10,color:T.textMuted,letterSpacing:0.5,marginTop:8}}>
            TAP AN ANSWER TO CONTINUE
          </div>
        )}
        <div style={{height:12}}/>
      </div>
    </div>
  );
}

// ─── ONBOARDING ────────────────────────────────────────────────────────────────
function OnboardingScreen({step,setStep,name,setName,testDate,setTestDate,targetScore,setTargetScore,onDiagnosticComplete,onFinish}) {
  // step 0: name/date, step 1: target score, step 2: diagnostic quiz
  if(step===2) {
    return <DiagnosticQuiz onComplete={onDiagnosticComplete}/>;
  }
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:T.navyDark,padding:"28px 24px 24px",position:"relative",overflow:"hidden",flexShrink:0}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`repeating-linear-gradient(90deg,${T.goldBright} 0,${T.goldBright} 8px,${T.navyDark} 8px,${T.navyDark} 16px)`,opacity:0.6}}/>
        <div style={{position:"absolute",bottom:-1,left:0,right:0,height:18,background:T.bg,clipPath:"ellipse(55% 100% at 50% 100%)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,position:"relative",zIndex:2}}>
          <CompassLogo size={30}/>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:20,fontWeight:700,color:"#fff"}}>SAT Navigator</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.6)",letterSpacing:2}}>FULL SAT PREP</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,position:"relative",zIndex:2}}>
          {[0,1,2].map(i=>(
            <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=step?T.goldBright:"rgba(255,255,255,0.15)",transition:"background 0.3s"}}/>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"28px 24px 24px"}}>
        {step===0&&(
          <div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.textMuted,letterSpacing:1,marginBottom:10}}>STEP 1 OF 3</div>
            <div style={{fontSize:24,fontWeight:800,color:T.textPrimary,marginBottom:6,lineHeight:1.2}}>Welcome aboard</div>
            <div style={{fontSize:15,color:T.textSecondary,marginBottom:28,lineHeight:1.65}}>Let's personalize your SAT prep. First, a few basics.</div>
            <label style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.textMuted,letterSpacing:1,display:"block",marginBottom:8}}>YOUR NAME</label>
            <input type="text" placeholder="First name" value={name} onChange={e=>setName(e.target.value)}
              style={{marginBottom:20,width:"100%",border:`1.5px solid ${T.border}`,borderRadius:12,padding:"15px 16px",fontFamily:"'Poppins',sans-serif",fontSize:16,color:T.textPrimary,background:T.surface,outline:"none",boxSizing:"border-box"}}/>
            <label style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.textMuted,letterSpacing:1,display:"block",marginBottom:8}}>SAT TEST DATE</label>
            <input type="date" value={testDate} onChange={e=>setTestDate(e.target.value)}
              style={{marginBottom:32,width:"100%",border:`1.5px solid ${T.border}`,borderRadius:12,padding:"15px 16px",fontFamily:"'Poppins',sans-serif",fontSize:16,color:T.textPrimary,background:T.surface,outline:"none",boxSizing:"border-box"}}/>
            <button style={{width:"100%",background:T.navy,color:"#fff",border:"none",borderRadius:14,padding:"17px",fontFamily:"'Poppins',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer",opacity:(!name.trim()||!testDate)?0.4:1,boxShadow:"0 4px 14px rgba(30,58,95,0.3)"}}
              onClick={()=>setStep(1)} disabled={!name.trim()||!testDate}>Continue →</button>
          </div>
        )}
        {step===1&&(
          <div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.textMuted,letterSpacing:1,marginBottom:10}}>STEP 2 OF 3</div>
            <div style={{fontSize:24,fontWeight:800,color:T.textPrimary,marginBottom:6,lineHeight:1.2}}>What's your target score?</div>
            <div style={{fontSize:15,color:T.textSecondary,marginBottom:24,lineHeight:1.65}}>SAT scores range from 400–1600. Pick the score you're aiming for.</div>
            {[
              {score:"1200", label:"SOLID",       sub:"Top 74th percentile"},
              {score:"1350", label:"STRONG",       sub:"Top 91st percentile"},
              {score:"1450", label:"COMPETITIVE",  sub:"Top 96th percentile"},
              {score:"1500", label:"ELITE",        sub:"Top 98th percentile"},
              {score:"1550", label:"EXCEPTIONAL",  sub:"Top 99th percentile"},
              {score:"1600", label:"PERFECT",      sub:"Highest possible"},
            ].map(({score,label,sub})=>(
              <button key={score} onClick={()=>setTargetScore(score)}
                style={{width:"100%",background:targetScore===score?T.navy:T.surface,border:`1.5px solid ${targetScore===score?T.navy:T.border}`,borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",marginBottom:8,fontFamily:"inherit",transition:"all 0.15s"}}>
                <div>
                  <span style={{fontSize:18,fontWeight:700,color:targetScore===score?"#fff":T.textPrimary}}>{score}</span>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:targetScore===score?"rgba(255,255,255,0.6)":T.textMuted,display:"block",marginTop:2,letterSpacing:0.5}}>{sub}</span>
                </div>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,fontWeight:700,color:targetScore===score?"#f0c040":T.textMuted,letterSpacing:0.5}}>{label}</span>
              </button>
            ))}
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={()=>setStep(0)} style={{flex:1,background:T.surface,color:T.textPrimary,border:`1.5px solid ${T.border}`,borderRadius:14,padding:"16px",fontFamily:"'Poppins',sans-serif",fontSize:15,fontWeight:600,cursor:"pointer"}}>← Back</button>
              <button onClick={()=>setStep(2)} style={{flex:2,background:T.navy,color:"#fff",border:"none",borderRadius:14,padding:"16px",fontFamily:"'Poppins',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(30,58,95,0.3)"}}>
                Start Assessment →
              </button>
            </div>
            <div style={{textAlign:"center",marginTop:14,fontFamily:"'Space Mono',monospace",fontSize:9,color:T.textMuted,letterSpacing:0.5}}>
              NEXT: 10 QUICK QUESTIONS TO PERSONALIZE YOUR PLAN
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── PAYWALL MODAL ─────────────────────────────────────────────────────────────
const FREE_DAILY_LIMIT = 10;

function PaywallModal({onClose}) {
  const features = [
    {icon:"∞",  label:"Unlimited daily questions"},
    {icon:"🎯", label:"Full adaptive AI personalization"},
    {icon:"📊", label:"Detailed progress analytics"},
    {icon:"⏱️", label:"Timed sprint + full test modes"},
    {icon:"📚", label:"Complete strategy library"},
  ];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={onClose}>
      <div style={{background:"white",borderRadius:"24px 24px 0 0",padding:"28px 24px 36px",width:"100%",maxWidth:430,boxShadow:"0 -8px 40px rgba(0,0,0,0.2)"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:4,background:T.goldBright,borderRadius:2,margin:"0 auto 20px"}}/>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:32,marginBottom:8}}>🧭</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:20,fontWeight:700,color:T.navyDark,marginBottom:8}}>
            Keep the momentum going
          </div>
          <div style={{fontSize:15,color:T.textSecondary,lineHeight:1.6,marginBottom:12}}>
            You've done your 10 free questions for today. Upgrade and keep studying — your SAT isn't going to prep itself.
          </div>
          {/* Social proof */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:T.navyFaint,borderRadius:10,padding:"8px 14px"}}>
            <div style={{display:"flex"}}>
              {["#4a90d9","#e67e22","#27ae60","#8e44ad"].map((c,i)=>(
                <div key={i} style={{width:22,height:22,borderRadius:"50%",background:c,border:"2px solid white",marginLeft:i>0?-6:0,zIndex:4-i}}/>
              ))}
            </div>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.navy,letterSpacing:0.3}}>
              <strong>3,200+ students</strong> are prepping with Pro
            </span>
          </div>
        </div>
        <div style={{background:T.surface,borderRadius:14,padding:"14px 16px",marginBottom:20}}>
          {features.map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<features.length-1?`1px solid ${T.border}`:"none"}}>
              <span style={{width:22,textAlign:"center",fontSize:15}}>{f.icon}</span>
              <span style={{fontSize:14,color:T.textPrimary}}>{f.label}</span>
            </div>
          ))}
        </div>
        <button style={{width:"100%",background:T.navy,color:"white",border:"none",borderRadius:16,padding:"18px",fontFamily:"'Poppins',sans-serif",fontSize:17,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(30,58,95,0.3)",marginBottom:12}}
          onClick={()=>{
            const link = STRIPE_PAYMENT_LINK;
            if(link && link !== "PASTE_YOUR_STRIPE_PAYMENT_LINK_HERE") {
              window.open(link, "_blank");
            } else {
              alert("Stripe not configured yet — paste your payment link into STRIPE_PAYMENT_LINK in the code.");
            }
          }}>
          Unlock Unlimited — $9.99/mo
        </button>
        <button onClick={onClose}
          style={{width:"100%",background:"none",border:"none",color:T.textMuted,fontFamily:"'Poppins',sans-serif",fontSize:14,cursor:"pointer",padding:"8px"}}>
          Maybe later
        </button>
      </div>
    </div>
  );
}



// ─── SCORE MILESTONE MODAL ────────────────────────────────────────────────────
const SCORE_MILESTONES = [1000, 1100, 1200, 1300, 1400, 1500, 1550, 1600];

function MilestoneModal({score, prevScore, targetScore, onClose}) {
  const milestone = SCORE_MILESTONES.find(m => m > prevScore && score >= m) || score;
  const gap = Math.max(0, targetScore - score);
  const isTarget = score >= targetScore;
  const msgs = {
    1000: ["You're off the starting line.", "Every expert was once a beginner."],
    1100: ["Breaking four digits.", "You're building real momentum now."],
    1200: ["Solid middle ground.", "This is where real improvement begins."],
    1300: ["Above the national average.", "You're in the top half of test-takers."],
    1400: ["Strong territory.", "Most colleges will take notice of this score."],
    1500: ["Top 5% of test-takers.", "This opens doors to selective schools."],
    1550: ["Elite score.", "You're in rarefied air now."],
    1600: ["Perfect score.", "That's as good as it gets."],
  };
  const [headline, sub] = msgs[milestone] || ["New milestone!", "Keep going."];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 24px"}}
      onClick={onClose}>
      <div style={{background:"white",borderRadius:24,padding:"32px 28px 28px",width:"100%",maxWidth:380,textAlign:"center",boxShadow:"0 24px 60px rgba(0,0,0,0.35)"}}
        onClick={e=>e.stopPropagation()}>
        {/* Star burst */}
        <div style={{width:80,height:80,borderRadius:"50%",background:`linear-gradient(135deg,${T.gold},${T.goldBright})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",boxShadow:`0 8px 28px ${T.gold}55`,fontSize:36}}>
          🎯
        </div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.gold,letterSpacing:2,marginBottom:8}}>
          {isTarget ? "TARGET REACHED" : "NEW MILESTONE"}
        </div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:52,fontWeight:700,color:T.navyDark,lineHeight:1,marginBottom:4}}>
          {score}
        </div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.textMuted,letterSpacing:1,marginBottom:16}}>
          PREDICTED SAT SCORE
        </div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:17,fontWeight:700,color:T.navy,marginBottom:6}}>{headline}</div>
        <div style={{fontSize:14,color:T.textSecondary,lineHeight:1.6,marginBottom:20}}>{sub}</div>

        {!isTarget&&gap>0&&(
          <div style={{background:T.navyFaint,borderRadius:12,padding:"10px 16px",marginBottom:20}}>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.navy}}>
              <strong>{gap} points</strong> to your target of {targetScore}
            </span>
          </div>
        )}
        {isTarget&&(
          <div style={{background:"#f0fdf4",border:`1.5px solid ${T.green}`,borderRadius:12,padding:"10px 16px",marginBottom:20}}>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.green}}>
              🎉 You hit your target score!
            </span>
          </div>
        )}

        <button onClick={onClose}
          style={{width:"100%",background:T.navy,color:"white",border:"none",borderRadius:14,padding:"16px",fontFamily:"'Poppins',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer",marginBottom:10,boxShadow:"0 4px 14px rgba(30,58,95,0.3)"}}>
          Keep Going →
        </button>
        <button onClick={()=>{
          const text = `I just hit ${score} on SAT Navigator! ${gap>0?`${gap} points from my ${targetScore} target.`:"Hit my target score! 🎯"} #SATprep`;
          if(navigator.share) navigator.share({title:"SAT Score Milestone",text}).catch(()=>{});
          else navigator.clipboard?.writeText(text).then(()=>alert("Copied to clipboard!")).catch(()=>{});
        }} style={{width:"100%",background:"none",border:`1.5px solid ${T.border}`,borderRadius:14,padding:"13px",fontFamily:"'Poppins',sans-serif",fontSize:14,color:T.textSecondary,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share this milestone
        </button>
      </div>
    </div>
  );
}

// ─── GOAL COMPLETE MODAL ───────────────────────────────────────────────────────
function GoalCompleteModal({quota, streak, onClose}) {
  const msgs = [
    "You showed up. That's what matters.",
    "Consistency beats intensity every time.",
    "Another day closer to your target score.",
    "Your future self will thank you for this.",
    "Small steps. Big results.",
  ];
  const msg = msgs[Math.floor(Date.now()/86400000) % msgs.length];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 24px"}}
      onClick={onClose}>
      <div style={{background:"white",borderRadius:24,padding:"32px 28px",width:"100%",maxWidth:380,textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}
        onClick={e=>e.stopPropagation()}>
        {/* Animated checkmark */}
        <div style={{width:72,height:72,borderRadius:"50%",background:`linear-gradient(135deg,${T.green},${T.greenMid})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:`0 8px 24px ${T.green}44`}}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:22,fontWeight:700,color:T.navyDark,marginBottom:6}}>
          Daily Goal Done!
        </div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.green,letterSpacing:1,marginBottom:16}}>
          {quota} QUESTIONS · {streak>0?`${streak}-DAY STREAK 🔥`:"KEEP IT UP"}
        </div>
        <div style={{fontSize:15,color:T.textSecondary,lineHeight:1.65,marginBottom:24,fontStyle:"italic"}}>
          "{msg}"
        </div>
        {/* Divider */}
        <div style={{height:1,background:T.border,marginBottom:20}}/>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.textMuted,letterSpacing:0.5,marginBottom:16}}>
          COME BACK TOMORROW TO KEEP YOUR STREAK
        </div>
        <button onClick={onClose}
          style={{width:"100%",background:T.navy,color:"white",border:"none",borderRadius:14,padding:"16px",fontFamily:"'Poppins',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(30,58,95,0.3)"}}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

// ─── HOME SCREEN ───────────────────────────────────────────────────────────────
function HomeScreen({userData,daysLeft,skillProgress,setScreen,startPractice,strugglingTopics,setPracticeSection,studyPlan,studyPlanLoading,onRefreshPlan,todayQCount,wrongAnswers}) {
  const quota   = getDailyQuota(userData);
  const done    = todayQCount;
  const scrollRef = useRef(null);
  const [showPaywallHome, setShowPaywallHome] = useState(false);
  const [showGoalComplete, setShowGoalComplete] = useState(false);
  const prevDoneRef = useRef(done);
  useEffect(()=>{ if(scrollRef.current) scrollRef.current.scrollTop = 0; }, []);
  // Trigger celebration when quota is freshly hit
  useEffect(()=>{
    if(done >= quota && prevDoneRef.current < quota && quota > 0) {
      setShowGoalComplete(true);
    }
    prevDoneRef.current = done;
  }, [done, quota]);
  const scores  = getPredictedScore(skillProgress);
  const mathPct = getSectionMastery("math", skillProgress);
  const rwPct   = getSectionMastery("rw",   skillProgress);
  const status  = getScheduleStatus(done, quota);
  const focus   = getPriorityFocusTopic(userData, skillProgress, wrongAnswers||[]);
  const target  = parseInt(userData?.targetScore||"1400");
  const gap     = Math.max(0, target - scores.total);
  const rank    = getXpRank(userData?.xp||0);
  const toNext  = getXpToNext(userData?.xp||0);

  // Smart focus card — specific, data-driven insight
  const wrongCount = focus ? (wrongAnswers||[]).filter(w=>w.topicId===focus.id).length : 0;
  const recentWrong = focus ? (wrongAnswers||[]).filter(w=>w.topicId===focus.id&&w.date&&(Date.now()-new Date(w.date).getTime())<7*86400000).length : 0;
  const topicSP = focus ? (skillProgress[focus.id]||{total:0,correct:0}) : null;
  const topicAcc = topicSP&&topicSP.total>0 ? Math.round(topicSP.correct/topicSP.total*100) : null;
  const ptImpact = wrongCount>0 ? Math.round(wrongCount*9) : null;
  const mathGapPts = Math.max(0, Math.round((parseInt(userData?.targetScore||"1400")/2) - scores.math));
  const rwGapPts   = Math.max(0, Math.round((parseInt(userData?.targetScore||"1400")/2) - scores.rw));
  const weakerSection = scores.math < scores.rw ? "Math" : "R&W";

  let focusMsg="", focusReason="", focusSubInsight="";
  if(focus) {
    focusMsg = focus.name;
    if(recentWrong>=3) {
      focusReason = `Missed ${recentWrong}x this week — fix this first`;
      focusSubInsight = ptImpact ? `Worth ~${ptImpact} points on your score` : "";
    } else if(wrongCount>=5) {
      focusReason = `${wrongCount} wrong answers here overall`;
      focusSubInsight = `Your accuracy: ${topicAcc!==null?topicAcc+"%":"needs work"}`;
    } else if(focus.mastery==="struggling" && topicAcc!==null) {
      focusReason = `Only ${topicAcc}% accuracy — needs drilling`;
      focusSubInsight = focus.section==="math" ? `Math is ${mathGapPts} pts below target` : `R&W is ${rwGapPts} pts below target`;
    } else if(focus.mastery==="struggling") {
      focusReason = `Your weakest area in ${focus.section==="math"?"Math":"R&W"}`;
      focusSubInsight = `${weakerSection} needs the most work right now`;
    } else {
      focusReason = "Best topic to practice today";
      focusSubInsight = topicAcc!==null ? `Current accuracy: ${topicAcc}%` : "Keep building momentum";
    }
  }

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {showPaywallHome&&<PaywallModal onClose={()=>setShowPaywallHome(false)}/>}
      {showGoalComplete&&<GoalCompleteModal quota={quota} streak={userData?.streak||0} onClose={()=>setShowGoalComplete(false)}/>}

      {/* ── HEADER: minimal — logo + name + days left ── */}
      {(()=>{
        const urgent = daysLeft>0 && daysLeft<=14;
        const headerBg = urgent ? `linear-gradient(135deg,${T.rum},#a93226)` : T.navyDark;
        const stripColor = urgent ? "#f8d7da" : T.goldBright;
        return (
          <div style={{background:headerBg,padding:"14px 20px 18px",position:"relative",flexShrink:0,transition:"background 0.4s"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`repeating-linear-gradient(90deg,${stripColor} 0,${stripColor} 8px,transparent 8px,transparent 16px)`,opacity:0.6}}/>
            <div style={{position:"absolute",bottom:-1,left:0,right:0,height:14,background:T.bg,clipPath:"ellipse(55% 100% at 50% 100%)"}}/>
            {urgent&&(
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.7)",letterSpacing:1,marginBottom:6,position:"relative",zIndex:2}}>
                ⚠ FINAL STRETCH — MAKE EVERY SESSION COUNT
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",position:"relative",zIndex:2}}>
              <CompassLogo size={24}/>
              <div style={{marginLeft:10,flex:1}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:15,fontWeight:700,color:"white",lineHeight:1.1}}>Hey, {userData?.name||"Student"}</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.45)",letterSpacing:1,marginTop:2}}>{urgent?"TEST COMING UP SOON":"SAT NAVIGATOR"}</div>
              </div>
              {daysLeft>0 ? (
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:24,fontWeight:700,color:urgent?"#ffd6d6":"white",lineHeight:1}}>{daysLeft}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.45)",letterSpacing:1,marginTop:2}}>DAYS LEFT</div>
                </div>
              ) : (
                <button onClick={()=>setScreen("settings")} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 10px",color:"rgba(255,255,255,0.7)",fontFamily:"'Space Mono',monospace",fontSize:9,cursor:"pointer",letterSpacing:0.5}}>SET DATE</button>
              )}
            </div>
          </div>
        );
      })()}

      <div style={{flex:1,overflowY:"auto",padding:"16px 16px 8px"}} ref={scrollRef} className="scroll-body">

        {/* ── URGENCY BANNER — shown when test is <14 days away ── */}
        {daysLeft>0&&daysLeft<=14&&(
          <div style={{background:`linear-gradient(135deg,${T.rum},#a93226)`,borderRadius:14,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:20,flexShrink:0}}>🎯</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:14,fontWeight:700,color:"white",marginBottom:2}}>
                {daysLeft===1?"Test is tomorrow!":daysLeft<=3?`${daysLeft} days left — final push`:`${daysLeft} days left — stay focused`}
              </div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.7)",letterSpacing:0.3}}>
                {daysLeft<=3?"Review wrong answers and focus on your weakest topics":"Prioritize your weakest areas — every session counts now"}
              </div>
            </div>
          </div>
        )}

        {/* ── 1. TODAY'S FOCUS — the primary CTA, top of screen ── */}
        <div style={{background:`linear-gradient(135deg,${T.navy} 0%,#2a4f78 100%)`,borderRadius:18,marginBottom:14,overflow:"hidden",boxShadow:"0 4px 20px rgba(30,58,95,0.18)"}}>
          {/* Quota row */}
          <div style={{padding:"16px 18px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.5)",letterSpacing:1}}>TODAY'S GOAL</div>
              <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:20,fontWeight:700,color:done>=quota?T.greenMid:T.goldBright,lineHeight:1}}>{done}</span>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.4)"}}>/ {quota}</span>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:status.color,marginLeft:4}}>{status.label}</span>
              </div>
            </div>
            <div style={{height:5,background:"rgba(255,255,255,0.12)",borderRadius:3,overflow:"hidden",marginBottom:14}}>
              <div style={{width:`${Math.min(100,status.pct*100)}%`,height:"100%",background:done>=quota?T.greenMid:T.goldBright,borderRadius:3,transition:"width 0.4s"}}/>
            </div>

            {/* Focus action button */}
            {userData?.isPro ? (
              focus ? (
                <button onClick={()=>{startPractice(focus.courseId);setScreen("practice");}}
                  style={{width:"100%",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderLeft:`3px solid ${focus.courseColor||T.goldBright}`,borderRadius:12,padding:"13px 14px",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.5)",marginBottom:5,letterSpacing:1}}>FOCUS NOW</div>
                    <div style={{fontSize:17,fontWeight:700,color:"white",marginBottom:4,lineHeight:1.2}}>{focusMsg}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.6)"}}>{focusReason}</div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0,marginLeft:12}}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              ) : (
                <div style={{textAlign:"center",padding:"8px 0",color:"rgba(255,255,255,0.7)",fontSize:14}}>All caught up — keep it going!</div>
              )
            ) : (
              /* Free user — generic focus with Pro lock */
              <button onClick={()=>setShowPaywallHome(true)}
                style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderLeft:`3px solid ${T.goldBright}`,borderRadius:12,padding:"13px 14px",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.5)",letterSpacing:1}}>FOCUS NOW</div>
                    <div style={{background:T.goldBright,borderRadius:4,padding:"2px 5px",display:"flex",alignItems:"center",gap:3}}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill={T.navyDark} stroke="none"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                      <span style={{fontFamily:"'Space Mono',monospace",fontSize:7,fontWeight:700,color:T.navyDark,letterSpacing:0.3}}>PRO</span>
                    </div>
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:"rgba(255,255,255,0.5)",marginBottom:4,lineHeight:1.2}}>AI Study Plan</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.35)"}}>Upgrade to unlock personalized focus</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </button>
            )}
          </div>

          {/* Score bar at bottom of focus card */}
          <div style={{background:"rgba(0,0,0,0.18)",padding:"10px 18px",display:"flex",alignItems:"center",gap:16}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.4)",letterSpacing:0.5}}>MATH {mathPct}%</span>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.4)",letterSpacing:0.5}}>R&W {rwPct}%</span>
              </div>
              <div style={{height:3,background:"rgba(255,255,255,0.1)",borderRadius:2,overflow:"hidden",position:"relative"}}>
                <div style={{width:`${mathPct}%`,height:"100%",background:T.greenMid,borderRadius:2,transition:"width 0.6s"}}/>
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:gap>0?"#f0c040":T.greenMid,lineHeight:1}}>{scores.total}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.4)",marginTop:1}}>{gap>0?`${gap} to ${target}`:"on target"}</div>
            </div>
          </div>
        </div>

        {/* ── 2. STRUGGLING ALERT (only if relevant) ── */}
        {strugglingTopics.length>0&&(
          <div style={{background:T.rumFaint,border:`1.5px solid #f4a090`,borderRadius:12,padding:"11px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center",cursor:"pointer"}} onClick={()=>setScreen("review")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.rum} strokeWidth="2.5" style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div style={{flex:1}}>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:T.rum}}>{strugglingTopics.length} topic{strugglingTopics.length>1?"s":""} need work — </span>
              <span style={{fontSize:13,color:T.textSecondary}}>{strugglingTopics.slice(0,2).map(t=>t.name).join(", ")}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        )}

        {/* ── 3. QUICK ACTIONS — 4 tiles ── */}
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:T.textMuted,letterSpacing:1.5,marginBottom:10}}>QUICK ACTIONS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {[
            {svg:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>, label:"Practice", sub:"ADAPTIVE · AI", color:T.navy, bg:T.navyFaint, action:()=>setScreen("practice")},
            {svg:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label:"Timed Sprint", sub:"RACE THE CLOCK", color:T.rum, bg:T.rumFaint, action:()=>setScreen("tests")},
            {svg:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, label:"Full Test", sub:"SIMULATE SAT", color:T.purple, bg:T.purpleFaint, action:()=>setScreen("tests")},
            {svg:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.44"/></svg>, label:"Review", sub:"WRONG ANSWERS", color:T.gold, bg:T.goldFaint, action:()=>setScreen("review")},
          ].map(m=>(
            <button key={m.label} onClick={m.action} className="card-hover" style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:14,padding:"14px 12px",textAlign:"left",cursor:"pointer",position:"relative",overflow:"hidden",boxShadow:"0 2px 6px rgba(0,0,0,0.06)"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:m.color,borderRadius:"14px 14px 0 0"}}/>
              <div style={{width:34,height:34,borderRadius:9,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center",color:m.color,marginBottom:8,marginTop:2}}>{m.svg}</div>
              <div style={{fontSize:14,fontWeight:700,color:T.textPrimary,marginBottom:2}}>{m.label}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:m.color,letterSpacing:0.5}}>{m.sub}</div>
            </button>
          ))}
        </div>

        {/* ── 4. XP / RANK — lives here not in header ── */}
        <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:14,padding:"14px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",cursor:"pointer"}} onClick={()=>setScreen("progress")}>
          <div style={{width:40,height:40,borderRadius:12,background:T.navyFaint,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{rank.icon}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
              <span style={{fontFamily:"'Cinzel',serif",fontSize:14,fontWeight:700,color:T.navy}}>{rank.label}</span>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:T.gold}}>{userData?.xp||0} XP</span>
            </div>
            {toNext&&(
              <>
                <div style={{height:4,background:T.border,borderRadius:2,overflow:"hidden"}}>
                  <div style={{width:`${toNext.progress*100}%`,height:"100%",background:T.gold,borderRadius:2,transition:"width 0.4s"}}/>
                </div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:T.textMuted,marginTop:3,letterSpacing:0.5}}>{toNext.next.min - (userData?.xp||0)} XP TO {toNext.next.label.toUpperCase()}</div>
              </>
            )}
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>

        {/* Upgrade banner */}
        {!userData?.isPro&&(
          <button onClick={()=>setShowPaywallHome(true)}
            style={{width:"100%",display:"flex",alignItems:"center",gap:14,background:`linear-gradient(135deg,${T.navyDark},${T.navy})`,border:"none",borderRadius:16,padding:"16px 18px",cursor:"pointer",marginTop:4,textAlign:"left"}}>
            <div style={{width:42,height:42,borderRadius:10,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:20}}>🧭</span>
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:14,fontWeight:700,color:"white",marginBottom:3}}>Upgrade to Pro</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.55)",letterSpacing:0.5}}>UNLIMITED QUESTIONS · FULL FEATURES</div>
            </div>
            <div style={{background:T.goldBright,borderRadius:8,padding:"6px 10px",flexShrink:0}}>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:T.navyDark,letterSpacing:0.5}}>$9.99/MO</span>
            </div>
          </button>
        )}

        <div style={{height:8}}/>
      </div>
      <BottomNav screen="home" setScreen={setScreen}/>
    </div>
  );
}


// ─── LESSON SCREEN (5-phase guided lesson) ─────────────────────────────────────
function LessonScreen({pendingCourseId,pendingTopic,conceptData,conceptLoading,skillProgress,onConceptDone,onConceptSkip,setPracticeMode,setScreen}) {
  const [lessonPhase, setLessonPhase] = useState("intro");
  const [lessonQ, setLessonQ] = useState(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonSelected, setLessonSelected] = useState(null);
  const [lessonCorrect, setLessonCorrect] = useState(null);
  const [lessonScore, setLessonScore] = useState({correct:0,total:0});
  const [lessonHistory, setLessonHistory] = useState([]);

  const course = ALL_COURSES.find(c=>c.id===pendingCourseId);
  const phases = ["intro","scaffold1","scaffold2","bridge","cold","summary"];
  const phaseIdx = phases.indexOf(lessonPhase);
  const phaseLabels = ["Intro","Practice 1","Practice 2","Challenge","Cold Test","Summary"];

  const loadLessonQ = useCallback(async(phase) => {
    if(phase==="intro"||phase==="summary") return;
    setLessonLoading(true);
    setLessonSelected(null);
    setLessonCorrect(null);
    const hint = phase==="scaffold1"||phase==="scaffold2";
    try {
      const q = course?.section==="rw"
        ? await generateRWQuestion(pendingCourseId, pendingTopic, skillProgress, lessonHistory)
        : await generateMathQuestion(pendingCourseId, pendingTopic, skillProgress, lessonHistory);
      setLessonQ({...q, showHintAuto: hint});
      setLessonHistory(h=>[...h,{text:q.q.substring(0,60),type:"lesson"}]);
    } catch(e) {
      const fb = ALL_FALLBACKS[pendingTopic?.id]||ALL_FALLBACKS["linear_eq"];
      setLessonQ({...fb[0], showHintAuto: hint});
    }
    setLessonLoading(false);
  }, [pendingCourseId, pendingTopic, skillProgress, lessonHistory, course]);

  useEffect(()=>{ loadLessonQ(lessonPhase); },[lessonPhase]);

  const advanceLesson = () => setLessonPhase(phases[phaseIdx+1]);

  const handleLessonAnswer = (idx) => {
    if(lessonSelected!==null) return;
    setLessonSelected(idx);
    const correct = idx===lessonQ.answer;
    setLessonCorrect(correct);
    setLessonScore(s=>({correct:s.correct+(correct?1:0),total:s.total+1}));
  };

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <NavHeader title="Learn the Concept" subtitle={pendingTopic?.name?.toUpperCase()} back backFn={()=>{ setPracticeMode(null); }}
        right={<button onClick={onConceptSkip} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:8,padding:"6px 12px",color:"white",fontFamily:"'Space Mono',monospace",fontSize:11,cursor:"pointer"}}>SKIP →</button>}/>
      {/* Phase stepper */}
      <div style={{background:T.surface,padding:"10px 16px 12px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          {phaseLabels.map((l,i)=>(
            <div key={l} style={{flex:1,textAlign:"center"}}>
              <div style={{width:26,height:26,borderRadius:"50%",margin:"0 auto 3px",display:"flex",alignItems:"center",justifyContent:"center",
                background:i<phaseIdx?T.green:i===phaseIdx?T.navy:"white",
                border:`2px solid ${i<phaseIdx?T.green:i===phaseIdx?T.navy:T.border}`,
                fontSize:11,fontWeight:700,color:i<=phaseIdx?"white":T.textMuted}}>
                {i<phaseIdx?"✓":i+1}
              </div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:i===phaseIdx?T.navy:T.textMuted}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"16px 16px 8px"}}>
        {/* INTRO */}
        {lessonPhase==="intro"&&conceptLoading&&(
          <div style={{textAlign:"center",padding:"60px 0"}}>
            <div style={{width:36,height:36,border:`3px solid ${T.navyFaint}`,borderTopColor:T.navy,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}}/>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:17,color:T.navy,marginBottom:6}}>Preparing your lesson…</div>
          </div>
        )}
        {lessonPhase==="intro"&&!conceptLoading&&conceptData&&(
          <>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:44,height:44,borderRadius:12,background:`${course?.color||T.navy}18`,border:`1.5px solid ${course?.color||T.navy}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{course?.icon||""}</div>
              <div>
                <div style={{fontSize:17,fontWeight:700,color:T.textPrimary}}>{pendingTopic?.name}</div>
                <div style={{fontSize:14,color:T.textMuted}}>{course?.name}</div>
              </div>
            </div>
            <div style={{background:"white",border:`1.5px solid ${T.border}`,borderLeft:`4px solid ${course?.color||T.navy}`,borderRadius:14,padding:"16px",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:18}}>💡</span>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:course?.color||T.navy}}>THE CONCEPT</div>
              </div>
              <div style={{fontSize:16,color:T.textPrimary,lineHeight:1.7}}>{conceptData.concept}</div>
            </div>
            <div style={{background:T.navyFaint,border:`1.5px solid ${T.border}`,borderRadius:14,padding:"16px",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:18}}>✏️</span>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:T.navy}}>WORKED EXAMPLE</div>
              </div>
              <div style={{fontSize:15,fontWeight:700,color:T.textPrimary,marginBottom:12,padding:"10px 12px",background:"white",borderRadius:10,border:`1px solid ${T.border}`}}>{conceptData.example?.problem}</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {conceptData.example?.steps?.map((step,i)=>(
                  <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:T.navy,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,flexShrink:0,marginTop:1}}>{i+1}</div>
                    <div style={{fontSize:14,color:T.textPrimary,lineHeight:1.6,flex:1}}>{step}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:T.rumFaint,border:`1.5px solid #f4a090`,borderRadius:14,padding:"16px",marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:18}}>⚠️</span>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:T.rum}}>COMMON MISTAKE</div>
              </div>
              <div style={{fontSize:15,color:T.textPrimary,lineHeight:1.6}}>{conceptData.mistake}</div>
            </div>
            <button onClick={advanceLesson} style={{width:"100%",background:T.navy,color:"#fff",border:"none",borderRadius:14,padding:"17px",fontFamily:"'Poppins',sans-serif",fontSize:17,fontWeight:700,cursor:"pointer",marginBottom:8}}>
              Start Practicing →
            </button>
          </>
        )}

        {/* QUESTION PHASES */}
        {(lessonPhase==="scaffold1"||lessonPhase==="scaffold2"||lessonPhase==="bridge"||lessonPhase==="cold")&&(
          <>
            <div style={{background:lessonPhase==="cold"?T.rumFaint:lessonPhase==="bridge"?T.goldFaint:T.navyFaint,border:`1.5px solid ${lessonPhase==="cold"?"#f4a090":lessonPhase==="bridge"?T.goldBright:T.border}`,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>{lessonPhase==="cold"?"🎯":lessonPhase==="bridge"?"🌉":"🤝"}</span>
              <div style={{fontSize:14,fontWeight:700,color:lessonPhase==="cold"?T.rum:lessonPhase==="bridge"?T.gold:T.navy}}>
                {lessonPhase==="scaffold1"?"Guided Practice — hints shown":lessonPhase==="scaffold2"?"Guided Practice — one more with support":lessonPhase==="bridge"?"Challenge — hint available if needed":"Cold Test — no hints!"}
              </div>
            </div>
            {lessonLoading&&(
              <div style={{textAlign:"center",padding:"40px 0"}}>
                <div style={{width:28,height:28,border:`2.5px solid ${T.navyFaint}`,borderTopColor:T.navy,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
                <div style={{fontSize:14,color:T.textMuted}}>Loading question…</div>
              </div>
            )}
            {!lessonLoading&&lessonQ&&(
              <>
                {lessonQ.showHintAuto&&lessonQ.hint&&lessonSelected===null&&(
                  <div style={{background:T.goldFaint,border:`1.5px solid ${T.goldBright}`,borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:T.gold,marginBottom:6}}>💡 HINT</div>
                    <div style={{fontSize:15,color:T.textPrimary,lineHeight:1.6}}>{lessonQ.hint}</div>
                  </div>
                )}
                {lessonQ.passage&&(
                  <div style={{background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"14px",marginBottom:14}}>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:T.textMuted,letterSpacing:1,marginBottom:8}}>PASSAGE</div>
                    <div style={{fontSize:15,color:T.textPrimary,lineHeight:1.7}}>{lessonQ.passage}</div>
                  </div>
                )}
                <div style={{fontSize:17,color:T.textPrimary,lineHeight:1.7,marginBottom:16,fontWeight:500}}>{lessonQ.q}</div>
                {lessonQ.options?.map((opt,i)=>{
                  let cls="default";
                  if(lessonSelected!==null){if(i===lessonQ.answer)cls="correct";else if(i===lessonSelected)cls="wrong";else cls="disabled";}
                  return (
                    <button key={i} disabled={lessonSelected!==null} onClick={()=>handleLessonAnswer(i)}
                      style={{display:"block",width:"100%",textAlign:"left",borderRadius:12,padding:"15px 18px",marginBottom:9,fontFamily:"'Poppins',sans-serif",fontSize:17,cursor:lessonSelected!==null?"default":"pointer",
                        background:cls==="correct"?T.greenFaint:cls==="wrong"?T.rumFaint:cls==="disabled"?"rgba(240,234,224,0.5)":"white",
                        border:`1.5px solid ${cls==="correct"?T.greenMid:cls==="wrong"?"#f4a090":T.border}`,
                        color:cls==="correct"?T.green:cls==="wrong"?T.rum:T.textPrimary,
                        fontWeight:cls==="correct"?700:400,opacity:cls==="disabled"?0.45:1}}>
                      <span style={{fontFamily:"'Space Mono',monospace",fontSize:15,marginRight:8,opacity:0.6}}>{String.fromCharCode(65+i)}.</span>{opt}
                    </button>
                  );
                })}
                {lessonSelected!==null&&(
                  <div style={{background:lessonCorrect?T.greenFaint:T.rumFaint,border:`1.5px solid ${lessonCorrect?T.greenMid:"#f4a090"}`,borderRadius:12,padding:"14px",marginBottom:12}}>
                    <div style={{fontWeight:700,color:lessonCorrect?T.green:T.rum,marginBottom:6,fontSize:17}}>
                      {lessonCorrect?"✓ Correct!":"✗ Not quite — "+String.fromCharCode(65+lessonQ.answer)+" is correct"}
                    </div>
                    <BoldExplanation text={lessonQ.explanation} style={{fontSize:15,color:T.textSecondary,lineHeight:1.6,display:"block"}}/>
                  </div>
                )}
                {lessonSelected!==null&&(
                  <button onClick={advanceLesson} style={{width:"100%",background:T.navy,color:"#fff",border:"none",borderRadius:14,padding:"16px",fontFamily:"'Poppins',sans-serif",fontSize:17,fontWeight:700,cursor:"pointer",marginBottom:8}}>
                    {lessonPhase==="cold"?"See Results →":"Next →"}
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* SUMMARY */}
        {lessonPhase==="summary"&&(
          <div style={{textAlign:"center",paddingTop:20}}>
            <div style={{fontSize:52,marginBottom:12}}>{lessonScore.correct>=4?"🎉":lessonScore.correct>=2?"👍":""}</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:24,fontWeight:700,color:T.navy,marginBottom:6}}>Lesson Complete!</div>
            <div style={{fontSize:15,color:T.textSecondary,marginBottom:24}}>You got {lessonScore.correct} out of {lessonScore.total} right.</div>
            <div style={{background:`linear-gradient(135deg,${T.navy},#2d547f)`,borderRadius:16,padding:"20px",marginBottom:20,textAlign:"left"}}>
              <div style={{display:"flex",justifyContent:"space-around",marginBottom:12}}>
                {[{label:"SCORE",val:`${lessonScore.correct}/${lessonScore.total}`},{label:"STATUS",val:lessonScore.correct>=3?"READY":"REVIEW"}].map(s=>(
                  <div key={s.label} style={{textAlign:"center"}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:22,fontWeight:700,color:"white"}}>{s.val}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.65)",marginTop:3}}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:14,color:"rgba(255,255,255,0.85)",lineHeight:1.6}}>
                {lessonScore.correct>=4?"Excellent! You're ready to practice independently.":lessonScore.correct>=2?"Good start — keep practicing.":"This topic needs more work — we'll keep focusing here."}
              </div>
            </div>
            <button onClick={onConceptDone} style={{width:"100%",background:T.navy,color:"#fff",border:"none",borderRadius:14,padding:"17px",fontFamily:"'Poppins',sans-serif",fontSize:17,fontWeight:700,cursor:"pointer",marginBottom:10}}>
              Continue Practicing →
            </button>
            <button onClick={()=>setPracticeMode(null)} style={{width:"100%",background:"white",color:T.textMuted,border:`1.5px solid ${T.border}`,borderRadius:14,padding:"14px",fontFamily:"'Poppins',sans-serif",fontSize:15,cursor:"pointer"}}>
              Back to Course List
            </button>
          </div>
        )}
        <div style={{height:16}}/>
      </div>
      <BottomNav screen="practice" setScreen={setScreen}/>
    </div>
  );
}

// ─── PRACTICE SCREEN ───────────────────────────────────────────────────────────
function PracticeScreen({practiceMode,setPracticeMode,practiceSection,setPracticeSection,selectedCourse,currentQ,currentTopic,selectedAnswer,showExplanation,sessionStats,selectAnswer,nextQuestion,startPractice,skillProgress,setScreen,showHint,setShowHint,hintUsed,setHintUsed,qLoading,qError,conceptData,conceptLoading,pendingTopic,pendingCourseId,onConceptDone,onConceptSkip,errorType,setErrorType,showErrorPrompt,setShowErrorPrompt,inlineTip,setInlineTip,tipLoading}) {
  const course = ALL_COURSES.find(c=>c.id===selectedCourse);

  // ── LESSON MODE ──
  if(practiceMode==="concept") {
    return <LessonScreen
      pendingCourseId={pendingCourseId}
      pendingTopic={pendingTopic}
      conceptData={conceptData}
      conceptLoading={conceptLoading}
      skillProgress={skillProgress}
      onConceptDone={onConceptDone}
      onConceptSkip={onConceptSkip}
      setPracticeMode={setPracticeMode}
      setScreen={setScreen}
    />;
  }


  if(practiceMode===null) {
    const mathCourses = MATH_COURSES;
    const rwCourses   = RW_COURSES;
    // Which sections to show based on practiceSection filter
    const showMath = !practiceSection || practiceSection==="math";
    const showRW   = !practiceSection || practiceSection==="rw";

    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <NavHeader title={practiceSection==="math"?"Math Practice":practiceSection==="rw"?"Reading & Writing":"Practice"} subtitle="CHOOSE A SUBJECT" back backFn={()=>{setPracticeSection(null);setScreen("home");}}/>
        {/* Section filter pills */}
        <div style={{display:"flex",gap:6,padding:"10px 16px 8px",background:"white",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          {[{id:null,label:"All"},{id:"math",label:"Math"},{id:"rw",label:" R&W"}].map(f=>(
            <button key={String(f.id)} onClick={()=>setPracticeSection(f.id)} style={{background:practiceSection===f.id?T.navy:"white",color:practiceSection===f.id?"white":T.textMuted,border:`1.5px solid ${practiceSection===f.id?T.navy:T.border}`,borderRadius:20,padding:"8px 14px",fontFamily:"'Space Mono',monospace",fontSize:11,letterSpacing:0.5,cursor:"pointer",transition:"all 0.15s"}}>{f.label}</button>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 16px 8px"}}>
          {showMath&&(
            <>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{height:14,width:3,background:T.navy,borderRadius:2}}/>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:T.navy,letterSpacing:0.5}}>MATH</div>
                <div style={{flex:1,height:1,background:T.border}}/>
              </div>
              {mathCourses.map(c=>{
                const prog = getCourseProgress(c.id,skillProgress);
                return (
                  <button key={c.id} onClick={()=>startPractice(c.id)} style={{width:"100%",background:"white",border:`1.5px solid ${T.border}`,borderRadius:14,padding:"16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",textAlign:"left"}}>
                    <CourseIcon id={c.id} color={c.color} size={42}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:15,fontWeight:700,color:T.textPrimary,marginBottom:3,lineHeight:1.3}}>{c.name}</div>
                      <ProgressBar pct={prog.pct} color={c.color} height={4}/>
                      <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.textMuted,marginTop:3,letterSpacing:0}}>{prog.mastered} mastered · {prog.new} new</div>
                    </div>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:16,fontWeight:700,color:c.color,flexShrink:0}}>{prog.pct}%</div>
                  </button>
                );
              })}
            </>
          )}

          {showRW&&(
            <>
              <div style={{display:"flex",alignItems:"center",gap:8,margin:`${showMath?"14px":"0"} 0 10px`}}>
                <div style={{height:14,width:3,background:T.teal,borderRadius:2}}/>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:T.teal,letterSpacing:0.5}}>READING & WRITING</div>
                <div style={{flex:1,height:1,background:T.border}}/>
              </div>
              {rwCourses.map(c=>{
                const prog = getCourseProgress(c.id,skillProgress);
                return (
                  <button key={c.id} onClick={()=>startPractice(c.id)} style={{width:"100%",background:"white",border:`1.5px solid ${T.border}`,borderRadius:14,padding:"16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",textAlign:"left"}}>
                    <CourseIcon id={c.id} color={c.color} size={42}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:15,fontWeight:700,color:T.textPrimary,marginBottom:3,lineHeight:1.3}}>{c.name}</div>
                      <ProgressBar pct={prog.pct} color={c.color} height={4}/>
                      <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.textMuted,marginTop:3,letterSpacing:0}}>{prog.mastered} mastered · {prog.new} new</div>
                    </div>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:16,fontWeight:700,color:c.color,flexShrink:0}}>{prog.pct}%</div>
                  </button>
                );
              })}
            </>
          )}
          <div style={{height:8}}/>
        </div>
        <BottomNav screen="practice" setScreen={setScreen}/>
      </div>
    );
  }

  // Question mode
  const tier = currentTopic ? getTopicMastery(skillProgress?.[currentTopic.id]) : "new";
  const mc = MASTERY_COLORS[tier];
  const isRW = course?.section === "rw";

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <NavHeader
        title={course?.name||"Practice"}
        subtitle={currentTopic?.name?.toUpperCase()}
        back backFn={()=>{setPracticeMode(null);}}
        right={<MasteryChip tier={tier}/>}
      />
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px 8px"}}>
        {/* Session stats */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {[
            {label:"CORRECT",val:sessionStats.correct,bg:T.greenFaint,col:T.green},
            {label:"TOTAL",  val:sessionStats.total,  bg:T.navyFaint, col:T.navy},
            {label:"ACC%",   val:sessionStats.total>0?Math.round(sessionStats.correct/sessionStats.total*100)+"%":"—",bg:T.goldFaint,col:T.gold},
          ].map(s=>(
            <div key={s.label} style={{flex:1,background:s.bg,borderRadius:10,padding:"12px 8px",textAlign:"center"}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:s.col,lineHeight:1}}>{s.val}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:s.col,marginTop:3,letterSpacing:0}}>{s.label}</div>
            </div>
          ))}
        </div>

        {qError&&<div style={{display:"flex",alignItems:"center",gap:6,background:"#f0f4ff",border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 12px",marginBottom:10}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.textMuted}}>Offline mode · local question</span>
          </div>}

        {qLoading&&(
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{width:32,height:32,border:`3px solid ${T.navyFaint}`,borderTopColor:T.navy,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:17,color:T.textMuted}}>Generating question…</div>
          </div>
        )}

        {!qLoading&&currentQ&&(
          <>
            {/* RW passage */}
            {isRW&&currentQ.passage&&(
              <div style={{background:"#f8f4ef",border:`1.5px solid ${T.border}`,borderRadius:12,padding:"16px 16px",marginBottom:12}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:T.textMuted,letterSpacing:1,marginBottom:8}}>PASSAGE</div>
                <div style={{fontSize:17,color:T.textPrimary,lineHeight:1.7,fontStyle:"italic"}}>{currentQ.passage}</div>
              </div>
            )}

            {/* Question */}
            <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:16,padding:"20px",marginBottom:14,boxShadow:"0 2px 10px rgba(0,0,0,0.07)"}}>
              {currentQ.passage&&(
                <div style={{background:T.surface2,borderRadius:10,padding:"12px 14px",marginBottom:14,borderLeft:`3px solid ${T.teal}`}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:T.teal,letterSpacing:1,marginBottom:6}}>PASSAGE</div>
                  <div style={{fontSize:14,color:T.textSecondary,lineHeight:1.7}}>{currentQ.passage}</div>
                </div>
              )}
              <div style={{fontSize:16,fontWeight:600,color:T.textPrimary,lineHeight:1.7}}>{currentQ.q}</div>
              {currentQ.source==="opensat"&&(
                <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:4,background:T.tealFaint,borderRadius:6,padding:"3px 7px"}}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={T.teal} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:T.teal,letterSpacing:0.5}}>REAL SAT QUESTION</span>
                </div>
              )}
            </div>

            {/* Hint */}
            {currentQ.hint&&selectedAnswer===null&&(
              <div style={{marginBottom:10}}>
                {!showHint?(
                  <button onClick={()=>{setShowHint(true);setHintUsed(true);}} style={{width:"100%",background:T.goldFaint,border:`1.5px solid ${T.goldBright}40`,borderRadius:10,padding:"10px",fontFamily:"'Space Mono',monospace",fontSize:11,color:T.gold,fontWeight:700,cursor:"pointer",letterSpacing:0.5}}>SHOW HINT  ·  −5 XP</button>
                ):(
                  <div style={{background:T.goldFaint,border:`1.5px solid ${T.goldBright}`,borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:17,color:T.gold,fontWeight:700,marginBottom:4}}>HINT {hintUsed&&"(−5 XP)"}</div>
                    <div style={{fontSize:17,color:T.textSecondary}}>{currentQ.hint}</div>
                  </div>
                )}
              </div>
            )}

            {/* Answers */}
            {currentQ.options.map((opt,i)=>{
              let cls = "";
              if(selectedAnswer!==null) {
                if(i===currentQ.answer) cls = "correct";
                else if(i===selectedAnswer) cls = "wrong";
                else cls = "disabled";
              }
              return (
                <button key={i} disabled={selectedAnswer!==null} onClick={()=>selectAnswer(i)}
                  className={cls==="correct"?"answer-correct":cls==="wrong"?"answer-wrong":""}
                  style={{display:"flex",width:"100%",alignItems:"center",gap:12,textAlign:"left",borderRadius:14,padding:"15px 16px",marginBottom:8,fontFamily:"'Poppins',sans-serif",fontSize:15,cursor:selectedAnswer!==null?"default":"pointer",transition:"border-color 0.15s, background 0.15s",
                    background:cls==="correct"?T.greenFaint:cls==="wrong"?T.rumFaint:cls==="disabled"?"rgba(240,234,224,0.4)":"white",
                    border:`2px solid ${cls==="correct"?T.greenMid:cls==="wrong"?"#e8746a":cls==="disabled"?T.border:"#e0d5c5"}`,
                    color:cls==="correct"?T.green:cls==="wrong"?T.rum:T.textPrimary,
                    fontWeight:cls==="correct"||cls==="wrong"?700:400,
                    opacity:cls==="disabled"?0.4:1,
                    boxShadow:cls===""?"0 1px 4px rgba(0,0,0,0.05)":"none",
                  }}>
                  <div style={{width:28,height:28,borderRadius:8,background:cls==="correct"?T.greenMid:cls==="wrong"?"#e8746a":cls==="disabled"?T.border:T.navyFaint,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:cls==="correct"||cls==="wrong"?"white":T.navy}}>{String.fromCharCode(65+i)}</span>
                  </div>
                  <span style={{flex:1,lineHeight:1.4}}>{opt}</span>
                  {cls==="correct"&&<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  {cls==="wrong"&&<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.rum} strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                </button>
              );
            })}

            {/* Explanation */}
            {showExplanation&&(
              <div className="explanation-in" style={{background:selectedAnswer===currentQ.answer?T.greenFaint:T.rumFaint,border:`2px solid ${selectedAnswer===currentQ.answer?T.greenMid:"#e8746a"}`,borderRadius:16,padding:"16px",marginTop:4,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  {selectedAnswer===currentQ.answer
                    ? <><div style={{width:24,height:24,borderRadius:"50%",background:T.greenMid,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div><span style={{fontWeight:700,color:T.green,fontSize:15}}>Correct!</span></>
                    : <><div style={{width:24,height:24,borderRadius:"50%",background:"#e8746a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div><span style={{fontWeight:700,color:T.rum,fontSize:15}}>Answer: {String.fromCharCode(65+currentQ.answer)}. {currentQ.options[currentQ.answer]}</span></>
                  }
                </div>
                <BoldExplanation text={currentQ.explanation} style={{fontSize:14,color:T.textSecondary,lineHeight:1.65,display:"block"}}/>
              </div>
            )}

            {/* Error analysis + follow-up loop */}
            {showErrorPrompt&&selectedAnswer!==null&&selectedAnswer!==currentQ.answer&&(
              <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:14,padding:"16px",marginTop:8,marginBottom:8}}>
                {!errorType?(
                  <>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:T.textMuted,marginBottom:10}}>WHY DID YOU GET THIS WRONG?</div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {[
                        {id:"concept",  icon:"🧠", label:"Concept gap",      sub:"I didn't understand the topic"},
                        {id:"careless", icon:"😬", label:"Careless mistake", sub:"I knew it but made an error"},
                        {id:"timing",   icon:"⏱️", label:"Ran out of time",  sub:"I didn't have time to think"},
                      ].map(e=>(
                        <button key={e.id} onClick={()=>setErrorType(e.id)}
                          style={{display:"flex",alignItems:"center",gap:12,background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"12px",cursor:"pointer",textAlign:"left"}}>
                          <span style={{fontSize:20,flexShrink:0}}>{e.icon}</span>
                          <div>
                            <div style={{fontSize:15,fontWeight:700,color:T.textPrimary}}>{e.label}</div>
                            <div style={{fontSize:13,color:T.textMuted,marginTop:1}}>{e.sub}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ):(
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                      <span style={{fontSize:20}}>{errorType==="concept"?"🧠":errorType==="careless"?"😬":"⏱️"}</span>
                      <div style={{fontSize:14,color:T.textSecondary,flex:1,lineHeight:1.5}}>
                        {errorType==="concept"?"Concept gap noted. Try another question on this topic to reinforce it.":
                         errorType==="careless"?"Careless mistake noted. Slow down and read carefully next time.":
                         "Timing issue noted. Pace yourself — mark and move on when stuck."}
                      </div>
                    </div>
                    <button onClick={nextQuestion}
                      style={{width:"100%",background:T.navyFaint,color:T.navy,border:`1.5px solid ${T.navy}`,borderRadius:12,padding:"13px",fontFamily:"'Poppins',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:8}}>
                      Try a similar question →
                    </button>
                    <button onClick={()=>{setErrorType(null);setShowErrorPrompt(false);nextQuestion();}}
                      style={{width:"100%",background:"white",color:T.textMuted,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"11px",fontFamily:"'Poppins',sans-serif",fontSize:14,cursor:"pointer"}}>
                      Move on to next topic
                    </button>
                  </div>
                )}
              </div>
            )}

            {selectedAnswer!==null&&(selectedAnswer===currentQ.answer||!showErrorPrompt)&&(
              <button onClick={nextQuestion} style={{width:"100%",background:T.navy,color:"#fff",border:"none",borderRadius:14,padding:"17px",fontFamily:"'Poppins',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer",marginBottom:8,boxShadow:"0 4px 14px rgba(30,58,95,0.35)",letterSpacing:0.2}}>Next Question →</button>
            )}
            {selectedAnswer!==null&&selectedAnswer!==currentQ.answer&&showErrorPrompt&&!errorType&&(
              <button onClick={nextQuestion} style={{width:"100%",background:"white",color:T.textMuted,border:`1.5px solid ${T.border}`,borderRadius:14,padding:"13px",fontFamily:"'Poppins',sans-serif",fontSize:14,cursor:"pointer",marginBottom:8}}>Skip →</button>
            )}
          </>
        )}
        <div style={{height:8}}/>
      </div>
      <BottomNav screen="practice" setScreen={setScreen}/>
    </div>
  );
}

// ─── TESTS SCREEN (Timed + Full Test) ─────────────────────────────────────────
function TestsScreen({timedState,timedCountdown,timedTimeLeft,timedDuration,setTimedDuration,timedQ,timedSelected,timedScore,startTimedCountdown,selectTimedAnswer,setTimedState,setScreen,fullTestState,startFullTest,setFullTestState,miniTestState,setMiniTestState,miniTestModule,miniTestQs,miniTestIdx,miniTestSelected,miniTestLoading,miniTestResults,miniTestTimeLeft,miniTestSize,startMiniTest,selectMiniAnswer,nextMiniQuestion,MINI_MODULES,MINI_CONFIG,userData}) {
  const [tab, setTab] = useState("sprint");
  const [showPaywallTests, setShowPaywallTests] = useState(false);
  const [sprSection, setSprSection] = useState("all");
  const pct = timedDuration>0 ? timedTimeLeft/timedDuration*100 : 0;
  const timerColor = pct>50?T.green:pct>20?T.gold:T.rum;
  const formatTime = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {showPaywallTests&&<PaywallModal onClose={()=>setShowPaywallTests(false)}/>}
      <NavHeader title="Tests" subtitle="PRACTICE & SIMULATE"/>
      {/* Tabs */}
      {(timedState==="idle"||timedState==="result")&&fullTestState==="idle"&&(
        <div style={{display:"flex",gap:0,background:"white",borderBottom:`1.5px solid ${T.border}`,flexShrink:0}}>
          {[{id:"sprint",label:"⏱️ Timed Sprint"},{id:"full",label:"📋 Full Test"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"16px",background:"none",border:"none",borderBottom:`2.5px solid ${tab===t.id?T.navy:"transparent"}`,fontFamily:"'Space Mono',monospace",fontSize:17,fontWeight:700,color:tab===t.id?T.navy:T.textMuted,letterSpacing:1,cursor:"pointer"}}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",padding:"16px 16px 8px"}}>

        {/* ── TIMED SPRINT TAB ── */}
        {tab==="sprint"&&(
          <>
            {timedState==="idle"&&(
              <>
                {/* Hero */}
                <div style={{background:`linear-gradient(135deg,${T.rum},#c0392b)`,borderRadius:16,padding:"18px 16px",marginBottom:16,textAlign:"center",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:-20,right:-20,width:90,height:90,background:"rgba(255,255,255,0.06)",borderRadius:"50%"}}/>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" style={{marginBottom:8}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:"white",marginBottom:4}}>Timed Sprint</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"rgba(255,255,255,0.8)"}}>INSTANT START · OFFLINE · NO LOADING</div>
                </div>

                {/* Section selector */}
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,marginBottom:8}}>SECTION</div>
                <div style={{display:"flex",gap:8,marginBottom:16}}>
                  {[{id:"all",label:"Both"},{id:"math",label:"Math only"},{id:"rw",label:"R&W only"}].map(s=>(
                    <button key={s.id} onClick={()=>setSprSection(s.id)}
                      style={{flex:1,padding:"10px",borderRadius:10,border:`1.5px solid ${sprSection===s.id?T.rum:T.border}`,background:sprSection===s.id?T.rum:"white",color:sprSection===s.id?"white":T.textPrimary,fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Duration grid */}
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,marginBottom:8}}>DURATION</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
                  {[{s:60,label:"1 MIN"},{s:120,label:"2 MIN"},{s:180,label:"3 MIN"},{s:300,label:"5 MIN"},{s:600,label:"10 MIN"},{s:900,label:"15 MIN"}].map(opt=>(
                    <button key={opt.s} onClick={()=>setTimedDuration(opt.s)}
                      style={{background:timedDuration===opt.s?T.rum:"white",border:`1.5px solid ${timedDuration===opt.s?T.rum:T.border}`,borderRadius:12,padding:"13px 8px",textAlign:"center",cursor:"pointer"}}>
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:15,fontWeight:700,color:timedDuration===opt.s?"white":T.textPrimary}}>{opt.label}</div>
                    </button>
                  ))}
                </div>
                <button onClick={()=>{ if(!userData?.isPro){setShowPaywallTests(true);return;} startTimedCountdown(sprSection); }}
                  style={{width:"100%",background:T.rum,color:"#fff",border:"none",borderRadius:14,padding:"17px",fontFamily:"'Poppins',sans-serif",fontSize:17,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  {!userData?.isPro&&<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                  {userData?.isPro ? "Start Sprint →" : "Unlock Timed Sprint — Pro"}
                </button>
              </>
            )}

            {timedState==="countdown"&&(
              <div style={{textAlign:"center",padding:"60px 0"}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:80,fontWeight:900,color:T.navy,lineHeight:1,animation:"pulse 0.9s ease infinite"}}>{timedCountdown}</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:14,color:T.textMuted,letterSpacing:2,marginTop:12}}>GET READY…</div>
              </div>
            )}

            {timedState==="active"&&timedQ&&(
              <>
                {/* Timer bar */}
                <div style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:T.textMuted}}>{timedScore.correct}/{timedScore.total} correct · Q{timedQIdx+1}/{timedQs.length}</span>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:timerColor}}>{formatTime(timedTimeLeft)}</span>
                  </div>
                  <div style={{height:6,background:T.border,borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${pct}%`,height:"100%",background:timerColor,borderRadius:3,transition:"width 1s linear,background 0.5s"}}/>
                  </div>
                </div>
                <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:12,padding:"16px",marginBottom:10,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:17,fontWeight:600,color:T.textPrimary,lineHeight:1.6}}>{timedQ.q}</div>
                </div>
                {timedQ.options.map((opt,i)=>{
                  const selected = timedSelected!==null;
                  let bg="white",border=T.border,col=T.textPrimary;
                  if(selected){if(i===timedQ.answer){bg=T.greenFaint;border=T.greenMid;col=T.green;}else if(i===timedSelected){bg=T.rumFaint;border="#f4a090";col=T.rum;}}
                  return <button key={i} disabled={selected} onClick={()=>selectTimedAnswer(i)} style={{display:"block",width:"100%",textAlign:"left",background:bg,border:`1.5px solid ${border}`,borderRadius:10,padding:"15px 16px",marginBottom:8,fontFamily:"'Poppins',sans-serif",fontSize:17,color:col,cursor:selected?"default":"pointer",transition:"all 0.12s",opacity:selected&&i!==timedQ.answer&&i!==timedSelected?0.4:1}}>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:17,marginRight:6,opacity:0.6}}>{String.fromCharCode(65+i)}.</span>{opt}
                  </button>;
                })}
              </>
            )}

            {timedState==="result"&&(
              <>
                <div style={{background:`linear-gradient(135deg,${T.rum},#c0392b)`,borderRadius:16,padding:"20px",marginBottom:14,textAlign:"center"}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.7)",marginBottom:8}}>SPRINT COMPLETE</div>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:52,fontWeight:700,color:"white",lineHeight:1,marginBottom:4}}>{timedScore.correct}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:"rgba(255,255,255,0.8)"}}>out of {timedScore.total} · {timedScore.total>0?Math.round(timedScore.correct/timedScore.total*100):0}% accuracy</div>
                </div>
                {/* Quick topic breakdown */}
                {timedQs.length>0&&(()=>{
                  const byTopic = {};
                  timedQs.slice(0,timedScore.total).forEach((q,i)=>{
                    if(!q.topicId) return;
                    if(!byTopic[q.topicId]) byTopic[q.topicId]={name:q.topicName,correct:0,total:0};
                    byTopic[q.topicId].total++;
                  });
                  const missed = timedQs.slice(0,timedScore.total).filter((_,i)=>false); // placeholder
                  const weakSpots = Object.entries(byTopic).filter(([,v])=>v.total>=2&&v.correct/v.total<0.6).slice(0,2);
                  return weakSpots.length>0?(
                    <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:14,padding:"14px",marginBottom:12}}>
                      <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:T.textPrimary,marginBottom:8}}>REVIEW THESE NEXT</div>
                      {weakSpots.map(([id,v])=>(
                        <div key={id} style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:T.rum,marginBottom:4}}>{v.name}</div>
                      ))}
                    </div>
                  ):null;
                })()}
                <button onClick={()=>setTimedState("idle")} style={{width:"100%",background:T.rum,color:"#fff",border:"none",borderRadius:14,padding:"17px",fontFamily:"'Poppins',sans-serif",fontSize:17,fontWeight:700,cursor:"pointer",marginBottom:8}}>Sprint Again →</button>
                <button onClick={()=>setScreen("practice")} style={{width:"100%",background:"white",color:T.textPrimary,border:`1.5px solid ${T.border}`,borderRadius:14,padding:"14px",fontFamily:"'Poppins',sans-serif",fontSize:15,fontWeight:600,cursor:"pointer"}}>Practice Mode</button>
              </>
            )}
          </>
        )}

        {/* ── FULL TEST TAB ── */}
        {tab==="full"&&miniTestState==="idle"&&(
          <>
            {/* Mini Test hero */}
            <div style={{background:`linear-gradient(135deg,${T.purple},#7c3aed)`,borderRadius:16,padding:"20px 16px",textAlign:"center",marginBottom:16,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,background:"rgba(255,255,255,0.06)",borderRadius:"50%"}}/>
              <div style={{fontSize:32,marginBottom:6}}>📋</div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:"white",marginBottom:4}}>Mini SAT Test</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:"rgba(255,255,255,0.85)"}}>REAL STRUCTURE · SCORED · ADAPTIVE</div>
            </div>
            <div style={{fontSize:14,color:T.textSecondary,lineHeight:1.6,marginBottom:14}}>
              Experience the real SAT structure — 4 modules, both Math and Reading & Writing — in a fraction of the time. Module 2 adapts based on your Module 1 performance.
            </div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:T.textMuted,marginBottom:10}}>CHOOSE YOUR LENGTH</div>
            {["quick","standard"].map(size=>{
              const cfg = MINI_CONFIG?.[size];
              if(!cfg) return null;
              return (
                <button key={size} onClick={()=>{ if(!userData?.isPro){setShowPaywallTests(true);return;} startMiniTest(size); }}
                  style={{width:"100%",background:"white",border:`1.5px solid ${T.border}`,borderRadius:14,padding:"16px",textAlign:"left",cursor:"pointer",marginBottom:10,display:"flex",alignItems:"center",gap:14,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                  <div style={{width:44,height:44,borderRadius:12,background:T.purpleFaint,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{size==="quick"?"⚡":"📋"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:700,color:T.textPrimary,marginBottom:3,display:"flex",alignItems:"center",gap:7}}>{size==="quick"?"Quick Test":"Standard Mini Test"}{!userData?.isPro&&<span style={{background:T.goldBright,borderRadius:4,padding:"2px 5px",fontFamily:"'Space Mono',monospace",fontSize:8,fontWeight:700,color:T.navyDark,letterSpacing:0.3}}>PRO</span>}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.purple}}>{cfg.label.toUpperCase()}</div>
                    <div style={{fontSize:13,color:T.textMuted,marginTop:3}}>{size==="quick"?`4 modules · ${cfg.qPerModule} questions each · ~15 min`:`4 modules · ${cfg.qPerModule} questions each · ~25 min`}</div>
                  </div>
                  {userData?.isPro ? <span style={{color:T.textMuted,fontSize:18}}>→</span> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                </button>
              );
            })}
            <div style={{background:T.navyFaint,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",marginTop:4}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.navy,fontWeight:700,marginBottom:6}}>HOW IT WORKS</div>
              <div style={{fontSize:13,color:T.textSecondary,lineHeight:1.6}}>R&W Module 1 → R&W Module 2 (adaptive) → Math Module 1 → Math Module 2 (adaptive). Results include an estimated score and your weakest topics to review.</div>
            </div>
          </>
        )}

        {/* Mini test — loading modules */}
        {tab==="full"&&miniTestState==="active"&&miniTestLoading&&(
          <div style={{textAlign:"center",padding:"60px 20px"}}>
            <div style={{width:40,height:40,border:`3px solid ${T.purpleFaint}`,borderTopColor:T.purple,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}}/>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:17,color:T.purple,marginBottom:6}}>Loading {MINI_MODULES?.[miniTestModule]?.label}…</div>
            <div style={{fontSize:14,color:T.textMuted}}>Generating adaptive questions</div>
          </div>
        )}

        {/* Mini test — active question */}
        {tab==="full"&&miniTestState==="active"&&!miniTestLoading&&miniTestQs[miniTestIdx]&&(()=>{
          const q = miniTestQs[miniTestIdx];
          const mod = MINI_MODULES?.[miniTestModule];
          const cfg = MINI_CONFIG?.[miniTestSize];
          const totalQ = cfg?.qPerModule||8;
          const mins = Math.floor(miniTestTimeLeft/60);
          const secs = String(miniTestTimeLeft%60).padStart(2,"0");
          const timerColor = miniTestTimeLeft>120?T.green:miniTestTimeLeft>30?T.gold:T.rum;
          return (
            <>
              {/* Module header */}
              <div style={{background:mod?.color||T.navy,borderRadius:12,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.75)",marginBottom:2}}>MODULE {miniTestModule+1} OF 4</div>
                  <div style={{fontSize:14,fontWeight:700,color:"white"}}>{mod?.label}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:17,fontWeight:700,color:timerColor}}>{mins}:{secs}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.7)"}}>{miniTestIdx+1}/{totalQ}</div>
                </div>
              </div>
              {/* Timer bar */}
              <div style={{height:4,background:"rgba(0,0,0,0.1)",borderRadius:2,marginBottom:12,overflow:"hidden"}}>
                <div style={{width:`${(miniTestIdx+1)/totalQ*100}%`,height:"100%",background:mod?.color||T.navy,borderRadius:2,transition:"width 0.3s"}}/>
              </div>
              {/* Question */}
              {q.passage&&(
                <div style={{background:"#f8f4ef",border:`1.5px solid ${T.border}`,borderRadius:12,padding:"14px",marginBottom:12}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,marginBottom:6}}>PASSAGE</div>
                  <div style={{fontSize:15,color:T.textPrimary,lineHeight:1.7,fontStyle:"italic"}}>{q.passage}</div>
                </div>
              )}
              <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:12,padding:"16px",marginBottom:12,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:16,fontWeight:600,color:T.textPrimary,lineHeight:1.6}}>{q.q}</div>
              </div>
              {q.options?.map((opt,i)=>{
                let cls = "default";
                if(miniTestSelected!==null){
                  if(i===q.answer)cls="correct";
                  else if(i===miniTestSelected)cls="wrong";
                  else cls="disabled";
                }
                return (
                  <button key={i} disabled={miniTestSelected!==null} onClick={()=>selectMiniAnswer(i)}
                    style={{display:"block",width:"100%",textAlign:"left",borderRadius:12,padding:"15px 18px",marginBottom:9,fontFamily:"'Poppins',sans-serif",fontSize:16,cursor:miniTestSelected!==null?"default":"pointer",
                      background:cls==="correct"?T.greenFaint:cls==="wrong"?T.rumFaint:cls==="disabled"?"rgba(240,234,224,0.5)":"white",
                      border:`1.5px solid ${cls==="correct"?T.greenMid:cls==="wrong"?"#f4a090":T.border}`,
                      color:cls==="correct"?T.green:cls==="wrong"?T.rum:T.textPrimary,
                      fontWeight:cls==="correct"?700:400,opacity:cls==="disabled"?0.45:1}}>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:13,marginRight:8,opacity:0.6}}>{String.fromCharCode(65+i)}.</span>{opt}
                  </button>
                );
              })}
              {/* No explanation in test mode — just move on */}
              {miniTestSelected!==null&&(
                <button onClick={nextMiniQuestion} style={{width:"100%",background:T.purple,color:"#fff",border:"none",borderRadius:14,padding:"16px",fontFamily:"'Poppins',sans-serif",fontSize:17,fontWeight:700,cursor:"pointer",marginTop:4}}>
                  {miniTestIdx<miniTestQs.length-1?"Next →":miniTestModule<3?"Next Module →":"Finish Test →"}
                </button>
              )}
            </>
          );
        })()}

        {/* Mini test results */}
        {tab==="full"&&miniTestState==="result"&&miniTestResults&&(
          <>
            <div style={{background:`linear-gradient(135deg,${T.purple},#7c3aed)`,borderRadius:16,padding:"20px 16px",marginBottom:16,textAlign:"center"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"rgba(255,255,255,0.75)",marginBottom:8}}>MINI TEST COMPLETE</div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:52,fontWeight:700,color:"white",lineHeight:1}}>{miniTestResults.total}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:"rgba(255,255,255,0.7)",marginTop:6}}>ESTIMATED SAT SCORE</div>
              <div style={{display:"flex",gap:8,marginTop:14}}>
                <div style={{flex:1,background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"12px",textAlign:"center"}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:22,fontWeight:700,color:T.tealFaint}}>{miniTestResults.rwScore}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.7)",marginTop:3}}>R&W · {miniTestResults.rwCorrect}/{miniTestResults.rwTotal}</div>
                </div>
                <div style={{flex:1,background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"12px",textAlign:"center"}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:22,fontWeight:700,color:T.goldBright}}>{miniTestResults.mathScore}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.7)",marginTop:3}}>MATH · {miniTestResults.mathCorrect}/{miniTestResults.mathTotal}</div>
                </div>
              </div>
            </div>
            {miniTestResults.weakTopics?.length>0&&(
              <>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:T.textMuted,marginBottom:10}}>FOCUS THESE BEFORE YOUR NEXT TEST</div>
                {miniTestResults.weakTopics.map(t=>(
                  <div key={t.id} style={{background:"white",border:`1.5px solid ${T.border}`,borderLeft:`3px solid ${t.color||T.rum}`,borderRadius:12,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:700,color:T.textPrimary}}>{t.name}</div>
                      <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.rum,marginTop:2}}>{t.count} question{t.count!==1?"s":""} missed</div>
                    </div>
                    <span style={{fontSize:15,color:T.textMuted}}>→</span>
                  </div>
                ))}
              </>
            )}
            <button onClick={()=>{setMiniTestState("idle");}} style={{width:"100%",background:T.purple,color:"#fff",border:"none",borderRadius:14,padding:"16px",fontFamily:"'Poppins',sans-serif",fontSize:17,fontWeight:700,cursor:"pointer",marginTop:8,marginBottom:8}}>Take Another Test →</button>
            <button onClick={()=>setMiniTestState("idle")} style={{width:"100%",background:"white",color:T.textMuted,border:`1.5px solid ${T.border}`,borderRadius:14,padding:"13px",fontFamily:"'Poppins',sans-serif",fontSize:15,cursor:"pointer"}}>Back</button>
          </>
        )}
        <div style={{height:8}}/>
      </div>
      <BottomNav screen="tests" setScreen={setScreen}/>
    </div>
  );
}


// ─── STRATEGY LIBRARY SCREEN ──────────────────────────────────────────────────
const STRATEGIES = {
  math: [
    {id:"plug_in",    title:"Plug In Numbers",        icon:"🔢", tag:"UNIVERSAL",
     body:"When a problem has variables in the answer choices, pick a simple number (like 2 or 5) and substitute it into the problem. Calculate the answer, then test each choice with the same number. Eliminates algebra entirely.",
     example:"If 3x + 6 = 21, what is x + 2? → Plug x=5: 3(5)+6=21 ✓. x+2=7. Find 7 in the choices."},
    {id:"backsolve",  title:"Backsolve from Choices",  icon:"⬅️", tag:"MULTIPLE CHOICE",
     body:"Start with answer choice B or C (middle values). Plug it into the problem. If the result is too big, try A; if too small, try D. Usually takes 2 tries max.",
     example:"If x² - 5x + 6 = 0, which could be x? Try C (x=3): 9-15+6=0 ✓ Done."},
    {id:"estimation", title:"Estimate & Eliminate",    icon:"🎯", tag:"DATA PROBLEMS",
     body:"For graph and table questions, rough estimation eliminates 2-3 choices instantly. If the graph shows roughly 60%, eliminate anything outside 55-65% before calculating.",
     example:"A bar chart shows about 40 students. Choices: 18, 38, 42, 71. Eliminate 18 and 71 immediately."},
    {id:"units",      title:"Track Your Units",        icon:"📏", tag:"WORD PROBLEMS",
     body:"Write out units at every step. If you need miles/hour and you have miles and minutes, you know you need to convert minutes to hours. Units tell you what to multiply or divide.",
     example:"60 miles divided by 45 minutes, times 60 min/hr = 80 mph"},
    {id:"diagrams",   title:"Draw It Out",             icon:"Math", tag:"GEOMETRY",
     body:"Always sketch geometry problems even if a figure is provided. Label every given value. Mark what you need to find. Visual clarity prevents careless errors.",
     example:"A circle problem: draw the circle, mark center, label radius, mark the chord. The answer often becomes obvious."},
    {id:"linear",     title:"Slope-Intercept Trick",   icon:"📈", tag:"ALGEBRA",
     body:"Any linear equation can be rewritten as y = mx + b instantly. m is the rate of change, b is the starting value. In word problems, 'per' signals m, 'initial/starting' signals b.",
     example:"A taxi charges $2.50 per mile plus a $3 flat fee → y = 2.50x + 3"},
  ],
  rw: [
    {id:"same_simpler",  title:"Same Meaning, Simpler Word",  icon:"📝", tag:"VOCABULARY",
     body:"For Words in Context questions, find the simplest word that fits without changing the meaning. The SAT almost never wants a fancy or dramatic word. If the passage is neutral, the answer is neutral.",
     example:"'The results were significant' — replace 'significant': important is correct, earth-shattering is wrong, trivial is wrong"},
    {id:"trap_answers",  title:"Spot the Trap Answers",       icon:"🪤", tag:"ALL SECTIONS",
     body:"Wrong answers on the SAT fall into 4 types: Too Extreme (uses always/never/only), Out of Scope (true but not in the passage), Half Right (starts correct, ends wrong), Opposite (reverses the meaning).",
     example:"Passage says 'some scientists believe X' — wrong answer: 'All scientists agree X is proven'"},
    {id:"transitions",   title:"Transition Logic",            icon:"🔗", tag:"EXPRESSION",
     body:"Transition questions test logical relationships. Ask: do the two sentences agree or disagree? If they agree use furthermore/additionally/also. If they contrast use however/although/while. If cause-effect use therefore/as a result.",
     example:"Sentence 1: Exercise improves mood. Sentence 2: It also sharpens focus. Answer: Furthermore or Additionally"},
    {id:"completion",    title:"Complete the Thought",        icon:"✅", tag:"RHETORIC",
     body:"For purpose/structure questions, read the sentence before AND after the blank. The correct answer must logically complete the argument, not just sound relevant to the topic.",
     example:"A paragraph arguing for policy X needs a sentence that supports X, not one that is just about the same subject matter."},
    {id:"grammar_scope", title:"Scope of Punctuation",        icon:"🔤", tag:"CONVENTIONS",
     body:"Commas join, colons introduce, semicolons separate equals. If you can replace the punctuation with 'and', it is likely a comma. If what follows is a list or explanation, use a colon.",
     example:"She had one goal: win the race. (colon introduces) She trained daily; she won easily. (semicolon separates two full sentences)"},
    {id:"antecedent",    title:"Pronoun Antecedent Rule",     icon:"👤", tag:"CONVENTIONS",
     body:"Every pronoun must refer to a specific, unambiguous noun. If it, they, this, or which could refer to more than one thing, the answer choice is wrong. The pronoun and noun must also agree in number.",
     example:"'The team celebrated their victory' — team is singular as a unit, so 'its victory' is correct"},
  ]
};

async function generateStrategyQ(strategy) {
  const prompt = `You are an expert SAT tutor. Create one practice question that specifically tests this SAT strategy:

Strategy: ${strategy.title}
Description: ${strategy.body}

Generate a realistic SAT-style question where applying this strategy is the most efficient path to the answer.

Respond ONLY with JSON (no markdown):
{"q":"...","options":["A text","B text","C text","D text"],"answer":0,"explanation":"...","strategyTip":"One sentence on exactly how to apply the strategy to solve this"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:700,messages:[{role:"user",content:prompt}]})
  });
  const data = await res.json();
  return JSON.parse(data.content[0].text.replace(/```json|```/g,"").trim());
}

function StrategyLibraryScreen({setScreen,screen}) {
  const [mainTab, setMainTab] = React.useState("strategies"); // strategies | formulas
  const [tab, setTab] = React.useState("math");
  const [expanded, setExpanded] = React.useState(null);
  const [practiceQ, setPracticeQ] = React.useState({});
  const [practiceLoading, setPracticeLoading] = React.useState({});
  const [practiceSelected, setPracticeSelected] = React.useState({});

  const strategies = STRATEGIES[tab];

  const loadPractice = async(s) => {
    if(practiceQ[s.id]||practiceLoading[s.id]) return;
    setPracticeLoading(p=>({...p,[s.id]:true}));
    try {
      const q = await generateStrategyQ(s);
      setPracticeQ(p=>({...p,[s.id]:q}));
    } catch(e) {
      setPracticeQ(p=>({...p,[s.id]:{q:"Could not load question. Check connection.",options:["Try again","—","—","—"],answer:0,explanation:"",strategyTip:""}}));
    }
    setPracticeLoading(p=>({...p,[s.id]:false}));
  };

  const toggleExpand = (id) => {
    const s = strategies.find(x=>x.id===id);
    if(expanded===id){setExpanded(null);return;}
    setExpanded(id);
    if(s) loadPractice(s);
  };

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <NavHeader title="Learn" subtitle="STRATEGIES & REFERENCE"/>
      {/* Main tabs */}
      <div style={{display:"flex",background:"white",borderBottom:`1.5px solid ${T.border}`,flexShrink:0}}>
        {[{id:"strategies",label:"Strategies"},{id:"formulas",label:"Formulas"}].map(t=>(
          <button key={t.id} onClick={()=>setMainTab(t.id)}
            style={{flex:1,padding:"13px",background:"none",border:"none",borderBottom:`2.5px solid ${mainTab===t.id?T.navy:"transparent"}`,fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:mainTab===t.id?T.navy:T.textMuted,cursor:"pointer"}}>
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* FORMULAS TAB */}
      {mainTab==="formulas"&&(
        <div style={{flex:1,overflowY:"auto",padding:"14px 16px 8px"}}>
          {["Heart of Algebra","Advanced Algebra","Geometry","Problem Solving & Data"].map(group=>{
            const fms = FORMULAS.filter(f=>f.topic===group);
            if(!fms.length) return null;
            return (
              <div key={group} style={{marginBottom:16}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,letterSpacing:1,marginBottom:8}}>{group.toUpperCase()}</div>
                {fms.map(f=>(
                  <div key={f.id} style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:12,padding:"14px 16px",marginBottom:8,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                    <div style={{fontSize:15,fontWeight:700,color:T.textPrimary,marginBottom:6}}>{f.name}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:17,color:T.navy,background:T.navyFaint,borderRadius:8,padding:"10px 14px",letterSpacing:0}}>{f.formula}</div>
                    {f.notes&&<div style={{fontSize:13,color:T.textMuted,marginTop:6,lineHeight:1.5}}>{f.notes}</div>}
                  </div>
                ))}
              </div>
            );
          })}
          <div style={{height:16}}/>
        </div>
      )}

      {/* STRATEGIES TAB */}
      {mainTab==="strategies"&&(
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px 8px"}}>
        {/* Section tabs within strategies */}
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[{id:"math",label:"Math"},{id:"rw",label:" Reading & Writing"}].map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id);setExpanded(null);}}
              style={{flex:1,padding:"10px",background:tab===t.id?T.navy:"white",border:`1.5px solid ${tab===t.id?T.navy:T.border}`,borderRadius:10,fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:tab===t.id?"white":T.textMuted,cursor:"pointer"}}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{fontSize:14,color:T.textMuted,lineHeight:1.6,marginBottom:14}}>
          Tap any strategy to see how it works and try a practice question.
        </div>
        {strategies.map(s=>(
          <div key={s.id} style={{background:"white",border:`1.5px solid ${expanded===s.id?T.navy:T.border}`,borderRadius:14,marginBottom:10,overflow:"hidden",boxShadow:expanded===s.id?"0 3px 12px rgba(30,58,95,0.1)":"0 1px 4px rgba(0,0,0,0.04)"}}>
            <button onClick={()=>toggleExpand(s.id)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"14px 16px",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
              <div style={{width:40,height:40,borderRadius:10,background:T.navyFaint,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{s.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:16,fontWeight:700,color:T.textPrimary,marginBottom:3}}>{s.title}</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.navy,background:T.navyFaint,display:"inline-block",padding:"2px 8px",borderRadius:6}}>{s.tag}</div>
              </div>
              <span style={{color:T.textMuted,fontSize:14,display:"inline-block",transform:expanded===s.id?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>▼</span>
            </button>
            {expanded===s.id&&(
              <div style={{padding:"0 16px 16px"}}>
                <div style={{height:1,background:T.border,marginBottom:14}}/>
                <div style={{fontSize:15,color:T.textPrimary,lineHeight:1.7,marginBottom:12}}>{s.body}</div>
                <div style={{background:T.navyFaint,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px",marginBottom:16}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.navy,marginBottom:6,fontWeight:700}}>EXAMPLE</div>
                  <div style={{fontSize:14,color:T.textPrimary,lineHeight:1.6}}>{s.example}</div>
                </div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:T.textMuted,marginBottom:10,fontWeight:700}}>TRY IT — PRACTICE QUESTION</div>
                {practiceLoading[s.id]&&(
                  <div style={{textAlign:"center",padding:"20px 0"}}>
                    <div style={{width:24,height:24,border:`2.5px solid ${T.navyFaint}`,borderTopColor:T.navy,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 8px"}}/>
                    <div style={{fontSize:13,color:T.textMuted}}>Generating practice question…</div>
                  </div>
                )}
                {practiceQ[s.id]&&!practiceLoading[s.id]&&(
                  <>
                    {practiceQ[s.id].strategyTip&&(
                      <div style={{background:T.goldFaint,border:`1px solid ${T.goldBright}`,borderRadius:10,padding:"10px 12px",marginBottom:12}}>
                        <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:T.gold}}>STRATEGY TIP: </span>
                        <span style={{fontSize:13,color:T.textPrimary}}>{practiceQ[s.id].strategyTip}</span>
                      </div>
                    )}
                    <div style={{fontSize:16,color:T.textPrimary,lineHeight:1.7,marginBottom:14,fontWeight:500}}>{practiceQ[s.id].q}</div>
                    {practiceQ[s.id].options?.map((opt,i)=>{
                      const sel = practiceSelected[s.id];
                      const correct = practiceQ[s.id].answer;
                      let cls = "default";
                      if(sel!==undefined){if(i===correct)cls="correct";else if(i===sel)cls="wrong";else cls="disabled";}
                      return (
                        <button key={i} disabled={sel!==undefined} onClick={()=>setPracticeSelected(p=>({...p,[s.id]:i}))}
                          style={{display:"block",width:"100%",textAlign:"left",borderRadius:12,padding:"14px 16px",marginBottom:8,fontFamily:"'Poppins',sans-serif",fontSize:16,cursor:sel!==undefined?"default":"pointer",
                            background:cls==="correct"?T.greenFaint:cls==="wrong"?T.rumFaint:cls==="disabled"?"rgba(240,234,224,0.5)":"white",
                            border:`1.5px solid ${cls==="correct"?T.greenMid:cls==="wrong"?"#f4a090":T.border}`,
                            color:cls==="correct"?T.green:cls==="wrong"?T.rum:T.textPrimary,
                            fontWeight:cls==="correct"?700:400,opacity:cls==="disabled"?0.45:1}}>
                          <span style={{fontFamily:"'Space Mono',monospace",fontSize:13,marginRight:8,opacity:0.6}}>{String.fromCharCode(65+i)}.</span>{opt}
                        </button>
                      );
                    })}
                    {practiceSelected[s.id]!==undefined&&(
                      <div style={{background:practiceSelected[s.id]===practiceQ[s.id].answer?T.greenFaint:T.rumFaint,border:`1.5px solid ${practiceSelected[s.id]===practiceQ[s.id].answer?T.greenMid:"#f4a090"}`,borderRadius:12,padding:"14px",marginTop:4}}>
                        <div style={{fontWeight:700,fontSize:16,color:practiceSelected[s.id]===practiceQ[s.id].answer?T.green:T.rum,marginBottom:6}}>
                          {practiceSelected[s.id]===practiceQ[s.id].answer?"Correct! Great use of the strategy.":"Not quite — see the explanation."}
                        </div>
                        <div style={{fontSize:14,color:T.textSecondary,lineHeight:1.6}}>{practiceQ[s.id].explanation}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        <div style={{height:16}}/>
      </div>
      )}
      <BottomNav screen={screen} setScreen={setScreen}/>
    </div>
  );
}

// ─── REVIEW SCREEN ─────────────────────────────────────────────────────────────

// ─── PATTERN ANALYSIS ──────────────────────────────────────────────────────────
function analyzePatterns(wrongAnswers, skillProgress) {
  if(!wrongAnswers||wrongAnswers.length<5) return null;

  // Topic frequency
  const topicCounts = {};
  wrongAnswers.forEach(w => {
    if(w.topicId) topicCounts[w.topicId] = (topicCounts[w.topicId]||0)+1;
  });

  // Error type distribution
  const errorTypes = {concept:0,careless:0,timing:0,untagged:0};
  wrongAnswers.forEach(w => {
    if(w.errorType) errorTypes[w.errorType]++;
    else errorTypes.untagged++;
  });
  const tagged = errorTypes.concept+errorTypes.careless+errorTypes.timing;
  const dominantError = tagged>0
    ? Object.entries({concept:errorTypes.concept,careless:errorTypes.careless,timing:errorTypes.timing})
        .sort((a,b)=>b[1]-a[1])[0]
    : null;

  // Section split
  const mathWrong = wrongAnswers.filter(w=>w.section==="math").length;
  const rwWrong   = wrongAnswers.filter(w=>w.section==="rw").length;
  const weakerSection = mathWrong>=rwWrong?"math":"rw";

  // Top struggling topics (3+  misses)
  const topTopics = Object.entries(topicCounts)
    .filter(([,c])=>c>=2)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3)
    .map(([id,count])=>{
      const course = ALL_COURSES.find(c=>c.topics.some(t=>t.id===id));
      const topic  = course?.topics.find(t=>t.id===id);
      return {id, name:topic?.name||id, count, courseId:course?.id, color:course?.color||T.navy, mastery:getTopicMastery(skillProgress?.[id])};
    });

  // Recent trend (last 10 vs previous 10)
  const recent   = wrongAnswers.slice(-10).length;
  const previous = wrongAnswers.slice(-20,-10).length;
  const improving = wrongAnswers.length>=20 && recent<previous;

  // Careless mistake rate
  const carelessRate = tagged>0 ? Math.round((errorTypes.careless/tagged)*100) : 0;
  const conceptRate  = tagged>0 ? Math.round((errorTypes.concept/tagged)*100)  : 0;

  return {topTopics, dominantError, weakerSection, mathWrong, rwWrong, improving, carelessRate, conceptRate, total:wrongAnswers.length, tagged};
}

function ReviewScreen({wrongAnswers,setScreen,startPractice,skillProgress}) {
  const [filter,setFilter] = useState("all");
  const filtered = filter==="all" ? wrongAnswers : wrongAnswers.filter(w=>w.section===filter);

  if(wrongAnswers.length===0) {
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <NavHeader title="Review" subtitle="WRONG ANSWERS"/>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",padding:"40px 24px",textAlign:"center"}}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={T.greenMid} strokeWidth="1.5" style={{marginBottom:16}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div style={{fontSize:18,fontWeight:700,color:T.textPrimary,marginBottom:8}}>Clean slate!</div>
          <div style={{fontSize:15,color:T.textSecondary,lineHeight:1.6,marginBottom:24}}>Wrong answers from your practice sessions appear here so you can learn from them.</div>
          <button onClick={()=>setScreen("practice")} style={{background:T.navy,color:"#fff",border:"none",borderRadius:14,padding:"14px 24px",fontFamily:"'Poppins',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer"}}>Start Practicing →</button>
        </div>
        <BottomNav screen="review" setScreen={setScreen}/>
      </div>
    );
  }

  const grouped = {};
  const listFiltered = ["math","rw","all"].includes(filter) ? filtered : [];
  listFiltered.forEach(w=>{ const day=w.date||"Today"; if(!grouped[day])grouped[day]=[]; grouped[day].push(w); });

  const patterns = analyzePatterns(wrongAnswers, skillProgress||{});

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <NavHeader title="Review" subtitle="LEARN FROM MISTAKES"/>
      <div style={{display:"flex",gap:8,padding:"10px 16px 8px",background:"white",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
        {[{id:"all",label:`All (${wrongAnswers.length})`},{id:"math",label:"Math"},{id:"rw",label:"R&W"},{id:"diagnosis",label:"Diagnosis"}].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)} style={{background:filter===f.id?T.navy:"white",color:filter===f.id?"white":T.textMuted,border:`1.5px solid ${filter===f.id?T.navy:T.border}`,borderRadius:20,padding:"7px 12px",fontFamily:"'Space Mono',monospace",fontSize:11,cursor:"pointer"}}>{f.label}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px 8px"}}>

        {/* DIAGNOSIS TAB */}
        {filter==="diagnosis"&&(
          <div>
            {!patterns?(
              <div style={{textAlign:"center",padding:"40px 20px"}}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="1.5" style={{marginBottom:12}}><path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/></svg>
                <div style={{fontSize:16,fontWeight:700,color:T.textPrimary,marginBottom:8}}>Need more data</div>
                <div style={{fontSize:14,color:T.textMuted,lineHeight:1.6}}>Answer at least 5 questions incorrectly to see your pattern diagnosis.</div>
              </div>
            ):(
              <>
                {/* Header insight */}
                <div style={{background:`linear-gradient(135deg,${T.navyDark},${T.navy})`,borderRadius:16,padding:"18px",marginBottom:14}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.6)",marginBottom:8}}>YOUR DIAGNOSIS</div>
                  {patterns.improving?(
                    <div style={{fontSize:16,fontWeight:700,color:T.greenMid,marginBottom:6}}>You're improving!</div>
                  ):(
                    <div style={{fontSize:16,fontWeight:700,color:"white",marginBottom:6}}>Here's what's holding you back</div>
                  )}
                  <div style={{fontSize:14,color:"rgba(255,255,255,0.8)",lineHeight:1.6}}>
                    {patterns.dominantError?.["0"]==="careless"
                      ? `${patterns.carelessRate}% of your mistakes are careless errors — you know the material but lose points on execution. Slow down and re-read every question before answering.`
                      : patterns.dominantError?.["0"]==="concept"
                      ? `${patterns.conceptRate}% of your mistakes are concept gaps — targeted practice on your weak topics will move your score fast.`
                      : patterns.dominantError?.["0"]==="timing"
                      ? `Timing is your main issue. Practice skipping questions you're unsure about and coming back — don't lose easy points to running out of time.`
                      : `You've missed ${patterns.total} questions. Focus on the patterns below to improve fastest.`
                    }
                  </div>
                </div>

                {/* Section split */}
                <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:14,padding:"16px",marginBottom:12}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:T.textPrimary,marginBottom:12}}>WHERE YOU'RE LOSING POINTS</div>
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    {[{label:"Math",count:patterns.mathWrong,color:T.gold,total:patterns.total},
                      {label:"R&W", count:patterns.rwWrong,  color:T.teal,total:patterns.total}].map(s=>(
                      <div key={s.label} style={{flex:1,background:T.surface2,borderRadius:10,padding:"12px",textAlign:"center"}}>
                        <div style={{fontFamily:"'Cinzel',serif",fontSize:22,fontWeight:700,color:s.color,marginBottom:2}}>{s.count}</div>
                        <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.textMuted,marginBottom:6}}>{s.label} MISSES</div>
                        <div style={{height:4,background:T.border,borderRadius:2,overflow:"hidden"}}>
                          <div style={{width:`${s.total>0?(s.count/s.total)*100:0}%`,height:"100%",background:s.color,borderRadius:2}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:13,color:T.textSecondary,lineHeight:1.5}}>
                    {patterns.weakerSection==="math"
                      ? "Focus your next 3 sessions on Math — that's where you'll recover the most points."
                      : "Focus your next 3 sessions on Reading & Writing — that's where you'll recover the most points."}
                  </div>
                </div>

                {/* Error type breakdown */}
                {patterns.tagged>0&&(
                  <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:14,padding:"16px",marginBottom:12}}>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:T.textPrimary,marginBottom:12}}>WHY YOU'RE MISSING THEM</div>
                    {[
                      {id:"concept",  label:"Concept gaps",     color:T.navy,   desc:"Don't yet know the material"},
                      {id:"careless", label:"Careless mistakes", color:T.gold,   desc:"Know it but slip up"},
                      {id:"timing",   label:"Timing issues",     color:T.rum,    desc:"Run out of time"},
                    ].map(e=>{
                      const count = wrongAnswers.filter(w=>w.errorType===e.id).length;
                      const pct = patterns.tagged>0?Math.round((count/patterns.tagged)*100):0;
                      if(count===0) return null;
                      return (
                        <div key={e.id} style={{marginBottom:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontSize:14,fontWeight:600,color:T.textPrimary}}>{e.label}</span>
                            <span style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:e.color}}>{count}x · {pct}%</span>
                          </div>
                          <div style={{height:6,background:T.border,borderRadius:3,overflow:"hidden"}}>
                            <div style={{width:`${pct}%`,height:"100%",background:e.color,borderRadius:3,transition:"width 0.6s"}}/>
                          </div>
                          <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>{e.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Top weak topics */}
                {patterns.topTopics.length>0&&(
                  <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:14,padding:"16px",marginBottom:12}}>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:T.textPrimary,marginBottom:12}}>HIGHEST IMPACT TOPICS TO FIX</div>
                    {patterns.topTopics.map((t,i)=>(
                      <button key={t.id} onClick={()=>{startPractice(t.courseId);setScreen("practice");}}
                        style={{width:"100%",background:"white",border:`1.5px solid ${T.border}`,borderLeft:`3px solid ${t.color}`,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",textAlign:"left"}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:T.textPrimary,marginBottom:3}}>{t.name}</div>
                          <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.rum}}>{t.count} misses · {t.mastery} mastery</div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                          <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:t.color,fontWeight:700}}>Drill now →</div>
                          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:T.textMuted}}>#{i+1} priority</div>
                        </div>
                      </button>
                    ))}
                    <div style={{fontSize:13,color:T.textMuted,lineHeight:1.5,marginTop:4}}>
                      Fixing these {patterns.topTopics.length} topic{patterns.topTopics.length>1?"s":""} could recover {patterns.topTopics.reduce((s,t)=>s+t.count,0)*8}+ points on your predicted score.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {filter!=='diagnosis'&&Object.entries(grouped).map(([day,items])=>(
          <div key={day}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,marginBottom:10,marginTop:4}}>{day.toUpperCase()} · {items.length} MISTAKE{items.length!==1?"S":""}</div>
            {items.map((w,i)=>{
              const course = ALL_COURSES.find(c=>c.id===w.courseId);
              return (
                <div key={i} style={{background:"white",border:`1.5px solid ${T.border}`,borderLeft:`4px solid ${T.rum}`,borderRadius:14,padding:"16px",marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
                  {course&&<span style={{display:"inline-flex",background:`${course.color}18`,border:`1px solid ${course.color}40`,borderRadius:20,padding:"4px 10px",fontFamily:"'Space Mono',monospace",fontSize:11,color:course.color,marginBottom:8}}>{course.name}</span>}
                  <div style={{fontSize:15,fontWeight:600,color:T.textPrimary,lineHeight:1.5,marginBottom:10}}>{w.q}</div>
                  <div style={{background:T.rumFaint,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.rum,marginBottom:3}}>YOUR ANSWER: {String.fromCharCode(65+(w.yourAnswer||0))}. {w.options?.[w.yourAnswer||0]}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.green,fontWeight:700}}>CORRECT: {String.fromCharCode(65+(w.answer||0))}. {w.options?.[w.answer||0]}</div>
                  </div>
                  <div style={{fontSize:14,color:T.textSecondary,lineHeight:1.5,marginBottom:8}}>{w.explanation}</div>
                  <button onClick={()=>{startPractice(w.courseId);setScreen("practice");}} style={{width:"100%",background:T.navyFaint,color:T.navy,border:"none",borderRadius:8,padding:"8px",fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,cursor:"pointer"}}>↻ PRACTICE SIMILAR</button>
                </div>
              );
            })}
          </div>
        ))}
        <div style={{height:8}}/>
      </div>
      <BottomNav screen="review" setScreen={setScreen}/>
    </div>
  );
}

// ─── SETTINGS SCREEN ───────────────────────────────────────────────────────────
function SettingsScreen({userData,saveUser,setScreen}) {
  const [name,      setName]      = React.useState(userData?.name||"");
  const [testDate,  setTestDate]  = React.useState(userData?.testDate||"");
  const [target,    setTarget]    = React.useState(userData?.targetScore||"1400");
  const [dailyGoal, setDailyGoal] = React.useState(userData?.dailyGoalOverride||"");
  const [saved,         setSaved]         = React.useState(false);
  const [showReset,     setShowReset]     = React.useState(false);
  const [showPaywallFromSettings, setShowPaywallFromSettings] = React.useState(false);
  const [email,         setEmail]         = React.useState(userData?.email||"");
  const [cloudStatus,   setCloudStatus]   = React.useState(null); // null|"saving"|"saved"|"error"|"restoring"|"restored"
  const [restoreEmail,  setRestoreEmail]  = React.useState("");

  const save = () => {
    saveUser({...userData,name,testDate,targetScore:target,dailyGoalOverride:dailyGoal||null});
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  const cloudSave = async() => {
    const emailToUse = email.trim();
    if(!emailToUse||!emailToUse.includes("@")) { alert("Enter a valid email first."); return; }
    setCloudStatus("saving");
    try {
      const dataToSave = {...userData, name, testDate, targetScore:target, email:emailToUse};
      const ok = await sbUpsert(emailToUse, dataToSave, userData?.isPro||false);
      if(ok) {
        saveUser({...dataToSave});
        setCloudStatus("saved");
        setTimeout(()=>setCloudStatus(null), 3000);
      } else { setCloudStatus("error"); setTimeout(()=>setCloudStatus(null),3000); }
    } catch(e) { setCloudStatus("error"); setTimeout(()=>setCloudStatus(null),3000); }
  };

  const cloudRestore = async() => {
    const emailToUse = restoreEmail.trim();
    if(!emailToUse||!emailToUse.includes("@")) { alert("Enter your email to restore."); return; }
    setCloudStatus("restoring");
    try {
      const row = await sbGet(emailToUse);
      if(!row||!row.user_data) { alert("No saved data found for that email."); setCloudStatus(null); return; }
      const restored = {...row.user_data, isPro: row.is_pro||false};
      saveUser(restored);
      setCloudStatus("restored");
      setTimeout(()=>setCloudStatus(null), 3000);
    } catch(e) { setCloudStatus("error"); setTimeout(()=>setCloudStatus(null),3000); }
  };

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {showPaywallFromSettings&&<PaywallModal onClose={()=>setShowPaywallFromSettings(false)}/>}
      <NavHeader title="Settings" subtitle="PREFERENCES" back backFn={()=>setScreen("progress")}/>
      <div style={{flex:1,overflowY:"auto",padding:"16px 16px 8px"}}>

        {/* Profile */}
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,letterSpacing:1,marginBottom:8}}>PROFILE</div>
        <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:16,padding:"16px",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${T.navy},${T.navyLight})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <div style={{fontSize:17,fontWeight:700,color:T.textPrimary}}>{name||"Student"}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,marginTop:2}}>SAT Navigator</div>
            </div>
          </div>
          <label style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,display:"block",marginBottom:6}}>YOUR NAME</label>
          <input value={name} onChange={e=>setName(e.target.value)}
            style={{width:"100%",padding:"12px 14px",border:`1.5px solid ${T.border}`,borderRadius:10,fontFamily:"'Poppins',sans-serif",fontSize:16,color:T.textPrimary,background:"white",boxSizing:"border-box"}}/>
        </div>

        {/* Cloud save */}
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,letterSpacing:1,marginBottom:8}}>CLOUD BACKUP</div>
        <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:16,padding:"16px",marginBottom:16}}>
          <div style={{fontSize:13,color:T.textSecondary,lineHeight:1.5,marginBottom:12}}>
            Save your progress to the cloud so you never lose it. Use your email to restore on any device.
          </div>
          <label style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,display:"block",marginBottom:6}}>YOUR EMAIL</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com"
            style={{width:"100%",padding:"12px 14px",border:`1.5px solid ${T.border}`,borderRadius:10,fontFamily:"'Poppins',sans-serif",fontSize:15,color:T.textPrimary,background:"white",boxSizing:"border-box",marginBottom:10}}/>
          <button onClick={cloudSave} disabled={cloudStatus==="saving"}
            style={{width:"100%",background:cloudStatus==="saved"?T.green:cloudStatus==="error"?"#e74c3c":T.navy,color:"white",border:"none",borderRadius:10,padding:"13px",fontFamily:"'Poppins',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:12,opacity:cloudStatus==="saving"?0.7:1}}>
            {cloudStatus==="saving"?"Saving…":cloudStatus==="saved"?"Saved to cloud ✓":cloudStatus==="error"?"Error — try again":"Save to Cloud"}
          </button>
          <div style={{height:1,background:T.border,marginBottom:12}}/>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.textMuted,marginBottom:6,letterSpacing:0.5}}>RESTORE FROM ANOTHER DEVICE</div>
          <input type="email" value={restoreEmail} onChange={e=>setRestoreEmail(e.target.value)} placeholder="Enter your email to restore"
            style={{width:"100%",padding:"11px 14px",border:`1.5px solid ${T.border}`,borderRadius:10,fontFamily:"'Poppins',sans-serif",fontSize:15,color:T.textPrimary,background:"white",boxSizing:"border-box",marginBottom:8}}/>
          <button onClick={cloudRestore} disabled={cloudStatus==="restoring"}
            style={{width:"100%",background:"white",border:`1.5px solid ${T.border}`,color:T.textPrimary,borderRadius:10,padding:"11px",fontFamily:"'Poppins',sans-serif",fontSize:14,cursor:"pointer",opacity:cloudStatus==="restoring"?0.7:1}}>
            {cloudStatus==="restoring"?"Restoring…":cloudStatus==="restored"?"Restored ✓":"Restore my data"}
          </button>
        </div>

        {/* Test info */}
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,letterSpacing:1,marginBottom:8}}>TEST DETAILS</div>
        <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:16,padding:"16px",marginBottom:16}}>
          <label style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,display:"block",marginBottom:6}}>SAT TEST DATE</label>
          <input type="date" value={testDate} onChange={e=>setTestDate(e.target.value)}
            style={{width:"100%",padding:"12px 14px",border:`1.5px solid ${T.border}`,borderRadius:10,fontFamily:"'Poppins',sans-serif",fontSize:16,color:T.textPrimary,background:"white",boxSizing:"border-box",marginBottom:14}}/>
          <label style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,display:"block",marginBottom:8}}>TARGET SCORE</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {["1000","1100","1200","1300","1400","1450","1500","1550","1580","1600"].map(s=>(
              <button key={s} onClick={()=>setTarget(s)}
                style={{padding:"8px 12px",borderRadius:8,border:`1.5px solid ${target===s?T.navy:T.border}`,background:target===s?T.navy:"white",color:target===s?"white":T.textPrimary,fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Daily goal */}
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,letterSpacing:1,marginBottom:8}}>DAILY STUDY GOAL</div>
        <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:16,padding:"16px",marginBottom:16}}>
          <div style={{fontSize:14,color:T.textSecondary,lineHeight:1.5,marginBottom:12}}>Auto-calculated from your score gap and days left. Override here if you prefer a fixed target.</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["","10","15","20","25","30"].map(v=>(
              <button key={v} onClick={()=>setDailyGoal(v)}
                style={{flex:1,minWidth:48,padding:"10px 4px",borderRadius:8,border:`1.5px solid ${dailyGoal===v?T.navy:T.border}`,background:dailyGoal===v?T.navy:"white",color:dailyGoal===v?"white":T.textPrimary,fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {v||"Auto"}
              </button>
            ))}
          </div>
        </div>

        {/* Plan */}
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,letterSpacing:1,marginBottom:8}}>PLAN</div>
        <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:16,marginBottom:16,overflow:"hidden"}}>
          <button onClick={()=>setShowPaywallFromSettings(true)}
            style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"16px",background:"none",border:"none",cursor:"pointer",textAlign:"left"}}>
            <div style={{width:40,height:40,borderRadius:10,background:T.navyFaint,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.navy} strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,color:T.textPrimary}}>Free Plan</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.textMuted,marginTop:2,letterSpacing:0.3}}>10 QUESTIONS/DAY · TAP TO UPGRADE</div>
            </div>
            <div style={{background:T.gold,borderRadius:6,padding:"4px 8px"}}>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:"white",letterSpacing:0.5}}>UPGRADE</span>
            </div>
          </button>
        </div>

        {/* Danger zone */}
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.rum,letterSpacing:1,marginBottom:8}}>DANGER ZONE</div>
        <div style={{background:T.rumFaint,border:`1.5px solid #f4a090`,borderRadius:16,padding:"16px",marginBottom:24}}>
          {!showReset
            ? <button onClick={()=>setShowReset(true)} style={{width:"100%",background:"white",border:`1.5px solid #f4a090`,borderRadius:10,padding:"12px",fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:T.rum,cursor:"pointer"}}>Reset All Progress</button>
            : <>
                <div style={{fontSize:14,color:T.textPrimary,marginBottom:12,lineHeight:1.5}}>This erases all practice history, mastery data, and wrong answers. Are you sure?</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setShowReset(false)} style={{flex:1,background:"white",border:`1.5px solid ${T.border}`,borderRadius:10,padding:"11px",fontFamily:"'Poppins',sans-serif",fontSize:14,cursor:"pointer"}}>Cancel</button>
                  <button onClick={()=>{saveUser({...userData,skillProgress:{},xp:0,streak:0,weakTopics:[]});setShowReset(false);setScreen("home");}}
                    style={{flex:1,background:T.rum,color:"white",border:"none",borderRadius:10,padding:"11px",fontFamily:"'Poppins',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>Reset</button>
                </div>
              </>
          }
        </div>

        <button onClick={save} style={{width:"100%",background:saved?T.green:T.navy,color:"#fff",border:"none",borderRadius:14,padding:"17px",fontFamily:"'Poppins',sans-serif",fontSize:17,fontWeight:700,cursor:"pointer",marginBottom:8,transition:"background 0.3s"}}>
          {saved?"Saved ✓":"Save Changes"}
        </button>
        <div style={{height:8}}/>
      </div>
      <BottomNav screen="progress" setScreen={setScreen}/>
    </div>
  );
}

// ─── PROGRESS SCREEN ───────────────────────────────────────────────────────────

// ─── SCORE SPARKLINE ───────────────────────────────────────────────────────────

// ─── PROGRESS NARRATIVE ────────────────────────────────────────────────────────
function ProgressNarrative({userData, skillProgress, wrongAnswers, todayQCount}) {
  const scores = getPredictedScore(skillProgress);
  const target = parseInt(userData?.targetScore||"1400");
  const gap    = Math.max(0, target - scores.total);
  const totalQ = Object.values(skillProgress).reduce((s,t)=>s+(t.total||0),0);

  let bestTopic = null, bestDelta = 0;
  ALL_COURSES.forEach(c => c.topics.forEach(t => {
    const sp = skillProgress[t.id];
    if(!sp || sp.total < 4) return;
    const recent = (sp.history||[]).slice(-6);
    const recentAcc = recent.length ? recent.filter(Boolean).length/recent.length : 0;
    const delta = recentAcc - sp.correct/sp.total;
    if(delta > bestDelta) { bestDelta=delta; bestTopic=t.name; }
  }));

  let weakestCourse = null, lowestAcc = 1;
  ALL_COURSES.forEach(c => {
    let tot=0, cor=0;
    c.topics.forEach(t => { const sp=skillProgress[t.id]; if(sp){tot+=sp.total;cor+=sp.correct;} });
    if(tot>=4 && cor/tot < lowestAcc) { lowestAcc=cor/tot; weakestCourse=c.name; }
  });

  const lines = [];
  if(totalQ < 10) {
    lines.push("You're just getting started — keep practicing to unlock your personalized score forecast.");
  } else if(gap === 0) {
    lines.push("Your predicted score already meets your target. Push for more!");
  } else if(gap <= 50) {
    lines.push(`You're only **${gap} points** from your ${target} goal. A focused week could get you there.`);
  } else {
    lines.push(`Predicted score: **${scores.total}**. Closing the ${gap}-point gap to ${target} is achievable with consistent practice.`);
  }
  if(bestTopic && bestDelta > 0.15) {
    lines.push(`Your recent work in **${bestTopic}** shows real momentum — you're getting sharper there.`);
  } else if((userData?.streak||0) >= 3) {
    lines.push(`**${userData.streak}-day streak.** Consistency like this is exactly what moves scores.`);
  } else if(todayQCount >= 10) {
    lines.push(`Strong session today — **${todayQCount} questions** answered.`);
  }
  if(weakestCourse) {
    lines.push(`Biggest opportunity: **${weakestCourse}**. Drilling this course will have the highest impact on your score.`);
  }
  if(!lines.length) return null;

  return (
    <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:16,padding:"16px 18px",marginBottom:14,borderLeft:`4px solid ${T.gold}`}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
        <span style={{fontSize:16}}>🧭</span>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:T.gold,letterSpacing:1,fontWeight:700}}>YOUR PROGRESS STORY</div>
      </div>
      {lines.map((line,i)=>(
        <div key={i} style={{fontSize:14,lineHeight:1.75,marginBottom:i<lines.length-1?8:0,paddingBottom:i<lines.length-1?8:0,borderBottom:i<lines.length-1?`1px solid ${T.border}`:"none"}}>
          <BoldExplanation text={line} color={T.textSecondary}/>
        </div>
      ))}
    </div>
  );
}

// ─── WEEKLY SUMMARY CARD ───────────────────────────────────────────────────────
function WeeklySummaryCard({userData, skillProgress, wrongAnswers, todayQCount}) {
  const [copied, setCopied] = React.useState(false);
  const scores   = getPredictedScore(skillProgress);
  const target   = parseInt(userData?.targetScore||"1400");
  const gap      = Math.max(0, target - scores.total);
  const totalQ   = Object.values(skillProgress).reduce((s,t)=>s+(t.total||0),0);
  const rank     = getXpRank(userData?.xp||0);
  const patterns = analyzePatterns(wrongAnswers||[], skillProgress||{});

  // This week's score change
  const history  = userData?.scoreHistory||[];
  const weekAgo  = history.find(h=>{
    const d = new Date(h.date); const now = new Date();
    return (now-d) <= 7*24*3600*1000;
  });
  const weekStart = history.length>0 ? history[Math.max(0,history.length-7)] : null;
  const scoreChange = weekStart ? scores.total - weekStart.total : null;

  // Days active this week (rough: streak or scoreHistory recency)
  const daysThisWeek = Math.min(7, Math.min(userData?.streak||0, 7));

  // Mastered topics count
  const masteredCount = Object.entries(skillProgress).filter(([,v])=>getTopicMastery(v)==="Mastered").length;
  const profCount     = Object.entries(skillProgress).filter(([,v])=>["Proficient","Mastered"].includes(getTopicMastery(v))).length;

  // Top 3 strongest topics
  const strongTopics = ALL_COURSES.flatMap(c=>c.topics).map(t=>({
    ...t, mastery:getTopicMastery(skillProgress?.[t.id]), pct: skillProgress?.[t.id]?.total>0
      ? Math.round((skillProgress[t.id].correct/skillProgress[t.id].total)*100) : 0
  })).filter(t=>t.pct>=70&&skillProgress?.[t.id]?.total>=3)
    .sort((a,b)=>b.pct-a.pct).slice(0,3);

  const shareText = [
    `📊 My SAT Progress This Week`,
    `Score: ${scores.total} / Target: ${target} ${gap>0?`(${gap} pts to go)`:"🎯 ON TARGET!"}`,
    scoreChange!==null ? `Trend: ${scoreChange>=0?"+":""}${scoreChange} pts this week` : "",
    `Days studied: ${daysThisWeek}/7 · Questions answered: ${totalQ}`,
    strongTopics.length>0 ? `Strong in: ${strongTopics.map(t=>t.name).join(", ")}` : "",
    patterns?.topTopics?.[0] ? `Working on: ${patterns.topTopics[0].name}` : "",
    `Rank: ${rank.label} · Streak: ${userData?.streak||0} days 🔥`,
    `\nPreparing with SAT Navigator`,
  ].filter(Boolean).join("\n");

  const handleShare = ()=>{
    if(navigator.share){
      navigator.share({title:"My SAT Progress", text:shareText}).catch(()=>{});
    } else {
      navigator.clipboard?.writeText(shareText).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);}).catch(()=>{});
    }
  };

  return (
    <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:18,overflow:"hidden",marginBottom:16}}>
      {/* Card header — looks like a shareable card */}
      <div style={{background:`linear-gradient(135deg,${T.navyDark} 0%,${T.navy} 60%,#1a4a6e 100%)`,padding:"20px 20px 16px",position:"relative",overflow:"hidden"}}>
        {/* Decorative circles */}
        <div style={{position:"absolute",top:-24,right:-24,width:100,height:100,background:"rgba(255,255,255,0.04)",borderRadius:"50%"}}/>
        <div style={{position:"absolute",bottom:-16,left:60,width:70,height:70,background:"rgba(255,255,255,0.03)",borderRadius:"50%"}}/>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.5)",marginBottom:4,letterSpacing:1}}>WEEKLY SUMMARY</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:14,color:"rgba(255,255,255,0.9)",fontWeight:700}}>{userData?.name||"Student"}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.1)",borderRadius:20,padding:"5px 10px"}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill={T.goldBright}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.goldBright,fontWeight:700}}>{rank.label}</span>
          </div>
        </div>

        {/* Big score */}
        <div style={{display:"flex",alignItems:"flex-end",gap:12,marginBottom:12}}>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:52,fontWeight:700,color:"white",lineHeight:1}}>{scores.total}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:4}}>PREDICTED SCORE</div>
          </div>
          <div style={{marginBottom:12,flex:1}}>
            {scoreChange!==null && (
              <div style={{display:"inline-flex",alignItems:"center",gap:4,background:scoreChange>=0?"rgba(45,106,79,0.4)":"rgba(139,58,15,0.4)",borderRadius:8,padding:"4px 8px",marginBottom:6}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:scoreChange>=0?T.greenMid:"#f4a090",fontWeight:700}}>
                  {scoreChange>=0?"↑":"↓"}{Math.abs(scoreChange)} pts this week
                </span>
              </div>
            )}
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:gap>0?T.goldBright:T.greenMid}}>
              {gap>0?`${gap} pts to target`:"Target reached!"}
            </div>
          </div>
        </div>

        {/* Math / RW mini bars */}
        <div style={{display:"flex",gap:8}}>
          {[{label:"Math",val:scores.math,color:T.goldBright},{label:"R&W",val:scores.rw,color:"#5dd9d6"}].map(s=>(
            <div key={s.label} style={{flex:1,background:"rgba(255,255,255,0.07)",borderRadius:8,padding:"8px 10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.6)"}}>{s.label}</span>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:13,fontWeight:700,color:s.color}}>{s.val}</span>
              </div>
              <div style={{height:3,background:"rgba(255,255,255,0.1)",borderRadius:2,overflow:"hidden"}}>
                <div style={{width:`${((s.val-200)/600)*100}%`,height:"100%",background:s.color}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:`1px solid ${T.border}`}}>
        {[
          {label:"DAYS STUDIED",val:daysThisWeek,sub:"this week",color:T.navy},
          {label:"QUESTIONS",val:totalQ,sub:"answered",color:T.teal},
          {label:"STREAK",val:`${userData?.streak||0}🔥`,sub:"days",color:T.rum},
        ].map((s,i)=>(
          <div key={i} style={{padding:"12px 8px",textAlign:"center",borderRight:i<2?`1px solid ${T.border}`:"none"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:s.color,lineHeight:1.2,marginBottom:2}}>{s.val}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:T.textMuted,lineHeight:1.3}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Strengths + working on */}
      <div style={{padding:"14px 16px"}}>
        {strongTopics.length>0&&(
          <div style={{marginBottom:10}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.green,fontWeight:700,marginBottom:6}}>✓ STRONG IN</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {strongTopics.map(t=>(
                <span key={t.id} style={{background:T.greenFaint,border:`1px solid ${T.greenMid}40`,borderRadius:20,padding:"4px 10px",fontFamily:"'Space Mono',monospace",fontSize:10,color:T.green}}>{t.name}</span>
              ))}
            </div>
          </div>
        )}
        {patterns?.topTopics?.[0]&&(
          <div style={{marginBottom:10}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.rum,fontWeight:700,marginBottom:6}}>→ WORKING ON</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {patterns.topTopics.slice(0,2).map(t=>(
                <span key={t.id} style={{background:T.rumFaint,border:`1px solid ${T.rum}30`,borderRadius:20,padding:"4px 10px",fontFamily:"'Space Mono',monospace",fontSize:10,color:T.rum}}>{t.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* Share button */}
        <button onClick={handleShare}
          style={{width:"100%",background:copied?T.green:T.navyDark,color:"white",border:"none",borderRadius:12,padding:"13px",fontFamily:"'Poppins',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:4,transition:"background 0.3s"}}>
          {copied
            ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
            : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share Progress</>
          }
        </button>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:T.textMuted,textAlign:"center",marginTop:6}}>
          Share with a parent, tutor, or friend
        </div>
      </div>
    </div>
  );
}

function ScoreSparkline({history, target, color=T.goldBright, height=64}) {
  if(!history||history.length<1) return (
    <div style={{height,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"rgba(255,255,255,0.4)"}}>Practice to see your score trend</div>
    </div>
  );
  // Single entry — show as a dot with label rather than a line
  if(history.length===1) return (
    <div style={{height,display:"flex",alignItems:"center",gap:12,padding:"0 4px"}}>
      <div style={{width:10,height:10,borderRadius:"50%",background:color,flexShrink:0}}/>
      <div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color,lineHeight:1}}>{history[0].total}</div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.4)",marginTop:2}}>TODAY'S SCORE · KEEP PRACTICING TO SEE TREND</div>
      </div>
    </div>
  );

  const vals = history.map(h=>h.total);
  const min  = Math.min(...vals, target-200);
  const max  = Math.max(...vals, target+50);
  const range = max - min || 1;
  const W = 300, H = height;
  const pad = {l:4,r:4,t:8,b:4};
  const iW = W-pad.l-pad.r, iH = H-pad.t-pad.b;

  const toX = (i) => pad.l + (i/(vals.length-1))*iW;
  const toY = (v) => pad.t + iH - ((v-min)/range)*iH;

  const pathD = vals.map((v,i)=>`${i===0?"M":"L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const areaD = pathD + ` L${toX(vals.length-1).toFixed(1)},${(pad.t+iH).toFixed(1)} L${pad.l},${(pad.t+iH).toFixed(1)} Z`;
  const targetY = toY(target);
  const lastX   = toX(vals.length-1);
  const lastY   = toY(vals[vals.length-1]);
  const firstY  = toY(vals[0]);
  const trend   = vals[vals.length-1] - vals[0];

  return (
    <div style={{position:"relative"}}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible",display:"block"}}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Target line */}
        <line x1={pad.l} y1={targetY} x2={W-pad.r} y2={targetY} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4,3"/>
        <text x={W-pad.r-2} y={targetY-3} fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="end" fontFamily="monospace">{target}</text>
        {/* Area fill */}
        <path d={areaD} fill="url(#sparkGrad)"/>
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* First dot */}
        <circle cx={toX(0)} cy={firstY} r="3" fill={color} opacity="0.5"/>
        {/* Last dot */}
        <circle cx={lastX} cy={lastY} r="4" fill={color}/>
        {/* Last score label */}
        <text x={lastX} y={lastY-8} fill="white" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">{vals[vals.length-1]}</text>
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
        <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.4)"}}>{history[0]?.date?.split(" ").slice(1,3).join(" ")}</span>
        <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:trend>=0?T.greenMid:"#f4a090",fontWeight:700}}>{trend>=0?"↑":"↓"}{Math.abs(trend)} pts</span>
        <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.4)"}}>Today</span>
      </div>
    </div>
  );
}

function ProgressScreen({userData,skillProgress,setScreen,startPractice,wrongAnswers,todayQCount}) {
  const [showPaywallProgress, setShowPaywallProgress] = React.useState(false);
  const scores  = getPredictedScore(skillProgress);
  const rank    = getXpRank(userData?.xp||0);
  const toNext  = getXpToNext(userData?.xp||0);
  const totalQ  = Object.values(skillProgress).reduce((s,t)=>s+(t.total||0),0);
  const quota   = getDailyQuota(userData);
  const status  = getScheduleStatus(todayQCount||0, quota);
  const target  = parseInt(userData?.targetScore||"1400");
  const gap     = Math.max(0, target - scores.total);
  const today   = new Date();

  const calDays = Array.from({length:28},(_,i)=>{
    const d = new Date(today); d.setDate(d.getDate()-(27-i));
    return {date:d.toDateString(),label:d.getDate()};
  });
  const activeDateSet = new Set((userData?.scoreHistory||[]).map(h=>h.date));

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {showPaywallProgress&&<PaywallModal onClose={()=>setShowPaywallProgress(false)}/>}
      <NavHeader title="Progress" subtitle="YOUR JOURNEY"
        right={<button onClick={()=>setScreen("settings")} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>}
      />
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px 8px"}}>

        <ProgressNarrative userData={userData} skillProgress={skillProgress} wrongAnswers={wrongAnswers} todayQCount={todayQCount}/>

        {/* Score card with sparkline */}
        <div style={{background:`linear-gradient(135deg,${T.navyDark},${T.navy})`,borderRadius:18,padding:"20px",marginBottom:14,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-30,right:-30,width:130,height:130,background:"rgba(255,255,255,0.04)",borderRadius:"50%"}}/>
          {/* Top row */}
          {(()=>{
            const sh = userData?.scoreHistory||[];
            const firstScore = sh.length>=2 ? sh[0].total : null;
            const improvement = firstScore!==null ? scores.total - firstScore : null;
            return improvement!==null&&improvement!==0 ? (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,background:"rgba(255,255,255,0.08)",borderRadius:8,padding:"6px 10px"}}>
                <span style={{fontSize:14}}>{improvement>0?"📈":"📉"}</span>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:improvement>0?T.greenMid:"#f87171",letterSpacing:0.3}}>
                  {improvement>0?"+":""}{improvement} pts since you started
                </span>
              </div>
            ) : null;
          })()}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
            <div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.5)",marginBottom:4}}>PREDICTED SCORE</div>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:48,fontWeight:700,color:"white",lineHeight:1}}>{scores.total}</div>
                <div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:gap>0?T.goldBright:T.greenMid}}>{gap>0?`${gap} to go`:"On target!"}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.4)"}}>/ {target}</div>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              {[{label:"M",val:scores.math,color:T.goldBright},{label:"RW",val:scores.rw,color:T.tealLight}].map(s=>(
                <div key={s.label} style={{background:"rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px",textAlign:"center",minWidth:48}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:s.color}}>{s.val}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.5)",marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Sparkline */}
          <div style={{marginTop:12}}>
            <ScoreSparkline history={userData?.scoreHistory||[]} target={target} color={T.goldBright} height={56}/>
          </div>
        </div>

        {/* Stats row */}
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[
            {label:"STREAK",val:userData?.streak||0,sub:"days",color:T.rum,bg:T.rumFaint},
            {label:"ANSWERED",val:totalQ.toLocaleString(),sub:"total",color:T.navy,bg:T.navyFaint},
            {label:"TODAY",val:`${todayQCount||0}/${quota}`,sub:status.label.replace(/[^\w\s/]/g,"").trim()||"on track",color:status.color,bg:"white"},
          ].map(s=>(
            <div key={s.label} style={{flex:1,background:s.bg,border:`1.5px solid ${T.border}`,borderRadius:14,padding:"13px 8px",textAlign:"center"}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:s.color,lineHeight:1.2,marginBottom:3}}>{s.val}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:s.color,opacity:0.8}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Streak calendar */}
        <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:16,padding:"16px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:T.textPrimary}}>STUDY STREAK</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.rum}}>{userData?.streak||0} days</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {["S","M","T","W","T","F","S"].map((d,i)=>(
              <div key={i} style={{textAlign:"center",fontFamily:"'Space Mono',monospace",fontSize:9,color:T.textMuted,paddingBottom:3}}>{d}</div>
            ))}
            {calDays.map((d,i)=>{
              const isToday   = d.date===today.toDateString();
              const isActive  = activeDateSet.has(d.date);
              const bg = isToday ? T.navy : isActive ? T.rum : T.surface2;
              const border = isToday ? T.navy : isActive ? T.rum : T.border;
              const textColor = (isToday||isActive) ? "white" : T.textMuted;
              return (
                <div key={i} style={{aspectRatio:"1",borderRadius:5,background:bg,border:`1px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s"}}>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:textColor,fontWeight:(isToday||isActive)?700:400}}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mastery map */}
        {["math","rw"].map(sec=>{
          const courses = ALL_COURSES.filter(c=>c.section===sec);
          const secScore = sec==="math"?scores.math:scores.rw;
          return (
            <div key={sec} style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:16,padding:"16px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:T.textPrimary}}>{sec==="math"?"MATH":"READING & WRITING"}</div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:17,fontWeight:700,color:sec==="math"?T.gold:T.teal}}>{secScore}</div>
              </div>
              {courses.map(c=>{
                const prog = getCourseProgress(c.id,skillProgress);
                return (
                  <div key={c.id} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <div style={{fontSize:13,fontWeight:600,color:T.textPrimary}}>{c.name}</div>
                      <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:c.color,fontWeight:700}}>{prog.pct}%</div>
                    </div>
                    <div style={{display:"flex",gap:3,marginBottom:3}}>
                      {c.topics.map(t=>{
                        const m = getTopicMastery(skillProgress?.[t.id]);
                        const mc = MASTERY_COLORS[m];
                        return <div key={t.id} title={t.name} style={{flex:1,height:24,borderRadius:5,background:mc.bg,border:`1px solid ${mc.border}`,cursor:"pointer",transition:"opacity 0.15s"}} onClick={()=>{startPractice(c.id);setScreen("practice");}}/>;
                      })}
                    </div>
                    <div style={{display:"flex",gap:3}}>
                      {c.topics.map(t=>(
                        <div key={t.id} style={{flex:1,fontFamily:"'Space Mono',monospace",fontSize:7,color:T.textMuted,textAlign:"center",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{t.name.split(" ")[0]}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Rank */}
        <div style={{background:"white",border:`1.5px solid ${T.border}`,borderRadius:16,padding:"16px",marginBottom:14}}>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:T.textPrimary,marginBottom:12}}>RANK</div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:46,height:46,borderRadius:12,background:T.goldFaint,border:`1.5px solid ${T.goldBright}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={T.gold}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:T.gold,marginBottom:2}}>{rank.label}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted}}>{userData?.xp||0} XP{toNext?` · ${toNext.next.min-(userData?.xp||0)} to ${toNext.next.label}`:""}</div>
              {toNext&&<div style={{height:4,background:T.border,borderRadius:2,marginTop:6,overflow:"hidden"}}><div style={{width:`${toNext.progress*100}%`,height:"100%",background:T.goldBright,borderRadius:2}}/></div>}
            </div>
          </div>
        </div>

        <div style={{height:16}}/>

        {/* Settings entry */}
        <button onClick={()=>setScreen("settings")}
          style={{width:"100%",background:"white",border:`1.5px solid ${T.border}`,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:600,color:T.textPrimary}}>Settings</div>
              <div style={{fontSize:12,color:T.textMuted,marginTop:1}}>Test date · Target score · Daily goal</div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Weekly summary card */}
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:T.textMuted,letterSpacing:1,marginBottom:8}}>SHARE YOUR PROGRESS</div>
        <WeeklySummaryCard userData={userData} skillProgress={skillProgress} wrongAnswers={wrongAnswers} todayQCount={todayQCount}/>

        {/* Upgrade banner */}
        {!userData?.isPro&&(
          <button onClick={()=>setShowPaywallProgress(true)}
            style={{width:"100%",display:"flex",alignItems:"center",gap:14,background:`linear-gradient(135deg,${T.navyDark},${T.navy})`,border:"none",borderRadius:16,padding:"16px 18px",cursor:"pointer",marginTop:8,textAlign:"left"}}>
            <div style={{width:42,height:42,borderRadius:10,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:20}}>🧭</span>
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:14,fontWeight:700,color:"white",marginBottom:3}}>Upgrade to Pro</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.55)",letterSpacing:0.5}}>UNLIMITED QUESTIONS · FULL FEATURES</div>
            </div>
            <div style={{background:T.goldBright,borderRadius:8,padding:"6px 10px",flexShrink:0}}>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:T.navyDark,letterSpacing:0.5}}>$9.99/MO</span>
            </div>
          </button>
        )}

        <div style={{height:8}}/>
      </div>
      <BottomNav screen="progress" setScreen={setScreen}/>
    </div>
  );
}


const OFFLINE_BANK = {
  linear_eq: [
    {"q": "Solve: 3x + 7 = 22", "options": ["A. 3", "B. 4", "C. 5", "D. 6"], "answer": 2, "hint": "Subtract 7, divide by 3", "explanation": "3x = **15**, so x = **5**"},
    {"q": "If 2x - 4 = 10, find x", "options": ["A. 3", "B. 5", "C. 7", "D. 9"], "answer": 2, "hint": "Add 4 first", "explanation": "2x = **14**, so x = **7**"},
    {"q": "Solve: 5x + 2 = 3x + 10", "options": ["A. 2", "B. 4", "C. 6", "D. 8"], "answer": 1, "hint": "Move x terms left", "explanation": "**2x = 8**, x = **4**"},
    {"q": "Solve: 4(x - 1) = 12", "options": ["A. 2", "B. 3", "C. 4", "D. 5"], "answer": 2, "hint": "Distribute 4", "explanation": "4x - 4 = 12 → x = **4**"},
    {"q": "Solve: x/3 + 2 = 5", "options": ["A. 7", "B. 8", "C. 9", "D. 10"], "answer": 2, "hint": "Subtract 2, multiply by 3", "explanation": "x/3 = 3 → x = **9**"},
    {"q": "If 7 - 2x = 1, find x", "options": ["A. 2", "B. 3", "C. 4", "D. 5"], "answer": 1, "hint": "Isolate 2x first", "explanation": "2x = **6**, x = **3**"},
    {"q": "Solve: 3(2x + 1) = 21", "options": ["A. 2", "B. 3", "C. 4", "D. 5"], "answer": 1, "hint": "Divide by 3 first", "explanation": "2x + 1 = 7 → x = **3**"},
    {"q": "Solve: 2x + 5 = x + 11", "options": ["A. 4", "B. 6", "C. 8", "D. 10"], "answer": 1, "hint": "Subtract x from both sides", "explanation": "x = **6**"},
    {"q": "If 3x - 2 = 2x + 5, find x", "options": ["A. 5", "B. 6", "C. 7", "D. 8"], "answer": 2, "hint": "Subtract 2x, add 2", "explanation": "x = **7**"},
    {"q": "Solve: 0.5x = 12", "options": ["A. 6", "B. 12", "C. 18", "D. 24"], "answer": 3, "hint": "Divide by 0.5 = multiply by 2", "explanation": "x = **24**"},
  ],
  inequalities: [
    {"q": "Which satisfies 2x + 3 > 11?", "options": ["A. x=2", "B. x=3", "C. x=4", "D. x=5"], "answer": 3, "hint": "Solve: x > 4", "explanation": "2x > 8 → x > **4**, so x=5 works"},
    {"q": "Solve: 3x - 6 ≤ 9", "options": ["A. x≤3", "B. x≤4", "C. x≤5", "D. x≤6"], "answer": 2, "hint": "Add 6, divide by 3", "explanation": "3x ≤ **15** → x ≤ **5**"},
    {"q": "Solve: -2x < 8", "options": ["A. x<-4", "B. x>-4", "C. x<4", "D. x>4"], "answer": 1, "hint": "Flip inequality when dividing by negative", "explanation": "x > **-4**"},
    {"q": "Solve: 4x + 1 > 17", "options": ["A. x>3", "B. x>4", "C. x>5", "D. x>6"], "answer": 1, "hint": "Subtract 1, divide by 4", "explanation": "4x > 16 → x > **4**"},
    {"q": "Solve: -3x + 2 ≤ -7", "options": ["A. x≤3", "B. x≥3", "C. x≤-3", "D. x≥-3"], "answer": 1, "hint": "Subtract 2, divide by -3 (flip!)", "explanation": "-3x ≤ -9 → x ≥ **3**"},
    {"q": "Solve: 2(x+1) < 10", "options": ["A. x<3", "B. x<4", "C. x<5", "D. x<6"], "answer": 1, "hint": "Distribute then solve", "explanation": "2x + 2 < 10 → x < **4**"},
    {"q": "Which x satisfies 5 - x > 2?", "options": ["A. 4", "B. 3", "C. 2", "D. 1"], "answer": 3, "hint": "x < 3", "explanation": "x < 3, so x = **1** works"},
    {"q": "Solve: x/2 - 1 ≥ 3", "options": ["A. x≥6", "B. x≥7", "C. x≥8", "D. x≥9"], "answer": 2, "hint": "Add 1, multiply by 2", "explanation": "x/2 ≥ 4 → x ≥ **8**"},
    {"q": "Solve: 3x/2 ≤ 6", "options": ["A. x≤2", "B. x≤3", "C. x≤4", "D. x≤5"], "answer": 2, "hint": "Multiply by 2/3", "explanation": "x ≤ **4**"},
    {"q": "Which is NOT in x + 3 > 7?", "options": ["A. 5", "B. 6", "C. 7", "D. 4"], "answer": 3, "hint": "x > 4", "explanation": "x > 4 excludes x = **4**"},
  ],
  systems: [
    {"q": "Solve: x+y=7, x-y=3", "options": ["A. (5,2)", "B. (4,3)", "C. (3,4)", "D. (6,1)"], "answer": 0, "hint": "Add equations", "explanation": "2x=10, x=**5**, y=**2**"},
    {"q": "2x+y=11, x+y=7. Find x.", "options": ["A. 2", "B. 3", "C. 4", "D. 5"], "answer": 2, "hint": "Subtract equations", "explanation": "x = **4**"},
    {"q": "3x-y=5, x+y=7. Find x.", "options": ["A. 2", "B. 3", "C. 4", "D. 5"], "answer": 1, "hint": "Add equations", "explanation": "4x=12, x = **3**"},
    {"q": "x+2y=10, x-2y=2. Find y.", "options": ["A. 1", "B. 2", "C. 3", "D. 4"], "answer": 1, "hint": "Subtract to eliminate x", "explanation": "4y=8, y = **2**"},
    {"q": "y=2x, x+y=9. Solve.", "options": ["A. (2,4)", "B. (3,6)", "C. (4,8)", "D. (5,10)"], "answer": 1, "hint": "Substitute y=2x", "explanation": "3x=9, x=**3**, y=**6**"},
    {"q": "How many solutions: 2x+y=6, 4x+2y=12?", "options": ["A. None", "B. One", "C. Infinite", "D. Two"], "answer": 2, "hint": "Are the equations proportional?", "explanation": "**Infinitely many** — same line"},
    {"q": "x+y=5 and x+y=8: solutions?", "options": ["A. 0", "B. 1", "C. 2", "D. Infinite"], "answer": 0, "hint": "Parallel lines", "explanation": "**No solution** — parallel lines"},
    {"q": "4x-y=10, 2x-y=4. Find x.", "options": ["A. 2", "B. 3", "C. 4", "D. 5"], "answer": 1, "hint": "Subtract equations", "explanation": "2x=6, x = **3**"},
    {"q": "x=y+1, 2x+y=7. Solve.", "options": ["A. (2,1)", "B. (3,2)", "C. (4,3)", "D. (1,0)"], "answer": 1, "hint": "Substitute x=y+1", "explanation": "3y+2=7, y=**2**, x=**3**"},
    {"q": "If 3x+2y=16 and y=2, find x", "options": ["A. 2", "B. 4", "C. 6", "D. 8"], "answer": 1, "hint": "Substitute y=2", "explanation": "3x=12, x = **4**"},
  ],
  linear_fn: [
    {"q": "Slope of line through (1,2) and (3,6)?", "options": ["A. 1", "B. 2", "C. 3", "D. 4"], "answer": 1, "hint": "m = (y2-y1)/(x2-x1)", "explanation": "(6-2)/(3-1) = **2**"},
    {"q": "y=3x-5: y-intercept?", "options": ["A. 3", "B. -3", "C. 5", "D. -5"], "answer": 3, "hint": "y-intercept is b in y=mx+b", "explanation": "y-intercept = **-5**"},
    {"q": "Which line has slope 2?", "options": ["A. y=2x+1", "B. y=x+2", "C. y=3x-2", "D. y=-2x+1"], "answer": 0, "hint": "Coefficient of x is slope", "explanation": "y=**2**x+1 has slope 2"},
    {"q": "Find slope: y = -4x + 7", "options": ["A. 7", "B. -7", "C. 4", "D. -4"], "answer": 3, "hint": "m is coefficient of x", "explanation": "Slope = **-4**"},
    {"q": "Slope of horizontal line?", "options": ["A. Undefined", "B. 0", "C. 1", "D. -1"], "answer": 1, "hint": "Horizontal = no rise", "explanation": "Slope = **0**"},
    {"q": "Line: y=2x+3. At x=4, y=?", "options": ["A. 9", "B. 10", "C. 11", "D. 12"], "answer": 2, "hint": "Substitute x=4", "explanation": "y = 2(4)+3 = **11**"},
    {"q": "Which line is perpendicular to y=2x?", "options": ["A. y=2x+1", "B. y=-x/2", "C. y=x/2", "D. y=-2x"], "answer": 1, "hint": "Perpendicular slopes multiply to -1", "explanation": "m = -1/2, so y = **-x/2**"},
    {"q": "Slope of vertical line?", "options": ["A. 0", "B. 1", "C. -1", "D. Undefined"], "answer": 3, "hint": "Vertical = no run", "explanation": "Slope is **undefined**"},
    {"q": "y=mx+b form for: 2y=6x+4", "options": ["A. y=3x+4", "B. y=3x+2", "C. y=6x+2", "D. y=2x+4"], "answer": 1, "hint": "Divide both sides by 2", "explanation": "y = **3x + 2**"},
    {"q": "Which two lines are parallel?", "options": ["A. y=2x+1 and y=2x-3", "B. y=x and y=-x", "C. y=3x and y=x+3", "D. y=2x and y=3x"], "answer": 0, "hint": "Parallel lines have equal slopes", "explanation": "Both have slope **2** — parallel"},
  ],
  abs_value: [
    {"q": "Solve: |x| = 5", "options": ["A. x=5", "B. x=-5", "C. x=5 or x=-5", "D. x=0"], "answer": 2, "hint": "Two solutions for absolute value", "explanation": "x = **5 or -5**"},
    {"q": "Solve: |2x| = 8", "options": ["A. x=4", "B. x=-4", "C. x=4 or x=-4", "D. No solution"], "answer": 2, "hint": "Divide by 2 after solving |2x|=8", "explanation": "2x=8 or 2x=-8, so x = **4 or -4**"},
    {"q": "Solve: |x - 3| = 2", "options": ["A. x=1 or x=5", "B. x=1 or x=-5", "C. x=5 only", "D. x=-1 or x=5"], "answer": 0, "hint": "x-3=2 or x-3=-2", "explanation": "x = **5 or 1**"},
    {"q": "What is |−7|?", "options": ["A. -7", "B. 7", "C. 0", "D. 49"], "answer": 1, "hint": "Absolute value is always positive", "explanation": "|−7| = **7**"},
    {"q": "Solve: |x + 1| = 4", "options": ["A. x=3", "B. x=-5", "C. x=3 or x=-5", "D. No solution"], "answer": 2, "hint": "x+1=4 or x+1=-4", "explanation": "x = **3 or -5**"},
    {"q": "Which has no solution: |x|=?", "options": ["A. |x|=0", "B. |x|=1", "C. |x|=-3", "D. |x|=100"], "answer": 2, "hint": "Absolute value can't be negative", "explanation": "|x| = **-3** has no solution"},
    {"q": "Solve: |3x| = 9", "options": ["A. x=3", "B. x=-3", "C. x=3 or x=-3", "D. x=9"], "answer": 2, "hint": "3x=9 or 3x=-9", "explanation": "x = **3 or -3**"},
    {"q": "If |x - 2| < 1, which is true?", "options": ["A. 0<x<3", "B. 1<x<3", "C. -1<x<3", "D. x<3"], "answer": 1, "hint": "-1 < x-2 < 1, then add 2", "explanation": "**1 < x < 3**"},
    {"q": "Which value satisfies |2x - 1| = 5?", "options": ["A. x=3", "B. x=-2", "C. Both A and B", "D. Neither"], "answer": 2, "hint": "2x-1=5 or 2x-1=-5", "explanation": "x=**3** or x=**-2**"},
    {"q": "|-15 + 9| = ?", "options": ["A. -6", "B. 6", "C. 24", "D. -24"], "answer": 1, "hint": "Compute inside first", "explanation": "|-6| = **6**"},
  ],
  word_probs: [
    {"q": "A train travels 60 mph for 2.5 hours. How far?", "options": ["A. 120 mi", "B. 140 mi", "C. 150 mi", "D. 160 mi"], "answer": 2, "hint": "distance = rate × time", "explanation": "60 × 2.5 = **150 miles**"},
    {"q": "Twice a number plus 3 equals 19. The number is?", "options": ["A. 7", "B. 8", "C. 9", "D. 10"], "answer": 1, "hint": "2n + 3 = 19", "explanation": "2n = 16, n = **8**"},
    {"q": "Tickets: adult $12, child $8. 5 adults, 3 children. Total?", "options": ["A. $80", "B. $84", "C. $88", "D. $92"], "answer": 1, "hint": "Multiply then add", "explanation": "5(12) + 3(8) = 60 + 24 = **$84**"},
    {"q": "Anna has $240 and earns $15/hour. Hours to reach $360?", "options": ["A. 6", "B. 7", "C. 8", "D. 9"], "answer": 2, "hint": "Set up equation", "explanation": "240 + 15h = 360 → h = **8**"},
    {"q": "The sum of three consecutive integers is 42. Smallest?", "options": ["A. 12", "B. 13", "C. 14", "D. 15"], "answer": 1, "hint": "n + (n+1) + (n+2) = 42", "explanation": "3n + 3 = 42 → n = **13**"},
    {"q": "A rectangle has perimeter 36. Length is twice width. Width?", "options": ["A. 4", "B. 5", "C. 6", "D. 7"], "answer": 2, "hint": "2l + 2w = 36, l = 2w", "explanation": "6w = 36, w = **6**"},
    {"q": "Coffee costs $3.50 + $0.75 per extra shot. 3 extra shots?", "options": ["A. $5.25", "B. $5.50", "C. $5.75", "D. $6.00"], "answer": 2, "hint": "3.50 + 3(0.75)", "explanation": "3.50 + 2.25 = **$5.75**"},
    {"q": "Sam reads 25 pages/day. Days to read 400 pages?", "options": ["A. 14", "B. 15", "C. 16", "D. 17"], "answer": 2, "hint": "400 ÷ 25", "explanation": "400 ÷ 25 = **16 days**"},
    {"q": "Two numbers sum to 50. One is 14 more. Larger number?", "options": ["A. 30", "B. 32", "C. 34", "D. 36"], "answer": 1, "hint": "x + (x+14) = 50", "explanation": "2x = 36, x = 18, larger = **32**"},
    {"q": "Car rental: $40/day + $0.10/mile. 3 days, 80 miles. Cost?", "options": ["A. $120", "B. $128", "C. $136", "D. $144"], "answer": 1, "hint": "3(40) + 80(0.10)", "explanation": "120 + 8 = **$128**"},
  ],
  quadratics: [
    {"q": "Factor: x² + 5x + 6", "options": ["A. (x+2)(x+3)", "B. (x+1)(x+6)", "C. (x-2)(x-3)", "D. (x+2)(x-3)"], "answer": 0, "hint": "Find two numbers that multiply to 6 and add to 5", "explanation": "**2 × 3 = 6** and **2 + 3 = 5**: (x+2)(x+3)"},
    {"q": "Solve: x² - 9 = 0", "options": ["A. x=3", "B. x=-3", "C. x=±3", "D. x=9"], "answer": 2, "hint": "Difference of squares", "explanation": "x² = 9 → x = **±3**"},
    {"q": "Roots of x² - 5x + 6 = 0?", "options": ["A. 2,3", "B. 1,6", "C. -2,-3", "D. -1,6"], "answer": 0, "hint": "Factor: (x-2)(x-3)", "explanation": "x = **2 or 3**"},
    {"q": "Vertex of y = (x-3)² + 2?", "options": ["A. (3,2)", "B. (-3,2)", "C. (3,-2)", "D. (2,3)"], "answer": 0, "hint": "Vertex form: (h,k)", "explanation": "Vertex is **(3, 2)**"},
    {"q": "Discriminant of x² + 2x + 5?", "options": ["A. -16", "B. 16", "C. 24", "D. -24"], "answer": 0, "hint": "b²-4ac", "explanation": "4 - 4(1)(5) = **-16** (no real roots)"},
    {"q": "Solve: 2x² = 18", "options": ["A. x=3", "B. x=-3", "C. x=±3", "D. x=9"], "answer": 2, "hint": "Divide by 2, take square root", "explanation": "x² = 9 → x = **±3**"},
    {"q": "Which is a root of x² - 7x + 12 = 0?", "options": ["A. 2", "B. 3", "C. 5", "D. 6"], "answer": 1, "hint": "Factor or use quadratic formula", "explanation": "(x-3)(x-4)=0, x = **3 or 4**"},
    {"q": "How many real solutions: x² + 4 = 0?", "options": ["A. 0", "B. 1", "C. 2", "D. 4"], "answer": 0, "hint": "Check discriminant", "explanation": "x² = -4, **no real solutions**"},
    {"q": "y = x² - 4: x-intercepts?", "options": ["A. (2,0) only", "B. (-2,0) only", "C. (±2,0)", "D. (4,0)"], "answer": 2, "hint": "Set y=0, solve", "explanation": "x² = 4, x = **±2**"},
    {"q": "Product of roots of x² - 5x + 6 = 0?", "options": ["A. 5", "B. -5", "C. 6", "D. -6"], "answer": 2, "hint": "Product of roots = c/a", "explanation": "Product = **6**"},
  ],
  polynomials: [
    {"q": "(x+2)(x+3) = ?", "options": ["A. x²+5x+6", "B. x²+6x+5", "C. x²+5x+5", "D. x²+6x+6"], "answer": 0, "hint": "FOIL", "explanation": "x² + 3x + 2x + 6 = **x²+5x+6**"},
    {"q": "Degree of 3x⁴ - 2x² + 7?", "options": ["A. 2", "B. 3", "C. 4", "D. 7"], "answer": 2, "hint": "Highest exponent", "explanation": "Degree = **4**"},
    {"q": "Leading coefficient of -2x³ + 5x - 1?", "options": ["A. -1", "B. 5", "C. -2", "D. 3"], "answer": 2, "hint": "Coefficient of highest-degree term", "explanation": "Leading coefficient = **-2**"},
    {"q": "(x² + 3x) - (x² - 2x) = ?", "options": ["A. 5x", "B. x", "C. 6x", "D. -5x"], "answer": 0, "hint": "Subtract like terms", "explanation": "3x - (-2x) = **5x**"},
    {"q": "If P(x) = x² - 3x + 2, find P(0)", "options": ["A. 0", "B. 1", "C. 2", "D. -2"], "answer": 2, "hint": "Substitute x=0", "explanation": "0 - 0 + 2 = **2**"},
    {"q": "Factor: x² - 16", "options": ["A. (x-4)²", "B. (x+4)(x-4)", "C. (x-4)(x-4)", "D. (x+8)(x-2)"], "answer": 1, "hint": "Difference of squares", "explanation": "**(x+4)(x-4)**"},
    {"q": "Remainder when x² + 2x + 1 is divided by (x-1)?", "options": ["A. 0", "B. 2", "C. 4", "D. 6"], "answer": 2, "hint": "Remainder theorem: evaluate at x=1", "explanation": "1 + 2 + 1 = **4**"},
    {"q": "Which is a factor of x² - 5x + 4?", "options": ["A. (x-2)", "B. (x-4)", "C. (x+1)", "D. (x+4)"], "answer": 1, "hint": "Find roots: 1 and 4", "explanation": "(x-1)(x-4), so **(x-4)** is a factor"},
    {"q": "(2x + 1)² = ?", "options": ["A. 4x²+1", "B. 4x²+2x+1", "C. 4x²+4x+1", "D. 2x²+4x+1"], "answer": 2, "hint": "(a+b)² = a²+2ab+b²", "explanation": "4x² + 4x + 1"},
    {"q": "P(x) = x³ - 1, find P(1)", "options": ["A. 0", "B. 1", "C. -1", "D. 2"], "answer": 0, "hint": "Substitute x=1", "explanation": "1 - 1 = **0**"},
  ],
  rational: [
    {"q": "Simplify: (x²-4)/(x-2)", "options": ["A. x+2", "B. x-2", "C. x+4", "D. x²+2"], "answer": 0, "hint": "Factor numerator", "explanation": "(x+2)(x-2)/(x-2) = **x+2**"},
    {"q": "Solve: 1/x = 3", "options": ["A. x=1/3", "B. x=3", "C. x=-3", "D. x=1"], "answer": 0, "hint": "Cross multiply", "explanation": "x = **1/3**"},
    {"q": "Which value makes (x+3)/(x-2) undefined?", "options": ["A. -3", "B. 2", "C. -2", "D. 3"], "answer": 1, "hint": "Denominator = 0", "explanation": "x-2=0 → x = **2**"},
    {"q": "Simplify: 6x²/3x", "options": ["A. 2x", "B. 2x²", "C. 3x", "D. 6x"], "answer": 0, "hint": "Divide coefficients and x terms", "explanation": "6/3 × x²/x = **2x**"},
    {"q": "Solve: 2/x + 1 = 3", "options": ["A. x=1", "B. x=2", "C. x=3", "D. x=4"], "answer": 0, "hint": "Subtract 1, solve 2/x=2", "explanation": "2/x = 2 → x = **1**"},
    {"q": "Simplify: (x²-9)/(x+3)", "options": ["A. x-3", "B. x+3", "C. x-9", "D. x+9"], "answer": 0, "hint": "Factor x²-9", "explanation": "(x+3)(x-3)/(x+3) = **x-3**"},
    {"q": "LCD of 1/4 and 1/6?", "options": ["A. 10", "B. 12", "C. 24", "D. 8"], "answer": 1, "hint": "LCM of 4 and 6", "explanation": "LCD = **12**"},
    {"q": "Solve: x/(x-1) = 2", "options": ["A. x=1", "B. x=2", "C. x=-2", "D. x=3"], "answer": 1, "hint": "Multiply both sides by (x-1)", "explanation": "x = 2(x-1) → x = **2**"},
    {"q": "Which x is excluded from x/(x²-x)?", "options": ["A. 0 only", "B. 1 only", "C. 0 and 1", "D. -1 and 0"], "answer": 2, "hint": "Factor denominator: x(x-1)", "explanation": "x=**0 and x=1** are excluded"},
    {"q": "Simplify: (2x+4)/(x+2)", "options": ["A. 2", "B. x+2", "C. 2x", "D. 4"], "answer": 0, "hint": "Factor numerator", "explanation": "2(x+2)/(x+2) = **2**"},
  ],
  exponential: [
    {"q": "Simplify: x³ × x⁴", "options": ["A. x⁷", "B. x¹²", "C. 2x⁷", "D. x³⁴"], "answer": 0, "hint": "Add exponents when multiplying same base", "explanation": "x^(3+4) = **x⁷**"},
    {"q": "Simplify: (x²)³", "options": ["A. x⁵", "B. x⁶", "C. x⁸", "D. 3x²"], "answer": 1, "hint": "Multiply exponents", "explanation": "x^(2×3) = **x⁶**"},
    {"q": "Evaluate: 2³ × 2²", "options": ["A. 16", "B. 32", "C. 64", "D. 4"], "answer": 1, "hint": "2^(3+2)", "explanation": "2⁵ = **32**"},
    {"q": "Simplify: x⁶/x²", "options": ["A. x³", "B. x⁴", "C. x⁸", "D. x¹²"], "answer": 1, "hint": "Subtract exponents when dividing", "explanation": "x^(6-2) = **x⁴**"},
    {"q": "What is 2⁻³?", "options": ["A. -8", "B. 1/8", "C. 8", "D. -1/8"], "answer": 1, "hint": "Negative exponent = reciprocal", "explanation": "2⁻³ = **1/8**"},
    {"q": "A bacteria doubles every hour. Starting at 50, after 3 hours?", "options": ["A. 200", "B. 300", "C. 400", "D. 600"], "answer": 2, "hint": "50 × 2³", "explanation": "50 × 8 = **400**"},
    {"q": "Simplify: (2x)²", "options": ["A. 2x²", "B. 4x²", "C. 4x", "D. 2x"], "answer": 1, "hint": "Square both 2 and x", "explanation": "4 × x² = **4x²**"},
    {"q": "What is 5⁰?", "options": ["A. 0", "B. 5", "C. 1", "D. 25"], "answer": 2, "hint": "Any nonzero number to power 0", "explanation": "5⁰ = **1**"},
    {"q": "Simplify: (x³y²)²", "options": ["A. x⁵y⁴", "B. x⁶y⁴", "C. x⁶y²", "D. x⁹y⁴"], "answer": 1, "hint": "Distribute the exponent", "explanation": "x^6 × y^4 = **x⁶y⁴**"},
    {"q": "If 3^x = 27, find x", "options": ["A. 2", "B. 3", "C. 4", "D. 9"], "answer": 1, "hint": "27 = 3³", "explanation": "3^x = 3³ → x = **3**"},
  ],
  complex: [
    {"q": "Simplify: i²", "options": ["A. 1", "B. -1", "C. i", "D. -i"], "answer": 1, "hint": "By definition", "explanation": "i² = **-1**"},
    {"q": "(3 + 2i) + (1 - 4i) = ?", "options": ["A. 4-2i", "B. 4+6i", "C. 2-2i", "D. 4-6i"], "answer": 0, "hint": "Add real and imaginary separately", "explanation": "**4 - 2i**"},
    {"q": "(2 + i)(2 - i) = ?", "options": ["A. 4-1", "B. 5", "C. 3", "D. 4+i"], "answer": 1, "hint": "Difference of squares: a²+b²", "explanation": "4 - i² = 4+1 = **5**"},
    {"q": "What is √-16?", "options": ["A. -4", "B. 4", "C. 4i", "D. -4i"], "answer": 2, "hint": "√-1 = i", "explanation": "**4i**"},
    {"q": "Real part of (5 - 3i)?", "options": ["A. -3", "B. 3", "C. 5", "D. -5"], "answer": 2, "hint": "a + bi: a is real part", "explanation": "Real part = **5**"},
    {"q": "(3i)² = ?", "options": ["A. 9i", "B. -9", "C. 9", "D. -9i"], "answer": 1, "hint": "3² × i²", "explanation": "9 × (-1) = **-9**"},
    {"q": "Imaginary part of (7 + 2i)?", "options": ["A. 7", "B. 2", "C. -2", "D. 7i"], "answer": 1, "hint": "Coefficient of i", "explanation": "Imaginary part = **2**"},
    {"q": "(1+i)² = ?", "options": ["A. 2i", "B. 2", "C. 1+2i", "D. -1+2i"], "answer": 0, "hint": "Expand: 1+2i+i²", "explanation": "1 + 2i + (-1) = **2i**"},
    {"q": "Conjugate of (4-3i)?", "options": ["A. 4+3i", "B. -4+3i", "C. -4-3i", "D. 3-4i"], "answer": 0, "hint": "Flip sign of imaginary part", "explanation": "Conjugate = **4+3i**"},
    {"q": "What is i⁴?", "options": ["A. -1", "B. i", "C. 1", "D. -i"], "answer": 2, "hint": "i²=-1, so i⁴=(i²)²", "explanation": "(-1)² = **1**"},
  ],
  functions: [
    {"q": "If f(x) = 2x + 1, find f(3)", "options": ["A. 5", "B. 6", "C. 7", "D. 8"], "answer": 2, "hint": "Substitute x=3", "explanation": "2(3)+1 = **7**"},
    {"q": "If f(x) = x², find f(-3)", "options": ["A. -9", "B. 6", "C. 9", "D. -6"], "answer": 2, "hint": "(-3)² = ?", "explanation": "(-3)² = **9**"},
    {"q": "Domain of f(x) = 1/(x-2)?", "options": ["A. All real", "B. x≠2", "C. x≠-2", "D. x>2"], "answer": 1, "hint": "Denominator ≠ 0", "explanation": "x ≠ **2**"},
    {"q": "If f(x) = x+1 and g(x) = 3x, find f(g(2))", "options": ["A. 5", "B. 6", "C. 7", "D. 8"], "answer": 2, "hint": "First g(2), then f(result)", "explanation": "g(2)=6, f(6)=**7**"},
    {"q": "Which represents a function?", "options": ["A. x=y²", "B. y=x²", "C. x²+y²=1", "D. x=|y|"], "answer": 1, "hint": "Each x maps to exactly one y", "explanation": "y=x² — **one output per input**"},
    {"q": "Find the inverse of f(x) = 2x", "options": ["A. f⁻¹=x/2", "B. f⁻¹=2/x", "C. f⁻¹=x-2", "D. f⁻¹=x+2"], "answer": 0, "hint": "Swap x and y, solve for y", "explanation": "y = **x/2**"},
    {"q": "Range of f(x) = x²?", "options": ["A. All reals", "B. y<0", "C. y≥0", "D. y>0"], "answer": 2, "hint": "x² is always ≥ 0", "explanation": "Range is **y ≥ 0**"},
    {"q": "If f(x) = x+3 and f(a) = 10, find a", "options": ["A. 5", "B. 6", "C. 7", "D. 8"], "answer": 2, "hint": "Solve a+3=10", "explanation": "a = **7**"},
    {"q": "f(x) = 3x-1. Find f⁻¹(x).", "options": ["A. (x+1)/3", "B. (x-1)/3", "C. 3x+1", "D. x/3-1"], "answer": 0, "hint": "Swap x and y, solve", "explanation": "x = 3y-1 → y = **(x+1)/3**"},
    {"q": "f(x) = |x|: f(-5) = ?", "options": ["A. -5", "B. 5", "C. 25", "D. -25"], "answer": 1, "hint": "Absolute value", "explanation": "**5**"},
  ],
  ratios: [
    {"q": "Simplify ratio 18:24", "options": ["A. 3:4", "B. 4:3", "C. 6:8", "D. 9:12"], "answer": 0, "hint": "Divide both by GCF=6", "explanation": "**3:4**"},
    {"q": "If 3:5 = x:20, find x", "options": ["A. 10", "B. 11", "C. 12", "D. 13"], "answer": 2, "hint": "Cross multiply", "explanation": "3/5 = x/20 → x = **12**"},
    {"q": "Scale: 1in = 50mi. 3.5in = ? miles", "options": ["A. 150", "B. 175", "C. 200", "D. 225"], "answer": 1, "hint": "Multiply by scale factor", "explanation": "3.5 × 50 = **175 miles**"},
    {"q": "Ratio of boys to girls: 3:2. 30 students total. Girls?", "options": ["A. 10", "B. 12", "C. 14", "D. 16"], "answer": 1, "hint": "Girls = 2/5 of total", "explanation": "2/5 × 30 = **12**"},
    {"q": "A recipe uses 2 cups flour per 3 cups milk. For 9 cups milk, flour needed?", "options": ["A. 4", "B. 5", "C. 6", "D. 7"], "answer": 2, "hint": "Set up proportion", "explanation": "2/3 = x/9 → x = **6**"},
    {"q": "Speed ratio of cars A:B = 4:5. A goes 80mph. B?", "options": ["A. 90", "B. 95", "C. 100", "D. 105"], "answer": 2, "hint": "Proportion", "explanation": "4/5 = 80/x → x = **100**"},
    {"q": "If 5 shirts cost $60, how much do 8 shirts cost?", "options": ["A. $90", "B. $96", "C. $100", "D. $104"], "answer": 1, "hint": "Find unit rate first", "explanation": "$12/shirt × 8 = **$96**"},
    {"q": "Mix: 2 parts red, 3 parts blue. 5 gallons total. Red?", "options": ["A. 1", "B. 2", "C. 3", "D. 4"], "answer": 1, "hint": "Red = 2/5 of total", "explanation": "2/5 × 5 = **2 gallons**"},
    {"q": "A map scale is 1:1000. 5cm on map = ? real cm", "options": ["A. 500", "B. 5000", "C. 50000", "D. 500000"], "answer": 1, "hint": "Multiply by 1000", "explanation": "5 × 1000 = **5000 cm**"},
    {"q": "If x:4 = 6:8, find x", "options": ["A. 2", "B. 3", "C. 4", "D. 5"], "answer": 1, "hint": "Cross multiply", "explanation": "8x = 24 → x = **3**"},
  ],
  percentages: [
    {"q": "What is 15% of 80?", "options": ["A. 10", "B. 11", "C. 12", "D. 13"], "answer": 2, "hint": "0.15 × 80", "explanation": "**12**"},
    {"q": "A $200 item is 25% off. Sale price?", "options": ["A. $140", "B. $150", "C. $160", "D. $170"], "answer": 1, "hint": "200 × 0.75", "explanation": "**$150**"},
    {"q": "60 is what % of 240?", "options": ["A. 20%", "B. 25%", "C. 30%", "D. 35%"], "answer": 1, "hint": "60/240 × 100", "explanation": "**25%**"},
    {"q": "Score goes from 80 to 100. % increase?", "options": ["A. 20%", "B. 25%", "C. 30%", "D. 15%"], "answer": 1, "hint": "(change/original) × 100", "explanation": "20/80 × 100 = **25%**"},
    {"q": "After 10% increase, price is $110. Original price?", "options": ["A. $95", "B. $100", "C. $105", "D. $99"], "answer": 1, "hint": "x × 1.1 = 110", "explanation": "x = **$100**"},
    {"q": "A jacket was $80, now $60. % decrease?", "options": ["A. 20%", "B. 25%", "C. 30%", "D. 40%"], "answer": 1, "hint": "(20/80) × 100", "explanation": "**25%**"},
    {"q": "30% of what number is 18?", "options": ["A. 54", "B. 60", "C. 66", "D. 70"], "answer": 1, "hint": "0.3x = 18", "explanation": "x = **60**"},
    {"q": "Tax rate is 8%. $50 item tax?", "options": ["A. $3", "B. $4", "C. $5", "D. $6"], "answer": 1, "hint": "0.08 × 50", "explanation": "**$4**"},
    {"q": "80 students, 60% passed. Failed?", "options": ["A. 28", "B. 30", "C. 32", "D. 34"], "answer": 2, "hint": "40% failed", "explanation": "0.40 × 80 = **32**"},
    {"q": "Price went from $50 to $65. % change?", "options": ["A. 25%", "B. 28%", "C. 30%", "D. 15%"], "answer": 2, "hint": "15/50 × 100", "explanation": "**30%**"},
  ],
  statistics: [
    {"q": "Mean of 4, 8, 12, 16?", "options": ["A. 8", "B. 9", "C. 10", "D. 12"], "answer": 2, "hint": "Sum ÷ count", "explanation": "40 ÷ 4 = **10**"},
    {"q": "Median of 3, 5, 7, 9, 11?", "options": ["A. 5", "B. 6", "C. 7", "D. 9"], "answer": 2, "hint": "Middle value", "explanation": "**7** (middle of 5 values)"},
    {"q": "Mode of 2, 3, 3, 4, 5, 5, 5?", "options": ["A. 2", "B. 3", "C. 4", "D. 5"], "answer": 3, "hint": "Most frequent", "explanation": "**5** appears 3 times"},
    {"q": "Range of 12, 5, 18, 3, 9?", "options": ["A. 13", "B. 14", "C. 15", "D. 16"], "answer": 2, "hint": "Max - Min", "explanation": "18 - 3 = **15**"},
    {"q": "New score added to {10,20,30}: mean goes from 20 to 25. New score?", "options": ["A. 30", "B. 35", "C. 40", "D. 45"], "answer": 2, "hint": "4 × 25 - 60", "explanation": "100 - 60 = **40**"},
    {"q": "Median of 2, 4, 6, 8?", "options": ["A. 4", "B. 5", "C. 6", "D. 7"], "answer": 1, "hint": "Average of two middle values", "explanation": "(4+6)/2 = **5**"},
    {"q": "Dataset: 5,5,5,10. Mean?", "options": ["A. 5", "B. 6", "C. 6.25", "D. 7"], "answer": 2, "hint": "Sum all, divide by 4", "explanation": "25/4 = **6.25**"},
    {"q": "Which measure is most affected by outliers?", "options": ["A. Mode", "B. Median", "C. Mean", "D. Range"], "answer": 2, "hint": "Which uses all values?", "explanation": "**Mean** is most affected by outliers"},
    {"q": "Scores: 70,75,80,85,90. Standard deviation is closest to?", "options": ["A. 5", "B. 7", "C. 10", "D. 15"], "answer": 1, "hint": "Roughly spread ÷ 2", "explanation": "~**7** (each value ~7 from mean)"},
    {"q": "If outlier 100 is removed from {2,3,4,5,100}, median changes from?", "options": ["A. 4 to 3", "B. 4 to 3.5", "C. 5 to 4", "D. No change"], "answer": 1, "hint": "New median of {2,3,4,5}", "explanation": "Old median=4, new median=**3.5**"},
  ],
  data_interp: [
    {"q": "A bar chart shows 40 apples, 30 oranges, 20 bananas. What % are oranges?", "options": ["A. 30%", "B. 33%", "C. 27%", "D. 25%"], "answer": 0, "hint": "30/100 × 100", "explanation": "**30%** of 100 total"},
    {"q": "Line graph: value goes 10→15→12→18. What was the % increase from first to last?", "options": ["A. 60%", "B. 70%", "C. 80%", "D. 90%"], "answer": 2, "hint": "(18-10)/10 × 100", "explanation": "8/10 = **80%**"},
    {"q": "Table shows x: 1,2,3 and y: 4,8,12. Relationship?", "options": ["A. y=x+3", "B. y=4x", "C. y=x²+3", "D. y=2x+2"], "answer": 1, "hint": "Check each pair", "explanation": "y = **4x** for all pairs"},
    {"q": "Scatterplot shows positive correlation. As x increases, y?", "options": ["A. Decreases", "B. Stays same", "C. Increases", "D. Varies"], "answer": 2, "hint": "Positive correlation definition", "explanation": "y **increases**"},
    {"q": "Pie chart: 40% red, 35% blue, rest green. Green?", "options": ["A. 20%", "B. 25%", "C. 30%", "D. 15%"], "answer": 1, "hint": "100 - 40 - 35", "explanation": "**25%**"},
    {"q": "Chart shows sales of $200K, $250K, $300K over 3 years. Avg yearly growth?", "options": ["A. $40K", "B. $45K", "C. $50K", "D. $55K"], "answer": 2, "hint": "(300-200)/2", "explanation": "$100K over 2 years = **$50K/year**"},
    {"q": "Data: 10 students scored 80%, 5 scored 90%. Weighted average?", "options": ["A. 82%", "B. 83%", "C. 84%", "D. 85%"], "answer": 1, "hint": "(10×80 + 5×90)/15", "explanation": "(800+450)/15 = **83.3%**"},
    {"q": "Two-way table: 30 boys (20 like math, 10 don't). % boys who like math?", "options": ["A. 60%", "B. 65%", "C. 67%", "D. 70%"], "answer": 2, "hint": "20/30 × 100", "explanation": "**66.7% ≈ 67%**"},
    {"q": "Histogram shows most data in 70-80 range. This suggests?", "options": ["A. Right skew", "B. Left skew", "C. Symmetric", "D. Bimodal"], "answer": 0, "hint": "Most data on left side of range", "explanation": "**Right skew** — tail extends right"},
    {"q": "Linear regression line: y=2x+5. Predicted y when x=10?", "options": ["A. 20", "B. 22", "C. 25", "D. 30"], "answer": 2, "hint": "Substitute x=10", "explanation": "2(10)+5 = **25**"},
  ],
  probability: [
    {"q": "P(rolling a 4 on a fair die)?", "options": ["A. 1/4", "B. 1/5", "C. 1/6", "D. 1/3"], "answer": 2, "hint": "Favorable outcomes / total", "explanation": "**1/6**"},
    {"q": "P(flipping heads twice in a row)?", "options": ["A. 1/2", "B. 1/3", "C. 1/4", "D. 1/8"], "answer": 2, "hint": "1/2 × 1/2", "explanation": "**1/4**"},
    {"q": "A bag has 3 red and 2 blue balls. P(red)?", "options": ["A. 3/5", "B. 2/5", "C. 3/2", "D. 2/3"], "answer": 0, "hint": "3 red out of 5 total", "explanation": "**3/5**"},
    {"q": "P(A) = 0.3, P(B) = 0.5, independent. P(A and B)?", "options": ["A. 0.8", "B. 0.15", "C. 0.2", "D. 0.35"], "answer": 1, "hint": "Multiply independent probabilities", "explanation": "0.3 × 0.5 = **0.15**"},
    {"q": "Standard deck: P(king or ace)?", "options": ["A. 2/13", "B. 8/52", "C. 4/52", "D. 1/13"], "answer": 1, "hint": "4 kings + 4 aces = 8", "explanation": "8/52 = **2/13**"},
    {"q": "P(not rolling a 6)?", "options": ["A. 1/6", "B. 2/6", "C. 5/6", "D. 4/6"], "answer": 2, "hint": "1 - P(rolling 6)", "explanation": "1 - 1/6 = **5/6**"},
    {"q": "Cards 1-10: P(even)?", "options": ["A. 2/5", "B. 1/2", "C. 3/5", "D. 1/5"], "answer": 1, "hint": "Even: 2,4,6,8,10", "explanation": "5/10 = **1/2**"},
    {"q": "At least one head in two flips?", "options": ["A. 1/4", "B. 1/2", "C. 3/4", "D. 2/3"], "answer": 2, "hint": "1 - P(no heads)", "explanation": "1 - 1/4 = **3/4**"},
    {"q": "P(rolling >4 on die)?", "options": ["A. 1/3", "B. 1/2", "C. 2/3", "D. 1/6"], "answer": 0, "hint": "Values >4: just 5 and 6", "explanation": "2/6 = **1/3**"},
    {"q": "Two dice: P(sum=7)?", "options": ["A. 5/36", "B. 6/36", "C. 7/36", "D. 4/36"], "answer": 1, "hint": "Count pairs: (1,6),(2,5),(3,4),(4,3),(5,2),(6,1)", "explanation": "**6/36 = 1/6**"},
  ],
  unit_conv: [
    {"q": "60 miles/hour in feet/second?", "options": ["A. 66 ft/s", "B. 88 ft/s", "C. 99 ft/s", "D. 110 ft/s"], "answer": 1, "hint": "× 5280/3600", "explanation": "60 × 5280/3600 = **88 ft/s**"},
    {"q": "3 kilometers in meters?", "options": ["A. 300", "B. 3000", "C. 30000", "D. 0.3"], "answer": 1, "hint": "1 km = 1000 m", "explanation": "3 × 1000 = **3000 m**"},
    {"q": "$12/hour rate. Earn in 40-hr week?", "options": ["A. $440", "B. $460", "C. $480", "D. $500"], "answer": 2, "hint": "12 × 40", "explanation": "**$480**"},
    {"q": "2.5 pounds to ounces (16 oz/lb)?", "options": ["A. 30", "B. 35", "C. 40", "D. 45"], "answer": 2, "hint": "2.5 × 16", "explanation": "**40 oz**"},
    {"q": "5 gallons to quarts (4 qt/gal)?", "options": ["A. 16", "B. 18", "C. 20", "D. 22"], "answer": 2, "hint": "5 × 4", "explanation": "**20 quarts**"},
    {"q": "Car gets 30 mpg. 12 gallons. Miles?", "options": ["A. 300", "B. 320", "C. 340", "D. 360"], "answer": 3, "hint": "30 × 12", "explanation": "**360 miles**"},
    {"q": "250 cm to meters?", "options": ["A. 2.5", "B. 25", "C. 0.25", "D. 2500"], "answer": 0, "hint": "100 cm = 1 m", "explanation": "**2.5 m**"},
    {"q": "45 minutes to hours?", "options": ["A. 0.45", "B. 0.5", "C. 0.75", "D. 0.8"], "answer": 2, "hint": "45/60", "explanation": "**0.75 hours**"},
    {"q": "Rate: 90 words/min. In 5 min?", "options": ["A. 400", "B. 430", "C. 450", "D. 480"], "answer": 2, "hint": "90 × 5", "explanation": "**450 words**"},
    {"q": "12 inches/foot, 3 feet/yard. Yards in 108 inches?", "options": ["A. 2", "B. 3", "C. 4", "D. 5"], "answer": 1, "hint": "108/12=9 ft, 9/3=3 yd", "explanation": "**3 yards**"},
  ],
  triangles: [
    {"q": "Right triangle legs 3, 4. Hypotenuse?", "options": ["A. 4", "B. 5", "C. 6", "D. 7"], "answer": 1, "hint": "a²+b²=c²", "explanation": "9+16=25, c=**5**"},
    {"q": "Triangle angles sum to?", "options": ["A. 90°", "B. 180°", "C. 270°", "D. 360°"], "answer": 1, "hint": "Basic triangle property", "explanation": "**180°**"},
    {"q": "Two angles 50° and 70°. Third?", "options": ["A. 50°", "B. 60°", "C. 70°", "D. 80°"], "answer": 1, "hint": "180 - 50 - 70", "explanation": "**60°**"},
    {"q": "Equilateral triangle: each angle?", "options": ["A. 30°", "B. 45°", "C. 60°", "D. 90°"], "answer": 2, "hint": "All equal, sum = 180", "explanation": "180/3 = **60°**"},
    {"q": "Similar triangles: sides 3,4,5 and 6,8,?", "options": ["A. 9", "B. 10", "C. 11", "D. 12"], "answer": 1, "hint": "Scale factor = 2", "explanation": "5 × 2 = **10**"},
    {"q": "Isosceles triangle: base angles 40° each. Vertex angle?", "options": ["A. 80°", "B. 90°", "C. 100°", "D. 110°"], "answer": 2, "hint": "180 - 40 - 40", "explanation": "**100°**"},
    {"q": "Area of triangle with base 8 and height 5?", "options": ["A. 15", "B. 18", "C. 20", "D. 40"], "answer": 2, "hint": "½ × base × height", "explanation": "½ × 8 × 5 = **20**"},
    {"q": "Right triangle hypotenuse 10, one leg 6. Other leg?", "options": ["A. 6", "B. 7", "C. 8", "D. 9"], "answer": 2, "hint": "a²+6²=10²", "explanation": "a² = 64, a = **8**"},
    {"q": "Triangle sides 5,12,13 — is it right?", "options": ["A. Yes", "B. No", "C. Need more info", "D. Isosceles only"], "answer": 0, "hint": "Check: 5²+12²=13²?", "explanation": "25+144=169=13² ✓ **Yes**"},
    {"q": "Angle of triangle: 2x, 3x, 4x. Find x.", "options": ["A. 15", "B. 18", "C. 20", "D. 25"], "answer": 2, "hint": "Sum = 180", "explanation": "9x=180, x=**20**"},
  ],
  circles: [
    {"q": "Area of circle with radius 5?", "options": ["A. 10π", "B. 25π", "C. 50π", "D. 5π"], "answer": 1, "hint": "A = πr²", "explanation": "π(5²) = **25π**"},
    {"q": "Circumference of circle with radius 7?", "options": ["A. 7π", "B. 14π", "C. 49π", "D. 21π"], "answer": 1, "hint": "C = 2πr", "explanation": "2π(7) = **14π**"},
    {"q": "Diameter is 20. Area?", "options": ["A. 20π", "B. 100π", "C. 200π", "D. 400π"], "answer": 1, "hint": "r = 10, A = πr²", "explanation": "π(10²) = **100π**"},
    {"q": "Arc length for 90° sector, radius 8?", "options": ["A. 2π", "B. 4π", "C. 6π", "D. 8π"], "answer": 1, "hint": "(90/360) × 2πr", "explanation": "¼ × 16π = **4π**"},
    {"q": "Central angle 120°. Fraction of circle?", "options": ["A. 1/3", "B. 1/4", "C. 1/2", "D. 2/5"], "answer": 0, "hint": "120/360", "explanation": "**1/3** of circle"},
    {"q": "Circle circumference 20π. Diameter?", "options": ["A. 10", "B. 20", "C. 40", "D. 5"], "answer": 1, "hint": "C = πd", "explanation": "d = **20**"},
    {"q": "Area of sector 90° in circle radius 6?", "options": ["A. 3π", "B. 6π", "C. 9π", "D. 12π"], "answer": 2, "hint": "(90/360) × π(6²)", "explanation": "¼ × 36π = **9π**"},
    {"q": "Tangent line to circle is __ to radius at point of tangency?", "options": ["A. Parallel", "B. Perpendicular", "C. Equal", "D. Diagonal"], "answer": 1, "hint": "Key geometry fact", "explanation": "**Perpendicular**"},
    {"q": "Two concentric circles: outer r=5, inner r=3. Area of ring?", "options": ["A. 2π", "B. 8π", "C. 16π", "D. 4π"], "answer": 2, "hint": "π(R²-r²)", "explanation": "π(25-9) = **16π**"},
    {"q": "Inscribed angle = half of?", "options": ["A. Arc length", "B. Central angle", "C. Radius", "D. Chord"], "answer": 1, "hint": "Key circle theorem", "explanation": "Half the **central angle**"},
  ],
  coord_geo: [
    {"q": "Distance from (0,0) to (3,4)?", "options": ["A. 4", "B. 5", "C. 6", "D. 7"], "answer": 1, "hint": "√(3²+4²)", "explanation": "√25 = **5**"},
    {"q": "Midpoint of (2,4) and (6,8)?", "options": ["A. (3,5)", "B. (4,6)", "C. (5,7)", "D. (4,5)"], "answer": 1, "hint": "Average x, average y", "explanation": "**((4,6))**"},
    {"q": "Distance from (1,2) to (4,6)?", "options": ["A. 4", "B. 5", "C. 6", "D. 7"], "answer": 1, "hint": "√((4-1)²+(6-2)²)", "explanation": "√(9+16) = **5**"},
    {"q": "Circle center (0,0) radius 5. On circle?", "options": ["A. (3,3)", "B. (3,4)", "C. (4,4)", "D. (2,4)"], "answer": 1, "hint": "Check x²+y²=25", "explanation": "3²+4²=25 ✓ **(3,4)**"},
    {"q": "Midpoint of (0,0) and (10,6)?", "options": ["A. (4,2)", "B. (5,3)", "C. (6,4)", "D. (3,5)"], "answer": 1, "hint": "(0+10)/2, (0+6)/2", "explanation": "**(5,3)**"},
    {"q": "Slope from origin to (4,8)?", "options": ["A. 1", "B. 2", "C. 3", "D. 4"], "answer": 1, "hint": "8/4", "explanation": "Slope = **2**"},
    {"q": "Which point is on line y=2x+1?", "options": ["A. (2,4)", "B. (3,7)", "C. (1,4)", "D. (2,5)"], "answer": 1, "hint": "Substitute each point", "explanation": "2(3)+1 = 7 ✓ **(3,7)**"},
    {"q": "Distance from (2,3) to (2,8)?", "options": ["A. 3", "B. 4", "C. 5", "D. 6"], "answer": 2, "hint": "Same x: just |y2-y1|", "explanation": "|8-3| = **5**"},
    {"q": "Center of circle (x-2)²+(y-3)²=16?", "options": ["A. (-2,-3)", "B. (2,3)", "C. (4,3)", "D. (2,-3)"], "answer": 1, "hint": "Center is (h,k)", "explanation": "Center = **(2,3)**"},
    {"q": "Equation of circle: center (0,0), radius 7?", "options": ["A. x+y=7", "B. x²+y²=7", "C. x²+y²=49", "D. x²+y²=14"], "answer": 2, "hint": "x²+y²=r²", "explanation": "x²+y²=**49**"},
  ],
  trig: [
    {"q": "sin(90°) = ?", "options": ["A. 0", "B. 1", "C. -1", "D. 0.5"], "answer": 1, "hint": "Unit circle value", "explanation": "sin(90°) = **1**"},
    {"q": "cos(0°) = ?", "options": ["A. 0", "B. -1", "C. 1", "D. undefined"], "answer": 2, "hint": "Unit circle value", "explanation": "cos(0°) = **1**"},
    {"q": "In right triangle, sin(A) = ?", "options": ["A. adj/hyp", "B. opp/hyp", "C. opp/adj", "D. hyp/opp"], "answer": 1, "hint": "SOH in SOHCAHTOA", "explanation": "**opposite/hypotenuse**"},
    {"q": "tan(45°) = ?", "options": ["A. 0", "B. 1", "C. √2", "D. √3"], "answer": 1, "hint": "sin(45°)/cos(45°)", "explanation": "tan(45°) = **1**"},
    {"q": "Right triangle: opp=3, hyp=5. sin?", "options": ["A. 3/4", "B. 4/5", "C. 3/5", "D. 5/3"], "answer": 2, "hint": "opp/hyp", "explanation": "**3/5**"},
    {"q": "cos(90°) = ?", "options": ["A. 1", "B. -1", "C. 0", "D. undefined"], "answer": 2, "hint": "Unit circle", "explanation": "cos(90°) = **0**"},
    {"q": "If sin(x)=0.6, cos(x)=0.8, tan(x)=?", "options": ["A. 0.48", "B. 0.75", "C. 1.33", "D. 0.5"], "answer": 1, "hint": "tan = sin/cos", "explanation": "0.6/0.8 = **0.75**"},
    {"q": "In 30-60-90 triangle, sides ratio?", "options": ["A. 1:1:√2", "B. 1:√3:2", "C. 1:2:3", "D. 1:√2:√3"], "answer": 1, "hint": "Short leg:long leg:hyp", "explanation": "**1:√3:2**"},
    {"q": "Area formula using trig: ½ab×sin(C). a=4, b=6, C=30°. Area?", "options": ["A. 6", "B. 12", "C. 18", "D. 24"], "answer": 0, "hint": "½×4×6×0.5", "explanation": "**6**"},
    {"q": "Complementary angles sum to?", "options": ["A. 90°", "B. 180°", "C. 270°", "D. 360°"], "answer": 0, "hint": "Complementary definition", "explanation": "**90°**"},
  ],
  other_geo: [
    {"q": "Volume of cube with side 4?", "options": ["A. 16", "B. 48", "C. 64", "D. 96"], "answer": 2, "hint": "V = s³", "explanation": "4³ = **64**"},
    {"q": "Surface area of cube side 3?", "options": ["A. 27", "B. 36", "C. 54", "D. 72"], "answer": 2, "hint": "6 faces × s²", "explanation": "6 × 9 = **54**"},
    {"q": "Volume of cylinder, r=3, h=5?", "options": ["A. 15π", "B. 30π", "C. 45π", "D. 60π"], "answer": 2, "hint": "V = πr²h", "explanation": "π(9)(5) = **45π**"},
    {"q": "Area of trapezoid, bases 6 and 10, height 4?", "options": ["A. 28", "B. 32", "C. 36", "D. 40"], "answer": 1, "hint": "½(b1+b2)×h", "explanation": "½(16)(4) = **32**"},
    {"q": "Exterior angle of regular hexagon?", "options": ["A. 45°", "B. 60°", "C. 72°", "D. 90°"], "answer": 1, "hint": "360/n sides", "explanation": "360/6 = **60°**"},
    {"q": "Sum of interior angles of pentagon?", "options": ["A. 360°", "B. 450°", "C. 540°", "D. 720°"], "answer": 2, "hint": "(n-2) × 180", "explanation": "(5-2)×180 = **540°**"},
    {"q": "Two parallel lines cut by transversal: alternate interior angles are?", "options": ["A. Supplementary", "B. Equal", "C. Complementary", "D. Right"], "answer": 1, "hint": "Parallel line property", "explanation": "**Equal**"},
    {"q": "Rectangle: length 8, width 5. Diagonal?", "options": ["A. √89", "B. √81", "C. √64", "D. √100"], "answer": 0, "hint": "Pythagorean theorem", "explanation": "√(64+25) = **√89**"},
    {"q": "Volume of cone, r=3, h=4?", "options": ["A. 12π", "B. 18π", "C. 24π", "D. 36π"], "answer": 0, "hint": "V = ⅓πr²h", "explanation": "⅓π(9)(4) = **12π**"},
    {"q": "Area of parallelogram, base=10, height=6?", "options": ["A. 30", "B. 60", "C. 90", "D. 120"], "answer": 1, "hint": "A = base × height", "explanation": "10 × 6 = **60**"},
  ],
  central_idea: [
    {"q": "A passage states: 'Rising temperatures threaten coral reefs by bleaching corals.' The central idea is?", "options": ["A. Ocean pollution causes extinction", "B. Climate change harms coral reefs", "C. Bleaching makes coral beautiful", "D. Reefs exist only in warm water"], "answer": 1, "hint": "Find the main point, not a detail", "explanation": "The **central idea** is the broader claim: climate change harms coral reefs"},
    {"q": "'Bees pollinate 80% of flowering plants. Without bees, most agriculture would collapse.' Main idea?", "options": ["A. Bees make honey", "B. Flowers need bees", "C. Bees are essential to food supply", "D. Agriculture uses flowers"], "answer": 2, "hint": "Which choice is broadest and supported?", "explanation": "**Bees are essential to food supply** — broadest true claim"},
    {"q": "Author lists 5 benefits of walking daily. Central idea?", "options": ["A. Walking burns calories", "B. Doctors recommend walking", "C. Walking is beneficial for health", "D. Walking takes 30 minutes"], "answer": 2, "hint": "Details support the central claim", "explanation": "**Walking is beneficial** — the organizing claim"},
    {"q": "Passage: scientists discover ancient shipwreck off Greek coast; details its cargo and age. Purpose?", "options": ["A. Praise Greek navy", "B. Report an archaeological discovery", "C. Explain why ships sink", "D. Compare ancient and modern ships"], "answer": 1, "hint": "What is the passage doing overall?", "explanation": "**Report an archaeological discovery**"},
    {"q": "A text argues solar panels should be required on new homes. Central claim?", "options": ["A. Solar panels are expensive", "B. New homes waste electricity", "C. Solar panels should be mandated", "D. Electricity prices are rising"], "answer": 2, "hint": "The author's main argument", "explanation": "**Solar panels should be mandated**"},
    {"q": "Paragraph: 'While critics argue social media harms teens, research shows mixed results.' Author's stance?", "options": ["A. Social media is harmful", "B. Social media is safe", "C. Evidence is inconclusive", "D. Teens should avoid media"], "answer": 2, "hint": "What is the author's actual position?", "explanation": "**Evidence is inconclusive** — the author concedes both sides"},
    {"q": "Which title best fits a passage about how forests absorb carbon dioxide?", "options": ["A. Trees: Tall and Beautiful", "B. Forests as Climate Regulators", "C. The History of Forestry", "D. Why Loggers Exist"], "answer": 1, "hint": "Match title to central idea", "explanation": "**Forests as Climate Regulators** matches the central topic"},
    {"q": "Passage describes Edison's failures before inventing the lightbulb. Main idea?", "options": ["A. Lightbulbs are important", "B. Edison was a poor engineer", "C. Persistence leads to invention", "D. Electricity is difficult"], "answer": 2, "hint": "What lesson does the passage teach?", "explanation": "**Persistence leads to invention**"},
    {"q": "A summary should include?", "options": ["A. Only opinions", "B. Every detail", "C. Main idea and key support", "D. Just the conclusion"], "answer": 2, "hint": "Summary = key points only", "explanation": "**Main idea and key support**"},
    {"q": "'The Amazon produces 20% of Earth's oxygen and supports millions of species.' The author implies?", "options": ["A. The Amazon should be farmed", "B. The Amazon is ecologically vital", "C. Oxygen comes only from trees", "D. Species count is unimportant"], "answer": 1, "hint": "What broader point does the evidence support?", "explanation": "**The Amazon is ecologically vital**"},
  ],
  inference: [
    {"q": "'She arrived at 8:58 for a 9:00 meeting.' What can be inferred?", "options": ["A. She was late", "B. She was just on time", "C. She was early", "D. She missed it"], "answer": 1, "hint": "8:58 is before 9:00", "explanation": "**Just on time** — 2 minutes early"},
    {"q": "Character refuses to eat at restaurants and cooks every meal. Inferred trait?", "options": ["A. Wealthy", "B. Health-conscious or frugal", "C. Lazy", "D. Generous"], "answer": 1, "hint": "What behavior suggests about character", "explanation": "**Health-conscious or frugal**"},
    {"q": "Passage: scientist works past midnight every day for 10 years. This implies?", "options": ["A. She has no friends", "B. She is deeply dedicated", "C. The lab is only open at night", "D. She dislikes daytime"], "answer": 1, "hint": "What does the behavior suggest?", "explanation": "**Deep dedication** to her work"},
    {"q": "'The store was empty, carts abandoned mid-aisle.' Inferred?", "options": ["A. It was a holiday", "B. Something unexpected happened", "C. The store was closed", "D. People disliked the store"], "answer": 1, "hint": "Abandoned carts suggest sudden departure", "explanation": "**Something unexpected occurred**"},
    {"q": "Author praises a book's 'fresh perspective' and 'vivid prose.' Review is likely?", "options": ["A. Negative", "B. Neutral", "C. Positive", "D. Sarcastic"], "answer": 2, "hint": "Tone of the word choices", "explanation": "**Positive** — both phrases are compliments"},
    {"q": "Scientists debate a finding for 20 years without consensus. This implies?", "options": ["A. Scientists are incompetent", "B. The question is complex", "C. Data doesn't matter", "D. Only one view is right"], "answer": 1, "hint": "Disagreement often reflects complexity", "explanation": "**The question is complex**"},
    {"q": "'After the storm, silence fell over the town.' What is implied?", "options": ["A. The town was empty", "B. People were sleeping", "C. Damage was severe", "D. The storm was quiet"], "answer": 2, "hint": "Sudden silence after storm", "explanation": "**Damage was severe** — shock or aftermath"},
    {"q": "A character gives away her last dollar to a stranger. This suggests?", "options": ["A. She is irresponsible", "B. She is extremely generous", "C. She hates money", "D. She is wealthy"], "answer": 1, "hint": "Action reveals character", "explanation": "**Extreme generosity**"},
    {"q": "Text notes a CEO donates 90% of salary. Inference about CEO?", "options": ["A. Poor financial skills", "B. Values causes over personal wealth", "C. Company is failing", "D. Tax avoidance strategy"], "answer": 1, "hint": "What does donating almost everything suggest?", "explanation": "**Values causes over wealth**"},
    {"q": "Passage ends: 'No one ever saw him again.' This creates a feeling of?", "options": ["A. Relief", "B. Mystery", "C. Boredom", "D. Joy"], "answer": 1, "hint": "Sudden disappearance ending", "explanation": "**Mystery** — leaves unanswered questions"},
  ],
  word_meaning: [
    {"q": "'The professor's tone was pedantic.' Pedantic means?", "options": ["A. Enthusiastic", "B. Overly focused on minor details", "C. Friendly and warm", "D. Clearly organized"], "answer": 1, "hint": "Think: lecture-y, dry", "explanation": "**Overly detail-focused** — dry and lecture-like"},
    {"q": "'The politician gave an ambiguous answer.' Ambiguous means?", "options": ["A. Dishonest", "B. Unclear or having multiple meanings", "C. Very long", "D. Confident"], "answer": 1, "hint": "Ambi = both ways", "explanation": "**Unclear, open to interpretation**"},
    {"q": "'She was pragmatic about the decision.' Pragmatic means?", "options": ["A. Emotional", "B. Practical and realistic", "C. Stubborn", "D. Idealistic"], "answer": 1, "hint": "pragma = deed, action", "explanation": "**Practical and results-focused**"},
    {"q": "'The findings corroborated the theory.' Corroborated means?", "options": ["A. Disproved", "B. Extended", "C. Supported", "D. Questioned"], "answer": 2, "hint": "Co + robust = strengthen together", "explanation": "**Supported or confirmed**"},
    {"q": "'An ephemeral trend.' Ephemeral means?", "options": ["A. Widespread", "B. Short-lived", "C. Expensive", "D. Dangerous"], "answer": 1, "hint": "Ephemera = short-lived things", "explanation": "**Short-lived**"},
    {"q": "'Her critique was incisive.' Incisive means?", "options": ["A. Gentle", "B. Wrong", "C. Sharply accurate", "D. Long"], "answer": 2, "hint": "Incise = cut precisely", "explanation": "**Sharply accurate and perceptive**"},
    {"q": "'The debate was contentious.' Contentious means?", "options": ["A. Boring", "B. Productive", "C. Controversial and heated", "D. Short"], "answer": 2, "hint": "Content- = to contend, argue", "explanation": "**Controversial and causing disagreement**"},
    {"q": "'A benevolent ruler.' Benevolent means?", "options": ["A. Strict", "B. Kind and generous", "C. Powerful", "D. Wise"], "answer": 1, "hint": "Bene = good, volent = wish", "explanation": "**Kind and generous**"},
    {"q": "'Scientists were skeptical of the claim.' Skeptical means?", "options": ["A. Excited", "B. Dismissive", "C. Doubtful and questioning", "D. Certain"], "answer": 2, "hint": "Skeptic = doubter", "explanation": "**Doubtful, requiring evidence**"},
    {"q": "'The author uses a didactic tone.' Didactic means?", "options": ["A. Angry", "B. Intended to teach or instruct", "C. Poetic", "D. Conversational"], "answer": 1, "hint": "Didact- = teaching", "explanation": "**Instructive, meant to teach**"},
  ],
  evidence: [
    {"q": "Which quotation best supports the claim that 'exercise improves mental health'?", "options": ["A. 'People enjoy exercising outdoors.'", "B. 'Studies show 30 min exercise reduces depression symptoms by 40%.'", "C. 'Gyms are popular in urban areas.'", "D. 'Running shoes are popular.'"], "answer": 1, "hint": "Which choice provides measurable evidence?", "explanation": "**Studies showing 40% reduction** — concrete data"},
    {"q": "An author argues texting while driving is dangerous. Best evidence?", "options": ["A. 'Phones are distracting.'", "B. 'Texting drivers are 23× more likely to crash.'", "C. 'Many people own phones.'", "D. 'Laws vary by state.'"], "answer": 1, "hint": "Specific statistics beat general claims", "explanation": "**23× more likely to crash** — specific, relevant stat"},
    {"q": "To support 'renewable energy creates jobs,' author should cite?", "options": ["A. Solar power cost trends", "B. Employment data in renewable sectors", "C. Carbon emission levels", "D. Oil company profits"], "answer": 1, "hint": "Match evidence to the specific claim", "explanation": "**Employment data** directly supports the jobs claim"},
    {"q": "Which strengthens 'cities with bike lanes have less congestion'?", "options": ["A. Bikes are environmentally friendly", "B. Comparative traffic data before and after lane installation", "C. The history of bicycles", "D. Cyclists prefer good weather"], "answer": 1, "hint": "Need before-and-after comparison", "explanation": "**Before/after traffic data** directly supports the claim"},
    {"q": "Which WEAKENS the claim 'students who sleep 8 hours perform better'?", "options": ["A. Sleep affects memory", "B. A study showing no grade difference with sleep duration", "C. Doctors recommend 8 hours", "D. Students sleep less than adults"], "answer": 1, "hint": "Which contradicts the claim?", "explanation": "**No grade difference** contradicts the claim"},
    {"q": "To prove a new drug is effective, you need?", "options": ["A. The drug's history", "B. Patient testimonials", "C. Clinical trial data with control group", "D. Cost comparison"], "answer": 2, "hint": "Scientific standard of evidence", "explanation": "**Clinical trial with control group**"},
    {"q": "Author says urban gardens reduce food insecurity. Relevant evidence?", "options": ["A. Gardens improve city aesthetics", "B. % of residents who gained food access through garden programs", "C. Types of vegetables grown", "D. Cost of starting a garden"], "answer": 1, "hint": "Match to the specific claim", "explanation": "**% gaining food access** — directly supports the claim"},
    {"q": "Which shows correlation, not causation?", "options": ["A. Experiment with two controlled groups", "B. Ice cream sales and drowning rates both rise in summer", "C. Drug reduces symptoms in trial", "D. Exercise increases metabolism"], "answer": 1, "hint": "Third variable explanation", "explanation": "**Ice cream/drowning** — both caused by summer heat, not each other"},
    {"q": "Anecdotal evidence is weak because?", "options": ["A. It's too detailed", "B. It comes from experts", "C. One person's experience may not generalize", "D. It's always false"], "answer": 2, "hint": "Anecdote = one story", "explanation": "**Single experiences don't generalize** to everyone"},
    {"q": "Best support for 'forests prevent floods'?", "options": ["A. Trees are tall", "B. Flood data comparing forested vs. deforested areas", "C. People enjoy forests", "D. Wood is a building material"], "answer": 1, "hint": "Direct comparison supports direct claim", "explanation": "**Comparing forested vs deforested flood data**"},
  ],
  analyze_text: [
    {"q": "Author uses the phrase 'wolves in sheep's clothing' to describe politicians. This is a?", "options": ["A. Simile", "B. Metaphor", "C. Alliteration", "D. Hyperbole"], "answer": 1, "hint": "Direct comparison without like/as", "explanation": "**Metaphor** — direct comparison"},
    {"q": "'The thunder roared like an angry giant.' This is a?", "options": ["A. Metaphor", "B. Personification", "C. Simile", "D. Irony"], "answer": 2, "hint": "Uses 'like'", "explanation": "**Simile** — comparison using 'like'"},
    {"q": "Author writes sarcastically: 'Oh great, another meeting.' The tone is?", "options": ["A. Enthusiastic", "B. Neutral", "C. Ironic", "D. Formal"], "answer": 2, "hint": "Says opposite of what she means", "explanation": "**Ironic** — opposite of literal meaning"},
    {"q": "'The walls whispered secrets.' This is?", "options": ["A. Hyperbole", "B. Simile", "C. Alliteration", "D. Personification"], "answer": 3, "hint": "Non-human thing does human action", "explanation": "**Personification** — walls can't whisper"},
    {"q": "Author shifts from data to emotional story mid-paragraph. Effect?", "options": ["A. Confuses the reader", "B. Makes the argument more relatable", "C. Weakens the evidence", "D. Changes the topic"], "answer": 1, "hint": "Emotional stories engage readers", "explanation": "**Increases relatability and engagement**"},
    {"q": "A paragraph begins with a counterargument, then refutes it. This structure?", "options": ["A. Weakens the author's case", "B. Shows the author is uncertain", "C. Strengthens by addressing opposition", "D. Confuses the reader"], "answer": 2, "hint": "Acknowledging and refuting opposition strengthens arguments", "explanation": "**Strengthens by addressing opposition**"},
    {"q": "'The economy crashed, unemployment soared, and families suffered.' Rhetorical device?", "options": ["A. Simile", "B. Tricolon", "C. Alliteration", "D. Metaphor"], "answer": 1, "hint": "Three parallel items", "explanation": "**Tricolon** — three parallel clauses"},
    {"q": "What does allusion to 'a David vs. Goliath struggle' convey?", "options": ["A. Biblical setting", "B. Unfair power imbalance", "C. Physical combat", "D. Historical conflict"], "answer": 1, "hint": "What does the biblical story symbolize?", "explanation": "**Unfair power imbalance** — small vs. powerful"},
    {"q": "An author uses short, choppy sentences to describe a chase scene. Effect?", "options": ["A. Slows pacing", "B. Creates tension", "C. Confuses the reader", "D. Shows the character is smart"], "answer": 1, "hint": "Sentence length = pace", "explanation": "**Creates tension** through fast pacing"},
    {"q": "Footnote contains a citation. Purpose?", "options": ["A. Summarize the paragraph", "B. Provide source for claim", "C. Disagree with the author", "D. Define a term"], "answer": 1, "hint": "Citations document sources", "explanation": "**Provide the source** for a claim"},
  ],
  transitions: [
    {"q": "'The project was expensive. ___, it was worth it.' Best transition?", "options": ["A. Therefore", "B. Furthermore", "C. Nevertheless", "D. In addition"], "answer": 2, "hint": "Contrast: expensive but worth it", "explanation": "**Nevertheless** — shows contrast"},
    {"q": "'She studied hard. ___, she passed.' Best transition?", "options": ["A. However", "B. Therefore", "C. Although", "D. In contrast"], "answer": 1, "hint": "Cause and effect", "explanation": "**Therefore** — result of studying"},
    {"q": "Adding more evidence: best transition?", "options": ["A. However", "B. In contrast", "C. Furthermore", "D. Therefore"], "answer": 2, "hint": "Adding, not contrasting", "explanation": "**Furthermore** — adds more information"},
    {"q": "'Some argue for X. ___, others prefer Y.' Best transition?", "options": ["A. Moreover", "B. In contrast", "C. Therefore", "D. Meanwhile"], "answer": 1, "hint": "Two opposing views", "explanation": "**In contrast** — opposing perspectives"},
    {"q": "Which signals a conclusion?", "options": ["A. Moreover", "B. Meanwhile", "C. In summary", "D. However"], "answer": 2, "hint": "Wrapping up ideas", "explanation": "**In summary** — signals conclusion"},
    {"q": "'It rained. ___, the game was cancelled.' Best transition?", "options": ["A. Furthermore", "B. Consequently", "C. In contrast", "D. Although"], "answer": 1, "hint": "Rain caused cancellation", "explanation": "**Consequently** — shows cause/effect"},
    {"q": "'First, heat oil. ___, add onions.' Best transition?", "options": ["A. Nevertheless", "B. However", "C. Next", "D. Therefore"], "answer": 2, "hint": "Sequential steps", "explanation": "**Next** — sequential order"},
    {"q": "'The data supports the theory. ___, more research is needed.' Best transition?", "options": ["A. Furthermore", "B. Therefore", "C. Nevertheless", "D. Subsequently"], "answer": 2, "hint": "Concession — even though X is true...", "explanation": "**Nevertheless** — contrasting need"},
    {"q": "Which transition introduces an example?", "options": ["A. However", "B. For instance", "C. Therefore", "D. Meanwhile"], "answer": 1, "hint": "Examples follow this word", "explanation": "**For instance** — introduces an example"},
    {"q": "'He was tired. ___, he finished the race.' Best transition?", "options": ["A. Therefore", "B. Additionally", "C. Regardless", "D. Similarly"], "answer": 2, "hint": "Despite being tired...", "explanation": "**Regardless** — despite the obstacle"},
  ],
  grammar_usage: [
    {"q": "'Each of the students __ their homework.' Correct?", "options": ["A. turned in", "B. turn in", "C. turns in", "D. have turned in"], "answer": 0, "hint": "Each is singular — but 'their' is now accepted", "explanation": "'Each...turned in' is standard; **turned in** works with singular subject"},
    {"q": "'Neither the teachers nor the principal __ attending.' Correct verb?", "options": ["A. are", "B. is", "C. were", "D. have been"], "answer": 1, "hint": "Verb agrees with closer subject", "explanation": "Principal is closest → **is**"},
    {"q": "Correct use of semicolon?", "options": ["A. I like cats; and dogs.", "B. She ran; he walked.", "C. Although; she tried hard.", "D. Run; quickly!"], "answer": 1, "hint": "Semicolons join two independent clauses", "explanation": "**She ran; he walked** — two complete clauses"},
    {"q": "'The book, which I borrowed, is great' vs 'The book that I borrowed is great.' Difference?", "options": ["A. No difference", "B. First has nonessential clause", "C. Second is grammatically wrong", "D. First is a question"], "answer": 1, "hint": "Which = nonessential; that = essential", "explanation": "**Which** introduces a nonessential (parenthetical) clause"},
    {"q": "Correct apostrophe use?", "options": ["A. The dog's bone (possessive)", "B. The dogs' was here (verb)", "C. It's collar is red", "D. The cats is friendly"], "answer": 0, "hint": "Apostrophe + s = possessive", "explanation": "**The dog's bone** — correct possessive"},
    {"q": "'Its' vs 'it's': which is possessive?", "options": ["A. it's", "B. its", "C. Both", "D. Neither"], "answer": 1, "hint": "Its = no apostrophe = possessive", "explanation": "**Its** (no apostrophe) is possessive"},
    {"q": "'The data __ incomplete.' SAT formal usage?", "options": ["A. is", "B. are", "C. were", "D. be"], "answer": 1, "hint": "Data is plural in formal/academic writing", "explanation": "Data is plural: **are** (formal/SAT)"},
    {"q": "Which is a sentence fragment?", "options": ["A. She ran home.", "B. Running through the park.", "C. He stopped.", "D. They waited."], "answer": 1, "hint": "No subject or full verb", "explanation": "**Running through the park** — no subject"},
    {"q": "Correct comma use?", "options": ["A. She bought apples, and oranges.", "B. She bought apples, oranges, and bananas.", "C. She, bought apples.", "D. She bought, apples and oranges."], "answer": 1, "hint": "Oxford comma in a list", "explanation": "**Apples, oranges, and bananas** — list with Oxford comma"},
    {"q": "Passive voice: 'The ball was kicked by John.' Active version?", "options": ["A. John kicked the ball.", "B. The ball kicked John.", "C. John was kicking.", "D. Ball was by John kicked."], "answer": 0, "hint": "Subject performs the action", "explanation": "**John kicked the ball** — active voice"},
  ],
  sentence_structure: [
    {"q": "Which is a run-on sentence?", "options": ["A. She ran home.", "B. He was tired he went to bed.", "C. After the rain, she walked.", "D. Running is healthy."], "answer": 1, "hint": "Two sentences joined without punctuation", "explanation": "**He was tired he went to bed** — needs punctuation"},
    {"q": "Best way to combine: 'He studied. He passed.' into one sentence?", "options": ["A. He studied, and passed.", "B. Because he studied, he passed.", "C. He studied and passed.", "D. He studied, he passed."], "answer": 1, "hint": "Show cause and effect", "explanation": "**Because he studied, he passed** — clearest logical connection"},
    {"q": "Parallel structure error?", "options": ["A. She likes running, swimming, and biking.", "B. She likes to run, swim, and to bike.", "C. She likes running, swimming, and to bike.", "D. She runs, swims, and bikes."], "answer": 2, "hint": "All items must use same form", "explanation": "**Running, swimming, and to bike** — mixed forms"},
    {"q": "Which correctly uses a colon?", "options": ["A. I need: milk.", "B. I need three things: milk, eggs, and bread.", "C. I: need milk.", "D. I need milk: and eggs."], "answer": 1, "hint": "Colon introduces a list after complete clause", "explanation": "**Three things: milk, eggs, and bread** ✓"},
    {"q": "'Although she studied hard.' This is?", "options": ["A. Independent clause", "B. Dependent clause", "C. Complete sentence", "D. Run-on"], "answer": 1, "hint": "'Although' makes it dependent", "explanation": "**Dependent clause** — can't stand alone"},
    {"q": "Misplaced modifier: which is wrong?", "options": ["A. Running quickly, the dog chased the ball.", "B. Barking loudly, the dog chased the cat.", "C. Driving home, the sunset was beautiful.", "D. She smiled brightly."], "answer": 2, "hint": "Who was driving?", "explanation": "**Driving home, the sunset** — sunset wasn't driving"},
    {"q": "Which sentence is most concise?", "options": ["A. Due to the fact that it rained, we stayed home.", "B. Due to rain, we stayed home.", "C. We stayed home because of the rain falling.", "D. The rain caused us to remain at home."], "answer": 1, "hint": "Eliminate wordy phrases", "explanation": "**Due to rain, we stayed home** — shortest, clearest"},
    {"q": "Appositive phrase example?", "options": ["A. Running fast, he won.", "B. My teacher, Dr. Chen, is brilliant.", "C. She ran and jumped.", "D. He arrived late."], "answer": 1, "hint": "Noun phrase renaming another noun", "explanation": "**Dr. Chen** renames 'my teacher' — appositive"},
    {"q": "Which fixes: 'Being that it was cold, she wore a jacket.'", "options": ["A. Because it was cold, she wore a jacket.", "B. Being cold, a jacket was worn.", "C. It was cold, she wore a jacket.", "D. She wore a jacket, being cold."], "answer": 0, "hint": "'Being that' is informal/incorrect", "explanation": "**Because it was cold** — correct subordinating conjunction"},
    {"q": "'Despite being tired, she finished.' 'Despite' here is a?", "options": ["A. Conjunction", "B. Preposition", "C. Adverb", "D. Noun"], "answer": 1, "hint": "Introduces a phrase, not a clause", "explanation": "**Preposition** — 'despite' is a preposition here"},
  ],
  completion: [
    {"q": "Sentence: 'The study found benefits of exercise; ___, participants were advised to consult doctors.' Best completion?", "options": ["A. additionally", "B. however", "C. therefore", "D. meanwhile"], "answer": 1, "hint": "Despite benefits, still consult doctors — contrast", "explanation": "**However** — contrasts benefits with caution"},
    {"q": "'Unlike his predecessor, the new director was ___.' Context: predecessor was chaotic.", "options": ["A. disorganized", "B. methodical", "C. careless", "D. inexperienced"], "answer": 1, "hint": "Unlike = contrast", "explanation": "**Methodical** — opposite of chaotic"},
    {"q": "'The evidence was ___; no one could deny the conclusion.' Best word?", "options": ["A. ambiguous", "B. limited", "C. overwhelming", "D. theoretical"], "answer": 2, "hint": "Evidence that forces agreement", "explanation": "**Overwhelming** — too strong to deny"},
    {"q": "'Her writing was praised for its ___: every sentence said exactly what it meant.' Best word?", "options": ["A. ambiguity", "B. clarity", "C. length", "D. emotion"], "answer": 1, "hint": "Every sentence = exact meaning = ?", "explanation": "**Clarity** — precise, unambiguous writing"},
    {"q": "'Scientists remained ___ about the drug until Phase 3 trials completed.'", "options": ["A. certain", "B. enthusiastic", "C. cautious", "D. dismissive"], "answer": 2, "hint": "Waiting for more data = ?", "explanation": "**Cautious** — prudent before full data"},
    {"q": "'The policy, though well-intentioned, had ___ consequences.'", "options": ["A. beneficial", "B. unintended", "C. obvious", "D. historical"], "answer": 1, "hint": "Well-meaning but unexpected outcomes", "explanation": "**Unintended** — consequences not foreseen"},
    {"q": "'She was ___ in her defense of the proposal, refusing to yield even under pressure.'", "options": ["A. ambivalent", "B. indifferent", "C. steadfast", "D. inconsistent"], "answer": 2, "hint": "Refusing to yield = ?", "explanation": "**Steadfast** — firm and unwavering"},
    {"q": "'The researcher's findings ___ earlier studies, supporting the existing theory.'", "options": ["A. contradicted", "B. corroborated", "C. undermined", "D. ignored"], "answer": 1, "hint": "Supporting existing findings = ?", "explanation": "**Corroborated** — confirmed/supported"},
    {"q": "'The novel's ___ plot kept readers guessing until the final page.'", "options": ["A. predictable", "B. formulaic", "C. laborious", "D. intricate"], "answer": 3, "hint": "Kept readers guessing = complex", "explanation": "**Intricate** — complex, surprising"},
    {"q": "'He was known for his ___, often donating anonymously to local causes.'", "options": ["A. arrogance", "B. frugality", "C. philanthropy", "D. skepticism"], "answer": 2, "hint": "Donating to causes = ?", "explanation": "**Philanthropy** — charitable generosity"},
  ],
};


// Get offline question for a topic (uses OFFLINE_BANK if available, else ALL_FALLBACKS)
function getOfflineQuestion(topicId, usedIndices=[]) {
  const bank = OFFLINE_BANK[topicId] || ALL_FALLBACKS[topicId] || ALL_FALLBACKS["linear_eq"];
  const available = bank.filter((_,i) => !usedIndices.includes(i));
  const pool = available.length > 0 ? available : bank;
  return pool[Math.floor(Math.random() * pool.length)];
}


// ─── OFFLINE SPRINT HELPERS ───────────────────────────────────────────────────
function getOfflineSprint(count, section) {
  const topics = section==="math"
    ? MATH_COURSES.flatMap(c=>c.topics)
    : section==="rw"
    ? RW_COURSES.flatMap(c=>c.topics)
    : ALL_COURSES.flatMap(c=>c.topics);

  const questions = [];
  const usedTopics = {};
  let attempts = 0;
  while(questions.length<count && attempts<count*4) {
    attempts++;
    const topic = topics[Math.floor(Math.random()*topics.length)];
    const bank = OFFLINE_BANK[topic.id]||OFFLINE_BANK["linear_eq"]||[];
    if(!bank.length) continue;
    const usedIdx = usedTopics[topic.id]||[];
    const available = bank.map((_,i)=>i).filter(i=>!usedIdx.includes(i));
    if(!available.length) continue;
    const idx = available[Math.floor(Math.random()*available.length)];
    usedTopics[topic.id] = [...usedIdx, idx];
    const course = ALL_COURSES.find(c=>c.topics.some(t=>t.id===topic.id));
    questions.push({...bank[idx], topicId:topic.id, topicName:topic.name, courseId:course?.id, section:course?.section||"math"});
  }
  return questions;
}

// ─── DAILY QUOTA HELPERS ───────────────────────────────────────────────────────
function getDailyQuota(userData) {
  if(userData?.dailyGoalOverride) return parseInt(userData.dailyGoalOverride);
  const daysLeft = userData?.testDate
    ? Math.max(1, Math.ceil((new Date(userData.testDate) - new Date()) / 86400000))
    : 30;
  const target = parseInt(userData?.targetScore || "1400");
  const scores = getPredictedScore(userData?.skillProgress || {});
  const gap = Math.max(0, target - scores.total);
  const base = 15;
  const gapBonus = Math.min(15, Math.round(gap / 20));
  return Math.min(30, base + gapBonus);
}

function getTodayQCount(skillProgress) {
  // Count questions answered today across all topics
  // We track this via a simple date-keyed counter in userData
  return 0; // will be overridden by actual tracking below
}

function getScheduleStatus(doneToday, quota) {
  const pct = quota > 0 ? doneToday / quota : 0;
  if (pct >= 1)   return {label:"✅ On track",      color:T.green,  pct:1};
  if (pct >= 0.5) return {label:"⚡ Almost there",  color:T.gold,   pct};
  if (doneToday === 0) return {label:"Not started", color:T.textMuted, pct:0};
  return              {label:"⚠️ Behind today",    color:T.rum,    pct};
}

function getPriorityFocusTopic(userData, skillProgress, wrongAnswers) {
  // Find the single highest-impact topic to focus on
  const target = parseInt(userData?.targetScore || "1400");
  const scores = getPredictedScore(skillProgress);
  const mathGap = target/2 - scores.math;
  const rwGap = target/2 - scores.rw;
  const prioritySection = mathGap >= rwGap ? "math" : "rw";

  // Score each topic by urgency
  const scored = [];
  ALL_COURSES.forEach(c => {
    c.topics.forEach(t => {
      const sp = skillProgress?.[t.id];
      const mastery = getTopicMastery(sp);
      const wrongCount = wrongAnswers.filter(w => w.topicId === t.id).length;
      const sectionBoost = c.section === prioritySection ? 2 : 1;
      const weakTopicBoost = (userData?.weakTopics||[]).includes(t.id) ? 1.5 : 1;
      const masteryScore = mastery==="struggling"?5:mastery==="new"?4:mastery==="learning"?3:mastery==="proficient"?1:0;
      const urgency = masteryScore * sectionBoost * weakTopicBoost + wrongCount * 0.5;
      if(urgency > 0) scored.push({...t, courseId:c.id, courseName:c.name, courseColor:c.color, section:c.section, urgency, wrongCount, mastery, sectionGap: c.section===prioritySection?Math.round((c.section==="math"?mathGap:rwGap)):0});
    });
  });
  scored.sort((a,b) => b.urgency - a.urgency);
  return scored[0] || null;
}

// ─── STUDY PLAN GENERATOR ──────────────────────────────────────────────────────
async function generateStudyPlan(userData, skillProgress) {
  const daysLeft = userData?.testDate ? Math.ceil((new Date(userData.testDate) - new Date()) / 86400000) : 30;
  const target = userData?.targetScore || "1400";
  const scores = getPredictedScore(skillProgress);
  const gap = parseInt(target) - scores.total;

  // Find top 3 priority topics: struggling first, then new, weighted by section gaps
  const mathGap = parseInt(target)/2 - scores.math;
  const rwGap = parseInt(target)/2 - scores.rw;
  const prioritySection = mathGap >= rwGap ? "math" : "rw";

  const candidates = [];
  ALL_COURSES.forEach(c => {
    c.topics.forEach(t => {
      const mastery = getTopicMastery(skillProgress?.[t.id]);
      const sectionBoost = c.section === prioritySection ? 2 : 1;
      const masteryScore = mastery==="struggling"?5:mastery==="new"?4:mastery==="learning"?3:mastery==="proficient"?1:0;
      if(masteryScore > 0) candidates.push({...t, courseId:c.id, courseName:c.name, courseColor:c.color, section:c.section, score: masteryScore * sectionBoost});
    });
  });
  candidates.sort((a,b) => b.score - a.score);
  const top3 = candidates.slice(0, 3);

  const prompt = `You are an SAT tutor generating a personalized daily study focus.

Student: ${userData?.name || "Student"}
Days until SAT: ${daysLeft}
Target score: ${target}
Current predicted score: ${scores.total} (Math: ${scores.math}, Reading & Writing: ${scores.rw})
Score gap to close: ${gap > 0 ? gap + " points" : "On track!"}

Today's recommended focus topics: ${top3.map(t => t.name).join(", ")}

Write a short, motivating daily focus message (2 sentences max). Be specific to their situation — mention the score gap, days left, or which section needs more work. Sound like a supportive coach, not a robot.

Then return the 3 focus topics with a one-phrase reason each.

Respond ONLY with JSON:
{"message":"...","topics":[{"id":"${top3[0]?.id||"linear_eq"}","name":"${top3[0]?.name||"Linear Equations"}","reason":"...","courseId":"${top3[0]?.courseId||"algebra"}","section":"${top3[0]?.section||"math"}"},{"id":"${top3[1]?.id||"quadratics"}","name":"${top3[1]?.name||"Quadratics"}","reason":"...","courseId":"${top3[1]?.courseId||"advanced"}","section":"${top3[1]?.section||"math"}"},{"id":"${top3[2]?.id||"transitions"}","name":"${top3[2]?.name||"Transitions"}","reason":"...","courseId":"${top3[2]?.courseId||"expression"}","section":"${top3[2]?.section||"rw"}"}]}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({model:"claude-sonnet-4-20250514", max_tokens:600, messages:[{role:"user",content:prompt}]})
  });
  const data = await res.json();
  const plan = JSON.parse(data.content[0].text.replace(/```json|```/g,"").trim());
  return {...plan, topics: plan.topics.map((t,i) => ({...t, color: ALL_COURSES.find(c=>c.id===t.courseId)?.color || T.navy}))};
}

// ─── CONCEPT EXPLAINER ──────────────────────────────────────────────────────────
async function generateConcept(topic, courseId) {
  const course = ALL_COURSES.find(c=>c.id===courseId);
  const prompt = `You are an expert SAT tutor. Explain this SAT topic clearly and concisely for a student who is about to practice it.

Topic: ${topic.name}
Description: ${topic.desc}
Subject: ${course?.name}

Write a short concept explanation with exactly these 3 parts:
1. Core concept (2-3 sentences in plain English — no jargon)
2. Worked example (show one concrete example with step-by-step solution, 3-5 steps)
3. Common mistake (one sentence — the #1 error students make on this topic)

Respond ONLY with JSON:
{"concept":"...","example":{"problem":"...","steps":["step 1","step 2","step 3"]},"mistake":"..."}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({model:"claude-sonnet-4-20250514", max_tokens:700, messages:[{role:"user",content:prompt}]})
  });
  const data = await res.json();
  return JSON.parse(data.content[0].text.replace(/```json|```/g,"").trim());
}


// ─── OPENSAT INTEGRATION ───────────────────────────────────────────────────────
// Free open-source SAT question bank — used as primary source, AI as fallback
// API: https://pinesat.com/api/questions?section=ENGLISH&domain=...&limit=20

// Map our course/topic IDs to OpenSAT domain names
const OPENSAT_DOMAIN_MAP = {
  // RW courses → English section
  craft:      { section:"english", domain:"Craft and Structure" },
  info:       { section:"english", domain:"Information and Ideas" },
  english:    { section:"english", domain:"Standard English Conventions" },
  expression: { section:"english", domain:"Expression of Ideas" },
  // Math courses → Math section (OpenSAT uses section=math, domain optional)
  algebra:    { section:"math",    domain:"Algebra" },
  advanced:   { section:"math",    domain:"Advanced Math" },
  data:       { section:"math",    domain:"Problem Solving and Data Analysis" },
  geometry:   { section:"math",    domain:"Geometry and Trigonometry" },
};

// Session cache so we don't repeat questions within a session
const _openSatCache = {}; // domain -> [{...}, ...]
const _openSatUsed  = new Set(); // used question IDs

async function fetchOpenSatQuestions(courseId) {
  const mapping = OPENSAT_DOMAIN_MAP[courseId];
  if(!mapping) return [];
  const cacheKey = mapping.domain;
  if(_openSatCache[cacheKey]?.length > 0) return _openSatCache[cacheKey];

  try {
    const params = new URLSearchParams({
      section: mapping.section,
      domain:  mapping.domain,
      limit:   "40",
    });
    const res = await fetch(`https://pinesat.com/api/questions?${params}`);
    if(!res.ok) return [];
    const data = await res.json();
    if(!Array.isArray(data) || data.length === 0) return [];
    _openSatCache[cacheKey] = data;
    return data;
  } catch(e) {
    return [];
  }
}

function openSatToQuestion(raw) {
  // OpenSAT format → our internal format
  // { id, domain, question: { paragraph, question, choices:{A,B,C,D}, correct_answer, explanation }, difficulty }
  try {
    const q = raw.question;
    if(!q || !q.question || !q.choices || !q.correct_answer) return null;

    const optionKeys = ["A","B","C","D"];
    const options = optionKeys.map(k => q.choices[k]).filter(Boolean);
    if(options.length !== 4) return null;

    const answerIdx = optionKeys.indexOf(q.correct_answer);
    if(answerIdx === -1) return null;

    return {
      q:           q.question,
      options,
      answer:      answerIdx,
      explanation: q.explanation || "See the correct answer above.",
      hint:        null,
      passage:     (q.paragraph && q.paragraph !== "null") ? q.paragraph : null,
      source:      "opensat",
      id:          raw.id,
    };
  } catch(e) {
    return null;
  }
}

async function getOpenSatQuestion(courseId, sessionHistory) {
  const questions = await fetchOpenSatQuestions(courseId);
  if(!questions.length) return null;

  // Filter out already-used questions this session
  const usedTexts = new Set(sessionHistory.slice(-20).map(h => typeof h==="object" ? h.text : h));
  const available = questions.filter(q => {
    if(_openSatUsed.has(q.id)) return false;
    const converted = openSatToQuestion(q);
    if(!converted) return false;
    // Don't repeat questions with same first 40 chars
    return !usedTexts.has(converted.q?.substring(0,40));
  });

  if(!available.length) {
    // All used — reset and reuse
    questions.forEach(q => _openSatUsed.delete(q.id));
    return getOpenSatQuestion(courseId, []);
  }

  // Pick random from available
  const raw = available[Math.floor(Math.random() * available.length)];
  _openSatUsed.add(raw.id);
  return openSatToQuestion(raw);
}

// ─── QUESTION GENERATION ───────────────────────────────────────────────────────
// Fetch with timeout — falls back to offline faster on slow connections
async function fetchWithTimeout(promise, ms=4000) {
  let timer;
  const timeout = new Promise((_,reject) => { timer = setTimeout(()=>reject(new Error("timeout")), ms); });
  try { return await Promise.race([promise, timeout]); }
  finally { clearTimeout(timer); }
}

async function generateMathQuestion(courseId, topic, skillProgress, sessionHistory) {
  // Try OpenSAT first (free, real SAT questions)
  try {
    const osq = await fetchWithTimeout(getOpenSatQuestion(courseId, sessionHistory), 3500);
    if(osq) return {...osq, type:"opensat"};
  } catch(e) {}

  // Fallback: AI generation
  const course = MATH_COURSES.find(c=>c.id===courseId);
  const topicStats = skillProgress?.[topic.id];
  const mastery = getTopicMastery(topicStats);
  const difficultyHint = mastery==="struggling"?"slightly easier, foundational":mastery==="mastered"?"challenging, harder variant":"standard SAT difficulty";
  const usedQs = sessionHistory.slice(-8).map(h=>typeof h==="object"?h.text:h).join(" | ");
  const recentTypes = sessionHistory.slice(-3).map(h=>typeof h==="object"?h.type:"unknown");
  const lastType = recentTypes[recentTypes.length-1];
  const forceType = lastType==="word"?"algebraic":(Math.random()<0.65?"algebraic":"word");
  const typeInstruction = forceType==="algebraic"
    ? "FORMAT: Pure algebraic/procedural. Present math directly — equations, expressions, graphs. NO real-world story. Example: 'Solve for x: 3x+7=22'"
    : "FORMAT: Word problem. Embed math in a brief real-world context (1-2 sentences). Example: 'A car travels at 55 mph for t hours...'";

  const prompt = `Generate a unique SAT Math multiple-choice question about: "${topic.name}" (${topic.desc}) in ${course.name}.
Difficulty: ${difficultyHint}
Recently used (AVOID duplicating): ${usedQs||"none yet"}
${typeInstruction}
Rules: 4 answer choices, only one correct. Include a concise one-sentence hint and a brief explanation.
Respond ONLY with valid JSON, no markdown:
{"q":"...","options":["A","B","C","D"],"answer":2,"hint":"...","explanation":"..."}
In the explanation, wrap the most important conclusion or key number in **double asterisks** like **x=5** to highlight it.
CRITICAL: Randomize which index (0,1,2,3) is correct.`;

  const res = await fetchWithTimeout(fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,messages:[{role:"user",content:prompt}]})}), 7000);
  const data = await res.json();
  const q = JSON.parse(data.content[0].text.replace(/```json|```/g,"").trim());
  if(!q.q||!Array.isArray(q.options)||q.options.length!==4||typeof q.answer!=="number") throw new Error("bad format");
  return {...q, type: forceType};
}

async function generateRWQuestion(courseId, topic, skillProgress, sessionHistory) {
  // Try OpenSAT first (free, real SAT questions)
  try {
    const osq = await fetchWithTimeout(getOpenSatQuestion(courseId, sessionHistory), 3500);
    if(osq) return osq;
  } catch(e) {}

  // Fallback: AI generation
  const course = RW_COURSES.find(c=>c.id===courseId);
  const topicStats = skillProgress?.[topic.id];
  const mastery = getTopicMastery(topicStats);
  const difficultyHint = mastery==="struggling"?"simpler, more straightforward":mastery==="mastered"?"nuanced and challenging":"standard SAT difficulty";
  const usedQs = sessionHistory.slice(-6).map(h=>typeof h==="object"?h.text:h).join(" | ");
  const needsPassage = ["words_context","text_structure","cross_text","author_purpose","text_function","central_idea","command_evid","inferences","data_tables","relationships","perspectives"].includes(topic.id);

  const prompt = needsPassage
    ? `Generate a SAT Reading & Writing question about "${topic.name}" (${topic.desc}) in ${course.name}.
Difficulty: ${difficultyHint}
Recently used (AVOID duplicating): ${usedQs||"none yet"}
FORMAT: Write a short passage (2-4 sentences), then a question about it.
Rules: 4 answer choices, only one correct. Include a one-sentence hint and a brief explanation.
Respond ONLY with valid JSON:
{"passage":"...","q":"...","options":["A","B","C","D"],"answer":1,"hint":"...","explanation":"..."}
CRITICAL: Randomize which index (0,1,2,3) is correct.`
    : `Generate a SAT Reading & Writing question about "${topic.name}" (${topic.desc}) in ${course.name}.
Difficulty: ${difficultyHint}
Recently used (AVOID duplicating): ${usedQs||"none yet"}
FORMAT: A direct grammar/style/convention question (no passage needed). Example: "Which sentence is correctly punctuated?" or "Which transition best connects these ideas?"
Rules: 4 answer choices, only one correct. Include a one-sentence hint and a brief explanation.
Respond ONLY with valid JSON:
{"q":"...","options":["A","B","C","D"],"answer":1,"hint":"...","explanation":"..."}
CRITICAL: Randomize which index (0,1,2,3) is correct.`;

  const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,messages:[{role:"user",content:prompt}]})});
  const data = await res.json();
  const q = JSON.parse(data.content[0].text.replace(/```json|```/g,"").trim());
  if(!q.q||!Array.isArray(q.options)||q.options.length!==4||typeof q.answer!=="number") throw new Error("bad format");
  return q;
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [userData, setUserData] = useState(null);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [screen, setScreen] = useState("onboarding");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);

  // Onboarding
  const [name, setName] = useState("");
  const [testDate, setTestDate] = useState("");
  const [targetScore, setTargetScore] = useState("1400");
  const [weakTopics, setWeakTopics] = useState([]);

  // Study plan
  const [studyPlan, setStudyPlan] = useState(null);
  const [studyPlanLoading, setStudyPlanLoading] = useState(false);
  const [studyPlanDate, setStudyPlanDate] = useState(null);

  // Inline tip
  const [inlineTip, setInlineTip] = useState(null); // {topicId, tip, dismissed}
  const [tipLoading, setTipLoading] = useState(false);
  const [xpBurst, setXpBurst] = useState(null); // {amount, key}

  // Concept explanation (kept for lesson mode deep dive)
  const [conceptData, setConceptData] = useState(null);
  const [conceptLoading, setConceptLoading] = useState(false);
  const [pendingCourseId, setPendingCourseId] = useState(null);
  const [pendingTopic, setPendingTopic] = useState(null);

  // Practice
  const [practiceSection, setPracticeSection] = useState(null); // "math" | "rw" | null = all
  const [practiceMode, setPracticeMode] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentQ, setCurrentQ] = useState(null);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [sessionStats, setSessionStats] = useState({correct:0,total:0});
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);

  // Daily tracking
  const [todayQCount, setTodayQCount] = useState(0);
  const [todayDate, setTodayDate] = useState(new Date().toDateString());

  // Error analysis
  const [errorType, setErrorType] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [milestone, setMilestone] = useState(null); // {score, prevScore} // "concept"|"careless"|"timing"|null
  const [showErrorPrompt, setShowErrorPrompt] = useState(false);

  // Timed
  const [timedState, setTimedState] = useState("idle");
  const [timedQs, setTimedQs] = useState([]);       // pre-loaded question set
  const [timedQIdx, setTimedQIdx] = useState(0);    // current question index
  const [timedSection, setTimedSection] = useState("all"); // math|rw|all
  const [timedResults, setTimedResults] = useState(null);  // detailed results
  const [timedDuration, setTimedDuration] = useState(90);
  const [timedCountdown, setTimedCountdown] = useState(3);
  const [timedTimeLeft, setTimedTimeLeft] = useState(90);
  const [timedQ, setTimedQ] = useState(null);
  const [timedSelected, setTimedSelected] = useState(null);
  const [timedScore, setTimedScore] = useState({correct:0,total:0});

  // Full test
  const [fullTestState, setFullTestState] = useState("idle");
  const [miniTestState, setMiniTestState] = useState("idle"); // idle|size|active|result
  const [miniTestSize, setMiniTestSize] = useState(null); // "quick"|"standard"
  const [miniTestModule, setMiniTestModule] = useState(0); // 0=RW1, 1=RW2, 2=Math1, 3=Math2
  const [miniTestQs, setMiniTestQs] = useState([]);
  const [miniTestIdx, setMiniTestIdx] = useState(0);
  const [miniTestAnswers, setMiniTestAnswers] = useState([]);
  const [miniTestSelected, setMiniTestSelected] = useState(null);
  const [miniTestLoading, setMiniTestLoading] = useState(false);
  const [miniTestResults, setMiniTestResults] = useState(null);
  const [miniTestTimeLeft, setMiniTestTimeLeft] = useState(0);
  const miniTestTimerRef = useRef(null);

  // Review
  const [wrongAnswers, setWrongAnswers] = useState([]);

  const timerRef = useRef(null);
  const sessionHistoryRef = useRef([]);
  const latestUserDataRef = useRef(null);

  // Load from storage
  useEffect(()=>{
    (async()=>{
      try {
        const r = await window.storage.get("sat-navigator-user");
        if(r) {
          const d = JSON.parse(r.value);
          setUserData(d);
          latestUserDataRef.current = d;
          setName(d.name||"");
          setTestDate(d.testDate||"");
          setTargetScore(d.targetScore||"1400");
          setWeakTopics(d.weakTopics||[]);
          setScreen("home");
          // Refresh Pro status from Supabase (non-blocking)
          if(d?.email) {
            sbCheckPro(d.email).then(isPro => {
              if(isPro !== d.isPro) {
                const updated = {...d, isPro};
                setUserData(updated);
                latestUserDataRef.current = updated;
                window.storage.set("sat-navigator-user", JSON.stringify(updated)).catch(()=>{});
              }
            }).catch(()=>{});
          }
        }
        const wr = await window.storage.get("sat-wrong-answers");
        if(wr) setWrongAnswers(JSON.parse(wr.value)||[]);
      } catch(e){}
      setStorageLoaded(true);
    })();
  },[]);

  const saveUser = useCallback(async(data)=>{
    latestUserDataRef.current = data;
    try { await window.storage.set("sat-navigator-user",JSON.stringify(data)); } catch(e){}
    setUserData(data);
    // Auto-sync to Supabase if email is set (non-blocking)
    if(data?.email) {
      sbUpsert(data.email, data, data.isPro||false).catch(()=>{});
    }
  },[]);

  const saveWrongAnswer = useCallback(async(entry)=>{
    const updated = [...wrongAnswers, entry].slice(-100); // keep last 100
    setWrongAnswers(updated);
    try { await window.storage.set("sat-wrong-answers",JSON.stringify(updated)); } catch(e){}
  },[wrongAnswers]);

  const daysLeft = ()=>{
    const date = userData?.testDate || testDate;
    if(!date) return 0;
    const diff = Math.ceil((new Date(date)-new Date())/86400000);
    return diff>0?diff:0;
  };

  const skillProgress = userData?.skillProgress||{};

  // Load study plan once when user arrives home
  useEffect(()=>{
    if(screen==="home" && userData) {
      loadStudyPlan();
    }
  },[screen, userData?.name]);

  const handleDiagnosticComplete = (seededSkillProgress, diagResults) => {
    const mathCorrect  = diagResults.filter(r=>r.section==="math" && r.correct).length;
    const rwCorrect    = diagResults.filter(r=>r.section==="rw"   && r.correct).length;
    const mathTotal    = diagResults.filter(r=>r.section==="math").length;
    const rwTotal      = diagResults.filter(r=>r.section==="rw").length;
    const data = {
      name, testDate, targetScore,
      weakTopics: [],
      skillProgress: seededSkillProgress,
      xp: 0, streak: 0,
      lastStudyDate: new Date().toDateString(),
      diagScore: { mathCorrect, mathTotal, rwCorrect, rwTotal }
    };
    saveUser(data);
    setScreen("home");
  };

  const finishOnboarding = ()=>{
    const data = {name,testDate,targetScore,weakTopics:[],skillProgress:{},xp:0,streak:0,lastStudyDate:new Date().toDateString()};
    saveUser(data);
    setScreen("home");
  };

  // ── Study plan ──
  const loadStudyPlan = async(force=false) => {
    const today = new Date().toDateString();
    if(!force && studyPlanDate===today && studyPlan) return; // already loaded today
    setStudyPlanLoading(true);
    try {
      const plan = await generateStudyPlan(latestUserDataRef.current, latestUserDataRef.current?.skillProgress||{});
      setStudyPlan(plan);
      setStudyPlanDate(today);
    } catch(e) {
      // Fallback: pick top struggling/new topics without AI message
      const sp = latestUserDataRef.current?.skillProgress||{};
      const topics = [];
      ALL_COURSES.forEach(c => c.topics.forEach(t => {
        const m = getTopicMastery(sp[t.id]);
        if(m==="struggling"||m==="new") topics.push({id:t.id,name:t.name,reason:m==="struggling"?"Needs work":"Not started yet",courseId:c.id,section:c.section,color:c.color});
      }));
      setStudyPlan({message:"Here's what to focus on today based on your progress.", topics:topics.slice(0,3)});
      setStudyPlanDate(today);
    }
    setStudyPlanLoading(false);
  };

  // ── Practice — optionally show concept first ──
  const startPracticeWithConcept = async(courseId, topicOverride=null, showConcept=false) => {
    if(showConcept) {
      const sp = latestUserDataRef.current?.skillProgress||{};
      const topic = topicOverride || pickAdaptiveTopic(courseId, sp, latestUserDataRef.current?.weakTopics||[]);
      setSelectedCourse(courseId);
      setPendingTopic(topic);
      setPendingCourseId(courseId);
      setScreen("practice");
      setPracticeMode("concept");
      setConceptData(null);
      setConceptLoading(true);
      try {
        const concept = await generateConcept(topic, courseId);
        setConceptData(concept);
      } catch(e) {
        const course = ALL_COURSES.find(c=>c.id===courseId);
        setConceptData({
          concept:`${topic.name} — ${topic.desc}. This is a key SAT topic worth mastering.`,
          example:{problem:`A typical ${topic.name} question will test your ability to ${topic.desc.toLowerCase()}.`,steps:["Read the question carefully","Identify what's being asked","Apply the core concept","Verify your answer"]},
          mistake:"Rushing through without reading all answer choices first."
        });
      }
      setConceptLoading(false);
    } else {
      await startPractice(courseId);
    }
  };

  // ── Practice ──
  const startPractice = async(courseId)=>{
    const course = ALL_COURSES.find(c=>c.id===courseId);
    if(!course) return;
    setSelectedCourse(courseId);
    setCurrentQ(null);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShowHint(false);
    setHintUsed(false);
    setPracticeMode("question");
    sessionHistoryRef.current = [];
    setSessionStats({correct:0,total:0});
    const topic = pickAdaptiveTopic(courseId, latestUserDataRef.current?.skillProgress||{}, latestUserDataRef.current?.weakTopics||[]);
    setCurrentTopic(topic);
    setQLoading(true);
    setQError(null);
    try {
      const q = course.section==="rw"
        ? await generateRWQuestion(courseId, topic, latestUserDataRef.current?.skillProgress||{}, sessionHistoryRef.current)
        : await generateMathQuestion(courseId, topic, latestUserDataRef.current?.skillProgress||{}, sessionHistoryRef.current);
      sessionHistoryRef.current.push({text:q.q.substring(0,60),type:q.type||"algebraic"});
      setCurrentQ(q);
    } catch(e) {
      const offlineQ = getOfflineQuestion(topic.id);
      setCurrentQ(offlineQ);
      setQError("Offline mode — question from local bank.");
    }
    setQLoading(false);

    // Load inline tip for new topics (non-blocking, fires after question loads)
    const sp = latestUserDataRef.current?.skillProgress||{};
    const mastery = getTopicMastery(sp[topic.id]);
    if(mastery==="new" && (!inlineTip || inlineTip.topicId !== topic.id)) {
      setInlineTip(null);
      setTipLoading(true);
      try {
        const tipRes = await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:120,
            messages:[{role:"user",content:`Give a single SAT exam tip for the topic: "${topic.name}" (${topic.desc}). One sentence only. Start with a verb. Be specific and actionable. No fluff.`}]})
        });
        const tipData = await tipRes.json();
        const tipText = tipData.content?.[0]?.text?.trim()||"";
        if(tipText) setInlineTip({topicId:topic.id, tip:tipText, dismissed:false});
      } catch(e) {}
      setTipLoading(false);
    }
  };

  const selectAnswer = (idx)=>{
    if(selectedAnswer!==null) return;
    setSelectedAnswer(idx);
    setShowExplanation(true);
    const correct = idx===currentQ.answer;
    const newStats = {correct:sessionStats.correct+(correct?1:0),total:sessionStats.total+1};
    setSessionStats(newStats);

    const sp = {...(latestUserDataRef.current?.skillProgress||{})};
    const topicId = currentTopic?.id;
    if(topicId) {
      const prev = sp[topicId]||{total:0,correct:0,history:[]};
      sp[topicId] = {total:prev.total+1,correct:prev.correct+(correct?1:0),history:[...(prev.history||[]),correct?1:0].slice(-20)};
    }
    const xpGain = correct?(hintUsed?5:10):2;
    if(correct) { setXpBurst({amount:xpGain, key:Date.now()}); setTimeout(()=>setXpBurst(null), 900); }
    const today = new Date().toDateString();
    const lastStudy = latestUserDataRef.current?.lastStudyDate;
    const yesterday = new Date(Date.now()-86400000).toDateString();
    let newStreak = latestUserDataRef.current?.streak||0;
    if(lastStudy!==today) newStreak = lastStudy===yesterday?newStreak+1:1;
    // Save score snapshot for trajectory
    const currentScores = getPredictedScore(sp);
    const prevHistory = latestUserDataRef.current?.scoreHistory||[];
    const todayEntry = {date:today, total:currentScores.total, math:currentScores.math, rw:currentScores.rw};
    const scoreHistory = [...prevHistory.filter(e=>e.date!==today), todayEntry].slice(-60);
    const prevTotal = getPredictedScore(latestUserDataRef.current?.skillProgress||{}).total;
    saveUser({...latestUserDataRef.current,skillProgress:sp,xp:(latestUserDataRef.current?.xp||0)+xpGain,streak:newStreak,lastStudyDate:today,scoreHistory});

    // Check for score milestone crossing
    const newTotal = currentScores.total;
    const crossedMilestone = SCORE_MILESTONES.find(m => newTotal >= m && prevTotal < m);
    if(crossedMilestone) setMilestone({score:newTotal, prevScore:prevTotal});

    // Track daily question count
    if(todayDate !== today) { setTodayDate(today); setTodayQCount(1); }
    else { setTodayQCount(c => c + 1); }

    // Show error analysis prompt after wrong answers
    if(!correct) {
      setShowErrorPrompt(true);
    }

    // Save wrong answers for review
    if(!correct&&currentTopic) {
      const course = ALL_COURSES.find(c=>c.id===selectedCourse);
      saveWrongAnswer({
        q:currentQ.q, options:currentQ.options, answer:currentQ.answer, yourAnswer:idx,
        explanation:currentQ.explanation, courseId:selectedCourse, section:course?.section||"math",
        topicId:currentTopic.id, date:today, passage:currentQ.passage||null
      });
    }
  };

  const nextQuestion = async()=>{
    // Free tier gate
    if(!userData?.isPro && (todayQCount||0) >= FREE_DAILY_LIMIT) {
      setShowPaywall(true);
      return;
    }
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShowHint(false);
    setHintUsed(false);
    setCurrentQ(null);
    setErrorType(null);
    setShowErrorPrompt(false);
    const updatedSP = latestUserDataRef.current?.skillProgress||{};
    const topic = pickAdaptiveTopic(selectedCourse, updatedSP, latestUserDataRef.current?.weakTopics||[]);
    setCurrentTopic(topic);
    setQLoading(true);
    setQError(null);
    const course = ALL_COURSES.find(c=>c.id===selectedCourse);
    try {
      const q = course?.section==="rw"
        ? await generateRWQuestion(selectedCourse,topic,updatedSP,sessionHistoryRef.current)
        : await generateMathQuestion(selectedCourse,topic,updatedSP,sessionHistoryRef.current);
      sessionHistoryRef.current.push({text:q.q.substring(0,60),type:q.type||"algebraic"});
      setCurrentQ(q);
    } catch(e) {
      const offlineQ = getOfflineQuestion(topic.id);
      setCurrentQ(offlineQ);
      setQError("Offline mode — question from local bank.");
    }
    setQLoading(false);

    // Load inline tip for new topics (non-blocking, fires after question loads)
    const sp = latestUserDataRef.current?.skillProgress||{};
    const mastery = getTopicMastery(sp[topic.id]);
    if(mastery==="new" && (!inlineTip || inlineTip.topicId !== topic.id)) {
      setInlineTip(null);
      setTipLoading(true);
      try {
        const tipRes = await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:120,
            messages:[{role:"user",content:`Give a single SAT exam tip for the topic: "${topic.name}" (${topic.desc}). One sentence only. Start with a verb. Be specific and actionable. No fluff.`}]})
        });
        const tipData = await tipRes.json();
        const tipText = tipData.content?.[0]?.text?.trim()||"";
        if(tipText) setInlineTip({topicId:topic.id, tip:tipText, dismissed:false});
      } catch(e) {}
      setTipLoading(false);
    }
  };

  // ── Timed ──
  const startTimedCountdown = (section="all")=>{
    // Pre-load all questions instantly from offline bank
    const qCount = Math.max(20, Math.ceil(timedDuration/30)); // ~1 q per 30s
    const qs = getOfflineSprint(qCount, section);
    setTimedQs(qs);
    setTimedQIdx(0);
    setTimedQ(qs[0]||null);
    setTimedSection(section);
    setTimedState("countdown");
    setTimedCountdown(3);
    setTimedScore({correct:0,total:0});
    setTimedResults(null);
    const interval = setInterval(()=>{
      setTimedCountdown(c=>{
        if(c<=1){
          clearInterval(interval);
          setTimedState("active");
          setTimedTimeLeft(timedDuration);
          timerRef.current = setInterval(()=>{
            setTimedTimeLeft(t=>{
              if(t<=1){clearInterval(timerRef.current);setTimedState("result");return 0;}
              return t-1;
            });
          },1000);
          return 0;
        }
        return c-1;
      });
    },1000);
  };

  const selectTimedAnswer = (idx)=>{
    if(timedSelected!==null) return;
    setTimedSelected(idx);
    const correct = idx===timedQ?.answer;
    const newScore = {correct:timedScore.correct+(correct?1:0), total:timedScore.total+1};
    setTimedScore(newScore);
    // Auto-advance after 600ms
    setTimeout(()=>{
      const nextIdx = timedQIdx+1;
      if(nextIdx < timedQs.length) {
        setTimedQIdx(nextIdx);
        setTimedQ(timedQs[nextIdx]);
        setTimedSelected(null);
      } else {
        // Out of questions — end early
        clearInterval(timerRef.current);
        setTimedState("result");
      }
    },600);
  };

  const startFullTest = (type)=>{ setFullTestState("active"); };

  // Mini test module config
  const MINI_CONFIG = {
    quick:    {qPerModule:8,  timePerModule:10*60, label:"Quick (~15 min)"},
    standard: {qPerModule:12, timePerModule:15*60, label:"Standard (~25 min)"},
  };
  const MINI_MODULES = [
    {label:"Reading & Writing — Module 1", section:"rw",   icon:"R&W", color:T.teal},
    {label:"Reading & Writing — Module 2", section:"rw",   icon:"R&W", color:T.tealLight},
    {label:"Math — Module 1",              section:"math",  icon:"Math", color:T.navy},
    {label:"Math — Module 2",              section:"math",  icon:"Math", color:T.navyLight},
  ];

  const startMiniTest = async(size) => {
    setMiniTestSize(size);
    setMiniTestState("active");
    setMiniTestModule(0);
    setMiniTestQs([]);
    setMiniTestIdx(0);
    setMiniTestAnswers([]);
    setMiniTestSelected(null);
    setMiniTestResults(null);
    await loadMiniModule(0, size, []);
  };

  const loadMiniModule = async(moduleIdx, size, prevAnswers) => {
    setMiniTestLoading(true);
    const cfg = MINI_CONFIG[size];
    const mod = MINI_MODULES[moduleIdx];
    const courses = ALL_COURSES.filter(c=>c.section===mod.section);
    const qs = [];
    for(let i=0;i<cfg.qPerModule;i++){
      const course = courses[i % courses.length];
      const topic = pickAdaptiveTopic(course.id, latestUserDataRef.current?.skillProgress||{}, latestUserDataRef.current?.weakTopics||[]);
      try {
        const q = mod.section==="rw"
          ? await generateRWQuestion(course.id, topic, latestUserDataRef.current?.skillProgress||{}, qs.map(q=>({text:q.q?.substring(0,40)||""})))
          : await generateMathQuestion(course.id, topic, latestUserDataRef.current?.skillProgress||{}, qs.map(q=>({text:q.q?.substring(0,40)||"",type:"mixed"})));
        qs.push({...q, courseId:course.id, topicId:topic.id, section:mod.section});
      } catch(e) {
        const fb = ALL_FALLBACKS[topic.id]||ALL_FALLBACKS["linear_eq"];
        qs.push({...fb[0], courseId:course.id, topicId:topic.id, section:mod.section});
      }
    }
    setMiniTestQs(qs);
    setMiniTestIdx(0);
    setMiniTestSelected(null);
    setMiniTestLoading(false);
    const cfg2 = MINI_CONFIG[size];
    clearInterval(miniTestTimerRef.current);
    setMiniTestTimeLeft(cfg2.timePerModule);
    miniTestTimerRef.current = setInterval(()=>{
      setMiniTestTimeLeft(t=>{ if(t<=1){clearInterval(miniTestTimerRef.current);return 0;} return t-1; });
    },1000);
  };

  const selectMiniAnswer = (idx) => {
    if(miniTestSelected!==null) return;
    setMiniTestSelected(idx);
  };

  const nextMiniQuestion = async() => {
    const newAnswers = [...miniTestAnswers, {q:miniTestQs[miniTestIdx], selected:miniTestSelected, correct:miniTestSelected===miniTestQs[miniTestIdx]?.answer}];
    setMiniTestAnswers(newAnswers);
    setMiniTestSelected(null);
    if(miniTestIdx < miniTestQs.length-1) {
      setMiniTestIdx(i=>i+1);
    } else {
      clearInterval(miniTestTimerRef.current);
      const nextMod = miniTestModule+1;
      if(nextMod < MINI_MODULES.length) {
        setMiniTestModule(nextMod);
        await loadMiniModule(nextMod, miniTestSize, newAnswers);
      } else {
        const rwA = newAnswers.filter(a=>a.q.section==="rw");
        const mathA = newAnswers.filter(a=>a.q.section==="math");
        const rwPct = rwA.length>0?rwA.filter(a=>a.correct).length/rwA.length:0;
        const mathPct = mathA.length>0?mathA.filter(a=>a.correct).length/mathA.length:0;
        const topicMisses = {};
        newAnswers.filter(a=>!a.correct).forEach(a=>{ topicMisses[a.q.topicId]=(topicMisses[a.q.topicId]||0)+1; });
        const weakTopics = Object.entries(topicMisses).sort((a,b)=>b[1]-a[1]).slice(0,3)
          .map(([id,count])=>{
            const course = ALL_COURSES.find(c=>c.topics.some(t=>t.id===id));
            const topic = course?.topics.find(t=>t.id===id);
            return {id, name:topic?.name||id, count, courseId:course?.id, color:course?.color};
          });
        setMiniTestResults({
          rwScore:Math.round(200+rwPct*600), mathScore:Math.round(200+mathPct*600),
          total:Math.round(200+rwPct*600)+Math.round(200+mathPct*600),
          rwCorrect:rwA.filter(a=>a.correct).length, rwTotal:rwA.length,
          mathCorrect:mathA.filter(a=>a.correct).length, mathTotal:mathA.length,
          weakTopics
        });
        setMiniTestState("result");
      }
    }
  };

  if(!storageLoaded) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:T.bg,fontFamily:"'Space Mono',monospace",color:T.textMuted}}>Loading…</div>;

  const struggling = getStrugglingTopics(skillProgress);

  return (
    <div style={{fontFamily:"'Poppins',sans-serif",background:T.bg,display:"flex",justifyContent:"center",alignItems:"stretch",minHeight:"100vh"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Poppins:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; -webkit-font-smoothing:antialiased; -webkit-tap-highlight-color:transparent; }
        html, body { background:${T.bg}; overscroll-behavior:none; -webkit-text-size-adjust:100%; touch-action:manipulation; height:100%; }
        .app-shell::before { content:''; position:fixed; top:0; left:50%; transform:translateX(-50%); width:100%; max-width:430px; height:300px; background:radial-gradient(ellipse 80% 50% at 50% -10%, rgba(30,58,95,0.08) 0%, transparent 70%); pointer-events:none; z-index:0; }
        input, select, textarea { font-size:16px !important; }
        .app-shell { width:100%; max-width:430px; min-height:100vh; min-height:-webkit-fill-available; display:flex; flex-direction:column; background:${T.bg}; }
        .scroll-body { -webkit-overflow-scrolling:touch; overscroll-behavior:contain; }
        .bottom-nav-safe { padding-bottom:max(14px,env(safe-area-inset-bottom)); }
        button:active { opacity:0.75; transform:scale(0.98); transition:transform 0.05s; }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shake   { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        @keyframes pop-in  { 0%{transform:scale(0.85);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        @keyframes slide-up{ 0%{transform:translateY(10px);opacity:0} 100%{transform:translateY(0);opacity:1} }
        @keyframes xp-float{ 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-32px);opacity:0} }
        .answer-wrong  { animation: shake 0.4s ease; }
        .answer-correct{ animation: pop-in 0.3s ease; }
        .explanation-in{ animation: slide-up 0.25s ease; }
        .card-hover:active { transform:scale(0.985); transition:transform 0.1s; }
      `}</style>
      <div className="app-shell">
        {showPaywall&&<PaywallModal onClose={()=>setShowPaywall(false)}/>}
        {milestone&&<MilestoneModal score={milestone.score} prevScore={milestone.prevScore} targetScore={parseInt(userData?.targetScore||"1400")} onClose={()=>setMilestone(null)}/>}
        {screen==="onboarding"&&<OnboardingScreen step={onboardStep} setStep={setOnboardStep} name={name} setName={setName} testDate={testDate} setTestDate={setTestDate} targetScore={targetScore} setTargetScore={setTargetScore} onDiagnosticComplete={handleDiagnosticComplete} onFinish={finishOnboarding}/>}
        {screen!=="onboarding"&&(
          <>
            {screen==="home"&&<HomeScreen userData={userData} daysLeft={daysLeft()} skillProgress={skillProgress} setScreen={setScreen} startPractice={(id)=>{startPracticeWithConcept(id);}} strugglingTopics={struggling} setPracticeSection={setPracticeSection} studyPlan={studyPlan} studyPlanLoading={studyPlanLoading} onRefreshPlan={()=>loadStudyPlan(true)} todayQCount={todayQCount} wrongAnswers={wrongAnswers}/>}
            {screen==="practice"&&<PracticeScreen practiceMode={practiceMode} setPracticeMode={setPracticeMode} practiceSection={practiceSection} setPracticeSection={setPracticeSection} selectedCourse={selectedCourse} currentQ={currentQ} currentTopic={currentTopic} selectedAnswer={selectedAnswer} showExplanation={showExplanation} sessionStats={sessionStats} selectAnswer={selectAnswer} nextQuestion={nextQuestion} startPractice={(id)=>{startPracticeWithConcept(id);}} skillProgress={skillProgress} setScreen={setScreen} showHint={showHint} setShowHint={setShowHint} hintUsed={hintUsed} setHintUsed={setHintUsed} qLoading={qLoading} qError={qError} conceptData={conceptData} conceptLoading={conceptLoading} pendingTopic={pendingTopic} pendingCourseId={pendingCourseId} onConceptDone={()=>startPractice(pendingCourseId)} onConceptSkip={()=>startPractice(pendingCourseId)} errorType={errorType} setErrorType={setErrorType} showErrorPrompt={showErrorPrompt} setShowErrorPrompt={setShowErrorPrompt} inlineTip={inlineTip} setInlineTip={setInlineTip} tipLoading={tipLoading}/>}
            {screen==="tests"&&<TestsScreen userData={userData} timedState={timedState} timedCountdown={timedCountdown} timedTimeLeft={timedTimeLeft} timedDuration={timedDuration} setTimedDuration={setTimedDuration} timedQ={timedQ} timedSelected={timedSelected} timedScore={timedScore} startTimedCountdown={startTimedCountdown} selectTimedAnswer={selectTimedAnswer} setTimedState={setTimedState} setScreen={setScreen} fullTestState={fullTestState} startFullTest={startFullTest} setFullTestState={setFullTestState} miniTestState={miniTestState} setMiniTestState={setMiniTestState} miniTestModule={miniTestModule} miniTestQs={miniTestQs} miniTestIdx={miniTestIdx} miniTestSelected={miniTestSelected} miniTestLoading={miniTestLoading} miniTestResults={miniTestResults} miniTestTimeLeft={miniTestTimeLeft} miniTestSize={miniTestSize} startMiniTest={startMiniTest} selectMiniAnswer={selectMiniAnswer} nextMiniQuestion={nextMiniQuestion} MINI_MODULES={MINI_MODULES} MINI_CONFIG={MINI_CONFIG}/>}
            {screen==="learn"&&<StrategyLibraryScreen setScreen={setScreen} screen={screen}/>}
        {screen==="review"&&<ReviewScreen wrongAnswers={wrongAnswers} setScreen={setScreen} startPractice={(id)=>{startPractice(id);}} skillProgress={skillProgress}/>}
            {screen==="progress"&&<ProgressScreen userData={userData} skillProgress={skillProgress} setScreen={setScreen} startPractice={(id)=>{startPractice(id);}} wrongAnswers={wrongAnswers} todayQCount={todayQCount}/>}
            {screen==="settings"&&<SettingsScreen userData={userData} saveUser={saveUser} setScreen={setScreen}/>}
          </>
        )}
      </div>
    </div>
  );
}
