export type VideoStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Missed';
export type CoachReviewStatus = 'Pending Review' | 'Approved' | 'Needs Revision';

export interface PlaybookPillar {
  id: string;
  stage: string;
  pillar: string;
  status: string;
  breaksBelief: string;
  installsBelief: string;
  mustHitBeats: string;
  angles: {
    actionable: string;
    analytical: string;
    psychological: string;
    aspirational: string;
  };
}

export interface SupportingVideoItem {
  id: string;
  dayNumber: number;
  pillarStage: string;
  title: string;
  hook1: string;
  hook2: string;
  hook3: string;
  selectedHook?: 1 | 2 | 3;
  customHook?: string;
  status: VideoStatus;
  videoUrl?: string;
  videoFileName?: string;
  attachedMagnetId?: string;
  completedAt?: string;
  completedDateISO?: string;
  notes?: string;
  coachReviewStatus?: CoachReviewStatus;
  coachFeedback?: string;
  coachReviewedAt?: string;
}

export interface CoreBrandVideo {
  id: string;
  code: 'B1' | 'B2' | 'B3' | 'B4' | 'B5';
  name: string;
  week: string;
  runtimeTarget: string;
  purpose: string;
  shiftStages: {
    S: string;
    H: string;
    I: string;
    F: string;
    T: string;
  };
  status: VideoStatus;
  videoUrl?: string;
  coachReviewStatus?: CoachReviewStatus;
  coachFeedback?: string;
  coachReviewedAt?: string;
  scriptDraft?: {
    S: string;
    H: string;
    I: string;
    F: string;
    T: string;
  };
}

export interface ShiftMagnet {
  id: string;
  workingTitle: string;
  version: string;
  specificAudience: string;
  triggeringProblem: string;
  promiseOneSentence: string;
  beliefItShifts: string;
  completionTime: string;
  deliveryFormat: 'PDF' | 'Checklist' | 'Video' | 'Audit' | 'Custom GPT' | 'Class';
  keywordTrigger: string;
  trackingLink: string;
  dmHandoffScript: string;
  status: 'Draft' | 'Live';
}

export interface WorkbookField {
  id: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  defaultValue?: string;
  workedExampleLabel?: string;
  section?: string;
}

export interface WorkbookRubricRow {
  criterion: string;
  weak: string;
  acceptable: string;
  strong: string;
}

export interface WorkbookReferenceFigure {
  figNumber: string;
  title: string;
  caption?: string;
  headers?: string[];
  rows?: string[][];
  cards?: { badge?: string; title: string; subtitle?: string; body: string }[];
}

export interface WorkbookWeek {
  weekNumber: number;
  code: string;
  phase: number;
  phaseName: string;
  title: string;
  subtitle: string;
  isPhaseGate?: boolean;
  isReuse?: boolean;
  reuseNote?: string;
  lessonBullets: string[];
  tasks: string[];
  deliverable: string;
  doneWhen: string;
  coachingPrompt: string;
  whereItFails: string;
  moduleNumber: string;
  moduleTitle: string;
  workedExample?: {
    company: string;
    title: string;
    items: { label: string; value: string }[];
  };
  referenceFigures?: WorkbookReferenceFigure[];
  editingQaChecklist?: { category: string; items: string[] }[];
  fields: WorkbookField[];
  rubric?: WorkbookRubricRow[];
}

export interface ChatMessageActionTarget {
  tab: 'CADENCE' | 'WORKBOOK' | 'MAGNETS';
  subTab?: 'STUDIO' | 'QUEUE' | 'CORE5' | 'PLAYBOOK';
  videoId?: string;
  coreVideoId?: string;
  lessonNumber?: number;
  label?: string;
}

export interface ChatMessage {
  id: string;
  senderRole: 'COACH' | 'STUDENT' | 'SYSTEM';
  senderName: string;
  text: string;
  timestamp: string;
  relatedVideoTitle?: string;
  isAlert?: boolean;
  readByStudent?: boolean;
  readByCoach?: boolean;
  actionTarget?: ChatMessageActionTarget;
}

export interface StudentProfile {
  id: string;
  name: string;
  email?: string;
  accessCode?: string;
  company: string;
  avatar: string;
  niche: string;
  currentWeek: number;
  currentPhase: number;
  streakDays: number;
  todayVideoStatus: 'COMPLETED' | 'PENDING' | 'MISSED';
  lastCompletedDateISO?: string;
  lastActive: string;
  minutesAvailableBaseline: number;
  minutesAvailableCurrent: number;
  fullListSize: number;
  dmConversationsWeekly: number;
  tasksCompleted: Record<string, boolean>;
  worksheetAnswers: Record<string, string>;
  rubricScores: Record<string, 'WEAK' | 'ACCEPTABLE' | 'STRONG'>;
  gateStatus: Record<number, 'LOCKED' | 'OPEN' | 'SUBMITTED' | 'APPROVED'>;
  playbook: PlaybookPillar[];
  supportingVideos: SupportingVideoItem[];
  coreVideos: CoreBrandVideo[];
  shiftMagnets: ShiftMagnet[];
  messages: ChatMessage[];
}

export interface EmailTemplateConfig {
  id: 'WELCOME_INVITE' | 'MAGIC_LINK' | 'VIDEO_REVIEW' | 'DAILY_PROMPT' | 'MISSED_NUDGE';
  name: string;
  supabaseType: string;
  subject: string;
  heading: string;
  body: string;
  ctaText: string;
  footerText: string;
}

export interface AppEmailAndAdminSettings {
  adminEmails: string[];
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  templates: EmailTemplateConfig[];
}

