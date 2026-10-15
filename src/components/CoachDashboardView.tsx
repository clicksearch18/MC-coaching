import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  MessageSquare,
  Send,
  Activity,
  Link2,
  Settings,
  Upload,
  Plus,
  Trash2,
  BookOpen,
  Award,
  Sparkles,
  RotateCcw,
  Mail,
  Download,
  Search,
  Copy
} from 'lucide-react';
import {
  StudentProfile,
  PlaybookPillar,
  SupportingVideoItem,
  CoachReviewStatus,
  AppEmailAndAdminSettings,
  EmailTemplateConfig,
  WorkbookWeek,
  ChatMessageActionTarget
} from '../types';
import { ModalDialog } from './ModalDialog';
import { parseStudentSpreadsheet, resolveMatchingPillar } from '../utils/excelParser';
import { buildBrandedEmailHtml, DEFAULT_APP_SETTINGS } from '../data/initialStudents';

interface CoachDashboardViewProps {
  students: StudentProfile[];
  lessons: WorkbookWeek[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  onPreviewStudentDashboard?: (studentId: string) => void;
  onAddStudent: (params: {
    name: string;
    email?: string;
    accessCode?: string;
    company: string;
    niche: string;
    startingLesson: number;
    coreTransformation: string;
    coreBelief: string;
    customPlaybook?: PlaybookPillar[];
    customSupportingVideos?: SupportingVideoItem[];
  }) => void;
  onUpdateStudentSpecifics: (
    studentId: string,
    updates: Partial<StudentProfile>,
    worksheetUpdates?: Record<string, string>
  ) => void;
  onAddCustomVideoToStudent: (
    studentId: string,
    video: {
      pillarId?: string;
      pillarStage: string;
      title: string;
      hook1: string;
      hook2: string;
      hook3: string;
    }
  ) => void;
  onEditStudentVideo?: (
    studentId: string,
    videoId: string,
    updates: Partial<SupportingVideoItem>
  ) => void;
  onDeleteStudentVideo?: (studentId: string, videoId: string) => void;
  onDeleteStudent: (studentId: string) => void;
  onSendMessage: (studentId: string, text: string, triggerPush?: boolean) => void;
  onMarkMessagesRead?: (studentId: string) => void;
  onNavigateFromChatAction?: (studentId: string, target: ChatMessageActionTarget) => void;
  onReviewStudentVideo: (
    studentId: string,
    videoType: 'SUPPORTING' | 'CORE',
    videoId: string,
    reviewStatus: CoachReviewStatus,
    feedback: string
  ) => void;
  onTriggerMissedAlertPush: (student: StudentProfile) => void;
  onApproveGate: (studentId: string, phaseNum: number) => void;
  onRequestGateRevision?: (studentId: string, phaseNum: number, feedback?: string) => void;
  onToggleStudentTask?: (studentId: string, lessonNumber: number, taskIdx: number) => void;
  onOpenImportModal: () => void;
  appSettings?: AppEmailAndAdminSettings;
  onUpdateAppSettings?: React.Dispatch<React.SetStateAction<AppEmailAndAdminSettings>>;
}

const QUICK_FOLLOWUP_TEMPLATES = [
  "Hey! Looks like we missed our daily video today — need any help with the hook or shooting setup?",
  "Quick check-in: your Day video is queued up in your Concussion Content (<10 mins). Drop your social link once it's live!",
  "Just reviewed your Workbook Messaging Canvas — strong Core Belief! Ready to clear your Phase Gate.",
  "Awesome streak this week! Keep protecting the daily post and the monthly event."
];

const QUICK_REVIEW_NOTES = [
  "Strong hook & delivery — approved!",
  "Great energy! Tighten the first 3 seconds on the opening hook next time.",
  "Make sure to verbally call out the Shift Magnet keyword at the end.",
  "Pacing and framing are spot on — ready for $5/day Andromeda boost."
];

export const CoachDashboardView: React.FC<CoachDashboardViewProps> = ({
  students,
  lessons,
  selectedStudentId,
  onSelectStudent,
  onPreviewStudentDashboard,
  onAddStudent,
  onUpdateStudentSpecifics,
  onAddCustomVideoToStudent,
  onEditStudentVideo,
  onDeleteStudentVideo,
  onDeleteStudent,
  onSendMessage,
  onMarkMessagesRead,
  onNavigateFromChatAction,
  onReviewStudentVideo,
  onTriggerMissedAlertPush,
  onApproveGate,
  onRequestGateRevision,
  onToggleStudentTask,
  onOpenImportModal,
  appSettings = DEFAULT_APP_SETTINGS,
  onUpdateAppSettings
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [coachSubTab, setCoachSubTab] = useState<
    'SETUP' | 'MESSAGE' | 'LINKS' | 'TELEMETRY' | 'SETTINGS'
  >('SETUP');
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilter, setRosterFilter] = useState<'ALL' | 'UNREAD' | 'REVIEW' | 'GATE' | 'DUE'>(
    'ALL'
  );
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<EmailTemplateConfig['id']>('WELCOME_INVITE');
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [reviewScope, setReviewScope] = useState<'STUDENT' | 'ALL'>('ALL');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REVISION'>('ALL');
  const [expandedReviewKey, setExpandedReviewKey] = useState<string | null>(null);
  const [reviewDraftNotes, setReviewDraftNotes] = useState<Record<string, string>>({});
  const [reviewDraftStatus, setReviewDraftStatus] = useState<Record<string, CoachReviewStatus>>({});

  // New Student Onboarding Modal State
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAccessCode, setNewAccessCode] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newNiche, setNewNiche] = useState('');
  const [newStartingLesson, setNewStartingLesson] = useState(1);
  const [newTransformation, setNewTransformation] = useState('');
  const [newBelief, setNewBelief] = useState('');
  const [newParsedPlaybook, setNewParsedPlaybook] = useState<PlaybookPillar[] | undefined>(undefined);
  const [newParsedSupporting, setNewParsedSupporting] = useState<SupportingVideoItem[] | undefined>(undefined);
  const [newUploadStatus, setNewUploadStatus] = useState<string | null>(null);

  const activeStudent = students.find(s => s.id === selectedStudentId) || students[0];
  const defaultFirstPillar = activeStudent?.playbook?.[0];
  const defaultStageLabel = defaultFirstPillar
    ? `${defaultFirstPillar.stage.split('—')[0].trim()} (${defaultFirstPillar.pillar})`
    : '1. Unaware Stage (Content)';

  // Add or Edit Single Custom Video State
  const [editingVideoId, setEditingVideoId] = useState<string>('NEW');
  const [customVideoTitle, setCustomVideoTitle] = useState('');
  const [customVideoPillarId, setCustomVideoPillarId] = useState<string>(
    defaultFirstPillar?.id || 'pillar-1'
  );
  const [customVideoStage, setCustomVideoStage] = useState(defaultStageLabel);
  const [customHook1, setCustomHook1] = useState('');
  const [customHook2, setCustomHook2] = useState('');
  const [customHook3, setCustomHook3] = useState('');
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState(false);
  const [confirmDeleteVideo, setConfirmDeleteVideo] = useState(false);

  // Workbook Lesson Inspector State (in TELEMETRY tab)
  const [inspectLessonNum, setInspectLessonNum] = useState<number>(activeStudent?.currentWeek || 1);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInspectLessonNum(activeStudent?.currentWeek || 1);
    setEditingVideoId('NEW');
    setConfirmDeleteStudent(false);
    setConfirmDeleteVideo(false);
    setCustomVideoTitle('');
    const firstP = activeStudent?.playbook?.[0];
    setCustomVideoPillarId(firstP?.id || 'pillar-1');
    setCustomVideoStage(
      firstP ? `${firstP.stage.split('—')[0].trim()} (${firstP.pillar})` : '1. Unaware Stage (Content)'
    );
    setCustomHook1('');
    setCustomHook2('');
    setCustomHook3('');
  }, [activeStudent?.id]);

  // Auto-mark student messages as read when Coach views MESSAGE tab, and scroll to bottom
  useEffect(() => {
    if (coachSubTab === 'MESSAGE' && activeStudent) {
      const hasUnreadFromStudent = activeStudent.messages.some(
        m => m.senderRole === 'STUDENT' && m.readByCoach === false
      );
      if (hasUnreadFromStudent && onMarkMessagesRead) {
        onMarkMessagesRead(activeStudent.id);
      }
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  }, [coachSubTab, activeStudent?.id, activeStudent?.messages.length, onMarkMessagesRead]);

  const onCadenceCount = students.filter(s => s.todayVideoStatus === 'COMPLETED').length;
  const pendingCount = students.filter(s => s.todayVideoStatus === 'PENDING').length;
  const missedCount = students.filter(s => s.todayVideoStatus === 'MISSED').length;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    onSendMessage(activeStudent.id, messageInput.trim(), true);
    setMessageInput('');
  };

  const handleNewStudentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setNewUploadStatus('Parsing student .xlsx content plan...');
      const parsed = await parseStudentSpreadsheet(file);
      setNewParsedPlaybook(parsed.playbook);
      setNewParsedSupporting(parsed.supporting);
      setNewUploadStatus(
        `✓ Loaded ${parsed.playbook.length} Playbook Pillars & ${parsed.supporting.length} Daily Concussion Content Videos from "${file.name}"`
      );
    } catch (err) {
      setNewUploadStatus(`Error parsing spreadsheet: ${err instanceof Error ? err.message : 'Invalid file'}`);
    }
  };

  const handleCreateStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCompany.trim()) return;
    onAddStudent({
      name: newName,
      email: newEmail,
      accessCode: newAccessCode,
      company: newCompany,
      niche: newNiche,
      startingLesson: newStartingLesson,
      coreTransformation: newTransformation,
      coreBelief: newBelief,
      customPlaybook: newParsedPlaybook,
      customSupportingVideos: newParsedSupporting
    });
    setNewName('');
    setNewEmail('');
    setNewAccessCode('');
    setNewCompany('');
    setNewNiche('');
    setNewStartingLesson(1);
    setNewTransformation('');
    setNewBelief('');
    setNewParsedPlaybook(undefined);
    setNewParsedSupporting(undefined);
    setNewUploadStatus(null);
    setShowAddStudentModal(false);
  };

  const handleSelectVideoToEdit = (videoId: string) => {
    setEditingVideoId(videoId);
    setConfirmDeleteVideo(false);
    if (videoId === 'NEW') {
      setCustomVideoTitle('');
      const firstP = activeStudent.playbook[0];
      setCustomVideoPillarId(firstP?.id || 'pillar-1');
      setCustomVideoStage(
        firstP ? `${firstP.stage.split('—')[0].trim()} (${firstP.pillar})` : '1. Unaware Stage (Content)'
      );
      setCustomHook1('');
      setCustomHook2('');
      setCustomHook3('');
      return;
    }
    const existing = activeStudent.supportingVideos.find(v => v.id === videoId);
    if (existing) {
      setCustomVideoTitle(existing.title);
      const matchedPillar = resolveMatchingPillar(existing, activeStudent.playbook);
      setCustomVideoPillarId(existing.pillarId || matchedPillar?.id || 'pillar-1');
      setCustomVideoStage(existing.pillarStage);
      setCustomHook1(existing.hook1);
      setCustomHook2(existing.hook2);
      setCustomHook3(existing.hook3);
    }
  };

  const handleAddOrUpdateCustomVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customVideoTitle.trim() || !customHook1.trim()) return;

    if (editingVideoId !== 'NEW' && onEditStudentVideo) {
      onEditStudentVideo(activeStudent.id, editingVideoId, {
        pillarId: customVideoPillarId,
        pillarStage: customVideoStage,
        title: customVideoTitle.trim(),
        hook1: customHook1.trim(),
        hook2: customHook2.trim() || customHook1.trim(),
        hook3: customHook3.trim() || customHook1.trim()
      });
      setSaveBanner(`Updated daily video & hooks for ${activeStudent.name}!`);
      setTimeout(() => setSaveBanner(null), 3500);
      return;
    }

    onAddCustomVideoToStudent(activeStudent.id, {
      pillarId: customVideoPillarId,
      pillarStage: customVideoStage,
      title: customVideoTitle.trim(),
      hook1: customHook1.trim(),
      hook2: customHook2.trim() || customHook1.trim(),
      hook3: customHook3.trim() || customHook1.trim()
    });
    setCustomVideoTitle('');
    setCustomHook1('');
    setCustomHook2('');
    setCustomHook3('');
    setSaveBanner('Added new daily video + hooks to this student’s Concussion Content queue!');
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const buildStudentReviewItems = useCallback((st: StudentProfile) => {
    const dailyItems = st.supportingVideos
      .filter(v => v.status === 'Completed')
      .slice()
      .reverse()
      .map(v => ({
        key: `${st.id}-SUPPORTING-${v.id}`,
        studentId: st.id,
        studentName: st.name,
        studentCompany: st.company,
        videoType: 'SUPPORTING' as const,
        videoId: v.id,
        badge: `DAY #${String(v.dayNumber).padStart(2, '0')}`,
        stage: v.pillarStage,
        title: v.title,
        hookUsed:
          v.customHook ||
          (v.selectedHook === 2 ? v.hook2 : v.selectedHook === 3 ? v.hook3 : v.hook1),
        videoUrl: v.videoUrl,
        completedAt: v.completedAt || 'Completed',
        reviewStatus: (v.coachReviewStatus || 'Pending Review') as CoachReviewStatus,
        coachFeedback: v.coachFeedback || '',
        coachReviewedAt: v.coachReviewedAt
      }));

    const coreItems = st.coreVideos
      .filter(c => c.status === 'Completed')
      .map(c => ({
        key: `${st.id}-CORE-${c.id}`,
        studentId: st.id,
        studentName: st.name,
        studentCompany: st.company,
        videoType: 'CORE' as const,
        videoId: c.id,
        badge: `CORE ${c.code}`,
        stage: c.week,
        title: c.name,
        hookUsed: c.purpose,
        videoUrl: c.videoUrl,
        completedAt: 'Core Brand Video',
        reviewStatus: (c.coachReviewStatus || 'Pending Review') as CoachReviewStatus,
        coachFeedback: c.coachFeedback || '',
        coachReviewedAt: c.coachReviewedAt
      }));

    return [...dailyItems, ...coreItems];
  }, []);

  const reviewItemsByStudentId = useMemo(() => {
    const map: Record<string, ReturnType<typeof buildStudentReviewItems>> = {};
    for (const st of students) {
      map[st.id] = buildStudentReviewItems(st);
    }
    return map;
  }, [students, buildStudentReviewItems]);

  const allCohortReviewItems = useMemo(
    () => students.flatMap(st => reviewItemsByStudentId[st.id] || []),
    [students, reviewItemsByStudentId]
  );

  const activeStudentReviewItems = useMemo(
    () => reviewItemsByStudentId[activeStudent.id] || [],
    [reviewItemsByStudentId, activeStudent.id]
  );

  const scopedReviewItems = reviewScope === 'ALL' ? allCohortReviewItems : activeStudentReviewItems;

  const pendingReviewTotal = useMemo(
    () => allCohortReviewItems.filter(i => i.reviewStatus === 'Pending Review').length,
    [allCohortReviewItems]
  );

  const rosterSummariesById = useMemo(() => {
    const map: Record<
      string,
      {
        doneVideos: number;
        unread: number;
        pendingReviews: number;
        submittedGate: number | undefined;
      }
    > = {};
    for (const st of students) {
      const items = reviewItemsByStudentId[st.id] || [];
      map[st.id] = {
        doneVideos: st.supportingVideos.filter(v => v.status === 'Completed').length,
        unread: st.messages.filter(m => m.senderRole === 'STUDENT' && m.readByCoach === false).length,
        pendingReviews: items.filter(i => i.reviewStatus === 'Pending Review').length,
        submittedGate: [1, 2, 3, 4, 5].find(
          p =>
            st.gateStatus?.[p] === 'SUBMITTED' ||
            st.worksheetAnswers[`phase_gate_status_${p}`] === 'SUBMITTED'
        )
      };
    }
    return map;
  }, [students, reviewItemsByStudentId]);

  const activeUnreadMessagesCount = rosterSummariesById[activeStudent.id]?.unread || 0;

  const submittedGatePhases = useMemo(
    () =>
      [1, 2, 3, 4, 5].filter(
        p =>
          activeStudent.gateStatus?.[p] === 'SUBMITTED' ||
          activeStudent.worksheetAnswers[`phase_gate_status_${p}`] === 'SUBMITTED'
      ),
    [activeStudent.gateStatus, activeStudent.worksheetAnswers]
  );
  const targetPhaseToApprove = submittedGatePhases[0] || activeStudent.currentPhase;

  const filteredReviewItems = useMemo(
    () =>
      scopedReviewItems.filter(item => {
        if (reviewFilter === 'PENDING') return item.reviewStatus === 'Pending Review';
        if (reviewFilter === 'APPROVED') return item.reviewStatus === 'Approved';
        if (reviewFilter === 'REVISION') return item.reviewStatus === 'Needs Revision';
        return true;
      }),
    [scopedReviewItems, reviewFilter]
  );

  const inspectedLesson =
    lessons.find(l => l.weekNumber === inspectLessonNum) || lessons[0];

  const filteredRosterStudents = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    return students.filter(st => {
      if (q) {
        const matchesQuery =
          st.name.toLowerCase().includes(q) ||
          st.company.toLowerCase().includes(q) ||
          st.niche.toLowerCase().includes(q) ||
          (st.email || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      const sum = rosterSummariesById[st.id];
      if (rosterFilter === 'UNREAD') return (sum?.unread || 0) > 0;
      if (rosterFilter === 'REVIEW') return (sum?.pendingReviews || 0) > 0;
      if (rosterFilter === 'GATE') return Boolean(sum?.submittedGate);
      if (rosterFilter === 'DUE') return st.todayVideoStatus !== 'COMPLETED';
      return true;
    });
  }, [students, rosterSearch, rosterFilter, rosterSummariesById]);

  const handleExportCohortCsv = useCallback(() => {
    const headers = [
      'Student Name',
      'Company',
      'Email',
      'Access Code',
      'Niche',
      'Current Lesson',
      'Current Phase',
      'Today Status',
      'Streak Days',
      'Videos Completed',
      'Total Videos',
      'Shift Magnets',
      'Unread From Student'
    ];
    const escapeCsv = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const rows = students.map(st => {
      const sum = rosterSummariesById[st.id];
      return [
        st.name,
        st.company,
        st.email || '',
        st.accessCode || '',
        st.niche,
        st.currentWeek,
        st.currentPhase,
        st.todayVideoStatus,
        st.streakDays,
        sum?.doneVideos || 0,
        st.supportingVideos.length,
        st.shiftMagnets.length,
        sum?.unread || 0
      ]
        .map(escapeCsv)
        .join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `market-concussion-cohort-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSaveBanner(`Exported cohort CSV (${students.length} students).`);
    setTimeout(() => setSaveBanner(null), 3500);
  }, [students, rosterSummariesById]);

  const handleBatchNudgeAllDue = useCallback(() => {
    const dueStudents = students.filter(s => s.todayVideoStatus !== 'COMPLETED');
    if (dueStudents.length === 0) {
      onTriggerMissedAlertPush(activeStudent);
      setSaveBanner(`Sent daily cadence alert to ${activeStudent.name}!`);
      setTimeout(() => setSaveBanner(null), 3500);
      return;
    }
    dueStudents.forEach(st => {
      onTriggerMissedAlertPush(st);
    });
    onSelectStudent(dueStudents[0].id);
    setCoachSubTab('MESSAGE');
    setSaveBanner(
      `Sent daily cadence nudge & push notification to ${dueStudents.length} due/missed operator${
        dueStudents.length === 1 ? '' : 's'
      }!`
    );
    setTimeout(() => setSaveBanner(null), 3500);
  }, [students, activeStudent, onTriggerMissedAlertPush, onSelectStudent]);

  const handleChatActionClick = (target: ChatMessageActionTarget) => {
    if (target.videoId || target.coreVideoId) {
      setCoachSubTab('LINKS');
      setReviewScope('STUDENT');
      const key = target.videoId
        ? `${activeStudent.id}-SUPPORTING-${target.videoId}`
        : `${activeStudent.id}-CORE-${target.coreVideoId}`;
      setExpandedReviewKey(key);
      return;
    }
    if (target.lessonNumber) {
      setInspectLessonNum(target.lessonNumber);
      setCoachSubTab('TELEMETRY');
      return;
    }
    if (onNavigateFromChatAction) {
      onNavigateFromChatAction(activeStudent.id, target);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Sleek KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">ACTIVE COHORT</div>
            <div className="font-display text-2xl sm:text-3xl text-white mt-0.5">{students.length} OPERATORS</div>
          </div>
          <span className="badge-2mm px-2.5 py-1 rounded-full text-xs">
            {students.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCoachSubTab('LINKS')}
          className="glass-panel rounded-2xl p-4 flex items-center justify-between text-left hover:border-[#09ADEF]/50 transition-all cursor-pointer"
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">VIDEO REVIEW QUEUE</div>
            <div className="font-display text-2xl sm:text-3xl text-white mt-0.5">
              {pendingReviewTotal > 0 ? `${pendingReviewTotal} TO REVIEW` : `${allCohortReviewItems.length} COMPLETED`}
            </div>
          </div>
          <span className="badge-2mm px-2.5 py-1 rounded-full text-[10px]">
            Open Queue
          </span>
        </button>

        <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">POSTED TODAY</div>
            <div className="font-display text-2xl sm:text-3xl text-[#09ADEF] mt-0.5">{onCadenceCount} VERIFIED</div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-[#09ADEF] shadow-[0_0_12px_#09ADEF]" />
        </div>

        <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-400">MISSED / DUE</div>
            <div className="font-display text-2xl sm:text-3xl text-white mt-0.5">
              {missedCount > 0 ? `${missedCount} MISSED` : `${pendingCount} DUE`}
            </div>
          </div>
          <button
            type="button"
            onClick={handleBatchNudgeAllDue}
            className="px-2.5 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider text-rose-300 cursor-pointer shrink-0"
            title="Send push & chat cadence nudge to all due/missed students"
          >
            {missedCount + pendingCount > 1
              ? `Nudge All (${missedCount + pendingCount})`
              : 'Alert'}
          </button>
        </div>
      </div>

      {/* Mobile-Only Compact Student Switcher Bar */}
      <div className="lg:hidden glass-panel rounded-xl p-2.5 flex items-center justify-between gap-2">
        <select
          id="mobile-student-select"
          value={activeStudent.id}
          onChange={e => onSelectStudent(e.target.value)}
          className="flex-1 min-w-0 rounded-lg bg-black border border-white/15 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#09ADEF]"
        >
          {students.map(st => {
            const unread = rosterSummariesById[st.id]?.unread || 0;
            return (
              <option key={st.id} value={st.id}>
                {st.name} ({st.company}) · Lesson {st.currentWeek}{unread > 0 ? ` · 💬 ${unread} New` : ''}
              </option>
            );
          })}
        </select>
        <button
          type="button"
          onClick={() => setShowAddStudentModal(true)}
          className="px-3 py-2 rounded-lg btn-2mm text-[10px] shrink-0 cursor-pointer"
        >
          + New
        </button>
        {onPreviewStudentDashboard && (
          <button
            type="button"
            onClick={() => onPreviewStudentDashboard(activeStudent.id)}
            className="px-2.5 py-2 rounded-lg bg-[#0A0C10] border border-white/15 text-neutral-200 text-[11px] font-semibold shrink-0 cursor-pointer"
          >
            Preview
          </button>
        )}
      </div>

      {/* Main Split: Left Student Roster (Desktop) + Right Focused Student Admin & Coaching Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 4 Cols: Sleek Sticky Scrollable Student Roster + Search/Filter (Desktop Only) */}
        <div className="hidden lg:flex lg:flex-col lg:col-span-4 glass-panel rounded-2xl p-4 space-y-2.5 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)]">
          <div className="px-1 py-0.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
              STUDENT ROSTER ({filteredRosterStudents.length}/{students.length})
            </span>
            <button
              type="button"
              onClick={() => setShowAddStudentModal(true)}
              className="badge-2mm px-2.5 py-1 rounded-full text-[9px] flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Student
            </button>
          </div>

          {/* Search & Quick Filter Pills */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={rosterSearch}
                onChange={e => setRosterSearch(e.target.value)}
                placeholder="Search student, company, niche..."
                className="w-full rounded-xl bg-[#040507] border border-white/10 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#09ADEF]"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'UNREAD', label: 'Unread 💬' },
                  { id: 'REVIEW', label: 'Review 🎬' },
                  { id: 'GATE', label: 'Gate ◆' },
                  { id: 'DUE', label: 'Due/Missed' }
                ] as const
              ).map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRosterFilter(f.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 cursor-pointer border transition-all ${
                    rosterFilter === f.id
                      ? 'bg-[#09ADEF] text-white border-[#09ADEF]'
                      : 'bg-[#040507] text-neutral-400 border-white/8 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
            {filteredRosterStudents.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#040507] border border-white/8 text-center text-xs text-neutral-400">
                No students match this filter.
              </div>
            ) : (
              filteredRosterStudents.map(st => {
                const isSelected = st.id === activeStudent.id;
                const summary = rosterSummariesById[st.id];
                const doneVideos = summary?.doneVideos || 0;
                const stUnread = summary?.unread || 0;
                const stPendingReviews = summary?.pendingReviews || 0;
                const stSubmittedGate = summary?.submittedGate;

                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onSelectStudent(st.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#09ADEF]/10 border-[#09ADEF] text-white shadow-[0_8px_28px_rgba(9,173,239,0.12)]'
                        : 'bg-[#040507] border-white/[0.06] hover:border-white/15 text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 rounded-xl bg-[#09ADEF]/15 border border-[#09ADEF]/30 flex items-center justify-center font-bold text-sm text-[#09ADEF] shrink-0">
                          {st.avatar}
                          {stUnread > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
                              {stUnread}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{st.name}</div>
                          <div className="text-xs text-neutral-400 truncate">{st.company}</div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          st.todayVideoStatus === 'COMPLETED'
                            ? 'badge-2mm'
                            : st.todayVideoStatus === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {st.todayVideoStatus === 'COMPLETED'
                          ? 'Posted'
                          : st.todayVideoStatus === 'PENDING'
                          ? 'Pending'
                          : 'Missed'}
                      </span>
                    </div>

                    {(stUnread > 0 || stPendingReviews > 0 || stSubmittedGate) && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {stUnread > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/40 text-[10px] font-bold text-sky-300">
                            💬 {stUnread} Unread
                          </span>
                        )}
                        {stPendingReviews > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-[10px] font-bold text-amber-300">
                            🎬 {stPendingReviews} To Review
                          </span>
                        )}
                        {stSubmittedGate && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300">
                            ◆ Gate 0{stSubmittedGate} Ready
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-neutral-400 mt-3 pt-2.5 border-t border-white/[0.06]">
                      <span>Lesson {st.currentWeek} · Phase {st.currentPhase}</span>
                      <span>{st.streakDays}d Streak</span>
                      <span className="text-[#09ADEF] font-semibold">
                        {doneVideos}/{st.supportingVideos.length} Videos
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right 8 Cols: Selected Student Workspace with 5 Admin & Coaching Tabs */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-5 sm:p-7 space-y-5">
          {/* Student Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.07]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-[1.5px] bg-[#09ADEF]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                  LESSON {activeStudent.currentWeek} · PHASE 0{activeStudent.currentPhase} · {activeStudent.niche}
                </span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl text-white mt-1 tracking-wide">
                {activeStudent.name} <span className="text-[#09ADEF]">— {activeStudent.company}</span>
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onPreviewStudentDashboard && (
                <button
                  type="button"
                  onClick={() => onPreviewStudentDashboard(activeStudent.id)}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A0C10] hover:bg-white/[0.08] border border-white/12 text-xs font-semibold text-white cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#09ADEF]" />
                  <span>Preview Student</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportCohortCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-[#0A0C10] hover:bg-white/[0.08] border border-white/12 text-xs font-semibold text-neutral-200 cursor-pointer"
                title="Download CSV backup of all students and progress"
              >
                <Download className="w-3.5 h-3.5 text-[#09ADEF]" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={onOpenImportModal}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg badge-2mm text-[10px] cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Upload .xlsx</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onApproveGate(activeStudent.id, targetPhaseToApprove);
                  setSaveBanner(`Approved Phase 0${targetPhaseToApprove} Gate for ${activeStudent.name}!`);
                  setTimeout(() => setSaveBanner(null), 3500);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                  submittedGatePhases.length > 0
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400'
                    : 'btn-2mm'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {submittedGatePhases.length > 0
                    ? `Approve Submitted Gate 0${targetPhaseToApprove}`
                    : `Approve Phase 0${targetPhaseToApprove}`}
                </span>
              </button>
            </div>
          </div>

          {/* 5 Clean Workspace Tabs (Single horizontal scroll row on mobile) */}
          <div className="flex overflow-x-auto no-scrollbar gap-1.5 p-1 rounded-xl bg-[#07090D] border border-white/[0.08]">
            {[
              { id: 'SETUP' as const, label: 'Student Setup & Specifics', shortLabel: 'Setup', icon: Settings, badge: 0 },
              {
                id: 'LINKS' as const,
                label: `Video Review Queue (${allCohortReviewItems.length})`,
                shortLabel: `Review (${allCohortReviewItems.length})`,
                icon: Link2,
                badge: pendingReviewTotal
              },
              {
                id: 'MESSAGE' as const,
                label: 'Direct Chat & Push Nudge',
                shortLabel: 'Chat & Push',
                icon: MessageSquare,
                badge: activeUnreadMessagesCount
              },
              {
                id: 'TELEMETRY' as const,
                label: '7-Hour Metrics & Workbook',
                shortLabel: 'Workbook & Metrics',
                icon: Activity,
                badge: submittedGatePhases.length
              },
              {
                id: 'SETTINGS' as const,
                label: 'Email & Admin Settings',
                shortLabel: 'Emails & Admin',
                icon: Mail,
                badge: 0
              }
            ].map(tab => {
              const Icon = tab.icon;
              const active = coachSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCoachSubTab(tab.id)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-[#09ADEF] text-white shadow-[0_4px_20px_rgba(9,173,239,0.35)]'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        active ? 'bg-black/30 text-white' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {saveBanner && (
            <div className="p-3.5 rounded-xl bg-[#09ADEF]/15 border border-[#09ADEF]/30 text-xs font-medium text-[#09ADEF] flex items-center justify-between">
              <span>✓ {saveBanner}</span>
              <button
                type="button"
                onClick={() => setSaveBanner(null)}
                className="text-neutral-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 0: STUDENT SETUP & SPECIFICS (ADMIN) */}
          {coachSubTab === 'SETUP' && (
            <div className="space-y-6">
              {/* Step 1: Upload Student Specific Content Plan (.xlsx) */}
              <div className="p-5 rounded-2xl bg-[#040507] border border-[#09ADEF]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                    1. STUDENT CONTENT PLAN SPREADSHEET (.XLSX)
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Currently loaded for <strong>{activeStudent.name}</strong>:{' '}
                    <span className="text-white font-semibold">{activeStudent.playbook.length} Core Pillars</span> &{' '}
                    <span className="text-white font-semibold">
                      {activeStudent.supportingVideos.length} Daily Concussion Content Videos
                    </span>
                    . Re-uploading preserves completed links & coach reviews.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenImportModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg btn-2mm text-xs shrink-0 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload .xlsx</span>
                </button>
              </div>

              {/* Step 2: Edit Profile, Login Credentials, Current Lesson, & Core Positioning Specifics */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/8 space-y-4">
                <div className="flex items-center justify-between border-b border-white/8 pb-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
                      2. Student Profile, Login Access & Positioning Specifics
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Changes auto-save live to Supabase & {activeStudent.name}’s student dashboard.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 text-[11px] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Auto-Synced Live</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Student Full Name</label>
                    <input
                      type="text"
                      value={activeStudent.name}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, { name: e.target.value })
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Company / Brand Name</label>
                    <input
                      type="text"
                      value={activeStudent.company}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, { company: e.target.value })
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Industry / Niche</label>
                    <input
                      type="text"
                      value={activeStudent.niche}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, { niche: e.target.value })
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Student Login Email (Used on <code className="text-sky-400">/login</code>)
                    </label>
                    <input
                      type="email"
                      value={activeStudent.email || ''}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, { email: e.target.value })
                      }
                      placeholder="student@company.com"
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Student Login Access Code (Used on <code className="text-sky-400">/login</code>)
                    </label>
                    <input
                      type="text"
                      value={activeStudent.accessCode || ''}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, {
                          accessCode: e.target.value.toUpperCase()
                        })
                      }
                      placeholder="CODE-01"
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 font-mono text-sky-300 focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Assigned Lesson (1–26)</label>
                    <select
                      value={activeStudent.currentWeek}
                      onChange={e => {
                        const wk = Number(e.target.value);
                        const ph = wk <= 4 ? 1 : wk <= 8 ? 2 : wk <= 18 ? 3 : wk <= 22 ? 4 : 5;
                        onUpdateStudentSpecifics(activeStudent.id, {
                          currentWeek: wk,
                          currentPhase: ph
                        });
                      }}
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    >
                      {Array.from({ length: 26 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>
                          Lesson {String(num).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Time on Brand (Mins)</label>
                    <input
                      type="number"
                      value={activeStudent.minutesAvailableCurrent}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, {
                          minutesAvailableCurrent: Number(e.target.value)
                        })
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Full List Pool (25%)</label>
                    <input
                      type="number"
                      value={activeStudent.fullListSize}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, {
                          fullListSize: Number(e.target.value)
                        })
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Weekly DM Convos</label>
                    <input
                      type="number"
                      value={activeStudent.dmConversationsWeekly}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, {
                          dmConversationsWeekly: Number(e.target.value)
                        })
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Core Transformation (Module 02 · Q1)
                    </label>
                    <textarea
                      rows={2}
                      value={activeStudent.worksheetAnswers.m02_q1_transformation || ''}
                      onChange={e =>
                        onUpdateStudentSpecifics(
                          activeStudent.id,
                          {},
                          { m02_q1_transformation: e.target.value }
                        )
                      }
                      placeholder="What specific transformation does this student deliver?"
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Core Belief Statement (Module 02 · Q4)
                    </label>
                    <textarea
                      rows={2}
                      value={activeStudent.worksheetAnswers.m02_q4_belief || ''}
                      onChange={e =>
                        onUpdateStudentSpecifics(
                          activeStudent.id,
                          {},
                          { m02_q4_belief: e.target.value }
                        )
                      }
                      placeholder="What is the 1 Core Belief their 25 videos install?"
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>

                {students.length > 1 && (
                  <div className="pt-2 border-t border-white/8 flex items-center justify-end">
                    {!confirmDeleteStudent ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteStudent(true)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-400/80 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove {activeStudent.name} from Cohort
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl">
                        <span className="text-[11px] font-semibold text-rose-200">
                          Permanently delete {activeStudent.name}?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteStudent(activeStudent.id);
                            setConfirmDeleteStudent(false);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteStudent(false)}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 font-semibold text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3: Add a Custom Video OR Edit Any Existing Video & Hooks Directly in Student's Queue */}
              <form
                onSubmit={handleAddOrUpdateCustomVideo}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/8 space-y-4 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/8 pb-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
                      3. Add or Edit Daily Video & Hooks in {activeStudent.name.split(' ')[0]}’s Queue
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Add a new daily video or pick any existing Day (#01–#{activeStudent.supportingVideos.length}) to edit its topic and hooks live.
                    </p>
                  </div>
                  <select
                    value={editingVideoId}
                    onChange={e => {
                      handleSelectVideoToEdit(e.target.value);
                      setConfirmDeleteVideo(false);
                    }}
                    className="rounded-xl bg-[#0B0D14] border border-white/15 px-3 py-2 text-xs font-semibold text-white focus:border-sky-400 focus:outline-none"
                  >
                    <option value="NEW">+ Add New Video to Queue</option>
                    {activeStudent.supportingVideos.map(v => (
                      <option key={v.id} value={v.id}>
                        Edit Day #{String(v.dayNumber).padStart(2, '0')} — {v.title.slice(0, 38)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Video Title / Topic</label>
                    <input
                      type="text"
                      required
                      value={customVideoTitle}
                      onChange={e => setCustomVideoTitle(e.target.value)}
                      placeholder="Video title..."
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Playbook Pillar & Funnel Stage</label>
                    <select
                      value={customVideoPillarId}
                      onChange={e => {
                        const nextPillarId = e.target.value;
                        setCustomVideoPillarId(nextPillarId);
                        const found = activeStudent.playbook.find(p => p.id === nextPillarId);
                        if (found) {
                          setCustomVideoStage(`${found.stage} (${found.pillar})`);
                        }
                      }}
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
                    >
                      {activeStudent.playbook.map((p, idx) => (
                        <option key={p.id} value={p.id}>
                          #{idx + 1} · {p.stage} — {p.pillar}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Hook Option 1 (Required)</label>
                    <input
                      type="text"
                      required
                      value={customHook1}
                      onChange={e => setCustomHook1(e.target.value)}
                      placeholder="Contrarian or curiosity hook..."
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Hook Option 2</label>
                    <input
                      type="text"
                      value={customHook2}
                      onChange={e => setCustomHook2(e.target.value)}
                      placeholder="Direct call-out hook..."
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Hook Option 3</label>
                    <input
                      type="text"
                      value={customHook3}
                      onChange={e => setCustomHook3(e.target.value)}
                      placeholder="Story / proof hook..."
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {editingVideoId !== 'NEW' && onDeleteStudentVideo && activeStudent.supportingVideos.length > 1 ? (
                    !confirmDeleteVideo ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteVideo(true)}
                        className="inline-flex items-center gap-1.5 text-rose-400 hover:text-rose-300 cursor-pointer font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Selected Video
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl">
                        <span className="text-[11px] font-semibold text-rose-200">
                          Delete this daily video & renumber queue?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteStudentVideo(activeStudent.id, editingVideoId);
                            handleSelectVideoToEdit('NEW');
                            setConfirmDeleteVideo(false);
                            setSaveBanner('Removed video and renumbered student queue.');
                            setTimeout(() => setSaveBanner(null), 3500);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                        >
                          Yes, Delete Video
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteVideo(false)}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 font-semibold text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )
                  ) : (
                    <span />
                  )}

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 font-semibold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {editingVideoId === 'NEW'
                        ? 'Add Video to Student Queue'
                        : 'Save Changes to Selected Video'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 1: IN-APP MESSAGING & 1-TAP PUSH NUDGES */}
          {coachSubTab === 'MESSAGE' && (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">
                  1-Tap Quick Follow-Ups (Click to load message):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_FOLLOWUP_TEMPLATES.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessageInput(tpl)}
                      className="text-left p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/8 text-xs text-slate-200 transition-colors cursor-pointer line-clamp-2"
                    >
                      “{tpl}”
                    </button>
                  ))}
                </div>
              </div>

              {/* Message History */}
              <div className="rounded-2xl bg-[#0B0D14] border border-white/8 p-4 space-y-3 max-h-80 overflow-y-auto">
                {activeStudent.messages.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No messages yet.
                  </div>
                ) : (
                  activeStudent.messages.map(m => (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl border text-xs ${
                        m.isAlert
                          ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                          : m.senderRole === 'COACH'
                          ? 'border-sky-500/30 bg-sky-500/10 text-white ml-8'
                          : 'border-white/10 bg-white/[0.03] text-slate-200 mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sky-400">{m.senderName}</span>
                          {m.senderRole === 'STUDENT' && m.readByCoach === false && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-bold uppercase">
                              New
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{m.timestamp}</span>
                          {m.senderRole === 'COACH' && (
                            <span className="text-[10px] text-slate-500">
                              {m.readByStudent ? '✓ Read' : 'Sent'}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="leading-relaxed text-sm">{m.text}</p>
                      {m.actionTarget && (
                        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleChatActionClick(m.actionTarget!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#09ADEF]/20 hover:bg-[#09ADEF]/30 border border-[#09ADEF]/40 text-[11px] font-bold text-[#09ADEF] cursor-pointer"
                          >
                            <span>{m.actionTarget.label}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Send Input */}
              <form onSubmit={handleSend} className="flex gap-2.5">
                <input
                  type="text"
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  placeholder={`Send a message & push notification to ${activeStudent.name}...`}
                  className="flex-1 rounded-xl bg-[#0B0D14] border border-white/15 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-2 cursor-pointer shrink-0 shadow-lg shadow-sky-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>Send & Push</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: COMPLETED VIDEO REVIEW QUEUE */}
          {coachSubTab === 'LINKS' && (
            <div className="space-y-4">
              {/* Top Filter & Scope Controls */}
              <div className="p-4 rounded-xl bg-[#000000] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                    COACH REVIEW QUEUE · CLICK ANY VIDEO TO REVIEW & SEND NOTES
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Every completed student video lands here. Click a video to watch, approve or request a revision, and send notes directly back to the student.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setReviewScope('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] cursor-pointer ${
                      reviewScope === 'ALL'
                        ? 'bg-[#09ADEF] text-white'
                        : 'bg-white/[0.04] text-zinc-400 border border-white/10 hover:text-white'
                    }`}
                  >
                    All Students ({allCohortReviewItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewScope('STUDENT')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] cursor-pointer ${
                      reviewScope === 'STUDENT'
                        ? 'bg-[#09ADEF] text-white'
                        : 'bg-white/[0.04] text-zinc-400 border border-white/10 hover:text-white'
                    }`}
                  >
                    {activeStudent.name.split(' ')[0]} ({activeStudentReviewItems.length})
                  </button>
                </div>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL' as const, label: `All Completed (${scopedReviewItems.length})` },
                  {
                    id: 'PENDING' as const,
                    label: `Needs Review (${scopedReviewItems.filter(i => i.reviewStatus === 'Pending Review').length})`
                  },
                  {
                    id: 'REVISION' as const,
                    label: `Needs Revision (${scopedReviewItems.filter(i => i.reviewStatus === 'Needs Revision').length})`
                  },
                  {
                    id: 'APPROVED' as const,
                    label: `Approved (${scopedReviewItems.filter(i => i.reviewStatus === 'Approved').length})`
                  }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setReviewFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] transition-all cursor-pointer ${
                      reviewFilter === f.id
                        ? 'badge-2mm'
                        : 'bg-[#040507] text-zinc-400 border border-white/[0.07] hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Completed Videos List */}
              {filteredReviewItems.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#000000] border border-white/[0.07] text-center space-y-2">
                  <div className="text-sm font-semibold text-white">No Completed Videos in Queue Yet</div>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    As soon as a student submits a verified video link in their Studio or 5 Core Brand Videos tab, it will automatically appear here for you to click, review, and send feedback notes.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReviewItems.map(item => {
                    const isExpanded = expandedReviewKey === item.key;
                    const draftNote =
                      reviewDraftNotes[item.key] !== undefined
                        ? reviewDraftNotes[item.key]
                        : item.coachFeedback;
                    const draftStatus =
                      reviewDraftStatus[item.key] !== undefined
                        ? reviewDraftStatus[item.key]
                        : item.reviewStatus === 'Pending Review'
                        ? 'Approved'
                        : item.reviewStatus;

                    return (
                      <div
                        key={item.key}
                        className={`rounded-xl border transition-all ${
                          isExpanded
                            ? 'bg-[#000000] border-[#09ADEF]/50 shadow-[0_10px_32px_rgba(9,173,239,0.12)]'
                            : 'bg-[#000000] border-white/[0.08] hover:border-white/20'
                        }`}
                      >
                        {/* Clickable Summary Header */}
                        <div
                          onClick={() => setExpandedReviewKey(isExpanded ? null : item.key)}
                          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="badge-2mm px-2 py-0.5 rounded text-[9px]">
                                {item.badge}
                              </span>
                              <span className="text-[11px] font-semibold text-white">
                                {item.studentName}
                              </span>
                              <span className="text-[11px] text-zinc-500">· {item.stage}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  item.reviewStatus === 'Approved'
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : item.reviewStatus === 'Needs Revision'
                                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {item.reviewStatus === 'Approved'
                                  ? '✓ Approved'
                                  : item.reviewStatus === 'Needs Revision'
                                  ? '↻ Needs Revision'
                                  : '⏳ Pending Review'}
                              </span>
                            </div>
                            <div className="text-sm sm:text-base font-bold text-white truncate">
                              {item.title}
                            </div>
                            {item.coachFeedback && !isExpanded && (
                              <div className="text-xs text-[#09ADEF] truncate">
                                Coach Note: “{item.coachFeedback}”
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                            {item.videoUrl && (
                              <a
                                href={item.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-xs font-semibold text-white"
                              >
                                <span>Watch Video</span>
                                <ExternalLink className="w-3.5 h-3.5 text-[#09ADEF]" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setExpandedReviewKey(isExpanded ? null : item.key)}
                              className="btn-2mm px-3.5 py-2 rounded-lg text-[10px] cursor-pointer"
                            >
                              {isExpanded ? 'Close' : 'Review & Add Notes'}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Coach Review & Feedback Drawer */}
                        {isExpanded && (
                          <div className="px-4 pb-5 sm:px-5 pt-3 border-t border-white/[0.08] space-y-4 bg-[#040507] rounded-b-xl">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="p-3 rounded-lg bg-[#000000] border border-white/[0.07]">
                                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF] block mb-1">
                                  HOOK / PURPOSE USED
                                </span>
                                <p className="text-zinc-200 leading-relaxed">“{item.hookUsed}”</p>
                              </div>
                              <div className="p-3 rounded-lg bg-[#000000] border border-white/[0.07] flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400 block mb-1">
                                    SUBMITTED VIDEO URL
                                  </span>
                                  {item.videoUrl ? (
                                    <a
                                      href={item.videoUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[#09ADEF] hover:underline break-all font-medium inline-flex items-center gap-1"
                                    >
                                      <span>{item.videoUrl}</span>
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                    </a>
                                  ) : (
                                    <span className="text-zinc-500">No URL provided</span>
                                  )}
                                </div>
                                {item.coachReviewedAt && (
                                  <span className="text-[10px] text-zinc-500 mt-2">
                                    Last reviewed: {item.coachReviewedAt}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Step 1: Select Review Status */}
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                                1. SELECT REVIEW DECISION
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {(['Approved', 'Needs Revision'] as const).map(st => {
                                  const active = draftStatus === st;
                                  return (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() =>
                                        setReviewDraftStatus(prev => ({ ...prev, [item.key]: st }))
                                      }
                                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                        active && st === 'Approved'
                                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                          : active && st === 'Needs Revision'
                                          ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                                          : 'bg-[#000000] border-white/10 text-zinc-400 hover:text-white'
                                      }`}
                                    >
                                      {st === 'Approved' ? '✓ Approve Video' : '↻ Needs Revision'}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Step 2: 1-Tap Quick Notes + Custom Feedback */}
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                                2. COACH NOTES (SENT DIRECTLY TO {item.studentName.toUpperCase()})
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {QUICK_REVIEW_NOTES.map((preset, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() =>
                                      setReviewDraftNotes(prev => ({ ...prev, [item.key]: preset }))
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-[#000000] hover:bg-white/[0.06] border border-white/10 text-[11px] text-zinc-300 cursor-pointer"
                                  >
                                    + “{preset}”
                                  </button>
                                ))}
                              </div>

                              <textarea
                                rows={3}
                                value={draftNote}
                                onChange={e =>
                                  setReviewDraftNotes(prev => ({ ...prev, [item.key]: e.target.value }))
                                }
                                placeholder={`Write review notes for ${item.studentName} on ${item.badge} ("${item.title}")...`}
                                className="w-full rounded-xl bg-[#000000] border border-white/15 p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#09ADEF]"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setExpandedReviewKey(null)}
                                className="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-semibold text-zinc-300 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onReviewStudentVideo(
                                    item.studentId,
                                    item.videoType,
                                    item.videoId,
                                    draftStatus,
                                    draftNote.trim()
                                  );
                                  setSaveBanner(
                                    `Sent "${draftStatus}" review & notes for ${item.badge} directly to ${item.studentName}!`
                                  );
                                  setTimeout(() => setSaveBanner(null), 4000);
                                  setExpandedReviewKey(null);
                                }}
                                className="btn-2mm inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Send Review & Notes to Student</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ATTENTION METRICS, PHASE GATES & FULL WORKBOOK INSPECTOR */}
          {coachSubTab === 'TELEMETRY' && (
            <div className="space-y-6">
              {/* Top 4 KPI Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/8">
                  <div className="text-xs text-slate-400">Time on Brand</div>
                  <div className="text-2xl font-bold text-sky-400 mt-1">
                    {activeStudent.minutesAvailableCurrent}m
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Baseline: {activeStudent.minutesAvailableBaseline}m
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/8">
                  <div className="text-xs text-slate-400">The Full List (25%)</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {activeStudent.fullListSize.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Warm retargeting pool</div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/8">
                  <div className="text-xs text-slate-400">Weekly DM Convos</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {activeStudent.dmConversationsWeekly}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Active threads</div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/8">
                  <div className="text-xs text-slate-400">Shift Magnets</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">
                    {activeStudent.shiftMagnets.length} Live
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Wired into CTAs</div>
                </div>
              </div>

              {/* Phase Gate Sign-Off Strip (Phases 01–05) */}
              <div className="p-5 rounded-2xl bg-[#040507] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#09ADEF]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Phase Gate Sign-Off & Progression (Phases 01–05)
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Current Phase: <strong className="text-[#09ADEF]">Phase 0{activeStudent.currentPhase}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {[
                    { phase: 1, name: 'Positioning', gateLesson: 4 },
                    { phase: 2, name: 'Core Brand 5', gateLesson: 8 },
                    { phase: 3, name: 'Daily Cadence', gateLesson: 18 },
                    { phase: 4, name: 'Paid + Magnets', gateLesson: 22 },
                    { phase: 5, name: 'Monthly Events', gateLesson: 26 }
                  ].map(pg => {
                    const status =
                      activeStudent.gateStatus?.[pg.phase] ||
                      activeStudent.worksheetAnswers[`phase_gate_status_${pg.phase}`];
                    const isApproved = status === 'APPROVED' || activeStudent.currentPhase > pg.phase;
                    const isSubmitted = status === 'SUBMITTED';

                    return (
                      <div
                        key={pg.phase}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                          isSubmitted
                            ? 'bg-amber-500/10 border-amber-400/50'
                            : isApproved
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-black/40 border-white/10'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-zinc-400">Phase 0{pg.phase}</span>
                            <button
                              type="button"
                              onClick={() => setInspectLessonNum(pg.gateLesson)}
                              className="text-[#09ADEF] hover:underline cursor-pointer"
                            >
                              Lesson {pg.gateLesson}
                            </button>
                          </div>
                          <div className="text-xs font-bold text-white mt-0.5">{pg.name}</div>
                          <div className="text-[10px] mt-1">
                            {isApproved ? (
                              <span className="text-emerald-300 font-semibold">✓ Approved</span>
                            ) : isSubmitted ? (
                              <span className="text-amber-300 font-semibold">⏳ Submitted for Review</span>
                            ) : (
                              <span className="text-zinc-500">In Progress</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => {
                                onApproveGate(activeStudent.id, pg.phase);
                                setSaveBanner(`Approved Phase 0${pg.phase} Gate for ${activeStudent.name}!`);
                                setTimeout(() => setSaveBanner(null), 3500);
                              }}
                              className={`w-full py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                                isSubmitted
                                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                                  : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/10'
                              }`}
                            >
                              Approve Gate 0{pg.phase}
                            </button>
                          )}

                          {(isSubmitted || isApproved) && onRequestGateRevision && (
                            <button
                              type="button"
                              onClick={() => {
                                onRequestGateRevision(activeStudent.id, pg.phase);
                                setSaveBanner(`Reopened Phase 0${pg.phase} Gate for revision (${activeStudent.name}).`);
                                setTimeout(() => setSaveBanner(null), 3500);
                              }}
                              className="w-full py-1.5 px-2 rounded-lg text-[10px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 cursor-pointer"
                            >
                              {isApproved ? 'Reopen / Revoke Gate' : 'Request Revision'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Lesson 1–26 Worksheet & Rubric Inspector */}
              {inspectedLesson && (
                <div className="p-5 rounded-2xl bg-[#040507] border border-[#09ADEF]/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#09ADEF]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[#09ADEF]">
                          Interactive Workbook & Rubric Inspector (Lessons 01–26)
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Inspect or co-edit {activeStudent.name}’s worksheet answers and verify their Phase Gate rubric items.
                      </p>
                    </div>

                    <select
                      value={inspectLessonNum}
                      onChange={e => setInspectLessonNum(Number(e.target.value))}
                      className="rounded-xl bg-[#0B0D14] border border-white/15 px-3 py-2 text-xs font-semibold text-white focus:border-[#09ADEF] focus:outline-none"
                    >
                      {lessons.map(l => {
                        const answeredCount = l.fields.filter(
                          q => (activeStudent.worksheetAnswers[q.id] || '').trim().length > 0
                        ).length;
                        return (
                          <option key={l.weekNumber} value={l.weekNumber}>
                            Lesson {String(l.weekNumber).padStart(2, '0')}: {l.title} ({answeredCount}/{l.fields.length} answered)
                            {l.isPhaseGate ? ' ◆ GATE' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Quick Jump Pills for Answered / Active Lessons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {lessons.map(l => {
                      const hasAnswers = l.fields.some(
                        q => (activeStudent.worksheetAnswers[q.id] || '').trim().length > 0
                      );
                      const isCurrent = l.weekNumber === activeStudent.currentWeek;
                      const isSelected = l.weekNumber === inspectLessonNum;
                      return (
                        <button
                          key={l.weekNumber}
                          type="button"
                          onClick={() => setInspectLessonNum(l.weekNumber)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 cursor-pointer border transition-all ${
                            isSelected
                              ? 'bg-[#09ADEF] text-white border-[#09ADEF]'
                              : isCurrent
                              ? 'bg-[#09ADEF]/15 text-[#09ADEF] border-[#09ADEF]/40'
                              : hasAnswers
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-black/40 text-zinc-500 border-white/8 hover:text-zinc-300'
                          }`}
                        >
                          L{String(l.weekNumber).padStart(2, '0')}
                          {l.isPhaseGate ? ' ◆' : ''}
                          {hasAnswers ? ' •' : ''}
                        </button>
                      );
                    })}
                  </div>

                  {/* Worksheet Questions & Answers for Selected Lesson */}
                  <div className="space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                      Lesson {String(inspectedLesson.weekNumber).padStart(2, '0')} Worksheet Responses — {inspectedLesson.title}
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {inspectedLesson.fields.map(q => {
                        const val = activeStudent.worksheetAnswers[q.id] || '';
                        return (
                          <div
                            key={q.id}
                            className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-xs font-semibold text-white">
                                {q.label}
                              </label>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  val.trim()
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {val.trim() ? 'Saved' : 'Blank'}
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              value={val}
                              onChange={e =>
                                onUpdateStudentSpecifics(
                                  activeStudent.id,
                                  {},
                                  { [q.id]: e.target.value }
                                )
                              }
                              placeholder={q.placeholder || 'Student has not filled this prompt yet (Coach can type here to co-edit)...'}
                              className="w-full rounded-lg bg-[#0B0D14] border border-white/12 p-2.5 text-xs text-white placeholder:text-zinc-600 focus:border-[#09ADEF] focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tasks & Self-Score Rubric for Selected Lesson */}
                  <div className="pt-2 border-t border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                        Lesson {String(inspectedLesson.weekNumber).padStart(2, '0')} Execution Tasks & Rubric (Click Task to Toggle)
                      </span>
                      <span className="text-xs font-bold text-[#09ADEF]">
                        {
                          inspectedLesson.tasks.filter(
                            (_, idx) =>
                              activeStudent.tasksCompleted[`${inspectedLesson.weekNumber}-${idx}`]
                          ).length
                        }
                        /{inspectedLesson.tasks.length} Tasks Done
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {inspectedLesson.tasks.map((taskText, idx) => {
                        const key = `${inspectedLesson.weekNumber}-${idx}`;
                        const checked = Boolean(activeStudent.tasksCompleted[key]);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              onToggleStudentTask?.(
                                activeStudent.id,
                                inspectedLesson.weekNumber,
                                idx
                              )
                            }
                            className={`p-3 rounded-xl border text-left text-xs flex items-start gap-2.5 transition-all cursor-pointer ${
                              checked
                                ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200 hover:bg-emerald-500/15'
                                : 'bg-black/40 border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                                checked
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'border border-white/25 text-transparent'
                              }`}
                            >
                              ✓
                            </span>
                            <span className="leading-snug">{taskText}</span>
                          </button>
                        );
                      })}
                    </div>

                    {inspectedLesson.rubric && inspectedLesson.rubric.length > 0 && (
                      <div className="pt-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Rubric Evaluation (Student Self-Score & Coach Override)
                          </div>
                          <span className="text-[10px] text-zinc-500">Click a grade to set or override</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {inspectedLesson.rubric.map((r, idx) => {
                            const criterionKey = `${inspectedLesson.weekNumber}-${r.criterion}`;
                            const legacyIdxKey = `${inspectedLesson.weekNumber}-${idx}`;
                            const score =
                              activeStudent.rubricScores[criterionKey] ||
                              activeStudent.rubricScores[legacyIdxKey];
                            return (
                              <div
                                key={criterionKey}
                                className="p-3 rounded-xl bg-black/50 border border-white/10 flex flex-col justify-between gap-2 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-zinc-200 font-medium">{r.criterion}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      score === 'STRONG'
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : score === 'ACCEPTABLE'
                                        ? 'bg-amber-500/20 text-amber-300'
                                        : score === 'WEAK'
                                        ? 'bg-rose-500/20 text-rose-300'
                                        : 'bg-zinc-800 text-zinc-500'
                                    }`}
                                  >
                                    {score || 'Unscored'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                                  {(['WEAK', 'ACCEPTABLE', 'STRONG'] as const).map(level => {
                                    const isActive = score === level;
                                    return (
                                      <button
                                        key={level}
                                        type="button"
                                        onClick={() => {
                                          const nextScores = {
                                            ...activeStudent.rubricScores,
                                            [criterionKey]: level
                                          };
                                          onUpdateStudentSpecifics(activeStudent.id, {
                                            rubricScores: nextScores
                                          });
                                        }}
                                        className={`flex-1 py-1 rounded text-[9px] font-bold uppercase tracking-wider border transition ${
                                          isActive
                                            ? level === 'STRONG'
                                              ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-200'
                                              : level === 'ACCEPTABLE'
                                              ? 'bg-amber-500/25 border-amber-500/50 text-amber-200'
                                              : 'bg-rose-500/25 border-rose-500/50 text-rose-200'
                                            : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:border-white/25'
                                        }`}
                                      >
                                        {level}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Student Shift Magnets Overview */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/8 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Student Shift Magnets & DM Handoff Scripts ({activeStudent.shiftMagnets.length})
                    </span>
                  </div>
                </div>

                {activeStudent.shiftMagnets.length === 0 ? (
                  <p className="text-xs text-slate-400">No Shift Magnets built yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeStudent.shiftMagnets.map(sm => (
                      <div
                        key={sm.id}
                        className="p-4 rounded-xl bg-[#0B0D14] border border-white/10 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold">
                            KEYWORD: “{sm.keywordTrigger}”
                          </span>
                          <span className="text-[11px] text-emerald-400 font-semibold">
                            {sm.status} · {sm.deliveryFormat}
                          </span>
                        </div>
                        <div className="font-bold text-white text-sm">{sm.workingTitle}</div>
                        <div className="text-[11px] text-slate-400">
                          Audience: <span className="text-slate-200">{sm.specificAudience}</span>
                        </div>
                        {sm.promiseOneSentence && (
                          <div className="text-[11px] text-slate-300">
                            <strong className="text-sky-400">Promise:</strong> {sm.promiseOneSentence}
                          </div>
                        )}
                        {sm.dmHandoffScript && (
                          <div className="pt-2 border-t border-white/8 text-[11px] text-slate-300">
                            <strong className="text-sky-400">DM Handoff:</strong> {sm.dmHandoffScript}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: EMAIL TEMPLATES & ADMIN ACCESS SETTINGS */}
          {coachSubTab === 'SETTINGS' && (
            <div className="space-y-5 text-xs">
              {/* Section A: Authorized Admin Emails & Sender Identity */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/8 space-y-4">
                <div className="flex items-center justify-between border-b border-white/8 pb-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#09ADEF]">
                      1. Authorized Admin Coaches & Email Sender Identity
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Manage team emails with Admin access and customize the sender details used in branded emails.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Sender Name</label>
                    <input
                      type="text"
                      value={appSettings.senderName}
                      onChange={e =>
                        onUpdateAppSettings?.(prev => ({ ...prev, senderName: e.target.value }))
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Sender Email</label>
                    <input
                      type="email"
                      value={appSettings.senderEmail}
                      onChange={e =>
                        onUpdateAppSettings?.(prev => ({ ...prev, senderEmail: e.target.value }))
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Reply-To Email</label>
                    <input
                      type="email"
                      value={appSettings.replyToEmail}
                      onChange={e =>
                        onUpdateAppSettings?.(prev => ({ ...prev, replyToEmail: e.target.value }))
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/8 space-y-2.5">
                  <div className="font-semibold text-slate-300">
                    Authorized Admin Emails ({appSettings.adminEmails.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {appSettings.adminEmails.map(email => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B0D14] border border-white/12 text-xs text-slate-200"
                      >
                        <span>{email}</span>
                        {appSettings.adminEmails.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateAppSettings?.(prev => ({
                                ...prev,
                                adminEmails: prev.adminEmails.filter(item => item !== email)
                              }))
                            }
                            className="text-rose-400 hover:text-rose-300 cursor-pointer"
                            title="Remove admin email"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 max-w-md">
                    <input
                      type="email"
                      value={newAdminEmailInput}
                      onChange={e => setNewAdminEmailInput(e.target.value)}
                      placeholder="coach@2mmshift.com"
                      className="flex-1 rounded-xl bg-[#0B0D14] border border-white/15 p-2 text-white focus:border-[#09ADEF] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const clean = newAdminEmailInput.trim().toLowerCase();
                        if (!clean || !clean.includes('@')) return;
                        onUpdateAppSettings?.(prev => ({
                          ...prev,
                          adminEmails: Array.from(new Set([...prev.adminEmails, clean]))
                        }));
                        setNewAdminEmailInput('');
                        setSaveBanner(`Added ${clean} to authorized Admin emails.`);
                        setTimeout(() => setSaveBanner(null), 3500);
                      }}
                      className="px-3.5 py-2 rounded-xl btn-2mm text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      + Add Admin
                    </button>
                  </div>
                </div>
              </div>

              {/* Section B: 5 Branded HTML Email Templates Editor & Live Hydrated Preview */}
              {(() => {
                const currentTemplate =
                  appSettings.templates.find(t => t.id === selectedTemplateId) ||
                  appSettings.templates[0];
                const studentMagicUrl = `${window.location.origin}/student?student=${activeStudent.id}`;
                const previewHtml = buildBrandedEmailHtml(
                  currentTemplate,
                  appSettings.senderName,
                  appSettings.senderEmail,
                  {
                    student_name: activeStudent.name,
                    access_code: activeStudent.accessCode || 'SHIFT-01',
                    lesson_number: String(activeStudent.currentWeek).padStart(2, '0'),
                    video_title:
                      activeStudent.supportingVideos[0]?.title || 'Day #01: Your Core Belief Shift',
                    action_url: studentMagicUrl
                  }
                );

                const updateCurrentTemplate = (
                  patch: Partial<typeof currentTemplate>
                ) => {
                  onUpdateAppSettings?.(prev => ({
                    ...prev,
                    templates: prev.templates.map(t =>
                      t.id === currentTemplate.id ? { ...t, ...patch } : t
                    )
                  }));
                };

                return (
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/8 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-[#09ADEF]">
                          2. Branded HTML Email Templates (Hydrated for {activeStudent.name})
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Customize your 5 coaching & Supabase Auth templates and copy the production HTML with 1 click.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={currentTemplate.id}
                          onChange={e =>
                            setSelectedTemplateId(e.target.value as EmailTemplateConfig['id'])
                          }
                          className="rounded-xl bg-[#0B0D14] border border-white/15 px-3 py-2 text-xs font-semibold text-white focus:border-[#09ADEF] focus:outline-none"
                        >
                          {appSettings.templates.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(previewHtml);
                            setSaveBanner(
                              `Copied "${currentTemplate.name}" HTML for ${activeStudent.name}!`
                            );
                            setTimeout(() => setSaveBanner(null), 3500);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl btn-2mm text-[10px] font-bold uppercase tracking-wider shrink-0 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy HTML</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">
                          Email Subject Line
                        </label>
                        <input
                          type="text"
                          value={currentTemplate.subject}
                          onChange={e => updateCurrentTemplate({ subject: e.target.value })}
                          className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">
                          Headline Banner
                        </label>
                        <input
                          type="text"
                          value={currentTemplate.heading}
                          onChange={e => updateCurrentTemplate({ heading: e.target.value })}
                          className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Body Copy (Supports{' '}
                        <code className="text-[#09ADEF]">{'{{student_name}}'}</code>,{' '}
                        <code className="text-[#09ADEF]">{'{{access_code}}'}</code>,{' '}
                        <code className="text-[#09ADEF]">{'{{lesson_number}}'}</code>,{' '}
                        <code className="text-[#09ADEF]">{'{{video_title}}'}</code>)
                      </label>
                      <textarea
                        rows={3}
                        value={currentTemplate.body}
                        onChange={e => updateCurrentTemplate({ body: e.target.value })}
                        className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">
                          CTA Button Label
                        </label>
                        <input
                          type="text"
                          value={currentTemplate.ctaText}
                          onChange={e => updateCurrentTemplate({ ctaText: e.target.value })}
                          className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">
                          Footer Signature
                        </label>
                        <input
                          type="text"
                          value={currentTemplate.footerText}
                          onChange={e => updateCurrentTemplate({ footerText: e.target.value })}
                          className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Live Rendered Email Preview ({activeStudent.name} · {activeStudent.email || 'No email set'})
                      </div>
                      <div className="rounded-xl overflow-hidden border border-white/12 bg-black">
                        <iframe
                          title="Branded Email Preview"
                          srcDoc={previewHtml}
                          className="w-full h-[380px] border-0"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Onboard New Student + Upload Their Specifics (.xlsx) */}
      <ModalDialog
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        title="Onboard New Student & Upload Specifics"
        subtitle="Admin Student Provisioning"
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleCreateStudentSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Student Full Name *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Student Full Name"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Company / Brand Name *</label>
              <input
                type="text"
                required
                value={newCompany}
                onChange={e => setNewCompany(e.target.value)}
                placeholder="Company Name"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Student Login Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="student@company.com"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Student Access Code (Auto-generated if blank)
              </label>
              <input
                type="text"
                value={newAccessCode}
                onChange={e => setNewAccessCode(e.target.value.toUpperCase())}
                placeholder="CODE-01"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 font-mono text-sky-300 focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Industry / Niche</label>
              <input
                type="text"
                value={newNiche}
                onChange={e => setNewNiche(e.target.value)}
                placeholder="e.g., B2B Commercial Contracting"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Starting Lesson (1–26)</label>
              <select
                value={newStartingLesson}
                onChange={e => setNewStartingLesson(Number(e.target.value))}
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              >
                {Array.from({ length: 26 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>
                    Lesson {String(num).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Initial Core Transformation (Optional)
              </label>
              <textarea
                rows={2}
                value={newTransformation}
                onChange={e => setNewTransformation(e.target.value)}
                placeholder="We help [audience] achieve [outcome] without [pain]..."
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Initial Core Belief (Optional)
              </label>
              <textarea
                rows={2}
                value={newBelief}
                onChange={e => setNewBelief(e.target.value)}
                placeholder="The #1 belief shift their market needs to hear..."
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Upload Student .xlsx Content Plan right during creation */}
          <div className="pt-2">
            <label className="block font-semibold text-slate-300 mb-1.5">
              Upload Student’s Custom Content Plan Spreadsheet (<code className="text-sky-400">.xlsx</code>)
            </label>
            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-500/40 hover:border-sky-400 bg-[#0B0D14] p-6 cursor-pointer transition-colors">
              <Upload className="w-6 h-6 text-sky-400 mb-1.5" />
              <span className="text-xs font-semibold text-white">
                Click to Attach Student’s .xlsx Content Plan (Or leave blank to load default 50-video template)
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Automatically ingests their 15 Playbook Pillars & 50 Daily Concussion Content Videos + Hooks
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleNewStudentFileChange}
                className="hidden"
              />
            </label>

            {newUploadStatus && (
              <div className="mt-2.5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                {newUploadStatus}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowAddStudentModal(false)}
              className="rounded-xl border border-white/12 px-4 py-2.5 font-medium text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-5 py-2.5 cursor-pointer shadow-lg shadow-sky-500/20"
            >
              Create Student & Load Plan
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
