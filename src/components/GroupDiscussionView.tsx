import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Video,
  MessageSquare,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  Lightbulb,
  ThumbsUp,
  Plus,
  Pin,
  Trash2,
  Search,
  Share2
} from 'lucide-react';
import {
  StudentProfile,
  GroupDiscussionPost,
  GroupDiscussionCategory,
  CoachReviewStatus
} from '../types';

interface GroupDiscussionViewProps {
  students: StudentProfile[];
  currentStudent: StudentProfile;
  isAdminSession: boolean;
  posts: GroupDiscussionPost[];
  requestedPostId?: string;
  onClearRequestedPostId?: () => void;
  onCreateGeneralPost: (params: {
    title: string;
    body: string;
    category: GroupDiscussionCategory;
    videoUrl?: string;
    notifyCohort: boolean;
  }) => void;
  onShareVideoToGroup: (params: {
    studentId: string;
    videoType: 'SUPPORTING' | 'CORE';
    videoId: string;
    note?: string;
    notifyCohort: boolean;
  }) => void;
  onAddComment: (postId: string, text: string) => void;
  onToggleReaction: (postId: string, reaction: 'fire' | 'shift' | 'props') => void;
  onTogglePinPost?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onReviewStudentVideo?: (
    studentId: string,
    videoType: 'SUPPORTING' | 'CORE',
    videoId: string,
    reviewStatus: CoachReviewStatus,
    feedback: string
  ) => void;
}

const CATEGORY_LABELS: Record<GroupDiscussionCategory, { label: string; color: string }> = {
  VIDEO_BREAKDOWN: {
    label: '🎬 Video Breakdown',
    color: 'bg-[#09ADEF]/15 text-[#09ADEF] border-[#09ADEF]/35'
  },
  HOOK_FEEDBACK: {
    label: '⚡ Hook Brainstorm',
    color: 'bg-amber-500/15 text-amber-300 border-amber-500/35'
  },
  SHIFT_MAGNET: {
    label: '🧲 Shift Magnet & CTA',
    color: 'bg-purple-500/15 text-purple-300 border-purple-500/35'
  },
  WINS: {
    label: '🏆 Student Win',
    color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
  },
  GENERAL: {
    label: '💬 General Discussion',
    color: 'bg-white/[0.06] text-neutral-300 border-white/15'
  }
};

const QUICK_COACH_FEEDBACK_PRESETS = [
  'Strong hook & delivery — approved! Great example of punching in on Take 1.',
  'Great energy! Notice how clean the transition into Take 2 is. Tighten the first 3 seconds slightly next time.',
  'Solid belief shift in Take 3 & 4 — make sure to verbally call out the Shift Magnet keyword at the end.',
  'Pacing and camera framing are spot on — ready for your $5/day Andromeda boost.'
];

