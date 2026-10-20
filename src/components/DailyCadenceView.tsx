import React, { useState, useEffect } from 'react';
import {
  Flame,
  CheckCircle2,
  Clock,
  Camera,
  Link2,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Magnet,
  Check,
  FileSpreadsheet,
  SlidersHorizontal,
  ExternalLink,
  AlertCircle,
  Sparkles,
  ListVideo,
  Layers,
  Award,
  Play,
  BookOpen,
  Maximize2,
  Minimize2,
  Users,
  Share2
} from 'lucide-react';
import { StudentProfile, SupportingVideoItem, PlaybookPillar } from '../types';
import { ModalDialog } from './ModalDialog';
import { resolveMatchingPillar } from '../utils/excelParser';

interface DailyCadenceViewProps {
  student: StudentProfile;
  onUpdateVideo: (videoId: string, updates: Partial<SupportingVideoItem>) => void;
  onMarkVideoDone: (
    videoId: string,
    videoUrl: string,
    options?: { shareToGroup?: boolean; groupNote?: string }
  ) => void;
  onUpdatePillarStatus: (pillarId: string, status: string) => void;
  onUpdateCoreVideoStatus: (
    coreId: string,
    status: 'Not Started' | 'In Progress' | 'Completed',
    url?: string,
    scriptDraft?: { S: string; H: string; I: string; F: string; T: string },
    options?: { shareToGroup?: boolean }
  ) => void;
  onShareVideoToGroup?: (params: {
    studentId: string;
    videoType: 'SUPPORTING' | 'CORE';
    videoId: string;
    note?: string;
    notifyCohort: boolean;
  }) => void;
  onOpenGroupThread?: (postId?: string) => void;
  onQuickStartNavigate?: (tab: 'WORKBOOK' | 'MAGNETS' | 'VAULT' | 'CRM') => void;
  onDismissOnboarding?: () => void;
  onOpenImportModal: () => void;
  requestedSubTab?: 'STUDIO' | 'QUEUE' | 'CORE5' | 'PLAYBOOK' | null;
  requestedVideoId?: string | null;
  requestedCoreVideoId?: string | null;
  onClearRequestedNavigation?: () => void;
}

const SHIFT_CYCLE_DAYS = [
  { day: 'Monday', stage: 'Signal', emotion: 'Curiosity', objective: 'Attract aligned people — name who this is for' },
  { day: 'Tuesday', stage: 'Tension', emotion: 'Frustration', objective: 'Agitate the real problem behind the theme' },
  { day: 'Wednesday', stage: 'Proof', emotion: 'Hope', objective: 'Build certainty — a result, a demo, a story from the bank' },
  { day: 'Thursday', stage: 'Perspective', emotion: 'Conviction', objective: 'Replace the old worldview with the new frame' },
  { day: 'Friday', stage: 'Path', emotion: 'Momentum', objective: 'Make the next step obvious + film next week’s long-form' }
];

const FIVE_TAKES_GUIDE = [
  { take: 'Take 1 · Signal', time: '0:00 – 0:15', camera: 'Tight & direct close-up. Fast text hooks on screen. No distractions.', vibe: 'High energy, disruptive' },
  { take: 'Take 2 · Humanize', time: '0:15 – 0:30', camera: 'Shift camera 30° or step back to a medium shot. Pop-up graphic for keyword.', vibe: 'Conversational, warm' },
  { take: 'Take 3 · Illuminate', time: '0:30 – 1:45', camera: 'Steady "real talk" shot. Overlay B-roll and punch cuts to emphasize pain.', vibe: 'Empathetic & authoritative' },
  { take: 'Take 4 · Formulate', time: '1:45 – 3:00', camera: 'Teaching angle: whiteboard, desk, or screen share for the 3 steps.', vibe: 'Clear, structured' },
  { take: 'Take 5 · Transfer', time: '3:00 – 3:10', camera: 'Urgent close-up: punch back in, point at camera or caption for CTA.', vibe: 'Direct & urgent' }
];

