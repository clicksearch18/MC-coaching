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
  onUpdateCoreVideoStatus: (coreId: string, status: 'Not Started' | 'In Progress' | 'Completed', url?: string) => void;
  onOpenImportModal: () => void;
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
  onOpenImportModal
}) => {
  const firstActiveIndex = student.supportingVideos.findIndex(v => v.status !== 'Completed');
  const [selectedIndex, setSelectedIndex] = useState(firstActiveIndex >= 0 ? firstActiveIndex : 0);
  const [subTab, setSubTab] = useState<'STUDIO' | 'QUEUE' | 'CORE5' | 'PLAYBOOK'>('STUDIO');
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [videoLinkInput, setVideoLinkInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);

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

  const matchingPillar: PlaybookPillar | undefined =
    student.playbook.find(
      p => p.stage.slice(0, 10).toLowerCase() === currentVideo?.pillarStage.slice(0, 10).toLowerCase()
    ) || student.playbook[0];

  const selectedHookNum = currentVideo?.selectedHook || 1;
  const activeHookText =
    currentVideo?.customHook ||
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
    { num: 1 as const, title: 'Choose Hook', subtitle: 'Pick 1 of 3 angles' },
    { num: 2 as const, title: 'Belief & CTA', subtitle: 'Beats + Shift Magnet' },
    { num: 3 as const, title: 'Shoot Studio', subtitle: '5-Take Teleprompter' },
    { num: 4 as const, title: 'Verify Link', subtitle: 'Paste social URL' }
  ];

  return (
    <div className="space-y-6">
      {/* Sleek Segmented Sub-Navigation & Metrics Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/8 self-start">
          {[
            { id: 'STUDIO' as const, label: 'Today’s 10-Min Studio', icon: Sparkles },
            { id: 'QUEUE' as const, label: `Concussion Content (${completedSupportingCount}/50)`, icon: ListVideo },
            { id: 'CORE5' as const, label: `5 Core Videos (${completedCoreCount}/5)`, icon: Award },
            { id: 'PLAYBOOK' as const, label: `Playbook Matrix (${completedPillarCount}/15)`, icon: Layers }
          ].map(tab => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
            <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{student.streakDays} Day Streak</span>
          </div>

          <button
            type="button"
            onClick={() => setShowQueueDrawer(true)}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            Switch Day (#{currentVideo?.dayNumber})
          </button>

          <button
            type="button"
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-xs font-medium text-sky-300 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import Plan (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SEQUENTIAL 4-STEP DAILY STUDIO */}
      {subTab === 'STUDIO' && currentVideo && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Current Day Hero Header Card */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-semibold">
                  Day #{currentVideo.dayNumber} of {student.supportingVideos.length}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/[0.05] text-slate-300 text-xs">
                  {currentVideo.pillarStage}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 text-xs">
                  {shiftDay.day} · {shiftDay.stage} ({shiftDay.emotion})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={selectedIndex === 0}
                  onClick={() => {
                    setSelectedIndex(i => Math.max(0, i - 1));
                    setActiveStep(1);
                  }}
                  className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 text-slate-300 disabled:opacity-30 cursor-pointer"
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
                  className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 text-slate-300 disabled:opacity-30 cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
              “{currentVideo.title}”
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">{shiftDay.objective}</p>

            {/* Horizontal 4-Step Sequential Stepper */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-7 pt-6 border-t border-white/8">
              {steps.map(s => {
                const isCurrent = activeStep === s.num;
                const isPassed = activeStep > s.num || currentVideo.status === 'Completed';
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setActiveStep(s.num)}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isCurrent
                        ? 'bg-sky-500/15 border-sky-400 text-white shadow-sm'
                        : isPassed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-white/[0.02] border-white/8 text-slate-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isCurrent
                          ? 'bg-sky-400 text-slate-950'
                          : isPassed
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {isPassed && !isCurrent ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{s.title}</div>
                      <div className="text-[11px] opacity-75 truncate">{s.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEQUENTIAL PANEL CONTENT */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 transition-all">
            {/* PANEL 1: CHOOSE YOUR HOOK */}
            {activeStep === 1 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                      Step 1 of 4 · 0:00–0:15 Signal
                    </span>
                    <h2 className="text-xl font-semibold text-white mt-0.5">
                      Choose your opening hook
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">Select one option to continue</span>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {[
                    { num: 1 as const, badge: 'Option 1 · Outcome & Reputation', text: currentVideo.hook1 },
                    { num: 2 as const, badge: 'Option 2 · Contrarian & Curiosity', text: currentVideo.hook2 },
                    { num: 3 as const, badge: 'Option 3 · Status & Risk', text: currentVideo.hook3 }
                  ].map(h => {
                    const isSelected = selectedHookNum === h.num;
                    return (
                      <button
                        key={h.num}
                        type="button"
                        onClick={() => onUpdateVideo(currentVideo.id, { selectedHook: h.num, customHook: undefined })}
                        className={`w-full text-left p-5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/12 border-sky-400 shadow-lg shadow-sky-500/5'
                            : 'bg-white/[0.02] border-white/8 hover:border-white/20 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-sky-400">{h.badge}</span>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                              isSelected
                                ? 'bg-sky-400 border-sky-400 text-slate-950'
                                : 'border-white/20'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                        </div>
                        <p className="text-base text-slate-100 leading-relaxed font-medium">
                          “{h.text}”
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-white/8 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-sky-500/20"
                  >
                    <span>Next: Review Talking Beats & CTA</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PANEL 2: BELIEF SHIFT & SHIFT MAGNET CTA */}
            {activeStep === 2 && (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                    Step 2 of 4 · Core Spine & Lead Magnet
                  </span>
                  <h2 className="text-xl font-semibold text-white mt-0.5">
                    Review your talking points & select your CTA
                  </h2>
                </div>

                {matchingPillar && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-rose-500/[0.07] border border-rose-500/20">
                      <div className="text-xs font-semibold text-rose-300 uppercase tracking-wider mb-1.5">
                        Illuminate · Old Belief to Break
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">{matchingPillar.breaksBelief}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20">
                      <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-1.5">
                        Formulate · New Belief to Install
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">{matchingPillar.installsBelief}</p>
                    </div>

                    <div className="md:col-span-2 p-4 rounded-xl bg-white/[0.03] border border-white/8">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Must-Hit Talking Beats (Speak naturally, don’t memorize)
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">{matchingPillar.mustHitBeats}</p>
                    </div>
                  </div>
                )}

                <div className="p-5 rounded-xl bg-sky-500/[0.06] border border-sky-500/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Magnet className="w-4 h-4" />
                      Attached Shift Magnet (Transfer CTA)
                    </label>
                    <select
                      value={currentVideo.attachedMagnetId || attachedMagnet?.id || ''}
                      onChange={e => onUpdateVideo(currentVideo.id, { attachedMagnetId: e.target.value })}
                      className="rounded-lg bg-[#0B0D14] border border-white/15 text-xs text-white px-3 py-2 focus:outline-none focus:border-sky-400"
                    >
                      {student.shiftMagnets.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.workingTitle} (Keyword: "{m.keywordTrigger}")
                        </option>
                      ))}
                    </select>
                  </div>

                  {attachedMagnet && (
                    <div className="p-3.5 rounded-lg bg-[#0B0D14]/80 border border-white/8 text-sm text-slate-200">
                      <span className="text-xs font-semibold text-sky-400 block mb-1">
                        Your Closing Call-to-Action (Last 10 Seconds):
                      </span>
                      “Comment <strong className="text-white">‘{attachedMagnet.keywordTrigger}’</strong> below and I’ll DM you{' '}
                      <span className="text-sky-300 font-medium">{attachedMagnet.workingTitle}</span> — it takes{' '}
                      {attachedMagnet.completionTime} and shows you how to {attachedMagnet.promiseOneSentence.toLowerCase()}”
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/8 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Hook
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStep(3);
                      setTimerRunning(true);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-sky-500/20"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Next: Open Shoot Studio & Teleprompter</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PANEL 3: ON-CAMERA TELEPROMPTER & 5-TAKE GUIDE */}
            {activeStep === 3 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                      Step 3 of 4 · Shoot in 5 Quick Takes
                    </span>
                    <h2 className="text-xl font-semibold text-white mt-0.5">
                      On-Screen Teleprompter & Camera Guide
                    </h2>
                  </div>

                  {/* Sleek Pill Timer */}
                  <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0B0D14] border border-white/12">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <span className="font-mono-tech text-sm font-semibold text-white">
                      {formatTimer(timerSeconds)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTimerRunning(r => !r)}
                      className="text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
                    >
                      {timerRunning ? 'Pause' : 'Start'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTimerRunning(false);
                        setTimerSeconds(0);
                      }}
                      className="text-slate-400 hover:text-white cursor-pointer"
                      title="Reset timer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Large Readable Teleprompter Card */}
                <div className="p-6 rounded-2xl bg-[#0B0D14] border border-sky-500/30 space-y-5 shadow-inner">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400 block mb-1">
                      1. Signal Hook (0:00–0:15 · Close-up, high energy)
                    </span>
                    <p className="text-xl sm:text-2xl font-semibold text-white leading-relaxed">
                      “{activeHookText}”
                    </p>
                  </div>

                  {matchingPillar && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/8">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 block mb-1">
                          2. Illuminate (0:30–1:45 · Dismantle the myth)
                        </span>
                        <p className="text-sm text-slate-200 leading-relaxed">
                          {matchingPillar.breaksBelief}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
                          3. Formulate (1:45–3:00 · Teach the shift)
                        </span>
                        <p className="text-sm text-slate-200 leading-relaxed">
                          {matchingPillar.installsBelief}
                        </p>
                      </div>
                    </div>
                  )}

                  {attachedMagnet && (
                    <div className="pt-4 border-t border-white/8">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 block mb-1">
                        4. Transfer CTA (3:00–3:10 · Point down at caption)
                      </span>
                      <p className="text-base font-medium text-white">
                        “Comment <span className="text-sky-400 font-bold">‘{attachedMagnet.keywordTrigger}’</span> below and I’ll DM you the {attachedMagnet.workingTitle}.”
                      </p>
                    </div>
                  )}
                </div>

                {/* Compact 5-Take Accordion / Cards */}
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-2.5">
                    5-Take Camera Angles Reference (Illuminate & Formulate are 40% of runtime each):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                    {FIVE_TAKES_GUIDE.map(row => (
                      <div key={row.take} className="p-3 rounded-xl bg-white/[0.02] border border-white/8 text-xs">
                        <div className="font-semibold text-sky-300">{row.take}</div>
                        <div className="text-[11px] text-slate-400 mb-1.5">{row.time}</div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{row.camera}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/8 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Beats
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-sky-500/20"
                  >
                    <span>Next: Paste Social Proof Link</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PANEL 4: PASTE PUBLISHED SOCIAL PROOF LINK & COMPLETE */}
            {activeStep === 4 && (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                    Step 4 of 4 · Proof of Execution
                  </span>
                  <h2 className="text-xl font-semibold text-white mt-0.5">
                    Paste your published social video link to complete today’s cadence
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Videos stay on your social platforms (Instagram, TikTok, YouTube, LinkedIn, or Facebook). Paste the live link below so your Coach can verify and track your streak.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Link2 className="w-5 h-5 text-sky-400 absolute left-4 top-3.5" />
                    <input
                      id="social-proof-url"
                      type="url"
                      value={videoLinkInput}
                      onChange={e => {
                        setVideoLinkInput(e.target.value);
                        if (linkError) setLinkError(null);
                      }}
                      placeholder="https://www.instagram.com/reel/... or https://youtu.be/..."
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  {linkError && (
                    <div className="flex items-center gap-2.5 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{linkError}</span>
                    </div>
                  )}
                </div>

                {currentVideo.status === 'Completed' ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-emerald-300">
                          Day #{currentVideo.dayNumber} Video Verified & Logged!
                        </div>
                        <a
                          href={currentVideo.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-400 hover:underline flex items-center gap-1 truncate mt-0.5"
                        >
                          <span className="truncate">{currentVideo.videoUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextIdx = student.supportingVideos.findIndex(v => v.status !== 'Completed');
                        if (nextIdx >= 0) {
                          setSelectedIndex(nextIdx);
                          setActiveStep(1);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs cursor-pointer shrink-0"
                    >
                      Load Next Unfilmed Day →
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep(3)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back to Studio
                    </button>

                    <button
                      type="button"
                      onClick={handleCompleteCurrent}
                      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify Social Link & Complete Day #{currentVideo.dayNumber}</span>
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
                    setActiveStep(1);
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
                    {item.videoUrl ? (
                      <div className="text-xs text-emerald-400 truncate">✓ {item.videoUrl}</div>
                    ) : (
                      <div className="text-xs text-slate-400 truncate">“{item.hook1}”</div>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${
                      item.status === 'Completed'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : item.status === 'Missed'
                        ? 'bg-rose-500/15 text-rose-300'
                        : 'bg-white/8 text-slate-400'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: THE 5 CORE BRAND VIDEOS (B1–B5) */}
      {subTab === 'CORE5' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white">
              The 5 Core Brand Videos (B1–B5)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Made once and run continuously at $5–10/day in your sequenced ad ladder. Paste the published link once filmed.
            </p>

            <div className="space-y-4 mt-5">
              {student.coreVideos.map(core => (
                <div key={core.id} className="p-5 rounded-xl bg-white/[0.02] border border-white/8 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 text-xs font-semibold">
                          {core.code} · {core.week}
                        </span>
                        <span className="text-xs text-slate-400">Target: {core.runtimeTarget}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mt-1">{core.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{core.purpose}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="url"
                        defaultValue={core.videoUrl || ''}
                        placeholder="Paste published YouTube/Ad URL..."
                        onBlur={e => {
                          const val = e.target.value.trim();
                          if (val) {
                            onUpdateCoreVideoStatus(core.id, 'Completed', val);
                          }
                        }}
                        className="rounded-xl bg-[#0B0D14] border border-white/12 px-3 py-2 text-xs text-white w-64 focus:outline-none focus:border-sky-400"
                      />
                      <select
                        value={core.status}
                        onChange={e =>
                          onUpdateCoreVideoStatus(
                            core.id,
                            e.target.value as 'Not Started' | 'In Progress' | 'Completed',
                            core.videoUrl
                          )
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer ${
                          core.status === 'Completed'
                            ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                            : core.status === 'In Progress'
                            ? 'border-sky-500/30 bg-sky-500/15 text-sky-300'
                            : 'border-white/12 bg-[#0B0D14] text-slate-300'
                        }`}
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                    {(['S', 'H', 'I', 'F', 'T'] as const).map(letter => (
                      <div key={letter} className="p-3 rounded-lg bg-[#0B0D14]/60 border border-white/6">
                        <div className="text-xs font-bold text-sky-400">{letter} Stage</div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{core.shiftStages[letter]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONTENT PLAYBOOK MATRIX (15 PILLARS x 4 ANGLES) */}
      {subTab === 'PLAYBOOK' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Content Playbook Matrix ({student.playbook.length} Core Pillars · 60 Angles)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingested from your strategy spreadsheet. Each pillar breaks an old belief, installs a new belief, and maps out 4 teaching angles.
              </p>
            </div>

            <div className="space-y-4">
              {student.playbook.map((pillar, idx) => (
                <div key={pillar.id} className="p-5 rounded-xl bg-white/[0.02] border border-white/8 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium text-sky-400">
                        Pillar #{idx + 1} · {pillar.stage}
                      </span>
                      <h3 className="text-lg font-semibold text-white mt-0.5">{pillar.pillar}</h3>
                    </div>

                    <select
                      value={pillar.status}
                      onChange={e => onUpdatePillarStatus(pillar.id, e.target.value)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                        pillar.status === 'Completed'
                          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                          : pillar.status === 'In Progress'
                          ? 'border-sky-500/30 bg-sky-500/15 text-sky-300'
                          : 'border-white/12 bg-[#0B0D14] text-slate-300'
                      }`}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-rose-500/[0.06] border border-rose-500/15">
                      <span className="font-semibold text-rose-300 block mb-1">Breaks (Old Belief)</span>
                      <span className="text-slate-200">{pillar.breaksBelief}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                      <span className="font-semibold text-emerald-300 block mb-1">Installs (New Belief)</span>
                      <span className="text-slate-200">{pillar.installsBelief}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/8">
                      <span className="font-semibold text-slate-400 block mb-1">Must-Hit Beats</span>
                      <span className="text-slate-300">{pillar.mustHitBeats}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-lg bg-[#0B0D14] border border-white/6">
                      <div className="text-[11px] font-semibold text-sky-400">1. Actionable (How-To)</div>
                      <div className="text-xs text-slate-100 mt-1">“{pillar.angles.actionable}”</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#0B0D14] border border-white/6">
                      <div className="text-[11px] font-semibold text-sky-400">2. Analytical (Data)</div>
                      <div className="text-xs text-slate-100 mt-1">“{pillar.angles.analytical}”</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#0B0D14] border border-white/6">
                      <div className="text-[11px] font-semibold text-sky-400">3. Psychological</div>
                      <div className="text-xs text-slate-100 mt-1">“{pillar.angles.psychological}”</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#0B0D14] border border-white/6">
                      <div className="text-[11px] font-semibold text-sky-400">4. Aspirational (Story)</div>
                      <div className="text-xs text-slate-100 mt-1">“{pillar.angles.aspirational}”</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
