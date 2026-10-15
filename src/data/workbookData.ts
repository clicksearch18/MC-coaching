import { WorkbookWeek, CoreBrandVideo, WorkbookField } from '../types';

export const CORE_BRAND_VIDEOS_TEMPLATE: CoreBrandVideo[] = [
  {
    id: 'core-b1',
    code: 'B1',
    name: 'Brand Documentary',
    week: 'Lesson 10',
    runtimeTarget: '4–8 min',
    purpose: 'Earns emotional trust and does work no other asset can. Enters first in the paid ad sequence ($5–10/day).',
    shiftStages: {
      S: 'Spark the story — Start on the moment in your history you would rather not discuss.',
      H: 'Humanize the mission — Introduce the people and what each of them protects.',
      I: 'Ignite the conflict — Do not flinch from the drama or the industry failure that pushed you here.',
      F: 'Forge the difference — Show the standard and mechanism you built in response.',
      T: 'Transfer the legacy — Why you exist and the one next action for the viewer.'
    },
    status: 'Not Started'
  },
  {
    id: 'core-b2',
    code: 'B2',
    name: 'Product / Service Dream Builder',
    week: 'Lesson 11',
    runtimeTarget: '3–6 min',
    purpose: 'The dream builder — outcome first, mechanism second. Carries most of your paid distribution.',
    shiftStages: {
      S: 'See the future — Lead with what life looks like after.',
      H: 'Highlight the gap — Why traditional approaches keep them stuck.',
      I: 'Introduce the mechanism — Your named process from Q7.',
      F: 'Frame the journey — Real installations, real deliverables, supporting middle.',
      T: 'Take the first step — One clear friction-free next step.'
    },
    status: 'Not Started'
  },
  {
    id: 'core-b3',
    code: 'B3',
    name: 'Proof & Case Study Video',
    week: 'Lesson 12',
    runtimeTarget: '3–5 min',
    purpose: 'Credibility transfers through a believable transformation told by someone other than you.',
    shiftStages: {
      S: 'Share the struggle — Problem stated in the customer’s own words.',
      H: 'Highlight the hesitation — The near-miss reason they almost did not buy.',
      I: 'Identify the inflection — What changed their decision.',
      F: 'Finish the transformation — Visible before-and-after plus a real number.',
      T: 'Tell them what is possible — Directly answers the Core Objection.'
    },
    status: 'Not Started'
  },
  {
    id: 'core-b4',
    code: 'B4',
    name: 'Ownership Experience Video',
    week: 'Lesson 13',
    runtimeTarget: '3–5 min',
    purpose: 'Removes the fear of what happens after they say yes. Maps every touchpoint with names and timeframes.',
    shiftStages: {
      S: 'Start the experience — The first hour after saying yes.',
      H: 'Humanize the handoff — Specific team members and timeframes.',
      I: 'Illustrate the journey — Step-by-step onboarding walkthrough.',
      F: 'Fortify the trust — What happens when something goes wrong and how you handle it.',
      T: 'Take the next step — Picture the first week of working together.'
    },
    status: 'Not Started'
  },
  {
    id: 'core-b5',
    code: 'B5',
    name: 'Expert Demonstrations (20-Video Teaching Matrix)',
    week: 'Lessons 14–17',
    runtimeTarget: '~15 min each (5h total)',
    purpose: '5 customer topics × 4 angles (Actionable, Analytical, Psychological, Aspirational). Give away your best thinking.',
    shiftStages: {
      S: 'Snag & swear (0:00–0:15) — Earn attention in the first 15 seconds.',
      H: 'Harness & highlight (0:15–0:30) — Pivot angle, conversational trust.',
      I: 'Illuminate the illusion (0:30–1:45) — Reveal what they misunderstood (40% runtime).',
      F: 'Formulate the fix (1:45–3:00) — Show the better way in 3 steps (40% runtime).',
      T: 'Trigger the transfer (3:00–3:10) — Urgent close-up, one clear CTA.'
    },
    status: 'Not Started'
  }
];

// Helper to build repeatable Module 08 (Script), Module 10 (Shoot Brief), Module 11 (Editing QA), Module 12 (Publishing QA)
export const EDITING_QA_CHECKLIST = [
  {
    category: 'CONTENT (MODULE 11 EDITING QA)',
    items: [
      'First fifteen seconds earn attention without a logo or an introduction',
      'One primary idea — nothing bundled in',
      'The story clearly supports the belief',
      'No unnecessary company introduction anywhere',
      'Nothing withheld to manufacture curiosity'
    ]
  },
  {
    category: 'CRAFT (MODULE 11 EDITING QA)',
    items: [
      'Audio is clean on phone speakers',
      'Captions present and checked for names and jargon',
      'B-roll supports the point rather than decorating',
      'No dead air longer than two seconds'
    ]
  },
  {
    category: 'DELIVERY (MODULE 11 EDITING QA)',
    items: [
      'CTA contains exactly one action',
      'Correct aspect ratios exported',
      'File named to the module 09 standard',
      'Thumbnail and title approved',
      'Stored in the finals location'
    ]
  }
];

function buildProductionModulesFields(prefix: string, assetLabel: string): WorkbookField[] {
  return [
    // Module 08: S.H.I.F.T. Script Sheet
    { id: `${prefix}_m08_title`, section: `Module 08 · S.H.I.F.T. Script Sheet (${assetLabel})`, label: 'VIDEO TITLE', placeholder: `Enter working title for ${assetLabel}` },
    { id: `${prefix}_m08_type`, section: `Module 08 · S.H.I.F.T. Script Sheet (${assetLabel})`, label: 'TYPE (DOCUMENTARY / PRODUCT / PROOF / OWNERSHIP / EXPERT)', placeholder: assetLabel },
    { id: `${prefix}_m08_story`, section: `Module 08 · S.H.I.F.T. Script Sheet (${assetLabel})`, label: 'STORY PULLED FROM THE BANK', placeholder: 'e.g. Story #01 — The $150k Funnel Shutoff' },
    { id: `${prefix}_m08_messaging`, section: `Module 08 · S.H.I.F.T. Script Sheet (${assetLabel})`, label: 'MESSAGING ANSWERS USED (INCLUDE OBJECTION & ILLUSION WHERE RELEVANT)', placeholder: 'Core Transformation (Q1), Core Belief (Q4), Core Objection (Mod 03)' },
    { id: `${prefix}_m08_s`, section: `Module 08 · S.H.I.F.T. Script Sheet (${assetLabel})`, label: 'S · SIGNAL — EARN ATTENTION IN THE FIRST FIFTEEN SECONDS', placeholder: 'Write your 0:00–0:15 opening hook...', multiline: true },
    { id: `${prefix}_m08_h`, section: `Module 08 · S.H.I.F.T. Script Sheet (${assetLabel})`, label: 'H · HUMANIZE — EARN TRUST AND RELEVANCE', placeholder: 'Write your 0:15–0:30 humanize pivot...', multiline: true },
    { id: `${prefix}_m08_i`, section: `Module 08 · S.H.I.F.T. Script Sheet (${assetLabel})`, label: 'I · ILLUMINATE — REVEAL WHAT THEY HAVE MISUNDERSTOOD (40% RUNTIME)', placeholder: 'Write your 0:30–1:45 illumination & story...', multiline: true },
    { id: `${prefix}_m08_f`, section: `Module 08 · S.H.I.F.T. Script Sheet (${assetLabel})`, label: 'F · FORMULATE — THE BETTER WAY, IN STEPS (40% RUNTIME)', placeholder: 'Write your 1:45–3:00 3-step formulation...', multiline: true },
    { id: `${prefix}_m08_t`, section: `Module 08 · S.H.I.F.T. Script Sheet (${assetLabel})`, label: 'T · TRANSFER — ONE CLEAR NEXT ACTION', placeholder: 'Write your 3:00–3:10 single CTA...', multiline: true },

    // Module 10: Shoot Brief
    { id: `${prefix}_m10_date`, section: `Module 10 · Shoot Brief (${assetLabel})`, label: 'SHOOT DATE & CALL TIME / WRAP TIME', placeholder: 'e.g. Friday Nov 6 · 9:00 AM – 12:00 PM' },
    { id: `${prefix}_m10_videos`, section: `Module 10 · Shoot Brief (${assetLabel})`, label: 'VIDEOS BEING FILMED TODAY (TITLES + IDS)', placeholder: 'e.g. MCM-DOC-001 / Batch titles...', multiline: true },
    { id: `${prefix}_m10_approved`, section: `Module 10 · Shoot Brief (${assetLabel})`, label: 'SCRIPTS APPROVED BY (NAME + DATE) & TALENT ON CAMERA', placeholder: 'Approved by Josh · Talent: Founder + Ops Lead' },
    { id: `${prefix}_m10_wardrobe_loc`, section: `Module 10 · Shoot Brief (${assetLabel})`, label: 'WARDROBE NOTE (CONTINUITY ACROSS BATCH) & LOCATION', placeholder: 'Matte black crew neck · Main Studio + Whiteboard wall' },
    { id: `${prefix}_m10_props_broll`, section: `Module 10 · Shoot Brief (${assetLabel})`, label: 'PROPS / EQUIPMENT NEEDED & B-ROLL SHOT LIST', placeholder: 'Printed workbook, iPad metrics dashboard, over-the-shoulder client calls...', multiline: true },
    { id: `${prefix}_m10_permissions`, section: `Module 10 · Shoot Brief (${assetLabel})`, label: 'CUSTOMER PERMISSIONS NEEDED / OBTAINED & ESTIMATED RUNTIME PER PIECE', placeholder: 'Signed release in Drive · 4–6 mins target' },
    { id: `${prefix}_m10_cta_sla`, section: `Module 10 · Shoot Brief (${assetLabel})`, label: 'CTA FOR EACH PIECE · FOOTAGE DELIVERED TO EDITOR BY · ROUGH CUT DUE', placeholder: '1st CTA: Pipeline Audit · Delivered Friday 2pm · Rough cut due Monday 5pm' },

    // Module 12: Publishing QA
    { id: `${prefix}_m12_asset_platform`, section: `Module 12 · Publishing QA (${assetLabel})`, label: 'ASSET ID + TITLE · PLATFORM · PUBLISH DATE', placeholder: 'MCM-001 · YouTube + Meta Ad Manager · Published Live' },
    { id: `${prefix}_m12_desc`, section: `Module 12 · Publishing QA (${assetLabel})`, label: 'DESCRIPTION COPY & TAGS', placeholder: 'Full description copy with both CTAs...', multiline: true },
    { id: `${prefix}_m12_thumb_cta`, section: `Module 12 · Publishing QA (${assetLabel})`, label: 'THUMBNAIL APPROVED BY & CTA + PUBLISHED URL LINK', placeholder: 'https://youtu.be/...' },
    { id: `${prefix}_m12_supporting`, section: `Module 12 · Publishing QA (${assetLabel})`, label: 'SUPPORTING ORGANIC POST SCHEDULED? · SUPPORTING EMAIL SCHEDULED?', placeholder: 'Yes — Monday Signal Reel + Tuesday Email scheduled' },
    { id: `${prefix}_m12_audience_review`, section: `Module 12 · Publishing QA (${assetLabel})`, label: 'AUDIENCE ASSIGNMENT (SEQUENCE STEP / CUSTOM AUDIENCE) & PERFORMANCE REVIEW DATE (2 WEEKS OUT)', placeholder: 'Sequence Step 1 (Cold $10/day) -> Feeds 25% Full List · Review in 14 days' }
  ];
}

// Helper for Lesson 05 (Module 04: 20 Story Bank Candidates)
const STORY_BANK_20_FIELDS: WorkbookField[] = Array.from({ length: 20 }, (_, i) => {
  const num = String(i + 1).padStart(2, '0');
  const defaults: Record<number, string> = {
    0: 'Flooded basement / $4k agency fired after 90 days of zero sales — doubled conversions with one $5/day video. (T:5 / P:5 / E:5)',
    1: 'Turned off a $150k/mo complex webinar funnel and revenue didn’t drop a single dollar. (T:5 / P:4 / E:5)',
    2: 'The Nobel Physicist & Chauffeur metaphor: watching a louder competitor charge 3x using our framework. (T:4 / P:5 / E:4)',
    3: 'Swapped a 50-page eBook for a 1-page micromagnet and generated 1,256 leads at $0.27 each. (T:5 / P:5 / E:4)',
    4: 'Luxury watch seller who replaced his entire sales call calendar with a 4-step DM script. (T:4 / P:5 / E:5)'
  };
  return {
    id: `m04_story_${num}`,
    section: 'Module 04 · Story Bank Capture (20 Candidates + Tension/Proof/Ease 1–5 Scores)',
    label: `CANDIDATE ${num} — ONE LINE (WHAT HAPPENED) + T/P/E SCORE (1–5)`,
    placeholder: defaults[i] || `Candidate ${num}: One line — what happened + Score (e.g. 4/5/4)`
  };
});

// Helper for Lesson 06 (Module 05: Full Story Record — Top 8 Stories with all 14 PDF fields on Story 1 + full entries for Stories 2–8)
const FULL_STORY_FIELDS: WorkbookField[] = [
  { id: 'm05_title', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: 'STORY #01 TITLE / SHORTHAND', placeholder: 'e.g. The Flooded Basement / The $150k Funnel Shutoff' },
  { id: 'm05_belief', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: 'BELIEF IT INSTALLS (WHICH MESSAGING ANSWER THIS PROVES)', placeholder: 'e.g. Complex funnels bleed cash; simple $5 video ads to DMs build direct trust.' },
  { id: 'm05_topic_angle', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: 'TOPIC AND ANGLE (FROM THE MODULE 06 MATRIX)', placeholder: 'Topic 2 · Analytical, and again as Aspirational' },
  { id: 'm05_1_situation', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: '1 · THE SITUATION — WHO, WHEN, WHAT WAS NORMAL', placeholder: 'Who was the client/operator, when did this happen, and what was normal before?', multiline: true },
  { id: 'm05_2_tension', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: '2 · THE TENSION — WHAT WENT WRONG OR WHAT WAS AT STAKE', placeholder: 'What went sideways or what was at stake?', multiline: true },
  { id: 'm05_3_turn', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: '3 · THE TURN — WHAT CHANGED, WHAT WAS DECIDED', placeholder: 'The exact moment of decision or discovery...', multiline: true },
  { id: 'm05_4_result', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: '4 · THE RESULT — SPECIFIC, WITH NUMBERS WHERE POSSIBLE', placeholder: 'Specific measurable outcome with numbers...', multiline: true },
  { id: 'm05_5_point', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: '5 · THE POINT — THE BELIEF THIS INSTALLS', placeholder: 'The one sentence takeaway that links to your Core Belief...', multiline: true },
  { id: 'm05_20s', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: '20-SECOND VERSION — SHORT FORM, ONE BEAT', placeholder: '20-second cut for daily Concussion Content...', multiline: true },
  { id: 'm05_90s', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: '90-SECOND VERSION — THE STANDARD TELLING', placeholder: '90-second cut for teaching videos...', multiline: true },
  { id: 'm05_3m', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: '3-MINUTE VERSION — FULL, FOR LONG FORM AND THE VSL', placeholder: '3-minute full narrative for Brand Documentary and VSL...', multiline: true },
  { id: 'm05_assigned', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: 'ASSIGNED TO WHICH ASSETS', placeholder: 'e.g. Documentary · Expert #4 · VSL dimension 08' },
  { id: 'm05_clearance', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: 'CLEARANCE STATUS & WHERE PERMISSION IS STORED', placeholder: 'Written permission / anonymized / needs release / cleared' },
  { id: 'm05_assets_needed', section: 'Story #01 · Complete 14-Field Story Record (Module 05)', label: 'ASSETS NEEDED (FOOTAGE / PHOTOS / CUSTOMER ON CAMERA)', placeholder: 'Before/after screenshots, client Slack message, B-roll' },
  ...Array.from({ length: 7 }, (_, idx) => {
    const sNum = idx + 2;
    return [
      {
        id: `m05_s${sNum}_header`,
        section: `Story #0${sNum} · Full Story Record (Module 05 Sheet #${sNum} of 8)`,
        label: `STORY #0${sNum} TITLE · BELIEF IT INSTALLS · TOPIC & ANGLE · CLEARANCE`,
        placeholder: `Story #0${sNum} Title | Belief Installed | Topic & Angle | Clearance Status`
      },
      {
        id: `m05_s${sNum}_5parts`,
        section: `Story #0${sNum} · Full Story Record (Module 05 Sheet #${sNum} of 8)`,
        label: `STORY #0${sNum} FIVE-PART SHAPE (1. SITUATION · 2. TENSION · 3. TURN · 4. RESULT · 5. POINT)`,
        placeholder: `Write the 5 parts (150–300 words) for Story #0${sNum}...`,
        multiline: true
      },
      {
        id: `m05_s${sNum}_lengths`,
        section: `Story #0${sNum} · Full Story Record (Module 05 Sheet #${sNum} of 8)`,
        label: `STORY #0${sNum} THREE LENGTHS (20S · 90S · 3-MIN) & ASSIGNED ASSETS`,
        placeholder: `20s version / 90s version / 3m version + Assigned video #...`,
        multiline: true
      }
    ];
  }).flat()
];

// Helper for Lesson 07 (Module 06: 5 Topics + All 20 Matrix Cells = 5 Topics x 4 Angles)
const TOPIC_MATRIX_20_CELLS: WorkbookField[] = [
  { id: 'm06_topic1', section: 'The Five Core Customer Topics (Pulled from Q2 & Q4)', label: 'TOPIC 1 (UNAWARE STAGE)', placeholder: 'The Content Hamster Wheel vs. Pipeline Equity (7-11-4 Rule)' },
  { id: 'm06_topic2', section: 'The Five Core Customer Topics (Pulled from Q2 & Q4)', label: 'TOPIC 2 (PROBLEM AWARE STAGE)', placeholder: 'The Funnel Leak & Why "Beige" Educational Content Attracts Broke Buyers' },
  { id: 'm06_topic3', section: 'The Five Core Customer Topics (Pulled from Q2 & Q4)', label: 'TOPIC 3 (SOLUTION AWARE STAGE)', placeholder: 'The $5/Day Andromeda Ad Ecosystem & Conversational DM Sales' },
  { id: 'm06_topic4', section: 'The Five Core Customer Topics (Pulled from Q2 & Q4)', label: 'TOPIC 4 (YOUR SOLUTION STAGE)', placeholder: 'Floor vs. Ceiling Positioning & The DXY (Done-Accelerated-For-You) Model' },
  { id: 'm06_topic5', section: 'The Five Core Customer Topics (Pulled from Q2 & Q4)', label: 'TOPIC 5 (DEAL TIME STAGE)', placeholder: 'The 2-Page Super Signature Offer Doc & No-Call High-Ticket Checkout' },
  ...([1, 2, 3, 4, 5] as const).flatMap(tNum =>
    (['ACTIONABLE (HOW)', 'ANALYTICAL (WHY)', 'PSYCHOLOGICAL (WHAT STOPS PEOPLE)', 'ASPIRATIONAL (WHAT BECOMES POSSIBLE)'] as const).map((angle, aIdx) => {
      const cellNum = (tNum - 1) * 4 + (aIdx + 1);
      const code = String(cellNum).padStart(2, '0');
      return {
        id: `m06_cell_${code}`,
        section: `Topic ${tNum} · Four Teaching Angles (Videos ${String((tNum - 1) * 4 + 1).padStart(2, '0')}–${String(tNum * 4).padStart(2, '0')})`,
        label: `VIDEO #${code} · TOPIC ${tNum} · ${angle} — WORKING TITLE | STORY # | FUNNEL ROLE | PUBLISH ORDER`,
        placeholder: `Working Title | Story #0${(cellNum % 8) + 1} | Funnel Role (Cold/Mid/Bottom) | Publish Order #${cellNum} | Ad Candidate (Yes/No) | CTA Shift Magnet`
      };
    })
  )
];

