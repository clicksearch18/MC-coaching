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

function buildSupportingVideos(): SupportingVideoItem[] {
  return (initialPlanJson.supporting as SupportingVideoItem[]).map((item, idx) => ({
    ...item,
    dayNumber: idx + 1,
    selectedHook: 1,
    status: 'Not Started',
    attachedMagnetId: idx % 3 === 0 ? 'mag-1' : idx % 3 === 1 ? 'mag-2' : 'mag-3',
    videoUrl: undefined,
    completedAt: undefined
  }));
}

function buildPlaybook(): PlaybookPillar[] {
  return (initialPlanJson.playbook as PlaybookPillar[]).map(p => ({
    ...p,
    status: 'Not Started'
  }));
}

export const INITIAL_STUDENTS: StudentProfile[] = [
  {
    id: 'student-josh',
    name: 'Josh Beechraft',
    email: 'josh@marketconcussion.com',
    accessCode: 'JOSH-01',
    company: '2mmShift / Market Concussion',
    avatar: 'JB',
    niche: 'B2B Client Acquisition & AI Systems',
    currentWeek: 1,
    currentPhase: 1,
    streakDays: 0,
    todayVideoStatus: 'PENDING',
    lastActive: 'Active',
    minutesAvailableBaseline: 0,
    minutesAvailableCurrent: 0,
    fullListSize: 0,
    dmConversationsWeekly: 0,
    tasksCompleted: {},
    worksheetAnswers: {},
    rubricScores: {},
    gateStatus: {
      1: 'OPEN',
      2: 'LOCKED',
      3: 'LOCKED',
      4: 'LOCKED',
      5: 'LOCKED'
    },
    playbook: buildPlaybook(),
    supportingVideos: buildSupportingVideos(),
    coreVideos: CORE_BRAND_VIDEOS_TEMPLATE.map(c => ({
      ...c,
      status: 'Not Started',
      videoUrl: undefined
    })),
    shiftMagnets: defaultShiftMagnets,
    messages: []
  }
];

export function createNewStudentProfile(params: {
  name: string;
  email?: string;
  accessCode?: string;
  company: string;
  niche: string;
  startingLesson?: number;
  coreTransformation?: string;
  coreBelief?: string;
  customPlaybook?: PlaybookPillar[];
  customSupportingVideos?: SupportingVideoItem[];
}): StudentProfile {
  const initials =
    params.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('') || 'ST';

  const firstWord = (params.name.split(' ')[0] || 'STUDENT').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const generatedCode =
    params.accessCode?.trim().toUpperCase() || `${firstWord}-${Math.floor(10 + Math.random() * 90)}`;

  const lesson = params.startingLesson || 1;
  const phase =
    lesson <= 4 ? 1 : lesson <= 8 ? 2 : lesson <= 18 ? 3 : lesson <= 22 ? 4 : 5;

  return {
    id: `student-${Date.now()}`,
    name: params.name.trim(),
    email: params.email?.trim() || `${firstWord.toLowerCase()}@client.com`,
    accessCode: generatedCode,
    company: params.company.trim(),
    avatar: initials,
    niche: params.niche.trim() || 'B2B Operator',
    currentWeek: lesson,
    currentPhase: phase,
    streakDays: 0,
    todayVideoStatus: 'PENDING',
    lastActive: 'Active',
    minutesAvailableBaseline: 0,
    minutesAvailableCurrent: 0,
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
        : buildPlaybook(),
    supportingVideos:
      params.customSupportingVideos && params.customSupportingVideos.length > 0
        ? params.customSupportingVideos
        : buildSupportingVideos(),
    coreVideos: CORE_BRAND_VIDEOS_TEMPLATE.map(c => ({ ...c, status: 'Not Started', videoUrl: undefined })),
    shiftMagnets: defaultShiftMagnets.map((m, i) => ({
      ...m,
      id: `mag-${Date.now()}-${i}`
    })),
    messages: []
  };
}
