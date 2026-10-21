import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  MessageSquare,
  Send,
  Link2,
  Settings,
  Upload,
  Plus,
  Trash2,
  Award,
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
  WorkbookWeek,
  ChatMessageActionTarget
} from '../types';
import { ModalDialog } from './ModalDialog';
import { parseStudentSpreadsheet, resolveMatchingPillar } from '../utils/excelParser';
import { DEFAULT_APP_SETTINGS } from '../data/initialStudents';

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
    feedback: string,
    appendToGroupThread?: boolean,
    coachVideoUrl?: string
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

const PHASE_GATE_METADATA = [
  { phase: 1, name: 'Positioning', gateLesson: 4 },
  { phase: 2, name: 'Core Brand 5', gateLesson: 8 },
  { phase: 3, name: 'Daily Cadence', gateLesson: 18 },
  { phase: 4, name: 'Paid + Magnets', gateLesson: 22 },
  { phase: 5, name: 'Monthly Events', gateLesson: 26 }
] as const;

export const CoachDashboardView: React.FC<CoachDashboardViewProps> = ({
  students,
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
  onOpenImportModal,
  appSettings = DEFAULT_APP_SETTINGS,
  onUpdateAppSettings
}) => {
  const [messageInput, setMessageInput] = useState('');
  // Consolidated 3-Tab Streamlined Architecture:
  // 1. LINKS: Review & Action Queue (Default — serves students immediately)
  // 2. MESSAGE: Direct Chat & Nudge
  // 3. SETUP: Member Control & Plan
  const [coachSubTab, setCoachSubTab] = useState<'LINKS' | 'MESSAGE' | 'SETUP'>('LINKS');
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilter, setRosterFilter] = useState<'ALL' | 'UNREAD' | 'REVIEW' | 'GATE' | 'DUE'>(
    'ALL'
  );
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [reviewScope, setReviewScope] = useState<'STUDENT' | 'ALL'>('ALL');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REVISION'>(
    'PENDING'
  );
  const [expandedReviewKey, setExpandedReviewKey] = useState<string | null>(null);
  const [reviewDraftNotes, setReviewDraftNotes] = useState<Record<string, string>>({});
  const [reviewDraftVideoUrls, setReviewDraftVideoUrls] = useState<Record<string, string>>({});
  const [reviewDraftStatus, setReviewDraftStatus] = useState<Record<string, CoachReviewStatus>>({});
  const [reviewAppendToGroup, setReviewAppendToGroup] = useState<Record<string, boolean>>({});
  const [showAlternateHooks, setShowAlternateHooks] = useState(false);

  // Streamlined 4-Input New Student Onboarding Modal State
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newParsedPlaybook, setNewParsedPlaybook] = useState<PlaybookPillar[] | undefined>(
    undefined
  );
  const [newParsedSupporting, setNewParsedSupporting] = useState<SupportingVideoItem[] | undefined>(
    undefined
  );
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

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditingVideoId('NEW');
    setConfirmDeleteStudent(false);
    setConfirmDeleteVideo(false);
    setShowAlternateHooks(false);
    setCustomVideoTitle('');
    const firstP = activeStudent?.playbook?.[0];
    setCustomVideoPillarId(firstP?.id || 'pillar-1');
    setCustomVideoStage(
      firstP
        ? `${firstP.stage.split('—')[0].trim()} (${firstP.pillar})`
        : '1. Unaware Stage (Content)'
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
        `✓ Loaded ${parsed.playbook.length} Pillars & ${parsed.supporting.length} Videos from "${file.name}"`
      );
    } catch (err) {
      setNewUploadStatus(
        `Error parsing spreadsheet: ${err instanceof Error ? err.message : 'Invalid file'}`
      );
    }
  };

  const handleCreateStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCompany.trim()) return;
    const autoCode = `${newName.trim().split(' ')[0].toUpperCase()}-0${students.length + 1}`;
    onAddStudent({
      name: newName.trim(),
      email: newEmail.trim(),
      accessCode: autoCode,
      company: newCompany.trim(),
      niche: newCompany.trim(),
      startingLesson: 1,
      coreTransformation: '',
      coreBelief: '',
      customPlaybook: newParsedPlaybook,
      customSupportingVideos: newParsedSupporting
    });
    setNewName('');
    setNewEmail('');
    setNewCompany('');
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
        firstP
          ? `${firstP.stage.split('—')[0].trim()} (${firstP.pillar})`
          : '1. Unaware Stage (Content)'
      );
      setCustomHook1('');
      setCustomHook2('');
      setCustomHook3('');
      setShowAlternateHooks(false);
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
      setShowAlternateHooks(Boolean(existing.hook2 || existing.hook3));
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
    setShowAlternateHooks(false);
    setSaveBanner('Added new daily video to this student’s queue!');
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

  // Switch default filter to ALL if there are 0 pending reviews so the queue never looks empty when videos exist
  useEffect(() => {
    if (
      reviewFilter === 'PENDING' &&
      scopedReviewItems.length > 0 &&
      !scopedReviewItems.some(i => i.reviewStatus === 'Pending Review')
    ) {
      setReviewFilter('ALL');
    }
  }, [reviewFilter, scopedReviewItems]);

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
        unread: st.messages.filter(m => m.senderRole === 'STUDENT' && m.readByCoach === false)
          .length,
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
      `Sent daily cadence nudge to ${dueStudents.length} due/missed student${
        dueStudents.length === 1 ? '' : 's'
      }!`
    );
    setTimeout(() => setSaveBanner(null), 3500);
  }, [students, activeStudent, onTriggerMissedAlertPush, onSelectStudent]);

  const handleCopyStudentInvite = useCallback(() => {
    const magicUrl = `${window.location.origin}/student?student=${activeStudent.id}`;
    const code = activeStudent.accessCode || 'SHIFT-01';
    const inviteText = `Hi ${activeStudent.name.split(' ')[0]},\n\nYour 2mm Shift Studio & Workbook is ready:\nDirect Link: ${magicUrl}\nAccess Code: ${code}`;
    navigator.clipboard?.writeText(inviteText);
    setSaveBanner(`Copied login link & access code (${code}) for ${activeStudent.name}!`);
    setTimeout(() => setSaveBanner(null), 3500);
  }, [activeStudent]);

  const handleChatActionClick = (target: ChatMessageActionTarget) => {
    if (target.videoId || target.coreVideoId) {
      setCoachSubTab('LINKS');
      setReviewScope('STUDENT');
      setReviewFilter('ALL');
      const key = target.videoId
        ? `${activeStudent.id}-SUPPORTING-${target.videoId}`
        : `${activeStudent.id}-CORE-${target.coreVideoId}`;
      setExpandedReviewKey(key);
      return;
    }
    if (onNavigateFromChatAction) {
      onNavigateFromChatAction(activeStudent.id, target);
    }
  };

  const latestCheckIn = activeStudent.weeklyCheckIns?.[0];

  return (
    <div className="space-y-3.5 sm:space-y-5">
      {/* Top Triage KPI Row (Interactive 1-Click Filtering) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => {
            setRosterFilter('ALL');
            setShowAddStudentModal(true);
          }}
          className="glass-panel rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between text-left hover:border-[#0EA5E9]/50 transition-all cursor-pointer"
        >
          <div>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-[#0EA5E9]">
              ACTIVE COHORT
            </div>
            <div className="font-display text-xl sm:text-3xl text-white mt-0.5">
              {students.length} STUDENTS
            </div>
          </div>
          <span className="badge-2mm px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setCoachSubTab('LINKS');
            setReviewScope('ALL');
            setReviewFilter(pendingReviewTotal > 0 ? 'PENDING' : 'ALL');
          }}
          className="glass-panel rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between text-left hover:border-[#0EA5E9]/50 transition-all cursor-pointer"
        >
          <div>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-[#0EA5E9]">
              REVIEW QUEUE
            </div>
            <div className="font-display text-xl sm:text-3xl text-white mt-0.5">
              {pendingReviewTotal > 0
                ? `${pendingReviewTotal} TO REVIEW`
                : `${allCohortReviewItems.length} DONE`}
            </div>
          </div>
          <span className="hidden sm:inline-flex badge-2mm px-2.5 py-1 rounded-full text-[10px]">
            Review
          </span>
        </button>

        <button
          type="button"
          onClick={() => setRosterFilter(rosterFilter === 'GATE' ? 'ALL' : 'GATE')}
          className="glass-panel rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between text-left hover:border-[#0EA5E9]/50 transition-all cursor-pointer"
        >
          <div>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              POSTED TODAY
            </div>
            <div className="font-display text-xl sm:text-3xl text-emerald-400 mt-0.5">
              {onCadenceCount} VERIFIED
            </div>
          </div>
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400" />
        </button>

        <div className="glass-panel rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-1.5">
          <div
            onClick={() => setRosterFilter(rosterFilter === 'DUE' ? 'ALL' : 'DUE')}
            className="cursor-pointer"
          >
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-rose-400">
              MISSED / DUE
            </div>
            <div className="font-display text-xl sm:text-3xl text-white mt-0.5">
              {missedCount > 0 && pendingCount > 0
                ? `${missedCount} MISSED · ${pendingCount} DUE`
                : missedCount > 0
                ? `${missedCount} MISSED`
                : `${pendingCount} DUE`}
            </div>
          </div>
          <button
            type="button"
            onClick={handleBatchNudgeAllDue}
            className="px-2.5 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider text-rose-300 cursor-pointer shrink-0"
            title="Send push & chat nudge to all due/missed students"
          >
            Nudge All
          </button>
        </div>
      </div>

      {/* Main Split: Left Student Roster + Right Focused 3-Tab Coaching Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 4 Cols: Sticky Student Roster + Triage Filters */}
        <div className="hidden lg:flex lg:flex-col lg:col-span-4 rounded-2xl bg-surface-card border border-white/[0.06] p-4 space-y-2.5 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)]">
          <div className="px-1 py-0.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              ROSTER ({filteredRosterStudents.length}/{students.length})
            </span>
            <button
              type="button"
              onClick={() => setShowAddStudentModal(true)}
              className="badge-2mm px-2.5 py-1 rounded-full text-[9px] flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Student
            </button>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={rosterSearch}
                onChange={e => setRosterSearch(e.target.value)}
                placeholder="Search student or company..."
                className="w-full rounded-xl bg-[#080C14] border border-white/10 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-400"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'REVIEW', label: 'Review' },
                  { id: 'GATE', label: 'Gate' },
                  { id: 'UNREAD', label: 'Unread' },
                  { id: 'DUE', label: 'Due' }
                ] as const
              ).map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRosterFilter(f.id)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 cursor-pointer border transition-all ${
                    rosterFilter === f.id
                      ? 'bg-gradient-to-r from-brand-600 to-sky-500 text-white border-brand-400/40 shadow-sm'
                      : 'bg-[#080C14] text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {filteredRosterStudents.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#080C14] border border-white/10 text-center text-xs text-slate-400">
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
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-500/15 border-brand-400/40 text-white shadow-sm'
                        : 'bg-[#080C14]/80 border-white/[0.06] hover:border-brand-500/30 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center font-bold text-xs text-white ring-2 ring-white/10 shrink-0">
                          {st.avatar}
                          {stUnread > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                              {stUnread}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{st.name}</div>
                          <div className="text-xs text-slate-400 truncate">{st.company}</div>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          st.todayVideoStatus === 'COMPLETED'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/[0.04] text-slate-400 border border-white/10'
                        }`}
                      >
                        {st.todayVideoStatus === 'COMPLETED' ? '✓ Posted' : 'Due'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-white/[0.06]">
                      <span>
                        L{String(st.currentWeek).padStart(2, '0')} · P0{st.currentPhase}
                      </span>
                      <span className="text-white font-medium">
                        {doneVideos}/{st.supportingVideos.length} Videos
                      </span>
                      {stPendingReviews > 0 ? (
                        <span className="text-brand-400 font-semibold">
                          {stPendingReviews} To Review
                        </span>
                      ) : stSubmittedGate ? (
                        <span className="text-emerald-400 font-semibold">
                          Gate 0{stSubmittedGate} Ready
                        </span>
                      ) : (st.watchedReplayIds?.length || 0) > 0 ? (
                        <span className="text-emerald-400 font-medium">
                          {st.watchedReplayIds?.length} Replays
                        </span>
                      ) : (
                        <span>{st.streakDays}d Streak</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right 8 Cols: Selected Student Workspace with 3 Streamlined Tabs */}
        <div className="lg:col-span-8 rounded-2xl bg-surface-card border border-white/[0.06] p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Student Header & Essential Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-4 h-[1.5px] bg-brand-500 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-400 truncate">
                    LESSON {activeStudent.currentWeek} · PHASE 0{activeStudent.currentPhase} ·{' '}
                    {activeStudent.streakDays}D STREAK
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(true)}
                  className="lg:hidden px-2.5 py-1 rounded-xl btn-2mm text-[10px] shrink-0 cursor-pointer"
                >
                  + Add Student
                </button>
              </div>

              {/* Mobile Unified Student Selector */}
              <div className="lg:hidden mt-2">
                <select
                  id="mobile-student-select"
                  value={activeStudent.id}
                  onChange={e => onSelectStudent(e.target.value)}
                  className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-brand-400"
                >
                  {students.map(st => {
                    const unread = rosterSummariesById[st.id]?.unread || 0;
                    return (
                      <option key={st.id} value={st.id}>
                        {st.name} — {st.company} (L{st.currentWeek})
                        {unread > 0 ? ` · ${unread} Unread` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Desktop Student Heading */}
              <h2 className="hidden lg:block font-display text-2xl sm:text-3xl text-white mt-1 tracking-wide">
                {activeStudent.name}{' '}
                <span className="text-brand-400">— {activeStudent.company}</span>
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleCopyStudentInvite}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 active:scale-95 transition-all text-xs font-medium text-white cursor-pointer"
                title="Copy magic login link and access code"
              >
                <Copy className="w-3.5 h-3.5 text-brand-400" />
                <span>Copy Invite</span>
              </button>

              {onPreviewStudentDashboard && (
                <button
                  type="button"
                  onClick={() => onPreviewStudentDashboard(activeStudent.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 active:scale-95 transition-all text-xs font-medium text-white cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-brand-400" />
                  <span>Preview</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenImportModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 active:scale-95 transition-all text-xs font-medium text-white cursor-pointer"
                title="Upload or update student .xlsx content plan"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-brand-400" />
                <span>Upload .xlsx</span>
              </button>

              <button
                type="button"
                onClick={handleExportCohortCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 active:scale-95 transition-all text-xs font-medium text-slate-300 cursor-pointer"
                title="Download CSV backup of all students"
              >
                <Download className="w-3.5 h-3.5 text-brand-400" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* 3 Focused Segmented Pill Workspace Tabs */}
          <div className="flex overflow-x-auto no-scrollbar gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-inner">
            {[
              {
                id: 'LINKS' as const,
                label: 'Review & Action Queue',
                shortLabel: 'Review Queue',
                icon: Link2,
                badge: pendingReviewTotal + submittedGatePhases.length
              },
              {
                id: 'MESSAGE' as const,
                label: 'Direct Chat & Nudge',
                shortLabel: 'Chat & Nudge',
                icon: MessageSquare,
                badge: activeUnreadMessagesCount
              },
              {
                id: 'SETUP' as const,
                label: 'Member Control & Plan',
                shortLabel: 'Member Control',
                icon: Settings,
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
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-brand-600 to-sky-500 text-white font-semibold shadow-md'
                      : 'text-slate-400 hover:text-slate-200 font-medium hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        active ? 'bg-black/30 text-white' : 'bg-brand-500/20 text-brand-400'
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
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-300 flex items-center justify-between">
              <span>✓ {saveBanner}</span>
              <button
                type="button"
                onClick={() => setSaveBanner(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: REVIEW & ACTION QUEUE (Videos, Phase Gates & Weekly Bottleneck) */}
          {coachSubTab === 'LINKS' && (
            <div className="space-y-4">
              {/* Compact Phase Gate Progression & Sign-Off Bar */}
              <div className="p-4 rounded-xl bg-[#0F1626] border border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#0EA5E9]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      {activeStudent.name.split(' ')[0]}’s Phase Gates (01–05)
                    </span>
                  </div>
                  {submittedGatePhases.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onApproveGate(activeStudent.id, targetPhaseToApprove);
                          setSaveBanner(
                            `Approved Phase 0${targetPhaseToApprove} Gate for ${activeStudent.name}!`
                          );
                          setTimeout(() => setSaveBanner(null), 3500);
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                      >
                        ✓ Approve Gate 0{targetPhaseToApprove}
                      </button>
                      {onRequestGateRevision && (
                        <button
                          type="button"
                          onClick={() => {
                            onRequestGateRevision(activeStudent.id, targetPhaseToApprove);
                            setSaveBanner(
                              `Requested revision on Phase 0${targetPhaseToApprove} Gate (${activeStudent.name}).`
                            );
                            setTimeout(() => setSaveBanner(null), 3500);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 font-semibold text-[10px] cursor-pointer"
                        >
                          Request Revision
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PHASE_GATE_METADATA.map(pg => {
                    const status =
                      activeStudent.gateStatus?.[pg.phase] ||
                      activeStudent.worksheetAnswers[`phase_gate_status_${pg.phase}`];
                    const isApproved = status === 'APPROVED';
                    const isSubmitted = status === 'SUBMITTED';

                    return (
                      <button
                        key={pg.phase}
                        type="button"
                        onClick={() => {
                          if (isApproved && onRequestGateRevision) {
                            onRequestGateRevision(activeStudent.id, pg.phase);
                            setSaveBanner(
                              `Reopened Phase 0${pg.phase} Gate for ${activeStudent.name}.`
                            );
                          } else {
                            onApproveGate(activeStudent.id, pg.phase);
                            setSaveBanner(
                              `Approved Phase 0${pg.phase} Gate for ${activeStudent.name}!`
                            );
                          }
                          setTimeout(() => setSaveBanner(null), 3500);
                        }}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isApproved
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : isSubmitted
                            ? 'bg-[#0EA5E9]/15 border-[#0EA5E9] text-white'
                            : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/25'
                        }`}
                        title={
                          isApproved
                            ? 'Click to reopen gate'
                            : `Click to approve Phase 0${pg.phase} Gate`
                        }
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                          <span>P0{pg.phase}</span>
                          <span>
                            {isApproved ? '✓ Done' : isSubmitted ? 'Review' : 'Approve'}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white truncate mt-0.5">
                          {pg.name}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {latestCheckIn && (
                  <div className="pt-2.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="text-slate-300 truncate">
                      <span className="font-semibold text-[#0EA5E9]">
                        {latestCheckIn.weekLabel} Check-In:
                      </span>{' '}
                      “{latestCheckIn.bottleneckNote}”
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                      <span>
                        <strong className="text-white">{latestCheckIn.videosPosted}</strong> Videos
                      </span>
                      <span>
                        <strong className="text-white">
                          {latestCheckIn.dmConversationsStarted}
                        </strong>{' '}
                        DMs
                      </span>
                      <span>
                        <strong className="text-emerald-400">
                          {latestCheckIn.callsOrDealsBooked}
                        </strong>{' '}
                        Wins
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Scope & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    {
                      id: 'PENDING' as const,
                      label: `To Review (${
                        scopedReviewItems.filter(i => i.reviewStatus === 'Pending Review').length
                      })`
                    },
                    { id: 'ALL' as const, label: `All (${scopedReviewItems.length})` },
                    {
                      id: 'REVISION' as const,
                      label: `Revision (${
                        scopedReviewItems.filter(i => i.reviewStatus === 'Needs Revision').length
                      })`
                    },
                    {
                      id: 'APPROVED' as const,
                      label: `Approved (${
                        scopedReviewItems.filter(i => i.reviewStatus === 'Approved').length
                      })`
                    }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setReviewFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                        reviewFilter === f.id
                          ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                          : 'bg-[#0F1626] text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setReviewScope('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border ${
                      reviewScope === 'ALL'
                        ? 'bg-white/10 text-white border-white/25'
                        : 'bg-[#0F1626] text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    All Students ({allCohortReviewItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewScope('STUDENT')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border ${
                      reviewScope === 'STUDENT'
                        ? 'bg-white/10 text-white border-white/25'
                        : 'bg-[#0F1626] text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {activeStudent.name.split(' ')[0]} ({activeStudentReviewItems.length})
                  </button>
                </div>
              </div>

              {/* Completed Videos List */}
              {filteredReviewItems.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#0F1626] border border-white/10 text-center space-y-1">
                  <div className="text-sm font-semibold text-white">No Videos Match Filter</div>
                  <p className="text-xs text-slate-400">
                    Submitted student videos appear here automatically for 1-click approval or
                    feedback.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
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
                        className={`rounded-xl border transition-all bg-[#0F1626] ${
                          isExpanded
                            ? 'border-[#0EA5E9]'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div
                          onClick={() => setExpandedReviewKey(isExpanded ? null : item.key)}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="badge-2mm px-2 py-0.5 rounded text-[9px]">
                                {item.badge}
                              </span>
                              <span className="text-xs font-semibold text-white">
                                {item.studentName}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  item.reviewStatus === 'Approved'
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : item.reviewStatus === 'Needs Revision'
                                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                    : 'bg-white/[0.06] text-slate-300 border border-white/10'
                                }`}
                              >
                                {item.reviewStatus === 'Approved'
                                  ? '✓ Approved'
                                  : item.reviewStatus === 'Needs Revision'
                                  ? '↻ Revision'
                                  : 'Pending'}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-white truncate">
                              {item.title}
                            </div>
                            {item.coachFeedback && !isExpanded && (
                              <div className="text-xs text-[#0EA5E9] truncate">
                                Note: “{item.coachFeedback}”
                              </div>
                            )}
                          </div>

                          <div
                            className="flex items-center gap-2 shrink-0"
                            onClick={e => e.stopPropagation()}
                          >
                            {item.videoUrl && (
                              <a
                                href={item.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-white"
                              >
                                <span>Watch</span>
                                <ExternalLink className="w-3.5 h-3.5 text-[#0EA5E9]" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setExpandedReviewKey(isExpanded ? null : item.key)}
                              className="btn-2mm px-3.5 py-1.5 rounded-lg text-[10px] cursor-pointer"
                            >
                              {isExpanded ? 'Close' : 'Review'}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-3 border-t border-white/10 space-y-3">
                            <div className="text-xs text-slate-300">
                              <span className="font-semibold text-[#0EA5E9]">Hook:</span> “
                              {item.hookUsed}”
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex gap-2">
                                {(['Approved', 'Needs Revision'] as const).map(st => {
                                  const active = draftStatus === st;
                                  return (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() =>
                                        setReviewDraftStatus(prev => ({ ...prev, [item.key]: st }))
                                      }
                                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                        active && st === 'Approved'
                                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                          : active && st === 'Needs Revision'
                                          ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                                          : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      {st === 'Approved' ? '✓ Approve' : '↻ Revision'}
                                    </button>
                                  );
                                })}
                              </div>

                              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={reviewAppendToGroup[item.key] ?? true}
                                  onChange={e =>
                                    setReviewAppendToGroup(prev => ({
                                      ...prev,
                                      [item.key]: e.target.checked
                                    }))
                                  }
                                  className="rounded accent-[#0EA5E9] w-3.5 h-3.5"
                                />
                                <span>Share review to Discussion</span>
                              </label>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {QUICK_REVIEW_NOTES.map((preset, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() =>
                                    setReviewDraftNotes(prev => ({ ...prev, [item.key]: preset }))
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-black/50 hover:bg-white/[0.06] border border-white/10 text-[11px] text-slate-300 cursor-pointer"
                                >
                                  + “{preset}”
                                </button>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <input
                                type="text"
                                value={draftNote}
                                onChange={e =>
                                  setReviewDraftNotes(prev => ({
                                    ...prev,
                                    [item.key]: e.target.value
                                  }))
                                }
                                placeholder={`Coach notes for ${item.studentName}...`}
                                className="w-full rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0EA5E9]"
                              />
                              <input
                                type="url"
                                value={reviewDraftVideoUrls[item.key] || ''}
                                onChange={e =>
                                  setReviewDraftVideoUrls(prev => ({
                                    ...prev,
                                    [item.key]: e.target.value
                                  }))
                                }
                                placeholder="Optional Vimeo feedback URL (https://vimeo.com/...)..."
                                className="w-full rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0EA5E9]"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setExpandedReviewKey(null)}
                                className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const shouldAppend = reviewAppendToGroup[item.key] ?? true;
                                  const draftLoomUrl =
                                    (reviewDraftVideoUrls[item.key] || '').trim() || undefined;
                                  onReviewStudentVideo(
                                    item.studentId,
                                    item.videoType,
                                    item.videoId,
                                    draftStatus,
                                    draftNote.trim(),
                                    shouldAppend,
                                    draftLoomUrl
                                  );
                                  setSaveBanner(
                                    `Sent "${draftStatus}" review for ${item.badge} to ${item.studentName}!`
                                  );
                                  setTimeout(() => setSaveBanner(null), 4000);
                                  setExpandedReviewKey(null);
                                }}
                                className="btn-2mm inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Send Review</span>
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

          {/* TAB 2: DIRECT CHAT & 1-TAP PUSH NUDGE */}
          {coachSubTab === 'MESSAGE' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_FOLLOWUP_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMessageInput(tpl)}
                    className="text-left p-2.5 rounded-xl bg-[#0F1626] hover:bg-white/[0.06] border border-white/10 text-xs text-slate-200 transition-colors cursor-pointer line-clamp-2"
                  >
                    “{tpl}”
                  </button>
                ))}
              </div>

              <div className="rounded-xl bg-[#0F1626] border border-white/10 p-4 space-y-2.5 max-h-80 overflow-y-auto">
                {activeStudent.messages.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">No messages yet.</div>
                ) : (
                  activeStudent.messages.map(m => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl border text-xs ${
                        m.isAlert
                          ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                          : m.senderRole === 'COACH'
                          ? 'border-[#0EA5E9]/30 bg-[#0EA5E9]/10 text-white ml-8'
                          : 'border-white/10 bg-white/[0.03] text-slate-200 mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-semibold text-[#0EA5E9]">{m.senderName}</span>
                        <span>{m.timestamp}</span>
                      </div>
                      <p className="leading-relaxed text-sm">{m.text}</p>
                      {m.actionTarget && (
                        <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleChatActionClick(m.actionTarget!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0EA5E9]/20 hover:bg-[#0EA5E9]/30 border border-[#0EA5E9]/40 text-[11px] font-bold text-[#0EA5E9] cursor-pointer"
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

              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  placeholder={`Message ${activeStudent.name}...`}
                  className="flex-1 rounded-xl bg-[#0F1626] border border-white/15 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0EA5E9]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl btn-2mm font-semibold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: MEMBER CONTROL & PLAN (Max 4 Inputs Per Card, Zero Plumbing) */}
          {coachSubTab === 'SETUP' && (
            <div className="space-y-4">
              {/* Card 1: Essential Student Profile & Lesson Placement (4 Inputs) */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#0F1626] border border-white/10 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0EA5E9]">
                    1. Member Profile & Lesson Placement
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 text-[10px] font-semibold">
                    ✓ Auto-Saved
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={activeStudent.name}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, { name: e.target.value })
                      }
                      className="w-full rounded-xl bg-black border border-white/15 p-2.5 text-white focus:border-[#0EA5E9] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Company / Niche
                    </label>
                    <input
                      type="text"
                      value={activeStudent.company}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, {
                          company: e.target.value,
                          niche: e.target.value
                        })
                      }
                      className="w-full rounded-xl bg-black border border-white/15 p-2.5 text-white focus:border-[#0EA5E9] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Login Email</label>
                    <input
                      type="email"
                      value={activeStudent.email || ''}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, { email: e.target.value })
                      }
                      placeholder="student@company.com"
                      className="w-full rounded-xl bg-black border border-white/15 p-2.5 text-white focus:border-[#0EA5E9] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Assigned Lesson
                    </label>
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
                      className="w-full rounded-xl bg-black border border-white/15 p-2.5 text-white focus:border-[#0EA5E9] focus:outline-none"
                    >
                      {Array.from({ length: 26 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>
                          Lesson {String(num).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyStudentInvite}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-white cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#0EA5E9]" />
                      <span>Copy Invite ({activeStudent.accessCode || 'SHIFT-01'})</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenImportModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-white cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#0EA5E9]" />
                      <span>
                        Upload .xlsx ({activeStudent.supportingVideos.length} Videos)
                      </span>
                    </button>
                  </div>

                  {students.length > 1 &&
                    (!confirmDeleteStudent ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteStudent(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Member
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteStudent(activeStudent.id);
                            setConfirmDeleteStudent(false);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500 text-slate-950 font-bold text-[10px] uppercase cursor-pointer"
                        >
                          Confirm Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteStudent(false)}
                          className="px-2 py-1 rounded-lg bg-white/10 text-slate-300 font-semibold text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Card 2: Student Video Queue Editor (4 Visible Controls + Optional Hooks Toggle) */}
              <form
                onSubmit={handleAddOrUpdateCustomVideo}
                className="p-4 sm:p-5 rounded-xl bg-[#0F1626] border border-white/10 space-y-3.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0EA5E9]">
                    2. Update {activeStudent.name.split(' ')[0]}’s Video Queue
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAlternateHooks(prev => !prev)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showAlternateHooks ? 'Hide Hooks 2 & 3' : '+ Customize Hooks 2 & 3'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Video Slot
                    </label>
                    <select
                      value={editingVideoId}
                      onChange={e => handleSelectVideoToEdit(e.target.value)}
                      className="w-full rounded-xl bg-black border border-white/15 p-2.5 text-white focus:border-[#0EA5E9] focus:outline-none"
                    >
                      <option value="NEW">+ Add New Video to Queue</option>
                      {activeStudent.supportingVideos.map(v => (
                        <option key={v.id} value={v.id}>
                          Day #{String(v.dayNumber).padStart(2, '0')} — {v.title.slice(0, 38)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Playbook Pillar
                    </label>
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
                      className="w-full rounded-xl bg-black border border-white/15 p-2.5 text-white focus:border-[#0EA5E9] focus:outline-none"
                    >
                      {activeStudent.playbook.map((p, idx) => (
                        <option key={p.id} value={p.id}>
                          #{idx + 1} · {p.stage} — {p.pillar}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Video Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={customVideoTitle}
                      onChange={e => setCustomVideoTitle(e.target.value)}
                      placeholder="Video topic..."
                      className="w-full rounded-xl bg-black border border-white/15 p-2.5 text-white focus:border-[#0EA5E9] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Primary Hook *
                    </label>
                    <input
                      type="text"
                      required
                      value={customHook1}
                      onChange={e => setCustomHook1(e.target.value)}
                      placeholder="Opening hook..."
                      className="w-full rounded-xl bg-black border border-white/15 p-2.5 text-white focus:border-[#0EA5E9] focus:outline-none"
                    />
                  </div>
                </div>

                {showAlternateHooks && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Hook Option 2
                      </label>
                      <input
                        type="text"
                        value={customHook2}
                        onChange={e => setCustomHook2(e.target.value)}
                        placeholder="Direct call-out hook..."
                        className="w-full rounded-xl bg-black border border-white/15 p-2.5 text-white focus:border-[#0EA5E9] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Hook Option 3
                      </label>
                      <input
                        type="text"
                        value={customHook3}
                        onChange={e => setCustomHook3(e.target.value)}
                        placeholder="Story / proof hook..."
                        className="w-full rounded-xl bg-black border border-white/15 p-2.5 text-white focus:border-[#0EA5E9] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  {editingVideoId !== 'NEW' &&
                  onDeleteStudentVideo &&
                  activeStudent.supportingVideos.length > 1 ? (
                    !confirmDeleteVideo ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteVideo(true)}
                        className="inline-flex items-center gap-1.5 text-rose-400 hover:text-rose-300 cursor-pointer font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Video
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteStudentVideo(activeStudent.id, editingVideoId);
                            handleSelectVideoToEdit('NEW');
                            setConfirmDeleteVideo(false);
                            setSaveBanner('Removed video and renumbered queue.');
                            setTimeout(() => setSaveBanner(null), 3500);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500 text-slate-950 font-bold text-[10px] uppercase cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteVideo(false)}
                          className="px-2 py-1 rounded-lg bg-white/10 text-slate-300 font-semibold text-[10px] cursor-pointer"
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
                    className="btn-2mm inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{editingVideoId === 'NEW' ? 'Add Video' : 'Save Video'}</span>
                  </button>
                </div>
              </form>

              {/* Collapsible Authorized Admin Coach Emails */}
              <details className="rounded-xl bg-[#0F1626] border border-white/10 p-4 text-xs">
                <summary className="cursor-pointer font-bold uppercase tracking-wider text-slate-400 select-none">
                  Authorized Coach Emails ({appSettings.adminEmails.length})
                </summary>
                <div className="mt-3 space-y-2.5">
                  <div className="flex flex-wrap gap-2">
                    {appSettings.adminEmails.map(email => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-black border border-white/10 text-xs text-slate-200"
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
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 max-w-sm">
                    <input
                      type="email"
                      value={newAdminEmailInput}
                      onChange={e => setNewAdminEmailInput(e.target.value)}
                      placeholder="coach@company.com"
                      className="flex-1 rounded-lg bg-black border border-white/15 p-2 text-white focus:border-[#0EA5E9] focus:outline-none"
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
                        setSaveBanner(`Added ${clean} to Admin coaches.`);
                        setTimeout(() => setSaveBanner(null), 3500);
                      }}
                      className="px-3 py-2 rounded-lg btn-2mm text-[10px] font-bold uppercase cursor-pointer"
                    >
                      Add Coach
                    </button>
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Streamlined 4-Input New Student Onboarding Modal */}
      <ModalDialog
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        title="Add New Student"
        subtitle="Member Onboarding"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleCreateStudentSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Student Full Name"
              className="w-full rounded-xl bg-[#0F1626] border border-white/15 p-2.5 text-white focus:border-[#0EA5E9] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Company / Brand Name *
            </label>
            <input
              type="text"
              required
              value={newCompany}
              onChange={e => setNewCompany(e.target.value)}
              placeholder="Company Name"
              className="w-full rounded-xl bg-[#0F1626] border border-white/15 p-2.5 text-white focus:border-[#0EA5E9] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Login Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="student@company.com"
              className="w-full rounded-xl bg-[#0F1626] border border-white/15 p-2.5 text-white focus:border-[#0EA5E9] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Content Plan Spreadsheet (Optional)
            </label>
            <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#0EA5E9]/40 hover:border-[#0EA5E9] bg-[#0F1626] p-4 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-[#0EA5E9]" />
              <span className="text-xs font-semibold text-white">
                Upload .xlsx Plan (or leave blank for default 50-video plan)
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleNewStudentFileChange}
                className="hidden"
              />
            </label>
            {newUploadStatus && (
              <div className="mt-2 p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                {newUploadStatus}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowAddStudentModal(false)}
              className="rounded-lg border border-white/12 px-4 py-2 font-medium text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg btn-2mm font-semibold px-4 py-2 cursor-pointer"
            >
              Create Student
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