export const WORKBOOK_WEEKS: WorkbookWeek[] = [
  // =========================================================================
  // LESSON 01 (W01 · MODULE 01)
  // =========================================================================
  {
    weekNumber: 1,
    code: 'L01',
    phase: 1,
    phaseName: 'PHASE 01 · FOUNDATION (WHAT YOU SAY)',
    title: 'THE ONLY METRIC THAT MATTERS',
    subtitle: 'Before any work happens, everyone involved has to agree on what success looks like — or the first slow month kills the whole effort.',
    lessonBullets: [
      'Read section 00 of the handoff manual. The benchmark is roughly seven hours of consumed content, eleven interactions, four locations before a purchase decision.',
      'Reframe: you are not buying leads, you are buying accumulated attention. Leads are the byproduct.',
      'Every metric you have reported on before — impressions, followers, cost per lead — is a proxy. Time on brand is the thing itself.'
    ],
    tasks: [
      'Audit what you publish today: how many minutes of content can one prospect actually consume about you right now?',
      'Write the number down. Most businesses find it is under twelve minutes.',
      'Name the person accountable for this system and the hour per day they own.',
      'Agree in writing that months 1–4 will produce no measurable leads, and that is expected.'
    ],
    deliverable: 'A one-page starting audit: current minutes available, current audience size, named owner, agreed 12-month horizon.',
    doneWhen: 'You can state your current time-on-brand number and nobody on the team expects leads before month five.',
    coachingPrompt: 'If a prospect wanted to spend seven hours with your brand this week, could they? What exists?',
    whereItFails: 'Skipping this week. Teams that never agreed on the metric abandon the system in month three when leads have not moved.',
    moduleNumber: '01',
    moduleTitle: 'STARTING AUDIT',
    referenceFigures: [
      {
        figNumber: 'FIG. 00',
        title: 'THE MACHINE AT A GLANCE',
        caption: 'GOAL: 7 HOURS ON BRAND before anyone talks to sales.',
        cards: [
          { badge: '01 · MAKE', title: 'THE LIBRARY + DAILY ORGANIC', subtitle: '5 brand types · 20 teaching videos', body: 'Daily organic short-form tests ideas; winners get ad spend.' },
          { badge: '02 · DISTRIBUTE', title: 'SEQUENCED ADS', subtitle: '$5–10/day each', body: 'Anyone watching 25% advances to the next video in the ladder.' },
          { badge: '03 · ACCUMULATE', title: 'THE FULL LIST', subtitle: 'One master audience', body: 'Every 25% viewer + daily organic engager rolls into the actual asset.' },
          { badge: '04 · CONVERT', title: 'MONTHLY EVENT → DM CONVO → CLIENT', subtitle: 'Workshop · Call · Live', body: 'Invite to the Offer Doc -> DM Conversation -> New Client.' }
        ]
      },
      {
        figNumber: 'FIG. 01',
        title: 'HOW 7 HOURS ACCUMULATES',
        caption: '0H → 6H 45M AND CLIMBING EVERY MONTH → 7H BENCHMARK',
        cards: [
          { badge: '5h 00m', title: '20 LONG-FORM VIDEOS', subtitle: 'At ~15 minutes each', body: 'The 5×4 teaching library + 5 core brand videos.' },
          { badge: '1h 00m', title: 'MONTHLY LIVE EVENT', subtitle: '60-minute conversion workshop', body: 'Interactive build session where participants complete an asset live.' },
          { badge: '~45m', title: 'SHORT FORM, REPLAYS, DMS', subtitle: 'Daily Concussion Content', body: 'Daily short-form videos, email stories, and two-way DM diagnostics.' }
        ]
      }
    ],
    workedExample: {
      company: 'KEYSTONE BASEMENT SYSTEMS',
      title: 'A FILLED AUDIT',
      items: [
        { label: 'MINUTES AVAILABLE', value: '9 minutes — one 2-min promo, three 90-sec FAQ clips, a 3-min testimonial' },
        { label: 'AUDIENCE SIZE', value: '1,340 followers, no retargeting audience, 210-person email list' },
        { label: 'OWNER', value: 'Ray (owner) on camera · Dana (ops) owns publishing' },
        { label: 'HOURS / WEEK', value: 'Ray 3, Dana 5' },
        { label: 'NOT EXPECTING', value: 'No change in booked jobs before month five. Reviewed at month 5, not before.' }
      ]
    },
    fields: [
      { id: 'm01_minutes', section: 'Module 01 · Starting Audit', label: 'MINUTES OF CONTENT A PROSPECT CAN CONSUME ABOUT YOU TODAY', placeholder: 'e.g. 9 minutes — one 2-min promo, three 90-sec clips' },
      { id: 'm01_audience', section: 'Module 01 · Starting Audit', label: 'CURRENT AUDIENCE / LIST SIZE', placeholder: 'e.g. 1,340 followers, no retargeting audience, 450 email list' },
      { id: 'm01_owner', section: 'Module 01 · Starting Audit', label: 'NAMED OWNER OF THIS SYSTEM', placeholder: 'e.g. Josh (on camera) · Ops Manager (publishing)' },
      { id: 'm01_hours', section: 'Module 01 · Starting Audit', label: 'HOURS PER WEEK THEY OWN FOR IT', placeholder: 'e.g. 4 hours filming/scripting, 5 hours publishing' },
      { id: 'm01_agreement', section: 'Module 01 · Starting Audit', label: 'WHAT WE AGREE NOT TO EXPECT (AND UNTIL WHEN)', placeholder: 'No measurable lead change before month five.', multiline: true }
    ]
  },

  // =========================================================================
  // LESSON 02 (W02 · MODULE 02 Q1–Q3)
  // =========================================================================
  {
    weekNumber: 2,
    code: 'L02',
    phase: 1,
    phaseName: 'PHASE 01 · FOUNDATION (WHAT YOU SAY)',
    title: 'MESSAGING: TRANSFORMATION, TENSION, SHIFT',
    subtitle: 'Questions 01–03 define who you are talking to and what changes for them. Everything downstream is a restatement of these three.',
    lessonBullets: [
      'Q1 — What do you do? Answer without naming the industry, product, or service. If the product must appear, put it last.',
      'Q2 — What is your customer frustrated, overwhelmed, or sick and tired of? Answer each of those words separately. Frustrated is not the same as sick and tired.',
      'Q3 — What do you increase, reduce, improve, simplify, or optimize? Again, one answer per verb. Five separate lines.'
    ],
    tasks: [
      'Draft Q1 in one sentence. Rewrite it four times, each shorter than the last.',
      'Write the three separate answers to Q2 — frustrated / overwhelmed / sick and tired.',
      'Write the five separate answers to Q3 — increase / reduce / improve / simplify / optimize.',
      'Read the Q2 answers to two actual customers. Change the words to match what they say back.'
    ],
    deliverable: 'Core Transformation (one sentence), Core Tension (three answers), Core Shift (five answers).',
    doneWhen: 'A stranger reading only these can describe who you help and what changes — without knowing your industry.',
    coachingPrompt: 'Which of your Q3 answers can you put a number on? Those become your proof points later.',
    whereItFails: 'Answering Q2 and Q3 as one blended paragraph. The separation is the point — each verb produces a different video.',
    moduleNumber: '02',
    moduleTitle: 'THE SEVEN MESSAGING QUESTIONS (Q1–Q3)',
    referenceFigures: [
      {
        figNumber: 'FIG. 02',
        title: 'THE ONE-PAGE MESSAGING CANVAS',
        caption: 'When all seven boxes are full, you can script anything in this document without a blank page.',
        cards: [
          { badge: '01 · CORE TRANSFORMATION', title: 'WHAT DO YOU DO?', body: 'One sentence without naming the industry, product, or service.' },
          { badge: '02 · CORE TENSION', title: 'WHAT ARE THEY SICK OF?', body: 'Three separate answers: Frustrated by · Overwhelmed by · Sick and tired of.' },
          { badge: '03 · CORE SHIFT', title: 'WHAT DO YOU IMPROVE?', body: 'Five separate lines: Increase · Reduce · Improve · Simplify · Optimize.' },
          { badge: '04–07 · BELIEF, STORY, HOOK, MECHANISM', title: 'COMPLETED IN LESSONS 03 & 04', body: '04 Core Belief · 05 Core Story · 06 The Name or Hook · 07 The Acronym / Method.' }
        ]
      }
    ],
    workedExample: {
      company: 'KEYSTONE BASEMENT SYSTEMS',
      title: 'Q1–Q3 WORKED EXAMPLE',
      items: [
        { label: 'Q1 DRAFT 1', value: 'We waterproof residential basements in the Lehigh Valley.' },
        { label: 'Q1 DRAFT 4', value: 'We give people back the bottom third of their house — permanently, and without them having to become an expert in water.' },
        { label: 'FRUSTRATED BY', value: 'Three contractors gave three different diagnoses and two of them blamed the gutters.' },
        { label: 'OVERWHELMED BY', value: 'Not knowing whether this is a $900 problem or a $19,000 problem until someone is in the basement.' },
        { label: 'SICK AND TIRED OF', value: 'Mopping after every heavy rain and pretending the smell is normal.' }
      ]
    },
    fields: [
      { id: 'm02_q1_draft1', section: 'Q1 · Core Transformation (4 Rewrites, Each Shorter Than The Last)', label: 'Q1 DRAFT 1 (INITIAL SENTENCE)', placeholder: 'First draft...' },
      { id: 'm02_q1_draft2', section: 'Q1 · Core Transformation (4 Rewrites, Each Shorter Than The Last)', label: 'Q1 DRAFT 2 (SHORTER)', placeholder: 'Second draft...' },
      { id: 'm02_q1_draft3', section: 'Q1 · Core Transformation (4 Rewrites, Each Shorter Than The Last)', label: 'Q1 DRAFT 3 (SHORTER)', placeholder: 'Third draft...' },
      { id: 'm02_q1_transformation', section: 'Q1 · Core Transformation (4 Rewrites, Each Shorter Than The Last)', label: 'Q1 DRAFT 4 (FINAL CORE TRANSFORMATION — NO INDUSTRY, PRODUCT, OR SERVICE NAME)', placeholder: 'We help established operators install a compounding client acquisition engine so they never chase cold leads again.', multiline: true },
      { id: 'm02_q2_frustrated', section: 'Q2 · Core Tension — Three Separate Answers', label: 'FRUSTRATED BY…', placeholder: 'Posting daily content that gets likes from peers but $0 in high-ticket pipeline.' },
      { id: 'm02_q2_overwhelmed', section: 'Q2 · Core Tension — Three Separate Answers', label: 'OVERWHELMED BY…', placeholder: 'Complex multi-step webinar funnels, leaky landing pages, and managing whiny sales closers.' },
      { id: 'm02_q2_sick_and_tired', section: 'Q2 · Core Tension — Three Separate Answers', label: 'SICK AND TIRED OF…', placeholder: 'Playing the referral lottery and not knowing where next month’s $30k clients are coming from.' },
      { id: 'm02_q3_increase', section: 'Q3 · Core Shift — Five Separate Answers (One Per Verb)', label: 'WE INCREASE…', placeholder: 'Pre-call consumption depth (from 9 minutes to 7+ hours on brand).' },
      { id: 'm02_q3_reduce', section: 'Q3 · Core Shift — Five Separate Answers (One Per Verb)', label: 'WE REDUCE…', placeholder: 'Customer acquisition cost and sales call friction by 70%.' },
      { id: 'm02_q3_improve', section: 'Q3 · Core Shift — Five Separate Answers (One Per Verb)', label: 'WE IMPROVE…', placeholder: 'Show-up rates and inbound DM buyer conviction.' },
      { id: 'm02_q3_simplify', section: 'Q3 · Core Shift — Five Separate Answers (One Per Verb)', label: 'WE SIMPLIFY…', placeholder: 'Daily content creation down to a 10-minute Concussion Content workflow.' },
      { id: 'm02_q3_optimize', section: 'Q3 · Core Shift — Five Separate Answers (One Per Verb)', label: 'WE OPTIMIZE…', placeholder: 'Ad spend using $5/day sequenced video views into the Full List.' }
    ]
  },

  // =========================================================================
  // LESSON 03 (W03 · MODULE 02 Q4–Q5)
  // =========================================================================
  {
    weekNumber: 3,
    code: 'L03',
    phase: 1,
    phaseName: 'PHASE 01 · FOUNDATION (WHAT YOU SAY)',
    title: 'MESSAGING: BELIEF AND STORY',
    subtitle: 'Q4 is the highest-leverage sentence in the entire system. Every piece of content you publish either installs the core belief or wastes the slot.',
    isReuse: true,
    reuseNote: 'Continue Module 02 — Q4 and Q5.',
    lessonBullets: [
      'Q4 — What must your customer believe to make your offer a no-brainer? One idea. Not three.',
      'Q5 — What story installs that belief? Belief cannot be asserted; it has to be demonstrated.',
      'A belief you have to argue for is the wrong belief. The right one is obvious once seen.'
    ],
    tasks: [
      'Write ten candidate core beliefs. Cut to three. Cut to one.',
      'Test the survivor: if a prospect accepted this as true, would buying become obvious? If not, keep cutting.',
      'Write the story that proves it — what happened, to whom, and what changed.',
      'Tell that story out loud to someone unfamiliar with the business. Watch where they lean in and where they drift.'
    ],
    deliverable: 'Core Belief (one sentence) and Core Story (200–400 words, told not summarized).',
    doneWhen: 'You can say the belief in under ten seconds and back it with a story you do not need notes for.',
    coachingPrompt: 'What does your best customer believe that your worst prospect does not?',
    whereItFails: 'Choosing a belief that flatters you instead of one that reframes them.',
    moduleNumber: '02 (Q4–Q5)',
    moduleTitle: 'THE SEVEN MESSAGING QUESTIONS (Q4 CORE BELIEF & Q5 CORE STORY)',
    workedExample: {
      company: 'KEYSTONE BASEMENT SYSTEMS',
      title: 'TEN CANDIDATES CUT TO ONE',
      items: [
        { label: 'CUT', value: '"Quality matters." — a company claim, not a belief.' },
        { label: 'CUT', value: '"Cheap waterproofing is expensive." — true but generic.' },
        { label: 'KEPT', value: 'Water in a basement is never a basement problem — it is a water-management problem, and anyone fixing only the basement will be back.' }
      ]
    },
    fields: [
      { id: 'm02_q4_candidates', section: 'Q4 · Core Belief (10 Candidates Cut to 3, Then 1)', label: 'TEN CANDIDATE BELIEFS → TOP THREE SURVIVORS', placeholder: 'List your candidate beliefs before cutting to the single highest-leverage sentence...', multiline: true },
      { id: 'm02_q4_belief', section: 'Q4 · Core Belief (10 Candidates Cut to 3, Then 1)', label: 'Q4 · FINAL CORE BELIEF — THE ONE IDEA THAT, ONCE ACCEPTED, MAKES BUYING OBVIOUS', placeholder: 'More content does not create clients; consumption depth (7 hours on brand) does.', multiline: true },
      { id: 'm02_q5_story', section: 'Q5 · Core Story (200–400 Words, Told Not Summarized)', label: 'Q5 · CORE STORY — THE STORY THAT PROVES THE BELIEF INSTEAD OF ASSERTING IT', placeholder: 'Tell the concrete story: what happened, to whom, and what changed...', multiline: true }
    ]
  },

  // =========================================================================
  // LESSON 04 (W04 · MODULE 02 Q6–Q7 + MODULE 03)
  // =========================================================================
  {
    weekNumber: 4,
    code: 'L04',
    phase: 1,
    phaseName: 'PHASE 01 · FOUNDATION (WHAT YOU SAY)',
    title: 'MESSAGING: HOOK AND MECHANISM',
    subtitle: 'Q6 and Q7 make the message portable. A named hook travels by word of mouth; a named mechanism turns a service into a method people trust and refer.',
    isPhaseGate: true,
    lessonBullets: [
      'Q6 — Is there a clever name or hook that defines you? If strangers can repeat it, it works.',
      'Q7 — Is there an acronym or named sequence that makes your process easy to understand?',
      'A method is what people refer. Nobody refers a service description.'
    ],
    tasks: [
      'Brainstorm twenty hooks. Say each one out loud. Keep the three you are not embarrassed by.',
      'Name your process — three to five stages, ideally spelling something.',
      'Assemble all seven answers onto one page. This page never leaves your desk.',
      'Read the page to a customer and a stranger. Note every sentence that needed explaining, and rewrite it.'
    ],
    deliverable: 'The one-page messaging document — all seven answers, final.',
    doneWhen: 'Two people outside the company can read the page and correctly explain what you do, who it is for, and why it works.',
    coachingPrompt: 'If a customer described you to a friend, which of your seven answers would they actually use?',
    whereItFails: 'Forcing an acronym that does not fit. A clear three-stage name beats a tortured five-letter one.',
    moduleNumber: '02 & 03',
    moduleTitle: 'Q6 HOOK, Q7 MECHANISM (STAGES 1–5) & MODULE 03 SECONDARY PRODUCTION INPUTS',
    referenceFigures: [
      {
        figNumber: 'FIG. 03',
        title: 'MESSAGING ALIGNMENT: WHICH INPUT EACH VIDEO TYPE NEEDS',
        caption: 'Read a column to know what a video needs before you write it. Read a row to see how far one answer travels.',
        headers: ['QUESTION', 'INPUT', 'DOC.', 'PROD.', 'PROOF', 'OWNER.', 'EXPERT'],
        rows: [
          ['What do you really do?', 'CORE TRANSFORMATION', '●', '●', '·', '●', '●'],
          ['What are they sick of?', 'CORE TENSION', '●', '●', '●', '●', '●'],
          ['What do you improve?', 'CORE SHIFT', '●', '●', '●', '●', '●'],
          ['What must they believe?', 'CORE BELIEF', '●', '●', '●', '●', '●'],
          ['What story installs it?', 'CORE STORY', '●', '·', '●', '·', '●'],
          ['Why don’t they believe it yet?', 'CORE OBJECTION', '·', '●', '●', '●', '●'],
          ['What myth keeps them stuck?', 'CORE ILLUSION', '·', '●', '·', '·', '●'],
          ['What proves the method works?', 'CORE PROOF', '●', '●', '●', '●', '●']
        ]
      }
    ],
    workedExample: {
      company: 'KEYSTONE BASEMENT SYSTEMS',
      title: 'MODULE 03 CORE OBJECTION EXAMPLE',
      items: [
        { label: 'CORE OBJECTION', value: '"The last company gave a lifetime warranty too, and they are out of business." — every proof and ownership video answers this one.' }
      ]
    },
    fields: [
      { id: 'm02_q6_hook', section: 'Module 02 · Q6 Core Hook & Q7 Core Mechanism (Pages 8–9)', label: 'Q6 · CORE HOOK — THE PHRASE A STRANGER COULD REPEAT BACK TO YOU', placeholder: 'e.g. The Market Concussion Machine (7 Hours on Brand Before Sales)' },
      { id: 'm02_q7_mechanism', section: 'Module 02 · Q6 Core Hook & Q7 Core Mechanism (Pages 8–9)', label: 'Q7 · CORE MECHANISM — YOUR NAMED PROCESS / ACRONYM', placeholder: 'e.g. S.H.I.F.T. Framework' },
      { id: 'm02_q7_stage1', section: 'Module 02 · Q6 Core Hook & Q7 Core Mechanism (Pages 8–9)', label: 'MECHANISM STAGE 1', placeholder: 'Stage 1: Signal — Earn attention in 15 seconds' },
      { id: 'm02_q7_stage2', section: 'Module 02 · Q6 Core Hook & Q7 Core Mechanism (Pages 8–9)', label: 'MECHANISM STAGE 2', placeholder: 'Stage 2: Humanize — Build conversational trust' },
      { id: 'm02_q7_stage3', section: 'Module 02 · Q6 Core Hook & Q7 Core Mechanism (Pages 8–9)', label: 'MECHANISM STAGE 3', placeholder: 'Stage 3: Illuminate — Dismantle the old illusion' },
      { id: 'm02_q7_stage4', section: 'Module 02 · Q6 Core Hook & Q7 Core Mechanism (Pages 8–9)', label: 'MECHANISM STAGE 4 (OPTIONAL)', placeholder: 'Stage 4: Formulate — Show the 3-step fix' },
      { id: 'm02_q7_stage5', section: 'Module 02 · Q6 Core Hook & Q7 Core Mechanism (Pages 8–9)', label: 'MECHANISM STAGE 5 (OPTIONAL)', placeholder: 'Stage 5: Transfer — Move momentum into one next action' },
      { id: 'm03_objection', section: 'Module 03 · Secondary Production Inputs (Page 13)', label: 'CORE OBJECTION — THE REAL REASON A QUALIFIED BUYER HESITATES (SAID ON CALL 3, NOT CALL 1)', placeholder: 'I do not have time to film videos every day or manage another complex ad funnel.', multiline: true },
      { id: 'm03_illusion', section: 'Module 03 · Secondary Production Inputs (Page 13)', label: 'CORE ILLUSION — THE INDUSTRY MYTH OR COMMON FIX THAT KEEPS THEM STUCK', placeholder: 'Hiring a $4k/mo agency to write vanilla posts or running cold traffic straight to a 60-minute booking page.', multiline: true },
      { id: 'm03_proof', section: 'Module 03 · Secondary Production Inputs (Page 13)', label: 'CORE PROOF — THE SINGLE STRONGEST PIECE OF EVIDENCE YOU OWN (NUMBER, CASE, DEMO, GUARANTEE)', placeholder: 'Signed 45 high-ticket clients in one month via 2-page Offer Doc without a single sales call.', multiline: true },
      { id: 'm03_documented_where', section: 'Module 03 · Secondary Production Inputs (Page 13)', label: 'WHERE EACH OF THESE IS CURRENTLY DOCUMENTED (SO WRITERS CAN FIND THEM WITHOUT ASKING)', placeholder: 'Market Concussion App — Module 02 & 03 Master Record' }
    ],
    rubric: [
      { criterion: 'TRANSFORMATION', weak: 'Names the service', acceptable: 'Describes an outcome', strong: 'Describes a specific identity or business change' },
      { criterion: 'TENSION', weak: 'Generic pain', acceptable: 'Recognizable pain', strong: 'Uses exact customer language, verbatim' },
      { criterion: 'SHIFT', weak: 'One vague claim', acceptable: 'Some verbs answered', strong: 'All five answered, at least two with numbers' },
      { criterion: 'BELIEF', weak: 'A company claim', acceptable: 'A useful idea', strong: 'Makes buying logically obvious once accepted' },
      { criterion: 'STORY', weak: 'Summarized', acceptable: 'Told with a result', strong: 'Told with tension, specifics, and a clear point' },
      { criterion: 'HOOK', weak: 'Descriptive', acceptable: 'Memorable', strong: 'Strangers repeat it back unprompted' },
      { criterion: 'MECHANISM', weak: 'Service steps', acceptable: 'A named process', strong: 'Memorable, defensible, easy to refer' }
    ]
  },

  // =========================================================================
  // LESSON 05 (W05 · MODULE 04: 20 STORY CANDIDATES)
  // =========================================================================
  {
    weekNumber: 5,
    code: 'L05',
    phase: 2,
    phaseName: 'PHASE 02 · RAW MATERIAL (WHAT YOU SAY IT WITH)',
    title: 'HARVEST THE STORY BANK',
    subtitle: 'Stories are the only content that never goes stale. This week is collection, not writing — quantity first.',
    lessonBullets: [
      'Six sources: origin moments, customer transformations, failures and what they taught, industry moments that made you angry, everyday jobs that went sideways, and things you changed your mind about.',
      'A usable story has tension. A job that went perfectly is not a story.',
      'You are hunting for twenty candidates, not eight finished pieces.'
    ],
    tasks: [
      'Set a timer for 45 minutes and list every story you can remember, one line each. Do not evaluate.',
      'Go through the last twelve months of jobs, projects, or clients and add any with tension.',
      'Ask two long-tenured people for the stories they tell when explaining the business.',
      'Score each candidate 1–5 on tension, on proof value, and on how easily you can tell it.'
    ],
    deliverable: 'A story bank list of 15–20 candidates with scores.',
    doneWhen: 'You have at least fifteen candidates and can name your top eight.',
    coachingPrompt: 'What story do you already tell on every sales call without meaning to? That is story one.',
    whereItFails: 'Only collecting flattering stories. The failures convert better.',
    moduleNumber: '04',
    moduleTitle: 'STORY BANK CAPTURE (ALL 20 CANDIDATE ROWS)',
    referenceFigures: [
      {
        figNumber: 'FIG. 08',
        title: 'THE CAPTURE PROCESS',
        cards: [
          { badge: '01 · CAPTURE', title: 'RUNNING LIST', body: 'The moment something happens — a call, a job, a complaint, an offhand remark — it goes into one running list. Two sentences is enough.' },
          { badge: '02 · LOG', title: 'NAME & TAG', body: 'Once a week, each entry gets a name and a tag: the belief it changes and the topic it belongs to.' },
          { badge: '03 · SHARPEN', title: 'THREE LENGTHS', body: 'Write the story to three lengths: 20 seconds, 90 seconds, 3 minutes — matching the three cuts. Same story, different resolution.' },
          { badge: '04 · ASSIGN', title: 'MATRIX LINK', body: 'Attach each story to specific videos in the matrix. A story with no assignment isn’t finished.' }
        ]
      },
      {
        figNumber: 'FIG. 09',
        title: 'A COMPLETED ENTRY — "THE FLOODED BASEMENT" (EXAMPLE · ROCK BOTTOM)',
        headers: ['FIELD', 'COMPLETED ENTRY'],
        rows: [
          ['BELIEF IT CHANGES', '"Cheapest bid" and "best value" are not the same number.'],
          ['THE TURN', 'A homeowner took a bid $4k under ours. Two winters later we pulled out the whole system and did it twice — at their cost, in February.'],
          ['TOPIC & ANGLE', 'Topic 2 · analytical, and again as aspirational'],
          ['ASSIGNED TO', 'Video 06 (Illuminate) · reel #14 · VSL dimension 06'],
          ['LENGTHS', '20s ✓ · 90s ✓ · 3 min drafted'],
          ['CLEARANCE', 'Anonymized — no street name, no photos of the house']
        ]
      }
    ],
    workedExample: {
      company: 'KEYSTONE BASEMENT SYSTEMS',
      title: 'TWO CAPTURED LINES (T/P/E SCORES)',
      items: [
        { label: '01 · 5/5/5', value: 'Flooded basement, night before a closing — we pumped it at 2am and found the real source was the neighbor’s regrade.' },
        { label: '02 · 4/5/2', value: 'Customer who had paid twice before us; needed permission and is still emotional about it.' }
      ]
    },
    fields: STORY_BANK_20_FIELDS
  },

  // =========================================================================
  // LESSON 06 (W06 · MODULE 05: FULL STORY RECORD — TOP 8 STORIES)
  // =========================================================================
  {
    weekNumber: 6,
    code: 'L06',
    phase: 2,
    phaseName: 'PHASE 02 · RAW MATERIAL (WHAT YOU SAY IT WITH)',
    title: 'SHAPE THE TOP EIGHT STORIES',
    subtitle: 'A raw memory is not usable content. Each story needs a fixed shape so it can be dropped into any video, email, or talk without rewriting.',
    lessonBullets: [
      'Every story gets the same five parts: the situation, the tension, the turn, the result, and the point.',
      'The point is what links the story to a messaging answer. A story with no point is an anecdote.',
      'One story can serve several points depending on where you stop.'
    ],
    tasks: [
      'Write your top eight stories in the five-part shape, 150–300 words each.',
      'Tag each story with the messaging answers it supports — belief, tension, shift, or proof.',
      'Mark which stories need permission, footage, photos, or a customer on camera.',
      'Put the bank somewhere the whole team can add to it.'
    ],
    deliverable: 'Eight written stories, tagged and stored in a shared location.',
    doneWhen: 'You can pull a story for any of the seven messaging answers in under a minute.',
    coachingPrompt: 'Which single story, if told well on camera, would do the most work for you?',
    whereItFails: 'Polishing stories into press releases. Keep the specific, awkward, human details.',
    moduleNumber: '05',
    moduleTitle: 'FULL STORY RECORD (EIGHT STORY SHEETS)',
    referenceFigures: [
      {
        figNumber: 'FIG. 10',
        title: 'WHAT EACH ENTRY RECORDS',
        headers: ['FIELD', 'WHAT GOES IN IT'],
        rows: [
          ['NAME', 'A short handle that is easy to say out loud — "the flooded basement," "the Tuesday callback."'],
          ['BELIEF IT CHANGES', 'The one thing a viewer thinks differently after hearing it. If you can’t name this, it’s an anecdote, not a story.'],
          ['THE TURN', 'The moment it goes wrong, and the moment it resolves. Drama plus overcoming.'],
          ['TOPIC & ANGLE', 'Which of the five topics it serves, and which angle it fits best.'],
          ['ASSIGNED TO', 'The specific videos, cuts, and VSL dimensions using it. Track reuse on purpose.'],
          ['CLEARANCE', 'Whether the customer approved being named, and any detail that has to change.']
        ]
      }
    ],
    fields: FULL_STORY_FIELDS
  },

  // =========================================================================
  // LESSON 07 (W07 · MODULE 06: 5x4 TOPIC MATRIX — ALL 20 VIDEO CELLS)
  // =========================================================================
  {
    weekNumber: 7,
    code: 'L07',
    phase: 2,
    phaseName: 'PHASE 02 · RAW MATERIAL (WHAT YOU SAY IT WITH)',
    title: 'FIVE TOPICS, TWENTY VIDEOS',
    subtitle: 'The matrix removes the question "what should I make this week" permanently. Five customer problems, four teaching angles, twenty titles.',
    lessonBullets: [
      'Pick the five biggest beliefs, problems, or misconceptions your ideal customer holds. One topic each.',
      'Teach every topic four ways: actionable (how), analytical (why), psychological (what stops people), aspirational (what becomes possible).',
      'Twenty cells, twenty long-form videos, decided once.'
    ],
    tasks: [
      'Name the five topics. Pull them from your Q2 and Q4 answers, not from keyword tools.',
      'Fill all twenty cells with actual working titles, not themes.',
      'Assign each title an angle and a story from the bank.',
      'Sequence the twenty by which would matter most to someone who knows nothing about you.'
    ],
    deliverable: 'A filled 5 × 4 matrix — twenty titles, each with an angle and a story attached.',
    doneWhen: 'Every cell has a title you could film tomorrow without further thinking.',
    coachingPrompt: 'Which of the twenty are you avoiding because it is hard to say? Move it earlier.',
    whereItFails: 'Writing topic labels instead of titles. "Pricing" is not a video; "Why the cheapest quote costs you the most" is.',
    moduleNumber: '06',
    moduleTitle: 'TOPIC MATRIX + ASSIGNMENTS (5 TOPICS × 4 ANGLES = 20 VIDEO CELLS)',
    referenceFigures: [
      {
        figNumber: 'FIG. 04',
        title: 'THE 25-VIDEO LIBRARY, AND THE SIX THAT CARRY AD SPEND',
        caption: 'The documentary (B1) plus one teaching video per topic (01, 05, 09, 13, 17) form the 6-video paid ad ladder. Everything else earns its way in by out-performing one of the six.',
        cards: [
          { badge: 'BRAND ASSETS (MADE ONCE)', title: 'B1 Documentary (Paid #1) · B2 Product · B3 Proof · B4 Ownership · B5 Expert Demos', body: 'B1 Documentary leads the paid sequence; B2–B5 build deep brand conviction.' },
          { badge: 'TEACHING LIBRARY (20 VIDEOS)', title: 'Videos 01–20 (One Per Week)', body: 'Videos 01, 05, 09, 13, 17 (one per topic) enter the paid sequence alongside B1 Documentary (6 total in paid sequence).' }
        ]
      }
    ],
    workedExample: {
      company: 'KEYSTONE BASEMENT SYSTEMS',
      title: 'ONE COMPLETED CELL',
      items: [
        { label: 'TITLE', value: 'Why the cheapest waterproofing quote is the one that costs you twice' },
        { label: 'ANGLE', value: 'Analytical — why' },
        { label: 'STORY', value: '#02, the customer who paid twice' },
        { label: 'BELIEF', value: 'Water is a water-management problem' },
        { label: 'OBJECTION', value: '"They all promise a lifetime warranty"' },
        { label: 'FUNNEL ROLE', value: 'Mid — sequence step 3' },
        { label: 'AD CANDIDATE', value: 'Yes' },
        { label: 'CTA', value: 'Shift magnet — the 9-point drainage audit' }
      ]
    },
    fields: TOPIC_MATRIX_20_CELLS
  },

  // =========================================================================
  // LESSON 08 (W08 · MODULE 07 & MODULE 08: S.H.I.F.T. SCRIPT SHEETS 1–3)
  // =========================================================================
  {
    weekNumber: 8,
    code: 'L08',
    phase: 2,
    phaseName: 'PHASE 02 · RAW MATERIAL (WHAT YOU SAY IT WITH)',
    title: 'LEARN S.H.I.F.T. · SCRIPT ONE VIDEO',
    subtitle: 'One structure runs every video in the library. Learning it once means you never stare at a blank page again.',
    isPhaseGate: true,
    lessonBullets: [
      'Signal — earn attention. Humanize — earn trust. Illuminate — reveal what they misunderstand. Formulate — show the better way. Transfer — one clear next action.',
      'The five stages never change. Only the language changes between video types.',
      'A script is the five stages with your messaging answers and one story dropped in.'
    ],
    tasks: [
      'Read the S.H.I.F.T. section and the five type-specific frameworks in the handoff manual.',
      'Pick the easiest of your twenty titles and script it fully against the five stages.',
      'Read it out loud with a timer. Cut anything that does not serve a stage.',
      'Script two more so you have a rhythm before production week.'
    ],
    deliverable: 'Three finished scripts and a reusable script template.',
    doneWhen: 'You can write a full script in under 90 minutes without agonizing over structure.',
    coachingPrompt: 'Where in your current sales conversation do you already run S.H.I.F.T. without realizing it?',
    whereItFails: 'Over-scripting. Write to the structure, then speak like a person.',
    moduleNumber: '07 & 08',
    moduleTitle: 'S.H.I.F.T. UNIVERSAL TO TYPE-SPECIFIC & SCRIPT SHEETS (3 SCRIPTS)',
    referenceFigures: [
      {
        figNumber: 'FIG. 05 & 06',
        title: 'WHERE THE THREE MINUTES GO & FIVE-TAKE PRODUCTION GUIDE',
        caption: 'Illuminate (0:30–1:45) and Formulate (1:45–3:00) are 40% of the runtime each. Hook and CTA together are under 15%.',
        headers: ['TAKE & STAGE', 'TIME', 'CAMERA & EDITING', 'VIBE'],
        rows: [
          ['TAKE 1 · S (Snag & Swear)', '0:00 – 0:15', 'Tight & direct: center frame, close-up. Fast text hooks on screen. No distractions.', 'High energy, disruptive'],
          ['TAKE 2 · H (Harness & Highlight)', '0:15 – 0:30', 'The pivot angle: shift camera 30°, or step back to medium shot. Pop-up graphic for comment word.', 'Conversational, settling in'],
          ['TAKE 3 · I (Illuminate the Illusion)', '0:30 – 1:45', 'The "real talk" shot: steady, slightly wider. Overlay B-roll and punch cuts to emphasize pain.', 'Empathetic but authoritative'],
          ['TAKE 4 · F (Formulate the Fix)', '1:45 – 3:00', 'The teaching angle: brand-new visual setting — whiteboard, desk, heavy graphics for the 3 steps.', 'Educational, clear, structured'],
          ['TAKE 5 · T (Trigger the Transfer)', '3:00 – 3:10', 'The urgent close-up: punch way back in. Center frame, pointing at camera or down at caption.', 'Urgent and directive']
        ]
      },
      {
        figNumber: 'FIG. 07 & MODULE 07',
        title: 'S.H.I.F.T. — UNIVERSAL TO TYPE-SPECIFIC BACKBONE (PAGE 28)',
        caption: 'One backbone, five expressions. Read down for the stage, across for the language that stage uses in each video type.',
        headers: ['STAGE', 'PURPOSE / QUESTION', 'DOC.', 'PRODUCT', 'PROOF', 'OWNER.', 'EXPERT'],
        rows: [
          ['S · SIGNAL', 'Earn attention (Why keep watching?)', 'Spark the story', 'See the future', 'Share the struggle', 'Start the experience', 'Snag & swear'],
          ['H · HUMANIZE', 'Earn trust (Why care/trust you?)', 'Humanize the mission', 'Highlight the gap', 'Highlight the hesitation', 'Humanize the handoff', 'Harness & highlight'],
          ['I · ILLUMINATE', 'Reframe (What have I misunderstood?)', 'Ignite the conflict', 'Introduce the mechanism', 'Identify the inflection', 'Illustrate the journey', 'Illuminate the illusion'],
          ['F · FORMULATE', 'Show the way (How does better path work?)', 'Forge the difference', 'Frame the journey', 'Finish the transformation', 'Fortify the trust', 'Formulate the fix'],
          ['T · TRANSFER', 'One action (What should I do now?)', 'Transfer the legacy', 'Take the first step', 'Tell them what’s possible', 'Take the next step', 'Trigger the transfer']
        ]
      }
    ],
    workedExample: {
      company: 'KEYSTONE BASEMENT SYSTEMS',
      title: 'SIGNAL, EXPERT DEMONSTRATION',
      items: [
        { label: '0:00–0:15 SIGNAL', value: '"If your sump pump runs after a dry week, you do not have a pump problem. In the next four minutes I am going to show you the two places that water is actually coming from — and which one you can check yourself tonight."' }
      ]
    },
    fields: [
      { id: 'm08_title', section: 'Script #01 · Full S.H.I.F.T. Script Sheet (Module 08)', label: 'SCRIPT #01 VIDEO TITLE', placeholder: 'We Analyzed 270 Client Posts: Why 90% of High-Reach Reels Generate $0.00' },
      { id: 'm08_type', section: 'Script #01 · Full S.H.I.F.T. Script Sheet (Module 08)', label: 'SCRIPT #01 TYPE (DOCUMENTARY / PRODUCT / PROOF / OWNERSHIP / EXPERT)', placeholder: 'Expert Demonstration' },
      { id: 'm08_story', section: 'Script #01 · Full S.H.I.F.T. Script Sheet (Module 08)', label: 'SCRIPT #01 STORY PULLED FROM THE BANK', placeholder: 'Story #01 — The $150k Funnel Shutoff' },
      { id: 'm08_messaging', section: 'Script #01 · Full S.H.I.F.T. Script Sheet (Module 08)', label: 'SCRIPT #01 MESSAGING ANSWERS USED (INCLUDE OBJECTION & ILLUSION)', placeholder: 'Q1 Transformation, Q4 Core Belief, Core Illusion' },
      { id: 'm08_signal', section: 'Script #01 · Full S.H.I.F.T. Script Sheet (Module 08)', label: 'S · SIGNAL (0:00–0:15) — EARN ATTENTION IN THE FIRST FIFTEEN SECONDS', placeholder: 'Tight & direct close-up hook...', multiline: true },
      { id: 'm08_humanize', section: 'Script #01 · Full S.H.I.F.T. Script Sheet (Module 08)', label: 'H · HUMANIZE (0:15–0:30) — EARN TRUST AND RELEVANCE', placeholder: 'Pivot angle 30°, conversational credibility...', multiline: true },
      { id: 'm08_illuminate', section: 'Script #01 · Full S.H.I.F.T. Script Sheet (Module 08)', label: 'I · ILLUMINATE (0:30–1:45) — REVEAL WHAT THEY HAVE MISUNDERSTOOD (40% RUNTIME)', placeholder: 'Dismantle the Core Illusion with story & data...', multiline: true },
      { id: 'm08_formulate', section: 'Script #01 · Full S.H.I.F.T. Script Sheet (Module 08)', label: 'F · FORMULATE (1:45–3:00) — THE BETTER WAY, IN STEPS (40% RUNTIME)', placeholder: 'Step 1, Step 2, Step 3 on whiteboard/desk...', multiline: true },
      { id: 'm08_transfer', section: 'Script #01 · Full S.H.I.F.T. Script Sheet (Module 08)', label: 'T · TRANSFER (3:00–3:10) — ONE CLEAR NEXT ACTION', placeholder: 'Comment "AUDIT" and I’ll DM you the 3-Step Pipeline Equity Checklist.', multiline: true },

      { id: 'm08_s2_meta', section: 'Script #02 · S.H.I.F.T. Script Sheet (Module 08)', label: 'SCRIPT #02 VIDEO TITLE · TYPE · STORY USED · MESSAGING ANSWERS', placeholder: 'Video #02 Title | Expert | Story #02 | Messaging Answers' },
      { id: 'm08_s2_shift', section: 'Script #02 · S.H.I.F.T. Script Sheet (Module 08)', label: 'SCRIPT #02 FULL S.H.I.F.T. SCRIPT (SIGNAL · HUMANIZE · ILLUMINATE · FORMULATE · TRANSFER)', placeholder: 'Draft S, H, I, F, T sections for Script #02...', multiline: true },

      { id: 'm08_s3_meta', section: 'Script #03 · S.H.I.F.T. Script Sheet (Module 08)', label: 'SCRIPT #03 VIDEO TITLE · TYPE · STORY USED · MESSAGING ANSWERS', placeholder: 'Video #03 Title | Expert | Story #03 | Messaging Answers' },
      { id: 'm08_s3_shift', section: 'Script #03 · S.H.I.F.T. Script Sheet (Module 08)', label: 'SCRIPT #03 FULL S.H.I.F.T. SCRIPT (SIGNAL · HUMANIZE · ILLUMINATE · FORMULATE · TRANSFER)', placeholder: 'Draft S, H, I, F, T sections for Script #03...', multiline: true }
    ]
  },

  // =========================================================================
  // LESSON 09 (W09 · MODULE 09: PRODUCTION SETUP — ALL 22 PDF FIELDS)
  // =========================================================================
  {
    weekNumber: 9,
    code: 'L09',
    phase: 3,
    phaseName: 'PHASE 03 · PRODUCTION (BUILDING THE LIBRARY)',
    title: 'PRODUCTION SETUP',
    subtitle: 'Production friction is the single biggest cause of abandonment. Solve it once and the next ten weeks get easy.',
    lessonBullets: [
      'You need one location, one lighting setup, one audio solution, and a repeatable routine. Nothing more.',
      'Batching is non-negotiable — you will film five to eight pieces per session, not one.',
      'Good audio beats good video. Fix sound first.'
    ],
    tasks: [
      'Choose and set up one filming location that can stay set up.',
      'Test lighting and audio, and record a two-minute sample. Watch it back.',
      'Decide who edits, on what turnaround, and where the files live.',
      'Book the next ten filming sessions in the calendar now, before anything else can claim the time.'
    ],
    deliverable: 'A permanent filming setup and ten booked sessions.',
    doneWhen: 'You can walk in, press record, and be filming within five minutes.',
    coachingPrompt: 'What is the one thing that will make you skip a filming day? Remove it this week.',
    whereItFails: 'Buying gear instead of booking sessions. Constraint produces volume; equipment does not.',
    moduleNumber: '09',
    moduleTitle: 'PRODUCTION SETUP & TEN BOOKED FILMING DATES (PAGES 32–33)',
    fields: [
      { id: 'm09_location', section: 'Module 09 · Permanent Studio & Workflow Setup', label: 'FILMING LOCATION', placeholder: 'Office corner studio' },
      { id: 'm09_stay_setup', section: 'Module 09 · Permanent Studio & Workflow Setup', label: 'CAN IT STAY SET UP? (YES / NO — IF NO, WHAT IS THE 5-MINUTE SETUP ROUTINE)', placeholder: 'Yes — stays permanently set up with key light + mic arm' },
      { id: 'm09_camera', section: 'Module 09 · Permanent Studio & Workflow Setup', label: 'CAMERA + SETTINGS', placeholder: 'Sony ZV-E10 / iPhone 16 Pro · 4K 24fps' },
      { id: 'm09_audio', section: 'Module 09 · Permanent Studio & Workflow Setup', label: 'AUDIO SOLUTION', placeholder: 'DJI Mic 2 / Shure MV7' },
      { id: 'm09_audio_test', section: 'Module 09 · Permanent Studio & Workflow Setup', label: 'AUDIO TEST RESULT (LISTEN BACK ON PHONE SPEAKERS, NOT HEADPHONES)', placeholder: 'Tested clean and loud on iPhone speakers with zero room echo' },
      { id: 'm09_lighting', section: 'Module 09 · Permanent Studio & Workflow Setup', label: 'LIGHTING SETUP — DESCRIBE OR SKETCH SO ANYONE CAN REBUILD IT', placeholder: 'Key light at 45° camera left (65% brightness, 5600K), subtle tube hair light behind...', multiline: true },
      { id: 'm09_naming', section: 'Module 09 · Permanent Studio & Workflow Setup', label: 'FILE NAMING STANDARD', placeholder: 'e.g. MCM-EXP-014-v2' },
      { id: 'm09_storage_raw', section: 'Module 09 · Permanent Studio & Workflow Setup', label: 'STORAGE LOCATION — RAW', placeholder: 'Google Drive / 01_RAW_FOOTAGE' },
      { id: 'm09_storage_finals', section: 'Module 09 · Permanent Studio & Workflow Setup', label: 'STORAGE LOCATION — FINALS', placeholder: 'Google Drive / 02_FINALS_READY' },
      { id: 'm09_editor', section: 'Module 09 · Permanent Studio & Workflow Setup', label: 'EDITOR', placeholder: 'Name of editor / ops lead' },
      { id: 'm09_sla', section: 'Module 09 · Permanent Studio & Workflow Setup', label: 'TURNAROUND SLA (DAYS FROM FOOTAGE DELIVERED TO ROUGH CUT)', placeholder: '72 hours from raw upload to rough cut' },
      { id: 'm09_backup', section: 'Module 09 · Permanent Studio & Workflow Setup', label: 'BACKUP PLAN WHEN THE SHOOT DAY FAILS', placeholder: 'Saturday 9:00 AM makeup slot permanently blocked on calendar' },
      ...Array.from({ length: 10 }, (_, idx) => {
        const dNum = String(idx + 1).padStart(2, '0');
        return {
          id: `m09_date_${dNum}`,
          section: 'Ten Booked Filming Dates (Must Be Accepted in Shared Calendar)',
          label: `FILMING SESSION ${dNum} — DATE + WHAT GETS FILMED`,
          placeholder: `Session ${dNum}: Date & Time + Batch of videos being filmed`
        };
      })
    ]
  },

  // =========================================================================
  // LESSON 10 (W10 · MODULES 08, 10, 11, 12, 13A: BRAND DOCUMENTARY B1)
  // =========================================================================
  {
    weekNumber: 10,
    code: 'L10',
    phase: 3,
    phaseName: 'PHASE 03 · PRODUCTION (BUILDING THE LIBRARY)',
    title: 'FILM THE BRAND DOCUMENTARY (B1)',
    subtitle: 'The documentary earns emotional trust and does work no other asset can. It is also the hardest, so it goes first while energy is high.',
    lessonBullets: [
      'Structure: spark the story, humanize the mission, ignite the conflict, forge the difference, transfer the legacy.',
      'Do not flinch from the drama. If a painful episode pushed you into this work, that is the film.',
      'Introduce the people and what each of them protects.'
    ],
    tasks: [
      'Script against the documentary framework using your Core Story.',
      'Film the founder interview, the team pieces, and enough b-roll of real work.',
      'Cut to 4–8 minutes. Resist making it longer.',
      'Show it to three customers before publishing and note where attention drops.'
    ],
    deliverable: 'One finished brand documentary.',
    doneWhen: 'Someone who has never heard of you watches it through and can say why you exist.',
    coachingPrompt: 'What is the moment in your history you would rather not talk about? That is probably the opening.',
    whereItFails: 'Making a corporate overview. If it could be any company in your industry, start over.',
    moduleNumber: '10 · 11 · 12 · 13A',
    moduleTitle: 'SHOOT BRIEF, EDITING QA, PUBLISHING QA & DOCUMENTARY QUALITY STANDARD',
    editingQaChecklist: EDITING_QA_CHECKLIST,
    fields: buildProductionModulesFields('l10_doc', 'B1 Brand Documentary'),
    rubric: [
      { criterion: 'OPENING', weak: 'Company history in order', acceptable: 'Starts on a moment', strong: 'Starts on the moment you would rather not discuss' },
      { criterion: 'STAKES', weak: 'States values', acceptable: 'Names what is at risk', strong: 'The viewer feels what would be lost' },
      { criterion: 'PEOPLE', weak: 'Founder only', acceptable: 'Founder + a name or two', strong: 'Each person shown owns something specific' },
      { criterion: 'SPECIFICITY', weak: 'Could be any company', acceptable: 'Industry-specific', strong: 'Could only be this company' },
      { criterion: 'LENGTH', weak: 'Over 10 min', acceptable: '6–8 min', strong: '4–8 min with no section you could cut' }
    ]
  },

  // =========================================================================
  // LESSON 11 (W11 · REUSE MODULES 08, 10, 11, 12: PRODUCT / SERVICE VIDEO B2)
  // =========================================================================
  {
    weekNumber: 11,
    code: 'L11',
    phase: 3,
    phaseName: 'PHASE 03 · PRODUCTION (BUILDING THE LIBRARY)',
    title: 'FILM THE PRODUCT OR SERVICE VIDEO (B2)',
    subtitle: 'This is the dream builder — the outcome first, the mechanism second. It carries most of your paid distribution.',
    isReuse: true,
    reuseNote: 'Reuse Module 08 (script sheet), 10 (shoot brief), 11 (editing QA), 12 (publishing QA).',
    lessonBullets: [
      'Structure: see the future, highlight the gap, introduce the mechanism, frame the journey, take the first step.',
      'Lead with what life looks like after. The process is proof, not the pitch.',
      'Your named mechanism from Q7 lives here.'
    ],
    tasks: [
      'Script against the product framework using Core Transformation and Core Shift.',
      'Film the outcome first — real results, real customers, real installations or deliverables.',
      'Film the process walkthrough as the supporting middle.',
      'Cut to 3–6 minutes with one clear next step at the end.'
    ],
    deliverable: 'One finished product or service video.',
    doneWhen: 'A viewer can describe the outcome you produce and roughly how you produce it.',
    coachingPrompt: 'Are you describing features that only matter to you? Cut them and say what changes for them.',
    whereItFails: 'Opening with your process. Nobody cares how it works until they want what it produces.',
    moduleNumber: '08 · 10 · 11 · 12',
    moduleTitle: 'PRODUCT / SERVICE VIDEO (B2) — SCRIPT, SHOOT BRIEF, EDITING & PUBLISHING QA',
    editingQaChecklist: EDITING_QA_CHECKLIST,
    fields: buildProductionModulesFields('l11_prod', 'B2 Product / Service Video')
  },

  // =========================================================================
  // LESSON 12 (W12 · REUSE MODULES 08, 10, 11, 12 + 13B: PROOF VIDEO B3)
  // =========================================================================
  {
    weekNumber: 12,
    code: 'L12',
    phase: 3,
    phaseName: 'PHASE 03 · PRODUCTION (BUILDING THE LIBRARY)',
    title: 'FILM THE PROOF VIDEO (B3)',
    subtitle: 'Credibility transfers through a believable transformation told by someone other than you.',
    isReuse: true,
    reuseNote: 'Reuse Module 08 (script sheet), 10 (shoot brief), 11 (editing QA), 12 (publishing QA) + Module 13B Proof Video Quality Standard.',
    lessonBullets: [
      'Structure: share the struggle, highlight the hesitation, identify the inflection point, finish the transformation, tell them what is possible.',
      'The hesitation section is what makes it believable. Ask what nearly stopped them from buying.',
      'Testimonial, case study, or narrated project walkthrough — pick whichever you can actually film this week.'
    ],
    tasks: [
      'Choose two customers whose situation matches your ideal prospect.',
      'Send questions in advance built on the five stages. Do not send a script.',
      'Film both, plus before-and-after evidence.',
      'Cut one strong 3–5 minute piece rather than two weak ones.'
    ],
    deliverable: 'At least one finished proof video with real numbers or visible before-and-after.',
    doneWhen: 'A skeptical prospect could watch it and recognize their own situation.',
    coachingPrompt: 'Which objection does this customer answer just by existing? Feature that.',
    whereItFails: 'Editing out the doubts. The hesitation is the credibility.',
    moduleNumber: '08 · 10 · 11 · 12 · 13B',
    moduleTitle: 'PROOF VIDEO (B3) — SCRIPT, SHOOT BRIEF, QA & MODULE 13B QUALITY STANDARD',
    editingQaChecklist: EDITING_QA_CHECKLIST,
    fields: buildProductionModulesFields('l12_proof', 'B3 Proof & Case Study Video'),
    rubric: [
      { criterion: 'SITUATION', weak: 'Customer praises you', acceptable: 'Problem stated', strong: 'Problem stated in the customer’s own words' },
      { criterion: 'HESITATION', weak: 'Edited out', acceptable: 'Mentioned', strong: 'The near-miss reason they almost did not buy' },
      { criterion: 'EVIDENCE', weak: 'Adjectives', acceptable: 'A number', strong: 'Before-and-after visible plus a number' },
      { criterion: 'OBJECTION', weak: 'Unaddressed', acceptable: 'Touched on', strong: 'Directly answers the Core Objection from module 03' },
      { criterion: 'MATCH', weak: 'Any customer', acceptable: 'Similar customer', strong: 'Mirrors the ideal prospect closely enough to be uncomfortable' }
    ]
  },

  // =========================================================================
  // LESSON 13 (W13 · REUSE MODULES 08, 10, 11, 12: OWNERSHIP EXPERIENCE B4)
  // =========================================================================
  {
    weekNumber: 13,
    code: 'L13',
    phase: 3,
    phaseName: 'PHASE 03 · PRODUCTION (BUILDING THE LIBRARY)',
    title: 'FILM THE OWNERSHIP EXPERIENCE VIDEO (B4)',
    subtitle: 'Almost nobody in your market makes this. It removes the fear of what happens after they say yes.',
    isReuse: true,
    reuseNote: 'Reuse Modules 08, 10, 11, 12.',
    lessonBullets: [
      'Structure: start the experience, humanize the handoff, illustrate the journey, fortify the trust, take the next step.',
      'Be specific with names and timeframes. "Dana calls you within the hour" beats "great communication".',
      'Address the unspoken worries — delays, quality, surprises, who to call.'
    ],
    tasks: [
      'Map every touchpoint from the moment someone says yes to completion.',
      'Film the actual people at the actual moments, in order.',
      'Include what happens when something goes wrong, and how you handle it.',
      'Cut to 3–5 minutes.'
    ],
    deliverable: 'One finished ownership experience video.',
    doneWhen: 'A prospect can picture the first week of working with you in specific detail.',
    coachingPrompt: 'What do customers most often say they were nervous about beforehand? Answer it on camera.',
    whereItFails: 'Generic promises. Specificity is the entire value of this asset.',
    moduleNumber: '08 · 10 · 11 · 12',
    moduleTitle: 'OWNERSHIP EXPERIENCE VIDEO (B4) — SCRIPT, SHOOT BRIEF, EDITING & PUBLISHING QA',
    editingQaChecklist: EDITING_QA_CHECKLIST,
    fields: buildProductionModulesFields('l13_owner', 'B4 Ownership Experience Video')
  },

  // =========================================================================
  // LESSON 14 (W14 · EXPERT DEMONSTRATIONS BATCH ONE — VIDEOS 01–05)
  // =========================================================================
  {
    weekNumber: 14,
    code: 'L14',
    phase: 3,
    phaseName: 'PHASE 03 · PRODUCTION (BUILDING THE LIBRARY)',
    title: 'EXPERT DEMONSTRATIONS · BATCH ONE (VIDEOS 01–05)',
    subtitle: 'The teaching library begins. Five videos per week for four weeks fills the matrix.',
    isReuse: true,
    reuseNote: 'Reuse Modules 08, 10, 11, 12 — five times.',
    lessonBullets: [
      'Structure: snag and swear, harness and highlight, illuminate the illusion, formulate the fix, trigger the transfer.',
      'Give away your best thinking. The reaction you want is: if this is free, what is it like to hire them?',
      'One video answers exactly one question. Do not bundle.'
    ],
    tasks: [
      'Script five matrix titles against the expert demonstration framework.',
      'Film all five in one session.',
      'Publish the first one before the batch is fully edited — momentum over polish.',
      'Log which story from the bank each one used.'
    ],
    deliverable: 'Five long-form teaching videos, filmed.',
    doneWhen: 'Five of your twenty matrix cells are struck through.',
    coachingPrompt: 'Which question do you answer on every sales call? Film that one first.',
    whereItFails: 'Withholding the answer to create curiosity. Teach fully; that is the whole strategy.',
    moduleNumber: '08 · 10 · 11 · 12 (×5)',
    moduleTitle: 'EXPERT DEMONSTRATIONS BATCH ONE (VIDEOS 01–05 SCRIPTS, SHOOT BRIEF & QA)',
    editingQaChecklist: EDITING_QA_CHECKLIST,
    fields: [
      ...([1, 2, 3, 4, 5] as const).map(vNum => ({
        id: `l14_v0${vNum}_script`,
        section: `Batch 1 · Five Expert Video S.H.I.F.T. Scripts (Videos 01–05)`,
        label: `MATRIX VIDEO #0${vNum} — TITLE · STORY USED · S.H.I.F.T. SCRIPT & PUBLISHED URL`,
        placeholder: `Video #0${vNum} Title | Story # | S (0–15s) · H (15–30s) · I (30–1:45) · F (1:45–3:00) · T (3:00–3:10) | Published URL`,
        multiline: true
      })),
      ...buildProductionModulesFields('l14_batch1', 'Batch 1 Expert Demos (Videos 01–05)')
    ]
  },

  // =========================================================================
  // LESSON 15 (W15 · EXPERT DEMONSTRATIONS BATCH TWO — VIDEOS 06–10)
  // =========================================================================
  {
    weekNumber: 15,
    code: 'L15',
    phase: 3,
    phaseName: 'PHASE 03 · PRODUCTION (BUILDING THE LIBRARY)',
    title: 'EXPERT DEMONSTRATIONS · BATCH TWO (VIDEOS 06–10)',
    subtitle: 'Second batch. This is where the routine either becomes real or quietly dies.',
    isReuse: true,
    reuseNote: 'Reuse Modules 08, 10, 11, 12 — five times.',
    lessonBullets: [
      'By now the script template should cut prep time roughly in half.',
      'Watch batch one back before filming and fix one specific thing — pace, energy, or opening.',
      'Do not restart earlier videos. Improve forward.'
    ],
    tasks: [
      'Script and film the next five matrix titles.',
      'Review batch one and write down the single habit to change.',
      'Confirm edits from batch one are published, not sitting in a folder.',
      'Update the matrix so progress is visible.'
    ],
    deliverable: 'Ten of twenty teaching videos filmed.',
    doneWhen: 'You are halfway through the matrix and filming feels routine.',
    coachingPrompt: 'What took the longest this week? Systematize or delegate it before batch three.',
    whereItFails: 'Re-shooting early videos. Nobody is comparing them; you are.',
    moduleNumber: '08 · 10 · 11 · 12 (×5)',
    moduleTitle: 'EXPERT DEMONSTRATIONS BATCH TWO (VIDEOS 06–10 SCRIPTS, SHOOT BRIEF & QA)',
    editingQaChecklist: EDITING_QA_CHECKLIST,
    fields: [
      { id: 'w15_habit', section: 'Batch 1 Review & Improvement Forward', label: 'SINGLE HABIT TO CHANGE AFTER WATCHING BATCH ONE BACK (PACE, ENERGY, OR OPENING)', placeholder: 'Cut the 10-second throat-clearing intro and start right inside the tension.' },
      ...([6, 7, 8, 9, 10] as const).map(vNum => ({
        id: `l15_v${String(vNum).padStart(2, '0')}_script`,
        section: `Batch 2 · Five Expert Video S.H.I.F.T. Scripts (Videos 06–10)`,
        label: `MATRIX VIDEO #${String(vNum).padStart(2, '0')} — TITLE · STORY USED · S.H.I.F.T. SCRIPT & PUBLISHED URL`,
        placeholder: `Video #${String(vNum).padStart(2, '0')} Title | Story # | S · H · I · F · T Script | Published URL`,
        multiline: true
      })),
      ...buildProductionModulesFields('l15_batch2', 'Batch 2 Expert Demos (Videos 06–10)')
    ]
  },

  // =========================================================================
  // LESSON 16 (W16 · EXPERT DEMONSTRATIONS BATCH THREE — VIDEOS 11–15)
  // =========================================================================
  {
    weekNumber: 16,
    code: 'L16',
    phase: 3,
    phaseName: 'PHASE 03 · PRODUCTION (BUILDING THE LIBRARY)',
    title: 'EXPERT DEMONSTRATIONS · BATCH THREE (VIDEOS 11–15)',
    subtitle: 'The middle of a long build. Nothing new to learn — just execution.',
    isReuse: true,
    reuseNote: 'Reuse Modules 08, 10, 11, 12 — five times.',
    lessonBullets: [
      'Consistency is now worth more than improvement.',
      'If a title from the matrix no longer feels right, replace it rather than skipping the slot.',
      'Keep a running list of new questions customers ask — that is next quarter’s matrix.'
    ],
    tasks: [
      'Script and film the next five matrix titles.',
      'Add any new customer questions to a "next matrix" list.',
      'Check that every filmed video has been published or scheduled.',
      'Note your accumulated library minutes.'
    ],
    deliverable: 'Fifteen of twenty teaching videos filmed.',
    doneWhen: 'Fifteen cells struck through and nothing sitting unedited for more than two weeks.',
    coachingPrompt: 'How many minutes of you can a prospect now consume? Compare it to week one.',
    whereItFails: 'Letting edits pile up. Unpublished footage is worth nothing.',
    moduleNumber: '08 · 10 · 11 · 12 (×5)',
    moduleTitle: 'EXPERT DEMONSTRATIONS BATCH THREE (VIDEOS 11–15 SCRIPTS, SHOOT BRIEF & QA)',
    editingQaChecklist: EDITING_QA_CHECKLIST,
    fields: [
      { id: 'w16_minutes', section: 'Accumulated Library Audit & Next Quarter Question Bank', label: 'ACCUMULATED LIBRARY MINUTES AVAILABLE NOW (COMPARE TO LESSON 01)', placeholder: 'e.g. 245 minutes live vs. 9 minutes in Lesson 01' },
      { id: 'w16_next_matrix_questions', section: 'Accumulated Library Audit & Next Quarter Question Bank', label: 'RUNNING LIST OF NEW QUESTIONS CUSTOMERS ASK (NEXT QUARTER’S MATRIX)', placeholder: 'List new customer questions...', multiline: true },
      ...([11, 12, 13, 14, 15] as const).map(vNum => ({
        id: `l16_v${vNum}_script`,
        section: `Batch 3 · Five Expert Video S.H.I.F.T. Scripts (Videos 11–15)`,
        label: `MATRIX VIDEO #${vNum} — TITLE · STORY USED · S.H.I.F.T. SCRIPT & PUBLISHED URL`,
        placeholder: `Video #${vNum} Title | Story # | S · H · I · F · T Script | Published URL`,
        multiline: true
      })),
      ...buildProductionModulesFields('l16_batch3', 'Batch 3 Expert Demos (Videos 11–15)')
    ]
  },

  // =========================================================================
  // LESSON 17 (W17 · EXPERT DEMONSTRATIONS BATCH FOUR — VIDEOS 16–20)
  // =========================================================================
  {
    weekNumber: 17,
    code: 'L17',
    phase: 3,
    phaseName: 'PHASE 03 · PRODUCTION (BUILDING THE LIBRARY)',
    title: 'EXPERT DEMONSTRATIONS · BATCH FOUR (VIDEOS 16–20)',
    subtitle: 'The library closes. This is the week the asset actually exists.',
    isReuse: true,
    reuseNote: 'Reuse Modules 08, 10, 11, 12 — five times.',
    lessonBullets: [
      'After this batch you have twenty-five videos — five brand assets and twenty teaching pieces.',
      'That is roughly five hours of consumable content, most of the seven-hour benchmark.',
      'Everything after this week is distribution, not production.'
    ],
    tasks: [
      'Script and film the final five matrix titles.',
      'Confirm all twenty-five videos are published and reachable in one place.',
      'Total the runtime. Write the number next to your week-one audit number.',
      'Archive all raw footage properly — it feeds short form for a year.'
    ],
    deliverable: 'A complete library of twenty-five published videos.',
    doneWhen: 'Every matrix cell is struck through and the full library is live somewhere a stranger can find it.',
    coachingPrompt: 'What does your week-one audit number look like next to today’s?',
    whereItFails: 'Celebrating and stopping. The library is the halfway point, not the finish.',
    moduleNumber: '08 · 10 · 11 · 12 (×5)',
    moduleTitle: 'EXPERT DEMONSTRATIONS BATCH FOUR (VIDEOS 16–20 & 25-VIDEO LIBRARY AUDIT)',
    editingQaChecklist: EDITING_QA_CHECKLIST,
    fields: [
      { id: 'w17_total_runtime', section: '25-Video Library Completion Audit', label: 'TOTAL 25-VIDEO LIBRARY RUNTIME NEXT TO LESSON 01 AUDIT NUMBER', placeholder: '318 minutes live across 25 videos (vs. 9 minutes in Lesson 01)' },
      { id: 'w17_playlist_url', section: '25-Video Library Completion Audit', label: 'MASTER LIBRARY PUBLIC LOCATION / PLAYLIST URL & RAW ARCHIVE LOCATION', placeholder: 'https://youtube.com/playlist?list=... · Raw archive in Google Drive' },
      ...([16, 17, 18, 19, 20] as const).map(vNum => ({
        id: `l17_v${vNum}_script`,
        section: `Batch 4 · Final Five Expert Video S.H.I.F.T. Scripts (Videos 16–20)`,
        label: `MATRIX VIDEO #${vNum} — TITLE · STORY USED · S.H.I.F.T. SCRIPT & PUBLISHED URL`,
        placeholder: `Video #${vNum} Title | Story # | S · H · I · F · T Script | Published URL`,
        multiline: true
      })),
      ...buildProductionModulesFields('l17_batch4', 'Batch 4 Expert Demos (Videos 16–20)')
    ]
  },

  // =========================================================================
  // LESSON 18 (W18 · MODULE 18: VSL — ALL 13 INDIVIDUAL DIMENSIONS + FIG 17 & 18)
  // =========================================================================
  {
    weekNumber: 18,
    code: 'L18',
    phase: 3,
    phaseName: 'PHASE 03 · PRODUCTION (BUILDING THE LIBRARY)',
    title: 'BUILD THE VSL (13 DIMENSIONS)',
    subtitle: 'The second CTA needs somewhere to send people who are ready now. A VSL is a complete argument, not a longer ad.',
    isPhaseGate: true,
    lessonBullets: [
      'Thirteen dimensions in order: hook, big problem, founder story, discovery, unique mechanism, why others fail, your solution, proof, process, ownership experience, objections, future vision, CTA.',
      'You already have raw material for eleven of the thirteen from the library and the story bank.',
      'Length follows the dimensions, not a target runtime.'
    ],
    tasks: [
      'Draft all thirteen dimensions, pulling directly from existing scripts and stories.',
      'Read it aloud end to end and cut anything that repeats a previous dimension.',
      'Film and publish it on a page you control, not a social feed.',
      'Write the one action the CTA asks for. One only.'
    ],
    deliverable: 'A finished VSL on a page you control.',
    doneWhen: 'Someone who watches it end to end knows the problem, the mechanism, the proof, and exactly what to do next.',
    coachingPrompt: 'Which dimension is weakest? That is usually proof — go get more.',
    whereItFails: 'Skipping objection handling. It is where most VSLs lose the ready buyer.',
    moduleNumber: '18',
    moduleTitle: 'VSL — THIRTEEN DIMENSIONS BUILDER (PAGES 46–49)',
    referenceFigures: [
      {
        figNumber: 'FIG. 17 & FIG. 18',
        title: 'WHERE THE MINUTES GO IN A VSL (~12:40) & 13-DIMENSION REFERENCE TABLE',
        caption: 'Proof (Dimension 08), Process (09), and the Mechanism Trio (05–07) carry more than half the runtime — the pitch itself is a thin slice.',
        headers: ['#', 'DIMENSION', 'CORE QUESTION', 'PURPOSE', 'TARGET LENGTH'],
        rows: [
          ['01', 'HOOK', 'Why should I pay attention?', 'Interrupt attention and create curiosity.', '5–15 sec'],
          ['02', 'BIG PROBLEM', 'What problem am I facing?', 'Agitate the pain and establish relevance.', '15–45 sec'],
          ['03', 'FOUNDER STORY', 'Why should I trust you?', 'Humanize the brand and build connection.', '30–90 sec'],
          ['04', 'DISCOVERY', 'What changed your thinking?', 'Reveal the insight that led to your approach.', '20–60 sec'],
          ['05', 'UNIQUE MECHANISM', 'Why does your solution work differently?', 'Differentiate from commoditized alternatives.', '30–90 sec'],
          ['06', 'WHY OTHERS FAIL', 'Why haven’t traditional methods worked?', 'Remove belief in alternatives and reframe the problem.', '30–90 sec'],
          ['07', 'YOUR SOLUTION', 'What do you actually do?', 'Introduce the offer and the transformation it provides.', '45–120 sec'],
          ['08', 'PROOF (BIGGEST BLOCK)', 'Can you prove it?', 'Build credibility with testimonials, case studies, data, demos.', '45–180 sec'],
          ['09', 'PROCESS', 'How does it work?', 'Reduce uncertainty by explaining the customer journey.', '45–120 sec'],
          ['10', 'OWNERSHIP EXPERIENCE', 'What is it like to work with you?', 'Set expectations and reduce perceived risk.', '30–90 sec'],
          ['11', 'OBJECTION HANDLING', 'What’s stopping me?', 'Address concerns before they harden into objections.', '30–120 sec'],
          ['12', 'FUTURE VISION', 'What happens if I say yes?', 'Let them imagine the outcome and the identity shift.', '30–90 sec'],
          ['13', 'STRONG CTA', 'What should I do next?', 'Give one clear, friction-free next step.', '15–45 sec']
        ]
      }
    ],
    fields: [
      { id: 'm18_d01_hook', section: 'Module 18 · Thirteen VSL Dimensions (Draft Each Before Full Script)', label: '01 · HOOK — WHY SHOULD I PAY ATTENTION? (5–15 SEC)', placeholder: 'Interrupt attention and name a moment they had this week...', multiline: true },
      { id: 'm18_d02_problem', section: 'Module 18 · Thirteen VSL Dimensions (Draft Each Before Full Script)', label: '02 · BIG PROBLEM — WHAT AM I FACING? (15–45 SEC)', placeholder: 'Agitate the pain using Q2 Core Tension...', multiline: true },
      { id: 'm18_d03_founder', section: 'Module 18 · Thirteen VSL Dimensions (Draft Each Before Full Script)', label: '03 · FOUNDER STORY — WHY TRUST YOU? (30–90 SEC)', placeholder: 'Humanize the brand and build connection...', multiline: true },
      { id: 'm18_d04_discovery', section: 'Module 18 · Thirteen VSL Dimensions (Draft Each Before Full Script)', label: '04 · DISCOVERY — WHAT CHANGED YOUR THINKING? (20–60 SEC)', placeholder: 'Reveal the insight that led to your approach...', multiline: true },
      { id: 'm18_d05_mechanism', section: 'Module 18 · Thirteen VSL Dimensions (Draft Each Before Full Script)', label: '05 · UNIQUE MECHANISM — WHY DOES THIS WORK DIFFERENTLY? (30–90 SEC)', placeholder: 'Your named process from Q7...', multiline: true },
      { id: 'm18_d06_why_fail', section: 'Module 18 · Thirteen VSL Dimensions (Draft Each Before Full Script)', label: '06 · WHY OTHER SOLUTIONS FAIL (30–90 SEC)', placeholder: 'Dismantle the Core Illusion from Module 03...', multiline: true },
      { id: 'm18_d07_solution', section: 'Module 18 · Thirteen VSL Dimensions (Draft Each Before Full Script)', label: '07 · YOUR SOLUTION — WHAT DO YOU ACTUALLY DO? (45–120 SEC)', placeholder: 'Introduce the offer and the Q1/Q3 transformation...', multiline: true },
      { id: 'm18_d08_proof', section: 'Module 18 · Thirteen VSL Dimensions (Draft Each Before Full Script)', label: '08 · PROOF — CAN YOU PROVE IT? (45–180 SEC · SINGLE BIGGEST BLOCK)', placeholder: 'Testimonials, case studies, data, demonstrations...', multiline: true },
      { id: 'm18_d09_process', section: 'Module 18 · Thirteen VSL Dimensions (Draft Each Before Full Script)', label: '09 · PROCESS — HOW DOES IT WORK? (45–120 SEC)', placeholder: 'Walk through the stages of your customer journey...', multiline: true },
      { id: 'm18_d10_ownership', section: 'Module 18 · Thirteen VSL Dimensions (Draft Each Before Full Script)', label: '10 · OWNERSHIP EXPERIENCE — WHAT IS IT LIKE TO WORK WITH YOU? (30–90 SEC)', placeholder: 'Specific names and timeframes in week one...', multiline: true },
      { id: 'm18_d11_objections', section: 'Module 18 · Thirteen VSL Dimensions (Draft Each Before Full Script)', label: '11 · OBJECTION HANDLING — WHAT IS STOPPING ME? (30–120 SEC)', placeholder: 'Answer the Core Objection from Module 03 before it forms...', multiline: true },
      { id: 'm18_d12_vision', section: 'Module 18 · Thirteen VSL Dimensions (Draft Each Before Full Script)', label: '12 · FUTURE VISION — WHAT HAPPENS IF I SAY YES? (30–90 SEC)', placeholder: 'Let them imagine the outcome and identity shift...', multiline: true },
      { id: 'm18_d13_cta', section: 'Module 18 · Thirteen VSL Dimensions (Draft Each Before Full Script)', label: '13 · STRONG CTA — ONE FRICTION-FREE NEXT STEP (15–45 SEC) & HOSTED VSL PAGE URL', placeholder: 'Describe the exact one action and the next five minutes + URL...', multiline: true }
    ],
    rubric: [
      { criterion: 'HOOK', weak: 'Introduces you', acceptable: 'States a problem', strong: 'Names a moment they had this week' },
      { criterion: 'MECHANISM', weak: 'A process list', acceptable: 'A named process', strong: 'Explains why it structurally cannot fail the way others do' },
      { criterion: 'PROOF', weak: 'Testimonial quotes', acceptable: 'A case with numbers', strong: 'Proof that would be expensive to fake' },
      { criterion: 'OBJECTIONS', weak: 'Skipped', acceptable: 'One handled', strong: 'Every objection from module 03 answered before it forms' },
      { criterion: 'CTA', weak: 'Several options', acceptable: 'One action', strong: 'One action, and the next five minutes are described' }
    ]
  },

  // =========================================================================
  // LESSON 19 (W19 · MODULE 14: SHIFTCYCLE WEEKLY PLANNER + FIG 19, 20, 21, 22, 12)
  // =========================================================================
  {
    weekNumber: 19,
    code: 'L19',
    phase: 4,
    phaseName: 'PHASE 04 · DISTRIBUTION (GETTING IT IN FRONT OF PEOPLE)',
    title: 'SET THE PUBLISHING RHYTHM (SHIFTCYCLE™)',
    subtitle: 'Three cadences run simultaneously and are never negotiated: daily short form, weekly long form, monthly event.',
    lessonBullets: [
      'Short form is made specifically, not cut out of long form. It can be inspired by a long-form idea, but it is its own piece.',
      'ShiftCycle gives the week its shape: Signal, Tension, Proof, Perspective, Path — Monday through Friday.',
      'ShiftTranslate takes one weekly theme and turns it into every asset the week needs.'
    ],
    tasks: [
      'Pick next week’s single Shift theme from your matrix.',
      'Write the five daily pieces against the five stages — one per weekday.',
      'Schedule them. Then do the same for the following week.',
      'Decide who publishes daily and at what time, and put it in the calendar.'
    ],
    deliverable: 'Two full weeks of daily content scheduled, plus a named owner for daily publishing.',
    doneWhen: 'Content goes out for ten consecutive weekdays without anyone deciding what to post that morning.',
    coachingPrompt: 'Which of the five daily stages do you find hardest to write? That is the one your messaging is weakest on.',
    whereItFails: 'Chopping long-form videos into clips and calling it short form. Different job, different piece.',
    moduleNumber: '14',
    moduleTitle: 'SHIFTCYCLE WEEKLY PLANNER (PAGES 50–53)',
    referenceFigures: [
      {
        figNumber: 'FIG. 19 & FIG. 20',
        title: 'THE FIVE SHIFTS & A NORMAL WEEK MAPPED TO THE SHIFTCYCLE™',
        headers: ['DAY', 'SHIFT STAGE', 'OBJECTIVE', 'EMOTION', 'WEEKLY RHYTHM'],
        rows: [
          ['MONDAY', 'SIGNAL', 'Attract aligned people', 'CURIOSITY', 'Long form publishes on the week’s theme · short form that names who this is for'],
          ['TUESDAY', 'TENSION', 'Agitate the real problem', 'FRUSTRATION', 'Short form that agitates the real problem behind the theme'],
          ['WEDNESDAY', 'PROOF', 'Build certainty', 'HOPE', 'Short form proof — a result, a demo, a story from the bank'],
          ['THURSDAY', 'PERSPECTIVE', 'Replace the old worldview', 'CONVICTION', 'Short form that replaces the old worldview with the new frame'],
          ['FRIDAY', 'PATH', 'Make action inevitable', 'MOMENTUM', 'Short form that makes the next step obvious · next week’s long form filmed'],
          ['SATURDAY', 'DARK', 'Scheduled posts only', 'REST', 'No manual publishing'],
          ['SUNDAY', 'REVIEW', 'Review numbers · log stories', 'CLARITY', 'Pick next organic winner to promote to the Full List']
        ]
      },
      {
        figNumber: 'FIG. 21',
        title: 'SHIFTTRANSLATE: ONE THEME, FIFTEEN ASSETS',
        caption: 'One insight. One transformation. One week’s worth of content — fifteen surfaces, all pointing at the same shift.',
        cards: [
          { badge: 'SURFACES 01–05', title: '01 Long-form email · 02 YouTube video · 03 Podcast · 04 LinkedIn post · 05 X thread', body: 'Written and recorded from the single weekly Shift Theme.' },
          { badge: 'SURFACES 06–10', title: '06 Carousel · 07 Instagram reel · 08 TikTok · 09 Quote graphics · 10 Blog post', body: 'Native short-form and visual adaptations.' },
          { badge: 'SURFACES 11–15', title: '11 Lead magnet · 12 Sales page updates · 13 Cold outreach hooks · 14 Ads · 15 Future case studies', body: 'Conversion and commercial extensions.' }
        ]
      },
      {
        figNumber: 'FIG. 22 & FIG. 12',
        title: 'FIVE EMAIL MOVES IN ORDER & ORGANIC TESTING FILTER',
        caption: 'FIG. 12: ~20–30 Organic Posts a Month → Measure Honestly → The 2–3 That Clearly Outperform → Only These Get Ad Spend (Promoted to the Full List).',
        cards: [
          { badge: '01 · PICK ONE THING', title: 'NOTHING ELSE', body: 'One observation. One mistake. One client. One lesson. An email with two ideas has none.' },
          { badge: '02 · TELL THE STORY', title: 'START INSIDE THE MOMENT', body: 'What happened? Keep it concrete — names, numbers, weather, the room. No preamble.' },
          { badge: '03 · REVEAL THE SHIFT', title: 'THE SENTENCE PEOPLE FORWARD', body: 'Why did it matter? What is the hidden lesson underneath the anecdote?' },
          { badge: '04 & 05 · RELATE IT BACK + ONE CTA', title: 'ONE VERB ONLY', body: '"This is exactly what happens when..." + Pick one verb: reply · read · watch · book · download · think · share.' }
        ]
      }
    ],
    workedExample: {
      company: 'KEYSTONE BASEMENT SYSTEMS',
      title: 'MONDAY · SIGNAL',
      items: [
        { label: 'MONDAY · SIGNAL', value: '"Everybody in this town blames the gutters. Here is what I found under a driveway on Tuesday." — 38 seconds, phone, no edit.' }
      ]
    },
    fields: [
      { id: 'm14_owner_time', section: 'Week 1 · ShiftCycle Weekly Planner (Module 14)', label: 'NAMED OWNER FOR DAILY PUBLISHING & DAILY PUBLISH TIME', placeholder: 'e.g. Ops Manager · Every weekday at 8:30 AM EST' },
      { id: 'm14_theme', section: 'Week 1 · ShiftCycle Weekly Planner (Module 14)', label: 'WEEK 1 SHIFT THEME', placeholder: 'Why Posting More Content is a Wasted Reach Trap' },
      { id: 'm14_longform', section: 'Week 1 · ShiftCycle Weekly Planner (Module 14)', label: 'LONG-FORM PIECE IT CONNECTS TO', placeholder: 'Matrix Video #01 — We Analyzed 270 Client Posts' },
      { id: 'm14_mon', section: 'Week 1 · ShiftCycle Weekly Planner (Module 14)', label: 'MONDAY · SIGNAL (CURIOSITY) — THE PIECE', placeholder: 'Hook + 30s phone script...', multiline: true },
      { id: 'm14_tue', section: 'Week 1 · ShiftCycle Weekly Planner (Module 14)', label: 'TUESDAY · TENSION (FRUSTRATION) — THE PIECE', placeholder: 'Hook + 45s tension piece...', multiline: true },
      { id: 'm14_wed', section: 'Week 1 · ShiftCycle Weekly Planner (Module 14)', label: 'WEDNESDAY · PROOF (HOPE) — THE PIECE', placeholder: 'Hook + 60s story/result...', multiline: true },
      { id: 'm14_thu', section: 'Week 1 · ShiftCycle Weekly Planner (Module 14)', label: 'THURSDAY · PERSPECTIVE (CONVICTION) — THE PIECE', placeholder: 'Hook + 45s contrarian reframe...', multiline: true },
      { id: 'm14_fri', section: 'Week 1 · ShiftCycle Weekly Planner (Module 14)', label: 'FRIDAY · PATH (MOMENTUM) — THE PIECE', placeholder: 'Hook + direct handoff to Shift Magnet in DMs...', multiline: true },

      { id: 'm14_w2_theme', section: 'Week 2 · ShiftCycle Weekly Planner (10 Consecutive Weekdays Scheduled)', label: 'WEEK 2 SHIFT THEME & CONNECTED LONG-FORM PIECE', placeholder: 'Google’s 7-11-4 Rule for Sophisticated Buyers (Connects to Matrix Video #02)' },
      { id: 'm14_w2_mon_fri', section: 'Week 2 · ShiftCycle Weekly Planner (10 Consecutive Weekdays Scheduled)', label: 'WEEK 2 FIVE DAILY PIECES (MON SIGNAL · TUE TENSION · WED PROOF · THU PERSPECTIVE · FRI PATH)', placeholder: 'Write or link Days 6–10 from your Concussion Content plan...', multiline: true }
    ]
  },

  // =========================================================================
  // LESSON 20 (W20 · MODULE 15: SEQUENCE + AUDIENCE MAP — ALL 16 PDF FIELDS)
  // =========================================================================
  {
    weekNumber: 20,
    code: 'L20',
    phase: 4,
    phaseName: 'PHASE 04 · DISTRIBUTION (GETTING IT IN FRONT OF PEOPLE)',
    title: 'BUILD THE AD SEQUENCE ($5–10/DAY)',
    subtitle: 'Distribution is where the library stops being a cost and starts being a machine.',
    lessonBullets: [
      'Each core video runs as its own always-on ad at $5–10 a day.',
      'Anyone who watches roughly 25% advances to the next video and joins the audience.',
      'Every per-video audience rolls into one master list — the Full List. That list is the actual asset.'
    ],
    tasks: [
      'Set up the ad account, pixel, and per-video custom audiences.',
      'Build the sequence: video one to cold, 25% viewers to video two, and so on.',
      'Create the Full List as a combined audience of every qualified viewer.',
      'Set budgets and turn the first three videos on.'
    ],
    deliverable: 'A live sequence with per-video audiences and one combined Full List.',
    doneWhen: 'A stranger can enter at video one and be walked through the library automatically.',
    coachingPrompt: 'What is your Full List size today? That number is the one to watch for the next year.',
    whereItFails: 'Optimizing for leads or clicks. Optimize for watch-through; the exposure is the point.',
    moduleNumber: '15',
    moduleTitle: 'SEQUENCE + AUDIENCE MAP (PAGES 54–56)',
    referenceFigures: [
      {
        figNumber: 'FIG. 11',
        title: 'PAID SEQUENCE & AUDIENCE BUILD',
        caption: 'Each sequenced video (V1–V6) runs as its own always-on ad at $5–10/day. Watch 25% and you advance to the next one and join the Full List. Daily organic short form feeds the same pool from below.',
        headers: ['STEP', 'VIDEO IN SEQUENCE', 'SERVED TO AUDIENCE', 'ROLLS INTO'],
        rows: [
          ['V1', 'B1 Brand Documentary', 'Cold Qualified Audience ($5–10/day)', '25% Viewers → V2 + The Full List'],
          ['V2', 'Teaching Video #01 (Topic 1)', '25% Viewers of V1 ($5–10/day)', '25% Viewers → V3 + The Full List'],
          ['V3', 'Teaching Video #05 / B2 Product', '25% Viewers of V2 ($5–10/day)', '25% Viewers → V4 + The Full List'],
          ['V4', 'Teaching Video #09 / B3 Proof', '25% Viewers of V3 ($5–10/day)', '25% Viewers → V5 + The Full List'],
          ['V5', 'Teaching Video #13 / B4 Ownership', '25% Viewers of V4 ($5–10/day)', '25% Viewers → V6 + The Full List'],
          ['V6', 'Teaching Video #17 / VSL Invite', '25% Viewers of V5 ($5–10/day)', '25% Viewers → The Full List']
        ]
      }
    ],
    fields: [
      { id: 'm15_budget', section: 'Module 15 · Distribution Wiring', label: 'DAILY BUDGET PER CORE VIDEO', placeholder: '$5–$10/day' },
      { id: 'm15_threshold', section: 'Module 15 · Distribution Wiring', label: 'WATCH THRESHOLD THAT ADVANCES A VIEWER', placeholder: '~25% video watch-through' },
      { id: 'm15_step1_video', section: 'Six-Step Paid Ad Ladder (Videos V1–V6)', label: 'STEP 1 · VIDEO', placeholder: 'V1: B1 Brand Documentary' },
      { id: 'm15_step1_aud', section: 'Six-Step Paid Ad Ladder (Videos V1–V6)', label: 'STEP 1 · AUDIENCE IT IS SERVED TO', placeholder: 'Cold Broad / ICP Lookalike + Geo/Demo Filter' },
      { id: 'm15_step2_video', section: 'Six-Step Paid Ad Ladder (Videos V1–V6)', label: 'STEP 2 · VIDEO', placeholder: 'V2: Topic 1 Teaching Video (#01)' },
      { id: 'm15_step2_aud', section: 'Six-Step Paid Ad Ladder (Videos V1–V6)', label: 'STEP 2 · AUDIENCE IT IS SERVED TO', placeholder: 'Custom Audience: 25% Viewers of Step 1 (V1)' },
      { id: 'm15_step3_video', section: 'Six-Step Paid Ad Ladder (Videos V1–V6)', label: 'STEP 3 · VIDEO', placeholder: 'V3: B2 Product / Service Video (or Topic 2 #05)' },
      { id: 'm15_step3_aud', section: 'Six-Step Paid Ad Ladder (Videos V1–V6)', label: 'STEP 3 · AUDIENCE IT IS SERVED TO', placeholder: 'Custom Audience: 25% Viewers of Step 2 (V2)' },
      { id: 'm15_step4_video', section: 'Six-Step Paid Ad Ladder (Videos V1–V6)', label: 'STEP 4 · VIDEO', placeholder: 'V4: B3 Proof & Case Study Video (or Topic 3 #09)' },
      { id: 'm15_step4_aud', section: 'Six-Step Paid Ad Ladder (Videos V1–V6)', label: 'STEP 4 · AUDIENCE IT IS SERVED TO', placeholder: 'Custom Audience: 25% Viewers of Step 3 (V3)' },
      { id: 'm15_step5_video', section: 'Six-Step Paid Ad Ladder (Videos V1–V6)', label: 'STEP 5 · VIDEO', placeholder: 'V5: B4 Ownership Experience Video (or Topic 4 #13)' },
      { id: 'm15_step5_aud', section: 'Six-Step Paid Ad Ladder (Videos V1–V6)', label: 'STEP 5 · AUDIENCE IT IS SERVED TO', placeholder: 'Custom Audience: 25% Viewers of Step 4 (V4)' },
      { id: 'm15_step6_video', section: 'Six-Step Paid Ad Ladder (Videos V1–V6)', label: 'STEP 6 · VIDEO', placeholder: 'V6: Topic 5 Teaching Video (#17) / Monthly Event Invite' },
      { id: 'm15_step6_aud', section: 'Six-Step Paid Ad Ladder (Videos V1–V6)', label: 'STEP 6 · AUDIENCE IT IS SERVED TO', placeholder: 'Custom Audience: 25% Viewers of Step 5 (V5)' },
      { id: 'm15_fulllist_name', section: 'The Full List Master Asset', label: 'FULL LIST — COMBINED AUDIENCE NAME', placeholder: 'MCM_Full_List_All_25Pct_Viewers_365d' },
      { id: 'm15_fulllist_size', section: 'The Full List Master Asset', label: 'FULL LIST SIZE ON THE DAY IT WENT LIVE', placeholder: 'e.g. 1,420 deduplicated viewers' }
    ]
  },

  // =========================================================================
  // LESSON 21 (W21 · MODULE 16 SHIFT MAGNET + MODULE 17 DM PLAYBOOK + FIG 13–16)
  // =========================================================================
  {
    weekNumber: 21,
    code: 'L21',
    phase: 4,
    phaseName: 'PHASE 04 · DISTRIBUTION (GETTING IT IN FRONT OF PEOPLE)',
    title: 'MAGNETS, CTAS, AND THE DM PLAYBOOK',
    subtitle: 'Both calls to action land in the same place: a conversation.',
    lessonBullets: [
      'First CTA is low friction — a shift magnet, a free resource whose job is to shift a belief, not just capture an email.',
      'Second CTA is for people ready now — the VSL.',
      'Both route to DMs, because sales happen in conversation once trust already exists.'
    ],
    tasks: [
      'Build one shift magnet tied directly to your Core Belief.',
      'Add both CTAs to every published video and to the daily content template.',
      'Write the DM playbook: opener, qualifying questions, and how a conversation becomes a booking.',
      'Name who answers DMs and how fast.'
    ],
    deliverable: 'One shift magnet live, both CTAs on every asset, and a written DM playbook with an owner.',
    doneWhen: 'A DM arriving at 9pm gets a real answer by the next morning, using the playbook.',
    coachingPrompt: 'What belief does your magnet shift? If the answer is "none, it is just useful", rebuild it.',
    whereItFails: 'Three magnets and no owner for DMs. One magnet answered fast beats three ignored.',
    moduleNumber: '16 & 17',
    moduleTitle: 'SHIFT MAGNET BUILDER (14 FIELDS) & DM PLAYBOOK (21 FIELDS) — PAGES 57–64',
    referenceFigures: [
      {
        figNumber: 'FIG. 16',
        title: 'THE DM BUILDER: FILL THIS IN ONCE PER OFFER (PAGE 60)',
        cards: [
          { badge: 'S · SIGNAL', title: 'PROSPECT ACTION · RESOURCE REQUESTED · OPENING LINE', body: 'Re-establish context tied directly to the video or magnet they requested.' },
          { badge: 'H · HIGHLIGHT', title: 'SCENARIO A · SCENARIO B · SCENARIO C', body: 'Three-option diagnostic so the prospect self-identifies their immediate constraint.' },
          { badge: 'I · ILLUMINATE', title: 'COMMON FAILED APPROACH · HIDDEN CAUSE · ONE CONTEXT QUESTION', body: 'Reveal the deeper cause and ask one low-friction context question.' },
          { badge: 'F & T · FORM & TRIGGER', title: 'IMMEDIATE RECOMMENDATION + RESOURCE → NEXT LOGICAL BOTTLENECK + OFFER DOC', body: 'Deliver the promised Shift Magnet, then bridge to the 2-Page Offer Doc or VSL.' }
        ]
      }
    ],
    fields: [
      // Module 16: All 14 fields from pages 61–62
      { id: 'm16_magnet_title', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'WORKING TITLE', placeholder: 'The 7-Hour Pipeline Equity Audit' },
      { id: 'm16_version', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'VERSION', placeholder: 'v2.1' },
      { id: 'm16_audience', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'SPECIFIC AUDIENCE (NOT EVERYONE)', placeholder: 'B2B Consultants & Agency Operators at $20k–$50k/mo' },
      { id: 'm16_problem', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'TRIGGERING PROBLEM (WHAT THEY JUST EXPERIENCED THAT MAKES THEM WANT THIS)', placeholder: 'Posted 5 reels this week and got zero qualified inquiries.' },
      { id: 'm16_promise', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'THE PROMISE — ONE SENTENCE', placeholder: 'Score your current content footprint in 4 minutes and find where your pipeline is leaking.', multiline: true },
      { id: 'm16_belief', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'THE BELIEF IT SHIFTS', placeholder: 'More content does not create clients; consumption depth (7 hours on brand) does.', multiline: true },
      { id: 'm16_time', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'COMPLETION TIME (UNDER 10 MINUTES IS THE TARGET)', placeholder: '4 minutes' },
      { id: 'm16_format', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'DELIVERY FORMAT (PDF / CHECKLIST / VIDEO / AUDIT)', placeholder: '1-Page Scorecard Checklist + Custom GPT' },
      { id: 'm16_sections', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'SECTIONS OR STEPS', placeholder: '1. Current Minutes Audit · 2. The 25% Ad Gate Check · 3. DM Handoff Score', multiline: true },
      { id: 'm16_win', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'THE IMMEDIATE WIN — WHAT THEY GET IN THE FIRST TWO MINUTES', placeholder: 'Exact calculation of their current Time-on-Brand gap.', multiline: true },
      { id: 'm16_bridge', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'THE BRIDGE TO THE OFFER', placeholder: 'Now that you see your Time-on-Brand score, here is how we install the 25-video engine in 8 weeks.', multiline: true },
      { id: 'm16_hosted', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'HOSTED WHERE & DELIVERY AUTOMATION', placeholder: 'Notion / HighLevel / ManyChat keyword trigger "AUDIT"' },
      { id: 'm16_link', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'TRACKING LINK', placeholder: 'https://marketconcussion.com/audit' },
      { id: 'm16_thankyou', section: 'Module 16 · Shift Magnet Builder (Pages 61–62)', label: 'THANK-YOU MESSAGE + DM HANDOFF', placeholder: 'Here is the link! Quick question before you open it...', multiline: true },

      // Module 17 Top Half: Written Once (Page 63)
      { id: 'm17_opener', section: 'Module 17 · DM Playbook — Written Once (Page 63)', label: 'OPENER — FIRST REPLY TO AN INBOUND DM', placeholder: 'Hey [Name]! Saw you grabbed the Pipeline Audit from the video...', multiline: true },
      { id: 'm17_diagnostic', section: 'Module 17 · DM Playbook — Written Once (Page 63)', label: 'A / B / C DIAGNOSTIC — THE THREE QUESTIONS THAT SORT EVERY INBOUND', placeholder: 'Are you currently focused on: A) Fixing leaky ad funnels, B) Escaping referral-only spiky months, or C) Replacing sales calls with DMs?', multiline: true },
      { id: 'm17_booking', section: 'Module 17 · DM Playbook — Written Once (Page 63)', label: 'HOW A CONVERSATION BECOMES A BOOKING / OFFER DOC HANDOFF', placeholder: 'After answering their diagnostic constraint, offer to send the 2-Page Super Signature Offer Doc...', multiline: true },
      { id: 'm17_owner_sla', section: 'Module 17 · DM Playbook — Written Once (Page 63)', label: 'WHO ANSWERS DMS & PROMISED RESPONSE TIME', placeholder: 'Josh / DM Specialist · Under 2 hours during business hours (9pm DM answered by 8am)' },
      { id: 'm17_day2', section: 'Module 17 · Re-Engagement Ladder — Four Messages for Silence (Page 63)', label: 'DAY 2 — LIGHT, NO ASK (LEVEL 1 CONTEXT NUDGE)', placeholder: 'Hey [First name], did you get a chance to look at the [Resource]?', multiline: true },
      { id: 'm17_day5', section: 'Module 17 · Re-Engagement Ladder — Four Messages for Silence (Page 63)', label: 'DAY 5 — NEW VALUE, NO ASK (LEVEL 2 FRICTION NUDGE)', placeholder: 'Was there anything in it that didn’t fit your situation?', multiline: true },
      { id: 'm17_day12', section: 'Module 17 · Re-Engagement Ladder — Four Messages for Silence (Page 63)', label: 'DAY 12 — DIRECT QUESTION (LEVEL 3 OUTCOME NUDGE)', placeholder: 'Is solving [Specific problem] still a priority right now?', multiline: true },
      { id: 'm17_day30', section: 'Module 17 · Re-Engagement Ladder — Four Messages for Silence (Page 63)', label: 'DAY 30 — CLOSE THE LOOP HONESTLY (LEVEL 4 PERMISSION TO CLOSE)', placeholder: 'Should I close the loop on this for now?', multiline: true },

      // Module 17 Bottom Half: Per Conversation Log (Page 64)
      { id: 'm17_convo_source', section: 'Module 17 · Per Conversation Record (Page 64)', label: 'TRIGGER / SOURCE (WHICH VIDEO, MAGNET, OR POST) & CONSTRAINT IDENTIFIED', placeholder: 'Daily Video #08 (Referral Lottery) -> Requested AUDIT Magnet · Constraint: Spiky referral months' },
      { id: 'm17_convo_workaround_metric', section: 'Module 17 · Per Conversation Record (Page 64)', label: 'FAILED WORKAROUND THEY ALREADY TRIED & KEY METRIC THEY CARE ABOUT', placeholder: 'Hired a cold email agency that booked 0 calls · Cares about predictable $30k/mo baseline' },
      { id: 'm17_convo_resource_rec', section: 'Module 17 · Per Conversation Record (Page 64)', label: 'RESOURCE SENT · RECOMMENDATION MADE · BOOKING / OFFER INVITED?', placeholder: 'Sent Pipeline Audit + Video #05 -> Invited to 2-Page Offer Doc (Yes)' },
      { id: 'm17_convo_objection', section: 'Module 17 · Per Conversation Record (Page 64)', label: 'OBJECTION RAISED — VERBATIM', placeholder: '"I’m worried I won’t stick to filming daily videos after week two."', multiline: true },
      { id: 'm17_convo_outcome', section: 'Module 17 · Per Conversation Record (Page 64)', label: 'FOLLOW-UP DATE · OUTCOME · IF LOST — REASON', placeholder: 'Followed up Friday -> Closed into Cohort!' },
      { id: 'm17_convo_feedback', section: 'Module 17 · Per Conversation Record (Page 64)', label: 'LEARNING FED BACK INTO THE MESSAGING PAGE', placeholder: 'Added exact phrase "scared of falling off cadence in week two" into Q2 Tension.', multiline: true }
    ]
  },

  // =========================================================================
  // LESSON 22 (W22 · MODULE 21 METRIC DICTIONARY & MODULE 22 MONTHLY DASHBOARD)
  // =========================================================================
  {
    weekNumber: 22,
    code: 'L22',
    phase: 4,
    phaseName: 'PHASE 04 · DISTRIBUTION (GETTING IT IN FRONT OF PEOPLE)',
    title: 'READ THE NUMBERS (ATTENTION DASHBOARD)',
    subtitle: 'The machine is now running. This week is about learning to judge it correctly.',
    isPhaseGate: true,
    lessonBullets: [
      'Report on watch time, average view duration, how many clear each 25% gate, Full List growth, and DM conversations started.',
      'Do not report on leads yet. It is too early and it will make you change the wrong thing.',
      'Organic performance decides where ad money goes: only posts that win organically get spend.'
    ],
    tasks: [
      'Build a one-page monthly dashboard with those five numbers.',
      'Identify your two or three best-performing organic posts and put budget behind them, aimed at the Full List.',
      'Find the video with the worst drop-off in the first fifteen seconds and rewrite its opening.',
      'Review the sequence: is anyone reaching video four yet?'
    ],
    deliverable: 'A monthly dashboard and the first round of promoted organic winners.',
    doneWhen: 'You can answer "is this working?" with attention data instead of opinion.',
    coachingPrompt: 'Which video has the highest average view duration? Make three more like it.',
    whereItFails: 'Killing the system because leads have not appeared. Month four is early; the benchmark is seven hours.',
    moduleNumber: '21 & 22',
    moduleTitle: 'METRIC DICTIONARY & MONTHLY ATTENTION DASHBOARD (PAGES 65–67)',
    referenceFigures: [
      {
        figNumber: 'MODULE 21',
        title: 'METRIC DICTIONARY (PAGE 66 — REFERENCE)',
        caption: 'Agree these definitions once. Leads and cost per lead are deliberately absent until month five.',
        headers: ['METRIC', 'DEFINITION', 'SOURCE', 'CADENCE', 'OWNER'],
        rows: [
          ['WATCH TIME', 'Total minutes of your content consumed, all platforms', 'Platform analytics', 'Monthly', 'Operator'],
          ['AVG. VIEW DURATION', 'Watch time ÷ views, compared within format only', 'Platform analytics', 'Monthly', 'Operator'],
          ['GATE CLEARANCE', 'Viewers hitting 25% ÷ video starts, per sequence step', 'Ad platform', 'Weekly', 'Media buyer'],
          ['FULL LIST SIZE', 'Deduplicated count of everyone who cleared any gate', 'Ad platform', 'Monthly', 'Media buyer'],
          ['DM CONVERSATIONS', 'Inbound threads with at least one reply from the prospect', 'Inbox / CRM', 'Weekly', 'DM owner'],
          ['EVENT ATTENDANCE', 'Live attendees ÷ registrations', 'Event platform', 'Monthly', 'Event host']
        ]
      }
    ],
    fields: [
      { id: 'm22_month', section: 'Module 22 · Monthly Attention Dashboard (Page 67)', label: 'MONTH', placeholder: 'e.g. Month 04 — October 2026' },

      { id: 'm22_watchtime_nums', section: '1. Watch Time (Total Minutes Consumed Across All Platforms)', label: 'WATCH TIME — BASELINE | TARGET | ACTUAL', placeholder: 'Baseline: 120m | Target: 10,000m | Actual: 14,800m' },
      { id: 'm22_watchtime_dec', section: '1. Watch Time (Total Minutes Consumed Across All Platforms)', label: 'WATCH TIME — INTERPRETATION → DECISION MADE → OWNER → DUE', placeholder: 'Long-form YouTube driving 65% of minutes -> Film 2 more Analytical pieces -> Josh -> Friday' },

      { id: 'm22_avd_nums', section: '2. Average View Duration (Watch Time ÷ Views, Within Format)', label: 'AVG. VIEW DURATION — BASELINE | TARGET | ACTUAL', placeholder: 'Baseline: 1m 10s | Target: 4m 30s | Actual: 5m 12s' },
      { id: 'm22_avd_dec', section: '2. Average View Duration (Watch Time ÷ Views, Within Format)', label: 'AVG. VIEW DURATION — INTERPRETATION → DECISION MADE → OWNER → DUE', placeholder: 'Video #03 dropped off at 0:12 -> Rewrite Signal hook -> Josh -> Wednesday' },

      { id: 'm22_gate_nums', section: '3. Gate Clearance (Viewers Hitting 25% ÷ Video Starts)', label: 'GATE CLEARANCE — BASELINE | TARGET | ACTUAL', placeholder: 'Baseline: 18% | Target: 30% | Actual: 38%' },
      { id: 'm22_gate_dec', section: '3. Gate Clearance (Viewers Hitting 25% ÷ Video Starts)', label: 'GATE CLEARANCE — INTERPRETATION → DECISION MADE → OWNER → DUE', placeholder: '38% clearing V1 to V2; 210 viewers reached V4 -> Shift $5/day more to V3 -> Media Buyer' },

      { id: 'm22_fulllist_nums', section: '4. Full List Size (Deduplicated Count of All 25% Gate Clearers)', label: 'FULL LIST SIZE — BASELINE | TARGET | ACTUAL', placeholder: 'Baseline: 0 | Target: 3,000 | Actual: 4,290 warm viewers' },
      { id: 'm22_fulllist_dec', section: '4. Full List Size (Deduplicated Count of All 25% Gate Clearers)', label: 'FULL LIST SIZE — INTERPRETATION → DECISION MADE → OWNER → DUE', placeholder: 'Compounding at +900/mo -> Ready to announce Monthly Workshop to Full List' },

      { id: 'm22_dms_nums', section: '5. DM Conversations (Inbound Threads With ≥1 Prospect Reply)', label: 'DM CONVERSATIONS — BASELINE | TARGET | ACTUAL', placeholder: 'Baseline: 2/mo | Target: 25/mo | Actual: 34 active DM threads' },
      { id: 'm22_dms_dec', section: '5. DM Conversations (Inbound Threads With ≥1 Prospect Reply)', label: 'DM CONVERSATIONS — INTERPRETATION → DECISION MADE → OWNER → DUE', placeholder: 'AUDIT keyword outperforming 3:1 -> Make AUDIT default 1st CTA on all reels' },

      { id: 'm22_event_nums', section: '6. Event Attendance (Live Attendees ÷ Registrations)', label: 'EVENT ATTENDANCE — BASELINE | TARGET | ACTUAL', placeholder: 'Baseline: N/A | Target: 50% | Actual: 59% (38/64)' },
      { id: 'm22_event_dec', section: '6. Event Attendance (Live Attendees ÷ Registrations)', label: 'EVENT ATTENDANCE — INTERPRETATION → DECISION MADE → OWNER → DUE', placeholder: 'Personal DM reminder 1 hour before live boosted show-up rate -> Standardize SOP' },

      { id: 'm22_best_organic', section: 'Organic Winners Promoted to Full List', label: 'BEST ORGANIC POST THIS MONTH — AND WHY', placeholder: 'Daily #02 (Google 7-11-4 Rule) — 48% 15s hold rate because of whiteboard visual', multiline: true },
      { id: 'm22_promoted', section: 'Organic Winners Promoted to Full List', label: 'PROMOTED TO THE FULL LIST? (YES / AD ID & DAILY SPEND)', placeholder: 'Yes — Promoted at $5/day to MCM_Full_List_All_25Pct_Viewers' }
    ]
  },

  // =========================================================================
  // LESSON 23 (W23 · MODULE 19: WORKSHOP DESIGNER + FIG 23, 24, 25)
  // =========================================================================
  {
    weekNumber: 23,
    code: 'L23',
    phase: 5,
    phaseName: 'PHASE 05 · CONVERSION (TURNING ATTENTION INTO CLIENTS)',
    title: 'DESIGN THE MONTHLY WORKSHOP',
    subtitle: 'The event is what converts a warm list into conversations. One framework runs every workshop you will ever hold.',
    lessonBullets: [
      'Surface the Struggle — recognition. Highlight the Horizon — hope. Illuminate the Insight — clarity. Form the Solution — capability. Transfer the Transformation — momentum.',
      'Teach only the three to five concepts needed to produce the outcome.',
      'Do not explain the work; have participants complete the work in the room.'
    ],
    tasks: [
      'Choose one topic and design the workshop against the five stages.',
      'Build the worksheet or template participants will actually complete live.',
      'Decide free or paid, and the platform.',
      'Set the date and the following two months’ dates at the same time.'
    ],
    deliverable: 'A designed workshop with a completion asset, and three dates on the calendar.',
    doneWhen: 'A participant would leave with something finished, not just notes.',
    coachingPrompt: 'What could someone build in sixty minutes that would make hiring you the obvious next step?',
    whereItFails: 'Presenting for an hour. If nobody completed anything, it was a webinar and it will not convert.',
    moduleNumber: '19',
    moduleTitle: 'WORKSHOP DESIGNER (PAGES 68–71)',
    referenceFigures: [
      {
        figNumber: 'FIG. 24 & FIG. 25',
        title: 'THE FIVE WORKSHOP STAGES & TRANSFORMATION SEQUENCE',
        caption: 'Recognition → Hope → Clarity → Capability → Momentum. If participants leave without a completed asset and one action they can take in under two minutes, the workshop stopped at Clarity.',
        headers: ['STAGE', 'PURPOSE', 'PARTICIPANT QUESTION', 'DELIVERABLE'],
        rows: [
          ['S · SURFACE THE STRUGGLE™', 'Create emotional buy-in by making the problem feel real and urgent.', 'Why does this matter to me?', 'RECOGNITION (Create Buy-In)'],
          ['H · HIGHLIGHT THE HORIZON™', 'Paint the desired future and establish what is possible.', 'What could my life or business look like?', 'HOPE (Create Desire)'],
          ['I · ILLUMINATE THE INSIGHT™', 'Install the key beliefs, frameworks, and mental models.', 'What do I need to understand differently?', 'CLARITY (Create Clarity)'],
          ['F · FORM THE SOLUTION™', 'Guide participants through building or implementing the solution.', 'How do I actually do this?', 'CAPABILITY (Create Capability)'],
          ['T · TRANSFER THE TRANSFORMATION™', 'Turn learning into action with completed work and a clear next step.', 'What do I do next?', 'MOMENTUM (Create Momentum)']
        ]
      },
      {
        figNumber: 'FIG. 23',
        title: 'THE MONTHLY EVENT CADENCE',
        cards: [
          { badge: 'WEEKS 1–2 · ANNOUNCE', title: 'REGISTRATION IS THE ONLY ASK', body: 'Promote to the Full List and in every video CTA.' },
          { badge: 'WEEK 3 · RUN IT LIVE', title: 'TEACH ONE TOPIC PROPERLY', body: 'Have participants complete the worksheet in the room, take live questions, name names.' },
          { badge: 'END OF EVENT · INVITE', title: 'POINT TO THE OFFER DOC', body: 'Point everyone to the 1-page offer doc: what it is, who it’s for, what happens next.' },
          { badge: 'WEEK 4 · FOLLOW UP', title: 'REPLAY & DM CONVERSATIONS', body: 'Send replay to no-shows, open DM conversations with attendees. Then reset for next month.' }
        ]
      }
    ],
    fields: [
      { id: 'm19_title', section: 'Module 19 · Workshop Designer (Pages 70–71)', label: 'WORKSHOP TITLE', placeholder: 'Build Your 7-Hour Client Acquisition Map Live in 60 Minutes' },
      { id: 'm19_date', section: 'Module 19 · Workshop Designer (Pages 70–71)', label: 'DATE (PLUS FOLLOWING TWO MONTHS’ DATES)', placeholder: 'Nov 18 · Dec 16 · Jan 20 at 1:00 PM EST' },
      { id: 'm19_free_paid', section: 'Module 19 · Workshop Designer (Pages 70–71)', label: 'FREE OR PAID', placeholder: 'Free for Full List / $100 VIP ticket' },
      { id: 'm19_platform', section: 'Module 19 · Workshop Designer (Pages 70–71)', label: 'PLATFORM', placeholder: 'Zoom Live Workshop Room' },
      { id: 'm19_s_struggle', section: 'Module 19 · Workshop Designer (Pages 70–71)', label: 'S · SURFACE THE STRUGGLE — RECOGNITION', placeholder: 'Why their current content & referral loop feels exhausting...', multiline: true },
      { id: 'm19_h_horizon', section: 'Module 19 · Workshop Designer (Pages 70–71)', label: 'H · HIGHLIGHT THE HORIZON — HOPE', placeholder: 'What business looks like when prospects binge 7 hours before DMing you...', multiline: true },
      { id: 'm19_i_insight', section: 'Module 19 · Workshop Designer (Pages 70–71)', label: 'I · ILLUMINATE THE INSIGHT — CLARITY (3–5 CONCEPTS ONLY)', placeholder: 'Concept 1: 7-11-4 Rule · Concept 2: $5 25% Ad Ladder · Concept 3: 2-Page Offer Doc...', multiline: true },
      { id: 'm19_f_solution', section: 'Module 19 · Workshop Designer (Pages 70–71)', label: 'F · FORM THE SOLUTION — CAPABILITY (WHAT THEY BUILD LIVE IN THE ROOM)', placeholder: 'Participants fill out their 5 Topics and 6-Video Ad Sequence live on screen...', multiline: true },
      { id: 'm19_t_transfer', section: 'Module 19 · Workshop Designer (Pages 70–71)', label: 'T · TRANSFER THE TRANSFORMATION — MOMENTUM (THE INVITATION TO THE OFFER DOC)', placeholder: 'DM "COHORT" or click the 2-Page Offer Doc link in chat to have us install this with you in 8 weeks...', multiline: true },
      { id: 'm19_asset', section: 'Module 19 · Workshop Designer (Pages 70–71)', label: 'THE COMPLETION ASSET PARTICIPANTS LEAVE WITH', placeholder: 'Completed 1-Page Topic Matrix & $5/Day Ad Sequence Map' }
    ]
  },

  // =========================================================================
  // LESSON 24 (W24 · MODULE 20: OFFER DOCUMENT BUILDER — ALL 17 PDF FIELDS)
  // =========================================================================
  {
    weekNumber: 24,
    code: 'L24',
    phase: 5,
    phaseName: 'PHASE 05 · CONVERSION (TURNING ATTENTION INTO CLIENTS)',
    title: 'WRITE THE OFFER DOC',
    subtitle: 'The workshop ends with one invitation, and that invitation needs somewhere to point.',
    lessonBullets: [
      'One page: the offer, the outcome, who it fits, the price if there is one, and how to start.',
      'It can be free — a diagnostic, an audit, a plan — or paid.',
      'Its only job is to make the next step obvious and easy to say yes to.'
    ],
    tasks: [
      'Write the offer doc on one page.',
      'Remove every sentence that is about you rather than about their next step.',
      'Test it on someone who attended nothing — can they tell you what to do next?',
      'Wire it into the workshop close, the VSL, and the DM playbook.'
    ],
    deliverable: 'A one-page offer doc, linked from the event, the VSL, and DMs.',
    doneWhen: 'A stranger reading it knows what they get, what it costs, and what to do in the next five minutes.',
    coachingPrompt: 'Is the next step small enough that saying yes costs almost nothing?',
    whereItFails: 'A page full of features. It is a doorway, not a brochure.',
    moduleNumber: '20',
    moduleTitle: 'OFFER DOCUMENT BUILDER (ALL 17 FIELDS — PAGES 72–73)',
    fields: [
      { id: 'm20_problem', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'THE PROBLEM THIS SOLVES — IN THEIR WORDS', placeholder: 'I have great client results, but my pipeline relies on referrals and random posting.', multiline: true },
      { id: 'm20_outcome', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'THE DESIRED OUTCOME', placeholder: 'Install a compounding 7-hour client acquisition machine in 8 weeks that closes high-ticket clients via DM.', multiline: true },
      { id: 'm20_mechanism', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'THE MECHANISM (YOUR NAMED PROCESS FROM Q7)', placeholder: 'The Market Concussion S.H.I.F.T. System + DXY (Done-Accelerated-For-You)' },
      { id: 'm20_scope', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'SCOPE — WHAT IS INCLUDED', placeholder: '8-Week Implementation Cohort, Custom Content Plan Ingestion, $5/Day Ad Wiring, DM Playbook...', multiline: true },
      { id: 'm20_deliverables', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'DELIVERABLES — WHAT THEY PHYSICALLY RECEIVE', placeholder: '25-Video Script Pack, 50-Item Concussion Content Plan, 3 Live Shift Magnets, Configured Meta Ad Ladder...', multiline: true },
      { id: 'm20_timeline', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'TIMELINE', placeholder: '8 Weeks to Full Installation (First $5 Ad & Daily Cadence live in Week 1)' },
      { id: 'm20_responsibilities', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'RESPONSIBILITIES — YOURS AND THEIRS', placeholder: 'Ours: Build your content plan, hooks, and ad wiring. Yours: 10 minutes/day shooting + 1 weekly batch session.', multiline: true },
      { id: 'm20_proof', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'PROOF — THE STRONGEST EVIDENCE, UP FRONT', placeholder: '45 high-ticket clients signed in 30 days with zero sales calls; 1,256 leads at $0.27...', multiline: true },
      { id: 'm20_price', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'PRICE', placeholder: 'e.g. $10,000 / $1,500 per month' },
      { id: 'm20_terms', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'PAYMENT TERMS', placeholder: 'Pay in full or 3 monthly installments — direct Super Signature checkout link' },
      { id: 'm20_risk', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'RISK REVERSAL — WHAT YOU CARRY SO THEY DO NOT', placeholder: '60-Day "Love It or Leave It" Guarantee — 100% penalty-free exit if you don’t love the build.', multiline: true },
      { id: 'm20_exclusions', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'EXCLUSIONS — WHAT THIS IS NOT', placeholder: 'Not a passive Done-For-You agency where someone else pretends to be you on camera.', multiline: true },
      { id: 'm20_qualification', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'QUALIFICATION CRITERIA — WHO THIS IS NOT FOR', placeholder: 'Not for beginners without a validated offer or anyone unwilling to spend 10 mins/day on camera.', multiline: true },
      { id: 'm20_faqs', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'FAQS — THE THREE QUESTIONS THAT ALWAYS COME', placeholder: '1. How much ad spend do I need? ($5–10/day) · 2. What if I hate editing? · 3. Do I need a sales team?', multiline: true },
      { id: 'm20_next_step', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'THE NEXT STEP — THE FIRST FIVE MINUTES', placeholder: 'Click the Super Signature link below, complete the 2-minute intake, and get your Content Plan loaded today.', multiline: true },
      { id: 'm20_expiration', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'EXPIRATION OR CAPACITY CONDITION (ONLY IF REAL)', placeholder: 'Strictly capped at 30 operators per monthly cohort' },
      { id: 'm20_linked_from', section: 'Module 20 · Offer Document Builder (Pages 72–73)', label: 'LINKED FROM (EVENT CLOSE / VSL / DM PLAYBOOK)', placeholder: 'Linked in Workshop Slide #42, VSL CTA button, and DM Stage T' }
    ],
    rubric: [
      { criterion: 'FOCUS', weak: 'About your company', acceptable: 'About the service', strong: 'About their next step' },
      { criterion: 'SCOPE', weak: 'Vague', acceptable: 'Listed', strong: 'Listed with what is excluded' },
      { criterion: 'RISK', weak: 'All on the buyer', acceptable: 'Guarantee mentioned', strong: 'A guarantee that costs you something if invoked' },
      { criterion: 'QUALIFICATION', weak: 'Anyone', acceptable: 'Ideal customer described', strong: 'Explicitly says who should not buy' },
      { criterion: 'NEXT STEP', weak: '"Contact us"', acceptable: 'A booking link', strong: 'A named action that takes under five minutes' }
    ]
  },

  // =========================================================================
  // LESSON 25 (W25 · MODULE 23: EVENT DEBRIEF — ALL 8 PDF FIELDS)
  // =========================================================================
  {
    weekNumber: 25,
    code: 'L25',
    phase: 5,
    phaseName: 'PHASE 05 · CONVERSION (TURNING ATTENTION INTO CLIENTS)',
    title: 'RUN THE FIRST EVENT',
    subtitle: 'Everything built so far exists to fill this room and make the invitation land.',
    lessonBullets: [
      'Weeks one and two: announce to the Full List and through every CTA. Registration is the only ask.',
      'Week three: run it live. Teach properly, take questions, use names.',
      'Week four: replay to no-shows, conversations with attendees, then reset.'
    ],
    tasks: [
      'Promote for two full weeks to the Full List and in daily content.',
      'Run the workshop and close with the single invitation to the offer doc.',
      'Send the replay and open DM conversations with everyone who attended.',
      'Record attendance, completion, and conversations started.'
    ],
    deliverable: 'One completed event with attendance data and a list of live conversations.',
    doneWhen: 'Real conversations are happening in DMs with people who watched before they ever spoke to you.',
    coachingPrompt: 'How many attendees had already consumed hours of your content? That is the system working.',
    whereItFails: 'Cancelling for low registration. Run it for six people; the recording works for a year.',
    moduleNumber: '23',
    moduleTitle: 'EVENT DEBRIEF (MONTHLY · WITHIN 48 HOURS — PAGE 75)',
    fields: [
      { id: 'm23_date', section: 'Module 23 · Event Debrief (Run Within 48 Hours)', label: 'EVENT DATE', placeholder: 'e.g. November 18, 2026' },
      { id: 'm23_registrations', section: 'Module 23 · Event Debrief (Run Within 48 Hours)', label: 'REGISTRATIONS', placeholder: 'e.g. 64 registrations' },
      { id: 'm23_attendance', section: 'Module 23 · Event Debrief (Run Within 48 Hours)', label: 'ATTENDANCE', placeholder: 'e.g. 38 live attendees (59% show-up rate)' },
      { id: 'm23_completion', section: 'Module 23 · Event Debrief (Run Within 48 Hours)', label: 'COMPLETION RATE OF THE LIVE ASSET', placeholder: 'e.g. 84% completed the live 1-Page Matrix worksheet in the room' },
      { id: 'm23_dms', section: 'Module 23 · Event Debrief (Run Within 48 Hours)', label: 'DM CONVERSATIONS OPENED', placeholder: 'e.g. 19 DM threads opened · 11 Offer Docs sent' },
      { id: 'm23_landed', section: 'Module 23 · Event Debrief (Run Within 48 Hours)', label: 'WHAT LANDED', placeholder: 'Live walkthrough of the $5/day 25% ad sequence had chat blowing up...', multiline: true },
      { id: 'm23_dragged', section: 'Module 23 · Event Debrief (Run Within 48 Hours)', label: 'WHAT DRAGGED', placeholder: 'Spent 6 minutes too long on the opening backstory before getting to the worksheet...', multiline: true },
      { id: 'm23_change', section: 'Module 23 · Event Debrief (Run Within 48 Hours)', label: 'ONE CHANGE FOR NEXT MONTH', placeholder: 'Put the live worksheet link in chat at minute 05 instead of minute 20.', multiline: true }
    ]
  },

  // =========================================================================
  // LESSON 26 (W26 · MODULE 24: QUARTERLY REVIEW — ALL 14 PDF FIELDS + FIG 28)
  // =========================================================================
  {
    weekNumber: 26,
    code: 'L26',
    phase: 5,
    phaseName: 'PHASE 05 · CONVERSION (TURNING ATTENTION INTO CLIENTS)',
    title: 'REVIEW AND SET THE LOOP',
    subtitle: 'The build is finished. What remains is a rhythm that does not stop, and a quarterly review that keeps it honest.',
    lessonBullets: [
      'Daily short form, weekly long form, monthly event — permanently.',
      'The matrix refills once a quarter from the questions customers actually asked.',
      'The story bank grows continuously; every job is a candidate.'
    ],
    tasks: [
      'Compare today’s numbers to the week-one audit — minutes available, Full List size, conversations.',
      'Refill the matrix with next quarter’s five topics.',
      'Add every new story collected during production to the bank.',
      'Lock the three cadences into the calendar for the next twelve months.'
    ],
    deliverable: 'A next-quarter matrix, an updated story bank, and twelve months of cadence booked.',
    doneWhen: 'The next quarter requires no new decisions — only execution.',
    coachingPrompt: 'What did you learn about your customers this quarter that changes your messaging answers?',
    whereItFails: 'Treating the build as finished. The library grows or it decays.',
    moduleNumber: '24',
    moduleTitle: 'QUARTERLY REVIEW & THE WHOLE SYSTEM BY CADENCE (PAGES 76–79)',
    referenceFigures: [
      {
        figNumber: 'FIG. 28',
        title: 'THE WHOLE SYSTEM, BY CADENCE (PAGE 78)',
        caption: 'Four rhythms, one direction. Run the top three and the fourth is just maintenance. The two things to protect when everything gets busy: the daily post and the monthly event.',
        headers: ['CADENCE', 'SCHEDULE', 'FORMAT', 'MECHANISM', 'DESTINATION'],
        rows: [
          ['DAILY', 'Mon Signal · Tue Tension · Wed Proof · Thu Perspective · Fri Path', 'Short form shot for the format', 'ShiftCycle stage per day', 'Feeds the Full List'],
          ['WEEKLY', 'One Matrix Video, same day, same time', 'Long form on YouTube', 'Story pulled from the bank', 'Both CTAs attached'],
          ['MONTHLY', 'Announce · Run · Invite · Follow Up', 'One live conversion event', 'Invitation to the offer doc', 'DM conversations'],
          ['QUARTERLY', 'Review, Don’t Rebuild', 'Re-answer the 7 questions', 'Re-rank the 6 sequenced videos', 'Refresh the offer doc']
        ]
      }
    ],
    fields: [
      { id: 'm24_minutes_now', section: 'Module 24 · Quarterly Review vs. Module 01 (Pages 77–78)', label: 'MINUTES OF CONTENT AVAILABLE NOW (VS. MODULE 01)', placeholder: '435 minutes live vs. 9 minutes in Lesson 01' },
      { id: 'm24_fulllist_now', section: 'Module 24 · Quarterly Review vs. Module 01 (Pages 77–78)', label: 'FULL LIST SIZE NOW', placeholder: '8,900 warm 25%+ viewers' },
      { id: 'm24_convos_quarter', section: 'Module 24 · Quarterly Review vs. Module 01 (Pages 77–78)', label: 'CONVERSATIONS THIS QUARTER', placeholder: '112 qualified DM conversations' },
      { id: 'm24_learned', section: 'Module 24 · Quarterly Review vs. Module 01 (Pages 77–78)', label: 'WHAT WE LEARNED ABOUT CUSTOMERS THAT CHANGES THE MESSAGING ANSWERS', placeholder: 'Buyers cared even more about eliminating sales calls than lowering ad costs...', multiline: true },
      { id: 'm24_topic1', section: 'Next Quarter — Five New Topics', label: 'NEXT QUARTER · TOPIC 1', placeholder: 'New Topic 1 from real customer questions...' },
      { id: 'm24_topic2', section: 'Next Quarter — Five New Topics', label: 'NEXT QUARTER · TOPIC 2', placeholder: 'New Topic 2 from real customer questions...' },
      { id: 'm24_topic3', section: 'Next Quarter — Five New Topics', label: 'NEXT QUARTER · TOPIC 3', placeholder: 'New Topic 3 from real customer questions...' },
      { id: 'm24_topic4', section: 'Next Quarter — Five New Topics', label: 'NEXT QUARTER · TOPIC 4', placeholder: 'New Topic 4 from real customer questions...' },
      { id: 'm24_topic5', section: 'Next Quarter — Five New Topics', label: 'NEXT QUARTER · TOPIC 5', placeholder: 'New Topic 5 from real customer questions...' },
      { id: 'm24_new_stories', section: 'Next Quarter — Story Bank & Close-Out', label: 'NEW STORIES ADDED TO THE BANK', placeholder: 'List new client wins, turns, and lessons added this quarter...', multiline: true },
      { id: 'm24_changed_assumption', section: 'Next Quarter — Story Bank & Close-Out', label: 'CLOSE-OUT · WHAT CHANGED FROM OUR ORIGINAL ASSUMPTION?', placeholder: 'What surprised us over the 26 lessons...', multiline: true },
      { id: 'm24_unclear', section: 'Next Quarter — Story Bank & Close-Out', label: 'WHAT REMAINS UNCLEAR?', placeholder: 'Any open questions for next quarter...', multiline: true },
      { id: 'm24_owner', section: 'Next Quarter — Story Bank & Close-Out', label: 'WHO OWNS THE NEXT QUARTER', placeholder: 'Named operator & ops owner' },
      { id: 'm24_signoff', section: 'Next Quarter — Story Bank & Close-Out', label: 'COACH SIGN-OFF + DATE', placeholder: 'Signed off by Coach Josh Beechraft' }
    ]
  }
];
