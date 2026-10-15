import initialPlanJson from './initial_content_plan.json';
import { CORE_BRAND_VIDEOS_TEMPLATE } from './workbookData';
import { StudentProfile, SupportingVideoItem, PlaybookPillar, ShiftMagnet } from '../types';

const defaultShiftMagnets: ShiftMagnet[] = [
  {
    id: 'mag-1',
    workingTitle: 'The 7-Hour Pipeline Equity Audit (1-Page Scorecard)',
    version: 'v2.1',
    specificAudience: 'B2B Consultants & Agency Operators at $20k–$50k/mo',
    triggeringProblem: 'Posting daily social content that generates likes from peers but $0 in high-ticket pipeline.',
    promiseOneSentence: 'Score your current content footprint in 4 minutes and see exactly where your 7-11-4 Concussion Content is leaking.',
    beliefItShifts: 'More content does not create clients; consumption depth (7 hours on brand) does.',
    completionTime: '4 minutes',
    deliveryFormat: 'Checklist',
    keywordTrigger: 'AUDIT',
    trackingLink: 'https://marketconcussion.com/audit-scorecard',
    dmHandoffScript: 'Hey [First Name]! Saw you commented AUDIT on today’s video. Here is the 1-Page Pipeline Equity Scorecard. Quick question before you open it: are you currently relying mostly on referrals, or running paid traffic?',
    status: 'Live'
  },
  {
    id: 'mag-2',
    workingTitle: 'The $5/Day Andromeda Invisible List Wiring Guide',
    version: 'v1.4',
    specificAudience: 'Operators tired of $300+ booked call costs on Meta',
    triggeringProblem: 'Complex webinar funnels and landing pages losing 80% of paid traffic on day one.',
    promiseOneSentence: 'Copy our exact 6-video sequenced $5/day ad setup that builds a 25% video-viewer retargeting pool for pennies.',
    beliefItShifts: 'You do not need complex funnels or big budgets; $5/day goodwill video ads build an Invisible List on platform.',
    completionTime: '7 minutes',
    deliveryFormat: 'PDF',
    keywordTrigger: 'FIVE',
    trackingLink: 'https://marketconcussion.com/5-dollar-wiring',
    dmHandoffScript: 'Hey [First Name]! Grab the $5/Day Andromeda Wiring Guide right here. Curious — are you running any video view campaigns right now, or starting fresh?',
    status: 'Live'
  },
  {
    id: 'mag-3',
    workingTitle: 'The 2-Page Super Signature Offer Doc Template',
    version: 'v1.0',
    specificAudience: 'High-ticket founders who hate 60-minute sales calls',
    triggeringProblem: 'Forcing busy, high-agency buyers onto 60-minute pitch calls that feel like a trap.',
    promiseOneSentence: 'Write a silent 2-page offer document that closes $3k–$30k deals directly in the DMs without a sales call.',
    beliefItShifts: 'Sales calls are a trust verification failure; sophisticated buyers prefer to read a clear 2-page offer doc and self-checkout.',
    completionTime: '9 minutes',
    deliveryFormat: 'PDF',
    keywordTrigger: 'DOC',
    trackingLink: 'https://marketconcussion.com/offer-doc-template',
    dmHandoffScript: 'Hey [First Name]! Sending over the 2-Page Offer Doc template now. What price point is your core offer at right now?',
    status: 'Live'
  }
];

function buildSupportingVideos(completedCount: number): SupportingVideoItem[] {
  return (initialPlanJson.supporting as SupportingVideoItem[]).map((item, idx) => {
    const isDone = idx < completedCount;
    const isCurrent = idx === completedCount;
    return {
      ...item,
      dayNumber: idx + 1,
      selectedHook: ((idx % 3) + 1) as 1 | 2 | 3,
      status: isDone ? 'Completed' : isCurrent ? 'In Progress' : 'Not Started',
      attachedMagnetId: idx % 3 === 0 ? 'mag-1' : idx % 3 === 1 ? 'mag-2' : 'mag-3',
      videoUrl: isDone ? `https://instagram.com/reel/mcm-day-${idx + 1}` : undefined,
      completedAt: isDone ? `${completedCount - idx}d ago` : undefined
    };
  });
}

function buildPlaybook(completedCount: number): PlaybookPillar[] {
  return (initialPlanJson.playbook as PlaybookPillar[]).map((p, idx) => ({
    ...p,
    status: idx < completedCount ? 'Completed' : idx === completedCount ? 'In Progress' : 'Not Started'
  }));
}

