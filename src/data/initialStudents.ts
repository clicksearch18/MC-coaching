import initialPlanJson from './initial_content_plan.json';
import { CORE_BRAND_VIDEOS_TEMPLATE } from './workbookData';
import { inferPillarIdForVideo } from '../utils/excelParser';
import {
  StudentProfile,
  SupportingVideoItem,
  PlaybookPillar,
  ShiftMagnet,
  AppEmailAndAdminSettings,
  EmailTemplateConfig,
  GroupDiscussionPost,
  UpcomingCoachingCall,
  CoachingCallReplay,
  CoachingResourceItem
} from '../types';

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
    dmHandoffScript: 'Hey [First Name]! Saw you commented AUDIT on today’s video — here is the 1-Page Pipeline Equity Scorecard: https://marketconcussion.com/audit-scorecard',
    publicCommentReply: 'Just sent the 1-Page Pipeline Audit straight to your DMs! Check your message requests.',
    dmDiagnosticQuestion: 'Quick question while you open it: are you currently focused on A) Fixing leaky ad funnels, B) Escaping referral-only spiky months, or C) Closing deals in DMs without sales calls?',
    dmBridgeScript: 'Got it — when operators score low on Section 2, it’s almost always because strangers haven’t consumed 7 hours of structured belief-shifting content yet. Want me to send over our 2-Page Offer Doc showing how we install the 25-video engine in 8 weeks?',
    sectionsSteps: '1. Current Time-on-Brand Calculator · 2. The 25% Ad Gate Check · 3. DM Handoff & Offer Doc Score',
    bridgeToOffer: 'Once they see their Time-on-Brand gap, invite them to review the 2-Page Super Signature Offer Doc.',
    hostedWhere: 'ManyChat / HighLevel Comment-to-DM Trigger ("AUDIT") + Notion 1-Pager',
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
    dmHandoffScript: 'Hey [First Name]! Grab the $5/Day Andromeda Wiring Guide right here: https://marketconcussion.com/5-dollar-wiring',
    publicCommentReply: 'Sent the $5/Day Andromeda Wiring Guide to your DMs! Let me know once you’ve got it.',
    dmDiagnosticQuestion: 'Curious — are you currently A) Running paid traffic to a VSL/webinar, B) Boosting posts randomly, or C) 100% organic right now?',
    dmBridgeScript: 'Makes total sense. The reason $5/day ThruPlay sequencing works so well is every 25% viewer rolls into one permanent Full List. If you want, I can share the 2-Page breakdown of how we wire all 6 sequenced videos for you.',
    sectionsSteps: '1. Pixel & Custom Audience Naming · 2. The V1–V6 25% Viewer Ladder · 3. The Master Full List Rollup',
    bridgeToOffer: 'Shows how the 6-video ad ladder works, then bridges to building the actual 25 videos together.',
    hostedWhere: 'ManyChat Keyword ("FIVE") + Google Drive / PDF Blueprint',
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
    dmHandoffScript: 'Hey [First Name]! Sending over the 2-Page Super Signature Offer Doc template now: https://marketconcussion.com/offer-doc-template',
    publicCommentReply: 'Just dropped the 2-Page Offer Doc template in your DMs!',
    dmDiagnosticQuestion: 'Quick context check so I can point you to the best example: is your core offer A) Under $3k, B) $3k–$15k, or C) $15k+?',
    dmBridgeScript: 'At that price point, a 2-Page Offer Doc works best when paired with a Monthly Conversion Workshop and 7 hours of pre-call video equity. Want to see how our own 2-Page Offer Doc is structured?',
    sectionsSteps: '1. Problem in Their Words & Named Mechanism · 2. Scope, Timeline & Shared Responsibilities · 3. Risk Reversal & 5-Minute First Step',
    bridgeToOffer: 'Demonstrates the exact 17-point Offer Doc framework from Lesson 24.',
    hostedWhere: 'Google Docs Template + Comment Keyword ("DOC")',
    status: 'Live'
  }
];

function buildPlaybook(): PlaybookPillar[] {
  return (initialPlanJson.playbook as PlaybookPillar[]).map(p => ({
    ...p,
    status: 'Not Started'
  }));
}

function buildSupportingVideos(playbook = buildPlaybook()): SupportingVideoItem[] {
  return (initialPlanJson.supporting as SupportingVideoItem[]).map((item, idx) => {
    const dayNum = idx + 1;
    return {
      ...item,
      dayNumber: dayNum,
      pillarId: item.pillarId || inferPillarIdForVideo(item.pillarStage, dayNum, playbook),
      selectedHook: 1,
      status: 'Not Started',
      attachedMagnetId: idx % 3 === 0 ? 'mag-1' : idx % 3 === 1 ? 'mag-2' : 'mag-3',
      videoUrl: undefined,
      completedAt: undefined
    };
  });
}