export const GroupDiscussionView: React.FC<GroupDiscussionViewProps> = ({
  students,
  currentStudent,
  isAdminSession,
  posts,
  requestedPostId,
  onClearRequestedPostId,
  onCreateGeneralPost,
  onShareVideoToGroup,
  onAddComment,
  onToggleReaction,
  onTogglePinPost,
  onDeletePost,
  onReviewStudentVideo
}) => {
  const [feedMode, setFeedMode] = useState<'ALL' | 'VIDEOS' | 'GENERAL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | GroupDiscussionCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);

  // Composer modals / drawers
  const [showNewThreadForm, setShowNewThreadForm] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadBody, setNewThreadBody] = useState('');
  const [newThreadCategory, setNewThreadCategory] = useState<GroupDiscussionCategory>('GENERAL');
  const [newThreadUrl, setNewThreadUrl] = useState('');
  const [notifyOnNewThread, setNotifyOnNewThread] = useState(true);

  const [showShareVideoDrawer, setShowShareVideoDrawer] = useState(false);
  const [selectedShareVideoKey, setSelectedShareVideoKey] = useState<string>('');
  const [shareVideoNote, setShareVideoNote] = useState('');
  const [notifyOnVideoShare, setNotifyOnVideoShare] = useState(true);

  // Reply inputs keyed by postId
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Inline Coach Review drawer keyed by postId
  const [activeCoachReviewPostId, setActiveCoachReviewPostId] = useState<string | null>(null);
  const [coachReviewStatusDraft, setCoachReviewStatusDraft] = useState<
    Record<string, CoachReviewStatus>
  >({});
  const [coachReviewNoteDraft, setCoachReviewNoteDraft] = useState<Record<string, string>>({});

  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const currentViewerId = isAdminSession ? 'coach-josh' : currentStudent.id;

  // Handle deep-linking to a specific post from a notification
  useEffect(() => {
    if (!requestedPostId) return;
    setFeedMode('ALL');
    setCategoryFilter('ALL');
    setHighlightedPostId(requestedPostId);
    setTimeout(() => {
      const el = postRefs.current[requestedPostId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    const timer = setTimeout(() => {
      setHighlightedPostId(null);
    }, 4500);
    onClearRequestedPostId?.();
    return () => clearTimeout(timer);
  }, [requestedPostId, onClearRequestedPostId]);

  // Enrich VIDEO_SHARE posts with the latest live Coach Review status/feedback from the student's profile
  const enrichedPosts = useMemo(() => {
    return posts.map(post => {
      if (post.type !== 'VIDEO_SHARE' || !post.studentId || !post.videoId) {
        return post;
      }
      const owner = students.find(s => s.id === post.studentId);
      if (!owner) return post;

      if (post.videoType === 'CORE') {
        const coreVid = owner.coreVideos.find(c => c.id === post.videoId);
        if (coreVid) {
          return {
            ...post,
            videoUrl: coreVid.videoUrl || post.videoUrl,
            coachReviewStatus: coreVid.coachReviewStatus || post.coachReviewStatus,
            coachFeedback: coreVid.coachFeedback || post.coachFeedback,
            coachReviewedAt: coreVid.coachReviewedAt || post.coachReviewedAt
          };
        }
      } else {
        const suppVid = owner.supportingVideos.find(v => v.id === post.videoId);
        if (suppVid) {
          return {
            ...post,
            videoUrl: suppVid.videoUrl || post.videoUrl,
            coachReviewStatus: suppVid.coachReviewStatus || post.coachReviewStatus,
            coachFeedback: suppVid.coachFeedback || post.coachFeedback,
            coachReviewedAt: suppVid.coachReviewedAt || post.coachReviewedAt
          };
        }
      }
      return post;
    });
  }, [posts, students]);

  // Sort: Pinned first, then newest first
  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedPosts
      .filter(p => {
        if (feedMode === 'VIDEOS' && p.type !== 'VIDEO_SHARE') return false;
        if (feedMode === 'GENERAL' && p.type !== 'GENERAL_THREAD') return false;
        if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
        if (q) {
          const inTitle = p.title.toLowerCase().includes(q);
          const inBody = p.body.toLowerCase().includes(q);
          const inAuthor = p.authorName.toLowerCase().includes(q);
          const inFeedback = (p.coachFeedback || '').toLowerCase().includes(q);
          const inComments = p.comments.some(c => c.text.toLowerCase().includes(q));
          return inTitle || inBody || inAuthor || inFeedback || inComments;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.createdAtISO.localeCompare(a.createdAtISO);
      });
  }, [enrichedPosts, feedMode, categoryFilter, searchQuery]);

  // Gather completed videos for the "Share a Completed Video" quick drawer
  const shareableVideos = useMemo(() => {
    const targetStudents = isAdminSession ? students : [currentStudent];
    const list: {
      key: string;
      studentId: string;
      studentName: string;
      videoType: 'SUPPORTING' | 'CORE';
      videoId: string;
      label: string;
      url: string;
      alreadyShared: boolean;
    }[] = [];

    for (const st of targetStudents) {
      for (const v of st.supportingVideos) {
        if (v.status === 'Completed' && v.videoUrl) {
          const alreadyShared = posts.some(
            p => p.type === 'VIDEO_SHARE' && p.studentId === st.id && p.videoId === v.id
          );
          list.push({
            key: `${st.id}::SUPPORTING::${v.id}`,
            studentId: st.id,
            studentName: st.name,
            videoType: 'SUPPORTING',
            videoId: v.id,
            label: `${isAdminSession ? `[${st.name}] ` : ''}Day #${String(v.dayNumber).padStart(
              2,
              '0'
            )}: ${v.title}`,
            url: v.videoUrl,
            alreadyShared
          });
        }
      }
      for (const c of st.coreVideos) {
        if (c.status === 'Completed' && c.videoUrl) {
          const alreadyShared = posts.some(
            p => p.type === 'VIDEO_SHARE' && p.studentId === st.id && p.videoId === c.id
          );
          list.push({
            key: `${st.id}::CORE::${c.id}`,
            studentId: st.id,
            studentName: st.name,
            videoType: 'CORE',
            videoId: c.id,
            label: `${isAdminSession ? `[${st.name}] ` : ''}Core ${c.code}: ${c.name}`,
            url: c.videoUrl,
            alreadyShared
          });
        }
      }
    }
    return list;
  }, [students, currentStudent, isAdminSession, posts]);

  const videoBreakdownCount = enrichedPosts.filter(p => p.type === 'VIDEO_SHARE').length;
  const coachReviewedThreadCount = enrichedPosts.filter(
    p => p.type === 'VIDEO_SHARE' && (p.coachFeedback || p.coachReviewStatus === 'Approved')
  ).length;
  const totalCommentsCount = enrichedPosts.reduce((acc, p) => acc + p.comments.length, 0);

  const handleCreateGeneralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle.trim() || !newThreadBody.trim()) return;
    onCreateGeneralPost({
      title: newThreadTitle.trim(),
      body: newThreadBody.trim(),
      category: newThreadCategory,
      videoUrl: newThreadUrl.trim() || undefined,
      notifyCohort: notifyOnNewThread
    });
    setNewThreadTitle('');
    setNewThreadBody('');
    setNewThreadUrl('');
    setShowNewThreadForm(false);
  };

  const handleShareSelectedVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenKey = selectedShareVideoKey || shareableVideos[0]?.key;
    if (!chosenKey) return;
    const [studentId, videoType, videoId] = chosenKey.split('::') as [
      string,
      'SUPPORTING' | 'CORE',
      string
    ];
    onShareVideoToGroup({
      studentId,
      videoType,
      videoId,
      note: shareVideoNote.trim() || undefined,
      notifyCohort: notifyOnVideoShare
    });
    setShareVideoNote('');
    setShowShareVideoDrawer(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Hero Banner + KPI Strip */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#09ADEF]/12 border border-[#09ADEF]/30 text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
              <Users className="w-3.5 h-3.5" />
              <span>DISCUSSION · VIDEO OUTPUTS, COACH FEEDBACK & THREADS</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl text-white tracking-wide uppercase mt-2">
              DISCUSSION
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
              Share your verified videos so all students get notified to watch and learn, see Coach Josh’s official feedback automatically appended to each video thread, and jump into open discussions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowShareVideoDrawer(v => !v);
                setShowNewThreadForm(false);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-[#09ADEF]/15 hover:bg-[#09ADEF]/25 border border-[#09ADEF]/40 text-xs font-bold uppercase tracking-wider text-[#09ADEF] inline-flex items-center gap-1.5 cursor-pointer transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Video to Discussion</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowNewThreadForm(v => !v);
                setShowShareVideoDrawer(false);
              }}
              className="btn-2mm px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Discussion Thread</span>
            </button>
          </div>
        </div>

        {/* 4-Metric Discussion Activity Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-white/[0.07]">
          <div className="p-3 rounded-xl bg-[#040507] border border-white/[0.06]">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              ACTIVE STUDENTS
            </div>
            <div className="font-display text-xl sm:text-2xl text-white mt-0.5">
              {students.length} MEMBERS
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#040507] border border-white/[0.06]">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF]">
              SHARED VIDEOS
            </div>
            <div className="font-display text-xl sm:text-2xl text-[#09ADEF] mt-0.5">
              {videoBreakdownCount} POSTED
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#040507] border border-white/[0.06]">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-400">
              COACH BREAKDOWNS
            </div>
            <div className="font-display text-xl sm:text-2xl text-white mt-0.5">
              {coachReviewedThreadCount} APPENDED
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#040507] border border-white/[0.06]">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              DISCUSSION REPLIES
            </div>
            <div className="font-display text-xl sm:text-2xl text-white mt-0.5">
              {totalCommentsCount} COMMENTS
            </div>
          </div>
        </div>
      </div>

      {/* Drawer 1: Share an Already-Completed Video to Discussion */}
      {showShareVideoDrawer && (
        <form
          onSubmit={handleShareSelectedVideoSubmit}
          className="glass-panel rounded-2xl p-4 sm:p-6 border border-[#09ADEF]/40 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                POST COMPLETED VIDEO OUTPUT TO DISCUSSION
              </div>
              <h2 className="font-display text-xl sm:text-2xl text-white mt-0.5">
                Share Video Link & Notify Students
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowShareVideoDrawer(false)}
              className="text-xs text-neutral-400 hover:text-white cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          {shareableVideos.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#040507] border border-white/10 text-xs text-neutral-300">
              You don’t have any verified video links yet. Head to <strong>Studio → Step 4 (Verify Link)</strong> and check <em>"Post Link to Discussion"</em> when verifying your next video!
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                  SELECT VERIFIED VIDEO TO SHARE IN DISCUSSION
                </label>
                <select
                  value={selectedShareVideoKey || shareableVideos[0]?.key || ''}
                  onChange={e => setSelectedShareVideoKey(e.target.value)}
                  className="w-full rounded-xl bg-[#040507] border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#09ADEF]"
                >
                  {shareableVideos.map(v => (
                    <option key={v.key} value={v.key}>
                      {v.label} {v.alreadyShared ? '(Already Shared — Update Thread)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                  TAKEAWAY OR QUESTION FOR DISCUSSION (OPTIONAL)
                </label>
                <textarea
                  rows={2}
                  value={shareVideoNote}
                  onChange={e => setShareVideoNote(e.target.value)}
                  placeholder="E.g., Tested Hook #2 today and tried a faster camera shift on Take 2. Would love feedback on the pacing!"
                  className="w-full rounded-xl bg-[#040507] border border-white/15 p-3 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#09ADEF]"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#09ADEF]/10 border border-[#09ADEF]/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnVideoShare}
                  onChange={e => setNotifyOnVideoShare(e.target.checked)}
                  className="rounded accent-[#09ADEF] w-4 h-4"
                />
                <span className="text-xs text-white font-medium">
                  Notify all students that a new video output was posted so they can watch & discuss
                </span>
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowShareVideoDrawer(false)}
                  className="px-4 py-2 rounded-lg bg-white/[0.05] text-xs text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-2mm px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Post Video to Discussion & Notify</span>
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* Drawer 2: Start New General Discussion Thread */}
      {showNewThreadForm && (
        <form
          onSubmit={handleCreateGeneralSubmit}
          className="glass-panel rounded-2xl p-4 sm:p-6 border border-[#09ADEF]/40 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                START A DISCUSSION THREAD
              </div>
              <h2 className="font-display text-xl sm:text-2xl text-white mt-0.5">
                General Discussion, Hook Workshop, or Win
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowNewThreadForm(false)}
              className="text-xs text-neutral-400 hover:text-white cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                DISCUSSION TOPIC / HEADLINE
              </label>
              <input
                type="text"
                required
                value={newThreadTitle}
                onChange={e => setNewThreadTitle(e.target.value)}
                placeholder="E.g., How are you all framing Take 3 when telling a client story?"
                className="w-full rounded-xl bg-[#040507] border border-white/15 px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#09ADEF]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                TOPIC TAG
              </label>
              <select
                value={newThreadCategory}
                onChange={e => setNewThreadCategory(e.target.value as GroupDiscussionCategory)}
                className="w-full rounded-xl bg-[#040507] border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#09ADEF]"
              >
                <option value="GENERAL">💬 General Discussion</option>
                <option value="HOOK_FEEDBACK">⚡ Hook Brainstorm</option>
                <option value="SHIFT_MAGNET">🧲 Shift Magnet & CTA</option>
                <option value="WINS">🏆 Student Win</option>
                <option value="VIDEO_BREAKDOWN">🎬 Video Breakdown</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
              DETAILS / QUESTION
            </label>
            <textarea
              rows={3}
              required
              value={newThreadBody}
              onChange={e => setNewThreadBody(e.target.value)}
              placeholder="Share your question, hook draft, or takeaway so Coach Josh and other students can jump in..."
              className="w-full rounded-xl bg-[#040507] border border-white/15 p-3 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#09ADEF]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
              OPTIONAL LINK (VIDEO, DOC, OR SHIFT MAGNET URL)
            </label>
            <input
              type="url"
              value={newThreadUrl}
              onChange={e => setNewThreadUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl bg-[#040507] border border-white/15 px-3.5 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#09ADEF]"
            />
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#09ADEF]/10 border border-[#09ADEF]/30 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnNewThread}
              onChange={e => setNotifyOnNewThread(e.target.checked)}
              className="rounded accent-[#09ADEF] w-4 h-4"
            />
            <span className="text-xs text-white font-medium">
              Send notification to all students about this new discussion thread
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewThreadForm(false)}
              className="px-4 py-2 rounded-lg bg-white/[0.05] text-xs text-neutral-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-2mm px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Post Discussion Thread</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-xl bg-[#07090D] border border-white/[0.08]">
          {[
            { id: 'ALL' as const, label: `All Threads (${enrichedPosts.length})` },
            {
              id: 'VIDEOS' as const,
              label: `🎬 Video Outputs & Feedback (${videoBreakdownCount})`
            },
            {
              id: 'GENERAL' as const,
              label: `💬 General Discussion (${enrichedPosts.length - videoBreakdownCount})`
            }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFeedMode(tab.id)}
              className={`px-3 py-2 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.06em] whitespace-nowrap transition-all cursor-pointer ${
                feedMode === tab.id
                  ? 'bg-[#09ADEF] text-white shadow-[0_4px_20px_rgba(9,173,239,0.35)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search videos, hooks, feedback..."
            className="w-full rounded-xl bg-[#07090D] border border-white/10 pl-8 pr-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#09ADEF]"
          />
        </div>
      </div>

      {/* Feed List */}
      {filteredPosts.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#09ADEF]/15 border border-[#09ADEF]/30 text-[#09ADEF] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="text-base font-semibold text-white">No Discussion Threads Match This Filter</div>
          <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
            Share a completed video from your Studio or start a new discussion thread above so everyone can collaborate and review outputs together.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map(post => {
            const catMeta = CATEGORY_LABELS[post.category] || CATEGORY_LABELS.GENERAL;
            const isHighlighted = highlightedPostId === post.id;
            const hasVotedFire = post.reactions.fire.includes(currentViewerId);
            const hasVotedShift = post.reactions.shift.includes(currentViewerId);
            const hasVotedProps = post.reactions.props.includes(currentViewerId);
            const replyText = replyDrafts[post.id] || '';
            const isReviewingInline = activeCoachReviewPostId === post.id;

            return (
              <div
                key={post.id}
                ref={el => {
                  postRefs.current[post.id] = el;
                }}
                className={`glass-panel rounded-2xl p-4 sm:p-6 space-y-4 transition-all ${
                  isHighlighted
                    ? 'border-[#09ADEF] shadow-[0_0_35px_rgba(9,173,239,0.28)]'
                    : post.pinned
                    ? 'border-[#09ADEF]/35'
                    : ''
                }`}
              >
                {/* Post Author & Metadata Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                        post.authorRole === 'COACH'
                          ? 'bg-[#09ADEF] text-white border-[#09ADEF] shadow-[0_0_16px_rgba(9,173,239,0.35)]'
                          : 'bg-[#09ADEF]/15 text-[#09ADEF] border-[#09ADEF]/30'
                      }`}
                    >
                      {post.authorAvatar}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white">{post.authorName}</span>
                        {post.authorRole === 'COACH' ? (
                          <span className="px-2 py-0.5 rounded bg-[#09ADEF]/20 border border-[#09ADEF]/40 text-[9px] font-bold uppercase tracking-wider text-[#09ADEF]">
                            COACH · ARCHITECT
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400 truncate">
                            {post.authorCompany}
                            {post.authorNiche ? ` · ${post.authorNiche}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {post.pinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                            <Pin className="w-2.5 h-2.5" /> Pinned
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${catMeta.color}`}
                        >
                          {catMeta.label}
                        </span>
                        <span className="text-[11px] text-neutral-500">{post.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Controls (Pin / Delete) */}
                  {isAdminSession && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onTogglePinPost && (
                        <button
                          type="button"
                          onClick={() => onTogglePinPost(post.id)}
                          className={`p-1.5 rounded-lg border text-xs cursor-pointer transition ${
                            post.pinned
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-[#040507] border-white/10 text-neutral-400 hover:text-white'
                          }`}
                          title={post.pinned ? 'Unpin thread' : 'Pin thread to top'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeletePost && post.id !== 'group-welcome-pinned' && (
                        <button
                          type="button"
                          onClick={() => onDeletePost(post.id)}
                          className="p-1.5 rounded-lg bg-[#040507] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-neutral-400 hover:text-rose-300 text-xs cursor-pointer transition"
                          title="Delete thread"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Thread Title & Body */}
                <div className="space-y-2">
                  <h3 className="font-display text-xl sm:text-2xl text-white tracking-wide">
                    {post.title}
                  </h3>
                  {post.body && (
                    <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed whitespace-pre-line">
                      {post.body}
                    </p>
                  )}
                </div>

                {/* Shared Video Card + Auto-Appended Coach Feedback (For VIDEO_SHARE Posts) */}
                {post.type === 'VIDEO_SHARE' && (
                  <div className="rounded-xl bg-[#040507] border border-white/10 overflow-hidden">
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="badge-2mm px-2.5 py-0.5 rounded text-[10px]">
                            {post.videoBadge || 'DAILY VIDEO'}
                          </span>
                          {post.videoStage && (
                            <span className="text-[11px] text-neutral-400">{post.videoStage}</span>
                          )}
                        </div>
                        {post.hookUsed && (
                          <div className="text-xs text-neutral-300">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF] mr-1.5">
                              Opening Hook Used:
                            </span>
                            “{post.hookUsed}”
                          </div>
                        )}
                      </div>

                      {post.videoUrl && (
                        <a
                          href={post.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-2mm px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Watch Student Video</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* Appended Coach Josh Official Feedback Block */}
                    {post.coachFeedback ||
                    post.coachReviewStatus === 'Approved' ||
                    post.coachReviewStatus === 'Needs Revision' ? (
                      <div
                        className={`p-4 border-t ${
                          post.coachReviewStatus === 'Needs Revision'
                            ? 'bg-rose-500/10 border-rose-500/30'
                            : 'bg-emerald-500/[0.08] border-emerald-500/30'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            {post.coachReviewStatus === 'Needs Revision' ? (
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                            <span
                              className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                                post.coachReviewStatus === 'Needs Revision'
                                  ? 'text-rose-300'
                                  : 'text-emerald-300'
                              }`}
                            >
                              COACH JOSH BREAKDOWN APPENDED ·{' '}
                              {post.coachReviewStatus === 'Needs Revision'
                                ? 'REVISION REQUESTED'
                                : 'APPROVED'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {post.coachReviewedAt && (
                              <span className="text-[10px] text-neutral-400">
                                {post.coachReviewedAt}
                              </span>
                            )}
                            {isAdminSession && post.studentId && post.videoId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveCoachReviewPostId(
                                    isReviewingInline ? null : post.id
                                  );
                                  setCoachReviewStatusDraft(prev => ({
                                    ...prev,
                                    [post.id]: post.coachReviewStatus || 'Approved'
                                  }));
                                  setCoachReviewNoteDraft(prev => ({
                                    ...prev,
                                    [post.id]: post.coachFeedback || ''
                                  }));
                                }}
                                className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF] hover:underline cursor-pointer"
                              >
                                {isReviewingInline ? 'Close Editor' : 'Edit Breakdown'}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-white font-medium leading-relaxed border-l-2 border-[#09ADEF] pl-3 py-0.5">
                          “{post.coachFeedback || `Marked as ${post.coachReviewStatus} by Coach Josh.`}”
                        </p>
                      </div>
                    ) : (
                      <div className="px-4 py-3 border-t border-white/[0.06] bg-black/40 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                          <Clock className="w-3.5 h-3.5 text-[#09ADEF]" />
                          <span>
                            Awaiting Coach Josh’s review — official coaching feedback will automatically append here once reviewed.
                          </span>
                        </div>
                        {isAdminSession && post.studentId && post.videoId && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCoachReviewPostId(isReviewingInline ? null : post.id);
                              setCoachReviewStatusDraft(prev => ({
                                ...prev,
                                [post.id]: 'Approved'
                              }));
                              setCoachReviewNoteDraft(prev => ({
                                ...prev,
                                [post.id]: ''
                              }));
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#09ADEF]/20 hover:bg-[#09ADEF]/30 border border-[#09ADEF]/40 text-[10px] font-bold uppercase tracking-wider text-[#09ADEF] cursor-pointer"
                          >
                            + Append Coach Feedback Now
                          </button>
                        )}
                      </div>
                    )}

                    {/* Inline Coach Review Form (Admin Only) */}
                    {isAdminSession &&
                      isReviewingInline &&
                      post.studentId &&
                      post.videoId &&
                      onReviewStudentVideo && (
                        <div className="p-4 border-t border-[#09ADEF]/30 bg-[#070B12] space-y-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                            COACH REVIEW & BREAKDOWN (UPDATES STUDIO & DISCUSSION THREAD)
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(['Approved', 'Needs Revision'] as const).map(st => {
                              const currentDecision =
                                coachReviewStatusDraft[post.id] || 'Approved';
                              const active = currentDecision === st;
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() =>
                                    setCoachReviewStatusDraft(prev => ({
                                      ...prev,
                                      [post.id]: st
                                    }))
                                  }
                                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border cursor-pointer ${
                                    active && st === 'Approved'
                                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                      : active && st === 'Needs Revision'
                                      ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                                      : 'bg-black border-white/10 text-neutral-400'
                                  }`}
                                >
                                  {st === 'Approved' ? '✓ Approve Video' : '↻ Needs Revision'}
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {QUICK_COACH_FEEDBACK_PRESETS.map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() =>
                                  setCoachReviewNoteDraft(prev => ({
                                    ...prev,
                                    [post.id]: preset
                                  }))
                                }
                                className="px-2.5 py-1 rounded-lg bg-black hover:bg-white/[0.06] border border-white/10 text-[11px] text-neutral-300 cursor-pointer"
                              >
                                + “{preset.slice(0, 48)}...”
                              </button>
                            ))}
                          </div>

                          <textarea
                            rows={2}
                            value={coachReviewNoteDraft[post.id] ?? ''}
                            onChange={e =>
                              setCoachReviewNoteDraft(prev => ({
                                ...prev,
                                [post.id]: e.target.value
                              }))
                            }
                            placeholder="Write your Coach Breakdown — this appends directly to this thread and notifies all students..."
                            className="w-full rounded-xl bg-black border border-white/15 p-3 text-xs text-white focus:outline-none focus:border-[#09ADEF]"
                          />

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveCoachReviewPostId(null)}
                              className="px-3.5 py-1.5 rounded-lg bg-white/5 text-xs text-neutral-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const decision =
                                  coachReviewStatusDraft[post.id] || 'Approved';
                                const note = (coachReviewNoteDraft[post.id] || '').trim();
                                onReviewStudentVideo(
                                  post.studentId!,
                                  post.videoType || 'SUPPORTING',
                                  post.videoId!,
                                  decision,
                                  note
                                );
                                setActiveCoachReviewPostId(null);
                              }}
                              className="btn-2mm px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                              Append Feedback & Notify
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Optional External Link on General Thread */}
                {post.type === 'GENERAL_THREAD' && post.videoUrl && (
                  <div>
                    <a
                      href={post.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#040507] hover:bg-white/[0.06] border border-[#09ADEF]/35 text-xs font-semibold text-[#09ADEF]"
                    >
                      <span>Open Attached Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Cohort Reactions Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.07]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleReaction(post.id, 'fire')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                        hasVotedFire
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                          : 'bg-[#040507] border-white/10 text-neutral-300 hover:border-white/25'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>Fire Hook</span>
                      {post.reactions.fire.length > 0 && (
                        <span className="font-bold">{post.reactions.fire.length}</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleReaction(post.id, 'shift')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                        hasVotedShift
                          ? 'bg-[#09ADEF]/20 border-[#09ADEF] text-white'
                          : 'bg-[#040507] border-white/10 text-neutral-300 hover:border-white/25'
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-[#09ADEF]" />
                      <span>2mm Shift</span>
                      {post.reactions.shift.length > 0 && (
                        <span className="font-bold">{post.reactions.shift.length}</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleReaction(post.id, 'props')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                        hasVotedProps
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                          : 'bg-[#040507] border-white/10 text-neutral-300 hover:border-white/25'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Execution</span>
                      {post.reactions.props.length > 0 && (
                        <span className="font-bold">{post.reactions.props.length}</span>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <MessageSquare className="w-3.5 h-3.5 text-[#09ADEF]" />
                    <span>
                      {post.comments.length}{' '}
                      {post.comments.length === 1 ? 'Discussion Reply' : 'Discussion Replies'}
                    </span>
                  </div>
                </div>

                {/* Open Discussion Thread (Comments + Reply Input) */}
                <div className="rounded-xl bg-[#040507] border border-white/[0.07] p-3.5 sm:p-4 space-y-3">
                  {post.comments.length > 0 && (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {post.comments.map(comment => (
                        <div
                          key={comment.id}
                          className={`p-3 rounded-xl border text-xs ${
                            comment.isOfficialCoachReview
                              ? 'bg-[#09ADEF]/12 border-[#09ADEF]/40 text-white'
                              : comment.authorRole === 'COACH'
                              ? 'bg-[#09ADEF]/[0.07] border-[#09ADEF]/30 text-white'
                              : 'bg-black/60 border-white/[0.07] text-neutral-200'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-[#09ADEF]/20 text-[#09ADEF] font-bold text-[10px] flex items-center justify-center">
                                {comment.authorAvatar}
                              </span>
                              <span className="font-bold text-white">{comment.authorName}</span>
                              {comment.authorRole === 'COACH' && (
                                <span className="px-1.5 py-0.5 rounded bg-[#09ADEF] text-white text-[9px] font-bold uppercase tracking-wider">
                                  {comment.isOfficialCoachReview ? 'COACH REVIEW' : 'COACH'}
                                </span>
                              )}
                              {comment.authorCompany && comment.authorRole !== 'COACH' && (
                                <span className="text-[11px] text-neutral-500">
                                  · {comment.authorCompany}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-neutral-500">{comment.timestamp}</span>
                          </div>
                          <p className="text-xs sm:text-sm leading-relaxed pl-7">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Reply Input */}
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      if (!replyText.trim()) return;
                      onAddComment(post.id, replyText.trim());
                      setReplyDrafts(prev => ({ ...prev, [post.id]: '' }));
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={replyText}
                      onChange={e =>
                        setReplyDrafts(prev => ({ ...prev, [post.id]: e.target.value }))
                      }
                      placeholder={
                        isAdminSession
                          ? 'Add Coach feedback or reply to this discussion thread...'
                          : `Reply as ${currentStudent.name} — share feedback, ask a question, or discuss...`
                      }
                      className="flex-1 rounded-xl bg-black border border-white/12 px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#09ADEF]"
                    />
                    <button
                      type="submit"
                      className="btn-2mm px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reply</span>
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
