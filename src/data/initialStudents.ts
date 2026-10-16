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
  GroupDiscussionPost
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
      supabaseType: 'Supabase Auth · Invite User Template',
      subject: 'Welcome to Market Concussion — Your 2mmShift Studio Access',
      heading: 'WELCOME TO THE MACHINE, {{student_name}}.',
      body: 'Your personalized 50-Item Concussion Content plan, 15 Core Playbook Pillars, and Lesson {{lesson_number}} Workbook are live.\n\nUse your Access Code ({{access_code}}) or click below to enter your Studio and film Day #01 in under 10 minutes.',
      ctaText: 'ENTER YOUR STUDIO →',
      footerText: 'Sent by Josh Beechraft · 2mmShift Architect (support@2mmshift.me)'
    },
    {
      id: 'MAGIC_LINK',
      name: '2. Magic Link Sign-In',
      supabaseType: 'Supabase Auth · Magic Link Template',
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

export function buildBrandedEmailHtml(
  template: EmailTemplateConfig,
  senderName: string,
  senderEmail: string,
  variables?: Record<string, string>
): string {
  const replaceVars = (str: string) => {
    let out = str;
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
      out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), v);
    }
    return out;
  };

  const resolvedHeading = replaceVars(template.heading);
  const resolvedBody = replaceVars(template.body).replace(/\n/g, '<br/>');
  const resolvedCta = replaceVars(template.ctaText);
  const resolvedFooter = replaceVars(template.footerText);
  const actionUrl = variables?.action_url || '{{ .ConfirmationURL }}';

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
              <img src="https://mc-coaching-swart.vercel.app/2mmshift-logo-wide.png" alt="The 2mm Shift" width="150" style="display:block;height:auto;border:0;margin-bottom:8px;" />
              <div style="font-size:10px;font-weight:700;letter-spacing:0.22em;color:#8E95A5;text-transform:uppercase;">
                JOSH BEECHRAFT · 2MMSHIFT ARCHITECT · ${senderEmail}
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
              From: ${senderName} &lt;${senderEmail}&gt;
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