export const INITIAL_STUDENTS: StudentProfile[] = [
  {
    id: 'student-josh',
    name: 'Josh Beechraft (Founder Cohort)',
    company: 'Market Concussion / The Brand Shift',
    avatar: 'JB',
    niche: 'B2B Client Acquisition & AI Systems',
    currentWeek: 4,
    currentPhase: 1,
    streakDays: 7,
    todayVideoStatus: 'PENDING',
    lastActive: 'Just now',
    minutesAvailableBaseline: 9,
    minutesAvailableCurrent: 165,
    fullListSize: 2840,
    dmConversationsWeekly: 19,
    tasksCompleted: {
      '1-0': true,
      '1-1': true,
      '1-2': true,
      '1-3': true,
      '2-0': true,
      '2-1': true,
      '2-2': true,
      '2-3': true,
      '3-0': true,
      '3-1': true,
      '3-2': true,
      '3-3': true,
      '4-0': true,
      '4-1': true
    },
    worksheetAnswers: {
      m01_minutes: '12 minutes — one 3-min overview, four 2-min reels',
      m01_audience: '4,200 followers, 1,100 email list, 2,840 Full List retargeting pool',
      m01_owner: 'Josh Beechraft (on camera) · Ops Team (publishing & ad sequencing)',
      m01_hours: 'Josh 3.5 hrs/wk · Ops 5 hrs/wk',
      m01_agreement: 'Agreed in writing: We optimize strictly for 7 hours on brand, 25% watch gates, and DM conversations first.',
      m02_q1_transformation: 'We install a compounding client acquisition engine underneath established operators so they turn scattered content into predictable high-ticket demand without sales calls.',
      m02_q2_frustrated: 'Posting daily social content that gets likes from competitors but $0.00 in high-ticket client pipeline.',
      m02_q2_overwhelmed: 'Leaky multi-step webinar funnels, $350+ booked call costs, and managing whiny sales closers.',
      m02_q2_sick_and_tired: 'Playing the referral lottery and not knowing where next month’s $30k clients are coming from.',
      m02_q3_increase: 'Pre-call brand consumption depth from 12 minutes to 7+ hours (the 7-11-4 benchmark).',
      m02_q3_reduce: 'Customer acquisition cost by 60% using $5/day Andromeda video view sequences.',
      m02_q3_improve: 'Inbound DM conversion velocity so buyers ask for the checkout link in 48 hours.',
      m02_q3_simplify: 'Daily content production down to a <10-minute Concussion Content with pre-written hooks.',
      m02_q3_optimize: 'High-ticket closing using a silent 2-page Super Signature Offer Document instead of 60-minute calls.',
      m02_q4_belief: 'More content does not create clients; consumption depth does. When a buyer spends 7 hours with your brand, sales calls become unnecessary.',
      m02_q5_story: 'We turned off a complex $150k/month webinar funnel that was bleeding 80% of traffic at the landing page, replaced it with $5/day sequenced video ads feeding a 2-step DM diagnostic, and signed 45 high-ticket clients in one month without a single sales call.',
      m02_q6_hook: 'The Market Concussion Machine (7 Hours on Brand Before Sales)',
      m02_q7_mechanism: 'S.H.I.F.T. Framework (Signal · Humanize · Illuminate · Formulate · Transfer) + DXY (Done-Accelerated-For-You)',
      m03_objection: '"I don’t have time to learn complex AI prompting, write scripts every morning, or manage Meta Ads Manager myself."',
      m03_illusion: '"Hiring a $4,000/month ad agency to write vanilla copy or building a 5-day challenge will scale my high-ticket offer."',
      m03_proof: '45 high-ticket clients signed in 30 days via a 2-page Offer Doc with zero sales calls, plus 1,256 qualified leads at $0.27 using a 1-page micromagnet.'
    },
    rubricScores: {
      '4-TRANSFORMATION': 'STRONG',
      '4-TENSION': 'STRONG',
      '4-SHIFT': 'STRONG',
      '4-BELIEF': 'STRONG',
      '4-STORY': 'STRONG',
      '4-HOOK': 'STRONG',
      '4-MECHANISM': 'STRONG'
    },
    gateStatus: {
      1: 'APPROVED',
      2: 'OPEN',
      3: 'OPEN',
      4: 'OPEN',
      5: 'OPEN'
    },
    playbook: buildPlaybook(3),
    supportingVideos: buildSupportingVideos(7),
    coreVideos: CORE_BRAND_VIDEOS_TEMPLATE,
    shiftMagnets: defaultShiftMagnets,
    messages: [
      {
        id: 'msg-1',
        senderRole: 'COACH',
        senderName: 'Coach Command',
        text: 'Welcome to Week 04! Your 50-item Concussion Content and 15 Core Playbook Pillars have been ingested.',
        timestamp: 'Yesterday · 9:15 AM'
      },
      {
        id: 'msg-2',
        senderRole: 'COACH',
        senderName: 'Coach Command',
        text: 'Your Day #08 video ("The Referral Lottery is Unpredictable Business Suicide") is queued up for today. Takes <10 mins — pick Hook 1, 2, or 3 and mark it done!',
        timestamp: 'Today · 8:00 AM',
        relatedVideoTitle: 'Day #08: The Referral Lottery is Unpredictable Business Suicide'
      }
    ]
  },
  {
    id: 'student-marcus',
    name: 'Marcus Vance',
    company: 'Vance RevOps Advisory',
    avatar: 'MV',
    niche: 'B2B HubSpot & RevOps Architecture',
    currentWeek: 10,
    currentPhase: 3,
    streakDays: 0,
    todayVideoStatus: 'MISSED',
    lastActive: '28 hours ago',
    minutesAvailableBaseline: 6,
    minutesAvailableCurrent: 95,
    fullListSize: 1120,
    dmConversationsWeekly: 8,
    tasksCompleted: {
      '1-0': true, '1-1': true, '1-2': true, '1-3': true,
      '2-0': true, '2-1': true, '2-2': true, '2-3': true,
      '9-0': true, '9-1': true, '9-2': true, '9-3': true
    },
    worksheetAnswers: {
      m01_minutes: '6 minutes — two LinkedIn videos',
      m02_q1_transformation: 'We give B2B SaaS CROs a single source of revenue truth in 21 days without ripping out their CRM.',
      m02_q4_belief: 'A messy CRM is not a software problem — it is a sales stage definition problem.'
    },
    rubricScores: {},
    gateStatus: { 1: 'APPROVED', 2: 'APPROVED', 3: 'OPEN', 4: 'LOCKED', 5: 'LOCKED' },
    playbook: buildPlaybook(2),
    supportingVideos: buildSupportingVideos(12).map((v, idx) =>
      idx === 12 ? { ...v, status: 'Missed' } : v
    ),
    coreVideos: CORE_BRAND_VIDEOS_TEMPLATE.map((c, i) => ({
      ...c,
      status: i === 0 ? 'In Progress' : 'Not Started'
    })),
    shiftMagnets: [defaultShiftMagnets[0]],
    messages: [
      {
        id: 'msg-m1',
        senderRole: 'SYSTEM',
        senderName: 'Cadence Alert',
        text: '⚠️ Missed daily video yesterday (Day #13: Invisibility is the Ultimate Margin Killer). Streak reset to 0.',
        timestamp: 'Today · 7:00 AM',
        isAlert: true
      }
    ]
  },
  {
    id: 'student-elena',
    name: 'Elena Rostova',
    company: 'Apex Executive Health',
    avatar: 'ER',
    niche: 'Concierge Longevity & Performance Medicine',
    currentWeek: 19,
    currentPhase: 4,
    streakDays: 18,
    todayVideoStatus: 'COMPLETED',
    lastActive: '22 mins ago',
    minutesAvailableBaseline: 14,
    minutesAvailableCurrent: 310,
    fullListSize: 5420,
    dmConversationsWeekly: 27,
    tasksCompleted: {
      '1-0': true, '1-1': true, '1-2': true, '1-3': true,
      '19-0': true, '19-1': true, '19-2': true, '19-3': true
    },
    worksheetAnswers: {
      m01_minutes: '14 minutes',
      m02_q1_transformation: 'We give 50-year-old founders their 32-year-old VO2 max and cognitive stamina back in 90 days.'
    },
    rubricScores: {},
    gateStatus: { 1: 'APPROVED', 2: 'APPROVED', 3: 'APPROVED', 4: 'OPEN', 5: 'LOCKED' },
    playbook: buildPlaybook(9),
    supportingVideos: buildSupportingVideos(24),
    coreVideos: CORE_BRAND_VIDEOS_TEMPLATE.map(c => ({ ...c, status: 'Completed' })),
    shiftMagnets: defaultShiftMagnets.slice(0, 2),
    messages: [
      {
        id: 'msg-e1',
        senderRole: 'STUDENT',
        senderName: 'Elena Rostova',
        text: 'Just uploaded Day #24 video in 6 minutes flat! Hook 2 is getting great comments already.',
        timestamp: 'Today · 9:42 AM'
      }
    ]
  },
  {
    id: 'student-devon',
    name: 'Devon Brooks',
    company: 'Keystone Basement Systems',
    avatar: 'DB',
    niche: 'Residential Structural Waterproofing',
    currentWeek: 7,
    currentPhase: 2,
    streakDays: 0,
    todayVideoStatus: 'MISSED',
    lastActive: '2 days ago',
    minutesAvailableBaseline: 9,
    minutesAvailableCurrent: 48,
    fullListSize: 1340,
    dmConversationsWeekly: 6,
    tasksCompleted: {
      '1-0': true, '1-1': true, '1-2': true, '1-3': true
    },
    worksheetAnswers: {
      m01_minutes: '9 minutes — one 2-min promo, three 90-sec FAQ clips, a 3-min testimonial',
      m02_q1_transformation: 'We give people back the bottom third of their house — permanently, and without them having to become an expert in water.',
      m02_q4_belief: 'Water in a basement is never a basement problem — it is a water-management problem, and anyone fixing only the basement will be back.'
    },
    rubricScores: {},
    gateStatus: { 1: 'APPROVED', 2: 'OPEN', 3: 'LOCKED', 4: 'LOCKED', 5: 'LOCKED' },
    playbook: buildPlaybook(1),
    supportingVideos: buildSupportingVideos(5).map((v, idx) =>
      idx === 5 ? { ...v, status: 'Missed' } : v
    ),
    coreVideos: CORE_BRAND_VIDEOS_TEMPLATE.map(c => ({ ...c, status: 'Not Started' })),
    shiftMagnets: [defaultShiftMagnets[0]],
    messages: [
      {
        id: 'msg-d1',
        senderRole: 'SYSTEM',
        senderName: 'Cadence Alert',
        text: '⚠️ Missed daily video for 48 hours (Day #06: Google’s 7-11-4 Rule). Needs coach check-in.',
        timestamp: 'Today · 8:30 AM',
        isAlert: true
      }
    ]
  }
];