export const INITIAL_STUDENTS: StudentProfile[] = [
  {
    id: 'student-josh',
    name: 'Josh Beechraft',
    email: 'joshbmagic@gmail.com',
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

export const DEFAULT_APP_SETTINGS: AppEmailAndAdminSettings = {
  adminEmails: ['joshbmagic@gmail.com'],
  senderEmail: 'support@2mmshift.me',
  senderName: 'Josh Beechraft · 2mmShift',
  replyToEmail: 'support@2mmshift.me',
  smtpHost: 'smtp.resend.com',
  smtpPort: '465',
  smtpUser: 'support@2mmshift.me',
  templates: [
    {
      id: 'WELCOME_INVITE',
      name: '1. Student Onboarding & Studio Invite',
      supabaseType: 'Onboarding · Invite Template',
      subject: 'Welcome to Market Concussion — Your 2mmShift Studio Access',
      heading: 'WELCOME TO THE MACHINE, {{student_name}}.',
      body: 'Your personalized 50-Item Concussion Content plan, 15 Core Playbook Pillars, and Lesson {{lesson_number}} Workbook are live.\n\nUse your Access Code ({{access_code}}) or click below to enter your Studio and film Day #01 in under 10 minutes.',
      ctaText: 'ENTER YOUR STUDIO →',
      footerText: 'Sent by Josh Beechraft · 2mmShift Architect (support@2mmshift.me)'
    },
    {
      id: 'MAGIC_LINK',
      name: '2. Magic Link Sign-In',
      supabaseType: 'Sign-In · Magic Link Template',
      subject: 'Your 2mmShift Studio Sign-In Link',
      heading: 'UNLOCK YOUR 2MMSHIFT STUDIO.',
      body: 'Click the button below to sign directly into your Market Concussion Studio. No password required.',
      ctaText: 'SIGN IN TO STUDIO →',
      footerText: 'Sent by Josh Beechraft · 2mmShift Architect (support@2mmshift.me)'
    },
    {
      id: 'VIDEO_REVIEW',
      name: '3. Coach Video Review & Feedback Notes',
      supabaseType: 'Coaching Notification · Video Review Queue',
      subject: 'Coach Review [{{review_status}}]: {{video_title}}',
      heading: 'COACH JOSH REVIEWED YOUR VIDEO.',
      body: 'Video Reviewed: {{video_title}}\nDecision: {{review_status}}\n\nTHE SHIFT · COACH NOTES:\n"{{coach_notes}}"',
      ctaText: 'VIEW NOTES IN STUDIO →',
      footerText: 'Sent by Josh Beechraft · 2mmShift Architect (support@2mmshift.me)'
    },
    {
      id: 'DAILY_PROMPT',
      name: '4. Daily <10-Minute Concussion Content Prompt',
      supabaseType: 'Coaching Notification · Daily Studio Cadence',
      subject: 'Today’s <10-Min Video: {{video_title}}',
      heading: 'TODAY’S CONCUSSION CONTENT IS QUEUED.',
      body: 'Your next daily video ("{{video_title}}") is ready in your Studio with 3 pre-written hooks.\n\nPick Hook 1, 2, or 3, shoot in 5 takes (<10 mins), and paste your verified link.',
      ctaText: 'OPEN 10-MINUTE STUDIO →',
      footerText: 'Sent by Josh Beechraft · 2mmShift Architect (support@2mmshift.me)'
    },
    {
      id: 'MISSED_NUDGE',
      name: '5. Missed Video Accountability Nudge',
      supabaseType: 'Coaching Notification · Cadence Alert',
      subject: 'Quick Check-In: Let’s Protect Your Daily Cadence',
      heading: 'DON’T LET THE MACHINE COOL DOWN.',
      body: 'Hey {{student_name}} — noticed we haven’t logged your daily video link today. Remember: consistency beats perfection, and the 5-Takes Guide gets it done in under 10 minutes. Need help with the hook?',
      ctaText: 'RESUME DAILY CADENCE →',
      footerText: 'Sent by Josh Beechraft · 2mmShift Architect (support@2mmshift.me)'
    }
  ]
};

const escapeHtml = (unsafe: string): string =>
  String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export function buildBrandedEmailHtml(
  template: EmailTemplateConfig,
  senderName: string,
  senderEmail: string,
  variables?: Record<string, string>
): string {
  const replaceVars = (str: string) => {
    let out = escapeHtml(str);
    const defaults: Record<string, string> = {
      student_name: 'Operator',
      access_code: 'SHIFT-01',
      lesson_number: '01',
      video_title: 'Day #01: Your Core Belief Shift',
      review_status: '✓ APPROVED',
      coach_notes: 'Strong hook and clear delivery — approved for your $5/day ad sequence!',
      action_url: '{{ .ConfirmationURL }}',
      ...variables
    };
    for (const [k, v] of Object.entries(defaults)) {
      out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), escapeHtml(v));
    }
    return out;
  };

  const resolvedHeading = replaceVars(template.heading);
  const resolvedBody = replaceVars(template.body).replace(/\n/g, '<br/>');
  const resolvedCta = replaceVars(template.ctaText);
  const resolvedFooter = replaceVars(template.footerText);
  const rawActionUrl = variables?.action_url || '{{ .ConfirmationURL }}';
  const actionUrl =
    rawActionUrl === '{{ .ConfirmationURL }}' || /^https?:\/\//i.test(rawActionUrl)
      ? escapeHtml(rawActionUrl)
      : '#';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${replaceVars(template.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;color:#FFFFFF;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#040507;border:1px solid rgba(255,255,255,0.09);border-radius:16px;padding:36px 32px;">
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.07);">
              <img src="/2mmshift-logo-wide.png" alt="The 2mm Shift" width="150" style="display:block;height:auto;border:0;margin-bottom:8px;" />
              <div style="font-size:10px;font-weight:700;letter-spacing:0.22em;color:#8E95A5;text-transform:uppercase;">
                JOSH BEECHRAFT · 2MMSHIFT ARCHITECT · ${escapeHtml(senderEmail)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-top:28px;padding-bottom:16px;">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.2em;color:#09ADEF;text-transform:uppercase;margin-bottom:8px;">
                MARKET CONCUSSION STUDIO
              </div>
              <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:0.02em;text-transform:uppercase;color:#FFFFFF;line-height:1.15;">
                ${resolvedHeading}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:28px;">
              <div style="border-left:2px solid #09ADEF;padding-left:16px;font-size:14px;line-height:1.65;color:#E4E4E7;">
                ${resolvedBody}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <a href="${actionUrl}" style="display:inline-block;background-color:#09ADEF;color:#FFFFFF;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:8px;">
                ${resolvedCta}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-top:20px;border-top:1px solid rgba(255,255,255,0.07);font-size:11px;color:#71717A;line-height:1.5;">
              ${resolvedFooter}<br/>
              From: ${escapeHtml(senderName)} &lt;${escapeHtml(senderEmail)}&gt;
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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
    email: params.email?.trim() || '',
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

export const INITIAL_GROUP_POSTS: GroupDiscussionPost[] = [
  {
    id: 'group-welcome-pinned',
    type: 'GENERAL_THREAD',
    category: 'GENERAL',
    authorId: 'coach-josh',
    authorName: 'Coach Josh Beechraft',
    authorAvatar: 'JB',
    authorCompany: '2mmShift / Market Concussion',
    authorNiche: '2mmShift Architect',
    authorRole: 'COACH',
    title: 'Welcome to Discussion & Video Breakdowns',
    body: 'Use this space to learn from each other’s outputs in real time.\n\n1. When you verify a Daily Video (or Core Brand Video) in your Studio, keep "Post Link to Discussion" enabled — it notifies all students so everyone can see your hook and execution.\n2. When I review your video, my official Coach Feedback automatically appends right onto your video’s thread so everyone can study the breakdown.\n3. Jump into any thread below to discuss hooks, pacing, Shift Magnet CTAs, or start a general discussion!',
    timestamp: 'Pinned · Discussion',
    createdAtISO: '2026-10-15T12:00:00.000Z',
    pinned: true,
    reactions: {
      fire: ['student-josh'],
      shift: ['student-josh'],
      props: []
    },
    comments: []
  }
];

export const INITIAL_UPCOMING_CALL: UpcomingCoachingCall = {
  title: 'Weekly Cohort Coaching & Hot-Seat Breakdowns',
  dateTimeLabel: 'Thursdays · 2:00 PM EST',
  topic: 'Reviewing Student B1–B2 Core Videos, Tightening 3-Second Hooks & Live DM Handoff Audits',
  joinUrl: 'https://zoom.us/j/marketconcussion',
  hotSeatQuestions: [
    {
      id: 'hs-1',
      studentId: 'student-josh',
      studentName: 'Josh Beechraft',
      studentAvatar: 'JB',
      question: 'Drop any video link or DM thread you want reviewed live at the start of Thursday’s call.',
      timestamp: 'Pinned'
    }
  ]
};

export const INITIAL_CALL_REPLAYS: CoachingCallReplay[] = [
  {
    id: 'replay-1',
    title: 'Hot-Seat Review: Fixing Opening Hooks & Installing the 4-Take Recording Rhythm',
    dateLabel: 'Oct 16, 2026',
    duration: '52 mins',
    videoUrl: 'https://vimeo.com/76979871',
    summary: 'Live teardown of student Day 1–10 videos, how to cut the 2-second throat-clearing pause before Take 1, and transitioning cleanly into the Shift Magnet CTA.',
    timestamps: [
      { time: '00:10', label: 'Cutting the 2-second dead air before Take 1' },
      { time: '00:25', label: 'Rewriting weak "educational" hooks into belief-breakers' },
      { time: '00:45', label: 'Verbal Shift Magnet callout without sounding salesy' }
    ]
  },
  {
    id: 'replay-2',
    title: 'Wiring Your $5/Day Andromeda ThruPlay Ladder & 25% Invisible List',
    dateLabel: 'Oct 9, 2026',
    duration: '47 mins',
    videoUrl: 'https://vimeo.com/1084537',
    summary: 'Step-by-step screen share inside Meta Ads Manager setting up the 6-video sequenced ThruPlay campaign and custom 25% viewer retargeting audiences.',
    timestamps: [
      { time: '00:15', label: 'Naming conventions for V1–V6 Custom Audiences' },
      { time: '01:20', label: 'Excluding downstream viewers to force sequential consumption' },
      { time: '02:45', label: 'When to promote a Daily Video into the $5/day ad rotation' }
    ]
  },
  {
    id: 'replay-3',
    title: 'DM Handoff Clinic: Moving Commenters from Keyword Trigger to the 2-Page Offer Doc',
    dateLabel: 'Oct 2, 2026',
    duration: '58 mins',
    videoUrl: 'https://vimeo.com/347119375',
    summary: 'Real student DM inbox audits showing why prospects ghost after receiving the PDF and the exact 3-option diagnostic question that restarts the conversation.',
    timestamps: [
      { time: '00:08', label: 'The A/B/C diagnostic question that gets 65%+ replies' },
      { time: '00:30', label: 'Diagnosing when a lead is ready for the 2-Page Offer Doc' },
      { time: '00:50', label: 'Handling price questions asynchronously in DMs' }
    ]
  }
];

export const INITIAL_RESOURCES: CoachingResourceItem[] = [
  {
    id: 'res-1',
    title: 'The 2-Page Super Signature Offer Doc (Google Doc Template)',
    category: 'TEMPLATES',
    format: 'Google Doc Template',
    summary: 'Make-a-copy template with all 17 belief-shifting sections pre-formatted to close $3k–$30k deals in DMs without sales calls.',
    url: 'https://marketconcussion.com/offer-doc-template',
    featured: true
  },
  {
    id: 'res-2',
    title: '4-Take Smartphone Studio & Teleprompter Setup Checklist',
    category: 'TEMPLATES',
    format: '1-Page PDF Checklist',
    summary: 'Exact framing, eye-line, lighting, and 4-take punch-in checklist so you can shoot 3 daily videos in under 15 minutes.',
    url: 'https://marketconcussion.com/4-take-studio-checklist',
    featured: true
  },
  {
    id: 'res-3',
    title: 'VA / Video Editor Hand-Off SOP (Jump-Cuts & Captions)',
    category: 'TEMPLATES',
    format: 'Editor SOP Guide',
    summary: 'Send this directly to your editor so they know how to stitch your 4 takes, remove dead air, and format captions.',
    url: 'https://marketconcussion.com/editor-sop'
  },
  {
    id: 'res-4',
    title: 'Hall of Fame Swipe File: 25 Winning First-3-Second Hooks',
    category: 'SWIPE_FILES',
    format: 'Swipe Vault',
    summary: 'Real highest-retention student hooks broken down by Actionable, Analytical, Psychological, and Aspirational angles.',
    url: 'https://marketconcussion.com/winning-hooks-swipe',
    featured: true
  },
  {
    id: 'res-5',
    title: 'Booked-in-DMs Swipe File: 10 Real Comment-to-Close Thread Screenshots',
    category: 'SWIPE_FILES',
    format: 'Annotated Threads',
    summary: 'Word-for-word Instagram and Facebook DM threads showing the exact transition from keyword trigger to Offer Doc close.',
    url: 'https://marketconcussion.com/dm-threads-swipe'
  },
  {
    id: 'res-6',
    title: 'The $5/Day Andromeda Ad Manager Wiring Blueprint',
    category: 'TEMPLATES',
    format: 'Step-by-Step PDF',
    summary: 'Visual click-by-click guide for building your 25% video viewer retargeting pool and Master Full List rollup.',
    url: 'https://marketconcussion.com/5-dollar-wiring'
  },
  {
    id: 'res-7',
    title: 'Recommended Studio Gear & Teleprompter App Stack',
    category: 'TOOLS_GEAR',
    format: 'Gear & App List',
    summary: 'Our tested wireless mic (DJI Mic 2 / Rode), desk key light, phone mount, and captioning/teleprompter apps.',
    url: 'https://marketconcussion.com/studio-gear-stack'
  }
];



