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
  Play
} from 'lucide-react';
import { StudentProfile, SupportingVideoItem, PlaybookPillar } from '../types';
import { ModalDialog } from './ModalDialog';

interface DailyCadenceViewProps {
  student: StudentProfile;
  onUpdateVideo: (videoId: string, updates: Partial<SupportingVideoItem>) => void;
  onMarkVideoDone: (videoId: string, videoUrl: string) => void;
  onUpdatePillarStatus: (pillarId: string, status: string) => void;
  onUpdateCoreVideoStatus: (
    coreId: string,
    status: 'Not Started' | 'In Progress' | 'Completed',
    url?: string,
    scriptDraft?: { S: string; H: string; I: string; F: string; T: string }
  ) => void;
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
  const [coreUrlDrafts, setCoreUrlDrafts] = useState<Record<string, string>>({});
  const [coreUrlError, setCoreUrlError] = useState<string | null>(null);
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);

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

  useEffect(() => {
    setVideoLinkInput(currentVideo?.videoUrl || '');
    setLinkError(null);
  }, [currentVideo?.id, currentVideo?.videoUrl]);

  const completedSupportingCount = student.supportingVideos.filter(v => v.status === 'Completed').length;
  const completedCoreCount = student.coreVideos.filter(v => v.status === 'Completed').length;
  const completedPillarCount = student.playbook.filter(p => p.status === 'Completed').length;

  const revisionSupportingVideos = student.supportingVideos.filter(
    v => v.coachReviewStatus === 'Needs Revision'
  );
  const revisionCoreVideos = student.coreVideos.filter(
    c => c.coachReviewStatus === 'Needs Revision'
  );

  const matchingPillar: PlaybookPillar | undefined =
    student.playbook.find(
      p => p.stage.slice(0, 10).toLowerCase() === currentVideo?.pillarStage.slice(0, 10).toLowerCase()
    ) || student.playbook[0];

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
    onMarkVideoDone(currentVideo.id, normalizedUrl);
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

  return (
    <div className="space-y-4 sm:space-y-6">
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

      {/* Clean Sub-Navigation & Day Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex overflow-x-auto no-scrollbar p-1 rounded-xl bg-[#07090D] border border-white/[0.08] w-full sm:w-auto">
          {[
            { id: 'STUDIO' as const, label: 'Studio', icon: Sparkles },
            { id: 'QUEUE' as const, label: `50 Videos (${completedSupportingCount})`, icon: ListVideo },
            { id: 'CORE5' as const, label: `5 Core (${completedCoreCount}/5)`, icon: Award },
            { id: 'PLAYBOOK' as const, label: `Playbook (${completedPillarCount})`, icon: Layers }
          ].map(tab => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-[#09ADEF] text-white shadow-[0_4px_20px_rgba(9,173,239,0.35)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
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
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Clean Current Day Header + 4-Step Segmented Bar */}
          <div className="glass-panel rounded-2xl p-5 sm:p-7">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-[1.5px] bg-[#09ADEF]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#09ADEF]">
                  DAY #{currentVideo.dayNumber} · {shiftDay.day} · {shiftDay.stage}
                </span>
              </div>

              <div className="flex items-center gap-1">
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

            <h1 className="font-display text-2xl sm:text-4xl text-white tracking-wide">
              “{currentVideo.title}”
            </h1>

            {/* Coach Review & Feedback Banner (Visible to Student once submitted or reviewed) */}
            {(currentVideo.coachReviewStatus || currentVideo.coachFeedback) && (
              <div
                className={`mt-4 p-3.5 sm:p-4 rounded-xl border ${
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
              </div>
            )}

            {/* Clean Single-Row 4-Step Stepper */}
            <div className="grid grid-cols-4 gap-1.5 mt-5 pt-4 border-t border-white/[0.07]">
              {steps.map(s => {
                const isCurrent = activeStep === s.num;
                const isPassed = activeStep > s.num || currentVideo.status === 'Completed';
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setActiveStep(s.num)}
                    className={`py-2 px-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] ${
                      isCurrent
                        ? 'bg-[#09ADEF] text-white border-[#09ADEF] shadow-[0_4px_20px_rgba(9,173,239,0.35)]'
                        : isPassed
                        ? 'bg-[#09ADEF]/12 border-[#09ADEF]/30 text-[#09ADEF]'
                        : 'bg-[#07090D] border-white/[0.07] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {isPassed && !isCurrent ? (
                      <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
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
          <div className="glass-panel rounded-2xl p-5 sm:p-7 transition-all">
            {/* PANEL 1: CHOOSE YOUR HOOK */}
            {activeStep === 1 && (
              <div className="space-y-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                  STEP 1 · SELECT OPENING HOOK
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
                        onClick={() => onUpdateVideo(currentVideo.id, { selectedHook: h.num, customHook: undefined })}
                        className={`w-full text-left p-4 sm:p-5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#09ADEF]/10 border-[#09ADEF] shadow-[0_8px_30px_rgba(9,173,239,0.12)]'
                            : 'bg-[#040507] border-white/[0.07] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
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

                {/* Custom Hook & Personal Talking Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.08] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                        Custom / Tweaked Hook (Optional)
                      </label>
                      {currentVideo.customHook?.trim() && (
                        <button
                          type="button"
                          onClick={() => onUpdateVideo(currentVideo.id, { customHook: undefined })}
                          className="text-[10px] text-neutral-400 hover:text-white cursor-pointer"
                        >
                          Reset to Preset
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={currentVideo.customHook || ''}
                      onChange={e => onUpdateVideo(currentVideo.id, { customHook: e.target.value })}
                      placeholder="Or write your own opening hook for the Teleprompter..."
                      className="w-full rounded-lg bg-black border border-white/12 px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#09ADEF]"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.08] space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                      Personal Example / Story Beat Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={currentVideo.notes || ''}
                      onChange={e => onUpdateVideo(currentVideo.id, { notes: e.target.value })}
                      placeholder="Jot down a quick client story or stat for your shoot..."
                      className="w-full rounded-lg bg-black border border-white/12 px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#09ADEF]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.07] flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg btn-2mm text-xs cursor-pointer"
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
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                  STEP 2 · THE 2MM BELIEF SHIFT & CTA
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
                      onChange={e => onUpdateVideo(currentVideo.id, { attachedMagnetId: e.target.value })}
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
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                    STEP 3 · TELEPROMPTER & 5-TAKE SHOOT
                  </div>

                  {/* Sleek Pill Timer */}
                  <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#040507] border border-white/12">
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

                {/* Large Readable Teleprompter Card */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#040507] border border-[#09ADEF]/30 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF] block mb-1">
                      1. SIGNAL HOOK (0:00–0:15)
                    </span>
                    <p className="text-lg sm:text-2xl font-semibold text-white leading-relaxed">
                      “{activeHookText}”
                    </p>
                  </div>

                  {matchingPillar && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/[0.07]">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400 block mb-1">
                          2. ILLUMINATE (OLD BELIEF)
                        </span>
                        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                          {matchingPillar.breaksBelief}
                        </p>
                      </div>
                      <div className="border-l-2 border-[#09ADEF]/50 pl-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF] block mb-1">
                          3. FORMULATE (THE 2MM SHIFT)
                        </span>
                        <p className="text-xs sm:text-sm text-white leading-relaxed">
                          {matchingPillar.installsBelief}
                        </p>
                      </div>
                    </div>
                  )}

                  {currentVideo.notes?.trim() && (
                    <div className="pt-3 border-t border-white/[0.07]">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300 block mb-1">
                        PERSONAL STORY / TALKING NOTE
                      </span>
                      <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
                        {currentVideo.notes}
                      </p>
                    </div>
                  )}

                  {attachedMagnet && (
                    <div className="pt-4 border-t border-white/[0.07]">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF] block mb-1">
                        4. TRANSFER CTA (3:00–3:10)
                      </span>
                      <p className="text-sm sm:text-base font-medium text-white">
                        “Comment <span className="text-[#09ADEF] font-bold">‘{attachedMagnet.keywordTrigger}’</span> below and I’ll DM you the {attachedMagnet.workingTitle}.”
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
          onUpdateCoreVideoStatus(core.id, 'Completed', normalized);
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
                    <div className="flex items-center gap-2">
                      <span className="badge-2mm px-2.5 py-0.5 rounded text-[10px]">
                        {core.code} · {core.week}
                      </span>
                      <span className="text-xs text-zinc-400">Target Runtime: {core.runtimeTarget}</span>
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
                        onUpdateCoreVideoStatus(core.id, nextStatus, currentCoreUrl.trim() || core.videoUrl);
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
                  {(['S', 'H', 'I', 'F', 'T'] as const).map(letter => {
                    const draftObj = core.scriptDraft || { S: '', H: '', I: '', F: '', T: '' };
                    return (
                      <div key={letter} className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.07] flex flex-col justify-between space-y-2.5">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">{letter} Stage</div>
                          <p className="text-xs text-zinc-200 mt-1.5 leading-relaxed">{core.shiftStages[letter]}</p>
                        </div>
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