export function createNewStudentProfile(params: {
  name: string;
  company: string;
  niche: string;
  startingLesson?: number;
  coreTransformation?: string;
  coreBelief?: string;
  customPlaybook?: PlaybookPillar[];
  customSupportingVideos?: SupportingVideoItem[];
}): StudentProfile {
  const initials = params.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'ST';

  const lesson = params.startingLesson || 1;
  const phase =
    lesson <= 4 ? 1 : lesson <= 8 ? 2 : lesson <= 18 ? 3 : lesson <= 22 ? 4 : 5;

  return {
    id: `student-${Date.now()}`,
    name: params.name.trim(),
    company: params.company.trim(),
    avatar: initials,
    niche: params.niche.trim() || 'B2B Operator',
    currentWeek: lesson,
    currentPhase: phase,
    streakDays: 0,
    todayVideoStatus: 'PENDING',
    lastActive: 'Just onboarded',
    minutesAvailableBaseline: 9,
    minutesAvailableCurrent: 9,
    fullListSize: 0,
    dmConversationsWeekly: 0,
    tasksCompleted: {},
    worksheetAnswers: {
      ...(params.coreTransformation ? { m02_q1_transformation: params.coreTransformation } : {}),
      ...(params.coreBelief ? { m02_q4_belief: params.coreBelief } : {})
    },
    rubricScores: {},
    gateStatus: {
      1: phase >= 1 ? 'OPEN' : 'LOCKED',
      2: phase >= 2 ? 'OPEN' : 'LOCKED',
      3: phase >= 3 ? 'OPEN' : 'LOCKED',
      4: phase >= 4 ? 'OPEN' : 'LOCKED',
      5: phase >= 5 ? 'OPEN' : 'LOCKED'
    },
    playbook:
      params.customPlaybook && params.customPlaybook.length > 0
        ? params.customPlaybook
        : buildPlaybook(0),
    supportingVideos:
      params.customSupportingVideos && params.customSupportingVideos.length > 0
        ? params.customSupportingVideos
        : buildSupportingVideos(0),
    coreVideos: CORE_BRAND_VIDEOS_TEMPLATE.map(c => ({ ...c, status: 'Not Started' })),
    shiftMagnets: defaultShiftMagnets.map((m, i) => ({
      ...m,
      id: `mag-${Date.now()}-${i}`
    })),
    messages: [
      {
        id: `msg-welcome-${Date.now()}`,
        senderRole: 'COACH',
        senderName: 'Coach Josh Beechraft',
        text: `Welcome to Market Concussion, ${params.name.split(' ')[0]}! Your personalized Concussion Content plan and Lesson ${lesson} Workbook are loaded and ready.`,
        timestamp: 'Just now'
      }
    ]
  };
}

