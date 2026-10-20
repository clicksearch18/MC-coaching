import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  FileText,
  ExternalLink,
  CheckCircle2,
  Plus,
  Trash2,
  Clock,
  Calendar,
  HelpCircle,
  ClipboardCheck,
  Edit3,
  Play,
  X
} from 'lucide-react';
import {
  StudentProfile,
  UpcomingCoachingCall,
  CoachingCallReplay,
  CoachingResourceItem,
  ResourceCategory,
  WeeklyScorecardCheckIn
} from '../types';
import { ModalDialog } from './ModalDialog';

interface VaultAndCallsViewProps {
  student: StudentProfile;
  isAdminSession: boolean;
  upcomingCall: UpcomingCoachingCall;
  replays: CoachingCallReplay[];
  resources: CoachingResourceItem[];
  requestedSubTab?: 'CALLS' | 'RESOURCES' | 'SCORECARD';
  onClearRequestedSubTab?: () => void;
  onUpdateUpcomingCall: (updated: UpcomingCoachingCall) => void;
  onSubmitHotSeatQuestion: (question: string, videoUrl?: string) => void;
  onToggleHotSeatAnswered: (questionId: string) => void;
  onAddReplay: (replay: Omit<CoachingCallReplay, 'id'>) => void;
  onDeleteReplay: (replayId: string) => void;
  onToggleWatchedReplay: (replayId: string) => void;
  onUpdateReplayProgress: (
    replayId: string,
    currentTimeSeconds: number,
    durationSeconds: number,
    explicitPercent?: number
  ) => void;
  onAddResource: (resource: Omit<CoachingResourceItem, 'id'>) => void;
  onDeleteResource: (resourceId: string) => void;
  onSubmitWeeklyCheckIn: (checkIn: Omit<WeeklyScorecardCheckIn, 'id' | 'dateISO'>) => void;
}

const parseTimestampToSeconds = (ts: string): number => {
  const parts = ts.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
};

const parseDurationLabelToSeconds = (durationLabel: string): number => {
  const match = durationLabel.match(/(\d+)/);
  return match ? parseInt(match[1], 10) * 60 : 3000;
};

