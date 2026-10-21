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
  X,
  MessageSquare,
  Send
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
  onAskReplayQuestion?: (params: {
    replayId: string;
    replayTitle: string;
    videoUrl: string;
    timestampSeconds: number;
    timestampLabel: string;
    question: string;
  }) => string;
  onOpenGroupThread?: (postId?: string) => void;
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

const formatSecondsToTimestamp = (rawSeconds: number): string => {
  const total = Math.max(0, Math.floor(rawSeconds || 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const parseDurationLabelToSeconds = (durationLabel: string): number => {
  const match = durationLabel.match(/(\d+)/);
  return match ? parseInt(match[1], 10) * 60 : 3000;
};

const resolveVimeoEmbedUrl = (rawUrl: string, startSeconds = 0): string => {
  const url = (rawUrl || '').trim();
  // Match standard Vimeo, unlisted Vimeo (vimeo.com/12345/abcdef), or player.vimeo.com/video/12345?h=abcdef
  const unlistedMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)\/([a-zA-Z0-9]+)/i);
  const queryHashMatch = url.match(/[?&]h=([a-zA-Z0-9]+)/i);
  const idMatch = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/i);

  if (idMatch) {
    const videoId = idMatch[1];
    const hashToken = unlistedMatch?.[2] || queryHashMatch?.[1];
    const params = new URLSearchParams();
    if (hashToken) params.set('h', hashToken);
    params.set('autoplay', '1');
    params.set('api', '1');
    params.set('dnt', '1');
    const timeFrag = startSeconds > 0 ? `#t=${Math.floor(startSeconds)}s` : '';
    return `https://player.vimeo.com/video/${videoId}?${params.toString()}${timeFrag}`;
  }

  return url;
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
  onAskReplayQuestion,
  onOpenGroupThread,
  onAddResource,
  onDeleteResource,
  onSubmitWeeklyCheckIn
}) => {
  const [subTab, setSubTab] = useState<'CALLS' | 'RESOURCES' | 'SCORECARD'>('CALLS');
  const [resourceFilter, setResourceFilter] = useState<'ALL' | ResourceCategory>('ALL');

  // Active inline Vimeo replay player state
  const [activeReplayId, setActiveReplayId] = useState<string | null>(null);
  // Stable initial start time used ONLY for constructing the iframe src when opening a player
  const [playerMountStartSeconds, setPlayerMountStartSeconds] = useState<number>(0);
  // Target seek time sent via postMessage on ready or chapter click without reloading the iframe
  const pendingSeekSecondsRef = useRef<number>(0);
  const [livePlaybackSeconds, setLivePlaybackSeconds] = useState<Record<string, number>>({});
  const [liveDurationSeconds, setLiveDurationSeconds] = useState<Record<string, number>>({});
  const vimeoIframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
  const lastReportedTimeRef = useRef<Record<string, number>>({});

  // Inline "Ask a Question on Video" state (captures video & timestamp -> posts to Group & notifies Coach)
  const [askingReplayId, setAskingReplayId] = useState<string | null>(null);
  const [questionTimestampDraft, setQuestionTimestampDraft] = useState<string>('00:00');
  const [questionTextDraft, setQuestionTextDraft] = useState<string>('');
  const [postedQuestionConfirmation, setPostedQuestionConfirmation] = useState<{
    replayId: string;
    postId: string;
    timestampLabel: string;
  } | null>(null);

  // Listen to Vimeo Player postMessage events for live playback progress & completion tracking
  useEffect(() => {
    if (!activeReplayId) return;

    const handleVimeoMessage = (event: MessageEvent) => {
      if (!event.origin.includes('vimeo.com')) return;
      let data: {
        event?: string;
        method?: string;
        value?: number;
        data?: { seconds?: number; duration?: number; percent?: number };
      } = {};
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      const activeIframe = vimeoIframeRefs.current[activeReplayId];
      if (data.event === 'ready' && activeIframe?.contentWindow) {
        ['playProgress', 'timeupdate', 'pause', 'seeked', 'seek', 'ended'].forEach(evtName => {
          activeIframe.contentWindow?.postMessage(
            JSON.stringify({ method: 'addEventListener', value: evtName }),
            '*'
          );
        });
        if (pendingSeekSecondsRef.current > 0) {
          activeIframe.contentWindow.postMessage(
            JSON.stringify({ method: 'seekTo', value: pendingSeekSecondsRef.current }),
            '*'
          );
        }
        return;
      }

      const isTimeEvent =
        data.event === 'playProgress' ||
        data.event === 'timeupdate' ||
        data.event === 'pause' ||
        data.event === 'seeked' ||
        data.event === 'seek';

      if (
        isTimeEvent &&
        data.data &&
        typeof data.data.seconds === 'number' &&
        typeof data.data.duration === 'number' &&
        data.data.duration > 0
      ) {
        const nowSec = Math.floor(data.data.seconds);
        const totalDur = Math.floor(data.data.duration);

        setLivePlaybackSeconds(prev =>
          prev[activeReplayId] === nowSec ? prev : { ...prev, [activeReplayId]: nowSec }
        );
        setLiveDurationSeconds(prev =>
          prev[activeReplayId] === totalDur ? prev : { ...prev, [activeReplayId]: totalDur }
        );

        const isImmediateEvent =
          data.event === 'pause' || data.event === 'seeked' || data.event === 'seek';
        const prevSec = lastReportedTimeRef.current[activeReplayId] ?? -10;

        if (isImmediateEvent || Math.abs(nowSec - prevSec) >= 1) {
          lastReportedTimeRef.current[activeReplayId] = nowSec;
          const pct =
            typeof data.data.percent === 'number'
              ? Math.round(data.data.percent * 100)
              : Math.round((data.data.seconds / data.data.duration) * 100);
          onUpdateReplayProgress(activeReplayId, nowSec, totalDur, pct);
        }
      } else if (data.event === 'ended') {
        const dur = Math.floor(data.data?.duration || liveDurationSeconds[activeReplayId] || 0);
        onUpdateReplayProgress(activeReplayId, dur, dur, 100);
      }
    };

    window.addEventListener('message', handleVimeoMessage);
    return () => window.removeEventListener('message', handleVimeoMessage);
  }, [activeReplayId, liveDurationSeconds, onUpdateReplayProgress]);

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

  const nextQueueQuestion =
    upcomingCall.hotSeatQuestions.find(q => !q.answered) || upcomingCall.hotSeatQuestions[0];

  return (
    <div className="space-y-5">
      {/* Section Title & Intro */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Coaching Calls &amp; Operator Vault
        </h1>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Join live group sessions, watch timestamped replays, access templates, or submit weekly sprint numbers.
        </p>
      </div>

      {/* Segmented Navigation Pill Tabs */}
      <nav
        role="tablist"
        aria-label="Vault Sections"
        className="p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-1 shadow-inner"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'CALLS'}
          onClick={() => setSubTab('CALLS')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs transition-all cursor-pointer ${
            subTab === 'CALLS'
              ? 'bg-gradient-to-r from-brand-600 to-sky-500 text-white font-semibold shadow-md'
              : 'text-slate-400 hover:text-slate-200 font-medium hover:bg-white/[0.03]'
          }`}
        >
          <Video className={`w-3.5 h-3.5 shrink-0 ${subTab === 'CALLS' ? 'text-white' : 'text-slate-400'}`} />
          <span className="truncate">Calls &amp; Replays</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'RESOURCES'}
          onClick={() => setSubTab('RESOURCES')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs transition-all cursor-pointer ${
            subTab === 'RESOURCES'
              ? 'bg-gradient-to-r from-brand-600 to-sky-500 text-white font-semibold shadow-md'
              : 'text-slate-400 hover:text-slate-200 font-medium hover:bg-white/[0.03]'
          }`}
        >
          <FileText className={`w-3.5 h-3.5 shrink-0 ${subTab === 'RESOURCES' ? 'text-white' : 'text-slate-400'}`} />
          <span className="truncate">Tools &amp; Docs</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'SCORECARD'}
          onClick={() => setSubTab('SCORECARD')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs transition-all cursor-pointer ${
            subTab === 'SCORECARD'
              ? 'bg-gradient-to-r from-brand-600 to-sky-500 text-white font-semibold shadow-md'
              : 'text-slate-400 hover:text-slate-200 font-medium hover:bg-white/[0.03]'
          }`}
        >
          <ClipboardCheck className={`w-3.5 h-3.5 shrink-0 ${subTab === 'SCORECARD' ? 'text-white' : 'text-slate-400'}`} />
          <span className="truncate">Weekly Log</span>
        </button>
      </nav>

      {/* SUB-TAB 1: GROUP CALLS & REPLAYS */}
      {subTab === 'CALLS' && (
        <div className="space-y-5">
          {/* Hero Next Live Coaching Call Card */}
          <section
            data-purpose="next-live-call-card"
            className="relative rounded-2xl bg-[#0F1626]/90 border border-brand-500/30 p-4 sm:p-5 glow-cyan overflow-hidden"
          >
            {/* Subtle background glow orb */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Pill Schedule Tag */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/15 border border-brand-400/25 text-brand-300 text-[11px] font-semibold uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-400" />
                </span>
                <span>Next Live Call · {upcomingCall.dateTimeLabel}</span>
              </div>
              <span className="text-[11px] font-medium text-slate-400 shrink-0">Live Weekly</span>
            </div>

            {/* Call Title & Description */}
            <div className="space-y-1.5 mb-4">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                {upcomingCall.title}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {upcomingCall.topic}
              </p>
            </div>

            {/* Action Row */}
            <div className="flex items-center gap-2 mb-3">
              <a
                href={upcomingCall.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-brand-600 hover:from-sky-300 hover:to-brand-500 active:scale-[0.98] text-white font-semibold text-xs tracking-wide shadow-lg shadow-sky-500/25 transition-all"
              >
                <span>Join Live Call</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setShowQuestionForm(prev => !prev)}
                aria-expanded={showQuestionForm}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 active:scale-[0.98] text-slate-200 font-medium text-xs transition-all cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-brand-400" />
                <span>Ask Q</span>
              </button>

              {isAdminSession && (
                <button
                  type="button"
                  aria-label="Edit Call Schedule"
                  onClick={() => {
                    setCallTitleDraft(upcomingCall.title);
                    setCallDateDraft(upcomingCall.dateTimeLabel);
                    setCallTopicDraft(upcomingCall.topic);
                    setCallUrlDraft(upcomingCall.joinUrl);
                    setShowEditCallModal(true);
                  }}
                  className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
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
                className="mb-3 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
              >
                <div className="sm:col-span-2">
                  <label
                    htmlFor="hot-seat-question-input"
                    className="block text-[11px] font-semibold text-slate-300 mb-1"
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
                    className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-400"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label
                      htmlFor="hot-seat-url-input"
                      className="block text-[11px] font-semibold text-slate-400 mb-1"
                    >
                      Video Link (Optional)
                    </label>
                    <input
                      id="hot-seat-url-input"
                      type="url"
                      value={hotSeatVideoUrl}
                      onChange={e => setHotSeatVideoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl btn-2mm text-xs cursor-pointer shrink-0 self-end"
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}

            {/* Hot-Seat Queue Sub-Card */}
            {nextQueueQuestion && (
              <div className="rounded-xl bg-black/40 border border-white/[0.07] p-2.5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {upcomingCall.hotSeatQuestions.filter(q => !q.answered).length || 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Next Up In Queue ({upcomingCall.hotSeatQuestions.length})
                    </div>
                    <p className="text-xs text-white truncate font-medium">
                      {nextQueueQuestion.studentName}:{' '}
                      <span
                        className={
                          nextQueueQuestion.answered
                            ? 'line-through text-slate-500 font-normal'
                            : 'text-slate-300 font-normal'
                        }
                      >
                        "{nextQueueQuestion.question}"
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {nextQueueQuestion.videoUrl && (
                    <a
                      href={nextQueueQuestion.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open video submitted by ${nextQueueQuestion.studentName}`}
                      className="px-2 py-1 rounded-lg bg-brand-500/15 text-brand-400 hover:text-brand-300 text-[11px] font-semibold inline-flex items-center gap-1"
                    >
                      <span>Video</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {isAdminSession ? (
                    <button
                      type="button"
                      onClick={() => onToggleHotSeatAnswered(nextQueueQuestion.id)}
                      aria-pressed={Boolean(nextQueueQuestion.answered)}
                      className={`shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-lg border active:scale-95 transition-all cursor-pointer ${
                        nextQueueQuestion.answered
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'text-slate-200 bg-white/10 hover:bg-white/15 border-white/10'
                      }`}
                    >
                      {nextQueueQuestion.answered ? '✓ Done' : 'Mark Done'}
                    </button>
                  ) : (
                    nextQueueQuestion.answered && (
                      <span className="text-[11px] font-semibold text-emerald-400 shrink-0">
                        ✓ Covered
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Recent Call Recordings Section */}
          <section className="space-y-3 pt-1" data-purpose="replay-recordings-list">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-white">
                  Recent Group Call Recordings
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.08] text-slate-300 border border-white/5">
                  {replays.filter(r => watchedIds.has(r.id)).length}/{replays.length} Completed
                </span>
              </div>
              {isAdminSession && (
                <button
                  type="button"
                  onClick={() => setShowAddReplayModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-400 hover:text-brand-300 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Replay</span>
                </button>
              )}
            </div>

            {/* Recording Cards List */}
            <div className="space-y-2.5">
              {replays.map((replay, rIdx) => {
                const isWatched = watchedIds.has(replay.id);
                const savedProg = student.replayProgress?.[replay.id];
                const progressPct = isWatched ? 100 : savedProg?.percent || 0;
                const isPlayingHere = activeReplayId === replay.id;
                const currentSecForReplay =
                  livePlaybackSeconds[replay.id] ?? savedProg?.currentTimeSeconds ?? 0;
                const totalDurForReplay =
                  liveDurationSeconds[replay.id] || savedProg?.durationSeconds || 0;
                const currentTimestampLabel = formatSecondsToTimestamp(currentSecForReplay);
                const totalDurationTimestampLabel =
                  totalDurForReplay > 0 ? formatSecondsToTimestamp(totalDurForReplay) : null;
                const isAskingHere = askingReplayId === replay.id;

                const vimeoEmbedSrc = resolveVimeoEmbedUrl(
                  replay.videoUrl,
                  isPlayingHere ? playerMountStartSeconds : 0
                );

                const thumbGradients = [
                  'from-slate-800 to-slate-900',
                  'from-slate-800 to-indigo-950',
                  'from-slate-900 to-sky-950'
                ];
                const thumbGrad = thumbGradients[rIdx % thumbGradients.length];
                const tagLabel =
                  replay.title.toLowerCase().includes('dm') || replay.title.toLowerCase().includes('magnet')
                    ? 'DM CRM'
                    : replay.title.toLowerCase().includes('hook') || replay.title.toLowerCase().includes('script')
                    ? 'Scripting'
                    : 'Coaching';

                const handleOpenAskQuestion = () => {
                  if (isAskingHere) {
                    setAskingReplayId(null);
                    return;
                  }
                  const activeIframe = vimeoIframeRefs.current[replay.id];
                  if (isPlayingHere && activeIframe?.contentWindow) {
                    activeIframe.contentWindow.postMessage(
                      JSON.stringify({ method: 'pause' }),
                      '*'
                    );
                  }
                  setAskingReplayId(replay.id);
                  setQuestionTimestampDraft(formatSecondsToTimestamp(currentSecForReplay));
                  setQuestionTextDraft('');
                };

                const handleOpenAndPlay = (seekToSeconds?: number) => {
                  const fallbackTotalSec =
                    totalDurForReplay > 0
                      ? totalDurForReplay
                      : parseDurationLabelToSeconds(replay.duration);
                  const targetSec =
                    seekToSeconds !== undefined
                      ? seekToSeconds
                      : savedProg?.currentTimeSeconds || 0;

                  pendingSeekSecondsRef.current = targetSec;
                  setLivePlaybackSeconds(prev => ({ ...prev, [replay.id]: targetSec }));
                  if (askingReplayId === replay.id && seekToSeconds !== undefined) {
                    setQuestionTimestampDraft(formatSecondsToTimestamp(seekToSeconds));
                  }

                  const activeIframe = vimeoIframeRefs.current[replay.id];
                  if (isPlayingHere && activeIframe?.contentWindow) {
                    if (seekToSeconds !== undefined) {
                      activeIframe.contentWindow.postMessage(
                        JSON.stringify({ method: 'seekTo', value: seekToSeconds }),
                        '*'
                      );
                    }
                    activeIframe.contentWindow.postMessage(
                      JSON.stringify({ method: 'play' }),
                      '*'
                    );
                  } else {
                    setPlayerMountStartSeconds(targetSec);
                    setActiveReplayId(replay.id);
                  }

                  if (seekToSeconds !== undefined) {
                    const estPct = Math.min(
                      95,
                      Math.max(1, Math.round((seekToSeconds / fallbackTotalSec) * 100))
                    );
                    onUpdateReplayProgress(replay.id, seekToSeconds, fallbackTotalSec, estPct);
                  }
                };

                return (
                  <article
                    key={replay.id}
                    className="p-3 sm:p-4 rounded-2xl bg-surface-card border border-white/[0.06] hover:border-brand-500/30 transition-all space-y-3 group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div
                        onClick={() => {
                          if (isPlayingHere) {
                            setActiveReplayId(null);
                          } else {
                            handleOpenAndPlay();
                          }
                        }}
                        className="flex gap-3 flex-1 min-w-0 cursor-pointer active:scale-[0.99] transition-transform"
                      >
                        {/* Thumbnail & Duration */}
                        <div className="relative w-28 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-800 border border-white/10">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                          <div className={`w-full h-full bg-gradient-to-br ${thumbGrad} flex items-center justify-center`}>
                            <span className="w-8 h-8 rounded-full bg-brand-500/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              {isPlayingHere ? (
                                <X className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4 translate-x-0.5 fill-current" />
                              )}
                            </span>
                          </div>
                          <span className="absolute bottom-1 right-1 z-20 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/80 text-white tracking-wide">
                            {totalDurationTimestampLabel || replay.duration}
                          </span>
                        </div>

                        {/* Card Meta */}
                        <div className="flex flex-col justify-between flex-1 min-w-0">
                          <div>
                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-brand-400 mb-0.5">
                              <span>{replay.dateLabel}</span>
                              <span>•</span>
                              <span>Session #{replays.length - rIdx + 39}</span>
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-white leading-tight line-clamp-1 group-hover:text-brand-300 transition-colors">
                              {replay.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {replay.summary}
                            </p>
                          </div>

                          {/* Tags and Progress */}
                          <div className="flex items-center justify-between pt-1.5 gap-2">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-300 font-medium border border-white/5">
                              {tagLabel}
                            </span>
                            {isWatched ? (
                              <span className="text-[10px] text-emerald-400 font-semibold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Watched</span>
                              </span>
                            ) : currentSecForReplay > 0 || progressPct > 0 ? (
                              <span className="text-[10px] text-brand-400 font-semibold">
                                {progressPct}% Watched ({currentTimestampLabel})
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">Unwatched</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/[0.05]">
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
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-brand-600 hover:from-sky-300 hover:to-brand-500 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          {isPlayingHere ? (
                            <>
                              <X className="w-3 h-3" />
                              <span>Close</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              <span>
                                {currentSecForReplay > 0 && !isWatched
                                  ? `Resume ${currentTimestampLabel}`
                                  : 'Watch'}
                              </span>
                            </>
                          )}
                        </button>

                        {onAskReplayQuestion && (
                          <button
                            type="button"
                            onClick={handleOpenAskQuestion}
                            aria-expanded={isAskingHere}
                            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-medium inline-flex items-center gap-1 active:scale-95 transition-all cursor-pointer ${
                              isAskingHere
                                ? 'bg-brand-500/15 border-brand-400/40 text-white'
                                : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white'
                            }`}
                          >
                            <MessageSquare className="w-3 h-3 text-brand-400" />
                            <span>
                              {isPlayingHere || currentSecForReplay > 0
                                ? `Ask @ ${currentTimestampLabel}`
                                : 'Ask Q'}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onToggleWatchedReplay(replay.id)}
                          aria-pressed={isWatched}
                          aria-label={`Mark replay watched: ${replay.title}`}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-medium active:scale-95 transition-all cursor-pointer ${
                            isWatched
                              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                              : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          {isWatched ? '✓ Watched' : 'Mark Done'}
                        </button>

                        {isAdminSession && (
                          <button
                            type="button"
                            onClick={() => onDeleteReplay(replay.id)}
                            aria-label={`Delete replay: ${replay.title}`}
                            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/10 text-slate-400 hover:text-rose-300 active:scale-95 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Watch Progress Bar */}
                    {(progressPct > 0 || isWatched) && (
                      <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isWatched ? 'bg-emerald-400' : 'bg-brand-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    )}

                    {/* In-Dashboard Vimeo Player */}
                    {isPlayingHere && (
                      <div className="pt-1 space-y-2">
                        <div className="rounded-xl overflow-hidden bg-black aspect-video w-full border border-white/10">
                          <iframe
                            ref={el => {
                              vimeoIframeRefs.current[replay.id] = el;
                            }}
                            src={vimeoEmbedSrc}
                            title={replay.title}
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span>
                            Playing in dashboard · Current position{' '}
                            <strong className="font-mono text-white">
                              {currentTimestampLabel}
                              {totalDurationTimestampLabel
                                ? ` / ${totalDurationTimestampLabel}`
                                : ''}
                            </strong>{' '}
                            ({progressPct}% watched)
                          </span>
                          <div className="flex items-center gap-3">
                            {onAskReplayQuestion && !isAskingHere && (
                              <button
                                type="button"
                                onClick={handleOpenAskQuestion}
                                className="text-brand-400 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Ask Question at {currentTimestampLabel}</span>
                              </button>
                            )}
                            <a
                              href={replay.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-white inline-flex items-center gap-1"
                            >
                              <span>Open on Vimeo</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Inline "Ask a Question at Timestamp" Composer */}
                    {isAskingHere && onAskReplayQuestion && (
                      <form
                        onSubmit={e => {
                          e.preventDefault();
                          const q = questionTextDraft.trim();
                          if (!q) return;
                          const cleanTs = questionTimestampDraft.trim() || '00:00';
                          const tsSeconds = parseTimestampToSeconds(cleanTs);
                          const postId = onAskReplayQuestion({
                            replayId: replay.id,
                            replayTitle: replay.title,
                            videoUrl: replay.videoUrl,
                            timestampSeconds: tsSeconds,
                            timestampLabel: cleanTs,
                            question: q
                          });
                          setAskingReplayId(null);
                          setQuestionTextDraft('');
                          setPostedQuestionConfirmation({
                            replayId: replay.id,
                            postId,
                            timestampLabel: cleanTs
                          });
                        }}
                        className="pt-2.5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-2"
                      >
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-semibold text-slate-400">@</span>
                          <input
                            type="text"
                            value={questionTimestampDraft}
                            onChange={e => setQuestionTimestampDraft(e.target.value)}
                            aria-label="Video timestamp MM:SS"
                            placeholder="00:00"
                            className="w-20 rounded-xl bg-[#080C14] border border-white/10 px-2.5 py-2 text-xs font-mono font-bold text-brand-400 text-center focus:outline-none focus:border-brand-400"
                          />
                        </div>

                        <input
                          type="text"
                          required
                          value={questionTextDraft}
                          onChange={e => setQuestionTextDraft(e.target.value)}
                          placeholder={`Ask a question on "${replay.title}" — posts to Group & notifies Coach...`}
                          className="flex-1 rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-400"
                        />

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="submit"
                            className="px-3.5 py-2 rounded-xl btn-2mm text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Post to Group</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAskingReplayId(null)}
                            className="px-2.5 py-2 rounded-xl bg-white/[0.04] text-xs text-slate-400 hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Confirmation Banner After Posting Timestamp Question */}
                    {postedQuestionConfirmation?.replayId === replay.id && (
                      <div className="pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-300">
                        <span>
                          ✓ Question at{' '}
                          <strong className="font-mono">
                            {postedQuestionConfirmation.timestampLabel}
                          </strong>{' '}
                          posted to Group Discussion &amp; Coach Josh notified.
                        </span>
                        {onOpenGroupThread && (
                          <button
                            type="button"
                            onClick={() => onOpenGroupThread(postedQuestionConfirmation.postId)}
                            className="text-brand-400 hover:underline font-bold cursor-pointer"
                          >
                            View in Discussion →
                          </button>
                        )}
                      </div>
                    )}

                    {/* Interactive Timestamp Chapters */}
                    {replay.timestamps.length > 0 && (
                      <div className="pt-2 border-t border-white/[0.06] flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                        {replay.timestamps.map((ts, idx) => {
                          const sec = parseTimestampToSeconds(ts.time);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleOpenAndPlay(sec)}
                              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
                            >
                              <span className="font-mono text-brand-400 font-semibold">
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
          </section>
        </div>
      )}

      {/* SUB-TAB 2: TOOLS, TEMPLATES & SWIPE FILES */}
      {subTab === 'RESOURCES' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {RESOURCE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setResourceFilter(cat.id)}
                  aria-pressed={resourceFilter === cat.id}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                    resourceFilter === cat.id
                      ? 'bg-gradient-to-r from-brand-600 to-sky-500 text-white shadow-sm'
                      : 'bg-surface-card border border-white/[0.06] text-slate-300 hover:text-white'
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
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-400 hover:text-brand-300 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Resource</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredResources.map(res => (
              <article
                key={res.id}
                className="rounded-2xl bg-surface-card border border-white/[0.06] hover:border-brand-500/30 transition-all p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                      {res.format}
                    </span>
                    {isAdminSession && (
                      <button
                        type="button"
                        onClick={() => onDeleteResource(res.id)}
                        aria-label={`Delete resource: ${res.title}`}
                        className="text-slate-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {res.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {res.summary}
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-end">
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open resource: ${res.title}`}
                    className="px-3.5 py-2 rounded-xl btn-2mm text-xs inline-flex items-center gap-1.5"
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
        <div className="space-y-5">
          <section className="rounded-2xl bg-surface-card border border-white/[0.06] p-4 sm:p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Weekly Operator Scorecard Check-In
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Log your weekly numbers in 60 seconds so Coach Josh can spot your exact bottleneck before Thursday’s call.
              </p>
            </div>

            <form onSubmit={handleSaveScorecard} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="scorecard-videos-input"
                    className="block text-xs font-semibold text-slate-300 mb-1"
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
                    className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="scorecard-dms-input"
                    className="block text-xs font-semibold text-slate-300 mb-1"
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
                    className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="scorecard-calls-input"
                    className="block text-xs font-semibold text-slate-300 mb-1"
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
                    className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="scorecard-bottleneck-input"
                  className="block text-xs font-semibold text-slate-300 mb-1"
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
                  className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-400"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {checkInSavedToast ? (
                  <span className="text-xs font-semibold text-emerald-400">
                    ✓ Weekly Check-In saved and sent to Coach Josh!
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
                    Updates your weekly DM &amp; cadence telemetry automatically.
                  </span>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl btn-2mm text-xs cursor-pointer"
                >
                  Save Check-In
                </button>
              </div>
            </form>
          </section>

          {/* Past Check-Ins History */}
          {checkIns.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-white">
                Submitted Weekly Check-Ins ({checkIns.length})
              </h3>
              <div className="space-y-2">
                {checkIns.map(ci => (
                  <div
                    key={ci.id}
                    className="rounded-2xl bg-surface-card border border-white/[0.06] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-white">
                        {ci.weekLabel} <span className="text-slate-400 font-normal">· {ci.dateISO}</span>
                      </div>
                      <p className="text-slate-300">{ci.bottleneckNote}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-slate-300">
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
            <label htmlFor="edit-call-title" className="block font-semibold text-slate-300 mb-1">
              Call Title
            </label>
            <input
              id="edit-call-title"
              type="text"
              required
              value={callTitleDraft}
              onChange={e => setCallTitleDraft(e.target.value)}
              className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label htmlFor="edit-call-date" className="block font-semibold text-slate-300 mb-1">
              Date &amp; Time
            </label>
            <input
              id="edit-call-date"
              type="text"
              required
              value={callDateDraft}
              onChange={e => setCallDateDraft(e.target.value)}
              placeholder="e.g., Thursdays · 2:00 PM EST"
              className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label htmlFor="edit-call-topic" className="block font-semibold text-slate-300 mb-1">
              Focus Topic
            </label>
            <input
              id="edit-call-topic"
              type="text"
              required
              value={callTopicDraft}
              onChange={e => setCallTopicDraft(e.target.value)}
              className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label htmlFor="edit-call-url" className="block font-semibold text-slate-300 mb-1">
              Meeting Link (Zoom / Meet)
            </label>
            <input
              id="edit-call-url"
              type="url"
              required
              value={callUrlDraft}
              onChange={e => setCallUrlDraft(e.target.value)}
              className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowEditCallModal(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.05] text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl btn-2mm cursor-pointer"
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
            <label htmlFor="add-replay-title" className="block font-semibold text-slate-300 mb-1">
              Call Title
            </label>
            <input
              id="add-replay-title"
              type="text"
              required
              value={replayTitle}
              onChange={e => setReplayTitle(e.target.value)}
              placeholder="e.g., Hot-Seat Review: B2 Product Demonstration Scripts"
              className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label htmlFor="add-replay-url" className="block font-semibold text-slate-300 mb-1">
              Vimeo Recording URL
            </label>
            <input
              id="add-replay-url"
              type="url"
              required
              value={replayUrl}
              onChange={e => setReplayUrl(e.target.value)}
              placeholder="https://vimeo.com/..."
              className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label htmlFor="add-replay-summary" className="block font-semibold text-slate-300 mb-1">
              1-Sentence Takeaway
            </label>
            <input
              id="add-replay-summary"
              type="text"
              required
              value={replaySummary}
              onChange={e => setReplaySummary(e.target.value)}
              placeholder="What students will learn from this session..."
              className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label htmlFor="add-replay-timestamps" className="block font-semibold text-slate-300 mb-1">
              Key Timestamps (One per line, e.g. 08:15 - Fixing B1 Hooks)
            </label>
            <textarea
              id="add-replay-timestamps"
              rows={3}
              value={replayTimestampsRaw}
              onChange={e => setReplayTimestampsRaw(e.target.value)}
              placeholder={'05:20 - Tightening first 3 seconds\n19:40 - $5/day ad audience setup'}
              className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2 text-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddReplayModal(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.05] text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl btn-2mm cursor-pointer"
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
            <label htmlFor="add-res-title" className="block font-semibold text-slate-300 mb-1">
              Resource Title
            </label>
            <input
              id="add-res-title"
              type="text"
              required
              value={resTitle}
              onChange={e => setResTitle(e.target.value)}
              placeholder="e.g., The 2-Page Super Signature Offer Doc Template"
              className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label htmlFor="add-res-category" className="block font-semibold text-slate-300 mb-1">
              Category
            </label>
            <select
              id="add-res-category"
              value={resCategory}
              onChange={e => setResCategory(e.target.value as ResourceCategory)}
              className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-400"
            >
              <option value="TEMPLATES">Templates &amp; SOPs</option>
              <option value="SWIPE_FILES">Swipe Files</option>
              <option value="TOOLS_GEAR">Tools &amp; Gear</option>
            </select>
          </div>
          <div>
            <label htmlFor="add-res-url" className="block font-semibold text-slate-300 mb-1">
              Resource Link (Google Doc / PDF / Notion / URL)
            </label>
            <input
              id="add-res-url"
              type="url"
              required
              value={resUrl}
              onChange={e => setResUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label htmlFor="add-res-summary" className="block font-semibold text-slate-300 mb-1">
              1-Sentence Outcome
            </label>
            <input
              id="add-res-summary"
              type="text"
              required
              value={resSummary}
              onChange={e => setResSummary(e.target.value)}
              placeholder="How this helps the operator execute faster..."
              className="w-full rounded-xl bg-[#080C14] border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddResourceModal(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.05] text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl btn-2mm cursor-pointer"
            >
              Add Resource
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