export const DailyCadenceView: React.FC<DailyCadenceViewProps> = ({
  student,
  onUpdateVideo,
  onMarkVideoDone,
  onUpdatePillarStatus,
  onUpdateCoreVideoStatus,
  onShareVideoToGroup,
  onOpenGroupThread,
  onQuickStartNavigate,
  onDismissOnboarding,
  requestedSubTab,
  requestedVideoId,
  requestedCoreVideoId,
  onClearRequestedNavigation
}) => {
  const revisionIdx = student.supportingVideos.findIndex(v => v.coachReviewStatus === 'Needs Revision');
  const firstIncompleteIdx = student.supportingVideos.findIndex(v => v.status !== 'Completed');
  const firstActiveIndex = revisionIdx >= 0 ? revisionIdx : firstIncompleteIdx >= 0 ? firstIncompleteIdx : 0;

  const [selectedIndex, setSelectedIndex] = useState(firstActiveIndex);
  const [subTab, setSubTab] = useState<'STUDIO' | 'QUEUE' | 'CORE5' | 'PLAYBOOK'>('STUDIO');
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [coreSlideIdx, setCoreSlideIdx] = useState(0);
  const [pillarSlideIdx, setPillarSlideIdx] = useState(0);
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [videoLinkInput, setVideoLinkInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [shareToGroupOnVerify, setShareToGroupOnVerify] = useState(true);
  const [groupShareNote, setGroupShareNote] = useState('');
  const [shareCoreToGroup, setShareCoreToGroup] = useState(true);
  const [coreUrlDrafts, setCoreUrlDrafts] = useState<Record<string, string>>({});
  const [coreUrlError, setCoreUrlError] = useState<string | null>(null);
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [teleprompterLargeText, setTeleprompterLargeText] = useState(false);
  const [fullscreenPrompter, setFullscreenPrompter] = useState(false);

  // Reset local studio & slider state when switching active student
  useEffect(() => {
    const revIdx = student.supportingVideos.findIndex(v => v.coachReviewStatus === 'Needs Revision');
    const incIdx = student.supportingVideos.findIndex(v => v.status !== 'Completed');
    setSelectedIndex(revIdx >= 0 ? revIdx : incIdx >= 0 ? incIdx : 0);
    setActiveStep(1);
    setCoreSlideIdx(0);
    setPillarSlideIdx(0);
    setCoreUrlDrafts({});
    setCoreUrlError(null);
  }, [student.id]);

  // Handle deep-link navigation from chat messages or review links
  useEffect(() => {
    if (!requestedSubTab && !requestedVideoId && !requestedCoreVideoId) return;
    if (requestedSubTab) {
      setSubTab(requestedSubTab);
    }
    if (requestedVideoId) {
      const idx = student.supportingVideos.findIndex(v => v.id === requestedVideoId);
      if (idx >= 0) {
        setSelectedIndex(idx);
        setSubTab('STUDIO');
        const targetVid = student.supportingVideos[idx];
        setActiveStep(targetVid?.coachReviewStatus === 'Needs Revision' ? 4 : 1);
      }
    }
    if (requestedCoreVideoId) {
      const cIdx = student.coreVideos.findIndex(c => c.id === requestedCoreVideoId);
      if (cIdx >= 0) {
        setCoreSlideIdx(cIdx);
        setSubTab('CORE5');
      }
    }
    onClearRequestedNavigation?.();
  }, [requestedSubTab, requestedVideoId, requestedCoreVideoId, student.supportingVideos, student.coreVideos, onClearRequestedNavigation]);

  // Timer state for <10-Minute execution & Teleprompter
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const currentVideo = student.supportingVideos[selectedIndex] || student.supportingVideos[0];

  const updateStudioVideo = (videoId: string, patch: Partial<SupportingVideoItem>) => {
    const nextPatch: Partial<SupportingVideoItem> = {
      ...patch,
      ...(currentVideo?.status === 'Not Started' && !patch.status ? { status: 'In Progress' } : {})
    };
    onUpdateVideo(videoId, nextPatch);
  };

  // Sync link input when video or its saved URL changes
  useEffect(() => {
    setVideoLinkInput(currentVideo?.videoUrl || '');
    setLinkError(null);
  }, [currentVideo?.id, currentVideo?.videoUrl]);

  // Auto-reset timer when switching to a different video
  useEffect(() => {
    setTimerRunning(false);
    setTimerSeconds(0);
  }, [currentVideo?.id]);

  // Auto-start timer when entering Step 3 (Teleprompter)
  useEffect(() => {
    if (activeStep === 3) {
      setTimerRunning(true);
    }
  }, [activeStep]);

  const completedSupportingCount = student.supportingVideos.filter(v => v.status === 'Completed').length;
  const completedCoreCount = student.coreVideos.filter(v => v.status === 'Completed').length;
  const completedPillarCount = student.playbook.filter(p => p.status === 'Completed').length;

  const revisionSupportingVideos = student.supportingVideos.filter(
    v => v.coachReviewStatus === 'Needs Revision'
  );
  const revisionCoreVideos = student.coreVideos.filter(
    c => c.coachReviewStatus === 'Needs Revision'
  );

  const matchingPillar: PlaybookPillar | undefined = currentVideo
    ? resolveMatchingPillar(currentVideo, student.playbook)
    : student.playbook[0];

  const selectedHookNum = currentVideo?.selectedHook || 1;
  const activeHookText =
    currentVideo?.customHook?.trim() ||
    (selectedHookNum === 1
      ? currentVideo?.hook1
      : selectedHookNum === 2
      ? currentVideo?.hook2
      : currentVideo?.hook3);

  const attachedMagnet =
    student.shiftMagnets.find(m => m.id === currentVideo?.attachedMagnetId) || student.shiftMagnets[0];

  const shiftDay = SHIFT_CYCLE_DAYS[selectedIndex % 5];

  const buildTake2Pitch = (conversationalSetup = false) => {
    const rawTransform = (student.worksheetAnswers['m02_q1_transformation'] || 'install the 2mm Shift').trim();
    const cleanedTransform = rawTransform.replace(/\.+$/, '');
    const startsWithHelpClause = /^(we|i)\s+help\b/i.test(cleanedTransform);
    const baseClause = startsWithHelpClause
      ? cleanedTransform.replace(/^(we|i)\s+help\b/i, 'I help')
      : `I help ${student.niche.toLowerCase()} ${cleanedTransform.charAt(0).toLowerCase()}${cleanedTransform.slice(1)}`;
    if (!attachedMagnet) {
      return `“If we haven't met, ${baseClause}.”`;
    }
    if (conversationalSetup) {
      return `“If we haven't met, ${baseClause}. By the way — if you want my ${attachedMagnet.workingTitle}, comment ‘${attachedMagnet.keywordTrigger}’ below and I’ll send it right over.”`;
    }
    return `“If we haven't met, ${baseClause}. Comment ‘${attachedMagnet.keywordTrigger}’ below and I’ll send you my ${attachedMagnet.workingTitle}.”`;
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isValidProofUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      return parsed.hostname.includes('.');
    } catch {
      return false;
    }
  };

  const handleCompleteCurrent = () => {
    if (!currentVideo) return;
    if (!isValidProofUrl(videoLinkInput)) {
      setLinkError(
        'Please paste your published social post URL (Instagram, TikTok, YouTube, LinkedIn, or Facebook) to verify completion.'
      );
      return;
    }
    const normalizedUrl = videoLinkInput.trim().startsWith('http')
      ? videoLinkInput.trim()
      : `https://${videoLinkInput.trim()}`;
    setLinkError(null);
    onMarkVideoDone(currentVideo.id, normalizedUrl, {
      shareToGroup: shareToGroupOnVerify,
      groupNote: groupShareNote.trim() || undefined
    });
    setGroupShareNote('');
  };

  const uniqueStages = Array.from(new Set(student.supportingVideos.map(v => v.pillarStage)));
  const filteredSupporting =
    stageFilter === 'ALL'
      ? student.supportingVideos
      : student.supportingVideos.filter(v => v.pillarStage === stageFilter);

  const steps = [
    { num: 1 as const, title: 'Hook', shortTitle: 'Hook' },
    { num: 2 as const, title: 'Talking Beats', shortTitle: 'Beats' },
    { num: 3 as const, title: 'Teleprompter', shortTitle: 'Shoot' },
    { num: 4 as const, title: 'Verify Link', shortTitle: 'Verify' }
  ];

  const onboardingTasks = [
    {
      id: 'lesson1',
      label: '1. Complete Lesson 1 Thesis',
      done: student.currentWeek > 1 || Boolean(student.tasksCompleted['1-0']),
      action: () => onQuickStartNavigate?.('WORKBOOK')
    },
    {
      id: 'magnet',
      label: '2. Activate 1 Shift Magnet',
      done: student.shiftMagnets.some(m => m.status === 'Live'),
      action: () => onQuickStartNavigate?.('MAGNETS')
    },
    {
      id: 'video1',
      label: '3. Shoot & Verify Video #1',
      done: completedSupportingCount > 0,
      action: () => {
        setSubTab('STUDIO');
        setActiveStep(1);
      }
    },
    {
      id: 'checkin',
      label: '4. Log Weekly Check-In',
      done: (student.weeklyCheckIns?.length || 0) > 0,
      action: () => onQuickStartNavigate?.('VAULT')
    }
  ];
  const onboardingDoneCount = onboardingTasks.filter(t => t.done).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* First 48 Hours Quick-Start Bar (Auto-hides once all 4 steps are done or dismissed) */}
      {!student.onboardingDismissed && onboardingDoneCount < 4 && (
        <div className="rounded-2xl bg-[#07090D] border border-white/10 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#09ADEF] mr-1">
              Quick Start ({onboardingDoneCount}/4):
            </span>
            {onboardingTasks.map(task => (
              <button
                key={task.id}
                type="button"
                onClick={task.action}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  task.done
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200'
                }`}
              >
                {task.done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                <span>{task.label}</span>
              </button>
            ))}
          </div>
          {onDismissOnboarding && (
            <button
              type="button"
              onClick={onDismissOnboarding}
              className="text-[11px] text-neutral-400 hover:text-white self-end sm:self-center shrink-0 cursor-pointer"
            >
              Hide
            </button>
          )}
        </div>
      )}

      {/* Alert Banner when Coach Requests a Revision on any video */}
      {(revisionSupportingVideos.length > 0 || revisionCoreVideos.length > 0) && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-500/10 border border-rose-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Coach Action Required · {revisionSupportingVideos.length + revisionCoreVideos.length} Video Revision Requested
              </div>
              <p className="text-xs text-neutral-200 mt-0.5">
                {revisionSupportingVideos[0]
                  ? `Day #${String(revisionSupportingVideos[0].dayNumber).padStart(2, '0')}: "${revisionSupportingVideos[0].title}" — ${revisionSupportingVideos[0].coachFeedback || 'Please review Coach notes and submit an updated link.'}`
                  : `${revisionCoreVideos[0]?.code}: "${revisionCoreVideos[0]?.name}" — ${revisionCoreVideos[0]?.coachFeedback || 'Please review Coach notes and submit an updated link.'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (revisionSupportingVideos[0]) {
                const idx = student.supportingVideos.findIndex(v => v.id === revisionSupportingVideos[0].id);
                if (idx >= 0) {
                  setSelectedIndex(idx);
                  setSubTab('STUDIO');
                  setActiveStep(4);
                }
              } else if (revisionCoreVideos[0]) {
                const cIdx = student.coreVideos.findIndex(c => c.id === revisionCoreVideos[0].id);
                if (cIdx >= 0) {
                  setCoreSlideIdx(cIdx);
                  setSubTab('CORE5');
                }
              }
            }}
            className="px-3.5 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-xs font-bold uppercase tracking-wider text-rose-200 shrink-0 cursor-pointer"
          >
            Open & Resubmit →
          </button>
        </div>
      )}

      {/* Single-Row Sub-Navigation Bar (No redundant 2nd row on mobile) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex overflow-x-auto no-scrollbar p-1 rounded-xl bg-[#07090D] border border-white/[0.08] w-full sm:w-auto">
          {[
            { id: 'STUDIO' as const, label: 'Studio', shortLabel: 'Studio', icon: Sparkles },
            { id: 'QUEUE' as const, label: `50 Videos (${completedSupportingCount})`, shortLabel: `50 Queue (${completedSupportingCount})`, icon: ListVideo },
            { id: 'CORE5' as const, label: `5 Core (${completedCoreCount}/5)`, shortLabel: `Core 5 (${completedCoreCount}/5)`, icon: Award },
            { id: 'PLAYBOOK' as const, label: `Playbook (${completedPillarCount})`, shortLabel: `Playbook`, icon: Layers }
          ].map(tab => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.06em] whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-[#09ADEF] text-white shadow-[0_4px_20px_rgba(9,173,239,0.35)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="badge-2mm flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px]">
            <Flame className="w-3.5 h-3.5 fill-[#09ADEF] text-[#09ADEF] shrink-0" />
            <span>{student.streakDays}D STREAK</span>
          </div>

          <button
            type="button"
            onClick={() => setShowQueueDrawer(true)}
            className="eyebrow-pill px-3.5 py-1.5 rounded-full text-[10px] hover:border-[#09ADEF]/50 transition-colors cursor-pointer"
          >
            Day #{currentVideo?.dayNumber} ▾
          </button>
        </div>
      </div>

      {/* TAB 1: SEQUENTIAL 4-STEP DAILY STUDIO */}
      {subTab === 'STUDIO' && currentVideo && (
        <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
          {/* Unified Current Day Header + 4-Step Segmented Bar */}
          <div className="glass-panel rounded-2xl p-4 sm:p-7">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <button
                type="button"
                onClick={() => setShowQueueDrawer(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#09ADEF]/12 border border-[#09ADEF]/30 text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF] hover:bg-[#09ADEF]/20 transition cursor-pointer"
                title="Tap to jump to any of the 50 daily videos"
              >
                <span>DAY #{currentVideo.dayNumber} · {shiftDay.day} · {shiftDay.stage}</span>
                <span>▾</span>
              </button>

              <div className="flex items-center gap-1.5">
                <span className="sm:hidden inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-bold text-[#09ADEF]">
                  <Flame className="w-3 h-3 fill-[#09ADEF] text-[#09ADEF]" />
                  {student.streakDays}d
                </span>
                <button
                  type="button"
                  disabled={selectedIndex === 0}
                  onClick={() => {
                    setSelectedIndex(i => Math.max(0, i - 1));
                    setActiveStep(1);
                  }}
                  className="p-1.5 rounded-lg bg-[#0A0C10] hover:bg-white/[0.08] border border-white/10 text-neutral-300 disabled:opacity-30 cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={selectedIndex >= student.supportingVideos.length - 1}
                  onClick={() => {
                    setSelectedIndex(i => Math.min(student.supportingVideos.length - 1, i + 1));
                    setActiveStep(1);
                  }}
                  className="p-1.5 rounded-lg bg-[#0A0C10] hover:bg-white/[0.08] border border-white/10 text-neutral-300 disabled:opacity-30 cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl text-white tracking-wide leading-tight">
              “{currentVideo.title}”
            </h1>
            {matchingPillar && (
              <p className="text-[11px] text-neutral-400 mt-1 truncate">
                {matchingPillar.stage} · <span className="text-neutral-300">{matchingPillar.pillar}</span>
              </p>
            )}

            {/* Coach Review & Feedback Banner (Visible to Student once submitted or reviewed) */}
            {(currentVideo.coachReviewStatus || currentVideo.coachFeedback) && (
              <div
                className={`mt-3.5 p-3 sm:p-4 rounded-xl border ${
                  currentVideo.coachReviewStatus === 'Approved'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : currentVideo.coachReviewStatus === 'Needs Revision'
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-[#09ADEF]/10 border-[#09ADEF]/30'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                      currentVideo.coachReviewStatus === 'Approved'
                        ? 'text-emerald-300'
                        : currentVideo.coachReviewStatus === 'Needs Revision'
                        ? 'text-rose-300'
                        : 'text-[#09ADEF]'
                    }`}
                  >
                    {currentVideo.coachReviewStatus === 'Approved'
                      ? '✓ COACH REVIEW: APPROVED'
                      : currentVideo.coachReviewStatus === 'Needs Revision'
                      ? '↻ COACH REVIEW: REVISION REQUESTED'
                      : '⏳ IN COACH REVIEW QUEUE'}
                  </span>
                  {currentVideo.coachReviewedAt && (
                    <span className="text-[10px] text-zinc-400">{currentVideo.coachReviewedAt}</span>
                  )}
                </div>
                {currentVideo.coachFeedback && (
                  <p className="text-xs sm:text-sm text-white mt-1.5 leading-relaxed">
                    “{currentVideo.coachFeedback}”
                  </p>
                )}
                {currentVideo.coachVideoUrl && (
                  <div className="mt-2">
                    <a
                      href={currentVideo.coachVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#09ADEF] text-white text-xs font-bold hover:bg-[#09B3F8] transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Watch Coach Video Breakdown</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Clean Single-Row 4-Step Stepper */}
            <div className="grid grid-cols-4 gap-1.5 mt-4 pt-3.5 border-t border-white/[0.07]">
              {steps.map(s => {
                const isCurrent = activeStep === s.num;
                const isPassed = activeStep > s.num || currentVideo.status === 'Completed';
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setActiveStep(s.num)}
                    className={`py-2 px-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.06em] ${
                      isCurrent
                        ? 'bg-[#09ADEF] text-white border-[#09ADEF] shadow-[0_4px_20px_rgba(9,173,239,0.35)]'
                        : isPassed
                        ? 'bg-[#09ADEF]/12 border-[#09ADEF]/30 text-[#09ADEF]'
                        : 'bg-[#07090D] border-white/[0.07] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {isPassed && !isCurrent ? (
                      <Check className="w-3 h-3 stroke-[3] shrink-0" />
                    ) : (
                      <span>{s.num}.</span>
                    )}
                    <span className="truncate">
                      <span className="sm:hidden">{s.shortTitle}</span>
                      <span className="hidden sm:inline">{s.title}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEQUENTIAL PANEL CONTENT */}
          <div className="glass-panel rounded-2xl p-4 sm:p-7 transition-all">
            {/* PANEL 1: CHOOSE YOUR HOOK */}
            {activeStep === 1 && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                    STEP 1 · TAP YOUR OPENING HOOK
                  </div>
                  {currentVideo.customHook?.trim() && (
                    <span className="px-2 py-0.5 rounded bg-[#09ADEF]/15 text-[#09ADEF] text-[10px] font-bold">
                      Custom Hook Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { num: 1 as const, badge: 'OPTION 1 · OUTCOME', text: currentVideo.hook1 },
                    { num: 2 as const, badge: 'OPTION 2 · CONTRARIAN', text: currentVideo.hook2 },
                    { num: 3 as const, badge: 'OPTION 3 · STATUS', text: currentVideo.hook3 }
                  ].map(h => {
                    const isSelected = !currentVideo.customHook?.trim() && selectedHookNum === h.num;
                    return (
                      <button
                        key={h.num}
                        type="button"
                        onClick={() => updateStudioVideo(currentVideo.id, { selectedHook: h.num, customHook: undefined })}
                        className={`w-full text-left p-3.5 sm:p-5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#09ADEF]/10 border-[#09ADEF] shadow-[0_8px_30px_rgba(9,173,239,0.12)]'
                            : 'bg-[#040507] border-white/[0.07] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                            {h.badge}
                          </span>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                              isSelected
                                ? 'bg-[#09ADEF] border-[#09ADEF] text-white'
                                : 'border-white/20'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                        </div>
                        <p className="text-sm sm:text-base text-white leading-relaxed font-medium">
                          “{h.text}”
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Progressive Disclosure: Custom Hook, Personal Story Beat & Story Bank Reference */}
                <details
                  open={Boolean(currentVideo.customHook?.trim() || currentVideo.notes?.trim())}
                  className="group rounded-xl bg-[#040507] border border-white/[0.08] p-3.5"
                >
                  <summary className="text-xs font-semibold text-neutral-300 cursor-pointer flex items-center justify-between list-none">
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#09ADEF]" />
                      <span>
                        Customize Hook or Add Story Beat Note
                        {(currentVideo.customHook?.trim() || currentVideo.notes?.trim()) ? ' (Saved)' : ' (Optional)'}
                      </span>
                    </span>
                    <span className="text-[#09ADEF] text-[11px] group-open:rotate-90 transition-transform">▸</span>
                  </summary>

                  <div className="mt-3.5 pt-3.5 border-t border-white/[0.07] space-y-3.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                            Custom / Tweaked Hook
                          </label>
                          {currentVideo.customHook?.trim() && (
                            <button
                              type="button"
                              onClick={() => updateStudioVideo(currentVideo.id, { customHook: undefined })}
                              className="text-[10px] text-neutral-400 hover:text-white cursor-pointer"
                            >
                              Reset to Preset
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={currentVideo.customHook || ''}
                          onChange={e => updateStudioVideo(currentVideo.id, { customHook: e.target.value })}
                          placeholder="Or write your own opening hook..."
                          className="w-full rounded-lg bg-black border border-white/12 px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#09ADEF]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                          Personal Example / Story Beat Note
                        </label>
                        <input
                          type="text"
                          value={currentVideo.notes || ''}
                          onChange={e => updateStudioVideo(currentVideo.id, { notes: e.target.value })}
                          placeholder="Jot down a client story or stat for Take 3..."
                          className="w-full rounded-lg bg-black border border-white/12 px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#09ADEF]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Tap a Story Bank Item (Lesson 6) to Insert into Take 3:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          {
                            num: 1,
                            title: student.worksheetAnswers['m05_title'],
                            snippet: student.worksheetAnswers['m05_20s'] || student.worksheetAnswers['m05_90s']
                          },
                          ...[2, 3, 4, 5, 6, 7, 8].map(n => ({
                            num: n,
                            title: student.worksheetAnswers[`m05_s${n}_header`],
                            snippet: student.worksheetAnswers[`m05_s${n}_lengths`]
                          }))
                        ].map(story => {
                          const hasContent = Boolean(story.title?.trim() || story.snippet?.trim());
                          const label = story.title?.trim() || `Story #${story.num} (Lesson 6)`;
                          const notePayload = [story.title?.trim(), story.snippet?.trim()].filter(Boolean).join(' — ');
                          return (
                            <button
                              key={story.num}
                              type="button"
                              disabled={!hasContent}
                              onClick={() => {
                                if (notePayload) {
                                  updateStudioVideo(currentVideo.id, { notes: notePayload });
                                }
                              }}
                              className={`text-left p-2.5 rounded-lg border transition ${
                                hasContent
                                  ? 'bg-black border-white/12 hover:border-[#09ADEF] text-neutral-200 cursor-pointer'
                                  : 'bg-black/40 border-white/5 text-neutral-600 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-[11px] text-white truncate">
                                  #{story.num}: {label}
                                </span>
                                {hasContent && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#09ADEF] shrink-0">
                                    + Use
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </details>

                <div className="pt-3 border-t border-white/[0.07] flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl btn-2mm text-xs cursor-pointer"
                  >
                    <span>Next: Talking Beats</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PANEL 2: BELIEF SHIFT & SHIFT MAGNET CTA (Matches Results Over Rhetoric card layout) */}
            {activeStep === 2 && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                    STEP 2 · THE 2MM BELIEF SHIFT & CTA
                  </div>
                  {matchingPillar && (
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Pillar: {matchingPillar.pillar}
                    </span>
                  )}
                </div>

                {matchingPillar && (
                  <div className="p-5 rounded-xl bg-[#040507] border border-white/[0.07] space-y-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 mb-1">
                        WHAT WAS STUCK (OLD BELIEF):
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                        {matchingPillar.breaksBelief}
                      </p>
                    </div>

                    {/* Signature vertical left-border THE SHIFT block from joshbeechraft.com */}
                    <div className="border-l-2 border-[#09ADEF]/60 pl-4 py-0.5">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400 mb-1">
                        THE SHIFT (NEW BELIEF):
                      </div>
                      <p className="text-xs sm:text-sm text-white font-medium leading-relaxed">
                        {matchingPillar.installsBelief}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06]">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 mb-1">
                        MUST-HIT TALKING BEATS:
                      </div>
                      <p className="text-xs sm:text-sm text-white font-semibold leading-relaxed">
                        {matchingPillar.mustHitBeats}
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-4 sm:p-5 rounded-xl bg-[#040507] border border-[#09ADEF]/25 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF] flex items-center gap-1.5">
                      <Magnet className="w-3.5 h-3.5" />
                      ATTACHED SHIFT MAGNET CTA
                    </label>
                    <select
                      value={currentVideo.attachedMagnetId || attachedMagnet?.id || ''}
                      onChange={e => updateStudioVideo(currentVideo.id, { attachedMagnetId: e.target.value })}
                      className="rounded-lg bg-black border border-white/15 text-xs text-white px-3 py-2 focus:outline-none focus:border-[#09ADEF]"
                    >
                      {student.shiftMagnets.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.workingTitle} (Keyword: "{m.keywordTrigger}")
                        </option>
                      ))}
                    </select>
                  </div>

                  {attachedMagnet && (
                    <div className="border-l-2 border-white/15 pl-3.5 py-1 text-xs sm:text-sm text-neutral-200">
                      “Comment <strong className="text-white">‘{attachedMagnet.keywordTrigger}’</strong> below and I’ll DM you{' '}
                      <span className="text-[#09ADEF] font-semibold">{attachedMagnet.workingTitle}</span> — it takes{' '}
                      {attachedMagnet.completionTime} and shows you how to {attachedMagnet.promiseOneSentence.toLowerCase()}”
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/[0.07] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0A0C10] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-neutral-300 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStep(3);
                      setTimerRunning(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg btn-2mm text-xs cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Open Teleprompter</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PANEL 3: ON-CAMERA TELEPROMPTER & 5-TAKE GUIDE */}
            {activeStep === 3 && (
              <div className="space-y-4 sm:space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                    STEP 3 · TELEPROMPTER & 5-TAKE SHOOT
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1-Tap Full-Screen Camera-Aligned Mode */}
                    <button
                      type="button"
                      onClick={() => {
                        setFullscreenPrompter(true);
                        setTimerRunning(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#09ADEF] text-white text-[10px] font-bold uppercase tracking-wider shadow-[0_4px_16px_rgba(9,173,239,0.35)] cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Full-Screen Camera Mode</span>
                    </button>

                    {/* Large Text Toggle */}
                    <button
                      type="button"
                      onClick={() => setTeleprompterLargeText(v => !v)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                        teleprompterLargeText
                          ? 'bg-[#09ADEF]/20 border-[#09ADEF] text-white'
                          : 'bg-[#040507] border-white/12 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <span>{teleprompterLargeText ? 'A- Standard' : 'A+ Large Text'}</span>
                    </button>

                    {/* Sleek Pill Timer */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#040507] border border-white/12">
                      <Clock className="w-3.5 h-3.5 text-[#09ADEF]" />
                      <span className="font-mono-tech text-xs font-semibold text-white">
                        {formatTimer(timerSeconds)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTimerRunning(r => !r)}
                        className="text-[11px] font-bold uppercase tracking-wider text-[#09ADEF] cursor-pointer"
                      >
                        {timerRunning ? 'Pause' : 'Start'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTimerRunning(false);
                          setTimerSeconds(0);
                        }}
                        className="text-neutral-400 hover:text-white cursor-pointer"
                        title="Reset timer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Full-Screen Camera-Aligned Teleprompter Overlay (Keeps eyes locked near top selfie camera) */}
                {fullscreenPrompter && (
                  <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between pt-safe pb-safe px-4 sm:px-10">
                    {/* Top Camera-Line Bar */}
                    <div className="flex items-center justify-between gap-2 py-2.5 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="font-mono-tech text-xs font-bold text-white">
                          {formatTimer(timerSeconds)}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF] ml-1">
                          LOOK HERE ↑ AT CAMERA
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTeleprompterLargeText(v => !v)}
                          className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-bold text-white cursor-pointer"
                        >
                          {teleprompterLargeText ? 'A-' : 'A+'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFullscreenPrompter(false)}
                          className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-neutral-200 cursor-pointer"
                        >
                          ✕ Exit
                        </button>
                      </div>
                    </div>

                    {/* Upper-Screen Eye-Line Script Reader */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-5 max-w-2xl mx-auto w-full">
                      <div className="p-4 rounded-2xl bg-[#070A0F] border border-[#09ADEF]/40">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF] mb-1">
                          TAKE 1 · OPENING HOOK (0:00–0:15)
                        </div>
                        <p
                          className={`${
                            teleprompterLargeText ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-3xl'
                          } font-bold text-white leading-snug`}
                        >
                          “{activeHookText}”
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#05070B] border border-white/10">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF] mb-1">
                          TAKE 2 · HUMANIZE & KEYWORD (0:15–0:30)
                        </div>
                        <p
                          className={`${
                            teleprompterLargeText ? 'text-xl sm:text-2xl' : 'text-base sm:text-xl'
                          } text-neutral-100 leading-relaxed font-medium`}
                        >
                          {buildTake2Pitch(false)}
                        </p>
                      </div>

                      {matchingPillar && (
                        <>
                          <div className="p-4 rounded-2xl bg-[#05070B] border border-white/10 space-y-2">
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                              TAKE 3 · BREAK OLD BELIEF (0:30–1:45)
                            </div>
                            <p
                              className={`${
                                teleprompterLargeText ? 'text-xl sm:text-2xl' : 'text-base sm:text-xl'
                              } text-neutral-200 leading-relaxed`}
                            >
                              {matchingPillar.breaksBelief}
                            </p>
                            {currentVideo.notes?.trim() && (
                              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-sm font-medium">
                                ★ Story Beat: {currentVideo.notes}
                              </div>
                            )}
                          </div>

                          <div className="p-4 rounded-2xl bg-[#070A0F] border-l-4 border-[#09ADEF] space-y-2">
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                              TAKE 4 · INSTALL THE 2MM SHIFT (1:45–3:00)
                            </div>
                            <p
                              className={`${
                                teleprompterLargeText ? 'text-xl sm:text-2xl' : 'text-base sm:text-xl'
                              } text-white font-semibold leading-relaxed`}
                            >
                              {matchingPillar.installsBelief}
                            </p>
                            {matchingPillar.mustHitBeats && (
                              <p className="text-sm text-[#09ADEF] font-semibold">
                                Beats: {matchingPillar.mustHitBeats}
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      {attachedMagnet && (
                        <div className="p-4 rounded-2xl bg-[#070A0F] border border-[#09ADEF]/40">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF] mb-1">
                            TAKE 5 · DIRECT CTA (3:00–3:10)
                          </div>
                          <p
                            className={`${
                              teleprompterLargeText ? 'text-xl sm:text-3xl' : 'text-lg sm:text-2xl'
                            } font-bold text-white leading-snug`}
                          >
                            “Comment <span className="text-[#09ADEF]">‘{attachedMagnet.keywordTrigger}’</span> below and I’ll DM you the {attachedMagnet.workingTitle}!”
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Thumb Bar */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 max-w-2xl mx-auto w-full">
                      <button
                        type="button"
                        onClick={() => setTimerRunning(r => !r)}
                        className="px-4 py-3 rounded-xl bg-white/10 text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
                      >
                        {timerRunning ? 'Pause Timer' : 'Resume Timer'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFullscreenPrompter(false);
                          setActiveStep(4);
                        }}
                        className="flex-1 py-3 px-5 rounded-xl btn-2mm text-xs font-bold uppercase tracking-wider text-center cursor-pointer"
                      >
                        Done Shooting → Verify Link
                      </button>
                    </div>
                  </div>
                )}

                {/* Large Readable 5-Take Teleprompter Card */}
                <div className="p-4 sm:p-6 rounded-2xl bg-[#040507] border border-[#09ADEF]/30 space-y-4 sm:space-y-5">
                  {/* TAKE 1: SIGNAL */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                        TAKE 1 · SIGNAL HOOK (0:00–0:15)
                      </span>
                      <span className="text-[10px] text-neutral-500">Tight & direct close-up</span>
                    </div>
                    <p
                      className={`${
                        teleprompterLargeText ? 'text-xl sm:text-3xl' : 'text-lg sm:text-2xl'
                      } font-semibold text-white leading-relaxed`}
                    >
                      “{activeHookText}”
                    </p>
                  </div>

                  {/* TAKE 2: HUMANIZE */}
                  <div className="pt-4 border-t border-white/[0.07]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                        TAKE 2 · HUMANIZE & KEYWORD SETUP (0:15–0:30)
                      </span>
                      <span className="text-[10px] text-neutral-500">Shift camera 30° / medium shot</span>
                    </div>
                    <p
                      className={`${
                        teleprompterLargeText ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'
                      } text-neutral-200 leading-relaxed`}
                    >
                      {buildTake2Pitch(true)}
                    </p>
                  </div>

                  {/* TAKE 3 & 4: ILLUMINATE & FORMULATE */}
                  {matchingPillar && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/[0.07]">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                            TAKE 3 · ILLUMINATE OLD BELIEF (0:30–1:45)
                          </span>
                        </div>
                        <p
                          className={`${
                            teleprompterLargeText ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'
                          } text-neutral-300 leading-relaxed`}
                        >
                          {matchingPillar.breaksBelief}
                        </p>
                        {currentVideo.notes?.trim() && (
                          <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25">
                            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-300 block mb-0.5">
                              STORY / EXAMPLE BEAT TO DROP IN TAKE 3:
                            </span>
                            <p
                              className={`${
                                teleprompterLargeText ? 'text-sm sm:text-lg' : 'text-xs'
                              } text-amber-100 leading-relaxed`}
                            >
                              {currentVideo.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="border-l-2 border-[#09ADEF]/50 pl-3.5 space-y-2.5">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF] block mb-1">
                            TAKE 4 · FORMULATE THE 2MM SHIFT (1:45–3:00)
                          </span>
                          <p
                            className={`${
                              teleprompterLargeText ? 'text-base sm:text-xl' : 'text-xs sm:text-sm'
                            } text-white leading-relaxed font-medium`}
                          >
                            {matchingPillar.installsBelief}
                          </p>
                        </div>

                        {matchingPillar.mustHitBeats && (
                          <div className="p-2.5 rounded-lg bg-[#09ADEF]/10 border border-[#09ADEF]/25">
                            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#09ADEF] block mb-0.5">
                              MUST-HIT TEACHING BEATS:
                            </span>
                            <p
                              className={`${
                                teleprompterLargeText ? 'text-sm sm:text-lg' : 'text-xs'
                              } text-zinc-100 font-semibold leading-relaxed`}
                            >
                              {matchingPillar.mustHitBeats}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAKE 5: TRANSFER CTA */}
                  {attachedMagnet && (
                    <div className="pt-4 border-t border-white/[0.07]">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                          TAKE 5 · TRANSFER CTA (3:00–3:10)
                        </span>
                        <span className="text-[10px] text-neutral-500">Urgent punch-in close-up</span>
                      </div>
                      <p
                        className={`${
                          teleprompterLargeText ? 'text-lg sm:text-2xl' : 'text-sm sm:text-base'
                        } font-medium text-white leading-relaxed`}
                      >
                        “Comment <span className="text-[#09ADEF] font-bold">‘{attachedMagnet.keywordTrigger}’</span> below and I’ll DM you the {attachedMagnet.workingTitle} ({attachedMagnet.completionTime}).”
                      </p>
                    </div>
                  )}
                </div>

                {/* Collapsible 5-Take Camera Angles Guide */}
                <details className="group rounded-xl bg-[#040507] border border-white/[0.07] p-3.5">
                  <summary className="text-xs font-semibold text-neutral-300 cursor-pointer flex items-center justify-between list-none">
                    <span>5-Take Camera Framing Guide</span>
                    <span className="text-[#09ADEF] text-[11px] group-open:rotate-90 transition-transform">▸</span>
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 mt-3 pt-3 border-t border-white/[0.07]">
                    {FIVE_TAKES_GUIDE.map(row => (
                      <div key={row.take} className="p-2.5 rounded-xl bg-black border border-white/[0.07] text-xs">
                        <div className="font-bold text-[#09ADEF]">{row.take}</div>
                        <div className="text-[10px] text-neutral-500 mb-1">{row.time}</div>
                        <p className="text-neutral-300 text-[11px] leading-relaxed">{row.camera}</p>
                      </div>
                    ))}
                  </div>
                </details>

                <div className="pt-4 border-t border-white/[0.07] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0A0C10] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-neutral-300 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg btn-2mm text-xs cursor-pointer"
                  >
                    <span>Next: Verify Link</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PANEL 4: PASTE PUBLISHED SOCIAL PROOF LINK & COMPLETE */}
            {activeStep === 4 && (
              <div className="space-y-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                    STEP 4 · PROOF OF EXECUTION
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl text-white mt-1">
                    {currentVideo.coachReviewStatus === 'Needs Revision'
                      ? 'SUBMIT REVISED VIDEO LINK'
                      : 'VERIFY PUBLISHED VIDEO LINK'}
                  </h2>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#09ADEF] absolute left-3.5 sm:left-4 top-3.5" />
                    <input
                      id="social-proof-url"
                      type="url"
                      value={videoLinkInput}
                      onChange={e => {
                        setVideoLinkInput(e.target.value);
                        if (linkError) setLinkError(null);
                      }}
                      placeholder="https://www.instagram.com/reel/..."
                      className="w-full rounded-lg bg-[#040507] border border-white/15 pl-10 sm:pl-12 pr-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#09ADEF]"
                    />
                  </div>

                  {linkError && (
                    <div className="flex items-center gap-2.5 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{linkError}</span>
                    </div>
                  )}

                  {/* Option to Post Video Link to Discussion & Notify All Students */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-[#040507] border border-[#09ADEF]/30 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shareToGroupOnVerify}
                        onChange={e => setShareToGroupOnVerify(e.target.checked)}
                        className="mt-0.5 rounded accent-[#09ADEF] w-4 h-4 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <Users className="w-3.5 h-3.5 text-[#09ADEF]" />
                          <span>Post Link to Discussion & Notify All Students</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                          Notifies all students that you posted a new video so they can learn from your output. When Coach Josh reviews this video, his feedback will automatically append to the discussion thread.
                        </p>
                      </div>
                    </label>

                    {shareToGroupOnVerify && (
                      <input
                        type="text"
                        value={groupShareNote}
                        onChange={e => setGroupShareNote(e.target.value)}
                        placeholder="Add a takeaway or question for the discussion thread (optional)..."
                        className="w-full rounded-lg bg-black border border-white/12 px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#09ADEF]"
                      />
                    )}
                  </div>
                </div>

                {currentVideo.status === 'Completed' && currentVideo.coachReviewStatus !== 'Needs Revision' ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl bg-[#040507] border border-[#09ADEF]/30 p-4 sm:p-5">
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="w-6 h-6 text-[#09ADEF] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold uppercase tracking-wider text-[#09ADEF]">
                            Day #{currentVideo.dayNumber} Verified · {currentVideo.coachReviewStatus || 'Pending Coach Review'}
                          </div>
                          <a
                            href={currentVideo.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[#09ADEF] hover:underline flex items-center gap-1 truncate mt-0.5"
                          >
                            <span className="truncate">{currentVideo.videoUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {videoLinkInput.trim() &&
                          videoLinkInput.trim() !== (currentVideo.videoUrl || '').trim() && (
                            <button
                              type="button"
                              onClick={handleCompleteCurrent}
                              className="px-4 py-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                              Update Link
                            </button>
                          )}

                        {currentVideo.sharedToGroup && onOpenGroupThread ? (
                          <button
                            type="button"
                            onClick={() => onOpenGroupThread(currentVideo.groupPostId)}
                            className="px-3.5 py-2.5 rounded-lg bg-[#09ADEF]/15 hover:bg-[#09ADEF]/25 border border-[#09ADEF]/40 text-[#09ADEF] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Open Discussion Thread →</span>
                          </button>
                        ) : (
                          onShareVideoToGroup && (
                            <button
                              type="button"
                              onClick={() => {
                                onShareVideoToGroup({
                                  studentId: student.id,
                                  videoType: 'SUPPORTING',
                                  videoId: currentVideo.id,
                                  note: groupShareNote.trim() || undefined,
                                  notifyCohort: true
                                });
                                setGroupShareNote('');
                              }}
                              className="px-3.5 py-2.5 rounded-lg bg-[#09ADEF]/15 hover:bg-[#09ADEF]/25 border border-[#09ADEF]/40 text-[#09ADEF] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Post to Discussion & Notify</span>
                            </button>
                          )
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const nextIdx = student.supportingVideos.findIndex(
                              v => v.status !== 'Completed' || v.coachReviewStatus === 'Needs Revision'
                            );
                            if (nextIdx >= 0 && nextIdx !== selectedIndex) {
                              setSelectedIndex(nextIdx);
                              setActiveStep(1);
                            } else if (selectedIndex < student.supportingVideos.length - 1) {
                              setSelectedIndex(selectedIndex + 1);
                              setActiveStep(1);
                            }
                          }}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-lg btn-2mm text-xs cursor-pointer"
                        >
                          Load Next Day →
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep(3)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0A0C10] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-neutral-300 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>

                    <button
                      type="button"
                      onClick={handleCompleteCurrent}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg btn-2mm text-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {currentVideo.coachReviewStatus === 'Needs Revision'
                          ? `Resubmit Revised Link for Day #${currentVideo.dayNumber}`
                          : shareToGroupOnVerify
                          ? `Verify Day #${currentVideo.dayNumber} & Share to Discussion`
                          : `Verify & Complete Day #${currentVideo.dayNumber}`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: 50-ITEM CONCUSSION CONTENT QUEUE */}
      {subTab === 'QUEUE' && (
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/8">
            <div>
              <h2 className="text-xl font-semibold text-white">
                50-Item Daily Concussion Content
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any day to open it in the 10-Minute Studio.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value)}
                className="rounded-xl bg-[#0B0D14] border border-white/12 text-xs text-slate-200 px-3 py-2 focus:outline-none focus:border-sky-400"
              >
                <option value="ALL">All Funnel Stages ({student.supportingVideos.length})</option>
                {uniqueStages.map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredSupporting.map(item => {
              const actualIndex = student.supportingVideos.findIndex(v => v.id === item.id);
              const isSelected = actualIndex === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedIndex(actualIndex);
                    setSubTab('STUDIO');
                    setActiveStep(item.coachReviewStatus === 'Needs Revision' ? 4 : 1);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-sky-500/12 border-sky-400'
                      : 'bg-white/[0.02] border-white/8 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-sky-400">
                        Day #{String(item.dayNumber).padStart(2, '0')}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">{item.pillarStage}</span>
                    </div>
                    <div className="text-sm font-medium text-white truncate">{item.title}</div>
                    {item.coachFeedback ? (
                      <div className="text-xs text-[#09ADEF] truncate">
                        Coach Note: “{item.coachFeedback}”
                      </div>
                    ) : item.videoUrl ? (
                      <div className="text-xs text-emerald-400 truncate">✓ {item.videoUrl}</div>
                    ) : (
                      <div className="text-xs text-slate-400 truncate">“{item.hook1}”</div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                        item.status === 'Completed'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : item.status === 'Missed'
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-white/8 text-slate-400'
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.coachReviewStatus && (
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          item.coachReviewStatus === 'Approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : item.coachReviewStatus === 'Needs Revision'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-[#09ADEF]/20 text-[#09ADEF]'
                        }`}
                      >
                        {item.coachReviewStatus === 'Approved'
                          ? '✓ Approved'
                          : item.coachReviewStatus === 'Needs Revision'
                          ? '↻ Revise'
                          : '⏳ In Review'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: THE 5 CORE BRAND VIDEOS (B1–B5) — 1-PANEL SLIDER */}
      {subTab === 'CORE5' && (() => {
        const totalCore = student.coreVideos.length;
        const safeCoreIdx = Math.min(coreSlideIdx, Math.max(totalCore - 1, 0));
        const core = student.coreVideos[safeCoreIdx];
        if (!core) return null;

        const currentCoreUrl =
          coreUrlDrafts[core.id] !== undefined ? coreUrlDrafts[core.id] : core.videoUrl || '';

        const handleVerifyCoreUrl = () => {
          if (!isValidProofUrl(currentCoreUrl)) {
            setCoreUrlError(
              'Please enter a valid published video URL (YouTube, Loom, Vimeo, Instagram, etc.) to submit for Coach Review.'
            );
            return;
          }
          const normalized = currentCoreUrl.trim().startsWith('http')
            ? currentCoreUrl.trim()
            : `https://${currentCoreUrl.trim()}`;
          setCoreUrlError(null);
          onUpdateCoreVideoStatus(core.id, 'Completed', normalized, undefined, {
            shareToGroup: shareCoreToGroup
          });
        };

        return (
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-6 space-y-5">
              {/* Top Slider Header */}
              <div className="p-4 rounded-xl bg-[#000000] border border-white/[0.08] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                      CORE VIDEO {safeCoreIdx + 1} OF {totalCore} · {core.code} ({core.week})
                    </div>
                    <h2 className="font-display text-2xl uppercase text-white tracking-wide mt-0.5">
                      The 5 Core Brand Videos (B1–B5)
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safeCoreIdx === 0}
                      onClick={() => {
                        setCoreSlideIdx(i => Math.max(0, i - 1));
                        setCoreUrlError(null);
                      }}
                      className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={safeCoreIdx >= totalCore - 1}
                      onClick={() => {
                        setCoreSlideIdx(i => Math.min(totalCore - 1, i + 1));
                        setCoreUrlError(null);
                      }}
                      className="p-2 rounded-lg bg-[#09ADEF]/15 border border-[#09ADEF]/40 text-[#09ADEF] hover:bg-[#09ADEF]/25 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Range Slider + Pill Selector */}
                <input
                  type="range"
                  min={0}
                  max={totalCore - 1}
                  value={safeCoreIdx}
                  onChange={e => {
                    setCoreSlideIdx(Number(e.target.value));
                    setCoreUrlError(null);
                  }}
                  className="w-full accent-[#09ADEF] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {student.coreVideos.map((cv, idx) => {
                    const isCurrent = idx === safeCoreIdx;
                    const isDone = cv.status === 'Completed';
                    const needsRev = cv.coachReviewStatus === 'Needs Revision';
                    return (
                      <button
                        key={cv.id}
                        type="button"
                        onClick={() => {
                          setCoreSlideIdx(idx);
                          setCoreUrlError(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] transition-all cursor-pointer shrink-0 ${
                          isCurrent
                            ? 'bg-[#09ADEF] text-white'
                            : needsRev
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isDone
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-white'
                        }`}
                      >
                        {cv.code} {needsRev ? '↻' : isDone ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Single Core Video Card */}
              <div key={core.id} className="p-5 sm:p-6 rounded-xl bg-[#000000] border border-white/[0.08] space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge-2mm px-2.5 py-0.5 rounded text-[10px]">
                        {core.code} · {core.week}
                      </span>
                      <span className="text-xs text-zinc-400">Target Runtime: {core.runtimeTarget}</span>
                      <span className="px-2 py-0.5 rounded bg-[#09ADEF]/10 border border-[#09ADEF]/30 text-[10px] font-semibold text-[#09ADEF]">
                        {core.code === 'B1'
                          ? '⇄ Two-Way Synced with Lesson 10'
                          : core.code === 'B2'
                          ? '⇄ Two-Way Synced with Lesson 11'
                          : core.code === 'B3'
                          ? '⇄ Two-Way Synced with Lesson 12'
                          : core.code === 'B4'
                          ? '⇄ Two-Way Synced with Lesson 13'
                          : '⇄ Linked to Lesson 7 Matrix & Lessons 14–17'}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl uppercase text-white tracking-wide mt-2">{core.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1">{core.purpose}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="url"
                      value={currentCoreUrl}
                      placeholder="Paste published YouTube/VSL URL..."
                      onChange={e => {
                        setCoreUrlDrafts(prev => ({ ...prev, [core.id]: e.target.value }));
                        if (coreUrlError) setCoreUrlError(null);
                      }}
                      className="rounded-xl bg-[#040507] border border-white/12 px-3 py-2 text-xs text-white w-60 sm:w-64 focus:outline-none focus:border-[#09ADEF]"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCoreUrl}
                      className="btn-2mm px-3.5 py-2 rounded-xl text-[10px] cursor-pointer shrink-0"
                    >
                      {core.coachReviewStatus === 'Needs Revision'
                        ? 'Resubmit Link'
                        : core.status === 'Completed'
                        ? 'Update Link'
                        : 'Verify & Submit'}
                    </button>
                    <select
                      value={core.status}
                      onChange={e => {
                        const nextStatus = e.target.value as 'Not Started' | 'In Progress' | 'Completed';
                        if (nextStatus === 'Completed' && !isValidProofUrl(currentCoreUrl)) {
                          setCoreUrlError(
                            'Paste your published video URL first before marking this Core Video Completed.'
                          );
                          return;
                        }
                        onUpdateCoreVideoStatus(core.id, nextStatus, currentCoreUrl.trim() || core.videoUrl, undefined, {
                          shareToGroup: shareCoreToGroup
                        });
                      }}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer ${
                        core.status === 'Completed'
                          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                          : core.status === 'In Progress'
                          ? 'border-[#09ADEF]/40 bg-[#09ADEF]/15 text-[#09ADEF]'
                          : 'border-white/12 bg-[#040507] text-zinc-300'
                      }`}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Core Video Discussion Share Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#040507] border border-[#09ADEF]/25">
                  <label className="flex items-center gap-2 text-xs text-neutral-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareCoreToGroup}
                      onChange={e => setShareCoreToGroup(e.target.checked)}
                      className="rounded accent-[#09ADEF] w-3.5 h-3.5"
                    />
                    <span>Post Core Video link to Discussion & notify all students when verified</span>
                  </label>

                  {core.status === 'Completed' && core.videoUrl && (
                    core.sharedToGroup && onOpenGroupThread ? (
                      <button
                        type="button"
                        onClick={() => onOpenGroupThread(core.groupPostId)}
                        className="px-3 py-1 rounded-lg bg-[#09ADEF]/15 hover:bg-[#09ADEF]/25 border border-[#09ADEF]/40 text-[10px] font-bold uppercase tracking-wider text-[#09ADEF] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Users className="w-3 h-3" />
                        <span>Open Discussion Thread →</span>
                      </button>
                    ) : (
                      onShareVideoToGroup && (
                        <button
                          type="button"
                          onClick={() =>
                            onShareVideoToGroup({
                              studentId: student.id,
                              videoType: 'CORE',
                              videoId: core.id,
                              notifyCohort: true
                            })
                          }
                          className="px-3 py-1 rounded-lg bg-[#09ADEF]/15 hover:bg-[#09ADEF]/25 border border-[#09ADEF]/40 text-[10px] font-bold uppercase tracking-wider text-[#09ADEF] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Post to Discussion Now</span>
                        </button>
                      )
                    )
                  )}
                </div>

                {coreUrlError && (
                  <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{coreUrlError}</span>
                  </div>
                )}

                {(core.coachReviewStatus || core.coachFeedback) && (
                  <div
                    className={`p-3.5 rounded-xl border ${
                      core.coachReviewStatus === 'Approved'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : core.coachReviewStatus === 'Needs Revision'
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : 'bg-[#09ADEF]/10 border-[#09ADEF]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                        COACH REVIEW · {core.coachReviewStatus || 'Pending Review'}
                      </span>
                      {core.coachReviewedAt && (
                        <span className="text-[10px] text-zinc-400">{core.coachReviewedAt}</span>
                      )}
                    </div>
                    {core.coachFeedback && (
                      <p className="text-xs text-white mt-1 leading-relaxed">“{core.coachFeedback}”</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                  {(['S', 'H', 'I', 'F', 'T'] as const).map(letter => (
                    <div key={letter} className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.07] space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">{letter} Stage</div>
                      <p className="text-xs text-zinc-200 leading-relaxed">{core.shiftStages[letter]}</p>
                    </div>
                  ))}
                </div>

                <details className="group rounded-xl bg-[#040507] border border-white/[0.08] p-3.5">
                  <summary className="text-xs font-semibold text-neutral-300 cursor-pointer flex items-center justify-between list-none">
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#09ADEF]" />
                      <span>Customize S.H.I.F.T. Script Beats (Two-Way Synced with Workbook)</span>
                    </span>
                    <span className="text-[#09ADEF] text-[11px] group-open:rotate-90 transition-transform">▸</span>
                  </summary>
                  <div className="mt-3 pt-3 border-t border-white/[0.07] grid grid-cols-1 md:grid-cols-5 gap-2.5">
                    {(['S', 'H', 'I', 'F', 'T'] as const).map(letter => {
                      const draftObj = core.scriptDraft || { S: '', H: '', I: '', F: '', T: '' };
                      return (
                        <div key={letter} className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                            {letter} Beat Draft
                          </label>
                          <textarea
                            rows={2}
                            value={draftObj[letter] || ''}
                            onChange={e =>
                              onUpdateCoreVideoStatus(core.id, core.status === 'Completed' ? 'Completed' : 'In Progress', core.videoUrl, {
                                ...draftObj,
                                [letter]: e.target.value
                              })
                            }
                            placeholder={`Draft your ${letter} stage script beat...`}
                            className="w-full rounded-lg bg-black border border-white/10 p-2 text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#09ADEF]"
                          />
                        </div>
                      );
                    })}
                  </div>
                </details>

                {/* B5 Exclusive: 20-Video Expert Demo Matrix Tracker (Lessons 7 & 14–17) */}
                {core.code === 'B5' && (() => {
                  const demoItems = Array.from({ length: 20 }, (_, i) => {
                    const num = i + 1;
                    const padded = String(num).padStart(2, '0');
                    const batchLesson = num <= 5 ? 14 : num <= 10 ? 15 : num <= 15 ? 16 : 17;
                    const scriptKey = `l${batchLesson}_v${padded}_script`;
                    const matrixCellKey = `m06_cell_${padded}`;
                    const title = student.worksheetAnswers[matrixCellKey]?.trim() || `Demo Video #${padded}`;
                    const script = student.worksheetAnswers[scriptKey]?.trim() || '';
                    return { num, padded, batchLesson, title, script, hasScript: Boolean(script) };
                  });
                  const scriptedCount = demoItems.filter(d => d.hasScript).length;

                  return (
                    <div className="p-4 rounded-xl bg-[#040507] border border-white/[0.08] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                            B5 · 20 EXPERT DEMO VIDEOS MATRIX (LESSONS 7 & 14–17)
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Working titles pull from Lesson 7 (5×4 Matrix) and script outlines pull from Lessons 14–17 (Batches 1–4).
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#09ADEF]/15 border border-[#09ADEF]/30 text-[10px] font-bold text-[#09ADEF]">
                          {scriptedCount} / 20 Scripted in Workbook
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                        {demoItems.map(item => (
                          <div
                            key={item.num}
                            className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between gap-1.5 ${
                              item.hasScript
                                ? 'bg-emerald-500/[0.07] border-emerald-500/30 text-white'
                                : 'bg-black border-white/10 text-zinc-400'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF]">
                                #{item.padded} · L{item.batchLesson}
                              </span>
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  item.hasScript
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-white/5 text-zinc-500'
                                }`}
                              >
                                {item.hasScript ? '✓ Scripted' : 'Pending'}
                              </span>
                            </div>
                            <div className="font-semibold text-[11px] text-zinc-100 line-clamp-2">
                              {item.title}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Bottom Prev / Next Bar */}
                <div className="pt-4 border-t border-white/[0.07] flex items-center justify-between">
                  <button
                    type="button"
                    disabled={safeCoreIdx === 0}
                    onClick={() => setCoreSlideIdx(i => Math.max(0, i - 1))}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold uppercase tracking-[0.14em] text-zinc-300 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev Core Video
                  </button>
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    {core.code} ({safeCoreIdx + 1} / {totalCore})
                  </span>
                  <button
                    type="button"
                    disabled={safeCoreIdx >= totalCore - 1}
                    onClick={() => setCoreSlideIdx(i => Math.min(totalCore - 1, i + 1))}
                    className="btn-2mm inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs disabled:opacity-30 cursor-pointer"
                  >
                    Next Core Video
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 4: CONTENT PLAYBOOK MATRIX (15 PILLARS x 4 ANGLES) — 1-PANEL SLIDER */}
      {subTab === 'PLAYBOOK' && (() => {
        const totalPillars = student.playbook.length;
        const safePillarIdx = Math.min(pillarSlideIdx, Math.max(totalPillars - 1, 0));
        const pillar = student.playbook[safePillarIdx];
        if (!pillar) return null;

        return (
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-6 space-y-5">
              {/* Top Slider Header */}
              <div className="p-4 rounded-xl bg-[#000000] border border-white/[0.08] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                      PILLAR PANEL {safePillarIdx + 1} OF {totalPillars} · {pillar.stage}
                    </div>
                    <h2 className="font-display text-2xl uppercase text-white tracking-wide mt-0.5">
                      Content Playbook Matrix ({totalPillars} Core Pillars · 60 Angles)
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safePillarIdx === 0}
                      onClick={() => setPillarSlideIdx(i => Math.max(0, i - 1))}
                      className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={safePillarIdx >= totalPillars - 1}
                      onClick={() => setPillarSlideIdx(i => Math.min(totalPillars - 1, i + 1))}
                      className="p-2 rounded-lg bg-[#09ADEF]/15 border border-[#09ADEF]/40 text-[#09ADEF] hover:bg-[#09ADEF]/25 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={totalPillars - 1}
                  value={safePillarIdx}
                  onChange={e => setPillarSlideIdx(Number(e.target.value))}
                  className="w-full accent-[#09ADEF] h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {student.playbook.map((p, idx) => {
                    const isCurrent = idx === safePillarIdx;
                    const isDone = p.status === 'Completed';
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPillarSlideIdx(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] transition-all cursor-pointer shrink-0 ${
                          isCurrent
                            ? 'bg-[#09ADEF] text-white'
                            : isDone
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-white'
                        }`}
                      >
                        P{idx + 1} {isDone ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Single Pillar Card */}
              <div key={pillar.id} className="p-5 sm:p-6 rounded-xl bg-[#000000] border border-white/[0.08] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                      PILLAR #{safePillarIdx + 1} · {pillar.stage}
                    </span>
                    <h3 className="font-display text-2xl sm:text-3xl uppercase text-white tracking-wide mt-1">
                      {pillar.pillar}
                    </h3>
                  </div>

                  <select
                    value={pillar.status}
                    onChange={e => onUpdatePillarStatus(pillar.id, e.target.value)}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer ${
                      pillar.status === 'Completed'
                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                        : pillar.status === 'In Progress'
                        ? 'border-[#09ADEF]/40 bg-[#09ADEF]/15 text-[#09ADEF]'
                        : 'border-white/12 bg-[#040507] text-zinc-300'
                    }`}
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-rose-500/[0.06] border border-rose-500/20">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-300 block mb-1.5">
                      Breaks (Old Belief)
                    </span>
                    <span className="text-zinc-100 leading-relaxed">{pillar.breaksBelief}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#09ADEF]/[0.07] border border-[#09ADEF]/25">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF] block mb-1.5">
                      Installs (New Belief)
                    </span>
                    <span className="text-zinc-100 leading-relaxed">{pillar.installsBelief}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#040507] border border-white/[0.08]">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400 block mb-1.5">
                      Must-Hit Beats
                    </span>
                    <span className="text-zinc-200 leading-relaxed">{pillar.mustHitBeats}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-[#040507] border border-white/[0.07]">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">1. Actionable (How-To)</div>
                    <div className="text-xs text-white mt-1.5 leading-relaxed">“{pillar.angles.actionable}”</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#040507] border border-white/[0.07]">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">2. Analytical (Data)</div>
                    <div className="text-xs text-white mt-1.5 leading-relaxed">“{pillar.angles.analytical}”</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#040507] border border-white/[0.07]">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">3. Psychological</div>
                    <div className="text-xs text-white mt-1.5 leading-relaxed">“{pillar.angles.psychological}”</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#040507] border border-white/[0.07]">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">4. Aspirational (Story)</div>
                    <div className="text-xs text-white mt-1.5 leading-relaxed">“{pillar.angles.aspirational}”</div>
                  </div>
                </div>

                {/* Bottom Prev / Next Bar */}
                <div className="pt-4 border-t border-white/[0.07] flex items-center justify-between">
                  <button
                    type="button"
                    disabled={safePillarIdx === 0}
                    onClick={() => setPillarSlideIdx(i => Math.max(0, i - 1))}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold uppercase tracking-[0.14em] text-zinc-300 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev Pillar
                  </button>
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    Pillar {safePillarIdx + 1} of {totalPillars}
                  </span>
                  <button
                    type="button"
                    disabled={safePillarIdx >= totalPillars - 1}
                    onClick={() => setPillarSlideIdx(i => Math.min(totalPillars - 1, i + 1))}
                    className="btn-2mm inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs disabled:opacity-30 cursor-pointer"
                  >
                    Next Pillar
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Quick Day Switcher Modal */}
      <ModalDialog
        isOpen={showQueueDrawer}
        onClose={() => setShowQueueDrawer(false)}
        title="Jump to Any Daily Video"
        subtitle="50-Item Concussion Content"
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {student.supportingVideos.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedIndex(idx);
                setActiveStep(1);
                setShowQueueDrawer(false);
              }}
              className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                idx === selectedIndex
                  ? 'bg-sky-500/15 border-sky-400 text-white'
                  : 'bg-white/[0.02] border-white/8 hover:bg-white/[0.05] text-slate-200'
              }`}
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-sky-400">
                  Day #{String(item.dayNumber).padStart(2, '0')} · {item.pillarStage}
                </div>
                <div className="text-sm font-medium truncate mt-0.5">{item.title}</div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
                  item.status === 'Completed'
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-white/8 text-slate-400'
                }`}
              >
                {item.status}
              </span>
            </button>
          ))}
        </div>
      </ModalDialog>
    </div>
  );
};