const resolveReplayPlaybackSource = (
  rawUrl: string,
  startSeconds = 0
): { type: 'VIDEO' | 'IFRAME'; src: string } => {
  const url = (rawUrl || '').trim();
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) {
    return { type: 'VIDEO', src: url };
  }
  const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9_-]+)/i);
  if (loomMatch) {
    const tParam = startSeconds > 0 ? `?t=${Math.floor(startSeconds)}` : '';
    return { type: 'IFRAME', src: `https://www.loom.com/embed/${loomMatch[1]}${tParam}` };
  }
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch) {
    const startParam = startSeconds > 0 ? `&start=${Math.floor(startSeconds)}` : '';
    return {
      type: 'IFRAME',
      src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0${startParam}`
    };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch) {
    const hash = startSeconds > 0 ? `#t=${Math.floor(startSeconds)}s` : '';
    return {
      type: 'IFRAME',
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1${hash}`
    };
  }
  return { type: 'VIDEO', src: url };
};

const RESOURCE_CATEGORIES: { id: 'ALL' | ResourceCategory; label: string }[] = [
  { id: 'ALL', label: 'All Resources' },
  { id: 'TEMPLATES', label: 'Templates & SOPs' },
  { id: 'SWIPE_FILES', label: 'Swipe Files' },
  { id: 'TOOLS_GEAR', label: 'Tools & Gear' }
];

export const VaultAndCallsView: React.FC<VaultAndCallsViewProps> = ({
  student,
  isAdminSession,
  upcomingCall,
  replays,
  resources,
  requestedSubTab,
  onClearRequestedSubTab,
  onUpdateUpcomingCall,
  onSubmitHotSeatQuestion,
  onToggleHotSeatAnswered,
  onAddReplay,
  onDeleteReplay,
  onToggleWatchedReplay,
  onUpdateReplayProgress,
  onAddResource,
  onDeleteResource,
  onSubmitWeeklyCheckIn
}) => {
  const [subTab, setSubTab] = useState<'CALLS' | 'RESOURCES' | 'SCORECARD'>('CALLS');
  const [resourceFilter, setResourceFilter] = useState<'ALL' | ResourceCategory>('ALL');

  // Active inline replay player state
  const [activeReplayId, setActiveReplayId] = useState<string | null>(null);
  const [iframeSeekSeconds, setIframeSeekSeconds] = useState<number>(0);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const lastReportedTimeRef = useRef<Record<string, number>>({});

  // Hot-seat question form (max 2 inputs)
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [hotSeatText, setHotSeatText] = useState('');
  const [hotSeatVideoUrl, setHotSeatVideoUrl] = useState('');

  // Admin: Edit Upcoming Call modal (max 4 inputs)
  const [showEditCallModal, setShowEditCallModal] = useState(false);
  const [callTitleDraft, setCallTitleDraft] = useState(upcomingCall.title);
  const [callDateDraft, setCallDateDraft] = useState(upcomingCall.dateTimeLabel);
  const [callTopicDraft, setCallTopicDraft] = useState(upcomingCall.topic);
  const [callUrlDraft, setCallUrlDraft] = useState(upcomingCall.joinUrl);

  // Admin: Add Replay modal (max 4 inputs)
  const [showAddReplayModal, setShowAddReplayModal] = useState(false);
  const [replayTitle, setReplayTitle] = useState('');
  const [replayUrl, setReplayUrl] = useState('');
  const [replaySummary, setReplaySummary] = useState('');
  const [replayTimestampsRaw, setReplayTimestampsRaw] = useState('');

  // Admin: Add Resource modal (max 4 inputs)
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resCategory, setResCategory] = useState<ResourceCategory>('TEMPLATES');
  const [resUrl, setResUrl] = useState('');
  const [resSummary, setResSummary] = useState('');

  // Weekly Scorecard Check-In form (max 4 inputs)
  const completedVideosCount = student.supportingVideos.filter(v => v.status === 'Completed').length;
  const [videosPostedInput, setVideosPostedInput] = useState(
    String(Math.min(7, Math.max(1, completedVideosCount || 3)))
  );
  const [dmsStartedInput, setDmsStartedInput] = useState(
    String(student.dmConversationsWeekly || 5)
  );
  const [callsBookedInput, setCallsBookedInput] = useState('1');
  const [bottleneckInput, setBottleneckInput] = useState('');
  const [checkInSavedToast, setCheckInSavedToast] = useState(false);

  useEffect(() => {
    if (requestedSubTab) {
      setSubTab(requestedSubTab);
      onClearRequestedSubTab?.();
    }
  }, [requestedSubTab, onClearRequestedSubTab]);

  const watchedIds = new Set(student.watchedReplayIds || []);
  const checkIns = student.weeklyCheckIns || [];
  const filteredResources =
    resourceFilter === 'ALL'
      ? resources
      : resources.filter(r => r.category === resourceFilter);

  const handleSaveCallEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUpcomingCall({
      ...upcomingCall,
      title: callTitleDraft.trim() || upcomingCall.title,
      dateTimeLabel: callDateDraft.trim() || upcomingCall.dateTimeLabel,
      topic: callTopicDraft.trim() || upcomingCall.topic,
      joinUrl: callUrlDraft.trim() || upcomingCall.joinUrl
    });
    setShowEditCallModal(false);
  };

  const handleCreateReplay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replayTitle.trim() || !replayUrl.trim()) return;
    const parsedTimestamps = replayTimestampsRaw
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 5)
      .map(line => {
        const match = line.match(/^(\d{1,2}:\d{2})\s*[-—:]?\s*(.+)$/);
        if (match) {
          return { time: match[1], label: match[2] };
        }
        return { time: '00:00', label: line };
      });

    const dateLabel = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    onAddReplay({
      title: replayTitle.trim(),
      dateLabel,
      duration: '50 mins',
      videoUrl: replayUrl.trim(),
      summary: replaySummary.trim() || 'Full group coaching call recording and live breakdown.',
      timestamps: parsedTimestamps
    });

    setReplayTitle('');
    setReplayUrl('');
    setReplaySummary('');
    setReplayTimestampsRaw('');
    setShowAddReplayModal(false);
  };

  const handleCreateResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim() || !resUrl.trim()) return;
    const formatLabel =
      resCategory === 'TEMPLATES'
        ? 'Template / SOP'
        : resCategory === 'SWIPE_FILES'
        ? 'Swipe File'
        : 'Tool / Guide';

    onAddResource({
      title: resTitle.trim(),
      category: resCategory,
      format: formatLabel,
      summary: resSummary.trim() || 'Plug-and-play operator resource.',
      url: resUrl.trim()
    });

    setResTitle('');
    setResUrl('');
    setResSummary('');
    setShowAddResourceModal(false);
  };

  const handleSaveScorecard = (e: React.FormEvent) => {
    e.preventDefault();
    const weekLabel = `Week ${student.currentWeek} Check-In`;
    onSubmitWeeklyCheckIn({
      weekLabel,
      videosPosted: Math.max(0, Number(videosPostedInput) || 0),
      dmConversationsStarted: Math.max(0, Number(dmsStartedInput) || 0),
      callsOrDealsBooked: Math.max(0, Number(callsBookedInput) || 0),
      bottleneckNote: bottleneckInput.trim() || 'Staying consistent on daily video output.'
    });
    setBottleneckInput('');
    setCheckInSavedToast(true);
    setTimeout(() => setCheckInSavedToast(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Sub-Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Coaching Calls & Operator Vault
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Join live group calls, watch timestamped replays, grab templates, or log your weekly numbers.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Vault sections"
          className="inline-flex rounded-xl bg-[#07090D] border border-white/10 p-1 self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'CALLS'}
            onClick={() => setSubTab('CALLS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'CALLS'
                ? 'bg-[#09ADEF] text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Calls & Replays</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'RESOURCES'}
            onClick={() => setSubTab('RESOURCES')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'RESOURCES'
                ? 'bg-[#09ADEF] text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tools & Downloads</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'SCORECARD'}
            onClick={() => setSubTab('SCORECARD')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'SCORECARD'
                ? 'bg-[#09ADEF] text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Weekly Check-In</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: GROUP CALLS & REPLAYS */}
      {subTab === 'CALLS' && (
        <div className="space-y-6">
          {/* Next Live Coaching Call Card */}
          <section className="rounded-2xl bg-[#07090D] border border-white/10 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#09ADEF]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Next Live Call · {upcomingCall.dateTimeLabel}</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {upcomingCall.title}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-300">
                  {upcomingCall.topic}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href={upcomingCall.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-lg bg-[#09ADEF] hover:bg-[#09B3F8] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Join Live Call</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => setShowQuestionForm(prev => !prev)}
                  aria-expanded={showQuestionForm}
                  className="px-3.5 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-neutral-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#09ADEF]" />
                  <span>Ask Question</span>
                </button>

                {isAdminSession && (
                  <button
                    type="button"
                    onClick={() => {
                      setCallTitleDraft(upcomingCall.title);
                      setCallDateDraft(upcomingCall.dateTimeLabel);
                      setCallTopicDraft(upcomingCall.topic);
                      setCallUrlDraft(upcomingCall.joinUrl);
                      setShowEditCallModal(true);
                    }}
                    className="px-3 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-neutral-300 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Call</span>
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Hot-Seat Question Submission (Max 2 Inputs) */}
            {showQuestionForm && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!hotSeatText.trim()) return;
                  onSubmitHotSeatQuestion(hotSeatText.trim(), hotSeatVideoUrl.trim() || undefined);
                  setHotSeatText('');
                  setHotSeatVideoUrl('');
                  setShowQuestionForm(false);
                }}
                className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
              >
                <div className="sm:col-span-2">
                  <label
                    htmlFor="hot-seat-question-input"
                    className="block text-[11px] font-semibold text-neutral-300 mb-1"
                  >
                    What should Coach Josh review on the call?
                  </label>
                  <input
                    id="hot-seat-question-input"
                    type="text"
                    required
                    value={hotSeatText}
                    onChange={e => setHotSeatText(e.target.value)}
                    placeholder="e.g., Need feedback on my B1 Hook or DM bridge script..."
                    className="w-full rounded-lg bg-black border border-white/15 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#09ADEF]"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label
                      htmlFor="hot-seat-url-input"
                      className="block text-[11px] font-semibold text-neutral-400 mb-1"
                    >
                      Video Link (Optional)
                    </label>
                    <input
                      id="hot-seat-url-input"
                      type="url"
                      value={hotSeatVideoUrl}
                      onChange={e => setHotSeatVideoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-lg bg-black border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#09ADEF]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#09ADEF] text-white text-xs font-bold cursor-pointer shrink-0 self-end"
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}

            {/* Submitted Hot-Seat Queue */}
            {upcomingCall.hotSeatQuestions.length > 0 && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Live Call Hot-Seat Queue ({upcomingCall.hotSeatQuestions.length})
                </div>
                <ul className="space-y-1.5">
                  {upcomingCall.hotSeatQuestions.map(q => (
                    <li
                      key={q.id}
                      className="flex items-center justify-between gap-3 text-xs py-1.5 text-neutral-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-white shrink-0">{q.studentName}:</span>
                        <span className={q.answered ? 'line-through text-neutral-500 truncate' : 'truncate'}>
                          {q.question}
                        </span>
                        {q.videoUrl && (
                          <a
                            href={q.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open video submitted by ${q.studentName}`}
                            className="text-[#09ADEF] hover:underline inline-flex items-center gap-1 shrink-0 font-semibold"
                          >
                            <span>Video</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {isAdminSession ? (
                        <button
                          type="button"
                          onClick={() => onToggleHotSeatAnswered(q.id)}
                          aria-pressed={Boolean(q.answered)}
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full cursor-pointer shrink-0 ${
                            q.answered
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-white/[0.06] text-neutral-300 hover:text-white'
                          }`}
                        >
                          {q.answered ? '✓ Answered' : 'Mark Answered'}
                        </button>
                      ) : (
                        q.answered && (
                          <span className="text-[11px] font-semibold text-emerald-400 shrink-0">
                            ✓ Covered
                          </span>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Recent Call Recordings Header + Overall Replay Progress */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-sm sm:text-base font-bold text-white">
                Recent Group Call Recordings ({replays.length})
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-[11px] font-semibold text-neutral-300">
                {replays.filter(r => watchedIds.has(r.id)).length}/{replays.length} Completed
              </span>
            </div>
            {isAdminSession && (
              <button
                type="button"
                onClick={() => setShowAddReplayModal(true)}
                className="px-3.5 py-2 rounded-lg bg-[#09ADEF] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Replay</span>
              </button>
            )}
          </div>

          {/* Replay Cards (Max 1 Card Border Level, Inline Player + Progress Tracking) */}
          <div className="space-y-3">
            {replays.map(replay => {
              const isWatched = watchedIds.has(replay.id);
              const savedProg = student.replayProgress?.[replay.id];
              const progressPct = isWatched ? 100 : savedProg?.percent || 0;
              const isPlayingHere = activeReplayId === replay.id;
              const playbackSource = resolveReplayPlaybackSource(
                replay.videoUrl,
                isPlayingHere
                  ? iframeSeekSeconds || savedProg?.currentTimeSeconds || 0
                  : 0
              );

              const handleOpenAndPlay = (seekToSeconds?: number) => {
                const fallbackTotalSec = parseDurationLabelToSeconds(replay.duration);
                setActiveReplayId(replay.id);
                if (seekToSeconds !== undefined) {
                  setIframeSeekSeconds(seekToSeconds);
                } else {
                  setIframeSeekSeconds(savedProg?.currentTimeSeconds || 0);
                }

                // If opening an iframe embed or jumping to a timestamp, log initial or timestamp progress immediately
                if (seekToSeconds !== undefined) {
                  const vEl = videoRefs.current[replay.id];
                  if (vEl && playbackSource.type === 'VIDEO') {
                    vEl.currentTime = seekToSeconds;
                    vEl.play().catch(() => {});
                  } else {
                    const estPct = Math.min(
                      95,
                      Math.max(15, Math.round((seekToSeconds / fallbackTotalSec) * 100))
                    );
                    onUpdateReplayProgress(replay.id, seekToSeconds, fallbackTotalSec, estPct);
                  }
                } else if (!savedProg && !isWatched) {
                  onUpdateReplayProgress(replay.id, 0, fallbackTotalSec, 10);
                }
              };

              return (
                <article
                  key={replay.id}
                  className="rounded-2xl bg-[#07090D] border border-white/10 p-5 space-y-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                        <span>{replay.dateLabel}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {replay.duration}
                        </span>
                        {isWatched ? (
                          <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            100% Watched
                          </span>
                        ) : progressPct > 0 ? (
                          <span className="text-[#09ADEF] font-semibold">
                            {progressPct}% Watched
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        {replay.title}
                      </h3>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {replay.summary}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (isPlayingHere) {
                            setActiveReplayId(null);
                          } else {
                            handleOpenAndPlay();
                          }
                        }}
                        aria-label={`Play replay in dashboard: ${replay.title}`}
                        className="px-3.5 py-2 rounded-lg bg-[#09ADEF] hover:bg-[#09B3F8] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {isPlayingHere ? (
                          <>
                            <X className="w-3.5 h-3.5" />
                            <span>Close Player</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>
                              {progressPct > 0 && progressPct < 100
                                ? `Resume (${progressPct}%)`
                                : 'Play Replay'}
                            </span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleWatchedReplay(replay.id)}
                        aria-pressed={isWatched}
                        aria-label={`Mark replay watched: ${replay.title}`}
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                          isWatched
                            ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                            : 'bg-white/[0.03] border-white/10 text-neutral-300 hover:text-white'
                        }`}
                      >
                        {isWatched ? '✓ Watched' : 'Mark Watched'}
                      </button>

                      {isAdminSession && (
                        <button
                          type="button"
                          onClick={() => onDeleteReplay(replay.id)}
                          aria-label={`Delete replay: ${replay.title}`}
                          className="p-2 rounded-lg bg-white/[0.03] hover:bg-rose-500/15 border border-white/10 text-neutral-400 hover:text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Watch Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-white/[0.07] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isWatched ? 'bg-emerald-400' : 'bg-[#09ADEF]'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* In-Dashboard Video Player (HTML5 Video or Embedded Loom/YouTube/Vimeo) */}
                  {isPlayingHere && (
                    <div className="pt-1 space-y-2">
                      <div className="rounded-xl overflow-hidden bg-black aspect-video w-full">
                        {playbackSource.type === 'VIDEO' ? (
                          <video
                            ref={el => {
                              videoRefs.current[replay.id] = el;
                            }}
                            src={playbackSource.src}
                            controls
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain bg-black"
                            onLoadedMetadata={e => {
                              const vid = e.currentTarget;
                              const targetStart =
                                iframeSeekSeconds || savedProg?.currentTimeSeconds || 0;
                              if (
                                targetStart > 0 &&
                                vid.duration > targetStart + 1 &&
                                Math.abs(vid.currentTime - targetStart) > 2
                              ) {
                                vid.currentTime = targetStart;
                              }
                            }}
                            onTimeUpdate={e => {
                              const vid = e.currentTarget;
                              if (!vid.duration || isNaN(vid.duration)) return;
                              const nowSec = Math.floor(vid.currentTime);
                              const prevSec = lastReportedTimeRef.current[replay.id] ?? -10;
                              if (Math.abs(nowSec - prevSec) >= 2) {
                                lastReportedTimeRef.current[replay.id] = nowSec;
                                onUpdateReplayProgress(replay.id, vid.currentTime, vid.duration);
                              }
                            }}
                            onEnded={e => {
                              const vid = e.currentTarget;
                              onUpdateReplayProgress(
                                replay.id,
                                vid.duration || 0,
                                vid.duration || 0,
                                100
                              );
                            }}
                          />
                        ) : (
                          <iframe
                            src={playbackSource.src}
                            title={replay.title}
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span>
                          Playing in dashboard · Progress saves automatically ({progressPct}%)
                        </span>
                        <a
                          href={replay.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neutral-400 hover:text-white inline-flex items-center gap-1"
                        >
                          <span>Open original link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Interactive Timestamp Chapters (Seek Directly Inside Dashboard Player) */}
                  {replay.timestamps.length > 0 && (
                    <div className="pt-2.5 border-t border-white/10 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                      {replay.timestamps.map((ts, idx) => {
                        const sec = parseTimestampToSeconds(ts.time);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleOpenAndPlay(sec)}
                            className="inline-flex items-center gap-1.5 text-neutral-300 hover:text-white transition-colors cursor-pointer text-left"
                          >
                            <span className="font-mono text-[#09ADEF] font-semibold">
                              {ts.time}
                            </span>
                            <span>{ts.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TOOLS, TEMPLATES & SWIPE FILES */}
      {subTab === 'RESOURCES' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {RESOURCE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setResourceFilter(cat.id)}
                  aria-pressed={resourceFilter === cat.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    resourceFilter === cat.id
                      ? 'bg-[#09ADEF] text-white'
                      : 'bg-[#07090D] border border-white/10 text-neutral-300 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {isAdminSession && (
              <button
                type="button"
                onClick={() => setShowAddResourceModal(true)}
                className="px-3.5 py-2 rounded-lg bg-[#09ADEF] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Resource</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredResources.map(res => (
              <article
                key={res.id}
                className="rounded-2xl bg-[#07090D] border border-white/10 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#09ADEF]">
                      {res.format}
                    </span>
                    {isAdminSession && (
                      <button
                        type="button"
                        onClick={() => onDeleteResource(res.id)}
                        aria-label={`Delete resource: ${res.title}`}
                        className="text-neutral-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {res.title}
                  </h3>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {res.summary}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open resource: ${res.title}`}
                    className="px-3.5 py-2 rounded-lg bg-[#09ADEF] hover:bg-[#09B3F8] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Open Resource</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: WEEKLY OPERATOR CHECK-IN (60-SECOND SCORECARD) */}
      {subTab === 'SCORECARD' && (
        <div className="space-y-6">
          <section className="rounded-2xl bg-[#07090D] border border-white/10 p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Weekly Operator Scorecard Check-In
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Log your weekly numbers in 60 seconds so Coach Josh can spot your exact bottleneck before Thursday’s call.
              </p>
            </div>

            <form onSubmit={handleSaveScorecard} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label
                    htmlFor="scorecard-videos-input"
                    className="block text-xs font-semibold text-neutral-300 mb-1"
                  >
                    1. Videos Posted This Week
                  </label>
                  <input
                    id="scorecard-videos-input"
                    type="number"
                    min={0}
                    max={30}
                    required
                    value={videosPostedInput}
                    onChange={e => setVideosPostedInput(e.target.value)}
                    className="w-full rounded-lg bg-black border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#09ADEF]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="scorecard-dms-input"
                    className="block text-xs font-semibold text-neutral-300 mb-1"
                  >
                    2. New DM Conversations
                  </label>
                  <input
                    id="scorecard-dms-input"
                    type="number"
                    min={0}
                    max={500}
                    required
                    value={dmsStartedInput}
                    onChange={e => setDmsStartedInput(e.target.value)}
                    className="w-full rounded-lg bg-black border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#09ADEF]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="scorecard-calls-input"
                    className="block text-xs font-semibold text-neutral-300 mb-1"
                  >
                    3. Offer Docs Sent / Deals Closed
                  </label>
                  <input
                    id="scorecard-calls-input"
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={callsBookedInput}
                    onChange={e => setCallsBookedInput(e.target.value)}
                    className="w-full rounded-lg bg-black border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#09ADEF]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="scorecard-bottleneck-input"
                  className="block text-xs font-semibold text-neutral-300 mb-1"
                >
                  4. Biggest Bottleneck or Win This Week
                </label>
                <input
                  id="scorecard-bottleneck-input"
                  type="text"
                  required
                  value={bottleneckInput}
                  onChange={e => setBottleneckInput(e.target.value)}
                  placeholder="e.g., Getting keyword comments on IG, need help bridging to the 2-Page Offer Doc..."
                  className="w-full rounded-lg bg-black border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#09ADEF]"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {checkInSavedToast ? (
                  <span className="text-xs font-semibold text-emerald-400">
                    ✓ Weekly Check-In saved and sent to Coach Josh!
                  </span>
                ) : (
                  <span className="text-xs text-neutral-400">
                    Updates your weekly DM & cadence telemetry automatically.
                  </span>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#09ADEF] hover:bg-[#09B3F8] text-white text-xs font-bold cursor-pointer"
                >
                  Save Check-In
                </button>
              </div>
            </form>
          </section>

          {/* Past Check-Ins History */}
          {checkIns.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                Submitted Weekly Check-Ins ({checkIns.length})
              </h3>
              <div className="space-y-2.5">
                {checkIns.map(ci => (
                  <div
                    key={ci.id}
                    className="rounded-2xl bg-[#07090D] border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-white">
                        {ci.weekLabel} <span className="text-neutral-400 font-normal">· {ci.dateISO}</span>
                      </div>
                      <p className="text-neutral-300">{ci.bottleneckNote}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-neutral-300">
                      <span>
                        <strong className="text-white">{ci.videosPosted}</strong> Videos
                      </span>
                      <span>
                        <strong className="text-white">{ci.dmConversationsStarted}</strong> DMs
                      </span>
                      <span>
                        <strong className="text-emerald-400">{ci.callsOrDealsBooked}</strong> Offer Docs / Wins
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMIN MODAL 1: EDIT UPCOMING LIVE CALL (MAX 4 INPUTS) */}
      <ModalDialog
        isOpen={showEditCallModal}
        onClose={() => setShowEditCallModal(false)}
        title="Edit Next Live Coaching Call"
        subtitle="Update call schedule & meeting link"
      >
        <form onSubmit={handleSaveCallEdit} className="space-y-3.5 text-xs">
          <div>
            <label htmlFor="edit-call-title" className="block font-semibold text-neutral-300 mb-1">
              Call Title
            </label>
            <input
              id="edit-call-title"
              type="text"
              required
              value={callTitleDraft}
              onChange={e => setCallTitleDraft(e.target.value)}
              className="w-full rounded-lg bg-[#05070A] border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-[#09ADEF]"
            />
          </div>
          <div>
            <label htmlFor="edit-call-date" className="block font-semibold text-neutral-300 mb-1">
              Date & Time
            </label>
            <input
              id="edit-call-date"
              type="text"
              required
              value={callDateDraft}
              onChange={e => setCallDateDraft(e.target.value)}
              placeholder="e.g., Thursdays · 2:00 PM EST"
              className="w-full rounded-lg bg-[#05070A] border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-[#09ADEF]"
            />
          </div>
          <div>
            <label htmlFor="edit-call-topic" className="block font-semibold text-neutral-300 mb-1">
              Focus Topic
            </label>
            <input
              id="edit-call-topic"
              type="text"
              required
              value={callTopicDraft}
              onChange={e => setCallTopicDraft(e.target.value)}
              className="w-full rounded-lg bg-[#05070A] border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-[#09ADEF]"
            />
          </div>
          <div>
            <label htmlFor="edit-call-url" className="block font-semibold text-neutral-300 mb-1">
              Meeting Link (Zoom / Meet)
            </label>
            <input
              id="edit-call-url"
              type="url"
              required
              value={callUrlDraft}
              onChange={e => setCallUrlDraft(e.target.value)}
              className="w-full rounded-lg bg-[#05070A] border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-[#09ADEF]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowEditCallModal(false)}
              className="px-4 py-2 rounded-lg bg-white/[0.05] text-neutral-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#09ADEF] text-white font-bold cursor-pointer"
            >
              Save Call
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* ADMIN MODAL 2: ADD CALL REPLAY (MAX 4 INPUTS) */}
      <ModalDialog
        isOpen={showAddReplayModal}
        onClose={() => setShowAddReplayModal(false)}
        title="Add Coaching Call Recording"
        subtitle="Publish replay & key timestamps for the cohort"
      >
        <form onSubmit={handleCreateReplay} className="space-y-3.5 text-xs">
          <div>
            <label htmlFor="add-replay-title" className="block font-semibold text-neutral-300 mb-1">
              Call Title
            </label>
            <input
              id="add-replay-title"
              type="text"
              required
              value={replayTitle}
              onChange={e => setReplayTitle(e.target.value)}
              placeholder="e.g., Hot-Seat Review: B2 Product Demonstration Scripts"
              className="w-full rounded-lg bg-[#05070A] border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-[#09ADEF]"
            />
          </div>
          <div>
            <label htmlFor="add-replay-url" className="block font-semibold text-neutral-300 mb-1">
              Recording URL (Loom / Vimeo / YouTube)
            </label>
            <input
              id="add-replay-url"
              type="url"
              required
              value={replayUrl}
              onChange={e => setReplayUrl(e.target.value)}
              placeholder="https://www.loom.com/share/..."
              className="w-full rounded-lg bg-[#05070A] border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-[#09ADEF]"
            />
          </div>
          <div>
            <label htmlFor="add-replay-summary" className="block font-semibold text-neutral-300 mb-1">
              1-Sentence Takeaway
            </label>
            <input
              id="add-replay-summary"
              type="text"
              required
              value={replaySummary}
              onChange={e => setReplaySummary(e.target.value)}
              placeholder="What students will learn from this session..."
              className="w-full rounded-lg bg-[#05070A] border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-[#09ADEF]"
            />
          </div>
          <div>
            <label htmlFor="add-replay-timestamps" className="block font-semibold text-neutral-300 mb-1">
              Key Timestamps (One per line, e.g. 08:15 - Fixing B1 Hooks)
            </label>
            <textarea
              id="add-replay-timestamps"
              rows={3}
              value={replayTimestampsRaw}
              onChange={e => setReplayTimestampsRaw(e.target.value)}
              placeholder={'05:20 - Tightening first 3 seconds\n19:40 - $5/day ad audience setup'}
              className="w-full rounded-lg bg-[#05070A] border border-white/15 px-3.5 py-2 text-white focus:outline-none focus:border-[#09ADEF]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddReplayModal(false)}
              className="px-4 py-2 rounded-lg bg-white/[0.05] text-neutral-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#09ADEF] text-white font-bold cursor-pointer"
            >
              Publish Replay
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* ADMIN MODAL 3: ADD RESOURCE / SWIPE FILE (MAX 4 INPUTS) */}
      <ModalDialog
        isOpen={showAddResourceModal}
        onClose={() => setShowAddResourceModal(false)}
        title="Add Tool, Template, or Swipe File"
        subtitle="Add a resource to the student library"
      >
        <form onSubmit={handleCreateResource} className="space-y-3.5 text-xs">
          <div>
            <label htmlFor="add-res-title" className="block font-semibold text-neutral-300 mb-1">
              Resource Title
            </label>
            <input
              id="add-res-title"
              type="text"
              required
              value={resTitle}
              onChange={e => setResTitle(e.target.value)}
              placeholder="e.g., The 2-Page Super Signature Offer Doc Template"
              className="w-full rounded-lg bg-[#05070A] border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-[#09ADEF]"
            />
          </div>
          <div>
            <label htmlFor="add-res-category" className="block font-semibold text-neutral-300 mb-1">
              Category
            </label>
            <select
              id="add-res-category"
              value={resCategory}
              onChange={e => setResCategory(e.target.value as ResourceCategory)}
              className="w-full rounded-lg bg-[#05070A] border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-[#09ADEF]"
            >
              <option value="TEMPLATES">Templates & SOPs</option>
              <option value="SWIPE_FILES">Swipe Files</option>
              <option value="TOOLS_GEAR">Tools & Gear</option>
            </select>
          </div>
          <div>
            <label htmlFor="add-res-url" className="block font-semibold text-neutral-300 mb-1">
              Resource Link (Google Doc / PDF / Notion / URL)
            </label>
            <input
              id="add-res-url"
              type="url"
              required
              value={resUrl}
              onChange={e => setResUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg bg-[#05070A] border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-[#09ADEF]"
            />
          </div>
          <div>
            <label htmlFor="add-res-summary" className="block font-semibold text-neutral-300 mb-1">
              1-Sentence Outcome
            </label>
            <input
              id="add-res-summary"
              type="text"
              required
              value={resSummary}
              onChange={e => setResSummary(e.target.value)}
              placeholder="How this helps the operator execute faster..."
              className="w-full rounded-lg bg-[#05070A] border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-[#09ADEF]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddResourceModal(false)}
              className="px-4 py-2 rounded-lg bg-white/[0.05] text-neutral-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#09ADEF] text-white font-bold cursor-pointer"
            >
              Add Resource
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
