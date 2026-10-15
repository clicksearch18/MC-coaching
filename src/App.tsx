import React, { useState, useEffect } from 'react';
import {
  Video,
  BookOpen,
  Magnet,
  Bell,
  MessageSquare,
  Upload,
  Send,
  Smartphone,
  UserCheck,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { INITIAL_STUDENTS, createNewStudentProfile } from './data/initialStudents';
import { WORKBOOK_WEEKS } from './data/workbookData';
import { StudentProfile, SupportingVideoItem, ShiftMagnet, WorkbookWeek, PlaybookPillar } from './types';
import { DailyCadenceView } from './components/DailyCadenceView';
import { WorkbookView } from './components/WorkbookView';
import { ShiftMagnetsView } from './components/ShiftMagnetsView';
import { CoachDashboardView } from './components/CoachDashboardView';
import { LoginView } from './components/LoginView';
import { ModalDialog } from './components/ModalDialog';
import { parseStudentSpreadsheet } from './utils/excelParser';
import {
  fetchStudentsFromSupabase,
  upsertStudentsToSupabase,
  deleteStudentFromSupabase,
  fetchLessonsFromSupabase,
  upsertLessonsToSupabase,
  isSupabaseConfigured
} from './lib/supabase';

const STORAGE_KEY = 'mcm_cam005_students_v4_clean';
const LESSONS_STORAGE_KEY = 'mcm_cam005_lessons_v2';
const AUTH_SESSION_KEY = 'mcm_cam005_auth_session_v1';
const LEGACY_DEMO_IDS = new Set(['student-marcus', 'student-elena', 'student-devon']);

interface AuthSession {
  role: 'UNAUTHENTICATED' | 'STUDENT' | 'ADMIN';
  studentId?: string;
}

interface PushBanner {
  id: string;
  title: string;
  body: string;
  type: 'COACH_NUDGE' | 'DAILY_LESSON' | 'MISSED_ALERT';
}

export function App() {
  const [students, setStudents] = useState<StudentProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return INITIAL_STUDENTS;
  });

  const [lessons, setLessons] = useState<WorkbookWeek[]>(() => {
    try {
      const saved = localStorage.getItem(LESSONS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return WORKBOOK_WEEKS;
  });

  const [authSession, setAuthSession] = useState<AuthSession>(() => {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const magicStudentId = params.get('student');

    if (path === '/login') {
      return { role: 'UNAUTHENTICATED' };
    }
    if (magicStudentId) {
      return { role: 'STUDENT', studentId: magicStudentId };
    }
    try {
      const saved = localStorage.getItem(AUTH_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AuthSession;
        if (path === '/admin' && parsed.role !== 'ADMIN') {
          return { role: 'UNAUTHENTICATED' };
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return { role: 'UNAUTHENTICATED' };
  });

  const [roleMode, setRoleMode] = useState<'STUDENT' | 'COACH'>(() =>
    window.location.pathname.toLowerCase() === '/admin' ? 'COACH' : 'STUDENT'
  );
  const [activeTab, setActiveTab] = useState<'CADENCE' | 'WORKBOOK' | 'MAGNETS' | 'COACH'>(() =>
    window.location.pathname.toLowerCase() === '/admin' ? 'COACH' : 'CADENCE'
  );
  const [activeStudentId, setActiveStudentId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('student') || INITIAL_STUDENTS[0].id;
  });
  const [dbSyncStatus, setDbSyncStatus] = useState<'CONNECTING' | 'SYNCED' | 'LOCAL'>('CONNECTING');
  const [initialDbLoadDone, setInitialDbLoadDone] = useState(false);

  // Modals & Push Banners
  const [showImportModal, setShowImportModal] = useState(false);
  const [showStudentInboxModal, setShowStudentInboxModal] = useState(false);
  const [studentReplyInput, setStudentReplyInput] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [pushBanners, setPushBanners] = useState<PushBanner[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Initial load & seed with Supabase DB
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setDbSyncStatus('LOCAL');
      setInitialDbLoadDone(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const [remoteStudents, remoteLessons] = await Promise.all([
        fetchStudentsFromSupabase(),
        fetchLessonsFromSupabase()
      ]);
      if (cancelled) return;

      if (remoteStudents === null) {
        setDbSyncStatus('LOCAL');
      } else {
        // Delete any legacy demo users from Supabase
        for (const rs of remoteStudents) {
          if (LEGACY_DEMO_IDS.has(rs.id)) {
            await deleteStudentFromSupabase(rs.id);
          }
        }
        const realRemoteStudents = remoteStudents.filter(rs => !LEGACY_DEMO_IDS.has(rs.id));

        if (realRemoteStudents.length === 0) {
          await upsertStudentsToSupabase(INITIAL_STUDENTS);
          setStudents(INITIAL_STUDENTS);
          setDbSyncStatus('SYNCED');
        } else {
          const enriched = realRemoteStudents.map(rs => {
            const fallback = INITIAL_STUDENTS.find(i => i.id === rs.id);
            // If student-josh still has old demo stats (2840 fullListSize / 165 minutes), reset to clean INITIAL_STUDENTS[0]
            if (rs.id === 'student-josh' && rs.fullListSize === 2840 && fallback) {
              return fallback;
            }
            return {
              ...rs,
              email: rs.email || fallback?.email || '',
              accessCode:
                rs.accessCode ||
                fallback?.accessCode ||
                `${rs.name.split(' ')[0].toUpperCase()}-01`
            };
          });
          await upsertStudentsToSupabase(enriched);
          setStudents(enriched);
          setDbSyncStatus('SYNCED');
        }
      }

      if (remoteLessons && remoteLessons.length > 0) {
        setLessons(remoteLessons);
      } else if (remoteLessons !== null) {
        await upsertLessonsToSupabase(WORKBOOK_WEEKS);
      }

      setInitialDbLoadDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    } catch {
      // ignore
    }
    if (initialDbLoadDone && isSupabaseConfigured) {
      upsertStudentsToSupabase(students).then(ok => {
        if (ok) setDbSyncStatus('SYNCED');
      });
    }
  }, [students, initialDbLoadDone]);

  useEffect(() => {
    try {
      localStorage.setItem(LESSONS_STORAGE_KEY, JSON.stringify(lessons));
    } catch {
      // ignore
    }
    if (initialDbLoadDone && isSupabaseConfigured) {
      upsertLessonsToSupabase(lessons);
    }
  }, [lessons, initialDbLoadDone]);

  const currentStudent = students.find(s => s.id === activeStudentId) || students[0];

  const triggerWebPushAndBanner = async (
    title: string,
    body: string,
    type: PushBanner['type'] = 'DAILY_LESSON'
  ) => {
    const newBanner: PushBanner = {
      id: `push-${Date.now()}`,
      title,
      body,
      type
    };
    setPushBanners(prev => [newBanner, ...prev.slice(0, 2)]);

    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      }
      if (Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification(title, {
              body,
              icon: '/icon.svg',
              badge: '/icon.svg'
            });
          } else {
            new Notification(title, { body, icon: '/icon.svg' });
          }
        } catch {
          new Notification(title, { body });
        }
      }
    }
  };

  const enablePushNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      triggerWebPushAndBanner(
        'PWA Push Notifications Enabled',
        'You will now receive daily <10-minute video prompts & coach check-ins.',
        'DAILY_LESSON'
      );
    }
  };

  const updateStudent = (studentId: string, updater: (st: StudentProfile) => StudentProfile) => {
    setStudents(prev => prev.map(s => (s.id === studentId ? updater(s) : s)));
  };

  const handleUpdateLesson = (lessonNumber: number, updated: WorkbookWeek) => {
    setLessons(prev => prev.map(l => (l.weekNumber === lessonNumber ? updated : l)));
    triggerWebPushAndBanner(
      `Lesson ${lessonNumber} Updated`,
      `Your edits to Lesson ${lessonNumber} ("${updated.title}") have been saved to the app curriculum.`,
      'DAILY_LESSON'
    );
  };

  const handleResetLessonsToDefault = () => {
    setLessons(WORKBOOK_WEEKS);
    localStorage.removeItem(LESSONS_STORAGE_KEY);
    triggerWebPushAndBanner(
      'Curriculum Reset',
      'All 26 lessons have been restored to the default Market Concussion Workbook curriculum.',
      'DAILY_LESSON'
    );
  };

  const handleUpdateVideo = (videoId: string, updates: Partial<SupportingVideoItem>) => {
    updateStudent(currentStudent.id, st => ({
      ...st,
      supportingVideos: st.supportingVideos.map(v => (v.id === videoId ? { ...v, ...updates } : v))
    }));
  };

  const handleMarkVideoDone = (videoId: string, videoUrl: string) => {
    updateStudent(currentStudent.id, st => {
      const targetVideo = st.supportingVideos.find(v => v.id === videoId);
      const wasAlreadyDone = targetVideo?.status === 'Completed';
      return {
        ...st,
        streakDays: wasAlreadyDone ? st.streakDays : st.streakDays + 1,
        todayVideoStatus: 'COMPLETED',
        minutesAvailableCurrent: wasAlreadyDone ? st.minutesAvailableCurrent : st.minutesAvailableCurrent + 3,
        supportingVideos: st.supportingVideos.map(v =>
          v.id === videoId
            ? {
                ...v,
                status: 'Completed',
                videoUrl,
                completedAt: 'Today · Verified Link'
              }
            : v
        )
      };
    });

    triggerWebPushAndBanner(
      'Daily Video Link Verified!',
      `Your social link (${videoUrl}) has been logged and your streak is now ${currentStudent.streakDays + 1} days.`,
      'DAILY_LESSON'
    );
  };

  const handleUpdatePillarStatus = (pillarId: string, status: string) => {
    updateStudent(currentStudent.id, st => ({
      ...st,
      playbook: st.playbook.map(p => (p.id === pillarId ? { ...p, status } : p))
    }));
  };

  const handleUpdateCoreVideoStatus = (
    coreId: string,
    status: 'Not Started' | 'In Progress' | 'Completed',
    url?: string
  ) => {
    updateStudent(currentStudent.id, st => ({
      ...st,
      coreVideos: st.coreVideos.map(c =>
        c.id === coreId ? { ...c, status, videoUrl: url !== undefined ? url : c.videoUrl } : c
      )
    }));
  };

  const handleToggleTask = (lessonNumber: number, taskIdx: number) => {
    const key = `${lessonNumber}-${taskIdx}`;
    updateStudent(currentStudent.id, st => ({
      ...st,
      tasksCompleted: {
        ...st.tasksCompleted,
        [key]: !st.tasksCompleted[key]
      }
    }));
  };

  const handleUpdateField = (fieldId: string, value: string) => {
    updateStudent(currentStudent.id, st => ({
      ...st,
      worksheetAnswers: {
        ...st.worksheetAnswers,
        [fieldId]: value
      }
    }));
  };

  const handleUpdateRubric = (key: string, score: 'WEAK' | 'ACCEPTABLE' | 'STRONG') => {
    updateStudent(currentStudent.id, st => ({
      ...st,
      rubricScores: {
        ...st.rubricScores,
        [key]: score
      }
    }));
  };

  const handleSubmitPhaseGate = (phaseNumber: number, nextLesson: number) => {
    updateStudent(currentStudent.id, st => ({
      ...st,
      currentWeek: nextLesson,
      currentPhase: Math.min(5, phaseNumber + 1),
      gateStatus: {
        ...st.gateStatus,
        [phaseNumber]: 'SUBMITTED',
        [phaseNumber + 1]: 'OPEN'
      }
    }));
    triggerWebPushAndBanner(
      `Phase 0${phaseNumber} Gate Submitted`,
      `Your Phase 0${phaseNumber} deliverables and rubric have been sent to Coach Josh for sign-off.`,
      'DAILY_LESSON'
    );
  };

  const handleAddShiftMagnet = (magnet: ShiftMagnet) => {
    updateStudent(currentStudent.id, st => ({
      ...st,
      shiftMagnets: [magnet, ...st.shiftMagnets]
    }));
  };

  const handleUpdateShiftMagnet = (id: string, updates: Partial<ShiftMagnet>) => {
    updateStudent(currentStudent.id, st => ({
      ...st,
      shiftMagnets: st.shiftMagnets.map(m => (m.id === id ? { ...m, ...updates } : m))
    }));
  };

  const handleSendMessage = (studentId: string, text: string, triggerPush = false) => {
    const senderRole = roleMode;
    const senderName = roleMode === 'COACH' ? 'Coach Josh Beechraft' : currentStudent.name;
    const newMsg = {
      id: `msg-${Date.now()}`,
      senderRole,
      senderName,
      text,
      timestamp: 'Just now'
    };

    updateStudent(studentId, st => ({
      ...st,
      messages: [...st.messages, newMsg]
    }));

    if (triggerPush) {
      const recipient = students.find(s => s.id === studentId);
      triggerWebPushAndBanner(
        `New Message from ${senderName}`,
        `To ${recipient?.name || 'Student'}: "${text}"`,
        'COACH_NUDGE'
      );
    }
  };

  const handleTriggerMissedAlertPush = (missedStudent: StudentProfile) => {
    triggerWebPushAndBanner(
      `Coach Alert: ${missedStudent.name} Missed Daily Video`,
      `${missedStudent.name} (${missedStudent.company}) has not posted their daily video link today. Tap to send a follow-up message.`,
      'MISSED_ALERT'
    );
  };

  const handleApproveGate = (studentId: string, phaseNum: number) => {
    updateStudent(studentId, st => ({
      ...st,
      gateStatus: {
        ...st.gateStatus,
        [phaseNum]: 'APPROVED',
        [phaseNum + 1]: 'OPEN'
      }
    }));
    const target = students.find(s => s.id === studentId);
    triggerWebPushAndBanner(
      `Phase 0${phaseNum} Gate Approved`,
      `${target?.name} is now cleared to advance to Phase 0${Math.min(5, phaseNum + 1)}.`,
      'DAILY_LESSON'
    );
  };

  const handleSpreadsheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportStatus('Parsing .xlsx workbook...');
      const parsed = await parseStudentSpreadsheet(file);
      updateStudent(currentStudent.id, st => ({
        ...st,
        playbook: parsed.playbook.length > 0 ? parsed.playbook : st.playbook,
        supportingVideos: parsed.supporting.length > 0 ? parsed.supporting : st.supportingVideos
      }));
      setImportStatus(
        `Successfully ingested ${parsed.playbook.length} Core Playbook Pillars and ${parsed.supporting.length} Daily Supporting Videos for ${currentStudent.name}!`
      );
    } catch (err) {
      setImportStatus(`Error parsing file: ${err instanceof Error ? err.message : 'Invalid format'}`);
    }
  };

  const handleAddStudent = (params: {
    name: string;
    company: string;
    niche: string;
    startingLesson: number;
    coreTransformation: string;
    coreBelief: string;
    customPlaybook?: PlaybookPillar[];
    customSupportingVideos?: SupportingVideoItem[];
  }) => {
    const created = createNewStudentProfile(params);
    setStudents(prev => [created, ...prev]);
    setActiveStudentId(created.id);
    triggerWebPushAndBanner(
      `Student Onboarded: ${created.name}`,
      `${created.company} (${created.supportingVideos.length} Daily Concussion Content videos) is now live on Lesson ${created.currentWeek}.`,
      'DAILY_LESSON'
    );
  };

  const handleUpdateStudentSpecifics = (
    studentId: string,
    updates: Partial<StudentProfile>,
    worksheetUpdates?: Record<string, string>
  ) => {
    updateStudent(studentId, st => {
      const nextName = updates.name !== undefined ? updates.name : st.name;
      const initials =
        nextName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map(p => p[0]?.toUpperCase() || '')
          .join('') || st.avatar;
      return {
        ...st,
        ...updates,
        avatar: initials,
        worksheetAnswers: worksheetUpdates
          ? { ...st.worksheetAnswers, ...worksheetUpdates }
          : st.worksheetAnswers
      };
    });
  };

  const handleAddCustomVideoToStudent = (
    studentId: string,
    video: { pillarStage: string; title: string; hook1: string; hook2: string; hook3: string }
  ) => {
    updateStudent(studentId, st => {
      const nextDayNum = st.supportingVideos.length + 1;
      const newVideo: SupportingVideoItem = {
        id: `supp-custom-${Date.now()}`,
        dayNumber: nextDayNum,
        pillarStage: video.pillarStage,
        title: video.title,
        hook1: video.hook1,
        hook2: video.hook2,
        hook3: video.hook3,
        selectedHook: 1,
        status: 'Not Started',
        attachedMagnetId: st.shiftMagnets[0]?.id
      };
      return {
        ...st,
        supportingVideos: [...st.supportingVideos, newVideo]
      };
    });
  };

  const handleDeleteStudent = (studentId: string) => {
    deleteStudentFromSupabase(studentId);
    setStudents(prev => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter(s => s.id !== studentId);
      if (activeStudentId === studentId && filtered[0]) {
        setActiveStudentId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleLoginStudent = (studentId: string) => {
    const session: AuthSession = { role: 'STUDENT', studentId };
    setAuthSession(session);
    setActiveStudentId(studentId);
    setRoleMode('STUDENT');
    setActiveTab('CADENCE');
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      window.history.pushState({}, '', `/student?student=${studentId}`);
    } catch {
      // ignore
    }
  };

  const handleLoginAdmin = () => {
    const session: AuthSession = { role: 'ADMIN' };
    setAuthSession(session);
    setRoleMode('COACH');
    setActiveTab('COACH');
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      window.history.pushState({}, '', '/admin');
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setAuthSession({ role: 'UNAUTHENTICATED' });
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
      window.history.pushState({}, '', '/login');
    } catch {
      // ignore
    }
  };

  if (authSession.role === 'UNAUTHENTICATED') {
    const initialMode = window.location.pathname.toLowerCase() === '/admin' ? 'ADMIN' : 'STUDENT';
    return (
      <LoginView
        students={students}
        initialMode={initialMode}
        onLoginStudent={handleLoginStudent}
        onLoginAdmin={handleLoginAdmin}
      />
    );
  }

  const isAdminSession = authSession.role === 'ADMIN';

  const allNavItems = [
    { id: 'CADENCE' as const, label: 'Studio', shortLabel: 'Studio', icon: Video, role: 'STUDENT' as const },
    { id: 'WORKBOOK' as const, label: 'Lessons 1–26', shortLabel: 'Lessons', icon: BookOpen, role: 'STUDENT' as const },
    { id: 'MAGNETS' as const, label: 'Shift Magnets', shortLabel: 'Magnets', icon: Magnet, role: 'STUDENT' as const },
    { id: 'COACH' as const, label: 'Admin', shortLabel: 'Admin', icon: UserCheck, role: 'COACH' as const }
  ];

  const navItems = isAdminSession
    ? allNavItems
    : allNavItems.filter(item => item.role === 'STUDENT');

  return (
    <div className="min-h-dvh flex bg-black text-white">
      {/* Live Push Notification Toast Stack */}
      {pushBanners.length > 0 && (
        <div className="fixed bottom-20 md:bottom-5 right-3.5 md:right-5 z-50 w-[92vw] max-w-sm space-y-2.5">
          {pushBanners.map(b => (
            <div
              key={b.id}
              className={`rounded-2xl border p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl flex items-start justify-between gap-3 ${
                b.type === 'MISSED_ALERT'
                  ? 'border-rose-500/40 bg-[#14070B]/95 text-white'
                  : b.type === 'COACH_NUDGE'
                  ? 'border-[#09ADEF]/40 bg-[#050C14]/95 text-white'
                  : 'border-emerald-500/40 bg-[#06130E]/95 text-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#09ADEF]/15 text-[#09ADEF] flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{b.title}</div>
                  <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">{b.body}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPushBanners(prev => prev.filter(x => x.id !== b.id))}
                className="text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Minimal Left Navigation Rail (Desktop) */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col justify-between border-r border-white/[0.07] bg-[#040507] p-5 sticky top-0 h-dvh">
        <div className="space-y-7">
          {/* Signature JOSH BEECHRAFT Brand Header */}
          <div className="px-1 pt-1 space-y-1">
            <div className="font-display text-2xl tracking-wide leading-none select-none">
              <span className="text-[#09ADEF]">JOSH</span>{' '}
              <span className="text-white">BEECHRAFT</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-[1.5px] bg-[#09ADEF]" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                2MMSHIFT ARCHITECT
              </span>
            </div>
          </div>

          {/* Primary Navigation Menu */}
          <nav className="space-y-1.5">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setRoleMode(item.role);
                    setActiveTab(item.id);
                    try {
                      if (item.id === 'COACH') {
                        window.history.pushState({}, '', '/admin');
                      } else {
                        window.history.pushState({}, '', `/student?student=${currentStudent.id}`);
                      }
                    } catch {
                      // ignore
                    }
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg transition-all flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.08em] cursor-pointer ${
                    isActive
                      ? 'bg-[#09ADEF] text-white shadow-[0_6px_24px_rgba(9,173,239,0.35)]'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Active Profile Switcher (Admin Only) + Logout */}
        <div className="pt-4 border-t border-white/[0.07] space-y-2">
          {isAdminSession && (
            <select
              value={activeStudentId}
              onChange={e => setActiveStudentId(e.target.value)}
              aria-label="Select active student profile"
              className="w-full rounded-lg bg-[#080A0E] border border-white/10 text-xs font-medium text-white px-3 py-2 focus:outline-none focus:border-[#09ADEF]"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-rose-500/15 border border-white/[0.07] hover:border-rose-500/30 text-xs font-medium text-neutral-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Right Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Preview Banner when viewing Student Tabs */}
        {isAdminSession && activeTab !== 'COACH' && (
          <div className="bg-[#09ADEF]/12 border-b border-[#09ADEF]/25 px-3.5 sm:px-8 py-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="text-neutral-200 truncate">
              Viewing <strong className="text-white">{currentStudent.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setRoleMode('COACH');
                setActiveTab('COACH');
                try {
                  window.history.pushState({}, '', '/admin');
                } catch {
                  // ignore
                }
              }}
              className="px-2.5 py-1 rounded-full bg-[#09ADEF] text-white font-bold uppercase tracking-wider text-[10px] hover:bg-[#09B3F8] transition-colors cursor-pointer shrink-0"
            >
              ← Back to Admin
            </button>
          </div>
        )}

        {/* Clean Single-Row Top Header */}
        <header className="border-b border-white/[0.07] bg-black/90 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-3.5 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="md:hidden font-display text-lg tracking-wide shrink-0 mr-1">
                <span className="text-[#09ADEF]">JOSH</span>{' '}
                <span className="text-white">BEECHRAFT</span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-[#09ADEF]/15 border border-[#09ADEF]/30 text-[#09ADEF] font-bold text-xs flex items-center justify-center shrink-0">
                {currentStudent.avatar}
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-white truncate">
                  {currentStudent.name}
                </span>
                <span className="badge-2mm px-2.5 py-0.5 rounded-full text-[10px] shrink-0">
                  Lesson {currentStudent.currentWeek}
                </span>
              </div>
            </div>

            {/* Right Minimal Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isAdminSession && (
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/student?student=${currentStudent.id}`;
                    navigator.clipboard?.writeText(url);
                    triggerWebPushAndBanner(
                      'Link Copied',
                      `Copied direct link for ${currentStudent.name}.`,
                      'DAILY_LESSON'
                    );
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0A0C10] hover:bg-white/[0.08] border border-white/10 text-[11px] font-medium text-neutral-300 transition-colors cursor-pointer"
                >
                  <span>Copy Student Link</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowStudentInboxModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0A0C10] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#09ADEF]" />
                <span className="hidden sm:inline">Messages</span>
                {currentStudent.messages.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#09ADEF]/20 text-[#09ADEF] text-[10px] font-bold">
                    {currentStudent.messages.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="md:hidden flex items-center justify-center p-1.5 rounded-lg bg-[#0A0C10] border border-white/10 text-neutral-300 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Workspace Canvas (Generous Bottom Padding for Mobile Fixed Nav) */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-8 py-4 sm:py-7 pb-24 md:pb-8">
          {activeTab === 'CADENCE' && (
            <DailyCadenceView
              student={currentStudent}
              onUpdateVideo={handleUpdateVideo}
              onMarkVideoDone={handleMarkVideoDone}
              onUpdatePillarStatus={handleUpdatePillarStatus}
              onUpdateCoreVideoStatus={handleUpdateCoreVideoStatus}
              onOpenImportModal={() => {
                setImportStatus(null);
                setShowImportModal(true);
              }}
            />
          )}

          {activeTab === 'WORKBOOK' && (
            <WorkbookView
              student={currentStudent}
              lessons={lessons}
              isCoachMode={isAdminSession}
              onUpdateLesson={handleUpdateLesson}
              onResetLessonsToDefault={handleResetLessonsToDefault}
              onToggleTask={handleToggleTask}
              onUpdateField={handleUpdateField}
              onUpdateRubric={handleUpdateRubric}
              onSubmitPhaseGate={handleSubmitPhaseGate}
            />
          )}

          {activeTab === 'MAGNETS' && (
            <ShiftMagnetsView
              student={currentStudent}
              onAddShiftMagnet={handleAddShiftMagnet}
              onUpdateShiftMagnet={handleUpdateShiftMagnet}
            />
          )}

          {activeTab === 'COACH' && isAdminSession && (
            <CoachDashboardView
              students={students}
              selectedStudentId={activeStudentId}
              onSelectStudent={setActiveStudentId}
              onAddStudent={handleAddStudent}
              onUpdateStudentSpecifics={handleUpdateStudentSpecifics}
              onAddCustomVideoToStudent={handleAddCustomVideoToStudent}
              onDeleteStudent={handleDeleteStudent}
              onSendMessage={handleSendMessage}
              onTriggerMissedAlertPush={handleTriggerMissedAlertPush}
              onApproveGate={handleApproveGate}
              onOpenImportModal={() => {
                setImportStatus(null);
                setShowImportModal(true);
              }}
              onPreviewStudentDashboard={(studentId: string) => {
                setActiveStudentId(studentId);
                setRoleMode('STUDENT');
                setActiveTab('CADENCE');
                try {
                  window.history.pushState({}, '', `/student?student=${studentId}`);
                } catch {
                  // ignore
                }
              }}
            />
          )}
        </main>

        {/* Native-Style Fixed Bottom Navigation Bar for Mobile (< md) */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#040507]/95 backdrop-blur-xl border-t border-white/[0.08] px-2 pt-1.5 pb-safe">
          <div className="grid grid-flow-col auto-cols-fr gap-1 max-w-md mx-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setRoleMode(item.role);
                    setActiveTab(item.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'text-[#09ADEF] bg-[#09ADEF]/12 font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#09ADEF]' : 'text-neutral-400'}`} />
                  <span className="text-[10px] mt-1 tracking-tight">{item.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Modal 1: Ingest Student Content Plan (.xlsx) */}
      <ModalDialog
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title={`Import Content Plan for ${currentStudent.name}`}
        subtitle="Spreadsheet Ingestion (.xlsx)"
      >
        <div className="space-y-4 text-xs">
          <p className="text-neutral-300 leading-relaxed">
            Upload a student’s strategy spreadsheet (such as{' '}
            <code className="text-[#09ADEF]">josh_content_tracking-v2.xlsx</code>) to automatically populate:
          </p>
          <ul className="space-y-1.5 text-neutral-300 list-disc pl-5">
            <li>
              <strong>Content Playbook:</strong> 15 Core Pillars, Old/New Beliefs, Must-Hit Beats, and 4 Teaching Angles.
            </li>
            <li>
              <strong>Concussion Content:</strong> 50 Daily Micro-Topics with Hooks 1, 2, and 3.
            </li>
          </ul>

          <label className="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#09ADEF]/40 hover:border-[#09ADEF] bg-[#05070A] p-8 cursor-pointer transition-colors">
            <Upload className="w-8 h-8 text-[#09ADEF] mb-2" />
            <span className="text-sm font-semibold text-white">
              Select Student .xlsx Spreadsheet
            </span>
            <span className="text-neutral-400 mt-1">Supports .xlsx and .xls files</span>
            <input type="file" accept=".xlsx,.xls" onChange={handleSpreadsheetUpload} className="hidden" />
          </label>

          {importStatus && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              {importStatus}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowImportModal(false)}
              className="rounded-lg btn-2mm px-5 py-2.5 text-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </ModalDialog>

      {/* Modal 2: Student In-App Coach Chat Inbox */}
      <ModalDialog
        isOpen={showStudentInboxModal}
        onClose={() => setShowStudentInboxModal(false)}
        title={`Coach & Student Messages (${currentStudent.name})`}
        subtitle="Direct In-App Accountability"
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#05070A] border border-white/[0.07] p-4 space-y-3 max-h-80 overflow-y-auto">
            {currentStudent.messages.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500">
                No messages yet.
              </div>
            ) : (
              currentStudent.messages.map(m => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl border text-xs ${
                    m.isAlert
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                      : m.senderRole === 'COACH'
                      ? 'border-[#09ADEF]/30 bg-[#09ADEF]/10 text-white mr-6'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-white ml-6'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                    <span className="text-[#09ADEF] font-semibold">{m.senderName}</span>
                    <span>{m.timestamp}</span>
                  </div>
                  <p className="leading-relaxed text-sm">{m.text}</p>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              if (!studentReplyInput.trim()) return;
              handleSendMessage(currentStudent.id, studentReplyInput.trim(), true);
              setStudentReplyInput('');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={studentReplyInput}
              onChange={e => setStudentReplyInput(e.target.value)}
              placeholder={
                roleMode === 'COACH'
                  ? `Message ${currentStudent.name}...`
                  : 'Reply to Coach Josh...'
              }
              className="flex-1 rounded-lg bg-[#05070A] border border-white/15 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#09ADEF]"
            />
            <button
              type="submit"
              className="rounded-lg btn-2mm text-xs px-5 py-3 flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </ModalDialog>
    </div>
  );
}
export default App;
